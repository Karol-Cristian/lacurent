import type { PhysicsConfidence, PhysicsSource, PhysicsValue } from "./Material";

export interface Climate {
  id: string;
  country: string;
  county?: string;
  locality?: string;
  climateZone: string;
  designOutdoorTemperatureC: PhysicsValue;
  averageOutdoorTemperatureHeatingSeasonC: PhysicsValue;
  indoorSetpointHeatingC: PhysicsValue;
  heatingDegreeDays: PhysicsValue;
  coolingDegreeDays?: PhysicsValue;
  solarRadiationAnnualKwhM2?: PhysicsValue;
  source: PhysicsSource;
  confidence: PhysicsConfidence;
}
