import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  effectiveInternalHeatCapacityTableEntries,
  findEffectiveInternalHeatCapacityClassById,
  listEffectiveInternalHeatCapacityTableEntries,
  resolveEffectiveInternalHeatCapacityTable2_20Value
} from "../datasets/mc001EffectiveInternalHeatCapacityTables.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("Tables 2.19 and 2.20 effective capacity classes are machine encoded", () => {
  assert.equal(effectiveInternalHeatCapacityTableEntries.length, 5);

  for (const entry of effectiveInternalHeatCapacityTableEntries) {
    assert.equal(typeof entry.id, "string");
    assert.ok(entry.id.length > 0);
    assert.equal(typeof entry.classRo, "string");
    assert.ok(entry.classRo.length > 0);
    assert.equal(typeof entry.specificationRo, "string");
    assert.ok(entry.specificationRo.length > 0);
    assert.ok(entry.kappaMOpJPerM2K > 0);
    assert.ok(entry.cmIntEffCoefficientJPerM2K > 0);
    assert.deepEqual(entry.sourceTables, [
      "MC001-2022 Tabel 2.19",
      "MC001-2022 Tabel 2.20"
    ]);
    assert.equal(entry.sourcePage, 112);
    assert.equal(entry.scope, "effective_internal_heat_capacity_explicit_class_area_lookup");
  }
});

test("Table 2.19 and 2.20 class values match visual-review extraction", () => {
  assert.equal(findEffectiveInternalHeatCapacityClassById("very_light").kappaMOpJPerM2K, 50000);
  assert.equal(findEffectiveInternalHeatCapacityClassById("light").kappaMOpJPerM2K, 75000);
  assert.equal(findEffectiveInternalHeatCapacityClassById("medium").kappaMOpJPerM2K, 110000);
  assert.equal(findEffectiveInternalHeatCapacityClassById("massive").kappaMOpJPerM2K, 175000);
  assert.equal(findEffectiveInternalHeatCapacityClassById("very_massive").kappaMOpJPerM2K, 250000);

  assert.equal(
    findEffectiveInternalHeatCapacityClassById("very_light").cmIntEffCoefficientJPerM2K,
    80000
  );
  assert.equal(findEffectiveInternalHeatCapacityClassById("light").cmIntEffCoefficientJPerM2K, 110000);
  assert.equal(findEffectiveInternalHeatCapacityClassById("medium").cmIntEffCoefficientJPerM2K, 165000);
  assert.equal(findEffectiveInternalHeatCapacityClassById("massive").cmIntEffCoefficientJPerM2K, 260000);
  assert.equal(
    findEffectiveInternalHeatCapacityClassById("very_massive").cmIntEffCoefficientJPerM2K,
    370000
  );
});

test("Table 2.20 resolves effective internal heat capacity from explicit class and Ause", () => {
  const result = resolveEffectiveInternalHeatCapacityTable2_20Value({
    capacityClassId: "medium",
    usefulFloorAreaM2: 120
  });

  assert.equal(result.status, "ready");
  assert.equal(result.capacityClassId, "medium");
  assert.equal(result.cmIntEffCoefficientJPerM2K, 165000);
  assert.equal(result.usefulFloorAreaM2, 120);
  assert.equal(result.effectiveInternalHeatCapacityJPerK, 19800000);
  assert.equal(
    result.effectiveInternalHeatCapacityOrigin,
    "calculated_from_MC001_TABLE_2_20_class_and_explicit_Ause"
  );
  assert.equal(
    result.effectiveInternalHeatCapacityFormulaCode,
    "MC001_TABLE_2_20_EFFECTIVE_INTERNAL_HEAT_CAPACITY_CLASS_AREA"
  );
});

test("Table 2.20 rejects unknown class and missing or invalid explicit Ause", () => {
  const unknown = resolveEffectiveInternalHeatCapacityTable2_20Value({
    capacityClassId: "invented",
    usefulFloorAreaM2: 120
  });
  assert.equal(unknown.status, "blocked");
  assert.equal(unknown.diagnostics.blockers[0].code, "effective_capacity_table_2_20_unknown_class");

  const missingArea = resolveEffectiveInternalHeatCapacityTable2_20Value({
    capacityClassId: "medium"
  });
  assert.equal(missingArea.status, "blocked");
  assert.equal(
    missingArea.diagnostics.blockers[0].code,
    "effective_capacity_table_2_20_missing_explicit_useful_floor_area"
  );

  const invalidArea = resolveEffectiveInternalHeatCapacityTable2_20Value({
    capacityClassId: "medium",
    usefulFloorAreaM2: 0
  });
  assert.equal(invalidArea.status, "blocked");
  assert.equal(
    invalidArea.diagnostics.blockers[0].code,
    "effective_capacity_table_2_20_invalid_explicit_useful_floor_area"
  );
});

test("effective capacity table dataset is immutable", () => {
  const listed = listEffectiveInternalHeatCapacityTableEntries();
  const entry = findEffectiveInternalHeatCapacityClassById("medium");

  assert.equal(Object.isFrozen(effectiveInternalHeatCapacityTableEntries), true);
  assert.equal(Object.isFrozen(listed), true);
  assert.equal(Object.isFrozen(entry), true);
  assert.equal(Object.isFrozen(entry.sourceTables), true);
  assert.throws(() => listed.push(entry), TypeError);
  assert.throws(() => {
    entry.cmIntEffCoefficientJPerM2K = 9;
  }, TypeError);
});

test("effective capacity helper has no filesystem network or PDF dependency", () => {
  const source = readFileSync(
    new URL("../datasets/mc001EffectiveInternalHeatCapacityTables.mjs", import.meta.url),
    "utf8"
  );

  for (const forbidden of [
    "readFile",
    "writeFile",
    "fetch(",
    "http:",
    "https:",
    ".pdf",
    "fitz",
    "pdf"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
