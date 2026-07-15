"""Independent material calculations.

Formula audit:
- design_lambda: MC001-2022 2.1.4, relation (2.3), W/(m*K).
- layer_resistance: MC001-2022 2.4.1 thermal resistance method, m2*K/W.
"""

from __future__ import annotations

from .models import ensure_positive


def design_lambda(material: dict) -> dict:
    if "lambda_w_mk" in material:
        value = ensure_positive(material["lambda_w_mk"], "lambda_w_mk")
        return {
            "material_id": material["material_id"],
            "lambda_design_w_mk": value,
            "lambda_origin": "explicit_lambda",
            "source_reference": material.get("source_reference"),
        }

    lambda_normat = ensure_positive(material.get("lambda_normat_w_mk"), "lambda_normat_w_mk")
    coefficient = ensure_positive(
        material.get("correction_coefficient"), "correction_coefficient"
    )
    return {
        "material_id": material["material_id"],
        "lambda_normat_w_mk": lambda_normat,
        "correction_coefficient": coefficient,
        "lambda_design_w_mk": lambda_normat * coefficient,
        "lambda_origin": "MC001_2_3_relation",
        "correction_source": material.get("correction_source"),
        "source_reference": material.get("source_reference"),
    }


def layer_resistance(thickness_m: float, lambda_w_mk: float) -> float:
    thickness = ensure_positive(thickness_m, "thickness_m")
    conductivity = ensure_positive(lambda_w_mk, "lambda_w_mk")
    return thickness / conductivity


def material_results(materials: dict[str, dict]) -> dict[str, dict]:
    return {material_id: design_lambda({"material_id": material_id, **material})
            for material_id, material in materials.items()}

