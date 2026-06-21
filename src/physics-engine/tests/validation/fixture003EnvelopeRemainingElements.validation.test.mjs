import assert from "node:assert/strict";
import {
  calculateLambdaCorrected,
  calculateLayerResistance,
  calculateTotalResistance,
  calculateUValue
} from "../../materialsUValues.mjs";
import {
  calculateDirectTransmissionWithBridges,
  calculateDirectTransmissionWithCorrectedU,
  calculateTotalTransmissionCoefficient
} from "../../transmissionCoefficients.mjs";
import { fixture003EnvelopeRemainingElements } from "./fixture003EnvelopeRemainingElements.mjs";

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
    `METRIC ${fixture003EnvelopeRemainingElements.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceAbs}`
  );

  assert.ok(
    absoluteDelta <= toleranceAbs,
    `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
  );

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

function bridgeContribution(row) {
  return row.psiWPerMK * row.multiplicity * row.lengthM;
}

function toLinearBridgeInput(row) {
  return {
    bridgeId: row.bridgeId,
    psi: row.psiWPerMK,
    lengthM: row.multiplicity * row.lengthM,
    source: `MC001 Anexa B page 517 row ${row.row}`
  };
}

function calculateElementThermalResults(element) {
  const layersR = [];

  for (const layer of element.layers) {
    const lambdaCorrected = calculateLambdaCorrected({
      lambdaNormat: layer.lambdaNormatWPerMK,
      correctionCoefficientA: layer.correctionCoefficientA,
      materialId: layer.layerId,
      source: `${fixture003EnvelopeRemainingElements.fixtureId} ${element.label} ${layer.label}`
    });

    compareMetric({
      metricKey: `${element.elementId}.${layer.layerId}.lambdaCorrectedWPerMK`,
      expected: layer.expectedLambdaCorrectedRoundedWPerMK,
      calculated: lambdaCorrected.value,
      toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.lambdaCorrectedAbsWPerMK
    });

    const layerResistance = calculateLayerResistance({
      thicknessM: layer.thicknessM,
      lambdaWmK: lambdaCorrected.value
    });

    compareMetric({
      metricKey: `${element.elementId}.${layer.layerId}.resistanceM2KPerW`,
      expected: layer.expectedResistanceRoundedM2KPerW,
      calculated: layerResistance.value,
      toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.layerResistanceAbsM2KPerW
    });

    layersR.push(layerResistance.value);
  }

  const totalResistance = calculateTotalResistance({
    rsi: element.rsiM2KPerW,
    layersR,
    airLayersR: [],
    rse: element.rseM2KPerW
  });

  compareMetric({
    metricKey: `${element.elementId}.totalResistanceM2KPerW`,
    expected: element.expectedTotalResistanceRoundedM2KPerW,
    calculated: totalResistance.value,
    toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.totalResistanceAbsM2KPerW
  });

  const correctedResistance =
    totalResistance.value * element.thermalBridgeReductionFactor;

  compareMetric({
    metricKey: `${element.elementId}.correctedResistanceFromRoundedFactorM2KPerW`,
    expected: element.expectedCorrectedResistanceRoundedM2KPerW,
    calculated: correctedResistance,
    toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.correctedResistanceAbsM2KPerW
  });

  const plainU = calculateUValue({ totalResistance: totalResistance.value });

  compareMetric({
    metricKey: `${element.elementId}.plainUValueWPerM2K`,
    expected: 1 / element.expectedTotalResistanceRoundedM2KPerW,
    calculated: plainU.value,
    toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.plainUAbsWPerM2K
  });

  return { layersR, totalResistance, correctedResistance, plainU };
}

test("validates MC001 fixture 003 material lambdas, layer R, total R and plain U", () => {
  for (const element of fixture003EnvelopeRemainingElements.elements) {
    calculateElementThermalResults(element);
  }
});

test("validates MC001 fixture 003 bridge row contributions and subtotals", () => {
  for (const element of fixture003EnvelopeRemainingElements.elements) {
    for (const row of element.bridges) {
      compareMetric({
        metricKey: `${element.elementId}.${row.row}.bridgeContributionWPerK`,
        expected: row.expectedContributionWPerK,
        calculated: bridgeContribution(row),
        toleranceAbs:
          fixture003EnvelopeRemainingElements.tolerances.bridgeRowContributionAbsWPerK
      });
    }

    const displayedSubtotal = element.bridges.reduce(
      (sum, row) => sum + row.expectedContributionWPerK,
      0
    );
    const calculatedSubtotal = element.bridges.reduce(
      (sum, row) => sum + bridgeContribution(row),
      0
    );

    compareMetric({
      metricKey: `${element.elementId}.bridgeSubtotalDisplayedWPerK`,
      expected: element.expectedBridgeSubtotalDisplayedWPerK,
      calculated: displayedSubtotal,
      toleranceAbs: 1e-12
    });

    compareMetric({
      metricKey: `${element.elementId}.bridgeSubtotalFromPsiLengthWPerK`,
      expected: element.expectedBridgeSubtotalDisplayedWPerK,
      calculated: calculatedSubtotal,
      toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.bridgeSubtotalAbsWPerK
    });

    const bridgeOnlyTransmission = calculateDirectTransmissionWithBridges({
      elements: [],
      linearBridges: element.bridges.map(toLinearBridgeInput)
    });

    compareMetric({
      metricKey: `${element.elementId}.bridgeSubtotalViaDirectTransmissionHelperWPerK`,
      expected: element.expectedBridgeSubtotalDisplayedWPerK,
      calculated: bridgeOnlyTransmission.value,
      toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.bridgeSubtotalAbsWPerK
    });

    assert.equal(bridgeOnlyTransmission.formulaId, "MC001_2_11_HD_WITH_BRIDGES");
    assert.deepEqual(bridgeOnlyTransmission.warnings, []);
  }
});

test("validates MC001 fixture 003 terrace transmission where source provides Hd", () => {
  const terrace = fixture003EnvelopeRemainingElements.elements.find(
    (element) => element.elementId === "terrace_before_renovation"
  );
  const { plainU } = calculateElementThermalResults(terrace);

  const explicitBridgeTransmission = calculateDirectTransmissionWithBridges({
    elements: [
      {
        elementId: terrace.elementId,
        uValue: plainU.value,
        areaM2: terrace.sourceTransmission.areaM2
      }
    ],
    linearBridges: terrace.bridges.map(toLinearBridgeInput)
  });

  compareMetric({
    metricKey: "terrace.explicitBridgeHdWPerK",
    expected: fixture003EnvelopeRemainingElements.expected.terraceExplicitBridgeHdDisplayedWPerK,
    calculated: explicitBridgeTransmission.value,
    toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.terraceTransmissionAbsWPerK
  });

  const correctedUTransmission = calculateDirectTransmissionWithCorrectedU({
    elements: [
      {
        elementId: terrace.elementId,
        uPrimeValue: terrace.sourceTransmission.displayedUPrimeWPerM2K,
        areaM2: terrace.sourceTransmission.areaM2,
        source: "MC001 Anexa B page 520 terrace row"
      }
    ]
  });

  compareMetric({
    metricKey: "terrace.correctedUHdWPerK",
    expected: fixture003EnvelopeRemainingElements.expected.terraceCorrectedUHdDisplayedWPerK,
    calculated: correctedUTransmission.value,
    toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.terraceTransmissionAbsWPerK
  });
});

test("validates MC001 fixture 003 source component sum with total transmission wrapper", () => {
  const terrace = fixture003EnvelopeRemainingElements.elements.find(
    (element) => element.elementId === "terrace_before_renovation"
  );
  const slab = fixture003EnvelopeRemainingElements.elements.find(
    (element) => element.elementId === "slab_on_ground_before_renovation"
  );

  const totalTransmission = calculateTotalTransmissionCoefficient({
    hd: terrace.sourceTransmission.displayedHdWPerK,
    hg: slab.sourceTransmission.displayedHgWPerK,
    applicability: {
      hgApplicable: true,
      huApplicable: false,
      haApplicable: false
    }
  });

  compareMetric({
    metricKey: "fixtureScopedTerraceHdPlusSlabHgWPerK",
    expected:
      fixture003EnvelopeRemainingElements.expected
        .fixtureScopedSourceTransmissionComponentsWPerK,
    calculated: totalTransmission.value,
    toleranceAbs: fixture003EnvelopeRemainingElements.tolerances.totalTransmissionAbsWPerK
  });

  assert.equal(totalTransmission.formulaId, "MC001_2_15_HTR_TOTAL");
  assert.deepEqual(totalTransmission.warnings, []);
  assert.ok(
    totalTransmission.trace.assumptions.includes("hu_component_not_applicable_treated_as_zero")
  );
  assert.ok(
    totalTransmission.trace.assumptions.includes("ha_component_not_applicable_treated_as_zero")
  );
});

test("documents blocked Fixture 003 calculations without inventing inputs", () => {
  assert.deepEqual(fixture003EnvelopeRemainingElements.blockedCalculators, [
    {
      functionName: "calculateLinearBridgePsi",
      reason: "No numeric L2D values are provided for these examples."
    }
  ]);

  const floorOverBasement = fixture003EnvelopeRemainingElements.elements.find(
    (element) => element.elementId === "floor_over_basement_before_renovation"
  );
  assert.match(floorOverBasement.sourceTransmission.blockedReason, /neglected/);
});
