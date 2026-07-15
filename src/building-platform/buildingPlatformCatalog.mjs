const PLATFORM_VERSION = "building_platform_p2_review_mvp_v1";

const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);
const ORIGINS = new Set([
  "confirmed_by_user",
  "selected_from_mc001_catalogue",
  "proposed_by_typology",
  "demo_fixture",
  "derived_by_resolver",
  "engineering_override",
  "imported",
  "measured"
]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function freezeDeep(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      freezeDeep(child);
    }
  }
  return value;
}

function provenance({
  origin,
  reference,
  confidence,
  normativeReference,
  calculationSource = "catalogue_entry_no_calculation",
  confirmationRequired = true,
  confirmationStatus,
  editable,
  notes,
  metadata
}) {
  if (!ORIGINS.has(origin)) {
    throw new Error(`Unsupported provenance origin ${origin}`);
  }
  if (!CONFIDENCE_LEVELS.has(confidence)) {
    throw new Error(`Unsupported confidence ${confidence}`);
  }
  return {
    origin,
    reference,
    confidence,
    normativeReference,
    calculationSource,
    confirmationRequired,
    ...(confirmationStatus === undefined ? {} : { confirmationStatus }),
    ...(editable === undefined ? {} : { editable }),
    ...(notes === undefined ? {} : { notes }),
    ...(metadata === undefined ? {} : { metadata })
  };
}

function source(reference, sourceType = "explicit_user_input") {
  return { sourceType, reference };
}

function quantity(amount, unit, entryProvenance) {
  return {
    amount,
    unit,
    provenance: entryProvenance,
    source: source(entryProvenance.reference)
  };
}

const commonReferences = Object.freeze({
  materialConductivity:
    "MC001 R15 material conductivity path delegates material values to explicit source-backed catalogue input",
  table2_2:
    "MC001 Table 2.2 correction coefficient applied inside Chapter 2 physics engine",
  surfaceResistance:
    "MC001 explicit surface resistance input consumed by Chapter 2 physics engine",
  directU:
    "MC001 direct U-value engineering input consumed by Chapter 2 physics engine"
});

const materialEntries = freezeDeep({
  brick_masonry_pre_1990: {
    kind: "material",
    materialId: "brick_masonry_pre_1990",
    displayName: "Brick masonry, pre-1990 typology seed",
    category: "masonry",
    physicsMaterial: {
      materialId: "brick",
      name: "brick masonry",
      lambdaNormat: quantity(
        0.6,
        "W/(m*K)",
        provenance({
          origin: "proposed_by_typology",
          reference: "P1.catalog.material.brick_masonry_pre_1990.lambda_normat",
          confidence: "medium",
          normativeReference: commonReferences.materialConductivity,
          notes:
            "Seed value is explicit engineering input for the Building DNA, not a hidden MC001 default."
        })
      ),
      correctionCoefficientCode: "zidarie_caramida_uscata_vechime_ge_30_ani"
    },
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.material.brick_masonry_pre_1990",
      confidence: "medium",
      normativeReference: `${commonReferences.materialConductivity}; ${commonReferences.table2_2}`
    })
  },
  eps_insulation: {
    kind: "material",
    materialId: "eps_insulation",
    displayName: "EPS insulation typology seed",
    category: "insulation",
    physicsMaterial: {
      materialId: "eps",
      name: "EPS insulation",
      lambda: quantity(
        0.04,
        "W/(m*K)",
        provenance({
          origin: "proposed_by_typology",
          reference: "P1.catalog.material.eps_insulation.lambda",
          confidence: "medium",
          normativeReference: commonReferences.materialConductivity
        })
      )
    },
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.material.eps_insulation",
      confidence: "medium",
      normativeReference: commonReferences.materialConductivity
    })
  },
  mineral_wool: {
    kind: "material",
    materialId: "mineral_wool",
    displayName: "Mineral wool typology seed",
    category: "insulation",
    physicsMaterial: {
      materialId: "mineral-wool",
      name: "mineral wool",
      lambda: quantity(
        0.04,
        "W/(m*K)",
        provenance({
          origin: "proposed_by_typology",
          reference: "P1.catalog.material.mineral_wool.lambda",
          confidence: "medium",
          normativeReference: commonReferences.materialConductivity
        })
      )
    },
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.material.mineral_wool",
      confidence: "medium",
      normativeReference: commonReferences.materialConductivity
    })
  },
  timber_board: {
    kind: "material",
    materialId: "timber_board",
    displayName: "Timber board typology seed",
    category: "timber",
    physicsMaterial: {
      materialId: "timber",
      name: "timber board",
      lambda: quantity(
        0.18,
        "W/(m*K)",
        provenance({
          origin: "proposed_by_typology",
          reference: "P1.catalog.material.timber_board.lambda",
          confidence: "low",
          normativeReference: commonReferences.materialConductivity
        })
      )
    },
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.material.timber_board",
      confidence: "low",
      normativeReference: commonReferences.materialConductivity
    })
  },
  earth_fill: {
    kind: "material",
    materialId: "earth_fill",
    displayName: "Earth or clay fill typology seed",
    category: "earth_fill",
    physicsMaterial: {
      materialId: "earth-fill",
      name: "earth fill",
      lambda: quantity(
        0.9,
        "W/(m*K)",
        provenance({
          origin: "proposed_by_typology",
          reference: "P1.catalog.material.earth_fill.lambda",
          confidence: "low",
          normativeReference: commonReferences.materialConductivity
        })
      )
    },
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.material.earth_fill",
      confidence: "low",
      normativeReference: commonReferences.materialConductivity
    })
  },
  reinforced_concrete: {
    kind: "material",
    materialId: "reinforced_concrete",
    displayName: "Reinforced concrete typology seed",
    category: "concrete",
    physicsMaterial: {
      materialId: "reinforced-concrete",
      name: "reinforced concrete",
      lambda: quantity(
        1.7,
        "W/(m*K)",
        provenance({
          origin: "proposed_by_typology",
          reference: "P1.catalog.material.reinforced_concrete.lambda",
          confidence: "medium",
          normativeReference: commonReferences.materialConductivity
        })
      )
    },
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.material.reinforced_concrete",
      confidence: "medium",
      normativeReference: commonReferences.materialConductivity
    })
  }
});

