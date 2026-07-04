import assert from "node:assert/strict";
import {
  calculateMc001DirectTransmissionCoefficient,
  calculateMc001GlobalTransmissionExcludingGround,
  calculateMc001LinearThermalBridgePsi,
  calculateMc001ThermalBridgeGlobalCoefficient,
  calculateMc001TransmissionEnergyFromHeatFlow,
  calculateMc001TransmissionHeatFlow,
  calculateMc001TransmissionTotalCoefficient
} from "../mc001TransmissionFormulaCalculations.mjs";

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

function assertBlocked(result) {
  assert.equal(result.status, "blocked");
  assert.equal(result.blockers?.[0]?.severity, "blocking");
}

await test("relation 2.12 calculates Hd from two elements", () => {
  const result = calculateMc001DirectTransmissionCoefficient({
    elements: [
      {
        elementId: "wall-1",
        area: { amount: 10, unit: "m2" },
        correctedThermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" },
        source
      },
      {
        elementId: "roof-1",
        area: { amount: 20, unit: "m2" },
        correctedThermalTransmittance: { amount: 0.2, unit: "W/(m2*K)" },
        source
      }
    ]
  });
  assert.equal(result.status, "ready");
  close(result.result.amount, 7);
  assert.equal(result.result.unit, "W/K");
});

await test("relation 2.12 blocks empty elements", () => {
  assertBlocked(calculateMc001DirectTransmissionCoefficient({ elements: [] }));
});

await test("relation 2.12 blocks negative or zero area", () => {
  assertBlocked(calculateMc001DirectTransmissionCoefficient({
    elements: [{
      elementId: "bad-area",
      area: { amount: 0, unit: "m2" },
      correctedThermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" },
      source
    }]
  }));
});

await test("relation 2.13 calculates psi", () => {
  const result = calculateMc001LinearThermalBridgePsi({
    bridgeId: "bridge-1",
    length: { amount: 5, unit: "m" },
    l2d: { amount: 4, unit: "W/K" },
    referenceElements: [{
      elementId: "ref-wall-1",
      area: { amount: 10, unit: "m2" },
      thermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" }
    }],
    source
  });
  assert.equal(result.status, "ready");
  close(result.result.amount, 0.2);
  assert.equal(result.result.unit, "W/(m*K)");
});

await test("relation 2.13 allows negative psi with warning if source exists", () => {
  const result = calculateMc001LinearThermalBridgePsi({
    bridgeId: "bridge-negative",
    length: { amount: 5, unit: "m" },
    l2d: { amount: 2, unit: "W/K" },
    referenceElements: [{
      elementId: "ref-wall-1",
      area: { amount: 10, unit: "m2" },
      thermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" }
    }],
    source
  });
  assert.equal(result.status, "ready");
  assert.equal(result.result.amount < 0, true);
  assert.equal(result.warnings[0].code, "negative_psi_requires_expert_review");
});

await test("relation 2.13 blocks zero length", () => {
  assertBlocked(calculateMc001LinearThermalBridgePsi({
    bridgeId: "bad-bridge",
    length: { amount: 0, unit: "m" },
    l2d: { amount: 4, unit: "W/K" },
    referenceElements: [{
      elementId: "ref-wall-1",
      area: { amount: 10, unit: "m2" },
      thermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" }
    }],
    source
  }));
});

await test("relation 2.28 calculates bridge coefficient", () => {
  const result = calculateMc001ThermalBridgeGlobalCoefficient({
    bridges: [
      {
        bridgeId: "bridge-1",
        length: { amount: 5, unit: "m" },
        psi: { amount: 0.1, unit: "W/(m*K)" },
        source
      },
      {
        bridgeId: "bridge-2",
        length: { amount: 2, unit: "m" },
        psi: { amount: 0.2, unit: "W/(m*K)" },
        source
      }
    ]
  });
  assert.equal(result.status, "ready");
  close(result.result.amount, 0.9);
});

await test("relation 2.28 does not calculate point bridge chi", () => {
  assertBlocked(calculateMc001ThermalBridgeGlobalCoefficient({
    bridges: [{
      bridgeId: "bridge-chi",
      length: { amount: 5, unit: "m" },
      psi: { amount: 0.1, unit: "W/(m*K)" },
      chi: { amount: 0.2, unit: "W/K" },
      source
    }]
  }));
});

await test("relation 2.27 calculates global excluding ground", () => {
  const result = calculateMc001GlobalTransmissionExcludingGround({
    elementTransmissionCoefficients: [{
      elementId: "hd",
      amount: 7,
      unit: "W/K",
      source
    }],
    thermalBridgeCoefficient: { amount: 0.9, unit: "W/K", source }
  });
  assert.equal(result.status, "ready");
  close(result.result.amount, 7.9);
});

await test("relation 2.14 calculates heat flow", () => {
  const result = calculateMc001TransmissionHeatFlow({
    htr: { amount: 10, unit: "W/K" },
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 0, unit: "degC" }
  });
  assert.equal(result.status, "ready");
  close(result.result.amount, 200);
  assert.equal(result.result.unit, "W");
});

await test("relation 2.14 allows negative heat flow with sign note", () => {
  const result = calculateMc001TransmissionHeatFlow({
    htr: { amount: 10, unit: "W/K" },
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 25, unit: "degC" }
  });
  assert.equal(result.status, "ready");
  assert.equal(result.result.amount, -50);
  assert.equal(result.signConvention, "positive_from_interior_to_exterior");
});

