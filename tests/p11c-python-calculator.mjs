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

function stage(stageId, extra = {}) {
  return { stageId, lossKWhPerMonth: 0, auxiliaryKWhPerMonth: 0, ...extra };
}

function baseDna(id, technicalSystems, renewableSystems = { photovoltaic: { enabled: false } }) {
  const result = createBuildingDnaFromAssistedAnswers({
    buildingId: `p11c-${id}`,
    buildingType: "detached_house",
    constructionPeriod: "after_2005",
    structuralSystem: "masonry",
    renovations: { wallInsulation: "eps", windowsReplaced: true },
    context: { attic: "unheated", basement: "unheated" },
    source: { reference: "P11C.direct_building_dna_component_contract" },
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    technicalSystems,
    renewableSystems
  });
  assert.equal(result.status, "ready", JSON.stringify(result));
  return result.buildingDna;
}

function serviceSystem(systemId, stages, extra = {}) {
  return {
    systemId,
    enabled: true,
    energyCarrier: extra.energyCarrier ?? "natural_gas",
    generatorRef: extra.generatorRef,
    allocationFraction: extra.allocationFraction,
    generatorType: extra.generatorType ?? "generic_generator",
    stages
  };
}

function heatingComponentsCase() {
  const heatingStages = [
    stage("emission", {
      lossCalculation: {
        mode: "heating_emission_temperature_increase",
        increasedIndoorTemperatureK: 0.4,
        indoorTemperatureC: 20,
        combinedOutdoorTemperatureC: 0
      }
    }),
    stage("distribution", {
      auxiliaryCalculation: {
        mode: "heating_hydronic_pump_auxiliary",
        pressureDropInput: {
          componentResistanceFactor: 0.2,
          maxLinearPressureDropKPaPerM: 0.08,
          maxCircuitLengthM: 90,
          additionalPressureDropKPa: 12
        },
        designFlowRateM3PerH: 1.8,
        operationLoadFactor: 0.6,
        operationHours: 160,
        correctionFactor: 1,
        controlConstantCp1: 0.25,
        controlConstantCp2: 0.75,
        energyEfficiencyIndex: 0.23,
        recoverableFraction: 0.2
      }
    }),
    stage("storage", { lossCalculation: { mode: "no_heating_storage" } }),
    stage("generation", {
      lossCalculation: {
        mode: "heating_generator_loss_power_curve",
        operationHours: 160,
        nominalPowerKW: 120,
        intermediatePowerKW: 36,
        nominalLoadFactor: 1,
        lossPowerNominalKW: 0.9,
        lossPowerIntermediateKW: 0.35
      },
      auxiliaryCalculation: {
        mode: "heating_generator_auxiliary_power_curve",
        operationHours: 160,
        nominalPowerKW: 120,
        intermediatePowerKW: 36,
        auxiliaryPowerNominalKW: 0.25,
        auxiliaryPowerIntermediateKW: 0.12,
        auxiliaryPowerStandbyKW: 0.04,
        recoveredAuxiliaryFraction: 0.2,
        boilerRoomRecoveryFactor: 0.1
      }
    })
  ];
  return baseDna("heating-components", {
    heating: { enabled: true, systems: [serviceSystem("heating-components", heatingStages)] },
    cooling: { enabled: false, systems: [] },
    domesticHotWater: { enabled: false, systems: [] },
    ventilationAhu: { enabled: false, systems: [] }
  });
}

function heatingCoefficientCase() {
  const heatingStages = [
    stage("emission"),
    stage("distribution"),
    stage("storage", { lossCalculation: { mode: "no_heating_storage" } }),
    stage("generation", {
      lossCalculation: {
        mode: "heating_generator_standby_coefficients",
        operationHours: 180,
        nominalPowerKW: 80,
        coefficientC5: 12,
        coefficientC6: -0.4
      },
      auxiliaryCalculation: {
        mode: "heating_generator_auxiliary_coefficients",
        operationHours: 180,
        nominalPowerKW: 80,
        coefficientC7: 1.2,
        coefficientC8: 0.8,
        recoveredAuxiliaryFraction: 0.1,
        boilerRoomRecoveryFactor: 0.1
      }
    })
  ];
  return baseDna("heating-coefficients", {
    heating: { enabled: true, systems: [serviceSystem("heating-coefficients", heatingStages)] },
    cooling: { enabled: false, systems: [] },
    domesticHotWater: { enabled: false, systems: [] },
    ventilationAhu: { enabled: false, systems: [] }
  });
}

