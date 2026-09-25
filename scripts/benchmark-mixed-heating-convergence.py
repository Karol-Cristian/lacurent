from __future__ import annotations

import json
import time

from commercial.app.heating_optimization import run_mixed_heating_optimization
from commercial.app.main import build_input_from_form, default_form_values, roi_cost_basis_seed
from commercial.app.optimization import (
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
)


def selected_heating(candidate):
    if candidate is None:
        return None
    for line in candidate.cost_breakdown:
        if line.family == "heating":
            return {
                "option_id": line.product_id,
                "label": line.note,
                "capex_lei": line.capex_lei,
                "rated_power_kw": line.parameter_value,
            }
    return {
        "option_id": "keep-current-heating",
        "label": "Păstrează sistemul actual",
        "capex_lei": 0,
        "rated_power_kw": None,
    }


def compact(result, elapsed_s):
    selected = result.selection.selected
    return {
        "elapsed_s": round(elapsed_s, 3),
        "parametric_evaluations": result.parametric_evaluations,
        "heating_branch_evaluations": result.heating_branch_evaluations,
        "candidate_count": len(result.candidates),
        "feasible_count": result.selection.feasible_count,
        "pareto_count": result.selection.pareto_count,
        "selected": None if selected is None else {
            "candidate_id": selected.candidate_id,
            "capex_lei": selected.capex_lei,
            "annual_bill_lei": selected.annual_bill_lei,
            "annual_saving_lei": selected.annual_saving_lei,
            "payback_years": selected.payback_years,
            "energy_class": selected.energy_class,
            "design_heat_load_kw": selected.design_heat_load_kw,
            "raw_parameters": selected.parameters.model_dump(mode="json"),
            "heating": selected_heating(selected),
        },
        "branches": [item.model_dump(mode="json") for item in result.branches],
    }


def run_mode(building, mode, depth, **kwargs):
    request = OptimizationRequestV1(
        baseline=building,
        mode=mode,
        **kwargs,
    )
    started = time.perf_counter()
    result = run_mixed_heating_optimization(
        request,
        bounds=OptimizationSearchBoundsV1(),
        catalog={**roi_cost_basis_seed(), "source": "diagnostic_seed"},
        max_evaluations_per_branch=depth,
    )
    elapsed = time.perf_counter() - started
    return compact(result, elapsed)


def main():
    form = default_form_values()
    form["heating_chain_enabled"] = "on"
    building = build_input_from_form(form)

    output = {
        "baseline": {
            "locality": building.locality,
            "area_m2": building.heated_floor_area_m2,
            "heating": building.heating.model_dump(mode="json"),
        },
        "depths": {},
    }

    for depth in (24, 48, 64, 96, 128):
        output["depths"][str(depth)] = {
            "auto": run_mode(
                building,
                OptimizationMode.auto_economic,
                depth,
            ),
            "budget_50000": run_mode(
                building,
                OptimizationMode.investment_budget,
                depth,
                investment_budget_lei=50000,
            ),
        }

    print("CONVERGENCE_RESULT_START")
    print(json.dumps(output, ensure_ascii=False, indent=2, sort_keys=True))
    print("CONVERGENCE_RESULT_END")


if __name__ == "__main__":
    main()
