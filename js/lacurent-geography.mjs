export const CLIMATE_GEOGRAPHY_BASE = "../assets/geography/climate-zones/";

const MAP_WIDTH = 720;
const MAP_HEIGHT = 520;
const MAP_PADDING = 26;

const FALLBACK_ZONE_COLORS = Object.freeze({
  I: "#f0d36d",
  II: "#e9ad64",
  III: "#d97f5f",
  IV: "#a96b8e",
  V: "#596c9f"
});

function finitePair(point) {
  return Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]);
}

function closeEnough(a, b) {
  return finitePair(a) && finitePair(b) && Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9;
}

function geometryRings(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates || [];
  if (geometry.type === "MultiPolygon") return (geometry.coordinates || []).flat();
  return [];
}

function walkCoordinates(value, visit) {
  if (finitePair(value)) {
    visit(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => walkCoordinates(item, visit));
  }
}

export function boundsForFeatureCollections(...collections) {
  const bounds = { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity };
  for (const collection of collections) {
    for (const feature of collection?.features || []) {
      walkCoordinates(feature.geometry?.coordinates, ([lon, lat]) => {
        bounds.minLon = Math.min(bounds.minLon, lon);
        bounds.maxLon = Math.max(bounds.maxLon, lon);
        bounds.minLat = Math.min(bounds.minLat, lat);
        bounds.maxLat = Math.max(bounds.maxLat, lat);
      });
    }
  }
  if (!Number.isFinite(bounds.minLon)) {
    throw new Error("Climate geography has no coordinates.");
  }
  return bounds;
}

function projector(bounds, width = MAP_WIDTH, height = MAP_HEIGHT) {
  const lonSpan = bounds.maxLon - bounds.minLon;
  const latSpan = bounds.maxLat - bounds.minLat;
  const scale = Math.min((width - MAP_PADDING * 2) / lonSpan, (height - MAP_PADDING * 2) / latSpan);
  const mapWidth = lonSpan * scale;
  const mapHeight = latSpan * scale;
  const offsetX = (width - mapWidth) / 2;
  const offsetY = (height - mapHeight) / 2;
  return ([lon, lat]) => [
    offsetX + (lon - bounds.minLon) * scale,
    offsetY + (bounds.maxLat - lat) * scale
  ];
}

