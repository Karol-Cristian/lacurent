from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import ValidationError

from .engine import calculate, demo_building
from .methodology import climate_data, location_payload, methodology, resolve_locality
from .models import BuildingInput, building_from_json, model_to_dict, model_to_json

BASE_DIR = Path(__file__).resolve().parents[1]

app = FastAPI(
    title="LaCurent Commercial",
    version="2.0.0",
    description="Clean residential building-energy calculator.",
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

templates = Jinja2Templates(directory=BASE_DIR / "templates")


def fmt(value: float | int | None, unit: str = "", digits: int = 1) -> str:
    if value is None:
        return "-"
    text = f"{float(value):,.{digits}f}".replace(",", " ")
    if digits and text.endswith("." + ("0" * digits)):
        text = text[: -(digits + 1)]
    return f"{text} {unit}".strip()


templates.env.filters["fmt"] = fmt


def climate_options() -> list[str]:
    return [item["name"] for item in climate_data()["localities"]]


def default_form_values() -> dict[str, Any]:
    return {
        "project_name": "",
        "locality_id": "siruta-54984",
        "locality": "Cluj-Napoca",
        "heated_floor_area_m2": 150,
        "heated_volume_m3": 405,
        "indoor_design_temperature_c": 20,
        "building_type": "residential_individual",
        "construction_year": 2005,
        "solar_gains_kwh_m2_month": 0,
        "wall_area_m2": 160,
        "wall_u_value": 0.45,
        "roof_area_m2": 90,
        "roof_u_value": 0.25,
        "floor_area_m2": 80,
        "floor_u_value": 0.35,
        "window_area_m2": 24,
        "window_u_value": 1.4,
        "door_area_m2": 3,
        "door_u_value": 1.7,
        "thermal_bridge_length_m": 40,
        "thermal_bridge_psi_w_mk": 0.05,
        "air_changes_per_hour": 0.5,
        "heat_recovery_efficiency": 0,
        "heating_system_type": "condensing_gas_boiler",
        "heating_efficiency": 0.94,
        "heating_scop": 3.2,
        "heating_carrier": "natural_gas",
        "cooling_enabled": False,
        "cooling_seer": 3.5,
        "cooling_setpoint_c": 26,
        "dhw_enabled": True,
        "dhw_occupants": 4,
        "dhw_litres_per_person_day_at_60c": 50,
        "dhw_efficiency": 0.86,
        "dhw_carrier": "natural_gas",
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
            "air_changes_per_hour": building.ventilation.air_changes_per_hour,
            "heat_recovery_efficiency": building.ventilation.heat_recovery_efficiency,
            "heating_system_type": building.heating.system_type.value,
            "heating_efficiency": building.heating.efficiency,
            "heating_scop": building.heating.scop,
            "heating_carrier": building.heating.carrier.value,
            "cooling_enabled": building.cooling.enabled,
            "cooling_seer": building.cooling.seer,
            "cooling_setpoint_c": building.cooling.setpoint_c,
            "dhw_enabled": building.dhw.enabled,
            "dhw_occupants": building.dhw.occupants,
            "dhw_litres_per_person_day_at_60c": building.dhw.litres_per_person_day_at_60c,
            "dhw_efficiency": building.dhw.efficiency,
            "dhw_carrier": building.dhw.carrier.value,
        }
    )
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


