const SOURCE_TABLE = "MC001-2022 Tabel 3.3.1";
const SOURCE_MODULE = "09_dhw_systems";
const REGISTRY_STATUS = "metadata_registry_created_values_missing";

export const dhwDemandTable3_3_1Metadata = Object.freeze({
  id: "mc001_tabel_3_3_1_dhw_demand_by_building_use",
  sourceTable: SOURCE_TABLE,
  sourceModule: SOURCE_MODULE,
  titleRo: "Valorile necesarului specific de apa calda de consum pentru diferite destinatii de cladiri",
  unit: "l/unitate,zi la 60 degC",
  lookupKeys: Object.freeze(["building destination/use category"]),
  neededFor: "MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL",
  extractionStatus: "indexed_table",
  registryStatus: REGISTRY_STATUS,
  implementationAllowed: false,
  notes:
    "Module 09 identifies Tabel 3.3.1 and its lookup purpose, but does not copy numeric demand values."
});

export const dhwDemandTable3_3_1 = Object.freeze([]);

export function listDhwDemandTable3_3_1() {
  return dhwDemandTable3_3_1;
}

export function findDhwDemandEntryById(id) {
  void id;
  return undefined;
}

export function findDhwDemandEntriesByBuildingDestination(buildingDestinationRo) {
  void buildingDestinationRo;
  return Object.freeze([]);
}

export function findDhwDemandEntriesByUseCategory(useCategoryRo) {
  void useCategoryRo;
  return Object.freeze([]);
}
