import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMc001HtrNonHuNumericValueValidationReadiness,
  H10_BLOCKER_CODES,
  H10_CONTRIBUTION_TYPES,
  H10_MISSING_CODES,
  H10_SOURCE_TYPES,
  H10_VALIDATED_VALUE_STATUSES,
  H10_VALUE_SET_CODES,
  H10_VALUE_STATUSES,
  MC001_HTR_NON_HU_NUMERIC_VALUE_VALIDATION_INPUT_SCHEMA_VERSION,
  MC001_HTR_NON_HU_NUMERIC_VALUE_VALIDATION_READINESS_SCHEMA_VERSION
} from "../mc001HtrNonHuNumericValueValidationReadiness.mjs";

const H3_INPUT_SCHEMA_VERSION =
  "mc001-h3-hu-htr-calculation-readiness-input-v1";
const H7_INPUT_SCHEMA_VERSION =
  "mc001-h7-htr-non-hu-prerequisites-input-v1";
const H8_INPUT_SCHEMA_VERSION =
  "mc001-h8-htr-total-calculation-readiness-input-v1";
const H9_INPUT_SCHEMA_VERSION =
  "mc001-h9-htr-non-hu-numeric-contribution-contracts-input-v1";

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

function validSource(id = "h10-value-001", sourceType = "upstream_calculation_output") {
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
      source: validSource(`area-00${index}`, "calculation_record")
    },
    thermalTransmittance: {
      value: index === 1 ? 0.31 : 0.29,
      unit: "W/(m2*K)",
      source: validSource(`u-00${index}`, "calculation_record")
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
    source: validSource(`htr-prereq-00${index}`, "calculation_record"),
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
    source: validSource(`htr-scope-${contributionType}`, "calculation_record"),
    ...extra
  };
}

