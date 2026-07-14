import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAssemblyCatalogueEntry,
  getBuildingPlatformCatalogue,
  getMaterialCatalogueEntry,
  listAssemblyCatalogueEntries,
  listMaterialCatalogueEntries
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

test("catalogue exposes materials and assemblies with provenance", () => {
  const catalogue = getBuildingPlatformCatalogue();

  assert.equal(catalogue.version, "building_platform_p1_v1");
  assert.equal(listMaterialCatalogueEntries().length >= 6, true);
  assert.equal(listAssemblyCatalogueEntries().length >= 6, true);

  const brick = getMaterialCatalogueEntry("brick_masonry_pre_1990");
  assert.equal(brick.kind, "material");
  assert.equal(brick.physicsMaterial.lambdaNormat.amount, 0.6);
  assert.equal(brick.physicsMaterial.correctionCoefficientCode, "zidarie_caramida_uscata_vechime_ge_30_ani");
  assert.equal(brick.provenance.origin, "proposed_by_typology");
  assert.equal(brick.provenance.confirmationRequired, true);
  assert.match(brick.provenance.normativeReference, /MC001/);

  const wall = getAssemblyCatalogueEntry("wall_masonry_300_eps_100");
  assert.equal(wall.kind, "assembly");
  assert.equal(wall.assemblyRole, "exterior_wall");
  assert.equal(wall.layers[0].materialId, "brick_masonry_pre_1990");
  assert.equal(wall.layers[0].thickness.amount, 0.3);
  assert.equal(wall.layers[1].materialId, "eps_insulation");
  assert.equal(wall.layers[1].thickness.amount, 0.1);
  assert.equal(wall.surfaceResistances.rsi.amount, 0.13);
  assert.equal(wall.surfaceResistances.rse.amount, 0.04);
});

test("catalogue returns defensive copies", () => {
  const first = getMaterialCatalogueEntry("eps_insulation");
  first.physicsMaterial.lambda.amount = 99;
  const second = getMaterialCatalogueEntry("eps_insulation");

  assert.equal(second.physicsMaterial.lambda.amount, 0.04);
});

test("catalogue module has no physics calculator or runtime PDF access", () => {
  const source = readFileSync(
    new URL("../buildingPlatformCatalog.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "calculateMc001",
    "readFile",
    "fetch(",
    "XMLHttpRequest",
    ".pdf",
    "get_text",
    "finalEnergy",
    "primaryEnergy",
    "certificateResult"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
