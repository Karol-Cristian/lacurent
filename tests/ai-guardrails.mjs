import assert from "node:assert/strict";
import {
  validateAiCalculationEstimate,
  validateAiOutputEnvelope,
  validateAiRecommendation,
  validateDeterministicAuthority,
  validateTraceableNumber
} from "../src/features/energy/ai/validators/aiGuardrails.runtime.mjs";

const assumption = {
  id: "test.assumption",
  field: "heating",
  label: "Randament incalzire estimat",
  reason: "Nu exista inca valoare confirmata din sistem.",
  confidence: "medium",
  source: "ai_normalization",
  numericTruthSource: "not_numeric"
};

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("AI cannot overwrite deterministic result", () => {
  const validation = validateDeterministicAuthority({
    deterministicValue: 14200,
    aiValue: { sourceType: "ai_estimate" }
  });

  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(" "), /cannot overwrite/i);
});

test("AI estimate must have confidence and assumptions", () => {
  const validation = validateAiCalculationEstimate({
    metric: "simplePaybackYears",
    sourceType: "ai_estimate",
    formula: "investmentCostLei / annualSavingsLei",
    inputs: {
      investmentCostLeiRange: [12000, 18000],
      annualSavingsLeiRange: [2500, 4000]
    },
    resultRange: [3, 7],
    unit: "years",
    confidence: "medium",
    assumptions: [assumption],
    validationNeeded: true,
    warnings: []
  });

  assert.equal(validation.valid, true);
});

test("AI numeric result must have unit", () => {
  const validation = validateTraceableNumber({
    valueRange: [4800, 7200],
    sourceType: "ai_estimate",
    confidence: "medium",
    assumptions: [assumption],
    validationNeeded: true
  }, "estimatedSavings");

  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(" "), /unit/i);
});

test("AI recommendation must have reason", () => {
  const validation = validateAiRecommendation({
    id: "ai.rec.attic",
    title: "Izolare pod",
    category: "insulation",
    expectedImpact: "high",
    comfortImpact: "positive",
    technicalRisk: "low",
    dependencies: [],
    missingData: [],
    confidence: "medium",
    verdict: "strong_candidate",
    isNegativeRecommendation: false,
    assumptions: []
  });

  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(" "), /reason/i);
});

test("AI negative recommendation is supported", () => {
  const validation = validateAiRecommendation({
    id: "ai.rec.pv_not_first",
    title: "PV nu este primul pas",
    category: "renewables",
    reason: "PV poate reduce factura electrica, dar nu reduce pierderile termice prin pod si pereti.",
    expectedImpact: "medium",
    comfortImpact: "neutral",
    technicalRisk: "medium",
    dependencies: ["consum electric anual", "orientare acoperis"],
    missingData: ["facturi electrice reale"],
    confidence: "medium",
    verdict: "not_recommended_now",
    isNegativeRecommendation: true,
    assumptions: [assumption]
  });

  assert.equal(validation.valid, true);
});

test("AI output with missing required fields is rejected before render", () => {
  const validation = validateAiOutputEnvelope({
    status: "ok",
    confidence: "medium",
    result: {}
  });

  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(" "), /assumptions|missingData|warnings/);
});
