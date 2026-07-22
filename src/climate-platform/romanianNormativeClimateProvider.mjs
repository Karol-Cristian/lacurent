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
import {
  MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
  MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT,
  MC001_1_2006_SOLAR_LOCALITY_REGISTRY
} from "./datasets/mc001_1_2006SolarIrradiationDataset.mjs";
import { CLIMATE_DATASET_STATUSES } from "./romanianClimateNormativeDependencies.mjs";
import {
  ROMANIAN_CLIMATE_ZONE_IDS,
  ROMANIAN_WIND_ZONE_IDS,
  validateRomanianClimateZone,
  validateRomanianWindZone
} from "./romanianClimateZones.mjs";

export const ROMANIAN_NORMATIVE_CLIMATE_PROVIDER_VERSION =
  "romanian_normative_climate_provider_p5b3_v1";

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
  monthlySolarIrradiation: MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.tableId,
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
function normalizeLocalityName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function groupedByNormalizedLocalityName(rows) {
  const groups = new Map();
  for (const locality of rows) {
    const key = normalizeLocalityName(locality.localityName);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), locality]);
  }
  return groups;
}

const LOCALITY_BY_NORMALIZED_NAME = groupedByNormalizedLocalityName(MC001_6_2013_LOCALITY_REGISTRY);
const SOLAR_BY_LOCALITY = new Map(
  MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows.map(row => [row.localityId, row])
);
const SOLAR_BY_SOLAR_STATION = new Map(
  MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.rows.map(row => [row.solarStationId, row])
);
const SOLAR_LOCALITY_BY_ID = new Map(
  MC001_1_2006_SOLAR_LOCALITY_REGISTRY.map(locality => [locality.localityId, locality])
);

function sourceEnvelopeForSolar(table) {
  return {
    datasetVersion: MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    sourceDocument: deepClone(MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT),
    sourceReference: table.sourceReference,
    provenance:
      "official_mdlpa_mc001_1_2_3_2006_pdf_annex_a9_6_visual_ocr_extraction_with_cell_level_qa"
  };
}

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

function solarDataset(row) {
  if (!row) return null;
  return {
    status: "ready",
    datasetId: MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.tableId,
    ...sourceEnvelopeForSolar(MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE),
    localityId: row.localityId,
    solarStationId: row.solarStationId,
    climateStationId: row.climateStationId,
    stationId: row.solarStationId,
    stationName: row.localityName,
    sourceLabel: row.sourceLabel,
    unit: row.unit,
    valueType: row.valueType,
    temporalResolution: row.temporalResolution,
    sourcePdfPage: row.sourcePdfPage,
    sourceTableIndex: row.sourceTableIndex,
    monthlyRecords: deepClone(row.monthlyRecords),
    byRow: deepClone(row.byRow),
    extractionQuality: deepClone(row.extractionQuality)
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

function resolveStation({ stationId = null, localityId = null, localityName = null } = {}) {
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
  if (localityName) {
    const normalized = normalizeLocalityName(localityName);
    const matches = LOCALITY_BY_NORMALIZED_NAME.get(normalized) ?? [];
    if (matches.length === 1) {
      return { ok: true, station: STATION_BY_ID.get(matches[0].climateStationId) };
    }
    if (matches.length > 1) {
      return {
        ok: false,
        status: "blocked",
        code: "ROMANIAN_LOCALITY_NAME_AMBIGUOUS_IN_MC001_6_2013_STATION_REGISTRY",
        localityName,
        diagnostics: [
          {
            code: "ROMANIAN_LOCALITY_NAME_AMBIGUOUS_IN_MC001_6_2013_STATION_REGISTRY",
            severity: "blocking",
            localityName,
            candidateLocalityIds: matches.map(match => match.localityId)
          }
        ]
      };
    }
    return {
      ok: false,
      status: "blocked",
      code: "ROMANIAN_LOCALITY_NAME_NOT_FOUND_IN_MC001_6_2013_STATION_REGISTRY",
      localityName,
      diagnostics: [
        {
          code: "ROMANIAN_LOCALITY_NAME_NOT_FOUND_IN_MC001_6_2013_STATION_REGISTRY",
          severity: "blocking",
          localityName
        }
      ]
    };
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
        monthlySolarIrradiation: SOLAR_BY_LOCALITY.has(station.localityId),
        degreeDays: false,
        climateZoneMapping: false,
        windZoneMapping: false
      }
    };
  });
}

