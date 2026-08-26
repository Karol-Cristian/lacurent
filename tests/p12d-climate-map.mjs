import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  boundsForFeatureCollections,
  createClimateMapProjection,
  findZoneForPoint,
  mapClientPointToClimateZone,
  projectGeographicPoint,
  renderClimateMap,
  resolveProjectedClimateZone,
  validateGeographyAssets
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
const geography = { zones, boundary, oracle, provenance };

const validation = validateGeographyAssets(zones, boundary, oracle, provenance);
assert.deepEqual(validation.errors, []);
assert.equal(validation.oracleCount, 9);

const projection = createClimateMapProjection(zones, boundary);
const bounds = boundsForFeatureCollections(zones, boundary);
const rawDegreeRatio = (bounds.maxLon - bounds.minLon) / (bounds.maxLat - bounds.minLat);
const projectedRatio = projection.width / projection.height;
assert.ok(projection.lonScale < 0.75, "longitude must be scaled by latitude to preserve Romania proportions");
assert.ok(projectedRatio < rawDegreeRatio * 0.9, "projected viewBox must not use the raw distorted lon/lat aspect");

const target = { innerHTML: "" };
renderClimateMap(target, geography, { zone: "III" });
assert.match(target.innerHTML, /preserveAspectRatio="xMidYMid meet"/);
assert.match(target.innerHTML, /data-projection="canonical-geojson-local-equirectangular"/);
assert.match(target.innerHTML, /class="technical-hit-layer"/);
assert.match(target.innerHTML, /class="presentation-layer"/);
assert.match(target.innerHTML, /class="climate-zone visual-zone selected"/);

for (const point of oracle.points) {
  const dataLayerZone = findZoneForPoint(zones, point.lon, point.lat);
  assert.equal(dataLayerZone, point.expected_zone, `${point.name} data oracle`);

  const projected = projectGeographicPoint(geography, point.lon, point.lat);
  const projectedHit = resolveProjectedClimateZone(geography, projected.x, projected.y);
  assert.equal(projectedHit.zone, point.expected_zone, `${point.name} projected hit`);

  const fakeSvg = {
    matches(selector) {
      return selector === "svg";
    },
    getBoundingClientRect() {
      return {
        height: projection.height * 1.7,
        left: 40,
        top: 20,
        width: projection.width * 1.7
      };
    },
    viewBox: {
      baseVal: {
        height: projection.height,
        width: projection.width,
        x: 0,
        y: 0
      }
    }
  };
  const clientHit = mapClientPointToClimateZone(
    fakeSvg,
    geography,
    40 + (projected.x * 1.7),
    20 + (projected.y * 1.7)
  );
  assert.equal(clientHit.zone, point.expected_zone, `${point.name} client coordinate hit`);
}

const workspace = read("js/lacurent-workspace.mjs");
const html = read("pages/analiza-casa.html");
const css = read("css/style.css");
assert.match(workspace, /pointerup/);
assert.match(workspace, /mapClientPointToClimateZone/);
assert.match(workspace, /Zona selectata pe harta/);
assert.match(html, /role="group" aria-label="Harta interactiva/);
assert.match(css, /height:auto/);
assert.match(css, /stroke-dasharray/);

console.log(JSON.stringify({
  status: "PASS",
  climateDataOracleValidated: true,
  mapProjectionRatio: Number(projectedRatio.toFixed(4)),
  rawDegreeRatio: Number(rawDegreeRatio.toFixed(4)),
  clickSelectionCases: oracle.points.length,
  visualTechnicalAlignmentProven: true
}, null, 2));
