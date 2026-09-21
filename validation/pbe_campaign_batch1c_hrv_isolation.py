from __future__ import annotations

import json
import os
from copy import deepcopy
from pathlib import Path

import pandas as pd
from pybuildingenergy.source import utils as pbe_utils

import validation.pbe_vertical_compare as base
import validation.pbe_campaign_batch1b_climate_normalized as climate_norm
from validation.pbe_campaign_batch1 import LOCATIONS
from commercial.app.engine import calculate
from commercial.app.main import build_input_from_form

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results-1c"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Focus on the warm-climate outlier, the reference case, and the cold-climate outlier.
LOCATION_NAMES = {"București", "Cluj-Napoca", "Brașov"}
TEST_LOCATIONS = [loc for loc in LOCATIONS if loc["name"] in LOCATION_NAMES]

RECOVERY_LEVELS = [0.0, 0.50, 0.80, 0.90]

VARIANTS = {
    "baseline": {
        "label": "Normative solar + 2.4 W/m² internal gains",
        "zero_internal": False,
        "zero_solar": False,
        "neutral_floor": False,
    },
    "no_internal": {
        "label": "Solar retained, internal gains = 0",
        "zero_internal": True,
        "zero_solar": False,
        "neutral_floor": False,
    },
    "no_solar": {
        "label": "Internal gains retained, solar gains = 0",
        "zero_internal": False,
        "zero_solar": True,
        "neutral_floor": False,
    },
    "no_gains": {
        "label": "Internal gains = 0 and solar gains = 0",
        "zero_internal": True,
        "zero_solar": True,
        "neutral_floor": False,
    },
    "neutral_floor": {
        "label": "Baseline gains, floor transmission approximately removed",
        "zero_internal": False,
        "zero_solar": False,
        "neutral_floor": True,
    },
}


def fmt(value: float | None, digits: int = 1) -> str:
    if value is None:
        return "—"
    return f"{float(value):.{digits}f}"


def apply_variant(building, variant: dict):
    b = deepcopy(building)
    if variant["zero_internal"]:
        b.internal_gains_w_m2 = 0.0
    if variant["zero_solar"]:
        # Diagnostic-only path: explicit zero solar gain in Light.
        b.solar.mode = "explicit"
        b.solar_gains_kwh_m2_month = 0.0
    if variant["neutral_floor"]:
        for item in b.envelope:
            if item.type.value == "floor":
                # Pydantic requires U > 0. This is effectively zero for annual transmission.
                item.u_value_w_m2k = 1e-6
    return b


def override_pbe_variant(bui: dict, variant: dict) -> None:
    if variant["zero_internal"]:
        zeros = [0.0] * 24
        internal = [
            {"name": "occupants", "full_load": 0.0, "weekday": zeros, "weekend": zeros},
            {"name": "appliances", "full_load": 0.0, "weekday": zeros, "weekend": zeros},
            {"name": "lighting", "full_load": 0.0, "weekday": zeros, "weekend": zeros},
        ]
        bui["internal_gains"] = deepcopy(internal)
        bui["building_parameters"]["internal_gains"] = deepcopy(internal)

    if variant["zero_solar"]:
        for surface in bui["building_surface"]:
            if surface.get("type") == "transparent":
                surface["g_value"] = 0.0


def light_balance(light) -> dict:
    return {
        "heating_useful_kwh": float(light.annual_heating_demand_kwh),
        "h_tr_w_k": float(light.h_tr_w_k),
        "h_ve_w_k": float(light.h_ve_w_k),
        "internal_gains_kwh": sum(float(m.internal_gains_kwh) for m in light.monthly),
        "solar_gains_kwh": sum(float(m.solar_gains_kwh) for m in light.monthly),
        "heat_loss_kwh": sum(float(m.heat_loss_kwh) for m in light.monthly),
        "monthly_heating_kwh": {
            str(i): float(m.useful_heating_kwh) for i, m in enumerate(light.monthly, start=1)
        },
    }


