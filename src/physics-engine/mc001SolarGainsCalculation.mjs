import { resolveSolarTransmissionTable2_13Value } from "./datasets/mc001SolarTransmissionTable2_13.mjs";
import {
  calculateAngleCorrectedSolarTransmittance2_40,
  calculateShadedSolarTransmittanceWithTable2_16
} from "./datasets/mc001SolarShadingTables.mjs";
import {
  findObstacleShadingSourceContractByCode,
  findSolarIrradiationSourceContractByCode
} from "./datasets/mc001SolarSourceContracts.mjs";

export const MC001_MONTHLY_SOLAR_GAINS_SCOPE =
  "monthly_solar_gains_explicit_input_only_not_full_QHnd_QCnd";

const MODE = "monthly_solar_gains_explicit_v1";
const FORMULA_REFERENCES = [
  "MC001_R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK",
  "MC001_R6_GAINS_CAPACITY_TIMECONSTANT_READINESS_SOURCE_PACK",
  "MC001_RELATION_2_36_SOLAR_GAINS_SINGLE_ZONE",
  "MC001_RELATION_2_38_DIRECT_SOLAR_GAINS_COMPONENTS",
  "MC001_RELATION_2_39_TRANSPARENT_SOLAR_GAINS",
  "MC001_RELATION_2_40_SOLAR_TRANSMITTANCE_ANGLE_CORRECTION",
  "MC001_RELATION_2_50_OPAQUE_SOLAR_GAINS",
  "MC001_RELATION_2_54_SKY_RADIATION_EXPLICIT",
  "MC001_TABLE_2_13_SOLAR_TRANSMISSION",
  "MC001_TABLE_2_16_SHADING_REDUCTION",
  "MC001_SOLAR_IRRADIATION_EXTERNAL_CLIMATE_SOURCE_CONTRACT",
  "MC001_OBSTACLE_SHADING_EXTERNAL_GEOMETRY_SOURCE_CONTRACT"
];
const MONTHS = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
]);
const METHODOLOGY_LIMITS = [
  "explicit_input_only",
  "solar_gains_only",
  "not_internal_gains",
  "not_full_QHnd",
  "not_full_QCnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_hidden_defaults",
  "no_default_solar_irradiation",
  "no_default_obstacle_shading",
  "external_solar_irradiation_contract_or_explicit_input",
  "external_obstacle_geometry_contract_or_explicit_factor",
  "no_default_frame_fraction",
  "no_default_sky_radiation",
  "no_default_absorptance",
  "no_default_orientation",
  "no_default_climate_data"
];
const EXCLUDED_CALCULATIONS = [
  "adjacent_unconditioned_zone_solar_gains",
  "dynamic_glazing_hourly_state_averaging",
  "diffuse_glazing_angle_correction",
  "QHnd",
  "QCnd",
  "system_losses",
  "final_energy",
  "primary_energy",
  "CO2",
  "certificate"
];
const FORBIDDEN_INPUT_KEYS = new Set([
  "solarGains",
  "annualSolarGains",
  "qSol",
  "qSolDir",
  "caseResults",
  "summary",
  "result",
  "results",
  "formulaCode",
  "formulaReferences",
  "transparentElementResults",
  "opaqueElementResults",
  "monthlyHeatGainsResult",
  "obstacleShadingOrigin",
  "obstacleShadingSourceContractCode",
  "obstacleShadingSourceReference",
  "solarIrradiationOrigin",
  "solarIrradiationSourceContractCode",
  "solarIrradiationSourceReference",
  "qHgn",
  "qCgn",
  "qHnd",
  "qCnd"
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeCode(value, maxLength = 96) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[a-zA-Z0-9_.:-]+$/.test(value);
}

function safeNotes(value) {
  return value === undefined ||
    (
      typeof value === "string" &&
      value.length <= 160 &&
      !/[<>{}]/.test(value)
    );
}

function hasInputValue(value, key) {
  return isPlainObject(value) && value[key] !== undefined && value[key] !== null;
}

function hasForbiddenDerivedInput(value) {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(hasForbiddenDerivedInput);
  }
  if (!isPlainObject(value)) {
    return true;
  }
  return Object.entries(value).some(([key, child]) => (
    FORBIDDEN_INPUT_KEYS.has(key) || hasForbiddenDerivedInput(child)
  ));
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: MC001_MONTHLY_SOLAR_GAINS_SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults: [],
    summary: {
      annualSolarGains: 0,
      caseCount: 0
    },
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedCalculations: [...EXCLUDED_CALCULATIONS]
    }
  };
}

