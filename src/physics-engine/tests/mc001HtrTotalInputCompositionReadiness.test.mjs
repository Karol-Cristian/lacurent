import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMc001HtrTotalInputCompositionReadiness,
  H11_BLOCKER_CODES,
  H11_COMPOSITION_MODES,
  H11_COMPOSITION_SET_CODES,
  H11_COMPOSITION_STATUSES,
  H11_CONTRIBUTION_TYPES,
  H11_MISSING_CODES,
  H11_REQUIRED_INPUT_TYPES,
  MC001_HTR_TOTAL_INPUT_COMPOSITION_INPUT_SCHEMA_VERSION,
  MC001_HTR_TOTAL_INPUT_COMPOSITION_READINESS_SCHEMA_VERSION
} from "../mc001HtrTotalInputCompositionReadiness.mjs";

const H3_INPUT_SCHEMA_VERSION =
  "mc001-h3-hu-htr-calculation-readiness-input-v1";
const H7_INPUT_SCHEMA_VERSION =
  "mc001-h7-htr-non-hu-prerequisites-input-v1";
const H8_INPUT_SCHEMA_VERSION =
  "mc001-h8-htr-total-calculation-readiness-input-v1";
const H9_INPUT_SCHEMA_VERSION =
  "mc001-h9-htr-non-hu-numeric-contribution-contracts-input-v1";
const H10_INPUT_SCHEMA_VERSION =
  "mc001-h10-htr-non-hu-numeric-value-validation-input-v1";

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

function validSource(id = "h11-source-001", sourceType = "calculation_record") {
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

function huScopeContribution(extra = {}) {
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
      huScopeContribution(),
      contribution("thermal_bridge_transmission_contribution")
    ],
    ...extra
  };
}

function validH8Input(extra = {}) {
  return {
    schemaVersion: H8_INPUT_SCHEMA_VERSION,
    isMc001HtrTotalCalculationReadinessInput: true,
    htrPrerequisitesInput: validH7Input(),
    htrTotalCalculationScope: validScope(),
    ...extra
  };
}

function contract(
  contributionType = "thermal_bridge_transmission_contribution",
  extra = {}
) {
  return {
    contributionType,
    contractStatus: "numeric_contract_mapped",
    valueAvailabilityStatus: "source_backed_value_available",
    requiredUnit: "W/K",
    source: validSource(`htr-non-hu-contract-${contributionType}`),
    ...extra
  };
}

function withoutFields(value, fields) {
  for (const field of fields) {
    delete value[field];
  }
  return value;
}

function validContractSet(extra = {}) {
  return {
    contractSetCode: "mc001-htr-non-hu-numeric-contribution-contracts-v1",
    contributionContracts: [
      contract("thermal_bridge_transmission_contribution")
    ],
    ...extra
  };
}

function validH9Input(extra = {}) {
  return {
    schemaVersion: H9_INPUT_SCHEMA_VERSION,
    isMc001HtrNonHuNumericContributionContractsInput: true,
    htrTotalReadinessInput: validH8Input(),
    nonHuNumericContributionContracts: validContractSet(),
    ...extra
  };
}

function explicitValue(
  contributionType = "thermal_bridge_transmission_contribution",
  amount = 12.5,
  extra = {}
) {
  return {
    contributionType,
    valueStatus: "explicit_source_backed_value",
    contributionValue: {
      amount,
      unit: "W/K"
    },
    source: validSource(
      `htr-non-hu-value-${contributionType}`,
      "upstream_calculation_output"
    ),
    ...extra
  };
}

function notApplicableValue(
  contributionType = "ground_transmission_contribution",
  extra = {}
) {
  return {
    contributionType,
    valueStatus: "not_applicable_with_source",
    source: validSource(
      `htr-non-hu-value-${contributionType}`,
      "upstream_calculation_output"
    ),
    ...extra
  };
}

function validValueSet(extra = {}) {
  return {
    valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
    contributionValues: [
      explicitValue("thermal_bridge_transmission_contribution")
    ],
    ...extra
  };
}

function validH10Input(extra = {}) {
  return {
    schemaVersion: H10_INPUT_SCHEMA_VERSION,
    isMc001HtrNonHuNumericValueValidationInput: true,
    contractReadinessInput: validH9Input(),
    nonHuNumericContributionValues: validValueSet(),
    ...extra
  };
}

