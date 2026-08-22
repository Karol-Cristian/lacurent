import assert from "node:assert/strict";
import {
  CHAPTER3_INPUT_CLASSIFICATION,
  CHAPTER3_DHW_STAGE_IDS,
  CHAPTER3_INSTALLATIONS_PRODUCT_MAPPING_LEDGER,
  CHAPTER3_INSTALLATION_STAGE_IDS,
  TECHNICAL_SYSTEMS_SCHEMA,
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  buildBuildingPlatformVersionMetadata,
  buildBuildingTechnicalWorkspace,
  calculateChapter2ForBuildingDna,
  createBuildingDnaFromAssistedAnswers,
  createInMemoryVersionedBuildingBackend
} from "../index.mjs";
import { validateMc001ExecutionTrace } from "../../physics-engine/mc001ExecutionTrace.mjs";
import { createP1SeedMonthlyProfiles } from "./fixtures/p1SeedMonthlyProfiles.mjs";

const EPSILON = 1e-9;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function close(actual, expected, tolerance = EPSILON) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function stage(stageId, lossKWhPerMonth, auxiliaryKWhPerMonth = 0) {
  return {
    stageId,
    lossKWhPerMonth,
    auxiliaryKWhPerMonth,
    auxiliaryRecoveredFraction: 0,
    lossRecoveredFraction: 0,
    auxiliaryRecoverableFractionToHeating: 0,
    lossRecoverableFractionToHeating: 0
  };
}

function serviceSystem(systemId, stageIds, losses, auxiliaries = []) {
  return {
    systemId,
    enabled: true,
    servedScope: "whole_building",
    generatorType: "explicit_other",
    energyCarrier: "electricity",
    stages: stageIds.map((stageId, index) =>
      stage(stageId, losses[index] ?? 0, auxiliaries[index] ?? 0)
    )
  };
}

function withAllocation(system, allocationFraction) {
  return {
    ...system,
    allocationFraction
  };
}

function technicalSystems(overrides = {}) {
  return {
    schema: TECHNICAL_SYSTEMS_SCHEMA,
    source: {
      origin: "explicit_engineering_input",
      reference: "P4.test.installations"
    },
    heating: {
      enabled: true,
      systems: [
        {
          ...serviceSystem(
            "heating-main",
            CHAPTER3_INSTALLATION_STAGE_IDS,
            [1, 2, 0, 3],
            [0.1, 0.2, 0, 0.3]
          ),
          generatorType: "condensing_boiler",
          energyCarrier: "natural_gas"
        }
      ]
    },
    cooling: {
      enabled: true,
      systems: [
        {
          ...serviceSystem(
            "cooling-main",
            CHAPTER3_INSTALLATION_STAGE_IDS,
            [0.2, 0.4, 0.1, 1.3],
            [0.05, 0.05, 0.02, 0.1]
          ),
          generatorType: "split_system",
          energyCarrier: "electricity"
        }
      ]
    },
    ventilationAhu: {
      enabled: true,
      systems: [
        {
          systemId: "ventilation-ahu-main",
          enabled: true,
          fanElectricEnergyInput: {
            supplyAirFlowM3PerH: 300,
            supplyPressureDropPa: 220,
            supplyFanEfficiency: 0.55,
            extractAirFlowM3PerH: 280,
            extractPressureDropPa: 180,
            extractFanEfficiency: 0.55,
            calculationHours: 120
          },
          heatRecoveryAuxiliaryKWhPerMonth: 0.2,
          preheatAuxiliaryKWhPerMonth: 0.1,
          controlAuxiliaryKWhPerMonth: 0.05
        }
      ]
    },
    domesticHotWater: {
      enabled: true,
      monthlyUsefulDemandKWh: 50,
      systems: [
        {
          ...serviceSystem(
            "dhw-main",
            CHAPTER3_DHW_STAGE_IDS,
            [2, 1, 3],
            [0.1, 0.1, 0.2]
          ),
          energyCarrier: "natural_gas"
        }
      ]
    },
    coolingStoragePcm: {
      enabled: true,
      monthlyTemplate: {
        sensibleStorageTransformableEnergyKWh: 1.5,
        solidMassKg: 40,
        solidSpecificHeatKWhPerKgK: 0.000392,
        generatorOutletFlowTemperatureC: 32.755102040816325,
        transitionTemperatureC: 20,
        generatorOutletFlowDeltaK: 12.755102040816327,
        massDecreaseTransformableEnergyKWh: -0.5,
        latentHeatKWhPerKg: 0.0271,
        initialSolidMassKg: 20
      }
    },
    lighting: {
      enabled: true,
      totalAreaM2: 120,
      explicitMonthlyEnergyKWh: Array.from({ length: 12 }, () => 10),
      leniSubspaces: [
        {
          subspaceId: "whole-building",
          leniKWhPerM2Year: 10,
          areaM2: 120
        }
      ],
      boundaryStatus: "explicit_input_boundary_sr_en_15193_1"
    },
    ...overrides
  };
}

function assistedAnswers(overrides = {}) {
  return {
    buildingId: "p4-installations-reference",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: "eps",
      roofInsulated: false,
      floorInsulated: false,
      windowsReplaced: true
    },
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      heatedVolumeM3: 312,
      ventilationAch: 0.6,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationType: "mechanical_with_heat_recovery",
      atticContext: "unheated",
      basementContext: "none"
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    source: {
      reference: "P4.test.installations_product"
    },
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    technicalSystems: technicalSystems(),
    ...overrides
  };
}

await test("Chapter 3 product mapping ledger covers every exposed installation group", () => {
  const groups = CHAPTER3_INSTALLATIONS_PRODUCT_MAPPING_LEDGER.map(entry => entry.groupId);
  assert.deepEqual(groups, [
    "heating",
    "cooling",
    "ventilation_ahu",
    "domestic_hot_water",
    "cooling_storage_pcm",
    "lighting_explicit_leni_boundary"
  ]);
  for (const entry of CHAPTER3_INSTALLATIONS_PRODUCT_MAPPING_LEDGER) {
    assert.ok(entry.runtimeModule.includes("mc001Chapter3IntegratedRuntime"));
    assert.ok(entry.uiSection.startsWith("installations."));
    assert.ok(entry.persistencePath.startsWith("buildingDna.technicalSystems."));
    assert.ok(entry.reportSection.startsWith("instalatii_capitolul_3"));
    assert.equal(entry.testFixture, "buildingChapter3InstallationsProduct.test.mjs");
  }
  const lighting = CHAPTER3_INSTALLATIONS_PRODUCT_MAPPING_LEDGER.find(
    entry => entry.groupId === "lighting_explicit_leni_boundary"
  );
  assert.ok(lighting.limitation.includes("SR EN 15193-1"));
});

