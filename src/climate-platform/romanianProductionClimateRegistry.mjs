import {
  CLIMATE_DATASET_STATUSES,
  evaluateClimateCalculationEligibility,
  getWinterDesignTemperatureByClimateZone
} from "./romanianClimateNormativeDependencies.mjs";
import {
  MC001_6_2013_CLIMATE_DATASET_CHECKSUMS,
  MC001_6_2013_CLIMATE_DATASET_VERSION,
  MC001_6_2013_CLIMATE_SOURCE_DOCUMENT
} from "./datasets/mc001_6_2013ClimateDataset.mjs";
import {
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
  MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT
} from "./datasets/mc001_1_2006SolarIrradiationDataset.mjs";
import {
  listRomanianNormativeClimateStations,
  listRomanianNormativeLocalityStationMappings,
  resolveRomanianNormativeClimateSelection
} from "./romanianNormativeClimateProvider.mjs";
import {
  getClimateZoneDependentRequirements,
  validateRomanianClimateZone,
  validateRomanianWindZone
} from "./romanianClimateZones.mjs";

export const ROMANIAN_PRODUCTION_CLIMATE_REGISTRY_VERSION =
  "romanian_production_climate_registry_p5c_v1";

export const CLIMATE_PROFILE_FIELD_STATUSES = Object.freeze({
  AVAILABLE: "AVAILABLE",
  BOUNDED_UNAVAILABLE: "BOUNDED_UNAVAILABLE",
  NOT_APPLICABLE: "NOT_APPLICABLE"
});

