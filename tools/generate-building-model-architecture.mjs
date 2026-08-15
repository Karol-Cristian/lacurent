import { writeFileSync } from "node:fs";

const CATEGORY_IDS = Object.freeze([
  "primitive_user_input",
  "provider_resolved",
  "derived_engineering_value",
  "physics_runtime_state",
  "output",
  "legacy"
]);

const UI_RECOMMENDATIONS = Object.freeze(["remain_editable", "auto_resolved", "calculated", "read_only", "hidden", "remove"]);

const SOURCE_BASELINE_COMMIT = "66a2afd8b2c106b68c7fbf137d088182a990382f";

const refs = Object.freeze({
  resolver: "src/building-platform/buildingDnaResolver.mjs",
  chapter2Adapter: "src/building-platform/buildingChapter2Adapter.mjs",
  chapter3Adapter: "src/building-platform/buildingChapter3InstallationsAdapter.mjs",
  technicalReport: "src/building-platform/buildingTechnicalReport.mjs",
  climateProvider: "src/climate-platform/romanianNormativeClimateProvider.mjs",
  productionClimateRegistry: "src/climate-platform/romanianProductionClimateRegistry.mjs",
  climateZones: "src/climate-platform/romanianClimateZones.mjs",
  climateDependencies: "src/climate-platform/romanianClimateNormativeDependencies.mjs",
  wizard: "js/building-platform-wizard.mjs",
  calculatorPage: "pages/analiza-casa.html",
  versionedBackend: "src/building-platform/backend/buildingPlatformVersionedBackend.mjs",
  fingerprints: "src/building-platform/backend/buildingPlatformFingerprints.mjs",
  persistenceInventory: "src/building-platform/backend/buildingPlatformPersistenceInventory.mjs",
  localSession: "src/building-platform/backend/buildingPlatformLocalSession.mjs",
  legacyMigration: "src/building-platform/backend/legacyBuildingPlatformMigration.mjs",
  schema: "migrations/010_building_platform_versioned_backend.sql",
  draftSchema: "migrations/011_building_platform_local_first_flow.sql",
  workers: "workers/save-house.js",
  propagationTest: "src/building-platform/tests/buildingInputPropagationAudit.test.mjs",
  wizardTest: "tests/building-platform-wizard-ui.mjs",
  backendTest: "src/building-platform/tests/buildingPlatformVersionedBackend.test.mjs",
  chapter3ProductTest: "src/building-platform/tests/buildingChapter3InstallationsProduct.test.mjs",
  climateProviderTest: "src/climate-platform/tests/romanianNormativeClimateProvider.test.mjs"
});

function field({
  fieldId,
  path,
  purpose,
  category,
  owner,
  sourceOfTruth,
  producer,
  consumer,
  dataType,
  uiLocation = null,
  notebookLocation = null,
  reportLocation = null,
  editable = false,
  derived = false,
  persisted = true,
  runtimeOnly = false,
  providerGenerated = false,
  reportOnly = false,
  notebookOnly = false,
  deprecated = false,
  legacy = false,
  productionUsage,
  dependencies = [],
  uiRecommendation,
  genericity = "generic_mc001_concept",
  removalAssessment = "retain",
  implementationRefs = [],
  tests = []
}) {
  return Object.freeze({
    fieldId,
    path,
    purpose,
    category,
    owner,
    sourceOfTruth,
    producer,
    consumer,
    dataType,
    editable,
    derived,
    persisted,
    runtimeOnly,
    providerGenerated,
    reportOnly,
    notebookOnly,
    deprecated,
    legacy,
    productionUsage,
    uiLocation,
    notebookLocation,
    reportLocation,
    dependencies,
    uiRecommendation,
    genericity,
    removalAssessment,
    implementationRefs,
    tests
  });
}

const domains = Object.freeze([
  {
    domainId: "project_identity",
    concept: "Building Project",
    owner: "Versioned Building Backend",
    sourceOfTruth: "building_platform_projects",
    lifecycle: "mutable metadata with immutable current-version pointers",
    responsibilities: [
      "stable user-facing object",
      "ownership boundary",
      "current Building DNA, analysis and report pointers"
    ],
    implementationRefs: [refs.versionedBackend, refs.schema, refs.workers]
  },
  {
    domainId: "local_project_session",
    concept: "Local-first editable project session",
    owner: "Browser session model",
    sourceOfTruth: "loaded canonical project payload plus local draft state",
    lifecycle: "in-memory until explicit draft/permanent save",
    responsibilities: [
      "dirty state",
      "unsaved calculation state",
      "stale-result prevention"
    ],
    implementationRefs: [refs.localSession, refs.wizard]
  },
  {
    domainId: "building_dna",
    concept: "Canonical Building DNA",
    owner: "Building DNA Resolver",
    sourceOfTruth: "building_dna_versions.complete_building_dna_json",
    lifecycle: "immutable once saved as a version",
    responsibilities: [
      "normalized engineering model",
      "canonical bridge between UI/providers and physics adapters",
      "fingerprintable input state"
    ],
    implementationRefs: [refs.resolver, refs.fingerprints, refs.versionedBackend]
  },
  {
    domainId: "location_and_climate",
    concept: "Location and climate",
    owner: "Romanian Climate Provider",
    sourceOfTruth: "source-backed climate registries and explicit manual zone override",
    lifecycle: "provider-resolved at Building DNA creation; persisted inside Building DNA",
    responsibilities: [
      "resolve locality to station where source-backed",
      "resolve monthly temperature, humidity, design temperatures and solar source rows",
      "bound unavailable mappings without fabricated fallback"
    ],
    implementationRefs: [refs.climateProvider, refs.productionClimateRegistry, refs.climateZones]
  },
  {
    domainId: "geometry",
    concept: "Thermal building geometry",
    owner: "Building DNA Resolver",
    sourceOfTruth: "explicit user geometry plus documented resolver-derived seeds",
    lifecycle: "editable primitive inputs normalized into Building DNA",
    responsibilities: [
      "gross and net envelope areas",
      "heated volume",
      "ventilation airflow derivation from ACH and volume"
    ],
    implementationRefs: [refs.resolver, refs.propagationTest]
  },
  {
    domainId: "envelope_and_materials",
    concept: "Envelope, assemblies and material catalogue",
    owner: "Building Platform Catalogue plus Building DNA Resolver",
    sourceOfTruth: "catalogue selections resolved into Building DNA assemblies and explicit envelope elements",
    lifecycle: "catalogue-resolved inputs; physics engine calculates R, U and H coefficients",
    responsibilities: [
      "assembly layer stacks",
      "material lambda references",
      "boundary conditions and thermal bridges"
    ],
    implementationRefs: [refs.resolver, refs.chapter2Adapter, "src/building-platform/buildingPlatformCatalog.mjs"]
  },
  {
    domainId: "technical_systems",
    concept: "Chapter 3 technical systems",
    owner: "Technical Systems schema and Chapter 3 adapter",
    sourceOfTruth: "buildingDna.technicalSystems",
    lifecycle: "explicit user engineering input; persisted with Building DNA; heating/cooling/DHW may contain multiple systems only with explicit allocation fractions",
    responsibilities: [
      "heating, cooling, ventilation/AHU, DHW, PCM storage and explicit LENI boundary",
      "no hidden system assumptions",
      "map to Chapter 3 integrated runtime"
    ],
    implementationRefs: [refs.chapter3Adapter, refs.chapter3ProductTest, refs.wizard]
  },
  {
    domainId: "physics_engine",
    concept: "MC001 physics engine",
    owner: "Physics Engine",
    sourceOfTruth: "explicit adapter input",
    lifecycle: "runtime calculation only; persisted as immutable analysis version output",
    responsibilities: [
      "Chapter 2 useful demand",
      "Chapter 3 installation energy chains",
      "deterministic intermediate values"
    ],
    implementationRefs: [refs.chapter2Adapter, refs.chapter3Adapter, "src/physics-engine"]
  },
  {
    domainId: "technical_workspace_report",
    concept: "Engineering notebook and technical report",
    owner: "Technical Report Builder",
    sourceOfTruth: "Building DNA plus persisted engine output",
    lifecycle: "generated model persisted as report version; presentation regenerated from structure",
    responsibilities: [
      "display compact engineering equations",
      "show provenance and climate appendix",
      "never recalculate physics"
    ],
    implementationRefs: [refs.technicalReport, refs.backendTest]
  },
  {
    domainId: "legacy_compatibility",
    concept: "Legacy saved-house compatibility",
    owner: "Legacy migration boundary",
    sourceOfTruth: "legacy houses/analyses/analysis_answers/report_snapshots until migrated",
    lifecycle: "read and migration boundary only",
    responsibilities: [
      "preserve old data",
      "prevent legacy calculation code from becoming canonical"
    ],
    implementationRefs: [refs.legacyMigration, refs.persistenceInventory, refs.workers]
  }
]);

