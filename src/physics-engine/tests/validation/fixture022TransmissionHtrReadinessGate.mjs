import { fixture021EnvelopeFromAuditorInput } from "./fixture021EnvelopeFromAuditorInput.mjs";

function validationImport(componentId, value, sourceRefs) {
  return Object.freeze({
    importId: `FIXTURE_022_IMPORT_${componentId}`,
    targetFieldPath: `transmission.${componentId}`,
    value,
    unit: "W/K",
    source: `Fixture 022 controlled ${componentId} value`,
    owner: "validation_import_with_source",
    sourceRefs: Object.freeze(sourceRefs),
    traceId: `FIXTURE_022_${componentId}_TRACE`,
    importContext:
      "Phase E controlled transmission readiness component; not a formula validation",
    sourceFixtureId: "FIXTURE_022_TRANSMISSION_HTR_READINESS_GATE",
    reviewStatus: "reviewed",
    validatesFormulaPath: false
  });
}

export const fixture022TransmissionHtrReadinessGate = Object.freeze({
  fixtureId: "FIXTURE_022_TRANSMISSION_HTR_READINESS_GATE",
  fixtureType: "phase_e_transmission_htr_readiness_gate",
  sourceDocument: "Phase E narrow transmission/Htr readiness gate fixture",
  sourceNote:
    "Uses Phase D Fixture 021 envelope-builder output and Phase C guarded import shape.",
  scope:
    "Pure Physics Engine Phase E readiness validation for transmission components and Htr blocking.",
  exclusions: Object.freeze([
    "no full Htr readiness",
    "no full envelope engine readiness",
    "no Level 2 Full Auditor readiness",
    "no climate/monthly heating readiness",
    "no CPE/report/certificate workflow",
    "no UI/API/DB/Worker/deploy/product integration",
    "no climate/monthly heating implementation",
    "no full Htr engine",
    "no full envelope engine",
    "no new MC001 physics formulas"
  ]),
  registry: fixture021EnvelopeFromAuditorInput.registry,
  phaseDInputPack: fixture021EnvelopeFromAuditorInput.inputPack,
  controlledValidationImports: Object.freeze([
    validationImport("Hg", 2, ["FIXTURE_022_CONTROLLED_GROUND_SOURCE"])
  ]),
  expected: Object.freeze({
    hdStatus: "ready",
    thermalBridgeStatus: "ready",
    hgStatusWithoutImport: "blocked_missing_validated_method",
    hgStatusWithImport: "ready",
    huStatus: "blocked_missing_validated_method",
    haStatus: "blocked_missing_validated_method",
    htrStatus: "blocked_incomplete_components",
    isHdExteriorDirectReady: true,
    isHtrReady: false,
    directTransmissionSubtotalWPerK:
      fixture021EnvelopeFromAuditorInput.expected.directTransmissionSubtotalWPerK,
    bridgeContributionWPerK:
      fixture021EnvelopeFromAuditorInput.expected.bridgeContributionWPerK
  })
});
