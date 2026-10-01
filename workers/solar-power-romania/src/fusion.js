import { MODEL_REGISTRY, forecastBlock } from './provider.js';
import { buildForecastSeries, clamp } from './solar.js';

export const DEFAULT_WEIGHTS = Object.freeze({
  ecmwf_ifs: 0.25,
  ecmwf_aifs: 0.25,
  icon_eu: 0.25,
  gfs: 0.25,
});

export const LEARNING_HORIZONS_MIN = Object.freeze([15, 30, 45, 60, 120, 180, 360, 720, 1380, 1440, 2160, 2880]);

function normalizeWeights(weights, availableKeys) {
  const filtered = Object.fromEntries(availableKeys.map((key) => [key, Math.max(0, Number(weights?.[key]) || 0)]));
  let total = Object.values(filtered).reduce((sum, value) => sum + value, 0);
  if (!total) {
    const equal = availableKeys.length ? 1 / availableKeys.length : 0;
    return Object.fromEntries(availableKeys.map((key) => [key, equal]));
  }
  return Object.fromEntries(Object.entries(filtered).map(([key, value]) => [key, value / total]));
}

function nearestLearningHorizon(minutes) {
  let best = LEARNING_HORIZONS_MIN[0];
  let distance = Number.POSITIVE_INFINITY;
  for (const value of LEARNING_HORIZONS_MIN) {
    const d = Math.abs(value - minutes);
    if (d < distance) { best = value; distance = d; }
  }
  return best;
}

export function weightsFromBenchmark(benchmark, horizonMinutes = 180) {
  const keys = Object.keys(MODEL_REGISTRY);
  const horizon = benchmark?.horizons?.[String(horizonMinutes)] || {};
  const eligible = keys.filter((key) => Number(horizon[key]?.count || 0) >= 24 && Number.isFinite(Number(horizon[key]?.mae_wm2)));
  if (eligible.length < 2) return { weights: DEFAULT_WEIGHTS, source: 'equal_untrained', sample_floor: 24, horizon_minutes: horizonMinutes };

  const raw = {};
  for (const key of keys) {
    const metric = horizon[key];
    if (!metric || metric.count < 24) raw[key] = 0;
    else raw[key] = 1 / Math.max(5, metric.mae_wm2);
  }
  return { weights: normalizeWeights(raw, keys), source: 'satellite_skill_inverse_mae', sample_floor: 24, horizon_minutes: horizonMinutes };
}

function seriesMap(payload, capacityMwp) {
  const block = forecastBlock(payload?.data);
  if (!block?.time?.length) return null;
  const series = buildForecastSeries(block, capacityMwp);
  return new Map(series.map((point) => [point.time, point]));
}

export function fuseForecasts(modelPayloads, capacityMwp, benchmark, issuedAtMs = Date.now()) {
  const maps = {};
  for (const [key, payload] of Object.entries(modelPayloads)) {
    const map = seriesMap(payload, capacityMwp);
    if (map) maps[key] = map;
  }
  const available = Object.keys(maps);
  if (!available.length) throw new Error('No forecast models available.');

  const timeSet = new Set();
  for (const map of Object.values(maps)) for (const time of map.keys()) timeSet.add(time);
  const times = [...timeSet].sort((a, b) => Date.parse(`${a}Z`) - Date.parse(`${b}Z`));
  let learnedPoints = 0;

  const fused = times.map((time) => {
    const validMs = Date.parse(String(time).endsWith('Z') ? time : `${time}Z`);
    const horizonMinutes = Math.max(0, Math.round((validMs - issuedAtMs) / 60000));
    const learningHorizon = nearestLearningHorizon(horizonMinutes);
    const learned = weightsFromBenchmark(benchmark, learningHorizon);
    if (learned.source !== 'equal_untrained') learnedPoints += 1;
    const weights = normalizeWeights(learned.weights, available);
    const members = [];
    for (const key of available) {
      const point = maps[key].get(time);
      if (!point) continue;
      members.push({ key, weight: weights[key] || 0, ...point });
    }
    const weightSum = members.reduce((sum, p) => sum + p.weight, 0) || 1;
    const mean = (field) => members.reduce((sum, p) => sum + p.weight * Number(p[field] || 0), 0) / weightSum;
    const power = mean('power_mw');
    const variance = members.reduce((sum, p) => sum + (p.weight / weightSum) * ((p.power_mw - power) ** 2), 0);
    const spreadMw = Math.sqrt(Math.max(0, variance));
    const spreadPct = power > 0.01 ? clamp((spreadMw / power) * 100, 0, 100) : 0;
    return {
      time,
      horizon_minutes: horizonMinutes,
      learning_horizon_minutes: learningHorizon,
      power_mw: power,
      gti_wm2: mean('gti_wm2'),
      ghi_wm2: mean('ghi_wm2'),
      dni_wm2: mean('dni_wm2'),
      cloud_pct: mean('cloud_pct'),
      air_temp_c: mean('air_temp_c'),
      model_spread_mw: spreadMw,
      model_spread_pct: spreadPct,
      weights,
      members: Object.fromEntries(members.map((p) => [p.key, { power_mw: p.power_mw, gti_wm2: p.gti_wm2, weight: p.weight }])),
    };
  });

  const reference = weightsFromBenchmark(benchmark, 180);
  return {
    series: fused,
    seriesByModel: Object.fromEntries(Object.entries(maps).map(([key, map]) => [key, [...map.values()]])),
    weights: normalizeWeights(reference.weights, available),
    weightSource: learnedPoints ? 'dynamic_horizon_skill' : 'equal_untrained',
    availableModels: available,
    unavailableModels: Object.keys(MODEL_REGISTRY).filter((key) => !available.includes(key)),
    gridMinutes: 15,
  };
}