const pipe = {
  linearTransmittanceWPerMK: 0.22,
  thetaWMeanC: 50,
  thetaWAmbientC: 20,
  lengthM: 14,
  equivalentLengthM: 2
};

function dhwComponentsCase() {
  return baseDna("dhw-components", {
    heating: { enabled: false, systems: [] },
    cooling: { enabled: false, systems: [] },
    domesticHotWater: {
      enabled: true,
      monthlyUsefulDemandKWh: 65,
      usefulDemandKWhPerMonth: 65,
      systems: [
        serviceSystem("dhw-components", [
          stage("distribution", {
            lossCalculation: {
              mode: "dhw_distribution_loss_components",
              operationTimeHours: 120,
              distributionPipeSegments: [pipe],
              recoverablePipeSegments: [pipe]
            },
            auxiliaryCalculation: {
              mode: "dhw_recirculation_pump_auxiliary",
              pressureDropInput: {
                componentResistanceFactor: 0.15,
                maxLinearPressureDropKPaPerM: 0.05,
                maxCircuitLengthM: 40,
                additionalPressureDropKPa: 8
              },
              designFlowRateM3PerH: 1.2,
              operationLoadFactor: 0.5,
              operationTimeHours: 120,
              correctionFactor: 1,
              controlConstantCp1: 0.3,
              controlConstantCp2: 0.7,
              energyEfficiencyIndex: 0.23,
              recoverableFraction: 0.25
            }
          }),
          stage("storage", {
            lossCalculation: {
              mode: "dhw_storage_standing_loss_single_volume",
              accessibleStorageVolumeFactor: 0.9,
              distributionStorageLossFactor: 1.1,
              storageHeatTransferCoefficientWPerK: 3.4,
              storageSetpointTemperatureC: 55,
              storageAmbientTemperatureC: 20,
              calculationHours: 120
            }
          }),
          stage("generation")
        ])
      ]
    },
    ventilationAhu: { enabled: false, systems: [] }
  });
}

function coolingCompressionCase(nominalCoolingPowerKW = 4) {
  const dna = baseDna(`cooling-compression-${nominalCoolingPowerKW}`, {
    heating: { enabled: false, systems: [] },
    cooling: {
      enabled: true,
      systems: [
        serviceSystem("cooling-compression", [
          stage("emission"),
          stage("distribution", {
            lossCalculation: { mode: "cooling_distribution_factor", coolingLossFactor: 0.04 },
            auxiliaryCalculation: { mode: "cooling_distribution_factor", auxiliaryFactor: 0.015 }
          }),
          stage("storage", {
            lossCalculation: { mode: "no_cooling_storage" },
            auxiliaryCalculation: { mode: "no_cooling_storage" }
          }),
          stage("generation", {
            auxiliaryCalculation: {
              mode: "cooling_compression_heat_rejection_auxiliary",
              generatorInputRequirementMode: "air_water",
              auxiliaryHeatFraction: 0.2,
              operationHours: 80,
              nominalCoolingPowerKW,
              nominalEer: 3.2,
              eerCorrectionFactor: 1,
              heatRejectionPartLoadFactor: 1,
              freeCoolingFactor: 1,
              multipleGeneratorFactor: 1,
              heatRejectionAuxiliaryMode: "specific_electric_demand",
              heatRejectionSpecificElectricDemandKWPerKW: 0.02,
              heatRejectionElectricPartLoadFactor: 1,
              freeCoolingElectricFactor: 1,
              heatRejectionDistributionAuxiliaryMode: "specific_electric_demand",
              heatRejectionDistributionSpecificElectricDemandKWPerKW: 0.01,
              controlPowerKW: 0.004,
              allowCapacityLimitedGeneratorInput: true,
              unmetLoadPolicy: "report_unmet_load"
            }
          })
        ], { energyCarrier: "electricity" })
      ]
    },
    domesticHotWater: { enabled: false, systems: [] },
    ventilationAhu: { enabled: false, systems: [] }
  });
  for (const profile of dna.monthlyProfiles ?? []) {
    if (["june", "july", "august"].includes(profile.month)) {
      profile.transmission.cooling.outdoorTemperature.amount = 38;
      profile.ventilation.cooling.outdoorTemperature.amount = 38;
      profile.heatGains.internalGains.amount = 500;
      profile.heatGains.solarGains.amount = 900;
    }
  }
  return dna;
}

