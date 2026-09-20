from __future__ import annotations

from math import sqrt
from time import perf_counter
from typing import Any

import numpy as np
import pandas as pd

from .engine import calculate, demo_building
from .models import BuildingInput, model_to_dict
from .methodology import methodology
from .vendor.pybuildingenergy_iso52016 import PBE_ISO52016_UPSTREAM
from .vendor.pybuildingenergy_iso52016.utils import (
    ISO52016,
    simulation_df,
)


def controlled_demo_building() -> BuildingInput:
    """Return a deliberately simple LaCurent case for an apples-to-apples audit.

    Solar gains, internal gains, ventilation, thermal bridges, floor-to-ground,
    cooling and DHW are disabled.  The first comparison therefore isolates
    above-ground envelope transmission and ISO 52016 dynamic storage effects.
    """

    payload = model_to_dict(demo_building())
    payload["project_name"] = "PBE ISO52016 controlled demo"
    payload["internal_gains_w_m2"] = 0.0
    payload["solar_gains_kwh_m2_month"] = 0.0
    payload["thermal_bridges"] = []
    payload["ventilation"] = {
        "air_changes_per_hour": 0.0,
        "heat_recovery_efficiency": 0.0,
    }
    payload["cooling"] = {
        "enabled": False,
        "seer": None,
        "setpoint_c": 26.0,
    }
    payload["dhw"] = {
        "enabled": False,
        "occupants": 0,
        "efficiency": 0.86,
        "carrier": "natural_gas",
    }
    payload["envelope"] = [
        item for item in payload["envelope"]
        if item["type"] != "floor"
    ]
    return BuildingInput(**payload)


def _weighted_u(building: BuildingInput, component_type: str) -> tuple[float, float]:
    matches = [
        component
        for component in building.envelope
        if component.type.value == component_type
    ]
    area = sum(float(component.area_m2) for component in matches)
    if area <= 0:
        return 0.0, 0.0
    h = sum(
        float(component.area_m2) * float(component.u_value_w_m2k)
        for component in matches
    )
    return area, h / area


