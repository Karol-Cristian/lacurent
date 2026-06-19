import assert from "node:assert/strict";
import {
  co2EmissionFactors,
  factorTableMetadata,
  findCO2EmissionFactorByCarrierKey,
  findEnergyFactorBundleByCarrierKey,
  findPrimaryEnergyFactorByCarrierKey,
  listCO2EmissionFactors,
  listEnergyCarrierKeys,
  listPrimaryEnergyFactors,
  primaryEnergyFactors
} from "../datasets/mc001PrimaryEnergyAndCO2Factors.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("numeric factor datasets have expected reviewed entry counts", () => {
  assert.equal(primaryEnergyFactors.length, 19);
  assert.equal(co2EmissionFactors.length, 20);
  assert.equal(listPrimaryEnergyFactors().length, 19);
  assert.equal(listCO2EmissionFactors().length, 20);
});

test("table metadata is marked as reviewed numeric dataset", () => {
  assert.equal(Object.isFrozen(factorTableMetadata), true);
  assert.equal(factorTableMetadata.length, 2);

  for (const table of factorTableMetadata) {
    assert.equal(table.sourceModule, "13_final_primary_co2_rer");
    assert.equal(table.extractionStatus, "extracted_numeric_values");
    assert.equal(table.registryStatus, "reviewed_dataset_registry_created");
    assert.equal(table.implementationAllowed, true);
  }

  assert.deepEqual(factorTableMetadata[0].factorColumns, ["fPnren", "fPren", "fPtot"]);
  assert.deepEqual(factorTableMetadata[1].factorColumns, ["fCO2 [kg CO2/kWh]"]);
});

test("all primary energy factors have required fields and non-negative numeric values", () => {
  for (const entry of primaryEnergyFactors) {
    assert.equal(typeof entry.id, "string");
    assert.ok(entry.id.endsWith("_primary_energy_factors"));
    assert.equal(typeof entry.energyCarrierRo, "string");
    assert.equal(typeof entry.energyCarrierKey, "string");
    assert.equal(typeof entry.renewablePrimaryEnergyFactor, "number");
    assert.equal(typeof entry.nonRenewablePrimaryEnergyFactor, "number");
    assert.equal(typeof entry.totalPrimaryEnergyFactor, "number");
    assert.ok(entry.renewablePrimaryEnergyFactor >= 0);
    assert.ok(entry.nonRenewablePrimaryEnergyFactor >= 0);
    assert.ok(entry.totalPrimaryEnergyFactor >= 0);
    assert.equal(entry.unit, "kWh primary/kWh final");
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 5.17");
    assert.equal(entry.sourceModule, "13_final_primary_co2_rer");
    assert.equal(typeof entry.notes, "string");
  }
});

test("all CO2 emission factors have required fields and non-negative numeric values", () => {
  for (const entry of co2EmissionFactors) {
    assert.equal(typeof entry.id, "string");
    assert.ok(entry.id.endsWith("_co2_emission_factor"));
    assert.equal(typeof entry.energyCarrierRo, "string");
    assert.equal(typeof entry.energyCarrierKey, "string");
    assert.equal(typeof entry.co2EmissionFactor, "number");
    assert.ok(entry.co2EmissionFactor >= 0);
    assert.equal(entry.unit, "kgCO2/kWh");
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 5.18");
    assert.equal(entry.sourceModule, "13_final_primary_co2_rer");
    assert.equal(typeof entry.notes, "string");
  }
});

test("selected primary energy factor lookups return reviewed values", () => {
  assert.deepEqual(
    {
      fPnren: findPrimaryEnergyFactorByCarrierKey("gaz_natural").nonRenewablePrimaryEnergyFactor,
      fPren: findPrimaryEnergyFactorByCarrierKey("gaz_natural").renewablePrimaryEnergyFactor,
      fPtot: findPrimaryEnergyFactorByCarrierKey("gaz_natural").totalPrimaryEnergyFactor
    },
    { fPnren: 1.17, fPren: 0, fPtot: 1.17 }
  );
  assert.deepEqual(
    {
      fPnren: findPrimaryEnergyFactorByCarrierKey("electricitate_sen_consumata")
        .nonRenewablePrimaryEnergyFactor,
      fPren: findPrimaryEnergyFactorByCarrierKey("electricitate_sen_consumata")
        .renewablePrimaryEnergyFactor,
      fPtot: findPrimaryEnergyFactorByCarrierKey("electricitate_sen_consumata")
        .totalPrimaryEnergyFactor
    },
    { fPnren: 2, fPren: 0.5, fPtot: 2.5 }
  );
  assert.deepEqual(
    {
      fPnren: findPrimaryEnergyFactorByCarrierKey("biomasa_lemne_foc")
        .nonRenewablePrimaryEnergyFactor,
      fPren: findPrimaryEnergyFactorByCarrierKey("biomasa_lemne_foc")
        .renewablePrimaryEnergyFactor,
      fPtot: findPrimaryEnergyFactorByCarrierKey("biomasa_lemne_foc")
        .totalPrimaryEnergyFactor
    },
    { fPnren: 0.18, fPren: 0.9, fPtot: 1.08 }
  );
});

