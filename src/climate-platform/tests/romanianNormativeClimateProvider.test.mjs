import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  CLIMATE_DATASET_STATUSES,
  CLIMATE_RUNTIME_ELIGIBILITY_STATUSES,
  MC001_1_2006_A9_6_HSOL_DATASET_VERSION,
  MONTH_IDS,
  evaluateClimateCalculationEligibility,
  findRomanianNormativeStationByLocalityId,
  findRomanianNormativeStationByLocalityName,
  getRomanianNormativeClimateDatasetMetadata,
  getRomanianNormativeClimateStation,
  getRomanianNormativeMonthlyExteriorTemperature,
  getRomanianNormativeMonthlyHsolFromAnnexA96,
  getRomanianNormativeMonthlyRelativeHumidity,
  getRomanianNormativeMonthlySolarIrradiance,
  getRomanianNormativeSummerDesignDayTemperature,
  getRomanianNormativeSummerDesignPentadTemperature,
  getRomanianNormativeWinterDesignDayTemperature,
  getRomanianNormativeWinterDesignPentadTemperature,
  listRomanianNormativeClimateStations,
  listRomanianNormativeLocalityStationMappings,
  listRomanianNormativeSolarIrradiationLocalities,
  listRomanianProductionClimateLocalities,
  resolveRomanianProductionClimateProfile,
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
import {
  MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
  MC001_1_2006_SOLAR_LOCALITY_REGISTRY
} from "../datasets/mc001_1_2006SolarIrradiationDataset.mjs";

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

test("P5B3 MC001/1-2-3/2006 A.9.6 solar source pack is deterministic and checksum backed", () => {
  const extract = JSON.parse(
    readFileSync(new URL("../../../validation-reference/source-packs/mc001-1-2006-annex-a9-6-solar-extract.json", import.meta.url), "utf8")
  );
  assert.equal(extract.schema, "mc001_1_2006_annex_a9_6_solar_extract_v1");
  assert.equal(extract.datasetVersion, MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION);
  assert.equal(extract.sourceDocument.sha256, "e136e0fc961701aa033f5ff5194c6f3708fc5390cdf25a5c30c1b76371f5e4df");
  assert.equal(extract.tables.monthlySolarIrradiance.rows.length, 30);
  assert.equal(extract.tables.monthlySolarIrradiance.cellCount, 3960);
  assert.equal(extract.extractionQuality.manuallyReviewedCells, 165);
  assert.equal(extract.extractionQuality.symmetryPairFailuresAfterReview, 0);
  assert.deepEqual(extract.tables.monthlySolarIrradiance.sourcePdfPages, [119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129]);
});

