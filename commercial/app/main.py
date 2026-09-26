from __future__ import annotations

import asyncio
import json
import math
from functools import lru_cache
from pathlib import Path
import time
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import ValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .engine import calculate, demo_building, design_heat_load_breakdown
from .error_page import render_error_html
from .home_lab_images import HOME_LAB_IMAGE_BYTES
from .methodology import climate_data, methodology, resolve_locality
from .models import BuildingInput, building_from_json, model_to_dict, model_to_json
from .optimization import (
    CandidateEvaluationV1,
    OptimizationCandidateRequestV1,
    OptimizationMode,
    OptimizationRequestV1,
    ParametricMeasuresV1,
    OptimizationSearchBoundsV1,
    OptimizationSearchRequestV1,
    OptimizationSelectionRequestV1,
    evaluate_parametric_candidate,
    compact_refinement_candidate,
    parametric_phase_candidate_descriptors,
    pareto_frontier,
    refinement_seed_from_compact,
    run_parametric_optimization,
    select_optimization_candidate,
)
from .optimization_v2 import (
    V2_WORKER_VERIFICATION_LIMIT,
    build_worker_safe_plan_v2,
    evaluate_worker_safe_branch_v2,
    run_physics_informed_optimization,
    select_optimization_candidate_v2,
    verify_worker_safe_finalists_v2,
)
from .commercialization import (
    WallCommercializationRequestV1,
    WallProductBackedOptimizationRequestV1,
    commercialize_wall_candidate,
    run_wall_product_backed_optimization,
)
from .full_commercialization import (
    FullProductBackedOptimizationRequestV1,
    run_full_product_backed_optimization,
)
from .heating_optimization import (
    HeatingBranchSummaryV1,
    apply_supplemental_heating_technology,
    commercialize_heating_finalist,
    heating_branch_plan,
    heating_planning_options,
    heat_pump_monthly_performance_profile,
    run_heating_branch_optimization,
    run_mixed_heating_optimization,
)
from .heating_catalog_store import (
    cached_heating_catalog_from_d1,
    seed_heating_catalog_payload,
)
from .pricing import energy_prices, estimate_energy_cost, home_lab_price_overview
from .cost_curves import (
    WallCostCurveRequestV1,
    WallProductDiscretizationRequestV1,
    build_wall_product_cost_curve,
    discretize_wall_product,
)
from .product_matching import (
    WallInsulationProductMatchRequestV1,
    WallInsulationProductScenarioRequestV1,
    build_product_wall_insulation_scenario,
    match_wall_insulation_products,
)
from .renovation import WallInsulationScenarioRequestV1, build_wall_insulation_scenario
from .simulation_facts import (
    get_published_simulation_fact,
    list_published_simulation_facts,
)

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
HOME_LAB_IMAGE_NAMES = frozenset(HOME_LAB_IMAGE_BYTES)
LOCATION_REGISTRY_PATH = DATA_DIR / "localities.json"
CLIMATE_ZONES_PATH = DATA_DIR / "winter-climate-zones.geojson"
ROMANIA_BOUNDARY_PATH = DATA_DIR / "romania-boundary.geojson"
ROI_COST_BASIS_PATH = DATA_DIR / "roi-cost-basis.seed.json"
ROI_COST_BASIS_CACHE_SECONDS = 900
ROI_COST_BASIS_RETRY_SECONDS = 30
LOCATION_STREAM_CHUNK_BYTES = 64 * 1024

_roi_cost_basis_lock = asyncio.Lock()
_roi_cost_basis_cached_payload: dict[str, Any] | None = None
_roi_cost_basis_cache_expires_at = 0.0
_roi_cost_basis_retry_after = 0.0

@lru_cache(maxsize=1)
def embed_partner_registry() -> dict[str, Any]:
    path = BASE_DIR / "data" / "embed-partners.json"
    return json.loads(path.read_text(encoding="utf-8"))


