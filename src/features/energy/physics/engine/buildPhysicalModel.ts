import type { Building } from "../model/Building";
import type { EnvelopeElement } from "../model/EnvelopeElement";
import type { MaterialLayer, PhysicsValue } from "../model/Material";
import type { ThermalBridge } from "../model/ThermalBridge";
import { CLIMATE_REGISTRY } from "../registries/climate.registry";
import { HEATING_SYSTEMS_REGISTRY } from "../registries/heatingSystems.registry";
import { MATERIALS_REGISTRY } from "../registries/materials.registry";
import { WINDOWS_REGISTRY } from "../registries/windows.registry";

export interface PhysicalModelInput {
  id?: string;
  name?: string;
  buildingType?: "single_family_house" | "apartment" | "apartment_building" | "other";
  country?: string;
  county?: string;
  locality?: string;
  constructionYear?: number;
  usefulAreaM2?: number;
  heatedAreaM2?: number;
  numberOfFloors?: number;
  floorHeightM?: number;
  wallMaterialId?: string;
  wallThicknessM?: number;
  wallInsulationMaterialId?: string;
  wallInsulationThicknessM?: number;
  roofInsulationMaterialId?: string;
  roofInsulationThicknessM?: number;
  floorInsulationMaterialId?: string;
  floorInsulationThicknessM?: number;
  windowSystemId?: string;
  heatingSystemId?: string;
  ventilationAch?: number;
}

function pv(value: number, unit: string, assumptions: string[] = [], confidence: PhysicsValue["confidence"] = "medium"): PhysicsValue {
  return { value, unit, source: "internal_estimate", confidence, assumptions };
}

function layer(materialId: string, thicknessM: number, assumptions: string[] = []): MaterialLayer {
  const material = MATERIALS_REGISTRY[materialId];
  return {
    materialId,
    name: material?.name || materialId,
    thicknessM: pv(thicknessM, "m", assumptions, assumptions.length ? "low" : "medium"),
    lambdaWmK: material?.lambdaWmK
  };
}

function wallLayers(input: PhysicalModelInput): MaterialLayer[] {
  const layers = [
    layer("plaster", 0.02),
    layer(input.wallMaterialId || "solid_brick", input.wallThicknessM || 0.3)
  ];
  if ((input.wallInsulationThicknessM || 0) > 0) {
    layers.push(layer(input.wallInsulationMaterialId || "eps", input.wallInsulationThicknessM || 0.05));
  }
  layers.push(layer("plaster", 0.02));
  return layers;
}

function insulatedLayers(materialId: string, thicknessM: number, fallbackThicknessM: number): MaterialLayer[] {
  return [
    layer("wood", 0.025, ["Strat suport simplificat pentru v0.1."]),
    layer(materialId, thicknessM || fallbackThicknessM, ["Grosime estimata cand utilizatorul nu cunoaste detaliul."])
  ];
}

