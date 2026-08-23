import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ASSISTED_WIZARD_DEMO_FIXTURE,
  BUILDING_PLATFORM_PRODUCT_JOURNEY,
  BUILDING_PLATFORM_WIZARD_STEPS,
  P10_CPE_FIELD_MAPPING,
  P10_SUPPORTED_INTERVENTION_TYPES,
  P10_WORKSPACE_NAVIGATION,
  analyzeBuildingPlatformProductJourney,
  analysisIdFromSearch,
  applyBuildingDnaToWizardForm,
  buildCpeDocumentModel,
  buildBuildingPlatformSavePayload,
  buildProfessionalWorkspaceModel,
  buildScenarioPreviewFromFormData,
  buildingDnaToWizardValues,
  buildWizardEngineeringPreview,
  constructionPeriodFromYear,
  demoModeFromSearch,
  getBuildingPlatformFieldContract,
  getAssistedWizardDemoFixture,
  humanizeBuildingPlatformDiagnostic,
  loadBuildingPlatformChapter2Analysis,
  markBuildingPlatformResultsStale,
  mapWizardAnswersToAssistedAnswers,
  projectIdFromSearch,
  renderEngineeringModelReview,
  renderLoadedBuildingPlatformAnalysis,
  renderProfessionalWorkspace,
  renderProductJourneyStatusPanel,
  saveBuildingPlatformDraft,
  saveBuildingPlatformChapter2Analysis,
  structuralSystemFromWallMaterial
} from "../js/building-platform-wizard.mjs";
import {
  projectStatusLabel,
  renderProjectRows
} from "../js/my-projects.mjs";
import {
  calculateChapter2ForBuildingDna,
  createBuildingDnaFromAssistedAnswers
} from "../src/building-platform/index.mjs";
import {
  getClimateZoneDependentRequirements
} from "../src/climate-platform/index.mjs";

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

const SOLAR_QSOL_QSKY_BLOCKER = "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED";
const SOLAR_HSOL_CONTEXT_DIAGNOSTIC = "A9_6_VERTICAL_HORIZONTAL_HSOL_AVAILABLE_QSKY_REQUIRED_FOR_QSOL";
const OLD_SOLAR_PREPROCESSING_DIAGNOSTIC = [
  "CHAPTER",
  "2",
  "SOLAR",
  "PREPROCESSING",
  "UNAVAILABLE"
].join("_");

function formData(entries) {
  return {
    get(name) {
      return entries[name];
    },
    entries() {
      return Object.entries(entries);
    }
  };
}

function fakeRootForSave() {
  const nodes = new Map();
  const status = {
    textContent: "",
    dataset: {}
  };
  const preview = {
    innerHTML: ""
  };
  nodes.set("buildingPlatformSaveStatus", status);
  nodes.set("buildingModelReview", preview);
  return {
    status,
    preview,
    getElementById(id) {
      return nodes.get(id) || null;
    }
  };
}

function fakeWizardForm(names) {
  const controls = names.map(name => ({
    name,
    type: "text",
    value: "",
    dataset: {}
  }));
  return {
    dataset: {},
    controls,
    reset() {
      for (const control of controls) control.value = "";
    },
    dispatchEvent() {},
    querySelectorAll(selector) {
      const match = selector.match(/\[name="(.+)"\]/);
      const name = match?.[1]?.replace(/\\"/g, '"') ?? "";
      return controls.filter(control => control.name === name);
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    }
  };
}

function fakeRootForLoad(form) {
  const nodes = new Map();
  const status = {
    textContent: "",
    dataset: {}
  };
  const preview = {
    innerHTML: ""
  };
  const analysisInput = {
    value: "100"
  };
  nodes.set("houseForm", form);
  nodes.set("buildingPlatformSaveStatus", status);
  nodes.set("buildingModelReview", preview);
  nodes.set("buildingPlatformLoadAnalysisId", analysisInput);
  return {
    status,
    preview,
    analysisInput,
    getElementById(id) {
      return nodes.get(id) || null;
    }
  };
}

function fakeRootForStale(form) {
  const status = {
    textContent: "",
    dataset: {}
  };
  const preview = {
    dataset: {},
    innerHTML: "",
    querySelector(selector) {
      return this.innerHTML.includes('id="buildingPlatformStaleNotice"') &&
        selector === "#buildingPlatformStaleNotice"
        ? { remove() { preview.innerHTML = ""; } }
        : null;
    },
    insertAdjacentHTML(_position, html) {
      this.innerHTML = `${html}${this.innerHTML}`;
    }
  };
  return {
    status,
    preview,
    getElementById(id) {
      return {
        houseForm: form,
        buildingModelReview: preview,
        buildingPlatformSaveStatus: status
      }[id] ?? null;
    }
  };
}

await test("wizard exposes the product journey without normative relation navigation", () => {
  assert.equal(BUILDING_PLATFORM_WIZARD_STEPS.length, 8);
  assert.equal(BUILDING_PLATFORM_PRODUCT_JOURNEY.length, 8);
  const serialized = JSON.stringify(BUILDING_PLATFORM_WIZARD_STEPS);
  for (const forbidden of ["lambda", "Htr", "gamma", "tau", "eta", "U-value", "coeficient"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  for (const expected of [
    "Cladire si clima",
    "Anvelopa",
    "Utilizare",
    "Instalatii",
    "Energie regenerabila",
    "Verificare",
    "Raport",
    "Rezultate"
  ]) {
    assert.equal(serialized.includes(expected), true, expected);
  }

  const usage = BUILDING_PLATFORM_PRODUCT_JOURNEY.find(section => section.sectionId === "usage");
  assert.deepEqual(usage.requiredFields, ["building_use_category"]);
  assert.equal(getBuildingPlatformFieldContract("building_use_category").runtimeConsumer, "MC001 Capitolul 2 - Tabel 2.15");
  assert.equal(getBuildingPlatformFieldContract("chapter3_heating_generation_loss_kwh_month").inputLevel, "expert");
  assert.equal(getBuildingPlatformFieldContract("chapter3_heating_generator_type").inputLevel, "assisted");
});

await test("product journey status and diagnostics are human-readable", () => {
  const blankStates = analyzeBuildingPlatformProductJourney(formData({}));
  assert.equal(blankStates.find(section => section.sectionId === "building").state, "needs_information");
  assert.equal(blankStates.find(section => section.sectionId === "usage").missingFields.includes("building_use_category"), true);
  const demoStates = analyzeBuildingPlatformProductJourney(formData(ASSISTED_WIZARD_DEMO_FIXTURE.values));
  assert.equal(demoStates.find(section => section.sectionId === "building").state, "complete");
  assert.equal(demoStates.find(section => section.sectionId === "usage").state, "complete");
  const statusHtml = renderProductJourneyStatusPanel(blankStates);
  assert.equal(statusHtml.includes("utilizarea principala"), true);
  assert.equal(statusHtml.includes("Lipsesc: building_use_category"), false);

  assert.equal(
    humanizeBuildingPlatformDiagnostic({ code: "building_typology_invalid_building_type" }),
    "Alege tipul cladirii pentru a rezolva tipologia constructiva."
  );
  const html = renderEngineeringModelReview({
    status: "blocked",
    diagnostics: {
      blockers: [{ code: "building_typology_invalid_building_type" }]
    }
  });
  assert.equal(html.includes("Calculul nu poate fi finalizat inca"), true);
  assert.equal(html.includes("Alege tipul cladirii"), true);
  assert.equal(html.includes("Detalii tehnice"), true);
  assert.equal(html.includes("building_typology_invalid_building_type"), true);
});

await test("wizard maps technical answers to assisted Building DNA input", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    building_platform_demo_mode: "1",
    building_platform_demo_fixture_id: "demo_detached_masonry_1985_eps_pvc_bucharest",
    building_type: "house",
    building_use_category: "residential_single_family",
    climate_profile_id: "ro_synthetic_bucharest_seasonal_demo_v1",
    county: "Bucuresti",
    climate_zone: "II",
    wind_zone: "II",
    construction_year: "1985",
    structural_system: "masonry",
    wall_material: "brick",
    wall_insulation: "10cm",
    window_type: "modern_double_glazing",
    roof_type: "unheated_attic",
    floor_type: "on_ground",
    city: "Cluj",
    useful_area_m2: "120",
    heated_volume_m3: "312",
    window_orientation: "south",
    exterior_wall_area_m2: "50",
    roof_area_m2: "120",
    ground_floor_area_m2: "120",
    attic_ceiling_area_m2: "120",
    adjacent_wall_area_m2: "10",
    door_area_m2: "2"
  }));

  assert.equal(answers.buildingType, "detached_house");
  assert.equal(answers.buildingUseCategory, "residential_single_family");
  assert.equal(answers.internalGainsCategoryId, "residential_single_family");
  assert.equal(answers.constructionPeriod, "1978_1990");
  assert.equal(answers.structuralSystem, "masonry");
  assert.equal(answers.wallMaterial, "brick");
  assert.equal(answers.renovations.wallInsulation, "eps");
  assert.equal(answers.renovations.wallInsulationThicknessM, 0.1);
  assert.equal(answers.renovations.roofInsulated, false);
  assert.equal(answers.renovations.floorInsulated, false);
  assert.equal(answers.renovations.windowsReplaced, true);
  assert.equal(answers.climateProfileId, "ro_synthetic_bucharest_seasonal_demo_v1");
  assert.equal(answers.climateProfile.sourceType, "synthetic_demo_profile");
  assert.equal(answers.monthlyProfiles, undefined);
  assert.equal(answers.allowSyntheticClimate, true);
  assert.equal(answers.location.countyName, "Bucuresti");
  assert.equal(answers.location.climateZone, "II");
  assert.equal(answers.location.windZone, "II");
  assert.equal(answers.buildingSpecificParameters.usefulFloorAreaM2, 120);
  assert.equal(answers.buildingSpecificParameters.heatedVolumeM3, 312);
  assert.equal(answers.buildingSpecificParameters.exteriorWallAreaM2, 50);
  assert.equal(answers.geometry.roofAreaM2, 120);
  assert.equal(answers.geometry.groundFloorAreaM2, 120);
  assert.equal(answers.geometry.atticCeilingAreaM2, 120);
  assert.equal(answers.geometry.adjacentWallAreaM2, 10);
  assert.equal(answers.geometry.doorAreaM2, 2);
  assert.equal(answers.context.attic, "unheated");
  assert.equal(answers.context.basement, "none");

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  assert.equal(preview.buildingDna.monthlyProfiles.length, 12);
  assert.equal(preview.buildingDna.monthlyProfiles[0].heatGains.solarOrientation, "south");
  assert.equal(preview.buildingDna.climate.climateZone, "II");
  assert.equal(preview.buildingDna.climate.windZone, "II");
});

await test("production wizard rejects synthetic climate profiles unless demo mode is explicit", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    building_type: "house",
    climate_profile_id: "ro_synthetic_bucharest_seasonal_demo_v1",
    climate_zone: "II",
    construction_year: "1985",
    wall_material: "brick",
    wall_insulation: "10cm",
    window_type: "modern_double_glazing",
    roof_type: "unheated_attic",
    floor_type: "on_ground"
  }));

  assert.equal(answers.source.origin, undefined);
  assert.equal(answers.allowSyntheticClimate, false);

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "blocked");
  assert.equal(preview.diagnostics.blockers[0].code, "building_dna_not_ready");
  assert.equal(
    preview.diagnostics.blockers.some(item =>
      item.code === "synthetic_climate_profile_requires_demo_or_explicit_estimated_mode"
    ),
    true
  );
});

await test("production wizard resolves locality climate through the Climate Provider without manual profile selection", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    building_platform_demo_mode: "",
    building_platform_demo_fixture_id: "",
    climate_profile_id: "",
    locality_id: "ro_brasov",
    climate_station_id: "mc001_6_2013_brasov",
    county: "Brasov",
    city: "",
    climate_zone: "II",
    wind_zone: "II"
  }));

  assert.equal(answers.source.origin, undefined);
  assert.equal(answers.climateProfileId, undefined);
  assert.equal(answers.location.localityId, "ro_brasov");
  assert.equal(answers.location.climateStationId, "mc001_6_2013_brasov");
  assert.equal(answers.location.localityName, "Brasov");

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "blocked");
  assert.equal(
    preview.diagnostics.blockers.some(item => item.code === SOLAR_QSOL_QSKY_BLOCKER),
    true
  );
  assert.equal(
    preview.diagnostics.blockers.some(item => item.code === OLD_SOLAR_PREPROCESSING_DIAGNOSTIC),
    false
  );
  assert.equal(preview.technicalWorkspace.status, "blocked");
  const dnaResult = createBuildingDnaFromAssistedAnswers(answers);
  assert.equal(dnaResult.status, "ready");
  assert.equal(dnaResult.buildingDna.climateProfile, null);
  assert.equal(dnaResult.buildingDna.calculationStatus, "source_backed_climate_provider");
  assert.equal(dnaResult.buildingDna.climateProvider.selection.stationId, "mc001_6_2013_brasov");
  assert.equal(dnaResult.buildingDna.productionClimateProfile.localityId, "ro_brasov");
  assert.equal(
    dnaResult.buildingDna.monthlyProfiles[0].transmission.heating.outdoorTemperature.amount,
    -3.3
  );
  assert.equal(
    dnaResult.buildingDna.monthlyProfiles[0].heatGains.solarGainsSource,
    "provider_climate_profile_without_qsol_preprocessing"
  );
  const calculation = calculateChapter2ForBuildingDna(dnaResult.buildingDna);
  assert.equal(calculation.status, "incomplete");
  assert.equal(calculation.stage, "chapter_2_climate_inputs");
  assert.equal(
    calculation.diagnostics.blockers[0].code,
    SOLAR_QSOL_QSKY_BLOCKER
  );
  assert.deepEqual(
    calculation.diagnostics.blockers[0].contextDiagnostics,
    [SOLAR_HSOL_CONTEXT_DIAGNOSTIC]
  );

  const html = renderEngineeringModelReview(preview, { openReport: true });
  assert.equal(html.includes("Calculul energetic nu poate fi finalizat inca."), true);
  assert.equal(html.includes("Datele lunare de radiatie solara Hsol"), true);
  assert.equal(html.includes("Nu a fost generat un rezultat normativ incomplet."), true);
  assert.equal(html.includes(SOLAR_QSOL_QSKY_BLOCKER), true);
  assert.equal(html.includes(SOLAR_HSOL_CONTEXT_DIAGNOSTIC), true);
  assert.equal(html.includes(OLD_SOLAR_PREPROCESSING_DIAGNOSTIC), false);
});

