from __future__ import annotations

import json
import math
import os
from copy import deepcopy
from pathlib import Path

import pandas as pd
from fastapi.testclient import TestClient

import pybuildingenergy as pybui

from commercial.app.engine import calculate
from commercial.app.main import app, build_input_from_form, default_form_values
from commercial.app.methodology import methodology

OUT_DIR = Path(os.environ.get("VALIDATION_OUT", "validation-results"))
OUT_DIR.mkdir(parents=True, exist_ok=True)

PBE_COMMIT = "32ff8648312fc4cd0ac4e963464ee956a7c47d2d"
CLJ_LAT = 46.7712
CLJ_LON = 23.6236
AREA_M2 = 160.0

BASE_GEOMETRY = {
    "building_length_m": "10",
    "building_width_m": "8",
    "heated_levels": "2",
    "average_height_m": "2.7",
    "heated_floor_area_m2": "160",
    "heated_volume_m3": "432",
    "wall_area_m2": "172.2",
    "roof_area_m2": "80",
    "floor_area_m2": "80",
    "window_area_m2": "20",
    "door_area_m2": "2.2",
    "thermal_bridge_length_m": "72",
    "thermal_bridge_psi_w_mk": "0.08",
}


def pct_delta(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or abs(float(a)) < 1e-12:
        return None
    return 100.0 * (float(b) - float(a)) / abs(float(a))


def rel_diff(reference: float | None, candidate: float | None) -> float | None:
    if reference is None or candidate is None or abs(float(reference)) < 1e-12:
        return None
    return 100.0 * (float(candidate) - float(reference)) / abs(float(reference))


def fmt(value: float | None, digits: int = 1) -> str:
    if value is None or not math.isfinite(float(value)):
        return "—"
    return f"{float(value):,.{digits}f}".replace(",", " ")


def ui_form(
    *,
    name: str,
    wall_u: float,
    roof_u: float,
    floor_u: float,
    window_u: float,
    door_u: float,
    recovery: float,
    heating: str,
    pv_kwp: float = 0.0,
    solar_thermal_m2: float = 0.0,
) -> dict[str, str]:
    f = {k: str(v) if v is not None else "" for k, v in default_form_values().items()}
    f.update(
        {
            "project_name": name,
            "locality_id": "siruta-54984",
            "locality": "Cluj-Napoca",
            "building_type": "residential_individual",
            "construction_year": "2004",
            "indoor_design_temperature_c": "20",
            "expert_geometry_override": "on",
            "expert_envelope_override": "on",
            "expert_ventilation_override": "on",
            "expert_heating_override": "",
            "expert_dhw_override": "on",
            "wall_u_value": str(wall_u),
            "roof_u_value": str(roof_u),
            "floor_u_value": str(floor_u),
            "window_u_value": str(window_u),
            "door_u_value": str(door_u),
            "air_changes_per_hour": "0.5",
            "heat_recovery_efficiency": str(recovery),
            "solar_mode": "normative_hsol",
            "solar_orientation": "south",
            "solar_glazing_type_id": "triple_low_e_faces_2_and_5" if window_u <= 1.11 else "double_low_e_face_3",
            "solar_frame_fraction": "0.20",
            "solar_obstacle_shading_factor": "1.0",
            "solar_sky_view_factor": "0.5",
            "cooling_enabled": "",
            "dhw_enabled": "on",
            "dhw_occupants": "4",
            "dhw_litres_per_person_day_at_60c": "50",
            "dhw_efficiency": "0.86",
            "pv_enabled": "on" if pv_kwp > 0 else "",
            "pv_installed_power_kwp": str(pv_kwp or 5.0),
            "pv_orientation": "south",
            "pv_tilt_degrees": "30",
            "pv_performance_ratio": "0.82",
            "solar_thermal_enabled": "on" if solar_thermal_m2 > 0 else "",
            "solar_thermal_collector_area_m2": str(solar_thermal_m2 or 4.0),
            "solar_thermal_orientation": "south",
            "solar_thermal_tilt_degrees": "45",
            "solar_thermal_system_efficiency": "0.45",
        }
    )
    f.update(BASE_GEOMETRY)
    if heating == "gas":
        f.update(
            {
                "heating_choice": "condensing_gas_boiler",
                "heating_chain_enabled": "on",
                "heating_system_type": "condensing_gas_boiler",
                "heating_carrier": "natural_gas",
                "heating_generator_type": "condensing_gas_boiler",
                "heating_emitter_type": "radiators_high_temp",
                "heating_distribution_type": "hydronic_insulated",
                "heating_storage_type": "none",
                "heating_control_type": "room_thermostat",
            }
        )
        f["dhw_carrier"] = "natural_gas"
    elif heating == "hp":
        f.update(
            {
                "heating_choice": "heat_pump",
                "heating_chain_enabled": "on",
                "heating_system_type": "heat_pump",
                "heating_carrier": "electricity",
                "heating_generator_type": "heat_pump_air_water",
                "heating_emitter_type": "radiators_low_temp",
                "heating_distribution_type": "hydronic_insulated",
                "heating_storage_type": "none",
                "heating_control_type": "zoned",
            }
        )
        f["dhw_carrier"] = "electricity"
    else:
        raise ValueError(heating)
    return f


VERTICALS = [
    {
        "id": "V1",
        "label": "Casa existentă · gaz",
        "form": ui_form(
            name="V1 Existing gas",
            wall_u=0.50,
            roof_u=0.30,
            floor_u=0.45,
            window_u=1.60,
            door_u=1.80,
            recovery=0.0,
            heating="gas",
        ),
    },
    {
        "id": "V2",
        "label": "Anvelopă renovată · gaz",
        "form": ui_form(
            name="V2 Envelope gas",
            wall_u=0.25,
            roof_u=0.15,
            floor_u=0.20,
            window_u=1.11,
            door_u=1.30,
            recovery=0.0,
            heating="gas",
        ),
    },
    {
        "id": "V3",
        "label": "Anvelopă + HRV · gaz",
        "form": ui_form(
            name="V3 Envelope HRV gas",
            wall_u=0.25,
            roof_u=0.15,
            floor_u=0.20,
            window_u=1.11,
            door_u=1.30,
            recovery=0.80,
            heating="gas",
        ),
    },
    {
        "id": "V4",
        "label": "Anvelopă + HRV + pompă de căldură",
        "form": ui_form(
            name="V4 Envelope HRV HP",
            wall_u=0.25,
            roof_u=0.15,
            floor_u=0.20,
            window_u=1.11,
            door_u=1.30,
            recovery=0.80,
            heating="hp",
        ),
    },
    {
        "id": "V5",
        "label": "Pompă de căldură + PV 5 kWp + solar termic 4 m²",
        "form": ui_form(
            name="V5 HP PV solar",
            wall_u=0.25,
            roof_u=0.15,
            floor_u=0.20,
            window_u=1.11,
            door_u=1.30,
            recovery=0.80,
            heating="hp",
            pv_kwp=5.0,
            solar_thermal_m2=4.0,
        ),
    },
]


def pbe_surface(
    name: str,
    stype: str,
    area: float,
    u: float,
    azimuth: float,
    tilt: float,
    sky: float,
    *,
    g_value: float = 0.0,
    capacity: float = 1_416_240.0,
) -> dict:
    row = {
        "name": name,
        "type": stype,
        "area": float(area),
        "sky_view_factor": float(sky),
        "u_value": float(u),
        "solar_absorptance": 0.55 if stype == "opaque" else 0.0,
        "thermal_capacity": float(capacity if stype == "opaque" else 0.0),
        "orientation": {"azimuth": float(azimuth), "tilt": float(tilt)},
        "name_adj_zone": None,
    }
    if stype == "transparent":
        row.update(
            {
                "g_value": float(g_value),
                "height": 1.5,
                "width": max(float(area) / 1.5, 0.1),
                "parapet": 0.9,
                "shading": False,
                "shading_type": "horizontal_overhang",
                "width_or_distance_of_shading_elements": 0.0,
                "overhang_proprieties": {"width_of_horizontal_overhangs": 0.0},
            }
        )
    return row


def pbe_bui(light_result, building_input) -> dict:
    by_type = {item.type.value: item for item in building_input.envelope}
    wall = by_type["exterior_wall"]
    roof = by_type["roof"]
    floor = by_type["floor"]
    window = by_type["window"]
    door = by_type["exterior_door"]
    htb = sum(float(item.length_m) * float(item.psi_w_mk) for item in building_input.thermal_bridges)
    # Light uses g_gl = 0.9*g_gl,n and then applies the 20% frame fraction separately.
    glazing_table = methodology()["solar"]["glazing_table_2_13_ggl_n"]
    g_gl_n = float(glazing_table[building_input.solar.glazing_type_id])
    effective_window_g = 0.9 * g_gl_n * (1.0 - float(building_input.solar.frame_fraction))
    wall_quarter = float(wall.area_m2) / 4.0
    ones = [1.0] * 24
    zeros = [0.0] * 24
    return {
        "building": {
            "name": building_input.project_name,
            "azimuth_relative_to_true_north": 0.0,
            "latitude": CLJ_LAT,
            "longitude": CLJ_LON,
            "exposed_perimeter": 36.0,
            "height": 5.4,
            "wall_thickness": 0.30,
            "n_floors": 2,
            "building_type_class": "Residential_apartment",
            "adj_zones_present": False,
            "number_adj_zone": 0,
            "net_floor_area": float(building_input.heated_floor_area_m2),
            "construction_class": "class_i",
            "country": "Romania",
        },
        "adjacent_zones": [],
        "building_surface": [
            pbe_surface("Roof", "opaque", roof.area_m2, roof.u_value_w_m2k, 0, 0, 1.0, capacity=741_500.0),
            pbe_surface("Wall N", "opaque", wall_quarter, wall.u_value_w_m2k, 0, 90, 0.5),
            pbe_surface("Wall E", "opaque", wall_quarter, wall.u_value_w_m2k, 90, 90, 0.5),
            pbe_surface("Wall S", "opaque", wall_quarter, wall.u_value_w_m2k, 180, 90, 0.5),
            pbe_surface("Wall W", "opaque", wall_quarter, wall.u_value_w_m2k, 270, 90, 0.5),
            pbe_surface("Floor", "opaque", floor.area_m2, floor.u_value_w_m2k, 0, 0, 0.0, capacity=405_801.0),
            pbe_surface("Door S", "opaque", door.area_m2, door.u_value_w_m2k, 180, 90, 0.5, capacity=150_000.0),
            pbe_surface("Windows S", "transparent", window.area_m2, window.u_value_w_m2k, 180, 90, 0.5, g_value=effective_window_g),
        ],
        "units": {
            "area": "m²",
            "u_value": "W/m²K",
            "thermal_capacity": "J/K",
            "azimuth": "degrees",
            "tilt": "degrees",
            "internal_gain": "W/m²",
            "internal_gain_profile": "0-1",
            "HVAC_profile": "0-1",
        },
        "building_parameters": {
            "temperature_setpoints": {
                "heating_setpoint": float(building_input.indoor_design_temperature_c),
                "heating_setback": float(building_input.indoor_design_temperature_c),
                "cooling_setpoint": 26.0,
                "cooling_setback": 30.0,
                "units": "°C",
            },
            "system_capacities": {
                "heating_capacity": 10_000_000.0,
                "cooling_capacity": 10_000_000.0,
                "units": "W",
            },
            "airflow_rates": {"infiltration_rate": 0.0, "units": "ACH"},
            "ventilation": {
                "ventilation_type": "custom",
                "flow_rate_per_person": 0.0,
                "custom_heat_transfer_coefficient_ventilation": float(light_result.h_ve_w_k),
                "units": "W/K",
            },
            "internal_gains": [
                {"name": "occupants", "full_load": 2.4, "weekday": ones, "weekend": ones},
                {"name": "appliances", "full_load": 0.0, "weekday": zeros, "weekend": zeros},
                {"name": "lighting", "full_load": 0.0, "weekday": zeros, "weekend": zeros},
            ],
            "construction": {
                "wall_thickness": 0.30,
                "thermal_bridge_heat_W_K": float(htb),
                "thermal_bridges": float(htb),
                "units": "m and W/K",
            },
            "climate_parameters": {"coldest_month": 1, "units": "1-12"},
            "heating_profile": {"weekday": ones, "weekend": ones},
            "cooling_profile": {"weekday": zeros, "weekend": zeros},
            "ventilation_profile": {"weekday": ones, "weekend": ones},
        },
    }


def pbe_iso_run(bui: dict) -> tuple[pd.DataFrame, dict]:
    checked, issues = pybui.sanitize_and_validate_BUI(bui, fix=True)
    errors = [item for item in issues if item.get("level") == "ERROR"]
    if errors:
        raise RuntimeError(f"PBE BUI validation errors: {errors}")
    hourly, annual = pybui.ISO52016.Temperature_and_Energy_needs_calculation(
        checked,
        nrHCmodes=0,
        weather_source="pvgis",
    )
    row = annual.iloc[0].to_dict()
    return hourly, {
        "heating_useful_kwh": float(row["Q_H_annual"]) / 1000.0,
        "heating_specific_kwh_m2": float(row["Q_H_annual_per_sqm"]) / 1000.0,
        "cooling_useful_kwh": float(row.get("Q_C_annual", 0.0)) / 1000.0,
        "validation_issues": issues,
    }


def pbe_generator_run(light_result, hourly: pd.DataFrame, heating_choice: str) -> dict:
    useful = hourly["Q_H"].clip(lower=0.0) / 1000.0
    hs = light_result.heating_system
    upstream_eff = (
        float(hs.emission_efficiency)
        * float(hs.distribution_efficiency)
        * float(hs.storage_efficiency)
        * float(hs.control_efficiency)
    )
    upstream_eff = max(upstream_eff, 1e-9)
    loads_native = pd.DataFrame({"T_ext": hourly["T_ext"], "Q_H_kWh": useful}, index=hourly.index)
    loads_aligned = loads_native.copy()
    loads_aligned["Q_H_kWh"] = useful / upstream_eff

    if heating_choice == "gas":
        eta = float(hs.generator_performance)
        cfg = {
            "demand_unit": "kWh",
            "fuel": "natural_gas",
            "nominal_power_kW": 40.0,
            "full_load_efficiency": eta,
            "part_load_efficiency": eta,
            "efficiency_min": eta,
            "efficiency_max": eta,
            "return_temperature_efficiency_slope_per_K": 0.0,
            "standby_loss_kWh_per_h": 0.0,
            "auxiliary_power_kW": 0.0,
            "standby_auxiliary_power_kW": 0.0,
            "condensing": True,
            "dhw_enabled": False,
        }
        native = pybui.CombustionBoilerSystemCalculator(cfg).run_timeseries(loads_native)
        aligned = pybui.CombustionBoilerSystemCalculator(cfg).run_timeseries(loads_aligned)
        native_final = float(native.summary["EHW_fuel_in_kWh"])
        aligned_final = float(aligned.summary["EHW_fuel_in_kWh"])
        return {
            "carrier": "natural_gas",
            "generator_performance": eta,
            "upstream_efficiency": upstream_eff,
            "generator_only_final_kwh": native_final,
            "aligned_chain_final_kwh": aligned_final,
            "generator_summary": aligned.summary,
        }

    cop = float(hs.generator_performance)
    hp_map = pd.DataFrame(
        [
            {"source_temperature_C": source, "sink_temperature_C": sink, "capacity_kW": 40.0, "cop": cop}
            for source in (-20.0, -7.0, 2.0, 7.0, 15.0, 25.0)
            for sink in (35.0, 45.0, 55.0)
        ]
    )
    cfg = {
        "demand_unit": "kWh",
        "source_type": "air",
        "heating_performance_map": hp_map,
        "dhw_performance_map": hp_map,
        "heating_enabled": True,
        "cooling_enabled": False,
        "dhw_enabled": False,
        "hp_operating_limit_C": 60.0,
        "external_auxiliary_power_W": 0.0,
        "standby_power_W": 0.0,
        "heating_storage_loss_kWh_per_day": 0.0,
        "dhw_storage_loss_kWh_per_day": 0.0,
    }
    native = pybui.HeatPumpSystemCalculator(cfg).run_timeseries(loads_native)
    aligned = pybui.HeatPumpSystemCalculator(cfg).run_timeseries(loads_aligned)
    return {
        "carrier": "electricity",
        "generator_performance": cop,
        "upstream_efficiency": upstream_eff,
        "generator_only_final_kwh": float(native.summary["E_total_electricity_kWh"]),
        "aligned_chain_final_kwh": float(aligned.summary["E_total_electricity_kWh"]),
        "generator_summary": aligned.summary,
    }


def normalized_primary_co2(main_kwh: float, aux_el_kwh: float, carrier: str) -> dict:
    carriers = methodology()["carriers"]
    main = carriers[carrier]
    electricity = carriers["electricity"]
    primary = main_kwh * float(main["primary_energy_factor"]) + aux_el_kwh * float(electricity["primary_energy_factor"])
    co2 = main_kwh * float(main["co2_kg_per_kwh_final"]) + aux_el_kwh * float(electricity["co2_kg_per_kwh_final"])
    return {
        "primary_kwh": primary,
        "primary_specific_kwh_m2": primary / AREA_M2,
        "co2_kg": co2,
        "co2_specific_kg_m2": co2 / AREA_M2,
    }


def main() -> None:
    client = TestClient(app)
    rows = []
    demand_cache: dict[str, tuple[pd.DataFrame, dict]] = {}

    for vertical in VERTICALS:
        form = vertical["form"]
        response = client.post("/api/home-lab-next/calculate", data=form)
        if response.status_code != 200:
            raise RuntimeError(f'{vertical["id"]} user endpoint failed: {response.status_code} {response.text[:500]}')
        endpoint_payload = response.json()

        building = build_input_from_form(form)
        light = calculate(building)
        demand_key = json.dumps(
            {
                "envelope": [(x.type.value, x.area_m2, x.u_value_w_m2k) for x in building.envelope],
                "hve": light.h_ve_w_k,
                "solar_glazing": building.solar.glazing_type_id,
            },
            sort_keys=True,
        )
        if demand_key not in demand_cache:
            bui = pbe_bui(light, building)
            demand_cache[demand_key] = pbe_iso_run(bui)
        hourly, pbe_demand = demand_cache[demand_key]

        heating_choice = "hp" if form["heating_choice"] == "heat_pump" else "gas"
        pbe_system = pbe_generator_run(light, hourly, heating_choice)

        light_main = float(light.heating_system.main_carrier_final_kwh)
        light_aux = float(light.heating_system.auxiliary_electricity_kwh)
        pbe_main = float(pbe_system["aligned_chain_final_kwh"])
        light_norm = normalized_primary_co2(light_main, light_aux, pbe_system["carrier"])
        pbe_norm = normalized_primary_co2(pbe_main, 0.0, pbe_system["carrier"])

        pv = light.renewables.pv
        solar = light.renewables.solar_thermal
        row = {
            "id": vertical["id"],
            "label": vertical["label"],
            "endpoint_status": response.status_code,
            "climate": {
                "lacurent": "MC001/6-2013 Cluj-Napoca monthly normative station",
                "pbe": "PVGIS hourly weather at 46.7712, 23.6236",
            },
            "inputs": {
                "wall_u": next(x.u_value_w_m2k for x in building.envelope if x.type.value == "exterior_wall"),
                "roof_u": next(x.u_value_w_m2k for x in building.envelope if x.type.value == "roof"),
                "floor_u": next(x.u_value_w_m2k for x in building.envelope if x.type.value == "floor"),
                "window_u": next(x.u_value_w_m2k for x in building.envelope if x.type.value == "window"),
                "door_u": next(x.u_value_w_m2k for x in building.envelope if x.type.value == "exterior_door"),
                "ach": building.ventilation.air_changes_per_hour,
                "heat_recovery": building.ventilation.heat_recovery_efficiency,
                "heating_choice": form["heating_choice"],
                "pv_kwp": float(form["pv_installed_power_kwp"]) if form.get("pv_enabled") == "on" else 0.0,
                "solar_thermal_m2": float(form["solar_thermal_collector_area_m2"]) if form.get("solar_thermal_enabled") == "on" else 0.0,
            },
            "lacurent": {
                "h_tr_w_k": float(light.h_tr_w_k),
                "h_ve_w_k": float(light.h_ve_w_k),
                "heating_useful_kwh": float(light.annual_heating_demand_kwh),
                "heating_specific_kwh_m2": float(light.annual_heating_demand_kwh) / AREA_M2,
                "heating_main_final_kwh": light_main,
                "heating_aux_electricity_kwh": light_aux,
                "heating_effective_performance": float(light.heating_system.effective_system_performance),
                "heating_generator_performance": float(light.heating_system.generator_performance),
                "primary_specific_total_kwh_m2": float(light.primary_energy.specific_kwh_m2),
                "co2_specific_total_kg_m2": float(light.co2.specific_kg_m2),
                "heating_normalized": light_norm,
                "annual_cost_lei": float(endpoint_payload["annual_cost_lei"]) if endpoint_payload.get("annual_cost_lei") is not None else None,
                "energy_class": light.energy_class,
                "pv_generation_kwh": float(pv.annual_generation_kwh),
                "pv_self_consumed_kwh": float(pv.self_consumed_kwh),
                "pv_exported_kwh": float(pv.exported_kwh),
                "solar_thermal_used_dhw_kwh": float(solar.used_for_dhw_kwh),
            },
            "pbe": {
                **pbe_demand,
                **pbe_system,
                "heating_normalized": pbe_norm,
                "version": getattr(pybui, "__version__", "unknown"),
                "commit": PBE_COMMIT,
            },
        }
        row["differences"] = {
            "heating_useful_pct": rel_diff(row["lacurent"]["heating_useful_kwh"], row["pbe"]["heating_useful_kwh"]),
            "heating_main_final_aligned_pct": rel_diff(row["lacurent"]["heating_main_final_kwh"], row["pbe"]["aligned_chain_final_kwh"]),
            "heating_main_final_generator_only_pct": rel_diff(row["lacurent"]["heating_main_final_kwh"], row["pbe"]["generator_only_final_kwh"]),
            "heating_primary_aligned_pct": rel_diff(
                row["lacurent"]["heating_normalized"]["primary_kwh"],
                row["pbe"]["heating_normalized"]["primary_kwh"],
            ),
            "heating_co2_aligned_pct": rel_diff(
                row["lacurent"]["heating_normalized"]["co2_kg"],
                row["pbe"]["heating_normalized"]["co2_kg"],
            ),
        }
        rows.append(row)

    for index, row in enumerate(rows):
        previous = rows[index - 1] if index else None
        row["step_effect"] = {
            "lacurent_heating_useful_pct": pct_delta(previous["lacurent"]["heating_useful_kwh"], row["lacurent"]["heating_useful_kwh"]) if previous else None,
            "pbe_heating_useful_pct": pct_delta(previous["pbe"]["heating_useful_kwh"], row["pbe"]["heating_useful_kwh"]) if previous else None,
            "lacurent_heating_main_final_pct": pct_delta(previous["lacurent"]["heating_main_final_kwh"], row["lacurent"]["heating_main_final_kwh"]) if previous else None,
            "pbe_heating_main_final_aligned_pct": pct_delta(previous["pbe"]["aligned_chain_final_kwh"], row["pbe"]["aligned_chain_final_kwh"]) if previous else None,
        }

    payload = {
        "meta": {
            "lacurent_branch_source": "codex/commercial-v2-cloudflare-python",
            "lacurent_source_sha": "e8d5c00e01f68acb72f66e255168710caeb18e47",
            "analysis_branch": "analysis/pbe-vertical-validation-20260920",
            "production_touched": False,
            "pbe_commit": PBE_COMMIT,
            "pbe_version": getattr(pybui, "__version__", "unknown"),
            "comparison_note": "PBE uses PVGIS hourly weather and EN ISO 52016/EN 15316. LaCurent Light uses MC001 monthly climate/method. System aligned comparison holds LaCurent upstream efficiencies constant and substitutes PBE useful demand.",
        },
        "verticals": rows,
    }
    (OUT_DIR / "results.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

    report = []
    report.append("# LaCurent Light vs PyBuildingEnergy — vertical validation")
    report.append("")
    report.append(f"- LaCurent source SHA: \`{payload['meta']['lacurent_source_sha']}\`")
    report.append(f"- PyBuildingEnergy commit: \`{PBE_COMMIT}\` · reported version \`{payload['meta']['pbe_version']}\`")
    report.append("- Production touched: **no**")
    report.append("- LaCurent weather/method: MC001 monthly normative climate; PBE: PVGIS hourly + EN ISO 52016.")
    report.append("")
    report.append("## Result summary")
    report.append("")
    report.append("| Vertical | Light useful heat kWh | PBE useful heat kWh | Δ PBE vs Light | Light main final kWh | PBE aligned final kWh | Δ aligned |")
    report.append("|---|---:|---:|---:|---:|---:|---:|")
    for row in rows:
        d = row["differences"]
        report.append(
            f"| {row['id']} {row['label']} | {fmt(row['lacurent']['heating_useful_kwh'])} | {fmt(row['pbe']['heating_useful_kwh'])} | "
            f"{fmt(d['heating_useful_pct'])}% | {fmt(row['lacurent']['heating_main_final_kwh'])} | {fmt(row['pbe']['aligned_chain_final_kwh'])} | "
            f"{fmt(d['heating_main_final_aligned_pct'])}% |"
        )
    report.append("")
    report.append("## Incremental intervention effect")
    report.append("")
    report.append("| Step | Light useful-heat change | PBE useful-heat change | Light main-final change | PBE aligned main-final change |")
    report.append("|---|---:|---:|---:|---:|")
    for row in rows[1:]:
        s = row["step_effect"]
        report.append(
            f"| {row['id']} | {fmt(s['lacurent_heating_useful_pct'])}% | {fmt(s['pbe_heating_useful_pct'])}% | "
            f"{fmt(s['lacurent_heating_main_final_pct'])}% | {fmt(s['pbe_heating_main_final_aligned_pct'])}% |"
        )
    report.append("")
    report.append("## Renewable outputs reported by LaCurent")
    report.append("")
    report.append("| Vertical | PV generation | PV self-consumed | PV export | Solar thermal to DHW |")
    report.append("|---|---:|---:|---:|---:|")
    for row in rows:
        l = row["lacurent"]
        report.append(
            f"| {row['id']} | {fmt(l['pv_generation_kwh'])} kWh | {fmt(l['pv_self_consumed_kwh'])} kWh | "
            f"{fmt(l['pv_exported_kwh'])} kWh | {fmt(l['solar_thermal_used_dhw_kwh'])} kWh |"
        )
    report.append("")
    report.append("## Interpretation guardrails")
    report.append("")
    report.append("- **Directly comparable:** envelope Htr inputs, effective Hve boundary, annual useful space-heating demand.")
    report.append("- **Aligned comparison:** heating main-carrier final energy. PBE uses its generator module, but the upstream emission/distribution/storage/control efficiencies are held equal to LaCurent to isolate the demand-model difference.")
    report.append("- **Not an independent normative cross-check:** total primary energy, total CO2, cost, PV and solar thermal. LaCurent uses Romanian MC001 factors/prices/solar datasets; PBE is standards-aware but not Romania-national-annex-specific without additional configuration.")
    report.append("- PBE hourly thermal mass and PVGIS weather differ materially from LaCurent Light's monthly quasi-steady MC001 balance, so a non-zero useful-demand delta is expected even when U-values, Hve and thermal bridges are aligned.")
    report.append("- A fully native PBE EN 15316 emission/distribution comparison requires pipe lengths, pump data, emitter/control parameters and other inputs that Home Lab does not currently ask the user for. This run does not invent them.")
    report.append("")
    (OUT_DIR / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
