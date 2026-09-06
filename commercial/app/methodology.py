from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@lru_cache(maxsize=1)
def methodology() -> dict[str, Any]:
    return json.loads((DATA_DIR / "methodology.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def climate_data() -> dict[str, Any]:
    return json.loads((DATA_DIR / "climate.json").read_text(encoding="utf-8"))


def normalize_key(value: str) -> str:
    replacements = str.maketrans({
        "ă": "a",
        "â": "a",
        "î": "i",
        "ș": "s",
        "ş": "s",
        "ț": "t",
        "ţ": "t",
        "Ă": "a",
        "Â": "a",
        "Î": "i",
        "Ș": "s",
        "Ş": "s",
        "Ț": "t",
        "Ţ": "t",
    })
    return " ".join(value.translate(replacements).lower().replace("-", " ").split())


def resolve_climate(locality: str) -> dict[str, Any]:
    climates = climate_data()["localities"]
    key = normalize_key(locality)
    for item in climates:
        names = [item["name"], *item.get("aliases", [])]
        if key in {normalize_key(name) for name in names}:
            return item
    available = ", ".join(item["name"] for item in climates)
    raise ValueError(f"Localitatea '{locality}' nu este in setul climatic v2. Disponibil: {available}.")


def carrier_factors(carrier: str) -> dict[str, float]:
    factors = methodology()["carriers"].get(carrier)
    if not factors:
        raise ValueError(f"Purtatorul energetic '{carrier}' nu are factori metodologici.")
    return factors


def default_heating_performance(system_type: str) -> dict[str, Any]:
    defaults = methodology()["heating_system_defaults"].get(system_type)
    if not defaults:
        raise ValueError(f"Sistemul de incalzire '{system_type}' nu este suportat.")
    return defaults
