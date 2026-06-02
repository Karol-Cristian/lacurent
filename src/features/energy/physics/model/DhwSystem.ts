import type { PhysicsConfidence, PhysicsSource } from "./Material";
import type { FuelCarrierCode } from "./FuelCarrier";

export interface DhwSystemV04 {
  heatSource: "same_as_heating" | "electric_boiler" | "gas_boiler" | "heat_pump_water_heater" | "solar_thermal_with_backup" | "district_heating" | "unknown";
  fuelCarrier: FuelCarrierCode;
  occupants?: number;
  dailyHotWaterLitersPerPerson?: number;
  coldWaterTemperatureC?: number;
  hotWaterTemperatureC?: number;
  distributionEfficiency: number;
  storageEfficiency: number;
  generationEfficiency: number;
  source: PhysicsSource;
  confidence: PhysicsConfidence;
  assumptions: string[];
}
