import assert from "node:assert/strict";

import {
  calculateAnnualOverheatingIndicator2_80,
  calculateAverageCorrectedElementProperties2_16,
  calculateAverageCorrectedEnvelopeProperties2_17,
  calculateCoolingHeatTransferCoefficient2_79,
  calculateCoolingOperativeTemperature2_78,
  calculateDiffuseGlazingSolarTransmittance2_41,
  calculateHeatFlow2_19,
  calculateMonthlyMovableShadingTransmittance2_43,
  calculateMonthlyOverheatingIndicator2_81,
  calculateMonthlyWindowShutterUValue2_42,
  calculateObstacleShadingFactor2_47,
  calculateSeasonBoundaryOutdoorTemperature2_87,
  calculateSurfaceTemperatureFactor2_4,
  calculateThermalCouplingCoefficient2_18,
  calculateUnconditionedZoneSolarGains2_49,
  calculateUnconditionedZoneSolarReduction2_48,
  resolveObstacleShadingFactor2_47FromTable
} from "../mc001Chapter2SupplementaryRelations.mjs";
import { validateMc001ExecutionTrace } from "../mc001ExecutionTrace.mjs";

const EPSILON = 1e-9;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function close(actual, expected, tolerance = EPSILON) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} expected to equal ${expected} within ${tolerance}`
  );
}

function assertReady(result) {
  assert.equal(result.status, "ready");
  if (result.executionTrace) {
    assert.equal(validateMc001ExecutionTrace(result.executionTrace).ok, true);
  }
}

function assertBlocked(result, code) {
  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.blockers[0].severity, "blocking");
  assert.equal(result.diagnostics.blockers[0].code, code);
}

test("relations 2.16 and 2.17 calculate corrected area-weighted envelope properties", () => {
  const surfaces = [
    { surfaceId: "wall-a", areaM2: 10, uValueWm2K: 0.3 },
    { surfaceId: "wall-b", areaM2: 20, uValueWm2K: 0.2 }
  ];
  const elementAverage = calculateAverageCorrectedElementProperties2_16({ surfaces });
  const envelopeAverage = calculateAverageCorrectedEnvelopeProperties2_17({ surfaces });

  assertReady(elementAverage);
  assertReady(envelopeAverage);
  close(elementAverage.totalAreaM2, 30);
  close(elementAverage.sumUA, 7);
  close(elementAverage.averageUValueWm2K, 7 / 30);
  close(elementAverage.averageCorrectedResistanceM2KPerW, 30 / 7);
  close(envelopeAverage.averageUValueWm2K, 7 / 30);
  assert.equal(validateMc001ExecutionTrace(elementAverage.resistanceExecutionTrace).ok, true);

  assertBlocked(
    calculateAverageCorrectedElementProperties2_16({ surfaces: [] }),
    "MC001_RELATION_2_16_AVERAGE_CORRECTED_ELEMENT_PROPERTIES_missing_surfaces"
  );
  assertBlocked(
    calculateAverageCorrectedEnvelopeProperties2_17({
      surfaces: [{ areaM2: 0, uValueWm2K: 0.3 }]
    }),
    "mc001_2_16_2_17_invalid_surface_area"
  );
});

test("relation 2.4 calculates fRsi from temperature or resistance inputs", () => {
  const temperaturePath = calculateSurfaceTemperatureFactor2_4({
    surfaceTemperatureC: 15,
    exteriorTemperatureC: -5,
    interiorTemperatureC: 20
  });
  assertReady(temperaturePath);
  close(temperaturePath.result.amount, (15 - (-5)) / (20 - (-5)));
  assert.equal(temperaturePath.branchId, "temperature_ratio_definition");

  const resistancePath = calculateSurfaceTemperatureFactor2_4({
    totalResistanceM2KPerW: 3.2,
    internalSurfaceResistanceM2KPerW: 0.13
  });
  assertReady(resistancePath);
  close(resistancePath.result.amount, (3.2 - 0.13) / 3.2);
  assert.equal(resistancePath.branchId, "resistance_ratio_definition");

  assertBlocked(
    calculateSurfaceTemperatureFactor2_4({
      surfaceTemperatureC: 15,
      exteriorTemperatureC: -5,
      interiorTemperatureC: 20,
      totalResistanceM2KPerW: 3.2,
      internalSurfaceResistanceM2KPerW: 0.13
    }),
    "mc001_2_4_ambiguous_temperature_and_resistance_paths"
  );
  assertBlocked(
    calculateSurfaceTemperatureFactor2_4({
      surfaceTemperatureC: 15,
      exteriorTemperatureC: 20,
      interiorTemperatureC: 20
    }),
    "mc001_2_4_zero_temperature_difference"
  );
});

test("relations 2.18 and 2.19 calculate coupling coefficient and signed heat flow", () => {
  const coupling = calculateThermalCouplingCoefficient2_18({
    areaM2: 15,
    uValueWm2K: 0.28
  });
  assertReady(coupling);
  close(coupling.result.amount, 4.2);

  const heatFlow = calculateHeatFlow2_19({
    couplingCoefficientWK: coupling.result.amount,
    temperatureDifferenceK: 20
  });
  assertReady(heatFlow);
  close(heatFlow.result.amount, 84);

  const reverseHeatFlow = calculateHeatFlow2_19({
    couplingCoefficientWK: coupling.result.amount,
    temperatureDifferenceK: -5
  });
  assertReady(reverseHeatFlow);
  close(reverseHeatFlow.result.amount, -21);

  assertBlocked(
    calculateThermalCouplingCoefficient2_18({ areaM2: 0, uValueWm2K: 0.28 }),
    "mc001_2_18_invalid_area"
  );
  assertBlocked(
    calculateHeatFlow2_19({ couplingCoefficientWK: -1, temperatureDifferenceK: 20 }),
    "mc001_2_19_invalid_coupling_coefficient"
  );
});

test("relations 2.41, 2.42 and 2.43 calculate source-backed glazing and shutter monthly values", () => {
  const diffuse = calculateDiffuseGlazingSolarTransmittance2_41({
    altitudeSolarTransmittance: 0.8,
    diffuseSolarTransmittance: 0.5
  });
  assertReady(diffuse);
  close(diffuse.result.amount, 0.75 * 0.8 + 0.25 * 0.5);
  assert.deepEqual(diffuse.defaultedInputs, ["agl_recommended_0_75"]);

  const shutterU = calculateMonthlyWindowShutterUValue2_42({
    windowUValueWm2K: 1.4,
    shutterAssemblyUValueWm2K: 0.8,
    shutterUseFraction: 0.25
  });
  assertReady(shutterU);
  close(shutterU.result.amount, 0.75 * 1.4 + 0.25 * 0.8);

  const movableShading = calculateMonthlyMovableShadingTransmittance2_43({
    unshadedTransmittance: 0.62,
    shadedTransmittance: 0.2,
    shadingUseFraction: 0.4
  });
  assertReady(movableShading);
  close(movableShading.result.amount, 0.6 * 0.62 + 0.4 * 0.2);

  assertBlocked(
    calculateDiffuseGlazingSolarTransmittance2_41({
      altitudeSolarTransmittance: 1.2,
      diffuseSolarTransmittance: 0.5
    }),
    "mc001_2_41_invalid_altitude_transmittance"
  );
  assertBlocked(
    calculateMonthlyWindowShutterUValue2_42({
      windowUValueWm2K: 1.4,
      shutterAssemblyUValueWm2K: 0.8,
      shutterUseFraction: 1.5
    }),
    "mc001_2_42_invalid_shutter_use_fraction"
  );
  assertBlocked(
    calculateMonthlyMovableShadingTransmittance2_43({
      unshadedTransmittance: 0.62,
      shadedTransmittance: -0.1,
      shadingUseFraction: 0.4
    }),
    "mc001_2_43_invalid_shaded_transmittance"
  );
});

test("relation 2.47 calculates obstacle shading from explicit factor and table-backed fsol,dir", () => {
  const explicit = calculateObstacleShadingFactor2_47({
    directShadingFactor: 0.6,
    directSolarFraction: 0.5
  });
  assertReady(explicit);
  close(explicit.result.amount, 0.3);

  const fromTable = resolveObstacleShadingFactor2_47FromTable({
    month: "january",
    orientation: "E",
    directShadingFactor: 0.6
  });
  assertReady(fromTable);
  close(fromTable.result.amount, 0.3);
  assert.equal(fromTable.sourceTable, "MC001-2022 Tabel 2.17");

  assertBlocked(
    resolveObstacleShadingFactor2_47FromTable({
      month: "january",
      orientation: "UP",
      directShadingFactor: 0.6
    }),
    "obstacle_shading_table_unknown_orientation"
  );
});

test("relations 2.48 and 2.49 calculate unconditioned-zone solar reduction and opaque gains", () => {
  const reduction = calculateUnconditionedZoneSolarReduction2_48({
    glazingSolarTransmittance: 0.6,
    frameFraction: 0.25
  });
  assertReady(reduction);
  close(reduction.result.amount, 0.45);

  const gains = calculateUnconditionedZoneSolarGains2_49({
    solarReductionFactor: reduction.result.amount,
    obstacleShadingFactor: 0.8,
    opaqueSurfaces: [
      { surfaceId: "ztu-wall", solarAbsorptance: 0.6, areaM2: 20, hsolKwhPerM2: 50 },
      { surfaceId: "ztu-floor", solarAbsorptance: 0.4, areaM2: 10, hsolKwhPerM2: 40 }
    ]
  });
  assertReady(gains);
  close(gains.sourceSumKwh, 760);
  close(gains.result.amount, 273.6);

  assertBlocked(
    calculateUnconditionedZoneSolarReduction2_48({
      glazingSolarTransmittance: 0.6,
      frameFraction: 1
    }),
    "mc001_2_48_invalid_frame_fraction"
  );
  assertBlocked(
    calculateUnconditionedZoneSolarGains2_49({
      solarReductionFactor: 0.45,
      obstacleShadingFactor: 0.8,
      opaqueSurfaces: []
    }),
    "mc001_2_49_missing_opaque_surfaces"
  );
});

test("relations 2.78 and 2.79 calculate cooling heat-transfer metadata without changing QCnd", () => {
  const hCht = calculateCoolingHeatTransferCoefficient2_79({
    qChtKwh: 130.171,
    indoorCoolingSetpointC: 26,
    outdoorTemperatureC: 24,
    durationHours: 744
  });
  assertReady(hCht);
  close(hCht.result.amount, 130.171 / (2 * 0.001 * 744));

  const thetaOp = calculateCoolingOperativeTemperature2_78({
    outdoorTemperatureC: 24,
    qCndKwh: 10,
    qCgnKwh: 20,
    coolingHeatTransferCoefficientWK: 100,
    durationHours: 720
  });
  assertReady(thetaOp);
  close(thetaOp.result.amount, 24 + 30 / (100 * 0.001 * 720));

  assertBlocked(
    calculateCoolingHeatTransferCoefficient2_79({
      qChtKwh: 130.171,
      indoorCoolingSetpointC: 24,
      outdoorTemperatureC: 26,
      durationHours: 744
    }),
    "mc001_2_79_non_positive_cooling_temperature_difference"
  );
});

test("relations 2.80 and 2.81 calculate overheating indicators from explicit OH inputs", () => {
  const monthly = calculateMonthlyOverheatingIndicator2_81({
    qOhGainsKwh: 500,
    qOhHeatTransferKwh: 320,
    hOhTransmissionWK: 120,
    hOhVentilationWK: 30
  });
  assertReady(monthly);
  close(monthly.result.amount, 1000 * (500 - 320) / 150);

  const zero = calculateMonthlyOverheatingIndicator2_81({
    qOhGainsKwh: 320,
    qOhHeatTransferKwh: 320,
    hOhTransmissionWK: 120,
    hOhVentilationWK: 30
  });
  assertReady(zero);
  close(zero.result.amount, 0);

  const annual = calculateAnnualOverheatingIndicator2_80({
    monthlyOverheatingIndicatorsKh: [monthly.result.amount, zero.result.amount, 15]
  });
  assertReady(annual);
  close(annual.result.amount, monthly.result.amount + 15);

  assertBlocked(
    calculateMonthlyOverheatingIndicator2_81({
      qOhGainsKwh: 500,
      qOhHeatTransferKwh: 320,
      hOhTransmissionWK: 0,
      hOhVentilationWK: 0
    }),
    "mc001_2_81_zero_overheating_transfer_coefficient"
  );
});

test("relation 2.87 calculates only the explicit season-boundary threshold equation", () => {
  const boundary = calculateSeasonBoundaryOutdoorTemperature2_87({
    indoorTemperatureC: 26,
    dailySourceEnergyKwh: 12,
    totalHeatTransferKWPerK: 0.5,
    utilizationFactorAtGammaOne: 0.8
  });
  assertReady(boundary);
  close(boundary.result.amount, 26 - (0.8 * 12) / (0.5 * 24));
  assert.match(boundary.boundedScope, /graphic annual/);

  const zeroSource = calculateSeasonBoundaryOutdoorTemperature2_87({
    indoorTemperatureC: 26,
    dailySourceEnergyKwh: 0,
    totalHeatTransferKWPerK: 0.5,
    utilizationFactorAtGammaOne: 0.8
  });
  assertReady(zeroSource);
  close(zeroSource.result.amount, 26);

  assertBlocked(
    calculateSeasonBoundaryOutdoorTemperature2_87({
      indoorTemperatureC: 26,
      dailySourceEnergyKwh: 12,
      totalHeatTransferKWPerK: 0,
      utilizationFactorAtGammaOne: 0.8
    }),
    "mc001_2_87_invalid_total_heat_transfer"
  );
});
