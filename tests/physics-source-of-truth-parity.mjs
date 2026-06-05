import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  inferFinalEnergyCarrierFromHeatingInput,
  resolveMc001Carrier
} from "../src/features/energy/physics/calculators/carrierMapping.mjs";
import {
  getCo2Factor,
  getPrimaryEnergyFactor
} from "../src/features/energy/physics/calculators/referenceValues.mjs";
import { classifyEstimatedEnergyClass } from "../src/features/energy/physics/calculators/estimatedEnergyClass.mjs";

function assertTraceShape(trace, expectedFormulaId) {
  assert.equal(trace.formulaId, expectedFormulaId);
  assert.ok(trace.formulaText);
  assert.ok("inputs" in trace);
  assert.ok("source" in trace);
  assert.ok("sourceType" in trace);
  assert.ok(Array.isArray(trace.warnings));
  assert.ok(Array.isArray(trace.assumptions));
  assert.ok(trace.unit);
}

const gasPrimary = getPrimaryEnergyFactor("natural_gas");
assert.equal(gasPrimary.value.total, 1.17);
assert.equal(gasPrimary.value.source, "MC001-2022");
assertTraceShape(gasPrimary.trace, "GET_PRIMARY_ENERGY_FACTOR");

const electricityPrimary = getPrimaryEnergyFactor("grid_electricity");
assert.equal(electricityPrimary.value.total, 2.62);

const firewoodPrimary = getPrimaryEnergyFactor("firewood");
assert.equal(firewoodPrimary.value.total, 1.08);

const missingPrimary = getPrimaryEnergyFactor("lpg");
assert.equal(missingPrimary.value, undefined);
assert.ok(missingPrimary.warnings.includes("MISSING_PRIMARY_ENERGY_FACTOR"));
assertTraceShape(missingPrimary.trace, "GET_PRIMARY_ENERGY_FACTOR");

const gasCo2 = getCo2Factor("natural_gas");
assert.equal(gasCo2.value.kgCO2PerKwh, 0.205);
assert.equal(gasCo2.value.source, "MC001-2022");
assertTraceShape(gasCo2.trace, "GET_CO2_FACTOR");

const electricityCo2 = getCo2Factor("grid_electricity");
assert.equal(electricityCo2.value.kgCO2PerKwh, 0.145);

const lpgCo2 = getCo2Factor("lpg");
assert.equal(lpgCo2.value.kgCO2PerKwh, 0.230);

const carrierElectricity = resolveMc001Carrier("electricity");
assert.equal(carrierElectricity.primaryEnergyCarrier, "grid_electricity");
assert.equal(carrierElectricity.co2Carrier, "grid_electricity");
assertTraceShape(carrierElectricity.trace, "RESOLVE_MC001_CARRIER");

const carrierWood = resolveMc001Carrier("wood");
assert.equal(carrierWood.primaryEnergyCarrier, "firewood");
assert.equal(carrierWood.co2Carrier, "firewood");

const carrierPellets = resolveMc001Carrier("pellets");
assert.equal(carrierPellets.primaryEnergyCarrier, "pellets_briquettes");
assert.equal(carrierPellets.co2Carrier, "pellets_briquettes");

const carrierUnknown = resolveMc001Carrier("unknown");
assert.equal(carrierUnknown.primaryEnergyCarrier, null);
assert.ok(carrierUnknown.warnings.includes("UNMAPPED_FINAL_ENERGY_CARRIER"));

const missingHeating = inferFinalEnergyCarrierFromHeatingInput({});
assert.equal(missingHeating.finalEnergyCarrier, null);
assert.ok(missingHeating.warnings.includes("MISSING_HEATING_OR_FUEL_INPUT"));

const gasHeating = inferFinalEnergyCarrierFromHeatingInput({ heatingSource: "Gaz" });
assert.equal(gasHeating.finalEnergyCarrier, "natural_gas");

const heatPumpHeating = inferFinalEnergyCarrierFromHeatingInput({ systemType: "pompa de caldura aer-apa" });
assert.equal(heatPumpHeating.finalEnergyCarrier, "electricity");

function expectClass(value, buildingType, expectedClass) {
  const result = classifyEstimatedEnergyClass(value, buildingType);
  assert.equal(result.status, "classified");
  assert.equal(result.estimatedClass, expectedClass);
  assertTraceShape(result.trace, "ESTIMATED_ENERGY_CLASS_FROM_PRIMARY_ENERGY");
  assert.equal(result.trace.inputs.primaryEnergyKwhM2Year, value);
  assert.equal(result.trace.inputs.buildingEnergyClassType, buildingType);
  assert.ok(result.thresholdSetUsed.id);
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

const missingClassType = classifyEstimatedEnergyClass(120, null);
assert.equal(missingClassType.status, "needs_building_type");
assert.ok(missingClassType.warnings.includes("NEEDS_BUILDING_ENERGY_CLASS_TYPE"));

const workerSource = readFileSync(resolve("workers/save-house.js"), "utf8");
const reportV1Source = readFileSync(resolve("js/report-v1.js"), "utf8");
assert.doesNotMatch(workerSource, /PRIMARY_FACTORS_V05/);
assert.doesNotMatch(workerSource, /ESTIMATED_ENERGY_CLASS_THRESHOLD_SETS/);
assert.doesNotMatch(workerSource, /function primaryFactor/);
assert.doesNotMatch(workerSource, /function co2Factor/);
assert.doesNotMatch(workerSource, /\bprimaryFactor\(/);
assert.doesNotMatch(workerSource, /\bco2Factor\(/);
assert.match(workerSource, /getPrimaryEnergyFactor/);
assert.match(workerSource, /getCo2Factor/);
assert.match(workerSource, /classifyEstimatedEnergyClassFromRegistry/);
assert.match(workerSource, /resolveMc001Carrier/);
assert.match(workerSource, /selectedDhwPresetV04/);
assert.match(workerSource, /finalEnergyCarrierByUse/);
assert.match(reportV1Source, /finalEnergyCarrierByUse/);
assert.doesNotMatch(reportV1Source, /key:\s*"dhw"[\s\S]{0,160}carrier:\s*mainCarrier/);

console.log("PASS physics source-of-truth parity");
