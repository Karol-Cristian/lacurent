const MODE = "combined_useful_demand_explicit_v1";
const SCOPE = "combined_QHnd_QCnd_useful_demand_separate_outputs_not_final_energy";
const HEATING_SCOPE = "restricted_heating_qhnd_explicit_input_only_not_full_mc001";
const COOLING_SCOPE = "restricted_cooling_qcnd_explicit_input_only_not_full_mc001";
const FORMULA_REFERENCES = [
  "MC001_2_84_ANNUAL_HEATING_USEFUL_DEMAND",
  "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND",
  "MC001_R10_HEATING_QHND_VERTICAL_CLOSURE_SOURCE_PACK",
  "MC001_R12_COOLING_QCND_FORMULA_SOURCE_PACK"
];
const METHODOLOGY_LIMITS = [
  "separate_heating_and_cooling_useful_demand_outputs",
  "explicit_input_only",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_system_losses",
  "no_hidden_defaults"
];
const EXCLUDED_CALCULATIONS = [
  "final_energy",
  "primary_energy",
  "CO2",
  "certificate",
  "system_losses",
  "fan_electricity",
  "air_treatment_energy",
  "ambiguous_sum_of_heating_and_cooling"
];
const FORBIDDEN_INPUT_KEYS = new Set([
  "totalUsefulDemand",
  "combinedUsefulDemandResult",
  "finalEnergy",
  "primaryEnergy",
  "co2",
  "certificate",
  "formulaCode",
  "formulaReferences"
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasForbiddenDerivedInput(value, path = []) {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((child, index) => hasForbiddenDerivedInput(child, [...path, String(index)]));
  }
  if (!isPlainObject(value)) {
    return true;
  }
  return Object.entries(value).some(([key, child]) => (
    FORBIDDEN_INPUT_KEYS.has(key) || hasForbiddenDerivedInput(child, [...path, key])
  ));
}

function hasForbiddenRootInput(value) {
  return isPlainObject(value) &&
    Object.keys(value).some(key => FORBIDDEN_INPUT_KEYS.has(key));
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

function validateUsefulDemandResult(result, expectedScope, annualKey, caseResultsKey) {
  if (
    !isPlainObject(result) ||
    result.status !== "ready" ||
    result.scope !== expectedScope ||
    !isPlainObject(result.summary) ||
    typeof result.summary[annualKey] !== "number" ||
    !Number.isFinite(result.summary[annualKey]) ||
    result.summary[annualKey] < 0 ||
    !Array.isArray(result.caseResults)
  ) {
    return null;
  }
  return {
    annual: result.summary[annualKey],
    caseResults: result.caseResults,
    caseResultsKey
  };
}

export function calculateMc001CombinedUsefulDemandExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("combined_useful_demand_invalid_mode");
  }
  if (hasForbiddenRootInput(input)) {
    return blocked("combined_useful_demand_client_supplied_derived_result");
  }

  const heating = validateUsefulDemandResult(
    input.heatingResult,
    HEATING_SCOPE,
    "annualQHnd",
    "monthlyHeatingResults"
  );
  if (heating === null) {
    return blocked("combined_useful_demand_missing_valid_heating_result");
  }

  const cooling = validateUsefulDemandResult(
    input.coolingResult,
    COOLING_SCOPE,
    "annualQCnd",
    "monthlyCoolingResults"
  );
  if (cooling === null) {
    return blocked("combined_useful_demand_missing_valid_cooling_result");
  }

  return {
    status: "ready",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    result: {
      annualQHnd: heating.annual,
      annualQCnd: cooling.annual,
      monthlyHeatingResults: heating.caseResults,
      monthlyCoolingResults: cooling.caseResults
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedCalculations: [...EXCLUDED_CALCULATIONS]
    }
  };
}
