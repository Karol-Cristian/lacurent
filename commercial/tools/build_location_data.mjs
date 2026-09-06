import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MC001_6_2013_CLIMATE_DATASET_VERSION,
  MC001_6_2013_CLIMATE_SOURCE_DOCUMENT,
  MC001_6_2013_CLIMATE_STATIONS,
  MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES,
  MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES
} from "../../src/climate-platform/datasets/mc001_6_2013ClimateDataset.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const outputDir = path.join(root, "commercial", "data");

const sourceLocalities = JSON.parse(
  fs.readFileSync(path.join(root, "assets", "geography", "romania-localities", "localities.json"), "utf8")
);
const sourceLocalityProvenance = JSON.parse(
  fs.readFileSync(path.join(root, "assets", "geography", "romania-localities", "provenance.json"), "utf8")
);
const climateZones = JSON.parse(
  fs.readFileSync(path.join(root, "assets", "geography", "climate-zones", "winter-climate-zones.geojson"), "utf8")
);
const romaniaBoundary = JSON.parse(
  fs.readFileSync(path.join(root, "assets", "geography", "climate-zones", "romania-boundary.geojson"), "utf8")
);
const climateZoneProvenance = JSON.parse(
  fs.readFileSync(path.join(root, "assets", "geography", "climate-zones", "provenance.json"), "utf8")
);

const MONTHS = [
  ["january", "ian", "Ianuarie", 31],
  ["february", "feb", "Februarie", 28],
  ["march", "mar", "Martie", 31],
  ["april", "apr", "Aprilie", 30],
  ["may", "mai", "Mai", 31],
  ["june", "iun", "Iunie", 30],
  ["july", "iul", "Iulie", 31],
  ["august", "aug", "August", 31],
  ["september", "sep", "Septembrie", 30],
  ["october", "oct", "Octombrie", 31],
  ["november", "nov", "Noiembrie", 30],
  ["december", "dec", "Decembrie", 31]
];

