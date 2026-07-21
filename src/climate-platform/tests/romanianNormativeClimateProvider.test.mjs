import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  CLIMATE_DATASET_STATUSES,
  CLIMATE_RUNTIME_ELIGIBILITY_STATUSES,
  MONTH_IDS,
  evaluateClimateCalculationEligibility,
  findRomanianNormativeStationByLocalityId,
  getRomanianNormativeClimateDatasetMetadata,
  getRomanianNormativeClimateStation,
  getRomanianNormativeMonthlyExteriorTemperature,
  getRomanianNormativeMonthlyRelativeHumidity,
  getRomanianNormativeSummerDesignDayTemperature,
  getRomanianNormativeSummerDesignPentadTemperature,
  getRomanianNormativeWinterDesignDayTemperature,
  getRomanianNormativeWinterDesignPentadTemperature,
  listRomanianNormativeClimateStations,
  listRomanianNormativeLocalityStationMappings,
  resolveRomanianNormativeClimateSelection
} from "../index.mjs";
import {
  MC001_6_2013_CLIMATE_DATASET_CHECKSUMS,
  MC001_6_2013_CLIMATE_DATASET_VERSION,
  MC001_6_2013_CLIMATE_STATIONS,
  MC001_6_2013_LOCALITY_REGISTRY,
  MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES,
  MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY,
  MC001_6_2013_SUMMER_DESIGN_DAY_TEMPERATURES,
  MC001_6_2013_SUMMER_DESIGN_PENTAD_TEMPERATURES,
  MC001_6_2013_UNAVAILABLE_CLIMATE_DATASETS,
  MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES,
  MC001_6_2013_WINTER_DESIGN_PENTAD_TEMPERATURES
} from "../datasets/mc001_6_2013ClimateDataset.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function byId(rows, key = "stationId") {
  return new Map(rows.map(row => [row[key], row]));
}

test("P5B2 MC001/6-2013 source-pack extract is deterministic and checksum backed", () => {
  const extract = JSON.parse(
    readFileSync(new URL("../../../validation-reference/source-packs/mc001-6-2013-climate-extract.json", import.meta.url), "utf8")
  );
  assert.equal(extract.schema, "mc001_6_2013_climate_extract_v1");
  assert.equal(extract.datasetVersion, MC001_6_2013_CLIMATE_DATASET_VERSION);
  assert.equal(extract.sourceDocument.sha256, "74a67f87ae9da467ed76973e80b1002531d17b6532dcca26ece950ca5792c5b5");
  assert.equal(extract.tables.monthlyExteriorTemperature.rows.length, 42);
  assert.equal(extract.tables.monthlyRelativeHumidity.rows.length, 42);
  assert.equal(extract.tables.winterDesignDayTemperature.rows.length, 41);
  assert.equal(extract.tables.winterDesignPentadTemperature.rows.length, 41);
  assert.equal(extract.tables.summerDesignDayTemperature.rows.length, 41);
  assert.equal(extract.tables.summerDesignPentadTemperature.rows.length, 41);
  assert.equal(
    extract.sourceScope.excludedTables.some(item => item.datasetId === "monthly_solar_irradiation"),
    true
  );
});

test("P5B2 generated registries preserve row counts, uniqueness and checksums", () => {
  const stationIds = MC001_6_2013_CLIMATE_STATIONS.map(station => station.stationId);
  assert.equal(stationIds.length, 42);
  assert.equal(new Set(stationIds).size, 42);
  assert.equal(MC001_6_2013_LOCALITY_REGISTRY.length, 42);
  assert.equal(MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES.rows.length, 42);
  assert.equal(MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY.rows.length, 42);
  assert.equal(MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES.rows.length, 41);
  assert.equal(MC001_6_2013_WINTER_DESIGN_PENTAD_TEMPERATURES.rows.length, 41);
  assert.equal(MC001_6_2013_SUMMER_DESIGN_DAY_TEMPERATURES.rows.length, 41);
  assert.equal(MC001_6_2013_SUMMER_DESIGN_PENTAD_TEMPERATURES.rows.length, 41);

  assert.equal(sha256Json(MC001_6_2013_LOCALITY_REGISTRY), MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.localityRegistry);
  assert.equal(sha256Json(MC001_6_2013_CLIMATE_STATIONS), MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.climateStations);
  assert.equal(
    sha256Json(MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES.rows),
    MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.monthlyExteriorTemperature
  );
  assert.equal(
    sha256Json(MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY.rows),
    MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.monthlyRelativeHumidity
  );
});

