"""Lightweight typed records for the Python engine contract."""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any


@dataclass(frozen=True)
class EngineQuantity:
    value: float
    unit: str
    provenance: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class EngineDiagnostic:
    code: str
    severity: str
    message: str
    path: str | None = None

    def to_dict(self) -> dict[str, Any]:
        result = asdict(self)
        if result["path"] is None:
            result.pop("path")
        return result


@dataclass(frozen=True)
class EngineTrace:
    chapter: str
    formula_id: str
    branch_id: str
    status: str
    final_result: Any

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
