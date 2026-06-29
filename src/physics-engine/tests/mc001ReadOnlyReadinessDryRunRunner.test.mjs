import assert from "node:assert/strict";
import {
  runMc001ReadOnlyReadinessDryRun,
  MC001_READ_ONLY_READINESS_DRY_RUN_RUNNER_ID
} from "../mc001ReadOnlyReadinessDryRunRunner.mjs";
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
    "PHASE_DB3_READ_ONLY_DRY_RUN_RUNNER_TEST";
  inputPack.contractMetadata.contractVersion =
    "PHASE_DB3_READ_ONLY_READINESS_DRY_RUN_RUNNER";
  inputPack.contractMetadata.createdBy = "PHYSICS_ENGINE_PHASE_DB3_TEST";
  inputPack.huMultiComponentInventory = h2hInput.huMultiComponentInventory;
  inputPack.bztuDirectInputs = h2hInput.bztuDirectInputs;

  return inputPack;
}

function validSourceTrace(extra = {}) {
  return {
    source: "Phase DB3 explicit MC001 readiness mapping snapshot",
    sourceRefs: ["DB3_EXPLICIT_MC001_READINESS_MAPPING"],
    sourceLocator: {
      documentId: "DB3_READ_ONLY_SNAPSHOT",
      locator: "mc001Readiness"
    },
    traceId: "PHASE_DB3_EXPLICIT_MAPPING_TRACE_001",
    records: [
      {
        sourceIdentifier: "analysis_answers:analysis-db3-001:mc001_readiness",
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
      id: "analysis-db3-001",
      status: "completed"
    },
    building: {
      id: "building-db3-001"
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
        "analyses:analysis-db3-001",
        "buildings:building-db3-001"
      ]
    },
    mc001Readiness: {
      selectedAnalysisId: "analysis-db3-001",
      selectedBuildingId: "building-db3-001",
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

function run(snapshot, options = {}) {
  return runMc001ReadOnlyReadinessDryRun(snapshot, {
    registry: fixture025AuditorCoreReadinessOrchestrator.registry,
    ...options
  });
}

function diagnosticCodes(result) {
  return result.diagnostics.map((entry) => entry.code);
}

function blockerCodes(result) {
  return result.blockers.map((entry) => entry.diagnosticCode ?? entry.status);
}

function hasKeyDeep(value, forbiddenKey) {
  if (Array.isArray(value)) {
    return value.some((entry) => hasKeyDeep(entry, forbiddenKey));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, child]) => key === forbiddenKey || hasKeyDeep(child, forbiddenKey)
    );
  }
  return false;
}

function assertNoHuOrHtrResult(value) {
  for (const key of [
    "huResult",
    "htrResult",
    "qHndResult",
    "finalEnergyResult",
    "primaryEnergyResult",
    "co2Result",
    "certificateResult",
    "reportResult"
  ]) {
    assert.equal(hasKeyDeep(value, key), false, `${key} must not be exposed`);
  }
}

test("null snapshot returns blocked read-only dry-run report without orchestrator execution", () => {
  const result = runMc001ReadOnlyReadinessDryRun(null);

  assert.equal(result.runnerId, MC001_READ_ONLY_READINESS_DRY_RUN_RUNNER_ID);
  assert.equal(result.status, "blocked");
  assert.equal(result.dryRunStatus, "blocked_mapping_not_mappable");
  assert.equal(result.isReadOnlyDryRun, true);
  assert.equal(result.isMappableForHuInventoryReadiness, false);
  assert.equal(result.orchestratorStatus, "not_run");
  assert.equal(result.orchestratorReadiness, null);
  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(diagnosticCodes(result).includes("blocked_missing_saved_analysis_snapshot"));
  assertNoHuOrHtrResult(result);
});

