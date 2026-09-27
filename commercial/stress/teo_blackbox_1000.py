#!/usr/bin/env python3
"""Deterministic black-box stress campaign for the TEO V4 public HTTP contract.

The campaign deliberately treats the running FastAPI application and the served
browser worker as black boxes. It does not import calculation/optimizer modules.

Coverage:
- 1,000 browser-surrogate candidates rechecked through the canonical VERIFY API.
- 250 metamorphic physics pairs through /api/home-lab-next/calculate.
- all four economic modes.
- five Romanian climate/locality regimes, including the cold Miercurea Ciuc case.
- every heating branch surfaced by the public V4 PLAN contract when available.
- the exact served teo-v4-worker.js asset, including local refinement.

A JSON report is written for CI artifact retention.
"""
from __future__ import annotations

import json
import math
import os
import random
import statistics
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


BASE_URL = os.environ.get("TEO_BLACKBOX_BASE_URL", "http://127.0.0.1:8765").rstrip("/")
VERIFY_CASES = int(os.environ.get("TEO_BLACKBOX_VERIFY_CASES", "1000"))
METAMORPHIC_CASES = int(os.environ.get("TEO_BLACKBOX_METAMORPHIC_CASES", "250"))
GROUP_SIZE = int(os.environ.get("TEO_BLACKBOX_GROUP_SIZE", "50"))
SEED = int(os.environ.get("TEO_BLACKBOX_SEED", "20260927"))
REPORT_PATH = Path(os.environ.get("TEO_BLACKBOX_REPORT", "teo-blackbox-report.json"))
REQUEST_TIMEOUT_S = float(os.environ.get("TEO_BLACKBOX_REQUEST_TIMEOUT_S", "90"))

ENERGY_CLASSES = {"A+", "A", "B", "C", "D", "E", "F", "G"}
LOCALITIES = [
    "Brăila",
    "Arad",
    "Cluj-Napoca",
    "Brașov",
    "Miercurea Ciuc",
]
MODES = [
    "auto_economic",
    "investment_budget",
    "annual_bill_target",
    "max_payback_years",
]

rng = random.Random(SEED)


class CampaignFailure(RuntimeError):
    pass


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return float(ordered[0])
    rank = (len(ordered) - 1) * percentile
    low = int(math.floor(rank))
    high = int(math.ceil(rank))
    if low == high:
        return float(ordered[low])
    fraction = rank - low
    return float(ordered[low] * (1 - fraction) + ordered[high] * fraction)


def _finite(value: Any) -> bool:
    try:
        return math.isfinite(float(value))
    except (TypeError, ValueError):
        return False


def _request(
    method: str,
    path: str,
    *,
    form: dict[str, Any] | None = None,
    payload: dict[str, Any] | None = None,
    timeout: float = REQUEST_TIMEOUT_S,
) -> tuple[int, bytes, float]:
    url = BASE_URL + path
    headers = {"Accept": "application/json"}
    data: bytes | None = None
    if form is not None:
        data = urllib.parse.urlencode(form).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read()
            elapsed_ms = (time.perf_counter() - started) * 1000.0
            return int(response.status), body, elapsed_ms
    except urllib.error.HTTPError as exc:
        body = exc.read()
        elapsed_ms = (time.perf_counter() - started) * 1000.0
        return int(exc.code), body, elapsed_ms


def _json_request(
    method: str,
    path: str,
    *,
    form: dict[str, Any] | None = None,
    payload: dict[str, Any] | None = None,
) -> tuple[int, dict[str, Any], float]:
    status, raw, elapsed_ms = _request(method, path, form=form, payload=payload)
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise CampaignFailure(
            f"{method} {path} returned non-JSON HTTP {status}: {raw[:500]!r}"
        ) from exc
    if not isinstance(parsed, dict):
        raise CampaignFailure(f"{method} {path} returned non-object JSON")
    return status, parsed, elapsed_ms


def _get_text(path: str) -> str:
    status, raw, _ = _request("GET", path)
    if status != 200:
        raise CampaignFailure(f"GET {path} -> HTTP {status}")
    return raw.decode("utf-8")


