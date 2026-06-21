const SOURCE_MODULE = "15_energy_classes_and_certificate";
const REGISTRY_STATUS = "reviewed_numeric_registry_created";
const EXTRACTION_STATUS = "extracted_numeric_values";

const CLASS_LABELS = Object.freeze(["A+", "A", "B", "C", "D", "E", "F", "G"]);
const CLASS_KEYS = Object.freeze(["a_plus", "a", "b", "c", "d", "e", "f", "g"]);
const PRIMARY_UNIT = "kWh/(m2.an)";
const CO2_UNIT = "kgCO2/(m2.an)";
const INTERVAL_RULE_SOURCE = "MC001-2022 page 395 Nota 1";

function freezeEntries(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze(entry)));
}

function tableKey(tableNumber) {
  return `tabel_${tableNumber.replace(".", "_")}`;
}

function tableDefinition({
  tableNumber,
  sourcePage,
  titleRo,
  buildingCategoryKey,
  buildingCategoryRo,
  purpose,
  rows
}) {
  return Object.freeze({
    sourceTable: `MC001-2022 Tabel ${tableNumber}`,
    tableNumber,
    tableKey: tableKey(tableNumber),
    sourceModule: SOURCE_MODULE,
    sourcePage,
    titleRo,
    buildingCategoryKey,
    buildingCategoryRo,
    purpose,
    rows: freezeEntries(rows)
  });
}

function thresholdRow({ indicatorKey, indicatorRo, indicatorBasis, unit, thresholds }) {
  return {
    indicatorKey,
    indicatorRo,
    indicatorBasis,
    unit,
    thresholds: Object.freeze([...thresholds])
  };
}

function primaryRow(indicatorKey, indicatorRo, thresholds) {
  return thresholdRow({
    indicatorKey,
    indicatorRo,
    indicatorBasis: "specific_primary_energy",
    unit: PRIMARY_UNIT,
    thresholds
  });
}

function co2Row(thresholds) {
  return thresholdRow({
    indicatorKey: "total",
    indicatorRo: "TOTAL",
    indicatorBasis: "specific_co2_emissions",
    unit: CO2_UNIT,
    thresholds
  });
}

