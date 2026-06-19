import assert from "node:assert/strict";
import {
  energyClassThresholds,
  energyClassThresholdTableMetadata,
  findEnergyClassThresholdById,
  findEnergyClassThresholdsByBuildingCategory,
  findEnergyClassThresholdsByIndicatorKey,
  findEnergyClassThresholdsBySourceTable,
  listEnergyClassThresholds,
  listEnergyClassThresholdTableMetadata
} from "../datasets/mc001EnergyClassThresholds.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("energy class thresholds dataset is an empty frozen array because values were not extracted", () => {
  assert.equal(Object.isFrozen(energyClassThresholds), true);
  assert.equal(energyClassThresholds.length, 0);
  assert.equal(listEnergyClassThresholds().length, 0);
});

test("table metadata exists for Tabel 5.7 through Tabel 5.14", () => {
  const metadata = listEnergyClassThresholdTableMetadata();

  assert.equal(Object.isFrozen(energyClassThresholdTableMetadata), true);
  assert.equal(metadata.length, 8);
  assert.deepEqual(
    metadata.map((entry) => entry.sourceTable),
    [
      "MC001-2022 Tabel 5.7",
      "MC001-2022 Tabel 5.8",
      "MC001-2022 Tabel 5.9",
      "MC001-2022 Tabel 5.10",
      "MC001-2022 Tabel 5.11",
      "MC001-2022 Tabel 5.12",
      "MC001-2022 Tabel 5.13",
      "MC001-2022 Tabel 5.14"
    ]
  );
});

test("metadata entries state that values are indexed only and unavailable for implementation", () => {
  for (const entry of energyClassThresholdTableMetadata) {
    assert.equal(entry.sourceModule, "15_energy_classes_and_certificate");
    assert.equal(typeof entry.titleRo, "string");
    assert.ok(entry.titleRo.length > 0);
    assert.equal(typeof entry.purpose, "string");
    assert.ok(entry.purpose.length > 0);
    assert.equal(Object.isFrozen(entry.lookupKeys), true);
    assert.ok(entry.lookupKeys.length > 0);
    assert.equal(entry.extractionStatus, "indexed_table");
    assert.equal(entry.registryStatus, "metadata_registry_created_values_missing");
    assert.equal(entry.implementationAllowed, false);
    assert.match(entry.notes, /does not copy numeric threshold values/);
  }
});

test("lookup helpers return empty values safely when numeric thresholds are unavailable", () => {
  assert.equal(findEnergyClassThresholdById("individual_residential_a_plus"), undefined);
  assert.deepEqual(findEnergyClassThresholdsBySourceTable("MC001-2022 Tabel 5.7"), []);
  assert.deepEqual(findEnergyClassThresholdsByBuildingCategory("cladiri de locuit individuale"), []);
  assert.deepEqual(findEnergyClassThresholdsByIndicatorKey("specific_primary_energy"), []);
});

test("no fake threshold values are present", () => {
  const serialized = JSON.stringify({
    energyClassThresholds,
    energyClassThresholdTableMetadata
  });

  assert.equal(energyClassThresholds.some((entry) => "lowerBound" in entry), false);
  assert.equal(energyClassThresholds.some((entry) => "upperBound" in entry), false);
  assert.equal(serialized.includes('"lowerBound"'), false);
  assert.equal(serialized.includes('"upperBound"'), false);
  assert.equal(serialized.includes('"classLabel"'), false);
});

test("returned datasets and lookup lists are not mutable from outside", () => {
  const thresholdList = listEnergyClassThresholds();
  const metadataList = listEnergyClassThresholdTableMetadata();
  const bySourceTable = findEnergyClassThresholdsBySourceTable("MC001-2022 Tabel 5.7");
  const byBuildingCategory = findEnergyClassThresholdsByBuildingCategory(
    "cladiri de locuit individuale"
  );
  const byIndicator = findEnergyClassThresholdsByIndicatorKey("specific_primary_energy");

  assert.equal(Object.isFrozen(thresholdList), true);
  assert.equal(Object.isFrozen(metadataList), true);
  assert.equal(Object.isFrozen(bySourceTable), true);
  assert.equal(Object.isFrozen(byBuildingCategory), true);
  assert.equal(Object.isFrozen(byIndicator), true);
  assert.throws(() => thresholdList.push({}), TypeError);
  assert.throws(() => metadataList.push({}), TypeError);
  assert.throws(() => bySourceTable.push({}), TypeError);
  assert.throws(() => byBuildingCategory.push({}), TypeError);
  assert.throws(() => byIndicator.push({}), TypeError);
});
