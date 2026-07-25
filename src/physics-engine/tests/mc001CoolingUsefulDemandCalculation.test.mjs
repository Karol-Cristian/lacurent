import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001CoolingUsefulDemandExplicit } from "../mc001CoolingUsefulDemandCalculation.mjs";
import { calculateMc001MonthlyHeatGainsExplicit } from "../mc001MonthlyHeatGainsCalculation.mjs";
import { validateMc001ExecutionTrace } from "../mc001ExecutionTrace.mjs";

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
    caseId: "jan-qcnd-restricted",
    month: "january",
    qCht: 300,
    qCgn: 600,
    aC: 2,
    aCred: 1,
    source: {
      reference: "manual_mvp_input"
    },
    ...overrides
  };
}

function input(cases = [sampleCase()], overrides = {}) {
  return {
    mode: "restricted_cooling_qcnd_explicit_v1",
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

await test("normal monthly cooling case calculates QCnd from explicit aC", () => {
  const result = calculateMc001CoolingUsefulDemandExplicit(input());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "restricted_cooling_qcnd_explicit_input_only_not_full_mc001");
  close(result.caseResults[0].gammaC, 2);
  close(result.caseResults[0].etaCht, 0.8571428571428571);
  close(result.caseResults[0].qCnd, 342.8571428571429);
  close(result.summary.annualQCnd, 342.8571428571429);
  assert.equal(result.caseResults[0].etaChtOrigin, "calculated_from_explicit_aC");
  assert.equal(result.caseResults[0].qCndBranch, "figure_2_19_cooling_utilized_transfer_branch");
  assert.equal(result.caseResults[0].executionTrace.branchId, "figure_2_19_cooling_utilized_transfer_branch");
  assert.equal(validateMc001ExecutionTrace(result.caseResults[0].executionTrace).ok, true);
});

await test("explicit etaCht path remains available", () => {
  const result = calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({ etaCht: 0.8, aC: undefined })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qCnd, 360);
  assert.equal(result.caseResults[0].etaChtOrigin, "explicit_input");
  assert.equal(result.caseResults[0].aCredOrigin, "explicit_input");
});

await test("utilization dependencies derive tauC then aC then etaCht", () => {
  const dependencies = {
    effectiveInternalHeatCapacityJPerK: 25200000,
    totalHeatTransferCoefficientWK: 420,
    aC0: 1,
    tauC0: 15
  };
  const result = calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({
      aC: undefined,
      aCred: undefined,
      utilizationDependencies: dependencies,
      coolingIntermittency: {
        weekendReductionDurationHours: 48,
        weekendReductionRepetitionCount: 1,
        bCredWknd: 0.3
      }
    })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].tauC, 16.666666666666668);
  close(result.caseResults[0].aC, 2.111111111111111);
  close(result.caseResults[0].etaCht, 0.8691181348038218);
  close(result.caseResults[0].aCred, 0.8);
  close(result.caseResults[0].qCnd, 271.4116476470828);
  assert.equal(result.caseResults[0].tauCOrigin, "calculated_from_explicit_total_heat_transfer_coefficient");
  assert.equal(result.caseResults[0].aCOrigin, "calculated_from_explicit_tauC_dependencies");
  assert.equal(result.caseResults[0].etaChtOrigin, "calculated_from_explicit_time_constant_dependencies");
  assert.equal(result.caseResults[0].aCredOrigin, "calculated_from_explicit_weekend_cooling_reduction");
});

