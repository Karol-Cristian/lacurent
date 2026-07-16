export {
  BUILDING_PLATFORM_VERSION,
  ENGINEERING_CONFIDENCE_LEVELS,
  ENGINEERING_PROVENANCE_ORIGINS,
  getAssemblyCatalogueEntry,
  getBuildingPlatformCatalogue,
  getMaterialCatalogueEntry,
  listAssemblyCatalogueEntries,
  listMaterialCatalogueEntries,
  makeEngineeringProvenance,
  makeEngineeringQuantity
} from "./buildingPlatformCatalog.mjs";

export {
  createAssistedTypologyInput,
  proposeBuildingTypology,
  validateTypologyProposal
} from "./buildingTypologyEngine.mjs";

export {
  applyBuildingDnaOverride,
  createBuildingDnaFromAdvancedModel,
  createBuildingDnaFromAssistedAnswers,
  createP1SeedBoundaryContext,
  createP1SeedGeometry,
  getBuildingDnaDependencyTree
} from "./buildingDnaResolver.mjs";

export {
  buildChapter2UsefulDemandPhysicsInput,
  buildEnvelopeAssemblyPhysicsInput,
  buildEnvelopeTransmissionPhysicsInput,
  calculateChapter2ForBuildingDna
} from "./buildingChapter2Adapter.mjs";

export {
  resolveBuildingRenovationInterventions
} from "./buildingRenovationInterventions.mjs";

export {
  buildBuildingInputPropagationDiff,
  buildOrientationComparisonTable
} from "./buildingInputPropagationAudit.mjs";

export {
  buildBuildingKnowledgePlatformFromAdvancedModel,
  buildBuildingKnowledgePlatformFromAssistedAnswers
} from "./buildingKnowledgePipeline.mjs";

export {
  TECHNICAL_WORKSPACE_TABS,
  buildBuildingTechnicalWorkspace
} from "./buildingTechnicalReport.mjs";

export {
  CLIMATE_PLATFORM_VERSION,
  ROMANIAN_CLIMATE_SOURCE_AUDIT,
  climateProfileToBuildingMonthlyProfiles,
  createSyntheticSeasonalDemoClimateProfile,
  createSyntheticSeasonalDemoMonthlyProfiles,
  findRomanianClimateProfileById,
  listClimateSourceContracts,
  listRomanianClimateProfiles,
  resolveClimateProfileSelection,
  searchRomanianClimateProfiles,
  validateClimateProfile
} from "../climate-platform/index.mjs";

export {
  ANALYSIS_VERSION_SCHEMA,
  ASSEMBLY_CATALOGUE_VERSION,
  BUILDING_DNA_VERSION_SCHEMA,
  BUILDING_PLATFORM_VERSIONED_BACKEND_VERSION,
  CHAPTER2_ADAPTER_VERSION,
  CLIMATE_PROFILE_VERSION_SCHEMA,
  MATERIAL_CATALOGUE_VERSION,
  NORMATIVE_REGISTRY_VERSION,
  PHYSICS_ENGINE_VERSION,
  TECHNICAL_REPORT_SCHEMA_VERSION,
  TECHNICAL_REPORT_VERSION_SCHEMA,
  buildBuildingPlatformVersionMetadata,
  buildVersionIdentity,
  fingerprintAnalysis,
  fingerprintBuildingDna,
  fingerprintClimateProfile,
  fingerprintReport,
  stableFingerprint,
  stableNormalize,
  stableStringify
} from "./backend/buildingPlatformFingerprints.mjs";

export {
  VersionedBuildingBackend,
  createBuildingPlatformBackendState,
  createInMemoryVersionedBuildingBackend
} from "./backend/buildingPlatformVersionedBackend.mjs";

export {
  BUILDING_PLATFORM_LEGACY_PERSISTENCE_INVENTORY,
  BUILDING_PLATFORM_PERSISTENCE_INVENTORY_ID,
  BUILDING_PLATFORM_VERSIONED_TABLES,
  getBuildingPlatformPersistenceInventory
} from "./backend/buildingPlatformPersistenceInventory.mjs";

export {
  BUILDING_PLATFORM_OPERATION_INVENTORY,
  BUILDING_PLATFORM_OPERATION_INVENTORY_ID,
  getBuildingPlatformOperationInventory
} from "./backend/buildingPlatformOperationInventory.mjs";

export {
  LOCAL_PROJECT_DIRTY_STATES,
  LOCAL_PROJECT_SESSION_SCHEMA,
  LOCAL_PROJECT_VISIBLE_STATUS,
  applyLocalBuildingDnaEdit,
  buildProjectConcurrencyToken,
  buildUnsavedExitOptions,
  createLocalProjectSession,
  isPresentationOnlyLocalEdit,
  markDraftSaved,
  markPermanentVersionSaved,
  markVersionConflict,
  recordUnsavedCalculation,
  shouldWarnBeforeExit
} from "./backend/buildingPlatformLocalSession.mjs";

export {
  LEGACY_BUILDING_PLATFORM_KEYS,
  LEGACY_BUILDING_PLATFORM_MIGRATION_SCOPE,
  createLegacyBuildingDnaMigrationDraft,
  inspectLegacyBuildingPlatformRecord
} from "./backend/legacyBuildingPlatformMigration.mjs";
