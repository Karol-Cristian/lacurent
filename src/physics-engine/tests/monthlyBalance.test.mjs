import assert from "node:assert/strict";
import {
  calculateAnnualCoolingNeedSum,
  calculateAnnualHeatingNeedSum,
  calculateMonthlyCoolingNeed,
  calculateMonthlyHeatingNeed,
  calculateMonthlyTotalGains,
  calculateMonthlyTotalHeatTransfer
} from "../monthlyBalance.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("calculates monthly total heat transfer from explicit Qtr and Qve", () => {
  const result = calculateMonthlyTotalHeatTransfer({
    qtrMonthly: 100,
    qveMonthly: 25,
    mode: "heating"
  });

  assert.equal(result.formulaId, "MC001_MONTHLY_TOTAL_HEAT_TRANSFER");
  assert.equal(result.unit, "kWh");
  assert.equal(result.value, 125);
  assert.equal(result.inputs.mode, "heating");
});

test("calculates monthly total gains from explicit Qint and Qsol", () => {
  const result = calculateMonthlyTotalGains({
    qintMonthly: 40,
    qsolMonthly: 15,
    mode: "cooling"
  });

  assert.equal(result.formulaId, "MC001_MONTHLY_TOTAL_GAINS");
  assert.equal(result.unit, "kWh");
  assert.equal(result.value, 55);
  assert.equal(result.inputs.mode, "cooling");
});

test("selects heating branch for non-positive gamma with gains", () => {
  const result = calculateMonthlyHeatingNeed({
    gammaH: 0,
    qHhtMonthly: 100,
    etaHgnMonthly: 0.8,
    qHgnMonthly: 20
  });

  assert.equal(result.value, 0);
  assert.ok(result.trace.assumptions.includes("heating_branch_gamma_non_positive_with_gains"));
});

test("selects heating branch for gamma above 2", () => {
  const result = calculateMonthlyHeatingNeed({
    gammaH: 2.1,
    qHhtMonthly: 100,
    etaHgnMonthly: 0.8,
    qHgnMonthly: 20
  });

  assert.equal(result.value, 0);
  assert.ok(result.trace.assumptions.includes("heating_branch_gamma_above_2"));
});

test("calculates standard monthly heating balance and clamps negatives", () => {
  const standard = calculateMonthlyHeatingNeed({
    gammaH: 1,
    qHhtMonthly: 100,
    etaHgnMonthly: 0.5,
    qHgnMonthly: 20
  });
  const clamped = calculateMonthlyHeatingNeed({
    gammaH: 1,
    qHhtMonthly: 10,
    etaHgnMonthly: 1,
    qHgnMonthly: 20
  });

  assert.equal(standard.value, 90);
  assert.ok(standard.trace.assumptions.includes("heating_branch_standard_balance"));
  assert.equal(clamped.value, 0);
  assert.ok(clamped.warnings.includes("monthly_heating_need_negative_clamped_to_zero"));
});

test("selects cooling branch for inverse gamma above 2", () => {
  const result = calculateMonthlyCoolingNeed({
    gammaC: 0.4,
    qChtMonthly: 20,
    etaChtMonthly: 0.5,
    qCgnMonthly: 100,
    aCredMonthly: 1
  });

  assert.equal(result.value, 0);
  assert.ok(result.trace.assumptions.includes("cooling_branch_inverse_gamma_above_2"));
});

test("calculates standard monthly cooling balance and clamps negatives", () => {
  const standard = calculateMonthlyCoolingNeed({
    gammaC: 1,
    qChtMonthly: 20,
    etaChtMonthly: 0.5,
    qCgnMonthly: 100,
    aCredMonthly: 0.8
  });
  const clamped = calculateMonthlyCoolingNeed({
    gammaC: 1,
    qChtMonthly: 100,
    etaChtMonthly: 1,
    qCgnMonthly: 20,
    aCredMonthly: 1
  });

  assert.equal(standard.value, 72);
  assert.ok(standard.trace.assumptions.includes("cooling_branch_standard_balance"));
  assert.equal(clamped.value, 0);
  assert.ok(clamped.warnings.includes("monthly_cooling_need_negative_clamped_to_zero"));
});

test("sums exactly 12 monthly heating and cooling values", () => {
  const heating = calculateAnnualHeatingNeedSum({
    monthlyValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  });
  const cooling = calculateAnnualCoolingNeedSum({
    monthlyValues: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
  });

  assert.equal(heating.formulaId, "MC001_ANNUAL_HEATING_NEED_SUM");
  assert.equal(cooling.formulaId, "MC001_ANNUAL_COOLING_NEED_SUM");
  assert.equal(heating.unit, "kWh/an");
  assert.equal(cooling.unit, "kWh/an");
  assert.equal(heating.value, 78);
  assert.equal(cooling.value, 78);
});

test("validates monthly balance inputs", () => {
  assert.throws(
    () => calculateMonthlyTotalHeatTransfer({ qtrMonthly: -1, qveMonthly: 0 }),
    /qtrMonthly must be a non-negative number/
  );
  assert.throws(
    () => calculateMonthlyTotalGains({ qintMonthly: 1, qsolMonthly: 0, mode: "annual" }),
    /mode must be "heating" or "cooling" when supplied/
  );
  assert.throws(
    () => calculateMonthlyHeatingNeed({
      gammaH: Number.NaN,
      qHhtMonthly: 1,
      etaHgnMonthly: 1,
      qHgnMonthly: 1
    }),
    /gammaH must be a numeric value/
  );
  assert.throws(
    () => calculateMonthlyCoolingNeed({
      gammaC: 0,
      qChtMonthly: 1,
      etaChtMonthly: 1,
      qCgnMonthly: 1,
      aCredMonthly: 1
    }),
    /gammaC must not be zero/
  );
  assert.throws(
    () => calculateAnnualHeatingNeedSum({ monthlyValues: [1, 2, 3] }),
    /monthlyValues must contain exactly 12 values/
  );
  assert.throws(
    () => calculateAnnualCoolingNeedSum({
      monthlyValues: [1, 2, 3, 4, 5, 6, 7, -8, 9, 10, 11, 12]
    }),
    /monthlyValues\[7\] must be a non-negative number/
  );
});
