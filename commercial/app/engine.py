from __future__ import annotations

from collections import defaultdict

from .methodology import carrier_factors, default_heating_performance, methodology, resolve_climate
from .models import (
    BuildingInput,
    CalculationResult,
    Carrier,
    ComparisonResult,
    Contribution,
    Co2Result,
    EnergyServiceResult,
    HeatingSystemType,
    IndicatorResult,
)


def _round(value: float, digits: int = 3) -> float:
    return round(float(value), digits)


def transmission_heat_transfer(building: BuildingInput) -> tuple[float, list[Contribution], list[Contribution]]:
    """MC001-compatible direct term: Htr = sum(Ui * Ai) + sum(psi_j * L_j). Units: W/K."""

    element_terms = [
        (item.name, item.type.value, item.u_value_w_m2k * item.area_m2)
        for item in building.envelope
    ]
    bridge_terms = [
        (item.name, "thermal_bridge", item.psi_w_mk * item.length_m)
        for item in building.thermal_bridges
    ]
    total = sum(value for _, _, value in [*element_terms, *bridge_terms])

    def contributions(rows: list[tuple[str, str, float]]) -> list[Contribution]:
        return [
            Contribution(
                name=name,
                type=kind,
                value=_round(value),
                unit="W/K",
                percent=_round(100 * value / total if total else 0, 1),
            )
            for name, kind, value in rows
        ]

    return _round(total), contributions(element_terms), contributions(bridge_terms)


def ventilation_heat_transfer(building: BuildingInput) -> float:
    """MC001 Hve helper: Hve = 0.34 * qv_m3h * (1 - eta_hr). Units: W/K."""

    airflow_m3h = building.ventilation.air_changes_per_hour * building.heated_volume_m3
    recovery_factor = 1 - building.ventilation.heat_recovery_efficiency
    return _round(0.34 * airflow_m3h * recovery_factor)


def monthly_energy_balance(building: BuildingInput, h_tr_w_k: float, h_ve_w_k: float) -> list[dict]:
    data = methodology()
    climate = resolve_climate(building.locality)
    internal_gain_w_m2 = (
        building.internal_gains_w_m2
        if building.internal_gains_w_m2 is not None
        else data["internal_gains_w_m2"][building.building_type.value]
    )
    monthly = []
    total_h = h_tr_w_k + h_ve_w_k

    for month in climate["monthly_temperatures"]:
        days = month["days"]
        hours = days * 24
        outdoor = month["temperature_c"]
        heating_delta = max(building.indoor_design_temperature_c - outdoor, 0)
        heat_loss = total_h * heating_delta * hours / 1000
        internal_gains = internal_gain_w_m2 * building.heated_floor_area_m2 * hours / 1000
        solar_gains = building.solar_gains_kwh_m2_month * building.heated_floor_area_m2
        useful_heating = max(heat_loss - internal_gains - solar_gains, 0)

        useful_cooling = 0.0
        if building.cooling.enabled:
            cooling_delta = max(outdoor - building.cooling.setpoint_c, 0)
            envelope_cooling = total_h * cooling_delta * hours / 1000
            if outdoor >= data["cooling_balance_temperature_c"]:
                useful_cooling = max(envelope_cooling + internal_gains + solar_gains, 0)

        monthly.append({
            "month": month["id"],
            "days": days,
            "outdoor_temperature_c": outdoor,
            "heat_loss_kwh": _round(heat_loss),
            "internal_gains_kwh": _round(internal_gains),
            "solar_gains_kwh": _round(solar_gains),
            "useful_heating_kwh": _round(useful_heating),
            "useful_cooling_kwh": _round(useful_cooling),
        })

    return monthly


def heating_final_energy(building: BuildingInput, useful_kwh: float) -> EnergyServiceResult:
    heating = building.heating
    defaults = default_heating_performance(heating.system_type.value)

    if heating.system_type == HeatingSystemType.heat_pump:
        final = useful_kwh / (heating.scop or defaults["scop"])
        return EnergyServiceResult(useful_kwh=_round(useful_kwh), final_kwh=_round(final), carrier=Carrier.electricity)

    efficiency = heating.efficiency or defaults["efficiency"]
    carrier = heating.carrier
    if heating.system_type == HeatingSystemType.electric_resistance:
        carrier = Carrier.electricity
    elif heating.system_type == HeatingSystemType.district_heat:
        carrier = Carrier.district_heat
    elif heating.system_type in {HeatingSystemType.gas_boiler, HeatingSystemType.condensing_gas_boiler}:
        carrier = Carrier.natural_gas

    return EnergyServiceResult(
        useful_kwh=_round(useful_kwh),
        final_kwh=_round(useful_kwh / efficiency),
        carrier=carrier,
    )


def cooling_final_energy(building: BuildingInput, useful_kwh: float) -> EnergyServiceResult:
    if not building.cooling.enabled:
        return EnergyServiceResult(useful_kwh=0, final_kwh=0, carrier=None)
    return EnergyServiceResult(
        useful_kwh=_round(useful_kwh),
        final_kwh=_round(useful_kwh / (building.cooling.seer or 1)),
        carrier=Carrier.electricity,
    )


def dhw_energy(building: BuildingInput) -> EnergyServiceResult:
    if not building.dhw.enabled:
        return EnergyServiceResult(useful_kwh=0, final_kwh=0, carrier=None)

    data = methodology()
    litres = (
        building.dhw.litres_per_person_day_at_60c
        if building.dhw.litres_per_person_day_at_60c is not None
        else data["dhw"]["litres_per_person_day_at_60c"]
    )
    useful = (
        building.dhw.occupants
        * litres
        * 365
        * data["dhw"]["kwh_per_litre_10_to_60c"]
    )
    return EnergyServiceResult(
        useful_kwh=_round(useful),
        final_kwh=_round(useful / building.dhw.efficiency),
        carrier=building.dhw.carrier,
    )


