const ECMWF_ENDPOINT = 'https://api.open-meteo.com/v1/ecmwf';
const AUTO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

function queryFor({ lat, lon, tilt = 30, azimuth = 0, days = 3 }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: 'temperature_2m,cloud_cover,shortwave_radiation,direct_normal_irradiance,global_tilted_irradiance',
    forecast_days: String(days),
    timezone: 'Europe/Bucharest',
    tilt: String(tilt),
    azimuth: String(azimuth),
  });
  return params;
}

async function fetchJson(url, ttlSeconds = 300) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'lacurent-solar-romania/0.1' },
    cf: { cacheEverything: true, cacheTtl: ttlSeconds },
  });
  if (!response.ok) throw new Error(`upstream ${response.status}`);
  return response.json();
}

export async function fetchPointForecast(options) {
  const query = queryFor(options);
  let provider = 'ECMWF IFS via Open-Meteo';
  let data;
  try {
    data = await fetchJson(`${ECMWF_ENDPOINT}?${query.toString()}`);
  } catch (error) {
    provider = 'Open-Meteo Best Match fallback';
    data = await fetchJson(`${AUTO_ENDPOINT}?${query.toString()}`);
  }
  return { provider, data };
}

export async function fetchMultiPointSnapshot(points, { tilt = 30, azimuth = 0 } = {}) {
  const lat = points.map((p) => p.lat).join(',');
  const lon = points.map((p) => p.lon).join(',');
  const query = queryFor({ lat, lon, tilt, azimuth, days: 1 });
  let provider = 'ECMWF IFS via Open-Meteo';
  let data;
  try {
    data = await fetchJson(`${ECMWF_ENDPOINT}?${query.toString()}`, 300);
  } catch (error) {
    provider = 'Open-Meteo Best Match fallback';
    data = await fetchJson(`${AUTO_ENDPOINT}?${query.toString()}`, 300);
  }
  const rows = Array.isArray(data) ? data : [data];
  return { provider, rows };
}
