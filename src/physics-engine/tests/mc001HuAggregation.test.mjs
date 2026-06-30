import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  aggregateMc001HuComponentTerms,
  H5_BLOCKER_CODES,
  H5_FORMULA_CODES,
  MC001_HU_AGGREGATION_FORMULA_CODE,
  MC001_HU_AGGREGATION_SCHEMA_VERSION
} from "../mc001HuAggregation.mjs";

const H3_INPUT_SCHEMA_VERSION =
  "mc001-h3-hu-htr-calculation-readiness-input-v1";
const H4_FORMULA_CODE = "MC001_HU_COMPONENT_TERM_A_U_BZTU";

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
    schemaVersion: H3_INPUT_SCHEMA_VERSION,
    isMc001HuHtrCalculationReadinessInput: true,
    inventoryReadiness: {
      isHuInventoryReady: true
    },
    components: [validComponent()],
    ...extra
  };
}

function aggregate(input) {
  return aggregateMc001HuComponentTerms(input);
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

function assertH5Shape(result) {
  assert.equal(result.schemaVersion, MC001_HU_AGGREGATION_SCHEMA_VERSION);
  assert.equal(result.isMc001HuAggregation, true);
  assert.ok(["ready", "blocked"].includes(result.status));
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

function assertBlockedWithoutAggregate(result, expectedCode) {
  assertH5Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.huAggregation.status, "blocked");
  assert.equal(Object.hasOwn(result.huAggregation, "value"), false);
  assert.equal(result.readiness.isHuAggregationReady, false);
  assert.equal(result.readiness.hasHuAggregationResult, false);
  assert.ok(blockerCodes(result).includes(expectedCode));
  assertOnlyAllowlistedBlockers(result);
  assertNoForbiddenOutput(result);
  assertNoSourceDetails(result);
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
  const allowed = new Set(H5_BLOCKER_CODES);
  for (const blocker of result.blockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertOnlyControlledFormulaCodes(result) {
  const allowed = new Set(H5_FORMULA_CODES);
  if (result.status === "ready") {
    assert.ok(allowed.has(result.huAggregation.formulaCode));
    assert.equal(result.huAggregation.formulaCode, MC001_HU_AGGREGATION_FORMULA_CODE);
  } else {
    assert.equal(Object.hasOwn(result.huAggregation, "formulaCode"), false);
  }
  for (const termRef of result.componentTermRefs) {
    assert.ok(allowed.has(termRef.formulaCode));
    assert.equal(termRef.formulaCode, H4_FORMULA_CODE);
  }
}

function assertNoCompleteHuHtrOrDownstream(result) {
  for (const key of [
    "huResult",
    "htrResult",
    "completeHuResult",
    "completeHtrResult",
    "htr",
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
    const result = aggregate(input);

    assertBlockedWithoutAggregate(result, "blocked_invalid_h5_input");
    assert.equal(result.counts.components, 0);
    assert.equal(result.counts.componentTerms, 0);
  }
});

test("raw saved-analysis-like input is rejected", () => {
  const result = aggregate({
    analysis: { id: "analysis:analysis-001" },
    building: { id: "building:building-001" },
    answers: [{ value: "ordinary saved app answer" }],
    mc001Readiness: {}
  });

  assertBlockedWithoutAggregate(result, "blocked_raw_saved_analysis_input");
});

test("H4-blocked input causes H5 blocked output and no aggregate value", () => {
  const result = aggregate(validInput({
    inventoryReadiness: {
      isHuInventoryReady: false
    }
  }));

  assertBlockedWithoutAggregate(result, "blocked_h4_component_terms_not_ready");
  assert.equal(result.counts.components, 1);
});

test("valid single component aggregates to that component term value", () => {
  const result = aggregate(validInput());
  const expected = 12.5 * 0.31 * 0.76;

  assertH5Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(result.readiness.isHuInventoryReady, true);
  assert.equal(result.readiness.isHuComponentTermCalculationReady, true);
  assert.equal(result.readiness.areHuComponentTermsCalculated, true);
  assert.equal(result.readiness.isHuAggregationReady, true);
  assert.equal(result.readiness.hasHuAggregationResult, true);
  assert.equal(result.huAggregation.status, "calculated");
  assert.equal(result.huAggregation.value, expected);
  assert.equal(result.huAggregation.unit, "W/K");
  assert.equal(result.huAggregation.componentCount, 1);
  assert.equal(result.componentTermRefs.length, 1);
  assert.equal(result.componentTermRefs[0].value, expected);
  assert.equal(result.componentTermRefs[0].formulaCode, H4_FORMULA_CODE);
  assert.equal(result.counts.components, 1);
  assert.equal(result.counts.componentTerms, 1);
  assert.equal(result.counts.blockers, 0);
  assertOnlyControlledFormulaCodes(result);
  assertNoCompleteHuHtrOrDownstream(result);
  assertNoSourceDetails(result);
});

test("valid multiple components aggregate by summing H4 component term values", () => {
  const result = aggregate(validInput({
    components: [validComponent(1), validComponent(2)]
  }));
  const first = 12.5 * 0.31 * 0.76;
  const second = 8.75 * 0.29 * 0.64;

  assert.equal(result.status, "ready");
  assert.equal(result.huAggregation.value, first + second);
  assert.equal(result.huAggregation.componentCount, 2);
  assert.deepEqual(
    result.componentTermRefs.map((entry) => entry.componentId),
    ["hu-component:wall-001", "hu-component:wall-002"]
  );
  assert.equal(result.counts.componentTerms, 2);
  assertOnlyControlledFormulaCodes(result);
});

test("zero-valued component terms are allowed", () => {
  const input = validInput();
  input.components[0].bztu.value = 0;
  const result = aggregate(input);

  assert.equal(result.status, "ready");
  assert.equal(result.huAggregation.value, 0);
  assert.equal(result.componentTermRefs[0].value, 0);
  assert.equal(result.huAggregation.unit, "W/K");
});

test("non-finite aggregation result blocks safely", () => {
  const large = validComponent(1, {
    area: {
      value: Number.MAX_VALUE,
      unit: "m2",
      source: validSource("area-large-001")
    },
    thermalTransmittance: {
      value: 1,
      unit: "W/(m2*K)",
      source: validSource("u-large-001")
    },
    bztu: {
      value: 1,
      unit: "dimensionless",
      source: validSource("bztu-large-001", "methodological_direct_input")
    }
  });
  const result = aggregate(validInput({
    components: [
      large,
      {
        ...clone(large),
        componentId: "hu-component:wall-002",
        area: {
          value: Number.MAX_VALUE,
          unit: "m2",
          source: validSource("area-large-002")
        }
      }
    ]
  }));

  assertBlockedWithoutAggregate(result, "blocked_non_finite_hu_aggregation");
});

test("missing or invalid component term blocks safely through H4 guard", () => {
  const input = validInput();
  input.components[0].area.value = Number.MAX_VALUE;
  input.components[0].thermalTransmittance.value = Number.MAX_VALUE;
  const result = aggregate(input);

  assertBlockedWithoutAggregate(result, "blocked_h4_component_terms_not_ready");
  assert.equal(result.componentTermRefs.length, 0);
});

test("precomputed arbitrary component terms from input are ignored", () => {
  const result = aggregate(validInput({
    componentTerms: [
      {
        componentId: "person-name",
        value: 999999,
        unit: "W/K",
        formulaCode: "private-note"
      }
    ]
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.huAggregation.value, 12.5 * 0.31 * 0.76);
  assertNoForbiddenOutput(result);
});

test("no direct A * U * bztu formula exists in H5", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HuAggregation.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("area?.value *"), false);
  assert.equal(moduleSource.includes("area.value *"), false);
  assert.equal(moduleSource.includes("thermalTransmittance"), false);
  assert.equal(moduleSource.includes("bztu?.value"), false);
  assert.equal(moduleSource.includes("A * U"), false);
});

test("no recalculation from area U or BZTU happens in H5", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HuAggregation.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("component.area"), false);
  assert.equal(moduleSource.includes("component.thermalTransmittance"), false);
  assert.equal(moduleSource.includes("component.bztu"), false);
  assert.equal(moduleSource.includes("thermalTransmittanceFrom"), false);
});

test("no complete Hu or Htr result is emitted", () => {
  const result = aggregate(validInput());

  assertNoCompleteHuHtrOrDownstream(result);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
});

test("no downstream readiness escalation occurs", () => {
  const result = aggregate(validInput());

  assert.equal(result.status, "ready");
  assert.equal(result.readiness.downstreamReadiness, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
});

test("no source or provenance details are emitted", () => {
  const result = aggregate(validInput());

  assert.equal(result.status, "ready");
  assertNoSourceDetails(result);
});

test("unsafe private IDs and content are sanitized and not emitted", () => {
  const result = aggregate(validInput({
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
    ]
  }));

  assertBlockedWithoutAggregate(result, "blocked_h4_component_terms_not_ready");
});

test("arbitrary blocker and diagnostic strings are not passed through", () => {
  const result = aggregate(validInput({
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

  const result = aggregate(input);

  assert.equal(result.status, "ready");
  assert.deepEqual(input, before);
});

test("runtime import boundary allows only H4 and no IO or DB/API/UI/Worker imports", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HuAggregation.mjs", import.meta.url),
    "utf8"
  );
  const importBlocks = moduleSource.match(/import[\s\S]*?;\n/g) ?? [];

  assert.deepEqual(importBlocks, [
    'import {\n  calculateMc001HuComponentTerms,\n  MC001_HU_COMPONENT_TERM_FORMULA_CODE\n} from "./mc001HuComponentTermCalculation.mjs";\n'
  ]);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
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
  const result = aggregate(validInput({
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
  assertNoCompleteHuHtrOrDownstream(result);
});

test("formula codes are controlled and finite", () => {
  const result = aggregate(validInput());

  assert.equal(result.status, "ready");
  assert.equal(result.huAggregation.formulaCode, MC001_HU_AGGREGATION_FORMULA_CODE);
  assert.equal(Number.isFinite(result.huAggregation.value), true);
  assertOnlyControlledFormulaCodes(result);
});

test("blocked aggregation cannot emit partial aggregate value", () => {
  const input = validInput();
  input.components[0].area.value = Number.MAX_VALUE;
  input.components[0].thermalTransmittance.value = Number.MAX_VALUE;
  const result = aggregate(input);

  assert.equal(result.status, "blocked");
  assert.equal(result.huAggregation.status, "blocked");
  assert.equal(Object.hasOwn(result.huAggregation, "value"), false);
  assert.equal(Object.hasOwn(result.huAggregation, "unit"), false);
  assert.equal(Object.hasOwn(result.huAggregation, "formulaCode"), false);
  assert.equal(result.componentTermRefs.length, 0);
});
