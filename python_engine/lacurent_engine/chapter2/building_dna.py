"""Direct Chapter 2 execution from the versioned Building DNA engine input."""

from __future__ import annotations

from typing import Any

from .._p3v_kernel import ensure_p3v_path
from ..core.diagnostics import MISSING_ENGINE_INPUT, diagnostic, solar_gain_blocker
from ..core.trace import blocked_trace, trace_record

ensure_p3v_path()

from mc001_reference.cooling import cooling_need  # noqa: E402
from mc001_reference.heating import heating_need  # noqa: E402


MONTH_IDS = ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")
MATERIAL_CORRECTION_COEFFICIENTS = {
    "zidarie_caramida_uscata_vechime_ge_30_ani": 1.03,
    "masonry_brick_normative_lambda": 1.15,
    "brick_normative_lambda": 1.15,
    "hollow_brick_normative_lambda": 1.15,
    "bca_normative_lambda": 1.1,
    "aerated_concrete_normative_lambda": 1.1,
    "concrete_normative_lambda": 1.05,
    "stone_normative_lambda": 1.1,
    "timber_normative_lambda": 1.1,
    "mineral_wool_normative_lambda": 1.0,
    "eps_normative_lambda": 1.0,
    "xps_normative_lambda": 1.0,
    "polyurethane_normative_lambda": 1.0,
    "air_layer_normative_lambda": 1.0,
}


class Chapter2InputError(ValueError):
    """Expected missing Building DNA input, converted to a diagnostic."""


def _amount(value: Any, path: str, *, required: bool = True, default: float | None = None) -> float:
    if value is None:
        if required:
            raise Chapter2InputError(f"{path} is required")
        if default is None:
            raise Chapter2InputError(f"{path} default is not defined")
        return float(default)
    if isinstance(value, dict):
        value = value.get("amount")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise Chapter2InputError(f"{path} must be a numeric amount")
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        raise Chapter2InputError(f"{path} must be finite")
    return number


