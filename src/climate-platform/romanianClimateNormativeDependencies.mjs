import { MONTH_IDS, SOLAR_ORIENTATIONS } from "./romanianClimateProfiles.mjs";
import {
  MC001_6_2013_CLIMATE_DATASET_CHECKSUMS,
  MC001_6_2013_CLIMATE_DATASET_VERSION,
  MC001_6_2013_CLIMATE_SOURCE_DOCUMENT
} from "./datasets/mc001_6_2013ClimateDataset.mjs";
import {
  MC001_1_2006_MONTHLY_SOLAR_IRRADIANCE,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
  MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT,
  MC001_1_2006_SOLAR_LOCALITY_REGISTRY
} from "./datasets/mc001_1_2006SolarIrradiationDataset.mjs";
import {
  ROMANIAN_CLIMATE_ZONE_IDS,
  ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
  ROMANIAN_WIND_ZONE_IDS,
  validateRomanianClimateZone,
  validateRomanianWindZone
} from "./romanianClimateZones.mjs";

const MC001_2022_PDF = "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf";
const MC001_6_2013_OFFICIAL_URL =
  "https://www.mdlpa.ro/userfiles/reglementari/Domeniul_XXVII/27_11_MC_001_6_2013.pdf";
const MC001_1_2006_OFFICIAL_URL =
  "https://www.mdlpa.ro/userfiles/reglementari/Domeniul_XXVII/27_11_MC_001_1_2_3_2006.pdf";

export const CLIMATE_DATASET_STATUSES = Object.freeze({
  NORMATIVE_DATASET: "NORMATIVE_DATASET",
  USER_SUPPLIED_CERTIFIED_DATASET: "USER_SUPPLIED_CERTIFIED_DATASET",
  DATASET_UNAVAILABLE: "DATASET_UNAVAILABLE",
  TEST_ONLY_SYNTHETIC_DATASET: "TEST_ONLY_SYNTHETIC_DATASET"
});

export const CLIMATE_RUNTIME_ELIGIBILITY_STATUSES = Object.freeze({
  ELIGIBLE: "ELIGIBLE",
  SKIPPED_MISSING_DATA: "SKIPPED_MISSING_DATA",
  SKIPPED_MISSING_PREPROCESSING: "SKIPPED_MISSING_PREPROCESSING",
  SKIPPED_NOT_APPLICABLE: "SKIPPED_NOT_APPLICABLE",
  TEST_ONLY_NOT_PRODUCTION: "TEST_ONLY_NOT_PRODUCTION"
});

export const CLIMATE_AUDIT_REFINED_STATUSES = Object.freeze([
  "FORMULA_IMPLEMENTED",
  "LOOKUP_IMPLEMENTED",
  "REQUIRED_DATA_AVAILABLE",
  "END_TO_END_CALCULATION_AVAILABLE",
  "EXTERNAL_DATA_DEPENDENCY",
  "EXTERNAL_STANDARD_DEPENDENCY"
]);

export const MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE = Object.freeze({
  datasetId: "mc001_2022_figure_2_1_winter_design_temperature_by_zone",
  datasetVersion: ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
  status: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
  source: MC001_2022_PDF,
  sourceReference:
    "MC001-2022, Figura 2.1, pagina Monitorul Oficial 43, legenda hartii de zonare climatica",
  unit: "degC",
  values: Object.freeze({
    I: -12,
    II: -15,
    III: -18,
    IV: -21,
    V: -24
  })
});

