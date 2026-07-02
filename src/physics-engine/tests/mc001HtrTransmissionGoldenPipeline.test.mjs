import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateMc001HuComponentTerms
} from "../mc001HuComponentTermCalculation.mjs";
import {
  aggregateMc001HuComponentTerms
} from "../mc001HuAggregation.mjs";
import {
  buildMc001HtrTransmissionReadinessBridge
} from "../mc001HtrTransmissionReadinessBridge.mjs";
import {
  buildMc001HtrNonHuNumericValueValidationReadiness
} from "../mc001HtrNonHuNumericValueValidationReadiness.mjs";
import {
  buildMc001HtrTotalInputCompositionReadiness
} from "../mc001HtrTotalInputCompositionReadiness.mjs";
import {
  calculateMc001HtrTotal
} from "../mc001HtrTotalCalculation.mjs";
import {
  syntheticHtrTransmissionGoldenPipelineExpected,
  syntheticHtrTransmissionGoldenPipelineInput
} from "./fixtures/mc001HtrTransmissionGoldenPipelineFixture.mjs";

const EPSILON = 1e-9;

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

function h12Input() {
  return clone(syntheticHtrTransmissionGoldenPipelineInput);
}

function h11Input() {
  return h12Input().compositionInput;
}

function h10Input() {
  return h11Input().valueValidationInput;
}

function h3Input() {
  return h10Input()
    .contractReadinessInput
    .htrTotalReadinessInput
    .htrPrerequisitesInput
    .huBridgeInput;
}

function assertNear(actual, expected, label) {
  assert.equal(typeof actual, "number", `${label} should be numeric`);
  assert.equal(Number.isFinite(actual), true, `${label} should be finite`);
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `${label} expected ${expected} but received ${actual}`
  );
}

function componentTermById(result, componentId) {
  for (const term of result.componentTerms ?? []) {
    if (term.componentId === componentId) {
      return term;
    }
  }
  return null;
}

function contributionByType(entries, contributionType) {
  for (const entry of entries ?? []) {
    if (entry.contributionType === contributionType) {
      return entry;
    }
  }
  return null;
}

function collectKeyPaths(value, key, path = "", paths = []) {
  if (value === null || typeof value !== "object") {
    return paths;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      collectKeyPaths(value[index], key, `${path}[${index}]`, paths);
    }
    return paths;
  }
  for (const [childKey, childValue] of Object.entries(value)) {
    const childPath = path ? `${path}.${childKey}` : childKey;
    if (childKey === key) {
      paths.push(childPath);
    }
    collectKeyPaths(childValue, key, childPath, paths);
  }
  return paths;
}

function collectNumericPaths(value, path = "", paths = []) {
  if (typeof value === "number") {
    paths.push(path);
    return paths;
  }
  if (value === null || typeof value !== "object") {
    return paths;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      collectNumericPaths(value[index], `${path}[${index}]`, paths);
    }
    return paths;
  }
  for (const [childKey, childValue] of Object.entries(value)) {
    const childPath = path ? `${path}.${childKey}` : childKey;
    collectNumericPaths(childValue, childPath, paths);
  }
  return paths;
}

function fixtureSource() {
  return readFileSync(
    new URL("./fixtures/mc001HtrTransmissionGoldenPipelineFixture.mjs", import.meta.url),
    "utf8"
  );
}

function testSource() {
  return readFileSync(new URL(import.meta.url), "utf8");
}

function assertNoForbiddenOutputTerms(output) {
  const payload = clone(output);
  if (payload.htrTotalCalculation) {
    delete payload.htrTotalCalculation.missingForNextMethodologyScope;
  }
  const serialized = JSON.stringify(payload);
  const forbiddenTerms = [
    "QHnd",
    "monthly",
    "finalEnergy",
    "primaryEnergy",
    "CO2",
    "sourceRecordId",
    "sourceContext",
    "sourceTrace",
    "sourceLocator",
    "sourceRefs",
    "owner-snapshot",
    "private-note",
    "person-name",
    "record-JohnDoe",
    "record-001",
    "John Doe",
    "Strada Exemplu 12",
    "person@example.com",
    "+40722111222"
  ];
  for (const term of forbiddenTerms) {
    assert.equal(serialized.includes(term), false, `output leaked ${term}`);
  }
}

