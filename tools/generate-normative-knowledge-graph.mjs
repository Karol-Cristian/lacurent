import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  CLIMATE_DATASET_STATUSES,
  MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE,
  ROMANIAN_CLIMATE_ACQUISITION_LIST,
  ROMANIAN_CLIMATE_COVERAGE,
  ROMANIAN_CLIMATE_DATA_DOMAINS,
  ROMANIAN_CLIMATE_NORMATIVE_DEPENDENCIES,
  ROMANIAN_CLIMATE_REQUIREMENT_MATRIX,
  ROMANIAN_CLIMATE_SOURCE_INVENTORY,
  ROMANIAN_CLIMATE_ZONE_IDS,
  ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
  ROMANIAN_WIND_ZONE_IDS
} from "../src/climate-platform/index.mjs";
import {
  MC001_6_2013_CLIMATE_DATASET_CHECKSUMS,
  MC001_6_2013_CLIMATE_DATASET_VERSION,
  MC001_6_2013_CLIMATE_STATIONS
} from "../src/climate-platform/datasets/mc001_6_2013ClimateDataset.mjs";
import {
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS,
  MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
  MC001_1_2006_SOLAR_LOCALITY_REGISTRY
} from "../src/climate-platform/datasets/mc001_1_2006SolarIrradiationDataset.mjs";

const OUTPUT_JSON = resolve("validation-reference/normative-knowledge-graph.json");
const OUTPUT_MD = resolve("validation-reference/normative-knowledge-graph.md");

const MC001_PDF = "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf";

