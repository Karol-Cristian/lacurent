from __future__ import annotations
import asyncio
import hashlib
import sqlite3
from pathlib import Path
from typing import Any
from commercial.app import account

ROOT = Path(__file__).resolve().parents[2]

class _Result:
    def __init__(self, rows: list[dict[str, Any]]) -> None:
        self.results = rows

class _Statement:
    def __init__(self, connection: sqlite3.Connection, sql: str) -> None:
        self.connection = connection
        self.sql = sql
        self.params: tuple[Any, ...] = ()
    def bind(self, *params: Any) -> "_Statement":
        other = _Statement(self.connection, self.sql)
        other.params = params
        return other
    async def run(self) -> _Result:
        cursor = self.connection.execute(self.sql, self.params)
        if cursor.description is None:
            self.connection.commit()
            return _Result([])
        columns = [item[0] for item in cursor.description]
        return _Result([dict(zip(columns, row)) for row in cursor.fetchall()])

class _Db:
    def __init__(self) -> None:
        self.connection = sqlite3.connect(":memory:")
        self.connection.executescript(
            (ROOT / "migrations" / "019_home_lab_account_persistence.sql").read_text(encoding="utf-8")
        )
    def prepare(self, sql: str) -> _Statement:
        return _Statement(self.connection, sql)

def test_register_login_session_and_project_roundtrip() -> None:
    db = _Db()
    async def exercise() -> None:
        registered = await account.register(
            db, {"email":"Test@Example.com","name":"Casa Test","password":"very-safe-123"}
        )
        assert registered["user"]["email"] == "test@example.com"
        stored_hash = db.connection.execute(
            "SELECT password_hash FROM users WHERE email='test@example.com'"
        ).fetchone()[0]
        assert stored_hash.startswith(account.PASSWORD_PREFIX + "$")
        assert "very-safe-123" not in stored_hash
        current = await account.current_user(db, registered["token"])
        assert current and current["email"] == "test@example.com"
        saved = await account.save_project(
            db, current["id"], {
                "projectId":"editorial-test-house",
                "name":"Casa Satu Mare",
                "workspace":{"draft":{"version":"v2","fields":{"id:heatedArea":{"value":"137,5"}}},"page":"house"},
            }
        )
        assert saved["projectId"] == "editorial-test-house"
        listed = await account.list_projects(db, current["id"])
        assert [row["project_id"] for row in listed["projects"]] == ["editorial-test-house"]
        loaded = await account.load_project(db, current["id"], "editorial-test-house")
        assert loaded["project"]["workspace"]["draft"]["fields"]["id:heatedArea"]["value"] == "137,5"
        await account.logout(db, registered["token"])
        assert await account.current_user(db, registered["token"]) is None
        logged = await account.login(db, {"email":"test@example.com","password":"very-safe-123"})
        assert logged["user"]["id"] == current["id"]
    asyncio.run(exercise())

def test_legacy_sha256_password_is_upgraded_after_login() -> None:
    db = _Db()
    password = "legacy-password"
    legacy = "sha256:" + hashlib.sha256(password.encode("utf-8")).hexdigest()
    db.connection.execute(
        "INSERT INTO users(email,name,password_hash,role,account_type) VALUES (?,?,?,?,?)",
        ("legacy@example.com","Legacy User",legacy,"residential","registered"),
    )
    db.connection.commit()
    async def exercise() -> None:
        result = await account.login(db, {"email":"legacy@example.com","password":password})
        assert result["success"] is True
    asyncio.run(exercise())
    upgraded = db.connection.execute(
        "SELECT password_hash FROM users WHERE email='legacy@example.com'"
    ).fetchone()[0]
    assert upgraded.startswith(account.PASSWORD_PREFIX + "$")
    assert upgraded != legacy

def test_project_ownership_is_enforced() -> None:
    db = _Db()
    async def exercise() -> None:
        first = await account.register(
            db, {"email":"one@example.com","name":"User One","password":"one-password-123"}
        )
        second = await account.register(
            db, {"email":"two@example.com","name":"User Two","password":"two-password-123"}
        )
        await account.save_project(
            db, first["user"]["id"],
            {"projectId":"private-house","name":"Private","workspace":{"draft":{"fields":{}}}},
        )
        try:
            await account.save_project(
                db, second["user"]["id"],
                {"projectId":"private-house","name":"Other","workspace":{"draft":{"fields":{}}}},
            )
        except account.AccountError as exc:
            assert exc.status_code == 403
        else:
            raise AssertionError("Cross-user overwrite must be blocked.")
        try:
            await account.load_project(db, second["user"]["id"], "private-house")
        except account.AccountError as exc:
            assert exc.status_code == 404
        else:
            raise AssertionError("Cross-user project read must be hidden.")
    asyncio.run(exercise())

def test_account_validation_rejects_bad_registration_and_oversized_workspace() -> None:
    db = _Db()
    async def exercise() -> None:
        try:
            await account.register(db, {"email":"bad","name":"A","password":"short"})
        except account.AccountError as exc:
            assert exc.status_code == 400
        else:
            raise AssertionError("Invalid registration should fail.")
        registered = await account.register(
            db, {"email":"size@example.com","name":"Size User","password":"size-password-123"}
        )
        try:
            await account.save_project(
                db, registered["user"]["id"],
                {"projectId":"too-large","workspace":{"blob":"x" * (account.MAX_WORKSPACE_BYTES + 1)}},
            )
        except account.AccountError as exc:
            assert exc.status_code == 413
        else:
            raise AssertionError("Oversized workspace should fail.")
    asyncio.run(exercise())
