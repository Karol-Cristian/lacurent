import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  calculateMc001HtrTotal,
  H12_BLOCKER_CODES,
  H12_CALCULATION_MODES,
  H12_CALCULATION_SET_CODES,
  H12_CALCULATION_STATUSES,
  H12_CALCULATION_TERM_STATUSES,
  H12_COMPOSED_VALUE_STATUSES,
  H12_CONTRIBUTION_TYPES,
  H12_FORMULA_CODES,
  H12_MISSING_CODES,
  H12_REQUIRED_INPUT_SET_STATUSES,
  H12_RESULT_UNITS,
  MC001_HTR_TOTAL_CALCULATION_INPUT_SCHEMA_VERSION,
  MC001_HTR_TOTAL_CALCULATION_SCHEMA_VERSION
} from "../mc001HtrTotalCalculation.mjs";

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
const H11_INPUT_SCHEMA_VERSION =
  "mc001-h11-htr-total-input-composition-input-v1";

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

function validSource(id = "h12-source-001", sourceType = "calculation_record") {
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

function validCompositionPolicy(extra = {}) {
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

function validCompositionInput(extra = {}) {
  return {
    schemaVersion: H11_INPUT_SCHEMA_VERSION,
    isMc001HtrTotalInputCompositionInput: true,
    valueValidationInput: validH10Input(),
    htrTotalInputCompositionPolicy: validCompositionPolicy(),
    ...extra
  };
}

function validCalculationPolicy(extra = {}) {
  return {
    calculationSetCode: "mc001-htr-total-calculation-v1",
    formulaCode: "MC001_HTR_TOTAL_SUM_COMPOSED_TRANSMISSION_INPUTS",
    calculationMode: "calculate_htr_total_from_h11_composed_inputs",
    requiredInputSetStatus: "inputs_composed_not_htr_total_calculated",
    resultUnit: "W/K",
    ...extra
  };
}

function validInput(extra = {}) {
  return {
    schemaVersion: MC001_HTR_TOTAL_CALCULATION_INPUT_SCHEMA_VERSION,
    isMc001HtrTotalCalculationInput: true,
    compositionInput: validCompositionInput(),
    htrTotalCalculationPolicy: validCalculationPolicy(),
    ...extra
  };
}

function calculation(input) {
  return calculateMc001HtrTotal(input);
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

function collectNumberPaths(value, path = [], found = []) {
  if (typeof value === "number") {
    found.push(path.join("."));
    return found;
  }
  if (!value || typeof value !== "object") {
    return found;
  }
  for (const [key, child] of Object.entries(value)) {
    collectNumberPaths(child, [...path, key], found);
  }
  return found;
}

function calculationTermAmounts(result) {
  return result.htrTotalCalculation.calculationTerms
    .filter((entry) => entry.termStatus === "included_in_htr_total_calculation")
    .map((entry) => entry.contributionValue.amount);
}

function assertNear(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} !== ${expected}`);
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

function assertNoQhndOrEnergyFields(result) {
  for (const key of [
    "QHnd",
    "monthly",
    "finalEnergy",
    "primaryEnergy",
    "CO2",
    "ventilationLoss",
    "gains",
    "systemEfficiency"
  ]) {
    assert.equal(hasKeyDeep(result, key), false, `${key} leaked`);
  }
}

function assertNoCompleteOrDownstream(result) {
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
  assertNoQhndOrEnergyFields(result);
}

function assertH12Shape(result) {
  assert.equal(result.schemaVersion, MC001_HTR_TOTAL_CALCULATION_SCHEMA_VERSION);
  assert.equal(result.isMc001HtrTotalCalculation, true);
  assert.ok(["ready", "blocked"].includes(result.status));
  assert.ok(["ready", "blocked"].includes(result.htrTotalCalculation.h11CompositionStatus));
  assertNoCompleteOrDownstream(result);
}

function assertOnlyAllowlistedBlockers(result) {
  const allowed = new Set(H12_BLOCKER_CODES);
  for (const blocker of result.blockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertOnlyControlledCodes(result) {
  const contributionTypes = new Set(H12_CONTRIBUTION_TYPES);
  const termStatuses = new Set(H12_CALCULATION_TERM_STATUSES);
  const missingCodes = new Set(H12_MISSING_CODES);
  assert.ok(H12_CALCULATION_STATUSES.includes(result.htrTotalCalculation.status));
  if (result.status === "ready") {
    assert.ok(H12_CALCULATION_SET_CODES.includes(
      result.htrTotalCalculation.calculationSetCode
    ));
    assert.ok(H12_FORMULA_CODES.includes(result.htrTotalCalculation.formulaCode));
    assert.ok(H12_CALCULATION_MODES.includes(
      result.htrTotalCalculation.calculationMode
    ));
  }
  for (const term of result.htrTotalCalculation.calculationTerms) {
    assert.ok(contributionTypes.has(term.contributionType));
    assert.ok(termStatuses.has(term.termStatus));
    if (term.contributionValue) {
      assert.equal(typeof term.contributionValue.amount, "number");
      assert.equal(Number.isFinite(term.contributionValue.amount), true);
      assert.equal(term.contributionValue.unit, "W/K");
    }
  }
  for (const missing of result.htrTotalCalculation.missingForNextMethodologyScope) {
    assert.ok(missingCodes.has(missing.code), `${missing.code} not allowlisted`);
    assert.equal(missing.severity, "blocking");
  }
}

function assertBlocked(result, expectedCode) {
  assertH12Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(result.htrTotalCalculation.status, "blocked");
  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.deepEqual(result.htrTotalCalculation.calculationTerms, []);
  assert.equal(hasKeyDeep(result, "htrTotalResult"), false);
  assert.ok(blockerCodes(result).includes(expectedCode));
  assertOnlyAllowlistedBlockers(result);
  assertNoForbiddenOutput(result);
  assertNoSourceDetails(result);
}

function assertReady(result, expectedTotal = 15.445) {
  assertH12Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(
    result.htrTotalCalculation.status,
    "htr_total_calculated_not_qhnd_ready"
  );
  assert.equal(result.readiness.isHtrTotalCalculationReady, true);
  assert.equal(result.readiness.hasHtrResult, true);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.downstreamReadiness, false);
  assert.equal(result.htrTotalCalculation.htrTotalResult.unit, "W/K");
  assertNear(result.htrTotalCalculation.htrTotalResult.amount, expectedTotal);
  assertOnlyControlledCodes(result);
  assertNoForbiddenOutput(result);
  assertNoSourceDetails(result);
  assertNoQhndOrEnergyFields(result);
}

function validH11Result({
  composedInputs = [
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
  ],
  extra = {}
} = {}) {
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
      areHtrTotalInputsComposed: true,
      areHtrTotalInputsNumericallyReady: true,
      isHtrTotalCalculationReady: false,
      isCompleteHuReady: false,
      isCompleteHtrReady: false,
      hasHuResult: false,
      hasHtrResult: false,
      downstreamReadiness: false
    },
    htrTotalInputCompositionReadiness: {
      status: "inputs_composed_not_htr_total_calculated",
      h10ValueValidationStatus: "ready",
      h6BridgeStatus: "ready",
      compositionSetCode: "mc001-htr-total-input-composition-v1",
      compositionMode: "compose_hu_bridge_and_validated_non_hu_values",
      composedInputs,
      missingForHtrTotalCalculation: []
    },
    blockers: [],
    ...extra
  };
}

async function calculationWithStubbedH11({
  h11Result = validH11Result(),
  input = validInput()
} = {}) {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculation.mjs", import.meta.url),
    "utf8"
  );
  const stubbedSource = moduleSource.replace(
    /import \{ buildMc001HtrTotalInputCompositionReadiness \} from "\.\/mc001HtrTotalInputCompositionReadiness\.mjs";/,
    "function buildMc001HtrTotalInputCompositionReadiness() { return globalThis.__MC001_H12_STUBBED_H11_RESULT; }"
  );
  globalThis.__MC001_H12_STUBBED_H11_RESULT = h11Result;
  const encoded = Buffer.from(stubbedSource, "utf8").toString("base64");
  const module = await import(`data:text/javascript;base64,${encoded}#${Math.random()}`);
  try {
    return module.calculateMc001HtrTotal(input);
  } finally {
    delete globalThis.__MC001_H12_STUBBED_H11_RESULT;
  }
}

test("invalid input blocks safely", () => {
  for (const input of [null, undefined, "not input", [], 42]) {
    assertBlocked(calculation(input), "blocked_invalid_h12_input");
  }
});

test("raw saved-analysis-like input is rejected", () => {
  assertBlocked(calculation({
    analysis: {
      sourceContext: "owner-snapshot"
    },
    answers: []
  }), "blocked_raw_saved_analysis_input");
});

test("missing compositionInput blocks safely", () => {
  const input = validInput();
  delete input.compositionInput;

  assertBlocked(calculation(input), "blocked_h11_inputs_not_ready");
});

test("H11-blocked input causes H12 blocked output", () => {
  const input = validInput({
    compositionInput: validCompositionInput({
      valueValidationInput: validH10Input({
        nonHuNumericContributionValues: validValueSet({
          contributionValues: [
            explicitValue("thermal_bridge_transmission_contribution", Infinity)
          ]
        })
      })
    })
  });

  assertBlocked(calculation(input), "blocked_h11_inputs_not_ready");
});

test("missing calculation policy blocks", () => {
  const input = validInput();
  delete input.htrTotalCalculationPolicy;

  assertBlocked(calculation(input), "blocked_missing_calculation_policy");
});

test("invalid calculation set code blocks", () => {
  assertBlocked(calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
      calculationSetCode: "mc001-htr-total-now"
    })
  })), "blocked_invalid_calculation_policy");
});

