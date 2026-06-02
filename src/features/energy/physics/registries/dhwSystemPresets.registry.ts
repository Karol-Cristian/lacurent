import type { DhwSystemV04 } from "../model/DhwSystem";

export const DHW_SYSTEM_PRESETS: Record<string, DhwSystemV04> = {
  same_as_heating: {
    heatSource: "same_as_heating",
    fuelCarrier: "unknown",
    dailyHotWaterLitersPerPerson: 45,
    coldWaterTemperatureC: 10,
    hotWaterTemperatureC: 55,
    distributionEfficiency: 0.92,
    storageEfficiency: 1,
    generationEfficiency: 0.85,
    source: "registry_default",
    confidence: "low",
    assumptions: ["ACM foloseste sistemul de incalzire; carrierul poate fi suprascris din incalzire."]
  },
  electric_boiler: {
    heatSource: "electric_boiler",
    fuelCarrier: "electricity",
    dailyHotWaterLitersPerPerson: 45,
    coldWaterTemperatureC: 10,
    hotWaterTemperatureC: 55,
    distributionEfficiency: 0.9,
    storageEfficiency: 0.88,
    generationEfficiency: 0.98,
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["Boiler electric cu pierderi de stocare estimate."]
  },
  gas_boiler: {
    heatSource: "gas_boiler",
    fuelCarrier: "natural_gas",
    dailyHotWaterLitersPerPerson: 45,
    coldWaterTemperatureC: 10,
    hotWaterTemperatureC: 55,
    distributionEfficiency: 0.9,
    storageEfficiency: 0.95,
    generationEfficiency: 0.88,
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["ACM prin centrala gaz cu randament estimativ."]
  },
  heat_pump_water_heater: {
    heatSource: "heat_pump_water_heater",
    fuelCarrier: "electricity",
    dailyHotWaterLitersPerPerson: 45,
    coldWaterTemperatureC: 10,
    hotWaterTemperatureC: 55,
    distributionEfficiency: 0.92,
    storageEfficiency: 0.9,
    generationEfficiency: 2.4,
    source: "internal_estimate",
    confidence: "low",
    assumptions: ["ACM cu pompa de caldura dedicata, COP estimativ."]
  }
};
