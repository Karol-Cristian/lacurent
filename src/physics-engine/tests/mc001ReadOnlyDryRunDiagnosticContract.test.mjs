import assert from "node:assert/strict";
import {
  buildMc001ReadOnlyDryRunDiagnosticContract,
  MC001_READ_ONLY_DRY_RUN_DIAGNOSTIC_CONTRACT_SCHEMA_VERSION
} from "../mc001ReadOnlyDryRunDiagnosticContract.mjs";

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

function buildBlockedDryRun(extra = {}) {
  return {
    status: "blocked",
    dryRunStatus: "blocked_mapping_not_mappable",
    isReadOnlyDryRun: true,
    mapperStatus: "blocked",
    isMappableForHuInventoryReadiness: false,
    orchestratorStatus: "not_run",
    orchestratorReadiness: null,
    readinessFlags: {
      isHuInventoryReady: false,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      isHeatLossReady: false,
      isMonthlyHeatingReady: false,
      isQhndReady: false,
      isLevel2AuditorReady: false,
      isCpeReady: false
    },
    diagnostics: [
      {
        level: "blocked",
        code: "blocked_missing_explicit_mc001_readiness_mapping",
        message: "This text must not be copied"
      }
    ],
    blockers: [
      {
        diagnosticCode: "blocked_missing_hu_component",
        reason: "This reason must not be copied"
      }
    ],
    privacyWarnings: [{ code: "source_context_sanitized" }],
    sourceTrace: {
      mapper: {
        records: [
          {
            sourceIdentifier: "analysis:analysis-001"
          }
        ]
      }
    },
    ...clone(extra)
  };
}

function buildReadyDryRun(extra = {}) {
  return {
    status: "completed",
    dryRunStatus: "completed_readiness_diagnostics",
    isReadOnlyDryRun: true,
    mapperStatus: "ready_for_hu_inventory_readiness_input",
    isMappableForHuInventoryReadiness: true,
    orchestratorStatus: "ready",
    orchestratorReadiness: {
      status: "ready"
    },
    readinessFlags: {
      isHuInventoryReady: true,
      isCompleteHuReady: true,
      isCompleteHtrReady: true,
      isHeatLossReady: true,
      isMonthlyHeatingReady: true,
      isQhndReady: true,
      isLevel2AuditorReady: true,
      isCpeReady: true
    },
    diagnostics: [{ code: "hu_component_inventory_readiness_only" }],
    blockers: [],
    privacyWarnings: [{ code: "source_trace_sanitized" }],
    huResult: 123,
    htrResult: 456,
    ...clone(extra)
  };
}

function serialized(value) {
  return JSON.stringify(value);
}

