from __future__ import annotations

from typing import Any

from .engine import _dhw_useful_for_days, dhw_energy, heating_system_performance
from .heating_optimization import (
    apply_heating_technology,
    heating_technologies,
)
from .methodology import methodology, resolve_monthly_plane_hsol
from .models import BuildingInput, model_to_dict
from .pricing import _reference_for


def _enum_value(value: Any) -> str:
    return str(getattr(value, "value", value))


def _price_payload(reference: dict[str, Any] | None) -> dict[str, Any] | None:
    if reference is None:
        return None
    keys = {
        "unit_price_lei_per_kwh",
        "delivery_cost_group",
        "delivery_cost_lei_per_batch",
        "delivery_batch_size_packages",
        "energy_kwh_per_package",
    }
    return {key: reference.get(key) for key in keys if reference.get(key) is not None}


def _branch_profile(
    baseline: BuildingInput,
    branch_id: str,
    branch_catalog: dict[str, Any],
    county: str | None,
) -> dict[str, Any]:
    if branch_id == "keep-current-heating":
        branch_building = baseline
        label = "Păstrează sistemul actual"
        planning_nodes: list[dict[str, Any]] = []
    else:
        technologies = heating_technologies(
            branch_catalog,
            include_parametric_nodes=False,
            technology_id=branch_id,
        )
        if not technologies:
            raise ValueError(f"V4 kernel: lipsește profilul tehnologiei {branch_id!r}.")
        technology = technologies[0]
        branch_building = apply_heating_technology(baseline, technology)
        label = technology.label
        planning_nodes = [
            dict(item)
            for item in (branch_catalog.get("parametric_heating_nodes") or [])
            if str(item.get("technology_id") or "") == branch_id
        ]

    probe_useful = 100_000.0
    heating, heating_performance = heating_system_performance(
        branch_building,
        probe_useful,
    )
    dhw = dhw_energy(branch_building, probe_useful)

    heating_ratio = (
        float(heating.final_kwh) / probe_useful
        if heating.carrier is not None
        else 0.0
    )
    dhw_ratio = (
        float(dhw.final_kwh) / probe_useful
        if dhw.carrier is not None
        else 0.0
    )

    carriers = {
        "electricity",
        _enum_value(heating.carrier) if heating.carrier is not None else "",
        _enum_value(dhw.carrier) if dhw.carrier is not None else "",
    }
    prices: dict[str, Any] = {}
    for carrier in sorted(value for value in carriers if value):
        cost_profile = (
            branch_building.heating.cost_profile
            if carrier == "biomass"
            else None
        )
        reference, note, _ = _reference_for(carrier, county, cost_profile)
        prices[carrier] = {
            "reference": _price_payload(reference),
            "unpriced_note": note,
        }

    return {
        "branch_id": branch_id,
        "label": label,
        "heating_carrier": (
            _enum_value(heating.carrier)
            if heating.carrier is not None
            else None
        ),
        "heating_final_per_useful": heating_ratio,
        "heating_auxiliary_kwh_year": float(
            heating_performance.auxiliary_electricity_kwh
        ),
        "dhw_carrier": (
            _enum_value(dhw.carrier)
            if dhw.carrier is not None
            else None
        ),
        "dhw_final_per_useful": dhw_ratio,
        "cooling_final_per_useful": (
            0.0
            if not branch_building.cooling.enabled
            else 1.0 / float(branch_building.cooling.seer or 1.0)
        ),
        "cooling_enabled": bool(branch_building.cooling.enabled),
        "cooling_setpoint_c": float(branch_building.cooling.setpoint_c),
        "planning_nodes": planning_nodes,
        "prices": prices,
        "catalog_mode": branch_catalog.get("catalog_mode"),
        "catalog_stats": branch_catalog.get("catalog_stats") or {},
    }


