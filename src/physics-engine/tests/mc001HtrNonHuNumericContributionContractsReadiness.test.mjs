import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMc001HtrNonHuNumericContributionContractsReadiness,
  H9_BLOCKER_CODES,
  H9_CONTRACT_SET_CODES,
  H9_CONTRACT_STATUSES,
  H9_CONTRIBUTION_TYPES,
  H9_MISSING_CODES,
  H9_REQUIRED_UNITS,
  H9_SOURCE_TYPES,
  H9_VALUE_AVAILABILITY_STATUSES,
  MC001_HTR_NON_HU_NUMERIC_CONTRIBUTION_CONTRACTS_INPUT_SCHEMA_VERSION,
  MC001_HTR_NON_HU_NUMERIC_CONTRIBUTION_CONTRACTS_READINESS_SCHEMA_VERSION
} from "../mc001HtrNonHuNumericContributionContractsReadiness.mjs";

const H3_INPUT_SCHEMA_VERSION =
  "mc001-h3-hu-htr-calculation-readiness-input-v1";
const H7_INPUT_SCHEMA_VERSION =
  "mc001-h7-htr-non-hu-prerequisites-input-v1";
const H8_INPUT_SCHEMA_VERSION =
  "mc001-h8-htr-total-calculation-readiness-input-v1";

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

function validSource(id = "h9-contract-001", sourceType = "calculation_record") {
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

function validInput(extra = {}) {
  return {
    schemaVersion:
      MC001_HTR_NON_HU_NUMERIC_CONTRIBUTION_CONTRACTS_INPUT_SCHEMA_VERSION,
    isMc001HtrNonHuNumericContributionContractsInput: true,
    htrTotalReadinessInput: validH8Input(),
    nonHuNumericContributionContracts: validContractSet(),
    ...extra
  };
}

function readiness(input) {
  return buildMc001HtrNonHuNumericContributionContractsReadiness(input);
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

function assertH9Shape(result) {
  assert.equal(
    result.schemaVersion,
    MC001_HTR_NON_HU_NUMERIC_CONTRIBUTION_CONTRACTS_READINESS_SCHEMA_VERSION
  );
  assert.equal(result.isMc001HtrNonHuNumericContributionContractsReadiness, true);
  assert.ok(["ready", "blocked"].includes(result.status));
  assert.equal(result.readiness.areNonHuHtrNumericValuesValidated, false);
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
    "calculation_record",
    "methodological_direct_input",
    "validation_fixture_import",
    "expert_override_with_source",
    "upstream_calculation_output",
    "record:htr-non-hu-contract"
  ]) {
    assert.equal(output.includes(forbidden), false, `${forbidden} leaked`);
  }
}

function assertOnlyAllowlistedBlockers(result) {
  const allowed = new Set(H9_BLOCKER_CODES);
  for (const blocker of result.blockers) {
    assert.ok(allowed.has(blocker.code), `${blocker.code} is not allowlisted`);
    assert.equal(blocker.severity, "blocking");
  }
}

function assertOnlyControlledCodes(result) {
  const missingCodes = new Set(H9_MISSING_CODES);
  const contributionTypes = new Set(H9_CONTRIBUTION_TYPES);
  const contractStatuses = new Set(H9_CONTRACT_STATUSES);
  const valueAvailabilityStatuses = new Set(H9_VALUE_AVAILABILITY_STATUSES);
  const contractSetCodes = new Set(H9_CONTRACT_SET_CODES);
  const requiredUnits = new Set(H9_REQUIRED_UNITS);

  assert.ok(
    contractSetCodes.has(
      result.htrNonHuNumericContributionContractsReadiness.contractSetCode
    )
  );
  for (const contractRef of
    result.htrNonHuNumericContributionContractsReadiness.contributionContracts) {
    assert.ok(contributionTypes.has(contractRef.contributionType));
    assert.ok(contractStatuses.has(contractRef.contractStatus));
    assert.ok(valueAvailabilityStatuses.has(contractRef.valueAvailabilityStatus));
    if (Object.hasOwn(contractRef, "requiredUnit")) {
      assert.ok(requiredUnits.has(contractRef.requiredUnit));
    }
  }
  for (const missing of
    result.htrNonHuNumericContributionContractsReadiness
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
    "nonHuTransmissionValue",
    "contributionValue",
    "numericValue",
    "calculatedValue",
    "formulaResult",
    "resultValue"
  ]) {
    assert.equal(hasKeyDeep(result, key), false, `${key} leaked`);
  }
  assert.equal(result.readiness.areNonHuHtrNumericValuesValidated, false);
  assert.equal(result.readiness.areHtrTotalInputsNumericallyReady, false);
  assert.equal(result.readiness.isHtrTotalCalculationReady, false);
  assert.equal(result.readiness.isCompleteHuReady, false);
  assert.equal(result.readiness.isCompleteHtrReady, false);
  assert.equal(result.readiness.hasHuResult, false);
  assert.equal(result.readiness.hasHtrResult, false);
  assert.equal(result.readiness.downstreamReadiness, false);
}

