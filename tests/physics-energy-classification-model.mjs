import assert from "node:assert/strict";
import { classifyEnergyPerformance } from "../src/features/energy/physics/calculators/classifyEnergyPerformance.mjs";
import { classifyEstimatedEnergyClass } from "../src/features/energy/physics/calculators/estimatedEnergyClass.mjs";

const realPrimary = 383.4;
const referencePrimary = 156.8;
const expectedRealClassFromRegistry = classifyEstimatedEnergyClass(realPrimary, "residential_individual").estimatedClass;

const result = classifyEnergyPerformance({
  totalPrimaryEnergyKwhM2Year: realPrimary,
  totalCo2KgM2Year: 22.4,
  buildingEnergyClassType: "residential_individual",
  servicePrimaryEnergyKwhM2Year: {
    heating: 280,
    dhw: 55
  },
  serviceUsefulEnergyKwhM2Year: {
    heating: 145,
    dhw: 25
  },
  serviceFinalEnergyKwhM2Year: {
    heating: 250,
    dhw: 52
  },
  referencePrimaryEnergyKwhM2Year: referencePrimary
});

assert.equal(result.global.status, "classified");
assert.equal(result.global.unit, "kWh/m2.year");
assert.equal(result.global.estimatedClass, expectedRealClassFromRegistry);
assert.equal(result.global.trace.formulaId, "ESTIMATED_ENERGY_CLASS_FROM_PRIMARY_ENERGY");

// Current registry puts 383.4 kWh/m2.year in C because C is >257 and <=390.
// If the registry thresholds are changed later, the aggregate calculator must follow the registry, not a hardcoded test value.
assert.equal(expectedRealClassFromRegistry, "C");

assert.equal(result.referenceBuilding.status, "classified");
assert.equal(result.referenceBuilding.globalPrimaryEnergyKwhM2Year, referencePrimary);
assert.equal(result.referenceBuilding.estimatedClass, "B");

assert.equal(result.emissions.status, "cannot_classify_missing_thresholds");
assert.equal(result.emissions.estimatedClass, "unknown");
assert.equal(result.emissions.unit, "kgCO2/m2.year");
assert.equal(result.emissions.trace.formulaId, "EMISSION_CLASS_FROM_CO2");
assert.ok(result.emissions.warnings.includes("MISSING_CO2_CLASS_THRESHOLDS"));

assert.equal(result.services.heating.status, "cannot_classify_missing_service_thresholds");
assert.equal(result.services.heating.primaryEnergyKwhM2Year, 280);
assert.equal(result.services.heating.trace.formulaId, "SERVICE_ENERGY_CLASS_FROM_PRIMARY_ENERGY");
assert.equal(result.services.dhw.status, "cannot_classify_missing_service_thresholds");
assert.equal(result.services.dhw.usefulEnergyKwhM2Year, 25);
assert.equal(result.services.cooling.status, "not_applicable");
assert.equal(result.services.mechanicalVentilation.status, "not_applicable");
assert.equal(result.services.lighting.status, "not_calculated");

assert.notEqual(result.global.estimatedClass, result.emissions.estimatedClass);
assert.equal(result.comparison.realVsReferencePrimaryEnergyRatio, 2.445);
assert.equal(result.comparison.realVsReferencePrimaryEnergyDeltaKwhM2Year, 226.6);
assert.equal(result.comparison.realVsReferencePrimaryEnergyDeltaPercent, 144.5);
assert.equal(result.comparison.distanceToNextBetterClassKwhM2Year, 126.4);

const noReference = classifyEnergyPerformance({
  totalPrimaryEnergyKwhM2Year: 120,
  totalCo2KgM2Year: 10,
  buildingEnergyClassType: "residential_collective"
});

assert.equal(noReference.referenceBuilding.status, "not_calculated");
assert.equal(noReference.comparison.realVsReferencePrimaryEnergyRatio, null);
assert.equal(noReference.services.cooling.status, "not_applicable");

console.log("PASS physics energy classification model");