def build_teo_v4_kernel(
    baseline: BuildingInput,
    result: Any,
    *,
    cost_catalog: dict[str, Any],
    branch_catalogs: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Build a bounded browser-search kernel from one canonical baseline pass.

    The payload contains physical constants and compact technology curves, not
    commercial SKU lists. Thousands of search points can therefore be evaluated
    in a browser Web Worker while Python remains authoritative for finalists.
    """

    method = methodology()
    climate = result.climate or {}
    selected_locality = climate.get("selected_locality", {})
    county = selected_locality.get("county")

    envelope_rows: list[dict[str, Any]] = []
    for item, contribution in zip(
        baseline.envelope,
        result.envelope_contributions,
    ):
        ground = (
            model_to_dict(item.ground_contact)
            if item.ground_contact is not None
            else None
        )
        envelope_rows.append(
            {
                "type": item.type.value,
                "area_m2": float(item.area_m2),
                "u_value_w_m2k": float(item.u_value_w_m2k),
                "boundary_type": item.boundary_type.value,
                "component": (
                    contribution.component.value
                    if contribution.component is not None
                    else "Hd"
                ),
                "boundary_factor": float(
                    contribution.boundary_correction_factor
                    if contribution.boundary_correction_factor is not None
                    else 0.0
                ),
                "ground_contact": ground,
            }
        )

    bridge_rows = [
        {
            "component": item.component.value,
            "value_w_k": float(item.psi_w_mk) * float(item.length_m),
        }
        for item in baseline.thermal_bridges
    ]

    baseline_window_ua = sum(
        float(item.area_m2) * float(item.u_value_w_m2k)
        for item in baseline.envelope
        if item.type.value == "window"
    )
    solar = baseline.solar
    sky_coeff_common = 0.0
    if solar.mode != "explicit":
        sky_coeff_common = (
            0.001
            * float(solar.sky_view_factor)
            * float(solar.exterior_surface_resistance_m2k_w)
            * float(solar.longwave_radiation_coefficient_w_m2k)
            * float(solar.sky_temperature_difference_k)
        )

    climate_months = list(climate.get("monthly_temperatures") or [])
    result_months = list(result.monthly)
    monthly: list[dict[str, Any]] = []
    for index, row in enumerate(result_months):
        climate_row = climate_months[index]
        days = int(climate_row["days"])
        hours = float(days) * 24.0
        sky_coeff = sky_coeff_common * hours
        baseline_solar = float(row.solar_gains_kwh)
        monthly.append(
            {
                "month": str(row.month),
                "days": days,
                "outdoor_temperature_c": float(row.outdoor_temperature_c),
                "internal_gains_kwh": float(row.internal_gains_kwh),
                "gross_solar_gains_kwh": (
                    baseline_solar + sky_coeff * baseline_window_ua
                ),
                "sky_loss_kwh_per_window_ua": sky_coeff,
                # MonthlyRenewableBalance intentionally exposes renewable
                # production/use, not the pre-solar DHW useful load. Rebuild
                # that load from the same canonical engine helper instead of
                # depending on a transient field that is not in the public model.
                "dhw_useful_kwh": float(
                    _dhw_useful_for_days(baseline, days)
                ),
            }
        )

    pv = baseline.renewables.pv
    solar_thermal = baseline.renewables.solar_thermal
    renewable_cfg = method["renewables"]

    pv_plane = resolve_monthly_plane_hsol(
        climate,
        pv.orientation,
        pv.tilt_degrees,
    )
    thermal_plane = resolve_monthly_plane_hsol(
        climate,
        solar_thermal.orientation,
        solar_thermal.tilt_degrees,
    )

    monthly_cfg = method["monthly_method"]
    capacity_class = monthly_cfg["default_effective_internal_heat_capacity_class"]
    physical_mapping = method["reference_building"]["physical_mapping"]

    branches = [
        _branch_profile(
            baseline,
            branch_id,
            branch_catalog,
            county,
        )
        for branch_id, branch_catalog in branch_catalogs.items()
    ]

    return {
        "version": "teo-v4-browser-kernel-1",
        "area_m2": float(baseline.heated_floor_area_m2),
        "volume_m3": float(baseline.heated_volume_m3),
        "indoor_temperature_c": float(baseline.indoor_design_temperature_c),
        "annual_outdoor_temperature_c": float(result.annual_outdoor_temperature_c),
        "winter_design_temperature_c": climate.get("winter_design_temperature_c"),
        "envelope": envelope_rows,
        "thermal_bridges": bridge_rows,
        "geometry": model_to_dict(result.envelope_geometry),
        "ventilation": {
            "air_changes_per_hour": float(baseline.ventilation.air_changes_per_hour),
            "infiltration_air_changes_per_hour": float(
                baseline.ventilation.infiltration_air_changes_per_hour
            ),
            "heat_recovery_efficiency": float(
                baseline.ventilation.heat_recovery_efficiency
            ),
        },
        "monthly": monthly,
        "monthly_method": {
            "effective_internal_heat_capacity_j_m2k": float(
                monthly_cfg["effective_internal_heat_capacity_j_m2k"][capacity_class]
            ),
            "a_h0": float(monthly_cfg["a_h0"]),
            "a_c0": float(monthly_cfg["a_c0"]),
            "tau_h0_h": float(monthly_cfg["tau_h0_h"]),
            "tau_c0_h": float(monthly_cfg["tau_c0_h"]),
            "cooling_reduction_factor_continuous": float(
                monthly_cfg["cooling_reduction_factor_continuous"]
            ),
        },
        "renewables": {
            "pv_enabled": bool(pv.enabled),
            "pv_installed_kwp": float(pv.installed_power_kwp),
            "pv_performance_ratio": float(
                pv.performance_ratio
                if pv.performance_ratio is not None
                else renewable_cfg["photovoltaic"]["default_performance_ratio"]
            ),
            "pv_hsol_kwh_m2_month": (
                list(pv_plane["values_kwh_m2_month"])
                if pv_plane is not None
                else [0.0] * len(monthly)
            ),
            "solar_thermal_enabled": bool(solar_thermal.enabled),
            "solar_thermal_area_m2": float(solar_thermal.collector_area_m2),
            "solar_thermal_efficiency": float(
                solar_thermal.system_efficiency
                if solar_thermal.system_efficiency is not None
                else renewable_cfg["solar_thermal"]["default_system_efficiency"]
            ),
            "solar_thermal_hsol_kwh_m2_month": (
                list(thermal_plane["values_kwh_m2_month"])
                if thermal_plane is not None
                else [0.0] * len(monthly)
            ),
        },
        "normalization_lambda": {
            family: float(physical_mapping[family]["insulation_lambda_w_mk"])
            for family in ("wall", "roof", "floor")
        },
        "carrier_factors": method["carriers"],
        "energy_class_thresholds": method["energy_class_thresholds"][
            baseline.building_type.value
        ]["total_primary_kwh_m2"],
        "cost_catalog": cost_catalog,
        "branches": branches,
    }
