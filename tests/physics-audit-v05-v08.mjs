import assert from "node:assert/strict";

const primaryFactors = {
  electricity: { renewable: 0.55, nonRenewable: 1.95, total: 2.5, co2: 0.24 },
  natural_gas: { renewable: 0, nonRenewable: 1.1, total: 1.1, co2: 0.202 },
  wood: { renewable: 0.2, nonRenewable: 0.05, total: 0.25, co2: 0.03 }
};

function primaryAndCo2(byCarrier, area) {
  const carriers = Object.keys(primaryFactors);
  const primaryByCarrier = {};
  const co2ByCarrier = {};
  let renewable = 0;
  let nonRenewable = 0;
  let total = 0;
  let co2 = 0;
  for (const carrier of carriers) {
    const final = byCarrier[carrier] || 0;
    const factor = primaryFactors[carrier];
    primaryByCarrier[carrier] = {
      renewableKwh: Math.round(final * factor.renewable),
      nonRenewableKwh: Math.round(final * factor.nonRenewable),
      totalKwh: Math.round(final * factor.total)
    };
    co2ByCarrier[carrier] = Math.round(final * factor.co2);
    renewable += final * factor.renewable;
    nonRenewable += final * factor.nonRenewable;
    total += final * factor.total;
    co2 += final * factor.co2;
  }
  return {
    primaryByCarrier,
    co2ByCarrier,
    totalPrimary: Math.round(total),
    primaryM2: Number((total / area).toFixed(1)),
    renewableRatio: Math.round(renewable / total * 100),
    totalCo2: Math.round(co2),
    co2M2: Number((co2 / area).toFixed(1)),
    renewable,
    nonRenewable
  };
}

const energyThresholds = [
  ["A+", 0, 90],
  ["A", 90, 130],
  ["B", 130, 180],
  ["C", 180, 240],
  ["D", 240, 320],
  ["E", 320, 420],
  ["F", 420, 560],
  ["G", 560, Infinity]
];

const envThresholds = [
  ["A", 0, 5],
  ["B", 5, 10],
  ["C", 10, 20],
  ["D", 20, 35],
  ["E", 35, 55],
  ["F", 55, 80],
  ["G", 80, Infinity]
];

function classify(value, thresholds) {
  return thresholds.find(([, min, max]) => value >= min && value < max)?.[0] || "unknown";
}

function scenarioResult(baseline, measures) {
  const reduction = key => Math.round((1 - measures.reduce((factor, measure) => factor * (1 - (measure[key] || 0) / 100), 1)) * 1000) / 10;
  const finalReduction = reduction("finalEnergyReductionPercent");
  const primaryReduction = reduction("primaryEnergyReductionPercent");
  const co2Reduction = reduction("co2ReductionPercent");
  const scenario = {
    finalEnergyKwhYear: Math.round(baseline.finalEnergyKwhYear * (1 - finalReduction / 100)),
    primaryEnergyKwhYear: Math.round(baseline.primaryEnergyKwhYear * (1 - primaryReduction / 100)),
    co2KgYear: Math.round(baseline.co2KgYear * (1 - co2Reduction / 100)),
    annualCostRon: Math.round(baseline.annualCostRon * (1 - finalReduction / 100)),
    energyClass: "C"
  };
  return {
    scenario,
    savings: {
      finalEnergyKwhYear: baseline.finalEnergyKwhYear - scenario.finalEnergyKwhYear,
      primaryEnergyKwhYear: baseline.primaryEnergyKwhYear - scenario.primaryEnergyKwhYear,
      co2KgYear: baseline.co2KgYear - scenario.co2KgYear,
      annualCostRon: baseline.annualCostRon - scenario.annualCostRon,
      finalEnergyPercent: finalReduction,
      primaryEnergyPercent: primaryReduction,
      co2Percent: co2Reduction
    }
  };
}

const finalEnergyByCarrier = { wood: 24000, electricity: 900, natural_gas: 0 };
const v05 = primaryAndCo2(finalEnergyByCarrier, 65);
assert.equal(v05.primaryByCarrier.wood.totalKwh, 6000);
assert.equal(v05.primaryByCarrier.electricity.totalKwh, 2250);
assert.ok(v05.totalCo2 > 900);
assert.ok(v05.renewableRatio > 40);

const energyClass = classify(v05.primaryM2, energyThresholds);
const envClass = classify(v05.co2M2, envThresholds);
assert.equal(energyClass, "A");
assert.equal(envClass, "C");

const reference = { primaryM2: 120 };
const differencePercent = Math.round((v05.primaryM2 - reference.primaryM2) / reference.primaryM2 * 100);
assert.ok(Number.isFinite(differencePercent));

const baseline = {
  finalEnergyKwhYear: 24900,
  primaryEnergyKwhYear: v05.totalPrimary,
  co2KgYear: v05.totalCo2,
  annualCostRon: 8500,
  energyClass
};
const scenario = scenarioResult(baseline, [
  { finalEnergyReductionPercent: 12, primaryEnergyReductionPercent: 12, co2ReductionPercent: 10 },
  { finalEnergyReductionPercent: 6, primaryEnergyReductionPercent: 6, co2ReductionPercent: 6 }
]);
assert.ok(scenario.savings.finalEnergyPercent > 17);
assert.ok(scenario.savings.annualCostRon > 1000);

const auditResult = {
  buildingId: "demo",
  baseline: {
    finalEnergyResult: { totalFinalEnergyKwhYear: baseline.finalEnergyKwhYear },
    primaryEnergyAndCo2Result: v05,
    classificationResult: { estimatedEnergyClass: energyClass }
  },
  scenarios: [scenario],
  recommendedScenarioIds: ["scenario-1"],
  disclaimer: "Estimativ, nu certificat oficial."
};
assert.equal(auditResult.recommendedScenarioIds[0], "scenario-1");
assert.ok(auditResult.disclaimer.includes("nu certificat"));

console.log("PASS physics v0.5-v0.8 audit pipeline calculations");
