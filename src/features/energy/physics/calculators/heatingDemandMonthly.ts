import type { ClimateYear } from "../model/MonthlyClimate";
import type { MonthlyInternalGains, MonthlySolarGains } from "../model/Gains";
import type { MonthlyHeatBalance } from "../model/HeatBalance";
import { calculateMonthlyHeatBalance, calculateMonthlyHeatLoss } from "./heatBalance";

export function calculateMonthlyHeatingDemand({
  climate,
  hTransmissionWPerK,
  hVentilationWPerK,
  indoorTemperatureC,
  internalGains,
  solarGains
}: {
  climate: ClimateYear;
  hTransmissionWPerK: number;
  hVentilationWPerK: number;
  indoorTemperatureC: number;
  internalGains: MonthlyInternalGains[];
  solarGains: MonthlySolarGains[];
}): MonthlyHeatBalance[] {
  return climate.months.map(month => {
    const losses = calculateMonthlyHeatLoss({
      hTransmissionWPerK,
      hVentilationWPerK,
      indoorTemperatureC,
      outdoorTemperatureC: month.averageOutdoorTemperatureC,
      month: month.month
    });
    const internal = internalGains.find(item => item.month === month.month)?.totalInternalGainsKwh || 0;
    const solar = solarGains.find(item => item.month === month.month)?.totalSolarGainsKwh || 0;
    return calculateMonthlyHeatBalance({
      month: month.month,
      transmissionLossKwh: losses.transmissionLossKwh,
      ventilationLossKwh: losses.ventilationLossKwh,
      internalGainsKwh: internal,
      solarGainsKwh: solar,
      thermalMassClass: "medium"
    });
  });
}
