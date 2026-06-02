import type { FuelCarrierCode } from "../model/FuelCarrier";
import type { PrimaryEnergyFactor } from "../model/PrimaryEnergyAndCo2";

export const PRIMARY_ENERGY_FACTORS_V05: Record<FuelCarrierCode, PrimaryEnergyFactor> = {
  electricity: { carrier: "electricity", renewableFactor: 0.55, nonRenewableFactor: 1.95, totalFactor: 2.5, source: "internal_estimate", confidence: "low", assumptions: ["Factor placeholder configurabil pentru mix electric."] },
  natural_gas: { carrier: "natural_gas", renewableFactor: 0, nonRenewableFactor: 1.1, totalFactor: 1.1, source: "internal_estimate", confidence: "low", assumptions: ["Factor placeholder pentru gaz natural."] },
  wood: { carrier: "wood", renewableFactor: 0.2, nonRenewableFactor: 0.05, totalFactor: 0.25, source: "internal_estimate", confidence: "low", assumptions: ["Biomasa tratata simplificat, nu normativ oficial."] },
  pellets: { carrier: "pellets", renewableFactor: 0.25, nonRenewableFactor: 0.08, totalFactor: 0.33, source: "internal_estimate", confidence: "low", assumptions: ["Peleti tratati simplificat, include procesare/transport estimativ."] },
  district_heating: { carrier: "district_heating", renewableFactor: 0.1, nonRenewableFactor: 1.2, totalFactor: 1.3, source: "internal_estimate", confidence: "low", assumptions: ["Termoficare placeholder pana avem sursa reala a retelei."] },
  lpg: { carrier: "lpg", renewableFactor: 0, nonRenewableFactor: 1.1, totalFactor: 1.1, source: "internal_estimate", confidence: "low", assumptions: ["Factor placeholder GPL."] },
  coal: { carrier: "coal", renewableFactor: 0, nonRenewableFactor: 1.2, totalFactor: 1.2, source: "internal_estimate", confidence: "low", assumptions: ["Factor placeholder carbune."] },
  biomass: { carrier: "biomass", renewableFactor: 0.25, nonRenewableFactor: 0.05, totalFactor: 0.3, source: "internal_estimate", confidence: "low", assumptions: ["Biomasa generic estimativa."] },
  unknown: { carrier: "unknown", renewableFactor: 0, nonRenewableFactor: 1, totalFactor: 1, source: "internal_estimate", confidence: "low", assumptions: ["Carrier necunoscut, factor neutru provizoriu."] }
};
