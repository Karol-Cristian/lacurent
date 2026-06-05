import assert from "node:assert/strict";
import { classifyEstimatedEnergyClass } from "../src/features/energy/physics/calculators/estimatedEnergyClass.mjs";

function expectClass(value, buildingType, expectedClass) {
  const result = classifyEstimatedEnergyClass(value, buildingType);
  assert.equal(result.status, "classified");
  assert.equal(result.estimatedClass, expectedClass);
  assert.equal(result.inputPrimaryEnergyKwhM2Year, value);
  assert.equal(result.unit, "kWh/m2.year");
  assert.equal(result.trace.formulaId, "ESTIMATED_ENERGY_CLASS_FROM_PRIMARY_ENERGY");
  assert.equal(result.trace.value, expectedClass);
  assert.ok(result.thresholdSetUsed?.id);
  assert.ok(result.assumptions.some(item => item.includes("nu reprezinta certificat energetic oficial")));
}

expectClass(91, "residential_individual", "A+");
expectClass(91.01, "residential_individual", "A");
expectClass(129, "residential_individual", "A");
expectClass(129.01, "residential_individual", "B");
expectClass(783, "residential_individual", "F");
expectClass(783.01, "residential_individual", "G");

expectClass(73, "residential_collective", "A+");
expectClass(73.01, "residential_collective", "A");
expectClass(595, "residential_collective", "F");
expectClass(595.01, "residential_collective", "G");

const missingValue = classifyEstimatedEnergyClass(null, "residential_individual");
assert.equal(missingValue.status, "cannot_classify");
assert.equal(missingValue.estimatedClass, "unknown");
assert.ok(missingValue.warnings.includes("MISSING_PRIMARY_ENERGY_KWH_M2_YEAR"));

const missingType = classifyEstimatedEnergyClass(120, null);
assert.equal(missingType.status, "needs_building_type");
assert.equal(missingType.estimatedClass, "unknown");
assert.ok(missingType.warnings.includes("NEEDS_BUILDING_ENERGY_CLASS_TYPE"));

const negative = classifyEstimatedEnergyClass(-1, "residential_individual");
assert.equal(negative.status, "error");
assert.equal(negative.estimatedClass, "unknown");
assert.ok(negative.warnings.includes("NEGATIVE_PRIMARY_ENERGY_KWH_M2_YEAR"));

console.log("PASS physics estimated energy class thresholds");
