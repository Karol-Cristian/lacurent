import { isRomaniaCoordinate, summarizeForecast } from './solar.js';
import { fetchAllModelForecasts, MODEL_REGISTRY, fetchMultiPointModelForecast } from './provider.js';
import { fuseForecasts } from './fusion.js';
import { ROMANIA_REFERENCE_CELLS } from './regions.js';
import { getBenchmarkMetrics, getBenchmarkStatus, runBenchmarkCycle } from './benchmark.js';
import { renderUi } from './ui.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=60, s-maxage=120',
  'access-control-allow-origin': '*',
};

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

function num(search, key, fallback) {
  const value = search.get(key);
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function epoch(time) {
  if (!time) return NaN;
  return Date.parse(String(time).endsWith('Z') ? time : `${time}Z`);
}

function nearestIndex(times, nowMs = Date.now()) {
  let index = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < times.length; i += 1) {
    const d = Math.abs(epoch(times[i]) - nowMs);
    if (d < distance) { index = i; distance = d; }
  }
  return index;
}

async function benchmarkOrEmpty(env) {
  try {
    return await getBenchmarkMetrics(env);
  } catch {
    return { horizons: {}, truth_source: null, last_prediction_run: null, last_truth_run: null };
  }
}

async function assetForecast(url, env) {
  const lat = num(url.searchParams, 'lat', 44.4268);
  const lon = num(url.searchParams, 'lon', 26.1025);
  const capacityMwp = Math.max(0.001, num(url.searchParams, 'capacity_mwp', 10));
  const tilt = Math.max(0, Math.min(90, num(url.searchParams, 'tilt', 30)));
  const azimuth = Math.max(-180, Math.min(180, num(url.searchParams, 'azimuth', 0)));
  if (!isRomaniaCoordinate(lat, lon)) return json({ error: 'Coordinates must be inside the Romania pilot bounding box.' }, 400);

  const [models, benchmark] = await Promise.all([
    fetchAllModelForecasts({ lat, lon, tilt, azimuth, days: 3 }),
    benchmarkOrEmpty(env),
  ]);
  const fused = fuseForecasts(models, capacityMwp, benchmark);
  const summary = summarizeForecast(fused.series, new Date());
  const currentIndex = nearestIndex(fused.series.map((p) => p.time));

  const currentMembers = {};
  for (const modelKey of fused.availableModels) {
    const point = fused.seriesByModel[modelKey]?.[currentIndex];
    if (!point) continue;
    currentMembers[modelKey] = {
      label: MODEL_REGISTRY[modelKey].label,
      power_mw: point.power_mw,
      gti_wm2: point.gti_wm2,
      weight: fused.weights[modelKey],
    };
  }

  return json({
    meta: {
      product: 'Solar Power / Romania',
      version: '0.2.0',
      engine: 'SolarPower fusion',
      generated_at: new Date().toISOString(),
      timezone: 'UTC',
      weight_source: fused.weightSource,
      assumptions: 'MWp DC, 14% system loss, temperature correction, 0.95 AC/DC clipping. Model spread is not yet a calibrated probability interval.',
    },
    asset: { lat, lon, capacity_mwp: capacityMwp, tilt_deg: tilt, azimuth_deg: azimuth },
    summary: {
      ...summary,
      model_spread_mw: summary.current?.model_spread_mw || 0,
      model_spread_pct: summary.current?.model_spread_pct || 0,
      models: currentMembers,
    },
    models: {
      weights: fused.weights,
      weight_source: fused.weightSource,
      available: fused.availableModels.map((key) => MODEL_REGISTRY[key]),
      unavailable: fused.unavailableModels.map((key) => MODEL_REGISTRY[key]),
    },
    current_index: currentIndex,
    forecast: fused.series,
  });
}

