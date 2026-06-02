import type { Building } from "../model/Building";

export const demoSaliceaEnvelopeV02: Building = {
  id: "demo-salicea-envelope-v02",
  name: "Casa individuala Salicea 1964",
  buildingType: "single_family_house",
  usageCategory: "residential",
  constructionYearValue: 1964,
  location: {
    country: "Romania",
    county: "Cluj",
    locality: "Salicea"
  },
  climateZoneId: "cluj",
  usefulAreaM2: 64.8,
  heatedAreaM2: 64.8,
  heatedVolumeM3: 162,
  numberOfFloors: 1,
  averageFloorHeightM: 2.5,
  measurementConvention: "total_internal_dimensions",
  constructionYear: {
    value: 1964,
    unit: "year",
    source: "user_input",
    confidence: "medium",
    assumptions: ["An de constructie introdus pentru profilul demo."]
  },
  address: {
    country: "Romania",
    county: "Cluj",
    locality: "Salicea"
  },
  geometry: {
    usefulAreaM2: { value: 64.8, unit: "m2", source: "user_input", confidence: "medium", assumptions: [] },
    heatedAreaM2: { value: 64.8, unit: "m2", source: "user_input", confidence: "medium", assumptions: [] },
    footprintAreaM2: { value: 64.8, unit: "m2", source: "internal_estimate", confidence: "medium", assumptions: ["Casa cu un nivel."] },
    heatedVolumeM3: { value: 162, unit: "m3", source: "internal_estimate", confidence: "medium", assumptions: ["Volum = 64.8 m2 x 2.5 m."] },
    averageFloorHeightM: { value: 2.5, unit: "m", source: "internal_estimate", confidence: "medium", assumptions: [] },
    numberOfFloors: { value: 1, unit: "-", source: "user_input", confidence: "medium", assumptions: [] }
  },
  climate: {
    id: "cluj",
    country: "Romania",
    county: "Cluj",
    locality: "Salicea",
    climateZone: "transilvania_deal",
    designOutdoorTemperatureC: { value: -18, unit: "C", source: "estimated", confidence: "medium", assumptions: [] },
    averageOutdoorTemperatureHeatingSeasonC: { value: 3, unit: "C", source: "estimated", confidence: "medium", assumptions: [] },
    indoorSetpointHeatingC: { value: 20, unit: "C", source: "internal_estimate", confidence: "medium", assumptions: ["Setpoint implicit locuire."] },
    heatingDegreeDays: { value: 3400, unit: "Kday", source: "estimated", confidence: "medium", assumptions: [] },
    coolingDegreeDays: { value: 140, unit: "Kday", source: "estimated", confidence: "low", assumptions: [] },
    source: "estimated",
    confidence: "medium"
  },
  thermalZones: [
    {
      id: "heated_main",
      name: "Zona incalzita principala",
      type: "conditioned",
      areaM2: 64.8,
      volumeM3: 162,
      heatingSetpointC: 20,
      coolingSetpointC: 26
    }
  ],
  unconditionedZones: [
    {
      id: "attic",
      name: "Pod neincalzit",
      type: "attic",
      areaM2: 64.8,
      volumeM3: 70,
      estimatedTemperatureC: 8,
      adjacentExteriorElements: ["roof_external"]
    }
  ],
  envelope: [
    {
      id: "external_walls",
      name: "Pereti exteriori",
      type: "external_wall",
      areaM2: 68.7,
      fromZoneId: "heated_main",
      to: { type: "exterior" },
      boundary: "exterior",
      orientation: "unknown",
      tiltDeg: 90,
      layers: [
        { materialId: "plaster", thicknessM: 0.02 },
        { materialId: "solid_brick", thicknessM: 0.3 },
        { materialId: "eps", thicknessM: 0.05 },
        { materialId: "plaster", thicknessM: 0.02 }
      ],
      thermalBridges: [
        {
          id: "wall_corners",
          type: "wall_corner",
          lengthM: 10,
          psiWPerMK: 0.08,
          source: "internal_estimate",
          confidence: "low",
          severity: "medium"
        }
      ]
    },
    {
      id: "ceiling_to_attic",
      name: "Planseu catre pod",
      type: "ceiling_to_attic",
      areaM2: 64.8,
      fromZoneId: "heated_main",
      to: { type: "unconditioned_zone", zoneId: "attic" },
      boundary: "unconditioned_attic",
      orientation: "horizontal",
      tiltDeg: 0,
      layers: [
        { materialId: "wood", thicknessM: 0.025 },
        { materialId: "mineral_wool", thicknessM: 0.06 }
      ],
      thermalBridges: [
        {
          id: "wall_roof_junction",
          type: "wall_roof_junction",
          lengthM: 32,
          psiWPerMK: 0.12,
          source: "internal_estimate",
          confidence: "low",
          severity: "medium"
        }
      ]
    },
    {
      id: "roof_external",
      name: "Invelitoare pod catre exterior",
      type: "roof",
      areaM2: 78,
      fromZoneId: "attic",
      to: { type: "exterior" },
      boundary: "exterior",
      orientation: "horizontal",
      tiltDeg: 35,
      layers: [
        { materialId: "wood", thicknessM: 0.025 }
      ]
    },
    {
      id: "floor_on_ground",
      name: "Pardoseala pe sol",
      type: "floor_on_ground",
      areaM2: 64.8,
      fromZoneId: "heated_main",
      to: { type: "ground" },
      boundary: "ground",
      orientation: "horizontal",
      tiltDeg: 0,
      layers: [
        { materialId: "concrete", thicknessM: 0.12 },
        { materialId: "soil_equivalent", thicknessM: 1 }
      ],
      thermalBridges: [
        {
          id: "foundation_bridge",
          type: "foundation",
          lengthM: 32,
          psiWPerMK: 0.25,
          source: "internal_estimate",
          confidence: "low",
          severity: "medium"
        }
      ]
    },
    {
      id: "windows",
      name: "Ferestre termopan vechi",
      type: "window",
      areaM2: 9.8,
      fromZoneId: "heated_main",
      to: { type: "exterior" },
      boundary: "exterior",
      orientation: "unknown",
      tiltDeg: 90,
      windowSystemId: "double_old",
      thermalBridges: [
        {
          id: "window_reveals",
          type: "window_reveal",
          lengthM: 18,
          psiWPerMK: 0.12,
          source: "internal_estimate",
          confidence: "low",
          severity: "medium"
        }
      ]
    },
    {
      id: "external_door",
      name: "Usa exterioara",
      type: "external_door",
      areaM2: 2.2,
      fromZoneId: "heated_main",
      to: { type: "exterior" },
      boundary: "exterior",
      orientation: "unknown",
      tiltDeg: 90,
      layers: [
        { materialId: "wood", thicknessM: 0.05 }
      ]
    }
  ],
  thermalBridges: [],
  ventilation: {
    type: "natural",
    ventilationType: "natural",
    airChangeRateACH: { value: 0.8, unit: "1/h", source: "internal_estimate", confidence: "low", assumptions: ["Ventilatie naturala estimativa."] },
    airChangeRateACHValue: 0.8,
    infiltrationLevel: "average",
    source: "internal_estimate"
  },
  heatingSystem: {
    id: "wood_stove_old",
    fuel: "wood",
    generatorType: "wood_stove",
    distributionType: "local",
    controlType: "manual"
  },
  domesticHotWater: {
    source: "same_as_heating",
    fuel: "wood",
    seasonalEfficiency: { value: 0.55, unit: "-", source: "internal_estimate", confidence: "low", assumptions: [] }
  },
  renewables: {
    photovoltaic: { installed: false },
    solarThermal: { installed: false }
  }
};
