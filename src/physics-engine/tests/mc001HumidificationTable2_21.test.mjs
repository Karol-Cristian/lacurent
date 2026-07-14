import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findHumidificationTable2_21EntryById,
  humidificationTable2_21Entries,
  listHumidificationTable2_21Entries,
  resolveHumidificationTable2_21Value
} from "../datasets/mc001HumidificationTable2_21.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("Table 2.21 humidification entries are machine encoded", () => {
  assert.equal(humidificationTable2_21Entries.length, 12);

  for (const entry of humidificationTable2_21Entries) {
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 2.21");
    assert.equal(entry.sourceSection, "2.9.1");
    assert.equal(entry.sourcePage, 123);
    assert.equal(entry.scope, "humidification_table_2_21_explicit_space_category_lookup");
    assert.ok(entry.annualMoistureSupplyKgHPerKg >= 0);
  }
});

test("Table 2.21 exact values match source-reviewed rows", () => {
  assert.equal(findHumidificationTable2_21EntryById("residential").annualMoistureSupplyKgHPerKg, 0.17);
  assert.equal(findHumidificationTable2_21EntryById("offices").annualMoistureSupplyKgHPerKg, 4.2);
  assert.equal(findHumidificationTable2_21EntryById("education").annualMoistureSupplyKgHPerKg, 4.2);
  assert.equal(findHumidificationTable2_21EntryById("hospitals").annualMoistureSupplyKgHPerKg, 4.2);
  assert.equal(findHumidificationTable2_21EntryById("kitchens").annualMoistureSupplyKgHPerKg, 0);
  assert.equal(findHumidificationTable2_21EntryById("servers").annualMoistureSupplyKgHPerKg, 0);
  assert.equal(findHumidificationTable2_21EntryById("garages").annualMoistureSupplyKgHPerKg, 0);
});

test("Table 2.21 lookup requires explicit category selection", () => {
  const selected = resolveHumidificationTable2_21Value({ categoryId: "hospitals" });

  assert.equal(selected.status, "ready");
  assert.equal(selected.annualMoistureSupplyKgHPerKg, 4.2);
  assert.equal(
    selected.annualMoistureSupplyOrigin,
    "MC001_TABLE_2_21_EXPLICIT_SPACE_CATEGORY_LOOKUP"
  );
  assert.ok(selected.diagnostics.methodologyLimits.includes("not_QHnd"));
  assert.ok(selected.diagnostics.methodologyLimits.includes("not_QCnd"));
  assert.ok(selected.diagnostics.methodologyLimits.includes("not_final_energy"));
  assert.ok(selected.diagnostics.methodologyLimits.includes("not_certificate"));

  const missing = resolveHumidificationTable2_21Value();
  assert.equal(missing.status, "blocked");
  assert.equal(missing.diagnostics.blockers[0].code, "humidification_table_2_21_unknown_space_category");
});

test("Table 2.21 data is immutable", () => {
  const listed = listHumidificationTable2_21Entries();
  const entry = findHumidificationTable2_21EntryById("retail_wholesale");

  assert.equal(Object.isFrozen(humidificationTable2_21Entries), true);
  assert.equal(Object.isFrozen(listed), true);
  assert.equal(Object.isFrozen(entry), true);
  assert.throws(() => listed.push(entry), TypeError);
  assert.throws(() => {
    entry.annualMoistureSupplyKgHPerKg = 9;
  }, TypeError);
});

test("Table 2.21 helper has no runtime PDF network or filesystem dependency", () => {
  const source = readFileSync(
    new URL("../datasets/mc001HumidificationTable2_21.mjs", import.meta.url),
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
