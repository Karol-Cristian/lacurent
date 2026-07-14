const SOURCE_TABLE = "MC001-2022 Tabel 2.15";
const SOURCE_SECTION = "2.7.2";
const SOURCE_PAGE = 103;
const SCOPE = "internal_gains_table_2_15_explicit_category_lookup";

function entry({ id, categoryRo, normalizedCategory, constantInternalGainWPerM2 }) {
  return Object.freeze({
    id,
    categoryRo,
    normalizedCategory,
    constantInternalGainWPerM2,
    sourceTable: SOURCE_TABLE,
    sourceSection: SOURCE_SECTION,
    sourcePage: SOURCE_PAGE,
    scope: SCOPE,
    note:
      "MC001 presents these as indicated fallback internal-gain fluxes; runtime use requires explicit category selection and explicit time/area inputs outside this lookup."
  });
}

export const internalGainsTable2_15Entries = Object.freeze([
  entry({
    id: "residential_collective",
    categoryRo: "Rezidentiala (colectiva)",
    normalizedCategory: "collective residential",
    constantInternalGainWPerM2: 3.1
  }),
  entry({
    id: "residential_single_family",
    categoryRo: "Rezidentiala (unifamiliala)",
    normalizedCategory: "single-family residential",
    constantInternalGainWPerM2: 2.4
  }),
  entry({
    id: "administrative",
    categoryRo: "Administrativa",
    normalizedCategory: "administrative",
    constantInternalGainWPerM2: 3.3
  }),
  entry({
    id: "schools",
    categoryRo: "Scoli",
    normalizedCategory: "schools",
    constantInternalGainWPerM2: 2.3
  }),
  entry({
    id: "hospitals",
    categoryRo: "Spitale",
    normalizedCategory: "hospitals",
    constantInternalGainWPerM2: 4
  })
]);

export function listInternalGainsTable2_15Entries() {
  return internalGainsTable2_15Entries;
}

export function findInternalGainsTable2_15EntryById(id) {
  return internalGainsTable2_15Entries.find((item) => item.id === id) ?? null;
}

function blocker(code) {
  return Object.freeze({ code, severity: "blocking" });
}

function blocked(code) {
  return Object.freeze({
    status: "blocked",
    scope: SCOPE,
    constantInternalGainWPerM2: null,
    diagnostics: Object.freeze({
      blockers: Object.freeze([blocker(code)]),
      methodologyLimits: Object.freeze([
        "explicit_internal_gain_category_required",
        "no_default_internal_gain_category",
        "no_default_floor_area",
        "no_default_monthly_hours",
        "not_full_internal_gains",
        "not_QHnd",
        "not_QCnd",
        "not_final_energy",
        "not_certificate"
      ])
    })
  });
}

export function resolveInternalGainsTable2_15Value({ categoryId } = {}) {
  const selected = findInternalGainsTable2_15EntryById(categoryId);
  if (!selected) {
    return blocked("internal_gains_table_2_15_unknown_category");
  }

  return Object.freeze({
    status: "ready",
    scope: SCOPE,
    categoryId: selected.id,
    categoryRo: selected.categoryRo,
    constantInternalGainWPerM2: selected.constantInternalGainWPerM2,
    internalGainFluxOrigin: "MC001_TABLE_2_15_EXPLICIT_CATEGORY_LOOKUP",
    sourceTable: selected.sourceTable,
    sourceSection: selected.sourceSection,
    sourcePage: selected.sourcePage,
    diagnostics: Object.freeze({
      blockers: Object.freeze([]),
      methodologyLimits: Object.freeze([
        "explicit_internal_gain_category_required",
        "no_default_internal_gain_category",
        "no_default_floor_area",
        "no_default_monthly_hours",
        "not_full_internal_gains",
        "not_QHnd",
        "not_QCnd",
        "not_final_energy",
        "not_certificate"
      ])
    })
  });
}