test("invalid formula code blocks", () => {
  assertBlocked(calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
      formulaCode: "MC001_HTR_TOTAL_ARBITRARY_FORMULA"
    })
  })), "blocked_invalid_formula_code");
});

test("invalid calculation mode blocks", () => {
  assertBlocked(calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
      calculationMode: "calculate_complete_htr"
    })
  })), "blocked_invalid_calculation_mode");
});

test("invalid required input set status blocks", () => {
  assertBlocked(calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
      requiredInputSetStatus: "htr_total_calculated"
    })
  })), "blocked_invalid_calculation_status");
});

test("invalid result unit blocks", () => {
  assertBlocked(calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
      resultUnit: "kW/K"
    })
  })), "blocked_invalid_result_unit");
});

test("valid H11 composed inputs calculate Htr total", () => {
  const result = calculation(validInput());

  assertReady(result);
});

test("Htr total equals controlled sum of H11 composed input amounts", () => {
  const result = calculation(validInput());

  assertNear(
    result.htrTotalCalculation.htrTotalResult.amount,
    calculationTermAmounts(result).at(0) + calculationTermAmounts(result).at(1)
  );
});

test("calculation terms preserve individual Hu and non-Hu amounts", () => {
  const result = calculation(validInput());

  assertReady(result);
  assert.deepEqual(calculationTermAmounts(result), [2.945, 12.5]);
});

