export const STATUS_ADJUSTED_THRESHOLD = "adjusted_threshold";
export const STATUS_UNCHANGED_THRESHOLD = "unchanged_threshold";

export const MC001_UTILITY_KEYS = Object.freeze([
  "heating",
  "dhw",
  "cooling",
  "mechanical_ventilation",
  "lighting"
]);

const SOURCE_TABLE = "MC001-2022 Tabel 5.6";
const SOURCE_PAGE = 395;
const NOTE_4_SOURCE = "MC001-2022 page 396 Nota 4";

const UTILITY_LABELS_RO = Object.freeze({
  heating: "Incalzire",
  dhw: "ACC",
  cooling: "Racire",
  mechanical_ventilation: "Ventilare mecanica",
  lighting: "Iluminat"
});

const DELTA_SYMBOLS = Object.freeze({
  heating: "delta_1",
  dhw: "delta_2",
  cooling: "delta_3",
  mechanical_ventilation: "delta_4",
  lighting: "delta_5"
});

const CATEGORY_ALIASES = Object.freeze({
  residential: "residential",
  residential_individual: "residential",
  residential_collective: "residential",
  apartment_in_house: "residential",
  apartment_in_block: "residential",
  office: "office",
  offices: "office",
  commerce: "commerce",
  commercial_service: "commerce",
  education: "education",
  school: "education",
  healthcare: "healthcare",
  hospital: "healthcare",
  tourism: "tourism",
  hotel_restaurant: "tourism",
  sports: "sports",
  other_occupied: "other_occupied",
  other_energy_consuming_occupied: "other_occupied"
});

function freezeEntries(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze(entry)));
}

function utilityRule(utilityKey, mandatory) {
  const calculationVariableValue = mandatory ? "1" : "0/1";

  return {
    utilityKey,
    utilityRo: UTILITY_LABELS_RO[utilityKey],
    mandatory,
    optional: !mandatory,
    calculationVariable: DELTA_SYMBOLS[utilityKey],
    calculationVariableValue,
    sourceTable: SOURCE_TABLE,
    sourcePage: SOURCE_PAGE
  };
}

function categoryRule({
  buildingCategoryKey,
  buildingCategoryRo,
  categoryNumbers,
  aliases,
  utilityMandatoryMap,
  notes = []
}) {
  return Object.freeze({
    buildingCategoryKey,
    buildingCategoryRo,
    categoryNumbers: Object.freeze([...categoryNumbers]),
    aliases: Object.freeze([...aliases]),
    sourceTable: SOURCE_TABLE,
    sourcePage: SOURCE_PAGE,
    utilities: freezeEntries(
      MC001_UTILITY_KEYS.map((utilityKey) =>
        utilityRule(utilityKey, utilityMandatoryMap[utilityKey])
      )
    ),
    notes: Object.freeze([...notes])
  });
}

const RESIDENTIAL_UTILITY_MAP = Object.freeze({
  heating: true,
  dhw: true,
  cooling: false,
  mechanical_ventilation: false,
  lighting: true
});

const NON_RESIDENTIAL_UTILITY_MAP = Object.freeze({
  heating: true,
  dhw: true,
  cooling: false,
  mechanical_ventilation: true,
  lighting: true
});

