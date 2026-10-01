from __future__ import annotations

import json
from typing import Any

from .heating_optimization import (
    commercialize_heating_finalist,
    heat_pump_monthly_performance_profile,
)
from .home_lab_payload import embed_lab_result_payload
from .models import BuildingInput, model_to_dict, model_to_json
from .optimization import CandidateEvaluationV1, OptimizationRequestV1
from .optimization_v3 import verify_one_candidate_v3


def _decode_object(payload: str | dict[str, Any] | None) -> dict[str, Any]:
    if payload is None:
        return {}
    if isinstance(payload, str):
        value = json.loads(payload)
    else:
        value = payload
    if not isinstance(value, dict):
        raise ValueError("TEO RBPE RPC payload must be an object.")
    return dict(value)


def verify_teo_candidate_json(
    optimization_request_payload: str | dict[str, Any],
    fast_candidate_payload: str | dict[str, Any],
    branch_id: str,
    catalog_payload: str | dict[str, Any],
    heating_catalog_payload: str | dict[str, Any] | None = None,
    baseline_annual_bill_lei: float | None = None,
) -> str:
    """Run one canonical TEO finalist entirely inside the RBPE worker."""

    optimization_request = OptimizationRequestV1(
        **_decode_object(optimization_request_payload)
    )
    fast_candidate = CandidateEvaluationV1(
        **_decode_object(fast_candidate_payload)
    )
    catalog = _decode_object(catalog_payload)
    heating_catalog = _decode_object(heating_catalog_payload)

    verified = verify_one_candidate_v3(
        optimization_request,
        fast_candidate=fast_candidate,
        branch_id=str(branch_id),
        catalog=catalog,
        heating_catalog=heating_catalog,
        baseline_annual_bill_lei=baseline_annual_bill_lei,
    )
    return model_to_json(verified)


def commercialize_teo_candidate_json(
    candidate_payload: str | dict[str, Any],
    original_building_payload: str | dict[str, Any],
    heating_catalog_payload: str | dict[str, Any] | None,
    branch_id: str,
) -> str:
    """Run PRODUCT's exact equipment-backed RBPE pass inside the RBPE worker."""

    candidate = CandidateEvaluationV1(**_decode_object(candidate_payload))
    original_building = BuildingInput(**_decode_object(original_building_payload))
    heating_catalog = _decode_object(heating_catalog_payload)

    (
        commercial_candidate,
        matched_product,
        warnings,
        commercial_engine_result,
    ) = commercialize_heating_finalist(
        candidate,
        original_building=original_building,
        heating_catalog=heating_catalog,
        branch_id=str(branch_id),
        return_result=True,
    )

    matched_quantity = next(
        (
            max(1, int(float(line.quantity or 1)))
            for line in commercial_candidate.cost_breakdown
            if (
                line.family == "heating"
                and line.product_id is not None
                and matched_product is not None
                and line.product_id == matched_product.id
            )
        ),
        1,
    )

    scenario = (
        embed_lab_result_payload(commercial_engine_result)
        if commercial_engine_result is not None
        else None
    )

    heat_pump_profile: dict[str, Any] | None = None
    if (
        commercial_engine_result is not None
        and matched_product is not None
        and commercial_candidate.resulting_configuration is not None
    ):
        heat_pump_profile = heat_pump_monthly_performance_profile(
            commercial_candidate.resulting_configuration,
            matched_product,
            list(commercial_engine_result.monthly),
            quantity=matched_quantity,
        )
        if heat_pump_profile is not None:
            heat_pump_profile["engine_performance_kind"] = (
                commercial_engine_result.heating_system.generator_performance_kind
            )
            heat_pump_profile["engine_performance_value"] = float(
                commercial_engine_result.heating_system.generator_performance
            )
            heat_pump_profile["effective_system_performance"] = float(
                commercial_engine_result.heating_system.effective_system_performance
            )
            heat_pump_profile["performance_source"] = (
                commercial_engine_result.heating_system.performance_source
            )

    payload = {
        "candidate": model_to_dict(commercial_candidate),
        "matchedProduct": (
            None if matched_product is None else model_to_dict(matched_product)
        ),
        "matchedProductQuantity": matched_quantity,
        "scenario": scenario,
        "heatPumpPerformanceProfile": heat_pump_profile,
        "warnings": warnings,
    }
    return json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    )
