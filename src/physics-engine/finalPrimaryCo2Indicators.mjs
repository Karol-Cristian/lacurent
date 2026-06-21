import {
  findCO2EmissionFactorByCarrierKey,
  findPrimaryEnergyFactorByCarrierKey
} from "./datasets/mc001PrimaryEnergyAndCO2Factors.mjs";

export const STATUS_CALCULATED = "calculated";
export const STATUS_MISSING_ENERGY_FACTOR =
  "cannot_calculate_primary_or_co2_missing_energy_factor";
export const STATUS_MISSING_REFERENCE_AREA =
  "cannot_calculate_specific_indicator_missing_reference_area";

function assertFiniteNonNegativeNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
}

function assertEntriesArray(entries) {
  if (!Array.isArray(entries)) {
    throw new Error("entries must be an array");
  }
}

function assertEnergyCarrierKey(entry, index) {
  if (typeof entry.energyCarrierKey !== "string" || entry.energyCarrierKey.length === 0) {
    throw new Error(`entries[${index}].energyCarrierKey must be a non-empty string`);
  }
}

function addToBreakdown(breakdown, key, value) {
  if (typeof key !== "string" || key.length === 0) {
    return;
  }

  breakdown[key] = (breakdown[key] ?? 0) + value;
}

function normalizeFinalEnergyEntries(entries) {
  assertEntriesArray(entries);

  return entries.map((entry, index) => {
    const finalEnergyKWh = entry?.finalEnergyKWh;

    assertFiniteNonNegativeNumber(finalEnergyKWh, `entries[${index}].finalEnergyKWh`);
    assertEnergyCarrierKey(entry, index);

    return {
      finalEnergyKWh,
      energyCarrierKey: entry.energyCarrierKey,
      serviceKey: entry.serviceKey,
      source: entry.source
    };
  });
}

export function calculateFinalEnergyTotal(entries) {
  const normalizedEntries = normalizeFinalEnergyEntries(entries);
  const breakdownByCarrier = {};
  const breakdownByService = {};
  let valueKWh = 0;

  for (const entry of normalizedEntries) {
    valueKWh += entry.finalEnergyKWh;
    addToBreakdown(breakdownByCarrier, entry.energyCarrierKey, entry.finalEnergyKWh);
    addToBreakdown(breakdownByService, entry.serviceKey, entry.finalEnergyKWh);
  }

  return {
    valueKWh,
    breakdownByCarrier,
    breakdownByService,
    trace: {
      formulaId: "MC001_TOTAL_FINAL_ENERGY_ANNUAL_SUM",
      formulaStatus: "derived_aggregation_from_mc001_context",
      formulaText: "Qf,total = sum_i(Qf,i)",
      inputs: normalizedEntries,
      result: valueKWh,
      unit: "kWh",
      assumptions: ["service_breakdown_skips_missing_optional_serviceKey"],
      warnings: []
    }
  };
}

