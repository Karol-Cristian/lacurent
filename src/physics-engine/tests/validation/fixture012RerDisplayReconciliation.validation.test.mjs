import assert from "node:assert/strict";
import { fixture012RerDisplayReconciliation } from "./fixture012RerDisplayReconciliation.mjs";

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
    `METRIC ${fixture012RerDisplayReconciliation.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceAbs}`
  );

  assert.ok(
    absoluteDelta <= toleranceAbs,
    `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
  );

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function calculateDisplayedRerPercent() {
  const {
    renewableComponentVentilationPrimaryKWhPerM2,
    renewableComponentLightingPrimaryKWhPerM2,
    electricityRenewableShare,
    denominatorSpecificPrimaryKWhPerM2
  } = fixture012RerDisplayReconciliation.displayedInputs;

  return (
    ((renewableComponentVentilationPrimaryKWhPerM2 +
      renewableComponentLightingPrimaryKWhPerM2) *
      electricityRenewableShare) /
    denominatorSpecificPrimaryKWhPerM2 *
    100
  );
}

test("validates MC001 fixture 012 displayed RER arithmetic", () => {
  const { expected, tolerances } = fixture012RerDisplayReconciliation;
  const calculatedRerPercent = calculateDisplayedRerPercent();

  metric({
    metricKey: "page_527_rer_arithmetic_percent",
    expected: expected.calculatedRerPercent,
    calculated: calculatedRerPercent,
    toleranceAbs: tolerances.arithmeticExactAbsPercent
  });
});

test("validates MC001 fixture 012 rounded displayed RER value", () => {
  const { displayedInputs, expected, tolerances } = fixture012RerDisplayReconciliation;
  const calculatedRerPercent = calculateDisplayedRerPercent();
  const roundedDisplayPercent = Number(
    calculatedRerPercent.toFixed(displayedInputs.displayDecimalPlaces)
  );
  const displayDelta = displayedInputs.displayedRerPercent - calculatedRerPercent;
  const displayRelativeDeltaPercent =
    Math.abs(displayDelta / displayedInputs.displayedRerPercent) * 100;

  metric({
    metricKey: "rounded_display_rer_percent",
    expected: expected.roundedDisplayRerPercent,
    calculated: roundedDisplayPercent,
    toleranceAbs: tolerances.displayedRoundedAbsPercent
  });
  metric({
    metricKey: "raw_rer_against_display_percent",
    expected: displayedInputs.displayedRerPercent,
    calculated: calculatedRerPercent,
    toleranceAbs: tolerances.displayRoundingAbsPercentagePoints
  });
  metric({
    metricKey: "display_delta_percentage_points",
    expected: expected.absoluteDisplayDeltaPercentagePoints,
    calculated: Math.abs(displayDelta),
    toleranceAbs: tolerances.arithmeticExactAbsPercent
  });
  metric({
    metricKey: "display_relative_delta_percent",
    expected: expected.displayRelativeDeltaPercent,
    calculated: displayRelativeDeltaPercent,
    toleranceAbs: tolerances.arithmeticExactAbsPercent
  });
});

test("documents diagnostic exact primary split without using it as pass criterion", () => {
  const diagnostic = fixture012RerDisplayReconciliation.diagnosticOnly.exactPrimarySplit;
  const calculatedDiagnosticRerPercent =
    diagnostic.renewablePrimaryEnergyKWh / diagnostic.totalPrimaryEnergyKWh * 100;

  assert.equal(diagnostic.diagnosticOnly, true);
  assert.equal(diagnostic.usedAsPassCriterion, false);
  assert.ok(diagnostic.source.includes("diagnostic only"));

  console.log(
    `DIAGNOSTIC ${fixture012RerDisplayReconciliation.fixtureId}.exact_primary_split_rer_percent calculated=${calculatedDiagnosticRerPercent} displayed=${fixture012RerDisplayReconciliation.displayedInputs.displayedRerPercent} absoluteDelta=${diagnostic.absoluteDeltaAgainstDisplayedPercentagePoints} relativeDelta=${diagnostic.relativeDeltaAgainstDisplayedPercent}% usedAsPassCriterion=${diagnostic.usedAsPassCriterion}`
  );

  assert.ok(Number.isFinite(calculatedDiagnosticRerPercent));
});

test("documents Fixture 012 blocked certificate and general RER rows", () => {
  const blockedKeys = new Set(
    fixture012RerDisplayReconciliation.blockedRows.map((row) => row.rowKey)
  );

  assert.ok(blockedKeys.has("general_rer_methodology"));
  assert.ok(blockedKeys.has("exact_primary_split_as_pass_criterion"));
  assert.ok(blockedKeys.has("energy_class_labels"));
  assert.ok(blockedKeys.has("co2_display_inconsistency"));
  assert.ok(blockedKeys.has("certificate_workflow"));

  for (const row of fixture012RerDisplayReconciliation.blockedRows) {
    assert.ok(row.source.length > 0);
    assert.ok(row.reason.length > 0);
  }
});