const fields = [
  field({
    fieldId: "project.name",
    path: "building_platform_projects.project_name / form.display_name",
    purpose: "User-visible name for the engineering project.",
    category: "primitive_user_input",
    owner: "Versioned Building Backend",
    sourceOfTruth: "building_platform_projects.project_name",
    producer: "UI explicit save payload",
    consumer: "project list, reopen payload, report title block",
    dataType: "string",
    editable: true,
    productionUsage: "metadata_only_no_physics_effect",
    uiLocation: "Date proiect / Nume model",
    reportLocation: "Date generale ale proiectului",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.versionedBackend],
    tests: [refs.backendTest, refs.wizardTest]
  }),
  field({
    fieldId: "building.identity.type",
    path: "building.buildingType / form.building_type",
    purpose: "Selects the building-use family currently supported by resolver branching.",
    category: "primitive_user_input",
    owner: "Building DNA Resolver",
    sourceOfTruth: "buildingDna.building.buildingType",
    producer: "mapWizardAnswersToAssistedAnswers",
    consumer: "typology proposal, internal gains category, report",
    dataType: "enum:detached_house|apartment|future_non_residential",
    editable: true,
    productionUsage: "affects typology and Table 2.15 internal gains when applicable",
    uiLocation: "Geometrie / Tip cladire",
    notebookLocation: "Date generale",
    reportLocation: "Date generale",
    dependencies: ["project.name"],
    uiRecommendation: "remain_editable",
    genericity: "partly_residential_specific_currently_but_target_extensible",
    removalAssessment: "retain_and_generalize_for_non_residential",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.wizardTest, refs.propagationTest]
  }),
  field({
    fieldId: "building.identity.use_category",
    path: "building.useCategory / building.internalGainsCategoryId",
    purpose: "Canonical building-use category used to resolve MC001 Tabel 2.15 internal-gain intensity when the category is source-backed.",
    category: "primitive_user_input",
    owner: "Building DNA Resolver",
    sourceOfTruth: "buildingDna.building.useCategory or buildingDna.building.internalGainsCategoryId",
    producer: "UI building-use selector or expert category override",
    consumer: "monthlyProfilesFromProviderClimate, Table 2.15 internal-gains derivation, report",
    dataType: "enum:residential_collective|residential_single_family|administrative|schools|hospitals|expert category override",
    editable: true,
    productionUsage: "drives_source_backed_internal_gains_when_useful_area_and_monthly_duration_are_available",
    uiLocation: "Geometrie / Utilizare cladire or expert settings",
    notebookLocation: "Aporturi interne lunare",
    reportLocation: "Caiet de calcule ingineresti",
    dependencies: ["building.identity.type"],
    uiRecommendation: "remain_editable",
    genericity: "generic_for_supported_MC001_Table_2_15_categories",
    removalAssessment: "retain_as_canonical_use_input",
    implementationRefs: [refs.resolver, refs.chapter2Adapter, refs.technicalReport],
    tests: [
      "src/building-platform/tests/buildingDnaResolver.test.mjs",
      "src/building-platform/tests/buildingTechnicalReport.test.mjs"
    ]
  }),
  field({
    fieldId: "building.identity.construction_period",
    path: "building.constructionPeriod / form.construction_year",
    purpose: "Normalizes a construction year into the resolver typology period.",
    category: "primitive_user_input",
    owner: "Building DNA Resolver",
    sourceOfTruth: "buildingDna.building.constructionPeriod",
    producer: "constructionPeriodFromYear",
    consumer: "typology proposal and report",
    dataType: "enum period derived from year input",
    editable: true,
    derived: true,
    productionUsage: "typology_input_may_affect_catalogue_selection",
    uiLocation: "Geometrie / An constructie",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "location.locality_id",
    path: "building.location.localityId / form.locality_id",
    purpose: "Single source of truth for source-backed Romanian locality climate resolution.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.building.location.localityId",
    producer: "locality selector",
    consumer: "Romanian Climate Provider, report, notebook, persistence fingerprint",
    dataType: "stable locality id",
    editable: true,
    productionUsage: "drives station, monthly temperature, humidity, design climate and available solar source rows",
    uiLocation: "Amplasare si clima / Localitate MC001/6-2013",
    notebookLocation: "Date climatice",
    reportLocation: "Anexa climatica",
    dependencies: ["location.country"],
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.climateProvider],
    tests: [refs.wizardTest, refs.climateProviderTest]
  }),
  field({
    fieldId: "location.county",
    path: "building.location.countyName / form.county",
    purpose: "Human-readable administrative context for the selected locality.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.building.location.countyName",
    producer: "UI",
    consumer: "report, possible future locality validation",
    dataType: "string",
    editable: true,
    productionUsage: "metadata_traceability_currently_no_physics_effect",
    uiLocation: "Amplasare si clima / Judet",
    reportLocation: "Anexa climatica",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "location.free_text_city",
    path: "form.city / building.location.city",
    purpose: "Free-text locality fallback for certified data or display when no source-backed locality is selected.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.building.location.city",
    producer: "UI",
    consumer: "provider name lookup only when stable locality id is absent",
    dataType: "string",
    editable: true,
    productionUsage: "fallback_for_certified_or_name_lookup_not_primary_locality_source",
    uiLocation: "Amplasare si clima / Localitate libera",
    uiRecommendation: "remain_editable",
    removalAssessment: "retain_as_certified_dataset_metadata_not_as_primary_selector",
    implementationRefs: [refs.wizard, refs.climateProvider],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "climate.zone",
    path: "climate.climateZone / form.climate_zone",
    purpose: "Explicit MC001 climate-zone selection for zone-dependent requirements; not a monthly climate profile.",
    category: "primitive_user_input",
    owner: "User until source-backed locality-zone mapping is acquired",
    sourceOfTruth: "buildingDna.climate.climateZone",
    producer: "manual zone selector or future provider mapping",
    consumer: "climateZoneRequirements, winter design temperature by zone, report diagnostics",
    dataType: "enum:I|II|III|IV|V|null",
    editable: true,
    productionUsage: "zone_dependent_thresholds_only_currently",
    uiLocation: "Amplasare si clima / Zona climatica MC001",
    notebookLocation: "Date climatice",
    reportLocation: "Anexa climatica",
    dependencies: ["location.locality_id"],
    uiRecommendation: "remain_editable",
    removalAssessment: "becomes_auto_resolved_when_normative_mapping_available",
    implementationRefs: [refs.climateZones, refs.resolver],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "climate.wind_zone",
    path: "climate.windZone / form.wind_zone",
    purpose: "Explicit wind-zone metadata; no active Chapter 2/3 runtime branch currently consumes it.",
    category: "primitive_user_input",
    owner: "User until source-backed locality-wind mapping is acquired",
    sourceOfTruth: "buildingDna.climate.windZone",
    producer: "manual wind-zone selector or future provider mapping",
    consumer: "report, diagnostics, future wind-dependent calculations",
    dataType: "enum:I|II|III|IV|null",
    editable: true,
    productionUsage: "metadata_and_future_runtime_dependency",
    uiLocation: "Amplasare si clima / Zona eoliana",
    reportLocation: "Anexa climatica",
    uiRecommendation: "remain_editable",
    removalAssessment: "becomes_auto_resolved_when_normative_mapping_available",
    implementationRefs: [refs.climateZones, refs.resolver],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "climate.manual_override",
    path: "climate.manualOverride / form.climate_manual_override",
    purpose: "Marks professional override of automatic or explicit climate assignment.",
    category: "primitive_user_input",
    owner: "User/auditor through Building DNA Resolver",
    sourceOfTruth: "buildingDna.climate.manualOverride",
    producer: "UI",
    consumer: "Climate Provider validation, audit/report traceability",
    dataType: "boolean",
    editable: true,
    productionUsage: "validation_and_traceability",
    uiLocation: "Amplasare si clima / Suprascriere manuala",
    reportLocation: "Ipoteze si suprascrieri",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.climateProvider],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "climate.override_reason",
    path: "climate.overrideReason / form.climate_override_reason",
    purpose: "Required explanation when climate override is enabled.",
    category: "primitive_user_input",
    owner: "User/auditor through Building DNA Resolver",
    sourceOfTruth: "buildingDna.climate.overrideReason",
    producer: "UI",
    consumer: "Climate Provider validation, report",
    dataType: "string|null",
    editable: true,
    productionUsage: "required_when_manual_override_true",
    uiLocation: "Amplasare si clima / Motiv suprascriere",
    reportLocation: "Ipoteze si suprascrieri",
    dependencies: ["climate.manual_override"],
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.climateProvider],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "provider.climate_station",
    path: "climateProvider.selection.stationId",
    purpose: "Source-backed station resolved from locality/station selection.",
    category: "provider_resolved",
    owner: "Romanian Climate Provider",
    sourceOfTruth: "MC001/6-2013 locality-station registry",
    producer: "resolveRomanianNormativeClimateSelection",
    consumer: "monthly temperature/humidity/design-temperature provider lookups, notebook, report",
    dataType: "station id",
    providerGenerated: true,
    productionUsage: "source_backed_climate_dataset_key",
    uiLocation: "Resolved Climate Profile / Statie climatica",
    notebookLocation: "Date climatice",
    reportLocation: "Anexa climatica",
    dependencies: ["location.locality_id"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.climateProvider, refs.productionClimateRegistry],
    tests: [refs.climateProviderTest, refs.wizardTest]
  }),
  field({
    fieldId: "provider.monthly_exterior_temperature",
    path: "climateProvider.datasets.monthlyExteriorTemperature.monthlyRecords[*]",
    purpose: "Twelve monthly exterior temperatures used to build Building DNA monthly profiles.",
    category: "provider_resolved",
    owner: "Romanian Climate Provider",
    sourceOfTruth: "Mc001/6-2013 Tabel II.1",
    producer: "getRomanianNormativeMonthlyExteriorTemperature",
    consumer: "monthlyProfiles[*].transmission.*.outdoorTemperature and ventilation outdoorTemperature",
    dataType: "12 monthly degC records",
    providerGenerated: true,
    productionUsage: "drives_transmission_ventilation_QHnd_QCnd",
    notebookLocation: "Date climatice lunare",
    reportLocation: "Anexa climatica and monthly calculation notebook",
    dependencies: ["provider.climate_station"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.climateProvider, refs.resolver, refs.chapter2Adapter],
    tests: [refs.climateProviderTest, refs.wizardTest]
  }),
  field({
    fieldId: "provider.monthly_relative_humidity",
    path: "climateProvider.datasets.monthlyRelativeHumidity.monthlyRecords[*]",
    purpose: "Source-backed monthly relative humidity available for report/future hygrothermal or system branches.",
    category: "provider_resolved",
    owner: "Romanian Climate Provider",
    sourceOfTruth: "Mc001/6-2013 Tabel II.2",
    producer: "getRomanianNormativeMonthlyRelativeHumidity",
    consumer: "climate appendix, future runtime branches",
    dataType: "12 monthly percent records",
    providerGenerated: true,
    productionUsage: "available_not_currently_core_chapter2_useful_demand_driver",
    notebookLocation: "Date climatice",
    reportLocation: "Anexa climatica",
    dependencies: ["provider.climate_station"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.climateProvider, refs.technicalReport],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "provider.winter_design_temperature",
    path: "climateProvider.datasets.winterDesignDayTemperature",
    purpose: "Source-backed winter design day temperature by station.",
    category: "provider_resolved",
    owner: "Romanian Climate Provider",
    sourceOfTruth: "Mc001/6-2013 winter design tables",
    producer: "getRomanianNormativeWinterDesignDayTemperature",
    consumer: "climate appendix and future design branches",
    dataType: "degC record plus hourly profile",
    providerGenerated: true,
    productionUsage: "source_backed_design_metadata_current_runtime_reported",
    notebookLocation: "Date climatice",
    reportLocation: "Anexa climatica",
    dependencies: ["provider.climate_station"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.climateProvider, refs.technicalReport],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "provider.summer_design_temperature",
    path: "climateProvider.datasets.summerDesignDayTemperature",
    purpose: "Source-backed summer design day temperature by station.",
    category: "provider_resolved",
    owner: "Romanian Climate Provider",
    sourceOfTruth: "Mc001/6-2013 summer design tables",
    producer: "getRomanianNormativeSummerDesignDayTemperature",
    consumer: "climate appendix and future cooling design branches",
    dataType: "degC record plus hourly profile",
    providerGenerated: true,
    productionUsage: "source_backed_design_metadata_current_runtime_reported",
    notebookLocation: "Date climatice",
    reportLocation: "Anexa climatica",
    dependencies: ["provider.climate_station"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.climateProvider, refs.technicalReport],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "provider.monthly_solar_irradiation_source_rows",
    path: "climateProvider.datasets.monthlySolarIrradiation",
    purpose: "Annex A.9.6 monthly irradiance source rows; not yet preprocessed into Qsol.",
    category: "provider_resolved",
    owner: "Romanian Climate Provider",
    sourceOfTruth: "Mc001/1-2-3/2006 Anexa A.9.6",
    producer: "getRomanianNormativeMonthlySolarIrradiance",
    consumer: "notebook/report provenance; future solar preprocessing",
    dataType: "12 monthly irradiance rows where locality covered",
    providerGenerated: true,
    productionUsage: "source_dataset_available_Qsol_preprocessing_bounded",
    notebookLocation: "Date climatice",
    reportLocation: "Anexa climatica",
    dependencies: ["provider.climate_station", "location.locality_id"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.climateProvider, refs.technicalReport],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "provider.production_climate_profile",
    path: "productionClimateProfile",
    purpose: "Complete production climate profile view with available fields and bounded gaps.",
    category: "provider_resolved",
    owner: "Romanian Production Climate Registry",
    sourceOfTruth: "Climate Provider plus bounded dependency registry",
    producer: "resolveRomanianProductionClimateProfile",
    consumer: "notebook, report, diagnostics",
    dataType: "structured profile object",
    providerGenerated: true,
    productionUsage: "transparent_climate_profile_for_production",
    uiLocation: "Resolved Climate Profile",
    notebookLocation: "Climate appendix",
    reportLocation: "Climate appendix",
    dependencies: ["provider.climate_station", "climate.zone", "climate.wind_zone"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.productionClimateRegistry, refs.technicalReport],
    tests: [refs.climateProviderTest]
  }),
  field({
    fieldId: "geometry.useful_floor_area",
    path: "geometry.usefulFloorAreaM2 / buildingSpecificParameters.usefulFloorAreaM2 / form.useful_area_m2",
    purpose: "Useful/heated floor area used as explicit geometry and as a seed for roof/ground areas when missing.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.geometry.usefulFloorAreaM2 and buildingSpecificParameters.usefulFloorAreaM2",
    producer: "UI",
    consumer: "geometryOverridesFromBuildingSpecificParameters, internal gains Table 2.15, report",
    dataType: "positive number m2",
    editable: true,
    productionUsage: "geometry_seed_and_internal_gains_area",
    uiLocation: "Geometrie / Suprafata incalzita/utila",
    notebookLocation: "Geometrie",
    reportLocation: "Geometria cladirii",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.propagationTest],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "geometry.number_of_floors",
    path: "buildingSpecificParameters.numberOfFloors / form.number_of_floors",
    purpose: "Descriptive heated floor count for geometry traceability.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.buildingSpecificParameters.numberOfFloors",
    producer: "UI",
    consumer: "report/notebook; future generic geometry derivation",
    dataType: "positive integer/count",
    editable: true,
    productionUsage: "currently_traceability_metadata_not_direct_engine_driver",
    uiLocation: "Geometrie / Numar niveluri",
    uiRecommendation: "remain_editable",
    removalAssessment: "retain_but_mark_non_direct_effect_until_geometry_generator_uses_it",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "geometry.average_room_height",
    path: "buildingSpecificParameters.averageRoomHeightM / form.floor_height_m",
    purpose: "Mean storey height for entered geometry context.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.buildingSpecificParameters.averageRoomHeightM",
    producer: "UI",
    consumer: "report/notebook; future derived volume if explicit volume absent",
    dataType: "positive number m",
    editable: true,
    productionUsage: "currently_traceability_metadata_not_direct_engine_driver_when_volume_entered",
    uiLocation: "Geometrie / Inaltime medie nivel",
    uiRecommendation: "remain_editable",
    removalAssessment: "retain_as_future_volume_derivation_input",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "geometry.heated_volume",
    path: "buildingSpecificParameters.heatedVolumeM3 / form.heated_volume_m3",
    purpose: "Heated air volume; with ACH it derives monthly ventilation airflow.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.buildingSpecificParameters.heatedVolumeM3",
    producer: "UI",
    consumer: "deriveVentilationAirFlowRateM3PerS",
    dataType: "positive number m3",
    editable: true,
    productionUsage: "affects_ventilation_Qve_when_ventilation_ach_present",
    uiLocation: "Geometrie / Volum incalzit",
    notebookLocation: "Ventilatie",
    reportLocation: "Geometria cladirii",
    dependencies: ["ventilation.ach"],
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.chapter2Adapter],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "geometry.exterior_wall_area",
    path: "geometry.exteriorWallAreaM2 / envelopeElements[exterior-walls].area / form.exterior_wall_area_m2",
    purpose: "Explicit exterior wall area used in direct transmission coefficient.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.envelopeElements[exterior-walls].area",
    producer: "UI then makeEnvelopeElements",
    consumer: "buildEnvelopeTransmissionPhysicsInput",
    dataType: "positive number m2",
    editable: true,
    derived: true,
    productionUsage: "affects_Hd_Htr_Qtr_QHnd",
    uiLocation: "Geometrie / Arie pereti exteriori",
    notebookLocation: "Anvelopa",
    reportLocation: "Elemente de anvelopa",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.chapter2Adapter],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "geometry.roof_area",
    path: "geometry.roofAreaM2 / envelopeElements[roof].area / form.roof_area_m2",
    purpose: "Explicit roof or upper-slab area used in direct transmission coefficient.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.envelopeElements[roof].area",
    producer: "UI then makeEnvelopeElements",
    consumer: "buildEnvelopeTransmissionPhysicsInput",
    dataType: "positive number m2",
    editable: true,
    derived: true,
    productionUsage: "affects_Hd_Htr_Qtr_QHnd",
    uiLocation: "Geometrie / Arie acoperis",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.chapter2Adapter],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "geometry.ground_floor_area",
    path: "geometry.groundFloorAreaM2 / envelopeElements[ground-floor].area / form.ground_floor_area_m2",
    purpose: "Explicit lower-floor area used for ground/unheated/adjacent boundary transfer.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.envelopeElements[ground-floor].area",
    producer: "UI then makeEnvelopeElements",
    consumer: "buildEnvelopeTransmissionPhysicsInput",
    dataType: "positive number m2",
    editable: true,
    derived: true,
    productionUsage: "affects_Hg_or_boundary_component_Htr",
    uiLocation: "Geometrie / Arie planseu inferior",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.chapter2Adapter],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "geometry.attic_ceiling_area",
    path: "geometry.atticCeilingAreaM2 / envelopeElements[attic-ceiling].area / form.attic_ceiling_area_m2",
    purpose: "Explicit ceiling area toward attic/upper unheated space.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.envelopeElements[attic-ceiling].area",
    producer: "UI then makeEnvelopeElements",
    consumer: "buildEnvelopeTransmissionPhysicsInput",
    dataType: "positive number m2",
    editable: true,
    derived: true,
    productionUsage: "affects_Hu_or_Hd_boundary_component",
    uiLocation: "Geometrie / Arie planseu spre pod",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.chapter2Adapter],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "geometry.window_area",
    path: "geometry.windowAreaM2 / envelopeElements[windows].area / form.window_area_m2",
    purpose: "Transparent-envelope area used for transmission and, when solar profile available, orientation gains.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.envelopeElements[windows].area",
    producer: "UI then makeEnvelopeElements",
    consumer: "buildEnvelopeTransmissionPhysicsInput, solar-gain profile conversion when available",
    dataType: "positive number m2",
    editable: true,
    derived: true,
    productionUsage: "affects_Hd_Htr_and_solar_gain_paths_when_available",
    uiLocation: "Anvelopa / Arie vitrata",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.chapter2Adapter],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "geometry.door_area",
    path: "geometry.doorAreaM2 / envelopeElements[front-door].area / form.door_area_m2",
    purpose: "Exterior door area used in direct transmission.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.envelopeElements[front-door].area",
    producer: "UI then makeEnvelopeElements",
    consumer: "buildEnvelopeTransmissionPhysicsInput",
    dataType: "positive number m2",
    editable: true,
    derived: true,
    productionUsage: "affects_Hd_Htr_Qtr",
    uiLocation: "Anvelopa / Arie usi exterioare",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.chapter2Adapter],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "geometry.adjacent_wall_area",
    path: "geometry.adjacentWallAreaM2 / envelopeElements[adjacent-wall].area / form.adjacent_wall_area_m2",
    purpose: "Area toward adjacent heated space represented with explicit boundary correction.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.envelopeElements[adjacent-wall].area",
    producer: "UI then makeEnvelopeElements",
    consumer: "buildEnvelopeTransmissionPhysicsInput",
    dataType: "non-negative number m2",
    editable: true,
    derived: true,
    productionUsage: "affects_boundary_corrected_transmission_when_positive",
    uiLocation: "Geometrie / Arie spre spatiu adiacent",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "orientation.main",
    path: "buildingSpecificParameters.mainOrientation / form.main_orientation",
    purpose: "Main building orientation; used as fallback for solar orientation when explicit window orientation is unknown.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.buildingSpecificParameters.mainOrientation",
    producer: "UI",
    consumer: "climateProfileToBuildingMonthlyProfiles for legacy explicit profiles; report",
    dataType: "enum north|east|south|west|mixed|unknown",
    editable: true,
    productionUsage: "solar_orientation_fallback_when_profile_supports_orientation_gains",
    uiLocation: "Geometrie / Orientare principala",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "orientation.window",
    path: "buildingSpecificParameters.windowOrientation / monthlyProfiles[*].heatGains.solarOrientation / form.window_orientation",
    purpose: "Primary window orientation for solar-gain profile selection where source profile supports orientation gains.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.buildingSpecificParameters.windowOrientation",
    producer: "UI",
    consumer: "monthly profile solar-gain conversion; report",
    dataType: "enum north|east|south|west|mixed|unknown",
    editable: true,
    productionUsage: "affects_QHgn_QHnd_QCnd_when_Qsol_preprocessed_or_explicit_profile_available",
    uiLocation: "Anvelopa / Orientare principala ferestre",
    dependencies: ["provider.monthly_solar_irradiation_source_rows"],
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "envelope.structural_system",
    path: "building.structuralSystem / form.structural_system",
    purpose: "Structural family influencing typology/catalogue selection.",
    category: "primitive_user_input",
    owner: "User and Building Typology Engine",
    sourceOfTruth: "buildingDna.building.structuralSystem",
    producer: "UI or structuralSystemFromWallMaterial fallback",
    consumer: "typology proposal, report",
    dataType: "enum",
    editable: true,
    productionUsage: "affects_assembly_selection",
    uiLocation: "Anvelopa / Sistem structural",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, "src/building-platform/buildingTypologyEngine.mjs"],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "envelope.wall_material",
    path: "wallMaterial answer -> typologyProposal.assemblySelections.exteriorWall / form.wall_material",
    purpose: "Existing wall material category used to resolve exterior-wall assembly.",
    category: "primitive_user_input",
    owner: "User and Building Typology Engine",
    sourceOfTruth: "assisted answer wallMaterial plus resolved Building DNA assembly",
    producer: "UI",
    consumer: "buildingTypologyEngine, assembly catalogue",
    dataType: "enum",
    editable: true,
    productionUsage: "affects_layers_R_U_Hd_Htr",
    uiLocation: "Anvelopa / Material pereti exteriori",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "envelope.roof_type",
    path: "context.attic / form.roof_type",
    purpose: "Boundary context for roof/attic and typology assumptions.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "answers.context.attic then envelopeElements[attic-ceiling].boundaryType",
    producer: "UI",
    consumer: "boundaryContextFromAssistedContext, makeEnvelopeElements",
    dataType: "enum",
    editable: true,
    productionUsage: "affects_boundary_type_and_correction",
    uiLocation: "Anvelopa / Tip pod/acoperis",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "envelope.floor_type",
    path: "context.basement / form.floor_type",
    purpose: "Boundary context for lower floor.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "answers.context.basement then envelopeElements[ground-floor].boundaryType",
    producer: "UI",
    consumer: "boundaryContextFromAssistedContext, makeEnvelopeElements",
    dataType: "enum",
    editable: true,
    productionUsage: "affects_boundary_type_and_correction",
    uiLocation: "Anvelopa / Limita inferioara",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "envelope.window_type",
    path: "typologyProposal.assemblySelections.window / form.window_type",
    purpose: "Window assembly selection.",
    category: "primitive_user_input",
    owner: "User and Building Typology Engine",
    sourceOfTruth: "resolved Building DNA window assembly",
    producer: "UI",
    consumer: "assembly catalogue and Chapter 2 adapter",
    dataType: "enum",
    editable: true,
    productionUsage: "affects_window_U_Hd_Htr",
    uiLocation: "Anvelopa / Tip ferestre",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "ventilation.type",
    path: "buildingSpecificParameters.ventilationType / form.ventilation_type",
    purpose: "Ventilation system descriptor for Building DNA traceability.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.buildingSpecificParameters.ventilationType",
    producer: "UI",
    consumer: "report; future ventilation branch selection",
    dataType: "enum",
    editable: true,
    productionUsage: "currently_metadata_unless_ach_and_volume_are_present",
    uiLocation: "Anvelopa / Ventilatie",
    uiRecommendation: "remain_editable",
    removalAssessment: "retain_but_distinguish_from_active_airflow_input",
    implementationRefs: [refs.wizard, refs.resolver],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "ventilation.ach",
    path: "buildingSpecificParameters.ventilationAch / form.ventilation_ach",
    purpose: "Air changes per hour used with heated volume to derive ventilation airflow.",
    category: "primitive_user_input",
    owner: "User through Building DNA Resolver",
    sourceOfTruth: "buildingDna.buildingSpecificParameters.ventilationAch",
    producer: "UI",
    consumer: "deriveVentilationAirFlowRateM3PerS",
    dataType: "positive number 1/h",
    editable: true,
    productionUsage: "affects_Qve_when_heated_volume_present",
    uiLocation: "Anvelopa / Schimburi aer estimate",
    dependencies: ["geometry.heated_volume"],
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, refs.chapter2Adapter],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "derived.ventilation_airflow",
    path: "monthlyProfiles[*].ventilation.*.airFlowRate",
    purpose: "Derived ventilation airflow inserted into each monthly profile.",
    category: "derived_engineering_value",
    owner: "Building DNA Resolver",
    sourceOfTruth: "monthlyProfilesWithGeometryVentilation",
    producer: "deriveVentilationAirFlowRateM3PerS",
    consumer: "buildChapter2UsefulDemandPhysicsInput",
    dataType: "m3/s quantity",
    derived: true,
    productionUsage: "direct_input_to_Hve_Qve",
    notebookLocation: "Ventilation calculations",
    reportLocation: "Monthly calculation table",
    dependencies: ["geometry.heated_volume", "ventilation.ach"],
    uiRecommendation: "calculated",
    implementationRefs: [refs.resolver, refs.chapter2Adapter],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "derived.monthly_profiles",
    path: "monthlyProfiles[*]",
    purpose: "Twelve normalized monthly calculation inputs for transmission, ventilation, gains and utilization dependencies.",
    category: "derived_engineering_value",
    owner: "Building DNA Resolver",
    sourceOfTruth: "buildingDna.monthlyProfiles",
    producer: "resolveMonthlyProfileSelection and makeMonthlyProfile",
    consumer: "Chapter 2 adapter and technical report",
    dataType: "12 ordered monthly records",
    derived: true,
    productionUsage: "primary_monthly_runtime_input",
    notebookLocation: "Monthly calculation notebook",
    reportLocation: "Monthly table",
    dependencies: ["provider.monthly_exterior_temperature", "ventilation.ach", "geometry.heated_volume"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.resolver, refs.chapter2Adapter, refs.technicalReport],
    tests: [refs.wizardTest, refs.backendTest]
  }),
  field({
    fieldId: "derived.internal_gains_table_2_15",
    path: "monthlyProfiles[*].heatGains.internalGains / monthlyProfiles[*].heatGains.internalGainsExecutionTrace",
    purpose: "Monthly internal heat gains derived from MC001 Tabel 2.15 category intensity, useful floor area and calendar hours.",
    category: "derived_engineering_value",
    owner: "Building DNA Resolver with Physics Engine source-formula helper",
    sourceOfTruth: "buildingDna.monthlyProfiles[*].heatGains.internalGains",
    producer: "monthlyInternalGainsFromTable2_15",
    consumer: "buildChapter2UsefulDemandPhysicsInput, monthly heat-gains runtime, technical report",
    dataType: "kWh monthly quantity with provenance and execution trace",
    derived: true,
    productionUsage: "source_backed_internal_gains_for_supported_Table_2_15_categories",
    notebookLocation: "Aporturi interne lunare",
    reportLocation: "Caiet de calcule ingineresti",
    dependencies: [
      "building.identity.use_category",
      "geometry.useful_floor_area",
      "derived.monthly_profiles"
    ],
    uiRecommendation: "read_only",
    implementationRefs: [
      "src/physics-engine/mc001InternalGainsCalculation.mjs",
      refs.resolver,
      refs.chapter2Adapter,
      refs.technicalReport
    ],
    tests: [
      "src/physics-engine/tests/mc001InternalGainsCalculation.test.mjs",
      "src/building-platform/tests/buildingDnaResolver.test.mjs",
      "src/building-platform/tests/buildingTechnicalReport.test.mjs"
    ]
  }),
  field({
    fieldId: "derived.envelope_elements",
    path: "envelopeElements[*]",
    purpose: "Canonical envelope element inventory with role, boundary and area.",
    category: "derived_engineering_value",
    owner: "Building DNA Resolver",
    sourceOfTruth: "buildingDna.envelopeElements",
    producer: "makeEnvelopeElements",
    consumer: "buildEnvelopeTransmissionPhysicsInput",
    dataType: "array of envelope element objects",
    derived: true,
    productionUsage: "primary_envelope_transmission_input",
    notebookLocation: "Envelope table",
    reportLocation: "Elemente de anvelopa",
    dependencies: [
      "geometry.exterior_wall_area",
      "geometry.roof_area",
      "geometry.ground_floor_area",
      "geometry.attic_ceiling_area",
      "geometry.window_area",
      "geometry.door_area",
      "envelope.roof_type",
      "envelope.floor_type"
    ],
    uiRecommendation: "calculated",
    implementationRefs: [refs.resolver, refs.chapter2Adapter],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "provider.assembly_catalogue_selection",
    path: "assemblies[*]",
    purpose: "Catalogue-resolved assembly stack for each envelope role.",
    category: "provider_resolved",
    owner: "Building Platform Catalogue and Typology Engine",
    sourceOfTruth: "catalogue entries copied into Building DNA",
    producer: "buildAssemblies",
    consumer: "buildEnvelopeAssemblyPhysicsInput",
    dataType: "array of assembly objects",
    providerGenerated: true,
    productionUsage: "material_layer_input_to_R_U_calculation",
    notebookLocation: "Materials and layer stacks",
    reportLocation: "Materiale si straturi",
    dependencies: ["envelope.wall_material", "envelope.window_type", "renovation.wall_insulation"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.resolver, refs.chapter2Adapter, "src/building-platform/buildingPlatformCatalog.mjs"],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "derived.thermal_bridges",
    path: "thermalBridges[*]",
    purpose: "Explicit linear thermal bridge inventory currently seeded by resolver boundary context.",
    category: "derived_engineering_value",
    owner: "Building DNA Resolver",
    sourceOfTruth: "buildingDna.thermalBridges",
    producer: "makeThermalBridges",
    consumer: "buildEnvelopeTransmissionPhysicsInput",
    dataType: "array of bridge quantities",
    derived: true,
    productionUsage: "affects_Hd_Htr",
    notebookLocation: "Envelope calculations",
    reportLocation: "Punti termice",
    uiRecommendation: "calculated",
    removalAssessment: "future_milestone_should_make_bridge_inventory_explicit_or_provider_backed",
    implementationRefs: [refs.resolver, refs.chapter2Adapter],
    tests: [refs.backendTest]
  }),
  field({
    fieldId: "renovation.wall_insulation",
    path: "renovationInterventions[*] and assembly layer thickness / form.wall_insulation",
    purpose: "Wall insulation intervention and thickness category affecting exterior wall assembly.",
    category: "primitive_user_input",
    owner: "User through Renovation Interventions and Typology Engine",
    sourceOfTruth: "buildingDna.renovationInterventions and assemblies[exterior_wall].layers",
    producer: "UI, resolveBuildingRenovationInterventions, buildingTypologyEngine",
    consumer: "assembly calculation, report",
    dataType: "enum plus derived thickness m",
    editable: true,
    productionUsage: "affects_R_U_Hd_Htr_QHnd",
    uiLocation: "Renovari / Izolatie pereti exteriori",
    dependencies: ["envelope.wall_material"],
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.resolver, "src/building-platform/buildingRenovationInterventions.mjs"],
    tests: [refs.propagationTest]
  }),
  field({
    fieldId: "renovation.window_replacement",
    path: "renovationInterventions[*] / form.windows_replaced",
    purpose: "Records whether window replacement is an engineering intervention.",
    category: "primitive_user_input",
    owner: "User through Renovation Interventions",
    sourceOfTruth: "buildingDna.renovationInterventions",
    producer: "UI",
    consumer: "report and Building DNA traceability",
    dataType: "enum yes|no|unknown",
    editable: true,
    productionUsage: "traceability; assembly effect is via window_type",
    uiLocation: "Renovari / Ferestre inlocuite",
    dependencies: ["envelope.window_type"],
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, "src/building-platform/buildingRenovationInterventions.mjs"],
    tests: ["src/building-platform/tests/buildingRenovationInterventions.test.mjs"]
  }),
  field({
    fieldId: "technical_systems.heating",
    path: "technicalSystems.heating.systems[].stages[] / chapter3_heating_*",
    purpose: "Explicit Chapter 3 heating system stages, losses, auxiliaries, recovered fractions and optional allocationFraction for multiple active systems.",
    category: "primitive_user_input",
    owner: "User through Technical Systems schema",
    sourceOfTruth: "buildingDna.technicalSystems.heating",
    producer: "buildTechnicalSystemsFromForm",
    consumer: "buildChapter3RuntimeInputFromBuildingDna",
    dataType: "system stage array, kWh/month, fractions and optional allocationFraction",
    editable: true,
    productionUsage: "drives_Chapter3_heating_system_energy; multiple active systems require explicit allocationFraction values summing to 1",
    uiLocation: "Instalatii tehnice / Incalzire",
    notebookLocation: "Chapter 3 heating sections",
    reportLocation: "Instalatii / Incalzire",
    dependencies: ["runtime.chapter2_monthly_useful_demand"],
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.chapter3Adapter],
    tests: [refs.chapter3ProductTest]
  }),
  field({
    fieldId: "technical_systems.cooling",
    path: "technicalSystems.cooling.systems[].stages[] / chapter3_cooling_*",
    purpose: "Explicit Chapter 3 cooling system stages, losses, auxiliaries, recovered fractions and optional allocationFraction for multiple active systems.",
    category: "primitive_user_input",
    owner: "User through Technical Systems schema",
    sourceOfTruth: "buildingDna.technicalSystems.cooling",
    producer: "buildTechnicalSystemsFromForm",
    consumer: "buildChapter3RuntimeInputFromBuildingDna",
    dataType: "system stage array, kWh/month, fractions and optional allocationFraction",
    editable: true,
    productionUsage: "drives_Chapter3_cooling_system_energy; multiple active systems require explicit allocationFraction values summing to 1",
    uiLocation: "Instalatii tehnice / Racire",
    notebookLocation: "Chapter 3 cooling sections",
    reportLocation: "Instalatii / Racire",
    dependencies: ["runtime.chapter2_monthly_useful_demand"],
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.chapter3Adapter],
    tests: [refs.chapter3ProductTest]
  }),
  field({
    fieldId: "technical_systems.ventilation_ahu",
    path: "technicalSystems.ventilationAhu.systems[] / chapter3_*airflow*",
    purpose: "Explicit AHU fan and auxiliary inputs for Chapter 3 ventilation system energy.",
    category: "primitive_user_input",
    owner: "User through Technical Systems schema",
    sourceOfTruth: "buildingDna.technicalSystems.ventilationAhu",
    producer: "buildTechnicalSystemsFromForm",
    consumer: "buildChapter3RuntimeInputFromBuildingDna",
    dataType: "airflow, pressure, efficiency, monthly auxiliaries",
    editable: true,
    productionUsage: "drives_Chapter3_AHU_auxiliary_energy",
    uiLocation: "Instalatii tehnice / Ventilatie si AHU",
    notebookLocation: "Chapter 3 ventilation sections",
    reportLocation: "Instalatii / Ventilatie si AHU",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.chapter3Adapter],
    tests: [refs.chapter3ProductTest]
  }),
  field({
    fieldId: "technical_systems.dhw",
    path: "technicalSystems.domesticHotWater / chapter3_dhw_*",
    purpose: "DHW useful demand, legacy explicit stage inputs, optional allocationFraction for multiple active DHW systems and P8C component contracts for distribution, pump auxiliary and storage losses.",
    category: "primitive_user_input",
    owner: "User through Technical Systems schema",
    sourceOfTruth: "buildingDna.technicalSystems.domesticHotWater",
    producer: "buildTechnicalSystemsFromForm",
    consumer: "buildChapter3RuntimeInputFromBuildingDna",
    dataType: "kWh/month, stage array, optional allocationFraction, lossCalculation and auxiliaryCalculation component contracts",
    editable: true,
    productionUsage: "drives_Chapter3_DHW_system_energy; multiple active systems require explicit allocationFraction values summing to 1; P8C component contracts calculate relations 3.200-3.228 when complete product/project inputs are supplied",
    uiLocation: "Instalatii tehnice / Apa calda de consum",
    notebookLocation: "Chapter 3 DHW sections",
    reportLocation: "Instalatii / ACM",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.chapter3Adapter],
    tests: [refs.chapter3ProductTest]
  }),
  field({
    fieldId: "technical_systems.pcm_storage",
    path: "technicalSystems.coolingStoragePcm.monthly[] / chapter3_pcm_*",
    purpose: "Explicit PCM storage monthly state and energy-limit inputs.",
    category: "primitive_user_input",
    owner: "User through Technical Systems schema",
    sourceOfTruth: "buildingDna.technicalSystems.coolingStoragePcm",
    producer: "buildTechnicalSystemsFromForm",
    consumer: "buildChapter3RuntimeInputFromBuildingDna",
    dataType: "monthly PCM scalar set",
    editable: true,
    productionUsage: "drives_PCM_relations_3_111_3_113_and_storage_chain",
    uiLocation: "Instalatii tehnice / Stocare PCM",
    notebookLocation: "Chapter 3 PCM sections",
    reportLocation: "Instalatii / Stocare PCM",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.chapter3Adapter],
    tests: [refs.chapter3ProductTest]
  }),
  field({
    fieldId: "technical_systems.lighting_boundary",
    path: "technicalSystems.lighting / chapter3_lighting_*",
    purpose: "Explicit LENI/monthly lighting boundary consumed by MC001 Chapter 3 aggregation without claiming SR EN 15193-1 engine coverage.",
    category: "primitive_user_input",
    owner: "User through Technical Systems schema",
    sourceOfTruth: "buildingDna.technicalSystems.lighting",
    producer: "buildTechnicalSystemsFromForm",
    consumer: "buildChapter3RuntimeInputFromBuildingDna",
    dataType: "12 monthly kWh and LENI subspace values",
    editable: true,
    productionUsage: "explicit_input_boundary_only_SR_EN_15193_1_pending",
    uiLocation: "Instalatii tehnice / Iluminat LENI explicit",
    notebookLocation: "Chapter 3 lighting boundary",
    reportLocation: "Instalatii / Iluminat",
    uiRecommendation: "remain_editable",
    implementationRefs: [refs.wizard, refs.chapter3Adapter],
    tests: [refs.chapter3ProductTest]
  }),
  field({
    fieldId: "runtime.assembly_u_values",
    path: "calculation.assemblyResult.assemblyResults[*].uValue",
    purpose: "U-values and layer resistances calculated by Chapter 2 envelope assembly runtime.",
    category: "physics_runtime_state",
    owner: "Physics Engine",
    sourceOfTruth: "calculateMc001EnvelopeAssemblyUValueExplicit output",
    producer: "Physics Engine",
    consumer: "envelope transmission runtime, notebook, report",
    dataType: "W/(m2*K) and m2K/W",
    persisted: false,
    runtimeOnly: true,
    productionUsage: "intermediate_traceable_engine_result",
    notebookLocation: "Materials/R/U calculations",
    reportLocation: "Rezistente termice and coeficienti U",
    dependencies: ["provider.assembly_catalogue_selection"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.chapter2Adapter, "src/physics-engine/mc001EnvelopePhysicsCalculation.mjs"],
    tests: ["src/physics-engine/tests/mc001EnvelopePhysicsCalculation.test.mjs", refs.backendTest]
  }),
  field({
    fieldId: "runtime.hd_hg_hu_ha_htr",
    path: "calculation.envelopeTransmissionResult.components/result",
    purpose: "Transmission coefficients by component and total Htr.",
    category: "physics_runtime_state",
    owner: "Physics Engine",
    sourceOfTruth: "calculateMc001EnvelopeTransmissionCoefficientExplicit output",
    producer: "Physics Engine",
    consumer: "monthly transmission runtime, notebook, report, analysis summary",
    dataType: "W/K quantities",
    persisted: false,
    runtimeOnly: true,
    productionUsage: "core_Chapter2_transfer_runtime_state",
    notebookLocation: "Htr traceability",
    reportLocation: "Coeficienti transfer termic",
    dependencies: ["derived.envelope_elements", "runtime.assembly_u_values", "derived.thermal_bridges"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.chapter2Adapter, "src/physics-engine/mc001EnvelopePhysicsCalculation.mjs"],
    tests: ["src/physics-engine/tests/mc001EnvelopePhysicsCalculation.test.mjs", refs.propagationTest]
  }),
  field({
    fieldId: "runtime.chapter2_monthly_useful_demand",
    path: "calculation.chapter2Result.result.monthlyResults[*]",
    purpose: "Monthly Qtr, Qve, gains, utilization factors, QHnd and QCnd.",
    category: "physics_runtime_state",
    owner: "Physics Engine",
    sourceOfTruth: "calculateMc001Chapter2UsefulDemandExplicit output",
    producer: "Physics Engine",
    consumer: "Chapter 3 adapter, report, persistence, UI result summary",
    dataType: "12 monthly runtime result records",
    persisted: false,
    runtimeOnly: true,
    productionUsage: "core_Chapter2_output_and_Chapter3_input",
    notebookLocation: "Chapter 2 calculation notebook",
    reportLocation: "Monthly QHnd/QCnd table",
    dependencies: ["derived.monthly_profiles", "runtime.hd_hg_hu_ha_htr"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.chapter2Adapter, "src/physics-engine/mc001Chapter2UsefulDemandCalculation.mjs"],
    tests: ["src/physics-engine/tests/mc001Chapter2UsefulDemandCalculation.test.mjs", refs.wizardTest]
  }),
  field({
    fieldId: "runtime.chapter3_installation_energy",
    path: "calculation.chapter3Result",
    purpose: "Chapter 3 monthly and annual installation energy chains when technical systems are active.",
    category: "physics_runtime_state",
    owner: "Physics Engine",
    sourceOfTruth: "calculateMc001Chapter3IntegratedRuntime output",
    producer: "Chapter 3 adapter and Physics Engine",
    consumer: "notebook, report, analysis version output",
    dataType: "monthly/annual system-energy result",
    persisted: false,
    runtimeOnly: true,
    productionUsage: "active_only_when_technicalSystems_enabled",
    notebookLocation: "Chapter 3 installation sections",
    reportLocation: "Instalatii Chapter 3",
    dependencies: [
      "technical_systems.heating",
      "technical_systems.cooling",
      "technical_systems.ventilation_ahu",
      "technical_systems.dhw",
      "technical_systems.pcm_storage",
      "technical_systems.lighting_boundary",
      "runtime.chapter2_monthly_useful_demand"
    ],
    uiRecommendation: "read_only",
    implementationRefs: [refs.chapter3Adapter, "src/physics-engine/mc001Chapter3IntegratedRuntime.mjs"],
    tests: [refs.chapter3ProductTest, "src/physics-engine/tests/mc001Chapter3IntegratedRuntime.test.mjs"]
  }),
  field({
    fieldId: "output.annual_qhnd_qcnd",
    path: "analysisVersion.annual_qhnd/annual_qcnd and report.mainResults",
    purpose: "Annual useful heating and cooling demand from Chapter 2.",
    category: "output",
    owner: "Physics Engine output persisted by Versioned Backend",
    sourceOfTruth: "building_platform_analysis_versions annual_qhnd/annual_qcnd",
    producer: "calculateMc001Chapter2UsefulDemandExplicit",
    consumer: "UI summary, report first page, project list",
    dataType: "kWh/year numbers",
    productionUsage: "primary_product_result",
    uiLocation: "Results summary",
    notebookLocation: "Annual totals",
    reportLocation: "Rezultate principale",
    dependencies: ["runtime.chapter2_monthly_useful_demand"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.versionedBackend, refs.technicalReport],
    tests: [refs.backendTest, refs.wizardTest]
  }),
  field({
    fieldId: "output.chapter3_annual_summary",
    path: "analysisVersion.complete_engine_output.chapter3Result.annual",
    purpose: "Annual installation-stage and service-energy summary.",
    category: "output",
    owner: "Physics Engine output persisted by Versioned Backend",
    sourceOfTruth: "building_platform_analysis_versions.complete_engine_output_json",
    producer: "calculateMc001Chapter3IntegratedRuntime",
    consumer: "UI, notebook, report",
    dataType: "annual service summary object",
    productionUsage: "primary_installation_result_when_available",
    uiLocation: "Instalatii / Results",
    notebookLocation: "Chapter 3 annual totals",
    reportLocation: "Annual installation summary",
    dependencies: ["runtime.chapter3_installation_energy"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.versionedBackend, refs.technicalReport],
    tests: [refs.chapter3ProductTest]
  }),
  field({
    fieldId: "output.report_model",
    path: "building_platform_report_versions.structured_report_model_json",
    purpose: "Structured technical report model generated from Building DNA and engine outputs.",
    category: "output",
    owner: "Technical Report Builder",
    sourceOfTruth: "building_platform_report_versions.structured_report_model_json",
    producer: "buildBuildingTechnicalWorkspace",
    consumer: "browser rendering, print/PDF, reopen",
    dataType: "structured JSON",
    productionUsage: "authoritative_report_data_not_rendered_html_only",
    reportOnly: true,
    reportLocation: "All technical report chapters",
    dependencies: ["output.annual_qhnd_qcnd", "runtime.chapter3_installation_energy", "provider.production_climate_profile"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.technicalReport, refs.versionedBackend],
    tests: ["src/building-platform/tests/buildingTechnicalReport.test.mjs", refs.backendTest]
  }),
  field({
    fieldId: "output.fingerprints",
    path: "buildingDnaFingerprint / calculationFingerprint / reportFingerprint",
    purpose: "Deterministic fingerprints for immutable version graph integrity.",
    category: "output",
    owner: "Versioned Building Backend",
    sourceOfTruth: "buildingPlatformFingerprints.mjs",
    producer: "buildBuildingPlatformVersionMetadata",
    consumer: "versioned backend, idempotency, report parity",
    dataType: "stable string fingerprints",
    productionUsage: "persistence_integrity_and_duplicate_protection",
    uiLocation: "Advanced diagnostics",
    reportLocation: "Technical appendix",
    dependencies: ["derived.monthly_profiles", "technical_systems.heating", "provider.production_climate_profile"],
    uiRecommendation: "read_only",
    implementationRefs: [refs.fingerprints, refs.versionedBackend],
    tests: [refs.backendTest]
  }),
  field({
    fieldId: "legacy.climate_profile_id",
    path: "form.climate_profile_id / buildingDna.climateProfile",
    purpose: "Legacy/demo explicit climate profile compatibility path; no visible production selector.",
    category: "legacy",
    owner: "Legacy compatibility boundary",
    sourceOfTruth: "hidden compatibility input or legacy saved Building DNA",
    producer: "demo fixture or legacy load",
    consumer: "resolveClimateProfileSelection only when demo or no station-backed locality exists",
    dataType: "string profile id",
    editable: false,
    deprecated: true,
    legacy: true,
    productionUsage: "demo_and_compatibility_only_not_primary_climate_path",
    uiLocation: "hidden input",
    dependencies: ["location.locality_id"],
    uiRecommendation: "hidden",
    removalAssessment: "remove_after_legacy_demo_compatibility_replaced_by_provider_or_certified_dataset",
    implementationRefs: [refs.wizard, refs.resolver, "src/climate-platform/romanianClimateProfiles.mjs"],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "legacy.synthetic_demo_profile",
    path: "climateProfile.sourceType=synthetic_demo_profile",
    purpose: "Test/demo climate profile kept out of normal production calculations.",
    category: "legacy",
    owner: "Demo fixture boundary",
    sourceOfTruth: "romanianClimateProfiles.mjs explicit demo profile",
    producer: "demo fixture loader",
    consumer: "resolver only with explicit demo permission",
    dataType: "climate profile object",
    editable: true,
    deprecated: true,
    legacy: true,
    productionUsage: "demo_only",
    uiLocation: "Demo controls",
    uiRecommendation: "hidden",
    removalAssessment: "retain_for_demo_tests_only_never_as_production_default",
    implementationRefs: ["src/climate-platform/romanianClimateProfiles.mjs", refs.wizard],
    tests: [refs.wizardTest, "src/climate-platform/tests/romanianClimateProfiles.test.mjs"]
  }),
  field({
    fieldId: "legacy.length_width_geometry_inputs",
    path: "form.building_length_m / form.building_width_m",
    purpose: "Approximate dimensions removed from the production form because they were not consumed by Building DNA resolver.",
    category: "legacy",
    owner: "Legacy/simplified UI compatibility",
    sourceOfTruth: "none in production UI; historical payloads only",
    producer: "none in production UI",
    consumer: "none in current production Building DNA",
    dataType: "number",
    editable: false,
    persisted: false,
    deprecated: true,
    legacy: true,
    productionUsage: "removed_from_production_ui_no_runtime_effect",
    uiRecommendation: "hidden",
    removalAssessment: "removed_in_P6B; future geometry generator must reintroduce this through the architecture baseline first",
    implementationRefs: [refs.calculatorPage, refs.wizard],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "legacy.thermal_mass_class_ui",
    path: "form.thermal_mass_class",
    purpose: "Thermal-mass selector removed from the production form because it was not mapped into utilization dependencies.",
    category: "legacy",
    owner: "Legacy/simplified UI compatibility",
    sourceOfTruth: "none in production UI; historical payloads only",
    producer: "none in production UI",
    consumer: "none in current production Building DNA",
    dataType: "enum",
    editable: false,
    persisted: false,
    deprecated: true,
    legacy: true,
    productionUsage: "removed_from_production_ui_no_runtime_effect",
    uiRecommendation: "hidden",
    removalAssessment: "removed_in_P6B; reintroduce only after source-backed mapping to Table 2.19/2.20 is implemented",
    implementationRefs: [refs.calculatorPage],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "legacy.unused_envelope_detail_inputs",
    path: "form.wall_thickness / wall_insulation_year / roof_insulation_thickness_cm / floor_insulation_thickness_cm / window_age_years / door_replaced",
    purpose: "Detail inputs removed from the production form because they were not mapped into canonical assemblies/interventions.",
    category: "legacy",
    owner: "Legacy/simplified UI compatibility",
    sourceOfTruth: "legacy payloads only unless future resolver consumes them",
    producer: "none in production UI",
    consumer: "legacy Worker compatibility only",
    dataType: "mixed numbers/enums",
    editable: false,
    persisted: false,
    deprecated: true,
    legacy: true,
    productionUsage: "removed_from_production_ui_legacy_payload_compatibility_only",
    uiRecommendation: "hidden",
    removalAssessment: "removed_in_P6B; reintroduce only as explicit intervention/catalogue semantics",
    implementationRefs: [refs.calculatorPage, refs.workers],
    tests: [refs.wizardTest]
  }),
  field({
    fieldId: "legacy.old_persistence_tables",
    path: "houses / analyses / analysis_answers / reports / report_snapshots",
    purpose: "Legacy persistence retained for compatibility and controlled migration only.",
    category: "legacy",
    owner: "Legacy migration boundary",
    sourceOfTruth: "existing database rows before canonical migration",
    producer: "legacy endpoints",
    consumer: "legacy compatibility routes and migration inspection",
    dataType: "database tables",
    editable: false,
    deprecated: true,
    legacy: true,
    productionUsage: "compatibility_only_not_canonical_new_write_path",
    uiRecommendation: "hidden",
    removalAssessment: "remove_only_after_compatibility_migration_and_reopen_parity_are_proven",
    implementationRefs: [refs.persistenceInventory, refs.legacyMigration, refs.workers],
    tests: ["src/building-platform/tests/legacyBuildingPlatformMigration.test.mjs"]
  })
];

