import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMc001HtrTotalCalculationReadinessGate,
  H8_BLOCKER_CODES,
  H8_CONTRIBUTION_TYPES,
  H8_MISSING_CODES,
  H8_REQUIREMENT_STATUSES,
  H8_SCOPE_CODES,
  H8_SOURCE_TYPES,
  MC001_HTR_TOTAL_CALCULATION_READINESS_GATE_SCHEMA_VERSION,
  MC001_HTR_TOTAL_CALCULATION_READINESS_INPUT_SCHEMA_VERSION
} from "../mc001HtrTotalCalculationReadinessGate.mjs";

const H3_INPUT_SCHEMA_VERSION =
  "mc001-h3-hu-htr-calculation-readiness-input-v1";
const H7_INPUT_SCHEMA_VERSION =
  "mc001-h7-htr-non-hu-prerequisites-input-v1";

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

function validSource(id = "htr-scope-001", sourceType = "calculation_record") {
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

function validH7Input(extra = {}) {
  return {
    schemaVersion: H7_INPUT_SCHEMA_VERSION,
    isMc001HtrNonHuPrerequisitesInput: true,
    huBridgeInput: validHuBridgeInput(),
    htrNonHuPrerequisites: {
      expectedPrerequisites: [validPrerequisite()]
    },
    ...extra
  };
}

function contribution(
  contributionType = "thermal_bridge_transmission_contribution",
  requirementStatus = "missing_numeric_calculation",
  extra = {}
) {
  return {
    contributionType,
    requirementStatus,
    source: validSource(`htr-scope-${contributionType}`),
    ...extra
  };
}

function huContribution(extra = {}) {
  return contribution(
    "hu_aggregated_transmission_contribution",
    "available_from_hu_bridge",
    {
      source: validSource("htr-scope-hu-001"),
      ...extra
    }
  );
}

function validScope(extra = {}) {
  return {
    scopeCode: "mc001-htr-total-calculation-scope-v1",
    expectedContributions: [
      huContribution(),
      contribution("thermal_bridge_transmission_contribution")
    ],
    ...extra
  };
}

function validInput(extra = {}) {
  return {
    schemaVersion: MC001_HTR_TOTAL_CALCULATION_READINESS_INPUT_SCHEMA_VERSION,
    isMc001HtrTotalCalculationReadinessInput: true,
    htrPrerequisitesInput: validH7Input(),
    htrTotalCalculationScope: validScope(),
    ...extra
  };
}

function readiness(input) {
  return buildMc001HtrTotalCalculationReadinessGate(input);
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

function assertH8Shape(result) {
  assert.equal(
    result.schemaVersion,
    MC001_HTR_TOTAL_CALCULATION_READINESS_GATE_SCHEMA_VERSION
  );
  assert.equal(result.isMc001HtrTotalCalculationReadinessGate, true);
  assert.ok(["ready", "blocked"].includes(result.status));
  assert.equal(result.readiness.areHtrTotalInputsNumericallyReady, false);
  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
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
    "record:htr-scope",
    "record:htr-prereq"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertOnlyAllowlistedBlockers(result) {
  const allowed = new Set(H8_BLOCKER_CODES);
  for (const blocker of result.blockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertOnlyControlledCodes(result) {
  const missingCodes = new Set(H8_MISSING_CODES);
  const contributionTypes = new Set(H8_CONTRIBUTION_TYPES);
  const requirementStatuses = new Set(H8_REQUIREMENT_STATUSES);
  const scopeCodes = new Set(H8_SCOPE_CODES);

  assert.ok(scopeCodes.has(result.htrTotalCalculationReadiness.scopeCode));
  for (const requirement of result.htrTotalCalculationReadiness.contributionRequirements) {
    assert.ok(contributionTypes.has(requirement.contributionType));
    assert.ok(requirementStatuses.has(requirement.requirementStatus));
  }
  for (const missing of result.htrTotalCalculationReadiness.missingForHtrTotalCalculation) {
    assert.ok(missingCodes.has(missing.code), `${missing.code} is not allowlisted`);
    assert.equal(missing.severity, "blocking");
  }
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
    "co2",
    "nonHuTransmissionValue",
    "nonHuTransmissionValues",
    "htrFormulaResult"
  ]) {
    assert.equal(hasKeyDeep(result, key), false, `${key} leaked`);
  }
  assert.equal(result.readiness.areHtrTotalInputsNumericallyReady, false);
  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

function assertBlocked(result, expectedCode) {
  assertH8Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.htrTotalCalculationReadiness.status, "blocked");
  assert.equal(result.readiness.isHtrTotalCalculationScopeMapped, false);
  assert.ok(blockerCodes(result).includes(expectedCode));
  assertOnlyAllowlistedBlockers(result);
  assertNoForbiddenOutput(result);
  assertNoSourceDetails(result);
  assertNoCompleteHuHtrOrDownstream(result);
}

test("invalid input blocks safely", () => {
  for (const input of [null, undefined, "not input", [], 42]) {
    const result = readiness(input);

    assertBlocked(result, "blocked_invalid_h8_input");
    assert.equal(result.counts.contributionRequirements, 0);
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

test("missing htrPrerequisitesInput blocks safely", () => {
  const input = validInput();
  delete input.htrPrerequisitesInput;
  const result = readiness(input);

  assertBlocked(result, "blocked_h7_prerequisites_not_ready");
});

test("H7-blocked input causes H8 blocked output", () => {
  const result = readiness(validInput({
    htrPrerequisitesInput: validH7Input({
      huBridgeInput: validHuBridgeInput({
        inventoryReadiness: {
          isHuInventoryReady: false
        }
      })
    })
  }));

  assertBlocked(result, "blocked_h7_prerequisites_not_ready");
});

test("valid H7 plus mapped Htr contribution scope becomes scope_mapped_not_calculation_ready", () => {
  const result = readiness(validInput());

  assertH8Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(result.readiness.isHuInventoryReady, true);
  assert.equal(result.readiness.isHuComponentTermCalculationReady, true);
  assert.equal(result.readiness.areHuComponentTermsCalculated, true);
  assert.equal(result.readiness.isHuAggregationReady, true);
  assert.equal(result.readiness.hasHuAggregationResult, true);
  assert.equal(result.readiness.isHuAggregationAvailableForHtr, true);
  assert.equal(result.readiness.isHtrTransmissionBridgeReady, true);
  assert.equal(result.readiness.areNonHuHtrPrerequisitesMapped, true);
  assert.equal(result.readiness.isHtrTotalCalculationScopeMapped, true);
  assert.equal(
    result.htrTotalCalculationReadiness.status,
    "scope_mapped_not_calculation_ready"
  );
  assert.equal(result.htrTotalCalculationReadiness.h7PrerequisitesStatus, "ready");
  assert.equal(
    result.htrTotalCalculationReadiness.scopeCode,
    "mc001-htr-total-calculation-scope-v1"
  );
  assert.deepEqual(result.htrTotalCalculationReadiness.contributionRequirements, [
    {
      contributionType: "hu_aggregated_transmission_contribution",
      requirementStatus: "available_from_hu_bridge"
    },
    {
      contributionType: "thermal_bridge_transmission_contribution",
      requirementStatus: "missing_numeric_calculation"
    }
  ]);
  assert.deepEqual(result.htrTotalCalculationReadiness.missingForHtrTotalCalculation, [
    {
      code: "missing_numeric_non_hu_transmission_contributions",
      severity: "blocking"
    },
    {
      code: "missing_htr_total_formula_execution_milestone",
      severity: "blocking"
    }
  ]);
  assert.equal(result.counts.contributionRequirements, 2);
  assert.equal(result.counts.missingForHtrTotalCalculation, 2);
  assert.equal(result.counts.blockers, 0);
  assertOnlyControlledCodes(result);
  assertNoSourceDetails(result);
  assertNoCompleteHuHtrOrDownstream(result);
});

test("valid scope with Hu plus multiple non-Hu contribution requirements maps successfully", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("thermal_bridge_transmission_contribution"),
        contribution("ground_transmission_contribution", "not_ready", {
          source: validSource("ground-001", "validation_fixture_import")
        }),
        contribution("adjacent_space_transmission_contribution", "not_applicable_with_source", {
          source: validSource("adjacent-na-001", "expert_override_with_source")
        }),
        contribution("external_boundary_transmission_contribution", "missing_numeric_calculation", {
          source: validSource("external-001", "methodological_direct_input")
        })
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.counts.contributionRequirements, 5);
  assert.equal(result.htrTotalCalculationReadiness.contributionRequirements.length, 5);
  assertOnlyControlledCodes(result);
  assertNoSourceDetails(result);
});

test("Hu contribution must use available_from_hu_bridge", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution({
          requirementStatus: "missing_numeric_calculation"
        }),
        contribution("thermal_bridge_transmission_contribution")
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_contribution_requirement");
});

test("non-Hu contribution cannot use available_from_hu_bridge", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution(
          "thermal_bridge_transmission_contribution",
          "available_from_hu_bridge"
        )
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_contribution_requirement");
});

test("not_applicable_with_source contribution is accepted when source is safe", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("ground_transmission_contribution", "not_applicable_with_source", {
          source: validSource("ground-na-001", "methodological_direct_input")
        })
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assert.equal(
    result.htrTotalCalculationReadiness.contributionRequirements[1].requirementStatus,
    "not_applicable_with_source"
  );
});

test("missing htrTotalCalculationScope blocks", () => {
  const input = validInput();
  delete input.htrTotalCalculationScope;
  const result = readiness(input);

  assertBlocked(result, "blocked_missing_htr_total_scope");
});

test("missing expectedContributions blocks", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: {
      scopeCode: "mc001-htr-total-calculation-scope-v1",
      expectedContributions: []
    }
  }));

  assertBlocked(result, "blocked_missing_contribution_requirement");
});

