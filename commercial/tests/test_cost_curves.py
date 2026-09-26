from __future__ import annotations

import pytest

from commercial.app.cost_curves import (
    build_wall_product_cost_curve,
    curve_cost_per_basis,
    discretize_wall_product,
)
from commercial.app.product_matching import WallInsulationProductV1


def _product(
    product_id: str,
    *,
    thickness_mm: float,
    lambda_w_mk: float,
    package_area_m2: float,
    price_per_package_lei: float,
) -> WallInsulationProductV1:
    return WallInsulationProductV1(
        partner_id="test-partner",
        product_id=product_id,
        name=product_id,
        thickness_mm=thickness_mm,
        lambda_w_mk=lambda_w_mk,
        package_area_m2=package_area_m2,
        price_per_package_lei=price_per_package_lei,
        stock_status="in_stock",
    )


def test_wall_cost_curve_is_derived_from_product_r_and_package_price() -> None:
    products = [
        _product(
            "eps-100",
            thickness_mm=100,
            lambda_w_mk=0.040,
            package_area_m2=2.0,
            price_per_package_lei=100,
        ),
        _product(
            "eps-120",
            thickness_mm=120,
            lambda_w_mk=0.040,
            package_area_m2=2.0,
            price_per_package_lei=116,
        ),
    ]

    curve = build_wall_product_cost_curve(products)

    assert curve.price_scope == "material_only"
    assert curve.points[0].parameter_value == pytest.approx(2.5)
    assert curve.points[0].variable_cost_per_basis_lei == pytest.approx(50)
    assert curve.points[1].parameter_value == pytest.approx(3.0)
    assert curve.points[1].variable_cost_per_basis_lei == pytest.approx(58)

    with pytest.raises(ValueError):
        curve_cost_per_basis(curve, 2.75)


def test_installed_wall_curve_keeps_activation_cost_separate_from_r() -> None:
    products = [
        _product(
            "eps-100",
            thickness_mm=100,
            lambda_w_mk=0.040,
            package_area_m2=2.0,
            price_per_package_lei=100,
        ),
        _product(
            "eps-120",
            thickness_mm=120,
            lambda_w_mk=0.040,
            package_area_m2=2.0,
            price_per_package_lei=116,
        ),
    ]
    curve = build_wall_product_cost_curve(
        products,
        nonmaterial_installed_cost_per_m2_lei=80,
    )

    # R=2.75 is halfway between 50 and 58 lei/m2 material cost, plus
    # the 80 lei/m2 activation/non-material installed-system cost.
    assert curve.price_scope == "installed_total"
    assert curve_cost_per_basis(curve, 2.75) == pytest.approx(134)
    assert curve_cost_per_basis(curve, 0) == 0


def test_wall_product_discretization_selects_real_product_and_package_count() -> None:
    products = [
        _product(
            "eps-100",
            thickness_mm=100,
            lambda_w_mk=0.040,
            package_area_m2=2.0,
            price_per_package_lei=100,
        ),
        _product(
            "graphite-100",
            thickness_mm=100,
            lambda_w_mk=0.032,
            package_area_m2=2.5,
            price_per_package_lei=145,
        ),
        _product(
            "eps-140",
            thickness_mm=140,
            lambda_w_mk=0.040,
            package_area_m2=2.0,
            price_per_package_lei=125,
        ),
    ]

    result = discretize_wall_product(
        target_added_r_m2k_w=3.0,
        affected_area_m2=101,
        products=products,
    )

    assert result.realized_added_r_m2k_w >= 3.0
    assert result.packages is not None
    assert result.material_subtotal_lei is not None
    assert result.product.product_id in {"graphite-100", "eps-140"}
    assert "Lowest known material purchase subtotal" in result.selection_basis
