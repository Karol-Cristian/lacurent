import type { PhysicsValue } from "./Material";

export interface ThermalZone {
  id: string;
  name: string;
  type: "heated" | "cooled" | "conditioned";
  areaM2: number;
  volumeM3: number;
  heatingSetpointC: number;
  coolingSetpointC?: number;
  occupancyScheduleId?: string;
  floorAreaM2?: PhysicsValue;
  volumeM3Value?: PhysicsValue;
  heatingSetpointValueC?: PhysicsValue;
}

export interface UnconditionedZone {
  id: string;
  name: string;
  type: "attic" | "basement" | "garage" | "staircase" | "veranda" | "other";
  areaM2?: number;
  volumeM3?: number;
  estimatedTemperatureC?: number;
  adjacentExteriorElements: string[];
  adjacentTemperatureFactor?: PhysicsValue;
}
