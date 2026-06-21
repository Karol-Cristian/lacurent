const SOURCE_MODULE = "13_final_primary_co2_rer";
const REGISTRY_STATUS = "reviewed_dataset_registry_created";

function descriptor({
  id,
  sourceTable,
  exactTableTitleRo,
  unit,
  lookupKeys,
  factorColumns,
  notes
}) {
  return Object.freeze({
    id,
    sourceTable,
    sourceModule: SOURCE_MODULE,
    exactTableTitleRo,
    unit,
    lookupKeys: Object.freeze([...lookupKeys]),
    factorColumns: Object.freeze([...factorColumns]),
    extractionStatus: "extracted_numeric_values",
    registryStatus: REGISTRY_STATUS,
    implementationAllowed: true,
    notes
  });
}

function primaryEntry({
  energyCarrierKey,
  energyCarrierRo,
  renewablePrimaryEnergyFactor,
  nonRenewablePrimaryEnergyFactor,
  totalPrimaryEnergyFactor,
  notes = ""
}) {
  return Object.freeze({
    id: `${energyCarrierKey}_primary_energy_factors`,
    energyCarrierRo,
    energyCarrierKey,
    renewablePrimaryEnergyFactor,
    nonRenewablePrimaryEnergyFactor,
    totalPrimaryEnergyFactor,
    unit: "kWh primary/kWh final",
    sourceTable: "MC001-2022 Tabel 5.17",
    sourceModule: SOURCE_MODULE,
    notes
  });
}

function co2Entry({
  energyCarrierKey,
  energyCarrierRo,
  co2EmissionFactor,
  notes = ""
}) {
  return Object.freeze({
    id: `${energyCarrierKey}_co2_emission_factor`,
    energyCarrierRo,
    energyCarrierKey,
    co2EmissionFactor,
    unit: "kgCO2/kWh",
    sourceTable: "MC001-2022 Tabel 5.18",
    sourceModule: SOURCE_MODULE,
    notes
  });
}

export const factorTableMetadata = Object.freeze([
  descriptor({
    id: "mc001_tabel_5_17_primary_energy_factors",
    sourceTable: "MC001-2022 Tabel 5.17",
    exactTableTitleRo: "Factori de conversie din energie finala in energie primara",
    unit: "dimensionless conversion factor, equivalent to kWh primary/kWh final",
    lookupKeys: [
      "Combustibil/Sursa de energie",
      "delivered/exported applicability where relevant"
    ],
    factorColumns: ["fPnren", "fPren", "fPtot"],
    notes: "Numeric values are available in the reviewed dataset registry."
  }),
  descriptor({
    id: "mc001_tabel_5_18_co2_emission_factors",
    sourceTable: "MC001-2022 Tabel 5.18",
    exactTableTitleRo: "Factori de conversie a energiei primare in emisii echivalente de CO2",
    unit: "kgCO2/kWh",
    lookupKeys: ["Combustibil/Sursa de energie"],
    factorColumns: ["fCO2 [kg CO2/kWh]"],
    notes: "Numeric values are available in the reviewed dataset registry."
  })
]);