const SOURCE_DOCUMENTS = Object.freeze([
  Object.freeze({
    documentId: "mc001_2022",
    title: "Metodologia de calcul al performantei energetice a cladirilor, MC001-2022",
    edition: "2022",
    repositoryPath: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    purpose: "MC001 climate dependency source, climate zones and Chapter 2/3 runtime formulas"
  }),
  Object.freeze({
    ...MC001_6_2013_CLIMATE_SOURCE_DOCUMENT,
    repositoryPath: "docs/normative/MC001-6-2013-parametrii-climatici.pdf",
    purpose: "monthly exterior temperature, humidity and heating/cooling design climate datasets"
  }),
  Object.freeze({
    ...MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT,
    repositoryPath: "docs/normative/MC001-1-2-3-2006-anexa-a9-6-solar.pdf",
    purpose: "Annex A.9.6 monthly mean daily total/diffuse solar irradiance source rows"
  })
]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function byMonth(records = []) {
  return new Map(records.map(record => [record.month, record]));
}

function availableField({ parameterId, label, value, unit, source, dataset, implementationStatus = "implemented" }) {
  return {
    parameterId,
    label,
    status: CLIMATE_PROFILE_FIELD_STATUSES.AVAILABLE,
    value,
    unit,
    source: deepClone(source),
    dataset: deepClone(dataset),
    implementationStatus
  };
}

function boundedField({
  parameterId,
  label,
  unit = null,
  missingDocument,
  missingTableOrClause,
  blockedRuntimeCalculations,
  reason,
  diagnosticCode
}) {
  return {
    parameterId,
    label,
    status: CLIMATE_PROFILE_FIELD_STATUSES.BOUNDED_UNAVAILABLE,
    value: null,
    unit,
    missingDocument,
    missingTableOrClause,
    blockedRuntimeCalculations,
    reason,
    diagnosticCode,
    implementationStatus: "bounded_external_dependency"
  };
}

function datasetInfo(dataset) {
  if (!dataset) return null;
  return {
    datasetId: dataset.datasetId ?? null,
    datasetVersion: dataset.datasetVersion ?? null,
    datasetStatus: dataset.datasetStatus ?? null,
    sourceReference: dataset.sourceReference ?? null,
    stationId: dataset.stationId ?? null,
    stationName: dataset.stationName ?? null,
    sourceDocument: dataset.sourceDocument ?? null,
    provenance: dataset.provenance ?? null
  };
}

function monthlyClimateRecords(provider) {
  const temperature = byMonth(provider.datasets?.monthlyExteriorTemperature?.monthlyRecords ?? []);
  const humidity = byMonth(provider.datasets?.monthlyRelativeHumidity?.monthlyRecords ?? []);
  const solar = byMonth(provider.datasets?.monthlySolarIrradiation?.monthlyRecords ?? []);
  const months = [...new Set([
    ...temperature.keys(),
    ...humidity.keys(),
    ...solar.keys()
  ])];
  return months.map(month => {
    const temp = temperature.get(month);
    const hum = humidity.get(month);
    const sol = solar.get(month);
    return {
      month,
      exteriorTemperature: temp ? {
        value: temp.value,
        unit: temp.unit,
        sourceLine: temp.sourceLine,
        provenance: temp.provenance
      } : null,
      relativeHumidity: hum ? {
        value: hum.value,
        unit: hum.unit,
        sourceLine: hum.sourceLine,
        provenance: hum.provenance
      } : null,
      solarIrradiance: sol ? {
        valueType: sol.valueType,
        unit: sol.unit,
        totalIrradianceWPerM2: deepClone(sol.totalIrradianceWPerM2),
        diffuseIrradianceWPerM2: deepClone(sol.diffuseIrradianceWPerM2),
        sourcePdfPage: sol.sourcePdfPage,
        sourceTableIndex: sol.sourceTableIndex
      } : null
    };
  });
}

function sourceDocumentForProviderDataset(dataset) {
  return dataset?.sourceDocument ?? null;
}

function collectFields(provider, { climateZone, windZone } = {}) {
  const fields = [];
  const bounded = [];
  const datasets = provider.datasets ?? {};
  if (provider.selection?.localityId) {
    fields.push(availableField({
      parameterId: "locality_station_mapping",
      label: "Localitate / statie climatica MC001/6-2013",
      value: {
        localityId: provider.selection.localityId,
        localityName: provider.selection.localityName,
        stationId: provider.selection.stationId,
        stationName: provider.selection.stationName
      },
      unit: "-",
      source: provider.sourceDocument,
      dataset: { datasetVersion: provider.datasetVersion, datasetStatus: provider.datasetStatus }
    }));
  }

  if (validateRomanianClimateZone(climateZone) && climateZone) {
    fields.push(availableField({
      parameterId: "climate_zone",
      label: "Zona climatica MC001",
      value: climateZone,
      unit: "-",
      source: { sourceReference: "MC001-2022, Figura 2.1 si tabele dependente de zona" },
      dataset: { datasetVersion: "romanian_climate_zone_registry_p5a_v1", datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET }
    }));
    const winter = getWinterDesignTemperatureByClimateZone(climateZone);
    if (winter.status === "ready") {
      fields.push(availableField({
        parameterId: "winter_design_temperature_by_zone",
        label: "Temperatura exterioara de calcul iarna pe zona climatica",
        value: winter.value,
        unit: winter.unit,
        source: { sourceReference: winter.sourceReference },
        dataset: { datasetId: winter.datasetId, datasetVersion: winter.datasetVersion, datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET }
      }));
    }
    const requirements = getClimateZoneDependentRequirements({ climateZone });
    if (requirements.status === "ready") {
      fields.push(availableField({
        parameterId: "zone_dependent_requirements",
        label: "Cerinte dependente de zona climatica",
        value: requirements,
        unit: "-",
        source: { sourceReference: "MC001-2022, Tabel 2.5, Tabel 2.8, Tabel 2.10a, Tabel 2.10b" },
        dataset: { datasetVersion: requirements.datasetVersion, datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET }
      }));
    }
  } else {
    bounded.push(boundedField({
      parameterId: "automatic_climate_zone_assignment",
      label: "Atribuire automata localitate -> zona climatica",
      missingDocument: "registru oficial localitate/judet -> zona climatica nereprodus in MC001-2022 sau MC001/6-2013",
      missingTableOrClause: "harta/lista localitati pentru Figura 2.1",
      blockedRuntimeCalculations: ["zone_dependent_requirements", "winter_design_temperature_by_zone"],
      reason: "Zona I-V poate fi selectata explicit, dar nu poate fi inferata determinist doar din localitate.",
      diagnosticCode: "LOCALITY_TO_CLIMATE_ZONE_MAPPING_NOT_AVAILABLE"
    }));
  }

  if (validateRomanianWindZone(windZone) && windZone) {
    fields.push(availableField({
      parameterId: "wind_zone",
      label: "Zona eoliana",
      value: windZone,
      unit: "-",
      source: { sourceReference: "MC001-2022 formulare/anexe de audit mentioneaza zone eoliene I-IV" },
      dataset: { datasetVersion: "romanian_climate_zone_registry_p5a_v1", datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET }
    }));
  } else {
    bounded.push(boundedField({
      parameterId: "automatic_wind_zone_assignment",
      label: "Atribuire automata localitate -> zona eoliana",
      missingDocument: "registru oficial localitate/judet -> zona eoliana nereprodus in MC001-2022 sau MC001/6-2013",
      missingTableOrClause: "tabel/harta zone eoliene I-IV",
      blockedRuntimeCalculations: [],
      reason: "Nicio relatie activa Chapter 2/3 nu consuma inca parametri de vant, dar profilul climatic pastreaza lipsa explicit.",
      diagnosticCode: "LOCALITY_TO_WIND_ZONE_MAPPING_NOT_AVAILABLE"
    }));
  }

  for (const [parameterId, label, dataset, valueKey, unitFallback] of [
    ["monthly_exterior_temperature", "Temperaturi exterioare medii lunare", datasets.monthlyExteriorTemperature, "monthlyRecords", "degC"],
    ["monthly_relative_humidity", "Umiditate relativa medie lunara", datasets.monthlyRelativeHumidity, "monthlyRecords", "%"],
    ["winter_design_day_temperature", "Zi de calcul iarna", datasets.winterDesignDayTemperature, null, "degC"],
    ["winter_design_pentad_temperature", "Pentada de calcul iarna", datasets.winterDesignPentadTemperature, null, "degC"],
    ["summer_design_day_temperature", "Zi de calcul vara", datasets.summerDesignDayTemperature, null, "degC"],
    ["summer_design_pentad_temperature", "Pentada de calcul vara", datasets.summerDesignPentadTemperature, null, "degC"],
    ["monthly_solar_irradiance_a9_6", "Iradiere solara medie zilnica lunara A.9.6", datasets.monthlySolarIrradiation, "monthlyRecords", "W/m2"]
  ]) {
    if (dataset?.datasetStatus === CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET && dataset.status === "ready") {
      fields.push(availableField({
        parameterId,
        label,
        value: valueKey ? dataset[valueKey] : dataset,
        unit: dataset.unit ?? unitFallback,
        source: sourceDocumentForProviderDataset(dataset),
        dataset: datasetInfo(dataset)
      }));
    }
  }

  bounded.push(
    boundedField({
      parameterId: "source_backed_solar_gains_preprocessing",
      label: "Preprocesare A.9.6 -> Hsol/Qsky pentru Qsol",
      unit: "kWh/m2",
      missingDocument: "SR EN ISO 52010-1",
      missingTableOrClause: "M1-13 preprocessing rules; exact clauses require owned standard",
      blockedRuntimeCalculations: ["source_backed_Qsol", "source_backed_QHnd_QCnd_solar_effect"],
      reason: "A.9.6 furnizeaza W/m2 valori medii zilnice; MC001 2.39/2.50 consuma Hsol [kWh/m2] si termeni Qsky compatibili.",
      diagnosticCode: "SOLAR_IRRADIATION_PREPROCESSING_STANDARD_REQUIRED"
    }),
    boundedField({
      parameterId: "degree_days",
      label: "Grade-zile",
      missingDocument: "Mc001/6-2013 sau lant normativ explicit pentru metoda degree-day",
      missingTableOrClause: "tabel localitate/statie, temperatura de baza si perioada",
      blockedRuntimeCalculations: ["degree_day_method_only_if_selected"],
      reason: "Runtime-ul curent foloseste metoda lunara MC001; metoda degree-day ramane indisponibila fara sursa exacta.",
      diagnosticCode: "DEGREE_DAY_DATASET_REQUIRED"
    }),
    boundedField({
      parameterId: "sky_radiation_inputs",
      label: "Intrari radiatie cer Qsky",
      missingDocument: "sursa delegata exacta sau clauza SR EN ISO 52010-1 ceruta de metoda selectata",
      missingTableOrClause: "coeficienti/temperaturi cer pentru relatia MC001 2.54 daca este selectata",
      blockedRuntimeCalculations: ["sky_radiation_correction_when_selected"],
      reason: "A.9.6 nu reproduce termenii Qsky; runtime-ul nu ii inventeaza.",
      diagnosticCode: "SKY_RADIATION_INPUTS_REQUIRED_IF_SELECTED"
    })
  );

  return { fields, bounded };
}

export function listRomanianProductionClimateLocalities() {
  return listRomanianNormativeClimateStations().map(station => ({
    localityId: station.localityId,
    localityName: station.localityName,
    stationId: station.stationId,
    sourceReference: station.sourceReference,
    datasetVersion: station.datasetVersion,
    coverage: deepClone(station.coverage)
  }));
}

export function resolveRomanianProductionClimateProfile({
  localityId = null,
  localityName = null,
  stationId = null,
  climateZone = null,
  windZone = null,
  manualOverride = false,
  overrideReason = null
} = {}) {
  const provider = resolveRomanianNormativeClimateSelection({
    localityId,
    localityName,
    stationId,
    climateZone,
    windZone,
    manualOverride,
    overrideReason
  });
  const selectedClimateZone = provider.selection?.climateZone ?? null;
  const selectedWindZone = provider.selection?.windZone ?? null;
  const { fields, bounded } = collectFields(provider, {
    climateZone: selectedClimateZone,
    windZone: selectedWindZone
  });
  const eligibility = evaluateClimateCalculationEligibility({
    climate: {
      climateZone: selectedClimateZone,
      windZone: selectedWindZone
    },
    climateProviderResult: provider
  });
  const monthlyRecords = monthlyClimateRecords(provider);
  const implementedSources = SOURCE_DOCUMENTS.map(source => ({
    ...deepClone(source),
    implementedFields: fields
      .filter(field => field.source?.documentId === source.documentId || field.source?.sourceDocument?.documentId === source.documentId)
      .map(field => field.parameterId)
  }));
  return {
    schema: "romanian_production_climate_profile_v1",
    registryVersion: ROMANIAN_PRODUCTION_CLIMATE_REGISTRY_VERSION,
    status: provider.status === "blocked" ? "blocked" : "ready_with_bounded_gaps",
    providerVersion: provider.providerVersion,
    selection: deepClone(provider.selection),
    climateZone: selectedClimateZone,
    windZone: selectedWindZone,
    localityId: provider.selection?.localityId ?? localityId,
    localityName: provider.selection?.localityName ?? null,
    stationId: provider.selection?.stationId ?? stationId,
    stationName: provider.selection?.stationName ?? null,
    sourceDocuments: implementedSources,
    fields,
    monthlyRecords,
    boundedFields: bounded,
    eligibility,
    diagnostics: [
      ...deepClone(provider.diagnostics ?? []),
      ...bounded.map(field => ({
        code: field.diagnosticCode,
        severity: "bounded_unavailable",
        parameterId: field.parameterId,
        missingDocument: field.missingDocument,
        missingTableOrClause: field.missingTableOrClause,
        affectedCalculations: field.blockedRuntimeCalculations
      }))
    ],
    coverage: {
      availableFieldCount: fields.length,
      boundedFieldCount: bounded.length,
      monthlyRecordCount: monthlyRecords.length,
      hasMonthlyExteriorTemperature: Boolean(provider.datasets?.monthlyExteriorTemperature?.monthlyRecords?.length === 12),
      hasMonthlyRelativeHumidity: Boolean(provider.datasets?.monthlyRelativeHumidity?.monthlyRecords?.length === 12),
      hasMonthlySolarIrradianceSourceRows: Boolean(provider.datasets?.monthlySolarIrradiation?.monthlyRecords?.length === 12),
      hasSourceBackedSolarGainPreprocessing: false,
      hasWinterDesignDay: Boolean(provider.datasets?.winterDesignDayTemperature?.status === "ready"),
      hasSummerDesignDay: Boolean(provider.datasets?.summerDesignDayTemperature?.status === "ready")
    },
    datasetVersions: {
      mc001_6_2013: MC001_6_2013_CLIMATE_DATASET_VERSION,
      mc001_1_2006_a9_6: MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION
    },
    datasetChecksums: {
      mc001_6_2013: deepClone(MC001_6_2013_CLIMATE_DATASET_CHECKSUMS),
      mc001_1_2006_a9_6: deepClone(MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS)
    }
  };
}
