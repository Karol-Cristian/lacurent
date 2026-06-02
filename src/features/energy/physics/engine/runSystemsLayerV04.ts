import type { Building } from "../model/Building";
import type { EnergyDemandResult } from "../model/EnergyDemand";
import type { FinalEnergyResult } from "../model/FinalEnergy";
import type { CoolingSystem } from "../model/Systems";
import { runSystemsLayerV04 as calculateSystemsLayerV04 } from "../calculators/systemsLayerV04";

export function runSystemsLayerV04(building: Building, demand: EnergyDemandResult, options: {
  coolingSystem?: CoolingSystem;
  occupants?: number;
  dhwDemandKwhYear?: number;
} = {}): FinalEnergyResult {
  return calculateSystemsLayerV04({
    heatedAreaM2: building.heatedAreaM2 || building.geometry.heatedAreaM2.value,
    occupants: options.occupants,
    heatingDemandKwhYear: demand.annual.heatingDemandKwhYear,
    coolingDemandKwhYear: demand.annual.coolingDemandKwhYear,
    dhwDemandKwhYear: options.dhwDemandKwhYear,
    heatingSystem: building.heatingSystem,
    domesticHotWaterSystem: building.domesticHotWater,
    coolingSystem: options.coolingSystem
  });
}
