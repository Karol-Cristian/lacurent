from __future__ import annotations

from commercial.app.engine import demo_building
from commercial.app.heating_optimization import (
    heating_planning_options,
    option_is_eligible,
    run_mixed_heating_optimization,
)
from commercial.app.optimization import (
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
)


def _catalog() -> dict:
    return {
        "source": "test",
        "catalog_version": "test-v1",
        "costs": {
            "wall": {"cost_lei": 16, "unit": "lei_per_m2_per_cm"},
            "roof": {"cost_lei": 8, "unit": "lei_per_m2_per_cm"},
            "floor": {"cost_lei": 11, "unit": "lei_per_m2_per_cm"},
            "windows": {"cost_lei": 1000, "unit": "lei_per_m2"},
            "pv": {"cost_lei": 4000, "unit": "lei_per_kwp"},
            "solar_thermal": {"cost_lei": 2650, "unit": "lei_per_m2"},
        },
    }


def test_heating_planning_catalog_has_sourced_discrete_technologies() -> None:
    options = heating_planning_options()
    ids = {item.id for item in options}

    assert {
        "condensing-gas-24kw",
        "heat-pump-air-water-5kw",
        "heat-pump-air-water-8kw",
        "heat-pump-air-water-12kw",
        "heat-pump-air-water-15kw",
        "electric-boiler-12kw",
        "pellet-boiler-18kw",
    } <= ids
    for option in options:
        assert option.source_url
        assert option.equipment_price_lei > 0
        assert option.installed_capex_lei >= option.equipment_price_lei
        assert option.rated_power_kw > 0


def test_existing_condensing_gas_is_not_charged_as_a_replacement() -> None:
    baseline = demo_building()
    gas = next(item for item in heating_planning_options() if item.id == "condensing-gas-24kw")

    eligible, reason = option_is_eligible(baseline, gas)

    assert not eligible
    assert "deja instalată" in str(reason)


def test_mixed_heating_search_recalculates_multiple_heating_branches() -> None:
    baseline = demo_building()
    result = run_mixed_heating_optimization(
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.auto_economic,
        ),
        bounds=OptimizationSearchBoundsV1(
            wall_added_r_m2k_w_max=3,
            roof_added_r_m2k_w_max=3,
            floor_added_r_m2k_w_max=2,
            window_replacement_fraction_max=1,
            window_target_u_w_m2k=0.9,
            pv_added_kwp_max=3,
            solar_thermal_added_m2_max=4,
        ),
        catalog=_catalog(),
        max_evaluations_per_branch=12,
    )

    assert result.selection.selected is not None
    assert result.parametric_evaluations >= 24
    assert result.heating_branch_evaluations >= 12
    assert len(result.candidates) >= 12
    assert any(item.branch_id == "keep-current-heating" and item.eligible for item in result.branches)
    assert any(item.branch_id.startswith("heat-pump-air-water") and item.eligible for item in result.branches)

    baseline_bills = {round(item.baseline_annual_bill_lei, 2) for item in result.candidates}
    assert len(baseline_bills) == 1

    heating_candidates = [
        item
        for item in result.candidates
        if any(line.family == "heating" for line in item.cost_breakdown)
    ]
    assert heating_candidates
    assert all(item.commercialization_status == "pending_product_catalog" for item in heating_candidates)


def test_mixed_heating_budget_includes_fixed_heating_capex() -> None:
    baseline = demo_building()
    budget = 35000
    result = run_mixed_heating_optimization(
        OptimizationRequestV1(
            baseline=baseline,
            mode=OptimizationMode.investment_budget,
            investment_budget_lei=budget,
        ),
        bounds=OptimizationSearchBoundsV1(
            wall_added_r_m2k_w_max=2,
            roof_added_r_m2k_w_max=2,
            floor_added_r_m2k_w_max=1,
            window_replacement_fraction_max=1,
            window_target_u_w_m2k=0.9,
            pv_added_kwp_max=2,
            solar_thermal_added_m2_max=2,
        ),
        catalog=_catalog(),
        max_evaluations_per_branch=12,
    )

    assert result.selection.selected is not None
    assert result.selection.selected.capex_lei <= budget + 0.01


def test_unconfirmed_infrastructure_blocks_electric_and_pellet_branches() -> None:
    baseline = demo_building()
    options = {item.id: item for item in heating_planning_options()}

    electric_ok, electric_reason = option_is_eligible(
        baseline,
        options["electric-boiler-12kw"],
    )
    pellet_ok, pellet_reason = option_is_eligible(
        baseline,
        options["pellet-boiler-18kw"],
    )

    assert not electric_ok
    assert "Puterea electrică" in str(electric_reason)
    assert not pellet_ok
    assert "biomasă" in str(pellet_reason)


def test_heat_pump_capacity_catalog_spans_small_to_large_houses() -> None:
    capacities = sorted(
        item.rated_power_kw
        for item in heating_planning_options()
        if item.generator_type.value == "heat_pump_air_water"
    )
    assert capacities == [5, 8, 12, 15]
