"""Independent envelope transmission aggregation."""

from __future__ import annotations

from .models import ensure_non_negative, ensure_positive


BOUNDARY_COMPONENTS = {
    "outside_air": "Hd",
    "ground": "Hg",
    "unheated_space": "Hu",
    "unheated_attic": "Hu",
    "unheated_basement": "Hu",
    "adjacent_space": "Ha",
    "adjacent_heated_space": "Ha",
    "adjacent_unheated_space": "Ha",
}


def component_for_boundary(boundary_type: str) -> str:
    try:
        return BOUNDARY_COMPONENTS[boundary_type]
    except KeyError as exc:
        raise ValueError(f"unsupported boundary type {boundary_type}") from exc


def element_contribution(element: dict, assemblies: dict[str, dict]) -> dict:
    area = ensure_positive(element["area_m2"], "area_m2")
    if "u_value_w_m2k" in element:
        u_value = ensure_positive(element["u_value_w_m2k"], "u_value_w_m2k")
        u_origin = "explicit_element_u_value"
        assembly_id = None
    else:
        assembly_id = element["assembly_id"]
        u_value = assemblies[assembly_id]["u_value_w_m2k"]
        u_origin = assemblies[assembly_id]["u_value_origin"]

    component = component_for_boundary(element["boundary_type"])
    if component == "Hd":
        factor = 1.0
        factor_origin = "direct_exterior_boundary_factor_one"
    else:
        factor = ensure_non_negative(
            element.get("boundary_correction_factor"), "boundary_correction_factor"
        )
        factor_origin = "explicit_boundary_correction_factor"

    contribution = area * u_value * factor
    return {
        "element_id": element["element_id"],
        "element_type": element.get("element_type"),
        "boundary_type": element["boundary_type"],
        "component": component,
        "area_m2": area,
        "u_value_w_m2k": u_value,
        "u_value_origin": u_origin,
        "assembly_id": assembly_id,
        "boundary_correction_factor": factor,
        "boundary_correction_origin": factor_origin,
        "contribution_w_k": contribution,
    }


def bridge_contribution(bridge: dict, kind: str) -> dict:
    component = bridge["component"]
    if component not in {"Hd", "Hg", "Hu", "Ha"}:
        raise ValueError(f"unsupported bridge component {component}")
    if kind == "linear":
        length = ensure_positive(bridge["length_m"], "bridge_length_m")
        psi = float(bridge["psi_w_mk"])
        return {
            "bridge_id": bridge["bridge_id"],
            "bridge_type": "linear",
            "component": component,
            "length_m": length,
            "psi_w_mk": psi,
            "contribution_w_k": length * psi,
            "source_reference": bridge.get("source_reference"),
        }
    chi = float(bridge["chi_w_k"])
    return {
        "bridge_id": bridge["bridge_id"],
        "bridge_type": "point",
        "component": component,
        "chi_w_k": chi,
        "contribution_w_k": chi,
        "source_reference": bridge.get("source_reference"),
    }


def calculate_envelope(envelope: dict, assemblies: dict[str, dict]) -> dict:
    elements = [element_contribution(item, assemblies) for item in envelope["elements"]]
    bridges = [
        bridge_contribution(item, "linear")
        for item in envelope.get("linear_bridges", [])
    ] + [
        bridge_contribution(item, "point")
        for item in envelope.get("point_bridges", [])
    ]
    components = {
        key: {"element_w_k": 0.0, "bridge_w_k": 0.0, "total_w_k": 0.0}
        for key in ("Hd", "Hg", "Hu", "Ha")
    }
    for item in elements:
        components[item["component"]]["element_w_k"] += item["contribution_w_k"]
    for item in bridges:
        components[item["component"]]["bridge_w_k"] += item["contribution_w_k"]
    for key, component in components.items():
        component["total_w_k"] = component["element_w_k"] + component["bridge_w_k"]
    htr = sum(component["total_w_k"] for component in components.values())
    return {
        "elements": elements,
        "thermal_bridges": bridges,
        "components": components,
        "htr_w_k": htr,
        "branch": "explicit_elements_boundaries_and_bridges",
    }

