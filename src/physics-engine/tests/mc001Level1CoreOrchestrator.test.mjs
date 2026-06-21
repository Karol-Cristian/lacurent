import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createMc001Level1CoreOrchestrator,
  summarizeLevel1FinalPrimaryCo2,
  summarizeLevel1Transmission,
  summarizeLevel1Ventilation,
  validateMc001Level1CoreInputPack
} from "../mc001Level1CoreOrchestrator.mjs";
import { fixture016Level1CoreComponentOrchestrator as fixture } from "./validation/fixture016Level1CoreComponentOrchestrator.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertWithinTolerance(actual, expected, toleranceAbs = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= toleranceAbs,
    `expected ${expected}, received ${actual}`
  );
}

test("validates the Fixture 016 input pack contract", () => {
  assert.equal(validateMc001Level1CoreInputPack(fixture.inputPack), true);
});

test("rejects missing required sections", () => {
  const inputPack = clone(fixture.inputPack);
  delete inputPack.transmission;

  assert.throws(
    () => validateMc001Level1CoreInputPack(inputPack),
    /Missing required section: transmission/
  );
});

test("rejects missing required fields", () => {
  const inputPack = clone(fixture.inputPack);
  delete inputPack.finalPrimaryCo2.serviceFinalEnergyRows[0].energyCarrierKey;

  assert.throws(
    () => validateMc001Level1CoreInputPack(inputPack),
    /Missing required field: finalPrimaryCo2\.serviceFinalEnergyRows\[0\]\.energyCarrierKey/
  );
});

test("does not infer building category", () => {
  const inputPack = clone(fixture.inputPack);
  delete inputPack.buildingContext.buildingUseCategory;

  assert.throws(
    () => validateMc001Level1CoreInputPack(inputPack),
    /Missing required field: buildingContext\.buildingUseCategory/
  );
});

test("aggregates Htr only from explicit transmission values", () => {
  const summary = summarizeLevel1Transmission(fixture.inputPack.transmission);

  assert.equal(summary.status, "validated");
  assert.equal(summary.helper, "calculateTotalTransmissionCoefficient");
  assert.equal(summary.calculatedHtr, fixture.expected.transmissionHtrWPerK);
  assert.deepEqual(summary.inputs, {
    Hd: fixture.inputPack.transmission.Hd,
    Hg: fixture.inputPack.transmission.Hg,
    Hu: fixture.inputPack.transmission.Hu,
    Ha: fixture.inputPack.transmission.Ha
  });
});

test("includes Hve from explicit ventilation input and validates monthly rows", () => {
  const summary = summarizeLevel1Ventilation(fixture.inputPack.ventilation);

  assert.equal(summary.status, "validated");
  assert.equal(summary.Hve, fixture.expected.ventilationHveWPerK);
  assert.equal(summary.monthlyVentilationTransferRows.length, 12);
  assert.ok(summary.monthlyVentilationTransferRows.every((row) => row.status === "validated"));
});

test("calculates final primary CO2 summary through the validated helper path", () => {
  const summary = summarizeLevel1FinalPrimaryCo2(fixture.inputPack.finalPrimaryCo2);

  assert.equal(summary.status, "validated");
  assert.equal(summary.helper, "calculatePrimaryCO2Summary");
  assertWithinTolerance(
    summary.finalEnergy.calculatedKWh,
    fixture.expected.finalEnergyTotalKWh
  );
  assertWithinTolerance(
    summary.primaryEnergy.calculatedTotalKWh,
    fixture.expected.primaryEnergyTotalKWh
  );
  assertWithinTolerance(summary.co2.calculatedKg, fixture.expected.co2TotalKg);
  assert.equal(summary.co2.relation, "CO2 = Qf * fPtot * fCO2");
});

test("creates deterministic serializable Level 1 core output", () => {
  const first = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const second = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const parsed = JSON.parse(JSON.stringify(first));

  assert.deepEqual(first, second);
  assert.deepEqual(parsed, first);
  assert.equal(first.orchestratorType, fixture.expected.orchestratorType);
  assert.equal(first.level, fixture.expected.level);
  assert.equal(first.validationStatus, fixture.expected.validationStatus);
});

test("does not claim production or certificate readiness", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const serialized = JSON.stringify(result);

  assert.equal(result.isProductionOrchestrator, false);
  assert.equal(result.isCertificateWorkflow, false);
  assert.equal("certificate" in result, false);
  assert.equal("cpe" in result, false);
  assert.equal(serialized.includes("officialCertificate"), false);
  assert.equal(result.nextRequiredStep, "KEEP_LEVEL_2_BLOCKED_UNTIL_FULL_EXPLICIT_MC001_AUDIT_INPUTS_EXIST");
});

test("preserves explicit blockers and ambiguities", () => {
  const result = createMc001Level1CoreOrchestrator(fixture.inputPack);
  const blockedIds = result.blockedComponents.map((blocker) => blocker.blockerId);
  const ambiguousIds = result.ambiguousComponents.map((blocker) => blocker.blockerId);

  assert.ok(ambiguousIds.includes("april_boundary_heating_period_gap"));
  assert.ok(ambiguousIds.includes("september_boundary_heating_period_gap"));
  assert.ok(ambiguousIds.includes("october_mc001_worked_example_ambiguity"));
  assert.ok(blockedIds.includes("full_dhw_final_energy_chain_blocked"));
  assert.ok(blockedIds.includes("general_rer_methodology_blocked"));
  assert.ok(blockedIds.includes("certificate_cpe_workflow_blocked"));
});

test("does not import UI API DB Worker or deploy code", () => {
  const source = readFileSync(new URL("../mc001Level1CoreOrchestrator.mjs", import.meta.url), "utf8");
  const importLines = source.split("\n").filter((line) => line.trim().startsWith("import "));
  const forbiddenImportFragments = ["ui", "api", "db", "worker", "schema", "report", "certificate", "deploy"];

  for (const fragment of forbiddenImportFragments) {
    assert.equal(
      importLines.some((line) => line.toLowerCase().includes(fragment)),
      false,
      `${fragment} must not be imported by Level 1 core orchestrator`
    );
  }
});
