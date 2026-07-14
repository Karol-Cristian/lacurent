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

function assertApprox(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
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

await test("adjacent unconditioned zone gains apply relations 2.34 and 2.37 with explicit factors", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input([
    sampleCase({
      adjacentUnconditionedZones: [
        {
          zoneId: "sunspace-a",
          internalGains: 50,
          solarGains: 100,
          bztu: 0.4,
          distributionFactor: 0.5,
          gainReductionFactor: 0.8
        }
      ]
    })
  ]));

  const caseResult = result.caseResults[0];
  const zone = caseResult.adjacentUnconditionedZoneResults[0];

  assert.equal(result.status, "ready");
  assert.equal(caseResult.directInternalGains, 120);
  assert.equal(caseResult.directSolarGains, 180);
  assert.equal(caseResult.adjacentInternalGains, 12);
  assert.equal(caseResult.adjacentSolarGains, 24);
  assert.equal(caseResult.internalGains, 132);
  assert.equal(caseResult.solarGains, 204);
  assert.equal(caseResult.qHgn, 336);
  assert.equal(caseResult.internalGainsOrigin, "calculated_with_adjacent_unconditioned_zone_relation_2_34");
  assert.equal(caseResult.solarGainsOrigin, "calculated_with_adjacent_unconditioned_zone_relation_2_37");
  assert.equal(
    caseResult.adjacentUnconditionedGainsFormulaCode,
    "MC001_RELATION_2_34_2_37_ADJACENT_UNCONDITIONED_ZONE_GAINS"
  );
  assert.equal(zone.zoneId, "sunspace-a");
  assert.equal(zone.bztuOrigin, "explicit_input");
  assert.equal(zone.distributionFactorOrigin, "explicit_input");
  assert.equal(zone.gainReductionFactorOrigin, "explicit_input");
  assert.equal(zone.internalGainContribution, 12);
  assert.equal(zone.solarGainContribution, 24);
});

await test("adjacent unconditioned zone relation 2.51 calculates single-zone gain reduction from explicit inputs", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input([
    sampleCase({
      internalGains: 10,
      solarGains: 20,
      adjacentUnconditionedZones: [
        {
          zoneId: "external-buffer-single",
          internalGains: 50,
          solarGains: 100,
          bztu: 0.4,
          distributionFactorInput: {
            mode: "single_adjacent_conditioned_zone_v1",
            singleAdjacentConditionedZoneConfirmed: true
          },
          gainReductionFactorInput: {
            mode: "external_single_adjacent_conditioned_zone_explicit_v1",
            heatTransferCoefficientToConditionedZone: 50,
            internalSetpointTemperature: 25,
            exteriorAirTemperature: 15,
            durationHours: 720
          }
        }
      ]
    })
  ]));

  const caseResult = result.caseResults[0];
  const zone = caseResult.adjacentUnconditionedZoneResults[0];

  assert.equal(result.status, "ready");
  assertApprox(zone.gainReductionFactor, 0.96);
  assert.equal(
    zone.gainReductionFormulaCode,
    "MC001_RELATION_2_51_SINGLE_ADJACENT_ZONE_GAIN_REDUCTION"
  );
  assert.equal(
    zone.distributionFormulaCode,
    "MC001_FIGURE_2_8_SINGLE_ADJACENT_DISTRIBUTION_FACTOR"
  );
  assertApprox(caseResult.adjacentInternalGains, 28.8);
  assertApprox(caseResult.adjacentSolarGains, 57.6);
  assertApprox(caseResult.internalGains, 38.8);
  assertApprox(caseResult.solarGains, 77.6);
  assertApprox(caseResult.qHgn, 116.4);
});

await test("adjacent unconditioned zone relation 2.52 calculates multiple-zone gain reduction from explicit inputs", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input([
    sampleCase({
      internalGains: 0,
      solarGains: 0,
      adjacentUnconditionedZones: [
        {
          zoneId: "external-buffer-multiple",
          internalGains: 100,
          solarGains: 200,
          bztu: 0.4,
          distributionFactorInput: {
            mode: "explicit_heat_transfer_share_v1",
            heatTransferCoefficientToTargetConditionedZone: 40,
            totalHeatTransferCoefficientToConditionedZones: 100
          },
          gainReductionFactorInput: {
            mode: "external_multiple_adjacent_conditioned_zones_explicit_v1",
            exteriorAirTemperature: 5,
            durationHours: 720,
            conditionedZoneHeatTransfers: [
              { heatTransferCoefficient: 30, internalSetpointTemperature: 20 },
              { heatTransferCoefficient: 20, internalSetpointTemperature: 18 }
            ]
          }
        }
      ]
    })
  ]));

  const caseResult = result.caseResults[0];
  const zone = caseResult.adjacentUnconditionedZoneResults[0];

  assert.equal(result.status, "ready");
  assertApprox(zone.gainReductionFactor, 0.6816);
  assert.equal(
    zone.gainReductionFormulaCode,
    "MC001_RELATION_2_52_MULTIPLE_ADJACENT_ZONES_GAIN_REDUCTION"
  );
  assert.equal(zone.distributionFactor, 0.4);
  assertApprox(caseResult.adjacentInternalGains, 16.3584);
  assertApprox(caseResult.adjacentSolarGains, 32.7168);
  assertApprox(caseResult.qHgn, 49.0752);
});

