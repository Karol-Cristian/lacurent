export const BUILDING_PLATFORM_VERSIONED_BACKEND_VERSION =
  "building_platform_versioned_backend_p3e_v1";

export const BUILDING_DNA_VERSION_SCHEMA = "building_dna_version_v1";
export const ANALYSIS_VERSION_SCHEMA = "analysis_version_v1";
export const TECHNICAL_REPORT_VERSION_SCHEMA = "technical_report_version_v1";
export const CLIMATE_PROFILE_VERSION_SCHEMA = "climate_profile_version_v1";
export const SCENARIO_SCHEMA = "building_platform_scenario_v1";

export const CHAPTER2_ADAPTER_VERSION = "building_chapter_2_adapter_v1";
export const PHYSICS_ENGINE_VERSION =
  "mc001_chapter_2_runtime_complete_for_supported_inputs";
export const NORMATIVE_REGISTRY_VERSION =
  "MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX";
export const MATERIAL_CATALOGUE_VERSION = "building_platform_p2_review_mvp_v1";
export const ASSEMBLY_CATALOGUE_VERSION = "building_platform_p2_review_mvp_v1";
export const TECHNICAL_REPORT_SCHEMA_VERSION = "technical_chapter_2_report_v1";

const PRESENTATION_ONLY_BUILDING_DNA_KEYS = new Set([
  "userMode",
  "source",
  "assumptions",
  "warnings",
  "missingConfirmations",
  "diagnostics",
  "demoFixture"
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function stableNormalize(value) {
  if (Array.isArray(value)) {
    return value.map(stableNormalize);
  }
  if (isPlainObject(value)) {
    return Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .reduce((normalized, key) => {
        normalized[key] = stableNormalize(value[key]);
        return normalized;
      }, {});
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toPrecision(15)) : null;
  }
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(stableNormalize(value));
}

export function stableFingerprint(value, prefix = "fp") {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    hash >>>= 0;
  }
  return `${prefix}_${hash.toString(16).padStart(8, "0")}`;
}

export function normalizeBuildingDnaForFingerprint(buildingDna = {}) {
  const normalized = {};
  for (const key of Object.keys(buildingDna).sort()) {
    if (PRESENTATION_ONLY_BUILDING_DNA_KEYS.has(key)) continue;
    normalized[key] = buildingDna[key];
  }
  return stableNormalize({
    ...normalized,
    catalogueVersions: {
      materialCatalogueVersion:
        buildingDna.catalogueVersions?.materialCatalogueVersion ?? MATERIAL_CATALOGUE_VERSION,
      assemblyCatalogueVersion:
        buildingDna.catalogueVersions?.assemblyCatalogueVersion ?? ASSEMBLY_CATALOGUE_VERSION
    }
  });
}

export function normalizeClimateProfileForFingerprint(buildingDnaOrProfile = {}) {
  const profile = buildingDnaOrProfile.climateProfile ?? buildingDnaOrProfile;
  return stableNormalize({
    schema: profile?.schema ?? CLIMATE_PROFILE_VERSION_SCHEMA,
    profileId: profile?.profileId ?? null,
    climateProfileId: profile?.climateProfileId ?? profile?.profileId ?? null,
    climateProfileVersion:
      profile?.climateProfileVersion ?? profile?.datasetVersion ?? profile?.version ?? null,
    sourceType: profile?.sourceType ?? null,
    verificationStatus: profile?.verificationStatus ?? null,
    locality: profile?.locality ?? null,
    county: profile?.county ?? null,
    climaticZone: profile?.climaticZone ?? null,
    monthlyRecords: profile?.monthlyRecords ?? buildingDnaOrProfile.monthlyProfiles ?? []
  });
}

export function fingerprintClimateProfile(buildingDnaOrProfile = {}) {
  return stableFingerprint(normalizeClimateProfileForFingerprint(buildingDnaOrProfile), "climate");
}

export function fingerprintBuildingDna(buildingDna = {}) {
  return stableFingerprint(normalizeBuildingDnaForFingerprint(buildingDna), "dna");
}

export function buildVersionIdentity(overrides = {}) {
  return {
    backendVersion: overrides.backendVersion ?? BUILDING_PLATFORM_VERSIONED_BACKEND_VERSION,
    buildingDnaSchemaVersion: overrides.buildingDnaSchemaVersion ?? BUILDING_DNA_VERSION_SCHEMA,
    analysisSchemaVersion: overrides.analysisSchemaVersion ?? ANALYSIS_VERSION_SCHEMA,
    technicalReportSchemaVersion:
      overrides.technicalReportSchemaVersion ?? TECHNICAL_REPORT_VERSION_SCHEMA,
    reportSchemaVersion: overrides.reportSchemaVersion ?? TECHNICAL_REPORT_SCHEMA_VERSION,
    adapterVersion: overrides.adapterVersion ?? CHAPTER2_ADAPTER_VERSION,
    physicsEngineVersion: overrides.physicsEngineVersion ?? PHYSICS_ENGINE_VERSION,
    normativeRegistryVersion: overrides.normativeRegistryVersion ?? NORMATIVE_REGISTRY_VERSION,
    materialCatalogueVersion:
      overrides.materialCatalogueVersion ?? MATERIAL_CATALOGUE_VERSION,
    assemblyCatalogueVersion:
      overrides.assemblyCatalogueVersion ?? ASSEMBLY_CATALOGUE_VERSION
  };
}

