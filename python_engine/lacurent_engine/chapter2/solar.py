"""Honest Chapter 2 solar boundary handling."""

from __future__ import annotations

from typing import Any

from ..core.diagnostics import solar_gain_blocker


def solar_blocker_if_present(engine_input: dict[str, Any]) -> list[dict[str, Any]]:
    climate = engine_input.get("climate", {})
    if climate.get("solarGainPreprocessingStatus") == "blocked_qsky":
        months = [
            item.get("month")
            for item in climate.get("monthly", [])
            if isinstance(item, dict) and item.get("solarGainPreprocessingStatus") == "blocked_qsky"
        ]
        return [solar_gain_blocker([month for month in months if month])]
    return []
