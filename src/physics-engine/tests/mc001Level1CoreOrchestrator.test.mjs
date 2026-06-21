import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createMc001Level1CoreOrchestrator,
  summarizeLevel1FinalPrimaryCo2,
  summarizeLevel1MonthlyHeating,
  summarizeLevel1Transmission,
  summarizeLevel1Ventilation,
  validateMc001Level1CoreInputPack
} from "../mc001Level1CoreOrchestrator.mjs";
import { fixture016Level1CoreComponentOrchestrator as fixture } from "./validation/fixture016Level1CoreComponentOrchestrator.mjs";
import { fixture017Level1MonthlyHeatingOrchestration as fixture017 } from "./validation/fixture017Level1MonthlyHeatingOrchestration.mjs";

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
  assert.deepEqual(first.readinessClaims, {
    isFullMc001AuditReady: false,
    isLevel2Ready: false,
    isCertificateCpeWorkflowReady: false,
    isProductionOrchestrationReady: false
  });
  assert.equal(first.validationStatus, fixture.expected.validationStatus);
  assert.equal("monthlyHeatingSummary" in first, false);
});

test("accepts optional explicit monthly heating input without breaking core orchestration", () => {
  assert.equal(validateMc001Level1CoreInputPack(fixture017.inputPack), true);

  const result = createMc001Level1CoreOrchestrator(fixture017.inputPack);

  assert.equal(result.orchestratorType, fixture017.expected.orchestratorType);
  assert.equal(result.level, fixture017.expected.level);
  assert.equal(result.validationStatus, fixture017.expected.validationStatus);
  assert.equal(result.monthlyHeatingSummary.methodologyStatus, fixture017.expected.methodologyStatus);
});

test("summarizes Fixture 017 monthly heating validated blocked and ambiguous months", () => {
  const summary = summarizeLevel1MonthlyHeating(fixture017.inputPack.monthlyHeating);

  assert.equal(summary.unit, "kWh");
  assert.equal(summary.validatedMonthCount, fixture017.expected.validatedMonthCount);
  assert.equal(summary.blockedMonthCount, fixture017.expected.blockedMonthCount);
  assert.equal(summary.ambiguousMonthCount, fixture017.expected.ambiguousMonthCount);
  assert.deepEqual(
    summary.validatedMonths.map((row) => row.month),
    fixture017.expected.validatedMonths
  );
  assert.deepEqual(
    summary.blockedMonths.map((row) => row.month),
    fixture017.expected.blockedMonths
  );
  assert.deepEqual(
    summary.ambiguousMonths.map((row) => row.month),
    fixture017.expected.ambiguousMonths
  );
  assert.equal(
    summary.annualDisplayedHeatingNeed,
    fixture017.expected.annualDisplayedHeatingNeed
  );
});

test("keeps monthly heating annual methodology partial", () => {
  const result = createMc001Level1CoreOrchestrator(fixture017.inputPack);
  const summary = result.monthlyHeatingSummary;

  assert.equal(summary.isCompleteAnnualMethodology, false);
  assert.equal(summary.methodologyStatus, "PARTIAL_WITH_BLOCKED_AND_AMBIGUOUS_MONTHS");
  assert.equal(summary.blockedMonths.every((row) => row.QHnd === null), true);
  assert.equal(summary.ambiguousMonths.every((row) => row.QHnd === null), true);
});

test("rejects missing monthly heating rows instead of inferring them", () => {
  const inputPack = clone(fixture017.inputPack);
  inputPack.monthlyHeating.monthlyRows.pop();

  assert.throws(
    () => validateMc001Level1CoreInputPack(inputPack),
    /monthlyHeating\.monthlyRows must contain 12 calendar months/
  );
});

test("rejects hidden monthly heating blocker rows", () => {
  const inputPack = clone(fixture017.inputPack);
  const april = inputPack.monthlyHeating.monthlyRows.find((row) => row.month === "Apr");
  april.status = "validated";
  april.QHnd = april.sourceDisplayedQHnd;

  assert.throws(
    () => validateMc001Level1CoreInputPack(inputPack),
    /Apr monthly heating row must remain blocked/
  );
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

test("does not modify monthlyBalance gammaH above 2 branch behavior", () => {
  const monthlyBalanceSource = readFileSync(
    new URL("../monthlyBalance.mjs", import.meta.url),
    "utf8"
  );

  assert.ok(monthlyBalanceSource.includes("gammaH > 2.0"));
  assert.ok(monthlyBalanceSource.includes("heating_branch_gamma_above_2"));
});
