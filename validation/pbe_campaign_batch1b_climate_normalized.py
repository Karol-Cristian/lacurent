from __future__ import annotations

import json
import math
import os
import statistics
from copy import deepcopy
from pathlib import Path

from fastapi.testclient import TestClient
from pybuildingenergy.source import utils as pbe_utils

import validation.pbe_vertical_compare as base
from validation.pbe_campaign_batch1 import LOCATIONS, STATES, band, fmt, light_climate_diag
from commercial.app.engine import calculate
from commercial.app.main import app, build_input_from_form

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results-1b"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Keep only distinct building-demand states; HP duplicates H demand.
DEMAND_STATES = [s for s in STATES if s["id"] in {"E", "R", "H"}]

_ORIGINAL_GET_PVGIS = pbe_utils.ISO52010.get_tmy_data_pvgis
_RAW_WEATHER_CACHE = {}
_TARGET_MONTHLY_TEMPS = {}
_SHIFTED_WEATHER_CACHE = {}


def _weather_key_from_building(building_object):
    b = building_object["building"] if isinstance(building_object, dict) else building_object
    if isinstance(b, dict):
        return (round(float(b["latitude"]), 5), round(float(b["longitude"]), 5))
    return (round(float(b.latitude), 5), round(float(b.longitude), 5))


def _patched_get_tmy_data_pvgis(cls, building_object):
    key = _weather_key_from_building(building_object)
    if key not in _TARGET_MONTHLY_TEMPS:
        raise RuntimeError(f"No MC001 target monthly temperatures registered for {key}")

    if key not in _RAW_WEATHER_CACHE:
        _RAW_WEATHER_CACHE[key] = _ORIGINAL_GET_PVGIS(building_object)

    if key not in _SHIFTED_WEATHER_CACHE:
        raw = _RAW_WEATHER_CACHE[key]
        df = raw.weather_data.copy(deep=True)
        targets = _TARGET_MONTHLY_TEMPS[key]
        for month in range(1, 13):
            mask = df.index.month == month
            current_mean = float(df.loc[mask, "T2m"].mean())
            df.loc[mask, "T2m"] = df.loc[mask, "T2m"].astype(float) + (float(targets[month]) - current_mean)
        _SHIFTED_WEATHER_CACHE[key] = pbe_utils.WeatherDataResult(
            elevation=float(raw.elevation),
            weather_data=df,
            utc_offset=int(raw.utc_offset),
            latitude=float(raw.latitude),
            longitude=float(raw.longitude),
        )

    shifted = _SHIFTED_WEATHER_CACHE[key]
    return pbe_utils.WeatherDataResult(
        elevation=shifted.elevation,
        weather_data=shifted.weather_data.copy(deep=True),
        utc_offset=shifted.utc_offset,
        latitude=shifted.latitude,
        longitude=shifted.longitude,
    )


def register_mc001_monthly_temperatures(light, lat: float, lon: float) -> dict[int, float]:
    monthly = {idx: float(item.outdoor_temperature_c) for idx, item in enumerate(light.monthly, start=1)}
    key = (round(float(lat), 5), round(float(lon), 5))
    _TARGET_MONTHLY_TEMPS[key] = monthly
    return monthly


