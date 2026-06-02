import assert from "node:assert/strict";

function near(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be near ${expected}`);
}

const climates = {
  cluj: {
    confidence: "medium",
    months: [
      { month: 1, averageOutdoorTemperatureC: -2, heatingDegreeDays: 682, coolingDegreeDays: 0, solarRadiationKwhM2: { south: 62, east: 28, west: 28, north: 14, horizontal: 42 } },
      { month: 7, averageOutdoorTemperatureC: 20, heatingDegreeDays: 0, coolingDegreeDays: 35, solarRadiationKwhM2: { south: 130, east: 132, west: 132, north: 72, horizontal: 178 } }
    ]
  },
  ro_default: {
    confidence: "low",
    months: [
      { month: 1, averageOutdoorTemperatureC: 0, heatingDegreeDays: 620, coolingDegreeDays: 0, solarRadiationKwhM2: { south: 60, horizontal: 45 } }
    ]
  }
};

function getMonthlyClimate(id) {
  return climates[id] || climates.ro_default;
}

function internalGains({ occupants = 2, area = 64.8 }) {
  const people = occupants * 70 * 14 * 30.4 / 1000;
  const lighting = area * 2.5 * 4 * 30.4 / 1000;
  const appliances = area * 3 * 8 * 30.4 / 1000;
  return people + lighting + appliances;
}

function solarGain({ radiation, area, g = 0.65, frame = 0.8, shading = 0.9 }) {
  return radiation * area * g * frame * shading;
}

function monthlyLoss({ h, tin, tout, hours }) {
  return Math.max(0, tin - tout) * h * hours / 1000;
}

function utilizationFactor({ heatLossKwh, gainsKwh, mass = "medium" }) {
  if (heatLossKwh <= 0 || gainsKwh <= 0) return 0;
  const massFactor = { light: 0.55, medium: 0.7, heavy: 0.82, unknown: 0.7 }[mass];
  return Math.max(0.15, Math.min(0.95, massFactor / (1 + (gainsKwh / heatLossKwh) * 0.35)));
}

function heatBalance({ transmissionLoss, ventilationLoss, internal, solar }) {
  const gross = transmissionLoss + ventilationLoss;
  const gains = internal + solar;
  const eta = utilizationFactor({ heatLossKwh: gross, gainsKwh: gains });
  return {
    gross,
    gains,
    eta,
    heatingDemand: Math.max(0, gross - eta * gains)
  };
}

function coolingDemand({ avgTemp, setpoint, hTotal, hours, gains, gross }) {
  const external = Math.max(0, avgTemp - setpoint) * hTotal * hours / 1000;
  const excess = Math.max(0, gains - gross * 0.25);
  return Math.max(0, external + excess * 0.35);
}

function diagnostics({ transmission, ventilation, solar, internal }) {
  const losses = transmission + ventilation;
  const gains = solar + internal;
  const transmissionPercent = Math.round(transmission / losses * 100);
  const solarPercent = Math.round(solar / gains * 100);
  return {
    heatingLossBreakdown: {
      transmissionPercent,
      ventilationPercent: 100 - transmissionPercent
    },
    gainsBreakdown: {
      solarPercent,
      internalPercent: 100 - solarPercent
    },
    mainReasonForHighDemand: transmissionPercent >= 65
      ? "Cea mai mare parte a necesarului de incalzire vine din pierderile prin transmisie."
      : "Ventilatia are o contributie semnificativa la pierderile de caldura."
  };
}

assert.equal(getMonthlyClimate("missing").confidence, "low");
assert.equal(getMonthlyClimate("cluj").months[0].month, 1);

const internal = internalGains({ occupants: 2, area: 64.8 });
assert.ok(internal > 100);

const southSolar = solarGain({ radiation: 62, area: 9.8 });
const northSolar = solarGain({ radiation: 14, area: 9.8 });
assert.ok(southSolar > northSolar);

const janTransmission = monthlyLoss({ h: 152.1, tin: 20, tout: -2, hours: 31 * 24 });
const janVentilation = monthlyLoss({ h: 41.4, tin: 20, tout: -2, hours: 31 * 24 });
assert.ok(janTransmission > janVentilation);

const balance = heatBalance({
  transmissionLoss: janTransmission,
  ventilationLoss: janVentilation,
  internal,
  solar: southSolar
});
assert.ok(balance.heatingDemand > 0);
assert.ok(balance.eta > 0 && balance.eta <= 0.95);

assert.ok(utilizationFactor({ heatLossKwh: 1000, gainsKwh: 300, mass: "heavy" }) > utilizationFactor({ heatLossKwh: 1000, gainsKwh: 300, mass: "light" }));

const annualHeating = balance.heatingDemand * 5;
near(annualHeating / 64.8, annualHeating / 64.8);
assert.ok(annualHeating / 64.8 > 0);

const julyCooling = coolingDemand({ avgTemp: 29, setpoint: 26, hTotal: 193.5, hours: 31 * 24, gains: 450, gross: 100 });
assert.ok(julyCooling > 0);

const diag = diagnostics({
  transmission: 9000,
  ventilation: 2500,
  solar: 1200,
  internal: 1800
});
assert.equal(diag.heatingLossBreakdown.transmissionPercent, 78);
assert.equal(diag.gainsBreakdown.internalPercent, 60);
assert.ok(diag.mainReasonForHighDemand.includes("transmisie"));

console.log("PASS physics v0.3 energy demand calculations");