function assertNoRawOutput(value) {
  const output = serialized(value);
  for (const forbidden of [
    "person@example.com",
    "John Doe",
    "Strada Exemplu 12",
    "+40722111222",
    "free text note about the owner",
    "record-JohnDoe",
    "owner-snapshot",
    "raw answer",
    "rawSnapshot",
    "sourceContext",
    "sourceTrace",
    "sourceLocator",
    "sourceRefs"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function diagnosticCodes(contract, section) {
  return contract.diagnostics[section].map((entry) => entry.code);
}

test("invalid dry-run input returns invalid contract without throwing", () => {
  for (const input of [null, undefined, "not a result", []]) {
    const contract = buildMc001ReadOnlyDryRunDiagnosticContract(input);

    assert.equal(
      contract.schemaVersion,
      MC001_READ_ONLY_DRY_RUN_DIAGNOSTIC_CONTRACT_SCHEMA_VERSION
    );
    assert.equal(contract.isReadOnlyDiagnosticContract, true);
    assert.equal(contract.status, "invalid_dry_run_input");
    assert.equal(contract.pipeline.mapper.status, "invalid_dry_run_input");
    assert.equal(contract.pipeline.mapper.isMappableForHuInventoryReadiness, false);
    assert.equal(contract.pipeline.orchestrator.ran, false);
    assert.equal(contract.pipeline.orchestrator.status, "not_run");
    assert.equal(contract.readiness.isHuInventoryReady, false);
    assert.equal(contract.readiness.isCompleteHuReady, false);
    assert.equal(contract.readiness.isCompleteHtrReady, false);
    assert.equal(contract.readiness.hasHuResult, false);
    assert.equal(contract.readiness.hasHtrResult, false);
    assert.equal(contract.readiness.downstreamReadiness, false);
    assertNoRawOutput(contract);
  }
});

test("mapper-blocked DB3 result becomes not mappable diagnostic contract", () => {
  const contract = buildMc001ReadOnlyDryRunDiagnosticContract(buildBlockedDryRun());

  assert.equal(contract.status, "blocked");
  assert.equal(contract.pipeline.mapper.status, "blocked");
  assert.equal(contract.pipeline.mapper.isMappableForHuInventoryReadiness, false);
  assert.equal(contract.pipeline.orchestrator.ran, false);
  assert.equal(contract.pipeline.orchestrator.status, "not_run");
  assert.equal(contract.readiness.isHuInventoryReady, false);
  assert.equal(contract.readiness.isCompleteHuReady, false);
  assert.equal(contract.readiness.isCompleteHtrReady, false);
  assert.equal(contract.readiness.hasHuResult, false);
  assert.equal(contract.readiness.hasHtrResult, false);
  assert.equal(contract.readiness.downstreamReadiness, false);
  assert.ok(
    diagnosticCodes(contract, "blockers").includes("blocked_missing_hu_component")
  );
  assert.ok(
    diagnosticCodes(contract, "gaps").includes(
      "blocked_missing_explicit_mc001_readiness_mapping"
    )
  );
});

test("valid Hu inventory-ready dry run remains diagnostics-only", () => {
  const contract = buildMc001ReadOnlyDryRunDiagnosticContract(buildReadyDryRun());

  assert.equal(contract.status, "hu_inventory_ready");
  assert.equal(contract.pipeline.mapper.isMappableForHuInventoryReadiness, true);
  assert.equal(contract.pipeline.orchestrator.ran, true);
  assert.equal(contract.pipeline.orchestrator.status, "ready");
  assert.equal(contract.readiness.isHuInventoryReady, true);
  assert.equal(contract.readiness.isCompleteHuReady, false);
  assert.equal(contract.readiness.isCompleteHtrReady, false);
  assert.equal(contract.readiness.hasHuResult, false);
  assert.equal(contract.readiness.hasHtrResult, false);
  assert.equal(contract.readiness.downstreamReadiness, false);
  assert.equal("huResult" in contract, false);
  assert.equal("htrResult" in contract, false);
});

test("privacy adversarial diagnostic content is sanitized", () => {
  const input = buildBlockedDryRun({
    diagnostics: [
      {
        level: "blocked",
        code: "person@example.com",
        message: "John Doe at Strada Exemplu 12"
      },
      {
        level: "warning",
        message: "free text note about the owner"
      }
    ],
    blockers: [
      {
        reason: "+40722111222",
        sourceRecordId: "record-JohnDoe"
      }
    ],
    privacyWarnings: [
      {
        code: "owner-snapshot",
        message: "free text note about the owner"
      }
    ],
    sourceTrace: {
      mapper: {
        records: [
          {
            sourceLocator: {
              note: "free text note about the owner"
            },
            sourceRefs: ["record-JohnDoe"]
          }
        ]
      }
    },
    rawSnapshot: {
      answers: {
        owner: "John Doe"
      }
    }
  });

  const contract = buildMc001ReadOnlyDryRunDiagnosticContract(input);

  assertNoRawOutput(contract);
  assert.ok(diagnosticCodes(contract, "blockers").includes("unknown_blocker"));
  assert.ok(diagnosticCodes(contract, "gaps").includes("unknown_gap"));
  assert.ok(
    diagnosticCodes(contract, "warnings").includes("diagnostic_content_sanitized")
  );
});

test("arbitrary machine-looking diagnostic codes are sanitized", () => {
  const contract = buildMc001ReadOnlyDryRunDiagnosticContract(
    buildBlockedDryRun({
      diagnostics: [
        { code: "owner-snapshot" },
        { diagnosticCode: "private-note" },
        { status: "person-name" },
        { code: "record-JohnDoe" }
      ],
      blockers: [
        { diagnosticCode: "owner-snapshot" },
        { code: "private-note" },
        { status: "person-name" },
        { diagnosticCode: "record-JohnDoe" }
      ],
      privacyWarnings: [
        { code: "owner-snapshot" },
        { code: "private-note" }
      ]
    })
  );
  const output = serialized(contract);

  for (const forbidden of [
    "owner-snapshot",
    "private-note",
    "person-name",
    "record-JohnDoe",
    "JohnDoe"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }

  assert.ok(diagnosticCodes(contract, "blockers").includes("unknown_blocker"));
  assert.ok(diagnosticCodes(contract, "gaps").includes("unknown_gap"));
  assert.ok(
    diagnosticCodes(contract, "warnings").includes("diagnostic_content_sanitized")
  );
});

test("safe machine diagnostic codes are preserved", () => {
  const contract = buildMc001ReadOnlyDryRunDiagnosticContract(
    buildBlockedDryRun({
      diagnostics: [
        { code: "blocked_unexpected_hu_component" },
        { code: "source_trace_sanitized" }
      ],
      blockers: [{ diagnosticCode: "blocked_missing_hu_component" }],
      privacyWarnings: [
        { code: "source_context_sanitized" },
        { code: "source_trace_sanitized" }
      ]
    })
  );

  assert.ok(
    diagnosticCodes(contract, "blockers").includes("blocked_missing_hu_component")
  );
  assert.ok(
    diagnosticCodes(contract, "gaps").includes("blocked_unexpected_hu_component")
  );
  assert.ok(diagnosticCodes(contract, "gaps").includes("source_trace_sanitized"));
  assert.ok(
    diagnosticCodes(contract, "warnings").includes("source_context_sanitized")
  );
  assert.ok(diagnosticCodes(contract, "warnings").includes("source_trace_sanitized"));
});

test("diagnostic contract builder does not mutate input", () => {
  const input = buildReadyDryRun();
  const before = clone(input);
  deepFreeze(input);

  buildMc001ReadOnlyDryRunDiagnosticContract(input);

  assert.deepEqual(input, before);
});

test("diagnostic contract declares read-only diagnostics-only scope", () => {
  const contract = buildMc001ReadOnlyDryRunDiagnosticContract(buildReadyDryRun());

  assert.equal(contract.contractScope.diagnosticsOnly, true);
  assert.equal(contract.contractScope.noDbRead, true);
  assert.equal(contract.contractScope.noDbWrite, true);
  assert.equal(contract.contractScope.noApiOrWorkerCall, true);
  assert.equal(contract.contractScope.noProductOrReportOutput, true);
  assert.equal(contract.contractScope.noNumericalHuOrHtr, true);
});
