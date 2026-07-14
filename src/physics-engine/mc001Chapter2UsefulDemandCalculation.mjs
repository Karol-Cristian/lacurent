import { calculateMc001CombinedUsefulDemandExplicit } from "./mc001UsefulDemandAggregation.mjs";
import { calculateMc001CoolingUsefulDemandExplicit } from "./mc001CoolingUsefulDemandCalculation.mjs";
import { calculateMc001ExplicitTotalHeatTransferSummary } from "./mc001ExplicitTotalHeatTransferCalculation.mjs";
import { calculateMc001LatentDemandExplicit } from "./mc001LatentDemandCalculation.mjs";
import { calculateMc001MonthlyHeatGainsExplicit } from "./mc001MonthlyHeatGainsCalculation.mjs";
import { calculateMc001MonthlyTransmissionEnergyExplicit } from "./mc001MonthlyTransmissionEnergyCalculation.mjs";
import { calculateMc001MonthlyVentilationTransferExplicit } from "./mc001VentilationTransferCalculation.mjs";
import { calculateMc001RestrictedHeatingQhndExplicit } from "./mc001RestrictedHeatingQhndCalculation.mjs";

const MODE = "chapter_2_useful_demand_explicit_v1";
const SCOPE = "mc001_chapter_2_useful_demand_explicit_v1_not_certificate";
const ENVELOPE_TRANSMISSION_SCOPE = "envelope_transmission_coefficient_explicit_input_only_not_certificate";
const FORMULA_REFERENCES = [
  "MC001_R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK",
  "MC001_R15_MATERIALS_AND_THERMAL_RESISTANCE_SOURCE_PACK",
  "MC001_R17_ENVELOPE_TRANSMISSION_COEFFICIENTS_SOURCE_PACK",
  "MC001_2_84_ANNUAL_HEATING_USEFUL_DEMAND",
  "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND",
  "MC001_2_86_ANNUAL_LATENT_DEMAND_SUM"
];
const METHODOLOGY_LIMITS = [
  "mc001_chapter_2_useful_demand_explicit_v1",
  "separate_heating_and_cooling_useful_demand_outputs",
  "explicit_input_only",
  "no_hidden_defaults",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "not_CPE"
];
const EXCLUDED_CALCULATIONS = [
  "final_energy",
  "primary_energy",
  "CO2",
  "CPE",
  "certificate",
  "system_losses",
  "fan_electricity",
  "air_treatment_energy",
  "ambiguous_sum_of_heating_and_cooling"
];
const MONTHS = [
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
];
const FORBIDDEN_ROOT_KEYS = new Set([
  "chapter2UsefulDemandResult",
  "combinedUsefulDemandResult",
  "latentDemandResult",
  "annualQHnd",
  "annualQCnd",
  "annualHumidificationDemandKwh",
  "annualDehumidificationDemandKwh",
  "totalUsefulDemand",
  "finalEnergy",
  "primaryEnergy",
  "co2",
  "certificate",
  "CPE",
  "result",
  "summary",
  "formulaCode",
  "formulaReferences"
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

function hasForbiddenRootInput(value) {
  return isPlainObject(value) &&
    Object.keys(value).some(key => FORBIDDEN_ROOT_KEYS.has(key));
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    result: null,
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedCalculations: [...EXCLUDED_CALCULATIONS]
    }
  };
}

function explicitCalculatedSource(reference) {
  return { sourceType: "explicit_calculated_input", reference };
}

function validateSource(source) {
  return isPlainObject(source) &&
    safeCode(source.reference, 96) &&
    safeNotes(source.notes);
}

function validateEnvelopeTransmissionResult(result) {
  const htr = finiteNumber(result?.result?.amount);
  return isPlainObject(result) &&
    result.status === "ready" &&
    result.scope === ENVELOPE_TRANSMISSION_SCOPE &&
    result.result?.unit === "W/K" &&
    htr !== null &&
    htr >= 0 &&
    isPlainObject(result.components);
}

