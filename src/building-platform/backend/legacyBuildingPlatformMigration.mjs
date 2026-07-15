export const LEGACY_BUILDING_PLATFORM_MIGRATION_SCOPE =
  "p3e_legacy_building_platform_migration_boundary_v1";

export const LEGACY_BUILDING_PLATFORM_KEYS = Object.freeze({
  buildingDna: "building_dna_json",
  versionMeta: "building_dna_version_meta_json",
  engineInput: "chapter2_engine_input_json",
  engineOutput: "chapter2_engine_output_json",
  reportModel: "technical_report_model_json"
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function diagnostic(code, severity = "warning", detail = {}) {
  return { code, severity, detail };
}

export function inspectLegacyBuildingPlatformRecord(record = {}) {
  const answers = record.answers ?? {};
  const buildingDna = answers[LEGACY_BUILDING_PLATFORM_KEYS.buildingDna] ?? null;
  const versionMeta = answers[LEGACY_BUILDING_PLATFORM_KEYS.versionMeta] ?? null;
  const engineInput = answers[LEGACY_BUILDING_PLATFORM_KEYS.engineInput] ?? null;
  const engineOutput = answers[LEGACY_BUILDING_PLATFORM_KEYS.engineOutput] ?? null;
  const reportModel = answers[LEGACY_BUILDING_PLATFORM_KEYS.reportModel] ?? null;
  const diagnostics = [];

  if (!isPlainObject(buildingDna) || buildingDna.schema !== "building_dna_v1") {
    diagnostics.push(diagnostic("legacy_record_missing_canonical_building_dna", "blocking"));
  }
  if (buildingDna && (!Array.isArray(buildingDna.monthlyProfiles) || buildingDna.monthlyProfiles.length !== 12)) {
    diagnostics.push(diagnostic("legacy_building_dna_requires_twelve_months", "blocking"));
  }
  if (buildingDna && !buildingDna.climateProfile?.profileId) {
    diagnostics.push(diagnostic("legacy_building_dna_missing_climate_profile", "confirmation_required"));
  }
  if (!isPlainObject(engineInput)) {
    diagnostics.push(diagnostic("legacy_record_missing_engine_input", "confirmation_required"));
  }
  if (!isPlainObject(engineOutput) || engineOutput.status !== "ready") {
    diagnostics.push(diagnostic("legacy_record_missing_ready_engine_output", "confirmation_required"));
  }
  if (!isPlainObject(reportModel) || !Array.isArray(reportModel.chapters)) {
    diagnostics.push(diagnostic("legacy_record_missing_structured_report_model", "confirmation_required"));
  }
  if (!isPlainObject(versionMeta) || !versionMeta.fingerprints?.buildingDnaFingerprint) {
    diagnostics.push(diagnostic("legacy_record_missing_p3e_fingerprint_metadata", "confirmation_required"));
  }

  const blocking = diagnostics.some((item) => item.severity === "blocking");
  const confirmationRequired = diagnostics.some((item) => item.severity === "confirmation_required");
  return {
    scope: LEGACY_BUILDING_PLATFORM_MIGRATION_SCOPE,
    status: blocking
      ? "incompatible_legacy_data"
      : confirmationRequired
        ? "requires_user_confirmation"
        : "ready_to_reprocess",
    legacyAnalysisId: record.analysis?.id ?? record.analysis_id ?? null,
    legacyHouseId: record.analysis?.house_id ?? record.house_id ?? null,
    mappedFields: {
      buildingDna: Boolean(buildingDna),
      versionMeta: Boolean(versionMeta),
      engineInput: Boolean(engineInput),
      engineOutput: Boolean(engineOutput),
      reportModel: Boolean(reportModel)
    },
    buildingDna,
    versionMeta,
    diagnostics,
    methodologyLimits: [
      "legacy_mapping_only",
      "no_legacy_physics_recalculation",
      "active_calculator_uses_canonical_building_dna_and_chapter_2_adapter"
    ]
  };
}

export function createLegacyBuildingDnaMigrationDraft(record = {}) {
  const inspection = inspectLegacyBuildingPlatformRecord(record);
  if (inspection.status === "incompatible_legacy_data") {
    return {
      status: inspection.status,
      scope: LEGACY_BUILDING_PLATFORM_MIGRATION_SCOPE,
      diagnostics: inspection.diagnostics,
      buildingDnaDraft: null
    };
  }
  return {
    status: inspection.status,
    scope: LEGACY_BUILDING_PLATFORM_MIGRATION_SCOPE,
    buildingDnaDraft: inspection.buildingDna,
    sourceLegacyAnalysisId: inspection.legacyAnalysisId,
    sourceLegacyHouseId: inspection.legacyHouseId,
    diagnostics: inspection.diagnostics
  };
}
