from __future__ import annotations

import asyncio
import gc
import json
import math
import time
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .engine import calculate
from .home_lab_payload import embed_lab_result_payload
from .methodology import methodology, resolve_locality
from .models import BuildingInput, model_to_dict
from .optimization import (
    CandidateEvaluationV1,
    OptimizationMode,
    OptimizationRequestV1,
    OptimizationSearchBoundsV1,
    ParametricMeasuresV1,
    clear_baseline_evaluation_cache,
)
from .optimization_v2 import (
    evaluate_worker_safe_branch_v2,
    select_optimization_candidate_v2,
)
from .optimization_v3 import (
    V3_BRANCH_BATCH_SIZE,
    build_verification_plan_v3,
    build_worker_safe_plan_v3,
    verify_one_candidate_v3,
)
from .heating_optimization import (
    HeatingBranchSummaryV1,
    commercialize_heating_finalist,
    heating_branch_plan,
    heating_planning_options,
    heat_pump_monthly_performance_profile,
)
from .heating_catalog_store import (
    cached_heating_branch_catalog_from_d1,
    cached_heating_catalog_from_d1,
    cached_heating_catalog_summary_from_d1,
    clear_heating_optimizer_runtime_caches,
    read_heating_commercial_candidate_catalog_from_d1,
    read_heating_public_catalog_from_d1,
    read_heating_public_products_from_d1,
    seed_heating_branch_catalog_payload,
    seed_heating_catalog_payload,
    seed_heating_catalog_summary_payload,
    seed_heating_commercial_candidate_catalog_payload,
    seed_heating_public_catalog_payload,
)
from .teo_v4 import build_teo_v4_kernel

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
ROI_COST_BASIS_PATH = DATA_DIR / "roi-cost-basis.seed.json"
ROI_COST_BASIS_CACHE_SECONDS = 900
ROI_COST_BASIS_RETRY_SECONDS = 30

_roi_cost_basis_lock = asyncio.Lock()
_roi_cost_basis_cached_payload: dict[str, Any] | None = None
_roi_cost_basis_cache_expires_at = 0.0
_roi_cost_basis_retry_after = 0.0

app = FastAPI(
    title="LaCurent TEO Private",
    version="1.0.0",
    description="Minimal private TEO calculation surface.",
)

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "teo-private-minimal"}


async def _verify_candidate_via_rbpe(
    request: Request,
    *,
    optimization_request: OptimizationRequestV1,
    fast_candidate: CandidateEvaluationV1,
    branch_id: str,
    cost_catalog: dict[str, Any],
    heating_catalog: dict[str, Any],
    baseline_annual_bill_lei: float | None,
) -> tuple[dict[str, Any], str]:
    """Execute canonical finalist physics in the dedicated RBPE service."""

    env = request.scope.get("env")
    service = getattr(env, "REFERENCE_RBPE", None) if env is not None else None
    if env is not None:
        if service is None:
            raise RuntimeError("Private RBPE service binding is unavailable for VERIFY.")
        raw_json = await service.verify_teo_candidate_json(
            json.dumps(model_to_dict(optimization_request), ensure_ascii=True, separators=(",", ":")),
            json.dumps(model_to_dict(fast_candidate), ensure_ascii=True, separators=(",", ":")),
            branch_id,
            json.dumps(cost_catalog, ensure_ascii=True, separators=(",", ":")),
            json.dumps(heating_catalog, ensure_ascii=True, separators=(",", ":")),
            baseline_annual_bill_lei,
        )
        payload = json.loads(str(raw_json))
        if not isinstance(payload, dict) or not isinstance(payload.get("candidate"), dict):
            raise ValueError("Private RBPE VERIFY returned an invalid payload.")
        return payload, "private-rbpe-sharded"

    # Local/unit-test fallback only. Cloudflare TEO must never execute this path.
    verified = verify_one_candidate_v3(
        optimization_request,
        fast_candidate=fast_candidate,
        branch_id=branch_id,
        catalog=cost_catalog,
        heating_catalog=heating_catalog,
        baseline_annual_bill_lei=baseline_annual_bill_lei,
    )
    return model_to_dict(verified), "local-test-fallback"


