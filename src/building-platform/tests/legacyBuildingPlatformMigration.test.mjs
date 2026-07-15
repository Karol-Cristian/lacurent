import assert from "node:assert/strict";
import {
  LEGACY_BUILDING_PLATFORM_KEYS,
  createBuildingDnaFromAssistedAnswers,
  createLegacyBuildingDnaMigrationDraft,
  inspectLegacyBuildingPlatformRecord
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

function legacyBuildingDna() {
  const result = createBuildingDnaFromAssistedAnswers({
    buildingId: "p3e-legacy-house",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: "eps",
      wallInsulationThicknessM: 0.1,
      windowsReplaced: true
    },
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      windowAreaM2: 18,
      averageRoomHeightM: 2.7,
      ventilationAch: 0.5,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationType: "natural"
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    climateProfileId: "ro_synthetic_bucharest_seasonal_demo_v1",
    allowSyntheticClimate: true,
    source: { reference: "P3E.test.legacy_migration" }
  });
  assert.equal(result.status, "ready");
  return result.buildingDna;
}

test("legacy migration boundary rejects records without canonical Building DNA", () => {
  const inspection = inspectLegacyBuildingPlatformRecord({
    analysis: { id: 10, house_id: 2 },
    answers: {}
  });

  assert.equal(inspection.status, "incompatible_legacy_data");
  assert.equal(
    inspection.diagnostics.some((item) => item.code === "legacy_record_missing_canonical_building_dna"),
    true
  );
});

test("legacy migration boundary marks partial records for confirmation without recalculation", () => {
  const inspection = inspectLegacyBuildingPlatformRecord({
    analysis: { id: 10, house_id: 2 },
    answers: {
      [LEGACY_BUILDING_PLATFORM_KEYS.buildingDna]: legacyBuildingDna()
    }
  });

  assert.equal(inspection.status, "requires_user_confirmation");
  assert.equal(inspection.mappedFields.buildingDna, true);
  assert.equal(inspection.mappedFields.engineOutput, false);
  assert.equal(
    inspection.methodologyLimits.includes("no_legacy_physics_recalculation"),
    true
  );
});

test("legacy migration boundary creates a draft only from compatible Building DNA blobs", () => {
  const buildingDna = legacyBuildingDna();
  const draft = createLegacyBuildingDnaMigrationDraft({
    analysis: { id: 11, house_id: 3 },
    answers: {
      [LEGACY_BUILDING_PLATFORM_KEYS.buildingDna]: buildingDna,
      [LEGACY_BUILDING_PLATFORM_KEYS.versionMeta]: {
        fingerprints: {
          buildingDnaFingerprint: "dna_fixed"
        }
      },
      [LEGACY_BUILDING_PLATFORM_KEYS.engineInput]: { mode: "chapter_2_useful_demand_explicit_v1" },
      [LEGACY_BUILDING_PLATFORM_KEYS.engineOutput]: { status: "ready" },
      [LEGACY_BUILDING_PLATFORM_KEYS.reportModel]: { chapters: [] }
    }
  });

  assert.equal(draft.status, "ready_to_reprocess");
  assert.equal(draft.sourceLegacyAnalysisId, 11);
  assert.equal(draft.sourceLegacyHouseId, 3);
  assert.equal(draft.buildingDnaDraft.schema, "building_dna_v1");
});