function validateTwelveMonthCases(cases) {
  if (!Array.isArray(cases)) {
    return { ok: false, code: "invalid_chapter_2_monthly_cases" };
  }
  if (cases.length !== 12) {
    return { ok: false, code: "incomplete_chapter_2_monthly_set" };
  }
  const months = new Set();
  const caseIds = new Set();
  for (const monthlyCase of cases) {
    if (!isPlainObject(monthlyCase) || !safeCode(monthlyCase.caseId, 96)) {
      return { ok: false, code: "invalid_chapter_2_monthly_case_identifier" };
    }
    if (caseIds.has(monthlyCase.caseId)) {
      return { ok: false, code: "duplicate_chapter_2_monthly_case_identifier" };
    }
    if (!MONTHS.includes(monthlyCase.month)) {
      return { ok: false, code: "invalid_chapter_2_month" };
    }
    if (months.has(monthlyCase.month)) {
      return { ok: false, code: "duplicate_chapter_2_month" };
    }
    if (!validateSource(monthlyCase.source)) {
      return { ok: false, code: "missing_chapter_2_monthly_case_source" };
    }
    months.add(monthlyCase.month);
    caseIds.add(monthlyCase.caseId);
  }
  if (MONTHS.some(month => !months.has(month))) {
    return { ok: false, code: "incomplete_chapter_2_monthly_set" };
  }
  return { ok: true };
}

function buildTransmissionCase(inputCase, side, htr) {
  const config = inputCase.transmission?.[side];
  if (!isPlainObject(config)) {
    return null;
  }
  return {
    caseId: `${inputCase.caseId}.${side}.transmission`,
    month: inputCase.month,
    calculationMode: side,
    htr: { amount: htr, unit: "W/K" },
    indoorTemperature: config.indoorTemperature,
    outdoorTemperature: config.outdoorTemperature,
    duration: config.duration,
    source: {
      sourceType: "explicit_user_input",
      reference: inputCase.source.reference
    }
  };
}

function buildVentilationCase(inputCase, side) {
  const config = inputCase.ventilation?.[side];
  if (!isPlainObject(config)) {
    return null;
  }
  return {
    caseId: `${inputCase.caseId}.${side}.ventilation`,
    month: inputCase.month,
    calculationMode: side,
    airHeatCapacity: config.airHeatCapacity,
    components: config.components,
    indoorTemperature: config.indoorTemperature,
    outdoorTemperature: config.outdoorTemperature,
    duration: config.duration,
    source: {
      sourceType: "explicit_user_input",
      reference: inputCase.source.reference
    }
  };
}

function runSingleTransmission(inputCase, side, htr) {
  const transmissionCase = buildTransmissionCase(inputCase, side, htr);
  if (transmissionCase === null) {
    return { ok: false, code: `missing_${side}_transmission_inputs` };
  }
  const result = calculateMc001MonthlyTransmissionEnergyExplicit({
    mode: "explicit_monthly_transmission_energy_v1",
    cases: [transmissionCase]
  });
  if (result.status !== "ready" || result.caseResults.length !== 1) {
    const code = result.diagnostics?.blockers?.[0]?.code || "unknown_transmission_blocker";
    return { ok: false, code: `chapter_2_${side}_transmission_failed_${code}` };
  }
  return { ok: true, result, caseResult: result.caseResults[0] };
}

function runSingleVentilation(inputCase, side) {
  const ventilationCase = buildVentilationCase(inputCase, side);
  if (ventilationCase === null) {
    return { ok: false, code: `missing_${side}_ventilation_inputs` };
  }
  const result = calculateMc001MonthlyVentilationTransferExplicit({
    mode: "explicit_monthly_ventilation_transfer_v1",
    cases: [ventilationCase]
  });
  if (result.status !== "ready" || result.caseResults.length !== 1) {
    const code = result.diagnostics?.blockers?.[0]?.code || "unknown_ventilation_blocker";
    return { ok: false, code: `chapter_2_${side}_ventilation_failed_${code}` };
  }
  return { ok: true, result, caseResult: result.caseResults[0] };
}

