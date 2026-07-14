import assert from "node:assert/strict";
import {
  exteriorSurfaceResistanceTable2_12Entries,
  findExteriorSurfaceResistanceTable2_12EntryById,
  findSurfaceResistanceTable2_11EntryById,
  surfaceResistanceTable2_11Entries
} from "../datasets/mc001SurfaceResistanceTables.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("Table 2.11 surface resistance entries are machine encoded", () => {
  assert.equal(surfaceResistanceTable2_11Entries.length, 6);
  for (const entry of surfaceResistanceTable2_11Entries) {
    assert.equal(typeof entry.id, "string");
    assert.ok(entry.id.length > 0);
    assert.ok(entry.hiWPerM2K > 0);
    assert.ok(entry.heWPerM2K > 0);
    assert.ok(entry.rsiM2KPerW > 0);
    assert.ok(entry.rseM2KPerW > 0);
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 2.11");
    assert.equal(entry.sourcePage, 78);
  }
});

test("Table 2.11 lookup returns visual-review values", () => {
  assert.equal(
    findSurfaceResistanceTable2_11EntryById("outside_horizontal_heat_flow").rsiM2KPerW,
    0.125
  );
  assert.equal(
    findSurfaceResistanceTable2_11EntryById("outside_horizontal_heat_flow").rseM2KPerW,
    0.042
  );
  assert.equal(
    findSurfaceResistanceTable2_11EntryById("ventilated_unheated_downward_heat_flow")
      .rsiM2KPerW,
    0.167
  );
  assert.equal(
    findSurfaceResistanceTable2_11EntryById("ventilated_unheated_downward_heat_flow")
      .rseM2KPerW,
    0.084
  );
});

test("Table 2.12 exterior surface resistance by wind speed is machine encoded", () => {
  assert.equal(exteriorSurfaceResistanceTable2_12Entries.length, 6);
  assert.equal(
    findExteriorSurfaceResistanceTable2_12EntryById("wind_1_m_per_s").rseM2KPerW,
    0.08
  );
  assert.equal(
    findExteriorSurfaceResistanceTable2_12EntryById("wind_10_m_per_s").rseM2KPerW,
    0.02
  );
});

test("surface resistance datasets and lookup results are immutable", () => {
  const entry = findSurfaceResistanceTable2_11EntryById("outside_horizontal_heat_flow");
  const windEntry = findExteriorSurfaceResistanceTable2_12EntryById("wind_5_m_per_s");

  assert.equal(Object.isFrozen(surfaceResistanceTable2_11Entries), true);
  assert.equal(Object.isFrozen(exteriorSurfaceResistanceTable2_12Entries), true);
  assert.equal(Object.isFrozen(entry), true);
  assert.equal(Object.isFrozen(windEntry), true);
  assert.throws(() => {
    entry.rsiM2KPerW = 9;
  }, TypeError);
});