test("generic saved app snapshot remains mapper-blocked without inferred readiness", () => {
  const result = run({
    analysis: {
      id: "analysis-generic-db3-001"
    },
    building: {
      id: "building-generic-db3-001",
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
      snapshotTimestamp: "2026-06-29T10:10:00.000Z",
      sourceIdentifiers: [
        "analysis_answers:analysis-generic-db3-001:attic"
      ]
    }
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.dryRunStatus, "blocked_mapping_not_mappable");
  assert.equal(result.mapperStatus, "blocked");
  assert.equal(result.orchestratorStatus, "not_run");
  assert.equal(result.isMappableForHuInventoryReadiness, false);
  assert.equal(result.readinessFlags.isHuInventoryReady, false);
  assert.ok(
    diagnosticCodes(result).includes("blocked_missing_explicit_mc001_readiness_mapping")
  );
  assert.ok(diagnosticCodes(result).includes("blocked_missing_ztu_zone_mapping"));
  assert.ok(diagnosticCodes(result).includes("blocked_missing_hu_inventory_mapping"));
  assert.ok(diagnosticCodes(result).includes("blocked_missing_u_value_path"));
  assert.ok(diagnosticCodes(result).includes("blocked_missing_bztu_path"));
  assertNoHuOrHtrResult(result);
});

test("incomplete explicit MC001 mapping preserves mapper blockers without fallback", () => {
  const result = run({
    analysis: {
      id: "analysis-incomplete-db3-001"
    },
    building: {
      id: "building-incomplete-db3-001"
    },
    mc001Readiness: {
      selectedAnalysisId: "analysis-incomplete-db3-001",
      selectedBuildingId: "building-incomplete-db3-001",
      snapshotTimestamp: "2026-06-29T10:20:00.000Z",
      zoneMapping: {
        conditionedZones: [{ zoneId: "fixture-029-conditioned-zone" }]
      },
      huMultiComponentInventory: {
        month: 1,
        expectedComponents: [],
        componentCandidates: [],
        sourceTrace: validSourceTrace({
          traceId: "PHASE_DB3_INCOMPLETE_HU_INVENTORY_TRACE"
        })
      },
      sourceTrace: validSourceTrace({
        traceId: "PHASE_DB3_INCOMPLETE_MAPPING_TRACE"
      })
    }
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.orchestratorStatus, "not_run");
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.ok(diagnosticCodes(result).includes("blocked_missing_ztu_zone_mapping"));
  assert.ok(
    diagnosticCodes(result).includes("blocked_missing_expected_hu_component_inventory")
  );
  assert.ok(diagnosticCodes(result).includes("blocked_missing_bztu_path"));
  assert.equal(result.blockers.every((entry) => entry.value === null), true);
  assertNoHuOrHtrResult(result);
});

test("valid explicit mapping runs existing orchestrator and exposes diagnostics only", () => {
  const result = run(validSnapshot());

  assert.equal(result.status, "completed");
  assert.equal(result.dryRunStatus, "completed_with_blockers");
  assert.equal(result.mapperStatus, "ready_for_hu_inventory_readiness_input");
  assert.equal(result.isMappableForHuInventoryReadiness, true);
  assert.equal(
    result.orchestratorReadiness.huMultiComponentInventoryReadiness.inventoryStatus,
    "ready_hu_component_inventory"
  );
  assert.equal(result.readinessFlags.isHuInventoryReady, true);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.readinessFlags.isHeatLossReady, false);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "hu_component_contract_readiness_only")
  );
  assertNoHuOrHtrResult(result);
});

test("source trace is sanitized and does not echo raw personal snapshot context", () => {
  const snapshot = validSnapshot({
    sourceContext: {
      snapshotTimestamp: "2026-06-29T10:30:00.000Z",
      sourceIdentifiers: [
        "analyses:analysis-db3-001",
        "buildings:building-db3-001"
      ],
      userEmail: "person@example.com",
      ownerName: "Example Owner",
      address: "123 Private Street",
      phone: "+40000000000",
      notes: "free text private note",
      rawAnswerValue: "private answer value"
    }
  });

  const result = run(snapshot);
  const serialized = JSON.stringify(result);

  assert.ok(
    result.sourceTrace.mapper.records.some(
      (record) =>
        record.sourceType === "saved_analysis_snapshot" &&
        record.timestamp === "2026-06-29T10:30:00.000Z"
    )
  );
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("Example Owner"), false);
  assert.equal(serialized.includes("123 Private Street"), false);
  assert.equal(serialized.includes("+40000000000"), false);
  assert.equal(serialized.includes("free text private note"), false);
  assert.equal(serialized.includes("private answer value"), false);
  assert.equal(serialized.includes("sourceContext"), false);
  assert.ok(
    result.privacyWarnings.some((entry) => entry.code === "source_context_sanitized")
  );
});

