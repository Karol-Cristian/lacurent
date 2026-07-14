import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001LatentDemandExplicit } from "../mc001LatentDemandCalculation.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function assertApprox(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

const baseSource = { reference: "manual_chapter_2_latent_input" };

function humidificationCase(overrides = {}) {
  return {
    caseId: "jan-latent-humidification",
    month: "january",
    source: baseSource,
    humidification: {
      monthlyHumidificationFraction: 0.25,
      latentHeatOfVaporizationJPerKg: 2500000,
      latentHeatRecoveryEfficiency: 0.55,
      airDensityKgPerM3: 1.2,
      mechanicalSupplyAirflowM3PerS: 0.1,
      annualMoistureSupplyKgHPerKg: 0.17,
      source: baseSource,
      ...overrides
    }
  };
}

function dehumidificationCase(overrides = {}) {
  return {
    caseId: "jul-latent-dehumidification",
    month: "july",
    source: baseSource,
    dehumidification: {
      sensibleCoolingDemandKwh: 100,
      dehumidificationFraction: 0.2,
      source: baseSource,
      ...overrides
    }
  };
}

function run(cases) {
  return calculateMc001LatentDemandExplicit({
    mode: "chapter2_latent_demand_explicit_v1",
    cases
  });
}

test("relation 2.82 calculates monthly humidification latent demand", () => {
  const result = run([humidificationCase()]);

  assert.equal(result.status, "ready");
  assertApprox(result.caseResults[0].humidification.qHUndKwh, 5.7375);
  assertApprox(result.summary.annualHumidificationDemandKwh, 5.7375);
  assert.equal(
    result.caseResults[0].humidification.formulaCode,
    "MC001_RELATION_2_82_MONTHLY_HUMIDIFICATION_LATENT_DEMAND"
  );
  assert.equal(
    result.caseResults[0].humidification.humidificationFractionOrigin,
    "explicit_input"
  );
});

test("relation 2.82 derives fHU from monthly and annual QHnd", () => {
  const result = run([
    humidificationCase({
      monthlyHumidificationFraction: undefined,
      heatingDemandFractionSource: {
        monthlyQHndKwh: 50,
        annualQHndKwh: 200,
        source: baseSource
      }
    })
  ]);

  assert.equal(result.status, "ready");
  assertApprox(result.caseResults[0].humidification.monthlyHumidificationFraction, 0.25);
  assert.equal(
    result.caseResults[0].humidification.humidificationFractionOrigin,
    "calculated_from_MC001_2_82_QHnd_month_over_annual"
  );
});

test("Table 2.21 can feed relation 2.82 annual moisture supply", () => {
  const result = run([
    humidificationCase({
      annualMoistureSupplyKgHPerKg: undefined,
      annualMoistureSupplyTable2_21CategoryId: "residential"
    })
  ]);

  assert.equal(result.status, "ready");
  assertApprox(result.caseResults[0].humidification.annualMoistureSupplyKgHPerKg, 0.17);
  assert.equal(
    result.caseResults[0].humidification.annualMoistureSupplyOrigin,
    "calculated_from_MC001_table_2_21_space_category_lookup"
  );
  assertApprox(result.caseResults[0].humidification.qHUndKwh, 5.7375);
});

test("relation 2.83 calculates monthly dehumidification latent demand", () => {
  const result = run([dehumidificationCase()]);

  assert.equal(result.status, "ready");
  assertApprox(result.caseResults[0].dehumidification.qDHUndKwh, 20);
  assertApprox(result.summary.annualDehumidificationDemandKwh, 20);
  assert.equal(
    result.caseResults[0].dehumidification.formulaCode,
    "MC001_RELATION_2_83_MONTHLY_DEHUMIDIFICATION_LATENT_DEMAND"
  );
});

