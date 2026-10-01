export const HORIZONS_MIN = Object.freeze([15, 30, 45, 60, 120, 180, 360, 720, 1380, 1440, 2160, 2880]);
export const MODEL_KEYS = Object.freeze(['ecmwf_ifs', 'ecmwf_aifs', 'icon_eu', 'gfs']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

function metricKey(model, horizonMinutes) {
  return `metric:${model}:${horizonMinutes}`;
}

function predKey(validAt, cellId, model, horizonMinutes) {
  return `pred:${validAt}:${cellId}:${model}:${horizonMinutes}`;
}

export class ForecastArchive {
  constructor(ctx) {
    this.ctx = ctx;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/predictions') {
      const payload = await request.json();
      const writes = [];
      for (const row of payload.rows || []) {
        writes.push(this.ctx.storage.put(
          predKey(row.valid_at, row.cell_id, row.model, row.horizon_min),
          row,
        ));
      }
      await Promise.all(writes);
      await this.ctx.storage.put('status:last_prediction_run', payload.issued_at || new Date().toISOString());
      return json({ stored: writes.length });
    }

    if (request.method === 'POST' && url.pathname === '/observations') {
      const payload = await request.json();
      let scored = 0;
      let skippedNight = 0;
      for (const obs of payload.rows || []) {
        if (!Number.isFinite(Number(obs.gti_wm2))) continue;
        for (const model of MODEL_KEYS) {
          for (const horizonMinutes of HORIZONS_MIN) {
            const key = predKey(obs.valid_at, obs.cell_id, model, horizonMinutes);
            const pred = await this.ctx.storage.get(key);
            if (!pred) continue;
            const actual = Number(obs.gti_wm2);
            const forecast = Number(pred.gti_wm2);
            if (actual < 20 && forecast < 20) {
              await this.ctx.storage.delete(key);
              skippedNight += 1;
              continue;
            }
            const mKey = metricKey(model, horizonMinutes);
            const metric = (await this.ctx.storage.get(mKey)) || {
              count: 0, sum_abs: 0, sum_sq: 0, sum_bias: 0, sum_actual: 0, sum_forecast: 0,
            };
            const error = forecast - actual;
            metric.count += 1;
            metric.sum_abs += Math.abs(error);
            metric.sum_sq += error * error;
            metric.sum_bias += error;
            metric.sum_actual += Math.abs(actual);
            metric.sum_forecast += Math.abs(forecast);
            metric.updated_at = payload.observed_at || new Date().toISOString();
            await this.ctx.storage.put(mKey, metric);
            await this.ctx.storage.delete(key);
            scored += 1;
          }
        }
      }
      await this.ctx.storage.put('status:last_truth_run', payload.observed_at || new Date().toISOString());
      if (payload.source) await this.ctx.storage.put('status:truth_source', payload.source);
      if (payload.resolution_minutes) await this.ctx.storage.put('status:truth_resolution_minutes', payload.resolution_minutes);
      return json({ scored, skipped_night: skippedNight });
    }

    if (url.pathname === '/metrics') {
      const horizons = {};
      for (const horizonMinutes of HORIZONS_MIN) {
        horizons[String(horizonMinutes)] = {};
        for (const model of MODEL_KEYS) {
          const m = (await this.ctx.storage.get(metricKey(model, horizonMinutes))) || null;
          if (!m || !m.count) {
            horizons[String(horizonMinutes)][model] = { count: 0 };
            continue;
          }
          horizons[String(horizonMinutes)][model] = {
            count: m.count,
            mae_wm2: m.sum_abs / m.count,
            rmse_wm2: Math.sqrt(m.sum_sq / m.count),
            bias_wm2: m.sum_bias / m.count,
            nmae_pct: m.sum_actual > 0 ? (m.sum_abs / m.sum_actual) * 100 : null,
            updated_at: m.updated_at,
          };
        }
      }
      return json({
        resolution_minutes: 15,
        horizons,
        last_prediction_run: await this.ctx.storage.get('status:last_prediction_run') || null,
        last_truth_run: await this.ctx.storage.get('status:last_truth_run') || null,
        truth_source: await this.ctx.storage.get('status:truth_source') || null,
        truth_resolution_minutes: await this.ctx.storage.get('status:truth_resolution_minutes') || null,
      });
    }

    if (request.method === 'POST' && url.pathname === '/status') {
      const payload = await request.json();
      await this.ctx.storage.put('status:cycle', payload);
      return json({ ok: true });
    }

    if (url.pathname === '/status') {
      return json((await this.ctx.storage.get('status:cycle')) || {});
    }

    return json({ error: 'not_found' }, 404);
  }
}
