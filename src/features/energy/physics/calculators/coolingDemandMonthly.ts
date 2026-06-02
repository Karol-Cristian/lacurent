import type { ClimateYear } from "../model/MonthlyClimate";
import type { MonthlyHeatBalance } from "../model/HeatBalance";
import { hoursInMonth } from "./monthlyClimate";

export function calculateMonthlyCoolingDemand({
  climate,
  balances,
  coolingSetpointC = 26,
  hTotalWPerK
}: {
  climate: ClimateYear;
  balances: MonthlyHeatBalance[];
  coolingSetpointC?: number;
  hTotalWPerK: number;
}): MonthlyHeatBalance[] {
  return balances.map(balance => {
    const month = climate.months.find(item => item.month === balance.month);
    if (!month) return balance;
    const externalHeatLoadApprox = Math.max(0, month.averageOutdoorTemperatureC - coolingSetpointC) * hTotalWPerK * hoursInMonth(month.month) / 1000;
    const excessGains = Math.max(0, balance.totalGainsKwh - balance.grossHeatLossKwh * 0.25);
    return {
      ...balance,
      coolingDemandKwh: Math.max(0, externalHeatLoadApprox + excessGains * ((month.coolingDegreeDays || 0) > 0 ? 0.35 : 0.1))
    };
  });
}