const thresholdTableDefinitions = Object.freeze([
  tableDefinition({
    tableNumber: "5.7",
    sourcePage: 397,
    titleRo: "Clase energetice si de mediu pentru cladiri de locuit individuale",
    buildingCategoryKey: "residential_individual",
    buildingCategoryRo: "cladiri de locuit individuale",
    purpose: "Energy and environmental class thresholds for individual residential buildings.",
    rows: [
      primaryRow("heating", "Incalzire", [49, 69, 138, 239, 340, 425, 510]),
      primaryRow("cooling", "Racire", [13, 18, 36, 47, 57, 72, 86]),
      primaryRow("mechanical_ventilation", "Ventilare", [5, 7, 14, 18, 21, 26, 32]),
      primaryRow("dhw", "ACC", [18, 26, 51, 60, 70, 87, 104]),
      primaryRow("lighting", "Iluminat", [6, 9, 18, 26, 34, 42, 51]),
      primaryRow("total", "TOTAL", [91, 129, 257, 390, 522, 652, 783]),
      co2Row([16.1, 22.8, 45.5, 70.1, 94.8, 118.4, 142.1])
    ]
  }),
  tableDefinition({
    tableNumber: "5.8",
    sourcePage: 397,
    titleRo: "Clase energetice si de mediu pentru cladiri de locuit colective",
    buildingCategoryKey: "residential_collective",
    buildingCategoryRo: "cladiri de locuit colective",
    purpose: "Energy and environmental class thresholds for collective residential buildings.",
    rows: [
      primaryRow("heating", "Incalzire", [30, 42, 84, 150, 217, 271, 325]),
      primaryRow("cooling", "Racire", [13, 18, 35, 46, 56, 70, 85]),
      primaryRow("mechanical_ventilation", "Ventilare", [4, 5, 9, 13, 17, 21, 26]),
      primaryRow("dhw", "ACC", [21, 29, 57, 65, 73, 91, 109]),
      primaryRow("lighting", "Iluminat", [5, 7, 13, 23, 33, 42, 50]),
      primaryRow("total", "TOTAL", [73, 101, 198, 297, 396, 495, 595]),
      co2Row([12.7, 17.6, 34.6, 52.2, 69.9, 87.4, 104.9])
    ]
  }),
  tableDefinition({
    tableNumber: "5.9",
    sourcePage: 398,
    titleRo: "Clase energetice si de mediu pentru cladiri de birouri",
    buildingCategoryKey: "office",
    buildingCategoryRo: "cladiri de birouri",
    purpose: "Energy and environmental class thresholds for office buildings.",
    rows: [
      primaryRow("heating", "Incalzire", [29, 41, 82, 129, 176, 220, 264]),
      primaryRow("cooling", "Racire", [17, 24, 47, 72, 97, 121, 145]),
      primaryRow("mechanical_ventilation", "Ventilare", [6, 9, 18, 24, 30, 37, 45]),
      primaryRow("dhw", "ACC", [4, 6, 13, 16, 19, 23, 28]),
      primaryRow("lighting", "Iluminat", [12, 17, 33, 61, 88, 110, 132]),
      primaryRow("total", "TOTAL", [68, 97, 193, 302, 410, 511, 614]),
      co2Row([10.4, 14.8, 29.7, 46.1, 62.4, 77.8, 93.4])
    ]
  }),
  tableDefinition({
    tableNumber: "5.10",
    sourcePage: 398,
    titleRo: "Clase energetice si de mediu pentru cladiri destinate invatamantului",
    buildingCategoryKey: "education",
    buildingCategoryRo: "cladiri destinate invatamantului",
    purpose: "Energy and environmental class thresholds for education buildings.",
    rows: [
      primaryRow("heating", "Incalzire", [26, 36, 71, 144, 218, 272, 327]),
      primaryRow("cooling", "Racire", [4, 6, 13, 22, 31, 38, 46]),
      primaryRow("mechanical_ventilation", "Ventilare", [4, 6, 11, 21, 31, 39, 46]),
      primaryRow("dhw", "ACC", [7, 10, 19, 26, 33, 41, 49]),
      primaryRow("lighting", "Iluminat", [7, 10, 21, 33, 45, 57, 68]),
      primaryRow("total", "TOTAL", [48, 68, 135, 246, 358, 447, 536]),
      co2Row([8.3, 11.6, 23.0, 42.5, 62.2, 77.6, 93.1])
    ]
  }),
  tableDefinition({
    tableNumber: "5.11",
    sourcePage: 399,
    titleRo: "Clase energetice si de mediu pentru cladiri destinate sistemului sanitar",
    buildingCategoryKey: "healthcare",
    buildingCategoryRo: "cladiri destinate sistemului sanitar",
    purpose: "Energy and environmental class thresholds for healthcare buildings.",
    rows: [
      primaryRow("heating", "Incalzire", [48, 68, 137, 230, 324, 404, 485]),
      primaryRow("cooling", "Racire", [21, 30, 59, 92, 125, 156, 187]),
      primaryRow("mechanical_ventilation", "Ventilare", [9, 12, 25, 40, 54, 68, 82]),
      primaryRow("dhw", "ACC", [28, 39, 78, 90, 102, 128, 153]),
      primaryRow("lighting", "Iluminat", [11, 16, 32, 49, 66, 82, 98]),
      primaryRow("total", "TOTAL", [117, 165, 331, 501, 671, 838, 1005]),
      co2Row([19.7, 27.8, 55.8, 84.0, 112.3, 140.2, 168.1])
    ]
  }),
  tableDefinition({
    tableNumber: "5.12",
    sourcePage: 399,
    titleRo: "Clase energetice si de mediu pentru cladiri cu servicii de comert",
    buildingCategoryKey: "commerce",
    buildingCategoryRo: "cladiri cu servicii de comert",
    purpose: "Energy and environmental class thresholds for commerce/service buildings.",
    rows: [
      primaryRow("heating", "Incalzire", [59, 83, 166, 200, 234, 293, 352]),
      primaryRow("cooling", "Racire", [12, 17, 33, 46, 60, 74, 89]),
      primaryRow("mechanical_ventilation", "Ventilare", [4, 6, 12, 20, 28, 36, 43]),
      primaryRow("dhw", "ACC", [4, 5, 11, 13, 15, 19, 23]),
      primaryRow("lighting", "Iluminat", [9, 13, 26, 41, 56, 70, 84]),
      primaryRow("total", "TOTAL", [88, 124, 248, 320, 393, 492, 591]),
      co2Row([15.4, 21.6, 43.4, 54.5, 65.7, 82.3, 98.9])
    ]
  }),
  tableDefinition({
    tableNumber: "5.13",
    sourcePage: 400,
    titleRo: "Clase energetice si de mediu pentru cladiri pentru turism",
    buildingCategoryKey: "tourism",
    buildingCategoryRo: "cladiri pentru turism",
    purpose: "Energy and environmental class thresholds for tourism buildings.",
    rows: [
      primaryRow("heating", "Incalzire", [23, 32, 65, 153, 241, 302, 362]),
      primaryRow("cooling", "Racire", [7, 10, 20, 30, 39, 49, 59]),
      primaryRow("mechanical_ventilation", "Ventilare", [6, 8, 17, 26, 35, 43, 52]),
      primaryRow("dhw", "ACC", [26, 36, 72, 85, 98, 122, 146]),
      primaryRow("lighting", "Iluminat", [5, 7, 14, 27, 39, 49, 59]),
      primaryRow("total", "TOTAL", [67, 93, 188, 321, 452, 565, 678]),
      co2Row([11.8, 16.4, 33.1, 57.0, 80.6, 100.7, 120.8])
    ]
  }),
  tableDefinition({
    tableNumber: "5.14",
    sourcePage: 400,
    titleRo: "Clase energetice si de mediu pentru cladiri pentru activitati sportive",
    buildingCategoryKey: "sports",
    buildingCategoryRo: "cladiri pentru activitati sportive",
    purpose: "Energy and environmental class thresholds for sports buildings.",
    rows: [
      primaryRow("heating", "Incalzire", [36, 50, 99, 178, 257, 321, 385]),
      primaryRow("cooling", "Racire", [13, 18, 36, 57, 78, 97, 117]),
      primaryRow("mechanical_ventilation", "Ventilare", [6, 9, 17, 33, 48, 61, 73]),
      primaryRow("dhw", "ACC", [9, 12, 24, 32, 41, 51, 61]),
      primaryRow("lighting", "Iluminat", [11, 15, 30, 50, 70, 87, 105]),
      primaryRow("total", "TOTAL", [75, 104, 206, 350, 494, 617, 741]),
      co2Row([12.3, 17.0, 33.7, 57.4, 81.2, 101.4, 121.7])
    ]
  })
]);

