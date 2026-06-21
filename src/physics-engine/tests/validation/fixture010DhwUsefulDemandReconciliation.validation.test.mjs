import assert from "node:assert/strict";
import {
  calculateDhwDailyVolumeFromTable3_3_1,
  calculateDhwUsefulEnergyDemand,
  calculateDhwVolumeWithLossWaste
} from "../../dhwUsefulDemand.mjs";
import { fixture010DhwUsefulDemandReconciliation } from "./fixture010DhwUsefulDemandReconciliation.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function percentageError(delta, expected) {
  if (expected === 0) {
    return delta === 0 ? 0 : Number.POSITIVE_INFINITY;
  }

  return Math.abs(delta / expected) * 100;
}

function metric({ metricKey, expected, calculated, toleranceAbs }) {
  const delta = calculated - expected;
  const absoluteDelta = Math.abs(delta);
  const percentError = percentageError(delta, expected);

  console.log(
    `METRIC ${fixture010DhwUsefulDemandReconciliation.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceAbs}`
  );

  assert.ok(
    absoluteDelta <= toleranceAbs,
    `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
  );

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function calculateMonthlyUsefulEnergy() {
  const { inputs, expected } = fixture010DhwUsefulDemandReconciliation;
  const specificHeatKWhPerKgK =
    inputs.waterHeatCapacityProductKWhPerM3K / inputs.waterDensityKgPerM3;

  return inputs.monthlyDays.map((row) => {
    const result = calculateDhwUsefulEnergyDemand({
      volumeLiters: expected.totalDailyVolumeLiters * row.days,
      specificHeatKWhPerKgK,
      waterDensityKgPerM3: inputs.waterDensityKgPerM3,
      thetaWDrawC: inputs.thetaWDrawC,
      thetaWColdC: inputs.thetaWColdC
    });

    return { ...row, calculatedQWndKWh: result.valueKWh, result };
  });
}

test("validates MC001 fixture 010 useful DHW daily volume from service units", () => {
  const { inputs, expected, tolerances } = fixture010DhwUsefulDemandReconciliation;
  const result = calculateDhwDailyVolumeFromTable3_3_1({
    tableEntryId: inputs.tableEntryId,
    unitCount: inputs.serviceUnits
  });

  assert.equal(result.status, "calculated");
  assert.equal(result.formulaId, "MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL");
  assert.equal(
    result.tableEntry.specificDhwDemandLPerUnitDayAt60C,
    expected.tableSpecificDemandLPerUnitDayAt60C
  );

  metric({
    metricKey: "table_specific_demand_l_per_elev_program",
    expected: expected.tableSpecificDemandLPerUnitDayAt60C,
    calculated: result.tableEntry.specificDhwDemandLPerUnitDayAt60C,
    toleranceAbs: tolerances.exactAbs
  });
  metric({
    metricKey: "base_daily_volume_liters",
    expected: expected.baseDailyVolumeLiters,
    calculated: result.valueLitersPerDay,
    toleranceAbs: tolerances.exactAbs
  });
});

test("validates MC001 fixture 010 loss and waste daily volume", () => {
  const { inputs, expected, tolerances } = fixture010DhwUsefulDemandReconciliation;
  const result = calculateDhwVolumeWithLossWaste({
    baseDailyVolumeLiters: expected.baseDailyVolumeLiters,
    penaltyFactor1: inputs.penaltyFactor1,
    penaltyFactor2: inputs.penaltyFactor2
  });

  assert.equal(result.status, "calculated");
  assert.equal(result.formulaId, "MC001_3_197_DHW_LOSS_WASTE_VOLUME");

  metric({
    metricKey: "loss_waste_daily_volume_liters",
    expected: expected.lossWasteDailyVolumeLiters,
    calculated: result.lossWasteDailyVolumeLiters,
    toleranceAbs: tolerances.exactAbs
  });
  metric({
    metricKey: "total_daily_volume_liters",
    expected: expected.totalDailyVolumeLiters,
    calculated: result.totalDailyVolumeLiters,
    toleranceAbs: tolerances.exactAbs
  });
});

test("validates MC001 fixture 010 monthly useful DHW energy", () => {
  const { tolerances } = fixture010DhwUsefulDemandReconciliation;
  const monthlyRows = calculateMonthlyUsefulEnergy();

  for (const row of monthlyRows) {
    assert.equal(row.result.status, "calculated");
    assert.equal(row.result.formulaId, "MC001_3_188_DHW_USEFUL_ENERGY");

    metric({
      metricKey: `monthly_qw_nd_${row.month}`,
      expected: row.expectedQWndKWh,
      calculated: row.calculatedQWndKWh,
      toleranceAbs:
        row.expectedQWndKWh === 0
          ? tolerances.exactAbs
          : tolerances.monthlyEnergySourceRoundedAbsKWh
    });
  }
});

test("validates MC001 fixture 010 annual useful DHW energy", () => {
  const { inputs, expected, tolerances } = fixture010DhwUsefulDemandReconciliation;
  const monthlyRows = calculateMonthlyUsefulEnergy();
  const calculatedAnnual = monthlyRows.reduce(
    (sum, row) => sum + row.calculatedQWndKWh,
    0
  );
  const calculatedDays = monthlyRows.reduce((sum, row) => sum + row.days, 0);
  const impliedWaterHeatCapacityProduct =
    expected.annualQWndKWh /
    ((expected.totalDailyVolumeLiters / 1000) *
      (inputs.thetaWDrawC - inputs.thetaWColdC) *
      calculatedDays);

  metric({
    metricKey: "annual_calculation_days",
    expected: expected.annualCalculationDays,
    calculated: calculatedDays,
    toleranceAbs: tolerances.exactAbs
  });
  metric({
    metricKey: "annual_qw_nd",
    expected: expected.annualQWndKWh,
    calculated: calculatedAnnual,
    toleranceAbs: tolerances.annualEnergySourceRoundedAbsKWh
  });
  metric({
    metricKey: "source_implied_water_heat_capacity_product_kwh_per_m3k",
    expected: inputs.sourceImpliedWaterHeatCapacityProductKWhPerM3K,
    calculated: impliedWaterHeatCapacityProduct,
    toleranceAbs: 1e-12
  });
});

test("documents Fixture 010 blocked DHW rows without final-energy assertions", () => {
  assert.ok(
    fixture010DhwUsefulDemandReconciliation.blockedRows.length >= 1,
    "Expected blocked rows to remain documented"
  );

  for (const row of fixture010DhwUsefulDemandReconciliation.blockedRows) {
    assert.ok(row.source.length > 0);
    assert.ok(row.reason.length > 0);
  }
});
