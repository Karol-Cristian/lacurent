import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMc001HtrNonHuPrerequisitesReadiness,
  H7_APPLICABILITY_VALUES,
  H7_BLOCKER_CODES,
  H7_MISSING_CODES,
  H7_PREREQUISITE_TYPES,
  H7_READINESS_STATUS_VALUES,
  H7_SOURCE_TYPES,
  MC001_HTR_NON_HU_PREREQUISITES_INPUT_SCHEMA_VERSION,
  MC001_HTR_NON_HU_PREREQUISITES_READINESS_SCHEMA_VERSION
} from "../mc001HtrNonHuPrerequisitesReadiness.mjs";

const H3_INPUT_SCHEMA_VERSION =
  "mc001-h3-hu-htr-calculation-readiness-input-v1";

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
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function validSource(id = "htr-prereq-001", sourceType = "calculation_record") {
  return {
    sourceType,
    sourceRecordId: `record:${id}`
  };
}

function validComponent(index = 1, extra = {}) {
  return {
    componentId: `hu-component:wall-00${index}`,
    componentType: "opaque_envelope_component",
    ztuZoneId: "ztu:heated-zone-001",
    adjacentZoneId: "ztu:unheated-zone-001",
    area: {
      value: index === 1 ? 12.5 : 8.75,
      unit: "m2",
      source: validSource(`area-00${index}`)
    },
    thermalTransmittance: {
      value: index === 1 ? 0.31 : 0.29,
      unit: "W/(m2*K)",
      source: validSource(`u-00${index}`)
    },
    bztu: {
      value: index === 1 ? 0.76 : 0.64,
      unit: "dimensionless",
      source: validSource(`bztu-00${index}`, "methodological_direct_input")
    },
    ...extra
  };
}

function validHuBridgeInput(extra = {}) {
  return {
    schemaVersion: H3_INPUT_SCHEMA_VERSION,
    isMc001HuHtrCalculationReadinessInput: true,
    inventoryReadiness: {
      isHuInventoryReady: true
    },
    components: [validComponent()],
    ...extra
  };
}

function validPrerequisite(index = 1, extra = {}) {
  return {
    prerequisiteId: `htr-prerequisite:non-hu-00${index}`,
    prerequisiteType: "non_hu_transmission_component_inventory",
    applicability: "required",
    readinessStatus: "metadata_ready",
    source: validSource(`htr-prereq-00${index}`),
    ...extra
  };
}

function validInput(extra = {}) {
  return {
    schemaVersion: MC001_HTR_NON_HU_PREREQUISITES_INPUT_SCHEMA_VERSION,
    isMc001HtrNonHuPrerequisitesInput: true,
    huBridgeInput: validHuBridgeInput(),
    htrNonHuPrerequisites: {
      expectedPrerequisites: [validPrerequisite()]
    },
    ...extra
  };
}

function readiness(input) {
  return buildMc001HtrNonHuPrerequisitesReadiness(input);
}

function blockerCodes(result) {
  return result.blockers.map((entry) => entry.code);
}

function hasKeyDeep(value, targetKey) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (Object.hasOwn(value, targetKey)) {
    return true;
  }
  return Object.values(value).some((child) => hasKeyDeep(child, targetKey));
}

