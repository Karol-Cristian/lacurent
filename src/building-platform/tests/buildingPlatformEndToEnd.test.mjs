import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildEnvelopeAssemblyPhysicsInput,
  calculateChapter2ForBuildingDna,
  createBuildingDnaFromAdvancedModel,
  createBuildingDnaFromAssistedAnswers,
  createP1SeedGeometry
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

function assistedBuildingDna() {
  const result = createBuildingDnaFromAssistedAnswers({
    buildingId: "p1-assisted-brick-house-1985",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: "eps",
      windowsReplaced: true
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    source: {
      reference: "P1.e2e.user_said_detached_brick_house_1985_eps_pvc"
    },
    monthlyProfiles: createP1SeedMonthlyProfiles()
  });
  assert.equal(result.status, "ready");
  return result.buildingDna;
}

await test("wizard-style assisted Building DNA feeds Chapter 2 without platform formulas", () => {
  const buildingDna = assistedBuildingDna();
  const physicsInput = buildEnvelopeAssemblyPhysicsInput(buildingDna);
  const result = calculateChapter2ForBuildingDna(buildingDna);

  assert.equal(physicsInput.assemblies[0].layers[0].material.lambdaNormat.amount, 0.6);
  assert.equal(physicsInput.assemblies[0].layers[0].material.correctionCoefficientCode, "zidarie_caramida_uscata_vechime_ge_30_ani");
  assert.equal(result.status, "ready");
  assert.equal(result.stage, "chapter_2_complete");

  close(result.assemblyResult.assemblyResults.find(item => item.assemblyId === "wall_masonry_300_eps_100").uValue, 0.3169133257438233);
  close(result.envelopeTransmissionResult.result.amount, 64.25708961581125);
  close(result.envelopeTransmissionResult.components.Hd.amount, 40.871819482282156);
  close(result.envelopeTransmissionResult.components.Hg.amount, 13.154500902759864);
  close(result.envelopeTransmissionResult.components.Hu.amount, 9.230769230769228);
  close(result.envelopeTransmissionResult.components.Ha.amount, 1);
  close(result.envelopeTransmissionResult.thermalBridgeResults[0].contributionWK, 0.8);
  close(result.chapter2Result.result.monthlyResults[0].transmission.heating.transmissionEnergy.amount, 925.3020904676819);
  close(result.chapter2Result.result.monthlyResults[0].ventilation.heating.ventilationEnergy.amount, 288);
  close(result.chapter2Result.result.monthlyResults[0].heatGains.internalGains, 120);
  close(result.chapter2Result.result.monthlyResults[0].heatGains.solarGains, 180);
  close(result.chapter2Result.result.heatingResult.caseResults.find(item => item.month === "january").qHnd, 913.3264036320874);
  close(result.chapter2Result.result.coolingResult.caseResults.find(item => item.month === "january").qCnd, 19.4178736507414);
  close(result.chapter2Result.result.annualQHnd, 10286.496332703064);
  close(result.chapter2Result.result.annualQCnd, 2786.7333161081524);
  assert.equal(
    result.chapter2Result.result.combinedUsefulDemandResult.result.totalUsefulDemand,
    undefined
  );
});

await test("advanced mode produces identical Chapter 2 results for equivalent engineering model", () => {
  const assisted = assistedBuildingDna();
  const advancedResult = createBuildingDnaFromAdvancedModel({
    source: { reference: "P1.e2e.advanced_equivalent_model" },
    assemblySelections: assisted.typologyProposal.assemblySelections,
    geometry: createP1SeedGeometry(),
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    building: {
      buildingId: "p1-advanced-equivalent-house",
      buildingType: "detached_house",
      constructionPeriod: "1978_1990",
      structuralSystem: "masonry"
    }
  });
  assert.equal(advancedResult.status, "ready");

  const assistedCalculation = calculateChapter2ForBuildingDna(assisted);
  const advancedCalculation = calculateChapter2ForBuildingDna(advancedResult.buildingDna);

  assert.equal(advancedCalculation.status, "ready");
  close(
    advancedCalculation.chapter2Result.result.annualQHnd,
    assistedCalculation.chapter2Result.result.annualQHnd
  );
  close(
    advancedCalculation.chapter2Result.result.annualQCnd,
    assistedCalculation.chapter2Result.result.annualQCnd
  );
  close(advancedCalculation.chapter2Result.result.annualQHnd, 10286.496332703064);
  close(advancedCalculation.chapter2Result.result.annualQCnd, 2786.7333161081524);
});

await test("Chapter 2 adapter only calls physics engine and does not contain formulas", () => {
  const source = readFileSync(
    new URL("../buildingChapter2Adapter.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
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
