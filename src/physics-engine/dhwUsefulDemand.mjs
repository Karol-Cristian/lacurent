import { findDhwDemandEntryById } from "./datasets/mc001DhwDemandTable3_3_1.mjs";

export const STATUS_CALCULATED = "calculated";
export const STATUS_MISSING_DHW_TABLE_ENTRY =
  "cannot_calculate_dhw_useful_demand_missing_table_3_3_1_entry";

export const MC001_DHW_DEFAULT_COLD_WATER_TEMPERATURE_C = 10;
export const MC001_DHW_RECOMMENDED_NETWORK_TEMPERATURE_C = 60;
export const MC001_DHW_RECOMMENDED_DRAW_OFF_TEMPERATURE_C = 45;
export const MC001_DHW_MINIMUM_DRAW_OFF_TEMPERATURE_C = 42;
export const MC001_DHW_WATER_DENSITY_KG_PER_M3 = 1000;
export const MC001_DHW_RESIDENTIAL_REFERENCE_COLD_WATER_TEMPERATURE_C = 13.5;
export const MC001_DHW_RESIDENTIAL_COEFFICIENTS = Object.freeze({
  x: 40.71,
  y: 3.26
});
export const MC001_DHW_RESIDENTIAL_DWELLING_TYPES = Object.freeze({
  SINGLE_FAMILY_OR_TERRACED: "single_family_or_terraced",
  APARTMENT: "apartment"
});

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function assertFiniteNonNegativeNumber(value, name) {
  assertFiniteNumber(value, name);
  if (value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
}

function assertFinitePositiveNumber(value, name) {
  assertFiniteNumber(value, name);
  if (value <= 0) {
    throw new Error(`${name} must be a finite positive number`);
  }
}

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertResidentialDwellingType(value) {
  assertNonEmptyString(value, "dwellingType");

  if (!Object.values(MC001_DHW_RESIDENTIAL_DWELLING_TYPES).includes(value)) {
    throw new Error(
      `dwellingType must be one of ${Object.values(
        MC001_DHW_RESIDENTIAL_DWELLING_TYPES
      ).join(", ")}`
    );
  }
}

function makeResult({
  value,
  valueKey,
  unit,
  formulaId,
  formulaText,
  inputs,
  assumptions = [],
  warnings = [],
  extra = {}
}) {
  const executionTrace = {
    schema: "mc001_execution_trace_v1",
    chapter: "3",
    formulaId,
    branchId: "direct_normative_relation",
    inputs: Object.fromEntries(
      Object.entries(inputs ?? {}).map(([key, inputValue]) => [
        key,
        {
          value:
            typeof inputValue === "number" && Number.isFinite(inputValue)
              ? inputValue
              : inputValue,
          unit: null
        }
      ])
    ),
    formulaText,
    rawResult: value,
    finalResult: value,
    unit,
    clampApplied: false,
    status: "direct_result",
    provenance: {
      source: "MC001-2022 Chapter 3 DHW useful-demand chain",
      assumptions,
      warnings
    }
  };
  return {
    status: STATUS_CALCULATED,
    value,
    [valueKey]: value,
    unit,
    formulaId,
    inputs,
    warnings,
    ...extra,
    executionTrace,
    trace: {
      formulaId,
      formulaText,
      inputValues: inputs,
      result: value,
      unit,
      assumptions,
      warnings
    }
  };
}

function assertHotterThanCold(hot, cold, hotName, coldName) {
  assertFiniteNumber(hot, hotName);
  assertFiniteNumber(cold, coldName);

  if (hot <= cold) {
    throw new Error(`${hotName} must be greater than ${coldName}`);
  }
}

export function calculateDhwUsefulEnergyDemand(input) {
  const {
    volumeLiters,
    specificHeatKWhPerKgK,
    waterDensityKgPerM3,
    thetaWDrawC,
    thetaWColdC
  } = input ?? {};

  assertFiniteNonNegativeNumber(volumeLiters, "volumeLiters");
  assertFinitePositiveNumber(specificHeatKWhPerKgK, "specificHeatKWhPerKgK");
  assertFinitePositiveNumber(waterDensityKgPerM3, "waterDensityKgPerM3");
  assertHotterThanCold(thetaWDrawC, thetaWColdC, "thetaWDrawC", "thetaWColdC");

  const valueKWh =
    (volumeLiters *
      specificHeatKWhPerKgK *
      waterDensityKgPerM3 *
      (thetaWDrawC - thetaWColdC)) /
    1000;
  const inputs = {
    volumeLiters,
    specificHeatKWhPerKgK,
    waterDensityKgPerM3,
    thetaWDrawC,
    thetaWColdC
  };

  return makeResult({
    value: valueKWh,
    valueKey: "valueKWh",
    unit: "kWh/timestep",
    formulaId: "MC001_3_188_DHW_USEFUL_ENERGY",
    formulaText:
      "QW,nd = Vt * cW * rhoW * (thetaW,draw - thetaW,c) / 1000",
    inputs,
    assumptions: [
      "volume_input_is_liters_per_mc001_3_188",
      "specific_heat_input_is_explicit_no_default_cw_invented",
      "water_density_input_is_explicit"
    ]
  });
}

export function calculateDhwUsefulEnergyFromVolume(input) {
  return calculateDhwUsefulEnergyDemand(input);
}

export function calculateDhwDailyVolumeResidential(input) {
  const { specificDailyDemandLPerPersonDay, equivalentConsumers } = input ?? {};

  assertFiniteNonNegativeNumber(
    specificDailyDemandLPerPersonDay,
    "specificDailyDemandLPerPersonDay"
  );
  assertFiniteNonNegativeNumber(equivalentConsumers, "equivalentConsumers");

  const valueLitersPerDay = specificDailyDemandLPerPersonDay * equivalentConsumers;
  const inputs = { specificDailyDemandLPerPersonDay, equivalentConsumers };

  return makeResult({
    value: valueLitersPerDay,
    valueKey: "valueLitersPerDay",
    unit: "l/day",
    formulaId: "MC001_3_189_DHW_DAILY_VOLUME_RESIDENTIAL",
    formulaText: "VW,day = VW,P,day * nP",
    inputs,
    assumptions: ["equivalent_consumers_supplied_or_calculated_from_mc001_3_192_to_3_195"]
  });
}

export function calculateResidentialDailyDhwVolume(input) {
  const { specificDailyDemandLPerPersonDay, equivalentConsumers } = input ?? {};

  return calculateDhwDailyVolumeResidential({
    specificDailyDemandLPerPersonDay,
    equivalentConsumers
  });
}

export function calculateDhwDailyVolumeNonResidential(input) {
  const { specificDailyDemandLPerUnitDay, unitCount } = input ?? {};

  assertFiniteNonNegativeNumber(
    specificDailyDemandLPerUnitDay,
    "specificDailyDemandLPerUnitDay"
  );
  assertFiniteNonNegativeNumber(unitCount, "unitCount");

  const valueLitersPerDay = specificDailyDemandLPerUnitDay * unitCount;
  const inputs = { specificDailyDemandLPerUnitDay, unitCount };

  return makeResult({
    value: valueLitersPerDay,
    valueKey: "valueLitersPerDay",
    unit: "l/day",
    formulaId: "MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL",
    formulaText: "VW,day = VW,f,day * f",
    inputs,
    assumptions: ["service_unit_count_supplied_explicitly"]
  });
}

export function calculateTertiaryDailyDhwVolume(input) {
  const {
    specificDailyDemandLPerUnitDay,
    tableSpecificDemandLPerUnitDay,
    serviceUnits,
    unitCount
  } = input ?? {};

  return calculateDhwDailyVolumeNonResidential({
    specificDailyDemandLPerUnitDay:
      tableSpecificDemandLPerUnitDay ?? specificDailyDemandLPerUnitDay,
    unitCount: serviceUnits ?? unitCount
  });
}

export function calculateDhwSpecificDemandTemperatureCorrection(input) {
  const {
    normativeSpecificDemandLPerUnitDay,
    thetaWReferenceC,
    thetaWColdReferenceC,
    thetaWDrawC,
    thetaWColdC
  } = input ?? {};

  assertFiniteNonNegativeNumber(
    normativeSpecificDemandLPerUnitDay,
    "normativeSpecificDemandLPerUnitDay"
  );
  assertHotterThanCold(
    thetaWReferenceC,
    thetaWColdReferenceC,
    "thetaWReferenceC",
    "thetaWColdReferenceC"
  );
  assertHotterThanCold(thetaWDrawC, thetaWColdC, "thetaWDrawC", "thetaWColdC");

  const valueLitersPerUnitDay =
    (normativeSpecificDemandLPerUnitDay *
      (thetaWReferenceC - thetaWColdReferenceC)) /
    (thetaWDrawC - thetaWColdC);
  const inputs = {
    normativeSpecificDemandLPerUnitDay,
    thetaWReferenceC,
    thetaWColdReferenceC,
    thetaWDrawC,
    thetaWColdC
  };

  return makeResult({
    value: valueLitersPerUnitDay,
    valueKey: "valueLitersPerUnitDay",
    unit: "l/(unit day)",
    formulaId: "MC001_3_191_DHW_VOLUME_TEMPERATURE_CORRECTION",
    formulaText:
      "VW,f,day = VW,f,day,norme * (thetaW - thetaW,c) / (thetaW,draw - thetaW,c)",
    inputs,
    assumptions: [
      "reference_temperatures_supplied_explicitly",
      "target_temperatures_supplied_explicitly"
    ]
  });
}

export function correctDhwSpecificVolumeForTemperature(input) {
  const {
    normativeSpecificDemandLPerUnitDay,
    normativeSpecificVolumeLPerUnitDay,
    thetaRefHotC,
    thetaRefColdC,
    thetaDrawC,
    thetaColdC
  } = input ?? {};

  return calculateDhwSpecificDemandTemperatureCorrection({
    normativeSpecificDemandLPerUnitDay:
      normativeSpecificVolumeLPerUnitDay ?? normativeSpecificDemandLPerUnitDay,
    thetaWReferenceC: thetaRefHotC,
    thetaWColdReferenceC: thetaRefColdC,
    thetaWDrawC: thetaDrawC,
    thetaWColdC: thetaColdC
  });
}

export function calculateDhwVolumeWithLossWaste(input) {
  const { baseDailyVolumeLiters, penaltyFactor1, penaltyFactor2 } = input ?? {};

  assertFiniteNonNegativeNumber(baseDailyVolumeLiters, "baseDailyVolumeLiters");
  assertFinitePositiveNumber(penaltyFactor1, "penaltyFactor1");
  assertFinitePositiveNumber(penaltyFactor2, "penaltyFactor2");

  const totalDailyVolumeLiters =
    baseDailyVolumeLiters * penaltyFactor1 * penaltyFactor2;
  const lossWasteDailyVolumeLiters =
    totalDailyVolumeLiters - baseDailyVolumeLiters;
  const inputs = { baseDailyVolumeLiters, penaltyFactor1, penaltyFactor2 };

  return makeResult({
    value: totalDailyVolumeLiters,
    valueKey: "totalDailyVolumeLiters",
    unit: "l/day",
    formulaId: "MC001_3_197_DHW_LOSS_WASTE_VOLUME",
    formulaText: "VW,day + VW,ls,day = f1 * f2 * VW,day",
    inputs,
    assumptions: ["penalty_factors_supplied_explicitly_from_mc001_3_197"],
    extra: {
      baseDailyVolumeLiters,
      lossWasteDailyVolumeLiters,
      totalDailyVolumeLiters
    }
  });
}

export function calculateDhwEquivalentConsumersMaxSingleFamily(input) {
  const { livingAreaM2 } = input ?? {};

  assertFinitePositiveNumber(livingAreaM2, "livingAreaM2");

  let value;
  let branch;
  if (livingAreaM2 < 30) {
    value = 1;
    branch = "Ah < 30";
  } else if (livingAreaM2 < 70) {
    value = 1.75 - 0.01875 * (70 - livingAreaM2);
    branch = "30 <= Ah < 70";
  } else {
    value = 0.025 * livingAreaM2;
    branch = "Ah >= 70";
  }

  return makeResult({
    value,
    valueKey: "valueEquivalentConsumersMax",
    unit: "-",
    formulaId: "MC001_3_192_NP_EQ_MAX_SINGLE_FAMILY",
    formulaText:
      "nP,eq,max = 1 if Ah < 30; 1.75 - 0.01875 * (70 - Ah) if 30 <= Ah < 70; 0.025 * Ah if Ah >= 70",
    inputs: { livingAreaM2, branch },
    assumptions: ["living_area_supplied_explicitly"]
  });
}

function calculateDhwEquivalentConsumersFromMax({
  maxEquivalentConsumers,
  formulaId,
  formulaText
}) {
  assertFiniteNonNegativeNumber(maxEquivalentConsumers, "maxEquivalentConsumers");

  let value;
  let branch;
  if (maxEquivalentConsumers < 1.75) {
    value = maxEquivalentConsumers;
    branch = "nP,eq,max < 1.75";
  } else {
    value = 1.75 + 0.3 * (maxEquivalentConsumers - 1.75);
    branch = "nP,eq,max >= 1.75";
  }

  return makeResult({
    value,
    valueKey: "valueEquivalentConsumers",
    unit: "-",
    formulaId,
    formulaText,
    inputs: { maxEquivalentConsumers, branch },
    assumptions: ["max_equivalent_consumers_calculated_or_supplied_explicitly"]
  });
}

export function calculateDhwEquivalentConsumersSingleFamily(input) {
  const { maxEquivalentConsumers } = input ?? {};

  return calculateDhwEquivalentConsumersFromMax({
    maxEquivalentConsumers,
    formulaId: "MC001_3_193_NP_EQ_SINGLE_FAMILY",
    formulaText:
      "nP,eq = nP,eq,max if nP,eq,max < 1.75; 1.75 + 0.3 * (nP,eq,max - 1.75) if nP,eq,max >= 1.75"
  });
}

export function calculateDhwEquivalentConsumersMaxApartment(input) {
  const { livingAreaM2 } = input ?? {};

  assertFinitePositiveNumber(livingAreaM2, "livingAreaM2");

  let value;
  let branch;
  if (livingAreaM2 < 10) {
    value = 1;
    branch = "Ah < 10";
  } else if (livingAreaM2 < 50) {
    value = 1.75 - 0.01875 * (50 - livingAreaM2);
    branch = "10 <= Ah < 50";
  } else {
    value = 0.035 * livingAreaM2;
    branch = "Ah >= 50";
  }

  return makeResult({
    value,
    valueKey: "valueEquivalentConsumersMax",
    unit: "-",
    formulaId: "MC001_3_194_NP_EQ_MAX_APARTMENT",
    formulaText:
      "nP,eq,max = 1 if Ah < 10; 1.75 - 0.01875 * (50 - Ah) if 10 <= Ah < 50; 0.035 * Ah if Ah >= 50",
    inputs: { livingAreaM2, branch },
    assumptions: ["living_area_supplied_explicitly"]
  });
}

export function calculateDhwEquivalentConsumersApartment(input) {
  const { maxEquivalentConsumers } = input ?? {};

  return calculateDhwEquivalentConsumersFromMax({
    maxEquivalentConsumers,
    formulaId: "MC001_3_195_NP_EQ_APARTMENT",
    formulaText:
      "nP,eq = nP,eq,max if nP,eq,max < 1.75; 1.75 + 0.3 * (nP,eq,max - 1.75) if nP,eq,max >= 1.75"
  });
}

export function calculateResidentialEquivalentConsumers(input) {
  const { dwellingType, livingAreaM2 } = input ?? {};

  assertResidentialDwellingType(dwellingType);

  const maxResult =
    dwellingType === MC001_DHW_RESIDENTIAL_DWELLING_TYPES.APARTMENT
      ? calculateDhwEquivalentConsumersMaxApartment({ livingAreaM2 })
      : calculateDhwEquivalentConsumersMaxSingleFamily({ livingAreaM2 });
  const equivalentResult =
    dwellingType === MC001_DHW_RESIDENTIAL_DWELLING_TYPES.APARTMENT
      ? calculateDhwEquivalentConsumersApartment({
          maxEquivalentConsumers: maxResult.valueEquivalentConsumersMax
        })
      : calculateDhwEquivalentConsumersSingleFamily({
          maxEquivalentConsumers: maxResult.valueEquivalentConsumersMax
        });
  const value = equivalentResult.valueEquivalentConsumers;
  const inputs = { dwellingType, livingAreaM2 };

  return makeResult({
    value,
    valueKey: "valueEquivalentConsumers",
    unit: "-",
    formulaId: "MC001_3_192_TO_3_195_RESIDENTIAL_EQUIVALENT_CONSUMERS",
    formulaText:
      "nP,eq,max from dwelling branch; nP,eq = nP,eq,max if < 1.75 else 1.75 + 0.3 * (nP,eq,max - 1.75)",
    inputs,
    assumptions: ["residential_dwelling_type_supplied_explicitly"],
    extra: {
      dwellingType,
      valueEquivalentConsumersMax: maxResult.valueEquivalentConsumersMax,
      maxResult,
      equivalentResult
    }
  });
}

export function calculateDhwResidentialSpecificDailyDemand(input) {
  const {
    livingAreaM2,
    equivalentConsumers,
    xCoefficient = MC001_DHW_RESIDENTIAL_COEFFICIENTS.x,
    yCoefficient = MC001_DHW_RESIDENTIAL_COEFFICIENTS.y
  } = input ?? {};

  assertFinitePositiveNumber(livingAreaM2, "livingAreaM2");
  assertFinitePositiveNumber(equivalentConsumers, "equivalentConsumers");
  assertFinitePositiveNumber(xCoefficient, "xCoefficient");
  assertFinitePositiveNumber(yCoefficient, "yCoefficient");

  const valueLitersPerPersonDay = Math.min(
    xCoefficient,
    (yCoefficient * livingAreaM2) / equivalentConsumers
  );
  const inputs = {
    livingAreaM2,
    equivalentConsumers,
    xCoefficient,
    yCoefficient
  };

  return makeResult({
    value: valueLitersPerPersonDay,
    valueKey: "valueLitersPerPersonDay",
    unit: "l/(person-equivalent day)",
    formulaId: "MC001_3_196_DHW_SPECIFIC_VOLUME_RESIDENTIAL",
    formulaText: "VW,P,day = min(x, y * Ah / nP,eq)",
    inputs,
    assumptions: ["mc001_default_x_y_coefficients_used_unless_explicitly_overridden"]
  });
}

export function calculateResidentialSpecificDhwVolume(input) {
  const { livingAreaM2, equivalentConsumers, xCoefficient, yCoefficient } =
    input ?? {};

  return calculateDhwResidentialSpecificDailyDemand({
    livingAreaM2,
    equivalentConsumers,
    xCoefficient,
    yCoefficient
  });
}

export function calculateDhwDailyVolumeFromTable3_3_1(input) {
  const { tableEntryId, unitCount } = input ?? {};

  assertNonEmptyString(tableEntryId, "tableEntryId");
  assertFiniteNonNegativeNumber(unitCount, "unitCount");

  const tableEntry = findDhwDemandEntryById(tableEntryId);
  const inputs = { tableEntryId, unitCount };

  if (!tableEntry) {
    return {
      status: STATUS_MISSING_DHW_TABLE_ENTRY,
      value: null,
      valueLitersPerDay: null,
      unit: "l/day",
      formulaId: "MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL",
      inputs,
      warnings: [STATUS_MISSING_DHW_TABLE_ENTRY],
      missingTableEntryId: tableEntryId,
      trace: {
        formulaId: "MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL",
        formulaText: "VW,day = VW,f,day * f",
        inputValues: inputs,
        result: null,
        unit: "l/day",
        assumptions: ["tabel_3_3_1_lookup_required_for_specific_demand"],
        warnings: [STATUS_MISSING_DHW_TABLE_ENTRY]
      }
    };
  }

  const result = calculateDhwDailyVolumeNonResidential({
    specificDailyDemandLPerUnitDay: tableEntry.specificDhwDemandLPerUnitDayAt60C,
    unitCount
  });

  return {
    ...result,
    sourceTable: tableEntry.sourceTable,
    tableEntry,
    trace: {
      ...result.trace,
      inputValues: {
        ...inputs,
        specificDailyDemandLPerUnitDay:
          tableEntry.specificDhwDemandLPerUnitDayAt60C,
        sourceTable: tableEntry.sourceTable,
        sourcePdfPages: tableEntry.sourcePdfPages,
        sourceRowNumber: tableEntry.sourceRowNumber
      },
      assumptions: [
        ...result.trace.assumptions,
        "specific_demand_from_reviewed_mc001_tabel_3_3_1_dataset",
        "table_values_are_at_60_deg_c_and_need_temperature_correction_when_target_temperatures_differ"
      ]
    }
  };
}
