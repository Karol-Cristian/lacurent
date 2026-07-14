import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findInternalGainsTable2_15EntryById,
  internalGainsTable2_15Entries,
  listInternalGainsTable2_15Entries,
  resolveInternalGainsTable2_15Value
} from "../datasets/mc001InternalGainsTable2_15.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("Table 2.15 internal-gain flux entries are machine encoded", () => {
  assert.equal(internalGainsTable2_15Entries.length, 5);

  for (const entry of internalGainsTable2_15Entries) {
    assert.equal(typeof entry.id, "string");
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 2.15");
    assert.equal(entry.sourceSection, "2.7.2");
    assert.equal(entry.sourcePage, 103);
    assert.equal(entry.scope, "internal_gains_table_2_15_explicit_category_lookup");
    assert.ok(entry.constantInternalGainWPerM2 > 0);
  }
});

test("Table 2.15 exact values match the reviewed source table", () => {
  assert.equal(
    findInternalGainsTable2_15EntryById("residential_collective").constantInternalGainWPerM2,
    3.1
  );
  assert.equal(
    findInternalGainsTable2_15EntryById("residential_single_family").constantInternalGainWPerM2,
    2.4
  );
  assert.equal(findInternalGainsTable2_15EntryById("administrative").constantInternalGainWPerM2, 3.3);
  assert.equal(findInternalGainsTable2_15EntryById("schools").constantInternalGainWPerM2, 2.3);
  assert.equal(findInternalGainsTable2_15EntryById("hospitals").constantInternalGainWPerM2, 4);
});

test("Table 2.15 lookup requires explicit category selection", () => {
  const selected = resolveInternalGainsTable2_15Value({
    categoryId: "administrative"
  });

  assert.equal(selected.status, "ready");
  assert.equal(selected.constantInternalGainWPerM2, 3.3);
  assert.equal(selected.internalGainFluxOrigin, "MC001_TABLE_2_15_EXPLICIT_CATEGORY_LOOKUP");

  const missing = resolveInternalGainsTable2_15Value();
  assert.equal(missing.status, "blocked");
  assert.equal(missing.diagnostics.blockers[0].code, "internal_gains_table_2_15_unknown_category");
});

test("Table 2.15 data is immutable", () => {
  const listed = listInternalGainsTable2_15Entries();
  const entry = findInternalGainsTable2_15EntryById("hospitals");

  assert.equal(Object.isFrozen(internalGainsTable2_15Entries), true);
  assert.equal(Object.isFrozen(listed), true);
  assert.equal(Object.isFrozen(entry), true);
  assert.throws(() => listed.push(entry), TypeError);
  assert.throws(() => {
    entry.constantInternalGainWPerM2 = 10;
  }, TypeError);
});

test("Table 2.15 helper has no runtime PDF network or filesystem dependency", () => {
  const source = readFileSync(
    new URL("../datasets/mc001InternalGainsTable2_15.mjs", import.meta.url),
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
