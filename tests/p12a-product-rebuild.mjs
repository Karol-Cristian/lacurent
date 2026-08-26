import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import worker from "../workers/save-house.js";
import {
  buildSimpleInputContract,
  createScenario,
  deriveGeometry,
  readinessIssues
} from "../js/lacurent-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function monthProfile(month) {
  return {
    month,
    transmission: {
      heating: {
        duration: { amount: 720, unit: "h" },
        indoorTemperature: { amount: 20, unit: "degC" },
        outdoorTemperature: { amount: 0, unit: "degC" }
      },
      cooling: {
        duration: { amount: 720, unit: "h" },
        indoorTemperature: { amount: 26, unit: "degC" },
        outdoorTemperature: { amount: 30, unit: "degC" }
      }
    },
    ventilation: {
      heating: {
        airHeatCapacity: { amount: 1200, unit: "J/m3K" },
        airFlowRate: { amount: 1 / 60, unit: "m3/s" }
      }
    },
    heatGains: {
      internalGains: { amount: 250, unit: "kWh" },
      solarGains: { amount: 150, unit: "kWh" }
    },
    utilization: {
      effectiveInternalHeatCapacity: { amount: 100000000, unit: "J/K" },
      heating: { aH0: { amount: 1, unit: "dimensionless" }, tauH0: { amount: 15, unit: "h" } },
      cooling: {
        aC0: { amount: 1, unit: "dimensionless" },
        tauC0: { amount: 15, unit: "h" },
        aCred: { amount: 1, unit: "dimensionless" }
      }
    }
  };
}

const monthlyProfiles = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map(monthProfile);

function projectValues() {
  return {
    project: { name: "P12A Casa" },
    location: { locality: "Bucuresti" },
    building: { visualType: "house-single-storey", lengthM: 10, widthM: 8, floorHeightM: 2.7 },
    envelope: {
      wallAreaM2: 120,
      roofUValueWPerM2K: 0.2,
      floorUValueWPerM2K: 0.3,
      wallUValueWPerM2K: 0.4,
      windowAreaM2: 16,
      windowUValueWPerM2K: 1.2
    },
    systems: {
      heating: { enabled: false },
      domesticHotWater: { enabled: false },
      cooling: { enabled: false },
      ventilation: { enabled: false }
    },
    renewables: { photovoltaic: { enabled: true, annualProductionKWh: 4200 } }
  };
}

function assertNotContains(text, forbidden, source) {
  for (const item of forbidden) {
    assert.equal(text.includes(item), false, `${source} still contains obsolete token: ${item}`);
  }
}

const activeProductFiles = [
  "index.html",
  "pages/analiza-casa.html",
  "pages/profil.html",
  "pages/reset-password.html",
  "components/sidebar.html",
  "js/lacurent-contract.mjs",
  "js/lacurent-geography.mjs",
  "js/lacurent-workspace.mjs",
  "workers/save-house.js",
  "css/style.css"
];

for (const file of activeProductFiles) {
  const source = read(file);
  assertNotContains(source, [
    "building-platform-wizard",
    "report-v1",
    "guest-session",
    "generatorRef",
    "src/physics-engine",
    "src/building-platform",
    "synthetic_demo",
    "building_platform_demo",
    "Incarca exemplu"
  ], file);
}

const analysisHtml = read("pages/analiza-casa.html");
assert.equal(analysisHtml.includes("lacurent-workspace.mjs"), true);
assert.equal(analysisHtml.includes("Workspace auditor"), true);
assert.equal(analysisHtml.includes("Localizare"), true);
assert.equal(analysisHtml.includes("Anvelopa"), true);
assert.equal(analysisHtml.includes("Scenarii"), true);
assert.equal(analysisHtml.includes("Documente"), true);

const buildScript = read("scripts/build-pages.mjs");
assert.equal(buildScript.includes('"src"'), false, "build must not publish the JS physics source tree");
assert.equal(read("wrangler.toml").includes('directory = "dist/pages"'), true);

const values = projectValues();
const geometry = deriveGeometry(values);
assert.equal(geometry.footprintM2, 80);
assert.equal(geometry.usefulAreaM2, 80);
assert.equal(geometry.heatedVolumeM3, 216);
assert.deepEqual(readinessIssues(values), []);

const blankContract = buildSimpleInputContract({ project: { name: "Gol" } }, { projectId: "blank-project" });
assert.equal(Object.hasOwn(blankContract.building, "lengthM"), false, "missing length must not become zero");
assert.equal(Object.hasOwn(blankContract.envelope, "wallAreaM2"), false, "missing wall area must not become zero");
assert.equal(blankContract.schemaVersion, "lacurent_simple_input_v1");

const scenario = createScenario(values, { name: "Perete imbunatatit", wallUValueWPerM2K: 0.18 });
assert.equal(values.envelope.wallUValueWPerM2K, 0.4, "scenario must not mutate baseline");
assert.equal(scenario.values.envelope.wallUValueWPerM2K, 0.18);

const engineInput = buildSimpleInputContract(values, {
  projectId: "p12a-contract",
  monthlyProfiles
});
const tempPath = path.join(os.tmpdir(), `lacurent-p12a-${process.pid}.json`);
fs.writeFileSync(tempPath, JSON.stringify(engineInput), "utf8");
try {
  const result = spawnSync("python", ["-m", "python_engine", "calculate", tempPath, "--compact"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.engine, "python");
  assert.equal(parsed.status, "ready");
  assert.equal(parsed.chapter4.annualProductionKWh, 4200);
  assert.equal(Number.isFinite(parsed.chapter2.annual.qHndKWh), true);
} finally {
  fs.rmSync(tempPath, { force: true });
}

const systemInput = buildSimpleInputContract({
  ...values,
  systems: {
    ...values.systems,
    heating: { enabled: true, generator: "condensing_boiler", carrier: "natural_gas" }
  }
}, {
  projectId: "p12a-systems-block",
  monthlyProfiles
});
const blockedPath = path.join(os.tmpdir(), `lacurent-p12a-blocked-${process.pid}.json`);
fs.writeFileSync(blockedPath, JSON.stringify(systemInput), "utf8");
try {
  const result = spawnSync("python", ["-m", "python_engine", "calculate", blockedPath, "--compact"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024
  });
  assert.notEqual(result.status, 0, "active thermal systems without technical contract must block");
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.status, "blocked");
  assert.equal(parsed.diagnostics[0].code, "SIMPLE_INPUT_CONTRACT_INCOMPLETE");
  assert.deepEqual(parsed.chapter3.annual, {});
} finally {
  fs.rmSync(blockedPath, { force: true });
}

const response = await worker.fetch(new Request("https://lacurent.test/api/python/calculate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ input: engineInput })
}), {
  ASSETS: {
    fetch: () => new Response("asset")
  }
});
assert.equal(response.status, 503);
const body = await response.json();
assert.equal(body.success, false);
assert.equal(body.diagnostic.code, "PYTHON_ENGINE_SERVICE_UNCONFIGURED");

console.log(JSON.stringify({
  status: "PASS",
  activeProductFiles: activeProductFiles.length,
  frontendUsesPythonContract: true,
  jsPhysicsProductRuntimeRemoved: true
}, null, 2));