await test("locality-driven climate reaches Building DNA and blocks Chapter 2 before fake solar zero", () => {
  const run = ({ localityId, stationId }) => {
    const answers = mapWizardAnswersToAssistedAnswers(formData({
      ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
      building_platform_demo_mode: "",
      building_platform_demo_fixture_id: "",
      climate_profile_id: "ro_synthetic_bucharest_seasonal_demo_v1",
      locality_id: localityId,
      climate_station_id: stationId,
      city: "",
      climate_zone: "",
      wind_zone: "",
      climate_assignment_origin: "not_selected"
    }));
    const preview = buildWizardEngineeringPreview(answers);
    assert.equal(preview.status, "blocked");
    assert.equal(
      preview.diagnostics.blockers.some(item => item.code === SOLAR_QSOL_QSKY_BLOCKER),
      true
    );
    assert.equal(
      preview.diagnostics.blockers.some(item => item.code === OLD_SOLAR_PREPROCESSING_DIAGNOSTIC),
      false
    );
    assert.equal(answers.climateProfileId, undefined);
    const dnaResult = createBuildingDnaFromAssistedAnswers(answers);
    assert.equal(dnaResult.status, "ready");
    assert.equal(dnaResult.buildingDna.climateProfile, null);
    assert.equal(dnaResult.buildingDna.calculationStatus, "source_backed_climate_provider");
    const calculation = calculateChapter2ForBuildingDna(dnaResult.buildingDna);
    assert.equal(calculation.status, "incomplete");
    assert.equal(calculation.chapter2Input, null);
    return { preview, buildingDna: dnaResult.buildingDna, calculation };
  };
  const bucuresti = run({
    localityId: "ro_bucuresti",
    stationId: "mc001_6_2013_bucuresti"
  });
  const cluj = run({
    localityId: "ro_cluj_napoca",
    stationId: "mc001_6_2013_cluj_napoca"
  });

  assert.equal(bucuresti.buildingDna.climateProvider.selection.stationId, "mc001_6_2013_bucuresti");
  assert.equal(cluj.buildingDna.climateProvider.selection.stationId, "mc001_6_2013_cluj_napoca");
  assert.equal(
    bucuresti.buildingDna.monthlyProfiles[0].transmission.heating.outdoorTemperature.amount,
    -1.2
  );
  assert.equal(
    cluj.buildingDna.monthlyProfiles[0].transmission.heating.outdoorTemperature.amount,
    -2.4
  );
  assert.notEqual(
    bucuresti.buildingDna.monthlyProfiles[0].transmission.heating.outdoorTemperature.amount,
    cluj.buildingDna.monthlyProfiles[0].transmission.heating.outdoorTemperature.amount
  );
  assert.equal(
    bucuresti.buildingDna.productionClimateProfile.monthlyRecords[0].hsol.hsolKwhPerM2ByOrientation.south,
    57.0648
  );
  assert.equal(
    bucuresti.buildingDna.productionClimateProfile.monthlyRecords[6].hsol.hsolKwhPerM2ByOrientation.horizontal,
    149.3952
  );
  assert.equal(
    cluj.buildingDna.productionClimateProfile.monthlyRecords[0].hsol.hsolKwhPerM2ByOrientation.south,
    52.9728
  );
  assert.equal(
    cluj.buildingDna.productionClimateProfile.monthlyRecords[6].hsol.hsolKwhPerM2ByOrientation.horizontal,
    172.608
  );
  assert.notEqual(
    bucuresti.buildingDna.productionClimateProfile.monthlyRecords[0].hsol.hsolKwhPerM2ByOrientation.south,
    cluj.buildingDna.productionClimateProfile.monthlyRecords[0].hsol.hsolKwhPerM2ByOrientation.south
  );
  assert.equal(
    bucuresti.buildingDna.monthlyProfiles[0].heatGains.solarGainsSource,
    "provider_climate_profile_without_qsol_preprocessing"
  );
  assert.equal(bucuresti.buildingDna.monthlyProfiles[0].heatGains.solarGains.amount, 0);
  assert.equal(
    bucuresti.calculation.diagnostics.blockers[0].code,
    SOLAR_QSOL_QSKY_BLOCKER
  );
  assert.equal(
    cluj.calculation.diagnostics.blockers[0].code,
    SOLAR_QSOL_QSKY_BLOCKER
  );
  assert.equal(
    bucuresti.calculation.diagnostics.blockers[0].productionEligible,
    false
  );
  assert.deepEqual(
    cluj.calculation.diagnostics.blockers[0].missingInputs,
    ["Qsky", "Qsol", "solarElementInputs"]
  );
});

await test("old broad solar preprocessing diagnostic is not runtime reachable", () => {
  const runtimeFiles = [
    "src/building-platform/buildingChapter2Adapter.mjs",
    "src/building-platform/buildingDnaResolver.mjs",
    "src/building-platform/buildingKnowledgePipeline.mjs",
    "src/building-platform/buildingTechnicalReport.mjs",
    "js/building-platform-wizard.mjs"
  ];
  for (const file of runtimeFiles) {
    assert.equal(readFileSync(file, "utf8").includes(OLD_SOLAR_PREPROCESSING_DIAGNOSTIC), false, file);
  }
});

await test("wizard maps installation fields into canonical technical systems", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    chapter3_heating_generation_loss_kwh_month: "9"
  }));

  assert.equal(answers.technicalSystems.schema, "technical_systems_v1");
  assert.equal(answers.technicalSystems.heating.enabled, true);
  assert.equal(answers.technicalSystems.heating.systems[0].energyCarrier, "natural_gas");
  assert.equal(
    answers.technicalSystems.heating.systems[0].stages.find(stage => stage.stageId === "generation").lossKWhPerMonth,
    9
  );
  assert.equal(answers.technicalSystems.domesticHotWater.monthlyUsefulDemandKWh, 95);
  assert.equal(answers.technicalSystems.domesticHotWater.usefulDemandSource.mode, "explicit_monthly");
  assert.equal(answers.technicalSystems.lighting.boundaryStatus, "explicit_input_boundary_sr_en_15193_1");

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  assert.equal(preview.calculation.stage, "chapter_2_and_3_complete");
  assert.equal(preview.technicalWorkspace.installations.status, "ready");
  const html = renderEngineeringModelReview(preview);
  assert.equal(html.includes("Instalatii tehnice - MC001 Capitolul 3"), true);
  assert.equal(html.includes("Calculul detaliat normativ al iluminatului conform SR EN 15193-1"), true);
});

await test("wizard maps shared heating and ACM generator into one canonical component", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    chapter3_cooling_enabled: "no",
    chapter3_ventilation_ahu_enabled: "no",
    chapter3_pcm_enabled: "no",
    chapter3_lighting_enabled: "no",
    chapter3_shared_generator_enabled: "yes",
    chapter3_shared_generator_type: "condensing_boiler",
    chapter3_shared_generator_energy_carrier: "natural_gas",
    chapter3_shared_generator_auxiliary_carrier: "electricity",
    chapter3_shared_generator_control_loss_factor: "1.05",
    chapter3_shared_generator_operation_hours_month: "100",
    chapter3_shared_generator_loss_power_kw: "0.2",
    chapter3_shared_generator_auxiliary_power_kw: "0.05",
    chapter3_shared_generator_aux_recovered_fraction: "0.2",
    chapter3_shared_generator_aux_recoverable_fraction: "0.5",
    chapter3_shared_generator_loss_recoverable_fraction: "0.3",
    chapter3_shared_generator_boiler_room_recovery_factor: "0.1",
    chapter3_shared_generator_renewable_heat_kwh_month: "0",
    chapter3_shared_generator_dhw_storage_distribution_loss_kwh_month: "0",
    chapter3_shared_generator_heating_allocation_fraction: "0.7",
    chapter3_shared_generator_dhw_allocation_fraction: "0.3"
  }));

  const generator = answers.technicalSystems.sharedComponents.generators[0];
  assert.equal(generator.componentId, "shared-generator-heating-dhw-main");
  assert.equal(answers.technicalSystems.heating.systems[0].generatorRef, generator.componentId);
  assert.equal(
    answers.technicalSystems.domesticHotWater.systems[0].generatorRef,
    generator.componentId
  );
  assert.equal(generator.energyCarrier, "natural_gas");
  assert.equal(generator.auxiliaryCarrier, "electricity");
  assert.deepEqual(generator.serviceAllocationFractions, { heating: 0.7, dhw: 0.3 });

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  assert.equal(preview.technicalWorkspace.installations.sharedGenerators.length, 1);
  assert.equal(
    preview.technicalWorkspace.installations.sharedGenerators[0].componentId,
    generator.componentId
  );
  const html = renderEngineeringModelReview(preview);
  assert.equal(html.includes("shared-generator-heating-dhw-main"), true);
});

await test("P9C assisted shared heating and ACM generator resolves the common no-recovery path without Expert fields", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    analysis_input_mode: "assisted",
    chapter3_cooling_enabled: "no",
    chapter3_ventilation_ahu_enabled: "no",
    chapter3_pcm_enabled: "no",
    chapter3_lighting_enabled: "no",
    chapter3_shared_generator_enabled: "yes",
    chapter3_shared_generator_type: "condensing_boiler",
    chapter3_shared_generator_energy_carrier: "natural_gas",
    chapter3_shared_generator_auxiliary_carrier: "electricity",
    chapter3_shared_generator_control_loss_factor: "1.05",
    chapter3_shared_generator_operation_hours_month: "100",
    chapter3_shared_generator_loss_power_kw: "0.2",
    chapter3_shared_generator_auxiliary_power_kw: "0.05",
    chapter3_shared_generator_recovery_mode: "no_recovery",
    chapter3_shared_generator_renewable_heat_mode: "none",
    chapter3_shared_generator_dhw_loss_mode: "none",
    chapter3_shared_generator_aux_recovered_fraction: "",
    chapter3_shared_generator_aux_recoverable_fraction: "",
    chapter3_shared_generator_loss_recoverable_fraction: "",
    chapter3_shared_generator_boiler_room_recovery_factor: "",
    chapter3_shared_generator_renewable_heat_kwh_month: "",
    chapter3_shared_generator_dhw_storage_distribution_loss_kwh_month: "",
    chapter3_shared_generator_heating_allocation_fraction: "0.7",
    chapter3_shared_generator_dhw_allocation_fraction: "0.3"
  };
  const journey = analyzeBuildingPlatformProductJourney(formData(values));
  assert.equal(journey.find(section => section.sectionId === "systems").state, "complete");

  const answers = mapWizardAnswersToAssistedAnswers(formData(values));
  const generator = answers.technicalSystems.sharedComponents.generators[0];
  assert.equal(generator.recoveredAuxiliaryFraction, 0);
  assert.equal(generator.auxiliaryRecoverableFractionToHeating, 0);
  assert.equal(generator.lossRecoverableFractionToHeating, 0);
  assert.equal(generator.boilerRoomRecoveryFactor, 0);
  assert.equal(generator.renewableGeneratorHeatKWh, 0);
  assert.equal(generator.dhwStorageOrDistributionLossKWh, 0);
  assert.deepEqual(generator.assistedSelections, {
    recoveryMode: "no_recovery",
    renewableHeatMode: "none",
    dhwLossMode: "none"
  });

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  assert.equal(preview.technicalWorkspace.installations.sharedGenerators.length, 1);
});

await test("wizard can map ACM useful demand to the normative residential calculation source", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    chapter3_dhw_useful_mode: "residential_normative",
    chapter3_dhw_dwelling_type: "apartment",
    chapter3_dhw_useful_kwh_month: ""
  }));

  assert.equal(answers.technicalSystems.domesticHotWater.monthlyUsefulDemandKWh, undefined);
  assert.deepEqual(answers.technicalSystems.domesticHotWater.usefulDemandSource, {
    mode: "residential_normative",
    dwellingType: "apartment",
    source: {
      origin: "expert_override",
      reference: "chapter3_dhw_useful_mode"
    }
  });

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  assert.equal(
    preview.calculation.chapter3Result.monthly[0].dhw.usefulDemandSource.classification,
    "NUMERICALLY_IMPLEMENTED"
  );
  assert.ok(
    preview.technicalWorkspace.engineeringNotebook.sections
      .find(section => section.sectionId === "chapter3.month.january")
      .lines.some(line => line.lineId === "january.dhw.useful" && line.text.includes("calculat normativ"))
  );
});

