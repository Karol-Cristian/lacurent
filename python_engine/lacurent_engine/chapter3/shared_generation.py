"""Shared-generator accounting implemented once per physical component."""

from __future__ import annotations

from typing import Any

from .heating import (
    central_generator_output_energy_kwh,
    generation_loss_total_kwh,
    generator_auxiliary_energy_kwh,
    generator_auxiliary_recoverable_loss_kwh,
    generator_auxiliary_recovered_loss_kwh,
    generator_loss_energy_kwh,
    heating_generation_auxiliary_total_kwh,
    heating_generator_fuel_input_energy_kwh,
    recoverable_generation_loss_total_kwh,
    total_generation_auxiliary_recovered_loss_kwh,
)
from ..core.trace import trace_record
from ..core.units import fraction, non_negative, positive


def _service_fractions(fractions: dict[str, Any], services: list[str]) -> dict[str, float]:
    if len(services) == 1:
        return {services[0]: 1.0}
    resolved = {service: fraction(fractions.get(service), f"serviceAllocationFractions.{service}") for service in services}
    total = sum(resolved.values())
    if abs(total - 1.0) > 1e-9:
        raise ValueError("shared-generator service allocation fractions must sum to 1")
    return resolved


def calculate_shared_generator_case(case: dict[str, Any]) -> dict[str, Any]:
    services = case.get("serviceLoadsKWh", {})
    service_names = sorted(service for service, value in services.items() if non_negative(value, f"serviceLoadsKWh.{service}") > 0)
    if not service_names:
        raise ValueError("shared generator case requires at least one positive service load")

    heating_loads = [services[name] for name in service_names if name == "heating"]
    other_loads = [services[name] for name in service_names if name != "heating"]
    control_loss_factor = non_negative(case.get("controlLossFactor", 1), "controlLossFactor")
    operation_hours = non_negative(case["operationHours"], "operationHours")
    loss_power_kw = non_negative(case["lossPowerKW"], "lossPowerKW")
    auxiliary_power_kw = non_negative(case["auxiliaryPowerKW"], "auxiliaryPowerKW")
    recovered_auxiliary_fraction = fraction(case.get("recoveredAuxiliaryFraction", 0), "recoveredAuxiliaryFraction")
    boiler_room_recovery_factor = fraction(case.get("boilerRoomRecoveryFactor", 0), "boilerRoomRecoveryFactor")
    auxiliary_recoverable_fraction = fraction(case.get("auxiliaryRecoverableFractionToHeating", 0), "auxiliaryRecoverableFractionToHeating")
    loss_recoverable_fraction = fraction(case.get("lossRecoverableFractionToHeating", 0), "lossRecoverableFractionToHeating")
    renewable_heat = non_negative(case.get("renewableGeneratorHeatKWh", 0), "renewableGeneratorHeatKWh")
    dhw_losses = non_negative(case.get("dhwStorageOrDistributionLossKWh", 0), "dhwStorageOrDistributionLossKWh")
    fractions = _service_fractions(case.get("serviceAllocationFractions", {}), service_names)

    output = central_generator_output_energy_kwh(control_loss_factor, heating_loads, other_loads)
    physical_loss = generator_loss_energy_kwh(loss_power_kw, operation_hours)
    physical_aux = generator_auxiliary_energy_kwh(auxiliary_power_kw, operation_hours)
    recovered_aux = generator_auxiliary_recovered_loss_kwh(physical_aux, recovered_auxiliary_fraction)
    recoverable_aux = generator_auxiliary_recoverable_loss_kwh(
        physical_aux,
        boiler_room_recovery_factor,
        auxiliary_recoverable_fraction,
    )
    loss_total = generation_loss_total_kwh(
        physical_loss * fractions.get("heating", 0),
        [physical_loss * fractions[name] for name in service_names if name != "heating"],
        dhw_losses,
    )
    auxiliary_total = heating_generation_auxiliary_total_kwh(
        [physical_aux * fractions.get("heating", 0)] if "heating" in fractions else [],
        [physical_aux * fractions[name] for name in service_names if name != "heating"],
    )
    recovered_total = total_generation_auxiliary_recovered_loss_kwh(
        recovered_aux * fractions.get("heating", 0),
        [recovered_aux * fractions[name] for name in service_names if name != "heating"],
    )
    recoverable_total = recoverable_generation_loss_total_kwh(
        physical_loss * loss_recoverable_fraction * fractions.get("heating", 0),
        [physical_loss * loss_recoverable_fraction * fractions[name] for name in service_names if name != "heating"],
        recoverable_aux,
    )
    fuel = heating_generator_fuel_input_energy_kwh(output, recovered_total, loss_total, renewable_heat)
    carrier = case.get("energyCarrier", "unassigned_carrier")
    auxiliary_carrier = case.get("auxiliaryCarrier", carrier)
    energy_carriers: dict[str, float] = {}
    energy_carriers[carrier] = energy_carriers.get(carrier, 0) + fuel
    energy_carriers[auxiliary_carrier] = energy_carriers.get(auxiliary_carrier, 0) + auxiliary_total
    service_allocations = {
        service: {
            "fraction": fractions[service],
            "fuelInputKWh": fuel * fractions[service],
            "auxiliaryKWh": auxiliary_total * fractions[service],
            "reportingTotalKWh": (fuel + auxiliary_total) * fractions[service],
        }
        for service in service_names
    }
    trace = trace_record(
        chapter="3",
        formula_id="MC001_CHAPTER_3_SHARED_GENERATOR_CHAIN",
        branch_id="single_physical_generator_service_allocation",
        inputs={
            "serviceLoadsKWh": services,
            "controlLossFactor": control_loss_factor,
            "operationHours": operation_hours,
            "lossPowerKW": loss_power_kw,
            "auxiliaryPowerKW": auxiliary_power_kw,
            "serviceAllocationFractions": fractions,
        },
        units={
            "serviceLoadsKWh": "kWh/month",
            "operationHours": "h/month",
            "lossPowerKW": "kW",
            "auxiliaryPowerKW": "kW",
        },
        raw_result={
            "outputKWh": output,
            "lossKWh": loss_total,
            "auxiliaryKWh": auxiliary_total,
            "fuelInputKWh": fuel,
        },
        final_result={"energyCarriers": energy_carriers, "serviceAllocations": service_allocations},
        expression="fuel = output - recoveredAuxiliary + physicalLoss + DHW distribution/storage loss - renewableHeat",
        provenance={
            "classification": "NUMERICALLY_IMPLEMENTED",
            "source": "MC001 Chapter 3 shared generator relations implemented by independent Python formulas",
        },
    )
    return {
        "status": "calculated",
        "componentId": case.get("componentId", "python-shared-generator"),
        "physicalTotals": {
            "outputKWh": output,
            "generationLossKWh": loss_total,
            "auxiliaryKWh": auxiliary_total,
            "recoveredAuxiliaryKWh": recovered_total,
            "recoverableKWh": recoverable_total,
            "fuelInputKWh": fuel,
        },
        "serviceAllocations": service_allocations,
        "energyCarriers": energy_carriers,
        "invariants": {
            "serviceFuelAllocationKWh": sum(item["fuelInputKWh"] for item in service_allocations.values()),
            "physicalFuelInputKWh": fuel,
            "serviceAuxiliaryAllocationKWh": sum(item["auxiliaryKWh"] for item in service_allocations.values()),
            "physicalAuxiliaryKWh": auxiliary_total,
        },
        "executionTrace": [trace],
    }
