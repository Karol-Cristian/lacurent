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
    repositoryStatus: "official_public_pdf_identified_not_source_packed",
    path: "https://www.mdlpa.ro/userfiles/reglementari/Domeniul_XXVII/27_11_MC_001_6_2013.pdf",
    canonicalUse:
      "Delegated Romanian climate-parameter source for locality/station data, monthly exterior parameters, solar irradiation and design days."
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
    table: "Capitolul II/III/IV station tables expected",
    page: "Delegated by MC001-2022 Anexa D, Monitorul Oficial p. 597",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_locality_station_zone_registry"
  }),
  node({
    id: "concept.locality_mapping",
    description: "Source-backed locality/county assignment to climate zone, wind zone and representative station.",
    units: "locality/county/station identifiers",
    runtimeUsage: Object.freeze(["automatic location-to-climate assignment"]),
    notebookUsage: "Show automatic or manual assignment origin and warn when mapping is unavailable.",
    reportUsage: "Report assignment origin, override reason and missing mapping diagnostics.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Source-backed locality/station mapping tables expected",
    page: "Delegated by MC001-2022 Anexa D, Monitorul Oficial p. 597",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_locality_station_zone_registry"
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
    table: "Capitolul III monthly climate tables expected",
    page: "Delegated by MC001-2022 Anexa D, Monitorul Oficial p. 597",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_monthly_temperature_dataset"
  }),
  node({
    id: "concept.monthly_solar_irradiation",
    description: "Monthly solar irradiation or explicit solar-gain inputs used for transparent and opaque gains.",
    units: "kWh/m2; kWh",
    runtimeUsage: Object.freeze(["chapter2_solar_gains"]),
    notebookUsage:
      "Show selected orientation/plane irradiation or explicit certified solar gains for each month.",
    reportUsage: "Report irradiation source, orientation mapping and monthly solar inputs.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Capitolul III solar tables expected",
    page: "Delegated by MC001-2022 Anexa D, Monitorul Oficial p. 597",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_monthly_solar_dataset"
  }),
  node({
    id: "concept.direct_diffuse_solar_irradiation",
    description: "Direct and diffuse solar components when a downstream method requires component-level radiation.",
    units: "kWh/m2",
    runtimeUsage: Object.freeze(["solar preprocessing", "future source-backed orientation/plane processing"]),
    notebookUsage: "Show only when supplied by a source-backed dataset or required by a selected method.",
    reportUsage: "Report component data and source when used.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Solar component tables expected if reproduced by delegated source",
    page: "Delegated by MC001-2022 Anexa D, Monitorul Oficial p. 597",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_monthly_solar_dataset"
  }),
  node({
    id: "concept.sky_radiation_inputs",
    description: "Sky-radiation inputs or correction terms when required by a selected solar/thermal exchange method.",
    units: "method dependent",
    runtimeUsage: Object.freeze(["solar preprocessing", "radiative exchange diagnostics"]),
    notebookUsage: "Show only when the selected source-backed method uses sky-radiation data.",
    reportUsage: "Report sky-radiation data source and whether it affected current calculations.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Delegated climate/solar parameter tables expected",
    page: "Delegated by MC001-2022 Anexa D, Monitorul Oficial p. 597",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_monthly_solar_dataset"
  }),
  node({
    id: "concept.heating_period_duration",
    description: "Heating-period duration or monthly applicability information used by heating calculations.",
    units: "h; d; boolean applicability",
    runtimeUsage: Object.freeze(["chapter2_monthly_transmission_ventilation", "monthly heating aggregation"]),
    notebookUsage: "Show monthly applicability and duration when supplied by climate profile.",
    reportUsage: "Report period assumptions and exact monthly hours used.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Heating-period climate data expected",
    page: "Delegated by MC001-2022 Anexa D, Monitorul Oficial p. 597",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_monthly_temperature_dataset"
  }),
  node({
    id: "concept.cooling_period_duration",
    description: "Cooling-period duration or monthly applicability information used by cooling calculations.",
    units: "h; d; boolean applicability",
    runtimeUsage: Object.freeze(["chapter2 monthly cooling aggregation", "Chapter 3 cooling-system operation"]),
    notebookUsage: "Show monthly applicability and duration when supplied by climate profile.",
    reportUsage: "Report period assumptions and exact monthly hours used.",
    sourceDocument: "doc.mc001_6_2013",
    sourceEdition: "2013",
    table: "Cooling-period climate data expected",
    page: "Delegated by MC001-2022 Anexa D, Monitorul Oficial p. 597",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
    datasetStatus: CLIMATE_DATASET_STATUSES.DATASET_UNAVAILABLE,
    tbdId: "tbd.mc001_6_2013_monthly_temperature_dataset"
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
    table: "Capitolul IV Tabel IV.1/IV.2 expected",
    page: "Delegated by MC001-2022 Anexa D, Monitorul Oficial p. 597",
    implementationStatus: "EXTERNAL_DATA_DEPENDENCY",
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
    tbdId: "tbd.mc001_6_2013_monthly_temperature_dataset"
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
    id: "tbd.mc001_6_2013_locality_station_zone_registry",
    description: "Canonical Romanian locality/county/station assignment registry.",
    blockingDocument: "Mc001/6-2013 Partea a VI-a",
    requiredEdition: "2013",
    affectedCalculations: Object.freeze(["automatic climate assignment", "design climate selection"]),
    affectedRuntimeModules: Object.freeze(["src/climate-platform/romanianClimateZones.mjs"]),
    affectedUi: Object.freeze(["Amplasare si clima searchable locality selector"]),
    affectedNotebook: Object.freeze(["climate metadata and assignment provenance"]),
    affectedReport: Object.freeze(["climate location and assignment source"]),
    affectedTests: Object.freeze(["locality-to-zone mapping", "save/reopen exact climate identity"]),
    implementationPriority: "HIGH",
    estimatedImplementationScope:
      "Source-pack extraction, row-level QA, stable locality identifiers, county/station aliases and migration diagnostics."
  }),
  Object.freeze({
    id: "tbd.mc001_6_2013_monthly_temperature_dataset",
    description: "Twelve-month exterior temperature and period/applicability dataset.",
    blockingDocument: "Mc001/6-2013 Partea a VI-a",
    requiredEdition: "2013",
    affectedCalculations: Object.freeze([
      "chapter2_monthly_transmission_ventilation",
      "monthly QHnd/QCnd",
      "reference-building climate comparisons"
    ]),
    affectedRuntimeModules: Object.freeze([
      "src/climate-platform/romanianClimateProfiles.mjs",
      "src/building-platform/buildingDnaResolver.mjs"
    ]),
    affectedUi: Object.freeze(["monthly climate inspector", "calculation eligibility diagnostics"]),
    affectedNotebook: Object.freeze(["monthly Qtr/Qve substitutions"]),
    affectedReport: Object.freeze(["monthly climate table and source section"]),
    affectedTests: Object.freeze(["five-zone or station monthly fixtures", "fingerprint sensitivity"]),
    implementationPriority: "HIGH",
    estimatedImplementationScope:
      "Extract 12-month tables, normalize units, encode source references, add fixtures and end-to-end eligibility tests."
  }),
  Object.freeze({
    id: "tbd.mc001_6_2013_monthly_solar_dataset",
    description: "Monthly solar irradiation by required orientation or plane, including components when required.",
    blockingDocument: "Mc001/6-2013 Partea a VI-a",
    requiredEdition: "2013",
    affectedCalculations: Object.freeze(["chapter2_solar_gains", "solar-gain orientation diagnostics"]),
    affectedRuntimeModules: Object.freeze(["src/climate-platform/romanianClimateProfiles.mjs"]),
    affectedUi: Object.freeze(["orientation-dependent irradiation display"]),
    affectedNotebook: Object.freeze(["monthly transparent and opaque solar-gain substitutions"]),
    affectedReport: Object.freeze(["solar irradiation source and orientation tables"]),
    affectedTests: Object.freeze(["orientation direction", "monthly solar completeness", "no synthetic fallback"]),
    implementationPriority: "HIGH",
    estimatedImplementationScope:
      "Extract irradiation tables, validate orientation/plane keys, add table lookups and source-backed solar fixtures."
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
    description: "Normative climate-data preprocessing algorithms delegated to SR EN ISO 52010-1.",
    blockingDocument: "SR EN ISO 52010-1",
    requiredEdition: "owned edition referenced by MC001 implementation policy",
    affectedCalculations: Object.freeze(["source-backed climate data ingestion QA"]),
    affectedRuntimeModules: Object.freeze(["future source-pack ingestion pipeline"]),
    affectedUi: Object.freeze(["dataset validation provenance"]),
    affectedNotebook: Object.freeze(["preprocessing reference where transformed values are used"]),
    affectedReport: Object.freeze(["preprocessing standard and checksum metadata"]),
    affectedTests: Object.freeze(["preprocessing golden cases from licensed source"]),
    implementationPriority: "MEDIUM",
    estimatedImplementationScope:
      "Implement only after licensed standard is supplied; add algorithm tests and source-to-code coverage."
  })
]);

