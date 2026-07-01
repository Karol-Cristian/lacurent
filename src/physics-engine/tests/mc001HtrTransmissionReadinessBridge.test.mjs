import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMc001HtrTransmissionReadinessBridge,
  H6_BLOCKER_CODES,
  H6_BRIDGE_CODES,
  H6_MISSING_CODES,
  H6_REFERENCED_FORMULA_CODES,
  MC001_H5_HU_AGGREGATION_BRIDGE_CODE,
  MC001_HTR_TRANSMISSION_READINESS_BRIDGE_SCHEMA_VERSION
} from "../mc001HtrTransmissionReadinessBridge.mjs";

const H3_INPUT_SCHEMA_VERSION =
  "mc001-h3-hu-htr-calculation-readiness-input-v1";
const H5_FORMULA_CODE = "MC001_HU_AGGREGATION_SUM_COMPONENT_TERMS";
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

async function testAsync(name, fn) {
  try {
    await fn();
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

function bridge(input) {
  return buildMc001HtrTransmissionReadinessBridge(input);
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

function assertH6Shape(result) {
  assert.equal(
    result.schemaVersion,
    MC001_HTR_TRANSMISSION_READINESS_BRIDGE_SCHEMA_VERSION
  );
  assert.equal(result.isMc001HtrTransmissionReadinessBridge, true);
  assert.ok(["ready", "blocked"].includes(result.status));
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

function assertBlockedWithoutBridgeValue(result, expectedCode) {
  assertH6Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.htrTransmissionBridge.status, "blocked");
  assert.equal(Object.hasOwn(result.htrTransmissionBridge, "huContribution"), false);
  assert.equal(
    JSON.stringify(result.htrTransmissionBridge).includes("huContribution"),
    false
  );
  assert.equal(result.readiness.isHuAggregationAvailableForHtr, false);
  assert.equal(result.readiness.isHtrTransmissionBridgeReady, false);
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
  const allowed = new Set(H6_BLOCKER_CODES);
  for (const blocker of result.blockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertOnlyControlledCodes(result) {
  const bridgeCodes = new Set(H6_BRIDGE_CODES);
  const missingCodes = new Set(H6_MISSING_CODES);
  const formulaCodes = new Set(H6_REFERENCED_FORMULA_CODES);

  if (result.status === "ready") {
    const contribution = result.htrTransmissionBridge.huContribution;
    assert.ok(bridgeCodes.has(contribution.bridgeCode));
    assert.equal(contribution.bridgeCode, MC001_H5_HU_AGGREGATION_BRIDGE_CODE);
    assert.ok(formulaCodes.has(contribution.sourceFormulaCode));
    assert.equal(contribution.sourceFormulaCode, H5_FORMULA_CODE);
    for (const missing of result.htrTransmissionBridge.missingForCompleteHtr) {
      assert.ok(missingCodes.has(missing.code), `${missing.code} is not allowlisted`);
      assert.equal(missing.severity, "blocking");
    }
  } else {
    assert.equal(Object.hasOwn(result.htrTransmissionBridge, "huContribution"), false);
  }
}

function assertNoCompleteHuHtrOrDownstream(result) {
  for (const key of [
    "huResult",
    "htrResult",
    "completeHuResult",
    "completeHtrResult",
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

function validH5Result(extra = {}) {
  return {
    status: "ready",
    readiness: {
      isHuInventoryReady: true,
      isHuComponentTermCalculationReady: true,
      areHuComponentTermsCalculated: true,
      isHuAggregationReady: true,
      hasHuAggregationResult: true,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    },
    huAggregation: {
      status: "calculated",
      value: 2.945,
      unit: "W/K",
      formulaCode: H5_FORMULA_CODE,
      componentCount: 1
    },
    blockers: [],
    ...extra
  };
}

async function bridgeWithStubbedH5(h5Result, input = validInput()) {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTransmissionReadinessBridge.mjs", import.meta.url),
    "utf8"
  );
  const stubbedSource = moduleSource.replace(
    /import \{[\s\S]*?\} from "\.\/mc001HuAggregation\.mjs";/,
    `const MC001_HU_AGGREGATION_FORMULA_CODE = "${H5_FORMULA_CODE}";\nfunction aggregateMc001HuComponentTerms() { return globalThis.__MC001_H6_STUBBED_H5_RESULT; }`
  );
  globalThis.__MC001_H6_STUBBED_H5_RESULT = h5Result;
  const encoded = Buffer.from(stubbedSource, "utf8").toString("base64");
  const module = await import(`data:text/javascript;base64,${encoded}#${Math.random()}`);
  try {
    return module.buildMc001HtrTransmissionReadinessBridge(input);
  } finally {
    delete globalThis.__MC001_H6_STUBBED_H5_RESULT;
  }
}

test("invalid input blocks safely", () => {
  for (const input of [null, undefined, "not input", [], 42]) {
    const result = bridge(input);

    assertBlockedWithoutBridgeValue(result, "blocked_invalid_h6_input");
    assert.equal(result.counts.bridgeContributions, 0);
    assert.equal(result.counts.missingForCompleteHtr, 0);
  }
});

test("raw saved-analysis-like input is rejected", () => {
  const result = bridge({
    analysis: { id: "analysis:analysis-001" },
    building: { id: "building:building-001" },
    answers: [{ value: "ordinary saved app answer" }],
    mc001Readiness: {}
  });

  assertBlockedWithoutBridgeValue(result, "blocked_raw_saved_analysis_input");
});

test("H5-blocked input causes H6 blocked output and no huContribution value", () => {
  const result = bridge(validInput({
    inventoryReadiness: {
      isHuInventoryReady: false
    }
  }));

  assertBlockedWithoutBridgeValue(result, "blocked_h5_hu_aggregation_not_ready");
});

test("valid single component reaches bridged Hu contribution", () => {
  const result = bridge(validInput());
  const expected = 12.5 * 0.31 * 0.76;

  assertH6Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(result.readiness.isHuInventoryReady, true);
  assert.equal(result.readiness.isHuComponentTermCalculationReady, true);
  assert.equal(result.readiness.areHuComponentTermsCalculated, true);
  assert.equal(result.readiness.isHuAggregationReady, true);
  assert.equal(result.readiness.hasHuAggregationResult, true);
  assert.equal(result.readiness.isHuAggregationAvailableForHtr, true);
  assert.equal(result.readiness.isHtrTransmissionBridgeReady, true);
  assert.equal(
    result.htrTransmissionBridge.huContribution.contributionType,
    "hu_aggregated_transmission_contribution"
  );
  assert.equal(result.htrTransmissionBridge.huContribution.value, expected);
  assert.equal(result.htrTransmissionBridge.huContribution.unit, "W/K");
  assert.equal(
    result.htrTransmissionBridge.huContribution.sourceFormulaCode,
    H5_FORMULA_CODE
  );
  assert.equal(
    result.htrTransmissionBridge.huContribution.bridgeCode,
    MC001_H5_HU_AGGREGATION_BRIDGE_CODE
  );
  assert.equal(result.counts.bridgeContributions, 1);
  assert.equal(result.counts.missingForCompleteHtr, 1);
  assert.equal(result.counts.blockers, 0);
  assertOnlyControlledCodes(result);
  assertNoCompleteHuHtrOrDownstream(result);
  assertNoSourceDetails(result);
});

test("valid multiple components reaches bridged Hu contribution from H5 aggregation", () => {
  const result = bridge(validInput({
    components: [validComponent(1), validComponent(2)]
  }));
  const expected = (12.5 * 0.31 * 0.76) + (8.75 * 0.29 * 0.64);

  assert.equal(result.status, "ready");
  assert.equal(result.htrTransmissionBridge.huContribution.value, expected);
  assert.equal(result.htrTransmissionBridge.huContribution.unit, "W/K");
  assertOnlyControlledCodes(result);
});

test("zero-valued Hu aggregation can be bridged", () => {
  const input = validInput();
  input.components[0].bztu.value = 0;
  const result = bridge(input);

  assert.equal(result.status, "ready");
  assert.equal(result.htrTransmissionBridge.huContribution.value, 0);
  assert.equal(result.htrTransmissionBridge.huContribution.unit, "W/K");
});

await testAsync("non-finite Hu bridge contribution blocks safely", async () => {
  const result = await bridgeWithStubbedH5(validH5Result({
    huAggregation: {
      status: "calculated",
      value: Infinity,
      unit: "W/K",
      formulaCode: H5_FORMULA_CODE,
      componentCount: 1
    }
  }));

  assertBlockedWithoutBridgeValue(
    result,
    "blocked_non_finite_hu_bridge_contribution"
  );
});

await testAsync("invalid H5 aggregation shape blocks safely", async () => {
  const result = await bridgeWithStubbedH5(validH5Result({
    huAggregation: {
      status: "calculated",
      value: 2.945,
      unit: "kW/K",
      formulaCode: "MC001_UNKNOWN_SAFE_CODE",
      componentCount: 1
    }
  }));

  assertBlockedWithoutBridgeValue(result, "blocked_invalid_h5_hu_aggregation");
});

test("precomputed arbitrary Hu aggregation and Htr components from input are ignored", () => {
  const result = bridge(validInput({
    huAggregation: {
      status: "calculated",
      value: 999999,
      unit: "W/K",
      formulaCode: "private-note"
    },
    componentTerms: [{ value: 999999 }],
    htrComponents: [{ code: "owner-snapshot" }]
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.htrTransmissionBridge.huContribution.value, 12.5 * 0.31 * 0.76);
  assertNoForbiddenOutput(result);
});

test("no direct A * U * bztu formula exists in H6", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTransmissionReadinessBridge.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("area?.value *"), false);
  assert.equal(moduleSource.includes("area.value *"), false);
  assert.equal(moduleSource.includes("thermalTransmittance"), false);
  assert.equal(moduleSource.includes("bztu?.value"), false);
  assert.equal(moduleSource.includes("A * U"), false);
});

test("no direct sum component term formula exists in H6", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTransmissionReadinessBridge.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("componentTerm.value"), false);
  assert.equal(moduleSource.includes(".reduce("), false);
  assert.equal(moduleSource.includes("sum +"), false);
});

test("no recalculation from area U or BZTU happens in H6", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTransmissionReadinessBridge.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("component.area"), false);
  assert.equal(moduleSource.includes("component.thermalTransmittance"), false);
  assert.equal(moduleSource.includes("component.bztu"), false);
  assert.equal(moduleSource.includes("thermalTransmittanceFrom"), false);
});

test("no recomputation of H4 or H5 formulas happens inside H6", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTransmissionReadinessBridge.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("*"), false);
  assert.equal(moduleSource.includes("sum(componentTerm.value)"), false);
  assert.equal(moduleSource.includes("sum + componentTerm.value"), false);
});

test("no complete Hu or Htr result is emitted", () => {
  const result = bridge(validInput());

  assertNoCompleteHuHtrOrDownstream(result);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
});

test("no downstream readiness escalation occurs", () => {
  const result = bridge(validInput());

  assert.equal(result.status, "ready");
  assert.equal(result.readiness.downstreamReadiness, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
});

test("missingForCompleteHtr is present as safe blocker metadata when bridge is ready", () => {
  const result = bridge(validInput());

  assert.equal(result.status, "ready");
  assert.deepEqual(result.htrTransmissionBridge.missingForCompleteHtr, [
    {
      code: "missing_non_hu_transmission_components",
      severity: "blocking"
    }
  ]);
  assertOnlyControlledCodes(result);
});

test("no source or provenance details are emitted", () => {
  const result = bridge(validInput());

  assert.equal(result.status, "ready");
  assertNoSourceDetails(result);
});

test("unsafe private IDs and content are sanitized and not emitted", () => {
  const result = bridge(validInput({
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

  assertBlockedWithoutBridgeValue(result, "blocked_h5_hu_aggregation_not_ready");
});

test("arbitrary blocker and diagnostic strings are not passed through", () => {
  const result = bridge(validInput({
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

  const result = bridge(input);

  assert.equal(result.status, "ready");
  assert.deepEqual(input, before);
});

test("runtime import boundary allows only H5 and no IO or DB/API/UI/Worker imports", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTransmissionReadinessBridge.mjs", import.meta.url),
    "utf8"
  );
  const importBlocks = (moduleSource.match(/import[\s\S]*?;\r?\n/g) ?? [])
    .map((block) => block.replace(/\r\n/g, "\n"));

  assert.deepEqual(importBlocks, [
    'import {\n  aggregateMc001HuComponentTerms,\n  MC001_HU_AGGREGATION_FORMULA_CODE\n} from "./mc001HuAggregation.mjs";\n'
  ]);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
    "mc001HuHtrCalculationReadinessGate",
    "mc001HuComponentTermCalculation",
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
  const result = bridge(validInput({
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

test("bridge and source codes are controlled and finite", () => {
  const result = bridge(validInput());

  assert.equal(result.status, "ready");
  assert.equal(
    result.htrTransmissionBridge.huContribution.bridgeCode,
    MC001_H5_HU_AGGREGATION_BRIDGE_CODE
  );
  assert.equal(
    result.htrTransmissionBridge.huContribution.sourceFormulaCode,
    H5_FORMULA_CODE
  );
  assert.equal(Number.isFinite(result.htrTransmissionBridge.huContribution.value), true);
  assertOnlyControlledCodes(result);
  assert.ok(new Set(H6_REFERENCED_FORMULA_CODES).has(H4_FORMULA_CODE));
});

test("blocked bridge cannot emit partial huContribution value", () => {
  const input = validInput();
  input.components[0].area.value = Number.MAX_VALUE;
  input.components[0].thermalTransmittance.value = Number.MAX_VALUE;
  const result = bridge(input);

  assert.equal(result.status, "blocked");
  assert.equal(result.htrTransmissionBridge.status, "blocked");
  assert.equal(Object.hasOwn(result.htrTransmissionBridge, "huContribution"), false);
  assert.equal(JSON.stringify(result).includes("huContribution"), false);
  assert.equal(result.counts.bridgeContributions, 0);
});
