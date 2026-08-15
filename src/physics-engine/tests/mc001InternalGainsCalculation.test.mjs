import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001MonthlyInternalGainsFromTable2_15 } from "../mc001InternalGainsCalculation.mjs";
import { validateMc001ExecutionTrace } from "../mc001ExecutionTrace.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function caseInput(overrides = {}) {
  return {
    caseId: "jan-internal-gains",
    month: "january",
    categoryId: "residential_single_family",
    usefulFloorAreaM2: 120,
    durationHours: 744,
    source: {
      reference: "p7e_independent_internal_gains_fixture"
    },
    ...overrides
  };
}

function input(cases = [caseInput()], overrides = {}) {
  return {
    mode: "monthly_internal_gains_table_2_15_v1",
    cases,
    ...overrides
  };
}

function assertBlocked(result, code) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].code, code);
}

test("calculates residential monthly internal gains from Table 2.15, useful area and hours", () => {
  const result = calculateMc001MonthlyInternalGainsFromTable2_15(input());
  const row = result.caseResults[0];

  assert.equal(result.status, "ready");
  assert.equal(row.categoryId, "residential_single_family");
  assert.equal(row.constantInternalGainWPerM2, 2.4);
  assert.equal(row.internalGainsKwh, 214.272);
  assert.equal(row.formulaCode, "MC001_RELATION_2_35_TABLE_2_15_MONTHLY_INTERNAL_GAINS");
  assert.equal(result.summary.annualInternalGainsKwh, 214.272);

  const trace = validateMc001ExecutionTrace(row.executionTrace);
  assert.equal(trace.ok, true);
  assert.equal(trace.evaluatedExpression, 214.272);
});

test("calculates non-residential categories without residential assumptions", () => {
  const result = calculateMc001MonthlyInternalGainsFromTable2_15(input([
    caseInput({
      caseId: "office-feb",
      month: "february",
      categoryId: "administrative",
      usefulFloorAreaM2: 250,
      durationHours: 672
    }),
    caseInput({
      caseId: "school-feb",
      month: "february",
      categoryId: "schools",
      usefulFloorAreaM2: 500,
      durationHours: 672
    }),
    caseInput({
      caseId: "hospital-feb",
      month: "february",
      categoryId: "hospitals",
      usefulFloorAreaM2: 800,
      durationHours: 672
    })
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.caseResults[0].internalGainsKwh, 554.4);
  assert.equal(result.caseResults[1].internalGainsKwh, 772.8);
  assert.equal(result.caseResults[2].internalGainsKwh, 2150.4);
  assert.equal(result.summary.annualInternalGainsKwh, 3477.6);
});

test("zero duration yields zero internal gains with an arithmetic trace", () => {
  const result = calculateMc001MonthlyInternalGainsFromTable2_15(input([
    caseInput({ durationHours: 0 })
  ]));
  const row = result.caseResults[0];

  assert.equal(result.status, "ready");
  assert.equal(row.internalGainsKwh, 0);
  assert.equal(validateMc001ExecutionTrace(row.executionTrace).ok, true);
});

test("rejects missing category, area, duration and source", () => {
  assertBlocked(
    calculateMc001MonthlyInternalGainsFromTable2_15(input([
      caseInput({ categoryId: "commercial_building_without_table_2_15_row" })
    ])),
    "internal_gains_table_2_15_unknown_category"
  );
  assertBlocked(
    calculateMc001MonthlyInternalGainsFromTable2_15(input([
      caseInput({ usefulFloorAreaM2: 0 })
    ])),
    "monthly_internal_gains_invalid_useful_floor_area"
  );
  assertBlocked(
    calculateMc001MonthlyInternalGainsFromTable2_15(input([
      caseInput({ durationHours: -1 })
    ])),
    "monthly_internal_gains_invalid_duration"
  );
  assertBlocked(
    calculateMc001MonthlyInternalGainsFromTable2_15(input([
      caseInput({ source: {} })
    ])),
    "monthly_internal_gains_missing_source"
  );
});

test("module has no filesystem network PDF or UI dependency", () => {
  const source = readFileSync(
    new URL("../mc001InternalGainsCalculation.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "fetch(",
    "XMLHttpRequest",
    ".pdf",
    "PDF",
    "document.",
    "window."
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
