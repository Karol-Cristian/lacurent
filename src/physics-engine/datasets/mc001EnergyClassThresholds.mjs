const SOURCE_MODULE = "15_energy_classes_and_certificate";
const REGISTRY_STATUS = "metadata_registry_created_values_missing";

function tableMetadata({
  sourceTable,
  titleRo,
  purpose,
  lookupKeys,
  notes = ""
}) {
  return Object.freeze({
    sourceTable,
    sourceModule: SOURCE_MODULE,
    titleRo,
    purpose,
    lookupKeys: Object.freeze([...lookupKeys]),
    extractionStatus: "indexed_table",
    registryStatus: REGISTRY_STATUS,
    implementationAllowed: false,
    notes
  });
}

export const energyClassThresholdTableMetadata = Object.freeze([
  tableMetadata({
    sourceTable: "MC001-2022 Tabel 5.7",
    titleRo: "Clase energetice si de mediu pentru cladiri de locuit individuale",
    purpose: "Energy and environmental class thresholds for individual residential buildings.",
    lookupKeys: ["building category", "indicator type", "utility or total", "class boundary"],
    notes: "Module 15 identifies this table, but does not copy numeric threshold values."
  }),
  tableMetadata({
    sourceTable: "MC001-2022 Tabel 5.8",
    titleRo: "Clase energetice si de mediu pentru cladiri de locuit colective",
    purpose: "Energy and environmental class thresholds for collective residential buildings.",
    lookupKeys: ["building category", "indicator type", "utility or total", "class boundary"],
    notes: "Module 15 identifies this table, but does not copy numeric threshold values."
  }),
  tableMetadata({
    sourceTable: "MC001-2022 Tabel 5.9",
    titleRo: "Clase energetice si de mediu pentru cladiri de birouri",
    purpose: "Energy and environmental class thresholds for office buildings.",
    lookupKeys: ["building category", "indicator type", "utility or total", "class boundary"],
    notes: "Module 15 identifies this table, but does not copy numeric threshold values."
  }),
  tableMetadata({
    sourceTable: "MC001-2022 Tabel 5.10",
    titleRo: "Clase energetice si de mediu pentru cladiri destinate invatamantului",
    purpose: "Energy and environmental class thresholds for education buildings.",
    lookupKeys: ["building category", "indicator type", "utility or total", "class boundary"],
    notes: "Module 15 identifies this table, but does not copy numeric threshold values."
  }),
  tableMetadata({
    sourceTable: "MC001-2022 Tabel 5.11",
    titleRo: "Clase energetice si de mediu pentru cladiri destinate sistemului sanitar",
    purpose: "Energy and environmental class thresholds for healthcare buildings.",
    lookupKeys: ["building category", "indicator type", "utility or total", "class boundary"],
    notes: "Module 15 identifies this table, but does not copy numeric threshold values."
  }),
  tableMetadata({
    sourceTable: "MC001-2022 Tabel 5.12",
    titleRo: "Clase energetice si de mediu pentru cladiri cu servicii de comert",
    purpose: "Energy and environmental class thresholds for commerce/service buildings.",
    lookupKeys: ["building category", "indicator type", "utility or total", "class boundary"],
    notes: "Module 15 identifies this table, but does not copy numeric threshold values."
  }),
  tableMetadata({
    sourceTable: "MC001-2022 Tabel 5.13",
    titleRo: "Clase energetice si de mediu pentru cladiri pentru turism",
    purpose: "Energy and environmental class thresholds for tourism buildings.",
    lookupKeys: ["building category", "indicator type", "utility or total", "class boundary"],
    notes: "Module 15 identifies this table, but does not copy numeric threshold values."
  }),
  tableMetadata({
    sourceTable: "MC001-2022 Tabel 5.14",
    titleRo: "Clase energetice si de mediu pentru cladiri pentru activitati sportive",
    purpose: "Energy and environmental class thresholds for sports buildings.",
    lookupKeys: ["building category", "indicator type", "utility or total", "class boundary"],
    notes: "Module 15 identifies this table, but does not copy numeric threshold values."
  })
]);

export const energyClassThresholds = Object.freeze([]);

export function listEnergyClassThresholds() {
  return energyClassThresholds;
}

export function listEnergyClassThresholdTableMetadata() {
  return energyClassThresholdTableMetadata;
}

export function findEnergyClassThresholdById(id) {
  void id;
  return undefined;
}

export function findEnergyClassThresholdsBySourceTable(sourceTable) {
  void sourceTable;
  return Object.freeze([]);
}

export function findEnergyClassThresholdsByBuildingCategory(buildingCategoryRo) {
  void buildingCategoryRo;
  return Object.freeze([]);
}

export function findEnergyClassThresholdsByIndicatorKey(indicatorKey) {
  void indicatorKey;
  return Object.freeze([]);
}
