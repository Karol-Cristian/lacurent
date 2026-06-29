import assert from "node:assert/strict";
import {
  createMc001HuMultiComponentInventoryReadinessGate,
  MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_ID
} from "../mc001HuMultiComponentInventoryReadinessGate.mjs";

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
    entryId: "PHASE_H2H_BZTU_DIRECT_INPUT_001",
    recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
    value: 0.62,
    unit: "dimensionless",
    month: 1,
    ztuZoneId: "ztu-buffer-zone-001",
    source: "Phase H2H reviewed direct bztu methodology source",
    sourceRefs: ["MC001_2022_2_22_BZTU_CORRECTION_FACTOR"],
    sourceLocator: {
      documentId: "MC001-2022",
      page: 95,
      relation: "bztu direct input source locator"
    },
    methodologyStatus: "accepted",
    inputClassification: "explicit_methodological_direct_input",
    traceId: "PHASE_H2H_BZTU_TRACE_001",
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

function validHuComponentCandidate(index, extra = {}) {
  return {
    componentId: `PHASE_H2H_HU_COMPONENT_00${index}`,
    conditionedZoneId: "ztc-zone-001",
    ztuZoneId: "ztu-buffer-zone-001",
    month: 1,
    element: {
      elementId: `ztu-wall-00${index}`,
      elementType: "wall",
      area: {
        value: index === 1 ? 12.5 : 8.75,
        unit: "m2"
      }
    },
    boundaryRelation: "external_non_climatized_zone",
    uValuePath: {
      pathType: "source_backed_corrected_u_value",
      value: index === 1 ? 0.31 : 0.29,
      unit: "W/(m2*K)",
      source: `Phase H2H reviewed U-value path source ${index}`,
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: `PHASE_H2H_U_VALUE_TRACE_00${index}`
    },
    bztuPath: {
      pathType: "accepted_direct_input",
      recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
      entryId: "PHASE_H2H_BZTU_DIRECT_INPUT_001"
    },
    applicability: {
      appliesToMonth: 1,
      appliesToZtuZoneId: "ztu-buffer-zone-001",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    sourceTrace: {
      source: `Phase H2H synthetic Hu component contract source ${index}`,
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: `PHASE_H2H_HU_COMPONENT_TRACE_00${index}`
    },
    ...extra
  };
}

function expectedComponentFrom(candidate) {
  return {
    componentId: candidate.componentId,
    conditionedZoneId: candidate.conditionedZoneId,
    ztuZoneId: candidate.ztuZoneId,
    month: candidate.month,
    elementId: candidate.element.elementId
  };
}

function validInputPack() {
  const first = validHuComponentCandidate(1);
  const second = validHuComponentCandidate(2);

  return {
    huMultiComponentInventory: {
      month: 1,
      conditionedZoneIds: ["ztc-zone-001"],
      ztuZoneIds: ["ztu-buffer-zone-001"],
      expectedComponents: [expectedComponentFrom(first), expectedComponentFrom(second)],
      componentCandidates: [first, second],
      sourceTrace: {
        source: "Phase H2H reviewed Hu inventory coverage source",
        sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
        sourceLocator: {
          documentId: "MC001-2022",
          page: 100,
          figure: "Figure 2.12"
        },
        traceId: "PHASE_H2H_HU_INVENTORY_TRACE_001"
      }
    },
    bztuDirectInputs: [validBztuDirectInput()]
  };
}

function build(input = validInputPack()) {
  return createMc001HuMultiComponentInventoryReadinessGate(input);
}

function expectBlocked(name, mutate, expectedCode) {
  test(name, () => {
    const input = clone(validInputPack());
    mutate(input);
    const result = build(input);

    assert.notEqual(result.status, "ready");
    assert.equal(result.readinessFlags.isHuInventoryReady, false);
    assert.equal(result.readinessFlags.isCompleteHuReady, false);
    assert.equal(result.readinessFlags.isCompleteHtrReady, false);
    assert.equal("huResult" in result, false);
    assert.equal("htrResult" in result, false);
    assert.ok(
      result.diagnostics.some((entry) => entry.code === expectedCode),
      `Expected diagnostic ${expectedCode}; got ${result.diagnostics.map((entry) => entry.code).join(", ")}`
    );
  });
}

test("valid multi-component Hu inventory is ready only at inventory level", () => {
  const result = build();

  assert.equal(
    result.gateId,
    MC001_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE_ID
  );
  assert.equal(result.status, "ready");
  assert.equal(result.inventoryStatus, "ready_hu_component_inventory");
  assert.equal(result.readinessFlags.isHuInventoryReady, true);
  assert.equal(result.readinessFlags.isCompleteHuReady, false);
  assert.equal(result.readinessFlags.isCompleteHtrReady, false);
  assert.equal(result.readinessFlags.isMonthlyHeatingReady, false);
  assert.equal(result.readinessFlags.isQhndReady, false);
  assert.equal(result.readinessFlags.isLevel2AuditorReady, false);
  assert.equal(result.readinessFlags.isCpeReady, false);
  assert.equal(result.month, 1);
  assert.deepEqual(result.conditionedZoneIds, ["ztc-zone-001"]);
  assert.deepEqual(result.ztuZoneIds, ["ztu-buffer-zone-001"]);
  assert.equal(result.componentCount, 2);
  assert.equal(result.readyComponentCount, 2);
  assert.equal(result.blockedComponentCount, 0);
  assert.equal(result.componentReadiness.every((entry) => entry.isHuComponentReady), true);
  assert.equal(result.missingComponents.length, 0);
  assert.equal(result.duplicateComponents.length, 0);
  assert.equal(result.ambiguousComponents.length, 0);
  assert.equal(result.distributionBlockers.length, 0);
  assert.equal("huResult" in result, false);
  assert.equal("htrResult" in result, false);
  assert.equal("huResult" in result.huMultiComponentInventoryReadiness, false);
  assert.equal("htrResult" in result.huMultiComponentInventoryReadiness, false);
});

test("valid multi-component Hu inventory preserves source trace", () => {
  const result = build();

  assert.ok(
    result.sourceTrace.records.some(
      (entry) =>
        entry.componentId === "hu_multi_component_inventory" &&
        entry.traceId === "PHASE_H2H_HU_INVENTORY_TRACE_001"
    )
  );
  assert.ok(
    result.sourceTrace.records.some(
      (entry) =>
        entry.componentId === "bztu" &&
        entry.recordId === "MC001_2022_2_22_BZTU_CORRECTION_FACTOR"
    )
  );
});

expectBlocked(
  "empty component list blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates = [];
  },
  "blocked_empty_hu_component_inventory"
);

