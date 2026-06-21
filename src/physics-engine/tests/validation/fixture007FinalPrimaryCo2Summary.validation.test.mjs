import assert from "node:assert/strict";
import {
  calculateCO2EmissionsFromFinalEnergy,
  calculateFinalEnergyTotal,
  calculatePrimaryCO2Summary,
  calculatePrimaryEnergyFromFinalEnergy,
  calculateSpecificIndicator
} from "../../finalPrimaryCo2Indicators.mjs";
import { fixture007FinalPrimaryCo2Summary } from "./fixture007FinalPrimaryCo2Summary.mjs";

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
    `METRIC ${fixture007FinalPrimaryCo2Summary.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceText}`
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
    toleranceAbs: fixture007FinalPrimaryCo2Summary.tolerances.exactAbs
  });
}

function expectedServiceValue(expectedByService, serviceKey) {
  return expectedByService[serviceKey] ?? 0;
}

test("validates MC001 fixture 007 final energy summation", () => {
  const result = calculateFinalEnergyTotal(
    fixture007FinalPrimaryCo2Summary.finalEnergyEntries
  );

  assertExactMetric(
    "finalEnergy.totalKWh",
    fixture007FinalPrimaryCo2Summary.expected.finalEnergyTotalKWh,
    result.valueKWh
  );

  for (const [carrierKey, expected] of Object.entries(
    fixture007FinalPrimaryCo2Summary.expected.finalEnergyByCarrierKWh
  )) {
    assertExactMetric(
      `finalEnergy.byCarrier.${carrierKey}`,
      expected,
      result.breakdownByCarrier[carrierKey]
    );
  }

  for (const [serviceKey, expected] of Object.entries(
    fixture007FinalPrimaryCo2Summary.expected.finalEnergyByServiceKWh
  )) {
    assertExactMetric(
      `finalEnergy.byService.${serviceKey}`,
      expected,
      result.breakdownByService[serviceKey]
    );
  }

  assert.equal(result.trace.formulaId, "MC001_TOTAL_FINAL_ENERGY_ANNUAL_SUM");
});

test("validates MC001 fixture 007 primary energy using Tabel 5.17 factors", () => {
  const result = calculatePrimaryEnergyFromFinalEnergy(
    fixture007FinalPrimaryCo2Summary.finalEnergyEntries
  );

  assert.equal(result.status, "calculated");

  assertExactMetric(
    "primary.renewableKWh",
    fixture007FinalPrimaryCo2Summary.expected.primaryEnergy.renewablePrimaryEnergyKWh,
    result.renewablePrimaryEnergyKWh
  );
  assertExactMetric(
    "primary.nonRenewableKWh",
    fixture007FinalPrimaryCo2Summary.expected.primaryEnergy.nonRenewablePrimaryEnergyKWh,
    result.nonRenewablePrimaryEnergyKWh
  );
  assertExactMetric(
    "primary.totalKWh",
    fixture007FinalPrimaryCo2Summary.expected.primaryEnergy.totalPrimaryEnergyKWh,
    result.totalPrimaryEnergyKWh
  );

  for (const entry of result.entries) {
    assertExactMetric(
      `primary.byService.${entry.serviceKey}`,
      expectedServiceValue(
        fixture007FinalPrimaryCo2Summary.expected.primaryEnergyByServiceKWh,
        entry.serviceKey
      ),
      entry.totalPrimaryEnergyKWh
    );
    assert.equal(entry.sourceTable, "MC001-2022 Tabel 5.17");
  }

  assert.equal(result.trace.formulaId, "MC001_5_4A_PRIMARY_ENERGY_TOTAL");
});

test("validates MC001 fixture 007 CO2 using primary energy and Tabel 5.18 factors", () => {
  const result = calculateCO2EmissionsFromFinalEnergy(
    fixture007FinalPrimaryCo2Summary.finalEnergyEntries
  );

  assert.equal(result.status, "calculated");

  assertExactMetric(
    "co2.totalKg",
    fixture007FinalPrimaryCo2Summary.expected.co2.totalCO2Kg,
    result.totalCO2Kg
  );

  for (const entry of result.entries) {
    assertExactMetric(
      `co2.byService.${entry.serviceKey}`,
      expectedServiceValue(fixture007FinalPrimaryCo2Summary.expected.co2ByServiceKg, entry.serviceKey),
      entry.co2Kg
    );
    assert.equal(entry.primaryEnergySourceTable, "MC001-2022 Tabel 5.17");
    assert.equal(entry.co2SourceTable, "MC001-2022 Tabel 5.18");
  }

  assert.equal(result.trace.formulaId, "MC001_5_4B_CO2_EMISSIONS");
  assert.ok(
    result.trace.assumptions.includes(
      "co2_uses_primary_energy_terms_per_mc001_relation_5_4b"
    )
  );
});

