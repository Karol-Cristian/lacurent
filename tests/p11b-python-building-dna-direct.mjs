import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  buildPhysicsEngineInputFromBuildingDna,
  calculateChapter2ForBuildingDna,
  compareEngineOutputs,
  createBuildingDnaFromAssistedAnswers,
  normalizePhysicsEngineOutputContract
} from "../src/building-platform/index.mjs";
import { createP1SeedMonthlyProfiles } from "../src/building-platform/tests/fixtures/p1SeedMonthlyProfiles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const PYTHON = process.env.PYTHON ?? "python";
const CASE_COUNT = Number(process.env.P11B_RANDOMIZED_CASES ?? 1000);
const SEED = 111_211;

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function range(random, min, max) {
  return min + (max - min) * random();
}

function stage(stageId, lossKWhPerMonth = 0, auxiliaryKWhPerMonth = 0, extra = {}) {
  return { stageId, lossKWhPerMonth, auxiliaryKWhPerMonth, ...extra };
}

function serviceSystem(systemId, stageIds, options = {}) {
  return {
    systemId,
    enabled: true,
    energyCarrier: options.energyCarrier ?? "natural_gas",
    generatorRef: options.generatorRef,
    allocationFraction: options.allocationFraction,
    generatorType: options.generatorType ?? "generic_generator",
    stages: stageIds.map((stageId, index) =>
      stage(stageId, options.losses?.[index] ?? 0, options.auxiliaries?.[index] ?? 0)
    )
  };
}

function systemsForBranch(branch, random, index) {
  const heatingStages = ["emission", "distribution", "storage", "generation"];
  const coolingStages = ["emission", "distribution", "storage", "generation"];
  const dhwStages = ["distribution", "storage", "generation"];
  const heating = {
    enabled: false,
    systems: []
  };
  const cooling = {
    enabled: false,
    systems: []
  };
  const domesticHotWater = {
    enabled: false,
    usefulDemandKWhPerMonth: 0,
    systems: []
  };
  const ventilationAhu = {
    enabled: false,
    systems: []
  };
  const sharedComponents = { generators: [] };

  if (branch === "heating_single" || branch === "storage_branch") {
    heating.enabled = true;
    heating.systems = [
      serviceSystem(`heating-${index}`, heatingStages, {
        energyCarrier: "natural_gas",
        losses: branch === "storage_branch" ? [1, 2, 3, 4] : [1, 2, 0, 3],
        auxiliaries: [0.1, 0.2, 0, 0.3]
      })
    ];
  }

  if (branch === "heating_parallel") {
    heating.enabled = true;
    heating.systems = [
      serviceSystem(`heating-${index}-a`, heatingStages, {
        energyCarrier: "natural_gas",
        allocationFraction: 0.6,
        losses: [1, 2, 0, 3],
        auxiliaries: [0.1, 0.2, 0, 0.3]
      }),
      serviceSystem(`heating-${index}-b`, heatingStages, {
        energyCarrier: "electricity",
        allocationFraction: 0.4,
        losses: [0.5, 1, 0, 1.5],
        auxiliaries: [0.05, 0.1, 0, 0.15]
      })
    ];
  }

  if (branch === "dhw" || branch === "shared_generator") {
    domesticHotWater.enabled = true;
    domesticHotWater.monthlyUsefulDemandKWh = Number(range(random, 35, 85).toFixed(6));
    domesticHotWater.usefulDemandKWhPerMonth = domesticHotWater.monthlyUsefulDemandKWh;
    domesticHotWater.systems = [
      serviceSystem(`dhw-${index}`, dhwStages, {
        energyCarrier: "natural_gas",
        generatorRef: branch === "shared_generator" ? "shared-boiler-1" : undefined,
        losses: [2, 1, 2],
        auxiliaries: [0.15, 0, 0.15]
      })
    ];
  }

  if (branch === "shared_generator") {
    heating.enabled = true;
    heating.systems = [
      serviceSystem(`heating-shared-${index}`, heatingStages, {
        energyCarrier: "natural_gas",
        generatorRef: "shared-boiler-1",
        losses: [1, 1, 0, 0],
        auxiliaries: [0.1, 0.1, 0, 0]
      })
    ];
    sharedComponents.generators = [
      {
        componentId: "shared-boiler-1",
        enabled: true,
        generatorType: "condensing_boiler",
        energyCarrier: "natural_gas",
        auxiliaryCarrier: "electricity",
        controlLossFactor: 1.03,
        operationHours: 120,
        lossPowerKW: 0.12,
        auxiliaryPowerKW: 0.025,
        recoveredAuxiliaryFraction: 0.2,
        auxiliaryRecoverableFractionToHeating: 0.5,
        lossRecoverableFractionToHeating: 0.3,
        boilerRoomRecoveryFactor: 0.1,
        renewableGeneratorHeatKWh: 0,
        dhwStorageOrDistributionLossKWh: 0,
        serviceAllocationFractions: { heating: 0.7, dhw: 0.3, domesticHotWater: 0.3 }
      }
    ];
  }

  if (branch === "cooling_single" || branch === "cooling_parallel") {
    cooling.enabled = true;
    cooling.systems = branch === "cooling_parallel"
      ? [
          serviceSystem(`cooling-${index}-a`, coolingStages, {
            energyCarrier: "electricity",
            allocationFraction: 0.55,
            losses: [0, 1.5, 0, 0],
            auxiliaries: [0, 0.4, 0, 0.7]
          }),
          serviceSystem(`cooling-${index}-b`, coolingStages, {
            energyCarrier: "electricity",
            allocationFraction: 0.45,
            losses: [0, 1, 0, 0],
            auxiliaries: [0, 0.2, 0, 0.5]
          })
        ]
      : [
          serviceSystem(`cooling-${index}`, coolingStages, {
            energyCarrier: "electricity",
            losses: [0, 1.5, 0, 0],
            auxiliaries: [0, 0.4, 0, 0.7]
          })
        ];
  }

  if (branch === "ventilation_ahu") {
    ventilationAhu.enabled = true;
    ventilationAhu.systems = [
      {
        systemId: `ahu-${index}`,
        enabled: true,
        fanElectricEnergyInput: {
          supplyAirFlowM3PerH: 300,
          supplyPressureDropPa: 220,
          supplyFanEfficiency: 0.55,
          extractAirFlowM3PerH: 280,
          extractPressureDropPa: 180,
          extractFanEfficiency: 0.5,
          calculationHours: 120
        },
        heatRecoveryAuxiliaryKWhPerMonth: 2,
        preheatAuxiliaryKWhPerMonth: 1,
        controlAuxiliaryKWhPerMonth: 0.5
      }
    ];
  }

  const systems = { heating, cooling, domesticHotWater, ventilationAhu };
  if (sharedComponents.generators.length) systems.sharedComponents = sharedComponents;
  return systems;
}