def _base_form(group_index: int) -> dict[str, str]:
    area = rng.uniform(45.0, 360.0)
    levels = rng.choice([1, 1, 2, 2, 3])
    height = rng.uniform(2.35, 3.05)
    volume = area * height
    footprint = area / levels
    wall_area = max(55.0, math.sqrt(max(footprint, 1.0)) * 4.0 * height * levels * rng.uniform(0.78, 1.18))
    window_area = wall_area * rng.uniform(0.08, 0.30)
    door_area = rng.uniform(1.8, 5.5)
    locality = LOCALITIES[group_index % len(LOCALITIES)]

    wall_u = rng.uniform(0.16, 1.65)
    roof_u = rng.uniform(0.12, 1.25)
    floor_u = rng.uniform(0.18, 1.20)
    window_u = rng.uniform(0.75, 2.90)
    ach = rng.uniform(0.25, 0.95)
    infiltration = rng.uniform(0.03, 0.35)
    hrv = rng.choice([0.0, 0.0, rng.uniform(0.45, 0.82)])

    form = {
        "project_name": f"Blackbox-{group_index:03d}",
        "locality": locality,
        "heated_floor_area_m2": f"{area:.4f}",
        "heated_volume_m3": f"{volume:.4f}",
        "indoor_design_temperature_c": f"{rng.uniform(19.0, 22.0):.3f}",
        "building_type": "residential_individual",
        "construction_year": str(rng.randint(1950, 2025)),
        "solar_gains_kwh_m2_month": f"{rng.uniform(0.7, 2.2):.4f}",
        "wall_area_m2": f"{wall_area:.4f}",
        "wall_u_value": f"{wall_u:.5f}",
        "roof_area_m2": f"{footprint:.4f}",
        "roof_u_value": f"{roof_u:.5f}",
        "floor_area_m2": f"{footprint:.4f}",
        "floor_u_value": f"{floor_u:.5f}",
        "floor_boundary_type": "ground",
        "ground_exposed_perimeter_m": f"{max(16.0, 4.0 * math.sqrt(footprint)):.4f}",
        "ground_wall_thickness_m": f"{rng.uniform(0.20, 0.45):.4f}",
        "ground_conductivity_w_mk": f"{rng.uniform(1.2, 2.5):.4f}",
        "window_area_m2": f"{window_area:.4f}",
        "window_u_value": f"{window_u:.5f}",
        "door_area_m2": f"{door_area:.4f}",
        "door_u_value": f"{rng.uniform(1.0, 2.8):.5f}",
        "thermal_bridge_length_m": f"{rng.uniform(15.0, 100.0):.4f}",
        "thermal_bridge_psi_w_mk": f"{rng.uniform(0.025, 0.20):.5f}",
        "air_changes_per_hour": f"{ach:.5f}",
        "infiltration_air_changes_per_hour": f"{infiltration:.5f}",
        "heat_recovery_efficiency": f"{hrv:.5f}",
        "heating_system_type": "condensing_gas_boiler",
        "heating_efficiency": f"{rng.uniform(0.86, 0.98):.5f}",
        "heating_scop": "3.2",
        "heating_carrier": "natural_gas",
        "dhw_enabled": "on",
        "dhw_occupants": str(rng.randint(1, 6)),
        "dhw_litres_per_person_day_at_60c": f"{rng.uniform(35.0, 65.0):.3f}",
        "dhw_efficiency": f"{rng.uniform(0.78, 0.92):.5f}",
        "dhw_carrier": "natural_gas",
    }

    if group_index % 3 == 0:
        form.update(
            {
                "cooling_enabled": "on",
                "cooling_seer": f"{rng.uniform(2.8, 5.5):.4f}",
                "cooling_setpoint_c": f"{rng.uniform(24.0, 27.0):.3f}",
            }
        )
    if group_index % 4 == 0:
        form.update(
            {
                "pv_enabled": "on",
                "pv_installed_power_kwp": f"{rng.uniform(1.5, 12.0):.4f}",
                "pv_orientation": rng.choice(["south", "south_east", "south_west", "east", "west"]),
                "pv_tilt_degrees": f"{rng.uniform(15.0, 50.0):.3f}",
                "pv_performance_ratio": f"{rng.uniform(0.72, 0.88):.5f}",
            }
        )
    if group_index % 7 == 0:
        form.update(
            {
                "solar_thermal_enabled": "on",
                "solar_thermal_collector_area_m2": f"{rng.uniform(1.5, 7.5):.4f}",
                "solar_thermal_orientation": rng.choice(["south", "south_east", "south_west"]),
                "solar_thermal_tilt_degrees": f"{rng.uniform(25.0, 60.0):.3f}",
                "solar_thermal_system_efficiency": f"{rng.uniform(0.35, 0.65):.5f}",
            }
        )
    return form


