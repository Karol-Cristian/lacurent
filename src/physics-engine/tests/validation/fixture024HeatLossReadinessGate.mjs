import { fixture021EnvelopeFromAuditorInput } from "./fixture021EnvelopeFromAuditorInput.mjs";
import { fixture023VentilationFromAuditorInput } from "./fixture023VentilationFromAuditorInput.mjs";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validationImport(componentId, value, sourceRefs) {
  return Object.freeze({
    importId: `FIXTURE_024_IMPORT_${componentId}`,
    targetFieldPath: `transmission.${componentId}`,
    value,
    unit: "W/K",
    source: `Fixture 024 controlled ${componentId} value`,
    owner: "validation_import_with_source",
    sourceRefs: Object.freeze(sourceRefs),
    traceId: `FIXTURE_024_${componentId}_TRACE`,
    importContext:
      "Phase F controlled heat-loss readiness component; not a formula validation",
    sourceFixtureId: "FIXTURE_024_HEAT_LOSS_READINESS_GATE",
    reviewStatus: "reviewed",
    validatesFormulaPath: false
  });
}

function completeTransmissionInputPack() {
  const inputPack = clone(fixture021EnvelopeFromAuditorInput.inputPack);
  inputPack.envelope.elements = inputPack.envelope.elements.filter(
    (element) => element.boundaryType === "exterior"
  );
  inputPack.explicitBlockers = [];
  inputPack.validationImports = [
    validationImport("Hg", 2, ["FIXTURE_024_CONTROLLED_GROUND_SOURCE"]),
    validationImport("Hu", 3, ["FIXTURE_024_CONTROLLED_UNCONDITIONED_SOURCE"]),
    validationImport("Ha", 4, ["FIXTURE_024_CONTROLLED_ADJACENT_SOURCE"])
  ];
  return inputPack;
}

const expectedHtrWPerK =
  fixture021EnvelopeFromAuditorInput.expected.directTransmissionSubtotalWPerK + 2 + 3 + 4;
const expectedHveWPerK = fixture023VentilationFromAuditorInput.expected.hveWPerK;

export const fixture024HeatLossReadinessGate = Object.freeze({
  fixtureId: "FIXTURE_024_HEAT_LOSS_READINESS_GATE",
  fixtureType: "phase_f_heat_loss_readiness_gate",
  sourceDocument: "Phase F narrow heat-loss readiness fixture",
  sourceNote:
    "Uses Phase E transmission readiness and Fixture 023 Phase F ventilation input readiness.",
  scope:
    "Pure Physics Engine Phase F readiness validation for Htr/Hve heat-loss component gating.",
  exclusions: Object.freeze([
    "no full Htr engine",
    "no full envelope engine",
    "no full ventilation engine",
    "no Level 2 Full Auditor readiness",
    "no climate/monthly heating readiness",
    "no QHnd calculation",
    "no solar gains",
    "no internal gains",
    "no cooling",
    "no lighting",
    "no DHW",
    "no renewables/RER",
    "no reference building",
    "no CPE/report/certificate workflow",
    "no UI/API/DB/Worker/deploy/product integration",
    "no new MC001 physics formulas"
  ]),
  registry: fixture021EnvelopeFromAuditorInput.registry,
  completeTransmissionInputPack: Object.freeze(completeTransmissionInputPack()),
  partialTransmissionInputPack: fixture021EnvelopeFromAuditorInput.inputPack,
  ventilationInputPack: fixture023VentilationFromAuditorInput.inputPack,
  expected: Object.freeze({
    htrReadyStatus: "ready",
    hveReadyStatus: "ready",
    partialHtrStatus: "blocked_incomplete_components",
    heatLossReadyStatus: "ready_heat_loss_components",
    heatLossBlockedStatus: "blocked_incomplete_heat_loss_components",
    htrWPerK: expectedHtrWPerK,
    hveWPerK: expectedHveWPerK,
    heatLossWPerK: expectedHtrWPerK + expectedHveWPerK,
    isHeatLossReady: true,
    isMonthlyHeatingReady: false,
    isQhndReady: false
  })
});
