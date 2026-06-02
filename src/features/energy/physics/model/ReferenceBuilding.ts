import type { PhysicsConfidence } from "./Material";

export interface ReferenceBuilding {
  id: string;
  basedOnBuildingId: string;
  buildingCategory: "single_family_house" | "apartment" | "apartment_building" | "office" | "school" | "hospital" | "retail" | "other";
  envelopeReferenceValues: {
    wallUValue: number;
    roofUValue: number;
    floorUValue: number;
    windowUValue: number;
    doorUValue: number;
  };
  systemReferenceValues: {
    heatingSystemEfficiency: number;
    dhwSystemEfficiency: number;
    coolingEfficiency?: number;
    ventilationHeatRecoveryEfficiency?: number;
  };
  renewableShareRequirementPercent?: number;
  source: "mc001" | "internal_reference" | "registry_default";
  confidence: PhysicsConfidence;
  assumptions: string[];
}
