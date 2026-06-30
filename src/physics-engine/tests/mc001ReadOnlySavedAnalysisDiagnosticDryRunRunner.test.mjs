import assert from "node:assert/strict";
import fs from "node:fs";
import {
  runMc001ReadOnlySavedAnalysisDiagnosticDryRun,
  MC001_READ_ONLY_SAVED_ANALYSIS_DIAGNOSTIC_DRY_RUN_RUNNER_ID
} from "../mc001ReadOnlySavedAnalysisDiagnosticDryRunRunner.mjs";
import { MC001_READ_ONLY_DRY_RUN_DIAGNOSTIC_CONTRACT_SCHEMA_VERSION } from "../mc001ReadOnlyDryRunDiagnosticContract.mjs";
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
    "PHASE_DB5_SAVED_ANALYSIS_DIAGNOSTIC_DRY_RUN_TEST";
  inputPack.contractMetadata.contractVersion =
    "PHASE_DB5_READ_ONLY_SAVED_ANALYSIS_DIAGNOSTIC_DRY_RUN_RUNNER";
  inputPack.contractMetadata.createdBy = "PHYSICS_ENGINE_PHASE_DB5_TEST";
  inputPack.huMultiComponentInventory = h2hInput.huMultiComponentInventory;
  inputPack.bztuDirectInputs = h2hInput.bztuDirectInputs;

  return inputPack;
}

