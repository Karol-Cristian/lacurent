import assert from "node:assert/strict";
import { calculateMc001ExplicitTotalHeatTransferSummary } from "../mc001ExplicitTotalHeatTransferCalculation.mjs";

const EPSILON = 1e-9;
const transmissionSource = {
  sourceType: "explicit_calculated_input",
  reference: "monthlyTransmissionEnergyResult.summary.annualSignedTransmissionEnergy"
};
const ventilationSource = {
  sourceType: "explicit_calculated_input",
  reference: "ventilationTransferResult.summary.annualSignedVentilationEnergy"
};

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

function input(overrides = {}) {
  return {
    mode: "explicit_total_heat_transfer_summary_v1",
    transmissionEnergy: {
      amount: 133.92,
      unit: "kWh",
      source: transmissionSource
    },
    ventilationEnergy: {
      amount: 892.8,
      unit: "kWh",
      source: ventilationSource
    },
    ...overrides
  };
}

function assertBlocked(result) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
}

await test("calculates sample explicit total heat transfer", () => {
  const result = calculateMc001ExplicitTotalHeatTransferSummary(input());
  assert.equal(result.status, "ready");
  close(result.result.amount, 1026.72);
  assert.equal(result.result.symbol, "Q_total_transfer_explicit");
  close(result.components.transmissionEnergy.amount, 133.92);
  close(result.components.ventilationEnergy.amount, 892.8);
});

await test("allows signed negative component and adds warning", () => {
  const result = calculateMc001ExplicitTotalHeatTransferSummary(input({
    transmissionEnergy: { amount: -10, unit: "kWh", source: transmissionSource },
    ventilationEnergy: { amount: 20, unit: "kWh", source: ventilationSource }
  }));
  assert.equal(result.status, "ready");
  close(result.result.amount, 10);
  assert.equal(
    result.diagnostics.warnings.some((warning) => warning.code === "signed_energy_component_present"),
    true
  );
});

await test("blocks missing transmission energy", () => {
  const payload = input();
  delete payload.transmissionEnergy;
  assertBlocked(calculateMc001ExplicitTotalHeatTransferSummary(payload));
});

await test("blocks missing ventilation energy", () => {
  const payload = input();
  delete payload.ventilationEnergy;
  assertBlocked(calculateMc001ExplicitTotalHeatTransferSummary(payload));
});

await test("blocks invalid unit", () => {
  assertBlocked(calculateMc001ExplicitTotalHeatTransferSummary(input({
    transmissionEnergy: { amount: 133.92, unit: "MWh", source: transmissionSource }
  })));
});

await test("blocks NaN or Infinity", () => {
  const results = [
    calculateMc001ExplicitTotalHeatTransferSummary(input({
      transmissionEnergy: { amount: NaN, unit: "kWh", source: transmissionSource }
    })),
    calculateMc001ExplicitTotalHeatTransferSummary(input({
      ventilationEnergy: { amount: Infinity, unit: "kWh", source: ventilationSource }
    }))
  ];
  results.forEach(assertBlocked);
});

await test("blocks missing source", () => {
  assertBlocked(calculateMc001ExplicitTotalHeatTransferSummary(input({
    ventilationEnergy: { amount: 892.8, unit: "kWh" }
  })));
});

await test("output scope says not QHnd", () => {
  const result = calculateMc001ExplicitTotalHeatTransferSummary(input());
  assert.equal(result.scope, "explicit_transmission_plus_ventilation_heat_transfer_only_not_QHnd");
});

await test("methodology limits include downstream exclusions", () => {
  const result = calculateMc001ExplicitTotalHeatTransferSummary(input());
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

await test("methodology limits include no gains systems fan or air treatment behavior", () => {
  const result = calculateMc001ExplicitTotalHeatTransferSummary(input());
  for (const limit of [
    "does_not_include_internal_gains",
    "does_not_include_solar_gains",
    "does_not_include_utilization_factors",
    "does_not_include_system_losses",
    "does_not_include_fan_electricity",
    "does_not_include_air_treatment_energy"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
});

await test("total transfer calculator does not expose registry-as-calculator behavior", () => {
  const serializedFunction = calculateMc001ExplicitTotalHeatTransferSummary.toString();
  for (const forbidden of [
    "registry" + "_ready",
    "getMc001" + "Normative",
    "sourcePack"
  ]) {
    assert.equal(serializedFunction.includes(forbidden), false, `found ${forbidden}`);
  }
});

await test("total transfer calculator does not expose filesystem network or PDF behavior", () => {
  const serializedFunction = calculateMc001ExplicitTotalHeatTransferSummary.toString();
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
