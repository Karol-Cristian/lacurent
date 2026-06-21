import assert from "node:assert/strict";
import {
  MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C,
  MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C,
  MC001_DHW_RECOMMENDED_NETWORK_TEMPERATURE_C,
  MC001_DHW_RESIDENTIAL_REFERENCE_COLD_WATER_TEMPERATURE_C,
  MC001_DHW_RESIDENTIAL_DWELLING_TYPES,
  MC001_DHW_WATER_DENSITY_KG_PER_M3,
  STATUS_MISSING_DHW_TABLE_ENTRY,
  calculateDhwUsefulEnergyFromVolume,
  calculateDhwDailyVolumeFromTable3_3_1,
  calculateDhwDailyVolumeNonResidential,
  calculateDhwDailyVolumeResidential,
  calculateDhwEquivalentConsumersApartment,
  calculateDhwEquivalentConsumersMaxApartment,
  calculateDhwEquivalentConsumersMaxSingleFamily,
  calculateDhwEquivalentConsumersSingleFamily,
  calculateDhwResidentialSpecificDailyDemand,
  calculateDhwSpecificDemandTemperatureCorrection,
  calculateDhwUsefulEnergyDemand,
  calculateDhwVolumeWithLossWaste,
  calculateResidentialDailyDhwVolume,
  calculateResidentialEquivalentConsumers,
  calculateResidentialSpecificDhwVolume,
  calculateTertiaryDailyDhwVolume,
  correctDhwSpecificVolumeForTemperature
} from "../dhwUsefulDemand.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function assertCloseTo(actual, expected, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} is not close to ${expected}`);
}

test("calculates useful DHW energy from explicit timestep volume", () => {
  const result = calculateDhwUsefulEnergyDemand({
    volumeLiters: 120,
    specificHeatKWhPerKgK: 0.001,
    waterDensityKgPerM3: MC001_DHW_WATER_DENSITY_KG_PER_M3,
    thetaWDrawC: MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C,
    thetaWColdC: MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C
  });

  assert.equal(result.status, "calculated");
  assert.equal(result.formulaId, "MC001_3_188_DHW_USEFUL_ENERGY");
  assert.equal(result.unit, "kWh/timestep");
  assertCloseTo(result.valueKWh, 4.2);
  assert.ok(
    result.trace.assumptions.includes("specific_heat_input_is_explicit_no_default_cw_invented")
  );
});

test("source-named helper aliases preserve the same explicit formula behavior", () => {
  const usefulEnergy = calculateDhwUsefulEnergyFromVolume({
    volumeLiters: 120,
    specificHeatKWhPerKgK: 0.001,
    waterDensityKgPerM3: MC001_DHW_WATER_DENSITY_KG_PER_M3,
    thetaWDrawC: MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C,
    thetaWColdC: MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C
  });
  const tertiaryDailyVolume = calculateTertiaryDailyDhwVolume({
    tableSpecificDemandLPerUnitDay: 5,
    serviceUnits: 12
  });

  assert.equal(usefulEnergy.formulaId, "MC001_3_188_DHW_USEFUL_ENERGY");
  assertCloseTo(usefulEnergy.valueKWh, 4.2);
  assert.equal(
    tertiaryDailyVolume.formulaId,
    "MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL"
  );
  assert.equal(tertiaryDailyVolume.valueLitersPerDay, 60);
});

test("calculates residential and non-residential daily DHW volume formulas", () => {
  const residential = calculateDhwDailyVolumeResidential({
    specificDailyDemandLPerPersonDay: 32.6,
    equivalentConsumers: 1.25
  });
  const nonResidential = calculateDhwDailyVolumeNonResidential({
    specificDailyDemandLPerUnitDay: 5,
    unitCount: 12
  });

  assert.equal(residential.formulaId, "MC001_3_189_DHW_DAILY_VOLUME_RESIDENTIAL");
  assertCloseTo(residential.valueLitersPerDay, 40.75);
  assert.equal(nonResidential.formulaId, "MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL");
  assert.equal(nonResidential.valueLitersPerDay, 60);
});

test("looks up reviewed Tabel 3.3.1 rows for non-residential daily volume", () => {
  const result = calculateDhwDailyVolumeFromTable3_3_1({
    tableEntryId: "birouri_functionar_schimb",
    unitCount: 12
  });

  assert.equal(result.status, "calculated");
  assert.equal(result.valueLitersPerDay, 60);
  assert.equal(result.sourceTable, "MC001-2022 Tabel 3.3.1");
  assert.equal(result.tableEntry.sourceRowNumber, 3);
  assert.ok(
    result.trace.assumptions.includes(
      "specific_demand_from_reviewed_mc001_tabel_3_3_1_dataset"
    )
  );
});

