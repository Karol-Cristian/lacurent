import type { FuelCarrierCode } from "../model/FuelCarrier";

export interface FuelCarrierPreset {
  code: FuelCarrierCode;
  label: string;
  source: "registry_default" | "internal_estimate";
  confidence: "low" | "medium" | "high";
}

export const FUEL_CARRIERS_REGISTRY: Record<FuelCarrierCode, FuelCarrierPreset> = {
  natural_gas: { code: "natural_gas", label: "Gaz natural", source: "registry_default", confidence: "medium" },
  electricity: { code: "electricity", label: "Electricitate", source: "registry_default", confidence: "medium" },
  wood: { code: "wood", label: "Lemn", source: "registry_default", confidence: "low" },
  pellets: { code: "pellets", label: "Peleti", source: "registry_default", confidence: "low" },
  district_heating: { code: "district_heating", label: "Termoficare", source: "internal_estimate", confidence: "low" },
  lpg: { code: "lpg", label: "GPL", source: "internal_estimate", confidence: "low" },
  coal: { code: "coal", label: "Carbune", source: "internal_estimate", confidence: "low" },
  biomass: { code: "biomass", label: "Biomasa", source: "internal_estimate", confidence: "low" },
  unknown: { code: "unknown", label: "Necunoscut", source: "internal_estimate", confidence: "low" }
};
