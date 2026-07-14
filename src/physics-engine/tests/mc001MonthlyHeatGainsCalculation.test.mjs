import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001MonthlyHeatGainsExplicit } from "../mc001MonthlyHeatGainsCalculation.mjs";
import { calculateMc001MonthlySolarGainsExplicit } from "../mc001SolarGainsCalculation.mjs";

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function sampleCase(overrides = {}) {
  return {
    caseId: "jan-heat-gains-explicit",
    month: "january",
    internalGains: 120,
    solarGains: 180,
    source: {
      reference: "manual_mvp_input"
    },
    ...overrides
  };
}

function input(cases = [sampleCase()], overrides = {}) {
  return {
    mode: "monthly_heat_gains_explicit_v1",
    cases,
    ...overrides
  };
}

function solarGainsResult(month = "january") {
  return calculateMc001MonthlySolarGainsExplicit({
    mode: "monthly_solar_gains_explicit_v1",
    cases: [
      {
        caseId: `${month}-solar-gains`,
        month,
        transparentElements: [
          {
            elementId: "south-window",
            area: 10,
            frameFraction: 0.25,
            effectiveSolarTransmittance: 0.675,
            obstacleShadingFactor: 0.8,
            solarIrradiation: 100,
            qSky: 5
          }
        ],
        opaqueElements: [
          {
            elementId: "south-wall",
            area: 20,
            solarAbsorptance: 0.6,
            exteriorSurfaceResistance: 0.04,
            uValue: 0.3,
            obstacleShadingFactor: 0.9,
            solarIrradiation: 100,
            qSky: 1
          }
        ],
        source: { reference: "manual_explicit_solar_inputs" }
      }
    ]
  });
}

function assertBlocked(result, code = null) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
  if (code) {
    assert.equal(result.diagnostics.blockers[0].code, code);
  }
}

await test("single January case sums explicit internal and solar gains", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "monthly_heat_gains_explicit_input_only_not_full_QHnd");
  assert.equal(result.caseResults[0].internalGains, 120);
  assert.equal(result.caseResults[0].solarGains, 180);
  assert.equal(result.caseResults[0].qHgn, 300);
  assert.equal(result.caseResults[0].formulaCode, "MC001_EXPLICIT_MONTHLY_HEAT_GAINS_SUM");
  assert.equal(result.summary.annualQHgn, 300);
  assert.equal(result.summary.caseCount, 1);
});

await test("two-month annual aggregation sums explicit gains", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input([
    sampleCase(),
    sampleCase({
      caseId: "feb-heat-gains-explicit",
      month: "february",
      internalGains: 100,
      solarGains: 50
    })
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.caseResults[0].qHgn, 300);
  assert.equal(result.caseResults[1].qHgn, 150);
  assert.equal(result.summary.annualQHgn, 450);
  assert.equal(result.summary.caseCount, 2);
});

await test("solar gains can come from source-backed monthly solar gains result", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input([
    sampleCase({
      solarGains: undefined,
      solarGainsResult: solarGainsResult()
    })
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.caseResults[0].internalGains, 120);
  assert.equal(result.caseResults[0].solarGains, 411.96);
  assert.equal(result.caseResults[0].solarGainsOrigin, "calculated_from_explicit_monthly_solar_gains_result");
  assert.equal(result.caseResults[0].solarGainsFormulaCode, "MC001_RELATION_2_36_2_38_MONTHLY_SOLAR_GAINS");
  assert.equal(result.caseResults[0].qHgn, 531.96);
  assert.equal(result.summary.annualQHgn, 531.96);
});

await test("rejects ambiguous direct solar gains plus solar gains result", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([
      sampleCase({ solarGainsResult: solarGainsResult() })
    ])),
    "monthly_heat_gains_solar_gains_and_solar_result_mutually_exclusive"
  );
});

await test("rejects invalid solar gains result source", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([
      sampleCase({
        solarGains: undefined,
        solarGainsResult: { status: "ready", scope: "wrong", caseResults: [] }
      })
    ])),
    "monthly_heat_gains_invalid_solar_gains_result"
  );
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([
      sampleCase({
        month: "february",
        solarGains: undefined,
        solarGainsResult: solarGainsResult("january")
      })
    ])),
    "monthly_heat_gains_solar_gains_result_month_mismatch"
  );
});

