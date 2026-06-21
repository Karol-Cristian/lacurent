import assert from "node:assert/strict";
import {
  findEnvelopeThresholdById,
  findEnvelopeThresholdsByBuildingCategory,
  findEnvelopeThresholdsByElementCategory,
  listAllEnvelopeThresholds,
  listNonResidentialNZEBEnvelopeThresholds,
  listResidentialNZEBEnvelopeThresholds,
  nonResidentialNZEBEnvelopeThresholds,
  residentialNZEBEnvelopeThresholds
} from "../datasets/mc001EnvelopeThresholds.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("datasets have expected entry counts", () => {
  assert.equal(residentialNZEBEnvelopeThresholds.length, 11);
  assert.equal(nonResidentialNZEBEnvelopeThresholds.length, 11);
  assert.equal(listResidentialNZEBEnvelopeThresholds().length, 11);
  assert.equal(listNonResidentialNZEBEnvelopeThresholds().length, 11);
  assert.equal(listAllEnvelopeThresholds().length, 22);
});

test("every entry has required fields and positive numeric thresholds", () => {
  for (const entry of listAllEnvelopeThresholds()) {
    assert.equal(typeof entry.id, "string");
    assert.ok(entry.id.length > 0);
    assert.ok(["residential", "non_residential"].includes(entry.buildingCategory));
    assert.ok(["MC001-2022 Tabel 2.4", "MC001-2022 Tabel 2.7"].includes(entry.table));
    assert.equal(typeof entry.elementCategoryRo, "string");
    assert.ok(entry.elementCategoryRo.length > 0);
    assert.equal(typeof entry.elementTypeRo, "string");
    assert.ok(entry.elementTypeRo.length > 0);
    assert.equal(typeof entry.rPrimeMinM2KPerW, "number");
    assert.ok(entry.rPrimeMinM2KPerW > 0);
    assert.equal(typeof entry.uPrimeMaxWPerM2K, "number");
    assert.ok(entry.uPrimeMaxWPerM2K > 0);
    assert.equal(typeof entry.appliesTo, "string");
    assert.ok(entry.appliesTo.length > 0);
    assert.equal(entry.sourceModule, "04_minimum_envelope_requirements");
    assert.equal(typeof entry.notes, "string");
  }
});

test("selected residential lookup by id returns expected extracted values", () => {
  const exteriorWalls = findEnvelopeThresholdById("exterior_walls_residential_nzeb");
  assert.equal(exteriorWalls.rPrimeMinM2KPerW, 4.0);
  assert.equal(exteriorWalls.uPrimeMaxWPerM2K, 0.25);

  const windows = findEnvelopeThresholdById("exterior_windows_roof_windows_residential_nzeb");
  assert.equal(windows.rPrimeMinM2KPerW, 0.9);
  assert.equal(windows.uPrimeMaxWPerM2K, 1.11);

  const topFloors = findEnvelopeThresholdById(
    "top_floors_under_terrace_or_attic_residential_nzeb"
  );
  assert.equal(topFloors.rPrimeMinM2KPerW, 6.67);
  assert.equal(topFloors.uPrimeMaxWPerM2K, 0.15);
});

test("lookup by building category works", () => {
  const residentialEntries = findEnvelopeThresholdsByBuildingCategory("residential");
  const nonResidentialEntries = findEnvelopeThresholdsByBuildingCategory("non_residential");

  assert.equal(residentialEntries.length, 11);
  assert.equal(nonResidentialEntries.length, 11);
  assert.ok(residentialEntries.every((entry) => entry.table === "MC001-2022 Tabel 2.4"));
  assert.ok(nonResidentialEntries.every((entry) => entry.table === "MC001-2022 Tabel 2.7"));
});

test("lookup by element category works", () => {
  const exteriorWallEntries = findEnvelopeThresholdsByElementCategory("pereti exteriori");
  const exteriorJoineryEntries = findEnvelopeThresholdsByElementCategory("tamplarie exterioara");

  assert.equal(exteriorWallEntries.length, 2);
  assert.deepEqual(
    exteriorWallEntries.map((entry) => entry.id).sort(),
    ["exterior_walls_non_residential_nzeb", "exterior_walls_residential_nzeb"].sort()
  );
  assert.equal(exteriorJoineryEntries.length, 5);
});

test("datasets and returned lookup lists are not mutable from outside", () => {
  const allEntries = listAllEnvelopeThresholds();
  const residentialEntries = listResidentialNZEBEnvelopeThresholds();
  const categoryEntries = findEnvelopeThresholdsByBuildingCategory("residential");
  const selectedEntry = findEnvelopeThresholdById("exterior_walls_residential_nzeb");

  assert.equal(Object.isFrozen(residentialNZEBEnvelopeThresholds), true);
  assert.equal(Object.isFrozen(nonResidentialNZEBEnvelopeThresholds), true);
  assert.equal(Object.isFrozen(allEntries), true);
  assert.equal(Object.isFrozen(residentialEntries), true);
  assert.equal(Object.isFrozen(categoryEntries), true);
  assert.equal(Object.isFrozen(selectedEntry), true);
  assert.throws(() => allEntries.push(selectedEntry), TypeError);
  assert.throws(() => residentialEntries.push(selectedEntry), TypeError);
  assert.throws(() => categoryEntries.push(selectedEntry), TypeError);
  assert.throws(() => {
    selectedEntry.uPrimeMaxWPerM2K = 9;
  }, TypeError);
});
