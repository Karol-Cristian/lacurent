export const DEFAULT_ASSUMPTIONS = Object.freeze({
  systemLoss: 0.14,
  temperatureCoefficient: -0.0035,
  noctDeltaAt800: 25,
  inverterAcPerDc: 0.95,
});

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function isRomaniaCoordinate(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= 43.4 && lat <= 48.6 && lon >= 20.0 && lon <= 30.0;
}

export function estimatePvAcMw({
  gtiWm2,
  airTempC,
  capacityMwp,
  assumptions = DEFAULT_ASSUMPTIONS,
}) {
  const gti = Math.max(0, Number(gtiWm2) || 0);
  const air = Number.isFinite(Number(airTempC)) ? Number(airTempC) : 25;
  const capacity = Math.max(0, Number(capacityMwp) || 0);
  if (!capacity || !gti) return 0;

  const cellTemp = air + assumptions.noctDeltaAt800 * (gti / 800);
  const tempFactor = clamp(1 + assumptions.temperatureCoefficient * (cellTemp - 25), 0.72, 1.06);
  const dcMw = capacity * (gti / 1000) * tempFactor;
  const netMw = dcMw * (1 - assumptions.systemLoss);
  return Math.min(netMw, capacity * assumptions.inverterAcPerDc);
}

export function buildForecastSeries(hourly, capacityMwp, assumptions = DEFAULT_ASSUMPTIONS) {
  const times = hourly?.time || [];
  const gti = hourly?.global_tilted_irradiance || [];
  const ghi = hourly?.shortwave_radiation || [];
  const dni = hourly?.direct_normal_irradiance || [];
  const cloud = hourly?.cloud_cover || [];
  const temp = hourly?.temperature_2m || [];

  return times.map((time, i) => ({
    time,
    gti_wm2: Number(gti[i] || 0),
    ghi_wm2: Number(ghi[i] || 0),
    dni_wm2: Number(dni[i] || 0),
    cloud_pct: Number(cloud[i] || 0),
    air_temp_c: Number(temp[i] ?? 25),
    power_mw: estimatePvAcMw({
      gtiWm2: Number(gti[i] || 0),
      airTempC: Number(temp[i] ?? 25),
      capacityMwp,
      assumptions,
    }),
  }));
}

export function summarizeForecast(series, now = new Date()) {
  if (!series?.length) {
    return { current: null, nextHour: null, todayEnergyMwh: 0, peak: null, rampMw: 0, variability: 0 };
  }

  const nowMs = now.getTime();
  let currentIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < series.length; i += 1) {
    const d = Math.abs(new Date(series[i].time).getTime() - nowMs);
    if (d < bestDistance) {
      bestDistance = d;
      currentIndex = i;
    }
  }

  const current = series[currentIndex];
  const nextHour = series[Math.min(currentIndex + 1, series.length - 1)];
  const localDay = String(current.time).slice(0, 10);
  const today = series.filter((point) => String(point.time).slice(0, 10) === localDay);
  const todayEnergyMwh = today.reduce((sum, point) => sum + point.power_mw, 0);
  const peak = today.reduce((best, point) => (!best || point.power_mw > best.power_mw ? point : best), null);
  const rampMw = nextHour ? nextHour.power_mw - current.power_mw : 0;

  let variability = 0;
  if (today.length > 1) {
    const totalDelta = today.slice(1).reduce((sum, point, i) => sum + Math.abs(point.power_mw - today[i].power_mw), 0);
    const peakMw = Math.max(...today.map((p) => p.power_mw), 0.001);
    variability = clamp((totalDelta / (peakMw * Math.max(today.length - 1, 1))) * 100, 0, 100);
  }

  return { current, nextHour, todayEnergyMwh, peak, rampMw, variability };
}

export function uncertaintyBand(powerMw, cloudPct, horizonHours) {
  const cloud = clamp(Number(cloudPct) || 0, 0, 100);
  const horizon = Math.max(0, Number(horizonHours) || 0);
  const spread = clamp(0.05 + cloud / 500 + horizon * 0.008, 0.05, 0.35);
  return {
    low_mw: Math.max(0, powerMw * (1 - spread)),
    central_mw: powerMw,
    high_mw: powerMw * (1 + spread),
    spread_pct: spread * 100,
    calibrated: false,
  };
}
