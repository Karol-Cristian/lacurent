import {
  MC001_6_2013_CLIMATE_DATASET_CHECKSUMS,
  MC001_6_2013_CLIMATE_DATASET_VERSION,
  MC001_6_2013_CLIMATE_SOURCE_DOCUMENT,
  MC001_6_2013_CLIMATE_STATIONS,
  MC001_6_2013_LOCALITY_REGISTRY,
  MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES,
  MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY,
  MC001_6_2013_SUMMER_DESIGN_DAY_TEMPERATURES,
  MC001_6_2013_SUMMER_DESIGN_PENTAD_TEMPERATURES,
  MC001_6_2013_UNAVAILABLE_CLIMATE_DATASETS,
  MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES,
  MC001_6_2013_WINTER_DESIGN_PENTAD_TEMPERATURES
} from "./datasets/mc001_6_2013ClimateDataset.mjs";
import { CLIMATE_DATASET_STATUSES } from "./romanianClimateNormativeDependencies.mjs";
import {
  ROMANIAN_CLIMATE_ZONE_IDS,
  ROMANIAN_WIND_ZONE_IDS,
  validateRomanianClimateZone,
  validateRomanianWindZone
} from "./romanianClimateZones.mjs";

export const ROMANIAN_NORMATIVE_CLIMATE_PROVIDER_VERSION =
  "romanian_normative_climate_provider_p5b2_v1";

export const ROMANIAN_NORMATIVE_CLIMATE_DATASET_STATUSES = Object.freeze({
  NORMATIVE_DATASET: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
  USER_SUPPLIED_CERTIFIED_DATASET: CLIMATE_DATASET_STATUSES.USER_SUPPLIED_CERTIFIED_DATASET,
  DATASET_UNAVAILABLE: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
  TEST_ONLY_SYNTHETIC_DATASET: CLIMATE_DATASET_STATUSES.TEST_ONLY_SYNTHETIC_DATASET
});