def pbe_building_from_lacurent(
    building: BuildingInput,
    *,
    ventilation_h_w_k: float = 0.0,
    thermal_bridge_h_w_k: float = 0.0,
    internal_gain_w_m2: float = 0.0,
    effective_internal_capacity_j_m2k: float | None = None,
) -> dict[str, Any]:
    """Map the controlled LaCurent geometry to pyBuildingEnergy's BUI schema.

    For staged comparisons, LaCurent's already-resolved H_ve and H_tb values can
    be injected directly.  That isolates the dynamic ISO 52016 solver from
    differences in national pre-processing assumptions.
    """

    area = float(building.heated_floor_area_m2)
    volume = float(building.heated_volume_m3)
    height = volume / area
    perimeter = 4.0 * sqrt(area)

    wall_area, wall_u = _weighted_u(building, "exterior_wall")
    roof_area, roof_u = _weighted_u(building, "roof")
    window_area, window_u = _weighted_u(building, "window")
    door_area, door_u = _weighted_u(building, "exterior_door")

    surfaces: list[dict[str, Any]] = []
    align_effective_mass = effective_internal_capacity_j_m2k is not None
    external_opaque_capacity = 0.0 if align_effective_mass else None
    cardinal = [
        ("north", 0.0),
        ("east", 90.0),
        ("south", 180.0),
        ("west", 270.0),
    ]

    for name, azimuth in cardinal:
        if wall_area > 0:
            surfaces.append(
                {
                    "name": f"Wall {name}",
                    "type": "opaque",
                    "area": wall_area / 4.0,
                    "sky_view_factor": 0.5,
                    "u_value": wall_u,
                    "solar_absorptance": 0.6,
                    "thermal_capacity": (
                        external_opaque_capacity
                        if external_opaque_capacity is not None
                        else 165000.0
                    ),
                    "orientation": {"azimuth": azimuth, "tilt": 90.0},
                    "name_adj_zone": None,
                    "zone": "main",
                    "height": height,
                    "length": max(0.1, wall_area / 4.0 / height),
                }
            )
        if window_area > 0:
            win_area = window_area / 4.0
            surfaces.append(
                {
                    "name": f"Window {name}",
                    "type": "transparent",
                    "area": win_area,
                    "sky_view_factor": 0.5,
                    "u_value": window_u,
                    "g_value": 0.60,
                    "solar_absorptance": 0.0,
                    "thermal_capacity": 0.0,
                    "orientation": {"azimuth": azimuth, "tilt": 90.0},
                    "name_adj_zone": None,
                    "zone": "main",
                    "height": 1.5,
                    "width": max(0.1, win_area / 1.5),
                    "parapet": 0.9,
                    "shading": False,
                    "shading_type": "horizontal_overhang",
                    "width_or_distance_of_shading_elements": 0.0,
                    "overhang_properties": {
                        "width_of_horizontal_overhangs": 0.0,
                    },
                }
            )

    if roof_area > 0:
        surfaces.append(
            {
                "name": "Roof",
                "type": "opaque",
                "area": roof_area,
                "sky_view_factor": 1.0,
                "u_value": roof_u,
                "solar_absorptance": 0.6,
                "thermal_capacity": (
                    external_opaque_capacity
                    if external_opaque_capacity is not None
                    else 120000.0
                ),
                "orientation": {"azimuth": 0.0, "tilt": 0.0},
                "name_adj_zone": None,
                    "zone": "main",
                "height": max(1.0, sqrt(roof_area)),
                "length": max(1.0, sqrt(roof_area)),
            }
        )

    if door_area > 0:
        surfaces.append(
            {
                "name": "Exterior door",
                "type": "opaque",
                "area": door_area,
                "sky_view_factor": 0.5,
                "u_value": door_u,
                "solar_absorptance": 0.6,
                "thermal_capacity": (
                    external_opaque_capacity
                    if external_opaque_capacity is not None
                    else 80000.0
                ),
                "orientation": {"azimuth": 180.0, "tilt": 90.0},
                "name_adj_zone": None,
                    "zone": "main",
                "height": 2.1,
                "length": max(0.1, door_area / 2.1),
            }
        )

    if align_effective_mass:
        # PBE already assigns 10,000 J/(m² K) to the zone-air node.
        # Add the remainder as adiabatic internal mass so the total effective
        # zone capacity equals the MC001 class value exactly.
        target = float(effective_internal_capacity_j_m2k or 0.0)
        mass_capacity = max(0.0, target - 10000.0)
        surfaces.append(
            {
                "name": "MC001 effective internal thermal mass",
                "type": "opaque",
                "boundary": "ADIABATIC",
                "ISO52016_type_string": "AD",
                "area": area,
                "zone": "main",
                "sky_view_factor": 0.0,
                "u_value": 0.0,
                "thermal_capacity": mass_capacity,
                "solar_absorptance": 0.0,
                "orientation": {"azimuth": 0.0, "tilt": 0.0},
            }
        )

    t_heat = float(building.indoor_design_temperature_c)
    return {
        "building": {
            "name": building.project_name,
            "azimuth_relative_to_true_north": 0.0,
            "latitude": 46.7712,
            "longitude": 23.6236,
            "exposed_perimeter": perimeter,
            "height": height,
            "wall_thickness": 0.30,
            "n_floors": 1,
            "building_type_class": "Residential_detached_house",
            "adj_zones_present": False,
            "number_adj_zone": 0,
            "net_floor_area": area,
            "construction_class": "class_i",
            "construction_year": str(building.construction_year or 2004),
            "country": "Romania",
        },
        "adjacent_zones": [],
        "building_surface": surfaces,
        "building_parameters": {
            "temperature_setpoints": {
                "heating_setpoint": t_heat,
                "heating_setback": t_heat,
                "cooling_setpoint": 40.0,
                "cooling_setback": 40.0,
                "units": "°C",
            },
            "system_capacities": {
                "heating_capacity": 10_000_000.0,
                "cooling_capacity": 0.0,
                "units": "W",
            },
            "ventilation": {
                "ventilation_type": "custom" if ventilation_h_w_k > 0.0 else "none",
                "flow_rate_per_person": 0.0,
                "custom_heat_transfer_coefficient_ventilation": float(ventilation_h_w_k),
                "units": "W/K (custom resolved conductance)",
            },
            "internal_gains": [
                {"name": "occupants", "full_load": float(internal_gain_w_m2)},
                {"name": "appliances", "full_load": 0.0},
                {"name": "lighting", "full_load": 0.0},
            ],
            "construction": {
                "wall_thickness": 0.30,
                "thermal_bridge_heat_W_K": float(thermal_bridge_h_w_k),
                "units": "m / W/K",
            },
        },
    }