function validPolicy(extra = {}) {
  return {
    compositionSetCode: "mc001-htr-total-input-composition-v1",
    compositionMode: "compose_hu_bridge_and_validated_non_hu_values",
    requiredInputTypes: [
      "hu_aggregated_transmission_contribution",
      "validated_non_hu_transmission_contributions"
    ],
    ...extra
  };
}

function validInput(extra = {}) {
  return {
    schemaVersion: MC001_HTR_TOTAL_INPUT_COMPOSITION_INPUT_SCHEMA_VERSION,
    isMc001HtrTotalInputCompositionInput: true,
    valueValidationInput: validH10Input(),
    htrTotalInputCompositionPolicy: validPolicy(),
    ...extra
  };
}

function readiness(input) {
  return buildMc001HtrTotalInputCompositionReadiness(input);
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

function collectContributionValueAmounts(value, found = []) {
  if (!value || typeof value !== "object") {
    return found;
  }
  if (
    Object.hasOwn(value, "contributionValue") &&
    value.contributionValue &&
    typeof value.contributionValue === "object" &&
    Object.hasOwn(value.contributionValue, "amount")
  ) {
    found.push(value.contributionValue.amount);
  }
  for (const child of Object.values(value)) {
    collectContributionValueAmounts(child, found);
  }
  return found;
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
    "sourceRecordId"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertNoSourceDetails(result) {
  const output = JSON.stringify(result);
  for (const forbidden of [
    "sourceType",
    "sourceRecordId",
    "calculation_record",
    "methodological_direct_input",
    "validation_fixture_import",
    "expert_override_with_source",
    "upstream_calculation_output",
    "record:htr"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertNoHtrTotalOrDownstream(result) {
  for (const key of [
    "huResult",
    "htrResult",
    "htrTotal",
    "totalHtr",
    "htrFormulaResult",
    "formulaResult",
    "resultValue",
    "calculatedHtr",
    "completeHtr",
    "QHnd",
    "monthly",
    "finalEnergy",
    "primaryEnergy",
    "CO2",
    "aggregateValue"
  ]) {
    assert.equal(hasKeyDeep(result, key), false, `${key} leaked`);
  }
  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

function assertH11Shape(result) {
  assert.equal(
    result.schemaVersion,
    MC001_HTR_TOTAL_INPUT_COMPOSITION_READINESS_SCHEMA_VERSION
  );
  assert.equal(result.isMc001HtrTotalInputCompositionReadiness, true);
  assert.ok(["ready", "blocked"].includes(result.status));
  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

function assertOnlyAllowlistedBlockers(result) {
  const allowed = new Set(H11_BLOCKER_CODES);
  for (const blocker of result.blockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertOnlyControlledCodes(result) {
  const missingCodes = new Set(H11_MISSING_CODES);
  const contributionTypes = new Set(H11_CONTRIBUTION_TYPES);
  const statuses = new Set(H11_COMPOSITION_STATUSES);
  assert.ok(
    new Set(H11_COMPOSITION_SET_CODES).has(
      result.htrTotalInputCompositionReadiness.compositionSetCode
    )
  );
  assert.ok(
    new Set(H11_COMPOSITION_MODES).has(
      result.htrTotalInputCompositionReadiness.compositionMode
    )
  );
  for (const entry of result.htrTotalInputCompositionReadiness.composedInputs) {
    assert.ok(contributionTypes.has(entry.contributionType));
    assert.ok(statuses.has(entry.valueStatus));
    if (entry.contributionValue) {
      assert.equal(typeof entry.contributionValue.amount, "number");
      assert.equal(Number.isFinite(entry.contributionValue.amount), true);
      assert.equal(entry.contributionValue.unit, "W/K");
    }
  }
  for (const missing of
    result.htrTotalInputCompositionReadiness.missingForHtrTotalCalculation) {
    assert.ok(missingCodes.has(missing.code), `${missing.code} is not allowlisted`);
    assert.equal(missing.severity, "blocking");
  }
}

function assertBlocked(result, expectedCode) {
  assertH11Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.htrTotalInputCompositionReadiness.status, "blocked");
  assert.equal(result.readiness.areHtrTotalInputsComposed, false);
  assert.equal(result.readiness.areHtrTotalInputsNumericallyReady, false);
  assert.deepEqual(
    result.htrTotalInputCompositionReadiness.composedInputs,
    []
  );
  assert.ok(blockerCodes(result).includes(expectedCode));
  assertOnlyAllowlistedBlockers(result);
  assertNoForbiddenOutput(result);
  assertNoSourceDetails(result);
  assertNoHtrTotalOrDownstream(result);
}

function validH10Result(extra = {}) {
  return {
    status: "ready",
    readiness: {
      isHuInventoryReady: true,
      isHuComponentTermCalculationReady: true,
      areHuComponentTermsCalculated: true,
      isHuAggregationReady: true,
      hasHuAggregationResult: true,
      isHuAggregationAvailableForHtr: true,
      isHtrTransmissionBridgeReady: true,
      areNonHuHtrPrerequisitesMapped: true,
      isHtrTotalCalculationScopeMapped: true,
      areNonHuHtrNumericContributionContractsMapped: true,
      areNonHuHtrNumericValuesValidated: true,
      areHtrTotalInputsNumericallyReady: false,
      isHtrTotalCalculationReady: false,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    },
    htrNonHuNumericValueValidationReadiness: {
      status: "values_validated_not_htr_total_inputs_composed",
      h9ContractStatus: "ready",
      valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
      validatedContributionValues: [
        {
          contributionType: "thermal_bridge_transmission_contribution",
          valueStatus: "validated_source_backed_numeric_value",
          contributionValue: {
            amount: 12.5,
            unit: "W/K"
          }
        }
      ],
      missingForHtrTotalCalculation: []
    },
    blockers: [],
    ...extra
  };
}

function validH6Result(extra = {}) {
  return {
    status: "ready",
    readiness: {
      isHuInventoryReady: true,
      isHuComponentTermCalculationReady: true,
      areHuComponentTermsCalculated: true,
      isHuAggregationReady: true,
      hasHuAggregationResult: true,
      isHuAggregationAvailableForHtr: true,
      isHtrTransmissionBridgeReady: true,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    },
    htrTransmissionBridge: {
      status: "ready",
      huContribution: {
        contributionType: "hu_aggregated_transmission_contribution",
        value: 2.945,
        unit: "W/K",
        sourceFormulaCode: "MC001_HU_AGGREGATION_SUM_COMPONENT_TERMS",
        bridgeCode: "MC001_H5_HU_AGGREGATION_BRIDGED_FOR_FUTURE_HTR"
      },
      missingForCompleteHtr: []
    },
    blockers: [],
    ...extra
  };
}

async function compositionWithStubbedGuards({
  h10Result = validH10Result(),
  h6Result = validH6Result(),
  input = validInput()
} = {}) {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalInputCompositionReadiness.mjs", import.meta.url),
    "utf8"
  );
  const stubbedSource = moduleSource
    .replace(
      /import \{ buildMc001HtrNonHuNumericValueValidationReadiness \} from "\.\/mc001HtrNonHuNumericValueValidationReadiness\.mjs";/,
      "function buildMc001HtrNonHuNumericValueValidationReadiness() { return globalThis.__MC001_H11_STUBBED_H10_RESULT; }"
    )
    .replace(
      /import \{ buildMc001HtrTransmissionReadinessBridge \} from "\.\/mc001HtrTransmissionReadinessBridge\.mjs";/,
      "function buildMc001HtrTransmissionReadinessBridge() { return globalThis.__MC001_H11_STUBBED_H6_RESULT; }"
    );
  globalThis.__MC001_H11_STUBBED_H10_RESULT = h10Result;
  globalThis.__MC001_H11_STUBBED_H6_RESULT = h6Result;
  const encoded = Buffer.from(stubbedSource, "utf8").toString("base64");
  const module = await import(`data:text/javascript;base64,${encoded}#${Math.random()}`);
  try {
    return module.buildMc001HtrTotalInputCompositionReadiness(input);
  } finally {
    delete globalThis.__MC001_H11_STUBBED_H10_RESULT;
    delete globalThis.__MC001_H11_STUBBED_H6_RESULT;
  }
}

test("invalid input blocks safely", () => {
  for (const input of [null, undefined, "not input", [], 42]) {
    const result = readiness(input);

    assertBlocked(result, "blocked_invalid_h11_input");
  }
});

test("raw saved-analysis-like input is rejected", () => {
  const result = readiness({
    analysis: {
      sourceContext: "owner-snapshot"
    },
    answers: []
  });

  assertBlocked(result, "blocked_raw_saved_analysis_input");
});

test("missing valueValidationInput blocks safely", () => {
  const input = validInput();
  delete input.valueValidationInput;
  const result = readiness(input);

  assertBlocked(result, "blocked_h10_values_not_ready");
});

test("H10-blocked input causes H11 blocked output", () => {
  const result = readiness(validInput({
    valueValidationInput: validH10Input({
      nonHuNumericContributionValues: validValueSet({
        contributionValues: [
          explicitValue("thermal_bridge_transmission_contribution", Infinity)
        ]
      })
    })
  }));

  assertBlocked(result, "blocked_h10_values_not_ready");
});

await testAsync("H6-blocked nested huBridgeInput causes H11 blocked output", async () => {
  const result = await compositionWithStubbedGuards({
    h6Result: {
      status: "blocked",
      readiness: {
        isHtrTransmissionBridgeReady: false,
        isHuAggregationAvailableForHtr: false
      },
      htrTransmissionBridge: {
        status: "blocked",
        missingForCompleteHtr: []
      },
      blockers: [
        {
          code: "arbitrary_h6_private_code",
          message: "owner-snapshot"
        }
      ]
    }
  });

  assertBlocked(result, "blocked_h6_bridge_not_ready");
});

test("valid H10 plus H6 bridge composes Htr total input set", () => {
  const result = readiness(validInput());

  assertH11Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(
    result.htrTotalInputCompositionReadiness.status,
    "inputs_composed_not_htr_total_calculated"
  );
  assert.equal(result.readiness.areHtrTotalInputsComposed, true);
  assert.equal(result.readiness.areHtrTotalInputsNumericallyReady, true);
  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
  assert.deepEqual(collectContributionValueAmounts(result), [2.945, 12.5]);
  assert.equal(result.counts.composedInputs, 2);
  assertOnlyControlledCodes(result);
  assertNoSourceDetails(result);
});

test("composed input set includes exactly one Hu bridge contribution", () => {
  const result = readiness(validInput());
  const huInputs =
    result.htrTotalInputCompositionReadiness.composedInputs.filter((entry) => (
      entry.contributionType === "hu_aggregated_transmission_contribution"
    ));

  assert.equal(result.status, "ready");
  assert.equal(huInputs.length, 1);
  assert.equal(huInputs[0].valueStatus, "composed_from_hu_bridge");
  assert.equal(huInputs[0].contributionValue.amount, 2.945);
});

test("composed input set includes validated non-Hu values from H10", () => {
  const result = readiness(validInput({
    valueValidationInput: validH10Input({
      contractReadinessInput: validH9Input({
        nonHuNumericContributionContracts: validContractSet({
          contributionContracts: [
            contract("thermal_bridge_transmission_contribution"),
            contract("ground_transmission_contribution")
          ]
        })
      }),
      nonHuNumericContributionValues: validValueSet({
        contributionValues: [
          explicitValue("thermal_bridge_transmission_contribution", 12.5),
          explicitValue("ground_transmission_contribution", 8.25)
        ]
      })
    })
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.counts.nonHuInputs, 2);
  assert.deepEqual(collectContributionValueAmounts(result), [2.945, 12.5, 8.25]);
});

test("H11 rejects arbitrary Hu contribution value in H11 input", () => {
  const result = readiness(validInput({
    huContributionValue: {
      amount: 999,
      unit: "W/K"
    }
  }));

  assertBlocked(result, "blocked_hidden_fallback_value_not_allowed");
});

test("H11 rejects arbitrary non-Hu contribution values in H11-owned input", () => {
  const result = readiness(validInput({
    nonHuContributionValues: [
      {
        contributionType: "thermal_bridge_transmission_contribution",
        amount: 999
      }
    ]
  }));

  assertBlocked(result, "blocked_hidden_fallback_value_not_allowed");
});

test("H11 rejects htrTotalInputs composedInputs and htrInputValues in H11 input", () => {
  for (const extra of [
    { htrTotalInputs: [] },
    { composedInputs: [] },
    { htrInputValues: [] }
  ]) {
    const result = readiness(validInput(extra));

    assertBlocked(result, "blocked_hidden_fallback_value_not_allowed");
  }
});

test("missing composition policy blocks", () => {
  const input = validInput();
  delete input.htrTotalInputCompositionPolicy;
  const result = readiness(input);

  assertBlocked(result, "blocked_missing_composition_policy");
});

test("invalid composition set code blocks", () => {
  const result = readiness(validInput({
    htrTotalInputCompositionPolicy: validPolicy({
      compositionSetCode: "mc001-unknown-composition"
    })
  }));

  assertBlocked(result, "blocked_invalid_composition_policy");
});

test("invalid composition mode blocks", () => {
  const result = readiness(validInput({
    htrTotalInputCompositionPolicy: validPolicy({
      compositionMode: "calculate_htr_total_now"
    })
  }));

  assertBlocked(result, "blocked_invalid_composition_policy");
});

test("unsupported required input type blocks", () => {
  const result = readiness(validInput({
    htrTotalInputCompositionPolicy: validPolicy({
      requiredInputTypes: [
        "hu_aggregated_transmission_contribution",
        "htr_total_result"
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_composition_policy");
});

test("missing nested H6 bridge input blocks", () => {
  const input = validInput();
  delete input.valueValidationInput.contractReadinessInput
    .htrTotalReadinessInput.htrPrerequisitesInput.huBridgeInput;
  const result = readiness(input);

  assertBlocked(result, "blocked_h10_values_not_ready");
});

await testAsync("invalid H6 Hu bridge contribution blocks", async () => {
  const result = await compositionWithStubbedGuards({
    h6Result: validH6Result({
      htrTransmissionBridge: {
        status: "ready",
        huContribution: {
          contributionType: "hu_aggregated_transmission_contribution",
          value: 2.945,
          unit: "kW/K"
        },
        missingForCompleteHtr: []
      }
    })
  });

  assertBlocked(result, "blocked_invalid_hu_bridge_contribution");
});

await testAsync("missing H10 validated non-Hu values blocks", async () => {
  const result = await compositionWithStubbedGuards({
    h10Result: validH10Result({
      htrNonHuNumericValueValidationReadiness: {
        status: "values_validated_not_htr_total_inputs_composed",
        h9ContractStatus: "ready",
        valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
        validatedContributionValues: [],
        missingForHtrTotalCalculation: []
      }
    })
  });

  assertBlocked(result, "blocked_missing_validated_non_hu_values");
});

await testAsync("invalid H10 validated non-Hu value blocks", async () => {
  const result = await compositionWithStubbedGuards({
    h10Result: validH10Result({
      htrNonHuNumericValueValidationReadiness: {
        status: "values_validated_not_htr_total_inputs_composed",
        h9ContractStatus: "ready",
        valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
        validatedContributionValues: [
          {
            contributionType: "thermal_bridge_transmission_contribution",
            valueStatus: "validated_source_backed_numeric_value",
            contributionValue: {
              amount: Infinity,
              unit: "W/K"
            }
          }
        ],
        missingForHtrTotalCalculation: []
      }
    })
  });

  assertBlocked(result, "blocked_invalid_validated_non_hu_values");
});

await testAsync("duplicate composed contribution type blocks", async () => {
  const result = await compositionWithStubbedGuards({
    h10Result: validH10Result({
      htrNonHuNumericValueValidationReadiness: {
        status: "values_validated_not_htr_total_inputs_composed",
        h9ContractStatus: "ready",
        valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
        validatedContributionValues: [
          {
            contributionType: "thermal_bridge_transmission_contribution",
            valueStatus: "validated_source_backed_numeric_value",
            contributionValue: {
              amount: 12.5,
              unit: "W/K"
            }
          },
          {
            contributionType: "thermal_bridge_transmission_contribution",
            valueStatus: "validated_source_backed_numeric_value",
            contributionValue: {
              amount: 8.25,
              unit: "W/K"
            }
          }
        ],
        missingForHtrTotalCalculation: []
      }
    })
  });

  assertBlocked(result, "blocked_duplicate_composed_input");
});

await testAsync("unexpected composed contribution type blocks", async () => {
  const result = await compositionWithStubbedGuards({
    h10Result: validH10Result({
      htrNonHuNumericValueValidationReadiness: {
        status: "values_validated_not_htr_total_inputs_composed",
        h9ContractStatus: "ready",
        valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
        validatedContributionValues: [
          {
            contributionType: "district_heating_transmission_contribution",
            valueStatus: "validated_source_backed_numeric_value",
            contributionValue: {
              amount: 12.5,
              unit: "W/K"
            }
          }
        ],
        missingForHtrTotalCalculation: []
      }
    })
  });

  assertBlocked(result, "blocked_unexpected_composed_input");
});

await testAsync("unsupported composed value status blocks", async () => {
  const result = await compositionWithStubbedGuards({
    h10Result: validH10Result({
      htrNonHuNumericValueValidationReadiness: {
        status: "values_validated_not_htr_total_inputs_composed",
        h9ContractStatus: "ready",
        valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
        validatedContributionValues: [
          {
            contributionType: "thermal_bridge_transmission_contribution",
            valueStatus: "calculated_by_formula",
            contributionValue: {
              amount: 12.5,
              unit: "W/K"
            }
          }
        ],
        missingForHtrTotalCalculation: []
      }
    })
  });

  assertBlocked(result, "blocked_invalid_composition_status");
});

await testAsync("unsupported required unit blocks", async () => {
  const result = await compositionWithStubbedGuards({
    h10Result: validH10Result({
      htrNonHuNumericValueValidationReadiness: {
        status: "values_validated_not_htr_total_inputs_composed",
        h9ContractStatus: "ready",
        valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1",
        validatedContributionValues: [
          {
            contributionType: "thermal_bridge_transmission_contribution",
            valueStatus: "validated_source_backed_numeric_value",
            contributionValue: {
              amount: 12.5,
              unit: "kW/K"
            }
          }
        ],
        missingForHtrTotalCalculation: []
      }
    })
  });

  assertBlocked(result, "blocked_invalid_required_unit");
});

test("finite positive Hu and non-Hu values are preserved individually", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assert.deepEqual(collectContributionValueAmounts(result), [2.945, 12.5]);
});

test("zero non-Hu value is preserved individually", () => {
  const result = readiness(validInput({
    valueValidationInput: validH10Input({
      nonHuNumericContributionValues: validValueSet({
        contributionValues: [
          explicitValue("thermal_bridge_transmission_contribution", 0)
        ]
      })
    })
  }));

  assert.equal(result.status, "ready");
  assert.deepEqual(collectContributionValueAmounts(result), [2.945, 0]);
});

test("negative non-Hu value is preserved individually", () => {
  const result = readiness(validInput({
    valueValidationInput: validH10Input({
      nonHuNumericContributionValues: validValueSet({
        contributionValues: [
          explicitValue("thermal_bridge_transmission_contribution", -1.25)
        ]
      })
    })
  }));

  assert.equal(result.status, "ready");
  assert.deepEqual(collectContributionValueAmounts(result), [2.945, -1.25]);
});

test("no Htr total result is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoHtrTotalOrDownstream(result);
});

test("no htrTotal totalHtr htrResult or formulaResult field is emitted", () => {
  const result = readiness(validInput());

  for (const key of ["htrTotal", "totalHtr", "htrResult", "formulaResult"]) {
    assert.equal(hasKeyDeep(result, key), false, `${key} leaked`);
  }
});

test("no sum or aggregate value is emitted", () => {
  const result = readiness(validInput());

  assert.equal(hasKeyDeep(result, "sum"), false);
  assert.equal(hasKeyDeep(result, "total"), false);
  assert.equal(hasKeyDeep(result, "aggregateValue"), false);
});

test("no Htr total formula execution exists in H11", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalInputCompositionReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("htrTotal +"), false);
  assert.equal(moduleSource.includes("totalHtr +"), false);
  assert.equal(moduleSource.includes("htrFormulaResult.value"), false);
  assert.equal(moduleSource.includes("executeHtr"), false);
  assert.equal(moduleSource.includes("calculateHtr"), false);
});

test("no Htr total input summation exists in H11", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalInputCompositionReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes(".reduce("), false);
  assert.equal(moduleSource.includes("+= entry"), false);
  assert.equal(moduleSource.includes("+= value"), false);
  assert.equal(moduleSource.includes("amount +"), false);
});

test("Htr total calculation readiness remains false", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
});

test("complete Hu and Htr readiness remains false", () => {
  const result = readiness(validInput());

  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
});

test("downstream readiness remains false", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assert.equal(result.readiness.downstreamReadiness, false);
});

test("no QHnd monthly final primary or CO2 is emitted", () => {
  const result = readiness(validInput());

  for (const key of ["QHnd", "monthly", "finalEnergy", "primaryEnergy", "CO2"]) {
    assert.equal(hasKeyDeep(result, key), false, `${key} leaked`);
  }
});

test("forbidden lower-level physical input fields under H11-owned input surfaces are rejected", () => {
  for (const extra of [
    { area: { amount: 1 } },
    { thermalTransmittance: { amount: 0.2 } },
    { U: 0.2 },
    { bztu: 0.8 },
    { psi: 0.05 },
    { chi: 0.1 },
    { coefficient: 1 }
  ]) {
    const result = readiness(validInput(extra));

    assertBlocked(result, "blocked_forbidden_physical_input_not_allowed");
  }
});

test("precomputed htrResult htrTotal htrFormulaResult and totalHtr fields are rejected", () => {
  for (const extra of [
    { htrResult: { status: "ready" } },
    { htrTotal: { unit: "W/K" } },
    { htrFormulaResult: "done" },
    { totalHtr: 50 }
  ]) {
    const result = readiness(validInput(extra));

    assertBlocked(result, "blocked_precomputed_htr_not_allowed");
  }
});

test("hidden fallback values are not created", () => {
  const result = readiness(validInput({
    htrTotalInputCompositionPolicy: validPolicy({
      metadata: {
        opaqueNumber: 42
      }
    })
  }));

  assertBlocked(result, "blocked_hidden_fallback_value_not_allowed");
});

test("missing values are not filled with zero", () => {
  const result = readiness(validInput({
    valueValidationInput: validH10Input({
      contractReadinessInput: validH9Input({
        nonHuNumericContributionContracts: validContractSet({
          contributionContracts: [
            contract("thermal_bridge_transmission_contribution"),
            contract("ground_transmission_contribution")
          ]
        })
      }),
      nonHuNumericContributionValues: validValueSet({
        contributionValues: [
          explicitValue("thermal_bridge_transmission_contribution", 12.5)
        ]
      })
    })
  }));

  assertBlocked(result, "blocked_h10_values_not_ready");
  assert.deepEqual(collectContributionValueAmounts(result), []);
});

test("no sourceRecordId or raw source/provenance details are emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoSourceDetails(result);
  assertNoForbiddenOutput(result);
});

test("composed individual numeric values are emitted only in sanitized composedInputs path", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.htrTotalInputCompositionReadiness.composedInputs,
    [
      {
        contributionType: "hu_aggregated_transmission_contribution",
        valueStatus: "composed_from_hu_bridge",
        contributionValue: {
          amount: 2.945,
          unit: "W/K"
        }
      },
      {
        contributionType: "thermal_bridge_transmission_contribution",
        valueStatus: "composed_from_validated_non_hu_value",
        contributionValue: {
          amount: 12.5,
          unit: "W/K"
        }
      }
    ]
  );
  assert.deepEqual(collectContributionValueAmounts(result), [2.945, 12.5]);
});

test("arbitrary blocker and diagnostic strings are not passed through", () => {
  const result = readiness(validInput({
    blockers: [
      {
        code: "arbitrary_private_note",
        message: "owner-snapshot private-note John Doe"
      }
    ],
    diagnostics: ["person@example.com should not leave input"]
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assert.equal(JSON.stringify(result).includes("arbitrary_private_note"), false);
  assert.equal(JSON.stringify(result).includes("person@example.com"), false);
});

test("input object is not mutated", () => {
  const input = validInput({
    valueValidationInput: validH10Input({
      contractReadinessInput: validH9Input({
        nonHuNumericContributionContracts: validContractSet({
          contributionContracts: [
            contract("thermal_bridge_transmission_contribution"),
            contract("ground_transmission_contribution")
          ]
        })
      }),
      nonHuNumericContributionValues: validValueSet({
        contributionValues: [
          explicitValue("thermal_bridge_transmission_contribution", 12.5),
          explicitValue("ground_transmission_contribution", 8.25)
        ]
      })
    })
  });
  const before = clone(input);
  deepFreeze(input);

  const result = readiness(input);

  assert.equal(result.status, "ready");
  assert.deepEqual(input, before);
});

test("runtime import boundary allows only H10 and H6 and no IO or DB/API/UI/Worker imports", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalInputCompositionReadiness.mjs", import.meta.url),
    "utf8"
  );
  const importBlocks = (moduleSource.match(/^import[\s\S]*?;\r?\n/gm) ?? [])
    .map((block) => block.replace(/\r\n/g, "\n"));

  assert.deepEqual(importBlocks, [
    'import { buildMc001HtrNonHuNumericValueValidationReadiness } from "./mc001HtrNonHuNumericValueValidationReadiness.mjs";\n',
    'import { buildMc001HtrTransmissionReadinessBridge } from "./mc001HtrTransmissionReadinessBridge.mjs";\n'
  ]);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
    "mc001HtrTotalCalculationReadinessGate",
    "mc001HtrNonHuPrerequisitesReadiness",
    "mc001HtrNonHuNumericContributionContractsReadiness",
    "mc001HuAggregation",
    "mc001HuComponentTermCalculation",
    "mc001HuHtrCalculationReadinessGate",
    "DB2",
    "DB3",
    "DB4",
    "DB5",
    "DB7",
    "fetch(",
    "readFile(",
    "readFileSync(",
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
    htrTotalInputCompositionPolicy: validPolicy({
      sourceTrace: [
        {
          sourceRefs: ["owner-snapshot", "private-note", "person-name"]
        }
      ],
      sourceLocator: "sourceRefs",
      sourceContext: "Strada Exemplu 12 person@example.com +40722111222"
    })
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
  assertNoHtrTotalOrDownstream(result);
});

test("missing blocker contribution composition and status codes are controlled and finite", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertOnlyControlledCodes(result);
  assert.deepEqual([...H11_COMPOSITION_SET_CODES], [
    "mc001-htr-total-input-composition-v1"
  ]);
  assert.deepEqual([...H11_COMPOSITION_MODES], [
    "compose_hu_bridge_and_validated_non_hu_values"
  ]);
  assert.deepEqual([...H11_REQUIRED_INPUT_TYPES].sort(), [
    "hu_aggregated_transmission_contribution",
    "validated_non_hu_transmission_contributions"
  ].sort());
  assert.deepEqual([...H11_CONTRIBUTION_TYPES].sort(), [
    "adjacent_space_transmission_contribution",
    "external_boundary_transmission_contribution",
    "ground_transmission_contribution",
    "hu_aggregated_transmission_contribution",
    "thermal_bridge_transmission_contribution"
  ].sort());
  assert.deepEqual([...H11_COMPOSITION_STATUSES].sort(), [
    "composed_from_hu_bridge",
    "composed_from_validated_non_hu_value",
    "not_applicable_with_source"
  ].sort());
  assert.deepEqual([...H11_MISSING_CODES].sort(), [
    "missing_complete_htr_methodology_scope",
    "missing_htr_total_formula_execution_milestone",
    "missing_qhnd_methodology_scope"
  ].sort());
  assert.ok(new Set(H11_BLOCKER_CODES).has("blocked_h10_values_not_ready"));
});

test("no direct A * U * bztu formula exists in H11", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalInputCompositionReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("area?.value *"), false);
  assert.equal(moduleSource.includes("area.value *"), false);
  assert.equal(moduleSource.includes("thermalTransmittance.value"), false);
  assert.equal(moduleSource.includes("bztu?.value"), false);
  assert.equal(moduleSource.includes("A * U"), false);
});

test("no sum(componentTerm.value) formula exists in H11", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalInputCompositionReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("componentTerm.value"), false);
  assert.equal(moduleSource.includes("sum(componentTerm.value)"), false);
  assert.equal(moduleSource.includes("sum + componentTerm.value"), false);
});

test("no reduce-based numeric aggregation exists in H11", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalInputCompositionReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes(".reduce("), false);
});

test("no non-Hu calculation formula exists in H11", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalInputCompositionReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("calculateNonHu"), false);
  assert.equal(moduleSource.includes("nonHuTransmissionValue +"), false);
  assert.equal(moduleSource.includes("thermalBridgeValue"), false);
  assert.equal(moduleSource.includes("groundTransmissionValue"), false);
});
