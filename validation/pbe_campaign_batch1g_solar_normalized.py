from __future__ import annotations

import json
import os
from copy import deepcopy
from pathlib import Path

import pandas as pd
from pybuildingenergy.source import utils as pbe_utils

import validation.pbe_campaign_batch1b_climate_normalized as climate_norm
import validation.pbe_vertical_compare as base
from validation.pbe_campaign_batch1 import LOCATIONS
from commercial.app.engine import calculate
from commercial.app.main import build_input_from_form
from commercial.app.methodology import resolve_climate, resolve_monthly_hsol, resolve_monthly_plane_hsol

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results-1g"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

LOCATION_NAMES = {"București", "Cluj-Napoca", "Brașov"}
TEST_LOCATIONS = [loc for loc in LOCATIONS if loc["name"] in LOCATION_NAMES]

_ORIGINAL_CALC_52010 = pbe_utils.Calculation_ISO_52010
_SOLAR_TARGETS: dict[tuple[float, float], dict[str, list[float]]] = {}
_SCALE_DIAG: dict[tuple[float, float], dict[str, dict[int, float]]] = {}

CODE_TO_LIGHT = {
    "NV": ("north", 90.0),
    "EV": ("east", 90.0),
    "SV": ("south", 90.0),
    "WV": ("west", 90.0),
    "HOR": ("south", 0.0),
}


def weather_key(building_object) -> tuple[float, float]:
    b = building_object["building"]
    return (round(float(b["latitude"]), 5), round(float(b["longitude"]), 5))


def register_solar_targets(building, lat: float, lon: float) -> dict[str, list[float]]:
    climate = resolve_climate(building.locality)
    targets: dict[str, list[float]] = {}
    for code, (orientation, tilt) in CODE_TO_LIGHT.items():
        row = (
            resolve_monthly_hsol(climate, orientation)
            if tilt == 90.0
            else resolve_monthly_plane_hsol(climate, orientation, tilt)
        )
        if row is None:
            raise RuntimeError(f"No MC001 solar target for {code}")
        targets[code] = [float(x) for x in row["values_kwh_m2_month"]]
    key = (round(float(lat), 5), round(float(lon), 5))
    _SOLAR_TARGETS[key] = targets
    return targets


def _main_tmy_year(df: pd.DataFrame) -> int:
    counts = pd.Series(df.index.year).value_counts()
    return int(counts.idxmax())


def patched_calc_52010(building_object, path_weather_file, weather_source="pvgis"):
    result = _ORIGINAL_CALC_52010(building_object, path_weather_file, weather_source=weather_source)
    if weather_source != "pvgis":
        return result

    key = weather_key(building_object)
    targets = _SOLAR_TARGETS.get(key)
    if targets is None:
        raise RuntimeError(f"No MC001 solar targets registered for {key}")

    df = result.sim_df.copy(deep=True)
    main_year = _main_tmy_year(df)
    main_year_mask = df.index.year == main_year
    diag: dict[str, dict[int, float]] = {}

    for code, target_values in targets.items():
        total_col = f"I_sol_tot_{code}"
        if total_col not in df.columns:
            raise RuntimeError(f"Missing {total_col}")
        diag[code] = {}

        for month in range(1, 13):
            reference_mask = main_year_mask & (df.index.month == month)
            current_kwh_m2 = float(
                pd.to_numeric(df.loc[reference_mask, total_col], errors="coerce")
                .fillna(0.0).sum() / 1000.0
            )
            target_kwh_m2 = float(target_values[month - 1])
            if current_kwh_m2 <= 1e-12:
                factor = 1.0 if target_kwh_m2 <= 1e-12 else 0.0
            else:
                factor = target_kwh_m2 / current_kwh_m2
            diag[code][month] = factor

            # Apply the same factor to the actual TMY month and the prepended
            # December warm-up, preserving within-month hourly shape and
            # direct/diffuse composition.
            mask = df.index.month == month
            for prefix in ("I_sol_tot_", "I_sol_dif_", "I_sol_dir_w_"):
                col = f"{prefix}{code}"
                if col in df.columns:
                    df.loc[mask, col] = (
                        pd.to_numeric(df.loc[mask, col], errors="coerce")
                        .fillna(0.0) * factor
                    )

    _SCALE_DIAG[key] = diag
    return pbe_utils.simdf_52010(sim_df=df)