def _optional_amount(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return _amount(value, "$", required=False, default=0)
    except Chapter2InputError:
        return None


def _monthly_values(value: Any, path: str, *, default: float | None = None) -> list[float]:
    if isinstance(value, list):
        if len(value) != 12:
            raise Chapter2InputError(f"{path} must contain 12 monthly values")
        return [_amount(item, f"{path}[{index}]") for index, item in enumerate(value)]
    if value is None and default is not None:
        return [float(default)] * 12
    scalar = _amount(value, path)
    return [scalar] * 12


def _trace(formula_id: str, branch_id: str, inputs: dict[str, Any], result: Any, *, chapter: str = "2") -> dict[str, Any]:
    return trace_record(
        chapter=chapter,
        formula_id=formula_id,
        branch_id=branch_id,
        inputs=inputs,
        units={key: value.get("unit", "") if isinstance(value, dict) else "" for key, value in inputs.items()},
        raw_result=result,
        final_result=result,
        provenance={"implementation": "lacurent_python_building_dna_direct", "javascriptRuntimeCalled": False},
    )


def _material_lambda(layer: dict[str, Any], path: str) -> float:
    material = layer.get("material", {})
    physics = material.get("physicsMaterial", {})
    direct_lambda = _optional_amount(physics.get("lambda"))
    if direct_lambda is not None and direct_lambda > 0:
        return direct_lambda
    normative_lambda = _optional_amount(physics.get("lambdaNormat"))
    if normative_lambda is None:
        normative_lambda = _optional_amount(layer.get("lambda"))
    if normative_lambda is None or normative_lambda <= 0:
        raise Chapter2InputError(f"{path}.material.physicsMaterial.lambdaNormat is required")
    code = physics.get("correctionCoefficientCode") or material.get("correctionCoefficientCode")
    correction = _optional_amount(physics.get("correctionCoefficient"))
    if correction is None:
        if not code:
            raise Chapter2InputError(f"{path}.material.physicsMaterial.correctionCoefficientCode is required")
        if code not in MATERIAL_CORRECTION_COEFFICIENTS:
            raise Chapter2InputError(f"{path}.material.physicsMaterial.correctionCoefficientCode is unsupported: {code}")
        correction = MATERIAL_CORRECTION_COEFFICIENTS[code]
    return normative_lambda * correction


def _assembly_u_value(assembly: dict[str, Any], path: str) -> tuple[float, dict[str, Any]]:
    direct = _optional_amount(assembly.get("directUValue") or assembly.get("uValue"))
    if direct is not None and direct > 0:
        return direct, _trace("MC001_2_DIRECT_ASSEMBLY_U_VALUE", "direct_u_value", {"uValue": {"value": direct, "unit": "W/m2K"}}, direct)

    surface = assembly.get("surfaceResistances") or {}
    rsi = _amount(surface.get("rsi"), f"{path}.surfaceResistances.rsi")
    rse = _amount(surface.get("rse"), f"{path}.surfaceResistances.rse")
    layer_terms = []
    total_resistance = rsi + rse
    for index, layer in enumerate(assembly.get("layers") or []):
        thickness = _amount(layer.get("thickness"), f"{path}.layers[{index}].thickness")
        lam = _material_lambda(layer, f"{path}.layers[{index}]")
        resistance = thickness / lam
        layer_terms.append({"thicknessM": thickness, "lambdaWPerMK": lam, "resistanceM2KPerW": resistance})
        total_resistance += resistance
    if not layer_terms:
        raise Chapter2InputError(f"{path}.layers or directUValue is required")
    if total_resistance <= 0:
        raise Chapter2InputError(f"{path}.thermalResistance must be positive")
    u_value = 1 / total_resistance
    return u_value, _trace(
        "MC001_2_ASSEMBLY_LAYERED_U_VALUE",
        "surface_and_layer_resistances",
        {"rsi": {"value": rsi, "unit": "m2K/W"}, "rse": {"value": rse, "unit": "m2K/W"}, "layers": layer_terms},
        u_value,
    )


def _assembly_lookup(envelope: dict[str, Any]) -> tuple[dict[str, float], list[dict[str, Any]]]:
    values: dict[str, float] = {}
    traces: list[dict[str, Any]] = []
    for index, assembly in enumerate(envelope.get("assemblies") or []):
        assembly_id = assembly.get("assemblyId") or assembly.get("id") or f"assembly_{index + 1}"
        role = assembly.get("role") or assembly.get("assemblyRole")
        u_value, trace = _assembly_u_value(assembly, f"envelope.assemblies[{index}]")
        values[assembly_id] = u_value
        if role:
            values[str(role)] = u_value
        traces.append(trace | {"assemblyId": assembly_id, "assemblyRole": role})
    return values, traces


def _boundary_factor(element: dict[str, Any]) -> float:
    boundary = element.get("boundary") or element.get("boundaryCondition") or {}
    if isinstance(boundary, str):
        return 1.0 if boundary == "outside_air" else 1.0
    boundary_type = element.get("boundaryType") or boundary.get("type") or boundary.get("id")
    if boundary_type in ("outside_air", "exterior"):
        return 1.0
    explicit = _optional_amount(element.get("boundaryCorrectionFactor") or boundary.get("factor"))
    if explicit is not None:
        return explicit
    correction = element.get("boundaryCorrection") or boundary.get("correction") or {}
    numerator = _optional_amount(correction.get("heatTransferToExterior"))
    denominator = _optional_amount(correction.get("totalHeatTransfer"))
    if numerator is not None and denominator and denominator > 0:
        return numerator / denominator
    if boundary_type is None:
        return 1.0
    return 1.0


def _resolve_htr(envelope: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    assembly_values, traces = _assembly_lookup(envelope)
    element_results = []
    htr_elements = 0.0
    for index, element in enumerate(envelope.get("elements") or []):
        area = _amount(element.get("area"), f"envelope.elements[{index}].area")
        u_value = _optional_amount(element.get("uValue"))
        if u_value is None:
            key = element.get("assemblyRole") or element.get("assemblyId") or element.get("assemblyReference")
            if key not in assembly_values:
                raise Chapter2InputError(f"envelope.elements[{index}].assemblyRole must reference a known assembly")
            u_value = assembly_values[str(key)]
        factor = _boundary_factor(element)
        contribution = area * u_value * factor
        htr_elements += contribution
        element_results.append({
            "elementId": element.get("elementId") or f"E{index + 1:02d}",
            "areaM2": area,
            "uValueWPerM2K": u_value,
            "boundaryFactor": factor,
            "heatTransferCoefficientWPerK": contribution,
        })

    bridge_results = []
    htr_bridges = 0.0
    for index, bridge in enumerate(envelope.get("thermalBridges") or []):
        length = _amount(bridge.get("length"), f"envelope.thermalBridges[{index}].length")
        psi = _amount(bridge.get("psiValue") or bridge.get("linearTransmittance") or bridge.get("psi"), f"envelope.thermalBridges[{index}].psiValue")
        contribution = length * psi
        htr_bridges += contribution
        bridge_results.append({
            "bridgeId": bridge.get("bridgeId") or f"TB{index + 1:02d}",
            "lengthM": length,
            "psiWPerMK": psi,
            "heatTransferCoefficientWPerK": contribution,
        })

    htr_total = htr_elements + htr_bridges
    traces.append(_trace(
        "MC001_2_ENVELOPE_TRANSMISSION_COEFFICIENT",
        "elements_plus_linear_bridges",
        {"elements": element_results, "thermalBridges": bridge_results},
        htr_total,
    ))
    return {
        "status": "calculated",
        "htrElementsWPerK": htr_elements,
        "htrThermalBridgesWPerK": htr_bridges,
        "htrTotalWPerK": htr_total,
        "elements": element_results,
        "thermalBridges": bridge_results,
    }, traces


def _profile_value(profile: dict[str, Any], path: tuple[str, ...], label: str) -> float:
    value: Any = profile
    for key in path:
        if not isinstance(value, dict) or key not in value:
            raise Chapter2InputError(f"use.monthlyProfiles[{profile.get('month')}].{label} is required")
        value = value[key]
    return _amount(value, f"use.monthlyProfiles[{profile.get('month')}].{label}")


def _profile_value_or(profile: dict[str, Any], paths: tuple[tuple[tuple[str, ...], str], ...]) -> float:
    last_error: Exception | None = None
    for path, label in paths:
        try:
            return _profile_value(profile, path, label)
        except Chapter2InputError as error:
            last_error = error
    raise Chapter2InputError(str(last_error) if last_error else "profile value is required")


def _heat_gain(profile: dict[str, Any], key: str) -> float:
    heat_gains = profile.get("heatGains") or {}
    value = heat_gains.get(key)
    return 0.0 if value is None else _amount(value, f"use.monthlyProfiles[{profile.get('month')}].heatGains.{key}")


def _adjacent_gain(profile: dict[str, Any]) -> float:
    adjacent = profile.get("heatGains", {}).get("adjacentHeatFlows")
    if not adjacent:
        return 0.0
    total = 0.0
    for item in adjacent:
        value = item.get("heatFlow") if isinstance(item, dict) else item
        total += _amount(value, f"use.monthlyProfiles[{profile.get('month')}].heatGains.adjacentHeatFlows")
    return total


def _monthly_results(engine_input: dict[str, Any], envelope_result: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    traces: list[dict[str, Any]] = []
    htr = envelope_result["htrTotalWPerK"]
    monthly = []
    total_qhnd = 0.0
    total_qcnd = 0.0
    profiles = engine_input.get("use", {}).get("monthlyProfiles") or []
    if len(profiles) != 12:
        raise Chapter2InputError("use.monthlyProfiles must contain 12 months")

    for index, profile in enumerate(profiles):
        month_id = profile.get("month") or MONTH_IDS[index]
        duration_h = _profile_value(profile, ("transmission", "heating", "duration"), "transmission.heating.duration")
        heat_indoor = _profile_value(profile, ("transmission", "heating", "indoorTemperature"), "transmission.heating.indoorTemperature")
        heat_outdoor = _profile_value(profile, ("transmission", "heating", "outdoorTemperature"), "transmission.heating.outdoorTemperature")
        cool_indoor = _profile_value(profile, ("transmission", "cooling", "indoorTemperature"), "transmission.cooling.indoorTemperature")
        cool_outdoor = _profile_value(profile, ("transmission", "cooling", "outdoorTemperature"), "transmission.cooling.outdoorTemperature")
        air_heat_capacity = _profile_value(profile, ("ventilation", "heating", "airHeatCapacity"), "ventilation.heating.airHeatCapacity")
        air_flow = _profile_value(profile, ("ventilation", "heating", "airFlowRate"), "ventilation.heating.airFlowRate")
        cooling_air_heat_capacity = _profile_value_or(profile, (
            (("ventilation", "cooling", "airHeatCapacity"), "ventilation.cooling.airHeatCapacity"),
            (("ventilation", "heating", "airHeatCapacity"), "ventilation.heating.airHeatCapacity"),
        ))
        cooling_air_flow = _profile_value_or(profile, (
            (("ventilation", "cooling", "airFlowRate"), "ventilation.cooling.airFlowRate"),
            (("ventilation", "heating", "airFlowRate"), "ventilation.heating.airFlowRate"),
        ))
        hve = air_heat_capacity * air_flow
        hve_cooling = cooling_air_heat_capacity * cooling_air_flow

        qtr_heating = max(0.0, htr * (heat_indoor - heat_outdoor) * duration_h / 1000)
        qve_heating = max(0.0, hve * (heat_indoor - heat_outdoor) * duration_h / 1000)
        qtr_cooling = max(0.0, htr * (cool_outdoor - cool_indoor) * duration_h / 1000)
        qve_cooling = max(0.0, hve_cooling * (cool_outdoor - cool_indoor) * duration_h / 1000)
        qhht = qtr_heating + qve_heating
        qcht = qtr_cooling + qve_cooling
        gains = _heat_gain(profile, "internalGains") + _heat_gain(profile, "solarGains") + _adjacent_gain(profile)

        common = {
            "effective_internal_heat_capacity_j_k": _profile_value_or(profile, (
                (("utilization", "effectiveInternalHeatCapacity"), "utilization.effectiveInternalHeatCapacity"),
                (("heating", "utilizationDependencies", "effectiveInternalHeatCapacityJPerK"), "heating.utilizationDependencies.effectiveInternalHeatCapacityJPerK"),
            )),
            "total_heat_transfer_coefficient_w_k": htr + hve,
        }
        heating_utilization = {
            **common,
            "a_h0": _profile_value_or(profile, (
                (("utilization", "heating", "aH0"), "utilization.heating.aH0"),
                (("heating", "utilizationDependencies", "aH0"), "heating.utilizationDependencies.aH0"),
            )),
            "tau_h0": _profile_value_or(profile, (
                (("utilization", "heating", "tauH0"), "utilization.heating.tauH0"),
                (("heating", "utilizationDependencies", "tauH0"), "heating.utilizationDependencies.tauH0"),
            )),
        }
        cooling_utilization = {
            **common,
            "total_heat_transfer_coefficient_w_k": htr + hve_cooling,
            "a_c0": _profile_value_or(profile, (
                (("utilization", "cooling", "aC0"), "utilization.cooling.aC0"),
                (("cooling", "utilizationDependencies", "aC0"), "cooling.utilizationDependencies.aC0"),
            )),
            "tau_c0": _profile_value_or(profile, (
                (("utilization", "cooling", "tauC0"), "utilization.cooling.tauC0"),
                (("cooling", "utilizationDependencies", "tauC0"), "cooling.utilizationDependencies.tauC0"),
            )),
        }
        heating_result = heating_need(qhht, gains, heating_utilization)
        cooling_result = cooling_need(
            qcht,
            gains,
            cooling_utilization,
            _profile_value_or(profile, (
                (("utilization", "cooling", "aCred"), "utilization.cooling.aCred"),
                (("cooling", "aCred"), "cooling.aCred"),
            )),
        )
        qhnd = max(float(heating_result["q_hnd_kwh"]), 0.0)
        qcnd = max(float(cooling_result["q_cnd_kwh"]), 0.0)
        total_qhnd += qhnd
        total_qcnd += qcnd
        monthly.append({
            "month": month_id,
            "qHtrKWh": qtr_heating,
            "qHveKWh": qve_heating,
            "qHhtKWh": qhht,
            "qChtKWh": qcht,
            "qHgnKWh": gains,
            "qCgnKWh": gains,
            "qHndKWh": qhnd,
            "qCndKWh": qcnd,
            "hveWPerK": hve,
            "heatingBranch": heating_result.get("heating_branch"),
            "coolingBranch": cooling_result.get("cooling_branch"),
        })

    traces.append(_trace(
        "MC001_CHAPTER_2_USEFUL_DEMAND_DIRECT_BUILDING_DNA",
        "monthly_explicit_gains_and_envelope",
        {"htrWPerK": {"value": htr, "unit": "W/K"}, "monthlyCount": {"value": len(monthly), "unit": "months"}},
        {"qHndKWh": total_qhnd, "qCndKWh": total_qcnd},
    ))
    return {
        "status": "calculated",
        "annual": {"qHndKWh": total_qhnd, "qCndKWh": total_qcnd},
        "monthly": monthly,
    }, traces


def _solar_blocked(engine_input: dict[str, Any]) -> bool:
    if engine_input.get("climate", {}).get("solarGainPreprocessingStatus") == "blocked_qsky":
        return True
    return any(
        (profile.get("heatGains") or {}).get("solarGainsSource") == "provider_climate_profile_without_qsol_preprocessing"
        for profile in engine_input.get("use", {}).get("monthlyProfiles") or []
    )


def _internal_gains_blocked(engine_input: dict[str, Any]) -> bool:
    return any(
        (profile.get("heatGains") or {}).get("internalGainsSource") == "internal_gains_table_2_15_category_or_area_missing"
        for profile in engine_input.get("use", {}).get("monthlyProfiles") or []
    )


def calculate_chapter2_from_building_dna(engine_input: dict[str, Any]) -> dict[str, Any]:
    diagnostics: list[dict[str, Any]] = []
    traces: list[dict[str, Any]] = []
    try:
        envelope_result, envelope_traces = _resolve_htr(engine_input.get("envelope", {}))
        traces.extend(envelope_traces)
        if _solar_blocked(engine_input):
            diagnostics.append(solar_gain_blocker([profile.get("month") for profile in engine_input.get("use", {}).get("monthlyProfiles") or []]))
            traces.append(blocked_trace(
                chapter="2",
                formula_id="MC001_CHAPTER_2_QSOL_PREPROCESSING",
                branch_id="source_backed_hsol_qsky_missing",
                diagnostics=diagnostics,
                provenance={"classification": "EXTERNAL_STANDARD_REQUIRED", "javascriptRuntimeCalled": False},
            ))
            return {
                "status": "incomplete",
                "annual": {},
                "monthly": [],
                "envelope": envelope_result,
                "diagnostics": diagnostics,
                "executionTrace": traces,
            }
        if _internal_gains_blocked(engine_input):
            diagnostics.append(diagnostic(
                "INTERNAL_GAINS_TABLE_2_15_CATEGORY_AND_AREA_REQUIRED",
                "Chapter 2 internal gains require supported use category and useful area.",
                path="use.monthlyProfiles[].heatGains",
            ))
            return {
                "status": "blocked",
                "annual": {},
                "monthly": [],
                "envelope": envelope_result,
                "diagnostics": diagnostics,
                "executionTrace": traces,
            }
        result, monthly_traces = _monthly_results(engine_input, envelope_result)
        traces.extend(monthly_traces)
        return {
            **result,
            "envelope": envelope_result,
            "diagnostics": diagnostics,
            "executionTrace": traces,
        }
    except Chapter2InputError as error:
        diagnostics.append(diagnostic(MISSING_ENGINE_INPUT, str(error), path="chapter2"))
        return {
            "status": "blocked",
            "annual": {},
            "monthly": [],
            "envelope": {},
            "diagnostics": diagnostics,
            "executionTrace": traces,
        }
