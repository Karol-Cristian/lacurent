"""Direct Chapter 3 integrated execution from Building DNA technical systems."""

from __future__ import annotations

from typing import Any

from .._p3v_kernel import ensure_p3v_path
from ..core.diagnostics import LENI_SR_EN_15193_1_REQUIRED, MISSING_ENGINE_INPUT, diagnostic, leni_external_blocker
from ..core.trace import blocked_trace, trace_record
from . import cooling as cooling_formula
from . import dhw as dhw_formula
from . import heating as heating_formula
from . import ventilation as ventilation_formula

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
    selected = value[month_index] if isinstance(value, list) and month_index < len(value) else value
    return _finite(selected, path, required=required, default=default)


def _monthly_component(value: Any, month_index: int) -> Any:
    if isinstance(value, list):
        return value[month_index] if month_index < len(value) else None
    return value


def _field(record: dict[str, Any], field: str, month_index: int, path: str, *, fallback: Any = None, required: bool = True) -> float:
    value = _monthly_component(record.get(field), month_index) if isinstance(record, dict) and field in record else None
    if value is None:
        value = fallback
    return _finite(value, path, required=required)


def _field_optional(record: dict[str, Any], field: str, month_index: int, fallback: float | None = None) -> float | None:
    value = _monthly_component(record.get(field), month_index) if isinstance(record, dict) and field in record else None
    if value is None:
        return _finite(fallback, field) if fallback is not None else None
    return _finite(value, field)


def _is_finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and float(value) == float(value) and float(value) not in (float("inf"), float("-inf"))


def _as_list_of_pairs(items: Any) -> list[tuple[float, float]]:
    if not isinstance(items, list):
        raise Chapter3InputError("expected a list of numeric pairs")
    pairs: list[tuple[float, float]] = []
    for item in items:
        if isinstance(item, (list, tuple)) and len(item) == 2:
            pairs.append((_finite(item[0], "pair[0]"), _finite(item[1], "pair[1]")))
        elif isinstance(item, dict):
            first = item.get("currentFlowM3PerH", item.get("leakageFactor", item.get("zoneSupplyLeakageAirFlowM3PerH")))
            second = item.get("designMaximumFlowM3PerH", item.get("requiredAirFlowM3PerH", item.get("zoneTemperatureC")))
            pairs.append((_finite(first, "pair.first"), _finite(second, "pair.second")))
        else:
            raise Chapter3InputError("expected a pair object")
    return pairs


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


def _stage_private(stage: dict[str, Any], key: str, value: Any) -> None:
    stage[f"_p11c_{key}"] = value


def _previous_stage_value(stage_context: dict[str, Any] | None, stage_id: str, field: str, fallback: float = 0.0) -> float:
    previous = (stage_context or {}).get("previousStages", {})
    value = previous.get(stage_id, {}).get(field) if isinstance(previous, dict) else None
    return _finite(value, f"previousStages.{stage_id}.{field}", required=False, default=fallback) if value is not None else fallback


def _stage_context_value(stage_context: dict[str, Any] | None, field: str, fallback: float = 0.0) -> float:
    value = (stage_context or {}).get(field)
    return _finite(value, f"stageContext.{field}", required=False, default=fallback) if value is not None else fallback


