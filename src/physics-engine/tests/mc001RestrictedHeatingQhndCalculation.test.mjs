import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

await test("normal monthly heating case calculates restricted QHnd", () => {
  const result = calculateMc001RestrictedHeatingQhndExplicit(input());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "restricted_heating_qhnd_explicit_input_only_not_full_mc001");
  close(result.caseResults[0].qHnd, 786.72);
  close(result.summary.annualQHnd, 786.72);
  assert.equal(result.caseResults[0].formulaCode, "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH");
});

await test("gamma can be calculated from qHgn over qHht when omitted", () => {
  const payloadCase = sampleCase();
  delete payloadCase.gammaH;
  const result = calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].gammaH, 300 / 1026.72);
  close(result.caseResults[0].qHnd, 786.72);
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
});

await test("rejects gammaH less than or equal to zero", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ gammaH: 0 })])),
    "restricted_qhnd_gammaH_less_or_equal_zero"
  );
});

await test("rejects gammaH greater than two", () => {
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([sampleCase({ gammaH: 2.01 })])),
    "restricted_qhnd_gammaH_greater_than_two"
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

await test("rejects missing etaHgn", () => {
  const payloadCase = sampleCase();
  delete payloadCase.etaHgn;
  assertBlocked(
    calculateMc001RestrictedHeatingQhndExplicit(input([payloadCase])),
    "restricted_qhnd_missing_etaHgn"
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
  }), "restricted_qhnd_missing_cases");
  assertBlocked(calculateMc001RestrictedHeatingQhndExplicit(input([])), "restricted_qhnd_missing_cases");
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
    "not_certificate"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
  for (const branch of [
    "gammaH_less_or_equal_zero",
    "gammaH_greater_than_two",
    "cooling_QCnd",
    "long_unoccupied_periods",
    "intermittency"
  ]) {
    assert.equal(result.diagnostics.excludedBranches.includes(branch), true, `missing ${branch}`);
  }
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