test("exactly one Hu bridge term is required", () => {
  const result = calculation(validInput());
  const huTerms = result.htrTotalCalculation.calculationTerms.filter((term) => (
    term.contributionType === "hu_aggregated_transmission_contribution"
  ));

  assert.equal(huTerms.length, 1);
});

await testAsync("missing Hu bridge term blocks", async () => {
  const result = await calculationWithStubbedH11({
    h11Result: validH11Result({
      composedInputs: [
        {
          contributionType: "thermal_bridge_transmission_contribution",
          valueStatus: "composed_from_validated_non_hu_value",
          contributionValue: {
            amount: 12.5,
            unit: "W/K"
          }
        }
      ]
    })
  });

  assertBlocked(result, "blocked_missing_hu_bridge_term");
});

await testAsync("duplicate calculation term contribution type blocks", async () => {
  const result = await calculationWithStubbedH11({
    h11Result: validH11Result({
      composedInputs: [
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
        },
        {
          contributionType: "thermal_bridge_transmission_contribution",
          valueStatus: "composed_from_validated_non_hu_value",
          contributionValue: {
            amount: 8.25,
            unit: "W/K"
          }
        }
      ]
    })
  });

  assertBlocked(result, "blocked_duplicate_calculation_term");
});

await testAsync("unexpected calculation term contribution type blocks", async () => {
  const result = await calculationWithStubbedH11({
    h11Result: validH11Result({
      composedInputs: [
        {
          contributionType: "hu_aggregated_transmission_contribution",
          valueStatus: "composed_from_hu_bridge",
          contributionValue: {
            amount: 2.945,
            unit: "W/K"
          }
        },
        {
          contributionType: "district_heating_transmission_contribution",
          valueStatus: "composed_from_validated_non_hu_value",
          contributionValue: {
            amount: 12.5,
            unit: "W/K"
          }
        }
      ]
    })
  });

  assertBlocked(result, "blocked_unexpected_calculation_term");
});

await testAsync("unsupported calculation term status blocks", async () => {
  const result = await calculationWithStubbedH11({
    h11Result: validH11Result({
      composedInputs: [
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
          valueStatus: "calculated_by_formula",
          contributionValue: {
            amount: 12.5,
            unit: "W/K"
          }
        }
      ]
    })
  });

  assertBlocked(result, "blocked_invalid_calculation_status");
});