await test("Chapter 3 installations flow reaches Building DNA, runtime, report and versioned backend", () => {
  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers());
  assert.equal(pipeline.status, "ready");
  assert.equal(pipeline.buildingDna.technicalSystems.schema, TECHNICAL_SYSTEMS_SCHEMA);
  assert.equal(pipeline.calculation.stage, "chapter_2_and_3_complete");
  assert.equal(pipeline.calculation.chapter3Result.status, "calculated");

  const chapter2AnnualQHnd = pipeline.calculation.chapter2Result.result.annualQHnd;
  const chapter2AnnualQCnd = pipeline.calculation.chapter2Result.result.annualQCnd;
  close(pipeline.calculation.chapter3Result.annual.heatingInputKWh, chapter2AnnualQHnd + 72);
  close(pipeline.calculation.chapter3Result.annual.coolingInputKWh, chapter2AnnualQCnd + 24);
  close(pipeline.calculation.chapter3Result.annual.dhwInputKWh, 672);
  close(pipeline.calculation.chapter3Result.annual.lightingEnergyKWh, 120);
  assert.ok(pipeline.calculation.chapter3Result.annual.ventilationAuxiliaryKWh > 0);
  assert.ok(pipeline.calculation.chapter3Result.formulaReferences.includes("MC001_3_111_COOLING_STORAGE_PCM_SENSIBLE_SOLID_STORAGE_ENERGY"));

  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  assert.equal(workspace.installations.status, "ready");
  assert.equal(workspace.installations.monthly.length, 12);
  assert.ok(workspace.report.chapters.some(chapter => chapter.chapterId === "instalatii_capitolul_3"));
  assert.ok(workspace.engineeringNotebook.sections.some(section => section.sectionId === "chapter3.annual"));

  const metadata = buildBuildingPlatformVersionMetadata({
    buildingDna: pipeline.buildingDna,
    calculation: pipeline.calculation
  });
  assert.equal(metadata.chapter3AdapterVersion, "building_chapter_3_installations_adapter_p8e_v1");
  assert.ok(metadata.chapter3RuntimeVersion);

  const backend = createInMemoryVersionedBuildingBackend();
  const saved = backend.saveAndCalculate({
    ownerUserId: "p4-owner",
    projectName: "P4 installations reference",
    buildingDna: pipeline.buildingDna,
    idempotencyKey: "p4-save-1"
  });
  assert.equal(saved.ok, true);
  assert.equal(saved.analysisVersion.complete_engine_output.chapter3Result.status, "calculated");
  assert.equal(saved.reportVersion.structured_report_model.mainResults.installations.dhwInputKWh, 672);
  const reopened = backend.reopenProject({
    ownerUserId: "p4-owner",
    projectId: saved.project.project_id
  });
  assert.equal(reopened.ok, true);
  assert.deepEqual(
    reopened.buildingDnaVersion.complete_building_dna.technicalSystems,
    pipeline.buildingDna.technicalSystems
  );
  assert.deepEqual(
    reopened.analysisVersion.complete_engine_output.chapter3Result.annual,
    saved.analysisVersion.complete_engine_output.chapter3Result.annual
  );
});

await test("DHW useful demand can be calculated normatively from residential Building DNA inputs", () => {
  const calculatedDhw = technicalSystems();
  calculatedDhw.domesticHotWater.monthlyUsefulDemandKWh = undefined;
  calculatedDhw.domesticHotWater.usefulDemandSource = {
    mode: "residential_normative",
    dwellingType: "single_family_or_terraced",
    source: {
      origin: "building_dna_derived",
      reference: "buildingDna.geometry.usefulFloorAreaM2"
    }
  };
  calculatedDhw.cooling.enabled = false;
  calculatedDhw.cooling.systems = [];
  calculatedDhw.ventilationAhu.enabled = false;
  calculatedDhw.ventilationAhu.systems = [];
  calculatedDhw.coolingStoragePcm.enabled = false;
  calculatedDhw.lighting.enabled = false;
  calculatedDhw.lighting.explicitMonthlyEnergyKWh = [];
  calculatedDhw.lighting.leniSubspaces = [];

  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: calculatedDhw })
  );

  assert.equal(pipeline.status, "ready");
  assert.equal(pipeline.calculation.chapter3Result.status, "calculated");
  const januaryDhw = pipeline.calculation.chapter3Result.monthly[0].dhw;
  const februaryDhw = pipeline.calculation.chapter3Result.monthly[1].dhw;
  assert.equal(
    januaryDhw.usefulDemandSource.classification,
    CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
  );
  assert.equal(
    pipeline.calculation.chapter3Input.months[0].dhw.usefulDemandSource.classification,
    CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
  );
  assert.ok(januaryDhw.usefulDemandSource.formulaIds.includes("MC001_3_188_DHW_USEFUL_ENERGY"));
  assert.equal(
    validateMc001ExecutionTrace(januaryDhw.usefulDemandSource.executionTrace).ok,
    true
  );

  const equivalentConsumers = 1.75 + 0.3 * (0.025 * 120 - 1.75);
  const specificNormative = Math.min(40.71, 3.26 * 120 / equivalentConsumers);
  const correctedSpecific = specificNormative * ((60 - 13.5) / (45 - 10));
  const dailyVolume = correctedSpecific * equivalentConsumers;
  const januaryExpectedUseful =
    dailyVolume * 31 * (4.186 / 3600) * 1000 * (45 - 10) / 1000;
  const februaryExpectedUseful =
    dailyVolume * 28 * (4.186 / 3600) * 1000 * (45 - 10) / 1000;

  close(januaryDhw.usefulDemandKWh, januaryExpectedUseful, 1e-9);
  close(februaryDhw.usefulDemandKWh, februaryExpectedUseful, 1e-9);
  close(
    januaryDhw.finalStageInputKWh,
    januaryExpectedUseful + 6,
    1e-9
  );
  assert.equal(
    pipeline.calculation.chapter3Result.formulaReferences.includes("MC001_3_188_DHW_USEFUL_ENERGY"),
    true
  );

  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  const dhwRow = workspace.installations.rows.find(
    row => row.service === "Apa calda de consum"
  );
  assert.equal(dhwRow.status, "calculat normativ");
  assert.ok(
    workspace.engineeringNotebook.sections
      .find(section => section.sectionId === "chapter3.month.january")
      .lines.some(line => line.lineId === "january.dhw.useful" && line.text.includes("calculat normativ"))
  );
});

