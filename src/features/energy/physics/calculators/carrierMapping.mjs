const FINAL_TO_MC001_CARRIER_MAP = {
  electricity: { primaryEnergyCarrier: "grid_electricity", co2Carrier: "grid_electricity" },
  natural_gas: { primaryEnergyCarrier: "natural_gas", co2Carrier: "natural_gas" },
  wood: { primaryEnergyCarrier: "firewood", co2Carrier: "firewood" },
  pellets: { primaryEnergyCarrier: "pellets_briquettes", co2Carrier: "pellets_briquettes" },
  district_heating: {
    primaryEnergyCarrier: "district_heating_cogeneration",
    co2Carrier: "district_heating_cogeneration"
  },
  coal: { primaryEnergyCarrier: "coal_hard", co2Carrier: "coal_hard" },
  lpg: { primaryEnergyCarrier: "lpg", co2Carrier: "lpg" }
};

function trace(value, inputs, steps, warnings, confidence = "medium") {
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

export function normalizeFinalEnergyCarrier(rawCarrier) {
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

export function inferFinalEnergyCarrierFromHeatingInput(input = {}) {
  const raw = [
    input.finalEnergyCarrier,
    input.fuelCarrier,
    input.fuel,
    input.heatingSource,
    input.heating,
    input.systemType,
    input.generatorType
  ].filter(Boolean).join(" ");
  const value = raw.toLowerCase();
  if (!value.trim()) {
    return {
      finalEnergyCarrier: null,
      warnings: ["MISSING_HEATING_OR_FUEL_INPUT"],
      trace: trace(null, { input }, ["No heating/fuel input was provided."], ["MISSING_HEATING_OR_FUEL_INPUT"], "low")
    };
  }
  if (value.includes("gaz") || value.includes("gas")) return { finalEnergyCarrier: "natural_gas", warnings: [], trace: trace("natural_gas", { input }, ["Matched gas/natural gas input."], []) };
  if (value.includes("pelet")) return { finalEnergyCarrier: "pellets", warnings: [], trace: trace("pellets", { input }, ["Matched pellets input."], []) };
  if (value.includes("lemn") || value.includes("wood") || value.includes("biom")) return { finalEnergyCarrier: "wood", warnings: [], trace: trace("wood", { input }, ["Matched wood/biomass input."], []) };
  if (value.includes("pompa") || value.includes("pump") || value.includes("electric")) return { finalEnergyCarrier: "electricity", warnings: [], trace: trace("electricity", { input }, ["Matched electric or heat-pump input."], []) };
  if (value.includes("termo") || value.includes("district")) return { finalEnergyCarrier: "district_heating", warnings: [], trace: trace("district_heating", { input }, ["Matched district heating input."], []) };
  if (value.includes("lpg") || value.includes("gpl")) return { finalEnergyCarrier: "lpg", warnings: [], trace: trace("lpg", { input }, ["Matched LPG/GLP input."], []) };
  if (value.includes("coal") || value.includes("carbune")) return { finalEnergyCarrier: "coal", warnings: [], trace: trace("coal", { input }, ["Matched coal input."], []) };
  return {
    finalEnergyCarrier: null,
    warnings: ["AMBIGUOUS_HEATING_OR_FUEL_INPUT"],
    trace: trace(null, { input }, [`Could not map heating/fuel input: ${raw}`], ["AMBIGUOUS_HEATING_OR_FUEL_INPUT"], "low")
  };
}

export function resolveMc001Carrier(rawCarrier) {
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
      trace: trace(null, { rawCarrier }, ["No final energy carrier was provided."], warnings, "low")
    };
  }
  const mapping = FINAL_TO_MC001_CARRIER_MAP[finalEnergyCarrier];
  if (!mapping) {
    const warnings = ["UNMAPPED_FINAL_ENERGY_CARRIER"];
    return {
      finalEnergyCarrier,
      primaryEnergyCarrier: null,
      co2Carrier: null,
      warnings,
      assumptions: [`Carrier ${finalEnergyCarrier} nu exista in mapping-ul MC001-like.`],
      confidence: "low",
      trace: trace(null, { rawCarrier, finalEnergyCarrier }, [`No mapping for ${finalEnergyCarrier}.`], warnings, "low")
    };
  }
  return {
    finalEnergyCarrier,
    primaryEnergyCarrier: mapping.primaryEnergyCarrier,
    co2Carrier: mapping.co2Carrier,
    warnings: [],
    assumptions: [`Carrier ${finalEnergyCarrier} mapat catre registries MC001-like.`],
    confidence: "medium",
    trace: trace(mapping, { rawCarrier, finalEnergyCarrier }, [
      `${finalEnergyCarrier} -> primary=${mapping.primaryEnergyCarrier}, co2=${mapping.co2Carrier}.`
    ], [])
  };
}

export { FINAL_TO_MC001_CARRIER_MAP };
