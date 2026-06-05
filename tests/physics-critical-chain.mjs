import assert from "node:assert/strict";
import {
  calculateLayerResistance,
  calculateTotalResistance,
  calculateUValue,
  calculateThermalBridgeHeatTransfer,
  calculateCorrectedUValue,
  calculateElementHeatTransfer,
  calculateHtr,
  calculateHve,
  calculateHeatingDemand,
  calculateFinalHeatingEnergy,
  calculatePrimaryEnergy,
  calculateCo2,
  estimateEnergyClass,
  runCriticalMc001Chain
} from "../src/features/energy/physics/engine/criticalMc001Chain.mjs";
import {
  criticalChainReferenceHomes,
  saliceaDemoHome
} from "../src/features/energy/physics/test-fixtures/criticalChainHomes.mjs";

function near(actual, expected, tolerance = 0.001, label = "value") {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${actual} to be near ${expected}`);
}

function hasTrace(trace, formulaId) {
  assert.equal(trace.formulaId, formulaId);
  assert.ok(trace.unit);
  assert.ok(trace.inputs && typeof trace.inputs === "object");
  assert.ok(Array.isArray(trace.steps));
  assert.ok(Array.isArray(trace.assumptions));
  assert.ok(Array.isArray(trace.warnings));
  assert.ok(["low", "medium", "high"].includes(trace.confidence));
}

const rBrick = calculateLayerResistance({ materialId: "brick", thicknessM: 0.3, lambdaWmK: 0.6 });
near(rBrick.value, 0.5, 0.0001, "R brick");
hasTrace(rBrick, "R_LAYER");

const rEps = calculateLayerResistance({ materialId: "eps", thicknessM: 0.05, lambdaWmK: 0.038 });
near(rEps.value, 1.3157894737, 0.0001, "R EPS");

const wallResistance = calculateTotalResistance({
  rsi: 0.13,
  rse: 0.04,
  layers: [
    { materialId: "brick", thicknessM: 0.3, lambdaWmK: 0.6 },
    { materialId: "eps", thicknessM: 0.05, lambdaWmK: 0.038 }
  ]
});
near(wallResistance.value, 1.9857894737, 0.0001, "R total");
hasTrace(wallResistance.trace, "R_TOTAL");

const uWall = calculateUValue({ rTotal: wallResistance.value });
near(uWall.value, 0.503577, 0.00001, "U wall");
hasTrace(uWall, "U_VALUE");

const hTb = calculateThermalBridgeHeatTransfer({
  thermalBridges: [{ psiWmK: 0.2, lengthM: 30 }]
});
near(hTb.value, 6, 0.0001, "H thermal bridges");
hasTrace(hTb, "H_THERMAL_BRIDGES");

const uCorrected = calculateCorrectedUValue({
  uValue: 0.504,
  areaM2: 80,
  hThermalBridges: hTb.value
});
near(uCorrected.value, 0.579, 0.0001, "U corrected");
hasTrace(uCorrected, "U_CORRECTED");

const hElement = calculateElementHeatTransfer({ uCorrected: uCorrected.value, areaM2: 80 });
near(hElement.value, 46.32, 0.0001, "H element");
hasTrace(hElement, "H_ELEMENT");

const htr = calculateHtr({
  elements: [
    { id: "wall", hElement: 46.32, confidence: "medium" },
    { id: "roof", hElement: 29.9, confidence: "medium" },
    { id: "floor", hElement: 35.75, confidence: "medium" },
    { id: "windows", hElement: 27.6, confidence: "medium" },
    { id: "doors", hElement: 5.1, confidence: "medium" }
  ]
});
near(htr.value, 144.67, 0.0001, "Htr");
hasTrace(htr, "H_TR");

const ventilation = calculateHve({ ach: 0.7, heatedVolumeM3: 162, heatRecoveryEfficiency: 0 });
near(ventilation.airflow.value, 113.4, 0.0001, "airflow");
near(ventilation.hve.value, 38.556, 0.001, "Hve");
hasTrace(ventilation.airflow, "AIRFLOW");
hasTrace(ventilation.hve, "H_VE");

const heatingDemand = calculateHeatingDemand({ htr: 144.67, hve: 38.56, hdd: 3200, heatedAreaM2: 64.8 });
near(heatingDemand.main.value, 14072.064, 0.01, "QH,nd");
near(heatingDemand.specific.value, 217.161, 0.01, "QH,nd m2");
hasTrace(heatingDemand.main, "QH_ND");

const finalWood = calculateFinalHeatingEnergy({
  usefulHeatingDemandKwhYear: 14072,
  heatingSystem: { fuelCarrier: "wood", seasonalEfficiency: 0.55 }
});
near(finalWood.value, 25585.4545, 0.01, "final wood");
hasTrace(finalWood, "FINAL_HEATING_EFFICIENCY");

const finalHeatPump = calculateFinalHeatingEnergy({
  usefulHeatingDemandKwhYear: 14072,
  heatingSystem: { fuelCarrier: "electricity", scop: 3.5 }
});
near(finalHeatPump.value, 4020.5714, 0.01, "final heat pump");
hasTrace(finalHeatPump, "FINAL_HEATING_HEAT_PUMP");

const primary = calculatePrimaryEnergy({ finalEnergyKwhYear: 25585.5, primaryEnergyFactor: 1.0, heatedAreaM2: 64.8 });
near(primary.main.value, 25585.5, 0.01, "primary");
near(primary.specific.value, 394.838, 0.01, "primary m2");
hasTrace(primary.main, "PRIMARY_ENERGY");

const co2 = calculateCo2({ finalEnergyKwhYear: 25585.5, co2Factor: 0.03, heatedAreaM2: 64.8 });
near(co2.main.value, 767.565, 0.01, "co2");
near(co2.specific.value, 11.845, 0.01, "co2 m2");
hasTrace(co2.main, "CO2");

const estimatedClass = estimateEnergyClass({ primaryEnergyKwhM2Year: 394.84 });
assert.equal(estimatedClass.value, "unknown");
hasTrace(estimatedClass, "ESTIMATED_CLASS");
assert.ok(estimatedClass.warnings.includes("MISSING_VALIDATED_ENERGY_CLASS_THRESHOLDS"));

const salicea = runCriticalMc001Chain(saliceaDemoHome);
near(salicea.summary.htrWk, 144.636, 0.02, "Salicea Htr");
near(salicea.summary.hveWk, 38.556, 0.01, "Salicea Hve");
near(salicea.summary.qhNdKwhYear, 14069.164, 0.5, "Salicea QH");
near(salicea.summary.qhNdKwhM2Year, 217.117, 0.1, "Salicea QH m2");
near(salicea.summary.finalEnergyKwhYear, 25580.299, 0.5, "Salicea final");
near(salicea.summary.primaryEnergyKwhM2Year, 394.758, 0.1, "Salicea primary m2");
near(salicea.summary.co2KgM2Year, 11.843, 0.1, "Salicea co2 m2");
assert.equal(salicea.summary.estimatedClass, "unknown");
assert.ok(salicea.traces.length >= 20, "Salicea should expose calculation traces");
assert.ok(salicea.warnings.includes("MISSING_VALIDATED_ENERGY_CLASS_THRESHOLDS"));

assert.equal(criticalChainReferenceHomes.length, 7);
for (const fixture of criticalChainReferenceHomes) {
  const result = runCriticalMc001Chain(fixture);
  assert.ok(result.summary.htrWk > 0, `${fixture.id} Htr must be positive`);
  assert.ok(result.summary.hveWk >= 0, `${fixture.id} Hve must be non-negative`);
  assert.ok(result.summary.qhNdKwhYear > 0, `${fixture.id} QH must be positive`);
  assert.ok(result.summary.finalEnergyKwhYear > 0, `${fixture.id} final energy must be positive`);
  assert.ok(result.summary.primaryEnergyKwhYear > 0, `${fixture.id} primary energy must be positive`);
  assert.ok(result.summary.co2KgYear >= 0, `${fixture.id} CO2 must be non-negative`);
  assert.equal(result.summary.estimatedClass, "unknown", `${fixture.id} class must be blocked until validated`);
  assert.ok(result.warnings.includes("MISSING_VALIDATED_ENERGY_CLASS_THRESHOLDS"), `${fixture.id} must explain missing class thresholds`);
}

console.log("PASS physics critical MC001-like chain traces and reference homes");