function intervalNotation({ classIndex, thresholds }) {
  if (classIndex === 0) {
    return `<=${thresholds[0]}`;
  }

  if (classIndex === CLASS_LABELS.length - 1) {
    return `>${thresholds[thresholds.length - 1]}`;
  }

  return `(${thresholds[classIndex - 1]}, ${thresholds[classIndex]}]`;
}

function thresholdEntry({ table, row, classLabel, classKey, classIndex }) {
  const isFirstClass = classIndex === 0;
  const isLastClass = classIndex === CLASS_LABELS.length - 1;
  const lowerBound = isFirstClass ? null : row.thresholds[classIndex - 1];
  const upperBound = isLastClass ? null : row.thresholds[classIndex];

  return Object.freeze({
    id: `${table.tableKey}_${row.indicatorBasis}_${row.indicatorKey}_${classKey}`,
    sourceTable: table.sourceTable,
    tableNumber: table.tableNumber,
    sourcePage: table.sourcePage,
    sourceModule: table.sourceModule,
    buildingCategoryKey: table.buildingCategoryKey,
    buildingCategoryRo: table.buildingCategoryRo,
    indicatorKey: row.indicatorKey,
    indicatorRo: row.indicatorRo,
    indicatorBasis: row.indicatorBasis,
    unit: row.unit,
    classLabel,
    classKey,
    lowerBound,
    upperBound,
    lowerBoundOpen: !isFirstClass,
    upperBoundInclusive: !isLastClass,
    intervalNotation: intervalNotation({ classIndex, thresholds: row.thresholds }),
    sourceThresholds: row.thresholds,
    intervalRuleSource: INTERVAL_RULE_SOURCE,
    extractionStatus: EXTRACTION_STATUS,
    registryStatus: REGISTRY_STATUS,
    implementationAllowed: true,
    notes:
      "Reviewed numeric class-threshold row. Dataset lookup only; no class-assignment helper is implemented here."
  });
}