function layer(layerId, materialId, thickness, confidence = "medium") {
  return {
    layerId,
    materialId,
    thickness: quantity(
      thickness,
      "m",
      provenance({
        origin: "proposed_by_typology",
        reference: `P1.catalog.layer.${layerId}.thickness`,
        confidence,
        normativeReference:
          "Engineering assembly seed thickness; explicit Building DNA input, editable before calculation."
      })
    )
  };
}

function surfaceResistances(assemblyId, rsi, rse) {
  return {
    rsi: quantity(
      rsi,
      "m2*K/W",
      provenance({
        origin: "proposed_by_typology",
        reference: `P1.catalog.assembly.${assemblyId}.rsi`,
        confidence: "medium",
        normativeReference: commonReferences.surfaceResistance
      })
    ),
    rse: quantity(
      rse,
      "m2*K/W",
      provenance({
        origin: "proposed_by_typology",
        reference: `P1.catalog.assembly.${assemblyId}.rse`,
        confidence: "medium",
        normativeReference: commonReferences.surfaceResistance
      })
    )
  };
}

function directU(assemblyId, amount, confidence = "medium") {
  return quantity(
    amount,
    "W/(m2*K)",
    provenance({
      origin: "proposed_by_typology",
      reference: `${PLATFORM_VERSION}.catalog.assembly.${assemblyId}.direct_u`,
      confidence,
      normativeReference: commonReferences.directU
    })
  );
}