expectBlocked(
  "missing expected component blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates.pop();
  },
  "blocked_missing_hu_component"
);

expectBlocked(
  "extra actual component not listed in expected inventory blocks readiness",
  (input) => {
    const extraComponent = clone(input.huMultiComponentInventory.componentCandidates[1]);
    extraComponent.componentId = "PHASE_H2H_UNEXPECTED_HU_COMPONENT_003";
    extraComponent.element.elementId = "unexpected-ztu-wall-003";
    extraComponent.uValuePath.traceId = "PHASE_H2H_UNEXPECTED_U_VALUE_TRACE_003";
    extraComponent.sourceTrace.traceId = "PHASE_H2H_UNEXPECTED_COMPONENT_TRACE_003";
    input.huMultiComponentInventory.componentCandidates.push(extraComponent);
  },
  "blocked_unexpected_hu_component"
);

expectBlocked(
  "actual component with no expected scope tuple blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates[1].componentId =
      "PHASE_H2H_UNMATCHED_HU_COMPONENT_002";
    input.huMultiComponentInventory.componentCandidates[1].element.elementId =
      "unmatched-ztu-wall-002";
  },
  "blocked_unexpected_hu_component"
);

expectBlocked(
  "actual component mapping to multiple expected components blocks readiness",
  (input) => {
    input.huMultiComponentInventory.expectedComponents.push(
      clone(input.huMultiComponentInventory.expectedComponents[1])
    );
  },
  "blocked_ambiguous_hu_component_inventory"
);

expectBlocked(
  "duplicate component id blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates[1].componentId =
      input.huMultiComponentInventory.componentCandidates[0].componentId;
  },
  "blocked_duplicate_component_id"
);

expectBlocked(
  "duplicate element month zone tuple blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates[1].element.elementId =
      input.huMultiComponentInventory.componentCandidates[0].element.elementId;
  },
  "blocked_duplicate_element_scope"
);