function assertNoNumericContributionOutput(result) {
  for (const key of [
    "value",
    "amount",
    "numericValue",
    "calculatedValue",
    "contributionValue",
    "nonHuTransmissionValue",
    "htrValue",
    "formulaResult",
    "resultValue",
    "total",
    "coefficient",
    "psi",
    "chi",
    "U",
    "area",
    "bztu"
  ]) {
    assert.equal(hasKeyDeep(result, key), false, `${key} leaked`);
  }
}

function assertBlocked(result, expectedCode) {
  assertH9Shape(result);
  assert.equal(result.status, "blocked");
  assert.equal(
    result.htrNonHuNumericContributionContractsReadiness.status,
    "blocked"
  );
  assert.equal(
    result.readiness.areNonHuHtrNumericContributionContractsMapped,
    false
  );
  assert.ok(blockerCodes(result).includes(expectedCode));
  assertOnlyAllowlistedBlockers(result);
  assertNoForbiddenOutput(result);
  assertNoSourceDetails(result);
  assertNoCompleteHuHtrOrDownstream(result);
  assertNoNumericContributionOutput(result);
}

test("invalid input blocks safely", () => {
  for (const input of [null, undefined, "not input", [], 42]) {
    const result = readiness(input);

    assertBlocked(result, "blocked_invalid_h9_input");
    assert.equal(result.counts.contributionContracts, 0);
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

test("missing htrTotalReadinessInput blocks safely", () => {
  const input = validInput();
  delete input.htrTotalReadinessInput;
  const result = readiness(input);

  assertBlocked(result, "blocked_h8_total_scope_not_ready");
});

test("H8-blocked input causes H9 blocked output", () => {
  const result = readiness(validInput({
    htrTotalReadinessInput: validH8Input({
      htrTotalCalculationScope: validScope({
        expectedContributions: [
          contribution("thermal_bridge_transmission_contribution")
        ]
      })
    })
  }));

  assertBlocked(result, "blocked_h8_total_scope_not_ready");
});

test("valid H8 plus mapped non-Hu numeric contribution contracts becomes contracts_mapped_not_values_validated", () => {
  const result = readiness(validInput());

  assertH9Shape(result);
  assert.equal(result.status, "ready");
  assert.equal(
    result.htrNonHuNumericContributionContractsReadiness.status,
    "contracts_mapped_not_values_validated"
  );
  assert.equal(
    result.readiness.areNonHuHtrNumericContributionContractsMapped,
    true
  );
  assert.equal(
    result.readiness.areNonHuHtrNumericValuesValidated,
    false
  );
  assert.equal(result.counts.mappedContracts, 1);
  assertNoSourceDetails(result);
});

test("valid contract set with multiple non-Hu contribution contracts maps successfully", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution"),
        contract("ground_transmission_contribution"),
        contract("adjacent_space_transmission_contribution"),
        contract("external_boundary_transmission_contribution")
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.counts.contributionContracts, 4);
  assert.equal(result.counts.mappedContracts, 4);
});

test("H9 rejects hu_aggregated_transmission_contribution", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("hu_aggregated_transmission_contribution")
      ]
    })
  }));

  assertBlocked(result, "blocked_hu_contribution_contract_not_allowed");
});

test("numeric_contract_mapped requires source_backed_value_available", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
          valueAvailabilityStatus: "missing_numeric_value"
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_value_availability_status");
});

test("numeric_contract_mapped requires requiredUnit W/K", () => {
  for (const extra of [{ requiredUnit: "kW/K" }, { requiredUnit: undefined }]) {
    const contractInput = contract("thermal_bridge_transmission_contribution", extra);
    if (extra.requiredUnit === undefined) {
      delete contractInput.requiredUnit;
    }
    const result = readiness(validInput({
      nonHuNumericContributionContracts: validContractSet({
        contributionContracts: [contractInput]
      })
    }));

    assertBlocked(result, "blocked_invalid_required_unit");
  }
});

