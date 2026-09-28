from __future__ import annotations

from typing import Any

from .methodology import methodology
from .models import BuildingInput

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
