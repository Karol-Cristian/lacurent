const SOURCE_PAGE = 112;
const TABLE_2_19 = "MC001-2022 Tabel 2.19";
const TABLE_2_20 = "MC001-2022 Tabel 2.20";
const SCOPE = "effective_internal_heat_capacity_explicit_class_area_lookup";

function classEntry({
  id,
  classRo,
  normalizedClass,
  kappaMOp,
  monthlyCoefficient,
  specificationRo
}) {
  return Object.freeze({
    id,
    classRo,
    normalizedClass,
    kappaMOpJPerM2K: kappaMOp,
    cmIntEffCoefficientJPerM2K: monthlyCoefficient,
    specificationRo,
    sourceTables: Object.freeze([TABLE_2_19, TABLE_2_20]),
    sourcePage: SOURCE_PAGE,
    scope: SCOPE
  });
}

const entries = [
  classEntry({
    id: "very_light",
    classRo: "Foarte usoara",
    normalizedClass: "very light",
    kappaMOp: 50000,
    monthlyCoefficient: 80000,
    specificationRo:
      "Cladirea nu contine nicio componenta de masa, de exemplu o placa de plastic si/sau un invelis de lemn, sau echivalent."
  }),
  classEntry({
    id: "light",
    classRo: "Usoara",
    normalizedClass: "light",
    kappaMOp: 75000,
    monthlyCoefficient: 110000,
    specificationRo:
      "Cladirea nu contine nicio componenta de masa decat caramizi sau beton usor de 5 cm 10 cm, sau echivalent."
  }),
  classEntry({
    id: "medium",
    classRo: "Medie",
    normalizedClass: "medium",
    kappaMOp: 110000,
    monthlyCoefficient: 165000,
    specificationRo:
      "Cladirea nu contine nicio componenta de masa decat caramizi sau beton usor de 10 cm 20 cm, sau caramizi sau beton greu de 7 cm, sau echivalent."
  }),
  classEntry({
    id: "massive",
    classRo: "Masiva",
    normalizedClass: "massive",
    kappaMOp: 175000,
    monthlyCoefficient: 260000,
    specificationRo:
      "Cladire care contine caramizi pline sau beton greu de 7 cm pana la 12 cm, sau echivalent."
  }),
  classEntry({
    id: "very_massive",
    classRo: "Foarte masiva",
    normalizedClass: "very massive",
    kappaMOp: 250000,
    monthlyCoefficient: 370000,
    specificationRo:
      "Cladire care contine caramizi pline sau beton greu de mai mult de 12 cm, sau echivalent."
  })
].map(Object.freeze);

export const effectiveInternalHeatCapacityTableEntries = Object.freeze(entries);

export function listEffectiveInternalHeatCapacityTableEntries() {
  return effectiveInternalHeatCapacityTableEntries;
}

export function findEffectiveInternalHeatCapacityClassById(id) {
  return effectiveInternalHeatCapacityTableEntries.find((entry) => entry.id === id) ?? null;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return Object.freeze({
    status: "blocked",
    scope: SCOPE,
    effectiveInternalHeatCapacityJPerK: null,
    diagnostics: Object.freeze({
      blockers: Object.freeze([blocker(code)]),
      methodologyLimits: Object.freeze([
        "explicit_capacity_class_required",
        "explicit_useful_floor_area_required",
        "no_default_capacity_class",
        "no_default_floor_area",
        "not_QHnd",
        "not_QCnd",
        "not_final_energy",
        "not_certificate"
      ])
    })
  });
}

export function resolveEffectiveInternalHeatCapacityTable2_20Value({
  capacityClassId,
  usefulFloorAreaM2
} = {}) {
  const entry = findEffectiveInternalHeatCapacityClassById(capacityClassId);
  if (!entry) {
    return blocked("effective_capacity_table_2_20_unknown_class");
  }

  const area = finiteNumber(usefulFloorAreaM2);
  if (area === null) {
    return blocked("effective_capacity_table_2_20_missing_explicit_useful_floor_area");
  }
  if (area <= 0) {
    return blocked("effective_capacity_table_2_20_invalid_explicit_useful_floor_area");
  }

  const effectiveInternalHeatCapacityJPerK = entry.cmIntEffCoefficientJPerM2K * area;
  if (
    !Number.isFinite(effectiveInternalHeatCapacityJPerK) ||
    effectiveInternalHeatCapacityJPerK <= 0
  ) {
    return blocked("effective_capacity_table_2_20_invalid_result");
  }

  return Object.freeze({
    status: "ready",
    scope: SCOPE,
    capacityClassId: entry.id,
    classRo: entry.classRo,
    usefulFloorAreaM2: area,
    cmIntEffCoefficientJPerM2K: entry.cmIntEffCoefficientJPerM2K,
    effectiveInternalHeatCapacityJPerK,
    effectiveInternalHeatCapacityOrigin: "calculated_from_MC001_TABLE_2_20_class_and_explicit_Ause",
    effectiveInternalHeatCapacityFormulaCode:
      "MC001_TABLE_2_20_EFFECTIVE_INTERNAL_HEAT_CAPACITY_CLASS_AREA",
    sourceTables: entry.sourceTables,
    sourcePage: entry.sourcePage,
    diagnostics: Object.freeze({
      blockers: Object.freeze([]),
      methodologyLimits: Object.freeze([
        "explicit_capacity_class_required",
        "explicit_useful_floor_area_required",
        "no_default_capacity_class",
        "no_default_floor_area",
        "not_QHnd",
        "not_QCnd",
        "not_final_energy",
        "not_certificate"
      ])
    })
  });
}
