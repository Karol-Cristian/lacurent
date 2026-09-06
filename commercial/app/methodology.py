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


@lru_cache(maxsize=1)
def locality_data() -> dict[str, Any]:
    return json.loads((DATA_DIR / "localities.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def climate_zones_geojson() -> dict[str, Any]:
    return json.loads((DATA_DIR / "winter-climate-zones.geojson").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def romania_boundary_geojson() -> dict[str, Any]:
    return json.loads((DATA_DIR / "romania-boundary.geojson").read_text(encoding="utf-8"))


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


@lru_cache(maxsize=1)
def _locality_indexes() -> dict[str, Any]:
    localities = locality_data()["localities"]
    by_id = {item["id"]: item for item in localities}
    by_name: dict[str, list[dict[str, Any]]] = {}
    for item in localities:
        by_name.setdefault(normalize_key(item["name"]), []).append(item)
    for matches in by_name.values():
        matches.sort(key=lambda item: item.get("importance") or 0, reverse=True)
    return {"by_id": by_id, "by_name": by_name}


@lru_cache(maxsize=1)
def _station_index() -> dict[str, dict[str, Any]]:
    return {item["id"]: item for item in climate_data()["localities"]}


def resolve_locality(locality: str) -> dict[str, Any]:
    indexes = _locality_indexes()
    value = " ".join(str(locality or "").strip().split())
    if value in indexes["by_id"]:
        return indexes["by_id"][value]

    key = normalize_key(value)
    matches = indexes["by_name"].get(key)
    if matches:
        return matches[0]

    candidates = [
        item
        for item in locality_data()["localities"]
        if key and key in item.get("search", "")
    ]
    if candidates:
        candidates.sort(key=lambda item: item.get("importance") or 0, reverse=True)
        return candidates[0]

    raise ValueError(
        f"The selected locality '{locality}' is not available in the LaCurent geographic dataset."
    )


def resolve_climate(locality: str) -> dict[str, Any]:
    selected = resolve_locality(locality)
    station = _station_index().get(selected.get("stationId"))
    if not station:
        raise ValueError(
            f"The selected locality '{selected['name']}' does not have a resolved MC001 climate station."
        )

    return {
        **station,
        "station": station["name"],
        "station_id": station["id"],
        "selected_locality": {
            "id": selected["id"],
            "siruta": selected.get("siruta"),
            "name": selected["name"],
            "county": selected["county"],
            "uat_name": selected.get("uatName"),
            "locality_type": selected.get("localityType"),
            "lon": selected.get("lon"),
            "lat": selected.get("lat"),
            "display_name": locality_display_name(selected),
        },
        "climate_zone": selected.get("climateZone"),
        "winter_design_temperature_c": selected.get("winterDesignTemperatureC"),
        "station_resolution": selected.get("stationResolution"),
        "station_distance_km": selected.get("stationDistanceKm"),
    }


def locality_display_name(locality: dict[str, Any]) -> str:
    uat = locality.get("uatName")
    uat_text = f", administrative unit {uat}" if uat and uat != locality.get("name") else ""
    return (
        f"{locality.get('name')}, {locality_type_label(locality.get('localityType'))} - "
        f"{locality.get('county')}{uat_text}"
    )


def locality_type_label(locality_type: str | None) -> str:
    labels = {
        "municipiu": "municipality",
        "oras": "town",
        "oraș": "town",
        "comuna": "commune",
        "comună": "commune",
        "sat": "village",
        "localitate componenta municipiu": "municipality component locality",
        "localitate componenta oras": "town component locality",
        "sat apartinator municipiu": "municipality-administered village",
        "sat apartinator oras": "town-administered village",
        "sector": "sector",
    }
    return labels.get(str(locality_type or "").lower(), str(locality_type or "locality"))


def location_payload() -> dict[str, Any]:
    data = locality_data()
    return {
        "schema": "lacurent_commercial_location_payload_v1",
        "stats": data["stats"],
        "source": data["source"],
        "station_resolution": data["station_resolution"],
        "climateZoneTemperatures": data["climateZoneTemperatures"],
        "counties": data["counties"],
        "localities": data["localities"],
        "climateZones": climate_zones_geojson(),
        "romaniaBoundary": romania_boundary_geojson(),
    }


def carrier_factors(carrier: str) -> dict[str, float]:
    factors = methodology()["carriers"].get(carrier)
    if not factors:
        raise ValueError(f"The energy carrier '{carrier}' does not have methodology factors.")
    return factors


def default_heating_performance(system_type: str) -> dict[str, Any]:
    defaults = methodology()["heating_system_defaults"].get(system_type)
    if not defaults:
        raise ValueError(f"The heating system '{system_type}' is not supported.")
    return defaults
