import { ROMANIA_REFERENCE_CELLS } from './regions.js';
import { MODEL_REGISTRY, fetchMultiPointModelForecast, fetchSatelliteTruth, forecastBlock } from './provider.js';
import { HORIZONS_MIN } from './archive.js';

export const BENCHMARK_CELLS = Object.freeze(
  ['satu-mare', 'cluj', 'iasi', 'brasov', 'bucharest', 'craiova', 'constanta', 'timisoara']
    .map((id) => ROMANIA_REFERENCE_CELLS.find((cell) => cell.id === id))
    .filter(Boolean),
);

function archiveStub(env) {
  const id = env.ARCHIVE.idFromName('romania-benchmark');
  return env.ARCHIVE.get(id);
}

function utcMs(time) {
  if (!time) return NaN;
  const value = String(time);
  return Date.parse(value.endsWith('Z') ? value : `${value}Z`);
}

function isoMinute(ms) {
  return new Date(ms).toISOString().slice(0, 16);
}

function floorQuarter(ms) {
  return Math.floor(ms / (15 * 60000)) * 15 * 60000;
}

function closestIndex(times, targetMs) {
  let best = -1;
  let dist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < times.length; i += 1) {
    const d = Math.abs(utcMs(times[i]) - targetMs);
    if (d < dist) { best = i; dist = d; }
  }
  return { index: best, distance_ms: dist };
}

function dayPath(iso) {
  const date = iso.slice(0, 10).replaceAll('-', '/');
  const stamp = iso.slice(11, 16).replace(':', '');
  return { date, stamp };
}

async function persistCurve(env, kind, timestamp, partition, data, resolutionMinutes = 15) {
  const response = await archiveStub(env).fetch('https://archive/curve', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, timestamp, partition, resolution_minutes: resolutionMinutes, data }),
  });
  const stored = await response.json();
  if (env.ARCHIVE_R2) {
    const safeStamp = timestamp.replaceAll(':', '').replaceAll('-', '');
    const key = `${kind}-runs/${timestamp.slice(0,10).replaceAll('-', '/')}/${safeStamp}-${partition}.json`;
    await env.ARCHIVE_R2.put(key, JSON.stringify(data), {
      httpMetadata: { contentType: 'application/json' },
      customMetadata: { format: 'solar-power-v1' },
    });
    return { durable_object_key: stored.key, r2_key: key };
  }
  return { durable_object_key: stored.key, r2_key: null };
}

function compactCurve(block) {
  return {
    time: block?.time || [],
    gti_wm2: block?.global_tilted_irradiance || [],
    ghi_wm2: block?.shortwave_radiation || [],
    dni_wm2: block?.direct_normal_irradiance || [],
    cloud_pct: block?.cloud_cover || [],
    temperature_c: block?.temperature_2m || [],
  };
}

async function storePredictions(env, issuedAtMs) {
  const issuedAt = new Date(issuedAtMs).toISOString();
  const scoreRows = [];
  const archiveModels = {};
  const modelResults = await Promise.all(Object.keys(MODEL_REGISTRY).map(async (modelKey) => {
    try {
      const result = await fetchMultiPointModelForecast(modelKey, BENCHMARK_CELLS, { tilt: 30, azimuth: 0, forecastQuarterHours: 193 });
      return { modelKey, result };
    } catch (error) {
      return { modelKey, error: String(error?.message || error) };
    }
  }));

  for (const { modelKey, result } of modelResults) {
    if (!result) continue;
    archiveModels[modelKey] = [];
    result.rows.forEach((data, i) => {
      const block = forecastBlock(data);
      if (!block?.time?.length) return;
      archiveModels[modelKey].push({ cell_id: BENCHMARK_CELLS[i].id, curve: compactCurve(block) });
      for (const horizonMin of HORIZONS_MIN) {
        const targetMs = issuedAtMs + horizonMin * 60000;
        const nearest = closestIndex(block.time, targetMs);
        if (nearest.index < 0 || nearest.distance_ms > 10 * 60000) continue;
        const k = nearest.index;
        scoreRows.push({
          issued_at: issuedAt,
          valid_at: isoMinute(utcMs(block.time[k])),
          cell_id: BENCHMARK_CELLS[i].id,
          model: modelKey,
          horizon_min: horizonMin,
          effective_horizon_min: Math.round((utcMs(block.time[k]) - issuedAtMs) / 60000),
          gti_wm2: Number(block.global_tilted_irradiance?.[k] || 0),
        });
      }
    });
  }

  const response = await archiveStub(env).fetch('https://archive/predictions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ issued_at: issuedAt, rows: scoreRows }),
  });
  const curveArchive = {};
  for (const [modelKey, cells] of Object.entries(archiveModels)) {
    curveArchive[modelKey] = await persistCurve(env, 'forecast', issuedAt, modelKey, {
      issued_at: issuedAt,
      model: modelKey,
      resolution_minutes: 15,
      retention_intent: 'immutable forecast curve for audit and later re-scoring',
      cells,
    }, 15);
  }
  return {
    stored_for_scoring: scoreRows.length,
    full_curve_archive: curveArchive,
    models: modelResults.map((x) => ({ model: x.modelKey, ok: Boolean(x.result), error: x.error || null })),
    archive: await response.json(),
  };
}

