import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001CoolingIntermittencyExplicit } from "../mc001CoolingIntermittencyCalculation.mjs";

const EPSILON = 1e-12;

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
    caseId: "jan-cooling-intermittency",
    weekendReductionDurationHours: 48,
    weekendReductionRepetitionCount: 1,
    bCredWknd: 0.3,
    source: {
      reference: "manual_mvp_input"
    },
    ...overrides
  };
}

function input(cases = [sampleCase()], overrides = {}) {
  return {
    mode: "cooling_intermittency_explicit_v1",
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

await test("calculates cooling intermittency reduction from explicit weekend inputs", () => {
  const result = calculateMc001CoolingIntermittencyExplicit(input());

  assert.equal(result.status, "ready");
  close(result.caseResults[0].fCredWknd, 0.2857142857142857);
  close(result.caseResults[0].aCred, 0.8);
  assert.equal(result.caseResults[0].aCredOrigin, "calculated_from_explicit_weekend_cooling_reduction");
  assert.equal(
    result.caseResults[0].formulaCode,
    "MC001_R14_RELATION_2_74_COOLING_INTERMITTENCY_REDUCTION_FACTOR"
  );
});

await test("allows explicit no weekend reduction as aCred equals one", () => {
  const result = calculateMc001CoolingIntermittencyExplicit(input([
    sampleCase({
      weekendReductionDurationHours: 0,
      weekendReductionRepetitionCount: 0,
      bCredWknd: undefined
    })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].aCred, 1);
  close(result.caseResults[0].fCredWknd, 0);
  assert.equal(result.caseResults[0].branch, "no_weekend_reduction");
});

await test("duration below source minimum uses explicit no-reduction branch", () => {
  const result = calculateMc001CoolingIntermittencyExplicit(input([
    sampleCase({
      weekendReductionDurationHours: 24,
      weekendReductionRepetitionCount: 1,
      bCredWknd: undefined
    })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].aCred, 1);
  assert.equal(result.caseResults[0].branch, "weekend_reduction_minimum_not_met");
});

await test("rejects missing cases mode source and invalid repetition inputs", () => {
  assertBlocked(
    calculateMc001CoolingIntermittencyExplicit(input([sampleCase()], { mode: "full_cooling" })),
    "cooling_intermittency_invalid_mode"
  );
  assertBlocked(
    calculateMc001CoolingIntermittencyExplicit({ mode: "cooling_intermittency_explicit_v1" }),
    "cooling_intermittency_missing_cases"
  );
  assertBlocked(
    calculateMc001CoolingIntermittencyExplicit(input([sampleCase({ source: {} })])),
    "cooling_intermittency_missing_explicit_source"
  );
  assertBlocked(
    calculateMc001CoolingIntermittencyExplicit(input([
      sampleCase({ weekendReductionRepetitionCount: 0, weekendReductionDurationHours: 12 })
    ])),
    "cooling_intermittency_ambiguous_weekend_reduction_inputs"
  );
  assertBlocked(
    calculateMc001CoolingIntermittencyExplicit(input([
      sampleCase({ weekendReductionRepetitionCount: 2 })
    ])),
    "cooling_intermittency_invalid_weekend_repetition_count"
  );
});

await test("rejects missing bCredWknd only when reduction formula is used", () => {
  assertBlocked(
    calculateMc001CoolingIntermittencyExplicit(input([
      sampleCase({ bCredWknd: undefined })
    ])),
    "cooling_intermittency_missing_bCredWknd"
  );
  assertBlocked(
    calculateMc001CoolingIntermittencyExplicit(input([
      sampleCase({ bCredWknd: -0.1 })
    ])),
    "cooling_intermittency_invalid_bCredWknd"
  );
});

await test("rejects NaN Infinity and derived result fields", () => {
  assertBlocked(calculateMc001CoolingIntermittencyExplicit(input([
    sampleCase({ weekendReductionDurationHours: NaN })
  ])));
  assertBlocked(calculateMc001CoolingIntermittencyExplicit(input([
    sampleCase({ bCredWknd: Infinity })
  ])));
  assertBlocked(
    calculateMc001CoolingIntermittencyExplicit(input([sampleCase({ aCred: 1 })])),
    "cooling_intermittency_client_supplied_derived_result"
  );
});

await test("diagnostics keep explicit cooling and downstream blockers visible", () => {
  const result = calculateMc001CoolingIntermittencyExplicit(input());

  for (const limit of [
    "cooling_intermittency_explicit_input_only",
    "cooling_useful_demand_support_only",
    "not_full_QCnd",
    "not_QHnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate",
    "no_hidden_defaults",
    "no_default_bCredWknd"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
});

await test("module has no filesystem network PDF or registry-as-calculator behavior", () => {
  const source = readFileSync(
    new URL("../mc001CoolingIntermittencyCalculation.mjs", import.meta.url),
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
