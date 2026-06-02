import type { EnergyDemandResult } from "../model/EnergyDemand";
import type { MonthlyHeatBalance } from "../model/HeatBalance";

function sum(monthly: MonthlyHeatBalance[], key: keyof MonthlyHeatBalance): number {
  return monthly.reduce((total, item) => total + (Number(item[key]) || 0), 0);
}

export function buildAnnualEnergyDemandResult({
  monthly,
  heatedAreaM2,
  assumptions,
  confidence
}: {
  monthly: MonthlyHeatBalance[];
  heatedAreaM2: number;
  assumptions: string[];
  confidence: EnergyDemandResult["confidence"];
}): EnergyDemandResult {
  const heatingDemand = sum(monthly, "heatingDemandKwh");
  const coolingDemand = sum(monthly, "coolingDemandKwh");
  const transmission = sum(monthly, "transmissionLossKwh");
  const ventilation = sum(monthly, "ventilationLossKwh");
  const internal = sum(monthly, "internalGainsKwh");
  const solar = sum(monthly, "solarGainsKwh");
  const highestHeating = [...monthly].sort((a, b) => b.heatingDemandKwh - a.heatingDemandKwh)[0];
  const highestCooling = [...monthly].sort((a, b) => (b.coolingDemandKwh || 0) - (a.coolingDemandKwh || 0))[0];
  const transmissionPercent = Math.round((transmission / Math.max(1, transmission + ventilation)) * 100);
  const solarPercent = Math.round((solar / Math.max(1, solar + internal)) * 100);
  return {
    monthly,
    annual: {
      heatingDemandKwhYear: heatingDemand,
      heatingDemandKwhM2Year: heatingDemand / heatedAreaM2,
      coolingDemandKwhYear: coolingDemand,
      coolingDemandKwhM2Year: coolingDemand / heatedAreaM2,
      totalInternalGainsKwhYear: internal,
      totalSolarGainsKwhYear: solar,
      totalTransmissionLossKwhYear: transmission,
      totalVentilationLossKwhYear: ventilation
    },
    peakIndicators: {
      coldestMonth: highestHeating?.month || 1,
      highestHeatingDemandMonth: highestHeating?.month || 1,
      highestCoolingDemandMonth: highestCooling?.coolingDemandKwh ? highestCooling.month : undefined
    },
    diagnostics: {
      heatingLossBreakdown: {
        transmissionPercent,
        ventilationPercent: 100 - transmissionPercent
      },
      gainsBreakdown: {
        solarPercent,
        internalPercent: 100 - solarPercent
      },
      monthlyPattern: `Cel mai mare necesar de incalzire apare in luna ${highestHeating?.month || 1}.`,
      mainReasonForHighDemand: transmissionPercent >= 65
        ? "Cea mai mare parte a necesarului de incalzire vine din pierderile prin transmisie."
        : "Ventilatia are o contributie semnificativa la pierderile de caldura."
    },
    unit: "kWh",
    source: "internal_estimate",
    assumptions,
    confidence
  };
}