function runH4() {
  return calculateMc001HuComponentTerms(h3Input());
}

function runH5() {
  return aggregateMc001HuComponentTerms(h3Input());
}

function runH6() {
  return buildMc001HtrTransmissionReadinessBridge(h3Input());
}

function runH10() {
  return buildMc001HtrNonHuNumericValueValidationReadiness(h10Input());
}

function runH11() {
  return buildMc001HtrTotalInputCompositionReadiness(h11Input());
}

function runH12(input = h12Input()) {
  return calculateMc001HtrTotal(input);
}

test("golden fixture is synthetic and contains no private real world forbidden terms", () => {
  const serializedFixture = JSON.stringify(syntheticHtrTransmissionGoldenPipelineInput);
  const fixtureText = fixtureSource();
  const forbiddenFixtureTerms = [
    "Salicea",
    "Sălicea",
    "owner-snapshot",
    "private-note",
    "person-name",
    "record-JohnDoe",
    "record-001",
    "John Doe",
    "Strada Exemplu 12",
    "person@example.com",
    "+40722111222"
  ];

  for (const term of forbiddenFixtureTerms) {
    assert.equal(serializedFixture.includes(term), false);
    assert.equal(fixtureText.includes(term), false);
  }
});

test("golden fixture H4 component terms match expected constants", () => {
  const result = runH4();
  assert.equal(result.status, "ready");

  for (const expected of syntheticHtrTransmissionGoldenPipelineExpected.componentTerms) {
    const term = componentTermById(result, expected.runtimeComponentId);
    assert.ok(term, `missing ${expected.syntheticComponentId}`);
    assert.equal(term.status, "calculated");
    assert.equal(term.unit, expected.unit);
    assertNear(term.value, expected.amount, expected.syntheticComponentId);
  }
});

test("golden fixture H5 Hu aggregation equals expected constant", () => {
  const result = runH5();
  const expected = syntheticHtrTransmissionGoldenPipelineExpected.huAggregation;

  assert.equal(result.status, "ready");
  assert.equal(result.huAggregation.status, "calculated");
  assert.equal(result.huAggregation.unit, expected.unit);
  assertNear(result.huAggregation.value, expected.amount, "Hu aggregation");
});

test("golden fixture H6 bridge exposes expected Hu contribution", () => {
  const result = runH6();
  const expected = syntheticHtrTransmissionGoldenPipelineExpected.huAggregation;

  assert.equal(result.status, "ready");
  assert.equal(
    result.htrTransmissionBridge.huContribution.contributionType,
    "hu_aggregated_transmission_contribution"
  );
  assert.equal(result.htrTransmissionBridge.huContribution.unit, expected.unit);
  assertNear(
    result.htrTransmissionBridge.huContribution.value,
    expected.amount,
    "H6 Hu bridge"
  );
});

test("golden fixture H10 validates expected non-Hu values", () => {
  const result = runH10();
  const values =
    result.htrNonHuNumericValueValidationReadiness.validatedContributionValues;

  assert.equal(result.status, "ready");
  for (const expected of syntheticHtrTransmissionGoldenPipelineExpected.nonHuValues) {
    const valueRef = contributionByType(values, expected.contributionType);
    assert.ok(valueRef, `missing ${expected.contributionType}`);
    assert.equal(valueRef.valueStatus, "validated_source_backed_numeric_value");
    assert.equal(valueRef.contributionValue.unit, expected.unit);
    assertNear(
      valueRef.contributionValue.amount,
      expected.amount,
      expected.contributionType
    );
  }
});