await testAsync("unsupported contribution unit blocks", async () => {
  const result = await calculationWithStubbedH11({
    h11Result: validH11Result({
      composedInputs: [
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
            unit: "kW/K"
          }
        }
      ]
    })
  });

  assertBlocked(result, "blocked_invalid_required_unit");
});

test("finite positive values calculate successfully", () => {
  assertReady(calculation(validInput()), 15.445);
});

test("zero non-Hu value calculates successfully", () => {
  const result = calculation(validInput({
    compositionInput: validCompositionInput({
      valueValidationInput: validH10Input({
        nonHuNumericContributionValues: validValueSet({
          contributionValues: [
            explicitValue("thermal_bridge_transmission_contribution", 0)
          ]
        })
      })
    })
  }));

  assertReady(result, 2.945);
});

test("negative non-Hu value calculates successfully", () => {
  const result = calculation(validInput({
    compositionInput: validCompositionInput({
      valueValidationInput: validH10Input({
        nonHuNumericContributionValues: validValueSet({
          contributionValues: [
            explicitValue("thermal_bridge_transmission_contribution", -1.25)
          ]
        })
      })
    })
  }));

  assertReady(result, 1.695);
});

test("no hidden fallback values are created", () => {
  assertBlocked(calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
      metadata: {
        opaqueNumber: 42
      }
    })
  })), "blocked_hidden_fallback_value_not_allowed");
});

test("missing values are not filled with zero", () => {
  const input = validInput({
    compositionInput: validCompositionInput({
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
    })
  });

  assertBlocked(calculation(input), "blocked_h11_inputs_not_ready");
});

test("H12 rejects arbitrary Htr total values in H12 input", () => {
  for (const extra of [
    { htrTotal: { amount: 15.445 } },
    { htrTotalResult: { amount: 15.445 } },
    { calculatedTotal: 15.445 }
  ]) {
    assertBlocked(calculation(validInput(extra)), "blocked_precomputed_result_not_allowed");
  }
});

test("H12 rejects arbitrary composedInputs htrTotalInputs and htrInputValues in H12 input", () => {
  for (const extra of [
    { composedInputs: [] },
    { htrTotalInputs: [] },
    { htrInputValues: [] }
  ]) {
    assertBlocked(calculation(validInput(extra)), "blocked_hidden_fallback_value_not_allowed");
  }
});

test("H12 rejects arbitrary Hu and non-Hu amount fields in H12 input", () => {
  for (const extra of [
    { huContributionValue: 2.945 },
    { nonHuContributionValues: [12.5] },
    { inputAmount: 12.5 }
  ]) {
    assertBlocked(calculation(validInput(extra)), "blocked_hidden_fallback_value_not_allowed");
  }
});

test("forbidden lower-level physical fields under H12-owned input surfaces are rejected", () => {
  for (const extra of [
    { area: { amount: 1 } },
    { thermalTransmittance: { amount: 0.2 } },
    { U: 0.2 },
    { bztu: 0.8 },
    { psi: 0.05 },
    { chi: 0.1 },
    { length: 2 },
    { surface: 4 },
    { coefficient: 1 },
    { temperature: 20 },
    { deltaT: 10 }
  ]) {
    assertBlocked(
      calculation(validInput(extra)),
      "blocked_forbidden_physical_input_not_allowed"
    );
  }
});

test("precomputed htrResult htrTotal htrFormulaResult totalHtr formulaResult and resultValue fields are rejected", () => {
  for (const extra of [
    { htrResult: { amount: 15.445 } },
    { htrTotal: { amount: 15.445 } },
    { htrFormulaResult: { amount: 15.445 } },
    { totalHtr: 15.445 },
    { formulaResult: 15.445 },
    { resultValue: 15.445 }
  ]) {
    assertBlocked(calculation(validInput(extra)), "blocked_precomputed_result_not_allowed");
  }
});

test("no direct A * U * bztu formula exists in H12", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculation.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("area?.value *"), false);
  assert.equal(moduleSource.includes("area.value *"), false);
  assert.equal(moduleSource.includes("thermalTransmittance.value"), false);
  assert.equal(moduleSource.includes("bztu?.value"), false);
  assert.equal(moduleSource.includes("A * U"), false);
});