def _assert_baseline(payload: dict[str, Any], case_label: str) -> None:
    required_finite = [
        "final_energy_kwh",
        "primary_specific_kwh_m2",
        "co2_kg",
        "co2_specific_kg_m2",
        "heat_loss_w_k",
        "annual_cost_lei",
        "design_heat_load_kw",
    ]
    for key in required_finite:
        if not _finite(payload.get(key)):
            raise CampaignFailure(f"{case_label}: baseline {key} is not finite: {payload.get(key)!r}")
    for key in ("final_energy_kwh", "heat_loss_w_k", "annual_cost_lei", "design_heat_load_kw"):
        if float(payload[key]) < -1e-8:
            raise CampaignFailure(f"{case_label}: baseline {key} is negative: {payload[key]}")
    if str(payload.get("energy_class") or "") not in ENERGY_CLASSES:
        raise CampaignFailure(f"{case_label}: invalid energy class {payload.get('energy_class')!r}")
    monthly = payload.get("monthly")
    monthly_costs = payload.get("monthly_costs")
    if not isinstance(monthly, list) or len(monthly) != 12:
        raise CampaignFailure(f"{case_label}: monthly physics does not have 12 rows")
    if not isinstance(monthly_costs, list) or len(monthly_costs) != 12:
        raise CampaignFailure(f"{case_label}: monthly costs do not have 12 rows")


def _run_worker(worker_path: Path, payload: dict[str, Any]) -> dict[str, Any]:
    harness = r'''
const fs = require("fs");
const vm = require("vm");
const input = JSON.parse(fs.readFileSync(0, "utf8"));
let terminal = null;
global.self = {
  postMessage(message) {
    if (message && (message.type === "done" || message.type === "error")) {
      terminal = message;
    }
  }
};
const source = fs.readFileSync(input.workerPath, "utf8");
vm.runInThisContext(source, {filename: input.workerPath});
self.onmessage({data: input.payload});
if (!terminal) throw new Error("TEO worker did not emit a terminal message.");
process.stdout.write(JSON.stringify(terminal));
'''
    process = subprocess.run(
        ["node", "-e", harness],
        input=json.dumps({"workerPath": str(worker_path), "payload": payload}),
        text=True,
        capture_output=True,
        timeout=180,
        check=False,
    )
    if process.returncode != 0:
        raise CampaignFailure(
            f"Node worker failed rc={process.returncode}: {process.stderr[-3000:]}"
        )
    try:
        result = json.loads(process.stdout)
    except Exception as exc:
        raise CampaignFailure(f"Worker emitted invalid JSON: {process.stdout[:500]!r}") from exc
    if result.get("type") != "done":
        raise CampaignFailure(f"Worker failed: {result}")
    return result


def _goals_for(mode: str, baseline_bill: float) -> tuple[dict[str, str], dict[str, float]]:
    form_fields: dict[str, str] = {"_optimization_mode": mode}
    goals = {
        "investment_budget_lei": 0.0,
        "annual_bill_target_lei": 0.0,
        "max_payback_years": 0.0,
    }
    if mode == "investment_budget":
        value = rng.uniform(15000.0, 160000.0)
        form_fields["_investment_budget_lei"] = f"{value:.3f}"
        goals["investment_budget_lei"] = value
    elif mode == "annual_bill_target":
        value = max(0.0, baseline_bill * rng.uniform(0.30, 0.90))
        form_fields["_annual_bill_target_lei"] = f"{value:.3f}"
        goals["annual_bill_target_lei"] = value
    elif mode == "max_payback_years":
        value = rng.uniform(3.0, 18.0)
        form_fields["_max_payback_years"] = f"{value:.4f}"
        goals["max_payback_years"] = value
    return form_fields, goals


