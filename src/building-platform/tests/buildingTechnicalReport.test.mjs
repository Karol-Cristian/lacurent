import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  buildBuildingTechnicalWorkspace,
  resolveRomanianNormativeClimateSelection
} from "../index.mjs";
import { createP1SeedMonthlyProfiles } from "./fixtures/p1SeedMonthlyProfiles.mjs";

const EPSILON = 1e-9;

function close(actual, expected, tolerance = EPSILON) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

function assistedAnswersWithNormativeClimateProvider() {
  return {
    ...assistedAnswers(),
    climateProviderResult: resolveRomanianNormativeClimateSelection({
      stationId: "mc001_6_2013_bucuresti",
      climateZone: "II",
      windZone: "II"
    })
  };
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
    location: {
      country: "RO",
      countyName: "Bucuresti",
      localityName: "Bucuresti"
    },
    climate: {
      climateZone: "II",
      windZone: "II"
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
  assert.equal(workspace.scope, "engineering_calculation_notebook_p3g_report_generation_only");
  assert.deepEqual(
    workspace.tabs.map(tab => tab.tabId),
    ["building", "assemblies", "materials", "building_dna", "chapter_2", "installations", "results", "report", "traceability"]
  );
  assert.equal(workspace.report.reportId, "engineering_calculation_notebook_p3g_v1");
  assert.equal(workspace.report.title, "Caiet de calcul MC001-2022");
  assert.equal(workspace.calculationFingerprint.fingerprintId, "b6ff21d7");
  assert.equal(workspace.report.calculationFingerprint.fingerprintId, "b6ff21d7");
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
  close(january.qHhtKwh, 1213.3020904676819);
  close(january.internalGainsKwh, 120);
  close(january.solarGainsKwh, 180);
  close(january.qHgnKwh, 300);
  close(january.gammaH, 0.24725911407962825);
  close(january.etaHgn, 0.9999189561186483);
  close(january.qHndKwh, 913.3264036320874);
  close(january.qChtKwh, 363.9906271403046);
  close(january.qCgnKwh, 300);
  close(january.gammaC, 0.8241970469320942);
  close(january.etaCht, 0.7708498665299556);
  close(january.qCndKwh, 19.4178736507414);
  assert.equal(january.qHndFormulaCode, "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH");
  assert.equal(january.qCndFormulaCode, "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND");

  assert.equal(workspace.report.mainResults.monthly.length, 12);
  assert.equal(workspace.report.mainResults.monthly[0].monthLabel, "ianuarie");
  const climateChapter = workspace.report.chapters.find(
    chapter => chapter.chapterId === "amplasare_si_clima"
  );
  assert.equal(climateChapter.title, "Amplasare si date climatice utilizate");
  assert.equal(
    climateChapter.rows.some(row =>
      row.label === "Status mapare localitate" &&
      row.value === "locality_mapping_not_available_in_mc001"
    ),
    true
  );
  assert.equal(
    climateChapter.rows.some(row =>
      row.label === "Status dataset lunar" &&
      row.value === "DATASET_UNAVAILABLE"
    ),
    true
  );
  assert.equal(
    climateChapter.rows.some(row =>
      row.label === "Temperatura exterioara de calcul iarna" &&
      row.value.includes("-15 degC")
    ),
    true
  );
  assert.equal(
    climateChapter.rows.some(row =>
      row.label === "Calcule climatice indisponibile" &&
      row.value.includes("MONTHLY_EXTERIOR_TEMPERATURE_DATASET_REQUIRED")
    ),
    true
  );
  assert.equal(workspace.engineeringNotebook.sections.length >= 20, true);
  assert.equal(Object.prototype.hasOwnProperty.call(workspace.engineeringNotebook, "variables"), false);
});

await test("technical report and notebook expose source-backed Romanian climate provider values", () => {
  const workspace = buildBuildingTechnicalWorkspace(
    buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswersWithNormativeClimateProvider())
  );
  const climateChapter = workspace.report.chapters.find(
    chapter => chapter.chapterId === "amplasare_si_clima"
  );
  assert.equal(
    climateChapter.rows.some(row =>
      row.label === "Statie normativa MC001/6-2013" &&
      row.value === "Bucuresti"
    ),
    true
  );
  assert.equal(
    climateChapter.rows.some(row =>
      row.label === "Temperaturi exterioare lunare normative" &&
      row.value.includes("ianuarie -1,20 degC") &&
      row.value.includes("iulie 23,40 degC")
    ),
    true
  );
  assert.equal(
    climateChapter.rows.some(row =>
      row.label === "Iradiere solara lunara normativa" &&
      row.value.includes("Anexa nr. A9.6")
    ),
    true
  );

  const notebookText = workspace.report.engineeringNotebook.sections
    .flatMap(section => section.lines)
    .map(line => line.text)
    .join("\n");
  assert.equal(notebookText.includes("Statie_MC001_6_2013 := Bucuresti"), true);
  assert.equal(notebookText.includes("theta_e_lunar_MC001_6_2013 := ianuarie -1,20 degC"), true);
  assert.equal(notebookText.includes("I_solar_lunar := indisponibil"), true);
});

