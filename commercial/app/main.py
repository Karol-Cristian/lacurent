from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import ValidationError

from .engine import calculate, demo_building
from .engineering_requirements import (
    EngineeringRequirementsRequestV1,
    build_engineering_requirements,
)
from .elivio import router as elivio_router
from .home_lab_images import HOME_LAB_IMAGE_BYTES
from .methodology import climate_data, location_payload, methodology, resolve_locality
from .models import BuildingInput, building_from_json, model_to_dict, model_to_json
from .pricing import energy_prices, estimate_energy_cost
from .pv_catalog import (
    PvModuleSizingRequestV1,
    PvProductScenarioRequestV1,
    build_pv_product_scenario,
    pv_catalog,
    size_pv_modules,
)
from .widget_recommendations import (
    WidgetRecommendationRequestV1,
    build_widget_recommendations,
)
from .product_matching import (
    WallInsulationProductMatchRequestV1,
    WallInsulationProductScenarioRequestV1,
    build_product_wall_insulation_scenario,
    match_wall_insulation_products,
)
from .renovation import WallInsulationScenarioRequestV1, build_wall_insulation_scenario
from .software_resources import router as software_resources_router

BASE_DIR = Path(__file__).resolve().parents[1]
HOME_LAB_IMAGE_NAMES = frozenset(HOME_LAB_IMAGE_BYTES)

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
    description="LaCurent engineering, software testing and energy services.",
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.include_router(software_resources_router)
app.include_router(elivio_router)

templates = Jinja2Templates(directory=BASE_DIR / "templates")


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
        "dhw_efficiency": 0.86,
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
            "dhw_efficiency": building.dhw.efficiency,
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
        "heat_recovery_efficiency": recovery,
        "heating": heating,
    }


def build_input_from_form(form: dict[str, Any]) -> BuildingInput:
    technical = _technical_values(form)
    components = []
    component_map = [
        ("Pereți exteriori", "exterior_wall", "wall_area_m2", "wall_u_value"),
        ("Acoperiș / tavan", "roof", "roof_area_m2", "roof_u_value"),
        ("Pardoseală spre sol", "floor", "floor_area_m2", "floor_u_value"),
        ("Ferestre", "window", "window_area_m2", "window_u_value"),
        ("Uși exterioare", "exterior_door", "door_area_m2", "door_u_value"),
    ]

    for name, kind, area_key, u_key in component_map:
        area = technical.get(area_key)
        u_value = technical.get(u_key)
        if area is None or area <= 0:
            continue
        components.append({"name": name, "type": kind, "area_m2": area, "u_value_w_m2k": u_value})

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

    dhw_carrier = form.get("dhw_carrier")
    if form.get("expert_dhw_override") != "on" and _simple_form_present(form):
        dhw_carrier = heating["carrier"]

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
            "efficiency": parse_optional_float(form.get("dhw_efficiency")) or 0.85,
            "carrier": dhw_carrier or "natural_gas",
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


