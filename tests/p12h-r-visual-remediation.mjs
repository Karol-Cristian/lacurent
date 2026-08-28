import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  findZoneForPoint,
  fullMapViewBox,
  prepareLocalityDataset,
  renderClimateMap,
  resolveLocalityClimate,
  searchLocalities,
  validateGeographyAssets,
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

const html = read("pages/analiza-casa.html");
const css = read("css/style.css");
const workspace = read("js/lacurent-workspace.mjs");

assert.match(html, /lacurent-workspace\.mjs\?v=p12hr2/);
assert.match(html, /style\.css\?v=p12hr2/);
assert.match(workspace, /lacurent-geography\.mjs\?v=p12hr2/);
assert.match(css, /P12H-R: reference-driven visual acceptance remediation/);
assert.match(css, /\.climate-map-svg,\s*\.climate-map-svg \*:focus\{\s*outline:none;/);
assert.match(css, /\.climate-map\{[\s\S]*?border:0;/);
assert.match(css, /\.cartographic-base-layer/);
assert.match(css, /\.climate-zone\{[\s\S]*?mix-blend-mode:multiply;/);
assert.doesNotMatch(css, /\.zone-label/);

const zones = json("assets/geography/climate-zones/winter-climate-zones.geojson");
const boundary = json("assets/geography/climate-zones/romania-boundary.geojson");
const oracle = json("assets/geography/climate-zones/climate-zone-oracle.json");
const provenance = json("assets/geography/climate-zones/provenance.json");
const localityRaw = json("assets/geography/romania-localities/localities.json");
const localities = prepareLocalityDataset(localityRaw);
const geography = { zones, boundary, oracle, provenance, localities };

assert.deepEqual(validateGeographyAssets(zones, boundary, oracle, provenance).errors, []);

const cluj = searchLocalities(localities, "Cluj-Napoca")[0];
const clujClimate = resolveLocalityClimate(cluj.id, geography);
const viewBox = zoomMapViewBox(geography, fullMapViewBox(geography), 0.34, clujClimate);
const target = { innerHTML: "", clientWidth: 920 };

renderClimateMap(target, geography, { ...clujClimate, localityId: cluj.id, viewBox });

assert.doesNotMatch(target.innerHTML, /<rect\b/i, "map renderer must not reintroduce a visible rectangular SVG frame");
assert.doesNotMatch(target.innerHTML, /class="map-bg"/);
assert.match(target.innerHTML, /id="romaniaClip"/);
assert.match(target.innerHTML, /class="cartographic-base-layer"/);
assert.match(target.innerHTML, /class="terrain-contour/);
assert.match(target.innerHTML, /class="terrain-ridge/);
assert.match(target.innerHTML, /class="presentation-layer climate-overlay-layer"/);
assert.match(target.innerHTML, /class="technical-hit-layer"/);
assert.match(target.innerHTML, /class="[^"]*climate-zone[^"]*visual-zone[^"]*selected/);
assert.match(target.innerHTML, /class="location-pin"/);
assert.doesNotMatch(target.innerHTML, /zone-label-layer|class="zone-label/);

for (const point of oracle.points) {
  assert.equal(findZoneForPoint(zones, point.lon, point.lat), point.expected_zone, point.name);
}

console.log(JSON.stringify({
  status: "PASS",
  previousVisualAcceptanceOverridden: true,
  mapRectangleRegressionRemoved: true,
  cartographicBaseLayerPresent: true,
  climateLayerRenderedAsOverlay: true,
  climateTechnicalGeometryCanonical: true,
  climateMap9PointOracleValidated: oracle.points.length
}, null, 2));
