from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Mapping


@dataclass(frozen=True)
class CategoryDefinition:
    category_id: str
    label: str
    teo_family: str | None
    teo_role: str
    comparison_scope: str
    primary_metric_key: str
    primary_metric_unit: str
    required_properties: tuple[str, ...]
    preferred_documents: tuple[str, ...]


CATEGORY_DEFINITIONS: dict[str, CategoryDefinition] = {
    "wall_insulation": CategoryDefinition(
        "wall_insulation", "Izolație pereți", "wall", "planning_curve",
        "wall_insulation", "thermal_resistance_per_price", "R_added/(lei/m2)",
        ("thickness_mm", "lambda_w_mk"),
        ("declaration_of_performance_if_applicable", "technical_datasheet"),
    ),
    "roof_insulation": CategoryDefinition(
        "roof_insulation", "Izolație pod/acoperiș", "roof", "planning_curve",
        "roof_insulation", "thermal_resistance_per_price", "R_added/(lei/m2)",
        ("thickness_mm", "lambda_w_mk"),
        ("declaration_of_performance_if_applicable", "technical_datasheet"),
    ),
    "floor_insulation": CategoryDefinition(
        "floor_insulation", "Izolație pardoseală", "floor", "planning_curve",
        "floor_insulation", "thermal_resistance_per_price", "R_added/(lei/m2)",
        ("thickness_mm", "lambda_w_mk"),
        ("declaration_of_performance_if_applicable", "technical_datasheet"),
    ),
    "window_system": CategoryDefinition(
        "window_system", "Ferestre", "windows", "planning_curve",
        "window_system", "thermal_resistance_per_price", "(1/Uw)/(lei/m2)",
        ("uw_w_m2k",),
        ("declaration_of_performance_if_applicable", "technical_datasheet"),
    ),
    "hrv_unit": CategoryDefinition(
        "hrv_unit", "Ventilație cu recuperare de căldură", "ventilation", "finalist_match",
        "hrv_unit", "recovered_airflow_proxy_per_price", "(m3/h*eta)/lei",
        ("max_airflow_m3h", "heat_recovery_efficiency", "specific_power_input_w_m3h"),
        ("technical_datasheet", "ecodesign_product_information", "energy_label_if_applicable"),
    ),
    "radiator": CategoryDefinition(
        "radiator", "Calorifere", "heating_emitter", "finalist_match",
        "radiator_dt50", "heat_output_per_price", "W_dt50/lei",
        ("heat_output_w_dt50",),
        ("technical_datasheet", "declaration_of_performance_if_applicable"),
    ),
    "fan_coil": CategoryDefinition(
        "fan_coil", "Ventiloconvectoare", "heating_emitter", "finalist_match",
        "fan_coil", "heat_output_per_price", "W/lei",
        ("heating_output_w_declared",),
        ("technical_datasheet",),
    ),
    "underfloor_pipe": CategoryDefinition(
        "underfloor_pipe", "Țeavă încălzire în pardoseală", "heating_distribution", "bill_of_materials",
        "underfloor_pipe", "length_per_price", "m/lei",
        ("package_length_m", "outer_diameter_mm", "wall_thickness_mm"),
        ("technical_datasheet", "declaration_of_performance_if_applicable"),
    ),
    "underfloor_manifold": CategoryDefinition(
        "underfloor_manifold", "Distribuitoare încălzire în pardoseală", "heating_distribution", "bill_of_materials",
        "underfloor_manifold", "circuits_per_price", "circuits/lei",
        ("circuit_count",),
        ("technical_datasheet",),
    ),
    "circulation_pump": CategoryDefinition(
        "circulation_pump", "Pompe de circulație", "heating_distribution", "finalist_match",
        "circulation_pump", "hydraulic_capacity_per_price", "proxy/lei",
        ("max_flow_m3h", "max_head_m"),
        ("technical_datasheet", "ecodesign_product_information_if_applicable"),
    ),
    "heating_control": CategoryDefinition(
        "heating_control", "Termostate și control", "heating_control", "bill_of_materials",
        "heating_control", "zones_per_price", "zones/lei",
        ("controlled_zone_count",),
        ("technical_datasheet",),
    ),
    "buffer_tank": CategoryDefinition(
        "buffer_tank", "Puffere și acumulatoare", "heating_storage", "finalist_match",
        "buffer_tank", "storage_volume_per_price", "l/lei",
        ("storage_volume_l",),
        ("technical_datasheet",),
    ),
    "pv_module": CategoryDefinition(
        "pv_module", "Panouri fotovoltaice", "pv", "planning_curve",
        "pv_module", "power_per_price", "Wp/lei",
        ("module_power_wp",),
        ("technical_datasheet", "declaration_of_performance_if_applicable"),
    ),
    "solar_thermal_collector": CategoryDefinition(
        "solar_thermal_collector", "Colectoare solare termice", "solar_thermal", "planning_curve",
        "solar_thermal_collector", "effective_area_per_price", "(m2*eta0)/lei",
        ("aperture_area_m2", "optical_efficiency_eta0"),
        ("technical_datasheet", "test_or_certification_report_if_available"),
    ),
    "heat_pump": CategoryDefinition(
        "heat_pump", "Pompe de căldură", "heating", "finalist_match",
        "heat_pump", "capacity_per_price", "kW/lei",
        ("rated_power_kw", "scop"),
        ("technical_datasheet", "energy_label_if_applicable", "ecodesign_product_information"),
    ),
    "gas_boiler": CategoryDefinition(
        "gas_boiler", "Centrale pe gaz", "heating", "finalist_match",
        "gas_boiler", "capacity_per_price", "kW/lei",
        ("rated_power_kw", "seasonal_efficiency"),
        ("technical_datasheet", "energy_label_if_applicable", "ecodesign_product_information"),
    ),
    "electric_boiler": CategoryDefinition(
        "electric_boiler", "Centrale electrice", "heating", "finalist_match",
        "electric_boiler", "capacity_per_price", "kW/lei",
        ("rated_power_kw", "seasonal_efficiency"),
        ("technical_datasheet",),
    ),
    "pellet_boiler": CategoryDefinition(
        "pellet_boiler", "Centrale pe peleți", "heating", "finalist_match",
        "pellet_boiler", "capacity_per_price", "kW/lei",
        ("rated_power_kw", "seasonal_efficiency"),
        ("technical_datasheet", "energy_label_if_applicable", "ecodesign_product_information_if_applicable"),
    ),
}


