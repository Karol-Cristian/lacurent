from __future__ import annotations

import math

from fastapi.testclient import TestClient

from commercial.app.engine import demo_building
from commercial.app.main import app
from commercial.app.models import model_to_dict
from commercial.app.product_matching import (
    WallInsulationProductV1,
    build_product_wall_insulation_scenario,
    match_wall_insulation_product,
    match_wall_insulation_products,
)
from commercial.app.renovation import build_wall_insulation_scenario


client = TestClient(app)


def generic_wall_requirement():
    bundle = build_wall_insulation_scenario(
        demo_building(),
        added_insulation_thickness_mm=100,
        insulation_lambda_w_mk=0.040,
    )
    return bundle.technical_requirement


def product(
    product_id: str,
    *,
    thickness_mm: float,
    lambda_w_mk: float,
    category: str = "facade_insulation",
    application: str = "external_wall",
    package_area_m2: float | None = None,
    price_per_package_lei: float | None = None,
) -> WallInsulationProductV1:
    return WallInsulationProductV1(
        partner_id="demo-store",
        product_id=product_id,
        sku=f"SKU-{product_id}",
        name=f"Insulation {product_id}",
        manufacturer="Demo Manufacturer",
        category=category,
        application=application,
        thickness_mm=thickness_mm,
        lambda_w_mk=lambda_w_mk,
        package_area_m2=package_area_m2,
        price_per_package_lei=price_per_package_lei,
        stock_status="in_stock",
        product_url=f"https://example.invalid/products/{product_id}",
        catalog_version="test-v1",
    )


def test_product_matching_uses_actual_layer_r_as_primary_requirement() -> None:
    requirement = generic_wall_requirement()

    exact = match_wall_insulation_product(
        requirement,
        product("exact", thickness_mm=100, lambda_w_mk=0.040),
    )
    assert exact.compatibility.compatible is True
    assert exact.compatibility.status == "meets_requirement"
    assert exact.compatibility.product_thermal_resistance_m2k_w == 2.5

    better = match_wall_insulation_product(
        requirement,
        product("better", thickness_mm=100, lambda_w_mk=0.032),
    )
    assert better.compatibility.compatible is True
    assert better.compatibility.status == "exceeds_requirement"
    assert better.compatibility.product_thermal_resistance_m2k_w == 3.125

    insufficient = match_wall_insulation_product(
        requirement,
        product("thin", thickness_mm=80, lambda_w_mk=0.040),
    )
    assert insufficient.compatibility.compatible is False
    assert insufficient.compatibility.status == "insufficient_thermal_resistance"
    assert insufficient.compatibility.product_thermal_resistance_m2k_w == 2.0


def test_product_can_meet_requirement_with_higher_lambda_if_thicker() -> None:
    requirement = generic_wall_requirement()
    candidate = product("thicker", thickness_mm=120, lambda_w_mk=0.045)

    match = match_wall_insulation_product(requirement, candidate)

    assert match.compatibility.compatible is True
    assert match.compatibility.status == "exceeds_requirement"
    assert match.compatibility.nominal_lambda_requirement_met is False
    assert match.compatibility.nominal_thickness_delta_mm == 20.0
    assert match.compatibility.product_thermal_resistance_m2k_w > 2.5
    assert any(
        "actual thickness/λ thermal resistance" in reason
        for reason in match.compatibility.reasons
    )


def test_product_matching_rejects_wrong_catalog_category() -> None:
    requirement = generic_wall_requirement()
    candidate = product(
        "roof-only",
        thickness_mm=100,
        lambda_w_mk=0.032,
        category="roof_insulation",
        application="roof",
    )

    match = match_wall_insulation_product(requirement, candidate)

    assert match.compatibility.compatible is False
    assert match.compatibility.status == "incompatible_category_or_application"


def test_product_quantity_is_minimum_package_count_without_waste() -> None:
    requirement = generic_wall_requirement()
    candidate = product(
        "packaged",
        thickness_mm=100,
        lambda_w_mk=0.040,
        package_area_m2=3.1,
        price_per_package_lei=100,
    )

    match = match_wall_insulation_product(requirement, candidate)

    expected_packages = math.ceil(requirement.affected_area_m2 / 3.1)
    assert match.quantity.minimum_packages_no_waste == expected_packages
    assert match.quantity.minimum_purchase_area_m2 == round(expected_packages * 3.1, 3)
    assert match.quantity.material_subtotal_lei_no_waste == expected_packages * 100
    assert any("No waste factor" in item for item in match.quantity.assumptions)


