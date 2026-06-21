import assert from "node:assert/strict";
import {
  calculateLambdaCorrected,
  calculateLayerResistance,
  calculateTotalResistance,
  calculateUValue
} from "../../materialsUValues.mjs";
import { calculateDirectTransmissionWithCorrectedU } from "../../transmissionCoefficients.mjs";
import { fixture001Envelope } from "./fixture001Envelope.mjs";

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
    `METRIC ${fixture001Envelope.fixtureId}.${metricKey} expected=${expected} calculated=${calculated} absoluteDelta=${absoluteDelta} percentageError=${percentError}% toleranceAbs=${toleranceAbs}`
  );

  assert.ok(
    absoluteDelta <= toleranceAbs,
    `${metricKey} expected ${expected}, calculated ${calculated}, absolute delta ${absoluteDelta}, percentage error ${percentError}%`
  );

  return { metricKey, expected, calculated, absoluteDelta, percentError, toleranceAbs };
}

test("validates MC001 fixture 001 material lambdas, layer R, total R and plain U", () => {
  const calculatedLayerResistances = [];

  for (const layer of fixture001Envelope.layers) {
    const lambdaCorrected = calculateLambdaCorrected({
      lambdaNormat: layer.lambdaNormatWPerMK,
      correctionCoefficientA: layer.correctionCoefficientA,
      materialId: layer.layerId,
      source: `${fixture001Envelope.fixtureId} ${layer.label}`
    });

    compareMetric({
      metricKey: `${layer.layerId}.lambdaCorrectedWPerMK`,
      expected: layer.expectedLambdaCorrectedRoundedWPerMK,
      calculated: lambdaCorrected.value,
      toleranceAbs: fixture001Envelope.tolerances.lambdaCorrectedAbsWPerMK
    });

    const layerResistance = calculateLayerResistance({
      thicknessM: layer.thicknessM,
      lambdaWmK: lambdaCorrected.value
    });

    compareMetric({
      metricKey: `${layer.layerId}.resistanceM2KPerW`,
      expected: layer.expectedResistanceRoundedM2KPerW,
      calculated: layerResistance.value,
      toleranceAbs: fixture001Envelope.tolerances.layerResistanceAbsM2KPerW
    });

    calculatedLayerResistances.push(layerResistance.value);
  }

  const totalResistance = calculateTotalResistance({
    rsi: fixture001Envelope.element.rsiM2KPerW,
    layersR: calculatedLayerResistances,
    airLayersR: [],
    rse: fixture001Envelope.element.rseM2KPerW
  });

  compareMetric({
    metricKey: "totalResistanceM2KPerW",
    expected: fixture001Envelope.expected.totalResistanceRoundedM2KPerW,
    calculated: totalResistance.value,
    toleranceAbs: fixture001Envelope.tolerances.totalResistanceAbsM2KPerW
  });

  const correctedResistanceFromReductionFactor =
    totalResistance.value * fixture001Envelope.element.thermalBridgeReductionFactor;

  compareMetric({
    metricKey: "correctedResistanceFromReductionFactorM2KPerW",
    expected: fixture001Envelope.expected.correctedResistanceRoundedM2KPerW,
    calculated: correctedResistanceFromReductionFactor,
    toleranceAbs: fixture001Envelope.tolerances.correctedResistanceAbsM2KPerW
  });

  const plainU = calculateUValue({ totalResistance: totalResistance.value });

  compareMetric({
    metricKey: "plainUValueWPerM2K",
    expected: fixture001Envelope.expected.plainUValueFromSourceRWPerM2K,
    calculated: plainU.value,
    toleranceAbs: fixture001Envelope.tolerances.uValueAbsWPerM2K
  });
});

test("validates MC001 fixture 001 corrected-U direct transmission coefficient", () => {
  const directTransmission = calculateDirectTransmissionWithCorrectedU({
    elements: [
      {
        elementId: fixture001Envelope.element.elementId,
        areaM2: fixture001Envelope.element.areaM2,
        uPrimeValue: fixture001Envelope.expected.correctedUPrimeFromSourceRPrimeWPerM2K,
        source: "MC001 Anexa B Tabel 2.4 R' = 1.02 and Anexa 1 S = 596.5 m2"
      }
    ]
  });

  compareMetric({
    metricKey: "directTransmissionFromCorrectedUWPerK",
    expected: fixture001Envelope.expected.directTransmissionFromCorrectedUWPerK,
    calculated: directTransmission.value,
    toleranceAbs: fixture001Envelope.tolerances.directTransmissionAbsWPerK
  });

  assert.equal(directTransmission.formulaId, "MC001_2_12_HD_CORRECTED_U");
  assert.equal(directTransmission.method, "correctedUPrime");
  assert.deepEqual(directTransmission.warnings, []);
});

test("keeps reviewed bridge total traceable without inventing missing bridge lengths", () => {
  const roundedRowsTotal = fixture001Envelope.sourceBridgeContributionRows.reduce(
    (sum, row) => sum + row.contributionWPerK,
    0
  );

  compareMetric({
    metricKey: "sourceBridgeContributionRowsRoundedTotalWPerK",
    expected: fixture001Envelope.expected.sourceBridgeContributionTotalWPerK,
    calculated: roundedRowsTotal,
    toleranceAbs: fixture001Envelope.tolerances.bridgeContributionAbsWPerK
  });
});
