export const CLIMATE_GEOGRAPHY_BASE = "../assets/geography/climate-zones/";
export const ROMANIA_LOCALITIES_BASE = "../assets/geography/romania-localities/";

const MAP_UNIT_SCALE = 86;
const MAP_PADDING = 26;
const MIN_ZOOM_VIEWBOX_FRACTION = 0.12;

const PRESENTATION_ZONE_COLORS = Object.freeze({
  I: "#F08A4B",
  II: "#F3D65C",
  III: "#86B982",
  IV: "#7AB2C3",
  V: "#667CAD"
});

const LABEL_COLLISION_WIDTH = 1120;
const LABEL_MIN_PADDING_PX = 8;
const LABEL_LIMITS = Object.freeze([
  { zoomBelow: 1.55, maxLabels: 8 },
  { zoomBelow: 2.6, maxLabels: 18 },
  { zoomBelow: 4.2, maxLabels: 28 },
  { zoomBelow: 6.2, maxLabels: 36 },
  { zoomBelow: Infinity, maxLabels: 48 }
]);

const LOCALITY_LABEL_STYLES = Object.freeze({
  1: { fontSize: 10.8, radius: 3.8, weight: 900 },
  2: { fontSize: 9.8, radius: 3.1, weight: 850 },
  3: { fontSize: 8.7, radius: 2.4, weight: 800 },
  4: { fontSize: 7.7, radius: 1.9, weight: 760 },
  5: { fontSize: 6.9, radius: 1.5, weight: 720 }
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

export function normalizeRomanianSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(value) {
  return normalizeRomanianSearchText(value).replaceAll(" ", "-");
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
  if (!geography.__projection) {
    geography.__projection = createClimateMapProjection(geography.zones, geography.boundary);
  }
  return geography.__projection;
}

export function fullMapViewBox(geography) {
  const projection = projectionForGeography(geography);
  return { x: 0, y: 0, width: projection.width, height: projection.height };
}

export function viewBoxToString(viewBox) {
  return `${viewBox.x.toFixed(2)} ${viewBox.y.toFixed(2)} ${viewBox.width.toFixed(2)} ${viewBox.height.toFixed(2)}`;
}

function sameAspectHeight(width, aspectRatio) {
  return width / aspectRatio;
}

export function clampMapViewBox(geography, viewBox) {
  const projection = projectionForGeography(geography);
  const aspectRatio = projection.width / projection.height;
  const minWidth = projection.width * MIN_ZOOM_VIEWBOX_FRACTION;
  const width = Math.min(projection.width, Math.max(minWidth, viewBox.width));
  const height = Math.min(projection.height, sameAspectHeight(width, aspectRatio));
  const x = Math.max(0, Math.min(viewBox.x, projection.width - width));
  const y = Math.max(0, Math.min(viewBox.y, projection.height - height));
  return { x, y, width, height };
}

export function zoomMapViewBox(geography, viewBox, scaleFactor, center = {}) {
  const current = clampMapViewBox(geography, viewBox || fullMapViewBox(geography));
  const cx = Number.isFinite(center.x) ? center.x : current.x + (current.width / 2);
  const cy = Number.isFinite(center.y) ? center.y : current.y + (current.height / 2);
  return clampMapViewBox(geography, {
    x: cx - ((cx - current.x) * scaleFactor),
    y: cy - ((cy - current.y) * scaleFactor),
    width: current.width * scaleFactor,
    height: current.height * scaleFactor
  });
}

export function panMapViewBox(geography, viewBox, deltaX, deltaY) {
  const current = clampMapViewBox(geography, viewBox || fullMapViewBox(geography));
  return clampMapViewBox(geography, {
    ...current,
    x: current.x + deltaX,
    y: current.y + deltaY
  });
}

export function mapZoomLevel(geography, viewBox) {
  const projection = projectionForGeography(geography);
  const current = clampMapViewBox(geography, viewBox || fullMapViewBox(geography));
  return projection.width / current.width;
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

export function mapClientPointToProjectedPoint(mapElement, clientX, clientY) {
  const svg = mapElement?.matches?.("svg") ? mapElement : mapElement?.querySelector?.("svg");
  if (!svg) return null;
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const viewBox = svg.viewBox.baseVal;
  return {
    x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.width,
    y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.height,
    rect,
    svg,
    viewBox
  };
}

export function mapClientPointToClimateZone(mapElement, geography, clientX, clientY) {
  const point = mapClientPointToProjectedPoint(mapElement, clientX, clientY);
  if (!point) return null;
  return resolveProjectedClimateZone(geography, point.x, point.y);
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

function localityImportance(locality) {
  const rankWeight = { 0: 7, I: 6, II: 5, III: 4, IV: 2, V: 1 }[locality.rank] || 1;
  return (rankWeight * 1_000_000) + (Number(locality.population2002) || 0);
}

export function validateLocalityDataset(dataset) {
  const errors = [];
  if (dataset?.schema !== "lacurent_romanian_localities_v1") errors.push("localities.json schema mismatch.");
  if (!Array.isArray(dataset?.localities)) errors.push("localities.json must contain localities.");
  if (!Array.isArray(dataset?.counties)) errors.push("localities.json must contain counties.");
  const ids = new Set();
  for (const locality of dataset?.localities || []) {
    if (!locality.id) errors.push("Locality without id.");
    if (ids.has(locality.id)) errors.push(`Duplicate locality ${locality.id}.`);
    ids.add(locality.id);
    if (!locality.name || !locality.county) errors.push(`Locality ${locality.id} has incomplete naming.`);
    if (!Number.isFinite(locality.lon) || !Number.isFinite(locality.lat)) errors.push(`Locality ${locality.id} has invalid coordinates.`);
  }
  return {
    ok: errors.length === 0,
    errors,
    coordinateCount: (dataset?.localities || []).filter((locality) => Number.isFinite(locality.lon) && Number.isFinite(locality.lat)).length,
    countyCount: dataset?.counties?.length || 0,
    localityCount: dataset?.localities?.length || 0,
    uatCount: new Set((dataset?.localities || []).map((locality) => locality.uatSiruta)).size
  };
}

export function prepareLocalityDataset(dataset) {
  const localities = (dataset?.localities || []).map((locality) => ({
    ...locality,
    importance: localityImportance(locality),
    search: normalizeRomanianSearchText(`${locality.name} ${locality.county} ${locality.uatName} ${locality.localityType} ${locality.countyMnemonic}`)
  }));
  const byId = new Map(localities.map((locality) => [locality.id, locality]));
  const byCounty = new Map();
  for (const locality of localities) {
    if (!byCounty.has(locality.county)) byCounty.set(locality.county, []);
    byCounty.get(locality.county).push(locality);
  }
  for (const [, items] of byCounty) {
    items.sort((a, b) => a.name.localeCompare(b.name, "ro") || a.uatName.localeCompare(b.uatName, "ro"));
  }
  return {
    ...dataset,
    byCounty,
    byId,
    localities,
    validation: validateLocalityDataset(dataset)
  };
}

export function localityDisplayLabel(locality) {
  if (!locality) return "";
  const uat = locality.uatName && locality.uatName !== locality.name ? `, UAT ${locality.uatName}` : "";
  return `${locality.name}, ${locality.localityType} - ${locality.county}${uat}`;
}

export function localityShortLabel(locality) {
  if (!locality) return "";
  const uat = locality.uatName && locality.uatName !== locality.name ? ` (${locality.uatName})` : "";
  return `${locality.name}${uat}, ${locality.county}`;
}

export function searchLocalities(localityDataset, query, options = {}) {
  const normalized = normalizeRomanianSearchText(query);
  if (normalized.length < 2) return [];
  const terms = normalized.split(" ").filter(Boolean);
  const county = options.county || null;
  const candidates = county ? localityDataset?.byCounty?.get(county) || [] : localityDataset?.localities || [];
  return candidates
    .map((locality) => {
      if (!terms.every((term) => locality.search.includes(term))) return null;
      const normalizedName = normalizeRomanianSearchText(locality.name);
      const exactName = normalizedName === normalized;
      const startsName = normalizedName.startsWith(normalized);
      const startsCounty = normalizeRomanianSearchText(locality.county).startsWith(normalized);
      const score = (exactName ? 5_000_000 : 0) + (startsName ? 1_000_000 : 0) + (startsCounty ? 250_000 : 0) + locality.importance;
      return { locality, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.locality.name.localeCompare(b.locality.name, "ro"))
    .slice(0, options.limit || 12)
    .map((item) => item.locality);
}

function oracleLocalityOptions(oracle) {
  return [...(oracle?.points || [])]
    .filter((point) => point.pass !== false)
    .sort((a, b) => a.name.localeCompare(b.name, "ro"))
    .map((point) => ({
      label: point.name,
      value: slug(point.name),
      lon: point.lon,
      lat: point.lat,
      expectedZone: point.expected_zone
    }));
}

export function localityOptions(source) {
  if (source?.schema === "lacurent_romanian_localities_v1") {
    return (source.localities || []).map((locality) => ({
      expectedZone: locality.expectedZone,
      label: localityDisplayLabel(locality),
      lat: locality.lat,
      lon: locality.lon,
      value: locality.id
    }));
  }
  return oracleLocalityOptions(source);
}

function findStationForLocality(locality, geography) {
  const localityName = normalizeRomanianSearchText(locality?.name || locality?.label);
  const direct = (geography.oracle?.points || []).find((point) => normalizeRomanianSearchText(point.name) === localityName);
  if (!direct) return null;
  return {
    label: direct.name,
    lat: direct.lat,
    lon: direct.lon,
    value: slug(direct.name)
  };
}

function resolveDatasetLocality(value, geography) {
  const localities = geography.localities;
  if (!localities) return null;
  const normalized = normalizeRomanianSearchText(value);
  return localities.byId.get(value)
    || localities.localities.find((item) => normalizeRomanianSearchText(item.name) === normalized || slug(item.name) === value)
    || null;
}

export function resolveLocalityClimate(localityValue, geography) {
  if (!localityValue) return null;
  const datasetLocality = resolveDatasetLocality(localityValue, geography);
  if (datasetLocality) {
    const zone = findZoneForPoint(geography.zones, datasetLocality.lon, datasetLocality.lat);
    const designTemperatureC = geography.provenance?.normative_source?.temperature_c?.[zone] ?? null;
    const station = findStationForLocality(datasetLocality, geography);
    return {
      ...datasetLocality,
      dataAvailability: station
        ? "climate_zone_and_station_source_available"
        : "climate_zone_available_station_requires_provider_mapping",
      designTemperatureC,
      label: localityShortLabel(datasetLocality),
      station: station?.label || null,
      stationValue: station?.value || null,
      value: datasetLocality.id,
      zone
    };
  }
  const normalized = normalizeRomanianSearchText(localityValue);
  const locality = oracleLocalityOptions(geography.oracle).find((option) => (
    normalizeRomanianSearchText(option.value) === normalized || normalizeRomanianSearchText(option.label) === normalized
  ));
  if (!locality) return null;
  const zone = findZoneForPoint(geography.zones, locality.lon, locality.lat);
  const designTemperatureC = geography.provenance?.normative_source?.temperature_c?.[zone] ?? null;
  return {
    ...locality,
    dataAvailability: zone ? "climate_zone_and_station_source_available" : "climate_zone_unresolved",
    designTemperatureC,
    station: locality.label,
    stationValue: locality.value,
    zone
  };
}

export async function loadClimateGeography(base = CLIMATE_GEOGRAPHY_BASE, localitiesBase = ROMANIA_LOCALITIES_BASE) {
  const [zones, boundary, oracle, provenance, localityDataset, localityProvenance] = await Promise.all([
    fetch(`${base}winter-climate-zones.geojson`).then((response) => response.json()),
    fetch(`${base}romania-boundary.geojson`).then((response) => response.json()),
    fetch(`${base}climate-zone-oracle.json`).then((response) => response.json()),
    fetch(`${base}provenance.json`).then((response) => response.json()),
    fetch(`${localitiesBase}localities.json`).then((response) => response.json()),
    fetch(`${localitiesBase}provenance.json`).then((response) => response.json())
  ]);
  const validation = validateGeographyAssets(zones, boundary, oracle, provenance);
  const localities = prepareLocalityDataset(localityDataset);
  return { boundary, localities, localityProvenance, oracle, provenance, validation, zones };
}

function zoneColor(featureOrZone) {
  const zone = typeof featureOrZone === "string" ? featureOrZone : featureOrZone?.properties?.zone;
  return PRESENTATION_ZONE_COLORS[zone] || "#d9e2ec";
}

export function renderClimateLegend(target, geography, selectedZone) {
  if (!target) return;
  const temperatures = geography.provenance?.normative_source?.temperature_c || {};
  target.innerHTML = ["I", "II", "III", "IV", "V"].map((zone) => `
    <span class="${selectedZone === zone ? "selected" : ""}">
      <i style="background:${zoneColor(zone)}"></i>
      Zona ${zone} ${temperatures[zone] ?? "-"} °C
    </span>
  `).join("");
}

export function setClimateMapInteractionState(target, { selectedZone = null, hoveredZone = null } = {}) {
  if (!target) return;
  target.querySelectorAll("[data-zone]").forEach((item) => {
    const zone = item.dataset.zone;
    item.classList.toggle("hovered", zone === hoveredZone && zone !== selectedZone);
    item.classList.toggle("selected", zone === selectedZone);
    if (item.matches(".visual-zone")) item.setAttribute("aria-pressed", zone === selectedZone ? "true" : "false");
  });
}

function markerTier(locality) {
  if (locality.rank === "0" || locality.rank === "I" || locality.population2002 >= 200_000) return 1;
  if (locality.rank === "II" || locality.population2002 >= 55_000) return 2;
  if (locality.rank === "III" || locality.population2002 >= 12_000) return 3;
  if (locality.localityType === "comuna" || locality.population2002 >= 1_500) return 4;
  return 5;
}

function markerStyle(tier, selected = false) {
  const style = LOCALITY_LABEL_STYLES[tier] || LOCALITY_LABEL_STYLES[5];
  return selected
    ? { ...style, fontSize: Math.max(style.fontSize + 1.5, 10.4), radius: Math.max(style.radius + 1.4, 4.5), weight: 900 }
    : style;
}

function labelLimitForZoom(zoom) {
  return LABEL_LIMITS.find((limit) => zoom < limit.zoomBelow)?.maxLabels || 32;
}

function markerScreenPoint(marker, viewBox, collisionWidth) {
  const collisionHeight = collisionWidth * (viewBox.height / viewBox.width);
  return {
    x: ((marker.x - viewBox.x) / viewBox.width) * collisionWidth,
    y: ((marker.y - viewBox.y) / viewBox.height) * collisionHeight
  };
}

function labelWidthPx(locality, fontSize) {
  const text = localityShortLabel(locality) || locality.name || "";
  return Math.min(270, Math.max(42, (text.length * fontSize * 0.78) + 26));
}

function labelBox(screen, locality, style, position) {
  const width = labelWidthPx(locality, style.fontSize);
  const height = style.fontSize + 18;
  const offset = style.radius + 15;
  const candidates = {
    right: {
      anchor: "start",
      box: { x1: screen.x + offset, x2: screen.x + offset + width, y1: screen.y - (height * 0.78), y2: screen.y + (height * 0.22) },
      x: offset,
      y: -4
    },
    left: {
      anchor: "end",
      box: { x1: screen.x - offset - width, x2: screen.x - offset, y1: screen.y - (height * 0.78), y2: screen.y + (height * 0.22) },
      x: -offset,
      y: -4
    },
    above: {
      anchor: "middle",
      box: { x1: screen.x - (width / 2), x2: screen.x + (width / 2), y1: screen.y - offset - height, y2: screen.y - offset },
      x: 0,
      y: -offset
    },
    below: {
      anchor: "middle",
      box: { x1: screen.x - (width / 2), x2: screen.x + (width / 2), y1: screen.y + offset, y2: screen.y + offset + height },
      x: 0,
      y: offset + (style.fontSize * 0.32)
    }
  };
  return { ...candidates[position], fontSize: style.fontSize, fontWeight: style.weight, position };
}

function boxesOverlap(a, b, padding = LABEL_MIN_PADDING_PX) {
  return !(a.x2 + padding < b.x1 || a.x1 - padding > b.x2 || a.y2 + padding < b.y1 || a.y1 - padding > b.y2);
}

function boxIsWithinCanvas(box, width, height) {
  const margin = 8;
  return box.x2 >= -margin && box.x1 <= width + margin && box.y2 >= -margin && box.y1 <= height + margin;
}

function renderedCollisionWidth(target) {
  const width = Number(target?.clientWidth);
  if (!Number.isFinite(width) || width <= 0) return LABEL_COLLISION_WIDTH;
  return Math.max(280, Math.min(LABEL_COLLISION_WIDTH, width - 32));
}

export function declutterLocalityLabels(markers, viewBox, options = {}) {
  const current = viewBox || { x: 0, y: 0, width: 1, height: 1 };
  const collisionWidth = options.collisionWidth || LABEL_COLLISION_WIDTH;
  const collisionHeight = collisionWidth * (current.height / current.width);
  const selectedId = options.selectedLocalityId || null;
  const zoom = options.zoom || 1;
  const maxLabels = options.maxLabels || labelLimitForZoom(zoom);
  const acceptedBoxes = [];
  const accepted = new Map();
  const sorted = [...markers].sort((a, b) => {
    if (a.locality.id === selectedId) return -1;
    if (b.locality.id === selectedId) return 1;
    return a.tier - b.tier || b.locality.importance - a.locality.importance || a.locality.name.localeCompare(b.locality.name, "ro");
  });

  for (const marker of sorted) {
    const selected = marker.locality.id === selectedId;
    if (!selected && accepted.size >= maxLabels) continue;
    const style = markerStyle(marker.tier, selected);
    const screen = markerScreenPoint(marker, current, collisionWidth);
    const positions = selected ? ["right", "left", "above", "below"] : marker.tier <= 2 ? ["right", "left", "above", "below"] : ["right", "above", "left", "below"];
    let chosen = null;
    for (const position of positions) {
      const candidate = labelBox(screen, marker.locality, style, position);
      if (!boxIsWithinCanvas(candidate.box, collisionWidth, collisionHeight) && !selected) continue;
      if (selected || !acceptedBoxes.some((box) => boxesOverlap(candidate.box, box))) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen && selected) chosen = labelBox(screen, marker.locality, style, "right");
    if (!chosen) continue;
    acceptedBoxes.push(chosen.box);
    accepted.set(marker.locality.id, chosen);
  }
  return accepted;
}

export function selectVisibleLocalities(geography, viewBox, options = {}) {
  const localities = geography.localities?.localities || [];
  const projection = projectionForGeography(geography);
  const current = clampMapViewBox(geography, viewBox || fullMapViewBox(geography));
  const zoom = mapZoomLevel(geography, current);
  const tierLimit = zoom < 1.55 ? 1 : zoom < 2.6 ? 2 : zoom < 4.2 ? 3 : zoom < 6.2 ? 4 : 5;
  const maxCount = options.maxCount || (zoom < 1.55 ? 18 : zoom < 2.6 ? 48 : zoom < 4.2 ? 95 : zoom < 6.2 ? 150 : 220);
  const selectedId = options.selectedLocalityId;
  const margin = 12 / zoom;
  const visible = [];
  for (const locality of localities) {
    const [x, y] = projection.project([locality.lon, locality.lat]);
    if (x < current.x - margin || x > current.x + current.width + margin || y < current.y - margin || y > current.y + current.height + margin) {
      continue;
    }
    const tier = markerTier(locality);
    if (tier > tierLimit && locality.id !== selectedId) continue;
    visible.push({ locality, tier, x, y });
  }
  return visible
    .sort((a, b) => (a.locality.id === selectedId ? -1 : b.locality.id === selectedId ? 1 : a.tier - b.tier || b.locality.importance - a.locality.importance))
    .slice(0, maxCount);
}

export function nearestVisibleLocality(geography, viewBox, x, y, maxDistanceProjected) {
  let best = null;
  for (const marker of selectVisibleLocalities(geography, viewBox)) {
    const distance = Math.hypot(marker.x - x, marker.y - y);
    if (distance <= maxDistanceProjected && (!best || distance < best.distance)) {
      best = { ...marker, distance };
    }
  }
  return best;
}

function renderLocalityMarkers(geography, projection, viewBox, selection = {}, renderedWidth = LABEL_COLLISION_WIDTH) {
  const current = viewBox || fullMapViewBox(geography);
  const markers = selectVisibleLocalities(geography, current, { selectedLocalityId: selection.localityId });
  const zoom = mapZoomLevel(geography, current);
  const screenScale = Math.max(0.12, Math.min(2.4, current.width / renderedWidth));
  const labels = declutterLocalityLabels(markers, current, { collisionWidth: renderedWidth, selectedLocalityId: selection.localityId, zoom });
  return markers.map(({ locality, tier, x, y }) => {
    const selected = locality.id === selection.localityId;
    const label = labels.get(locality.id);
    const style = markerStyle(tier, selected);
    const classes = ["locality-marker", `tier-${tier}`];
    if (selected) classes.push("selected");
    return `
      <g class="${classes.join(" ")}" data-locality-id="${escapeHtml(locality.id)}" data-label-visible="${label ? "true" : "false"}" tabindex="0" role="button" aria-label="${escapeHtml(localityDisplayLabel(locality))}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${screenScale.toFixed(4)})">
        <circle r="${style.radius.toFixed(2)}"></circle>
        ${label ? `<text class="locality-label" x="${label.x.toFixed(1)}" y="${label.y.toFixed(1)}" text-anchor="${label.anchor}" data-label-position="${label.position}" style="font-size:${label.fontSize.toFixed(1)}px;font-weight:${label.fontWeight};">${escapeHtml(locality.name)}</text>` : ""}
      </g>
    `;
  }).join("");
}

export function renderClimateMap(target, geography, selection = {}) {
  if (!target) return;
  const projection = projectionForGeography(geography);
  const selectedZone = selection.zone;
  const hoveredZone = selection.hoveredZone;
  const viewBox = clampMapViewBox(geography, selection.viewBox || fullMapViewBox(geography));
  const renderedWidth = renderedCollisionWidth(target);
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
  const boundaryPaths = (geography.zones?.features || []).map((feature) => {
    const zone = feature.properties?.zone;
    return `<path class="climate-zone-boundary" d="${geometryPath(feature.geometry, projection)}" data-zone="${zone}"></path>`;
  }).join("");
  const zoom = mapZoomLevel(geography, viewBox);
  const pin = Number.isFinite(selection.lon) && Number.isFinite(selection.lat)
    ? (() => {
        const [x, y] = projection.project([selection.lon, selection.lat]);
        const pinScale = Math.max(0.16, Math.min(2.4, viewBox.width / renderedWidth));
        return `<g class="location-pin" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${pinScale.toFixed(4)})"><circle r="7"></circle><path d="M0 -18 L5 -3 L0 0 L-5 -3 Z"></path></g>`;
      })()
    : "";
  target.innerHTML = `
    <svg class="climate-map-svg" viewBox="${viewBoxToString(viewBox)}" preserveAspectRatio="xMidYMid meet" data-projection="canonical-geojson-local-equirectangular" data-viewbox-ratio="${(projection.width / projection.height).toFixed(6)}" data-zoom="${zoom.toFixed(2)}" aria-label="Zone climatice de iarna">
      <defs>
        <linearGradient id="climateMapPaper" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7fafc"></stop>
          <stop offset="100%" stop-color="#edf3f6"></stop>
        </linearGradient>
      </defs>
      <rect class="map-bg" x="0" y="0" width="${projection.width.toFixed(2)}" height="${projection.height.toFixed(2)}" rx="10"></rect>
      <path class="romania-map-shadow" d="${boundaryPath}"></path>
      <g class="technical-hit-layer" aria-hidden="true">
        ${technicalPaths}
      </g>
      <path class="romania-silhouette" d="${boundaryPath}"></path>
      <g class="presentation-layer">
        ${visualPaths}
      </g>
      <g class="climate-zone-boundary-layer" aria-hidden="true">
        ${boundaryPaths}
      </g>
      <path class="romania-outline-soft" d="${boundaryPath}"></path>
      <g class="locality-layer" aria-label="Localitati vizibile">
        ${renderLocalityMarkers(geography, projection, viewBox, selection, renderedWidth)}
      </g>
      <path class="romania-outline" d="${boundaryPath}"></path>
      ${pin}
    </svg>
  `;
}
