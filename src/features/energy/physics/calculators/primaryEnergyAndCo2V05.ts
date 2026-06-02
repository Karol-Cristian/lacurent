import type { FinalEnergyCarrier } from "../model/FinalEnergy";
import type { FuelCarrierCode } from "../model/FuelCarrier";
import type { PhysicsConfidence, PhysicsValue } from "../model/Material";
import type { PrimaryEnergyAndCo2Result } from "../model/PrimaryEnergyAndCo2";
import { CO2_EMISSION_FACTORS_V05 } from "../registries/co2EmissionFactorsV05.registry";
import { PRIMARY_ENERGY_FACTORS_V05 } from "../registries/primaryEnergyFactorsV05.registry";

type FinalEnergyLike = Partial<Record<FinalEnergyCarrier | FuelCarrierCode, PhysicsValue | number>>;

const CARRIERS: FuelCarrierCode[] = ["natural_gas", "electricity", "wood", "pellets", "district_heating", "lpg", "coal", "biomass", "unknown"];

function numeric(value: PhysicsValue | number | undefined): number {
  return typeof value === "number" ? value : value?.value || 0;
}

function confidenceMin(confidences: PhysicsConfidence[]): PhysicsConfidence {
  if (confidences.includes("low")) return "low";
  if (confidences.includes("medium")) return "medium";
  return "high";
}

export function calculatePrimaryEnergyAndCo2V05(finalEnergyByCarrier: FinalEnergyLike, heatedAreaM2: number): PrimaryEnergyAndCo2Result {
  const primaryEnergyByCarrier = {} as PrimaryEnergyAndCo2Result["primaryEnergyByCarrier"];
  const co2ByCarrierKgYear = {} as PrimaryEnergyAndCo2Result["co2ByCarrierKgYear"];
  const confidences: PhysicsConfidence[] = [];
  let renewable = 0;
  let nonRenewable = 0;
  let totalPrimary = 0;
  let totalCo2 = 0;

  for (const carrier of CARRIERS) {
    const finalKwh = numeric(finalEnergyByCarrier[carrier]);
    const primaryFactor = PRIMARY_ENERGY_FACTORS_V05[carrier];
    const co2Factor = CO2_EMISSION_FACTORS_V05[carrier];
    const renewableKwh = finalKwh * primaryFactor.renewableFactor;
    const nonRenewableKwh = finalKwh * primaryFactor.nonRenewableFactor;
    const totalKwh = finalKwh * primaryFactor.totalFactor;
    const co2Kg = finalKwh * co2Factor.kgCo2PerKwh;
    primaryEnergyByCarrier[carrier] = {
      renewableKwh: Math.round(renewableKwh),
      nonRenewableKwh: Math.round(nonRenewableKwh),
      totalKwh: Math.round(totalKwh)
    };
    co2ByCarrierKgYear[carrier] = Math.round(co2Kg);
    renewable += renewableKwh;
    nonRenewable += nonRenewableKwh;
    totalPrimary += totalKwh;
    totalCo2 += co2Kg;
    if (finalKwh > 0) {
      confidences.push(primaryFactor.confidence, co2Factor.confidence);
    }
  }

  return {
    primaryEnergyByCarrier,
    totalPrimaryEnergyKwhYear: Math.round(totalPrimary),
    totalPrimaryEnergyKwhM2Year: Number((totalPrimary / Math.max(1, heatedAreaM2)).toFixed(1)),
    renewablePrimaryEnergyKwhYear: Math.round(renewable),
    nonRenewablePrimaryEnergyKwhYear: Math.round(nonRenewable),
    renewableEnergyRatioPercent: totalPrimary > 0 ? Math.round(renewable / totalPrimary * 100) : 0,
    co2ByCarrierKgYear,
    totalCo2KgYear: Math.round(totalCo2),
    totalCo2KgM2Year: Number((totalCo2 / Math.max(1, heatedAreaM2)).toFixed(1)),
    assumptions: [
      "v0.5 transforma energia finala in energie primara si CO2.",
      "Factorii actuali sunt configurabili si marcati internal_estimate, nu valori normative oficiale.",
      "Nu se calculeaza clase energetice in v0.5."
    ],
    confidence: confidenceMin(confidences.length ? confidences : ["low"])
  };
}
