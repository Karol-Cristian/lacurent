from __future__ import annotations

import json
import os
from pathlib import Path

from pybuildingenergy.source import utils as pbe_utils

import validation.pbe_campaign_batch1b_climate_normalized as climate_norm
import validation.pbe_vertical_compare as base
from validation.pbe_campaign_batch1 import LOCATIONS
from commercial.app.engine import calculate
from commercial.app.main import build_input_from_form

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results-1e"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

VARIANTS = {
    "baseline": set(),
    "floor_off": {"Floor"},
    "roof_off": {"Roof"},
    "walls_off": {"Wall N", "Wall E", "Wall S", "Wall W"},
    "door_off": {"Door S"},
    "all_opaque_off": {"Floor", "Roof", "Wall N", "Wall E", "Wall S", "Wall W", "Door S"},
}


def main():
    loc = next(x for x in LOCATIONS if x["name"] == "București")
    form = base.ui_form(
        name="1e Bucuresti opaque-surface attribution",
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

    pbe_utils.ISO52010.get_tmy_data_pvgis = classmethod(climate_norm._patched_get_tmy_data_pvgis)
    rows = []
    try:
        for variant, names_off in VARIANTS.items():
            bui = base.pbe_bui(light, building)
            for surface in bui["building_surface"]:
                if surface["name"] in names_off:
                    surface["solar_absorptance"] = 0.0
            _, pbe = base.pbe_iso_run(bui)
            rows.append({
                "variant": variant,
                "pbe_heating_kwh": float(pbe["heating_useful_kwh"]),
                "light_heating_kwh": float(light.annual_heating_demand_kwh),
                "delta_pct": base.rel_diff(float(light.annual_heating_demand_kwh), float(pbe["heating_useful_kwh"])),
            })
    finally:
        pbe_utils.ISO52010.get_tmy_data_pvgis = climate_norm._ORIGINAL_GET_PVGIS

    baseline = next(r for r in rows if r["variant"] == "baseline")["pbe_heating_kwh"]
    for r in rows:
        r["pbe_change_vs_baseline_kwh"] = r["pbe_heating_kwh"] - baseline
        r["pbe_change_vs_baseline_pct"] = 100.0 * (r["pbe_heating_kwh"] - baseline) / baseline

    payload={"meta":{"campaign":"Batch 1e opaque surface attribution","production_touched":False},"rows":rows}
    (OUT_DIR/"batch1e-results.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding="utf-8")

    print("# Batch 1e — PBE opaque solar attribution, București HRV80")
    print()
    print("| Variant | PBE heating kWh | PBE change | Light delta |")
    print("|---|---:|---:|---:|")
    for r in rows:
        print(f"| {r['variant']} | {r['pbe_heating_kwh']:.1f} | {r['pbe_change_vs_baseline_kwh']:+.1f} kWh | {r['delta_pct']:.1f}% |")


if __name__ == "__main__":
    main()
