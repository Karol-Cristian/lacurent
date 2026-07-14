const TABLE_2_14A = "MC001-2022 Tabel 2.14a";
const TABLE_2_14B = "MC001-2022 Tabel 2.14b";
const SCOPE = "ventilation_infiltration_table_2_14_explicit_lookup";
const WEIGHTED_SCOPE = "ventilation_infiltration_relation_2_20_explicit_weighted_average";

const JOINERY_CODES = Object.freeze([
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
  "L6",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "P1",
  "P2",
  "P3",
  "P4",
  "A1",
  "A2",
  "A3"
]);

function freezeRows(rows) {
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

const rowKeys = Object.freeze([
  ["individual_residential", null, "NA"],
  ["individual_residential", null, "MA"],
  ["individual_residential", null, "A"],
  ["multi_apartment_residential", "ED", "NA"],
  ["multi_apartment_residential", "ED", "MA"],
  ["multi_apartment_residential", "ED", "A"],
  ["multi_apartment_residential", "EM", "NA"],
  ["multi_apartment_residential", "EM", "MA"],
  ["multi_apartment_residential", "EM", "A"],
  ["multi_apartment_residential", "ES", "NA"],
  ["multi_apartment_residential", "ES", "MA"],
  ["multi_apartment_residential", "ES", "A"]
].map(Object.freeze));

const n50Rows = freezeRows([
  [1.9, 3.48, 4.75, 6.59, 8.01, 9.44, 1.47, 4.14, 6.38, 8.62, 10.86, 0.54, 1.36, 3.94, 5.57, 1.63, 4.55, 5.77],
  [1.74, 3.33, 4.35, 5.77, 6.79, 7.81, 1.17, 3.73, 5.57, 7.6, 9.23, 0.43, 1.09, 3.53, 4.75, 1.3, 3.94, 4.75],
  [1.36, 3.17, 3.94, 4.96, 5.57, 6.18, 0.88, 3.33, 4.75, 6.38, 7.6, 0.33, 0.81, 3.12, 3.94, 0.98, 3.33, 3.94],
  [1.79, 3.02, 3.94, 5.36, 6.59, 7.6, 1.17, 3.53, 5.16, 6.99, 8.83, 0.43, 1.09, 3.33, 4.55, 1.3, 4.35, 4.75],
  [1.63, 2.87, 3.53, 4.75, 5.57, 6.38, 1.03, 3.12, 4.55, 6.06, 7.6, 0.38, 0.95, 2.92, 3.94, 1.14, 3.73, 4.14],
  [1.47, 2.72, 3.33, 4.14, 4.55, 5.16, 0.88, 2.72, 3.94, 5.16, 6.38, 0.33, 0.81, 2.72, 3.33, 0.98, 3.12, 3.53],
  [1.74, 2.87, 3.53, 4.96, 5.97, 6.79, 1.03, 3.12, 4.75, 6.59, 8.22, 0.38, 0.95, 2.92, 4.14, 1.14, 3.94, 4.55],
  [1.58, 2.82, 3.33, 4.35, 5.16, 5.77, 0.88, 2.92, 4.14, 5.57, 6.99, 0.33, 0.81, 2.72, 3.53, 0.98, 3.53, 3.94],
  [1.41, 2.72, 3.12, 3.73, 4.14, 4.75, 0.73, 2.72, 3.53, 4.55, 5.77, 0.27, 0.68, 2.44, 3.12, 0.81, 3, 3.33],
  [1.63, 2.82, 3.33, 4.55, 5.57, 6.59, 0.88, 2.92, 4.55, 6.18, 7.81, 0.33, 0.81, 2.92, 3.94, 0.98, 3.53, 4.35],
  [1.52, 2.77, 3.12, 4.14, 4.75, 5.36, 0.81, 2.72, 3.94, 5.36, 6.79, 0.33, 0.81, 2.72, 3.33, 0.92, 3.25, 3.73],
  [1.36, 2.72, 2.92, 3.53, 3.94, 4.35, 0.73, 2.44, 3.33, 4.35, 5.36, 0.27, 0.68, 2.17, 2.92, 0.81, 2.92, 3.12]
]);

const n4Rows = freezeRows([
  [0.5, 0.69, 0.88, 1.21, 1.48, 1.74, 0.5, 0.76, 1.18, 1.59, 2, 0.5, 0.5, 0.73, 1.03, 0.5, 0.84, 1.06],
  [0.5, 0.65, 0.8, 1.06, 1.25, 1.44, 0.5, 0.69, 1.03, 1.4, 1.7, 0.5, 0.5, 0.65, 0.88, 0.5, 0.73, 0.88],
  [0.5, 0.61, 0.73, 0.91, 1.03, 1.14, 0.5, 0.61, 0.88, 1.18, 1.4, 0.5, 0.5, 0.58, 0.73, 0.5, 0.61, 0.73],
  [0.5, 0.58, 0.73, 0.99, 1.21, 1.4, 0.5, 0.65, 0.95, 1.29, 1.63, 0.5, 0.5, 0.61, 0.84, 0.5, 0.8, 0.84],
  [0.5, 0.54, 0.65, 0.88, 1.03, 1.18, 0.5, 0.58, 0.84, 1.12, 1.4, 0.5, 0.5, 0.57, 0.73, 0.5, 0.69, 0.76],
  [0.5, 0.5, 0.61, 0.76, 0.84, 0.95, 0.5, 0.5, 0.73, 0.95, 1.18, 0.5, 0.5, 0.5, 0.61, 0.5, 0.58, 0.65],
  [0.5, 0.54, 0.65, 0.91, 1.1, 1.25, 0.5, 0.58, 0.88, 1.21, 1.51, 0.5, 0.5, 0.54, 0.76, 0.5, 0.73, 0.84],
  [0.5, 0.5, 0.61, 0.8, 0.95, 1.06, 0.5, 0.54, 0.76, 1.03, 1.29, 0.5, 0.5, 0.5, 0.65, 0.5, 0.65, 0.73],
  [0.5, 0.5, 0.58, 0.69, 0.76, 0.88, 0.5, 0.5, 0.65, 0.84, 1.06, 0.5, 0.5, 0.5, 0.58, 0.5, 0.55, 0.61],
  [0.5, 0.5, 0.61, 0.84, 1.03, 1.21, 0.5, 0.54, 0.84, 1.14, 1.44, 0.5, 0.5, 0.54, 0.73, 0.5, 0.65, 0.8],
  [0.5, 0.5, 0.58, 0.76, 0.88, 0.99, 0.5, 0.5, 0.77, 0.99, 1.25, 0.5, 0.5, 0.5, 0.61, 0.5, 0.6, 0.69],
  [0.5, 0.5, 0.54, 0.65, 0.73, 0.8, 0.5, 0.5, 0.65, 0.8, 0.99, 0.5, 0.5, 0.5, 0.54, 0.5, 0.54, 0.58]
]);

function entryFor(tableCode, rowIndex, joineryCode, value) {
  const [buildingCategory, exposureClass, shelterClass] = rowKeys[rowIndex];
  return Object.freeze({
    id: `${tableCode}_${buildingCategory}_${exposureClass ?? "no_exposure"}_${shelterClass}_${joineryCode}`,
    tableCode,
    buildingCategory,
    exposureClass,
    shelterClass,
    joineryCode,
    airChangeRatePerHour: value,
    pressureDifferencePa: tableCode === "2.14a" ? 50 : 4,
    sourceTable: tableCode === "2.14a" ? TABLE_2_14A : TABLE_2_14B,
    sourcePages: Object.freeze(tableCode === "2.14a" ? [87] : [87, 89]),
    sourceSection: "2.5.1-2.5.2",
    scope: SCOPE
  });
}

function buildEntries(tableCode, rows) {
  return Object.freeze(rows.flatMap((row, rowIndex) => (
    row.map((value, columnIndex) => entryFor(tableCode, rowIndex, JOINERY_CODES[columnIndex], value))
  )));
}

export const ventilationInfiltrationTable2_14Entries = Object.freeze([
  ...buildEntries("2.14a", n50Rows),
  ...buildEntries("2.14b", n4Rows)
]);

export function listVentilationInfiltrationTable2_14Entries() {
  return ventilationInfiltrationTable2_14Entries;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function blocker(code) {
  return Object.freeze({ code, severity: "blocking" });
}

function diagnostics(blockers = []) {
  return Object.freeze({
    blockers: Object.freeze(blockers.map(blocker)),
    methodologyLimits: Object.freeze([
      "explicit_table_selection_required",
      "residential_natural_ventilation_scope",
      "no_default_building_category",
      "no_default_exposure_class",
      "no_default_shelter_class",
      "no_default_joinery_degradation",
      "not_mechanical_ventilation",
      "not_final_energy",
      "not_certificate"
    ])
  });
}

function blocked(scope, code) {
  return Object.freeze({
    status: "blocked",
    scope,
    diagnostics: diagnostics([code])
  });
}

function findEntry({ tableCode, buildingCategory, exposureClass, shelterClass, joineryCode }) {
  return ventilationInfiltrationTable2_14Entries.find((entry) => (
    entry.tableCode === tableCode &&
    entry.buildingCategory === buildingCategory &&
    entry.exposureClass === (exposureClass ?? null) &&
    entry.shelterClass === shelterClass &&
    entry.joineryCode === joineryCode
  )) ?? null;
}

export function resolveVentilationInfiltrationTable2_14Value({
  tableCode,
  buildingCategory,
  exposureClass,
  shelterClass,
  joineryCode
} = {}) {
  if (!["2.14a", "2.14b"].includes(tableCode)) {
    return blocked(SCOPE, "ventilation_infiltration_table_2_14_unknown_table");
  }
  if (buildingCategory === "individual_residential" && exposureClass !== undefined && exposureClass !== null) {
    return blocked(SCOPE, "ventilation_infiltration_table_2_14_unexpected_exposure_for_individual_building");
  }
  if (buildingCategory === "multi_apartment_residential" && !["ED", "EM", "ES"].includes(exposureClass)) {
    return blocked(SCOPE, "ventilation_infiltration_table_2_14_missing_multi_apartment_exposure");
  }

  const selected = findEntry({
    tableCode,
    buildingCategory,
    exposureClass,
    shelterClass,
    joineryCode
  });
  if (!selected) {
    return blocked(SCOPE, "ventilation_infiltration_table_2_14_no_matching_entry");
  }

  return Object.freeze({
    status: "ready",
    scope: SCOPE,
    tableCode: selected.tableCode,
    buildingCategory: selected.buildingCategory,
    exposureClass: selected.exposureClass,
    shelterClass: selected.shelterClass,
    joineryCode: selected.joineryCode,
    airChangeRatePerHour: selected.airChangeRatePerHour,
    pressureDifferencePa: selected.pressureDifferencePa,
    airChangeRateOrigin: "MC001_TABLE_2_14_EXPLICIT_SELECTION_LOOKUP",
    sourceTable: selected.sourceTable,
    sourcePages: selected.sourcePages,
    sourceSection: selected.sourceSection,
    diagnostics: diagnostics()
  });
}

export function calculateWeightedAirChangeRate2_20({ components } = {}) {
  if (!Array.isArray(components) || components.length === 0) {
    return blocked(WEIGHTED_SCOPE, "ventilation_weighted_air_change_2_20_missing_components");
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (const component of components) {
    const airChangeRate = finiteNumber(component?.airChangeRatePerHour);
    const weight = finiteNumber(component?.weight);
    if (airChangeRate === null || airChangeRate < 0) {
      return blocked(WEIGHTED_SCOPE, "ventilation_weighted_air_change_2_20_invalid_air_change_rate");
    }
    if (weight === null || weight <= 0) {
      return blocked(WEIGHTED_SCOPE, "ventilation_weighted_air_change_2_20_invalid_weight");
    }
    weightedSum += airChangeRate * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0 || !Number.isFinite(weightedSum)) {
    return blocked(WEIGHTED_SCOPE, "ventilation_weighted_air_change_2_20_invalid_result");
  }

  return Object.freeze({
    status: "ready",
    scope: WEIGHTED_SCOPE,
    airChangeRatePerHour: weightedSum / totalWeight,
    totalWeight,
    componentCount: components.length,
    airChangeRateOrigin: "MC001_RELATION_2_20_EXPLICIT_WEIGHTED_AVERAGE",
    formulaCode: "na = sum(weight_i * na_i) / sum(weight_i)",
    sourceRelation: "2.20",
    sourcePage: 89,
    diagnostics: diagnostics()
  });
}
