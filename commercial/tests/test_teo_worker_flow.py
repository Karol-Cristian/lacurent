from __future__ import annotations

import asyncio
import sqlite3
from types import SimpleNamespace
from typing import Any

import commercial.app.main as main


class _D1Result:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.results = rows


class _D1Statement:
    def __init__(self, connection: sqlite3.Connection, sql: str) -> None:
        self.connection = connection
        self.sql = sql
        self.params: tuple[Any, ...] = ()

    def bind(self, *params: Any) -> "_D1Statement":
        self.params = params
        return self

    async def run(self) -> _D1Result:
        cursor = self.connection.execute(self.sql, self.params)
        self.connection.commit()
        if cursor.description is None:
            return _D1Result([])
        columns = [item[0] for item in cursor.description]
        return _D1Result(
            [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]
        )


class _SQLiteD1:
    def __init__(self) -> None:
        self.connection = sqlite3.connect(":memory:")

    def prepare(self, sql: str) -> _D1Statement:
        return _D1Statement(self.connection, sql)


def _request(db: _SQLiteD1) -> SimpleNamespace:
    return SimpleNamespace(scope={"env": SimpleNamespace(DB=db)})


def test_teo_worker_flow_serializes_three_exact_verifications() -> None:
    async def scenario() -> None:
        db = _SQLiteD1()
        request = _request(db)
        main._teo_flow_schema_ready = False

        started = await main._teo_flow_start(request, "stress-flow", 3)
        assert started["status"] == "ready"
        assert started["ready"] is True
        assert started["plannedVerifications"] == 3
        assert started["storage"] == "d1"

        first = await main._teo_flow_acquire_verification(request, "stress-flow")
        assert first["acquired"] is True
        assert first["leaseToken"]

        overlap = await main._teo_flow_acquire_verification(request, "stress-flow")
        assert overlap["acquired"] is False
        assert overlap["state"]["status"] == "running"

        after_first = await main._teo_flow_complete_verification(
            request,
            "stress-flow",
            first["leaseToken"],
        )
        assert after_first["verifiedCount"] == 1
        assert after_first["status"] == "cooldown"
        assert after_first["ready"] is False

        blocked = await main._teo_flow_acquire_verification(request, "stress-flow")
        assert blocked["acquired"] is False
        assert blocked["state"]["status"] == "cooldown"

        for expected_count in (2, 3):
            db.connection.execute(
                "UPDATE teo_verification_runs "
                "SET next_allowed_at_ms = 0 "
                "WHERE run_id = ?",
                ("stress-flow",),
            )
            db.connection.commit()
            acquired = await main._teo_flow_acquire_verification(
                request,
                "stress-flow",
            )
            assert acquired["acquired"] is True
            state = await main._teo_flow_complete_verification(
                request,
                "stress-flow",
                acquired["leaseToken"],
            )
            assert state["verifiedCount"] == expected_count

        final_state = await main._teo_flow_status(request, "stress-flow")
        assert final_state["status"] == "complete"
        assert final_state["ready"] is False
        assert final_state["verifiedCount"] == 3

        rejected = await main._teo_flow_acquire_verification(request, "stress-flow")
        assert rejected["acquired"] is False
        assert rejected["state"]["status"] == "complete"

    asyncio.run(scenario())


def test_teo_worker_flow_recovers_an_expired_lease() -> None:
    async def scenario() -> None:
        db = _SQLiteD1()
        request = _request(db)
        main._teo_flow_schema_ready = False

        await main._teo_flow_start(request, "expired-flow", 2)
        first = await main._teo_flow_acquire_verification(request, "expired-flow")
        assert first["acquired"] is True

        db.connection.execute(
            "UPDATE teo_verification_runs "
            "SET lease_expires_at_ms = 0 "
            "WHERE run_id = ?",
            ("expired-flow",),
        )
        db.connection.commit()

        recovered = await main._teo_flow_acquire_verification(
            request,
            "expired-flow",
        )
        assert recovered["acquired"] is True
        assert recovered["leaseToken"] != first["leaseToken"]

        state = await main._teo_flow_complete_verification(
            request,
            "expired-flow",
            recovered["leaseToken"],
        )
        assert state["verifiedCount"] == 1
        assert state["status"] == "cooldown"

    asyncio.run(scenario())
