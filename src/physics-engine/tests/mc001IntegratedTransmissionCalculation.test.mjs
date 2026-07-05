import assert from "node:assert/strict";
import { calculateMc001IntegratedTransmissionResult } from "../mc001IntegratedTransmissionCalculation.mjs";

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

function integratedInput(overrides = {}) {
  return {
    mode: "explicit_input_integrated_transmission_v1",
    directTransmission: {
      elements: [{
        elementId: "direct-wall-1",
        label: "Direct wall",
        area: { amount: 10, unit: "m2" },
        correctedThermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" },
        source
      }]
    },
    thermalBridges: {
      bridges: [{
        bridgeId: "bridge-1",
        label: "Linear bridge",
        length: { amount: 5, unit: "m" },
        psi: { amount: 0.1, unit: "W/(m*K)" },
        source
      }],
      explicitNoThermalBridges: false
    },
    ground: { amount: 2, unit: "W/K", source },
    throughUnconditionedSpaces: { amount: 3, unit: "W/K", source },
    adjacentBuildings: { amount: 1, unit: "W/K", source },
    ...overrides
  };
}

function assertBlocked(result) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
}

await test("integrated ready case calculates Hd bridge excluding ground and Htr 2.15", () => {
  const result = calculateMc001IntegratedTransmissionResult(integratedInput());
  assert.equal(result.status, "ready");
  close(result.results.hd.result.amount, 3);
  close(result.results.thermalBridgeGlobal.result.amount, 0.5);
  close(result.results.transmissionExcludingGround.result.amount, 3.5);
  close(result.results.htrTotal215.result.amount, 9);
  assert.equal(result.results.htrTotal215.result.unit, "W/K");
  assert.equal(
    result.diagnostics.warnings.includes("thermal_bridge_not_auto_added_to_2_15_total_in_c2"),
    true
  );
});

await test("explicit no thermal bridges returns zero bridge and excluding ground equals Hd", () => {
  const result = calculateMc001IntegratedTransmissionResult(integratedInput({
    thermalBridges: { bridges: [], explicitNoThermalBridges: true }
  }));
  assert.equal(result.status, "ready");
  close(result.results.hd.result.amount, 3);
  close(result.results.thermalBridgeGlobal.result.amount, 0);
  close(result.results.transmissionExcludingGround.result.amount, 3);
  assert.equal(result.results.thermalBridgeGlobal.notes[0], "explicit_no_thermal_bridges");
});

await test("missing bridges without explicit no-bridges blocks", () => {
  assertBlocked(calculateMc001IntegratedTransmissionResult(integratedInput({
    thermalBridges: { bridges: [], explicitNoThermalBridges: false }
  })));
});

await test("missing direct elements blocks", () => {
  assertBlocked(calculateMc001IntegratedTransmissionResult(integratedInput({
    directTransmission: { elements: [] }
  })));
});

await test("negative ground Hu or Ha blocks", () => {
  const blockedResults = [
    calculateMc001IntegratedTransmissionResult(integratedInput({
      ground: { amount: -1, unit: "W/K", source }
    })),
    calculateMc001IntegratedTransmissionResult(integratedInput({
      throughUnconditionedSpaces: { amount: -1, unit: "W/K", source }
    })),
    calculateMc001IntegratedTransmissionResult(integratedInput({
      adjacentBuildings: { amount: -1, unit: "W/K", source }
    }))
  ];
  blockedResults.forEach(assertBlocked);
});

await test("missing explicit source blocks", () => {
  assertBlocked(calculateMc001IntegratedTransmissionResult(integratedInput({
    ground: { amount: 2, unit: "W/K", source: { sourceType: "registry", reference: "not_allowed" } }
  })));
});

await test("NaN or Infinity blocks", () => {
  const blockedResults = [
    calculateMc001IntegratedTransmissionResult(integratedInput({
      ground: { amount: Infinity, unit: "W/K", source }
    })),
    calculateMc001IntegratedTransmissionResult(integratedInput({
      directTransmission: {
        elements: [{
          elementId: "nan-wall",
          area: { amount: NaN, unit: "m2" },
          correctedThermalTransmittance: { amount: 0.3, unit: "W/(m2*K)" },
          source
        }]
      }
    }))
  ];
  blockedResults.forEach(assertBlocked);
});

await test("output scope says not full MC001 certificate", () => {
  const result = calculateMc001IntegratedTransmissionResult(integratedInput());
  assert.equal(
    result.scope,
    "integrated_transmission_explicit_input_only_not_full_mc001_certificate"
  );
});

await test("methodology limits keep downstream energy scopes out", () => {
  const result = calculateMc001IntegratedTransmissionResult(integratedInput());
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

await test("integrated calculator does not expose registry-as-calculator behavior", () => {
  const serializedFunction = calculateMc001IntegratedTransmissionResult.toString();
  for (const forbidden of [
    "registry" + "_ready",
    "getMc001" + "Normative",
    "sourcePack"
  ]) {
    assert.equal(serializedFunction.includes(forbidden), false, `found ${forbidden}`);
  }
});

await test("integrated calculator does not expose filesystem network or PDF behavior", () => {
  const serializedFunction = calculateMc001IntegratedTransmissionResult.toString();
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
