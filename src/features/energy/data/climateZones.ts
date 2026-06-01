export const climateZones = {
  cluj: {
    climateZone: "transilvania_deal",
    designOutdoorTemperatureC: -18,
    heatingDegreeDays: 3400,
    coolingDegreeDays: 140,
    averageAnnualTemperatureC: 9,
    confidence: "medium"
  },
  bucuresti: {
    climateZone: "campie_sud",
    designOutdoorTemperatureC: -15,
    heatingDegreeDays: 2850,
    coolingDegreeDays: 320,
    averageAnnualTemperatureC: 11.5,
    confidence: "medium"
  },
  romania_default: {
    climateZone: "romania_default",
    designOutdoorTemperatureC: -15,
    heatingDegreeDays: 3200,
    coolingDegreeDays: 180,
    averageAnnualTemperatureC: 10,
    confidence: "low"
  }
} as const;
