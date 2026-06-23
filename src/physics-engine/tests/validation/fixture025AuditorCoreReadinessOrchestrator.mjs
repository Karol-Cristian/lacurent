import { fixture021EnvelopeFromAuditorInput } from "./fixture021EnvelopeFromAuditorInput.mjs";
import { fixture023VentilationFromAuditorInput } from "./fixture023VentilationFromAuditorInput.mjs";

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

function validationImport(componentId, value, sourceRefs) {
  return {
    importId: `FIXTURE_025_IMPORT_${componentId}`,
    targetFieldPath: `transmission.${componentId}`,
    value,
    unit: "W/K",
    source: `Fixture 025 controlled ${componentId} value`,
    owner: "validation_import_with_source",
    sourceRefs,
    traceId: `FIXTURE_025_${componentId}_TRACE`,
    importContext:
      "Phase G controlled auditor-core readiness component; not a formula validation",
    sourceFixtureId: "FIXTURE_025_AUDITOR_CORE_READINESS_ORCHESTRATOR",
    reviewStatus: "reviewed",
    validatesFormulaPath: false
  };
}

function buildPartialInputPack() {
  const inputPack = clone(fixture021EnvelopeFromAuditorInput.inputPack);
  const ventilationInput = clone(fixture023VentilationFromAuditorInput.inputPack);

  inputPack.contractMetadata.contractId =
    "PHASE_G_AUDITOR_CORE_READINESS_FIXTURE_025";
  inputPack.contractMetadata.contractVersion =
    "PHASE_G_AUDITOR_CORE_READINESS_ORCHESTRATOR";
  inputPack.contractMetadata.createdBy = "PHYSICS_ENGINE_VALIDATION";
  inputPack.sourceTrace.documents.push(...ventilationInput.sourceTrace.documents);
  inputPack.explicitBlockers.push(...ventilationInput.explicitBlockers);
  inputPack.ventilation = ventilationInput.ventilation;

  return deepFreeze(inputPack);
}

function buildControlledHeatLossInputPack() {
  const inputPack = clone(buildPartialInputPack());
  inputPack.envelope.elements = inputPack.envelope.elements.filter(
    (element) => element.boundaryType === "exterior"
  );
  inputPack.explicitBlockers = [];
  inputPack.validationImports = [
    validationImport("Hg", 2, ["FIXTURE_025_CONTROLLED_GROUND_SOURCE"]),
    validationImport("Hu", 3, ["FIXTURE_025_CONTROLLED_UNCONDITIONED_SOURCE"]),
    validationImport("Ha", 4, ["FIXTURE_025_CONTROLLED_ADJACENT_SOURCE"])
  ];

  return deepFreeze(inputPack);
}

export const fixture025AuditorCoreReadinessOrchestrator = Object.freeze({
  fixtureId: "FIXTURE_025_AUDITOR_CORE_READINESS_ORCHESTRATOR",
  fixtureType: "phase_g_auditor_core_readiness_orchestrator",
  sourceDocument: "Phase G narrow auditor core readiness fixture",
  sourceNote:
    "Composes Phase C input gate, Phase D envelope builder, Phase E Htr readiness, Phase F ventilation builder, and Phase F heat-loss readiness.",
  scope:
    "Pure Physics Engine Phase G readiness orchestration over source-backed envelope and ventilation auditor input.",
  exclusions: Object.freeze([
    "no full Level 2 Full Auditor readiness",
    "no full MC001 methodology coverage",
    "no monthly heating readiness",
    "no QHnd readiness",
    "no climate readiness",
    "no solar gains",
    "no internal gains",
    "no cooling",
    "no lighting",
    "no DHW",
    "no renewables/RER",
    "no reference building",
    "no CPE/report/certificate workflow",
    "no UI/API/DB/Worker/deploy/product integration",
    "no marketplace",
    "no AI features",
    "no new MC001 physics formulas"
  ]),
  registry: fixture021EnvelopeFromAuditorInput.registry,
  inputPack: buildPartialInputPack(),
  controlledHeatLossInputPack: buildControlledHeatLossInputPack(),
  expected: Object.freeze({
    inputGateStatus: "accepted_input_builder_gate",
    hdStatus: "ready",
    htrBlockedStatus: "blocked_incomplete_components",
    hveStatus: "ready",
    heatLossBlockedStatus: "blocked_incomplete_heat_loss_components",
    controlledHeatLossReadyStatus: "ready_heat_loss_components",
    isEnvelopeReady: false,
    isTransmissionReady: false,
    isVentilationReady: true,
    isHeatLossReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isCpeReady: false,
    isProductionIntegrationReady: false
  })
});
