import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  buildBuildingTechnicalWorkspace
} from "../index.mjs";
import { createP1SeedMonthlyProfiles } from "./fixtures/p1SeedMonthlyProfiles.mjs";

const EPSILON = 1e-9;

function close(actual, expected, tolerance = EPSILON) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function assistedAnswers() {
  return {
    buildingId: "p2b-technical-report-brick-house",
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
      mainOrientation: "unknown",
      windowOrientation: "unknown",
      ventilationType: "unknown",
      atticContext: "unheated",
      basementContext: "none"
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    source: {
      reference: "P2B.test.technical_report"
    },
    monthlyProfiles: createP1SeedMonthlyProfiles()
  };
}

await test("technical report is generated from Building DNA and Chapter 2 outputs", () => {
  const pipeline = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers());
  const workspace = buildBuildingTechnicalWorkspace(pipeline);

  assert.equal(workspace.status, "ready");
  assert.equal(workspace.scope, "building_technical_workspace_p2b_report_generation_only");
  assert.deepEqual(
    workspace.tabs.map(tab => tab.tabId),
    ["building", "assemblies", "materials", "building_dna", "chapter_2", "results", "report", "traceability"]
  );
  assert.equal(workspace.report.title, "Chapter 2 Technical Engineering Report");
  assert.equal(workspace.calculationFingerprint.fingerprintId, "39cfaa3e");
  assert.equal(workspace.report.calculationFingerprint.fingerprintId, "39cfaa3e");
  assert.equal(workspace.calculationFingerprint.inputs.engineScope, "mc001_chapter_2_useful_demand_explicit_v1_not_certificate");
  assert.equal(
    workspace.diagnostics.methodologyLimits.includes("no_duplicate_calculations"),
    true
  );

  close(workspace.resultSummary.annualQHnd, 10286.496332703064);
  close(workspace.resultSummary.annualQCnd, 2786.7333161081524);
  close(workspace.envelope.htr.amount, 64.25708961581125);
  close(workspace.envelope.components.find(item => item.componentId === "Hd").amount, 40.871819482282156);
  close(workspace.envelope.components.find(item => item.componentId === "Hg").amount, 13.154500902759864);
  close(workspace.envelope.components.find(item => item.componentId === "Hu").amount, 9.230769230769228);
  close(workspace.envelope.components.find(item => item.componentId === "Ha").amount, 1);

  const wall = workspace.assemblies.find(item => item.assemblyId === "wall_masonry_300_eps_100");
  close(wall.totalResistance, 3.155436893203883);
  close(wall.uValue, 0.3169133257438233);
  close(wall.layers.find(item => item.layerId === "brick").resistanceM2KPerW, 0.4854368932038835);
  close(wall.layers.find(item => item.layerId === "eps-insulation").resistanceM2KPerW, 2.5);

  const brick = workspace.materials.find(item => item.materialId === "brick_masonry_pre_1990");
  close(brick.lambdaNormatWmK, 0.6);
  close(brick.designLambdaWmK, 0.618);
  close(brick.correctionCoefficientA, 1.03);
  assert.equal(brick.correctionCoefficientCode, "zidarie_caramida_uscata_vechime_ge_30_ani");

  const january = workspace.monthly.find(item => item.month === "january");
  assert.equal(january.durationHours, 720);
  assert.equal(january.heatingIndoorTemperatureC, 20);
  assert.equal(january.heatingOutdoorTemperatureC, 0);
  assert.equal(january.heatingTemperatureDifferenceK, 20);
  assert.equal(january.coolingIndoorTemperatureC, 24);
  assert.equal(january.coolingOutdoorTemperatureC, 30);
  assert.equal(january.coolingTemperatureDifferenceK, 6);
  close(january.ventilationAirFlowRateM3PerS, 0.016666666666666666);
  assert.equal(january.ventilationAirHeatCapacityJPerM3K, 1200);
  assert.equal(january.solarOrientation, null);
  assert.equal(january.solarGainsSource, "monthly_profile_solar_gains");
  assert.equal(january.monthlyProfileOrigin, "proposed_by_typology");
  close(january.heatingTransmissionKwh, 925.302090467682);
  close(january.heatingVentilationKwh, 288);
  close(january.internalGainsKwh, 120);
  close(january.solarGainsKwh, 180);
  close(january.qHndKwh, 913.3264036320874);
  close(january.qCndKwh, 19.4178736507414);
  assert.equal(january.qHndFormulaCode, "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH");
  assert.equal(january.qCndFormulaCode, "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND");
});

await test("technical report contains the required engineering chapters and formula views", () => {
  const workspace = buildBuildingTechnicalWorkspace(
    buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers())
  );
  const chapterTitles = workspace.report.chapters.map(chapter => chapter.title);

  for (const expected of [
    "General Project Information",
    "Building Description",
    "Building DNA",
    "Engineering Assumptions",
    "Envelope Assemblies",
    "Materials",
    "Layer Stacks",
    "Thermal Resistances",
    "U-values",
    "Boundary Conditions",
    "Heat Transfer Coefficients",
    "Monthly Input Transparency",
    "Transmission Losses",
    "Ventilation Losses",
    "Solar Gains",
    "Internal Gains",
    "Monthly Heating Demand",
    "Monthly Cooling Demand",
    "Annual Results",
    "Calculation Fingerprint",
    "Engineering Traceability",
    "Normative References"
  ]) {
    assert.equal(chapterTitles.includes(expected), true, expected);
  }

  const formulaIds = workspace.formulaViews.map(view => view.formulaId);
  assert.equal(
    formulaIds.includes("MC001_2_7_U_VALUE_FROM_RELATION_2_6_RESISTANCE"),
    true
  );
  assert.equal(
    formulaIds.includes("MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"),
    true
  );
  assert.equal(
    formulaIds.includes("MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND"),
    true
  );
  assert.equal(
    workspace.traceability.some(row => row.reference === "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"),
    true
  );
});

await test("calculation fingerprint changes when upstream Building DNA changes", () => {
  const baseWorkspace = buildBuildingTechnicalWorkspace(
    buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers())
  );
  const changedAnswers = assistedAnswers();
  changedAnswers.renovations = {
    ...changedAnswers.renovations,
    wallInsulationThicknessM: 0.15
  };
  const changedWorkspace = buildBuildingTechnicalWorkspace(
    buildBuildingKnowledgePlatformFromAssistedAnswers(changedAnswers)
  );

  assert.notEqual(
    baseWorkspace.calculationFingerprint.fingerprintId,
    changedWorkspace.calculationFingerprint.fingerprintId
  );
  assert.notEqual(
    baseWorkspace.resultSummary.annualQHnd,
    changedWorkspace.resultSummary.annualQHnd
  );
});

await test("technical report module does not calculate physics or read runtime sources", () => {
  const source = readFileSync(
    new URL("../buildingTechnicalReport.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "calculateMc001",
    "Math.",
    "**",
    "readFile",
    "fetch(",
    ".pdf",
    "finalEnergy",
    "primaryEnergy",
    "certificateResult"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