def main() -> None:
    client = TestClient(app)
    rows = []
    demand_cache = {}

    # Patch only inside this validation process. Production/runtime code is untouched.
    pbe_utils.ISO52010.get_tmy_data_pvgis = classmethod(_patched_get_tmy_data_pvgis)

    try:
        for loc in LOCATIONS:
            for state in DEMAND_STATES:
                form = base.ui_form(
                    name=f"1b {loc['zone']}-{state['id']} {loc['name']}",
                    wall_u=state["wall_u"],
                    roof_u=state["roof_u"],
                    floor_u=state["floor_u"],
                    window_u=state["window_u"],
                    door_u=state["door_u"],
                    recovery=state["recovery"],
                    heating=state["heating"],
                )
                form["locality_id"] = loc["siruta"]
                form["locality"] = loc["name"]
                form["project_name"] = f"Climate-normalized {loc['zone']}-{state['id']} {loc['name']}"

                response = client.post("/api/home-lab-next/calculate", data=form)
                if response.status_code != 200:
                    raise RuntimeError(f"{loc['name']} {state['id']} endpoint failed: {response.status_code} {response.text[:400]}")

                building = build_input_from_form(form)
                light = calculate(building)
                light_diag = light_climate_diag(light)
                target_monthly = register_mc001_monthly_temperatures(light, loc["lat"], loc["lon"])

                demand_key = json.dumps({
                    "location": loc["name"],
                    "state": state["id"],
                    "envelope": [(x.type.value, x.area_m2, x.u_value_w_m2k) for x in building.envelope],
                    "hve": float(light.h_ve_w_k),
                    "solar_glazing": building.solar.glazing_type_id,
                }, sort_keys=True)

                if demand_key not in demand_cache:
                    base.CLJ_LAT = float(loc["lat"])
                    base.CLJ_LON = float(loc["lon"])
                    bui = base.pbe_bui(light, building)
                    demand_cache[demand_key] = base.pbe_iso_run(bui)

                _, pbe = demand_cache[demand_key]
                light_useful = float(light.annual_heating_demand_kwh)
                pbe_useful = float(pbe["heating_useful_kwh"])
                delta = base.rel_diff(light_useful, pbe_useful)

                rows.append({
                    "case_id": f"{loc['zone']}-{state['id']}",
                    "zone": loc["zone"],
                    "location": loc["name"],
                    "state": state["id"],
                    "state_label": state["label"],
                    "mc001_monthly_temperature_c": target_monthly,
                    "lacurent": {
                        "outdoor_mean_c": float(light_diag["outdoor_mean_c"]),
                        "degree_hours_20c": float(light_diag["degree_hours_20c"]),
                        "heating_useful_kwh": light_useful,
                    },
                    "pbe_temperature_normalized": {
                        "outdoor_mean_c": float(pbe["outdoor_mean_c"]),
                        "degree_hours_20c": float(pbe["degree_hours_20c"]),
                        "heating_useful_kwh": pbe_useful,
                    },
                    "difference": {
                        "useful_pct": delta,
                        "acceptance_band": band(delta),
                    },
                })
    finally:
        # Restore library class method before process exit for clean isolation.
        pbe_utils.ISO52010.get_tmy_data_pvgis = _ORIGINAL_GET_PVGIS

    abs_deltas = [abs(float(r["difference"]["useful_pct"])) for r in rows]
    s = sorted(abs_deltas)
    p90_index = max(0, math.ceil(0.90 * len(s)) - 1)

    by_zone = {}
    for loc in LOCATIONS:
        zr = [r for r in rows if r["zone"] == loc["zone"]]
        vals = [abs(float(r["difference"]["useful_pct"])) for r in zr]
        by_zone[loc["zone"]] = {
            "location": loc["name"],
            "mean_abs_delta_pct": sum(vals) / len(vals),
            "max_abs_delta_pct": max(vals),
            "pass_count": sum(r["difference"]["acceptance_band"] == "PASS" for r in zr),
            "review_count": sum(r["difference"]["acceptance_band"] == "REVIEW" for r in zr),
            "investigate_count": sum(r["difference"]["acceptance_band"] == "INVESTIGATE" for r in zr),
        }

    payload = {
        "meta": {
            "campaign": "batch-1b temperature-normalized",
            "lacurent_source_sha": "e8d5c00e01f68acb72f66e255168710caeb18e47",
            "analysis_branch": "analysis/pbe-vertical-validation-20260920",
            "production_touched": False,
            "pbe_commit": base.PBE_COMMIT,
            "normalization": "PVGIS hourly profile retained; each month's dry-bulb temperature is additively shifted so its mean equals LaCurent MC001 monthly outdoor temperature. Solar, humidity and hourly temperature shape remain PVGIS-derived.",
            "warning": "This is a diagnostic isolation experiment, not an EPW/normative weather file and not a certification calculation.",
        },
        "aggregate": {
            "cases": len(rows),
            "median_abs_useful_delta_pct": statistics.median(abs_deltas),
            "p90_abs_useful_delta_pct": s[p90_index],
            "max_abs_useful_delta_pct": max(abs_deltas),
            "pass_count": sum(r["difference"]["acceptance_band"] == "PASS" for r in rows),
            "review_count": sum(r["difference"]["acceptance_band"] == "REVIEW" for r in rows),
            "investigate_count": sum(r["difference"]["acceptance_band"] == "INVESTIGATE" for r in rows),
            "by_zone": by_zone,
        },
        "cases": rows,
    }
    (OUT_DIR / "batch1b-results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    report = [
        "# LaCurent validation campaign — Batch 1b climate-isolation diagnostic",
        "",
        "Purpose: remove the largest dry-bulb climate-mean mismatch seen in Batch 1 without pretending that MC001 monthly weather and PVGIS hourly weather are identical.",
        "",
        f"- LaCurent source SHA: `{payload['meta']['lacurent_source_sha']}`",
        f"- PBE commit: `{base.PBE_COMMIT}`",
        "- Production touched: **no**",
        "- Temperature normalization: monthly additive dry-bulb shift to the exact MC001 monthly mean used by LaCurent.",
        "- PVGIS hourly shape, solar irradiation, humidity and other weather variables remain unchanged.",
        "- This is a diagnostic isolation experiment, not a normative weather file.",
        "",
        "## Aggregate",
        "",
        f"- Cases: **{payload['aggregate']['cases']}**",
        f"- Median absolute useful-demand delta: **{fmt(payload['aggregate']['median_abs_useful_delta_pct'])}%**",
        f"- P90 absolute useful-demand delta: **{fmt(payload['aggregate']['p90_abs_useful_delta_pct'])}%**",
        f"- Maximum absolute useful-demand delta: **{fmt(payload['aggregate']['max_abs_useful_delta_pct'])}%**",
        f"- PASS / REVIEW / INVESTIGATE: **{payload['aggregate']['pass_count']} / {payload['aggregate']['review_count']} / {payload['aggregate']['investigate_count']}**",
        "",
        "## Case matrix",
        "",
        "| Case | Location | State | Light useful kWh | PBE temp-normalized kWh | Δ | Band | Light mean T | PBE mean T |",
        "|---|---|---|---:|---:|---:|---|---:|---:|",
    ]
    for r in rows:
        report.append(
            f"| {r['case_id']} | {r['location']} | {r['state_label']} | "
            f"{fmt(r['lacurent']['heating_useful_kwh'])} | {fmt(r['pbe_temperature_normalized']['heating_useful_kwh'])} | "
            f"{fmt(r['difference']['useful_pct'])}% | {r['difference']['acceptance_band']} | "
            f"{fmt(r['lacurent']['outdoor_mean_c'],2)} °C | {fmt(r['pbe_temperature_normalized']['outdoor_mean_c'],2)} °C |"
        )

    report += [
        "",
        "## Degree-hour check",
        "",
        "| Case | Light degree-hours @20°C | PBE normalized degree-hours @20°C |",
        "|---|---:|---:|",
    ]
    for r in rows:
        report.append(
            f"| {r['case_id']} | {fmt(r['lacurent']['degree_hours_20c'])} Kh | "
            f"{fmt(r['pbe_temperature_normalized']['degree_hours_20c'])} Kh |"
        )

    report += [
        "",
        "## Interpretation guardrail",
        "",
        "- If a large Batch 1 delta collapses here, the original difference was substantially climate-dataset-driven.",
        "- Residual differences here include hourly dynamics, solar/weather distribution, ground treatment and monthly-vs-hourly method effects.",
        "- A residual systematic HRV-only bias points away from dry-bulb climate and toward gains/dynamics/ventilation interaction.",
        "",
    ]
    (OUT_DIR / "batch1b-report.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
