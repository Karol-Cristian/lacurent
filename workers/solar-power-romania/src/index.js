import { isRomaniaCoordinate, summarizeForecast } from './solar.js';
import { fetchAllModelForecasts, MODEL_REGISTRY, fetchMultiPointModelForecast, forecastBlock } from './provider.js';
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
  const value = String(time);
  return Date.parse(value.endsWith('Z') ? value : `${value}Z`);
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

  const issuedAtMs = Date.now();
  const [models, benchmark] = await Promise.all([
    fetchAllModelForecasts({ lat, lon, tilt, azimuth, forecastQuarterHours: 193 }),
    benchmarkOrEmpty(env),
  ]);
  const fused = fuseForecasts(models, capacityMwp, benchmark, issuedAtMs);
  const summary = summarizeForecast(fused.series, new Date(issuedAtMs));
  const currentIndex = nearestIndex(fused.series.map((p) => p.time), issuedAtMs);

  const currentMembers = {};
  for (const [modelKey, member] of Object.entries(summary.current?.members || {})) {
    currentMembers[modelKey] = {
      label: MODEL_REGISTRY[modelKey]?.label || modelKey,
      power_mw: member.power_mw,
      gti_wm2: member.gti_wm2,
      weight: member.weight,
    };
  }

  return json({
    meta: {
      product: 'Solar Power / Romania',
      version: '0.3.0',
      engine: 'SolarPower 15-minute fusion',
      generated_at: new Date(issuedAtMs).toISOString(),
      timezone: 'UTC',
      grid_minutes: fused.gridMinutes,
      weight_source: fused.weightSource,
      assumptions: '15-minute forecast grid. NWP sources may be interpolated from native hourly/coarser resolution; satellite truth remains native before benchmark resampling. MWp DC, 14% system loss, temperature correction, 0.95 AC/DC clipping.',
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
      return await fetchMultiPointModelForecast(modelKey, ROMANIA_REFERENCE_CELLS, { tilt, azimuth, forecastQuarterHours: 8 });
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
      const block = forecastBlock(row);
      const times = block?.time || [];
      const k = nearestIndex(times, nowMs);
      return {
        gti: Number(block?.global_tilted_irradiance?.[k] || 0),
        ghi: Number(block?.shortwave_radiation?.[k] || 0),
        dni: Number(block?.direct_normal_irradiance?.[k] || 0),
        cloud: Number(block?.cloud_cover?.[k] || 0),
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
      grid_minutes: 15,
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
      resolution_minutes: 15,
      truth: metrics.truth_source || 'satellite adapter pending first successful cycle',
      scoring: 'daylight GTI only; MAE/RMSE/bias by model and requested forecast horizon',
      audit: 'full 48-hour model curves are stored in the isolated ForecastArchive on every 15-minute run; R2 mirroring can be enabled later without changing the API',
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
      if (url.pathname === '/health') return json({ status: 'ok', service: 'lacurent-solar-romania', version: '0.3.0', resolution_minutes: 15 });
      if (url.pathname === '/api/v1/models') return json({
        product: 'Solar Power / Romania',
        version: '0.3.0',
        engine: '15-minute multi-model fusion',
        models: MODEL_REGISTRY,
        architecture: ['15-minute forecast grid', 'multi-model provider adapters', 'irradiance normalization', 'PV conversion', 'horizon-aware fusion weights', 'asset forecast', 'Romania spatial field', 'immutable forecast curves in ForecastArchive', 'Durable Object benchmark metrics', 'native satellite truth'],
        benchmark_status: 'continuous 15-minute benchmark enabled; weights remain equal until sufficient scored samples exist',
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