test("no direct area U or bztu physical primitive use exists in H12", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculation.mjs", import.meta.url),
    "utf8"
  );

  for (const forbidden of [
    "area.value",
    "thermalTransmittance.value",
    "bztu.value",
    "area?.value",
    "thermalTransmittance?.value",
    "bztu?.value"
  ]) {
    assert.equal(moduleSource.includes(forbidden), false, `${forbidden} leaked`);
  }
});

test("no psi chi or length physical calculation exists in H12", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculation.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(/psi\s*[*+\-/]/.test(moduleSource), false);
  assert.equal(/chi\s*[*+\-/]/.test(moduleSource), false);
  assert.equal(/length\s*[*+\-/]/.test(moduleSource), false);
});

test("no H4 H5 H6 H10 or H11 recalculation exists in H12", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculation.mjs", import.meta.url),
    "utf8"
  );

  for (const forbidden of [
    "mc001HuComponentTermCalculation",
    "mc001HuAggregation",
    "mc001HtrTransmissionReadinessBridge",
    "mc001HtrNonHuNumericValueValidationReadiness",
    "buildMc001HtrTransmissionReadinessBridge",
    "buildMc001HtrNonHuNumericValueValidationReadiness",
    "composedInputFromHuBridge",
    "composedInputFromValidatedNonHuValue"
  ]) {
    assert.equal(moduleSource.includes(forbidden), false, `${forbidden} leaked`);
  }
  assert.equal(moduleSource.includes("buildMc001HtrTotalInputCompositionReadiness("), true);
});

test("H12 uses only H11 output composedInputs as numeric source", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculation.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(
    moduleSource.includes("h11Result?.htrTotalInputCompositionReadiness?.composedInputs"),
    true
  );
  assert.equal(moduleSource.includes("htrCalculationInput.composedInputs"), false);
  assert.equal(moduleSource.includes("htrCalculationInput.htrTotalInputs"), false);
  assert.equal(moduleSource.includes("htrCalculationInput.htrInputValues"), false);
});

test("H12 does not use reduce-based numeric aggregation", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculation.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes(".reduce("), false);
});

test("H12 contains only the allowed Htr total summation from H11 composedInputs", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculation.mjs", import.meta.url),
    "utf8"
  );
  const htrTotalAdditions =
    moduleSource.match(/htrTotalAmount \+= term\.contributionValue\.amount/g) ??
    [];

  assert.equal(htrTotalAdditions.length, 1);
  assert.equal(
    moduleSource.includes("htrTotalAmount += term.contributionValue.amount"),
    true
  );
});

test("H12 emits Htr total result only in htrTotalCalculation.htrTotalResult.amount", () => {
  const result = calculation(validInput());
  const paths = collectNumberPaths(result)
    .filter((path) => !path.startsWith("counts."));

  assert.deepEqual(paths.sort(), [
    "htrTotalCalculation.calculationTerms.0.contributionValue.amount",
    "htrTotalCalculation.calculationTerms.1.contributionValue.amount",
    "htrTotalCalculation.htrTotalResult.amount"
  ].sort());
});

test("H12 emits calculation term values only in htrTotalCalculation calculationTerms contributionValue amount", () => {
  const result = calculation(validInput());

  assert.deepEqual(
    result.htrTotalCalculation.calculationTerms.map((term) => ({
      contributionType: term.contributionType,
      amount: term.contributionValue.amount,
      unit: term.contributionValue.unit
    })),
    [
      {
        contributionType: "hu_aggregated_transmission_contribution",
        amount: 2.945,
        unit: "W/K"
      },
      {
        contributionType: "thermal_bridge_transmission_contribution",
        amount: 12.5,
        unit: "W/K"
      }
    ]
  );
});

test("no other numeric methodology result is emitted except counts", () => {
  const result = calculation(validInput());
  const paths = collectNumberPaths(result);

  for (const path of paths) {
    assert.ok(
      path.startsWith("counts.") ||
        path.startsWith("htrTotalCalculation.calculationTerms.") ||
        path === "htrTotalCalculation.htrTotalResult.amount",
      `${path} is not an allowed numeric output path`
    );
  }
});

test("isHtrTotalCalculationReady becomes true only for valid guarded calculation", () => {
  const ready = calculation(validInput());
  const blocked = calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
      resultUnit: "kW/K"
    })
  }));

  assert.equal(ready.readiness.isHtrTotalCalculationReady, true);
  assert.equal(blocked.readiness.isHtrTotalCalculationReady, false);
});