await test("wizard maps ACM component contracts to calculated Chapter 3 stage inputs", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    chapter3_dhw_component_mode: "component_contract",
    chapter3_dhw_pipe_length_m: "12",
    chapter3_dhw_pipe_equivalent_length_m: "0",
    chapter3_dhw_recoverable_pipe_length_m: "4",
    chapter3_dhw_distribution_hours_month: "100",
    chapter3_dhw_distribution_temp_c: "50",
    chapter3_dhw_distribution_delta_k: "0",
    chapter3_dhw_pipe_ambient_c: "20",
    chapter3_dhw_pipe_inner_d_m: "0.02",
    chapter3_dhw_pipe_outer_d_m: "0.04",
    chapter3_dhw_pipe_lambda_w_mk: "0.04",
    chapter3_dhw_pipe_ha_w_m2k: "8",
    chapter3_dhw_pump_flow_m3h: "0.8",
    chapter3_dhw_pump_pressure_kpa: "18",
    chapter3_dhw_pump_load_factor: "0.5",
    chapter3_dhw_pump_eei: "0.23",
    chapter3_dhw_pump_correction_factor: "1.1",
    chapter3_dhw_pump_cp1: "0.25",
    chapter3_dhw_pump_cp2: "0.75",
    chapter3_dhw_storage_h_w_k: "3",
    chapter3_dhw_storage_setpoint_c: "55",
    chapter3_dhw_storage_ambient_c: "20",
    chapter3_dhw_storage_hours_month: "744",
    chapter3_dhw_storage_accessible_factor: "0.8",
    chapter3_dhw_storage_distribution_factor: "1.1"
  };
  const answers = mapWizardAnswersToAssistedAnswers(formData(values));
  const dhwStages = answers.technicalSystems.domesticHotWater.systems[0].stages;
  const distribution = dhwStages.find(stage => stage.stageId === "distribution");
  const storage = dhwStages.find(stage => stage.stageId === "storage");

  assert.equal(distribution.lossKWhPerMonth, undefined);
  assert.equal(distribution.auxiliaryKWhPerMonth, undefined);
  assert.equal(distribution.lossCalculation.mode, "dhw_distribution_loss_components");
  assert.equal(distribution.auxiliaryCalculation.mode, "dhw_recirculation_pump_auxiliary");
  assert.equal(storage.lossKWhPerMonth, undefined);
  assert.equal(storage.lossCalculation.mode, "dhw_storage_standing_loss_single_volume");

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  const januaryDhw = preview.calculation.chapter3Result.monthly[0].dhw;
  const distributionResult = januaryDhw.stageResults.find(stage => stage.stageId === "distribution");
  const storageResult = januaryDhw.stageResults.find(stage => stage.stageId === "storage");
  const psi =
    Math.PI /
    ((1 / (2 * 0.04)) * Math.log(0.04 / 0.02) + 1 / (8 * 0.04));
  const expectedDistributionLoss = psi * (50 - 20) * 12 * 100 / 1000;
  const pumpDesignPower = 18 * 0.8 / 3600;
  const referencePower =
    (1.7 * pumpDesignPower + 17 * (1 - Math.exp(-0.3 * pumpDesignPower))) *
    10 ** -3;
  const pumpEfficiencyFactor = referencePower / pumpDesignPower;
  const pumpEnergyUseFactor = pumpEfficiencyFactor * (0.25 + 0.75 * 0.5 ** -1) * 0.23 / 0.25;
  const expectedAuxiliary = pumpDesignPower * 0.5 * 100 * 1.1 * pumpEnergyUseFactor;
  const expectedStorageLoss = 0.8 * 1.1 * (3 / 1000) * (55 - 20) * 744;

  close(distributionResult.lossKWh, expectedDistributionLoss);
  close(distributionResult.auxiliaryKWh, expectedAuxiliary);
  close(storageResult.lossKWh, expectedStorageLoss);
  assert.equal(distributionResult.lossSource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(distributionResult.auxiliarySource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(storageResult.lossSource.classification, "NUMERICALLY_IMPLEMENTED");

  const html = renderEngineeringModelReview(preview);
  assert.equal(html.includes("calculat normativ"), true);
});

