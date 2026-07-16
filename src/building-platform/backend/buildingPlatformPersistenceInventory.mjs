export const BUILDING_PLATFORM_PERSISTENCE_INVENTORY_ID =
  "P3E_BUILDING_PLATFORM_VERSIONED_PERSISTENCE_INVENTORY_V1";

export const BUILDING_PLATFORM_VERSIONED_TABLES = Object.freeze([
  Object.freeze({
    table: "building_platform_projects",
    entity: "Building Project",
    activeStatus: "canonical_versioned_backend",
    ownershipModel: "owner_user_id",
    versionModel: "stable project pointer to immutable current versions",
    migrationNeed: "coexists_with_legacy_houses_until_reprocessing_is_complete",
    requiredFields: Object.freeze([
      "project_id",
      "owner_user_id",
      "project_name",
      "project_status",
      "current_building_dna_version_id",
      "current_analysis_version_id",
      "created_at",
      "updated_at",
      "schema_version"
    ])
  }),
  Object.freeze({
    table: "building_platform_project_drafts",
    entity: "Mutable Project Draft",
    activeStatus: "canonical_local_first_backend",
    ownershipModel: "owner_user_id plus project_id",
    versionModel: "one mutable draft per project/owner; not permanent history",
    migrationNeed: "new explicit draft storage for local-first editing",
    requiredFields: Object.freeze([
      "draft_id",
      "project_id",
      "owner_user_id",
      "base_building_dna_version_id",
      "editable_building_dna_json",
      "draft_fingerprint",
      "concurrency_token",
      "draft_status",
      "updated_at"
    ])
  }),
  Object.freeze({
    table: "building_dna_versions",
    entity: "Building DNA Version",
    activeStatus: "canonical_versioned_backend",
    ownershipModel: "via project_id",
    versionModel: "immutable",
    migrationNeed: "new canonical storage for normalized Building DNA",
    requiredFields: Object.freeze([
      "building_dna_version_id",
      "project_id",
      "schema_version",
      "complete_building_dna_json",
      "climate_profile_id",
      "climate_profile_version",
      "creation_reason",
      "building_dna_fingerprint",
      "created_at"
    ])
  }),
  Object.freeze({
    table: "building_platform_analysis_versions",
    entity: "Analysis Version",
    activeStatus: "canonical_versioned_backend",
    ownershipModel: "via project_id",
    versionModel: "immutable",
    migrationNeed: "new canonical storage for explicit adapter input and engine output",
    requiredFields: Object.freeze([
      "analysis_version_id",
      "project_id",
      "building_dna_version_id",
      "adapter_version",
      "physics_engine_version",
      "normative_registry_version",
      "explicit_engine_input_json",
      "complete_engine_output_json",
      "annual_qhnd",
      "annual_qcnd",
      "calculation_fingerprint"
    ])
  }),
  Object.freeze({
    table: "building_platform_report_versions",
    entity: "Technical Report Version",
    activeStatus: "canonical_versioned_backend",
    ownershipModel: "via project_id",
    versionModel: "immutable",
    migrationNeed: "new canonical structured report model storage",
    requiredFields: Object.freeze([
      "technical_report_version_id",
      "project_id",
      "analysis_version_id",
      "building_dna_version_id",
      "report_schema_version",
      "structured_report_model_json",
      "traceability_model_json",
      "calculation_fingerprint"
    ])
  }),
  Object.freeze({
    table: "building_platform_climate_profile_versions",
    entity: "Climate Profile Version",
    activeStatus: "canonical_versioned_backend",
    ownershipModel: "public or authorized professional profile owner",
    versionModel: "immutable published climate profile",
    migrationNeed: "ready for future authoritative Romanian climate ingestion",
    requiredFields: Object.freeze([
      "climate_profile_id",
      "climate_profile_version",
      "profile_type",
      "source_type",
      "monthly_records_json",
      "profile_fingerprint",
      "verification_status"
    ])
  }),
  Object.freeze({
    table: "building_platform_scenarios",
    entity: "Scenario",
    activeStatus: "canonical_versioned_backend",
    ownershipModel: "via project_id",
    versionModel: "scenario points to immutable base and derived Building DNA versions",
    migrationNeed: "new engineering-only scenario model",
    requiredFields: Object.freeze([
      "scenario_id",
      "project_id",
      "scenario_name",
      "base_building_dna_version_id",
      "derived_building_dna_version_id",
      "current_analysis_version_id"
    ])
  }),
  Object.freeze({
    table: "building_platform_audit_events",
    entity: "Audit Event",
    activeStatus: "canonical_versioned_backend",
    ownershipModel: "via project_id",
    versionModel: "append-only",
    migrationNeed: "new audit trail for immutable version graph",
    requiredFields: Object.freeze([
      "event_id",
      "project_id",
      "actor_user_id",
      "action",
      "created_at",
      "metadata_json"
    ])
  }),
  Object.freeze({
    table: "building_platform_idempotency_keys",
    entity: "Idempotency Record",
    activeStatus: "canonical_versioned_backend",
    ownershipModel: "owner_user_id",
    versionModel: "request fingerprint protects duplicate create/calculate submissions",
    migrationNeed: "new duplicate-submission protection",
    requiredFields: Object.freeze([
      "idempotency_key",
      "owner_user_id",
      "request_fingerprint",
      "response_json",
      "created_at"
    ])
  })
]);

