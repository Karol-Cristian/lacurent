import assert from "node:assert/strict";
import { calculateMc001MonthlyTransmissionEnergyExplicit } from "../mc001MonthlyTransmissionEnergyCalculation.mjs";

const EPSILON = 1e-9;
const source = { sourceType: "explicit_user_input", reference: "manual_mvp_input" };

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${actual} != ${expected}`);
}

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function monthlyCase(overrides = {}) {
  return {
    caseId: "jan-heating",
    month: "january",
    calculationMode: "heating",
    htr: { amount: 9, unit: "W/K" },
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 0, unit: "degC" },
    duration: { amount: 744, unit: "h" },
    source,
    ...overrides
  };
}

function monthlyInput(overrides = {}) {
  return {
    mode: "explicit_monthly_transmission_energy_v1",
    cases: [monthlyCase()],
    ...overrides
  };
}

function assertBlocked(result) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
}

await test("single January heating case calculates Phi and Q", () => {
  const result = calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput());
  assert.equal(result.status, "ready");
  close(result.caseResults[0].heatFlow.amount, 180);
  close(result.caseResults[0].transmissionEnergy.amount, 133.92);
  close(result.summary.annualSignedTransmissionEnergy.amount, 133.92);
  close(result.summary.annualPositiveHeatingTransmissionEnergy.amount, 133.92);
  close(result.summary.annualCoolingDirectionTransmissionEnergy.amount, 0);
});

await test("twelve monthly cases aggregate repeated values", () => {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];
  const cases = months.map((month, index) => monthlyCase({
    caseId: `${month}-case`,
    month,
    htr: { amount: 10, unit: "W/K" },
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 10, unit: "degC" },
    duration: { amount: 100, unit: "h" },
    calculationMode: index < 6 ? "heating" : "explicit_signed"
  }));
  const result = calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({ cases }));
  assert.equal(result.status, "ready");
  assert.equal(result.summary.caseCount, 12);
  close(result.summary.annualSignedTransmissionEnergy.amount, 120);
  close(result.summary.annualPositiveHeatingTransmissionEnergy.amount, 120);
});

await test("cooling direction negative case aggregates absolute cooling direction energy", () => {
  const result = calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({
    cases: [monthlyCase({
      caseId: "cooling-case",
      month: "july",
      calculationMode: "cooling",
      htr: { amount: 10, unit: "W/K" },
      indoorTemperature: { amount: 20, unit: "degC" },
      outdoorTemperature: { amount: 25, unit: "degC" },
      duration: { amount: 10, unit: "h" }
    })]
  }));
  assert.equal(result.status, "ready");
  close(result.caseResults[0].heatFlow.amount, -50);
  close(result.caseResults[0].transmissionEnergy.amount, -0.5);
  close(result.summary.annualCoolingDirectionTransmissionEnergy.amount, 0.5);
});

await test("blocks empty cases", () => {
  assertBlocked(calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({ cases: [] })));
});

await test("blocks invalid month", () => {
  assertBlocked(calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({
    cases: [monthlyCase({ month: "jan" })]
  })));
});

await test("blocks invalid calculation mode", () => {
  assertBlocked(calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({
    cases: [monthlyCase({ calculationMode: "monthly_default" })]
  })));
});

await test("blocks missing explicit source", () => {
  assertBlocked(calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({
    cases: [monthlyCase({ source: { sourceType: "registry", reference: "not_allowed" } })]
  })));
});

await test("blocks zero or negative duration", () => {
  assertBlocked(calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({
    cases: [monthlyCase({ duration: { amount: 0, unit: "h" } })]
  })));
  assertBlocked(calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({
    cases: [monthlyCase({ duration: { amount: -1, unit: "h" } })]
  })));
});

await test("blocks NaN or Infinity", () => {
  const blockedResults = [
    calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({
      cases: [monthlyCase({ htr: { amount: Infinity, unit: "W/K" } })]
    })),
    calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput({
      cases: [monthlyCase({ outdoorTemperature: { amount: NaN, unit: "degC" } })]
    }))
  ];
  blockedResults.forEach(assertBlocked);
});

await test("output scope says not QHnd", () => {
  const result = calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput());
  assert.equal(result.scope, "monthly_transmission_energy_explicit_input_only_not_QHnd");
});

await test("methodology limits keep downstream scopes out", () => {
  const result = calculateMc001MonthlyTransmissionEnergyExplicit(monthlyInput());
  for (const limit of [
    "not_QHnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
});

await test("monthly calculator does not expose registry-as-calculator behavior", () => {
  const serializedFunction = calculateMc001MonthlyTransmissionEnergyExplicit.toString();
  for (const forbidden of [
    "registry" + "_ready",
    "getMc001" + "Normative",
    "sourcePack"
  ]) {
    assert.equal(serializedFunction.includes(forbidden), false, `found ${forbidden}`);
  }
});

await test("monthly calculator does not expose filesystem network or PDF behavior", () => {
  const serializedFunction = calculateMc001MonthlyTransmissionEnergyExplicit.toString();
  for (const forbidden of [
    "f" + "s",
    "fet" + "ch(",
    "P" + "DF",
    "readFile",
    "XMLHttpRequest"
  ]) {
    assert.equal(serializedFunction.includes(forbidden), false, `found ${forbidden}`);
  }
});
