from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from commercial.app.engine import calculate, demo_building
from commercial.app.extended_costs import (
    build_pv_system_cost_curve,
    build_solar_thermal_system_cost_curve,
    build_window_product_cost_curve,
    discretize_pv,
    discretize_solar_thermal,
    discretize_windows,
    system_curve_cost,
)
from commercial.app.full_commercialization import (
    FullProductBackedOptimizationRequestV1,
    run_full_product_backed_optimization,
)
from commercial.app.main import app
from commercial.app.market_products import (
    FullProductCatalogV1,
    FullProductCostInputsV1,
    HeatingSystemProductV1,
    InsulationProductV1,
    PvModuleProductV1,
    SolarThermalCollectorProductV1,
    WindowSystemProductV1,
    WindowUnitV1,
)
from commercial.app.models import model_to_dict
from commercial.app.optimization import (
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
    OptimizationSearchRequestV1,
)
from commercial.app.product_matching import WallInsulationProductV1


client = TestClient(app)


def _base_cost_catalog() -> dict:
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


def _wall_products() -> list[WallInsulationProductV1]:
    return [
        WallInsulationProductV1(
            partner_id="shop",
            product_id="wall-120",
            sku="W120",
            name="Wall EPS 120",
            thickness_mm=120,
            lambda_w_mk=0.040,
            package_area_m2=2.0,
            price_per_package_lei=116,
            stock_status="in_stock",
        ),
        WallInsulationProductV1(
            partner_id="shop",
            product_id="wall-160",
            sku="W160",
            name="Wall EPS 160",
            thickness_mm=160,
            lambda_w_mk=0.040,
            package_area_m2=1.5,
            price_per_package_lei=120,
            stock_status="in_stock",
        ),
    ]


def _catalog() -> FullProductCatalogV1:
    return FullProductCatalogV1(
        roof_insulation=[
            InsulationProductV1(
                partner_id="shop",
                product_id="roof-120",
                name="Roof 120",
                family="roof",
                thickness_mm=120,
                lambda_w_mk=0.040,
                package_area_m2=3,
                price_per_package_lei=120,
                stock_status="in_stock",
            ),
            InsulationProductV1(
                partner_id="shop",
                product_id="roof-160",
                name="Roof 160",
                family="roof",
                thickness_mm=160,
                lambda_w_mk=0.040,
                package_area_m2=2.5,
                price_per_package_lei=125,
                stock_status="in_stock",
            ),
        ],
        floor_insulation=[
            InsulationProductV1(
                partner_id="shop",
                product_id="floor-100",
                name="Floor 100",
                family="floor",
                thickness_mm=100,
                lambda_w_mk=0.035,
                package_area_m2=3,
                price_per_package_lei=135,
                stock_status="in_stock",
            ),
            InsulationProductV1(
                partner_id="shop",
                product_id="floor-140",
                name="Floor 140",
                family="floor",
                thickness_mm=140,
                lambda_w_mk=0.035,
                package_area_m2=2.5,
                price_per_package_lei=145,
                stock_status="in_stock",
            ),
        ],
        windows=[
            WindowSystemProductV1(
                partner_id="shop",
                product_id="window-090",
                name="Uw 0.90",
                uw_w_m2k=0.90,
                price_per_m2_lei=950,
                stock_status="in_stock",
            ),
            WindowSystemProductV1(
                partner_id="shop",
                product_id="window-075",
                name="Uw 0.75",
                uw_w_m2k=0.75,
                price_per_m2_lei=1250,
                stock_status="in_stock",
            ),
        ],
        window_units=[
            WindowUnitV1(unit_id="W1", area_m2=6, current_u_w_m2k=1.5, orientation="south"),
            WindowUnitV1(unit_id="W2", area_m2=6, current_u_w_m2k=1.4, orientation="west"),
            WindowUnitV1(unit_id="W3", area_m2=6, current_u_w_m2k=1.3, orientation="north"),
            WindowUnitV1(unit_id="W4", area_m2=6, current_u_w_m2k=1.2, orientation="east"),
        ],
        pv_modules=[
            PvModuleProductV1(
                partner_id="shop",
                product_id="pv-450",
                name="PV 450",
                module_power_wp=450,
                module_price_lei=600,
                performance_ratio=0.82,
                stock_status="in_stock",
            ),
            PvModuleProductV1(
                partner_id="shop",
                product_id="pv-500",
                name="PV 500",
                module_power_wp=500,
                module_price_lei=690,
                performance_ratio=0.83,
                stock_status="in_stock",
            ),
        ],
        solar_thermal_collectors=[
            SolarThermalCollectorProductV1(
                partner_id="shop",
                product_id="st-2",
                name="Solar 2m2",
                collector_area_m2=2,
                collector_price_lei=1800,
                system_efficiency=0.55,
                stock_status="in_stock",
            ),
            SolarThermalCollectorProductV1(
                partner_id="shop",
                product_id="st-2.5",
                name="Solar 2.5m2",
                collector_area_m2=2.5,
                collector_price_lei=2200,
                system_efficiency=0.58,
                stock_status="in_stock",
            ),
        ],
        heating_systems=[
            HeatingSystemProductV1(
                partner_id="shop",
                product_id="hp-12",
                name="Heat pump 12 kW",
                rated_power_kw=12,
                heating={
                    "system_type": "heat_pump",
                    "carrier": "electricity",
                    "scop": 3.5,
                    "cost_profile": "electricity",
                },
                equipment_price_lei=26000,
                installation_price_lei=9000,
                stock_status="in_stock",
            ),
            HeatingSystemProductV1(
                partner_id="shop",
                product_id="gas-24",
                name="Condensing gas 24 kW",
                rated_power_kw=24,
                heating={
                    "system_type": "condensing_gas_boiler",
                    "carrier": "natural_gas",
                    "efficiency": 0.96,
                    "cost_profile": "natural_gas",
                },
                equipment_price_lei=6500,
                installation_price_lei=3500,
                stock_status="in_stock",
            ),
        ],
    )