function validateSource(source) {
  if (!isPlainObject(source) || !safeCode(source.reference, 96)) {
    return { ok: false, code: "monthly_solar_gains_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "monthly_solar_gains_invalid_source_notes" };
  }
  return { ok: true };
}

function finiteInRange(value, min, max, code) {
  const amount = finiteNumber(value);
  if (amount === null || amount < min || amount > max) {
    return { ok: false, code };
  }
  return { ok: true, value: amount };
}

function finiteAtLeast(value, min, code) {
  const amount = finiteNumber(value);
  if (amount === null || amount < min) {
    return { ok: false, code };
  }
  return { ok: true, value: amount };
}

function validateSourceBackedAmount({
  value,
  prefix,
  contractLookup,
  contractCodeKey,
  amountKey,
  min,
  max
}) {
  if (!isPlainObject(value)) {
    return { ok: false, code: `${prefix}_invalid_source_contract_input` };
  }
  if (!safeCode(value[contractCodeKey], 128)) {
    return { ok: false, code: `${prefix}_invalid_source_contract` };
  }
  const contract = contractLookup(value[contractCodeKey]);
  if (contract === null) {
    return { ok: false, code: `${prefix}_unknown_source_contract` };
  }
  const amount = finiteNumber(value[amountKey]);
  if (amount === null || amount < min || amount > max) {
    return { ok: false, code: `${prefix}_invalid_source_backed_value` };
  }
  const source = validateSource(value.source);
  if (!source.ok) {
    return { ok: false, code: `${prefix}_missing_source_backed_reference` };
  }
  return {
    ok: true,
    value: amount,
    contract,
    sourceReference: value.source.reference
  };
}

function resolveObstacleShadingFactor(element, prefix) {
  const hasExplicit = hasInputValue(element, "obstacleShadingFactor");
  const hasSourceBacked = hasInputValue(element, "obstacleShadingSource");
  if (hasExplicit && hasSourceBacked) {
    return { ok: false, code: `${prefix}_ambiguous_obstacle_shading_source` };
  }
  if (hasSourceBacked) {
    const resolved = validateSourceBackedAmount({
      value: element.obstacleShadingSource,
      prefix: `${prefix}_obstacle_shading`,
      contractLookup: findObstacleShadingSourceContractByCode,
      contractCodeKey: "contractCode",
      amountKey: "factor",
      min: 0,
      max: 1
    });
    if (!resolved.ok) return resolved;
    return {
      ok: true,
      value: resolved.value,
      origin: "source_backed_obstacle_shading_factor",
      sourceContractCode: resolved.contract.code,
      sourceReference: resolved.sourceReference
    };
  }
  const obstacle = finiteInRange(
    element.obstacleShadingFactor,
    0,
    1,
    `${prefix}_invalid_obstacle_shading_factor`
  );
  if (!obstacle.ok) return obstacle;
  return {
    ok: true,
    value: obstacle.value,
    origin: "explicit_input"
  };
}

function resolveSolarIrradiation(element, prefix) {
  const hasExplicit = hasInputValue(element, "solarIrradiation");
  const hasSourceBacked = hasInputValue(element, "solarIrradiationSource");
  if (hasExplicit && hasSourceBacked) {
    return { ok: false, code: `${prefix}_ambiguous_solar_irradiation_source` };
  }
  if (hasSourceBacked) {
    const resolved = validateSourceBackedAmount({
      value: element.solarIrradiationSource,
      prefix: `${prefix}_solar_irradiation`,
      contractLookup: findSolarIrradiationSourceContractByCode,
      contractCodeKey: "contractCode",
      amountKey: "amount",
      min: 0,
      max: Number.POSITIVE_INFINITY
    });
    if (!resolved.ok) return resolved;
    return {
      ok: true,
      value: resolved.value,
      origin: "source_backed_solar_irradiation",
      sourceContractCode: resolved.contract.code,
      sourceReference: resolved.sourceReference
    };
  }
  const irradiation = finiteAtLeast(
    element.solarIrradiation,
    0,
    `${prefix}_invalid_solar_irradiation`
  );
  if (!irradiation.ok) return irradiation;
  return {
    ok: true,
    value: irradiation.value,
    origin: "explicit_input"
  };
}

function resolveSkyRadiation(element) {
  const hasExplicitQSky = hasInputValue(element, "qSky");
  const hasSkyInputs = hasInputValue(element, "skyRadiation");
  if (hasExplicitQSky && hasSkyInputs) {
    return { ok: false, code: "monthly_solar_gains_ambiguous_sky_radiation_source" };
  }
  if (hasExplicitQSky) {
    const explicit = finiteAtLeast(
      element.qSky,
      0,
      "monthly_solar_gains_invalid_explicit_qsky"
    );
    if (!explicit.ok) return explicit;
    return {
      ok: true,
      value: explicit.value,
      origin: "explicit_input",
      formulaCode: "MC001_RELATION_2_39_2_50_EXPLICIT_QSKY"
    };
  }
  if (!hasSkyInputs) {
    return { ok: false, code: "monthly_solar_gains_missing_qsky_or_sky_radiation_inputs" };
  }

  const sky = element.skyRadiation;
  if (!isPlainObject(sky)) {
    return { ok: false, code: "monthly_solar_gains_invalid_sky_radiation_inputs" };
  }
  const skyView = finiteInRange(
    sky.skyViewFactor,
    0,
    1,
    "monthly_solar_gains_invalid_sky_view_factor"
  );
  if (!skyView.ok) return skyView;
  const rse = finiteAtLeast(
    sky.exteriorSurfaceResistance,
    0,
    "monthly_solar_gains_invalid_sky_rse"
  );
  if (!rse.ok || rse.value === 0) return { ok: false, code: "monthly_solar_gains_invalid_sky_rse" };
  const uValue = finiteAtLeast(
    sky.uValue,
    0,
    "monthly_solar_gains_invalid_sky_u_value"
  );
  if (!uValue.ok) return uValue;
  const area = finiteAtLeast(
    sky.area,
    0,
    "monthly_solar_gains_invalid_sky_area"
  );
  if (!area.ok || area.value === 0) return { ok: false, code: "monthly_solar_gains_invalid_sky_area" };
  const longwave = finiteAtLeast(
    sky.longwaveRadiationCoefficient,
    0,
    "monthly_solar_gains_invalid_sky_longwave_coefficient"
  );
  if (!longwave.ok) return longwave;
  const delta = finiteAtLeast(
    sky.skyTemperatureDifference,
    0,
    "monthly_solar_gains_invalid_sky_temperature_difference"
  );
  if (!delta.ok) return delta;
  const duration = finiteAtLeast(
    sky.durationHours,
    0,
    "monthly_solar_gains_invalid_sky_duration"
  );
  if (!duration.ok) return duration;

  return {
    ok: true,
    value: 0.001 * skyView.value * rse.value * uValue.value * area.value *
      longwave.value * delta.value * duration.value,
    origin: "calculated_from_MC001_2_54_explicit_inputs",
    formulaCode: "MC001_RELATION_2_54_SKY_RADIATION_EXPLICIT"
  };
}

function resolveTransparentTransmittance(element) {
  const hasExplicit = hasInputValue(element, "effectiveSolarTransmittance");
  const hasGlazing = hasInputValue(element, "glazing");
  if (hasExplicit && hasGlazing) {
    return { ok: false, code: "monthly_solar_gains_ambiguous_transparent_transmittance" };
  }
  if (hasExplicit) {
    const ggl = finiteInRange(
      element.effectiveSolarTransmittance,
      0,
      1,
      "monthly_solar_gains_invalid_effective_solar_transmittance"
    );
    if (!ggl.ok) return ggl;
    return {
      ok: true,
      value: ggl.value,
      origin: "explicit_input",
      formulaCode: "MC001_RELATION_2_39_EXPLICIT_GGL"
    };
  }
  if (!hasGlazing || !isPlainObject(element.glazing)) {
    return { ok: false, code: "monthly_solar_gains_missing_transparent_transmittance" };
  }

  const glazing = element.glazing;
  const hasShadingDevice = hasInputValue(glazing, "shadingDeviceId") ||
    hasInputValue(glazing, "mountingSide");
  const tableValue = resolveSolarTransmissionTable2_13Value({
    glazingTypeId: glazing.glazingTypeId,
    explicitGglN: glazing.explicitGglN
  });
  if (tableValue.status !== "ready") {
    return { ok: false, code: tableValue.diagnostics.blockers[0].code };
  }
  if (!hasShadingDevice) {
    const angleCorrected = calculateAngleCorrectedSolarTransmittance2_40({
      gglN: tableValue.gglN
    });
    if (angleCorrected.status !== "ready") {
      return { ok: false, code: angleCorrected.diagnostics.blockers[0].code };
    }
    return {
      ok: true,
      value: angleCorrected.ggl,
      origin: tableValue.gglNOrigin === "explicit_value_within_MC001_TABLE_2_13_RANGE"
        ? "explicit_range_value_with_MC001_TABLE_2_13_AND_RELATION_2_40"
        : "MC001_TABLE_2_13_AND_RELATION_2_40_EXPLICIT_GLAZING_LOOKUP",
      formulaCode: "MC001_RELATION_2_40_GGL_EQUALS_0_9_GGL_N",
      glazingTypeId: tableValue.glazingTypeId
    };
  }

  if (!hasInputValue(glazing, "shadingDeviceId") || !hasInputValue(glazing, "mountingSide")) {
    return { ok: false, code: "monthly_solar_gains_incomplete_shading_device_inputs" };
  }
  const shaded = calculateShadedSolarTransmittanceWithTable2_16({
    gglN: tableValue.gglN,
    shadingDeviceId: glazing.shadingDeviceId,
    mountingSide: glazing.mountingSide
  });
  if (shaded.status !== "ready") {
    return { ok: false, code: shaded.diagnostics.blockers[0].code };
  }
  return {
    ok: true,
    value: shaded.gglSh,
    origin: "MC001_TABLE_2_13_TABLE_2_16_AND_RELATION_2_40_EXPLICIT_LOOKUPS",
    formulaCode: "MC001_TABLE_2_16_AND_RELATION_2_40_SHADED_GGL",
    glazingTypeId: tableValue.glazingTypeId,
    shadingDeviceId: shaded.shadingDeviceId,
    mountingSide: shaded.mountingSide
  };
}

function validateCommonElement(element, prefix) {
  if (!isPlainObject(element)) {
    return { ok: false, code: `${prefix}_invalid_element` };
  }
  if (!safeCode(element.elementId, 96)) {
    return { ok: false, code: `${prefix}_invalid_element_id` };
  }
  const area = finiteAtLeast(element.area, 0, `${prefix}_invalid_area`);
  if (!area.ok || area.value === 0) return { ok: false, code: `${prefix}_invalid_area` };
  const obstacle = resolveObstacleShadingFactor(element, prefix);
  if (!obstacle.ok) return obstacle;
  const irradiation = resolveSolarIrradiation(element, prefix);
  if (!irradiation.ok) return irradiation;
  const sky = resolveSkyRadiation(element);
  if (!sky.ok) return sky;
  return {
    ok: true,
    value: {
      elementId: element.elementId,
      area: area.value,
      obstacleShadingFactor: obstacle.value,
      obstacleShadingOrigin: obstacle.origin,
      ...(obstacle.sourceContractCode === undefined ? {} : {
        obstacleShadingSourceContractCode: obstacle.sourceContractCode
      }),
      ...(obstacle.sourceReference === undefined ? {} : {
        obstacleShadingSourceReference: obstacle.sourceReference
      }),
      solarIrradiation: irradiation.value,
      solarIrradiationOrigin: irradiation.origin,
      ...(irradiation.sourceContractCode === undefined ? {} : {
        solarIrradiationSourceContractCode: irradiation.sourceContractCode
      }),
      ...(irradiation.sourceReference === undefined ? {} : {
        solarIrradiationSourceReference: irradiation.sourceReference
      }),
      qSky: sky.value,
      qSkyOrigin: sky.origin,
      qSkyFormulaCode: sky.formulaCode
    }
  };
}

function calculateTransparentElement(element) {
  const common = validateCommonElement(element, "monthly_solar_gains_transparent");
  if (!common.ok) return common;
  const frameFraction = finiteInRange(
    element.frameFraction,
    0,
    1,
    "monthly_solar_gains_transparent_invalid_frame_fraction"
  );
  if (!frameFraction.ok || frameFraction.value === 1) {
    return { ok: false, code: "monthly_solar_gains_transparent_invalid_frame_fraction" };
  }
  const transmittance = resolveTransparentTransmittance(element);
  if (!transmittance.ok) return transmittance;
  const qSolar = transmittance.value * common.value.area * (1 - frameFraction.value) *
    common.value.obstacleShadingFactor * common.value.solarIrradiation -
    common.value.qSky;
  if (!Number.isFinite(qSolar) || qSolar < 0) {
    return { ok: false, code: "monthly_solar_gains_negative_transparent_result_outside_scope" };
  }
  return {
    ok: true,
    value: {
      ...common.value,
      frameFraction: frameFraction.value,
      effectiveSolarTransmittance: transmittance.value,
      transmittanceOrigin: transmittance.origin,
      transmittanceFormulaCode: transmittance.formulaCode,
      ...(transmittance.glazingTypeId === undefined ? {} : { glazingTypeId: transmittance.glazingTypeId }),
      ...(transmittance.shadingDeviceId === undefined ? {} : { shadingDeviceId: transmittance.shadingDeviceId }),
      ...(transmittance.mountingSide === undefined ? {} : { mountingSide: transmittance.mountingSide }),
      solarGains: qSolar,
      formulaCode: "MC001_RELATION_2_39_TRANSPARENT_SOLAR_GAINS"
    }
  };
}

function calculateOpaqueElement(element) {
  const common = validateCommonElement(element, "monthly_solar_gains_opaque");
  if (!common.ok) return common;
  const absorptance = finiteInRange(
    element.solarAbsorptance,
    0,
    1,
    "monthly_solar_gains_opaque_invalid_solar_absorptance"
  );
  if (!absorptance.ok) return absorptance;
  const rse = finiteAtLeast(
    element.exteriorSurfaceResistance,
    0,
    "monthly_solar_gains_opaque_invalid_exterior_surface_resistance"
  );
  if (!rse.ok || rse.value === 0) {
    return { ok: false, code: "monthly_solar_gains_opaque_invalid_exterior_surface_resistance" };
  }
  const uValue = finiteAtLeast(
    element.uValue,
    0,
    "monthly_solar_gains_opaque_invalid_u_value"
  );
  if (!uValue.ok) return uValue;

  const qSolar = absorptance.value * rse.value * uValue.value * common.value.area *
    common.value.obstacleShadingFactor * common.value.solarIrradiation -
    common.value.qSky;
  if (!Number.isFinite(qSolar) || qSolar < 0) {
    return { ok: false, code: "monthly_solar_gains_negative_opaque_result_outside_scope" };
  }
  return {
    ok: true,
    value: {
      ...common.value,
      solarAbsorptance: absorptance.value,
      exteriorSurfaceResistance: rse.value,
      uValue: uValue.value,
      solarGains: qSolar,
      formulaCode: "MC001_RELATION_2_50_OPAQUE_SOLAR_GAINS"
    }
  };
}

function calculateElements(elements, calculator, code) {
  if (elements === undefined) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(elements)) {
    return { ok: false, code };
  }
  const results = [];
  for (const element of elements) {
    const result = calculator(element);
    if (!result.ok) return result;
    results.push(result.value);
  }
  return { ok: true, value: results };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "monthly_solar_gains_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase)) {
    return { ok: false, code: "monthly_solar_gains_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "monthly_solar_gains_invalid_case_id" };
  }
  if (!MONTHS.has(inputCase.month)) {
    return { ok: false, code: "monthly_solar_gains_invalid_month" };
  }
  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  const transparentElements = calculateElements(
    inputCase.transparentElements,
    calculateTransparentElement,
    "monthly_solar_gains_invalid_transparent_elements"
  );
  if (!transparentElements.ok) return transparentElements;
  const opaqueElements = calculateElements(
    inputCase.opaqueElements,
    calculateOpaqueElement,
    "monthly_solar_gains_invalid_opaque_elements"
  );
  if (!opaqueElements.ok) return opaqueElements;
  if (transparentElements.value.length + opaqueElements.value.length === 0) {
    return { ok: false, code: "monthly_solar_gains_missing_solar_elements" };
  }

  const transparentGains = transparentElements.value.reduce((sum, element) => sum + element.solarGains, 0);
  const opaqueGains = opaqueElements.value.reduce((sum, element) => sum + element.solarGains, 0);
  const qSolDir = transparentGains + opaqueGains;
  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      month: inputCase.month,
      transparentElementResults: transparentElements.value,
      opaqueElementResults: opaqueElements.value,
      qSolDir,
      solarGains: qSolDir,
      sourceReference: inputCase.source.reference
    }
  };
}

export function calculateMc001MonthlySolarGainsExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("monthly_solar_gains_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("monthly_solar_gains_client_supplied_derived_result");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("monthly_solar_gains_missing_cases");
  }

  const caseResults = [];
  for (const inputCase of input.cases) {
    const validation = validateCase(inputCase);
    if (!validation.ok) return blocked(validation.code);
    caseResults.push({
      ...validation.value,
      solarGainsOrigin: "calculated_from_MC001_2_36_2_38_explicit_solar_elements",
      formulaCode: "MC001_RELATION_2_36_2_38_MONTHLY_SOLAR_GAINS",
      scope: MC001_MONTHLY_SOLAR_GAINS_SCOPE
    });
  }

  return {
    status: "ready",
    scope: MC001_MONTHLY_SOLAR_GAINS_SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults,
    summary: {
      annualSolarGains: caseResults.reduce((sum, result) => sum + result.solarGains, 0),
      caseCount: caseResults.length
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedCalculations: [...EXCLUDED_CALCULATIONS]
    }
  };
}