def build_input_from_form(form: dict[str, Any]) -> BuildingInput:
    components = []
    component_map = [
        ("External walls", "exterior_wall", "wall_area_m2", "wall_u_value"),
        ("Roof / ceiling", "roof", "roof_area_m2", "roof_u_value"),
        ("Ground floor", "floor", "floor_area_m2", "floor_u_value"),
        ("Windows", "window", "window_area_m2", "window_u_value"),
        ("External doors", "exterior_door", "door_area_m2", "door_u_value"),
    ]

    for name, kind, area_key, u_key in component_map:
        area = parse_optional_float(form.get(area_key))
        u_value = parse_optional_float(form.get(u_key))
        if area is not None or u_value is not None:
            components.append(
                {
                    "name": name,
                    "type": kind,
                    "area_m2": area,
                    "u_value_w_m2k": u_value,
                }
            )

    thermal_bridges = []
    bridge_length = parse_optional_float(form.get("thermal_bridge_length_m"))
    bridge_psi = parse_optional_float(form.get("thermal_bridge_psi_w_mk"))
    if bridge_length is not None or bridge_psi is not None:
        thermal_bridges.append(
            {
                "name": "Linear thermal bridges",
                "length_m": bridge_length,
                "psi_w_mk": bridge_psi if bridge_psi is not None else 0,
            }
        )

    cooling_enabled = form.get("cooling_enabled") == "on"
    dhw_enabled = form.get("dhw_enabled") == "on"

    return BuildingInput(
        project_name=str(form.get("project_name") or "LaCurent Project"),
        locality=str(form.get("locality_id") or form.get("locality") or ""),
        heated_floor_area_m2=parse_optional_float(form.get("heated_floor_area_m2")),
        heated_volume_m3=parse_optional_float(form.get("heated_volume_m3")),
        indoor_design_temperature_c=parse_optional_float(form.get("indoor_design_temperature_c")) or 20,
        building_type=form.get("building_type") or "residential_individual",
        construction_year=parse_optional_int(form.get("construction_year")),
        solar_gains_kwh_m2_month=parse_optional_float(form.get("solar_gains_kwh_m2_month")) or 0,
        envelope=components,
        thermal_bridges=thermal_bridges,
        ventilation={
            "air_changes_per_hour": parse_optional_float(form.get("air_changes_per_hour")),
            "heat_recovery_efficiency": parse_optional_float(form.get("heat_recovery_efficiency")) or 0,
        },
        heating={
            "system_type": form.get("heating_system_type") or "condensing_gas_boiler",
            "carrier": form.get("heating_carrier") or "natural_gas",
            "efficiency": parse_optional_float(form.get("heating_efficiency")),
            "scop": parse_optional_float(form.get("heating_scop")),
        },
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
            "carrier": form.get("dhw_carrier") or "natural_gas",
        },
    )


def user_error(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        first = exc.errors()[0]
        field = " / ".join(str(item) for item in first.get("loc", []))
        return f"{field}: {first.get('msg', 'invalid value')}"
    return str(exc)


def result_context(result: Any) -> dict[str, Any]:
    envelope = sorted(result.envelope_contributions, key=lambda item: item.value, reverse=True)
    service_max = max(result.final_energy_by_service.values()) or 1
    carrier_max = max(result.final_energy_by_carrier.values()) if result.final_energy_by_carrier else 1
    monthly_max = max(
        [row.useful_heating_kwh + row.useful_cooling_kwh for row in result.monthly] or [1]
    )
    return {
        "result": result,
        "envelope_sorted": envelope,
        "service_max": service_max,
        "carrier_max": carrier_max,
        "monthly_max": monthly_max,
        "payload": model_to_json(result.input),
    }


@app.get("/api/location-data")
async def location_data_api() -> JSONResponse:
    return JSONResponse(location_payload())


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "index.html",
        {
            "request": request,
            "values": default_form_values(),
            "climate_options": climate_options(),
            "methodology": methodology(),
            "error": None,
        },
    )


@app.post("/calculate", response_class=HTMLResponse)
async def calculate_from_form(request: Request) -> HTMLResponse:
    form = dict(await request.form())
    values = {**default_form_values(), **form}
    values["cooling_enabled"] = form.get("cooling_enabled") == "on"
    values["dhw_enabled"] = form.get("dhw_enabled") == "on"
    try:
        building = build_input_from_form(form)
        result = calculate(building)
    except Exception as exc:
        return templates.TemplateResponse(
            request,
            "index.html",
            {
                "request": request,
                "values": values,
                "climate_options": climate_options(),
                "methodology": methodology(),
                "error": user_error(exc),
            },
            status_code=422,
        )

    return templates.TemplateResponse(
        request,
        "results.html",
        result_context(result),
    )


@app.get("/demo", response_class=HTMLResponse)
async def demo(request: Request) -> HTMLResponse:
    result = calculate(demo_building())
    return templates.TemplateResponse(
        request,
        "results.html",
        result_context(result),
    )


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
            "index.html",
            {
                "request": request,
                "values": default_form_values(),
                "climate_options": climate_options(),
                "methodology": methodology(),
                "error": user_error(exc),
            },
            status_code=422,
        )

    return templates.TemplateResponse(
        request,
        "certificate.html",
        {
            "result": result,
            "payload": json.dumps(model_to_dict(result.input), ensure_ascii=False, default=str),
        },
    )
