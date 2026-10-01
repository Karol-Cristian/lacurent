import { buildForecastSeries, isRomaniaCoordinate, summarizeForecast, uncertaintyBand } from './solar.js';
import { fetchPointForecast, fetchMultiPointSnapshot } from './provider.js';
import { ROMANIA_REFERENCE_CELLS } from './regions.js';
import { renderUi } from './ui.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'public, max-age=120, s-maxage=300',
  'access-control-allow-origin': '*',
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function num(search, key, fallback) {
  const value = search.get(key);
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nearestIndex(times, nowMs = Date.now()) {
  let index = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < times.length; i += 1) {
    const d = Math.abs(new Date(times[i]).getTime() - nowMs);
    if (d < distance) { index = i; distance = d; }
  }
  return index;
}

async function assetForecast(url) {
  const lat = num(url.searchParams, 'lat', 44.4268);
  const lon = num(url.searchParams, 'lon', 26.1025);
  const capacityMwp = Math.max(0.001, num(url.searchParams, 'capacity_mwp', 10));
  const tilt = Math.max(0, Math.min(90, num(url.searchParams, 'tilt', 30)));
  const azimuth = Math.max(-180, Math.min(180, num(url.searchParams, 'azimuth', 0)));
  if (!isRomaniaCoordinate(lat, lon)) return json({ error: 'Coordinates must be inside the Romania pilot bounding box.' }, 400);

  const upstream = await fetchPointForecast({ lat, lon, tilt, azimuth, days: 3 });
  const series = buildForecastSeries(upstream.data.hourly, capacityMwp);
  const currentIndex = nearestIndex(series.map((p) => p.time));
  const summary = summarizeForecast(series, new Date());
  const band = uncertaintyBand(summary.current?.power_mw || 0, summary.current?.cloud_pct || 0, 1);

  return json({
    meta: {
      product: 'Solar Power / Romania pilot',
      provider: upstream.provider,
      generated_at: new Date().toISOString(),
      timezone: upstream.data.timezone || 'Europe/Bucharest',
      assumptions: 'MWp DC, 14% system loss, temperature correction, 0.95 AC/DC clipping. Experimental.',
    },
    asset: { lat, lon, capacity_mwp: capacityMwp, tilt_deg: tilt, azimuth_deg: azimuth },
    summary: { ...summary, uncertainty_1h: band },
    current_index: currentIndex,
    forecast: series,
  });
}

async function romaniaField(url) {
  const tilt = Math.max(0, Math.min(90, num(url.searchParams, 'tilt', 30)));
  const azimuth = Math.max(-180, Math.min(180, num(url.searchParams, 'azimuth', 0)));
  const upstream = await fetchMultiPointSnapshot(ROMANIA_REFERENCE_CELLS, { tilt, azimuth });
  const nowMs = Date.now();
  const cells = upstream.rows.map((row, i) => {
    const times = row.hourly?.time || [];
    const k = nearestIndex(times, nowMs);
    return {
      ...ROMANIA_REFERENCE_CELLS[i],
      gti_wm2: Number(row.hourly?.global_tilted_irradiance?.[k] || 0),
      ghi_wm2: Number(row.hourly?.shortwave_radiation?.[k] || 0),
      dni_wm2: Number(row.hourly?.direct_normal_irradiance?.[k] || 0),
      cloud_pct: Number(row.hourly?.cloud_cover?.[k] || 0),
      time: times[k] || null,
    };
  });
  const avg = cells.length ? cells.reduce((s, c) => s + c.gti_wm2, 0) / cells.length : 0;
  return json({
    meta: { provider: upstream.provider, generated_at: new Date().toISOString(), coverage: '20 reference cells; any Romania coordinate supported by asset endpoint.' },
    national_reference_gti_wm2: avg,
    cells,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONAl') return new Response(null, { status: 204, headers: JSON_HEADERS });
    try {
      if (url.pathname === '/health') return json({ status: 'ok', service: 'lacurent-solar-romania', version: '0.1.0' });
      if (url.pathname === '/api/v1/models') return json({
        product: 'Solar Power / Romania pilot',
        current: ['ECMWF IFS via Open-Meteo', 'Open-Meteo Best Match fallback'],
        architecture: ['provider adapters', 'irradiance normalization', 'PV conversion', 'asset forecast', 'Romania spatial field', 'benchmark/calibration slot'],
        benchmark_status: 'baseline ready; public ground-truth ingestion not yet enabled',
      });
      if (url.pathname === '/api/v1/pv/forecast') return await assetForecast(url);
      if (url.pathname === '/api/v1/romania') return await romaniaField(url);
      if (url.pathname === '/' || url.pathname === '/index.html') return new Response(renderUi(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' } });
      return json({ error: 'not_found' }, 404);
    } catch (error) {
      return json({ error: 'forecast_unavailable', detail: String(error?.message || error) }, 503);
    }
  },
};

export { assetForecast, romaniaField };
