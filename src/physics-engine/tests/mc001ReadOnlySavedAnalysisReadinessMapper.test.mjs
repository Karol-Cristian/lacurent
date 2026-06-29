import assert from "node:assert/strict";
import { createMc001AuditorCoreReadinessOrchestrator } from "../mc001AuditorCoreReadinessOrchestrator.mjs";
import {
  mapSavedAnalysisSnapshotToMc001ReadinessInput,
  MC001_READ_ONLY_SAVED_ANALYSIS_READINESS_MAPPER_ID
} from "../mc001ReadOnlySavedAnalysisReadinessMapper.mjs";
import { fixture025AuditorCoreReadinessOrchestrator } from "./validation/fixture025AuditorCoreReadinessOrchestrator.mjs";
import { fixture029HuMultiComponentInventoryReadinessGate } from "./validation/fixture029HuMultiComponentInventoryReadinessGate.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function validReadinessInput() {
  const inputPack = clone(fixture025AuditorCoreReadinessOrchestrator.inputPack);
  const h2hInput = clone(fixture029HuMultiComponentInventoryReadinessGate.inputPack);

  inputPack.contractMetadata.contractId =
    "PHASE_DB2_READ_ONLY_SAVED_ANALYSIS_MAPPER_TEST";
  inputPack.contractMetadata.contractVersion =
    "PHASE_DB2_READ_ONLY_READINESS_MAPPING_ADAPTER_SCAFFOLD";
  inputPack.contractMetadata.createdBy = "PHYSICS_ENGINE_PHASE_DB2_TEST";
  inputPack.huMultiComponentInventory = h2hInput.huMultiComponentInventory;
  inputPack.bztuDirectInputs = h2hInput.bztuDirectInputs;

  return inputPack;
}

function validSourceTrace(extra = {}) {
  return {
    source: "Phase DB2 explicit MC001 readiness mapping snapshot",
    sourceRefs: ["DB2_EXPLICIT_MC001_READINESS_MAPPING"],
    sourceLocator: {
      documentId: "DB2_READ_ONLY_SNAPSHOT",
      locator: "mc001Readiness"
    },
    traceId: "PHASE_DB2_EXPLICIT_MAPPING_TRACE_001",
    records: [
      {
        sourceIdentifier: "analysis_answers:analysis-db2-001:mc001_readiness",
        sourceType: "saved_analysis_snapshot"
      }
    ],
    ...extra
  };
}

function validSnapshot(extra = {}) {
  const readinessInput = validReadinessInput();

  return {
    analysis: {
      id: "analysis-db2-001",
      status: "completed"
    },
    building: {
      id: "building-db2-001"
    },
    answers: {
      attic: "yes",
      garage: "yes"
    },
    profiles: {
      building_features: {
        attic: true,
        garage: true
      }
    },
    sourceContext: {
      snapshotTimestamp: "2026-06-29T10:00:00.000Z",
      sourceIdentifiers: [
        "analyses:analysis-db2-001",
        "buildings:building-db2-001"
      ]
    },
    mc001Readiness: {
      selectedAnalysisId: "analysis-db2-001",
      selectedBuildingId: "building-db2-001",
      snapshotTimestamp: "2026-06-29T10:00:00.000Z",
      zoneMapping: {
        conditionedZones: [{ zoneId: "fixture-029-conditioned-zone" }],
        ztuZones: [{ ztuZoneId: "fixture-029-ztu-buffer-zone" }]
      },
      huMultiComponentInventory: readinessInput.huMultiComponentInventory,
      bztuDirectInputs: readinessInput.bztuDirectInputs,
      sourceTrace: validSourceTrace(),
      readinessInput
    },
    ...clone(extra)
  };
}

function diagnosticCodes(result) {
  return result.diagnostics.map((entry) => entry.code);
}

function assertNoHuOrHtrResult(value) {
  assert.equal("huResult" in value, false);
  assert.equal("htrResult" in value, false);
  assert.equal("Hu" in value, false);
  assert.equal("Htr" in value, false);
}

test("null snapshot is blocked without usable readiness input", () => {
  const result = mapSavedAnalysisSnapshotToMc001ReadinessInput(null);

  assert.equal(
    result.mapperId,
    MC001_READ_ONLY_SAVED_ANALYSIS_READINESS_MAPPER_ID
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.isMappableForHuInventoryReadiness, false);
  assert.equal(result.readinessInput, null);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(diagnosticCodes(result).includes("blocked_missing_saved_analysis_snapshot"));
  assertNoHuOrHtrResult(result);
});