await test("Table 2.20 capacity class can derive tauC aC etaCht and restricted QCnd", () => {
  const result = calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({
      aC: undefined,
      aCred: undefined,
      utilizationDependencies: {
        effectiveInternalHeatCapacityTable2_20ClassId: "medium",
        usefulFloorAreaM2: 120,
        totalHeatTransferCoefficientWK: 420,
        aC0: 1,
        tauC0: 15
      },
      coolingIntermittency: {
        weekendReductionDurationHours: 48,
        weekendReductionRepetitionCount: 1,
        bCredWknd: 0.3
      }
    })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].effectiveInternalHeatCapacityJPerK, 19800000);
  close(result.caseResults[0].cmIntEffCoefficientJPerM2K, 165000);
  assert.equal(result.caseResults[0].effectiveInternalHeatCapacityClassId, "medium");
  assert.equal(result.caseResults[0].usefulFloorAreaM2, 120);
  assert.equal(
    result.caseResults[0].effectiveInternalHeatCapacityOrigin,
    "calculated_from_MC001_TABLE_2_20_class_and_explicit_Ause"
  );
  assert.equal(
    result.caseResults[0].effectiveInternalHeatCapacityFormulaCode,
    "MC001_TABLE_2_20_EFFECTIVE_INTERNAL_HEAT_CAPACITY_CLASS_AREA"
  );
  close(result.caseResults[0].tauC, 13.095238095238095);
  close(result.caseResults[0].aC, 1.873015873015873);
  close(result.caseResults[0].etaCht, 0.8419209786317079);
  close(result.caseResults[0].aCred, 0.8);
  close(result.caseResults[0].qCnd, 277.9389651283901);
  assert.equal(result.caseResults[0].tauCOrigin, "calculated_from_explicit_total_heat_transfer_coefficient");
  assert.equal(result.caseResults[0].aCOrigin, "calculated_from_explicit_tauC_dependencies");
  assert.equal(result.caseResults[0].etaChtOrigin, "calculated_from_explicit_time_constant_dependencies");
  assert.ok(
    result.diagnostics.methodologyLimits.includes(
      "capacity_can_be_calculated_from_explicit_table_2_20_class_and_Ause"
    )
  );
});

await test("qCgn can come from explicit internal and solar gains", () => {
  const result = calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({
      qCgn: undefined,
      internalGains: 120,
      solarGains: 480
    })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qCgn, 600);
  assert.equal(result.caseResults[0].qCgnOrigin, "calculated_from_explicit_internal_and_solar_gains");
  assert.equal(result.caseResults[0].internalGains, 120);
  assert.equal(result.caseResults[0].solarGains, 480);
});

await test("qCgn can come from explicit monthly heat gains result", () => {
  const heatGains = calculateMc001MonthlyHeatGainsExplicit({
    mode: "monthly_heat_gains_explicit_v1",
    cases: [
      {
        caseId: "jan-cooling-gains",
        month: "january",
        internalGains: 120,
        solarGains: 480,
        source: {
          reference: "manual_mvp_input"
        }
      }
    ]
  });
  const result = calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({
      qCgn: undefined,
      monthlyHeatGainsResult: heatGains
    })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qCgn, 600);
  assert.equal(result.caseResults[0].qCgnOrigin, "calculated_from_explicit_monthly_heat_gains_result");
});

await test("zero cooling heat-transfer term produces zero monthly cooling demand", () => {
  const result = calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({
      caseId: "jan-zero-cooling-transfer",
      qCht: 0,
      qCgn: 300,
      etaCht: undefined,
      aC: undefined,
      aCred: undefined
    })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qCnd, 0);
  assert.equal(result.caseResults[0].gammaC, null);
  assert.equal(result.caseResults[0].qCndBranch, "qCht_zero_zero_cooling_demand");
  assert.equal(result.caseResults[0].etaChtOrigin, "not_required_for_qCht_zero_zero_cooling_demand");
  assert.equal(result.caseResults[0].executionTrace.status, "branch_result");
  assert.equal(result.caseResults[0].executionTrace.expression, undefined);
  assert.equal(validateMc001ExecutionTrace(result.caseResults[0].executionTrace).ok, true);
  close(result.summary.annualQCnd, 0);
});

await test("cooling zero demand boundary branches are implemented", () => {
  const zeroGamma = calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({
      caseId: "feb-zero-gamma",
      month: "february",
      qCht: 1000,
      qCgn: 0,
      aC: undefined,
      aCred: undefined
    })
  ]));
  const inverseGamma = calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({
      caseId: "mar-low-gamma",
      month: "march",
      qCht: 1000,
      qCgn: 300,
      aC: undefined,
      aCred: undefined
    })
  ]));

  assert.equal(zeroGamma.status, "ready");
  close(zeroGamma.caseResults[0].qCnd, 0);
  assert.equal(zeroGamma.caseResults[0].qCndBranch, "gammaC_less_or_equal_zero_zero_demand");
  assert.equal(zeroGamma.caseResults[0].executionTrace.status, "branch_result");
  assert.equal(validateMc001ExecutionTrace(zeroGamma.caseResults[0].executionTrace).ok, true);
  assert.equal(inverseGamma.status, "ready");
  close(inverseGamma.caseResults[0].qCnd, 0);
  assert.equal(inverseGamma.caseResults[0].qCndBranch, "inverse_gammaC_greater_than_two_zero_demand");
  assert.equal(inverseGamma.caseResults[0].executionTrace.status, "branch_result");
  assert.equal(inverseGamma.caseResults[0].executionTrace.condition.expression, "(1 / gammaC) > 2");
  assert.equal(validateMc001ExecutionTrace(inverseGamma.caseResults[0].executionTrace).ok, true);
});

