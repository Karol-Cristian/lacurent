import assert from "node:assert/strict";
import {
  dhwDemandTable3_3_1,
  dhwDemandTable3_3_1BlockedRows,
  dhwDemandTable3_3_1Metadata,
  findDhwDemandEntriesByBuildingDestination,
  findDhwDemandEntriesByUseCategory,
  findDhwDemandEntryById,
  listDhwDemandTable3_3_1,
  listDhwDemandTable3_3_1BlockedRows
} from "../datasets/mc001DhwDemandTable3_3_1.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("DHW Tabel 3.3.1 dataset contains reviewed numeric values", () => {
  assert.equal(Object.isFrozen(dhwDemandTable3_3_1), true);
  assert.equal(dhwDemandTable3_3_1.length, 49);
  assert.equal(listDhwDemandTable3_3_1().length, 49);
});

test("DHW Tabel 3.3.1 metadata reflects extracted numeric registry", () => {
  assert.equal(Object.isFrozen(dhwDemandTable3_3_1Metadata), true);
  assert.equal(dhwDemandTable3_3_1Metadata.sourceTable, "MC001-2022 Tabel 3.3.1");
  assert.equal(dhwDemandTable3_3_1Metadata.sourceModule, "09_dhw_systems");
  assert.equal(
    dhwDemandTable3_3_1Metadata.titleRo,
    "Valorile pentru necesarul specific de apa calda de consum, in functie de destinatia cladirii"
  );
  assert.equal(dhwDemandTable3_3_1Metadata.unit, "l/unitate,zi la 60 degC");
  assert.deepEqual(dhwDemandTable3_3_1Metadata.sourcePdfPages, [256, 257]);
  assert.equal(dhwDemandTable3_3_1Metadata.extractionStatus, "extracted_numeric_values");
  assert.equal(
    dhwDemandTable3_3_1Metadata.registryStatus,
    "reviewed_numeric_values_extracted"
  );
  assert.equal(dhwDemandTable3_3_1Metadata.implementationAllowed, true);
});

test("DHW Tabel 3.3.1 entries have required fields, units and traceability", () => {
  const ids = new Set();

  for (const entry of dhwDemandTable3_3_1) {
    assert.equal(Object.isFrozen(entry), true);
    assert.equal(typeof entry.id, "string");
    assert.equal(ids.has(entry.id), false, `${entry.id} is duplicated`);
    ids.add(entry.id);

    assert.equal(entry.sourceTable, "MC001-2022 Tabel 3.3.1");
    assert.equal(entry.sourceModule, "09_dhw_systems");
    assert.ok(entry.sourcePdfPages.every((page) => page === 256 || page === 257));
    assert.equal(typeof entry.sourceRowNumber, "number");
    assert.equal(typeof entry.buildingDestinationRo, "string");
    assert.equal(typeof entry.useCategoryRo, "string");
    assert.equal(typeof entry.unitBasisRo, "string");
    assert.equal(entry.unit, "l/unitate,zi la 60 degC");
    assert.equal(entry.extractionStatus, "extracted_numeric_value");
    assert.equal(entry.registryStatus, "reviewed_numeric_values_extracted");
    assert.equal(entry.implementationAllowed, true);
    assert.equal(typeof entry.specificDhwDemandLPerUnitDayAt60C, "number");
    assert.ok(entry.specificDhwDemandLPerUnitDayAt60C >= 0);
  }
});

test("DHW Tabel 3.3.1 lookup helpers return key categories", () => {
  assert.equal(
    findDhwDemandEntryById("birouri_functionar_schimb")
      .specificDhwDemandLPerUnitDayAt60C,
    5
  );

  const hotelEntries = findDhwDemandEntriesByBuildingDestination(
    "Hoteluri si pensiuni"
  );
  assert.equal(Object.isFrozen(hotelEntries), true);
  assert.equal(hotelEntries.length, 9);
  assert.deepEqual(
    hotelEntries.map((entry) => entry.specificDhwDemandLPerUnitDayAt60C),
    [40, 56, 70, 76, 90, 97, 111, 118, 132]
  );

  const sportSpectatorEntries = findDhwDemandEntriesByUseCategory("spectatori");
  assert.equal(sportSpectatorEntries.length, 1);
  assert.equal(sportSpectatorEntries[0].id, "terenuri_sport_stadioane_spectatori_m2");
  assert.equal(sportSpectatorEntries[0].specificDhwDemandLPerUnitDayAt60C, 0.03);
});

