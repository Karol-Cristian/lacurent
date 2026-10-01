import { ROMANIA_REFERENCE_CELLS } from './regions.js';
import { MODEL_REGISTRY, fetchMultiPointModelForecast, fetchSatelliteTruth } from './provider.js';
import { HORIZONS } from './archive.js';

export const BENCHMARK_CELLS = Object.freeze(
  ['satu-mare', 'cluj', 'iasi', 'brasov', 'bucharest', 'craiova', 'constanta', 'timisoara']
    .map((id) => ROMANIA_REFERENCE_CELLS.find((cell) => cell.id === id))
    .filter(Boolean),
);

function archiveStub(env) {
  const id = env.ARCHIVE.idFromName('romania-benchmark');
  return env.ARCHIVE.get(id);
}

function isoHour(ms) {
  return new Date(Math.floor(ms / 3600000) * 3600000).toISOString().slice(0, 13) + ':00';
}

function epoch(time) {
  if (!time) return NaN;
  return Date.parse(String(time).endsWith('Z') ? time : `${time}Z`);
}

function closestIndex(times, targetMs) {
  let best = -1;
  let dist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < times.length; i += 1) {
    const d = Math.abs(epoch(times[i]) - targetMs);
    if (d < dist) { best = i; dist = d; }
  }
  return best;
}

async function storePredictions(env, issuedAtMs) {
  const rows = [];
  const modelResults = await Promise.all(Object.keys(MODEL_REGISTRY).map(async (modelKey) => {
    try {
      const result = await fetchMultiPointModelForecast(modelKey, BENCHMARK_CELLS, { tilt: 30, azimuth: 0, days: 2 });
      return { modelKey, result };
    } catch (error) {
      return { modelKey, error: String(error?.message || error) };
    }
  }));

  for (const { modelKey, result } of modelResults) {
    if (!result) continue;
    result.rows.forEach((data, i) => {
      const times = data.hourly?.time || [];
      for (const horizon of HORIZONS) {
        const targetMs = issuedAtMs + horizon * 3600000;
        const k = closestIndex(times, targetMs);
        if (k < 0) continue;
        rows.push({
          issued_at: new Date(issuedAtMs).toISOString(),
          valid_at: isoHour(epoch(times[k])),
          cell_id: BENCHMARK_CELLS[i].id,
          model: modelKey,
          horizon_h: horizon,
          gti_wm2: Number(data.hourly?.global_tilted_irradiance?.[k] || 0),
        });
      }
    });
  }

  const response = await archiveStub(env).fetch('https://archive/predictions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ issued_at: new Date(issuedAtMs).toISOString(), rows }),
  });
  return { stored: rows.length, models: modelResults.map((x) => ({ model: x.modelKey, ok: Boolean(x.result), error: x.error || null })), archive: await response.json() };
}

async function scoreSatelliteTruth(env, nowMs) {
  const end = new Date(nowMs);
  const start = new Date(nowMs - 36 * 3600000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const truth = await fetchSatelliteTruth(BENCHMARK_CELLS, {
    startDate,
    endDate,
    tilt: 30,
    azimuth: 0,
    apiKey: env.OPEN_METEO_API_KEY,
  });

  const cutoffMs = nowMs - 60 * 60000;
  const rows = [];
  truth.rows.forEach((data, i) => {
    const times = data.hourly?.time || [];
    const gti = data.hourly?.global_tilted_irradiance || [];
    for (let k = 0; k < times.length; k += 1) {
      const t = epoch(times[k]);
      if (!Number.isFinite(t) || t > cutoffMs || t < nowMs - 30 * 3600000) continue;
      if (!Number.isFinite(Number(gti[k]))) continue;
      rows.push({
        valid_at: isoHour(t),
        cell_id: BENCHMARK_CELLS[i].id,
        gti_wm2: Number(gti[k]),
      });
    }
  });

  const response = await archiveStub(env).fetch('https://archive/observations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ observed_at: new Date(nowMs).toISOString(), source: truth.source, rows }),
  });
  return { observations: rows.length, archive: await response.json() };
}

export async function getBenchmarkMetrics(env) {
  const response = await archiveStub(env).fetch('https://archive/metrics');
  return response.json();
}

export async function runBenchmarkCycle(env, nowMs = Date.now()) {
  const cycle = { started_at: new Date(nowMs).toISOString(), prediction: null, truth: null, errors: [] };
  try {
    cycle.prediction = await storePredictions(env, nowMs);
  } catch (error) {
    cycle.errors.push({ stage: 'prediction', error: String(error?.message || error) });
  }
  try {
    cycle.truth = await scoreSatelliteTruth(env, nowMs);
  } catch (error) {
    cycle.errors.push({ stage: 'truth', error: String(error?.message || error) });
  }
  cycle.finished_at = new Date().toISOString();
  await archiveStub(env).fetch('https://archive/status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cycle),
  });
  return cycle;
}

export async function getBenchmarkStatus(env) {
  const response = await archiveStub(env).fetch('https://archive/status');
  return response.json();
}