function huContribution(extra = {}) {
  return contribution(
    "hu_aggregated_transmission_contribution",
    "available_from_hu_bridge",
    {
      source: validSource("htr-scope-hu-001", "calculation_record"),
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
    source: validSource(
      `htr-non-hu-contract-${contributionType}`,
      "calculation_record"
    ),
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
    source: validSource(`htr-non-hu-value-${contributionType}`),
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
    source: validSource(`htr-non-hu-value-${contributionType}`),
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

function validInput(extra = {}) {
  return {
    schemaVersion: MC001_HTR_NON_HU_NUMERIC_VALUE_VALIDATION_INPUT_SCHEMA_VERSION,
    isMc001HtrNonHuNumericValueValidationInput: true,
    contractReadinessInput: validH9Input(),
    nonHuNumericContributionValues: validValueSet(),
    ...extra
  };
}

function readiness(input) {
  return buildMc001HtrNonHuNumericValueValidationReadiness(input);
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

function assertH10Shape(result) {
  assert.equal(
    result.schemaVersion,
    MC001_HTR_NON_HU_NUMERIC_VALUE_VALIDATION_READINESS_SCHEMA_VERSION
  );
  assert.equal(result.isMc001HtrNonHuNumericValueValidationReadiness, true);
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
    "record:htr-non-hu-value"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertOnlyAllowlistedBlockers(result) {
  const allowed = new Set(H10_BLOCKER_CODES);
  for (const blocker of result.blockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertOnlyControlledCodes(result) {
  const missingCodes = new Set(H10_MISSING_CODES);
  const contributionTypes = new Set(H10_CONTRIBUTION_TYPES);
  const valueStatuses = new Set(H10_VALIDATED_VALUE_STATUSES);
  const valueSetCodes = new Set(H10_VALUE_SET_CODES);

  assert.ok(
    valueSetCodes.has(
      result.htrNonHuNumericValueValidationReadiness.valueSetCode
    )
  );
  for (const valueRef of
    result.htrNonHuNumericValueValidationReadiness.validatedContributionValues) {
    assert.ok(contributionTypes.has(valueRef.contributionType));
    assert.ok(valueStatuses.has(valueRef.valueStatus));
    if (valueRef.contributionValue) {
      assert.equal(typeof valueRef.contributionValue.amount, "number");
      assert.equal(Number.isFinite(valueRef.contributionValue.amount), true);
      assert.equal(valueRef.contributionValue.unit, "W/K");
    }
  }
  for (const missing of
    result.htrNonHuNumericValueValidationReadiness
      .missingForHtrTotalCalculation) {
    assert.ok(missingCodes.has(missing.code), `${missing.code} is not allowlisted`);
    assert.equal(missing.severity, "blocking");
  }
}

function assertNoCompleteHuHtrOrDownstream(result) {
  for (const key of [
    "huResult",
    "htrResult",
    "htrTotal",
    "htrFormulaResult",
    "totalHtr",
    "calculatedHtr",
    "completeHtr",
    "formulaResult",
    "resultValue"
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
  assertH10Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(
    result.htrNonHuNumericValueValidationReadiness.status,
    "blocked"
  );
  assert.equal(result.readiness.areNonHuHtrNumericValuesValidated, false);
  assert.ok(blockerCodes(result).includes(expectedCode));
  assertOnlyAllowlistedBlockers(result);
  assertNoForbiddenOutput(result);
  assertNoSourceDetails(result);
  assertNoCompleteHuHtrOrDownstream(result);
}

test("invalid input blocks safely", () => {
  for (const input of [null, undefined, "not input", [], 42]) {
    const result = readiness(input);

    assertBlocked(result, "blocked_invalid_h10_input");
    assert.equal(result.counts.contributionValues, 0);
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

test("missing contractReadinessInput blocks safely", () => {
  const input = validInput();
  delete input.contractReadinessInput;
  const result = readiness(input);

  assertBlocked(result, "blocked_h9_contracts_not_ready");
});

test("H9-blocked input causes H10 blocked output", () => {
  const result = readiness(validInput({
    contractReadinessInput: validH9Input({
      nonHuNumericContributionContracts: validContractSet({
        contributionContracts: [
          contract("thermal_bridge_transmission_contribution", {
            requiredUnit: "kW/K"
          })
        ]
      })
    })
  }));

  assertBlocked(result, "blocked_h9_contracts_not_ready");
});

test("valid H9 plus explicit non-Hu numeric values becomes values_validated_not_htr_total_inputs_composed", () => {
  const result = readiness(validInput());

  assertH10Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(
    result.htrNonHuNumericValueValidationReadiness.status,
    "values_validated_not_htr_total_inputs_composed"
  );
  assert.equal(result.readiness.areNonHuHtrNumericValuesValidated, true);
  assert.equal(result.readiness.areHtrTotalInputsNumericallyReady, false);
  assert.equal(result.counts.validatedValues, 1);
  assert.deepEqual(collectContributionValueAmounts(result), [12.5]);
  assertNoSourceDetails(result);
});

test("valid value set with multiple non-Hu contribution values maps successfully", () => {
  const result = readiness(validInput({
    contractReadinessInput: validH9Input({
      nonHuNumericContributionContracts: validContractSet({
        contributionContracts: [
          contract("thermal_bridge_transmission_contribution"),
          contract("ground_transmission_contribution"),
          contract("adjacent_space_transmission_contribution")
        ]
      })
    }),
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5),
        explicitValue("ground_transmission_contribution", 8.25),
        explicitValue("adjacent_space_transmission_contribution", 0.5)
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.counts.contributionValues, 3);
  assert.equal(result.counts.validatedValues, 3);
});

test("H10 rejects hu_aggregated_transmission_contribution", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("hu_aggregated_transmission_contribution", 4)
      ]
    })
  }));

  assertBlocked(result, "blocked_hu_contribution_value_not_allowed");
});

test("explicit_source_backed_value requires finite amount", () => {
  const noAmount = explicitValue("thermal_bridge_transmission_contribution");
  delete noAmount.contributionValue.amount;
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [noAmount]
    })
  }));

  assertBlocked(result, "blocked_missing_numeric_value");
});

test("explicit_source_backed_value rejects NaN and Infinity", () => {
  for (const amount of [Number.NaN, Infinity, -Infinity]) {
    const result = readiness(validInput({
      nonHuNumericContributionValues: validValueSet({
        contributionValues: [
          explicitValue("thermal_bridge_transmission_contribution", amount)
        ]
      })
    }));

    assertBlocked(result, "blocked_invalid_numeric_value");
  }
});

test("explicit_source_backed_value accepts zero when explicit and source-backed", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 0)
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assert.deepEqual(collectContributionValueAmounts(result), [0]);
});

test("explicit_source_backed_value accepts negative finite value when explicit and source-backed", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", -1.25)
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assert.deepEqual(collectContributionValueAmounts(result), [-1.25]);
});

test("explicit_source_backed_value requires unit W/K", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5, {
          contributionValue: {
            amount: 12.5,
            unit: "kW/K"
          }
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_required_unit");
});