function runSingleHeatGains(inputCase) {
  const gains = inputCase.heatGains;
  if (!isPlainObject(gains)) {
    return { ok: false, code: "missing_chapter_2_heat_gains_inputs" };
  }
  const result = calculateMc001MonthlyHeatGainsExplicit({
    mode: "monthly_heat_gains_explicit_v1",
    cases: [
      {
        caseId: `${inputCase.caseId}.heat_gains`,
        month: inputCase.month,
        internalGains: gains.internalGains,
        solarGains: gains.solarGains,
        source: {
          reference: inputCase.source.reference,
          notes: inputCase.source.notes
        }
      }
    ]
  });
  if (result.status !== "ready" || result.caseResults.length !== 1) {
    const code = result.diagnostics?.blockers?.[0]?.code || "unknown_heat_gains_blocker";
    return { ok: false, code: `chapter_2_heat_gains_failed_${code}` };
  }
  return { ok: true, result, caseResult: result.caseResults[0] };
}

function heatingEnergyAmount(transmissionResult, ventilationResult) {
  const transmission = transmissionResult.caseResult.transmissionEnergy.amount;
  const ventilation = ventilationResult.caseResult.ventilationEnergy.amount;
  return {
    transmissionEnergy: transmission > 0 ? transmission : 0,
    ventilationEnergy: ventilation > 0 ? ventilation : 0
  };
}

function coolingEnergyAmount(transmissionResult, ventilationResult) {
  const transmission = transmissionResult.caseResult.transmissionEnergy.amount;
  const ventilation = ventilationResult.caseResult.ventilationEnergy.amount;
  return {
    qCht: (transmission < 0 ? Math.abs(transmission) : 0) +
      (ventilation < 0 ? Math.abs(ventilation) : 0)
  };
}

function buildTotalTransfer(inputCase, heatingEnergies) {
  const result = calculateMc001ExplicitTotalHeatTransferSummary({
    mode: "explicit_total_heat_transfer_summary_v1",
    transmissionEnergy: {
      amount: heatingEnergies.transmissionEnergy,
      unit: "kWh",
      source: explicitCalculatedSource("mc001_chapter_2_useful_demand_explicit")
    },
    ventilationEnergy: {
      amount: heatingEnergies.ventilationEnergy,
      unit: "kWh",
      source: explicitCalculatedSource("mc001_chapter_2_useful_demand_explicit")
    }
  });
  if (result.status !== "ready") {
    const code = result.diagnostics?.blockers?.[0]?.code || "unknown_c5_blocker";
    return { ok: false, code: `chapter_2_total_heat_transfer_failed_${code}` };
  }
  return { ok: true, result };
}

function deriveUtilizationDependencies(config, envelopeHtr, ventilationCase, prefix) {
  if (!isPlainObject(config)) {
    return undefined;
  }
  const dependencies = config.utilizationDependencies;
  if (!isPlainObject(dependencies)) {
    return undefined;
  }
  const shouldDerive = dependencies.deriveTotalHeatTransferCoefficientFromEnvelopeAndVentilation === true;
  const {
    deriveTotalHeatTransferCoefficientFromEnvelopeAndVentilation,
    ...rest
  } = dependencies;
  if (!shouldDerive) {
    return dependencies;
  }
  if (
    hasInputValue(rest, "heatTransferCoefficientWK") ||
    hasInputValue(rest, "totalHeatTransferCoefficientWK") ||
    hasInputValue(rest, "heatTransferCoefficientComponents")
  ) {
    return {
      blockedCode: `${prefix}_ambiguous_utilization_heat_transfer_coefficient_source`
    };
  }
  const hve = finiteNumber(ventilationCase.ventilationHeatTransferCoefficient?.amount);
  if (hve === null || hve < 0) {
    return {
      blockedCode: `${prefix}_invalid_ventilation_coefficient_for_utilization_dependencies`
    };
  }
  return {
    ...rest,
    totalHeatTransferCoefficientWK: envelopeHtr + hve
  };
}

