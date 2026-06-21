import assert from "node:assert/strict";
import {
  calculateDirectTransmissionWithBridges,
  calculateTotalTransmissionCoefficient
} from "../../transmissionCoefficients.mjs";
import { fixture002EnvelopeBridges } from "./fixture002EnvelopeBridges.mjs";

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
    `METRIC ${fixture002EnvelopeBridges.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceAbs}`
  );

  assert.ok(
    absoluteDelta <= toleranceAbs,
    `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
  );

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function calculateBridgeContribution(row) {
  return row.psiWPerMK * row.multiplicity * row.lengthM;
}

function toLinearBridgeInput(row) {
  return {
    bridgeId: row.bridgeId,
    psi: row.psiWPerMK,
    lengthM: row.multiplicity * row.lengthM,
    source: `MC001 Anexa B Tabel 2.3 row ${row.row}`
  };
}

test("validates individual MC001 fixture 002 bridge row contributions", () => {
  for (const row of fixture002EnvelopeBridges.verifiedLinearBridgeRows) {
    compareMetric({
      metricKey: `row_${row.row}.bridgeContributionWPerK`,
      expected: row.expectedContributionWPerK,
      calculated: calculateBridgeContribution(row),
      toleranceAbs: fixture002EnvelopeBridges.tolerances.bridgeRowContributionAbsWPerK
    });
  }
});

test("validates MC001 fixture 002 verified bridge subtotal", () => {
  const displayedSubtotal = fixture002EnvelopeBridges.verifiedLinearBridgeRows.reduce(
    (sum, row) => sum + row.expectedContributionWPerK,
    0
  );
  const calculatedSubtotal = fixture002EnvelopeBridges.verifiedLinearBridgeRows.reduce(
    (sum, row) => sum + calculateBridgeContribution(row),
    0
  );

  compareMetric({
    metricKey: "verifiedBridgeSubtotalDisplayedWPerK",
    expected: fixture002EnvelopeBridges.expected.verifiedBridgeSubtotalDisplayedWPerK,
    calculated: displayedSubtotal,
    toleranceAbs: 1e-12
  });

  compareMetric({
    metricKey: "verifiedBridgeSubtotalFromPsiLengthWPerK",
    expected: fixture002EnvelopeBridges.expected.verifiedBridgeSubtotalDisplayedWPerK,
    calculated: calculatedSubtotal,
    toleranceAbs: fixture002EnvelopeBridges.tolerances.bridgeSubtotalAbsWPerK
  });
});

test("validates MC001 fixture 002 direct transmission with verified bridge rows", () => {
  const directTransmission = calculateDirectTransmissionWithBridges({
    elements: [
      {
        elementId: fixture002EnvelopeBridges.element.elementId,
        uValue: fixture002EnvelopeBridges.element.sourcePlainUValueWPerM2K,
        areaM2: fixture002EnvelopeBridges.element.areaM2
      }
    ],
    linearBridges: fixture002EnvelopeBridges.verifiedLinearBridgeRows.map(toLinearBridgeInput)
  });

  compareMetric({
    metricKey: "directTransmissionWithVerifiedBridgesWPerK",
    expected: fixture002EnvelopeBridges.expected.directTransmissionWithVerifiedBridgesWPerK,
    calculated: directTransmission.value,
    toleranceAbs: fixture002EnvelopeBridges.tolerances.directTransmissionAbsWPerK
  });

  assert.equal(directTransmission.formulaId, "MC001_2_11_HD_WITH_BRIDGES");
  assert.equal(directTransmission.method, "plainUWithExplicitBridges");
  assert.deepEqual(directTransmission.warnings, []);
});

test("validates MC001 fixture 002 direct-only total transmission wrapper", () => {
  const directTransmission = calculateDirectTransmissionWithBridges({
    elements: [
      {
        elementId: fixture002EnvelopeBridges.element.elementId,
        uValue: fixture002EnvelopeBridges.element.sourcePlainUValueWPerM2K,
        areaM2: fixture002EnvelopeBridges.element.areaM2
      }
    ],
    linearBridges: fixture002EnvelopeBridges.verifiedLinearBridgeRows.map(toLinearBridgeInput)
  });
  const totalTransmission = calculateTotalTransmissionCoefficient({
    hd: directTransmission.value,
    applicability: {
      hgApplicable: false,
      huApplicable: false,
      haApplicable: false
    }
  });

  compareMetric({
    metricKey: "fixtureScopedTotalTransmissionWPerK",
    expected: fixture002EnvelopeBridges.expected.directTransmissionWithVerifiedBridgesWPerK,
    calculated: totalTransmission.value,
    toleranceAbs: fixture002EnvelopeBridges.tolerances.totalTransmissionAbsWPerK
  });

  assert.equal(totalTransmission.formulaId, "MC001_2_15_HTR_TOTAL");
  assert.deepEqual(totalTransmission.warnings, []);
  assert.ok(
    totalTransmission.trace.assumptions.includes("hg_component_not_applicable_treated_as_zero")
  );
  assert.ok(
    totalTransmission.trace.assumptions.includes("hu_component_not_applicable_treated_as_zero")
  );
  assert.ok(
    totalTransmission.trace.assumptions.includes("ha_component_not_applicable_treated_as_zero")
  );
});

test("documents non-executable L2D psi derivation without inventing inputs", () => {
  assert.deepEqual(fixture002EnvelopeBridges.blockedCalculators, [
    {
      functionName: "calculateLinearBridgePsi",
      reason: "MC001 Tabel 2.3 provides sourced psi values but no numeric L2D values."
    }
  ]);

  for (const row of fixture002EnvelopeBridges.blockedRows) {
    assert.equal(row.missing, "lengthM", row.row);
  }
});
