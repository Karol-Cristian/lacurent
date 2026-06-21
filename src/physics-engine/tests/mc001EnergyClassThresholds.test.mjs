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

test("energy class thresholds dataset contains reviewed numeric interval rows", () => {
  assert.equal(Object.isFrozen(energyClassThresholds), true);
  assert.equal(energyClassThresholds.length, 448);
  assert.equal(listEnergyClassThresholds().length, 448);
});

test("table metadata exists for Tabel 5.7 through Tabel 5.14 with reviewed status", () => {
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
  assert.deepEqual(
    metadata.map((entry) => entry.sourcePage),
    [397, 397, 398, 398, 399, 399, 400, 400]
  );

  for (const entry of metadata) {
    assert.equal(entry.sourceModule, "15_energy_classes_and_certificate");
    assert.equal(entry.extractionStatus, "extracted_numeric_values");
    assert.equal(entry.registryStatus, "reviewed_numeric_registry_created");
    assert.equal(entry.implementationAllowed, true);
    assert.equal(Object.isFrozen(entry.lookupKeys), true);
    assert.equal(Object.isFrozen(entry.classLabels), true);
    assert.deepEqual(entry.classLabels, ["A+", "A", "B", "C", "D", "E", "F", "G"]);
  }
});

test("every threshold row preserves source, category, indicator, class and interval metadata", () => {
  const byTable = new Map();

  for (const entry of energyClassThresholds) {
    byTable.set(entry.sourceTable, (byTable.get(entry.sourceTable) ?? 0) + 1);

    assert.equal(Object.isFrozen(entry), true);
    assert.equal(entry.sourceModule, "15_energy_classes_and_certificate");
    assert.match(entry.sourceTable, /^MC001-2022 Tabel 5\.(7|8|9|10|11|12|13|14)$/);
    assert.ok([397, 398, 399, 400].includes(entry.sourcePage));
    assert.ok(entry.buildingCategoryKey.length > 0);
    assert.ok(entry.buildingCategoryRo.length > 0);
    assert.ok(entry.indicatorKey.length > 0);
    assert.ok(entry.indicatorRo.length > 0);
    assert.ok(["specific_primary_energy", "specific_co2_emissions"].includes(entry.indicatorBasis));
    assert.ok(["kWh/(m2.an)", "kgCO2/(m2.an)"].includes(entry.unit));
    assert.ok(["A+", "A", "B", "C", "D", "E", "F", "G"].includes(entry.classLabel));
    assert.equal(Object.isFrozen(entry.sourceThresholds), true);
    assert.equal(entry.sourceThresholds.length, 7);
    assert.equal(entry.extractionStatus, "extracted_numeric_values");
    assert.equal(entry.registryStatus, "reviewed_numeric_registry_created");
    assert.equal(entry.implementationAllowed, true);
  }

  assert.equal(byTable.size, 8);
  for (const count of byTable.values()) {
    assert.equal(count, 56);
  }
});

test("class intervals follow MC001 open-left closed-right threshold semantics", () => {
  const aPlus = findEnergyClassThresholdById(
    "tabel_5_7_specific_primary_energy_total_a_plus"
  );
  const a = findEnergyClassThresholdById("tabel_5_7_specific_primary_energy_total_a");
  const g = findEnergyClassThresholdById("tabel_5_7_specific_primary_energy_total_g");

  assert.equal(aPlus.lowerBound, null);
  assert.equal(aPlus.upperBound, 91);
  assert.equal(aPlus.lowerBoundOpen, false);
  assert.equal(aPlus.upperBoundInclusive, true);
  assert.equal(aPlus.intervalNotation, "<=91");

  assert.equal(a.lowerBound, 91);
  assert.equal(a.upperBound, 129);
  assert.equal(a.lowerBoundOpen, true);
  assert.equal(a.upperBoundInclusive, true);
  assert.equal(a.intervalNotation, "(91, 129]");

  assert.equal(g.lowerBound, 783);
  assert.equal(g.upperBound, null);
  assert.equal(g.lowerBoundOpen, true);
  assert.equal(g.upperBoundInclusive, false);
  assert.equal(g.intervalNotation, ">783");
});

test("selected exact threshold values match MC001 pages 397-400", () => {
  assert.deepEqual(
    findEnergyClassThresholdById("tabel_5_10_specific_primary_energy_total_b"),
    {
      ...findEnergyClassThresholdById("tabel_5_10_specific_primary_energy_total_b"),
      lowerBound: 68,
      upperBound: 135,
      unit: "kWh/(m2.an)",
      sourcePage: 398,
      buildingCategoryKey: "education"
    }
  );

  assert.equal(
    findEnergyClassThresholdById("tabel_5_10_specific_primary_energy_cooling_b")
      .upperBound,
    13
  );
  assert.equal(
    findEnergyClassThresholdById("tabel_5_10_specific_co2_emissions_total_b")
      .upperBound,
    23
  );
  assert.equal(
    findEnergyClassThresholdById("tabel_5_12_specific_primary_energy_dhw_a").upperBound,
    5
  );
  assert.equal(
    findEnergyClassThresholdById("tabel_5_14_specific_primary_energy_total_g").lowerBound,
    741
  );
  assert.equal(
    findEnergyClassThresholdById("tabel_5_14_specific_co2_emissions_total_g").lowerBound,
    121.7
  );
});

test("lookup helpers return reviewed numeric threshold rows", () => {
  assert.equal(
    findEnergyClassThresholdById("tabel_5_7_specific_primary_energy_heating_a_plus")
      .upperBound,
    49
  );
  assert.equal(findEnergyClassThresholdsBySourceTable("MC001-2022 Tabel 5.7").length, 56);
  assert.equal(findEnergyClassThresholdsByBuildingCategory("education").length, 56);
  assert.equal(
    findEnergyClassThresholdsByBuildingCategory("cladiri destinate invatamantului").length,
    56
  );
  assert.equal(findEnergyClassThresholdsByIndicatorKey("specific_primary_energy").length, 384);
  assert.equal(findEnergyClassThresholdsByIndicatorKey("specific_co2_emissions").length, 64);
  assert.equal(findEnergyClassThresholdsByIndicatorKey("heating").length, 64);
  assert.equal(findEnergyClassThresholdById("missing_threshold"), undefined);
});

test("dataset contains no certificate workflow or class assignment helper output", () => {
  const serialized = JSON.stringify({
    energyClassThresholds,
    energyClassThresholdTableMetadata
  });

  assert.equal(serialized.includes("certificateWorkflow"), false);
  assert.equal(serialized.includes("assignedClass"), false);
  assert.equal(serialized.includes("calculatedClass"), false);
});

test("returned datasets and lookup lists are not mutable from outside", () => {
  const thresholdList = listEnergyClassThresholds();
  const metadataList = listEnergyClassThresholdTableMetadata();
  const bySourceTable = findEnergyClassThresholdsBySourceTable("MC001-2022 Tabel 5.7");
  const byBuildingCategory = findEnergyClassThresholdsByBuildingCategory("education");
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
