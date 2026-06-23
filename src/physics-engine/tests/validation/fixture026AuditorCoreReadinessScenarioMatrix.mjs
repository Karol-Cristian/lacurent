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

function scenario(id, description, inputPack, expected) {
  return Object.freeze({
    id,
    description,
    inputPack: deepFreeze(inputPack),
    expected: Object.freeze(expected)
  });
}

function partialCoreInputPack() {
  return clone(fixture025AuditorCoreReadinessOrchestrator.inputPack);
}

function missingEnvelopeInputPack() {
  const inputPack = partialCoreInputPack();
  delete inputPack.envelope;
  return inputPack;
}

function missingVentilationInputPack() {
  const inputPack = partialCoreInputPack();
  delete inputPack.ventilation;
  return inputPack;
}

function unsupportedAdjacentBoundaryInputPack() {
  const inputPack = partialCoreInputPack();
  inputPack.envelope.elements[2].boundaryType = "adjacent";
  return inputPack;
}

function unsupportedVentilationTypeInputPack() {
  const inputPack = partialCoreInputPack();
  inputPack.ventilation.components[0].ventilationType = "unsupported_phase_g1_type";
  return inputPack;
}

function controlledHeatLossInputPack() {
  return clone(fixture025AuditorCoreReadinessOrchestrator.controlledHeatLossInputPack);
}

export const fixture026AuditorCoreReadinessScenarioMatrix = Object.freeze({
  fixtureId: "FIXTURE_026_AUDITOR_CORE_READINESS_SCENARIO_MATRIX",
  fixtureType: "phase_g1_auditor_core_readiness_matrix_hardening",
  sourceDocument: "Phase G1 narrow auditor core readiness scenario matrix",
  sourceNote:
    "Hardens the Phase G auditor core readiness orchestrator over multiple readiness states without expanding methodology scope.",
  scope:
    "Pure Physics Engine Phase G1 scenario-matrix validation for consolidated readiness contracts, blocked-item propagation, fake-zero rejection, and no readiness escalation.",
  exclusions: Object.freeze([
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
    "no new MC001 physics formulas"
  ]),
  registry: fixture025AuditorCoreReadinessOrchestrator.registry,
  scenarios: Object.freeze([
    scenario(
      "G1_A_ENVELOPE_HD_READY_HTR_BLOCKED_HVE_READY",
      "Envelope direct/Hd and Hve may be ready while Htr and heat-loss stay blocked.",
      partialCoreInputPack(),
      {
        hdStatus: "ready",
        htrStatus: "blocked_incomplete_components",
        hveStatus: "ready",
        heatLossStatus: "blocked_incomplete_heat_loss_components",
        isEnvelopeReady: false,
        isTransmissionReady: false,
        isVentilationReady: true,
        isHeatLossReady: false,
        requiredBlockedComponentId: "Hg"
      }
    ),
    scenario(
      "G1_B_MISSING_ENVELOPE_VENTILATION_READY",
      "Missing envelope input keeps envelope and transmission blocked while Hve can remain ready.",
      missingEnvelopeInputPack(),
      {
        envelopeStatus: "blocked_missing_envelope_input",
        htrStatus: "blocked_incomplete_components",
        hveStatus: "ready",
        heatLossStatus: "blocked_incomplete_heat_loss_components",
        isEnvelopeReady: false,
        isTransmissionReady: false,
        isVentilationReady: true,
        isHeatLossReady: false,
        requiredBlockedStatus: "blocked_missing_envelope_input"
      }
    ),
    scenario(
      "G1_C_ENVELOPE_READY_MISSING_VENTILATION",
      "Missing ventilation input keeps Hve and heat-loss blocked without fake zeroes.",
      missingVentilationInputPack(),
      {
        hdStatus: "ready",
        hveStatus: "blocked_missing_ventilation_input",
        heatLossStatus: "blocked_incomplete_heat_loss_components",
        isTransmissionReady: false,
        isVentilationReady: false,
        isHeatLossReady: false,
        requiredBlockedStatus: "blocked_missing_ventilation_input"
      }
    ),
    scenario(
      "G1_D_UNSUPPORTED_ADJACENT_BOUNDARY",
      "Unsupported adjacent boundary remains blocked and is not converted to Ha zero.",
      unsupportedAdjacentBoundaryInputPack(),
      {
        htrStatus: "blocked_incomplete_components",
        heatLossStatus: "blocked_incomplete_heat_loss_components",
        isTransmissionReady: false,
        isHeatLossReady: false,
        requiredBlockedComponentId: "Ha",
        requiredBlockedStatus: "blocked_missing_normative_data"
      }
    ),
    scenario(
      "G1_E_UNSUPPORTED_VENTILATION_TYPE",
      "Unsupported ventilation type keeps Hve and heat-loss blocked.",
      unsupportedVentilationTypeInputPack(),
      {
        hveStatus: "blocked_incomplete_ventilation_components",
        heatLossStatus: "blocked_incomplete_heat_loss_components",
        isVentilationReady: false,
        isHeatLossReady: false,
        requiredBlockedStatus: "blocked_unsupported_ventilation_type"
      }
    ),
    scenario(
      "G1_H_CONTROLLED_IMPORTS_COMPLETE_HEAT_LOSS_ONLY",
      "Controlled source-backed imports can complete Htr and heat-loss readiness without broader readiness claims.",
      controlledHeatLossInputPack(),
      {
        htrStatus: "ready",
        hveStatus: "ready",
        heatLossStatus: "ready_heat_loss_components",
        isEnvelopeReady: true,
        isTransmissionReady: true,
        isVentilationReady: true,
        isHeatLossReady: true,
        requiredSourceRef: "FIXTURE_025_CONTROLLED_GROUND_SOURCE"
      }
    )
  ])
});