await test("DHW useful demand preserves explicit boundary provenance for old saved projects", () => {
  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers());
  const januaryDhw = pipeline.calculation.chapter3Result.monthly[0].dhw;
  assert.equal(
    januaryDhw.usefulDemandSource.classification,
    CHAPTER3_INPUT_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY
  );
  assert.equal(januaryDhw.usefulDemandSource.productionEligible, false);
  assert.equal(januaryDhw.usefulDemandKWh, 50);
});

await test("DHW useful demand can be calculated from MC001 Tabel 3.3.1 source rows", () => {
  const systems = technicalSystems();
  systems.domesticHotWater.monthlyUsefulDemandKWh = undefined;
  systems.domesticHotWater.usefulDemandSource = {
    mode: "table_3_3_1",
    tableEntryId: "birouri_functionar_schimb",
    unitCount: 12
  };
  systems.heating.enabled = false;
  systems.heating.systems = [];
  systems.cooling.enabled = false;
  systems.cooling.systems = [];
  systems.ventilationAhu.enabled = false;
  systems.ventilationAhu.systems = [];
  systems.coolingStoragePcm.enabled = false;
  systems.lighting.enabled = false;
  systems.lighting.explicitMonthlyEnergyKWh = [];
  systems.lighting.leniSubspaces = [];

  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: systems })
  );

  assert.equal(pipeline.status, "ready");
  const januaryDhw = pipeline.calculation.chapter3Result.monthly[0].dhw;
  assert.equal(
    januaryDhw.usefulDemandSource.classification,
    CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
  );
  assert.ok(januaryDhw.usefulDemandSource.formulaIds.includes("MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL"));
  assert.ok(januaryDhw.usefulDemandSource.formulaIds.includes("MC001_3_191_DHW_VOLUME_TEMPERATURE_CORRECTION"));

  const correctedDailyVolume = 5 * (60 - 10) / (45 - 10) * 12;
  const januaryExpectedUseful =
    correctedDailyVolume * 31 * (4.186 / 3600) * 1000 * (45 - 10) / 1000;
  close(januaryDhw.usefulDemandKWh, januaryExpectedUseful, 1e-9);
});

await test("DHW distribution and storage component contracts calculate stage losses and auxiliaries", () => {
  const systems = technicalSystems();
  systems.heating.enabled = false;
  systems.heating.systems = [];
  systems.cooling.enabled = false;
  systems.cooling.systems = [];
  systems.ventilationAhu.enabled = false;
  systems.ventilationAhu.systems = [];
  systems.coolingStoragePcm.enabled = false;
  systems.lighting.enabled = false;
  systems.lighting.explicitMonthlyEnergyKWh = [];
  systems.lighting.leniSubspaces = [];
  systems.domesticHotWater.monthlyUsefulDemandKWh = 50;
  systems.domesticHotWater.systems = [
    {
      systemId: "dhw-component-contract",
      enabled: true,
      servedScope: "whole_building",
      energyCarrier: "natural_gas",
      generatorType: "explicit_other",
      stages: [
        {
          stageId: "distribution",
          lossCalculation: {
            mode: "dhw_distribution_loss_components",
            operationTimeHours: 100,
            distributionPipeSegments: [
              {
                linearTransmittanceInput: {
                  mode: "insulated_pipe",
                  innerDiameterM: 0.02,
                  outerDiameterM: 0.04,
                  insulationThermalConductivityWPerMK: 0.04,
                  externalHeatTransferCoefficientWPerM2K: 8
                },
                meanTemperatureInput: {
                  thetaWDistributionC: 55,
                  deltaThetaWLoopK: 10
                },
                thetaWAmbientC: 20,
                lengthM: 10,
                equivalentLengthM: 2
              }
            ],
            recoverablePipeSegments: [
              {
                linearTransmittanceInput: {
                  mode: "insulated_pipe",
                  innerDiameterM: 0.02,
                  outerDiameterM: 0.04,
                  insulationThermalConductivityWPerMK: 0.04,
                  externalHeatTransferCoefficientWPerM2K: 8
                },
                meanTemperatureInput: {
                  thetaWDistributionC: 55,
                  deltaThetaWLoopK: 10
                },
                thetaWAmbientC: 20,
                lengthM: 4,
                equivalentLengthM: 0
              }
            ]
          },
          auxiliaryCalculation: {
            mode: "dhw_recirculation_pump_auxiliary",
            pressureDropInput: {
              componentResistanceFactor: 0.2,
              maxLinearPressureDropKPaPerM: 0.03,
              maxCircuitLengthM: 40,
              additionalPressureDropKPa: 4
            },
            designFlowRateM3PerH: 0.8,
            operationLoadFactor: 0.5,
            operationTimeHours: 100,
            correctionFactor: 1.1,
            controlConstantCp1: 0.25,
            controlConstantCp2: 0.75,
            energyEfficiencyIndex: 0.23,
            recoverableFraction: 0.4
          },
          auxiliaryRecoveredFraction: 0
        },
        {
          stageId: "storage",
          lossCalculation: {
            mode: "dhw_storage_standing_loss_single_volume",
            accessibleStorageVolumeFactor: 0.8,
            distributionStorageLossFactor: 1.1,
            storageHeatTransferCoefficientWPerK: 3,
            storageSetpointTemperatureC: 55,
            storageAmbientTemperatureC: 20,
            calculationHours: 744
          },
          auxiliaryKWhPerMonth: 0
        },
        {
          stageId: "generation",
          lossKWhPerMonth: 3,
          auxiliaryKWhPerMonth: 0.2,
          auxiliaryRecoveredFraction: 0,
          lossRecoveredFraction: 0,
          auxiliaryRecoverableFractionToHeating: 0,
          lossRecoverableFractionToHeating: 0
        }
      ]
    }
  ];

  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: systems })
  );
  assert.equal(pipeline.status, "ready");
  const januaryDhw = pipeline.calculation.chapter3Result.monthly[0].dhw;
  const distribution = januaryDhw.stageResults.find(stageResult => stageResult.stageId === "distribution");
  const storage = januaryDhw.stageResults.find(stageResult => stageResult.stageId === "storage");

  const psi =
    Math.PI /
    ((1 / (2 * 0.04)) * Math.log(0.04 / 0.02) + 1 / (8 * 0.04));
  const distributionLossExpected = psi * (50 - 20) * (10 + 2) * 100 / 1000;
  const recoverableLossExpected = psi * (50 - 20) * 4 * 100 / 1000;
  const recoveryFactorExpected = recoverableLossExpected / distributionLossExpected;
  const pressureDropExpected = (1 + 0.2) * 0.03 * 40 + 4;
  const designPowerExpected = pressureDropExpected * 0.8 / 3600;
  const referencePowerExpected =
    (1.7 * designPowerExpected +
      17 * (1 - Math.exp(-0.3 * designPowerExpected))) *
    10 ** -3;
  const efficiencyFactorExpected = referencePowerExpected / designPowerExpected;
  const pumpEnergyUseFactorExpected =
    efficiencyFactorExpected * (0.25 + 0.75 * 0.5 ** -1) * 0.23 / 0.25;
  const pumpEnergyExpected = designPowerExpected * 0.5 * 100 * 1.1;
  const auxiliaryExpected = pumpEnergyExpected * pumpEnergyUseFactorExpected;
  const storageLossExpected = 0.8 * 1.1 * (3 / 1000) * (55 - 20) * 744;

  close(distribution.lossKWh, distributionLossExpected, 1e-9);
  close(distribution.auxiliaryKWh, auxiliaryExpected, 1e-12);
  close(distribution.inputEnergy.recoveredLossKWh, recoverableLossExpected, 1e-9);
  close(distribution.recoverableEnergy.valueKWh, recoverableLossExpected + auxiliaryExpected * 0.4, 1e-9);
  close(storage.lossKWh, storageLossExpected, 1e-9);
  close(
    januaryDhw.finalStageInputKWh,
    50 + distributionLossExpected - recoverableLossExpected + storageLossExpected + 3,
    1e-9
  );
  assert.equal(
    distribution.lossSource.classification,
    CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
  );
  assert.ok(
    distribution.lossSource.formulaIds.includes("MC001_3_201_DHW_LINEAR_TRANSMITTANCE_INSULATED_PIPE")
  );
  assert.ok(
    distribution.lossSource.formulaIds.includes("MC001_3_213_DHW_TOTAL_DISTRIBUTION_LOSS")
  );
  assert.ok(
    distribution.auxiliarySource.formulaIds.includes("MC001_3_223_DHW_REFERENCE_PUMP_POWER")
  );
  assert.equal(
    storage.lossSource.formulaIds.includes("MC001_3_228_DHW_STORAGE_STANDING_LOSS_SINGLE_VOLUME"),
    true
  );

  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  assert.ok(JSON.stringify(workspace.report).includes("calculat normativ"));
  assert.ok(JSON.stringify(workspace.engineeringNotebook).includes("calculat normativ"));
});

