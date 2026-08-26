export const CLIMATE_GEOGRAPHY_BASE = "../assets/geography/climate-zones/";

const MAP_UNIT_SCALE = 86;
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

export function createClimateMapProjection(zonesGeojson, boundaryGeojson) {
  const bounds = boundsForFeatureCollections(zonesGeojson, boundaryGeojson);
  const midLat = (bounds.minLat + bounds.maxLat) / 2;
  const lonScale = Math.cos((midLat * Math.PI) / 180);
  const width = ((bounds.maxLon - bounds.minLon) * lonScale * MAP_UNIT_SCALE) + (MAP_PADDING * 2);
  const height = ((bounds.maxLat - bounds.minLat) * MAP_UNIT_SCALE) + (MAP_PADDING * 2);
  return {
    bounds,
    height,
    lonScale,
    padding: MAP_PADDING,
    scale: MAP_UNIT_SCALE,
    viewBox: `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`,
    width,
    xMidLatitude: midLat,
    project([lon, lat]) {
      return [
        MAP_PADDING + ((lon - bounds.minLon) * lonScale * MAP_UNIT_SCALE),
        MAP_PADDING + ((bounds.maxLat - lat) * MAP_UNIT_SCALE)
      ];
    },
    invert([x, y]) {
      return [
        bounds.minLon + ((x - MAP_PADDING) / (lonScale * MAP_UNIT_SCALE)),
        bounds.maxLat - ((y - MAP_PADDING) / MAP_UNIT_SCALE)
      ];
    }
  };
}

function ringPath(ring, projection) {
  return ring.map((point, index) => {
    const [x, y] = projection.project(point);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ") + " Z";
}

function geometryPath(geometry, projection) {
  return geometryRings(geometry).map((ring) => ringPath(ring, projection)).join(" ");
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

function projectionForGeography(geography) {
  return createClimateMapProjection(geography.zones, geography.boundary);
}

export function projectGeographicPoint(geography, lon, lat) {
  const projection = projectionForGeography(geography);
  const [x, y] = projection.project([lon, lat]);
  return { x, y, projection };
}

export function resolveProjectedClimateZone(geography, x, y) {
  const projection = projectionForGeography(geography);
  const [lon, lat] = projection.invert([x, y]);
  const zone = findZoneForPoint(geography.zones, lon, lat);
  return {
    lat,
    lon,
    zone,
    designTemperatureC: geography.provenance?.normative_source?.temperature_c?.[zone] ?? null
  };
}

export function mapClientPointToClimateZone(mapElement, geography, clientX, clientY) {
  const svg = mapElement?.matches?.("svg") ? mapElement : mapElement?.querySelector?.("svg");
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const viewBox = svg.viewBox.baseVal;
  const x = viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width;
  const y = viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height;
  return resolveProjectedClimateZone(geography, x, y);
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

function zoneLabelPoint(feature, projection) {
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const ring of geometryRings(feature.geometry)) {
    for (const point of ring) {
      const [x, y] = projection.project(point);
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2
  };
}

export function renderClimateLegend(target, geography, selectedZone) {
  if (!target) return;
  const temperatures = geography.provenance?.normative_source?.temperature_c || {};
  target.innerHTML = ["I", "II", "III", "IV", "V"].map((zone) => `
    <span class="${selectedZone === zone ? "selected" : ""}">
      <i style="background:${FALLBACK_ZONE_COLORS[zone]}"></i>
      Zona ${zone} ${temperatures[zone] ?? "-"} °C
    </span>
  `).join("");
}

export function setClimateMapInteractionState(target, { selectedZone = null, hoveredZone = null } = {}) {
  if (!target) return;
  target.querySelectorAll("[data-zone]").forEach((item) => {
    const zone = item.dataset.zone;
    item.classList.toggle("selected", zone === selectedZone);
    item.classList.toggle("hovered", zone === hoveredZone && zone !== selectedZone);
    if (item.matches(".visual-zone")) item.setAttribute("aria-pressed", zone === selectedZone ? "true" : "false");
  });
}

export function renderClimateMap(target, geography, selection = {}) {
  if (!target) return;
  const projection = projectionForGeography(geography);
  const selectedZone = selection.zone;
  const hoveredZone = selection.hoveredZone;
  const boundaryPath = (geography.boundary?.features || []).map((feature) => geometryPath(feature.geometry, projection)).join(" ");
  const technicalPaths = (geography.zones?.features || []).map((feature) => {
    const zone = feature.properties?.zone;
    return `<path class="technical-zone" d="${geometryPath(feature.geometry, projection)}" data-zone="${zone}"></path>`;
  }).join("");
  const visualPaths = (geography.zones?.features || []).map((feature) => {
    const zone = feature.properties?.zone;
    const classes = ["climate-zone", "visual-zone"];
    if (selectedZone === zone) classes.push("selected");
    if (hoveredZone === zone && selectedZone !== zone) classes.push("hovered");
    return `<path class="${classes.join(" ")}" d="${geometryPath(feature.geometry, projection)}" fill="${zoneColor(feature)}" data-zone="${zone}" tabindex="0" role="button" aria-pressed="${selectedZone === zone ? "true" : "false"}" aria-label="Zona climatica ${zone}"></path>`;
  }).join("");
  const labels = (geography.zones?.features || []).map((feature) => {
    const zone = feature.properties?.zone;
    const point = zoneLabelPoint(feature, projection);
    const selected = selectedZone === zone ? " selected" : "";
    return `<text class="zone-label${selected}" x="${point.x.toFixed(2)}" y="${point.y.toFixed(2)}" data-zone="${zone}">${zone}</text>`;
  }).join("");
  const pin = selection.lon && selection.lat
    ? (() => {
        const [x, y] = projection.project([selection.lon, selection.lat]);
        return `<g class="location-pin" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><circle r="7"></circle><path d="M0 -18 L5 -3 L0 0 L-5 -3 Z"></path></g>`;
      })()
    : "";
  target.innerHTML = `
    <svg class="climate-map-svg" viewBox="${projection.viewBox}" preserveAspectRatio="xMidYMid meet" data-projection="canonical-geojson-local-equirectangular" data-viewbox-ratio="${(projection.width / projection.height).toFixed(6)}" aria-label="Zone climatice de iarna">
      <rect class="map-bg" x="0" y="0" width="${projection.width.toFixed(2)}" height="${projection.height.toFixed(2)}" rx="8"></rect>
      <g class="technical-hit-layer" aria-hidden="true">
        ${technicalPaths}
      </g>
      <g class="presentation-layer">
        ${visualPaths}
      </g>
      <path class="romania-outline" d="${boundaryPath}"></path>
      <g class="zone-label-layer" aria-hidden="true">
        ${labels}
      </g>
      ${pin}
    </svg>
  `;
}
