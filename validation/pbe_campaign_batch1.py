from __future__ import annotations

import json
import math
import os
import statistics
from pathlib import Path

from fastapi.testclient import TestClient

import validation.pbe_vertical_compare as base
from commercial.app.engine import calculate
from commercial.app.main import app, build_input_from_form

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-campaign-results"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

LOCATIONS = [
    {"zone": "I", "name": "București", "siruta": "siruta-179141", "lat": 44.4268, "lon": 26.1025},
    {"zone": "II", "name": "Constanța", "siruta": "siruta-60428", "lat": 44.1598, "lon": 28.6348},
    {"zone": "III", "name": "Cluj-Napoca", "siruta": "siruta-54984", "lat": 46.7712, "lon": 23.6236},
    {"zone": "IV", "name": "Brașov", "siruta": "siruta-40205", "lat": 45.6579, "lon": 25.6012},
    {"zone": "V", "name": "Miercurea Ciuc", "siruta": "siruta-83339", "lat": 46.36, "lon": 25.8060},
]

STATES = [
    {
        "id": "E",
        "label": "Existent · gaz",
        "wall_u": 0.50, "roof_u": 0.30, "floor_u": 0.45, "window_u": 1.60, "door_u": 1.80,
        "recovery": 0.0, "heating": "gas",
    },
    {
        "id": "R",
        "label": "Anvelopă renovată · gaz",
        "wall_u": 0.25, "roof_u": 0.15, "floor_u": 0.20, "window_u": 1.11, "door_u": 1.30,
        "recovery": 0.0, "heating": "gas",
    },
    {
        "id": "H",
        "label": "Anvelopă + HRV 80% · gaz",
        "wall_u": 0.25, "roof_u": 0.15, "floor_u": 0.20, "window_u": 1.11, "door_u": 1.30,
        "recovery": 0.80, "heating": "gas",
    },
    {
        "id": "HP",
        "label": "Anvelopă + HRV 80% · pompă de căldură",
        "wall_u": 0.25, "roof_u": 0.15, "floor_u": 0.20, "window_u": 1.11, "door_u": 1.30,
        "recovery": 0.80, "heating": "hp",
    },
]


def band(delta_pct: float) -> str:
    a = abs(delta_pct)
    if a <= 15.0:
        return "PASS"
    if a <= 25.0:
        return "REVIEW"
    return "INVESTIGATE"


def fmt(v: float | None, digits: int = 1) -> str:
    if v is None or not math.isfinite(float(v)):
        return "—"
    return f"{float(v):,.{digits}f}".replace(",", " ")


def pct_change(before: float, after: float) -> float:
    return 100.0 * (after - before) / abs(before) if abs(before) > 1e-12 else 0.0


def light_climate_diag(light) -> dict:
    months = list(light.monthly)
    days = sum(int(m.days) for m in months) or 365
    t_mean = sum(float(m.outdoor_temperature_c) * int(m.days) for m in months) / days
    degree_hours = sum(max(20.0 - float(m.outdoor_temperature_c), 0.0) * int(m.days) * 24.0 for m in months)
    return {"outdoor_mean_c": t_mean, "degree_hours_20c": degree_hours}