def embed_partner(partner_id: str) -> dict[str, Any]:
    raw = embed_partner_registry().get("partners", {}).get(partner_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Unknown LaCurent embed partner.")
    return {"id": partner_id, **raw}


def embed_page_context(partner_id: str) -> dict[str, Any]:
    partner = embed_partner(partner_id)
    return {
        "embed_mode": True,
        "partner": partner,
        "calculate_action": f"/embed/{partner_id}/calculate",
        "calculator_url": f"/embed/{partner_id}",
        "demo_url": f"/embed/{partner_id}/demo",
    }


app = FastAPI(
    title="LaCurent",
    version="2.4.0",
    description="LaCurent Home Lab energy engineering.",
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "templates")


def _browser_navigation(request: Request) -> bool:
    if request.method.upper() not in {"GET", "HEAD"}:
        return False
    path = request.url.path
    if path.startswith(("/api/", "/static/", "/home-lab-assets/")):
        return False
    accept = request.headers.get("accept", "")
    return "text/html" in accept.lower()


@app.exception_handler(StarletteHTTPException)
async def friendly_http_error(request: Request, exc: StarletteHTTPException) -> Response:
    if _browser_navigation(request):
        return HTMLResponse(
            render_error_html(exc.status_code),
            status_code=exc.status_code,
            headers={"Cache-Control": "no-store"},
        )
    return JSONResponse(
        {"detail": exc.detail},
        status_code=exc.status_code,
        headers={"Cache-Control": "no-store"},
    )


@app.exception_handler(Exception)
async def friendly_unhandled_error(request: Request, exc: Exception) -> Response:
    print(
        "[LaCurent] unhandled request exception "
        f"path={request.url.path} type={type(exc).__name__} "
        f"detail={str(exc)[:300]}"
    )
    if _browser_navigation(request):
        return HTMLResponse(
            render_error_html(500),
            status_code=500,
            headers={"Cache-Control": "no-store"},
        )
    return JSONResponse(
        {"error": "Serviciul este temporar indisponibil."},
        status_code=500,
        headers={"Cache-Control": "no-store"},
    )


@app.get("/home-lab-assets/{filename}")
def home_lab_image_asset(filename: str) -> Response:
    if filename not in HOME_LAB_IMAGE_NAMES:
        raise HTTPException(status_code=404, detail="Unknown Home Lab image.")
    return Response(
        content=HOME_LAB_IMAGE_BYTES[filename],
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


def fmt(value: float | int | None, unit: str = "", digits: int = 1) -> str:
    if value is None:
        return "-"
    text = f"{float(value):,.{digits}f}".replace(",", " ")
    if digits and text.endswith("." + ("0" * digits)):
        text = text[: -(digits + 1)]
    return f"{text} {unit}".strip()


templates.env.filters["fmt"] = fmt


def _stream_file_prefix_without_final_object_brace(path: Path):
    """Stream one JSON object without its final closing brace.

    The locality registry is ~6.5 MB. Keeping it as bytes on disk and streaming
    it avoids materializing a much larger Python object graph inside the
    128 MB Cloudflare Worker isolate.
    """
    with path.open("rb") as handle:
        handle.seek(0, 2)
        cursor = handle.tell() - 1
        last = b""
        while cursor >= 0:
            handle.seek(cursor)
            last = handle.read(1)
            if last not in b" \t\r\n":
                break
            cursor -= 1
        if last != b"}":
            raise RuntimeError(f"{path.name} is not a JSON object.")

        handle.seek(0)
        remaining = cursor
        while remaining > 0:
            chunk = handle.read(min(LOCATION_STREAM_CHUNK_BYTES, remaining))
            if not chunk:
                raise RuntimeError(f"Unexpected EOF while streaming {path.name}.")
            remaining -= len(chunk)
            yield chunk


def _stream_file(path: Path):
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(LOCATION_STREAM_CHUNK_BYTES)
            if not chunk:
                break
            yield chunk


def _location_payload_stream():
    # localities.json already contains every top-level field used by the
    # browser except the two map geometries. Append those raw JSON documents
    # without parsing or reserializing the 13,622-locality registry.
    yield from _stream_file_prefix_without_final_object_brace(LOCATION_REGISTRY_PATH)
    yield b',"climateZones":'
    yield from _stream_file(CLIMATE_ZONES_PATH)
    yield b',"romaniaBoundary":'
    yield from _stream_file(ROMANIA_BOUNDARY_PATH)
    yield b"}"


@app.middleware("http")
async def redirect_www_host(request: Request, call_next: Any) -> Any:
    host = request.headers.get("host", "").split(":", 1)[0].lower()
    if host == "www.lacurent.com":
        target = request.url.replace(scheme="https", netloc="lacurent.com")
        return RedirectResponse(str(target), status_code=308)
    return await call_next(request)


@app.middleware("http")
async def embed_frame_policy(request: Request, call_next: Any) -> Any:
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/embed/"):
        parts = path.split("/")
        partner_id = parts[2] if len(parts) > 2 else ""
        partner = embed_partner_registry().get("partners", {}).get(partner_id)
        if partner:
            ancestors = partner.get("frame_ancestors") or ["'self'"]
            response.headers["Content-Security-Policy"] = "frame-ancestors " + " ".join(ancestors)
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


def climate_options() -> list[str]:
    return [item["name"] for item in climate_data()["localities"]]


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


def result_context(result: Any) -> dict[str, Any]:
    envelope = sorted(result.envelope_contributions, key=lambda item: item.value, reverse=True)
    service_max = max(result.final_energy_by_service.values()) or 1
    carrier_max = max(result.final_energy_by_carrier.values()) if result.final_energy_by_carrier else 1
    monthly_max = max([row.useful_heating_kwh + row.useful_cooling_kwh for row in result.monthly] or [1])
    return {
        "result": result,
        "envelope_sorted": envelope,
        "service_max": service_max,
        "carrier_max": carrier_max,
        "monthly_max": monthly_max,
        "cost_estimate": estimate_energy_cost(result),
        "payload": model_to_json(result.input),
    }


def calculator_context(error: str | None = None, values: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "values": values or default_form_values(),
        "climate_options": climate_options(),
        "methodology": methodology(),
        "error": error,
    }


def optimizer_candidate_payload(result: Any) -> dict[str, Any]:
    """Minimal payload used while ranking optimizer candidates.

    Candidate ranking needs only four metrics. Avoid building the full dashboard
    payload (monthly charts, losses, renewables, reference metadata, etc.) for
    every trial request.
    """
    cost = estimate_energy_cost(result)
    return {
        "final_energy_kwh": float(result.total_final_energy_kwh),
        "primary_specific_kwh_m2": float(result.primary_energy.specific_kwh_m2),
        "co2_specific_kg_m2": float(result.co2.specific_kg_m2),
        "annual_cost_lei": float(cost["priced_total_lei"]) if cost.get("complete") else None,
    }


def embed_lab_result_payload(result: Any) -> dict[str, Any]:
    cost = estimate_energy_cost(result)
    climate = result.climate or {}
    selected = climate.get("selected_locality", {})
    design_temperature = climate.get("winter_design_temperature_c")
    annual_outdoor_temperature_c = float(result.annual_outdoor_temperature_c)
    design_load = design_heat_load_breakdown(
        result.input,
        result.transmission_components,
        result.h_ve_w_k,
        climate,
    )
    design_heat_load_kw = design_load.get("total_kw")

    loss_rows = [
        {
            "name": item.name,
            "type": item.type,
            "value_w_k": float(item.value),
            "component": item.component.value if item.component is not None else None,
            "boundary_type": item.boundary_type.value if item.boundary_type is not None else None,
            "u_value_w_m2k": (
                float(item.u_value_w_m2k)
                if item.u_value_w_m2k is not None
                else None
            ),
            "effective_u_value_w_m2k": (
                float(item.effective_u_value_w_m2k)
                if item.effective_u_value_w_m2k is not None
                else None
            ),
            "calculation_method": item.calculation_method,
            "boundary_correction_factor": (
                float(item.boundary_correction_factor)
                if item.boundary_correction_factor is not None
                else None
            ),
            "hztu_exterior_w_k": (
                float(item.hztu_exterior_w_k)
                if item.hztu_exterior_w_k is not None
                else None
            ),
            "hztu_total_w_k": (
                float(item.hztu_total_w_k)
                if item.hztu_total_w_k is not None
                else None
            ),
        }
        for item in [*result.envelope_contributions, *result.thermal_bridge_contributions]
        if float(item.value) > 0
    ]
    if float(result.h_ve_w_k) > 0:
        loss_rows.append(
            {
                "name": "Ventilație / infiltrații",
                "type": "ventilation",
                "value_w_k": float(result.h_ve_w_k),
                "component": "Hve",
                "boundary_type": "outside_air",
                "u_value_w_m2k": None,
                "effective_u_value_w_m2k": None,
                "calculation_method": "ventilation_heat_transfer",
                "boundary_correction_factor": None,
                "hztu_exterior_w_k": None,
                "hztu_total_w_k": None,
            }
        )
    loss_total = sum(row["value_w_k"] for row in loss_rows) or 1.0
    for row in loss_rows:
        row["percent"] = 100.0 * row["value_w_k"] / loss_total
    loss_rows.sort(key=lambda row: row["value_w_k"], reverse=True)

    reference = result.reference
    method = methodology()
    reference_rules = method["reference_building"]
    from .reference import reference_physical_mapping
    physical_reference = reference_physical_mapping(result.input)
    climate_zone = str(climate.get("climate_zone") or "")
    if not climate_zone:
        try:
            locality_meta = resolve_locality(result.input.locality)
            climate_zone = str(locality_meta.get("climateZone") or "")
        except Exception:
            climate_zone = ""
    building_type = result.input.building_type.value
    nzeb_registry = method.get("nzeb_targets", {})
    renovation_registry = method.get("renovation_targets", {})
    nzeb_target = (
        nzeb_registry.get("values", {}).get(climate_zone, {}).get(building_type)
        if climate_zone
        else None
    )
    renovation_target = (
        renovation_registry.get("values", {}).get(climate_zone, {}).get(building_type)
        if climate_zone
        else None
    )

    def _threshold_payload(
        target: dict[str, Any] | None,
        registry: dict[str, Any],
        *,
        target_kind: str,
    ) -> dict[str, Any] | None:
        if not target:
            return None
        payload = {
            "target_kind": target_kind,
            "primary_energy_kwh_m2_year": float(target["primary_energy_kwh_m2_year"]),
            "co2_kg_m2_year": float(target["co2_kg_m2_year"]),
            "building_type": building_type,
            "climate_zone": climate_zone,
            "energy_unit": registry.get("energy_unit"),
            "co2_unit": registry.get("co2_unit"),
            "source": registry.get("source"),
            "source_status": registry.get("source_status"),
            "note": registry.get("note"),
        }
        if target_kind == "new_nzeb":
            payload.update(
                {
                    "envelope_source": registry.get("envelope_source"),
                    "renewable_requirement_status": registry.get("renewable_requirement_status"),
                    "envelope_u_max_w_m2k": registry.get(
                        "residential_envelope_u_max_w_m2k", {}
                    ),
                }
            )
        return payload

    annual_fuel_use: dict[str, Any] | None = None
    for row in cost.get("rows", []):
        if str(row.get("carrier") or "") != "biomass":
            continue
        if row.get("estimated_volume_m3") is not None:
            annual_fuel_use = {
                "fuel": "firewood",
                "label": "Lemn de foc",
                "quantity": round(float(row["estimated_volume_m3"]), 3),
                "unit": "m3",
                "final_energy_kwh": round(float(row.get("final_kwh") or 0.0), 3),
                "energy_kwh_per_unit": row.get("energy_kwh_per_m3"),
                "reference_price_lei_per_unit": row.get("price_lei_per_m3"),
                "estimated_packages": row.get("estimated_packages"),
            }
            break
        if row.get("estimated_mass_tonnes") is not None:
            annual_fuel_use = {
                "fuel": "pellets",
                "label": "Peleți",
                "quantity": round(float(row["estimated_mass_tonnes"]) * 1000.0, 1),
                "unit": "kg",
                "final_energy_kwh": round(float(row.get("final_kwh") or 0.0), 3),
                "energy_kwh_per_unit": row.get("energy_kwh_per_kg"),
                "reference_price_lei_per_unit": row.get("price_lei_per_kg"),
            }
            break

    return {
        "energy_class": result.energy_class,
        "final_energy_kwh": float(result.total_final_energy_kwh),
        "gross_service_final_energy_kwh": float(result.total_service_final_energy_kwh),
        "primary_specific_kwh_m2": float(result.primary_energy.specific_kwh_m2),
        "co2_kg": float(result.co2.total_kg),
        "co2_specific_kg_m2": float(result.co2.specific_kg_m2),
        "heat_loss_w_k": float(result.heat_loss_w_k),
        "transmission_components": model_to_dict(result.transmission_components),
        "annual_outdoor_temperature_c": (
            float(annual_outdoor_temperature_c)
            if annual_outdoor_temperature_c is not None
            else None
        ),
        "annual_cost_lei": float(cost["priced_total_lei"]) if cost.get("complete") else None,
        "average_monthly_cost_lei": float(cost["average_monthly_priced_lei"]) if cost.get("complete") else None,
        "design_heat_load_kw": design_heat_load_kw,
        "design_heat_load_breakdown": design_load,
        "locality": selected.get("display_name") or result.input.locality,
        "climate_station": climate.get("station") or "",
        "climate_zone": climate_zone or None,
        "nzeb_target": _threshold_payload(
            nzeb_target,
            nzeb_registry,
            target_kind="new_nzeb",
        ),
        "renovation_target": _threshold_payload(
            renovation_target,
            renovation_registry,
            target_kind="existing_major",
        ),
        "winter_design_temperature_c": design_temperature,
        "solar_orientation": result.input.solar.orientation,
        "solar_glazing_type_id": result.input.solar.glazing_type_id,
        "final_energy_by_service": {
            key: float(value)
            for key, value in result.final_energy_by_service.items()
        },
        "gross_final_energy_by_carrier": {
            str(key): float(value)
            for key, value in result.gross_final_energy_by_carrier.items()
        },
        "final_energy_by_carrier": {
            str(key): float(value)
            for key, value in result.final_energy_by_carrier.items()
        },
        "renewables": model_to_dict(result.renewables),
        "heating_system": model_to_dict(result.heating_system),
        "annual_fuel_use": annual_fuel_use,
        "monthly": [
            {
                "month": row.month,
                "useful_heating_kwh": float(row.useful_heating_kwh),
                "useful_cooling_kwh": float(row.useful_cooling_kwh),
                "outdoor_temperature_c": float(row.outdoor_temperature_c),
                "transmission_excluding_ground_kwh": float(row.transmission_excluding_ground_kwh),
                "ground_transmission_kwh": float(row.ground_transmission_kwh),
                "ventilation_heat_transfer_kwh": float(row.ventilation_heat_transfer_kwh),
            }
            for row in result.monthly
        ],
        "monthly_costs": [
            {
                "month": row["month"],
                "cost_lei": float(row["priced_total_lei"]),
                "final_energy_kwh": max(
                    sum(float(value) for value in row.get("final_kwh_by_service", {}).values())
                    - float(row.get("pv_self_consumed_kwh", 0.0)),
                    0.0,
                ),
                "pv_self_consumed_kwh": float(row.get("pv_self_consumed_kwh", 0.0)),
                "complete": bool(row["complete"]),
            }
            for row in cost.get("monthly_rows", [])
        ],
        "heat_loss_breakdown": loss_rows,
        "reference": (
            {
                "actual_specific_primary_kwh_m2": float(reference.actual_specific_primary_kwh_m2),
                "reference_specific_primary_kwh_m2": float(reference.reference_specific_primary_kwh_m2),
                "difference_percent": float(reference.difference_percent),
            }
            if reference is not None
            else None
        ),
        "reference_parameters": {
            "u_values_w_m2k": {
                key: float(value)
                for key, value in reference_rules["u_values_w_m2k"].items()
            },
            "envelope_source": reference_rules.get("envelope_source"),
            "envelope_source_status": reference_rules.get("envelope_source_status"),
            "reference_context": reference_rules.get("reference_context"),
            "systems_source_status": reference_rules.get("systems_source_status"),
            "physical_mapping": physical_reference,
            "air_changes_per_hour": float(reference_rules["air_changes_per_hour"]),
            "heat_recovery_efficiency": float(reference_rules["heat_recovery_efficiency"]),
            "heating_efficiency": float(reference_rules["heating_efficiency"]),
            "cooling_seer": float(reference_rules["cooling_seer"]),
            "dhw_efficiency": float(reference_rules["dhw_efficiency"]),
        },
        "price_references_current": bool(cost.get("price_references_current")),
        "price_retrieved_on": cost.get("retrieved_on"),
        "methodology_version": str(result.methodology_version),
        "methodology_scope": method.get("scope"),
        "methodology_source": method.get("monthly_method", {}).get("source"),
        "assumptions": list(result.assumptions or method.get("assumptions", [])),
    }


async def render_calculation_from_form(
    request: Request,
    *,
    page_context: dict[str, Any] | None = None,
) -> HTMLResponse:
    form = dict(await request.form())
    values = {**default_form_values(), **form}
    for key in ("cooling_enabled", "dhw_enabled", "apartment_top_exposed", "apartment_bottom_exposed"):
        values[key] = _checked(form, key)
    extra = page_context or {}
    try:
        building = build_input_from_form(form)
        result = calculate(building)
    except Exception as exc:
        return templates.TemplateResponse(
            request,
            "calculator.html",
            {
                "request": request,
                **calculator_context(error=user_error(exc), values=values),
                **extra,
            },
            status_code=422,
        )

    return templates.TemplateResponse(
        request,
        "results.html",
        {"request": request, **result_context(result), **extra},
    )


@app.get("/api/location-data")
async def location_data_api() -> StreamingResponse:
    return StreamingResponse(
        _location_payload_stream(),
        media_type="application/json",
        headers={"Cache-Control": "public, max-age=3600"},
    )


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
    """Coalesce D1 setup/reads and keep the small versioned catalog per isolate."""
    global _roi_cost_basis_cached_payload
    global _roi_cost_basis_cache_expires_at
    global _roi_cost_basis_retry_after

    now = time.monotonic()
    if _roi_cost_basis_cached_payload is not None and now < _roi_cost_basis_cache_expires_at:
        return _roi_cost_basis_cached_payload
    if now < _roi_cost_basis_retry_after:
        return None

    async with _roi_cost_basis_lock:
        now = time.monotonic()
        if _roi_cost_basis_cached_payload is not None and now < _roi_cost_basis_cache_expires_at:
            return _roi_cost_basis_cached_payload
        if now < _roi_cost_basis_retry_after:
            return None

        try:
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
        except Exception:
            # A short negative cache prevents a failing D1 binding from turning
            # concurrent page loads into a serialized retry storm.
            _roi_cost_basis_retry_after = time.monotonic() + ROI_COST_BASIS_RETRY_SECONDS
            return None

        _roi_cost_basis_cached_payload = payload
        _roi_cost_basis_cache_expires_at = time.monotonic() + ROI_COST_BASIS_CACHE_SECONDS
        _roi_cost_basis_retry_after = 0.0
        return payload


@app.get("/api/market-cost-basis")
async def market_cost_basis_api(request: Request) -> JSONResponse:
    """Return commercial CAPEX assumptions without coupling them to physics.

    In the Cloudflare runtime the source of truth is D1. Local/test runtimes and
    a temporarily unavailable D1 table fall back to the versioned seed mirror
    so the scientific calculator remains usable and Best ROI never asks the
    homeowner to supply catalog maintenance data.
    """
    env = request.scope.get("env")
    db = getattr(env, "DB", None) if env is not None else None
    if db is not None:
        payload = await _cached_roi_cost_payload_from_d1(db)
        if payload is not None:
            return JSONResponse(
                payload,
                headers={"Cache-Control": "public, max-age=900"},
            )

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


@app.get("/api/heating-products")
async def heating_products_api(request: Request) -> JSONResponse:
    payload = await _optimizer_heating_catalog(request)
    return JSONResponse(
        payload,
        headers={
            "Cache-Control": (
                "public, max-age=900"
                if payload.get("source") == "d1"
                else "public, max-age=300"
            )
        },
    )


@app.post("/api/optimization/cost-curves/wall")
async def wall_cost_curve_api(
    payload: WallCostCurveRequestV1,
) -> JSONResponse:
    try:
        curve = build_wall_product_cost_curve(
            payload.products,
            nonmaterial_installed_cost_per_m2_lei=(
                payload.nonmaterial_installed_cost_per_m2_lei
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(curve))


@app.post("/api/optimization/discretize/wall")
async def wall_optimizer_discretization_api(
    payload: WallProductDiscretizationRequestV1,
) -> JSONResponse:
    try:
        result = discretize_wall_product(
            target_added_r_m2k_w=payload.target_added_r_m2k_w,
            affected_area_m2=payload.affected_area_m2,
            products=payload.products,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(result))


@app.post("/api/optimization/commercialize/wall")
async def wall_commercialization_api(
    payload: WallCommercializationRequestV1,
    request: Request,
) -> JSONResponse:
    try:
        result = commercialize_wall_candidate(
            payload,
            await _optimizer_cost_catalog(request),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(result))


@app.post("/api/optimization/run/wall-products")
async def wall_product_backed_optimization_api(
    payload: WallProductBackedOptimizationRequestV1,
    request: Request,
) -> JSONResponse:
    try:
        result = run_wall_product_backed_optimization(
            payload,
            await _optimizer_cost_catalog(request),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(result))


@app.post("/api/optimization/run/full-products")
async def full_product_backed_optimization_api(
    payload: FullProductBackedOptimizationRequestV1,
    request: Request,
) -> JSONResponse:
    try:
        result = run_full_product_backed_optimization(
            payload,
            await _optimizer_cost_catalog(request),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(result))


@app.post("/api/optimization/candidate")
async def optimization_candidate_api(
    payload: OptimizationCandidateRequestV1,
    request: Request,
) -> JSONResponse:
    """Evaluate one raw physical candidate before commercial discretization."""
    try:
        result = evaluate_parametric_candidate(
            payload.baseline,
            payload.measures,
            await _optimizer_cost_catalog(request),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(result))


@app.post("/api/optimization/select")
async def optimization_select_api(
    payload: OptimizationSelectionRequestV1,
) -> JSONResponse:
    """Apply one economic policy to an already evaluated candidate set."""
    result = select_optimization_candidate(payload.request, payload.candidates)
    return JSONResponse(model_to_dict(result))


@app.post("/api/optimization/run")
async def optimization_run_api(
    payload: OptimizationSearchRequestV1,
    request: Request,
) -> JSONResponse:
    """Run the bounded raw-parameter search for one economic intent."""
    try:
        result = run_parametric_optimization(
            payload,
            await _optimizer_cost_catalog(request),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(result))


@app.get("/api/energy-prices")
async def energy_prices_api() -> JSONResponse:
    return JSONResponse(energy_prices())


@app.post("/api/scenarios/wall-insulation")
async def wall_insulation_scenario_api(payload: WallInsulationScenarioRequestV1) -> JSONResponse:
    try:
        bundle = build_wall_insulation_scenario(
            payload.baseline,
            added_insulation_thickness_mm=payload.added_insulation_thickness_mm,
            insulation_lambda_w_mk=payload.insulation_lambda_w_mk,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(bundle))


@app.post("/api/products/wall-insulation/match")
async def wall_insulation_product_match_api(
    payload: WallInsulationProductMatchRequestV1,
) -> JSONResponse:
    return JSONResponse(
        model_to_dict(
            match_wall_insulation_products(
                payload.requirement,
                payload.products,
            )
        )
    )


@app.post("/api/scenarios/wall-insulation/product")
async def wall_insulation_product_scenario_api(
    payload: WallInsulationProductScenarioRequestV1,
) -> JSONResponse:
    try:
        response = build_product_wall_insulation_scenario(
            payload.baseline,
            payload.requirement,
            payload.product,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(response))


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/favicon.ico")
async def favicon() -> RedirectResponse:
    return RedirectResponse("/static/favicon.svg", status_code=307)


def _public_catalog_context(payload: dict[str, Any]) -> dict[str, Any]:
    products = list(payload.get("options") or [])
    counts: dict[str, dict[str, Any]] = {}
    for product in products:
        technology_id = str(product.get("technology_id") or "other")
        technology_label = str(product.get("technology_label") or "Alte produse")
        entry = counts.setdefault(
            technology_id,
            {"id": technology_id, "label": technology_label, "count": 0},
        )
        entry["count"] = int(entry["count"]) + 1
    categories = sorted(
        counts.values(),
        key=lambda item: (-int(item["count"]), str(item["label"])),
    )
    stats = dict(payload.get("catalog_stats") or {})
    return {
        "products": products,
        "product_categories": categories,
        "catalog_product_count": int(stats.get("products") or len(products)),
        "catalog_observed_on": payload.get("observed_on"),
        "catalog_source": payload.get("source"),
    }


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    catalog = await _optimizer_heating_catalog(request)
    return templates.TemplateResponse(
        request,
        "landing.html",
        {"request": request, **_public_catalog_context(catalog)},
    )


@app.get("/produse", response_class=HTMLResponse)
async def product_catalog_page(request: Request) -> HTMLResponse:
    catalog = await _optimizer_heating_catalog(request)
    return templates.TemplateResponse(
        request,
        "product_catalog.html",
        {"request": request, **_public_catalog_context(catalog)},
    )


@app.get("/catalog")
async def product_catalog_alias() -> RedirectResponse:
    return RedirectResponse("/produse", status_code=308)


@app.get("/privacy", response_class=HTMLResponse)
async def privacy_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "privacy.html", {"request": request})


@app.get("/terms", response_class=HTMLResponse)
async def terms_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "terms.html", {"request": request})


@app.get("/instalatii")
async def installations() -> RedirectResponse:
    # Retired public energy landing: go straight to the actual Home Lab app.
    return RedirectResponse("/home-lab-next", status_code=308)


@app.get("/instalatii/calculator")
async def energy_calculator() -> RedirectResponse:
    # Keep the old calculator URL as an SEO/backward-compatible alias only.
    return RedirectResponse("/home-lab-next", status_code=308)


@app.get("/instalatii/calculator/legacy", response_class=HTMLResponse)
async def energy_calculator_legacy(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "calculator.html", {"request": request, **calculator_context()})


def _request_db(request: Request) -> Any:
    env = request.scope.get("env")
    return getattr(env, "DB", None) if env is not None else None


@app.get("/facts")
async def facts_shortcut() -> RedirectResponse:
    return RedirectResponse("/home-lab/facts", status_code=308)


@app.get("/home-lab/facts", response_class=HTMLResponse)
async def simulation_facts_index(request: Request) -> HTMLResponse:
    db = _request_db(request)
    try:
        facts = await list_published_simulation_facts(db, limit=60)
    except Exception:
        facts = []
    return templates.TemplateResponse(
        request,
        "simulation_facts.html",
        {
            "request": request,
            "facts": facts,
            "canonical_url": "https://lacurent.com/home-lab/facts",
        },
    )


@app.get("/home-lab/facts/{slug}", response_class=HTMLResponse)
async def simulation_fact_detail(request: Request, slug: str) -> HTMLResponse:
    db = _request_db(request)
    try:
        fact = await get_published_simulation_fact(db, slug)
    except Exception:
        fact = None
    if fact is None:
        raise HTTPException(status_code=404, detail="Simulation fact not found.")
    return templates.TemplateResponse(
        request,
        "simulation_fact_detail.html",
        {
            "request": request,
            "fact": fact,
            "canonical_url": f"https://lacurent.com/home-lab/facts/{fact['slug']}",
        },
    )


@app.get("/robots.txt", response_class=Response)
async def robots_txt() -> Response:
    return Response(
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /api/\n"
        "Disallow: /internal/\n"
        "Sitemap: https://lacurent.com/sitemap.xml\n",
        media_type="text/plain",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.get("/sitemap.xml", response_class=Response)
async def sitemap_xml(request: Request) -> Response:
    urls = [
        "https://lacurent.com/",
        "https://lacurent.com/home-lab-next",
        "https://lacurent.com/produse",
        "https://lacurent.com/home-lab/facts",
        "https://lacurent.com/privacy",
        "https://lacurent.com/terms",
    ]
    db = _request_db(request)
    try:
        facts = await list_published_simulation_facts(db, limit=100)
    except Exception:
        facts = []
    urls.extend(f"https://lacurent.com/home-lab/facts/{item['slug']}" for item in facts)
    body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    body += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for url in urls:
        body += f"  <url><loc>{url}</loc></url>\n"
    body += "</urlset>\n"
    return Response(
        body,
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=900"},
    )


@app.get("/home-lab-next", response_class=HTMLResponse)
@app.get("/home-lab-editorial", response_class=HTMLResponse)
async def home_lab_editorial(request: Request) -> HTMLResponse:
    """Primary Home Lab UI using the Technical Editorial experience."""
    return templates.TemplateResponse(
        request,
        "home_lab_editorial.html",
        {
            "request": request,
            **calculator_context(),
        },
    )


@app.get("/home-lab-classic", response_class=HTMLResponse)
async def home_lab_classic(request: Request) -> HTMLResponse:
    """Previous Home Lab UI retained as a rollback and regression surface."""
    return templates.TemplateResponse(
        request,
        "home_lab_next.html",
        {
            "request": request,
            **calculator_context(),
            "partner": None,
            "embed_mode": False,
            "calculate_url": "/api/home-lab-next/calculate",
            "energy_overview": home_lab_price_overview(),
        },
    )


async def home_lab_next_calculation(request: Request) -> JSONResponse:
    form = dict(await request.form())
    # Scenario and optimizer requests reuse the reference configuration already
    # calculated for the saved baseline. Recomputing it here roughly doubles
    # the CPU work per live request and is unnecessary for those flows.
    skip_reference = str(form.pop("_skip_reference", "")).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    optimizer_candidate = str(form.pop("_optimizer_candidate", "")).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    try:
        building = build_input_from_form(form)
        # Home Lab already exposes the MC001 reference parameters separately
        # through embed_lab_result_payload(). Its interactive UI never consumes
        # result.reference, while computing it recursively runs the full engine
        # a second time. Keep every Home Lab request single-pass.
        result = calculate(building, include_reference=False)
    except Exception as exc:
        return JSONResponse({"error": user_error(exc)}, status_code=422)
    if optimizer_candidate:
        return JSONResponse(optimizer_candidate_payload(result))
    return JSONResponse(embed_lab_result_payload(result))


@app.post("/api/home-lab-next/calculate")
async def home_lab_next_calculate_api(request: Request) -> JSONResponse:
    return await home_lab_next_calculation(request)


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
) -> dict[str, Any]:
    selected = selection.selected
    if selected is None or selected.resulting_configuration is None:
        raise ValueError("Nu există nicio soluție fezabilă pentru regula economică aleasă.")

    raw_selected = raw_selected or selected
    _assert_optimizer_economics_complete(selected)
    final_result = calculate(selected.resulting_configuration, include_reference=False)
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
                "technologyId": next(
                    (
                        product.technology_id
                        for product in heating_planning_options()
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
    heat_pump_profile: dict[str, Any] | None = None
    if selected_heating is not None and selected_heating.get("optionId"):
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
        "scenario": embed_lab_result_payload(final_result),
        "optimization": optimization_payload,
    }



@app.post("/api/optimization/home-lab/v2/plan")
async def home_lab_optimization_v2_plan_api(request: Request) -> JSONResponse:
    """Build the physical shortlist in one CPU-bounded Worker request."""

    form = dict(await request.form())
    try:
        mode, _, optimization_request = _home_lab_optimization_request_from_form(form)
        cost_catalog = await _optimizer_cost_catalog(request)
        heating_catalog = await _optimizer_heating_catalog(request)
        run_id = str(form.get("_optimizer_run_id") or "").strip()
        started = time.perf_counter()
        plan = build_worker_safe_plan_v2(
            optimization_request,
            bounds=OptimizationSearchBoundsV1(),
            catalog=cost_catalog,
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
                "optimizerVersion": "v2-worker-safe",
                "runId": run_id,
                "economicMode": mode.value,
                "label": _home_lab_optimizer_label(mode, form),
                "searchMethod": plan.search_method,
                "shortlist": [
                    model_to_dict(item)
                    for item in plan.shortlist
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
                "shortlistSize": len(plan.shortlist),
                "calculationTimeMs": elapsed_ms,
                "executionMode": "worker_safe_staged_v2",
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
                "optimizerVersion": "v2-worker-safe",
                "stage": "plan",
            },
            status_code=422,
        )


@app.post("/api/optimization/home-lab/v2/branch")
async def home_lab_optimization_v2_branch_api(request: Request) -> JSONResponse:
    """Evaluate one heating technology over the shared V2 shortlist."""

    try:
        raw = await request.json()
        form = dict(raw.get("form") or {})
        branch_id = str(raw.get("branchId", "") or "").strip()
        run_id = str(raw.get("runId") or "").strip()
        shortlist_raw = raw.get("shortlist") or []
        if not branch_id:
            raise ValueError("Lipsește ramura de încălzire V2.")
        if not isinstance(shortlist_raw, list) or not shortlist_raw:
            raise ValueError("Lipsește shortlist-ul fizic V2.")

        _, _, optimization_request = _home_lab_optimization_request_from_form(form)
        shortlist = [
            ParametricMeasuresV1(**item)
            for item in shortlist_raw
            if isinstance(item, dict)
        ]
        cost_catalog = await _optimizer_cost_catalog(request)
        heating_catalog = await _optimizer_heating_catalog(request)
        started = time.perf_counter()
        result = evaluate_worker_safe_branch_v2(
            optimization_request,
            branch_id=branch_id,
            shortlist=shortlist,
            bounds=OptimizationSearchBoundsV1(),
            catalog=cost_catalog,
            heating_catalog=heating_catalog,
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000.0, 1)
        return JSONResponse(
            {
                "optimizerVersion": "v2-worker-safe",
                "runId": run_id,
                "branch": model_to_dict(result.branch),
                "candidates": [
                    model_to_dict(item)
                    for item in result.candidates
                ],
                "candidateCount": len(result.candidates),
                "fastEvaluations": int(result.fast_evaluations),
                "calculationTimeMs": elapsed_ms,
                "searchMethod": result.search_method,
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
                "optimizerVersion": "v2-worker-safe",
                "stage": "branch",
            },
            status_code=422,
        )


@app.post("/api/optimization/home-lab/v2/finalize")
async def home_lab_optimization_v2_finalize_api(request: Request) -> JSONResponse:
    """Rank branch candidates, canonically verify a few, then commercialize."""

    try:
        raw = await request.json()
        form = dict(raw.get("form") or {})
        run_id = str(raw.get("runId") or "").strip()
        branch_results = raw.get("branchResults") or []
        representative_evaluations = int(
            raw.get("representativeEvaluations") or 0
        )
        representative_pool_size = int(
            raw.get("representativePoolSize") or 0
        )
        shortlist_size = int(raw.get("shortlistSize") or 0)
        if not isinstance(branch_results, list) or not branch_results:
            raise ValueError("Lipsesc rezultatele ramurilor V2.")

        mode, _, optimization_request = _home_lab_optimization_request_from_form(form)
        cost_catalog = await _optimizer_cost_catalog(request)
        heating_catalog = await _optimizer_heating_catalog(request)
        started = time.perf_counter()

        fast_candidates: list[CandidateEvaluationV1] = []
        candidate_branch_ids: dict[str, str] = {}
        branch_summaries_by_id: dict[str, HeatingBranchSummaryV1] = {}
        branch_fast_evaluations = 0
        heating_branch_evaluations = 0
        prior_elapsed_ms = float(raw.get("priorCalculationTimeMs") or 0.0)

        for item in branch_results:
            if not isinstance(item, dict):
                continue
            branch = HeatingBranchSummaryV1(**(item.get("branch") or {}))
            branch_summaries_by_id[branch.branch_id] = branch
            branch_evals = int(item.get("fastEvaluations") or 0)
            branch_fast_evaluations += branch_evals
            if branch.branch_id != "keep-current-heating":
                heating_branch_evaluations += branch_evals
            prior_elapsed_ms += float(item.get("calculationTimeMs") or 0.0)
            for candidate_raw in item.get("candidates") or []:
                if not isinstance(candidate_raw, dict):
                    continue
                candidate = CandidateEvaluationV1(**candidate_raw)
                fast_candidates.append(candidate)
                candidate_branch_ids[candidate.candidate_id] = branch.branch_id

        if not fast_candidates:
            raise ValueError("V2 nu a produs candidați economici între ramuri.")

        verification = verify_worker_safe_finalists_v2(
            optimization_request,
            candidates=fast_candidates,
            candidate_branch_ids=candidate_branch_ids,
            catalog=cost_catalog,
            heating_catalog=heating_catalog,
            verification_limit=V2_WORKER_VERIFICATION_LIMIT,
        )
        verified = verification.candidates or fast_candidates
        verified_branch_ids = (
            verification.candidate_branch_ids
            if verification.candidates
            else candidate_branch_ids
        )
        raw_selection = select_optimization_candidate_v2(
            optimization_request,
            verified,
        )
        if raw_selection.selected is None:
            raise ValueError(
                "Nicio soluție V2 verificată nu satisface condiția economică."
            )

        raw_selected = raw_selection.selected
        ordered_rechecks: list[CandidateEvaluationV1] = [raw_selected]
        for item in pareto_frontier(verified):
            if item.candidate_id == raw_selected.candidate_id:
                continue
            ordered_rechecks.append(item)
            if len(ordered_rechecks) >= V2_WORKER_VERIFICATION_LIMIT:
                break

        commercial_rows: list[CandidateEvaluationV1] = []
        commercial_warnings: list[str] = []
        commercial_recheck_count = 0
        for raw_candidate in ordered_rechecks:
            commercial_candidate, matched_product, product_warnings = (
                commercialize_heating_finalist(
                    raw_candidate,
                    original_building=optimization_request.baseline,
                    heating_catalog=heating_catalog,
                    branch_id=verified_branch_ids.get(
                        raw_candidate.candidate_id
                    ),
                )
            )
            commercial_rows.append(commercial_candidate)
            commercial_warnings.extend(product_warnings)
            if matched_product is not None:
                commercial_recheck_count += 1

        selection = select_optimization_candidate_v2(
            optimization_request,
            commercial_rows,
        )
        if selection.selected is None:
            selection = raw_selection

        # Rebuild complete branch metadata cheaply for the report. Technical
        # branches are listed explicitly but are not simulated in this final
        # request; doing so would recreate the Worker CPU spike that caused
        # production 503s. They remain visible as technical-only alternatives.
        all_branches = heating_branch_plan(
            optimization_request,
            heating_catalog,
        )
        branch_summaries: list[HeatingBranchSummaryV1] = []
        for branch in all_branches:
            existing = branch_summaries_by_id.get(branch.branch_id)
            branch_summaries.append(existing or branch)

        elapsed_ms = round(
            prior_elapsed_ms
            + (time.perf_counter() - started) * 1000.0,
            1,
        )
        total_fast = representative_evaluations + branch_fast_evaluations
        payload = _home_lab_optimizer_success_payload(
            mode=mode,
            form=form,
            selection=selection,
            branches=branch_summaries,
            evaluated_candidates=len(fast_candidates),
            parametric_evaluations=total_fast,
            heating_branch_evaluations=heating_branch_evaluations,
            warnings=[
                (
                    "Optimizer V2 Worker-safe: plan fizic, ramuri de încălzire și "
                    "verificare finală executate în requesturi CPU-bounded."
                ),
                (
                    f"Shortlist comun: {shortlist_size} configurații; "
                    f"{representative_evaluations} evaluări reprezentative + "
                    f"{branch_fast_evaluations} evaluări de ramură."
                ),
                (
                    f"Motorul canonic complet a verificat "
                    f"{verification.full_engine_evaluations} finaliști."
                ),
                (
                    "Ramurile tehnice fără curbă CAPEX source-backed rămân vizibile "
                    "în raport, dar nu sunt simulate în requestul final pentru a nu "
                    "reintroduce faultul CPU 503."
                ),
                *verification.warnings,
                *commercial_warnings,
            ],
            calculation_time_ms=elapsed_ms,
            pareto_scope="worker_safe_v2_verified_finalists",
            raw_selected=raw_selected,
            technical_heating_alternatives=[],
            heating_catalog=heating_catalog,
        )
        payload["optimization"].update(
            {
                "optimizerVersion": "v2-worker-safe",
                "searchMethod": "physics_informed_marginal_pairwise_worker_safe_v2",
                "executionMode": "worker_safe_staged_v2",
                "fastEvaluations": int(total_fast),
                "representativeEvaluations": int(
                    representative_evaluations
                ),
                "branchFastEvaluations": int(
                    branch_fast_evaluations
                ),
                "fullEngineVerifications": int(
                    verification.full_engine_evaluations
                ),
                "representativePoolSize": int(
                    representative_pool_size
                ),
                "shortlistSize": int(shortlist_size),
                "commercialRechecks": len(ordered_rechecks),
                "commercialMatches": int(commercial_recheck_count),
                "runId": run_id,
                "heatingCatalogSource": heating_catalog.get("source"),
                "heatingCatalogStats": heating_catalog.get("catalog_stats") or {
                    "products": len(heating_catalog.get("options") or []),
                    "performance_points": len(heating_catalog.get("heat_pump_performance_points") or []),
                    "seasonal_points": len(heating_catalog.get("heat_pump_seasonal_performance") or []),
                },
            }
        )
        return JSONResponse(payload)
    except Exception as exc:
        return JSONResponse(
            {
                "error": user_error(exc),
                "optimizerVersion": "v2-worker-safe",
                "stage": "finalize",
            },
            status_code=422,
        )


@app.post("/api/optimization/home-lab/v2")
async def home_lab_optimization_v2_api(request: Request) -> JSONResponse:
    """Physics-informed optimizer: one bounded request, finalist-only full verification."""

    form = dict(await request.form())
    try:
        mode, _, optimization_request = _home_lab_optimization_request_from_form(form)
        cost_catalog = await _optimizer_cost_catalog(request)
        heating_catalog = await _optimizer_heating_catalog(request)
        started = time.perf_counter()

        result = run_physics_informed_optimization(
            optimization_request,
            bounds=OptimizationSearchBoundsV1(),
            catalog=cost_catalog,
            heating_catalog=heating_catalog,
        )
        if result.selection.selected is None:
            return JSONResponse(
                {
                    "error": "Optimizer V2 nu a găsit nicio soluție eligibilă.",
                    "selection": model_to_dict(result.selection),
                    "optimizerVersion": "v2",
                    "fastEvaluations": int(result.fast_evaluations),
                    "fullEngineVerifications": int(result.full_engine_evaluations),
                    "warnings": result.warnings,
                },
                status_code=422,
            )

        raw_selected = result.selection.selected
        ordered_rechecks: list[CandidateEvaluationV1] = [raw_selected]
        for item in pareto_frontier(result.candidates):
            if item.candidate_id == raw_selected.candidate_id:
                continue
            ordered_rechecks.append(item)
            if len(ordered_rechecks) >= 6:
                break

        technical_heating_alternatives: list[dict[str, Any]] = []
        raw_config = raw_selected.resulting_configuration
        if raw_config is not None:
            for branch in result.branches:
                if not branch.eligible or branch.economic_eligible:
                    continue
                try:
                    preview_building = apply_supplemental_heating_technology(
                        raw_config,
                        branch.branch_id,
                    )
                    preview_result = calculate(
                        preview_building,
                        include_reference=False,
                    )
                    preview_cost = estimate_energy_cost(preview_result)
                    if not preview_cost.get("complete"):
                        raise ValueError("cost anual incomplet")
                    technical_heating_alternatives.append(
                        {
                            "branchId": branch.branch_id,
                            "label": branch.label,
                            "annualBillLei": round(
                                float(preview_cost["priced_total_lei"]),
                                2,
                            ),
                            "finalEnergyKwh": round(
                                float(preview_result.total_final_energy_kwh),
                                3,
                            ),
                            "primarySpecificKwhM2": round(
                                float(preview_result.primary_energy.specific_kwh_m2),
                                3,
                            ),
                            "co2SpecificKgM2": round(
                                float(preview_result.co2.specific_kg_m2),
                                3,
                            ),
                            "energyClass": preview_result.energy_class,
                            "designHeatLoadKw": raw_selected.design_heat_load_kw,
                            "costKnown": False,
                            "economicEligible": False,
                            "basis": (
                                "aceeași casă finalistă V2; se schimbă numai "
                                "tehnologia de încălzire"
                            ),
                        }
                    )
                except Exception as preview_exc:
                    result.warnings.append(
                        f"{branch.label}: preview tehnic V2 indisponibil "
                        f"({user_error(preview_exc)})."
                    )

        commercial_rechecks: list[CandidateEvaluationV1] = []
        commercial_recheck_count = 0
        commercial_warnings: list[str] = []
        for raw_candidate in ordered_rechecks:
            commercial_candidate, matched_product, product_warnings = (
                commercialize_heating_finalist(
                    raw_candidate,
                    original_building=optimization_request.baseline,
                    heating_catalog=heating_catalog,
                    branch_id=result.candidate_branch_ids.get(
                        raw_candidate.candidate_id
                    ),
                )
            )
            commercial_warnings.extend(product_warnings)
            commercial_rechecks.append(commercial_candidate)
            if matched_product is not None:
                commercial_recheck_count += 1

        commercial_selection = select_optimization_candidate_v2(
            optimization_request,
            commercial_rechecks,
        )
        selection = (
            commercial_selection
            if commercial_selection.selected is not None
            else result.selection
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000.0, 1)

        payload = _home_lab_optimizer_success_payload(
            mode=mode,
            form=form,
            selection=selection,
            branches=result.branches,
            evaluated_candidates=len(result.candidates),
            parametric_evaluations=result.fast_evaluations,
            heating_branch_evaluations=result.heating_branch_evaluations,
            warnings=[
                (
                    "Optimizer V2: căutare physics-informed într-un singur request; "
                    "motorul complet este rezervat finaliștilor."
                ),
                *result.warnings,
                *commercial_warnings,
                (
                    f"V2 a comercializat {len(ordered_rechecks)} finaliști Pareto; "
                    f"{commercial_recheck_count} au primit un generator real."
                ),
            ],
            calculation_time_ms=elapsed_ms,
            pareto_scope="v2_verified_finalists_then_commercial",
            raw_selected=raw_selected,
            technical_heating_alternatives=technical_heating_alternatives,
            heating_catalog=heating_catalog,
        )
        payload["optimization"].update(
            {
                "optimizerVersion": "v2",
                "searchMethod": result.search_method,
                "fastEvaluations": int(result.fast_evaluations),
                "fullEngineVerifications": int(result.full_engine_evaluations),
                "representativePoolSize": int(result.representative_pool_size),
                "shortlistSize": int(result.shortlist_size),
                "commercialRechecks": len(ordered_rechecks),
            }
        )
        return JSONResponse(payload)
    except Exception as exc:
        return JSONResponse(
            {
                "error": user_error(exc),
                "optimizerVersion": "v2",
            },
            status_code=422,
        )


@app.post("/api/optimization/home-lab/plan")
async def home_lab_optimization_plan_api(request: Request) -> JSONResponse:
    form = dict(await request.form())
    try:
        mode, _, optimization_request = _home_lab_optimization_request_from_form(form)
        heating_catalog = await _optimizer_heating_catalog(request)
        branches = heating_branch_plan(optimization_request, heating_catalog)
        runnable = [
            item
            for item in branches
            if item.eligible and item.economic_eligible
        ]
        technical_previews = [
            item
            for item in branches
            if item.eligible and not item.economic_eligible
        ]
        return JSONResponse(
            {
                "economicMode": mode.value,
                "label": _home_lab_optimizer_label(mode, form),
                "branches": [model_to_dict(item) for item in branches],
                "runBranchIds": [item.branch_id for item in runnable],
                "technicalPreviewBranchIds": [
                    item.branch_id for item in technical_previews
                ],
                "searchPhases": ["axis", "halton", "refine"],
                "evaluationsPerPhase": 12,
                "microBatchSize": 1,
                "phaseOffsets": list(range(12)),
                "evaluationsPerBranch": 36,
                "requestGapMs": 250,
                "restartCooldownMs": 3000,
                "initialConcurrentBranchRequests": 1,
                "maxConcurrentBranchRequests": 2,
                "cleanWavesBeforeRampUp": 2,
                "branchMaxAttempts": 3,
                "branchStartStaggerMs": 140,
            }
        )
    except Exception as exc:
        return JSONResponse({"error": user_error(exc)}, status_code=422)


@app.post("/api/optimization/home-lab/phase-candidates")
async def home_lab_optimization_phase_candidates_api(request: Request) -> JSONResponse:
    raw = await request.json()
    form = dict(raw.get("form") or {})
    branch_id = str(raw.get("branchId", "") or "").strip()
    search_phase = str(raw.get("searchPhase", "") or "").strip()
    raw_offsets = raw.get("phaseOffsets")
    offsets = (
        [int(value) for value in raw_offsets]
        if isinstance(raw_offsets, list)
        else list(range(12))
    )
    prior_payload = raw.get("priorCandidates")

    if not branch_id:
        return JSONResponse({"error": "Lipsește ramura de încălzire."}, status_code=422)
    if search_phase not in {"axis", "halton", "refine"}:
        return JSONResponse({"error": "Faza optimizerului nu este validă."}, status_code=422)

    try:
        _, _, optimization_request = _home_lab_optimization_request_from_form(form)
        refinement_seed = None
        if search_phase == "refine":
            if prior_payload in (None, "", []):
                raise ValueError("Faza de refinement necesită candidații fazelor anterioare.")
            decoded_prior = (
                prior_payload
                if isinstance(prior_payload, list)
                else json.loads(str(prior_payload))
            )
            if not isinstance(decoded_prior, list):
                raise ValueError("Candidații anteriori trebuie să fie o listă.")
            refinement_seed = refinement_seed_from_compact(
                optimization_request,
                [item for item in decoded_prior if isinstance(item, dict)],
            )
            if refinement_seed is None:
                raise ValueError(
                    "Nu există un candidat anterior disponibil pentru refinement."
                )

        descriptors = parametric_phase_candidate_descriptors(
            OptimizationSearchBoundsV1(),
            search_phase=search_phase,
            phase_offsets=offsets,
            refinement_seed=refinement_seed,
        )
        return JSONResponse(
            {
                "branchId": branch_id,
                "searchPhase": search_phase,
                "candidates": descriptors,
                "refinementSeed": (
                    model_to_dict(refinement_seed)
                    if refinement_seed is not None
                    else None
                ),
            }
        )
    except Exception as exc:
        return JSONResponse({"error": user_error(exc)}, status_code=422)


def _optimizer_candidate_stage_trace(
    candidate: CandidateEvaluationV1 | None,
) -> list[dict[str, str]]:
    if candidate is None or candidate.resulting_configuration is None:
        return []

    measures = candidate.parameters
    building = candidate.resulting_configuration
    ventilation = building.ventilation
    heating = building.heating
    details = heating.details
    pv = building.renewables.pv
    solar = building.renewables.solar_thermal

    envelope_detail = (
        f"pereți ΔR={measures.wall_added_r_m2k_w:.3f} m²K/W · "
        f"pod ΔR={measures.roof_added_r_m2k_w:.3f} · "
        f"pardoseală ΔR={measures.floor_added_r_m2k_w:.3f} · "
        f"ferestre={100.0 * measures.window_replacement_fraction:.1f}% "
        f"la Uw={measures.window_target_u_w_m2k:.2f} W/m²K"
    )
    ventilation_detail = (
        f"n={ventilation.air_changes_per_hour:.3f} 1/h · "
        f"recuperare={100.0 * ventilation.heat_recovery_efficiency:.1f}% · "
        "pierderile de ventilație sunt incluse în recalcularea completă"
    )
    generator = (
        details.generator_type.value
        if details is not None and details.generator_type is not None
        else heating.system_type.value
    )
    emitter = (
        details.emitter_type.value
        if details is not None
        else "implicit"
    )
    heating_detail = (
        f"generator={generator} · emitere={emitter} · "
        f"necesar design="
        f"{candidate.design_heat_load_kw:.3f} kW"
        if candidate.design_heat_load_kw is not None
        else f"generator={generator} · emitere={emitter} · necesar design=n/a"
    )
    renewable_detail = (
        f"PV={float(pv.installed_power_kwp if pv.enabled else 0.0):.3f} kWp · "
        f"solar termic={float(solar.collector_area_m2 if solar.enabled else 0.0):.3f} m²"
    )
    balance_detail = (
        f"energie finală={candidate.final_energy_kwh:.1f} kWh/an · "
        f"energie primară={candidate.primary_specific_kwh_m2:.1f} kWh/m²·an · "
        f"CO₂={candidate.co2_specific_kg_m2:.1f} kg/m²·an · "
        f"clasa={candidate.energy_class}"
    )
    economic_detail = (
        f"CAPEX={candidate.capex_lei:.2f} lei · "
        f"factură={candidate.annual_bill_lei:.2f} lei/an · "
        f"economie={candidate.annual_saving_lei:.2f} lei/an"
    )
    return [
        {"stage": "ANVELOPĂ", "detail": envelope_detail},
        {"stage": "VENTILAȚIE", "detail": ventilation_detail},
        {"stage": "ÎNCĂLZIRE", "detail": heating_detail},
        {"stage": "REGENERABILE", "detail": renewable_detail},
        {"stage": "BILANȚ", "detail": balance_detail},
        {"stage": "ECONOMIC", "detail": economic_detail},
    ]


@app.post("/api/optimization/home-lab/branch")
async def home_lab_optimization_branch_api(request: Request) -> JSONResponse:
    content_type = str(request.headers.get("content-type", "") or "").lower()
    prior_payload: Any = None
    if "application/json" in content_type:
        raw = await request.json()
        form = dict(raw.get("form") or {})
        branch_id = str(raw.get("branchId", "") or "").strip()
        search_phase = str(raw.get("searchPhase", "") or "").strip()
        phase_offset = int(raw.get("phaseOffset", 0) or 0)
        prior_payload = raw.get("priorCandidates")
    else:
        form = dict(await request.form())
        branch_id = str(form.pop("_heating_branch_id", "") or "").strip()
        search_phase = str(form.pop("_search_phase", "") or "").strip()
        phase_offset = int(form.pop("_phase_offset", "0") or 0)
        prior_payload = str(form.pop("_prior_candidates_json", "") or "").strip()

    if not branch_id:
        return JSONResponse({"error": "Lipsește ramura de încălzire."}, status_code=422)
    if search_phase not in {"axis", "halton", "refine"}:
        return JSONResponse(
            {
                "error": (
                    "Interfața optimizerului a fost actualizată. Reîncarcă pagina "
                    "pentru execuția pe faze CPU-safe."
                ),
                "requiresPhasedExecution": True,
            },
            status_code=409,
        )

    try:
        _, _, optimization_request = _home_lab_optimization_request_from_form(form)
        refinement_seed = None
        if search_phase == "refine":
            if prior_payload in (None, "", []):
                raise ValueError("Faza de refinement necesită candidații fazelor anterioare.")
            decoded_prior = (
                prior_payload
                if isinstance(prior_payload, list)
                else json.loads(str(prior_payload))
            )
            if not isinstance(decoded_prior, list):
                raise ValueError("Candidații anteriori trebuie să fie o listă.")
            refinement_seed = refinement_seed_from_compact(
                optimization_request,
                [item for item in decoded_prior if isinstance(item, dict)],
            )
            if refinement_seed is None:
                raise ValueError(
                    "Nu există un candidat anterior disponibil pentru refinement."
                )

        cost_catalog = await _optimizer_cost_catalog(request)
        heating_catalog = await _optimizer_heating_catalog(request)
        started = time.perf_counter()
        result = run_heating_branch_optimization(
            optimization_request,
            branch_id=branch_id,
            bounds=OptimizationSearchBoundsV1(),
            catalog=cost_catalog,
            max_evaluations=1,
            search_phase=search_phase,
            refinement_seed=refinement_seed,
            phase_candidate_offset=phase_offset,
            heating_catalog=heating_catalog,
        )
        elapsed_ms = round((time.perf_counter() - started) * 1000.0, 1)
        return JSONResponse(
            {
                "branch": model_to_dict(result.branch),
                "selection": model_to_dict(result.selection),
                "candidates": [
                    model_to_dict(item) for item in result.candidates
                ],
                "candidateSummaries": [
                    compact_refinement_candidate(item) for item in result.candidates
                ],
                "calculationStages": _optimizer_candidate_stage_trace(
                    result.candidates[0] if result.candidates else None
                ),
                "candidateCount": int(result.candidate_count),
                "parametricEvaluations": int(result.parametric_evaluations),
                "searchPhase": result.search_phase,
                "phaseOffset": phase_offset,
                "calculationTimeMs": elapsed_ms,
                "warnings": result.warnings,
            }
        )
    except Exception as exc:
        return JSONResponse({"error": user_error(exc)}, status_code=422)


@app.post("/api/optimization/home-lab/finalize")
async def home_lab_optimization_finalize_api(request: Request) -> JSONResponse:
    content_type = str(request.headers.get("content-type", "") or "").lower()
    if "application/json" in content_type:
        raw = await request.json()
        form = dict(raw.get("form") or {})
        decoded = raw.get("branchResults")
    else:
        form = dict(await request.form())
        raw_results = str(form.pop("_branch_results_json", "") or "").strip()
        decoded = json.loads(raw_results) if raw_results else None

    if not decoded:
        return JSONResponse({"error": "Lipsesc rezultatele ramurilor de încălzire."}, status_code=422)
    try:
        mode, _, optimization_request = _home_lab_optimization_request_from_form(form)
        if not isinstance(decoded, list):
            raise ValueError("Rezultatele ramurilor trebuie să fie o listă.")

        branch_summaries_by_id: dict[str, HeatingBranchSummaryV1] = {}
        finalists: list[CandidateEvaluationV1] = []
        finalist_branch_by_candidate_id: dict[str, str] = {}
        evaluated_candidates = 0
        parametric_evaluations = 0
        heating_branch_evaluations = 0
        warnings: list[str] = []
        total_elapsed_ms = 0.0

        for item in decoded:
            if not isinstance(item, dict):
                continue
            branch = HeatingBranchSummaryV1(**(item.get("branch") or {}))
            existing = branch_summaries_by_id.get(branch.branch_id)
            if existing is None:
                branch_summaries_by_id[branch.branch_id] = branch
            else:
                merged = model_to_dict(existing)
                merged["evaluated_candidates"] = int(existing.evaluated_candidates) + int(branch.evaluated_candidates)
                merged["accepted_candidates"] = int(existing.accepted_candidates) + int(branch.accepted_candidates)
                merged["rejected_for_capacity"] = int(existing.rejected_for_capacity) + int(branch.rejected_for_capacity)
                merged["feasible_candidates"] = int(existing.feasible_candidates) + int(branch.feasible_candidates)
                branch_summaries_by_id[branch.branch_id] = HeatingBranchSummaryV1(**merged)

            evaluated_candidates += int(item.get("candidateCount") or branch.accepted_candidates)
            branch_evals = int(item.get("parametricEvaluations") or branch.evaluated_candidates)
            parametric_evaluations += branch_evals
            if branch.branch_id != "keep-current-heating":
                heating_branch_evaluations += branch_evals
            total_elapsed_ms += float(item.get("calculationTimeMs") or 0.0)
            warnings.extend(str(value) for value in (item.get("warnings") or []))

            candidate_rows = item.get("candidates") or []
            if branch.economic_eligible:
                for candidate_raw in candidate_rows:
                    if isinstance(candidate_raw, dict):
                        parsed_candidate = CandidateEvaluationV1(**candidate_raw)
                        finalists.append(parsed_candidate)
                        finalist_branch_by_candidate_id[parsed_candidate.candidate_id] = branch.branch_id
                if not candidate_rows:
                    selection_raw = item.get("selection") or {}
                    selected_raw = selection_raw.get("selected")
                    if selected_raw:
                        parsed_candidate = CandidateEvaluationV1(**selected_raw)
                        finalists.append(parsed_candidate)
                        finalist_branch_by_candidate_id[parsed_candidate.candidate_id] = branch.branch_id
            elif candidate_rows:
                warnings.append(
                    f"{branch.label}: ramura a fost calculată tehnic, dar nu a intrat "
                    "în selecția economică deoarece nu are încă un cost instalat "
                    "source-backed."
                )

        branch_summaries = list(branch_summaries_by_id.values())

        if not finalists:
            selection = select_optimization_candidate(optimization_request, [])
            return JSONResponse(
                {
                    "error": "Nu există nicio soluție care satisface condiția economică aleasă în ramurile analizate.",
                    "selection": model_to_dict(selection),
                    "evaluated_candidates": evaluated_candidates,
                    "parametric_evaluations": parametric_evaluations,
                    "heating_branch_evaluations": heating_branch_evaluations,
                    "heating_branches": [model_to_dict(item) for item in branch_summaries],
                },
                status_code=422,
            )

        selection = select_optimization_candidate(optimization_request, finalists)
        if selection.selected is None:
            return JSONResponse(
                {
                    "error": "Nicio ramură finalistă nu satisface regula economică aleasă.",
                    "selection": model_to_dict(selection),
                    "evaluated_candidates": evaluated_candidates,
                    "parametric_evaluations": parametric_evaluations,
                    "heating_branch_evaluations": heating_branch_evaluations,
                    "heating_branches": [model_to_dict(item) for item in branch_summaries],
                },
                status_code=422,
            )

        # Raw physics/economics decide the finalist set first. Only then do we
        # touch real generator SKUs. Recheck a small Pareto-bounded set so that
        # commercial capacity/price rounding can change the winner without
        # dragging product-level recalculation through every Halton point.
        raw_selection = selection
        raw_selected = selection.selected
        ordered_rechecks: list[CandidateEvaluationV1] = [raw_selected]
        for item in pareto_frontier(finalists):
            if item.candidate_id == raw_selected.candidate_id:
                continue
            ordered_rechecks.append(item)
            if len(ordered_rechecks) >= 6:
                break

        technical_heating_alternatives: list[dict[str, Any]] = []
        raw_config = raw_selected.resulting_configuration
        if raw_config is not None:
            for branch in branch_summaries:
                if not branch.eligible or branch.economic_eligible:
                    continue
                try:
                    preview_building = apply_supplemental_heating_technology(
                        raw_config,
                        branch.branch_id,
                    )
                    preview_result = calculate(
                        preview_building,
                        include_reference=False,
                    )
                    preview_cost = estimate_energy_cost(preview_result)
                    if not preview_cost.get("complete"):
                        raise ValueError("cost anual incomplet")
                    technical_heating_alternatives.append(
                        {
                            "branchId": branch.branch_id,
                            "label": branch.label,
                            "annualBillLei": round(
                                float(preview_cost["priced_total_lei"]),
                                2,
                            ),
                            "finalEnergyKwh": round(
                                float(preview_result.total_final_energy_kwh),
                                3,
                            ),
                            "primarySpecificKwhM2": round(
                                float(
                                    preview_result.primary_energy.specific_kwh_m2
                                ),
                                3,
                            ),
                            "co2SpecificKgM2": round(
                                float(preview_result.co2.specific_kg_m2),
                                3,
                            ),
                            "energyClass": preview_result.energy_class,
                            "designHeatLoadKw": raw_selected.design_heat_load_kw,
                            "costKnown": False,
                            "economicEligible": False,
                            "basis": (
                                "aceeași casă raw finalistă; se schimbă numai "
                                "tehnologia de încălzire"
                            ),
                        }
                    )
                    existing_summary = branch_summaries_by_id.get(
                        branch.branch_id
                    )
                    if existing_summary is not None:
                        updated = model_to_dict(existing_summary)
                        updated["evaluated_candidates"] = max(
                            int(existing_summary.evaluated_candidates),
                            1,
                        )
                        updated["accepted_candidates"] = max(
                            int(existing_summary.accepted_candidates),
                            1,
                        )
                        branch_summaries_by_id[branch.branch_id] = (
                            HeatingBranchSummaryV1(**updated)
                        )
                except Exception as preview_exc:
                    warnings.append(
                        f"{branch.label}: preview-ul tehnic pe finalistul raw "
                        f"nu a putut fi calculat ({user_error(preview_exc)})."
                    )
            branch_summaries = list(branch_summaries_by_id.values())

        heating_catalog = await _optimizer_heating_catalog(request)
        commercial_rechecks: list[CandidateEvaluationV1] = []
        commercial_recheck_count = 0
        for raw_candidate in ordered_rechecks:
            commercial_candidate, matched_product, product_warnings = (
                commercialize_heating_finalist(
                    raw_candidate,
                    original_building=optimization_request.baseline,
                    heating_catalog=heating_catalog,
                    branch_id=finalist_branch_by_candidate_id.get(
                        raw_candidate.candidate_id
                    ),
                )
            )
            warnings.extend(product_warnings)
            commercial_rechecks.append(commercial_candidate)
            if matched_product is not None:
                commercial_recheck_count += 1

        commercial_selection = select_optimization_candidate(
            optimization_request,
            commercial_rechecks,
        )
        if commercial_selection.selected is not None:
            selection = commercial_selection
        warnings.append(
            (
                f"Raw-first pipeline: {len(finalists)} candidați economici au fost "
                f"selectați în spațiul parametric; {len(ordered_rechecks)} finaliști "
                f"Pareto au intrat în etapa comercială, iar "
                f"{commercial_recheck_count} au primit o treaptă reală de generator "
                "și recalculare completă."
            )
        )

        payload = _home_lab_optimizer_success_payload(
            mode=mode,
            form=form,
            selection=selection,
            branches=branch_summaries,
            evaluated_candidates=evaluated_candidates,
            parametric_evaluations=parametric_evaluations,
            heating_branch_evaluations=heating_branch_evaluations,
            warnings=[
                "Optimizerul a rulat ramurile de încălzire în requesturi separate pentru a păstra profunzimea căutării fără a depăși limita CPU a Worker-ului.",
                *warnings,
            ],
            calculation_time_ms=round(total_elapsed_ms, 1),
            pareto_scope="raw_all_then_bounded_commercial_recheck",
            raw_selected=raw_selected,
            technical_heating_alternatives=technical_heating_alternatives,
            heating_catalog=heating_catalog,
        )
        return JSONResponse(payload)
    except Exception as exc:
        return JSONResponse({"error": user_error(exc)}, status_code=422)


@app.post("/api/optimization/home-lab")
async def home_lab_parametric_optimization_api(request: Request) -> JSONResponse:
    form = dict(await request.form())
    raw_mode = str(form.pop("_optimization_mode", "") or "").strip()
    try:
        mode = OptimizationMode(raw_mode)
    except ValueError:
        return JSONResponse(
            {"error": "Modul de optimizare economică nu este valid."},
            status_code=422,
        )

    try:
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

        optimization_request = OptimizationRequestV1(**request_kwargs)
        heating_catalog = await _optimizer_heating_catalog(request)
        legacy_plan = heating_branch_plan(optimization_request, heating_catalog)
        legacy_runnable = [item for item in legacy_plan if item.eligible]
        if len(legacy_runnable) > 1:
            return JSONResponse(
                {
                    "error": (
                        "Interfața Home Lab a fost actualizată pentru calcul distribuit pe "
                        "ramuri. Reîncarcă pagina și pornește optimizarea din nou."
                    ),
                    "requiresShardedExecution": True,
                    "runBranchIds": [item.branch_id for item in legacy_runnable],
                },
                status_code=409,
            )
        cost_catalog = await _optimizer_cost_catalog(request)
        optimization_started = time.perf_counter()
        mixed_result = run_mixed_heating_optimization(
            optimization_request,
            bounds=OptimizationSearchBoundsV1(),
            catalog=cost_catalog,
            max_evaluations_per_branch=24,
            heating_catalog=heating_catalog,
        )
        optimization_elapsed_ms = round(
            (time.perf_counter() - optimization_started) * 1000.0,
            1,
        )
        selected = mixed_result.selection.selected
        if selected is None or selected.resulting_configuration is None:
            return JSONResponse(
                {
                    "error": "Nu există nicio soluție care satisface condiția economică aleasă în spațiul analizat.",
                    "selection": model_to_dict(mixed_result.selection),
                    "evaluated_candidates": len(mixed_result.candidates),
                    "parametric_evaluations": mixed_result.parametric_evaluations,
                    "heating_branch_evaluations": mixed_result.heating_branch_evaluations,
                    "heating_branches": [
                        model_to_dict(item) for item in mixed_result.branches
                    ],
                    "pareto_count": mixed_result.selection.pareto_count,
                },
                status_code=422,
            )

        final_result = calculate(
            selected.resulting_configuration,
            include_reference=False,
        )
        raw_measures = model_to_dict(selected.parameters)
        commercial_ready = (
            selected.commercialization_status == "commercialized"
            or (
                selected.commercialization_status == "raw_only"
                and float(selected.capex_lei) <= 1e-9
            )
        )
        active_rows = _optimizer_measure_rows(selected)
        selected_heating = next(
            (
                {
                    "label": line.note.split(". ", 1)[0] if line.note else "Sistem de încălzire",
                    "capexLei": float(line.capex_lei),
                    "ratedPowerKw": float(line.parameter_value),
                    "sourceKind": line.source_kind,
                    "sourceUrl": line.source_url,
                    "confidence": line.confidence,
                    "optionId": line.product_id,
                    "equipmentPriceLei": line.material_subtotal_lei,
                    "installationAllowanceLei": line.nonmaterial_subtotal_lei,
                }
                for line in selected.cost_breakdown
                if line.family == "heating"
            ),
            None,
        )
        optimization_payload = {
            "kind": "parametric_economic",
            "mode": "parametric_economic",
            "economicMode": mode.value,
            "label": _home_lab_optimizer_label(mode, form),
            "rationale": mixed_result.selection.rationale,
            "capexLei": float(selected.capex_lei),
            "annualSavingLei": float(selected.annual_saving_lei),
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
            "evaluatedCandidates": int(len(mixed_result.candidates)),
            "calculationTimeMs": optimization_elapsed_ms,
            "parametricEvaluations": int(mixed_result.parametric_evaluations),
            "heatingBranchEvaluations": int(mixed_result.heating_branch_evaluations),
            "feasibleCandidates": int(mixed_result.selection.feasible_count),
            "paretoSolutions": int(mixed_result.selection.pareto_count),
            "heatingBranches": [
                model_to_dict(item) for item in mixed_result.branches
            ],
            "rawSolution": raw_measures,
            "rawEvaluation": {
                "candidateId": selected.candidate_id,
                "annualBillLei": float(selected.annual_bill_lei),
                "baselineAnnualBillLei": float(selected.baseline_annual_bill_lei),
                "finalEnergyKwh": float(selected.final_energy_kwh),
                "primarySpecificKwhM2": float(selected.primary_specific_kwh_m2),
                "co2TotalKg": float(selected.co2_total_kg),
                "co2SpecificKgM2": float(selected.co2_specific_kg_m2),
                "energyClass": selected.energy_class,
                "designHeatLoadKw": selected.design_heat_load_kw,
            },
            "resultingConfiguration": model_to_dict(selected.resulting_configuration),
            "commercialSolution": None,
            "commercializationStatus": selected.commercialization_status,
            "commercialReady": commercial_ready,
            "commercialMessage": (
                "Soluția nu necesită discretizare comercială."
                if commercial_ready
                else (
                    "Catalogul comercial complet nu este încă atașat acestei rulări. "
                    "Rezultatul de mai jos este optimul parametric; raportul nu inventează "
                    "grosimi, module, ferestre sau echipamente comerciale."
                )
            ),
            "discretization": [],
            "costSource": selected.cost_source,
            "costCatalogVersion": selected.cost_catalog_version,
            "warnings": [
                *mixed_result.warnings,
                *selected.warnings,
            ],
            "autoHorizonsYears": mixed_result.selection.auto_horizons_years,
        }
        return JSONResponse(
            {
                "scenario": embed_lab_result_payload(final_result),
                "optimization": optimization_payload,
            }
        )
    except Exception as exc:
        return JSONResponse({"error": user_error(exc)}, status_code=422)


@app.post("/calculate", response_class=HTMLResponse)
async def calculate_from_form(request: Request) -> HTMLResponse:
    return await render_calculation_from_form(request)


@app.get("/magazin", response_class=HTMLResponse)
@app.get("/embed-host-demo", response_class=HTMLResponse)
async def embed_host_demo(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "embed_host_demo.html", {"request": request})


@app.get("/embed", response_class=HTMLResponse)
async def embed_integration(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "embed_info.html",
        {
            "request": request,
            "demo_partner": embed_partner("demo-store"),
        },
    )


@app.get("/embed/{partner_id}/next", response_class=HTMLResponse)
async def partner_embed_home_lab_next(request: Request, partner_id: str) -> HTMLResponse:
    partner = embed_partner(partner_id)
    return templates.TemplateResponse(
        request,
        "home_lab_next.html",
        {
            "request": request,
            **calculator_context(),
            "partner": partner,
            "embed_mode": True,
            "calculate_url": f"/embed/{partner_id}/next/calculate",
            "energy_overview": home_lab_price_overview(),
        },
    )


@app.post("/embed/{partner_id}/next/calculate")
async def partner_embed_home_lab_next_calculate(request: Request, partner_id: str) -> JSONResponse:
    embed_partner(partner_id)
    return await home_lab_next_calculation(request)


@app.get("/embed/{partner_id}", response_class=HTMLResponse)
async def partner_embed_calculator(request: Request, partner_id: str) -> HTMLResponse:
    page = embed_page_context(partner_id)
    return templates.TemplateResponse(
        request,
        "embed_house_lab.html",
        {
            "request": request,
            **calculator_context(),
            **page,
            "embed_lab_mode": True,
        },
    )


@app.post("/embed/{partner_id}/lab-calculate")
async def partner_embed_lab_calculate(request: Request, partner_id: str) -> JSONResponse:
    embed_partner(partner_id)
    form = dict(await request.form())
    try:
        building = build_input_from_form(form)
        # The legacy embedded live dashboard does not consume the computed
        # reference-building comparison. Avoid a second full engine pass.
        result = calculate(building, include_reference=False)
    except Exception as exc:
        return JSONResponse({"error": user_error(exc)}, status_code=422)
    return JSONResponse(embed_lab_result_payload(result))


@app.post("/embed/{partner_id}/calculate", response_class=HTMLResponse)
async def partner_embed_calculate(request: Request, partner_id: str) -> HTMLResponse:
    return await render_calculation_from_form(request, page_context=embed_page_context(partner_id))


@app.get("/embed/{partner_id}/demo", response_class=HTMLResponse)
async def partner_embed_demo(request: Request, partner_id: str) -> HTMLResponse:
    page = embed_page_context(partner_id)
    result = calculate(demo_building())
    return templates.TemplateResponse(
        request,
        "results.html",
        {"request": request, **result_context(result), **page},
    )


@app.get("/demo", response_class=HTMLResponse)
async def demo(request: Request) -> HTMLResponse:
    result = calculate(demo_building())
    return templates.TemplateResponse(request, "results.html", result_context(result))


@app.post("/certificate", response_class=HTMLResponse)
async def certificate(request: Request) -> HTMLResponse:
    form = dict(await request.form())
    payload = form.get("payload")
    try:
        building = building_from_json(str(payload))
        result = calculate(building)
    except Exception as exc:
        return templates.TemplateResponse(
            request,
            "calculator.html",
            {"request": request, **calculator_context(error=user_error(exc))},
            status_code=422,
        )

    return templates.TemplateResponse(
        request,
        "certificate.html",
        {
            "result": result,
            "cost_estimate": estimate_energy_cost(result),
            "payload": json.dumps(model_to_dict(result.input), ensure_ascii=False, default=str),
        },
    )