def test_match_response_preserves_catalog_order_and_counts_compatible_products() -> None:
    requirement = generic_wall_requirement()
    products = [
        product("insufficient", thickness_mm=80, lambda_w_mk=0.040),
        product("exact", thickness_mm=100, lambda_w_mk=0.040),
        product("better", thickness_mm=100, lambda_w_mk=0.032),
    ]

    response = match_wall_insulation_products(requirement, products)

    assert response.compatible_count == 2
    assert [item.product.product_id for item in response.matches] == [
        "insufficient",
        "exact",
        "better",
    ]


def test_selected_partner_product_is_recalculated_through_energy_engine() -> None:
    baseline = demo_building()
    requirement = generic_wall_requirement()
    generic = build_wall_insulation_scenario(
        baseline,
        added_insulation_thickness_mm=100,
        insulation_lambda_w_mk=0.040,
    )
    candidate = product("graphite", thickness_mm=100, lambda_w_mk=0.032)

    selected = build_product_wall_insulation_scenario(
        baseline,
        requirement,
        candidate,
    )

    measure = selected.scenario_bundle.measure
    assert selected.match.compatibility.compatible is True
    assert measure.material_source == "partner_product"
    assert measure.product_reference is not None
    assert measure.product_reference.partner_id == "demo-store"
    assert measure.product_reference.product_id == "graphite"
    assert measure.product_reference.sku == "SKU-graphite"

    assert (
        selected.scenario_bundle.scenario.calculation.final_energy_kwh
        < generic.scenario.calculation.final_energy_kwh
    )
    assert (
        selected.scenario_bundle.measure.proposed_wall_u_value_w_m2k
        < generic.measure.proposed_wall_u_value_w_m2k
    )
    assert selected.scenario_bundle.measure.measure_id != generic.measure.measure_id


def test_insufficient_product_cannot_be_selected_for_product_scenario() -> None:
    requirement = generic_wall_requirement()
    candidate = product("thin", thickness_mm=80, lambda_w_mk=0.040)

    try:
        build_product_wall_insulation_scenario(
            demo_building(),
            requirement,
            candidate,
        )
    except ValueError as exc:
        assert "does not satisfy wall-insulation requirement" in str(exc)
    else:
        raise AssertionError("Expected insufficient product scenario to fail.")


def test_product_matching_api_returns_technical_compatibility_and_quantity() -> None:
    requirement = generic_wall_requirement()
    candidate = product(
        "api-product",
        thickness_mm=100,
        lambda_w_mk=0.032,
        package_area_m2=4.0,
        price_per_package_lei=125,
    )

    response = client.post(
        "/api/products/wall-insulation/match",
        json={
            "requirement": model_to_dict(requirement),
            "products": [model_to_dict(candidate)],
        },
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["schema_version"] == "1.0"
    assert payload["compatible_count"] == 1
    match = payload["matches"][0]
    assert match["product"]["product_id"] == "api-product"
    assert match["compatibility"]["compatible"] is True
    assert match["compatibility"]["status"] == "exceeds_requirement"
    assert match["quantity"]["minimum_packages_no_waste"] == math.ceil(
        requirement.affected_area_m2 / 4.0
    )


def test_product_scenario_api_recalculates_with_real_product_properties() -> None:
    requirement = generic_wall_requirement()
    candidate = product("api-selected", thickness_mm=100, lambda_w_mk=0.032)

    response = client.post(
        "/api/scenarios/wall-insulation/product",
        json={
            "baseline": model_to_dict(demo_building()),
            "requirement": model_to_dict(requirement),
            "product": model_to_dict(candidate),
        },
    )
    assert response.status_code == 200

    payload = response.json()
    assert payload["selected_product"]["product_id"] == "api-selected"
    assert payload["match"]["compatibility"]["compatible"] is True
    measure = payload["scenario_bundle"]["measure"]
    assert measure["material_source"] == "partner_product"
    assert measure["product_reference"]["product_id"] == "api-selected"
    assert payload["scenario_bundle"]["scenario"]["delta_vs_baseline"]["final_energy"]["delta"] < 0


def test_product_scenario_api_rejects_insufficient_product() -> None:
    requirement = generic_wall_requirement()
    candidate = product("api-thin", thickness_mm=60, lambda_w_mk=0.040)

    response = client.post(
        "/api/scenarios/wall-insulation/product",
        json={
            "baseline": model_to_dict(demo_building()),
            "requirement": model_to_dict(requirement),
            "product": model_to_dict(candidate),
        },
    )
    assert response.status_code == 422
    assert "does not satisfy wall-insulation requirement" in response.json()["detail"]
