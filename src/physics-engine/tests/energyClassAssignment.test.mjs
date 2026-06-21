import assert from "node:assert/strict";
import {
  classifyEnergyIndicator,
  findEnergyClassInterval,
  STATUS_CLASSIFIED,
  STATUS_MISSING_INPUT,
  STATUS_MISSING_THRESHOLD_TABLE
} from "../energyClassAssignment.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const EDUCATION_TOTAL_PRIMARY = Object.freeze({
  sourceTable: "MC001-2022 Tabel 5.10",
  buildingCategoryKey: "education",
  indicatorBasis: "specific_primary_energy",
  indicatorKey: "total"
});

test("classifies a value inside a reviewed class interval", () => {
  const result = classifyEnergyIndicator({
    ...EDUCATION_TOTAL_PRIMARY,
    indicatorValue: 100
  });

  assert.equal(result.status, STATUS_CLASSIFIED);
  assert.equal(result.classLabel, "B");
  assert.equal(result.classKey, "b");
  assert.equal(result.interval.lowerBound, 68);
  assert.equal(result.interval.upperBound, 135);
  assert.equal(result.interval.intervalNotation, "(68, 135]");
  assert.equal(result.unit, "kWh/(m2.an)");
  assert.equal(result.trace.sourceTable, "MC001-2022 Tabel 5.10");
});

test("upper class boundary is closed", () => {
  const result = findEnergyClassInterval({
    ...EDUCATION_TOTAL_PRIMARY,
    indicatorValue: 135
  });

  assert.equal(result.status, STATUS_CLASSIFIED);
  assert.equal(result.classLabel, "B");
  assert.equal(result.interval.upperBoundInclusive, true);
});

test("lower class boundary is open and belongs to the previous interval", () => {
  const result = classifyEnergyIndicator({
    ...EDUCATION_TOTAL_PRIMARY,
    indicatorValue: 68
  });

  assert.equal(result.status, STATUS_CLASSIFIED);
  assert.equal(result.classLabel, "A");
  assert.equal(result.interval.intervalNotation, "(48, 68]");
});

test("below the first threshold is classified as A+", () => {
  const result = classifyEnergyIndicator({
    ...EDUCATION_TOTAL_PRIMARY,
    indicatorValue: 0
  });

  assert.equal(result.status, STATUS_CLASSIFIED);
  assert.equal(result.classLabel, "A+");
  assert.equal(result.interval.lowerBound, null);
  assert.equal(result.interval.upperBound, 48);
});

test("above the last threshold is classified as G", () => {
  const result = classifyEnergyIndicator({
    ...EDUCATION_TOTAL_PRIMARY,
    indicatorValue: 536.01
  });

  assert.equal(result.status, STATUS_CLASSIFIED);
  assert.equal(result.classLabel, "G");
  assert.equal(result.interval.lowerBound, 536);
  assert.equal(result.interval.upperBound, null);
});

test("classifies CO2 environmental class intervals from explicit basis", () => {
  const result = classifyEnergyIndicator({
    sourceTable: "MC001-2022 Tabel 5.10",
    buildingCategoryKey: "education",
    indicatorBasis: "specific_co2_emissions",
    indicatorKey: "total",
    indicatorValue: 42.5
  });

  assert.equal(result.status, STATUS_CLASSIFIED);
  assert.equal(result.classLabel, "C");
  assert.equal(result.unit, "kgCO2/(m2.an)");
  assert.equal(result.interval.intervalNotation, "(23, 42.5]");
});

test("uses source table and category explicitly and does not infer a category", () => {
  const result = classifyEnergyIndicator({
    sourceTable: "MC001-2022 Tabel 5.10",
    indicatorBasis: "specific_primary_energy",
    indicatorKey: "total",
    indicatorValue: 100
  });

  assert.equal(result.status, STATUS_MISSING_INPUT);
  assert.deepEqual(result.missingFields, ["buildingCategoryKey"]);
});

test("requires explicit source table, indicator basis, indicator key and value", () => {
  const result = classifyEnergyIndicator({
    buildingCategoryKey: "education"
  });

  assert.equal(result.status, STATUS_MISSING_INPUT);
  assert.deepEqual(result.missingFields, [
    "sourceTable",
    "indicatorBasis",
    "indicatorKey",
    "indicatorValue"
  ]);
});

test("does not assign a class when explicit table/category/basis/key do not match", () => {
  const result = classifyEnergyIndicator({
    sourceTable: "MC001-2022 Tabel 5.10",
    buildingCategoryKey: "sports",
    indicatorBasis: "specific_primary_energy",
    indicatorKey: "total",
    indicatorValue: 100
  });

  assert.equal(result.status, STATUS_MISSING_THRESHOLD_TABLE);
  assert.equal(result.classLabel, null);
  assert.ok(result.warnings.includes(STATUS_MISSING_THRESHOLD_TABLE));
});

test("rejects non-numeric or negative indicator values", () => {
  assert.throws(
    () =>
      classifyEnergyIndicator({
        ...EDUCATION_TOTAL_PRIMARY,
        indicatorValue: Number.NaN
      }),
    /indicatorValue must be a finite non-negative number/
  );

  assert.throws(
    () =>
      classifyEnergyIndicator({
        ...EDUCATION_TOTAL_PRIMARY,
        indicatorValue: -1
      }),
    /indicatorValue must be a finite non-negative number/
  );
});

test("classification output is not a certificate or CPE workflow result", () => {
  const result = classifyEnergyIndicator({
    ...EDUCATION_TOTAL_PRIMARY,
    indicatorValue: 100
  });
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes("certificateWorkflow"), false);
  assert.equal(serialized.includes("cpe"), false);
  assert.equal(serialized.includes("officialCertificate"), false);
  assert.ok(result.trace.assumptions.includes("classification_only_no_certificate_workflow"));
});
