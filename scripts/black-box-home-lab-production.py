from __future__ import annotations

import copy
import json
import math
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


PROD = "https://lacurent.com"
OLD = "http://127.0.0.1:8766"


def post_form(base: str, path: str, form: dict[str, object], timeout: int = 120):
    body = urllib.parse.urlencode({k: str(v) for k, v in form.items()}).encode("utf-8")
    req = urllib.request.Request(
        base + path,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "LaCurent-black-box-diagnostic/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            payload = response.read().decode("utf-8")
            return response.status, json.loads(payload)
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        try:
            decoded = json.loads(payload)
        except Exception:
            decoded = {"raw": payload}
        return exc.code, decoded


def get_json(base: str, path: str, timeout: int = 30):
    req = urllib.request.Request(
        base + path,
        headers={"User-Agent": "LaCurent-black-box-diagnostic/1.0"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


def assert_close(label: str, a: float, b: float, atol: float = 0.01, rtol: float = 1e-8):
    if not math.isclose(float(a), float(b), abs_tol=atol, rel_tol=rtol):
        raise AssertionError(f"{label}: {a} != {b}")


def require(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


def compact(result: dict):
    return {
        "annual_cost_lei": result.get("annual_cost_lei"),
        "final_energy_kwh": result.get("final_energy_kwh"),
        "primary_specific_kwh_m2": result.get("primary_specific_kwh_m2"),
        "co2_specific_kg_m2": result.get("co2_specific_kg_m2"),
        "energy_class": result.get("energy_class"),
        "design_heat_load_kw": result.get("design_heat_load_kw"),
        "final_energy_by_carrier": result.get("final_energy_by_carrier"),
    }


BASE_FORM = {
    "project_name": "Black Box Controlled House",
    "locality_id": "siruta-54984",
    "locality": "Cluj-Napoca",
    "building_type": "residential_individual",
    "building_length_m": "10",
    "building_width_m": "8",
    "heated_levels": "2",
    "average_height_m": "2.7",
    "house_window_area_m2": "20",
    "house_door_area_m2": "2.2",
    "heated_floor_area_m2": "160",
    "heated_volume_m3": "432",
    "indoor_design_temperature_c": "20",
    "construction_year": "2005",
    "insulation_profile": "average",
    "solar_gains_kwh_m2_month": "0",
    "solar_mode": "normative_hsol",
    "solar_orientation": "south",
    "solar_glazing_type_id": "double_low_e_face_3",
    "solar_frame_fraction": "0.20",
    "solar_obstacle_shading_factor": "1.0",
    "solar_sky_view_factor": "0.5",
    "solar_exterior_surface_resistance_m2k_w": "0.04",
    "solar_longwave_radiation_coefficient_w_m2k": "5.0",
    "solar_sky_temperature_difference_k": "11.0",
    "wall_area_m2": "171.8",
    "wall_u_value": "0.55",
    "roof_area_m2": "80",
    "roof_u_value": "0.35",
    "floor_area_m2": "80",
    "floor_u_value": "0.45",
    "window_area_m2": "20",
    "window_u_value": "1.6",
    "door_area_m2": "2.2",
    "door_u_value": "1.8",
    "thermal_bridge_length_m": "72",
    "thermal_bridge_psi_w_mk": "0.08",
    "ventilation_type": "natural",
    "air_changes_per_hour": "0.5",
    "heat_recovery_efficiency": "0",
    "heating_choice": "condensing_gas_boiler",
    "heating_system_type": "condensing_gas_boiler",
    "heating_efficiency": "0.94",
    "heating_scop": "3.2",
    "heating_carrier": "natural_gas",
    "heating_cost_profile": "natural_gas",
    "heating_generator_type": "condensing_gas_boiler",
    "heating_emitter_type": "radiators_high_temp",
    "heating_distribution_type": "hydronic_insulated",
    "heating_storage_type": "none",
    "heating_control_type": "room_thermostat",
    "cooling_seer": "3.5",
    "cooling_setpoint_c": "26",
    "dhw_enabled": "on",
    "dhw_occupants": "4",
    "dhw_litres_per_person_day_at_60c": "50",
    "dhw_system_type": "same_as_heating",
    "dhw_efficiency": "0.86",
    "dhw_carrier": "natural_gas",
    "pv_installed_power_kwp": "5.0",
    "pv_orientation": "south",
    "pv_tilt_degrees": "30",
    "pv_performance_ratio": "0.82",
    "solar_thermal_collector_area_m2": "4.0",
    "solar_thermal_orientation": "south",
    "solar_thermal_tilt_degrees": "45",
    "solar_thermal_system_efficiency": "0.45",
    # Lock this black-box case to explicit technical values rather than UI profiles.
    "expert_geometry_override": "on",
    "expert_envelope_override": "on",
    "expert_ventilation_override": "on",
    "expert_heating_override": "on",
}


def calc(base: str, form: dict[str, object]):
    status, body = post_form(base, "/api/home-lab-next/calculate", form)
    require(status == 200, f"calculate {base} HTTP {status}: {body}")
    require(body.get("annual_cost_lei") is not None, f"calculate {base} missing annual cost")
    return body


def optimize(mode: str, extra: dict[str, object]):
    form = copy.deepcopy(BASE_FORM)
    form["_optimization_mode"] = mode
    form.update(extra)
    status, body = post_form(PROD, "/api/optimization/home-lab", form, timeout=180)
    return status, body


def main():
    report = {"checks": [], "cases": {}}

    for base, name in ((PROD, "prod"), (OLD, "old")):
        status, health = get_json(base, "/health")
        require(status == 200 and health.get("status") == "ok", f"{name} health failed: {health}")

    # 1) Determinism: identical input three times on production.
    repeated = [calc(PROD, BASE_FORM) for _ in range(3)]
    keys = ["annual_cost_lei", "final_energy_kwh", "primary_specific_kwh_m2", "co2_specific_kg_m2", "design_heat_load_kw"]
    for key in keys:
        for i in range(1, 3):
            assert_close(f"determinism {key} run0/run{i}", repeated[0][key], repeated[i][key], atol=1e-9, rtol=1e-12)
    require(len({x["energy_class"] for x in repeated}) == 1, "energy class is non-deterministic")
    report["checks"].append("production deterministic for repeated identical input")
    report["cases"]["baseline_prod"] = compact(repeated[0])

    # 2) Differential regression: current production versus last production build before optimizer release.
    old = calc(OLD, BASE_FORM)
    prod = repeated[0]
    for key in keys:
        assert_close(f"old-vs-prod {key}", old[key], prod[key], atol=0.01, rtol=1e-9)
    require(old["energy_class"] == prod["energy_class"], f"old-vs-prod energy class changed: {old['energy_class']} -> {prod['energy_class']}")
    require(old.get("final_energy_by_carrier") == prod.get("final_energy_by_carrier"), "old-vs-prod carrier energy breakdown changed")
    report["checks"].append("same controlled house matches pre-optimizer production build")
    report["cases"]["baseline_old"] = compact(old)

    # 3) Physics black-box monotonicity.
    improved = copy.deepcopy(BASE_FORM)
    improved.update({
        "wall_u_value": "0.25",
        "roof_u_value": "0.18",
        "floor_u_value": "0.25",
        "window_u_value": "1.0",
    })
    improved_result = calc(PROD, improved)
    require(improved_result["final_energy_kwh"] < prod["final_energy_kwh"], "better envelope did not lower final energy")
    require(improved_result["annual_cost_lei"] < prod["annual_cost_lei"], "better envelope did not lower annual bill")
    report["checks"].append("better envelope lowers energy and bill")
    report["cases"]["better_envelope"] = compact(improved_result)

    worse = copy.deepcopy(BASE_FORM)
    worse.update({
        "wall_u_value": "1.0",
        "roof_u_value": "0.8",
        "floor_u_value": "0.8",
        "window_u_value": "2.5",
    })
    worse_result = calc(PROD, worse)
    require(worse_result["final_energy_kwh"] > prod["final_energy_kwh"], "worse envelope did not raise final energy")
    require(worse_result["annual_cost_lei"] > prod["annual_cost_lei"], "worse envelope did not raise annual bill")
    report["checks"].append("worse envelope raises energy and bill")
    report["cases"]["worse_envelope"] = compact(worse_result)

    efficient_boiler = copy.deepcopy(BASE_FORM)
    efficient_boiler["heating_efficiency"] = "0.99"
    efficient_result = calc(PROD, efficient_boiler)
    require(efficient_result["annual_cost_lei"] < prod["annual_cost_lei"], "higher boiler efficiency did not lower bill")
    report["checks"].append("higher heating efficiency lowers bill")
    report["cases"]["efficient_boiler"] = compact(efficient_result)

    pv = copy.deepcopy(BASE_FORM)
    pv["pv_enabled"] = "on"
    pv_result = calc(PROD, pv)
    require(pv_result["annual_cost_lei"] < prod["annual_cost_lei"], "5 kWp PV did not lower annual bill")
    report["checks"].append("PV lowers annual bill")
    report["cases"]["pv_5kwp"] = compact(pv_result)

    # 4) New optimizer modes: the baseline bill must be the exact same baseline as direct calculate.
    modes = [
        ("auto_economic", {}),
        ("investment_budget", {"_investment_budget_lei": "30000"}),
        ("annual_bill_target", {"_annual_bill_target_lei": str(round(prod["annual_cost_lei"] * 0.95, 2))}),
        ("max_payback_years", {"_max_payback_years": "10"}),
    ]
    optimizer_rows = {}
    for mode, extra in modes:
        status, body = optimize(mode, extra)
        require(status == 200, f"optimizer {mode} HTTP {status}: {body}")
        meta = body["optimization"]
        scenario = body["scenario"]
        raw = meta["rawEvaluation"]

        assert_close(f"{mode} baseline bill", raw["baselineAnnualBillLei"], prod["annual_cost_lei"], atol=0.01)
        assert_close(f"{mode} selected bill raw/scenario", raw["annualBillLei"], scenario["annual_cost_lei"], atol=0.01)
        require(meta["economicMode"] == mode, f"{mode}: backend returned wrong economic mode")
        require(meta["evaluatedCandidates"] >= 1, f"{mode}: no candidates evaluated")
        require(meta["feasibleCandidates"] >= 1, f"{mode}: no feasible candidates")
        require(meta["paretoSolutions"] >= 1, f"{mode}: no Pareto candidates")

        if mode == "investment_budget":
            require(meta["capexLei"] <= 30000 + 0.01, f"budget mode exceeded budget: {meta['capexLei']}")
        if mode == "annual_bill_target":
            target = float(extra["_annual_bill_target_lei"])
            require(scenario["annual_cost_lei"] <= target + 0.01, f"annual bill mode missed target: {scenario['annual_cost_lei']} > {target}")
        if mode == "max_payback_years" and meta.get("paybackYears") is not None:
            require(meta["paybackYears"] <= 10 + 1e-9, f"payback mode exceeded 10 years: {meta['paybackYears']}")

        optimizer_rows[mode] = {
            "label": meta.get("label"),
            "capex_lei": meta.get("capexLei"),
            "annual_saving_lei": meta.get("annualSavingLei"),
            "payback_years": meta.get("paybackYears"),
            "annual_bill_lei": scenario.get("annual_cost_lei"),
            "evaluated": meta.get("evaluatedCandidates"),
            "feasible": meta.get("feasibleCandidates"),
            "pareto": meta.get("paretoSolutions"),
            "commercial_ready": meta.get("commercialReady"),
            "commercialization_status": meta.get("commercializationStatus"),
            "commercial_message": meta.get("commercialMessage"),
            "raw_solution": meta.get("rawSolution"),
        }
    report["checks"].append("all four optimizer modes preserve exact baseline and their stated constraint")
    report["optimizer"] = optimizer_rows

    # 5) Baseline must still be unchanged after optimizer calls.
    after = calc(PROD, BASE_FORM)
    for key in keys:
        assert_close(f"baseline after optimizer {key}", prod[key], after[key], atol=1e-9, rtol=1e-12)
    report["checks"].append("optimizer calls do not mutate server-side baseline calculation")

    print("BLACK_BOX_RESULT_START")
    print(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True))
    print("BLACK_BOX_RESULT_END")


if __name__ == "__main__":
    main()
