import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CALCULATION_MODEL_VERSION,
  STORAGE_KEY,
  WORKSPACE_SCHEMA_VERSION,
  calculationInputHash,
  loadWorkspaceState,
  resetWorkspaceState,
  saveWorkspaceState
} from "../js/lacurent-contract.mjs";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}

globalThis.localStorage = new MemoryStorage();

const inputA = {
  schemaVersion: "lacurent_simple_input_v1",
  project: { projectId: "device-a", name: "Casa A" },
  location: { localityId: "cluj", climateZone: "III", lat: 46.77, lon: 23.59 },
  building: { levels: 2, widthM: 10, lengthM: 12 },
  envelope: { wallUValueWPerM2K: 0.31, roofUValueWPerM2K: 0.2 },
  systems: { heating: { enabled: true, generator: "heat_pump", carrier: "electricity" } }
};

const inputB = {
  systems: { heating: { carrier: "electricity", generator: "heat_pump", enabled: true } },
  envelope: { roofUValueWPerM2K: 0.2, wallUValueWPerM2K: 0.31 },
  building: { lengthM: 12, widthM: 10, levels: 2 },
  location: { lon: 23.59, lat: 46.77, climateZone: "III", localityId: "cluj" },
  project: { projectId: "device-b", name: "Alta denumire" },
  schemaVersion: "lacurent_simple_input_v1"
};

assert.equal(
  calculationInputHash(inputA),
  calculationInputHash(inputB),
  "Project metadata and JSON key order must not change calculation identity"
);

const changedInput = structuredClone(inputA);
changedInput.envelope.wallUValueWPerM2K = 0.32;
assert.notEqual(
  calculationInputHash(inputA),
  calculationInputHash(changedInput),
  "A calculation-relevant physical change must change the input hash"
);

localStorage.setItem("lacurent_workspace_simple_v1", JSON.stringify({
  projectId: "legacy-project",
  values: { building: { lengthM: 12, widthM: 10 } },
  lastResult: { chapter2: { annual: { qHndKWh: 12345 } } },
  resultFresh: true
}));

const migrated = loadWorkspaceState();
assert.deepEqual(migrated.values, { building: { lengthM: 12, widthM: 10 } });
assert.equal(migrated.lastResult, null, "Legacy results must never survive a workspace/model migration");
assert.equal(migrated.resultFresh, false);
assert.equal(migrated.workspaceSchemaVersion, WORKSPACE_SCHEMA_VERSION);
assert.equal(migrated.calculationModelVersion, CALCULATION_MODEL_VERSION);

saveWorkspaceState({
  ...migrated,
  lastResult: { ok: true },
  lastResultInputHash: calculationInputHash(inputA),
  lastResultModelVersion: CALCULATION_MODEL_VERSION,
  resultFresh: true
});
const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
assert.equal(stored.workspaceSchemaVersion, WORKSPACE_SCHEMA_VERSION);
assert.equal(stored.calculationModelVersion, CALCULATION_MODEL_VERSION);

resetWorkspaceState();
assert.equal(localStorage.getItem(STORAGE_KEY), null);
assert.equal(localStorage.getItem("lacurent_workspace_simple_v1"), null);

const workspace = fs.readFileSync(new URL("../js/lacurent-workspace.mjs", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
assert.match(workspace, /lastResultInputHash !== currentCalculationInputHash\(\)/);
assert.match(workspace, /lastResultModelVersion !== CALCULATION_MODEL_VERSION/);
assert.match(workspace, /invalidateStoredResult/);
assert.match(workspace, /resetWorkspaceState\(\)/);
assert.match(html, /id="resetProjectBtn"/);

console.log("p12i deterministic workspace: ok");