const dependencyGraph = Object.freeze({
  nodes: Object.freeze([
    "ui",
    "local_project_session",
    "primitive_inputs",
    "providers",
    "building_dna",
    "chapter2_adapter",
    "chapter2_physics",
    "chapter3_adapter",
    "chapter3_physics",
    "engineering_runtime",
    "technical_report",
    "versioned_persistence",
    "reopen_payload"
  ]),
  edges: Object.freeze([
    { from: "ui", to: "local_project_session", owner: "Browser session", issue: "none" },
    { from: "local_project_session", to: "primitive_inputs", owner: "UI mapper", issue: "none" },
    { from: "primitive_inputs", to: "providers", owner: "Building DNA Resolver", issue: "none" },
    { from: "providers", to: "building_dna", owner: "Building DNA Resolver", issue: "none" },
    { from: "primitive_inputs", to: "building_dna", owner: "Building DNA Resolver", issue: "none" },
    { from: "building_dna", to: "chapter2_adapter", owner: "Chapter 2 Adapter", issue: "none" },
    { from: "chapter2_adapter", to: "chapter2_physics", owner: "Physics Engine", issue: "none" },
    { from: "chapter2_physics", to: "chapter3_adapter", owner: "Chapter 3 Adapter", issue: "none" },
    { from: "building_dna", to: "chapter3_adapter", owner: "Chapter 3 Adapter", issue: "none" },
    { from: "chapter3_adapter", to: "chapter3_physics", owner: "Physics Engine", issue: "none" },
    { from: "chapter2_physics", to: "engineering_runtime", owner: "Physics Engine", issue: "none" },
    { from: "chapter3_physics", to: "engineering_runtime", owner: "Physics Engine", issue: "optional_when_systems_active" },
    { from: "engineering_runtime", to: "technical_report", owner: "Technical Report Builder", issue: "none" },
    { from: "building_dna", to: "versioned_persistence", owner: "Versioned Backend", issue: "none" },
    { from: "engineering_runtime", to: "versioned_persistence", owner: "Versioned Backend", issue: "none" },
    { from: "technical_report", to: "versioned_persistence", owner: "Versioned Backend", issue: "none" },
    { from: "versioned_persistence", to: "reopen_payload", owner: "Versioned Backend", issue: "none" }
  ]),
  lifecycleNotes: Object.freeze([
    "A reopened payload starts a new local project session, but this is a lifecycle transition rather than a field ownership dependency."
  ]),
  obsoletePaths: Object.freeze([
    {
      pathId: "hidden_climate_profile_override",
      description: "Hidden climate_profile_id must never override source-backed locality except demo or no station-backed locality.",
      status: "bounded_legacy_compatibility",
      owningField: "legacy.climate_profile_id"
    },
    {
      pathId: "ui_only_geometry_dimensions",
      description: "building_length_m/building_width_m are visible but not consumed by Building DNA.",
      status: "remove_or_wire_later",
      owningField: "legacy.length_width_geometry_inputs"
    },
    {
      pathId: "ui_only_thermal_mass",
      description: "thermal_mass_class is visible but not mapped into Table 2.19/2.20 utilization dependencies.",
      status: "remove_or_wire_later",
      owningField: "legacy.thermal_mass_class_ui"
    }
  ]),
  circularDependencies: Object.freeze([])
});

