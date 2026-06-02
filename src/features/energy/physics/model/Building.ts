import type { Climate } from "./Climate";
import type { EnvelopeElement } from "./EnvelopeElement";
import type { PhysicsValue } from "./Material";
import type { ThermalBridge } from "./ThermalBridge";
import type { ThermalZone, UnconditionedZone } from "./ThermalZone";
import type { DomesticHotWaterSystem, HeatingSystem, RenewableSystem, VentilationModel } from "./Systems";

export interface BuildingGeometry {
  usefulAreaM2: PhysicsValue;
  heatedAreaM2: PhysicsValue;
  footprintAreaM2?: PhysicsValue;
  heatedVolumeM3: PhysicsValue;
  averageFloorHeightM: PhysicsValue;
  numberOfFloors: PhysicsValue;
}

export interface Building {
  id: string;
  name: string;
  buildingType: "single_family_house" | "apartment" | "apartment_building" | "other";
  usageCategory: "residential" | "commercial" | "public" | "industrial" | "mixed";
  constructionYear?: PhysicsValue;
  constructionYearValue?: number;
  location?: {
    country: string;
    county?: string;
    locality?: string;
  };
  climateZoneId?: string;
  usefulAreaM2?: number;
  heatedAreaM2?: number;
  heatedVolumeM3?: number;
  numberOfFloors?: number;
  averageFloorHeightM?: number;
  measurementConvention?: "total_internal_dimensions" | "external_dimensions" | "heated_internal_dimensions";
  address?: {
    country: string;
    county?: string;
    locality?: string;
  };
  geometry: BuildingGeometry;
  climate: Climate;
  thermalZones: ThermalZone[];
  unconditionedZones: UnconditionedZone[];
  envelope: EnvelopeElement[];
  thermalBridges: ThermalBridge[];
  ventilation: VentilationModel;
  heatingSystem: HeatingSystem;
  domesticHotWater: DomesticHotWaterSystem;
  renewables: RenewableSystem;
}