test("golden fixture H11 composes exactly four Htr input entries", () => {
  const result = runH11();
  const entries = result.htrTotalInputCompositionReadiness.composedInputs;

  assert.equal(result.status, "ready");
  assert.equal(entries.length, 4);
  assert.equal(
    entries.filter((entry) => (
      entry.contributionType === "hu_aggregated_transmission_contribution"
    )).length,
    1
  );
  assert.equal(
    entries.filter((entry) => (
      entry.contributionType !== "hu_aggregated_transmission_contribution"
    )).length,
    3
  );
});

test("golden fixture H11 composed values match expected constants", () => {
  const result = runH11();
  const entries = result.htrTotalInputCompositionReadiness.composedInputs;

  for (const expected of syntheticHtrTransmissionGoldenPipelineExpected.h11ComposedInputs) {
    const entry = contributionByType(entries, expected.contributionType);
    assert.ok(entry, `missing ${expected.contributionType}`);
    assert.equal(entry.contributionValue.unit, expected.unit);
    assertNear(
      entry.contributionValue.amount,
      expected.amount,
      expected.contributionType
    );
  }
});

test("golden fixture H12 calculates expected Htr total", () => {
  const result = runH12();
  const expected = syntheticHtrTransmissionGoldenPipelineExpected.htrTotal;

  assert.equal(result.status, "ready");
  assert.equal(result.htrTotalCalculation.htrTotalResult.unit, expected.unit);
  assertNear(
    result.htrTotalCalculation.htrTotalResult.amount,
    expected.amount,
    "H12 Htr total"
  );
});

test("H12 calculation terms preserve individual expected values", () => {
  const result = runH12();
  const terms = result.htrTotalCalculation.calculationTerms;

  for (const expected of syntheticHtrTransmissionGoldenPipelineExpected.h11ComposedInputs) {
    const term = contributionByType(terms, expected.contributionType);
    assert.ok(term, `missing ${expected.contributionType}`);
    assert.equal(term.termStatus, "included_in_htr_total_calculation");
    assert.equal(term.contributionValue.unit, expected.unit);
    assertNear(
      term.contributionValue.amount,
      expected.amount,
      expected.contributionType
    );
  }
});

test("H12 emits Htr total only at the allowed result amount path", () => {
  const result = runH12();
  const keyPaths = collectKeyPaths(result, "htrTotalResult");
  const numericPaths = collectNumericPaths(result);

  assert.deepEqual(keyPaths, ["htrTotalCalculation.htrTotalResult"]);
  assert.ok(
    numericPaths.includes("htrTotalCalculation.htrTotalResult.amount")
  );
  assert.equal(collectKeyPaths(result, "htrTotal").length, 0);
  assert.equal(collectKeyPaths(result, "totalHtr").length, 0);
  assert.equal(collectKeyPaths(result, "htrResult").length, 0);
  assert.equal(collectKeyPaths(result, "formulaResult").length, 0);
});

test("H12 readiness flags match expected golden readiness", () => {
  const result = runH12();
  const expected = syntheticHtrTransmissionGoldenPipelineExpected.h12Readiness;

  assert.equal(result.status, expected.status);
  assert.equal(
    result.readiness.isHtrTotalCalculationReady,
    expected.isHtrTotalCalculationReady
  );
  assert.equal(result.readiness.hasHtrResult, expected.hasHtrResult);
  assert.equal(
    result.readiness.areHtrTotalInputsComposed,
    expected.areHtrTotalInputsComposed
  );
  assert.equal(
    result.readiness.areHtrTotalInputsNumericallyReady,
    expected.areHtrTotalInputsNumericallyReady
  );
  assert.equal(
    result.readiness.areNonHuHtrNumericValuesValidated,
    expected.areNonHuHtrNumericValuesValidated
  );
  assert.equal(result.readiness.isCompleteHuReady, expected.isCompleteHuReady);
  assert.equal(result.readiness.isCompleteHtrReady, expected.isCompleteHtrReady);
  assert.equal(result.readiness.hasHuResult, expected.hasHuResult);
  assert.equal(result.readiness.downstreamReadiness, expected.downstreamReadiness);
});