def pbe_case(light, building, loc, opaque_solar_off: bool) -> dict:
    base.CLJ_LAT = float(loc["lat"])
    base.CLJ_LON = float(loc["lon"])
    bui = base.pbe_bui(light, building)
    if opaque_solar_off:
        for surface in bui["building_surface"]:
            if surface.get("type") == "opaque":
                surface["solar_absorptance"] = 0.0
    hourly, pbe = base.pbe_iso_run(bui)
    return {
        "useful_kwh": float(pbe["heating_useful_kwh"]),
        "solar_gains_kwh": float(pbe["solar_gains_kwh"]),
        "internal_gains_kwh": float(pbe["internal_gains_kwh"]),
        "hours_with_heating": int(pbe["hours_with_heating"]),
    }


def main() -> None:
    rows = []
    original_get = pbe_utils.ISO52010.get_tmy_data_pvgis
    original_calc = pbe_utils.Calculation_ISO_52010

    # Temperature normalization from Batch 1b plus monthly plane-irradiation
    # normalization in this batch. Production/runtime code remains untouched.
    pbe_utils.ISO52010.get_tmy_data_pvgis = classmethod(climate_norm._patched_get_tmy_data_pvgis)
    pbe_utils.Calculation_ISO_52010 = patched_calc_52010
    try:
        for loc in TEST_LOCATIONS:
            form = base.ui_form(
                name=f"1g {loc['zone']} temp+solar normalized",
                wall_u=0.25, roof_u=0.15, floor_u=0.20,
                window_u=1.11, door_u=1.30,
                recovery=0.80, heating="gas",
            )
            form["locality_id"] = loc["siruta"]
            form["locality"] = loc["name"]
            building = build_input_from_form(form)
            light = calculate(building)
            climate_norm.register_mc001_monthly_temperatures(light, loc["lat"], loc["lon"])
            targets = register_solar_targets(building, loc["lat"], loc["lon"])

            baseline = pbe_case(light, building, loc, opaque_solar_off=False)
            transparent_only = pbe_case(light, building, loc, opaque_solar_off=True)
            light_useful = float(light.annual_heating_demand_kwh)
            key = (round(float(loc["lat"]), 5), round(float(loc["lon"]), 5))

            rows.append({
                "location": loc["name"],
                "zone": loc["zone"],
                "light_useful_kwh": light_useful,
                "pbe_temp_solar_normalized": baseline,
                "pbe_temp_solar_normalized_opaque_off": transparent_only,
                "delta_pct": base.rel_diff(light_useful, baseline["useful_kwh"]),
                "delta_opaque_off_pct": base.rel_diff(light_useful, transparent_only["useful_kwh"]),
                "solar_targets": targets,
                "solar_scale_factors": deepcopy(_SCALE_DIAG[key]),
            })
    finally:
        pbe_utils.Calculation_ISO_52010 = original_calc
        pbe_utils.ISO52010.get_tmy_data_pvgis = original_get

    payload = {
        "meta": {
            "campaign": "Batch 1g temperature + monthly solar normalization",
            "production_touched": False,
            "temperature_normalization": "Same additive monthly dry-bulb mean shift as Batch 1b.",
            "solar_normalization": (
                "For NV/EV/SV/WV/HOR separately, each PVGIS/PBE month is scaled so "
                "integrated I_sol_tot exactly equals the corresponding MC001 A.9.6 Hsol. "
                "Hourly shape and direct/diffuse ratio are retained."
            ),
            "warning": "Diagnostic isolation experiment, not a normative hourly weather file or certification calculation.",
        },
        "rows": rows,
    }
    (OUT_DIR / "batch1g-results.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("# Batch 1g — Temperature + solar monthly-normalized comparison")
    print()
    print("| Location | Light kWh | PBE normalized kWh | Delta | PBE opaque-off kWh | Delta opaque-off |")
    print("|---|---:|---:|---:|---:|---:|")
    for r in rows:
        print(
            f"| {r['location']} | {r['light_useful_kwh']:.1f} | "
            f"{r['pbe_temp_solar_normalized']['useful_kwh']:.1f} | {r['delta_pct']:+.1f}% | "
            f"{r['pbe_temp_solar_normalized_opaque_off']['useful_kwh']:.1f} | "
            f"{r['delta_opaque_off_pct']:+.1f}% |"
        )

    print()
    print("## Solar scale-factor range")
    print()
    print("| Location | Plane | Min monthly factor | Max monthly factor |")
    print("|---|---|---:|---:|")
    for r in rows:
        for code, factors in r["solar_scale_factors"].items():
            vals = [float(v) for v in factors.values()]
            print(f"| {r['location']} | {code} | {min(vals):.3f} | {max(vals):.3f} |")


if __name__ == "__main__":
    main()
