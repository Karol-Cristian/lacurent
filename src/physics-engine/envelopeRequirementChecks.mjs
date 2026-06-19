import { findEnvelopeThresholdById } from "./datasets/mc001EnvelopeThresholds.mjs";

export const STATUS_CHECKED = "checked";
export const STATUS_MISSING_TABLE = "cannot_validate_envelope_requirement_missing_table";
export const STATUS_MISSING_VALUE = "cannot_validate_envelope_requirement_missing_value";
export const WARNING_PLAIN_U_LOW_CONFIDENCE =
  "plain_U_compared_to_corrected_U_requirement_low_confidence";

function assertPositiveFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite positive number`);
  }
}

function missingTableResult({ thresholdId, checkType }) {
  return {
    status: STATUS_MISSING_TABLE,
    passes: null,
    value: null,
    threshold: null,
    warnings: [STATUS_MISSING_TABLE],
    trace: {
      formulaId: "MC001_ENVELOPE_REQUIREMENT_CHECK",
      formulaText: "R' >= R'min and/or U' <= U'max",
      inputs: { thresholdId, checkType },
      result: null,
      unit: "mixed",
      assumptions: [],
      warnings: [STATUS_MISSING_TABLE]
    }
  };
}

function makeTrace({ thresholdId, checkType, value, threshold, result, warnings = [] }) {
  return {
    formulaId: "MC001_ENVELOPE_REQUIREMENT_CHECK",
    formulaText: "R' >= R'min and/or U' <= U'max",
    inputs: { thresholdId, checkType, value },
    result,
    unit: checkType === "rPrime" ? "m2K/W" : "W/m2K",
    sourceTable: threshold.table,
    assumptions: ["threshold_from_reviewed_mc001_tabel_2_4_2_7_dataset"],
    warnings
  };
}

export function checkRPrimeAgainstMinimum(input) {
  const { rPrimeM2KPerW, thresholdId } = input ?? {};

  assertPositiveFiniteNumber(rPrimeM2KPerW, "rPrimeM2KPerW");

  const threshold = findEnvelopeThresholdById(thresholdId);

  if (!threshold) {
    return missingTableResult({ thresholdId, checkType: "rPrime" });
  }

  const passes = rPrimeM2KPerW >= threshold.rPrimeMinM2KPerW;

  return {
    status: STATUS_CHECKED,
    passes,
    value: rPrimeM2KPerW,
    requiredMinimum: threshold.rPrimeMinM2KPerW,
    threshold,
    warnings: [],
    trace: makeTrace({
      thresholdId,
      checkType: "rPrime",
      value: rPrimeM2KPerW,
      threshold,
      result: passes
    })
  };
}

export function checkUPrimeAgainstMaximum(input) {
  const { uPrimeWPerM2K, thresholdId } = input ?? {};

  assertPositiveFiniteNumber(uPrimeWPerM2K, "uPrimeWPerM2K");

  const threshold = findEnvelopeThresholdById(thresholdId);

  if (!threshold) {
    return missingTableResult({ thresholdId, checkType: "uPrime" });
  }

  const passes = uPrimeWPerM2K <= threshold.uPrimeMaxWPerM2K;

  return {
    status: STATUS_CHECKED,
    passes,
    value: uPrimeWPerM2K,
    requiredMaximum: threshold.uPrimeMaxWPerM2K,
    threshold,
    warnings: [],
    trace: makeTrace({
      thresholdId,
      checkType: "uPrime",
      value: uPrimeWPerM2K,
      threshold,
      result: passes
    })
  };
}

export function checkEnvelopeRequirement(input) {
  const {
    thresholdId,
    rPrimeM2KPerW,
    uPrimeWPerM2K,
    valueType
  } = input ?? {};
  const hasRPrime = rPrimeM2KPerW !== undefined && rPrimeM2KPerW !== null;
  const hasUPrime = uPrimeWPerM2K !== undefined && uPrimeWPerM2K !== null;

  if (!hasRPrime && !hasUPrime) {
    return {
      status: STATUS_MISSING_VALUE,
      passes: null,
      checks: [],
      warnings: [STATUS_MISSING_VALUE],
      trace: {
        formulaId: "MC001_ENVELOPE_REQUIREMENT_CHECK",
        formulaText: "R' >= R'min and/or U' <= U'max",
        inputs: { thresholdId, rPrimeM2KPerW, uPrimeWPerM2K, valueType },
        result: null,
        unit: "mixed",
        assumptions: [],
        warnings: [STATUS_MISSING_VALUE]
      }
    };
  }

  const warnings = [];

  if (valueType === "plain_U") {
    warnings.push(WARNING_PLAIN_U_LOW_CONFIDENCE);
  }

  const checks = [];

  if (hasRPrime) {
    checks.push({
      checkType: "rPrime",
      result: checkRPrimeAgainstMinimum({ rPrimeM2KPerW, thresholdId })
    });
  }

  if (hasUPrime) {
    checks.push({
      checkType: valueType === "plain_U" ? "plain_U_against_uPrime_threshold" : "uPrime",
      result: checkUPrimeAgainstMaximum({ uPrimeWPerM2K, thresholdId })
    });
  }

  const missingTableCheck = checks.find((check) => check.result.status === STATUS_MISSING_TABLE);

  if (missingTableCheck) {
    return {
      status: STATUS_MISSING_TABLE,
      passes: null,
      checks,
      warnings: [...warnings, STATUS_MISSING_TABLE],
      trace: {
        formulaId: "MC001_ENVELOPE_REQUIREMENT_CHECK",
        formulaText: "R' >= R'min and/or U' <= U'max",
        inputs: { thresholdId, rPrimeM2KPerW, uPrimeWPerM2K, valueType },
        result: null,
        unit: "mixed",
        assumptions: [],
        warnings: [...warnings, STATUS_MISSING_TABLE]
      }
    };
  }

  const passes = checks.every((check) => check.result.passes === true);

  return {
    status: STATUS_CHECKED,
    passes,
    checks,
    warnings,
    trace: {
      formulaId: "MC001_ENVELOPE_REQUIREMENT_CHECK",
      formulaText: "R' >= R'min and/or U' <= U'max",
      inputs: { thresholdId, rPrimeM2KPerW, uPrimeWPerM2K, valueType },
      result: passes,
      unit: "mixed",
      assumptions: ["threshold_from_reviewed_mc001_tabel_2_4_2_7_dataset"],
      warnings
    }
  };
}