await test("adjacent internal unconditioned zone relation 2.53 uses explicit insignificant-gains confirmation", () => {
  const result = calculateMc001MonthlyHeatGainsExplicit(input([
    sampleCase({
      internalGains: 0,
      solarGains: 0,
      adjacentUnconditionedZones: [
        {
          zoneId: "internal-buffer",
          internalGains: 40,
          solarGains: 60,
          bztuInput: {
            mode: "bztu_explicit_heat_transfer_ratio_v1",
            heatTransferToExterior: 25,
            totalHeatTransfer: 100
          },
          distributionFactorInput: {
            mode: "single_adjacent_conditioned_zone_v1",
            singleAdjacentConditionedZoneConfirmed: true
          },
          gainReductionFactorInput: {
            mode: "internal_unconditioned_zone_insignificant_gains_v1",
            insignificantGainsConfirmed: true
          }
        }
      ]
    })
  ]));

  const caseResult = result.caseResults[0];
  const zone = caseResult.adjacentUnconditionedZoneResults[0];

  assert.equal(result.status, "ready");
  assert.equal(zone.bztu, 0.25);
  assert.equal(zone.bztuFormulaCode, "MC001_2_22_BZTU_CORRECTION_FACTOR");
  assert.equal(zone.gainReductionFactor, 1);
  assert.equal(
    zone.gainReductionFormulaCode,
    "MC001_RELATION_2_53_INTERNAL_UNCONDITIONED_ZONE_GAIN_REDUCTION"
  );
  assert.equal(caseResult.adjacentInternalGains, 30);
  assert.equal(caseResult.adjacentSolarGains, 45);
  assert.equal(caseResult.qHgn, 75);
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

await test("rejects invalid adjacent unconditioned zone inputs deterministically", () => {
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([
      sampleCase({
        adjacentUnconditionedZones: [
          {
            zoneId: "missing-bztu",
            internalGains: 10,
            solarGains: 20,
            distributionFactor: 1,
            gainReductionFactor: 1
          }
        ]
      })
    ])),
    "monthly_heat_gains_missing_explicit_bztu"
  );
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([
      sampleCase({
        adjacentUnconditionedZones: [
          {
            zoneId: "ambiguous-reduction",
            internalGains: 10,
            solarGains: 20,
            bztu: 0.4,
            distributionFactor: 1,
            gainReductionFactor: 1,
            gainReductionFactorInput: {
              mode: "internal_unconditioned_zone_insignificant_gains_v1",
              insignificantGainsConfirmed: true
            }
          }
        ]
      })
    ])),
    "monthly_heat_gains_ambiguous_gain_reduction_factor_source"
  );
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([
      sampleCase({
        adjacentUnconditionedZones: [
          {
            zoneId: "missing-confirmation",
            internalGains: 10,
            solarGains: 20,
            bztu: 0.4,
            distributionFactorInput: {
              mode: "single_adjacent_conditioned_zone_v1"
            },
            gainReductionFactor: 1
          }
        ]
      })
    ])),
    "monthly_heat_gains_missing_single_adjacent_zone_confirmation"
  );
  assertBlocked(
    calculateMc001MonthlyHeatGainsExplicit(input([
      sampleCase({
        adjacentUnconditionedZones: [
          {
            zoneId: "zero-denominator",
            internalGains: 0,
            solarGains: 0,
            bztu: 0.4,
            distributionFactor: 1,
            gainReductionFactorInput: {
              mode: "external_single_adjacent_conditioned_zone_explicit_v1",
              heatTransferCoefficientToConditionedZone: 50,
              internalSetpointTemperature: 20,
              exteriorAirTemperature: 0,
              durationHours: 720
            }
          }
        ]
      })
    ])),
    "monthly_heat_gains_invalid_gain_reduction_zero_gain_denominator"
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
    input([sampleCase({ adjacentUnconditionedZoneResults: [] })]),
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
  for (const limit of [
    "adjacent_unconditioned_zone_gains_allowed_when_explicit_source_backed",
    "no_default_bztu",
    "no_default_distribution_factor",
    "no_default_gain_reduction_factor"
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
