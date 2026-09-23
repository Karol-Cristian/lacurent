from __future__ import annotations

from copy import deepcopy
from typing import Any

from .methodology import methodology
from .models import (
    BuildingInput,
    CoolingInput,
    DhwInput,
    HeatingInput,
    HeatingSystemType,
    RenewablesInput,
    model_to_dict,
)


def _reference_target_u(element: dict[str, Any], rules: dict[str, Any]) -> float | None:
    element_type = str(element.get("type") or "")
    boundary = str(element.get("boundary_type") or "outside_air")
    if element_type == "floor":
        if boundary == "adjacent_heated_space":
            return None
        by_boundary = rules.get("floor_u_values_by_boundary_w_m2k", {})
        value = by_boundary.get(boundary, rules["u_values_w_m2k"].get("floor"))
        return float(value) if value is not None else None
    value = rules["u_values_w_m2k"].get(element_type)
    return float(value) if value is not None else None


def _ground_reference_construction_u(
    element: dict[str, Any],
    target_effective_u_w_m2k: float,
) -> float:
    """Invert the Light Engine ISO 13370 slab path for a target effective U'.

    The MC001 table value for a slab on ground is a corrected/effective envelope
    target. The engine input, however, is the construction U before the
    geometry-dependent ground coupling is applied. This solver finds the
    construction U that reproduces the target after the ISO 13370 path.
    """

    contact = element.get("ground_contact")
    if not contact:
        return float(target_effective_u_w_m2k)

    from .engine import slab_on_ground_effective_u

    area = float(element["area_m2"])
    perimeter = float(contact["exposed_perimeter_m"])
    wall_thickness = float(contact.get("wall_thickness_m", 0.30))
    ground_lambda = float(contact.get("ground_conductivity_w_mk", 2.0))
    target = float(target_effective_u_w_m2k)

    def effective(construction_u: float) -> float:
        return slab_on_ground_effective_u(
            construction_u,
            area,
            perimeter,
            wall_thickness,
            ground_lambda,
        )

    low = 0.01
    high = 2.0
    while effective(high) < target and high < 100.0:
        high *= 2.0
    if effective(low) > target or effective(high) < target:
        raise ValueError("Reference slab target is outside the ISO 13370 inversion range.")

    for _ in range(80):
        middle = (low + high) / 2.0
        if effective(middle) < target:
            low = middle
        else:
            high = middle
    return (low + high) / 2.0


def _reference_calculation_u(element: dict[str, Any], rules: dict[str, Any]) -> float | None:
    target = _reference_target_u(element, rules)
    if target is None:
        return None
    if str(element.get("type")) == "floor" and str(element.get("boundary_type")) == "ground":
        return _ground_reference_construction_u(element, target)
    return target


def _equivalent_insulation_cm(base_u: float, target_construction_u: float, lambda_w_mk: float) -> float:
    added_r = max(0.0, (1.0 / float(target_construction_u)) - (1.0 / float(base_u)))
    return round(added_r * float(lambda_w_mk) * 100.0, 1)


