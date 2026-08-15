import { MC001_MONTHLY_SOLAR_GAINS_SCOPE } from "./mc001SolarGainsCalculation.mjs";
import {
  buildArithmeticExecutionTrace,
  buildBranchExecutionTrace,
  inputExpression,
  operatorExpression,
  traceInput,
  valueExpression
} from "./mc001ExecutionTrace.mjs";

const MODE = "monthly_heat_gains_explicit_v1";
const SCOPE = "monthly_heat_gains_explicit_input_only_not_full_QHnd";
const FORMULA_CODE = "MC001_EXPLICIT_MONTHLY_HEAT_GAINS_SUM";
const ADJACENT_UNCONDITIONED_GAINS_FORMULA_CODE =
  "MC001_RELATION_2_34_2_37_ADJACENT_UNCONDITIONED_ZONE_GAINS";
const GAIN_REDUCTION_SINGLE_FORMULA_CODE =
  "MC001_RELATION_2_51_SINGLE_ADJACENT_ZONE_GAIN_REDUCTION";
const GAIN_REDUCTION_MULTIPLE_FORMULA_CODE =
  "MC001_RELATION_2_52_MULTIPLE_ADJACENT_ZONES_GAIN_REDUCTION";
const GAIN_REDUCTION_INTERNAL_FORMULA_CODE =
  "MC001_RELATION_2_53_INTERNAL_UNCONDITIONED_ZONE_GAIN_REDUCTION";