test("not_applicable_with_source requires valueAvailabilityStatus not_applicable_with_source", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        withoutFields(contract("ground_transmission_contribution", {
          contractStatus: "not_applicable_with_source",
          valueAvailabilityStatus: "missing_numeric_value"
        }), ["requiredUnit"])
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_value_availability_status");
});

test("not_applicable_with_source requires safe source", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        withoutFields(contract("ground_transmission_contribution", {
          contractStatus: "not_applicable_with_source",
          valueAvailabilityStatus: "not_applicable_with_source",
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-JohnDoe"
          }
        }), ["requiredUnit"])
      ]
    })
  }));

  assert.equal(result.status, "blocked");
  assertNoForbiddenOutput(result);
  assertOnlyAllowlistedBlockers(result);
});

test("not_ready accepts missing_numeric_value", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        withoutFields(contract("thermal_bridge_transmission_contribution", {
          contractStatus: "not_ready",
          valueAvailabilityStatus: "missing_numeric_value"
        }), ["requiredUnit", "source"])
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assert.equal(result.counts.notReadyContracts, 1);
  assert.equal(result.counts.mappedContracts, 0);
});

test("missing nonHuNumericContributionContracts blocks", () => {
  const input = validInput();
  delete input.nonHuNumericContributionContracts;
  const result = readiness(input);

  assertBlocked(result, "blocked_missing_non_hu_numeric_contracts");
});

test("missing contributionContracts blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: {
      contractSetCode: "mc001-htr-non-hu-numeric-contribution-contracts-v1"
    }
  }));

  assertBlocked(result, "blocked_missing_contribution_contract");
});

test("unsupported contributionType blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("unsupported_transmission_contribution")
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_contribution_contract");
});

test("unsupported contractStatus blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
          contractStatus: "ready_now"
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_contract_status");
});

test("unsupported valueAvailabilityStatus blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
          valueAvailabilityStatus: "numeric_value_embedded"
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_value_availability_status");
});

test("unsupported requiredUnit blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
          requiredUnit: "W"
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_required_unit");
});

test("duplicate contributionType blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution"),
        contract("thermal_bridge_transmission_contribution", {
          source: validSource("htr-non-hu-contract-thermal-bridge-002")
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_duplicate_contribution_contract");
});

test("missing required contract source blocks", () => {
  const noSource = contract("thermal_bridge_transmission_contribution");
  delete noSource.source;
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [noSource]
    })
  }));

  assertBlocked(result, "blocked_missing_contract_source");
});

test("invalid source type blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
          source: validSource("htr-contract-invalid-source", "app_payload")
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_contract_source");
});

test("unsafe legacy record-* source ID blocks", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
          source: {
            sourceType: "calculation_record",
            sourceRecordId: "record-htr-contract-001"
          }
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_invalid_contract_source");
});

test("safe record:<safe-id> source ID is accepted", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
          source: validSource("htr-non-hu-contract-safe-001")
        })
      ]
    })
  }));

  assert.equal(result.status, "ready");
});

test("UUID-like source ID is accepted", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
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

test("actual numeric contribution values in input are rejected", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
          value: 12.3
        })
      ]
    })
  }));

  assertBlocked(result, "blocked_numeric_contribution_value_not_allowed");
});

test("forbidden numeric/value-like keys anywhere under H9-owned input are rejected", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      metadata: {
        formulaResult: "not ingested here"
      }
    })
  }));

  assertBlocked(result, "blocked_numeric_contribution_value_not_allowed");
});

test("precomputed htrResult htrTotal or htrFormulaResult in input is rejected", () => {
  for (const extra of [
    { htrResult: { status: "ready" } },
    { htrTotal: { unit: "W/K" } },
    { htrFormulaResult: "done" }
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

test("no numeric contribution value is emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoNumericContributionOutput(result);
});

test("no sourceRecordId or raw source/provenance details are emitted", () => {
  const result = readiness(validInput());

  assert.equal(result.status, "ready");
  assertNoSourceDetails(result);
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
  assert.equal(result.readiness.areNonHuHtrNumericValuesValidated, false);
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

test("no direct A * U * bztu formula exists in H9", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericContributionContractsReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("area?.value *"), false);
  assert.equal(moduleSource.includes("area.value *"), false);
  assert.equal(moduleSource.includes("thermalTransmittance"), false);
  assert.equal(moduleSource.includes("bztu?.value"), false);
  assert.equal(moduleSource.includes("A * U"), false);
});

test("no sum(componentTerm.value) formula exists in H9", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericContributionContractsReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("componentTerm.value"), false);
  assert.equal(moduleSource.includes("sum(componentTerm.value)"), false);
  assert.equal(moduleSource.includes("sum + componentTerm.value"), false);
  assert.equal(moduleSource.includes(".reduce("), false);
});

test("no non-Hu numerical formula exists in H9", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericContributionContractsReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("calculateNonHu"), false);
  assert.equal(moduleSource.includes("nonHuTransmissionValue +"), false);
  assert.equal(moduleSource.includes("thermalBridgeValue"), false);
  assert.equal(moduleSource.includes("groundTransmissionValue"), false);
});