test("unsupported contributionType blocks", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("invented_transmission_contribution")
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_contribution_requirement");
});

test("unsupported requirementStatus blocks", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("thermal_bridge_transmission_contribution", "ready")
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_contribution_requirement");
});

test("duplicate contributionType blocks", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("thermal_bridge_transmission_contribution"),
        contribution("thermal_bridge_transmission_contribution", "not_ready")
      ]
    })
  }));

  assertBlocked(result, "blocked_duplicate_contribution_requirement");
});

test("missing contribution source blocks", () => {
  const missingSource = contribution("thermal_bridge_transmission_contribution");
  delete missingSource.source;
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        missingSource
      ]
    })
  }));

  assertBlocked(result, "blocked_missing_contribution_source");
});

test("invalid source type blocks", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("thermal_bridge_transmission_contribution", "missing_numeric_calculation", {
          source: {
            sourceType: "product_estimate",
            sourceRecordId: "record:htr-scope-thermal-bridge-001"
          }
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_contribution_source");
});

test("unsafe legacy record-* source ID blocks", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("thermal_bridge_transmission_contribution", "missing_numeric_calculation", {
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-001"
          }
        })
      ]
    })
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
});

test("numeric contribution values in input are rejected", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("thermal_bridge_transmission_contribution", "missing_numeric_calculation", {
          nonHuTransmissionValue: 12.3
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_numeric_contribution_value_not_allowed");
});

test("precomputed htrResult htrTotal and htrFormulaResult in input are rejected", () => {
  for (const extra of [
    { htrResult: { value: 123 } },
    { htrTotal: 123 },
    { htrComponents: [{ value: 123 }] },
    { nonHuTransmissionValues: [{ value: 12.3 }] },
    { htrFormulaResult: { value: 123 } }
  ]) {
    const result = readiness(validInput(extra));

    assertBlocked(result, "blocked_precomputed_htr_not_allowed");
  }
});

test("no Htr result or Htr total is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoCompleteHuHtrOrDownstream(result);
});

