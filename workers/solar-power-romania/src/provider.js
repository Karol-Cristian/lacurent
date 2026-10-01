const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const SATELLITE_ENDPOINT = 'https://satellite-api.open-meteo.com/v1/archive';

export const MODEL_REGISTRY = Object.freeze({
  ecmwf_ifs: { key: 'ecmwf_ifs', label: 'ECMWF IFS HRES', model: 'ecmwf_ifs', family: 'physics', resolution: '~9 km' },
  ecmwf_aifs: { key: 'ecmwf_aifs', label: 'ECMWF AIFS', model: 'ecmwf_aifs025_single', family: 'ai', resolution: '~28 km' },
  icon_eu: { key: 'icon_eu', label: 'DWD ICON EU', model: 'icon_eu', family: 'physics', resolution: '~7 km' },
  gfs: { key: 'gfs', label: 'NOAA GFS', model: 'gfs_global', family: 'physics', resolution: '~11–25 km' },
});

const HOURLY = 'temperature_2m,cloud_cover,shortwave_radiation,direct_normal_irradiance,global_tilted_irradiance';

function queryFor({ lat, lon, tilt = 30, azimuth = 0, days = 3, model }) {
  const params = new URLSearchParams({
    latitude: Array.isArray(lat) ? lat.join(',') : String(lat),
    longitude: Array.isArray(lon) ? lon.join(',') : String(lon),
    hourly: HOURLY,
    forecast_days: String(days),
    timezone: 'UTC',
    tilt: String(tilt),
    azimuth: String(azimuth),
  });
  if (model) params.set('models', model);
  return params;
}

async function fetchJson(url, ttlSeconds = 300) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'lacurent-solar-romania/0.2' },
    cf: { cacheEverything: true, cacheTtl: ttlSeconds },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`upstream ${response.status}${body ? `: ${body.slice(0, 160)}` : ''}`);
  }
  return response.json();
}

export async function fetchModelForecast(modelKey, options) {
  const spec = MODEL_REGISTRY[modelKey];
  if (!spec) throw new Error(`unknown model ${modelKey}`);
  const query = queryFor({ ...options, model: spec.model });
  const data = await fetchJson(`${FORECAST_ENDPOINT}?${query.toString()}`, 240);
  return { model: spec, data };
}

export async function fetchAllModelForecasts(options) {
  const entries = await Promise.all(Object.keys(MODEL_REGISTRY).map(async (modelKey) => {
    try {
      return [modelKey, await fetchModelForecast(modelKey, options)];
    } catch (error) {
      return [modelKey, { model: MODEL_REGISTRY[modelKey], error: String(error?.message || error), data: null }];
    }
  }));
  return Object.fromEntries(entries);
}

export async function fetchMultiPointModelForecast(modelKey, points, { tilt = 30, azimuth = 0, days = 2 } = {}) {
  const spec = MODEL_REGISTRY[modelKey];
  if (!spec) throw new Error(`unknown model ${modelKey}`);
  const query = queryFor({
    lat: points.map((p) => p.lat),
    lon: points.map((p) => p.lon),
    tilt,
    azimuth,
    days,
    model: spec.model,
  });
  const data = await fetchJson(`${FORECAST_ENDPOINT}?${query.toString()}`, 240);
  return { model: spec, rows: Array.isArray(data) ? data : [data] };
}

export async function fetchSatelliteTruth(points, {
  startDate,
  endDate,
  tilt = 30,
  azimuth = 0,
  apiKey,
} = {}) {
  const params = new URLSearchParams({
    latitude: points.map((p) => p.lat).join(','),
    longitude: points.map((p) => p.lon).join(','),
    start_date: startDate,
    end_date: endDate,
    hourly: 'shortwave_radiation,global_tilted_irradiance',
    models: 'satellite_radiation_seamless',
    timezone: 'UTC',
    tilt: String(tilt),
    azimuth: String(azimuth),
  });
  if (apiKey) params.set('apikey', apiKey);
  const endpoint = apiKey ? 'https://customer-satellite-api.open-meteo.com/v1/archive' : SATELLITE_ENDPOINT;
  const data = await fetchJson(`${endpoint}?${params.toString()}`, 600);
  return { source: 'satellite_radiation_seamless', rows: Array.isArray(data) ? data : [data] };
}
