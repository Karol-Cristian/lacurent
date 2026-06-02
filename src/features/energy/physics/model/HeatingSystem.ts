import type { PhysicsConfidence, PhysicsSource } from "./Material";
import type { FuelCarrierCode } from "./FuelCarrier";

export interface HeatingEmissionSubsystem {
  type: "local_stove" | "radiators" | "underfloor" | "fan_coil" | "air" | "unknown";
  efficiency: number;
}

export interface HeatingDistributionSubsystem {
  type: "none_local" | "radiator_pipes_uninsulated" | "radiator_pipes_insulated" | "underfloor_distribution" | "air_distribution" | "unknown";
  efficiency: number;
}

export interface HeatingStorageSubsystem {
  present: boolean;
  type?: "buffer_tank" | "thermal_storage" | "unknown";
  efficiency?: number;
}

export interface HeatingGenerationSubsystem {
  type: "wood_stove" | "gas_boiler_non_condensing" | "gas_boiler_condensing" | "pellet_boiler" | "electric_direct" | "heat_pump" | "district_heating" | "unknown";
  nominalEfficiency?: number;
  seasonalEfficiency?: number;
  cop?: number;
  scop?: number;
}

export interface HeatingControlSubsystem {
  type: "none" | "manual" | "room_thermostat" | "thermostatic_valves" | "zoned_control" | "smart_control" | "unknown";
  efficiencyFactor: number;
}

export interface HeatingSystemV04 {
  id: string;
  fuelCarrier: FuelCarrierCode;
  generatorType:
    | "wood_stove"
    | "masonry_stove"
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
  emission: HeatingEmissionSubsystem;
  distribution: HeatingDistributionSubsystem;
  storage?: HeatingStorageSubsystem;
  generation: HeatingGenerationSubsystem;
  control: HeatingControlSubsystem;
  source: PhysicsSource;
  confidence: PhysicsConfidence;
  assumptions: string[];
}
