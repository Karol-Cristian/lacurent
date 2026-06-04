import type { AiAssumption, AiConfidence } from "./AiAssumption";

export interface NormalizedHomeInput {
  buildingType?: "house" | "apartment" | "duplex" | "other";
  mode: "owner" | "buyer";

  location?: {
    locality?: string;
    county?: string;
    climateZoneId?: string;
    confidence: AiConfidence;
  };

  geometry?: {
    usefulAreaM2?: number;
    heatedAreaM2?: number;
    heatedVolumeM3?: number;
    floors?: number;
    confidence: AiConfidence;
  };

  envelope?: {
    walls?: {
      material?: string;
      thicknessM?: number;
      insulationMaterial?: string;
      insulationThicknessM?: number;
      confidence: AiConfidence;
    };
    roofOrAttic?: {
      insulationMaterial?: string;
      insulationThicknessM?: number;
      condition?: "unknown" | "poor" | "medium" | "good";
      confidence: AiConfidence;
    };
    floor?: {
      type?: "ground" | "basement" | "unheated_space" | "unknown";
      insulationThicknessM?: number;
      confidence: AiConfidence;
    };
    windows?: {
      type?: "single" | "old_double" | "modern_double" | "triple" | "unknown";
      frame?: "wood" | "pvc" | "aluminium" | "unknown";
      confidence: AiConfidence;
    };
  };

  systems?: {
    heating?: {
      source?: "wood" | "gas" | "electricity" | "heat_pump" | "pellet" | "district" | "unknown";
      generatorType?: string;
      distribution?: "none_local" | "radiators" | "underfloor" | "air" | "unknown";
      confidence: AiConfidence;
    };
    dhw?: {
      source?: "same_as_heating" | "electric_boiler" | "gas_boiler" | "heat_pump" | "unknown";
      confidence: AiConfidence;
    };
    ventilation?: {
      type?: "natural" | "mechanical" | "heat_recovery" | "unknown";
      confidence: AiConfidence;
    };
  };

  access?: {
    hasGasAccess?: boolean;
    hasWoodAccess?: boolean;
    hasTechnicalRoom?: boolean;
    hasRoofForPv?: boolean;
    hasThreePhaseElectricity?: boolean;
  };

  assumptions: AiAssumption[];
  missingData: string[];
}
