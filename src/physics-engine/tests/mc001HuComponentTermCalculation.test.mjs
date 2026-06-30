import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateMc001HuComponentTerms,
  H4_BLOCKER_CODES,
  MC001_HU_COMPONENT_TERM_CALCULATION_SCHEMA_VERSION,
  MC001_HU_COMPONENT_TERM_FORMULA_CODE
} from "../mc001HuComponentTermCalculation.mjs";
import {
  MC001_HU_HTR_CALCULATION_READINESS_INPUT_SCHEMA_VERSION
} from "../mc001HuHtrCalculationReadinessGate.mjs";

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

function validSource(id, sourceType = "calculation_record") {
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

function validInput(extra = {}) {
  return {
    schemaVersion: MC001_HU_HTR_CALCULATION_READINESS_INPUT_SCHEMA_VERSION,
    isMc001HuHtrCalculationReadinessInput: true,
    inventoryReadiness: {
      isHuInventoryReady: true
    },
    components: [validComponent()],
    ...extra
  };
}

function calculate(input) {
  return calculateMc001HuComponentTerms(input);
}

function blockerCodes(result) {
  return result.blockers.map((entry) => entry.code);
}

function assertH4Shape(result) {
  assert.equal(
    result.schemaVersion,
    MC001_HU_COMPONENT_TERM_CALCULATION_SCHEMA_VERSION
  );
  assert.equal(result.isMc001HuComponentTermCalculation, true);
  assert.ok(["ready", "blocked"].includes(result.status));
  assert.equal(result.readiness.isHuAggregationReady, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
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

function assertNoHuHtrOrAggregationResult(result) {
  for (const key of [
    "huResult",
    "htrResult",
    "completeHuResult",
    "completeHtrResult",
    "huAggregation",
    "huAggregate",
    "huTotal",
    "htr"
  ]) {
    assert.equal(hasKeyDeep(result, key), false, `${key} leaked`);
  }
  assert.equal(result.readiness.isHuAggregationReady, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
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
    "sourceRefs"
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
    "record:area",
    "record:u",
    "record:bztu"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertOnlyAllowlistedBlockers(result) {
  const allowed = new Set(H4_BLOCKER_CODES);
  for (const blocker of result.blockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertOnlyControlledFormulaCodes(result) {
  for (const term of result.componentTerms) {
    if (term.status === "calculated") {
      assert.equal(term.formulaCode, MC001_HU_COMPONENT_TERM_FORMULA_CODE);
      assert.equal(term.unit, "W/K");
    } else {
      assert.equal(Object.hasOwn(term, "formulaCode"), false);
      assert.equal(Object.hasOwn(term, "value"), false);
    }
  }
}

function assertBlockedWithoutTerms(result, expectedCode) {
  assertH4Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.componentTerms.length, 0);
  assert.ok(blockerCodes(result).includes(expectedCode));
  assert.equal(result.readiness.areHuComponentTermsCalculated, false);
  assertOnlyAllowlistedBlockers(result);
  assertNoForbiddenOutput(result);
  assertNoSourceDetails(result);
}

test("invalid input blocks safely", () => {
  for (const input of [null, undefined, "not input", [], 42]) {
    const result = calculate(input);

    assertBlockedWithoutTerms(result, "blocked_invalid_h4_input");
    assert.equal(result.counts.components, 0);
    assert.equal(result.counts.calculatedComponents, 0);
  }
});

test("raw saved-analysis-like input is rejected", () => {
  const result = calculate({
    analysis: { id: "analysis:analysis-001" },
    building: { id: "building:building-001" },
    answers: [{ value: "ordinary saved app answer" }],
    mc001Readiness: {}
  });

  assertBlockedWithoutTerms(result, "blocked_raw_saved_analysis_input");
});

test("H3-blocked input causes H4 blocked output and no terms calculated", () => {
  const input = validInput({
    inventoryReadiness: {
      isHuInventoryReady: false
    }
  });
  const result = calculate(input);

  assertBlockedWithoutTerms(result, "blocked_h3_calculation_readiness_not_ready");
  assert.equal(result.counts.components, 1);
  assert.equal(result.counts.blockedComponents, 1);
});

test("valid single component calculates A * U * bztu correctly", () => {
  const result = calculate(validInput());

  assertH4Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(result.readiness.isHuInventoryReady, true);
  assert.equal(result.readiness.isHuComponentTermCalculationReady, true);
  assert.equal(result.readiness.areHuComponentTermsCalculated, true);
  assert.equal(result.componentTerms.length, 1);
  assert.equal(result.componentTerms[0].componentId, "hu-component:wall-001");
  assert.equal(result.componentTerms[0].ztuZoneId, "ztu:heated-zone-001");
  assert.equal(result.componentTerms[0].adjacentZoneId, "ztu:unheated-zone-001");
  assert.equal(result.componentTerms[0].status, "calculated");
  assert.equal(result.componentTerms[0].value, 12.5 * 0.31 * 0.76);
  assert.equal(result.componentTerms[0].unit, "W/K");
  assert.equal(
    result.componentTerms[0].formulaCode,
    MC001_HU_COMPONENT_TERM_FORMULA_CODE
  );
  assert.equal(result.counts.components, 1);
  assert.equal(result.counts.calculatedComponents, 1);
  assert.equal(result.counts.blockedComponents, 0);
  assertOnlyControlledFormulaCodes(result);
  assertNoHuHtrOrAggregationResult(result);
  assertNoSourceDetails(result);
});

test("valid multiple components calculate each individual term correctly", () => {
  const result = calculate(validInput({
    components: [validComponent(1), validComponent(2)]
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.componentTerms.length, 2);
  assert.equal(result.componentTerms[0].value, 12.5 * 0.31 * 0.76);
  assert.equal(result.componentTerms[1].value, 8.75 * 0.29 * 0.64);
  assert.deepEqual(
    result.componentTerms.map((entry) => entry.componentId),
    ["hu-component:wall-001", "hu-component:wall-002"]
  );
  assert.equal(result.counts.calculatedComponents, 2);
  assertNoHuHtrOrAggregationResult(result);
});

test("zero BZTU is allowed when H3 allows it and result is zero W/K", () => {
  const input = validInput();
  input.components[0].bztu.value = 0;
  const result = calculate(input);

  assert.equal(result.status, "ready");
  assert.equal(result.componentTerms[0].status, "calculated");
  assert.equal(result.componentTerms[0].value, 0);
  assert.equal(result.componentTerms[0].unit, "W/K");
});

test("non-finite calculated term blocks safely", () => {
  const input = validInput();
  input.components[0].area.value = Number.MAX_VALUE;
  input.components[0].thermalTransmittance.value = Number.MAX_VALUE;
  input.components[0].bztu.value = 1;
  const result = calculate(input);

  assertH4Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.readiness.isHuComponentTermCalculationReady, true);
  assert.equal(result.readiness.areHuComponentTermsCalculated, false);
  assert.ok(blockerCodes(result).includes("blocked_non_finite_component_term"));
  assert.equal(result.componentTerms.length, 1);
  assert.equal(result.componentTerms[0].status, "blocked");
  assert.equal(Object.hasOwn(result.componentTerms[0], "value"), false);
  assert.equal(result.counts.calculatedComponents, 0);
  assert.equal(result.counts.blockedComponents, 1);
  assertOnlyAllowlistedBlockers(result);
  assertOnlyControlledFormulaCodes(result);
});

test("no Hu aggregation is performed", () => {
  const result = calculate(validInput({
    components: [validComponent(1), validComponent(2)]
  }));

  assert.equal(result.status, "ready");
  assertNoHuHtrOrAggregationResult(result);
  assert.equal(result.readiness.isHuAggregationReady, false);
});

test("no complete Hu/Htr result is emitted and no downstream readiness escalates", () => {
  const result = calculate(validInput());

  assertNoHuHtrOrAggregationResult(result);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
});

test("no source or provenance details are emitted", () => {
  const result = calculate(validInput());

  assert.equal(result.status, "ready");
  assertNoSourceDetails(result);
});

test("unsafe private IDs and content are sanitized and not emitted", () => {
  const result = calculate(validInput({
    components: [
      validComponent(1, {
        componentId: "person-name",
        adjacentZoneId: "Strada Exemplu 12",
        area: {
          value: 12.5,
          unit: "m2",
          source: {
            sourceType: "+40722111222",
            sourceRecordId: "record-JohnDoe",
            sourceLocator: {
              note: "free text note about the owner"
            }
          }
        },
        thermalTransmittance: {
          value: 0.31,
          unit: "W/(m2*K)",
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-001",
            sourceRefs: ["John Doe"]
          }
        },
        bztu: {
          value: 0.76,
          unit: "dimensionless",
          source: {
            sourceType: "methodological_direct_input",
            sourceRecordId: "person@example.com"
          }
        }
      })
    ],
    explicitBlockers: [
      {
        code: "private-note"
      }
    ]
  }));

  assertBlockedWithoutTerms(result, "blocked_h3_calculation_readiness_not_ready");
});

test("arbitrary blocker and diagnostic strings are not passed through", () => {
  const result = calculate(validInput({
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
    components: [validComponent(1), validComponent(2)]
  });
  const before = clone(input);
  deepFreeze(input);

  const result = calculate(input);

  assert.equal(result.status, "ready");
  assert.deepEqual(input, before);
});

test("runtime import boundary allows only H3 and no IO or DB/API/UI/Worker imports", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HuComponentTermCalculation.mjs", import.meta.url),
    "utf8"
  );
  const importLines = moduleSource
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith("import "));

  assert.deepEqual(importLines, [
    'import { buildMc001HuHtrCalculationReadinessGate } from "./mc001HuHtrCalculationReadinessGate.mjs";'
  ]);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
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
  const result = calculate(validInput({
    components: [
      validComponent(1, {
        componentId: "person-name",
        adjacentZoneId: "Strada Exemplu 12",
        area: {
          value: 12.5,
          unit: "m2",
          source: {
            sourceType: "+40722111222",
            sourceRecordId: "record-JohnDoe"
          }
        },
        thermalTransmittance: {
          value: 0.31,
          unit: "W/(m2*K)",
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-001"
          }
        },
        bztu: {
          value: 0.76,
          unit: "dimensionless",
          source: {
            sourceType: "methodological_direct_input",
            sourceRecordId: "owner-snapshot",
            note: "private-note"
          }
        }
      })
    ],
    sourceContext: {
      owner: "John Doe",
      email: "person@example.com"
    }
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
  assertNoHuHtrOrAggregationResult(result);
});

test("formula code is controlled and finite", () => {
  const result = calculate(validInput());

  assert.equal(result.status, "ready");
  assert.equal(result.componentTerms[0].formulaCode, MC001_HU_COMPONENT_TERM_FORMULA_CODE);
  assert.equal(Number.isFinite(result.componentTerms[0].value), true);
  assertOnlyControlledFormulaCodes(result);
});

test("blocked component cannot emit partial calculated value", () => {
  const input = validInput();
  input.components[0].area.value = Number.MAX_VALUE;
  input.components[0].thermalTransmittance.value = Number.MAX_VALUE;
  const result = calculate(input);

  assert.equal(result.status, "blocked");
  assert.equal(result.componentTerms[0].status, "blocked");
  assert.equal(Object.hasOwn(result.componentTerms[0], "value"), false);
  assert.equal(Object.hasOwn(result.componentTerms[0], "unit"), false);
  assert.equal(Object.hasOwn(result.componentTerms[0], "formulaCode"), false);
});