function coolingAbsorptionCase() {
  const dna = coolingCompressionCase(5);
  const generation = dna.technicalSystems.cooling.systems[0].stages.find(item => item.stageId === "generation");
  generation.auxiliaryCalculation = {
    ...generation.auxiliaryCalculation,
    mode: "cooling_absorption_heat_rejection_auxiliary",
    nominalHeatRatio: 0.72,
    partLoadValue: 0.9,
    absorptionHeatCarrier: "district_heat",
    auxiliaryCarrier: "electricity"
  };
  delete generation.auxiliaryCalculation.nominalEer;
  delete generation.auxiliaryCalculation.eerCorrectionFactor;
  return dna;
}

function sharedOperationTimeCase() {
  return baseDna("shared-operation-time", {
    heating: {
      enabled: true,
      systems: [
        serviceSystem("heating-shared", [
          stage("emission"),
          stage("distribution"),
          stage("storage", { lossCalculation: { mode: "no_heating_storage" } }),
          stage("generation")
        ], { generatorRef: "shared-boiler-operation-time" })
      ]
    },
    cooling: { enabled: false, systems: [] },
    domesticHotWater: {
      enabled: true,
      monthlyUsefulDemandKWh: 45,
      usefulDemandKWhPerMonth: 45,
      systems: [
        serviceSystem("dhw-shared", [stage("distribution"), stage("storage"), stage("generation")], {
          generatorRef: "shared-boiler-operation-time"
        })
      ]
    },
    ventilationAhu: { enabled: false, systems: [] },
    sharedComponents: {
      generators: [
        {
          componentId: "shared-boiler-operation-time",
          enabled: true,
          generatorType: "condensing_boiler",
          energyCarrier: "natural_gas",
          auxiliaryCarrier: "electricity",
          controlLossFactor: 1.05,
          operationTimeCalculation: {
            heatingUseHours: 200,
            heatingLoadFactor: 0.6,
            coolingUseHours: 10,
            coolingLoadFactor: 0.5,
            ventilationUseHours: 20,
            ventilationLoadFactor: 0.25,
            dhwUseHours: 20,
            dhwLoadFactor: 0.5
          },
          lossPowerKW: 0.2,
          auxiliaryPowerKW: 0.05,
          recoveredAuxiliaryFraction: 0.2,
          auxiliaryRecoverableFractionToHeating: 0.5,
          lossRecoverableFractionToHeating: 0.3,
          boilerRoomRecoveryFactor: 0.1,
          renewableGeneratorHeatKWh: 0,
          dhwStorageOrDistributionLossKWh: 0,
          serviceAllocationFractions: { heating: 0.65, dhw: 0.35, domesticHotWater: 0.35 }
        }
      ]
    }
  });
}

function ventilationContractsCase() {
  return baseDna("ventilation-contracts", {
    heating: { enabled: false, systems: [] },
    cooling: { enabled: false, systems: [] },
    domesticHotWater: { enabled: false, systems: [] },
    ventilationAhu: {
      enabled: true,
      systems: [
        {
          systemId: "ahu-contracts",
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
          heatRecoveryAuxiliaryCalculation: {
            mode: "pump_heat_recovery_auxiliary",
            outdoorAirFraction: 0.6,
            maxPumpSpecificPowerKWhPerM3: 0.00008,
            minimumPartLoadFactor: 0.2,
            recoveredHeatKWh: 50,
            maxRecoveredHeatPowerKW: 2
          },
          preheatAuxiliaryCalculation: {
            mode: "preheater_energy",
            airDensityKgPerM3: 1.2,
            airSpecificHeatKJPerKgK: 1.006,
            outdoorAirFraction: 0.7,
            frostProtectionTemperatureC: 3,
            outdoorTemperatureC: -5
          },
          controlAuxiliaryCalculation: {
            mode: "control_auxiliary_energy",
            controllerPowerKW: 0.015,
            operationFactor: 0.8
          },
          thermalRelationCalculations: {
            heatingCoil: {
              mode: "ahu_heating_coil_required_energy",
              airDensityKgPerM3: 1.2,
              airSpecificHeatKJPerKgK: 1.006,
              supplyAirFlowM3PerH: 3000,
              requiredSupplyTemperatureC: 20,
              humidificationTemperatureRiseK: 2,
              outdoorTemperatureC: -2,
              calculationHours: 1
            },
            maximumFlowFactorFromPartLoad: {
              mode: "maximum_flow_factor_from_part_load",
              partLoadFactor: 0.65,
              deltaFlowFactor: 0.05
            },
            partLoadAhuAirFlow: {
              mode: "part_load_ahu_air_flow",
              partLoadFactor: 0.65,
              nominalAirFlowM3PerH: 3000
            }
          }
        }
      ]
    }
  });
}