def final_energy_by_service(heating: EnergyServiceResult, cooling: EnergyServiceResult, dhw: EnergyServiceResult) -> dict[str, float]:
    return {
        "heating": heating.final_kwh,
        "cooling": cooling.final_kwh,
        "dhw": dhw.final_kwh,
    }


def final_energy_by_carrier(*services: EnergyServiceResult) -> dict[str, float]:
    totals: dict[str, float] = defaultdict(float)
    for service in services:
        if service.carrier and service.final_kwh:
            totals[service.carrier.value] += service.final_kwh
    return {carrier: _round(value) for carrier, value in totals.items()}


def primary_energy(carrier_totals: dict[str, float], area_m2: float) -> IndicatorResult:
    total = sum(value * carrier_factors(carrier)["primary_energy_factor"] for carrier, value in carrier_totals.items())
    return IndicatorResult(total_kwh=_round(total), specific_kwh_m2=_round(total / area_m2, 2))


def co2_emissions(carrier_totals: dict[str, float], area_m2: float) -> Co2Result:
    total = sum(value * carrier_factors(carrier)["co2_kg_per_kwh_final"] for carrier, value in carrier_totals.items())
    return Co2Result(total_kg=_round(total), specific_kg_m2=_round(total / area_m2, 2))


def classify_energy(building: BuildingInput, specific_primary_kwh_m2: float) -> str:
    thresholds = methodology()["energy_class_thresholds"][building.building_type.value]["total_primary_kwh_m2"]
    labels = ["A+", "A", "B", "C", "D", "E", "F"]
    for label, limit in zip(labels, thresholds):
        if specific_primary_kwh_m2 <= limit:
            return label
    return "G"


def calculate(building: BuildingInput, *, include_reference: bool = True) -> CalculationResult:
    h_tr, envelope_contributions, bridge_contributions = transmission_heat_transfer(building)
    h_ve = ventilation_heat_transfer(building)
    monthly = monthly_energy_balance(building, h_tr, h_ve)
    annual_heating = sum(row["useful_heating_kwh"] for row in monthly)
    annual_cooling = sum(row["useful_cooling_kwh"] for row in monthly)

    heating = heating_final_energy(building, annual_heating)
    cooling = cooling_final_energy(building, annual_cooling)
    dhw = dhw_energy(building)
    by_service = final_energy_by_service(heating, cooling, dhw)
    by_carrier = final_energy_by_carrier(heating, cooling, dhw)
    primary = primary_energy(by_carrier, building.heated_floor_area_m2)
    co2 = co2_emissions(by_carrier, building.heated_floor_area_m2)
    energy_class = classify_energy(building, primary.specific_kwh_m2)

    comparison = None
    if include_reference:
        from .reference import build_reference_input

        reference_result = calculate(build_reference_input(building), include_reference=False)
        reference_specific = reference_result.primary_energy.specific_kwh_m2
        diff = primary.specific_kwh_m2 - reference_specific
        comparison = ComparisonResult(
            actual_specific_primary_kwh_m2=primary.specific_kwh_m2,
            reference_specific_primary_kwh_m2=reference_specific,
            difference_kwh_m2=_round(diff, 2),
            difference_percent=_round(100 * diff / reference_specific if reference_specific else 0, 1),
        )

    return CalculationResult(
        input=building,
        climate=resolve_climate(building.locality),
        h_tr_w_k=h_tr,
        h_ve_w_k=h_ve,
        heat_loss_w_k=_round(h_tr + h_ve),
        envelope_contributions=envelope_contributions,
        thermal_bridge_contributions=bridge_contributions,
        monthly=monthly,
        annual_heating_demand_kwh=_round(annual_heating),
        annual_cooling_demand_kwh=_round(annual_cooling),
        heating=heating,
        cooling=cooling,
        dhw=dhw,
        final_energy_by_service=by_service,
        final_energy_by_carrier=by_carrier,
        total_final_energy_kwh=_round(sum(by_service.values())),
        primary_energy=primary,
        co2=co2,
        energy_class=energy_class,
        reference=comparison,
        methodology_version=methodology()["version"],
        assumptions=methodology()["assumptions"],
    )


def demo_building() -> BuildingInput:
    return BuildingInput(
        project_name="Cluj Demonstration House",
        locality="Cluj-Napoca",
        heated_floor_area_m2=160,
        heated_volume_m3=432,
        indoor_design_temperature_c=20,
        building_type="residential_individual",
        construction_year=2004,
        solar_gains_kwh_m2_month=1.2,
        envelope=[
            {"name": "External walls", "type": "exterior_wall", "area_m2": 168, "u_value_w_m2k": 0.42},
            {"name": "Roof", "type": "roof", "area_m2": 92, "u_value_w_m2k": 0.24},
            {"name": "Ground floor", "type": "floor", "area_m2": 80, "u_value_w_m2k": 0.36},
            {"name": "Windows", "type": "window", "area_m2": 24, "u_value_w_m2k": 1.35},
            {"name": "External door", "type": "exterior_door", "area_m2": 3.2, "u_value_w_m2k": 1.7},
        ],
        thermal_bridges=[
            {"name": "Floor perimeter", "length_m": 42, "psi_w_mk": 0.05},
        ],
        ventilation={"air_changes_per_hour": 0.5, "heat_recovery_efficiency": 0},
        heating={"system_type": "condensing_gas_boiler", "efficiency": 0.94},
        cooling={"enabled": True, "seer": 3.6, "setpoint_c": 26},
        dhw={"enabled": True, "occupants": 4, "efficiency": 0.86, "carrier": "natural_gas"},
    )