export function calculatePrimaryEnergyFromFinalEnergy(entries, options = {}) {
  const normalizedEntries = normalizeFinalEnergyEntries(entries);
  const missingFactors = [];
  const calculatedEntries = [];

  for (const entry of normalizedEntries) {
    const factor = findPrimaryEnergyFactorByCarrierKey(entry.energyCarrierKey);

    if (!factor) {
      missingFactors.push({
        energyCarrierKey: entry.energyCarrierKey,
        serviceKey: entry.serviceKey ?? null
      });
      continue;
    }

    calculatedEntries.push({
      finalEnergyKWh: entry.finalEnergyKWh,
      energyCarrierKey: entry.energyCarrierKey,
      serviceKey: entry.serviceKey,
      renewablePrimaryEnergyFactor: factor.renewablePrimaryEnergyFactor,
      nonRenewablePrimaryEnergyFactor: factor.nonRenewablePrimaryEnergyFactor,
      totalPrimaryEnergyFactor: factor.totalPrimaryEnergyFactor,
      renewablePrimaryEnergyKWh: entry.finalEnergyKWh * factor.renewablePrimaryEnergyFactor,
      nonRenewablePrimaryEnergyKWh:
        entry.finalEnergyKWh * factor.nonRenewablePrimaryEnergyFactor,
      totalPrimaryEnergyKWh: entry.finalEnergyKWh * factor.totalPrimaryEnergyFactor,
      sourceTable: factor.sourceTable,
      source: entry.source
    });
  }

  if (missingFactors.length > 0) {
    return {
      status: STATUS_MISSING_ENERGY_FACTOR,
      renewablePrimaryEnergyKWh: null,
      nonRenewablePrimaryEnergyKWh: null,
      totalPrimaryEnergyKWh: null,
      entries: calculatedEntries,
      missingFactors,
      trace: {
        formulaId: "MC001_5_4A_PRIMARY_ENERGY_TOTAL",
        formulaText: "EP = sum_i(Qf,i * fP,i)",
        inputs: normalizedEntries,
        result: null,
        unit: "kWh",
        assumptions: [],
        warnings: [STATUS_MISSING_ENERGY_FACTOR],
        options
      }
    };
  }

  const renewablePrimaryEnergyKWh = calculatedEntries.reduce(
    (sum, entry) => sum + entry.renewablePrimaryEnergyKWh,
    0
  );
  const nonRenewablePrimaryEnergyKWh = calculatedEntries.reduce(
    (sum, entry) => sum + entry.nonRenewablePrimaryEnergyKWh,
    0
  );
  const totalPrimaryEnergyKWh = calculatedEntries.reduce(
    (sum, entry) => sum + entry.totalPrimaryEnergyKWh,
    0
  );

  return {
    status: STATUS_CALCULATED,
    renewablePrimaryEnergyKWh,
    nonRenewablePrimaryEnergyKWh,
    totalPrimaryEnergyKWh,
    entries: calculatedEntries,
    missingFactors,
    trace: {
      formulaId: "MC001_5_4A_PRIMARY_ENERGY_TOTAL",
      formulaText: "EP = sum_i(Qf,i * fP,i)",
      inputs: normalizedEntries,
      result: {
        renewablePrimaryEnergyKWh,
        nonRenewablePrimaryEnergyKWh,
        totalPrimaryEnergyKWh
      },
      unit: "kWh",
      assumptions: ["primary_energy_factors_from_reviewed_mc001_tabel_5_17_dataset"],
      warnings: [],
      options
    }
  };
}

export function calculateCO2EmissionsFromFinalEnergy(entries) {
  const normalizedEntries = normalizeFinalEnergyEntries(entries);
  const missingFactors = [];
  const calculatedEntries = [];

  for (const entry of normalizedEntries) {
    const primaryEnergyFactor = findPrimaryEnergyFactorByCarrierKey(entry.energyCarrierKey);
    const co2Factor = findCO2EmissionFactorByCarrierKey(entry.energyCarrierKey);

    if (!primaryEnergyFactor || !co2Factor) {
      missingFactors.push({
        energyCarrierKey: entry.energyCarrierKey,
        serviceKey: entry.serviceKey ?? null,
        missingPrimaryEnergyFactor: !primaryEnergyFactor,
        missingCO2EmissionFactor: !co2Factor
      });
      continue;
    }

    const primaryEnergyKWh =
      entry.finalEnergyKWh * primaryEnergyFactor.totalPrimaryEnergyFactor;

    calculatedEntries.push({
      finalEnergyKWh: entry.finalEnergyKWh,
      energyCarrierKey: entry.energyCarrierKey,
      serviceKey: entry.serviceKey,
      totalPrimaryEnergyFactor: primaryEnergyFactor.totalPrimaryEnergyFactor,
      primaryEnergyKWh,
      co2EmissionFactor: co2Factor.co2EmissionFactor,
      co2Kg: primaryEnergyKWh * co2Factor.co2EmissionFactor,
      primaryEnergySourceTable: primaryEnergyFactor.sourceTable,
      co2SourceTable: co2Factor.sourceTable,
      source: entry.source
    });
  }

  if (missingFactors.length > 0) {
    return {
      status: STATUS_MISSING_ENERGY_FACTOR,
      totalCO2Kg: null,
      entries: calculatedEntries,
      missingFactors,
      trace: {
        formulaId: "MC001_5_4B_CO2_EMISSIONS",
        formulaText: "ECO2 = sum_i((Qf,i * fPtot,i) * fCO2,i)",
        inputs: normalizedEntries,
        result: null,
        unit: "kgCO2",
        assumptions: [],
        warnings: [STATUS_MISSING_ENERGY_FACTOR]
      }
    };
  }

  const totalCO2Kg = calculatedEntries.reduce((sum, entry) => sum + entry.co2Kg, 0);

  return {
    status: STATUS_CALCULATED,
    totalCO2Kg,
    entries: calculatedEntries,
    missingFactors,
    trace: {
      formulaId: "MC001_5_4B_CO2_EMISSIONS",
      formulaText: "ECO2 = sum_i((Qf,i * fPtot,i) * fCO2,i)",
      inputs: normalizedEntries,
      result: totalCO2Kg,
      unit: "kgCO2",
      assumptions: [
        "co2_uses_primary_energy_terms_per_mc001_relation_5_4b",
        "co2_factors_from_reviewed_mc001_tabel_5_18_dataset"
      ],
      warnings: []
    }
  };
}