function expandThresholdRows() {
  return thresholdTableDefinitions.flatMap((table) =>
    table.rows.flatMap((row) =>
      CLASS_LABELS.map((classLabel, classIndex) =>
        thresholdEntry({
          table,
          row,
          classLabel,
          classKey: CLASS_KEYS[classIndex],
          classIndex
        })
      )
    )
  );
}

function metadataFromTable(table) {
  return Object.freeze({
    sourceTable: table.sourceTable,
    tableNumber: table.tableNumber,
    sourcePage: table.sourcePage,
    sourceModule: table.sourceModule,
    titleRo: table.titleRo,
    purpose: table.purpose,
    buildingCategoryKey: table.buildingCategoryKey,
    buildingCategoryRo: table.buildingCategoryRo,
    lookupKeys: Object.freeze([
      "building category",
      "indicator basis",
      "utility or total",
      "class label"
    ]),
    classLabels: CLASS_LABELS,
    indicatorBasis: Object.freeze(["specific_primary_energy", "specific_co2_emissions"]),
    extractionStatus: EXTRACTION_STATUS,
    registryStatus: REGISTRY_STATUS,
    implementationAllowed: true,
    notes:
      "Numeric threshold values from MC001 pages 397-400 are represented in energyClassThresholds. This registry does not implement certificate or class assignment workflow."
  });
}

export const energyClassThresholds = Object.freeze(expandThresholdRows());

export const energyClassThresholdTableMetadata = Object.freeze(
  thresholdTableDefinitions.map(metadataFromTable)
);

export function listEnergyClassThresholds() {
  return energyClassThresholds;
}

export function listEnergyClassThresholdTableMetadata() {
  return energyClassThresholdTableMetadata;
}

export function findEnergyClassThresholdById(id) {
  return energyClassThresholds.find((entry) => entry.id === id);
}

export function findEnergyClassThresholdsBySourceTable(sourceTable) {
  return Object.freeze(
    energyClassThresholds.filter((entry) => entry.sourceTable === sourceTable)
  );
}

export function findEnergyClassThresholdsByBuildingCategory(buildingCategory) {
  return Object.freeze(
    energyClassThresholds.filter(
      (entry) =>
        entry.buildingCategoryKey === buildingCategory ||
        entry.buildingCategoryRo === buildingCategory
    )
  );
}

export function findEnergyClassThresholdsByIndicatorKey(indicatorKey) {
  return Object.freeze(
    energyClassThresholds.filter(
      (entry) =>
        entry.indicatorKey === indicatorKey ||
        entry.indicatorBasis === indicatorKey
    )
  );
}
