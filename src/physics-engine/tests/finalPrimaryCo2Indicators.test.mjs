import assert from "node:assert/strict";
import {
  calculateCO2EmissionsFromFinalEnergy,
  calculateFinalEnergyTotal,
  calculatePrimaryCO2Summary,
  calculatePrimaryEnergyFromFinalEnergy,
  calculateSpecificIndicator
} from "../finalPrimaryCo2Indicators.mjs";

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

test("final energy total sums multiple entries and preserves simple breakdowns", () => {
  const result = calculateFinalEnergyTotal([
    { finalEnergyKWh: 100, energyCarrierKey: "gaz_natural", serviceKey: "heating" },
    { finalEnergyKWh: 50, energyCarrierKey: "gaz_natural", serviceKey: "dhw" },
    {
      finalEnergyKWh: 25,
      energyCarrierKey: "electricitate_sen_consumata",
      serviceKey: "lighting"
    }
  ]);

  assert.equal(result.valueKWh, 175);
  assert.equal(result.breakdownByCarrier.gaz_natural, 150);
  assert.equal(result.breakdownByCarrier.electricitate_sen_consumata, 25);
  assert.equal(result.breakdownByService.heating, 100);
  assert.equal(result.breakdownByService.dhw, 50);
  assert.equal(result.breakdownByService.lighting, 25);
  assert.equal(result.trace.formulaStatus, "derived_aggregation_from_mc001_context");
});

test("primary energy for gaz_natural uses reviewed Tabel 5.17 factors", () => {
  const result = calculatePrimaryEnergyFromFinalEnergy([
    { finalEnergyKWh: 100, energyCarrierKey: "gaz_natural", serviceKey: "heating" }
  ]);

  assert.equal(result.status, "calculated");
  assert.equal(result.nonRenewablePrimaryEnergyKWh, 117);
  assert.equal(result.renewablePrimaryEnergyKWh, 0);
  assert.equal(result.totalPrimaryEnergyKWh, 117);
  assert.equal(result.entries[0].sourceTable, "MC001-2022 Tabel 5.17");
});

test("primary energy for electricitate_sen_consumata uses reviewed split factors", () => {
  const result = calculatePrimaryEnergyFromFinalEnergy([
    { finalEnergyKWh: 100, energyCarrierKey: "electricitate_sen_consumata" }
  ]);

  assert.equal(result.status, "calculated");
  assert.equal(result.nonRenewablePrimaryEnergyKWh, 200);
  assert.equal(result.renewablePrimaryEnergyKWh, 50);
  assert.equal(result.totalPrimaryEnergyKWh, 250);
});

test("CO2 for gaz_natural uses reviewed Tabel 5.18 factor", () => {
  const result = calculateCO2EmissionsFromFinalEnergy([
    { finalEnergyKWh: 100, energyCarrierKey: "gaz_natural" }
  ]);

  assert.equal(result.status, "calculated");
  assertCloseTo(result.totalCO2Kg, 20.2);
  assert.equal(result.entries[0].sourceTable, "MC001-2022 Tabel 5.18");
});

test("CO2 for electricitate_sen_consumata uses reviewed Tabel 5.18 factor", () => {
  const result = calculateCO2EmissionsFromFinalEnergy([
    { finalEnergyKWh: 100, energyCarrierKey: "electricitate_sen_consumata" }
  ]);

  assert.equal(result.status, "calculated");
  assertCloseTo(result.totalCO2Kg, 10.7);
});

test("missing primary factor returns missing energy factor status", () => {
  const result = calculatePrimaryEnergyFromFinalEnergy([
    { finalEnergyKWh: 100, energyCarrierKey: "antracit" }
  ]);

  assert.equal(result.status, "cannot_calculate_primary_or_co2_missing_energy_factor");
  assert.equal(result.totalPrimaryEnergyKWh, null);
  assert.deepEqual(result.missingFactors, [{ energyCarrierKey: "antracit", serviceKey: null }]);
});

test("missing CO2 factor returns missing energy factor status", () => {
  const result = calculateCO2EmissionsFromFinalEnergy([
    {
      finalEnergyKWh: 100,
      energyCarrierKey: "electricitate_pv_eolian_onsite_nearby_exportata_sen"
    }
  ]);

  assert.equal(result.status, "cannot_calculate_primary_or_co2_missing_energy_factor");
  assert.equal(result.totalCO2Kg, null);
  assert.deepEqual(result.missingFactors, [
    {
      energyCarrierKey: "electricitate_pv_eolian_onsite_nearby_exportata_sen",
      serviceKey: null
    }
  ]);
});

test("specific indicator divides value by reference area", () => {
  const result = calculateSpecificIndicator(250, 100, { unitNumerator: "kWh" });

  assert.equal(result.status, "calculated");
  assert.equal(result.valuePerM2, 2.5);
  assert.equal(result.unit, "kWh/m2");
});

test("missing or zero area returns missing reference area status", () => {
  const missingArea = calculateSpecificIndicator(250, undefined, { unitNumerator: "kWh" });
  const zeroArea = calculateSpecificIndicator(250, 0, { unitNumerator: "kgCO2" });

  assert.equal(
    missingArea.status,
    "cannot_calculate_specific_indicator_missing_reference_area"
  );
  assert.equal(zeroArea.status, "cannot_calculate_specific_indicator_missing_reference_area");
  assert.equal(missingArea.valuePerM2, null);
  assert.equal(zeroArea.valuePerM2, null);
});

test("combined summary does not calculate energy class, CPE, or certificate output", () => {
  const result = calculatePrimaryCO2Summary(
    [{ finalEnergyKWh: 100, energyCarrierKey: "gaz_natural", serviceKey: "heating" }],
    50
  );

  assert.equal(result.status, "calculated");
  assert.equal(result.primaryEnergy.totalPrimaryEnergyKWh, 117);
  assertCloseTo(result.co2Emissions.totalCO2Kg, 20.2);
  assert.equal(result.specificPrimaryEnergy.valuePerM2, 2.34);
  assertCloseTo(result.specificCO2.valuePerM2, 0.404);
  assert.equal("energyClass" in result, false);
  assert.equal("cpe" in result, false);
  assert.equal("certificate" in result, false);
  assert.ok(
    result.trace.assumptions.includes("summary_does_not_calculate_cpe_energy_class_or_certificate")
  );
});
