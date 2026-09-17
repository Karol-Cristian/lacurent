from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import ValidationError

from .engine import calculate, demo_building
from .methodology import climate_data, location_payload, methodology, resolve_locality
from .models import BuildingInput, building_from_json, model_to_dict, model_to_json
from .pricing import energy_prices, estimate_energy_cost
from .software_resources import router as software_resources_router

BASE_DIR = Path(__file__).resolve().parents[1]

app = FastAPI(
    title="LaCurent",
    version="2.4.0",
    description="LaCurent engineering, software testing and energy services.",
)
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.include_router(software_resources_router)

templates = Jinja2Templates(directory=BASE_DIR / "templates")


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


def climate_options() -> list[str]:
    return [item["name"] for item in climate_data()["localities"]]


ENVELOPE_PROFILES: dict[str, dict[str, float]] = {
    "poor": {"wall": 1.30, "roof": 1.00, "floor": 0.90, "window": 2.80, "door": 2.50, "psi": 0.15},
    "average": {"wall": 0.55, "roof": 0.35, "floor": 0.45, "window": 1.60, "door": 1.80, "psi": 0.08},
    "good": {"wall": 0.30, "roof": 0.20, "floor": 0.30, "window": 1.10, "door": 1.40, "psi": 0.05},
    "very_good": {"wall": 0.18, "roof": 0.15, "floor": 0.20, "window": 0.85, "door": 1.10, "psi": 0.03},
}

VENTILATION_PROFILES: dict[str, tuple[float, float]] = {
    "natural": (0.50, 0.0),
    "mechanical": (0.60, 0.0),
    "heat_recovery": (0.45, 0.75),
    "unknown": (0.50, 0.0),
}

HEATING_PROFILES: dict[str, dict[str, Any]] = {
    "condensing_gas_boiler": {"system_type": "condensing_gas_boiler", "carrier": "natural_gas", "efficiency": 0.94, "scop": 3.2, "cost_profile": "natural_gas"},
    "gas_boiler": {"system_type": "gas_boiler", "carrier": "natural_gas", "efficiency": 0.85, "scop": 3.2, "cost_profile": "natural_gas"},
    "electric_resistance": {"system_type": "electric_resistance", "carrier": "electricity", "efficiency": 1.0, "scop": 3.2, "cost_profile": "electricity"},
    "heat_pump": {"system_type": "heat_pump", "carrier": "electricity", "efficiency": 1.0, "scop": 3.2, "cost_profile": "electricity"},
    "wood_stove": {"system_type": "custom", "carrier": "biomass", "efficiency": 0.75, "scop": 3.2, "cost_profile": "firewood"},
    "wood_boiler": {"system_type": "custom", "carrier": "biomass", "efficiency": 0.80, "scop": 3.2, "cost_profile": "firewood"},
    "pellet_boiler": {"system_type": "custom", "carrier": "biomass", "efficiency": 0.88, "scop": 3.2, "cost_profile": "pellets"},
    "district_heat": {"system_type": "district_heat", "carrier": "district_heat", "efficiency": 0.95, "scop": 3.2, "cost_profile": "district_heat"},
    "custom": {"system_type": "custom", "carrier": "natural_gas", "efficiency": 0.85, "scop": 3.2, "cost_profile": "other"},
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
        "cooling_enabled": False,
        "cooling_seer": 3.5,
        "cooling_setpoint_c": 26,
        "dhw_enabled": True,
        "dhw_occupants": 4,
        "dhw_litres_per_person_day_at_60c": 50,
        "dhw_efficiency": 0.86,
        "dhw_carrier": "natural_gas",
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
            "air_changes_per_hour": building.ventilation.air_changes_per_hour,
            "heat_recovery_efficiency": building.ventilation.heat_recovery_efficiency,
            "heating_system_type": building.heating.system_type.value,
            "heating_efficiency": building.heating.efficiency,
            "heating_scop": building.heating.scop,
            "heating_carrier": building.heating.carrier.value,
            "heating_cost_profile": building.heating.cost_profile,
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

    return BuildingInput(
        project_name=str(form.get("project_name") or "Proiect LaCurent"),
        locality=str(form.get("locality_id") or form.get("locality") or ""),
        heated_floor_area_m2=technical.get("heated_floor_area_m2"),
        heated_volume_m3=technical.get("heated_volume_m3"),
        indoor_design_temperature_c=parse_optional_float(form.get("indoor_design_temperature_c")) or 20,
        building_type=form.get("building_type") or "residential_individual",
        construction_year=parse_optional_int(form.get("construction_year")),
        solar_gains_kwh_m2_month=parse_optional_float(form.get("solar_gains_kwh_m2_month")) or 0,
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
    )


def user_error(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        first = exc.errors()[0]
        field = " / ".join(str(item) for item in first.get("loc", []))
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


@app.get("/api/location-data")
async def location_data_api() -> JSONResponse:
    return JSONResponse(location_payload())


@app.get("/api/energy-prices")
async def energy_prices_api() -> JSONResponse:
    return JSONResponse(energy_prices())


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
    return templates.TemplateResponse(request, "calculator.html", {"request": request, **calculator_context()})


@app.post("/calculate", response_class=HTMLResponse)
async def calculate_from_form(request: Request) -> HTMLResponse:
    form = dict(await request.form())
    values = {**default_form_values(), **form}
    for key in ("cooling_enabled", "dhw_enabled", "apartment_top_exposed", "apartment_bottom_exposed"):
        values[key] = _checked(form, key)
    try:
        building = build_input_from_form(form)
        result = calculate(building)
    except Exception as exc:
        return templates.TemplateResponse(
            request,
            "calculator.html",
            {"request": request, **calculator_context(error=user_error(exc), values=values)},
            status_code=422,
        )

    return templates.TemplateResponse(request, "results.html", result_context(result))


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