test("selected CO2 factor lookups return reviewed values", () => {
  assert.equal(findCO2EmissionFactorByCarrierKey("gaz_natural").co2EmissionFactor, 0.202);
  assert.equal(
    findCO2EmissionFactorByCarrierKey("electricitate_sen_consumata").co2EmissionFactor,
    0.107
  );
  assert.equal(
    findCO2EmissionFactorByCarrierKey("biomasa_brichete_peleti").co2EmissionFactor,
    0.039
  );
});

test("common carrier keys exist and bundle lookup returns both sides when available", () => {
  const primaryKeys = new Set(primaryEnergyFactors.map((entry) => entry.energyCarrierKey));
  const co2Keys = new Set(co2EmissionFactors.map((entry) => entry.energyCarrierKey));
  const commonKeys = [...primaryKeys].filter((key) => co2Keys.has(key));

  assert.ok(commonKeys.length > 0);
  assert.ok(listEnergyCarrierKeys().includes("gaz_natural"));

  const bundle = findEnergyFactorBundleByCarrierKey("gaz_natural");
  assert.equal(bundle.energyCarrierKey, "gaz_natural");
  assert.equal(bundle.primaryEnergyFactor.totalPrimaryEnergyFactor, 1.17);
  assert.equal(bundle.co2EmissionFactor.co2EmissionFactor, 0.202);
});

test("bundle lookup returns whichever side exists plus null for the missing side", () => {
  const co2OnlyBundle = findEnergyFactorBundleByCarrierKey("antracit");
  const primaryOnlyBundle = findEnergyFactorBundleByCarrierKey(
    "electricitate_pv_eolian_onsite_nearby_exportata_sen"
  );

  assert.equal(co2OnlyBundle.primaryEnergyFactor, null);
  assert.equal(co2OnlyBundle.co2EmissionFactor.co2EmissionFactor, 0.356);
  assert.equal(primaryOnlyBundle.primaryEnergyFactor.totalPrimaryEnergyFactor, 2.5);
  assert.equal(primaryOnlyBundle.co2EmissionFactor, null);
  assert.equal(findEnergyFactorBundleByCarrierKey("unknown_carrier"), undefined);
});

test("returned datasets and lists are not mutable from outside", () => {
  const primaryList = listPrimaryEnergyFactors();
  const co2List = listCO2EmissionFactors();
  const carrierKeys = listEnergyCarrierKeys();
  const selectedPrimary = findPrimaryEnergyFactorByCarrierKey("gaz_natural");
  const selectedCo2 = findCO2EmissionFactorByCarrierKey("gaz_natural");

  assert.equal(Object.isFrozen(primaryEnergyFactors), true);
  assert.equal(Object.isFrozen(co2EmissionFactors), true);
  assert.equal(Object.isFrozen(primaryList), true);
  assert.equal(Object.isFrozen(co2List), true);
  assert.equal(Object.isFrozen(carrierKeys), true);
  assert.equal(Object.isFrozen(selectedPrimary), true);
  assert.equal(Object.isFrozen(selectedCo2), true);
  assert.throws(() => primaryList.push(selectedPrimary), TypeError);
  assert.throws(() => co2List.push(selectedCo2), TypeError);
  assert.throws(() => carrierKeys.push("new_key"), TypeError);
  assert.throws(() => {
    selectedPrimary.totalPrimaryEnergyFactor = 9;
  }, TypeError);
  assert.throws(() => {
    selectedCo2.co2EmissionFactor = 9;
  }, TypeError);
});