function assertH7Shape(result) {
  assert.equal(
    result.schemaVersion,
    MC001_HTR_NON_HU_PREREQUISITES_READINESS_SCHEMA_VERSION
  );
  assert.equal(result.isMc001HtrNonHuPrerequisitesReadiness, true);
  assert.ok(["ready", "blocked"].includes(result.status));
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

function assertNoForbiddenOutput(value) {
  const output = JSON.stringify(value);
  for (const forbidden of [
    "owner-snapshot",
    "private-note",
    "person-name",
    "record-JohnDoe",
    "record-001",
    "John Doe",
    "Strada Exemplu 12",
    "person@example.com",
    "+40722111222",
    "sourceContext",
    "sourceTrace",
    "sourceLocator",
    "sourceRefs",
    "free text note about the owner"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertNoSourceDetails(result) {
  const output = JSON.stringify(result);
  for (const forbidden of [
    "sourceType",
    "sourceRecordId",
    "sourceIdentifier",
    "provenance",
    "calculation_record",
    "methodological_direct_input",
    "validation_fixture_import",
    "expert_override_with_source",
    "record:htr-prereq"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertOnlyAllowlistedBlockers(result) {
  const allowed = new Set(H7_BLOCKER_CODES);
  for (const blocker of result.blockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertOnlyControlledCodes(result) {
  const missingCodes = new Set(H7_MISSING_CODES);
  const prerequisiteTypes = new Set(H7_PREREQUISITE_TYPES);
  const applicabilityValues = new Set(H7_APPLICABILITY_VALUES);
  const readinessValues = new Set(H7_READINESS_STATUS_VALUES);

  for (const ref of result.htrPrerequisitesReadiness.prerequisiteRefs) {
    assert.ok(prerequisiteTypes.has(ref.prerequisiteType));
    assert.ok(applicabilityValues.has(ref.applicability));
    assert.ok(readinessValues.has(ref.readinessStatus));
  }

  for (const missing of result.htrPrerequisitesReadiness.missingForCompleteHtr) {
    assert.ok(missingCodes.has(missing.code), `${missing.code} is not allowlisted`);
    assert.equal(missing.severity, "blocking");
  }
}

function assertBlocked(result, expectedCode) {
  assertH7Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.htrPrerequisitesReadiness.status, "blocked");
  assert.equal(result.readiness.areNonHuHtrPrerequisitesMapped, false);
  assert.ok(blockerCodes(result).includes(expectedCode));
  assertOnlyAllowlistedBlockers(result);
  assertNoForbiddenOutput(result);
  assertNoSourceDetails(result);
  assertNoCompleteHuHtrOrDownstream(result);
}

function assertNoCompleteHuHtrOrDownstream(result) {
  for (const key of [
    "huResult",
    "htrResult",
    "completeHuResult",
    "completeHtrResult",
    "htrTotal",
    "qHnd",
    "monthlyHeating",
    "finalEnergy",
    "primaryEnergy",
    "co2"
  ]) {
    assert.equal(hasKeyDeep(result, key), false, `${key} leaked`);
  }
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

test("invalid input blocks safely", () => {
  for (const input of [null, undefined, "not input", [], 42]) {
    const result = readiness(input);

    assertBlocked(result, "blocked_invalid_h7_input");
    assert.equal(result.counts.prerequisites, 0);
  }
});

test("raw saved-analysis-like input is rejected", () => {
  const result = readiness({
    analysis: { id: "analysis:analysis-001" },
    building: { id: "building:building-001" },
    answers: [{ value: "ordinary saved app answer" }],
    mc001Readiness: {}
  });

  assertBlocked(result, "blocked_raw_saved_analysis_input");
});

test("missing huBridgeInput blocks safely", () => {
  const input = validInput();
  delete input.huBridgeInput;
  const result = readiness(input);

  assertBlocked(result, "blocked_h6_bridge_not_ready");
});

test("H6-blocked input causes H7 blocked output", () => {
  const result = readiness(validInput({
    huBridgeInput: validHuBridgeInput({
      inventoryReadiness: {
        isHuInventoryReady: false
      }
    })
  }));

  assertBlocked(result, "blocked_h6_bridge_not_ready");
});

test("valid Hu bridge plus one required prerequisite becomes metadata-ready", () => {
  const result = readiness(validInput());

  assertH7Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(result.readiness.isHuInventoryReady, true);
  assert.equal(result.readiness.isHuComponentTermCalculationReady, true);
  assert.equal(result.readiness.areHuComponentTermsCalculated, true);
  assert.equal(result.readiness.isHuAggregationReady, true);
  assert.equal(result.readiness.hasHuAggregationResult, true);
  assert.equal(result.readiness.isHuAggregationAvailableForHtr, true);
  assert.equal(result.readiness.isHtrTransmissionBridgeReady, true);
  assert.equal(result.readiness.areNonHuHtrPrerequisitesMapped, true);
  assert.equal(result.htrPrerequisitesReadiness.status, "ready");
  assert.equal(result.htrPrerequisitesReadiness.huBridgeStatus, "ready");
  assert.equal(
    result.htrPrerequisitesReadiness.nonHuPrerequisitesStatus,
    "metadata_ready"
  );
  assert.deepEqual(result.htrPrerequisitesReadiness.prerequisiteRefs, [
    {
      prerequisiteId: "htr-prerequisite:non-hu-001",
      prerequisiteType: "non_hu_transmission_component_inventory",
      applicability: "required",
      readinessStatus: "metadata_ready"
    }
  ]);
  assert.deepEqual(result.htrPrerequisitesReadiness.missingForCompleteHtr, [
    {
      code: "missing_non_hu_numeric_transmission_calculations",
      severity: "blocking"
    }
  ]);
  assert.equal(result.counts.prerequisites, 1);
  assert.equal(result.counts.readyPrerequisites, 1);
  assert.equal(result.counts.notApplicablePrerequisites, 0);
  assert.equal(result.counts.blockers, 0);
  assertOnlyControlledCodes(result);
  assertNoSourceDetails(result);
  assertNoCompleteHuHtrOrDownstream(result);
});

test("valid Hu bridge plus multiple prerequisites becomes metadata-ready", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1),
        validPrerequisite(2, {
          prerequisiteId: "htr-prerequisite:thermal-bridge-001",
          prerequisiteType: "thermal_bridge_transmission_inventory",
          source: validSource("thermal-bridge-001", "validation_fixture_import")
        }),
        validPrerequisite(3, {
          prerequisiteId: "htr-prerequisite:ground-001",
          prerequisiteType: "ground_transmission_inventory",
          source: validSource("ground-001", "expert_override_with_source")
        })
      ]
    }
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.counts.prerequisites, 3);
  assert.equal(result.counts.readyPrerequisites, 3);
  assert.equal(result.htrPrerequisitesReadiness.prerequisiteRefs.length, 3);
  assertOnlyControlledCodes(result);
});

test("not_applicable_with_source prerequisite is accepted when source is safe", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          prerequisiteType: "adjacent_space_transmission_inventory",
          applicability: "not_applicable_with_source",
          readinessStatus: "metadata_ready",
          source: validSource("adjacent-na-001", "methodological_direct_input")
        })
      ]
    }
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.counts.prerequisites, 1);
  assert.equal(result.counts.readyPrerequisites, 0);
  assert.equal(result.counts.notApplicablePrerequisites, 1);
  assert.equal(
    result.htrPrerequisitesReadiness.prerequisiteRefs[0].applicability,
    "not_applicable_with_source"
  );
});