test("no complete Hu or Htr readiness is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.areHtrTotalInputsNumericallyReady, false);
  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
});

test("no downstream readiness escalation", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assert.equal(result.readiness.downstreamReadiness, false);
});

test("no direct A * U * bztu formula exists in H8", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculationReadinessGate.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("area?.value *"), false);
  assert.equal(moduleSource.includes("area.value *"), false);
  assert.equal(moduleSource.includes("thermalTransmittance"), false);
  assert.equal(moduleSource.includes("bztu?.value"), false);
  assert.equal(moduleSource.includes("A * U"), false);
});

test("no sum component term formula exists in H8", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculationReadinessGate.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("componentTerm.value"), false);
  assert.equal(moduleSource.includes("sum(componentTerm.value)"), false);
  assert.equal(moduleSource.includes("sum + componentTerm.value"), false);
  assert.equal(moduleSource.includes(".reduce("), false);
});

test("no non-Hu numerical formula exists in H8", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculationReadinessGate.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("calculateNonHu"), false);
  assert.equal(moduleSource.includes("nonHuTransmissionValue +"), false);
  assert.equal(moduleSource.includes("thermalBridgeValue"), false);
});

test("no Htr total formula execution exists in H8", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculationReadinessGate.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("htrTotal +"), false);
  assert.equal(moduleSource.includes("totalHtr +"), false);
  assert.equal(moduleSource.includes("htrFormulaResult.value"), false);
  assert.equal(moduleSource.includes("executeHtr"), false);
});

