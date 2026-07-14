import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BUILDING_PLATFORM_WIZARD_STEPS,
  buildWizardEngineeringPreview,
  constructionPeriodFromYear,
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
  assert.equal(preview.buildingDna.schema, "building_dna_v1");
  assert.equal(preview.dependencyTree.physicsAuthority, "Chapter 2 physics engine");
  assert.equal(preview.summary.annualQHnd, 10286.496332703064);
  assert.equal(preview.summary.annualQCnd, 2786.7333161081524);

  const html = renderEngineeringModelReview(preview);
  assert.equal(html.includes("Platforma de cunostinte a cladirii"), true);
  assert.equal(html.includes("Flux verificabil"), true);
  assert.equal(html.includes("Interventii identificate"), true);
  assert.equal(html.includes("10286.50 kWh"), true);
  assert.equal(html.includes("2786.73 kWh"), true);
  assert.equal(html.includes("Chapter 2"), true);
  for (const forbidden of ["lambda", "Htr", "gamma", "tau", "etaHgn", "U-value", "coeficient"]) {
    assert.equal(html.includes(forbidden), false, forbidden);
  }
});

await test("analysis page includes Building Platform review hook", () => {
  const html = readFileSync(new URL("../pages/analiza-casa.html", import.meta.url), "utf8");
  assert.equal(html.includes("building-platform-wizard.mjs"), true);
  assert.equal(html.includes("buildingModelReview"), true);
  assert.equal(html.includes("buildingModelPreviewBtn"), true);
  assert.equal(html.includes("Building DNA si ipotezele propuse"), true);
});

await test("wizard UI module has no MC001 formulas or normative coefficient tables", () => {
  const source = readFileSync(new URL("../js/building-platform-wizard.mjs", import.meta.url), "utf8");
  for (const forbidden of [
    "lambdaNormat",
    "correctionCoefficient",
    "calculateMc001Envelope",
    "Math.",
    "**",
    "primaryEnergy",
    "certificateResult"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
