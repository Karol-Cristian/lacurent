import {
  calculateMc001TransmissionEnergyFromHeatFlow,
  calculateMc001TransmissionHeatFlow
} from "./mc001TransmissionFormulaCalculations.mjs";

const MODE = "explicit_monthly_transmission_energy_v1";
const SCOPE = "monthly_transmission_energy_explicit_input_only_not_QHnd";
const FORMULA_CODES = [
  "MC001_2_14_TRANSMISSION_HEAT_FLOW",
  "MC001_2_14_TRANSMISSION_HEAT_FLOW_TIME_INTEGRATED_EXPLICIT"
];
const METHODOLOGY_LIMITS = [
  "not_QHnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "explicit_Htr_temperature_duration_inputs_only"
];
const ALLOWED_MONTHS = [
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
const ALLOWED_CALCULATION_MODES = [
  "heating",
  "cooling",
  "explicit_signed"
];

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

function sourceIsExplicit(source) {
  return isPlainObject(source) &&
    source.sourceType === "explicit_user_input" &&
    safeCode(source.reference, 96);
}

function valueAmount(value, unit) {
  return isPlainObject(value) && value.unit === unit ? finiteNumber(value.amount) : null;
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: SCOPE,
    formulaCodes: [...FORMULA_CODES],
    caseResults: [],
    summary: {
      caseCount: 0,
      annualSignedTransmissionEnergy: { amount: 0, unit: "kWh" },
      annualPositiveHeatingTransmissionEnergy: { amount: 0, unit: "kWh" },
      annualCoolingDirectionTransmissionEnergy: { amount: 0, unit: "kWh" }
    },
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

function validateCase(monthlyCase) {
  if (!isPlainObject(monthlyCase)) {
    return { ok: false, code: "blocked_invalid_monthly_transmission_case" };
  }
  if (!safeCode(monthlyCase.caseId, 96)) {
    return { ok: false, code: "blocked_invalid_monthly_case_id" };
  }
  if (!ALLOWED_MONTHS.includes(monthlyCase.month)) {
    return { ok: false, code: "blocked_invalid_month" };
  }
  if (!ALLOWED_CALCULATION_MODES.includes(monthlyCase.calculationMode)) {
    return { ok: false, code: "blocked_invalid_calculation_mode" };
  }
  const htr = valueAmount(monthlyCase.htr, "W/K");
  const indoor = valueAmount(monthlyCase.indoorTemperature, "degC");
  const outdoor = valueAmount(monthlyCase.outdoorTemperature, "degC");
  const duration = valueAmount(monthlyCase.duration, "h");
  if (htr === null || htr < 0) {
    return { ok: false, code: "blocked_invalid_htr_value" };
  }
  if (indoor === null || outdoor === null) {
    return { ok: false, code: "blocked_invalid_temperature_value" };
  }
  if (duration === null || duration <= 0) {
    return { ok: false, code: "blocked_invalid_duration" };
  }
  if (!sourceIsExplicit(monthlyCase.source)) {
    return { ok: false, code: "blocked_missing_explicit_source" };
  }
  return { ok: true, htr, indoor, outdoor, duration };
}

function ensureReady(result, code) {
  return result?.status === "ready" ? { ok: true, result } : { ok: false, code };
}

export function calculateMc001MonthlyTransmissionEnergyExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("blocked_invalid_monthly_transmission_mode");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("blocked_missing_monthly_transmission_cases");
  }

  const caseResults = [];
  let annualSigned = 0;
  let annualPositiveHeating = 0;
  let annualCoolingDirection = 0;

  for (const monthlyCase of input.cases) {
    const validation = validateCase(monthlyCase);
    if (!validation.ok) return blocked(validation.code);

    const heatFlow = ensureReady(
      calculateMc001TransmissionHeatFlow({
        htr: { amount: validation.htr, unit: "W/K" },
        indoorTemperature: { amount: validation.indoor, unit: "degC" },
        outdoorTemperature: { amount: validation.outdoor, unit: "degC" }
      }),
      "blocked_invalid_heat_flow_calculation"
    );
    if (!heatFlow.ok) return blocked(heatFlow.code);

    const energy = ensureReady(
      calculateMc001TransmissionEnergyFromHeatFlow({
        htr: { amount: validation.htr, unit: "W/K" },
        indoorTemperature: { amount: validation.indoor, unit: "degC" },
        outdoorTemperature: { amount: validation.outdoor, unit: "degC" },
        duration: { amount: validation.duration, unit: "h" }
      }),
      "blocked_invalid_transmission_energy_calculation"
    );
    if (!energy.ok) return blocked(energy.code);

    const energyAmount = energy.result.result.amount;
    annualSigned += energyAmount;
    if (energyAmount > 0) annualPositiveHeating += energyAmount;
    if (energyAmount < 0) annualCoolingDirection += Math.abs(energyAmount);

    caseResults.push({
      caseId: monthlyCase.caseId,
      month: monthlyCase.month,
      calculationMode: monthlyCase.calculationMode,
      heatFlow: {
        symbol: heatFlow.result.result.symbol,
        amount: heatFlow.result.result.amount,
        unit: heatFlow.result.result.unit
      },
      transmissionEnergy: {
        symbol: energy.result.result.symbol,
        amount: energyAmount,
        unit: energy.result.result.unit
      },
      signConvention: "positive_from_indoor_to_outdoor"
    });
  }

  return {
    status: "ready",
    scope: SCOPE,
    formulaCodes: [...FORMULA_CODES],
    caseResults,
    summary: {
      caseCount: caseResults.length,
      annualSignedTransmissionEnergy: { amount: annualSigned, unit: "kWh" },
      annualPositiveHeatingTransmissionEnergy: { amount: annualPositiveHeating, unit: "kWh" },
      annualCoolingDirectionTransmissionEnergy: { amount: annualCoolingDirection, unit: "kWh" }
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}