export const primaryEnergyFactors = Object.freeze([
  primaryEntry({
    energyCarrierKey: "lignit",
    energyCarrierRo: "lignit",
    nonRenewablePrimaryEnergyFactor: 1.3,
    renewablePrimaryEnergyFactor: 0,
    totalPrimaryEnergyFactor: 1.3
  }),
  primaryEntry({
    energyCarrierKey: "huila",
    energyCarrierRo: "huila",
    nonRenewablePrimaryEnergyFactor: 1.2,
    renewablePrimaryEnergyFactor: 0,
    totalPrimaryEnergyFactor: 1.2
  }),
  primaryEntry({
    energyCarrierKey: "pacura",
    energyCarrierRo: "pacura",
    nonRenewablePrimaryEnergyFactor: 1.1,
    renewablePrimaryEnergyFactor: 0,
    totalPrimaryEnergyFactor: 1.1
  }),
  primaryEntry({
    energyCarrierKey: "motorina",
    energyCarrierRo: "motorina",
    nonRenewablePrimaryEnergyFactor: 1.23,
    renewablePrimaryEnergyFactor: 0,
    totalPrimaryEnergyFactor: 1.23
  }),
  primaryEntry({
    energyCarrierKey: "gaz_natural",
    energyCarrierRo: "gaz natural",
    nonRenewablePrimaryEnergyFactor: 1.17,
    renewablePrimaryEnergyFactor: 0,
    totalPrimaryEnergyFactor: 1.17
  }),
  primaryEntry({
    energyCarrierKey: "gnl_gaz_natural_lichid",
    energyCarrierRo: "GNL / gaz natural lichid",
    nonRenewablePrimaryEnergyFactor: 1.17,
    renewablePrimaryEnergyFactor: 0,
    totalPrimaryEnergyFactor: 1.17
  }),
  primaryEntry({
    energyCarrierKey: "gpl",
    energyCarrierRo: "GPL",
    nonRenewablePrimaryEnergyFactor: 1.15,
    renewablePrimaryEnergyFactor: 0,
    totalPrimaryEnergyFactor: 1.15
  }),
  primaryEntry({
    energyCarrierKey: "deseuri",
    energyCarrierRo: "deseuri",
    nonRenewablePrimaryEnergyFactor: 0.05,
    renewablePrimaryEnergyFactor: 1,
    totalPrimaryEnergyFactor: 1.05
  }),
  primaryEntry({
    energyCarrierKey: "lemne_foc_fara_certificare_biomasa",
    energyCarrierRo: "lemne de foc fara certificare biomasa",
    nonRenewablePrimaryEnergyFactor: 1.2,
    renewablePrimaryEnergyFactor: 0,
    totalPrimaryEnergyFactor: 1.2
  }),
  primaryEntry({
    energyCarrierKey: "biomasa_lemne_foc",
    energyCarrierRo: "biomasa - lemne de foc",
    nonRenewablePrimaryEnergyFactor: 0.18,
    renewablePrimaryEnergyFactor: 0.9,
    totalPrimaryEnergyFactor: 1.08
  }),
  primaryEntry({
    energyCarrierKey: "biomasa_brichete_peleti",
    energyCarrierRo: "biomasa - brichete/peleti",
    nonRenewablePrimaryEnergyFactor: 0.28,
    renewablePrimaryEnergyFactor: 0.8,
    totalPrimaryEnergyFactor: 1.08
  }),
  primaryEntry({
    energyCarrierKey: "biogaz",
    energyCarrierRo: "biogaz",
    nonRenewablePrimaryEnergyFactor: 0.4,
    renewablePrimaryEnergyFactor: 1,
    totalPrimaryEnergyFactor: 1.4
  }),
  primaryEntry({
    energyCarrierKey: "biocombustibil_lichid",
    energyCarrierRo: "biocombustibil lichid",
    nonRenewablePrimaryEnergyFactor: 0.5,
    renewablePrimaryEnergyFactor: 1,
    totalPrimaryEnergyFactor: 1.5
  }),
  primaryEntry({
    energyCarrierKey: "termoficare_cogenerare_distanta",
    energyCarrierRo: "termoficare/cogenerare la distanta",
    nonRenewablePrimaryEnergyFactor: 0.92,
    renewablePrimaryEnergyFactor: 0,
    totalPrimaryEnergyFactor: 0.92
  }),
  primaryEntry({
    energyCarrierKey: "energie_termica_panouri_solare_termice",
    energyCarrierRo: "energie termica din panouri solare termice",
    nonRenewablePrimaryEnergyFactor: 0,
    renewablePrimaryEnergyFactor: 1,
    totalPrimaryEnergyFactor: 1
  }),
  primaryEntry({
    energyCarrierKey: "energie_termica_mediu",
    energyCarrierRo: "energie termica din mediu",
    nonRenewablePrimaryEnergyFactor: 0,
    renewablePrimaryEnergyFactor: 1,
    totalPrimaryEnergyFactor: 1
  }),
  primaryEntry({
    energyCarrierKey: "electricitate_sen_consumata",
    energyCarrierRo: "electricitate SEN consumata",
    nonRenewablePrimaryEnergyFactor: 2,
    renewablePrimaryEnergyFactor: 0.5,
    totalPrimaryEnergyFactor: 2.5
  }),
  primaryEntry({
    energyCarrierKey: "electricitate_pv_eolian_onsite_nearby_consumata_direct",
    energyCarrierRo: "electricitate PV/eolian onsite/nearby consumata direct",
    nonRenewablePrimaryEnergyFactor: 0,
    renewablePrimaryEnergyFactor: 1,
    totalPrimaryEnergyFactor: 1
  }),
  primaryEntry({
    energyCarrierKey: "electricitate_pv_eolian_onsite_nearby_exportata_sen",
    energyCarrierRo: "electricitate PV/eolian onsite/nearby exportata in SEN",
    nonRenewablePrimaryEnergyFactor: 2,
    renewablePrimaryEnergyFactor: 0.5,
    totalPrimaryEnergyFactor: 2.5
  })
]);