const uiAudit = Object.freeze([
  {
    section: "Amplasare si clima",
    visibleFields: ["county", "locality_id", "city", "climate_zone", "wind_zone", "climate_manual_override", "climate_override_reason"],
    recommendation: "keep locality editable; keep zone/wind explicit until normative mappings exist; all resolved provider fields read-only",
    fieldsToHideOrRemove: ["climate_profile_id visible selector already removed; hidden compatibility field remains only for demo/legacy"],
    architectureReason: "locality is the primary climate source; zone and wind are not equivalent to a monthly climate profile"
  },
  {
    section: "Geometrie",
    visibleFields: ["useful_area_m2", "number_of_floors", "floor_height_m", "heated_volume_m3", "exterior_wall_area_m2", "roof_area_m2", "ground_floor_area_m2", "attic_ceiling_area_m2", "adjacent_wall_area_m2"],
    recommendation: "keep explicit area/volume fields editable and show direct/runtime impact",
    fieldsToHideOrRemove: ["building_length_m removed in P6B", "building_width_m removed in P6B", "thermal_mass_class removed in P6B"],
    architectureReason: "explicit envelope areas and volume are active; approximate dimensions and thermal mass selector are not wired"
  },
  {
    section: "Anvelopa",
    visibleFields: ["structural_system", "wall_material", "roof_type", "floor_type", "window_type", "window_area_m2", "window_orientation", "door_area_m2", "ventilation_type", "ventilation_ach", "thermal_bridge_mode"],
    recommendation: "keep active fields; make bridge inventory explicit in a future milestone",
    fieldsToHideOrRemove: ["wall_thickness removed in P6B until assembly selection consumes it"],
    architectureReason: "active fields reach catalogue, envelope elements, ventilation and report; wall thickness is currently not consumed"
  },
  {
    section: "Renovari",
    visibleFields: ["wall_insulation", "wall_insulation_material", "roof_insulated", "floor_insulated", "windows_replaced"],
    recommendation: "keep intervention toggles; remove or wire detail fields",
    fieldsToHideOrRemove: [
      "wall_insulation_year removed in P6B",
      "roof_insulation_thickness_cm removed in P6B",
      "floor_insulation_thickness_cm removed in P6B",
      "window_age_years removed in P6B",
      "door_replaced removed in P6B"
    ],
    architectureReason: "main toggles reach interventions/assemblies; detail metadata has no current canonical owner"
  },
  {
    section: "Instalatii tehnice",
    visibleFields: ["chapter3_heating_*", "chapter3_cooling_*", "chapter3_ventilation_ahu_*", "chapter3_dhw_*", "chapter3_pcm_*", "chapter3_lighting_*"],
    recommendation: "keep editable with validation; continue showing explicit SR EN 15193-1 lighting boundary",
    fieldsToHideOrRemove: [],
    architectureReason: "technicalSystems is the canonical Chapter 3 product input model"
  },
  {
    section: "Results/report",
    visibleFields: ["QHnd", "QCnd", "Htr", "Chapter 3 annuals", "fingerprints"],
    recommendation: "read-only calculated outputs only",
    fieldsToHideOrRemove: [],
    architectureReason: "reports and UI must read engine outputs, not collect editable output fields"
  }
]);

