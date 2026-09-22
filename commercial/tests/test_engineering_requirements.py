from __future__ import annotations

from fastapi.testclient import TestClient

from commercial.app.engine import demo_building
from commercial.app.engineering_requirements import (
    build_engineering_requirements,
    envelope_upgrade_requirements,
    heating_design_requirement,
    optimize_pv_plane,
)
from commercial.app.main import app
from commercial.app.models import model_to_dict
from commercial.app.widget_recommendations import (
    WidgetRecommendationRequestV1,
    build_widget_recommendations,
)


client = TestClient(app)


def test_pv_optimization_is_catalog_independent_and_returns_optimum() -> None:
    result = optimize_pv_plane(demo_building())
    assert result.optimum.annual_plane_hsol_kwh_m2 > 0
    assert result.optimum.relative_to_optimum_percent == 100.0
    assert 0 <= result.current_loss_vs_optimum_percent <= 100
    assert result.evaluated_orientations == 8
    assert result.evaluated_tilts == 19
    assert any("independently of any commercial PV module" in row for row in result.assumptions)


def test_envelope_requirements_are_u_target_and_r_based_not_product_based() -> None:
    rows = envelope_upgrade_requirements(demo_building())
    wall = next(row for row in rows if row.surface == "exterior_wall")
    assert wall.category == "facade_insulation"
    assert wall.target_u_w_m2k == 0.25
    assert wall.required_added_r_m2k_w >= 0
    assert "MC001-2022" in wall.methodology_source


def test_heating_requirement_calculates_load_flow_and_minimum_inner_diameter() -> None:
    req = heating_design_requirement(demo_building())
    assert req.design_heat_load_kw > 0
    assert req.minimum_generator_capacity_kw == req.design_heat_load_kw
    assert req.hydronic is True
    assert req.required_water_flow_l_h is not None
    assert req.required_water_flow_l_h > 0
    assert req.minimum_pipe_inner_diameter_mm is not None
    assert req.minimum_pipe_inner_diameter_mm > 0
    assert req.pipe_length_status == "requires_distribution_layout"


def test_aggregate_engineering_requirements_api_is_scientific_only() -> None:
    response = client.post(
        "/api/engineering/requirements",
        json={"baseline": model_to_dict(demo_building())},
    )
    assert response.status_code == 200
    payload = response.json()
    assert "envelope" in payload
    assert "photovoltaic" in payload
    assert "heating" in payload
    assert "products" not in payload
    assert "supplier" not in payload


def test_widget_layer_matches_real_products_without_polluting_engine_contract() -> None:
    response = build_widget_recommendations(
        WidgetRecommendationRequestV1(
            baseline=demo_building(),
            target_pv_kwp=4.6,
            available_pv_roof_area_m2=40,
            preferred_generator_category="heat_pump_air_water",
            pipe_length_m=25,
        )
    )
    assert response.recommendations
    categories = {row.category for row in response.recommendations}
    assert "pv_module" in categories
    assert "heat_pump_air_water" in categories
    assert "hydronic_pipe" in categories
    pipe = next(row for row in response.recommendations if row.category == "hydronic_pipe")
    assert pipe.quantity == 25
    assert pipe.estimated_material_cost_lei is not None


def test_widget_api_returns_catalog_recommendations_only_on_widget_endpoint() -> None:
    response = client.post(
        "/api/widget/product-recommendations",
        json={
            "baseline": model_to_dict(demo_building()),
            "target_pv_kwp": 4.6,
            "available_pv_roof_area_m2": 40,
            "preferred_generator_category": "heat_pump_air_water",
            "pipe_length_m": 25,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["recommendations"]
    assert any(row["supplier_name"] for row in payload["recommendations"])
