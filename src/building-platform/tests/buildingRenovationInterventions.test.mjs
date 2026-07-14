import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveBuildingRenovationInterventions } from "../index.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("renovation answers become explicit Building DNA intervention records", () => {
  const result = resolveBuildingRenovationInterventions({
    renovations: {
      wallInsulation: "eps",
      roofInsulated: true,
      floorInsulated: true,
      windowsReplaced: true
    },
    source: {
      reference: "P2.test.renovation_answers"
    }
  });

  assert.equal(result.status, "ready");
  assert.equal(result.interventions.length, 4);
  assert.deepEqual(
    result.interventions.map(item => item.interventionId),
    [
      "external_wall_eps_insulation",
      "roof_or_attic_insulation",
      "floor_or_basement_insulation",
      "window_replacement_pvc_double_glazing"
    ]
  );
  assert.equal(result.interventions[0].effect, "building_dna_proposal_modifier");
  assert.equal(result.interventions[0].provenance.origin, "confirmed_by_user");
  assert.equal(result.diagnostics.methodologyLimits.includes("no_physics_calculation"), true);
});

test("no selected renovations keeps the layer explicit and empty", () => {
  const result = resolveBuildingRenovationInterventions({
    renovations: {
      wallInsulation: false,
      windowsReplaced: false
    },
    source: {
      reference: "P2.test.no_renovations"
    }
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.interventions, []);
});

test("renovation intervention module has no physics formulas or runtime PDF access", () => {
  const source = readFileSync(
    new URL("../buildingRenovationInterventions.mjs", import.meta.url),
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
