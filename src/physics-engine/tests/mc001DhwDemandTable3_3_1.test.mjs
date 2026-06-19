import assert from "node:assert/strict";
import {
  dhwDemandTable3_3_1,
  dhwDemandTable3_3_1Metadata,
  findDhwDemandEntriesByBuildingDestination,
  findDhwDemandEntriesByUseCategory,
  findDhwDemandEntryById,
  listDhwDemandTable3_3_1
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

test("DHW demand dataset is an empty frozen array because values were not extracted", () => {
  assert.equal(Object.isFrozen(dhwDemandTable3_3_1), true);
  assert.equal(dhwDemandTable3_3_1.length, 0);
  assert.equal(listDhwDemandTable3_3_1().length, 0);
});

test("table metadata exists for Tabel 3.3.1", () => {
  assert.equal(Object.isFrozen(dhwDemandTable3_3_1Metadata), true);
  assert.equal(dhwDemandTable3_3_1Metadata.sourceTable, "MC001-2022 Tabel 3.3.1");
  assert.equal(dhwDemandTable3_3_1Metadata.sourceModule, "09_dhw_systems");
  assert.equal(
    dhwDemandTable3_3_1Metadata.titleRo,
    "Valorile necesarului specific de apa calda de consum pentru diferite destinatii de cladiri"
  );
  assert.equal(dhwDemandTable3_3_1Metadata.unit, "l/unitate,zi la 60 degC");
  assert.equal(dhwDemandTable3_3_1Metadata.registryStatus, "metadata_registry_created_values_missing");
  assert.equal(dhwDemandTable3_3_1Metadata.implementationAllowed, false);
});

test("lookup helpers return empty values safely when numeric demands are unavailable", () => {
  assert.equal(findDhwDemandEntryById("hotel"), undefined);
  assert.deepEqual(findDhwDemandEntriesByBuildingDestination("hotel"), []);
  assert.deepEqual(findDhwDemandEntriesByUseCategory("cazare"), []);
});

test("no fake demand values are present", () => {
  const serialized = JSON.stringify({
    dhwDemandTable3_3_1,
    dhwDemandTable3_3_1Metadata
  });

  assert.equal(dhwDemandTable3_3_1.some((entry) => "specificDhwDemand" in entry), false);
  assert.equal(serialized.includes('"specificDhwDemand"'), false);
});

test("returned dataset and empty lookup lists are not mutable from outside", () => {
  const listedEntries = listDhwDemandTable3_3_1();
  const byDestination = findDhwDemandEntriesByBuildingDestination("hotel");
  const byUseCategory = findDhwDemandEntriesByUseCategory("cazare");

  assert.equal(Object.isFrozen(listedEntries), true);
  assert.equal(Object.isFrozen(byDestination), true);
  assert.equal(Object.isFrozen(byUseCategory), true);
  assert.throws(() => listedEntries.push({}), TypeError);
  assert.throws(() => byDestination.push({}), TypeError);
  assert.throws(() => byUseCategory.push({}), TypeError);
});
