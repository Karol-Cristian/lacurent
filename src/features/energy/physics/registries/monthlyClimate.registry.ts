import type { ClimateYear } from "../model/MonthlyClimate";

export const MONTHLY_CLIMATE_REGISTRY: Record<string, ClimateYear> = {
  cluj: {
    climateZoneId: "cluj",
    locationName: "Cluj / Salicea",
    source: "internal_estimate",
    confidence: "medium",
    months: [
      { month: 1, averageOutdoorTemperatureC: -2, heatingDegreeDays: 682, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 42, south: 62, east: 28, west: 28, north: 14 } },
      { month: 2, averageOutdoorTemperatureC: 0, heatingDegreeDays: 560, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 62, south: 82, east: 42, west: 42, north: 20 } },
      { month: 3, averageOutdoorTemperatureC: 5, heatingDegreeDays: 465, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 100, south: 112, east: 72, west: 72, north: 34 } },
      { month: 4, averageOutdoorTemperatureC: 10, heatingDegreeDays: 300, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 132, south: 122, east: 98, west: 98, north: 48 } },
      { month: 5, averageOutdoorTemperatureC: 15, heatingDegreeDays: 155, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 160, south: 128, east: 118, west: 118, north: 62 } },
      { month: 6, averageOutdoorTemperatureC: 18, heatingDegreeDays: 60, coolingDegreeDays: 10, solarRadiationKwhM2: { horizontal: 170, south: 124, east: 126, west: 126, north: 70 } },
      { month: 7, averageOutdoorTemperatureC: 20, heatingDegreeDays: 0, coolingDegreeDays: 35, solarRadiationKwhM2: { horizontal: 178, south: 130, east: 132, west: 132, north: 72 } },
      { month: 8, averageOutdoorTemperatureC: 20, heatingDegreeDays: 0, coolingDegreeDays: 35, solarRadiationKwhM2: { horizontal: 158, south: 122, east: 118, west: 118, north: 62 } },
      { month: 9, averageOutdoorTemperatureC: 16, heatingDegreeDays: 120, coolingDegreeDays: 5, solarRadiationKwhM2: { horizontal: 118, south: 112, east: 84, west: 84, north: 42 } },
      { month: 10, averageOutdoorTemperatureC: 10, heatingDegreeDays: 310, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 78, south: 92, east: 54, west: 54, north: 26 } },
      { month: 11, averageOutdoorTemperatureC: 4, heatingDegreeDays: 480, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 42, south: 62, east: 28, west: 28, north: 14 } },
      { month: 12, averageOutdoorTemperatureC: -1, heatingDegreeDays: 651, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 32, south: 52, east: 20, west: 20, north: 10 } }
    ]
  },
  ro_default: {
    climateZoneId: "ro_default",
    locationName: "Romania default",
    source: "internal_estimate",
    confidence: "low",
    months: [
      { month: 1, averageOutdoorTemperatureC: 0, heatingDegreeDays: 620, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 45, south: 60, east: 30, west: 30, north: 15 } },
      { month: 2, averageOutdoorTemperatureC: 2, heatingDegreeDays: 504, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 65, south: 80, east: 44, west: 44, north: 22 } },
      { month: 3, averageOutdoorTemperatureC: 7, heatingDegreeDays: 403, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 105, south: 112, east: 74, west: 74, north: 36 } },
      { month: 4, averageOutdoorTemperatureC: 12, heatingDegreeDays: 240, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 135, south: 122, east: 100, west: 100, north: 50 } },
      { month: 5, averageOutdoorTemperatureC: 17, heatingDegreeDays: 93, coolingDegreeDays: 5, solarRadiationKwhM2: { horizontal: 165, south: 130, east: 120, west: 120, north: 64 } },
      { month: 6, averageOutdoorTemperatureC: 21, heatingDegreeDays: 0, coolingDegreeDays: 50, solarRadiationKwhM2: { horizontal: 175, south: 125, east: 128, west: 128, north: 72 } },
      { month: 7, averageOutdoorTemperatureC: 23, heatingDegreeDays: 0, coolingDegreeDays: 95, solarRadiationKwhM2: { horizontal: 182, south: 132, east: 134, west: 134, north: 74 } },
      { month: 8, averageOutdoorTemperatureC: 23, heatingDegreeDays: 0, coolingDegreeDays: 95, solarRadiationKwhM2: { horizontal: 160, south: 124, east: 120, west: 120, north: 64 } },
      { month: 9, averageOutdoorTemperatureC: 18, heatingDegreeDays: 60, coolingDegreeDays: 20, solarRadiationKwhM2: { horizontal: 120, south: 112, east: 86, west: 86, north: 44 } },
      { month: 10, averageOutdoorTemperatureC: 12, heatingDegreeDays: 248, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 80, south: 92, east: 55, west: 55, north: 28 } },
      { month: 11, averageOutdoorTemperatureC: 6, heatingDegreeDays: 420, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 45, south: 62, east: 30, west: 30, north: 15 } },
      { month: 12, averageOutdoorTemperatureC: 1, heatingDegreeDays: 589, coolingDegreeDays: 0, solarRadiationKwhM2: { horizontal: 35, south: 52, east: 22, west: 22, north: 12 } }
    ]
  }
};