test("P5B3 generated solar registry preserves row counts, symmetry and fixed A.9.6 values", () => {
  assert.equal(MC001_1_2006_SOLAR_LOCALITY_REGISTRY.length, 30);
  assert.equal(MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows.length, 30);
  assert.equal(MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.cellCount, 3960);
  assert.equal(
    sha256Json(MC001_1_2006_SOLAR_LOCALITY_REGISTRY),
    MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS.localityRegistry
  );
  assert.equal(
    sha256Json(MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows),
    MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS.monthlySolarIrradianceRows
  );

  for (const locality of MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows) {
    assert.equal(locality.monthlyRecords.length, 12);
    assert.deepEqual(locality.monthlyRecords.map(record => record.month), MONTH_IDS);
    for (const record of locality.monthlyRecords) {
      assert.equal(record.totalIrradianceWPerM2.southWest, record.totalIrradianceWPerM2.southEast);
      assert.equal(record.totalIrradianceWPerM2.west, record.totalIrradianceWPerM2.east);
      assert.equal(record.totalIrradianceWPerM2.northWest, record.totalIrradianceWPerM2.northEast);
    }
  }

  const bucuresti = MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows.find(row => row.localityId === "ro_bucuresti");
  assert.equal(bucuresti.monthlyRecords[0].totalIrradianceWPerM2.south, 76.7);
  assert.equal(bucuresti.monthlyRecords[0].totalIrradianceWPerM2.horizontal, 49.6);
  assert.equal(bucuresti.monthlyRecords[0].diffuseIrradianceWPerM2.horizontal, 27.1);
  assert.equal(bucuresti.monthlyRecords[6].totalIrradianceWPerM2.horizontal, 200.8);
  assert.equal(bucuresti.monthlyRecords[11].totalIrradianceWPerM2.north, 11.7);

  const alexandria = MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows.find(row => row.localityId === "ro_alexandria");
  assert.equal(alexandria.monthlyRecords[0].totalIrradianceWPerM2.south, 74.5);
  assert.equal(alexandria.monthlyRecords[6].totalIrradianceWPerM2.horizontal, 254.6);
  assert.equal(alexandria.monthlyRecords[11].diffuseIrradianceWPerM2.horizontal, 23.6);
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
  assert.equal(findRomanianNormativeStationByLocalityName("Bucuresti").stationId, "mc001_6_2013_bucuresti");
  assert.equal(findRomanianNormativeStationByLocalityName("Cluj-Napoca").stationId, "mc001_6_2013_cluj_napoca");
  assert.equal(
    resolveRomanianNormativeClimateSelection({
      localityName: "Bucuresti",
      climateZone: "II"
    }).selection.stationId,
    "mc001_6_2013_bucuresti"
  );
  assert.equal(mappings.find(item => item.localityId === "ro_bucuresti").climateZone, null);
  assert.equal(mappings.find(item => item.localityId === "ro_bucuresti").windZone, null);

  const gura = getRomanianNormativeClimateStation("mc001_6_2013_gura_portitei");
  assert.equal(gura.coverage.monthlyExteriorTemperature, true);
  assert.equal(gura.coverage.winterDesignDayTemperature, false);
  assert.equal(gura.coverage.summerDesignDayTemperature, false);
  assert.equal(gura.coverage.monthlySolarIrradiation, false);
  assert.equal(getRomanianNormativeClimateStation("mc001_6_2013_bucuresti").coverage.monthlySolarIrradiation, true);
});