const genericBuildingAudit = Object.freeze([
  {
    buildingCategory: "detached_houses",
    currentSupport: "production_supported",
    architectureFit: "good",
    notes: "Current default geometry/envelope workflow is strongest for single-family houses."
  },
  {
    buildingCategory: "apartments",
    currentSupport: "partially_supported",
    architectureFit: "requires_boundary_context_hardening",
    notes: "Building DNA can represent adjacent/heated/unheated boundaries, but assisted abstraction must avoid roof/ground questions when irrelevant."
  },
  {
    buildingCategory: "apartment_buildings",
    currentSupport: "model_ready_not_product_default",
    architectureFit: "requires_multi_zone_and_shared_system_metadata",
    notes: "Project/building/technicalSystems model is generic enough; UI is currently residential-house biased."
  },
  {
    buildingCategory: "offices_schools_hospitals_hotels_commercial",
    currentSupport: "future_input_model_possible",
    architectureFit: "requires_non_residential_occupancy_zoning_schedules_and_internal_gains_categories",
    notes: "Chapter 3 technical systems are generic; Chapter 2 input UI must generalize building use, zones, schedules and internal gains."
  },
  {
    buildingCategory: "industrial_buildings",
    currentSupport: "not_product_supported",
    architectureFit: "requires_scope_decision",
    notes: "Architecture should keep category separate from residential presets and avoid assumptions until MC001 scope is confirmed for the target use."
  }
]);

