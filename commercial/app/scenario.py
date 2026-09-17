from __future__ import annotations

import math
from typing import Any

from .methodology import climate_data
from .models import BuildingInput, model_to_dict

ENVELOPE_PROFILES: dict[str, dict[str, float]] = {
    "poor": {"exterior_wall": 1.30, "roof": 1.00, "floor": 0.90, "window": 2.80, "exterior_door": 2.50, "psi": 0.15},
    "average": {"exterior_wall": 0.55, "roof": 0.35, "floor": 0.45, "window": 1.60, "exterior_door": 1.80, "psi": 0.08},
    "good": {"exterior_wall": 0.30, "roof": 0.20, "floor": 0.30, "window": 1.10, "exterior_door": 1.40, "psi": 0.05},
    "very_good": {"exterior_wall": 0.18, "roof": 0.15, "floor": 0.20, "window": 0.85, "exterior_door": 1.10, "psi": 0.03},
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
}

CLIMATE_ZONE_DESIGN_C = {"I": -12.0, "II": -15.0, "III": -18.0, "IV": -21.0, "V": -24.0}


def representative_station_for_zone(zone: str) -> dict[str, Any]:
    target = CLIMATE_ZONE_DESIGN_C[zone]
    stations = climate_data()["localities"]
    return min(
        stations,
        key=lambda item: abs(float(item.get("winter_design_mean_daily_temperature_c") or target) - target),
    )


def climate_zone_token(zone: str) -> str:
    station = representative_station_for_zone(zone)
    short_id = str(station["id"]).removeprefix("mc001_6_2013_")
    return f"@lc|{short_id}|{zone}|{CLIMATE_ZONE_DESIGN_C[zone]}|{station['name']}"


def infer_insulation_profile(building: BuildingInput) -> str:
    values = {item.type.value: float(item.u_value_w_m2k) for item in building.envelope}
    best_name = "average"
    best_score = float("inf")
    for name, profile in ENVELOPE_PROFILES.items():
        score = 0.0
        count = 0
        for kind, actual in values.items():
            target = profile.get(kind)
            if target is None:
                continue
            score += ((actual - target) / max(target, 0.01)) ** 2
            count += 1
        if count and score < best_score:
            best_name = name
            best_score = score
    return best_name


def infer_heating_choice(building: BuildingInput) -> str:
    heating = building.heating
    profile = heating.cost_profile
    system_type = heating.system_type.value
    if system_type == "heat_pump":
        return "heat_pump"
    if system_type == "electric_resistance":
        return "electric_resistance"
    if system_type == "condensing_gas_boiler":
        return "condensing_gas_boiler"
    if system_type == "gas_boiler":
        return "gas_boiler"
    if system_type == "district_heat":
        return "district_heat"
    if profile == "pellets":
        return "pellet_boiler"
    if profile == "firewood":
        efficiency = float(heating.efficiency or 0.75)
        return "wood_boiler" if efficiency >= 0.78 else "wood_stove"
    return "condensing_gas_boiler"


def apply_scenario(building: BuildingInput, controls: dict[str, Any]) -> BuildingInput:
    data = model_to_dict(building)

    base_area = float(building.heated_floor_area_m2)
    requested_area = float(controls.get("heated_floor_area_m2") or base_area)
    requested_area = min(max(requested_area, max(20.0, base_area * 0.35)), base_area * 2.5)
    ratio = requested_area / base_area
    linear_ratio = math.sqrt(ratio)
    data["heated_floor_area_m2"] = requested_area
    data["heated_volume_m3"] = float(building.heated_volume_m3) * ratio

    for component in data.get("envelope", []):
        kind = str(component.get("type"))
        factor = ratio if kind in {"roof", "floor"} else linear_ratio
        component["area_m2"] = float(component["area_m2"]) * factor
    for bridge in data.get("thermal_bridges", []):
        bridge["length_m"] = float(bridge["length_m"]) * linear_ratio

    insulation = str(controls.get("insulation_profile") or infer_insulation_profile(building))
    profile = ENVELOPE_PROFILES.get(insulation, ENVELOPE_PROFILES["average"])
    for component in data.get("envelope", []):
        kind = str(component.get("type"))
        if kind in profile:
            component["u_value_w_m2k"] = profile[kind]
    for bridge in data.get("thermal_bridges", []):
        bridge["psi_w_mk"] = profile["psi"]

    heating_choice = str(controls.get("heating_choice") or infer_heating_choice(building))
    if heating_choice in HEATING_PROFILES:
        data["heating"] = dict(HEATING_PROFILES[heating_choice])

    indoor = float(controls.get("indoor_design_temperature_c") or building.indoor_design_temperature_c)
    data["indoor_design_temperature_c"] = min(max(indoor, 16.0), 24.0)

    zone = str(controls.get("climate_zone") or "").upper()
    if zone in CLIMATE_ZONE_DESIGN_C:
        data["locality"] = climate_zone_token(zone)

    return BuildingInput(**data)
