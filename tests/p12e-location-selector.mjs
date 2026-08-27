import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  clampMapViewBox,
  findZoneForPoint,
  fullMapViewBox,
  mapClientPointToClimateZone,
  mapZoomLevel,
  nearestVisibleLocality,
  panMapViewBox,
  prepareLocalityDataset,
  projectGeographicPoint,
  renderClimateMap,
  resolveLocalityClimate,
  searchLocalities,
  selectVisibleLocalities,
  validateGeographyAssets,
  validateLocalityDataset,
  zoomMapViewBox
} from "../js/lacurent-geography.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

const zones = json("assets/geography/climate-zones/winter-climate-zones.geojson");
const boundary = json("assets/geography/climate-zones/romania-boundary.geojson");
const oracle = json("assets/geography/climate-zones/climate-zone-oracle.json");
const provenance = json("assets/geography/climate-zones/provenance.json");
const localityRaw = json("assets/geography/romania-localities/localities.json");
const localities = prepareLocalityDataset(localityRaw);
const geography = { zones, boundary, oracle, provenance, localities };

assert.deepEqual(validateGeographyAssets(zones, boundary, oracle, provenance).errors, []);
assert.deepEqual(validateLocalityDataset(localityRaw).errors, []);
assert.equal(localityRaw.stats.localityCount, 13622);
assert.equal(localityRaw.stats.countyCount, 42);
assert.equal(localityRaw.stats.uatCount, 3181);
assert.equal(localityRaw.stats.coordinateCount, localityRaw.stats.localityCount);
assert.equal(localityRaw.source.sourceLayerDate, "31.12.2020");

const cluj = searchLocalities(localities, "Cluj")[0];
assert.equal(cluj.name, "Cluj-Napoca");
assert.equal(cluj.county, "Cluj");
const brasov = searchLocalities(localities, "Brasov")[0];
assert.equal(brasov.name, "Brașov");
assert.equal(brasov.county, "Brașov");
const floresti = searchLocalities(localities, "Floresti", { limit: 20 });
assert.ok(floresti.length >= 5);
assert.ok(floresti.some((item) => item.name === "Florești" && item.county === "Cluj" && item.localityType === "comuna"));
assert.ok(floresti.some((item) => item.name === "Florești" && item.county === "Mehedinți"));
const village = searchLocalities(localities, "Drambar")[0];
assert.equal(village.name, "Drâmbar");
assert.equal(village.localityType, "sat");

for (const locality of [cluj, brasov, floresti.find((item) => item.county === "Cluj"), village]) {
  const zone = findZoneForPoint(zones, locality.lon, locality.lat);
  const resolved = resolveLocalityClimate(locality.id, geography);
  assert.equal(resolved.zone, zone, locality.name);
  assert.equal(resolved.value, locality.id);
  assert.equal(Number.isFinite(resolved.designTemperatureC), true);
}

assert.equal(resolveLocalityClimate(cluj.id, geography).station, "Cluj-Napoca");
assert.equal(resolveLocalityClimate(village.id, geography).station, null);
assert.equal(resolveLocalityClimate(village.id, geography).dataAvailability, "climate_zone_available_station_requires_provider_mapping");

const full = fullMapViewBox(geography);
const clujPoint = projectGeographicPoint(geography, cluj.lon, cluj.lat);
const zoomed = zoomMapViewBox(geography, full, 0.35, clujPoint);
assert.ok(mapZoomLevel(geography, zoomed) > 2.5);
assert.ok(zoomed.width < full.width);
const panned = panMapViewBox(geography, zoomed, 200, 120);
const clamped = clampMapViewBox(geography, { ...zoomed, x: -1000, y: -1000 });
assert.equal(clamped.x, 0);
assert.equal(clamped.y, 0);
assert.ok(panned.x >= 0 && panned.y >= 0);

const nationalMarkers = selectVisibleLocalities(geography, full);
const closeMarkers = selectVisibleLocalities(geography, zoomed, { selectedLocalityId: cluj.id });
assert.ok(nationalMarkers.length <= 18);
assert.ok(closeMarkers.length > nationalMarkers.length);
assert.ok(closeMarkers.some((marker) => marker.locality.id === cluj.id));
const nearestCluj = nearestVisibleLocality(geography, zoomed, clujPoint.x, clujPoint.y, 5);
assert.equal(nearestCluj.locality.id, cluj.id);

const target = { innerHTML: "" };
renderClimateMap(target, geography, { ...resolveLocalityClimate(cluj.id, geography), localityId: cluj.id, viewBox: zoomed });
assert.match(target.innerHTML, /class="locality-layer"/);
assert.match(target.innerHTML, /data-locality-id="siruta-54984"/);
assert.match(target.innerHTML, /data-zoom="/);
assert.match(target.innerHTML, /preserveAspectRatio="xMidYMid meet"/);

const fakeSvg = {
  matches(selector) {
    return selector === "svg";
  },
  getBoundingClientRect() {
    return {
      height: zoomed.height * 2,
      left: 50,
      top: 40,
      width: zoomed.width * 2
    };
  },
  viewBox: {
    baseVal: zoomed
  }
};
const clientHit = mapClientPointToClimateZone(
  fakeSvg,
  geography,
  50 + ((clujPoint.x - zoomed.x) * 2),
  40 + ((clujPoint.y - zoomed.y) * 2)
);
assert.equal(clientHit.zone, resolveLocalityClimate(cluj.id, geography).zone);

const html = read("pages/analiza-casa.html");
const workspace = read("js/lacurent-workspace.mjs");
const css = read("css/style.css");
assert.match(html, /role="combobox"/);
assert.match(html, /countySelect/);
assert.match(html, /mapZoomIn/);
assert.match(html, /mapReset/);
assert.match(workspace, /pointerdown/);
assert.match(workspace, /pointerDistance/);
assert.match(workspace, /targetLocalityId/);
assert.match(workspace, /selectLocality/);
assert.match(workspace, /setHiddenValue\("localityClimateZoneValue", hit\.zone\)/);
assert.match(css, /touch-action:none/);
assert.match(css, /pointer-events:none/);
assert.match(css, /locality-marker/);
assert.match(css, /width:min\(100%,1120px\)/);

console.log(JSON.stringify({
  status: "PASS",
  localityDatasetIntegrated: true,
  localities: localityRaw.stats.localityCount,
  counties: localityRaw.stats.countyCount,
  uats: localityRaw.stats.uatCount,
  duplicateSearchExamples: floresti.length,
  ruralVillage: village.name,
  nationalMarkers: nationalMarkers.length,
  closeZoomMarkers: closeMarkers.length,
  climateMap9PointOracleValidated: oracle.points.length
}, null, 2));
