import type { FinalEnergyCarrier, FinalEnergyResult, FinalEnergyUse, SystemEfficiencyBreakdown, SystemLosses } from "../model/FinalEnergy";
import type { PhysicsConfidence, PhysicsValue } from "../model/Material";
import type { CoolingSystem, DomesticHotWaterSystem, HeatingSystem } from "../model/Systems";
import { AUXILIARY_ENERGY_PRESETS } from "../registries/auxiliaryEnergyPresets.registry";
import { CONTROL_EFFICIENCY_PRESETS } from "../registries/controlEfficiencyPresets.registry";
import { DISTRIBUTION_EFFICIENCY_PRESETS } from "../registries/distributionEfficiencyPresets.registry";
import { EMISSION_EFFICIENCY_PRESETS } from "../registries/emissionEfficiencyPresets.registry";
import { FUELS_REGISTRY } from "../registries/fuels.registry";
import { GENERATION_EFFICIENCY_PRESETS } from "../registries/generationEfficiencyPresets.registry";
import { STORAGE_EFFICIENCY_PRESETS } from "../registries/storageEfficiencyPresets.registry";
import { pv } from "./resistance";

export interface SystemsLayerInput {
  heatedAreaM2: number;
  occupants?: number;
  heatingDemandKwhYear: number;
  coolingDemandKwhYear?: number;
  dhwDemandKwhYear?: number;
  heatingSystem: HeatingSystem;
  coolingSystem?: CoolingSystem;
  domesticHotWaterSystem?: DomesticHotWaterSystem;
}

const CARRIERS: FinalEnergyCarrier[] = ["electricity", "natural_gas", "wood", "pellets", "district_heating", "lpg", "coal", "unknown"];
const USES: FinalEnergyUse[] = ["heating", "cooling", "dhw", "auxiliary"];

function confidenceMin(values: PhysicsValue[]): PhysicsConfidence {
  if (values.some(item => item.confidence === "low")) return "low";
  if (values.some(item => item.confidence === "medium")) return "medium";
  return "high";
}

function presetOrDefault(registry: Record<string, PhysicsValue>, id: string | undefined, fallbackId: string): PhysicsValue {
  return registry[id || ""] || registry[fallbackId];
}

export function calculateTotalSystemEfficiency(system: HeatingSystem): SystemEfficiencyBreakdown {
  const emissionEfficiency = presetOrDefault(EMISSION_EFFICIENCY_PRESETS, system.emissionEfficiencyId, system.distributionType === "underfloor" ? "underfloor" : system.distributionType === "air" ? "air" : system.distributionType === "local" ? "local_stove" : "radiators");
  const distributionEfficiency = presetOrDefault(DISTRIBUTION_EFFICIENCY_PRESETS, system.distributionEfficiencyId, system.distributionType === "local" ? "local" : system.distributionType === "underfloor" ? "underfloor" : "radiators_uninsulated");
  const storageEfficiency = presetOrDefault(STORAGE_EFFICIENCY_PRESETS, system.storageEfficiencyId, "none");
  const generationEfficiency = presetOrDefault(GENERATION_EFFICIENCY_PRESETS, system.generationEfficiencyId, system.generatorType);
  const controlEfficiency = presetOrDefault(CONTROL_EFFICIENCY_PRESETS, system.controlEfficiencyId, system.controlType === "unknown" ? "manual" : system.controlType);
  const values = [emissionEfficiency, distributionEfficiency, storageEfficiency, generationEfficiency, controlEfficiency];
  const total = values.reduce((product, item) => product * item.value, 1);
  return {
    emissionEfficiency,
    distributionEfficiency,
    storageEfficiency,
    generationEfficiency,
    controlEfficiency,
    totalSystemEfficiency: pv(Number(total.toFixed(3)), "-", [
      "totalSystemEfficiency = emission x distribution x storage x generation x control."
    ], confidenceMin(values), "internal_estimate")
  };
}

export function calculateDhwUsefulDemand({ occupants, heatedAreaM2, explicitDemandKwhYear }: { occupants?: number; heatedAreaM2: number; explicitDemandKwhYear?: number }): PhysicsValue {
  if (explicitDemandKwhYear && explicitDemandKwhYear > 0) {
    return pv(explicitDemandKwhYear, "kWh/an", ["Necesar ACM primit explicit din Energy Demand sau input."], "medium");
  }
  const estimatedOccupants = occupants && occupants > 0 ? occupants : Math.max(1, Math.round(heatedAreaM2 / 32));
  return pv(estimatedOccupants * 850, "kWh/an", [
    "Necesar ACM estimat din numar ocupanti; fallback: suprafata / 32 m2 pe persoana.",
    "Valoare orientativa, inainte de randamentul sistemului ACM."
  ], occupants ? "medium" : "low", "internal_estimate");
}

