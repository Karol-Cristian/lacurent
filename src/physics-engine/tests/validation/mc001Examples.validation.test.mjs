import assert from "node:assert/strict";
import {
  BLOCKED_MISSING_CLIMATE_DATASET,
  BLOCKED_MISSING_DHW_DATASET,
  BLOCKED_MISSING_INPUTS,
  BLOCKED_MISSING_TABLE,
  EXECUTABLE,
  mc001ExecutableValidationCases,
  mc001ExecutableValidationFixtures,
  mc001FullyExecutableExampleCandidates,
  mc001ValidationCandidates,
  requestedValidationAreas,
  summarizeCandidates
} from "./mc001ValidationCandidates.mjs";

const ALLOWED_STATUSES = new Set([
  EXECUTABLE,
  BLOCKED_MISSING_CLIMATE_DATASET,
  BLOCKED_MISSING_DHW_DATASET,
  BLOCKED_MISSING_TABLE,
  BLOCKED_MISSING_INPUTS
]);

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("inventories every indexed MC001 example candidate", () => {
  const summary = summarizeCandidates();

  assert.equal(summary.total, 13);
  assert.equal(summary.executable, 0);
  assert.equal(summary.blocked, 13);
  assert.equal(summary.byBlocker[BLOCKED_MISSING_INPUTS], 8);
  assert.equal(summary.byBlocker[BLOCKED_MISSING_TABLE], 3);
  assert.equal(summary.byBlocker[BLOCKED_MISSING_CLIMATE_DATASET], 2);
  assert.equal(summary.byBlocker[BLOCKED_MISSING_DHW_DATASET] ?? 0, 0);
  assert.equal(mc001ExecutableValidationFixtures.length, 13);
});

test("marks non-executable examples with explicit blocker statuses", () => {
  for (const candidate of mc001ValidationCandidates) {
    assert.ok(
      ALLOWED_STATUSES.has(candidate.validationStatus),
      `${candidate.exampleId} has unsupported status ${candidate.validationStatus}`
    );
    assert.notEqual(candidate.validationStatus, EXECUTABLE);
    assert.ok(candidate.requiredInputs.length > 0);
    assert.ok(candidate.expectedOutputs.length > 0);
    assert.ok(candidate.missingPieces.length > 0);
  }
});

test("does not attach invented calculation fixtures to blocked candidates", () => {
  for (const candidate of mc001ValidationCandidates) {
    assert.equal("calculationInputs" in candidate, false, candidate.exampleId);
    assert.equal("expectedNumericOutputs" in candidate, false, candidate.exampleId);
    assert.equal("calculatedOutputs" in candidate, false, candidate.exampleId);
  }
});