function buildHeatingCase(inputCase, totalTransfer, heatGains, envelopeHtr, ventilationCase) {
  const config = inputCase.heating ?? {};
  const common = {
    caseId: `${inputCase.caseId}.heating_qhnd`,
    month: inputCase.month,
    source: {
      reference: inputCase.source.reference,
      notes: inputCase.source.notes
    }
  };
  if (hasInputValue(config, "longUnoccupiedPeriodAdjustment")) {
    return {
      ...common,
      longUnoccupiedPeriodAdjustment: config.longUnoccupiedPeriodAdjustment
    };
  }
  const utilizationDependencies = deriveUtilizationDependencies(
    config,
    envelopeHtr,
    ventilationCase,
    "heating"
  );
  if (isPlainObject(utilizationDependencies) && utilizationDependencies.blockedCode) {
    return { blockedCode: utilizationDependencies.blockedCode };
  }
  const hasHeatingIntermittency = hasInputValue(config, "heatingIntermittencyCorrection");
  return {
    ...common,
    ...(hasHeatingIntermittency ? {} : { explicitTotalHeatTransferResult: totalTransfer }),
    monthlyHeatGainsResult: heatGains,
    ...(hasInputValue(config, "gammaH") ? { gammaH: config.gammaH } : {}),
    ...(hasInputValue(config, "etaHgn") ? { etaHgn: config.etaHgn } : {}),
    ...(hasInputValue(config, "aH") ? { aH: config.aH } : {}),
    ...(utilizationDependencies === undefined ? {} : { utilizationDependencies }),
    ...(hasHeatingIntermittency
      ? { heatingIntermittencyCorrection: config.heatingIntermittencyCorrection }
      : {})
  };
}

function buildCoolingCase(inputCase, coolingEnergies, heatGains, envelopeHtr, ventilationCase) {
  const config = inputCase.cooling ?? {};
  const common = {
    caseId: `${inputCase.caseId}.cooling_qcnd`,
    month: inputCase.month,
    source: {
      reference: inputCase.source.reference,
      notes: inputCase.source.notes
    }
  };
  if (hasInputValue(config, "longUnoccupiedPeriodAdjustment")) {
    return {
      ...common,
      longUnoccupiedPeriodAdjustment: config.longUnoccupiedPeriodAdjustment
    };
  }
  const utilizationDependencies = deriveUtilizationDependencies(
    config,
    envelopeHtr,
    ventilationCase,
    "cooling"
  );
  if (isPlainObject(utilizationDependencies) && utilizationDependencies.blockedCode) {
    return { blockedCode: utilizationDependencies.blockedCode };
  }
  return {
    ...common,
    qCht: coolingEnergies.qCht,
    monthlyHeatGainsResult: heatGains,
    ...(hasInputValue(config, "gammaC") ? { gammaC: config.gammaC } : {}),
    ...(hasInputValue(config, "etaCht") ? { etaCht: config.etaCht } : {}),
    ...(hasInputValue(config, "aC") ? { aC: config.aC } : {}),
    ...(utilizationDependencies === undefined ? {} : { utilizationDependencies }),
    ...(hasInputValue(config, "aCred") ? { aCred: config.aCred } : {}),
    ...(hasInputValue(config, "coolingIntermittency")
      ? { coolingIntermittency: config.coolingIntermittency }
      : {})
  };
}