export const utilityInclusionRules = Object.freeze([
  categoryRule({
    buildingCategoryKey: "residential",
    buildingCategoryRo: "cladire de locuit (unifamiliala sau bloc de locuinte)",
    categoryNumbers: ["1"],
    aliases: [
      "residential",
      "residential_individual",
      "residential_collective",
      "apartment_in_house",
      "apartment_in_block"
    ],
    utilityMandatoryMap: RESIDENTIAL_UTILITY_MAP,
    notes: [
      "Cooling and mechanical ventilation are optional in Tabel 5.6 for residential buildings.",
      "When no dedicated mechanical ventilation exists, no electric ventilation consumption is calculated; heating/cooling ventilation-air need remains a separate future calculation."
    ]
  }),
  categoryRule({
    buildingCategoryKey: "office",
    buildingCategoryRo: "cladire de birouri",
    categoryNumbers: ["2"],
    aliases: ["office", "offices"],
    utilityMandatoryMap: NON_RESIDENTIAL_UTILITY_MAP
  }),
  categoryRule({
    buildingCategoryKey: "commerce",
    buildingCategoryRo: "cladire pentru servicii de comert",
    categoryNumbers: ["3"],
    aliases: ["commerce", "commercial_service"],
    utilityMandatoryMap: NON_RESIDENTIAL_UTILITY_MAP
  }),
  categoryRule({
    buildingCategoryKey: "education",
    buildingCategoryRo: "cladire de invatamant",
    categoryNumbers: ["4"],
    aliases: ["education", "school"],
    utilityMandatoryMap: NON_RESIDENTIAL_UTILITY_MAP
  }),
  categoryRule({
    buildingCategoryKey: "healthcare",
    buildingCategoryRo: "cladire pentru sanatate",
    categoryNumbers: ["5"],
    aliases: ["healthcare", "hospital"],
    utilityMandatoryMap: NON_RESIDENTIAL_UTILITY_MAP
  }),
  categoryRule({
    buildingCategoryKey: "tourism",
    buildingCategoryRo: "cladire pentru turism",
    categoryNumbers: ["6"],
    aliases: ["tourism", "hotel_restaurant"],
    utilityMandatoryMap: NON_RESIDENTIAL_UTILITY_MAP
  }),
  categoryRule({
    buildingCategoryKey: "sports",
    buildingCategoryRo: "cladire destinata activitatilor sportive",
    categoryNumbers: ["7"],
    aliases: ["sports"],
    utilityMandatoryMap: NON_RESIDENTIAL_UTILITY_MAP
  }),
  categoryRule({
    buildingCategoryKey: "other_occupied",
    buildingCategoryRo: "alte tipuri de cladiri consumatoare de energie, cu ocupare umana",
    categoryNumbers: ["8"],
    aliases: ["other_occupied", "other_energy_consuming_occupied"],
    utilityMandatoryMap: NON_RESIDENTIAL_UTILITY_MAP,
    notes: [
      "Category 8 still requires explicit similarity/category mapping before class-table selection."
    ]
  })
]);

function normalizeBuildingCategoryKey(buildingCategoryKey) {
  if (typeof buildingCategoryKey !== "string" || buildingCategoryKey.length === 0) {
    return null;
  }

  return CATEGORY_ALIASES[buildingCategoryKey] ?? buildingCategoryKey;
}

function assertFiniteNonNegativeNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
}

function normalizeMissingUtilityPrimaryThresholds(missingUtilityPrimaryThresholds) {
  assertArray(missingUtilityPrimaryThresholds, "missingUtilityPrimaryThresholds");

  return missingUtilityPrimaryThresholds.map((entry, index) => {
    if (typeof entry === "number") {
      assertFiniteNonNegativeNumber(entry, `missingUtilityPrimaryThresholds[${index}]`);
      return Object.freeze({
        utilityKey: null,
        primaryThreshold: entry,
        co2Factor: null
      });
    }

    const primaryThreshold =
      entry?.primaryThreshold ?? entry?.primaryThresholdKWhPerM2 ?? entry?.value;

    assertFiniteNonNegativeNumber(
      primaryThreshold,
      `missingUtilityPrimaryThresholds[${index}].primaryThreshold`
    );

    const co2Factor = entry?.co2Factor ?? null;

    if (co2Factor !== null) {
      assertFiniteNonNegativeNumber(
        co2Factor,
        `missingUtilityPrimaryThresholds[${index}].co2Factor`
      );
    }

    return Object.freeze({
      utilityKey: entry?.utilityKey ?? null,
      primaryThreshold,
      co2Factor
    });
  });
}

function sumPrimaryThresholds(missingUtilities) {
  return missingUtilities.reduce((sum, entry) => sum + entry.primaryThreshold, 0);
}

function assertAdjustedThresholdNotNegative(adjustedThreshold) {
  if (adjustedThreshold < 0) {
    throw new Error("adjustedThreshold must be non-negative");
  }
}

function roundTo(value, precision) {
  if (precision === null || precision === undefined) {
    return value;
  }

  if (!Number.isInteger(precision) || precision < 0) {
    throw new Error("precision must be a non-negative integer");
  }

  return Number(value.toFixed(precision));
}

export function listUtilityInclusionRules() {
  return utilityInclusionRules;
}

export function getUtilityInclusionRules(input = {}) {
  const buildingCategoryKey =
    typeof input === "string" ? input : input?.buildingCategoryKey;

  if (buildingCategoryKey === undefined || buildingCategoryKey === null) {
    return utilityInclusionRules;
  }

  const normalizedKey = normalizeBuildingCategoryKey(buildingCategoryKey);

  return (
    utilityInclusionRules.find(
      (rule) =>
        rule.buildingCategoryKey === normalizedKey ||
        rule.aliases.includes(buildingCategoryKey)
    ) ?? null
  );
}

