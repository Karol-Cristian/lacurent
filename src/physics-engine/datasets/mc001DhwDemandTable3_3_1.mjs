const SOURCE_TABLE = "MC001-2022 Tabel 3.3.1";
const SOURCE_MODULE = "09_dhw_systems";
const REGISTRY_STATUS = "reviewed_numeric_values_extracted";
const UNIT = "l/unitate,zi la 60 degC";

function normalizeLookup(value) {
  return String(value ?? "").trim().toLowerCase();
}

function entry({
  id,
  sourcePdfPages,
  sourceRowNumber,
  buildingDestinationRo,
  useCategoryRo,
  unitBasisRo,
  specificDhwDemandLPerUnitDayAt60C,
  notes = ""
}) {
  return Object.freeze({
    id,
    sourceTable: SOURCE_TABLE,
    sourceModule: SOURCE_MODULE,
    sourcePdfPages: Object.freeze([...sourcePdfPages]),
    sourceRowNumber,
    buildingDestinationRo,
    useCategoryRo,
    unitBasisRo,
    specificDhwDemandLPerUnitDayAt60C,
    unit: UNIT,
    extractionStatus: "extracted_numeric_value",
    registryStatus: REGISTRY_STATUS,
    implementationAllowed: true,
    notes
  });
}

function blockedRow({ id, sourcePdfPages, sourceRowNumber, buildingDestinationRo, reason }) {
  return Object.freeze({
    id,
    sourceTable: SOURCE_TABLE,
    sourceModule: SOURCE_MODULE,
    sourcePdfPages: Object.freeze([...sourcePdfPages]),
    sourceRowNumber,
    buildingDestinationRo,
    extractionStatus: "non_numeric_formula_reference",
    implementationAllowed: false,
    reason
  });
}

export const dhwDemandTable3_3_1Metadata = Object.freeze({
  id: "mc001_tabel_3_3_1_dhw_demand_by_building_use",
  sourceTable: SOURCE_TABLE,
  sourceModule: SOURCE_MODULE,
  titleRo: "Valorile pentru necesarul specific de apa calda de consum, in functie de destinatia cladirii",
  unit: UNIT,
  lookupKeys: Object.freeze([
    "building destination/use category",
    "unit basis for the listed destination"
  ]),
  neededFor: "MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL",
  extractionStatus: "extracted_numeric_values",
  registryStatus: REGISTRY_STATUS,
  implementationAllowed: true,
  sourcePdfPages: Object.freeze([256, 257]),
  notes:
    "Numeric Tabel 3.3.1 values are extracted for non-residential/use-category rows. Residential rows 1-2 remain formula references to chapter 3.3.6.1, not numeric table values."
});

