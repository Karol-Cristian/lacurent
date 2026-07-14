import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateWeightedAirChangeRate2_20,
  listVentilationInfiltrationTable2_14Entries,
  resolveVentilationInfiltrationTable2_14Value,
  ventilationInfiltrationTable2_14Entries
} from "../datasets/mc001VentilationInfiltrationTable2_14.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("Tables 2.14a and 2.14b are fully machine encoded", () => {
  assert.equal(ventilationInfiltrationTable2_14Entries.length, 432);

  const n50Rows = ventilationInfiltrationTable2_14Entries.filter((entry) => entry.tableCode === "2.14a");
  const n4Rows = ventilationInfiltrationTable2_14Entries.filter((entry) => entry.tableCode === "2.14b");
  assert.equal(n50Rows.length, 216);
  assert.equal(n4Rows.length, 216);

  for (const entry of ventilationInfiltrationTable2_14Entries) {
    assert.equal(entry.scope, "ventilation_infiltration_table_2_14_explicit_lookup");
    assert.equal(entry.sourceSection, "2.5.1-2.5.2");
    assert.ok(["2.14a", "2.14b"].includes(entry.tableCode));
    assert.ok(entry.airChangeRatePerHour >= 0);
    assert.ok([4, 50].includes(entry.pressureDifferencePa));
  }
});

test("Table 2.14a n50 lookup returns source-reviewed values", () => {
  const individual = resolveVentilationInfiltrationTable2_14Value({
    tableCode: "2.14a",
    buildingCategory: "individual_residential",
    shelterClass: "NA",
    joineryCode: "L1"
  });
  assert.equal(individual.status, "ready");
  assert.equal(individual.airChangeRatePerHour, 1.9);
  assert.equal(individual.pressureDifferencePa, 50);

  const multi = resolveVentilationInfiltrationTable2_14Value({
    tableCode: "2.14a",
    buildingCategory: "multi_apartment_residential",
    exposureClass: "EM",
    shelterClass: "A",
    joineryCode: "A3"
  });
  assert.equal(multi.status, "ready");
  assert.equal(multi.airChangeRatePerHour, 3.33);
  assert.equal(multi.sourceTable, "MC001-2022 Tabel 2.14a");
});

test("Table 2.14b n4 lookup returns source-reviewed values", () => {
  const individual = resolveVentilationInfiltrationTable2_14Value({
    tableCode: "2.14b",
    buildingCategory: "individual_residential",
    shelterClass: "MA",
    joineryCode: "M5"
  });
  assert.equal(individual.status, "ready");
  assert.equal(individual.airChangeRatePerHour, 1.7);
  assert.equal(individual.pressureDifferencePa, 4);

  const multi = resolveVentilationInfiltrationTable2_14Value({
    tableCode: "2.14b",
    buildingCategory: "multi_apartment_residential",
    exposureClass: "ES",
    shelterClass: "A",
    joineryCode: "A3"
  });
  assert.equal(multi.status, "ready");
  assert.equal(multi.airChangeRatePerHour, 0.58);
  assert.equal(multi.sourceTable, "MC001-2022 Tabel 2.14b");
});

test("Table 2.14 lookup blocks ambiguous or incomplete explicit selections", () => {
  const unexpectedExposure = resolveVentilationInfiltrationTable2_14Value({
    tableCode: "2.14b",
    buildingCategory: "individual_residential",
    exposureClass: "ED",
    shelterClass: "NA",
    joineryCode: "L1"
  });
  assert.equal(unexpectedExposure.status, "blocked");
  assert.equal(
    unexpectedExposure.diagnostics.blockers[0].code,
    "ventilation_infiltration_table_2_14_unexpected_exposure_for_individual_building"
  );

  const missingExposure = resolveVentilationInfiltrationTable2_14Value({
    tableCode: "2.14b",
    buildingCategory: "multi_apartment_residential",
    shelterClass: "NA",
    joineryCode: "L1"
  });
  assert.equal(missingExposure.status, "blocked");
  assert.equal(
    missingExposure.diagnostics.blockers[0].code,
    "ventilation_infiltration_table_2_14_missing_multi_apartment_exposure"
  );

  const unknown = resolveVentilationInfiltrationTable2_14Value({
    tableCode: "2.14b",
    buildingCategory: "multi_apartment_residential",
    exposureClass: "ED",
    shelterClass: "NA",
    joineryCode: "invented"
  });
  assert.equal(unknown.status, "blocked");
  assert.equal(unknown.diagnostics.blockers[0].code, "ventilation_infiltration_table_2_14_no_matching_entry");
});

test("relation 2.20 weighted average uses explicit rates and weights only", () => {
  const result = calculateWeightedAirChangeRate2_20({
    components: [
      { airChangeRatePerHour: 0.5, weight: 40 },
      { airChangeRatePerHour: 1.1, weight: 60 }
    ]
  });

  assert.equal(result.status, "ready");
  assert.equal(result.airChangeRatePerHour, 0.86);
  assert.equal(result.totalWeight, 100);
  assert.equal(result.componentCount, 2);
  assert.equal(result.airChangeRateOrigin, "MC001_RELATION_2_20_EXPLICIT_WEIGHTED_AVERAGE");

  const missing = calculateWeightedAirChangeRate2_20();
  assert.equal(missing.status, "blocked");
  assert.equal(missing.diagnostics.blockers[0].code, "ventilation_weighted_air_change_2_20_missing_components");

  const invalidWeight = calculateWeightedAirChangeRate2_20({
    components: [{ airChangeRatePerHour: 0.5, weight: 0 }]
  });
  assert.equal(invalidWeight.status, "blocked");
  assert.equal(invalidWeight.diagnostics.blockers[0].code, "ventilation_weighted_air_change_2_20_invalid_weight");
});

test("Table 2.14 data is immutable", () => {
  const listed = listVentilationInfiltrationTable2_14Entries();
  const first = listed[0];

  assert.equal(Object.isFrozen(ventilationInfiltrationTable2_14Entries), true);
  assert.equal(Object.isFrozen(listed), true);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.sourcePages), true);
  assert.throws(() => listed.push(first), TypeError);
  assert.throws(() => {
    first.airChangeRatePerHour = 9;
  }, TypeError);
});

test("Table 2.14 helper has no runtime PDF network or filesystem dependency", () => {
  const source = readFileSync(
    new URL("../datasets/mc001VentilationInfiltrationTable2_14.mjs", import.meta.url),
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
