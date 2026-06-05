import {
  EMISSION_CLASS_THRESHOLD_SETS,
  EMISSION_CLASS_THRESHOLDS_TODO
} from "../registries/emissionClassThresholds.registry.mjs";
import {
  SERVICE_ENERGY_CLASS_THRESHOLD_SETS,
  SERVICE_ENERGY_CLASS_THRESHOLDS_TODO
} from "../registries/serviceEnergyClassThresholds.registry.mjs";
import { classifyEstimatedEnergyClass } from "./estimatedEnergyClass.mjs";

const SERVICES = [
  "heating",
  "dhw",
  "cooling",
  "mechanicalVentilation",
  "lighting"
];

const SERVICE_DEFAULT_STATUS = {
  heating: "not_calculated",
  dhw: "not_calculated",
  cooling: "not_applicable",
  mechanicalVentilation: "not_applicable",
  lighting: "not_calculated"
};

function trace(input) {
  return input;
}

function isFinitePositiveOrZero(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function wrapGlobalResult(result) {
  return {
    status: result.status,
    primaryEnergyKwhM2Year: result.inputPrimaryEnergyKwhM2Year,
    estimatedClass: result.estimatedClass,
    thresholdSetUsed: result.thresholdSetUsed,
    unit: "kWh/m2.year",
    warnings: result.warnings,
    assumptions: result.assumptions,
    confidence: result.confidence,
    trace: result.trace
  };
}

function classifyEmissionClass(co2KgM2Year, thresholdSets = EMISSION_CLASS_THRESHOLD_SETS) {
  const assumptions = [
    "Clasa de emisii CO2 este separata de clasa energetica globala.",
    "Nu se inventeaza praguri CO2 daca lipseste registry-ul."
  ];

  if (thresholdSets.length === 0) {
    const warnings = ["MISSING_CO2_CLASS_THRESHOLDS", EMISSION_CLASS_THRESHOLDS_TODO.reason];
    return {
      status: "cannot_classify_missing_thresholds",
      co2KgM2Year,
      estimatedClass: "unknown",
      unit: "kgCO2/m2.year",
      warnings,
      assumptions,
      confidence: "low",
      trace: trace({
        value: "unknown",
        unit: "class",
        formulaId: "EMISSION_CLASS_FROM_CO2",
        formulaText: "emissionClass = threshold(totalCo2KgM2Year)",
        inputs: { co2KgM2Year, thresholdSetsAvailable: thresholdSets.length },
        steps: ["Nu exista praguri CO2 validate in registry."],
        assumptions,
        warnings,
        confidence: "low",
        source: "emissionClassThresholds.registry",
        sourceType: "registry_default"
      })
    };
  }

  if (!isFinitePositiveOrZero(co2KgM2Year)) {
    const warnings = ["MISSING_OR_INVALID_CO2_KG_M2_YEAR"];
    return {
      status: "cannot_classify",
      co2KgM2Year,
      estimatedClass: "unknown",
      unit: "kgCO2/m2.year",
      warnings,
      assumptions,
      confidence: "low",
      trace: trace({
        value: "unknown",
        unit: "class",
        formulaId: "EMISSION_CLASS_FROM_CO2",
        formulaText: "emissionClass = threshold(totalCo2KgM2Year)",
        inputs: { co2KgM2Year },
        steps: ["Lipseste valoarea CO2 specifica sau nu este valida."],
        assumptions,
        warnings,
        confidence: "low",
        source: "emissionClassThresholds.registry",
        sourceType: "registry_default"
      })
    };
  }

  const warnings = ["CO2_CLASS_THRESHOLDS_PRESENT_BUT_MATCHING_NOT_IMPLEMENTED"];
  return {
    status: "cannot_classify",
    co2KgM2Year,
    estimatedClass: "unknown",
    thresholdSetUsed: thresholdSets[0],
    unit: "kgCO2/m2.year",
    warnings,
    assumptions,
    confidence: "low",
    trace: trace({
      value: "unknown",
      unit: "class",
      formulaId: "EMISSION_CLASS_FROM_CO2",
      formulaText: "emissionClass = threshold(totalCo2KgM2Year)",
      inputs: { co2KgM2Year, thresholdSetId: thresholdSets[0]?.id },
      steps: ["Matching-ul CO2 va fi activat dupa introducerea pragurilor validate."],
      assumptions,
      warnings,
      confidence: "low",
      source: "emissionClassThresholds.registry",
      sourceType: "registry_default"
    })
  };
}

function serviceInputFor(input, service) {
  const explicit = input.services?.[service];
  const useful = explicit?.usefulEnergyKwhM2Year ?? input.serviceUsefulEnergyKwhM2Year?.[service];
  const final = explicit?.finalEnergyKwhM2Year ?? input.serviceFinalEnergyKwhM2Year?.[service];
  const primary = explicit?.primaryEnergyKwhM2Year ?? input.servicePrimaryEnergyKwhM2Year?.[service];
  if (!explicit && useful === undefined && final === undefined && primary === undefined) return undefined;
  return {
    usefulEnergyKwhM2Year: useful,
    finalEnergyKwhM2Year: final,
    primaryEnergyKwhM2Year: primary,
    isApplicable: explicit?.isApplicable,
    isCalculated: explicit?.isCalculated
  };
}

function classifyServiceEnergyClass(service, input, thresholdSets = SERVICE_ENERGY_CLASS_THRESHOLD_SETS) {
  const assumptions = [
    "Clasele pe utilizari sunt separate de clasa energetica globala.",
    "Nu se inventeaza praguri pe servicii daca lipseste registry-ul."
  ];
  const missingStatus = SERVICE_DEFAULT_STATUS[service];

  if (!input || input.isApplicable === false) {
    const warnings = missingStatus === "not_applicable" ? [] : [`${service.toUpperCase()}_NOT_CALCULATED`];
    return {
      service,
      status: missingStatus,
      estimatedClass: "unknown",
      unit: "kWh/m2.year",
      assumptions,
      warnings,
      confidence: "low",
      trace: trace({
        value: "unknown",
        unit: "class",
        formulaId: "SERVICE_ENERGY_CLASS_FROM_PRIMARY_ENERGY",
        formulaText: "serviceClass = threshold(servicePrimaryEnergyKwhM2Year, service)",
        inputs: { service, inputAvailable: Boolean(input) },
        steps: [missingStatus === "not_applicable" ? "Serviciul nu este aplicabil pentru locuinta curenta." : "Serviciul nu este calculat inca."],
        assumptions,
        warnings,
        confidence: "low",
        source: "serviceEnergyClassThresholds.registry",
        sourceType: "registry_default"
      })
    };
  }

  if (input.isCalculated === false || !isFinitePositiveOrZero(input.primaryEnergyKwhM2Year)) {
    const warnings = [`${service.toUpperCase()}_PRIMARY_ENERGY_NOT_CALCULATED`];
    return {
      service,
      status: "not_calculated",
      usefulEnergyKwhM2Year: input.usefulEnergyKwhM2Year,
      finalEnergyKwhM2Year: input.finalEnergyKwhM2Year,
      primaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year,
      estimatedClass: "unknown",
      unit: "kWh/m2.year",
      assumptions,
      warnings,
      confidence: "low",
      trace: trace({
        value: "unknown",
        unit: "class",
        formulaId: "SERVICE_ENERGY_CLASS_FROM_PRIMARY_ENERGY",
        formulaText: "serviceClass = threshold(servicePrimaryEnergyKwhM2Year, service)",
        inputs: { service, primaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year },
        steps: ["Lipseste energia primara specifica pentru serviciu."],
        assumptions,
        warnings,
        confidence: "low",
        source: "serviceEnergyClassThresholds.registry",
        sourceType: "registry_default"
      })
    };
  }

  const thresholdSet = thresholdSets.find(item => item.service === service);
  if (!thresholdSet || thresholdSet.thresholds.length === 0) {
    const warnings = ["MISSING_SERVICE_CLASS_THRESHOLDS", SERVICE_ENERGY_CLASS_THRESHOLDS_TODO.reason];
    return {
      service,
      status: "cannot_classify_missing_service_thresholds",
      usefulEnergyKwhM2Year: input.usefulEnergyKwhM2Year,
      finalEnergyKwhM2Year: input.finalEnergyKwhM2Year,
      primaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year,
      estimatedClass: "unknown",
      unit: "kWh/m2.year",
      assumptions,
      warnings,
      confidence: "low",
      trace: trace({
        value: "unknown",
        unit: "class",
        formulaId: "SERVICE_ENERGY_CLASS_FROM_PRIMARY_ENERGY",
        formulaText: "serviceClass = threshold(servicePrimaryEnergyKwhM2Year, service)",
        inputs: { service, primaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year, thresholdSetsAvailable: thresholdSets.length },
        steps: ["Nu exista praguri validate pentru clasificarea pe utilizari."],
        assumptions,
        warnings,
        confidence: "low",
        source: "serviceEnergyClassThresholds.registry",
        sourceType: "registry_default"
      })
    };
  }

  const warnings = ["SERVICE_CLASS_THRESHOLD_MATCHING_NOT_IMPLEMENTED"];
  return {
    service,
    status: "cannot_classify",
    usefulEnergyKwhM2Year: input.usefulEnergyKwhM2Year,
    finalEnergyKwhM2Year: input.finalEnergyKwhM2Year,
    primaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year,
    estimatedClass: "unknown",
    thresholdSetUsed: thresholdSet,
    unit: "kWh/m2.year",
    assumptions,
    warnings,
    confidence: "low",
    trace: trace({
      value: "unknown",
      unit: "class",
      formulaId: "SERVICE_ENERGY_CLASS_FROM_PRIMARY_ENERGY",
      formulaText: "serviceClass = threshold(servicePrimaryEnergyKwhM2Year, service)",
      inputs: { service, primaryEnergyKwhM2Year: input.primaryEnergyKwhM2Year, thresholdSetId: thresholdSet.id },
      steps: ["Matching-ul pe servicii va fi activat dupa introducerea pragurilor validate."],
      assumptions,
      warnings,
      confidence: "low",
      source: "serviceEnergyClassThresholds.registry",
      sourceType: "registry_default"
    })
  };
}

function classifyReferenceBuilding(input) {
  if (input.referencePrimaryEnergyKwhM2Year === null || input.referencePrimaryEnergyKwhM2Year === undefined) {
    return {
      globalPrimaryEnergyKwhM2Year: input.referencePrimaryEnergyKwhM2Year,
      estimatedClass: "unknown",
      status: "not_calculated",
      warnings: ["REFERENCE_PRIMARY_ENERGY_NOT_AVAILABLE"]
    };
  }

  const result = classifyEstimatedEnergyClass(input.referencePrimaryEnergyKwhM2Year, input.buildingEnergyClassType);
  return {
    globalPrimaryEnergyKwhM2Year: input.referencePrimaryEnergyKwhM2Year,
    estimatedClass: result.estimatedClass,
    status: result.status,
    warnings: result.warnings
  };
}

function distanceToNextBetterClass(primaryEnergyKwhM2Year, thresholdSet, estimatedClass) {
  if (!isFinitePositiveOrZero(primaryEnergyKwhM2Year) || !thresholdSet || estimatedClass === "unknown") return null;
  const currentIndex = thresholdSet.thresholds.findIndex(item => item.className === estimatedClass);
  if (currentIndex <= 0) return 0;
  const nextBetterThreshold = thresholdSet.thresholds[currentIndex - 1];
  if (nextBetterThreshold.maxInclusive === undefined) return null;
  return Number(Math.max(0, primaryEnergyKwhM2Year - nextBetterThreshold.maxInclusive).toFixed(1));
}

function compareRealToReference(input, global) {
  const real = input.totalPrimaryEnergyKwhM2Year;
  const reference = input.referencePrimaryEnergyKwhM2Year;
  const hasComparison = isFinitePositiveOrZero(real) && isFinitePositiveOrZero(reference) && reference > 0;
  return {
    realVsReferencePrimaryEnergyRatio: hasComparison ? Number((real / reference).toFixed(3)) : null,
    realVsReferencePrimaryEnergyDeltaKwhM2Year: hasComparison ? Number((real - reference).toFixed(1)) : null,
    realVsReferencePrimaryEnergyDeltaPercent: hasComparison ? Number(((real - reference) / reference * 100).toFixed(1)) : null,
    distanceToNextBetterClassKwhM2Year: distanceToNextBetterClass(real, global.thresholdSetUsed, global.estimatedClass)
  };
}

export function classifyEnergyPerformance(input) {
  const global = wrapGlobalResult(classifyEstimatedEnergyClass(input.totalPrimaryEnergyKwhM2Year, input.buildingEnergyClassType));
  const emissions = classifyEmissionClass(input.totalCo2KgM2Year);
  const services = SERVICES.reduce((map, service) => {
    map[service] = classifyServiceEnergyClass(service, serviceInputFor(input, service));
    return map;
  }, {});
  const referenceBuilding = classifyReferenceBuilding(input);
  const comparison = compareRealToReference(input, global);

  return {
    global,
    emissions,
    services,
    referenceBuilding,
    comparison
  };
}