def pbe_monthly_heating(hourly: pd.DataFrame) -> dict[str, float]:
    q_h = pd.to_numeric(hourly["Q_H"], errors="coerce").fillna(0.0).clip(lower=0.0) / 1000.0
    if not hasattr(hourly.index, "month"):
        return {}
    grouped = q_h.groupby(hourly.index.month).sum()
    return {str(int(month)): float(value) for month, value in grouped.items()}


def run_case(loc: dict, recovery: float, variant_id: str) -> dict:
    variant = VARIANTS[variant_id]
    form = base.ui_form(
        name=f"1c {loc['zone']} HRV{int(recovery * 100)} {variant_id}",
        wall_u=0.25,
        roof_u=0.15,
        floor_u=0.20,
        window_u=1.11,
        door_u=1.30,
        recovery=recovery,
        heating="gas",
    )
    form["locality_id"] = loc["siruta"]
    form["locality"] = loc["name"]

    building = build_input_from_form(form)
    building = apply_variant(building, variant)
    light = calculate(building)
    climate_norm.register_mc001_monthly_temperatures(light, loc["lat"], loc["lon"])

    base.CLJ_LAT = float(loc["lat"])
    base.CLJ_LON = float(loc["lon"])
    bui = base.pbe_bui(light, building)
    override_pbe_variant(bui, variant)

    pbe_hve = float(
        bui["building_parameters"]["ventilation"]["custom_heat_transfer_coefficient_ventilation"]
    )
    hourly, pbe = base.pbe_iso_run(bui)
    pbe_useful = float(pbe["heating_useful_kwh"])
    light_useful = float(light.annual_heating_demand_kwh)

    return {
        "case_id": f"{loc['zone']}-R{int(recovery * 100):02d}-{variant_id}",
        "zone": loc["zone"],
        "location": loc["name"],
        "recovery": recovery,
        "variant": variant_id,
        "variant_label": variant["label"],
        "light": light_balance(light),
        "pbe": {
            **pbe,
            "h_ve_input_w_k": pbe_hve,
            "monthly_heating_kwh": pbe_monthly_heating(hourly),
        },
        "difference": {
            "useful_pct": base.rel_diff(light_useful, pbe_useful),
            "h_ve_w_k": pbe_hve - float(light.h_ve_w_k),
        },
    }


def monthly_residuals(row: dict) -> list[dict]:
    out = []
    lm = row["light"]["monthly_heating_kwh"]
    pm = row["pbe"]["monthly_heating_kwh"]
    for month in sorted(set(lm) | set(pm), key=int):
        light = float(lm.get(month, 0.0))
        pbe = float(pm.get(month, 0.0))
        out.append(
            {
                "month": int(month),
                "light_kwh": light,
                "pbe_kwh": pbe,
                "delta_kwh": pbe - light,
                "abs_delta_kwh": abs(pbe - light),
            }
        )
    return out