export function listRomanianNormativeSolarIrradiationLocalities() {
  return MC001_1_2006_SOLAR_LOCALITY_REGISTRY.map(locality => ({
    ...deepClone(locality),
    datasetVersion: MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    sourceDocument: deepClone(MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT),
    sourceReference: MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE.sourceReference
  }));
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

export function findRomanianNormativeStationByLocalityName(localityName) {
  const resolved = resolveStation({ localityName });
  return resolved.ok && resolved.station
    ? getRomanianNormativeClimateStation(resolved.station.stationId)
    : null;
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

export function getRomanianNormativeMonthlySolarIrradiance({ localityId = null, stationId = null } = {}) {
  if (stationId && SOLAR_BY_SOLAR_STATION.has(stationId)) {
    return solarDataset(SOLAR_BY_SOLAR_STATION.get(stationId));
  }
  if (stationId) {
    const climateStation = STATION_BY_ID.get(stationId);
    if (climateStation && SOLAR_BY_LOCALITY.has(climateStation.localityId)) {
      return solarDataset(SOLAR_BY_LOCALITY.get(climateStation.localityId));
    }
  }
  if (localityId && SOLAR_BY_LOCALITY.has(localityId)) {
    return solarDataset(SOLAR_BY_LOCALITY.get(localityId));
  }
  return null;
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
    datasetVersions: {
      mc001_6_2013: MC001_6_2013_CLIMATE_DATASET_VERSION,
      mc001_1_2006_solar: MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION
    },
    sourceDocument: deepClone(MC001_6_2013_CLIMATE_SOURCE_DOCUMENT),
    sourceDocuments: {
      mc001_6_2013: deepClone(MC001_6_2013_CLIMATE_SOURCE_DOCUMENT),
      mc001_1_2006_solar: deepClone(MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT)
    },
    datasetChecksums: deepClone(MC001_6_2013_CLIMATE_DATASET_CHECKSUMS),
    solarDatasetChecksums: deepClone(MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS),
    tableIds: deepClone(DATASET_IDS),
    stationCount: MC001_6_2013_CLIMATE_STATIONS.length,
    localityStationMappingCount: MC001_6_2013_LOCALITY_REGISTRY.length,
    solarLocalityCount: MC001_1_2006_SOLAR_LOCALITY_REGISTRY.length,
    unavailableDatasets: deepClone(
      MC001_6_2013_UNAVAILABLE_CLIMATE_DATASETS.filter(
        dataset => dataset.datasetId !== "monthly_solar_irradiation"
      )
    )
  };
}

export function resolveRomanianNormativeClimateSelection({
  localityId = null,
  localityName = null,
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

  const resolved = resolveStation({ stationId, localityId, localityName });
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
  const monthlySolarIrradiation = getRomanianNormativeMonthlySolarIrradiance({
    stationId: resolvedStationId,
    localityId
  });

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
  if (!monthlySolarIrradiation) {
    diagnostics.push({
      code: "MONTHLY_SOLAR_IRRADIATION_NOT_AVAILABLE_FOR_SELECTED_STATION",
      severity: "blocking_for_solar_calculations",
      affectedCalculations: ["chapter2_solar_gains"],
      sourceReference:
        "Mc001/1-2-3/2006 Anexa A.9.6 supplies monthly mean daily solar irradiance for 30 named localities only."
    });
  } else {
    diagnostics.push({
      code: "SOLAR_IRRADIATION_PREPROCESSING_STANDARD_REQUIRED_FOR_QSOL",
      severity: "blocking_for_source_backed_solar_gain_preprocessing",
      affectedCalculations: ["chapter2_solar_gains", "QHnd/QCnd source-backed solar-gain effect"],
      sourceReference:
        "A.9.6 supplies W/m2 monthly mean daily irradiance source rows; MC001 relations 2.39 and 2.50 require preprocessed Hsol [kWh/m2] plus Qsky-compatible inputs."
    });
  }
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
      localityName: station?.localityName ?? localityName ?? null,
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
      windZoneAssignmentOrigin: windZone !== null && windZone !== "" && validateRomanianWindZone(windZone)
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
      monthlySolarIrradiation: monthlySolarIrradiation ?? unavailableDataset(
        DATASET_IDS.monthlySolarIrradiation,
        "MONTHLY_SOLAR_IRRADIATION_NOT_AVAILABLE_FOR_SELECTED_STATION",
        "Mc001/1-2-3/2006 Anexa A.9.6",
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
