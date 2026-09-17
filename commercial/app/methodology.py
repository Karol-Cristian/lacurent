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


def locality_data() -> dict[str, Any]:
    # The locality registry is ~6.5 MB. Do not keep it in the Python Worker
    # isolate after the map payload has been returned: Cloudflare isolates have
    # a 128 MB memory limit and the parsed object is substantially larger than
    # the JSON file on disk.
    return json.loads((DATA_DIR / "localities.json").read_text(encoding="utf-8"))


def climate_zones_geojson() -> dict[str, Any]:
    return json.loads((DATA_DIR / "winter-climate-zones.geojson").read_text(encoding="utf-8"))


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
    # Legacy/server-side fallback only. Normal calculator submissions carry a
    # compact climate token produced from the already-loaded browser map, so
    # this expensive index is not built in the normal Worker request path.
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


@lru_cache(maxsize=1)
def _station_alias_index() -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    for item in climate_data()["localities"]:
        for value in (
            item.get("id"),
            item.get("locality_id"),
            item.get("source_locality_id"),
            item.get("name"),
            *(item.get("aliases") or []),
        ):
            if value:
                index[str(value)] = item
                index[normalize_key(str(value))] = item
    return index


def _station_from_value(value: str) -> dict[str, Any] | None:
    raw = " ".join(str(value or "").strip().split())
    if not raw:
        return None
    index = _station_alias_index()
    return index.get(raw) or index.get(normalize_key(raw))


def _climate_from_station(
    station: dict[str, Any],
    *,
    locality_name: str | None = None,
    climate_zone: str | None = None,
    winter_design_temperature_c: float | None = None,
    resolution: str = "exact",
) -> dict[str, Any]:
    selected_name = locality_name or station["name"]
    return {
        **station,
        "station": station["name"],
        "station_id": station["id"],
        "selected_locality": {
            "id": station.get("source_locality_id") or station.get("locality_id") or station["id"],
            "siruta": station.get("source_locality_id"),
            "name": selected_name,
            "county": station.get("county"),
            "uat_name": None,
            "locality_type": None,
            "lon": station.get("lon"),
            "lat": station.get("lat"),
            "display_name": selected_name,
        },
        "climate_zone": climate_zone,
        "winter_design_temperature_c": (
            winter_design_temperature_c
            if winter_design_temperature_c is not None
            else station.get("winter_design_mean_daily_temperature_c")
        ),
        "station_resolution": resolution,
        "station_distance_km": None,
    }


def _resolve_browser_climate_token(value: str) -> dict[str, Any] | None:
    # Format: @lc|<station-short-id>|<zone>|<design-temp>|<locality-name>
    # It contains only data already selected from the official map payload in
    # the browser. The station itself is revalidated against climate.json.
    if not str(value or "").startswith("@lc|"):
        return None
    parts = str(value).split("|", 4)
    if len(parts) != 5:
        return None
    _, station_key, zone, temperature_text, locality_name = parts
    station_id = station_key if station_key.startswith("mc001_6_2013_") else f"mc001_6_2013_{station_key}"
    station = _station_index().get(station_id)
    if not station:
        raise ValueError("Stația climatică selectată nu este disponibilă în setul MC001 LaCurent.")
    try:
        winter_temperature = float(temperature_text) if temperature_text else None
    except ValueError:
        winter_temperature = None
    return _climate_from_station(
        station,
        locality_name=locality_name or station["name"],
        climate_zone=zone or None,
        winter_design_temperature_c=winter_temperature,
        resolution="browser-selected",
    )


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
        f"Localitatea selectată „{locality}” nu este disponibilă în setul geografic LaCurent."
    )


def resolve_climate(locality: str) -> dict[str, Any]:
    browser_climate = _resolve_browser_climate_token(locality)
    if browser_climate:
        return browser_climate

    # The 42 MC001 source stations and their source SIRUTA identifiers can be
    # resolved from the small climate file without touching the 6.5 MB locality
    # registry. This also keeps /demo and the standard Cluj smoke test light.
    direct_station = _station_from_value(locality)
    if direct_station:
        return _climate_from_station(direct_station)

    selected = resolve_locality(locality)
    station = _station_index().get(selected.get("stationId"))
    if not station:
        raise ValueError(
            f"Localitatea „{selected['name']}” nu are o stație climatică MC001 asociată."
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
    uat_text = f", UAT {uat}" if uat and uat != locality.get("name") else ""
    return (
        f"{locality.get('name')}, {locality_type_label(locality.get('localityType'))} - "
        f"{locality.get('county')}{uat_text}"
    )


def locality_type_label(locality_type: str | None) -> str:
    labels = {
        "municipiu": "municipiu",
        "oras": "oraș",
        "oraș": "oraș",
        "comuna": "comună",
        "comună": "comună",
        "sat": "sat",
        "localitate componenta municipiu": "localitate componentă a municipiului",
        "localitate componenta oras": "localitate componentă a orașului",
        "sat apartinator municipiu": "sat aparținător municipiului",
        "sat apartinator oras": "sat aparținător orașului",
        "sector": "sector",
    }
    return labels.get(str(locality_type or "").lower(), str(locality_type or "localitate"))


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
        raise ValueError(f"Sursa de energie „{carrier}” nu are factori metodologici definiți.")
    return factors


def default_heating_performance(system_type: str) -> dict[str, Any]:
    defaults = methodology()["heating_system_defaults"].get(system_type)
    if not defaults:
        raise ValueError(f"Sistemul de încălzire „{system_type}” nu este suportat.")
    return defaults