import test from 'node:test';
import assert from 'node:assert/strict';
import { estimatePvAcMw, buildForecastSeries, summarizeForecast, isRomaniaCoordinate } from '../src/solar.js';
import { fuseForecasts, weightsFromBenchmark } from '../src/fusion.js';
import { MODEL_REGISTRY } from '../src/provider.js';
import { BENCHMARK_CELLS } from '../src/benchmark.js';
import { renderUi } from '../src/ui.js';

function modelData(gti) {
  return {
    hourly: {
      time: ['2026-10-01T10:00','2026-10-01T11:00','2026-10-01T12:00'],
      global_tilted_irradiance: gti,
      shortwave_radiation: gti.map((v) => v * 0.9),
      direct_normal_irradiance: gti.map((v) => v * 0.8),
      cloud_cover: [20,30,40],
      temperature_2m: [18,19,20],
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

test('multi-model fusion averages untrained models equally', () => {
  const payloads = {
    ecmwf_ifs: { data: modelData([400,500,600]) },
    ecmwf_aifs: { data: modelData([420,520,620]) },
    icon_eu: { data: modelData([440,540,640]) },
    gfs: { data: modelData([460,560,660]) },
  };
  const out = fuseForecasts(payloads, 10, { horizons: {} });
  assert.equal(out.availableModels.length, 4);
  assert.equal(out.weightSource, 'equal_untrained');
  assert.ok(Math.abs(out.series[0].gti_wm2 - 430) < 0.001);
  assert.equal(Object.keys(out.series[0].members).length, 4);
});

test('benchmark weights switch to inverse MAE after sample floor', () => {
  const benchmark = { horizons: { '3': {
    ecmwf_ifs: { count: 30, mae_wm2: 20 },
    ecmwf_aifs: { count: 30, mae_wm2: 40 },
    icon_eu: { count: 30, mae_wm2: 25 },
    gfs: { count: 30, mae_wm2: 50 },
  }}};
  const out = weightsFromBenchmark(benchmark);
  assert.equal(out.source, 'satellite_skill_inverse_mae');
  assert.ok(out.weights.ecmwf_ifs > out.weights.gfs);
});

test('benchmark geography spans eight Romanian reference cells', () => {
  assert.equal(BENCHMARK_CELLS.length, 8);
  assert.ok(BENCHMARK_CELLS.some((c) => c.id === 'constanta'));
  assert.ok(BENCHMARK_CELLS.some((c) => c.id === 'timisoara'));
});

test('UTC series summary uses requested current timestamp', () => {
  const series = buildForecastSeries(modelData([0,500,800]).hourly, 10);
  const summary = summarizeForecast(series, new Date('2026-10-01T11:00:00Z'));
  assert.equal(summary.current.time, '2026-10-01T11:00');
  assert.ok(summary.todayEnergyMwh > 0);
});

test('model registry exposes independent physics and AI sources', () => {
  assert.deepEqual(Object.keys(MODEL_REGISTRY), ['ecmwf_ifs','ecmwf_aifs','icon_eu','gfs']);
  assert.equal(MODEL_REGISTRY.ecmwf_aifs.family, 'ai');
});

test('product UI exposes ensemble and benchmark surfaces', () => {
  const html = renderUi();
  assert.match(html, /SOLAR POWER \/ ROMANIA/);
  assert.match(html, /continuous benchmark/);
  assert.match(html, /ECMWF AIFS/);
  assert.match(html, /\/api\/v1\/benchmark/);
});