def reference_physical_mapping(actual: BuildingInput) -> dict[str, Any]:
    """Map source-backed reference U' targets to transparent physical equivalents.

    These layer stacks are a LaCurent visualization of the normative U' targets,
    not a claim that MC001 prescribes a unique material or thickness.
    """

    rules = methodology()["reference_building"]
    physical = rules["physical_mapping"]
    data = model_to_dict(actual)
    by_type: dict[str, dict[str, Any]] = {}
    for element in data["envelope"]:
        by_type.setdefault(str(element["type"]), element)

    mapping: dict[str, Any] = {
        "source": rules.get("envelope_source"),
        "source_status": rules.get("envelope_source_status"),
        "context": rules.get("reference_context"),
    }

    wall = by_type.get("exterior_wall")
    if wall:
        target = _reference_target_u(wall, rules)
        calculation_u = _reference_calculation_u(wall, rules)
        spec = physical["wall"]
        mapping["wall"] = {
            "target_u_prime_w_m2k": target,
            "calculation_u_w_m2k": calculation_u,
            "base_u_w_m2k": float(spec["base_u_w_m2k"]),
            "insulation_cm": _equivalent_insulation_cm(
                float(spec["base_u_w_m2k"]),
                float(calculation_u),
                float(spec["insulation_lambda_w_mk"]),
            ),
            "material_id": spec["material_id"],
            "material_label": spec["material_label"],
            "insulation_lambda_w_mk": float(spec["insulation_lambda_w_mk"]),
            "support_description": spec["support_description"],
            "mapping_status": "equivalent_physical_visualization",
        }

    roof = by_type.get("roof")
    if roof:
        target = _reference_target_u(roof, rules)
        calculation_u = _reference_calculation_u(roof, rules)
        roof_boundary = str(roof.get("boundary_type") or "outside_air")
        spec = physical["roof"]
        base_u = float(
            spec.get("base_u_by_boundary_w_m2k", {}).get(
                roof_boundary,
                spec["base_u_w_m2k"],
            )
        )
        mapping["roof"] = {
            "target_u_prime_w_m2k": target,
            "calculation_u_w_m2k": calculation_u,
            "base_u_w_m2k": base_u,
            "insulation_cm": _equivalent_insulation_cm(
                base_u,
                float(calculation_u),
                float(spec["insulation_lambda_w_mk"]),
            ),
            "material_id": spec["material_id"],
            "material_label": spec["material_label"],
            "insulation_lambda_w_mk": float(spec["insulation_lambda_w_mk"]),
            "support_description": spec["support_description"],
            "mapping_status": "equivalent_physical_visualization",
        }

    floor = by_type.get("floor")
    if floor:
        target = _reference_target_u(floor, rules)
        calculation_u = _reference_calculation_u(floor, rules)
        spec = physical["floor"]
        if target is None or calculation_u is None:
            mapping["floor"] = {
                "target_u_prime_w_m2k": None,
                "calculation_u_w_m2k": float(floor["u_value_w_m2k"]),
                "base_u_w_m2k": float(spec["base_u_w_m2k"]),
                "insulation_cm": 0.0,
                "material_id": spec["material_id"],
                "material_label": spec["material_label"],
                "insulation_lambda_w_mk": float(spec["insulation_lambda_w_mk"]),
                "support_description": "Frontieră către spațiu încălzit: transfer termic de referință zero.",
                "mapping_status": "adjacent_heated_zero_transfer",
            }
        else:
            mapping["floor"] = {
                "target_u_prime_w_m2k": target,
                "calculation_u_w_m2k": calculation_u,
                "base_u_w_m2k": float(spec["base_u_w_m2k"]),
                "insulation_cm": _equivalent_insulation_cm(
                    float(spec["base_u_w_m2k"]),
                    float(calculation_u),
                    float(spec["insulation_lambda_w_mk"]),
                ),
                "material_id": spec["material_id"],
                "material_label": spec["material_label"],
                "insulation_lambda_w_mk": float(spec["insulation_lambda_w_mk"]),
                "support_description": spec["support_description"],
                "mapping_status": (
                    "iso13370_ground_inverse"
                    if str(floor.get("boundary_type")) == "ground"
                    else "equivalent_physical_visualization"
                ),
            }

    mapping["window"] = {
        "target_u_prime_w_m2k": float(rules["u_values_w_m2k"]["window"]),
        "product_description": physical["window"]["product_description"],
    }
    mapping["exterior_door"] = {
        "target_u_prime_w_m2k": float(rules["u_values_w_m2k"]["exterior_door"]),
        "product_description": physical["exterior_door"]["product_description"],
    }
    return mapping


def build_reference_input(actual: BuildingInput) -> BuildingInput:
    """Create the source-backed residential reference envelope with the same engine."""

    data = model_to_dict(actual)
    rules = methodology()["reference_building"]

    for element in data["envelope"]:
        if str(element.get("type")) == "floor" and str(element.get("boundary_type")) == "ground":
            if element.get("ground_contact"):
                element["ground_contact"]["edge_psi_w_mk"] = 0.0
        reference_u = _reference_calculation_u(element, rules)
        if reference_u is not None:
            element["u_value_w_m2k"] = reference_u

    data["thermal_bridges"] = []
    data["ventilation"] = {
        "air_changes_per_hour": rules["air_changes_per_hour"],
        "heat_recovery_efficiency": rules["heat_recovery_efficiency"],
    }
    data["heating"] = HeatingInput(
        system_type=HeatingSystemType.condensing_gas_boiler,
        efficiency=rules["heating_efficiency"],
    )
    data["heating"] = model_to_dict(data["heating"])
    data["cooling"] = CoolingInput(
        enabled=actual.cooling.enabled,
        seer=rules["cooling_seer"] if actual.cooling.enabled else None,
        setpoint_c=actual.cooling.setpoint_c,
    )
    data["cooling"] = model_to_dict(data["cooling"])
    data["dhw"] = DhwInput(
        enabled=actual.dhw.enabled,
        occupants=actual.dhw.occupants,
        litres_per_person_day_at_60c=actual.dhw.litres_per_person_day_at_60c,
        efficiency=rules["dhw_efficiency"],
    )
    data["dhw"] = model_to_dict(data["dhw"])

    # Tabel 2.4 defines the reference envelope. The Light Engine system values
    # remain explicit LaCurent assumptions until a separate reviewed MC001
    # system-reference registry is integrated.
    data["renewables"] = model_to_dict(RenewablesInput())

    return BuildingInput(**deepcopy(data))
