from __future__ import annotations

from typing import Any

from .engine import design_heat_load_breakdown
from .pricing import estimate_energy_cost


def home_lab_live_payload(result: Any) -> dict[str, Any]:
    """Minimal projection for high-frequency Home Lab recalculation.

    RBPE physics remains complete. Keep this module intentionally independent
    from the heavy report/reference payload so the dedicated Pyodide isolate
    retains maximum memory headroom across repeated edits.
    """

    cost = estimate_energy_cost(result)
    climate = result.climate or {}
    selected = climate.get("selected_locality", {})
    design_load = design_heat_load_breakdown(
        result.input,
        result.transmission_components,
        result.h_ve_w_k,
        climate,
    )
    area = float(result.input.heated_floor_area_m2)

    return {
        "energy_class": result.energy_class,
        "final_energy_kwh": float(result.total_final_energy_kwh),
        "annual_heating_demand_kwh": float(result.annual_heating_demand_kwh),
        "annual_cooling_demand_kwh": float(result.annual_cooling_demand_kwh),
        "heating_demand_specific_kwh_m2": (
            float(result.annual_heating_demand_kwh) / area
        ),
        "cooling_demand_specific_kwh_m2": (
            float(result.annual_cooling_demand_kwh) / area
        ),
        "primary_specific_kwh_m2": float(result.primary_energy.specific_kwh_m2),
        "co2_kg": float(result.co2.total_kg),
        "co2_specific_kg_m2": float(result.co2.specific_kg_m2),
        "annual_cost_lei": (
            float(cost["priced_total_lei"]) if cost.get("complete") else None
        ),
        "average_monthly_cost_lei": (
            float(cost["average_monthly_priced_lei"])
            if cost.get("complete")
            else None
        ),
        "design_heat_load_kw": design_load.get("total_kw"),
        "locality": selected.get("display_name") or result.input.locality,
        "climate_station": climate.get("station") or "",
        "climate_zone": climate.get("climate_zone") or None,
        "winter_design_temperature_c": climate.get("winter_design_temperature_c"),
        "methodology_version": str(result.methodology_version),
    }