test("validates MC001 fixture 007 specific indicators per reference area", () => {
  const primarySpecific = calculateSpecificIndicator(
    fixture007FinalPrimaryCo2Summary.expected.primaryEnergy.totalPrimaryEnergyKWh,
    fixture007FinalPrimaryCo2Summary.referenceAreaM2,
    { unitNumerator: "kWh" }
  );
  const co2Specific = calculateSpecificIndicator(
    fixture007FinalPrimaryCo2Summary.expected.co2.totalCO2Kg,
    fixture007FinalPrimaryCo2Summary.referenceAreaM2,
    { unitNumerator: "kgCO2" }
  );

  assertExactMetric(
    "specific.primaryKWhPerM2",
    fixture007FinalPrimaryCo2Summary.expected.primaryEnergy
      .specificPrimaryEnergyKWhPerM2,
    primarySpecific.valuePerM2
  );
  assertExactMetric(
    "specific.co2KgPerM2",
    fixture007FinalPrimaryCo2Summary.expected.co2.specificCO2KgPerM2,
    co2Specific.valuePerM2
  );

  assert.equal(primarySpecific.status, "calculated");
  assert.equal(co2Specific.status, "calculated");
});

test("validates MC001 fixture 007 primary CO2 summary helper", () => {
  const result = calculatePrimaryCO2Summary(
    fixture007FinalPrimaryCo2Summary.finalEnergyEntries,
    fixture007FinalPrimaryCo2Summary.referenceAreaM2
  );

  assert.equal(result.status, "calculated");

  assertExactMetric(
    "summary.finalEnergyKWh",
    fixture007FinalPrimaryCo2Summary.expected.finalEnergyTotalKWh,
    result.finalEnergy.valueKWh
  );
  assertExactMetric(
    "summary.primaryKWh",
    fixture007FinalPrimaryCo2Summary.expected.primaryEnergy.totalPrimaryEnergyKWh,
    result.primaryEnergy.totalPrimaryEnergyKWh
  );
  assertExactMetric(
    "summary.co2Kg",
    fixture007FinalPrimaryCo2Summary.expected.co2.totalCO2Kg,
    result.co2Emissions.totalCO2Kg
  );
  assertExactMetric(
    "summary.specificPrimaryKWhPerM2",
    fixture007FinalPrimaryCo2Summary.expected.primaryEnergy
      .specificPrimaryEnergyKWhPerM2,
    result.specificPrimaryEnergy.valuePerM2
  );
  assertExactMetric(
    "summary.specificCO2KgPerM2",
    fixture007FinalPrimaryCo2Summary.expected.co2.specificCO2KgPerM2,
    result.specificCO2.valuePerM2
  );

  assert.equal("energyClass" in result, false);
  assert.equal("certificate" in result, false);
});

test("compares Fixture 007 primary output to rounded Anexa B display total", () => {
  const result = calculatePrimaryEnergyFromFinalEnergy(
    fixture007FinalPrimaryCo2Summary.finalEnergyEntries
  );
  const displayed = fixture007FinalPrimaryCo2Summary.sourceDisplayedComparisons
    .anexaBPrimaryEnergy;
  const calculatedSpecific =
    result.totalPrimaryEnergyKWh / fixture007FinalPrimaryCo2Summary.referenceAreaM2;

  metric({
    metricKey: "sourceDisplay.primaryTotalKWh",
    expected: displayed.totalPrimaryEnergyKWh,
    calculated: result.totalPrimaryEnergyKWh,
    toleranceAbs: fixture007FinalPrimaryCo2Summary.tolerances.sourcePrimaryTotalAbsKWh
  });
  metric({
    metricKey: "sourceDisplay.primarySpecificKWhPerM2",
    expected: displayed.specificPrimaryEnergyKWhPerM2,
    calculated: calculatedSpecific,
    toleranceAbs:
      fixture007FinalPrimaryCo2Summary.tolerances.sourcePrimarySpecificAbsKWhPerM2
  });
});

test("logs blocked Anexa B CO2 display comparison without forcing table-factor mismatch", () => {
  const result = calculateCO2EmissionsFromFinalEnergy(
    fixture007FinalPrimaryCo2Summary.finalEnergyEntries
  );
  const displayed = fixture007FinalPrimaryCo2Summary.sourceDisplayedComparisons.anexaBCO2;
  const calculatedSpecific =
    result.totalCO2Kg / fixture007FinalPrimaryCo2Summary.referenceAreaM2;

  metric({
    metricKey: "sourceDisplay.blockedCo2TotalKg",
    expected: displayed.totalCO2KgFromSpecific,
    calculated: result.totalCO2Kg
  });
  metric({
    metricKey: "sourceDisplay.blockedCo2SpecificKgPerM2",
    expected: displayed.specificCO2KgPerM2,
    calculated: calculatedSpecific
  });

  assert.equal(
    displayed.status,
    "blocked_worked_example_double_counts_electric_renewable_share"
  );
});

test("documents Fixture 007 blocked rows without invented inputs", () => {
  assert.deepEqual(
    fixture007FinalPrimaryCo2Summary.blockedRows.map((row) => row.source),
    [
      "Page 523 heating annual final-energy text",
      "Page 527/page 540 electric-service CO2 display rows",
      "Page 527 RER and class outputs"
    ]
  );
});
