import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001HeatingGainUtilizationFactor } from "../mc001HeatingGainUtilizationFactorCalculation.mjs";

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
    caseId: "jan-etaHgn-restricted",
    gammaH: 0.3,
    aH: 2,
    source: {
      reference: "manual_mvp_input"
    },
    ...overrides
  };
}

function input(cases = [sampleCase()], overrides = {}) {
  return {
    mode: "restricted_heating_etaHgn_explicit_v1",
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

function expectedEta(gammaH, aH) {
  return (1 - gammaH ** aH) / (1 - gammaH ** (aH + 1));
}

await test("gammaH not equal to one branch calculates etaHgn", () => {
  const result = calculateMc001HeatingGainUtilizationFactor(input());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "restricted_heating_etaHgn_explicit_input_only_not_full_QHnd");
  close(result.caseResults[0].etaHgn, 0.935251798561151);
  assert.equal(result.caseResults[0].branch, "gammaH_not_equal_one");
  assert.equal(result.caseResults[0].formulaCode, "MC001_FIGURE_2_14_HEATING_GAIN_UTILIZATION_FACTOR");
});

await test("gammaH equals one branch calculates etaHgn", () => {
  const result = calculateMc001HeatingGainUtilizationFactor(input([
    sampleCase({ gammaH: 1, aH: 2 })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].etaHgn, 2 / 3);
  assert.equal(result.caseResults[0].branch, "gammaH_equals_one");
});

await test("gammaH can be calculated from qHgn over qHht", () => {
  const payloadCase = sampleCase({
    gammaH: undefined,
    qHgn: 300,
    qHht: 1026.72,
    aH: 2
  });
  delete payloadCase.gammaH;

  const result = calculateMc001HeatingGainUtilizationFactor(input([payloadCase]));

  const expectedGamma = 300 / 1026.72;
  assert.equal(result.status, "ready");
  close(result.caseResults[0].gammaH, expectedGamma);
  close(result.caseResults[0].etaHgn, expectedEta(expectedGamma, 2));
  assert.equal(result.caseResults[0].branch, "gammaH_not_equal_one");
});

await test("gammaH near one uses equality tolerance branch", () => {
  const result = calculateMc001HeatingGainUtilizationFactor(input([
    sampleCase({ gammaH: 1 + 1e-13, aH: 2 })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].etaHgn, 2 / 3);
  assert.equal(result.caseResults[0].branch, "gammaH_equals_one");
});

await test("multiple cases report case count", () => {
  const result = calculateMc001HeatingGainUtilizationFactor(input([
    sampleCase(),
    sampleCase({ caseId: "feb-etaHgn-restricted", gammaH: 1, aH: 2 })
  ]));

  assert.equal(result.status, "ready");
  assert.equal(result.summary.caseCount, 2);
});

await test("rejects missing and empty cases", () => {
  assertBlocked(calculateMc001HeatingGainUtilizationFactor({
    mode: "restricted_heating_etaHgn_explicit_v1"
  }), "restricted_etaHgn_missing_cases");
  assertBlocked(calculateMc001HeatingGainUtilizationFactor(input([])), "restricted_etaHgn_missing_cases");
});

await test("rejects invalid mode", () => {
  assertBlocked(
    calculateMc001HeatingGainUtilizationFactor(input([sampleCase()], { mode: "full_etaHgn" })),
    "restricted_etaHgn_invalid_mode"
  );
});

await test("rejects missing source reference", () => {
  assertBlocked(
    calculateMc001HeatingGainUtilizationFactor(input([sampleCase({ source: {} })])),
    "restricted_etaHgn_missing_explicit_source"
  );
});

await test("rejects missing aH", () => {
  const payloadCase = sampleCase();
  delete payloadCase.aH;
  assertBlocked(
    calculateMc001HeatingGainUtilizationFactor(input([payloadCase])),
    "restricted_etaHgn_missing_aH"
  );
});

await test("rejects aH less than or equal to zero", () => {
  assertBlocked(
    calculateMc001HeatingGainUtilizationFactor(input([sampleCase({ aH: 0 })])),
    "restricted_etaHgn_invalid_aH"
  );
});

await test("rejects gammaH less than or equal to zero", () => {
  assertBlocked(
    calculateMc001HeatingGainUtilizationFactor(input([sampleCase({ gammaH: 0 })])),
    "restricted_etaHgn_gammaH_less_or_equal_zero"
  );
});

await test("rejects gammaH greater than two", () => {
  assertBlocked(
    calculateMc001HeatingGainUtilizationFactor(input([sampleCase({ gammaH: 2.01 })])),
    "restricted_etaHgn_gammaH_greater_than_two"
  );
});

await test("rejects missing gammaH and missing qHgn qHht pair", () => {
  const payloadCase = sampleCase();
  delete payloadCase.gammaH;
  assertBlocked(
    calculateMc001HeatingGainUtilizationFactor(input([payloadCase])),
    "restricted_etaHgn_missing_gammaH_or_heat_balance_pair"
  );
});

await test("rejects qHht less than or equal to zero when calculating gammaH", () => {
  const payloadCase = sampleCase({ qHgn: 300, qHht: 0 });
  delete payloadCase.gammaH;
  assertBlocked(
    calculateMc001HeatingGainUtilizationFactor(input([payloadCase])),
    "restricted_etaHgn_invalid_qHht"
  );
});

await test("rejects qHgn below zero when calculating gammaH", () => {
  const payloadCase = sampleCase({ qHgn: -1, qHht: 100 });
  delete payloadCase.gammaH;
  assertBlocked(
    calculateMc001HeatingGainUtilizationFactor(input([payloadCase])),
    "restricted_etaHgn_invalid_qHgn"
  );
});

await test("rejects NaN or Infinity", () => {
  const payloadCases = [
    sampleCase({ gammaH: NaN }),
    sampleCase({ aH: Infinity }),
    (() => {
      const payloadCase = sampleCase({ qHgn: Infinity, qHht: 100 });
      delete payloadCase.gammaH;
      return payloadCase;
    })()
  ];

  for (const payloadCase of payloadCases) {
    assertBlocked(calculateMc001HeatingGainUtilizationFactor(input([payloadCase])));
  }
});

await test("rejects client supplied derived fields", () => {
  const derivedPayloads = [
    input([sampleCase({ etaHgn: 1 })]),
    input([sampleCase()], { caseResults: [] }),
    input([sampleCase()], { summary: { caseCount: 1 } }),
    input([sampleCase()], { result: { etaHgn: 1 } })
  ];

  for (const payload of derivedPayloads) {
    assertBlocked(
      calculateMc001HeatingGainUtilizationFactor(payload),
      "restricted_etaHgn_client_supplied_derived_result"
    );
  }
});

await test("scope and diagnostics say restricted etaHgn only", () => {
  const result = calculateMc001HeatingGainUtilizationFactor(input());

  assert.equal(result.scope, "restricted_heating_etaHgn_explicit_input_only_not_full_QHnd");
  for (const limit of [
    "restricted_heating_only",
    "explicit_input_only",
    "etaHgn_only",
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
    new URL("../mc001HeatingGainUtilizationFactorCalculation.mjs", import.meta.url),
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
