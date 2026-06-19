import assert from "node:assert/strict";
import {
  calculateAirflowFromACH,
  calculateBve,
  calculateBveFromUnconditionedZone,
  calculateVentilationHeatTransferCoefficient,
  calculateVentilationHeatTransferCoefficientFromAirflowM3h,
  calculateMonthlyVentilationTransfer
} from "../ventilationCoefficients.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("calculates airflow from explicit ACH and heated volume", () => {
  const result = calculateAirflowFromACH({ ach: 0.7, volumeM3: 200 });

  assert.equal(result.formulaId, "PHYSICS_AIRFLOW_FROM_ACH");
  assert.equal(result.unit, "m3/h");
  assert.equal(result.value, 140);
  assert.ok(result.trace.assumptions.includes("airflow_from_explicit_ach_and_heated_volume"));
});

test("calculates bve and marks exterior supply air assumption", () => {
  const result = calculateBve({
    thetaInt: 20,
    thetaSupply: -5,
    thetaExternal: -5
  });

  assert.equal(result.formulaId, "MC001_2_31_BVE");
  assert.equal(result.unit, "-");
  assert.equal(result.value, 1);
  assert.ok(result.trace.assumptions.includes("supply_air_equals_external_air_bve_expected_1"));
});

test("calculates bve from unconditioned zone and warns when source is missing", () => {
  const result = calculateBveFromUnconditionedZone({ bztu: 0.7 });

  assert.equal(result.formulaId, "MC001_2_32_BVE_UNCONDITIONED");
  assert.equal(result.value, 0.7);
  assert.ok(result.warnings.includes("bztu_source_missing"));
});

test("calculates Hve from SI airflow and converted m3h airflow", () => {
  const result = calculateVentilationHeatTransferCoefficient({
    rhoA: 1.2,
    ca: 1000,
    flows: [
      { airflowM3s: 0.05, bve: 1, fveDyn: 1, flowId: "si" },
      { airflowM3h: 36, bve: 0.5, flowId: "hourly" }
    ]
  });

  assert.equal(result.formulaId, "MC001_2_30_HVE");
  assert.equal(result.unit, "W/K");
  assert.equal(result.value, 66);
  assert.ok(result.warnings.includes("fve_dyn_missing_defaulted_to_1"));
  assert.ok(result.trace.assumptions.includes("airflow_m3h_converted_to_m3s"));
});

test("calculates derived Hve helper from airflow m3h", () => {
  const result = calculateVentilationHeatTransferCoefficientFromAirflowM3h({
    airflowM3h: 100
  });

  assert.equal(result.formulaId, "PHYSICS_HVE_FROM_AIRFLOW_M3H_DERIVED");
  assert.equal(result.unit, "W/K");
  assert.equal(result.value, 34);
  assert.ok(result.warnings.includes("bve_missing_defaulted_to_1_for_derived_helper"));
  assert.ok(result.warnings.includes("fve_dyn_missing_defaulted_to_1"));
});

test("calculates isolated monthly ventilation transfer", () => {
  const result = calculateMonthlyVentilationTransfer({
    hve: 34,
    thetaInt: 20,
    thetaExternalMonthly: 0,
    deltaHours: 744
  });

  assert.equal(result.formulaId, "MC001_2_29_Q_VENTILATION_MONTHLY");
  assert.equal(result.unit, "kWh");
  assert.equal(result.value, 505.92);
  assert.ok(result.warnings.includes("climate_source_missing_explicit_values_used"));
});

test("validates ventilation inputs", () => {
  assert.throws(
    () => calculateAirflowFromACH({ ach: -1, volumeM3: 100 }),
    /ach must be a non-negative number/
  );
  assert.throws(
    () => calculateBve({ thetaInt: 20, thetaSupply: 15, thetaExternal: 20 }),
    /thetaInt - thetaExternal must not be zero/
  );
  assert.throws(
    () => calculateVentilationHeatTransferCoefficient({
      rhoA: 1.2,
      ca: 1000,
      flows: [{ airflowM3h: 10, airflowM3s: 0.1, bve: 1 }]
    }),
    /must provide either airflowM3h or airflowM3s, not both/
  );
  assert.throws(
    () => calculateVentilationHeatTransferCoefficientFromAirflowM3h({
      airflowM3h: 10,
      bve: 1,
      fveDyn: -1
    }),
    /fveDyn must be a non-negative number/
  );
  assert.throws(
    () => calculateMonthlyVentilationTransfer({
      hve: 1,
      thetaInt: 20,
      thetaExternalMonthly: 0,
      deltaHours: 0
    }),
    /deltaHours must be a positive number/
  );
});
