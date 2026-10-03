const SOLAR_BLOCKER = 'SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED';

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function firstFinite(...values) {
  for (const value of values) {
    const n = finite(value);
    if (n !== null) return n;
  }
  return null;
}

function resultSolarAnnualKWh(result) {
  return firstFinite(
    result?.chapter2?.annual?.qSolKWh,
    result?.chapter2?.annual?.qsolKWh,
    result?.chapter2?.annual?.solarGainsKWh,
    result?.chapter2?.summary?.annualSolarGains,
    result?.chapter2?.solar?.annualSolarGainsKWh,
  );
}

function hasDiagnostic(result, code) {
  return Array.isArray(result?.diagnostics) && result.diagnostics.some((item) => item?.code === code);
}

export function extractHomeDashboardModel(project) {
  const workspace = project?.workspace || {};
  const values = workspace.values || {};
  const result = workspace.lastResult || null;
  const lat = finite(values.location?.lat);
  const lon = finite(values.location?.lon);
  const pvEnabled = Boolean(values.renewables?.photovoltaic?.enabled);
  const pvKWp = firstFinite(values.renewables?.photovoltaic?.installedPowerKWp, 0) || 0;
  const solarThermalEnabled = Boolean(values.renewables?.solarThermal?.enabled);
  const solarAnnualKWh = resultSolarAnnualKWh(result);
  const solarBlocked = hasDiagnostic(result, SOLAR_BLOCKER);
  return {
    project_id: project?.projectId || workspace.projectId || null,
    project_name: project?.name || values.project?.name || 'Casa mea',
    location: {
      locality: values.location?.localityName || values.location?.locality || null,
      county: values.location?.county || null,
      latitude: lat,
      longitude: lon,
      ready: lat !== null && lon !== null,
    },
    building: {
      visual_type: values.building?.visualType || values.building?.type || 'house',
      length_m: finite(values.building?.lengthM),
      width_m: finite(values.building?.widthM),
      levels: finite(values.building?.levels),
    },
    pv: {
      enabled: pvEnabled,
      installed_kwp: pvKWp,
      forecast_ready: pvEnabled && pvKWp > 0 && lat !== null && lon !== null,
    },
    solar_thermal: {
      enabled: solarThermalEnabled,
      model_status: solarThermalEnabled ? 'configured_future_forecast' : 'not_configured',
    },
    envelope_solar: {
      annual_gain_kwh: solarAnnualKWh,
      status: solarAnnualKWh !== null ? 'calculated_static' : solarBlocked ? 'blocked_missing_qsol_inputs' : 'not_calculated',
      live_15_min_ready: false,
      blocker_code: solarBlocked ? SOLAR_BLOCKER : null,
      window_area_m2: finite(values.envelope?.windowAreaM2),
      window_orientation: values.envelope?.windowOrientation || null,
      wall_area_m2: finite(values.envelope?.wallAreaM2),
      roof_area_m2: finite(values.envelope?.roofAreaM2),
    },
    analysis: {
      available: Boolean(result),
      fresh: Boolean(workspace.resultFresh),
      status: result?.status || null,
    },
  };
}

export function buildSolarPowerForecastUrl(model, base = 'https://api.solarpowerapi.com') {
  if (!model?.location?.ready) return null;
  const capacityMwp = model.pv?.forecast_ready ? model.pv.installed_kwp / 1000 : 0.001;
  const params = new URLSearchParams({
    lat: String(model.location.latitude),
    lon: String(model.location.longitude),
    capacity_mwp: String(Math.max(0.001, capacityMwp)),
    tilt: '30',
    azimuth: '0',
  });
  return `${String(base).replace(/\/$/, '')}/api/v1/pv/forecast?${params.toString()}`;
}

export function dashboardRefreshMs() {
  return 15 * 60 * 1000;
}

export { SOLAR_BLOCKER };