test("missing prerequisites blocks", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: []
    }
  }));

  assertBlocked(result, "blocked_missing_non_hu_prerequisites");
});

test("invalid prerequisite ID blocks", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          prerequisiteId: "bad id with spaces"
        })
      ]
    }
  }));

  assertBlocked(result, "blocked_unsafe_private_identifier");
});

test("unsafe legacy record-* source ID blocks", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-001"
          }
        })
      ]
    }
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
});

test("missing prerequisite source blocks", () => {
  const prerequisite = validPrerequisite();
  delete prerequisite.source;
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [prerequisite]
    }
  }));

  assertBlocked(result, "blocked_missing_prerequisite_source");
});

test("invalid source type blocks", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          source: {
            sourceType: "product_estimate",
            sourceRecordId: "record:htr-prereq-001"
          }
        })
      ]
    }
  }));

  assertBlocked(result, "blocked_invalid_prerequisite_source");
});

test("unsupported prerequisiteType blocks", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          prerequisiteType: "invented_transmission_component"
        })
      ]
    }
  }));

  assertBlocked(result, "blocked_invalid_non_hu_prerequisite");
});

test("unsupported applicability blocks", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          applicability: "maybe_required"
        })
      ]
    }
  }));

  assertBlocked(result, "blocked_invalid_non_hu_prerequisite");
});

test("unsupported readinessStatus blocks", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          readinessStatus: "ready"
        })
      ]
    }
  }));

  assertBlocked(result, "blocked_invalid_non_hu_prerequisite");
});

test("numeric non-Hu transmission values in input are rejected", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          nonHuTransmissionValue: 12.3
        })
      ]
    }
  }));

  assertBlocked(result, "blocked_non_hu_numeric_value_not_allowed");
});

test("precomputed htrResult and htrTotal in input are rejected", () => {
  for (const extra of [
    { htrResult: { value: 123 } },
    { htrTotal: 123 },
    { htrComponents: [{ value: 123 }] }
  ]) {
    const result = readiness(validInput(extra));

    assertBlocked(result, "blocked_precomputed_htr_not_allowed");
  }
});

test("no Htr result or Htr total is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoCompleteHuHtrOrDownstream(result);
  assert.equal(JSON.stringify(result).includes("htrTotal"), false);
});

test("no complete Hu or Htr readiness is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
});

test("no downstream readiness escalation", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assert.equal(result.readiness.downstreamReadiness, false);
});

test("no direct A * U * bztu formula exists in H7", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuPrerequisitesReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("area?.value *"), false);
  assert.equal(moduleSource.includes("area.value *"), false);
  assert.equal(moduleSource.includes("thermalTransmittance"), false);
  assert.equal(moduleSource.includes("bztu?.value"), false);
  assert.equal(moduleSource.includes("A * U"), false);
});

