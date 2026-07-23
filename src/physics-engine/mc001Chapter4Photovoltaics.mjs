export const MC001_CHAPTER4_PV_RUNTIME_VERSION =
  "mc001_chapter_4_5_photovoltaic_monthly_p7_v1";

export const MC001_CHAPTER4_PV_CORRECTION_TABLE_4_5_ID =
  "mc001_2022_table_4_5_beta45_azimuth0";

export const MC001_CHAPTER4_PV_TEMPERATURE_EFFICIENCY_ANNEX_A2_ID =
  "mc001_2022_annex_a2_monocrystalline_eta_t";

export const MONTH_IDS = Object.freeze([
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
]);

export const MONTH_DAYS_NON_LEAP = Object.freeze([
  31,
  28,
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31
]);

export const MC001_CHAPTER4_PV_FCAP_TABLE_4_5_BETA45_AZIMUTH0 = Object.freeze({
  tableId: MC001_CHAPTER4_PV_CORRECTION_TABLE_4_5_ID,
  sourceReference: "MC001-2022, Tabel 4.5, pp. 355-356",
  tiltDeg: 45,
  azimuthDegFromSouth: 0,
  monthlyFactors: Object.freeze([
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
  ])
});

export const MC001_CHAPTER4_PV_ANNEX_A2_MONOCRYSTALLINE_ETA_T = Object.freeze({
  tableId: MC001_CHAPTER4_PV_TEMPERATURE_EFFICIENCY_ANNEX_A2_ID,
  sourceReference: "MC001-2022, Anexa A2 informativa, p. 358",
  moduleTechnology: "monocrystalline",
  monthlyFactors: Object.freeze([
    0.9,
    0.9,
    0.85,
    0.8,
    0.8,
    0.8,
    0.8,
    0.8,
    0.8,
    0.85,
    0.9,
    0.9
  ])
});

const FORMULA_REFERENCES = Object.freeze([
  "MC001_4_160_PV_TOTAL_COLLECTOR_AREA",
  "MC001_4_161_PV_COLLECTOR_EFFICIENCY",
  "MC001_4_162_PV_MONTHLY_ELECTRIC_ENERGY",
  "MC001_4_163_PV_ANNUAL_ELECTRIC_ENERGY_SUM",
  "MC001_4_164_PV_MONTHLY_INCIDENT_ENERGY",
  "MC001_4_165_PV_MONTHLY_CAPTURE_EFFICIENCY"
]);

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function positiveNumber(value) {
  return isFiniteNumber(value) && value > 0;
}

function nonNegativeNumber(value) {
  return isFiniteNumber(value) && value >= 0;
}