async def _commercialize_candidate_via_rbpe(
    request: Request,
    *,
    candidate: CandidateEvaluationV1,
    original_building: BuildingInput,
    heating_catalog: dict[str, Any],
    branch_id: str,
) -> tuple[dict[str, Any], str]:
    """Execute PRODUCT's exact equipment-backed physics in RBPE shards."""

    env = request.scope.get("env")
    service = getattr(env, "REFERENCE_RBPE", None) if env is not None else None
    if env is not None:
        if service is None:
            raise RuntimeError("Private RBPE service binding is unavailable for PRODUCT.")
        raw_json = await service.commercialize_teo_candidate_json(
            json.dumps(model_to_dict(candidate), ensure_ascii=True, separators=(",", ":")),
            json.dumps(model_to_dict(original_building), ensure_ascii=True, separators=(",", ":")),
            json.dumps(heating_catalog, ensure_ascii=True, separators=(",", ":")),
            branch_id,
        )
        payload = json.loads(str(raw_json))
        if not isinstance(payload, dict) or not isinstance(payload.get("candidate"), dict):
            raise ValueError("Private RBPE PRODUCT returned an invalid payload.")
        return payload, "private-rbpe-sharded"

    # Local/unit-test fallback only.
    (
        commercial_candidate,
        matched_product,
        warnings,
        commercial_engine_result,
    ) = commercialize_heating_finalist(
        candidate,
        original_building=original_building,
        heating_catalog=heating_catalog,
        branch_id=branch_id,
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
    return {
        "candidate": model_to_dict(commercial_candidate),
        "matchedProduct": None if matched_product is None else model_to_dict(matched_product),
        "matchedProductQuantity": matched_quantity,
        "scenario": scenario,
        "heatPumpPerformanceProfile": heat_pump_profile,
        "warnings": warnings,
    }, "local-test-fallback"



TEO_FLOW_MAX_VERIFICATIONS = 3
TEO_FLOW_COOLDOWN_MS = 1800
TEO_FLOW_LEASE_MS = 30000
_teo_flow_schema_lock = asyncio.Lock()
_teo_flow_schema_ready = False
TEO_FLOW_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS teo_verification_runs (
    run_id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'ready',
    planned_verifications INTEGER NOT NULL DEFAULT 1,
    verified_count INTEGER NOT NULL DEFAULT 0,
    next_allowed_at_ms INTEGER NOT NULL DEFAULT 0,
    in_flight INTEGER NOT NULL DEFAULT 0,
    lease_token TEXT,
    lease_expires_at_ms INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

ENVELOPE_PROFILES: dict[str, dict[str, float]] = {
    "poor": {"wall": 1.30, "roof": 1.00, "floor": 0.90, "window": 2.80, "door": 2.50, "psi": 0.15},
    "average": {"wall": 0.55, "roof": 0.35, "floor": 0.45, "window": 1.60, "door": 1.80, "psi": 0.08},
    "good": {"wall": 0.30, "roof": 0.20, "floor": 0.30, "window": 1.10, "door": 1.40, "psi": 0.05},
    "very_good": {"wall": 0.18, "roof": 0.15, "floor": 0.20, "window": 0.85, "door": 1.10, "psi": 0.03},
}

SOLAR_ORIENTATION_FIELDS: dict[str, str] = {
    "south": "solar_window_area_south_m2",
    "south_west": "solar_window_area_south_west_m2",
    "west": "solar_window_area_west_m2",
    "north_west": "solar_window_area_north_west_m2",
    "north": "solar_window_area_north_m2",
    "north_east": "solar_window_area_north_east_m2",
    "east": "solar_window_area_east_m2",
    "south_east": "solar_window_area_south_east_m2",
}


VENTILATION_PROFILES: dict[str, tuple[float, float]] = {
    "natural": (0.50, 0.0),
    "mechanical": (0.60, 0.0),
    "heat_recovery": (0.45, 0.75),
    "unknown": (0.50, 0.0),
}

def _heating_profile(system_type: str, cost_profile: str, *, efficiency: float | None = None, carrier: str | None = None) -> dict[str, Any]:
    defaults = methodology()["heating_system_defaults"][system_type]
    return {
        "system_type": system_type,
        "carrier": carrier or defaults["carrier"],
        "efficiency": efficiency if efficiency is not None else defaults.get("efficiency"),
        "scop": defaults.get("scop", 3.2),
        "cost_profile": cost_profile,
    }


HEATING_CHAIN_PROFILES: dict[str, dict[str, str]] = {
    "condensing_gas_boiler": {
        "generator_type": "condensing_gas_boiler",
        "emitter_type": "radiators_high_temp",
        "distribution_type": "hydronic_insulated",
        "storage_type": "none",
        "control_type": "room_thermostat",
    },
    "gas_boiler": {
        "generator_type": "gas_boiler",
        "emitter_type": "radiators_high_temp",
        "distribution_type": "hydronic_insulated",
        "storage_type": "none",
        "control_type": "room_thermostat",
    },
    "electric_resistance": {
        "generator_type": "electric_direct",
        "emitter_type": "local",
        "distribution_type": "local",
        "storage_type": "none",
        "control_type": "room_thermostat",
    },
    "electric_boiler": {
        "generator_type": "electric_boiler",
        "emitter_type": "radiators_high_temp",
        "distribution_type": "hydronic_insulated",
        "storage_type": "none",
        "control_type": "room_thermostat",
    },
    "heat_pump": {
        "generator_type": "heat_pump_air_water",
        "emitter_type": "underfloor",
        "distribution_type": "underfloor",
        "storage_type": "none",
        "control_type": "zoned",
    },
    "district_heat": {
        "generator_type": "district_heat",
        "emitter_type": "radiators_high_temp",
        "distribution_type": "hydronic_insulated",
        "storage_type": "none",
        "control_type": "thermostatic_valves",
    },
    "wood_stove": {
        "generator_type": "wood_stove",
        "emitter_type": "local",
        "distribution_type": "local",
        "storage_type": "none",
        "control_type": "manual",
    },
    "wood_boiler": {
        "generator_type": "wood_boiler",
        "emitter_type": "radiators_high_temp",
        "distribution_type": "hydronic_insulated",
        "storage_type": "none",
        "control_type": "room_thermostat",
    },
    "pellet_boiler": {
        "generator_type": "pellet_boiler",
        "emitter_type": "radiators_high_temp",
        "distribution_type": "hydronic_insulated",
        "storage_type": "buffer_small",
        "control_type": "room_thermostat",
    },
}


HYDRONIC_HEATING_EMITTERS = {
    "radiators_high_temp",
    "radiators_low_temp",
    "underfloor",
    "fan_coils",
}
HYDRONIC_PIPE_DISTRIBUTIONS = {
    "hydronic_insulated",
    "hydronic_uninsulated",
}
HEAT_PUMP_GENERATORS = {
    "heat_pump_air_water",
    "heat_pump_ground_water",
    "heat_pump_air_air",
}


def _normalize_home_lab_heating_chain(
    heating_choice: str,
    raw: dict[str, Any],
) -> dict[str, Any]:
    """Return a physically coherent Home Lab chain for the selected generator.

    UI state can contain stale values from a previously selected generator.
    Those values must never change the calculation after the generator changes.
    """

    defaults = HEATING_CHAIN_PROFILES.get(
        heating_choice,
        HEATING_CHAIN_PROFILES["condensing_gas_boiler"],
    )
    details = {**defaults, **raw}

    if heating_choice == "electric_resistance":
        details.update(
            {
                "generator_type": "electric_direct",
                "emitter_type": "local",
                "distribution_type": "local",
                "storage_type": "none",
                "control_type": "room_thermostat",
                "design_flow_temperature_c": None,
                "design_return_temperature_c": None,
            }
        )
        return details

    if heating_choice == "wood_stove":
        details.update(
            {
                "generator_type": "wood_stove",
                "emitter_type": "local",
                "distribution_type": "local",
                "storage_type": "none",
                "control_type": "manual",
                "design_flow_temperature_c": None,
                "design_return_temperature_c": None,
            }
        )
        return details

    if heating_choice == "heat_pump":
        generator = str(details.get("generator_type") or "heat_pump_air_water")
        if generator not in HEAT_PUMP_GENERATORS:
            generator = "heat_pump_air_water"
        details["generator_type"] = generator

        if generator == "heat_pump_air_air":
            details.update(
                {
                    "emitter_type": "air",
                    "distribution_type": "air",
                    "storage_type": "none",
                    "design_flow_temperature_c": None,
                    "design_return_temperature_c": None,
                }
            )
            return details
    else:
        # For every non-heat-pump Home Lab choice the generator subtype is
        # determined by the selected generator, never by stale heat-pump state.
        details["generator_type"] = defaults["generator_type"]

    emitter = str(details.get("emitter_type") or defaults["emitter_type"])
    if emitter not in HYDRONIC_HEATING_EMITTERS:
        emitter = defaults["emitter_type"]
        if emitter not in HYDRONIC_HEATING_EMITTERS:
            emitter = "radiators_high_temp"
    details["emitter_type"] = emitter

    if emitter == "underfloor":
        details["distribution_type"] = "underfloor"
    else:
        distribution = str(details.get("distribution_type") or defaults["distribution_type"])
        if distribution not in HYDRONIC_PIPE_DISTRIBUTIONS:
            distribution = "hydronic_insulated"
        details["distribution_type"] = distribution

    return details


HEATING_PROFILES: dict[str, dict[str, Any]] = {
    "condensing_gas_boiler": _heating_profile("condensing_gas_boiler", "natural_gas"),
    "gas_boiler": _heating_profile("gas_boiler", "natural_gas"),
    "electric_resistance": _heating_profile("electric_resistance", "electricity"),
    "electric_boiler": _heating_profile("custom", "electricity", efficiency=0.98, carrier="electricity"),
    "heat_pump": _heating_profile("heat_pump", "electricity"),
    "wood_stove": _heating_profile("custom", "firewood", efficiency=0.75, carrier="biomass"),
    "wood_boiler": _heating_profile("custom", "firewood", efficiency=0.80, carrier="biomass"),
    "pellet_boiler": _heating_profile("custom", "pellets", efficiency=0.88, carrier="biomass"),
    "district_heat": _heating_profile("district_heat", "district_heat"),
    "custom": _heating_profile("custom", "other"),
}


def _dhw_default_profile(system_type: str) -> dict[str, Any]:
    profile = methodology()["dhw"]["system_defaults"].get(system_type)
    if profile is None:
        raise ValueError(f"Sistem ACM nesuportat: {system_type}")
    return {
        "system_type": system_type,
        "carrier": profile["carrier"],
        "efficiency": profile.get("efficiency"),
        "cop": profile.get("cop"),
    }


def _dhw_same_as_heating_profile(
    heating_choice: str,
    heating: dict[str, Any],
) -> dict[str, Any]:
    if heating_choice in {"gas_boiler", "condensing_gas_boiler"}:
        profile = _dhw_default_profile("gas_boiler")
    elif heating_choice in {"electric_resistance", "electric_boiler"}:
        profile = _dhw_default_profile("electric_boiler")
    elif heating_choice == "heat_pump":
        profile = _dhw_default_profile("heat_pump_water_heater")
    elif heating_choice == "district_heat":
        profile = _dhw_default_profile("district_heat")
    elif heating_choice in {"wood_stove", "wood_boiler", "pellet_boiler"}:
        fallback = {"wood_stove": 0.75, "wood_boiler": 0.80, "pellet_boiler": 0.88}[heating_choice]
        profile = {
            "system_type": "same_as_heating",
            "carrier": "biomass",
            "efficiency": float(heating.get("efficiency") or fallback),
            "cop": None,
        }
    else:
        carrier = str(heating.get("carrier") or "other")
        efficiency = heating.get("efficiency")
        scop = heating.get("scop")
        profile = {
            "system_type": "same_as_heating",
            "carrier": carrier,
            "efficiency": float(efficiency) if efficiency is not None else None,
            "cop": float(scop) if efficiency is None and scop is not None else None,
        }
    profile["system_type"] = "same_as_heating"
    return profile


def _dhw_values_from_form(
    form: dict[str, Any],
    *,
    heating: dict[str, Any],
    heating_choice: str,
    simple: bool,
) -> dict[str, Any]:
    expert = form.get("expert_dhw_override") == "on"
    requested = str(
        form.get("dhw_system_type")
        or ("same_as_heating" if simple and not expert else "custom")
    )

    if expert or not simple:
        cop = parse_optional_float(form.get("dhw_cop"))
        efficiency = parse_optional_float(form.get("dhw_efficiency"))
        if cop is not None:
            efficiency = None
        return {
            "system_type": requested if requested else "custom",
            "carrier": str(form.get("dhw_carrier") or "natural_gas"),
            "efficiency": efficiency if efficiency is not None else (None if cop is not None else 0.85),
            "cop": cop,
        }

    if requested == "same_as_heating":
        return _dhw_same_as_heating_profile(heating_choice, heating)
    return _dhw_default_profile(requested)


def default_form_values() -> dict[str, Any]:
    return {
        "project_name": "",
        "locality_id": "siruta-54984",
        "locality": "Cluj-Napoca",
        "building_type": "residential_individual",
        "building_length_m": 10,
        "building_width_m": 8,
        "heated_levels": 2,
        "average_height_m": 2.7,
        "house_window_area_m2": 20,
        "house_door_area_m2": 2.2,
        "apartment_area_m2": 80,
        "apartment_height_m": 2.65,
        "apartment_exterior_wall_length_m": 12,
        "apartment_window_area_m2": 12,
        "apartment_top_exposed": False,
        "apartment_bottom_exposed": False,
        "heated_floor_area_m2": 160,
        "heated_volume_m3": 432,
        "indoor_design_temperature_c": 20,
        "construction_year": 2005,
        "insulation_profile": "average",
        "solar_gains_kwh_m2_month": 0,
        "solar_mode": "normative_hsol",
        "solar_orientation": "south",
        "solar_glazing_type_id": "double_low_e_face_3",
        "solar_glazing_gn": "",
        "solar_shading_device_id": "",
        "solar_shading_mounting_side": "",
        "solar_window_area_south_m2": 0,
        "solar_window_area_south_west_m2": 0,
        "solar_window_area_west_m2": 0,
        "solar_window_area_north_west_m2": 0,
        "solar_window_area_north_m2": 0,
        "solar_window_area_north_east_m2": 0,
        "solar_window_area_east_m2": 0,
        "solar_window_area_south_east_m2": 0,
        "solar_frame_fraction": 0.20,
        "solar_obstacle_shading_factor": 1.0,
        "solar_sky_view_factor": 0.5,
        "solar_exterior_surface_resistance_m2k_w": 0.04,
        "solar_longwave_radiation_coefficient_w_m2k": 5.0,
        "solar_sky_temperature_difference_k": 11.0,
        "wall_area_m2": 171.8,
        "wall_u_value": 0.55,
        "roof_area_m2": 80,
        "roof_u_value": 0.35,
        "floor_area_m2": 80,
        "floor_u_value": 0.45,
        "window_area_m2": 20,
        "window_u_value": 1.6,
        "door_area_m2": 2.2,
        "door_u_value": 1.8,
        "thermal_bridge_length_m": 72,
        "thermal_bridge_psi_w_mk": 0.08,
        "ventilation_type": "natural",
        "air_changes_per_hour": 0.5,
        "heat_recovery_efficiency": 0,
        "heating_choice": "condensing_gas_boiler",
        "heating_system_type": "condensing_gas_boiler",
        "heating_efficiency": 0.94,
        "heating_scop": 3.2,
        "heating_carrier": "natural_gas",
        "heating_cost_profile": "natural_gas",
        "heating_chain_enabled": False,
        "heating_generator_type": "condensing_gas_boiler",
        "heating_emitter_type": "radiators_high_temp",
        "heating_distribution_type": "hydronic_insulated",
        "heating_storage_type": "none",
        "heating_control_type": "room_thermostat",
        "heating_design_flow_temperature_c": "",
        "heating_design_return_temperature_c": "",
        "heating_auxiliary_electricity_kwh_year": "",
        "cooling_enabled": False,
        "cooling_seer": 3.5,
        "cooling_setpoint_c": 26,
        "dhw_enabled": True,
        "dhw_occupants": 4,
        "dhw_litres_per_person_day_at_60c": 50,
        "dhw_system_type": "same_as_heating",
        "dhw_efficiency": 0.86,
        "dhw_cop": "",
        "dhw_carrier": "natural_gas",
        "pv_enabled": False,
        "pv_installed_power_kwp": 5.0,
        "pv_orientation": "south",
        "pv_tilt_degrees": 30,
        "pv_performance_ratio": 0.82,
        "solar_thermal_enabled": False,
        "solar_thermal_collector_area_m2": 4.0,
        "solar_thermal_orientation": "south",
        "solar_thermal_tilt_degrees": 45,
        "solar_thermal_system_efficiency": 0.45,
        "expert_geometry_override": "",
        "expert_envelope_override": "",
        "expert_ventilation_override": "",
        "expert_heating_override": "",
        "expert_dhw_override": "",
    }


def form_values_from_building(building: BuildingInput) -> dict[str, Any]:
    values = default_form_values()
    try:
        locality = resolve_locality(building.locality)
        values["locality_id"] = locality["id"]
        values["locality"] = locality["name"]
    except Exception:
        values["locality"] = building.locality
    values.update(
        {
            "project_name": building.project_name,
            "heated_floor_area_m2": building.heated_floor_area_m2,
            "heated_volume_m3": building.heated_volume_m3,
            "indoor_design_temperature_c": building.indoor_design_temperature_c,
            "building_type": building.building_type.value,
            "construction_year": building.construction_year,
            "solar_gains_kwh_m2_month": building.solar_gains_kwh_m2_month,
            "solar_mode": building.solar.mode,
            "solar_orientation": building.solar.orientation,
            "solar_glazing_type_id": building.solar.glazing_type_id,
            "solar_glazing_gn": building.solar.normal_incidence_solar_transmittance or "",
            "solar_shading_device_id": building.solar.shading_device_id or "",
            "solar_shading_mounting_side": building.solar.shading_mounting_side or "",
            "solar_frame_fraction": building.solar.frame_fraction,
            "solar_obstacle_shading_factor": building.solar.obstacle_shading_factor,
            "solar_sky_view_factor": building.solar.sky_view_factor,
            "solar_exterior_surface_resistance_m2k_w": building.solar.exterior_surface_resistance_m2k_w,
            "solar_longwave_radiation_coefficient_w_m2k": building.solar.longwave_radiation_coefficient_w_m2k,
            "solar_sky_temperature_difference_k": building.solar.sky_temperature_difference_k,
            "air_changes_per_hour": building.ventilation.air_changes_per_hour,
            "heat_recovery_efficiency": building.ventilation.heat_recovery_efficiency,
            "heating_system_type": building.heating.system_type.value,
            "heating_efficiency": building.heating.efficiency,
            "heating_scop": building.heating.scop,
            "heating_carrier": building.heating.carrier.value,
            "heating_cost_profile": building.heating.cost_profile,
            "heating_generator_type": building.heating.details.generator_type.value if building.heating.details and building.heating.details.generator_type else "",
            "heating_emitter_type": building.heating.details.emitter_type.value if building.heating.details else "radiators_high_temp",
            "heating_distribution_type": building.heating.details.distribution_type.value if building.heating.details else "hydronic_insulated",
            "heating_storage_type": building.heating.details.storage_type.value if building.heating.details else "none",
            "heating_control_type": building.heating.details.control_type.value if building.heating.details else "room_thermostat",
            "heating_design_flow_temperature_c": building.heating.details.design_flow_temperature_c if building.heating.details else "",
            "heating_design_return_temperature_c": building.heating.details.design_return_temperature_c if building.heating.details else "",
            "heating_auxiliary_electricity_kwh_year": building.heating.details.auxiliary_electricity_kwh_year if building.heating.details else "",
            "cooling_enabled": building.cooling.enabled,
            "cooling_seer": building.cooling.seer,
            "cooling_setpoint_c": building.cooling.setpoint_c,
            "dhw_enabled": building.dhw.enabled,
            "dhw_occupants": building.dhw.occupants,
            "dhw_litres_per_person_day_at_60c": building.dhw.litres_per_person_day_at_60c,
            "dhw_system_type": building.dhw.system_type.value,
            "dhw_efficiency": building.dhw.efficiency,
            "dhw_cop": building.dhw.cop,
            "dhw_carrier": building.dhw.carrier.value,
            "pv_enabled": building.renewables.pv.enabled,
            "pv_installed_power_kwp": building.renewables.pv.installed_power_kwp,
            "pv_orientation": building.renewables.pv.orientation,
            "pv_tilt_degrees": building.renewables.pv.tilt_degrees,
            "pv_performance_ratio": building.renewables.pv.performance_ratio,
            "solar_thermal_enabled": building.renewables.solar_thermal.enabled,
            "solar_thermal_collector_area_m2": building.renewables.solar_thermal.collector_area_m2,
            "solar_thermal_orientation": building.renewables.solar_thermal.orientation,
            "solar_thermal_tilt_degrees": building.renewables.solar_thermal.tilt_degrees,
            "solar_thermal_system_efficiency": building.renewables.solar_thermal.system_efficiency,
        }
    )
    for group in building.solar.glazing_groups:
        field = SOLAR_ORIENTATION_FIELDS.get(group.orientation)
        if field:
            values[field] = group.area_m2

    envelope_fields = {
        "exterior_wall": ("wall_area_m2", "wall_u_value"),
        "roof": ("roof_area_m2", "roof_u_value"),
        "floor": ("floor_area_m2", "floor_u_value"),
        "window": ("window_area_m2", "window_u_value"),
        "exterior_door": ("door_area_m2", "door_u_value"),
    }
    for item in building.envelope:
        area_field, u_field = envelope_fields[item.type.value]
        values[area_field] = item.area_m2
        values[u_field] = item.u_value_w_m2k
    if building.thermal_bridges:
        bridge = building.thermal_bridges[0]
        values["thermal_bridge_length_m"] = bridge.length_m
        values["thermal_bridge_psi_w_mk"] = bridge.psi_w_mk
    return values


def parse_optional_float(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    return float(text.replace(",", ".")) if text else None


def parse_optional_int(value: Any) -> int | None:
    if value is None:
        return None
    text = str(value).strip()
    return int(text) if text else None


def _checked(form: dict[str, Any], name: str) -> bool:
    return form.get(name) in {"on", "true", "1", True}


def _simple_form_present(form: dict[str, Any]) -> bool:
    return any(key in form for key in ("building_length_m", "apartment_area_m2", "ventilation_type", "heating_choice"))


def _derived_geometry(form: dict[str, Any], building_type: str) -> dict[str, float]:
    if building_type == "residential_collective":
        area = max(parse_optional_float(form.get("apartment_area_m2")) or 80, 1)
        height = max(parse_optional_float(form.get("apartment_height_m")) or 2.65, 1.8)
        exterior_length = max(parse_optional_float(form.get("apartment_exterior_wall_length_m")) or 12, 1)
        windows = max(parse_optional_float(form.get("apartment_window_area_m2")) or 12, 0.1)
        volume = area * height
        wall = max(exterior_length * height - windows, 0.1)
        roof = area if _checked(form, "apartment_top_exposed") else 0.0
        floor = area if _checked(form, "apartment_bottom_exposed") else 0.0
        return {
            "heated_floor_area_m2": area,
            "heated_volume_m3": volume,
            "wall_area_m2": wall,
            "roof_area_m2": roof,
            "floor_area_m2": floor,
            "window_area_m2": windows,
            "door_area_m2": 0.0,
            "thermal_bridge_length_m": exterior_length,
        }

    length = max(parse_optional_float(form.get("building_length_m")) or 10, 1)
    width = max(parse_optional_float(form.get("building_width_m")) or 8, 1)
    levels = min(max(parse_optional_int(form.get("heated_levels")) or 2, 1), 5)
    height = max(parse_optional_float(form.get("average_height_m")) or 2.7, 1.8)
    windows = max(parse_optional_float(form.get("house_window_area_m2")) or 20, 0.1)
    doors = max(parse_optional_float(form.get("house_door_area_m2")) or 2.2, 0.1)
    footprint = length * width
    heated_area = footprint * levels
    gross_walls = 2 * (length + width) * height * levels
    return {
        "heated_floor_area_m2": heated_area,
        "heated_volume_m3": heated_area * height,
        "wall_area_m2": max(gross_walls - windows - doors, 0.1),
        "roof_area_m2": footprint,
        "floor_area_m2": footprint,
        "window_area_m2": windows,
        "door_area_m2": doors,
        "thermal_bridge_length_m": 2 * (length + width) * levels,
    }


def _technical_values(form: dict[str, Any]) -> dict[str, Any]:
    simple = _simple_form_present(form)
    building_type = str(form.get("building_type") or "residential_individual")
    derived = _derived_geometry(form, building_type) if simple else {}

    geometry_override = form.get("expert_geometry_override") == "on" or not simple
    if geometry_override:
        geometry = {
            key: parse_optional_float(form.get(key))
            for key in (
                "heated_floor_area_m2",
                "heated_volume_m3",
                "wall_area_m2",
                "roof_area_m2",
                "floor_area_m2",
                "window_area_m2",
                "door_area_m2",
                "thermal_bridge_length_m",
            )
        }
    else:
        geometry = derived

    envelope_override = form.get("expert_envelope_override") == "on" or not simple
    profile = ENVELOPE_PROFILES.get(str(form.get("insulation_profile") or "average"), ENVELOPE_PROFILES["average"])
    if envelope_override:
        u_values = {
            "wall_u_value": parse_optional_float(form.get("wall_u_value")),
            "roof_u_value": parse_optional_float(form.get("roof_u_value")),
            "floor_u_value": parse_optional_float(form.get("floor_u_value")),
            "window_u_value": parse_optional_float(form.get("window_u_value")),
            "door_u_value": parse_optional_float(form.get("door_u_value")),
            "thermal_bridge_psi_w_mk": parse_optional_float(form.get("thermal_bridge_psi_w_mk")),
        }
    else:
        u_values = {
            "wall_u_value": profile["wall"],
            "roof_u_value": profile["roof"],
            "floor_u_value": profile["floor"],
            "window_u_value": profile["window"],
            "door_u_value": profile["door"],
            "thermal_bridge_psi_w_mk": profile["psi"],
        }

    ventilation_override = form.get("expert_ventilation_override") == "on" or not simple
    if ventilation_override:
        ach = parse_optional_float(form.get("air_changes_per_hour"))
        recovery = parse_optional_float(form.get("heat_recovery_efficiency")) or 0
    else:
        ach, recovery = VENTILATION_PROFILES.get(str(form.get("ventilation_type") or "unknown"), VENTILATION_PROFILES["unknown"])
    infiltration_ach = parse_optional_float(form.get("infiltration_air_changes_per_hour")) or 0

    heating_override = form.get("expert_heating_override") == "on" or not simple
    if heating_override:
        heating = {
            "system_type": form.get("heating_system_type") or "condensing_gas_boiler",
            "carrier": form.get("heating_carrier") or "natural_gas",
            "efficiency": parse_optional_float(form.get("heating_efficiency")),
            "scop": parse_optional_float(form.get("heating_scop")),
            "cost_profile": form.get("heating_cost_profile") or None,
        }
    else:
        heating = dict(HEATING_PROFILES.get(str(form.get("heating_choice") or "condensing_gas_boiler"), HEATING_PROFILES["custom"]))

    heating_choice = str(form.get("heating_choice") or "condensing_gas_boiler")
    chain_defaults = HEATING_CHAIN_PROFILES.get(heating_choice, HEATING_CHAIN_PROFILES["condensing_gas_boiler"])
    chain_details = _normalize_home_lab_heating_chain(
        heating_choice,
        {
            "generator_type": form.get("heating_generator_type") or chain_defaults["generator_type"],
            "emitter_type": form.get("heating_emitter_type") or chain_defaults["emitter_type"],
            "distribution_type": form.get("heating_distribution_type") or chain_defaults["distribution_type"],
            "storage_type": form.get("heating_storage_type") or chain_defaults["storage_type"],
            "control_type": form.get("heating_control_type") or chain_defaults["control_type"],
            "design_flow_temperature_c": parse_optional_float(form.get("heating_design_flow_temperature_c")),
            "design_return_temperature_c": parse_optional_float(form.get("heating_design_return_temperature_c")),
            "auxiliary_electricity_kwh_year": parse_optional_float(form.get("heating_auxiliary_electricity_kwh_year")),
        },
    )
    structured_heating_present = _checked(form, "heating_chain_enabled") or (not simple and any(
        form.get(name) not in (None, "")
        for name in (
            "heating_generator_type",
            "heating_emitter_type",
            "heating_distribution_type",
            "heating_storage_type",
            "heating_control_type",
            "heating_design_flow_temperature_c",
            "heating_design_return_temperature_c",
            "heating_auxiliary_electricity_kwh_year",
        )
    ))
    if structured_heating_present:
        heating["details"] = chain_details

    # In the simple Home Lab path the generator performance is resolved from
    # the selected system chain. Expert overrides remain authoritative.
    if not heating_override and structured_heating_present:
        if heating.get("system_type") == "heat_pump":
            heating["scop"] = None
        elif heating.get("system_type") in {"gas_boiler", "condensing_gas_boiler", "district_heat", "electric_resistance"}:
            heating["efficiency"] = None

    return {
        **geometry,
        **u_values,
        "air_changes_per_hour": ach,
        "infiltration_air_changes_per_hour": infiltration_ach,
        "heat_recovery_efficiency": recovery,
        "heating": heating,
    }


def _ground_contact_payload(
    form: dict[str, Any],
    *,
    area_m2: float,
) -> dict[str, float]:
    """Collect geometry/material inputs needed by the engine's ISO 13370 slab model."""

    if area_m2 <= 0:
        raise ValueError("Calculul pardoselii spre sol necesită o arie pozitivă.")

    ground_cfg = methodology()["boundary_conditions_light"]["ground"]
    ground_lambda = (
        parse_optional_float(form.get("ground_conductivity_w_mk"))
        or float(ground_cfg["default_ground_conductivity_w_mk"])
    )
    wall_thickness = (
        parse_optional_float(form.get("ground_wall_thickness_m"))
        or float(ground_cfg["default_wall_thickness_m"])
    )

    perimeter = parse_optional_float(form.get("ground_exposed_perimeter_m"))
    if perimeter is None or perimeter <= 0:
        length = parse_optional_float(form.get("building_length_m"))
        width = parse_optional_float(form.get("building_width_m"))
        if length and width and length > 0 and width > 0:
            perimeter = 2.0 * (length + width)
        else:
            # Legacy/expert forms may not carry plan dimensions. Build a
            # square-equivalent perimeter and keep this fallback visible in
            # the resulting methodology assumptions.
            perimeter = 4.0 * (area_m2 ** 0.5)

    if ground_lambda <= 0 or wall_thickness < 0 or perimeter <= 0:
        raise ValueError("Datele pentru transferul spre sol trebuie să fie pozitive.")

    return {
        "exposed_perimeter_m": float(perimeter),
        "wall_thickness_m": float(wall_thickness),
        "ground_conductivity_w_mk": float(ground_lambda),
    }


def _unheated_zone_payload(
    form: dict[str, Any],
    *,
    prefix: str,
) -> dict[str, Any] | None:
    """Build an explicit adjacent-unheated-zone heat balance when all inputs exist.

    Partial input is rejected rather than silently mixed with a product fallback.
    """

    htr_ue = parse_optional_float(form.get(f"{prefix}_unheated_exterior_envelope_w_k"))
    cztu_ve = parse_optional_float(form.get(f"{prefix}_unheated_exterior_ventilation_coefficient"))
    hztc_ztu = parse_optional_float(form.get(f"{prefix}_unheated_conditioned_zone_heat_transfer_w_k"))
    supplied = [value is not None for value in (htr_ue, cztu_ve, hztc_ztu)]
    if not any(supplied):
        return None
    if not all(supplied):
        raise ValueError(
            "Modelul explicit al spațiului neîncălzit necesită Htr spre exterior, "
            "coeficientul de ventilare exterior și transferul din zona încălzită."
        )
    if htr_ue < 0 or cztu_ve < 0 or hztc_ztu <= 0:
        raise ValueError("Datele pentru spațiul neîncălzit trebuie să fie nenegative, iar cuplarea cu zona încălzită pozitivă.")
    return {
        "heat_transfer_to_exterior_envelope_w_k": float(htr_ue),
        "exterior_ventilation_coefficient": float(cztu_ve),
        "conditioned_zone_heat_transfers_w_k": [float(hztc_ztu)],
    }


def _boundary_factor(
    form: dict[str, Any],
    *,
    boundary_type: str,
    field_name: str,
) -> float | None:
    if boundary_type == "outside_air":
        return 1.0
    if boundary_type == "adjacent_heated_space":
        return 0.0

    explicit = parse_optional_float(form.get(field_name))
    if explicit is not None:
        return explicit

    if boundary_type == "ground":
        return None

    cfg = methodology()["boundary_conditions_light"]
    defaults = {
        "unheated_attic": cfg["unheated_attic"]["default_correction_factor"],
        "unheated_basement": cfg["unheated_basement"]["default_correction_factor"],
        "unheated_space": cfg["unheated_basement"]["default_correction_factor"],
        "adjacent_unheated_space": cfg["unheated_basement"]["default_correction_factor"],
    }
    if boundary_type not in defaults:
        raise ValueError(f"Tip de frontieră termică nesuportat: {boundary_type}")
    return float(defaults[boundary_type])


def build_input_from_form(form: dict[str, Any]) -> BuildingInput:
    technical = _technical_values(form)
    components = []

    roof_boundary = str(form.get("roof_boundary_type") or "outside_air")
    # The legacy commercial form names this element "Pardoseală spre sol".
    # If no explicit boundary is supplied, preserve that physical meaning.
    floor_boundary = str(form.get("floor_boundary_type") or "ground")
    component_map = [
        ("Pereți exteriori", "exterior_wall", "wall_area_m2", "wall_u_value", "outside_air", "wall_boundary_correction_factor", "wall"),
        (
            "Planșeu superior / acoperiș",
            "roof",
            "roof_area_m2",
            "roof_u_value",
            roof_boundary,
            "roof_boundary_correction_factor",
            "roof",
        ),
        (
            "Pardoseală inferioară",
            "floor",
            "floor_area_m2",
            "floor_u_value",
            floor_boundary,
            "floor_boundary_correction_factor",
            "floor",
        ),
        ("Ferestre", "window", "window_area_m2", "window_u_value", "outside_air", "window_boundary_correction_factor", "window"),
        ("Uși exterioare", "exterior_door", "door_area_m2", "door_u_value", "outside_air", "door_boundary_correction_factor", "door"),
    ]

    unheated_boundary_types = {
        "unheated_space",
        "unheated_attic",
        "unheated_basement",
        "adjacent_unheated_space",
    }

    for name, kind, area_key, u_key, boundary_type, factor_field, prefix in component_map:
        area = technical.get(area_key)
        u_value = technical.get(u_key)
        if area is None or area <= 0:
            continue
        unheated_zone = (
            _unheated_zone_payload(form, prefix=prefix)
            if boundary_type in unheated_boundary_types
            else None
        )
        boundary_factor = (
            None
            if unheated_zone is not None
            else _boundary_factor(
                form,
                boundary_type=boundary_type,
                field_name=factor_field,
            )
        )
        component = {
            "name": name,
            "type": kind,
            "area_m2": area,
            "u_value_w_m2k": u_value,
            "boundary_type": boundary_type,
            "boundary_correction_factor": boundary_factor,
        }
        if boundary_type == "ground" and boundary_factor is None:
            component["ground_contact"] = _ground_contact_payload(
                form,
                area_m2=float(area),
            )
        if unheated_zone is not None:
            component["unheated_zone"] = unheated_zone
        components.append(component)

    thermal_bridges = []
    bridge_length = technical.get("thermal_bridge_length_m")
    bridge_psi = technical.get("thermal_bridge_psi_w_mk")
    if bridge_length is not None and bridge_length > 0:
        thermal_bridges.append(
            {
                "name": "Punți termice liniare",
                "length_m": bridge_length,
                "psi_w_mk": bridge_psi if bridge_psi is not None else 0,
            }
        )

    cooling_enabled = _checked(form, "cooling_enabled")
    dhw_enabled = _checked(form, "dhw_enabled")
    heating = technical["heating"]

    simple = _simple_form_present(form)
    heating_choice = str(form.get("heating_choice") or heating.get("system_type") or "condensing_gas_boiler")
    dhw_values = _dhw_values_from_form(
        form,
        heating=heating,
        heating_choice=heating_choice,
        simple=simple,
    )

    glazing_groups = []
    for orientation, field in SOLAR_ORIENTATION_FIELDS.items():
        area = parse_optional_float(form.get(field))
        if area is not None and area > 0:
            glazing_groups.append({"orientation": orientation, "area_m2": area})

    return BuildingInput(
        project_name=str(form.get("project_name") or "Proiect LaCurent"),
        locality=str(form.get("locality_id") or form.get("locality") or ""),
        heated_floor_area_m2=technical.get("heated_floor_area_m2"),
        heated_volume_m3=technical.get("heated_volume_m3"),
        indoor_design_temperature_c=parse_optional_float(form.get("indoor_design_temperature_c")) or 20,
        building_type=form.get("building_type") or "residential_individual",
        construction_year=parse_optional_int(form.get("construction_year")),
        solar_gains_kwh_m2_month=parse_optional_float(form.get("solar_gains_kwh_m2_month")) or 0,
        solar={
            "mode": form.get("solar_mode") or "normative_hsol",
            "orientation": form.get("solar_orientation") or "south",
            "glazing_type_id": form.get("solar_glazing_type_id") or "double_low_e_face_3",
            "normal_incidence_solar_transmittance": parse_optional_float(form.get("solar_glazing_gn")),
            "glazing_groups": glazing_groups,
            "shading_device_id": form.get("solar_shading_device_id") or None,
            "shading_mounting_side": form.get("solar_shading_mounting_side") or None,
            "frame_fraction": parse_optional_float(form.get("solar_frame_fraction")) if form.get("solar_frame_fraction") not in (None, "") else 0.20,
            "obstacle_shading_factor": parse_optional_float(form.get("solar_obstacle_shading_factor")) if form.get("solar_obstacle_shading_factor") not in (None, "") else 1.0,
            "sky_view_factor": parse_optional_float(form.get("solar_sky_view_factor")) if form.get("solar_sky_view_factor") not in (None, "") else 0.5,
            "exterior_surface_resistance_m2k_w": parse_optional_float(form.get("solar_exterior_surface_resistance_m2k_w")) if form.get("solar_exterior_surface_resistance_m2k_w") not in (None, "") else 0.04,
            "longwave_radiation_coefficient_w_m2k": parse_optional_float(form.get("solar_longwave_radiation_coefficient_w_m2k")) if form.get("solar_longwave_radiation_coefficient_w_m2k") not in (None, "") else 5.0,
            "sky_temperature_difference_k": parse_optional_float(form.get("solar_sky_temperature_difference_k")) if form.get("solar_sky_temperature_difference_k") not in (None, "") else 11.0,
        },
        envelope=components,
        thermal_bridges=thermal_bridges,
        ventilation={
            "air_changes_per_hour": technical.get("air_changes_per_hour"),
            "infiltration_air_changes_per_hour": technical.get("infiltration_air_changes_per_hour") or 0,
            "heat_recovery_efficiency": technical.get("heat_recovery_efficiency") or 0,
        },
        heating=heating,
        cooling={
            "enabled": cooling_enabled,
            "seer": parse_optional_float(form.get("cooling_seer")) if cooling_enabled else None,
            "setpoint_c": parse_optional_float(form.get("cooling_setpoint_c")) or 26,
        },
        dhw={
            "enabled": dhw_enabled,
            "occupants": parse_optional_int(form.get("dhw_occupants")) or 0,
            "litres_per_person_day_at_60c": parse_optional_float(form.get("dhw_litres_per_person_day_at_60c")),
            **dhw_values,
        },
        renewables={
            "pv": {
                "enabled": _checked(form, "pv_enabled"),
                "installed_power_kwp": parse_optional_float(form.get("pv_installed_power_kwp")) or 0,
                "orientation": form.get("pv_orientation") or "south",
                "tilt_degrees": parse_optional_float(form.get("pv_tilt_degrees")) if form.get("pv_tilt_degrees") not in (None, "") else 30,
                "performance_ratio": parse_optional_float(form.get("pv_performance_ratio")),
                "household_electricity_kwh_year": parse_optional_float(
                    form.get("pv_household_electricity_kwh_year")
                ) or 0,
                "export_credit_lei_per_kwh": parse_optional_float(
                    form.get("pv_export_credit_lei_per_kwh")
                ) or 0,
            },
            "solar_thermal": {
                "enabled": _checked(form, "solar_thermal_enabled"),
                "collector_area_m2": parse_optional_float(form.get("solar_thermal_collector_area_m2")) or 0,
                "orientation": form.get("solar_thermal_orientation") or "south",
                "tilt_degrees": parse_optional_float(form.get("solar_thermal_tilt_degrees")) if form.get("solar_thermal_tilt_degrees") not in (None, "") else 45,
                "system_efficiency": parse_optional_float(form.get("solar_thermal_system_efficiency")),
            },
        },
    )


def user_error(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        first = exc.errors()[0]
        location = tuple(first.get("loc", []))
        if location[:2] == ("heating", "details"):
            return (
                "Configurația instalației de încălzire nu este compatibilă. "
                "Verifică generatorul, emisia și distribuția."
            )
        field = " / ".join(str(item) for item in location)
        return f"{field}: {first.get('msg', 'valoare invalidă')}"
    return str(exc)

@lru_cache(maxsize=1)
def roi_cost_basis_seed() -> dict[str, Any]:
    return json.loads(ROI_COST_BASIS_PATH.read_text(encoding="utf-8"))


ROI_COST_BASIS_CREATE_SQL = """
CREATE TABLE IF NOT EXISTS roi_cost_basis (
    family TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    cost_lei REAL NOT NULL CHECK(cost_lei > 0),
    unit TEXT NOT NULL,
    source_kind TEXT NOT NULL,
    source_url TEXT,
    observed_on TEXT NOT NULL,
    catalog_version TEXT NOT NULL,
    confidence TEXT NOT NULL,
    note TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

ROI_COST_BASIS_UPSERT_SQL = """
INSERT OR REPLACE INTO roi_cost_basis
(
    family, label, cost_lei, unit, source_kind, source_url,
    observed_on, catalog_version, confidence, note, active, updated_at
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
"""


def _d1_rows(result: Any) -> list[dict[str, Any]]:
    raw_rows = getattr(result, "results", None)
    if hasattr(raw_rows, "to_py"):
        raw_rows = raw_rows.to_py()
    return [dict(row) for row in (raw_rows or [])]



def _teo_flow_db(request: Request) -> Any | None:
    env = request.scope.get("env")
    return getattr(env, "DB", None) if env is not None else None


def _teo_flow_now_ms() -> int:
    return int(time.time() * 1000.0)


async def _ensure_teo_flow_d1(db: Any) -> None:
    global _teo_flow_schema_ready
    if _teo_flow_schema_ready:
        return
    async with _teo_flow_schema_lock:
        if _teo_flow_schema_ready:
            return
        await db.prepare(TEO_FLOW_CREATE_SQL).run()
        await db.prepare(
            "CREATE INDEX IF NOT EXISTS teo_verification_runs_status_idx "
            "ON teo_verification_runs(status, next_allowed_at_ms)"
        ).run()
        _teo_flow_schema_ready = True


async def _teo_flow_row(db: Any, run_id: str) -> dict[str, Any] | None:
    result = await db.prepare(
        """
        SELECT run_id, status, planned_verifications, verified_count,
               next_allowed_at_ms, in_flight, lease_token,
               lease_expires_at_ms, updated_at
        FROM teo_verification_runs
        WHERE run_id = ?
        LIMIT 1
        """
    ).bind(run_id).run()
    rows = _d1_rows(result)
    return rows[0] if rows else None


def _teo_flow_public_state(
    row: dict[str, Any] | None,
    *,
    storage: str,
) -> dict[str, Any]:
    now_ms = _teo_flow_now_ms()
    if row is None:
        return {
            "status": "ready",
            "ready": True,
            "verifiedCount": 0,
            "plannedVerifications": TEO_FLOW_MAX_VERIFICATIONS,
            "retryAfterMs": 0,
            "storage": storage,
        }

    verified_count = int(row.get("verified_count") or 0)
    planned = max(1, int(row.get("planned_verifications") or 1))
    next_allowed = int(row.get("next_allowed_at_ms") or 0)
    in_flight = bool(int(row.get("in_flight") or 0))
    lease_expires = int(row.get("lease_expires_at_ms") or 0)

    if verified_count >= planned or str(row.get("status") or "") == "complete":
        status = "complete"
        ready = False
        retry_after = 0
    elif in_flight and lease_expires > now_ms:
        status = "running"
        ready = False
        retry_after = max(100, lease_expires - now_ms)
    elif next_allowed > now_ms:
        status = "cooldown"
        ready = False
        retry_after = next_allowed - now_ms
    else:
        status = "ready"
        ready = True
        retry_after = 0

    return {
        "runId": str(row.get("run_id") or ""),
        "status": status,
        "ready": ready,
        "verifiedCount": verified_count,
        "plannedVerifications": planned,
        "retryAfterMs": int(retry_after),
        "storage": storage,
    }


async def _teo_flow_start(
    request: Request,
    run_id: str,
    planned_verifications: int,
) -> dict[str, Any]:
    db = _teo_flow_db(request)
    planned = max(1, min(int(planned_verifications), TEO_FLOW_MAX_VERIFICATIONS))
    if db is None:
        return {
            "runId": run_id,
            "status": "ready",
            "ready": True,
            "verifiedCount": 0,
            "plannedVerifications": planned,
            "retryAfterMs": 0,
            "storage": "none",
        }

    await _ensure_teo_flow_d1(db)
    await db.prepare(
        "DELETE FROM teo_verification_runs "
        "WHERE updated_at < datetime('now', '-1 day')"
    ).run()
    await db.prepare(
        """
        INSERT INTO teo_verification_runs(
            run_id, status, planned_verifications, verified_count,
            next_allowed_at_ms, in_flight, lease_token,
            lease_expires_at_ms, updated_at
        )
        VALUES (?, 'ready', ?, 0, 0, 0, NULL, 0, CURRENT_TIMESTAMP)
        ON CONFLICT(run_id) DO UPDATE SET
            status = 'ready',
            planned_verifications = excluded.planned_verifications,
            verified_count = 0,
            next_allowed_at_ms = 0,
            in_flight = 0,
            lease_token = NULL,
            lease_expires_at_ms = 0,
            updated_at = CURRENT_TIMESTAMP
        """
    ).bind(run_id, planned).run()
    return _teo_flow_public_state(
        await _teo_flow_row(db, run_id),
        storage="d1",
    )


async def _teo_flow_status(
    request: Request,
    run_id: str,
) -> dict[str, Any]:
    db = _teo_flow_db(request)
    if db is None:
        return {
            "runId": run_id,
            "status": "ready",
            "ready": True,
            "verifiedCount": 0,
            "plannedVerifications": TEO_FLOW_MAX_VERIFICATIONS,
            "retryAfterMs": 0,
            "storage": "none",
        }
    await _ensure_teo_flow_d1(db)
    return _teo_flow_public_state(
        await _teo_flow_row(db, run_id),
        storage="d1",
    )


async def _teo_flow_acquire_verification(
    request: Request,
    run_id: str,
) -> dict[str, Any]:
    db = _teo_flow_db(request)
    if db is None:
        return {
            "acquired": True,
            "leaseToken": None,
            "state": await _teo_flow_status(request, run_id),
        }

    await _ensure_teo_flow_d1(db)
    row = await _teo_flow_row(db, run_id)
    if row is None:
        await _teo_flow_start(request, run_id, TEO_FLOW_MAX_VERIFICATIONS)
        row = await _teo_flow_row(db, run_id)

    state = _teo_flow_public_state(row, storage="d1")
    if not state["ready"]:
        return {"acquired": False, "leaseToken": None, "state": state}

    now_ms = _teo_flow_now_ms()
    lease_token = f"{run_id}:{time.time_ns()}"
    await db.prepare(
        """
        UPDATE teo_verification_runs
        SET status = 'running',
            in_flight = 1,
            lease_token = ?,
            lease_expires_at_ms = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE run_id = ?
          AND verified_count < planned_verifications
          AND next_allowed_at_ms <= ?
          AND (in_flight = 0 OR lease_expires_at_ms <= ?)
        """
    ).bind(
        lease_token,
        now_ms + TEO_FLOW_LEASE_MS,
        run_id,
        now_ms,
        now_ms,
    ).run()
    acquired_row = await _teo_flow_row(db, run_id)
    acquired = bool(
        acquired_row
        and str(acquired_row.get("lease_token") or "") == lease_token
    )
    return {
        "acquired": acquired,
        "leaseToken": lease_token if acquired else None,
        "state": _teo_flow_public_state(acquired_row, storage="d1"),
    }


async def _teo_flow_complete_verification(
    request: Request,
    run_id: str,
    lease_token: str | None,
) -> dict[str, Any]:
    db = _teo_flow_db(request)
    if db is None or lease_token is None:
        return await _teo_flow_status(request, run_id)

    now_ms = _teo_flow_now_ms()
    await db.prepare(
        """
        UPDATE teo_verification_runs
        SET verified_count = verified_count + 1,
            status = CASE
                WHEN verified_count + 1 >= planned_verifications
                THEN 'complete'
                ELSE 'cooldown'
            END,
            next_allowed_at_ms = ?,
            in_flight = 0,
            lease_token = NULL,
            lease_expires_at_ms = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE run_id = ? AND lease_token = ?
        """
    ).bind(
        now_ms + TEO_FLOW_COOLDOWN_MS,
        run_id,
        lease_token,
    ).run()
    return _teo_flow_public_state(
        await _teo_flow_row(db, run_id),
        storage="d1",
    )


async def _teo_flow_release_verification(
    request: Request,
    run_id: str,
    lease_token: str | None,
) -> None:
    db = _teo_flow_db(request)
    if db is None or lease_token is None:
        return
    await db.prepare(
        """
        UPDATE teo_verification_runs
        SET status = 'cooldown',
            next_allowed_at_ms = ?,
            in_flight = 0,
            lease_token = NULL,
            lease_expires_at_ms = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE run_id = ? AND lease_token = ?
        """
    ).bind(
        _teo_flow_now_ms() + TEO_FLOW_COOLDOWN_MS,
        run_id,
        lease_token,
    ).run()


async def _teo_flow_finish(
    request: Request,
    run_id: str,
) -> dict[str, Any]:
    db = _teo_flow_db(request)
    if db is None:
        return {
            "runId": run_id,
            "status": "complete",
            "ready": False,
            "verifiedCount": 0,
            "plannedVerifications": TEO_FLOW_MAX_VERIFICATIONS,
            "retryAfterMs": 0,
            "storage": "none",
        }
    await _ensure_teo_flow_d1(db)
    await db.prepare(
        """
        UPDATE teo_verification_runs
        SET status = 'complete',
            in_flight = 0,
            lease_token = NULL,
            lease_expires_at_ms = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE run_id = ?
        """
    ).bind(run_id).run()
    return _teo_flow_public_state(
        await _teo_flow_row(db, run_id),
        storage="d1",
    )


async def _ensure_roi_cost_basis_d1(db: Any) -> None:
    """Create/refresh the small commercial ROI table through the Worker binding.

    The deployment token intentionally does not need D1 write permissions.
    D1 writes happen through the already-authorized Worker binding, and only
    when the versioned seed differs from the active database content.
    """
    seed = roi_cost_basis_seed()
    expected_costs = seed.get("costs") or {}
    expected_version = str(seed.get("catalog_version") or "")

    await db.prepare(ROI_COST_BASIS_CREATE_SQL).run()
    await db.prepare(
        "CREATE INDEX IF NOT EXISTS roi_cost_basis_active_idx "
        "ON roi_cost_basis(active, family)"
    ).run()

    status_result = await db.prepare(
        """
        SELECT COUNT(*) AS row_count,
               COALESCE(MAX(catalog_version), '') AS catalog_version
        FROM roi_cost_basis
        WHERE active = 1
        """
    ).run()
    status_rows = _d1_rows(status_result)
    status = status_rows[0] if status_rows else {}
    row_count = int(status.get("row_count") or 0)
    active_version = str(status.get("catalog_version") or "")

    if row_count == len(expected_costs) and active_version == expected_version:
        return

    for family, item in expected_costs.items():
        await db.prepare(ROI_COST_BASIS_UPSERT_SQL).bind(
            family,
            item.get("label"),
            float(item["cost_lei"]),
            item.get("unit"),
            item.get("source_kind"),
            item.get("source_url"),
            item.get("observed_on") or seed.get("observed_on"),
            item.get("catalog_version") or seed.get("catalog_version"),
            item.get("confidence"),
            item.get("note"),
        ).run()


def _roi_cost_payload_from_rows(rows: list[dict[str, Any]], *, source: str) -> dict[str, Any]:
    costs: dict[str, dict[str, Any]] = {}
    catalog_versions: set[str] = set()
    observed_dates: set[str] = set()
    for row in rows:
        family = str(row.get("family") or "").strip()
        cost_lei = row.get("cost_lei")
        if not family or cost_lei is None:
            continue
        item = {
            "label": row.get("label"),
            "cost_lei": float(cost_lei),
            "unit": row.get("unit"),
            "source_kind": row.get("source_kind"),
            "source_url": row.get("source_url"),
            "observed_on": row.get("observed_on"),
            "catalog_version": row.get("catalog_version"),
            "confidence": row.get("confidence"),
            "note": row.get("note"),
        }
        costs[family] = item
        if item["catalog_version"]:
            catalog_versions.add(str(item["catalog_version"]))
        if item["observed_on"]:
            observed_dates.add(str(item["observed_on"]))
    return {
        "source": source,
        "catalog_version": max(catalog_versions) if catalog_versions else None,
        "observed_on": max(observed_dates) if observed_dates else None,
        "costs": costs,
    }


async def _cached_roi_cost_payload_from_d1(db: Any) -> dict[str, Any] | None:
    """Coalesce D1 setup/reads and keep the small versioned catalog per isolate.

    Cloudflare may resume a long-lived Python isolate on a different ASGI event
    loop. Treat lock acquisition itself as fallible so a stale asyncio.Lock can
    never turn optional market metadata into a 503 for the public Worker.
    """
    global _roi_cost_basis_cached_payload
    global _roi_cost_basis_cache_expires_at
    global _roi_cost_basis_retry_after

    now = time.monotonic()
    if _roi_cost_basis_cached_payload is not None and now < _roi_cost_basis_cache_expires_at:
        return _roi_cost_basis_cached_payload
    if now < _roi_cost_basis_retry_after:
        return None

    try:
        async with _roi_cost_basis_lock:
            now = time.monotonic()
            if _roi_cost_basis_cached_payload is not None and now < _roi_cost_basis_cache_expires_at:
                return _roi_cost_basis_cached_payload
            if now < _roi_cost_basis_retry_after:
                return None

            await _ensure_roi_cost_basis_d1(db)
            result = await db.prepare(
                """
                SELECT family, label, cost_lei, unit, source_kind, source_url,
                       observed_on, catalog_version, confidence, note
                FROM roi_cost_basis
                WHERE active = 1
                ORDER BY family
                """
            ).run()
            payload = _roi_cost_payload_from_rows(_d1_rows(result), source="d1")
            if not payload["costs"]:
                raise ValueError("D1 ROI cost catalog is empty.")

            _roi_cost_basis_cached_payload = payload
            _roi_cost_basis_cache_expires_at = time.monotonic() + ROI_COST_BASIS_CACHE_SECONDS
            _roi_cost_basis_retry_after = 0.0
            return payload
    except Exception:
        # D1-backed market metadata is an optimization, never a hard dependency
        # of the public calculator. This also covers lock/event-loop failures.
        _roi_cost_basis_retry_after = time.monotonic() + ROI_COST_BASIS_RETRY_SECONDS
        return None


@app.get("/api/market-cost-basis")
async def market_cost_basis_api(request: Request) -> JSONResponse:
    """Return commercial CAPEX assumptions without coupling them to physics.

    In the Cloudflare runtime the source of truth is D1. Local/test runtimes and
    a temporarily unavailable D1 table fall back to the versioned seed mirror
    so the scientific calculator remains usable and Best ROI never asks the
    homeowner to supply catalog maintenance data.
    """
    try:
        env = request.scope.get("env")
        db = getattr(env, "DB", None) if env is not None else None
        if db is not None:
            payload = await _cached_roi_cost_payload_from_d1(db)
            if payload is not None:
                return JSONResponse(
                    payload,
                    headers={"Cache-Control": "public, max-age=900"},
                )
    except Exception:
        # The public endpoint must remain available even if the runtime binding
        # or its event-loop state is temporarily unhealthy.
        pass

    seed = roi_cost_basis_seed()
    payload = {
        **seed,
        "source": "seed_fallback",
    }
    return JSONResponse(
        payload,
        headers={"Cache-Control": "public, max-age=300"},
    )


async def _optimizer_cost_catalog(request: Request) -> dict[str, Any]:
    """Use D1 when available and the versioned seed only as an explicit fallback."""
    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env is not None else None
    if db is not None:
        payload = await _cached_roi_cost_payload_from_d1(db)
        if payload is not None:
            return payload
    return {**roi_cost_basis_seed(), "source": "seed_fallback"}


async def _optimizer_heating_catalog(request: Request) -> dict[str, Any]:
    """Return the canonical heating catalog from D1, with a deterministic CI fallback."""
    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env is not None else None
    if db is not None:
        payload = await cached_heating_catalog_from_d1(db)
        if payload is not None:
            return payload
    return seed_heating_catalog_payload()


async def _public_heating_catalog(request: Request) -> dict[str, Any]:
    """Return real products/performance without internal optimizer planning rows."""

    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env is not None else None
    if db is not None:
        payload = await read_heating_public_catalog_from_d1(db)
        if payload is not None:
            return payload
    return seed_heating_public_catalog_payload()


async def _public_heating_products_only(request: Request) -> dict[str, Any]:
    """Return only the product rows needed to render /produse.

    Keep COP operating maps and seasonal tables on the dedicated API path. The
    HTML catalog never consumes them, and materializing them here raises the
    public Pyodide isolate peak for no user-visible benefit.
    """

    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env is not None else None
    if db is not None:
        payload = await read_heating_public_products_from_d1(db)
        if payload is not None:
            return payload

    payload = seed_heating_public_catalog_payload()
    payload["heat_pump_performance_points"] = []
    payload["heat_pump_seasonal_performance"] = []
    payload["parametric_heating_nodes"] = []
    stats = dict(payload.get("catalog_stats") or {})
    stats["performance_points"] = 0
    stats["seasonal_points"] = 0
    stats["parametric_nodes"] = 0
    payload["catalog_stats"] = stats
    payload["catalog_mode"] = "seed_public_products_only"
    return payload


async def _optimizer_heating_catalog_summary(request: Request) -> dict[str, Any]:
    """Return product/branch metadata without loading the 1000-node dense grid."""
    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env is not None else None
    if db is not None:
        payload = await cached_heating_catalog_summary_from_d1(db)
        if payload is not None:
            return payload
    return seed_heating_catalog_summary_payload()


async def _optimizer_heating_branch_catalog(
    request: Request,
    branch_id: str,
) -> dict[str, Any]:
    """Return only the fixed-size planning payload for one V3 branch.

    Keep-current does not need heating marketplace data. Technology branches
    receive one representative product plus their precomputed kW->CAPEX curve;
    real SKU/COP maps remain downstream for finalist commercialization.
    """

    if branch_id == "keep-current-heating":
        return {
            "source": "not_required",
            "catalog_mode": "keep_current_no_heating_catalog",
            "options": [],
            "heat_pump_performance_points": [],
            "heat_pump_seasonal_performance": [],
            "parametric_heating_nodes": [],
            "catalog_stats": {
                "products": 0,
                "loaded_products": 0,
                "parametric_nodes": 0,
                "performance_points": 0,
                "seasonal_points": 0,
            },
        }

    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env is not None else None
    if db is not None:
        payload = await cached_heating_branch_catalog_from_d1(db, branch_id)
        if payload is not None:
            return payload
    return seed_heating_branch_catalog_payload(branch_id)


async def _optimizer_heating_commercial_branch_catalog(
    request: Request,
    branch_id: str,
    required_power_kw: float,
) -> dict[str, Any]:
    """Load a bounded SKU/performance window for one finalist design load.

    D1, not the Python Worker, performs the marketplace filtering. The object
    graph received by PRODUCT stays fixed-size as the catalog grows.
    """

    if branch_id == "keep-current-heating":
        return {
            "source": "not_required",
            "catalog_mode": "keep_current_no_heating_catalog",
            "options": [],
            "heat_pump_performance_points": [],
            "heat_pump_seasonal_performance": [],
            "parametric_heating_nodes": [],
            "catalog_stats": {
                "products": 0,
                "loaded_products": 0,
                "parametric_nodes": 0,
                "performance_points": 0,
                "seasonal_points": 0,
            },
            "technology_id": branch_id,
            "required_power_kw": max(float(required_power_kw), 0.0),
        }

    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env is not None else None
    if db is not None:
        payload = await read_heating_commercial_candidate_catalog_from_d1(
            db,
            branch_id,
            required_power_kw,
        )
        if payload is not None:
            return payload
    return seed_heating_commercial_candidate_catalog_payload(
        branch_id,
        required_power_kw,
    )

def _home_lab_optimizer_label(mode: OptimizationMode, form: dict[str, Any]) -> str:
    if mode == OptimizationMode.investment_budget:
        return f"Buget maxim {float(form.get('_investment_budget_lei') or 0):.0f} lei"
    if mode == OptimizationMode.annual_bill_target:
        return f"Factură anuală țintă {float(form.get('_annual_bill_target_lei') or 0):.0f} lei"
    if mode == OptimizationMode.max_payback_years:
        return f"Recuperare în maximum {float(form.get('_max_payback_years') or 0):.1f} ani"
    return "Optimizare economică automată"


def _optimizer_measure_rows(candidate: Any) -> list[dict[str, Any]]:
    labels = {
        "wall": "Izolație pereți",
        "roof": "Izolație acoperiș / pod",
        "floor": "Izolație pardoseală",
        "windows": "Ferestre",
        "ventilation": "Ventilație cu recuperare",
        "pv": "Fotovoltaice",
        "solar_thermal": "Solar termic",
        "heating": "Sistem de încălzire",
    }
    rows = []
    for line in candidate.cost_breakdown:
        if float(line.capex_lei) <= 0:
            continue
        rows.append(
            {
                "family": line.family,
                "label": labels.get(line.family, line.family.replace("_", " ").title()),
                "capexLei": float(line.capex_lei),
                "parameterValue": float(line.parameter_value),
                "parameterUnit": line.parameter_unit,
                "sourceKind": line.source_kind,
                "productId": line.product_id,
                "sku": line.sku,
                "quantity": line.quantity,
                "quantityUnit": line.quantity_unit,
                "materialSubtotalLei": line.material_subtotal_lei,
                "nonmaterialSubtotalLei": line.nonmaterial_subtotal_lei,
                "note": line.note,
            }
        )
    return rows


def _home_lab_optimization_request_from_form(
    form: dict[str, Any],
) -> tuple[OptimizationMode, BuildingInput, OptimizationRequestV1]:
    raw_mode = str(form.pop("_optimization_mode", "") or "").strip()
    try:
        mode = OptimizationMode(raw_mode)
    except ValueError as exc:
        raise ValueError("Modul de optimizare economică nu este valid.") from exc

    building = build_input_from_form(form)
    request_kwargs: dict[str, Any] = {
        "baseline": building,
        "mode": mode,
    }
    if mode == OptimizationMode.investment_budget:
        request_kwargs["investment_budget_lei"] = parse_optional_float(
            form.get("_investment_budget_lei")
        )
    elif mode == OptimizationMode.annual_bill_target:
        request_kwargs["annual_bill_target_lei"] = parse_optional_float(
            form.get("_annual_bill_target_lei")
        )
    elif mode == OptimizationMode.max_payback_years:
        request_kwargs["max_payback_years"] = parse_optional_float(
            form.get("_max_payback_years")
        )
    return mode, building, OptimizationRequestV1(**request_kwargs)


def _assert_optimizer_economics_complete(candidate: CandidateEvaluationV1) -> None:
    values = {
        "baseline_annual_bill_lei": candidate.baseline_annual_bill_lei,
        "annual_bill_lei": candidate.annual_bill_lei,
        "annual_saving_lei": candidate.annual_saving_lei,
        "capex_lei": candidate.capex_lei,
    }
    for name, value in values.items():
        if not math.isfinite(float(value)):
            raise ValueError(f"Rezultat economic invalid: {name} nu este finit.")

    expected_saving = (
        float(candidate.baseline_annual_bill_lei)
        - float(candidate.annual_bill_lei)
    )
    if abs(expected_saving - float(candidate.annual_saving_lei)) > 0.05:
        raise ValueError(
            "Rezultat economic inconsistent: economia anuală nu este baseline minus factura finală."
        )

    capex = float(candidate.capex_lei)
    saving = float(candidate.annual_saving_lei)
    if capex > 1e-9 and saving > 1e-9:
        expected_payback = capex / saving
        if candidate.payback_years is None:
            raise ValueError(
                "Rezultat economic incomplet: există CAPEX și economie pozitivă, dar recuperarea lipsește."
            )
        payback = float(candidate.payback_years)
        if not math.isfinite(payback):
            raise ValueError("Rezultat economic invalid: recuperarea nu este finită.")
        tolerance = max(0.02, expected_payback * 0.002)
        if abs(payback - expected_payback) > tolerance:
            raise ValueError(
                "Rezultat economic inconsistent: recuperarea nu corespunde CAPEX / economie anuală."
            )


def _optimizer_candidate_scenario_snapshot(
    candidate: CandidateEvaluationV1,
    form: dict[str, Any],
) -> dict[str, Any]:
    """Build a no-recalculation scenario for fail-soft reporting.

    Canonical verification already produced these authoritative scalar metrics.
    The snapshot intentionally omits monthly/fuel details that would require a
    second engine pass.
    """

    return {
        "locality": str(
            form.get("locality")
            or form.get("locality_id")
            or ""
        ),
        "annual_cost_lei": float(candidate.annual_bill_lei),
        "final_energy_kwh": float(candidate.final_energy_kwh),
        "primary_specific_kwh_m2": float(
            candidate.primary_specific_kwh_m2
        ),
        "co2_total_kg": float(candidate.co2_total_kg),
        "co2_specific_kg_m2": float(candidate.co2_specific_kg_m2),
        "energy_class": candidate.energy_class,
        "design_heat_load_kw": candidate.design_heat_load_kw,
        "annual_fuel_use": {},
        "assumptions": list(candidate.assumptions),
        "scenario_detail": "canonical_scalar_snapshot_no_recalculation",
    }


def _home_lab_optimizer_success_payload(
    *,
    mode: OptimizationMode,
    form: dict[str, Any],
    selection: Any,
    branches: list[HeatingBranchSummaryV1],
    evaluated_candidates: int,
    parametric_evaluations: int,
    heating_branch_evaluations: int,
    warnings: list[str],
    calculation_time_ms: float | None = None,
    pareto_scope: str = "all_candidates",
    raw_selected: CandidateEvaluationV1 | None = None,
    technical_heating_alternatives: list[dict[str, Any]] | None = None,
    heating_catalog: dict[str, Any] | None = None,
    precomputed_scenario: dict[str, Any] | None = None,
    precomputed_heat_pump_profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    selected = selection.selected
    if selected is None or selected.resulting_configuration is None:
        raise ValueError("Nu există nicio soluție fezabilă pentru regula economică aleasă.")

    raw_selected = raw_selected or selected
    _assert_optimizer_economics_complete(selected)
    final_result = None
    if precomputed_scenario is None:
        final_result = calculate(
            selected.resulting_configuration,
            include_reference=False,
        )
        scenario_payload = embed_lab_result_payload(final_result)
    else:
        scenario_payload = dict(precomputed_scenario)
    raw_measures = model_to_dict(raw_selected.parameters)
    commercial_ready = (
        selected.commercialization_status == "commercialized"
        or (
            selected.commercialization_status == "raw_only"
            and float(selected.capex_lei) <= 1e-9
        )
    )
    active_rows = _optimizer_measure_rows(selected)

    def _capacity_verified(line: Any) -> bool:
        basis = str(line.capacity_basis or "")
        return bool(
            line.product_id is not None
            and not any(
                marker in basis
                for marker in ("unverified", "unavailable", "missing")
            )
        )

    selected_heating = next(
        (
            {
                "label": line.note.split(":", 1)[0] if line.note else "Sistem de încălzire",
                "capexLei": float(line.capex_lei),
                "requiredPowerKw": selected.design_heat_load_kw,
                "planningPowerKw": float(line.parameter_value),
                "ratedPowerKw": (
                    float(line.parameter_value)
                    if line.product_id is not None
                    else None
                ),
                "availableDesignCapacityKw": (
                    float(line.design_available_capacity_kw)
                    if (
                        _capacity_verified(line)
                        and line.design_available_capacity_kw is not None
                    )
                    else None
                ),
                "provisionalCapacityKw": (
                    float(line.design_available_capacity_kw)
                    if line.design_available_capacity_kw is not None
                    else (
                        float(line.parameter_value)
                        if line.product_id is not None
                        else None
                    )
                ),
                "capacityBasis": line.capacity_basis,
                "capacityVerified": _capacity_verified(line),
                "oversizeKw": (
                    None
                    if (
                        line.product_id is None
                        or not _capacity_verified(line)
                        or selected.design_heat_load_kw is None
                    )
                    else max(
                        float(
                            line.design_available_capacity_kw
                            if line.design_available_capacity_kw is not None
                            else line.parameter_value
                        )
                        - float(selected.design_heat_load_kw),
                        0.0,
                    )
                ),
                "oversizePercent": (
                    None
                    if (
                        line.product_id is None
                        or not _capacity_verified(line)
                        or selected.design_heat_load_kw is None
                        or float(selected.design_heat_load_kw) <= 1e-9
                    )
                    else 100.0 * max(
                        float(
                            line.design_available_capacity_kw
                            if line.design_available_capacity_kw is not None
                            else line.parameter_value
                        )
                        - float(selected.design_heat_load_kw),
                        0.0,
                    ) / float(selected.design_heat_load_kw)
                ),
                "sourceKind": line.source_kind,
                "sourceUrl": line.source_url,
                "confidence": line.confidence,
                "optionId": line.product_id,
                "quantity": float(line.quantity or 1),
                "quantityUnit": line.quantity_unit,
                "technologyId": next(
                    (
                        product.technology_id
                        for product in heating_planning_options(heating_catalog)
                        if product.id == line.product_id
                    ),
                    None,
                ),
                "equipmentPriceLei": line.material_subtotal_lei,
                "installationAllowanceLei": line.nonmaterial_subtotal_lei,
                "sizingBasis": "design_heat_load_at_normative_winter_design_temperature",
            }
            for line in selected.cost_breakdown
            if line.family == "heating"
        ),
        None,
    )
    heat_pump_profile: dict[str, Any] | None = (
        None
        if precomputed_heat_pump_profile is None
        else dict(precomputed_heat_pump_profile)
    )
    if (
        heat_pump_profile is None
        and final_result is not None
        and selected_heating is not None
        and selected_heating.get("optionId")
    ):
        matched_product = next(
            (
                product
                for product in heating_planning_options(heating_catalog)
                if product.id == selected_heating["optionId"]
            ),
            None,
        )
        if matched_product is not None:
            heat_pump_profile = heat_pump_monthly_performance_profile(
                selected.resulting_configuration,
                matched_product,
                list(final_result.monthly),
                quantity=max(
                    1,
                    int(float(selected_heating.get("quantity") or 1)),
                ),
            )
            if heat_pump_profile is not None:
                heat_pump_profile["engine_performance_kind"] = (
                    final_result.heating_system.generator_performance_kind
                )
                heat_pump_profile["engine_performance_value"] = float(
                    final_result.heating_system.generator_performance
                )
                heat_pump_profile["effective_system_performance"] = float(
                    final_result.heating_system.effective_system_performance
                )
                heat_pump_profile["performance_source"] = (
                    final_result.heating_system.performance_source
                )

    feasible_total = sum(int(item.feasible_candidates) for item in branches)
    capex_lei = float(selected.capex_lei)
    annual_saving_lei = float(selected.annual_saving_lei)
    annual_bill_lei = float(selected.annual_bill_lei)
    baseline_bill_lei = float(selected.baseline_annual_bill_lei)
    economic_horizons = [5, 10, 15, 20, 25]
    simple_net_benefit = {
        str(years): round(annual_saving_lei * years - capex_lei, 2)
        for years in economic_horizons
    }
    if capex_lei <= 1e-9 and annual_saving_lei <= 1e-9:
        economic_status = "no_positive_intervention"
        payback_status = "not_applicable_no_investment"
    elif capex_lei <= 1e-9 and annual_saving_lei > 1e-9:
        economic_status = "positive_saving_zero_capex"
        payback_status = "immediate"
    elif annual_saving_lei > 1e-9 and selected.payback_years is not None:
        economic_status = "positive_saving"
        payback_status = "finite"
    elif annual_saving_lei <= 0:
        economic_status = "non_positive_saving"
        payback_status = "never_at_current_prices"
    else:
        economic_status = "incomplete_economic_result"
        payback_status = "unavailable"

    optimization_payload = {
        "kind": "parametric_economic",
        "mode": "parametric_economic",
        "economicMode": mode.value,
        "label": _home_lab_optimizer_label(mode, form),
        "rationale": selection.rationale,
        "capexLei": capex_lei,
        "baselineAnnualBillLei": baseline_bill_lei,
        "annualBillLei": annual_bill_lei,
        "annualSavingLei": annual_saving_lei,
        "economicStatus": economic_status,
        "paybackStatus": payback_status,
        "simpleNetBenefitLeiByHorizon": simple_net_benefit,
        "economicHorizonsYears": economic_horizons,
        "roiPercentPerYear": (
            None
            if selected.roi_percent_per_year is None
            else float(selected.roi_percent_per_year)
        ),
        "paybackYears": (
            None
            if selected.payback_years is None
            else float(selected.payback_years)
        ),
        "selected": active_rows,
        "selectedHeating": selected_heating,
        "heatPumpPerformanceProfile": heat_pump_profile,
        "evaluatedCandidates": int(evaluated_candidates),
        "calculationTimeMs": calculation_time_ms,
        "parametricEvaluations": int(parametric_evaluations),
        "heatingBranchEvaluations": int(heating_branch_evaluations),
        "feasibleCandidates": int(feasible_total or selection.feasible_count),
        "paretoSolutions": int(selection.pareto_count),
        "paretoScope": pareto_scope,
        "heatingBranches": [model_to_dict(item) for item in branches],
        "technicalHeatingAlternatives": technical_heating_alternatives or [],
        "rawSolution": raw_measures,
        "rawEvaluation": {
            "candidateId": raw_selected.candidate_id,
            "annualBillLei": float(raw_selected.annual_bill_lei),
            "baselineAnnualBillLei": float(raw_selected.baseline_annual_bill_lei),
            "finalEnergyKwh": float(raw_selected.final_energy_kwh),
            "primarySpecificKwhM2": float(raw_selected.primary_specific_kwh_m2),
            "co2TotalKg": float(raw_selected.co2_total_kg),
            "co2SpecificKgM2": float(raw_selected.co2_specific_kg_m2),
            "energyClass": raw_selected.energy_class,
            "designHeatLoadKw": raw_selected.design_heat_load_kw,
        },
        "commercialEvaluation": {
            "candidateId": selected.candidate_id,
            "annualBillLei": float(selected.annual_bill_lei),
            "capexLei": float(selected.capex_lei),
            "annualSavingLei": float(selected.annual_saving_lei),
            "finalEnergyKwh": float(selected.final_energy_kwh),
            "primarySpecificKwhM2": float(selected.primary_specific_kwh_m2),
            "co2SpecificKgM2": float(selected.co2_specific_kg_m2),
            "energyClass": selected.energy_class,
            "designHeatLoadKw": selected.design_heat_load_kw,
        },
        "resultingConfiguration": model_to_dict(selected.resulting_configuration),
        "commercialSolution": (
            {
                "items": [
                    {
                        "family": "heating",
                        "label": selected_heating["label"],
                        "detail": (
                            f"Produs real selectat după optimizarea parametrică · "
                            f"{selected_heating['ratedPowerKw']:.2f} kW · "
                            f"CAPEX {selected_heating['capexLei']:.0f} lei"
                        ),
                    }
                ]
            }
            if selected_heating is not None
            and selected_heating.get("optionId")
            else None
        ),
        "commercializationStatus": selected.commercialization_status,
        "commercialReady": commercial_ready,
        "commercialMessage": (
            "Soluția nu necesită discretizare comercială."
            if commercial_ready
            else (
                (
                    "Generatorul finalist a fost discretizat la un produs real; "
                    "celelalte familii active rămân parametrice până la atașarea "
                    "catalogului complet de produse. "
                )
                if selected_heating is not None
                and selected_heating.get("optionId")
                else (
                    "Catalogul comercial complet nu este încă atașat acestei rulări. "
                    "Rezultatul de mai jos este optimul parametric; raportul nu inventează "
                    "grosimi, module, ferestre sau echipamente comerciale."
                )
            )
        ),
        "discretization": [],
        "costSource": selected.cost_source,
        "costCatalogVersion": selected.cost_catalog_version,
        "warnings": [*warnings, *selected.warnings],
        "autoHorizonsYears": selection.auto_horizons_years,
        "executionMode": "sharded_by_heating_branch",
    }
    return {
        "scenario": scenario_payload,
        "optimization": optimization_payload,
    }

@app.post("/api/optimization/home-lab/v4/plan")
async def home_lab_optimization_v4_plan_api(request: Request) -> JSONResponse:
    """Build a deep browser-executed TEO plan and one bounded physics kernel."""

    form = dict(await request.form())
    try:
        mode, building, optimization_request = _home_lab_optimization_request_from_form(form)
        run_id = str(form.get("_optimizer_run_id") or "").strip()
        heating_summary = await _optimizer_heating_catalog_summary(request)
        cost_catalog = await _optimizer_cost_catalog(request)

        started = time.perf_counter()
        bounds = OptimizationSearchBoundsV1()
        branches = heating_branch_plan(
            optimization_request,
            heating_summary,
        )
        economic_ids = [
            item.branch_id
            for item in branches
            if item.eligible and item.economic_eligible
        ]
        # Do not materialize the 2k+ TEO search grid in the constrained Python
        # isolate. The browser worker deterministically reconstructs exactly the
        # same axis + Halton + max-corner coverage from this compact spec.
        search_spec = {
            "version": "teo-v4-local-halton-1",
            "haltonSamples": 2048,
            "haltonStartIndex": 1,
            "haltonBases": [2, 3, 5, 7, 11, 13, 17],
            "axisLevels": [0.5, 1.0],
            "dimensions": 7,
            "includeOrigin": True,
            "includeMaxCorner": True,
        }
        deterministic_axis_points = 1 + (
            int(search_spec["dimensions"]) * len(search_spec["axisLevels"])
        )
        search_point_count = (
            deterministic_axis_points
            + int(search_spec["haltonSamples"])
            + (1 if search_spec["includeMaxCorner"] else 0)
        )
        if not economic_ids:
            raise ValueError("TEO V4 nu are nicio ramură economică eligibilă.")

        # One canonical pass seeds the immutable browser kernel. Search itself
        # performs zero Python candidate evaluations.
        baseline_result = calculate(building, include_reference=False)
        branch_catalogs: dict[str, dict[str, Any]] = {}
        for branch_id in economic_ids:
            branch_catalogs[branch_id] = await _optimizer_heating_branch_catalog(
                request,
                branch_id,
            )
        kernel = build_teo_v4_kernel(
            building,
            baseline_result,
            cost_catalog=cost_catalog,
            branch_catalogs=branch_catalogs,
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000.0, 1)

        payload = {
            "optimizerVersion": "teo-v4-browser",
            "runId": run_id,
            "economicMode": mode.value,
            "label": _home_lab_optimizer_label(mode, form),
            "searchMethod": "teo_v4_browser_worker_mc001_kernel",
            "searchSpec": search_spec,
            "searchBounds": model_to_dict(bounds),
            "refinementStrategy": "halton_global_plus_two_local_coordinate_rounds",
            "branches": [model_to_dict(item) for item in branches],
            "runBranchIds": economic_ids,
            "searchPointCount": search_point_count,
            "deterministicAxisPoints": deterministic_axis_points,
            "lowDiscrepancyPoints": int(search_spec["haltonSamples"]),
            "serverGeneratedSearchPoints": 0,
            "kernel": kernel,
            "serverCandidateEvaluations": 0,
            "baselineCanonicalPasses": 1,
            "calculationTimeMs": elapsed_ms,
            "executionMode": "browser_web_worker_v4",
            "heatingCatalogSource": heating_summary.get("source"),
            "heatingCatalogStats": heating_summary.get("catalog_stats") or {},
        }
        response = JSONResponse(payload)

        # The kernel is already encoded into the response. Do not retain branch
        # catalogs or a full canonical baseline in the warm Python isolate.
        del baseline_result
        del branch_catalogs
        del cost_catalog
        del kernel
        del branches
        del search_spec
        del payload
        clear_baseline_evaluation_cache()
        clear_heating_optimizer_runtime_caches()
        gc.collect()
        return response
    except Exception as exc:
        return JSONResponse(
            {
                "error": user_error(exc),
                "optimizerVersion": "teo-v4-browser",
                "stage": "plan",
            },
            status_code=422,
        )


@app.post("/api/optimization/home-lab/v3/plan")
async def home_lab_optimization_v3_plan_api(request: Request) -> JSONResponse:
    """Build a deep V3 search grid without evaluating it monolithically."""

    form = dict(await request.form())
    try:
        mode, _, optimization_request = _home_lab_optimization_request_from_form(form)
        heating_catalog = await _optimizer_heating_catalog_summary(request)
        run_id = str(form.get("_optimizer_run_id") or "").strip()
        started = time.perf_counter()
        plan = build_worker_safe_plan_v3(
            optimization_request,
            bounds=OptimizationSearchBoundsV1(),
            heating_catalog=heating_catalog,
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000.0, 1)
        economic_ids = [
            item.branch_id
            for item in plan.branches
            if item.eligible and item.economic_eligible
        ]
        technical_ids = [
            item.branch_id
            for item in plan.branches
            if item.eligible and not item.economic_eligible
        ]
        return JSONResponse(
            {
                "optimizerVersion": "v3-sharded",
                "runId": run_id,
                "economicMode": mode.value,
                "label": _home_lab_optimizer_label(mode, form),
                "searchMethod": plan.search_method,
                "searchPoints": [
                    model_to_dict(item)
                    for item in plan.search_points
                ],
                "branches": [
                    model_to_dict(item)
                    for item in plan.branches
                ],
                "runBranchIds": economic_ids,
                "technicalPreviewBranchIds": technical_ids,
                "representativeEvaluations": int(
                    plan.representative_evaluations
                ),
                "representativePoolSize": int(
                    plan.representative_pool_size
                ),
                "baseShortlistSize": int(plan.base_shortlist_size),
                "deterministicAxisPoints": int(plan.deterministic_axis_points),
                "lowDiscrepancyPoints": int(plan.low_discrepancy_points),
                "searchPointCount": len(plan.search_points),
                "branchBatchSize": int(plan.branch_batch_size),
                "calculationTimeMs": elapsed_ms,
                "executionMode": "ui_orchestrated_sharded_v3",
                "heatingCatalogSource": heating_catalog.get("source"),
                "heatingCatalogStats": heating_catalog.get("catalog_stats") or {
                    "products": len(heating_catalog.get("options") or []),
                    "performance_points": len(heating_catalog.get("heat_pump_performance_points") or []),
                    "seasonal_points": len(heating_catalog.get("heat_pump_seasonal_performance") or []),
                },
            }
        )
    except Exception as exc:
        return JSONResponse(
            {
                "error": user_error(exc),
                "optimizerVersion": "v3-sharded",
                "stage": "plan",
            },
            status_code=422,
        )


def _compact_fast_candidate_payload(candidate: CandidateEvaluationV1) -> dict[str, Any]:
    """Serialize only data needed for global ranking and canonical verification.

    Fast search candidates can contain a full BuildingInput plus cost lines,
    assumptions and warnings. Shipping those transient object graphs thousands
    of times increases Python/WASM heap pressure without helping ranking.
    Canonical verification rebuilds the selected finalists from parameters.
    """

    data = model_to_dict(candidate)
    data.pop("resulting_configuration", None)
    data.pop("cost_breakdown", None)
    data.pop("assumptions", None)
    data.pop("warnings", None)
    return data


@app.post("/api/optimization/home-lab/v3/branch")
async def home_lab_optimization_v3_branch_api(request: Request) -> JSONResponse:
    """Evaluate one small branch/search batch with the V2 fast kernel."""

    try:
        raw = await request.json()
        form = dict(raw.get("form") or {})
        branch_id = str(raw.get("branchId", "") or "").strip()
        run_id = str(raw.get("runId") or "").strip()
        baseline_bill_raw = raw.get("baselineAnnualBillLei")
        baseline_annual_bill_lei = (
            None
            if baseline_bill_raw in (None, "")
            else float(baseline_bill_raw)
        )
        batch_raw = raw.get("batch") or []
        if not branch_id:
            raise ValueError("Lipsește ramura de încălzire V3.")
        if not isinstance(batch_raw, list) or not batch_raw:
            raise ValueError("Lipsește batch-ul de căutare V3.")
        if len(batch_raw) > V3_BRANCH_BATCH_SIZE:
            raise ValueError(
                f"Batch-ul V3 depășește limita CPU-safe de {V3_BRANCH_BATCH_SIZE} configurații."
            )

        _, _, optimization_request = _home_lab_optimization_request_from_form(form)
        batch = [
            ParametricMeasuresV1(**item)
            for item in batch_raw
            if isinstance(item, dict)
        ]
        cost_catalog = await _optimizer_cost_catalog(request)
        heating_catalog = await _optimizer_heating_branch_catalog(
            request,
            branch_id,
        )
        started = time.perf_counter()
        result = evaluate_worker_safe_branch_v2(
            optimization_request,
            branch_id=branch_id,
            shortlist=batch,
            bounds=OptimizationSearchBoundsV1(),
            catalog=cost_catalog,
            heating_catalog=heating_catalog,
            baseline_annual_bill_lei=baseline_annual_bill_lei,
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000.0, 1)
        payload = {
            "optimizerVersion": "v3-sharded",
            "runId": run_id,
            "branch": model_to_dict(result.branch),
            "candidates": [
                _compact_fast_candidate_payload(item)
                for item in result.candidates
            ],
            "candidateCount": len(result.candidates),
            "fastEvaluations": int(result.fast_evaluations),
            "calculationTimeMs": elapsed_ms,
            "searchMethod": "halton_branch_batch_v3",
            "heatingCatalogMode": heating_catalog.get("catalog_mode"),
            "heatingCatalogStats": heating_catalog.get("catalog_stats") or {},
        }
        response = JSONResponse(payload)

        # Cloudflare Python Workers reuse isolates. Explicitly drop the heavy
        # transient graph after JSONResponse has encoded it, then collect cyclic
        # garbage before this isolate accepts another optimizer request.
        del result
        del batch
        del optimization_request
        del cost_catalog
        del heating_catalog
        del payload
        gc.collect()
        return response
    except Exception as exc:
        return JSONResponse(
            {
                "error": user_error(exc),
                "optimizerVersion": "v3-sharded",
                "stage": "branch",
            },
            status_code=422,
        )


@app.post("/api/optimization/home-lab/v4/flow/start")
async def home_lab_optimization_v4_flow_start_api(request: Request) -> JSONResponse:
    """Start a D1-backed verification flow that serializes heavy RBPE passes."""

    try:
        raw = await request.json()
        run_id = str(raw.get("runId") or "").strip()
        if not run_id or len(run_id) > 160:
            raise ValueError("Run ID TEO invalid.")
        planned = int(raw.get("plannedVerifications") or TEO_FLOW_MAX_VERIFICATIONS)
        return JSONResponse(
            await _teo_flow_start(request, run_id, planned),
            headers={"Cache-Control": "no-store"},
        )
    except Exception as exc:
        return JSONResponse(
            {"error": user_error(exc), "stage": "teo-flow-start"},
            status_code=422,
            headers={"Cache-Control": "no-store"},
        )


@app.get("/api/optimization/home-lab/v4/flow/{run_id}")
async def home_lab_optimization_v4_flow_status_api(
    run_id: str,
    request: Request,
) -> JSONResponse:
    """Cheap status probe. It never runs RBPE physics."""

    try:
        if not run_id or len(run_id) > 160:
            raise ValueError("Run ID TEO invalid.")
        return JSONResponse(
            await _teo_flow_status(request, run_id),
            headers={"Cache-Control": "no-store"},
        )
    except Exception as exc:
        return JSONResponse(
            {"error": user_error(exc), "stage": "teo-flow-status"},
            status_code=422,
            headers={"Cache-Control": "no-store"},
        )


@app.post("/api/optimization/home-lab/v4/flow/{run_id}/finish")
async def home_lab_optimization_v4_flow_finish_api(
    run_id: str,
    request: Request,
) -> JSONResponse:
    """Mark an adaptively completed verification flow as finished."""

    try:
        if not run_id or len(run_id) > 160:
            raise ValueError("Run ID TEO invalid.")
        return JSONResponse(
            await _teo_flow_finish(request, run_id),
            headers={"Cache-Control": "no-store"},
        )
    except Exception as exc:
        return JSONResponse(
            {"error": user_error(exc), "stage": "teo-flow-finish"},
            status_code=422,
            headers={"Cache-Control": "no-store"},
        )


@app.post("/api/optimization/home-lab/v3/verification-plan")
async def home_lab_optimization_v3_verification_plan_api(
    request: Request,
) -> JSONResponse:
    """Rank the global fast pool and choose an adaptive canonical verify set."""

    try:
        raw = await request.json()
        form = dict(raw.get("form") or {})
        rows = raw.get("candidateRows") or []
        if not isinstance(rows, list) or not rows:
            raise ValueError("Lipsesc candidații V3 pentru planul de verificare.")

        _, _, optimization_request = _home_lab_optimization_request_from_form(form)
        candidates: list[CandidateEvaluationV1] = []
        branch_ids: dict[str, str] = {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            candidate_raw = row.get("candidate")
            branch_id = str(row.get("branchId") or "").strip()
            if not isinstance(candidate_raw, dict) or not branch_id:
                continue
            candidate = CandidateEvaluationV1(**candidate_raw)
            candidates.append(candidate)
            branch_ids[candidate.candidate_id] = branch_id

        plan = build_verification_plan_v3(
            optimization_request,
            candidates=candidates,
            candidate_branch_ids=branch_ids,
        )
        return JSONResponse(
            {
                "optimizerVersion": "v3-sharded",
                "strategy": plan.strategy,
                "sourceCandidateCount": int(plan.source_candidate_count),
                "frontierCount": int(plan.frontier_count),
                "verificationCount": int(plan.requested_count),
                "targets": [
                    {
                        "branchId": plan.candidate_branch_ids.get(
                            item.candidate_id
                        ),
                        "candidate": model_to_dict(item),
                    }
                    for item in plan.candidates
                ],
            }
        )
    except Exception as exc:
        return JSONResponse(
            {
                "error": user_error(exc),
                "optimizerVersion": "v3-sharded",
                "stage": "verification-plan",
            },
            status_code=422,
        )


@app.post("/api/optimization/home-lab/v3/verify")
async def home_lab_optimization_v3_verify_api(request: Request) -> JSONResponse:
    """Canonical verification work unit: exactly one finalist per gated request."""

    flow_lease_token: str | None = None
    run_id = ""
    try:
        raw = await request.json()
        form = dict(raw.get("form") or {})
        branch_id = str(raw.get("branchId") or "").strip()
        candidate_raw = raw.get("candidate")
        run_id = str(raw.get("runId") or form.get("_optimizer_run_id") or "").strip()
        baseline_bill_raw = raw.get("baselineAnnualBillLei")
        baseline_annual_bill_lei = (
            None
            if baseline_bill_raw in (None, "")
            else float(baseline_bill_raw)
        )
        if not branch_id or not isinstance(candidate_raw, dict):
            raise ValueError("Lipsește finalistul V3 pentru verificare.")

        router_flow_gated = (
            request.headers.get("x-lacurent-flow-gated", "").strip() == "1"
        )
        if run_id and not router_flow_gated:
            gate = await _teo_flow_acquire_verification(request, run_id)
            if not gate.get("acquired"):
                state = gate.get("state") or {}
                retry_after_ms = int(state.get("retryAfterMs") or TEO_FLOW_COOLDOWN_MS)
                return JSONResponse(
                    {
                        "error": "TEO Worker Flow nu este încă pregătit pentru următorul VERIFY.",
                        "optimizerVersion": "v4-adaptive",
                        "stage": "verify-gate",
                        "workerFlow": state,
                    },
                    status_code=409,
                    headers={
                        "Cache-Control": "no-store",
                        "Retry-After": str(max(1, math.ceil(retry_after_ms / 1000))),
                    },
                )
            flow_lease_token = gate.get("leaseToken")

        _, _, optimization_request = _home_lab_optimization_request_from_form(form)
        cost_catalog = await _optimizer_cost_catalog(request)
        heating_catalog = await _optimizer_heating_branch_catalog(
            request,
            branch_id,
        )
        fast_candidate = CandidateEvaluationV1(**candidate_raw)
        started = time.perf_counter()
        verified, rbpe_execution = await _verify_candidate_via_rbpe(
            request,
            optimization_request=optimization_request,
            fast_candidate=fast_candidate,
            branch_id=branch_id,
            cost_catalog=cost_catalog,
            heating_catalog=heating_catalog,
            baseline_annual_bill_lei=baseline_annual_bill_lei,
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000.0, 1)
        worker_flow = (
            await _teo_flow_complete_verification(
                request,
                run_id,
                flow_lease_token,
            )
            if run_id and not router_flow_gated
            else None
        )
        payload = {
            "optimizerVersion": "v4-adaptive",
            "branchId": branch_id,
            "candidate": dict(verified["candidate"]),
            "sourceCandidateId": fast_candidate.candidate_id,
            "annualBillDeltaLei": float(verified["annual_bill_delta_lei"]),
            "designLoadDeltaKw": float(verified["design_load_delta_kw"]),
            "warnings": list(verified.get("warnings") or []),
            "calculationTimeMs": elapsed_ms,
            "workerFlow": worker_flow,
            "rbpeExecution": rbpe_execution,
        }
        response = JSONResponse(
            payload,
            headers={"Cache-Control": "no-store"},
        )

        del verified
        del fast_candidate
        del optimization_request
        del cost_catalog
        del heating_catalog
        del payload
        clear_baseline_evaluation_cache()
        clear_heating_optimizer_runtime_caches()
        gc.collect()
        return response
    except Exception as exc:
        if run_id and flow_lease_token:
            try:
                await _teo_flow_release_verification(
                    request,
                    run_id,
                    flow_lease_token,
                )
            except Exception:
                pass
        return JSONResponse(
            {
                "error": user_error(exc),
                "optimizerVersion": "v4-adaptive",
                "stage": "verify",
            },
            status_code=422,
            headers={"Cache-Control": "no-store"},
        )


@app.post("/api/optimization/home-lab/v3/product")
async def home_lab_optimization_v3_product_api(request: Request) -> JSONResponse:
    """Commercial work unit: bounded D1 match + one exact finalist recalculation."""

    try:
        raw = await request.json()
        form = dict(raw.get("form") or {})
        branch_id = str(raw.get("branchId") or "").strip()
        candidate_raw = raw.get("candidate")
        source_candidate_id = str(
            raw.get("sourceCandidateId") or ""
        ).strip()
        if not branch_id or not isinstance(candidate_raw, dict):
            raise ValueError("Lipsește finalistul V3 pentru maparea comercială.")

        _, _, optimization_request = _home_lab_optimization_request_from_form(form)
        candidate = CandidateEvaluationV1(**candidate_raw)
        required_power_kw = float(candidate.design_heat_load_kw or 0.0)
        started = time.perf_counter()
        heating_catalog = await _optimizer_heating_commercial_branch_catalog(
            request,
            branch_id,
            required_power_kw,
        )
        commercialized, rbpe_execution = await _commercialize_candidate_via_rbpe(
            request,
            candidate=candidate,
            original_building=optimization_request.baseline,
            heating_catalog=heating_catalog,
            branch_id=branch_id,
        )
        commercial_candidate = CandidateEvaluationV1(
            **dict(commercialized["candidate"])
        )
        matched_product = commercialized.get("matchedProduct")
        matched_quantity = int(commercialized.get("matchedProductQuantity") or 1)
        scenario_raw = commercialized.get("scenario")
        scenario = (
            dict(scenario_raw)
            if isinstance(scenario_raw, dict)
            else _optimizer_candidate_scenario_snapshot(
                commercial_candidate,
                form,
            )
        )
        heat_pump_profile = commercialized.get("heatPumpPerformanceProfile")
        warnings = list(commercialized.get("warnings") or [])

        elapsed_ms = round((time.perf_counter() - started) * 1000.0, 1)
        payload = {
            "optimizerVersion": "v3-sharded",
            "branchId": branch_id,
            "candidate": model_to_dict(commercial_candidate),
            "sourceCandidateId": (
                source_candidate_id or candidate.candidate_id
            ),
            "matchedProduct": matched_product,
            "matchedProductQuantity": matched_quantity,
            "scenario": scenario,
            "heatPumpPerformanceProfile": heat_pump_profile,
            "catalogSource": heating_catalog.get("source"),
            "catalogMode": heating_catalog.get("catalog_mode"),
            "catalogStats": heating_catalog.get("catalog_stats") or {},
            "warnings": warnings,
            "calculationTimeMs": elapsed_ms,
            "rbpeExecution": rbpe_execution,
        }
        response = JSONResponse(payload)

        # Do not let one commercial request pin its bounded SKU curves or final
        # engine graph in a long-lived Pyodide isolate.
        del heating_catalog
        del optimization_request
        del payload
        clear_baseline_evaluation_cache()
        clear_heating_optimizer_runtime_caches()
        gc.collect()
        return response
    except Exception as exc:
        return JSONResponse(
            {
                "error": user_error(exc),
                "optimizerVersion": "v3-sharded",
                "stage": "product",
            },
            status_code=422,
        )


@app.post("/api/optimization/home-lab/v3/finalize")
async def home_lab_optimization_v3_finalize_api(request: Request) -> JSONResponse:
    """Pure selection/report assembly over already-computed VERIFY/PRODUCT rows."""

    try:
        raw = await request.json()
        form = dict(raw.get("form") or {})
        commercial_rows = raw.get("commercialRows") or []
        verified_rows = raw.get("verifiedRows") or []
        branch_stats = raw.get("branchStats") or []
        branch_plan_raw = raw.get("branchPlan") or []
        if not isinstance(commercial_rows, list):
            raise ValueError("Finaliștii comerciali V3 trebuie să fie o listă.")
        if not isinstance(verified_rows, list) or not verified_rows:
            raise ValueError("Lipsesc finaliștii canonici V3.")
        if not isinstance(branch_plan_raw, list):
            branch_plan_raw = []

        mode, _, optimization_request = _home_lab_optimization_request_from_form(form)
        started = time.perf_counter()

        commercial_candidates: list[CandidateEvaluationV1] = []
        source_by_commercial_id: dict[str, str] = {}
        branch_by_commercial_id: dict[str, str] = {}
        row_by_commercial_id: dict[str, dict[str, Any]] = {}
        for row in commercial_rows:
            if not isinstance(row, dict):
                continue
            candidate_raw = row.get("candidate")
            if not isinstance(candidate_raw, dict):
                continue
            candidate = CandidateEvaluationV1(**candidate_raw)
            commercial_candidates.append(candidate)
            source_by_commercial_id[candidate.candidate_id] = str(
                row.get("sourceCandidateId") or ""
            )
            branch_by_commercial_id[candidate.candidate_id] = str(
                row.get("branchId") or ""
            )
            row_by_commercial_id[candidate.candidate_id] = row

        verified_by_id: dict[str, CandidateEvaluationV1] = {}
        branch_by_verified_id: dict[str, str] = {}
        for row in verified_rows:
            if not isinstance(row, dict):
                continue
            candidate_raw = row.get("candidate")
            if not isinstance(candidate_raw, dict):
                continue
            candidate = CandidateEvaluationV1(**candidate_raw)
            verified_by_id[candidate.candidate_id] = candidate
            branch_by_verified_id[candidate.candidate_id] = str(
                row.get("branchId") or ""
            )

        selection_pool = (
            commercial_candidates
            if commercial_candidates
            else list(verified_by_id.values())
        )
        selection = select_optimization_candidate_v2(
            optimization_request,
            selection_pool,
        )
        if selection.selected is None:
            raise ValueError("Nicio soluție V3 verificată nu satisface regula economică.")

        selected = selection.selected
        commercial_source_id = source_by_commercial_id.get(
            selected.candidate_id,
            "",
        )
        raw_selected = verified_by_id.get(commercial_source_id)
        if raw_selected is None:
            raw_selected = selected

        selected_branch_id = (
            branch_by_commercial_id.get(selected.candidate_id)
            or branch_by_verified_id.get(raw_selected.candidate_id)
            or "keep-current-heating"
        )

        selected_product_row = row_by_commercial_id.get(selected.candidate_id)
        precomputed_scenario: dict[str, Any]
        precomputed_heat_pump_profile: dict[str, Any] | None = None
        if selected_product_row is not None:
            scenario_raw = selected_product_row.get("scenario")
            precomputed_scenario = (
                dict(scenario_raw)
                if isinstance(scenario_raw, dict)
                else _optimizer_candidate_scenario_snapshot(selected, form)
            )
            hp_raw = selected_product_row.get("heatPumpPerformanceProfile")
            if isinstance(hp_raw, dict):
                precomputed_heat_pump_profile = dict(hp_raw)

            matched_product_raw = selected_product_row.get("matchedProduct")
            matched_options = (
                [dict(matched_product_raw)]
                if isinstance(matched_product_raw, dict)
                else []
            )
            heating_catalog = {
                "source": selected_product_row.get("catalogSource")
                or "precomputed_product_row",
                "catalog_mode": "finalize_precomputed_product_row",
                "technology_id": selected_branch_id,
                "options": matched_options,
                "heat_pump_performance_points": [],
                "heat_pump_seasonal_performance": [],
                "parametric_heating_nodes": [],
                "catalog_stats": {
                    "products": len(matched_options),
                    "loaded_products": len(matched_options),
                    "performance_points": 0,
                    "seasonal_points": 0,
                    "parametric_nodes": 0,
                },
            }
        else:
            precomputed_scenario = _optimizer_candidate_scenario_snapshot(
                selected,
                form,
            )
            heating_catalog = {
                "source": "canonical_fallback",
                "catalog_mode": "canonical_fallback_no_product_read",
                "technology_id": selected_branch_id,
                "options": [],
                "heat_pump_performance_points": [],
                "heat_pump_seasonal_performance": [],
                "parametric_heating_nodes": [],
                "catalog_stats": {
                    "products": 0,
                    "loaded_products": 0,
                    "performance_points": 0,
                    "seasonal_points": 0,
                    "parametric_nodes": 0,
                },
            }

        stats_by_id: dict[str, dict[str, Any]] = {
            str(item.get("branchId") or ""): item
            for item in branch_stats
            if isinstance(item, dict)
        }
        branches: list[HeatingBranchSummaryV1] = []
        for branch_raw in branch_plan_raw:
            if not isinstance(branch_raw, dict):
                continue
            try:
                branch = HeatingBranchSummaryV1(**branch_raw)
            except Exception:
                continue
            stats = stats_by_id.get(branch.branch_id)
            if not stats:
                branches.append(branch)
                continue
            data = model_to_dict(branch)
            data["evaluated_candidates"] = int(
                stats.get("evaluatedCandidates") or 0
            )
            data["accepted_candidates"] = int(
                stats.get("acceptedCandidates") or 0
            )
            data["feasible_candidates"] = int(
                stats.get("feasibleCandidates") or 0
            )
            branches.append(HeatingBranchSummaryV1(**data))

        representative_evaluations = int(
            raw.get("representativeEvaluations") or 0
        )
        branch_fast_evaluations = int(
            raw.get("branchFastEvaluations") or 0
        )
        prior_elapsed_ms = float(
            raw.get("priorCalculationTimeMs") or 0.0
        )
        elapsed_ms = round(
            prior_elapsed_ms
            + (time.perf_counter() - started) * 1000.0,
            1,
        )
        commercial_matches = sum(
            1
            for row in commercial_rows
            if isinstance(row, dict) and row.get("matchedProduct")
        )
        product_target_count = int(raw.get("productTargetCount") or 0)
        product_failure_count = int(raw.get("productFailureCount") or 0)
        warnings = [
            (
                "TEO păstrează căutarea profundă și verificarea canonică; "
                "PRODUCT citește din D1 numai un set fix de SKU-uri din jurul "
                "necesarului de putere și curbele asociate acelor SKU-uri."
            ),
            (
                "FINALIZE este acum o etapă de selecție și serializare: "
                "0 recalculări energetice și 0 citiri de catalog."
            ),
            (
                f"PRODUCT safe mode: {len(commercial_rows)}/"
                f"{product_target_count or len(commercial_rows)} recheck-uri "
                "comerciale exacte au fost finalizate."
            ),
        ]
        if product_failure_count:
            warnings.append(
                (
                    f"{product_failure_count} request(uri) PRODUCT au eșuat și au "
                    "fost omise fără retry agresiv."
                )
            )
        if not commercial_candidates:
            warnings.append(
                (
                    "Niciun recheck PRODUCT nu a fost disponibil; rezultatul final "
                    "rămâne finalistul canonic verificat, fără o nouă rulare a "
                    "motorului în FINALIZE."
                )
            )
        for row in [*verified_rows, *commercial_rows]:
            if isinstance(row, dict):
                warnings.extend(
                    str(item)
                    for item in (row.get("warnings") or [])
                    if item
                )

        payload = _home_lab_optimizer_success_payload(
            mode=mode,
            form=form,
            selection=selection,
            branches=branches,
            evaluated_candidates=int(raw.get("sourceCandidateCount") or 0),
            parametric_evaluations=(
                representative_evaluations + branch_fast_evaluations
            ),
            heating_branch_evaluations=branch_fast_evaluations,
            warnings=warnings,
            calculation_time_ms=elapsed_ms,
            pareto_scope=(
                "v3_verified_bounded_commercial_rechecks"
                if commercial_candidates
                else "v3_canonical_fallback_no_commercial_recheck"
            ),
            raw_selected=raw_selected,
            technical_heating_alternatives=[],
            heating_catalog=heating_catalog,
            precomputed_scenario=precomputed_scenario,
            precomputed_heat_pump_profile=precomputed_heat_pump_profile,
        )
        payload["optimization"].update(
            {
                "optimizerVersion": "v3-sharded",
                "searchMethod": "deterministic_axis_halton_sharded_v3",
                "executionMode": "ui_orchestrated_sharded_v3",
                "representativeEvaluations": representative_evaluations,
                "branchFastEvaluations": branch_fast_evaluations,
                "fullEngineVerifications": len(verified_rows),
                "commercialRechecks": len(commercial_rows),
                "commercialMatches": commercial_matches,
                "commercialRecheckTargetCount": product_target_count,
                "commercialRecheckFailures": product_failure_count,
                "searchPointCount": int(raw.get("searchPointCount") or 0),
                "branchBatchSize": int(
                    raw.get("branchBatchSize") or V3_BRANCH_BATCH_SIZE
                ),
                "verificationFrontierCount": int(
                    raw.get("verificationFrontierCount") or 0
                ),
                "runId": str(raw.get("runId") or ""),
                "heatingCatalogSource": heating_catalog.get("source"),
                "finalizeRecalculations": 0,
                "finalizeCatalogReads": 0,
            }
        )
        return JSONResponse(payload)
    except Exception as exc:
        return JSONResponse(
            {
                "error": user_error(exc),
                "optimizerVersion": "v3-sharded",
                "stage": "finalize",
            },
            status_code=422,
        )