test("covers requested validation areas with blocked examples and reviewed executable fixtures", () => {
  const summary = summarizeCandidates();

  for (const area of requestedValidationAreas) {
    assert.ok(summary.byArea[area] > 0, `${area} has no MC001 candidate`);
  }

  assert.equal(mc001FullyExecutableExampleCandidates.length, 0);
  assert.equal(mc001ExecutableValidationCases.length, 13);
  assert.deepEqual(mc001ExecutableValidationCases[0].validationAreas, [
    "u_values",
    "transmission"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[1].validationAreas, ["transmission"]);
  assert.deepEqual(mc001ExecutableValidationCases[2].validationAreas, [
    "u_values",
    "transmission"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[3].validationAreas, ["transmission"]);
  assert.deepEqual(mc001ExecutableValidationCases[4].validationAreas, ["ventilation"]);
  assert.deepEqual(mc001ExecutableValidationCases[5].validationAreas, ["monthly_balance"]);
  assert.deepEqual(mc001ExecutableValidationCases[6].validationAreas, [
    "primary_energy",
    "co2"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[7].validationAreas, [
    "primary_energy"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[8].validationAreas, [
    "dhw_distribution_components"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[9].validationAreas, [
    "dhw_useful_demand"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[10].validationAreas, [
    "dhw_displayed_subtotal"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[11].validationAreas, [
    "rer_display"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[12].validationAreas, [
    "energy_class_assignment"
  ]);
});

test("registers executable fixture metadata without embedding numeric fixture data", () => {
  const [
    fixture001,
    fixture002,
    fixture003,
    fixture004,
    fixture005,
    fixture006,
    fixture007,
    fixture008,
    fixture009,
    fixture010,
    fixture011,
    fixture012,
    fixture013
  ] =
    mc001ExecutableValidationCases;

  assert.equal(fixture001.fixtureId, "FIXTURE_001_ENVELOPE");
  assert.equal(fixture001.exampleId, "MC001_EX_B_GEOMETRY_ENVELOPE_TABLES");
  assert.ok(fixture001.documentationPath.endsWith("FIXTURE_001_ENVELOPE.md"));
  assert.ok(fixture001.fixturePath.endsWith("fixture001Envelope.mjs"));
  assert.ok(fixture001.validationTestPath.endsWith("fixture001Envelope.validation.test.mjs"));

  assert.equal(fixture002.fixtureId, "FIXTURE_002_ENVELOPE_BRIDGES");
  assert.equal(fixture002.exampleId, "MC001_EX_B_THERMAL_BRIDGE_TABLES");
  assert.ok(fixture002.documentationPath.endsWith("FIXTURE_002_ENVELOPE_BRIDGES.md"));
  assert.ok(fixture002.fixturePath.endsWith("fixture002EnvelopeBridges.mjs"));
  assert.ok(
    fixture002.validationTestPath.endsWith("fixture002EnvelopeBridges.validation.test.mjs")
  );

  assert.equal(fixture003.fixtureId, "FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS");
  assert.equal(fixture003.exampleId, "MC001_EX_B_GEOMETRY_ENVELOPE_TABLES");
  assert.ok(
    fixture003.documentationPath.endsWith("FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS.md")
  );
  assert.ok(fixture003.fixturePath.endsWith("fixture003EnvelopeRemainingElements.mjs"));
  assert.ok(
    fixture003.validationTestPath.endsWith(
      "fixture003EnvelopeRemainingElements.validation.test.mjs"
    )
  );

  assert.equal(fixture004.fixtureId, "FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS");
  assert.equal(fixture004.exampleId, "MC001_EX_B_HEATING_MONTHLY_GAINS");
  assert.ok(
    fixture004.documentationPath.endsWith("FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS.md")
  );
  assert.ok(fixture004.fixturePath.endsWith("fixture004TransmissionLossTotals.mjs"));
  assert.ok(
    fixture004.validationTestPath.endsWith(
      "fixture004TransmissionLossTotals.validation.test.mjs"
    )
  );

  assert.equal(fixture005.fixtureId, "FIXTURE_005_VENTILATION_HVE_SUMMARY");
  assert.equal(fixture005.exampleId, "MC001_EX_B_HEATING_MONTHLY_GAINS");
  assert.ok(
    fixture005.documentationPath.endsWith("FIXTURE_005_VENTILATION_HVE_SUMMARY.md")
  );
  assert.ok(fixture005.fixturePath.endsWith("fixture005VentilationHveSummary.mjs"));
  assert.ok(
    fixture005.validationTestPath.endsWith(
      "fixture005VentilationHveSummary.validation.test.mjs"
    )
  );

  assert.equal(fixture006.fixtureId, "FIXTURE_006_HEATING_NEED_TABLE_SUMMARY");
  assert.equal(fixture006.exampleId, "MC001_EX_B_HEATING_MONTHLY_GAINS");
  assert.ok(
    fixture006.documentationPath.endsWith("FIXTURE_006_HEATING_NEED_TABLE_SUMMARY.md")
  );
  assert.ok(fixture006.fixturePath.endsWith("fixture006HeatingNeedTableSummary.mjs"));
  assert.ok(
    fixture006.validationTestPath.endsWith(
      "fixture006HeatingNeedTableSummary.validation.test.mjs"
    )
  );

  assert.equal(fixture007.fixtureId, "FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY");
  assert.equal(fixture007.exampleId, "MC001_EX_B_FINAL_PRIMARY_CO2_CPE");
  assert.ok(
    fixture007.documentationPath.endsWith("FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY.md")
  );
  assert.ok(fixture007.fixturePath.endsWith("fixture007FinalPrimaryCo2Summary.mjs"));
  assert.ok(
    fixture007.validationTestPath.endsWith(
      "fixture007FinalPrimaryCo2Summary.validation.test.mjs"
    )
  );

  assert.equal(fixture008.fixtureId, "FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS");
  assert.equal(fixture008.exampleId, "MC001_EX_B_FINAL_PRIMARY_CO2_CPE");
  assert.ok(
    fixture008.documentationPath.endsWith("FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS.md")
  );
  assert.ok(fixture008.fixturePath.endsWith("fixture008ServiceFinalPrimaryRows.mjs"));
  assert.ok(
    fixture008.validationTestPath.endsWith(
      "fixture008ServiceFinalPrimaryRows.validation.test.mjs"
    )
  );

  assert.equal(fixture009.fixtureId, "FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT");
  assert.equal(fixture009.exampleId, "MC001_ANEXA_3_3_B_DHW_DISTRIBUTION_COMPONENTS");
  assert.ok(
    fixture009.documentationPath.endsWith(
      "FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT.md"
    )
  );
  assert.ok(
    fixture009.fixturePath.endsWith("fixture009DhwDistributionLossComponent.mjs")
  );
  assert.ok(
    fixture009.validationTestPath.endsWith(
      "fixture009DhwDistributionLossComponent.validation.test.mjs"
    )
  );

  assert.equal(fixture010.fixtureId, "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION");
  assert.equal(fixture010.exampleId, "MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS");
  assert.ok(
    fixture010.documentationPath.endsWith(
      "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION.md"
    )
  );
  assert.ok(
    fixture010.fixturePath.endsWith("fixture010DhwUsefulDemandReconciliation.mjs")
  );
  assert.ok(
    fixture010.validationTestPath.endsWith(
      "fixture010DhwUsefulDemandReconciliation.validation.test.mjs"
    )
  );

  assert.equal(
    fixture011.fixtureId,
    "FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL"
  );
  assert.equal(fixture011.exampleId, "MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS");
  assert.ok(
    fixture011.documentationPath.endsWith(
      "FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL.md"
    )
  );
  assert.ok(
    fixture011.fixturePath.endsWith("fixture011DhwFinalEnergyDisplayedSubtotal.mjs")
  );
  assert.ok(
    fixture011.validationTestPath.endsWith(
      "fixture011DhwFinalEnergyDisplayedSubtotal.validation.test.mjs"
    )
  );
  assert.equal(fixture011.helperCoverage.length, 0);

  assert.equal(fixture012.fixtureId, "FIXTURE_012_RER_DISPLAY_RECONCILIATION");
  assert.equal(fixture012.exampleId, "MC001_EX_B_FINAL_PRIMARY_CO2_CPE");
  assert.ok(
    fixture012.documentationPath.endsWith("FIXTURE_012_RER_DISPLAY_RECONCILIATION.md")
  );
  assert.ok(
    fixture012.fixturePath.endsWith("fixture012RerDisplayReconciliation.mjs")
  );
  assert.ok(
    fixture012.validationTestPath.endsWith(
      "fixture012RerDisplayReconciliation.validation.test.mjs"
    )
  );
  assert.equal(fixture012.helperCoverage.length, 0);

  assert.equal(fixture013.fixtureId, "FIXTURE_013_ENERGY_CLASS_ASSIGNMENT");
  assert.equal(fixture013.exampleId, "MC001_TABLES_5_7_5_14_ENERGY_CLASSES");
  assert.ok(
    fixture013.documentationPath.endsWith("FIXTURE_013_ENERGY_CLASS_ASSIGNMENT.md")
  );
  assert.ok(fixture013.fixturePath.endsWith("fixture013EnergyClassAssignment.mjs"));
  assert.ok(
    fixture013.validationTestPath.endsWith(
      "fixture013EnergyClassAssignment.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture013.helperCoverage, ["energyClassAssignment.mjs"]);

  for (const fixture of mc001ExecutableValidationCases) {
    assert.equal("calculationInputs" in fixture, false);
    assert.equal("expectedNumericOutputs" in fixture, false);
    assert.equal("calculatedOutputs" in fixture, false);
  }
});
