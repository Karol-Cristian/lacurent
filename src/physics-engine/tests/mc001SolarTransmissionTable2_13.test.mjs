import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findSolarTransmissionTable2_13EntryById,
  listSolarTransmissionTable2_13Entries,
  resolveSolarTransmissionTable2_13Value,
  solarTransmissionTable2_13Entries
} from "../datasets/mc001SolarTransmissionTable2_13.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("Table 2.13 glazing solar transmittance entries are machine encoded", () => {
  assert.equal(solarTransmissionTable2_13Entries.length, 8);

  for (const entry of solarTransmissionTable2_13Entries) {
    assert.equal(typeof entry.id, "string");
    assert.ok(entry.id.length > 0);
    assert.equal(typeof entry.glazingTypeRo, "string");
    assert.ok(entry.glazingTypeRo.length > 0);
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 2.13");
    assert.equal(entry.sourceSection, "2.4.2");
    assert.deepEqual(entry.sourcePages, [83, 84]);
    assert.equal(entry.scope, "solar_transmission_table_2_13_explicit_glazing_type_lookup");
    assert.ok(["exact", "range_by_coating_type"].includes(entry.valueKind));
  }
});

test("exact Table 2.13 entries resolve to visual-review ggl,n values", () => {
  assert.equal(findSolarTransmissionTable2_13EntryById("single_clear_glazing").gglN, 0.85);
  assert.equal(findSolarTransmissionTable2_13EntryById("double_clear_glazing").gglN, 0.75);
  assert.equal(findSolarTransmissionTable2_13EntryById("double_window").gglN, 0.75);
  assert.equal(findSolarTransmissionTable2_13EntryById("triple_clear_glazing").gglN, 0.7);
  assert.equal(findSolarTransmissionTable2_13EntryById("double_low_e_face_3").gglN, 0.65);
  assert.equal(findSolarTransmissionTable2_13EntryById("triple_low_e_faces_2_and_5").gglN, 0.5);

  const resolved = resolveSolarTransmissionTable2_13Value({
    glazingTypeId: "double_low_e_face_3"
  });

  assert.equal(resolved.status, "ready");
  assert.equal(resolved.gglN, 0.65);
  assert.equal(resolved.gglNOrigin, "MC001_TABLE_2_13_EXPLICIT_GLAZING_TYPE_LOOKUP");
});

test("range Table 2.13 entries require explicit ggl,n selection within source bounds", () => {
  const doubleRange = findSolarTransmissionTable2_13EntryById(
    "double_multifunction_low_e_solar_control"
  );
  const tripleRange = findSolarTransmissionTable2_13EntryById(
    "triple_multifunction_face_2_low_e_face_5"
  );

  assert.equal(doubleRange.valueKind, "range_by_coating_type");
  assert.deepEqual(doubleRange.gglNRange, [0.21, 0.55]);
  assert.equal(tripleRange.valueKind, "range_by_coating_type");
  assert.deepEqual(tripleRange.gglNRange, [0.19, 0.45]);

  const missing = resolveSolarTransmissionTable2_13Value({
    glazingTypeId: "double_multifunction_low_e_solar_control"
  });
  assert.equal(missing.status, "blocked");
  assert.equal(
    missing.diagnostics.blockers[0].code,
    "solar_transmission_table_2_13_missing_explicit_range_value"
  );

  const selected = resolveSolarTransmissionTable2_13Value({
    glazingTypeId: "double_multifunction_low_e_solar_control",
    explicitGglN: 0.42
  });
  assert.equal(selected.status, "ready");
  assert.equal(selected.gglN, 0.42);
  assert.equal(selected.gglNOrigin, "explicit_value_within_MC001_TABLE_2_13_RANGE");
  assert.deepEqual(selected.sourceRange, [0.21, 0.55]);

  const outOfBounds = resolveSolarTransmissionTable2_13Value({
    glazingTypeId: "triple_multifunction_face_2_low_e_face_5",
    explicitGglN: 0.5
  });
  assert.equal(outOfBounds.status, "blocked");
  assert.equal(
    outOfBounds.diagnostics.blockers[0].code,
    "solar_transmission_table_2_13_explicit_range_value_out_of_bounds"
  );
});

test("Table 2.13 lookup rejects unknown glazing types", () => {
  const result = resolveSolarTransmissionTable2_13Value({
    glazingTypeId: "invented_glazing"
  });

  assert.equal(result.status, "blocked");
  assert.equal(
    result.diagnostics.blockers[0].code,
    "solar_transmission_table_2_13_unknown_glazing_type"
  );
});

test("Table 2.13 datasets and lookup lists are immutable", () => {
  const listed = listSolarTransmissionTable2_13Entries();
  const exact = findSolarTransmissionTable2_13EntryById("single_clear_glazing");
  const range = findSolarTransmissionTable2_13EntryById(
    "double_multifunction_low_e_solar_control"
  );

  assert.equal(Object.isFrozen(solarTransmissionTable2_13Entries), true);
  assert.equal(Object.isFrozen(listed), true);
  assert.equal(Object.isFrozen(exact), true);
  assert.equal(Object.isFrozen(range), true);
  assert.equal(Object.isFrozen(range.gglNRange), true);
  assert.throws(() => listed.push(exact), TypeError);
  assert.throws(() => {
    exact.gglN = 9;
  }, TypeError);
});

test("Table 2.13 runtime helper has no filesystem network or PDF dependency", () => {
  const source = readFileSync(
    new URL("../datasets/mc001SolarTransmissionTable2_13.mjs", import.meta.url),
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
