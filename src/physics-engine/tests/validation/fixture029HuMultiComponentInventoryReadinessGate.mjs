import { validBztuDirectInput } from "./fixture027BztuDirectInputReadinessGate.mjs";
import { validHuComponentCandidate } from "./fixture028HuComponentContractReadinessGate.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function validFixture029BztuInput(extra = {}) {
  return validBztuDirectInput({
    entryId: "FIXTURE_029_BZTU_DIRECT_INPUT_001",
    ztuZoneId: "fixture-029-ztu-buffer-zone",
    adjacentConditionedZoneRelation:
      "fixture-029-conditioned-zone_to_fixture-029-ztu-buffer-zone",
    traceId: "FIXTURE_029_BZTU_TRACE_001",
    ...extra
  });
}

function validFixture029Component(index, extra = {}) {
  return validHuComponentCandidate({
    componentId: `FIXTURE_029_HU_COMPONENT_00${index}`,
    conditionedZoneId: "fixture-029-conditioned-zone",
    ztuZoneId: "fixture-029-ztu-buffer-zone",
    month: 1,
    element: {
      elementId: `fixture-029-ztu-wall-00${index}`,
      elementType: "wall",
      area: {
        value: index === 1 ? 12.5 : 8.75,
        unit: "m2"
      }
    },
    bztuPath: {
      pathType: "accepted_direct_input",
      recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
      entryId: "FIXTURE_029_BZTU_DIRECT_INPUT_001"
    },
    uValuePath: {
      pathType: "source_backed_corrected_u_value",
      value: index === 1 ? 0.31 : 0.29,
      unit: "W/(m2*K)",
      source: `Fixture 029 reviewed U-value path source ${index}`,
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: `FIXTURE_029_U_VALUE_TRACE_00${index}`
    },
    applicability: {
      appliesToMonth: 1,
      appliesToZtuZoneId: "fixture-029-ztu-buffer-zone",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    sourceTrace: {
      source: `Fixture 029 synthetic Hu component inventory source ${index}`,
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: `FIXTURE_029_HU_COMPONENT_TRACE_00${index}`
    },
    ...extra
  });
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

function validFixture029Input(extra = {}) {
  const first = validFixture029Component(1);
  const second = validFixture029Component(2);

  return deepFreeze({
    huMultiComponentInventory: {
      month: 1,
      conditionedZoneIds: ["fixture-029-conditioned-zone"],
      ztuZoneIds: ["fixture-029-ztu-buffer-zone"],
      expectedComponents: [expectedComponentFrom(first), expectedComponentFrom(second)],
      componentCandidates: [first, second],
      sourceTrace: {
        source: "Fixture 029 reviewed Hu inventory coverage source",
        sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
        sourceLocator: {
          documentId: "MC001-2022",
          page: 100,
          figure: "Figure 2.12"
        },
        traceId: "FIXTURE_029_HU_INVENTORY_TRACE_001"
      }
    },
    bztuDirectInputs: [validFixture029BztuInput()],
    ...clone(extra)
  });
}

function invalidInputPack(mutate) {
  const inputPack = clone(validFixture029Input());
  mutate(inputPack);
  return deepFreeze(inputPack);
}

export const fixture029HuMultiComponentInventoryReadinessGate = Object.freeze({
  fixtureId: "FIXTURE_029_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE",
  fixtureType: "phase_h2h_hu_multi_component_inventory_readiness_gate",
  sourceDocument:
    "Phase H2H Hu multi-component inventory readiness over Phase H2C_A locators and Phase H2G design",
  sourceNote:
    "Validates only source-backed multi-component Hu inventory readiness. It does not calculate Hu, aggregate Hu, or calculate Htr.",
  scope:
    "Pure Physics Engine Phase H2H inventory/readiness validation for multiple source-backed Hu component candidates in one narrow month/zone scope with accepted BZTU, expected coverage, duplicate detection, provenance, and blocker propagation.",
  exclusions: Object.freeze([
    "no numerical Hu calculation",
    "no Hu aggregation",
    "no complete Hu readiness",
    "no complete Htr readiness",
    "no A * U * bztu calculation",
    "no full BZTU derivation",
    "no Hztu;e implementation",
    "no Hztu;tot implementation",
    "no cztu;ve implementation",
    "no distribution formula implementation",
    "no ground Hg implementation",
    "no native Ha implementation",
    "no full Level 2 Full Auditor readiness",
    "no full MC001 methodology coverage",
    "no climate readiness",
    "no monthly heating readiness",
    "no QHnd readiness",
    "no final energy readiness",
    "no primary energy readiness",
    "no CO2 readiness",
    "no CPE/report/certificate workflow",
    "no UI/API/DB/Worker/deploy/product integration",
    "no marketplace",
    "no AI features",
    "no new MC001 calculation formula"
  ]),
  inputPack: validFixture029Input(),
  invalidInputPacks: Object.freeze({
    missingExpectedComponent: invalidInputPack((inputPack) => {
      inputPack.huMultiComponentInventory.componentCandidates.pop();
    }),
    unexpectedActualComponent: invalidInputPack((inputPack) => {
      const extraComponent = clone(
        inputPack.huMultiComponentInventory.componentCandidates[1]
      );
      extraComponent.componentId = "FIXTURE_029_UNEXPECTED_HU_COMPONENT_003";
      extraComponent.element.elementId = "fixture-029-unexpected-ztu-wall-003";
      extraComponent.uValuePath.traceId = "FIXTURE_029_UNEXPECTED_U_VALUE_TRACE_003";
      extraComponent.sourceTrace.traceId = "FIXTURE_029_UNEXPECTED_COMPONENT_TRACE_003";
      inputPack.huMultiComponentInventory.componentCandidates.push(extraComponent);
    }),
    duplicateComponentId: invalidInputPack((inputPack) => {
      inputPack.huMultiComponentInventory.componentCandidates[1].componentId =
        inputPack.huMultiComponentInventory.componentCandidates[0].componentId;
    }),
    wrongBztuMonth: invalidInputPack((inputPack) => {
      inputPack.bztuDirectInputs[0].month = 2;
    }),
    partialInventoryEscalation: invalidInputPack((inputPack) => {
      inputPack.huMultiComponentInventory.componentCandidates.pop();
      inputPack.huMultiComponentInventory.readinessClaims = {
        isHuInventoryReady: true
      };
    })
  }),
  expected: Object.freeze({
    gateStatus: "ready",
    inventoryStatus: "ready_hu_component_inventory",
    month: 1,
    conditionedZoneIds: Object.freeze(["fixture-029-conditioned-zone"]),
    ztuZoneIds: Object.freeze(["fixture-029-ztu-buffer-zone"]),
    componentCount: 2,
    readyComponentCount: 2,
    blockedComponentCount: 0,
    isHuInventoryReady: true,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isCpeReady: false
  })
});
