import { validBztuDirectInput } from "./fixture027BztuDirectInputReadinessGate.mjs";

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

export function validHuComponentCandidate(extra = {}) {
  return {
    componentId: "FIXTURE_028_HU_COMPONENT_001",
    conditionedZoneId: "fixture-028-conditioned-zone",
    ztuZoneId: "fixture-028-ztu-buffer-zone",
    month: 1,
    element: {
      elementId: "fixture-028-ztu-wall-001",
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
      source: "Fixture 028 reviewed U-value path source",
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: "FIXTURE_028_U_VALUE_TRACE_001"
    },
    bztuPath: {
      pathType: "accepted_direct_input",
      recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
      entryId: "FIXTURE_028_BZTU_DIRECT_INPUT_001"
    },
    applicability: {
      appliesToMonth: 1,
      appliesToZtuZoneId: "fixture-028-ztu-buffer-zone",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    sourceTrace: {
      source: "Fixture 028 synthetic Hu component contract source",
      sourceRefs: ["MC001_2022_FIGURE_2_12_ELEMENT_TRANSMISSION"],
      sourceLocator: {
        documentId: "MC001-2022",
        page: 100,
        figure: "Figure 2.12"
      },
      traceId: "FIXTURE_028_HU_COMPONENT_TRACE_001"
    },
    ...extra
  };
}

function validFixture028Input(extra = {}) {
  const bztuInput = validBztuDirectInput({
    entryId: "FIXTURE_028_BZTU_DIRECT_INPUT_001",
    ztuZoneId: "fixture-028-ztu-buffer-zone",
    adjacentConditionedZoneRelation:
      "fixture-028-conditioned-zone_to_fixture-028-ztu-buffer-zone"
  });

  return deepFreeze({
    huComponentCandidate: validHuComponentCandidate(),
    bztuDirectInputs: [bztuInput],
    ...clone(extra)
  });
}

function invalidInputPack(mutate) {
  const inputPack = clone(validFixture028Input());
  mutate(inputPack);
  return deepFreeze(inputPack);
}

export const fixture028HuComponentContractReadinessGate = Object.freeze({
  fixtureId: "FIXTURE_028_HU_COMPONENT_CONTRACT_READINESS_GATE",
  fixtureType: "phase_h2e_hu_component_contract_readiness_gate",
  sourceDocument:
    "Phase H2E executable Hu component contract readiness over H2C_A locators and H2D Fixture 028 design",
  sourceNote:
    "Validates only one narrow Hu component contract. It does not calculate numerical Hu, complete Hu, or complete Htr.",
  scope:
    "Pure Physics Engine Phase H2E contract/readiness validation for one source-backed Hu component candidate with one conditioned zone, one ztu, one element, one month, U-value path, accepted BZTU path, applicability, provenance, and blocker propagation.",
  exclusions: Object.freeze([
    "no numerical Hu calculation",
    "no complete Hu readiness",
    "no complete Htr readiness",
    "no full BZTU derivation",
    "no Hztu;e implementation",
    "no Hztu;tot implementation",
    "no cztu;ve implementation",
    "no distribution formula implementation",
    "no ground Hg implementation",
    "no unresolved Ha implementation",
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
  inputPack: validFixture028Input(),
  invalidInputPacks: Object.freeze({
    wrongBztuMonth: invalidInputPack((inputPack) => {
      inputPack.bztuDirectInputs[0].month = 2;
    }),
    missingUValueSource: invalidInputPack((inputPack) => {
      delete inputPack.huComponentCandidate.uValuePath.sourceRefs;
    }),
    rawHuInput: invalidInputPack((inputPack) => {
      inputPack.rawAuditorInput = {
        Hu: {
          value: 4.2,
          unit: "W/K"
        }
      };
    }),
    fakeZeroHtrComponents: invalidInputPack((inputPack) => {
      inputPack.transmissionComponentClaims = {
        Hg: {
          value: 0
        },
        Ha: {
          value: 0
        }
      };
    })
  }),
  expected: Object.freeze({
    gateStatus: "ready",
    componentStatus: "ready_hu_component_contract",
    componentId: "FIXTURE_028_HU_COMPONENT_001",
    conditionedZoneId: "fixture-028-conditioned-zone",
    ztuZoneId: "fixture-028-ztu-buffer-zone",
    month: 1,
    elementId: "fixture-028-ztu-wall-001",
    areaValue: 12.5,
    isHuComponentReady: true,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isCpeReady: false
  })
});