def main() -> None:
    rows = []

    # Diagnostic climate isolation only; production/runtime code is untouched.
    pbe_utils.ISO52010.get_tmy_data_pvgis = classmethod(climate_norm._patched_get_tmy_data_pvgis)
    try:
        # HRV sensitivity with normal gains.
        for loc in TEST_LOCATIONS:
            for recovery in RECOVERY_LEVELS:
                rows.append(run_case(loc, recovery, "baseline"))

        # Residual-cause isolation at the problematic high-efficiency HRV point.
        for loc in TEST_LOCATIONS:
            for variant_id in ["no_internal", "no_solar", "no_gains", "neutral_floor"]:
                rows.append(run_case(loc, 0.80, variant_id))
    finally:
        pbe_utils.ISO52010.get_tmy_data_pvgis = climate_norm._ORIGINAL_GET_PVGIS

    # HRV benefit relative to no recovery for each location.
    hrv_effects = []
    for loc in TEST_LOCATIONS:
        lr = [r for r in rows if r["location"] == loc["name"] and r["variant"] == "baseline"]
        by_recovery = {float(r["recovery"]): r for r in lr}
        zero = by_recovery[0.0]
        for recovery in RECOVERY_LEVELS[1:]:
            cur = by_recovery[recovery]
            light_effect = 100.0 * (
                cur["light"]["heating_useful_kwh"] - zero["light"]["heating_useful_kwh"]
            ) / zero["light"]["heating_useful_kwh"]
            pbe_effect = 100.0 * (
                cur["pbe"]["heating_useful_kwh"] - zero["pbe"]["heating_useful_kwh"]
            ) / zero["pbe"]["heating_useful_kwh"]
            hrv_effects.append(
                {
                    "location": loc["name"],
                    "zone": loc["zone"],
                    "recovery": recovery,
                    "light_effect_pct": light_effect,
                    "pbe_effect_pct": pbe_effect,
                    "effect_gap_percentage_points": pbe_effect - light_effect,
                }
            )

    # How much each controlled simplification changes the Light-vs-PBE residual at HRV 80%.
    isolation = []
    for loc in TEST_LOCATIONS:
        loc_rows = [
            r for r in rows
            if r["location"] == loc["name"] and abs(float(r["recovery"]) - 0.80) < 1e-12
        ]
        by_variant = {r["variant"]: r for r in loc_rows}
        base_delta = float(by_variant["baseline"]["difference"]["useful_pct"])
        for variant_id in ["no_internal", "no_solar", "no_gains", "neutral_floor"]:
            r = by_variant[variant_id]
            delta = float(r["difference"]["useful_pct"])
            isolation.append(
                {
                    "location": loc["name"],
                    "zone": loc["zone"],
                    "variant": variant_id,
                    "baseline_delta_pct": base_delta,
                    "variant_delta_pct": delta,
                    "residual_change_percentage_points": delta - base_delta,
                }
            )

    # Shoulder-month localization for the baseline HRV80 cases.
    monthly = {}
    for row in rows:
        if row["variant"] == "baseline" and abs(float(row["recovery"]) - 0.80) < 1e-12:
            residuals = monthly_residuals(row)
            monthly[row["location"]] = {
                "months": residuals,
                "largest_absolute_residual_months": sorted(
                    residuals, key=lambda x: x["abs_delta_kwh"], reverse=True
                )[:4],
            }

    payload = {
        "meta": {
            "campaign": "batch-1c HRV residual isolation",
            "lacurent_source_sha": "e8d5c00e01f68acb72f66e255168710caeb18e47",
            "analysis_branch": "analysis/pbe-vertical-validation-20260920",
            "production_touched": False,
            "pbe_commit": base.PBE_COMMIT,
            "climate": (
                "PVGIS hourly weather with each monthly dry-bulb mean additively shifted "
                "to the exact MC001 monthly mean used by LaCurent."
            ),
            "scope": (
                "Renovated envelope; Bucuresti, Cluj-Napoca and Brasov; HRV sensitivity "
                "0/50/80/90%; controlled internal-gain, solar-gain and floor-transmission diagnostics."
            ),
            "warning": (
                "Zero-gain and near-zero-floor variants are diagnostic boundary tests, not user-facing "
                "building scenarios and not normative certification calculations."
            ),
        },
        "rows": rows,
        "hrv_effects": hrv_effects,
        "isolation": isolation,
        "monthly_residuals_hrv80": monthly,
    }

    (OUT_DIR / "batch1c-results.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    report = [
        "# LaCurent validation campaign — Batch 1c HRV residual isolation",
        "",
        "Production touched: no.",
        "",
        "## HRV sensitivity",
        "",
        "| Location | Recovery | Light useful kWh | PBE useful kWh | PBE vs Light | Light HRV effect | PBE HRV effect | Effect gap |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for loc in TEST_LOCATIONS:
        loc_rows = [
            r for r in rows if r["location"] == loc["name"] and r["variant"] == "baseline"
        ]
        effect_map = {
            (e["location"], float(e["recovery"])): e for e in hrv_effects
        }
        for r in sorted(loc_rows, key=lambda x: float(x["recovery"])):
            rec = float(r["recovery"])
            e = effect_map.get((loc["name"], rec))
            report.append(
                f"| {loc['name']} | {rec * 100:.0f}% | "
                f"{fmt(r['light']['heating_useful_kwh'])} | "
                f"{fmt(r['pbe']['heating_useful_kwh'])} | "
                f"{fmt(r['difference']['useful_pct'])}% | "
                f"{fmt(e['light_effect_pct']) + '%' if e else '—'} | "
                f"{fmt(e['pbe_effect_pct']) + '%' if e else '—'} | "
                f"{fmt(e['effect_gap_percentage_points']) + ' pp' if e else '—'} |"
            )

    report += [
        "",
        "## Controlled residual isolation at HRV 80%",
        "",
        "| Location | Diagnostic variant | Baseline delta | Variant delta | Residual change |",
        "|---|---|---:|---:|---:|",
    ]
    for item in isolation:
        report.append(
            f"| {item['location']} | {VARIANTS[item['variant']]['label']} | "
            f"{fmt(item['baseline_delta_pct'])}% | {fmt(item['variant_delta_pct'])}% | "
            f"{fmt(item['residual_change_percentage_points'])} pp |"
        )

    report += [
        "",
        "## Energy-balance diagnostics at HRV 80%",
        "",
        "| Location | Variant | Htr Light W/K | Hve Light W/K | Hve PBE input W/K | Light internal | PBE internal | Light solar | PBE solar | Light useful | PBE useful |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for row in rows:
        if abs(float(row["recovery"]) - 0.80) > 1e-12:
            continue
        report.append(
            f"| {row['location']} | {row['variant']} | "
            f"{fmt(row['light']['h_tr_w_k'])} | {fmt(row['light']['h_ve_w_k'])} | "
            f"{fmt(row['pbe']['h_ve_input_w_k'])} | "
            f"{fmt(row['light']['internal_gains_kwh'])} | {fmt(row['pbe']['internal_gains_kwh'])} | "
            f"{fmt(row['light']['solar_gains_kwh'])} | {fmt(row['pbe']['solar_gains_kwh'])} | "
            f"{fmt(row['light']['heating_useful_kwh'])} | {fmt(row['pbe']['heating_useful_kwh'])} |"
        )

    report += [
        "",
        "## Largest monthly residuals — baseline HRV 80%",
        "",
    ]
    for loc in TEST_LOCATIONS:
        report.append(f"### {loc['name']}")
        report.append("")
        report.append("| Month | Light kWh | PBE kWh | Delta kWh |")
        report.append("|---:|---:|---:|---:|")
        for item in monthly[loc["name"]]["largest_absolute_residual_months"]:
            report.append(
                f"| {item['month']} | {fmt(item['light_kwh'])} | "
                f"{fmt(item['pbe_kwh'])} | {fmt(item['delta_kwh'])} |"
            )
        report.append("")

    report += [
        "## Interpretation rules",
        "",
        "- Hve must match exactly by construction. Any mismatch is an adapter defect.",
        "- If the residual grows monotonically as Hve falls, the remaining disagreement is a low-load/gain-utilization/dynamics effect rather than an HRV heat-transfer arithmetic error.",
        "- If removing internal gains collapses the residual, internal-gain utilization is dominant.",
        "- If removing solar collapses it, solar timing/utilization is dominant.",
        "- If removing both gains collapses it substantially more, the monthly-vs-hourly gain-utilization interaction is dominant.",
        "- If the near-zero-floor test materially changes the residual, floor/ground treatment needs a dedicated follow-up.",
        "- Concentration of annual residual in shoulder months supports a monthly-utilization versus hourly on/off dynamics explanation.",
        "",
    ]

    (OUT_DIR / "batch1c-report.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
