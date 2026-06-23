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
  assert.equal(mc001ExecutableValidationFixtures.length, 25);
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
  assert.equal(mc001ExecutableValidationCases.length, 25);
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
  assert.deepEqual(mc001ExecutableValidationCases[13].validationAreas, [
    "utility_inclusion_thresholds"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[14].validationAreas, [
    "minimal_orchestrator_summary"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[15].validationAreas, [
    "level_1_core_orchestrator"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[16].validationAreas, [
    "level_1_monthly_heating_orchestration"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[17].validationAreas, [
    "level_1_fail_closed_hardening"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[18].validationAreas, [
    "normative_registry_contract",
    "auditor_input_builder_gate"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[19].validationAreas, [
    "envelope_from_auditor_input",
    "transmission"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[20].validationAreas, [
    "transmission_htr_readiness_gate",
    "transmission"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[21].validationAreas, [
    "ventilation_from_auditor_input",
    "ventilation"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[22].validationAreas, [
    "heat_loss_readiness_gate",
    "transmission",
    "ventilation"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[23].validationAreas, [
    "auditor_core_readiness_orchestrator",
    "transmission",
    "ventilation"
  ]);
  assert.deepEqual(mc001ExecutableValidationCases[24].validationAreas, [
    "auditor_core_readiness_orchestrator",
    "auditor_core_readiness_scenario_matrix",
    "transmission",
    "ventilation"
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
    fixture013,
    fixture014,
    fixture015,
    fixture016,
    fixture017,
    fixture018,
    fixture020,
    fixture021,
    fixture022,
    fixture023,
    fixture024,
    fixture025,
    fixture026
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

  assert.equal(
    fixture014.fixtureId,
    "FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION"
  );
  assert.equal(
    fixture014.exampleId,
    "MC001_TABLE_5_6_UTILITY_INCLUSION_THRESHOLDS"
  );
  assert.ok(
    fixture014.documentationPath.endsWith(
      "FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION.md"
    )
  );
  assert.ok(
    fixture014.fixturePath.endsWith(
      "fixture014UtilityInclusionThresholdRecalculation.mjs"
    )
  );
  assert.ok(
    fixture014.validationTestPath.endsWith(
      "fixture014UtilityInclusionThresholdRecalculation.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture014.helperCoverage, ["utilityInclusionThresholds.mjs"]);

  assert.equal(
    fixture015.fixtureId,
    "FIXTURE_015_MINIMAL_MC001_ORCHESTRATOR_SUMMARY"
  );
  assert.equal(
    fixture015.exampleId,
    "MC001_VALIDATION_SUMMARY_FIXTURES_001_014"
  );
  assert.ok(
    fixture015.documentationPath.endsWith(
      "FIXTURE_015_MINIMAL_MC001_ORCHESTRATOR_SUMMARY.md"
    )
  );
  assert.ok(
    fixture015.fixturePath.endsWith(
      "fixture015MinimalMc001OrchestratorSummary.mjs"
    )
  );
  assert.ok(
    fixture015.validationTestPath.endsWith(
      "fixture015MinimalMc001OrchestratorSummary.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture015.helperCoverage, ["minimalMc001OrchestratorSummary.mjs"]);

  assert.equal(
    fixture016.fixtureId,
    "FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR"
  );
  assert.equal(
    fixture016.exampleId,
    "MC001_LEVEL_1_CORE_EXPLICIT_INPUT_PACK"
  );
  assert.ok(
    fixture016.documentationPath.endsWith(
      "FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR.md"
    )
  );
  assert.ok(
    fixture016.fixturePath.endsWith(
      "fixture016Level1CoreComponentOrchestrator.mjs"
    )
  );
  assert.ok(
    fixture016.validationTestPath.endsWith(
      "fixture016Level1CoreComponentOrchestrator.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture016.helperCoverage, [
    "mc001Level1CoreOrchestrator.mjs",
    "transmissionCoefficients.mjs",
    "ventilationCoefficients.mjs",
    "finalPrimaryCo2Indicators.mjs"
  ]);

  assert.equal(
    fixture017.fixtureId,
    "FIXTURE_017_LEVEL_1_MONTHLY_HEATING_ORCHESTRATION"
  );
  assert.equal(
    fixture017.exampleId,
    "MC001_LEVEL_1_MONTHLY_HEATING_EXPLICIT_INPUT_PACK"
  );
  assert.ok(
    fixture017.documentationPath.endsWith(
      "FIXTURE_017_LEVEL_1_MONTHLY_HEATING_ORCHESTRATION.md"
    )
  );
  assert.ok(
    fixture017.fixturePath.endsWith(
      "fixture017Level1MonthlyHeatingOrchestration.mjs"
    )
  );
  assert.ok(
    fixture017.validationTestPath.endsWith(
      "fixture017Level1MonthlyHeatingOrchestration.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture017.helperCoverage, [
    "mc001Level1CoreOrchestrator.mjs",
    "monthlyBalance.mjs"
  ]);

  assert.equal(
    fixture018.fixtureId,
    "FIXTURE_018_LEVEL_1_FAIL_CLOSED_HARDENING"
  );
  assert.equal(
    fixture018.exampleId,
    "MC001_LEVEL_1_FAIL_CLOSED_INPUT_PACK"
  );
  assert.ok(
    fixture018.documentationPath.endsWith(
      "FIXTURE_018_LEVEL_1_FAIL_CLOSED_HARDENING.md"
    )
  );
  assert.ok(
    fixture018.fixturePath.endsWith(
      "fixture018Level1FailClosedHardening.mjs"
    )
  );
  assert.ok(
    fixture018.validationTestPath.endsWith(
      "fixture018Level1FailClosedHardening.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture018.helperCoverage, ["mc001Level1CoreOrchestrator.mjs"]);

  assert.equal(
    fixture020.fixtureId,
    "FIXTURE_020_REGISTRY_CONTRACT_INPUT_BUILDER_GATE"
  );
  assert.equal(
    fixture020.exampleId,
    "MC001_PHASE_C_REGISTRY_CONTRACT_INPUT_BUILDER_GATE"
  );
  assert.ok(
    fixture020.documentationPath.endsWith(
      "FIXTURE_020_REGISTRY_CONTRACT_INPUT_BUILDER_GATE.md"
    )
  );
  assert.ok(
    fixture020.fixturePath.endsWith(
      "fixture020RegistryContractInputBuilderGate.mjs"
    )
  );
  assert.ok(
    fixture020.validationTestPath.endsWith(
      "fixture020RegistryContractInputBuilderGate.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture020.helperCoverage, [
    "mc001NormativeRegistryContract.mjs",
    "mc001AuditorInputBuilderGate.mjs"
  ]);

  assert.equal(
    fixture021.fixtureId,
    "FIXTURE_021_ENVELOPE_FROM_AUDITOR_INPUT"
  );
  assert.equal(
    fixture021.exampleId,
    "MC001_PHASE_D_ENVELOPE_FROM_AUDITOR_INPUT"
  );
  assert.ok(
    fixture021.documentationPath.endsWith(
      "FIXTURE_021_ENVELOPE_FROM_AUDITOR_INPUT.md"
    )
  );
  assert.ok(
    fixture021.fixturePath.endsWith("fixture021EnvelopeFromAuditorInput.mjs")
  );
  assert.ok(
    fixture021.validationTestPath.endsWith(
      "fixture021EnvelopeFromAuditorInput.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture021.helperCoverage, [
    "mc001EnvelopeInputBuilder.mjs",
    "mc001AuditorInputBuilderGate.mjs",
    "materialsUValues.mjs",
    "transmissionCoefficients.mjs"
  ]);

  assert.equal(
    fixture022.fixtureId,
    "FIXTURE_022_TRANSMISSION_HTR_READINESS_GATE"
  );
  assert.equal(
    fixture022.exampleId,
    "MC001_PHASE_E_TRANSMISSION_HTR_READINESS_GATE"
  );
  assert.ok(
    fixture022.documentationPath.endsWith(
      "FIXTURE_022_TRANSMISSION_HTR_READINESS_GATE.md"
    )
  );
  assert.ok(
    fixture022.fixturePath.endsWith("fixture022TransmissionHtrReadinessGate.mjs")
  );
  assert.ok(
    fixture022.validationTestPath.endsWith(
      "fixture022TransmissionHtrReadinessGate.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture022.helperCoverage, [
    "mc001TransmissionHtrReadinessGate.mjs",
    "mc001EnvelopeInputBuilder.mjs",
    "mc001AuditorInputBuilderGate.mjs",
    "transmissionCoefficients.mjs"
  ]);

  assert.equal(
    fixture023.fixtureId,
    "FIXTURE_023_VENTILATION_FROM_AUDITOR_INPUT"
  );
  assert.equal(
    fixture023.exampleId,
    "MC001_PHASE_F_VENTILATION_FROM_AUDITOR_INPUT"
  );
  assert.ok(
    fixture023.documentationPath.endsWith(
      "FIXTURE_023_VENTILATION_FROM_AUDITOR_INPUT.md"
    )
  );
  assert.ok(
    fixture023.fixturePath.endsWith("fixture023VentilationFromAuditorInput.mjs")
  );
  assert.ok(
    fixture023.validationTestPath.endsWith(
      "fixture023VentilationFromAuditorInput.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture023.helperCoverage, [
    "mc001VentilationInputBuilder.mjs",
    "mc001AuditorInputBuilderGate.mjs",
    "ventilationCoefficients.mjs"
  ]);

  assert.equal(
    fixture024.fixtureId,
    "FIXTURE_024_HEAT_LOSS_READINESS_GATE"
  );
  assert.equal(
    fixture024.exampleId,
    "MC001_PHASE_F_HEAT_LOSS_READINESS_GATE"
  );
  assert.ok(
    fixture024.documentationPath.endsWith(
      "FIXTURE_024_HEAT_LOSS_READINESS_GATE.md"
    )
  );
  assert.ok(
    fixture024.fixturePath.endsWith("fixture024HeatLossReadinessGate.mjs")
  );
  assert.ok(
    fixture024.validationTestPath.endsWith(
      "fixture024HeatLossReadinessGate.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture024.helperCoverage, [
    "mc001HeatLossReadinessGate.mjs",
    "mc001TransmissionHtrReadinessGate.mjs",
    "mc001VentilationInputBuilder.mjs",
    "mc001EnvelopeInputBuilder.mjs",
    "mc001AuditorInputBuilderGate.mjs",
    "transmissionCoefficients.mjs",
    "ventilationCoefficients.mjs"
  ]);

  assert.equal(
    fixture025.fixtureId,
    "FIXTURE_025_AUDITOR_CORE_READINESS_ORCHESTRATOR"
  );
  assert.equal(
    fixture025.exampleId,
    "MC001_PHASE_G_AUDITOR_CORE_READINESS_ORCHESTRATOR"
  );
  assert.ok(
    fixture025.documentationPath.endsWith(
      "FIXTURE_025_AUDITOR_CORE_READINESS_ORCHESTRATOR.md"
    )
  );
  assert.ok(
    fixture025.fixturePath.endsWith(
      "fixture025AuditorCoreReadinessOrchestrator.mjs"
    )
  );
  assert.ok(
    fixture025.validationTestPath.endsWith(
      "fixture025AuditorCoreReadinessOrchestrator.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture025.helperCoverage, [
    "mc001AuditorCoreReadinessOrchestrator.mjs",
    "mc001AuditorInputBuilderGate.mjs",
    "mc001EnvelopeInputBuilder.mjs",
    "mc001TransmissionHtrReadinessGate.mjs",
    "mc001VentilationInputBuilder.mjs",
    "mc001HeatLossReadinessGate.mjs",
    "materialsUValues.mjs",
    "transmissionCoefficients.mjs",
    "ventilationCoefficients.mjs"
  ]);

  assert.equal(
    fixture026.fixtureId,
    "FIXTURE_026_AUDITOR_CORE_READINESS_SCENARIO_MATRIX"
  );
  assert.equal(
    fixture026.exampleId,
    "MC001_PHASE_G1_AUDITOR_CORE_READINESS_MATRIX_HARDENING"
  );
  assert.ok(
    fixture026.documentationPath.endsWith(
      "FIXTURE_026_AUDITOR_CORE_READINESS_SCENARIO_MATRIX.md"
    )
  );
  assert.ok(
    fixture026.fixturePath.endsWith(
      "fixture026AuditorCoreReadinessScenarioMatrix.mjs"
    )
  );
  assert.ok(
    fixture026.validationTestPath.endsWith(
      "fixture026AuditorCoreReadinessScenarioMatrix.validation.test.mjs"
    )
  );
  assert.deepEqual(fixture026.helperCoverage, [
    "mc001AuditorCoreReadinessOrchestrator.mjs",
    "mc001AuditorInputBuilderGate.mjs",
    "mc001EnvelopeInputBuilder.mjs",
    "mc001TransmissionHtrReadinessGate.mjs",
    "mc001VentilationInputBuilder.mjs",
    "mc001HeatLossReadinessGate.mjs",
    "materialsUValues.mjs",
    "transmissionCoefficients.mjs",
    "ventilationCoefficients.mjs"
  ]);

  for (const fixture of mc001ExecutableValidationCases) {
    assert.equal("calculationInputs" in fixture, false);
    assert.equal("expectedNumericOutputs" in fixture, false);
    assert.equal("calculatedOutputs" in fixture, false);
  }
});