def main() -> None:
    client = TestClient(app)
    rows: list[dict] = []
    demand_cache: dict[str, tuple] = {}

    for loc in LOCATIONS:
        for state in STATES:
            form = base.ui_form(
                name=f"{loc['zone']}-{state['id']} {loc['name']}",
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
            form["project_name"] = f"Campaign {loc['zone']}-{state['id']} {loc['name']}"

            response = client.post("/api/home-lab-next/calculate", data=form)
            if response.status_code != 200:
                raise RuntimeError(f"{loc['name']} {state['id']} endpoint failed: {response.status_code} {response.text[:400]}")

            building = build_input_from_form(form)
            light = calculate(building)
            climate_light = light_climate_diag(light)

            demand_key = json.dumps({
                "location": loc["name"],
                "envelope": [(x.type.value, x.area_m2, x.u_value_w_m2k) for x in building.envelope],
                "hve": float(light.h_ve_w_k),
                "solar_glazing": building.solar.glazing_type_id,
            }, sort_keys=True)

            if demand_key not in demand_cache:
                base.CLJ_LAT = float(loc["lat"])
                base.CLJ_LON = float(loc["lon"])
                bui = base.pbe_bui(light, building)
                demand_cache[demand_key] = base.pbe_iso_run(bui)

            hourly, pbe_demand = demand_cache[demand_key]
            pbe_system = base.pbe_generator_run(light, hourly, state["heating"])

            light_useful = float(light.annual_heating_demand_kwh)
            pbe_useful = float(pbe_demand["heating_useful_kwh"])
            light_final = float(light.heating_system.main_carrier_final_kwh)
            pbe_final = float(pbe_system["aligned_chain_final_kwh"])
            d_useful = base.rel_diff(light_useful, pbe_useful)
            d_final = base.rel_diff(light_final, pbe_final)

            rows.append({
                "case_id": f"{loc['zone']}-{state['id']}",
                "zone": loc["zone"],
                "location": loc["name"],
                "state": state["id"],
                "state_label": state["label"],
                "endpoint_status": response.status_code,
                "inputs": {
                    "wall_u": state["wall_u"], "roof_u": state["roof_u"], "floor_u": state["floor_u"],
                    "window_u": state["window_u"], "door_u": state["door_u"],
                    "heat_recovery": state["recovery"], "heating": state["heating"],
                },
                "lacurent": {
                    "h_tr_w_k": float(light.h_tr_w_k),
                    "h_ve_w_k": float(light.h_ve_w_k),
                    "outdoor_mean_c": climate_light["outdoor_mean_c"],
                    "degree_hours_20c": climate_light["degree_hours_20c"],
                    "heating_useful_kwh": light_useful,
                    "heating_main_final_kwh": light_final,
                },
                "pbe": {
                    "outdoor_mean_c": float(pbe_demand["outdoor_mean_c"]),
                    "degree_hours_20c": float(pbe_demand["degree_hours_20c"]),
                    "heating_useful_kwh": pbe_useful,
                    "heating_main_final_aligned_kwh": pbe_final,
                },
                "difference": {
                    "useful_pct": d_useful,
                    "main_final_aligned_pct": d_final,
                    "acceptance_band": band(d_useful),
                },
            })

    unique_demand_rows = [r for r in rows if r["state"] != "HP"]
    abs_deltas = [abs(float(r["difference"]["useful_pct"])) for r in unique_demand_rows]
    abs_sorted = sorted(abs_deltas)
    p90_index = max(0, math.ceil(0.90 * len(abs_sorted)) - 1)

    by_zone = {}
    for loc in LOCATIONS:
        zr = [r for r in unique_demand_rows if r["zone"] == loc["zone"]]
        vals = [abs(float(r["difference"]["useful_pct"])) for r in zr]
        by_zone[loc["zone"]] = {
            "location": loc["name"],
            "mean_abs_delta_pct": sum(vals) / len(vals),
            "max_abs_delta_pct": max(vals),
            "pass_count": sum(r["difference"]["acceptance_band"] == "PASS" for r in zr),
            "review_count": sum(r["difference"]["acceptance_band"] == "REVIEW" for r in zr),
            "investigate_count": sum(r["difference"]["acceptance_band"] == "INVESTIGATE" for r in zr),
        }

    effects = []
    for loc in LOCATIONS:
        zr = {r["state"]: r for r in rows if r["zone"] == loc["zone"]}
        for before, after, label, metric in [
            ("E", "R", "Renovare anvelopă", "useful"),
            ("R", "H", "Adăugare HRV 80%", "useful"),
            ("H", "HP", "Gaz → pompă de căldură", "final"),
        ]:
            if metric == "useful":
                l_before, l_after = zr[before]["lacurent"]["heating_useful_kwh"], zr[after]["lacurent"]["heating_useful_kwh"]
                p_before, p_after = zr[before]["pbe"]["heating_useful_kwh"], zr[after]["pbe"]["heating_useful_kwh"]
            else:
                l_before, l_after = zr[before]["lacurent"]["heating_main_final_kwh"], zr[after]["lacurent"]["heating_main_final_kwh"]
                p_before, p_after = zr[before]["pbe"]["heating_main_final_aligned_kwh"], zr[after]["pbe"]["heating_main_final_aligned_kwh"]
            effects.append({
                "zone": loc["zone"], "location": loc["name"], "step": label, "metric": metric,
                "lacurent_change_pct": pct_change(l_before, l_after),
                "pbe_change_pct": pct_change(p_before, p_after),
            })

    payload = {
        "meta": {
            "campaign": "batch-1 climate-envelope-system",
            "lacurent_source_sha": "e8d5c00e01f68acb72f66e255168710caeb18e47",
            "analysis_branch": "analysis/pbe-vertical-validation-20260920",
            "production_touched": False,
            "pbe_commit": base.PBE_COMMIT,
            "acceptance_bands": {"PASS": "<=15% abs", "REVIEW": ">15% and <=25% abs", "INVESTIGATE": ">25% abs"},
            "note": "Acceptance bands are internal engineering criteria, not normative tolerances.",
        },
        "aggregate": {
            "independent_demand_cases": len(unique_demand_rows),
            "total_rows_including_system_switch": len(rows),
            "median_abs_useful_delta_pct": statistics.median(abs_deltas),
            "p90_abs_useful_delta_pct": abs_sorted[p90_index],
            "max_abs_useful_delta_pct": max(abs_deltas),
            "pass_count": sum(r["difference"]["acceptance_band"] == "PASS" for r in unique_demand_rows),
            "review_count": sum(r["difference"]["acceptance_band"] == "REVIEW" for r in unique_demand_rows),
            "investigate_count": sum(r["difference"]["acceptance_band"] == "INVESTIGATE" for r in unique_demand_rows),
            "by_zone": by_zone,
        },
        "cases": rows,
        "intervention_effects": effects,
    }
    (OUT_DIR / "batch1-results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    report = [
        "# LaCurent validation campaign — Batch 1",
        "",
        "Scope: same 160 m² reference house across Romanian climate zones I–V; existing, renovated, renovated+HRV, and renovated+HRV+heat-pump states.",
        "",
        f"- LaCurent source SHA: `{payload['meta']['lacurent_source_sha']}`",
        f"- PBE commit: `{base.PBE_COMMIT}`",
        "- Production touched: **no**",
        "- Direct comparison: annual useful space-heating demand.",
        "- Aligned comparison: main heating final energy, with LaCurent upstream system efficiencies held constant.",
        "- Acceptance bands are internal engineering criteria, not MC001/ISO pass-fail limits.",
        "",
        "## Aggregate",
        "",
        f"- Independent demand cases: **{payload['aggregate']['independent_demand_cases']}**",
        f"- Median absolute useful-demand delta: **{fmt(payload['aggregate']['median_abs_useful_delta_pct'])}%**",
        f"- P90 absolute useful-demand delta: **{fmt(payload['aggregate']['p90_abs_useful_delta_pct'])}%**",
        f"- Maximum absolute useful-demand delta: **{fmt(payload['aggregate']['max_abs_useful_delta_pct'])}%**",
        f"- PASS / REVIEW / INVESTIGATE: **{payload['aggregate']['pass_count']} / {payload['aggregate']['review_count']} / {payload['aggregate']['investigate_count']}**",
        "",
        "## Case matrix",
        "",
        "| Case | Location | State | Light useful kWh | PBE useful kWh | Δ | Band | Light final kWh | PBE aligned final kWh |",
        "|---|---|---|---:|---:|---:|---|---:|---:|",
    ]
    for r in rows:
        report.append(
            f"| {r['case_id']} | {r['location']} | {r['state_label']} | "
            f"{fmt(r['lacurent']['heating_useful_kwh'])} | {fmt(r['pbe']['heating_useful_kwh'])} | "
            f"{fmt(r['difference']['useful_pct'])}% | {r['difference']['acceptance_band']} | "
            f"{fmt(r['lacurent']['heating_main_final_kwh'])} | {fmt(r['pbe']['heating_main_final_aligned_kwh'])} |"
        )

    report += [
        "",
        "## Climate diagnostics",
        "",
        "| Case | Light mean T | PBE mean T | Light degree-hours | PBE degree-hours |",
        "|---|---:|---:|---:|---:|",
    ]
    for r in unique_demand_rows:
        report.append(
            f"| {r['case_id']} | {fmt(r['lacurent']['outdoor_mean_c'],2)} °C | {fmt(r['pbe']['outdoor_mean_c'],2)} °C | "
            f"{fmt(r['lacurent']['degree_hours_20c'])} Kh | {fmt(r['pbe']['degree_hours_20c'])} Kh |"
        )

    report += [
        "",
        "## Intervention-effect comparison",
        "",
        "| Zone | Location | Step | Light change | PBE change |",
        "|---|---|---|---:|---:|",
    ]
    for e in effects:
        report.append(
            f"| {e['zone']} | {e['location']} | {e['step']} | {fmt(e['lacurent_change_pct'])}% | {fmt(e['pbe_change_pct'])}% |"
        )

    report += [
        "",
        "## Interpretation",
        "",
        "- A PASS means the annual useful-demand difference is within ±15% for this cross-method comparison.",
        "- REVIEW and INVESTIGATE do not automatically mean LaCurent is wrong; the methods use different weather series and monthly vs hourly balance formulations.",
        "- Repeated sign and magnitude by climate/state are more important than any single case because they reveal systematic bias.",
        "- Heat-pump rows duplicate the same building-demand state as HRV rows; they are included to validate the downstream system transformation, but are excluded from aggregate demand statistics.",
        "",
    ]
    (OUT_DIR / "batch1-report.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