def synthetic_weather_from_lacurent(result: Any) -> pd.DataFrame:
    """Expand LaCurent monthly outdoor temperatures to an hourly audit year.

    The December before the calculation year is prepended as the 744 h ISO52016
    warm-up block. Solar radiation is intentionally zero in this first controlled
    comparison.
    """

    monthly_t = [float(row.outdoor_temperature_c) for row in result.monthly]
    if len(monthly_t) != 12:
        raise ValueError("Expected 12 LaCurent monthly climate rows.")

    index = pd.date_range(
        start="2008-12-01 00:00:00",
        end="2010-01-01 00:00:00",
        freq="h",
        inclusive="left",
    )
    temperatures = np.array(
        [
            monthly_t[11] if ts.year == 2008 else monthly_t[ts.month - 1]
            for ts in index
        ],
        dtype=float,
    )

    frame = pd.DataFrame(index=index)
    frame["T2m"] = temperatures
    frame["RH"] = 50.0
    frame["G(h)"] = 0.0
    frame["Gb(n)"] = 0.0
    frame["Gd(h)"] = 0.0
    frame["IR(h)"] = 0.0
    frame["WS10m"] = 0.0
    frame["WD10m"] = 0.0
    frame["SP"] = 101325.0
    frame["day of year"] = frame.index.dayofyear
    frame["hour of day"] = frame.index.hour + 1
    return frame


class _LaCurentSyntheticISO52016(ISO52016):
    _weather: pd.DataFrame | None = None

    @classmethod
    def set_weather(cls, weather: pd.DataFrame) -> None:
        cls._weather = weather.copy()

    @classmethod
    def Weather_data_bui(
        cls,
        building_object,
        path_weather_file=None,
        weather_source="lacurent_monthly",
    ) -> simulation_df:
        if cls._weather is None:
            raise RuntimeError("Synthetic LaCurent weather was not initialized.")
        return simulation_df(simulation_df=cls._weather.copy())


def run_controlled_iso52016_comparison() -> dict[str, Any]:
    """Run the first controlled LaCurent vs upstream ISO52016 comparison."""

    building = controlled_demo_building()
    current = calculate(building, include_reference=False)
    pbe_bui = pbe_building_from_lacurent(building)
    weather = synthetic_weather_from_lacurent(current)
    _LaCurentSyntheticISO52016.set_weather(weather)

    started = perf_counter()
    hourly = _LaCurentSyntheticISO52016.simulate_envelope_multizone_free_floating(
        building_object=pbe_bui,
        weather_source="lacurent_monthly",
        include_solar=False,
        warmup_hours=744,
        use_profiles=False,
        include_internal_gains=False,
        include_ventilation=False,
        include_thermal_bridges=False,
        hvac_control_variable="air",
        internal_convection_model="table",
        external_convection_model="table",
        external_radiation_model="table",
    )
    elapsed_ms = (perf_counter() - started) * 1000.0

    if len(hourly) > 8760:
        hourly_active = hourly.iloc[-8760:].copy()
    else:
        hourly_active = hourly.copy()

    q_col = "Q_HVAC_main"
    if q_col not in hourly_active.columns:
        raise KeyError(f"Missing expected ISO52016 column {q_col!r}.")

    q_h_w = pd.to_numeric(hourly_active[q_col], errors="coerce").fillna(0.0).clip(lower=0.0)
    pbe_heating_kwh = float(q_h_w.sum() / 1000.0)
    current_heating_kwh = float(current.annual_heating_demand_kwh)
    delta_kwh = pbe_heating_kwh - current_heating_kwh
    rel_pct = (
        100.0 * delta_kwh / current_heating_kwh
        if current_heating_kwh > 0
        else 0.0
    )

    return {
        "status": "ok",
        "scope": "controlled_above_ground_envelope_only",
        "upstream": PBE_ISO52016_UPSTREAM,
        "hours_simulated": int(len(hourly)),
        "hours_compared": int(len(hourly_active)),
        "runtime_ms": round(elapsed_ms, 1),
        "lacurent": {
            "heating_need_kwh": round(current_heating_kwh, 3),
            "heat_loss_coefficient_w_k": round(float(current.heat_loss_w_k), 6),
        },
        "pbe_iso52016": {
            "heating_need_kwh": round(pbe_heating_kwh, 3),
            "peak_heating_w": round(float(q_h_w.max()), 3),
        },
        "comparison": {
            "delta_kwh": round(delta_kwh, 3),
            "relative_delta_percent": round(rel_pct, 3),
        },
    }


