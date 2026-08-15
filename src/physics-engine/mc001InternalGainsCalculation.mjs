import { resolveInternalGainsTable2_15Value } from "./datasets/mc001InternalGainsTable2_15.mjs";
import {
  buildArithmeticExecutionTrace,
  inputExpression,
  operatorExpression,
  traceInput,
  valueExpression
} from "./mc001ExecutionTrace.mjs";

const MODE = "monthly_internal_gains_table_2_15_v1";
const SCOPE = "monthly_internal_gains_table_2_15_category_area_duration";
const FORMULA_CODE = "MC001_RELATION_2_35_TABLE_2_15_MONTHLY_INTERNAL_GAINS";
const FORMULA_REFERENCES = [
  "MC001-2022 relation 2.35",
  "MC001-2022 Tabel 2.15",
  "MC001-2022 section 2.7.2"
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
  "category_selected_from_table_2_15",
  "useful_area_required",
  "monthly_duration_required",
  "no_default_building_use_category",
  "not_solar_gains",
  "not_QHnd",
  "not_QCnd",
  "not_final_energy",
  "not_certificate"
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

function safeNotes(value) {
  return value === undefined ||
    (
      typeof value === "string" &&
      value.length <= 160 &&
      !/[<>{}]/.test(value)
    );
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: SCOPE,
    formulaCode: FORMULA_CODE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults: [],
    summary: {
      annualInternalGainsKwh: 0,
      caseCount: 0
    },
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

function validateSource(source) {
  if (!isPlainObject(source) || !safeCode(source.reference, 96)) {
    return { ok: false, code: "monthly_internal_gains_missing_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "monthly_internal_gains_invalid_source_notes" };
  }
  return { ok: true };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "monthly_internal_gains_invalid_case" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "monthly_internal_gains_invalid_case_id" };
  }
  if (!MONTHS.has(inputCase.month)) {
    return { ok: false, code: "monthly_internal_gains_invalid_month" };
  }
  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  const usefulFloorAreaM2 = finiteNumber(inputCase.usefulFloorAreaM2);
  if (usefulFloorAreaM2 === null || usefulFloorAreaM2 <= 0) {
    return { ok: false, code: "monthly_internal_gains_invalid_useful_floor_area" };
  }
  const durationHours = finiteNumber(inputCase.durationHours);
  if (durationHours === null || durationHours < 0) {
    return { ok: false, code: "monthly_internal_gains_invalid_duration" };
  }
  const lookup = resolveInternalGainsTable2_15Value({
    categoryId: inputCase.categoryId
  });
  if (lookup.status !== "ready") {
    return {
      ok: false,
      code: lookup.diagnostics?.blockers?.[0]?.code ??
        "monthly_internal_gains_unknown_category"
    };
  }
  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      month: inputCase.month,
      categoryId: lookup.categoryId,
      categoryRo: lookup.categoryRo,
      constantInternalGainWPerM2: lookup.constantInternalGainWPerM2,
      usefulFloorAreaM2,
      durationHours,
      sourceReference: inputCase.source.reference,
      sourceTable: lookup.sourceTable,
      sourceSection: lookup.sourceSection,
      sourcePage: lookup.sourcePage
    }
  };
}

function executionTraceFor(caseResult) {
  const rawResult =
    (caseResult.constantInternalGainWPerM2 *
      caseResult.usefulFloorAreaM2 *
      caseResult.durationHours) / 1000;
  return buildArithmeticExecutionTrace({
    formulaId: FORMULA_CODE,
    branchId: "table_2_15_category_area_duration",
    inputs: {
      qint: traceInput(caseResult.constantInternalGainWPerM2, "W/m2", {
        source: caseResult.sourceTable,
        categoryId: caseResult.categoryId
      }),
      Ause: traceInput(caseResult.usefulFloorAreaM2, "m2"),
      t: traceInput(caseResult.durationHours, "h")
    },
    expression: operatorExpression("divide", [
      operatorExpression("multiply", [
        inputExpression("qint"),
        inputExpression("Ause"),
        inputExpression("t")
      ]),
      valueExpression(1000)
    ]),
    rawResult,
    finalResult: rawResult,
    unit: "kWh",
    clampApplied: false
  });
}

export function calculateMc001MonthlyInternalGainsFromTable2_15(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("monthly_internal_gains_invalid_mode");
  }
  if (!Array.isArray(input.cases) || input.cases.length === 0) {
    return blocked("monthly_internal_gains_missing_cases");
  }

  const caseIds = new Set();
  const caseResults = [];
  for (const inputCase of input.cases) {
    const validation = validateCase(inputCase);
    if (!validation.ok) return blocked(validation.code);
    if (caseIds.has(validation.value.caseId)) {
      return blocked("monthly_internal_gains_duplicate_case_id");
    }
    caseIds.add(validation.value.caseId);
    const internalGainsKwh =
      (validation.value.constantInternalGainWPerM2 *
        validation.value.usefulFloorAreaM2 *
        validation.value.durationHours) / 1000;
    const caseResult = {
      ...validation.value,
      internalGainsKwh,
      formulaCode: FORMULA_CODE,
      scope: SCOPE
    };
    caseResults.push({
      ...caseResult,
      executionTrace: executionTraceFor(caseResult)
    });
  }

  return {
    status: "ready",
    scope: SCOPE,
    formulaCode: FORMULA_CODE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults,
    summary: {
      annualInternalGainsKwh: caseResults.reduce(
        (sum, result) => sum + result.internalGainsKwh,
        0
      ),
      caseCount: caseResults.length
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

export const deriveMc001MonthlyInternalGainsFromTable2_15 =
  calculateMc001MonthlyInternalGainsFromTable2_15;
