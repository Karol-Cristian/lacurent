import { getAssemblyCatalogueEntry, makeEngineeringProvenance } from "./buildingPlatformCatalog.mjs";

const MODE = "building_typology_proposal_v1";
const BUILDING_TYPES = new Set(["detached_house", "apartment"]);
const CONSTRUCTION_PERIODS = new Set([
  "before_1960",
  "1960_1977",
  "1978_1990",
  "1991_2005",
  "after_2005"
]);
const STRUCTURAL_SYSTEMS = new Set([
  "masonry",
  "reinforced_concrete_frames",
  "reinforced_concrete_walls",
  "precast_concrete_panels",
  "timber"
]);

const typologyMatrix = Object.freeze({
  detached_house: Object.freeze({
    masonry: "detached_house.masonry.seed",
    reinforced_concrete_frames: "detached_house.reinforced_concrete.seed",
    reinforced_concrete_walls: "detached_house.reinforced_concrete.seed",
    timber: "detached_house.timber.seed"
  }),
  apartment: Object.freeze({
    masonry: "apartment.masonry.seed",
    reinforced_concrete_frames: "apartment.reinforced_concrete.seed",
    reinforced_concrete_walls: "apartment.reinforced_concrete.seed",
    precast_concrete_panels: "apartment.precast_panel.seed"
  })
});

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    mode: MODE,
    proposal: null,
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [
        "typology_proposal_only",
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

function safeCode(value) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= 96 &&
    /^[a-zA-Z0-9_.:-]+$/.test(value);
}

function hasAssembly(assemblyId) {
  return getAssemblyCatalogueEntry(assemblyId) !== null;
}

function assemblySelectionsFor(input) {
  const hasWallInsulation = input.renovations?.wallInsulation === "eps" ||
    input.renovations?.wallInsulation === true ||
    input.constructionPeriod === "after_2005";
  const hasRoofInsulation = input.renovations?.roofInsulated !== false;
  const hasWindowReplacement = input.renovations?.windowsReplaced !== false;

  return {
    exteriorWall: hasWallInsulation
      ? "wall_masonry_300_eps_100"
      : "wall_masonry_300_eps_100",
    roof: hasRoofInsulation
      ? "roof_timber_mineral_wool_200"
      : "roof_timber_mineral_wool_200",
    groundFloor: "ground_floor_concrete_eps_80",
    atticCeiling: input.context?.attic === "unheated" || input.buildingType === "detached_house"
      ? "wood_earth_ceiling_mineral_wool_100"
      : "wood_earth_ceiling_mineral_wool_100",
    window: hasWindowReplacement
      ? "window_pvc_double_glazing_direct_u"
      : "window_pvc_double_glazing_direct_u",
    door: "exterior_door_insulated_direct_u"
  };
}

function missingConfirmationsFor(input) {
  const confirmations = [
    "confirm_exterior_wall_layer_stack",
    "confirm_roof_or_attic_boundary",
    "confirm_ground_floor_or_basement_boundary",
    "confirm_window_system",
    "confirm_ventilation_profile",
    "confirm_monthly_climate_and_gains_profile"
  ];
  if (input.buildingType === "apartment") {
    confirmations.push("confirm_adjacent_conditioned_and_unconditioned_boundaries");
  }
  return confirmations;
}

export function proposeBuildingTypology(input = {}) {
  if (input.mode !== MODE) {
    return blocked("building_typology_invalid_mode");
  }
  if (!BUILDING_TYPES.has(input.buildingType)) {
    return blocked("building_typology_invalid_building_type");
  }
  if (!CONSTRUCTION_PERIODS.has(input.constructionPeriod)) {
    return blocked("building_typology_invalid_construction_period");
  }
  if (!STRUCTURAL_SYSTEMS.has(input.structuralSystem)) {
    return blocked("building_typology_invalid_structural_system");
  }
  const typologyId = typologyMatrix[input.buildingType]?.[input.structuralSystem] ?? null;
  if (typologyId === null) {
    return blocked("building_typology_unsupported_combination");
  }

  const assemblySelections = assemblySelectionsFor(input);
  if (Object.values(assemblySelections).some(selection => !hasAssembly(selection))) {
    return blocked("building_typology_catalogue_selection_missing");
  }

  const provenance = makeEngineeringProvenance({
    origin: "proposed_by_typology",
    reference: `P1.typology.${typologyId}.${input.constructionPeriod}`,
    confidence: input.constructionPeriod === "after_2005" ? "medium" : "low",
    normativeReference:
      "P1 typology proposal: engineering seed only; Chapter 2 physics remains calculation authority.",
    calculationSource: "typology_selection_no_physics_calculation",
    confirmationRequired: true
  });

  return {
    status: "ready",
    mode: MODE,
    proposal: {
      proposalId: `${typologyId}.${input.constructionPeriod}`,
      typologyId,
      buildingType: input.buildingType,
      constructionPeriod: input.constructionPeriod,
      structuralSystem: input.structuralSystem,
      assemblySelections,
      boundarySelections: {
        exteriorWall: "outside_air",
        roof: "outside_air",
        groundFloor: input.context?.basement === "heated" ? "adjacent_heated_space" : "ground",
        atticCeiling: input.context?.attic === "heated" ? "adjacent_heated_space" : "unheated_attic",
        window: "outside_air",
        door: "outside_air"
      },
      provenance,
      missingConfirmations: missingConfirmationsFor(input),
      assumptions: [
        {
          assumptionId: "typology_is_initial_proposal",
          text:
            "The typology proposes a likely engineering model and must be confirmed or edited.",
          provenance
        }
      ]
    },
    diagnostics: {
      blockers: [],
      warnings: [
        {
          code: "typology_requires_user_confirmation",
          severity: "warning"
        }
      ],
      methodologyLimits: [
        "typology_proposal_only",
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

export function createAssistedTypologyInput({
  buildingType,
  constructionPeriod,
  structuralSystem,
  renovations = {},
  context = {}
}) {
  return {
    mode: MODE,
    buildingType,
    constructionPeriod,
    structuralSystem,
    renovations: deepClone(renovations),
    context: deepClone(context)
  };
}

export function validateTypologyProposal(proposal) {
  if (proposal?.status !== "ready" || proposal.proposal === null) {
    return { ok: false, code: "building_typology_proposal_not_ready" };
  }
  if (!safeCode(proposal.proposal.proposalId, 160)) {
    return { ok: false, code: "building_typology_invalid_proposal_id" };
  }
  for (const selection of Object.values(proposal.proposal.assemblySelections ?? {})) {
    if (!hasAssembly(selection)) {
      return { ok: false, code: "building_typology_catalogue_selection_missing" };
    }
  }
  return { ok: true };
}
