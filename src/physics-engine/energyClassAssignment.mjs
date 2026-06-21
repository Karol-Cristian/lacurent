import { listEnergyClassThresholds } from "./datasets/mc001EnergyClassThresholds.mjs";

export const STATUS_CLASSIFIED = "classified";
export const STATUS_MISSING_INPUT = "cannot_calculate_energy_class_missing_input";
export const STATUS_MISSING_THRESHOLD_TABLE =
  "cannot_calculate_energy_class_missing_threshold_table";

const FORMULA_ID = "MC001_5_3_CLASS_INTERVAL_LOOKUP";
const FORMULA_TEXT =
  "Assign class from MC001 Tabel 5.7-5.14 intervals: open-left, closed-right";

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function validateIndicatorValue(value) {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("indicatorValue must be a finite non-negative number");
  }
}

function missingInputResult({ input, missingFields }) {
  return {
    status: STATUS_MISSING_INPUT,
    classLabel: null,
    classKey: null,
    interval: null,
    warnings: [STATUS_MISSING_INPUT],
    missingFields,
    trace: {
      formulaId: FORMULA_ID,
      formulaText: FORMULA_TEXT,
      inputs: input ?? null,
      result: null,
      unit: null,
      assumptions: [],
      warnings: [STATUS_MISSING_INPUT]
    }
  };
}

function missingThresholdResult({ input }) {
  return {
    status: STATUS_MISSING_THRESHOLD_TABLE,
    classLabel: null,
    classKey: null,
    interval: null,
    warnings: [STATUS_MISSING_THRESHOLD_TABLE],
    trace: {
      formulaId: FORMULA_ID,
      formulaText: FORMULA_TEXT,
      inputs: input,
      result: null,
      unit: null,
      assumptions: [],
      warnings: [STATUS_MISSING_THRESHOLD_TABLE]
    }
  };
}

function normalizeInput(input) {
  const {
    sourceTable,
    buildingCategoryKey,
    indicatorBasis,
    indicatorKey,
    indicatorValue
  } = input ?? {};

  validateIndicatorValue(indicatorValue);

  const missingFields = [];

  if (!isNonEmptyString(sourceTable)) {
    missingFields.push("sourceTable");
  }

  if (!isNonEmptyString(buildingCategoryKey)) {
    missingFields.push("buildingCategoryKey");
  }

  if (!isNonEmptyString(indicatorBasis)) {
    missingFields.push("indicatorBasis");
  }

  if (!isNonEmptyString(indicatorKey)) {
    missingFields.push("indicatorKey");
  }

  if (indicatorValue === undefined || indicatorValue === null) {
    missingFields.push("indicatorValue");
  }

  return {
    normalized: {
      sourceTable,
      buildingCategoryKey,
      indicatorBasis,
      indicatorKey,
      indicatorValue
    },
    missingFields
  };
}

function intervalContainsValue(interval, value) {
  const aboveLower =
    interval.lowerBound === null ? true : value > interval.lowerBound;
  const belowUpper =
    interval.upperBound === null ? true : value <= interval.upperBound;

  return aboveLower && belowUpper;
}

function matchingIntervals(input) {
  return listEnergyClassThresholds().filter(
    (entry) =>
      entry.sourceTable === input.sourceTable &&
      entry.buildingCategoryKey === input.buildingCategoryKey &&
      entry.indicatorBasis === input.indicatorBasis &&
      entry.indicatorKey === input.indicatorKey
  );
}

export function findEnergyClassInterval(input) {
  const { normalized, missingFields } = normalizeInput(input);

  if (missingFields.length > 0) {
    return missingInputResult({ input: normalized, missingFields });
  }

  const intervals = matchingIntervals(normalized);

  if (intervals.length === 0) {
    return missingThresholdResult({ input: normalized });
  }

  const interval = intervals.find((entry) =>
    intervalContainsValue(entry, normalized.indicatorValue)
  );

  if (!interval) {
    return missingThresholdResult({ input: normalized });
  }

  return {
    status: STATUS_CLASSIFIED,
    classLabel: interval.classLabel,
    classKey: interval.classKey,
    value: normalized.indicatorValue,
    unit: interval.unit,
    interval,
    warnings: [],
    trace: {
      formulaId: FORMULA_ID,
      formulaText: FORMULA_TEXT,
      inputs: normalized,
      result: {
        classLabel: interval.classLabel,
        classKey: interval.classKey,
        intervalNotation: interval.intervalNotation
      },
      unit: interval.unit,
      sourceTable: interval.sourceTable,
      assumptions: [
        "threshold_from_reviewed_mc001_tabel_5_7_5_14_dataset",
        "classification_only_no_certificate_workflow"
      ],
      warnings: []
    }
  };
}

export function classifyEnergyIndicator(input) {
  return findEnergyClassInterval(input);
}
