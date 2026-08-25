"""Direct Chapter 3 integrated execution from Building DNA technical systems."""

from __future__ import annotations

from typing import Any

from .._p3v_kernel import ensure_p3v_path
from ..core.diagnostics import LENI_SR_EN_15193_1_REQUIRED, MISSING_ENGINE_INPUT, diagnostic, leni_external_blocker
from ..core.trace import blocked_trace, trace_record

ensure_p3v_path()

from mc001_reference.chapter3_heating import (  # noqa: E402
    central_generator_output_energy_kwh,
    generator_auxiliary_energy_kwh,
    generator_auxiliary_recoverable_loss_kwh,
    generator_auxiliary_recovered_loss_kwh,
    generator_loss_energy_kwh,
    heating_generator_fuel_input_energy_kwh,
    subsystem_input_energy_kwh,
)


MONTH_IDS = ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")
SERVICE_STAGE_IDS = {
    "heating": ("emission", "distribution", "storage", "generation"),
    "cooling": ("emission", "distribution", "storage", "generation"),
    "dhw": ("distribution", "storage", "generation"),
}


class Chapter3InputError(ValueError):
    """Expected missing or invalid Chapter 3 input."""


def _finite(value: Any, path: str, *, required: bool = True, default: float | None = None) -> float:
    if value is None:
        if required:
            raise Chapter3InputError(f"{path} is required")
        if default is None:
            raise Chapter3InputError(f"{path} default is not defined")
        return float(default)
    if isinstance(value, dict):
        value = value.get("amount", value.get("value", value.get("valueKWh")))
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise Chapter3InputError(f"{path} must be numeric")
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        raise Chapter3InputError(f"{path} must be finite")
    return number


def _optional(value: Any, default: float = 0.0) -> float:
    if value is None:
        return float(default)
    return _finite(value, "$", required=False, default=default)


def _month_value(value: Any, month_index: int, path: str, *, required: bool = True, default: float | None = None) -> float:
    selected = value[month_index] if isinstance(value, list) else value
    return _finite(selected, path, required=required, default=default)


def _trace(formula_id: str, branch_id: str, inputs: dict[str, Any], result: Any) -> dict[str, Any]:
    return trace_record(
        chapter="3",
        formula_id=formula_id,
        branch_id=branch_id,
        inputs=inputs,
        units={},
        raw_result=result,
        final_result=result,
        provenance={"implementation": "lacurent_python_building_dna_direct", "javascriptRuntimeCalled": False},
    )


def _source(classification: str, origin: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "classification": classification,
        "origin": origin,
        "details": details or {},
    }


def _active_systems(section: Any) -> list[dict[str, Any]]:
    if not isinstance(section, dict) or section.get("enabled") is False:
        return []
    systems = section.get("systems")
    if not isinstance(systems, list):
        return []
    return [system for system in systems if isinstance(system, dict) and system.get("enabled") is not False]


def _useful_by_month(chapter2: dict[str, Any]) -> list[dict[str, float]]:
    monthly = chapter2.get("monthly") or []
    if len(monthly) != 12:
        return [{"qHndKWh": 0.0, "qCndKWh": 0.0} for _ in MONTH_IDS]
    return [
        {
            "qHndKWh": _optional(month.get("qHndKWh"), 0),
            "qCndKWh": _optional(month.get("qCndKWh"), 0),
        }
        for month in monthly
    ]