await test("heating component contracts calculate emission, pump and generator stages", () => {
  const systems = technicalSystems();
  systems.cooling.enabled = false;
  systems.cooling.systems = [];
  systems.ventilationAhu.enabled = false;
  systems.ventilationAhu.systems = [];
  systems.domesticHotWater.enabled = false;
  systems.domesticHotWater.systems = [];
  systems.coolingStoragePcm.enabled = false;
  systems.lighting.enabled = false;
  systems.lighting.explicitMonthlyEnergyKWh = [];
  systems.lighting.leniSubspaces = [];
  systems.heating.systems = [
    {
      systemId: "heating-component-contract",
      enabled: true,
      servedScope: "whole_building",
      generatorType: "condensing_boiler",
      energyCarrier: "natural_gas",
      stages: [
        {
          stageId: "emission",
          lossCalculation: {
            mode: "heating_emission_temperature_increase",
            increasedIndoorTemperatureK: 1.25,
            indoorTemperatureC: 20,
            combinedOutdoorTemperatureC: -5
          },
          auxiliaryKWhPerMonth: 0,
          auxiliaryRecoveredFraction: 0,
          lossRecoveredFraction: 0,
          auxiliaryRecoverableFractionToHeating: 0,
          lossRecoverableFractionToHeating: 0
        },
        {
          stageId: "distribution",
          lossKWhPerMonth: 2,
          auxiliaryCalculation: {
            mode: "heating_hydronic_pump_auxiliary",
            pressureDropInput: {
              componentResistanceFactor: 0.2,
              maxLinearPressureDropKPaPerM: 0.05,
              maxCircuitLengthM: 35,
              additionalPressureDropKPa: 6
            },
            designFlowRateM3PerH: 1.6,
            operationLoadFactor: 0.5,
            operationHours: 120,
            correctionFactor: 1.1,
            controlConstantCp1: 0.25,
            controlConstantCp2: 0.75,
            energyEfficiencyIndex: 0.23,
            recoverableFraction: 0.3,
            setbackPumpPowerKW: 0.03,
            setbackCalculationHours: 40,
            boostCalculationHours: 5
          },
          auxiliaryRecoveredFraction: 0,
          lossRecoveredFraction: 0,
          lossRecoverableFractionToHeating: 0
        },
        {
          stageId: "storage",
          lossCalculation: {
            mode: "no_heating_storage"
          },
          auxiliaryKWhPerMonth: 0,
          auxiliaryRecoveredFraction: 0,
          lossRecoveredFraction: 0,
          auxiliaryRecoverableFractionToHeating: 0,
          lossRecoverableFractionToHeating: 0
        },
        {
          stageId: "generation",
          lossCalculation: {
            mode: "heating_generator_loss_power_curve",
            nominalPowerKW: 24,
            intermediatePowerKW: 8,
            nominalLoadFactor: 1,
            operationHours: 120,
            lossPowerNominalKW: 1.2,
            lossPowerIntermediateKW: 0.4,
            envelopeLossFractionPercent: 1.5,
            chimneyOffLossFractionPercent: 0.5,
            generatorDeliveredPowerKW: 24,
            envelopeLossFraction: 0.2,
            boilerRoomRecoveryFactor: 0.1
          },
          auxiliaryCalculation: {
            mode: "heating_generator_auxiliary_power_curve",
            nominalPowerKW: 24,
            intermediatePowerKW: 8,
            operationHours: 120,
            auxiliaryPowerStandbyKW: 0.02,
            auxiliaryPowerIntermediateKW: 0.08,
            auxiliaryPowerNominalKW: 0.12,
            recoveredAuxiliaryFraction: 0.25,
            boilerRoomRecoveryFactor: 0.1
          }
        }
      ]
    }
  ];

  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: systems })
  );
  assert.equal(pipeline.status, "ready");
  const januaryHeating = pipeline.calculation.chapter3Result.monthly[0].heating;
  const emission = januaryHeating.stageResults.find(stageResult => stageResult.stageId === "emission");
  const distribution = januaryHeating.stageResults.find(stageResult => stageResult.stageId === "distribution");
  const storage = januaryHeating.stageResults.find(stageResult => stageResult.stageId === "storage");
  const generation = januaryHeating.stageResults.find(stageResult => stageResult.stageId === "generation");

  const qHnd = januaryHeating.usefulDemandKWh;
  const emissionLossExpected = qHnd * 1.25 / 25;
  const pressureDrop = (1 + 0.2) * 0.05 * 35 + 6;
  const designPower = pressureDrop * 1.6 / 3600;
  const referencePower =
    (1.7 * designPower + 17 * (1 - Math.exp(-0.3 * designPower))) * 10 ** -3;
  const pumpEfficiencyFactor = referencePower / designPower;
  const pumpUseFactor = pumpEfficiencyFactor * (0.25 + 0.75 * 0.5 ** -1) * 0.23 / 0.25;
  const hydronicAuxiliaryExpected = designPower * 0.5 * 120 * 1.1 * pumpUseFactor;
  const setbackAuxiliaryExpected = 0.3 * 0.03 * 40;
  const boostAuxiliaryExpected = 3.3 * designPower * 5;
  const pumpAuxiliaryExpected =
    hydronicAuxiliaryExpected + setbackAuxiliaryExpected + boostAuxiliaryExpected;
  const generatorOutput = qHnd + emissionLossExpected + 2;
  const generatorLoad = generatorOutput / (24 * 120);
  const betaPint = 8 / 24;
  const generatorLossPower = generatorLoad <= betaPint
    ? generatorLoad / betaPint * (1.2 - 0.4) + 0.4
    : ((generatorLoad - betaPint) / (1 - betaPint)) * (1.2 - 0.4) + 0.4;
  const generatorLossExpected = generatorLossPower * 120;
  const standbyLossPower = ((1.5 + 0.5) / 100) * 24;
  const recoverableEnvelopeLossExpected = standbyLossPower * (1 - 0.1) * 0.2 * 120;
  const generatorAuxPower = generatorLoad <= betaPint
    ? generatorLoad / betaPint * (0.08 - 0.02) + 0.02
    : ((generatorLoad - betaPint) / (1 - betaPint)) * (0.12 - 0.08) + 0.08;
  const generatorAuxExpected = generatorAuxPower * 120;

  close(emission.lossKWh, emissionLossExpected, 1e-9);
  close(distribution.auxiliaryKWh, pumpAuxiliaryExpected, 1e-12);
  close(storage.lossKWh, 0);
  close(generation.lossKWh, generatorLossExpected, 1e-9);
  close(generation.auxiliaryKWh, generatorAuxExpected, 1e-9);
  close(
    januaryHeating.finalStageInputKWh,
    generatorOutput + generatorLossExpected - generatorAuxExpected * 0.25,
    1e-9
  );
  assert.equal(emission.lossSource.classification, CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED);
  assert.ok(emission.lossSource.formulaIds.includes("MC001_3_1_HEATING_EMISSION_LOSS"));
  assert.ok(distribution.auxiliarySource.formulaIds.includes("MC001_3_7_HEATING_DISTRIBUTION_AUXILIARY_ENERGY"));
  assert.ok(distribution.auxiliarySource.formulaIds.includes("MC001_3_11_HEATING_DISTRIBUTION_SETBACK_PUMP_ENERGY"));
  assert.ok(distribution.auxiliarySource.formulaIds.includes("MC001_3_12_HEATING_DISTRIBUTION_BOOST_PUMP_ENERGY"));
  assert.ok(generation.lossSource.formulaIds.includes("MC001_3_17_HEATING_GENERATOR_STANDBY_LOSS_POWER"));
  assert.ok(generation.lossSource.formulaIds.includes("MC001_3_27_HEATING_GENERATOR_LOSS_ENERGY"));
  assert.ok(generation.lossSource.formulaIds.includes("MC001_3_29_HEATING_GENERATOR_ENVELOPE_RECOVERABLE_LOSS"));
  assert.ok(generation.auxiliarySource.formulaIds.includes("MC001_3_37_HEATING_GENERATOR_AUXILIARY_ENERGY"));

  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  assert.ok(JSON.stringify(workspace.report).includes("calculat normativ"));
  assert.ok(JSON.stringify(workspace.engineeringNotebook).includes("MC001_3_29_HEATING_GENERATOR_ENVELOPE_RECOVERABLE_LOSS"));
});

