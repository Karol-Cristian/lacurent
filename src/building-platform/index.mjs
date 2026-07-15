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
  buildBuildingInputPropagationDiff
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
