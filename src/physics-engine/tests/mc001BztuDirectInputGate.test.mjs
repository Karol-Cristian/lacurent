import assert from "node:assert/strict";
import {
  createMc001BztuDirectInputGate,
  MC001_BZTU_DIRECT_INPUT_GATE_ID
} from "../mc001BztuDirectInputGate.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function validBztuInput(extra = {}) {
  return {
    entryId: "PHASE_H1_BZTU_DIRECT_INPUT_001",
    recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
    value: 0.62,
    unit: "dimensionless",
    month: 1,
    ztuZoneId: "ztu-buffer-zone-001",
    source: "MC001 Phase H1 source-backed direct bztu review",
    sourceRefs: ["MC001_2022_2_22_BZTU_CORRECTION_FACTOR"],
    sourceLocator: "MC001 Chapter 2 relation candidate 2.22 reviewed for Phase H1",
    methodologyStatus: "accepted",
    inputClassification: "explicit_methodological_direct_input",
    traceId: "PHASE_H1_BZTU_TRACE_001",
    reviewStatus: "reviewed",
    calculationPeriod: "monthly",
    applicability: {
      calculationPeriod: "monthly",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    adjacentConditionedZoneRelation: "ztc-school-zone-001_to_ztu-buffer-zone-001",
    ...extra
  };
}

function build(entries) {
  return createMc001BztuDirectInputGate({ bztuDirectInputs: entries });
}

function expectRejected(name, mutate, expectedCode) {
  test(name, () => {
    const input = validBztuInput();
    mutate(input);
    const result = build([input]);

    assert.notEqual(result.status, "accepted");
    assert.ok(
      result.diagnostics.some((entry) => entry.code === expectedCode),
      `Expected diagnostic ${expectedCode}; got ${result.diagnostics.map((entry) => entry.code).join(", ")}`
    );
    assert.equal(result.acceptedInputs.length, 0);
    assert.equal(result.readinessFlags.isBztuDirectInputReady, false);
  });
}

test("valid explicit methodological BZTU direct input is accepted", () => {
  const result = build([validBztuInput()]);

  assert.equal(result.gateId, MC001_BZTU_DIRECT_INPUT_GATE_ID);
  assert.equal(result.status, "accepted");
  assert.equal(result.acceptedInputs.length, 1);
  assert.equal(result.blockedItems.length, 0);
  assert.equal(result.readinessFlags.isBztuDirectInputReady, true);
});

test("valid BZTU preserves dimensionless unit metadata", () => {
  const result = build([validBztuInput({ unit: "-" })]);

  assert.equal(result.status, "accepted");
  assert.equal(result.acceptedInputs[0].unit, "-");
});

test("valid BZTU preserves month and ztu zone metadata", () => {
  const result = build([validBztuInput({ month: 7, ztuZoneId: "ztu-attic-007" })]);

  assert.equal(result.acceptedInputs[0].month, 7);
  assert.equal(result.acceptedInputs[0].ztuZoneId, "ztu-attic-007");
});

test("valid BZTU preserves source provenance and source locator", () => {
  const result = build([
    validBztuInput({
      source: "Reviewed external calculation sheet",
      sourceLocator: {
        document: "MC001 field review packet",
        section: "BZTU direct input",
        relation: "2.22 candidate"
      }
    })
  ]);

  assert.equal(result.acceptedInputs[0].source, "Reviewed external calculation sheet");
  assert.deepEqual(result.acceptedInputs[0].sourceRefs, [
    "MC001_2022_2_22_BZTU_CORRECTION_FACTOR"
  ]);
  assert.equal(result.sourceTrace.records[0].recordId, "MC001_2022_2_22_BZTU_CORRECTION_FACTOR");
  assert.equal(result.sourceTrace.records[0].traceId, "PHASE_H1_BZTU_TRACE_001");
});

test("valid BZTU exposes methodology status and traceability", () => {
  const result = build([
    validBztuInput({
      methodologyStatus: "source_backed_methodological_direct_input",
      inputClassification: "validation_fixture_import",
      traceId: "FIXTURE_027_BZTU_TRACE"
    })
  ]);

  assert.equal(result.acceptedInputs[0].methodologyStatus, "source_backed_methodological_direct_input");
  assert.equal(result.acceptedInputs[0].inputClassification, "validation_fixture_import");
  assert.equal(result.acceptedInputs[0].traceId, "FIXTURE_027_BZTU_TRACE");
});

expectRejected(
  "missing source is rejected",
  (input) => {
    delete input.source;
  },
  "rejected_bztu_missing_source"
);

expectRejected(
  "missing source locator is rejected",
  (input) => {
    delete input.sourceLocator;
  },
  "rejected_bztu_missing_source_locator"
);

expectRejected(
  "empty source locator string is rejected",
  (input) => {
    input.sourceLocator = "";
  },
  "rejected_bztu_missing_source_locator"
);

expectRejected(
  "whitespace-only source locator string is rejected",
  (input) => {
    input.sourceLocator = "   ";
  },
  "rejected_bztu_missing_source_locator"
);

expectRejected(
  "empty source locator object is rejected",
  (input) => {
    input.sourceLocator = {};
  },
  "rejected_bztu_missing_source_locator"
);

expectRejected(
  "source locator object with empty page is rejected",
  (input) => {
    input.sourceLocator = { page: "" };
  },
  "rejected_bztu_missing_source_locator"
);

