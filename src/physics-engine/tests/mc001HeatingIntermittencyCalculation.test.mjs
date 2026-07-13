import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001HeatingIntermittencyExplicit } from "../mc001HeatingIntermittencyCalculation.mjs";

const EPSILON = 1e-9;

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= EPSILON, `${actual} != ${expected}`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function reductionPeriods(overrides = {}) {
  return [
    {
      periodId: "day",
      thetaIntSetHLow: 20,
      reductionDurationHours: 0,
      repetitionCount: 0,
      ...(overrides.day ?? {})
    },
    {
      periodId: "night",
      thetaIntSetHLow: 16,
      reductionDurationHours: 8,
      repetitionCount: 7,
      ...(overrides.night ?? {})
    },
    {
      periodId: "wknd",
      thetaIntSetHLow: 20,
      reductionDurationHours: 0,
      repetitionCount: 0,
      ...(overrides.wknd ?? {})
    }
  ];
}

function sampleCase(overrides = {}) {
  return {
    caseId: "jan-heating-intermittency",
    thetaIntSetH: 20,
    thetaExternal: 0,
    qHgn: 300,
    transmissionHeatTransferCoefficientWK: 50,
    ventilationHeatTransferCoefficientWK: 19,
    calculationDurationHours: 744,
    tauH: 16.666666666666668,
    reductionPeriods: reductionPeriods(),
    source: {
      reference: "manual_mvp_input"
    },
    ...overrides
  };
}

function input(cases = [sampleCase()], overrides = {}) {
  return {
    mode: "heating_intermittency_explicit_v1",
    cases,
    ...overrides
  };
}

function assertBlocked(result, code) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
  assert.equal(result.diagnostics.blockers[0].code, code);
}

test("calculates heating intermittency correction chain for explicit night setback", () => {
  const result = calculateMc001HeatingIntermittencyExplicit(input());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "heating_intermittency_explicit_input_only_not_full_QHnd");
  assert.equal(result.caseResults.length, 1);
  const caseResult = result.caseResults[0];
  close(caseResult.dThetaFloat, 0.292192613370734);
  close(caseResult.periodResults[1].dThetaSetLow, 0.8);
  close(caseResult.periodResults[1].fHred, 1 / 3);
  close(caseResult.periodResults[1].fHredLow, 0.6918120591596855);
  close(caseResult.periodResults[1].dThetaRedMean, 0.8653593928661756);
  close(caseResult.periodResults[1].aHredPeriod, 0.9551197976220586);
  close(caseResult.aHred, 0.9551197976220586);
  close(caseResult.thetaIntCalcH, 19.10239595244117);
  close(caseResult.qHht, 980.64059861452);
  assert.equal(
    caseResult.qHhtOrigin,
    "calculated_from_explicit_heating_intermittency_correction"
  );
  assert.equal(
    caseResult.heatingIntermittencyFormulaCode,
    "MC001_R11_HEATING_INTERMITTENCY_QHHT_FROM_CORRECTED_SETPOINT"
  );
  assert.equal(
    caseResult.heatingIntermittencySourcePackCode,
    "MC001_R11_HEATING_INTERMITTENCY_RELATIONS_2_59_TO_2_73_SOURCE_PACK"
  );
});

test("supports explicit free-floating temperature relation 2.66", () => {
  const result = calculateMc001HeatingIntermittencyExplicit(input([
    sampleCase({ thetaIntFloat: 5 })
  ]));

  assert.equal(result.status, "ready");
  const caseResult = result.caseResults[0];
  close(caseResult.dThetaFloat, 0.25);
  assert.equal(
    caseResult.dThetaFloatFormulaCode,
    "MC001_R11_RELATION_2_66_FREE_FLOAT_RATIO_FROM_EXPLICIT_TEMPERATURE"
  );
});

