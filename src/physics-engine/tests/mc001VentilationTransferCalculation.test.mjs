import assert from "node:assert/strict";
import {
  calculateMc001MonthlyVentilationTransferExplicit,
  calculateMc001VentilationEnergyExplicit,
  calculateMc001VentilationHeatFlow,
  calculateMc001VentilationHeatTransferCoefficient
} from "../mc001VentilationTransferCalculation.mjs";

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

function component(overrides = {}) {
  return {
    componentId: "infiltration-1",
    label: "Infiltration",
    airFlowRate: { amount: 0.05, unit: "m3/s" },
    temperatureCorrectionFactor: { amount: 1, unit: "dimensionless" },
    dynamicCorrectionFactor: { amount: 1, unit: "dimensionless" },
    source,
    ...overrides
  };
}

function coefficientInput(overrides = {}) {
  return {
    mode: "explicit_ventilation_coefficient_v1",
    airHeatCapacity: {
      amount: 1200,
      unit: "J/(m3*K)",
      source
    },
    components: [component()],
    ...overrides
  };
}

function monthlyCase(overrides = {}) {
  return {
    caseId: "jan-ventilation",
    month: "january",
    calculationMode: "heating",
    airHeatCapacity: {
      amount: 1200,
      unit: "J/(m3*K)",
      source
    },
    components: [component()],
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 0, unit: "degC" },
    duration: { amount: 744, unit: "h" },
    source,
    ...overrides
  };
}

function monthlyInput(overrides = {}) {
  return {
    mode: "explicit_monthly_ventilation_transfer_v1",
    cases: [monthlyCase()],
    ...overrides
  };
}

function assertBlocked(result) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
}

await test("Hve coefficient sample calculates 60 W/K", () => {
  const result = calculateMc001VentilationHeatTransferCoefficient(coefficientInput());
  assert.equal(result.status, "ready");
  close(result.result.amount, 60);
  assert.equal(result.result.unit, "W/K");
});

await test("multiple components aggregate Hve", () => {
  const result = calculateMc001VentilationHeatTransferCoefficient(coefficientInput({
    components: [
      component(),
      component({
        componentId: "ventilation-2",
        airFlowRate: { amount: 0.025, unit: "m3/s" },
        temperatureCorrectionFactor: { amount: 0.5, unit: "dimensionless" },
        dynamicCorrectionFactor: { amount: 1, unit: "dimensionless" }
      })
    ]
  }));
  assert.equal(result.status, "ready");
  close(result.result.amount, 75);
});

await test("Hve blocks missing components", () => {
  assertBlocked(calculateMc001VentilationHeatTransferCoefficient(coefficientInput({
    components: []
  })));
});

await test("Hve blocks missing explicit airHeatCapacity source", () => {
  assertBlocked(calculateMc001VentilationHeatTransferCoefficient(coefficientInput({
    airHeatCapacity: {
      amount: 1200,
      unit: "J/(m3*K)",
      source: { sourceType: "registry", reference: "not_allowed" }
    }
  })));
});

await test("Hve blocks negative qV", () => {
  assertBlocked(calculateMc001VentilationHeatTransferCoefficient(coefficientInput({
    components: [component({ airFlowRate: { amount: -0.1, unit: "m3/s" } })]
  })));
});

await test("heat flow sample calculates 1200 W", () => {
  const result = calculateMc001VentilationHeatFlow({
    hve: { amount: 60, unit: "W/K" },
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 0, unit: "degC" }
  });
  assert.equal(result.status, "ready");
  close(result.result.amount, 1200);
});

await test("ventilation energy 24h calculates 28.8 kWh", () => {
  const result = calculateMc001VentilationEnergyExplicit({
    hve: { amount: 60, unit: "W/K" },
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 0, unit: "degC" },
    duration: { amount: 24, unit: "h" }
  });
  assert.equal(result.status, "ready");
  close(result.result.amount, 28.8);
});

await test("monthly January sample calculates Hve Phi and Q", () => {
  const result = calculateMc001MonthlyVentilationTransferExplicit(monthlyInput());
  assert.equal(result.status, "ready");
  close(result.caseResults[0].ventilationHeatTransferCoefficient.amount, 60);
  close(result.caseResults[0].heatFlow.amount, 1200);
  close(result.caseResults[0].ventilationEnergy.amount, 892.8);
  close(result.summary.annualSignedVentilationEnergy.amount, 892.8);
  close(result.summary.annualPositiveHeatingVentilationEnergy.amount, 892.8);
});

await test("cooling negative sign case aggregates cooling direction", () => {
  const result = calculateMc001MonthlyVentilationTransferExplicit(monthlyInput({
    cases: [monthlyCase({
      caseId: "cooling-ventilation",
      month: "july",
      calculationMode: "cooling",
      indoorTemperature: { amount: 20, unit: "degC" },
      outdoorTemperature: { amount: 25, unit: "degC" },
      duration: { amount: 10, unit: "h" }
    })]
  }));
  assert.equal(result.status, "ready");
  close(result.caseResults[0].heatFlow.amount, -300);
  close(result.caseResults[0].ventilationEnergy.amount, -3);
  close(result.summary.annualCoolingDirectionVentilationEnergy.amount, 3);
});

await test("blocks invalid month", () => {
  assertBlocked(calculateMc001MonthlyVentilationTransferExplicit(monthlyInput({
    cases: [monthlyCase({ month: "jan" })]
  })));
});

await test("blocks zero duration", () => {
  assertBlocked(calculateMc001MonthlyVentilationTransferExplicit(monthlyInput({
    cases: [monthlyCase({ duration: { amount: 0, unit: "h" } })]
  })));
});

await test("blocks NaN or Infinity", () => {
  const results = [
    calculateMc001VentilationHeatTransferCoefficient(coefficientInput({
      airHeatCapacity: { amount: Infinity, unit: "J/(m3*K)", source }
    })),
    calculateMc001MonthlyVentilationTransferExplicit(monthlyInput({
      cases: [monthlyCase({ outdoorTemperature: { amount: NaN, unit: "degC" } })]
    }))
  ];
  results.forEach(assertBlocked);
});

await test("scope says not QHnd final primary CO2 certificate", () => {
  const result = calculateMc001MonthlyVentilationTransferExplicit(monthlyInput());
  assert.equal(result.scope, "monthly_ventilation_transfer_explicit_input_only_not_QHnd");
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

await test("ventilation calculator does not expose registry-as-calculator behavior", () => {
  const serializedFunction = calculateMc001MonthlyVentilationTransferExplicit.toString();
  for (const forbidden of [
    "registry" + "_ready",
    "getMc001" + "Normative",
    "sourcePack"
  ]) {
    assert.equal(serializedFunction.includes(forbidden), false, `found ${forbidden}`);
  }
});

await test("ventilation calculator does not expose filesystem network or PDF behavior", () => {
  const serializedFunction = calculateMc001MonthlyVentilationTransferExplicit.toString();
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
