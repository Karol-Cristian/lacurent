import assert from "node:assert/strict";
import {
  calculateAdjustedCO2ClassThreshold,
  calculateAdjustedEnergyClassThreshold,
  findUtilityInclusionRule
} from "../../utilityInclusionThresholds.mjs";
import { fixture014UtilityInclusionThresholdRecalculation as fixture } from "./fixture014UtilityInclusionThresholdRecalculation.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function assertCloseTo(actual, expected, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} is not close to ${expected}`);
}

function logThresholdMetric({ caseId, expected, calculated, unit }) {
  console.log(
    `METRIC ${fixture.fixtureId}.${caseId} expected=${expected} calculated=${calculated} unit=${unit}`
  );
}

test("verifies Fixture 014 extraction source checks are recorded", () => {
  assert.equal(fixture.sourcePages.includes(395), true);
  assert.equal(fixture.sourcePages.includes(396), true);
  assert.equal(fixture.extractionVerification.length, 3);
  assert.ok(
    fixture.extractionVerification.some((entry) =>
      entry.verification.includes("cooling and mechanical ventilation optional")
    )
  );
});

test("validates Fixture 014 Tabel 5.6 utility inclusion rules", () => {
  for (const fixtureCase of fixture.utilityInclusionCases) {
    const result = findUtilityInclusionRule({
      buildingCategoryKey: fixtureCase.buildingCategoryKey,
      utilityKey: fixtureCase.utilityKey
    });

    assert.ok(result, fixtureCase.caseId);
    assert.equal(result.mandatory, fixtureCase.expectedMandatory, fixtureCase.caseId);
    assert.equal(
      result.calculationVariable,
      fixtureCase.expectedCalculationVariable,
      fixtureCase.caseId
    );
    assert.equal(
      result.calculationVariableValue,
      fixtureCase.expectedCalculationVariableValue,
      fixtureCase.caseId
    );
  }
});

test("validates Fixture 014 school without cooling total threshold recalculation", () => {
  for (const fixtureCase of fixture.totalThresholdCases) {
    const result = calculateAdjustedEnergyClassThreshold({
      baseTotalThreshold: fixtureCase.baseTotalThreshold,
      missingUtilityPrimaryThresholds: fixtureCase.missingUtilityPrimaryThresholds
    });

    logThresholdMetric({
      caseId: fixtureCase.caseId,
      expected: fixtureCase.expectedAdjustedThreshold,
      calculated: result.adjustedThreshold,
      unit: result.unit
    });

    assert.equal(result.adjustedThreshold, fixtureCase.expectedAdjustedThreshold);
    assert.equal(result.baseTotalThreshold, fixtureCase.baseTotalThreshold);
    assert.equal(result.missingPrimaryThresholdTotal, 13);
    assert.equal(result.unit, fixtureCase.unit);
    assert.equal(result.trace.assumptions.includes("threshold_recalculation_only_no_class_assignment"), true);
  }
});

test("validates Fixture 014 school without cooling CO2 threshold recalculation", () => {
  for (const fixtureCase of fixture.co2ThresholdCases) {
    const result = calculateAdjustedCO2ClassThreshold({
      baseCO2Threshold: fixtureCase.baseCO2Threshold,
      missingUtilityPrimaryThresholds: fixtureCase.missingUtilityPrimaryThresholds,
      co2Factor: fixtureCase.co2Factor
    });

    logThresholdMetric({
      caseId: fixtureCase.caseId,
      expected: fixtureCase.expectedAdjustedThreshold,
      calculated: result.adjustedThreshold,
      unit: result.unit
    });

    assert.equal(result.adjustedThreshold, fixtureCase.expectedAdjustedThreshold);
    assertCloseTo(result.rawAdjustedThreshold, fixtureCase.expectedRawAdjustedThreshold);
    assertCloseTo(result.missingCO2Contribution, 13 * 0.107);
    assert.equal(result.unit, fixtureCase.unit);
    assert.equal(result.trace.assumptions.includes("no_certificate_or_cpe_workflow"), true);
  }
});

test("documents Fixture 014 blockers without adding certificate or CPE output", () => {
  assert.equal(fixture.futureBlockers.length, 4);
  assert.ok(fixture.exclusions.includes("no certificate class inference"));
  assert.ok(fixture.exclusions.includes("no overheating/discomfort calculation"));
  assert.ok(fixture.exclusions.includes("no mixed-use weighted averaging"));

  const totalResult = calculateAdjustedEnergyClassThreshold({
    baseTotalThreshold: 135,
    missingUtilityPrimaryThresholds: [{ utilityKey: "cooling", primaryThreshold: 13 }]
  });
  const serialized = JSON.stringify(totalResult);

  assert.equal(serialized.includes("certificateWorkflow"), false);
  assert.equal(serialized.includes("officialCertificate"), false);
  assert.equal(serialized.includes("classLabel"), false);
});