const simplificationReport = Object.freeze({
  duplicatedOrObsoleteConcepts: Object.freeze([
    {
      concept: "climate_profile_id vs locality-driven Climate Provider",
      status: "legacy_compatibility_only",
      action: "keep hidden until demo/legacy path is retired; never expose as production selector"
    },
    {
      concept: "buildingSpecificParameters.* duplicated with geometry.*",
      status: "intentional_but_should_be_simplified",
      action: "future milestone should choose one public geometry owner and keep alternate as provenance/seed metadata"
    },
    {
      concept: "visible dimensions length/width without resolver consumer",
      status: "removed_from_production_ui",
      action: "keep absent unless a source-backed geometry generator is introduced through the architecture registry"
    },
    {
      concept: "thermal_mass_class selector without utilization mapping",
      status: "removed_from_production_ui",
      action: "keep absent until Table 2.19/2.20 effective capacity mapping is integrated into Building DNA"
    },
    {
      concept: "renovation detail metadata not consumed",
      status: "removed_from_production_ui",
      action: "keep absent or add explicit intervention fields with downstream semantics"
    }
  ]),
  removableFieldsEstimate: 0,
  removableUiControls: [],
  removedUiControls: [
    "building_length_m",
    "building_width_m",
    "thermal_mass_class",
    "wall_thickness",
    "wall_insulation_year",
    "roof_insulation_thickness_cm",
    "floor_insulation_thickness_cm",
    "window_age_years",
    "door_replaced"
  ],
  removableRuntimeConcepts: [],
  automaticallyDerivableFields: [
    "climate_station_id from locality_id",
    "monthly exterior temperatures from climate station",
    "monthly relative humidity from climate station",
    "design temperatures from climate station",
    "ventilation airflow from heated volume and ACH"
  ],
  explicitFutureBoundaries: [
    "locality to climate-zone mapping requires source-backed registry",
    "locality to wind-zone mapping requires source-backed registry",
    "Annex A.9.6 solar source rows require normative preprocessing to Qsol",
    "SR EN 15193-1 full lighting engine remains external"
  ]
});