const DATASET_IDS = Object.freeze({
  monthlyExteriorTemperature: MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES.tableId,
  monthlyRelativeHumidity: MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY.tableId,
  winterDesignDayTemperature: MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES.tableId,
  winterDesignPentadTemperature: MC001_6_2013_WINTER_DESIGN_PENTAD_TEMPERATURES.tableId,
  summerDesignDayTemperature: MC001_6_2013_SUMMER_DESIGN_DAY_TEMPERATURES.tableId,
  summerDesignPentadTemperature: MC001_6_2013_SUMMER_DESIGN_PENTAD_TEMPERATURES.tableId,
  monthlySolarIrradiation: "mc001_1_2006_annex_a9_6_monthly_solar_irradiation",
  degreeDays: "romanian_normative_degree_day_dataset"
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function byStation(rows) {
  return new Map(rows.map(row => [row.stationId, row]));
}

const MONTHLY_TEMPERATURE_BY_STATION = byStation(MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES.rows);
const MONTHLY_HUMIDITY_BY_STATION = byStation(MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY.rows);
const WINTER_DESIGN_DAY_BY_STATION = byStation(MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES.rows);
const WINTER_DESIGN_PENTAD_BY_STATION = byStation(MC001_6_2013_WINTER_DESIGN_PENTAD_TEMPERATURES.rows);
const SUMMER_DESIGN_DAY_BY_STATION = byStation(MC001_6_2013_SUMMER_DESIGN_DAY_TEMPERATURES.rows);
const SUMMER_DESIGN_PENTAD_BY_STATION = byStation(MC001_6_2013_SUMMER_DESIGN_PENTAD_TEMPERATURES.rows);
const STATION_BY_ID = new Map(MC001_6_2013_CLIMATE_STATIONS.map(station => [station.stationId, station]));
const LOCALITY_BY_ID = new Map(MC001_6_2013_LOCALITY_REGISTRY.map(locality => [locality.localityId, locality]));

function sourceEnvelope(table) {
  return {
    datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    sourceDocument: deepClone(MC001_6_2013_CLIMATE_SOURCE_DOCUMENT),
    sourceReference: deepClone(table.sourceReference),
    provenance: "official_mdlpa_mc001_6_2013_pdf_extracted_with_row_level_source_lines"
  };
}

function unavailableDataset(datasetId, code, sourceReference, affectedCalculations) {
  return {
    datasetId,
    datasetVersion: null,
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    status: "missing",
    diagnostic: {
      code,
      severity: "blocking_for_dependent_calculations",
      sourceReference,
      affectedCalculations
    }
  };
}

function withStationRecord(row, table, valueKeys) {
  if (!row) return null;
  const record = {
    status: "ready",
    datasetId: table.tableId,
    ...sourceEnvelope(table),
    localityId: row.localityId,
    stationId: row.stationId,
    stationName: row.localityName,
    sourceLabel: row.sourceLabel,
    unit: row.unit,
    sourceLine: row.sourceLine,
    meanDailyTemperatureC: row.meanDailyTemperatureC
  };
  for (const key of valueKeys) {
    record[key] = deepClone(row[key]);
  }
  return record;
}

function monthlyDataset(row, table, recordKey, annualKey) {
  if (!row) return null;
  return {
    status: "ready",
    datasetId: table.tableId,
    ...sourceEnvelope(table),
    localityId: row.localityId,
    stationId: row.stationId,
    stationName: row.localityName,
    sourceLabel: row.sourceLabel,
    unit: row.unit,
    temporalResolution: table.temporalResolution,
    sourceLine: row.sourceLine,
    monthlyRecords: row.monthly.map(record => ({
      month: record.month,
      value: record.value,
      unit: row.unit,
      sourceLine: row.sourceLine,
      provenance: `${table.sourceReference}; rand sursa text ${row.sourceLine}`
    })),
    [recordKey]: deepClone(row[recordKey]),
    [annualKey]: row[annualKey]
  };
}

function stationNotFound(stationId) {
  return {
    ok: false,
    status: "blocked",
    code: "ROMANIAN_CLIMATE_STATION_NOT_FOUND",
    stationId,
    diagnostics: [
      {
        code: "ROMANIAN_CLIMATE_STATION_NOT_FOUND",
        severity: "blocking",
        stationId
      }
    ]
  };
}

function resolveStation({ stationId = null, localityId = null } = {}) {
  if (stationId) {
    const station = STATION_BY_ID.get(stationId);
    if (!station) return stationNotFound(stationId);
    return { ok: true, station };
  }
  if (localityId) {
    const locality = LOCALITY_BY_ID.get(localityId);
    if (!locality) {
      return {
        ok: false,
        status: "blocked",
        code: "ROMANIAN_LOCALITY_NOT_FOUND_IN_MC001_6_2013_STATION_REGISTRY",
        localityId,
        diagnostics: [
          {
            code: "ROMANIAN_LOCALITY_NOT_FOUND_IN_MC001_6_2013_STATION_REGISTRY",
            severity: "blocking",
            localityId
          }
        ]
      };
    }
    return { ok: true, station: STATION_BY_ID.get(locality.climateStationId) };
  }
  return {
    ok: true,
    station: null
  };
}

export function listRomanianNormativeClimateStations() {
  return MC001_6_2013_CLIMATE_STATIONS.map(station => {
    const stationId = station.stationId;
    return {
      ...deepClone(station),
      datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
      datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
      coverage: {
        monthlyExteriorTemperature: MONTHLY_TEMPERATURE_BY_STATION.has(stationId),
        monthlyRelativeHumidity: MONTHLY_HUMIDITY_BY_STATION.has(stationId),
        winterDesignDayTemperature: WINTER_DESIGN_DAY_BY_STATION.has(stationId),
        winterDesignPentadTemperature: WINTER_DESIGN_PENTAD_BY_STATION.has(stationId),
        summerDesignDayTemperature: SUMMER_DESIGN_DAY_BY_STATION.has(stationId),
        summerDesignPentadTemperature: SUMMER_DESIGN_PENTAD_BY_STATION.has(stationId),
        monthlySolarIrradiation: false,
        degreeDays: false,
        climateZoneMapping: false,
        windZoneMapping: false
      }
    };
  });
}

export function listRomanianNormativeLocalityStationMappings() {
  return MC001_6_2013_LOCALITY_REGISTRY.map(locality => ({
    ...deepClone(locality),
    datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    assignmentScope:
      "source_backed_locality_to_mc001_6_2013_climate_parameter_station_only_not_climate_or_wind_zone"
  }));
}

export function getRomanianNormativeClimateStation(stationId) {
  const station = STATION_BY_ID.get(stationId);
  if (!station) return null;
  return listRomanianNormativeClimateStations().find(item => item.stationId === stationId);
}

export function findRomanianNormativeStationByLocalityId(localityId) {
  const locality = LOCALITY_BY_ID.get(localityId);
  if (!locality) return null;
  return getRomanianNormativeClimateStation(locality.climateStationId);
}

export function getRomanianNormativeMonthlyExteriorTemperature(stationId) {
  return monthlyDataset(
    MONTHLY_TEMPERATURE_BY_STATION.get(stationId),
    MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES,
    "monthlyMeanExteriorTemperatureC",
    "annualMeanExteriorTemperatureC"
  );
}

export function getRomanianNormativeMonthlyRelativeHumidity(stationId) {
  return monthlyDataset(
    MONTHLY_HUMIDITY_BY_STATION.get(stationId),
    MC001_6_2013_MONTHLY_RELATIVE_HUMIDITY,
    "monthlyMeanRelativeHumidityPct",
    "annualMeanRelativeHumidityPct"
  );
}

export function getRomanianNormativeWinterDesignDayTemperature(stationId) {
  return withStationRecord(
    WINTER_DESIGN_DAY_BY_STATION.get(stationId),
    MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES,
    ["hourlyOutdoorTemperatureC"]
  );
}

export function getRomanianNormativeWinterDesignPentadTemperature(stationId) {
  return withStationRecord(
    WINTER_DESIGN_PENTAD_BY_STATION.get(stationId),
    MC001_6_2013_WINTER_DESIGN_PENTAD_TEMPERATURES,
    ["selectionByMinimumMeanTemperature", "selectionContainingMinimumMeanDay"]
  );
}

export function getRomanianNormativeSummerDesignDayTemperature(stationId) {
  return withStationRecord(
    SUMMER_DESIGN_DAY_BY_STATION.get(stationId),
    MC001_6_2013_SUMMER_DESIGN_DAY_TEMPERATURES,
    ["hourlyOutdoorTemperatureC"]
  );
}

export function getRomanianNormativeSummerDesignPentadTemperature(stationId) {
  return withStationRecord(
    SUMMER_DESIGN_PENTAD_BY_STATION.get(stationId),
    MC001_6_2013_SUMMER_DESIGN_PENTAD_TEMPERATURES,
    ["selectionByMaximumMeanTemperature", "selectionContainingMaximumMeanDay"]
  );
}

export function getRomanianNormativeClimateDatasetMetadata() {
  return {
    providerVersion: ROMANIAN_NORMATIVE_CLIMATE_PROVIDER_VERSION,
    datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
    sourceDocument: deepClone(MC001_6_2013_CLIMATE_SOURCE_DOCUMENT),
    datasetChecksums: deepClone(MC001_6_2013_CLIMATE_DATASET_CHECKSUMS),
    tableIds: deepClone(DATASET_IDS),
    stationCount: MC001_6_2013_CLIMATE_STATIONS.length,
    localityStationMappingCount: MC001_6_2013_LOCALITY_REGISTRY.length,
    unavailableDatasets: deepClone(MC001_6_2013_UNAVAILABLE_CLIMATE_DATASETS)
  };
}

export function resolveRomanianNormativeClimateSelection({
  localityId = null,
  stationId = null,
  climateZone = null,
  windZone = null,
  manualOverride = false,
  overrideReason = null
} = {}) {
  const diagnostics = [];
  if (climateZone !== null && !validateRomanianClimateZone(climateZone)) {
    diagnostics.push({ code: "INVALID_ROMANIAN_CLIMATE_ZONE", severity: "blocking", climateZone });
  }
  if (windZone !== null && !validateRomanianWindZone(windZone)) {
    diagnostics.push({ code: "INVALID_ROMANIAN_WIND_ZONE", severity: "blocking", windZone });
  }
  if (manualOverride && (typeof overrideReason !== "string" || overrideReason.trim().length === 0)) {
    diagnostics.push({ code: "CLIMATE_MANUAL_OVERRIDE_REASON_REQUIRED", severity: "blocking" });
  }

  const resolved = resolveStation({ stationId, localityId });
  if (!resolved.ok) {
    diagnostics.push(...resolved.diagnostics);
  }
  const station = resolved.station ?? null;
  const resolvedStationId = station?.stationId ?? null;
  const monthlyExteriorTemperature =
    resolvedStationId ? getRomanianNormativeMonthlyExteriorTemperature(resolvedStationId) : null;
  const monthlyRelativeHumidity =
    resolvedStationId ? getRomanianNormativeMonthlyRelativeHumidity(resolvedStationId) : null;
  const winterDesignDayTemperature =
    resolvedStationId ? getRomanianNormativeWinterDesignDayTemperature(resolvedStationId) : null;
  const winterDesignPentadTemperature =
    resolvedStationId ? getRomanianNormativeWinterDesignPentadTemperature(resolvedStationId) : null;
  const summerDesignDayTemperature =
    resolvedStationId ? getRomanianNormativeSummerDesignDayTemperature(resolvedStationId) : null;
  const summerDesignPentadTemperature =
    resolvedStationId ? getRomanianNormativeSummerDesignPentadTemperature(resolvedStationId) : null;

  if (!station) {
    diagnostics.push({
      code: "ROMANIAN_CLIMATE_STATION_SELECTION_REQUIRED",
      severity: "blocking_for_station_datasets",
      affectedCalculations: ["monthly_exterior_temperature", "design_day_temperature"]
    });
  }
  if (!validateRomanianClimateZone(climateZone)) {
    diagnostics.push({
      code: "CLIMATE_ZONE_SELECTION_REQUIRED",
      severity: "blocking_for_zone_dependent_lookups",
      affectedCalculations: ["winter_design_temperature_lookup", "zone_dependent_thresholds"]
    });
  }
  if (!validateRomanianWindZone(windZone)) {
    diagnostics.push({
      code: "WIND_ZONE_SELECTION_REQUIRED",
      severity: "metadata_incomplete",
      affectedCalculations: []
    });
  }

  diagnostics.push({
    code: "LOCALITY_TO_CLIMATE_ZONE_MAPPING_NOT_REPRODUCED_IN_MC001_6_2013_INGEST",
    severity: "informational",
    affectedCalculations: ["automatic_climate_zone_assignment"]
  });
  diagnostics.push({
    code: "LOCALITY_TO_WIND_ZONE_MAPPING_NOT_REPRODUCED_IN_MC001_6_2013_INGEST",
    severity: "informational",
    affectedCalculations: ["automatic_wind_zone_assignment"]
  });
  diagnostics.push({
    code: "MONTHLY_SOLAR_IRRADIATION_DATASET_REQUIRED",
    severity: "blocking_for_solar_calculations",
    affectedCalculations: ["chapter2_solar_gains"],
    sourceReference:
      "Mc001/6-2013 Capitolul II.3 delegates monthly solar irradiation for 30 localitati to Anexa nr. A9.6 of Mc001/1-2006."
  });
  diagnostics.push({
    code: "DEGREE_DAY_DATASET_REQUIRED_IF_DEGREE_DAY_METHOD_SELECTED",
    severity: "blocking_for_degree_day_method",
    affectedCalculations: ["degree_day_method"]
  });
  if (station && !winterDesignDayTemperature) {
    diagnostics.push({
      code: "WINTER_DESIGN_DAY_TEMPERATURE_NOT_AVAILABLE_FOR_STATION",
      severity: "blocking_for_station_winter_design_day",
      stationId: resolvedStationId
    });
  }
  if (station && !summerDesignDayTemperature) {
    diagnostics.push({
      code: "SUMMER_DESIGN_DAY_TEMPERATURE_NOT_AVAILABLE_FOR_STATION",
      severity: "blocking_for_station_summer_design_day",
      stationId: resolvedStationId
    });
  }

  const blockingDiagnostic = diagnostics.find(item => item.severity === "blocking") ?? null;
  return {
    status: blockingDiagnostic ? "blocked" : "ready",
    code: blockingDiagnostic?.code ?? null,
    providerVersion: ROMANIAN_NORMATIVE_CLIMATE_PROVIDER_VERSION,
    datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    sourceDocument: deepClone(MC001_6_2013_CLIMATE_SOURCE_DOCUMENT),
    selection: {
      localityId: localityId ?? station?.localityId ?? null,
      localityName: station?.localityName ?? null,
      stationId: resolvedStationId,
      stationName: station?.localityName ?? null,
      climateZone: validateRomanianClimateZone(climateZone) ? climateZone : null,
      windZone: validateRomanianWindZone(windZone) ? windZone : null,
      manualOverride,
      overrideReason: overrideReason ?? null,
      assignmentOrigin: station ? "source_backed_mc001_6_2013_station_selection" : "no_station_selected",
      climateZoneAssignmentOrigin: validateRomanianClimateZone(climateZone)
        ? "explicit_user_selection"
        : "not_assigned",
      windZoneAssignmentOrigin: validateRomanianWindZone(windZone)
        ? "explicit_user_selection"
        : "not_assigned"
    },
    datasets: {
      monthlyExteriorTemperature,
      monthlyRelativeHumidity,
      winterDesignDayTemperature,
      winterDesignPentadTemperature,
      summerDesignDayTemperature,
      summerDesignPentadTemperature,
      monthlySolarIrradiation: unavailableDataset(
        DATASET_IDS.monthlySolarIrradiation,
        "MONTHLY_SOLAR_IRRADIATION_DATASET_REQUIRED",
        "Mc001/6-2013 Capitolul II.3 -> Mc001/1-2006 Anexa nr. A9.6",
        ["chapter2_solar_gains"]
      ),
      degreeDays: unavailableDataset(
        DATASET_IDS.degreeDays,
        "DEGREE_DAY_DATASET_REQUIRED",
        "No explicit degree-day table was found in the ingested MC001/6-2013 Volume I text.",
        ["degree_day_method"]
      )
    },
    diagnostics
  };
}
