import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ASSISTED_WIZARD_DEMO_FIXTURE,
  BUILDING_PLATFORM_WIZARD_STEPS,
  buildWizardEngineeringPreview,
  constructionPeriodFromYear,
  demoModeFromSearch,
  getAssistedWizardDemoFixture,
  mapWizardAnswersToAssistedAnswers,
  renderEngineeringModelReview,
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

await test("wizard steps use ordinary language and avoid engineering coefficients", () => {
  assert.equal(BUILDING_PLATFORM_WIZARD_STEPS.length, 12);
  const serialized = JSON.stringify(BUILDING_PLATFORM_WIZARD_STEPS);
  for (const forbidden of ["lambda", "Htr", "gamma", "tau", "eta", "U-value", "coeficient"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.equal(serialized.includes("Ce fel de locuinta ai?"), true);
});

await test("wizard maps homeowner answers to assisted Building DNA input", () => {
  const answers = mapWizardAnswersToAssistedAnswers(formData({
    building_type: "house",
    construction_year: "1985",
    wall_material: "brick",
    wall_insulation: "10cm",
    window_type: "modern_double_glazing",
    roof_type: "unheated_attic",
    floor_type: "on_ground",
    city: "Cluj"
  }));

  assert.equal(answers.buildingType, "detached_house");
  assert.equal(answers.constructionPeriod, "1978_1990");
  assert.equal(answers.structuralSystem, "masonry");
  assert.equal(answers.renovations.wallInsulation, "eps");
  assert.equal(answers.renovations.roofInsulated, false);
  assert.equal(answers.renovations.floorInsulated, false);
  assert.equal(answers.renovations.windowsReplaced, true);
  assert.equal(answers.buildingSpecificParameters.windowAreaM2, undefined);
  assert.equal(answers.buildingSpecificParameters.mainOrientation, "unknown");
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
  assert.equal(preview.summary.annualQHnd, 10286.496332703064);
  assert.equal(preview.summary.annualQCnd, 2786.7333161081524);
  assert.equal(preview.technicalWorkspace.resultSummary.annualQHnd, 10286.496332703064);
  assert.equal(preview.technicalWorkspace.resultSummary.annualQCnd, 2786.7333161081524);

  const html = renderEngineeringModelReview(preview);
  assert.equal(html.includes("Platforma de cunostinte a cladirii"), true);
  assert.equal(html.includes("Flux verificabil"), true);
  assert.equal(html.includes("Interventii identificate"), true);
  assert.equal(html.includes("10286.50 kWh"), true);
  assert.equal(html.includes("2786.73 kWh"), true);
  assert.equal(html.includes("Chapter 2"), true);
  for (const expected of [
    "TECHNICAL WORKSPACE",
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
  assert.equal(html.includes("Lambda"), true);
  assert.equal(html.includes("Htr"), true);
});

await test("demo query and fixture preload a complete editable assisted wizard dataset", () => {
  assert.equal(demoModeFromSearch("?new=1&demo=1"), true);
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
    "building_type",
    "construction_year",
    "useful_area_m2",
    "number_of_floors",
    "floor_height_m",
    "city",
    "wall_material",
    "wall_insulation",
    "window_type",
    "window_area_m2",
    "roof_type",
    "floor_type",
    "ventilation_type",
    "ventilation_ach"
  ]) {
    assert.notEqual(fixture.values[field], undefined, field);
    assert.notEqual(fixture.values[field], "", field);
  }
  const numericFixtureFields = new Set([
    "construction_year",
    "useful_area_m2",
    "number_of_floors",
    "floor_height_m",
    "occupants",
    "wall_thickness",
    "roof_insulation_thickness_cm",
    "window_age_years",
    "window_area_m2",
    "heating_equipment_age_years",
    "boiler_power_kw",
    "heating_setpoint_c",
    "cooling_setpoint_c",
    "ventilation_ach",
    "airflow_m3h",
    "heat_recovery_efficiency",
    "pv_capacity_kw",
    "monthly_electricity_cost",
    "monthly_gas_cost",
    "annual_wood_cost",
    "wood_price_per_ster",
    "annual_pellets_cost",
    "annual_other_fuel_cost"
  ]);
  for (const [field, value] of Object.entries(fixture.values)) {
    assert.equal(pageHtml.includes(`name="${field}"`), true, field);
    if (numericFixtureFields.has(field)) {
      assert.equal(Number.isFinite(Number(value)), true, field);
    }
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
  assert.equal(answers.buildingSpecificParameters.usefulFloorAreaM2, 120);
  assert.equal(answers.buildingSpecificParameters.windowAreaM2, 8);
  assert.equal(answers.buildingSpecificParameters.ventilationAch, 0.6);

  const preview = buildWizardEngineeringPreview(answers);
  assert.equal(preview.status, "ready");
  assert.equal(preview.buildingDna.source.origin, "demo_fixture");
  assert.equal(preview.buildingDna.demoFixture.fixtureId, fixture.fixtureId);
  assert.equal(preview.buildingDna.demoFixture.confirmationStatus, "unconfirmed_demo");
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

await test("analysis page includes Building Platform review hook", () => {
  const html = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  assert.equal(html.includes("building-platform-wizard.mjs"), true);
  assert.equal(html.includes("buildingModelReview"), true);
  assert.equal(html.includes("buildingModelPreviewBtn"), true);
  assert.equal(html.includes("demoModeBanner"), true);
  assert.equal(html.includes("Încarcă exemplu demonstrativ"), true);
  assert.equal(html.includes("Începe proiect gol"), true);
  assert.equal(html.includes("Resetează exemplul"), true);
  assert.equal(html.includes("building_platform_demo_mode"), true);
  assert.equal(html.includes("Gata pentru raport tehnic"), true);
  assert.equal(html.includes("Building DNA, rezultate Chapter 2 si raportul tehnic"), true);
  assert.equal(html.includes("Model tehnic Chapter 2"), true);
  assert.equal(html.includes("HW_Prototype.png"), false);
  assert.equal(html.includes("Ma intereseaza cand devine disponibil"), false);
  assert.equal(html.includes("scor live"), false);
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
  const css = readFileSync(new URL("../css/style.css", import.meta.url), "utf8");
  assert.equal(css.includes(".technical-workspace"), true);
  assert.equal(css.includes(".demo-mode-banner"), true);
  assert.equal(css.includes(".technical-status-grid.p2b-annual-summary"), true);
  assert.equal(css.includes("@media(max-width:700px)"), true);
});