test("returns missing status for unknown Tabel 3.3.1 row", () => {
  const result = calculateDhwDailyVolumeFromTable3_3_1({
    tableEntryId: "missing_row",
    unitCount: 1
  });

  assert.equal(result.status, STATUS_MISSING_DHW_TABLE_ENTRY);
  assert.equal(result.valueLitersPerDay, null);
  assert.deepEqual(result.warnings, [STATUS_MISSING_DHW_TABLE_ENTRY]);
});

test("corrects specific DHW demand from source reference temperatures", () => {
  const tableBasis = calculateDhwSpecificDemandTemperatureCorrection({
    normativeSpecificDemandLPerUnitDay: 5,
    thetaWReferenceC: MC001_DHW_RECOMMENDED_NETWORK_TEMPERATURE_C,
    thetaWColdReferenceC: MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C,
    thetaWDrawC: MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C,
    thetaWColdC: MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C
  });
  const residentialBasis = calculateDhwSpecificDemandTemperatureCorrection({
    normativeSpecificDemandLPerUnitDay: 40.71,
    thetaWReferenceC: MC001_DHW_RECOMMENDED_NETWORK_TEMPERATURE_C,
    thetaWColdReferenceC: MC001_DHW_RESIDENTIAL_REFERENCE_COLD_WATER_TEMPERATURE_C,
    thetaWDrawC: MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C,
    thetaWColdC: MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C
  });

  assert.equal(tableBasis.formulaId, "MC001_3_191_DHW_VOLUME_TEMPERATURE_CORRECTION");
  assertCloseTo(tableBasis.valueLitersPerUnitDay, 5 * (50 / 35));
  assertCloseTo(residentialBasis.valueLitersPerUnitDay, 40.71 * (46.5 / 35));
});

test("calculates DHW loss and waste volume from MC001 penalty factors", () => {
  const result = calculateDhwVolumeWithLossWaste({
    baseDailyVolumeLiters: 1500,
    penaltyFactor1: 1.3,
    penaltyFactor2: 1.1
  });

  assert.equal(result.formulaId, "MC001_3_197_DHW_LOSS_WASTE_VOLUME");
  assertCloseTo(result.lossWasteDailyVolumeLiters, 645);
  assertCloseTo(result.totalDailyVolumeLiters, 2145);
});

test("calculates single-family equivalent consumers with MC001 branch boundaries", () => {
  const below30 = calculateDhwEquivalentConsumersMaxSingleFamily({ livingAreaM2: 29 });
  const at30 = calculateDhwEquivalentConsumersMaxSingleFamily({ livingAreaM2: 30 });
  const at70 = calculateDhwEquivalentConsumersMaxSingleFamily({ livingAreaM2: 70 });
  const equivalent = calculateDhwEquivalentConsumersSingleFamily({
    maxEquivalentConsumers: at70.valueEquivalentConsumersMax
  });

  assert.equal(below30.valueEquivalentConsumersMax, 1);
  assert.equal(at30.valueEquivalentConsumersMax, 1);
  assert.equal(at70.valueEquivalentConsumersMax, 1.75);
  assert.equal(equivalent.formulaId, "MC001_3_193_NP_EQ_SINGLE_FAMILY");
  assert.equal(equivalent.valueEquivalentConsumers, 1.75);
});

test("calculates apartment equivalent consumers with MC001 branch boundaries", () => {
  const below10 = calculateDhwEquivalentConsumersMaxApartment({ livingAreaM2: 9 });
  const at10 = calculateDhwEquivalentConsumersMaxApartment({ livingAreaM2: 10 });
  const at50 = calculateDhwEquivalentConsumersMaxApartment({ livingAreaM2: 50 });
  const equivalent = calculateDhwEquivalentConsumersApartment({
    maxEquivalentConsumers: 2
  });

  assert.equal(below10.valueEquivalentConsumersMax, 1);
  assert.equal(at10.valueEquivalentConsumersMax, 1);
  assertCloseTo(at50.valueEquivalentConsumersMax, 1.75);
  assert.equal(equivalent.formulaId, "MC001_3_195_NP_EQ_APARTMENT");
  assert.equal(equivalent.valueEquivalentConsumers, 1.825);
});

