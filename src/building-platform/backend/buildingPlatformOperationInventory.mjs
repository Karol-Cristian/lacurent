export const BUILDING_PLATFORM_OPERATION_INVENTORY_ID =
  "P3E_B_LOCAL_FIRST_OPERATION_INVENTORY_V1";

export const BUILDING_PLATFORM_OPERATION_INVENTORY = Object.freeze([
  Object.freeze({
    operation: "project_list",
    frontendTrigger: "Proiectele mele dashboard opens or refreshes",
    apiRoute: "/api/building-platform/v1/projects/list",
    databaseAccess: "one indexed owner/project summary read",
    expectedReads: 1,
    expectedWrites: 0,
    activeStatus: "canonical_versioned_backend",
    classification: "required"
  }),
  Object.freeze({
    operation: "project_open",
    frontendTrigger: "user opens one Building Platform project",
    apiRoute: "/api/building-platform/v1/projects/open",
    databaseAccess: "one coherent versioned-table read payload",
    expectedReads: 1,
    expectedWrites: 0,
    activeStatus: "canonical_versioned_backend",
    classification: "required"
  }),
  Object.freeze({
    operation: "local_field_edit",
    frontendTrigger: "supported engineering input changes",
    apiRoute: null,
    databaseAccess: "none",
    expectedReads: 0,
    expectedWrites: 0,
    activeStatus: "browser_local_session",
    classification: "required_no_server_write"
  }),
  Object.freeze({
    operation: "local_building_dna_preview",
    frontendTrigger: "Building DNA preview or section navigation",
    apiRoute: null,
    databaseAccess: "none",
    expectedReads: 0,
    expectedWrites: 0,
    activeStatus: "browser_local_session",
    classification: "required_no_server_write"
  }),
  Object.freeze({
    operation: "unsaved_recalculate",
    frontendTrigger: "Recalculeaza before explicit save",
    apiRoute: "local runtime or calculation-only route",
    databaseAccess: "no project/draft/version write",
    expectedReads: 0,
    expectedWrites: 0,
    activeStatus: "browser_local_session",
    classification: "required_no_database_write"
  }),
  Object.freeze({
    operation: "draft_get",
    frontendTrigger: "project session asks for the active mutable draft",
    apiRoute: "/api/building-platform/v1/drafts/get",
    databaseAccess: "one active draft read for owned project",
    expectedReads: 1,
    expectedWrites: 0,
    activeStatus: "canonical_versioned_backend",
    classification: "required"
  }),
  Object.freeze({
    operation: "draft_save",
    frontendTrigger: "Salveaza draft",
    apiRoute: "/api/building-platform/v1/drafts/save",
    databaseAccess: "one mutable draft upsert",
    expectedReads: 1,
    expectedWrites: 1,
    activeStatus: "canonical_versioned_backend",
    classification: "explicit_user_write"
  }),
  Object.freeze({
    operation: "draft_discard",
    frontendTrigger: "Renunta la draft",
    apiRoute: "/api/building-platform/v1/drafts/discard",
    databaseAccess: "one mutable draft delete",
    expectedReads: 1,
    expectedWrites: 1,
    activeStatus: "canonical_versioned_backend",
    classification: "explicit_user_write"
  }),
  Object.freeze({
    operation: "permanent_version_save",
    frontendTrigger: "Salveaza versiunea calculata",
    apiRoute: "/api/building-platform/v1/permanent-save",
    databaseAccess: "one atomic immutable version graph transaction",
    expectedReads: 2,
    expectedWrites: 1,
    activeStatus: "canonical_versioned_backend",
    classification: "explicit_user_write"
  }),
  Object.freeze({
    operation: "version_history",
    frontendTrigger: "Istoric versiuni",
    apiRoute: "/api/building-platform/v1/versions/list",
    databaseAccess: "one indexed project-version read",
    expectedReads: 1,
    expectedWrites: 0,
    activeStatus: "canonical_versioned_backend",
    classification: "required"
  }),
  Object.freeze({
    operation: "version_compare",
    frontendTrigger: "Compara versiuni",
    apiRoute: "/api/building-platform/v1/versions/compare",
    databaseAccess: "one bounded read for two selected versions",
    expectedReads: 1,
    expectedWrites: 0,
    activeStatus: "canonical_versioned_backend",
    classification: "required"
  }),
  Object.freeze({
    operation: "reprocessing_dry_run",
    frontendTrigger: "explicit one-project reprocessing inspection",
    apiRoute: "/api/building-platform/v1/reprocessing/dry-run",
    databaseAccess: "one current version graph read",
    expectedReads: 1,
    expectedWrites: 0,
    activeStatus: "canonical_versioned_backend",
    classification: "explicit_user_read"
  }),
  Object.freeze({
    operation: "reprocessing_execute",
    frontendTrigger: "explicit one-project reprocessing execution",
    apiRoute: "/api/building-platform/v1/reprocessing/execute",
    databaseAccess: "one bounded immutable analysis/report transaction",
    expectedReads: 2,
    expectedWrites: 1,
    activeStatus: "canonical_versioned_backend",
    classification: "explicit_user_write"
  })
]);

export function getBuildingPlatformOperationInventory() {
  return {
    inventoryId: BUILDING_PLATFORM_OPERATION_INVENTORY_ID,
    operations: BUILDING_PLATFORM_OPERATION_INVENTORY,
    localFirstGuarantees: Object.freeze([
      "ordinary_edits_do_not_write_database",
      "unsaved_recalculation_does_not_write_database",
      "draft_save_is_explicit_and_mutable",
      "permanent_history_is_created_only_by_explicit_calculated_save",
      "canonical_reopen_reads_versioned_tables"
    ])
  };
}
