from __future__ import annotations

import json
import os
from pathlib import Path

from pybuildingenergy.source import utils as pbe_utils

import validation.pbe_campaign_batch1b_climate_normalized as climate_norm
import validation.pbe_campaign_batch1c_hrv_isolation as batch
from validation.pbe_campaign_batch1 import LOCATIONS

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results-1c-focus"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

VARIANTS = ["baseline", "no_internal", "no_solar", "no_gains", "opaque_solar_off"]


def main() -> None:
    loc = next(item for item in LOCATIONS if item["name"] == "București")
    rows = []
    pbe_utils.ISO52010.get_tmy_data_pvgis = classmethod(climate_norm._patched_get_tmy_data_pvgis)
    try:
        for variant in VARIANTS:
            rows.append(batch.run_case(loc, 0.80, variant))
    finally:
        pbe_utils.ISO52010.get_tmy_data_pvgis = climate_norm._ORIGINAL_GET_PVGIS

    base = next(r for r in rows if r["variant"] == "baseline")
    base_delta = float(base["difference"]["useful_pct"])
    summary = []
    for row in rows:
        summary.append({
            "variant": row["variant"],
            "label": row["variant_label"],
            "light_useful_kwh": row["light"]["heating_useful_kwh"],
            "pbe_useful_kwh": row["pbe"]["heating_useful_kwh"],
            "delta_pct": row["difference"]["useful_pct"],
            "change_vs_baseline_pp": float(row["difference"]["useful_pct"]) - base_delta,
            "light_internal_gains_kwh": row["light"]["internal_gains_kwh"],
            "pbe_internal_gains_kwh": row["pbe"]["internal_gains_kwh"],
            "light_solar_gains_kwh": row["light"]["solar_gains_kwh"],
            "pbe_solar_gains_kwh": row["pbe"]["solar_gains_kwh"],
            "light_hve_w_k": row["light"]["h_ve_w_k"],
            "pbe_hve_input_w_k": row["pbe"]["h_ve_input_w_k"],
        })

    payload = {
        "meta": {
            "campaign": "Batch 1c focused residual isolation",
            "location": "București",
            "hrv_recovery": 0.80,
            "production_touched": False,
            "climate": "PVGIS hourly dry-bulb monthly means shifted to LaCurent MC001 monthly means",
        },
        "summary": summary,
    }
    (OUT_DIR / "focus-results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print("# Batch 1c focus — București HRV 80%")
    print()
    print("| Variant | Light kWh | PBE kWh | Delta | Change vs baseline | Light int. | PBE int. | Light solar | PBE solar | Hve L/PBE |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    for row in summary:
        print(
            f"| {row['variant']} | {row['light_useful_kwh']:.1f} | {row['pbe_useful_kwh']:.1f} | "
            f"{row['delta_pct']:.1f}% | {row['change_vs_baseline_pp']:.1f} pp | "
            f"{row['light_internal_gains_kwh']:.1f} | {row['pbe_internal_gains_kwh']:.1f} | "
            f"{row['light_solar_gains_kwh']:.1f} | {row['pbe_solar_gains_kwh']:.1f} | "
            f"{row['light_hve_w_k']:.2f}/{row['pbe_hve_input_w_k']:.2f} |"
        )


if __name__ == "__main__":
    main()