def _candidate_identity_checks(
    fast: dict[str, Any],
    exact: dict[str, Any],
    baseline_bill: float,
    label: str,
) -> None:
    for name, candidate in (("fast", fast), ("canonical", exact)):
        for key in (
            "capex_lei",
            "baseline_annual_bill_lei",
            "annual_bill_lei",
            "annual_saving_lei",
            "final_energy_kwh",
            "primary_specific_kwh_m2",
            "co2_total_kg",
            "co2_specific_kg_m2",
        ):
            if not _finite(candidate.get(key)):
                raise CampaignFailure(f"{label}: {name} {key} is not finite: {candidate.get(key)!r}")
        if float(candidate["capex_lei"]) < -1e-6:
            raise CampaignFailure(f"{label}: {name} CAPEX is negative")
        if float(candidate["final_energy_kwh"]) < -1e-6:
            raise CampaignFailure(f"{label}: {name} final energy is negative")
        if str(candidate.get("energy_class") or "") not in ENERGY_CLASSES:
            raise CampaignFailure(f"{label}: {name} energy class invalid")

        expected_saving = baseline_bill - float(candidate["annual_bill_lei"])
        if abs(expected_saving - float(candidate["annual_saving_lei"])) > 0.08:
            raise CampaignFailure(
                f"{label}: {name} annual saving identity broken: "
                f"expected {expected_saving}, got {candidate['annual_saving_lei']}"
            )
        capex = float(candidate["capex_lei"])
        saving = float(candidate["annual_saving_lei"])
        payback = candidate.get("payback_years")
        if capex > 1e-6 and saving > 0.01:
            if not _finite(payback):
                raise CampaignFailure(f"{label}: {name} positive-saving candidate lacks payback")
            # Candidate CAPEX/saving are public cent-rounded values while
            # payback is calculated from the unrounded internals. Validate the
            # interval implied by cent rounding instead of recomputing from
            # already-rounded values (which is unstable for near-zero saving).
            capex_low = max(capex - 0.0051, 0.0)
            capex_high = capex + 0.0051
            saving_low = max(saving - 0.0051, 1e-12)
            saving_high = saving + 0.0051
            lower = capex_low / saving_high
            upper = capex_high / saving_low
            tolerance = max(0.03, 0.001 * max(abs(lower), abs(upper), 1.0))
            if float(payback) < lower - tolerance or float(payback) > upper + tolerance:
                raise CampaignFailure(
                    f"{label}: {name} payback outside cent-rounding interval "
                    f"[{lower}, {upper}], got {payback}"
                )


def _metamorphic_form(case_index: int) -> tuple[dict[str, str], dict[str, str], str]:
    base = _base_form(10000 + case_index)
    base.pop("cooling_enabled", None)
    base.pop("cooling_seer", None)
    base.pop("cooling_setpoint_c", None)
    base.pop("pv_enabled", None)
    base.pop("pv_installed_power_kwp", None)
    base.pop("pv_orientation", None)
    base.pop("pv_tilt_degrees", None)
    base.pop("pv_performance_ratio", None)
    base.pop("solar_thermal_enabled", None)
    base.pop("solar_thermal_collector_area_m2", None)
    base.pop("solar_thermal_orientation", None)
    base.pop("solar_thermal_tilt_degrees", None)
    base.pop("solar_thermal_system_efficiency", None)

    improved = dict(base)
    kind = case_index % 6
    if kind == 0:
        improved["wall_u_value"] = f"{float(base['wall_u_value']) * 0.55:.6f}"
        label = "wall_u_down"
    elif kind == 1:
        improved["roof_u_value"] = f"{float(base['roof_u_value']) * 0.55:.6f}"
        label = "roof_u_down"
    elif kind == 2:
        improved["floor_u_value"] = f"{float(base['floor_u_value']) * 0.60:.6f}"
        label = "floor_u_down"
    elif kind == 3:
        improved["window_u_value"] = f"{float(base['window_u_value']) * 0.65:.6f}"
        label = "window_u_down"
    elif kind == 4:
        improved["air_changes_per_hour"] = f"{float(base['air_changes_per_hour']) * 0.65:.6f}"
        label = "ach_down"
    else:
        baseline_hrv = float(base.get("heat_recovery_efficiency", "0") or 0)
        improved["heat_recovery_efficiency"] = f"{min(0.90, baseline_hrv + 0.25):.6f}"
        label = "hrv_up"
    return base, improved, label


