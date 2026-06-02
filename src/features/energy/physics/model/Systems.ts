import type { PhysicsValue } from "./Material";

export interface VentilationModel {
  type?:
    | "natural"
    | "mechanical_exhaust"
    | "mechanical_supply_exhaust"
    | "mechanical_with_heat_recovery";
  ventilationType:
    | "natural"
    | "mechanical_exhaust"
    | "mechanical_supply_exhaust"
    | "mechanical_with_heat_recovery"
    | "unknown";
  airChangeRateACH: PhysicsValue;
  airChangeRateACHValue?: number;
  airflowM3PerH?: number;
  heatRecoveryEfficiency?: PhysicsValue;
  heatRecoveryEfficiencyValue?: number;
  infiltrationLevel: "very_leaky" | "leaky" | "average" | "tight" | "very_tight" | "unknown";
  source?: "user_input" | "default" | "internal_estimate";
}

export interface HeatingSystem {
  id: string;
  fuel: "natural_gas" | "wood" | "pellets" | "electricity" | "district_heating" | "heat_pump" | "lpg" | "coal" | "mixed" | "unknown";
  generatorType:
    | "local_stove"
    | "wood_stove"
    | "gas_boiler_non_condensing"
    | "gas_boiler_condensing"
    | "pellet_boiler"
    | "electric_radiator"
    | "electric_boiler"
    | "air_to_air_heat_pump"
    | "air_to_water_heat_pump"
    | "ground_source_heat_pump"
    | "district_heating"
    | "unknown";
  seasonalEfficiency?: PhysicsValue;
  scop?: PhysicsValue;
  distributionType: "local" | "radiators" | "underfloor" | "air" | "mixed" | "unknown";
  controlType: "none" | "manual" | "room_thermostat" | "thermostatic_valves" | "zoned_control" | "smart_control" | "unknown";
  emissionEfficiencyId?: string;
  distributionEfficiencyId?: string;
  storageEfficiencyId?: string;
  generationEfficiencyId?: string;
  controlEfficiencyId?: string;
  auxiliaryEnergyPresetId?: string;
}

export interface DomesticHotWaterSystem {
  source: "same_as_heating" | "gas_boiler" | "electric_boiler" | "heat_pump" | "solar_thermal" | "district_heating" | "unknown";
  fuel: HeatingSystem["fuel"];
  seasonalEfficiency: PhysicsValue;
  storageVolumeL?: PhysicsValue;
  systemPresetId?: string;
  occupants?: number;
}

export interface CoolingSystem {
  id: string;
  present: boolean;
  fuel: "electricity" | "district_heating" | "unknown";
  systemType: "split_ac" | "multi_split" | "centralized" | "air_to_air_heat_pump" | "none" | "unknown";
  seer?: PhysicsValue;
  eer?: PhysicsValue;
  auxiliaryEnergyPresetId?: string;
}

export interface RenewableSystem {
  photovoltaic?: {
    installed: boolean;
    peakPowerKw?: PhysicsValue;
    annualProductionKwh?: PhysicsValue;
    selfConsumptionPercent?: PhysicsValue;
  };
  solarThermal?: {
    installed: boolean;
    contributionToDhwPercent?: PhysicsValue;
  };
}
