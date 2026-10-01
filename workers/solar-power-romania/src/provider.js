const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const SATELLITE_ENDPOINT = 'https://satellite-api.open-meteo.com/v1/archive';

export const MODEL_REGISTRY = Object.freeze({
  ecmwf_ifs: { key: 'ecmwf_ifs', label: 'ECMWF IFS HRES', model: 'ecmwf_ifs', family: 'physics', spatial_resolution: '~9 km', temporal_native: '1 h', forecast_grid: '15 min interpolated' },
  ecmwf_aifs: { key: 'ecmwf_aifs', label: 'ECMWF AIFS', model: 'ecmwf_aifs025_single', family: 'ai', spatial_resolution: '~28 km', temporal_native: 'coarser than 15 min', forecast_grid: '15 min interpolated' },
  icon_eu: { key: 'icon_eu', label: 'DWD ICON EU', model: 'icon_eu', family: 'physics', spatial_resolution: '~7 km', temporal_native: '1 h', forecast_grid: '15 min interpolated' },
  gfs: { key: 'gfs', label: 'NOAA GFS', model: 'gfs_global', family: 'physics', spatial_resolution: '~11-25 km', temporal_native: '1 h+', forecast_grid: '15 min interpolated' },
});

const VARIABLES = 'temperature_2m,cloud_cover,shortwave_radiation,direct_normal_irradiance,global_tilted_irradiance';

function queryFor({ lat, lon, tilt = 30, azimuth = 0, forecastQuarterHours = 193, model }) {
  const params = new URLSearchParams({
    latitude: Array.isArray(lat) ? lat.join(',') : String(lat),
    longitude: Array.isArray(lon) ? lon.join(',') : String(lon),
    minutely_15: VARIABLES,
    forecast_minutely_15: String(forecastQuarterHours),
    timezone: 'UTC',
    tilt: String(tilt),
    azimuth: String(azimuth),
  });
  if (model) params.set('models', model);
  return params;
}

async function fetchJson(url, ttlSeconds = 180) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'lacurent-solar-romania/0.3' },
    cf: { cacheEverything: true, cacheTtl: ttlSeconds },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`upstream ${response.status}${body ? `: ${body.slice(0, 160)}` : ''}`);
  }
  return response.json();
}

export function forecastBlock(data) {
  return data?.minutely_15 || data?.hourly || null;
}

export async function fetchModelForecast(modelKey, options) {
  const spec = MODEL_REGISTRY[modelKey];
  if (!spec) throw new Error(`unknown model ${modelKey}`);
  const query = queryFor({ ...options, model: spec.model });
  const data = await fetchJson(`${FORECAST_ENDPOINT}?${query.toString()}`, 180);
  if (!forecastBlock(data)?.time?.length) throw new Error(`${modelKey} returned no 15-minute series`);
  return { model: spec, data, grid_minutes: 15 };
}

export async function fetchAllModelForecasts(options) {
  const entries = await Promise.all(Object.keys(MODEL_REGISTRY).map(async (modelKey) => {
    try {
      return [modelKey, await fetchModelForecast(modelKey, options)];
    } catch (error) {
      return [modelKey, { model: MODEL_REGISTRY[modelKey], error: String(error?.message || error), data: null, grid_minutes: 15 }];
    }
  }));
  return Object.fromEntries(entries);
}

export async function fetchMultiPointModelForecast(modelKey, points, { tilt = 30, azimuth = 0, forecastQuarterHours = 193 } = {}) {
  const spec = MODEL_REGISTRY[modelKey];
  if (!spec) throw new Error(`unknown model ${modelKey}`);
  const query = queryFor({
    lat: points.map((p) => p.lat),
    lon: points.map((p) => p.lon),
    tilt, azimuth, forecastQuarterHours, model: spec.model,
  });
  const data = await fetchJson(`${FORECAST_ENDPOINT}?${query.toString()}`, 180);
  const rows = Array.isArray(data) ? data : [data];
  if (!rows.some((row) => forecastBlock(row)?.time?.length)) throw new Error(`${modelKey} returned no 15-minute multi-point series`);
  return { model: spec, rows, grid_minutes: 15 };
}

export async function fetchSatelliteTruth(points, { startDate, endDate, tilt = 30, azimuth = 0, apiKey } = {}) {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(','),
    longitude: points.map((p) => p.lon).join(','),
    start_date: startDate,
    end_date: endDate,
    hourly: 'shortwave_radiation,global_tilted_irradiance',
    models: 'satellite_radiation_seamless',
    timezone: 'UTC',
    temporal_resolution: 'native',
    tilt: String(tilt),
    azimuth: String(azimuth),
  });
  if (apiKey) params.set('apikey', apiKey);
  const endpoint = apiKey ? 'https://customer-satellite-api.open-meteo.com/v1/archive' : SATELLITE_ENDPOINT;
  const data = await fetchJson(`${endpoint}?${params.toString()}`, 600);
  return { source: 'satellite_radiation_seamless_native', rows: Array.isArray(data) ? data : [data], native_resolution: true };
}