function fraction(value) {
  return positiveNumber(value) && value <= 1;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function diagnostic(code, path, message) {
  return { code, path, message, severity: "blocking" };
}

function blocked(code, diagnostics) {
  return {
    status: "blocked",
    code,
    runtimeVersion: MC001_CHAPTER4_PV_RUNTIME_VERSION,
    diagnostics,
    formulaReferences: []
  };
}
function validateMonthlyRecords(records, path, diagnostics) {
  if (!Array.isArray(records) || records.length !== 12) {
    diagnostics.push(diagnostic("chapter4_pv_monthly_irradiance_requires_12_months", path));
    return [];
  }
  return MONTH_IDS.map((month, index) => {
    const record = records[index] ?? {};
    const value =
      record.horizontalIrradianceWPerM2 ??
      record.valueWPerM2 ??
      record.value ??
      record.totalIrradianceWPerM2?.horizontal;
    if (record.month !== undefined && record.month !== month) {
      diagnostics.push(diagnostic("chapter4_pv_month_sequence_mismatch", `${path}[${index}].month`));
    }
    if (!positiveNumber(value)) {
      diagnostics.push(diagnostic("chapter4_pv_invalid_horizontal_irradiance", `${path}[${index}]`));
      return { month, horizontalIrradianceWPerM2: null, source: record.source ?? null };
    }
    return {
      month,
      horizontalIrradianceWPerM2: value,
      source: record.source ?? null,
      sourceReference: record.sourceReference ?? null,
      sourcePdfPage: record.sourcePdfPage ?? null
    };
  });
}

function resolveTemperatureEfficiencyFactors(input, diagnostics) {
  if (input.temperatureEfficiencyMode === "annex_a2_monocrystalline") {
    return {
      mode: "annex_a2_monocrystalline",
      sourceReference: MC001_CHAPTER4_PV_ANNEX_A2_MONOCRYSTALLINE_ETA_T.sourceReference,
      factors: [...MC001_CHAPTER4_PV_ANNEX_A2_MONOCRYSTALLINE_ETA_T.monthlyFactors]
    };
  }
  if (Array.isArray(input.temperatureEfficiencyFactors)) {
    if (input.temperatureEfficiencyFactors.length !== 12) {
      diagnostics.push(diagnostic(
        "chapter4_pv_temperature_efficiency_requires_12_months",
        "temperatureEfficiencyFactors"
      ));
      return null;
    }
    const factors = input.temperatureEfficiencyFactors.map((value, index) => {
      if (!fraction(value)) {
        diagnostics.push(diagnostic(
          "chapter4_pv_invalid_temperature_efficiency",
          `temperatureEfficiencyFactors[${index}]`
        ));
        return null;
      }
      return value;
    });
    return {
      mode: "explicit_monthly",
      sourceReference: input.temperatureEfficiencySourceReference ?? "explicit_engineering_input",
      factors
    };
  }
  if (fraction(input.temperatureEfficiencyFactor)) {
    return {
      mode: "explicit_constant",
      sourceReference: input.temperatureEfficiencySourceReference ?? "explicit_engineering_input",
      factors: MONTH_IDS.map(() => input.temperatureEfficiencyFactor)
    };
  }
  diagnostics.push(diagnostic(
    "chapter4_pv_temperature_efficiency_required",
    "temperatureEfficiencyFactors"
  ));
  return null;
}

function resolveCorrectionFactors(input, diagnostics) {
  const tableId = input.correctionTableId ?? input.mounting?.correctionTableId;
  const tiltDeg = input.tiltDeg ?? input.mounting?.tiltDeg;
  const azimuthDegFromSouth = input.azimuthDegFromSouth ?? input.mounting?.azimuthDegFromSouth;
  const table = MC001_CHAPTER4_PV_FCAP_TABLE_4_5_BETA45_AZIMUTH0;
  if (
    tableId === table.tableId ||
    (tiltDeg === table.tiltDeg && azimuthDegFromSouth === table.azimuthDegFromSouth)
  ) {
    return {
      mode: table.tableId,
      sourceReference: table.sourceReference,
      tiltDeg: table.tiltDeg,
      azimuthDegFromSouth: table.azimuthDegFromSouth,
      factors: [...table.monthlyFactors]
    };
  }
  diagnostics.push(diagnostic(
    "chapter4_pv_unsupported_orientation_correction",
    "mounting",
    "P7 implements the source-backed MC001 Table 4.5 correction for tilt 45 deg and azimuth 0 deg only."
  ));
  return null;
}

export function calculateMc001PvTotalCollectorArea({ panelCount, panelAreaM2 } = {}) {
  return panelCount * panelAreaM2;
}

export function calculateMc001PvCollectorEfficiency({
  maximumPowerWAt1000,
  panelAreaM2,
  referenceIrradianceWPerM2 = 1000
} = {}) {
  return (maximumPowerWAt1000 / panelAreaM2) / referenceIrradianceWPerM2;
}

export function calculateMc001PvMonthlyElectricEnergy({
  daysInMonth,
  totalCollectorAreaM2,
  horizontalIrradianceWPerM2,
  correctionFactor,
  temperatureEfficiencyFactor,
  inverterEfficiency,
  collectorEfficiency
} = {}) {
  return (
    (1 / 1000) *
    24 *
    daysInMonth *
    totalCollectorAreaM2 *
    horizontalIrradianceWPerM2 *
    correctionFactor *
    temperatureEfficiencyFactor *
    inverterEfficiency *
    collectorEfficiency
  );
}

export function calculateMc001PvMonthlyIncidentEnergy({
  daysInMonth,
  totalCollectorAreaM2,
  horizontalIrradianceWPerM2,
  correctionFactor
} = {}) {
  return (
    horizontalIrradianceWPerM2 *
    correctionFactor *
    totalCollectorAreaM2 *
    24 *
    daysInMonth
  ) / 1000;
}

export function calculateMc001PvMonthlyCaptureEfficiency({
  monthlyElectricEnergyKWh,
  monthlyIncidentEnergyKWh
} = {}) {
  return monthlyIncidentEnergyKWh > 0
    ? monthlyElectricEnergyKWh / monthlyIncidentEnergyKWh
    : 0;
}

export function calculateMc001Chapter4PhotovoltaicMonthlyProduction(input = {}) {
  const diagnostics = [];
  const panelCount = input.panelCount;
  const panelAreaM2 = input.panelAreaM2;
  const maximumPowerWAt1000 = input.maximumPowerWAt1000 ?? input.maximumPowerW;
  const referenceIrradianceWPerM2 = input.referenceIrradianceWPerM2 ?? 1000;
  const inverterEfficiency = input.inverterEfficiency;

  if (!positiveNumber(panelCount)) {
    diagnostics.push(diagnostic("chapter4_pv_panel_count_required", "panelCount"));
  }
  if (!positiveNumber(panelAreaM2)) {
    diagnostics.push(diagnostic("chapter4_pv_panel_area_required", "panelAreaM2"));
  }
  if (!positiveNumber(maximumPowerWAt1000)) {
    diagnostics.push(diagnostic("chapter4_pv_peak_power_required", "maximumPowerWAt1000"));
  }
  if (!positiveNumber(referenceIrradianceWPerM2)) {
    diagnostics.push(diagnostic("chapter4_pv_reference_irradiance_invalid", "referenceIrradianceWPerM2"));
  }
  if (!fraction(inverterEfficiency)) {
    diagnostics.push(diagnostic("chapter4_pv_inverter_efficiency_required", "inverterEfficiency"));
  }

  const monthlyIrradiance = validateMonthlyRecords(
    input.monthlyHorizontalIrradiance,
    "monthlyHorizontalIrradiance",
    diagnostics
  );
  const temperatureEfficiency = resolveTemperatureEfficiencyFactors(input, diagnostics);
  const correction = resolveCorrectionFactors(input, diagnostics);

  if (diagnostics.length > 0) {
    return blocked("chapter4_pv_input_invalid", diagnostics);
  }

  const totalCollectorAreaM2 = calculateMc001PvTotalCollectorArea({ panelCount, panelAreaM2 });
  const collectorEfficiency = calculateMc001PvCollectorEfficiency({
    maximumPowerWAt1000,
    panelAreaM2,
    referenceIrradianceWPerM2
  });

  if (!positiveNumber(totalCollectorAreaM2) || !fraction(collectorEfficiency)) {
    return blocked("chapter4_pv_derived_input_invalid", [
      diagnostic("chapter4_pv_invalid_total_area_or_efficiency", "panelCount|panelAreaM2|maximumPowerWAt1000")
    ]);
  }

  const monthly = MONTH_IDS.map((month, index) => {
    const daysInMonth = MONTH_DAYS_NON_LEAP[index];
    const horizontalIrradianceWPerM2 = monthlyIrradiance[index].horizontalIrradianceWPerM2;
    const correctionFactor = correction.factors[index];
    const temperatureEfficiencyFactor = temperatureEfficiency.factors[index];
    const tiltedIrradianceWPerM2 = horizontalIrradianceWPerM2 * correctionFactor;
    const incidentEnergyKWh = calculateMc001PvMonthlyIncidentEnergy({
      daysInMonth,
      totalCollectorAreaM2,
      horizontalIrradianceWPerM2,
      correctionFactor
    });
    const electricEnergyKWh = calculateMc001PvMonthlyElectricEnergy({
      daysInMonth,
      totalCollectorAreaM2,
      horizontalIrradianceWPerM2,
      correctionFactor,
      temperatureEfficiencyFactor,
      inverterEfficiency,
      collectorEfficiency
    });
    const captureEfficiency = calculateMc001PvMonthlyCaptureEfficiency({
      monthlyElectricEnergyKWh: electricEnergyKWh,
      monthlyIncidentEnergyKWh: incidentEnergyKWh
    });
    return {
      month,
      daysInMonth,
      horizontalIrradianceWPerM2,
      correctionFactor,
      tiltedIrradianceWPerM2,
      totalCollectorAreaM2,
      collectorEfficiency,
      temperatureEfficiencyFactor,
      inverterEfficiency,
      incidentEnergyKWh,
      electricEnergyKWh,
      captureEfficiency,
      sourceReference: monthlyIrradiance[index].sourceReference ?? input.solarSourceReference ?? null,
      sourcePdfPage: monthlyIrradiance[index].sourcePdfPage ?? null,
      formulaReferences: [
        "MC001_4_162_PV_MONTHLY_ELECTRIC_ENERGY",
        "MC001_4_164_PV_MONTHLY_INCIDENT_ENERGY",
        "MC001_4_165_PV_MONTHLY_CAPTURE_EFFICIENCY"
      ]
    };
  });

  const annualElectricEnergyKWh = monthly.reduce((sum, item) => sum + item.electricEnergyKWh, 0);
  const annualIncidentEnergyKWh = monthly.reduce((sum, item) => sum + item.incidentEnergyKWh, 0);

  return {
    status: "calculated",
    runtimeVersion: MC001_CHAPTER4_PV_RUNTIME_VERSION,
    calculationScope: "mc001_chapter_4_5_photovoltaic_monthly_method",
    sourceReference: "MC001-2022, 4.5.1-4.5.2, relatiile 4.160-4.165",
    systemId: input.systemId ?? "photovoltaic-system-1",
    inputs: {
      panelCount,
      panelAreaM2,
      maximumPowerWAt1000,
      referenceIrradianceWPerM2,
      inverterEfficiency,
      correction,
      temperatureEfficiency,
      solarDataset: deepClone(input.solarDataset ?? null)
    },
    derived: {
      totalCollectorAreaM2,
      collectorEfficiency
    },
    monthly,
    annual: {
      electricEnergyKWh: annualElectricEnergyKWh,
      incidentEnergyKWh: annualIncidentEnergyKWh,
      captureEfficiency:
        annualIncidentEnergyKWh > 0 ? annualElectricEnergyKWh / annualIncidentEnergyKWh : 0
    },
    formulaReferences: [...FORMULA_REFERENCES],
    diagnostics: []
  };
}
