import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ASSISTED_WIZARD_DEMO_FIXTURE,
  BUILDING_PLATFORM_WIZARD_STEPS,
  analysisIdFromSearch,
  applyBuildingDnaToWizardForm,
  buildBuildingPlatformSavePayload,
  buildingDnaToWizardValues,
  buildWizardEngineeringPreview,
  constructionPeriodFromYear,
  demoModeFromSearch,
  getAssistedWizardDemoFixture,
  loadBuildingPlatformChapter2Analysis,
  markBuildingPlatformResultsStale,
  mapWizardAnswersToAssistedAnswers,
  projectIdFromSearch,
  renderEngineeringModelReview,
  renderLoadedBuildingPlatformAnalysis,
  saveBuildingPlatformDraft,
  saveBuildingPlatformChapter2Analysis,
  structuralSystemFromWallMaterial
} from "../js/building-platform-wizard.mjs";
import {
  projectStatusLabel,
  renderProjectRows
} from "../js/my-projects.mjs";
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

function formData(entries) {
  return {
    get(name) {
      return entries[name];
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

await test("wizard exposes the validated technical sections including installations", () => {
  assert.equal(BUILDING_PLATFORM_WIZARD_STEPS.length, 7);
  const serialized = JSON.stringify(BUILDING_PLATFORM_WIZARD_STEPS);
  for (const forbidden of ["lambda", "Htr", "gamma", "tau", "eta", "U-value", "coeficient"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  for (const expected of [
    "Geometrie",
    "Anvelopa",
    "Renovari",
    "Instalatii",
    "Building DNA",
    "Raport tehnic",
    "Rezultate"
  ]) {
    assert.equal(serialized.includes(expected), true, expected);
  }
});

await test("wizard maps technical answers to assisted Building DNA input", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    building_platform_demo_mode: "1",
    building_platform_demo_fixture_id: "demo_detached_masonry_1985_eps_pvc_bucharest",
    building_type: "house",
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
  assert.equal(answers.technicalSystems.lighting.boundaryStatus, "explicit_input_boundary_sr_en_15193_1");

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  assert.equal(preview.calculation.stage, "chapter_2_and_3_complete");
  assert.equal(preview.technicalWorkspace.installations.status, "ready");
  const html = renderEngineeringModelReview(preview);
  assert.equal(html.includes("Instalatii tehnice - MC001 Capitolul 3"), true);
  assert.equal(html.includes("Calculul detaliat normativ al iluminatului conform SR EN 15193-1"), true);
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
  assert.equal(values.useful_area_m2, 120);
  assert.equal(values.window_type, "modern_double_glazing");
  assert.equal(values.wall_insulation, "10cm");

  const form = fakeWizardForm([
    "display_name",
    "building_type",
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
  assert.equal(byName.climate_profile_id.value, "ro_synthetic_bucharest_seasonal_demo_v1");
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

await test("demo query and fixture preload a complete editable technical dataset", () => {
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
    "building_type",
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
    assert.equal(pageHtml.includes(`name="${field}"`), true, field);
  }

  for (const field of [
    "construction_year",
    "useful_area_m2",
    "number_of_floors",
    "floor_height_m",
    "heated_volume_m3",
    "building_length_m",
    "building_width_m",
    "exterior_wall_area_m2",
    "roof_area_m2",
    "ground_floor_area_m2",
    "attic_ceiling_area_m2",
    "adjacent_wall_area_m2",
    "wall_thickness",
    "door_area_m2",
    "roof_insulation_thickness_cm",
    "floor_insulation_thickness_cm",
    "window_age_years",
    "window_area_m2",
    "ventilation_ach",
    "wall_insulation_year"
  ]) {
    assert.equal(Number.isFinite(Number(fixture.values[field])), true, field);
  }

  const answers = mapWizardAnswersToAssistedAnswers(formData(fixture.values));
  assert.equal(answers.source.origin, "demo_fixture");
  assert.equal(answers.source.confirmationStatus, "unconfirmed_demo");
  assert.equal(answers.source.editable, true);
  assert.equal(answers.buildingType, "detached_house");
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
    building_type: "house",
    construction_year: "",
    wall_material: "",
    wall_insulation: "",
    window_type: "",
    roof_type: "",
    floor_type: ""
  }));
  assert.equal(answers.source.origin, undefined);
  assert.equal(answers.source.fixtureId, undefined);
  assert.equal(answers.climateProfileId, undefined);
  assert.equal(answers.monthlyProfiles, undefined);
  assert.equal(answers.buildingSpecificParameters.usefulFloorAreaM2, undefined);
  assert.equal(answers.buildingSpecificParameters.windowAreaM2, undefined);
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

await test("analysis page exposes the refocused technical workflow", () => {
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
  assert.equal(html.includes("Mod simplificat"), true);
  assert.equal(html.includes("buildingPlatformLoadAnalysisId"), true);
  assert.equal(html.includes("loadBuildingPlatformAnalysisBtn"), true);
  assert.equal(html.includes("Redeschidere avansata dupa ID analiza"), true);
  assert.equal(html.includes("buildingPlatformSaveStatus"), true);
  assert.equal(html.includes("demoModeBanner"), true);
  assert.equal(html.includes("climate_profile_id"), true);
  assert.equal(html.includes("Amplasare si clima"), true);
  assert.equal(html.includes("climate_zone"), true);
  assert.equal(html.includes("wind_zone"), true);
  assert.equal(html.includes("mc001_2022_climate_zones_p5a_v1"), true);
  assert.equal(html.includes("Temperatura exterioara de calcul iarna"), true);
  assert.equal(html.includes("Status dataset lunar"), true);
  assert.equal(html.includes("TEST_ONLY_SYNTHETIC_DATASET"), true);
  assert.equal(html.includes("Calcule eligibile cu zona"), true);
  assert.equal(html.includes("Variabile climatice lipsa"), true);
  assert.equal(html.includes("iradierea A.9.6 este dataset sursa, iar Qsol necesita Hsol/Qsky preprocesate sau input certificat"), true);
  assert.equal(html.includes("Profil climatic sintetic pentru demonstra"), true);
  assert.equal(html.includes("Încarcă exemplu demonstrativ"), true);
  assert.equal(html.includes("Începe proiect gol"), true);
  assert.equal(html.includes("Resetează exemplul"), true);
  assert.equal(html.includes("building_platform_demo_mode"), true);
  for (const expected of [
    "Modelul termic al cladirii",
    "Geometrie",
    "Anvelopa",
    "Renovari",
    "Building DNA",
    "Raport tehnic",
    "Rezultate",
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
  assert.equal(css.includes("@media print"), true);
  assert.equal(css.includes(".p3f-input-pane"), true);
  assert.equal(css.includes("display:none!important"), true);
  assert.equal(css.includes(".engineering-calculation-notebook"), true);
  assert.equal(css.includes(".calculation-compact-line"), true);
  assert.equal(css.includes(".technical-report-title-block"), true);
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
    "Panouri fotovoltaice",
    "Baterie",
    "Simuleaza fara salvare",
    "Scor actual",
    "Economii",
    "recomandari",
    "Recomandari",
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
    "energie finala",
    "energie primara",
    "CO2",
    "CPE",
    "certificat energetic",
    "certificat de performanta"
  ]) {
    assert.equal(visibleSurface.includes(downstreamDomain), false, downstreamDomain);
  }
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
  assert.equal(activeSurface.includes("pages/analiza-casa.html?demo=1"), true);
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
  assert.equal(analysisSource.includes("openDemoTechnicalReportIfReady"), true);
  assert.equal(analysisSource.includes("generateBuildingPlatformTechnicalReport"), true);
  assert.equal(analysisSource.includes("/api/simulate-house"), false);
  assert.equal(analysisSource.includes("/api/save-house"), false);
  assert.equal(analysisSource.includes("/api/monthly-bill"), false);
  const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
  assert.equal(css.includes(".technical-workspace"), true);
  assert.equal(css.includes(".demo-mode-banner"), true);
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
