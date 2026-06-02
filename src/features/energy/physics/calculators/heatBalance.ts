import type { MonthlyHeatBalance } from "../model/HeatBalance";
import { hoursInMonth } from "./monthlyClimate";
import { calculateHeatingGainUtilizationFactor, type ThermalMassClass } from "./utilizationFactors";

export function calculateMonthlyHeatLoss({
  hTransmissionWPerK,
  hVentilationWPerK,
  indoorTemperatureC,
  outdoorTemperatureC,
  month
}: {
  hTransmissionWPerK: number;
  hVentilationWPerK: number;
  indoorTemperatureC: number;
  outdoorTemperatureC: number;
  month: number;
}) {
  const deltaT = Math.max(0, indoorTemperatureC - outdoorTemperatureC);
  const hours = hoursInMonth(month);
  return {
    transmissionLossKwh: hTransmissionWPerK * deltaT * hours / 1000,
    ventilationLossKwh: hVentilationWPerK * deltaT * hours / 1000
  };
}

export function calculateMonthlyHeatBalance({
  month,
  transmissionLossKwh,
  ventilationLossKwh,
  internalGainsKwh,
  solarGainsKwh,
  thermalMassClass
}: {
  month: number;
  transmissionLossKwh: number;
  ventilationLossKwh: number;
  internalGainsKwh: number;
  solarGainsKwh: number;
  thermalMassClass?: ThermalMassClass;
}): MonthlyHeatBalance {
  const grossHeatLossKwh = transmissionLossKwh + ventilationLossKwh;
  const totalGainsKwh = internalGainsKwh + solarGainsKwh;
  const utilizationFactor = calculateHeatingGainUtilizationFactor({
    heatLossKwh: grossHeatLossKwh,
    gainsKwh: totalGainsKwh,
    thermalMassClass
  });
  const usableGainsKwh = utilizationFactor * totalGainsKwh;
  return {
    month,
    transmissionLossKwh,
    ventilationLossKwh,
    grossHeatLossKwh,
    internalGainsKwh,
    solarGainsKwh,
    totalGainsKwh,
    utilizationFactor,
    usableGainsKwh,
    heatingDemandKwh: Math.max(0, grossHeatLossKwh - usableGainsKwh)
  };
}