test("P5B3 climate provider returns exact datasets and source-backed solar irradiation", () => {
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
  assert.equal(selection.datasets.monthlySolarIrradiation.datasetStatus, CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET);
  assert.equal(selection.datasets.monthlySolarIrradiation.datasetVersion, MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION);
  assert.equal(selection.datasets.monthlySolarIrradiation.monthlyRecords[0].totalIrradianceWPerM2.south, 76.7);
  assert.equal(selection.datasets.monthlySolarIrradiation.monthlyRecords[0].diffuseIrradianceWPerM2.horizontal, 27.1);
  assert.equal(
    selection.diagnostics.some(item => item.code === "MONTHLY_SOLAR_IRRADIATION_DATASET_REQUIRED"),
    false
  );
  assert.equal(
    selection.datasets.monthlyHsolVerticalHorizontal.datasetStatus,
    CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET
  );
  assert.equal(
    selection.datasets.monthlyHsolVerticalHorizontal.datasetVersion,
    MC001_1_2006_A9_6_HSOL_DATASET_VERSION
  );
  assert.equal(
    selection.datasets.monthlyHsolVerticalHorizontal.monthlyRecords[0].hsolKwhPerM2ByOrientation.south,
    57.0648
  );
  assert.equal(
    selection.datasets.monthlyHsolVerticalHorizontal.monthlyRecords[0].hsolKwhPerM2ByOrientation.horizontal,
    36.9024
  );
  assert.equal(
    selection.datasets.monthlyHsolVerticalHorizontal.monthlyRecords[6].hsolKwhPerM2ByOrientation.horizontal,
    149.3952
  );
  assert.equal(
    selection.diagnostics.some(item => item.code === "A9_6_VERTICAL_HORIZONTAL_HSOL_AVAILABLE_QSKY_REQUIRED_FOR_QSOL"),
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

  const solarLocalities = listRomanianNormativeSolarIrradiationLocalities();
  assert.equal(solarLocalities.length, 30);
  assert.equal(solarLocalities.some(locality => locality.localityId === "ro_barlad"), true);
  assert.equal(
    getRomanianNormativeMonthlySolarIrradiance({ localityId: "ro_barlad" }).monthlyRecords[0].totalIrradianceWPerM2.south,
    70.2
  );

  const unavailableSolar = resolveRomanianNormativeClimateSelection({
    stationId: "mc001_6_2013_gura_portitei",
    climateZone: "II"
  });
  assert.equal(unavailableSolar.datasets.monthlySolarIrradiation.datasetStatus, CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE);
  assert.equal(
    unavailableSolar.diagnostics.some(item => item.code === "MONTHLY_SOLAR_IRRADIATION_NOT_AVAILABLE_FOR_SELECTED_STATION"),
    true
  );
});

test("P7B provider derives source-backed Hsol for A.9.6 vertical and horizontal planes", () => {
  const hsol = getRomanianNormativeMonthlyHsolFromAnnexA96({
    localityId: "ro_bucuresti"
  });
  assert.equal(hsol.status, "ready");
  assert.equal(hsol.datasetStatus, CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET);
  assert.equal(hsol.datasetVersion, MC001_1_2006_A9_6_HSOL_DATASET_VERSION);
  assert.deepEqual(hsol.supportedOrientations, [
    "north",
    "northEast",
    "east",
    "southEast",
    "south",
    "southWest",
    "west",
    "northWest",
    "horizontal"
  ]);
  assert.equal(hsol.monthlyRecords[0].hsolKwhPerM2ByOrientation.south, 57.0648);
  assert.equal(hsol.monthlyRecords[0].hsolKwhPerM2ByOrientation.horizontal, 36.9024);
  assert.equal(hsol.monthlyRecords[6].hsolKwhPerM2ByOrientation.horizontal, 149.3952);
  assert.equal(
    hsol.monthlyRecords[0].executionTraceByOrientation.south.formulaId,
    "P7B_A9_6_MEAN_DAILY_IRRADIANCE_TO_MONTHLY_HSOL_UNIT_INTEGRATION"
  );
  assert.equal(hsol.monthlyRecords[0].executionTraceByOrientation.south.finalResult, 57.0648);
  assert.deepEqual(JSON.parse(JSON.stringify(hsol)), hsol);

  const south = getRomanianNormativeMonthlyHsolFromAnnexA96({
    stationId: "mc001_6_2013_bucuresti",
    orientation: "S"
  });
  assert.equal(south.orientation, "south");
  assert.equal(south.monthlyRecords[0].sourceIrradianceWPerM2, 76.7);
  assert.equal(south.monthlyRecords[0].durationHours, 744);
  assert.equal(south.monthlyRecords[0].value, 57.0648);

  const unsupported = getRomanianNormativeMonthlyHsolFromAnnexA96({
    localityId: "ro_bucuresti",
    orientation: "tilt_35"
  });
  assert.equal(unsupported.status, "blocked");
  assert.equal(unsupported.code, "A9_6_HSOL_ORIENTATION_NOT_SOURCE_BACKED");
  assert.equal(unsupported.diagnostics[0].missingDocument, "SR EN ISO 52010-1");

  for (const locality of listRomanianNormativeSolarIrradiationLocalities()) {
    const localityHsol = getRomanianNormativeMonthlyHsolFromAnnexA96({
      localityId: locality.localityId
    });
    assert.equal(localityHsol.monthlyRecords.length, 12);
    for (const record of localityHsol.monthlyRecords) {
      for (const orientation of localityHsol.supportedOrientations) {
        assert.equal(Number.isFinite(record.hsolKwhPerM2ByOrientation[orientation]), true);
      }
    }
  }
});

test("P5B3 eligibility uses normative monthly temperature and bounds Qsol/Qsky completion", () => {
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
    byCalculation.get("chapter2_solar_source_dataset_identity").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE
  );
  assert.equal(
    byCalculation.get("chapter2_hsol_vertical_horizontal").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE
  );
  assert.equal(
    byCalculation.get("chapter2_solar_gains").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_PREPROCESSING
  );
  assert.equal(
    byCalculation.get("chapter2_solar_gains").datasetStatus,
    CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET
  );
  assert.equal(
    byCalculation.get("chapter2_solar_gains").diagnostic,
    "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED"
  );

  const uncoveredStation = resolveRomanianNormativeClimateSelection({
    stationId: "mc001_6_2013_gura_portitei",
    climateZone: "II"
  });
  const uncoveredEligibility = new Map(evaluateClimateCalculationEligibility({
    climate: { climateZone: "II" },
    climateProviderResult: uncoveredStation
  }).map(item => [item.calculationId, item]));
  assert.equal(
    uncoveredEligibility.get("chapter2_solar_source_dataset_identity").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_DATA
  );
  assert.equal(
    uncoveredEligibility.get("chapter2_solar_gains").status,
    CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_DATA
  );
  assert.equal(
    uncoveredEligibility.get("chapter2_solar_gains").diagnostic,
    "MONTHLY_SOLAR_IRRADIATION_NOT_AVAILABLE_FOR_SELECTED_STATION"
  );
});

