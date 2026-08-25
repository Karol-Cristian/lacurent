"""Input validation and missing/zero semantics."""

from __future__ import annotations

import math
from typing import Any

from .diagnostics import diagnostic, INVALID_ENGINE_INPUT, MISSING_ENGINE_INPUT


def is_mapping(value: Any) -> bool:
    return isinstance(value, dict)


def reject_non_finite(value: Any, path: str = "$") -> list[dict]:
    findings: list[dict] = []
    if isinstance(value, bool) or value is None or isinstance(value, str):
        return findings
    if isinstance(value, (int, float)):
        if not math.isfinite(float(value)):
            findings.append(diagnostic(INVALID_ENGINE_INPUT, "Numeric values must be finite.", path=path))
        return findings
    if isinstance(value, list):
        for index, item in enumerate(value):
            findings.extend(reject_non_finite(item, f"{path}[{index}]"))
        return findings
    if isinstance(value, dict):
        for key, item in value.items():
            findings.extend(reject_non_finite(item, f"{path}.{key}"))
        return findings
    findings.append(diagnostic(INVALID_ENGINE_INPUT, "Unsupported JSON value type.", path=path))
    return findings


def require_sections(value: dict[str, Any], sections: list[str]) -> list[dict]:
    findings = []
    for section in sections:
        if section not in value:
            findings.append(
                diagnostic(
                    MISSING_ENGINE_INPUT,
                    f"Engine input requires section '{section}'.",
                    path=section,
                )
            )
    return findings