await test("wizard maps heating component contracts to calculated Chapter 3 stage inputs", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    chapter3_heating_component_mode: "component_contract",
    chapter3_heating_storage_mode: "no_storage",
    chapter3_heating_operation_hours_month: "120",
    chapter3_heating_emission_temp_increase_k: "1.25",
    chapter3_heating_indoor_temp_c: "20",
    chapter3_heating_combined_outdoor_temp_c: "-5",
    chapter3_heating_pump_component_factor: "0.2",
    chapter3_heating_pump_linear_pressure_kpa_m: "0.05",
    chapter3_heating_pump_circuit_length_m: "35",
    chapter3_heating_pump_additional_pressure_kpa: "6",
    chapter3_heating_pump_flow_m3h: "1.6",
    chapter3_heating_pump_load_factor: "0.5",
    chapter3_heating_pump_correction_factor: "1.1",
    chapter3_heating_pump_cp1: "0.25",
    chapter3_heating_pump_cp2: "0.75",
    chapter3_heating_pump_eei: "0.23",
    chapter3_heating_pump_recoverable_fraction: "0.3",
    chapter3_heating_pump_setback_power_kw: "0.03",
    chapter3_heating_pump_setback_hours_month: "40",
    chapter3_heating_pump_boost_hours_month: "5",
    chapter3_heating_generator_nominal_kw: "24",
    chapter3_heating_generator_intermediate_kw: "8",
    chapter3_heating_generator_nominal_load_factor: "1",
    chapter3_heating_generator_loss_power_nominal_kw: "1.2",
    chapter3_heating_generator_loss_power_intermediate_kw: "0.4",
    chapter3_heating_generator_envelope_loss_fraction_percent: "1.5",
    chapter3_heating_generator_chimney_off_loss_fraction_percent: "0.5",
    chapter3_heating_generator_delivered_power_kw: "24",
    chapter3_heating_generator_envelope_recoverable_fraction: "0.2",
    chapter3_heating_generator_aux_power_standby_kw: "0.02",
    chapter3_heating_generator_aux_power_intermediate_kw: "0.08",
    chapter3_heating_generator_aux_power_nominal_kw: "0.12",
    chapter3_heating_generator_aux_recovered_product_fraction: "0.25",
    chapter3_heating_generator_boiler_room_recovery_factor: "0.1"
  };
  const answers = mapWizardAnswersToAssistedAnswers(formData(values));
  const heatingStages = answers.technicalSystems.heating.systems[0].stages;
  const emission = heatingStages.find(stage => stage.stageId === "emission");
  const distribution = heatingStages.find(stage => stage.stageId === "distribution");
  const storage = heatingStages.find(stage => stage.stageId === "storage");
  const generation = heatingStages.find(stage => stage.stageId === "generation");

  assert.equal(emission.lossKWhPerMonth, undefined);
  assert.equal(emission.lossCalculation.mode, "heating_emission_temperature_increase");
  assert.equal(distribution.auxiliaryKWhPerMonth, undefined);
  assert.equal(distribution.auxiliaryCalculation.mode, "heating_hydronic_pump_auxiliary");
  assert.equal(distribution.auxiliaryCalculation.setbackPumpPowerKW, 0.03);
  assert.equal(distribution.auxiliaryCalculation.boostCalculationHours, 5);
  assert.equal(storage.lossKWhPerMonth, undefined);
  assert.equal(storage.lossCalculation.mode, "no_heating_storage");
  assert.equal(generation.lossKWhPerMonth, undefined);
  assert.equal(generation.auxiliaryKWhPerMonth, undefined);
  assert.equal(generation.lossCalculation.mode, "heating_generator_loss_power_curve");
  assert.equal(generation.lossCalculation.envelopeLossFractionPercent, 1.5);
  assert.equal(generation.lossCalculation.envelopeLossFraction, 0.2);
  assert.equal(generation.auxiliaryCalculation.mode, "heating_generator_auxiliary_power_curve");

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  const januaryHeating = preview.calculation.chapter3Result.monthly[0].heating;
  const emissionResult = januaryHeating.stageResults.find(stage => stage.stageId === "emission");
  const distributionResult = januaryHeating.stageResults.find(stage => stage.stageId === "distribution");
  const storageResult = januaryHeating.stageResults.find(stage => stage.stageId === "storage");
  const generationResult = januaryHeating.stageResults.find(stage => stage.stageId === "generation");

  assert.equal(emissionResult.lossSource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(distributionResult.auxiliarySource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(storageResult.lossSource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(generationResult.lossSource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(generationResult.auxiliarySource.classification, "NUMERICALLY_IMPLEMENTED");
});

await test("wizard maps ventilation auxiliary component contracts to calculated Chapter 3 inputs", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    chapter3_ventilation_heat_recovery_mode: "rotary_heat_recovery_auxiliary",
    chapter3_ventilation_rotary_power_kw: "0.1",
    chapter3_ventilation_rotation_ratio: "0.5",
    chapter3_ventilation_preheat_mode: "no_preheater",
    chapter3_ventilation_control_mode: "control_auxiliary_energy",
    chapter3_ventilation_controller_power_kw: "0.02",
    chapter3_ventilation_control_operation_factor: "0.5"
  };
  const answers = mapWizardAnswersToAssistedAnswers(formData(values));
  const ventilation = answers.technicalSystems.ventilationAhu.systems[0];

  assert.equal(ventilation.heatRecoveryAuxiliaryKWhPerMonth, undefined);
  assert.equal(ventilation.heatRecoveryAuxiliaryCalculation.mode, "rotary_heat_recovery_auxiliary");
  assert.equal(ventilation.preheatAuxiliaryKWhPerMonth, undefined);
  assert.equal(ventilation.preheatAuxiliaryCalculation.mode, "no_preheater");
  assert.equal(ventilation.controlAuxiliaryKWhPerMonth, undefined);
  assert.equal(ventilation.controlAuxiliaryCalculation.mode, "control_auxiliary_energy");

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  const januaryVentilation = preview.calculation.chapter3Result.monthly[0].ventilation;
  assert.equal(januaryVentilation.sources.heatRecoveryAuxiliary.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(januaryVentilation.sources.preheatAuxiliary.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(januaryVentilation.sources.controlAuxiliary.classification, "NUMERICALLY_IMPLEMENTED");
});

await test("wizard maps cooling component contracts to calculated Chapter 3 stage inputs", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    chapter3_cooling_component_mode: "component_contract",
    chapter3_cooling_distribution_loss_factor: "0.05",
    chapter3_cooling_distribution_aux_factor: "0.02",
    chapter3_cooling_ahu_output_kwh: "2",
    chapter3_cooling_storage_mode: "thermal_storage",
    chapter3_cooling_storage_loss_h_kw_k: "0.01",
    chapter3_cooling_storage_ambient_c: "30",
    chapter3_cooling_storage_temp_c: "10",
    chapter3_cooling_storage_hours_month: "100",
    chapter3_cooling_storage_pump_flow_m3h: "2",
    chapter3_cooling_storage_pump_power_kw: "0.1",
    chapter3_cooling_storage_supply_c: "6",
    chapter3_cooling_storage_return_c: "11",
    chapter3_cooling_storage_medium_cp_kwh_kgk: "0.00116",
    chapter3_cooling_storage_medium_density_kg_m3: "1000",
    chapter3_cooling_generation_mode: "compression_heat_rejection",
    chapter3_cooling_operation_hours_month: "240",
    chapter3_cooling_generator_nominal_kw: "20",
    chapter3_cooling_generator_nominal_eer: "3",
    chapter3_cooling_eer_correction_factor: "1",
    chapter3_cooling_heat_rejection_aux_mode: "specific_electric_demand",
    chapter3_cooling_heat_rejection_specific_key: "wet_closed_axial_no_extra_silencer",
    chapter3_cooling_heat_rejection_pl_control_key: "variable_water_temperature",
    chapter3_cooling_heat_rejection_pl_type_key: "wet_or_hybrid_wet",
    chapter3_cooling_free_cooling_electric_factor: "1",
    chapter3_cooling_heat_rejection_distribution_mode: "specific_electric_demand",
    chapter3_cooling_heat_rejection_distribution_specific_kw_kw: "0.003",
    chapter3_cooling_control_power_kw: "0.02",
    chapter3_cooling_generation_aux_recovered_fraction: "0.1"
  };
  const answers = mapWizardAnswersToAssistedAnswers(formData(values));
  const coolingSystem = answers.technicalSystems.cooling.systems[0];
  const distribution = coolingSystem.stages.find(stage => stage.stageId === "distribution");
  const storage = coolingSystem.stages.find(stage => stage.stageId === "storage");
  const generation = coolingSystem.stages.find(stage => stage.stageId === "generation");

  assert.equal(distribution.lossKWhPerMonth, undefined);
  assert.equal(distribution.lossCalculation.mode, "cooling_distribution_factor");
  assert.equal(distribution.auxiliaryCalculation.mode, "cooling_distribution_factor");
  assert.equal(storage.lossKWhPerMonth, undefined);
  assert.equal(storage.lossCalculation.mode, "cooling_storage_thermal_losses");
  assert.equal(storage.auxiliaryCalculation.mode, "cooling_storage_pump_auxiliary");
  assert.equal(generation.auxiliaryKWhPerMonth, undefined);
  assert.equal(generation.auxiliaryCalculation.mode, "cooling_compression_heat_rejection_auxiliary");

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  const januaryCooling = preview.calculation.chapter3Result.monthly[0].cooling;
  const januaryDistribution = januaryCooling.stageResults.find(stage => stage.stageId === "distribution");
  const januaryStorage = januaryCooling.stageResults.find(stage => stage.stageId === "storage");
  const januaryGeneration = januaryCooling.stageResults.find(stage => stage.stageId === "generation");
  assert.equal(januaryDistribution.lossSource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(januaryDistribution.auxiliarySource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(januaryStorage.lossSource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(januaryStorage.auxiliarySource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(januaryGeneration.auxiliarySource.classification, "NUMERICALLY_IMPLEMENTED");
  assert.equal(
    januaryGeneration.auxiliarySource.formulaIds.includes("MC001_3_180_COOLING_GENERATOR_AUXILIARY_TOTAL"),
    true
  );
});

await test("demo installation configurations have fixed 12-month Chapter 3 expected outputs", () => {
  const cases = [
    {
      id: "complex_cooling_pcm_dhw_leni",
      values: ASSISTED_WIZARD_DEMO_FIXTURE.values,
      expected: {
        heatingInputKWh: 13121.884131914338,
        coolingInputKWh: 147.70967139753265,
        dhwInputKWh: 1248,
        ventilationAuxiliaryKWh: 88.85454545454546,
        pcmInputEnergyLimitKWh: 2.3999999999969277,
        lightingEnergyKWh: 240
      }
    },
    {
      id: "conventional_heating_dhw_only",
      values: {
        ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
        chapter3_cooling_enabled: "no",
        chapter3_ventilation_ahu_enabled: "no",
        chapter3_pcm_enabled: "no",
        chapter3_lighting_enabled: "no"
      },
      expected: {
        heatingInputKWh: 13121.884131914338,
        coolingInputKWh: 0,
        dhwInputKWh: 1248,
        ventilationAuxiliaryKWh: 0,
        pcmInputEnergyLimitKWh: 0,
        lightingEnergyKWh: 0
      }
    },
    {
      id: "heat_pump_cooling_ahu",
      values: {
        ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
        chapter3_heating_generator_type: "heat_pump",
        chapter3_heating_energy_carrier: "electricity",
        chapter3_dhw_enabled: "no",
        chapter3_pcm_enabled: "no",
        chapter3_lighting_enabled: "no"
      },
      expected: {
        heatingInputKWh: 13121.884131914338,
        coolingInputKWh: 147.70967139753265,
        dhwInputKWh: 0,
        ventilationAuxiliaryKWh: 88.85454545454546,
        pcmInputEnergyLimitKWh: 0,
        lightingEnergyKWh: 0
      }
    }
  ];

  for (const item of cases) {
    const preview = buildWizardEngineeringPreview(
      mapWizardAnswersToAssistedAnswers(formData(item.values))
    );
    assert.equal(preview.status, "ready", item.id);
    assert.equal(preview.calculation.chapter3Result.monthly.length, 12, item.id);
    for (const [key, expected] of Object.entries(item.expected)) {
      close(preview.calculation.chapter3Result.annual[key], expected);
    }
  }
});

await test("period and structural helpers are deterministic", () => {
  assert.equal(constructionPeriodFromYear(1950), "before_1960");
  assert.equal(constructionPeriodFromYear(1970), "1960_1977");
  assert.equal(constructionPeriodFromYear(1985), "1978_1990");
  assert.equal(constructionPeriodFromYear(2000), "1991_2005");
  assert.equal(constructionPeriodFromYear(2012), "after_2005");
  assert.equal(structuralSystemFromWallMaterial("wood"), "timber");
  assert.equal(structuralSystemFromWallMaterial("concrete"), "reinforced_concrete_frames");
  assert.equal(structuralSystemFromWallMaterial("brick"), "masonry");
});

await test("wizard preview calls Building DNA and Chapter 2 authority", () => {
  const preview = buildWizardEngineeringPreview(mapWizardAnswersToAssistedAnswers(formData({
    building_platform_demo_mode: "1",
    building_platform_demo_fixture_id: "demo_detached_masonry_1985_eps_pvc_bucharest",
    building_type: "house",
    climate_profile_id: "ro_synthetic_bucharest_seasonal_demo_v1",
    county: "Bucuresti",
    climate_zone: "II",
    wind_zone: "II",
    construction_year: "1985",
    wall_material: "brick",
    wall_insulation: "10cm",
    window_type: "modern_double_glazing",
    roof_type: "unheated_attic",
    floor_type: "on_ground"
  })));

  assert.equal(preview.status, "ready");
  assert.equal(preview.scope, "building_knowledge_platform_p2_review_mvp");
  assert.equal(preview.technicalWorkspace.status, "ready");
  assert.equal(preview.technicalWorkspace.scope, "engineering_calculation_notebook_p3g_report_generation_only");
  assert.equal(preview.buildingDna.schema, "building_dna_v1");
  assert.equal(preview.dependencyTree.physicsAuthority, "Chapter 2 physics engine");
  assert.equal(preview.buildingDna.climateProfile.profileId, "ro_synthetic_bucharest_seasonal_demo_v1");
  assert.equal(preview.buildingDna.climate.climateZone, "II");
  assert.equal(preview.buildingDna.climate.datasetVersion, "mc001_2022_climate_zones_p5a_v1");
  assert.equal(preview.buildingDna.calculationStatus, "synthetic_demo");
  assert.equal(preview.summary.annualQHnd > 0, true);
  assert.equal(preview.summary.annualQCnd > 0, true);

  const html = renderEngineeringModelReview(preview);
  for (const expected of [
    "Rezultate principale",
    "Caiet de calcule ingineresti",
    "Calcule in ordinea dependentelor",
    "Amprenta calcul",
    "Necesar anual de incalzire QHnd",
    "Necesar anual de racire QCnd",
    "R_caramida :=",
    "U_ext_wall :=",
    "QtrH_ianuarie :=",
    "QveH_ianuarie :=",
    "QHgn_ianuarie :=",
    "QHnd_an :=",
    "QCnd_an :=",
    "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH",
    "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND"
  ]) {
    assert.equal(html.includes(expected), true, expected);
  }
  for (const forbidden of [
    "Platforma de cunostinte",
    "Flux verificabil",
    "TECHNICAL WORKSPACE",
    "Chapter 2 authority",
    "Formula viewer"
  ]) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
});

await test("save payload sends canonical Building DNA to the server-side calculation endpoint", () => {
  const data = formData(ASSISTED_WIZARD_DEMO_FIXTURE.values);
  const preview = buildWizardEngineeringPreview(mapWizardAnswersToAssistedAnswers(data));
  const payload = buildBuildingPlatformSavePayload(preview, data, {
    dataset: {
      currentHouseId: "42"
    }
  });

  assert.equal(payload.ok, true);
  assert.equal(payload.value.house_id, 42);
  assert.equal(payload.value.project_name, ASSISTED_WIZARD_DEMO_FIXTURE.values.display_name);
  assert.equal(payload.value.building_dna.schema, "building_dna_v1");
  assert.equal(Object.prototype.hasOwnProperty.call(payload.value, "chapter2_result"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.value, "technical_report"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.value, "annualQHnd"), false);
});

await test("save action persists Building DNA through the authenticated API client", async () => {
  const root = fakeRootForSave();
  const calls = [];
  const result = await saveBuildingPlatformChapter2Analysis(root, {
    formData: formData(ASSISTED_WIZARD_DEMO_FIXTURE.values),
    apiClient: async (path, payload) => {
      calls.push({ path, payload });
      if (path === "/api/building-platform/v1/projects/create") {
        return {
          success: true,
          project: { project_id: "bp-project-ui" },
          concurrency_token: "projecttoken-ui"
        };
      }
      return {
        success: true,
        project: {
          project_id: "bp-project-ui"
        },
        concurrency_token: "projecttoken-saved",
        buildingDnaVersion: {
          building_dna_version_id: "dna-version-ui"
        },
        analysisVersion: {
          analysis_version_id: "analysis-version-ui"
        },
        result_summary: {
          annualQHnd: 9400,
          annualQCnd: 8
        }
      };
    }
  });

  assert.equal(result.saved, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].path, "/api/building-platform/v1/projects/create");
  assert.equal(calls[1].path, "/api/building-platform/v1/permanent-save");
  assert.equal(calls[1].payload.building_dna.schema, "building_dna_v1");
  assert.equal(calls[1].payload.calculation_fingerprint.startsWith("analysis_"), true);
  assert.equal(calls[1].payload.report_fingerprint, calls[1].payload.calculation_fingerprint);
  assert.equal(root.status.dataset.state, "ready");
  assert.equal(root.status.textContent.includes("analysis-version-ui"), true);
  assert.equal(root.preview.innerHTML.includes("Raport tehnic generat"), true);
});

await test("draft save uses mutable v1 draft endpoint without permanent version payload", async () => {
  const root = fakeRootForSave();
  const calls = [];
  const result = await saveBuildingPlatformDraft(root, {
    formData: formData(ASSISTED_WIZARD_DEMO_FIXTURE.values),
    apiClient: async (path, payload) => {
      calls.push({ path, payload });
      if (path === "/api/building-platform/v1/projects/create") {
        return {
          success: true,
          project: { project_id: "bp-project-draft-ui" },
          concurrency_token: "projecttoken-draft"
        };
      }
      return {
        success: true,
        draft: {
          draft_id: "draft-ui",
          draft_fingerprint: "draft_fp"
        }
      };
    }
  });

  assert.equal(result.saved, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].path, "/api/building-platform/v1/drafts/save");
  assert.equal(calls[1].payload.building_dna.schema, "building_dna_v1");
  assert.equal(Object.prototype.hasOwnProperty.call(calls[1].payload, "report_fingerprint"), false);
  assert.equal(root.status.textContent.includes("Draft salvat"), true);
});

await test("save action blocks when no authenticated API client is available", async () => {
  const root = fakeRootForSave();
  const result = await saveBuildingPlatformChapter2Analysis(root, {
    formData: formData(ASSISTED_WIZARD_DEMO_FIXTURE.values)
  });

  assert.equal(result.saved, false);
  assert.equal(result.reason, "missing_authenticated_api_client");
  assert.equal(root.status.dataset.state, "blocked");
});

await test("saved Building DNA maps back into supported wizard fields with load provenance", () => {
  const data = formData(ASSISTED_WIZARD_DEMO_FIXTURE.values);
  const preview = buildWizardEngineeringPreview(mapWizardAnswersToAssistedAnswers(data));
  const values = buildingDnaToWizardValues(preview.buildingDna);
  assert.equal(values.climate_profile_id, "ro_synthetic_bucharest_seasonal_demo_v1");
  assert.equal(values.building_use_category, "residential_single_family");
  assert.equal(values.useful_area_m2, 120);
  assert.equal(values.window_type, "modern_double_glazing");
  assert.equal(values.wall_insulation, "10cm");

  const form = fakeWizardForm([
    "display_name",
    "building_type",
    "building_use_category",
    "locality_id",
    "climate_station_id",
    "city",
    "climate_profile_id",
    "construction_year",
    "useful_area_m2",
    "window_type",
    "wall_insulation"
  ]);
  const applied = applyBuildingDnaToWizardForm(form, preview.buildingDna);
  assert.equal(applied.applied, true);
  const byName = Object.fromEntries(form.controls.map(control => [control.name, control]));
  assert.equal(byName.locality_id.value, "ro_bucuresti");
  assert.equal(byName.climate_station_id.value, "mc001_6_2013_bucuresti");
  assert.equal(byName.climate_profile_id.value, "ro_synthetic_bucharest_seasonal_demo_v1");
  assert.equal(byName.building_use_category.value, "residential_single_family");
  assert.equal(byName.useful_area_m2.value, 120);
  assert.equal(byName.window_type.value, "modern_double_glazing");
  assert.equal(byName.wall_insulation.value, "10cm");
  assert.equal(byName.climate_profile_id.dataset.provenanceOrigin, "saved_building_dna");
  assert.equal(byName.climate_profile_id.dataset.confirmationStatus, "loaded_saved_analysis");
});

await test("loaded Building Platform analysis renders persisted report metadata", () => {
  const data = formData(ASSISTED_WIZARD_DEMO_FIXTURE.values);
  const preview = buildWizardEngineeringPreview(mapWizardAnswersToAssistedAnswers(data));
  const html = renderLoadedBuildingPlatformAnalysis({
    success: true,
    house_id: 7,
    analysis_id: 100,
    building_dna: preview.buildingDna,
    building_dna_version: {
      versionId: "building-dna-100",
      calculationStatus: "synthetic_demo"
    },
    technical_report: preview.technicalWorkspace.report,
    technical_details: {
      resultSummary: preview.technicalWorkspace.resultSummary
    }
  });

  assert.equal(html.includes("Analiza Building Platform incarcata"), true);
  assert.equal(html.includes("building-dna-100"), true);
  assert.equal(html.includes("Raport tehnic incarcat"), true);
  assert.equal(html.includes(preview.technicalWorkspace.resultSummary.annualQHnd.toFixed(2)), true);
});

await test("load action restores Building DNA and persisted report through authenticated API", async () => {
  const data = formData(ASSISTED_WIZARD_DEMO_FIXTURE.values);
  const preview = buildWizardEngineeringPreview(mapWizardAnswersToAssistedAnswers(data));
  const form = fakeWizardForm([
    "locality_id",
    "climate_station_id",
    "climate_profile_id",
    "useful_area_m2",
    "window_type",
    "wall_insulation"
  ]);
  const root = fakeRootForLoad(form);
  const calls = [];

  const result = await loadBuildingPlatformChapter2Analysis(root, {
    apiClient: async (path, payload) => {
      calls.push({ path, payload });
      return {
        success: true,
        house_id: 7,
        analysis_id: 100,
        building_dna: preview.buildingDna,
        building_dna_version: {
          versionId: "building-dna-100",
          calculationStatus: "synthetic_demo"
        },
        technical_report: preview.technicalWorkspace.report,
        technical_details: {
          resultSummary: preview.technicalWorkspace.resultSummary
        }
      };
    }
  });

  assert.equal(result.loaded, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/building-platform/chapter2/load");
  assert.deepEqual(calls[0].payload, { analysis_id: 100 });
  assert.equal(form.dataset.currentHouseId, "7");
  assert.equal(form.dataset.currentAnalysisId, "100");
  assert.equal(form.dataset.loadedBuildingDnaVersionId, "building-dna-100");
  assert.equal(form.controls.find(control => control.name === "locality_id").value, "ro_bucuresti");
  assert.equal(form.controls.find(control => control.name === "climate_station_id").value, "mc001_6_2013_bucuresti");
  assert.equal(form.controls.find(control => control.name === "climate_profile_id").value, "ro_synthetic_bucharest_seasonal_demo_v1");
  assert.equal(root.preview.innerHTML.includes("Raport tehnic incarcat"), true);
  assert.equal(root.status.dataset.state, "ready");
});

await test("load action blocks without auth or a valid analysis id", async () => {
  const form = fakeWizardForm(["climate_profile_id"]);
  const root = fakeRootForLoad(form);
  const noAuth = await loadBuildingPlatformChapter2Analysis(root);
  assert.equal(noAuth.loaded, false);
  assert.equal(noAuth.reason, "missing_authenticated_api_client");
  assert.equal(root.status.dataset.state, "blocked");

  root.analysisInput.value = "0";
  const invalid = await loadBuildingPlatformChapter2Analysis(root, {
    apiClient: async () => ({ success: true })
  });
  assert.equal(invalid.loaded, false);
  assert.equal(invalid.reason, "invalid_analysis_id");
});

await test("saved project URL parameter is parsed for dashboard reopen links", () => {
  assert.equal(analysisIdFromSearch("?analysis_id=321"), 321);
  assert.equal(analysisIdFromSearch("?analysis_id=0"), null);
  assert.equal(analysisIdFromSearch("?demo=1"), null);
  assert.equal(projectIdFromSearch("?project_id=bp-project-321"), "bp-project-321");
  assert.equal(projectIdFromSearch("?project_id=bad/value"), null);
});

await test("My Projects rows open the canonical calculator without exposing unsupported domains", () => {
  const html = renderProjectRows([{
    project_name: "Casa zidarie 1985",
    building_type: "house",
    useful_area_m2: 120,
    locality: "Bucuresti",
    climate_profile_id: "ro_synthetic_bucharest_seasonal_demo_v1",
    climate_profile_version: "climate_profile_v1",
    calculation_status: "estimated",
    project_id: "bp-project-321",
    permanent_version_count: 2,
    annualQHnd: 1234.56,
    annualQCnd: 78.9
  }]);

  assert.equal(projectStatusLabel({ calculation_status: "estimated" }), "Estimativ");
  assert.equal(html.includes("Casa zidarie 1985"), true);
  assert.equal(html.includes("pages/analiza-casa.html?project_id=bp-project-321"), true);
  assert.equal(html.includes("1234.6 kWh"), true);
  assert.equal(html.includes("78.9 kWh"), true);
  for (const forbidden of ["primaryEnergy", "CO2", "certificate", "savings"]) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
});

await test("demo fixture remains test-only and is not exposed by production HTML", () => {
  assert.equal(demoModeFromSearch("?demo=1"), true);
  assert.equal(demoModeFromSearch("?new=1"), false);

  const fixture = getAssistedWizardDemoFixture();
  const pageHtml = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  assert.equal(fixture.fixtureId, ASSISTED_WIZARD_DEMO_FIXTURE.fixtureId);
  assert.equal(fixture.provenance.origin, "demo_fixture");
  assert.equal(fixture.provenance.confirmationStatus, "unconfirmed_demo");
  assert.equal(fixture.provenance.editable, true);

  for (const field of [
    "building_platform_demo_mode",
    "building_platform_demo_fixture_id",
    "climate_profile_id",
    "locality_id",
    "climate_station_id",
    "building_type",
    "building_use_category",
    "construction_year",
    "useful_area_m2",
    "number_of_floors",
    "floor_height_m",
    "heated_volume_m3",
    "exterior_wall_area_m2",
    "roof_area_m2",
    "ground_floor_area_m2",
    "attic_ceiling_area_m2",
    "adjacent_wall_area_m2",
    "city",
    "structural_system",
    "wall_material",
    "wall_insulation",
    "window_type",
    "window_area_m2",
    "door_area_m2",
    "roof_type",
    "floor_type",
    "ventilation_type",
    "ventilation_ach"
  ]) {
    assert.notEqual(fixture.values[field], undefined, field);
    assert.notEqual(fixture.values[field], "", field);
    if (!field.startsWith("building_platform_demo_")) {
      assert.equal(pageHtml.includes(`name="${field}"`), true, field);
    }
  }

  assert.equal(pageHtml.includes("building_platform_demo_mode"), false);
  assert.equal(pageHtml.includes("building_platform_demo_fixture_id"), false);
  assert.equal(pageHtml.includes("loadDemoModeBtn"), false);

  for (const field of [
    "construction_year",
    "useful_area_m2",
    "number_of_floors",
    "floor_height_m",
    "heated_volume_m3",
    "exterior_wall_area_m2",
    "roof_area_m2",
    "ground_floor_area_m2",
    "attic_ceiling_area_m2",
    "adjacent_wall_area_m2",
    "door_area_m2",
    "window_area_m2",
    "ventilation_ach"
  ]) {
    assert.equal(Number.isFinite(Number(fixture.values[field])), true, field);
  }

  const answers = mapWizardAnswersToAssistedAnswers(formData(fixture.values));
  assert.equal(answers.source.origin, "demo_fixture");
  assert.equal(answers.source.confirmationStatus, "unconfirmed_demo");
  assert.equal(answers.source.editable, true);
  assert.equal(answers.buildingType, "detached_house");
  assert.equal(answers.buildingUseCategory, "residential_single_family");
  assert.equal(answers.internalGainsCategoryId, "residential_single_family");
  assert.equal(answers.constructionPeriod, "1978_1990");
  assert.equal(answers.structuralSystem, "masonry");
  assert.equal(answers.wallMaterial, "brick");
  assert.equal(answers.renovations.wallInsulation, "eps");
  assert.equal(answers.renovations.wallInsulationThicknessM, 0.1);
  assert.equal(answers.renovations.windowsReplaced, true);
  assert.equal(answers.climateProfileId, "ro_synthetic_bucharest_seasonal_demo_v1");
  assert.equal(answers.climateProfile.sourceType, "synthetic_demo_profile");
  assert.equal(answers.monthlyProfiles, undefined);
  assert.equal(answers.allowSyntheticClimate, true);
  assert.equal(answers.buildingSpecificParameters.usefulFloorAreaM2, 120);
  assert.equal(answers.buildingSpecificParameters.windowAreaM2, 8);
  assert.equal(answers.buildingSpecificParameters.ventilationAch, 0.6);
  assert.equal(answers.buildingSpecificParameters.heatedVolumeM3, 312);
  assert.equal(answers.geometry.exteriorWallAreaM2, 50);
  assert.equal(answers.geometry.roofAreaM2, 120);
  assert.equal(answers.geometry.groundFloorAreaM2, 120);
  assert.equal(answers.geometry.doorAreaM2, 2);

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  assert.equal(preview.buildingDna.source.origin, "demo_fixture");
  assert.equal(preview.buildingDna.demoFixture.fixtureId, fixture.fixtureId);
  assert.equal(preview.buildingDna.demoFixture.confirmationStatus, "unconfirmed_demo");
  assert.equal(preview.buildingDna.climateProfile.sourceType, "synthetic_demo_profile");
  assert.equal(preview.buildingDna.climateProfile.verificationStatus, "synthetic_demo_not_verified");
  assert.equal(preview.buildingDna.buildingSpecificParameters.usefulFloorAreaM2.provenance.origin, "demo_fixture");
  assert.equal(preview.review.renovationInterventions[0].provenance.origin, "demo_fixture");
  assert.equal(preview.summary.annualQHnd > 0, true);
  assert.equal(preview.summary.annualQCnd > 0, true);

  const html = renderEngineeringModelReview(preview, { openReport: true });
  assert.equal(html.includes("Raport tehnic generat"), true);
  assert.equal(html.includes("data-technical-report-success"), true);
  assert.equal(html.includes("data-engineering-calculation-notebook"), true);
  assert.equal(html.includes("technical-report-chapter\" open"), false);
  assert.equal(html.includes("<details"), false);
  assert.equal(html.includes("Registru de variabile utilizate"), false);
  assert.equal(html.includes("QtrH_ianuarie :="), true);
  assert.equal(html.includes("QHnd_an :="), true);
  assert.equal(html.includes("Necesar anual de incalzire QHnd"), true);
  assert.equal(html.includes("Necesar anual de racire QCnd"), true);
});

await test("wizard marks current results stale after an upstream input changes", () => {
  const form = fakeWizardForm(["window_orientation"]);
  const root = fakeRootForStale(form);
  form.controls[0].value = "south";
  form.dataset.currentCalculationFingerprint = "abc123";
  form.dataset.currentInputSnapshot = JSON.stringify([["window_orientation", "south"]]);

  form.controls[0].value = "north";
  const stale = markBuildingPlatformResultsStale(root, "orientation_changed");

  assert.equal(stale.stale, true);
  assert.equal(form.dataset.currentResultStale, "1");
  assert.equal(form.dataset.currentStaleReason, "orientation_changed");
  assert.equal(root.preview.dataset.resultState, "stale");
  assert.equal(root.preview.innerHTML.includes("Date modificate - rezultatele trebuie recalculate"), true);
  assert.equal(root.status.textContent.includes("Date modificate"), true);
});

await test("normal wizard mode does not receive demo defaults or demo provenance", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    building_type: "",
    construction_year: "",
    wall_material: "",
    structural_system: "",
    building_use_category: "",
    wall_insulation: "",
    window_type: "",
    roof_type: "",
    floor_type: ""
  }));
  assert.equal(answers.source.origin, undefined);
  assert.equal(answers.source.fixtureId, undefined);
  assert.equal(answers.climateProfileId, undefined);
  assert.equal(answers.monthlyProfiles, undefined);
  assert.equal(answers.buildingType, undefined);
  assert.equal(answers.constructionPeriod, undefined);
  assert.equal(answers.structuralSystem, undefined);
  assert.equal(answers.buildingUseCategory, undefined);
  assert.equal(answers.buildingSpecificParameters.atticContext, undefined);
  assert.equal(answers.buildingSpecificParameters.basementContext, undefined);
  assert.deepEqual(answers.context, {});
  assert.equal(answers.buildingSpecificParameters.usefulFloorAreaM2, undefined);
  assert.equal(answers.buildingSpecificParameters.windowAreaM2, undefined);
  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "blocked");
  assert.equal(preview.diagnostics.blockers.some(item => item.code === "building_typology_invalid_building_type"), true);
});

