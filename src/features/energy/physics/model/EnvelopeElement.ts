import type { MaterialLayer, PhysicsValue } from "./Material";

export type EnvelopeElementType =
  | "external_wall"
  | "roof"
  | "ceiling_to_attic"
  | "floor_on_ground"
  | "floor_over_basement"
  | "floor_over_unconditioned_space"
  | "window"
  | "external_door"
  | "internal_partition_to_unconditioned";

export type EnvelopeBoundary =
  | { type: "exterior" }
  | { type: "ground" }
  | { type: "unconditioned_zone"; zoneId: string }
  | { type: "conditioned_zone"; zoneId: string };

export interface EnvelopeElement {
  id: string;
  name: string;
  type: EnvelopeElementType;
  areaM2: PhysicsValue | number;
  fromZoneId?: string;
  to?: EnvelopeBoundary;
  boundary:
    | "exterior"
    | "ground"
    | "unconditioned_attic"
    | "unconditioned_basement"
    | "unconditioned_garage"
    | "heated_space";
  orientation?: "north" | "south" | "east" | "west" | "horizontal" | "unknown";
  tiltDeg?: number;
  layers?: MaterialLayer[];
  windowSystemId?: string;
  doorSystemId?: string;
  thermalBridges?: import("./ThermalBridge").ThermalBridge[];
  declaredUValueWm2K?: PhysicsValue;
  correctionFactor?: PhysicsValue;
  calculated?: {
    rValueM2KPerW?: number;
    uValueWPerM2K?: number;
    correctedUValueWPerM2K?: number;
    heatTransferCoefficientWPerK?: number;
  };
}

export interface WindowSystem {
  id: string;
  name: string;
  glazingType: "single" | "double_old" | "double_low_e" | "triple" | "unknown";
  frameType:
    | "wood_old"
    | "wood_modern"
    | "pvc"
    | "aluminium_no_thermal_break"
    | "aluminium_thermal_break"
    | "unknown";
  uValueWm2K: PhysicsValue;
  gValue: PhysicsValue;
  airTightnessClass?: string;
}