const DISPLAY_NAMES = new Map([
  ["ro_bacau", "Bacău"],
  ["ro_bistrita", "Bistrița"],
  ["ro_botosani", "Botoșani"],
  ["ro_braila", "Brăila"],
  ["ro_brasov", "Brașov"],
  ["ro_bucuresti", "București"],
  ["ro_buzau", "Buzău"],
  ["ro_calarasi", "Călărași"],
  ["ro_constanta", "Constanța"],
  ["ro_focsani", "Focșani"],
  ["ro_galati", "Galați"],
  ["ro_iasi", "Iași"],
  ["ro_piatra_neamt", "Piatra-Neamț"],
  ["ro_pitesti", "Pitești"],
  ["ro_ploiesti", "Ploiești"],
  ["ro_ramnicu_valcea", "Râmnicu Vâlcea"],
  ["ro_resita", "Reșița"],
  ["ro_sfantu_gheorghe", "Sfântu Gheorghe"],
  ["ro_targoviste", "Târgoviște"],
  ["ro_targu_jiu", "Târgu Jiu"],
  ["ro_targu_mures", "Târgu Mureș"],
  ["ro_timisoara", "Timișoara"],
  ["ro_zalau", "Zalău"]
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function round(value, digits = 6) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function geometryRings(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates || [];
  if (geometry.type === "MultiPolygon") return (geometry.coordinates || []).flat();
  return [];
}

function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(lon, lat, polygon) {
  if (!polygon?.length || !pointInRing(lon, lat, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(lon, lat, hole));
}

function findZoneForPoint(lon, lat) {
  for (const feature of climateZones.features || []) {
    const geometry = feature.geometry;
    const polygons = geometry?.type === "Polygon" ? [geometry.coordinates] : geometry?.coordinates || [];
    if (polygons.some((polygon) => pointInPolygon(lon, lat, polygon))) {
      return feature.properties?.zone || null;
    }
  }
  return null;
}

function haversineKm(a, b) {
  const earthKm = 6371.0088;
  const toRad = Math.PI / 180;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;
  const deltaLat = (b.lat - a.lat) * toRad;
  const deltaLon = (b.lon - a.lon) * toRad;
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

function localityImportance(locality) {
  const rankWeight = { 0: 7, I: 6, II: 5, III: 4, IV: 2, V: 1 }[locality.rank] || 1;
  return (rankWeight * 1_000_000) + (Number(locality.population2002) || 0);
}

const sourceById = new Map(sourceLocalities.localities.map((item) => [item.id, item]));
const sourceByName = new Map();
for (const item of sourceLocalities.localities) {
  const key = normalize(item.name);
  if (!sourceByName.has(key)) sourceByName.set(key, []);
  sourceByName.get(key).push(item);
}
for (const [, matches] of sourceByName) {
  matches.sort((a, b) => (Number(b.population2002) || 0) - (Number(a.population2002) || 0));
}

function sourceLocalityForStation(station) {
  const direct = sourceById.get(station.localityId);
  if (direct) return direct;
  const matches = sourceByName.get(normalize(station.localityName));
  return matches?.[0] || null;
}

function stationDisplayName(station, locality) {
  return locality?.name || DISPLAY_NAMES.get(station.localityId) || station.localityName;
}

const winterByStation = new Map(
  MC001_6_2013_WINTER_DESIGN_DAY_TEMPERATURES.rows.map((row) => [row.stationId, row])
);
const monthlyByStation = new Map(
  MC001_6_2013_MONTHLY_EXTERIOR_TEMPERATURES.rows.map((row) => [row.stationId, row])
);

const stationProfiles = MC001_6_2013_CLIMATE_STATIONS.map((station) => {
  const locality = sourceLocalityForStation(station);
  const monthly = monthlyByStation.get(station.stationId);
  const winter = winterByStation.get(station.stationId);
  const displayName = stationDisplayName(station, locality);
  const aliases = new Set([station.localityName, station.sourceLabel, displayName]);
  if (station.localityId === "ro_cluj_napoca") aliases.add("Cluj");
  const monthlyTemperatures = MONTHS.map(([sourceId, id, label, days]) => ({
    id,
    label,
    days,
    temperature_c: monthly?.monthlyMeanExteriorTemperatureC?.[sourceId]
  }));
  return {
    id: station.stationId,
    name: displayName,
    aliases: [...aliases].filter(Boolean).filter((name) => normalize(name) !== normalize(displayName)),
    locality_id: station.localityId,
    source_locality_id: locality?.id || null,
    source_label: station.sourceLabel,
    county: locality?.county || null,
    lon: locality ? round(locality.lon) : null,
    lat: locality ? round(locality.lat) : null,
    winter_design_mean_daily_temperature_c: winter?.meanDailyTemperatureC ?? null,
    monthly_temperatures: monthlyTemperatures
  };
});

const stationsWithCoordinates = stationProfiles.filter(
  (station) => Number.isFinite(station.lon) && Number.isFinite(station.lat)
);

function nearestStation(locality) {
  if (!Number.isFinite(locality.lon) || !Number.isFinite(locality.lat)) return null;
  let best = null;
  for (const station of stationsWithCoordinates) {
    const distance = haversineKm(locality, station);
    if (!best || distance < best.distance) {
      best = { station, distance };
    }
  }
  return best;
}

const climateZoneTemperatures = climateZoneProvenance?.normative_source?.temperature_c || {};
const localities = sourceLocalities.localities.map((locality) => {
  const zone = findZoneForPoint(locality.lon, locality.lat);
  const station = nearestStation(locality);
  const search = normalize([
    locality.name,
    locality.county,
    locality.countyMnemonic,
    locality.uatName,
    locality.localityType,
    locality.siruta
  ].filter(Boolean).join(" "));
  return {
    id: locality.id,
    siruta: locality.siruta,
    name: locality.name,
    county: locality.county,
    countyMnemonic: locality.countyMnemonic,
    uatSiruta: locality.uatSiruta,
    uatName: locality.uatName,
    localityType: locality.localityType,
    typeCode: locality.typeCode,
    rank: locality.rank,
    population2002: locality.population2002,
    lon: round(locality.lon),
    lat: round(locality.lat),
    importance: localityImportance(locality),
    search,
    climateZone: zone,
    winterDesignTemperatureC: zone ? climateZoneTemperatures[zone] ?? null : null,
    stationId: station?.station.id || null,
    stationName: station?.station.name || null,
    stationDistanceKm: station ? round(station.distance, 1) : null,
    stationResolution: station && station.station.source_locality_id === locality.id ? "exact" : "nearest"
  };
});

const counties = [...new Set(localities.map((item) => item.county))]
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b, "ro"));

const climateOutput = {
  version: "mc001-6-2013-commercial-romania-locality-v1",
  source: "Expanded from the existing LaCurent MC001/6-2013 climate dataset and Romanian locality geography already present in the repository.",
  source_document: MC001_6_2013_CLIMATE_SOURCE_DOCUMENT,
  source_dataset_version: MC001_6_2013_CLIMATE_DATASET_VERSION,
  station_resolution: "Exact MC001 station when the selected locality is one of the 42 source stations; otherwise nearest MC001/6-2013 station by WGS84 locality point distance.",
  months: MONTHS.map(([, id, label, days]) => ({ id, label, days })),
  localities: stationProfiles
};

const localityOutput = {
  schema: "lacurent_commercial_romanian_localities_v1",
  source_schema: sourceLocalities.schema,
  source: {
    ...sourceLocalities.source,
    provenance: sourceLocalityProvenance
  },
  transformation: "Copied the existing source-backed locality points into the commercial app, retaining only UI/calculation fields plus derived climate-zone and nearest MC001 station references.",
  climate_station_source: MC001_6_2013_CLIMATE_SOURCE_DOCUMENT,
  station_resolution: climateOutput.station_resolution,
  stats: {
    counties: counties.length,
    uats: new Set(localities.map((item) => item.uatSiruta)).size,
    localities: localities.length,
    withCoordinates: localities.filter((item) => Number.isFinite(item.lon) && Number.isFinite(item.lat)).length,
    withClimateZone: localities.filter((item) => item.climateZone).length,
    withStation: localities.filter((item) => item.stationId).length
  },
  counties,
  climateZoneTemperatures,
  localities
};

fs.writeFileSync(path.join(outputDir, "climate.json"), `${JSON.stringify(climateOutput, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "localities.json"), `${JSON.stringify(localityOutput)}\n`);
fs.writeFileSync(path.join(outputDir, "winter-climate-zones.geojson"), `${JSON.stringify(climateZones)}\n`);
fs.writeFileSync(path.join(outputDir, "romania-boundary.geojson"), `${JSON.stringify(romaniaBoundary)}\n`);
fs.writeFileSync(path.join(outputDir, "geography-provenance.json"), `${JSON.stringify({
  climate_zones: climateZoneProvenance,
  localities: sourceLocalityProvenance
}, null, 2)}\n`);

console.log(JSON.stringify({
  stations: stationProfiles.length,
  stationCoordinates: stationsWithCoordinates.length,
  counties: localityOutput.stats.counties,
  uats: localityOutput.stats.uats,
  localities: localityOutput.stats.localities,
  withClimateZone: localityOutput.stats.withClimateZone,
  withStation: localityOutput.stats.withStation
}, null, 2));
