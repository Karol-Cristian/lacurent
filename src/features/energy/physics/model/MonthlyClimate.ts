import type { PhysicsConfidence, PhysicsSource } from "./Material";

export interface MonthlyClimateData {
  month: number;
  averageOutdoorTemperatureC: number;
  heatingDegreeDays?: number;
  coolingDegreeDays?: number;
  solarRadiationKwhM2: {
    horizontal?: number;
    north?: number;
    south?: number;
    east?: number;
    west?: number;
  };
}

export interface ClimateYear {
  climateZoneId: string;
  locationName?: string;
  months: MonthlyClimateData[];
  source: "mc001" | "weather_dataset" | "internal_estimate";
  confidence: PhysicsConfidence;
}

export interface MonthlyClimateResult {
  climate: ClimateYear;
  source: PhysicsSource;
  confidence: PhysicsConfidence;
  assumptions: string[];
}
