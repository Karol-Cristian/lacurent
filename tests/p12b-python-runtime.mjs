import assert from "node:assert/strict";
import net from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import worker from "../workers/save-house.js";
import { buildSimpleInputContract } from "../js/lacurent-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

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

const monthlyProfiles = months.map(monthProfile);

function baseValues(overrides = {}) {
  return {
    project: { name: "P12B runtime" },
    location: { locality: "Bucuresti" },
    building: { type: "single_family_house", lengthM: 10, widthM: 8, levels: 1, floorHeightM: 2.7 },
    envelope: {
      wallAreaM2: 120,
      roofUValueWPerM2K: 0.2,
      floorUValueWPerM2K: 0.3,
      wallUValueWPerM2K: 0.4,
      windowAreaM2: 16,
      windowUValueWPerM2K: 1.2
    },
    systems: {
      technicalContractConfirmed: false,
      heating: { enabled: false },
      domesticHotWater: { enabled: false },
      cooling: { enabled: false },
      ventilation: { enabled: false }
    },
    renewables: { photovoltaic: { enabled: false } },
    ...overrides
  };
}

function contract(values, options = {}) {
  return buildSimpleInputContract(values, {
    projectId: `p12b-${Date.now().toString(36)}`,
    monthlyProfiles,
    ...options
  });
}

async function freePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function startPythonService() {
  const port = await freePort();
  const child = spawn("python", ["-m", "python_engine", "serve", "--host", "127.0.0.1", "--port", String(port)], {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.stdout.resume();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) {
        const body = await response.json();
        assert.equal(body.engine, "python");
        return { port, child, stderr: () => stderr };
      }
    } catch {
      await delay(100);
    }
  }
  child.kill();
  throw new Error(`Python service did not become healthy. stderr: ${stderr}`);
}

async function callWorker(input, engineUrl) {
  const response = await worker.fetch(new Request("https://lacurent.test/api/python/calculate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input })
  }), {
    PYTHON_ENGINE_URL: engineUrl,
    ASSETS: { fetch: () => new Response("asset") }
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.success, true, JSON.stringify(body));
  assert.equal(body.engine, "python");
  assert.equal(body.output.engine, "python");
  assert.equal(Boolean(body.engineVersion), true);
  return body.output;
}

function finite(value, label) {
  assert.equal(Number.isFinite(value), true, `${label} must be finite, got ${value}`);
}

const service = await startPythonService();
const engineUrl = `http://127.0.0.1:${service.port}`;

try {
  const heating = await callWorker(contract(baseValues({
    systems: {
      technicalContractConfirmed: true,
      heating: { enabled: true, generator: "condensing_boiler", carrier: "natural_gas" },
      domesticHotWater: { enabled: false },
      cooling: { enabled: false },
      ventilation: { enabled: false }
    }
  })), engineUrl);
  assert.equal(heating.status, "ready");
  finite(heating.chapter3.annual.heatingInputKWh, "heating input");
  assert.equal(heating.energyCarriers.natural_gas > 0, true);

  const coolingEer2 = await callWorker(contract(baseValues({
    systems: {
      technicalContractConfirmed: true,
      heating: { enabled: false },
      domesticHotWater: { enabled: false },
      cooling: { enabled: true, eer: 2, nominalCoolingPowerKW: 8, operationHoursPerMonth: 180 },
      ventilation: { enabled: false }
    }
  })), engineUrl);
  const coolingEer4 = await callWorker(contract(baseValues({
    systems: {
      technicalContractConfirmed: true,
      heating: { enabled: false },
      domesticHotWater: { enabled: false },
      cooling: { enabled: true, eer: 4, nominalCoolingPowerKW: 8, operationHoursPerMonth: 180 },
      ventilation: { enabled: false }
    }
  })), engineUrl);
  assert.equal(coolingEer2.status, "ready");
  assert.equal(coolingEer4.status, "ready");
  assert.equal(
    coolingEer4.chapter3.annual.coolingInputKWh < coolingEer2.chapter3.annual.coolingInputKWh,
    true,
    "higher EER must reduce delivered cooling electricity"
  );

  const shared = await callWorker(contract(baseValues({
    systems: {
      technicalContractConfirmed: true,
      heating: {
        enabled: true,
        generator: "condensing_boiler",
        carrier: "natural_gas",
        sameGeneratorAsDhw: true,
        controlLossFactor: 1.05,
        operationHoursPerMonth: 180,
        standbyLossPowerKW: 0.15,
        auxiliaryPowerKW: 0.03
      },
      domesticHotWater: { enabled: true, monthlyUsefulDemandKWh: 80 },
      cooling: { enabled: false },
      ventilation: { enabled: false },
      sharedGeneratorAllocation: { heating: 0.7, dhw: 0.3 }
    }
  })), engineUrl);
  assert.equal(shared.status, "ready");
  finite(shared.chapter3.annual.sharedGeneratorFuelInputKWh, "shared generator fuel");
  assert.equal(shared.chapter3.annual.sharedGeneratorFuelInputKWh > 0, true);
  assert.equal(shared.energyCarriers.natural_gas > 0, true);

  const pv = await callWorker(contract(baseValues({
    renewables: { photovoltaic: { enabled: true, annualProductionKWh: 4200 } }
  })), engineUrl);
  assert.equal(pv.status, "ready");
  assert.equal(pv.chapter4.annualProductionKWh, 4200);

  const solarBlocked = await callWorker(contract(baseValues({
    renewables: { photovoltaic: { enabled: true, annualProductionKWh: 4200 } }
  }), { solarGainPreprocessingStatus: "blocked_qsky" }), engineUrl);
  assert.equal(solarBlocked.status, "incomplete");
  assert.equal(
    solarBlocked.diagnostics.some((item) => item.code === "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED"),
    true
  );

  const invalidType = await worker.fetch(new Request("https://lacurent.test/api/python/calculate", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "{}"
  }), {
    PYTHON_ENGINE_URL: engineUrl,
    ASSETS: { fetch: () => new Response("asset") }
  });
  assert.equal(invalidType.status, 415);

  console.log(JSON.stringify({
    status: "PASS",
    engineUrl: "local",
    executionReachedPython: true,
    heatingInputKWh: heating.chapter3.annual.heatingInputKWh,
    coolingEer2InputKWh: coolingEer2.chapter3.annual.coolingInputKWh,
    coolingEer4InputKWh: coolingEer4.chapter3.annual.coolingInputKWh,
    sharedGeneratorFuelInputKWh: shared.chapter3.annual.sharedGeneratorFuelInputKWh,
    pvAnnualKWh: pv.chapter4.annualProductionKWh,
    solarBlockerPreserved: true
  }, null, 2));
} finally {
  service.child.kill();
}