function calculateDeliveredEnergy(use: FinalEnergyUse, usefulDemand: PhysicsValue, efficiency: SystemEfficiencyBreakdown): SystemLosses {
  const finalEnergy = usefulDemand.value / Math.max(0.1, efficiency.totalSystemEfficiency.value);
  return {
    use,
    usefulDemandKwhYear: usefulDemand,
    finalEnergyKwhYear: pv(Math.round(finalEnergy), "kWh/an", [`Energie finala ${use} = necesar util / eficienta totala sistem.`], efficiency.totalSystemEfficiency.confidence),
    lossesKwhYear: pv(Math.max(0, Math.round(finalEnergy - usefulDemand.value)), "kWh/an", [`Pierderi sistem ${use} = energie finala - necesar util.`], efficiency.totalSystemEfficiency.confidence),
    efficiency
  };
}

function coolingFinalEnergy(coolingDemandKwhYear = 0, coolingSystem?: CoolingSystem): PhysicsValue {
  if (!coolingDemandKwhYear || coolingDemandKwhYear <= 0 || coolingSystem?.present === false) {
    return pv(0, "kWh/an", ["Nu exista necesar de racire sau sistem de racire activ."], "medium");
  }
  const seer = coolingSystem?.seer?.value || coolingSystem?.eer?.value || 3.1;
  return pv(Math.round(coolingDemandKwhYear / Math.max(0.5, seer)), "kWh/an", [
    "Consum final racire = necesar racire / SEER.",
    seer === 3.1 ? "SEER fallback internal_estimate = 3.1." : "SEER/EER primit din sistem."
  ], coolingSystem?.seer?.confidence || coolingSystem?.eer?.confidence || "low", "internal_estimate");
}

function carrierForFuel(fuel: HeatingSystem["fuel"] | DomesticHotWaterSystem["fuel"] | CoolingSystem["fuel"] | undefined): FinalEnergyCarrier {
  return (FUELS_REGISTRY[fuel || "unknown"]?.finalEnergyCarrier || "unknown") as FinalEnergyCarrier;
}

function emptyEnergyMap<T extends string>(keys: T[]): Record<T, PhysicsValue> {
  return keys.reduce((map, key) => {
    map[key] = pv(0, "kWh/an", ["Initializat la 0."], "medium");
    return map;
  }, {} as Record<T, PhysicsValue>);
}

function addEnergy(map: Record<string, PhysicsValue>, key: string, amount: number, assumption: string, confidence: PhysicsConfidence) {
  const current = map[key] || pv(0, "kWh/an", ["Initializat la 0."], confidence);
  map[key] = pv(Math.round(current.value + amount), "kWh/an", [...current.assumptions, assumption], current.confidence === "low" || confidence === "low" ? "low" : "medium");
}