test("relation 2.86 aggregates humidification and dehumidification months", () => {
  const result = run([
    humidificationCase(),
    dehumidificationCase(),
    {
      ...humidificationCase({
        monthlyHumidificationFraction: 0.5,
        mechanicalSupplyAirflowM3PerS: 0.2
      }),
      caseId: "feb-latent-humidification",
      month: "february"
    }
  ]);

  assert.equal(result.status, "ready");
  assert.equal(result.summary.caseCount, 3);
  assert.equal(result.summary.monthCount, 3);
  assertApprox(result.summary.annualHumidificationDemandKwh, 5.7375 + 22.95);
  assertApprox(result.summary.annualDehumidificationDemandKwh, 20);
  assert.equal(
    result.summary.annualLatentDemandFormulaCode,
    "MC001_RELATION_2_86_ANNUAL_LATENT_DEMAND_SUM"
  );
});

test("rejects missing cases and invalid mode", () => {
  assert.equal(calculateMc001LatentDemandExplicit().status, "blocked");
  assert.equal(
    calculateMc001LatentDemandExplicit().diagnostics.blockers[0].code,
    "latent_invalid_mode"
  );
  const missing = calculateMc001LatentDemandExplicit({
    mode: "chapter2_latent_demand_explicit_v1"
  });
  assert.equal(missing.status, "blocked");
  assert.equal(missing.diagnostics.blockers[0].code, "latent_missing_cases");
});

test("rejects invalid humidification dependencies", () => {
  assert.equal(
    run([humidificationCase({ monthlyHumidificationFraction: -0.1 })])
      .diagnostics.blockers[0].code,
    "latent_invalid_humidification_fraction"
  );
  assert.equal(
    run([humidificationCase({ latentHeatRecoveryEfficiency: 1.2 })])
      .diagnostics.blockers[0].code,
    "latent_invalid_latent_heat_recovery_efficiency"
  );
  assert.equal(
    run([humidificationCase({ annualMoistureSupplyKgHPerKg: undefined })])
      .diagnostics.blockers[0].code,
    "latent_missing_annual_moisture_supply"
  );
  assert.equal(
    run([
      humidificationCase({
        monthlyHumidificationFraction: undefined,
        heatingDemandFractionSource: {
          monthlyQHndKwh: 300,
          annualQHndKwh: 200,
          source: baseSource
        }
      })
    ]).diagnostics.blockers[0].code,
    "latent_humidification_fraction_exceeds_annual_QHnd"
  );
});

test("rejects invalid dehumidification dependencies", () => {
  assert.equal(
    run([dehumidificationCase({ sensibleCoolingDemandKwh: -1 })])
      .diagnostics.blockers[0].code,
    "latent_invalid_sensible_cooling_demand"
  );
  assert.equal(
    run([dehumidificationCase({ dehumidificationFraction: 1.1 })])
      .diagnostics.blockers[0].code,
    "latent_invalid_dehumidification_fraction"
  );
});

test("rejects client-supplied derived fields", () => {
  const result = run([
    {
      ...humidificationCase(),
      qHUnd: 4
    }
  ]);

  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].code, "latent_client_supplied_derived_result");
});

test("diagnostics keep Chapter 2 latent demand separate from downstream domains", () => {
  const result = run([humidificationCase(), dehumidificationCase()]);

  for (const expected of [
    "chapter_2_latent_demand_only",
    "explicit_input_only",
    "not_QHnd",
    "not_QCnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_CPE",
    "not_certificate",
    "no_hidden_defaults"
  ]) {
    assert.ok(result.diagnostics.methodologyLimits.includes(expected), expected);
  }
  for (const expected of [
    "final_energy",
    "primary_energy",
    "CO2",
    "CPE",
    "certificate"
  ]) {
    assert.ok(result.diagnostics.excludedCalculations.includes(expected), expected);
  }
});

test("module has no runtime PDF filesystem or network access", () => {
  const source = readFileSync(
    new URL("../mc001LatentDemandCalculation.mjs", import.meta.url),
    "utf8"
  );

  for (const forbidden of [
    "readFile",
    "writeFile",
    "fetch(",
    "XMLHttpRequest",
    ".pdf",
    "fitz"
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});
