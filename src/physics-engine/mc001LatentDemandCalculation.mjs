import { resolveHumidificationTable2_21Value } from "./datasets/mc001HumidificationTable2_21.mjs";

const MODE = "chapter2_latent_demand_explicit_v1";
const SCOPE = "chapter2_latent_demand_explicit_input_only_not_final_energy";
const FORMULA_REFERENCES = [
  "MC001_R19_CHAPTER_2_COMPLETE_USEFUL_DEMAND_COVERAGE_SOURCE_PACK",
  "MC001_2_82_MONTHLY_HUMIDIFICATION_LATENT_DEMAND",
  "MC001_2_83_MONTHLY_DEHUMIDIFICATION_LATENT_DEMAND",
  "MC001_2_86_ANNUAL_LATENT_DEMAND_SUM",
  "MC001_TABLE_2_21_HUMIDIFICATION_MOISTURE_SUPPLY"
];
const METHODOLOGY_LIMITS = [
  "chapter_2_latent_demand_only",
  "explicit_input_only",
  "not_QHnd",
  "not_QCnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_CPE",
  "not_certificate",
  "no_hidden_defaults",
  "no_default_humidification_fraction",
  "no_default_latent_heat",
  "no_default_latent_recovery",
  "no_default_air_density",
  "no_default_mechanical_airflow",
  "no_default_dehumidification_fraction"
];
const EXCLUDED_CALCULATIONS = [
  "heating_QHnd",
  "cooling_QCnd",
  "system_losses",
  "fan_electricity",
  "air_treatment_energy",
  "final_energy",
  "primary_energy",
  "CO2",
  "CPE",
  "certificate"
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
const FORBIDDEN_DERIVED_KEYS = new Set([
  "qHUnd",
  "qDHUnd",
  "qHU",
  "qDHU",
  "annualQHUnd",
  "annualQDHUnd",
  "annualLatentDemand",
  "caseResults",
  "summary",
  "result",
  "latentDemandResult"
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

function sourceIsValid(source) {
  return isPlainObject(source) &&
    safeCode(source.reference, 128) &&
    safeNotes(source.notes);
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
  return Object.entries(value).some(([key, child]) => {
    if (FORBIDDEN_DERIVED_KEYS.has(key)) {
      return true;
    }
    return hasForbiddenDerivedInput(child);
  });
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults: [],
    summary: {
      caseCount: 0,
      monthCount: 0,
      annualHumidificationDemandKwh: 0,
      annualDehumidificationDemandKwh: 0
    },
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedCalculations: [...EXCLUDED_CALCULATIONS]
    }
  };
}

function validateFraction(value, code) {
  const amount = finiteNumber(value);
  if (amount === null || amount < 0 || amount > 1) {
    return { ok: false, code };
  }
  return { ok: true, amount };
}

function validateNonNegative(value, code) {
  const amount = finiteNumber(value);
  if (amount === null || amount < 0) {
    return { ok: false, code };
  }
  return { ok: true, amount };
}

function validatePositive(value, code) {
  const amount = finiteNumber(value);
  if (amount === null || amount <= 0) {
    return { ok: false, code };
  }
  return { ok: true, amount };
}

function resolveHumidificationFraction(config) {
  const hasDirect = hasInputValue(config, "monthlyHumidificationFraction");
  const hasDemandSource = hasInputValue(config, "heatingDemandFractionSource");
  if (hasDirect && hasDemandSource) {
    return { ok: false, code: "latent_ambiguous_humidification_fraction_source" };
  }
  if (!hasDirect && !hasDemandSource) {
    return { ok: false, code: "latent_missing_explicit_humidification_fraction" };
  }
  if (hasDirect) {
    const fraction = validateFraction(
      config.monthlyHumidificationFraction,
      "latent_invalid_humidification_fraction"
    );
    if (!fraction.ok) return fraction;
    return {
      ok: true,
      amount: fraction.amount,
      origin: "explicit_input",
      sourceReference: config.source.reference
    };
  }

  const source = config.heatingDemandFractionSource;
  if (!isPlainObject(source) || !sourceIsValid(source.source)) {
    return { ok: false, code: "latent_missing_heating_demand_fraction_source" };
  }
  const monthlyQHnd = validateNonNegative(
    source.monthlyQHndKwh,
    "latent_invalid_monthly_QHnd_for_humidification_fraction"
  );
  if (!monthlyQHnd.ok) return monthlyQHnd;
  const annualQHnd = validatePositive(
    source.annualQHndKwh,
    "latent_invalid_annual_QHnd_for_humidification_fraction"
  );
  if (!annualQHnd.ok) return annualQHnd;
  if (monthlyQHnd.amount > annualQHnd.amount) {
    return { ok: false, code: "latent_humidification_fraction_exceeds_annual_QHnd" };
  }
  return {
    ok: true,
    amount: monthlyQHnd.amount / annualQHnd.amount,
    origin: "calculated_from_MC001_2_82_QHnd_month_over_annual",
    sourceReference: source.source.reference,
    monthlyQHndKwh: monthlyQHnd.amount,
    annualQHndKwh: annualQHnd.amount
  };
}

function resolveAnnualMoistureSupply(config) {
  const hasDirect = hasInputValue(config, "annualMoistureSupplyKgHPerKg");
  const hasTable = hasInputValue(config, "annualMoistureSupplyTable2_21CategoryId");
  if (hasDirect && hasTable) {
    return { ok: false, code: "latent_ambiguous_annual_moisture_supply_source" };
  }
  if (!hasDirect && !hasTable) {
    return { ok: false, code: "latent_missing_annual_moisture_supply" };
  }
  if (hasDirect) {
    const amount = validateNonNegative(
      config.annualMoistureSupplyKgHPerKg,
      "latent_invalid_annual_moisture_supply"
    );
    if (!amount.ok) return amount;
    return {
      ok: true,
      amount: amount.amount,
      origin: "explicit_input",
      sourceReference: config.source.reference
    };
  }
  if (!safeCode(config.annualMoistureSupplyTable2_21CategoryId, 96)) {
    return { ok: false, code: "latent_invalid_table_2_21_category" };
  }
  const tableValue = resolveHumidificationTable2_21Value({
    categoryId: config.annualMoistureSupplyTable2_21CategoryId
  });
  if (tableValue.status !== "ready") {
    return { ok: false, code: "latent_unknown_table_2_21_category" };
  }
  return {
    ok: true,
    amount: tableValue.annualMoistureSupplyKgHPerKg,
    origin: "calculated_from_MC001_table_2_21_space_category_lookup",
    sourceReference: tableValue.sourceTable,
    tableCategoryId: tableValue.categoryId,
    tableCategoryRo: tableValue.categoryRo
  };
}

function calculateHumidification(config) {
  if (!isPlainObject(config)) {
    return { ok: false, code: "latent_invalid_humidification_input" };
  }
  if (!sourceIsValid(config.source)) {
    return { ok: false, code: "latent_missing_humidification_source" };
  }
  const fraction = resolveHumidificationFraction(config);
  if (!fraction.ok) return fraction;
  const hwe = validatePositive(
    config.latentHeatOfVaporizationJPerKg,
    "latent_invalid_latent_heat_of_vaporization"
  );
  if (!hwe.ok) return hwe;
  const recovery = validateFraction(
    config.latentHeatRecoveryEfficiency,
    "latent_invalid_latent_heat_recovery_efficiency"
  );
  if (!recovery.ok) return recovery;
  const airDensity = validatePositive(
    config.airDensityKgPerM3,
    "latent_invalid_air_density"
  );
  if (!airDensity.ok) return airDensity;
  const mechanicalAirflow = validateNonNegative(
    config.mechanicalSupplyAirflowM3PerS,
    "latent_invalid_mechanical_supply_airflow"
  );
  if (!mechanicalAirflow.ok) return mechanicalAirflow;
  const moistureSupply = resolveAnnualMoistureSupply(config);
  if (!moistureSupply.ok) return moistureSupply;

  const qHUndKwh =
    fraction.amount *
    hwe.amount *
    (1 - recovery.amount) *
    airDensity.amount *
    mechanicalAirflow.amount *
    moistureSupply.amount /
    1000;
  if (!Number.isFinite(qHUndKwh) || qHUndKwh < 0) {
    return { ok: false, code: "latent_invalid_humidification_result" };
  }
  return {
    ok: true,
    result: {
      qHUndKwh,
      monthlyHumidificationFraction: fraction.amount,
      humidificationFractionOrigin: fraction.origin,
      latentHeatOfVaporizationJPerKg: hwe.amount,
      latentHeatRecoveryEfficiency: recovery.amount,
      airDensityKgPerM3: airDensity.amount,
      mechanicalSupplyAirflowM3PerS: mechanicalAirflow.amount,
      annualMoistureSupplyKgHPerKg: moistureSupply.amount,
      annualMoistureSupplyOrigin: moistureSupply.origin,
      sourceReference: config.source.reference,
      formulaCode: "MC001_RELATION_2_82_MONTHLY_HUMIDIFICATION_LATENT_DEMAND"
    }
  };
}

function calculateDehumidification(config) {
  if (!isPlainObject(config)) {
    return { ok: false, code: "latent_invalid_dehumidification_input" };
  }
  if (!sourceIsValid(config.source)) {
    return { ok: false, code: "latent_missing_dehumidification_source" };
  }
  const sensibleCooling = validateNonNegative(
    config.sensibleCoolingDemandKwh,
    "latent_invalid_sensible_cooling_demand"
  );
  if (!sensibleCooling.ok) return sensibleCooling;
  const fraction = validateFraction(
    config.dehumidificationFraction,
    "latent_invalid_dehumidification_fraction"
  );
  if (!fraction.ok) return fraction;
  const qDHUndKwh = fraction.amount * sensibleCooling.amount;
  if (!Number.isFinite(qDHUndKwh) || qDHUndKwh < 0) {
    return { ok: false, code: "latent_invalid_dehumidification_result" };
  }
  return {
    ok: true,
    result: {
      qDHUndKwh,
      sensibleCoolingDemandKwh: sensibleCooling.amount,
      dehumidificationFraction: fraction.amount,
      dehumidificationFractionOrigin:
        "explicit_input_external_PEC_M7_1_SR_EN_16798_3_contract",
      sourceReference: config.source.reference,
      formulaCode: "MC001_RELATION_2_83_MONTHLY_DEHUMIDIFICATION_LATENT_DEMAND"
    }
  };
}

export function calculateMc001LatentDemandExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("latent_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("latent_client_supplied_derived_result");
  }
  if (!Array.isArray(input.cases)) {
    return blocked("latent_missing_cases");
  }
  if (input.cases.length === 0) {
    return blocked("latent_empty_cases");
  }

  const caseIds = new Set();
  const months = new Set();
  const caseResults = [];
  let annualHumidificationDemandKwh = 0;
  let annualDehumidificationDemandKwh = 0;

  for (const monthlyCase of input.cases) {
    if (!isPlainObject(monthlyCase)) {
      return blocked("latent_invalid_case");
    }
    if (!safeCode(monthlyCase.caseId, 96)) {
      return blocked("latent_invalid_case_identifier");
    }
    if (caseIds.has(monthlyCase.caseId)) {
      return blocked("latent_duplicate_case_identifier");
    }
    if (!MONTHS.includes(monthlyCase.month)) {
      return blocked("latent_invalid_month");
    }
    if (!sourceIsValid(monthlyCase.source)) {
      return blocked("latent_missing_case_source");
    }
    const hasHumidification = hasInputValue(monthlyCase, "humidification");
    const hasDehumidification = hasInputValue(monthlyCase, "dehumidification");
    if (!hasHumidification && !hasDehumidification) {
      return blocked("latent_missing_humidification_or_dehumidification_input");
    }

    const caseResult = {
      caseId: monthlyCase.caseId,
      month: monthlyCase.month,
      scope: SCOPE,
      sourceReference: monthlyCase.source.reference
    };

    if (hasHumidification) {
      const humidification = calculateHumidification(monthlyCase.humidification);
      if (!humidification.ok) {
        return blocked(humidification.code);
      }
      caseResult.humidification = humidification.result;
      annualHumidificationDemandKwh += humidification.result.qHUndKwh;
    }

    if (hasDehumidification) {
      const dehumidification = calculateDehumidification(monthlyCase.dehumidification);
      if (!dehumidification.ok) {
        return blocked(dehumidification.code);
      }
      caseResult.dehumidification = dehumidification.result;
      annualDehumidificationDemandKwh += dehumidification.result.qDHUndKwh;
    }

    caseIds.add(monthlyCase.caseId);
    months.add(monthlyCase.month);
    caseResults.push(caseResult);
  }

  return {
    status: "ready",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults,
    summary: {
      caseCount: caseResults.length,
      monthCount: months.size,
      annualHumidificationDemandKwh,
      annualDehumidificationDemandKwh,
      annualLatentDemandFormulaCode: "MC001_RELATION_2_86_ANNUAL_LATENT_DEMAND_SUM"
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedCalculations: [...EXCLUDED_CALCULATIONS]
    }
  };
}