test("explicit_source_backed_value requires safe source", () => {
  const noSource = explicitValue("thermal_bridge_transmission_contribution");
  delete noSource.source;
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [noSource]
    })
  }));

  assertBlocked(result, "blocked_missing_value_source");
});

test("not_applicable_with_source requires no numeric contributionValue", () => {
  const result = readiness(validInput({
    contractReadinessInput: validH9Input({
      nonHuNumericContributionContracts: validContractSet({
        contributionContracts: [
          withoutFields(contract("ground_transmission_contribution", {
            contractStatus: "not_applicable_with_source",
            valueAvailabilityStatus: "not_applicable_with_source"
          }), ["requiredUnit"])
        ]
      })
    }),
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        notApplicableValue("ground_transmission_contribution", {
          contributionValue: {
            amount: 0,
            unit: "W/K"
          }
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_contract_value_mismatch");
});

test("not_applicable_with_source requires safe source", () => {
  const result = readiness(validInput({
    contractReadinessInput: validH9Input({
      nonHuNumericContributionContracts: validContractSet({
        contributionContracts: [
          withoutFields(contract("ground_transmission_contribution", {
            contractStatus: "not_applicable_with_source",
            valueAvailabilityStatus: "not_applicable_with_source"
          }), ["requiredUnit"])
        ]
      })
    }),
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        notApplicableValue("ground_transmission_contribution", {
          source: {
            sourceType: "upstream_calculation_output",
            sourceRecordId: "record-JohnDoe"
          }
        })
      ]
    })
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
});

test("not_applicable_with_source maps successfully when contract compatible and source is safe", () => {
  const result = readiness(validInput({
    contractReadinessInput: validH9Input({
      nonHuNumericContributionContracts: validContractSet({
        contributionContracts: [
          contract("thermal_bridge_transmission_contribution"),
          withoutFields(contract("ground_transmission_contribution", {
            contractStatus: "not_applicable_with_source",
            valueAvailabilityStatus: "not_applicable_with_source"
          }), ["requiredUnit"])
        ]
      })
    }),
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5),
        notApplicableValue("ground_transmission_contribution")
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.counts.notApplicableValues, 1);
});

test("missing_value blocks H10 readiness", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        {
          contributionType: "thermal_bridge_transmission_contribution",
          valueStatus: "missing_value"
        }
      ]
    })
  }));

  assertBlocked(result, "blocked_missing_numeric_value");
  assert.equal(result.counts.missingValues, 1);
});

test("not_ready blocks H10 readiness", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        {
          contributionType: "thermal_bridge_transmission_contribution",
          valueStatus: "not_ready"
        }
      ]
    })
  }));

  assertBlocked(result, "blocked_missing_numeric_value");
  assert.equal(result.counts.missingValues, 1);
});

test("missing nonHuNumericContributionValues blocks", () => {
  const input = validInput();
  delete input.nonHuNumericContributionValues;
  const result = readiness(input);

  assertBlocked(result, "blocked_missing_non_hu_numeric_values");
});

test("missing contributionValues blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: {
      valueSetCode: "mc001-htr-non-hu-numeric-contribution-values-v1"
    }
  }));

  assertBlocked(result, "blocked_missing_contribution_value");
});

test("unsupported contributionType blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("unsupported_transmission_contribution", 3)
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_non_hu_numeric_values");
});

test("unsupported valueStatus blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5, {
          valueStatus: "calculated_by_formula"
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_value_status");
});

test("unsupported required unit blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5, {
          contributionValue: {
            amount: 12.5,
            unit: "W"
          }
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_required_unit");
});

test("duplicate contributionType blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5),
        explicitValue("thermal_bridge_transmission_contribution", 8.25)
      ]
    })
  }));

  assertBlocked(result, "blocked_duplicate_contribution_value");
});

test("unexpected contributionType not present in H9 contracts blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("ground_transmission_contribution", 8.25)
      ]
    })
  }));

  assertBlocked(result, "blocked_unexpected_contribution_value");
});

test("missing value for H9 mapped contract blocks", () => {
  const result = readiness(validInput({
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
  }));

  assertBlocked(result, "blocked_missing_contribution_value");
});

test("value status incompatible with H9 contract blocks", () => {
  const result = readiness(validInput({
    contractReadinessInput: validH9Input({
      nonHuNumericContributionContracts: validContractSet({
        contributionContracts: [
          withoutFields(contract("ground_transmission_contribution", {
            contractStatus: "not_applicable_with_source",
            valueAvailabilityStatus: "not_applicable_with_source"
          }), ["requiredUnit"])
        ]
      })
    }),
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("ground_transmission_contribution", 8.25)
      ]
    })
  }));

  assertBlocked(result, "blocked_contract_value_mismatch");
});