await test("P9B derives heated volume from assisted geometry without treating missing as zero", () => {
  const derived = mapWizardAnswersToAssistedAnswers(formData({
    useful_area_m2: "120",
    floor_height_m: "2.6"
  }));
  assert.equal(derived.buildingSpecificParameters.heatedVolumeM3, 312);

  const explicitExpertOverride = mapWizardAnswersToAssistedAnswers(formData({
    useful_area_m2: "120",
    floor_height_m: "2.6",
    heated_volume_m3: "300"
  }));
  assert.equal(explicitExpertOverride.buildingSpecificParameters.heatedVolumeM3, 300);

  const missing = mapWizardAnswersToAssistedAnswers(formData({
    useful_area_m2: "120",
    floor_height_m: ""
  }));
  assert.equal(missing.buildingSpecificParameters.heatedVolumeM3, undefined);
});

await test("P9B derives residential DHW useful-demand contract from building use", () => {
  const house = mapWizardAnswersToAssistedAnswers(formData({
    chapter3_installations_enabled: "yes",
    chapter3_dhw_enabled: "yes",
    building_type: "house",
    building_use_category: "residential_single_family",
    useful_area_m2: "120"
  }));
  assert.equal(house.technicalSystems.domesticHotWater.usefulDemandSource.mode, "residential_normative");
  assert.equal(house.technicalSystems.domesticHotWater.usefulDemandSource.dwellingType, "single_family_or_terraced");
  assert.equal(house.technicalSystems.domesticHotWater.usefulDemandSource.source.origin, "building_use_derived");

  const apartment = mapWizardAnswersToAssistedAnswers(formData({
    chapter3_installations_enabled: "yes",
    chapter3_dhw_enabled: "yes",
    building_type: "apartment",
    building_use_category: "residential_collective",
    useful_area_m2: "72"
  }));
  assert.equal(apartment.technicalSystems.domesticHotWater.usefulDemandSource.mode, "residential_normative");
  assert.equal(apartment.technicalSystems.domesticHotWater.usefulDemandSource.dwellingType, "apartment");

  const nonResidential = mapWizardAnswersToAssistedAnswers(formData({
    chapter3_installations_enabled: "yes",
    chapter3_dhw_enabled: "yes",
    building_type: "office",
    building_use_category: "administrative",
    useful_area_m2: "240"
  }));
  assert.equal(nonResidential.technicalSystems.domesticHotWater.usefulDemandSource.mode, "explicit_monthly");
  assert.equal(nonResidential.technicalSystems.domesticHotWater.monthlyUsefulDemandKWh, undefined);
});

