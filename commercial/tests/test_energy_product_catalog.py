import pytest

from commercial.app.energy_product_catalog import (
    CATEGORY_DEFINITIONS,
    compute_primary_value_metric,
    missing_teo_properties,
    teo_role,
)


def test_catalog_covers_initial_cross_system_product_families():
    expected = {
        "wall_insulation",
        "roof_insulation",
        "floor_insulation",
        "window_system",
        "hrv_unit",
        "radiator",
        "underfloor_pipe",
        "underfloor_manifold",
        "circulation_pump",
        "heating_control",
        "buffer_tank",
        "pv_module",
        "solar_thermal_collector",
        "heat_pump",
        "gas_boiler",
        "electric_boiler",
        "pellet_boiler",
    }
    assert expected.issubset(CATEGORY_DEFINITIONS)


def test_insulation_value_metric_uses_declared_r_not_thickness_alone():
    metric = compute_primary_value_metric(
        "wall_insulation",
        {"thickness_mm": 100, "lambda_w_mk": 0.030},
        price_lei=60,
        price_basis="lei_per_m2",
    )
    assert metric["numerator_value"] == pytest.approx(3.33333333)
    assert metric["metric_value"] == pytest.approx((0.1 / 0.030) / 60)


def test_hrv_value_metric_is_category_local_proxy_only():
    metric = compute_primary_value_metric(
        "hrv_unit",
        {
            "max_airflow_m3h": 350,
            "heat_recovery_efficiency": 90,
            "specific_power_input_w_m3h": 0.24,
        },
        price_lei=12000,
        price_basis="lei_unit",
    )
    assert metric["comparison_scope"] == "hrv_unit"
    assert metric["numerator_value"] == pytest.approx(315)
    assert metric["metric_value"] == pytest.approx(315 / 12000)


def test_radiator_metric_requires_declared_comparable_condition():
    metric = compute_primary_value_metric(
        "radiator",
        {"heat_output_w_dt50": 1800},
        price_lei=900,
        price_basis="lei_unit",
    )
    assert metric["metric_unit"] == "W_dt50/lei"
    assert metric["metric_value"] == pytest.approx(2.0)


def test_underfloor_pipe_is_bom_not_optimizer_search_dimension():
    assert teo_role("underfloor_pipe") == "bill_of_materials"
    metric = compute_primary_value_metric(
        "underfloor_pipe",
        {
            "package_length_m": 240,
            "outer_diameter_mm": 16,
            "wall_thickness_mm": 2,
        },
        price_lei=1200,
        price_basis="lei_package",
    )
    assert metric["metric_value"] == pytest.approx(0.2)


def test_missing_teo_properties_prevents_incomplete_products_from_mapping():
    missing = missing_teo_properties(
        "hrv_unit",
        {"max_airflow_m3h": 350, "heat_recovery_efficiency": 0.9},
    )
    assert missing == ["specific_power_input_w_m3h"]


def test_value_metrics_are_not_cross_category_scores():
    insulation = CATEGORY_DEFINITIONS["wall_insulation"]
    radiator = CATEGORY_DEFINITIONS["radiator"]
    assert insulation.comparison_scope != radiator.comparison_scope


def test_wrong_price_basis_is_rejected():
    with pytest.raises(ValueError):
        compute_primary_value_metric(
            "wall_insulation",
            {"thickness_mm": 100, "lambda_w_mk": 0.030},
            price_lei=100,
            price_basis="lei_unit",
        )