await test("ventilation auxiliary component contracts calculate heat recovery, preheat and control values", () => {
  const systems = technicalSystems();
  systems.heating.enabled = false;
  systems.heating.systems = [];
  systems.cooling.enabled = false;
  systems.cooling.systems = [];
  systems.domesticHotWater.enabled = false;
  systems.domesticHotWater.systems = [];
  systems.coolingStoragePcm.enabled = false;
  systems.lighting.enabled = false;
  systems.lighting.explicitMonthlyEnergyKWh = [];
  systems.lighting.leniSubspaces = [];
  systems.ventilationAhu.systems = [
    {
      systemId: "ventilation-component-contract",
      enabled: true,
      fanElectricEnergyInput: {
        supplyAirFlowM3PerH: 300,
        supplyPressureDropPa: 220,
        supplyFanEfficiency: 0.55,
        extractAirFlowM3PerH: 280,
        extractPressureDropPa: 180,
        extractFanEfficiency: 0.55,
        calculationHours: 120
      },
      heatRecoveryAuxiliaryCalculation: {
        mode: "rotary_heat_recovery_auxiliary",
        maxRotaryPowerKW: 0.1,
        calculationHours: 120,
        rotationRatio: 0.5
      },
      preheatAuxiliaryCalculation: {
        mode: "no_preheater"
      },
      controlAuxiliaryCalculation: {
        mode: "control_auxiliary_energy",
        controllerPowerKW: 0.02,
        operationFactor: 0.5,
        calculationHours: 120
      }
    }
  ];

  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: systems })
  );
  assert.equal(pipeline.status, "ready");
  const januaryVentilation = pipeline.calculation.chapter3Result.monthly[0].ventilation;
  const fanExpected =
    (300 * 220 / 0.55 + 280 * 180 / 0.55) * 120 / (3.6 * 10 ** 6);
  const heatRecoveryExpected = 0.1 * 120 * 0.5;
  const controlExpected = 0.02 * 0.5 * 120;

  close(januaryVentilation.fanElectricEnergy.valueKWh, fanExpected, 1e-12);
  close(januaryVentilation.valueKWh, fanExpected + heatRecoveryExpected + controlExpected, 1e-12);
  assert.equal(
    januaryVentilation.sources.heatRecoveryAuxiliary.classification,
    CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
  );
  assert.ok(
    januaryVentilation.sources.heatRecoveryAuxiliary.formulaIds.includes(
      "MC001_3_69_ROTARY_HEAT_RECOVERY_AUXILIARY_ENERGY"
    )
  );
  assert.ok(
    januaryVentilation.sources.controlAuxiliary.formulaIds.includes(
      "MC001_3_75_VENTILATION_CONTROL_AUXILIARY_ENERGY"
    )
  );
});

