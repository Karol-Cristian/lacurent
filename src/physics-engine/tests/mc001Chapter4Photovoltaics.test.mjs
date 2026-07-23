import assert from "node:assert/strict";
import {
  MC001_CHAPTER4_PV_FCAP_TABLE_4_5_BETA45_AZIMUTH0,
  MC001_CHAPTER4_PV_RUNTIME_VERSION,
  calculateMc001Chapter4PhotovoltaicMonthlyProduction,
  calculateMc001PvCollectorEfficiency,
  calculateMc001PvMonthlyCaptureEfficiency,
  calculateMc001PvMonthlyElectricEnergy,
  calculateMc001PvMonthlyIncidentEnergy,
  calculateMc001PvTotalCollectorArea
} from "../mc001Chapter4Photovoltaics.mjs";

const EPSILON = 1e-9;

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function close(actual, expected, tolerance = EPSILON) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
}

const bucharestHorizontalIrradiance = Object.freeze([
  49.6,
  85,
  124.8,
  167.2,
  205.6,
  233.5,
  200.8,
  233.2,
  175.5,
  114.2,
  54.2,
  41.3
]);

const fixedExpectedIncidentKWh = Object.freeze([
  327.33904896,
  417.43296,
  584.96256,
  637.072128,
  724.69361664,
  745.645824,
  677.6566272,
  900.67735296,
  776.962368,
  620.9227584,
  318.6231552,
  258.62469696
]);

const fixedExpectedElectricKWh = Object.freeze([
  42.865048461312,
  54.662846111999997,
  72.345244608,
  74.15519569920001,
  84.35433697689599,
  86.79317391359997,
  78.87923140608001,
  104.838843884544,
  90.4384196352,
  76.79262214511999,
  41.72370217344001,
  33.86690406691199
]);

function pvInput(overrides = {}) {
  return {
    systemId: "pv-reference",
    panelCount: 3,
    panelAreaM2: 1.68,
    maximumPowerWAt1000: 252,
    inverterEfficiency: 0.97,
    temperatureEfficiencyMode: "annex_a2_monocrystalline",
    mounting: {
      tiltDeg: 45,
      azimuthDegFromSouth: 0,
      correctionTableId: MC001_CHAPTER4_PV_FCAP_TABLE_4_5_BETA45_AZIMUTH0.tableId
    },
    solarDataset: {
      datasetId: "mc001_1_2006_annex_a9_6_monthly_solar_irradiance",
      datasetVersion: "mc001_1_2006_annex_a9_6_solar_p5b3_v1",
      sourceReference: "Mc001/1-2-3/2006, Anexa A.9.6, PDF pages 119-129"
    },
    monthlyHorizontalIrradiance: bucharestHorizontalIrradiance.map((value, index) => ({
      month: [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december"
      ][index],
      horizontalIrradianceWPerM2: value,
      sourceReference: "Mc001/1-2-3/2006, Anexa A.9.6, PDF pages 119-129"
    })),
    ...overrides
  };
}

await test("MC001 Chapter 4.5 PV helper equations implement relations 4.160-4.165", () => {
  close(calculateMc001PvTotalCollectorArea({ panelCount: 3, panelAreaM2: 1.68 }), 5.04);
  close(
    calculateMc001PvCollectorEfficiency({
      maximumPowerWAt1000: 252,
      panelAreaM2: 1.68,
      referenceIrradianceWPerM2: 1000
    }),
    0.15
  );
  close(
    calculateMc001PvMonthlyIncidentEnergy({
      daysInMonth: 31,
      totalCollectorAreaM2: 5.04,
      horizontalIrradianceWPerM2: 49.6,
      correctionFactor: 1.76
    }),
    327.33904896
  );
  close(
    calculateMc001PvMonthlyElectricEnergy({
      daysInMonth: 31,
      totalCollectorAreaM2: 5.04,
      horizontalIrradianceWPerM2: 49.6,
      correctionFactor: 1.76,
      temperatureEfficiencyFactor: 0.9,
      inverterEfficiency: 0.97,
      collectorEfficiency: 0.15
    }),
    42.865048461312
  );
  close(
    calculateMc001PvMonthlyCaptureEfficiency({
      monthlyElectricEnergyKWh: 42.8650487136,
      monthlyIncidentEnergyKWh: 327.33904896
    }),
    0.13095
  );
});

await test("MC001 Table 4.5 correction factors are complete and month ordered", () => {
  assert.deepEqual(MC001_CHAPTER4_PV_FCAP_TABLE_4_5_BETA45_AZIMUTH0.monthlyFactors, [
    1.76,
    1.45,
    1.25,
    1.05,
    0.94,
    0.88,
    0.9,
    1.03,
    1.22,
    1.45,
    1.62,
    1.67
  ]);
  assert.equal(MC001_CHAPTER4_PV_FCAP_TABLE_4_5_BETA45_AZIMUTH0.tiltDeg, 45);
  assert.equal(MC001_CHAPTER4_PV_FCAP_TABLE_4_5_BETA45_AZIMUTH0.azimuthDegFromSouth, 0);
});

await test("PV monthly runtime uses fixed source-backed Bucharest irradiation oracle", () => {
  const result = calculateMc001Chapter4PhotovoltaicMonthlyProduction(pvInput());
  assert.equal(result.status, "calculated");
  assert.equal(result.runtimeVersion, MC001_CHAPTER4_PV_RUNTIME_VERSION);
  close(result.derived.totalCollectorAreaM2, 5.04);
  close(result.derived.collectorEfficiency, 0.15);
  assert.equal(result.monthly.length, 12);
  for (const [index, month] of result.monthly.entries()) {
    close(month.incidentEnergyKWh, fixedExpectedIncidentKWh[index]);
    close(month.electricEnergyKWh, fixedExpectedElectricKWh[index]);
    close(month.captureEfficiency, fixedExpectedElectricKWh[index] / fixedExpectedIncidentKWh[index]);
  }
  close(result.annual.incidentEnergyKWh, 6990.61309632);
  close(result.annual.electricEnergyKWh, 841.715569082304);
  assert.ok(result.formulaReferences.includes("MC001_4_163_PV_ANNUAL_ELECTRIC_ENERGY_SUM"));
});

await test("PV runtime rejects unsupported orientation instead of inventing fcap values", () => {
  const result = calculateMc001Chapter4PhotovoltaicMonthlyProduction(
    pvInput({
      mounting: {
        tiltDeg: 30,
        azimuthDegFromSouth: 0,
        correctionTableId: "unsupported"
      }
    })
  );
  assert.equal(result.status, "blocked");
  assert.ok(result.diagnostics.some(item => item.code === "chapter4_pv_unsupported_orientation_correction"));
});

await test("PV runtime rejects missing monthly irradiance and efficiency inputs", () => {
  const result = calculateMc001Chapter4PhotovoltaicMonthlyProduction(
    pvInput({
      monthlyHorizontalIrradiance: [],
      temperatureEfficiencyMode: "explicit_monthly",
      temperatureEfficiencyFactors: [0.9],
      inverterEfficiency: 1.2
    })
  );
  assert.equal(result.status, "blocked");
  assert.ok(result.diagnostics.some(item => item.code === "chapter4_pv_monthly_irradiance_requires_12_months"));
  assert.ok(result.diagnostics.some(item => item.code === "chapter4_pv_temperature_efficiency_requires_12_months"));
  assert.ok(result.diagnostics.some(item => item.code === "chapter4_pv_inverter_efficiency_required"));
});
