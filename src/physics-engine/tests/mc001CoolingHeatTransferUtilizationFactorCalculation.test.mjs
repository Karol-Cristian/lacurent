import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001CoolingHeatTransferUtilizationFactor } from "../mc001CoolingHeatTransferUtilizationFactorCalculation.mjs";

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
    caseId: "jan-etaCht-restricted",
    gammaC: 2,
    aC: 2,
    source: {
      reference: "manual_mvp_input"
    },
    ...overrides
  };
}

function input(cases = [sampleCase()], overrides = {}) {
  return {
    mode: "restricted_cooling_etaCht_explicit_v1",
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

function expectedEta(gammaC, aC) {
  return (1 - gammaC ** (-aC)) / (1 - gammaC ** (-(aC + 1)));
}

await test("gammaC not equal to one branch calculates etaCht", () => {
  const result = calculateMc001CoolingHeatTransferUtilizationFactor(input());

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "restricted_cooling_etaCht_explicit_input_only_not_full_QCnd");
  close(result.caseResults[0].etaCht, 6 / 7);
  assert.equal(result.caseResults[0].branch, "gammaC_not_equal_one");
  assert.equal(
    result.caseResults[0].formulaCode,
    "MC001_FIGURE_2_15_COOLING_HEAT_TRANSFER_UTILIZATION_FACTOR"
  );
});

await test("gammaC equals one branch calculates etaCht", () => {
  const result = calculateMc001CoolingHeatTransferUtilizationFactor(input([
    sampleCase({ gammaC: 1, aC: 2 })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].etaCht, 2 / 3);
  assert.equal(result.caseResults[0].branch, "gammaC_equals_one");
});

await test("gammaC less than or equal to zero branch returns etaCht equals one", () => {
  const result = calculateMc001CoolingHeatTransferUtilizationFactor(input([
    sampleCase({ gammaC: 0, aC: 2 })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].etaCht, 1);
  assert.equal(result.caseResults[0].branch, "gammaC_less_or_equal_zero");
});

await test("gammaC can be calculated from qCgn over qCht", () => {
  const payloadCase = sampleCase({
    gammaC: undefined,
    qCgn: 600,
    qCht: 300,
    aC: 2
  });
  delete payloadCase.gammaC;

  const result = calculateMc001CoolingHeatTransferUtilizationFactor(input([payloadCase]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].gammaC, 2);
  close(result.caseResults[0].etaCht, expectedEta(2, 2));
});

await test("gammaC near one uses equality tolerance branch", () => {
  const result = calculateMc001CoolingHeatTransferUtilizationFactor(input([
    sampleCase({ gammaC: 1 + 1e-13, aC: 2 })
  ]));

  assert.equal(result.status, "ready");
  close(result.caseResults[0].etaCht, 2 / 3);
  assert.equal(result.caseResults[0].branch, "gammaC_equals_one");
});

await test("rejects missing mode cases source aC and invalid qCht or qCgn", () => {
  assertBlocked(
    calculateMc001CoolingHeatTransferUtilizationFactor(input([sampleCase()], { mode: "full_etaCht" })),
    "restricted_etaCht_invalid_mode"
  );
  assertBlocked(
    calculateMc001CoolingHeatTransferUtilizationFactor({
      mode: "restricted_cooling_etaCht_explicit_v1"
    }),
    "restricted_etaCht_missing_cases"
  );
  assertBlocked(
    calculateMc001CoolingHeatTransferUtilizationFactor(input([sampleCase({ source: {} })])),
    "restricted_etaCht_missing_explicit_source"
  );
  const missingAC = sampleCase();
  delete missingAC.aC;
  assertBlocked(
    calculateMc001CoolingHeatTransferUtilizationFactor(input([missingAC])),
    "restricted_etaCht_missing_aC"
  );
  assertBlocked(
    calculateMc001CoolingHeatTransferUtilizationFactor(input([sampleCase({ aC: 0 })])),
    "restricted_etaCht_invalid_aC"
  );
  const badQcht = sampleCase({ qCgn: 1, qCht: 0 });
  delete badQcht.gammaC;
  assertBlocked(
    calculateMc001CoolingHeatTransferUtilizationFactor(input([badQcht])),
    "restricted_etaCht_invalid_qCht"
  );
  const badQcgn = sampleCase({ qCgn: -1, qCht: 1 });
  delete badQcgn.gammaC;
  assertBlocked(
    calculateMc001CoolingHeatTransferUtilizationFactor(input([badQcgn])),
    "restricted_etaCht_invalid_qCgn"
  );
});

await test("rejects NaN Infinity and derived result fields", () => {
  assertBlocked(calculateMc001CoolingHeatTransferUtilizationFactor(input([
    sampleCase({ gammaC: NaN })
  ])));
  assertBlocked(calculateMc001CoolingHeatTransferUtilizationFactor(input([
    sampleCase({ aC: Infinity })
  ])));
  assertBlocked(
    calculateMc001CoolingHeatTransferUtilizationFactor(input([sampleCase({ etaCht: 1 })])),
    "restricted_etaCht_client_supplied_derived_result"
  );
});

await test("diagnostics keep restricted cooling and downstream blockers visible", () => {
  const result = calculateMc001CoolingHeatTransferUtilizationFactor(input());

  for (const limit of [
    "restricted_cooling_only",
    "explicit_input_only",
    "etaCht_only",
    "not_full_QCnd",
    "not_QHnd",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate",
    "no_hidden_defaults"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
});

await test("module has no filesystem network PDF or registry-as-calculator behavior", () => {
  const source = readFileSync(
    new URL("../mc001CoolingHeatTransferUtilizationFactorCalculation.mjs", import.meta.url),
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