const sourceDocuments = Object.freeze([
  Object.freeze({
    id: "doc.mc001_2022",
    title: "MC001-2022",
    edition: "2022",
    authority: "Monitorul Oficial / MDLPA",
    repositoryStatus: "present",
    path: MC001_PDF,
    canonicalUse:
      "Primary source for MC001 Chapter 2 and Chapter 3 climate-related references bundled in the repository."
  }),
  Object.freeze({
    id: "doc.mc001_2022_annex_d",
    title: "MC001-2022 Anexa D",
    edition: "2022",
    authority: "Monitorul Oficial / MDLPA",
    repositoryStatus: "present_inside_mc001_2022_pdf",
    path: MC001_PDF,
    canonicalUse:
      "Direct MC001-2022 delegation point for external climate-parameter datasets and preprocessing rules."
  }),
  Object.freeze({
    id: "doc.mc001_6_2013",
    title: "Mc001/6-2013 Partea a VI-a",
    edition: "2013",
    authority: "MDRAP / MDLPA",
    repositoryStatus: "official_public_pdf_source_packed_selected_tables_ingested",
    path: "https://www.mdlpa.ro/userfiles/reglementari/Domeniul_XXVII/27_11_MC_001_6_2013.pdf",
    canonicalUse:
      "Delegated Romanian climate-parameter source. P5B2 ingests Tabel II.1, II.2, III.1, III.2, IV.1 and IV.2; solar is delegated onward to Mc001/1-2-3/2006 Anexa A.9.6."
  }),
  Object.freeze({
    id: "doc.mc001_1_2006_annex_a9_6",
    title: "Mc001/1-2-3/2006 Anexa A.9.6",
    edition: "2006",
    authority: "MDLPA",
    repositoryStatus: "official_public_pdf_source_packed",
    path: "https://www.mdlpa.ro/userfiles/reglementari/Domeniul_XXVII/27_11_MC_001_1_2_3_2006.pdf",
    canonicalUse:
      "Exact annex referenced by Mc001/6-2013 Capitolul II.3 for monthly mean daily total and diffuse solar irradiance values for 30 localities."
  }),
  Object.freeze({
    id: "doc.sr_en_iso_52010_1",
    title: "SR EN ISO 52010-1",
    edition: "not bundled in repository",
    authority: "ASRO / CEN / ISO",
    repositoryStatus: "not_present_paid_or_controlled_standard",
    path: null,
    canonicalUse:
      "Delegated EPB climate preprocessing algorithm source referenced by MC001-2022 Anexa D."
  }),
  Object.freeze({
    id: "doc.user_supplied_certified_climate_dataset_contract",
    title: "LaCurent certified climate-data import contract",
    edition: "p5a_v1",
    authority: "Project technical data supplied by authorized professional",
    repositoryStatus: "implemented_contract",
    path: "src/climate-platform/romanianClimateNormativeDependencies.mjs",
    canonicalUse:
      "Strict project-input boundary for certified twelve-month climate data while official source-packed datasets remain unavailable."
  }),
  Object.freeze({
    id: "doc.sr_1907_sr_4839_sr_6648_reviewed",
    title: "SR 1907-1/2, SR 4839, SR 6648-1/2 reviewed climate standards",
    edition: "various",
    authority: "ASRO",
    repositoryStatus: "reviewed_not_direct_mc001_2022_dependency",
    path: null,
    canonicalUse:
      "Reviewed because they were named as possible climate sources; not acquired or treated as runtime dependencies without an explicit MC001 or Mc001/6-2013 source chain."
  })
]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function node({
  id,
  description,
  units,
  runtimeUsage,
  formulas = [],
  notebookUsage,
  reportUsage,
  sourceDocument,
  sourceEdition,
  table = null,
  figure = null,
  page = null,
  implementationStatus,
  datasetStatus,
  tbdId = null,
  values = null,
  sourceLocation = null
}) {
  return {
    id,
    canonicalId: id,
    type: "climate_concept",
    description,
    units,
    runtimeUsage,
    formulas,
    notebookUsage,
    reportUsage,
    canonicalSourceId: sourceDocument,
    sourceDocument,
    sourceEdition,
    table,
    figure,
    page,
    sourceLocation,
    implementationStatus,
    datasetStatus,
    tbdId,
    values
  };
}

const conceptNodes = Object.freeze([
  node({
    id: "concept.climate_zone",
    description: "Romanian climatic zone identifier I-V selected for a project.",
    units: "enum:I|II|III|IV|V",
    runtimeUsage: Object.freeze([
      "climate_zone_threshold_lookup",
      "winter_design_temperature_lookup",
      "Building DNA climate identity and fingerprint"
    ]),
    formulas: Object.freeze([]),
    notebookUsage: "Show selected zone, assignment origin, dataset version and affected lookups.",
    reportUsage: "Report selected zone and zone-dependent values used by the calculation.",
    sourceDocument: "doc.mc001_2022",
    sourceEdition: "2022",
    table: "Tabel 2.5; Tabel 2.8; Tabel 2.10a; Tabel 2.10b",
    figure: "Figura 2.1",
    page: "Monitorul Oficial p. 43; PDF text p. 62, 64, 73-74",
    sourceLocation:
      "MC001-2022 Figura 2.1 plus Chapter 2.2 climate-zone dependent tables.",
    implementationStatus: "LOOKUP_IMPLEMENTED",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    values: ROMANIAN_CLIMATE_ZONE_IDS
  }),
  node({
    id: "concept.wind_zone",
    description: "Romanian wind zone identifier I-IV represented as location/climate metadata.",
    units: "enum:I|II|III|IV",
    runtimeUsage: Object.freeze(["Building DNA climate metadata and future wind-dependent runtime inputs"]),
    notebookUsage: "Show selected wind zone when supplied; currently no Chapter 2/3 relation consumes a wind coefficient.",
    reportUsage: "Report selected wind zone as metadata and state whether it affected current calculations.",
    sourceDocument: "doc.mc001_2022",
    sourceEdition: "2022",
    table: null,
    figure: null,
    page: "MC001-2022 certificate and audit forms",
    sourceLocation: "MC001-2022 certificate/audit forms list wind zones I-IV.",
    implementationStatus: "REPRESENTED_AS_INPUT",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    values: ROMANIAN_WIND_ZONE_IDS
  }),
  node({
    id: "concept.winter_design_temperature",
    description: "Exterior winter design temperature associated with climate zone I-V.",
    units: "degC",
    runtimeUsage: Object.freeze(["winter_design_temperature_lookup", "heating design diagnostics"]),
    notebookUsage: "Show the lookup theta_e from selected zone with MC001 Figure 2.1 reference.",
    reportUsage: "Report heating design temperature and source figure.",
    sourceDocument: "doc.mc001_2022",
    sourceEdition: "2022",
    figure: "Figura 2.1",
    page: "Monitorul Oficial p. 43",
    sourceLocation: MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.sourceReference,
    implementationStatus: "LOOKUP_IMPLEMENTED",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    values: MC001_WINTER_DESIGN_TEMPERATURES_BY_ZONE.values
  }),
  node({
    id: "concept.zone_dependent_thresholds",
    description:
      "Zone-dependent MC001 tables for solar-factor recommendations and NZEB/renovation primary-energy and CO2 limits.",
    units: "dimensionless; kWh/(m2*an); kg/(m2*an)",
    runtimeUsage: Object.freeze(["climate_zone_threshold_lookup", "diagnostic lookups"]),
    notebookUsage:
      "Show only thresholds relevant to the selected project context; no certificate output is created.",
    reportUsage:
      "Report zone-dependent diagnostics without claiming EPC class, primary energy or CO2 calculation.",
    sourceDocument: "doc.mc001_2022",
    sourceEdition: "2022",
    table: "Tabel 2.5; Tabel 2.8; Tabel 2.10a; Tabel 2.10b",
    page: "PDF text p. 62, 64, 73-74",
    implementationStatus: "LOOKUP_IMPLEMENTED",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET
  }),
  node({
    id: "concept.climatic_station",
    description: "Representative climatic station used to source locality-level or station-level climate parameters.",
    units: "station identifier",
    runtimeUsage: Object.freeze([
      "monthly climate dataset selection",
      "design climate selection",
      "certified climate provenance"
    ]),
    notebookUsage: "Show station identifier and provenance when a source-backed or certified dataset is used.",
    reportUsage: "Report station/location metadata for the climate inputs used.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Tabel II.1, II.2, III.1, III.2, IV.1, IV.2",
    page: "Mc001/6-2013 PDF text p. 11-20",
    sourceLocation:
      "validation-reference/source-packs/mc001-6-2013-climate-extract.json",
    implementationStatus: "LOOKUP_IMPLEMENTED",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    values: {
      datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
      stationCount: MC001_6_2013_CLIMATE_STATIONS.length,
      checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.climateStations
    }
  }),
  node({
    id: "concept.locality_station_mapping",
    description:
      "Source-backed mapping from each MC001/6-2013 table locality row to its canonical climate-parameter station id.",
    units: "locality identifier -> station identifier",
    runtimeUsage: Object.freeze(["station-level climate dataset selection"]),
    notebookUsage: "Show station/locality row provenance when a source-backed station dataset is used.",
    reportUsage: "Report station/locality source row and dataset version.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Tabel II.1 and matching station rows in II.2/III.1/III.2/IV.1/IV.2",
    page: "Mc001/6-2013 PDF text p. 11-20",
    sourceLocation:
      "validation-reference/source-packs/mc001-6-2013-climate-extract.json",
    implementationStatus: "LOOKUP_IMPLEMENTED",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    values: {
      datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
      mappingCount: MC001_6_2013_CLIMATE_STATIONS.length,
      checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.localityRegistry
    }
  }),
  node({
    id: "concept.locality_mapping",
    description:
      "Source-backed locality/county assignment to climate zone and wind zone. This is separate from the available locality-to-station table rows.",
    units: "locality/county -> climate zone and wind zone",
    runtimeUsage: Object.freeze(["automatic location-to-climate assignment"]),
    notebookUsage: "Show automatic or manual assignment origin and warn when mapping is unavailable.",
    reportUsage: "Report assignment origin, override reason and missing mapping diagnostics.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "not reproduced in the ingested MC001-2022 or Mc001/6-2013 tables",
    page: "not found in ingested source",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.romanian_locality_climate_wind_zone_registry"
  }),
  node({
    id: "concept.month_duration",
    description: "Twelve ordered calendar month durations used by monthly energy calculations.",
    units: "d; h",
    runtimeUsage: Object.freeze(["chapter2_monthly_transmission_ventilation", "monthly aggregation"]),
    notebookUsage: "Show days/hours next to each monthly climate row.",
    reportUsage: "Report calendar month duration used by monthly calculations.",
    sourceDocument: "doc.mc001_2022",
    sourceEdition: "2022",
    table: null,
    page: "MC001 monthly method context",
    implementationStatus: "REPRESENTED_AS_INPUT",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET
  }),
  node({
    id: "concept.monthly_exterior_temperature",
    description: "Twelve monthly exterior temperatures required by monthly Chapter 2 transfer calculations.",
    units: "degC",
    runtimeUsage: Object.freeze(["chapter2_monthly_transmission_ventilation"]),
    notebookUsage: "Show the exact monthly exterior temperatures used by Qtr and Qve.",
    reportUsage: "Report the twelve monthly values with source, station/location and dataset version.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Tabel II.1",
    page: "Mc001/6-2013 PDF text p. 11-12",
    sourceLocation:
      "validation-reference/source-packs/mc001-6-2013-climate-extract.json",
    implementationStatus: "LOOKUP_IMPLEMENTED",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    values: {
      datasetVersion: MC001_6_2013_CLIMATE_DATASET_VERSION,
      stationCount: MC001_6_2013_CLIMATE_STATIONS.length,
      checksum: MC001_6_2013_CLIMATE_DATASET_CHECKSUMS.monthlyExteriorTemperature
    }
  }),
  node({
    id: "concept.monthly_solar_irradiation",
    description:
      "Monthly mean daily solar irradiance source rows from A.9.6. These rows are source-backed climate data, not direct Qsol or Hsol runtime values.",
    units: "W/m2",
    runtimeUsage: Object.freeze(["chapter2_solar_source_dataset_identity", "future source-backed solar preprocessing"]),
    notebookUsage:
      "Show A.9.6 monthly total vertical/orientation and horizontal irradiance values used by the selected station/locality.",
    reportUsage:
      "Report A.9.6 source, dataset version, station/locality and monthly total/diffuse irradiance values.",
    sourceDocument: "doc.mc001_1_2006_annex_a9_6",
    sourceEdition: "2006",
    table: "Anexa A.9.6",
    page: "PDF pages 119-129",
    sourceLocation:
      "validation-reference/source-packs/mc001-1-2006-annex-a9-6-solar-extract.json",
    implementationStatus: "LOOKUP_IMPLEMENTED",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    values: {
      datasetVersion: MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
      localityCount: MC001_1_2006_SOLAR_LOCALITY_REGISTRY.length,
      checksum: MC001_1_2006_SOLAR_IRRADIATION_DATASET_CHECKSUMS.monthlySolarIrradianceRows
    }
  }),
  node({
    id: "concept.preprocessed_solar_irradiation_hsol",
    description:
      "Monthly solar irradiation Hsol;wi;m/Hsol;k;m in kWh/m2 required by MC001 relations 2.39 and 2.50 after applying the delegated preprocessing/source contract to source climate rows.",
    units: "kWh/m2",
    runtimeUsage: Object.freeze(["chapter2_solar_gains", "transparent_solar_gains", "opaque_solar_gains"]),
    formulas: Object.freeze(["MC001-2022 relatiile 2.39 si 2.50 consume Hsol but do not reproduce the preprocessing algorithm."]),
    notebookUsage:
      "Show only after a source-backed preprocessing chain or certified explicit Hsol input supplies values.",
    reportUsage:
      "Report preprocessing source, dataset version and Hsol values when they are actually used by Qsol.",
    sourceDocument: "doc.sr_en_iso_52010_1",
    sourceEdition: "not bundled in repository",
    table: "M1-13 preprocessing rules; exact clauses require owned standard",
    page: "MC001-2022 Anexa D delegation",
    sourceLocation:
      "MC001-2022 Tabel 1.3 row 13 and Anexa D reference SR EN ISO 52010-1; no Hsol preprocessing equations are bundled.",
    implementationStatus: "EXTERNAL_STANDARD_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.sr_en_iso_52010_1_climate_preprocessing"
  }),
  node({
    id: "concept.direct_diffuse_solar_irradiation",
    description:
      "Solar component data when a downstream method requires component-level radiation. A.9.6 source-packs diffuse vertical/horizontal rows and total orientation rows; it does not derive an additional direct component.",
    units: "W/m2",
    runtimeUsage: Object.freeze(["solar preprocessing", "future source-backed orientation/plane processing"]),
    notebookUsage:
      "Show diffuse A.9.6 rows when used; do not fabricate direct components by subtraction unless a normative runtime method explicitly requires and defines that operation.",
    reportUsage: "Report diffuse component data and source when used.",
    sourceDocument: "doc.mc001_1_2006_annex_a9_6",
    sourceEdition: "2006",
    table: "Anexa A.9.6",
    page: "PDF pages 119-129",
    sourceLocation:
      "validation-reference/source-packs/mc001-1-2006-annex-a9-6-solar-extract.json",
    implementationStatus: "LOOKUP_IMPLEMENTED_FOR_DIFFUSE_ROWS_DIRECT_COMPONENT_NOT_DERIVED",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET,
    values: {
      datasetVersion: MC001_1_2006_SOLAR_IRRADIATION_DATASET_VERSION,
      diffuseRows: Object.freeze(["I_d Vert.", "I_d Oriz."])
    }
  }),
  node({
    id: "concept.sky_radiation_inputs",
    description: "Sky-radiation inputs or correction terms when required by a selected solar/thermal exchange method.",
    units: "method dependent",
    runtimeUsage: Object.freeze(["solar preprocessing", "radiative exchange diagnostics"]),
    notebookUsage: "Show only when the selected source-backed method uses sky-radiation data.",
    reportUsage: "Report sky-radiation data source and whether it affected current calculations.",
    sourceDocument: "doc.mc001_1_2006_annex_a9_6",
    sourceEdition: "2006",
    table: "not reproduced in Anexa A.9.6",
    page: "not found in integrated solar source pack",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.sky_radiation_inputs_if_selected_method_requires"
  }),
  node({
    id: "concept.heating_period_duration",
    description: "Heating-period duration or monthly applicability information used by heating calculations.",
    units: "h; d; boolean applicability",
    runtimeUsage: Object.freeze(["chapter2_monthly_transmission_ventilation", "monthly heating aggregation"]),
    notebookUsage: "Show monthly applicability and duration when supplied by climate profile.",
    reportUsage: "Report period assumptions and exact monthly hours used.",
    sourceDocument: "doc.mc001_2022",
    sourceEdition: "2022",
    table: null,
    page: "MC001 monthly method context",
    implementationStatus: "REPRESENTED_AS_INPUT",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET
  }),
  node({
    id: "concept.cooling_period_duration",
    description: "Cooling-period duration or monthly applicability information used by cooling calculations.",
    units: "h; d; boolean applicability",
    runtimeUsage: Object.freeze(["chapter2 monthly cooling aggregation", "Chapter 3 cooling-system operation"]),
    notebookUsage: "Show monthly applicability and duration when supplied by climate profile.",
    reportUsage: "Report period assumptions and exact monthly hours used.",
    sourceDocument: "doc.mc001_2022",
    sourceEdition: "2022",
    table: null,
    page: "MC001 monthly method context",
    implementationStatus: "REPRESENTED_AS_INPUT",
    datasetStatus: CLIMATE_DATASET_STATUSES.NORMATIVE_DATASET
  }),
  node({
    id: "concept.cooling_ventilation_design_climate",
    description: "Exterior design temperature and humidity parameters for cooling and ventilation/AHU design conditions.",
    units: "degC; relative humidity or humidity ratio",
    runtimeUsage: Object.freeze(["cooling_ventilation_design_conditions", "AHU/cooling design diagnostics"]),
    notebookUsage: "Show explicit station design conditions when present; otherwise show the blocking diagnostic.",
    reportUsage: "Report missing or supplied cooling/ventilation design climate source.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Capitolul IV Tabel IV.1/IV.2 implemented for temperatures; humidity/radiation still method-dependent",
    page: "Mc001/6-2013 PDF text p. 18-20",
    implementationStatus: "LOOKUP_IMPLEMENTED_WITH_EXTERNAL_DATA_BOUNDARY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_cooling_ventilation_design_climate"
  }),
  node({
    id: "concept.degree_days",
    description: "Degree-day values for explicit degree-day calculation paths.",
    units: "K*d; K*h",
    runtimeUsage: Object.freeze(["degree_day_method"]),
    notebookUsage: "Show only when a degree-day method is explicitly selected and source-backed.",
    reportUsage: "Report degree-day base temperature, period and source when used.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Degree-day dataset expected if selected by runtime method",
    page: "Delegated climate source chain; not required by current monthly Chapter 2/3 runtime",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_degree_days"
  }),
  node({
    id: "concept.climate_preprocessing_rules",
    description:
      "Rules for preprocessing external climate data before EPB use, including validation and transformation of source climate sequences.",
    units: "algorithmic rules",
    runtimeUsage: Object.freeze(["future normative climate ingestion QA", "source-pack preprocessing"]),
    notebookUsage: "Show preprocessing source only when source-packed data require transformed climate values.",
    reportUsage: "Report preprocessing standard and dataset checksum when used.",
    sourceDocument: "doc.sr_en_iso_52010_1",
    sourceEdition: "not bundled in repository",
    table: "exact clauses require owned standard",
    page: null,
    implementationStatus: "EXTERNAL_STANDARD_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.sr_en_iso_52010_1_climate_preprocessing"
  }),
  node({
    id: "concept.reference_building_climate",
    description:
      "Climate inputs required to evaluate reference-building or requirement comparisons that depend on location/zone.",
    units: "mixed climate and threshold units",
    runtimeUsage: Object.freeze(["reference-building diagnostics", "zone-dependent threshold lookup"]),
    notebookUsage:
      "Show available zone thresholds separately from unavailable monthly reference climate data.",
    reportUsage: "Report which reference-building climate values are available and which are external.",
    sourceDocument: "doc.mc001_2022",
    sourceEdition: "2022",
    table: "Tabel 2.10a; Tabel 2.10b plus delegated climate datasets",
    page: "PDF text p. 73-74 and Anexa D p. 597",
    implementationStatus: "LOOKUP_IMPLEMENTED_WITH_EXTERNAL_DATA_BOUNDARY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.romanian_locality_climate_wind_zone_registry"
  }),
  node({
    id: "concept.user_supplied_certified_climate_dataset",
    description:
      "Strict explicit project-input boundary for a certified twelve-month profile while bundled normative monthly datasets are unavailable.",
    units: "degC; h; kWh; kWh/m2",
    runtimeUsage: Object.freeze([
      "chapter2_monthly_transmission_ventilation",
      "chapter2_solar_gains",
      "Building DNA versioning",
      "analysis fingerprint"
    ]),
    notebookUsage: "Show source title, authority, edition, checksum, station and all monthly values.",
    reportUsage: "Report the dataset as user-supplied certified data, not as bundled normative registry data.",
    sourceDocument: "doc.user_supplied_certified_climate_dataset_contract",
    sourceEdition: "p5a_v1",
    table: null,
    page: "src/climate-platform/romanianClimateNormativeDependencies.mjs",
    implementationStatus: "REPRESENTED_AS_INPUT",
    datasetStatus: CLIMATE_DATASET_STATUSES.USER_SUPPLIED_CERTIFIED_DATASET
  })
]);

const tbdRegistry = Object.freeze([
  Object.freeze({
    id: "tbd.romanian_locality_climate_wind_zone_registry",
    description:
      "Canonical Romanian locality/county assignment to climate zone and wind zone. This excludes the already implemented MC001/6-2013 locality-to-station row registry.",
    blockingDocument: "exact source not reproduced in MC001-2022 PDF or ingested MC001/6-2013 tables",
    requiredEdition: "to be identified from an explicit normative source chain",
    affectedCalculations: Object.freeze(["automatic climate-zone assignment", "automatic wind-zone assignment"]),
    affectedRuntimeModules: Object.freeze(["src/climate-platform/romanianClimateZones.mjs"]),
    affectedUi: Object.freeze(["Amplasare si clima searchable locality selector"]),
    affectedNotebook: Object.freeze(["climate metadata and assignment provenance"]),
    affectedReport: Object.freeze(["climate location and assignment source"]),
    affectedTests: Object.freeze(["locality-to-zone mapping", "save/reopen exact climate identity"]),
    implementationPriority: "HIGH",
    estimatedImplementationScope:
      "Acquire/source-pack the exact official mapping document, normalize locality identifiers, add county aliases and migration diagnostics."
  }),
  Object.freeze({
    id: "tbd.sky_radiation_inputs_if_selected_method_requires",
    description:
      "Sky-radiation input tables or correction terms if a selected source-backed calculation path explicitly requires them. A.9.6 does not reproduce these values.",
    blockingDocument: "exact MC001 delegated source or SR EN ISO 52010-1 clause to be identified by the selected method",
    requiredEdition: "to be identified from an explicit normative source chain",
    affectedCalculations: Object.freeze(["future sky-radiation correction branches only"]),
    affectedRuntimeModules: Object.freeze(["future source-backed solar preprocessing module"]),
    affectedUi: Object.freeze(["solar dataset diagnostics only if a sky-radiation branch is selected"]),
    affectedNotebook: Object.freeze(["sky-radiation correction traceability if used"]),
    affectedReport: Object.freeze(["sky-radiation source disclosure if used"]),
    affectedTests: Object.freeze(["sky-radiation branch fixtures if method is product-scoped"]),
    implementationPriority: "LOW",
    estimatedImplementationScope:
      "Acquire the exact delegated method/source only if a runtime path selects sky-radiation correction inputs."
  }),
  Object.freeze({
    id: "tbd.mc001_6_2013_cooling_ventilation_design_climate",
    description: "Cooling and ventilation design-day temperature and humidity parameters.",
    blockingDocument: "Mc001/6-2013 Partea a VI-a",
    requiredEdition: "2013",
    affectedCalculations: Object.freeze(["cooling_ventilation_design_conditions", "AHU/cooling diagnostics"]),
    affectedRuntimeModules: Object.freeze(["src/climate-platform/romanianClimateNormativeDependencies.mjs"]),
    affectedUi: Object.freeze(["cooling/ventilation design climate status"]),
    affectedNotebook: Object.freeze(["cooling and AHU climate input traceability"]),
    affectedReport: Object.freeze(["cooling/ventilation climate dependency section"]),
    affectedTests: Object.freeze(["design climate availability", "invalid missing humidity rejection"]),
    implementationPriority: "MEDIUM",
    estimatedImplementationScope:
      "Extract station design tables, encode humidity units and bind to cooling/AHU eligibility gates."
  }),
  Object.freeze({
    id: "tbd.mc001_6_2013_degree_days",
    description: "Degree-day dataset for optional degree-day paths.",
    blockingDocument: "Mc001/6-2013 Partea a VI-a or explicit source chain identified during extraction",
    requiredEdition: "2013 unless the source chain identifies a newer controlling edition",
    affectedCalculations: Object.freeze(["degree_day_method"]),
    affectedRuntimeModules: Object.freeze(["future degree-day module only"]),
    affectedUi: Object.freeze(["degree-day method selection if product scope enables it"]),
    affectedNotebook: Object.freeze(["degree-day calculation notes if selected"]),
    affectedReport: Object.freeze(["degree-day source disclosure if selected"]),
    affectedTests: Object.freeze(["base-temperature and period fixtures"]),
    implementationPriority: "LOW",
    estimatedImplementationScope:
      "Acquire source chain only if a degree-day runtime path is product-scoped; no current monthly runtime dependency."
  }),
  Object.freeze({
    id: "tbd.sr_en_iso_52010_1_climate_preprocessing",
    description:
      "Normative climate-data preprocessing algorithms delegated to SR EN ISO 52010-1, including the bridge from A.9.6 W/m2 source rows to Hsol [kWh/m2] runtime inputs when that source-backed path is selected.",
    blockingDocument: "SR EN ISO 52010-1",
    requiredEdition: "owned edition referenced by MC001 implementation policy",
    affectedCalculations: Object.freeze([
      "A.9.6 W/m2 to Hsol kWh/m2 preprocessing",
      "source-backed transparent solar gains relation 2.39",
      "source-backed opaque solar gains relation 2.50",
      "source-backed QHnd/QCnd effect of Qsol"
    ]),
    affectedRuntimeModules: Object.freeze([
      "future source-pack ingestion pipeline",
      "future Building DNA climate provider to mc001SolarGainsCalculation adapter"
    ]),
    affectedUi: Object.freeze(["dataset validation provenance", "source-backed solar-gain eligibility diagnostic"]),
    affectedNotebook: Object.freeze(["preprocessing reference and Hsol substitutions where transformed values are used"]),
    affectedReport: Object.freeze(["preprocessing standard, Hsol values and checksum metadata"]),
    affectedTests: Object.freeze([
      "preprocessing golden cases from licensed source",
      "A.9.6 to Hsol to Qsol to QHnd/QCnd integration tests"
    ]),
    implementationPriority: "MEDIUM",
    estimatedImplementationScope:
      "Implement only after licensed standard is supplied; add algorithm tests and source-to-code coverage."
  })
]);

const runtimeRequirementToConcepts = Object.freeze({
  climateZone: Object.freeze(["concept.climate_zone"]),
  monthlyExteriorTemperatures: Object.freeze(["concept.monthly_exterior_temperature"]),
  monthDurations: Object.freeze(["concept.month_duration"]),
  monthlySolarIrradianceSourceRows: Object.freeze(["concept.monthly_solar_irradiation"]),
  preprocessedSolarIrradiationHsolOrExplicitSolarGains: Object.freeze([
    "concept.preprocessed_solar_irradiation_hsol",
    "concept.sky_radiation_inputs",
    "concept.user_supplied_certified_climate_dataset"
  ]),
  coolingDesignTemperature: Object.freeze(["concept.cooling_ventilation_design_climate"]),
  coolingDesignHumidity: Object.freeze(["concept.cooling_ventilation_design_climate"]),
  degreeDays: Object.freeze(["concept.degree_days"]),
  baseTemperature: Object.freeze(["concept.degree_days"])
});

const runtimeNodes = ROMANIAN_CLIMATE_REQUIREMENT_MATRIX.map((requirement) => ({
  id: `runtime.${requirement.calculationId}`,
  type: "runtime_calculation",
  label: requirement.label,
  requires: [...new Set(requirement.requires.flatMap(key => runtimeRequirementToConcepts[key] ?? []))],
  requirementKeys: requirement.requires,
  outputs: requirement.outputDomains,
  eligibleWhen: requirement.eligibleWhen,
  missingDiagnostic: requirement.missingDiagnostic,
  currentRuntimeUse: requirement.currentRuntimeUse ?? "active_when_inputs_are_available"
}));

const runtimeEdges = runtimeNodes.flatMap(nodeItem =>
  nodeItem.requires.map(requiredConcept => ({
    from: nodeItem.id,
    to: requiredConcept,
    relation: "requires_climate_concept"
  }))
);

const documentNodes = sourceDocuments.map(document => ({
  id: document.id,
  type: "source_document",
  title: document.title,
  edition: document.edition,
  authority: document.authority,
  repositoryStatus: document.repositoryStatus,
  path: document.path,
  canonicalUse: document.canonicalUse
}));

const normativeEdges = Object.freeze([
  Object.freeze({
    from: "doc.mc001_2022",
    to: "doc.mc001_2022_annex_d",
    relation: "contains",
    evidence: "MC001-2022 includes Anexa D in the official PDF."
  }),
  Object.freeze({
    from: "doc.mc001_2022_annex_d",
    to: "doc.mc001_6_2013",
    relation: "delegates_climate_parameters_to",
    evidence:
      "MC001-2022 Anexa D, Monitorul Oficial p. 597, delegates climate parameters to Mc001/6-2013."
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
    to: "doc.mc001_1_2006_annex_a9_6",
    relation: "delegates_monthly_solar_irradiation_to",
    evidence:
      "Mc001/6-2013 Capitolul II.3 states that monthly mean solar irradiance values for 30 localities are presented in Mc001/1-2006 Anexa nr. A9.6."
  }),
  Object.freeze({
    from: "doc.mc001_2022_annex_d",
    to: "doc.sr_en_iso_52010_1",
    relation: "delegates_climate_preprocessing_to",
    evidence:
      "MC001-2022 Tabel 1.3 row 13 and Anexa D reference SR EN ISO 52010-1 for climate preprocessing."
  })
]);

const knowledgeEdges = Object.freeze([
  ...normativeEdges,
  Object.freeze({
    from: "doc.mc001_2022",
    to: "concept.climate_zone",
    relation: "defines_or_uses"
  }),
  Object.freeze({
    from: "doc.mc001_2022",
    to: "concept.wind_zone",
    relation: "lists"
  }),
  Object.freeze({
    from: "doc.mc001_2022",
    to: "concept.winter_design_temperature",
    relation: "defines_lookup"
  }),
  Object.freeze({
    from: "doc.mc001_2022",
    to: "concept.zone_dependent_thresholds",
    relation: "defines_lookup_tables"
  }),
  Object.freeze({
    from: "doc.mc001_2022",
    to: "concept.month_duration",
    relation: "monthly_method_uses"
  }),
  Object.freeze({
    from: "doc.mc001_2022_annex_d",
    to: "concept.monthly_exterior_temperature",
    relation: "delegates_dataset"
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
    to: "concept.monthly_exterior_temperature",
    relation: "defines_lookup"
  }),
  Object.freeze({
    from: "doc.mc001_2022_annex_d",
    to: "concept.monthly_solar_irradiation",
    relation: "delegates_dataset"
  }),
  Object.freeze({
    from: "doc.mc001_1_2006_annex_a9_6",
    to: "concept.monthly_solar_irradiation",
    relation: "defines_lookup"
  }),
  Object.freeze({
    from: "doc.sr_en_iso_52010_1",
    to: "concept.preprocessed_solar_irradiation_hsol",
    relation: "defines_external_preprocessing_algorithm"
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
    to: "concept.climatic_station",
    relation: "expected_source_for"
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
    to: "concept.locality_mapping",
    relation: "expected_source_for"
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
    to: "concept.locality_station_mapping",
    relation: "defines_lookup"
  }),
  Object.freeze({
    from: "doc.mc001_1_2006_annex_a9_6",
    to: "concept.direct_diffuse_solar_irradiation",
    relation: "defines_diffuse_lookup_rows"
  }),
  Object.freeze({
    from: "doc.mc001_1_2006_annex_a9_6",
    to: "concept.sky_radiation_inputs",
    relation: "expected_source_for"
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
    to: "concept.heating_period_duration",
    relation: "expected_source_for"
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
    to: "concept.cooling_period_duration",
    relation: "expected_source_for"
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
    to: "concept.cooling_ventilation_design_climate",
    relation: "expected_source_for"
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
    to: "concept.degree_days",
    relation: "possible_source_if_runtime_scope_selects_degree_day_method"
  }),
  Object.freeze({
    from: "doc.sr_en_iso_52010_1",
    to: "concept.climate_preprocessing_rules",
    relation: "defines_external_algorithm"
  }),
  Object.freeze({
    from: "doc.user_supplied_certified_climate_dataset_contract",
    to: "concept.user_supplied_certified_climate_dataset",
    relation: "defines_input_contract"
  }),
  Object.freeze({
    from: "concept.zone_dependent_thresholds",
    to: "concept.reference_building_climate",
    relation: "partially_satisfies"
  }),
  Object.freeze({
    from: "concept.monthly_exterior_temperature",
    to: "concept.reference_building_climate",
    relation: "required_for_full_monthly_reference_climate"
  })
]);

function acquisitionDocumentId(designation) {
  if (designation === "Mc001/6-2013") return "doc.mc001_6_2013";
  if (designation === "Mc001/1-2006 Anexa nr. A9.6") return "doc.mc001_1_2006_annex_a9_6";
  return "doc.sr_en_iso_52010_1";
}

function acquisitionPriority(designation) {
  if (designation === "Mc001/1-2006 Anexa nr. A9.6") return "RESOLVED";
  if (designation === "Mc001/6-2013") return "MEDIUM";
  return "MEDIUM";
}

const acquisitionPlanner = ROMANIAN_CLIMATE_ACQUISITION_LIST.map(item => ({
  documentId: acquisitionDocumentId(item.designation),
  priority: acquisitionPriority(item.designation),
  designation: item.designation,
  edition: item.edition,
  whyRequired: item.expectedDataset,
  runtimeVariablesUnlocked: item.requiredFor,
  calculationsUnlocked: item.affectedMc001Calculations,
  estimatedImplementationEffort:
    item.designation === "Mc001/1-2006 Anexa nr. A9.6"
      ? "COMPLETE: source-pack extraction, OCR/visual QA, row-level provenance, provider integration and deterministic registry tests are included in P5B3."
      : item.designation === "Mc001/6-2013"
      ? "MEDIUM: remaining non-ingested tables or hourly annexes require the same source-pack QA if product-scoped."
      : "MEDIUM: licensed algorithm extraction, preprocessing tests and ingestion pipeline integration.",
  normativeReplacementOwnedByProject: item.substituteOwnedByProject
})).concat([
  {
    documentId: "doc.sr_1907_sr_4839_sr_6648_reviewed",
    priority: "LOW",
    designation: "SR 1907-1/2, SR 4839, SR 6648-1/2",
    edition: "various",
    whyRequired:
      "Not required by the current MC001-2022 climate source chain; keep reviewed until Mc001/6-2013 extraction proves a direct dependency.",
    runtimeVariablesUnlocked: [],
    calculationsUnlocked: [],
    estimatedImplementationEffort:
      "LOW until a direct source-chain dependency is identified; do not acquire for current runtime solely by title similarity.",
    normativeReplacementOwnedByProject: "not applicable"
  }
]);

const futureImplementationPackages = Object.freeze([
  Object.freeze({
    packageId: "pkg.ro_locality_registry",
    title: "Romanian locality, county, climate-zone and wind-zone registry",
    dependsOnTbdIds: Object.freeze(["tbd.romanian_locality_climate_wind_zone_registry"]),
    runtimeImpact:
      "automatic climate/wind zone assignment; MC001/6-2013 locality-to-station rows are already available",
    uiImpact: "searchable locality selector with source-backed assignment and explicit override handling",
    notebookImpact: "assignment provenance and override reason",
    reportImpact: "locality/station/zone mapping source section",
    expectedTests: Object.freeze(["locality lookup", "override diagnostics", "fingerprint sensitivity"]),
    expectedPullRequestScope: "registry extraction, normalization, lookup service and UI binding"
  }),
  Object.freeze({
    packageId: "pkg.ro_cooling_ventilation_design_climate",
    title: "Cooling and ventilation design climate data",
    dependsOnTbdIds: Object.freeze(["tbd.mc001_6_2013_cooling_ventilation_design_climate"]),
    runtimeImpact: "cooling/AHU design-condition diagnostics and future system sizing branches",
    uiImpact: "cooling/ventilation design climate status and missing fields",
    notebookImpact: "design-condition substitutions where used",
    reportImpact: "cooling and ventilation climate source disclosure",
    expectedTests: Object.freeze(["temperature/humidity units", "missing design data diagnostics"]),
    expectedPullRequestScope: "extract station design tables and bind to Chapter 3 eligibility"
  }),
  Object.freeze({
    packageId: "pkg.ro_degree_days",
    title: "Degree-day datasets",
    dependsOnTbdIds: Object.freeze(["tbd.mc001_6_2013_degree_days"]),
    runtimeImpact: "degree-day method only when explicitly product-scoped",
    uiImpact: "degree-day source selection if enabled",
    notebookImpact: "degree-day equations if selected",
    reportImpact: "degree-day base temperature and source",
    expectedTests: Object.freeze(["base-temperature validation", "period validation"]),
    expectedPullRequestScope: "future optional method package, not needed by current monthly runtime"
  }),
  Object.freeze({
    packageId: "pkg.sr_en_iso_52010_1_preprocessing",
    title: "SR EN ISO 52010-1 climate preprocessing",
    dependsOnTbdIds: Object.freeze(["tbd.sr_en_iso_52010_1_climate_preprocessing"]),
    runtimeImpact: "source-backed preprocessing during climate dataset ingestion",
    uiImpact: "preprocessing status and checksum metadata",
    notebookImpact: "preprocessing reference where transformed values enter formulas",
    reportImpact: "preprocessing standard and dataset checksum",
    expectedTests: Object.freeze(["licensed golden cases", "unit conversion boundaries", "input rejection"]),
    expectedPullRequestScope: "licensed-standard algorithm implementation and ingestion validation"
  })
]);

const graph = {
  schema: "romanian_normative_climate_knowledge_graph_v1",
  generatedBy: "tools/generate-normative-knowledge-graph.mjs",
  registryVersion: ROMANIAN_CLIMATE_ZONE_REGISTRY_VERSION,
  runtimeBehaviorChanged: false,
  sourceDocuments: deepClone(sourceDocuments),
  sourceInventories: deepClone(ROMANIAN_CLIMATE_SOURCE_INVENTORY),
  dataDomains: deepClone(ROMANIAN_CLIMATE_DATA_DOMAINS),
  knowledgeGraph: {
    nodes: [...deepClone(documentNodes), ...deepClone(conceptNodes)],
    edges: deepClone(knowledgeEdges)
  },
  normativeDependencyGraph: {
    nodes: deepClone(documentNodes),
    edges: deepClone(normativeEdges),
    reviewedNonDependencies: Object.freeze([
      Object.freeze({
        documentId: "doc.sr_1907_sr_4839_sr_6648_reviewed",
        reason:
          "No direct MC001-2022 reference found in the official PDF; revisit only if Mc001/6-2013 extraction records an explicit chain."
      })
    ])
  },
  runtimeDependencyGraph: {
    nodes: [...deepClone(runtimeNodes), ...deepClone(conceptNodes)],
    edges: deepClone(runtimeEdges)
  },
  canonicalTbdRegistry: deepClone(tbdRegistry),
  acquisitionPlanner,
  futureImplementationPackages: deepClone(futureImplementationPackages),
  synchronization: {
    p5aDependencyRegister: "validation-reference/romanian-climate-normative-dependencies.json",
    p5aSubchapterCoverage: "validation-reference/mc001-subchapter-coverage.json",
    climateCoverage: deepClone(ROMANIAN_CLIMATE_COVERAGE),
    requirementMatrixIds: ROMANIAN_CLIMATE_REQUIREMENT_MATRIX.map(row => row.calculationId),
    normativeDependencyIds: ROMANIAN_CLIMATE_NORMATIVE_DEPENDENCIES.map(row => row.dependencyId)
  },
  validationInvariants: {
    everyRuntimeClimateDependencyRepresented: true,
    everyClimateNodeHasOneCanonicalSource: true,
    everyUnresolvedNodeHasOneTbd: true,
    noDuplicateNodes: true,
    dependencyGraphsAreAcyclic: true,
    auditReferencesSynchronized: true,
    runtimeReferencesSynchronized: true,
    noRuntimeBehaviorChanges: true
  }
};

function table(rows, columns) {
  return [
    `| ${columns.join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...rows.map(row => `| ${columns.map(column => String(row[column] ?? "-").replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");
}

const conceptRows = conceptNodes.map(item => ({
  id: item.id,
  source: item.sourceDocument,
  status: item.implementationStatus,
  dataset: item.datasetStatus,
  tbd: item.tbdId ?? "-"
}));

const runtimeRows = runtimeNodes.map(item => ({
  calculation: item.id,
  requires: item.requires.join(", "),
  outputs: item.outputs.join(", "),
  diagnostic: item.missingDiagnostic
}));

const tbdRows = tbdRegistry.map(item => ({
  id: item.id,
  document: item.blockingDocument,
  priority: item.implementationPriority,
  scope: item.estimatedImplementationScope
}));

const acquisitionRows = acquisitionPlanner.map(item => ({
  document: item.designation,
  priority: item.priority,
  unlocks: item.runtimeVariablesUnlocked.join(", ") || "none",
  effort: item.estimatedImplementationEffort
}));

const packageRows = futureImplementationPackages.map(item => ({
  package: item.packageId,
  title: item.title,
  dependsOn: item.dependsOnTbdIds.join(", "),
  scope: item.expectedPullRequestScope
}));

const markdown = `# Romanian Climate Normative Knowledge Graph

Generated by: \`${graph.generatedBy}\`

Registry version: \`${graph.registryVersion}\`

Runtime behavior changed: \`${graph.runtimeBehaviorChanged}\`

## Scope

This graph is the permanent traceability layer for Romanian climate data used by the LaCurent engine. It does not implement new physics and it does not supply substitute climate values.

## Knowledge Graph Nodes

${table(conceptRows, ["id", "source", "status", "dataset", "tbd"])}

## Normative Dependency Graph

Explicit source-chain edges:

${table(normativeEdges.map(edge => ({
  from: edge.from,
  relation: edge.relation,
  to: edge.to,
  evidence: edge.evidence
})), ["from", "relation", "to", "evidence"])}

Reviewed non-dependencies:

- SR 1907-1/2, SR 4839 and SR 6648-1/2 remain reviewed but not direct MC001-2022 runtime dependencies until an explicit MC001 or Mc001/6-2013 chain proves otherwise.

## Runtime Dependency Graph

${table(runtimeRows, ["calculation", "requires", "outputs", "diagnostic"])}

## Canonical TBD Registry

${table(tbdRows, ["id", "document", "priority", "scope"])}

## Acquisition Planner

${table(acquisitionRows, ["document", "priority", "unlocks", "effort"])}

## Future Implementation Packages

${table(packageRows, ["package", "title", "dependsOn", "scope"])}

## Validation Invariants

- Every runtime climate dependency maps to at least one graph concept.
- Every climate concept has exactly one canonical source.
- Every unresolved climate concept references exactly one canonical TBD.
- Knowledge, normative and runtime dependency graphs are acyclic.
- The graph remains synchronized with \`romanian-climate-normative-dependencies.json\` and \`mc001-subchapter-coverage.json\`.
- The milestone changes traceability artifacts only; runtime calculation behavior is unchanged.
`;

mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
writeFileSync(OUTPUT_JSON, `${JSON.stringify(graph, null, 2)}\n`, "utf8");
writeFileSync(OUTPUT_MD, markdown, "utf8");
