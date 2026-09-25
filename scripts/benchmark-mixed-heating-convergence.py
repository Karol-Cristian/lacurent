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


def heating_choice(candidate):
    if candidate is None:
        return None
    for line in candidate.cost_breakdown:
        if line.family == "heating":
            return line.product_id
    return "keep-current-heating"


def run(building, depth, mode, **kwargs):
    started = time.perf_counter()
    result = run_mixed_heating_optimization(
        OptimizationRequestV1(baseline=building, mode=mode, **kwargs),
        bounds=OptimizationSearchBoundsV1(),
        catalog={**roi_cost_basis_seed(), "source": "diagnostic_seed"},
        max_evaluations_per_branch=depth,
    )
    elapsed = time.perf_counter() - started
    selected = result.selection.selected
    return {
        "elapsed_s": round(elapsed, 4),
        "evaluations": result.parametric_evaluations,
        "candidate_count": len(result.candidates),
        "feasible": result.selection.feasible_count,
        "pareto": result.selection.pareto_count,
        "selected": None if selected is None else {
            "heating": heating_choice(selected),
            "capex_lei": selected.capex_lei,
            "annual_bill_lei": selected.annual_bill_lei,
            "annual_saving_lei": selected.annual_saving_lei,
            "payback_years": selected.payback_years,
            "design_heat_load_kw": selected.design_heat_load_kw,
            "parameters": selected.parameters.model_dump(mode="json"),
        },
        "branches": [
            {
                "id": x.branch_id,
                "eligible": x.eligible,
                "evaluated": x.evaluated_candidates,
                "accepted": x.accepted_candidates,
                "rejected_capacity": x.rejected_for_capacity,
                "note": x.note,
            }
            for x in result.branches
        ],
    }


def build_case(**overrides):
    form = default_form_values()
    form.update(overrides)
    form["heating_chain_enabled"] = "on"
    return build_input_from_form(form)


def main():
    cases = {
        "condensing_gas_average": build_case(),
        "old_gas_boiler_poor": build_case(
            construction_year=1970,
            insulation_profile="poor",
            heating_choice="gas_boiler",
        ),
        "electric_boiler_average": build_case(
            heating_choice="electric_boiler",
        ),
    }

    output = {}
    for name, building in cases.items():
        output[name] = {
            "baseline_heating": building.heating.model_dump(mode="json"),
            "96": {
                "auto": run(building, 96, OptimizationMode.auto_economic),
                "budget_50000": run(
                    building,
                    96,
                    OptimizationMode.investment_budget,
                    investment_budget_lei=50000,
                ),
            },
            "128": {
                "auto": run(building, 128, OptimizationMode.auto_economic),
                "budget_50000": run(
                    building,
                    128,
                    OptimizationMode.investment_budget,
                    investment_budget_lei=50000,
                ),
            },
        }

    print("SCENARIO_RESULT_START")
    print(json.dumps(output, ensure_ascii=False, indent=2, sort_keys=True))
    print("SCENARIO_RESULT_END")


if __name__ == "__main__":
    main()