test("serialized H12 output omits downstream and private forbidden terms", () => {
  const result = runH12();

  assertNoForbiddenOutputTerms(result);
  assert.deepEqual(
    result.htrTotalCalculation.missingForNextMethodologyScope,
    [
      {
        code: "missing_qhnd_methodology_scope",
        severity: "blocking"
      },
      {
        code: "missing_monthly_heating_methodology_scope",
        severity: "blocking"
      },
      {
        code: "missing_final_primary_co2_methodology_scope",
        severity: "blocking"
      }
    ]
  );
});

test("no DB API UI Worker or orchestrator behavior is imported or invoked", () => {
  const imports = [];
  for (const line of testSource().split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("import ") && !trimmed.startsWith("} from ")) {
      continue;
    }
    const match = trimmed.match(/from "([^"]+)"/);
    if (match) {
      imports.push(match[1]);
    }
  }
  assert.deepEqual(imports.sort(), [
    "./fixtures/mc001HtrTransmissionGoldenPipelineFixture.mjs",
    "../mc001HtrNonHuNumericValueValidationReadiness.mjs",
    "../mc001HtrTotalCalculation.mjs",
    "../mc001HtrTotalInputCompositionReadiness.mjs",
    "../mc001HtrTransmissionReadinessBridge.mjs",
    "../mc001HuAggregation.mjs",
    "../mc001HuComponentTermCalculation.mjs",
    "node:assert/strict",
    "node:fs"
  ].sort());

  for (const importPath of imports) {
    const normalized = importPath.toLowerCase();
    assert.equal(normalized.includes("db"), false);
    assert.equal(normalized.includes("api"), false);
    assert.equal(normalized.includes("ui"), false);
    assert.equal(normalized.includes("worker"), false);
    assert.equal(normalized.includes("orchestrator"), false);
  }
});

test("fixture input object is not mutated", () => {
  const input = deepFreeze(h12Input());
  const before = JSON.stringify(input);

  runH12(input);

  assert.equal(JSON.stringify(input), before);
});

test("expected constants are not derived in test code by reimplementing formulas", () => {
  const sources = [testSource(), fixtureSource()];
  const operator = "*";
  const plus = "+";
  const equals = "=";
  const reduceCall = "." + "reduce(";
  const forbiddenSnippets = [
    `area.value ${operator}`,
    `thermalTransmittance.value ${operator}`,
    `bztu.value ${operator}`,
    `componentTerms[0].value ${plus}`,
    `huAggregation.value ${plus}`,
    `htrTotalResult.amount ${equals}`,
    reduceCall,
    `amount ${plus}${equals}`,
    `total ${plus}${equals}`
  ];

  for (const sourceText of sources) {
    for (const snippet of forbiddenSnippets) {
      assert.equal(sourceText.includes(snippet), false, snippet);
    }
  }
});

test("the test does not introduce new runtime formula logic", () => {
  const sourceText = testSource();
  const operator = "*";
  const functionCalculate = "function " + "calculate";
  const arrowCalculate = "=> " + "calculate";
  const newFunction = "new " + "Function";
  const evalCall = "eval" + "(";

  assert.equal(sourceText.includes(functionCalculate), false);
  assert.equal(sourceText.includes(arrowCalculate), false);
  assert.equal(sourceText.includes(newFunction), false);
  assert.equal(sourceText.includes(evalCall), false);
  assert.equal(sourceText.includes(`area.value ${operator}`), false);
  assert.equal(
    sourceText.includes(`thermalTransmittance.value ${operator}`),
    false
  );
  assert.equal(sourceText.includes(`bztu.value ${operator}`), false);
});

test("the test does not use reduce-based numeric aggregation", () => {
  const reduceCall = "." + "reduce(";
  assert.equal(testSource().includes(reduceCall), false);
  assert.equal(fixtureSource().includes(reduceCall), false);
});

test("the test does not add QHnd monthly final primary CO2 readiness", () => {
  const result = runH12();

  assert.equal(result.readiness.downstreamReadiness, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assertNoForbiddenOutputTerms(result);
});