function ringPath(ring, project) {
  return ring.map((point, index) => {
    const [x, y] = project(point);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function geometryPath(geometry, project) {
  return geometryRings(geometry).map((ring) => ringPath(ring, project)).join(" ");
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon, lat, polygon) {
  if (!polygon?.length || !pointInRing(lon, lat, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(lon, lat, hole));
}

export function findZoneForPoint(zonesGeojson, lon, lat) {
  for (const feature of zonesGeojson?.features || []) {
    const geometry = feature.geometry;
    const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.coordinates || [];
    if (polygons.some((polygon) => pointInPolygon(lon, lat, polygon))) {
      return feature.properties?.zone;
    }
  }
  return null;
}

export function validateGeographyAssets(zonesGeojson, boundaryGeojson, oracle, provenance) {
  const errors = [];
  if (zonesGeojson?.type !== "FeatureCollection") errors.push("winter-climate-zones.geojson must be a FeatureCollection.");
  if (boundaryGeojson?.type !== "FeatureCollection") errors.push("romania-boundary.geojson must be a FeatureCollection.");
  if (provenance?.schema !== "lacurent_geographic_layer_v1") errors.push("provenance.json schema mismatch.");
  const seenZones = new Set();
  for (const feature of zonesGeojson?.features || []) {
    const zone = feature.properties?.zone;
    if (zone) seenZones.add(String(zone));
    for (const ring of geometryRings(feature.geometry)) {
      if (ring.length < 4) errors.push(`Zone ${zone || "unknown"} has a ring with fewer than four points.`);
      if (!closeEnough(ring[0], ring.at(-1))) errors.push(`Zone ${zone || "unknown"} has an open polygon ring.`);
    }
  }
  for (const zone of ["I", "II", "III", "IV", "V"]) {
    if (!seenZones.has(zone)) errors.push(`Missing climate zone ${zone}.`);
  }
  for (const point of oracle?.points || []) {
    const resolved = findZoneForPoint(zonesGeojson, point.lon, point.lat);
    if (resolved !== point.expected_zone) {
      errors.push(`${point.name} expected zone ${point.expected_zone}, resolved ${resolved || "none"}.`);
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    zoneCount: seenZones.size,
    oracleCount: Array.isArray(oracle?.points) ? oracle.points.length : 0,
    provenance
  };
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function localityOptions(oracle) {
  return [...(oracle?.points || [])]
    .filter((point) => point.pass !== false)
    .sort((a, b) => a.name.localeCompare(b.name, "ro"))
    .map((point) => ({
      label: point.name,
      value: normalizeName(point.name).replaceAll(" ", "-"),
      lon: point.lon,
      lat: point.lat,
      expectedZone: point.expected_zone
    }));
}

export function resolveLocalityClimate(localityValue, geography) {
  const normalized = normalizeName(localityValue);
  const locality = localityOptions(geography.oracle).find((option) => (
    normalizeName(option.value) === normalized || normalizeName(option.label) === normalized
  ));
  if (!locality) return null;
  const zone = findZoneForPoint(geography.zones, locality.lon, locality.lat);
  const designTemperatureC = geography.provenance?.normative_source?.temperature_c?.[zone] ?? null;
  return {
    ...locality,
    zone,
    designTemperatureC,
    station: locality.label,
    dataAvailability: zone ? "climate_zone_and_station_source_available" : "climate_zone_unresolved"
  };
}

export async function loadClimateGeography(base = CLIMATE_GEOGRAPHY_BASE) {
  const [zones, boundary, oracle, provenance] = await Promise.all([
    fetch(`${base}winter-climate-zones.geojson`).then((response) => response.json()),
    fetch(`${base}romania-boundary.geojson`).then((response) => response.json()),
    fetch(`${base}climate-zone-oracle.json`).then((response) => response.json()),
    fetch(`${base}provenance.json`).then((response) => response.json())
  ]);
  const validation = validateGeographyAssets(zones, boundary, oracle, provenance);
  return { zones, boundary, oracle, provenance, validation };
}

function zoneColor(feature) {
  return feature.properties?.fill || FALLBACK_ZONE_COLORS[feature.properties?.zone] || "#d9e2ec";
}

export function renderClimateLegend(target, geography, selectedZone) {
  if (!target) return;
  const temperatures = geography.provenance?.normative_source?.temperature_c || {};
  target.innerHTML = ["I", "II", "III", "IV", "V"].map((zone) => `
    <span class="${selectedZone === zone ? "selected" : ""}">
      <i style="background:${FALLBACK_ZONE_COLORS[zone]}"></i>
      Zona ${zone} ${temperatures[zone] ?? "-"} degC
    </span>
  `).join("");
}

export function renderClimateMap(target, geography, selection = {}) {
  if (!target) return;
  const bounds = boundsForFeatureCollections(geography.zones, geography.boundary);
  const project = projector(bounds);
  const selectedZone = selection.zone;
  const boundaryPath = (geography.boundary?.features || []).map((feature) => geometryPath(feature.geometry, project)).join(" ");
  const zonePaths = (geography.zones?.features || []).map((feature) => {
    const zone = feature.properties?.zone;
    return `<path class="climate-zone ${selectedZone === zone ? "selected" : ""}" d="${geometryPath(feature.geometry, project)}" fill="${zoneColor(feature)}" data-zone="${zone}" tabindex="0" role="button" aria-label="Zona climatica ${zone}"></path>`;
  }).join("");
  const pin = selection.lon && selection.lat
    ? (() => {
        const [x, y] = project([selection.lon, selection.lat]);
        return `<g class="location-pin" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><circle r="7"></circle><path d="M0 -18 L5 -3 L0 0 L-5 -3 Z"></path></g>`;
      })()
    : "";
  target.innerHTML = `
    <svg viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" aria-hidden="true">
      <rect class="map-bg" x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="8"></rect>
      ${zonePaths}
      <path class="romania-outline" d="${boundaryPath}"></path>
      ${pin}
    </svg>
  `;
}
