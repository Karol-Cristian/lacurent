from __future__ import annotations

import json
import os
from pathlib import Path

from pybuildingenergy.source import utils as pbe_utils

import validation.pbe_campaign_batch1b_climate_normalized as climate_norm
import validation.pbe_campaign_batch1c_hrv_isolation as batch
import validation.pbe_vertical_compare as base
from validation.pbe_campaign_batch1 import LOCATIONS

from commercial.app.engine import (
    _monthly_heating_need,
    _monthly_solar_gains,
    _monthly_utilization_parameter,
    calculate,
    transmission_heat_transfer,
    ventilation_heat_transfer,
)
from commercial.app.main import build_input_from_form
from commercial.app.methodology import resolve_climate, resolve_monthly_hsol, resolve_monthly_plane_hsol

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results-1d"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

LOCATION_NAMES = {"București", "Cluj-Napoca", "Brașov"}
TEST_LOCATIONS = [loc for loc in LOCATIONS if loc["name"] in LOCATION_NAMES]
ALPHA_OPAQUE = 0.55  # exact adapter alignment; MC001 recommends representative values 0.3/0.6/0.9


def opaque_elements(building):
    wall = next(x for x in building.envelope if x.type.value == "exterior_wall")
    roof = next(x for x in building.envelope if x.type.value == "roof")
    door = next(x for x in building.envelope if x.type.value == "exterior_door")
    wall_quarter = float(wall.area_m2) / 4.0
    return [
        ("wall_n", wall_quarter, float(wall.u_value_w_m2k), "north", 90.0, 0.5),
        ("wall_e", wall_quarter, float(wall.u_value_w_m2k), "east", 90.0, 0.5),
        ("wall_s", wall_quarter, float(wall.u_value_w_m2k), "south", 90.0, 0.5),
        ("wall_w", wall_quarter, float(wall.u_value_w_m2k), "west", 90.0, 0.5),
        ("roof", float(roof.area_m2), float(roof.u_value_w_m2k), "south", 0.0, 1.0),
        ("door_s", float(door.area_m2), float(door.u_value_w_m2k), "south", 90.0, 0.5),
    ]


def monthly_opaque_solar(building, climate, month_index: int, hours: float) -> tuple[float, list[dict]]:
    # MC001-2022 relation 2.50:
    # Qsol,op = alpha_sr * Rse * U * A * Fsh,obst * Hsol - Qsky
    rse = float(building.solar.exterior_surface_resistance_m2k_w)
    hlr = float(building.solar.longwave_radiation_coefficient_w_m2k)
    dtheta_sky = float(building.solar.sky_temperature_difference_k)
    fsh = float(building.solar.obstacle_shading_factor)
    total = 0.0
    parts = []
    for name, area, u, orientation, tilt, fsky in opaque_elements(building):
        plane = resolve_monthly_plane_hsol(climate, orientation, tilt)
        if plane is None:
            raise RuntimeError(f"No source-backed Hsol for {orientation=} {tilt=}")
        hsol = float(plane["values_kwh_m2_month"][month_index])
        gross = ALPHA_OPAQUE * rse * u * area * fsh * hsol
        qsky = 0.001 * fsky * rse * u * area * hlr * dtheta_sky * hours
        net = gross - qsky
        total += net
        parts.append({
            "name": name, "hsol_kwh_m2": hsol, "gross_kwh": gross,
            "qsky_kwh": qsky, "net_kwh": net,
        })
    return total, parts


