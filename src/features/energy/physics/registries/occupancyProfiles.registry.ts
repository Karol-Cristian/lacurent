export interface OccupancyProfile {
  id: string;
  hoursHomePerDay: number;
  activeDaysPerMonth: number;
  source: "default" | "internal_estimate";
  confidence: "low" | "medium" | "high";
}

export const OCCUPANCY_PROFILES_REGISTRY: Record<string, OccupancyProfile> = {
  residential_default: {
    id: "residential_default",
    hoursHomePerDay: 14,
    activeDaysPerMonth: 30.4,
    source: "internal_estimate",
    confidence: "low"
  }
};