export const BUILDING_PLATFORM_LEGACY_PERSISTENCE_INVENTORY = Object.freeze([
  Object.freeze({
    table: "houses",
    currentProducer: "workers/save-house.js",
    currentConsumer: "legacy dashboard and current Building Platform compatibility save path",
    activeStatus: "legacy_compatibility_dependency",
    ownershipModel: "user_id",
    versionModel: "project-like row, not an immutable analysis version",
    migrationNeed: "map owned rows into building_platform_projects during controlled migration"
  }),
  Object.freeze({
    table: "analyses",
    currentProducer: "workers/save-house.js",
    currentConsumer: "workers/save-house.js",
    activeStatus: "legacy_compatibility_dependency",
    ownershipModel: "user_id",
    versionModel: "append-only rows by analysis id",
    migrationNeed: "backfill analysis rows into building_platform_analysis_versions where compatible"
  }),
  Object.freeze({
    table: "analysis_answers",
    currentProducer: "workers/save-house.js",
    currentConsumer: "workers/save-house.js",
    activeStatus: "legacy_compatibility_dependency",
    ownershipModel: "via analyses",
    versionModel: "key/value blob storage",
    migrationNeed: "extract Building DNA, engine input, engine output and version metadata"
  }),
  Object.freeze({
    table: "report_snapshots",
    currentProducer: "workers/save-house.js",
    currentConsumer: "workers/save-house.js",
    activeStatus: "legacy_compatibility_dependency",
    ownershipModel: "via analysis/house",
    versionModel: "snapshot row",
    migrationNeed: "extract structured report model into building_platform_report_versions"
  }),
  Object.freeze({
    table: "reports",
    currentProducer: "workers/save-house.js",
    currentConsumer: "legacy report routing",
    activeStatus: "legacy_compatibility_dependency",
    ownershipModel: "via analysis",
    versionModel: "status row",
    migrationNeed: "retain until report routes consume canonical report versions"
  })
]);

export function getBuildingPlatformPersistenceInventory() {
  return {
    inventoryId: BUILDING_PLATFORM_PERSISTENCE_INVENTORY_ID,
    canonicalVersionedTables: BUILDING_PLATFORM_VERSIONED_TABLES,
    legacyTables: BUILDING_PLATFORM_LEGACY_PERSISTENCE_INVENTORY,
    closureStatus: "p3e_b_local_first_versioned_database_flow_in_progress",
    localFirstPolicy: Object.freeze({
      ordinaryEditDatabaseWrites: 0,
      unsavedRecalculationDatabaseWrites: 0,
      mutableDraftsPerProjectOwner: 1,
      permanentVersionTrigger: "explicit_calculated_save_only",
      canonicalReopenSource: "versioned_tables"
    }),
    unsupportedDomainsExcluded: Object.freeze([
      "chapter_3",
      "final_energy",
      "primary_energy",
      "CO2",
      "CPE",
      "certificate",
      "financial_calculations",
      "equipment_recommendations"
    ])
  };
}
