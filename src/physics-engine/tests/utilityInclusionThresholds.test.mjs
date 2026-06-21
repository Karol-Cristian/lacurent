import assert from "node:assert/strict";
import {
  calculateAdjustedCO2ClassThreshold,
  calculateAdjustedEnergyClassThreshold,
  findUtilityInclusionRule,
  getUtilityInclusionRules,
  listUtilityInclusionRules,
  STATUS_ADJUSTED_THRESHOLD,
  STATUS_UNCHANGED_THRESHOLD
} from "../utilityInclusionThresholds.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function assertCloseTo(actual, expected, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} is not close to ${expected}`);
}

test("lists reviewed Tabel 5.6 utility inclusion categories", () => {
  const rules = listUtilityInclusionRules();

  assert.equal(rules.length, 8);
  assert.equal(rules[0].sourceTable, "MC001-2022 Tabel 5.6");
  assert.deepEqual(rules.map((rule) => rule.categoryNumbers[0]), [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ]);
});

test("marks residential cooling and mechanical ventilation as optional", () => {
  const residential = getUtilityInclusionRules("residential_individual");

  assert.equal(residential.buildingCategoryKey, "residential");
  assert.equal(
    findUtilityInclusionRule({
      buildingCategoryKey: "residential_collective",
      utilityKey: "cooling"
    }).mandatory,
    false
  );
  assert.equal(
    findUtilityInclusionRule({
      buildingCategoryKey: "residential_collective",
      utilityKey: "cooling"
    }).calculationVariableValue,
    "0/1"
  );
  assert.equal(
    findUtilityInclusionRule({
      buildingCategoryKey: "residential_individual",
      utilityKey: "mechanical_ventilation"
    }).mandatory,
    false
  );
  assert.equal(
    findUtilityInclusionRule({
      buildingCategoryKey: "residential_individual",
      utilityKey: "lighting"
    }).mandatory,
    true
  );
});

test("marks non-residential cooling optional and mechanical ventilation mandatory", () => {
  for (const buildingCategoryKey of [
    "office",
    "commerce",
    "education",
    "healthcare",
    "tourism",
    "sports",
    "other_occupied"
  ]) {
    assert.equal(
      findUtilityInclusionRule({ buildingCategoryKey, utilityKey: "cooling" }).mandatory,
      false,
      buildingCategoryKey
    );
    assert.equal(
      findUtilityInclusionRule({
        buildingCategoryKey,
        utilityKey: "mechanical_ventilation"
      }).mandatory,
      true,
      buildingCategoryKey
    );
  }
});

test("adjusts total primary threshold by subtracting missing optional utility thresholds", () => {
  const result = calculateAdjustedEnergyClassThreshold({
    baseTotalThreshold: 135,
    missingUtilityPrimaryThresholds: [
      {
        utilityKey: "cooling",
        primaryThreshold: 13
      }
    ]
  });

  assert.equal(result.status, STATUS_ADJUSTED_THRESHOLD);
  assert.equal(result.adjustedThreshold, 122);
  assert.equal(result.missingPrimaryThresholdTotal, 13);
  assert.equal(result.unit, "kWh/(m2.an)");
  assert.equal(result.trace.source, "MC001-2022 page 396 Nota 4");
});

test("adjusts CO2 threshold by subtracting missing primary threshold times CO2 factor", () => {
  const result = calculateAdjustedCO2ClassThreshold({
    baseCO2Threshold: 23.0,
    missingUtilityPrimaryThresholds: [
      {
        utilityKey: "cooling",
        primaryThreshold: 13
      }
    ],
    co2Factor: 0.107
  });

  assert.equal(result.status, STATUS_ADJUSTED_THRESHOLD);
  assert.equal(result.adjustedThreshold, 21.61);
  assertCloseTo(result.rawAdjustedThreshold, 21.609);
  assertCloseTo(result.missingCO2Contribution, 1.391);
  assert.equal(result.unit, "kgCO2/(m2.an)");
});

test("leaves thresholds unchanged when no missing utilities are supplied", () => {
  const total = calculateAdjustedEnergyClassThreshold({
    baseTotalThreshold: 135,
    missingUtilityPrimaryThresholds: []
  });
  const co2 = calculateAdjustedCO2ClassThreshold({
    baseCO2Threshold: 23.0,
    missingUtilityPrimaryThresholds: [],
    co2Factor: 0.107
  });

  assert.equal(total.status, STATUS_UNCHANGED_THRESHOLD);
  assert.equal(total.adjustedThreshold, 135);
  assert.equal(co2.status, STATUS_UNCHANGED_THRESHOLD);
  assert.equal(co2.adjustedThreshold, 23.0);
});

test("does not infer energy class, CPE, certificate, or virtual consumption output", () => {
  const result = calculateAdjustedEnergyClassThreshold({
    baseTotalThreshold: 135,
    missingUtilityPrimaryThresholds: [{ utilityKey: "cooling", primaryThreshold: 13 }]
  });
  const serialized = JSON.stringify(result);

  assert.equal("classLabel" in result, false);
  assert.equal(serialized.includes("energyClass"), false);
  assert.equal(serialized.includes("certificateWorkflow"), false);
  assert.equal(serialized.includes("virtualConsumption"), false);
  assert.ok(result.trace.assumptions.includes("no_certificate_or_cpe_workflow"));
});

test("rejects invalid threshold inputs", () => {
  assert.throws(
    () =>
      calculateAdjustedEnergyClassThreshold({
        baseTotalThreshold: Number.NaN,
        missingUtilityPrimaryThresholds: []
      }),
    /baseTotalThreshold must be a finite non-negative number/
  );

  assert.throws(
    () =>
      calculateAdjustedCO2ClassThreshold({
        baseCO2Threshold: 23,
        missingUtilityPrimaryThresholds: [{ utilityKey: "cooling", primaryThreshold: -1 }],
        co2Factor: 0.107
      }),
    /primaryThreshold must be a finite non-negative number/
  );
});
