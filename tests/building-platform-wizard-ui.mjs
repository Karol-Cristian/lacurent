import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ASSISTED_WIZARD_DEMO_FIXTURE,
  BUILDING_PLATFORM_WIZARD_STEPS,
  applyBuildingDnaToWizardForm,
  buildBuildingPlatformSavePayload,
  buildingDnaToWizardValues,
  buildWizardEngineeringPreview,
  constructionPeriodFromYear,
  demoModeFromSearch,
  getAssistedWizardDemoFixture,
  loadBuildingPlatformChapter2Analysis,
  mapWizardAnswersToAssistedAnswers,
  renderEngineeringModelReview,
  renderLoadedBuildingPlatformAnalysis,
  saveBuildingPlatformChapter2Analysis,
  structuralSystemFromWallMaterial
} from "../js/building-platform-wizard.mjs";

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
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

await test("wizard exposes only the six validated technical sections", () => {
  assert.equal(BUILDING_PLATFORM_WIZARD_STEPS.length, 6);
  const serialized = JSON.stringify(BUILDING_PLATFORM_WIZARD_STEPS);
  for (const forbidden of ["lambda", "Htr", "gamma", "tau", "eta", "U-value", "coeficient"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  for (const expected of [
    "Geometrie",
    "Anvelopa",
    "Renovari",
    "Building DNA",
    "Raport tehnic",
    "Rezultate"
  ]) {
    assert.equal(serialized.includes(expected), true, expected);
  }
});

await test("wizard maps technical answers to assisted Building DNA input", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    building_type: "house",
    climate_profile_id: "ro_synthetic_bucharest_seasonal_demo_v1",
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
  assert.equal(answers.renovations.wallInsulation, "eps");
  assert.equal(answers.renovations.roofInsulated, false);
  assert.equal(answers.renovations.floorInsulated, false);
  assert.equal(answers.renovations.windowsReplaced, true);
  assert.equal(answers.climateProfileId, "ro_synthetic_bucharest_seasonal_demo_v1");
  assert.equal(answers.climateProfile.sourceType, "synthetic_demo_profile");
  assert.equal(answers.monthlyProfiles.length, 12);
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
    building_type: "house",
    climate_profile_id: "ro_synthetic_bucharest_seasonal_demo_v1",
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
  assert.equal(preview.technicalWorkspace.scope, "building_technical_workspace_p2b_report_generation_only");
  assert.equal(preview.buildingDna.schema, "building_dna_v1");
  assert.equal(preview.dependencyTree.physicsAuthority, "Chapter 2 physics engine");
  assert.equal(preview.buildingDna.climateProfile.profileId, "ro_synthetic_bucharest_seasonal_demo_v1");
  assert.equal(preview.buildingDna.calculationStatus, "synthetic_demo");
  assert.equal(preview.summary.annualQHnd > 0, true);
  assert.equal(preview.summary.annualQCnd > 0, true);

  const html = renderEngineeringModelReview(preview);
  for (const expected of [
    "Building DNA",
    "Assemblies and U-values",
    "Materials",
    "Layer stacks",
    "Htr breakdown",
    "Monthly QHnd / QCnd",
    "Formula viewer",
    "Traceability",
    "Technical report",
    "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH",
    "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND"
  ]) {
    assert.equal(html.includes(expected), true, expected);
  }
});

await test("save payload sends only Building DNA to the server-side Chapter 2 endpoint", () => {
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
      return {
        success: true,
        house_id: 7,
        analysis_id: 100,
        building_dna_version: {
          versionId: "building-dna-100"
        },
        result_summary: {
          annualQHnd: 9400,
          annualQCnd: 8
        }
      };
    }
  });

  assert.equal(result.saved, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/building-platform/chapter2/save");
  assert.equal(calls[0].payload.building_dna.schema, "building_dna_v1");
  assert.equal(root.status.dataset.state, "ready");
  assert.equal(root.status.textContent.includes("analiza 100"), true);
  assert.equal(root.preview.innerHTML.includes("Raport tehnic generat"), true);
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
  assert.equal(html.includes("9400.72"), true);
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
    "airflow_m3h",
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
  assert.equal(answers.renovations.wallInsulation, "eps");
  assert.equal(answers.renovations.windowsReplaced, true);
  assert.equal(answers.climateProfileId, "ro_synthetic_bucharest_seasonal_demo_v1");
  assert.equal(answers.climateProfile.sourceType, "synthetic_demo_profile");
  assert.equal(answers.monthlyProfiles.length, 12);
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
  assert.equal(html.includes("technical-report-chapter\" open"), true);
  assert.equal(html.includes("Annual QHnd"), true);
  assert.equal(html.includes("Annual QCnd"), true);
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
  assert.equal(html.includes("building-platform-wizard.mjs"), true);
  assert.equal(html.includes("buildingModelReview"), true);
  assert.equal(html.includes("buildingModelPreviewBtn"), true);
  assert.equal(html.includes("saveBuildingPlatformAnalysisBtn"), true);
  assert.equal(html.includes("recalculateBuildingPlatformAnalysisBtn"), true);
  assert.equal(html.includes("buildingPlatformLoadAnalysisId"), true);
  assert.equal(html.includes("loadBuildingPlatformAnalysisBtn"), true);
  assert.equal(html.includes("buildingPlatformSaveStatus"), true);
  assert.equal(html.includes("demoModeBanner"), true);
  assert.equal(html.includes("climate_profile_id"), true);
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
    "Salveaza si calculeaza",
    "Recalculeaza versiune noua",
    "Incarca analiza salvata",
    "QHnd",
    "QCnd"
  ]) {
    assert.equal(html.includes(expected), true, expected);
  }
  assert.equal(html.includes("HW_Prototype.png"), false);
  assert.equal(html.includes("Ma intereseaza cand devine disponibil"), false);
  assert.equal(html.includes("scor live"), false);
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
    "Pompa de caldura",
    "Apa calda",
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
    "certificat"
  ]) {
    assert.equal(visibleSurface.includes(downstreamDomain), false, downstreamDomain);
  }
});

await test("canonical production route imports only the current Building Platform flow", () => {
  const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const analysisPage = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  const activeSurface = `${index}\n${analysisPage}`;

  assert.equal(index.includes("js/product-dashboard.js"), false);
  assert.equal(index.includes("js/segment-context.js"), false);
  assert.equal(index.includes("js/home-context.js"), false);
  assert.equal(analysisPage.includes("building-platform-wizard.mjs"), true);
  assert.equal(activeSurface.includes("?new=1"), false);
  assert.equal(activeSurface.includes("pages/analiza-casa.html"), true);
  assert.equal(activeSurface.includes("pages/analiza-casa.html?demo=1"), true);
});

await test("active production modules do not import test fixtures", () => {
  const activeFiles = [
    "../js/building-platform-wizard.mjs",
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
  assert.equal(css.includes("@media(max-width:700px)"), true);
});
