import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMc001CoolingUsefulDemandExplicit } from "../mc001CoolingUsefulDemandCalculation.mjs";
import { calculateMc001RestrictedHeatingQhndExplicit } from "../mc001RestrictedHeatingQhndCalculation.mjs";
import { calculateMc001CombinedUsefulDemandExplicit } from "../mc001UsefulDemandAggregation.mjs";

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

function assertBlocked(result, code = null) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
  if (code) {
    assert.equal(result.diagnostics.blockers[0].code, code);
  }
}

function heatingResult() {
  return calculateMc001RestrictedHeatingQhndExplicit({
    mode: "restricted_heating_qhnd_explicit_v1",
    cases: [
      {
        caseId: "jan-qhnd",
        month: "january",
        qHht: 1026.72,
        qHgn: 300,
        etaHgn: 0.8,
        source: {
          reference: "manual_mvp_input"
        }
      }
    ]
  });
}

function coolingResult() {
  return calculateMc001CoolingUsefulDemandExplicit({
    mode: "restricted_cooling_qcnd_explicit_v1",
    cases: [
      {
        caseId: "jul-qcnd",
        month: "july",
        qCht: 300,
        qCgn: 600,
        aC: 2,
        aCred: 1,
        source: {
          reference: "manual_mvp_input"
        }
      }
    ]
  });
}

await test("combined useful demand exposes annual QHnd and QCnd separately", () => {
  const heating = heatingResult();
  const cooling = coolingResult();
  const result = calculateMc001CombinedUsefulDemandExplicit({
    mode: "combined_useful_demand_explicit_v1",
    heatingResult: heating,
    coolingResult: cooling
  });

  assert.equal(result.status, "ready");
  assert.equal(result.scope, "combined_QHnd_QCnd_useful_demand_separate_outputs_not_final_energy");
  close(result.result.annualQHnd, 786.72);
  close(result.result.annualQCnd, 600 - (6 / 7) * 300);
  assert.equal(result.result.monthlyHeatingResults.length, 1);
  assert.equal(result.result.monthlyCoolingResults.length, 1);
  assert.equal(Object.hasOwn(result.result, "totalUsefulDemand"), false);
});

await test("combined useful demand rejects invalid inputs and downstream result fields", () => {
  assertBlocked(
    calculateMc001CombinedUsefulDemandExplicit({ mode: "combined_useful_demand_explicit_v1" }),
    "combined_useful_demand_missing_valid_heating_result"
  );
  assertBlocked(
    calculateMc001CombinedUsefulDemandExplicit({
      mode: "combined_useful_demand_explicit_v1",
      heatingResult: heatingResult(),
      coolingResult: coolingResult(),
      totalUsefulDemand: 1
    }),
    "combined_useful_demand_client_supplied_derived_result"
  );
});

await test("combined diagnostics exclude final energy primary CO2 and certificate", () => {
  const result = calculateMc001CombinedUsefulDemandExplicit({
    mode: "combined_useful_demand_explicit_v1",
    heatingResult: heatingResult(),
    coolingResult: coolingResult()
  });

  for (const limit of [
    "separate_heating_and_cooling_useful_demand_outputs",
    "explicit_input_only",
    "not_final_energy",
    "not_primary_energy",
    "not_CO2",
    "not_certificate",
    "no_hidden_defaults"
  ]) {
    assert.equal(result.diagnostics.methodologyLimits.includes(limit), true, `missing ${limit}`);
  }
  assert.equal(result.diagnostics.excludedCalculations.includes("ambiguous_sum_of_heating_and_cooling"), true);
});

await test("module has no filesystem network PDF or registry-as-calculator behavior", () => {
  const source = readFileSync(
    new URL("../mc001UsefulDemandAggregation.mjs", import.meta.url),
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
