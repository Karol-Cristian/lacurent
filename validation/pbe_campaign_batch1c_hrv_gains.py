from __future__ import annotations

import json
import math
import os
import statistics
from copy import deepcopy
from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient
from pybuildingenergy.source import utils as pbe_utils

import validation.pbe_vertical_compare as base
from validation.pbe_campaign_batch1 import LOCATIONS, band, fmt
from validation.pbe_campaign_batch1b_climate_normalized import (
    _patched_get_tmy_data_pvgis,
    register_mc001_monthly_temperatures,
)
from commercial.app.engine import calculate
from commercial.app.main import app, build_input_from_form

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results-1c"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Focus on the two largest Batch 1b HRV residuals plus Cluj as a control.
LOCATION_NAMES = {"București", "Brașov", "Cluj-Napoca"}
RECOVERIES = [0.0, 0.50, 0.80, 0.90]
GAIN_MODES = ["normal", "no_internal", "no_solar", "no_gains"]

RENOVATED = {
    "wall_u": 0.25,
    "roof_u": 0.15,
    "floor_u": 0.20,
    "window_u": 1.11,
    "door_u": 1.30,
}


def _copy_model(model, update: dict):
    if hasattr(model, "model_copy"):
        return model.model_copy(deep=True, update=update)
    return model.copy(deep=True, update=update)


def _diagnostic_building(building, gain_mode: str):
    updates = {}
    if gain_mode in {"no_internal", "no_gains"}:
        updates["internal_gains_w_m2"] = 0.0
    if gain_mode in {"no_solar", "no_gains"}:
        solar = _copy_model(building.solar, {"mode": "explicit"})
        updates["solar"] = solar
        updates["solar_gains_kwh_m2_month"] = 0.0
    return _copy_model(building, updates) if updates else building


def _zero_pbe_internal_gains(bui: dict) -> None:
    for key in ("internal_gains",):
        for gain in bui.get(key, []):
            gain["full_load"] = 0.0
    params = bui.get("building_parameters", {})
    for gain in params.get("internal_gains", []):
        gain["full_load"] = 0.0


def _zero_pbe_transmitted_solar(bui: dict) -> None:
    for surface in bui.get("building_surface", []):
        if surface.get("surface_type") == "transparent" or surface.get("typology") == "transparent":
            surface["g_value"] = 0.0
        elif "g_value" in surface and float(surface.get("g_value") or 0.0) > 0:
            surface["g_value"] = 0.0


def _light_monthly(light) -> dict[str, float]:
    return {str(m.month): float(m.useful_heating_kwh) for m in light.monthly}


def _pbe_monthly(hourly: pd.DataFrame) -> dict[str, float]:
    q_h = pd.to_numeric(hourly["Q_H"], errors="coerce").fillna(0.0).clip(lower=0.0) / 1000.0
    grouped = q_h.groupby(q_h.index.month).sum()
    return {str(int(month)): float(value) for month, value in grouped.items()}


def _delta(light_kwh: float, pbe_kwh: float) -> float:
    return base.rel_diff(light_kwh, pbe_kwh)