async function romaniaField(url) {
  const tilt = Math.max(0, Math.min(90, num(url.searchParams, 'tilt', 30)));
  const azimuth = Math.max(-180, Math.min(180, num(url.searchParams, 'azimuth', 0)));
  const models = ['ecmwf_ifs', 'icon_eu'];
  const results = await Promise.all(models.map(async (modelKey) => {
    try {
      return await fetchMultiPointModelForecast(modelKey, ROMANIA_REFERENCE_CELLS, { tilt, azimuth, days: 1 });
    } catch {
      return null;
    }
  }));
  const available = results.filter(Boolean);
  if (!available.length) throw new Error('No spatial model available.');

  const nowMs = Date.now();
  const cells = ROMANIA_REFERENCE_CELLS.map((cell, i) => {
    const points = available.map((result) => {
      const row = result.rows[i];
      const times = row?.hourly?.time || [];
      const k = nearestIndex(times, nowMs);
      return {
        gti: Number(row?.hourly?.global_tilted_irradiance?.[k] || 0),
        ghi: Number(row?.hourly?.shortwave_radiation?.[k] || 0),
        dni: Number(row?.hourly?.direct_normal_irradiance?.[k] || 0),
        cloud: Number(row?.hourly?.cloud_cover?.[k] || 0),
        time: times[k] || null,
      };
    });
    const mean = (key) => points.reduce((s, p) => s + p[key], 0) / points.length;
    return { ...cell, gti_wm2: mean('gti'), ghi_wm2: mean('ghi'), dni_wm2: mean('dni'), cloud_pct: mean('cloud'), time: points[0]?.time || null };
  });

  const avg = cells.reduce((s, c) => s + c.gti_wm2, 0) / Math.max(1, cells.length);
  return json({
    meta: {
      engine: 'SolarPower spatial fusion',
      models: available.map((result) => result.model.label),
      generated_at: new Date().toISOString(),
      coverage: '20 reference cells for visualisation; any Romania coordinate supported by asset endpoint.',
    },
    national_reference_gti_wm2: avg,
    cells,
  });
}

async function benchmarkResponse(env) {
  const [metrics, status] = await Promise.all([getBenchmarkMetrics(env), getBenchmarkStatus(env)]);
  return json({
    meta: {
      product: 'Solar Power Benchmark',
      truth: metrics.truth_source || 'satellite adapter pending first successful cycle',
      scoring: 'daylight GTI only; MAE/RMSE/bias by model and forecast horizon',
      models: MODEL_REGISTRY,
    },
    metrics,
    cycle: status,
  }, 200, { 'cache-control': 'public, max-age=60, s-maxage=60' });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSON_HEADERS });
    try {
      if (url.pathname === '/health') return json({ status: 'ok', service: 'lacurent-solar-romania', version: '0.2.0' });
      if (url.pathname === '/api/v1/models') return json({
        product: 'Solar Power / Romania',
        version: '0.2.0',
        engine: 'multi-model fusion',
        models: MODEL_REGISTRY,
        architecture: ['multi-model provider adapters', 'irradiance normalization', 'PV conversion', 'dynamic fusion weights', 'asset forecast', 'Romania spatial field', 'continuous forecast archive', 'satellite benchmark'],
        benchmark_status: 'continuous benchmark enabled; weights remain equal until sufficient scored samples exist',
      });
      if (url.pathname === '/api/v1/pv/forecast') return await assetForecast(url, env);
      if (url.pathname === '/api/v1/romania') return await romaniaField(url);
      if (url.pathname === '/api/v1/benchmark') return await benchmarkResponse(env);
      if (url.pathname === '/api/v1/benchmark/run' && request.method === 'POST') {
        const token = request.headers.get('authorization');
        if (!env.ADMIN_TOKEN || token !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: 'unauthorized' }, 401);
        return json(await runBenchmarkCycle(env, Date.now()));
      }
      if (url.pathname === '/' || url.pathname === '/index.html') return new Response(renderUi(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' } });
      return json({ error: 'not_found' }, 404);
    } catch (error) {
      return json({ error: 'forecast_unavailable', detail: String(error?.message || error) }, 503);
    }
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runBenchmarkCycle(env, Number(controller.scheduledTime) || Date.now()));
  },
};

export { ForecastArchive } from './archive.js';
export { assetForecast, romaniaField };