def embed_lab_result_payload(result: Any) -> dict[str, Any]:
    cost = estimate_energy_cost(result)
    climate = result.climate or {}
    selected = climate.get("selected_locality", {})
    design_temperature = climate.get("winter_design_temperature_c")
    delta_t = (
        max(float(result.input.indoor_design_temperature_c) - float(design_temperature), 0.0)
        if design_temperature is not None
        else None
    )
    design_heat_load_kw = (
        float(result.heat_loss_w_k) * delta_t / 1000.0
        if delta_t is not None
        else None
    )

    loss_rows = [
        {
            "name": item.name,
            "type": item.type,
            "value_w_k": float(item.value),
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
            }
        )
    loss_total = sum(row["value_w_k"] for row in loss_rows) or 1.0
    for row in loss_rows:
        row["percent"] = 100.0 * row["value_w_k"] / loss_total
    loss_rows.sort(key=lambda row: row["value_w_k"], reverse=True)

    reference = result.reference
    method = methodology()
    reference_rules = method["reference_building"]
    climate_zone = str(climate.get("climate_zone") or "")
    if not climate_zone:
        try:
            locality_meta = resolve_locality(result.input.locality)
            climate_zone = str(locality_meta.get("climateZone") or "")
        except Exception:
            climate_zone = ""
    building_type = result.input.building_type.value
    nzeb_registry = method.get("nzeb_targets", {})
    nzeb_target = (
        nzeb_registry.get("values", {}).get(climate_zone, {}).get(building_type)
        if climate_zone
        else None
    )
    return {
        "energy_class": result.energy_class,
        "final_energy_kwh": float(result.total_final_energy_kwh),
        "gross_service_final_energy_kwh": float(result.total_service_final_energy_kwh),
        "primary_specific_kwh_m2": float(result.primary_energy.specific_kwh_m2),
        "co2_kg": float(result.co2.total_kg),
        "co2_specific_kg_m2": float(result.co2.specific_kg_m2),
        "heat_loss_w_k": float(result.heat_loss_w_k),
        "annual_cost_lei": float(cost["priced_total_lei"]) if cost.get("complete") else None,
        "average_monthly_cost_lei": float(cost["average_monthly_priced_lei"]) if cost.get("complete") else None,
        "design_heat_load_kw": design_heat_load_kw,
        "locality": selected.get("display_name") or result.input.locality,
        "climate_station": climate.get("station") or "",
        "climate_zone": climate_zone or None,
        "nzeb_target": (
            {
                "primary_energy_kwh_m2_year": float(nzeb_target["primary_energy_kwh_m2_year"]),
                "co2_kg_m2_year": float(nzeb_target["co2_kg_m2_year"]),
                "building_type": building_type,
                "climate_zone": climate_zone,
                "energy_unit": nzeb_registry.get("energy_unit"),
                "co2_unit": nzeb_registry.get("co2_unit"),
                "source": nzeb_registry.get("source"),
                "source_status": nzeb_registry.get("source_status"),
                "envelope_source": nzeb_registry.get("envelope_source"),
                "renewable_requirement_status": nzeb_registry.get("renewable_requirement_status"),
                "envelope_u_max_w_m2k": nzeb_registry.get("residential_envelope_u_max_w_m2k", {}),
            }
            if nzeb_target
            else None
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
        "monthly": [
            {
                "month": row.month,
                "useful_heating_kwh": float(row.useful_heating_kwh),
                "useful_cooling_kwh": float(row.useful_cooling_kwh),
                "outdoor_temperature_c": float(row.outdoor_temperature_c),
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
async def location_data_api() -> JSONResponse:
    return JSONResponse(location_payload())


@app.get("/api/energy-prices")
async def energy_prices_api() -> JSONResponse:
    return JSONResponse(energy_prices())


@app.post("/api/engineering/requirements")
async def engineering_requirements_api(
    payload: EngineeringRequirementsRequestV1,
) -> JSONResponse:
    try:
        result = build_engineering_requirements(payload.baseline)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(result))


@app.post("/api/widget/product-recommendations")
async def widget_product_recommendations_api(
    payload: WidgetRecommendationRequestV1,
) -> JSONResponse:
    try:
        result = build_widget_recommendations(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(result))


@app.get("/api/products/pv-modules")
async def pv_module_catalog_api() -> JSONResponse:
    return JSONResponse(model_to_dict(pv_catalog()))


@app.post("/api/products/pv-modules/size")
async def pv_module_sizing_api(payload: PvModuleSizingRequestV1) -> JSONResponse:
    return JSONResponse(model_to_dict(size_pv_modules(payload)))


@app.post("/api/scenarios/pv/product")
async def pv_product_scenario_api(payload: PvProductScenarioRequestV1) -> JSONResponse:
    try:
        response = build_pv_product_scenario(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return JSONResponse(model_to_dict(response))


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


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "index.html", {"request": request})


@app.get("/software-testing", response_class=HTMLResponse)
async def software_testing(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "software_testing.html", {"request": request})


@app.get("/instalatii", response_class=HTMLResponse)
async def installations(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "instalatii.html", {"request": request})


@app.get("/instalatii/calculator", response_class=HTMLResponse)
async def energy_calculator(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "home_lab_product.html", {"request": request})


@app.get("/instalatii/calculator/legacy", response_class=HTMLResponse)
async def energy_calculator_legacy(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "calculator.html", {"request": request, **calculator_context()})


@app.get("/home-lab-next", response_class=HTMLResponse)
async def home_lab_next(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "home_lab_next.html",
        {
            "request": request,
            **calculator_context(),
            "partner": None,
            "embed_mode": False,
            "calculate_url": "/api/home-lab-next/calculate",
        },
    )


async def home_lab_next_calculation(request: Request) -> JSONResponse:
    form = dict(await request.form())
    try:
        building = build_input_from_form(form)
        result = calculate(building)
    except Exception as exc:
        return JSONResponse({"error": user_error(exc)}, status_code=422)
    return JSONResponse(embed_lab_result_payload(result))


@app.post("/api/home-lab-next/calculate")
async def home_lab_next_calculate_api(request: Request) -> JSONResponse:
    return await home_lab_next_calculation(request)


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
        result = calculate(building)
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
