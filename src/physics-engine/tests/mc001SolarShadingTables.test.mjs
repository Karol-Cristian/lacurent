import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateAngleCorrectedSolarTransmittance2_40,
  calculateShadedSolarTransmittanceWithTable2_16,
  findObstacleShadingTableEntry,
  findShadingReductionTable2_16EntryById,
  listObstacleShadingTable2_17_2_18Entries,
  listShadingReductionTable2_16Entries,
  obstacleShadingTable2_17_2_18Entries,
  resolveObstacleShadingParameters,
  resolveShadingReductionTable2_16Value,
  shadingReductionTable2_16Entries
} from "../datasets/mc001SolarShadingTables.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("Table 2.16 shading-device entries are machine encoded", () => {
  assert.equal(shadingReductionTable2_16Entries.length, 10);

  for (const entry of shadingReductionTable2_16Entries) {
    assert.equal(typeof entry.id, "string");
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 2.16");
    assert.equal(entry.sourceSection, "2.7.3");
    assert.equal(entry.sourcePage, 105);
    assert.equal(entry.scope, "solar_shading_table_2_16_explicit_device_lookup");
    assert.ok(entry.fshInterior >= 0);
    assert.ok(entry.fshExterior >= 0);
  }
});

test("Table 2.16 exact values match visual source review", () => {
  assert.equal(
    findShadingReductionTable2_16EntryById("white_venetian_blinds_abs_0_1_trans_0_05")
      .fshInterior,
    0.25
  );
  assert.equal(
    findShadingReductionTable2_16EntryById("white_venetian_blinds_abs_0_1_trans_0_05")
      .fshExterior,
    0.1
  );
  assert.equal(findShadingReductionTable2_16EntryById("white_curtains_abs_0_1_trans_0_9").fshInterior, 0.95);
  assert.equal(findShadingReductionTable2_16EntryById("colored_textiles_abs_0_3_trans_0_5").fshExterior, 0.57);
  assert.equal(
    findShadingReductionTable2_16EntryById("aluminium_coated_textiles_abs_0_2_trans_0_05")
      .fshExterior,
    0.08
  );
});

test("Table 2.16 lookup requires explicit device and mounting side", () => {
  const selected = resolveShadingReductionTable2_16Value({
    shadingDeviceId: "colored_textiles_abs_0_3_trans_0_3",
    mountingSide: "interior"
  });

  assert.equal(selected.status, "ready");
  assert.equal(selected.fsh, 0.57);
  assert.equal(selected.fshOrigin, "MC001_TABLE_2_16_EXPLICIT_SHADING_DEVICE_LOOKUP");

  const missingDevice = resolveShadingReductionTable2_16Value({
    mountingSide: "interior"
  });
  assert.equal(missingDevice.status, "blocked");
  assert.equal(missingDevice.diagnostics.blockers[0].code, "solar_shading_table_2_16_unknown_device");

  const invalidSide = resolveShadingReductionTable2_16Value({
    shadingDeviceId: "colored_textiles_abs_0_3_trans_0_3",
    mountingSide: "middle"
  });
  assert.equal(invalidSide.status, "blocked");
  assert.equal(invalidSide.diagnostics.blockers[0].code, "solar_shading_table_2_16_invalid_mounting_side");
});

test("relation 2.40 incidence correction uses explicit ggl,n only", () => {
  const corrected = calculateAngleCorrectedSolarTransmittance2_40({ gglN: 0.75 });
  assert.equal(corrected.status, "ready");
  assert.equal(corrected.ggl, 0.675);
  assert.equal(corrected.formulaCode, "MC001_RELATION_2_40_GGL_EQUALS_0_9_GGL_N");

  const invalid = calculateAngleCorrectedSolarTransmittance2_40({ gglN: 1.2 });
  assert.equal(invalid.status, "blocked");
  assert.equal(invalid.diagnostics.blockers[0].code, "solar_transmittance_2_40_invalid_ggl_n");
});

test("Table 2.16 shaded transmittance applies the source-backed explicit formula", () => {
  const result = calculateShadedSolarTransmittanceWithTable2_16({
    gglN: 0.75,
    shadingDeviceId: "white_venetian_blinds_abs_0_1_trans_0_05",
    mountingSide: "exterior"
  });

  assert.equal(result.status, "ready");
  assert.equal(result.fsh, 0.1);
  assert.equal(result.gglSh, 0.0675);
  assert.equal(result.formulaCode, "ggl_sh_wi = 0.9 * ggl_n_wi * fsh");
});