test("hasHtrResult becomes true only for valid guarded calculation", () => {
  const ready = calculation(validInput());
  const blocked = calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
      formulaCode: "MC001_BAD_FORMULA"
    })
  }));

  assert.equal(ready.readiness.hasHtrResult, true);
  assert.equal(blocked.readiness.hasHtrResult, false);
});

test("complete Hu and Htr readiness remains false", () => {
  const result = calculation(validInput());

  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
});

test("downstream readiness remains false", () => {
  const result = calculation(validInput());

  assert.equal(result.readiness.downstreamReadiness, false);
});

test("no QHnd monthly final primary or CO2 is emitted", () => {
  const result = calculation(validInput());

  assertNoQhndOrEnergyFields(result);
});

test("missingForNextMethodologyScope is safe metadata only", () => {
  const result = calculation(validInput());

  assert.deepEqual(result.htrTotalCalculation.missingForNextMethodologyScope, [
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
  ]);
  assertNoQhndOrEnergyFields(result);
});

test("no sourceRecordId or raw source/provenance details are emitted", () => {
  const result = calculation(validInput());

  assertReady(result);
  assertNoSourceDetails(result);
});

test("arbitrary blocker and diagnostic strings are not passed through", () => {
  const result = calculation(validInput({
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

test("unsafe private IDs and content are sanitized and not emitted", () => {
  const result = calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
      sourceContext: "Strada Exemplu 12 person@example.com +40722111222"
    })
  }));

  assertBlocked(result, "blocked_unsafe_private_content");
});

test("input object is not mutated", () => {
  const input = validInput();
  const before = clone(input);
  deepFreeze(input);

  const result = calculation(input);

  assertReady(result);
  assert.deepEqual(input, before);
});

test("runtime import boundary allows only H11 and no IO or DB/API/UI/Worker imports", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrTotalCalculation.mjs", import.meta.url),
    "utf8"
  );
  const importBlocks = (moduleSource.match(/^import[\s\S]*?;\r?\n/gm) ?? [])
    .map((block) => block.replace(/\r\n/g, "\n"));

  assert.deepEqual(importBlocks, [
    'import { buildMc001HtrTotalInputCompositionReadiness } from "./mc001HtrTotalInputCompositionReadiness.mjs";\n'
  ]);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
    "mc001HtrNonHuNumericValueValidationReadiness",
    "mc001HtrNonHuNumericContributionContractsReadiness",
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

test("privacy adversarial output confirms forbidden terms are absent from serialized output", () => {
  const result = calculation(validInput({
    htrTotalCalculationPolicy: validCalculationPolicy({
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
});

test("missing blocker contribution calculation formula and status codes are controlled and finite", () => {
  const result = calculation(validInput());

  assertReady(result);
  assert.deepEqual([...H12_CALCULATION_SET_CODES], [
    "mc001-htr-total-calculation-v1"
  ]);
  assert.deepEqual([...H12_FORMULA_CODES], [
    "MC001_HTR_TOTAL_SUM_COMPOSED_TRANSMISSION_INPUTS"
  ]);
  assert.deepEqual([...H12_CALCULATION_MODES], [
    "calculate_htr_total_from_h11_composed_inputs"
  ]);
  assert.deepEqual([...H12_REQUIRED_INPUT_SET_STATUSES], [
    "inputs_composed_not_htr_total_calculated"
  ]);
  assert.deepEqual([...H12_RESULT_UNITS], ["W/K"]);
  assert.deepEqual([...H12_CONTRIBUTION_TYPES].sort(), [
    "adjacent_space_transmission_contribution",
    "external_boundary_transmission_contribution",
    "ground_transmission_contribution",
    "hu_aggregated_transmission_contribution",
    "thermal_bridge_transmission_contribution"
  ].sort());
  assert.deepEqual([...H12_COMPOSED_VALUE_STATUSES].sort(), [
    "composed_from_hu_bridge",
    "composed_from_validated_non_hu_value",
    "not_applicable_with_source"
  ].sort());
  assert.deepEqual([...H12_CALCULATION_TERM_STATUSES].sort(), [
    "included_in_htr_total_calculation",
    "not_applicable_with_source"
  ].sort());
  assert.deepEqual([...H12_CALCULATION_STATUSES].sort(), [
    "blocked",
    "htr_total_calculated_not_qhnd_ready"
  ].sort());
  assert.ok(new Set(H12_MISSING_CODES).has("missing_qhnd_methodology_scope"));
  assert.ok(new Set(H12_BLOCKER_CODES).has("blocked_h11_inputs_not_ready"));
});