expectRejected(
  "source locator object with whitespace-only page is rejected",
  (input) => {
    input.sourceLocator = { page: "   " };
  },
  "rejected_bztu_missing_source_locator"
);

expectRejected(
  "numeric source locator is rejected",
  (input) => {
    input.sourceLocator = 123;
  },
  "rejected_bztu_missing_source_locator"
);

expectRejected(
  "boolean source locator is rejected",
  (input) => {
    input.sourceLocator = true;
  },
  "rejected_bztu_missing_source_locator"
);

expectRejected(
  "array source locator is rejected",
  (input) => {
    input.sourceLocator = [];
  },
  "rejected_bztu_missing_source_locator"
);

expectRejected(
  "empty sourceRef string is rejected",
  (input) => {
    input.sourceRefs = [""];
  },
  "rejected_bztu_invalid_source_refs"
);

expectRejected(
  "whitespace-only sourceRef string is rejected",
  (input) => {
    input.sourceRefs = ["   "];
  },
  "rejected_bztu_invalid_source_refs"
);

expectRejected(
  "non-string sourceRef is rejected",
  (input) => {
    input.sourceRefs = [123];
  },
  "rejected_bztu_invalid_source_refs"
);

expectRejected(
  "missing unit is rejected",
  (input) => {
    delete input.unit;
  },
  "rejected_bztu_missing_unit"
);

expectRejected(
  "invalid unit is rejected",
  (input) => {
    input.unit = "W/K";
  },
  "rejected_bztu_invalid_unit"
);

expectRejected(
  "missing month is rejected",
  (input) => {
    delete input.month;
  },
  "rejected_bztu_missing_month"
);

expectRejected(
  "missing ztu zone id is rejected",
  (input) => {
    delete input.ztuZoneId;
  },
  "rejected_bztu_missing_ztu_zone"
);

expectRejected(
  "NaN is rejected",
  (input) => {
    input.value = Number.NaN;
  },
  "rejected_bztu_value_not_finite"
);

expectRejected(
  "Infinity is rejected",
  (input) => {
    input.value = Number.POSITIVE_INFINITY;
  },
  "rejected_bztu_value_not_finite"
);

expectRejected(
  "string numeric is rejected",
  (input) => {
    input.value = "0.62";
  },
  "rejected_bztu_value_not_numeric"
);

expectRejected(
  "missing methodology status is rejected",
  (input) => {
    delete input.methodologyStatus;
  },
  "rejected_bztu_missing_methodology_status"
);

expectRejected(
  "unsupported methodology status is rejected",
  (input) => {
    input.methodologyStatus = "draft_unreviewed";
  },
  "rejected_bztu_unsupported_methodology_status"
);

expectRejected(
  "hidden fallback product estimate is rejected",
  (input) => {
    input.inputClassification = "hidden_fallback";
    input.owner = "product_fallback";
  },
  "rejected_bztu_product_fallback"
);

expectRejected(
  "derived engine output submitted as normal raw auditor input is rejected",
  (input) => {
    input.inputClassification = "engine_derived_value";
  },
  "rejected_bztu_derived_or_raw_input"
);

expectRejected(
  "unknown BZTU record id is rejected",
  (input) => {
    input.recordId = "UNKNOWN_BZTU_RECORD";
    input.sourceRefs = ["UNKNOWN_BZTU_RECORD"];
  },
  "rejected_bztu_unknown_record_id"
);

expectRejected(
  "annual scalar without sourced exception is rejected",
  (input) => {
    input.calculationPeriod = "annual";
    input.applicability.calculationPeriod = "annual";
  },
  "rejected_bztu_unsourced_non_monthly_scalar"
);

expectRejected(
  "BZTU outside normal range is rejected unless sourced exception exists",
  (input) => {
    input.value = 1.2;
  },
  "rejected_bztu_outside_expected_range"
);

test("ambiguous multi-zone path remains ambiguous and not accepted", () => {
  const input = validBztuInput({
    applicability: {
      calculationPeriod: "monthly",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: true
    },
    adjacentConditionedZoneRelation: undefined
  });

  const result = build([input]);

  assert.equal(result.status, "ambiguous");
  assert.equal(result.acceptedInputs.length, 0);
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "ambiguous_bztu_missing_distribution_factor"
    )
  );
});

test("ambiguous ztu adjacent to another ztu remains ambiguous and not accepted", () => {
  const input = validBztuInput({
    applicability: {
      calculationPeriod: "monthly",
      notAdjacentToAnotherZtu: false,
      multipleAdjacentConditionedZones: false
    }
  });

  const result = build([input]);

  assert.equal(result.status, "ambiguous");
  assert.ok(
    result.diagnostics.some((entry) => entry.code === "ambiguous_bztu_ztu_adjacent_to_ztu")
  );
});

test("conflicting duplicate BZTU source paths are rejected", () => {
  const result = build([
    validBztuInput(),
    validBztuInput({
      entryId: "PHASE_H1_BZTU_DIRECT_INPUT_DUPLICATE",
      value: 0.7,
      sourceLocator: "Conflicting reviewed source path"
    })
  ]);

  assert.equal(result.status, "rejected");
  assert.equal(result.acceptedInputs.length, 0);
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "rejected_bztu_conflicting_duplicate_source_path"
    )
  );
});
