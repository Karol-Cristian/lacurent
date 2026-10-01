import test from 'node:test';
import assert from 'node:assert/strict';
import { estimatePvAcMw, buildForecastSeries, summarizeForecast, isRomaniaCoordinate } from '../src/solar.js';
import { fuseForecasts, weightsFromBenchmark, LEARNING_HORIZONS_MIN } from '../src/fusion.js';
import { MODEL_REGISTRY, forecastBlock } from '../src/provider.js';
import { BENCHMARK_CELLS } from '../src/benchmark.js';
import { HORIZONS_MIN } from '../src/archive.js';
import { renderUi } from '../src/ui.js';

function modelData(gti) {
  return {
    minutely_15: {
      time: [
        '2026-10-01T10:00','2026-10-01T10:15','2026-10-01T10:30',
        '2026-10-01T10:45','2026-10-01T11:00','2026-10-01T11:15'
      ],
      global_tilted_irradiance: gti,
      shortwave_radiation: gti.map((v) => v * 0.9),
      direct_normal_irradiance: gti.map((v) => v * 0.8),
      cloud_cover: gti.map((_, i) => 20 + i * 5),
      temperature_2m: gti.map((_, i) => 18 + i * 0.5),
    },
  };
}

test('PV physical conversion remains bounded by AC/DC limit', () => {
  const p = estimatePvAcMw({ gtiWm2: 1200, airTempC: 25, capacityMwp: 10 });
  assert.ok(p > 0);
  assert.ok(p <= 9.5);
});

test('Romania guard accepts pilot locations and rejects Berlin', () => {
  assert.equal(isRomaniaCoordinate(46.77, 23.59), true);
  assert.equal(isRomaniaCoordinate(52.52, 13.41), false);
});

test('provider selects the 15-minute block', () => {
  const data = modelData([400,420,440,460,480,500]);
  assert.equal(forecastBlock(data).time.length, 6);
});

test('multi-model fusion preserves a 15-minute grid and averages untrained models equally', () => {
  const base = [400,420,440,460,480,500];
  const payloads = {
    ecmwf_ifs: { data: modelData(base) },
    ecmwf_aifs: { data: modelData(base.map((v) => v + 20)) },
    icon_eu: { data: modelData(base.map((v) => v + 40)) },
    gfs: { data: modelData(base.map((v) => v + 60)) },
  };
  const out = fuseForecasts(payloads, 10, { horizons: {} }, Date.parse('2026-10-01T09:59:00Z'));
  assert.equal(out.availableModels.length, 4);
  assert.equal(out.gridMinutes, 15);
  assert.equal(out.weightSource, 'equal_untrained');
  assert.ok(Math.abs(out.series[0].gti_wm2 - 430) < 0.001);
  assert.equal(Object.keys(out.series[0].members).length, 4);
  assert.equal(out.series[1].horizon_minutes, 16);
});

test('benchmark weights switch to inverse MAE after sample floor at a selected horizon', () => {
  const benchmark = { horizons: { '180': {
    ecmwf_ifs: { count: 30, mae_wm2: 20 },
    ecmwf_aifs: { count: 30, mae_wm2: 40 },
    icon_eu: { count: 30, mae_wm2: 25 },
    gfs: { count: 30, mae_wm2: 50 },
  }}};
  const out = weightsFromBenchmark(benchmark, 180);
  assert.equal(out.source, 'satellite_skill_inverse_mae');
  assert.ok(out.weights.ecmwf_ifs > out.weights.gfs);
});

test('evaluation horizons include intraday, 23h and 48h checks', () => {
  assert.ok(HORIZONS_MIN.includes(15));
  assert.ok(HORIZONS_MIN.includes(1380));
  assert.ok(HORIZONS_MIN.includes(2880));
  assert.deepEqual(HORIZONS_MIN, LEARNING_HORIZONS_MIN);
});

test('benchmark geography spans eight Romanian reference cells', () => {
  assert.equal(BENCHMARK_CELLS.length, 8);
  assert.ok(BENCHMARK_CELLS.some((c) => c.id === 'constanta'));
  assert.ok(BENCHMARK_CELLS.some((c) => c.id === 'timisoara'));
});

test('15-minute summary computes +1h and MWh with quarter-hour integration', () => {
  const data = modelData([0,200,400,600,800,700]);
  const series = buildForecastSeries(data.minutely_15, 10);
  const summary = summarizeForecast(series, new Date('2026-10-01T10:00:00Z'));
  assert.equal(summary.current.time, '2026-10-01T10:00');
  assert.equal(summary.nextHour.time, '2026-10-01T11:00');
  assert.equal(summary.intervalMinutes, 15);
  const naiveMwSum = series.reduce((sum, p) => sum + p.power_mw, 0);
  assert.ok(Math.abs(summary.todayEnergyMwh - naiveMwSum * 0.25) < 1e-9);
});

test('model registry marks NWP 15-minute values as interpolated where native cadence is coarser', () => {
  assert.deepEqual(Object.keys(MODEL_REGISTRY), ['ecmwf_ifs','ecmwf_aifs','icon_eu','gfs']);
  assert.equal(MODEL_REGISTRY.ecmwf_aifs.family, 'ai');
  assert.match(MODEL_REGISTRY.ecmwf_ifs.forecast_grid, /15 min/);
});

test('product UI exposes 15-minute immutable benchmark surfaces', () => {
  const html = renderUi();
  assert.match(html, /SOLAR POWER \/ ROMANIA/);
  assert.match(html, /15 MIN/);
  assert.match(html, /forecasts immutable/);
  assert.match(html, /ECMWF AIFS/);
  assert.match(html, /\/api\/v1\/benchmark/);
});
