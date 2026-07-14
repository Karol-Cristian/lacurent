import { makeEngineeringProvenance } from "./buildingPlatformCatalog.mjs";

const SCOPE = "building_renovation_interventions_p2_no_physics_calculation";

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function provenance(reference, confidence = "medium", origin = "confirmed_by_user", metadata = {}) {
  return makeEngineeringProvenance({
    origin,
    reference,
    confidence,
    normativeReference:
      "P2 renovation intervention record: modifies the Building DNA proposal before Chapter 2 physics input generation.",
    calculationSource: "renovation_intervention_model_update_no_physics_calculation",
    confirmationRequired: origin !== "confirmed_by_user",
    ...metadata
  });
}

function intervention({ interventionId, interventionType, target, selectedOption, confidence, reference, origin, metadata }) {
  return {
    interventionId,
    interventionType,
    target,
    selectedOption,
    effect: "building_dna_proposal_modifier",
    provenance: provenance(reference, confidence, origin, metadata)
  };
}

export function resolveBuildingRenovationInterventions(input = {}) {
  const renovations = input.renovations ?? {};
  const sourceReference = input.source?.reference ?? "P2.renovation_interventions";
  const demoSource = input.source?.origin === "demo_fixture";
  const origin = demoSource ? "demo_fixture" : "confirmed_by_user";
  const metadata = demoSource ? {
    confirmationStatus: input.source.confirmationStatus ?? "unconfirmed_demo",
    editable: input.source.editable ?? true,
    notes: "Prefilled demonstration intervention; editable and not a silent default for normal projects."
  } : {};
  const interventions = [];

  if (renovations.wallInsulation === "eps" || renovations.wallInsulation === true) {
    interventions.push(intervention({
      interventionId: "external_wall_eps_insulation",
      interventionType: "external_wall_insulation",
      target: "exterior_wall",
      selectedOption: "eps_insulation",
      confidence: "medium",
      reference: `${sourceReference}.external_wall_eps_insulation`,
      origin,
      metadata
    }));
  }

  if (renovations.roofInsulated === true || renovations.roofInsulated === "yes") {
    interventions.push(intervention({
      interventionId: "roof_or_attic_insulation",
      interventionType: "roof_or_attic_insulation",
      target: "roof_or_attic_ceiling",
      selectedOption: "mineral_wool",
      confidence: "medium",
      reference: `${sourceReference}.roof_or_attic_insulation`,
      origin,
      metadata
    }));
  }

  if (renovations.floorInsulated === true || renovations.floorInsulated === "yes") {
    interventions.push(intervention({
      interventionId: "floor_or_basement_insulation",
      interventionType: "floor_or_basement_insulation",
      target: "ground_floor_or_basement_boundary",
      selectedOption: "eps_insulation",
      confidence: "medium",
      reference: `${sourceReference}.floor_or_basement_insulation`,
      origin,
      metadata
    }));
  }

  if (renovations.windowsReplaced === true) {
    interventions.push(intervention({
      interventionId: "window_replacement_pvc_double_glazing",
      interventionType: "window_replacement",
      target: "window",
      selectedOption: "pvc_double_glazing",
      confidence: "medium",
      reference: `${sourceReference}.window_replacement`,
      origin,
      metadata
    }));
  }

  return {
    status: "ready",
    scope: SCOPE,
    interventions: deepClone(interventions),
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [
        "engineering_model_generation_only",
        "no_physics_calculation",
        "no_hidden_defaults",
        "not_chapter_3",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_certificate"
      ]
    }
  };
}