await test("cooling component contracts calculate distribution, storage and heat-rejection auxiliaries", () => {
  const systems = technicalSystems();
  systems.heating.enabled = false;
  systems.heating.systems = [];
  systems.ventilationAhu.enabled = false;
  systems.ventilationAhu.systems = [];
  systems.domesticHotWater.enabled = false;
  systems.domesticHotWater.systems = [];
  systems.coolingStoragePcm.enabled = false;
  systems.lighting.enabled = false;
  systems.lighting.explicitMonthlyEnergyKWh = [];
  systems.lighting.leniSubspaces = [];
  systems.cooling.systems = [
    {
      systemId: "cooling-component-contract",
      enabled: true,
      generatorType: "chiller",
      energyCarrier: "electricity",
      stages: [
        stage("emission", 1, 0),
        {
          stageId: "distribution",
          lossCalculation: {
            mode: "cooling_distribution_factor",
            coolingLossFactor: 0.05,
            ahuCoolingOutputRequiredKWh: 2
          },
          auxiliaryCalculation: {
            mode: "cooling_distribution_factor",
            auxiliaryFactor: 0.02,
            ahuCoolingOutputRequiredKWh: 2
          },
          auxiliaryRecoveredFraction: 0,
          lossRecoveredFraction: 0,
          auxiliaryRecoverableFractionToHeating: 0,
          lossRecoverableFractionToHeating: 0
        },
        {
          stageId: "storage",
          lossCalculation: {
            mode: "cooling_storage_thermal_losses",
            outputSideHeatLossCoefficientKWPerK: 0.01,
            standbyHeatLossCoefficientKWPerK: 0.01,
            inputSideHeatLossCoefficientKWPerK: 0.01,
            ambientTemperatureC: 30,
            storageTemperatureC: 10,
            calculationHours: 100,
            recoverableStorageFraction: 0.25
          },
          auxiliaryCalculation: {
            mode: "cooling_storage_pump_auxiliary",
            pumpVolumeFlowM3PerH: 2,
            pumpElectricPowerKW: 0.1,
            supplyTemperatureC: 6,
            returnTemperatureC: 11,
            mediumSpecificHeatKWhPerKgK: 0.00116,
            mediumDensityKgPerM3: 1000,
            recoverableAuxiliaryFraction: 0.2
          },
          auxiliaryRecoveredFraction: 0,
          lossRecoveredFraction: 0,
          auxiliaryRecoverableFractionToHeating: 0,
          lossRecoverableFractionToHeating: 0
        },
        {
          stageId: "generation",
          lossKWhPerMonth: 0,
          auxiliaryCalculation: {
            mode: "cooling_compression_heat_rejection_auxiliary",
            operationHours: 240,
            nominalCoolingPowerKW: 20,
            nominalEer: 3,
            eerCorrectionInput: {
              absoluteZeroOffsetK: 273.15,
              generatorRequiredOutletTemperatureC: 7,
              heatRejectionReferenceInletTemperatureC: 35,
              nominalGeneratorOutletTemperatureC: 7,
              nominalHeatRejectionInletTemperatureC: 35,
              evaporatorTemperatureDifferenceK: 5,
              condenserTemperatureDifferenceK: 5
            },
            heatRejectionAuxiliaryMode: "specific_electric_demand",
            heatRejectionSpecificDemandKey: "wet_closed_axial_no_extra_silencer",
            heatRejectionElectricPartLoadControlKey: "variable_water_temperature",
            heatRejectionElectricPartLoadTypeKey: "wet_or_hybrid_wet",
            freeCoolingElectricFactor: 1,
            heatRejectionDistributionAuxiliaryMode: "specific_electric_demand",
            heatRejectionDistributionSpecificElectricDemandKWPerKW: 0.003,
            controlPowersKW: [0.02]
          },
          auxiliaryRecoveredFraction: 0.1,
          lossRecoveredFraction: 0,
          auxiliaryRecoverableFractionToHeating: 0,
          lossRecoverableFractionToHeating: 0
        }
      ]
    }
  ];

  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: systems })
  );
  assert.equal(pipeline.status, "ready");
  const januaryCooling = pipeline.calculation.chapter3Result.monthly[0].cooling;
  const emission = januaryCooling.stageResults.find(stageResult => stageResult.stageId === "emission");
  const distribution = januaryCooling.stageResults.find(stageResult => stageResult.stageId === "distribution");
  const storage = januaryCooling.stageResults.find(stageResult => stageResult.stageId === "storage");
  const generation = januaryCooling.stageResults.find(stageResult => stageResult.stageId === "generation");
  const qCnd = januaryCooling.usefulDemandKWh;
  const distributionBase = qCnd + emission.lossKWh + 2;
  const distributionLossExpected = 0.05 * distributionBase;
  const distributionAuxExpected = 0.02 * distributionBase;
  const distributionInputExpected =
    qCnd + emission.lossKWh + distributionLossExpected;
  const storageLossExpected = 3 * 0.01 * (30 - 10) * 100;
  const storageAuxExpected =
    distributionInputExpected / (0.00116 * 1000 * 2 * Math.abs(6 - 11)) * 0.1;
  const generationRequired = distributionInputExpected + storageLossExpected;
  const partLoadBin = 1;
  const heatRejectedExpected = generationRequired * (1 + 1 / (3 * partLoadBin * 1));
  const heatRejectionAuxExpected = heatRejectedExpected * 0.018 * 0.8 * 1;
  const heatRejectionDistributionAuxExpected = heatRejectedExpected * 0.003;
  const controlAuxExpected = 0.02 * 240;
  const generatorAuxExpected =
    heatRejectionAuxExpected + heatRejectionDistributionAuxExpected + controlAuxExpected;

  close(distribution.lossKWh, distributionLossExpected, 1e-9);
  close(distribution.auxiliaryKWh, distributionAuxExpected, 1e-9);
  close(storage.lossKWh, storageLossExpected, 1e-9);
  close(storage.auxiliaryKWh, storageAuxExpected, 1e-9);
  close(generation.auxiliaryKWh, generatorAuxExpected, 1e-9);
  close(
    januaryCooling.finalStageInputKWh,
    generationRequired - generatorAuxExpected * 0.1,
    1e-9
  );
  assert.equal(distribution.lossSource.classification, CHAPTER3_INPUT_CLASSIFICATION.NUMERICALLY_IMPLEMENTED);
  assert.ok(distribution.lossSource.formulaIds.includes("MC001_3_146_COOLING_DISTRIBUTION_LOSS"));
  assert.ok(distribution.auxiliarySource.formulaIds.includes("MC001_3_147_COOLING_DISTRIBUTION_AUXILIARY_ENERGY"));
  assert.ok(storage.lossSource.formulaIds.includes("MC001_3_99_COOLING_STORAGE_OUTPUT_SIDE_THERMAL_LOSS"));
  assert.ok(storage.lossSource.formulaIds.includes("MC001_3_121_COOLING_STORAGE_RECOVERABLE_THERMAL_LOSS"));
  assert.ok(storage.auxiliarySource.formulaIds.includes("MC001_3_115_COOLING_STORAGE_OUTPUT_PUMP_OPERATION_TIME"));
  assert.ok(storage.auxiliarySource.formulaIds.includes("MC001_3_119_COOLING_STORAGE_AUXILIARY_TOTAL"));
  assert.ok(generation.auxiliarySource.formulaIds.includes("MC001_3_149_COOLING_PART_LOAD_FACTOR"));
  assert.ok(generation.auxiliarySource.formulaIds.includes("MC001_3_155_COOLING_EER_TEMPERATURE_CORRECTION"));
  assert.ok(generation.auxiliarySource.formulaIds.includes("MC001_3_164_HEAT_REJECTED_COMPRESSION_GENERATOR"));
  assert.ok(generation.auxiliarySource.formulaIds.includes("MC001_3_176_HEAT_REJECTION_AUXILIARY_ENERGY"));
  assert.ok(generation.auxiliarySource.formulaIds.includes("MC001_3_180_COOLING_GENERATOR_AUXILIARY_TOTAL"));
  assert.ok(
    pipeline.calculation.chapter3Result.formulaReferences.includes("MC001_3_180_COOLING_GENERATOR_AUXILIARY_TOTAL")
  );

  const changedSystems = structuredClone(systems);
  changedSystems.cooling.systems[0].stages[3].auxiliaryCalculation.nominalEer = 4;
  const changed = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: changedSystems })
  );
  assert.notEqual(
    changed.calculation.chapter3Result.monthly[0].cooling.stageResults
      .find(stageResult => stageResult.stageId === "generation").auxiliaryKWh,
    generation.auxiliaryKWh
  );
  assert.notEqual(
    changed.calculation.chapter3Result.annual.coolingInputKWh,
    pipeline.calculation.chapter3Result.annual.coolingInputKWh
  );
  assert.notEqual(
    changed.calculation.chapter3Result.annual.coolingAuxiliaryKWh,
    pipeline.calculation.chapter3Result.annual.coolingAuxiliaryKWh
  );

  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  assert.ok(JSON.stringify(workspace.engineeringNotebook).includes("MC001_3_181_COOLING_COMPRESSION_EER"));
  assert.ok(JSON.stringify(workspace.report).includes("calculat normativ"));
});