const runtimeRequirementToConcepts = Object.freeze({
  climateZone: Object.freeze(["concept.climate_zone"]),
  monthlyExteriorTemperatures: Object.freeze(["concept.monthly_exterior_temperature"]),
  monthDurations: Object.freeze(["concept.month_duration"]),
  monthlySolarIrradiationOrExplicitSolarGains: Object.freeze([
    "concept.monthly_solar_irradiation",
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
    from: "doc.mc001_2022_annex_d",
    to: "concept.monthly_solar_irradiation",
    relation: "delegates_dataset"
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
    to: "concept.direct_diffuse_solar_irradiation",
    relation: "expected_source_for"
  }),
  Object.freeze({
    from: "doc.mc001_6_2013",
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

const acquisitionPlanner = ROMANIAN_CLIMATE_ACQUISITION_LIST.map(item => ({
  documentId: item.designation === "Mc001/6-2013" ? "doc.mc001_6_2013" : "doc.sr_en_iso_52010_1",
  priority: item.designation === "Mc001/6-2013" ? "HIGH" : "MEDIUM",
  designation: item.designation,
  edition: item.edition,
  whyRequired: item.expectedDataset,
  runtimeVariablesUnlocked: item.requiredFor,
  calculationsUnlocked: item.affectedMc001Calculations,
  estimatedImplementationEffort:
    item.designation === "Mc001/6-2013"
      ? "HIGH: source-pack extraction, OCR/visual QA, row-level provenance, schema migration and five-domain runtime fixtures."
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
    title: "Romanian locality, county, station and zone registry",
    dependsOnTbdIds: Object.freeze(["tbd.mc001_6_2013_locality_station_zone_registry"]),
    runtimeImpact: "automatic climate/wind zone and representative station assignment",
    uiImpact: "searchable locality selector with source-backed assignment and explicit override handling",
    notebookImpact: "assignment provenance and override reason",
    reportImpact: "locality/station/zone mapping source section",
    expectedTests: Object.freeze(["locality lookup", "override diagnostics", "fingerprint sensitivity"]),
    expectedPullRequestScope: "registry extraction, normalization, lookup service and UI binding"
  }),
  Object.freeze({
    packageId: "pkg.ro_monthly_exterior_temperatures",
    title: "Monthly exterior temperature profiles",
    dependsOnTbdIds: Object.freeze(["tbd.mc001_6_2013_monthly_temperature_dataset"]),
    runtimeImpact: "source-backed Chapter 2 monthly Qtr/Qve and useful demand eligibility",
    uiImpact: "monthly climate values visible without synthetic fallback",
    notebookImpact: "monthly transfer substitutions use source-backed temperatures",
    reportImpact: "twelve-month climate table with station/source/version",
    expectedTests: Object.freeze(["12-month completeness", "zone/station profile selection", "annual sum identity"]),
    expectedPullRequestScope: "source-pack monthly temperature profiles and runtime eligibility upgrade"
  }),
  Object.freeze({
    packageId: "pkg.ro_monthly_solar_irradiation",
    title: "Monthly solar irradiation profiles",
    dependsOnTbdIds: Object.freeze(["tbd.mc001_6_2013_monthly_solar_dataset"]),
    runtimeImpact: "source-backed solar gains and orientation diagnostics",
    uiImpact: "orientation/plane irradiation selection and inspector values",
    notebookImpact: "transparent/opaque solar gain substitutions",
    reportImpact: "orientation-dependent solar table",
    expectedTests: Object.freeze(["orientation coverage", "invalid orientation rejection", "solar gain direction"]),
    expectedPullRequestScope: "solar source-pack extraction, profile schema extension and fixtures"
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
