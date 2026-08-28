import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  declutterLocalityLabels,
  findZoneForPoint,
  fullMapViewBox,
  mapClientPointToClimateZone,
  projectGeographicPoint,
  prepareLocalityDataset,
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

function overlaps(a, b, padding = 4) {
  return !(a.x2 + padding < b.x1 || a.x1 - padding > b.x2 || a.y2 + padding < b.y1 || a.y1 - padding > b.y2);
}

function assertNoLabelOverlap(labels, message) {
  const entries = [...labels.values()];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      assert.equal(overlaps(entries[i].box, entries[j].box), false, message);
    }
  }
}

const zones = json("assets/geography/climate-zones/winter-climate-zones.geojson");
const boundary = json("assets/geography/climate-zones/romania-boundary.geojson");
const oracle = json("assets/geography/climate-zones/climate-zone-oracle.json");
const provenance = json("assets/geography/climate-zones/provenance.json");
const localityRaw = json("assets/geography/romania-localities/localities.json");
const localities = prepareLocalityDataset(localityRaw);
const geography = { zones, boundary, oracle, provenance, localities };

assert.deepEqual(validateGeographyAssets(zones, boundary, oracle, provenance).errors, []);

const full = fullMapViewBox(geography);
const cluj = searchLocalities(localities, "Cluj-Napoca")[0];
const village = searchLocalities(localities, "Drambar")[0];
const clujPoint = projectGeographicPoint(geography, cluj.lon, cluj.lat);
const villagePoint = projectGeographicPoint(geography, village.lon, village.lat);
const regional = zoomMapViewBox(geography, full, 0.32, clujPoint);
const local = zoomMapViewBox(geography, full, 0.16, villagePoint);

const nationalMarkers = selectVisibleLocalities(geography, full);
const nationalLabels = declutterLocalityLabels(nationalMarkers, full, { zoom: 1 });
assert.ok(nationalLabels.size <= 8, "national view must stay label-sparse");
assertNoLabelOverlap(nationalLabels, "national labels must not overlap");

const regionalMarkers = selectVisibleLocalities(geography, regional, { selectedLocalityId: cluj.id });
const regionalLabels = declutterLocalityLabels(regionalMarkers, regional, { selectedLocalityId: cluj.id, zoom: 3.1 });
assert.ok(regionalLabels.size > nationalLabels.size, "regional zoom should progressively admit more labels");
assert.ok(regionalLabels.size <= 28, "regional labels must remain capped");
assert.ok(regionalLabels.has(cluj.id), "selected city label must stay visible");
assertNoLabelOverlap(regionalLabels, "regional labels must not overlap");

const localMarkers = selectVisibleLocalities(geography, local, { selectedLocalityId: village.id });
const localLabels = declutterLocalityLabels(localMarkers, local, { selectedLocalityId: village.id, zoom: 6.2 });
assert.ok(localLabels.has(village.id), "selected rural locality label must stay visible");
assert.ok(localLabels.size <= 48, "local labels must remain bounded after decluttering");
assertNoLabelOverlap(localLabels, "local labels must not overlap");
assert.ok(new Set([...localLabels.values()].map((label) => label.position)).size >= 2 || localLabels.size < 2);

const artificialLabels = declutterLocalityLabels([
  { locality: { id: "major", name: "Municipiu", importance: 10_000 }, tier: 1, x: 60, y: 60 },
  { locality: { id: "village", name: "Sat", importance: 1 }, tier: 5, x: 170, y: 170 }
], { x: 0, y: 0, width: 260, height: 180 }, { zoom: 5 });
assert.ok(artificialLabels.get("major").fontSize > artificialLabels.get("village").fontSize);

const target = { innerHTML: "" };
renderClimateMap(target, geography, { ...resolveLocalityClimate(cluj.id, geography), localityId: cluj.id, viewBox: regional });
assert.match(target.innerHTML, /class="romania-silhouette"/);
assert.match(target.innerHTML, /class="romania-outline-soft"/);
assert.match(target.innerHTML, /data-label-position="/);
assert.match(target.innerHTML, /data-label-visible="true"/);
assert.match(target.innerHTML, /scale\(0\./);

for (const point of oracle.points) {
  assert.equal(findZoneForPoint(zones, point.lon, point.lat), point.expected_zone, point.name);
  const projected = projectGeographicPoint(geography, point.lon, point.lat);
  const fakeSvg = {
    matches(selector) {
      return selector === "svg";
    },
    getBoundingClientRect() {
      return {
        height: full.height * 1.8,
        left: 22,
        top: 18,
        width: full.width * 1.8
      };
    },
    viewBox: { baseVal: full }
  };
  assert.equal(
    mapClientPointToClimateZone(fakeSvg, geography, 22 + (projected.x * 1.8), 18 + (projected.y * 1.8)).zone,
    point.expected_zone,
    `${point.name} visual-to-technical hit`
  );
}

const css = read("css/style.css");
const html = read("pages/analiza-casa.html");
assert.match(css, /grid-template-columns:minmax\(248px,292px\) minmax\(0,2\.65fr\)/);
assert.match(css, /min-height:620px/);
assert.match(css, /width:min\(100%,1120px\)/);
assert.match(css, /romania-silhouette/);
assert.match(css, /locality-marker\.tier-5 circle/);
assert.match(html, /lacurent-workspace\.mjs\?v=(p12e2|p12g|p12h2)/);

console.log(JSON.stringify({
  status: "PASS",
  climateMapWorkspaceExpanded: true,
  localityLabelCollisionAvoidance: true,
  nationalLabels: nationalLabels.size,
  regionalLabels: regionalLabels.size,
  localLabels: localLabels.size,
  climateMap9PointOracleValidated: oracle.points.length
}, null, 2));
