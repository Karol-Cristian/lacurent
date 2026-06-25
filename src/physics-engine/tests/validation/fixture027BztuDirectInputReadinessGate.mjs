import { fixture025AuditorCoreReadinessOrchestrator } from "./fixture025AuditorCoreReadinessOrchestrator.mjs";

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

export function validBztuDirectInput(extra = {}) {
  return {
    entryId: "FIXTURE_027_BZTU_DIRECT_INPUT_001",
    recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
    value: 0.62,
    unit: "dimensionless",
    month: 1,
    ztuZoneId: "fixture-027-ztu-buffer-zone",
    source: "Fixture 027 reviewed direct bztu methodology source",
    sourceRefs: ["MC001_2022_2_22_BZTU_CORRECTION_FACTOR"],
    sourceLocator: "Phase H1 direct BZTU source review packet, relation candidate 2.22",
    methodologyStatus: "accepted",
    inputClassification: "explicit_methodological_direct_input",
    traceId: "FIXTURE_027_BZTU_TRACE_001",
    reviewStatus: "reviewed",
    calculationPeriod: "monthly",
    applicability: {
      calculationPeriod: "monthly",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    adjacentConditionedZoneRelation:
      "fixture-027-conditioned-zone_to_fixture-027-ztu-buffer-zone",
    ...extra
  };
}

function buildInputPackWithBztuDirectInput(entries = [validBztuDirectInput()]) {
  const inputPack = clone(fixture025AuditorCoreReadinessOrchestrator.inputPack);
  inputPack.contractMetadata.contractId =
    "PHASE_H1_BZTU_DIRECT_INPUT_READINESS_FIXTURE_027";
  inputPack.contractMetadata.contractVersion =
    "PHASE_H1_BZTU_DIRECT_INPUT_READINESS_GATE";
  inputPack.contractMetadata.createdBy = "PHYSICS_ENGINE_VALIDATION";
  inputPack.bztuDirectInputs = entries;
  return deepFreeze(inputPack);
}

export const fixture027BztuDirectInputReadinessGate = Object.freeze({
  fixtureId: "FIXTURE_027_BZTU_DIRECT_INPUT_READINESS_GATE",
  fixtureType: "phase_h1_bztu_direct_input_readiness_gate",
  sourceDocument:
    "Phase H1 direct BZTU input contract over Phase H0/H0A/H1-pre methodology notes",
  sourceNote:
    "Validates only direct source-backed BZTU input readiness and orchestrator exposure; it does not derive BZTU or calculate Hu/Htr.",
  scope:
    "Pure Physics Engine Phase H1 direct-input readiness validation for bztu methodology metadata, source/provenance, month/zone scope, and conservative blocker propagation.",
  exclusions: Object.freeze([
    "no full BZTU derivation",
    "no Hztu model",
    "no Hu calculation from bztu",
    "no complete Htr readiness",
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
  registry: fixture025AuditorCoreReadinessOrchestrator.registry,
  inputPack: buildInputPackWithBztuDirectInput(),
  invalidInputPacks: Object.freeze({
    missingSource: buildInputPackWithBztuDirectInput([
      validBztuDirectInput({ source: undefined })
    ]),
    productFallback: buildInputPackWithBztuDirectInput([
      validBztuDirectInput({
        inputClassification: "hidden_fallback",
        owner: "product_fallback"
      })
    ])
  }),
  expected: Object.freeze({
    bztuGateStatus: "accepted",
    bztuRecordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
    bztuUnit: "dimensionless",
    bztuMonth: 1,
    bztuZoneId: "fixture-027-ztu-buffer-zone",
    bztuInputClassification: "explicit_methodological_direct_input",
    htrStatus: "blocked_incomplete_components",
    isBztuDirectInputReady: true,
    isFullBztuDerivationReady: false,
    isHeatLossReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isCpeReady: false,
    isProductionIntegrationReady: false
  })
});
