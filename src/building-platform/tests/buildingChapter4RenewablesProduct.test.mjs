import assert from "node:assert/strict";
import {
  CHAPTER4_RENEWABLES_ADAPTER_VERSION,
  CHAPTER4_RENEWABLES_PRODUCT_MAPPING_LEDGER,
  TECHNICAL_SYSTEMS_SCHEMA,
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  buildBuildingPlatformVersionMetadata,
  buildBuildingTechnicalWorkspace,
  calculateChapter2ForBuildingDna,
  createBuildingDnaFromAssistedAnswers,
  createInMemoryVersionedBuildingBackend,
  resolveRomanianNormativeClimateSelection
} from "../index.mjs";

const EPSILON = 1e-9;
const PV_ANNUAL_ELECTRIC_KWH = 841.715569082304;
const PV_ANNUAL_INCIDENT_KWH = 6990.613096319999;

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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function climateProvider() {
  const provider = resolveRomanianNormativeClimateSelection({
    stationId: "mc001_6_2013_bucuresti",
    localityId: "ro_bucuresti",
    climateZone: "II",
    windZone: "II"
  });
  assert.equal(provider.status, "ready");
  assert.equal(provider.datasets.monthlySolarIrradiation.datasetStatus, "NORMATIVE_DATASET");
  return provider;
}

function photovoltaicSystem(overrides = {}) {
  return {
    systemId: "pv-main",
    enabled: true,
    panelCount: 3,
    panelAreaM2: 1.68,
    maximumPowerWAt1000: 252,
    inverterEfficiency: 0.97,
    temperatureEfficiencyMode: "annex_a2_monocrystalline",
    mounting: {
      tiltDeg: 45,
      azimuthDegFromSouth: 0,
      correctionTableId: "mc001_2022_table_4_5_beta45_azimuth0"
    },
    source: {
      origin: "explicit_engineering_input",
      reference: "P7.test.photovoltaic"
    },
    ...overrides
  };
}

function technicalSystems(overrides = {}) {
  return {
    schema: TECHNICAL_SYSTEMS_SCHEMA,
    source: {
      origin: "explicit_engineering_input",
      reference: "P7.test.chapter4_renewables"
    },
    renewableProduction: {
      enabled: true,
      photovoltaic: {
        enabled: true,
        systems: [photovoltaicSystem()]
      }
    },
    ...overrides
  };
}

function assistedAnswers(overrides = {}) {
  return {
    buildingId: "p7-chapter4-photovoltaic-reference",
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
      ventilationType: "natural",
      atticContext: "unheated",
      basementContext: "none"
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    location: {
      country: "RO",
      countyName: "Bucuresti",
      localityId: "ro_bucuresti",
      localityName: "Bucuresti",
      stationId: "mc001_6_2013_bucuresti"
    },
    climate: {
      climateZone: "II",
      windZone: "II"
    },
    climateProviderResult: climateProvider(),
    source: {
      reference: "P7.test.chapter4_product_flow"
    },
    technicalSystems: technicalSystems(),
    ...overrides
  };
}

await test("Chapter 4 product mapping ledger exposes only the source-backed PV subset", () => {
  assert.deepEqual(
    CHAPTER4_RENEWABLES_PRODUCT_MAPPING_LEDGER.map(entry => entry.groupId),
    ["photovoltaic_monthly"]
  );
  const entry = CHAPTER4_RENEWABLES_PRODUCT_MAPPING_LEDGER[0];
  assert.equal(entry.mc001RelationGroup, "MC001 Chapter 4.5 photovoltaic monthly method, relations 4.160-4.165");
  assert.equal(entry.runtimeModule, "src/physics-engine/mc001Chapter4Photovoltaics.mjs");
  assert.equal(entry.uiSection, "installations.renewables.photovoltaic");
  assert.equal(entry.persistencePath, "buildingDna.technicalSystems.renewableProduction.photovoltaic");
  assert.equal(entry.reportSection, "surse_regenerabile_capitolul_4.photovoltaic");
  assert.equal(entry.testFixture, "buildingChapter4RenewablesProduct.test.mjs");
});

