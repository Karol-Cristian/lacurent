const COEFFICIENT_MODE = "explicit_ventilation_coefficient_v1";
const MONTHLY_MODE = "explicit_monthly_ventilation_transfer_v1";
const COEFFICIENT_SCOPE = "ventilation_heat_transfer_coefficient_explicit_input_only";
const ENERGY_SCOPE = "ventilation_energy_explicit_input_only_not_QHnd";
const MONTHLY_SCOPE = "monthly_ventilation_transfer_explicit_input_only_not_QHnd";
const COEFFICIENT_FORMULA_CODE = "MC001_2_30_VENTILATION_HEAT_TRANSFER_COEFFICIENT";
const FLOW_FORMULA_CODE = "MC001_2_29_VENTILATION_HEAT_TRANSFER_FLOW_EXPLICIT";
const ENERGY_FORMULA_CODE = "MC001_2_29_VENTILATION_ENERGY_EXPLICIT";
const MONTHLY_FORMULA_CODES = [
  COEFFICIENT_FORMULA_CODE,
  FLOW_FORMULA_CODE,
  ENERGY_FORMULA_CODE
];
const METHODOLOGY_LIMITS = [
  "not_QHnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "not_fan_energy",
  "not_air_treatment_energy",
  "explicit_ventilation_airflow_temperature_duration_inputs_only"
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

function safeOptionalLabel(value, maxLength = 96) {
  return value === null ||
    value === undefined ||
    (
      typeof value === "string" &&
      value.length <= maxLength &&
      !/[<>{}]/.test(value)
    );
}

function explicitSource(source) {
  return isPlainObject(source) &&
    source.sourceType === "explicit_user_input" &&
    safeCode(source.reference, 96);
}

function amountWithUnit(value, unit) {
  return isPlainObject(value) && value.unit === unit ? finiteNumber(value.amount) : null;
}

function dimensionlessAmount(value) {
  return amountWithUnit(value, "dimensionless");
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(scope, formulaCode, relationCode, code) {
  return {
    status: "blocked",
    scope,
    formulaCode,
    relationCode,
    result: null,
    terms: [],
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

function blockedMonthly(code) {
  return {
    status: "blocked",
    scope: MONTHLY_SCOPE,
    formulaCodes: [...MONTHLY_FORMULA_CODES],
    caseResults: [],
    summary: {
      caseCount: 0,
      annualSignedVentilationEnergy: { amount: 0, unit: "kWh" },
      annualPositiveHeatingVentilationEnergy: { amount: 0, unit: "kWh" },
      annualCoolingDirectionVentilationEnergy: { amount: 0, unit: "kWh" }
    },
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

function validateAirHeatCapacity(airHeatCapacity) {
  const amount = amountWithUnit(airHeatCapacity, "J/(m3*K)");
  if (amount === null || amount <= 0) {
    return { ok: false, code: "blocked_invalid_air_heat_capacity" };
  }
  if (!explicitSource(airHeatCapacity.source)) {
    return { ok: false, code: "blocked_missing_explicit_air_heat_capacity_source" };
  }
  return { ok: true, amount };
}

function validateVentilationComponent(component) {
  if (!isPlainObject(component)) {
    return { ok: false, code: "blocked_invalid_ventilation_component" };
  }
  if (!safeCode(component.componentId, 96)) {
    return { ok: false, code: "blocked_invalid_component_id" };
  }
  if (!safeOptionalLabel(component.label)) {
    return { ok: false, code: "blocked_invalid_component_label" };
  }
  const airFlowRate = amountWithUnit(component.airFlowRate, "m3/s");
  const temperatureCorrectionFactor = dimensionlessAmount(component.temperatureCorrectionFactor);
  const dynamicCorrectionFactor = dimensionlessAmount(component.dynamicCorrectionFactor);
  if (airFlowRate === null || airFlowRate < 0) {
    return { ok: false, code: "blocked_invalid_air_flow_rate" };
  }
  if (temperatureCorrectionFactor === null || temperatureCorrectionFactor < 0) {
    return { ok: false, code: "blocked_invalid_temperature_correction_factor" };
  }
  if (dynamicCorrectionFactor === null || dynamicCorrectionFactor < 0) {
    return { ok: false, code: "blocked_invalid_dynamic_correction_factor" };
  }
  if (!explicitSource(component.source)) {
    return { ok: false, code: "blocked_missing_explicit_component_source" };
  }
  return {
    ok: true,
    componentId: component.componentId,
    label: component.label || null,
    airFlowRate,
    temperatureCorrectionFactor,
    dynamicCorrectionFactor
  };
}

function validateCoefficientInput(input) {
  if (!isPlainObject(input) || input.mode !== COEFFICIENT_MODE) {
    return { ok: false, code: "blocked_invalid_ventilation_coefficient_mode" };
  }
  const airHeatCapacity = validateAirHeatCapacity(input.airHeatCapacity);
  if (!airHeatCapacity.ok) return airHeatCapacity;
  if (!Array.isArray(input.components) || input.components.length === 0) {
    return { ok: false, code: "blocked_missing_ventilation_components" };
  }
  const components = [];
  for (const component of input.components) {
    const validation = validateVentilationComponent(component);
    if (!validation.ok) return validation;
    components.push(validation);
  }
  return { ok: true, airHeatCapacity: airHeatCapacity.amount, components };
}

function validateFlowInput(input) {
  if (!isPlainObject(input)) {
    return { ok: false, code: "blocked_invalid_ventilation_flow_input" };
  }
  const hve = amountWithUnit(input.hve, "W/K");
  const indoor = amountWithUnit(input.indoorTemperature, "degC");
  const outdoor = amountWithUnit(input.outdoorTemperature, "degC");
  if (hve === null || hve < 0) {
    return { ok: false, code: "blocked_invalid_hve_value" };
  }
  if (indoor === null || outdoor === null) {
    return { ok: false, code: "blocked_invalid_temperature_value" };
  }
  return { ok: true, hve, indoor, outdoor };
}

function validateEnergyInput(input) {
  const flow = validateFlowInput(input);
  if (!flow.ok) return flow;
  const duration = amountWithUnit(input.duration, "h");
  if (duration === null || duration <= 0) {
    return { ok: false, code: "blocked_invalid_duration" };
  }
  return { ...flow, duration };
}

export function calculateMc001VentilationHeatTransferCoefficient(input = {}) {
  const validation = validateCoefficientInput(input);
  if (!validation.ok) {
    return blocked(COEFFICIENT_SCOPE, COEFFICIENT_FORMULA_CODE, "2.30", validation.code);
  }

  let total = 0;
  const terms = validation.components.map((component) => {
    const amount = validation.airHeatCapacity *
      component.airFlowRate *
      component.temperatureCorrectionFactor *
      component.dynamicCorrectionFactor;
    total += amount;
    return {
      componentId: component.componentId,
      label: component.label,
      airFlowRate: { amount: component.airFlowRate, unit: "m3/s" },
      temperatureCorrectionFactor: {
        amount: component.temperatureCorrectionFactor,
        unit: "dimensionless"
      },
      dynamicCorrectionFactor: {
        amount: component.dynamicCorrectionFactor,
        unit: "dimensionless"
      },
      contributionValue: { amount, unit: "W/K" }
    };
  });

  return {
    status: "ready",
    scope: COEFFICIENT_SCOPE,
    formulaCode: COEFFICIENT_FORMULA_CODE,
    relationCode: "2.30",
    result: { symbol: "H_ve", amount: total, unit: "W/K" },
    terms,
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

export function calculateMc001VentilationHeatFlow(input = {}) {
  const validation = validateFlowInput(input);
  if (!validation.ok) {
    return blocked("ventilation_heat_flow_explicit_input_only", FLOW_FORMULA_CODE, "2.29", validation.code);
  }
  const amount = validation.hve * (validation.indoor - validation.outdoor);
  return {
    status: "ready",
    scope: "ventilation_heat_flow_explicit_input_only",
    formulaCode: FLOW_FORMULA_CODE,
    relationCode: "2.29",
    result: { symbol: "Phi_ve", amount, unit: "W" },
    signConvention: "positive_from_indoor_to_outdoor",
    diagnostics: {
      blockers: [],
      warnings: amount < 0 ? [{ code: "negative_ventilation_flow_direction", severity: "warning" }] : [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

export function calculateMc001VentilationEnergyExplicit(input = {}) {
  const validation = validateEnergyInput(input);
  if (!validation.ok) {
    return blocked(ENERGY_SCOPE, ENERGY_FORMULA_CODE, "2.29", validation.code);
  }
  const heatFlow = validation.hve * (validation.indoor - validation.outdoor);
  const amount = heatFlow * validation.duration / 1000;
  return {
    status: "ready",
    scope: ENERGY_SCOPE,
    formulaCode: ENERGY_FORMULA_CODE,
    relationCode: "2.29",
    result: { symbol: "Q_ve_explicit", amount, unit: "kWh" },
    signConvention: "positive_from_indoor_to_outdoor",
    diagnostics: {
      blockers: [],
      warnings: amount < 0 ? [{ code: "negative_ventilation_energy_direction", severity: "warning" }] : [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

function validateMonthlyCase(monthlyCase) {
  if (!isPlainObject(monthlyCase)) {
    return { ok: false, code: "blocked_invalid_monthly_ventilation_case" };
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
  const airHeatCapacity = validateAirHeatCapacity(monthlyCase.airHeatCapacity);
  if (!airHeatCapacity.ok) return airHeatCapacity;
  if (!Array.isArray(monthlyCase.components) || monthlyCase.components.length === 0) {
    return { ok: false, code: "blocked_missing_ventilation_components" };
  }
  const components = [];
  for (const component of monthlyCase.components) {
    const validation = validateVentilationComponent(component);
    if (!validation.ok) return validation;
    components.push(validation);
  }
  const indoor = amountWithUnit(monthlyCase.indoorTemperature, "degC");
  const outdoor = amountWithUnit(monthlyCase.outdoorTemperature, "degC");
  const duration = amountWithUnit(monthlyCase.duration, "h");
  if (indoor === null || outdoor === null) {
    return { ok: false, code: "blocked_invalid_temperature_value" };
  }
  if (duration === null || duration <= 0) {
    return { ok: false, code: "blocked_invalid_duration" };
  }
  if (!explicitSource(monthlyCase.source)) {
    return { ok: false, code: "blocked_missing_explicit_case_source" };
  }
  return {
    ok: true,
    airHeatCapacity: airHeatCapacity.amount,
    components,
    indoor,
    outdoor,
    duration
  };
}

export function calculateMc001MonthlyVentilationTransferExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MONTHLY_MODE) {
    return blockedMonthly("blocked_invalid_monthly_ventilation_mode");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blockedMonthly("blocked_missing_monthly_ventilation_cases");
  }

  const caseResults = [];
  let annualSigned = 0;
  let annualPositiveHeating = 0;
  let annualCoolingDirection = 0;

  for (const monthlyCase of input.cases) {
    const validation = validateMonthlyCase(monthlyCase);
    if (!validation.ok) return blockedMonthly(validation.code);

    const hveResult = calculateMc001VentilationHeatTransferCoefficient({
      mode: COEFFICIENT_MODE,
      airHeatCapacity: {
        amount: validation.airHeatCapacity,
        unit: "J/(m3*K)",
        source: monthlyCase.airHeatCapacity.source
      },
      components: monthlyCase.components
    });
    if (hveResult.status !== "ready") {
      return blockedMonthly("blocked_invalid_ventilation_coefficient_calculation");
    }

    const heatFlow = calculateMc001VentilationHeatFlow({
      hve: { amount: hveResult.result.amount, unit: "W/K" },
      indoorTemperature: { amount: validation.indoor, unit: "degC" },
      outdoorTemperature: { amount: validation.outdoor, unit: "degC" }
    });
    if (heatFlow.status !== "ready") {
      return blockedMonthly("blocked_invalid_ventilation_heat_flow_calculation");
    }

    const energy = calculateMc001VentilationEnergyExplicit({
      hve: { amount: hveResult.result.amount, unit: "W/K" },
      indoorTemperature: { amount: validation.indoor, unit: "degC" },
      outdoorTemperature: { amount: validation.outdoor, unit: "degC" },
      duration: { amount: validation.duration, unit: "h" }
    });
    if (energy.status !== "ready") {
      return blockedMonthly("blocked_invalid_ventilation_energy_calculation");
    }

    const energyAmount = energy.result.amount;
    annualSigned += energyAmount;
    if (energyAmount > 0) annualPositiveHeating += energyAmount;
    if (energyAmount < 0) annualCoolingDirection += Math.abs(energyAmount);

    caseResults.push({
      caseId: monthlyCase.caseId,
      month: monthlyCase.month,
      calculationMode: monthlyCase.calculationMode,
      ventilationHeatTransferCoefficient: {
        symbol: hveResult.result.symbol,
        amount: hveResult.result.amount,
        unit: hveResult.result.unit
      },
      heatFlow: {
        symbol: heatFlow.result.symbol,
        amount: heatFlow.result.amount,
        unit: heatFlow.result.unit
      },
      ventilationEnergy: {
        symbol: energy.result.symbol,
        amount: energyAmount,
        unit: energy.result.unit
      },
      signConvention: "positive_from_indoor_to_outdoor"
    });
  }

  return {
    status: "ready",
    scope: MONTHLY_SCOPE,
    formulaCodes: [...MONTHLY_FORMULA_CODES],
    caseResults,
    summary: {
      caseCount: caseResults.length,
      annualSignedVentilationEnergy: { amount: annualSigned, unit: "kWh" },
      annualPositiveHeatingVentilationEnergy: { amount: annualPositiveHeating, unit: "kWh" },
      annualCoolingDirectionVentilationEnergy: { amount: annualCoolingDirection, unit: "kWh" }
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}