await test("P9B normal cooling performance inputs map to generation runtime without forcing distribution defaults", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    chapter3_installations_enabled: "yes",
    chapter3_cooling_enabled: "yes",
    chapter3_cooling_generator_type: "split_system",
    chapter3_cooling_energy_carrier: "electricity",
    chapter3_cooling_storage_mode: "no_storage",
    chapter3_cooling_generator_nominal_kw: "3.5",
    chapter3_cooling_generator_nominal_eer: "3.2"
  }));
  const system = answers.technicalSystems.cooling.systems[0];
  const distribution = system.stages.find(stage => stage.stageId === "distribution");
  const storage = system.stages.find(stage => stage.stageId === "storage");
  const generation = system.stages.find(stage => stage.stageId === "generation");

  assert.equal(distribution.lossCalculation, undefined);
  assert.equal(storage.lossCalculation.mode, "no_cooling_storage");
  assert.equal(generation.auxiliaryCalculation.mode, "cooling_compression_heat_rejection_auxiliary");
  assert.equal(generation.auxiliaryCalculation.nominalCoolingPowerKW, 3.5);
  assert.equal(generation.auxiliaryCalculation.nominalEer, 3.2);
});

await test("P9C PV workflow maps explicit production into Building DNA and report without a fabricated generation model", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    pv_installed: "yes",
    pv_annual_production_kwh: "4200"
  };
  const journey = analyzeBuildingPlatformProductJourney(formData(values));
  assert.equal(journey.find(section => section.sectionId === "renewable").state, "complete");

  const answers = mapWizardAnswersToAssistedAnswers(formData(values));
  assert.equal(answers.renewableSystems.photovoltaic.installed, true);
  assert.equal(answers.renewableSystems.photovoltaic.annualProductionKWh, 4200);
  assert.equal(answers.renewableSystems.photovoltaic.source.origin, "product_data");

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  assert.equal(preview.buildingDna.renewableSystems.photovoltaic.annualProductionKWh, 4200);
  assert.equal(preview.renewableSummary.photovoltaic.annualProductionKWh, 4200);
  const html = renderEngineeringModelReview(preview);
  assert.equal(html.includes("Energie regenerabila - PV"), true);
  assert.equal(html.includes("4.160-4.165"), true);
  assert.equal(html.includes("4200.00 kWh/an"), true);

  const payload = buildBuildingPlatformSavePayload(preview, formData(values));
  assert.equal(payload.ok, true);
  assert.equal(payload.value.building_dna.renewableSystems.photovoltaic.annualProductionKWh, 4200);
});

await test("P9C PV installed with missing production remains distinct from zero", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    pv_installed: "yes",
    pv_annual_production_kwh: ""
  };
  const journey = analyzeBuildingPlatformProductJourney(formData(values));
  const renewable = journey.find(section => section.sectionId === "renewable");
  assert.equal(renewable.state, "needs_information");
  assert.deepEqual(renewable.missingFields, ["pv_annual_production_kwh"]);

  const preview = buildWizardEngineeringPreview(
    mapWizardAnswersToAssistedAnswers(formData(values))
  );
  assert.equal(preview.status, "ready");
  assert.equal(preview.renewableSummary.photovoltaic.status, "missing_required_input");
  assert.equal(preview.renewableSummary.photovoltaic.annualProductionKWh, null);
  const html = renderEngineeringModelReview(preview);
  assert.equal(html.includes("PV este activat, dar lipseste productia anuala"), true);
  assert.equal(html.includes("Productie PV</span>"), false);
});

await test("P10 professional workspace exposes navigation, building objects, baseline, scenarios and documents", () => {
  assert.deepEqual(
    P10_WORKSPACE_NAVIGATION.map(item => item.label),
    ["Overview", "Building", "Envelope", "Systems", "Baseline", "Scenarios", "Results", "Documents"]
  );
  assert.equal(P10_SUPPORTED_INTERVENTION_TYPES.length >= 8, true);
  assert.equal(P10_CPE_FIELD_MAPPING.some(field => field.fieldId === "calculation_results"), true);

  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    pv_installed: "yes",
    pv_annual_production_kwh: "2400",
    scenario_name: "Pachet A - anvelopa",
    scenario_wall_insulation: "15cm",
    scenario_roof_insulated: "yes",
    scenario_window_type: "triple_glazing",
    scenario_pv_annual_production_kwh: "3600",
    auditor_name: "Auditor Test",
    auditor_authorization: "Grad I 0000",
    document_identifier: "CPE-TEST-001",
    client_name: "Beneficiar Test",
    document_issue_date: "2026-08-23",
    evidence_exterior_note: "foto exterior in dosar",
    evidence_generator_note: "foto eticheta generator"
  };
  const preview = buildWizardEngineeringPreview(mapWizardAnswersToAssistedAnswers(formData(values)));
  const model = buildProfessionalWorkspaceModel(preview, formData(values));

  assert.equal(model.schema, "professional_auditor_workspace_p10");
  assert.deepEqual(model.architecture, [
    "BUILDING MODEL",
    "BASELINE",
    "CERTIFICATION / RETROFIT SCENARIOS",
    "RESULTS",
    "DOCUMENTS"
  ]);
  assert.equal(model.readiness.status, "ready_for_calculation");
  assert.equal(model.buildingObjects.some(item => item.type === "wall"), true);
  assert.equal(model.buildingObjects.some(item => item.type === "window"), true);
  assert.equal(model.buildingObjects.some(item => item.type === "pv"), true);
  assert.equal(model.baseline.status, "calculated");
  assert.equal(model.scenarios.scenario.name, "Pachet A - anvelopa");
  assert.equal(model.scenarios.scenario.storageMode, "delta_from_baseline");
  assert.ok(model.scenarios.comparison.length > 0);
  assert.equal(model.documents.cpe.officialFieldMappingVerified, false);
  assert.equal(
    model.documents.cpe.fieldMappingStatus,
    "candidate_mapping_requires_official_source_certification"
  );
  assert.equal(model.documents.cpe.officialLayoutVerified, false);
  assert.equal(model.documents.cpe.legalOutputReady, false);
  assert.equal(
    model.documents.cpe.annexes.find(item => item.annexId === "annex_3_photographs").status,
    "metadata_available"
  );

  const html = renderProfessionalWorkspace(preview, { formData: formData(values) });
  assert.equal(html.includes("data-p10-professional-workspace"), true);
  assert.equal(html.includes("Componente fizice ale cladirii"), true);
  assert.equal(html.includes("Scenarii retrofit ca delta fata de baseline"), true);
  assert.equal(html.includes("Centru documente"), true);
  assert.equal(html.includes("Layout-ul oficial ramane de certificat"), true);
});

await test("P10 building object cards do not render missing quantities as zero", () => {
  const preview = {
    status: "blocked",
    diagnostics: { blockers: [] },
    buildingDna: {
      building: {
        buildingType: "house",
        useCategory: "residential_single_family"
      },
      geometry: {},
      buildingSpecificParameters: {},
      assemblies: [],
      envelopeElements: []
    }
  };

  const html = renderProfessionalWorkspace(preview, { formData: formData({}) });

  assert.equal(html.includes("0.00 m2"), false);
  assert.equal(html.includes("0.00 m3"), false);

  const blockedWithFormValues = renderProfessionalWorkspace({
    status: "blocked",
    diagnostics: { blockers: [] },
    buildingDna: {}
  }, {
    formData: formData({
      building_type: "house",
      building_use_category: "residential_single_family",
      useful_area_m2: "120",
      floor_height_m: "2.6",
      window_area_m2: "12",
      window_orientation: "south",
      pv_installed: "yes",
      pv_annual_production_kwh: "3200"
    })
  });

  assert.equal(blockedWithFormValues.includes("120.00 m2"), true);
  assert.equal(blockedWithFormValues.includes("312.00 m3"), true);
  assert.equal(blockedWithFormValues.includes("3200.00 kWh/an"), true);
});

await test("P10 scenario deltas calculate from a baseline snapshot without mutating baseline", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    scenario_name: "Pereti performanti",
    scenario_wall_insulation: "20cm+",
    scenario_pv_annual_production_kwh: "1500"
  };
  const baseline = buildWizardEngineeringPreview(mapWizardAnswersToAssistedAnswers(formData(values)));
  const scenarioRun = buildScenarioPreviewFromFormData(formData(values));

  assert.equal(baseline.status, "ready");
  assert.equal(scenarioRun.status, "calculated");
  assert.equal(scenarioRun.scenario.baseBaselineId, "current-building");
  assert.equal(scenarioRun.scenario.deltas.some(delta => delta.fieldName === "wall_insulation"), true);
  assert.equal(scenarioRun.scenario.deltas.some(delta => delta.fieldName === "pv_annual_production_kwh"), true);
  assert.notEqual(baseline.summary.annualQHnd, scenarioRun.preview.summary.annualQHnd);
  assert.equal(
    scenarioRun.preview.buildingDna.assemblies.find(item => item.assemblyRole === "exterior_wall").displayName.includes("200 mm"),
    true
  );
});

await test("P10 workspace metadata persists through Building DNA and save payload", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    scenario_name: "Pachet B",
    scenario_wall_insulation: "20cm+",
    auditor_name: "Auditor Persistat",
    auditor_authorization: "Autorizatie 123",
    document_identifier: "AUD-123",
    client_name: "Client Persistat",
    evidence_roof_note: "foto acoperis disponibila"
  };
  const preview = buildWizardEngineeringPreview(mapWizardAnswersToAssistedAnswers(formData(values)));
  assert.equal(preview.status, "ready");
  assert.equal(preview.buildingDna.projectWorkspace.schema, "professional_workspace_v1");
  assert.equal(preview.buildingDna.projectWorkspace.scenarios[0].name, "Pachet B");
  assert.equal(preview.buildingDna.projectWorkspace.documents.metadata.auditor.name, "Auditor Persistat");
  assert.equal(preview.buildingDna.projectWorkspace.evidence.photos.some(item => item.note === "foto acoperis disponibila"), true);

  const payload = buildBuildingPlatformSavePayload(preview, formData(values));
  assert.equal(payload.ok, true);
  assert.equal(payload.value.building_dna.projectWorkspace.scenarios[0].storageMode, "delta_from_baseline");

  const form = fakeWizardForm([
    "scenario_name",
    "scenario_wall_insulation",
    "auditor_name",
    "auditor_authorization",
    "document_identifier",
    "client_name",
    "evidence_roof_note"
  ]);
  const applied = applyBuildingDnaToWizardForm(form, preview.buildingDna);
  assert.equal(applied.applied, true);
  const byName = Object.fromEntries(form.controls.map(control => [control.name, control]));
  assert.equal(byName.scenario_name.value, "Pachet B");
  assert.equal(byName.scenario_wall_insulation.value, "20cm+");
  assert.equal(byName.auditor_name.value, "Auditor Persistat");
  assert.equal(byName.evidence_roof_note.value, "foto acoperis disponibila");
});

await test("P10 CPE document model separates workflow, field mapping, layout and legal readiness", () => {
  const values = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    scenario_name: "Recomandare A",
    scenario_roof_insulated: "yes",
    auditor_name: "Auditor CPE",
    auditor_authorization: "AI 42",
    document_identifier: "CPE-42",
    client_name: "Client CPE",
    evidence_exterior_note: "foto exterior"
  };
  const preview = buildWizardEngineeringPreview(mapWizardAnswersToAssistedAnswers(formData(values)));
  const cpe = buildCpeDocumentModel(preview, formData(values));

  assert.equal(cpe.documentType, "energy_performance_certificate_cpe");
  assert.equal(cpe.officialFieldMappingVerified, false);
  assert.equal(cpe.fieldMappingStatus, "candidate_mapping_requires_official_source_certification");
  assert.equal(cpe.officialLayoutVerified, false);
  assert.equal(cpe.legalOutputReady, false);
  assert.equal(cpe.mainCpe.every(field => field.buildingDnaPath), true);
  assert.equal(cpe.annexes.length, 3);
  assert.equal(cpe.buildingUnitHandling.includes("building-unit"), true);
});

