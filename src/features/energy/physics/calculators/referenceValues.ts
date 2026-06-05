import type { CalculationTrace } from "../model/CalculationTrace";
import type { ReferenceEnvelopeElementType, ReferenceEnvelopeProfile, ReferenceEnvelopeValue } from "../registries/referenceEnvelopeValues.registry";
import { referenceEnvelopeValues } from "../registries/referenceEnvelopeValues.registry";
import type { PrimaryEnergyCarrier, PrimaryEnergyFactor } from "../registries/primaryEnergyFactors.registry";
import { primaryEnergyFactors } from "../registries/primaryEnergyFactors.registry";
import type { Co2Carrier, Co2EmissionFactor } from "../registries/co2Factors.registry";
import { co2EmissionFactors } from "../registries/co2Factors.registry";

function trace<T>(
  value: T,
  unit: string,
  formulaId: string,
  inputs: Record<string, unknown>,
  steps: string[],
  assumptions: string[],
  warnings: string[],
  confidence: "low" | "medium" | "high" = "medium",
  extra: { formulaText?: string; source?: string; sourceType?: CalculationTrace["sourceType"] } = {}
): CalculationTrace<T> {
  return { value, unit, formulaId, formulaText: extra.formulaText, inputs, steps, assumptions, warnings, confidence, source: extra.source, sourceType: extra.sourceType };
}

export function getReferenceEnvelopeValue(
  profile: ReferenceEnvelopeProfile,
  elementType: ReferenceEnvelopeElementType
): {
  value?: ReferenceEnvelopeValue;
  warnings: string[];
  assumptions: string[];
  trace: CalculationTrace<number | null>;
} {
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
      value ? "medium" : "low",
      {
        formulaText: "referenceUmax = lookup(profile, elementType)",
        source: value?.source || "referenceEnvelopeValues.registry",
        sourceType: value ? "mc001" : "registry_default"
      }
    )
  };
}

export function compareElementToReference(
  actualUCorrected: number | null | undefined,
  referenceValue?: Pick<ReferenceEnvelopeValue, "uMaxWPerM2K" | "source" | "sourceTable" | "requiresOfficialVerification"> | null
): {
  actualUCorrected: number | null | undefined;
  referenceUMax?: number;
  isBetterOrEqual: boolean;
  percentAboveReference?: number;
  warnings: string[];
  source?: string;
  assumptions: string[];
  trace: CalculationTrace<number | null>;
} {
  const warnings: string[] = [];
  const assumptions = [
    "Compara U' real/corectat cu Umax de referinta.",
    "Comparația este MC001-like si nu reprezinta certificat energetic oficial."
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
        : ["Comparația nu poate fi calculata din cauza valorilor lipsa."],
      assumptions,
      warnings,
      canCompare ? "medium" : "low",
      {
        formulaText: "percentAboveReference = max(0, (actualUCorrected - referenceUMax) / referenceUMax x 100)",
        source: referenceValue?.source,
        sourceType: referenceValue?.source ? "mc001" : "registry_default"
      }
    )
  };
}

export function getPrimaryEnergyFactor(carrier: PrimaryEnergyCarrier): {
  value?: PrimaryEnergyFactor;
  warnings: string[];
  assumptions: string[];
  trace: CalculationTrace<number | null>;
} {
  const value = primaryEnergyFactors.find(item => item.carrier === carrier);
  const warnings = value ? [] : ["MISSING_PRIMARY_ENERGY_FACTOR"];
  const assumptions = value
    ? ["Factor de energie primara MC001-like introdus manual si marcat pentru verificare oficiala."]
    : ["Nu exista factor de energie primara pentru carrier. Nu se inventeaza default."];
  return {
    value,
    warnings,
    assumptions,
    trace: trace(
      value?.total ?? null,
      "kWh primary / kWh final",
      "GET_PRIMARY_ENERGY_FACTOR",
      { carrier, factor: value || null },
      [value ? `${carrier}: total=${value.total}` : `Missing factor for ${carrier}`],
      assumptions,
      warnings,
      value ? "medium" : "low",
      {
        formulaText: "primaryEnergy = finalEnergy x primaryEnergyFactor",
        source: value?.source || "primaryEnergyFactors.registry",
        sourceType: value ? "mc001" : "registry_default"
      }
    )
  };
}

export function getCo2Factor(carrier: Co2Carrier): {
  value?: Co2EmissionFactor;
  warnings: string[];
  assumptions: string[];
  trace: CalculationTrace<number | null>;
} {
  const value = co2EmissionFactors.find(item => item.carrier === carrier);
  const warnings = value ? [] : ["MISSING_CO2_FACTOR"];
  const assumptions = value
    ? ["Factor CO2 MC001-like introdus manual si marcat pentru verificare oficiala."]
    : ["Nu exista factor CO2 pentru carrier. Nu se inventeaza default."];
  return {
    value,
    warnings,
    assumptions,
    trace: trace(
      value?.kgCO2PerKwh ?? null,
      "kgCO2/kWh",
      "GET_CO2_FACTOR",
      { carrier, factor: value || null },
      [value ? `${carrier}: ${value.kgCO2PerKwh} kgCO2/kWh` : `Missing factor for ${carrier}`],
      assumptions,
      warnings,
      value ? "medium" : "low",
      {
        formulaText: "co2 = finalEnergy x co2Factor",
        source: value?.source || "co2Factors.registry",
        sourceType: value ? "mc001" : "registry_default"
      }
    )
  };
}