def _result_source(origin: str, mode: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return _source("NUMERICALLY_IMPLEMENTED", origin, {"mode": mode, **(details or {})})


def _prepare_dhw_pipe_segments(segments: Any, month_index: int, path: str) -> list[dict[str, Any]]:
    if not isinstance(segments, list) or not segments:
        raise Chapter3InputError(f"{path} must contain pipe segments")
    prepared: list[dict[str, Any]] = []
    for index, segment in enumerate(segments):
        if not isinstance(segment, dict):
            raise Chapter3InputError(f"{path}[{index}] must be an object")
        item = dict(segment)
        mean_input = item.get("meanTemperatureInput")
        if isinstance(mean_input, dict):
            item["thetaWMeanC"] = dhw_formula.mean_distribution_temperature_c(
                _field(mean_input, "thetaWDistributionC", month_index, f"{path}[{index}].meanTemperatureInput.thetaWDistributionC"),
                _field(mean_input, "deltaThetaWLoopK", month_index, f"{path}[{index}].meanTemperatureInput.deltaThetaWLoopK"),
            )
        transmittance_input = item.get("linearTransmittanceInput")
        if isinstance(transmittance_input, dict):
            mode = transmittance_input.get("mode")
            if mode == "insulated_pipe":
                item["linearTransmittanceWPerMK"] = dhw_formula.insulated_pipe_linear_transmittance(
                    _finite(transmittance_input.get("innerDiameterM"), "innerDiameterM"),
                    _finite(transmittance_input.get("outerDiameterM"), "outerDiameterM"),
                    _finite(transmittance_input.get("insulationThermalConductivityWPerMK"), "insulationThermalConductivityWPerMK"),
                    _finite(transmittance_input.get("externalHeatTransferCoefficientWPerM2K"), "externalHeatTransferCoefficientWPerM2K"),
                )
            elif mode == "buried_pipe":
                item["linearTransmittanceWPerMK"] = dhw_formula.buried_pipe_linear_transmittance(
                    _finite(transmittance_input.get("innerDiameterM"), "innerDiameterM"),
                    _finite(transmittance_input.get("outerDiameterM"), "outerDiameterM"),
                    _finite(transmittance_input.get("insulationThermalConductivityWPerMK"), "insulationThermalConductivityWPerMK"),
                    _finite(transmittance_input.get("burialMaterialThermalConductivityWPerMK"), "burialMaterialThermalConductivityWPerMK"),
                    _finite(transmittance_input.get("burialDepthM"), "burialDepthM"),
                )
            elif mode == "uninsulated_pipe":
                item["linearTransmittanceWPerMK"] = dhw_formula.uninsulated_pipe_linear_transmittance(
                    _finite(transmittance_input.get("innerDiameterM"), "innerDiameterM"),
                    _finite(transmittance_input.get("outerDiameterM"), "outerDiameterM"),
                    _finite(transmittance_input.get("pipeThermalConductivityWPerMK"), "pipeThermalConductivityWPerMK"),
                    _finite(transmittance_input.get("externalHeatTransferCoefficientWPerM2K"), "externalHeatTransferCoefficientWPerM2K"),
                )
            elif mode == "uninsulated_pipe_approx":
                item["linearTransmittanceWPerMK"] = dhw_formula.uninsulated_pipe_approx_linear_transmittance(
                    _finite(transmittance_input.get("outerDiameterM"), "outerDiameterM"),
                    _finite(transmittance_input.get("externalHeatTransferCoefficientWPerM2K"), "externalHeatTransferCoefficientWPerM2K"),
                )
        profile_input = item.get("temperatureProfileInput")
        if isinstance(profile_input, dict):
            mode = profile_input.get("mode")
            if mode == "simplified":
                item["thetaWMeanC"] = dhw_formula.average_temperature_simplified_c(
                    _finite(item.get("linearTransmittanceWPerMK", profile_input.get("linearTransmittanceWPerMK")), "linearTransmittanceWPerMK")
                )
            elif mode == "profile":
                specific_input = profile_input.get("specificLinearHeatLossInput") or {}
                specific = dhw_formula.specific_linear_heat_loss_w_m(
                    _finite(specific_input.get("linearTransmittanceWPerMK", item.get("linearTransmittanceWPerMK")), "linearTransmittanceWPerMK"),
                    _finite(specific_input.get("thetaWDistributionC"), "thetaWDistributionC"),
                    _finite(specific_input.get("thetaWAmbientC", item.get("thetaWAmbientC")), "thetaWAmbientC"),
                )
                coefficient_input = profile_input.get("exponentialCoefficientInput") or {}
                coefficient = dhw_formula.exponential_coefficient(
                    _finite(coefficient_input.get("specificLinearHeatLossWPerM", specific), "specificLinearHeatLossWPerM"),
                    _finite(coefficient_input.get("pipeLengthM", item.get("lengthM")), "pipeLengthM"),
                    _finite(coefficient_input.get("waterSpecificHeatWhPerKgK"), "waterSpecificHeatWhPerKgK"),
                    _finite(coefficient_input.get("waterDensityKgPerM3"), "waterDensityKgPerM3"),
                    _finite(coefficient_input.get("waterVolumeM3"), "waterVolumeM3"),
                    _finite(coefficient_input.get("pipeSpecificHeatWhPerKgK"), "pipeSpecificHeatWhPerKgK"),
                    _finite(coefficient_input.get("pipeMassKg"), "pipeMassKg"),
                    _finite(coefficient_input.get("nonUseIntervalHours"), "nonUseIntervalHours"),
                    _finite(coefficient_input.get("thetaWDistributionC"), "thetaWDistributionC"),
                    _finite(coefficient_input.get("thetaWAmbientC", item.get("thetaWAmbientC")), "thetaWAmbientC"),
                )
                after_input = profile_input.get("temperatureAfterNonUseInput") or {}
                after = dhw_formula.temperature_after_non_use_c(
                    _finite(after_input.get("thetaWAhC"), "thetaWAhC"),
                    _finite(after_input.get("thetaWAverageBeginC"), "thetaWAverageBeginC"),
                    _finite(after_input.get("thetaWAmbientC", item.get("thetaWAmbientC")), "thetaWAmbientC"),
                    _finite(after_input.get("exponentialCoefficient", coefficient), "exponentialCoefficient"),
                )
                average_input = profile_input.get("averageTemperatureInput") or {}
                item["thetaWMeanC"] = dhw_formula.average_temperature_from_profile_c(
                    _finite(average_input.get("thetaWAverageBeginC"), "thetaWAverageBeginC"),
                    _finite(average_input.get("thetaWAfterNonUseC", after), "thetaWAfterNonUseC"),
                )
        _finite(item.get("linearTransmittanceWPerMK"), f"{path}[{index}].linearTransmittanceWPerMK")
        _finite(item.get("thetaWMeanC"), f"{path}[{index}].thetaWMeanC")
        _finite(item.get("thetaWAmbientC"), f"{path}[{index}].thetaWAmbientC")
        prepared.append(item)
    return prepared


def _resolve_stage_loss(
    stage: dict[str, Any],
    service: str,
    stage_id: str,
    month_index: int,
    output_kwh: float,
    stage_context: dict[str, Any] | None = None,
) -> tuple[float, dict[str, Any], list[dict[str, Any]]]:
    traces: list[dict[str, Any]] = []
    if "lossKWhPerMonth" in stage and not isinstance(stage.get("lossCalculation"), dict):
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
            value = heating_formula.heating_emission_loss_kwh(output_kwh, increased, indoor, outdoor)
            traces.append(_trace("MC001_3_1_HEATING_EMISSION_LOSS", mode, {"outputKWh": output_kwh, "increasedIndoorTemperatureK": increased, "indoorTemperatureC": indoor, "combinedOutdoorTemperatureC": outdoor}, value))
            return value, _source("NUMERICALLY_IMPLEMENTED", mode), traces
        if service == "heating" and stage_id == "generation" and mode in {"heating_generator_standby_coefficients", "heating_generator_standby_envelope_chimney"}:
            hours = _field(contract, "operationHours", month_index, "operationHours")
            delivered_power = _field_optional(contract, "generatorDeliveredPowerKW", month_index, contract.get("nominalPowerKW"))
            if mode == "heating_generator_standby_coefficients":
                fraction_percent = heating_formula.generator_standby_loss_fraction_from_coefficients_percent(
                    _finite(contract.get("coefficientC5"), "coefficientC5"),
                    _finite(contract.get("coefficientC6"), "coefficientC6"),
                    _finite(contract.get("nominalPowerKW"), "nominalPowerKW"),
                )
                envelope_fraction = fraction_percent
                chimney_fraction = 0.0
            else:
                envelope_fraction = _finite(contract.get("envelopeLossFractionPercent"), "envelopeLossFractionPercent")
                chimney_fraction = _finite(contract.get("chimneyOffLossFractionPercent"), "chimneyOffLossFractionPercent")
            loss_power = heating_formula.generator_standby_loss_power_kw(envelope_fraction, chimney_fraction, _finite(delivered_power, "generatorDeliveredPowerKW"))
            value = heating_formula.generator_loss_energy_kwh(loss_power, hours)
            if _is_finite_number(contract.get("boilerRoomRecoveryFactor")) and _is_finite_number(contract.get("envelopeLossFraction")) and value > 0:
                recoverable = heating_formula.generator_envelope_recoverable_loss_kwh(
                    loss_power,
                    _finite(contract.get("boilerRoomRecoveryFactor"), "boilerRoomRecoveryFactor"),
                    _finite(contract.get("envelopeLossFraction"), "envelopeLossFraction"),
                    hours,
                )
                _stage_private(stage, "loss_derived", {"lossRecoverableFractionToHeating": recoverable / value if value else 0})
            traces.append(_trace("MC001_3_HEATING_GENERATOR_STANDBY_LOSS", mode, {"operationHours": hours, "lossPowerKW": loss_power}, value))
            return value, _result_source("mc001_heating_generator_standby_component_contract", mode), traces
        if service == "heating" and stage_id == "generation" and mode == "heating_generator_loss_power_curve":
            hours = _field(contract, "operationHours", month_index, "operationHours")
            nominal = _finite(contract.get("nominalPowerKW"), "nominalPowerKW")
            load_factor = heating_formula.heating_generator_load_factor(output_kwh, nominal, hours)
            intermediate = heating_formula.intermediate_load_factor(
                _finite(contract.get("intermediatePowerKW"), "intermediatePowerKW"),
                nominal,
            )
            if load_factor <= intermediate:
                loss_power = heating_formula.generator_loss_power_low_load_kw(
                    load_factor,
                    intermediate,
                    _finite(contract.get("lossPowerNominalKW"), "lossPowerNominalKW"),
                    _finite(contract.get("lossPowerIntermediateKW"), "lossPowerIntermediateKW"),
                )
                branch = "low_load_loss_power"
            else:
                loss_power = heating_formula.generator_loss_power_high_load_kw(
                    load_factor,
                    intermediate,
                    _finite(contract.get("nominalLoadFactor"), "nominalLoadFactor"),
                    _finite(contract.get("lossPowerNominalKW"), "lossPowerNominalKW"),
                    _finite(contract.get("lossPowerIntermediateKW"), "lossPowerIntermediateKW"),
                )
                branch = "high_load_loss_power"
            value = heating_formula.generator_loss_energy_kwh(loss_power, hours)
            traces.append(_trace("MC001_3_32_HEATING_GENERATOR_LOSS_ENERGY", f"{mode}_{branch}", {"operationHours": hours, "loadFactor": load_factor, "intermediateLoadFactor": intermediate, "lossPowerKW": loss_power}, value))
            return value, _result_source("mc001_heating_generator_loss_power_curve_contract", mode, {"branch": branch}), traces
        if service == "dhw" and stage_id == "distribution" and mode == "dhw_distribution_loss_components":
            total_distribution = 0.0
            if isinstance(contract.get("distributionPipeSegments"), list):
                segments = _prepare_dhw_pipe_segments(contract.get("distributionPipeSegments"), month_index, "distributionPipeSegments")
                total_distribution += dhw_formula.distribution_loss_with_pipe_segments(
                    segments,
                    _field(contract, "operationTimeHours", month_index, "operationTimeHours"),
                )
            if isinstance(contract.get("recirculationNoDrawPipeSegments"), list):
                segments = _prepare_dhw_pipe_segments(contract.get("recirculationNoDrawPipeSegments"), month_index, "recirculationNoDrawPipeSegments")
                total_distribution += dhw_formula.distribution_loss_with_pipe_segments(
                    segments,
                    _field(contract, "operationTimeHours", month_index, "operationTimeHours"),
                    temperature_mode="sum",
                )
            if isinstance(contract.get("stubPipeSegments"), list):
                total_distribution += dhw_formula.stub_loss_without_recirculation(
                    contract.get("stubPipeSegments"),
                    _finite(contract.get("waterDensityKgPerM3", 1000), "waterDensityKgPerM3"),
                    _finite(contract.get("specificHeatKWhPerKgK", 4.186 / 3600), "specificHeatKWhPerKgK"),
                    _finite(contract.get("thetaWDistributionC"), "thetaWDistributionC"),
                    _field(contract, "calculationIntervalHours", month_index, "calculationIntervalHours"),
                )
            if total_distribution == 0 and not any(isinstance(contract.get(name), list) for name in ("distributionPipeSegments", "recirculationNoDrawPipeSegments", "stubPipeSegments")):
                raise Chapter3InputError("dhw_distribution_loss_components requires pipe segment inputs")
            if isinstance(contract.get("recoverablePipeSegments"), list) and total_distribution > 0:
                recoverable_segments = _prepare_dhw_pipe_segments(contract.get("recoverablePipeSegments"), month_index, "recoverablePipeSegments")
                recoverable = dhw_formula.distribution_loss_with_pipe_segments(
                    recoverable_segments,
                    _field(contract, "operationTimeHours", month_index, "operationTimeHours"),
                )
                recovery_factor = dhw_formula.distribution_recovery_factor(recoverable, total_distribution)
                _stage_private(stage, "loss_derived", {
                    "lossRecoveredFraction": recovery_factor,
                    "lossRecoverableFractionToHeating": recovery_factor,
                })
            traces.append(_trace("MC001_3_213_DHW_TOTAL_DISTRIBUTION_LOSS", mode, {"totalDistributionLossKWh": total_distribution}, total_distribution))
            return total_distribution, _result_source("mc001_dhw_distribution_component_contract", mode), traces
        if service == "dhw" and stage_id == "storage" and mode == "dhw_storage_standing_loss_single_volume":
            value = dhw_formula.storage_standing_loss_single_volume_kwh(
                _finite(contract.get("accessibleStorageVolumeFactor"), "accessibleStorageVolumeFactor"),
                _finite(contract.get("distributionStorageLossFactor"), "distributionStorageLossFactor"),
                _finite(contract.get("storageHeatTransferCoefficientWPerK"), "storageHeatTransferCoefficientWPerK"),
                _finite(contract.get("storageSetpointTemperatureC"), "storageSetpointTemperatureC"),
                _finite(contract.get("storageAmbientTemperatureC"), "storageAmbientTemperatureC"),
                _field(contract, "calculationHours", month_index, "calculationHours"),
            )
            traces.append(_trace("MC001_3_228_DHW_STORAGE_STANDING_LOSS_SINGLE_VOLUME", mode, {"stageOutputKWh": output_kwh}, value))
            return value, _result_source("mc001_dhw_storage_component_contract", mode), traces
        if mode == "cooling_distribution_factor":
            factor = _field(contract, "coolingLossFactor", month_index, "coolingLossFactor", fallback=contract.get("lossFactor"))
            useful = _field_optional(contract, "usefulCoolingDemandKWh", month_index, _stage_context_value(stage_context, "allocatedUsefulDemandKWh", output_kwh))
            emission_loss = _field_optional(contract, "emissionLossKWh", month_index, _previous_stage_value(stage_context, "emission", "lossKWh", 0))
            ahu_output = _field_optional(contract, "ahuCoolingOutputRequiredKWh", month_index, _field_optional(contract, "ahuOutputKWh", month_index, 0))
            value = cooling_formula.cooling_distribution_loss_kwh(factor, useful or 0, emission_loss or 0, ahu_output or 0)
            traces.append(_trace("MC001_3_COOLING_DISTRIBUTION_LOSS_FACTOR", mode, {"coolingLossFactor": factor, "usefulCoolingDemandKWh": useful, "emissionLossKWh": emission_loss, "ahuCoolingOutputRequiredKWh": ahu_output}, value))
            return value, _source("NUMERICALLY_IMPLEMENTED", mode), traces
        if mode == "cooling_storage_thermal_losses":
            losses = []
            for prefix, formula_id in (
                ("outputSide", "MC001_3_99_COOLING_STORAGE_OUTPUT_SIDE_THERMAL_LOSS"),
                ("standby", "MC001_3_100_COOLING_STORAGE_STANDBY_THERMAL_LOSS"),
                ("inputSide", "MC001_3_101_COOLING_STORAGE_INPUT_SIDE_THERMAL_LOSS"),
            ):
                coefficient = _field_optional(contract, f"{prefix}HeatLossCoefficientKWPerK", month_index, contract.get("heatLossCoefficientKWPerK"))
                if coefficient is None and prefix == "outputSide":
                    coefficient = _field_optional(contract, "heatLossKWPerK", month_index, _field_optional(contract, "heatLossKwPerK", month_index, None))
                if coefficient is None:
                    continue
                ambient = _field_optional(contract, f"{prefix}AmbientTemperatureC", month_index, _field_optional(contract, "ambientTemperatureC", month_index, None))
                storage = _field_optional(contract, f"{prefix}StorageTemperatureC", month_index, _field_optional(contract, "storageTemperatureC", month_index, None))
                hours = _field_optional(contract, f"{prefix}CalculationHours", month_index, _field_optional(contract, "calculationHours", month_index, None))
                loss = cooling_formula.cooling_storage_thermal_loss_kwh(coefficient, _finite(ambient, f"{prefix}AmbientTemperatureC"), _finite(storage, f"{prefix}StorageTemperatureC"), _finite(hours, f"{prefix}CalculationHours"))
                losses.append((formula_id, prefix, loss))
            if not losses:
                raise Chapter3InputError("cooling_storage_thermal_losses requires at least one thermal-loss coefficient")
            value = sum(loss for _, _, loss in losses)
            if value < 0:
                raise Chapter3InputError("cooling storage thermal-loss total must be non-negative")
            traces.extend(_trace(formula_id, f"{mode}_{prefix}", {"lossKWh": loss}, loss) for formula_id, prefix, loss in losses)
            traces.append(_trace("MC001_3_COOLING_STORAGE_THERMAL_LOSS_TOTAL", mode, {"totalLossKWh": value}, value))
            return value, _source("NUMERICALLY_IMPLEMENTED", mode), traces
    if "lossKWhPerMonth" not in stage:
        raise Chapter3InputError(f"{service}.{stage_id}.lossKWhPerMonth or lossCalculation is required")
    return 0.0, _source("LEGACY_EXPLICIT", "implicit_zero"), traces


def _cooling_generator_input_required(contract: dict[str, Any], month_index: int, stage_context: dict[str, Any] | None) -> float | None:
    mode = contract.get("generatorInputRequirementMode")
    if not mode:
        return None
    useful = _field_optional(contract, "usefulCoolingDemandKWh", month_index, _stage_context_value(stage_context, "allocatedUsefulDemandKWh", 0))
    emission = _field_optional(contract, "emissionLossKWh", month_index, _previous_stage_value(stage_context, "emission", "lossKWh", 0))
    ahu = _field_optional(contract, "ahuCoolingOutputRequiredKWh", month_index, 0)
    if mode == "direct_expansion":
        return cooling_formula.cooling_generator_input_required_direct_expansion_kwh(useful or 0, emission or 0, ahu or 0)
    if mode == "air_water":
        distribution = _field_optional(contract, "distributionLossKWh", month_index, _previous_stage_value(stage_context, "distribution", "lossKWh", 0))
        auxiliary = _field_optional(contract, "auxiliaryDistributionEnergyKWh", month_index, _previous_stage_value(stage_context, "distribution", "auxiliaryKWh", 0))
        auxiliary_fraction = _field(contract, "auxiliaryHeatFraction", month_index, "auxiliaryHeatFraction")
        return cooling_formula.cooling_generator_input_required_air_water_kwh(
            useful or 0,
            emission or 0,
            ahu or 0,
            distribution or 0,
            auxiliary or 0,
            auxiliary_fraction,
        )
    raise Chapter3InputError("cooling generator input requirement mode must be direct_expansion or air_water")


def _cooling_eer_correction(contract: dict[str, Any], month_index: int) -> float:
    correction_input = _monthly_component(contract.get("eerCorrectionInput"), month_index)
    if isinstance(correction_input, dict):
        return cooling_formula.cooling_eer_temperature_correction_factor(
            _finite(correction_input.get("absoluteZeroOffsetK"), "absoluteZeroOffsetK"),
            _finite(correction_input.get("generatorRequiredOutletTemperatureC"), "generatorRequiredOutletTemperatureC"),
            _finite(correction_input.get("heatRejectionReferenceInletTemperatureC"), "heatRejectionReferenceInletTemperatureC"),
            _finite(correction_input.get("nominalGeneratorOutletTemperatureC"), "nominalGeneratorOutletTemperatureC"),
            _finite(correction_input.get("nominalHeatRejectionInletTemperatureC"), "nominalHeatRejectionInletTemperatureC"),
            _finite(correction_input.get("evaporatorTemperatureDifferenceK"), "evaporatorTemperatureDifferenceK"),
            _finite(correction_input.get("condenserTemperatureDifferenceK"), "condenserTemperatureDifferenceK"),
        )
    return _field(contract, "eerCorrectionFactor", month_index, "eerCorrectionFactor")


def _cooling_heat_rejection_auxiliary(contract: dict[str, Any], heat_rejected_kwh: float, month_index: int) -> float:
    mode = contract.get("heatRejectionAuxiliaryMode")
    if mode == "air_cooled_zero":
        return 0.0
    if mode != "specific_electric_demand":
        raise Chapter3InputError("cooling generator auxiliary requires heatRejectionAuxiliaryMode")
    specific = _field_optional(
        contract,
        "heatRejectionSpecificElectricDemandKWPerKW",
        month_index,
        _field_optional(contract, "heatRejectionSpecificDemandKWPerKW", month_index, None),
    )
    part_load = _field_optional(contract, "heatRejectionElectricPartLoadFactor", month_index, 1)
    free_cooling = _field_optional(contract, "freeCoolingElectricFactor", month_index, 1)
    return cooling_formula.cooling_heat_rejection_auxiliary_kwh(
        heat_rejected_kwh,
        _finite(specific, "heatRejectionSpecificElectricDemandKWPerKW"),
        _finite(part_load, "heatRejectionElectricPartLoadFactor"),
        _finite(free_cooling, "freeCoolingElectricFactor"),
    )


def _cooling_heat_rejection_distribution_auxiliary(contract: dict[str, Any], heat_rejected_kwh: float, month_index: int) -> float:
    mode = contract.get("heatRejectionDistributionAuxiliaryMode")
    if mode == "air_cooled_zero":
        return 0.0
    if mode != "specific_electric_demand":
        raise Chapter3InputError("cooling generator auxiliary requires heatRejectionDistributionAuxiliaryMode")
    return cooling_formula.cooling_heat_rejection_distribution_auxiliary_kwh(
        heat_rejected_kwh,
        _field(contract, "heatRejectionDistributionSpecificElectricDemandKWPerKW", month_index, "heatRejectionDistributionSpecificElectricDemandKWPerKW"),
    )


def _cooling_control_auxiliary(contract: dict[str, Any], month_index: int) -> float:
    powers = contract.get("controlPowersKW")
    if isinstance(powers, list):
        control_powers = [_finite(item, "controlPowersKW[]") for item in powers]
    elif _is_finite_number(contract.get("controlPowerKW")):
        control_powers = [_finite(contract.get("controlPowerKW"), "controlPowerKW")]
    else:
        raise Chapter3InputError("cooling generator auxiliary requires controlPowersKW or controlPowerKW")
    return cooling_formula.cooling_control_auxiliary_kwh(
        _field(contract, "operationHours", month_index, "operationHours"),
        control_powers,
    )


def _calculate_cooling_generator_contract(
    contract: dict[str, Any],
    stage: dict[str, Any],
    month_index: int,
    output_kwh: float,
    stage_context: dict[str, Any] | None,
) -> tuple[float, dict[str, Any], list[dict[str, Any]]]:
    mode = contract.get("mode")
    is_compression = mode == "cooling_compression_heat_rejection_auxiliary"
    is_absorption = mode == "cooling_absorption_heat_rejection_auxiliary"
    if not is_compression and not is_absorption:
        raise Chapter3InputError("unsupported cooling generator auxiliary mode")
    required = _cooling_generator_input_required(contract, month_index, stage_context)
    if required is None:
        required = _field_optional(contract, "generatorInputRequiredKWh", month_index, output_kwh)
    operation_hours = _field(contract, "operationHours", month_index, "operationHours")
    nominal_power = _field(contract, "nominalCoolingPowerKW", month_index, "nominalCoolingPowerKW")
    part_load_factor = cooling_formula.cooling_part_load_factor(required, operation_hours, nominal_power)
    part_load_bin = cooling_formula.cooling_part_load_bin(part_load_factor)
    available = cooling_formula.cooling_generator_input_by_capacity_limit(required, operation_hours, nominal_power)
    requested = _field_optional(contract, "requiredExtractedEnergyKWh", month_index, _stage_context_value(stage_context, "allocatedUsefulDemandKWh", required))
    supplied = cooling_formula.cooling_extracted_energy_limited_by_generator(requested or 0, required, available)
    unmet = cooling_formula.cooling_unmet_load_kwh(requested or 0, supplied)
    capacity_limited = available + 1e-9 < required
    if capacity_limited and contract.get("allowCapacityLimitedGeneratorInput") is not True:
        raise Chapter3InputError("cooling generator capacity is insufficient for the requested monthly load")
    if capacity_limited and contract.get("unmetLoadPolicy") != "report_unmet_load":
        raise Chapter3InputError("capacity-limited cooling requires unmetLoadPolicy=report_unmet_load")
    if is_absorption:
        part_load_value = cooling_formula.cooling_absorption_part_load_value(_field_optional(contract, "partLoadValue", month_index, None))
        nominal_heat_ratio = _field(contract, "nominalHeatRatio", month_index, "nominalHeatRatio")
        absorption_heat = cooling_formula.cooling_absorption_heat_input_kwh(available, part_load_value, nominal_heat_ratio)
        heat_rejected = cooling_formula.cooling_heat_rejected_absorption_kwh(available, nominal_heat_ratio, part_load_value)
        compression_electric = 0.0
    else:
        heat_rejection_part_load = _field_optional(contract, "heatRejectionPartLoadFactor", month_index, 1)
        part_load_value = cooling_formula.cooling_generator_part_load_value(
            part_load_bin,
            heat_rejection_part_load or 1,
            _field_optional(contract, "freeCoolingFactor", month_index, 1) or 1,
            _field_optional(contract, "multipleGeneratorFactor", month_index, 1) or 1,
        )
        nominal_eer = _field(contract, "nominalEer", month_index, "nominalEer")
        eer_correction = _cooling_eer_correction(contract, month_index)
        compression_electric = cooling_formula.cooling_compression_electric_input_kwh(available, part_load_value, nominal_eer, eer_correction)
        heat_rejected = cooling_formula.cooling_heat_rejected_compression_kwh(available, nominal_eer, part_load_value, eer_correction)
        absorption_heat = 0.0
    heat_rejection_aux = _cooling_heat_rejection_auxiliary(contract, heat_rejected, month_index)
    heat_rejection_distribution_aux = _cooling_heat_rejection_distribution_auxiliary(contract, heat_rejected, month_index)
    control_aux = _cooling_control_auxiliary(contract, month_index)
    auxiliary_total = cooling_formula.cooling_generator_auxiliary_total_kwh(heat_rejection_aux, heat_rejection_distribution_aux, control_aux)
    carrier_energy = (
        {
            str(contract.get("absorptionHeatCarrier") or contract.get("drivingHeatCarrier") or "thermal"): absorption_heat,
            str(contract.get("auxiliaryCarrier") or "electricity"): auxiliary_total,
        }
        if is_absorption
        else {
            str(contract.get("energyCarrier") or "electricity"): cooling_formula.cooling_compression_delivered_electric_input_kwh(
                compression_electric,
                auxiliary_total,
            )
        }
    )
    delivered_input = sum(carrier_energy.values())
    _stage_private(stage, "stage_input_override", {
        "valueKWh": delivered_input,
        "source": _result_source("mc001_cooling_generator_delivered_input_contract", mode, {
            "carrierEnergy": carrier_energy,
            "suppliedCoolingKWh": supplied,
            "unmetCoolingKWh": unmet,
        }),
        "carrierEnergy": carrier_energy,
        "suppliedCoolingKWh": supplied,
        "unmetCoolingKWh": unmet,
        "formulaId": "MC001_3_COOLING_GENERATOR_DELIVERED_INPUT",
    })
    traces = [
        _trace("MC001_3_149_COOLING_PART_LOAD_FACTOR", mode, {"generatorInputRequiredKWh": required, "operationHours": operation_hours, "nominalCoolingPowerKW": nominal_power}, part_load_factor),
        _trace("MC001_3_152_3_153_COOLING_CAPACITY_LIMIT", mode, {"requiredKWh": required, "availableKWh": available, "requestedKWh": requested}, {"suppliedCoolingKWh": supplied, "unmetCoolingKWh": unmet}),
        _trace("MC001_3_COOLING_GENERATOR_AUXILIARY_TOTAL", mode, {"heatRejectedKWh": heat_rejected, "heatRejectionAuxiliaryKWh": heat_rejection_aux, "heatRejectionDistributionAuxiliaryKWh": heat_rejection_distribution_aux, "controlAuxiliaryKWh": control_aux}, auxiliary_total),
        _trace("MC001_3_COOLING_GENERATOR_DELIVERED_INPUT", mode, {"carrierEnergy": carrier_energy}, delivered_input),
    ]
    return auxiliary_total, _result_source("mc001_cooling_generator_component_contract", mode), traces


def _resolve_stage_auxiliary(
    stage: dict[str, Any],
    service: str,
    stage_id: str,
    month_index: int,
    output_kwh: float,
    stage_context: dict[str, Any] | None = None,
) -> tuple[float, dict[str, Any], list[dict[str, Any]]]:
    traces: list[dict[str, Any]] = []
    if "auxiliaryKWhPerMonth" in stage and not isinstance(stage.get("auxiliaryCalculation"), dict):
        value = _month_value(stage.get("auxiliaryKWhPerMonth"), month_index, f"{service}.{stage_id}.auxiliaryKWhPerMonth", default=0)
        return value, stage.get("auxiliarySource") or _source("LEGACY_EXPLICIT", "building_dna_stage_auxiliary"), traces
    contract = stage.get("auxiliaryCalculation")
    if isinstance(contract, dict):
        mode = contract.get("mode")
        if mode in {"no_preheater", "other_heat_recovery_auxiliary_zero", "no_cooling_storage", "component_absent"}:
            traces.append(_trace("MC001_CHAPTER_3_ABSENT_AUXILIARY_BRANCH", str(mode), {"stageOutputKWh": output_kwh}, 0))
            return 0.0, _source("NUMERICALLY_IMPLEMENTED", str(mode)), traces
        if service == "heating" and stage_id == "distribution" and mode == "heating_hydronic_pump_auxiliary":
            pressure_input = contract.get("pressureDropInput")
            pressure = heating_formula.hydronic_pressure_drop_kpa(
                _finite(pressure_input.get("componentResistanceFactor"), "componentResistanceFactor"),
                _finite(pressure_input.get("maxLinearPressureDropKPaPerM"), "maxLinearPressureDropKPaPerM"),
                _finite(pressure_input.get("maxCircuitLengthM"), "maxCircuitLengthM"),
                _finite(pressure_input.get("additionalPressureDropKPa"), "additionalPressureDropKPa"),
            ) if isinstance(pressure_input, dict) else _finite(contract.get("pressureDropKPa"), "pressureDropKPa")
            design_power = heating_formula.hydronic_design_power_kw(pressure, _finite(contract.get("designFlowRateM3PerH"), "designFlowRateM3PerH"))
            reference_power = heating_formula.hydronic_reference_pump_power_kw(design_power)
            use_factor = heating_formula.hydronic_pump_energy_use_factor(
                reference_power,
                design_power,
                _finite(contract.get("controlConstantCp1"), "controlConstantCp1"),
                _finite(contract.get("controlConstantCp2"), "controlConstantCp2"),
                _finite(contract.get("operationLoadFactor"), "operationLoadFactor"),
                _finite(contract.get("energyEfficiencyIndex"), "energyEfficiencyIndex"),
            )
            pump_energy = heating_formula.hydronic_pump_energy_kwh(
                design_power,
                _finite(contract.get("operationLoadFactor"), "operationLoadFactor"),
                _field(contract, "operationHours", month_index, "operationHours"),
                _finite(contract.get("correctionFactor"), "correctionFactor"),
            )
            value = heating_formula.heating_distribution_auxiliary_energy_kwh(pump_energy, use_factor)
            if _is_finite_number(contract.get("setbackPumpPowerKW")) and _field_optional(contract, "setbackCalculationHours", month_index, None) is not None:
                value += heating_formula.heating_distribution_setback_pump_energy_kwh(
                    _finite(contract.get("setbackPumpPowerKW"), "setbackPumpPowerKW"),
                    _field(contract, "setbackCalculationHours", month_index, "setbackCalculationHours"),
                )
            if _field_optional(contract, "boostCalculationHours", month_index, None) is not None:
                value += heating_formula.heating_distribution_boost_pump_energy_kwh(
                    design_power,
                    _field(contract, "boostCalculationHours", month_index, "boostCalculationHours"),
                )
            if _is_finite_number(contract.get("recoverableFraction")):
                _stage_private(stage, "aux_derived", {"auxiliaryRecoverableFractionToHeating": _finite(contract.get("recoverableFraction"), "recoverableFraction")})
            traces.append(_trace("MC001_3_HEATING_DISTRIBUTION_HYDRONIC_PUMP_AUXILIARY", mode, {"pressureDropKPa": pressure, "designPowerKW": design_power, "pumpEnergyKWh": pump_energy, "pumpEnergyUseFactor": use_factor}, value))
            return value, _result_source("mc001_heating_distribution_pump_component_contract", mode), traces
        if service == "heating" and stage_id == "generation" and mode == "heating_generator_auxiliary_coefficients":
            hours = _field(contract, "operationHours", month_index, "operationHours")
            power = heating_formula.generator_auxiliary_power_from_coefficients_kw(
                _finite(contract.get("coefficientC7"), "coefficientC7"),
                _finite(contract.get("coefficientC8"), "coefficientC8"),
                _finite(contract.get("nominalPowerKW"), "nominalPowerKW"),
            )
            value = heating_formula.generator_auxiliary_energy_kwh(power, hours)
            derived = {}
            if _is_finite_number(contract.get("recoveredAuxiliaryFraction")):
                recovered = _finite(contract.get("recoveredAuxiliaryFraction"), "recoveredAuxiliaryFraction")
                derived["auxiliaryRecoveredFraction"] = recovered
                derived["auxiliaryRecoverableFractionToHeating"] = heating_formula.generator_auxiliary_recoverable_fraction(recovered)
            _stage_private(stage, "aux_derived", derived)
            traces.append(_trace("MC001_3_37_HEATING_GENERATOR_AUXILIARY_ENERGY", mode, {"auxiliaryPowerKW": power, "operationHours": hours}, value))
            return value, _result_source("mc001_heating_generator_auxiliary_coefficient_contract", mode), traces
        if service == "heating" and stage_id == "generation" and mode == "heating_generator_auxiliary_power_curve":
            hours = _field(contract, "operationHours", month_index, "operationHours")
            nominal = _finite(contract.get("nominalPowerKW"), "nominalPowerKW")
            load_factor = heating_formula.heating_generator_load_factor(output_kwh, nominal, hours)
            intermediate = heating_formula.intermediate_load_factor(
                _finite(contract.get("intermediatePowerKW"), "intermediatePowerKW"),
                nominal,
            )
            if load_factor <= intermediate:
                power = heating_formula.generator_auxiliary_power_low_load_kw(
                    load_factor,
                    intermediate,
                    _finite(contract.get("auxiliaryPowerIntermediateKW"), "auxiliaryPowerIntermediateKW"),
                    _finite(contract.get("auxiliaryPowerStandbyKW"), "auxiliaryPowerStandbyKW"),
                )
                branch = "low_load_auxiliary_power"
            else:
                power = heating_formula.generator_auxiliary_power_high_load_kw(
                    load_factor,
                    intermediate,
                    _finite(contract.get("auxiliaryPowerNominalKW"), "auxiliaryPowerNominalKW"),
                    _finite(contract.get("auxiliaryPowerIntermediateKW"), "auxiliaryPowerIntermediateKW"),
                )
                branch = "high_load_auxiliary_power"
            value = heating_formula.generator_auxiliary_energy_kwh(power, hours)
            derived = {}
            if _is_finite_number(contract.get("recoveredAuxiliaryFraction")):
                recovered = _finite(contract.get("recoveredAuxiliaryFraction"), "recoveredAuxiliaryFraction")
                derived["auxiliaryRecoveredFraction"] = recovered
                derived["auxiliaryRecoverableFractionToHeating"] = heating_formula.generator_auxiliary_recoverable_fraction(recovered)
            _stage_private(stage, "aux_derived", derived)
            traces.append(_trace("MC001_3_37_HEATING_GENERATOR_AUXILIARY_ENERGY", f"{mode}_{branch}", {"auxiliaryPowerKW": power, "operationHours": hours}, value))
            return value, _result_source("mc001_heating_generator_auxiliary_power_curve_contract", mode, {"branch": branch}), traces
        if service == "dhw" and stage_id == "distribution" and mode == "dhw_recirculation_pump_auxiliary":
            pressure_input = contract.get("pressureDropInput")
            pressure = dhw_formula.pressure_drop_kpa(
                _finite(pressure_input.get("componentResistanceFactor"), "componentResistanceFactor"),
                _finite(pressure_input.get("maxLinearPressureDropKPaPerM"), "maxLinearPressureDropKPaPerM"),
                _finite(pressure_input.get("maxCircuitLengthM"), "maxCircuitLengthM"),
                _finite(pressure_input.get("additionalPressureDropKPa"), "additionalPressureDropKPa"),
            ) if isinstance(pressure_input, dict) else _finite(contract.get("pressureDropKPa"), "pressureDropKPa")
            design_power = dhw_formula.pump_design_power_kw(pressure, _finite(contract.get("designFlowRateM3PerH"), "designFlowRateM3PerH"))
            reference_power = dhw_formula.reference_pump_power_kw(design_power)
            efficiency_factor = dhw_formula.pump_efficiency_factor(reference_power, design_power)
            use_factor = dhw_formula.pump_energy_use_factor(
                efficiency_factor,
                _finite(contract.get("controlConstantCp1"), "controlConstantCp1"),
                _finite(contract.get("controlConstantCp2"), "controlConstantCp2"),
                _finite(contract.get("operationLoadFactor"), "operationLoadFactor"),
                _finite(contract.get("energyEfficiencyIndex"), "energyEfficiencyIndex"),
            )
            pump_energy = dhw_formula.recirculation_pump_energy_kwh(
                design_power,
                _finite(contract.get("operationLoadFactor"), "operationLoadFactor"),
                _field(contract, "operationTimeHours", month_index, "operationTimeHours"),
                _finite(contract.get("correctionFactor"), "correctionFactor"),
            )
            value = dhw_formula.auxiliary_distribution_energy_kwh(pump_energy, use_factor)
            if _is_finite_number(contract.get("recoverableFraction")):
                _stage_private(stage, "aux_derived", {"auxiliaryRecoverableFractionToHeating": _finite(contract.get("recoverableFraction"), "recoverableFraction")})
            traces.append(_trace("MC001_3_220_DHW_AUXILIARY_DISTRIBUTION_ENERGY", mode, {"pumpDesignPowerKW": design_power, "pumpEnergyKWh": pump_energy, "pumpEnergyUseFactor": use_factor}, value))
            return value, _result_source("mc001_dhw_pump_component_contract", mode), traces
        if service == "dhw" and stage_id == "distribution" and mode == "dhw_heat_tracing_auxiliary":
            segments = _prepare_dhw_pipe_segments(contract.get("protectedPipeSegments", []), month_index, "protectedPipeSegments")
            protected_loss = dhw_formula.distribution_loss_with_pipe_segments(
                segments,
                _field(contract, "operationTimeHours", month_index, "operationTimeHours"),
            )
            value = dhw_formula.heat_tracing_auxiliary_energy_kwh(protected_loss)
            if _is_finite_number(contract.get("recoverableFraction")):
                _stage_private(stage, "aux_derived", {"auxiliaryRecoverableFractionToHeating": _finite(contract.get("recoverableFraction"), "recoverableFraction")})
            traces.append(_trace("MC001_3_224_DHW_HEAT_TRACING_AUXILIARY_ENERGY", mode, {"protectedPipeDistributionLossKWh": protected_loss}, value))
            return value, _result_source("mc001_dhw_heat_tracing_component_contract", mode), traces
        if mode == "cooling_distribution_factor":
            factor = _field(contract, "auxiliaryFactor", month_index, "auxiliaryFactor")
            useful = _field_optional(contract, "usefulCoolingDemandKWh", month_index, _stage_context_value(stage_context, "allocatedUsefulDemandKWh", output_kwh))
            emission_loss = _field_optional(contract, "emissionLossKWh", month_index, _previous_stage_value(stage_context, "emission", "lossKWh", 0))
            ahu_output = _field_optional(contract, "ahuCoolingOutputRequiredKWh", month_index, _field_optional(contract, "ahuOutputKWh", month_index, 0))
            value = cooling_formula.cooling_distribution_auxiliary_kwh(factor, useful or 0, emission_loss or 0, ahu_output or 0)
            traces.append(_trace("MC001_3_COOLING_DISTRIBUTION_AUXILIARY_FACTOR", mode, {"auxiliaryFactor": factor, "usefulCoolingDemandKWh": useful, "emissionLossKWh": emission_loss, "ahuCoolingOutputRequiredKWh": ahu_output}, value))
            return value, _source("NUMERICALLY_IMPLEMENTED", mode), traces
        if service == "cooling" and stage_id == "storage" and mode == "cooling_storage_pump_auxiliary":
            total = 0.0
            side_values = {}
            for side, fallback in (("outputSide", output_kwh), ("inputSide", 0.0)):
                storage_energy = _field_optional(contract, f"{side}StorageEnergyKWh", month_index, fallback)
                if storage_energy is None:
                    continue
                hours = cooling_formula.cooling_storage_pump_operation_hours(
                    storage_energy,
                    _field_optional(contract, f"{side}MediumSpecificHeatKWhPerKgK", month_index, contract.get("mediumSpecificHeatKWhPerKgK")),
                    _field_optional(contract, f"{side}MediumDensityKgPerM3", month_index, contract.get("mediumDensityKgPerM3")),
                    _field_optional(contract, f"{side}PumpVolumeFlowM3PerH", month_index, contract.get("pumpVolumeFlowM3PerH")),
                    _field_optional(contract, f"{side}SupplyTemperatureC", month_index, contract.get("supplyTemperatureC")),
                    _field_optional(contract, f"{side}ReturnTemperatureC", month_index, contract.get("returnTemperatureC")),
                )
                auxiliary = cooling_formula.cooling_storage_auxiliary_kwh(
                    hours,
                    _field_optional(contract, f"{side}PumpElectricPowerKW", month_index, contract.get("pumpElectricPowerKW")),
                )
                side_values[side] = auxiliary
                total += auxiliary
            if not side_values:
                raise Chapter3InputError("cooling_storage_pump_auxiliary requires storage energy inputs")
            traces.append(_trace("MC001_3_119_COOLING_STORAGE_AUXILIARY_TOTAL", mode, side_values, total))
            return total, _source("NUMERICALLY_IMPLEMENTED", mode), traces
        if mode in {"cooling_compression_heat_rejection_auxiliary", "cooling_absorption_heat_rejection_auxiliary"}:
            return _calculate_cooling_generator_contract(contract, stage, month_index, output_kwh, stage_context)
        if mode == "rotary_heat_recovery_auxiliary":
            power = _month_value(contract.get("maxRotaryPowerKW"), month_index, "maxRotaryPowerKW")
            hours = _month_value(contract.get("calculationHours"), month_index, "calculationHours")
            ratio = _month_value(contract.get("rotationRatio"), month_index, "rotationRatio")
            value = ventilation_formula.rotary_heat_recovery_auxiliary_energy_kwh(power, hours, ratio)
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
    previous_stages: dict[str, dict[str, Any]] = {}
    for stage_id in SERVICE_STAGE_IDS[service]:
        stage = stages_by_id.get(stage_id)
        if stage is None:
            raise Chapter3InputError(f"{service}.{stage_id} stage is required")
        _stage_private(stage, "loss_derived", {})
        _stage_private(stage, "aux_derived", {})
        _stage_private(stage, "stage_input_override", None)
        stage_context = {
            "allocatedUsefulDemandKWh": useful_demand_kwh * allocation_fraction,
            "stageOutputKWh": output,
            "previousStages": previous_stages,
        }
        loss, loss_source, loss_traces = _resolve_stage_loss(stage, service, stage_id, month_index, output, stage_context)
        aux, aux_source, aux_traces = _resolve_stage_auxiliary(stage, service, stage_id, month_index, output, stage_context)
        traces.extend(loss_traces)
        traces.extend(aux_traces)
        override = stage.get("_p11c_stage_input_override") or _input_override(stage)
        if override:
            input_kwh = override["valueKWh"]
            input_source = override["source"]
            carrier = override["carrierEnergy"]
            supplied_cooling = override["suppliedCoolingKWh"]
            unmet_cooling = float(override["unmetCoolingKWh"] or 0)
            formula_id = override["formulaId"]
        else:
            derived = {
                **(stage.get("_p11c_loss_derived") or {}),
                **(stage.get("_p11c_aux_derived") or {}),
            }
            recovered_aux = _optional(stage.get("auxiliaryRecoveredFraction", derived.get("auxiliaryRecoveredFraction")), 0)
            recovered_loss = _optional(stage.get("lossRecoveredFraction", derived.get("lossRecoveredFraction")), 0)
            input_kwh = subsystem_input_energy_kwh(output, loss, aux, recovered_aux, recovered_loss)
            input_source = _source("NUMERICALLY_IMPLEMENTED", "mc001_stage_balance")
            carrier = {}
            supplied_cooling = None
            unmet_cooling = 0.0
            formula_id = "MC001_3_SUBSYSTEM_INPUT_ENERGY_BALANCE"
        derived = {
            **(stage.get("_p11c_loss_derived") or {}),
            **(stage.get("_p11c_aux_derived") or {}),
        }
        recoverable = (
            loss * _optional(stage.get("lossRecoverableFractionToHeating", derived.get("lossRecoverableFractionToHeating")), 0)
            + aux * _optional(stage.get("auxiliaryRecoverableFractionToHeating", derived.get("auxiliaryRecoverableFractionToHeating")), 0)
        )
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
        previous_stages[stage_id] = stage_results[-1]
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
        explicit_hours = generator.get("operationHours")
        if explicit_hours is not None:
            hours = _month_value(explicit_hours, month_index, f"{component_id}.operationHours")
            hours_source = "operation_schedule_input"
        elif isinstance(generator.get("operationTimeCalculation"), dict):
            operation_input = {
                key: _month_value(value, month_index, f"{component_id}.operationTimeCalculation.{key}")
                for key, value in generator["operationTimeCalculation"].items()
            }
            hours = heating_formula.heating_generator_operation_time(**operation_input)
            hours_source = "mc001_central_generator_operation_time"
        else:
            raise Chapter3InputError(f"{component_id}.operationHours or operationTimeCalculation is required")
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
            {"componentId": component_id, "connectedLoads": connected, "operationHours": hours, "operationHoursSource": hours_source, "lossPowerKW": loss_power, "auxiliaryPowerKW": aux_power},
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
        heat_recovery, heat_recovery_traces = _ventilation_heat_recovery_auxiliary(system, month_index)
        preheat, preheat_traces = _ventilation_preheat_auxiliary(system, month_index)
        control, control_traces = _ventilation_control_auxiliary(system, month_index)
        thermal_relations, thermal_traces = _ventilation_thermal_relations(system, month_index)
        traces.extend(heat_recovery_traces)
        traces.extend(preheat_traces)
        traces.extend(control_traces)
        traces.extend(thermal_traces)
        total = fan_energy + heat_recovery + preheat + control
        result = {
            "systemId": system.get("systemId") or f"ventilation-system-{index + 1}",
            "fanElectricEnergyKWh": fan_energy,
            "heatRecoveryAuxiliaryKWh": heat_recovery,
            "preheatAuxiliaryKWh": preheat,
            "controlAuxiliaryKWh": control,
            "totalAuxiliaryKWh": total,
            "carrierEnergy": {"electricity": total} if total > 0 else {},
            "thermalRelations": thermal_relations,
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


def _ventilation_hours(contract: dict[str, Any], fan: dict[str, Any], month_index: int) -> float:
    return _field_optional(contract, "calculationHours", month_index, _field_optional(fan, "calculationHours", month_index, None))  # type: ignore[return-value]


def _ventilation_heat_recovery_auxiliary(system: dict[str, Any], month_index: int) -> tuple[float, list[dict[str, Any]]]:
    contract = _monthly_component(system.get("heatRecoveryAuxiliaryCalculation"), month_index)
    if not isinstance(contract, dict):
        return _month_value(system.get("heatRecoveryAuxiliaryKWhPerMonth"), month_index, "ventilation.heatRecoveryAuxiliaryKWhPerMonth", required=False, default=0), []
    fan = system.get("fanElectricEnergyInput") or {}
    hours = _finite(_ventilation_hours(contract, fan, month_index), "heatRecovery.calculationHours")
    mode = contract.get("mode")
    if mode == "rotary_heat_recovery_auxiliary":
        value = ventilation_formula.rotary_heat_recovery_auxiliary_energy_kwh(
            _finite(contract.get("maxRotaryPowerKW"), "maxRotaryPowerKW"),
            hours,
            _field(contract, "rotationRatio", month_index, "rotationRatio"),
        )
    elif mode == "pump_heat_recovery_auxiliary":
        value = ventilation_formula.pump_heat_recovery_auxiliary_energy_kwh(
            _field_optional(contract, "supplyAirFlowM3PerH", month_index, _field_optional(fan, "supplyAirFlowM3PerH", month_index, None)),
            _finite(contract.get("outdoorAirFraction"), "outdoorAirFraction"),
            _finite(contract.get("maxPumpSpecificPowerKWhPerM3"), "maxPumpSpecificPowerKWhPerM3"),
            hours,
            _finite(contract.get("minimumPartLoadFactor"), "minimumPartLoadFactor"),
            _field(contract, "recoveredHeatKWh", month_index, "recoveredHeatKWh"),
            _finite(contract.get("maxRecoveredHeatPowerKW"), "maxRecoveredHeatPowerKW"),
        )
    elif mode == "other_heat_recovery_auxiliary_zero":
        value = ventilation_formula.no_heat_recovery_auxiliary_energy_kwh()
    else:
        raise Chapter3InputError("unsupported ventilation heat-recovery auxiliary mode")
    return value, [_trace("MC001_3_69_3_70_HEAT_RECOVERY_AUXILIARY", str(mode), {"systemId": system.get("systemId")}, value)]


def _ventilation_preheat_auxiliary(system: dict[str, Any], month_index: int) -> tuple[float, list[dict[str, Any]]]:
    contract = _monthly_component(system.get("preheatAuxiliaryCalculation"), month_index)
    if not isinstance(contract, dict):
        return _month_value(system.get("preheatAuxiliaryKWhPerMonth"), month_index, "ventilation.preheatAuxiliaryKWhPerMonth", required=False, default=0), []
    fan = system.get("fanElectricEnergyInput") or {}
    hours = _finite(_ventilation_hours(contract, fan, month_index), "preheat.calculationHours")
    mode = contract.get("mode")
    if mode == "preheater_energy":
        value = ventilation_formula.preheater_energy_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            _field_optional(contract, "supplyAirFlowM3PerH", month_index, _field_optional(fan, "supplyAirFlowM3PerH", month_index, None)),
            _finite(contract.get("outdoorAirFraction"), "outdoorAirFraction"),
            _field(contract, "frostProtectionTemperatureC", month_index, "frostProtectionTemperatureC"),
            _field(contract, "outdoorTemperatureC", month_index, "outdoorTemperatureC"),
            hours,
        )
    elif mode == "no_preheater":
        value = ventilation_formula.no_preheater_energy_kwh()
    else:
        raise Chapter3InputError("unsupported ventilation preheat mode")
    return value, [_trace("MC001_3_73_3_74_PREHEAT_AUXILIARY", str(mode), {"systemId": system.get("systemId")}, value)]


def _ventilation_control_auxiliary(system: dict[str, Any], month_index: int) -> tuple[float, list[dict[str, Any]]]:
    contract = _monthly_component(system.get("controlAuxiliaryCalculation"), month_index)
    if not isinstance(contract, dict):
        return _month_value(system.get("controlAuxiliaryKWhPerMonth"), month_index, "ventilation.controlAuxiliaryKWhPerMonth", required=False, default=0), []
    if contract.get("mode") != "control_auxiliary_energy":
        raise Chapter3InputError("unsupported ventilation control auxiliary mode")
    fan = system.get("fanElectricEnergyInput") or {}
    value = ventilation_formula.ventilation_control_auxiliary_energy_kwh(
        _finite(contract.get("controllerPowerKW"), "controllerPowerKW"),
        _field(contract, "operationFactor", month_index, "operationFactor"),
        _finite(_ventilation_hours(contract, fan, month_index), "control.calculationHours"),
    )
    return value, [_trace("MC001_3_75_VENTILATION_CONTROL_AUXILIARY", "control_auxiliary_energy", {"systemId": system.get("systemId")}, value)]


def _ahu_result(value: float, formula_id: str, unit: str = "kWh") -> dict[str, Any]:
    return {"status": "calculated", "value": value, "valueKWh": value if unit == "kWh" else None, "valueC": value if unit == "degC" else None, "unit": unit, "formulaId": formula_id}


def _ventilation_thermal_relations(system: dict[str, Any], month_index: int) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    contracts = system.get("thermalRelationCalculations") or system.get("ahuThermalRelationCalculations")
    if not isinstance(contracts, dict):
        return {}, []
    fan = system.get("fanElectricEnergyInput") or {}
    relations: dict[str, Any] = {}
    traces: list[dict[str, Any]] = []

    def add(key: str, value: float, formula_id: str, unit: str = "kWh") -> None:
        relations[key] = _ahu_result(value, formula_id, unit)
        traces.append(_trace(formula_id, key, {"systemId": system.get("systemId")}, value))

    def hours(contract: dict[str, Any]) -> float:
        return _finite(_ventilation_hours(contract, fan, month_index), "thermalRelation.calculationHours")

    contract = _monthly_component(contracts.get("fanTemperatureRise"), month_index)
    if isinstance(contract, dict):
        if contract.get("mode") == "balanced_residential_fan_temperature_rise":
            add("fanTemperatureRise", ventilation_formula.balanced_residential_fan_temperature_rise_k(), "MC001_3_52_BALANCED_RESIDENTIAL_FAN_TEMPERATURE_RISE", "K")
        elif contract.get("mode") == "fan_temperature_rise":
            add("fanTemperatureRise", ventilation_formula.fan_temperature_rise_k(
                _finite(contract.get("fanPressureDropPa"), "fanPressureDropPa"),
                _finite(contract.get("fanReadinessFactor"), "fanReadinessFactor"),
                _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
                _finite(contract.get("airSpecificHeatKWhPerKgK"), "airSpecificHeatKWhPerKgK"),
                _finite(contract.get("fanEfficiency"), "fanEfficiency"),
            ), "MC001_3_51_FAN_TEMPERATURE_RISE", "K")
    contract = _monthly_component(contracts.get("extractAirTemperatureForRecovery"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "extract_air_temperature_for_recovery":
        add("extractAirTemperatureForRecovery", ventilation_formula.extract_air_temperature_for_recovery_c(
            str(contract.get("extractFanPosition")),
            _finite(contract.get("extractAirTemperatureAfterDistributionC"), "extractAirTemperatureAfterDistributionC"),
            _finite(contract.get("extractFanTemperatureRiseK", 0), "extractFanTemperatureRiseK"),
        ), "MC001_3_53_EXTRACT_AIR_TEMPERATURE_FOR_RECOVERY", "degC")
    contract = _monthly_component(contracts.get("heatingCoil"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_heating_coil_required_energy":
        add("heatingCoilRequiredEnergy", ventilation_formula.ahu_heating_coil_required_energy_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            _finite(contract.get("supplyAirFlowM3PerH"), "supplyAirFlowM3PerH"),
            _finite(contract.get("requiredSupplyTemperatureC"), "requiredSupplyTemperatureC"),
            _finite(contract.get("humidificationTemperatureRiseK"), "humidificationTemperatureRiseK"),
            _finite(contract.get("outdoorTemperatureC"), "outdoorTemperatureC"),
            hours(contract),
        ), "MC001_3_40_AHU_HEATING_COIL_REQUIRED_ENERGY")
    contract = _monthly_component(contracts.get("heatRecovery"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_heat_recovery_energy":
        add("heatRecoveryEnergy", ventilation_formula.ahu_heat_recovery_energy_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            _finite(contract.get("moistureLatentHeatKJPerKg"), "moistureLatentHeatKJPerKg"),
            _finite(contract.get("supplyAirFlowM3PerH"), "supplyAirFlowM3PerH"),
            _finite(contract.get("outdoorAirFraction"), "outdoorAirFraction"),
            _finite(contract.get("supplyTemperatureAfterRecoveryC"), "supplyTemperatureAfterRecoveryC"),
            _finite(contract.get("outdoorPreheatTemperatureC"), "outdoorPreheatTemperatureC"),
            _finite(contract.get("supplyHumidityAfterRecoveryKgPerKg"), "supplyHumidityAfterRecoveryKgPerKg"),
            _finite(contract.get("outdoorPreheatHumidityKgPerKg"), "outdoorPreheatHumidityKgPerKg"),
            hours(contract),
        ), "MC001_3_41_AHU_HEAT_RECOVERY_ENERGY")
    contract = _monthly_component(contracts.get("recirculationHeating"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_recirculation_air_heating_energy":
        add("recirculationAirHeatingEnergy", ventilation_formula.ahu_recirculation_air_heating_energy_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            _finite(contract.get("extractAirFlowM3PerH"), "extractAirFlowM3PerH"),
            _finite(contract.get("outdoorAirFraction"), "outdoorAirFraction"),
            _finite(contract.get("extractTemperatureIntoRecoveryC"), "extractTemperatureIntoRecoveryC"),
            _finite(contract.get("outdoorTemperatureC"), "outdoorTemperatureC"),
            hours(contract),
        ), "MC001_3_42_AHU_RECIRCULATION_AIR_HEATING_ENERGY")
    contract = _monthly_component(contracts.get("coolingCoil"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_cooling_coil_required_energy":
        add("coolingCoilRequiredEnergy", ventilation_formula.ahu_cooling_coil_required_energy_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            _finite(contract.get("moistureLatentHeatKJPerKg"), "moistureLatentHeatKJPerKg"),
            _finite(contract.get("supplyAirFlowM3PerH"), "supplyAirFlowM3PerH"),
            _finite(contract.get("recirculatedSupplyTemperatureC"), "recirculatedSupplyTemperatureC"),
            _finite(contract.get("requiredCoolingSupplyTemperatureC"), "requiredCoolingSupplyTemperatureC"),
            _finite(contract.get("recirculatedHumidityKgPerKg"), "recirculatedHumidityKgPerKg"),
            _finite(contract.get("requiredCoolingHumidityKgPerKg"), "requiredCoolingHumidityKgPerKg"),
            hours(contract),
        ), "MC001_3_43_AHU_COOLING_COIL_REQUIRED_ENERGY")
    contract = _monthly_component(contracts.get("dehumidification"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_dehumidification_cooling_energy":
        add("dehumidificationCoolingEnergy", ventilation_formula.ahu_dehumidification_cooling_energy_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            _finite(contract.get("moistureLatentHeatKJPerKg"), "moistureLatentHeatKJPerKg"),
            _finite(contract.get("supplyAirFlowM3PerH"), "supplyAirFlowM3PerH"),
            _finite(contract.get("recirculatedSupplyTemperatureC"), "recirculatedSupplyTemperatureC"),
            _finite(contract.get("ahuRequiredSupplyTemperatureC"), "ahuRequiredSupplyTemperatureC"),
            _finite(contract.get("requiredCoolingSupplyTemperatureC"), "requiredCoolingSupplyTemperatureC"),
            _finite(contract.get("recirculatedHumidityKgPerKg"), "recirculatedHumidityKgPerKg"),
            _finite(contract.get("dehumidificationHumidityReductionKgPerKg"), "dehumidificationHumidityReductionKgPerKg"),
            _finite(contract.get("requiredCoolingHumidityKgPerKg"), "requiredCoolingHumidityKgPerKg"),
            hours(contract),
        ), "MC001_3_44_AHU_DEHUMIDIFICATION_COOLING_ENERGY")
    contract = _monthly_component(contracts.get("humidification"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_humidification_generator_input_energy":
        add("humidificationGeneratorInputEnergy", ventilation_formula.ahu_humidification_generator_input_energy_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("moistureLatentHeatKJPerKg"), "moistureLatentHeatKJPerKg"),
            _finite(contract.get("supplyAirFlowM3PerH"), "supplyAirFlowM3PerH"),
            _finite(contract.get("targetHumidityKgPerKg"), "targetHumidityKgPerKg"),
            _finite(contract.get("sourceHumidityKgPerKg"), "sourceHumidityKgPerKg"),
            hours(contract),
        ), "MC001_3_45_AHU_HUMIDIFICATION_GENERATOR_INPUT_ENERGY")
    contract = _monthly_component(contracts.get("humidificationAuxiliary"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_non_steam_humidification_auxiliary_zero":
        add("humidificationAuxiliaryEnergy", ventilation_formula.ahu_non_steam_humidification_auxiliary_energy_kwh(), "MC001_3_46_AHU_NON_STEAM_HUMIDIFICATION_AUXILIARY_ENERGY")
    generation_loss = None
    contract = _monthly_component(contracts.get("generationLoss"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_generation_loss_conditioned":
        generation_loss = ventilation_formula.ahu_generation_loss_conditioned_kwh(
            _finite(contract.get("supplyAuKWPerK"), "supplyAuKWPerK"),
            _finite(contract.get("supplyTemperatureC"), "supplyTemperatureC"),
            _finite(contract.get("extractAuKWPerK"), "extractAuKWPerK"),
            _finite(contract.get("extractTemperatureC"), "extractTemperatureC"),
            _finite(contract.get("zoneTemperatureC"), "zoneTemperatureC"),
            _finite(contract.get("supplyLeakageM3PerH"), "supplyLeakageM3PerH"),
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            hours(contract),
        )
        add("generationLoss", generation_loss, "MC001_3_47_AHU_GENERATION_LOSS_CONDITIONED")
    elif isinstance(contract, dict) and contract.get("mode") == "ahu_generation_loss_unconditioned":
        generation_loss = ventilation_formula.ahu_generation_loss_unconditioned_kwh(
            _finite(contract.get("supplyAuKWPerK"), "supplyAuKWPerK"),
            _finite(contract.get("supplyTemperatureC"), "supplyTemperatureC"),
            _finite(contract.get("extractAuKWPerK"), "extractAuKWPerK"),
            _finite(contract.get("extractTemperatureC"), "extractTemperatureC"),
            _finite(contract.get("surroundingTemperatureC"), "surroundingTemperatureC"),
            _finite(contract.get("supplyLeakageM3PerH"), "supplyLeakageM3PerH"),
            _finite(contract.get("extractLeakageM3PerH"), "extractLeakageM3PerH"),
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            hours(contract),
        )
        add("generationLoss", generation_loss, "MC001_3_48_AHU_GENERATION_LOSS_UNCONDITIONED")
    contract = _monthly_component(contracts.get("recoverableGenerationLoss"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_recoverable_generation_loss":
        add("recoverableGenerationLoss", ventilation_formula.ahu_recoverable_generation_loss_kwh(
            _field_optional(contract, "ahuGenerationLossKWh", month_index, generation_loss),
            str(contract.get("ahuLocation")),
        ), "MC001_3_49_AHU_RECOVERABLE_GENERATION_LOSS")
    simple_relations = (
        ("fanEfficiency", "fan_efficiency_from_nominal_and_airflow_factor", "MC001_3_54_FAN_EFFICIENCY_FROM_NOMINAL_AND_AIRFLOW_FACTOR", ventilation_formula.fan_efficiency_from_nominal_and_airflow_factor, ("nominalFanEfficiency", "airflowFunctionFactor"), "value"),
        ("quadraticPressureDrop", "quadratic_pressure_drop", "MC001_3_55_QUADRATIC_PRESSURE_DROP", ventilation_formula.quadratic_pressure_drop_pa, ("designPressureDropPa", "currentFlowM3PerH", "nominalFlowM3PerH"), "Pa"),
        ("multiZoneConstantPressureDrop", "multizone_constant_pressure_drop", "MC001_3_56_MULTIZONE_CONSTANT_PRESSURE_DROP", ventilation_formula.multizone_constant_pressure_drop_pa, ("designPressureDropPa", "currentFlowM3PerH", "nominalFlowM3PerH", "controlFactor"), "Pa"),
        ("multiZoneMinimumPressureDrop", "multizone_minimum_pressure_drop", "MC001_3_57_MULTIZONE_MINIMUM_PRESSURE_DROP", ventilation_formula.multizone_minimum_pressure_drop_pa, ("designPressureDropPa", "currentFlowM3PerH", "nominalFlowM3PerH", "controlFactor", "maximumFlowFactor"), "Pa"),
        ("fanEnergyAssignedToHeatRecovery", "fan_energy_assigned_to_heat_recovery_pressure", "MC001_3_58_FAN_ENERGY_ASSIGNED_TO_HEAT_RECOVERY_PRESSURE", ventilation_formula.fan_energy_assigned_to_heat_recovery_pressure_kwh, ("fanElectricEnergyKWh", "heatRecoveryDesignPressureDropPa", "supplyDesignPressureDropPa", "extractDesignPressureDropPa"), "kWh"),
        ("humidificationPumpAuxiliary", "humidification_pump_auxiliary_energy", "MC001_3_61_HUMIDIFICATION_PUMP_AUXILIARY_ENERGY", ventilation_formula.humidification_pump_auxiliary_energy_kwh, ("designHumidificationAirFlowM3PerH", "designSpecificPumpEnergyKWhPerM3", "partLoadFactor", "calculationHours"), "kWh"),
        ("ductLeakageFactor", "duct_leakage_factor", "MC001_3_62_DUCT_LEAKAGE_FACTOR", ventilation_formula.duct_leakage_factor, ("leakageAirFlowM3PerH", "requiredAirFlowM3PerH"), "value"),
        ("ductLeakageAirFlow", "duct_leakage_air_flow", "MC001_3_63_DUCT_LEAKAGE_AIR_FLOW", ventilation_formula.duct_leakage_air_flow_m3_h, ("ductAreaM2", "leakageCoefficient", "pressureDifferencePa", "exponent"), "m3/h"),
        ("ahuLeakageFactor", "ahu_leakage_factor", "MC001_3_64_AHU_LEAKAGE_FACTOR", ventilation_formula.ahu_leakage_factor, ("ahuLeakageAirFlowM3PerH", "distributionAirFlowM3PerH", "ahuPressurePa", "testPressurePa"), "value"),
        ("supplyAirFlowZoneAllocation", "supply_air_flow_zone_allocation", "MC001_3_67_SUPPLY_AIR_FLOW_ZONE_ALLOCATION", ventilation_formula.supply_air_flow_zone_allocation_m3_h, ("supplyDistributionAirFlowM3PerH", "zoneRequiredAirFlowM3PerH", "totalRequiredAirFlowM3PerH"), "m3/h"),
        ("extractAirFlowZoneAllocation", "extract_air_flow_zone_allocation", "MC001_3_68_EXTRACT_AIR_FLOW_ZONE_ALLOCATION", ventilation_formula.extract_air_flow_zone_allocation_m3_h, ("extractDistributionAirFlowM3PerH", "zoneRequiredAirFlowM3PerH", "totalRequiredAirFlowM3PerH"), "m3/h"),
        ("ductLeakageFlowFromFactor", "duct_leakage_flow_from_factor", "MC001_3_91_DUCT_LEAKAGE_FLOW_FROM_FACTOR", ventilation_formula.duct_leakage_flow_from_factor_m3_h, ("leakageFactor", "zoneAirFlowM3PerH"), "m3/h"),
        ("partLoadAhuAirFlow", "part_load_ahu_air_flow", "MC001_3_93_PART_LOAD_AHU_AIR_FLOW", ventilation_formula.part_load_ahu_air_flow_m3_h, ("partLoadFactor", "nominalAirFlowM3PerH"), "m3/h"),
        ("maximumFlowFactorFromPartLoad", "maximum_flow_factor_from_part_load", "MC001_3_92_MAXIMUM_FLOW_FACTOR_FROM_PART_LOAD", ventilation_formula.maximum_flow_factor_from_part_load, ("partLoadFactor", "deltaFlowFactor"), "value"),
    )
    for key, mode, formula_id, func, fields, unit in simple_relations:
        contract = _monthly_component(contracts.get(key), month_index)
        if isinstance(contract, dict) and contract.get("mode") == mode:
            add(key, func(*[_finite(contract.get(field), field) for field in fields]), formula_id, unit)
    contract = _monthly_component(contracts.get("requiredSupplyDistributionAirFlow"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "required_supply_distribution_air_flow":
        add("requiredSupplyDistributionAirFlow", ventilation_formula.required_supply_distribution_air_flow_m3_h(_as_list_of_pairs(contract.get("zoneRequiredAirFlows"))), "MC001_3_65_REQUIRED_SUPPLY_DISTRIBUTION_AIR_FLOW", "m3/h")
    contract = _monthly_component(contracts.get("requiredExtractDistributionAirFlow"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "required_extract_distribution_air_flow":
        add("requiredExtractDistributionAirFlow", ventilation_formula.required_extract_distribution_air_flow_m3_h(_as_list_of_pairs(contract.get("zoneRequiredAirFlows"))), "MC001_3_66_REQUIRED_EXTRACT_DISTRIBUTION_AIR_FLOW", "m3/h")
    contract = _monthly_component(contracts.get("maximumZoneFlowFactor"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "maximum_zone_flow_factor":
        add("maximumZoneFlowFactor", ventilation_formula.maximum_zone_flow_factor(_as_list_of_pairs(contract.get("zoneFlows"))), "MC001_3_89_MAXIMUM_ZONE_FLOW_FACTOR", "value")
    contract = _monthly_component(contracts.get("steamHumidificationPumpAuxiliary"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "steam_humidification_pump_auxiliary_zero":
        add("steamHumidificationPumpAuxiliaryEnergy", ventilation_formula.steam_humidification_pump_auxiliary_energy_kwh(), "MC001_3_60_STEAM_HUMIDIFICATION_PUMP_AUXILIARY_ZERO")
    contract = _monthly_component(contracts.get("groundPreheatPrecool"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ground_preheat_precool_energy":
        add("groundPreheatPrecoolEnergy", ventilation_formula.ground_preheat_precool_energy_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            _finite(contract.get("supplyAirFlowM3PerH"), "supplyAirFlowM3PerH"),
            _finite(contract.get("outdoorAirFraction"), "outdoorAirFraction"),
            _finite(contract.get("preheatedOutdoorTemperatureC"), "preheatedOutdoorTemperatureC"),
            _finite(contract.get("outdoorTemperatureC"), "outdoorTemperatureC"),
            hours(contract),
        ), "MC001_3_59_GROUND_PREHEAT_PRECOOL_ENERGY")
    contract = _monthly_component(contracts.get("distributionThermalLoss"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_distribution_thermal_loss":
        add("distributionThermalLoss", ventilation_formula.ahu_distribution_thermal_loss_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            _finite(contract.get("supplyDistributionAirFlowM3PerH"), "supplyDistributionAirFlowM3PerH"),
            _finite(contract.get("supplyDuctUnconditionedDeltaK"), "supplyDuctUnconditionedDeltaK"),
            [_finite(item, "supplyDuctConditionedDeltasK[]") for item in contract.get("supplyDuctConditionedDeltasK", [])],
            _finite(contract.get("extractDistributionAirFlowM3PerH"), "extractDistributionAirFlowM3PerH"),
            _finite(contract.get("extractDuctDeltaK"), "extractDuctDeltaK"),
            _as_list_of_pairs(contract.get("supplyLeakageZoneTerms", [])),
            _finite(contract.get("unconditionedLeakageAirFlowM3PerH"), "unconditionedLeakageAirFlowM3PerH"),
            _finite(contract.get("supplyDistributionInletC"), "supplyDistributionInletC"),
            _finite(contract.get("unconditionedSurroundingC"), "unconditionedSurroundingC"),
            hours(contract),
        ), "MC001_3_90_AHU_DISTRIBUTION_THERMAL_LOSS")
    contract = _monthly_component(contracts.get("recoverableDistributionLoss"), month_index)
    if isinstance(contract, dict) and contract.get("mode") == "ahu_distribution_recoverable_loss_to_zone":
        add("recoverableDistributionLoss", ventilation_formula.ahu_recoverable_distribution_loss_to_zone_kwh(
            _finite(contract.get("airDensityKgPerM3"), "airDensityKgPerM3"),
            _finite(contract.get("airSpecificHeatKJPerKgK"), "airSpecificHeatKJPerKgK"),
            _finite(contract.get("zoneSupplyAirFlowM3PerH"), "zoneSupplyAirFlowM3PerH"),
            _finite(contract.get("conditionedSupplyDuctDeltaK"), "conditionedSupplyDuctDeltaK"),
            _finite(contract.get("zoneSupplyLeakageAirFlowM3PerH"), "zoneSupplyLeakageAirFlowM3PerH"),
            _finite(contract.get("supplyDistributionInletC"), "supplyDistributionInletC"),
            _finite(contract.get("zoneIndoorTemperatureC"), "zoneIndoorTemperatureC"),
            hours(contract),
        ), "MC001_3_92_AHU_RECOVERABLE_DISTRIBUTION_LOSS_TO_ZONE")
    return relations, traces


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
