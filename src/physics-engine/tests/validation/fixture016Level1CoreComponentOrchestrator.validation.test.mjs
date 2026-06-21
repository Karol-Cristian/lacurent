import assert from "node:assert/strict";
import {
  createMc001Level1CoreOrchestrator,
  validateMc001Level1CoreInputPack
} from "../../mc001Level1CoreOrchestrator.mjs";
import { fixture016Level1CoreComponentOrchestrator as fixture } from "./fixture016Level1CoreComponentOrchestrator.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function percentageError(delta, expected) {
  if (expected === 0) {
    return delta === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return Math.abs(delta / expected) * 100;
}

function metric({ metricKey, expected, calculated, toleranceAbs }) {
  const delta = calculated - expected;
  const absoluteDelta = Math.abs(delta);
  const percentError = percentageError(delta, expected);

  console.log(
    `METRIC ${fixture.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceAbs}`
  );

  assert.ok(
    absoluteDelta <= toleranceAbs,
    `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
  );

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function ids(items, key) {
  return items.map((item) => item[key]);
}

test("validates Fixture 016 input pack shape", () => {
  assert.equal(validateMc001Level1CoreInputPack(fixture.inputPack), true);
  assert.deepEqual(Object.keys(fixture.inputPack), [
    "packMetadata",
    "buildingContext",
    "transmission",
    "ventilation",
    "finalPrimaryCo2",
    "explicitBlockers"
  ]);
  assert.equal(fixture.inputPack.buildingContext.buildingUseCategory, "education");
  assert.equal(
    fixture.inputPack.buildingContext.calculationBasis.includes("no category inference"),
    true
  );
});

test("validates Fixture 016 fixed Level 1 core output contract", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);

  assert.equal(result.orchestratorType, fixture.expected.orchestratorType);
  assert.equal(result.level, fixture.expected.level);
  assert.equal(result.isProductionOrchestrator, false);
  assert.equal(result.isCertificateWorkflow, false);
  assert.equal(result.inputPackId, fixture.inputPack.packMetadata.packId);
  assert.equal(result.validationStatus, fixture.expected.validationStatus);
  assert.equal(
    result.nextRequiredStep,
    "KEEP_LEVEL_2_BLOCKED_UNTIL_FULL_EXPLICIT_MC001_AUDIT_INPUTS_EXIST"
  );
});

test("validates Fixture 016 transmission and ventilation summaries", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);

  metric({
    metricKey: "transmission.Htr.WPerK",
    expected: fixture.expected.transmissionHtrWPerK,
    calculated: result.transmissionSummary.calculatedHtr,
    toleranceAbs: fixture.inputPack.transmission.toleranceAbs
  });
  assert.equal(result.transmissionSummary.helper, "calculateTotalTransmissionCoefficient");
  assert.equal(result.transmissionSummary.unit, "W/K");

  metric({
    metricKey: "ventilation.Hve.WPerK",
    expected: fixture.expected.ventilationHveWPerK,
    calculated: result.ventilationSummary.Hve,
    toleranceAbs: 1e-9
  });
  assert.equal(result.ventilationSummary.unit, "W/K");
  assert.equal(result.ventilationSummary.monthlyVentilationTransferRows.length, 12);
  assert.ok(
    result.ventilationSummary.monthlyVentilationTransferRows.every(
      (row) => row.status === "validated"
    )
  );
});

test("validates Fixture 016 final primary CO2 summary", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const toleranceAbs = fixture.inputPack.finalPrimaryCo2.toleranceAbs;

  metric({
    metricKey: "finalPrimaryCo2.finalEnergy.kWh",
    expected: fixture.expected.finalEnergyTotalKWh,
    calculated: result.finalPrimaryCo2Summary.finalEnergy.calculatedKWh,
    toleranceAbs
  });
  metric({
    metricKey: "finalPrimaryCo2.primaryEnergy.total.kWh",
    expected: fixture.expected.primaryEnergyTotalKWh,
    calculated: result.finalPrimaryCo2Summary.primaryEnergy.calculatedTotalKWh,
    toleranceAbs
  });
  metric({
    metricKey: "finalPrimaryCo2.co2.total.kg",
    expected: fixture.expected.co2TotalKg,
    calculated: result.finalPrimaryCo2Summary.co2.calculatedKg,
    toleranceAbs: fixture.inputPack.finalPrimaryCo2.co2ToleranceAbs
  });

  assert.equal(result.finalPrimaryCo2Summary.helper, "calculatePrimaryCO2Summary");
  assert.equal(result.finalPrimaryCo2Summary.co2.relation, "CO2 = Qf * fPtot * fCO2");
  assert.equal(result.finalPrimaryCo2Summary.factorTrace.status, "validated");
  assert.deepEqual(result.finalPrimaryCo2Summary.factorTrace.mismatches, []);
});

test("validates Fixture 016 preserves required blockers and ambiguities", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const blockerIds = ids(result.blockedComponents, "blockerId");
  const ambiguityIds = ids(result.ambiguousComponents, "blockerId");

  for (const blockerId of [
    "april_boundary_heating_period_gap",
    "september_boundary_heating_period_gap",
    "october_mc001_worked_example_ambiguity"
  ]) {
    assert.ok(ambiguityIds.includes(blockerId), blockerId);
  }

  for (const blockerId of [
    "full_dhw_final_energy_chain_blocked",
    "annual_dhw_distribution_loss_basis_blocked",
    "general_rer_methodology_blocked",
    "certificate_cpe_workflow_blocked",
    "lighting_blocked",
    "cooling_systems_blocked",
    "reference_building_blocked"
  ]) {
    assert.ok(blockerIds.includes(blockerId), blockerId);
  }
});

test("validates Fixture 016 remains core-only and serializable", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const serialized = JSON.stringify(result);
  const parsed = JSON.parse(serialized);

  assert.deepEqual(parsed, result);
  assert.equal("certificate" in result, false);
  assert.equal("cpe" in result, false);
  assert.equal("officialCertificate" in result, false);
  assert.equal("level2Audit" in result, false);
  assert.equal(serialized.includes("officialCertificate"), false);
  assert.equal(serialized.includes("productionOrchestrator"), false);
});