test("Tables 2.17 and 2.18 obstacle-shading parameter entries are machine encoded", () => {
  assert.equal(obstacleShadingTable2_17_2_18Entries.length, 16);

  const winterSouth = findObstacleShadingTableEntry({ season: "winter", orientation: "S" });
  assert.deepEqual(winterSouth.weights, [0.06, 0.4, 0.47, 0.07]);
  assert.deepEqual(winterSouth.solarAltitudesDegrees, [9.4, 22.8, 22.6, 9.7]);
  assert.equal(winterSouth.fsolDir, 0.75);
  assert.equal(winterSouth.sourceTable, "MC001-2022 Tabel 2.17");

  const summerSouthwest = findObstacleShadingTableEntry({ season: "summer", orientation: "SV" });
  assert.deepEqual(summerSouthwest.weights, [0.03, 0.11, 0.52, 0.34]);
  assert.deepEqual(summerSouthwest.solarAltitudesDegrees, [74.4, 74.4, 54.2, 23.1]);
  assert.equal(summerSouthwest.fsolDir, 0.55);
  assert.equal(summerSouthwest.sourceTable, "MC001-2022 Tabel 2.18");
});

test("Tables 2.17 and 2.18 lookup resolves season from explicit month", () => {
  const january = resolveObstacleShadingParameters({ month: "january", orientation: "E" });
  assert.equal(january.status, "ready");
  assert.equal(january.season, "winter");
  assert.equal(january.fsolDir, 0.5);
  assert.deepEqual(january.sourcePages, [108]);

  const july = resolveObstacleShadingParameters({ month: "july", orientation: "E" });
  assert.equal(july.status, "ready");
  assert.equal(july.season, "summer");
  assert.equal(july.fsolDir, 0.45);
  assert.deepEqual(july.sourcePages, [108, 109]);
  assert.equal(
    july.obstacleParametersOrigin,
    "MC001_TABLES_2_17_2_18_EXPLICIT_MONTH_ORIENTATION_LOOKUP"
  );
});

test("Tables 2.17 and 2.18 lookup rejects invalid month or orientation", () => {
  const invalidMonth = resolveObstacleShadingParameters({ month: "monsoon", orientation: "S" });
  assert.equal(invalidMonth.status, "blocked");
  assert.equal(invalidMonth.diagnostics.blockers[0].code, "obstacle_shading_table_invalid_month");

  const invalidOrientation = resolveObstacleShadingParameters({
    month: "january",
    orientation: "UP"
  });
  assert.equal(invalidOrientation.status, "blocked");
  assert.equal(
    invalidOrientation.diagnostics.blockers[0].code,
    "obstacle_shading_table_unknown_orientation"
  );
});

test("solar shading datasets are immutable", () => {
  const shadingEntries = listShadingReductionTable2_16Entries();
  const obstacleEntries = listObstacleShadingTable2_17_2_18Entries();
  const shadingEntry = findShadingReductionTable2_16EntryById("white_curtains_abs_0_1_trans_0_7");
  const obstacleEntry = findObstacleShadingTableEntry({ season: "summer", orientation: "N" });

  assert.equal(Object.isFrozen(shadingReductionTable2_16Entries), true);
  assert.equal(Object.isFrozen(obstacleShadingTable2_17_2_18Entries), true);
  assert.equal(Object.isFrozen(shadingEntries), true);
  assert.equal(Object.isFrozen(obstacleEntries), true);
  assert.equal(Object.isFrozen(shadingEntry), true);
  assert.equal(Object.isFrozen(obstacleEntry), true);
  assert.equal(Object.isFrozen(obstacleEntry.weights), true);
  assert.equal(Object.isFrozen(obstacleEntry.solarAltitudesDegrees), true);
  assert.throws(() => shadingEntries.push(shadingEntry), TypeError);
  assert.throws(() => {
    obstacleEntry.fsolDir = 9;
  }, TypeError);
});

test("solar shading helper has no runtime PDF network or filesystem dependency", () => {
  const source = readFileSync(
    new URL("../datasets/mc001SolarShadingTables.mjs", import.meta.url),
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