test("sensitive source identifiers are omitted from DB3 dry-run output", () => {
  const snapshot = validSnapshot({
    sourceContext: {
      snapshotTimestamp: "2026-06-29T10:35:00.000Z",
      sourceIdentifiers: [
        "person@example.com",
        "John Doe",
        "Strada Exemplu 12",
        "+40722111222",
        "free text note about the owner",
        "analysis:analysis-001"
      ]
    },
    rawSnapshot: {
      ownerNote: "raw snapshot private payload"
    }
  });

  const result = run(snapshot);
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("John Doe"), false);
  assert.equal(serialized.includes("Strada Exemplu"), false);
  assert.equal(serialized.includes("+40722111222"), false);
  assert.equal(serialized.includes("free text note"), false);
  assert.equal(serialized.includes("raw snapshot private payload"), false);
  assert.equal(serialized.includes("sourceContext"), false);
  assert.equal(serialized.includes("rawSnapshot"), false);
  assert.ok(
    result.sourceTrace.mapper.records.some((record) =>
      record.sourceIdentifiers?.includes("analysis:analysis-001")
    )
  );
  assert.ok(
    result.privacyWarnings.some(
      (entry) => entry.code === "source_identifiers_sanitized"
    )
  );
});

test("source context scalar fields use strict privacy validation", () => {
  const unsafeSnapshot = validSnapshot({
    sourceContext: {
      analysisId: "JohnDoeAnalysis",
      buildingId: "Strada.Exemplu.12",
      houseId: "person-name",
      snapshotId: "owner-snapshot",
      sourceType: "+40722111222",
      sourceTable: "JohnDoe",
      sourceField: "private-note",
      sourceRecordId: "person@example.com",
      sourceIdentifiers: [
        "person@example.com",
        "John Doe",
        "analysis:analysis-001"
      ]
    }
  });

  const unsafeResult = run(unsafeSnapshot);
  const unsafeSerialized = JSON.stringify(unsafeResult);

  assert.equal(unsafeSerialized.includes("JohnDoeAnalysis"), false);
  assert.equal(unsafeSerialized.includes("Strada.Exemplu.12"), false);
  assert.equal(unsafeSerialized.includes("person-name"), false);
  assert.equal(unsafeSerialized.includes("owner-snapshot"), false);
  assert.equal(unsafeSerialized.includes("+40722111222"), false);
  assert.equal(unsafeSerialized.includes("JohnDoe"), false);
  assert.equal(unsafeSerialized.includes("private-note"), false);
  assert.equal(unsafeSerialized.includes("person@example.com"), false);
  assert.equal(unsafeSerialized.includes("John Doe"), false);
  assert.ok(
    unsafeResult.privacyWarnings.some(
      (entry) => entry.code === "source_context_sanitized"
    )
  );

  const safeSnapshot = validSnapshot({
    sourceContext: {
      analysisId: "analysis:analysis-001",
      buildingId: "building:building-001",
      houseId: "house:house-001",
      snapshotId: "snapshot:snapshot-001",
      sourceType: "saved_analysis_snapshot",
      sourceTable: "analysis_answers",
      sourceField: "mc001Readiness",
      sourceRecordId: "record:record-001",
      sourceIdentifiers: [
        "analysis:analysis-001",
        "record:record-001"
      ]
    }
  });

  const safeResult = run(safeSnapshot);
  const safeSerialized = JSON.stringify(safeResult);

  assert.equal(safeSerialized.includes("analysis:analysis-001"), true);
  assert.equal(safeSerialized.includes("building:building-001"), true);
  assert.equal(safeSerialized.includes("house:house-001"), true);
  assert.equal(safeSerialized.includes("snapshot:snapshot-001"), true);
  assert.equal(safeSerialized.includes("saved_analysis_snapshot"), true);
  assert.equal(safeSerialized.includes("analysis_answers"), true);
  assert.equal(safeSerialized.includes("mc001Readiness"), true);
  assert.equal(safeSerialized.includes("record:record-001"), true);
});

