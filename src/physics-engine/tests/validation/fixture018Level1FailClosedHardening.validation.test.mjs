import assert from "node:assert/strict";
import {
  createMc001Level1CoreOrchestrator,
  validateMc001Level1CoreInputPack
} from "../../mc001Level1CoreOrchestrator.mjs";
import { fixture016Level1CoreComponentOrchestrator as fixture016 } from "./fixture016Level1CoreComponentOrchestrator.mjs";
import { fixture017Level1MonthlyHeatingOrchestration as fixture017 } from "./fixture017Level1MonthlyHeatingOrchestration.mjs";
import { fixture018Level1FailClosedHardening as fixture } from "./fixture018Level1FailClosedHardening.mjs";

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

function expectValidationFailure({ name, sourceFixture = fixture016, mutate, expectedError }) {
  test(name, () => {
    const inputPack = clone(sourceFixture.inputPack);
    mutate(inputPack);

    assert.throws(() => validateMc001Level1CoreInputPack(inputPack), expectedError);
  });
}

function assertWithinTolerance(actual, expected, toleranceAbs = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= toleranceAbs,
    `expected ${expected}, received ${actual}`
  );
}

test("documents Fixture 018 hardening scope without adding product behavior", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_018_LEVEL_1_FAIL_CLOSED_HARDENING");
  assert.equal(fixture.positiveRegressionFixtures.includes(fixture016.fixtureId), true);
  assert.equal(fixture.positiveRegressionFixtures.includes(fixture017.fixtureId), true);
  assert.equal(fixture.requiredNegativeCases.length, 16);
  assert.ok(fixture.exclusions.includes("no Level 2 full MC001 auditor"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/production integration"));
});

test("keeps Fixture 016 positive regression valid", () => {
  assert.equal(validateMc001Level1CoreInputPack(fixture016.inputPack), true);
  const result = createMc001Level1CoreOrchestrator(fixture016.inputPack);

  assert.equal(result.validationStatus, fixture.expected.fixture016ValidationStatus);
  assert.equal("monthlyHeatingSummary" in result, false);
});

test("keeps Fixture 017 positive regression valid", () => {
  assert.equal(validateMc001Level1CoreInputPack(fixture017.inputPack), true);
  const result = createMc001Level1CoreOrchestrator(fixture017.inputPack);

  assert.equal(result.validationStatus, fixture.expected.fixture017ValidationStatus);
  assert.equal(result.monthlyHeatingSummary.methodologyStatus, fixture.expected.methodologyStatus);
});

test("valid Level 1 input pack preserves core and monthly summary values", () => {
  const result = createMc001Level1CoreOrchestrator(fixture017.inputPack);

  assertWithinTolerance(
    result.transmissionSummary.calculatedHtr,
    fixture.expected.transmissionHtrWPerK
  );
  assertWithinTolerance(result.ventilationSummary.Hve, fixture.expected.ventilationHveWPerK);
  assertWithinTolerance(
    result.finalPrimaryCo2Summary.finalEnergy.calculatedKWh,
    fixture.expected.finalEnergyTotalKWh
  );
  assertWithinTolerance(
    result.finalPrimaryCo2Summary.primaryEnergy.calculatedTotalKWh,
    fixture.expected.primaryEnergyTotalKWh
  );
  assertWithinTolerance(
    result.finalPrimaryCo2Summary.co2.calculatedKg,
    fixture.expected.co2TotalKg
  );
  assert.equal(
    result.monthlyHeatingSummary.validatedMonthCount,
    fixture.expected.validatedMonthCount
  );
  assert.equal(result.monthlyHeatingSummary.blockedMonthCount, fixture.expected.blockedMonthCount);
  assert.equal(
    result.monthlyHeatingSummary.ambiguousMonthCount,
    fixture.expected.ambiguousMonthCount
  );
  assert.equal(result.monthlyHeatingSummary.isCompleteAnnualMethodology, false);
});

test("keeps Level 1 output deterministic serializable and non-ready for blocked workflows", () => {
  const first = createMc001Level1CoreOrchestrator(fixture017.inputPack);
  const second = createMc001Level1CoreOrchestrator(fixture017.inputPack);
  const parsed = JSON.parse(JSON.stringify(first));

  assert.deepEqual(first, second);
  assert.deepEqual(parsed, first);
  assert.deepEqual(first.readinessClaims, fixture.expected.readinessClaims);
  assert.equal(first.isProductionOrchestrator, false);
  assert.equal(first.isCertificateWorkflow, false);
  assert.equal("level2Audit" in first, false);
  assert.equal("certificate" in first, false);
  assert.equal("cpe" in first, false);
});

expectValidationFailure({
  name: "fails closed when buildingContext is missing",
  mutate(inputPack) {
    delete inputPack.buildingContext;
  },
  expectedError: /Missing required section: buildingContext/
});

expectValidationFailure({
  name: "fails closed when transmission.Hd is missing",
  mutate(inputPack) {
    delete inputPack.transmission.Hd;
  },
  expectedError: /Missing required field: transmission\.Hd/
});

expectValidationFailure({
  name: "fails closed when transmission unit is invalid",
  mutate(inputPack) {
    inputPack.transmission.unit = "kW/K";
  },
  expectedError: /transmission\.unit must be W\/K/
});

expectValidationFailure({
  name: "fails closed when ventilation unit is invalid",
  mutate(inputPack) {
    inputPack.ventilation.unit = "kW/K";
  },
  expectedError: /ventilation\.unit must be W\/K/
});

expectValidationFailure({
  name: "fails closed when finalPrimaryCo2 service rows are missing",
  mutate(inputPack) {
    inputPack.finalPrimaryCo2.serviceFinalEnergyRows = [];
  },
  expectedError: /finalPrimaryCo2\.serviceFinalEnergyRows must contain at least one row/
});

expectValidationFailure({
  name: "fails closed when a CO2 factor is invalid",
  mutate(inputPack) {
    inputPack.finalPrimaryCo2.co2Factors.electricitate_sen_consumata.co2EmissionFactor = -0.107;
  },
  expectedError:
    /finalPrimaryCo2\.co2Factors\.electricitate_sen_consumata\.co2EmissionFactor must be a finite non-negative number/
});

expectValidationFailure({
  name: "fails closed when monthlyHeating omits a calendar month",
  sourceFixture: fixture017,
  mutate(inputPack) {
    inputPack.monthlyHeating.monthlyRows = inputPack.monthlyHeating.monthlyRows.filter(
      (row) => row.month !== "Dec"
    );
  },
  expectedError: /monthlyHeating\.monthlyRows must contain 12 calendar months/
});

expectValidationFailure({
  name: "fails closed when monthlyHeating duplicates a calendar month",
  sourceFixture: fixture017,
  mutate(inputPack) {
    inputPack.monthlyHeating.monthlyRows[11].month = "Ian";
  },
  expectedError: /Duplicate monthly heating row: Ian/
});

expectValidationFailure({
  name: "fails closed when monthlyHeating uses an invalid status",
  sourceFixture: fixture017,
  mutate(inputPack) {
    inputPack.monthlyHeating.monthlyRows[0].status = "invented";
  },
  expectedError: /monthlyHeating\.monthlyRows\[0\]\.status must be one of the allowed monthly heating statuses/
});

expectValidationFailure({
  name: "fails closed when April is incorrectly marked validated",
  sourceFixture: fixture017,
  mutate(inputPack) {
    const april = inputPack.monthlyHeating.monthlyRows.find((row) => row.month === "Apr");
    april.status = "validated";
    april.QHnd = april.sourceDisplayedQHnd;
  },
  expectedError: /Apr monthly heating row must remain blocked/
});

expectValidationFailure({
  name: "fails closed when September is incorrectly marked validated",
  sourceFixture: fixture017,
  mutate(inputPack) {
    const september = inputPack.monthlyHeating.monthlyRows.find((row) => row.month === "Sep");
    september.status = "validated";
    september.QHnd = september.sourceDisplayedQHnd;
  },
  expectedError: /Sep monthly heating row must remain blocked/
});

expectValidationFailure({
  name: "fails closed when October is incorrectly marked validated",
  sourceFixture: fixture017,
  mutate(inputPack) {
    const october = inputPack.monthlyHeating.monthlyRows.find((row) => row.month === "Oct");
    october.status = "validated";
    october.QHnd = october.sourceDisplayedQHnd;
  },
  expectedError: /Oct monthly heating row must remain ambiguous/
});

expectValidationFailure({
  name: "fails closed when a required explicit blocker is missing",
  mutate(inputPack) {
    inputPack.explicitBlockers = inputPack.explicitBlockers.filter(
      (blocker) => blocker.blockerId !== "general_rer_methodology_blocked"
    );
  },
  expectedError: /Missing required blocker: general_rer_methodology_blocked/
});

expectValidationFailure({
  name: "fails closed when a required numeric value is a string",
  mutate(inputPack) {
    inputPack.transmission.Hd = String(inputPack.transmission.Hd);
  },
  expectedError: /transmission\.Hd must be a finite number/
});

expectValidationFailure({
  name: "fails closed when a required numeric value is NaN",
  mutate(inputPack) {
    inputPack.transmission.Hd = Number.NaN;
  },
  expectedError: /transmission\.Hd must be a finite number/
});

expectValidationFailure({
  name: "fails closed when a required numeric value is Infinity",
  mutate(inputPack) {
    inputPack.transmission.Hd = Number.POSITIVE_INFINITY;
  },
  expectedError: /transmission\.Hd must be a finite number/
});