export const ROMANIAN_CLIMATE_DATA_DOMAINS = Object.freeze([
  Object.freeze({
    domainId: "climate_zone_classification",
    label: "Climate-zone classification",
    zones: ROMANIAN_CLIMATE_ZONE_IDS,
    status: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    purpose: "zone-dependent MC001 limits and winter design-temperature identity",
    sourceReferences: Object.freeze([
      "MC001-2022, Figura 2.1",
      "MC001-2022, Tabel 2.5",
      "MC001-2022, Tabel 2.8",
      "MC001-2022, Tabel 2.10a",
      "MC001-2022, Tabel 2.10b"
    ])
  }),
  Object.freeze({
    domainId: "wind_zone_classification",
    label: "Wind-zone classification",
    zones: ROMANIAN_WIND_ZONE_IDS,
    status: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    purpose: "canonical metadata and future wind-dependent climate/runtime inputs",
    sourceReferences: Object.freeze([
      "MC001-2022 certificate and audit forms list wind zones I-IV"
    ]),
    currentRuntimeParameters: Object.freeze([])
  }),
  Object.freeze({
    domainId: "locality_station_mapping",
    label: "Locality to MC001/6-2013 climate-parameter station mapping",
    status: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    purpose:
      "selection of the source-backed MC001/6-2013 station/locality row for monthly and design-day climate parameters",
    requiredResolution: "42 MC001/6-2013 localities/stations",
    implementedDataset: "mc001_6_2013_locality_registry",
    datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
    sourceDocument: MC001_6_2013_CLIMATE_SOURCE_DOCUMENT.documentId
  }),
  Object.freeze({
    domainId: "locality_assignment",
    label: "Locality assignment",
    status: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    purpose:
      "automatic locality/county to climate-zone and wind-zone assignment; not the same as locality-to-station selection",
    requiredResolution: "locality/county to climate zone and wind zone",
    delegatedSource: "not reproduced in the ingested MC001-2022 or MC001/6-2013 tables",
    presentInRepository: false,
    sourceBackedLocalityStationMappingAvailable: true
  }),
  Object.freeze({
    domainId: "monthly_energy_climate_data",
    label: "Monthly energy climate data",
    status: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    purpose: "monthly transmission, ventilation, heat gains and useful demand",
    requiredResolution:
      "twelve monthly exterior temperatures plus solar irradiation by required orientation/plane",
    delegatedSource:
      "MC001-2022 Anexa D delegates climate parameters to Mc001/6-2013; Mc001/6-2013 references solar irradiation to Mc001/1-2006 Anexa nr. A9.6; preprocessing rules are in SR EN ISO 52010-1",
    presentInRepository: true,
    availableDatasets: Object.freeze([
      "monthly exterior temperature: Mc001/6-2013 Tabel II.1",
      "monthly relative humidity: Mc001/6-2013 Tabel II.2",
      "monthly mean daily solar irradiance source rows: Mc001/1-2-3/2006 Anexa A.9.6"
    ]),
    runtimePreprocessingStatus: "SR_EN_ISO_52010_1_PREPROCESSING_REQUIRED_FOR_SOURCE_BACKED_QSOL",
    missingDatasets: Object.freeze([
      "preprocessed Hsol;wi;m/Hsol;k;m monthly irradiation in kWh/m2 for MC001 relations 2.39 and 2.50",
      "source-backed Qsky inputs where the selected solar-gain path uses MC001 relation 2.54"
    ]),
    datasetVersion: `${MC001_6_2013_CLIMATE_DATASET_VERSION}+${MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION}`,
    solarLocalityCount: MC001_1_2006_SOLAR_LOCALITY_REGISTRY.length
  }),
  Object.freeze({
    domainId: "heating_design_climate",
    label: "Heating design climate",
    status: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    purpose: "winter design-temperature identity by climate zone",
    requiredResolution: "climate zone for zone value; MC001/6-2013 station/locality for winter design day",
    implementedDataset: MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.datasetId,
    availableDatasets: Object.freeze([
      "winter exterior design temperature by zone: MC001-2022 Figura 2.1",
      "winter design day hourly temperature by station: Mc001/6-2013 Tabel III.1",
      "winter design pentad temperature by station: Mc001/6-2013 Tabel III.2"
    ])
  }),
  Object.freeze({
    domainId: "cooling_ventilation_design_climate",
    label: "Cooling and ventilation design climate",
    status: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    purpose: "cooling/ventilation design parameters and humidity conditions",
    requiredResolution: "station/locality design day and associated humidity/radiation fields",
    delegatedSource: "Mc001/6-2013, Capitolul IV",
    availableDatasets: Object.freeze([
      "summer design day hourly temperature by station: Mc001/6-2013 Tabel IV.1",
      "summer design pentad temperature by station: Mc001/6-2013 Tabel IV.2"
    ]),
    missingDatasets: Object.freeze([
      "complete cooling/ventilation humidity or radiation fields when required by a selected design method"
    ])
  }),
  Object.freeze({
    domainId: "degree_day_data",
    label: "Degree-day data",
    status: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    purpose:
      "only for degree-day calculation paths; the current production runtime uses monthly MC001 Chapter 2/3 chains",
    requiredResolution: "locality/station, base temperature and period",
    directMc0012022Requirement: false
  })
]);

