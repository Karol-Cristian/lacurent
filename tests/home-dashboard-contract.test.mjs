import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOLAR_BLOCKER,
  buildSolarPowerForecastUrl,
  dashboardRefreshMs,
  extractHomeDashboardModel,
} from '../js/home-dashboard-contract.mjs';

test('Casa mea extracts saved location and converts PV state without inventing solar gains', () => {
  const model = extractHomeDashboardModel({
    projectId: 'p1',
    name: 'Casa Test',
    workspace: {
      resultFresh: true,
      values: {
        location: { localityName: 'Cluj-Napoca', county: 'Cluj', lat: 46.77, lon: 23.59 },
        building: { visualType: 'house-p1' },
        envelope: { windowAreaM2: 18, windowOrientation: 'south' },
        renewables: { photovoltaic: { enabled: true, installedPowerKWp: 6.4, tiltDeg: 25, orientation: 'west' } },
      },
      lastResult: {
        status: 'blocked',
        diagnostics: [{ code: SOLAR_BLOCKER, severity: 'blocking' }],
      },
    },
  });
  assert.equal(model.location.ready, true);
  assert.equal(model.pv.forecast_ready, true);
  assert.equal(model.pv.installed_kwp, 6.4);
  assert.equal(model.pv.tilt_deg, 25);
  assert.equal(model.pv.orientation, 'west');
  assert.equal(model.envelope_solar.annual_gain_kwh, null);
  assert.equal(model.envelope_solar.status, 'blocked_missing_qsol_inputs');
  assert.equal(model.envelope_solar.window_orientation, 'south');
});

test('Casa mea exposes a valid static engine solar gain when explicitly present', () => {
  const model = extractHomeDashboardModel({
    workspace: {
      values: {},
      lastResult: { chapter2: { annual: { qSolKWh: 2450 } } },
    },
  });
  assert.equal(model.envelope_solar.annual_gain_kwh, 2450);
  assert.equal(model.envelope_solar.status, 'calculated_static');
  assert.equal(model.envelope_solar.live_15_min_ready, false);
});

test('SolarPowerAPI URL converts household kWp to MWp and keeps 15-minute refresh contract', () => {
  const model = extractHomeDashboardModel({
    workspace: {
      values: {
        location: { lat: 44.4268, lon: 26.1025 },
        renewables: { photovoltaic: { enabled: true, installedPowerKWp: 5, tiltDeg: 35, orientation: 'east' } },
      },
    },
  });
  const url = new URL(buildSolarPowerForecastUrl(model, 'https://api.solarpowerapi.com/'));
  assert.equal(url.searchParams.get('capacity_mwp'), '0.005');
  assert.equal(url.searchParams.get('lat'), '44.4268');
  assert.equal(url.searchParams.get('tilt'), '35');
  assert.equal(url.searchParams.get('azimuth'), '-90');
  assert.equal(dashboardRefreshMs(), 900000);
});

test('Dashboard can still request irradiance when a house has no PV', () => {
  const model = extractHomeDashboardModel({
    workspace: { values: { location: { lat: 45, lon: 25 } } },
  });
  const url = new URL(buildSolarPowerForecastUrl(model));
  assert.equal(url.searchParams.get('capacity_mwp'), '0.001');
  assert.equal(model.pv.forecast_ready, false);
});