await test("P9C production assisted RC path resolves systems and PV but remains truthfully bounded by Qsky/Qsol", () => {
  const values = {
    analysis_input_mode: "assisted",
    display_name: "RC P9C casa asistata",
    locality_id: "ro_bucuresti",
    building_type: "house",
    building_use_category: "residential_single_family",
    construction_year: "1998",
    useful_area_m2: "120",
    number_of_floors: "1",
    floor_height_m: "2.6",
    wall_material: "brick",
    roof_type: "unheated_attic",
    floor_type: "on_ground",
    window_type: "modern_double_glazing",
    window_area_m2: "8",
    window_orientation: "south",
    ventilation_type: "natural",
    ventilation_ach: "0.5",
    wall_insulation: "10cm",
    roof_insulated: "yes",
    floor_insulated: "partial",
    chapter3_installations_enabled: "yes",
    chapter3_heating_enabled: "yes",
    chapter3_dhw_enabled: "yes",
    chapter3_cooling_enabled: "yes",
    chapter3_cooling_generator_type: "split_system",
    chapter3_cooling_energy_carrier: "electricity",
    chapter3_cooling_storage_mode: "no_storage",
    chapter3_cooling_generator_nominal_eer: "3.5",
    chapter3_cooling_generator_nominal_kw: "4",
    chapter3_ventilation_ahu_enabled: "no",
    chapter3_shared_generator_enabled: "yes",
    chapter3_shared_generator_type: "condensing_boiler",
    chapter3_shared_generator_energy_carrier: "natural_gas",
    chapter3_shared_generator_auxiliary_carrier: "electricity",
    chapter3_shared_generator_control_loss_factor: "1.05",
    chapter3_shared_generator_operation_hours_month: "120",
    chapter3_shared_generator_loss_power_kw: "0.12",
    chapter3_shared_generator_auxiliary_power_kw: "0.04",
    chapter3_shared_generator_recovery_mode: "no_recovery",
    chapter3_shared_generator_renewable_heat_mode: "none",
    chapter3_shared_generator_dhw_loss_mode: "none",
    chapter3_shared_generator_heating_allocation_fraction: "0.75",
    chapter3_shared_generator_dhw_allocation_fraction: "0.25",
    chapter3_heating_generator_type: "condensing_boiler",
    chapter3_heating_energy_carrier: "natural_gas",
    chapter3_dhw_energy_carrier: "natural_gas",
    pv_installed: "yes",
    pv_annual_production_kwh: "4200"
  };
  const journey = analyzeBuildingPlatformProductJourney(formData(values));
  assert.deepEqual(
    journey.filter(section => section.state === "needs_information").map(section => section.sectionId),
    []
  );

  const preview = buildWizardEngineeringPreview(
    mapWizardAnswersToAssistedAnswers(formData(values))
  );
  assert.equal(preview.status, "blocked");
  assert.equal(preview.diagnostics.blockers.some(item => item.code === SOLAR_QSOL_QSKY_BLOCKER), true);
  assert.equal(preview.diagnostics.blockers.some(item => item.code === "invalid_shared_generator_component_input"), false);
  assert.equal(preview.renewableSummary.photovoltaic.annualProductionKWh, 4200);
  const html = renderEngineeringModelReview(preview);
  assert.equal(html.includes("Calculul energetic nu poate fi finalizat inca"), true);
  assert.equal(html.includes("Energie regenerabila - PV"), true);
});

await test("building use category maps to source-backed internal gains", () => {
  const baseValues = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    building_platform_demo_mode: "",
    building_platform_demo_fixture_id: "",
    climate_profile_id: "",
    locality_id: "ro_bucuresti",
    climate_station_id: "mc001_6_2013_bucuresti"
  };
  const residential = createBuildingDnaFromAssistedAnswers(
    mapWizardAnswersToAssistedAnswers(formData({
      ...baseValues,
      building_use_category: "residential_single_family"
    }))
  ).buildingDna;
  const administrative = createBuildingDnaFromAssistedAnswers(
    mapWizardAnswersToAssistedAnswers(formData({
      ...baseValues,
      building_use_category: "administrative"
    }))
  ).buildingDna;

  const residentialInternalGain = residential.monthlyProfiles[0].heatGains.internalGains.amount;
  const administrativeInternalGain = administrative.monthlyProfiles[0].heatGains.internalGains.amount;
  assert.equal(residential.building.useCategory, "residential_single_family");
  assert.equal(administrative.building.useCategory, "administrative");
  assert.notEqual(residentialInternalGain, administrativeInternalGain);
  assert.equal(administrative.monthlyProfiles[0].heatGains.internalGains.provenance.metadata.internalGainsSourceTable, "MC001-2022 Tabel 2.15");
});

await test("edited demo values propagate into Building DNA and Chapter 2 results", () => {
  const fixture = getAssistedWizardDemoFixture();
  const originalPreview = buildWizardEngineeringPreview(
    mapWizardAnswersToAssistedAnswers(formData(fixture.values))
  );
  const editedValues = {
    ...fixture.values,
    window_area_m2: "14"
  };
  const editedPreview = buildWizardEngineeringPreview(
    mapWizardAnswersToAssistedAnswers(formData(editedValues))
  );

  assert.equal(editedPreview.status, "ready");
  assert.equal(editedPreview.buildingDna.source.origin, "demo_fixture");
  assert.equal(editedPreview.buildingDna.geometry.windowAreaM2, 14);
  assert.equal(editedPreview.buildingDna.buildingSpecificParameters.windowAreaM2.value, 14);
  assert.notEqual(editedPreview.summary.annualQHnd, originalPreview.summary.annualQHnd);
  assert.notEqual(editedPreview.summary.annualQCnd, originalPreview.summary.annualQCnd);
});

await test("analysis page exposes the P10 professional auditor workspace", () => {
  const html = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
  assert.equal(html.includes("building-platform-wizard.mjs"), true);
  assert.equal(html.includes("buildingModelReview"), true);
  assert.equal(html.includes("buildingModelPreviewBtn"), true);
  assert.equal(html.includes("saveBuildingPlatformAnalysisBtn"), true);
  assert.equal(html.includes("saveBuildingPlatformDraftBtn"), true);
  assert.equal(html.includes("recalculateBuildingPlatformAnalysisBtn"), true);
  assert.equal(html.includes("printTechnicalReportBtn"), true);
  assert.equal(html.includes("p3f-engineering-shell"), true);
  assert.equal(html.includes("Mod simplificat"), false);
  assert.equal(html.includes("productJourneyPanel"), true);
  assert.equal(html.includes("productJourneyStatus"), true);
  assert.equal(html.includes("data-analysis-mode-target=\"assisted\""), true);
  assert.equal(html.includes("data-analysis-mode-target=\"expert\""), true);
  assert.equal(html.includes("p10-professional-workspace"), true);
  assert.equal(html.includes("p10-workspace-nav"), true);
  for (const navItem of P10_WORKSPACE_NAVIGATION) {
    assert.equal(html.includes(`data-workspace-section="${navItem.workspaceId}"`), true, navItem.workspaceId);
    assert.equal(html.includes(`data-step-target="${navItem.targetStep}"`), true, navItem.workspaceId);
    assert.equal(html.includes(navItem.label), true, navItem.label);
  }
  assert.equal(html.includes('class="step" data-section-id="renewable"'), false);
  assert.equal(html.includes("p10-renewables-panel"), true);
  assert.equal(html.includes('name="pv_installed"'), true);
  assert.equal(html.includes("Building model -> baseline -> scenarii retrofit -> rezultate -> documente"), true);
  assert.equal(html.includes("building_use_category"), true);
  assert.equal(html.includes("scenario_name"), true);
  assert.equal(html.includes("scenario_wall_insulation"), true);
  assert.equal(html.includes("auditor_name"), true);
  assert.equal(html.includes("evidence_exterior_note"), true);
  assert.equal(html.includes("buildingPlatformLoadAnalysisId"), true);
  assert.equal(html.includes("loadBuildingPlatformAnalysisBtn"), true);
  assert.equal(html.includes("Redeschidere avansata dupa ID analiza"), true);
  assert.equal(html.includes("buildingPlatformSaveStatus"), true);
  assert.equal(html.includes("demoModeBanner"), false);
  assert.equal(html.includes("demoModeControls"), false);
  assert.equal(html.includes("loadDemoModeBtn"), false);
  assert.equal(html.includes("startBlankProjectBtn"), false);
  assert.equal(html.includes("resetDemoModeBtn"), false);
  assert.equal(html.includes("building_platform_demo_mode"), false);
  assert.equal(html.includes("building_platform_demo_fixture_id"), false);
  assert.equal(html.includes('type="hidden" name="climate_profile_id"'), true);
  assert.equal(html.includes('<select name="climate_profile_id"'), false);
  for (const removedLegacyField of [
    "building_length_m",
    "building_width_m",
    "thermal_mass_class",
    "wall_thickness",
    "wall_insulation_year",
    "roof_insulation_thickness_cm",
    "floor_insulation_thickness_cm",
    "window_age_years",
    "door_replaced"
  ]) {
    assert.equal(html.includes(`name="${removedLegacyField}"`), false, removedLegacyField);
  }
  assert.equal(html.includes("Profil lunar explicit / demo"), false);
  assert.equal(html.includes("Profil climatic rezolvat"), true);
  assert.equal(html.includes("data-resolved-climate-profile"), true);
  assert.equal(html.includes("Amplasare si clima"), true);
  assert.equal(html.includes("climate_zone"), true);
  assert.equal(html.includes("wind_zone"), true);
  assert.equal(html.includes("mc001_2022_climate_zones_p5a_v1"), true);
  assert.equal(html.includes("Temperatura exterioara de calcul iarna"), true);
  assert.equal(html.includes("Status dataset lunar"), true);
  assert.equal(html.includes("TEST_ONLY_SYNTHETIC_DATASET"), false);
  assert.equal(html.includes("Calcule eligibile cu zona"), true);
  assert.equal(html.includes("Variabile climatice lipsa"), true);
  assert.equal(html.includes("iradierea A.9.6 furnizeaza Hsol pentru planuri verticale/orizontale, iar Qsol necesita Qsky si inputuri solare complete"), true);
  assert.equal(html.includes("Profil climatic sintetic pentru demonstra"), false);
  assert.equal(html.includes("exemplu demonstrativ"), false);
  assert.equal(html.includes("incarca demo"), false);
  assert.equal(html.includes("demo-ul"), false);
  for (const expected of [
    "Workspace auditor energetic",
    "Cladire si clima",
    "Anvelopa",
    "Utilizare si renovari",
    "Energie regenerabila",
    "Verificare",
    "Documents",
    "Rezultate",
    "Asistat",
    "Expert",
    "Salveaza draft",
    "Salveaza versiunea calculata",
    "Recalculeaza local",
    "Incarca analiza salvata",
    "QHnd",
    "QCnd"
  ]) {
    assert.equal(html.includes(expected), true, expected);
  }
  assert.equal(html.includes("HW_Prototype.png"), false);
  assert.equal(html.includes("Ma intereseaza cand devine disponibil"), false);
  assert.equal(html.includes("scor live"), false);
  assert.equal(css.includes("p3f-engineering-shell"), true);
  assert.equal(css.includes("p10-workspace-nav"), true);
  assert.equal(css.includes("p10-object-grid"), true);
  assert.equal(css.includes("p10-document-grid"), true);
  assert.equal(css.includes("p10-professional-workspace .p3f-input-pane .step"), true);
  assert.equal(css.includes("product-journey-status-grid"), true);
  assert.equal(css.includes("analysis-mode-assisted"), true);
  assert.equal(css.includes("product-result-summary"), true);
  assert.equal(css.includes("@media print"), true);
  assert.equal(css.includes(".p3f-input-pane"), true);
  assert.equal(css.includes("display:none!important"), true);
  assert.equal(css.includes(".engineering-calculation-notebook"), true);
  assert.equal(css.includes(".calculation-compact-line"), true);
  assert.equal(css.includes(".technical-report-title-block"), true);
});

await test("P9B production calculator starts without public demo controls or synthetic state", () => {
  const html = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const myProjectsSource = readFileSync(new URL("../js/my-projects.mjs", import.meta.url), "utf8");
  const analysisSource = readFileSync(new URL("../js/analiza-casa.js", import.meta.url), "utf8");
  const publicSurface = `${html}\n${index}\n${myProjectsSource}\n${analysisSource}`;

  for (const forbidden of [
    "loadDemoModeBtn",
    "demoModeControls",
    "demoModeBanner",
    "building_platform_demo_mode",
    "building_platform_demo_fixture_id",
    "analiza-casa.html?demo=1",
    "openDemoTechnicalReportIfReady",
    "Incarca exemplu demonstrativ",
    "Încarcă exemplu demonstrativ",
    "Porneste un model nou sau demo",
    "incarca demo-ul"
  ]) {
    assert.equal(publicSurface.includes(forbidden), false, forbidden);
  }

  assert.equal(html.includes("Completeaza datele principale, apoi recalculeaza"), true);
  assert.equal(html.includes("Sursa cerere utila ACM"), true);
  assert.equal(html.includes("Automat pentru locuinte, altfel Expert"), true);
  assert.equal(html.includes("Deducere din tipul cladirii"), true);
});