const FORMULA_REFERENCES = [
  "MC001_R6_GAINS_CAPACITY_TIMECONSTANT_READINESS_SOURCE_PACK",
  "MC001_R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK",
  "MC001_2_7_2_TOTAL_HEAT_GAINS_AND_INTERNAL_GAINS",
  "MC001_2_7_3_SOLAR_GAINS"
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
  "heat_gains_sum_only",
  "not_full_QHnd",
  "not_QCnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_hidden_defaults",
  "no_default_internal_gains",
  "no_default_solar_gains",
  "solar_gains_result_allowed_when_source_backed",
  "adjacent_unconditioned_zone_gains_allowed_when_explicit_source_backed",
  "no_default_occupancy",
  "no_default_schedules",
  "no_default_climate_data",
  "no_default_window_orientation_shading_data",
  "no_default_bztu",
  "no_default_distribution_factor",
  "no_default_gain_reduction_factor"
];
const EXCLUDED_CALCULATIONS = [
  "internal_gains_from_occupancy_or_equipment",
  "solar_gains_from_geometry_or_radiation",
  "utilization_factor",
  "QHnd",
  "QCnd",
  "system_losses",
  "final_energy",
  "primary_energy",
  "CO2",
  "certificate"
];
const FORBIDDEN_INPUT_KEYS = new Set([
  "qHgn",
  "annualQHgn",
  "caseResults",
  "summary",
  "result",
  "results",
  "totalGains",
  "heatGainsResult",
  "adjacentUnconditionedZoneResults",
  "solarGainsResult",
  "executionTrace",
  "gainReductionExecutionTrace",
  "internalGainContributionExecutionTrace",
  "solarGainContributionExecutionTrace",
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
  return Object.entries(value).some(([key, child]) => {
    const nextPath = [...path, key];
    const isAllowedSolarGainsResultContainer = key === "solarGainsResult" &&
      path.includes("cases");
    const isAllowedSolarGainsResultKey = path.includes("solarGainsResult") &&
      [
        "caseResults",
        "summary",
        "formulaCode",
        "formulaReferences",
        "executionTrace",
        "annualSolarGains",
        "qSolDir",
        "transparentElementResults",
        "opaqueElementResults"
      ].includes(key);
    return (
      (
        !isAllowedSolarGainsResultContainer &&
        !isAllowedSolarGainsResultKey &&
        FORBIDDEN_INPUT_KEYS.has(key)
      ) ||
      hasForbiddenDerivedInput(child, nextPath)
    );
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
      annualQHgn: 0,
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
    return { ok: false, code: "monthly_heat_gains_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "monthly_heat_gains_invalid_source_notes" };
  }
  return { ok: true };
}

function hasInputValue(value, key) {
  return value[key] !== undefined && value[key] !== null;
}

function numberInRange(value, code, { min = null, max = null, minExclusive = false } = {}) {
  const number = finiteNumber(value);
  if (number === null) return { ok: false, code };
  if (min !== null && (minExclusive ? number <= min : number < min)) {
    return { ok: false, code };
  }
  if (max !== null && number > max) {
    return { ok: false, code };
  }
  return { ok: true, value: number };
}

function validateSolarGainsResult(solarResult, month) {
  if (
    !isPlainObject(solarResult) ||
    solarResult.status !== "ready" ||
    solarResult.scope !== MC001_MONTHLY_SOLAR_GAINS_SCOPE ||
    !Array.isArray(solarResult.caseResults) ||
    solarResult.caseResults.length !== 1
  ) {
    return { ok: false, code: "monthly_heat_gains_invalid_solar_gains_result" };
  }
  const solarCase = solarResult.caseResults[0];
  const solarGains = finiteNumber(solarCase?.solarGains);
  if (solarGains === null || solarGains < 0) {
    return { ok: false, code: "monthly_heat_gains_invalid_solar_gains_result" };
  }
  if (solarCase.month !== month) {
    return { ok: false, code: "monthly_heat_gains_solar_gains_result_month_mismatch" };
  }
  return {
    ok: true,
    value: {
      solarGains,
      solarGainsOrigin: "calculated_from_explicit_monthly_solar_gains_result",
      solarGainsFormulaCode: solarCase.formulaCode,
      solarGainsScope: solarCase.scope
    }
  };
}

function resolveSolarGains(container, month) {
  const hasDirectSolarGains = hasInputValue(container, "solarGains");
  const hasSolarGainsResult = hasInputValue(container, "solarGainsResult");
  if (hasDirectSolarGains && hasSolarGainsResult) {
    return {
      ok: false,
      code: "monthly_heat_gains_solar_gains_and_solar_result_mutually_exclusive"
    };
  }
  if (!hasDirectSolarGains && !hasSolarGainsResult) {
    return { ok: false, code: "monthly_heat_gains_missing_solar_gains" };
  }
  if (hasDirectSolarGains) {
    const solarGains = finiteNumber(container.solarGains);
    if (solarGains === null) {
      return { ok: false, code: "monthly_heat_gains_missing_solar_gains" };
    }
    if (solarGains < 0) {
      return { ok: false, code: "monthly_heat_gains_negative_solar_gains" };
    }
    return {
      ok: true,
      value: {
        solarGains,
        solarGainsOrigin: "explicit_input"
      }
    };
  }
  return validateSolarGainsResult(container.solarGainsResult, month);
}

function resolveBztu(zone) {
  const hasDirectBztu = hasInputValue(zone, "bztu");
  const hasBztuInput = hasInputValue(zone, "bztuInput");
  if (hasDirectBztu && hasBztuInput) {
    return { ok: false, code: "monthly_heat_gains_ambiguous_bztu_source" };
  }
  if (!hasDirectBztu && !hasBztuInput) {
    return { ok: false, code: "monthly_heat_gains_missing_explicit_bztu" };
  }
  if (hasDirectBztu) {
    const direct = numberInRange(
      zone.bztu,
      "monthly_heat_gains_invalid_bztu",
      { min: 0, max: 1 }
    );
    if (!direct.ok) return direct;
    return {
      ok: true,
      value: {
        bztu: direct.value,
        bztuOrigin: "explicit_input",
        bztuFormulaCode: "EXPLICIT_BZTU_CORRECTION_FACTOR"
      }
    };
  }

  const input = zone.bztuInput;
  if (!isPlainObject(input)) {
    return { ok: false, code: "monthly_heat_gains_invalid_bztu_input" };
  }
  if (input.mode === "bztu_explicit_heat_transfer_ratio_v1") {
    const exterior = numberInRange(
      input.heatTransferToExterior,
      "monthly_heat_gains_invalid_bztu_exterior_heat_transfer",
      { min: 0 }
    );
    if (!exterior.ok) return exterior;
    const total = numberInRange(
      input.totalHeatTransfer,
      "monthly_heat_gains_invalid_bztu_total_heat_transfer",
      { min: 0, minExclusive: true }
    );
    if (!total.ok) return total;
    if (exterior.value > total.value) {
      return { ok: false, code: "monthly_heat_gains_invalid_bztu_heat_transfer_ratio" };
    }
    return {
      ok: true,
      value: {
        bztu: exterior.value / total.value,
        bztuOrigin: "calculated_from_MC001_2_22_explicit_bztu_heat_transfer_ratio",
        bztuFormulaCode: "MC001_2_22_BZTU_CORRECTION_FACTOR"
      }
    };
  }
  if (input.mode !== "bztu_explicit_ztu_balance_v1") {
    return { ok: false, code: "monthly_heat_gains_unsupported_bztu_input_mode" };
  }

  const exteriorEnvelope = numberInRange(
    input.heatTransferToExteriorEnvelope,
    "monthly_heat_gains_invalid_bztu_exterior_envelope_heat_transfer",
    { min: 0 }
  );
  if (!exteriorEnvelope.ok) return exteriorEnvelope;
  const exteriorVentilation = numberInRange(
    input.exteriorVentilationCoefficient,
    "monthly_heat_gains_invalid_bztu_exterior_ventilation_coefficient",
    { min: 0 }
  );
  if (!exteriorVentilation.ok) return exteriorVentilation;
  if (!Array.isArray(input.conditionedZoneHeatTransfers) || input.conditionedZoneHeatTransfers.length === 0) {
    return { ok: false, code: "monthly_heat_gains_missing_bztu_conditioned_heat_transfers" };
  }
  const conditionedTransfers = [];
  for (const transfer of input.conditionedZoneHeatTransfers) {
    const amount = numberInRange(
      transfer,
      "monthly_heat_gains_invalid_bztu_conditioned_heat_transfer",
      { min: 0, minExclusive: true }
    );
    if (!amount.ok) return amount;
    conditionedTransfers.push(amount.value);
  }
  const hztuExterior = (1 + exteriorVentilation.value) * exteriorEnvelope.value;
  const hztuTotal = conditionedTransfers.reduce((sum, amount) => sum + amount, 0) + hztuExterior;
  if (hztuExterior > hztuTotal) {
    return { ok: false, code: "monthly_heat_gains_invalid_bztu_balance_ratio" };
  }
  return {
    ok: true,
    value: {
      bztu: hztuExterior / hztuTotal,
      bztuOrigin: "calculated_from_MC001_2_22_2_23_2_24_explicit_ztu_balance",
      bztuFormulaCode: "MC001_2_22_2_23_2_24_BZTU_EXPLICIT_BALANCE",
      hztuExterior,
      hztuTotal
    }
  };
}

function resolveDistributionFactor(zone) {
  const hasDirectFactor = hasInputValue(zone, "distributionFactor");
  const hasFactorInput = hasInputValue(zone, "distributionFactorInput");
  if (hasDirectFactor && hasFactorInput) {
    return { ok: false, code: "monthly_heat_gains_ambiguous_distribution_factor_source" };
  }
  if (!hasDirectFactor && !hasFactorInput) {
    return { ok: false, code: "monthly_heat_gains_missing_explicit_distribution_factor" };
  }
  if (hasDirectFactor) {
    const direct = numberInRange(
      zone.distributionFactor,
      "monthly_heat_gains_invalid_distribution_factor",
      { min: 0, max: 1 }
    );
    if (!direct.ok) return direct;
    return {
      ok: true,
      value: {
        distributionFactor: direct.value,
        distributionFactorOrigin: "explicit_input",
        distributionFormulaCode: "EXPLICIT_ZTC_ZTU_DISTRIBUTION_FACTOR"
      }
    };
  }

  const input = zone.distributionFactorInput;
  if (!isPlainObject(input)) {
    return { ok: false, code: "monthly_heat_gains_invalid_distribution_factor_input" };
  }
  if (input.mode === "single_adjacent_conditioned_zone_v1") {
    if (input.singleAdjacentConditionedZoneConfirmed !== true) {
      return {
        ok: false,
        code: "monthly_heat_gains_missing_single_adjacent_zone_confirmation"
      };
    }
    return {
      ok: true,
      value: {
        distributionFactor: 1,
        distributionFactorOrigin: "calculated_from_MC001_FIGURE_2_8_single_adjacent_conditioned_zone",
        distributionFormulaCode: "MC001_FIGURE_2_8_SINGLE_ADJACENT_DISTRIBUTION_FACTOR"
      }
    };
  }
  if (input.mode !== "explicit_heat_transfer_share_v1") {
    return { ok: false, code: "monthly_heat_gains_unsupported_distribution_factor_input_mode" };
  }
  const target = numberInRange(
    input.heatTransferCoefficientToTargetConditionedZone,
    "monthly_heat_gains_invalid_distribution_target_heat_transfer",
    { min: 0, minExclusive: true }
  );
  if (!target.ok) return target;
  const total = numberInRange(
    input.totalHeatTransferCoefficientToConditionedZones,
    "monthly_heat_gains_invalid_distribution_total_heat_transfer",
    { min: 0, minExclusive: true }
  );
  if (!total.ok) return total;
  if (target.value > total.value) {
    return { ok: false, code: "monthly_heat_gains_invalid_distribution_heat_transfer_share" };
  }
  return {
    ok: true,
    value: {
      distributionFactor: target.value / total.value,
      distributionFactorOrigin: "calculated_from_MC001_FIGURE_2_8_explicit_heat_transfer_share",
      distributionFormulaCode: "MC001_FIGURE_2_8_DISTRIBUTION_FACTOR"
    }
  };
}

function resolveGainReductionFactor(zone, adjacentInternalGains, adjacentSolarGains, bztu) {
  const hasDirectFactor = hasInputValue(zone, "gainReductionFactor");
  const hasFactorInput = hasInputValue(zone, "gainReductionFactorInput");
  if (hasDirectFactor && hasFactorInput) {
    return { ok: false, code: "monthly_heat_gains_ambiguous_gain_reduction_factor_source" };
  }
  if (!hasDirectFactor && !hasFactorInput) {
    return { ok: false, code: "monthly_heat_gains_missing_explicit_gain_reduction_factor" };
  }
  if (hasDirectFactor) {
    const direct = numberInRange(
      zone.gainReductionFactor,
      "monthly_heat_gains_invalid_gain_reduction_factor",
      { min: 0 }
    );
    if (!direct.ok) return direct;
    return {
      ok: true,
      value: {
        gainReductionFactor: direct.value,
        gainReductionFactorOrigin: "explicit_input",
        gainReductionFormulaCode: "EXPLICIT_GAIN_REDUCTION_FACTOR",
        gainReductionExecutionTrace: buildBranchExecutionTrace({
          formulaId: "EXPLICIT_GAIN_REDUCTION_FACTOR",
          branchId: "explicit_gain_reduction_factor",
          inputs: {
            fgnMax: traceInput(direct.value, "-")
          },
          condition: {
            expression: "explicit source-backed gain-reduction factor supplied",
            evaluated: true
          },
          finalResult: direct.value,
          unit: "-",
          reason: "Explicit source-backed gain-reduction factor supplied."
        })
      }
    };
  }

  const input = zone.gainReductionFactorInput;
  if (!isPlainObject(input)) {
    return { ok: false, code: "monthly_heat_gains_invalid_gain_reduction_factor_input" };
  }
  if (input.mode === "internal_unconditioned_zone_insignificant_gains_v1") {
    if (input.insignificantGainsConfirmed !== true) {
      return {
        ok: false,
        code: "monthly_heat_gains_missing_insignificant_gains_confirmation"
      };
    }
    return {
      ok: true,
      value: {
        gainReductionFactor: 1,
        gainReductionFactorOrigin: "calculated_from_MC001_2_53_internal_unconditioned_zone",
        gainReductionFormulaCode: GAIN_REDUCTION_INTERNAL_FORMULA_CODE,
        gainReductionExecutionTrace: buildBranchExecutionTrace({
          formulaId: GAIN_REDUCTION_INTERNAL_FORMULA_CODE,
          branchId: "internal_unconditioned_zone_insignificant_gains",
          condition: {
            expression: "insignificant internal unconditioned-zone gains confirmed",
            evaluated: true
          },
          finalResult: 1,
          unit: "-",
          reason: "MC001 relation 2.53 branch treats insignificant gains with fgn,max = 1."
        })
      }
    };
  }

  const denominator = adjacentInternalGains + adjacentSolarGains;
  if (denominator <= 0) {
    return { ok: false, code: "monthly_heat_gains_invalid_gain_reduction_zero_gain_denominator" };
  }
  const exteriorAirTemperature = finiteNumber(input.exteriorAirTemperature);
  if (exteriorAirTemperature === null) {
    return { ok: false, code: "monthly_heat_gains_invalid_gain_reduction_exterior_temperature" };
  }
  const durationHours = numberInRange(
    input.durationHours,
    "monthly_heat_gains_invalid_gain_reduction_duration",
    { min: 0, minExclusive: true }
  );
  if (!durationHours.ok) return durationHours;

  let numeratorHeatTransfer = null;
  let origin = null;
  let formulaCode = null;
  let traceTerms = null;
  if (input.mode === "external_single_adjacent_conditioned_zone_explicit_v1") {
    const heatTransfer = numberInRange(
      input.heatTransferCoefficientToConditionedZone,
      "monthly_heat_gains_invalid_gain_reduction_heat_transfer",
      { min: 0, minExclusive: true }
    );
    if (!heatTransfer.ok) return heatTransfer;
    const setpoint = finiteNumber(input.internalSetpointTemperature);
    if (setpoint === null) {
      return { ok: false, code: "monthly_heat_gains_invalid_gain_reduction_setpoint" };
    }
    numeratorHeatTransfer = heatTransfer.value * (setpoint - exteriorAirTemperature);
    origin = "calculated_from_MC001_2_51_single_adjacent_zone";
    formulaCode = GAIN_REDUCTION_SINGLE_FORMULA_CODE;
    traceTerms = {
      mode: "single",
      heatTransferCoefficient: heatTransfer.value,
      internalSetpointTemperature: setpoint,
      exteriorAirTemperature
    };
  } else if (input.mode === "external_multiple_adjacent_conditioned_zones_explicit_v1") {
    if (!Array.isArray(input.conditionedZoneHeatTransfers) || input.conditionedZoneHeatTransfers.length === 0) {
      return { ok: false, code: "monthly_heat_gains_missing_gain_reduction_conditioned_zones" };
    }
    numeratorHeatTransfer = 0;
    const traceTransfers = [];
    for (const transfer of input.conditionedZoneHeatTransfers) {
      if (!isPlainObject(transfer)) {
        return { ok: false, code: "monthly_heat_gains_invalid_gain_reduction_conditioned_zone" };
      }
      const coefficient = numberInRange(
        transfer.heatTransferCoefficient,
        "monthly_heat_gains_invalid_gain_reduction_conditioned_heat_transfer",
        { min: 0, minExclusive: true }
      );
      if (!coefficient.ok) return coefficient;
      const setpoint = finiteNumber(transfer.internalSetpointTemperature);
      if (setpoint === null) {
        return { ok: false, code: "monthly_heat_gains_invalid_gain_reduction_conditioned_setpoint" };
      }
      numeratorHeatTransfer += coefficient.value * (setpoint - exteriorAirTemperature);
      traceTransfers.push({
        heatTransferCoefficient: coefficient.value,
        internalSetpointTemperature: setpoint
      });
    }
    origin = "calculated_from_MC001_2_52_multiple_adjacent_zones";
    formulaCode = GAIN_REDUCTION_MULTIPLE_FORMULA_CODE;
    traceTerms = {
      mode: "multiple",
      exteriorAirTemperature,
      conditionedZoneHeatTransfers: traceTransfers
    };
  } else {
    return { ok: false, code: "monthly_heat_gains_unsupported_gain_reduction_factor_input_mode" };
  }

  const gainReductionFactor = (bztu * numeratorHeatTransfer * 0.001 * durationHours.value) / denominator;
  if (!Number.isFinite(gainReductionFactor) || gainReductionFactor < 0) {
    return { ok: false, code: "monthly_heat_gains_invalid_calculated_gain_reduction_factor" };
  }
  const multipleNumeratorTerms = traceTerms?.mode === "multiple"
    ? traceTerms.conditionedZoneHeatTransfers.map((_, index) =>
        operatorExpression("multiply", [
          inputExpression(`Hztc${index + 1}`),
          operatorExpression("subtract", [
            inputExpression(`theta_i${index + 1}`),
            inputExpression("theta_e")
          ])
        ])
      )
    : null;
  const numeratorExpression = traceTerms?.mode === "multiple"
    ? (multipleNumeratorTerms.length === 1
        ? multipleNumeratorTerms[0]
        : operatorExpression("add", multipleNumeratorTerms))
    : operatorExpression("multiply", [
        inputExpression("Hztc"),
        operatorExpression("subtract", [
          inputExpression("theta_i"),
          inputExpression("theta_e")
        ])
      ]);
  const traceInputs = {
    bztu: traceInput(bztu, "-"),
    t: traceInput(durationHours.value, "h"),
    Qadj: traceInput(denominator, "kWh"),
    theta_e: traceInput(exteriorAirTemperature, "degC")
  };
  if (traceTerms?.mode === "multiple") {
    traceTerms.conditionedZoneHeatTransfers.forEach((transfer, index) => {
      traceInputs[`Hztc${index + 1}`] = traceInput(transfer.heatTransferCoefficient, "W/K");
      traceInputs[`theta_i${index + 1}`] = traceInput(transfer.internalSetpointTemperature, "degC");
    });
  } else {
    traceInputs.Hztc = traceInput(traceTerms.heatTransferCoefficient, "W/K");
    traceInputs.theta_i = traceInput(traceTerms.internalSetpointTemperature, "degC");
  }
  return {
    ok: true,
    value: {
      gainReductionFactor,
      gainReductionFactorOrigin: origin,
      gainReductionFormulaCode: formulaCode,
      gainReductionExecutionTrace: buildArithmeticExecutionTrace({
        formulaId: formulaCode,
        branchId: traceTerms?.mode === "multiple"
          ? "multiple_adjacent_conditioned_zones"
          : "single_adjacent_conditioned_zone",
        inputs: traceInputs,
        expression: operatorExpression("divide", [
          operatorExpression("multiply", [
            inputExpression("bztu"),
            numeratorExpression,
            valueExpression(0.001),
            inputExpression("t")
          ]),
          inputExpression("Qadj")
        ]),
        rawResult: gainReductionFactor,
        finalResult: gainReductionFactor,
        unit: "-",
        clampApplied: false
      })
    }
  };
}

function adjacentGainContributionTrace({
  formulaId,
  branchId,
  bztu,
  distributionFactor,
  gainReductionFactor,
  directGains,
  contribution
}) {
  return buildArithmeticExecutionTrace({
    formulaId,
    branchId,
    inputs: {
      bztu: traceInput(bztu, "-"),
      FztcZtu: traceInput(distributionFactor, "-"),
      fgnMax: traceInput(gainReductionFactor, "-"),
      QdirZtu: traceInput(directGains, "kWh")
    },
    expression: operatorExpression("multiply", [
      operatorExpression("subtract", [valueExpression(1), inputExpression("bztu")]),
      inputExpression("FztcZtu"),
      inputExpression("fgnMax"),
      inputExpression("QdirZtu")
    ]),
    rawResult: contribution,
    finalResult: contribution,
    unit: "kWh",
    clampApplied: false
  });
}

function heatGainsSumTrace({ internalGains, solarGains, qHgn }) {
  return buildArithmeticExecutionTrace({
    formulaId: FORMULA_CODE,
    branchId: "monthly_total_internal_plus_solar_gains",
    inputs: {
      Qint: traceInput(internalGains, "kWh"),
      Qsol: traceInput(solarGains, "kWh")
    },
    expression: operatorExpression("add", [
      inputExpression("Qint"),
      inputExpression("Qsol")
    ]),
    rawResult: qHgn,
    finalResult: qHgn,
    unit: "kWh",
    clampApplied: false
  });
}

function resolveAdjacentUnconditionedZone(zone, month) {
  if (!isPlainObject(zone)) {
    return { ok: false, code: "monthly_heat_gains_invalid_adjacent_unconditioned_zone" };
  }
  if (!safeCode(zone.zoneId, 96)) {
    return { ok: false, code: "monthly_heat_gains_invalid_adjacent_unconditioned_zone_id" };
  }
  const internalGains = finiteNumber(zone.internalGains);
  if (internalGains === null) {
    return { ok: false, code: "monthly_heat_gains_missing_adjacent_internal_gains" };
  }
  if (internalGains < 0) {
    return { ok: false, code: "monthly_heat_gains_negative_adjacent_internal_gains" };
  }
  const solar = resolveSolarGains(zone, month);
  if (!solar.ok) return solar;
  const bztu = resolveBztu(zone);
  if (!bztu.ok) return bztu;
  const distribution = resolveDistributionFactor(zone);
  if (!distribution.ok) return distribution;
  const reduction = resolveGainReductionFactor(
    zone,
    internalGains,
    solar.value.solarGains,
    bztu.value.bztu
  );
  if (!reduction.ok) return reduction;

  const multiplier =
    (1 - bztu.value.bztu) *
    distribution.value.distributionFactor *
    reduction.value.gainReductionFactor;
  const internalGainContribution = multiplier * internalGains;
  const solarGainContribution = multiplier * solar.value.solarGains;

  return {
    ok: true,
    value: {
      zoneId: zone.zoneId,
      bztu: bztu.value.bztu,
      bztuOrigin: bztu.value.bztuOrigin,
      bztuFormulaCode: bztu.value.bztuFormulaCode,
      ...(bztu.value.hztuExterior === undefined ? {} : { hztuExterior: bztu.value.hztuExterior }),
      ...(bztu.value.hztuTotal === undefined ? {} : { hztuTotal: bztu.value.hztuTotal }),
      distributionFactor: distribution.value.distributionFactor,
      distributionFactorOrigin: distribution.value.distributionFactorOrigin,
      distributionFormulaCode: distribution.value.distributionFormulaCode,
      gainReductionFactor: reduction.value.gainReductionFactor,
      gainReductionFactorOrigin: reduction.value.gainReductionFactorOrigin,
      gainReductionFormulaCode: reduction.value.gainReductionFormulaCode,
      gainReductionExecutionTrace: reduction.value.gainReductionExecutionTrace,
      adjacentInternalGains: internalGains,
      adjacentSolarGains: solar.value.solarGains,
      ...(solar.value.solarGainsFormulaCode === undefined ? {} : {
        adjacentSolarGainsFormulaCode: solar.value.solarGainsFormulaCode
      }),
      internalGainContribution,
      solarGainContribution,
      internalGainContributionExecutionTrace: adjacentGainContributionTrace({
        formulaId: ADJACENT_UNCONDITIONED_GAINS_FORMULA_CODE,
        branchId: "relation_2_34_internal_adjacent_unconditioned_zone",
        bztu: bztu.value.bztu,
        distributionFactor: distribution.value.distributionFactor,
        gainReductionFactor: reduction.value.gainReductionFactor,
        directGains: internalGains,
        contribution: internalGainContribution
      }),
      solarGainContributionExecutionTrace: adjacentGainContributionTrace({
        formulaId: "MC001_RELATION_2_37_ADJACENT_UNCONDITIONED_ZONE_SOLAR_GAINS",
        branchId: "relation_2_37_solar_adjacent_unconditioned_zone",
        bztu: bztu.value.bztu,
        distributionFactor: distribution.value.distributionFactor,
        gainReductionFactor: reduction.value.gainReductionFactor,
        directGains: solar.value.solarGains,
        contribution: solarGainContribution
      }),
      formulaCode: ADJACENT_UNCONDITIONED_GAINS_FORMULA_CODE,
      sourceScope: "mc001_relations_2_34_2_37_adjacent_unconditioned_zone_gains"
    }
  };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "monthly_heat_gains_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase, ["cases", "case"])) {
    return { ok: false, code: "monthly_heat_gains_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "monthly_heat_gains_invalid_case_id" };
  }
  if (!MONTHS.has(inputCase.month)) {
    return { ok: false, code: "monthly_heat_gains_invalid_month" };
  }

  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  const internalGains = finiteNumber(inputCase.internalGains);
  if (internalGains === null) {
    return { ok: false, code: "monthly_heat_gains_missing_internal_gains" };
  }
  if (internalGains < 0) {
    return { ok: false, code: "monthly_heat_gains_negative_internal_gains" };
  }

  const directSolar = resolveSolarGains(inputCase, inputCase.month);
  if (!directSolar.ok) return directSolar;

  const adjacentZones = [];
  if (hasInputValue(inputCase, "adjacentUnconditionedZones")) {
    if (!Array.isArray(inputCase.adjacentUnconditionedZones) || inputCase.adjacentUnconditionedZones.length === 0) {
      return { ok: false, code: "monthly_heat_gains_invalid_adjacent_unconditioned_zones" };
    }
    const zoneIds = new Set();
    for (const adjacentZone of inputCase.adjacentUnconditionedZones) {
      const adjacent = resolveAdjacentUnconditionedZone(adjacentZone, inputCase.month);
      if (!adjacent.ok) return adjacent;
      if (zoneIds.has(adjacent.value.zoneId)) {
        return { ok: false, code: "monthly_heat_gains_duplicate_adjacent_unconditioned_zone_id" };
      }
      zoneIds.add(adjacent.value.zoneId);
      adjacentZones.push(adjacent.value);
    }
  }

  const adjacentInternalGains = adjacentZones.reduce(
    (sum, zone) => sum + zone.internalGainContribution,
    0
  );
  const adjacentSolarGains = adjacentZones.reduce(
    (sum, zone) => sum + zone.solarGainContribution,
    0
  );
  const solarGains = directSolar.value.solarGains + adjacentSolarGains;
  const totalInternalGains = internalGains + adjacentInternalGains;
  const hasAdjacentZones = adjacentZones.length > 0;

  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      month: inputCase.month,
      directInternalGains: internalGains,
      directSolarGains: directSolar.value.solarGains,
      internalGains: totalInternalGains,
      solarGains,
      internalGainsOrigin: hasAdjacentZones
        ? "calculated_with_adjacent_unconditioned_zone_relation_2_34"
        : "explicit_input",
      solarGainsOrigin: hasAdjacentZones
        ? "calculated_with_adjacent_unconditioned_zone_relation_2_37"
        : directSolar.value.solarGainsOrigin,
      directSolarGainsOrigin: directSolar.value.solarGainsOrigin,
      ...(directSolar.value.solarGainsFormulaCode === undefined ? {} : {
        solarGainsFormulaCode: directSolar.value.solarGainsFormulaCode
      }),
      ...(directSolar.value.solarGainsScope === undefined ? {} : {
        solarGainsScope: directSolar.value.solarGainsScope
      }),
      ...(hasAdjacentZones ? {
        adjacentInternalGains,
        adjacentSolarGains,
        adjacentUnconditionedZoneResults: adjacentZones,
        adjacentUnconditionedGainsFormulaCode: ADJACENT_UNCONDITIONED_GAINS_FORMULA_CODE
      } : {}),
      qHgn: totalInternalGains + solarGains,
      executionTrace: heatGainsSumTrace({
        internalGains: totalInternalGains,
        solarGains,
        qHgn: totalInternalGains + solarGains
      }),
      sourceReference: inputCase.source.reference
    }
  };
}

export function calculateMc001MonthlyHeatGainsExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("monthly_heat_gains_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("monthly_heat_gains_client_supplied_derived_result");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("monthly_heat_gains_missing_cases");
  }

  const caseResults = [];

  for (const inputCase of input.cases) {
    const validation = validateCase(inputCase);
    if (!validation.ok) return blocked(validation.code);
    caseResults.push({
      ...validation.value,
      formulaCode: FORMULA_CODE,
      scope: SCOPE
    });
  }

  return {
    status: "ready",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults,
    summary: {
      annualQHgn: caseResults.reduce((sum, result) => sum + result.qHgn, 0),
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
