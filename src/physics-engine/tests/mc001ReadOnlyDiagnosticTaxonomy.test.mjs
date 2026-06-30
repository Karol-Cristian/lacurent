import assert from "node:assert/strict";
import {
  buildMc001ReadOnlyDiagnosticTaxonomy,
  MC001_READ_ONLY_DIAGNOSTIC_TAXONOMY_SCHEMA_VERSION,
  MC001_READ_ONLY_DIAGNOSTIC_TAXONOMY_SOURCE_SCHEMA_VERSION
} from "../mc001ReadOnlyDiagnosticTaxonomy.mjs";
import { runMc001ReadOnlySavedAnalysisDiagnosticDryRun } from "../mc001ReadOnlySavedAnalysisDiagnosticDryRunRunner.mjs";
import {
  MC001_DB6_FORBIDDEN_SERIALIZED_TERMS,
  mc001Db6ReadOnlyDiagnosticFixtures
} from "./fixtures/mc001Db6ReadOnlyDiagnosticFixtures.mjs";

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

function db4Contract(extra = {}) {
  return {
    schemaVersion: "mc001-db4-read-only-dry-run-diagnostic-contract-v1",
    isReadOnlyDiagnosticContract: true,
    status: "blocked",
    pipeline: {
      mapper: {
        status: "blocked",
        isMappableForHuInventoryReadiness: false
      },
      orchestrator: {
        ran: false,
        status: "not_run"
      }
    },
    readiness: {
      isHuInventoryReady: false,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      gaps: []
    },
    privacy: {
      sanitized: true,
      warnings: []
    },
    counts: {
      blockers: 0,
      warnings: 0,
      gaps: 0
    },
    ...clone(extra)
  };
}

function serialized(value) {
  return JSON.stringify(value);
}

function category(taxonomy, category) {
  return taxonomy.taxonomy.categories.find((entry) => entry.category === category);
}

function categoryCodes(taxonomy, categoryName) {
  return taxonomy.taxonomy.categories
    .filter((entry) => entry.category === categoryName)
    .flatMap((entry) => entry.diagnosticCodes);
}

function privacyWarningCodes(taxonomy) {
  return taxonomy.privacy.warnings.map((entry) => entry.code);
}

function assertDb7Shape(taxonomy) {
  assert.equal(
    taxonomy.schemaVersion,
    MC001_READ_ONLY_DIAGNOSTIC_TAXONOMY_SCHEMA_VERSION
  );
  assert.equal(taxonomy.isReadOnlyDiagnosticTaxonomy, true);
  assert.equal(
    taxonomy.sourceSchemaVersion,
    MC001_READ_ONLY_DIAGNOSTIC_TAXONOMY_SOURCE_SCHEMA_VERSION
  );
  assert.equal(taxonomy.privacy.sanitized, true);
  assert.equal(taxonomy.readiness.isCompleteHuReady, false);
  assert.equal(taxonomy.readiness.isCompleteHtrReady, false);
  assert.equal(taxonomy.readiness.hasHuResult, false);
  assert.equal(taxonomy.readiness.hasHtrResult, false);
  assert.equal(taxonomy.readiness.downstreamReadiness, false);
  assert.equal(taxonomy.contractScope.taxonomyOnly, true);
  assert.equal(taxonomy.contractScope.readOnly, true);
  assert.equal(taxonomy.contractScope.noDbRead, true);
  assert.equal(taxonomy.contractScope.noDbWrite, true);
  assert.equal(taxonomy.contractScope.noApiOrWorkerCall, true);
  assert.equal(taxonomy.contractScope.noProductOrReportOutput, true);
  assert.equal(taxonomy.contractScope.noUserFacingCopy, true);
  assert.equal(taxonomy.contractScope.noNumericalHuOrHtr, true);
}

