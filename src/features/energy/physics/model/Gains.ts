import type { PhysicsConfidence, PhysicsSource } from "./Material";

export interface InternalGainsInput {
  occupants?: number;
  heatedAreaM2: number;
  buildingType: "single_family_house" | "apartment" | "other";
  lightingPowerWPerM2?: number;
  appliancePowerWPerM2?: number;
  occupancyProfileId?: string;
}

export interface MonthlyInternalGains {
  month: number;
  peopleGainsKwh: number;
  lightingGainsKwh: number;
  appliancesGainsKwh: number;
  totalInternalGainsKwh: number;
  unit: "kWh";
  source: PhysicsSource;
  confidence: PhysicsConfidence;
  assumptions: string[];
}

export interface SolarGainSurface {
  elementId: string;
  areaM2: number;
  orientation: "north" | "south" | "east" | "west" | "horizontal" | "unknown";
  tiltDeg?: number;
  gValue?: number;
  frameFactor?: number;
  shadingFactor?: number;
}

export interface MonthlySolarGains {
  month: number;
  gainsByElement: Record<string, number>;
  totalSolarGainsKwh: number;
  unit: "kWh";
  source: PhysicsSource;
  confidence: PhysicsConfidence;
  assumptions: string[];
}