expectBlocked(
  "inconsistent month across components blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates[1].month = 2;
  },
  "blocked_inconsistent_month_scope"
);

expectBlocked(
  "inconsistent ztu across components blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates[1].ztuZoneId =
      "ztu-other-zone";
  },
  "blocked_inconsistent_ztu_scope"
);

expectBlocked(
  "wrong BZTU month blocks inventory readiness",
  (input) => {
    input.bztuDirectInputs[0].month = 2;
  },
  "blocked_bztu_scope_mismatch"
);

expectBlocked(
  "wrong BZTU ztu blocks inventory readiness",
  (input) => {
    input.bztuDirectInputs[0].ztuZoneId = "ztu-other-zone";
  },
  "blocked_bztu_scope_mismatch"
);

expectBlocked(
  "missing BZTU path in one component blocks inventory readiness",
  (input) => {
    delete input.huMultiComponentInventory.componentCandidates[1].bztuPath;
  },
  "blocked_missing_bztu_path"
);

expectBlocked(
  "invalid BZTU path in one component blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates[1].bztuPath.pathType =
      "raw_auditor_input";
  },
  "blocked_invalid_bztu_path"
);

expectBlocked(
  "invalid U-value path in one component blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates[1].uValuePath.pathType =
      "unsupported_u_path";
  },
  "blocked_invalid_u_value_path"
);

expectBlocked(
  "missing source provenance in one component blocks inventory readiness",
  (input) => {
    delete input.huMultiComponentInventory.componentCandidates[1].sourceTrace;
  },
  "blocked_missing_source"
);

expectBlocked(
  "ambiguous boundary relation blocks inventory readiness",
  (input) => {
    delete input.huMultiComponentInventory.componentCandidates[1].boundaryRelation;
  },
  "blocked_ambiguous_boundary_relation"
);

expectBlocked(
  "multiple conditioned zones without distribution source blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.conditionedZoneIds = [
      "ztc-zone-001",
      "ztc-zone-002"
    ];
    input.huMultiComponentInventory.componentCandidates[1].conditionedZoneId =
      "ztc-zone-002";
  },
  "blocked_ambiguous_distribution"
);

expectBlocked(
  "ztu-to-ztu path blocks inventory readiness",
  (input) => {
    input.huMultiComponentInventory.componentCandidates[1].boundaryRelation =
      "ztu_to_ztu";
    input.huMultiComponentInventory.componentCandidates[1].applicability.notAdjacentToAnotherZtu =
      false;
  },
  "blocked_unsupported_methodology"
);

expectBlocked(
  "component submitted as raw Hu value is rejected",
  (input) => {
    input.rawAuditorInput = {
      Hu: {
        value: 4.2,
        unit: "W/K"
      }
    };
  },
  "rejected_hu_raw_auditor_input"
);

expectBlocked(
  "attempt to force Hu inventory readiness is blocked",
  (input) => {
    input.huMultiComponentInventory.readinessClaims = {
      isHuInventoryReady: true
    };
  },
  "blocked_hu_inventory_readiness_escalation"
);

expectBlocked(
  "attempt to force complete Hu readiness is blocked",
  (input) => {
    input.huMultiComponentInventory.readinessClaims = {
      isCompleteHuReady: true
    };
  },
  "blocked_complete_hu_readiness_escalation"
);

expectBlocked(
  "attempt to force complete Htr readiness is blocked",
  (input) => {
    input.huMultiComponentInventory.readinessClaims = {
      isCompleteHtrReady: true
    };
  },
  "blocked_complete_htr_readiness_escalation"
);

expectBlocked(
  "missing Hg and Ha treated as zero blocks inventory readiness",
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
  "partial inventory treated as complete inventory is blocked",
  (input) => {
    input.huMultiComponentInventory.componentCandidates.pop();
    input.huMultiComponentInventory.readinessClaims = {
      isHuInventoryReady: true
    };
  },
  "blocked_partial_inventory_escalation"
);

test("fixture helpers can be cloned without sharing mutable state", () => {
  const first = clone(validInputPack());
  const second = clone(validInputPack());

  first.huMultiComponentInventory.componentCandidates[0].element.area.value = 9;
  assert.equal(
    second.huMultiComponentInventory.componentCandidates[0].element.area.value,
    12.5
  );
});
