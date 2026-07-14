const SOURCE_TABLE = "MC001-2022 Tabel 2.21";
const SOURCE_SECTION = "2.9.1";
const SOURCE_PAGE = 123;
const SCOPE = "humidification_table_2_21_explicit_space_category_lookup";

function entry({ id, categoryRo, normalizedCategory, annualMoistureSupplyKgHPerKg }) {
  return Object.freeze({
    id,
    categoryRo,
    normalizedCategory,
    annualMoistureSupplyKgHPerKg,
    sourceTable: SOURCE_TABLE,
    sourceSection: SOURCE_SECTION,
    sourcePage: SOURCE_PAGE,
    scope: SCOPE,
    note:
      "MC001 marks these as indicative humidification values that must be adapted to climate data; this lookup does not implement latent humidification energy."
  });
}

export const humidificationTable2_21Entries = Object.freeze([
  entry({
    id: "residential",
    categoryRo: "Rezidente individuale, colective",
    normalizedCategory: "residential individual or collective",
    annualMoistureSupplyKgHPerKg: 0.17
  }),
  entry({
    id: "offices",
    categoryRo: "Birouri",
    normalizedCategory: "offices",
    annualMoistureSupplyKgHPerKg: 4.2
  }),
  entry({
    id: "education",
    categoryRo: "Cladiri pentru educatie",
    normalizedCategory: "education buildings",
    annualMoistureSupplyKgHPerKg: 4.2
  }),
  entry({
    id: "hospitals",
    categoryRo: "Spitale",
    normalizedCategory: "hospitals",
    annualMoistureSupplyKgHPerKg: 4.2
  }),
  entry({
    id: "hotels_restaurants",
    categoryRo: "Hoteluri, restaurante",
    normalizedCategory: "hotels and restaurants",
    annualMoistureSupplyKgHPerKg: 0.17
  }),
  entry({
    id: "kitchens",
    categoryRo: "Bucatarii",
    normalizedCategory: "kitchens",
    annualMoistureSupplyKgHPerKg: 0
  }),
  entry({
    id: "theatres_auditoriums",
    categoryRo: "Teatre, auditorii",
    normalizedCategory: "theatres and auditoriums",
    annualMoistureSupplyKgHPerKg: 0.17
  }),
  entry({
    id: "servers",
    categoryRo: "Servere",
    normalizedCategory: "server rooms",
    annualMoistureSupplyKgHPerKg: 0
  }),
  entry({
    id: "conditioned_sports_halls",
    categoryRo: "Sali de sport conditionate",
    normalizedCategory: "conditioned sports halls",
    annualMoistureSupplyKgHPerKg: 0.17
  }),
  entry({
    id: "unconditioned_sports_halls",
    categoryRo: "Sali de sport neconditionate",
    normalizedCategory: "unconditioned sports halls",
    annualMoistureSupplyKgHPerKg: 0
  }),
  entry({
    id: "retail_wholesale",
    categoryRo: "Magazine en gros sau en detail",
    normalizedCategory: "retail or wholesale stores",
    annualMoistureSupplyKgHPerKg: 0.17
  }),
  entry({
    id: "garages",
    categoryRo: "Garaje",
    normalizedCategory: "garages",
    annualMoistureSupplyKgHPerKg: 0
  })
]);

export function listHumidificationTable2_21Entries() {
  return humidificationTable2_21Entries;
}

export function findHumidificationTable2_21EntryById(id) {
  return humidificationTable2_21Entries.find((item) => item.id === id) ?? null;
}

function blocker(code) {
  return Object.freeze({ code, severity: "blocking" });
}

function blocked(code) {
  return Object.freeze({
    status: "blocked",
    scope: SCOPE,
    annualMoistureSupplyKgHPerKg: null,
    diagnostics: Object.freeze({
      blockers: Object.freeze([blocker(code)]),
      methodologyLimits: Object.freeze([
        "explicit_space_category_required",
        "indicative_value_requires_climate_adaptation",
        "not_QHnd",
        "not_QCnd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_certificate"
      ])
    })
  });
}

export function resolveHumidificationTable2_21Value({ categoryId } = {}) {
  const selected = findHumidificationTable2_21EntryById(categoryId);
  if (!selected) {
    return blocked("humidification_table_2_21_unknown_space_category");
  }

  return Object.freeze({
    status: "ready",
    scope: SCOPE,
    categoryId: selected.id,
    categoryRo: selected.categoryRo,
    annualMoistureSupplyKgHPerKg: selected.annualMoistureSupplyKgHPerKg,
    annualMoistureSupplyOrigin: "MC001_TABLE_2_21_EXPLICIT_SPACE_CATEGORY_LOOKUP",
    sourceTable: selected.sourceTable,
    sourceSection: selected.sourceSection,
    sourcePage: selected.sourcePage,
    diagnostics: Object.freeze({
      blockers: Object.freeze([]),
      methodologyLimits: Object.freeze([
        "explicit_space_category_required",
        "indicative_value_requires_climate_adaptation",
        "not_QHnd",
        "not_QCnd",
        "not_final_energy",
        "not_primary_energy",
        "not_CO2",
        "not_certificate"
      ])
    })
  });
}