const assemblyEntries = freezeDeep({
  wall_masonry_300_uninsulated: {
    kind: "assembly",
    assemblyId: "wall_masonry_300_uninsulated",
    assemblyRole: "exterior_wall",
    displayName: "Masonry exterior wall without added insulation",
    assemblyType: "wall",
    layers: [
      layer("brick", "brick_masonry_pre_1990", 0.3)
    ],
    surfaceResistances: surfaceResistances("wall_masonry_300_uninsulated", 0.13, 0.04),
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P2.catalog.assembly.wall_masonry_300_uninsulated",
      confidence: "low",
      normativeReference:
        "Unrenovated typology seed resolved into Chapter 2 R and U calculations; confirmation required."
    })
  },
  wall_masonry_300_eps_100: {
    kind: "assembly",
    assemblyId: "wall_masonry_300_eps_100",
    assemblyRole: "exterior_wall",
    displayName: "Masonry exterior wall with EPS insulation",
    assemblyType: "wall",
    layers: [
      layer("brick", "brick_masonry_pre_1990", 0.3),
      layer("eps-insulation", "eps_insulation", 0.1)
    ],
    surfaceResistances: surfaceResistances("wall_masonry_300_eps_100", 0.13, 0.04),
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.assembly.wall_masonry_300_eps_100",
      confidence: "medium",
      normativeReference: "Layer stack seed resolved into Chapter 2 R and U calculations."
    })
  },
  roof_timber_mineral_wool_200: {
    kind: "assembly",
    assemblyId: "roof_timber_mineral_wool_200",
    assemblyRole: "roof",
    displayName: "Timber roof with mineral wool insulation",
    assemblyType: "roof",
    layers: [
      layer("timber", "timber_board", 0.02),
      layer("roof-insulation", "mineral_wool", 0.2)
    ],
    surfaceResistances: surfaceResistances("roof_timber_mineral_wool_200", 0.1, 0.04),
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.assembly.roof_timber_mineral_wool_200",
      confidence: "medium",
      normativeReference: "Layer stack seed resolved into Chapter 2 R and U calculations."
    })
  },
  ground_floor_concrete_eps_80: {
    kind: "assembly",
    assemblyId: "ground_floor_concrete_eps_80",
    assemblyRole: "ground_floor",
    displayName: "Concrete ground floor with EPS insulation",
    assemblyType: "floor",
    layers: [
      layer("concrete", "reinforced_concrete", 0.12),
      layer("floor-insulation", "eps_insulation", 0.08)
    ],
    surfaceResistances: surfaceResistances("ground_floor_concrete_eps_80", 0.17, 0.04),
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.assembly.ground_floor_concrete_eps_80",
      confidence: "medium",
      normativeReference: "Layer stack seed resolved into Chapter 2 R and U calculations."
    })
  },
  wood_earth_ceiling_mineral_wool_100: {
    kind: "assembly",
    assemblyId: "wood_earth_ceiling_mineral_wool_100",
    assemblyRole: "attic_ceiling",
    displayName: "Wood and earth-fill ceiling with mineral wool",
    assemblyType: "ceiling",
    layers: [
      layer("wood-plank", "timber_board", 0.03, "low"),
      layer("earth-fill", "earth_fill", 0.15, "low"),
      layer("ceiling-insulation", "mineral_wool", 0.1)
    ],
    surfaceResistances: surfaceResistances("wood_earth_ceiling_mineral_wool_100", 0.1, 0.1),
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.assembly.wood_earth_ceiling_mineral_wool_100",
      confidence: "low",
      normativeReference: "Layer stack seed resolved into Chapter 2 R and U calculations."
    })
  },
  window_pvc_double_glazing_direct_u: {
    kind: "assembly",
    assemblyId: "window_pvc_double_glazing_direct_u",
    assemblyRole: "window",
    displayName: "PVC double-glazed window",
    assemblyType: "window",
    directUValue: directU("window_pvc_double_glazing_direct_u", 1.2),
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.assembly.window_pvc_double_glazing_direct_u",
      confidence: "medium",
      normativeReference: commonReferences.directU
    })
  },
  window_legacy_double_glazing_direct_u: {
    kind: "assembly",
    assemblyId: "window_legacy_double_glazing_direct_u",
    assemblyRole: "window",
    displayName: "Older double-glazed window",
    assemblyType: "window",
    directUValue: directU("window_legacy_double_glazing_direct_u", 2.6, "low"),
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P2.catalog.assembly.window_legacy_double_glazing_direct_u",
      confidence: "low",
      normativeReference:
        "Typology seed direct U-value consumed by Chapter 2 physics; must be confirmed or overridden."
    })
  },
  exterior_door_insulated_direct_u: {
    kind: "assembly",
    assemblyId: "exterior_door_insulated_direct_u",
    assemblyRole: "door",
    displayName: "Insulated exterior door",
    assemblyType: "door",
    directUValue: directU("exterior_door_insulated_direct_u", 1.6),
    provenance: provenance({
      origin: "proposed_by_typology",
      reference: "P1.catalog.assembly.exterior_door_insulated_direct_u",
      confidence: "medium",
      normativeReference: commonReferences.directU
    })
  }
});

const catalogue = freezeDeep({
  version: PLATFORM_VERSION,
  materials: materialEntries,
  assemblies: assemblyEntries
});

export const BUILDING_PLATFORM_VERSION = PLATFORM_VERSION;
export const ENGINEERING_PROVENANCE_ORIGINS = Object.freeze([...ORIGINS]);
export const ENGINEERING_CONFIDENCE_LEVELS = Object.freeze([...CONFIDENCE_LEVELS]);

export function getBuildingPlatformCatalogue() {
  return deepClone(catalogue);
}

export function getMaterialCatalogueEntry(materialId) {
  const entry = materialEntries[materialId] ?? null;
  return entry === null ? null : deepClone(entry);
}

export function getAssemblyCatalogueEntry(assemblyId) {
  const entry = assemblyEntries[assemblyId] ?? null;
  return entry === null ? null : deepClone(entry);
}

export function listAssemblyCatalogueEntries() {
  return Object.values(assemblyEntries).map(deepClone);
}

export function listMaterialCatalogueEntries() {
  return Object.values(materialEntries).map(deepClone);
}

export function makeEngineeringProvenance(input) {
  return provenance(input);
}

export function makeEngineeringQuantity(amount, unit, inputProvenance) {
  return quantity(amount, unit, inputProvenance);
}