await test("P10 assisted surface separates building facts, scenarios and document metadata from expert engineering", () => {
  const html = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  const formHtml = html.slice(
    html.indexOf('<form id="houseForm"'),
    html.indexOf("</form>", html.indexOf('<form id="houseForm"'))
  );
  const normalNames = new Set();
  const expertNames = new Set();

  for (const match of formHtml.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const attrs = match[2];
    if (/\btype=["']hidden["']/i.test(attrs)) continue;
    const nameMatch = attrs.match(/\bname=["']([^"']+)["']/i);
    if (!nameMatch) continue;
    const contract = getBuildingPlatformFieldContract(nameMatch[1]);
    if (contract?.inputLevel === "assisted") normalNames.add(nameMatch[1]);
    if (contract?.inputLevel === "expert") expertNames.add(nameMatch[1]);
  }

  assert.ok(normalNames.size >= 47, `expected P9B assisted fields plus P10 workspace fields, got ${normalNames.size}`);
  for (const p9cAssistedField of [
    "chapter3_shared_generator_operation_hours_month",
    "chapter3_shared_generator_loss_power_kw",
    "chapter3_shared_generator_auxiliary_power_kw",
    "chapter3_shared_generator_recovery_mode",
    "chapter3_shared_generator_renewable_heat_mode",
    "chapter3_shared_generator_dhw_loss_mode",
    "pv_installed",
    "pv_annual_production_kwh"
  ]) {
    assert.equal(normalNames.has(p9cAssistedField), true, p9cAssistedField);
  }
  for (const p10WorkspaceField of [
    "scenario_name",
    "scenario_wall_insulation",
    "scenario_roof_insulated",
    "scenario_floor_insulated",
    "scenario_window_type",
    "scenario_heating_generator_type",
    "scenario_cooling_generator_type",
    "scenario_pv_annual_production_kwh",
    "auditor_name",
    "auditor_authorization",
    "document_identifier",
    "client_name",
    "document_issue_date",
    "evidence_exterior_note",
    "evidence_generator_note",
    "evidence_windows_note",
    "evidence_roof_note"
  ]) {
    assert.equal(normalNames.has(p10WorkspaceField), true, p10WorkspaceField);
    const contract = getBuildingPlatformFieldContract(p10WorkspaceField);
    assert.match(contract.buildingDnaPath, /^projectWorkspace\./);
  }
  for (const movedToExpert of [
    "heated_volume_m3",
    "main_orientation",
    "structural_system",
    "door_area_m2",
    "wall_insulation_material",
    "windows_replaced",
    "chapter3_dhw_useful_mode",
    "chapter3_dhw_dwelling_type",
    "chapter3_pcm_enabled",
    "chapter3_lighting_enabled"
  ]) {
    assert.equal(normalNames.has(movedToExpert), false, movedToExpert);
    assert.equal(expertNames.has(movedToExpert), true, movedToExpert);
    assert.equal(getBuildingPlatformFieldContract(movedToExpert).visibleInNormalMode, false);
  }
});

await test("every visible analysis form control has a UI to runtime contract", () => {
  const html = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  const formHtml = html.slice(
    html.indexOf('<form id="houseForm"'),
    html.indexOf("</form>", html.indexOf('<form id="houseForm"'))
  );
  const names = new Set();
  for (const match of formHtml.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
    const attrs = match[2];
    if (/\btype=["']hidden["']/i.test(attrs)) continue;
    const nameMatch = attrs.match(/\bname=["']([^"']+)["']/i);
    if (nameMatch) names.add(nameMatch[1]);
  }

  assert.ok(names.size > 80, `expected substantial form inventory, got ${names.size}`);
  for (const name of names) {
    const contract = getBuildingPlatformFieldContract(name);
    assert.ok(contract, name);
    assert.notEqual(contract.inputLevel, "internal", name);
    assert.ok(contract.buildingDnaPath, name);
    assert.ok(contract.runtimeConsumer, name);
  }
});

await test("P3G report is a compact fully expanded print-ready calculation notebook", () => {
  const preview = buildWizardEngineeringPreview(
    mapWizardAnswersToAssistedAnswers(formData(ASSISTED_WIZARD_DEMO_FIXTURE.values))
  );
  const html = renderEngineeringModelReview(preview, { openReport: true });
  const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
  const firstPage = html.slice(
    html.indexOf("report-main-results"),
    html.indexOf("engineering-calculation-notebook")
  );
  const mainReport = html.slice(
    html.indexOf("report-main-results"),
    html.indexOf("technical-report-appendix")
  );

  assert.equal(html.includes("data-pdf-like-report"), true);
  assert.equal(html.includes("Amplasare si date climatice utilizate"), true);
  assert.equal(html.includes("Zona climatica MC001"), true);
  assert.equal(html.includes("Temperatura exterioara de calcul iarna"), true);
  assert.equal(html.includes("Status dataset lunar"), true);
  assert.equal(html.includes("Calcule climatice indisponibile"), true);
  assert.equal(html.includes("Tabel 2.5"), true);
  assert.equal(html.includes("Tabel 2.10a"), true);
  assert.equal(html.includes("data-engineering-calculation-notebook"), true);
  assert.equal(html.includes("<details"), false);
  assert.equal(html.includes("Rezultate principale"), true);
  assert.equal(html.includes("Registru de variabile utilizate"), false);
  assert.equal(html.includes("Calcule in ordinea dependentelor"), true);
  assert.equal(html.includes("QHnd_an :="), true);
  assert.equal(html.includes("QCnd_an :="), true);
  assert.equal(html.includes("QtrH_ianuarie :="), true);
  assert.equal(html.includes("QveH_ianuarie :="), true);
  assert.equal(html.includes("QHgn_ianuarie :="), true);
  assert.equal(html.includes("QHnd_ianuarie :="), true);
  assert.equal(html.includes("QCnd_ianuarie :="), true);
  assert.equal(html.includes("λ_eps := 0,040 W/(m·K) -- valoare introdusa explicit"), true);
  assert.equal(html.includes("U_window := 1,2000 W/(m²K) -- valoare introdusa explicit"), true);
  assert.equal(html.includes("0,000 × 0,000 = 0,040"), false);
  assert.equal(html.includes("-- + + --"), false);
  assert.equal(html.includes("lambda_ref"), false);
  assert.equal(html.includes("VARIABILĂ"), false);
  assert.equal(html.includes("Relatie"), false);
  assert.equal(html.includes("Substitutie"), false);
  assert.equal(firstPage.includes("Amprenta calcul"), false);
  assert.equal(firstPage.includes("Caiet de calcule"), false);
  assert.equal(firstPage.includes("QHnd_an"), false);
  assert.equal(mainReport.includes("calculated_from_"), false);
  assert.equal(mainReport.includes("chapter_2_"), false);
  assert.equal(mainReport.includes("not_required_for_"), false);
  assert.equal(mainReport.includes("explicit_material_lambda"), false);
  for (const month of [
    "ianuarie",
    "februarie",
    "martie",
    "aprilie",
    "mai",
    "iunie",
    "iulie",
    "august",
    "septembrie",
    "octombrie",
    "noiembrie",
    "decembrie"
  ]) {
    assert.equal(html.includes(month), true, month);
  }
  for (const forbidden of [
    "Building DNA pipeline",
    "Knowledge Platform",
    "User Description ready",
    "Assisted Answers ready",
    "Formula viewer"
  ]) {
    assert.equal(mainReport.includes(forbidden), false, forbidden);
  }
  assert.equal(css.includes("@media print"), true);
  assert.equal(css.includes(".calculation-compact-line"), true);
  assert.equal(css.includes("page-break-inside:avoid"), true);
  assert.equal(css.includes(".calculation-compact-line code"), true);
});

await test("Romanian climate zone changes requirements and calculation fingerprint", () => {
  const baseValues = {
    ...ASSISTED_WIZARD_DEMO_FIXTURE.values,
    climate_zone: "I",
    wind_zone: "I"
  };
  const colderZone = buildWizardEngineeringPreview(
    mapWizardAnswersToAssistedAnswers(formData(baseValues))
  );
  const warmerZone = buildWizardEngineeringPreview(
    mapWizardAnswersToAssistedAnswers(formData({
      ...baseValues,
      climate_zone: "V",
      wind_zone: "IV"
    }))
  );

  assert.equal(colderZone.status, "ready");
  assert.equal(warmerZone.status, "ready");
  assert.notEqual(
    colderZone.technicalWorkspace.calculationFingerprint.fingerprintId,
    warmerZone.technicalWorkspace.calculationFingerprint.fingerprintId
  );
  assert.notDeepEqual(
    getClimateZoneDependentRequirements({ climateZone: "I" }),
    getClimateZoneDependentRequirements({ climateZone: "V" })
  );
});

await test("active production analysis flow removes unsupported product domains", () => {
  const html = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const sidebar = readFileSync(new URL("../components/sidebar.html", import.meta.url), "utf8");
  const visibleSurface = `${html}\n${index}\n${sidebar}`;
  for (const forbidden of [
    "monthlyBillForm",
    "Factura",
    "factura",
    "Cost mediu lunar",
    "Cost anual",
    "Sursa incalzire",
    "Tip sistem principal",
    "Centrala",
    "Boiler electric",
    "Baterie",
    "Simuleaza fara salvare",
    "Scor actual",
    "Economii",
    "clasa energetica",
    "raport-v1.html",
    "algoritmi.html",
    "advanced-calculator.html",
    "piata-energiei.html",
    "asistent-ai.html",
    "energy-data-hub.html"
  ]) {
    assert.equal(visibleSurface.includes(forbidden), false, forbidden);
  }
  for (const downstreamDomain of [
    "Economii garantate",
    "payback",
    "NPV",
    "CPE legal gata",
    "certificat legal complet"
  ]) {
    assert.equal(visibleSurface.includes(downstreamDomain), false, downstreamDomain);
  }
  assert.equal(html.includes("Energie regenerabila"), true);
  assert.equal(html.includes("Productie PV anuala furnizata"), true);
  assert.equal(html.includes("Relatiile MC001 4.160-4.165"), true);
  assert.equal(html.includes("CPE - certificat de performanta energetica"), true);
  assert.equal(html.includes("nu declara layout legal complet fara certificare sursa"), true);
});

await test("canonical production route imports only the current Building Platform flow", () => {
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const analysisPage = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  const activeSurface = `${index}\n${analysisPage}`;

  assert.equal(index.includes("js/my-projects.mjs"), true);
  assert.equal(index.includes("myProjectsPanel"), true);
  assert.equal(index.includes("PROIECTELE MELE"), true);
  assert.equal(index.includes("js/product-dashboard.js"), false);
  assert.equal(index.includes("js/segment-context.js"), false);
  assert.equal(index.includes("js/home-context.js"), false);
  assert.equal(analysisPage.includes("building-platform-wizard.mjs"), true);
  assert.equal(activeSurface.includes("?new=1"), false);
  assert.equal(activeSurface.includes("pages/analiza-casa.html"), true);
  assert.equal(activeSurface.includes("pages/analiza-casa.html?demo=1"), false);
  assert.equal(analysisPage.includes("buildingPlatformLoadAnalysisId"), true);
  assert.equal(analysisIdFromSearch("?analysis_id=42"), 42);
});

await test("active production modules do not import test fixtures", () => {
  const activeFiles = [
    "../js/building-platform-wizard.mjs",
    "../js/my-projects.mjs",
    "../js/analiza-casa.js",
    "../src/building-platform/buildingDnaResolver.mjs",
    "../src/building-platform/buildingKnowledgePipeline.mjs",
    "../src/building-platform/buildingChapter2Adapter.mjs",
    "../src/building-platform/buildingTechnicalReport.mjs",
    "../src/climate-platform/romanianClimateProfiles.mjs"
  ];
  for (const file of activeFiles) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.equal(source.includes("/tests/"), false, file);
    assert.equal(source.includes("test-fixtures"), false, file);
    assert.equal(source.includes("p1SeedMonthlyProfiles"), false, file);
    assert.equal(source.includes("mc001Chapter2ValidationMatrixFixture"), false, file);
  }
});

await test("wizard UI module delegates calculations and keeps technical workspace responsive", () => {
  const source = readFileSync(new URL("../js/building-platform-wizard.mjs", import.meta.url), "utf8");
  for (const forbidden of [
    "calculateMc001Envelope",
    "calculateMc001",
    "Math.",
    "**",
    "readFile",
    "fetch(",
    ".pdf",
    "primaryEnergy",
    "certificateResult"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.equal(source.includes("buildBuildingTechnicalWorkspace"), true);
  assert.equal(source.includes("ASSISTED_WIZARD_DEMO_FIXTURE"), true);
  assert.equal(source.includes("technical-workspace-tabs"), true);
  const analysisSource = readFileSync(new URL("../js/analiza-casa.js", import.meta.url), "utf8");
  assert.equal(analysisSource.includes("openDemoTechnicalReportIfReady"), false);
  assert.equal(analysisSource.includes("generateBuildingPlatformTechnicalReport"), true);
  assert.equal(analysisSource.includes("/api/simulate-house"), false);
  assert.equal(analysisSource.includes("/api/save-house"), false);
  assert.equal(analysisSource.includes("/api/monthly-bill"), false);
  const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
  assert.equal(css.includes(".technical-workspace"), true);
  assert.equal(css.includes(".demo-mode-banner"), false);
  assert.equal(css.includes(".demo-mode-controls"), false);
  assert.equal(css.includes(".technical-status-grid.p2b-annual-summary"), true);
  assert.equal(css.includes(".technical-flow-nav"), true);
  assert.equal(css.includes("@media(min-width:1200px)"), true);
  assert.equal(css.includes("grid-template-columns:260px minmax(620px,1fr) minmax(340px,420px)"), true);
  assert.match(
    css,
    /\.technical-output-dock\{[\s\S]*?grid-column:3;[\s\S]*?position:sticky;/
  );
  assert.match(
    css,
    /\.p2c-technical-analysis \.form-grid\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(150px,1fr\)\);/
  );
  assert.equal(css.includes("@media(max-width:700px)"), true);
});