await test("time-integrated relation 2.14 calculates explicit transmission energy", () => {
  const result = calculateMc001TransmissionEnergyFromHeatFlow({
    htr: { amount: 10, unit: "W/K" },
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 0, unit: "degC" },
    duration: { amount: 24, unit: "h" }
  });
  assert.equal(result.status, "ready");
  close(result.result.amount, 4.8);
  assert.equal(result.result.unit, "kWh");
});

await test("time-integrated output explicitly says not QHnd", () => {
  const result = calculateMc001TransmissionEnergyFromHeatFlow({
    htr: { amount: 10, unit: "W/K" },
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 0, unit: "degC" },
    duration: { amount: 24, unit: "h" }
  });
  assert.equal(result.scope, "transmission_heat_flow_time_integration_only_not_QHnd");
});

await test("relation 2.15 calculates Htr total", () => {
  const result = calculateMc001TransmissionTotalCoefficient({
    hd: { amount: 7, unit: "W/K" },
    hg: { amount: 2, unit: "W/K" },
    hu: { amount: 3, unit: "W/K" },
    ha: { amount: 1, unit: "W/K" }
  });
  assert.equal(result.status, "ready");
  close(result.result.amount, 13);
});

await test("relation 2.15 blocks negative components", () => {
  assertBlocked(calculateMc001TransmissionTotalCoefficient({
    hd: { amount: 7, unit: "W/K" },
    hg: { amount: -2, unit: "W/K" },
    hu: { amount: 3, unit: "W/K" },
    ha: { amount: 1, unit: "W/K" }
  }));
});

await test("all calculators reject NaN or Infinity", () => {
  const blockedResults = [
    calculateMc001DirectTransmissionCoefficient({
      elements: [{
        elementId: "bad-nan",
        area: { amount: NaN, unit: "m2" },
        correctedThermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" },
        source
      }]
    }),
    calculateMc001LinearThermalBridgePsi({
      bridgeId: "bad-inf",
      length: { amount: Infinity, unit: "m" },
      l2d: { amount: 4, unit: "W/K" },
      referenceElements: [{
        elementId: "ref",
        area: { amount: 10, unit: "m2" },
        thermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" }
      }],
      source
    }),
    calculateMc001ThermalBridgeGlobalCoefficient({
      bridges: [{
        bridgeId: "bad-inf",
        length: { amount: 5, unit: "m" },
        psi: { amount: Infinity, unit: "W/(m*K)" },
        source
      }]
    }),
    calculateMc001GlobalTransmissionExcludingGround({
      elementTransmissionCoefficients: [{ elementId: "bad", amount: NaN, unit: "W/K", source }],
      thermalBridgeCoefficient: { amount: 0, unit: "W/K", source }
    }),
    calculateMc001TransmissionHeatFlow({
      htr: { amount: Infinity, unit: "W/K" },
      indoorTemperature: { amount: 20, unit: "degC" },
      outdoorTemperature: { amount: 0, unit: "degC" }
    }),
    calculateMc001TransmissionEnergyFromHeatFlow({
      htr: { amount: 10, unit: "W/K" },
      indoorTemperature: { amount: 20, unit: "degC" },
      outdoorTemperature: { amount: 0, unit: "degC" },
      duration: { amount: NaN, unit: "h" }
    }),
    calculateMc001TransmissionTotalCoefficient({
      hd: { amount: 7, unit: "W/K" },
      hg: { amount: Infinity, unit: "W/K" },
      hu: { amount: 3, unit: "W/K" },
      ha: { amount: 1, unit: "W/K" }
    })
  ];
  blockedResults.forEach(assertBlocked);
});

await test("calculators require explicit source where source is part of input", () => {
  assertBlocked(calculateMc001DirectTransmissionCoefficient({
    elements: [{
      elementId: "wall-no-source",
      area: { amount: 10, unit: "m2" },
      correctedThermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" },
      source: { sourceType: "registry", reference: "not_allowed" }
    }]
  }));
});

await test("module does not expose filesystem network PDF or registry behavior", () => {
  const serializedFunctions = [
    calculateMc001DirectTransmissionCoefficient,
    calculateMc001LinearThermalBridgePsi,
    calculateMc001ThermalBridgeGlobalCoefficient,
    calculateMc001GlobalTransmissionExcludingGround,
    calculateMc001TransmissionHeatFlow,
    calculateMc001TransmissionEnergyFromHeatFlow,
    calculateMc001TransmissionTotalCoefficient
  ].map(fn => fn.toString()).join("\n");
  for (const forbidden of [
    "f" + "s",
    "fet" + "ch(",
    "P" + "DF",
    "registry" + "_ready",
    "getMc001" + "Normative"
  ]) {
    assert.equal(serializedFunctions.includes(forbidden), false, `found ${forbidden}`);
  }
});

await test("module does not emit final primary CO2 certificate claims", () => {
  const result = calculateMc001TransmissionEnergyFromHeatFlow({
    htr: { amount: 10, unit: "W/K" },
    indoorTemperature: { amount: 20, unit: "degC" },
    outdoorTemperature: { amount: 0, unit: "degC" },
    duration: { amount: 24, unit: "h" }
  });
  const serialized = JSON.stringify(result);
  for (const forbidden of ["finalEnergy", "primaryEnergy", "CO2", "certificate"]) {
    assert.equal(serialized.includes(forbidden), false, `found ${forbidden}`);
  }
});