test("DHW Tabel 3.3.1 exact numeric values match source rows", () => {
  const expectedValuesById = {
    birouri_functionar_schimb: 5,
    cluburi_case_cultura_teatre_actori: 15,
    cluburi_case_cultura_teatre_spectatori_vizitatori: 0.03,
    spatii_comerciale_m2_suprafata_utila: 0.03,
    cantine_restaurante_catering_2_mese: 21,
    cantine_restaurante_catering_2_mese_autoservire_bufet: 8,
    cantine_restaurante_catering_1_masa: 10,
    cantine_restaurante_catering_1_masa_autoservire_bufet: 4,
    cantine_restaurante_o_persoana_o_masa_pranz: 10,
    cantine_restaurante_o_persoana_trei_mese: 30,
    cazare_elevi_studenti_varstnici_grupuri_sanitare_comune: 30,
    cazare_elevi_studenti_varstnici_lavoare_in_camere: 40,
    cazare_elevi_studenti_varstnici_grup_sanitar_camera: 50,
    cazare_elevi_studenti_varstnici_dotare_superioara: 80,
    copii_crese_gradinite_program_redus: 8,
    copii_crese_gradinite_program_prelungit_fara_cazare: 10,
    copii_crese_gradinite_cu_cazare: 40,
    hoteluri_pensiuni_hostel_studenti: 40,
    hoteluri_pensiuni_hotel_1_stea_fara_spalatorie: 56,
    hoteluri_pensiuni_hotel_1_stea_cu_spalatorie: 70,
    hoteluri_pensiuni_hotel_2_stele_fara_spalatorie: 76,
    hoteluri_pensiuni_hotel_2_stele_cu_spalatorie: 90,
    hoteluri_pensiuni_hotel_3_stele_fara_spalatorie: 97,
    hoteluri_pensiuni_hotel_3_stele_cu_spalatorie: 111,
    hoteluri_pensiuni_hotel_4_stele_fara_spalatorie: 118,
    hoteluri_pensiuni_hotel_4_stele_cu_spalatorie: 132,
    dispensare_policlinici_bolnav: 3,
    sanatate_tratament_ambulatoriu_fara_cazare: 10,
    sanatate_tratament_cu_cazare_fara_spalatorie: 56,
    sanatate_tratament_cu_cazare_cu_spalatorie: 88,
    sanatorii_centre_recuperare_cazi_dusuri_grupuri_sanitare: 115,
    sanatorii_centre_recuperare_cazi_camera_bolnavi: 165,
    sanatorii_centre_recuperare_cazi_camera_tratamente_balneologice: 225,
    scoli_elev_program_fara_dusuri_bai: 5,
    sport_elevi_fara_dusuri_utilizator: 5,
    sport_elevi_cu_dusuri_dus_instalat: 101,
    terenuri_sport_stadioane_spectatori_m2: 0.03,
    terenuri_sport_stadioane_sportiv: 20,
    transport_gari_aeroporturi_m2: 0.03,
    spalatorii_spalare_semimecanizata: 25,
    spalatorii_spalare_mecanizata: 30,
    industriale_grupa_i: 20,
    industriale_grupa_ii: 25,
    industriale_grupa_iii_a: 25,
    industriale_grupa_iii_b: 30,
    industriale_grupa_iv: 30,
    industriale_grupa_v: 40,
    industriale_grupa_vi_a: 25,
    industriale_grupa_vi_b: 30
  };

  assert.equal(Object.keys(expectedValuesById).length, 49);

  for (const [id, expectedValue] of Object.entries(expectedValuesById)) {
    assert.equal(
      findDhwDemandEntryById(id).specificDhwDemandLPerUnitDayAt60C,
      expectedValue,
      id
    );
  }
});

test("DHW Tabel 3.3.1 documents residential formula-reference rows as blocked", () => {
  assert.equal(Object.isFrozen(dhwDemandTable3_3_1BlockedRows), true);
  assert.equal(dhwDemandTable3_3_1BlockedRows.length, 2);
  assert.equal(listDhwDemandTable3_3_1BlockedRows().length, 2);
  assert.deepEqual(
    dhwDemandTable3_3_1BlockedRows.map((row) => row.sourceRowNumber),
    [1, 2]
  );
  assert.deepEqual(
    dhwDemandTable3_3_1BlockedRows.map((row) => row.buildingDestinationRo),
    ["Locuinte unifamiliale/insiruite", "Apartamente"]
  );

  for (const row of dhwDemandTable3_3_1BlockedRows) {
    assert.equal(row.extractionStatus, "non_numeric_formula_reference");
    assert.equal(row.implementationAllowed, false);
    assert.ok(row.reason.includes("chapter 3.3.6.1"));
  }
});

test("DHW Tabel 3.3.1 returned lookup lists are not mutable from outside", () => {
  const listedEntries = listDhwDemandTable3_3_1();
  const blockedRows = listDhwDemandTable3_3_1BlockedRows();
  const byDestination = findDhwDemandEntriesByBuildingDestination("Hoteluri si pensiuni");
  const byUseCategory = findDhwDemandEntriesByUseCategory("spectatori");

  assert.equal(Object.isFrozen(listedEntries), true);
  assert.equal(Object.isFrozen(blockedRows), true);
  assert.equal(Object.isFrozen(byDestination), true);
  assert.equal(Object.isFrozen(byUseCategory), true);
  assert.throws(() => listedEntries.push({}), TypeError);
  assert.throws(() => blockedRows.push({}), TypeError);
  assert.throws(() => byDestination.push({}), TypeError);
  assert.throws(() => byUseCategory.push({}), TypeError);
});