export const ROMANIAN_CLIMATE_NORMATIVE_DEPENDENCIES = Object.freeze([
  Object.freeze({
    dependencyId: "mc001_6_2013_climate_parameters_volume",
    datasetName:
      "Mc001/6-2013 Parametrii climatici necesari determinarii performantei energetice",
    runtimePurpose:
      "canonical source for Romanian climate parameters delegated by MC001-2022 Anexa D",
    mc001Section: "MC001-2022 Anexa D, pagina Monitorul Oficial 597",
    requiredResolution:
      "hourly representative years for 9 localities, monthly mean parameters for 42 localities, solar data for 30 localities, winter/summer design days",
    exactExternalDocument:
      "Mc001/6-2013, Partea a VI-a, approved by MDRAP Order 2210/26.06.2013",
    edition: "2013",
    clauseTableAnnex:
      "Capitolul II Tabel II.1/II.2; Capitolul III Figura III.1/Tabel III.1/Tabel III.2; Capitolul IV Tabel IV.1/IV.2; Capitolul V; Anexa A9.6",
    availability: "public_official_mdlpa_pdf_identified",
    officialUrl: MC001_6_2013_OFFICIAL_URL,
    presentInRepository: true,
    sourceDocumentChecksum: MC001_6_2013_CLIMATE_SOURCE_DOCUMENT.sha256,
    datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
    datasetChecksums: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS,
    implementationStatus: "source_packed_ingestion_complete_for_selected_tables",
    acquisitionStatus:
      "official PDF source-pack extracted for Tabel II.1, II.2, III.1, III.2, IV.1 and IV.2; delegated monthly solar irradiation is fulfilled by the separate Mc001/1-2-3/2006 Anexa A.9.6 source pack",
    calculationsAffected: Object.freeze([
      "locality to climate-parameter station selection",
      "monthly exterior temperatures",
      "monthly solar irradiation",
      "heating design climate",
      "cooling and ventilation design climate"
    ]),
    prohibitedSubstitute:
      "Do not infer locality assignment from latitude/GIS, weather sites, technical examples, or climate-zone label alone.",
    remediationAction:
      "Use the ingested table registries for station-backed temperature/design-day data and the Mc001/1-2-3/2006 A.9.6 source pack for source-backed solar profiles where a selected locality is covered."
  }),
  Object.freeze({
    dependencyId: "mc001_1_2006_annex_a9_6_monthly_solar_irradiation",
    datasetName: "Mc001/1-2-3/2006 Anexa A.9.6 monthly mean daily solar irradiance for 30 localities",
    runtimePurpose:
      "canonical source rows for monthly total/diffuse solar irradiance; not a direct replacement for preprocessed Hsol/Qsky inputs",
    mc001Section:
      "Mc001/6-2013 Capitolul II.3, referenced by MC001-2022 Anexa D climate-parameter chain",
    requiredResolution:
      "monthly solar irradiation for 30 localities with the orientations/planes reproduced by Anexa nr. A9.6",
    exactExternalDocument:
      "Metodologia de calcul al performantei energetice a cladirilor, Mc001/1-2-3/2006, Anexa A.9.6",
    edition: "2006",
    clauseTableAnnex: "Anexa A.9.6, PDF pages 119-129",
    availability: "public_official_mdlpa_pdf_identified_and_source_packed",
    officialUrl: MC001_1_2006_OFFICIAL_URL,
    presentInRepository: true,
    sourceDocumentChecksum: MC001_1_2006_SOLAR_IRRADIATION_SOURCE_DOCUMENT.sha256,
    datasetVersion: MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
    datasetChecksums: MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS,
    implementationStatus: "source_packed_ingestion_complete",
    acquisitionStatus:
      "official MDLPA source downloaded, rendered and extracted; immutable source pack records 30 locality tables, 3960 cells and cell-level QA",
    calculationsAffected: Object.freeze([
      "monthly solar irradiation source traceability",
      "future source-backed Hsol preprocessing",
      "transparent solar gains only after preprocessing/input boundary is satisfied",
      "opaque solar gains only after preprocessing/input boundary is satisfied",
      "cooling and heating demand only after Qsol is available"
    ]),
    prohibitedSubstitute:
      "Do not substitute weather-site irradiation, GIS estimates or synthetic orientation tables for Anexa nr. A9.6.",
    remediationAction:
      "No acquisition action remains for A.9.6. Do not feed A.9.6 W/m2 source rows directly into Chapter 2 Qsol; source-backed runtime solar gains still require preprocessed Hsol [kWh/m2] and Qsky inputs from the delegated preprocessing/source contract."
  }),
  Object.freeze({
    dependencyId: "sr_en_iso_52010_1_climate_preprocessing",
    datasetName: "SR EN ISO 52010-1 climate data preprocessing rules",
    runtimePurpose:
      "preprocessing rules for external climatic data used by EPB calculations",
    mc001Section: "MC001-2022 Tabel 1.3 row 13 and Anexa D final paragraph",
    requiredResolution:
      "algorithmic preprocessing standard, not a Romanian station-value dataset; required before A.9.6 W/m2 rows can become source-backed Hsol [kWh/m2] runtime inputs",
    exactExternalDocument:
      "SR EN ISO 52010-1, Performanta energetica a cladirilor. Conditii climatice exterioare. Partea 1",
    edition: "edition not bundled in repository",
    clauseTableAnnex: "M1-13 preprocessing rules; exact clauses require owned standard",
    availability: "paid_or_controlled_standard_metadata_only",
    presentInRepository: false,
    implementationStatus: "external_standard_dependency",
    acquisitionStatus:
      "obtain licensed project copy before implementing preprocessing algorithms not reproduced by MC001",
    calculationsAffected: Object.freeze([
      "preprocessed representative climate datasets",
      "conversion/quality rules for climate sequences",
      "conversion or validation of A.9.6 mean daily W/m2 rows into monthly Hsol [kWh/m2] where selected by the runtime",
      "source-backed transparent and opaque solar gains in MC001 relations 2.39 and 2.50",
      "source-backed QHnd/QCnd effect of solar gains"
    ]),
    prohibitedSubstitute:
      "Do not implement preprocessing algorithms from secondary summaries.",
    remediationAction:
      "Acquire SR EN ISO 52010-1 and encode only clauses required by MC001 data ingestion and solar-gain preprocessing. Until then, Chapter 2 keeps using explicit/preprocessed monthly Qsol or certified professional input."
  }),
  Object.freeze({
    dependencyId: "sr_1907_1_2_4839_6648_reviewed_not_direct_mc0012022_dependency",
    datasetName: "SR 1907-1/2, SR 4839, SR 6648-1/2 reviewed relevance",
    runtimePurpose:
      "documents named in project request; not a direct MC001-2022 dependency found in the official PDF text",
    mc001Section:
      "No direct MC001-2022 reference found in the official PDF; Anexa D points to Mc001/6-2013 instead",
    requiredResolution: "not applicable unless the source-pack chain proves a direct dependency",
    exactExternalDocument:
      "SR 1907-1, SR 1907-2, SR 4839, SR 6648-1, SR 6648-2",
    edition: "various; exact edition to be confirmed only if required by a source chain",
    clauseTableAnnex: "not identified as directly required by MC001-2022",
    availability: "ASRO/standard metadata; not present in repository",
    presentInRepository: false,
    implementationStatus: "reviewed_not_direct_runtime_dependency",
    acquisitionStatus:
      "do not acquire for this runtime until MC001/6-2013 source-pack extraction proves a required underlying table/algorithm",
    calculationsAffected: Object.freeze([]),
    prohibitedSubstitute:
      "Do not cite these standards as required unless a direct MC001 or MC001/6-2013 dependency is recorded.",
    remediationAction:
      "Keep under reviewed-not-required list; revisit during MC001/6-2013 extraction if a direct chain appears."
  })
]);

