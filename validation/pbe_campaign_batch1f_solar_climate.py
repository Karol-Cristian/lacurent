from __future__ import annotations

import json
import os
from pathlib import Path

import pandas as pd
from pybuildingenergy.source import utils as pbe_utils

import validation.pbe_campaign_batch1b_climate_normalized as climate_norm
import validation.pbe_vertical_compare as base
from validation.pbe_campaign_batch1 import LOCATIONS
from commercial.app.engine import calculate
from commercial.app.main import build_input_from_form
from commercial.app.methodology import resolve_climate, resolve_monthly_hsol, resolve_monthly_plane_hsol

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results-1f"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

LOCATION_NAMES = {"București", "Cluj-Napoca", "Brașov"}
TEST_LOCATIONS = [loc for loc in LOCATIONS if loc["name"] in LOCATION_NAMES]

ORIENTATIONS = {
    "NV": ("north", 90.0),
    "EV": ("east", 90.0),
    "SV": ("south", 90.0),
    "WV": ("west", 90.0),
    "HOR": ("south", 0.0),
}


def mc001_target(climate: dict, code: str) -> list[float]:
    orientation, tilt = ORIENTATIONS[code]
    if tilt == 90.0:
        row = resolve_monthly_hsol(climate, orientation)
    else:
        row = resolve_monthly_plane_hsol(climate, orientation, tilt)
    if row is None:
        raise RuntimeError(f"No MC001 Hsol target for {code}")
    return [float(x) for x in row["values_kwh_m2_month"]]


def simulation_year(df: pd.DataFrame) -> int:
    counts = pd.Series(df.index.year).value_counts()
    # The explicit previous-December warm-up is shorter than the actual TMY year.
    return int(counts.idxmax())


def main() -> None:
    rows = []
    original = pbe_utils.ISO52010.get_tmy_data_pvgis
    pbe_utils.ISO52010.get_tmy_data_pvgis = classmethod(climate_norm._patched_get_tmy_data_pvgis)
    try:
        for loc in TEST_LOCATIONS:
            form = base.ui_form(
                name=f"1f {loc['zone']} solar-climate diagnostic",
                wall_u=0.25, roof_u=0.15, floor_u=0.20,
                window_u=1.11, door_u=1.30,
                recovery=0.80, heating="gas",
            )
            form["locality_id"] = loc["siruta"]
            form["locality"] = loc["name"]
            building = build_input_from_form(form)
            light = calculate(building)
            climate_norm.register_mc001_monthly_temperatures(light, loc["lat"], loc["lon"])

            base.CLJ_LAT = float(loc["lat"])
            base.CLJ_LON = float(loc["lon"])
            bui = base.pbe_bui(light, building)
            checked, issues = base.pybui.sanitize_and_validate_BUI(bui, fix=True)
            errors = [x for x in issues if x.get("level") == "ERROR"]
            if errors:
                raise RuntimeError(errors)

            sim = pbe_utils.Calculation_ISO_52010(
                checked, None, weather_source="pvgis"
            ).sim_df
            year = simulation_year(sim)
            actual = sim[sim.index.year == year].copy()
            climate = resolve_climate(building.locality)

            for code in ORIENTATIONS:
                target = mc001_target(climate, code)
                col = f"I_sol_tot_{code}"
                if col not in actual.columns:
                    raise RuntimeError(f"Missing {col}")
                monthly = (
                    pd.to_numeric(actual[col], errors="coerce").fillna(0.0)
                    .groupby(actual.index.month).sum() / 1000.0
                )
                for month in range(1, 13):
                    pbe_val = float(monthly.get(month, 0.0))
                    mc_val = float(target[month - 1])
                    rows.append({
                        "location": loc["name"],
                        "zone": loc["zone"],
                        "orientation": code,
                        "month": month,
                        "mc001_kwh_m2": mc_val,
                        "pvgis_pbe_kwh_m2": pbe_val,
                        "delta_kwh_m2": pbe_val - mc_val,
                        "delta_pct": (
                            100.0 * (pbe_val - mc_val) / mc_val if abs(mc_val) > 1e-12 else None
                        ),
                    })
    finally:
        pbe_utils.ISO52010.get_tmy_data_pvgis = original

    annual = []
    for loc in TEST_LOCATIONS:
        for code in ORIENTATIONS:
            rr = [r for r in rows if r["location"] == loc["name"] and r["orientation"] == code]
            mc = sum(r["mc001_kwh_m2"] for r in rr)
            pv = sum(r["pvgis_pbe_kwh_m2"] for r in rr)
            annual.append({
                "location": loc["name"],
                "zone": loc["zone"],
                "orientation": code,
                "mc001_annual_kwh_m2": mc,
                "pvgis_pbe_annual_kwh_m2": pv,
                "delta_kwh_m2": pv - mc,
                "delta_pct": 100.0 * (pv - mc) / mc if abs(mc) > 1e-12 else None,
            })

    payload = {
        "meta": {
            "campaign": "Batch 1f solar-climate diagnostic",
            "production_touched": False,
            "temperature": "PBE monthly dry-bulb means shifted to MC001 as in Batch 1b",
            "solar": "Unmodified PVGIS/PBE ISO 52010 hourly plane irradiation compared with MC001 A.9.6 monthly Hsol",
            "warning": "Diagnostic only; no solar normalization is applied in this batch.",
        },
        "annual": annual,
        "monthly": rows,
    }
    (OUT_DIR / "batch1f-results.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("# Batch 1f — Solar climate mismatch")
    print()
    print("| Location | Plane | MC001 annual kWh/m² | PVGIS/PBE annual kWh/m² | Delta |")
    print("|---|---|---:|---:|---:|")
    for r in annual:
        print(
            f"| {r['location']} | {r['orientation']} | {r['mc001_annual_kwh_m2']:.1f} | "
            f"{r['pvgis_pbe_annual_kwh_m2']:.1f} | {r['delta_pct']:+.1f}% |"
        )

    print()
    print("## South monthly")
    print()
    print("| Location | Month | MC001 | PVGIS/PBE | Delta |")
    print("|---|---:|---:|---:|---:|")
    for r in rows:
        if r["orientation"] == "SV":
            print(
                f"| {r['location']} | {r['month']} | {r['mc001_kwh_m2']:.1f} | "
                f"{r['pvgis_pbe_kwh_m2']:.1f} | {r['delta_pct']:+.1f}% |"
            )


if __name__ == "__main__":
    main()