await test("Chapter 2-only buildings remain openable without Chapter 3 output", () => {
  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: undefined })
  );
  assert.equal(pipeline.status, "ready");
  assert.equal(pipeline.calculation.stage, "chapter_2_complete");
  assert.equal(pipeline.calculation.chapter3Result, undefined);
  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  assert.equal(workspace.installations.status, "not_configured");
  assert.equal(workspace.report.chapters.some(chapter => chapter.chapterId === "instalatii_capitolul_3"), false);
});

await test("invalid Chapter 3 system data is rejected instead of filled with hidden defaults", () => {
  const dnaResult = createBuildingDnaFromAssistedAnswers(
    assistedAnswers({
      technicalSystems: technicalSystems({
        heating: {
          enabled: true,
          systems: [
            {
              systemId: "heating-invalid",
              enabled: true,
              stages: []
            }
          ]
        }
      })
    })
  );
  assert.equal(dnaResult.status, "ready");
  const calculation = calculateChapter2ForBuildingDna(dnaResult.buildingDna);
  assert.equal(calculation.status, "blocked");
  assert.equal(calculation.stage, "chapter_3_installations");
  assert.ok(calculation.diagnostics.some(item => item.code === "missing_installation_stage"));
});

await test("incomplete cooling component contracts block instead of falling back to hidden zeros", () => {
  const systems = technicalSystems();
  systems.heating.enabled = false;
  systems.heating.systems = [];
  systems.ventilationAhu.enabled = false;
  systems.ventilationAhu.systems = [];
  systems.domesticHotWater.enabled = false;
  systems.domesticHotWater.systems = [];
  systems.coolingStoragePcm.enabled = false;
  systems.lighting.enabled = false;
  systems.lighting.explicitMonthlyEnergyKWh = [];
  systems.lighting.leniSubspaces = [];
  systems.cooling.systems = [
    {
      systemId: "cooling-invalid-component",
      enabled: true,
      generatorType: "chiller",
      energyCarrier: "electricity",
      stages: [
        stage("emission", 0, 0),
        {
          stageId: "distribution",
          lossCalculation: {
            mode: "cooling_distribution_factor"
          },
          auxiliaryKWhPerMonth: 0,
          auxiliaryRecoveredFraction: 0,
          lossRecoveredFraction: 0,
          auxiliaryRecoverableFractionToHeating: 0,
          lossRecoverableFractionToHeating: 0
        },
        stage("storage", 0, 0),
        stage("generation", 0, 0)
      ]
    }
  ];

  const calculation = calculateChapter2ForBuildingDna(
    createBuildingDnaFromAssistedAnswers(assistedAnswers({ technicalSystems: systems })).buildingDna
  );
  assert.equal(calculation.status, "blocked");
  assert.equal(calculation.stage, "chapter_3_installations");
  assert.ok(
    calculation.diagnostics.some(item => item.code === "invalid_chapter3_stage_loss_component_contract")
  );
});

