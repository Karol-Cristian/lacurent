import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const matrix = JSON.parse(readFileSync("validation-reference/chapter2-coverage-matrix.json", "utf8"));

const allowedStatuses = new Set(["COMPLETE", "PARTIAL", "BOUNDED", "NOT_IMPLEMENTED"]);
const allowedGapCategories = new Set([
  "Implementation work",
  "Missing owned normative source",
  "External standard dependency",
  "Intentional future milestone"
]);
const deprecatedBroadSolarDiagnostic = [
  "CHAPTER",
  "2",
  "SOLAR",
  "PREPROCESSING",
  "UNAVAILABLE"
].join("_");

function assertAllowedStatus(entry) {
  assert.equal(
    allowedStatuses.has(entry.status),
    true,
    `${entry.id} has unsupported status ${entry.status}`
  );
}

test("P7C Chapter 2 coverage matrix is complete and machine-readable", () => {
  assert.equal(matrix.schema, "p7c_chapter2_coverage_matrix_v1");
  assert.equal(matrix.baseCommit, "63d9b075e1c882c85024e24c125f046cda41abd4");
  assert.equal(matrix.formulas.length, matrix.summary.officialRelationSlots);
  assert.equal(matrix.tables.length, matrix.summary.tablesTracked);
  assert.equal(matrix.figures.length, matrix.summary.figuresTracked);
  assert.equal(matrix.summary.officialRelationSlots, 87);
  assert.equal(matrix.summary.formulaBearingRelationSlots, 85);
  assert.equal(matrix.summary.tablesTracked, 21);
  assert.equal(matrix.summary.figuresTracked, 21);
});

test("P7C classifies every formula, table and figure with explicit evidence fields", () => {
  for (const entry of [...matrix.formulas, ...matrix.tables, ...matrix.figures]) {
    assertAllowedStatus(entry);
    assert.equal(typeof entry.id, "string");
    assert.equal(typeof entry.classification, "string");
    assert.equal(Object.hasOwn(entry, "implementationFile"), true, `${entry.id} must record implementationFile`);
    assert.equal(Object.hasOwn(entry, "tests"), true, `${entry.id} must record tests`);
    assert.equal(Array.isArray(entry.tests), true, `${entry.id} tests must be an array`);
    assert.equal(typeof entry.reportSupport, "string", `${entry.id} must record reportSupport`);
    assert.equal(typeof entry.productionEligibility, "string", `${entry.id} must record productionEligibility`);
  }
});

test("P7C complete items reference executable code and tests", () => {
  const completeEntries = [...matrix.formulas, ...matrix.tables, ...matrix.figures].filter(
    (entry) => entry.status === "COMPLETE"
  );
  assert.equal(completeEntries.length > 0, true);
  for (const entry of completeEntries) {
    assert.equal(typeof entry.implementationFile, "string", `${entry.id} must reference implementation code`);
    assert.equal(existsSync(entry.implementationFile), true, `${entry.id} implementation file must exist`);
    assert.equal(entry.tests.length > 0, true, `${entry.id} must reference at least one test`);
    for (const testFile of entry.tests) {
      assert.equal(existsSync(testFile), true, `${entry.id} test file must exist: ${testFile}`);
    }
  }
});

test("P7C remaining gaps are precise and actionable", () => {
  assert.equal(matrix.remainingGaps.length > 0, true);
  for (const gap of matrix.remainingGaps) {
    assert.equal(typeof gap.id, "string");
    assert.equal(allowedGapCategories.has(gap.category), true, `${gap.id} has invalid P7C category`);
    assert.equal(typeof gap.gapClass, "string");
    assertAllowedStatus(gap);
    assert.equal(typeof gap.reason, "string");
    assert.equal(gap.reason.length > 20, true, `${gap.id} reason is too vague`);
    assert.equal(typeof gap.recommendedMilestone, "string");
  }
  assert.equal(
    matrix.remainingGaps.some((gap) => gap.id === "CHAPTER_2_QSOL_QSKY_COMPLETION_BOUNDED"),
    true
  );
});

test("P7C climate audit distinguishes source-backed Hsol from bounded Qsol and Qsky", () => {
  assert.equal(matrix.climate.productionLocalityCount, 42);
  assert.equal(matrix.climate.solarSourceLocalityCount, 30);
  const hsolPipeline = matrix.climate.solarClimatePipeline.find(
    (entry) => entry.id === "annex_a9_6_monthly_hsol_vertical_horizontal"
  );
  assert.equal(hsolPipeline.status, "COMPLETE");
  assert.equal(
    hsolPipeline.productionPath,
    "climateProvider.datasets.monthlyHsolVerticalHorizontal.monthlyRecords"
  );
  const solarRuntime = matrix.climate.requirementMatrix.find(
    (entry) => entry.calculationId === "chapter2_solar_gains"
  );
  assert.equal(solarRuntime.missingDiagnostic, "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED");
  assert.match(solarRuntime.eligibleWhen, /source-backed Hsol/);

  const productionDiagnostics = matrix.climate.postP7BProductionDiagnostics;
  const bucuresti = productionDiagnostics.find((entry) => entry.locality === "Bucuresti");
  const cluj = productionDiagnostics.find((entry) => entry.locality === "Cluj-Napoca");
  assert.equal(bucuresti.sourceBackedHsolResolved, true);
  assert.equal(cluj.sourceBackedHsolResolved, true);
  assert.notEqual(bucuresti.hsolJanuarySouthKwhPerM2, cluj.hsolJanuarySouthKwhPerM2);
  for (const entry of [bucuresti, cluj]) {
    assert.equal(
      entry.expectedDiagnostics.includes("SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED"),
      true
    );
    assert.equal(
      entry.expectedDiagnostics.includes(deprecatedBroadSolarDiagnostic),
      false
    );
  }
});
