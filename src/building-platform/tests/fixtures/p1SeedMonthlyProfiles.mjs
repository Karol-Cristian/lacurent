const MONTHS = Object.freeze([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
]);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

const P1_REGRESSION_MONTHLY_PROFILES = Object.freeze(MONTHS.map((month, index) => {
  const oddMonth = index % 2 === 1 && month !== "september";
  const gains = month === "september"
    ? { internalGains: 1500, solarGains: 1500 }
    : oddMonth
      ? { internalGains: 100, solarGains: 160 }
      : { internalGains: 120, solarGains: 180 };
  return Object.freeze({
    month,
    heatingIndoorTemperatureC: 20,
    heatingOutdoorTemperatureC: 0,
    coolingIndoorTemperatureC: 24,
    coolingOutdoorTemperatureC: 30,
    durationHours: 720,
    ventilationAirHeatCapacityJPerM3K: 1200,
    ventilationAirFlowRateM3PerS: 0.016666666666666666,
    internalGainsKwh: gains.internalGains,
    solarGainsKwh: gains.solarGains
  });
}));

export function createP1SeedMonthlyProfiles() {
  return deepClone(P1_REGRESSION_MONTHLY_PROFILES);
}