await test("empty DHW component contracts are rejected instead of becoming zero losses", () => {
  const systems = technicalSystems({
    domesticHotWater: {
      enabled: true,
      monthlyUsefulDemandKWh: 50,
      usefulDemandSource: {
        mode: "explicit_monthly",
        source: {
          origin: "expert_explicit_monthly_input",
          reference: "test.dhw.useful"
        }
      },
      systems: [
        {
          systemId: "dhw-empty-contract",
          enabled: true,
          energyCarrier: "natural_gas",
          stages: CHAPTER3_DHW_STAGE_IDS.map(stageId => ({
            stageId,
            ...(stageId === "distribution"
              ? {
                  lossCalculation: {
                    mode: "dhw_distribution_loss_components"
                  },
                  auxiliaryKWhPerMonth: 0
                }
              : {
                  lossKWhPerMonth: 0,
                  auxiliaryKWhPerMonth: 0
                })
          }))
        }
      ]
    }
  });
  const calculation = calculateChapter2ForBuildingDna(
    createBuildingDnaFromAssistedAnswers(assistedAnswers({ technicalSystems: systems })).buildingDna
  );
  assert.equal(calculation.status, "blocked");
  assert.ok(
    calculation.diagnostics.some(item => item.code === "invalid_chapter3_stage_loss_component_contract")
  );
});

await test("installation input changes alter deterministic analysis fingerprints and results", () => {
  const base = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers());
  const changedSystems = technicalSystems();
  changedSystems.heating.systems[0].stages[3].lossKWhPerMonth = 8;
  const changed = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: changedSystems })
  );
  const baseMetadata = buildBuildingPlatformVersionMetadata({
    buildingDna: base.buildingDna,
    calculation: base.calculation
  });
  const changedMetadata = buildBuildingPlatformVersionMetadata({
    buildingDna: changed.buildingDna,
    calculation: changed.calculation
  });

  assert.notEqual(
    baseMetadata.fingerprints.analysisFingerprint,
    changedMetadata.fingerprints.analysisFingerprint
  );
  assert.ok(
    changed.calculation.chapter3Result.annual.heatingInputKWh >
      base.calculation.chapter3Result.annual.heatingInputKWh
  );
  close(
    changed.calculation.chapter2Result.result.annualQHnd,
    base.calculation.chapter2Result.result.annualQHnd
  );
});

await test("Building DNA Chapter 3 adapter supports multiple explicit heating systems with allocation", () => {
  const multiHeating = technicalSystems();
  multiHeating.cooling.enabled = false;
  multiHeating.cooling.systems = [];
  multiHeating.ventilationAhu.enabled = false;
  multiHeating.ventilationAhu.systems = [];
  multiHeating.domesticHotWater.enabled = false;
  multiHeating.domesticHotWater.systems = [];
  multiHeating.coolingStoragePcm.enabled = false;
  multiHeating.lighting.enabled = false;
  multiHeating.lighting.explicitMonthlyEnergyKWh = [];
  multiHeating.lighting.leniSubspaces = [];
  multiHeating.heating.systems = [
    {
      ...withAllocation(
        serviceSystem(
          "heating-boiler",
          CHAPTER3_INSTALLATION_STAGE_IDS,
          [1, 2, 0, 3],
          [0.1, 0.2, 0, 0.3]
        ),
        0.6
      ),
      generatorType: "condensing_boiler",
      energyCarrier: "natural_gas"
    },
    {
      ...withAllocation(
        serviceSystem(
          "heating-electric-backup",
          CHAPTER3_INSTALLATION_STAGE_IDS,
          [0.5, 0.5, 0, 1],
          [0, 0.1, 0, 0.2]
        ),
        0.4
      ),
      generatorType: "electric_resistance",
      energyCarrier: "electricity"
    }
  ];

  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: multiHeating })
  );

  assert.equal(pipeline.status, "ready");
  assert.equal(pipeline.calculation.chapter3Result.status, "calculated");
  const january = pipeline.calculation.chapter3Result.monthly[0].heating;
  assert.equal(january.topology.systemCount, 2);
  assert.equal(january.systemResults[0].allocationFraction, 0.6);
  assert.equal(january.systemResults[1].allocationFraction, 0.4);
  assert.equal(
    pipeline.calculation.chapter3Input.months[0].heatingSystems.length,
    2
  );
  close(
    pipeline.calculation.chapter3Result.annual.heatingInputKWh,
    pipeline.calculation.chapter2Result.result.annualQHnd + 96
  );
  assert.ok(pipeline.calculation.chapter3Result.energyByCarrier.natural_gas > 0);
  assert.ok(pipeline.calculation.chapter3Result.energyByCarrier.electricity > 0);
  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  assert.equal(workspace.installations.systemTopology.length, 2);
  assert.ok(
    workspace.engineeringNotebook.sections
      .find(section => section.sectionId === "chapter3.month.january")
      .lines.some(line => line.lineId.includes("heating-boiler.allocation"))
  );
});

await test("Building DNA Chapter 3 adapter rejects multiple systems without explicit allocation", () => {
  const invalidSystems = technicalSystems();
  invalidSystems.heating.systems = [
    serviceSystem("heating-one", CHAPTER3_INSTALLATION_STAGE_IDS, [1, 0, 0, 0]),
    serviceSystem("heating-two", CHAPTER3_INSTALLATION_STAGE_IDS, [1, 0, 0, 0])
  ];
  const dnaResult = createBuildingDnaFromAssistedAnswers(
    assistedAnswers({ technicalSystems: invalidSystems })
  );
  assert.equal(dnaResult.status, "ready");
  const calculation = calculateChapter2ForBuildingDna(dnaResult.buildingDna);
  assert.equal(calculation.status, "blocked");
  assert.equal(calculation.stage, "chapter_3_installations");
  assert.ok(
    calculation.diagnostics.some(
      item => item.code === "missing_multiple_installation_system_allocation_fraction"
    )
  );
});

await test("Building DNA Chapter 3 adapter rejects partial allocation on a single active system", () => {
  const invalidSystems = technicalSystems();
  invalidSystems.heating.systems[0].allocationFraction = 0.75;
  const dnaResult = createBuildingDnaFromAssistedAnswers(
    assistedAnswers({ technicalSystems: invalidSystems })
  );
  assert.equal(dnaResult.status, "ready");
  const calculation = calculateChapter2ForBuildingDna(dnaResult.buildingDna);

  assert.equal(calculation.status, "blocked");
  assert.equal(calculation.stage, "chapter_3_installations");
  assert.ok(
    calculation.diagnostics.some(
      item => item.code === "invalid_single_installation_system_allocation_fraction"
    )
  );
});