def main() -> None:
    client = TestClient(app)
    rows = []
    original = pbe_utils.ISO52010.get_tmy_data_pvgis
    pbe_utils.ISO52010.get_tmy_data_pvgis = classmethod(_patched_get_tmy_data_pvgis)

    try:
        for loc in [x for x in LOCATIONS if x["name"] in LOCATION_NAMES]:
            for recovery in RECOVERIES:
                form = base.ui_form(
                    name=f"1c {loc['name']} HRV {int(recovery*100)}",
                    wall_u=RENOVATED["wall_u"],
                    roof_u=RENOVATED["roof_u"],
                    floor_u=RENOVATED["floor_u"],
                    window_u=RENOVATED["window_u"],
                    door_u=RENOVATED["door_u"],
                    recovery=recovery,
                    heating="gas",
                )
                form["locality_id"] = loc["siruta"]
                form["locality"] = loc["name"]
                form["project_name"] = f"HRV sensitivity {loc['name']} {int(recovery*100)}"

                response = client.post("/api/home-lab-next/calculate", data=form)
                if response.status_code != 200:
                    raise RuntimeError(f"{loc['name']} HRV {recovery}: endpoint {response.status_code}: {response.text[:400]}")

                raw_building = build_input_from_form(form)

                # Register the exact MC001 monthly dry-bulb targets once per location.
                baseline_light = calculate(raw_building)
                register_mc001_monthly_temperatures(baseline_light, loc["lat"], loc["lon"])

                for gain_mode in GAIN_MODES:
                    building = _diagnostic_building(raw_building, gain_mode)
                    light = calculate(building)

                    base.CLJ_LAT = float(loc["lat"])
                    base.CLJ_LON = float(loc["lon"])
                    bui = base.pbe_bui(light, building)

                    if gain_mode in {"no_internal", "no_gains"}:
                        _zero_pbe_internal_gains(bui)
                    if gain_mode in {"no_solar", "no_gains"}:
                        _zero_pbe_transmitted_solar(bui)

                    hourly, pbe = base.pbe_iso_run(bui)

                    light_useful = float(light.annual_heating_demand_kwh)
                    pbe_useful = float(pbe["heating_useful_kwh"])
                    d = _delta(light_useful, pbe_useful)

                    light_internal = sum(float(m.internal_gains_kwh) for m in light.monthly)
                    light_solar = sum(float(m.solar_gains_kwh) for m in light.monthly)
                    light_loss = sum(float(m.heat_loss_kwh) for m in light.monthly)

                    rows.append({
                        "case_id": f"{loc['zone']}-{int(recovery*100):02d}-{gain_mode}",
                        "zone": loc["zone"],
                        "location": loc["name"],
                        "recovery": recovery,
                        "gain_mode": gain_mode,
                        "h_tr_w_k": float(light.h_tr_w_k),
                        "h_ve_w_k": float(light.h_ve_w_k),
                        "lacurent": {
                            "useful_kwh": light_useful,
                            "heat_loss_kwh": light_loss,
                            "internal_gains_kwh": light_internal,
                            "solar_gains_kwh": light_solar,
                            "monthly_useful_kwh": _light_monthly(light),
                        },
                        "pbe": {
                            "useful_kwh": pbe_useful,
                            "transmission_loss_kwh": float(pbe["transmission_loss_kwh"]),
                            "ventilation_loss_kwh": float(pbe["ventilation_loss_kwh"]),
                            "internal_gains_kwh": float(pbe["internal_gains_kwh"]),
                            "solar_gains_kwh": float(pbe["solar_gains_kwh"]),
                            "storage_net_kwh": float(pbe["storage_net_kwh"]),
                            "hours_with_heating": int(pbe["hours_with_heating"]),
                            "monthly_useful_kwh": _pbe_monthly(hourly),
                        },
                        "difference": {
                            "useful_pct": d,
                            "acceptance_band": band(d),
                        },
                    })
    finally:
        pbe_utils.ISO52010.get_tmy_data_pvgis = original

    # HRV effect relative to 0% recovery, separately by location and gain mode.
    for row in rows:
        base_row = next(
            r for r in rows
            if r["location"] == row["location"]
            and r["gain_mode"] == row["gain_mode"]
            and abs(float(r["recovery"])) < 1e-12
        )
        row["hrv_effect"] = {
            "lacurent_pct": 100.0 * (row["lacurent"]["useful_kwh"] - base_row["lacurent"]["useful_kwh"]) / base_row["lacurent"]["useful_kwh"],
            "pbe_pct": 100.0 * (row["pbe"]["useful_kwh"] - base_row["pbe"]["useful_kwh"]) / base_row["pbe"]["useful_kwh"],
        }
        row["hrv_effect"]["difference_pp"] = row["pbe"]["useful_kwh"] and (
            row["hrv_effect"]["pbe_pct"] - row["hrv_effect"]["lacurent_pct"]
        )

    normal_rows = [r for r in rows if r["gain_mode"] == "normal"]
    abs_normal = [abs(float(r["difference"]["useful_pct"])) for r in normal_rows]

    payload = {
        "meta": {
            "campaign": "batch-1c HRV/gains residual isolation",
            "lacurent_source_sha": "e8d5c00e01f68acb72f66e255168710caeb18e47",
            "analysis_branch": "analysis/pbe-vertical-validation-20260920",
            "production_touched": False,
            "pbe_commit": base.PBE_COMMIT,
            "weather": "PVGIS hourly profile with each monthly dry-bulb mean shifted to the exact MC001 monthly mean used by LaCurent (Batch 1b diagnostic weather).",
            "purpose": "Separate low-Hve/HRV residuals from internal-gain and transmitted-window-solar effects. Hve is passed exactly from LaCurent into PBE.",
            "guardrail": "No-gain cases are diagnostic method-isolation experiments, not normative building calculations. PBE opaque-surface solar response remains part of its hourly heat-transfer model even when transmitted window solar is disabled.",
        },
        "aggregate_normal": {
            "cases": len(normal_rows),
            "median_abs_useful_delta_pct": statistics.median(abs_normal),
            "max_abs_useful_delta_pct": max(abs_normal),
        },
        "cases": rows,
    }

    (OUT_DIR / "batch1c-results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    report = [
        "# LaCurent validation campaign — Batch 1c HRV / gains residual isolation",
        "",
        "- Production touched: **no**",
        "- Same renovated envelope in all cases.",
        "- Locations: București, Cluj-Napoca, Brașov.",
        "- HRV recovery: 0%, 50%, 80%, 90%.",
        "- Gain modes: normal, no internal gains, no transmitted-window solar, no internal + no transmitted-window solar.",
        "- PBE receives LaCurent's exact Hve in every case.",
        "- Weather uses Batch 1b monthly-temperature normalization.",
        "",
        "## Normal-gain HRV sweep",
        "",
        "| Location | HRV | Hve W/K | Light kWh | PBE kWh | Δ | Light HRV effect | PBE HRV effect | effect Δ pp |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in normal_rows:
        report.append(
            f"| {r['location']} | {100*r['recovery']:.0f}% | {fmt(r['h_ve_w_k'])} | "
            f"{fmt(r['lacurent']['useful_kwh'])} | {fmt(r['pbe']['useful_kwh'])} | "
            f"{fmt(r['difference']['useful_pct'])}% | {fmt(r['hrv_effect']['lacurent_pct'])}% | "
            f"{fmt(r['hrv_effect']['pbe_pct'])}% | {fmt(r['hrv_effect']['difference_pp'])} pp |"
        )

    report += [
        "",
        "## Gain isolation at HRV 80%",
        "",
        "| Location | Gain mode | Light kWh | PBE kWh | Δ | Light internal | PBE internal | Light solar | PBE solar |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in [x for x in rows if abs(float(x["recovery"]) - 0.8) < 1e-12]:
        report.append(
            f"| {r['location']} | {r['gain_mode']} | {fmt(r['lacurent']['useful_kwh'])} | "
            f"{fmt(r['pbe']['useful_kwh'])} | {fmt(r['difference']['useful_pct'])}% | "
            f"{fmt(r['lacurent']['internal_gains_kwh'])} | {fmt(r['pbe']['internal_gains_kwh'])} | "
            f"{fmt(r['lacurent']['solar_gains_kwh'])} | {fmt(r['pbe']['solar_gains_kwh'])} |"
        )

    report += [
        "",
        "## Monthly normal-gain residuals at HRV 80%",
        "",
        "The JSON artifact contains monthly useful-heating series for both engines. Shoulder-month concentration is evidence for monthly gain-utilization / hourly-dynamics effects rather than an Hve arithmetic defect.",
        "",
        "## Interpretation rules",
        "",
        "- If the residual grows monotonically as Hve falls while Hve is identical by construction, HRV arithmetic is not the cause.",
        "- If removing internal gains collapses the residual, internal-gain utilization / hourly scheduling is a major cause.",
        "- If removing transmitted-window solar collapses the residual, solar timing/utilization is a major cause.",
        "- If no-gain cases still diverge materially, investigate hourly temperature shape, opaque-surface solar response, thermal storage and floor/ground treatment next.",
        "",
    ]
    (OUT_DIR / "batch1c-report.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
