from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from commercial.app.commercialization import (
    WallCommercializationRequestV1,
    WallProductBackedOptimizationRequestV1,
    commercialize_wall_candidate,
    run_wall_product_backed_optimization,
)
from commercial.app.engine import demo_building
from commercial.app.main import app
from commercial.app.models import model_to_dict
from commercial.app.optimization import (
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchRequestV1,
    ParametricMeasuresV1,
    evaluate_parametric_candidate,
)
from commercial.app.product_matching import WallInsulationProductV1


client = TestClient(app)


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


def _products() -> list[WallInsulationProductV1]:
    return [
        WallInsulationProductV1(
            partner_id="shop",
            product_id="eps-100",
            sku="EPS100",
            name="EPS 100",
            thickness_mm=100,
            lambda_w_mk=0.040,
            package_area_m2=2.0,
            price_per_package_lei=100,
            stock_status="in_stock",
            product_url="https://example.test/eps-100",
        ),
        WallInsulationProductV1(
            partner_id="shop",
            product_id="eps-120",
            sku="EPS120",
            name="EPS 120",
            thickness_mm=120,
            lambda_w_mk=0.040,
            package_area_m2=2.0,
            price_per_package_lei=116,
            stock_status="in_stock",
            product_url="https://example.test/eps-120",
        ),
        WallInsulationProductV1(
            partner_id="shop",
            product_id="graphite-100",
            sku="GR100",
            name="Graphite 100",
            thickness_mm=100,
            lambda_w_mk=0.032,
            package_area_m2=2.5,
            price_per_package_lei=145,
            stock_status="in_stock",
            product_url="https://example.test/graphite-100",
        ),
    ]


def test_wall_commercialization_rounds_raw_r_to_product_and_recalculates() -> None:
    baseline = demo_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(wall_added_r_m2k_w=2.75),
        _catalog(),
    )

    result = commercialize_wall_candidate(
        WallCommercializationRequestV1(
            baseline=baseline,
            raw_candidate=raw,
            products=_products(),
            nonmaterial_installed_cost_per_m2_lei=80,
        ),
        _catalog(),
    )

    assert result.discretization.realized_added_r_m2k_w >= 2.75
    assert result.discretization.product.product_id in {"eps-120", "graphite-100"}
    assert result.commercial_candidate.parameters.wall_added_r_m2k_w == pytest.approx(
        result.discretization.realized_added_r_m2k_w
    )
    assert result.commercial_candidate.annual_bill_lei <= raw.annual_bill_lei + 0.01

    wall_line = next(
        row
        for row in result.commercial_candidate.cost_breakdown
        if row.family == "wall"
    )
    expected_nonmaterial = result.discretization.affected_area_m2 * 80
    expected = result.discretization.material_subtotal_lei + expected_nonmaterial
    assert wall_line.capex_lei == pytest.approx(expected, abs=0.01)
    assert wall_line.source_kind == "commercial_product_installed_total"
    assert wall_line.product_id == result.discretization.product.product_id
    assert wall_line.quantity == result.discretization.packages


def test_wall_commercialization_recomputes_payback_from_exact_package_capex() -> None:
    baseline = demo_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(wall_added_r_m2k_w=2.75),
        _catalog(),
    )
    result = commercialize_wall_candidate(
        WallCommercializationRequestV1(
            baseline=baseline,
            raw_candidate=raw,
            products=_products(),
            nonmaterial_installed_cost_per_m2_lei=80,
        ),
        _catalog(),
    )
    commercial = result.commercial_candidate

    assert commercial.annual_saving_lei > 0
    assert commercial.payback_years == pytest.approx(
        commercial.capex_lei / commercial.annual_saving_lei,
        abs=0.0001,
    )
    assert result.raw_to_commercial_capex_delta_lei != 0


def test_product_backed_optimizer_reselects_after_wall_discretization() -> None:
    baseline = demo_building()
    request = WallProductBackedOptimizationRequestV1(
        search=OptimizationSearchRequestV1(
            request=OptimizationRequestV1(
                baseline=baseline,
                mode=OptimizationMode.investment_budget,
                investment_budget_lei=50000,
            ),
            max_evaluations=12,
        ),
        products=_products(),
        nonmaterial_installed_cost_per_m2_lei=80,
    )

    result = run_wall_product_backed_optimization(request, _catalog())

    assert result.wall_cost_curve.price_scope == "installed_total"
    assert result.raw_search.candidates
    assert result.commercial_selection.selected is not None
    assert result.commercial_rechecks >= 1
    assert any(
        "Final economic selection is repeated" in item
        for item in result.warnings
    )


def test_wall_commercialization_api_returns_exact_product_traceability() -> None:
    baseline = demo_building()
    raw = evaluate_parametric_candidate(
        baseline,
        ParametricMeasuresV1(wall_added_r_m2k_w=2.75),
        _catalog(),
    )
    response = client.post(
        "/api/optimization/commercialize/wall",
        json={
            "baseline": model_to_dict(baseline),
            "raw_candidate": model_to_dict(raw),
            "products": [model_to_dict(item) for item in _products()],
            "nonmaterial_installed_cost_per_m2_lei": 80,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["commercialization_id"].startswith("COM-WALL-")
    assert payload["commercial_candidate"]["commercialization_status"] == "commercialized"
    wall_line = next(
        row
        for row in payload["commercial_candidate"]["cost_breakdown"]
        if row["family"] == "wall"
    )
    assert wall_line["product_id"]
    assert wall_line["quantity"] > 0


def test_wall_product_backed_api_runs_raw_then_commercial_pass() -> None:
    response = client.post(
        "/api/optimization/run/wall-products",
        json={
            "search": {
                "request": {
                    "baseline": model_to_dict(demo_building()),
                    "mode": "max_payback_years",
                    "max_payback_years": 20,
                },
                "max_evaluations": 12,
            },
            "products": [model_to_dict(item) for item in _products()],
            "nonmaterial_installed_cost_per_m2_lei": 80,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["raw_search"]["evaluated_candidates"] >= 1
    assert payload["raw_search"]["candidates"]
    assert payload["commercial_rechecks"] >= 1
    assert payload["commercial_selection"]["selected"] is not None