await test("technical report contains the required compact P3G notebook chapters and formula views", () => {
  const workspace = buildBuildingTechnicalWorkspace(
    buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers())
  );
  const chapterTitles = workspace.report.chapters.map(chapter => chapter.title);

  assert.deepEqual(chapterTitles, [
    "Rezultate principale",
    "Amplasare si date climatice utilizate",
    "Caiet de calcule ingineresti",
    "Anexa tehnica interna"
  ]);

  const formulaIds = workspace.formulaViews.map(view => view.formulaId);
  for (const expected of [
    "MC001_LAYER_RESISTANCE_THICKNESS_OVER_LAMBDA",
    "MC001_2_7_U_VALUE_FROM_RELATION_2_6_RESISTANCE",
    "MC001_R17_RELATION_2_15_TOTAL_TRANSMISSION_COEFFICIENT",
    "MC001_MONTHLY_TRANSMISSION_ENERGY_FROM_ENGINE_OUTPUT",
    "MC001_MONTHLY_VENTILATION_ENERGY_FROM_ENGINE_OUTPUT",
    "MC001_MONTHLY_HEAT_GAINS_SUM_FROM_ENGINE_OUTPUT",
    "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH",
    "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND",
    "MC001_2_84_ANNUAL_HEATING_USEFUL_DEMAND",
    "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND"
  ]) {
    assert.equal(formulaIds.includes(expected), true, expected);
  }
  assert.equal(
    workspace.traceability.some(row => row.reference === "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"),
    true
  );
  const uTrace = workspace.formulaViews.find(view => view.formulaId === "MC001_2_7_U_VALUE_FROM_RELATION_2_6_RESISTANCE");
  assert.equal(uTrace.symbolicFormula, "U = 1 / R_total");
  assert.equal(uTrace.substitutedFormula.includes("U = 1 /"), true);
  assert.equal(uTrace.resultLine.includes("W/(m2*K)"), true);
  assert.equal(uTrace.normativeReference, "MC001-2022, relatia 2.7");

  const annualHeating = workspace.formulaViews.find(view => view.formulaId === "MC001_2_84_ANNUAL_HEATING_USEFUL_DEMAND");
  assert.equal(annualHeating.inputVariables.length, 12);
  assert.equal(annualHeating.substitutedFormula.includes("913.3264"), true);
  assert.equal(annualHeating.resultLine, "QHnd_an = 10286.4963 kWh");

  const januaryHeating = workspace.formulaViews.find(view =>
    view.formulaName === "Necesar util lunar de incalzire - january"
  );
  assert.equal(januaryHeating.symbolicFormula, "QHnd = QHht - eta_Hgn * QHgn");
  assert.equal(januaryHeating.substitutedFormula.includes("1213.3021 kWh"), true);
  assert.equal(januaryHeating.substitutedFormula.includes("0.9999"), true);
});

await test("compact calculation notebook has local variables, explicit values and no false numeric expressions", () => {
  const workspace = buildBuildingTechnicalWorkspace(
    buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers())
  );
  const notebook = workspace.report.engineeringNotebook;
  const lines = notebook.sections.flatMap(section => section.lines);
  const text = lines.map(line => line.text).join("\n");

  assert.equal(notebook.sections.every(section => Array.isArray(section.localVariables)), true);
  assert.equal(text.includes("lambda_ref"), false);
  assert.equal(text.includes("0,000 × 0,000 = 0,040"), false);
  assert.equal(text.includes("0.0000 * 0.0000"), false);
  assert.equal(text.includes("-- + + --"), false);
  assert.equal(text.includes("λ_eps := 0,040 W/(m·K) -- valoare introdusa explicit"), true);
  assert.equal(text.includes("U_window := 1,2000 W/(m²K) -- valoare introdusa explicit"), true);
  assert.equal(text.includes("R_window"), false);
  assert.equal(text.includes("ianuarie"), true);
  assert.equal(text.includes("decembrie"), true);

  for (const line of lines) {
    if (!Number.isFinite(Number(line.computedValue))) continue;
    close(Number(line.computedValue), Number(line.resultValue), 1e-3);
  }
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
    "primaryEnergyResult",
    "annualPrimaryEnergy",
    "co2Result",
    "certificateResult"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
