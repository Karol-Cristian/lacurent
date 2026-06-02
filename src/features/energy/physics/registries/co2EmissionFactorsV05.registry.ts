import type { FuelCarrierCode } from "../model/FuelCarrier";
import type { Co2EmissionFactor } from "../model/PrimaryEnergyAndCo2";

export const CO2_EMISSION_FACTORS_V05: Record<FuelCarrierCode, Co2EmissionFactor> = {
  electricity: { carrier: "electricity", kgCo2PerKwh: 0.24, source: "internal_estimate", confidence: "low", assumptions: ["Factor CO2 placeholder pentru mix electric."] },
  natural_gas: { carrier: "natural_gas", kgCo2PerKwh: 0.202, source: "internal_estimate", confidence: "medium", assumptions: ["Factor estimativ gaz natural."] },
  wood: { carrier: "wood", kgCo2PerKwh: 0.03, source: "internal_estimate", confidence: "low", assumptions: ["Contabilizare simplificata biomasa."] },
  pellets: { carrier: "pellets", kgCo2PerKwh: 0.04, source: "internal_estimate", confidence: "low", assumptions: ["Contabilizare simplificata peleti."] },
  district_heating: { carrier: "district_heating", kgCo2PerKwh: 0.18, source: "internal_estimate", confidence: "low", assumptions: ["Termoficare placeholder pana la factor real local."] },
  lpg: { carrier: "lpg", kgCo2PerKwh: 0.23, source: "internal_estimate", confidence: "low", assumptions: ["Factor placeholder GPL."] },
  coal: { carrier: "coal", kgCo2PerKwh: 0.34, source: "internal_estimate", confidence: "low", assumptions: ["Factor placeholder carbune."] },
  biomass: { carrier: "biomass", kgCo2PerKwh: 0.035, source: "internal_estimate", confidence: "low", assumptions: ["Biomasa generic estimativa."] },
  unknown: { carrier: "unknown", kgCo2PerKwh: 0.2, source: "internal_estimate", confidence: "low", assumptions: ["Carrier necunoscut, factor generic provizoriu."] }
};
