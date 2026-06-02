import assert from "node:assert/strict";

const materials = {
  brick: { lambdaWPerMK: 0.72 },
  eps: { lambdaWPerMK: 0.04 },
  concrete: { lambdaWPerMK: 1.7 }
};

const surface = {
  rsi: 0.13,
  rse: 0.04
};

function near(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be near ${expected}`);
}

function calculateLayerResistance(layer) {
  return {
    value: layer.thicknessM / materials[layer.materialId].lambdaWPerMK,
    unit: "m2K/W",
    source: "internal_estimate",
    confidence: "medium",
    assumptions: ["R_layer = thickness / lambda."]
  };
}

function calculateElementResistance(layers) {
  return surface.rsi + layers.reduce((sum, layer) => sum + calculateLayerResistance(layer).value, 0) + surface.rse;
}

function calculateElementUValue(layers) {
  return 1 / calculateElementResistance(layers);
}

function calculateThermalBridgeCorrection(uValue, areaM2, bridges) {
  const hTb = bridges.reduce((sum, bridge) => sum + bridge.psiWPerMK * bridge.lengthM, 0);
  return (uValue * areaM2 + hTb) / areaM2;
}

function calculateElementH(uCorrected, areaM2) {
  return uCorrected * areaM2;
}

function calculateUnconditionedZoneCorrection(hToExteriorWPerK, hTotalWPerK) {
  return hTotalWPerK > 0 ? hToExteriorWPerK / hTotalWPerK : 0.85;
}

function calculateHve({ ach, volumeM3, airflowM3PerH, heatRecoveryEfficiency = 0 }) {
  const airflow = airflowM3PerH || ach * volumeM3;
  return 0.34 * airflow * (1 - heatRecoveryEfficiency);
}

function calculateHeatingDemand(htr, hve, hdd) {
  return (htr + hve) * hdd * 24 / 1000;
}

function categoryRanking(byCategory) {
  const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0);
  return Object.entries(byCategory)
    .map(([category, value]) => ({ category, share: Math.round((value / total) * 100) }))
    .sort((a, b) => b.share - a.share);
}

const wallLayers = [
  { materialId: "brick", thicknessM: 0.3 },
  { materialId: "eps", thicknessM: 0.05 }
];

near(calculateLayerResistance({ materialId: "eps", thicknessM: 0.05 }).value, 1.25);

const rTotal = calculateElementResistance(wallLayers);
near(rTotal, 0.13 + 0.3 / 0.72 + 0.05 / 0.04 + 0.04);

const uValue = calculateElementUValue(wallLayers);
near(uValue, 1 / rTotal);

const uCorrected = calculateThermalBridgeCorrection(uValue, 68.7, [
  { lengthM: 10, psiWPerMK: 0.08 }
]);
near(uCorrected, (uValue * 68.7 + 0.8) / 68.7);

near(calculateElementH(uCorrected, 68.7), uCorrected * 68.7);

near(calculateUnconditionedZoneCorrection(50, 80), 0.625);

const htr = 36 + 28 + 54 + 29 + 9;
near(htr, 156);

const hve = calculateHve({ ach: 0.8, volumeM3: 162 });
near(hve, 44.064);

near(calculateHeatingDemand(htr, hve, 3400), (htr + hve) * 3400 * 24 / 1000);

const ranking = categoryRanking({
  walls: 36,
  roof: 28,
  floor: 54,
  windows: 29,
  doors: 9,
  thermalBridges: 12,
  unconditionedZones: 20
});
assert.equal(ranking[0].category, "floor");
assert.ok(ranking.some(item => item.category === "walls"));
assert.ok(ranking.some(item => item.category === "roof"));

console.log("PASS physics v0.2 envelope calculations");