function buildDna(branch, random, index) {
  const monthlyProfiles = createP1SeedMonthlyProfiles().map((profile, monthIndex) => ({
    ...profile,
    internalGainsKwh: Number((profile.internalGainsKwh * range(random, 0.75, 1.25)).toFixed(6)),
    solarGainsKwh: Number((profile.solarGainsKwh * range(random, 0.75, 1.25)).toFixed(6)),
    ventilationAirFlowRateM3PerS: Number((profile.ventilationAirFlowRateM3PerS * range(random, 0.7, 1.3)).toFixed(9)),
    coolingOutdoorTemperatureC: Number((profile.coolingOutdoorTemperatureC + (monthIndex > 4 && monthIndex < 8 ? range(random, -1, 2) : 0)).toFixed(6))
  }));
  const result = createBuildingDnaFromAssistedAnswers({
    buildingId: `p11b-${branch}-${index}`,
    buildingType: "detached_house",
    constructionPeriod: index % 2 === 0 ? "1978_1990" : "after_2005",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: index % 3 === 0 ? "none" : "eps",
      windowsReplaced: index % 2 === 0
    },
    context: {
      attic: index % 2 === 0 ? "unheated" : "heated",
      basement: index % 4 === 0 ? "none" : "unheated"
    },
    source: { reference: "P11B.direct_building_dna_randomized" },
    monthlyProfiles,
    technicalSystems: systemsForBranch(branch, random, index),
    renewableSystems: {
      photovoltaic: branch === "pv"
        ? { enabled: true, annualProductionKWh: Number(range(random, 1200, 6500).toFixed(6)) }
        : { enabled: false }
    }
  });
  assert.equal(result.status, "ready", `Building DNA resolver blocked ${branch} #${index}: ${JSON.stringify(result)}`);
  const scale = range(random, 0.75, 1.4);
  for (const element of result.buildingDna.envelopeElements ?? []) {
    if (element?.area?.amount) element.area.amount = Number((element.area.amount * scale).toFixed(6));
  }
  if (branch === "solar_blocked") {
    result.buildingDna.calculationStatus = "source_backed_climate_provider";
    for (const profile of result.buildingDna.monthlyProfiles ?? []) {
      profile.heatGains.solarGainsSource = "provider_climate_profile_without_qsol_preprocessing";
    }
  }
  return result.buildingDna;
}

