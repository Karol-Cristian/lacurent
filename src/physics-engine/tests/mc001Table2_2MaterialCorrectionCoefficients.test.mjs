import assert from "node:assert/strict";
import {
  findMaterialCorrectionCoefficientById,
  findMaterialCorrectionCoefficientsByMaterialCategory,
  listMaterialCorrectionCoefficients,
  materialCorrectionCoefficients
} from "../datasets/mc001Table2_2MaterialCorrectionCoefficients.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("dataset has the expected number of entries", () => {
  assert.equal(materialCorrectionCoefficients.length, 43);
  assert.equal(listMaterialCorrectionCoefficients().length, 43);
});

test("every entry has the required fields and a numeric coefficient above 1", () => {
  for (const entry of materialCorrectionCoefficients) {
    assert.equal(typeof entry.id, "string");
    assert.ok(entry.id.length > 0);
    assert.equal(typeof entry.materialCategoryRo, "string");
    assert.ok(entry.materialCategoryRo.length > 0);
    assert.equal(typeof entry.conditionRo, "string");
    assert.ok(entry.conditionRo.length > 0);
    assert.ok(entry.ageConditionRo || entry.applicabilityRo);
    assert.equal(typeof entry.correctionCoefficientA, "number");
    assert.ok(entry.correctionCoefficientA > 1);
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 2.2");
    assert.equal(entry.sourceModule, "02_materials_lambda_R_U");
    assert.equal(typeof entry.notes, "string");
  }
});

test("selected lookup by id returns verified correction coefficients", () => {
  assert.equal(
    findMaterialCorrectionCoefficientById("polistiren_extrudat_uscat_vechime_ge_10_ani")
      .correctionCoefficientA,
    1.02
  );
  assert.equal(
    findMaterialCorrectionCoefficientById(
      "vata_minerala_vrac_umeda_infiltratii_vechime_ge_10_ani"
    ).correctionCoefficientA,
    1.6
  );
  assert.equal(
    findMaterialCorrectionCoefficientById("zidarie_caramida_igrasie_vechime_ge_30_ani")
      .correctionCoefficientA,
    1.3
  );
});

test("lookup by material category returns all matching condition entries", () => {
  const entries = findMaterialCorrectionCoefficientsByMaterialCategory("polistiren extrudat");

  assert.equal(entries.length, 3);
  assert.deepEqual(
    entries.map((entry) => entry.id).sort(),
    [
      "polistiren_extrudat_condens_vechime_ge_10_ani",
      "polistiren_extrudat_umed_infiltratii_vechime_ge_10_ani",
      "polistiren_extrudat_uscat_vechime_ge_10_ani"
    ].sort()
  );
});

test("dataset and returned lookup lists are not mutable from outside", () => {
  const listedEntries = listMaterialCorrectionCoefficients();
  const categoryEntries = findMaterialCorrectionCoefficientsByMaterialCategory("polistiren extrudat");
  const selectedEntry = findMaterialCorrectionCoefficientById(
    "polistiren_extrudat_uscat_vechime_ge_10_ani"
  );

  assert.equal(Object.isFrozen(materialCorrectionCoefficients), true);
  assert.equal(Object.isFrozen(listedEntries), true);
  assert.equal(Object.isFrozen(categoryEntries), true);
  assert.equal(Object.isFrozen(selectedEntry), true);
  assert.throws(() => listedEntries.push(selectedEntry), TypeError);
  assert.throws(() => categoryEntries.push(selectedEntry), TypeError);
  assert.throws(() => {
    selectedEntry.correctionCoefficientA = 9;
  }, TypeError);
});