def controlled_demo_with_air_losses() -> BuildingInput:
    """Controlled case 2: transmission + ventilation + thermal bridges.

    Floor/ground, solar, internal gains, cooling and DHW remain disabled so the
    only newly introduced terms are H_ve and H_tb.
    """

    payload = model_to_dict(demo_building())
    payload["project_name"] = "PBE ISO52016 controlled demo + air losses"
    payload["internal_gains_w_m2"] = 0.0
    payload["solar_gains_kwh_m2_month"] = 0.0
    payload["cooling"] = {
        "enabled": False,
        "seer": None,
        "setpoint_c": 26.0,
    }
    payload["dhw"] = {
        "enabled": False,
        "occupants": 0,
        "efficiency": 0.86,
        "carrier": "natural_gas",
    }
    payload["envelope"] = [
        item for item in payload["envelope"]
        if item["type"] != "floor"
    ]
    return BuildingInput(**payload)


def _thermal_bridge_total_w_k(building: BuildingInput) -> float:
    return float(
        sum(
            float(item.length_m) * float(item.psi_w_mk)
            for item in building.thermal_bridges
        )
    )


def run_controlled_air_losses_comparison() -> dict[str, Any]:
    """Stage 2: compare transmission + ventilation + thermal bridges."""

    building = controlled_demo_with_air_losses()
    current = calculate(building, include_reference=False)
    h_ve = float(current.h_ve_w_k)
    h_tb = _thermal_bridge_total_w_k(building)
    pbe_bui = pbe_building_from_lacurent(
        building,
        ventilation_h_w_k=h_ve,
        thermal_bridge_h_w_k=h_tb,
    )
    weather = synthetic_weather_from_lacurent(current)
    _LaCurentSyntheticISO52016.set_weather(weather)

    started = perf_counter()
    hourly = _LaCurentSyntheticISO52016.simulate_envelope_multizone_free_floating(
        building_object=pbe_bui,
        weather_source="lacurent_monthly",
        include_solar=False,
        warmup_hours=744,
        use_profiles=False,
        include_internal_gains=False,
        include_ventilation=True,
        include_thermal_bridges=True,
        hvac_control_variable="air",
        internal_convection_model="table",
        external_convection_model="table",
        external_radiation_model="table",
    )
    elapsed_ms = (perf_counter() - started) * 1000.0
    hourly_active = hourly.iloc[-8760:].copy() if len(hourly) > 8760 else hourly.copy()

    q_h_w = (
        pd.to_numeric(hourly_active["Q_HVAC_main"], errors="coerce")
        .fillna(0.0)
        .clip(lower=0.0)
    )
    pbe_heating_kwh = float(q_h_w.sum() / 1000.0)
    current_heating_kwh = float(current.annual_heating_demand_kwh)
    delta_kwh = pbe_heating_kwh - current_heating_kwh
    rel_pct = 100.0 * delta_kwh / current_heating_kwh if current_heating_kwh > 0 else 0.0

    pbe_h_ve_mean = None
    if "H_ve_main" in hourly_active.columns:
        pbe_h_ve_mean = float(
            pd.to_numeric(hourly_active["H_ve_main"], errors="coerce")
            .fillna(0.0)
            .mean()
        )

    return {
        "status": "ok",
        "scope": "controlled_envelope_plus_ventilation_and_thermal_bridges",
        "upstream": PBE_ISO52016_UPSTREAM,
        "hours_simulated": int(len(hourly)),
        "hours_compared": int(len(hourly_active)),
        "runtime_ms": round(elapsed_ms, 1),
        "resolved_coefficients": {
            "lacurent_h_ve_w_k": round(h_ve, 6),
            "pbe_mean_h_ve_w_k": (
                None if pbe_h_ve_mean is None else round(pbe_h_ve_mean, 6)
            ),
            "thermal_bridge_h_w_k": round(h_tb, 6),
            "lacurent_total_heat_loss_w_k": round(float(current.heat_loss_w_k), 6),
        },
        "lacurent": {
            "heating_need_kwh": round(current_heating_kwh, 3),
        },
        "pbe_iso52016": {
            "heating_need_kwh": round(pbe_heating_kwh, 3),
            "peak_heating_w": round(float(q_h_w.max()), 3),
        },
        "comparison": {
            "delta_kwh": round(delta_kwh, 3),
            "relative_delta_percent": round(rel_pct, 3),
        },
    }


