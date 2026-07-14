import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyBuildingDnaOverride,
  createBuildingDnaFromAdvancedModel,
  createBuildingDnaFromAssistedAnswers,
  createP1SeedGeometry,
  createP1SeedMonthlyProfiles,
  getBuildingDnaDependencyTree
} from "../index.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function assistedDna() {
  return createBuildingDnaFromAssistedAnswers({
    buildingId: "p1-assisted-house",
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
      reference: "P1.test.assisted_answers"
    }
  });
}

test("assisted answers resolve into canonical Building DNA", () => {
  const result = assistedDna();

  assert.equal(result.status, "ready");
  assert.equal(result.buildingDna.schema, "building_dna_v1");
  assert.equal(result.buildingDna.userMode, "assisted");
  assert.equal(result.buildingDna.assemblies.length, 6);
  assert.equal(result.buildingDna.envelopeElements.length, 7);
  assert.equal(result.buildingDna.monthlyProfiles.length, 12);
  assert.equal(result.buildingDna.assemblies[0].layers[0].material.provenance.origin, "proposed_by_typology");
  assert.equal(result.buildingDna.missingConfirmations.includes("confirm_window_system"), true);
  assert.equal(
    result.diagnostics.methodologyLimits.includes("no_physics_calculation"),
    true
  );
});

test("advanced and assisted modes can represent equivalent engineering input", () => {
  const assisted = assistedDna().buildingDna;
  const advanced = createBuildingDnaFromAdvancedModel({
    source: { reference: "P1.test.advanced_model" },
    assemblySelections: assisted.typologyProposal.assemblySelections,
    geometry: createP1SeedGeometry(),
    monthlyProfiles: createP1SeedMonthlyProfiles(),
    building: {
      buildingId: "p1-advanced-house",
      buildingType: "detached_house",
      constructionPeriod: "1978_1990",
      structuralSystem: "masonry"
    }
  });

  assert.equal(advanced.status, "ready");
  assert.equal(advanced.buildingDna.userMode, "advanced");
  assert.equal(advanced.buildingDna.assemblies[0].assemblyId, assisted.assemblies[0].assemblyId);
  assert.equal(advanced.buildingDna.monthlyProfiles[0].heatGains.internalGains.amount, 120);
});

test("resolver blocks missing geometry before physics can run", () => {
  const result = createBuildingDnaFromAdvancedModel({
    source: { reference: "P1.test.invalid_advanced_model" },
    assemblySelections: {
      exteriorWall: "wall_masonry_300_eps_100"
    },
    geometry: {},
    monthlyProfiles: createP1SeedMonthlyProfiles()
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].code, "building_dna_missing_assembly_selection");
});

test("engineering override preserves previous value and provenance", () => {
  const dna = assistedDna().buildingDna;
  const result = applyBuildingDnaOverride(dna, {
    overrideId: "override-wall-brick-thickness",
    kind: "assembly_layer_thickness",
    assemblyId: "wall_masonry_300_eps_100",
    layerId: "brick",
    thicknessM: 0.38,
    reason: "measured_on_site",
    source: {
      reference: "P1.test.override.measured_wall"
    }
  });

  assert.equal(result.status, "ready");
  assert.equal(result.override.previousValue.amount, 0.3);
  assert.equal(result.override.newValue.amount, 0.38);
  assert.equal(result.override.provenance.origin, "engineering_override");
  assert.equal(result.buildingDna.overrides.length, 1);
});

test("dependency tree exposes assumptions without calculating", () => {
  const dna = assistedDna().buildingDna;
  const tree = getBuildingDnaDependencyTree(dna, "annualQHnd");

  assert.equal(tree.status, "ready");
  assert.equal(tree.physicsAuthority, "Chapter 2 physics engine");
  assert.equal(tree.nodes.some(node => node.nodeId === "building.envelope.assemblies"), true);
  assert.equal(tree.nodes.some(node => node.nodeId === "building.monthly_profiles"), true);
  assert.equal(tree.formulaReferences.includes("MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX"), true);
});

test("resolver module has no runtime PDF access or downstream calculations", () => {
  const source = readFileSync(
    new URL("../buildingDnaResolver.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "calculateMc001",
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
