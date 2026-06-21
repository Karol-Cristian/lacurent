import assert from "node:assert/strict";
import {
  calculateFinalEnergyTotal,
  calculatePrimaryCO2Summary,
  calculatePrimaryEnergyFromFinalEnergy,
  calculateSpecificIndicator
} from "../../finalPrimaryCo2Indicators.mjs";
import { fixture008ServiceFinalPrimaryRows } from "./fixture008ServiceFinalPrimaryRows.mjs";

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

function metric({ metricKey, expected, calculated, toleranceAbs = null }) {
  const delta = calculated - expected;
  const absoluteDelta = Math.abs(delta);
  const percentError = percentageError(delta, expected);
  const toleranceText = toleranceAbs === null ? "not_asserted" : toleranceAbs;

  console.log(
    `METRIC ${fixture008ServiceFinalPrimaryRows.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceText}`
  );

  if (toleranceAbs !== null) {
    assert.ok(
      absoluteDelta <= toleranceAbs,
      `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
    );
  }

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function assertExactMetric(metricKey, expected, calculated) {
  metric({
    metricKey,
    expected,
    calculated,
    toleranceAbs: fixture008ServiceFinalPrimaryRows.tolerances.exactAbs
  });
}

function expectedPrimaryByService(serviceKey) {
  const expected =
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergyByServiceKWh[serviceKey];

  assert.ok(expected, `Missing expected primary energy for service ${serviceKey}`);

  return expected;
}

test("validates MC001 fixture 008 service final-energy rows", () => {
  const result = calculateFinalEnergyTotal(
    fixture008ServiceFinalPrimaryRows.finalEnergyEntries
  );

  assertExactMetric(
    "finalEnergy.totalKWh",
    fixture008ServiceFinalPrimaryRows.expected.finalEnergyTotalKWh,
    result.valueKWh
  );

  for (const [carrierKey, expected] of Object.entries(
    fixture008ServiceFinalPrimaryRows.expected.finalEnergyByCarrierKWh
  )) {
    assertExactMetric(
      `finalEnergy.byCarrier.${carrierKey}`,
      expected,
      result.breakdownByCarrier[carrierKey]
    );
  }

  for (const [serviceKey, expected] of Object.entries(
    fixture008ServiceFinalPrimaryRows.expected.finalEnergyByServiceKWh
  )) {
    assertExactMetric(
      `finalEnergy.byService.${serviceKey}`,
      expected,
      result.breakdownByService[serviceKey]
    );
  }

  assert.equal(result.trace.formulaId, "MC001_TOTAL_FINAL_ENERGY_ANNUAL_SUM");
});

test("validates MC001 fixture 008 service primary-energy rows using Tabel 5.17", () => {
  const result = calculatePrimaryEnergyFromFinalEnergy(
    fixture008ServiceFinalPrimaryRows.finalEnergyEntries
  );

  assert.equal(result.status, "calculated");

  assertExactMetric(
    "primary.renewableKWh",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy
      .renewablePrimaryEnergyKWh,
    result.renewablePrimaryEnergyKWh
  );
  assertExactMetric(
    "primary.nonRenewableKWh",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy
      .nonRenewablePrimaryEnergyKWh,
    result.nonRenewablePrimaryEnergyKWh
  );
  assertExactMetric(
    "primary.totalKWh",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy.totalPrimaryEnergyKWh,
    result.totalPrimaryEnergyKWh
  );

  for (const entry of result.entries) {
    const expected = expectedPrimaryByService(entry.serviceKey);
    const expectedFactor =
      fixture008ServiceFinalPrimaryRows.factors[entry.energyCarrierKey];

    assertExactMetric(
      `primary.byService.${entry.serviceKey}.renewableKWh`,
      expected.renewablePrimaryEnergyKWh,
      entry.renewablePrimaryEnergyKWh
    );
    assertExactMetric(
      `primary.byService.${entry.serviceKey}.nonRenewableKWh`,
      expected.nonRenewablePrimaryEnergyKWh,
      entry.nonRenewablePrimaryEnergyKWh
    );
    assertExactMetric(
      `primary.byService.${entry.serviceKey}.totalKWh`,
      expected.totalPrimaryEnergyKWh,
      entry.totalPrimaryEnergyKWh
    );

    assertExactMetric(
      `primary.factor.${entry.serviceKey}.fPren`,
      expectedFactor.renewablePrimaryEnergyFactor,
      entry.renewablePrimaryEnergyFactor
    );
    assertExactMetric(
      `primary.factor.${entry.serviceKey}.fPnren`,
      expectedFactor.nonRenewablePrimaryEnergyFactor,
      entry.nonRenewablePrimaryEnergyFactor
    );
    assertExactMetric(
      `primary.factor.${entry.serviceKey}.fPtot`,
      expectedFactor.totalPrimaryEnergyFactor,
      entry.totalPrimaryEnergyFactor
    );
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 5.17");
  }

  assert.equal(result.trace.formulaId, "MC001_5_4A_PRIMARY_ENERGY_TOTAL");
});

test("validates MC001 fixture 008 service and total specific primary indicators", () => {
  for (const [serviceKey, expected] of Object.entries(
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergyByServiceKWh
  )) {
    const result = calculateSpecificIndicator(
      expected.totalPrimaryEnergyKWh,
      fixture008ServiceFinalPrimaryRows.referenceAreaM2,
      { unitNumerator: "kWh" }
    );

    assert.equal(result.status, "calculated");
    assertExactMetric(
      `specific.primary.byService.${serviceKey}`,
      expected.specificTotalPrimaryEnergyKWhPerM2,
      result.valuePerM2
    );
  }

  const renewableSpecific = calculateSpecificIndicator(
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy.renewablePrimaryEnergyKWh,
    fixture008ServiceFinalPrimaryRows.referenceAreaM2,
    { unitNumerator: "kWh" }
  );
  const nonRenewableSpecific = calculateSpecificIndicator(
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy
      .nonRenewablePrimaryEnergyKWh,
    fixture008ServiceFinalPrimaryRows.referenceAreaM2,
    { unitNumerator: "kWh" }
  );
  const totalSpecific = calculateSpecificIndicator(
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy.totalPrimaryEnergyKWh,
    fixture008ServiceFinalPrimaryRows.referenceAreaM2,
    { unitNumerator: "kWh" }
  );

  assertExactMetric(
    "specific.primary.renewable",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy
      .specificRenewablePrimaryEnergyKWhPerM2,
    renewableSpecific.valuePerM2
  );
  assertExactMetric(
    "specific.primary.nonRenewable",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy
      .specificNonRenewablePrimaryEnergyKWhPerM2,
    nonRenewableSpecific.valuePerM2
  );
  assertExactMetric(
    "specific.primary.total",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy
      .specificTotalPrimaryEnergyKWhPerM2,
    totalSpecific.valuePerM2
  );
});

test("compares Fixture 008 primary rows to rounded Anexa B displays", () => {
  const result = calculatePrimaryEnergyFromFinalEnergy(
    fixture008ServiceFinalPrimaryRows.finalEnergyEntries
  );
  const primaryByService = Object.fromEntries(
    result.entries.map((entry) => [entry.serviceKey, entry])
  );

  metric({
    metricKey: "sourceDisplay.heatingPrimaryPage523",
    expected:
      fixture008ServiceFinalPrimaryRows.sourceDisplayedComparisons
        .heatingPrimaryPage523.totalPrimaryEnergyKWh,
    calculated: primaryByService.heating.totalPrimaryEnergyKWh,
    toleranceAbs:
      fixture008ServiceFinalPrimaryRows.tolerances
        .sourceHeatingPrimaryPage523AbsKWh
  });

  metric({
    metricKey: "sourceDisplay.heatingSpecificPage533",
    expected:
      fixture008ServiceFinalPrimaryRows.sourceDisplayedComparisons
        .heatingSpecificPage533.specificPrimaryEnergyKWhPerM2,
    calculated:
      primaryByService.heating.totalPrimaryEnergyKWh /
      fixture008ServiceFinalPrimaryRows.referenceAreaM2,
    toleranceAbs:
      fixture008ServiceFinalPrimaryRows.tolerances.sourceServiceSpecificAbsKWhPerM2
  });

  metric({
    metricKey: "sourceDisplay.ventilationSpecificPage533",
    expected:
      fixture008ServiceFinalPrimaryRows.sourceDisplayedComparisons
        .ventilationSpecificPage533.specificPrimaryEnergyKWhPerM2,
    calculated:
      primaryByService.ventilation.totalPrimaryEnergyKWh /
      fixture008ServiceFinalPrimaryRows.referenceAreaM2,
    toleranceAbs:
      fixture008ServiceFinalPrimaryRows.tolerances.sourceServiceSpecificAbsKWhPerM2
  });

  metric({
    metricKey: "sourceDisplay.totalPrimaryPage527",
    expected:
      fixture008ServiceFinalPrimaryRows.sourceDisplayedComparisons.totalPrimaryPage527
        .totalPrimaryEnergyKWh,
    calculated: result.totalPrimaryEnergyKWh,
    toleranceAbs:
      fixture008ServiceFinalPrimaryRows.tolerances.sourceTotalPrimaryPage527AbsKWh
  });

  metric({
    metricKey: "sourceDisplay.totalPrimarySpecificPage527",
    expected:
      fixture008ServiceFinalPrimaryRows.sourceDisplayedComparisons.totalPrimaryPage527
        .specificPrimaryEnergyKWhPerM2,
    calculated:
      result.totalPrimaryEnergyKWh / fixture008ServiceFinalPrimaryRows.referenceAreaM2,
    toleranceAbs:
      fixture008ServiceFinalPrimaryRows.tolerances
        .sourceTotalPrimarySpecificPage527AbsKWhPerM2
  });
});

test("validates MC001 fixture 008 primary sub-results through the summary helper", () => {
  const result = calculatePrimaryCO2Summary(
    fixture008ServiceFinalPrimaryRows.finalEnergyEntries,
    fixture008ServiceFinalPrimaryRows.referenceAreaM2
  );

  assert.equal(result.status, "calculated");

  assertExactMetric(
    "summary.finalEnergyKWh",
    fixture008ServiceFinalPrimaryRows.expected.finalEnergyTotalKWh,
    result.finalEnergy.valueKWh
  );
  assertExactMetric(
    "summary.primaryRenewableKWh",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy
      .renewablePrimaryEnergyKWh,
    result.primaryEnergy.renewablePrimaryEnergyKWh
  );
  assertExactMetric(
    "summary.primaryNonRenewableKWh",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy
      .nonRenewablePrimaryEnergyKWh,
    result.primaryEnergy.nonRenewablePrimaryEnergyKWh
  );
  assertExactMetric(
    "summary.primaryTotalKWh",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy.totalPrimaryEnergyKWh,
    result.primaryEnergy.totalPrimaryEnergyKWh
  );
  assertExactMetric(
    "summary.specificPrimaryKWhPerM2",
    fixture008ServiceFinalPrimaryRows.expected.primaryEnergy
      .specificTotalPrimaryEnergyKWhPerM2,
    result.specificPrimaryEnergy.valuePerM2
  );

  assert.equal("energyClass" in result, false);
  assert.equal("certificate" in result, false);
  assert.equal("rer" in result, false);
});

test("documents Fixture 008 blocked rows without asserting CO2 or certificate outputs", () => {
  assert.deepEqual(
    fixture008ServiceFinalPrimaryRows.blockedRows.map((row) => row.source),
    [
      "Page 523 heating annual final-energy prose value 100.06 MWh/an",
      "Page 527/page 540 CO2 display rows",
      "Page 527 RER row",
      "Certificate class and certificate output rows"
    ]
  );
});
