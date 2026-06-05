import type { CalculationTrace } from "../model/CalculationTrace";

export type InternalFinalEnergyCarrier =
  | "electricity"
  | "natural_gas"
  | "wood"
  | "pellets"
  | "district_heating"
  | "coal"
  | "lpg";

export interface Mc001CarrierMappingResult {
  finalEnergyCarrier: InternalFinalEnergyCarrier | string | null;
  primaryEnergyCarrier: string | null;
  co2Carrier: string | null;
  warnings: string[];
  assumptions: string[];
  confidence: "low" | "medium" | "high";
  trace: CalculationTrace<Record<string, string> | string | null>;
}

export const FINAL_TO_MC001_CARRIER_MAP: Record<InternalFinalEnergyCarrier, { primaryEnergyCarrier: string; co2Carrier: string }> = {
  electricity: { primaryEnergyCarrier: "grid_electricity", co2Carrier: "grid_electricity" },
  natural_gas: { primaryEnergyCarrier: "natural_gas", co2Carrier: "natural_gas" },
  wood: { primaryEnergyCarrier: "firewood", co2Carrier: "firewood" },
  pellets: { primaryEnergyCarrier: "pellets_briquettes", co2Carrier: "pellets_briquettes" },
  district_heating: { primaryEnergyCarrier: "district_heating_cogeneration", co2Carrier: "district_heating_cogeneration" },
  coal: { primaryEnergyCarrier: "coal_hard", co2Carrier: "coal_hard" },
  lpg: { primaryEnergyCarrier: "lpg", co2Carrier: "lpg" }
};

function buildTrace(
  value: Record<string, string> | string | null,
  inputs: Record<string, unknown>,
  steps: string[],
  warnings: string[],
  confidence: "low" | "medium" | "high" = "medium"
): CalculationTrace<Record<string, string> | string | null> {
  return {
    value,
    unit: "carrier",
    formulaId: "RESOLVE_MC001_CARRIER",
    formulaText: "mc001Carrier = carrierMapping(finalEnergyCarrier)",
    inputs,
    steps,
    assumptions: [
      "Carrier mapping converts internal final-energy carrier keys to MC001-like registry carrier keys.",
      "No numeric fallback is created when a carrier is missing."
    ],
    warnings,
    confidence,
    source: "carrier_mapping_registry",
    sourceType: "registry_default"
  };
}

export function normalizeFinalEnergyCarrier(rawCarrier: unknown): string {
  const value = String(rawCarrier || "").trim().toLowerCase();
  if (!value) return "";
  if (["electric", "electricitate", "curent", "grid_electricity"].includes(value)) return "electricity";
  if (["gas", "gaz", "gaz_natural", "natural gas"].includes(value)) return "natural_gas";
  if (["lemn", "lemne", "firewood", "biomass", "biomasa"].includes(value)) return "wood";
  if (["peleti", "pellet", "pellets_briquettes"].includes(value)) return "pellets";
  if (["termoficare", "district", "district_heating_cogeneration"].includes(value)) return "district_heating";
  if (["carbune", "huila", "coal_hard"].includes(value)) return "coal";
  if (["glp"].includes(value)) return "lpg";
  return value;
}

export function resolveMc001Carrier(rawCarrier: unknown): Mc001CarrierMappingResult {
  const finalEnergyCarrier = normalizeFinalEnergyCarrier(rawCarrier);
  if (!finalEnergyCarrier) {
    const warnings = ["MISSING_FINAL_ENERGY_CARRIER"];
    return {
      finalEnergyCarrier: null,
      primaryEnergyCarrier: null,
      co2Carrier: null,
      warnings,
      assumptions: ["Carrier lipsa; factorii primary/CO2 nu se calculeaza cu fallback inventat."],
      confidence: "low",
      trace: buildTrace(null, { rawCarrier }, ["No final energy carrier was provided."], warnings, "low")
    };
  }
  const mapping = FINAL_TO_MC001_CARRIER_MAP[finalEnergyCarrier as InternalFinalEnergyCarrier];
  if (!mapping) {
    const warnings = ["UNMAPPED_FINAL_ENERGY_CARRIER"];
    return {
      finalEnergyCarrier,
      primaryEnergyCarrier: null,
      co2Carrier: null,
      warnings,
      assumptions: [`Carrier ${finalEnergyCarrier} nu exista in mapping-ul MC001-like.`],
      confidence: "low",
      trace: buildTrace(null, { rawCarrier, finalEnergyCarrier }, [`No mapping for ${finalEnergyCarrier}.`], warnings, "low")
    };
  }
  return {
    finalEnergyCarrier,
    primaryEnergyCarrier: mapping.primaryEnergyCarrier,
    co2Carrier: mapping.co2Carrier,
    warnings: [],
    assumptions: [`Carrier ${finalEnergyCarrier} mapat catre registries MC001-like.`],
    confidence: "medium",
    trace: buildTrace(mapping, { rawCarrier, finalEnergyCarrier }, [
      `${finalEnergyCarrier} -> primary=${mapping.primaryEnergyCarrier}, co2=${mapping.co2Carrier}.`
    ], [])
  };
}
