"""Independent opaque/direct-U assembly calculations.

Formula audit:
- total resistance: MC001-2022 relation (2.6).
- U-value: MC001-2022 relation (2.7).
- direct U override: explicit input path, no formula-derived expectation.
"""

from __future__ import annotations

from .materials import layer_resistance
from .models import ensure_non_negative, ensure_positive


def calculate_assembly(assembly: dict, materials: dict[str, dict]) -> dict:
    assembly_id = assembly["assembly_id"]
    if "direct_u_w_m2k" in assembly:
        u_value = ensure_positive(assembly["direct_u_w_m2k"], "direct_u_w_m2k")
        return {
            "assembly_id": assembly_id,
            "assembly_type": assembly.get("assembly_type"),
            "u_value_w_m2k": u_value,
            "u_value_origin": "explicit_direct_u_value",
            "total_resistance_m2k_w": 1.0 / u_value,
            "layers": [],
            "air_layers": [],
            "rsi_m2k_w": None,
            "rse_m2k_w": None,
            "branch": "direct_u_override",
        }

    rsi = ensure_non_negative(assembly.get("rsi_m2k_w"), "rsi_m2k_w")
    rse = ensure_non_negative(assembly.get("rse_m2k_w"), "rse_m2k_w")
    layer_results = []
    for layer in assembly.get("layers", []):
        material = materials[layer["material_id"]]
        resistance = layer_resistance(layer["thickness_m"], material["lambda_design_w_mk"])
        layer_results.append({
            "layer_id": layer["layer_id"],
            "material_id": layer["material_id"],
            "thickness_m": float(layer["thickness_m"]),
            "lambda_w_mk": material["lambda_design_w_mk"],
            "resistance_m2k_w": resistance,
        })

    air_layers = []
    for air_layer in assembly.get("air_layers", []):
        resistance = ensure_non_negative(air_layer["resistance_m2k_w"], "air_layer_resistance")
        air_layers.append({
            "air_layer_id": air_layer["air_layer_id"],
            "resistance_m2k_w": resistance,
            "source_reference": air_layer.get("source_reference"),
        })

    total_resistance = (
        rsi
        + sum(layer["resistance_m2k_w"] for layer in layer_results)
        + sum(layer["resistance_m2k_w"] for layer in air_layers)
        + rse
    )
    u_value = 1.0 / ensure_positive(total_resistance, "total_resistance")
    return {
        "assembly_id": assembly_id,
        "assembly_type": assembly.get("assembly_type"),
        "u_value_w_m2k": u_value,
        "u_value_origin": "calculated_from_layers_surfaces_and_air_layers",
        "total_resistance_m2k_w": total_resistance,
        "layers": layer_results,
        "air_layers": air_layers,
        "rsi_m2k_w": rsi,
        "rse_m2k_w": rse,
        "branch": "layered_assembly",
    }


def assembly_results(assemblies: list[dict], materials: dict[str, dict]) -> dict[str, dict]:
    return {
        assembly["assembly_id"]: calculate_assembly(assembly, materials)
        for assembly in assemblies
    }