test("explicit source trace records are sanitized before DB3 dry-run output", () => {
  const snapshot = validSnapshot();
  snapshot.mc001Readiness.sourceTrace = {
    records: [
      {
        sourceType: "+40722111222",
        sourceTable: "JohnDoe",
        sourceField: "Strada.Exemplu.12",
        traceId: "private-note",
        componentId: "person-name",
        inventoryComponentId: "owner-component",
        recordId: "private-record",
        ztuZoneId: "john-house-zone",
        analysisId: "JohnDoeAnalysis",
        buildingId: "Strada.Exemplu.12",
        snapshotId: "owner-snapshot",
        sourceIdentifier: "person@example.com",
        sourceRecordId: "record-JohnDoe",
        source: "John Doe",
        sourceRefs: ["JohnDoe", "Strada Exemplu 12", "+40722111222"],
        sourceLocator: {
          note: "free text note about the owner",
          page: 95,
          section: "MC001-Hu"
        }
      },
      {
        sourceRecordId: "record-001"
      },
      {
        sourceIdentifier: "analysis:analysis-001",
        sourceType: "saved_analysis_snapshot",
        sourceTable: "analysis_answers",
        sourceField: "mc001Readiness",
        traceId: "trace:trace-001",
        componentId: "component:component-001",
        inventoryComponentId: "inventory-component:inventory-001",
        recordId: "record:record-001",
        ztuZoneId: "ztu:ztu-001",
        analysisId: "analysis:analysis-001",
        buildingId: "building:building-001",
        snapshotId: "snapshot:snapshot-001",
        sourceRecordId: "record:record-001",
        timestamp: "2026-06-29T00:00:00.000Z",
        sourceRefs: ["record:record-001"],
        sourceLocator: {
          page: 95,
          section: "MC001-Hu"
        }
      }
    ]
  };

  const result = run(snapshot);
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(serialized.includes("John Doe"), false);
  assert.equal(serialized.includes("JohnDoe"), false);
  assert.equal(serialized.includes("Strada Exemplu"), false);
  assert.equal(serialized.includes("Strada.Exemplu.12"), false);
  assert.equal(serialized.includes("+40722111222"), false);
  assert.equal(serialized.includes("free text note"), false);
  assert.equal(serialized.includes("private-note"), false);
  assert.equal(serialized.includes("person-name"), false);
  assert.equal(serialized.includes("owner-component"), false);
  assert.equal(serialized.includes("private-record"), false);
  assert.equal(serialized.includes("john-house-zone"), false);
  assert.equal(serialized.includes("JohnDoeAnalysis"), false);
  assert.equal(serialized.includes("owner-snapshot"), false);
  assert.equal(serialized.includes("record-JohnDoe"), false);
  assert.equal(serialized.includes("rawSnapshot"), false);
  assert.equal(serialized.includes("sourceContext"), false);
  assert.equal(
    result.sourceTrace.mapper.records.some(
      (record) => record.sourceRecordId === "record-JohnDoe"
    ),
    false
  );
  assert.equal(
    result.sourceTrace.mapper.records.some(
      (record) => record.sourceRecordId === "record-001"
    ),
    false
  );
  assert.ok(
    result.sourceTrace.mapper.records.some(
      (record) =>
        record.sourceIdentifier === "analysis:analysis-001" &&
        record.sourceType === "saved_analysis_snapshot" &&
        record.sourceTable === "analysis_answers" &&
        record.sourceField === "mc001Readiness" &&
        record.traceId === "trace:trace-001" &&
        record.componentId === "component:component-001" &&
        record.inventoryComponentId === "inventory-component:inventory-001" &&
        record.recordId === "record:record-001" &&
        record.ztuZoneId === "ztu:ztu-001" &&
        record.analysisId === "analysis:analysis-001" &&
        record.buildingId === "building:building-001" &&
        record.snapshotId === "snapshot:snapshot-001" &&
        record.sourceRecordId === "record:record-001" &&
        record.timestamp === "2026-06-29T00:00:00.000Z" &&
        record.sourceRefs?.includes("record:record-001") &&
        record.sourceLocator?.page === 95 &&
        record.sourceLocator?.section === "MC001-Hu"
    )
  );
  assert.ok(
    result.privacyWarnings.some((entry) => entry.code === "source_trace_sanitized")
  );
});

test("runner does not mutate the input snapshot", () => {
  const snapshot = validSnapshot();
  const before = clone(snapshot);
  deepFreeze(snapshot);

  const result = run(snapshot);

  assert.equal(result.isMappableForHuInventoryReadiness, true);
  assert.deepEqual(snapshot, before);
});

test("runner output declares diagnostics-only no DB API Worker product behavior", () => {
  const result = run(validSnapshot());

  assert.equal(result.reportScope.diagnosticsOnly, true);
  assert.equal(result.reportScope.noDbRead, true);
  assert.equal(result.reportScope.noDbWrite, true);
  assert.equal(result.reportScope.noApiOrWorkerCall, true);
  assert.equal(result.reportScope.noProductOrReportOutput, true);
  assert.equal(result.reportScope.noNumericalHuOrHtr, true);
});