export function buildPhysicalModel(input: PhysicalModelInput = {}): Building {
  const area = input.heatedAreaM2 || input.usefulAreaM2 || 65;
  const floors = input.numberOfFloors || 1;
  const height = input.floorHeightM || 2.5;
  const footprint = area / floors;
  const volume = area * height;
  const wallAreaGross = Math.max(0, Math.sqrt(footprint) * 4 * height * floors);
  const windowArea = area * 0.15;
  const doorArea = 2.2;
  const wallArea = Math.max(0, wallAreaGross - windowArea - doorArea);
  const climateKey = String(input.county || input.locality || "").toLowerCase().includes("cluj") ? "cluj" : "ro_default";
  const windowSystem = WINDOWS_REGISTRY[input.windowSystemId || "double_old"];

  const envelope: EnvelopeElement[] = [
    {
      id: "external_walls",
      name: "Pereti exteriori",
      type: "external_wall",
      areaM2: pv(wallArea, "m2", ["Arie pereti estimata din amprenta, inaltime si suprafata vitrata."], "low"),
      boundary: "exterior",
      orientation: "unknown",
      layers: wallLayers(input)
    },
    {
      id: "attic_ceiling",
      name: "Planseu catre pod/acoperis",
      type: "ceiling_to_attic",
      areaM2: pv(footprint, "m2", ["Arie acoperis estimata egala cu amprenta cladirii."], "low"),
      boundary: "unconditioned_attic",
      orientation: "horizontal",
      layers: insulatedLayers(input.roofInsulationMaterialId || "mineral_wool", input.roofInsulationThicknessM || 0.06, 0.06)
    },
    {
      id: "floor_on_ground",
      name: "Pardoseala pe sol",
      type: "floor_on_ground",
      areaM2: pv(footprint, "m2", ["Arie pardoseala estimata egala cu amprenta cladirii."], "low"),
      boundary: "ground",
      orientation: "horizontal",
      layers: input.floorInsulationThicknessM
        ? insulatedLayers(input.floorInsulationMaterialId || "xps", input.floorInsulationThicknessM, 0.04)
        : [layer("concrete", 0.12), layer("soil_equivalent", 1, ["Sol modelat ca rezistenta echivalenta simplificata in v0.1."])]
    },
    {
      id: "windows",
      name: "Ferestre",
      type: "window",
      areaM2: pv(windowArea, "m2", ["Suprafata vitrata estimata la 15% din aria incalzita."], "low"),
      boundary: "exterior",
      orientation: "unknown",
      layers: [],
      declaredUValueWm2K: windowSystem.uValueWm2K
    },
    {
      id: "external_doors",
      name: "Usi exterioare",
      type: "external_door",
      areaM2: pv(doorArea, "m2", ["Arie usa estimata pentru v0.1."], "low"),
      boundary: "exterior",
      orientation: "unknown",
      layers: [layer("wood", 0.05, ["Usa modelata simplificat ca strat echivalent de lemn."])]
    }
  ];

  const thermalBridges: ThermalBridge[] = [
    {
      id: "foundation_bridge",
      type: "foundation",
      lengthM: pv(Math.sqrt(footprint) * 4, "m", ["Perimetru estimat din amprenta patrata."], "low"),
      psiWmK: pv(0.25, "W/mK", ["Psi estimativ pentru fundatie."], "low"),
      severity: "medium"
    }
  ];

  return {
    id: input.id || "physical-demo",
    name: input.name || "Locuinta analizata",
    buildingType: input.buildingType || "single_family_house",
    usageCategory: "residential",
    constructionYear: input.constructionYear ? pv(input.constructionYear, "year", ["An introdus de utilizator."], "medium") : undefined,
    address: {
      country: input.country || "Romania",
      county: input.county,
      locality: input.locality
    },
    geometry: {
      usefulAreaM2: pv(input.usefulAreaM2 || area, "m2"),
      heatedAreaM2: pv(area, "m2"),
      footprintAreaM2: pv(footprint, "m2", ["Amprenta estimata din suprafata si numar niveluri."], "low"),
      heatedVolumeM3: pv(volume, "m3", ["Volum = aria incalzita x inaltime medie."], "medium"),
      averageFloorHeightM: pv(height, "m"),
      numberOfFloors: pv(floors, "-")
    },
    climate: CLIMATE_REGISTRY[climateKey],
    thermalZones: [
      {
        id: "main_zone",
        name: "Zona incalzita principala",
        type: "conditioned",
        floorAreaM2: pv(area, "m2"),
        volumeM3: pv(volume, "m3"),
        heatingSetpointC: pv(20, "C", ["Setpoint implicit pentru locuire."])
      }
    ],
    unconditionedZones: [
      {
        id: "attic",
        name: "Pod neincalzit",
        type: "unconditioned",
        floorAreaM2: pv(footprint, "m2", ["Zona optionala modelata simplificat."], "low"),
        volumeM3: pv(footprint * 1.2, "m3", ["Volum pod estimativ."], "low"),
        adjacentTemperatureFactor: pv(0.85, "-", ["Factor simplificat pentru spatiu neincalzit."])
      }
    ],
    envelope,
    thermalBridges,
    ventilation: {
      ventilationType: "natural",
      airChangeRateACH: pv(input.ventilationAch || 0.7, "1/h", ["Rata ventilatie naturala estimativa."], "low"),
      infiltrationLevel: "average"
    },
    heatingSystem: HEATING_SYSTEMS_REGISTRY[input.heatingSystemId || "wood_stove_old"],
    domesticHotWater: {
      source: "same_as_heating",
      fuel: HEATING_SYSTEMS_REGISTRY[input.heatingSystemId || "wood_stove_old"].fuel,
      seasonalEfficiency: pv(0.55, "-", ["ACM foloseste eficienta sistemului principal in v0.1."], "low")
    },
    renewables: {
      photovoltaic: { installed: false },
      solarThermal: { installed: false }
    }
  };
}

export const demoOldHousePhysicalInput: PhysicalModelInput = {
  id: "demo-salicea-1964",
  name: "Casa demo Salicea 1964",
  buildingType: "single_family_house",
  country: "Romania",
  county: "Cluj",
  locality: "Salicea",
  constructionYear: 1964,
  usefulAreaM2: 64.8,
  heatedAreaM2: 64.8,
  numberOfFloors: 1,
  floorHeightM: 2.5,
  wallMaterialId: "solid_brick",
  wallThicknessM: 0.3,
  wallInsulationMaterialId: "eps",
  wallInsulationThicknessM: 0.05,
  roofInsulationMaterialId: "mineral_wool",
  roofInsulationThicknessM: 0.06,
  windowSystemId: "double_old",
  heatingSystemId: "wood_stove_old",
  ventilationAch: 0.8
};