await test("Chapter 4 photovoltaic flow reaches Building DNA, runtime, notebook, report and versioned backend", () => {
  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers());
  assert.equal(pipeline.status, "ready");
  assert.equal(pipeline.calculation.stage, "chapter_2_and_4_complete");
  assert.equal(pipeline.calculation.chapter4AdapterVersion, CHAPTER4_RENEWABLES_ADAPTER_VERSION);
  assert.equal(pipeline.calculation.chapter4Result.status, "calculated");
  assert.equal(
    pipeline.calculation.chapter4Input.photovoltaic.solarDataset.datasetId,
    "mc001_1_2006_annex_a9_6_mean_daily_solar_irradiance"
  );
  close(
    pipeline.calculation.chapter4Result.annual.photovoltaicElectricEnergyKWh,
    PV_ANNUAL_ELECTRIC_KWH
  );
  close(
    pipeline.calculation.chapter4Result.annual.photovoltaicIncidentEnergyKWh,
    PV_ANNUAL_INCIDENT_KWH
  );
  assert.ok(pipeline.calculation.chapter4Result.formulaReferences.includes("MC001_4_162_PV_MONTHLY_ELECTRIC_ENERGY"));
  assert.equal(
    pipeline.buildingDna.technicalSystems.renewableProduction.photovoltaic.systems[0].mounting.correctionTableId,
    "mc001_2022_table_4_5_beta45_azimuth0"
  );

  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  assert.equal(workspace.renewableProduction.status, "ready");
  close(
    workspace.renewableProduction.annual.photovoltaicElectricEnergyKWh,
    PV_ANNUAL_ELECTRIC_KWH
  );
  assert.ok(workspace.report.chapters.some(chapter => chapter.chapterId === "surse_regenerabile_capitolul_4"));
  assert.ok(workspace.engineeringNotebook.sections.some(section => section.sectionId === "chapter4.annual"));
  assert.ok(workspace.engineeringNotebook.sections.some(section => section.sectionId === "chapter4.photovoltaic.pv-main"));
  assert.ok(workspace.traceability.some(row =>
    row.reference === "MC001_4_162_PV_MONTHLY_ELECTRIC_ENERGY" &&
    row.chapter === "MC001 Chapter 4"
  ));

  const metadata = buildBuildingPlatformVersionMetadata({
    buildingDna: pipeline.buildingDna,
    calculation: pipeline.calculation
  });
  assert.equal(metadata.chapter4AdapterVersion, CHAPTER4_RENEWABLES_ADAPTER_VERSION);
  assert.equal(metadata.chapter4RuntimeVersion, "mc001_chapter_4_5_photovoltaic_monthly_p7_v1");

  const backend = createInMemoryVersionedBuildingBackend();
  const saved = backend.saveAndCalculate({
    ownerUserId: "p7-owner",
    projectName: "P7 photovoltaic reference",
    buildingDna: pipeline.buildingDna,
    idempotencyKey: "p7-save-1"
  });
  assert.equal(saved.ok, true);
  assert.equal(saved.analysisVersion.chapter4_adapter_version, CHAPTER4_RENEWABLES_ADAPTER_VERSION);
  close(
    saved.analysisVersion.complete_engine_output.chapter4Result.annual.photovoltaicElectricEnergyKWh,
    PV_ANNUAL_ELECTRIC_KWH
  );
  close(
    saved.reportVersion.structured_report_model.mainResults.renewableProduction.photovoltaicElectricEnergyKWh,
    PV_ANNUAL_ELECTRIC_KWH
  );

  const replay = backend.saveAndCalculate({
    ownerUserId: "p7-owner",
    projectName: "P7 photovoltaic reference",
    buildingDna: pipeline.buildingDna,
    idempotencyKey: "p7-save-1"
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(backend.state.buildingDnaVersions.size, 1);
  assert.equal(backend.state.analysisVersions.size, 1);
  assert.equal(backend.state.reportVersions.size, 1);

  const reopened = backend.reopenProject({
    ownerUserId: "p7-owner",
    projectId: saved.project.project_id
  });
  assert.equal(reopened.ok, true);
  assert.deepEqual(
    reopened.buildingDnaVersion.complete_building_dna.technicalSystems.renewableProduction,
    pipeline.buildingDna.technicalSystems.renewableProduction
  );
  assert.deepEqual(
    reopened.analysisVersion.complete_engine_output.chapter4Result.annual,
    saved.analysisVersion.complete_engine_output.chapter4Result.annual
  );
});

await test("photovoltaic input changes alter Chapter 4 fingerprint and results without changing Chapter 2", () => {
  const base = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers());
  const changedSystems = technicalSystems({
    renewableProduction: {
      enabled: true,
      photovoltaic: {
        enabled: true,
        systems: [photovoltaicSystem({ panelCount: 4 })]
      }
    }
  });
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
  close(
    changed.calculation.chapter4Result.annual.photovoltaicElectricEnergyKWh,
    (PV_ANNUAL_ELECTRIC_KWH / 3) * 4
  );
  close(
    base.calculation.chapter2Result.result.annualQHnd,
    changed.calculation.chapter2Result.result.annualQHnd
  );
  close(
    base.calculation.chapter2Result.result.annualQCnd,
    changed.calculation.chapter2Result.result.annualQCnd
  );
});

await test("Chapter 4 PV rejects missing source-backed PV inputs instead of applying hidden defaults", () => {
  const invalidSystems = technicalSystems({
    renewableProduction: {
      enabled: true,
      photovoltaic: {
        enabled: true,
        systems: [
          {
            ...photovoltaicSystem(),
            temperatureEfficiencyMode: undefined,
            temperatureEfficiencyFactor: undefined,
            temperatureEfficiencyFactors: undefined,
            mounting: {}
          }
        ]
      }
    }
  });
  const dnaResult = createBuildingDnaFromAssistedAnswers(
    assistedAnswers({ technicalSystems: invalidSystems })
  );
  assert.equal(dnaResult.status, "ready");
  const calculation = calculateChapter2ForBuildingDna(dnaResult.buildingDna);
  assert.equal(calculation.status, "blocked");
  assert.equal(calculation.stage, "chapter_4_renewable_production");
  assert.ok(
    calculation.diagnostics.some(item =>
      item.code === "chapter4_pv_temperature_efficiency_required"
    )
  );
  assert.ok(
    calculation.diagnostics.some(item =>
      item.code === "chapter4_pv_unsupported_orientation_correction"
    )
  );
});

await test("Chapter 2-only buildings remain unchanged when Chapter 4 renewable systems are absent", () => {
  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(
    assistedAnswers({ technicalSystems: undefined })
  );
  assert.equal(pipeline.status, "ready");
  assert.equal(pipeline.calculation.stage, "chapter_2_complete");
  assert.equal(pipeline.calculation.chapter4Result, undefined);
  const workspace = buildBuildingTechnicalWorkspace(pipeline);
  assert.equal(workspace.renewableProduction.status, "not_configured");
  assert.equal(
    workspace.report.chapters.some(chapter => chapter.chapterId === "surse_regenerabile_capitolul_4"),
    false
  );
});