def corrected_light(building):
    htr, _, _ = transmission_heat_transfer(building)
    hve = ventilation_heat_transfer(building)
    total_h = float(htr) + float(hve)
    a_h = _monthly_utilization_parameter(building, total_h, "heating")
    climate = resolve_climate(building.locality)
    # Keep exactly the Light internal-gain convention.
    from commercial.app.methodology import methodology
    cfg = methodology()
    internal_w_m2 = (
        float(building.internal_gains_w_m2)
        if building.internal_gains_w_m2 is not None
        else float(cfg["internal_gains_w_m2"][building.building_type.value])
    )

    months = []
    annual = 0.0
    for idx, month in enumerate(climate["monthly_temperatures"]):
        hours = float(month["days"]) * 24.0
        q_ht = total_h * (float(building.indoor_design_temperature_c) - float(month["temperature_c"])) * hours / 1000.0
        internal = internal_w_m2 * float(building.heated_floor_area_m2) * hours / 1000.0
        transparent = float(_monthly_solar_gains(building, climate, idx, hours)["gains_kwh"])
        opaque, parts = monthly_opaque_solar(building, climate, idx, hours)
        gains = internal + transparent + opaque
        useful = _monthly_heating_need(q_ht, gains, a_h)
        annual += useful
        months.append({
            "month": month["id"],
            "q_ht_kwh": q_ht,
            "internal_kwh": internal,
            "transparent_solar_kwh": transparent,
            "opaque_solar_kwh": opaque,
            "total_gains_kwh": gains,
            "useful_heating_kwh": useful,
            "opaque_parts": parts,
        })
    return {"annual_heating_kwh": annual, "months": months, "htr_w_k": htr, "hve_w_k": hve, "a_h": a_h}


def main():
    rows = []
    pbe_utils.ISO52010.get_tmy_data_pvgis = classmethod(climate_norm._patched_get_tmy_data_pvgis)
    try:
        for loc in TEST_LOCATIONS:
            form = base.ui_form(
                name=f"1d {loc['zone']} MC001 opaque solar",
                wall_u=0.25, roof_u=0.15, floor_u=0.20,
                window_u=1.11, door_u=1.30,
                recovery=0.80, heating="gas",
            )
            form["locality_id"] = loc["siruta"]
            form["locality"] = loc["name"]
            building = build_input_from_form(form)
            light = calculate(building)
            corr = corrected_light(building)

            climate_norm.register_mc001_monthly_temperatures(light, loc["lat"], loc["lon"])
            base.CLJ_LAT = float(loc["lat"])
            base.CLJ_LON = float(loc["lon"])
            bui = base.pbe_bui(light, building)
            hourly, pbe = base.pbe_iso_run(bui)

            baseline = float(light.annual_heating_demand_kwh)
            corrected = float(corr["annual_heating_kwh"])
            pbe_useful = float(pbe["heating_useful_kwh"])
            opaque_total = sum(float(m["opaque_solar_kwh"]) for m in corr["months"])
            rows.append({
                "location": loc["name"],
                "zone": loc["zone"],
                "light_baseline_kwh": baseline,
                "light_mc001_opaque_corrected_kwh": corrected,
                "pbe_kwh": pbe_useful,
                "baseline_delta_pct": base.rel_diff(baseline, pbe_useful),
                "corrected_delta_pct": base.rel_diff(corrected, pbe_useful),
                "opaque_solar_net_kwh": opaque_total,
                "htr_w_k": corr["htr_w_k"],
                "hve_w_k": corr["hve_w_k"],
                "a_h": corr["a_h"],
                "months": corr["months"],
            })
    finally:
        pbe_utils.ISO52010.get_tmy_data_pvgis = climate_norm._ORIGINAL_GET_PVGIS

    payload = {
        "meta": {
            "campaign": "Batch 1d MC001 opaque-solar diagnostic",
            "production_touched": False,
            "alpha_opaque": ALPHA_OPAQUE,
            "method": "MC001-2022 relation 2.50 added in validation harness only",
            "geometry": "walls split equally N/E/S/W; roof horizontal; exterior door south; floor excluded from solar",
            "warning": "Diagnostic alignment only. Production Light engine remains unchanged.",
        },
        "rows": rows,
    }
    (OUT_DIR / "batch1d-results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print("# Batch 1d — MC001 opaque solar diagnostic")
    print()
    print("| Location | Light baseline | Light + MC001 2.50 | PBE | Baseline delta | Corrected delta | Net opaque solar |")
    print("|---|---:|---:|---:|---:|---:|---:|")
    for r in rows:
        print(
            f"| {r['location']} | {r['light_baseline_kwh']:.1f} | "
            f"{r['light_mc001_opaque_corrected_kwh']:.1f} | {r['pbe_kwh']:.1f} | "
            f"{r['baseline_delta_pct']:.1f}% | {r['corrected_delta_pct']:.1f}% | "
            f"{r['opaque_solar_net_kwh']:.1f} |"
        )


if __name__ == "__main__":
    main()