await test("relation 2.77 long unoccupied cooling interpolation is implemented", () => {
  const result = calculateMc001CoolingUsefulDemandExplicit(input([
    {
      caseId: "apr-long-unoccupied-cooling",
      month: "april",
      longUnoccupiedPeriodAdjustment: {
        qCndOccupied: 200,
        qCndUnoccupied: 50,
        unoccupiedFraction: 0.25
      },
      source: {
        reference: "manual_mvp_input"
      }
    }
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].qCnd, 162.5);
  assert.equal(
    result.caseResults[0].longUnoccupiedFormulaCode,
    "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION"
  );
  assert.equal(
    result.caseResults[0].qCndOrigin,
    "calculated_from_explicit_cooling_long_unoccupied_interpolation"
  );
});

await test("golden cooling regression covers normal boundary long-unoccupied and annual aggregation", () => {
  const dependencies = {
    effectiveInternalHeatCapacityJPerK: 25200000,
    heatTransferCoefficientComponents: {
      transmissionCoefficientWK: 250,
      groundAdjacentCoefficientWK: 20,
      ventilationCoefficientWK: 150
    },
    aC0: 1,
    tauC0: 15
  };
  const result = calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({
      caseId: "jan-normal-cooling-spine",
      utilizationDependencies: dependencies,
      aC: undefined,
      aCred: undefined,
      coolingIntermittency: {
        weekendReductionDurationHours: 48,
        weekendReductionRepetitionCount: 1,
        bCredWknd: 0.3
      }
    }),
    sampleCase({
      caseId: "feb-zero-cooling",
      month: "february",
      qCht: 1000,
      qCgn: 0,
      aC: undefined,
      aCred: undefined
    }),
    sampleCase({
      caseId: "mar-low-gamma-cooling",
      month: "march",
      qCht: 1000,
      qCgn: 300,
      aC: undefined,
      aCred: undefined
    }),
    {
      caseId: "apr-long-unoccupied-cooling",
      month: "april",
      longUnoccupiedPeriodAdjustment: {
        qCndOccupied: 200,
        qCndUnoccupied: 50,
        unoccupiedFraction: 0.25
      },
      source: {
        reference: "manual_mvp_input"
      }
    }
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].tauC, 16.666666666666668);
  close(result.caseResults[0].aC, 2.111111111111111);
  close(result.caseResults[0].etaCht, 0.8691181348038218);
  close(result.caseResults[0].qCnd, 271.4116476470828);
  close(result.summary.annualQCnd, 433.9116476470828);
  assert.equal(result.summary.caseCount, 4);
  assert.equal(result.summary.monthCount, 4);
  assert.equal(result.caseResults[0].qChtOrigin, "explicit_input");
  assert.equal(result.caseResults[0].qCgnOrigin, "explicit_input");
  assert.equal(result.caseResults[0].tauCOrigin, "calculated_from_explicit_heat_transfer_coefficient_components");
  assert.equal(result.caseResults[0].aCOrigin, "calculated_from_explicit_tauC_dependencies");
  assert.equal(result.caseResults[0].etaChtOrigin, "calculated_from_explicit_time_constant_dependencies");
  assert.equal(result.caseResults[0].coolingIntermittencyFormulaCode, "MC001_R14_RELATION_2_74_COOLING_INTERMITTENCY_REDUCTION_FACTOR");
});