await test("zero internal gains component is allowed", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input([
    sampleCase({ internalGains: 0, solarGains: 100 })
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.caseResults[0].qHgn, 100);
});

await test("both zero gains are allowed for explicit heat gains sum", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input([
    sampleCase({ internalGains: 0, solarGains: 0 })
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.caseResults[0].qHgn, 0);
  assert.equal(result.summary.annualQHgn, 0);
});

await test("rejects missing cases", () => {
  assertBlocked(calculateMc001MonthlyHeatGainsExplicit({
    mode: "monthly_heat_gains_explicit_v1"
  }), "monthly_heat_gains_missing_cases");
});

await test("rejects empty cases", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([])),
    "monthly_heat_gains_missing_cases"
  );
});

await test("rejects unsupported mode", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([sampleCase()], { mode: "monthly_heat_gains_full" })),
    "monthly_heat_gains_invalid_mode"
  );
});

await test("rejects missing or invalid caseId", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([sampleCase({ caseId: "" })])),
    "monthly_heat_gains_invalid_case_id"
  );
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([sampleCase({ caseId: "invalid id with spaces" })])),
    "monthly_heat_gains_invalid_case_id"
  );
});

await test("rejects invalid month", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([sampleCase({ month: "not-a-month" })])),
    "monthly_heat_gains_invalid_month"
  );
});

await test("rejects missing source reference", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([sampleCase({ source: {} })])),
    "monthly_heat_gains_missing_explicit_source"
  );
});

await test("rejects missing internal gains", () => {
  const payloadCase = sampleCase();
  delete payloadCase.internalGains;
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([payloadCase])),
    "monthly_heat_gains_missing_internal_gains"
  );
});

await test("rejects missing solar gains", () => {
  const payloadCase = sampleCase();
  delete payloadCase.solarGains;
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([payloadCase])),
    "monthly_heat_gains_missing_solar_gains"
  );
});

await test("rejects negative internal gains", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([sampleCase({ internalGains: -1 })])),
    "monthly_heat_gains_negative_internal_gains"
  );
});

await test("rejects negative solar gains", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([sampleCase({ solarGains: -1 })])),
    "monthly_heat_gains_negative_solar_gains"
  );
});

await test("rejects NaN or Infinity", () => {
  for (const payloadCase of [
    sampleCase({ internalGains: NaN }),
    sampleCase({ solarGains: Infinity })
  ]) {
    assertBlocked(calculateMc001MonthlyHeatGainsExplicit(input([payloadCase])));
  }
});

await test("rejects client supplied derived fields", () => {
  const derivedPayloads = [
    input([sampleCase({ qHgn: 300 })]),
    input([sampleCase()], { annualQHgn: 300 }),
    input([sampleCase()], { caseResults: [] }),
    input([sampleCase()], { summary: { annualQHgn: 300 } }),
    input([sampleCase()], { result: { qHgn: 300 } }),
    input([sampleCase()], { totalGains: 300 }),
    input([sampleCase()], { heatGainsResult: { summary: {} } }),
    input([sampleCase()], { solarGainsResult: { summary: {} } })
  ];

  for (const payload of derivedPayloads) {
    assertBlocked(
      calculateMc001MonthlyHeatGainsExplicit(payload),
      "monthly_heat_gains_client_supplied_derived_result"
    );
  }
});

await test("diagnostics state explicit restricted heat gains scope", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input());

  for (const limit of [
    "explicit_input_only",
    "heat_gains_sum_only",
    "not_full_QHnd",
    "not_QCnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate",
    "no_hidden_defaults"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
  for (const excluded of [
    "internal_gains_from_occupancy_or_equipment",
    "solar_gains_from_geometry_or_radiation",
    "utilization_factor",
    "QHnd",
    "QCnd",
    "final_energy",
    "primary_energy",
    "CO2",
    "certificate"
  ]) {
    assert.equal(result.diagnostics.excludedCalculations.includes(excluded), true, `missing ${excluded}`);
  }
});

await test("module has no filesystem network PDF or registry-as-calculator behavior", () => {
  const source = readFileSync(
    new URL("../mc001MonthlyHeatGainsCalculation.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
    "node:fs",
    "readFile",
    "fetch(",
    "XMLHttpRequest",
    ".pdf",
    "PDF",
    "getMc001Normative",
    "sourcePack"
  ]) {
    assert.equal(source.includes(forbidden), false, `found ${forbidden}`);
  }
});