const legacyInventory = Object.freeze([
  {
    legacyId: "legacy_database_tables",
    owner: "Legacy migration boundary",
    items: ["houses", "analyses", "analysis_answers", "reports", "report_snapshots"],
    compatibilityRole: "read and controlled migration only",
    targetDisposition: "remove after canonical migration evidence"
  },
  {
    legacyId: "legacy_climate_profiles",
    owner: "Climate compatibility layer",
    items: ["climate_profile_id", "synthetic demo profile"],
    compatibilityRole: "demo and explicit profile fallback only",
    targetDisposition: "replace normal production usage with Climate Provider and certified import contract"
  },
  {
    legacyId: "assisted_typology_abstraction",
    owner: "Simplified secondary flow",
    items: ["typologyProposal", "contextual assumptions"],
    compatibilityRole: "secondary flow and assembly proposal",
    targetDisposition: "keep isolated; future redesign must update this architecture before changing defaults"
  }
]);

const targetArchitecture = Object.freeze({
  orderedFlow: [
    "Primitive user inputs",
    "Providers",
    "Building DNA",
    "Physics Engine",
    "Engineering Runtime",
    "Reports",
    "UI"
  ],
  rules: [
    "Every production field has exactly one authoritative owner.",
    "UI never calculates MC001 formulas.",
    "Providers resolve source-backed datasets and expose bounded diagnostics for unavailable data.",
    "Building DNA is the only persisted engineering input model.",
    "Adapters map Building DNA to physics input without duplicating formulas.",
    "Reports render persisted Building DNA and engine outputs without recalculation.",
    "Legacy fields remain explicitly classified until removed."
  ],
  authoritativeOwners: {
    primitiveInputs: "User via UI/local project session",
    providers: "Climate Provider and catalogues",
    buildingDna: "Building DNA Resolver",
    physics: "Physics Engine",
    reports: "Technical Report Builder",
    persistence: "Versioned Building Backend",
    legacy: "Legacy migration boundary"
  }
});