export function findUtilityInclusionRule(input = {}) {
  const categoryRules = getUtilityInclusionRules(input);
  const utilityKey = input?.utilityKey;

  if (!categoryRules || typeof utilityKey !== "string" || utilityKey.length === 0) {
    return null;
  }

  return categoryRules.utilities.find((rule) => rule.utilityKey === utilityKey) ?? null;
}

export function calculateAdjustedEnergyClassThreshold(input = {}) {
  const { baseTotalThreshold, missingUtilityPrimaryThresholds = [] } = input;

  assertFiniteNonNegativeNumber(baseTotalThreshold, "baseTotalThreshold");

  const missingUtilities = normalizeMissingUtilityPrimaryThresholds(
    missingUtilityPrimaryThresholds
  );
  const missingPrimaryThresholdTotal = sumPrimaryThresholds(missingUtilities);
  const adjustedThreshold = baseTotalThreshold - missingPrimaryThresholdTotal;

  assertAdjustedThresholdNotNegative(adjustedThreshold);

  const status =
    missingUtilities.length > 0 ? STATUS_ADJUSTED_THRESHOLD : STATUS_UNCHANGED_THRESHOLD;

  return {
    status,
    adjustedThreshold,
    baseTotalThreshold,
    missingPrimaryThresholdTotal,
    missingUtilities,
    unit: "kWh/(m2.an)",
    trace: {
      formulaId: "MC001_5_3_NOTE_4_TOTAL_PRIMARY_THRESHOLD_RECALCULATION",
      formulaText:
        "new_total_threshold = table_total_threshold - sum(missing_utility_primary_thresholds)",
      source: NOTE_4_SOURCE,
      inputs: {
        baseTotalThreshold,
        missingUtilities
      },
      result: adjustedThreshold,
      unit: "kWh/(m2.an)",
      assumptions: [
        "explicit_missing_non_mandatory_utility_thresholds_only",
        "threshold_recalculation_only_no_class_assignment",
        "no_certificate_or_cpe_workflow"
      ],
      warnings: []
    }
  };
}

export function calculateAdjustedCO2ClassThreshold(input = {}) {
  const {
    baseCO2Threshold,
    missingUtilityPrimaryThresholds = [],
    co2Factor,
    precision = 2
  } = input;

  assertFiniteNonNegativeNumber(baseCO2Threshold, "baseCO2Threshold");

  const missingUtilities = normalizeMissingUtilityPrimaryThresholds(
    missingUtilityPrimaryThresholds
  ).map((entry, index) => {
    const entryCO2Factor = entry.co2Factor ?? co2Factor;

    assertFiniteNonNegativeNumber(
      entryCO2Factor,
      `missingUtilityPrimaryThresholds[${index}].co2Factor`
    );

    return Object.freeze({
      ...entry,
      co2Factor: entryCO2Factor,
      co2Contribution: entry.primaryThreshold * entryCO2Factor
    });
  });

  const missingCO2Contribution = missingUtilities.reduce(
    (sum, entry) => sum + entry.co2Contribution,
    0
  );
  const rawAdjustedThreshold = baseCO2Threshold - missingCO2Contribution;

  assertAdjustedThresholdNotNegative(rawAdjustedThreshold);

  const adjustedThreshold = roundTo(rawAdjustedThreshold, precision);
  const status =
    missingUtilities.length > 0 ? STATUS_ADJUSTED_THRESHOLD : STATUS_UNCHANGED_THRESHOLD;

  return {
    status,
    adjustedThreshold,
    rawAdjustedThreshold,
    baseCO2Threshold,
    missingCO2Contribution,
    missingUtilities,
    unit: "kgCO2/(m2.an)",
    trace: {
      formulaId: "MC001_5_3_NOTE_4_CO2_THRESHOLD_RECALCULATION",
      formulaText:
        "new_CO2_threshold = table_CO2_threshold - sum(missing_utility_primary_threshold * CO2_factor)",
      source: NOTE_4_SOURCE,
      inputs: {
        baseCO2Threshold,
        missingUtilities,
        precision
      },
      result: adjustedThreshold,
      rawResult: rawAdjustedThreshold,
      unit: "kgCO2/(m2.an)",
      assumptions: [
        "explicit_missing_non_mandatory_utility_thresholds_only",
        "threshold_recalculation_only_no_class_assignment",
        "no_certificate_or_cpe_workflow"
      ],
      warnings: []
    }
  };
}