test("P5B2 monthly registries have complete month order and fixed source-backed values", () => {
  const temperatures = byId(MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES.rows);
  const humidity = byId(MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY.rows);
  const bucurestiTemperature = temperatures.get("mc001_6_2013_bucuresti");
  const constantaTemperature = temperatures.get("mc001_6_2013_constanta");
  const miercureaTemperature = temperatures.get("mc001_6_2013_miercurea_ciuc");

  assert.deepEqual(bucurestiTemperature.monthly.map(record => record.month), MONTH_IDS);
  assert.equal(bucurestiTemperature.monthlyMeanExteriorTemperatureC.january, -1.2);
  assert.equal(bucurestiTemperature.monthlyMeanExteriorTemperatureC.july, 23.4);
  assert.equal(bucurestiTemperature.annualMeanExteriorTemperatureC, 11.3);
  assert.equal(constantaTemperature.monthlyMeanExteriorTemperatureC.january, 1.4);
  assert.equal(constantaTemperature.monthlyMeanExteriorTemperatureC.july, 23.8);
  assert.equal(miercureaTemperature.monthlyMeanExteriorTemperatureC.january, -6.2);
  assert.equal(miercureaTemperature.annualMeanExteriorTemperatureC, 5.9);
  assert.equal(humidity.get("mc001_6_2013_bucuresti").monthlyMeanRelativeHumidityPct.january, 87.7);
  assert.equal(humidity.get("mc001_6_2013_bucuresti").annualMeanRelativeHumidityPct, 77.1);
});

test("P5B2 design-day and pentad registries preserve fixed Bucharest values", () => {
  const winterDay = getRomanianNormativeWinterDesignDayTemperature("mc001_6_2013_bucuresti");
  const winterPentad = getRomanianNormativeWinterDesignPentadTemperature("mc001_6_2013_bucuresti");
  const summerDay = getRomanianNormativeSummerDesignDayTemperature("mc001_6_2013_bucuresti");
  const summerPentad = getRomanianNormativeSummerDesignPentadTemperature("mc001_6_2013_bucuresti");

  assert.equal(winterDay.meanDailyTemperatureC, -12.32);
  assert.equal(winterDay.hourlyOutdoorTemperatureC["07"], -18.28);
  assert.equal(winterDay.hourlyOutdoorTemperatureC["15"], -3.38);
  assert.equal(winterPentad.selectionByMinimumMeanTemperature.meanPentad, -12.32);
  assert.equal(winterPentad.selectionContainingMinimumMeanDay.z, -17.3);
  assert.equal(summerDay.meanDailyTemperatureC, 29.56);
  assert.equal(summerDay.hourlyOutdoorTemperatureC["15"], 38.02);
  assert.equal(summerPentad.selectionByMaximumMeanTemperature.meanPentad, 29.56);
  assert.equal(summerPentad.selectionContainingMaximumMeanDay.z, 30.59);
});

test("P5B2 climate provider exposes canonical stations without inferring zones or wind zones", () => {
  const stations = listRomanianNormativeClimateStations();
  const mappings = listRomanianNormativeLocalityStationMappings();
  assert.equal(stations.length, 42);
  assert.equal(mappings.length, 42);
  assert.equal(getRomanianNormativeClimateStation("mc001_6_2013_bucuresti").datasetVersion, MC001_6_2013_CLIMATE_DATASET_VERSION);
  assert.equal(findRomanianNormativeStationByLocalityId("ro_bucuresti").stationId, "mc001_6_2013_bucuresti");
  assert.equal(mappings.find(item => item.localityId === "ro_bucuresti").climateZone, null);
  assert.equal(mappings.find(item => item.localityId === "ro_bucuresti").windZone, null);

  const gura = getRomanianNormativeClimateStation("mc001_6_2013_gura_portitei");
  assert.equal(gura.coverage.monthlyExteriorTemperature, true);
  assert.equal(gura.coverage.winterDesignDayTemperature, false);
  assert.equal(gura.coverage.summerDesignDayTemperature, false);
});