export function fingerprintAnalysis({
  buildingDnaFingerprint,
  climateProfileFingerprint,
  chapter2Input,
  chapter3Input = null,
  chapter3AdapterVersion = null,
  chapter4Input = null,
  chapter4AdapterVersion = null,
  versionIdentity = buildVersionIdentity()
} = {}) {
  return stableFingerprint({
    buildingDnaFingerprint,
    climateProfileFingerprint,
    chapter2Input,
    ...(chapter3Input === null ? {} : { chapter3Input }),
    adapterVersion: versionIdentity.adapterVersion,
    ...(chapter3AdapterVersion === null ? {} : { chapter3AdapterVersion }),
    ...(chapter4Input === null ? {} : { chapter4Input }),
    ...(chapter4AdapterVersion === null ? {} : { chapter4AdapterVersion }),
    physicsEngineVersion: versionIdentity.physicsEngineVersion,
    normativeRegistryVersion: versionIdentity.normativeRegistryVersion
  }, "analysis");
}

export function fingerprintReport({ analysisFingerprint } = {}) {
  return analysisFingerprint;
}

export function buildBuildingPlatformVersionMetadata({
  buildingDna,
  calculation,
  analysisId = null,
  versionIdentity = buildVersionIdentity()
} = {}) {
  const buildingDnaFingerprint = fingerprintBuildingDna(buildingDna);
  const climateProfileFingerprint = fingerprintClimateProfile(buildingDna);
  const analysisFingerprint = fingerprintAnalysis({
    buildingDnaFingerprint,
    climateProfileFingerprint,
    chapter2Input: calculation?.chapter2Input ?? null,
    chapter3Input: calculation?.chapter3Input ?? null,
    chapter3AdapterVersion: calculation?.chapter3AdapterVersion ?? null,
    chapter4Input: calculation?.chapter4Input ?? null,
    chapter4AdapterVersion: calculation?.chapter4AdapterVersion ?? null,
    versionIdentity
  });
  const reportFingerprint = fingerprintReport({ analysisFingerprint });
  const climateProfile = buildingDna?.climateProfile ?? {};
  return {
    versionId: analysisId == null ? null : `building-dna-${analysisId}`,
    schemaVersion: buildingDna?.schema ?? null,
    backendVersion: versionIdentity.backendVersion,
    platformVersion: buildingDna?.platformVersion ?? null,
    buildingDnaSchemaVersion: versionIdentity.buildingDnaSchemaVersion,
    analysisSchemaVersion: versionIdentity.analysisSchemaVersion,
    technicalReportSchemaVersion: versionIdentity.technicalReportSchemaVersion,
    reportSchemaVersion: versionIdentity.reportSchemaVersion,
    adapterVersion: versionIdentity.adapterVersion,
    chapter3AdapterVersion: calculation?.chapter3AdapterVersion ?? null,
    chapter3RuntimeVersion: calculation?.chapter3Result
      ? "mc001_chapter_3_runtime_complete_for_mc001_explicit_relations_p4_product_flow"
      : null,
    chapter4AdapterVersion: calculation?.chapter4AdapterVersion ?? null,
    chapter4RuntimeVersion: calculation?.chapter4Result
      ? "mc001_chapter_4_5_photovoltaic_monthly_p7_v1"
      : null,
    physicsEngineVersion: versionIdentity.physicsEngineVersion,
    normativeRegistryVersion: versionIdentity.normativeRegistryVersion,
    materialCatalogueVersion: versionIdentity.materialCatalogueVersion,
    assemblyCatalogueVersion: versionIdentity.assemblyCatalogueVersion,
    climateProfileId: climateProfile.profileId ?? null,
    climateProfileVersion: climateProfile.datasetVersion ?? null,
    climateProfileVersionSchema: CLIMATE_PROFILE_VERSION_SCHEMA,
    calculationStatus: buildingDna?.calculationStatus ?? "requires_confirmation",
    fingerprints: {
      buildingDnaFingerprint,
      climateProfileFingerprint,
      analysisFingerprint,
      reportFingerprint
    }
  };
}
