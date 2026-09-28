from __future__ import annotations

from typing import Any

from .engine import design_heat_load_breakdown
from .methodology import methodology, resolve_locality
from .models import model_to_dict
from .pricing import estimate_energy_cost


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

    class_registry = method["energy_class_thresholds"][building_type]
    class_limits = [
        float(value)
        for value in class_registry["total_primary_kwh_m2"]
    ]
    class_labels = ["A+", "A", "B", "C", "D", "E", "F", "G"]
    class_intervals: list[dict[str, Any]] = []
    lower_limit: float | None = None
    for index, class_label in enumerate(class_labels):
        upper_limit = class_limits[index] if index < len(class_limits) else None
        class_intervals.append(
            {
                "class": class_label,
                "min_exclusive_kwh_m2": lower_limit,
                "max_inclusive_kwh_m2": upper_limit,
            }
        )
        lower_limit = upper_limit

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
        "annual_heating_demand_kwh": float(result.annual_heating_demand_kwh),
        "annual_cooling_demand_kwh": float(result.annual_cooling_demand_kwh),
        "heating_demand_specific_kwh_m2": (
            float(result.annual_heating_demand_kwh) / float(result.input.heated_floor_area_m2)
        ),
        "cooling_demand_specific_kwh_m2": (
            float(result.annual_cooling_demand_kwh) / float(result.input.heated_floor_area_m2)
        ),
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
        "pv_economics": cost.get("pv_economics") or {},
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
                "household_grid_import_kwh": float(row.get("household_grid_import_kwh", 0.0)),
                "household_electricity_cost_lei": float(row.get("household_electricity_cost_lei", 0.0)),
                "pv_exported_kwh": float(row.get("pv_exported_kwh", 0.0)),
                "pv_export_credit_lei": float(row.get("pv_export_credit_lei", 0.0)),
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
        "energy_class_reference": {
            "building_type": building_type,
            "indicator": "total_primary_energy",
            "unit": "kWh/(m²·an)",
            "source": class_registry.get("source"),
            "interval_semantics": "open_left_closed_right",
            "intervals": class_intervals,
        },
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
            "heating_system_type": "condensing_gas_boiler",
            "heating_system_label": "Centrală în condensare pe gaz",
            "geometry_policy": "same_geometry_locality_orientation_as_real_building",
            "thermal_bridges_policy": "zero_reference_thermal_bridges",
            "renewables_policy": "none_in_light_reference_building",
        },
        "price_references_current": bool(cost.get("price_references_current")),
        "price_retrieved_on": cost.get("retrieved_on"),
        "price_reference_rows": [
            {
                "carrier": str(row.get("carrier") or ""),
                "label": str(row.get("label") or ""),
                "final_kwh": float(row.get("final_kwh") or 0.0),
                "unit_price_lei_per_kwh": (
                    float(row["unit_price_lei_per_kwh"])
                    if row.get("unit_price_lei_per_kwh") is not None
                    else None
                ),
                "annual_cost_lei": (
                    float(row["annual_cost_lei"])
                    if row.get("annual_cost_lei") is not None
                    else None
                ),
                "price_status": str(row.get("price_status") or ""),
                "basis": row.get("basis"),
                "source_name": row.get("source_name"),
                "source_url": row.get("source_url"),
                "valid_from": row.get("valid_from"),
                "valid_until": row.get("valid_until"),
                "note": row.get("note"),
            }
            for row in cost.get("rows", [])
        ],
        "methodology_version": str(result.methodology_version),
        "methodology_scope": method.get("scope"),
        "methodology_source": method.get("monthly_method", {}).get("source"),
        "assumptions": list(result.assumptions or method.get("assumptions", [])),
    }