test("no source or provenance details are emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoSourceDetails(result);
});

test("unsafe private IDs and content are sanitized and not emitted", () => {
  const result = readiness(validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("thermal_bridge_transmission_contribution", "missing_numeric_calculation", {
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-JohnDoe",
            sourceLocator: {
              note: "free text note about the owner"
            }
          }
        })
      ]
    })
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
    ]
  }));

  assert.equal(result.status, "ready");
  assertNoForbiddenOutput(result);
  assert.equal(JSON.stringify(result).includes("owner-snapshot"), false);
  assert.equal(JSON.stringify(result).includes("private-note"), false);
  assert.equal(JSON.stringify(result).includes("John Doe"), false);
});

test("input object is not mutated", () => {
  const input = validInput({
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("thermal_bridge_transmission_contribution"),
        contribution("ground_transmission_contribution", "not_ready")
      ]
    })
  });
  const before = clone(input);
  deepFreeze(input);

  const result = readiness(input);

  assert.equal(result.status, "ready");
  assert.deepEqual(input, before);
});

test("runtime import boundary allows only H7 and no IO or DB/API/UI/Worker imports", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculationReadinessGate.mjs", import.meta.url),
    "utf8"
  );
  const importBlocks = (moduleSource.match(/^import[\s\S]*?;\r?\n/gm) ?? [])
    .map((block) => block.replace(/\r\n/g, "\n"));

  assert.deepEqual(importBlocks, [
    'import { buildMc001HtrNonHuPrerequisitesReadiness } from "./mc001HtrNonHuPrerequisitesReadiness.mjs";\n'
  ]);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
    "mc001HtrTransmissionReadinessBridge",
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
    htrTotalCalculationScope: validScope({
      expectedContributions: [
        huContribution(),
        contribution("thermal_bridge_transmission_contribution", "missing_numeric_calculation", {
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-JohnDoe",
            sourceRefs: ["John Doe"],
            sourceContext: "Strada Exemplu 12 person@example.com +40722111222"
          },
          sourceTrace: [
            {
              sourceRefs: ["record-001"]
            }
          ]
        })
      ]
    }),
    sourceTrace: [
      {
        sourceRefs: ["owner-snapshot", "private-note", "person-name"]
      }
    ]
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
  assertNoCompleteHuHtrOrDownstream(result);
});

test("missing blocker contribution source and scope codes are controlled and finite", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertOnlyControlledCodes(result);
  assert.deepEqual([...H8_SOURCE_TYPES].sort(), [
    "calculation_record",
    "expert_override_with_source",
    "methodological_direct_input",
    "validation_fixture_import"
  ].sort());
  assert.deepEqual([...H8_CONTRIBUTION_TYPES].sort(), [
    "adjacent_space_transmission_contribution",
    "external_boundary_transmission_contribution",
    "ground_transmission_contribution",
    "hu_aggregated_transmission_contribution",
    "thermal_bridge_transmission_contribution"
  ].sort());
  assert.deepEqual([...H8_REQUIREMENT_STATUSES].sort(), [
    "available_from_hu_bridge",
    "missing_numeric_calculation",
    "not_applicable_with_source",
    "not_ready"
  ].sort());
  assert.deepEqual([...H8_SCOPE_CODES], [
    "mc001-htr-total-calculation-scope-v1"
  ]);
  assert.deepEqual([...H8_MISSING_CODES].sort(), [
    "missing_complete_htr_methodology_scope",
    "missing_htr_total_formula_execution_milestone",
    "missing_numeric_htr_contribution_contracts",
    "missing_numeric_non_hu_transmission_contributions"
  ].sort());
  assert.ok(new Set(H8_BLOCKER_CODES).has("blocked_h7_prerequisites_not_ready"));
});