test("generic saved app snapshot is not inferred into MC001 Hu readiness mapping", () => {
  const result = mapSavedAnalysisSnapshotToMc001ReadinessInput({
    analysis: {
      id: "analysis-generic-001"
    },
    building: {
      id: "building-generic-001",
      area: 120
    },
    answers: {
      attic: "yes",
      basement: "no",
      wall_material: "brick"
    },
    profiles: {
      building_features: {
        attic: true
      },
      envelope_profiles: {
        wall_material: "brick",
        wall_insulation: "some"
      }
    },
    sourceContext: {
      sourceIdentifiers: [
        "analysis_answers:analysis-generic-001:attic",
        "envelope_profiles:building-generic-001:wall_material"
      ]
    }
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.isMappableForHuInventoryReadiness, false);
  assert.equal(result.readinessInput, null);
  assert.ok(
    diagnosticCodes(result).includes("blocked_missing_explicit_mc001_readiness_mapping")
  );
  assert.ok(diagnosticCodes(result).includes("blocked_missing_ztu_zone_mapping"));
  assert.ok(diagnosticCodes(result).includes("blocked_missing_hu_inventory_mapping"));
  assert.ok(diagnosticCodes(result).includes("blocked_missing_u_value_path"));
  assert.ok(diagnosticCodes(result).includes("blocked_missing_bztu_path"));
  assertNoHuOrHtrResult(result);
});

test("explicit but incomplete MC001 mapping fails closed without fallback values", () => {
  const result = mapSavedAnalysisSnapshotToMc001ReadinessInput({
    analysis: {
      id: "analysis-incomplete-001"
    },
    building: {
      id: "building-incomplete-001"
    },
    mc001Readiness: {
      selectedAnalysisId: "analysis-incomplete-001",
      selectedBuildingId: "building-incomplete-001",
      snapshotTimestamp: "2026-06-29T10:00:00.000Z",
      zoneMapping: {
        conditionedZones: [{ zoneId: "fixture-029-conditioned-zone" }]
      },
      huMultiComponentInventory: {
        month: 1,
        expectedComponents: [],
        componentCandidates: [],
        sourceTrace: validSourceTrace({
          traceId: "PHASE_DB2_INCOMPLETE_HU_INVENTORY_TRACE"
        })
      },
      sourceTrace: validSourceTrace({
        traceId: "PHASE_DB2_INCOMPLETE_MAPPING_TRACE"
      })
    }
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.isMappableForHuInventoryReadiness, false);
  assert.equal(result.readinessInput, null);
  assert.ok(diagnosticCodes(result).includes("blocked_missing_ztu_zone_mapping"));
  assert.ok(
    diagnosticCodes(result).includes("blocked_missing_expected_hu_component_inventory")
  );
  assert.ok(
    diagnosticCodes(result).includes("blocked_missing_actual_hu_component_inventory")
  );
  assert.ok(diagnosticCodes(result).includes("blocked_missing_bztu_path"));
  assert.ok(diagnosticCodes(result).includes("blocked_missing_orchestrator_readiness_input"));
  assert.equal(result.blockers.every((blocker) => blocker.value === null), true);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assertNoHuOrHtrResult(result);
});

test("valid explicit MC001 mapping returns H2I-compatible readiness input", () => {
  const result = mapSavedAnalysisSnapshotToMc001ReadinessInput(validSnapshot());

  assert.equal(result.status, "ready_for_hu_inventory_readiness_input");
  assert.equal(result.isMappableForHuInventoryReadiness, true);
  assert.ok(result.readinessInput);
  assert.ok(result.readinessInput.huMultiComponentInventory);
  assert.ok(Array.isArray(result.readinessInput.bztuDirectInputs));
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assertNoHuOrHtrResult(result);
  assertNoHuOrHtrResult(result.readinessInput);

  const orchestratorResult = createMc001AuditorCoreReadinessOrchestrator(
    result.readinessInput,
    {
      registry: fixture025AuditorCoreReadinessOrchestrator.registry
    }
  );

  assert.equal(orchestratorResult.readinessFlags.isHuInventoryReady, true);
  assert.equal(orchestratorResult.readinessFlags.isCompleteHuReady, false);
  assert.equal(orchestratorResult.readinessFlags.isCompleteHtrReady, false);
  assert.equal(orchestratorResult.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(orchestratorResult.readinessFlags.isQhndReady, false);
  assert.equal(orchestratorResult.readinessFlags.isCpeReady, false);
  assert.equal("huResult" in orchestratorResult.huMultiComponentInventoryReadiness, false);
  assert.equal("htrResult" in orchestratorResult.huMultiComponentInventoryReadiness, false);
});

test("source trace and saved snapshot lineage are preserved", () => {
  const result = mapSavedAnalysisSnapshotToMc001ReadinessInput(validSnapshot());

  assert.ok(
    result.sourceTrace.records.some(
      (record) =>
        record.sourceType === "saved_analysis_snapshot" &&
        record.analysisId === "analysis-db2-001" &&
        record.buildingId === "building-db2-001"
    )
  );
  assert.ok(
    result.sourceTrace.records.some(
      (record) =>
        record.sourceType === "explicit_mc001_readiness_mapping" &&
        record.traceId === "PHASE_DB2_EXPLICIT_MAPPING_TRACE_001"
    )
  );
  assert.ok(
    result.sourceTrace.records.some(
      (record) =>
        record.sourceIdentifier === "analysis_answers:analysis-db2-001:mc001_readiness"
    )
  );
});

test("mapper does not mutate the input snapshot", () => {
  const snapshot = validSnapshot();
  const before = clone(snapshot);
  deepFreeze(snapshot);

  const result = mapSavedAnalysisSnapshotToMc001ReadinessInput(snapshot);

  assert.equal(result.isMappableForHuInventoryReadiness, true);
  assert.deepEqual(snapshot, before);
});
