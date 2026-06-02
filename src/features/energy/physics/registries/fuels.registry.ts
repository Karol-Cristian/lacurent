import type { PhysicsValue } from "../model/Material";
import type { HeatingSystem } from "../model/Systems";

export interface FuelPreset {
  id: HeatingSystem["fuel"];
  label: string;
  finalEnergyCarrier: "electricity" | "natural_gas" | "wood" | "pellets" | "district_heating" | "lpg" | "coal" | "unknown";
  conversionToKwh?: PhysicsValue;
}

export const FUELS_REGISTRY: Record<string, FuelPreset> = {
  wood: { id: "wood", label: "Lemn", finalEnergyCarrier: "wood" },
  natural_gas: { id: "natural_gas", label: "Gaz natural", finalEnergyCarrier: "natural_gas" },
  electricity: { id: "electricity", label: "Electricitate", finalEnergyCarrier: "electricity" },
  heat_pump: { id: "heat_pump", label: "Pompa de caldura", finalEnergyCarrier: "electricity" },
  pellets: { id: "pellets", label: "Peleti", finalEnergyCarrier: "pellets" },
  district_heating: { id: "district_heating", label: "Termoficare", finalEnergyCarrier: "district_heating" },
  lpg: { id: "lpg", label: "GPL", finalEnergyCarrier: "lpg" },
  coal: { id: "coal", label: "Carbune", finalEnergyCarrier: "coal" },
  unknown: { id: "unknown", label: "Necunoscut", finalEnergyCarrier: "unknown" }
};
