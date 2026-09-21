from __future__ import annotations

import json
import math
import os
import statistics
from pathlib import Path

from pybuildingenergy.source import utils as pbe_utils

import validation.pbe_campaign_batch1b_climate_normalized as climate_norm
import validation.pbe_campaign_batch1g_solar_normalized as solar_norm
import validation.pbe_vertical_compare as base
from validation.pbe_campaign_batch1 import LOCATIONS, STATES, band
from commercial.app.engine import calculate
from commercial.app.main import build_input_from_form

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results-1h"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

DEMAND_STATES = [s for s in STATES if s["id"] in {"E", "R", "H"}]


def main() -> None:
    rows = []
    original_get = pbe_utils.ISO52010.get_tmy_data_pvgis
    original_calc = pbe_utils.Calculation_ISO_52010

    pbe_utils.ISO52010.get_tmy_data_pvgis = classmethod(climate_norm._patched_get_tmy_data_pvgis)
    pbe_utils.Calculation_ISO_52010 = solar_norm.patched_calc_52010
    try:
        for loc in LOCATIONS:
            targets_registered = False
            for state in DEMAND_STATES:
                form = base.ui_form(
                    name=f"1h {loc['zone']}-{state['id']} temp+solar normalized",
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
                building = build_input_from_form(form)
                light = calculate(building)

                climate_norm.register_mc001_monthly_temperatures(light, loc["lat"], loc["lon"])
                if not targets_registered:
                    solar_norm.register_solar_targets(building, loc["lat"], loc["lon"])
                    targets_registered = True

                base.CLJ_LAT = float(loc["lat"])
                base.CLJ_LON = float(loc["lon"])
                bui = base.pbe_bui(light, building)
                _, pbe = base.pbe_iso_run(bui)

                light_useful = float(light.annual_heating_demand_kwh)
                pbe_useful = float(pbe["heating_useful_kwh"])
                delta = base.rel_diff(light_useful, pbe_useful)
                rows.append({
                    "case_id": f"{loc['zone']}-{state['id']}",
                    "zone": loc["zone"],
                    "location": loc["name"],
                    "state": state["id"],
                    "state_label": state["label"],
                    "light_useful_kwh": light_useful,
                    "pbe_temp_solar_normalized_kwh": pbe_useful,
                    "delta_pct": delta,
                    "abs_delta_pct": abs(delta),
                    "band": band(delta),
                    "pbe_solar_gains_kwh": float(pbe["solar_gains_kwh"]),
                    "pbe_internal_gains_kwh": float(pbe["internal_gains_kwh"]),
                })
    finally:
        pbe_utils.Calculation_ISO_52010 = original_calc
        pbe_utils.ISO52010.get_tmy_data_pvgis = original_get

    vals = sorted(r["abs_delta_pct"] for r in rows)
    p90_idx = max(0, math.ceil(0.90 * len(vals)) - 1)
    aggregate = {
        "cases": len(rows),
        "median_abs_delta_pct": statistics.median(vals),
        "p90_abs_delta_pct": vals[p90_idx],
        "max_abs_delta_pct": max(vals),
        "mean_abs_delta_pct": sum(vals) / len(vals),
        "pass_count": sum(r["band"] == "PASS" for r in rows),
        "review_count": sum(r["band"] == "REVIEW" for r in rows),
        "investigate_count": sum(r["band"] == "INVESTIGATE" for r in rows),
    }

    payload = {
        "meta": {
            "campaign": "Batch 1h full climate-normalized matrix",
            "production_touched": False,
            "normalization": (
                "PBE monthly dry-bulb means exactly aligned to LaCurent MC001; "
                "PBE monthly plane irradiation NV/EV/SV/WV/HOR exactly aligned to "
                "LaCurent MC001 A.9.6 while retaining hourly PVGIS shape."
            ),
            "warning": "Diagnostic isolation experiment, not certification weather.",
        },
        "aggregate": aggregate,
        "rows": rows,
    }
    (OUT_DIR / "batch1h-results.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("# Batch 1h — Full temperature + solar normalized matrix")
    print()
    print(
        f"Cases={aggregate['cases']} median_abs={aggregate['median_abs_delta_pct']:.2f}% "
        f"mean_abs={aggregate['mean_abs_delta_pct']:.2f}% "
        f"P90={aggregate['p90_abs_delta_pct']:.2f}% max={aggregate['max_abs_delta_pct']:.2f}% "
        f"PASS/REVIEW/INVESTIGATE={aggregate['pass_count']}/{aggregate['review_count']}/{aggregate['investigate_count']}"
    )
    print()
    print("| Case | Location | State | Light kWh | PBE normalized kWh | Delta | Band |")
    print("|---|---|---|---:|---:|---:|---|")
    for r in rows:
        print(
            f"| {r['case_id']} | {r['location']} | {r['state_label']} | "
            f"{r['light_useful_kwh']:.1f} | {r['pbe_temp_solar_normalized_kwh']:.1f} | "
            f"{r['delta_pct']:+.2f}% | {r['band']} |"
        )


if __name__ == "__main__":
    main()
