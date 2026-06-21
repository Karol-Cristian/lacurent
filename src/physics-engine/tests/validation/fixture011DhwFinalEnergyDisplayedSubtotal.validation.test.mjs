import assert from "node:assert/strict";
import { fixture011DhwFinalEnergyDisplayedSubtotal } from "./fixture011DhwFinalEnergyDisplayedSubtotal.mjs";

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
    `METRIC ${fixture011DhwFinalEnergyDisplayedSubtotal.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceAbs}`
  );

  assert.ok(
    absoluteDelta <= toleranceAbs,
    `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
  );

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function calculateDisplayedSubtotal() {
  const {
    usefulDemandQWndKWh,
    distributionLossTotalQwDisTotKWh,
    storageLossQwStoKWh,
    generationLossQwGKWh,
    auxiliaryEnergyWwKWh
  } = fixture011DhwFinalEnergyDisplayedSubtotal.displayedInputs;

  return (
    usefulDemandQWndKWh +
    distributionLossTotalQwDisTotKWh +
    storageLossQwStoKWh +
    generationLossQwGKWh +
    auxiliaryEnergyWwKWh
  );
}

test("validates MC001 fixture 011 displayed DHW component subtotal", () => {
  const { expected, tolerances } = fixture011DhwFinalEnergyDisplayedSubtotal;
  const calculatedSubtotal = calculateDisplayedSubtotal();

  metric({
    metricKey: "component_subtotal_qw_total_kwh",
    expected: expected.componentSubtotalKWh,
    calculated: calculatedSubtotal,
    toleranceAbs: tolerances.arithmeticExactAbs
  });
});

test("validates MC001 fixture 011 display rounding delta against Qw,total", () => {
  const { expected, tolerances } = fixture011DhwFinalEnergyDisplayedSubtotal;
  const calculatedSubtotal = calculateDisplayedSubtotal();
  const displayDelta = calculatedSubtotal - expected.displayedQwTotalKWh;

  metric({
    metricKey: "displayed_qw_total_kwh",
    expected: expected.displayedQwTotalKWh,
    calculated: calculatedSubtotal,
    toleranceAbs: tolerances.displayRoundingAbsKWh
  });
  metric({
    metricKey: "display_delta_kwh",
    expected: expected.absoluteDisplayDeltaKWh,
    calculated: Math.abs(displayDelta),
    toleranceAbs: tolerances.arithmeticExactAbs
  });
});

test("documents Fixture 011 blocked DHW components without full final-energy assertions", () => {
  const blockedKeys = new Set(
    fixture011DhwFinalEnergyDisplayedSubtotal.blockedRows.map((row) => row.rowKey)
  );

  assert.ok(blockedKeys.has("annual_distribution_loss_formula"));
  assert.ok(blockedKeys.has("storage_loss_formula"));
  assert.ok(blockedKeys.has("generation_loss_formula"));
  assert.ok(blockedKeys.has("auxiliary_energy_formula"));
  assert.ok(blockedKeys.has("recovered_losses"));
  assert.ok(blockedKeys.has("full_dhw_final_energy_formula"));

  for (const row of fixture011DhwFinalEnergyDisplayedSubtotal.blockedRows) {
    assert.ok(row.source.length > 0);
    assert.ok(row.reason.length > 0);
  }
});