export const dhwDemandTable3_3_1 = Object.freeze([
  entry({
    id: "birouri_functionar_schimb",
    sourcePdfPages: [256],
    sourceRowNumber: 3,
    buildingDestinationRo: "Birouri",
    useCategoryRo: "functionar pe schimb",
    unitBasisRo: "pentru un functionar pe schimb",
    specificDhwDemandLPerUnitDayAt60C: 5
  }),
  entry({
    id: "cluburi_case_cultura_teatre_actori",
    sourcePdfPages: [256],
    sourceRowNumber: 4,
    buildingDestinationRo: "Cluburi, case de cultura si teatre",
    useCategoryRo: "actori",
    unitBasisRo: "pentru o persoana pe zi",
    specificDhwDemandLPerUnitDayAt60C: 15
  }),
  entry({
    id: "cluburi_case_cultura_teatre_spectatori_vizitatori",
    sourcePdfPages: [256],
    sourceRowNumber: 4,
    buildingDestinationRo: "Cluburi, case de cultura si teatre",
    useCategoryRo: "spectatori, vizitatori",
    unitBasisRo: "pentru 1 m2 suprafata utila",
    specificDhwDemandLPerUnitDayAt60C: 0.03
  }),
  entry({
    id: "spatii_comerciale_m2_suprafata_utila",
    sourcePdfPages: [256],
    sourceRowNumber: 5,
    buildingDestinationRo: "Spatii comerciale, centre comerciale, magazine",
    useCategoryRo: "suprafata utila",
    unitBasisRo: "pentru 1 m2 suprafata utila",
    specificDhwDemandLPerUnitDayAt60C: 0.03
  }),
  entry({
    id: "cantine_restaurante_catering_2_mese",
    sourcePdfPages: [256],
    sourceRowNumber: 6,
    buildingDestinationRo: "Cantine, restaurante, bufete",
    useCategoryRo: "catering, 2 mese pe zi",
    unitBasisRo: "catering, 2 mese pe zi",
    specificDhwDemandLPerUnitDayAt60C: 21
  }),
  entry({
    id: "cantine_restaurante_catering_2_mese_autoservire_bufet",
    sourcePdfPages: [256],
    sourceRowNumber: 6,
    buildingDestinationRo: "Cantine, restaurante, bufete",
    useCategoryRo: "catering, 2 mese pe zi, autoservire, tip bufet",
    unitBasisRo: "catering, 2 mese pe zi, autoservire, tip bufet",
    specificDhwDemandLPerUnitDayAt60C: 8
  }),
  entry({
    id: "cantine_restaurante_catering_1_masa",
    sourcePdfPages: [256],
    sourceRowNumber: 6,
    buildingDestinationRo: "Cantine, restaurante, bufete",
    useCategoryRo: "catering, 1 masa pe zi",
    unitBasisRo: "catering, 1 masa pe zi",
    specificDhwDemandLPerUnitDayAt60C: 10
  }),
  entry({
    id: "cantine_restaurante_catering_1_masa_autoservire_bufet",
    sourcePdfPages: [256],
    sourceRowNumber: 6,
    buildingDestinationRo: "Cantine, restaurante, bufete",
    useCategoryRo: "catering, 1 masa pe zi, autoservire, tip bufet",
    unitBasisRo: "catering, 1 masa pe zi, autoservire, tip bufet",
    specificDhwDemandLPerUnitDayAt60C: 4
  }),
  entry({
    id: "cantine_restaurante_o_persoana_o_masa_pranz",
    sourcePdfPages: [256],
    sourceRowNumber: 6,
    buildingDestinationRo: "Cantine, restaurante, bufete",
    useCategoryRo: "cantine si restaurante, o masa la pranz pe zi",
    unitBasisRo: "pentru o persoana, o masa la pranz pe zi",
    specificDhwDemandLPerUnitDayAt60C: 10
  }),
  entry({
    id: "cantine_restaurante_o_persoana_trei_mese",
    sourcePdfPages: [256],
    sourceRowNumber: 6,
    buildingDestinationRo: "Cantine, restaurante, bufete",
    useCategoryRo: "cantine si restaurante, trei mese pe zi",
    unitBasisRo: "pentru o persoana, trei mese pe zi",
    specificDhwDemandLPerUnitDayAt60C: 30
  }),
  entry({
    id: "cazare_elevi_studenti_varstnici_grupuri_sanitare_comune",
    sourcePdfPages: [256],
    sourceRowNumber: 7,
    buildingDestinationRo: "Cladiri pentru cazare elevi, studenti, persoane in varsta",
    useCategoryRo: "obiecte sanitare in grupuri sanitare comune",
    unitBasisRo: "pentru un ocupant pe zi",
    specificDhwDemandLPerUnitDayAt60C: 30
  }),
  entry({
    id: "cazare_elevi_studenti_varstnici_lavoare_in_camere",
    sourcePdfPages: [256],
    sourceRowNumber: 7,
    buildingDestinationRo: "Cladiri pentru cazare elevi, studenti, persoane in varsta",
    useCategoryRo: "lavoare in camere",
    unitBasisRo: "pentru un ocupant pe zi",
    specificDhwDemandLPerUnitDayAt60C: 40
  }),
  entry({
    id: "cazare_elevi_studenti_varstnici_grup_sanitar_camera",
    sourcePdfPages: [256],
    sourceRowNumber: 7,
    buildingDestinationRo: "Cladiri pentru cazare elevi, studenti, persoane in varsta",
    useCategoryRo: "grupuri sanitare pentru fiecare camera",
    unitBasisRo: "pentru un ocupant pe zi",
    specificDhwDemandLPerUnitDayAt60C: 50
  }),
  entry({
    id: "cazare_elevi_studenti_varstnici_dotare_superioara",
    sourcePdfPages: [256],
    sourceRowNumber: 7,
    buildingDestinationRo: "Cladiri pentru cazare elevi, studenti, persoane in varsta",
    useCategoryRo: "nivel de dotare superior",
    unitBasisRo: "pentru un ocupant pe zi",
    specificDhwDemandLPerUnitDayAt60C: 80,
    notes: "Source examples include sauna and jacuzzi."
  }),
  entry({
    id: "copii_crese_gradinite_program_redus",
    sourcePdfPages: [256],
    sourceRowNumber: 8,
    buildingDestinationRo: "Cladiri pentru copii",
    useCategoryRo: "crese, gradinite cu program redus",
    unitBasisRo: "crese, gradinite cu program redus",
    specificDhwDemandLPerUnitDayAt60C: 8
  }),
  entry({
    id: "copii_crese_gradinite_program_prelungit_fara_cazare",
    sourcePdfPages: [256],
    sourceRowNumber: 8,
    buildingDestinationRo: "Cladiri pentru copii",
    useCategoryRo: "crese, gradinite cu program prelungit fara cazare",
    unitBasisRo: "crese, gradinite cu program prelungit fara cazare",
    specificDhwDemandLPerUnitDayAt60C: 10
  }),
  entry({
    id: "copii_crese_gradinite_cu_cazare",
    sourcePdfPages: [256],
    sourceRowNumber: 8,
    buildingDestinationRo: "Cladiri pentru copii",
    useCategoryRo: "crese, gradinite cu cazare",
    unitBasisRo: "crese, gradinite cu cazare",
    specificDhwDemandLPerUnitDayAt60C: 40
  }),
  entry({
    id: "hoteluri_pensiuni_hostel_studenti",
    sourcePdfPages: [256],
    sourceRowNumber: 9,
    buildingDestinationRo: "Hoteluri si pensiuni",
    useCategoryRo: "hostel pentru studenti",
    unitBasisRo: "pentru un loc cazare",
    specificDhwDemandLPerUnitDayAt60C: 40
  }),
  entry({
    id: "hoteluri_pensiuni_hotel_1_stea_fara_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 9,
    buildingDestinationRo: "Hoteluri si pensiuni",
    useCategoryRo: "hotel, 1-stea, fara spalatorie",
    unitBasisRo: "pentru un loc cazare",
    specificDhwDemandLPerUnitDayAt60C: 56
  }),
  entry({
    id: "hoteluri_pensiuni_hotel_1_stea_cu_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 9,
    buildingDestinationRo: "Hoteluri si pensiuni",
    useCategoryRo: "hotel, 1-stea, cu spalatorie",
    unitBasisRo: "pentru un loc cazare",
    specificDhwDemandLPerUnitDayAt60C: 70
  }),
  entry({
    id: "hoteluri_pensiuni_hotel_2_stele_fara_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 9,
    buildingDestinationRo: "Hoteluri si pensiuni",
    useCategoryRo: "hotel, 2-stele, fara spalatorie",
    unitBasisRo: "pentru un loc cazare",
    specificDhwDemandLPerUnitDayAt60C: 76
  }),
  entry({
    id: "hoteluri_pensiuni_hotel_2_stele_cu_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 9,
    buildingDestinationRo: "Hoteluri si pensiuni",
    useCategoryRo: "hotel, 2-stele, cu spalatorie",
    unitBasisRo: "pentru un loc cazare",
    specificDhwDemandLPerUnitDayAt60C: 90
  }),
  entry({
    id: "hoteluri_pensiuni_hotel_3_stele_fara_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 9,
    buildingDestinationRo: "Hoteluri si pensiuni",
    useCategoryRo: "hotel, 3-stele, fara spalatorie",
    unitBasisRo: "pentru un loc cazare",
    specificDhwDemandLPerUnitDayAt60C: 97
  }),
  entry({
    id: "hoteluri_pensiuni_hotel_3_stele_cu_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 9,
    buildingDestinationRo: "Hoteluri si pensiuni",
    useCategoryRo: "hotel, 3-stele, cu spalatorie",
    unitBasisRo: "pentru un loc cazare",
    specificDhwDemandLPerUnitDayAt60C: 111
  }),
  entry({
    id: "hoteluri_pensiuni_hotel_4_stele_fara_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 9,
    buildingDestinationRo: "Hoteluri si pensiuni",
    useCategoryRo: "hotel, 4-stele, fara spalatorie",
    unitBasisRo: "pentru un loc cazare",
    specificDhwDemandLPerUnitDayAt60C: 118
  }),
  entry({
    id: "hoteluri_pensiuni_hotel_4_stele_cu_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 9,
    buildingDestinationRo: "Hoteluri si pensiuni",
    useCategoryRo: "hotel, 4-stele, cu spalatorie",
    unitBasisRo: "pentru un loc cazare",
    specificDhwDemandLPerUnitDayAt60C: 132
  }),
  entry({
    id: "dispensare_policlinici_bolnav",
    sourcePdfPages: [256],
    sourceRowNumber: 10,
    buildingDestinationRo: "Dispensare, policlinici",
    useCategoryRo: "bolnav",
    unitBasisRo: "pentru un bolnav pe zi",
    specificDhwDemandLPerUnitDayAt60C: 3
  }),
  entry({
    id: "sanatate_tratament_ambulatoriu_fara_cazare",
    sourcePdfPages: [256],
    sourceRowNumber: 11,
    buildingDestinationRo: "Cladire sanatate",
    useCategoryRo: "tratament ambulatoriu fara cazare",
    unitBasisRo: "pentru un pacient, pentru o zi",
    specificDhwDemandLPerUnitDayAt60C: 10
  }),
  entry({
    id: "sanatate_tratament_cu_cazare_fara_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 11,
    buildingDestinationRo: "Cladire sanatate",
    useCategoryRo: "tratament cu cazare, fara spalatorie",
    unitBasisRo: "pentru un pacient, pentru o zi",
    specificDhwDemandLPerUnitDayAt60C: 56
  }),
  entry({
    id: "sanatate_tratament_cu_cazare_cu_spalatorie",
    sourcePdfPages: [256],
    sourceRowNumber: 11,
    buildingDestinationRo: "Cladire sanatate",
    useCategoryRo: "tratament cu cazare, cu spalatorie",
    unitBasisRo: "pentru un pacient, pentru o zi",
    specificDhwDemandLPerUnitDayAt60C: 88
  }),
  entry({
    id: "sanatorii_centre_recuperare_cazi_dusuri_grupuri_sanitare",
    sourcePdfPages: [256],
    sourceRowNumber: 12,
    buildingDestinationRo: "Sanatorii, centre recuperare",
    useCategoryRo: "cazi de baie si dusuri in grupuri sanitare",
    unitBasisRo: "pentru un pacient pe zi",
    specificDhwDemandLPerUnitDayAt60C: 115
  }),
  entry({
    id: "sanatorii_centre_recuperare_cazi_camera_bolnavi",
    sourcePdfPages: [256],
    sourceRowNumber: 12,
    buildingDestinationRo: "Sanatorii, centre recuperare",
    useCategoryRo: "cazi de baie pentru fiecare camera, pentru bolnavi",
    unitBasisRo: "pentru un pacient pe zi",
    specificDhwDemandLPerUnitDayAt60C: 165
  }),
  entry({
    id: "sanatorii_centre_recuperare_cazi_camera_tratamente_balneologice",
    sourcePdfPages: [256],
    sourceRowNumber: 12,
    buildingDestinationRo: "Sanatorii, centre recuperare",
    useCategoryRo: "cazi de baie pentru fiecare camera, pentru tratamente balneologice",
    unitBasisRo: "pentru un pacient pe zi",
    specificDhwDemandLPerUnitDayAt60C: 225
  }),
  entry({
    id: "scoli_elev_program_fara_dusuri_bai",
    sourcePdfPages: [257],
    sourceRowNumber: 13,
    buildingDestinationRo: "Scoli",
    useCategoryRo: "fara dusuri sau bai",
    unitBasisRo: "pentru un elev pe program",
    specificDhwDemandLPerUnitDayAt60C: 5
  }),
  entry({
    id: "sport_elevi_fara_dusuri_utilizator",
    sourcePdfPages: [257],
    sourceRowNumber: 14,
    buildingDestinationRo: "Cladire de sport pentru elevi",
    useCategoryRo: "fara dusuri in grupurile sanitare",
    unitBasisRo: "pentru un utilizator",
    specificDhwDemandLPerUnitDayAt60C: 5
  }),
  entry({
    id: "sport_elevi_cu_dusuri_dus_instalat",
    sourcePdfPages: [257],
    sourceRowNumber: 14,
    buildingDestinationRo: "Cladire de sport pentru elevi",
    useCategoryRo: "cu dusuri in grupurile sanitare",
    unitBasisRo: "pentru un dus instalat",
    specificDhwDemandLPerUnitDayAt60C: 101
  }),
  entry({
    id: "terenuri_sport_stadioane_spectatori_m2",
    sourcePdfPages: [257],
    sourceRowNumber: 15,
    buildingDestinationRo: "Grupuri sanitare pentru terenuri de sport, stadioane",
    useCategoryRo: "spectatori",
    unitBasisRo: "pentru 1 m2 suprafata utila",
    specificDhwDemandLPerUnitDayAt60C: 0.03
  }),
  entry({
    id: "terenuri_sport_stadioane_sportiv",
    sourcePdfPages: [257],
    sourceRowNumber: 15,
    buildingDestinationRo: "Grupuri sanitare pentru terenuri de sport, stadioane",
    useCategoryRo: "sportiv",
    unitBasisRo: "pentru un sportiv",
    specificDhwDemandLPerUnitDayAt60C: 20
  }),
  entry({
    id: "transport_gari_aeroporturi_m2",
    sourcePdfPages: [257],
    sourceRowNumber: 16,
    buildingDestinationRo: "Cladiri pentru transport: gari, aeroporturi",
    useCategoryRo: "suprafata utila",
    unitBasisRo: "pentru 1 m2 suprafata utila",
    specificDhwDemandLPerUnitDayAt60C: 0.03
  }),
  entry({
    id: "spalatorii_spalare_semimecanizata",
    sourcePdfPages: [257],
    sourceRowNumber: 17,
    buildingDestinationRo: "Spalatorii",
    useCategoryRo: "spalare semimecanizata",
    unitBasisRo: "pentru un kilogram de rufe uscate",
    specificDhwDemandLPerUnitDayAt60C: 25
  }),
  entry({
    id: "spalatorii_spalare_mecanizata",
    sourcePdfPages: [257],
    sourceRowNumber: 17,
    buildingDestinationRo: "Spalatorii",
    useCategoryRo: "spalare mecanizata",
    unitBasisRo: "pentru un kilogram de rufe uscate",
    specificDhwDemandLPerUnitDayAt60C: 30
  }),
  entry({
    id: "industriale_grupa_i",
    sourcePdfPages: [257],
    sourceRowNumber: 18,
    buildingDestinationRo: "Cladiri industriale",
    useCategoryRo: "procese tehnologice grupa I",
    unitBasisRo: "pentru un muncitor pe schimb, consum menajer personal, igiena",
    specificDhwDemandLPerUnitDayAt60C: 20
  }),
  entry({
    id: "industriale_grupa_ii",
    sourcePdfPages: [257],
    sourceRowNumber: 18,
    buildingDestinationRo: "Cladiri industriale",
    useCategoryRo: "procese tehnologice grupa II",
    unitBasisRo: "pentru un muncitor pe schimb, consum menajer personal, igiena",
    specificDhwDemandLPerUnitDayAt60C: 25
  }),
  entry({
    id: "industriale_grupa_iii_a",
    sourcePdfPages: [257],
    sourceRowNumber: 18,
    buildingDestinationRo: "Cladiri industriale",
    useCategoryRo: "procese tehnologice grupa III a",
    unitBasisRo: "pentru un muncitor pe schimb, consum menajer personal, igiena",
    specificDhwDemandLPerUnitDayAt60C: 25
  }),
  entry({
    id: "industriale_grupa_iii_b",
    sourcePdfPages: [257],
    sourceRowNumber: 18,
    buildingDestinationRo: "Cladiri industriale",
    useCategoryRo: "procese tehnologice grupa III b",
    unitBasisRo: "pentru un muncitor pe schimb, consum menajer personal, igiena",
    specificDhwDemandLPerUnitDayAt60C: 30
  }),
  entry({
    id: "industriale_grupa_iv",
    sourcePdfPages: [257],
    sourceRowNumber: 18,
    buildingDestinationRo: "Cladiri industriale",
    useCategoryRo: "procese tehnologice grupa IV",
    unitBasisRo: "pentru un muncitor pe schimb, consum menajer personal, igiena",
    specificDhwDemandLPerUnitDayAt60C: 30
  }),
  entry({
    id: "industriale_grupa_v",
    sourcePdfPages: [257],
    sourceRowNumber: 18,
    buildingDestinationRo: "Cladiri industriale",
    useCategoryRo: "procese tehnologice grupa V",
    unitBasisRo: "pentru un muncitor pe schimb, consum menajer personal, igiena",
    specificDhwDemandLPerUnitDayAt60C: 40
  }),
  entry({
    id: "industriale_grupa_vi_a",
    sourcePdfPages: [257],
    sourceRowNumber: 18,
    buildingDestinationRo: "Cladiri industriale",
    useCategoryRo: "procese tehnologice grupa VI a",
    unitBasisRo: "pentru un muncitor pe schimb, consum menajer personal, igiena",
    specificDhwDemandLPerUnitDayAt60C: 25
  }),
  entry({
    id: "industriale_grupa_vi_b",
    sourcePdfPages: [257],
    sourceRowNumber: 18,
    buildingDestinationRo: "Cladiri industriale",
    useCategoryRo: "procese tehnologice grupa VI b",
    unitBasisRo: "pentru un muncitor pe schimb, consum menajer personal, igiena",
    specificDhwDemandLPerUnitDayAt60C: 30
  })
]);