test("no sum component term formula exists in H7", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuPrerequisitesReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("componentTerm.value"), false);
  assert.equal(moduleSource.includes("sum(componentTerm.value)"), false);
  assert.equal(moduleSource.includes("sum + componentTerm.value"), false);
  assert.equal(moduleSource.includes(".reduce("), false);
});

test("no non-Hu numerical formula exists in H7", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuPrerequisitesReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("calculateNonHu"), false);
  assert.equal(moduleSource.includes("nonHuTransmissionValue +"), false);
  assert.equal(moduleSource.includes("htrTotal +"), false);
  assert.equal(moduleSource.includes("thermalBridgeValue"), false);
});

test("no source or provenance details are emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoSourceDetails(result);
});

test("unsafe private IDs and content are sanitized and not emitted", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          prerequisiteId: "htr-prerequisite:person-name",
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-JohnDoe",
            sourceLocator: {
              note: "free text note about the owner"
            }
          }
        })
      ]
    }
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
});

test("arbitrary blocker and diagnostic strings are not passed through", () => {
  const result = readiness(validInput({
    blockers: [
      {
        code: "owner-snapshot",
        diagnosticCode: "private-note",
        message: "John Doe"
      }
    ],
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1)
      ]
    }
  }));

  assert.equal(result.status, "ready");
  assertNoForbiddenOutput(result);
  assert.equal(JSON.stringify(result).includes("owner-snapshot"), false);
  assert.equal(JSON.stringify(result).includes("private-note"), false);
  assert.equal(JSON.stringify(result).includes("John Doe"), false);
});

test("input object is not mutated", () => {
  const input = validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [validPrerequisite(1), validPrerequisite(2)]
    }
  });
  const before = clone(input);
  deepFreeze(input);

  const result = readiness(input);

  assert.equal(result.status, "ready");
  assert.deepEqual(input, before);
});

test("runtime import boundary allows only H6 and no IO or DB/API/UI/Worker imports", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuPrerequisitesReadiness.mjs", import.meta.url),
    "utf8"
  );
  const importBlocks = (moduleSource.match(/^import[\s\S]*?;\r?\n/gm) ?? [])
    .map((block) => block.replace(/\r\n/g, "\n"));

  assert.deepEqual(importBlocks, [
    'import { buildMc001HtrTransmissionReadinessBridge } from "./mc001HtrTransmissionReadinessBridge.mjs";\n'
  ]);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
    "mc001HuAggregation",
    "mc001HuComponentTermCalculation",
    "mc001HuHtrCalculationReadinessGate",
    "DB2",
    "DB3",
    "DB4",
    "DB5",
    "DB7",
    "fetch(",
    "readFile",
    "writeFile",
    "schema.sql",
    "workers/",
    "api/",
    "product",
    "report",
    "CPE"
  ]) {
    assert.equal(moduleSource.includes(forbidden), false, `${forbidden} leaked`);
  }
});

test("privacy adversarial output omits all forbidden sentinel values", () => {
  const result = readiness(validInput({
    htrNonHuPrerequisites: {
      expectedPrerequisites: [
        validPrerequisite(1, {
          prerequisiteId: "htr-prerequisite:owner-snapshot",
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-JohnDoe",
            sourceRefs: ["John Doe"],
            sourceContext: "Strada Exemplu 12 person@example.com +40722111222"
          }
        })
      ]
    },
    sourceTrace: [
      {
        sourceRefs: ["record-001"]
      }
    ]
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
  assertNoCompleteHuHtrOrDownstream(result);
});

test("missing, blocker, prerequisite and source codes are controlled and finite", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertOnlyControlledCodes(result);
  assert.deepEqual([...H7_SOURCE_TYPES].sort(), [
    "calculation_record",
    "expert_override_with_source",
    "methodological_direct_input",
    "validation_fixture_import"
  ].sort());
  assert.deepEqual([...H7_PREREQUISITE_TYPES].sort(), [
    "adjacent_space_transmission_inventory",
    "external_boundary_transmission_inventory",
    "ground_transmission_inventory",
    "non_hu_transmission_component_inventory",
    "thermal_bridge_transmission_inventory"
  ].sort());
  assert.deepEqual([...H7_MISSING_CODES].sort(), [
    "missing_complete_htr_formula_scope",
    "missing_complete_htr_methodology_components",
    "missing_non_hu_numeric_transmission_calculations"
  ].sort());
  assert.ok(new Set(H7_BLOCKER_CODES).has("blocked_h6_bridge_not_ready"));
});