export function calculateMc001Chapter2UsefulDemandExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("chapter_2_useful_demand_invalid_mode");
  }
  if (hasForbiddenRootInput(input)) {
    return blocked("chapter_2_client_supplied_derived_result");
  }
  if (!validateEnvelopeTransmissionResult(input.envelopeTransmissionResult)) {
    return blocked("missing_valid_explicit_envelope_transmission_result");
  }
  const monthlyValidation = validateTwelveMonthCases(input.monthlyCases);
  if (!monthlyValidation.ok) {
    return blocked(monthlyValidation.code);
  }

  const envelopeHtr = input.envelopeTransmissionResult.result.amount;
  const monthlyResults = [];
  const heatingCases = [];
  const coolingCases = [];

  for (const monthlyCase of input.monthlyCases) {
    const heatingTransmission = runSingleTransmission(monthlyCase, "heating", envelopeHtr);
    if (!heatingTransmission.ok) return blocked("failed_chapter_2_monthly_case");
    const coolingTransmission = runSingleTransmission(monthlyCase, "cooling", envelopeHtr);
    if (!coolingTransmission.ok) return blocked("failed_chapter_2_monthly_case");
    const heatingVentilation = runSingleVentilation(monthlyCase, "heating");
    if (!heatingVentilation.ok) return blocked("failed_chapter_2_monthly_case");
    const coolingVentilation = runSingleVentilation(monthlyCase, "cooling");
    if (!coolingVentilation.ok) return blocked("failed_chapter_2_monthly_case");
    const heatGains = runSingleHeatGains(monthlyCase);
    if (!heatGains.ok) return blocked("failed_chapter_2_monthly_case");

    const totalTransfer = buildTotalTransfer(
      monthlyCase,
      heatingEnergyAmount(heatingTransmission, heatingVentilation)
    );
    if (!totalTransfer.ok) return blocked("failed_chapter_2_monthly_case");

    const heatingCase = buildHeatingCase(
      monthlyCase,
      totalTransfer.result,
      heatGains.result,
      envelopeHtr,
      heatingVentilation.caseResult
    );
    if (heatingCase.blockedCode) return blocked(heatingCase.blockedCode);

    const coolingCase = buildCoolingCase(
      monthlyCase,
      coolingEnergyAmount(coolingTransmission, coolingVentilation),
      heatGains.result,
      envelopeHtr,
      coolingVentilation.caseResult
    );
    if (coolingCase.blockedCode) return blocked(coolingCase.blockedCode);

    heatingCases.push(heatingCase);
    coolingCases.push(coolingCase);
    monthlyResults.push({
      caseId: monthlyCase.caseId,
      month: monthlyCase.month,
      transmission: {
        heating: heatingTransmission.caseResult,
        cooling: coolingTransmission.caseResult
      },
      ventilation: {
        heating: heatingVentilation.caseResult,
        cooling: coolingVentilation.caseResult
      },
      heatGains: heatGains.caseResult,
      totalHeatingTransfer: totalTransfer.result.result
    });
  }

  const heatingResult = calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: heatingCases
  });
  if (heatingResult.status !== "ready") {
    return blocked("chapter_2_heating_useful_demand_failed");
  }
  const coolingResult = calculateMc001CoolingUsefulDemandExplicit({
    mode: "restricted_cooling_qcnd_explicit_v1",
    cases: coolingCases
  });
  if (coolingResult.status !== "ready") {
    return blocked("chapter_2_cooling_useful_demand_failed");
  }
  const combinedUsefulDemandResult = calculateMc001CombinedUsefulDemandExplicit({
    mode: "combined_useful_demand_explicit_v1",
    heatingResult,
    coolingResult
  });
  if (combinedUsefulDemandResult.status !== "ready") {
    return blocked("chapter_2_combined_useful_demand_failed");
  }

  let latentDemandResult = null;
  if (hasInputValue(input, "latentDemandCases")) {
    const latentResult = calculateMc001LatentDemandExplicit({
      mode: "chapter2_latent_demand_explicit_v1",
      cases: input.latentDemandCases
    });
    if (latentResult.status !== "ready") {
      return blocked("chapter_2_latent_demand_failed");
    }
    latentDemandResult = latentResult;
  }

  return {
    status: "ready",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    result: {
      envelopeSummary: {
        htr: input.envelopeTransmissionResult.result,
        htrOrigin: input.envelopeTransmissionResult.result.origin,
        components: input.envelopeTransmissionResult.components
      },
      monthlyResults,
      heatingResult,
      coolingResult,
      combinedUsefulDemandResult,
      latentDemandResult,
      annualQHnd: heatingResult.summary.annualQHnd,
      annualQCnd: coolingResult.summary.annualQCnd,
      annualHumidificationDemandKwh:
        latentDemandResult?.summary.annualHumidificationDemandKwh ?? null,
      annualDehumidificationDemandKwh:
        latentDemandResult?.summary.annualDehumidificationDemandKwh ?? null,
      caseCount: input.monthlyCases.length,
      monthCount: MONTHS.length,
      coverageCompleteness: {
        sourcePackCode: "MC001_R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK",
        status: "explicit_input_runtime_coverage_with_remaining_table_and_external_dataset_gaps"
      }
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedCalculations: [...EXCLUDED_CALCULATIONS]
    }
  };
}