def _cost_inputs() -> FullProductCostInputsV1:
    return FullProductCostInputsV1(
        wall_nonmaterial_installed_cost_per_m2_lei=80,
        roof_nonmaterial_installed_cost_per_m2_lei=45,
        floor_nonmaterial_installed_cost_per_m2_lei=55,
        window_nonmaterial_installed_cost_per_m2_lei=300,
        pv_activation_cost_lei=1500,
        pv_nonmodule_installed_cost_per_kwp_lei=1800,
        solar_thermal_activation_cost_lei=1200,
        solar_thermal_noncollector_installed_cost_per_m2_lei=700,
    )


def test_window_curve_uses_inverse_uw_and_whole_unit_discretization() -> None:
    catalog = _catalog()
    curve = build_window_product_cost_curve(
        catalog.windows,
        nonmaterial_installed_cost_per_m2_lei=300,
    )
    assert curve.family == "windows"
    assert curve.price_scope == "installed_total"
    assert curve.points[0].parameter_value == pytest.approx(1 / 0.9, abs=1e-6)

    result = discretize_windows(
        target_replacement_fraction=0.5,
        target_u_w_m2k=0.9,
        units=catalog.window_units,
        products=catalog.windows,
        nonmaterial_installed_cost_per_m2_lei=300,
    )
    assert result.realized_replacement_fraction == pytest.approx(0.5)
    assert len(result.selected_unit_ids) == 2
    assert result.realized_u_w_m2k <= 0.9


def test_pv_curve_keeps_activation_separate_and_discretizes_modules() -> None:
    catalog = _catalog()
    curve = build_pv_system_cost_curve(
        catalog.pv_modules,
        max_added_kwp=5,
        activation_cost_lei=1500,
        nonmodule_installed_cost_per_kwp_lei=1800,
    )
    assert curve.price_scope == "installed_total"
    assert system_curve_cost(curve, 1.0) > 1500

    result = discretize_pv(
        target_added_kwp=1.1,
        products=catalog.pv_modules,
        activation_cost_lei=1500,
        nonmodule_installed_cost_per_kwp_lei=1800,
    )
    assert result.realized_added_kwp >= 1.1
    assert result.module_count >= 3
    assert result.installed_capex_lei > result.material_subtotal_lei


def test_solar_thermal_discretizes_whole_collectors() -> None:
    catalog = _catalog()
    curve = build_solar_thermal_system_cost_curve(
        catalog.solar_thermal_collectors,
        max_added_area_m2=6,
        activation_cost_lei=1200,
        noncollector_installed_cost_per_m2_lei=700,
    )
    result = discretize_solar_thermal(
        target_added_area_m2=3.2,
        products=catalog.solar_thermal_collectors,
        activation_cost_lei=1200,
        noncollector_installed_cost_per_m2_lei=700,
    )
    assert curve.price_scope == "installed_total"
    assert result.realized_added_area_m2 >= 3.2
    assert result.collector_count >= 2


def test_full_product_optimizer_rechecks_continuous_and_heating_products() -> None:
    baseline = demo_building()
    payload = FullProductBackedOptimizationRequestV1(
        search=OptimizationSearchRequestV1(
            request=OptimizationRequestV1(
                baseline=baseline,
                mode=OptimizationMode.investment_budget,
                investment_budget_lei=50000,
            ),
            bounds=OptimizationSearchBoundsV1(
                wall_added_r_m2k_w_max=4,
                roof_added_r_m2k_w_max=4,
                floor_added_r_m2k_w_max=4,
                window_replacement_fraction_max=1,
                window_target_u_w_m2k=0.9,
                pv_added_kwp_max=2,
                solar_thermal_added_m2_max=4,
            ),
            max_evaluations=12,
        ),
        wall_products=_wall_products(),
        catalog=_catalog(),
        cost_inputs=_cost_inputs(),
        max_continuous_commercializations=12,
        max_heating_evaluations=24,
    )
    result = run_full_product_backed_optimization(payload, _base_cost_catalog())

    assert result.raw_search.candidates
    assert result.continuous_rechecks >= 1
    assert result.heating_rechecks >= 1
    assert result.final_selection.selected is not None
    assert result.fully_commercialized_count + result.partially_commercialized_count >= 1
    # Final selection must still obey the user's one chosen constraint after
    # product rounding and mixed heating evaluation.
    assert result.final_selection.selected.capex_lei <= 50000 + 0.01


def test_full_product_optimizer_api() -> None:
    payload = FullProductBackedOptimizationRequestV1(
        search=OptimizationSearchRequestV1(
            request=OptimizationRequestV1(
                baseline=demo_building(),
                mode=OptimizationMode.max_payback_years,
                max_payback_years=20,
            ),
            bounds=OptimizationSearchBoundsV1(
                wall_added_r_m2k_w_max=4,
                roof_added_r_m2k_w_max=4,
                floor_added_r_m2k_w_max=4,
                window_replacement_fraction_max=1,
                window_target_u_w_m2k=0.9,
                pv_added_kwp_max=2,
                solar_thermal_added_m2_max=4,
            ),
            max_evaluations=12,
        ),
        wall_products=_wall_products(),
        catalog=_catalog(),
        cost_inputs=_cost_inputs(),
        max_continuous_commercializations=12,
        max_heating_evaluations=12,
    )
    response = client.post(
        "/api/optimization/run/full-products",
        json=model_to_dict(payload),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["raw_search"]["candidates"]
    assert body["continuous_rechecks"] >= 1
    assert body["final_selection"]["selected"] is not None