export function calculateSpecificIndicator(value, referenceAreaM2, options = {}) {
  const { unitNumerator = "value" } = options;

  assertFiniteNonNegativeNumber(value, "value");

  if (
    typeof referenceAreaM2 !== "number" ||
    !Number.isFinite(referenceAreaM2) ||
    referenceAreaM2 <= 0
  ) {
    return {
      status: STATUS_MISSING_REFERENCE_AREA,
      valuePerM2: null,
      unit: `${unitNumerator}/m2`,
      trace: {
        formulaId: "MC001_SPECIFIC_INDICATOR_PER_AREA",
        formulaText: "specificIndicator = value / referenceAreaM2",
        inputs: { value, referenceAreaM2, unitNumerator },
        result: null,
        unit: `${unitNumerator}/m2`,
        assumptions: [],
        warnings: [STATUS_MISSING_REFERENCE_AREA]
      }
    };
  }

  const valuePerM2 = value / referenceAreaM2;

  return {
    status: STATUS_CALCULATED,
    valuePerM2,
    unit: `${unitNumerator}/m2`,
    trace: {
      formulaId: "MC001_SPECIFIC_INDICATOR_PER_AREA",
      formulaText: "specificIndicator = value / referenceAreaM2",
      inputs: { value, referenceAreaM2, unitNumerator },
      result: valuePerM2,
      unit: `${unitNumerator}/m2`,
      assumptions: [],
      warnings: []
    }
  };
}

export function calculatePrimaryCO2Summary(entries, referenceAreaM2) {
  const finalEnergy = calculateFinalEnergyTotal(entries);
  const primaryEnergy = calculatePrimaryEnergyFromFinalEnergy(entries);
  const co2Emissions = calculateCO2EmissionsFromFinalEnergy(entries);

  const specificPrimaryEnergy =
    primaryEnergy.status === STATUS_CALCULATED
      ? calculateSpecificIndicator(primaryEnergy.totalPrimaryEnergyKWh, referenceAreaM2, {
          unitNumerator: "kWh"
        })
      : null;
  const specificCO2 =
    co2Emissions.status === STATUS_CALCULATED
      ? calculateSpecificIndicator(co2Emissions.totalCO2Kg, referenceAreaM2, {
          unitNumerator: "kgCO2"
        })
      : null;

  return {
    status:
      primaryEnergy.status === STATUS_CALCULATED && co2Emissions.status === STATUS_CALCULATED
        ? STATUS_CALCULATED
        : "partial",
    finalEnergy,
    primaryEnergy,
    co2Emissions,
    specificPrimaryEnergy,
    specificCO2,
    trace: {
      formulaId: "PRIMARY_CO2_SUMMARY_NO_CPE_NO_CLASS",
      formulaText: "summary = final energy + primary energy + CO2 + specific indicators",
      inputs: { entries, referenceAreaM2 },
      result: {
        finalEnergyKWh: finalEnergy.valueKWh,
        primaryEnergyStatus: primaryEnergy.status,
        co2Status: co2Emissions.status
      },
      unit: "mixed",
      assumptions: ["summary_does_not_calculate_cpe_energy_class_or_certificate"],
      warnings: [
        primaryEnergy.status,
        co2Emissions.status,
        specificPrimaryEnergy?.status,
        specificCO2?.status
      ].filter((status) => status && status !== STATUS_CALCULATED)
    }
  };
}
