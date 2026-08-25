import assert from "node:assert/strict";

import {
  PHYSICS_ENGINE_MODES,
  assertNoUiStateInEngineInput,
  buildPhysicsEngineInputFromBuildingDna,
  calculateWithPhysicsEngineMode,
  compareEngineOutputs,
  createBuildingDnaFromAssistedAnswers
} from "../src/building-platform/index.mjs";
import { createP1SeedMonthlyProfiles } from "../src/building-platform/tests/fixtures/p1SeedMonthlyProfiles.mjs";

function assistedDna() {
  return createBuildingDnaFromAssistedAnswers({
    buildingId: "p11-contract-house",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: "eps",
      windowsReplaced: true
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    source: {
      reference: "P11.test.engine_contract"
    },
    monthlyProfiles: createP1SeedMonthlyProfiles()
  }).buildingDna;
}

const dna = assistedDna();
const engineInput = buildPhysicsEngineInputFromBuildingDna(dna, { engineMode: "dual" });
assert.equal(engineInput.schemaVersion, "lacurent_engine_input_v1");
assert.equal(engineInput.calculationOptions.inputDialect, "building_dna_v1");
assert.equal(assertNoUiStateInEngineInput(engineInput).ok, true);
assert.equal(engineInput.use.monthlyProfiles.length, 12);
assert.equal(engineInput.envelope.assemblies.length > 0, true);

const comparison = compareEngineOutputs(
  { chapter2: { annual: { qHndKWh: 10, qCndKWh: 2 } } },
  { chapter2: { annual: { qHndKWh: 10 + 1e-9, qCndKWh: 2 } } }
);
assert.equal(comparison.status, "PASS");

const dual = await calculateWithPhysicsEngineMode({
  engineInput,
  engineMode: PHYSICS_ENGINE_MODES.DUAL,
  jsCalculate: async () => ({ status: "ready", chapter2: { annual: { qHndKWh: 10, qCndKWh: 2 } } }),
  pythonCalculate: async () => ({ status: "ready", chapter2: { annual: { qHndKWh: 10, qCndKWh: 2 } } })
});

assert.equal(dual.engineMode, "dual");
assert.equal(dual.primaryEngine, "javascript");
assert.equal(dual.shadowEngine, "python");
assert.equal(dual.parity.status, "PASS");

console.log("PASS python-engine-adapter");