export const co2EmissionFactors = Object.freeze([
  co2Entry({
    energyCarrierKey: "lignit",
    energyCarrierRo: "lignit",
    co2EmissionFactor: 0.365
  }),
  co2Entry({
    energyCarrierKey: "huila",
    energyCarrierRo: "huila",
    co2EmissionFactor: 0.348
  }),
  co2Entry({
    energyCarrierKey: "antracit",
    energyCarrierRo: "antracit",
    co2EmissionFactor: 0.356
  }),
  co2Entry({
    energyCarrierKey: "turba",
    energyCarrierRo: "turba",
    co2EmissionFactor: 0.383
  }),
  co2Entry({
    energyCarrierKey: "pacura",
    energyCarrierRo: "pacura",
    co2EmissionFactor: 0.268
  }),
  co2Entry({
    energyCarrierKey: "motorina",
    energyCarrierRo: "motorina",
    co2EmissionFactor: 0.263
  }),
  co2Entry({
    energyCarrierKey: "gaz_natural",
    energyCarrierRo: "gaz natural",
    co2EmissionFactor: 0.202
  }),
  co2Entry({
    energyCarrierKey: "gnl_gaz_natural_lichid",
    energyCarrierRo: "GNL / gaz natural lichid",
    co2EmissionFactor: 0.232
  }),
  co2Entry({
    energyCarrierKey: "gpl",
    energyCarrierRo: "GPL",
    co2EmissionFactor: 0.227
  }),
  co2Entry({
    energyCarrierKey: "electricitate_sen_consumata",
    energyCarrierRo: "electricitate SEN consumata",
    co2EmissionFactor: 0.107
  }),
  co2Entry({
    energyCarrierKey: "termoficare_cogenerare_distanta",
    energyCarrierRo: "termoficare/cogenerare la distanta",
    co2EmissionFactor: 0.22
  }),
  co2Entry({
    energyCarrierKey: "lemne_foc_fara_certificare_biomasa",
    energyCarrierRo: "lemne de foc fara certificare biomasa",
    co2EmissionFactor: 0.39
  }),
  co2Entry({
    energyCarrierKey: "biomasa_lemne_foc",
    energyCarrierRo: "biomasa - lemne de foc",
    co2EmissionFactor: 0.019
  }),
  co2Entry({
    energyCarrierKey: "biomasa_deseuri_lemnoase_rumegus",
    energyCarrierRo: "biomasa - deseuri lemnoase/rumegus",
    co2EmissionFactor: 0.016
  }),
  co2Entry({
    energyCarrierKey: "biomasa_brichete_peleti",
    energyCarrierRo: "biomasa - brichete/peleti",
    co2EmissionFactor: 0.039
  }),
  co2Entry({
    energyCarrierKey: "biomasa_deseuri_agricole",
    energyCarrierRo: "biomasa - deseuri agricole",
    co2EmissionFactor: 0.016
  }),
  co2Entry({
    energyCarrierKey: "biogaz",
    energyCarrierRo: "biogaz",
    co2EmissionFactor: 0
  }),
  co2Entry({
    energyCarrierKey: "energie_solara",
    energyCarrierRo: "energie solara",
    co2EmissionFactor: 0
  }),
  co2Entry({
    energyCarrierKey: "energie_eoliana",
    energyCarrierRo: "energie eoliana",
    co2EmissionFactor: 0
  }),
  co2Entry({
    energyCarrierKey: "energie_geotermala_aerotermala_acvatermala",
    energyCarrierRo: "energie geotermala/aerotermala/acvatermala",
    co2EmissionFactor: 0
  })
]);

export function listPrimaryEnergyFactors() {
  return primaryEnergyFactors;
}

export function listCO2EmissionFactors() {
  return co2EmissionFactors;
}

export function listEnergyCarrierKeys() {
  return Object.freeze(
    [...new Set([
      ...primaryEnergyFactors.map((entry) => entry.energyCarrierKey),
      ...co2EmissionFactors.map((entry) => entry.energyCarrierKey)
    ])].sort()
  );
}

export function findPrimaryEnergyFactorByCarrierKey(energyCarrierKey) {
  return primaryEnergyFactors.find((entry) => entry.energyCarrierKey === energyCarrierKey);
}

export function findCO2EmissionFactorByCarrierKey(energyCarrierKey) {
  return co2EmissionFactors.find((entry) => entry.energyCarrierKey === energyCarrierKey);
}

export function findEnergyFactorBundleByCarrierKey(energyCarrierKey) {
  const primaryEnergyFactor = findPrimaryEnergyFactorByCarrierKey(energyCarrierKey) ?? null;
  const co2EmissionFactor = findCO2EmissionFactorByCarrierKey(energyCarrierKey) ?? null;

  if (!primaryEnergyFactor && !co2EmissionFactor) {
    return undefined;
  }

  return Object.freeze({
    energyCarrierKey,
    primaryEnergyFactor,
    co2EmissionFactor
  });
}
