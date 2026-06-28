import assert from "node:assert/strict";
import {
  createMc001HuComponentContractReadinessGate,
  MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID
} from "../mc001HuComponentContractReadinessGate.mjs";

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

function validBztuDirectInput(extra = {}) {
  return {
    entryId: "PHASE_H2E_BZTU_DIRECT_INPUT_001",
    recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
    value: 0.62,
    unit: "dimensionless",
    month: 1,
    ztuZoneId: "ztu-buffer-zone-001",
    source: "Phase H2E reviewed direct bztu methodology source",
    sourceRefs: ["MC001_2022_2_22_BZTU_CORRECTION_FACTOR"],
    sourceLocator: {
      documentId: "MC001-2022",
      page: 95,
      relation: "bztu direct input source locator"
    },
    methodologyStatus: "accepted",
    inputClassification: "explicit_methodological_direct_input",
    traceId: "PHASE_H2E_BZTU_TRACE_001",
    reviewStatus: "reviewed",
    calculationPeriod: "monthly",
    applicability: {
      calculationPeriod: "monthly",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    adjacentConditionedZoneRelation: "ztc-zone-001_to_ztu-buffer-zone-001",
    ...extra
  };
}

function validHuComponentCandidate(extra = {}) {
  return {
    componentId: "PHASE_H2E_HU_COMPONENT_001",
    conditionedZoneId: "ztc-zone-001",
    ztuZoneId: "ztu-buffer-zone-001",
    month: 1,
    element: {
      elementId: "ztu-wall-001",
      elementType: "wall",
      area: {
        value: 12.5,
        unit: "m2"
      }
    },
    boundaryRelation: "external_non_climatized_zone",
    uValuePath: {
      pathType: "source_backed_corrected_u_value",
      value: 0.31,
      unit: "W/(m2*K)",
      source: "Reviewed envelope U-value calculation packet",
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: "PHASE_H2E_U_VALUE_TRACE_001"
    },
    bztuPath: {
      pathType: "accepted_direct_input",
      recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
      entryId: "PHASE_H2E_BZTU_DIRECT_INPUT_001"
    },
    applicability: {
      appliesToMonth: 1,
      appliesToZtuZoneId: "ztu-buffer-zone-001",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    sourceTrace: {
      source: "Phase H2E synthetic Hu component contract source",
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: "PHASE_H2E_HU_COMPONENT_TRACE_001"
    },
    ...extra
  };
}

function validInputPack() {
  return {
    huComponentCandidate: validHuComponentCandidate(),
    bztuDirectInputs: [validBztuDirectInput()]
  };
}

function expectBlocked(name, mutate, expectedCode) {
  test(name, () => {
    const input = validInputPack();
    mutate(input);
    const result = createMc001HuComponentContractReadinessGate(input);

    assert.notEqual(result.status, "ready");
    assert.equal(result.readinessFlags.isHuComponentReady, false);
    assert.equal(result.readinessFlags.isCompleteHuReady, false);
    assert.equal(result.readinessFlags.isCompleteHtrReady, false);
    assert.ok(
      result.diagnostics.some((entry) => entry.code === expectedCode),
      `Expected diagnostic ${expectedCode}; got ${result.diagnostics.map((entry) => entry.code).join(", ")}`
    );
  });
}

test("valid narrow Hu component contract is ready only at component level", () => {
  const result = createMc001HuComponentContractReadinessGate(validInputPack());

  assert.equal(result.gateId, MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID);
  assert.equal(result.status, "ready");
  assert.equal(result.componentStatus, "ready_hu_component_contract");
  assert.equal(result.huComponentReadiness.isHuComponentReady, true);
  assert.equal(result.huComponentReadiness.isCompleteHuReady, false);
  assert.equal(result.huComponentReadiness.isCompleteHtrReady, false);
  assert.equal(result.readinessFlags.isHuComponentReady, true);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.conditionedZoneId, "ztc-zone-001");
  assert.equal(result.ztuZoneId, "ztu-buffer-zone-001");
  assert.equal(result.month, 1);
  assert.equal(result.elementId, "ztu-wall-001");
  assert.equal(result.area.value, 12.5);
  assert.ok(
    result.diagnostics.some(
      (entry) => entry.code === "hu_component_contract_readiness_only"
    )
  );
});

test("valid Hu component contract preserves U-value and BZTU source trace", () => {
  const result = createMc001HuComponentContractReadinessGate(validInputPack());

  assert.ok(
    result.sourceTrace.records.some(
      (entry) => entry.componentId === "u_value_path" &&
        entry.traceId === "PHASE_H2E_U_VALUE_TRACE_001"
    )
  );
  assert.ok(
    result.sourceTrace.records.some(
      (entry) => entry.componentId === "bztu" &&
        entry.recordId === "MC001_2022_2_22_BZTU_CORRECTION_FACTOR"
    )
  );
});

expectBlocked(
  "missing element inventory blocks Hu component readiness",
  (input) => {
    delete input.huComponentCandidate.element;
  },
  "blocked_missing_element_inventory"
);

expectBlocked(
  "missing area blocks Hu component readiness",
  (input) => {
    delete input.huComponentCandidate.element.area;
  },
  "blocked_missing_area"
);

expectBlocked(
  "invalid area blocks Hu component readiness",
  (input) => {
    input.huComponentCandidate.element.area.value = 0;
  },
  "blocked_invalid_area"
);

expectBlocked(
  "missing U-value path blocks Hu component readiness",
  (input) => {
    delete input.huComponentCandidate.uValuePath;
  },
  "blocked_missing_u_value_path"
);

expectBlocked(
  "invalid U-value source blocks Hu component readiness",
  (input) => {
    delete input.huComponentCandidate.uValuePath.sourceRefs;
  },
  "blocked_invalid_u_value_source"
);

expectBlocked(
  "missing BZTU path blocks Hu component readiness",
  (input) => {
    delete input.huComponentCandidate.bztuPath;
  },
  "blocked_missing_bztu_path"
);

expectBlocked(
  "invalid BZTU path blocks Hu component readiness",
  (input) => {
    input.huComponentCandidate.bztuPath.pathType = "raw_auditor_input";
  },
  "blocked_invalid_bztu_path"
);

expectBlocked(
  "BZTU accepted for wrong month blocks Hu component readiness",
  (input) => {
    input.bztuDirectInputs[0].month = 2;
  },
  "blocked_bztu_scope_mismatch"
);

expectBlocked(
  "BZTU accepted for wrong ztu blocks Hu component readiness",
  (input) => {
    input.bztuDirectInputs[0].ztuZoneId = "ztu-wrong-zone";
  },
  "blocked_bztu_scope_mismatch"
);

expectBlocked(
  "ambiguous zone mapping blocks Hu component readiness",
  (input) => {
    delete input.huComponentCandidate.conditionedZoneId;
  },
  "blocked_ambiguous_zone_mapping"
);

expectBlocked(
  "multiple conditioned zones without distribution blocks Hu component readiness",
  (input) => {
    input.huComponentCandidate.applicability.multipleAdjacentConditionedZones = true;
  },
  "blocked_ambiguous_distribution"
);

expectBlocked(
  "ztu-to-ztu unsupported path blocks Hu component readiness",
  (input) => {
    input.huComponentCandidate.boundaryRelation = "ztu_to_ztu";
    input.huComponentCandidate.applicability.notAdjacentToAnotherZtu = false;
  },
  "blocked_unsupported_methodology"
);

expectBlocked(
  "missing source provenance blocks Hu component readiness",
  (input) => {
    delete input.huComponentCandidate.sourceTrace;
  },
  "blocked_missing_source"
);

expectBlocked(
  "Hu submitted as raw auditor input is rejected",
  (input) => {
    input.rawAuditorInput = {
      Hu: {
        value: 3.5,
        unit: "W/K"
      }
    };
  },
  "rejected_hu_raw_auditor_input"
);

expectBlocked(
  "Hu treated as complete Htr component is blocked",
  (input) => {
    input.transmissionComponentClaims = {
      Hu: {
        claimsCompleteHtr: true
      }
    };
  },
  "blocked_hu_treated_as_complete_htr_component"
);

expectBlocked(
  "missing Hg and Ha treated as zero is blocked",
  (input) => {
    input.transmissionComponentClaims = {
      Hg: {
        value: 0
      },
      Ha: {
        value: 0
      }
    };
  },
  "blocked_fake_zero_transmission_component"
);

expectBlocked(
  "attempt to set complete Hu readiness is blocked",
  (input) => {
    input.readinessClaims = {
      isCompleteHuReady: true
    };
  },
  "blocked_complete_hu_readiness_escalation"
);

expectBlocked(
  "attempt to set complete Htr readiness is blocked",
  (input) => {
    input.readinessClaims = {
      isCompleteHtrReady: true
    };
  },
  "blocked_complete_htr_readiness_escalation"
);

test("fixture helpers can be cloned without sharing mutable state", () => {
  const first = clone(validInputPack());
  const second = clone(validInputPack());

  first.huComponentCandidate.element.area.value = 9;
  assert.equal(second.huComponentCandidate.element.area.value, 12.5);
});