def _stage_map(system: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {str(stage.get("stageId")): stage for stage in (system.get("stages") or []) if isinstance(stage, dict)}


def _input_override(stage: dict[str, Any]) -> dict[str, Any] | None:
    override = stage.get("inputEnergyOverride") or stage.get("stageInputOverride")
    if not isinstance(override, dict):
        return None
    result = override.get("result") if isinstance(override.get("result"), dict) else override
    value = _finite(result.get("valueKWh", result.get("value")), "stage.inputEnergyOverride.valueKWh")
    source = override.get("source") or result.get("source") or {}
    details = source.get("details", source) if isinstance(source, dict) else {}
    system_carriers = _sum_carriers(item["carrierEnergy"] for item in stage_results)
    if not system.get("generatorRef") and system.get("energyCarrier") and output > 0 and not system_carriers:
        system_carriers = {str(system["energyCarrier"]): output}
    return {
        "valueKWh": value,
        "source": source,
        "carrierEnergy": _carrier_energy(details.get("carrierEnergy")),
        "suppliedCoolingKWh": details.get("suppliedCoolingKWh"),
        "unmetCoolingKWh": details.get("unmetCoolingKWh", 0),
        "formulaId": result.get("formulaId", "MC001_3_STAGE_INPUT_ENERGY_OVERRIDE"),
    }


def _carrier_energy(value: Any) -> dict[str, float]:
    if not isinstance(value, dict):
        return {}
    return {
        str(carrier): float(amount)
        for carrier, amount in value.items()
        if isinstance(amount, (int, float)) and float(amount) > 0
    }


def _resolve_stage_loss(
    stage: dict[str, Any],
    service: str,
    stage_id: str,
    month_index: int,
    output_kwh: float,
) -> tuple[float, dict[str, Any], list[dict[str, Any]]]:
    traces: list[dict[str, Any]] = []
    if "lossKWhPerMonth" in stage:
        value = _month_value(stage.get("lossKWhPerMonth"), month_index, f"{service}.{stage_id}.lossKWhPerMonth", default=0)
        return value, stage.get("lossSource") or _source("LEGACY_EXPLICIT", "building_dna_stage_loss"), traces
    contract = stage.get("lossCalculation")
    if isinstance(contract, dict):
        mode = contract.get("mode")
        if mode in {"no_heating_storage", "no_cooling_storage", "component_absent"}:
            traces.append(_trace("MC001_CHAPTER_3_NO_STORAGE_BRANCH", str(mode), {"stageOutputKWh": output_kwh}, 0))
            return 0.0, _source("NUMERICALLY_IMPLEMENTED", str(mode)), traces
        if mode == "heating_emission_temperature_increase":
            increased = _month_value(contract.get("increasedIndoorTemperatureK"), month_index, "increasedIndoorTemperatureK")
            indoor = _month_value(contract.get("indoorTemperatureC"), month_index, "indoorTemperatureC")
            outdoor = _month_value(contract.get("combinedOutdoorTemperatureC"), month_index, "combinedOutdoorTemperatureC")
            value = output_kwh * increased / (indoor - outdoor)
            traces.append(_trace("MC001_3_1_HEATING_EMISSION_LOSS", mode, {"outputKWh": output_kwh, "increasedIndoorTemperatureK": increased, "indoorTemperatureC": indoor, "combinedOutdoorTemperatureC": outdoor}, value))
            return value, _source("NUMERICALLY_IMPLEMENTED", mode), traces
        if mode == "cooling_distribution_factor":
            factor = _month_value(contract.get("lossFactor"), month_index, "lossFactor")
            ahu_output = _month_value(contract.get("ahuOutputKWh"), month_index, "ahuOutputKWh", required=False, default=0)
            value = factor * (output_kwh + ahu_output)
            traces.append(_trace("MC001_3_COOLING_DISTRIBUTION_LOSS_FACTOR", mode, {"outputKWh": output_kwh, "lossFactor": factor, "ahuOutputKWh": ahu_output}, value))
            return value, _source("NUMERICALLY_IMPLEMENTED", mode), traces
        if mode == "cooling_storage_thermal_losses":
            heat_loss = _month_value(contract.get("heatLossKWPerK") or contract.get("heatLossKwPerK"), month_index, "heatLossKWPerK")
            ambient = _month_value(contract.get("ambientTemperatureC"), month_index, "ambientTemperatureC")
            storage = _month_value(contract.get("storageTemperatureC"), month_index, "storageTemperatureC")
            hours = _month_value(contract.get("calculationHours"), month_index, "calculationHours")
            value = heat_loss * (ambient - storage) * hours
            traces.append(_trace("MC001_3_COOLING_STORAGE_THERMAL_LOSS", mode, {"heatLossKWPerK": heat_loss, "ambientTemperatureC": ambient, "storageTemperatureC": storage, "calculationHours": hours}, value))
            return value, _source("NUMERICALLY_IMPLEMENTED", mode), traces
    if "lossKWhPerMonth" not in stage:
        raise Chapter3InputError(f"{service}.{stage_id}.lossKWhPerMonth or lossCalculation is required")
    return 0.0, _source("LEGACY_EXPLICIT", "implicit_zero"), traces


def _resolve_stage_auxiliary(
    stage: dict[str, Any],
    service: str,
    stage_id: str,
    month_index: int,
    output_kwh: float,
) -> tuple[float, dict[str, Any], list[dict[str, Any]]]:
    traces: list[dict[str, Any]] = []
    if "auxiliaryKWhPerMonth" in stage:
        value = _month_value(stage.get("auxiliaryKWhPerMonth"), month_index, f"{service}.{stage_id}.auxiliaryKWhPerMonth", default=0)
        return value, stage.get("auxiliarySource") or _source("LEGACY_EXPLICIT", "building_dna_stage_auxiliary"), traces
    contract = stage.get("auxiliaryCalculation")
    if isinstance(contract, dict):
        mode = contract.get("mode")
        if mode in {"no_preheater", "other_heat_recovery_auxiliary_zero", "no_cooling_storage", "component_absent"}:
            traces.append(_trace("MC001_CHAPTER_3_ABSENT_AUXILIARY_BRANCH", str(mode), {"stageOutputKWh": output_kwh}, 0))
            return 0.0, _source("NUMERICALLY_IMPLEMENTED", str(mode)), traces
        if mode == "cooling_distribution_factor":
            factor = _month_value(contract.get("auxiliaryFactor"), month_index, "auxiliaryFactor")
            ahu_output = _month_value(contract.get("ahuOutputKWh"), month_index, "ahuOutputKWh", required=False, default=0)
            value = factor * (output_kwh + ahu_output)
            traces.append(_trace("MC001_3_COOLING_DISTRIBUTION_AUXILIARY_FACTOR", mode, {"outputKWh": output_kwh, "auxiliaryFactor": factor, "ahuOutputKWh": ahu_output}, value))
            return value, _source("NUMERICALLY_IMPLEMENTED", mode), traces
        if mode in {"cooling_compression_heat_rejection_auxiliary", "cooling_absorption_heat_rejection_auxiliary"}:
            override = _input_override(stage)
            if override:
                return 0.0, _source("NUMERICALLY_IMPLEMENTED", f"{mode}_override_carrier_details"), traces
        if mode == "rotary_heat_recovery_auxiliary":
            power = _month_value(contract.get("maxRotaryPowerKW"), month_index, "maxRotaryPowerKW")
            hours = _month_value(contract.get("calculationHours"), month_index, "calculationHours")
            ratio = _month_value(contract.get("rotationRatio"), month_index, "rotationRatio")
            value = power * hours * ratio
            traces.append(_trace("MC001_3_69_ROTARY_HEAT_RECOVERY_AUXILIARY", mode, {"maxRotaryPowerKW": power, "calculationHours": hours, "rotationRatio": ratio}, value))
            return value, _source("NUMERICALLY_IMPLEMENTED", mode), traces
    if "auxiliaryKWhPerMonth" not in stage:
        raise Chapter3InputError(f"{service}.{stage_id}.auxiliaryKWhPerMonth or auxiliaryCalculation is required")
    return 0.0, _source("LEGACY_EXPLICIT", "implicit_zero"), traces


def _calculate_service_system(
    service: str,
    system: dict[str, Any],
    useful_demand_kwh: float,
    allocation_fraction: float,
    month_index: int,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    traces: list[dict[str, Any]] = []
    output = useful_demand_kwh * allocation_fraction
    stage_results = []
    stages_by_id = _stage_map(system)
    for stage_id in SERVICE_STAGE_IDS[service]:
        stage = stages_by_id.get(stage_id)
        if stage is None:
            raise Chapter3InputError(f"{service}.{stage_id} stage is required")
        loss, loss_source, loss_traces = _resolve_stage_loss(stage, service, stage_id, month_index, output)
        aux, aux_source, aux_traces = _resolve_stage_auxiliary(stage, service, stage_id, month_index, output)
        traces.extend(loss_traces)
        traces.extend(aux_traces)
        override = _input_override(stage)
        if override:
            input_kwh = override["valueKWh"]
            input_source = override["source"]
            carrier = override["carrierEnergy"]
            supplied_cooling = override["suppliedCoolingKWh"]
            unmet_cooling = float(override["unmetCoolingKWh"] or 0)
            formula_id = override["formulaId"]
        else:
            recovered_aux = _optional(stage.get("auxiliaryRecoveredFraction"), 0)
            recovered_loss = _optional(stage.get("lossRecoveredFraction"), 0)
            input_kwh = subsystem_input_energy_kwh(output, loss, aux, recovered_aux, recovered_loss)
            input_source = _source("NUMERICALLY_IMPLEMENTED", "mc001_stage_balance")
            carrier = {}
            supplied_cooling = None
            unmet_cooling = 0.0
            formula_id = "MC001_3_SUBSYSTEM_INPUT_ENERGY_BALANCE"
        recoverable = loss * _optional(stage.get("lossRecoverableFractionToHeating"), 0) + aux * _optional(stage.get("auxiliaryRecoverableFractionToHeating"), 0)
        stage_results.append({
            "stageId": stage_id,
            "outputKWh": output,
            "lossKWh": loss,
            "auxiliaryKWh": aux,
            "inputEnergy": {"valueKWh": input_kwh, "formulaId": formula_id},
            "inputEnergySource": input_source,
            "lossSource": loss_source,
            "auxiliarySource": aux_source,
            "carrierEnergy": carrier,
            "suppliedCoolingKWh": supplied_cooling,
            "unmetLoadKWh": unmet_cooling,
            "recoverableEnergy": {"valueKWh": recoverable},
        })
        traces.append(_trace(
            formula_id,
            f"{service}_{stage_id}_stage_balance",
            {"outputKWh": output, "lossKWh": loss, "auxiliaryKWh": aux},
            input_kwh,
        ))
        output = input_kwh

    system_carriers = _sum_carriers(item["carrierEnergy"] for item in stage_results)
    if not system.get("generatorRef") and system.get("energyCarrier") and output > 0 and not system_carriers:
        system_carriers = {str(system["energyCarrier"]): output}
    return {
        "systemId": system.get("systemId") or f"{service}-system",
        "allocationFraction": allocation_fraction,
        "metadata": {
            "generatorRef": system.get("generatorRef"),
            "energyCarrier": system.get("energyCarrier"),
            "generatorType": system.get("generatorType"),
        },
        "usefulDemandKWh": useful_demand_kwh * allocation_fraction,
        "finalStageInputKWh": output,
        "stageResults": stage_results,
        "lossTotalKWh": sum(item["lossKWh"] for item in stage_results),
        "auxiliaryTotalKWh": sum(item["auxiliaryKWh"] for item in stage_results),
        "recoverableTotalKWh": sum(item["recoverableEnergy"]["valueKWh"] for item in stage_results),
        "carrierEnergy": system_carriers,
        "suppliedUsefulDemandKWh": max(useful_demand_kwh * allocation_fraction - sum(item["unmetLoadKWh"] for item in stage_results), 0),
        "unmetLoadKWh": sum(item["unmetLoadKWh"] for item in stage_results),
    }, traces


def _sum_carriers(items: Any) -> dict[str, float]:
    totals: dict[str, float] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        for carrier, amount in item.items():
            if isinstance(amount, (int, float)):
                totals[carrier] = totals.get(carrier, 0.0) + float(amount)
    return {carrier: amount for carrier, amount in totals.items() if abs(amount) > 1e-12}


def _calculate_service(
    service: str,
    section: Any,
    useful_demand_kwh: float,
    month_index: int,
) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    systems = _active_systems(section)
    if not systems:
        return None, []
    multiple = len(systems) > 1
    if multiple:
        total_fraction = sum(_finite(system.get("allocationFraction"), f"{service}.systems[].allocationFraction") for system in systems)
        if abs(total_fraction - 1) > 1e-9:
            raise Chapter3InputError(f"{service}.systems[].allocationFraction must sum to 1")
    results = []
    traces: list[dict[str, Any]] = []
    for system in systems:
        fraction = _finite(system.get("allocationFraction"), f"{service}.{system.get('systemId')}.allocationFraction") if multiple else 1.0
        result, stage_traces = _calculate_service_system(service, system, useful_demand_kwh, fraction, month_index)
        results.append(result)
        traces.extend(stage_traces)
    return {
        "service": service,
        "usefulDemandKWh": useful_demand_kwh,
        "finalStageInputKWh": sum(item["finalStageInputKWh"] for item in results),
        "systemResults": results,
        "lossTotalKWh": sum(item["lossTotalKWh"] for item in results),
        "auxiliaryTotalKWh": sum(item["auxiliaryTotalKWh"] for item in results),
        "recoverableTotalKWh": sum(item["recoverableTotalKWh"] for item in results),
        "carrierEnergy": _sum_carriers(item["carrierEnergy"] for item in results),
        "suppliedUsefulDemandKWh": sum(item["suppliedUsefulDemandKWh"] for item in results),
        "unmetLoadKWh": sum(item["unmetLoadKWh"] for item in results),
    }, traces


def _service_loads(service_result: dict[str, Any] | None, service: str) -> list[dict[str, Any]]:
    if not service_result:
        return []
    loads = []
    for system in service_result.get("systemResults") or []:
        ref = system.get("metadata", {}).get("generatorRef")
        if not ref:
            continue
        generation = next((stage for stage in system.get("stageResults", []) if stage.get("stageId") == "generation"), None)
        loads.append({
            "service": service,
            "systemId": system.get("systemId"),
            "generatorRef": ref,
            "loadKWh": generation.get("outputKWh") if generation else system.get("finalStageInputKWh", 0),
        })
    return loads


def _active_shared_generators(systems: dict[str, Any]) -> list[dict[str, Any]]:
    shared = systems.get("sharedComponents") if isinstance(systems, dict) else {}
    generators = shared.get("generators") if isinstance(shared, dict) else []
    return [item for item in generators if isinstance(item, dict) and item.get("enabled") is not False]


def _allocation_fractions(generator: dict[str, Any], connected: list[dict[str, Any]]) -> dict[str, float]:
    services = sorted(set(load["service"] for load in connected))
    if len(services) == 1:
        return {services[0]: 1.0}
    configured = generator.get("serviceAllocationFractions")
    if not isinstance(configured, dict):
        raise Chapter3InputError(f"{generator.get('componentId')}.serviceAllocationFractions is required for multi-service generators")
    fractions = {service: _finite(configured.get(service), f"{generator.get('componentId')}.serviceAllocationFractions.{service}") for service in services}
    if abs(sum(fractions.values()) - 1) > 1e-9:
        raise Chapter3InputError(f"{generator.get('componentId')}.serviceAllocationFractions must sum to 1")
    return fractions


def _calculate_shared_generators(
    systems: dict[str, Any],
    service_results: dict[str, dict[str, Any] | None],
    month_index: int,
) -> tuple[list[dict[str, Any]], dict[str, float], list[dict[str, Any]]]:
    loads = []
    for service, result in service_results.items():
        loads.extend(_service_loads(result, service))
    shared_results = []
    carriers: dict[str, float] = {}
    traces: list[dict[str, Any]] = []
    for generator in _active_shared_generators(systems):
        component_id = generator.get("componentId")
        connected = [load for load in loads if load["generatorRef"] == component_id]
        if not connected:
            continue
        heating_loads = [load["loadKWh"] for load in connected if load["service"] == "heating"]
        other_loads = [load["loadKWh"] for load in connected if load["service"] != "heating"]
        output = central_generator_output_energy_kwh(
            _month_value(generator.get("controlLossFactor"), month_index, f"{component_id}.controlLossFactor"),
            heating_loads,
            other_loads,
        )
        hours = _month_value(generator.get("operationHours"), month_index, f"{component_id}.operationHours")
        loss_power = _month_value(generator.get("lossPowerKW"), month_index, f"{component_id}.lossPowerKW")
        aux_power = _month_value(generator.get("auxiliaryPowerKW"), month_index, f"{component_id}.auxiliaryPowerKW")
        loss = generator_loss_energy_kwh(loss_power, hours)
        auxiliary = generator_auxiliary_energy_kwh(aux_power, hours)
        recovered_aux = generator_auxiliary_recovered_loss_kwh(auxiliary, _optional(generator.get("recoveredAuxiliaryFraction"), 0))
        recoverable_aux = generator_auxiliary_recoverable_loss_kwh(
            auxiliary,
            _optional(generator.get("boilerRoomRecoveryFactor"), 0),
            _optional(generator.get("auxiliaryRecoverableFractionToHeating"), 0),
        )
        fuel = heating_generator_fuel_input_energy_kwh(
            output,
            recovered_aux,
            loss + _optional(generator.get("dhwStorageOrDistributionLossKWh"), 0),
            _optional(generator.get("renewableGeneratorHeatKWh"), 0),
        )
        fuel_carrier = generator.get("energyCarrier") or "natural_gas"
        aux_carrier = generator.get("auxiliaryCarrier") or "electricity"
        carriers[fuel_carrier] = carriers.get(fuel_carrier, 0.0) + fuel
        carriers[aux_carrier] = carriers.get(aux_carrier, 0.0) + auxiliary
        fractions = _allocation_fractions(generator, connected)
        service_allocations = {
            service: {
                "fuelInputKWh": fuel * fraction,
                "auxiliaryKWh": auxiliary * fraction,
                "lossKWh": loss * fraction,
            }
            for service, fraction in fractions.items()
        }
        result = {
            "componentId": component_id,
            "connectedServices": sorted(fractions),
            "connectedLoads": connected,
            "physicalTotals": {
                "outputKWh": output,
                "lossKWh": loss,
                "auxiliaryKWh": auxiliary,
                "fuelInputKWh": fuel,
                "recoverableAuxiliaryKWh": recoverable_aux,
                "recoveredAuxiliaryKWh": recovered_aux,
            },
            "serviceAllocations": service_allocations,
            "carrierEnergy": {fuel_carrier: fuel, aux_carrier: auxiliary},
            "invariants": {
                "serviceFuelAllocationKWh": sum(item["fuelInputKWh"] for item in service_allocations.values()),
                "serviceAuxiliaryAllocationKWh": sum(item["auxiliaryKWh"] for item in service_allocations.values()),
            },
        }
        shared_results.append(result)
        traces.append(_trace(
            "MC001_P11B_SHARED_GENERATOR_PHYSICAL_BALANCE",
            "physical_generator_once_service_allocation",
            {"componentId": component_id, "connectedLoads": connected, "operationHours": hours, "lossPowerKW": loss_power, "auxiliaryPowerKW": aux_power},
            result["physicalTotals"],
        ))
    return shared_results, carriers, traces


def _ventilation_month(section: Any, month_index: int) -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    systems = _active_systems(section)
    if not systems:
        return None, []
    system_results = []
    traces = []
    for index, system in enumerate(systems):
        fan = system.get("fanElectricEnergyInput") or {}
        fan_energy = 0.0
        if isinstance(fan, dict) and fan:
            supply_flow = _month_value(fan.get("supplyAirFlowM3PerH"), month_index, "fan.supplyAirFlowM3PerH")
            supply_pressure = _month_value(fan.get("supplyPressureDropPa"), month_index, "fan.supplyPressureDropPa")
            supply_efficiency = _month_value(fan.get("supplyFanEfficiency"), month_index, "fan.supplyFanEfficiency")
            extract_flow = _month_value(fan.get("extractAirFlowM3PerH"), month_index, "fan.extractAirFlowM3PerH")
            extract_pressure = _month_value(fan.get("extractPressureDropPa"), month_index, "fan.extractPressureDropPa")
            extract_efficiency = _month_value(fan.get("extractFanEfficiency"), month_index, "fan.extractFanEfficiency")
            hours = _month_value(fan.get("calculationHours"), month_index, "fan.calculationHours")
            fan_energy = (
                supply_flow * supply_pressure / supply_efficiency
                + extract_flow * extract_pressure / extract_efficiency
            ) * hours / (3.6 * 10**6)
        heat_recovery = _month_value(system.get("heatRecoveryAuxiliaryKWhPerMonth"), month_index, "ventilation.heatRecoveryAuxiliaryKWhPerMonth", required=False, default=0)
        preheat = _month_value(system.get("preheatAuxiliaryKWhPerMonth"), month_index, "ventilation.preheatAuxiliaryKWhPerMonth", required=False, default=0)
        control = _month_value(system.get("controlAuxiliaryKWhPerMonth"), month_index, "ventilation.controlAuxiliaryKWhPerMonth", required=False, default=0)
        total = fan_energy + heat_recovery + preheat + control
        result = {
            "systemId": system.get("systemId") or f"ventilation-system-{index + 1}",
            "fanElectricEnergyKWh": fan_energy,
            "heatRecoveryAuxiliaryKWh": heat_recovery,
            "preheatAuxiliaryKWh": preheat,
            "controlAuxiliaryKWh": control,
            "totalAuxiliaryKWh": total,
            "carrierEnergy": {"electricity": total} if total > 0 else {},
        }
        system_results.append(result)
        traces.append(_trace("MC001_3_71_VENTILATION_AUXILIARY_TOTAL", "direct_ahu_auxiliary_components", {"systemId": result["systemId"], "fan": fan_energy, "heatRecovery": heat_recovery, "preheat": preheat, "control": control}, total))
    total = sum(item["totalAuxiliaryKWh"] for item in system_results)
    return {
        "systemResults": system_results,
        "totalAuxiliaryKWh": total,
        "carrierEnergy": {"electricity": total} if total > 0 else {},
    }, traces


def _add_service_allocations(service_results: dict[str, dict[str, Any] | None], shared_generators: list[dict[str, Any]]) -> None:
    for service, result in service_results.items():
        if not result:
            continue
        allocations = [
            {
                "componentId": generator["componentId"],
                **allocation,
            }
            for generator in shared_generators
            for allocation_service, allocation in generator.get("serviceAllocations", {}).items()
            if allocation_service == service
        ]
        if not allocations:
            continue
        result["sharedGeneratorAllocations"] = allocations
        result["finalStageInputKWh"] = sum(item["fuelInputKWh"] + item["auxiliaryKWh"] for item in allocations)


def calculate_chapter3_from_building_dna(engine_input: dict[str, Any], chapter2_result: dict[str, Any]) -> dict[str, Any]:
    systems = engine_input.get("systems") if isinstance(engine_input.get("systems"), dict) else {}
    diagnostics: list[dict[str, Any]] = []
    traces: list[dict[str, Any]] = []
    if not systems:
        return {"status": "not_requested", "annual": {}, "monthly": [], "energyByCarrier": {}, "diagnostics": [], "executionTrace": []}
    if chapter2_result.get("status") not in {"calculated", "ready"}:
        return {
            "status": "blocked",
            "annual": {},
            "monthly": [],
            "energyByCarrier": {},
            "diagnostics": chapter2_result.get("diagnostics", []),
            "executionTrace": [],
        }
    try:
        useful = _useful_by_month(chapter2_result)
        monthly = []
        carrier_totals: dict[str, float] = {}
        for month_index, month_id in enumerate(MONTH_IDS):
            dhw_section = systems.get("domesticHotWater", {})
            dhw_useful = _month_value(
                dhw_section.get("usefulDemandKWhPerMonth", dhw_section.get("monthlyUsefulDemandKWh")),
                month_index,
                "domesticHotWater.monthlyUsefulDemandKWh",
                required=False,
                default=0,
            )
            service_specs = (
                ("heating", systems.get("heating"), useful[month_index]["qHndKWh"]),
                ("cooling", systems.get("cooling"), useful[month_index]["qCndKWh"]),
                ("dhw", dhw_section, dhw_useful),
            )
            service_results = {}
            for service, section, demand in service_specs:
                result, service_traces = _calculate_service(service, section, demand, month_index)
                service_results[service] = result
                traces.extend(service_traces)
            shared_generators, shared_carriers, shared_traces = _calculate_shared_generators(systems, service_results, month_index)
            traces.extend(shared_traces)
            _add_service_allocations(service_results, shared_generators)
            ventilation, ventilation_traces = _ventilation_month(systems.get("ventilationAhu"), month_index)
            traces.extend(ventilation_traces)
            month_carriers = _sum_carriers([
                *(result.get("carrierEnergy", {}) for result in service_results.values() if result),
                shared_carriers,
                ventilation.get("carrierEnergy", {}) if ventilation else {},
            ])
            carrier_totals = _sum_carriers([carrier_totals, month_carriers])
            monthly.append({
                "month": month_id,
                "heating": service_results["heating"],
                "cooling": service_results["cooling"],
                "dhw": service_results["dhw"],
                "ventilation": ventilation,
                "sharedGenerators": shared_generators,
                "energyByCarrier": month_carriers,
            })
        if systems.get("lighting", {}).get("enabled") is True:
            diagnostics.append(leni_external_blocker())
            traces.append(blocked_trace(
                chapter="3",
                formula_id="3.4_EQ_34_LENI",
                branch_id="sr_en_15193_1_external",
                diagnostics=diagnostics,
                provenance={"externalDependency": "SR EN 15193-1"},
            ))
        annual = {
            "heatingInputKWh": sum((month["heating"] or {}).get("finalStageInputKWh", 0) for month in monthly),
            "coolingInputKWh": sum((month["cooling"] or {}).get("finalStageInputKWh", 0) for month in monthly),
            "coolingSuppliedUsefulKWh": sum((month["cooling"] or {}).get("suppliedUsefulDemandKWh", 0) for month in monthly),
            "coolingUnmetLoadKWh": sum((month["cooling"] or {}).get("unmetLoadKWh", 0) for month in monthly),
            "dhwInputKWh": sum((month["dhw"] or {}).get("finalStageInputKWh", 0) for month in monthly),
            "ventilationAuxiliaryKWh": sum((month["ventilation"] or {}).get("totalAuxiliaryKWh", 0) for month in monthly),
            "sharedGeneratorFuelInputKWh": sum(sum(gen["physicalTotals"]["fuelInputKWh"] for gen in month["sharedGenerators"]) for month in monthly),
            "sharedGeneratorLossKWh": sum(sum(gen["physicalTotals"]["lossKWh"] for gen in month["sharedGenerators"]) for month in monthly),
            "sharedGeneratorAuxiliaryKWh": sum(sum(gen["physicalTotals"]["auxiliaryKWh"] for gen in month["sharedGenerators"]) for month in monthly),
        }
        return {
            "status": "incomplete" if diagnostics else "calculated",
            "annual": annual,
            "monthly": monthly,
            "energyByCarrier": carrier_totals,
            "diagnostics": diagnostics,
            "executionTrace": traces,
            "invariants": {
                "uniquePhysicalCarrierAggregationKWh": sum(carrier_totals.values()),
                "sharedGeneratorFuelKWh": annual["sharedGeneratorFuelInputKWh"],
                "sharedGeneratorAuxiliaryKWh": annual["sharedGeneratorAuxiliaryKWh"],
            },
        }
    except Chapter3InputError as error:
        return {
            "status": "blocked",
            "annual": {},
            "monthly": [],
            "energyByCarrier": {},
            "diagnostics": [diagnostic(MISSING_ENGINE_INPUT, str(error), path="systems")],
            "executionTrace": traces,
        }