function jsChapter4Result(engineInput) {
  const pv = engineInput.renewables?.photovoltaic;
  if (!pv || pv.enabled === false) return { status: "not_applicable", annualProductionKWh: 0 };
  return { status: "calculated", annualProductionKWh: pv.annualProductionKWh ?? 0 };
}

function jsChapter3Result(jsRaw) {
  if (jsRaw.status !== "ready") return null;
  return jsRaw.chapter3Result ?? {
    status: "not_requested",
    annual: {
      heatingInputKWh: 0,
      coolingInputKWh: 0,
      coolingSuppliedUsefulKWh: 0,
      coolingUnmetLoadKWh: 0,
      dhwInputKWh: 0,
      ventilationAuxiliaryKWh: 0,
      sharedGeneratorFuelInputKWh: 0,
      sharedGeneratorLossKWh: 0,
      sharedGeneratorAuxiliaryKWh: 0
    },
    energyByCarrier: {}
  };
}

function runPythonBatch(engineInputs) {
  const tempPath = path.join(os.tmpdir(), `lacurent-p11b-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(tempPath, JSON.stringify(engineInputs), "utf8");
  try {
    const result = spawnSync(PYTHON, ["-m", "lacurent_engine.api.calculate", "--compact", tempPath], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        PYTHONPATH: path.join(REPO_ROOT, "python_engine")
      },
      maxBuffer: 64 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout.slice(0, 4000)}`);
    return JSON.parse(result.stdout).results;
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

const random = rng(SEED);
const branches = [
  "chapter2_only",
  "heating_single",
  "heating_parallel",
  "storage_branch",
  "dhw",
  "shared_generator",
  "cooling_single",
  "cooling_parallel",
  "ventilation_ahu",
  "pv",
  "solar_blocked"
];
const cases = Array.from({ length: CASE_COUNT }, (_, index) => {
  const branch = branches[index % branches.length];
  const buildingDna = buildDna(branch, random, index + 1);
  const engineInput = buildPhysicsEngineInputFromBuildingDna(buildingDna, { engineMode: "dual" });
  const jsRaw = calculateChapter2ForBuildingDna(buildingDna);
  const js = normalizePhysicsEngineOutputContract(
    { ...jsRaw, chapter3Result: jsChapter3Result(jsRaw), chapter4Result: jsChapter4Result(engineInput) },
    "javascript"
  );
  return { branch, engineInput, js };
});

const pythonResults = runPythonBatch(cases.map(item => item.engineInput));
assert.equal(pythonResults.length, cases.length);

const branchHits = Object.fromEntries(branches.map(branch => [branch, 0]));
const mismatches = [];
let comparedValues = 0;
let maxDifference = 0;

for (const [index, item] of cases.entries()) {
  branchHits[item.branch] += 1;
  const python = normalizePhysicsEngineOutputContract(pythonResults[index], "python");
  const comparison = compareEngineOutputs(item.js, python);
  comparedValues += comparison.comparisons.length;
  for (const row of comparison.comparisons) {
    if (Number.isFinite(row.absoluteDifference)) {
      maxDifference = Math.max(maxDifference, row.absoluteDifference);
    }
  }
  if (comparison.status !== "PASS") {
    mismatches.push({
      index,
      branch: item.branch,
      status: comparison.status,
      comparisons: comparison.comparisons.filter(row => row.status !== "PASS").slice(0, 6)
    });
  }
}

for (const branch of branches) {
  assert.ok(branchHits[branch] > 0, `branch not hit: ${branch}`);
}
assert.deepEqual(mismatches, []);

console.log(JSON.stringify({
  status: "PASS",
  seed: SEED,
  caseCount: CASE_COUNT,
  branchHits,
  comparedValues,
  maxDifference
}, null, 2));
