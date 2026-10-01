import test from 'node:test';
import assert from 'node:assert/strict';
import { estimatePvAcMw, buildForecastSeries, summarizeForecast, isRomaniaCoordinate, uncertaintyBand } from '../src/solar.js';
import { renderUi } from '../src/ui.js';

test('1 MWp at strong irradiance stays below AC clipping limit', () => {
  const p = estimatePvAcMw({ gtiWm2: 1000, airTempC: 25, capacityMwp: 1 });
  assert.ok(p > 0.65 && p <= 0.95);
});

test('night irradiance produces zero power', () => {
  assert.equal(estimatePvAcMw({ gtiWm2: 0, airTempC: 10, capacityMwp: 50 }), 0);
});

test('Romania coordinate guard works for representative points', () => {
  assert.equal(isRomaniaCoordinate(46.77, 23.59), true);
  assert.equal(isRomaniaCoordinate(52.52, 13.41), false);
});

test('series and daily summary preserve physical zero at night', () => {
  const hourly = {
    time: ['2026-10-01T10:00', '2026-10-01T11:00', '2026-10-01T12:00'],
    global_tilted_irradiance: [0, 500, 800],
    shortwave_radiation: [0, 450, 740],
    direct_normal_irradiance: [0, 400, 650],
    cloud_cover: [100, 40, 20],
    temperature_2m: [12, 18, 20],
  };
  const series = buildForecastSeries(hourly, 10);
  assert.equal(series[0].power_mw, 0);
  const summary = summarizeForecast(series, new Date('2026-10-01T11:00:00+03:00'));
  assert.ok(summary.todayEnergyMwh > 0);
  assert.ok(summary.peak.power_mw >= summary.current.power_mw);
});

test('uncertainty proxy is explicitly uncalibrated', () => {
  const band = uncertaintyBand(10, 70, 6);
  assert.equal(band.calibrated, false);
  assert.ok(band.low_mw < band.central_mw);
  assert.ok(band.high_mw > band.central_mw);
});

test('UI contains required trust and producer markers', () => {
  const html = renderUi();
  assert.match(html, /SOLAR POWER \/ ROMANIA/);
  assert.match(html, /producător \/ asset model/);
  assert.match(html, /Not dispatch-grade yet/);
  assert.match(html, /\/api\/v1\/pv\/forecast/);
});
