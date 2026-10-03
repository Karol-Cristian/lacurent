const FIELD_PREFIXES = Object.freeze(["id:", "name:"]);

function savedField(draft, key) {
  const fields = draft?.fields && typeof draft.fields === "object" ? draft.fields : {};
  const candidates = FIELD_PREFIXES.some((prefix) => key.startsWith(prefix))
    ? [key]
    : [`id:${key}`, `name:${key}`];
  for (const candidate of candidates) {
    const row = fields[candidate];
    if (row && typeof row === "object") return row;
  }
  return null;
}

function fieldValue(draft, key, fallback = "") {
  const row = savedField(draft, key);
  return row && Object.prototype.hasOwnProperty.call(row, "value")
    ? String(row.value ?? "")
    : fallback;
}

function fieldChecked(draft, key) {
  return Boolean(savedField(draft, key)?.checked);
}

function numberValue(draft, key) {
  const raw = fieldValue(draft, key, "").trim().replace(",", ".");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function pvOrientationAzimuth(orientation) {
  return ({
    south: 0,
    south_west: 45,
    west: 90,
    north_west: 135,
    north: 180,
    north_east: -135,
    east: -90,
    south_east: -45,
  })[String(orientation || "")] ?? 0;
}

function solarGainStatus(workspace) {
  const baseline = workspace?.baselineResult || null;
  const diagnostics = Array.isArray(baseline?.diagnostics) ? baseline.diagnostics : [];
  const blocked = diagnostics.some((item) =>
    item?.code === "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED"
  );
  const monthly = Array.isArray(baseline?.chapter2?.monthly)
    ? baseline.chapter2.monthly
    : Array.isArray(baseline?.monthly)
      ? baseline.monthly
      : [];
  const values = monthly
    .map((row) => Number(row?.solarGainsKWh ?? row?.solar_gains_kwh))
    .filter(Number.isFinite);
  const annual = values.length === 12 ? values.reduce((sum, value) => sum + value, 0) : null;
  return {
    annual_kwh: annual,
    static_status: annual !== null
      ? "calculated"
      : blocked
        ? "blocked_missing_qsol_inputs"
        : "not_available",
    blocker_code: blocked ? "SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED" : null,
    live_15_min_ready: false,
  };
}

export function extractEditorialHomeDashboard(project, locality = null) {
  const workspace = project?.workspace || {};
  const draft = workspace?.draft || {};
  const pvEnabled = fieldChecked(draft, "pvEnabled") || fieldChecked(draft, "pv_enabled");
  const pvKwp = numberValue(draft, "pv_installed_power_kwp") ?? 0;
  const pvTilt = numberValue(draft, "pv_tilt_degrees");
  const pvOrientation = fieldValue(draft, "pv_orientation", "") || null;
  const thermalEnabled = fieldChecked(draft, "solarThermalEnabled")
    || fieldChecked(draft, "solar_thermal_enabled");
  const localityId = fieldValue(draft, "localityId", "") || null;
  const localityName = fieldValue(draft, "localityInput", "") || null;
  const solar = solarGainStatus(workspace);

  return {
    project_id: project?.projectId || null,
    project_name: project?.name || "Casa mea",
    workspace_schema: workspace?.schemaVersion || null,
    location: {
      locality_id: localityId,
      locality_name: locality?.name || localityName,
      county: locality?.county || null,
      latitude: Number.isFinite(Number(locality?.lat)) ? Number(locality.lat) : null,
      longitude: Number.isFinite(Number(locality?.lon)) ? Number(locality.lon) : null,
      ready: Number.isFinite(Number(locality?.lat)) && Number.isFinite(Number(locality?.lon)),
    },
    building: {
      heated_area_m2: numberValue(draft, "heatedArea") ?? numberValue(draft, "heated_floor_area_m2"),
      levels: numberValue(draft, "heatedLevels") ?? numberValue(draft, "heated_levels"),
      window_area_m2: numberValue(draft, "windowArea") ?? numberValue(draft, "window_area_m2"),
      window_orientation: fieldValue(draft, "orientation", "") || null,
      glazing: fieldValue(draft, "glazing", "") || null,
      solar_g_value: numberValue(draft, "advSolarGn"),
    },
    systems: {
      heating: fieldValue(draft, "heatingChoice", "") || fieldValue(draft, "heating_choice", "") || null,
      cooling: fieldValue(draft, "cooling", "") || null,
      ventilation: fieldValue(draft, "ventilation", "") || null,
    },
    pv: {
      enabled: pvEnabled,
      installed_kwp: pvKwp,
      tilt_deg: pvTilt,
      orientation: pvOrientation,
      azimuth_deg: pvOrientationAzimuth(pvOrientation),
      forecast_ready: pvEnabled && pvKwp > 0 && pvTilt !== null && Boolean(pvOrientation),
    },
    solar_thermal: {
      enabled: thermalEnabled,
      collector_area_m2: numberValue(draft, "solar_thermal_collector_area_m2"),
      tilt_deg: numberValue(draft, "solar_thermal_tilt_degrees"),
      orientation: fieldValue(draft, "solar_thermal_orientation", "") || null,
      efficiency_pct: numberValue(draft, "advSolarThermalEfficiency"),
      live_15_min_ready: false,
    },
    envelope_solar: {
      ...solar,
      window_area_m2: numberValue(draft, "windowArea") ?? numberValue(draft, "window_area_m2"),
      window_orientation: fieldValue(draft, "orientation", "") || null,
      solar_g_value: numberValue(draft, "advSolarGn"),
    },
    analysis: {
      baseline_available: Boolean(workspace?.baselineResult),
      optimization_available: Boolean(workspace?.optimizationResult),
      saved_at: workspace?.savedAt || null,
    },
  };
}

export function solarPowerForecastUrl(model, base = "https://api.solarpowerapi.com") {
  if (!model?.location?.ready) return null;
  const capacityMwp = model?.pv?.forecast_ready
    ? Math.max(0.001, Number(model.pv.installed_kwp) / 1000)
    : 0.001;
  const tilt = model?.pv?.forecast_ready ? Number(model.pv.tilt_deg) : 30;
  const azimuth = model?.pv?.forecast_ready ? Number(model.pv.azimuth_deg) : 0;
  const params = new URLSearchParams({
    lat: String(model.location.latitude),
    lon: String(model.location.longitude),
    capacity_mwp: String(capacityMwp),
    tilt: String(tilt),
    azimuth: String(azimuth),
  });
  return `${String(base).replace(/\/$/, "")}/api/v1/pv/forecast?${params.toString()}`;
}

export function dashboardRefreshMs() {
  return 15 * 60 * 1000;
}

export { fieldChecked, fieldValue, numberValue };