function jsChapter4Result(engineInput) {
  const pv = engineInput.renewables?.photovoltaic;
  if (!pv || pv.enabled === false) return { status: "not_applicable", annualProductionKWh: 0 };
  return { status: "calculated", annualProductionKWh: pv.annualProductionKWh ?? 0 };
}

function jsChapter3Result(jsRaw) {
  if (jsRaw.status !== "ready") return null;
  return jsRaw.chapter3Result;
}

function runPythonBatch(engineInputs) {
  const tempPath = path.join(os.tmpdir(), `lacurent-p11c-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(tempPath, JSON.stringify(engineInputs), "utf8");
  try {
    const result = spawnSync(PYTHON, ["-m", "lacurent_engine.api.calculate", tempPath], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, PYTHONPATH: path.join(REPO_ROOT, "python_engine") },
      maxBuffer: 64 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout.slice(0, 4000)}`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.engineVersion, "p11c.0");
    return parsed.results;
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

function runPublicCli(engineInput) {
  const tempPath = path.join(os.tmpdir(), `lacurent-p11c-cli-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(tempPath, JSON.stringify(engineInput), "utf8");
  try {
    const result = spawnSync(PYTHON, ["-m", "python_engine", "calculate", tempPath, "--compact"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024
    });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout.slice(0, 4000)}`);
    const parsed = JSON.parse(result.stdout);
    assert.equal(parsed.engine, "python");
    assert.equal(parsed.engineVersion, "p11c.0");
    assert.equal(parsed.status, "ready");
    assert.ok(Number.isFinite(parsed.chapter2.annual.qHndKWh));
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

const cases = [
  ["heating_components", heatingComponentsCase()],
  ["heating_c5_c8", heatingCoefficientCase()],
  ["dhw_components", dhwComponentsCase()],
  ["cooling_compression", coolingCompressionCase()],
  ["cooling_unmet", coolingCompressionCase(0.01)],
  ["cooling_absorption", coolingAbsorptionCase()],
  ["shared_operation_time", sharedOperationTimeCase()],
  ["ventilation_contracts", ventilationContractsCase()]
].map(([branch, buildingDna]) => {
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
runPublicCli(cases[0].engineInput);

const mismatches = [];
let maxDifference = 0;
for (const [index, item] of cases.entries()) {
  const rawPython = pythonResults[index];
  const python = normalizePhysicsEngineOutputContract(rawPython, "python");
  const comparison = compareEngineOutputs(item.js, python);
  for (const row of comparison.comparisons) {
    if (Number.isFinite(row.absoluteDifference)) {
      maxDifference = Math.max(maxDifference, row.absoluteDifference);
    }
  }
  if (comparison.status !== "PASS") {
    mismatches.push({
      branch: item.branch,
      comparisons: comparison.comparisons.filter(row => row.status !== "PASS").slice(0, 8)
    });
  }
  if (item.branch === "cooling_unmet") {
    assert.ok(
      rawPython.chapter3.annual.coolingUnmetLoadKWh > 0,
      `capacity-limited cooling must expose unmet load: ${JSON.stringify({ chapter2: rawPython.chapter2.annual, chapter3: rawPython.chapter3.annual })}`
    );
  }
  if (item.branch === "ventilation_contracts") {
    const thermal = rawPython.chapter3.monthly[0].ventilation.systemResults[0].thermalRelations;
    assert.ok(thermal.heatingCoilRequiredEnergy, "AHU thermal relation should be executed");
    assert.ok(thermal.maximumFlowFactorFromPartLoad, "AHU 3.92 relation should be executed");
    assert.ok(thermal.partLoadAhuAirFlow, "AHU 3.93 relation should be executed");
  }
}

assert.deepEqual(mismatches, []);

console.log(JSON.stringify({
  status: "PASS",
  caseCount: cases.length,
  branches: cases.map(item => item.branch),
  maxDifference
}, null, 2));