await test("rejects invalid mode missing cases duplicate cases and invalid month", () => {
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([sampleCase()], { mode: "full_qcnd" })),
    "restricted_qcnd_invalid_mode"
  );
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit({
      mode: "restricted_cooling_qcnd_explicit_v1"
    }),
    "missing_monthly_restricted_cooling_cases"
  );
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([
      sampleCase({ caseId: "duplicate" }),
      sampleCase({ caseId: "duplicate", month: "february" })
    ])),
    "duplicate_monthly_cooling_case_identifier"
  );
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([sampleCase({ month: "jan" })])),
    "restricted_qcnd_invalid_month"
  );
});

await test("rejects missing or ambiguous explicit inputs", () => {
  const noGains = sampleCase();
  delete noGains.qCgn;
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([noGains])),
    "missing_explicit_QCgn_source"
  );
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([
      sampleCase({ internalGains: 1 })
    ])),
    "ambiguous_QCgn_source"
  );
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([
      sampleCase({ etaCht: 0.8 })
    ])),
    "etaCht_aC_and_utilization_dependencies_are_mutually_exclusive"
  );
  const noUtilization = sampleCase({ aC: undefined });
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([noUtilization])),
    "etaCht_aC_or_utilization_dependencies_required"
  );
  const noReduction = sampleCase({ aCred: undefined });
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([noReduction])),
    "aCred_or_cooling_intermittency_required"
  );
});

await test("rejects missing utilization dependency and invalid long-unoccupied inputs", () => {
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([
      sampleCase({
        aC: undefined,
        utilizationDependencies: {
          totalHeatTransferCoefficientWK: 420,
          aC0: 1,
          tauC0: 15
        }
      })
    ])),
    "missing_explicit_capacity_for_tauC"
  );
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([
      sampleCase({
        aC: undefined,
        utilizationDependencies: {
          effectiveInternalHeatCapacityTable2_20ClassId: "medium",
          totalHeatTransferCoefficientWK: 420,
          aC0: 1,
          tauC0: 15
        }
      })
    ])),
    "incomplete_effective_capacity_table_2_20_source_for_tauC"
  );
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([
      sampleCase({
        aC: undefined,
        utilizationDependencies: {
          effectiveInternalHeatCapacityJPerK: 25200000,
          effectiveInternalHeatCapacityTable2_20ClassId: "medium",
          usefulFloorAreaM2: 120,
          totalHeatTransferCoefficientWK: 420,
          aC0: 1,
          tauC0: 15
        }
      })
    ])),
    "ambiguous_explicit_capacity_for_tauC"
  );
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([
      {
        caseId: "bad-long-unoccupied",
        month: "january",
        longUnoccupiedPeriodAdjustment: {
          qCndOccupied: 200,
          qCndUnoccupied: 50,
          unoccupiedFraction: 1.2
        },
        source: {
          reference: "manual_mvp_input"
        }
      }
    ])),
    "invalid_explicit_cooling_long_unoccupied_fraction"
  );
});

await test("rejects NaN Infinity negative QCnd and client supplied derived fields", () => {
  assertBlocked(calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({ qCht: NaN })
  ])));
  assertBlocked(calculateMc001CoolingUsefulDemandExplicit(input([
    sampleCase({ qCgn: Infinity })
  ])));
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([
      sampleCase({ etaCht: 3, aC: undefined })
    ])),
    "restricted_qcnd_negative_result_outside_cooling_scope"
  );
  assertBlocked(
    calculateMc001CoolingUsefulDemandExplicit(input([sampleCase({ qCnd: 1 })])),
    "restricted_qcnd_client_supplied_derived_result"
  );
});

await test("diagnostics keep restricted cooling and downstream blockers visible", () => {
  const result = calculateMc001CoolingUsefulDemandExplicit(input());

  for (const limit of [
    "restricted_cooling_only",
    "explicit_input_only",
    "not_full_QCnd",
    "not_QHnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate",
    "cooling_long_unoccupied_periods_explicit_interpolation_only",
    "cooling_intermittency_explicit_reduction_only",
    "no_hidden_defaults"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
});

await test("module has no filesystem network PDF or registry-as-calculator behavior", () => {
  const source = readFileSync(
    new URL("../mc001CoolingUsefulDemandCalculation.mjs", import.meta.url),
    "utf8"
  );
  for (const forbidden of [
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