test("missing required value source blocks", () => {
  const noSource = explicitValue("thermal_bridge_transmission_contribution");
  delete noSource.source;
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [noSource]
    })
  }));

  assertBlocked(result, "blocked_missing_value_source");
});

test("invalid source type blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5, {
          source: validSource("htr-value-invalid-source", "app_payload")
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_value_source");
});

test("unsafe legacy record-* source ID blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5, {
          source: {
            sourceType: "upstream_calculation_output",
            sourceRecordId: "record-htr-value-001"
          }
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_value_source");
});

test("safe record:<safe-id> source ID is accepted", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5, {
          source: validSource("htr-non-hu-value-safe-001")
        })
      ]
    })
  }));

  assert.equal(result.status, "ready");
});

test("UUID-like source ID is accepted", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5, {
          source: {
            sourceType: "upstream_calculation_output",
            sourceRecordId: "123e4567-e89b-12d3-a456-426614174000"
          }
        })
      ]
    })
  }));

  assert.equal(result.status, "ready");
});

test("forbidden lower-level physical input fields under H10 input are rejected", () => {
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

test("arbitrary numeric methodology-looking fields outside allowed contributionValue amount path are rejected", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      metadata: {
        resultValue: "not here"
      }
    })
  }));

  assertBlocked(result, "blocked_precomputed_htr_not_allowed");
});

test("arbitrary numeric values outside allowed contributionValue amount path are rejected", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      metadata: {
        opaqueNumber: 42
      }
    })
  }));

  assertBlocked(result, "blocked_hidden_fallback_value_not_allowed");
});

test("no Htr result or Htr total is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoCompleteHuHtrOrDownstream(result);
});

test("no Htr total input composition is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assert.equal(hasKeyDeep(result, "htrTotalInputs"), false);
  assert.equal(hasKeyDeep(result, "composedHtrInputs"), false);
  assert.equal(result.readiness.areHtrTotalInputsNumericallyReady, false);
});

test("no sourceRecordId or raw source/provenance details are emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoSourceDetails(result);
  assertNoForbiddenOutput(result);
});

test("validated individual non-Hu numeric values are emitted only in sanitized validatedContributionValues path", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assert.deepEqual(
    result.htrNonHuNumericValueValidationReadiness.validatedContributionValues,
    [
      {
        contributionType: "thermal_bridge_transmission_contribution",
        valueStatus: "validated_source_backed_numeric_value",
        contributionValue: {
          amount: 12.5,
          unit: "W/K"
        }
      }
    ]
  );
  assert.deepEqual(collectContributionValueAmounts(result), [12.5]);
});

test("no complete Hu or Htr readiness is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
});

test("no Htr total numeric input readiness is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.readiness.areHtrTotalInputsNumericallyReady, false);
});

test("no Htr total calculation readiness is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
});

test("no downstream readiness escalation", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assert.equal(result.readiness.downstreamReadiness, false);
});

test("no direct A * U * bztu formula exists in H10", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericValueValidationReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("area?.value *"), false);
  assert.equal(moduleSource.includes("area.value *"), false);
  assert.equal(moduleSource.includes("thermalTransmittance.value"), false);
  assert.equal(moduleSource.includes("bztu?.value"), false);
  assert.equal(moduleSource.includes("A * U"), false);
});

test("no sum(componentTerm.value) formula exists in H10", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericValueValidationReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("componentTerm.value"), false);
  assert.equal(moduleSource.includes("sum(componentTerm.value)"), false);
  assert.equal(moduleSource.includes("sum + componentTerm.value"), false);
  assert.equal(moduleSource.includes(".reduce("), false);
});

test("no non-Hu calculation formula exists in H10", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericValueValidationReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("calculateNonHu"), false);
  assert.equal(moduleSource.includes("nonHuTransmissionValue +"), false);
  assert.equal(moduleSource.includes("thermalBridgeValue"), false);
  assert.equal(moduleSource.includes("groundTransmissionValue"), false);
});

test("no Htr total formula execution exists in H10", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericValueValidationReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("htrTotal +"), false);
  assert.equal(moduleSource.includes("totalHtr +"), false);
  assert.equal(moduleSource.includes("htrFormulaResult.value"), false);
  assert.equal(moduleSource.includes("executeHtr"), false);
});

