"""Climate provider boundary.

P11 deliberately consumes climate data resolved by the existing Building DNA
and Climate Provider layer.  The Python engine does not duplicate Romanian
source datasets in this milestone.
"""

from __future__ import annotations

from typing import Any


def monthly_climate_from_contract(engine_input: dict[str, Any]) -> list[dict[str, Any]]:
    climate = engine_input.get("climate", {})
    return list(climate.get("monthly", []))