export const dhwDemandTable3_3_1BlockedRows = Object.freeze([
  blockedRow({
    id: "locuinte_unifamiliale_insiruite_formula_reference",
    sourcePdfPages: [256],
    sourceRowNumber: 1,
    buildingDestinationRo: "Locuinte unifamiliale/insiruite",
    reason:
      "Tabel 3.3.1 gives no numeric value; it points to chapter 3.3.6.1 residential calculation for one equivalent consumer."
  }),
  blockedRow({
    id: "apartamente_formula_reference",
    sourcePdfPages: [256],
    sourceRowNumber: 2,
    buildingDestinationRo: "Apartamente",
    reason:
      "Tabel 3.3.1 gives no numeric value; it points to chapter 3.3.6.1 residential calculation for one equivalent consumer."
  })
]);

export function listDhwDemandTable3_3_1() {
  return dhwDemandTable3_3_1;
}

export function listDhwDemandTable3_3_1BlockedRows() {
  return dhwDemandTable3_3_1BlockedRows;
}

export function findDhwDemandEntryById(id) {
  return dhwDemandTable3_3_1.find((entry) => entry.id === id);
}

export function findDhwDemandEntriesByBuildingDestination(buildingDestinationRo) {
  const normalized = normalizeLookup(buildingDestinationRo);

  return Object.freeze(
    dhwDemandTable3_3_1.filter(
      (entry) => normalizeLookup(entry.buildingDestinationRo) === normalized
    )
  );
}

export function findDhwDemandEntriesByUseCategory(useCategoryRo) {
  const normalized = normalizeLookup(useCategoryRo);

  return Object.freeze(
    dhwDemandTable3_3_1.filter(
      (entry) => normalizeLookup(entry.useCategoryRo) === normalized
    )
  );
}