def _positive(properties: Mapping[str, float], key: str) -> float:
    value = float(properties[key])
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{key} must be a finite positive value.")
    return value


def _fraction(properties: Mapping[str, float], key: str) -> float:
    value = float(properties[key])
    if not math.isfinite(value):
        raise ValueError(f"{key} must be finite.")
    if value > 1.0 and value <= 100.0:
        value /= 100.0
    if value <= 0 or value > 1:
        raise ValueError(f"{key} must be in (0, 1] or expressed as percent.")
    return value


def compute_primary_value_metric(
    category_id: str,
    properties: Mapping[str, float],
    *,
    price_lei: float,
    price_basis: str,
) -> dict[str, float | str]:
    """Compute a category-local technical-value/price index.

    This is a preselection/ranking aid, not an energy or ROI result. Values are
    comparable only inside the same comparison_scope and declared conditions.
    TEO must still recalculate the building and financial result.
    """

    category = CATEGORY_DEFINITIONS[category_id]
    price = float(price_lei)
    if not math.isfinite(price) or price <= 0:
        raise ValueError("price_lei must be a finite positive value.")

    numerator: float
    numerator_unit: str
    required_price_basis: tuple[str, ...]

    if category_id in {"wall_insulation", "roof_insulation", "floor_insulation"}:
        thickness_m = _positive(properties, "thickness_mm") / 1000.0
        lambda_w_mk = _positive(properties, "lambda_w_mk")
        numerator = thickness_m / lambda_w_mk
        numerator_unit = "m2K/W"
        required_price_basis = ("lei_per_m2",)
    elif category_id == "window_system":
        numerator = 1.0 / _positive(properties, "uw_w_m2k")
        numerator_unit = "m2K/W"
        required_price_basis = ("lei_per_m2",)
    elif category_id == "hrv_unit":
        airflow = _positive(properties, "max_airflow_m3h")
        recovery = _fraction(properties, "heat_recovery_efficiency")
        numerator = airflow * recovery
        numerator_unit = "m3/h*eta"
        required_price_basis = ("lei_unit", "lei_total")
    elif category_id == "radiator":
        numerator = _positive(properties, "heat_output_w_dt50")
        numerator_unit = "W_dt50"
        required_price_basis = ("lei_unit",)
    elif category_id == "fan_coil":
        numerator = _positive(properties, "heating_output_w_declared")
        numerator_unit = "W"
        required_price_basis = ("lei_unit",)
    elif category_id == "underfloor_pipe":
        numerator = _positive(properties, "package_length_m")
        numerator_unit = "m"
        required_price_basis = ("lei_package",)
    elif category_id == "underfloor_manifold":
        numerator = _positive(properties, "circuit_count")
        numerator_unit = "circuits"
        required_price_basis = ("lei_unit",)
    elif category_id == "circulation_pump":
        # Keep flow and head separate in the source data. The product index is
        # intentionally only a preselection proxy; hydraulic sizing remains a
        # downstream engineering check.
        numerator = _positive(properties, "max_flow_m3h") * _positive(properties, "max_head_m")
        numerator_unit = "m3/h*m"
        required_price_basis = ("lei_unit",)
    elif category_id == "heating_control":
        numerator = _positive(properties, "controlled_zone_count")
        numerator_unit = "zones"
        required_price_basis = ("lei_unit",)
    elif category_id == "buffer_tank":
        numerator = _positive(properties, "storage_volume_l")
        numerator_unit = "l"
        required_price_basis = ("lei_unit",)
    elif category_id == "pv_module":
        numerator = _positive(properties, "module_power_wp")
        numerator_unit = "Wp"
        required_price_basis = ("lei_unit",)
    elif category_id == "solar_thermal_collector":
        numerator = _positive(properties, "aperture_area_m2") * _fraction(
            properties, "optical_efficiency_eta0"
        )
        numerator_unit = "m2*eta0"
        required_price_basis = ("lei_unit",)
    elif category_id in {"heat_pump", "gas_boiler", "electric_boiler", "pellet_boiler"}:
        numerator = _positive(properties, "rated_power_kw")
        numerator_unit = "kW"
        required_price_basis = ("lei_unit",)
    else:
        raise ValueError(f"No primary value metric implemented for {category_id!r}.")

    if price_basis not in required_price_basis:
        expected = ", ".join(required_price_basis)
        raise ValueError(
            f"{category_id} value metric requires price basis {expected}; got {price_basis!r}."
        )

    value = numerator / price
    return {
        "metric_key": category.primary_metric_key,
        "comparison_scope": category.comparison_scope,
        "numerator_value": round(numerator, 8),
        "numerator_unit": numerator_unit,
        "denominator_price_lei": round(price, 2),
        "denominator_basis": price_basis,
        "metric_value": round(value, 10),
        "metric_unit": category.primary_metric_unit,
        "formula_version": "energy-product-value-v1",
    }