def _run_metamorphic_campaign(report: dict[str, Any]) -> None:
    failures: list[dict[str, Any]] = []
    categories: Counter[str] = Counter()
    latencies: list[float] = []
    for index in range(METAMORPHIC_CASES):
        base, improved, kind = _metamorphic_form(index)
        categories[kind] += 1
        status_a, payload_a, latency_a = _json_request(
            "POST", "/api/home-lab-next/calculate", form=base
        )
        status_b, payload_b, latency_b = _json_request(
            "POST", "/api/home-lab-next/calculate", form=improved
        )
        latencies.extend([latency_a, latency_b])
        if status_a != 200 or status_b != 200:
            failures.append(
                {
                    "case": index,
                    "kind": kind,
                    "status_base": status_a,
                    "status_improved": status_b,
                    "base_error": payload_a,
                    "improved_error": payload_b,
                }
            )
            continue
        _assert_baseline(payload_a, f"metamorphic-{index}-base")
        _assert_baseline(payload_b, f"metamorphic-{index}-improved")

        load_a = float(payload_a["design_heat_load_kw"])
        load_b = float(payload_b["design_heat_load_kw"])
        energy_a = float(payload_a["final_energy_kwh"])
        energy_b = float(payload_b["final_energy_kwh"])
        # With cooling/PV disabled and all other inputs held constant, an
        # improvement in envelope/ventilation must not increase winter design
        # load or annual final energy beyond numerical noise.
        load_tolerance = max(0.002, 0.0005 * max(load_a, 1.0))
        energy_tolerance = max(0.5, 0.0005 * max(energy_a, 1.0))
        if load_b > load_a + load_tolerance or energy_b > energy_a + energy_tolerance:
            failures.append(
                {
                    "case": index,
                    "kind": kind,
                    "load_before_kw": load_a,
                    "load_after_kw": load_b,
                    "energy_before_kwh": energy_a,
                    "energy_after_kwh": energy_b,
                    "locality": base["locality"],
                }
            )

        if (index + 1) % 50 == 0:
            print(
                f"[metamorphic] {index + 1}/{METAMORPHIC_CASES} pairs, "
                f"failures={len(failures)}",
                flush=True,
            )

    report["metamorphic"] = {
        "pairs": METAMORPHIC_CASES,
        "http_calculations": METAMORPHIC_CASES * 2,
        "categories": dict(categories),
        "failures": failures[:50],
        "failure_count": len(failures),
        "latency_ms": {
            "p50": round(_percentile(latencies, 0.50), 3),
            "p95": round(_percentile(latencies, 0.95), 3),
            "max": round(max(latencies) if latencies else 0.0, 3),
        },
    }
    if failures:
        raise CampaignFailure(
            f"Metamorphic physics failures: {len(failures)}/{METAMORPHIC_CASES}"
        )