function inferNativeResolutionMinutes(times) {
  if (!times || times.length < 2) return null;
  const deltas = [];
  for (let i = 1; i < Math.min(times.length, 12); i += 1) {
    const d = Math.round((utcMs(times[i]) - utcMs(times[i - 1])) / 60000);
    if (d > 0) deltas.push(d);
  }
  if (!deltas.length) return null;
  deltas.sort((a, b) => a - b);
  return deltas[Math.floor(deltas.length / 2)];
}

async function scoreSatelliteTruth(env, nowMs) {
  const end = new Date(nowMs);
  const start = new Date(nowMs - 30 * 3600000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const truth = await fetchSatelliteTruth(BENCHMARK_CELLS, {
    startDate, endDate, tilt: 30, azimuth: 0, apiKey: env.OPEN_METEO_API_KEY,
  });

  const newestTarget = floorQuarter(nowMs - 30 * 60000);
  const oldestTarget = newestTarget - 120 * 60000;
  const targetTimes = [];
  for (let t = oldestTarget; t <= newestTarget; t += 15 * 60000) targetTimes.push(t);

  const scoreRows = [];
  const rawTruth = [];
  let nativeResolutionMinutes = null;
  truth.rows.forEach((data, i) => {
    const block = data?.hourly || data?.minutely_15;
    const times = block?.time || [];
    const gti = block?.global_tilted_irradiance || [];
    if (!nativeResolutionMinutes) nativeResolutionMinutes = inferNativeResolutionMinutes(times);
    const cellRows = [];
    for (const targetMs of targetTimes) {
      const nearest = closestIndex(times, targetMs);
      if (nearest.index < 0 || nearest.distance_ms > 10 * 60000) continue;
      const value = Number(gti[nearest.index]);
      if (!Number.isFinite(value)) continue;
      const row = {
        valid_at: isoMinute(targetMs),
        source_at: isoMinute(utcMs(times[nearest.index])),
        source_offset_min: Math.round((utcMs(times[nearest.index]) - targetMs) / 60000),
        cell_id: BENCHMARK_CELLS[i].id,
        gti_wm2: value,
      };
      scoreRows.push(row);
      cellRows.push(row);
    }
    rawTruth.push({ cell_id: BENCHMARK_CELLS[i].id, rows: cellRows });
  });

  const observedAt = new Date(nowMs).toISOString();
  const response = await archiveStub(env).fetch('https://archive/observations', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      observed_at: observedAt,
      source: `${truth.source}; native satellite resampled to 15-minute benchmark slots`,
      resolution_minutes: nativeResolutionMinutes,
      rows: scoreRows,
    }),
  });
  const truthArchive = await persistCurve(env, 'truth', observedAt, 'satellite', {
    observed_at: observedAt,
    source: truth.source,
    native_resolution_minutes: nativeResolutionMinutes,
    benchmark_resolution_minutes: 15,
    rows: rawTruth,
  }, nativeResolutionMinutes || 10);
  return { observations: scoreRows.length, native_resolution_minutes: nativeResolutionMinutes, truth_archive: truthArchive, archive: await response.json() };
}

export async function getBenchmarkMetrics(env) {
  const response = await archiveStub(env).fetch('https://archive/metrics');
  return response.json();
}

export async function runBenchmarkCycle(env, nowMs = Date.now()) {
  const cycle = { started_at: new Date(nowMs).toISOString(), resolution_minutes: 15, prediction: null, truth: null, errors: [] };
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