def controlled_demo_with_internal_gains() -> BuildingInput:
    """Controlled case 3: add a constant internal-gain term to stage 2."""

    payload = model_to_dict(controlled_demo_with_air_losses())
    payload["project_name"] = "PBE ISO52016 controlled demo + internal gains"
    payload["internal_gains_w_m2"] = 4.0
    return BuildingInput(**payload)


def run_controlled_internal_gains_comparison() -> dict[str, Any]:
    """Stage 3: compare envelope + air losses + constant internal gains."""

    building = controlled_demo_with_internal_gains()
    current = calculate(building, include_reference=False)
    h_ve = float(current.h_ve_w_k)
    h_tb = _thermal_bridge_total_w_k(building)
    gain_w_m2 = float(building.internal_gains_w_m2 or 0.0)

    capacity_class = methodology()["monthly_method"]["default_effective_internal_heat_capacity_class"]
    capacity_j_m2k = float(
        methodology()["monthly_method"]["effective_internal_heat_capacity_j_m2k"][capacity_class]
    )
    pbe_bui = pbe_building_from_lacurent(
        building,
        ventilation_h_w_k=h_ve,
        thermal_bridge_h_w_k=h_tb,
        internal_gain_w_m2=gain_w_m2,
        effective_internal_capacity_j_m2k=capacity_j_m2k,
    )
    weather = synthetic_weather_from_lacurent(current)
    _LaCurentSyntheticISO52016.set_weather(weather)

    started = perf_counter()
    hourly = _LaCurentSyntheticISO52016.simulate_envelope_multizone_free_floating(
        building_object=pbe_bui,
        weather_source="lacurent_monthly",
        include_solar=False,
        warmup_hours=744,
        use_profiles=False,
        include_internal_gains=True,
        include_ventilation=True,
        include_thermal_bridges=True,
        hvac_control_variable="air",
        internal_convection_model="table",
        external_convection_model="table",
        external_radiation_model="table",
    )
    elapsed_ms = (perf_counter() - started) * 1000.0
    hourly_active = hourly.iloc[-8760:].copy() if len(hourly) > 8760 else hourly.copy()

    q_h_w = (
        pd.to_numeric(hourly_active["Q_HVAC_main"], errors="coerce")
        .fillna(0.0)
        .clip(lower=0.0)
    )
    pbe_heating_kwh = float(q_h_w.sum() / 1000.0)
    current_heating_kwh = float(current.annual_heating_demand_kwh)
    delta_kwh = pbe_heating_kwh - current_heating_kwh
    rel_pct = 100.0 * delta_kwh / current_heating_kwh if current_heating_kwh > 0 else 0.0

    pbe_phi_mean = None
    if "Phi_int_main" in hourly_active.columns:
        pbe_phi_mean = float(
            pd.to_numeric(hourly_active["Phi_int_main"], errors="coerce")
            .fillna(0.0)
            .mean()
        )

    expected_gain_w = gain_w_m2 * float(building.heated_floor_area_m2)
    return {
        "status": "ok",
        "scope": "controlled_envelope_air_losses_plus_constant_internal_gains",
        "upstream": PBE_ISO52016_UPSTREAM,
        "hours_simulated": int(len(hourly)),
        "hours_compared": int(len(hourly_active)),
        "runtime_ms": round(elapsed_ms, 1),
        "resolved_inputs": {
            "internal_gain_w_m2": round(gain_w_m2, 6),
            "expected_internal_gain_w": round(expected_gain_w, 6),
            "pbe_mean_internal_gain_w": (
                None if pbe_phi_mean is None else round(pbe_phi_mean, 6)
            ),
            "lacurent_h_ve_w_k": round(h_ve, 6),
            "thermal_bridge_h_w_k": round(h_tb, 6),
            "effective_capacity_class": capacity_class,
            "effective_capacity_j_m2k": round(capacity_j_m2k, 3),
            "effective_capacity_total_mj_k": round(
                capacity_j_m2k * float(building.heated_floor_area_m2) / 1_000_000.0,
                3,
            ),
        },
        "lacurent": {
            "heating_need_kwh": round(current_heating_kwh, 3),
        },
        "pbe_iso52016": {
            "heating_need_kwh": round(pbe_heating_kwh, 3),
            "peak_heating_w": round(float(q_h_w.max()), 3),
        },
        "comparison": {
            "delta_kwh": round(delta_kwh, 3),
            "relative_delta_percent": round(rel_pct, 3),
        },
    }
