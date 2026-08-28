import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import routerWorker from "../workers/save-house.js";
import { buildSimpleInputContract } from "../js/lacurent-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const generatedDir = path.join(repoRoot, ".wrangler", "p12f-test-python-worker");
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthlyProfile(month) {
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

function sampleContract(overrides = {}, options = {}) {
  const values = {
    project: { name: "P12F Cloudflare Python Worker" },
    location: { locality: "Bucuresti" },
    building: { visualType: "house-single-storey", type: "single_family_house", lengthM: 10, widthM: 8, levels: 1, floorHeightM: 2.7 },
    envelope: {
      wallAreaM2: 120,
      roofUValueWPerM2K: 0.2,
      floorUValueWPerM2K: 0.3,
      wallUValueWPerM2K: 0.4,
      windowAreaM2: 16,
      windowUValueWPerM2K: 1.2
    },
    systems: {
      technicalContractConfirmed: true,
      heating: { enabled: true, generator: "condensing_boiler", carrier: "natural_gas" },
      domesticHotWater: { enabled: false },
      cooling: { enabled: false },
      ventilation: { enabled: false }
    },
    renewables: { photovoltaic: { enabled: false } },
    ...overrides
  };
  return buildSimpleInputContract(values, {
    projectId: "p12f-contract-test",
    monthlyProfiles: months.map(monthlyProfile),
    ...options
  });
}

function runNode(args) {
  return execFileSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const prepareOutput = runNode(["scripts/prepare-cloudflare-python-worker.mjs", "--out", generatedDir]);
const prepared = JSON.parse(prepareOutput);
assert.equal(prepared.status, "prepared");
assert.equal(prepared.includesStandaloneServer, false);
assert.equal(prepared.workerName, "lacurent-python-mc001");
assert.equal(prepared.compatibilityDate, "2026-05-25");
assert.equal(fs.existsSync(path.join(generatedDir, "src", "worker.py")), true);
assert.equal(fs.existsSync(path.join(generatedDir, "src", "python_engine", "lacurent_engine", "api", "service.py")), false);
assert.equal(fs.existsSync(path.join(generatedDir, "src", "validation-reference", "python-mc001", "mc001_reference")), true);

const wranglerToml = fs.readFileSync(path.join(generatedDir, "wrangler.toml"), "utf8");
assert.match(wranglerToml, /main = "src\/worker\.py"/);
assert.match(wranglerToml, /compatibility_flags = \["python_workers"\]/);
assert.doesNotMatch(wranglerToml, /PYTHON_ENGINE_URL/);

const workerSource = read("workers/python-mc001/worker.py");
for (const forbidden of [/ThreadingHTTPServer/, /http\.server/, /socket/, /subprocess/, /PYTHON_ENGINE_URL/]) {
  assert.doesNotMatch(workerSource, forbidden, `Cloudflare Python Worker must not import ${forbidden}`);
}

const routerSource = read("workers/save-house.js");
assert.match(routerSource, /env\.PYTHON_ENGINE\.fetch/);
assert.match(routerSource, /PYTHON_ENGINE_URL/);
assert.doesNotMatch(routerSource, /calculateMc001/);

const inputPath = path.join(generatedDir, "sample-input.json");
fs.writeFileSync(inputPath, JSON.stringify(sampleContract(), null, 2));
execFileSync("python", ["-c", "import json, pathlib, sys; sys.path.insert(0, sys.argv[1]); from python_engine import calculate; result = calculate(json.loads(pathlib.Path(sys.argv[2]).read_text())); assert result['engine'] == 'python'; assert result['status'] in {'ready', 'incomplete'}", path.join(generatedDir, "src"), inputPath], {
  cwd: repoRoot,
  stdio: "inherit"
});

let serviceBindingCalled = false;
const response = await routerWorker.fetch(new Request("https://lacurent.test/api/python/calculate", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ input: sampleContract() })
}), {
  PYTHON_ENGINE: {
    async fetch(request) {
      serviceBindingCalled = true;
      assert.equal(new URL(request.url).pathname, "/calculate");
      assert.equal(request.headers.get("x-lacurent-compact-output"), "true");
      const body = await request.json();
      assert.equal(body.schemaVersion, "lacurent_simple_input_v1");
      return new Response(JSON.stringify({
        schemaVersion: "lacurent_engine_output_v1",
        engine: "python",
        engineVersion: "p11c.0",
        status: "ready",
        chapter3: { annual: { heatingInputKWh: 10 } },
        energyCarriers: { natural_gas: 10 }
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  },
  PYTHON_ENGINE_URL: "https://should-not-be-used.invalid",
  ASSETS: { fetch: () => new Response("asset") }
});
const body = await response.json();