export const ROMANIAN_CLIMATE_ACQUISITION_LIST = Object.freeze([
  Object.freeze({
    designation: "Mc001/6-2013",
    edition: "2013",
    expectedDataset:
      "Romanian climate parameters: monthly temperature/humidity and winter/summer design-day temperatures already source-packed for the visible tables; other referenced annexes may require separate acquisition",
    affectedMc001Calculations: Object.freeze([
      "2.6.2.1",
      "2.6.2.3",
      "2.7.1.1",
      "2.7.1.2",
      "2.7.3",
      "2.7.4",
      "Chapter 3 AHU/cooling/solar-dependent installation calculations when climate inputs are used"
    ]),
    requiredFor: Object.freeze([
      "locality mapping",
      "design temperature",
      "monthly temperature",
      "cooling/ventilation design"
    ]),
    substituteOwnedByProject:
      "official MDLPA PDF source pack ingested for Tabel II.1, II.2, III.1 and IV.1"
  }),
  Object.freeze({
    designation: "Mc001/1-2006 Anexa nr. A9.6",
    edition: "2006",
    expectedDataset:
      "monthly mean daily solar irradiance source rows for 30 localities referenced by Mc001/6-2013 Capitolul II.3",
    affectedMc001Calculations: Object.freeze([
      "2.7.1.1",
      "2.7.1.2",
      "2.7.3",
      "2.7.4",
      "Chapter 3 cooling and solar-affected installation chains when solar inputs are required"
    ]),
    requiredFor: Object.freeze(["solar irradiation"]),
    substituteOwnedByProject:
      `official source pack integrated as ${MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION}`
  }),
  Object.freeze({
    designation: "SR EN ISO 52010-1",
    edition: "not bundled",
    expectedDataset:
      "preprocessing rules for climate data, including the legally source-backed bridge from A.9.6 W/m2 source rows to Hsol [kWh/m2] when used by MC001 2.39/2.50",
    affectedMc001Calculations: Object.freeze([
      "validated preprocessing of external climate sequences before use in monthly/hourly EPB calculations",
      "source-backed transparent solar gains relation 2.39",
      "source-backed opaque solar gains relation 2.50",
      "source-backed QHnd/QCnd effect of Qsol"
    ]),
    requiredFor: Object.freeze(["monthly temperature", "solar irradiation", "cooling/ventilation design"]),
    substituteOwnedByProject: "none"
  })
]);

