import assert from "node:assert/strict";
import {
  calculateDirectTransmissionWithCorrectedU,
  calculateTotalTransmissionCoefficient
} from "../../transmissionCoefficients.mjs";
import { fixture004TransmissionLossTotals } from "./fixture004TransmissionLossTotals.mjs";

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

function compareMetric({ metricKey, expected, calculated, toleranceAbs = 0 }) {
  const delta = calculated - expected;
  const absoluteDelta = Math.abs(delta);
  const percentError = percentageError(delta, expected);

  console.log(
    `METRIC ${fixture004TransmissionLossTotals.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceAbs}`
  );

  assert.ok(
    absoluteDelta <= toleranceAbs,
    `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
  );

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function toCorrectedUElement(row) {
  return {
    elementId: row.elementId,
    uPrimeValue: row.uPrimeValueWPerM2K,
    areaM2: row.areaM2,
    source: `MC001 Anexa B page 520 row ${row.row}`
  };
}

function sumDirectDisplayedRows() {
  return fixture004TransmissionLossTotals.directExteriorRows.reduce(
    (sum, row) => sum + row.expectedHdWPerK,
    0
  );
}

function sumGroundDisplayedRows() {
  return fixture004TransmissionLossTotals.groundRows.reduce(
    (sum, row) => sum + row.expectedHgWPerK,
    0
  );
}

test("validates MC001 fixture 004 direct Hd rows with corrected U prime", () => {
  for (const row of fixture004TransmissionLossTotals.directExteriorRows) {
    const directTransmission = calculateDirectTransmissionWithCorrectedU({
      elements: [toCorrectedUElement(row)]
    });

    compareMetric({
      metricKey: `page520.row_${row.row}.${row.elementId}.hdFromDisplayedUPrimeWPerK`,
      expected: row.expectedHdWPerK,
      calculated: directTransmission.value,
      toleranceAbs: fixture004TransmissionLossTotals.tolerances.correctedUDirectRowAbsWPerK
    });

    assert.equal(directTransmission.formulaId, "MC001_2_12_HD_CORRECTED_U");
    assert.equal(directTransmission.method, "correctedUPrime");
    assert.deepEqual(directTransmission.warnings, []);
  }
});

test("validates MC001 fixture 004 page 520 displayed Hd and Hg totals", () => {
  compareMetric({
    metricKey: "page520.displayedHdRowsSumWPerK",
    expected: fixture004TransmissionLossTotals.page520Totals.displayedHdTotalWPerK,
    calculated: sumDirectDisplayedRows(),
    toleranceAbs: fixture004TransmissionLossTotals.tolerances.displayedComponentSumAbsWPerK
  });

  compareMetric({
    metricKey: "page520.displayedHgRowsSumWPerK",
    expected: fixture004TransmissionLossTotals.page520Totals.displayedHgTotalWPerK,
    calculated: sumGroundDisplayedRows(),
    toleranceAbs: fixture004TransmissionLossTotals.tolerances.displayedComponentSumAbsWPerK
  });

  compareMetric({
    metricKey: "page520.displayedHiuTotalWPerK",
    expected: 0,
    calculated: fixture004TransmissionLossTotals.page520Totals.displayedHiuTotalWPerK,
    toleranceAbs: fixture004TransmissionLossTotals.tolerances.displayedComponentSumAbsWPerK
  });
});

test("validates MC001 fixture 004 page 520 corrected-U Hd total with rounding tolerance", () => {
  const directTransmission = calculateDirectTransmissionWithCorrectedU({
    elements: fixture004TransmissionLossTotals.directExteriorRows.map(toCorrectedUElement)
  });

  compareMetric({
    metricKey: "page520.hdTotalFromDisplayedUPrimeWPerK",
    expected: fixture004TransmissionLossTotals.page520Totals.displayedHdTotalWPerK,
    calculated: directTransmission.value,
    toleranceAbs: fixture004TransmissionLossTotals.tolerances.correctedUDirectTotalAbsWPerK
  });

  assert.equal(directTransmission.formulaId, "MC001_2_12_HD_CORRECTED_U");
  assert.equal(directTransmission.method, "correctedUPrime");
  assert.deepEqual(directTransmission.warnings, []);
});

test("validates MC001 fixture 004 page 520 transmission subtotal from source components", () => {
  const totalTransmission = calculateTotalTransmissionCoefficient({
    hd: fixture004TransmissionLossTotals.page520Totals.displayedHdTotalWPerK,
    hg: fixture004TransmissionLossTotals.page520Totals.displayedHgTotalWPerK,
    hu: fixture004TransmissionLossTotals.page520Totals.displayedHiuTotalWPerK,
    applicability: {
      hgApplicable: true,
      huApplicable: true,
      haApplicable: false
    }
  });

  compareMetric({
    metricKey: "page520.formulaDerivedTransmissionSubtotalWPerK",
    expected: fixture004TransmissionLossTotals.expected.page520TransmissionSubtotalWPerK,
    calculated: totalTransmission.value,
    toleranceAbs:
      fixture004TransmissionLossTotals.tolerances.page520TransmissionSubtotalAbsWPerK
  });

  assert.equal(totalTransmission.formulaId, "MC001_2_15_HTR_TOTAL");
  assert.deepEqual(totalTransmission.warnings, []);
  assert.ok(
    totalTransmission.trace.assumptions.includes("ha_component_not_applicable_treated_as_zero")
  );
});

test("validates MC001 fixture 004 page 521 monthly Htr rows from displayed components", () => {
  const calculatedHtrValues = [];

  for (const row of fixture004TransmissionLossTotals.monthlyTransmissionRows) {
    const totalTransmission = calculateTotalTransmissionCoefficient({
      hd: fixture004TransmissionLossTotals.page520Totals.displayedHdTotalWPerK,
      hg: row.hgWPerK,
      hu: row.huWPerK,
      ha: row.haWPerK,
      applicability: {
        hgApplicable: true,
        huApplicable: true,
        haApplicable: true
      }
    });

    compareMetric({
      metricKey: `page521.${row.month}.htrWPerK`,
      expected: row.expectedHtrWPerK,
      calculated: totalTransmission.value,
      toleranceAbs: fixture004TransmissionLossTotals.tolerances.monthlyHtrAbsWPerK
    });

    assert.equal(totalTransmission.formulaId, "MC001_2_15_HTR_TOTAL");
    assert.deepEqual(totalTransmission.warnings, []);
    calculatedHtrValues.push(totalTransmission.value);
  }

  compareMetric({
    metricKey: "page521.maxMonthlyHtrWPerK",
    expected: fixture004TransmissionLossTotals.expected.displayedMaxMonthlyHtrWPerK,
    calculated: Math.max(...calculatedHtrValues),
    toleranceAbs: fixture004TransmissionLossTotals.tolerances.maxMonthlyHtrAbsWPerK
  });
});

test("documents Fixture 004 blocked rows without inventing inputs", () => {
  assert.deepEqual(
    fixture004TransmissionLossTotals.blockedRows.map((row) => row.source),
    ["Page 520 Hve total", "Page 521 H final", "Page 521 monthly Hg derivation"]
  );

  const groundRow = fixture004TransmissionLossTotals.groundRows[0];
  const directGroundProduct = groundRow.areaM2 * groundRow.uPrimeValueWPerM2K;
  assert.notEqual(directGroundProduct, groundRow.expectedHgWPerK);
});