function assertNoRawOrPersonalOutput(value) {
  const output = serialized(value);
  for (const forbidden of [
    ...MC001_DB6_FORBIDDEN_SERIALIZED_TERMS,
    "owner-snapshot",
    "private-note",
    "person-name",
    "record-JohnDoe",
    "record-001",
    "John Doe",
    "Strada Exemplu 12",
    "person@example.com",
    "+40722111222",
    "free text note about the owner",
    "rawSnapshot",
    "raw answer",
    "sourceContext",
    "sourceTrace",
    "sourceLocator",
    "sourceRefs",
    "raw diagnostic internals"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertNoHuOrHtrResult(value) {
  const output = serialized(value);
  for (const forbidden of [
    "huResult",
    "htrResult",
    "qHndResult",
    "finalEnergyResult",
    "primaryEnergyResult",
    "co2Result",
    "certificateResult",
    "reportResult"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertFiniteTaxonomyValues(taxonomy) {
  const categories = [
    "invalid_diagnostic_input",
    "not_mappable_saved_analysis",
    "missing_hu_component_inventory",
    "missing_source_provenance",
    "ambiguous_component_mapping",
    "unexpected_component",
    "readiness_blocked",
    "privacy_sanitized",
    "unknown_diagnostic",
    "diagnostics_only"
  ];
  const severities = ["info", "warning", "blocking"];
  const actionCodes = [
    "provide_mc001_readiness_mapping",
    "complete_hu_component_inventory",
    "provide_source_provenance",
    "resolve_component_ambiguity",
    "remove_unexpected_component",
    "review_privacy_sanitized_fields",
    "review_unknown_diagnostic",
    "no_action_required"
  ];

  for (const entry of taxonomy.taxonomy.categories) {
    assert.ok(categories.includes(entry.category), `${entry.category} not allowlisted`);
    assert.ok(severities.includes(entry.severity), `${entry.severity} not allowlisted`);
    assert.ok(
      actionCodes.includes(entry.actionCode),
      `${entry.actionCode} not allowlisted`
    );
  }
}

test("invalid diagnostic contract input returns privacy-safe invalid taxonomy", () => {
  for (const input of [null, undefined, "not a contract", []]) {
    const taxonomy = buildMc001ReadOnlyDiagnosticTaxonomy(input);

    assertDb7Shape(taxonomy);
    assert.equal(taxonomy.status, "invalid_diagnostic_input");
    assert.equal(taxonomy.readiness.isHuInventoryReady, false);
    assert.ok(category(taxonomy, "invalid_diagnostic_input"));
    assert.ok(
      categoryCodes(taxonomy, "invalid_diagnostic_input").includes(
        "invalid_dry_run_input"
      )
    );
    assertNoRawOrPersonalOutput(taxonomy);
    assertNoHuOrHtrResult(taxonomy);
    assertFiniteTaxonomyValues(taxonomy);
  }
});

test("blocked not-mappable DB4 contract maps to auditor taxonomy categories", () => {
  const taxonomy = buildMc001ReadOnlyDiagnosticTaxonomy(
    db4Contract({
      diagnostics: {
        blockers: [
          {
            code: "blocked_missing_explicit_mc001_readiness_mapping"
          }
        ],
        warnings: [],
        gaps: [
          {
            code: "blocked_missing_ztu_zone_mapping"
          }
        ]
      }
    })
  );

  assertDb7Shape(taxonomy);
  assert.equal(taxonomy.status, "blocked");
  assert.equal(taxonomy.readiness.isHuInventoryReady, false);
  assert.equal(
    category(taxonomy, "not_mappable_saved_analysis").actionCode,
    "provide_mc001_readiness_mapping"
  );
  assert.ok(
    categoryCodes(taxonomy, "not_mappable_saved_analysis").includes(
      "blocked_missing_explicit_mc001_readiness_mapping"
    )
  );
  assert.ok(
    categoryCodes(taxonomy, "not_mappable_saved_analysis").includes(
      "blocked_missing_ztu_zone_mapping"
    )
  );
  assertNoHuOrHtrResult(taxonomy);
});

test("safe diagnostic codes map to finite categories and action codes", () => {
  const taxonomy = buildMc001ReadOnlyDiagnosticTaxonomy(
    db4Contract({
      diagnostics: {
        blockers: [
          { code: "blocked_missing_hu_component" },
          { code: "blocked_missing_expected_hu_component" },
          { code: "blocked_unexpected_hu_component" },
          { code: "blocked_ambiguous_hu_component_inventory" }
        ],
        warnings: [],
        gaps: []
      }
    })
  );

  assert.equal(
    category(taxonomy, "missing_hu_component_inventory").actionCode,
    "complete_hu_component_inventory"
  );
  assert.equal(
    category(taxonomy, "unexpected_component").actionCode,
    "remove_unexpected_component"
  );
  assert.equal(
    category(taxonomy, "ambiguous_component_mapping").actionCode,
    "resolve_component_ambiguity"
  );
  assert.ok(
    categoryCodes(taxonomy, "missing_hu_component_inventory").includes(
      "blocked_missing_hu_component"
    )
  );
  assert.ok(
    categoryCodes(taxonomy, "missing_hu_component_inventory").includes(
      "blocked_missing_expected_hu_component"
    )
  );
  assertFiniteTaxonomyValues(taxonomy);
});

test("source provenance and privacy sanitized codes map without raw source output", () => {
  const taxonomy = buildMc001ReadOnlyDiagnosticTaxonomy(
    db4Contract({
      diagnostics: {
        blockers: [
          { code: "blocked_missing_u_value_path" },
          { code: "blocked_missing_bztu_path" }
        ],
        warnings: [{ code: "source_context_sanitized" }],
        gaps: [{ code: "source_trace_sanitized" }]
      },
      privacy: {
        sanitized: true,
        warnings: [
          { code: "source_identifiers_sanitized" },
          { code: "source_trace_sanitized" }
        ]
      }
    })
  );

  assert.equal(
    category(taxonomy, "missing_source_provenance").actionCode,
    "provide_source_provenance"
  );
  assert.equal(
    category(taxonomy, "privacy_sanitized").actionCode,
    "review_privacy_sanitized_fields"
  );
  assert.ok(
    categoryCodes(taxonomy, "missing_source_provenance").includes(
      "blocked_missing_u_value_path"
    )
  );
  assert.ok(privacyWarningCodes(taxonomy).includes("source_identifiers_sanitized"));
  assert.ok(privacyWarningCodes(taxonomy).includes("source_trace_sanitized"));
  assertNoRawOrPersonalOutput(taxonomy);
});

test("unsafe unknown diagnostic codes are sanitized before taxonomy output", () => {
  const taxonomy = buildMc001ReadOnlyDiagnosticTaxonomy(
    db4Contract({
      diagnostics: {
        blockers: [
          { code: "owner-snapshot" },
          { diagnosticCode: "record-JohnDoe" }
        ],
        warnings: [{ code: "private-note" }],
        gaps: [{ diagnosticCode: "person-name" }]
      },
      privacy: {
        sanitized: true,
        warnings: [{ code: "record-JohnDoe" }]
      }
    })
  );

  assertNoRawOrPersonalOutput(taxonomy);
  assert.ok(categoryCodes(taxonomy, "unknown_diagnostic").includes("unknown_blocker"));
  assert.ok(categoryCodes(taxonomy, "unknown_diagnostic").includes("unknown_warning"));
  assert.ok(categoryCodes(taxonomy, "unknown_diagnostic").includes("unknown_gap"));
  assert.ok(
    categoryCodes(taxonomy, "privacy_sanitized").includes(
      "diagnostic_content_sanitized"
    )
  );
  assert.ok(privacyWarningCodes(taxonomy).includes("diagnostic_content_sanitized"));
});

test("adversarial diagnostic contract cannot leak raw or personal values", () => {
  const taxonomy = buildMc001ReadOnlyDiagnosticTaxonomy(
    db4Contract({
      status: "owner-snapshot",
      rawSnapshot: {
        answers: {
          owner: "John Doe",
          email: "person@example.com",
          phone: "+40722111222",
          address: "Strada Exemplu 12"
        }
      },
      diagnostics: {
        blockers: [
          {
            code: "record-001",
            message: "free text note about the owner"
          }
        ],
        warnings: [
          {
            code: "private-note",
            sourceRefs: ["record-JohnDoe"]
          }
        ],
        gaps: [
          {
            code: "person-name",
            sourceLocator: {
              note: "free text note about the owner"
            }
          }
        ]
      },
      privacy: {
        sanitized: true,
        warnings: [
          {
            code: "owner-snapshot",
            message: "John Doe"
          }
        ]
      }
    })
  );

  assert.equal(taxonomy.status, "blocked");
  assertNoRawOrPersonalOutput(taxonomy);
  assert.ok(privacyWarningCodes(taxonomy).includes("diagnostic_content_sanitized"));
});

test("Hu inventory-ready diagnostic contract remains diagnostics-only", () => {
  const taxonomy = buildMc001ReadOnlyDiagnosticTaxonomy(
    db4Contract({
      status: "hu_inventory_ready",
      readiness: {
        isHuInventoryReady: true,
        isCompleteHuReady: true,
        isCompleteHtrReady: true,
        hasHuResult: true,
        hasHtrResult: true,
        downstreamReadiness: true
      },
      diagnostics: {
        blockers: [],
        warnings: [{ code: "hu_component_inventory_readiness_only" }],
        gaps: []
      },
      huResult: 123,
      htrResult: 456
    })
  );

  assertDb7Shape(taxonomy);
  assert.equal(taxonomy.status, "hu_inventory_ready");
  assert.equal(taxonomy.readiness.isHuInventoryReady, true);
  assert.equal(taxonomy.readiness.isCompleteHuReady, false);
  assert.equal(taxonomy.readiness.isCompleteHtrReady, false);
  assertNoHuOrHtrResult(taxonomy);
  assert.equal(category(taxonomy, "diagnostics_only").actionCode, "no_action_required");
});

test("taxonomy builder does not mutate input", () => {
  const input = db4Contract({
    diagnostics: {
      blockers: [{ code: "blocked_missing_hu_component" }],
      warnings: [],
      gaps: []
    }
  });
  const before = clone(input);
  deepFreeze(input);

  buildMc001ReadOnlyDiagnosticTaxonomy(input);

  assert.deepEqual(input, before);
});

test("DB7 integration over DB6 fixtures remains privacy-safe and read-only", () => {
  for (const fixture of mc001Db6ReadOnlyDiagnosticFixtures) {
    const db5Contract = runMc001ReadOnlySavedAnalysisDiagnosticDryRun(
      fixture.snapshot
    );
    const taxonomy = buildMc001ReadOnlyDiagnosticTaxonomy(db5Contract);

    assertDb7Shape(taxonomy);
    assert.equal(taxonomy.status, db5Contract.status);
    assert.equal(taxonomy.readiness.isCompleteHuReady, false);
    assert.equal(taxonomy.readiness.isCompleteHtrReady, false);
    assert.equal(taxonomy.readiness.hasHuResult, false);
    assert.equal(taxonomy.readiness.hasHtrResult, false);
    assert.equal(taxonomy.readiness.downstreamReadiness, false);
    assertNoRawOrPersonalOutput(taxonomy);
    assertNoHuOrHtrResult(taxonomy);
    assertFiniteTaxonomyValues(taxonomy);
  }
});

test("DB7 runtime boundary is diagnostics-only taxonomy output", () => {
  const taxonomy = buildMc001ReadOnlyDiagnosticTaxonomy(db4Contract());

  assert.equal(taxonomy.contractScope.taxonomyOnly, true);
  assert.equal(taxonomy.contractScope.readOnly, true);
  assert.equal(taxonomy.contractScope.noDbRead, true);
  assert.equal(taxonomy.contractScope.noDbWrite, true);
  assert.equal(taxonomy.contractScope.noApiOrWorkerCall, true);
  assert.equal(taxonomy.contractScope.noProductOrReportOutput, true);
  assert.equal(taxonomy.contractScope.noUserFacingCopy, true);
  assert.equal(taxonomy.contractScope.noNumericalHuOrHtr, true);
});