test("unsafe private IDs and content are sanitized and not emitted", () => {
  const result = readiness(validInput({
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5, {
          source: {
            sourceType: "upstream_calculation_output",
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
        code: "arbitrary_private_note",
        message: "owner-snapshot private-note John Doe"
      }
    ],
    diagnostics: ["person@example.com should not leave input"]
  }));

  assert.equal(result.status, "ready");
  assertNoForbiddenOutput(result);
  assert.equal(JSON.stringify(result).includes("arbitrary_private_note"), false);
  assert.equal(JSON.stringify(result).includes("person@example.com"), false);
});

test("input object is not mutated", () => {
  const input = validInput({
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
  });
  const before = clone(input);
  deepFreeze(input);

  const result = readiness(input);

  assert.equal(result.status, "ready");
  assert.deepEqual(input, before);
});

test("runtime import boundary allows only H9 and no IO or DB/API/UI/Worker imports", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericValueValidationReadiness.mjs", import.meta.url),
    "utf8"
  );
  const importBlocks = (moduleSource.match(/^import[\s\S]*?;\r?\n/gm) ?? [])
    .map((block) => block.replace(/\r\n/g, "\n"));

  assert.deepEqual(importBlocks, [
    'import { buildMc001HtrNonHuNumericContributionContractsReadiness } from "./mc001HtrNonHuNumericContributionContractsReadiness.mjs";\n'
  ]);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
    "mc001HtrTotalCalculationReadinessGate",
    "mc001HtrNonHuPrerequisitesReadiness",
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
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5, {
          source: {
            sourceType: "upstream_calculation_output",
            sourceRecordId: "record-JohnDoe",
            sourceRefs: ["John Doe", "record-001"],
            sourceContext: "Strada Exemplu 12 person@example.com +40722111222"
          },
          sourceTrace: [
            {
              sourceRefs: ["owner-snapshot", "private-note", "person-name"]
            }
          ],
          sourceLocator: "sourceRefs"
        })
      ]
    }),
    sourceTrace: [
      {
        sourceRefs: ["owner-snapshot"]
      }
    ]
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
  assertNoCompleteHuHtrOrDownstream(result);
});

test("missing blocker contribution value and source codes are controlled and finite", () => {
  const result = readiness(validInput({
    contractReadinessInput: validH9Input({
      nonHuNumericContributionContracts: validContractSet({
        contributionContracts: [
          contract("thermal_bridge_transmission_contribution"),
          withoutFields(contract("ground_transmission_contribution", {
            contractStatus: "not_applicable_with_source",
            valueAvailabilityStatus: "not_applicable_with_source"
          }), ["requiredUnit"])
        ]
      })
    }),
    nonHuNumericContributionValues: validValueSet({
      contributionValues: [
        explicitValue("thermal_bridge_transmission_contribution", 12.5),
        notApplicableValue("ground_transmission_contribution")
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assertOnlyControlledCodes(result);
  assert.deepEqual([...H10_SOURCE_TYPES].sort(), [
    "calculation_record",
    "expert_override_with_source",
    "methodological_direct_input",
    "upstream_calculation_output",
    "validation_fixture_import"
  ].sort());
  assert.deepEqual([...H10_CONTRIBUTION_TYPES].sort(), [
    "adjacent_space_transmission_contribution",
    "external_boundary_transmission_contribution",
    "ground_transmission_contribution",
    "thermal_bridge_transmission_contribution"
  ].sort());
  assert.deepEqual([...H10_VALUE_STATUSES].sort(), [
    "explicit_source_backed_value",
    "missing_value",
    "not_applicable_with_source",
    "not_ready"
  ].sort());
  assert.deepEqual([...H10_VALIDATED_VALUE_STATUSES].sort(), [
    "not_applicable_with_source",
    "validated_source_backed_numeric_value"
  ].sort());
  assert.deepEqual([...H10_VALUE_SET_CODES], [
    "mc001-htr-non-hu-numeric-contribution-values-v1"
  ]);
  assert.deepEqual([...H10_MISSING_CODES].sort(), [
    "missing_complete_htr_methodology_scope",
    "missing_htr_total_formula_execution_milestone",
    "missing_htr_total_input_composition_milestone"
  ].sort());
  assert.ok(new Set(H10_BLOCKER_CODES).has("blocked_h9_contracts_not_ready"));
});