const architectureRules = Object.freeze(domains.map(domain => ({
  concept: domain.concept,
  owner: domain.owner,
  sourceOfTruth: domain.sourceOfTruth,
  lifecycle: domain.lifecycle,
  persistence: domain.domainId === "physics_engine" ? "analysis_versions only, never as mutable input" : domain.sourceOfTruth,
  uiVisibility: domain.domainId === "legacy_compatibility" ? "hidden_or_migration_only" : "visible_where_user_decision_or_diagnostic",
  runtimeVisibility: domain.domainId.includes("report") ? "read_only" : "as_required_by_adapters",
  reportVisibility: domain.domainId === "legacy_compatibility" ? "technical_appendix_or_none" : "human_readable_engineering_context",
  providerDependency: domain.domainId === "location_and_climate" ? "primary" : "explicit_only_where_listed",
  physicsDependency: domain.domainId === "physics_engine" ? "owner" : "consumer_or_input"
})));

const registry = {
  schema: "building_model_architecture_registry_v1",
  milestone: "P6_PRODUCTION_BUILDING_MODEL_ARCHITECTURE_BASELINE",
  sourceBaseline: {
    branch: "origin/main",
    commit: SOURCE_BASELINE_COMMIT,
    note: "No physics, persistence or report runtime behavior changed by this architecture baseline."
  },
  categories: CATEGORY_IDS.map(id => ({ id })),
  uiRecommendations: UI_RECOMMENDATIONS.map(id => ({ id })),
  domains,
  fields,
  dependencyGraph,
  uiAudit,
  genericBuildingAudit,
  simplificationReport,
  legacyInventory,
  architectureRules,
  targetArchitecture,
  validationContract: {
    fieldCategoryCardinality: "exactly_one",
    fieldOwnerCardinality: "exactly_one",
    dependencyGraph: "acyclic",
    futureChangeRule:
      "Any milestone adding a production field, provider, runtime concept or report section must update building-model-registry.json and BUILDING_MODEL_ARCHITECTURE.md."
  }
};

function mdTable(headers, rows) {
  const header = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map(row => `| ${row.map(cell => String(cell ?? "").replaceAll("|", "\\|")).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

function buildMarkdown(data) {
  const categoryCounts = CATEGORY_IDS.map(category => [
    category,
    data.fields.filter(item => item.category === category).length
  ]);
  const uiRows = data.uiAudit.map(section => [
    section.section,
    section.recommendation,
    section.fieldsToHideOrRemove.join(", ") || "-"
  ]);
  const fieldRows = data.fields.map(item => [
    item.fieldId,
    item.category,
    item.owner,
    item.sourceOfTruth,
    item.uiRecommendation,
    item.productionUsage
  ]);
  const domainRows = data.domains.map(domain => [
    domain.domainId,
    domain.concept,
    domain.owner,
    domain.sourceOfTruth,
    domain.lifecycle
  ]);
  const legacyRows = data.legacyInventory.map(item => [
    item.legacyId,
    item.owner,
    item.compatibilityRole,
    item.targetDisposition
  ]);
  const genericRows = data.genericBuildingAudit.map(item => [
    item.buildingCategory,
    item.currentSupport,
    item.architectureFit,
    item.notes
  ]);
  const obsoleteRows = data.simplificationReport.duplicatedOrObsoleteConcepts.map(item => [
    item.concept,
    item.status,
    item.action
  ]);
  return `# Production Building Model Architecture Baseline

Milestone: ${data.milestone}

Source baseline: \`${data.sourceBaseline.branch}\` @ \`${data.sourceBaseline.commit}\`

This document is the permanent baseline for the LaCurent production building model. It inventories engineering concepts, field ownership, dependencies, visible UI fields, legacy compatibility and the target architecture. It does not introduce new physics and does not modify Chapter 2 or Chapter 3 formulas.

## Core Rule

Primitive Inputs -> Providers -> Building DNA -> Physics Engine -> Engineering Runtime -> Reports -> UI.

Every production concept exists once, has exactly one owner and is extended through this baseline instead of parallel abstractions.

## Domain Inventory

${mdTable(["Domain", "Concept", "Owner", "Source of truth", "Lifecycle"], domainRows)}

## Field Category Counts

${mdTable(["Category", "Field count"], categoryCounts)}

## Field Inventory

${mdTable(["Field", "Category", "Owner", "Source of truth", "UI recommendation", "Production usage"], fieldRows)}

## Dependency Graph

${mdTable(
    ["Producer", "Consumer", "Owner", "Issue"],
    data.dependencyGraph.edges.map(edge => [edge.from, edge.to, edge.owner, edge.issue])
  )}

Obsolete or bounded paths:

${mdTable(
    ["Path", "Status", "Owning field", "Description"],
    data.dependencyGraph.obsoletePaths.map(path => [path.pathId, path.status, path.owningField, path.description])
  )}

## UI Audit

${mdTable(["Section", "Recommendation", "Hide or remove"], uiRows)}

## Generic Building Audit

${mdTable(["Category", "Current support", "Architecture fit", "Notes"], genericRows)}

## Legacy Inventory

${mdTable(["Legacy area", "Owner", "Compatibility role", "Target disposition"], legacyRows)}

## Simplification Report

${mdTable(["Concept", "Status", "Action"], obsoleteRows)}

Removable UI controls estimate: ${data.simplificationReport.removableUiControls.length}

Removed UI controls:

${data.simplificationReport.removedUiControls.map(item => `- ${item}`).join("\n")}

Automatically derivable fields:

${data.simplificationReport.automaticallyDerivableFields.map(item => `- ${item}`).join("\n")}

Explicit future boundaries:

${data.simplificationReport.explicitFutureBoundaries.map(item => `- ${item}`).join("\n")}

## Architecture Rules

${data.targetArchitecture.rules.map(item => `- ${item}`).join("\n")}

## Target Architecture

${data.targetArchitecture.orderedFlow.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## Required Future Maintenance

Any future milestone that adds fields, providers, runtime concepts, report sections, persistence semantics or UI abstractions must update both:

- \`building-model-registry.json\`
- \`BUILDING_MODEL_ARCHITECTURE.md\`

No new production abstraction should bypass this registry.
`;
}

writeFileSync("building-model-registry.json", `${JSON.stringify(registry, null, 2)}\n`);
writeFileSync("BUILDING_MODEL_ARCHITECTURE.md", buildMarkdown(registry));