def normalize_teo_properties(
    category_id: str,
    properties: Mapping[str, object],
) -> dict[str, object]:
    """Normalize source-backed declared fields to stable TEO property keys.

    Aliases are created only when the declared operating condition makes the
    equivalence explicit. The original source properties remain authoritative
    and should stay stored alongside these normalized aliases.
    """

    normalized = dict(properties)
    if category_id == "radiator":
        if (
            normalized.get("heat_output_w_dt50") in (None, "")
            and normalized.get("heat_output_w_75_65_20") not in (None, "")
        ):
            # 75/65/20 °C has mean water temperature 70 °C, hence ΔT = 50 K.
            normalized["heat_output_w_dt50"] = normalized[
                "heat_output_w_75_65_20"
            ]
    elif category_id == "hrv_unit":
        if (
            normalized.get("max_airflow_m3h") in (None, "")
            and normalized.get("max_airflow_m3h_at_200_pa") not in (None, "")
        ):
            normalized["max_airflow_m3h"] = normalized[
                "max_airflow_m3h_at_200_pa"
            ]
        if (
            normalized.get("specific_power_input_w_m3h") in (None, "")
            and normalized.get("sfp_wh_m3_at_350_m3h_100pa") not in (None, "")
        ):
            # Wh/m3 is numerically W/(m3/h).
            normalized["specific_power_input_w_m3h"] = normalized[
                "sfp_wh_m3_at_350_m3h_100pa"
            ]
    return normalized


def missing_teo_properties(category_id: str, properties: Mapping[str, object]) -> list[str]:
    category = CATEGORY_DEFINITIONS[category_id]
    normalized = normalize_teo_properties(category_id, properties)
    return [
        key
        for key in category.required_properties
        if normalized.get(key) in (None, "")
    ]


def teo_role(category_id: str) -> str:
    return CATEGORY_DEFINITIONS[category_id].teo_role
