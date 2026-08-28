import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  declutterLocalityLabels,
  findZoneForPoint,
  fullMapViewBox,
  prepareLocalityDataset,
  renderClimateLegend,
  renderClimateMap,
  resolveLocalityClimate,
  searchLocalities,
  selectVisibleLocalities,
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

function visualFill(html, zone) {
  const match = html.match(new RegExp(`<path class="[^"]*climate-zone[^"]*visual-zone[^"]*"[^>]+fill="([^"]+)"[^>]+data-zone="${zone}"`));
  return match?.[1] || null;
}

const zones = json("assets/geography/climate-zones/winter-climate-zones.geojson");
const boundary = json("assets/geography/climate-zones/romania-boundary.geojson");
const oracle = json("assets/geography/climate-zones/climate-zone-oracle.json");
const provenance = json("assets/geography/climate-zones/provenance.json");
const localityRaw = json("assets/geography/romania-localities/localities.json");
const localities = prepareLocalityDataset(localityRaw);
const geography = { zones, boundary, oracle, provenance, localities };

assert.deepEqual(validateGeographyAssets(zones, boundary, oracle, provenance).errors, []);

const cluj = searchLocalities(localities, "Cluj-Napoca")[0];
const full = fullMapViewBox(geography);
const clujView = zoomMapViewBox(geography, full, 0.32, resolveLocalityClimate(cluj.id, geography));
const target = { innerHTML: "" };
renderClimateMap(target, geography, { ...resolveLocalityClimate(cluj.id, geography), localityId: cluj.id, viewBox: clujView });

assert.doesNotMatch(target.innerHTML, /zone-label-layer/);
assert.doesNotMatch(target.innerHTML, /class="zone-label/);
assert.match(target.innerHTML, /class="romania-map-shadow"/);
assert.match(target.innerHTML, /class="climate-zone-boundary-layer"/);

assert.equal(visualFill(target.innerHTML, "I"), "#F08A4B");
assert.equal(visualFill(target.innerHTML, "II"), "#F3D65C");
assert.equal(visualFill(target.innerHTML, "III"), "#86B982");

const legend = { innerHTML: "" };
renderClimateLegend(legend, geography, "III");
assert.match(legend.innerHTML, /Zona I -12 °C/);
assert.match(legend.innerHTML, /background:#F08A4B/);
assert.match(legend.innerHTML, /Zona II -15 °C/);
assert.match(legend.innerHTML, /background:#F3D65C/);

const markers = selectVisibleLocalities(geography, clujView, { selectedLocalityId: cluj.id });
const labels = declutterLocalityLabels(markers, clujView, { selectedLocalityId: cluj.id, zoom: 3.1 });
assert.ok(labels.has(cluj.id), "selected locality label must stay visible");
assert.ok(labels.size <= 28, "P12E1 label decluttering must remain active");

for (const point of oracle.points) {
  assert.equal(findZoneForPoint(zones, point.lon, point.lat), point.expected_zone, point.name);
}

const css = read("css/style.css");
const html = read("pages/analiza-casa.html");
const workspace = read("js/lacurent-workspace.mjs");
assert.match(css, /romania-map-shadow/);
assert.match(css, /climate-zone-boundary/);
assert.doesNotMatch(css, /\.zone-label/);
assert.match(html, /lacurent-workspace\.mjs\?v=(p12e2|p12g)/);
assert.match(workspace, /lacurent-geography\.mjs\?v=p12e2/);

console.log(JSON.stringify({
  status: "PASS",
  internalZoneNumeralsRemoved: true,
  zoneIColor: "#F08A4B",
  zoneIIColor: "#F3D65C",
  legendUpdated: true,
  visualLayerRedesigned: true,
  climateMap9PointOracleValidated: oracle.points.length
}, null, 2));
