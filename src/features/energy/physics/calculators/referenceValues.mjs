import { referenceEnvelopeValues } from "../registries/referenceEnvelopeValues.registry.mjs";
import { primaryEnergyFactors } from "../registries/primaryEnergyFactors.registry.mjs";
import { co2EmissionFactors } from "../registries/co2Factors.registry.mjs";

function trace(value, unit, formulaId, inputs, steps, assumptions, warnings, confidence = "medium") {
  return { value, unit, formulaId, inputs, steps, assumptions, warnings, confidence };
}

export function getReferenceEnvelopeValue(profile, elementType) {
  const value = referenceEnvelopeValues.find(item => item.profile === profile && item.elementType === elementType);
  const warnings = value ? [] : ["MISSING_REFERENCE_ENVELOPE_VALUE"];
  const assumptions = value
    ? ["Valoarea de referinta provine din registry MC001-like introdus manual."]
    : ["Nu exista valoare de referinta pentru combinatia profile/elementType. Nu se inventeaza default."];
  return {
    value,
    warnings,
    assumptions,
    trace: trace(
      value?.uMaxWPerM2K ?? null,
      "W/m2K",
      "GET_REFERENCE_ENVELOPE_VALUE",
      { profile, elementType },
      [value ? `Found ${profile}/${elementType}: Umax=${value.uMaxWPerM2K}` : `Missing ${profile}/${elementType}`],
      assumptions,
      warnings,
      value ? "medium" : "low"
    )
  };
}

export function compareElementToReference(actualUCorrected, referenceValue) {
  const warnings = [];
  const assumptions = [
    "Compara U' real/corectat cu Umax de referinta.",
    "Comparatia este MC001-like si nu reprezinta certificat energetic oficial."
  ];

  if (actualUCorrected === null || actualUCorrected === undefined || !Number.isFinite(actualUCorrected)) {
    warnings.push("MISSING_ACTUAL_U_CORRECTED");
  }
  if (!referenceValue) {
    warnings.push("MISSING_REFERENCE_ENVELOPE_VALUE");
  }

  const referenceUMax = referenceValue?.uMaxWPerM2K;
  const canCompare = warnings.length === 0 && Number.isFinite(referenceUMax);
  const rawPercent = canCompare ? ((Number(actualUCorrected) - Number(referenceUMax)) / Number(referenceUMax)) * 100 : null;
  const percentAboveReference = rawPercent === null ? undefined : Math.max(0, Number(rawPercent.toFixed(1)));
  const isBetterOrEqual = canCompare ? Number(actualUCorrected) <= Number(referenceUMax) : false;

  return {
    actualUCorrected,
    referenceUMax,
    isBetterOrEqual,
    percentAboveReference,
    warnings,
    source: referenceValue?.source,
    assumptions,
    trace: trace(
      percentAboveReference ?? null,
      "%",
      "COMPARE_ELEMENT_TO_REFERENCE_U",
      { actualUCorrected, referenceUMax },
      canCompare
        ? [`max(0, (${actualUCorrected} - ${referenceUMax}) / ${referenceUMax} x 100) = ${percentAboveReference}`]
        : ["Comparatia nu poate fi calculata din cauza valorilor lipsa."],
      assumptions,
      warnings,
      canCompare ? "medium" : "low"
    )
  };
}

export function getPrimaryEnergyFactor(carrier) {
  const value = primaryEnergyFactors.find(item => item.carrier === carrier);
  const warnings = value ? [] : ["MISSING_PRIMARY_ENERGY_FACTOR"];
  const assumptions = value
    ? ["Factor de energie primara MC001-like introdus manual si marcat pentru verificare oficiala."]
    : ["Nu exista factor de energie primara pentru carrier. Nu se inventeaza default."];
  return {
    value,
    warnings,
    assumptions,
    trace: trace(value?.total ?? null, "kWh primary / kWh final", "GET_PRIMARY_ENERGY_FACTOR", { carrier }, [value ? `${carrier}: total=${value.total}` : `Missing factor for ${carrier}`], assumptions, warnings, value ? "medium" : "low")
  };
}

export function getCo2Factor(carrier) {
  const value = co2EmissionFactors.find(item => item.carrier === carrier);
  const warnings = value ? [] : ["MISSING_CO2_FACTOR"];
  const assumptions = value
    ? ["Factor CO2 MC001-like introdus manual si marcat pentru verificare oficiala."]
    : ["Nu exista factor CO2 pentru carrier. Nu se inventeaza default."];
  return {
    value,
    warnings,
    assumptions,
    trace: trace(value?.kgCO2PerKwh ?? null, "kgCO2/kWh", "GET_CO2_FACTOR", { carrier }, [value ? `${carrier}: ${value.kgCO2PerKwh} kgCO2/kWh` : `Missing factor for ${carrier}`], assumptions, warnings, value ? "medium" : "low")
  };
}