export function runSystemsLayerV04(input: SystemsLayerInput): FinalEnergyResult {
  const heatingEfficiency = calculateTotalSystemEfficiency(input.heatingSystem);
  const heatingLoss = calculateDeliveredEnergy("heating", pv(input.heatingDemandKwhYear, "kWh/an", ["Necesar util de incalzire primit din Energy Demand v0.3."], "medium"), heatingEfficiency);
  const dhwUseful = calculateDhwUsefulDemand({
    occupants: input.occupants,
    heatedAreaM2: input.heatedAreaM2,
    explicitDemandKwhYear: input.dhwDemandKwhYear
  });
  const dhwSystem = input.domesticHotWaterSystem;
  const dhwEfficiency = dhwSystem
    ? calculateTotalSystemEfficiency({
      id: dhwSystem.systemPresetId || "dhw",
      fuel: dhwSystem.fuel,
      generatorType: dhwSystem.source === "electric_boiler" ? "electric_boiler" : input.heatingSystem.generatorType,
      distributionType: "local",
      controlType: "manual",
      emissionEfficiencyId: "local_stove",
      distributionEfficiencyId: "local",
      storageEfficiencyId: dhwSystem.storageVolumeL ? "dhw_tank" : "none",
      generationEfficiencyId: dhwSystem.source === "electric_boiler" ? "electric_direct" : input.heatingSystem.generationEfficiencyId,
      controlEfficiencyId: "manual",
      auxiliaryEnergyPresetId: "none",
      seasonalEfficiency: dhwSystem.seasonalEfficiency
    })
    : heatingEfficiency;
  const dhwLoss = calculateDeliveredEnergy("dhw", dhwUseful, dhwEfficiency);
  const coolingFinal = coolingFinalEnergy(input.coolingDemandKwhYear, input.coolingSystem);
  const heatingAux = AUXILIARY_ENERGY_PRESETS[input.heatingSystem.auxiliaryEnergyPresetId || "none"] || AUXILIARY_ENERGY_PRESETS.none;
  const coolingAux = AUXILIARY_ENERGY_PRESETS[input.coolingSystem?.auxiliaryEnergyPresetId || "none"] || AUXILIARY_ENERGY_PRESETS.none;
  const dhwAux = AUXILIARY_ENERGY_PRESETS[input.domesticHotWaterSystem?.systemPresetId || "none"] || AUXILIARY_ENERGY_PRESETS.none;
  const auxiliaryTotal = heatingAux.value + coolingAux.value + dhwAux.value;
  const finalEnergyByCarrier = emptyEnergyMap(CARRIERS);
  const finalEnergyByUse = emptyEnergyMap(USES);

  addEnergy(finalEnergyByUse, "heating", heatingLoss.finalEnergyKwhYear.value, "Incalzire prin sistemul principal.", heatingLoss.finalEnergyKwhYear.confidence);
  addEnergy(finalEnergyByUse, "cooling", coolingFinal.value, "Racire transformata prin SEER/EER.", coolingFinal.confidence);
  addEnergy(finalEnergyByUse, "dhw", dhwLoss.finalEnergyKwhYear.value, "ACM prin sistemul selectat sau fallback incalzire.", dhwLoss.finalEnergyKwhYear.confidence);
  addEnergy(finalEnergyByUse, "auxiliary", auxiliaryTotal, "Energie auxiliara pentru pompe, ventilatoare si automatizari.", "low");

  addEnergy(finalEnergyByCarrier, carrierForFuel(input.heatingSystem.fuel), heatingLoss.finalEnergyKwhYear.value, "Combustibil incalzire.", heatingLoss.finalEnergyKwhYear.confidence);
  addEnergy(finalEnergyByCarrier, "electricity", coolingFinal.value, "Racirea consuma energie electrica finala.", coolingFinal.confidence);
  const dhwCarrier = carrierForFuel(input.domesticHotWaterSystem?.fuel || input.heatingSystem.fuel);
  addEnergy(finalEnergyByCarrier, dhwCarrier, dhwLoss.finalEnergyKwhYear.value, "Combustibil ACM.", dhwLoss.finalEnergyKwhYear.confidence);
  addEnergy(finalEnergyByCarrier, "electricity", auxiliaryTotal, "Energia auxiliara este tratata ca electricitate.", "low");

  const total = Object.values(finalEnergyByUse).reduce((sum, item) => sum + item.value, 0);
  const confidence = confidenceMin([
    heatingLoss.finalEnergyKwhYear,
    coolingFinal,
    dhwLoss.finalEnergyKwhYear,
    heatingAux,
    coolingAux,
    dhwAux
  ]);

  return {
    finalEnergyByCarrier,
    finalEnergyByUse,
    finalEnergyCarrierByUse: {
      heating: carrierForFuel(input.heatingSystem.fuel),
      cooling: "electricity",
      dhw: dhwCarrier,
      auxiliary: "electricity"
    },
    systemLosses: [heatingLoss, dhwLoss],
    auxiliaryEnergy: {
      heatingKwhYear: heatingAux,
      coolingKwhYear: coolingAux,
      dhwKwhYear: dhwAux,
      totalKwhYear: pv(Math.round(auxiliaryTotal), "kWh/an", ["Suma energiei auxiliare pe incalzire, racire si ACM."], confidenceMin([heatingAux, coolingAux, dhwAux]))
    },
    totalFinalEnergyKwhYear: pv(Math.round(total), "kWh/an", ["Total energie finala = incalzire + racire + ACM + auxiliar."], confidence),
    totalFinalEnergyKwhM2Year: pv(Number((total / Math.max(1, input.heatedAreaM2)).toFixed(1)), "kWh/m2/an", ["Energie finala specifica raportata la aria incalzita."], confidence),
    assumptions: [
      "Physics Layer v0.4 transforma Energy Demand in Final Energy Consumption.",
      "Nu include energie primara, CO2 sau clase energetice; acestea sunt rezervate pentru v0.5.",
      "totalSystemEfficiency = emission x distribution x storage x generation x control.",
      "Pompele de caldura folosesc SCOP ca eficienta de generatie in aceeasi formula."
    ],
    confidence
  };
}