test("P5B3 metadata exposes temperature and solar sources, dataset versions and checksums", () => {
  const metadata = getRomanianNormativeClimateDatasetMetadata();
  assert.equal(metadata.datasetVersion, MC001_6_2013_CLIMATE_DATASET_VERSION);
  assert.equal(metadata.datasetVersions.mc001_1_2006_solar, MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION);
  assert.equal(metadata.datasetVersions.mc001_1_2006_hsol, MC001_1_2006_A9_6_HSOL_DATASET_VERSION);
  assert.equal(metadata.stationCount, 42);
  assert.equal(metadata.localityStationMappingCount, 42);
  assert.equal(metadata.solarLocalityCount, 30);
  assert.equal(metadata.datasetChecksums.monthlyExteriorTemperature, MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.monthlyExteriorTemperature);
  assert.equal(
    metadata.solarDatasetChecksums.monthlySolarIrradianceRows,
    MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS.monthlySolarIrradianceRows
  );
  assert.equal(
    metadata.unavailableDatasets.some(item => item.datasetId === "monthly_solar_irradiation"),
    false
  );
  assert.equal(
    metadata.unavailableDatasets.some(item => item.datasetId === "degree_days"),
    true
  );
  assert.equal(
    MC001_6_2013_UNAVAILABLE_CLIMATE_DATASETS.some(item => item.datasetId === "monthly_solar_irradiation"),
    true
  );
});

test("P5C production ClimateProfile resolves all source-backed locality fields and bounds missing sources", () => {
  const profile = resolveRomanianProductionClimateProfile({
    localityId: "ro_bucuresti",
    climateZone: "II",
    windZone: "II"
  });
  assert.equal(profile.status, "ready_with_bounded_gaps");
  assert.equal(profile.registryVersion, "romanian_production_climate_registry_p5c_v1");
  assert.equal(profile.stationId, "mc001_6_2013_bucuresti");
  assert.equal(profile.coverage.hasMonthlyExteriorTemperature, true);
  assert.equal(profile.coverage.hasMonthlyRelativeHumidity, true);
  assert.equal(profile.coverage.hasMonthlySolarIrradianceSourceRows, true);
  assert.equal(profile.coverage.hasMonthlyHsolVerticalHorizontal, true);
  assert.equal(profile.coverage.hasWinterDesignDay, true);
  assert.equal(profile.coverage.hasSummerDesignDay, true);
  assert.equal(profile.coverage.hasSourceBackedSolarGainPreprocessing, false);
  assert.equal(profile.monthlyRecords.length, 12);

  const fields = new Map(profile.fields.map(field => [field.parameterId, field]));
  assert.equal(fields.get("monthly_exterior_temperature").value[0].value, -1.2);
  assert.equal(fields.get("monthly_relative_humidity").value[0].value, 87.7);
  assert.equal(fields.get("monthly_solar_irradiance_a9_6").value[0].totalIrradianceWPerM2.horizontal, 49.6);
  assert.equal(fields.get("monthly_hsol_a9_6_vertical_horizontal").value[0].hsolKwhPerM2ByOrientation.south, 57.0648);
  assert.equal(fields.get("winter_design_day_temperature").value.meanDailyTemperatureC, -12.32);
  assert.equal(fields.get("summer_design_day_temperature").value.meanDailyTemperatureC, 29.56);

  const bounded = new Map(profile.boundedFields.map(field => [field.parameterId, field]));
  assert.equal(
    bounded.get("source_backed_qsol_qsky_completion").missingDocument,
    "SR EN ISO 52010-1 sau sursa explicita pentru Qsky/elemente solare"
  );
  assert.equal(
    profile.diagnostics.some(item => item.code === "A9_6_VERTICAL_HORIZONTAL_HSOL_AVAILABLE_QSKY_REQUIRED_FOR_QSOL"),
    true
  );

  const localities = listRomanianProductionClimateLocalities();
  assert.equal(localities.length, 42);
  assert.equal(localities.some(locality => locality.localityId === "ro_bucuresti"), true);
});
