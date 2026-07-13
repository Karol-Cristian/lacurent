import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001ExplicitTotalHeatTransferSummary } from "../mc001ExplicitTotalHeatTransferCalculation.mjs";
import { calculateMc001MonthlyHeatGainsExplicit } from "../mc001MonthlyHeatGainsCalculation.mjs";
import { calculateMc001RestrictedHeatingQhndExplicit } from "../mc001RestrictedHeatingQhndCalculation.mjs";

const EPSILON = 1e-9;

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${actual} != ${expected}`);
}

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
    caseId: "jan-qhnd-restricted",
    month: "january",
    qHht: 1026.72,
    qHgn: 300,
    gammaH: 300 / 1026.72,
    etaHgn: 0.8,
    source: {
      reference: "manual_mvp_input"
    },
    ...overrides
  };
}

function longUnoccupiedCase(overrides = {}, adjustmentOverrides = {}) {
  return {
    caseId: "feb-long-unoccupied",
    month: "february",
    longUnoccupiedPeriodAdjustment: {
      qHndOccupied: 1000,
      qHndUnoccupied: 400,
      unoccupiedFraction: 10 / 28,
      ...adjustmentOverrides
    },
    source: {
      reference: "manual_mvp_input"
    },
    ...overrides
  };
}

function heatingIntermittencyCorrection(overrides = {}) {
  return {
    thetaIntSetH: 20,
    thetaExternal: 0,
    transmissionHeatTransferCoefficientWK: 50,
    ventilationHeatTransferCoefficientWK: 19,
    calculationDurationHours: 744,
    tauH: 16.666666666666668,
    reductionPeriods: [
      {
        periodId: "day",
        thetaIntSetHLow: 20,
        reductionDurationHours: 0,
        repetitionCount: 0
      },
      {
        periodId: "night",
        thetaIntSetHLow: 16,
        reductionDurationHours: 8,
        repetitionCount: 7
      },
      {
        periodId: "wknd",
        thetaIntSetHLow: 20,
        reductionDurationHours: 0,
        repetitionCount: 0
      }
    ],
    ...overrides
  };
}

function input(cases = [sampleCase()], overrides = {}) {
  return {
    mode: "restricted_heating_qhnd_explicit_v1",
    cases,
    ...overrides
  };
}

function assertBlocked(result, code = null) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
  if (code) {
    assert.equal(result.diagnostics.blockers[0].code, code);
  }
}

function heatGainsQHgn() {
  const heatGains = explicitMonthlyHeatGainsResult();
  assert.equal(heatGains.status, "ready");
  return heatGains.caseResults[0].qHgn;
}

function explicitMonthlyHeatGainsResult(overrides = {}) {
  const heatGains = calculateMc001MonthlyHeatGainsExplicit({
    mode: "monthly_heat_gains_explicit_v1",
    cases: [
      {
        caseId: "jan-heat-gains-explicit",
        month: overrides.month || "january",
        internalGains: 120,
        solarGains: 180,
        source: {
          reference: "manual_mvp_input"
        }
      }
    ]
  });
  assert.equal(heatGains.status, "ready");
  return {
    ...heatGains,
    ...overrides,
    caseResults: overrides.caseResults || heatGains.caseResults
  };
}

function c5ExplicitTotalTransferResult(overrides = {}) {
  const result = calculateMc001ExplicitTotalHeatTransferSummary({
    mode: "explicit_total_heat_transfer_summary_v1",
    transmissionEnergy: {
      amount: 133.92,
      unit: "kWh",
      source: {
        sourceType: "explicit_calculated_input",
        reference: "monthlyTransmissionResult.caseResults.0.energy"
      }
    },
    ventilationEnergy: {
      amount: 892.8,
      unit: "kWh",
      source: {
        sourceType: "explicit_calculated_input",
        reference: "ventilationTransferResult.caseResults.0.energy"
      }
    }
  });
  assert.equal(result.status, "ready");
  return {
    ...result,
    ...overrides,
    result: {
      ...result.result,
      ...(overrides.result || {})
    }
  };
}

await test("normal monthly heating case calculates restricted QHnd", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "restricted_heating_qhnd_explicit_input_only_not_full_mc001");
  close(result.caseResults[0].qHnd, 786.72);
  assert.equal(result.caseResults[0].qHhtOrigin, "explicit_input");
  assert.equal(result.caseResults[0].qHgnOrigin, "explicit_input");
  assert.equal(result.caseResults[0].etaHgnOrigin, "explicit_input");
  close(result.summary.annualQHnd, 786.72);
  assert.equal(result.summary.caseCount, 1);
  assert.equal(result.summary.monthCount, 1);
  assert.equal(result.caseResults[0].formulaCode, "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH");
});

await test("C5 explicit transfer can feed QHht with explicit etaHgn", () => {
  const payloadCase = sampleCase({
    explicitTotalHeatTransferResult: c5ExplicitTotalTransferResult()
  });
  delete payloadCase.qHht;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHht, 1026.72);
  assert.equal(result.caseResults[0].qHhtOrigin, "calculated_from_explicit_C5_transfer");
  assert.equal(
    result.caseResults[0].qHhtSourceScope,
    "explicit_transmission_plus_ventilation_heat_transfer_only_not_QHnd"
  );
  assert.equal(result.caseResults[0].qHhtSourceSymbol, "Q_total_transfer_explicit");
  close(result.caseResults[0].qHnd, 786.72);
  assert.equal(result.caseResults[0].etaHgnOrigin, "explicit_input");
});

await test("heating intermittency relations 2.59 to 2.73 can feed QHht with explicit etaHgn", () => {
  const payloadCase = sampleCase({
    heatingIntermittencyCorrection: heatingIntermittencyCorrection()
  });
  delete payloadCase.qHht;
  delete payloadCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHht, 980.64059861452);
  assert.equal(
    result.caseResults[0].qHhtOrigin,
    "calculated_from_explicit_heating_intermittency_correction"
  );
  assert.equal(
    result.caseResults[0].qHhtSourceScope,
    "heating_intermittency_explicit_input_only_not_full_QHnd"
  );
  assert.equal(result.caseResults[0].qHhtSourceSymbol, "QH;ht;ztc;m");
  close(result.caseResults[0].thetaIntCalcH, 19.10239595244117);
  close(result.caseResults[0].aHred, 0.9551197976220586);
  close(result.caseResults[0].dThetaFloat, 0.292192613370734);
  assert.equal(result.caseResults[0].heatingIntermittencyPeriodResults.length, 3);
  close(result.caseResults[0].heatingIntermittencyPeriodResults[1].dThetaRedMean, 0.8653593928661756);
  assert.equal(
    result.caseResults[0].heatingIntermittencyFormulaCode,
    "MC001_R11_HEATING_INTERMITTENCY_QHHT_FROM_CORRECTED_SETPOINT"
  );
  assert.equal(
    result.caseResults[0].heatingIntermittencySourcePackCode,
    "MC001_R11_HEATING_INTERMITTENCY_RELATIONS_2_59_TO_2_73_SOURCE_PACK"
  );
  close(result.caseResults[0].qHnd, 740.64059861452);
  close(result.summary.annualQHnd, 740.64059861452);
});

await test("heating intermittency QHht source works with calculated etaHgn from explicit aH", () => {
  const payloadCase = sampleCase({
    aH: 2,
    heatingIntermittencyCorrection: heatingIntermittencyCorrection()
  });
  delete payloadCase.qHht;
  delete payloadCase.etaHgn;
  delete payloadCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHht, 980.64059861452);
  close(result.caseResults[0].gammaH, 0.3059224760058369);
  close(result.caseResults[0].etaHgn, 0.933127671858881);
  close(result.caseResults[0].qHnd, 700.7022970568556);
  assert.equal(result.caseResults[0].etaHgnOrigin, "calculated_from_explicit_aH");
  assert.equal(
    result.caseResults[0].qHhtOrigin,
    "calculated_from_explicit_heating_intermittency_correction"
  );
});

await test("explicit internal and solar gains can feed QHgn", () => {
  const payloadCase = sampleCase({
    internalGains: 120,
    solarGains: 180
  });
  delete payloadCase.qHgn;
  delete payloadCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHgn, 300);
  assert.equal(result.caseResults[0].qHgnOrigin, "calculated_from_explicit_internal_and_solar_gains");
  assert.equal(result.caseResults[0].internalGains, 120);
  assert.equal(result.caseResults[0].solarGains, 180);
  assert.equal(result.caseResults[0].heatGainsFormulaCode, "MC001_EXPLICIT_MONTHLY_HEAT_GAINS_SUM");
  close(result.caseResults[0].qHnd, 786.72);
});

await test("explicit monthly heat gains result can feed QHgn", () => {
  const payloadCase = sampleCase({
    monthlyHeatGainsResult: explicitMonthlyHeatGainsResult()
  });
  delete payloadCase.qHgn;
  delete payloadCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHgn, 300);
  assert.equal(result.caseResults[0].qHgnOrigin, "calculated_from_explicit_monthly_heat_gains_result");
  assert.equal(result.caseResults[0].heatGainsScope, "monthly_heat_gains_explicit_input_only_not_full_QHnd");
  close(result.caseResults[0].qHnd, 786.72);
});

await test("calculated etaHgn path uses explicit aH and calculated gammaH", () => {
  const payloadCase = sampleCase({ aH: 2 });
  delete payloadCase.etaHgn;
  delete payloadCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].gammaH, 300 / 1026.72);
  close(result.caseResults[0].etaHgn, 0.9380237833186124);
  close(result.caseResults[0].qHnd, 745.3128650044164);
  assert.equal(result.caseResults[0].etaHgnOrigin, "calculated_from_explicit_aH");
  assert.equal(result.caseResults[0].aH, 2);
  assert.equal(result.caseResults[0].etaHgnFormulaCode, "MC001_FIGURE_2_14_HEATING_GAIN_UTILIZATION_FACTOR");
});

await test("C5 explicit transfer can feed QHht with explicit aH etaHgn calculation", () => {
  const payloadCase = sampleCase({
    aH: 2,
    explicitTotalHeatTransferResult: c5ExplicitTotalTransferResult()
  });
  delete payloadCase.qHht;
  delete payloadCase.etaHgn;
  delete payloadCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHht, 1026.72);
  assert.equal(result.caseResults[0].qHhtOrigin, "calculated_from_explicit_C5_transfer");
  close(result.caseResults[0].gammaH, 300 / 1026.72);
  close(result.caseResults[0].etaHgn, 0.9380237833186124);
  close(result.caseResults[0].qHnd, 745.3128650044164);
  assert.equal(result.caseResults[0].etaHgnOrigin, "calculated_from_explicit_aH");
});

await test("calculated etaHgn path supports gammaH equals one branch", () => {
  const payloadCase = sampleCase({
    qHht: 100,
    qHgn: 100,
    gammaH: 1,
    aH: 2
  });
  delete payloadCase.etaHgn;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].etaHgn, 2 / 3);
  close(result.caseResults[0].qHnd, 33.33333333333334);
  assert.equal(result.caseResults[0].etaHgnOrigin, "calculated_from_explicit_aH");
});

await test("C5 explicit transfer can feed QHht with explicit utilization dependencies", () => {
  const payloadCase = sampleCase({
    qHgn: heatGainsQHgn(),
    explicitTotalHeatTransferResult: c5ExplicitTotalTransferResult(),
    utilizationDependencies: {
      effectiveInternalHeatCapacityJPerK: 25200000,
      heatTransferCoefficientWK: 420,
      aH0: 1,
      tauH0: 15
    }
  });
  delete payloadCase.qHht;
  delete payloadCase.etaHgn;
  delete payloadCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHht, 1026.72);
  assert.equal(result.caseResults[0].qHhtOrigin, "calculated_from_explicit_C5_transfer");
  close(result.caseResults[0].tauH, 16.666666666666668);
  close(result.caseResults[0].aH, 2.111111111111111);
  close(result.caseResults[0].etaHgn, 0.9461187601596033);
  close(result.caseResults[0].qHnd, 742.8843719521191);
  assert.equal(result.caseResults[0].tauHOrigin, "calculated_from_explicit_total_heat_transfer_coefficient");
  assert.equal(result.caseResults[0].heatTransferCoefficientOrigin, "explicit_total_heat_transfer_coefficient");
  assert.equal(result.caseResults[0].etaHgnOrigin, "calculated_from_explicit_time_constant_dependencies");
});

await test("explicit coefficient components can derive tauH aH etaHgn and restricted QHnd", () => {
  const payloadCase = sampleCase({
    qHgn: heatGainsQHgn(),
    utilizationDependencies: {
      cmEffJPerK: 25200000,
      heatTransferCoefficientComponents: {
        transmissionCoefficientWK: 250,
        groundAdjacentCoefficientWK: 20,
        ventilationCoefficientWK: 150
      },
      aH0: 1,
      tauH0: 15
    }
  });
  delete payloadCase.etaHgn;
  delete payloadCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].heatTransferCoefficientWK, 420);
  assert.equal(result.caseResults[0].heatTransferCoefficientOrigin, "explicit_heat_transfer_coefficient_components");
  assert.equal(result.caseResults[0].tauHOrigin, "calculated_from_explicit_heat_transfer_coefficient_components");
  close(result.caseResults[0].tauH, 16.666666666666668);
  close(result.caseResults[0].aH, 2.111111111111111);
  close(result.caseResults[0].etaHgn, 0.9461187601596033);
  close(result.caseResults[0].qHnd, 742.8843719521191);
});

await test("explicit time constant dependencies calculate tauH aH etaHgn and restricted QHnd", () => {
  const payloadCase = sampleCase({
    qHgn: heatGainsQHgn(),
    utilizationDependencies: {
      effectiveInternalHeatCapacityJPerK: 25200000,
      heatTransferCoefficientWK: 420,
      aH0: 1,
      tauH0: 15
    }
  });
  delete payloadCase.etaHgn;
  delete payloadCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHgn, 300);
  close(result.caseResults[0].gammaH, 300 / 1026.72);
  close(result.caseResults[0].tauH, 16.666666666666668);
  close(result.caseResults[0].aH, 2.111111111111111);
  close(result.caseResults[0].etaHgn, 0.9461187601596033);
  close(result.caseResults[0].qHnd, 742.8843719521191);
  assert.equal(result.caseResults[0].tauHOrigin, "calculated_from_explicit_total_heat_transfer_coefficient");
  assert.equal(result.caseResults[0].aHOrigin, "calculated_from_explicit_tauH_dependencies");
  assert.equal(result.caseResults[0].etaHgnOrigin, "calculated_from_explicit_time_constant_dependencies");
  assert.equal(result.caseResults[0].tauHFormulaCode, "MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57");
  assert.equal(result.caseResults[0].aHFormulaCode, "MC001_R8_AH_PARAMETER_RELATION_2_55");
  assert.equal(result.caseResults[0].etaHgnFormulaCode, "MC001_FIGURE_2_14_HEATING_GAIN_UTILIZATION_FACTOR");
});

await test("blocks missing or invalid C5 explicit transfer source for QHht", () => {
  const missingPayloadCase = sampleCase({
    explicitTotalHeatTransferResult: {
      status: "ready",
      scope: "explicit_transmission_plus_ventilation_heat_transfer_only_not_QHnd"
    }
  });
  delete missingPayloadCase.qHht;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([missingPayloadCase])),
    "missing_explicit_C5_transfer_for_QHht"
  );

  const invalidPayloadCase = sampleCase({
    explicitTotalHeatTransferResult: c5ExplicitTotalTransferResult({
      result: { amount: 0 }
    })
  });
  delete invalidPayloadCase.qHht;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([invalidPayloadCase])),
    "invalid_explicit_C5_transfer_for_QHht"
  );
});

await test("rejects ambiguous direct and C5-derived QHht sources", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({
      explicitTotalHeatTransferResult: c5ExplicitTotalTransferResult()
    })])),
    "ambiguous_QHht_source"
  );
});

await test("rejects ambiguous direct and intermittency-derived QHht sources", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({
      heatingIntermittencyCorrection: heatingIntermittencyCorrection()
    })])),
    "ambiguous_QHht_source"
  );
});

await test("blocks missing explicit heating intermittency dependency", () => {
  const payloadCase = sampleCase({
    heatingIntermittencyCorrection: heatingIntermittencyCorrection({ tauH: undefined })
  });
  delete payloadCase.qHht;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "restricted_qhnd_heating_intermittency_failed_missing_explicit_tauH_for_intermittency"
  );
});

await test("gamma can be calculated from qHgn over qHht when omitted", () => {
  const payloadCase = sampleCase();
  delete payloadCase.gammaH;
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].gammaH, 300 / 1026.72);
  close(result.caseResults[0].qHnd, 786.72);
  assert.equal(result.caseResults[0].etaHgnOrigin, "explicit_input");
});

await test("gammaH less than or equal to zero with positive gains uses resolved zero-demand branch", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ gammaH: 0 })]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHnd, 0);
  assert.equal(result.caseResults[0].qHndBranch, "gammaH_less_or_equal_zero_positive_gains_zero_demand");
  assert.equal(result.caseResults[0].etaHgnOrigin, "not_required_for_resolved_zero_qhnd_branch");
});

await test("gammaH greater than two uses zero-demand branch", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ gammaH: 2.01 })]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHnd, 0);
  assert.equal(result.caseResults[0].qHndBranch, "gammaH_greater_than_two_zero_demand");
  assert.equal(result.caseResults[0].etaHgnOrigin, "not_required_for_gammaH_greater_than_two_zero_qhnd_branch");
});

await test("annual aggregation sums monthly restricted QHnd", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([
    sampleCase(),
    sampleCase({
      caseId: "feb-qhnd-restricted",
      month: "february",
      qHht: 500,
      qHgn: 100,
      gammaH: 0.2,
      etaHgn: 0.5
    })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHnd, 786.72);
  close(result.caseResults[1].qHnd, 450);
  close(result.summary.annualQHnd, 1236.72);
  assert.equal(result.summary.caseCount, 2);
  assert.equal(result.summary.monthCount, 2);
  assert.equal(result.caseResults[0].qHhtOrigin, "explicit_input");
  assert.equal(result.caseResults[1].qHhtOrigin, "explicit_input");
});

await test("multi-month aggregation supports mixed explicit QHht C5 QHht explicit eta aH and utilization dependencies", () => {
  const c5AHCase = sampleCase({
    caseId: "feb-qhnd-c5-aH",
    month: "february",
    aH: 2,
    explicitTotalHeatTransferResult: c5ExplicitTotalTransferResult()
  });
  delete c5AHCase.qHht;
  delete c5AHCase.etaHgn;
  delete c5AHCase.gammaH;

  const c5UtilizationCase = sampleCase({
    caseId: "mar-qhnd-c5-utilization",
    month: "march",
    qHgn: heatGainsQHgn(),
    explicitTotalHeatTransferResult: c5ExplicitTotalTransferResult(),
    utilizationDependencies: {
      effectiveInternalHeatCapacityJPerK: 25200000,
      heatTransferCoefficientWK: 420,
      aH0: 1,
      tauH0: 15
    }
  });
  delete c5UtilizationCase.qHht;
  delete c5UtilizationCase.etaHgn;
  delete c5UtilizationCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([
    sampleCase(),
    c5AHCase,
    c5UtilizationCase
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.summary.caseCount, 3);
  assert.equal(result.summary.monthCount, 3);
  close(result.caseResults[0].qHnd, 786.72);
  close(result.caseResults[1].qHnd, 745.3128650044164);
  close(result.caseResults[2].qHnd, 742.8843719521191);
  close(result.summary.annualQHnd, 2274.917236956536);
  assert.equal(result.caseResults[0].qHhtOrigin, "explicit_input");
  assert.equal(result.caseResults[0].etaHgnOrigin, "explicit_input");
  assert.equal(result.caseResults[1].qHhtOrigin, "calculated_from_explicit_C5_transfer");
  assert.equal(result.caseResults[1].etaHgnOrigin, "calculated_from_explicit_aH");
  assert.equal(result.caseResults[2].qHhtOrigin, "calculated_from_explicit_C5_transfer");
  assert.equal(result.caseResults[2].etaHgnOrigin, "calculated_from_explicit_time_constant_dependencies");
  assert.equal(result.caseResults[2].aHOrigin, "calculated_from_explicit_tauH_dependencies");
});

await test("golden smoke fixture covers restricted heating dependency spine", () => {
  const normalDependencyCase = sampleCase({
    caseId: "jan-golden-c5-gains-utilization",
    explicitTotalHeatTransferResult: c5ExplicitTotalTransferResult(),
    monthlyHeatGainsResult: explicitMonthlyHeatGainsResult(),
    utilizationDependencies: {
      effectiveInternalHeatCapacityJPerK: 25200000,
      heatTransferCoefficientWK: 420,
      aH0: 1,
      tauH0: 15
    }
  });
  delete normalDependencyCase.qHht;
  delete normalDependencyCase.qHgn;
  delete normalDependencyCase.gammaH;
  delete normalDependencyCase.etaHgn;

  const nonPositiveGammaCase = sampleCase({
    caseId: "feb-golden-nonpositive-gamma",
    month: "february",
    qHht: 800,
    qHgn: 50,
    gammaH: 0
  });
  delete nonPositiveGammaCase.etaHgn;

  const highGammaCase = sampleCase({
    caseId: "mar-golden-high-gamma",
    month: "march",
    qHht: 100,
    qHgn: 300
  });
  delete highGammaCase.gammaH;
  delete highGammaCase.etaHgn;

  const longUnoccupiedGoldenCase = longUnoccupiedCase({
    caseId: "apr-golden-long-unoccupied",
    month: "april"
  });
  const intermittencyGoldenCase = sampleCase({
    caseId: "may-golden-heating-intermittency",
    month: "may",
    heatingIntermittencyCorrection: heatingIntermittencyCorrection()
  });
  delete intermittencyGoldenCase.qHht;
  delete intermittencyGoldenCase.gammaH;

  const result = calculateMc001RestrictedHeatingQhndExplicit(input([
    normalDependencyCase,
    nonPositiveGammaCase,
    highGammaCase,
    longUnoccupiedGoldenCase,
    intermittencyGoldenCase
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "restricted_heating_qhnd_explicit_input_only_not_full_mc001");
  assert.equal(result.summary.caseCount, 5);
  assert.equal(result.summary.monthCount, 5);
  close(result.summary.annualQHnd, 2269.239256280925);

  const normalResult = result.caseResults[0];
  close(normalResult.qHht, 1026.72);
  assert.equal(normalResult.qHhtOrigin, "calculated_from_explicit_C5_transfer");
  assert.equal(normalResult.qHhtSourceScope, "explicit_transmission_plus_ventilation_heat_transfer_only_not_QHnd");
  assert.equal(normalResult.qHhtSourceSymbol, "Q_total_transfer_explicit");
  close(normalResult.qHgn, 300);
  assert.equal(normalResult.qHgnOrigin, "calculated_from_explicit_monthly_heat_gains_result");
  assert.equal(normalResult.heatGainsFormulaCode, "MC001_EXPLICIT_MONTHLY_HEAT_GAINS_SUM");
  assert.equal(normalResult.heatGainsScope, "monthly_heat_gains_explicit_input_only_not_full_QHnd");
  close(normalResult.gammaH, 300 / 1026.72);
  close(normalResult.tauH, 16.666666666666668);
  assert.equal(normalResult.tauHOrigin, "calculated_from_explicit_total_heat_transfer_coefficient");
  close(normalResult.aH, 2.111111111111111);
  assert.equal(normalResult.aHOrigin, "calculated_from_explicit_tauH_dependencies");
  close(normalResult.etaHgn, 0.9461187601596033);
  assert.equal(normalResult.etaHgnOrigin, "calculated_from_explicit_time_constant_dependencies");
  close(normalResult.qHnd, 742.8843719521191);

  const nonPositiveGammaResult = result.caseResults[1];
  assert.equal(nonPositiveGammaResult.qHhtOrigin, "explicit_input");
  assert.equal(nonPositiveGammaResult.qHgnOrigin, "explicit_input");
  assert.equal(nonPositiveGammaResult.qHndBranch, "gammaH_less_or_equal_zero_positive_gains_zero_demand");
  assert.equal(nonPositiveGammaResult.etaHgnOrigin, "not_required_for_resolved_zero_qhnd_branch");
  close(nonPositiveGammaResult.qHnd, 0);

  const highGammaResult = result.caseResults[2];
  assert.equal(highGammaResult.qHhtOrigin, "explicit_input");
  assert.equal(highGammaResult.qHgnOrigin, "explicit_input");
  close(highGammaResult.gammaH, 3);
  assert.equal(highGammaResult.qHndBranch, "gammaH_greater_than_two_zero_demand");
  assert.equal(highGammaResult.etaHgnOrigin, "not_required_for_gammaH_greater_than_two_zero_qhnd_branch");
  close(highGammaResult.qHnd, 0);

  const longUnoccupiedResult = result.caseResults[3];
  assert.equal(longUnoccupiedResult.caseId, "apr-golden-long-unoccupied");
  close(longUnoccupiedResult.qHndOccupied, 1000);
  close(longUnoccupiedResult.qHndUnoccupied, 400);
  close(longUnoccupiedResult.unoccupiedFraction, 10 / 28);
  close(longUnoccupiedResult.qHnd, 785.7142857142858);
  assert.equal(
    longUnoccupiedResult.qHndOrigin,
    "calculated_from_explicit_long_unoccupied_interpolation"
  );
  assert.equal(
    longUnoccupiedResult.longUnoccupiedFormulaCode,
    "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION"
  );

  const intermittencyResult = result.caseResults[4];
  assert.equal(intermittencyResult.caseId, "may-golden-heating-intermittency");
  close(intermittencyResult.qHht, 980.64059861452);
  assert.equal(
    intermittencyResult.qHhtOrigin,
    "calculated_from_explicit_heating_intermittency_correction"
  );
  close(intermittencyResult.thetaIntCalcH, 19.10239595244117);
  close(intermittencyResult.aHred, 0.9551197976220586);
  close(intermittencyResult.dThetaFloat, 0.292192613370734);
  assert.equal(intermittencyResult.heatingIntermittencyPeriodResults.length, 3);
  close(intermittencyResult.heatingIntermittencyPeriodResults[1].dThetaRedMean, 0.8653593928661756);
  assert.equal(
    intermittencyResult.heatingIntermittencyFormulaCode,
    "MC001_R11_HEATING_INTERMITTENCY_QHHT_FROM_CORRECTED_SETPOINT"
  );
  close(intermittencyResult.qHnd, 740.64059861452);

  for (const limit of [
    "restricted_heating_only",
    "explicit_input_only",
    "not_full_QHnd",
    "not_QCnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate",
    "no_hidden_defaults"
  ]) {
    assert.ok(result.diagnostics.methodologyLimits.includes(limit), `missing ${limit}`);
  }
});

await test("long unoccupied relation 2.76 interpolates explicit occupied and unoccupied QHnd", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([longUnoccupiedCase()]));

  assert.equal(result.status, "ready");
  assert.equal(result.caseResults[0].caseId, "feb-long-unoccupied");
  close(result.caseResults[0].qHndOccupied, 1000);
  close(result.caseResults[0].qHndUnoccupied, 400);
  close(result.caseResults[0].unoccupiedFraction, 10 / 28);
  close(result.caseResults[0].qHnd, 785.7142857142858);
  assert.equal(
    result.caseResults[0].qHndOrigin,
    "calculated_from_explicit_long_unoccupied_interpolation"
  );
  assert.equal(result.caseResults[0].qHndBranch, "long_unoccupied_period_explicit_interpolation");
  assert.equal(
    result.caseResults[0].longUnoccupiedFormulaCode,
    "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION"
  );
  assert.equal(result.caseResults[0].formulaCode, "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION");
  close(result.summary.annualQHnd, 785.7142857142858);
});

await test("multi-month aggregation supports one normal month and one long unoccupied month", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([
    sampleCase(),
    longUnoccupiedCase()
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.summary.caseCount, 2);
  assert.equal(result.summary.monthCount, 2);
  close(result.caseResults[0].qHnd, 786.72);
  close(result.caseResults[1].qHnd, 785.7142857142858);
  close(result.summary.annualQHnd, 1572.434285714286);
});

await test("long unoccupied branch blocks missing explicit interpolation inputs", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([
      longUnoccupiedCase({}, { qHndUnoccupied: undefined })
    ])),
    "missing_explicit_long_unoccupied_adjustment_inputs"
  );
});

await test("long unoccupied branch blocks invalid fraction and negative explicit QHnd", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([
      longUnoccupiedCase({}, { unoccupiedFraction: 1.01 })
    ])),
    "invalid_explicit_long_unoccupied_fraction"
  );
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([
      longUnoccupiedCase({}, { qHndOccupied: -1 })
    ])),
    "invalid_explicit_long_unoccupied_QHnd"
  );
});

await test("long unoccupied branch rejects ambiguous normal QHnd inputs", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([
      longUnoccupiedCase({ qHht: 1026.72 })
    ])),
    "ambiguous_long_unoccupied_qhnd_source"
  );
});

await test("heating intermittency relations 2.59 to 2.73 are machine encoded and usable", () => {
  const payloadCase = sampleCase({
    heatingIntermittencyCorrection: heatingIntermittencyCorrection()
  });
  delete payloadCase.qHht;
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));
  assert.equal(result.status, "ready");
  assert.equal(
    result.caseResults[0].qHhtOrigin,
    "calculated_from_explicit_heating_intermittency_correction"
  );
  assert.equal(
    result.formulaReferences.includes(
      "MC001_R11_HEATING_INTERMITTENCY_RELATIONS_2_59_TO_2_73_SOURCE_PACK"
    ),
    true
  );
});

await test("multi-month aggregation blocks duplicate case identifiers", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([
      sampleCase(),
      sampleCase({ month: "february" })
    ])),
    "duplicate_monthly_case_identifier"
  );
});

await test("missing or invalid monthly case arrays are blocked", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit({ mode: "restricted_heating_qhnd_explicit_v1" }),
    "missing_monthly_restricted_heating_cases"
  );
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([])),
    "missing_monthly_restricted_heating_cases"
  );
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit({
      mode: "restricted_heating_qhnd_explicit_v1",
      cases: {}
    }),
    "invalid_monthly_restricted_heating_cases"
  );
});

await test("multi-month aggregation blocks invalid monthly case identifiers", () => {
  const invalidCase = sampleCase({ caseId: "" });
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([
      sampleCase(),
      invalidCase
    ])),
    "invalid_monthly_case_identifier"
  );
});

await test("failed monthly case blocks aggregation without partial annual total", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([
    sampleCase(),
    sampleCase({
      caseId: "feb-qhnd-invalid",
      month: "february",
      qHgn: -1
    })
  ]));

  assertBlocked(result, "monthly_restricted_heating_case_failed");
  assert.equal(result.caseResults.length, 0);
  assert.equal(result.summary.annualQHnd, 0);
  assert.equal(result.summary.caseCount, 0);
  assert.equal(result.summary.monthCount, 0);
});

await test("rejects gammaH less than or equal to zero without positive gains", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ gammaH: 0, qHgn: 0 })])),
    "restricted_qhnd_gammaH_less_or_equal_zero"
  );
});

await test("gammaH greater than two no longer requires etaHgn calculation", () => {
  const payloadCase = sampleCase({ gammaH: 2.01, aH: 2 });
  delete payloadCase.etaHgn;
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));
  assert.equal(result.status, "ready");
  close(result.caseResults[0].qHnd, 0);
});

await test("rejects ambiguous QHgn sources", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({
      internalGains: 120,
      solarGains: 180
    })])),
    "ambiguous_QHgn_source"
  );
});

await test("rejects incomplete heat gain components for QHgn", () => {
  const payloadCase = sampleCase({ internalGains: 120 });
  delete payloadCase.qHgn;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "incomplete_explicit_heat_gains_for_QHgn"
  );
});

await test("rejects invalid monthly heat gains result for QHgn", () => {
  const payloadCase = sampleCase({
    monthlyHeatGainsResult: explicitMonthlyHeatGainsResult({
      caseResults: [
        {
          ...explicitMonthlyHeatGainsResult().caseResults[0],
          month: "february"
        }
      ]
    })
  });
  delete payloadCase.qHgn;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "invalid_explicit_monthly_heat_gains_result_for_QHgn"
  );
});

await test("rejects qHht less than or equal to zero", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ qHht: 0 })])),
    "restricted_qhnd_invalid_qHht"
  );
});

await test("rejects qHgn below zero", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ qHgn: -1 })])),
    "restricted_qhnd_invalid_qHgn"
  );
});

await test("rejects both etaHgn and aH present", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ aH: 2 })])),
    "etaHgn_and_aH_are_mutually_exclusive_in_c7c"
  );
});

await test("rejects neither etaHgn nor aH present", () => {
  const payloadCase = sampleCase();
  delete payloadCase.etaHgn;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "etaHgn_aH_or_utilization_dependencies_required"
  );
});

await test("rejects mutually exclusive etaHgn and utilization dependency inputs", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({
      utilizationDependencies: {
        effectiveInternalHeatCapacityJPerK: 25200000,
        heatTransferCoefficientWK: 420,
        aH0: 1,
        tauH0: 15
      }
    })])),
    "etaHgn_aH_and_utilization_dependencies_are_mutually_exclusive_in_c6g"
  );
});

await test("blocks missing explicit dependencies for time constant aH path", () => {
  const baseDependencies = {
    effectiveInternalHeatCapacityJPerK: 25200000,
    heatTransferCoefficientWK: 420,
    aH0: 1,
    tauH0: 15
  };
  const missingCases = [
    ["effectiveInternalHeatCapacityJPerK", "missing_explicit_capacity_for_tauH"],
    ["heatTransferCoefficientWK", "missing_explicit_heat_transfer_coefficient_for_tauH"],
    ["aH0", "missing_explicit_aH0_for_aH"],
    ["tauH0", "missing_explicit_tauH0_for_aH"]
  ];

  for (const [field, code] of missingCases) {
    const payloadCase = sampleCase({
      utilizationDependencies: { ...baseDependencies }
    });
    delete payloadCase.etaHgn;
    delete payloadCase.utilizationDependencies[field];
    assertBlocked(
      calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
      code
    );
  }
});

await test("rejects aH less than or equal to zero", () => {
  const payloadCase = sampleCase({ aH: 0 });
  delete payloadCase.etaHgn;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "restricted_qhnd_invalid_aH"
  );
});

await test("rejects ambiguous tauH heat transfer coefficient sources", () => {
  const payloadCase = sampleCase({
    aH: undefined,
    utilizationDependencies: {
      effectiveInternalHeatCapacityJPerK: 25200000,
      heatTransferCoefficientWK: 420,
      totalHeatTransferCoefficientWK: 420,
      aH0: 1,
      tauH0: 15
    }
  });
  delete payloadCase.etaHgn;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "ambiguous_explicit_heat_transfer_coefficient_for_tauH"
  );
});

await test("rejects missing explicit tauH coefficient component", () => {
  const payloadCase = sampleCase({
    utilizationDependencies: {
      effectiveInternalHeatCapacityJPerK: 25200000,
      heatTransferCoefficientComponents: {
        transmissionCoefficientWK: 250,
        ventilationCoefficientWK: 150
      },
      aH0: 1,
      tauH0: 15
    }
  });
  delete payloadCase.etaHgn;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "missing_explicit_heat_transfer_coefficient_component_for_tauH"
  );
});

await test("rejects calculated etaHgn path with qHht less than or equal to zero", () => {
  const payloadCase = sampleCase({ qHht: 0, aH: 2 });
  delete payloadCase.etaHgn;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "restricted_qhnd_invalid_qHht"
  );
});

await test("rejects calculated etaHgn path with qHgn below zero", () => {
  const payloadCase = sampleCase({ qHgn: -1, aH: 2 });
  delete payloadCase.etaHgn;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "restricted_qhnd_invalid_qHgn"
  );
});

await test("rejects negative restricted QHnd result", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({
      qHht: 10,
      qHgn: 20,
      gammaH: 2,
      etaHgn: 0.8
    })])),
    "restricted_qhnd_negative_result_outside_c6f_scope"
  );
});

await test("rejects NaN or Infinity", () => {
  const results = [
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ qHht: NaN })])),
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ qHgn: Infinity })])),
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ etaHgn: Infinity })]))
  ];
  results.forEach(result => assertBlocked(result));
});

await test("rejects missing source", () => {
  const payloadCase = sampleCase();
  delete payloadCase.source;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "restricted_qhnd_missing_explicit_source"
  );
});

await test("rejects missing and empty cases", () => {
  assertBlocked(calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1"
  }), "missing_monthly_restricted_heating_cases");
  assertBlocked(calculateMc001RestrictedHeatingQhndExplicit(input([])), "missing_monthly_restricted_heating_cases");
});

await test("rejects invalid month and unsupported mode", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ month: "jan" })])),
    "restricted_qhnd_invalid_month"
  );
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase()], { mode: "full_qhnd" })),
    "restricted_qhnd_invalid_mode"
  );
});

await test("rejects client supplied derived fields", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ qHnd: 1 })])),
    "restricted_qhnd_client_supplied_derived_result"
  );
});

await test("scope and diagnostics say restricted and exclude downstream claims", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input());

  assert.equal(result.scope, "restricted_heating_qhnd_explicit_input_only_not_full_mc001");
  for (const limit of [
    "restricted_heating_only",
    "explicit_input_only",
    "not_full_QHnd",
    "not_QCnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate",
    "long_unoccupied_periods_explicit_interpolation_only",
    "heating_intermittency_explicit_correction_only",
    "no_hidden_defaults",
    "etaHgn_calculated_from_explicit_aH_when_etaHgn_missing",
    "aH_calculated_from_explicit_tauH_dependencies_when_aH_missing",
    "tauH_calculated_from_explicit_capacity_and_heat_transfer_coefficient",
    "no_default_aH0",
    "no_default_tauH0",
    "no_default_tauH",
    "no_default_capacity"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
  for (const branch of [
    "gammaH_less_or_equal_zero_without_positive_gains",
    "cooling_QCnd"
  ]) {
    assert.equal(result.diagnostics.excludedBranches.includes(branch), true, `missing ${branch}`);
  }
  assert.equal(result.diagnostics.excludedBranches.includes("long_unoccupied_periods"), false);
  assert.equal(result.diagnostics.excludedBranches.includes("intermittency"), false);
});

await test("long unoccupied and heating intermittency are implemented while downstream scope stays blocked", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input());

  assert.equal(result.status, "ready");
  assert.equal(
    result.diagnostics.methodologyLimits.includes("long_unoccupied_periods_explicit_interpolation_only"),
    true
  );
  assert.equal(result.diagnostics.methodologyLimits.includes("no_hidden_defaults"), true);
  assert.equal(result.diagnostics.excludedBranches.includes("long_unoccupied_periods"), false);
  assert.equal(result.diagnostics.excludedBranches.includes("intermittency"), false);
  assert.equal(result.formulaReferences.includes("MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"), true);
  assert.equal(
    result.formulaReferences.includes("MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION"),
    true
  );
  assert.equal(
    result.formulaReferences.includes(
      "MC001_R11_HEATING_INTERMITTENCY_RELATIONS_2_59_TO_2_73_SOURCE_PACK"
    ),
    true
  );
  assert.equal(result.formulaReferences.some(reference => /2\.77/i.test(reference)), false);
});

await test("module has no filesystem network PDF or registry-as-calculator behavior", () => {
  const source = readFileSync(
    new URL("../mc001RestrictedHeatingQhndCalculation.mjs", import.meta.url),
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