def main() -> int:
    report: dict[str, Any] = {
        "seed": SEED,
        "base_url": BASE_URL,
        "verify_target": VERIFY_CASES,
        "metamorphic_target": METAMORPHIC_CASES,
        "started_epoch_s": time.time(),
        "failures": [],
    }

    # Health and the exact served worker are black-box prerequisites.
    status, health, _ = _json_request("GET", "/health")
    if status != 200 or health.get("status") != "ok":
        raise CampaignFailure(f"Health check failed: HTTP {status} {health}")
    worker_source = _get_text("/static/teo-v4-worker.js")
    for token in (
        "teo_v4_halton_plus_local_refinement",
        "LOCAL_REFINEMENT_ROUNDS",
        "robustRegretMetricsRows",
    ):
        if token not in worker_source:
            raise CampaignFailure(f"Served worker misses expected adaptive token {token!r}")

    with tempfile.NamedTemporaryFile(
        "w", suffix="-teo-v4-worker.js", encoding="utf-8", delete=False
    ) as worker_file:
        worker_file.write(worker_source)
        worker_path = Path(worker_file.name)

    verification_latencies: list[float] = []
    plan_latencies: list[float] = []
    worker_latencies: list[float] = []
    bill_deltas: list[float] = []
    load_deltas: list[float] = []
    capex_deltas: list[float] = []
    bill_relative: list[float] = []
    load_relative: list[float] = []
    capex_relative: list[float] = []
    branch_coverage: Counter[str] = Counter()
    locality_coverage: Counter[str] = Counter()
    mode_coverage: Counter[str] = Counter()
    adaptive_tolerance_exceedances: list[dict[str, Any]] = []
    severe_mismatches: list[dict[str, Any]] = []
    application_errors: list[dict[str, Any]] = []
    verified_count = 0
    group_index = 0
    max_groups = max(30, math.ceil(VERIFY_CASES / max(GROUP_SIZE, 1)) + 10)

    try:
        while verified_count < VERIFY_CASES and group_index < max_groups:
            form = _base_form(group_index)
            locality_coverage[form["locality"]] += 1
            case_prefix = f"group-{group_index:02d}"

            baseline_status, baseline, baseline_latency = _json_request(
                "POST", "/api/home-lab-next/calculate", form=form
            )
            if baseline_status != 200:
                application_errors.append(
                    {
                        "stage": "baseline",
                        "group": group_index,
                        "status": baseline_status,
                        "payload": baseline,
                    }
                )
                group_index += 1
                continue
            _assert_baseline(baseline, case_prefix)
            baseline_bill = float(baseline["annual_cost_lei"])

            mode = MODES[group_index % len(MODES)]
            mode_fields, goals = _goals_for(mode, baseline_bill)
            mode_coverage[mode] += 1
            plan_form = {
                **form,
                **mode_fields,
                "_optimizer_run_id": f"blackbox-{SEED}-{group_index}",
            }
            plan_status, plan, plan_latency = _json_request(
                "POST", "/api/optimization/home-lab/v4/plan", form=plan_form
            )
            plan_latencies.append(plan_latency)
            if plan_status != 200:
                application_errors.append(
                    {
                        "stage": "plan",
                        "group": group_index,
                        "status": plan_status,
                        "payload": plan,
                    }
                )
                group_index += 1
                continue

            search_points = plan.get("searchPoints")
            branch_ids = plan.get("runBranchIds")
            kernel = plan.get("kernel")
            if not isinstance(search_points, list) or len(search_points) < 2000:
                raise CampaignFailure(f"{case_prefix}: PLAN returned too few search points")
            if not isinstance(branch_ids, list) or not branch_ids:
                raise CampaignFailure(f"{case_prefix}: PLAN returned no heating branches")
            if not isinstance(kernel, dict):
                raise CampaignFailure(f"{case_prefix}: PLAN returned no kernel")

            started_worker = time.perf_counter()
            worker = _run_worker(
                worker_path,
                {
                    "type": "run",
                    "kernel": kernel,
                    "searchPoints": search_points,
                    "searchBounds": plan.get("searchBounds") or {},
                    "branchIds": branch_ids,
                    "mode": mode,
                    "goals": goals,
                    "baselineAnnualBillLei": baseline_bill,
                },
            )
            worker_latencies.append((time.perf_counter() - started_worker) * 1000.0)

            candidate_rows = worker.get("candidateRows")
            if not isinstance(candidate_rows, list) or not candidate_rows:
                raise CampaignFailure(f"{case_prefix}: worker returned no candidate rows")
            if int(worker.get("refinementEvaluations") or 0) <= 0:
                raise CampaignFailure(f"{case_prefix}: local refinement did not execute")
            if int(worker.get("fastEvaluations") or 0) != (
                int(worker.get("globalEvaluations") or 0)
                + int(worker.get("refinementEvaluations") or 0)
            ):
                raise CampaignFailure(f"{case_prefix}: worker evaluation accounting is inconsistent")

            # Exercise the public shortlist contract as well. Its targets are
            # not used to reduce the 1,000 parity checks; the campaign samples
            # broadly from the returned TEO candidate pool.
            vp_status, vp, _ = _json_request(
                "POST",
                "/api/optimization/home-lab/v3/verification-plan",
                payload={"form": plan_form, "candidateRows": candidate_rows},
            )
            if vp_status != 200 or not isinstance(vp.get("targets"), list) or not vp["targets"]:
                raise CampaignFailure(
                    f"{case_prefix}: verification-plan failed HTTP {vp_status}: {vp}"
                )

            remaining = VERIFY_CASES - verified_count
            target_count = min(GROUP_SIZE, remaining, len(candidate_rows))
            # Mix extremes and random interior points instead of sampling only
            # the first shortlist entries.
            by_bill = sorted(
                candidate_rows,
                key=lambda row: float((row.get("candidate") or {}).get("annual_bill_lei") or math.inf),
            )
            by_capex = sorted(
                candidate_rows,
                key=lambda row: float((row.get("candidate") or {}).get("capex_lei") or math.inf),
            )
            pool: list[dict[str, Any]] = []
            pool.extend(by_bill[: min(8, len(by_bill))])
            pool.extend(by_bill[-min(8, len(by_bill)):])
            pool.extend(by_capex[: min(8, len(by_capex))])
            pool.extend(by_capex[-min(8, len(by_capex)):])
            remaining_pool = list(candidate_rows)
            rng.shuffle(remaining_pool)
            pool.extend(remaining_pool)

            selected_rows: list[dict[str, Any]] = []
            seen: set[tuple[str, str]] = set()
            for row in pool:
                candidate = row.get("candidate") or {}
                key = (
                    str(row.get("branchId") or ""),
                    str(candidate.get("candidate_id") or ""),
                )
                if not key[0] or not key[1] or key in seen:
                    continue
                seen.add(key)
                selected_rows.append(row)
                if len(selected_rows) >= target_count:
                    break
            if len(selected_rows) < target_count:
                raise CampaignFailure(
                    f"{case_prefix}: only {len(selected_rows)} unique candidates for {target_count} checks"
                )

            for local_index, row in enumerate(selected_rows):
                branch_id = str(row["branchId"])
                fast_candidate = dict(row["candidate"])
                branch_coverage[branch_id] += 1
                verify_status, verified, verify_latency = _json_request(
                    "POST",
                    "/api/optimization/home-lab/v3/verify",
                    payload={
                        "form": plan_form,
                        "branchId": branch_id,
                        "candidate": fast_candidate,
                        "baselineAnnualBillLei": baseline_bill,
                    },
                )
                verification_latencies.append(verify_latency)
                if verify_status != 200:
                    application_errors.append(
                        {
                            "stage": "verify",
                            "group": group_index,
                            "candidate": fast_candidate.get("candidate_id"),
                            "branch": branch_id,
                            "status": verify_status,
                            "payload": verified,
                        }
                    )
                    continue

                exact = verified.get("candidate")
                if not isinstance(exact, dict):
                    raise CampaignFailure(
                        f"{case_prefix}: VERIFY has no canonical candidate: {verified}"
                    )
                label = f"{case_prefix}/candidate-{local_index}/{branch_id}"
                _candidate_identity_checks(fast_candidate, exact, baseline_bill, label)

                bill_delta = abs(float(exact["annual_bill_lei"]) - float(fast_candidate["annual_bill_lei"]))
                load_fast = float(fast_candidate.get("design_heat_load_kw") or 0.0)
                load_exact = float(exact.get("design_heat_load_kw") or 0.0)
                load_delta = abs(load_exact - load_fast)
                capex_delta = abs(float(exact["capex_lei"]) - float(fast_candidate["capex_lei"]))
                bill_deltas.append(bill_delta)
                load_deltas.append(load_delta)
                capex_deltas.append(capex_delta)
                bill_relative.append(bill_delta / max(abs(float(exact["annual_bill_lei"])), 1.0))
                load_relative.append(load_delta / max(abs(load_exact), 0.1))
                capex_relative.append(capex_delta / max(abs(float(exact["capex_lei"])), 1.0))

                reported_bill_delta = float(verified.get("annualBillDeltaLei") or 0.0)
                reported_load_delta = float(verified.get("designLoadDeltaKw") or 0.0)
                if abs(reported_bill_delta - bill_delta) > 0.02:
                    raise CampaignFailure(
                        f"{label}: VERIFY annualBillDeltaLei is inconsistent "
                        f"({reported_bill_delta} vs {bill_delta})"
                    )
                if abs(reported_load_delta - load_delta) > 0.0002:
                    raise CampaignFailure(
                        f"{label}: VERIFY designLoadDeltaKw is inconsistent "
                        f"({reported_load_delta} vs {load_delta})"
                    )

                bill_tol = max(75.0, 0.01 * max(abs(float(exact["annual_bill_lei"])), 1.0))
                load_tol = max(0.05, 0.01 * max(abs(load_exact), 1.0))
                capex_tol = max(500.0, 0.015 * max(abs(float(exact["capex_lei"])), 1.0))
                if bill_delta > bill_tol or load_delta > load_tol or capex_delta > capex_tol:
                    adaptive_tolerance_exceedances.append(
                        {
                            "group": group_index,
                            "locality": form["locality"],
                            "mode": mode,
                            "branch": branch_id,
                            "candidate": fast_candidate.get("candidate_id"),
                            "bill_delta_lei": round(bill_delta, 4),
                            "bill_tolerance_lei": round(bill_tol, 4),
                            "load_delta_kw": round(load_delta, 6),
                            "load_tolerance_kw": round(load_tol, 6),
                            "capex_delta_lei": round(capex_delta, 4),
                            "capex_tolerance_lei": round(capex_tol, 4),
                        }
                    )

                severe_bill_tol = max(300.0, 0.03 * max(abs(float(exact["annual_bill_lei"])), 1.0))
                severe_load_tol = max(0.20, 0.04 * max(abs(load_exact), 1.0))
                severe_capex_tol = max(1500.0, 0.05 * max(abs(float(exact["capex_lei"])), 1.0))
                if (
                    bill_delta > severe_bill_tol
                    or load_delta > severe_load_tol
                    or capex_delta > severe_capex_tol
                ):
                    severe_mismatches.append(
                        {
                            "group": group_index,
                            "locality": form["locality"],
                            "mode": mode,
                            "branch": branch_id,
                            "candidate": fast_candidate.get("candidate_id"),
                            "bill_delta_lei": round(bill_delta, 4),
                            "load_delta_kw": round(load_delta, 6),
                            "capex_delta_lei": round(capex_delta, 4),
                            "fast": {
                                "annual_bill_lei": fast_candidate["annual_bill_lei"],
                                "capex_lei": fast_candidate["capex_lei"],
                                "design_heat_load_kw": fast_candidate.get("design_heat_load_kw"),
                            },
                            "canonical": {
                                "annual_bill_lei": exact["annual_bill_lei"],
                                "capex_lei": exact["capex_lei"],
                                "design_heat_load_kw": exact.get("design_heat_load_kw"),
                            },
                        }
                    )

                verified_count += 1
                if verified_count % 100 == 0 or verified_count == VERIFY_CASES:
                    print(
                        f"[verify] {verified_count}/{VERIFY_CASES} canonical checks; "
                        f"adaptive-exceedances={len(adaptive_tolerance_exceedances)}; "
                        f"severe={len(severe_mismatches)}",
                        flush=True,
                    )
                if verified_count >= VERIFY_CASES:
                    break

            group_index += 1

        if verified_count != VERIFY_CASES:
            raise CampaignFailure(
                f"Only {verified_count}/{VERIFY_CASES} canonical candidate checks completed; "
                f"application_errors={len(application_errors)}"
            )

        report["teo_candidate_parity"] = {
            "verified_cases": verified_count,
            "groups": group_index,
            "locality_coverage": dict(locality_coverage),
            "economic_mode_coverage": dict(mode_coverage),
            "branch_coverage": dict(branch_coverage),
            "application_error_count": len(application_errors),
            "application_errors": application_errors[:50],
            "adaptive_tolerance_exceedance_count": len(adaptive_tolerance_exceedances),
            "adaptive_tolerance_exceedances": adaptive_tolerance_exceedances[:100],
            "severe_mismatch_count": len(severe_mismatches),
            "severe_mismatches": severe_mismatches[:100],
            "annual_bill_delta_lei": {
                "mean": round(statistics.fmean(bill_deltas), 6),
                "p50": round(_percentile(bill_deltas, 0.50), 6),
                "p95": round(_percentile(bill_deltas, 0.95), 6),
                "p99": round(_percentile(bill_deltas, 0.99), 6),
                "max": round(max(bill_deltas), 6),
            },
            "design_load_delta_kw": {
                "mean": round(statistics.fmean(load_deltas), 8),
                "p50": round(_percentile(load_deltas, 0.50), 8),
                "p95": round(_percentile(load_deltas, 0.95), 8),
                "p99": round(_percentile(load_deltas, 0.99), 8),
                "max": round(max(load_deltas), 8),
            },
            "capex_delta_lei": {
                "mean": round(statistics.fmean(capex_deltas), 6),
                "p50": round(_percentile(capex_deltas, 0.50), 6),
                "p95": round(_percentile(capex_deltas, 0.95), 6),
                "p99": round(_percentile(capex_deltas, 0.99), 6),
                "max": round(max(capex_deltas), 6),
            },
            "relative_error": {
                "bill_p99": round(_percentile(bill_relative, 0.99), 8),
                "load_p99": round(_percentile(load_relative, 0.99), 8),
                "capex_p99": round(_percentile(capex_relative, 0.99), 8),
            },
            "latency_ms": {
                "plan_p50": round(_percentile(plan_latencies, 0.50), 3),
                "plan_p95": round(_percentile(plan_latencies, 0.95), 3),
                "worker_p50": round(_percentile(worker_latencies, 0.50), 3),
                "worker_p95": round(_percentile(worker_latencies, 0.95), 3),
                "verify_p50": round(_percentile(verification_latencies, 0.50), 3),
                "verify_p95": round(_percentile(verification_latencies, 0.95), 3),
                "verify_max": round(max(verification_latencies), 3),
            },
        }

        if application_errors:
            raise CampaignFailure(
                f"Application errors during TEO parity campaign: {len(application_errors)}"
            )
        # A small number of surrogate points can legitimately exceed the
        # adaptive uncertainty envelope; those points force more exact VERIFY
        # work. A severe discrepancy, however, means browser and canonical
        # mathematics have diverged enough to threaten candidate ordering.
        if severe_mismatches:
            raise CampaignFailure(
                f"Severe browser/canonical mismatches: {len(severe_mismatches)}/{verified_count}"
            )
        if len(adaptive_tolerance_exceedances) > max(5, int(0.01 * verified_count)):
            raise CampaignFailure(
                "Too many candidates exceed the adaptive verification tolerance: "
                f"{len(adaptive_tolerance_exceedances)}/{verified_count}"
            )

        _run_metamorphic_campaign(report)
        report["status"] = "pass"
        return_code = 0
    except Exception as exc:
        report["status"] = "fail"
        report["failures"].append(
            {
                "type": type(exc).__name__,
                "message": str(exc),
            }
        )
        print(f"[FAIL] {type(exc).__name__}: {exc}", file=sys.stderr, flush=True)
        return_code = 1
    finally:
        report["finished_epoch_s"] = time.time()
        report["duration_s"] = round(
            report["finished_epoch_s"] - report["started_epoch_s"],
            3,
        )
        REPORT_PATH.write_text(
            json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True),
            encoding="utf-8",
        )
        try:
            worker_path.unlink(missing_ok=True)
        except Exception:
            pass
        print(f"[report] {REPORT_PATH}", flush=True)

    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
