import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  findZoneForPoint,
  localityOptions,
  resolveLocalityClimate,
  validateGeographyAssets
} from "../js/lacurent-geography.mjs";
import {
  buildSimpleInputContract,
  deriveGeometry,
  readinessIssues
} from "../js/lacurent-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

const html = read("pages/analiza-casa.html");
const workspace = read("js/lacurent-workspace.mjs");
const contract = read("js/lacurent-contract.mjs");
const css = read("css/style.css");

assert.match(html, /Localizare/);
assert.match(html, /climateMap/);
assert.match(html, /Tip vizual de cladire/);
assert.match(html, /Casa P\+1/);
assert.match(html, /assembly-strip/);
assert.match(html, /Acelasi generator pentru incalzire si ACM/);
assert.match(workspace + contract, /Serviciul de calcul nu este disponibil/);
assert.doesNotMatch(html, /generatorRef|Building DNA|Incarca exemplu|demo|Chapter 2|Chapter 3|Chapter 4/);
assert.doesNotMatch(workspace, /src\/physics-engine|calculateMc001|demoOldHouseInput|building-platform-wizard/);
assert.doesNotMatch(contract, /src\/physics-engine|building-platform-wizard|synthetic_demo/);
assert.match(css, /climate-map/);
assert.match(css, /building-silhouette/);

for (const file of [
  "assets/geography/climate-zones/winter-climate-zones.geojson",
  "assets/geography/climate-zones/romania-boundary.geojson",
  "assets/geography/climate-zones/climate-zone-oracle.json",
  "assets/geography/climate-zones/provenance.json",
  "assets/geography/climate-zones/winter-climate-zones.svg",
  "assets/geography/climate-zones/winter-climate-zones.png"
]) {
  assert.equal(fs.existsSync(path.join(repoRoot, file)), true, `${file} must exist`);
}

const zones = json("assets/geography/climate-zones/winter-climate-zones.geojson");
const boundary = json("assets/geography/climate-zones/romania-boundary.geojson");
const oracle = json("assets/geography/climate-zones/climate-zone-oracle.json");
const provenance = json("assets/geography/climate-zones/provenance.json");
const validation = validateGeographyAssets(zones, boundary, oracle, provenance);
assert.deepEqual(validation.errors, []);
assert.equal(validation.zoneCount, 5);
assert.equal(validation.oracleCount, 9);
assert.equal(provenance.geometry_source.accuracy.includes("UI / preliminary geographic lookup"), true);

for (const point of oracle.points) {
  assert.equal(findZoneForPoint(zones, point.lon, point.lat), point.expected_zone, point.name);
}

const geography = { zones, boundary, oracle, provenance, validation };
const cluj = resolveLocalityClimate("cluj napoca", geography);
assert.equal(cluj.zone, "III");
assert.equal(cluj.designTemperatureC, -18);
assert.equal(cluj.station, "Cluj-Napoca");
assert.equal(localityOptions(oracle).length, 9);

const values = {
  project: { name: "P12C visual" },
  location: { locality: "cluj-napoca" },
  building: { visualType: "house-p1", lengthM: 10, widthM: 8, floorHeightM: 2.7 },
  envelope: {
    wallAreaM2: 120,
    roofUValueWPerM2K: 0.2,
    floorUValueWPerM2K: 0.3,
    wallUValueWPerM2K: 0.4,
    windowAreaM2: 16,
    windowUValueWPerM2K: 1.2
  },
  systems: {
    heating: { enabled: true, generator: "condensing_boiler", carrier: "natural_gas", sameGeneratorAsDhw: true },
    domesticHotWater: { enabled: true, monthlyUsefulDemandKWh: 80 },
    sharedGeneratorAllocation: { heating: 0.7, dhw: 0.3 }
  },
  renewables: { photovoltaic: { enabled: true, annualProductionKWh: 4200 } }
};
const geometry = deriveGeometry(values);
assert.equal(geometry.footprintM2, 80);
assert.equal(geometry.usefulAreaM2, 160);
assert.equal(geometry.heatedVolumeM3, 432);
assert.equal(readinessIssues(values).length, 0);
const simple = buildSimpleInputContract(values, { projectId: "p12c" });
assert.equal(simple.building.type, "single_family_house");
assert.equal(simple.building.levels, 2);
assert.equal(simple.building.visualType, "house-p1");
assert.equal(simple.systems.heating.sameGeneratorAsDhw, true);
assert.equal(simple.renewables.photovoltaic.annualProductionKWh, 4200);
assert.equal(Object.hasOwn(buildSimpleInputContract({}).building, "lengthM"), false);

const buildScript = read("scripts/build-pages.mjs");
assert.match(buildScript, /"assets"/);

console.log(JSON.stringify({
  status: "PASS",
  climateOraclePoints: oracle.points.length,
  visualBuildingTypes: (html.match(/building\.visualType/g) || []).length,
  buildingDnaFrontendDependencyPresent: false,
  jsPhysicsProductRuntimePresent: false
}, null, 2));
