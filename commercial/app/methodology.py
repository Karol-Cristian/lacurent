from __future__ import annotations

import json
import math
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
def solar_hsol_data() -> dict[str, Any]:
    """Compact source-backed Hsol dataset derived from Mc001/1-2-3/2006 Annex A.9.6."""

    return json.loads((DATA_DIR / "mc001-solar-hsol.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _solar_hsol_by_solar_station() -> dict[str, dict[str, Any]]:
    return {
        row["solarStationId"]: row
        for row in solar_hsol_data()["rows"]
        if row.get("solarStationId")
    }


@lru_cache(maxsize=1)
def _solar_hsol_coverage_by_climate_station() -> dict[str, dict[str, Any]]:
    return {
        row["climateStationId"]: row
        for row in solar_hsol_data().get("climateStationCoverage", [])
        if row.get("climateStationId")
    }


_HSOL_ORIENTATION_KEYS = {
    "south": "south",
    "south_west": "southWest",
    "west": "west",
    "north_west": "northWest",
    "north": "north",
    "north_east": "northEast",
    "east": "east",
    "south_east": "southEast",
    "horizontal": "horizontal",
}


def _temperature_profile(station: dict[str, Any]) -> list[float]:
    return [
        float(item["temperature_c"])
        for item in station.get("monthly_temperatures", [])
        if item.get("temperature_c") is not None
    ]


def _haversine_km(a: dict[str, Any], b: dict[str, Any]) -> float | None:
    try:
        lat1, lon1 = math.radians(float(a["lat"])), math.radians(float(a["lon"]))
        lat2, lon2 = math.radians(float(b["lat"])), math.radians(float(b["lon"]))
    except (KeyError, TypeError, ValueError):
        return None
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2 * math.asin(min(1.0, math.sqrt(h)))


@lru_cache(maxsize=64)
def _climate_profile_solar_coverage(station_id: str) -> dict[str, Any] | None:
    """Map a climate station without A.9.6 data to the closest *climate profile*.

    We intentionally do not interpolate solar values. One normative A.9.6 row is
    selected from a station that also has MC001/6-2013 monthly temperatures.
    Monthly-temperature RMSE is the primary similarity metric; winter design
    temperature and distance are secondary tie breakers.
    """

    target = _station_index().get(station_id)
    if target is None:
        return None

    direct = _solar_hsol_coverage_by_climate_station().get(station_id)
    if direct and direct.get("resolution") in {"direct", "coincident_source_station"}:
        return dict(direct)

    target_profile = _temperature_profile(target)
    if len(target_profile) != 12:
        return dict(direct) if direct else None

    candidates: list[tuple[float, float, float, dict[str, Any], dict[str, Any]]] = []
    solar_rows = solar_hsol_data().get("rows", [])
    stations = _station_index()
    for row in solar_rows:
        candidate_station_id = row.get("climateStationId")
        if not candidate_station_id:
            continue
        candidate = stations.get(str(candidate_station_id))
        if candidate is None:
            continue
        profile = _temperature_profile(candidate)
        if len(profile) != 12:
            continue

        rmse = math.sqrt(sum((a - b) ** 2 for a, b in zip(target_profile, profile)) / 12.0)
        winter_diff = abs(
            float(target.get("winter_design_mean_daily_temperature_c") or 0.0)
            - float(candidate.get("winter_design_mean_daily_temperature_c") or 0.0)
        )
        distance = _haversine_km(target, candidate)
        distance_for_score = distance if distance is not None else 1000.0
        score = rmse + 0.15 * winter_diff + 0.0005 * distance_for_score
        candidates.append((score, rmse, distance_for_score, row, candidate))

    if not candidates:
        return dict(direct) if direct else None

    candidates.sort(key=lambda item: (item[0], item[1], item[2]))
    score, rmse, distance, row, candidate = candidates[0]
    return {
        "climateStationId": station_id,
        "climateStationName": target.get("name"),
        "solarStationId": row.get("solarStationId"),
        "solarLocalityName": row.get("localityName"),
        "resolution": "climate_profile_analog",
        "distanceKm": round(distance, 1),
        "climateSimilarityRmseC": round(rmse, 3),
        "climateSimilarityScore": round(score, 3),
        "analogClimateStationId": candidate.get("id"),
        "analogClimateStationName": candidate.get("name"),
    }


def resolve_monthly_hsol(climate: dict[str, Any], orientation: str) -> dict[str, Any] | None:
    """Resolve source-backed Annex A.9.6 Hsol without numerical interpolation.

    Direct normative rows are preferred. Where the selected MC001/6-2013 climate
    station has no A.9.6 row, LaCurent Light selects one existing normative row
    from the station with the most similar 12-month temperature profile.
    """

    source_key = _HSOL_ORIENTATION_KEYS.get(str(orientation))
    if source_key is None:
        return None
    station_id = str(climate.get("station_id") or climate.get("id") or "")
    coverage = _climate_profile_solar_coverage(station_id)
    if coverage is None:
        return None
    row = _solar_hsol_by_solar_station().get(str(coverage.get("solarStationId")))
    if row is None:
        return None
    values = row.get("hsolKwhPerM2ByOrientation", {}).get(source_key)
    if not isinstance(values, list) or len(values) != 12:
        return None
    dataset = solar_hsol_data()
    return {
        "orientation": orientation,
        "source_orientation": source_key,
        "values_kwh_m2_month": [float(value) for value in values],
        "locality_name": row.get("localityName"),
        "solar_station_id": row.get("solarStationId"),
        "solar_locality_name": row.get("localityName"),
        "climate_station_id": station_id,
        "station_resolution": coverage.get("resolution"),
        "station_distance_km": coverage.get("distanceKm"),
        "climate_similarity_rmse_c": coverage.get("climateSimilarityRmseC"),
        "analog_climate_station_name": coverage.get("analogClimateStationName"),
        "source_pdf_page": row.get("sourcePdfPage"),
        "dataset_version": dataset.get("datasetVersion"),
        "source_reference": dataset.get("sourceReference"),
        "calculation": dataset.get("calculation"),
    }


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