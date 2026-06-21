import assert from "node:assert/strict";
import { classifyEnergyIndicator } from "../../energyClassAssignment.mjs";
import { listEnergyClassThresholds } from "../../datasets/mc001EnergyClassThresholds.mjs";
import { fixture013EnergyClassAssignment as fixture } from "./fixture013EnergyClassAssignment.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function rowEntriesFor(sourceRow) {
  return listEnergyClassThresholds().filter(
    (entry) =>
      entry.sourceTable === sourceRow.sourceTable &&
      entry.buildingCategoryKey === sourceRow.buildingCategoryKey &&
      entry.indicatorBasis === sourceRow.indicatorBasis &&
      entry.indicatorKey === sourceRow.indicatorKey
  );
}

function logClassMetric({ caseId, expectedClass, calculatedClass, value, interval }) {
  console.log(
    `METRIC ${fixture.fixtureId}.${caseId} value=${value} expectedClass=${expectedClass} calculatedClass=${calculatedClass} interval=${interval}`
  );
}

test("verifies Fixture 013 selected source rows against reviewed dataset thresholds", () => {
  for (const sourceRow of fixture.sourceRowsVerified) {
    const entries = rowEntriesFor(sourceRow);

    assert.equal(entries.length, 8);
    assert.equal(entries[0].sourcePage, sourceRow.sourcePage);
    assert.equal(entries[0].unit, sourceRow.unit);
    assert.deepEqual(entries[0].sourceThresholds, sourceRow.thresholds);
  }
});

test("validates Fixture 013 energy/environmental class assignments", () => {
  for (const fixtureCase of fixture.classificationCases) {
    const result = classifyEnergyIndicator({
      sourceTable: fixtureCase.sourceTable,
      buildingCategoryKey: fixtureCase.buildingCategoryKey,
      indicatorBasis: fixtureCase.indicatorBasis,
      indicatorKey: fixtureCase.indicatorKey,
      indicatorValue: fixtureCase.indicatorValue
    });

    logClassMetric({
      caseId: fixtureCase.caseId,
      expectedClass: fixtureCase.expectedClassLabel,
      calculatedClass: result.classLabel,
      value: fixtureCase.indicatorValue,
      interval: result.interval?.intervalNotation
    });

    assert.equal(result.status, "classified");
    assert.equal(result.classLabel, fixtureCase.expectedClassLabel);
    assert.equal(result.classKey, fixtureCase.expectedClassKey);
    assert.equal(result.interval.lowerBound, fixtureCase.expectedLowerBound);
    assert.equal(result.interval.upperBound, fixtureCase.expectedUpperBound);
    assert.equal(result.interval.intervalNotation, fixtureCase.expectedIntervalNotation);
    assert.equal(result.trace.assumptions.includes("classification_only_no_certificate_workflow"), true);
  }
});

test("documents Fixture 013 blocked certificate and class-label rows", () => {
  assert.equal(fixture.blockedRows.length, 2);
  assert.ok(
    fixture.blockedRows.some((row) =>
      row.reason.includes("Tabel 5.6 utility inclusion")
    )
  );
  assert.ok(
    fixture.exclusions.includes("no certificate workflow")
  );
});