test("calculates residential specific daily demand from area and equivalent consumers", () => {
  const lowArea = calculateDhwResidentialSpecificDailyDemand({
    livingAreaM2: 10,
    equivalentConsumers: 1
  });
  const capped = calculateDhwResidentialSpecificDailyDemand({
    livingAreaM2: 80,
    equivalentConsumers: 1.825
  });

  assert.equal(lowArea.formulaId, "MC001_3_196_DHW_SPECIFIC_VOLUME_RESIDENTIAL");
  assertCloseTo(lowArea.valueLitersPerPersonDay, 32.6);
  assert.equal(capped.valueLitersPerPersonDay, 40.71);
});

test("reconstructs MC001 Anexa 3.3.A apartment useful-demand example from source values", () => {
  const equivalentConsumers = calculateResidentialEquivalentConsumers({
    dwellingType: MC001_DHW_RESIDENTIAL_DWELLING_TYPES.APARTMENT,
    livingAreaM2: 75
  });
  const specificNorm = calculateResidentialSpecificDhwVolume({
    livingAreaM2: 75,
    equivalentConsumers: equivalentConsumers.valueEquivalentConsumers
  });
  const correctedSpecific = correctDhwSpecificVolumeForTemperature({
    normativeSpecificVolumeLPerUnitDay: specificNorm.valueLitersPerPersonDay,
    thetaRefHotC: MC001_DHW_RECOMMENDED_NETWORK_TEMPERATURE_C,
    thetaRefColdC: MC001_DHW_RESIDENTIAL_REFERENCE_COLD_WATER_TEMPERATURE_C,
    thetaDrawC: MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C,
    thetaColdC: MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C
  });
  const exactDailyVolume = calculateResidentialDailyDhwVolume({
    specificDailyDemandLPerPersonDay: correctedSpecific.valueLitersPerUnitDay,
    equivalentConsumers: equivalentConsumers.valueEquivalentConsumers
  });
  const sourceRoundedDailyVolume = calculateResidentialDailyDhwVolume({
    specificDailyDemandLPerPersonDay: 54.08,
    equivalentConsumers: 2.02
  });
  const usefulEnergy = calculateDhwUsefulEnergyFromVolume({
    volumeLiters: 109.25,
    specificHeatKWhPerKgK: 4.186 / 3600,
    waterDensityKgPerM3: MC001_DHW_WATER_DENSITY_KG_PER_M3,
    thetaWDrawC: MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C,
    thetaWColdC: MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C
  });

  assert.equal(
    equivalentConsumers.formulaId,
    "MC001_3_192_TO_3_195_RESIDENTIAL_EQUIVALENT_CONSUMERS"
  );
  assertCloseTo(equivalentConsumers.valueEquivalentConsumersMax, 2.625);
  assertCloseTo(equivalentConsumers.valueEquivalentConsumers, 2.0125);
  assert.equal(specificNorm.valueLitersPerPersonDay, 40.71);
  assertCloseTo(correctedSpecific.valueLitersPerUnitDay, 40.71 * (46.5 / 35));
  assertCloseTo(correctedSpecific.valueLitersPerUnitDay, 54.08, 0.01);

  assertCloseTo(
    exactDailyVolume.valueLitersPerDay,
    correctedSpecific.valueLitersPerUnitDay * 2.0125
  );
  assertCloseTo(sourceRoundedDailyVolume.valueLitersPerDay, 109.25, 0.02);
  assertCloseTo(usefulEnergy.valueKWh, 4.45, 0.01);
});

test("rejects invalid useful DHW demand inputs instead of inventing fallbacks", () => {
  assert.throws(
    () =>
      calculateDhwUsefulEnergyDemand({
        volumeLiters: 1,
        specificHeatKWhPerKgK: 0.001,
        waterDensityKgPerM3: 1000,
        thetaWDrawC: 10,
        thetaWColdC: 10
      }),
    /thetaWDrawC must be greater than thetaWColdC/
  );

  assert.throws(
    () =>
      calculateDhwDailyVolumeFromTable3_3_1({
        tableEntryId: "",
        unitCount: 1
      }),
    /tableEntryId must be a non-empty string/
  );

  assert.throws(
    () =>
      calculateDhwVolumeWithLossWaste({
        baseDailyVolumeLiters: 1500,
        penaltyFactor1: 0,
        penaltyFactor2: 1.1
      }),
    /penaltyFactor1 must be a finite positive number/
  );
});
