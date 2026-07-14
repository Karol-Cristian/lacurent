import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildBuildingKnowledgePlatformFromAdvancedModel,
  buildBuildingKnowledgePlatformFromAssistedAnswers,
  createBuildingDnaFromAssistedAnswers,
  createP1SeedGeometry,
  createP1SeedMonthlyProfiles
} from "../index.mjs";

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

function assistedAnswers(overrides = {}) {
  return {
    buildingId: "p2-assisted-brick-house-1985",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: "eps",
      windowsReplaced: true
    },
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      windowAreaM2: 8,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationType: "natural"
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    source: {
      reference: "P2.test.assisted_brick_house_1985_eps_pvc"
    },
    ...overrides
  };
}

await test("assisted answers run through the strict Building Knowledge pipeline", () => {
  const result = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "building_knowledge_platform_p2_review_mvp");
  assert.deepEqual(
    result.stages.map(item => item.stageId),
    [
      "user_description",
      "assisted_answers",
      "building_typology_proposal",
      "building_specific_parameters",
      "renovation_interventions",
      "construction_assemblies",
      "normative_material_catalogue",
      "resolved_building_dna",
      "chapter_2_physics_adapter",
      "validated_chapter_2_physics_engine"
    ]
  );
  assert.equal(result.review.renovationInterventions.length, 2);
  assert.equal(result.review.materials.some(item => item.materialId === "eps_insulation"), true);
  assert.equal(result.review.dependencyTrees.annualQHnd.physicsAuthority, "Chapter 2 physics engine");
  close(result.review.results.annualQHnd, 15049.290444172811);
  close(result.review.results.annualQCnd, 2585.419451862434);
  assert.equal(
    result.diagnostics.methodologyLimits.includes("chapter_2_physics_engine_is_calculation_authority"),
    true
  );
});

await test("same typology changes results when building-specific parameters and interventions change", () => {
  const original = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers({
    buildingId: "p2-original-house",
    renovations: {
      wallInsulation: false,
      windowsReplaced: false
    },
    buildingSpecificParameters: {
      usefulFloorAreaM2: 100,
      windowAreaM2: 14,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationType: "natural"
    },
    context: {
      attic: "heated",
      basement: "unheated"
    },
    source: {
      reference: "P2.test.original_same_typology"
    }
  }));
  const renovated = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers({
    buildingId: "p2-renovated-house",
    renovations: {
      wallInsulation: "eps",
      windowsReplaced: true
    },
    buildingSpecificParameters: {
      usefulFloorAreaM2: 100,
      windowAreaM2: 10,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationType: "natural"
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    source: {
      reference: "P2.test.renovated_same_typology"
    }
  }));

  assert.equal(original.status, "ready");
  assert.equal(renovated.status, "ready");
  assert.equal(original.buildingDna.typologyProposal.typologyId, renovated.buildingDna.typologyProposal.typologyId);
  assert.notEqual(original.buildingDna.assemblies[0].assemblyId, renovated.buildingDna.assemblies[0].assemblyId);
  assert.notEqual(
    original.review.results.annualQHnd,
    renovated.review.results.annualQHnd
  );
  assert.notEqual(
    original.review.results.annualQCnd,
    renovated.review.results.annualQCnd
  );
  assert.equal(original.buildingDna.renovationInterventions.length, 0);
  assert.equal(renovated.buildingDna.renovationInterventions.length, 2);
});

await test("advanced mode matches assisted mode for equivalent Building DNA", () => {
  const assistedDna = createBuildingDnaFromAssistedAnswers(assistedAnswers()).buildingDna;
  const advanced = buildBuildingKnowledgePlatformFromAdvancedModel({
    source: { reference: "P2.test.advanced_equivalent" },
    assemblySelections: assistedDna.typologyProposal.assemblySelections,
    geometry: createP1SeedGeometry({
      usefulFloorAreaM2: 120,
      groundFloorAreaM2: 120,
      roofAreaM2: 120,
      windowAreaM2: 8
    }),
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    building: {
      buildingId: "p2-advanced-equivalent",
      buildingType: "detached_house",
      constructionPeriod: "1978_1990",
      structuralSystem: "masonry"
    }
  });
  const assisted = buildBuildingKnowledgePlatformFromAssistedAnswers(assistedAnswers());

  assert.equal(advanced.status, "ready");
  close(advanced.review.results.annualQHnd, assisted.review.results.annualQHnd);
  close(advanced.review.results.annualQCnd, assisted.review.results.annualQCnd);
});

await test("pipeline module has no MC001 formulas runtime PDF access or downstream energy claims", () => {
  const source = readFileSync(
    new URL("../buildingKnowledgePipeline.mjs", import.meta.url),
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
