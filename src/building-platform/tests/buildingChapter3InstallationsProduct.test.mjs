import assert from "node:assert/strict";
import {
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
  assert.equal(metadata.chapter3AdapterVersion, "building_chapter_3_installations_adapter_p8_v1");
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
