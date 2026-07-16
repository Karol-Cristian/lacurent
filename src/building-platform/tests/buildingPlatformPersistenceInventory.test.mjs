import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BUILDING_PLATFORM_VERSIONED_TABLES,
  getBuildingPlatformPersistenceInventory
} from "../index.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const migrationSql = [
  readFileSync(
  new URL("../../../migrations/010_building_platform_versioned_backend.sql", import.meta.url),
  "utf8"
  ),
  readFileSync(
    new URL("../../../migrations/011_building_platform_local_first_flow.sql", import.meta.url),
    "utf8"
  )
].join("\n");
const schemaSql = readFileSync(new URL("../../../schema.sql", import.meta.url), "utf8");

test("P3E persistence inventory distinguishes canonical versioned and legacy compatibility storage", () => {
  const inventory = getBuildingPlatformPersistenceInventory();

  assert.equal(
    inventory.inventoryId,
    "P3E_BUILDING_PLATFORM_VERSIONED_PERSISTENCE_INVENTORY_V1"
  );
  assert.equal(inventory.canonicalVersionedTables.length, 9);
  assert.equal(inventory.localFirstPolicy.mutableDraftsPerProjectOwner, 1);
  assert.equal(inventory.localFirstPolicy.ordinaryEditDatabaseWrites, 0);
  assert.equal(inventory.legacyTables.length >= 5, true);
  assert.equal(
    inventory.unsupportedDomainsExcluded.includes("primary_energy"),
    true
  );
  assert.equal(
    inventory.unsupportedDomainsExcluded.includes("certificate"),
    true
  );
});

test("versioned migration and base schema contain every canonical backend table and required field", () => {
  for (const table of BUILDING_PLATFORM_VERSIONED_TABLES) {
    assert.equal(
      migrationSql.includes(`CREATE TABLE IF NOT EXISTS ${table.table}`),
      true,
      `${table.table} missing from migration`
    );
    assert.equal(
      schemaSql.includes(`CREATE TABLE ${table.table}`),
      true,
      `${table.table} missing from schema.sql`
    );
    for (const field of table.requiredFields) {
      assert.equal(
        migrationSql.includes(field),
        true,
        `${field} missing from migration for ${table.table}`
      );
    }
  }
});

test("versioned migration includes required lookup, fingerprint and version-history indexes", () => {
  const requiredIndexes = [
    "building_platform_projects_owner_idx",
    "building_platform_projects_current_versions_idx",
    "building_platform_project_drafts_owner_idx",
    "building_platform_project_drafts_project_idx",
    "building_platform_project_drafts_expiry_idx",
    "building_dna_versions_project_idx",
    "building_dna_versions_fingerprint_idx",
    "building_platform_analysis_versions_project_idx",
    "building_platform_analysis_versions_dna_idx",
    "building_platform_analysis_versions_fingerprint_idx",
    "building_platform_report_versions_analysis_idx",
    "building_platform_climate_profile_versions_fingerprint_idx",
    "building_platform_scenarios_project_idx",
    "building_platform_audit_events_project_idx",
    "building_platform_idempotency_owner_idx"
  ];

  for (const indexName of requiredIndexes) {
    assert.equal(
      migrationSql.includes(indexName),
      true,
      `${indexName} missing from P3E migration`
    );
  }
});