function validSourceTrace(extra = {}) {
  return {
    source: "Phase DB5 explicit MC001 readiness mapping snapshot",
    sourceRefs: ["DB5_EXPLICIT_MC001_READINESS_MAPPING"],
    sourceLocator: {
      documentId: "DB5_READ_ONLY_SNAPSHOT",
      locator: "mc001Readiness"
    },
    traceId: "PHASE_DB5_EXPLICIT_MAPPING_TRACE_001",
    records: [
      {
        sourceIdentifier: "analysis:analysis-db5-001",
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
      id: "analysis-db5-001",
      status: "completed"
    },
    building: {
      id: "building-db5-001"
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
        "analysis:analysis-db5-001",
        "building:building-db5-001"
      ]
    },
    mc001Readiness: {
      selectedAnalysisId: "analysis-db5-001",
      selectedBuildingId: "building-db5-001",
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
  return runMc001ReadOnlySavedAnalysisDiagnosticDryRun(snapshot, {
    registry: fixture025AuditorCoreReadinessOrchestrator.registry,
    ...options
  });
}

function serialized(value) {
  return JSON.stringify(value);
}

function diagnosticCodes(contract, section) {
  return contract.diagnostics[section].map((entry) => entry.code);
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

function assertDb4Contract(contract) {
  assert.equal(
    contract.schemaVersion,
    MC001_READ_ONLY_DRY_RUN_DIAGNOSTIC_CONTRACT_SCHEMA_VERSION
  );
  assert.equal(contract.isReadOnlyDiagnosticContract, true);
  assert.equal("pipelineStage" in contract, false);
  assert.equal(
    "runnerId" in contract,
    false,
    `${MC001_READ_ONLY_SAVED_ANALYSIS_DIAGNOSTIC_DRY_RUN_RUNNER_ID} must not add a wrapper`
  );
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

function assertDiagnosticsOnly(contract) {
  assert.equal(contract.readiness.isCompleteHuReady, false);
  assert.equal(contract.readiness.isCompleteHtrReady, false);
  assert.equal(contract.readiness.hasHuResult, false);
  assert.equal(contract.readiness.hasHtrResult, false);
  assert.equal(contract.readiness.downstreamReadiness, false);
  assert.equal(contract.contractScope.diagnosticsOnly, true);
  assert.equal(contract.contractScope.noDbRead, true);
  assert.equal(contract.contractScope.noDbWrite, true);
  assert.equal(contract.contractScope.noApiOrWorkerCall, true);
  assert.equal(contract.contractScope.noProductOrReportOutput, true);
  assert.equal(contract.contractScope.noNumericalHuOrHtr, true);
  assertNoHuOrHtrResult(contract);
}

function assertNoRawOrPersonalOutput(contract) {
  const output = serialized(contract);
  for (const forbidden of [
    "person@example.com",
    "John Doe",
    "Strada Exemplu 12",
    "+40722111222",
    "free text note about the owner",
    "record-JohnDoe",
    "record-001",
    "owner-snapshot",
    "private-note",
    "person-name",
    "raw answer",
    "rawSnapshot",
    "sourceContext",
    "sourceTrace",
    "sourceLocator",
    "sourceRefs",
    "sourceRecordId"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

test("invalid snapshots return DB4-compatible privacy-safe contracts", () => {
  for (const input of [null, undefined, "not a snapshot", []]) {
    const contract = runMc001ReadOnlySavedAnalysisDiagnosticDryRun(input);

    assertDb4Contract(contract);
    assert.equal(contract.status, "blocked");
    assert.equal(contract.pipeline.mapper.status, "blocked");
    assert.equal(contract.pipeline.mapper.isMappableForHuInventoryReadiness, false);
    assert.equal(contract.pipeline.orchestrator.ran, false);
    assert.equal(contract.pipeline.orchestrator.status, "not_run");
    assertDiagnosticsOnly(contract);
    assertNoRawOrPersonalOutput(contract);
  }
});

test("generic saved app snapshot stays blocked without inferred readiness", () => {
  const contract = run({
    analysis: {
      id: "analysis-generic-db5-001"
    },
    building: {
      id: "building-generic-db5-001",
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
      sourceIdentifiers: ["analysis:analysis-generic-db5-001"]
    }
  });

  assertDb4Contract(contract);
  assert.equal(contract.status, "blocked");
  assert.equal(contract.pipeline.mapper.status, "blocked");
  assert.equal(contract.pipeline.mapper.isMappableForHuInventoryReadiness, false);
  assert.equal(contract.pipeline.orchestrator.ran, false);
  assert.equal(contract.readiness.isHuInventoryReady, false);
  assert.ok(
    diagnosticCodes(contract, "gaps").includes(
      "blocked_missing_explicit_mc001_readiness_mapping"
    )
  );
  assert.ok(diagnosticCodes(contract, "gaps").includes("blocked_missing_ztu_zone_mapping"));
  assert.ok(
    diagnosticCodes(contract, "gaps").includes("blocked_missing_hu_inventory_mapping")
  );
  assertDiagnosticsOnly(contract);
  assertNoRawOrPersonalOutput(contract);
});

test("incomplete explicit MC001 mapping returns sanitized blockers and gaps", () => {
  const contract = run({
    analysis: {
      id: "analysis-incomplete-db5-001"
    },
    building: {
      id: "building-incomplete-db5-001"
    },
    mc001Readiness: {
      selectedAnalysisId: "analysis-incomplete-db5-001",
      selectedBuildingId: "building-incomplete-db5-001",
      snapshotTimestamp: "2026-06-29T10:20:00.000Z",
      zoneMapping: {
        conditionedZones: [{ zoneId: "fixture-029-conditioned-zone" }]
      },
      huMultiComponentInventory: {
        month: 1,
        expectedComponents: [],
        componentCandidates: [],
        sourceTrace: validSourceTrace({
          traceId: "PHASE_DB5_INCOMPLETE_HU_INVENTORY_TRACE"
        })
      },
      sourceTrace: validSourceTrace({
        traceId: "PHASE_DB5_INCOMPLETE_MAPPING_TRACE"
      })
    }
  });

  assertDb4Contract(contract);
  assert.equal(contract.status, "blocked");
  assert.equal(contract.pipeline.mapper.isMappableForHuInventoryReadiness, false);
  assert.equal(contract.pipeline.orchestrator.ran, false);
  assert.ok(contract.counts.blockers > 0);
  assert.ok(contract.counts.gaps > 0);
  assert.ok(
    diagnosticCodes(contract, "gaps").every((code) => !code.includes("PHASE_DB5"))
  );
  assertDiagnosticsOnly(contract);
});

test("valid explicit mapping returns conservative DB4 diagnostics-only contract", () => {
  const contract = run(validSnapshot());

  assertDb4Contract(contract);
  assert.equal(contract.pipeline.mapper.status, "ready_for_hu_inventory_readiness_input");
  assert.equal(contract.pipeline.mapper.isMappableForHuInventoryReadiness, true);
  assert.equal(contract.pipeline.orchestrator.ran, false);
  assert.equal(contract.pipeline.orchestrator.status, "not_run");
  assert.equal(contract.readiness.isCompleteHuReady, false);
  assert.equal(contract.readiness.isCompleteHtrReady, false);
  assert.equal(contract.readiness.hasHuResult, false);
  assert.equal(contract.readiness.hasHtrResult, false);
  assert.equal(contract.readiness.downstreamReadiness, false);
  assert.equal(contract.status, "blocked");
  assert.ok(diagnosticCodes(contract, "blockers").includes("unknown_blocker"));
  assertDiagnosticsOnly(contract);
});

test("privacy adversarial snapshot does not leak raw or personal data", () => {
  const snapshot = validSnapshot({
    sourceContext: {
      analysisId: "JohnDoeAnalysis",
      buildingId: "Strada Exemplu 12",
      snapshotId: "owner-snapshot",
      sourceType: "+40722111222",
      sourceField: "private-note",
      sourceRecordId: "person@example.com",
      sourceIdentifiers: [
        "person@example.com",
        "John Doe",
        "record-JohnDoe",
        "record-001",
        "analysis:analysis-db5-001"
      ]
    },
    rawSnapshot: {
      answers: {
        ownerName: "John Doe",
        ownerEmail: "person@example.com",
        ownerPhone: "+40722111222",
        ownerAddress: "Strada Exemplu 12",
        note: "free text note about the owner"
      }
    }
  });
  snapshot.mc001Readiness.sourceTrace.records = [
    {
      sourceIdentifier: "person@example.com",
      sourceType: "+40722111222",
      sourceTable: "JohnDoe",
      sourceField: "private-note",
      sourceRecordId: "record-JohnDoe",
      traceId: "person-name",
      sourceRefs: ["record-001", "Strada Exemplu 12"],
      sourceLocator: {
        note: "free text note about the owner",
        page: 95,
        section: "MC001-Hu"
      }
    }
  ];

  const contract = run(snapshot);

  assertDb4Contract(contract);
  assertNoRawOrPersonalOutput(contract);
  assert.ok(
    diagnosticCodes(contract, "warnings").includes("diagnostic_content_sanitized") ||
      diagnosticCodes(contract, "warnings").includes("source_context_sanitized") ||
      diagnosticCodes(contract, "warnings").includes("source_trace_sanitized")
  );
});

test("DB5 runner does not mutate the input snapshot", () => {
  const snapshot = validSnapshot();
  const before = clone(snapshot);
  deepFreeze(snapshot);

  const contract = run(snapshot);

  assert.equal(contract.pipeline.mapper.isMappableForHuInventoryReadiness, true);
  assert.deepEqual(snapshot, before);
});

test("DB5 runtime imports only DB3 and DB4 readiness modules", () => {
  const moduleSource = fs.readFileSync(
    new URL("../mc001ReadOnlySavedAnalysisDiagnosticDryRunRunner.mjs", import.meta.url),
    "utf8"
  );
  const importLines = moduleSource
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("import "));

  assert.deepEqual(importLines, [
    'import { buildMc001ReadOnlyDryRunDiagnosticContract } from "./mc001ReadOnlyDryRunDiagnosticContract.mjs";',
    'import { runMc001ReadOnlyReadinessDryRun } from "./mc001ReadOnlyReadinessDryRunRunner.mjs";'
  ]);

  assert.equal(moduleSource.includes("fetch("), false, "network usage leaked");
});