test("P5B2 climate provider returns exact datasets and structured missing-data diagnostics", () => {
  const selection = resolveRomanianNormativeClimateSelection({
    stationId: "mc001_6_2013_bucuresti",
    climateZone: "II",
    windZone: "II"
  });
  assert.equal(selection.status, "ready");
  assert.equal(selection.datasetStatus, CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET);
  assert.equal(selection.selection.stationName, "Bucuresti");
  assert.equal(selection.datasets.monthlyExteriorTemperature.monthlyMeanExteriorTemperatureC.january, -1.2);
  assert.equal(selection.datasets.monthlyRelativeHumidity.monthlyMeanRelativeHumidityPct.january, 87.7);
  assert.equal(selection.datasets.monthlySolarIrradiation.datasetStatus, CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE);
  assert.equal(
    selection.diagnostics.some(item => item.code === "MONTHLY_SOLAR_IRRADIATION_DATASET_REQUIRED"),
    true
  );
  assert.equal(
    selection.diagnostics.some(item => item.code === "LOCALITY_TO_CLIMATE_ZONE_MAPPING_NOT_REPRODUCED_IN_MC001_6_2013_INGEST"),
    true
  );

  assert.equal(
    resolveRomanianNormativeClimateSelection({ localityId: "ro_bucuresti" }).diagnostics.some(
      item => item.code === "CLIMATE_ZONE_SELECTION_REQUIRED"
    ),
    true
  );
  assert.equal(
    resolveRomanianNormativeClimateSelection({ stationId: "mc001_6_2013_missing" }).code,
    "ROMANIAN_CLIMATE_STATION_NOT_FOUND"
  );
  assert.equal(
    resolveRomanianNormativeClimateSelection({ climateZone: "VI" }).status,
    "blocked"
  );
});

test("P5B2 eligibility uses normative monthly temperature without treating zone as a full profile", () => {
  const selection = resolveRomanianNormativeClimateSelection({
    stationId: "mc001_6_2013_bucuresti",
    climateZone: "II"
  });
  const eligibility = evaluateClimateCalculationEligibility({
    climate: { climateZone: "II" },
    climateProviderResult: selection
  });
  const byCalculation = new Map(eligibility.map(item => [item.calculationId, item]));
  assert.equal(
    byCalculation.get("chapter2_monthly_transmission_ventilation").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE
  );
  assert.equal(
    byCalculation.get("chapter2_monthly_transmission_ventilation").datasetStatus,
    CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET
  );
  assert.equal(
    byCalculation.get("chapter2_solar_gains").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_DATA
  );
  assert.equal(
    byCalculation.get("chapter2_solar_gains").diagnostic,
    "MONTHLY_SOLAR_IRRADIATION_DATASET_REQUIRED"
  );
});

test("P5B2 metadata exposes source, dataset version, checksums and unavailable datasets", () => {
  const metadata = getRomanianNormativeClimateDatasetMetadata();
  assert.equal(metadata.datasetVersion, MC001_6_2013_CLIMATE_DATASET_VERSION);
  assert.equal(metadata.stationCount, 42);
  assert.equal(metadata.localityStationMappingCount, 42);
  assert.equal(metadata.datasetChecksums.monthlyExteriorTemperature, MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.monthlyExteriorTemperature);
  assert.deepEqual(metadata.unavailableDatasets, MC001_6_2013_UNAVAILABLE_CLIMATE_DATASETS);
  assert.equal(
    metadata.unavailableDatasets.some(item => item.datasetId === "monthly_solar_irradiation"),
    true
  );
});