export const ROMANIAN_CLIMATE_REQUIREMENT_MATRIX = Object.freeze([
  Object.freeze({
    calculationId: "climate_zone_threshold_lookup",
    label: "MC001 zone-dependent thresholds and solar-factor recommendations",
    requires: Object.freeze(["climateZone"]),
    outputDomains: Object.freeze(["solar_factor_recommendation", "nzeb_limit_lookup", "renovation_limit_lookup"]),
    eligibleWhen: "valid climate zone I-V is selected",
    missingDiagnostic: "CLIMATE_SELECTION_REQUIRED"
  }),
  Object.freeze({
    calculationId: "winter_design_temperature_lookup",
    label: "Winter exterior design temperature by climate zone",
    requires: Object.freeze(["climateZone"]),
    outputDomains: Object.freeze(["heating_design_temperature"]),
    eligibleWhen: "valid climate zone I-V is selected",
    missingDiagnostic: "CLIMATE_SELECTION_REQUIRED"
  }),
  Object.freeze({
    calculationId: "chapter2_monthly_transmission_ventilation",
    label: "Chapter 2 monthly transmission and ventilation transfer",
    requires: Object.freeze(["monthlyExteriorTemperatures", "monthDurations"]),
    outputDomains: Object.freeze(["Qtr", "Qve", "QHnd", "QCnd"]),
    eligibleWhen: "a normative or user-supplied certified twelve-month dataset is present",
    missingDiagnostic: "MONTHLY_EXTERIOR_TEMPERATURE_DATASET_REQUIRED"
  }),
  Object.freeze({
    calculationId: "chapter2_solar_source_dataset_identity",
    label: "A.9.6 solar source dataset traceability",
    requires: Object.freeze(["monthlySolarIrradianceSourceRows"]),
    outputDomains: Object.freeze(["climate_dataset_traceability", "notebook_report_solar_source_rows"]),
    eligibleWhen: "selected MC001/6-2013 station/locality has a matching Mc001/1-2-3/2006 Anexa A.9.6 source row",
    missingDiagnostic: "MONTHLY_SOLAR_IRRADIATION_NOT_AVAILABLE_FOR_SELECTED_STATION",
    currentRuntimeUse:
      "source-backed provider/notebook/report dataset only; not a direct Qsol runtime input"
  }),
  Object.freeze({
    calculationId: "chapter2_solar_gains",
    label: "Chapter 2 solar gains",
    requires: Object.freeze(["preprocessedSolarIrradiationHsolOrExplicitSolarGains"]),
    outputDomains: Object.freeze(["Qsol", "QHgn", "QCgn", "QHnd", "QCnd"]),
    eligibleWhen:
      "explicit/preprocessed monthly solar gains are present, or a future source-backed preprocessing chain supplies Hsol and Qsky-compatible inputs",
    missingDiagnostic: "SOLAR_IRRADIATION_PREPROCESSING_STANDARD_REQUIRED"
  }),
  Object.freeze({
    calculationId: "cooling_ventilation_design_conditions",
    label: "Cooling and ventilation design climate",
    requires: Object.freeze(["coolingDesignTemperature", "coolingDesignHumidity"]),
    outputDomains: Object.freeze(["design_diagnostics"]),
    eligibleWhen: "source-backed station/locality design data are present",
    missingDiagnostic: "COOLING_VENTILATION_DESIGN_CLIMATE_REQUIRED"
  }),
  Object.freeze({
    calculationId: "degree_day_method",
    label: "Degree-day method",
    requires: Object.freeze(["degreeDays", "baseTemperature"]),
    outputDomains: Object.freeze(["degree_day_result"]),
    eligibleWhen: "only if a degree-day calculation path is explicitly selected and sourced",
    missingDiagnostic: "DEGREE_DAY_DATA_REQUIRED",
    currentRuntimeUse: "not_required_by_current_monthly_chapter2_3_runtime"
  })
]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeStatus(status, sourceType) {
  if (status && Object.values(CLIMATE_DATASET_STATUSES).includes(status)) return status;
  if (sourceType === "synthetic_demo_profile") return CLIMATE_DATASET_STATUSES.TEST_ONLY_SYNTHETIC_DATASET;
  if (sourceType === "explicit_professional_climate_profile" || sourceType === "certified_climate_dataset") {
    return CLIMATE_DATASET_STATUSES.USER_SUPPLIED_CERTIFIED_DATASET;
  }
  return CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE;
}

function hasTwelveMonthlyRecords(profile, monthlyProfiles) {
  const records = profile?.monthlyRecords ?? monthlyProfiles;
  return Array.isArray(records) &&
    records.length === 12 &&
    records.every((record, index) => record?.month === MONTH_IDS[index]);
}

function hasTemperatureData(profile, monthlyProfiles) {
  const records = profile?.monthlyRecords ?? monthlyProfiles;
  return hasTwelveMonthlyRecords(profile, monthlyProfiles) &&
    records.every(record => (
      isFiniteNumber(record.heatingOutdoorTemperatureC) ||
      isFiniteNumber(record.outdoorTemperatureC)
    ));
}

function hasSolarData(profile, monthlyProfiles) {
  const records = profile?.monthlyRecords ?? monthlyProfiles;
  return hasTwelveMonthlyRecords(profile, monthlyProfiles) &&
    records.every(record => (
      (
        isFiniteNumber(record.solarGainsKwh) &&
        record.solarGainsSource !== "provider_climate_profile_without_qsol_preprocessing"
      ) ||
      (record.solarGainsByOrientationKwh &&
        ["north", "east", "south", "west"].every(
          orientation => isFiniteNumber(record.solarGainsByOrientationKwh[orientation])
        )) ||
      (record.solarIrradiationByOrientationKwhPerM2 &&
        ["north", "east", "south", "west"].every(
          orientation => isFiniteNumber(record.solarIrradiationByOrientationKwhPerM2[orientation])
        ))
    ));
}

function hasProviderMonthlyExteriorTemperature(climateProviderResult) {
  const dataset = climateProviderResult?.datasets?.monthlyExteriorTemperature;
  return dataset?.datasetStatus === CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET &&
    Array.isArray(dataset.monthlyRecords) &&
    dataset.monthlyRecords.length === 12 &&
    dataset.monthlyRecords.every((record, index) =>
      record?.month === MONTH_IDS[index] && isFiniteNumber(record.value)
    );
}

function hasProviderMonthlySolar(climateProviderResult) {
  return climateProviderResult?.datasets?.monthlySolarIrradiation?.datasetStatus ===
    CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET;
}

export function getWinterDesignTemperatureByClimateZone(climateZone) {
  if (!validateRomanianClimateZone(climateZone)) {
    return { status: "blocked", code: "invalid_romanian_climate_zone" };
  }
  return {
    status: "ready",
    climateZone,
    value: MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.values[climateZone],
    unit: MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.unit,
    sourceReference: MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.sourceReference,
    datasetId: MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.datasetId,
    datasetVersion: MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.datasetVersion
  };
}

export function evaluateClimateCalculationEligibility({
  climate = {},
  climateProfile = null,
  monthlyProfiles = null,
  climateProviderResult = null
} = {}) {
  const climateZone = climate?.climateZone ?? null;
  const profileStatus = normalizeStatus(climateProfile?.datasetStatus, climateProfile?.sourceType);
  const providerHasMonthlyExteriorTemperature = hasProviderMonthlyExteriorTemperature(climateProviderResult);
  const providerHasSolar = hasProviderMonthlySolar(climateProviderResult);
  const productionMonthlyDataset =
    profileStatus === CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET ||
    profileStatus === CLIMATE_DATASET_STATUSES.USER_SUPPLIED_CERTIFIED_DATASET ||
    providerHasMonthlyExteriorTemperature;
  const testOnlyDataset = profileStatus === CLIMATE_DATASET_STATUSES.TEST_ONLY_SYNTHETIC_DATASET;
  return ROMANIAN_CLIMATE_REQUIREMENT_MATRIX.map((row) => {
    let status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.ELIGIBLE;
    let diagnostic = null;
    let datasetStatus = profileStatus;
    if (row.requires.includes("climateZone") && !validateRomanianClimateZone(climateZone)) {
      status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_DATA;
      diagnostic = row.missingDiagnostic;
    }
    if (row.calculationId === "chapter2_monthly_transmission_ventilation") {
      if (testOnlyDataset) {
        status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.TEST_ONLY_NOT_PRODUCTION;
        diagnostic = "TEST_ONLY_SYNTHETIC_DATASET_NOT_ALLOWED_FOR_PRODUCTION";
      } else if (
        !productionMonthlyDataset ||
        (!hasTemperatureData(climateProfile, monthlyProfiles) && !providerHasMonthlyExteriorTemperature)
      ) {
        status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_DATA;
        diagnostic = row.missingDiagnostic;
      } else if (providerHasMonthlyExteriorTemperature) {
        datasetStatus = CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET;
      }
    }
    if (row.calculationId === "chapter2_solar_source_dataset_identity") {
      if (!providerHasSolar) {
        status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_DATA;
        diagnostic = row.missingDiagnostic;
      } else {
        datasetStatus = CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET;
      }
    }
    if (row.calculationId === "chapter2_solar_gains") {
      if (testOnlyDataset) {
        status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.TEST_ONLY_NOT_PRODUCTION;
        diagnostic = "TEST_ONLY_SYNTHETIC_DATASET_NOT_ALLOWED_FOR_PRODUCTION";
      } else if (hasSolarData(climateProfile, monthlyProfiles)) {
        datasetStatus = profileStatus === CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE
          ? CLIMATE_DATASET_STATUSES.USER_SUPPLIED_CERTIFIED_DATASET
          : profileStatus;
      } else if (providerHasSolar) {
        status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_PREPROCESSING;
        diagnostic = row.missingDiagnostic;
        datasetStatus = CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET;
      } else {
        status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_DATA;
        diagnostic = "MONTHLY_SOLAR_IRRADIATION_NOT_AVAILABLE_FOR_SELECTED_STATION";
      }
    }
    if (row.calculationId === "cooling_ventilation_design_conditions") {
      status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_MISSING_DATA;
      diagnostic = row.missingDiagnostic;
    }
    if (row.calculationId === "degree_day_method") {
      status = CLIMATE_RUNTIME_ELIGIBILITY_STATUSES.SKIPPED_NOT_APPLICABLE;
      diagnostic = "DEGREE_DAY_METHOD_NOT_SELECTED";
    }
    return {
      ...deepClone(row),
      status,
      diagnostic,
      datasetStatus,
      climateZone: climateZone ?? null
    };
  });
}

function checksumFor(value) {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function invalid(code, details = {}) {
  return { ok: false, code, details };
}

export function validateCertifiedClimateDataset(input = {}) {
  const requiredStrings = [
    "datasetId",
    "datasetVersion",
    "sourceTitle",
    "sourceAuthority",
    "sourceEdition",
    "stationId",
    "stationName"
  ];
  for (const key of requiredStrings) {
    if (typeof input[key] !== "string" || input[key].trim().length === 0) {
      return invalid(`certified_climate_dataset_missing_${key}`);
    }
  }
  if (input.datasetStatus && input.datasetStatus !== CLIMATE_DATASET_STATUSES.USER_SUPPLIED_CERTIFIED_DATASET) {
    return invalid("certified_climate_dataset_invalid_status");
  }
  if (input.climateZone && !validateRomanianClimateZone(input.climateZone)) {
    return invalid("certified_climate_dataset_invalid_climate_zone");
  }
  if (input.windZone && !validateRomanianWindZone(input.windZone)) {
    return invalid("certified_climate_dataset_invalid_wind_zone");
  }
  if (!input.units || input.units.temperature !== "degC" || input.units.duration !== "h") {
    return invalid("certified_climate_dataset_missing_or_invalid_units");
  }
  if (!["kWh", "kWh/m2"].includes(input.units.solarEnergy)) {
    return invalid("certified_climate_dataset_missing_or_invalid_solar_unit");
  }
  if (!Array.isArray(input.monthlyRecords) || input.monthlyRecords.length !== 12) {
    return invalid("certified_climate_dataset_requires_twelve_months");
  }
  if (input.userConfirmation !== true) {
    return invalid("certified_climate_dataset_requires_user_confirmation");
  }
  const seen = new Set();
  for (const [index, record] of input.monthlyRecords.entries()) {
    if (!record || record.month !== MONTH_IDS[index] || seen.has(record.month)) {
      return invalid("certified_climate_dataset_invalid_month_sequence", { index });
    }
    seen.add(record.month);
    for (const key of ["durationHours", "heatingOutdoorTemperatureC", "coolingOutdoorTemperatureC", "solarGainsKwh"]) {
      if (!isFiniteNumber(record[key])) {
        return invalid(`certified_climate_dataset_invalid_${key}`, { month: record.month });
      }
    }
    if (record.durationHours <= 0 || record.solarGainsKwh < 0) {
      return invalid("certified_climate_dataset_invalid_monthly_bounds", { month: record.month });
    }
    if (!record.solarGainsByOrientationKwh || typeof record.solarGainsByOrientationKwh !== "object") {
      return invalid("certified_climate_dataset_missing_orientation_solar", { month: record.month });
    }
    for (const orientation of Object.keys(record.solarGainsByOrientationKwh)) {
      if (!SOLAR_ORIENTATIONS.includes(orientation)) {
        return invalid("certified_climate_dataset_unsupported_orientation", { month: record.month, orientation });
      }
      if (!isFiniteNumber(record.solarGainsByOrientationKwh[orientation]) || record.solarGainsByOrientationKwh[orientation] < 0) {
        return invalid("certified_climate_dataset_invalid_orientation_solar", { month: record.month, orientation });
      }
    }
    for (const orientation of ["north", "east", "south", "west"]) {
      if (!isFiniteNumber(record.solarGainsByOrientationKwh[orientation])) {
        return invalid("certified_climate_dataset_incomplete_cardinal_solar", { month: record.month, orientation });
      }
    }
    if (typeof record.provenance !== "string" || record.provenance.trim().length === 0) {
      return invalid("certified_climate_dataset_missing_monthly_provenance", { month: record.month });
    }
  }
  const normalized = {
    schema: "climate_profile_v1",
    profileId: input.datasetId,
    displayName: input.displayName ?? input.datasetId,
    country: input.country ?? "Romania",
    locality: input.localityName ?? input.stationName,
    county: input.countyName ?? null,
    climaticZone: input.climateZone ?? null,
    windZone: input.windZone ?? null,
    sourceType: "certified_climate_dataset",
    origin: "user_supplied_certified_dataset",
    normativeStatus: "certified_user_supplied_not_bundled_normative_catalogue",
    datasetStatus: CLIMATE_DATASET_STATUSES.USER_SUPPLIED_CERTIFIED_DATASET,
    verificationStatus: "user_supplied_certified_dataset",
    confidence: "professional_certified",
    datasetVersion: input.datasetVersion,
    sourceTitle: input.sourceTitle,
    sourceAuthority: input.sourceAuthority,
    sourceEdition: input.sourceEdition,
    stationId: input.stationId,
    stationName: input.stationName,
    sourceReferences: input.sourceReferences ?? [`${input.sourceTitle}, ${input.sourceEdition}`],
    checksum: input.checksum ?? checksumFor(input.monthlyRecords),
    userConfirmation: true,
    monthlyRecords: input.monthlyRecords.map(record => ({
      month: record.month,
      durationHours: record.durationHours,
      heatingOutdoorTemperatureC: record.heatingOutdoorTemperatureC,
      coolingOutdoorTemperatureC: record.coolingOutdoorTemperatureC,
      internalGainsKwh: record.internalGainsKwh ?? 0,
      solarGainsKwh: record.solarGainsKwh,
      solarGainsByOrientationKwh: deepClone(record.solarGainsByOrientationKwh),
      ventilationAirHeatCapacityJPerM3K: record.ventilationAirHeatCapacityJPerM3K ?? 1200,
      ventilationAirFlowRateM3PerS: record.ventilationAirFlowRateM3PerS ?? 0,
      monthlyDataSource: "user_supplied_certified_climate_dataset",
      provenance: record.provenance
    }))
  };
  return { ok: true, profile: normalized };
}
