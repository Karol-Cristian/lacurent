import { MODEL_REGISTRY } from './provider.js';
import { buildForecastSeries, clamp } from './solar.js';

export const DEFAULT_WEIGHTS = Object.freeze({
  ecmwf_ifs: 0.25,
  ecmwf_aifs: 0.25,
  icon_eu: 0.25,
  gfs: 0.25,
});

function normalizeWeights(weights, availableKeys) {
  const filtered = Object.fromEntries(availableKeys.map((key) => [key, Math.max(0, Number(weights?.[key]) || 0)]));
  let total = Object.values(filtered).reduce((sum, value) => sum + value, 0);
  if (!total) {
    const equal = availableKeys.length ? 1 / availableKeys.length : 0;
    return Object.fromEntries(availableKeys.map((key) => [key, equal]));
  }
  return Object.fromEntries(Object.entries(filtered).map(([key, value]) => [key, value / total]));
}

export function weightsFromBenchmark(benchmark) {
  const keys = Object.keys(MODEL_REGISTRY);
  const horizon = benchmark?.horizons?.['3'] || {};
  const eligible = keys.filter((key) => Number(horizon[key]?.count || 0) >= 24 && Number.isFinite(Number(horizon[key]?.mae_wm2)));
  if (eligible.length < 2) return { weights: DEFAULT_WEIGHTS, source: 'equal_untrained', sample_floor: 24 };

  const raw = {};
  for (const key of keys) {
    const metric = horizon[key];
    if (!metric || metric.count < 24) raw[key] = 0;
    else raw[key] = 1 / Math.max(5, metric.mae_wm2);
  }
  return { weights: normalizeWeights(raw, keys), source: 'satellite_skill_inverse_mae', sample_floor: 24 };
}

export function fuseForecasts(modelPayloads, capacityMwp, benchmark) {
  const seriesByModel = {};
  for (const [key, payload] of Object.entries(modelPayloads)) {
    if (!payload?.data?.hourly) continue;
    seriesByModel[key] = buildForecastSeries(payload.data.hourly, capacityMwp);
  }
  const available = Object.keys(seriesByModel);
  if (!available.length) throw new Error('No forecast models available.');

  const learned = weightsFromBenchmark(benchmark);
  const weights = normalizeWeights(learned.weights, available);
  const times = seriesByModel[available[0]].map((p) => p.time);
  const fused = times.map((time, i) => {
    const members = [];
    for (const key of available) {
      const point = seriesByModel[key][i];
      if (!point || point.time !== time) continue;
      members.push({ key, weight: weights[key] || 0, ...point });
    }
    const wsum = members.reduce((s, p) => s + p.weight, 0) || 1;
    const mean = (field) => members.reduce((s, p) => s + p.weight * Number(p[field] || 0), 0) / wsum;
    const power = mean('power_mw');
    const gti = mean('gti_wm2');
    const variance = members.reduce((s, p) => s + (p.weight / wsum) * ((p.power_mw - power) ** 2), 0);
    const spreadMw = Math.sqrt(Math.max(0, variance));
    const spreadPct = power > 0.01 ? clamp((spreadMw / power) * 100, 0, 100) : 0;
    return {
      time,
      power_mw: power,
      gti_wm2: gti,
      ghi_wm2: mean('ghi_wm2'),
      dni_wm2: mean('dni_wm2'),
      cloud_pct: mean('cloud_pct'),
      air_temp_c: mean('air_temp_c'),
      model_spread_mw: spreadMw,
      model_spread_pct: spreadPct,
      members: Object.fromEntries(members.map((p) => [p.key, { power_mw: p.power_mw, gti_wm2: p.gti_wm2 }])),
    };
  });

  return {
    series: fused,
    seriesByModel,
    weights,
    weightSource: learned.source,
    availableModels: available,
    unavailableModels: Object.keys(MODEL_REGISTRY).filter((key) => !available.includes(key)),
  };
}