test("no Htr total formula execution exists in H9", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericContributionContractsReadiness.mjs", import.meta.url),
    "utf8"
  );

  assert.equal(moduleSource.includes("htrTotal +"), false);
  assert.equal(moduleSource.includes("totalHtr +"), false);
  assert.equal(moduleSource.includes("htrFormulaResult.value"), false);
  assert.equal(moduleSource.includes("executeHtr"), false);
});

test("unsafe private IDs and content are sanitized and not emitted", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
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
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution"),
        withoutFields(contract("ground_transmission_contribution", {
          contractStatus: "not_ready",
          valueAvailabilityStatus: "not_ready"
        }), ["requiredUnit", "source"])
      ]
    })
  });
  const before = clone(input);
  deepFreeze(input);

  const result = readiness(input);

  assert.equal(result.status, "ready");
  assert.deepEqual(input, before);
});

test("runtime import boundary allows only H8 and no IO or DB/API/UI/Worker imports", () => {
  const moduleSource = readFileSync(
    new URL("../mc001HtrNonHuNumericContributionContractsReadiness.mjs", import.meta.url),
    "utf8"
  );
  const importBlocks = (moduleSource.match(/^import[\s\S]*?;\r?\n/gm) ?? [])
    .map((block) => block.replace(/\r\n/g, "\n"));

  assert.deepEqual(importBlocks, [
    'import { buildMc001HtrTotalCalculationReadinessGate } from "./mc001HtrTotalCalculationReadinessGate.mjs";\n'
  ]);
  for (const forbidden of [
    "mc001ReadOnly",
    "mc001AuditorCoreReadinessOrchestrator",
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
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution", {
          source: {
            sourceType: "calculation_record",
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

test("missing blocker contribution contract and source codes are controlled and finite", () => {
  const result = readiness(validInput({
    nonHuNumericContributionContracts: validContractSet({
      contributionContracts: [
        contract("thermal_bridge_transmission_contribution"),
        withoutFields(contract("ground_transmission_contribution", {
          contractStatus: "not_applicable_with_source",
          valueAvailabilityStatus: "not_applicable_with_source"
        }), ["requiredUnit"]),
        withoutFields(contract("adjacent_space_transmission_contribution", {
          contractStatus: "not_ready",
          valueAvailabilityStatus: "missing_numeric_value"
        }), ["requiredUnit", "source"])
      ]
    })
  }));

  assert.equal(result.status, "ready");
  assertOnlyControlledCodes(result);
  assert.deepEqual([...H9_SOURCE_TYPES].sort(), [
    "calculation_record",
    "expert_override_with_source",
    "methodological_direct_input",
    "upstream_calculation_output",
    "validation_fixture_import"
  ].sort());
  assert.deepEqual([...H9_CONTRIBUTION_TYPES].sort(), [
    "adjacent_space_transmission_contribution",
    "external_boundary_transmission_contribution",
    "ground_transmission_contribution",
    "thermal_bridge_transmission_contribution"
  ].sort());
  assert.deepEqual([...H9_CONTRACT_STATUSES].sort(), [
    "not_applicable_with_source",
    "not_ready",
    "numeric_contract_mapped"
  ].sort());
  assert.deepEqual([...H9_VALUE_AVAILABILITY_STATUSES].sort(), [
    "missing_numeric_value",
    "not_applicable_with_source",
    "not_ready",
    "source_backed_value_available"
  ].sort());
  assert.deepEqual([...H9_CONTRACT_SET_CODES], [
    "mc001-htr-non-hu-numeric-contribution-contracts-v1"
  ]);
  assert.deepEqual([...H9_MISSING_CODES].sort(), [
    "missing_complete_htr_methodology_scope",
    "missing_htr_total_formula_execution_milestone",
    "missing_htr_total_input_composition_milestone",
    "missing_numeric_value_ingestion_and_validation_milestone"
  ].sort());
  assert.ok(new Set(H9_BLOCKER_CODES).has("blocked_h8_total_scope_not_ready"));
});