test("heating-off period uses relation 2.68 and relation 2.72 branches", () => {
  const result = calculateMc001HeatingIntermittencyExplicit(input([
    sampleCase({
      reductionPeriods: reductionPeriods({
        night: { heatingOff: true }
      })
    })
  ]));

  assert.equal(result.status, "ready");
  const night = result.caseResults[0].periodResults[1];
  assert.equal(night.fHredLow, 1);
  assert.equal(night.fHredLowFormulaCode, "MC001_R11_RELATION_2_68_LOW_SETPOINT_DURATION_FULL");
  assert.equal(
    night.dThetaRedMeanFormulaCode,
    "MC001_R11_RELATION_2_72_MEAN_TEMPERATURE_DIFFERENCE_REDUCTION_FULL"
  );
});

test("low setpoint below exterior uses relation 2.64", () => {
  const result = calculateMc001HeatingIntermittencyExplicit(input([
    sampleCase({
      reductionPeriods: reductionPeriods({
        night: { thetaIntSetHLow: -5 }
      })
    })
  ]));

  assert.equal(result.status, "ready");
  assert.equal(
    result.caseResults[0].periodResults[1].dThetaSetLowFormulaCode,
    "MC001_R11_RELATION_2_64_REDUCED_SETPOINT_RATIO_LOW_BELOW_EXTERIOR"
  );
});

test("multiple cases report case count", () => {
  const result = calculateMc001HeatingIntermittencyExplicit(input([
    sampleCase(),
    sampleCase({ caseId: "feb-heating-intermittency" })
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.summary.caseCount, 2);
});

test("rejects missing cases and invalid mode", () => {
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit({ mode: "heating_intermittency_explicit_v1" }),
    "missing_heating_intermittency_cases"
  );
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([sampleCase()], { mode: "wrong" })),
    "heating_intermittency_invalid_mode"
  );
});

test("rejects missing source and invalid case id", () => {
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([sampleCase({ source: {} })])),
    "heating_intermittency_missing_explicit_source"
  );
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([sampleCase({ caseId: "" })])),
    "heating_intermittency_invalid_case_id"
  );
});

test("rejects missing explicit inputs", () => {
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([sampleCase({ thetaIntSetH: undefined })])),
    "missing_explicit_heating_normal_setpoint"
  );
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([sampleCase({ qHgn: undefined })])),
    "missing_explicit_heating_gains_for_intermittency"
  );
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([
      sampleCase({ transmissionHeatTransferCoefficientWK: undefined })
    ])),
    "missing_explicit_heating_transmission_coefficient_for_intermittency"
  );
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([sampleCase({ tauH: undefined })])),
    "missing_explicit_tauH_for_intermittency"
  );
});

test("rejects invalid ranges", () => {
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([sampleCase({ qHgn: -1 })])),
    "invalid_explicit_heating_gains_for_intermittency"
  );
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([
      sampleCase({ ventilationHeatTransferCoefficientWK: 0 })
    ])),
    "invalid_explicit_heating_ventilation_coefficient_for_intermittency"
  );
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([sampleCase({ calculationDurationHours: 0 })])),
    "invalid_explicit_heating_duration_for_intermittency"
  );
});

test("rejects incomplete or ambiguous period inputs", () => {
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([
      sampleCase({ reductionPeriods: reductionPeriods().slice(0, 2) })
    ])),
    "missing_explicit_heating_intermittency_periods"
  );
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([
      sampleCase({
        reductionPeriods: reductionPeriods({
          night: { reductionDurationHours: 200, repetitionCount: 7 }
        })
      })
    ])),
    "invalid_heating_intermittency_time_fraction"
  );
});

test("rejects client supplied derived fields", () => {
  assertBlocked(
    calculateMc001HeatingIntermittencyExplicit(input([sampleCase({ qHht: 1 })])),
    "heating_intermittency_client_supplied_derived_result"
  );
});

test("diagnostics preserve restricted scope and downstream blockers", () => {
  const result = calculateMc001HeatingIntermittencyExplicit(input());

  for (const limit of [
    "heating_intermittency_explicit_input_only",
    "heating_useful_demand_support_only",
    "not_full_QHnd",
    "not_QCnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate",
    "no_hidden_defaults",
    "no_default_schedules",
    "no_default_setpoints",
    "no_default_durations"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, limit);
  }
});

test("module has no filesystem network PDF or registry-as-calculator behavior", () => {
  const source = readFileSync(
    new URL("../mc001HeatingIntermittencyCalculation.mjs", import.meta.url),
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
