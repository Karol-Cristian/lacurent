import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createAssistedTypologyInput,
  proposeBuildingTypology,
  validateTypologyProposal
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

test("assisted detached masonry house proposal selects editable engineering assemblies", () => {
  const result = proposeBuildingTypology(createAssistedTypologyInput({
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: "eps",
      windowsReplaced: true
    },
    context: {
      basement: "none",
      attic: "unheated"
    }
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.proposal.typologyId, "detached_house.masonry.seed");
  assert.equal(result.proposal.assemblySelections.exteriorWall, "wall_masonry_300_eps_100");
  assert.equal(result.proposal.assemblySelections.window, "window_pvc_double_glazing_direct_u");
  assert.equal(result.proposal.boundarySelections.atticCeiling, "unheated_attic");
  assert.equal(result.proposal.provenance.origin, "proposed_by_typology");
  assert.equal(result.proposal.provenance.confirmationRequired, true);
  assert.equal(result.proposal.missingConfirmations.includes("confirm_exterior_wall_layer_stack"), true);
  assert.equal(result.diagnostics.methodologyLimits.includes("no_physics_calculation"), true);
  assert.deepEqual(validateTypologyProposal(result), { ok: true });
});

test("typology stays compositional when insulation and window interventions change", () => {
  const original = proposeBuildingTypology(createAssistedTypologyInput({
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: false,
      windowsReplaced: false
    },
    context: {
      basement: "none",
      attic: "unheated"
    }
  }));
  const renovated = proposeBuildingTypology(createAssistedTypologyInput({
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: "eps",
      windowsReplaced: true
    },
    context: {
      basement: "none",
      attic: "unheated"
    }
  }));

  assert.equal(original.status, "ready");
  assert.equal(renovated.status, "ready");
  assert.equal(original.proposal.typologyId, renovated.proposal.typologyId);
  assert.equal(original.proposal.assemblySelections.exteriorWall, "wall_masonry_300_uninsulated");
  assert.equal(original.proposal.assemblySelections.window, "window_legacy_double_glazing_direct_u");
  assert.equal(renovated.proposal.assemblySelections.exteriorWall, "wall_masonry_300_eps_100");
  assert.equal(renovated.proposal.assemblySelections.window, "window_pvc_double_glazing_direct_u");
});

test("supported structural and wall material selections resolve to distinct exterior wall assemblies", () => {
  const cases = [
    {
      label: "brick_masonry",
      buildingType: "detached_house",
      structuralSystem: "masonry",
      wallMaterial: "brick",
      expectedAssembly: "wall_masonry_300_eps_100"
    },
    {
      label: "aac_masonry",
      buildingType: "detached_house",
      structuralSystem: "masonry",
      wallMaterial: "bca",
      expectedAssembly: "wall_aac_300_eps_100"
    },
    {
      label: "reinforced_concrete_frame",
      buildingType: "detached_house",
      structuralSystem: "reinforced_concrete_frames",
      wallMaterial: "concrete",
      expectedAssembly: "wall_reinforced_concrete_200_eps_100"
    },
    {
      label: "precast_concrete_panel",
      buildingType: "apartment",
      structuralSystem: "precast_concrete_panels",
      wallMaterial: "concrete",
      expectedAssembly: "wall_reinforced_concrete_200_eps_100"
    },
    {
      label: "timber",
      buildingType: "detached_house",
      structuralSystem: "timber",
      wallMaterial: "wood",
      expectedAssembly: "wall_timber_frame_mineral_wool_140"
    }
  ];

  for (const item of cases) {
    const result = proposeBuildingTypology(createAssistedTypologyInput({
      buildingType: item.buildingType,
      constructionPeriod: "1978_1990",
      structuralSystem: item.structuralSystem,
      wallMaterial: item.wallMaterial,
      renovations: {
        wallInsulation: "eps",
        wallInsulationThicknessM: 0.1,
        windowsReplaced: true
      },
      context: {
        basement: "none",
        attic: "unheated"
      }
    }));

    assert.equal(result.status, "ready", item.label);
    assert.equal(result.proposal.assemblySelections.exteriorWall, item.expectedAssembly, item.label);
  }
});

test("unsupported and invalid typologies fail deterministically", () => {
  assert.equal(
    proposeBuildingTypology(createAssistedTypologyInput({
      buildingType: "apartment",
      constructionPeriod: "1978_1990",
      structuralSystem: "timber"
    })).diagnostics.blockers[0].code,
    "building_typology_unsupported_combination"
  );
  assert.equal(
    proposeBuildingTypology({ mode: "wrong" }).diagnostics.blockers[0].code,
    "building_typology_invalid_mode"
  );
});

test("typology module has no physics calculators or downstream claims", () => {
  const source = readFileSync(
    new URL("../buildingTypologyEngine.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "calculateMc001",
    "lambda =",
    "readFile",
    "fetch(",
    ".pdf",
    "Chapter 3",
    "certificateResult"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
