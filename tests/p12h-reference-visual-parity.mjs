import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assertNotContains(source, tokens, label) {
  for (const token of tokens) {
    assert.equal(source.includes(token), false, `${label} still contains ${token}`);
  }
}

const html = read("pages/analiza-casa.html");
const css = read("css/style.css");
const workspace = read("js/lacurent-workspace.mjs");
const contract = read("js/lacurent-contract.mjs");

assert.match(html, /lacurent-workspace\.mjs\?v=p12h2/);
assert.match(html, /class="workspace-topbar reference-topbar"/);
assert.match(html, /id="workspaceStepNumber"/);
assert.match(html, /id="topbarReadiness"/);
assert.match(html, /class="rail-group-label">PROJECT/);

assert.match(html, /overview-reference-grid/);
assert.match(html, /location-reference-grid/);
assert.match(html, /building-reference-grid/);
assert.match(html, /envelope-reference-grid/);
assert.match(html, /systems-reference-grid/);
assert.match(html, /scenario-reference-grid/);
assert.match(html, /results-reference-grid/);

assert.match(css, /P12H: reference-driven professional product composition/);
assert.match(css, /grid-template-columns:202px minmax\(0,1fr\)/);
assert.match(css, /\.step-number/);
assert.match(css, /\.reference-house/);
assert.match(css, /\.facade-model/);
assert.match(css, /\.system-tabs/);
assert.match(css, /\.scenario-visual-comparison/);
assert.match(css, /\.classification-boundary/);

assert.match(workspace, /SECTION_META/);
assert.match(workspace, /workspaceStepNumber/);
assert.match(workspace, /topbarReadiness/);
assert.match(workspace, /writeLocationHiddenFields/);
assert.match(workspace, /collectSynchronizedValues/);
assert.match(workspace, /state\.values = collectSynchronizedValues\(\);\s+saveWorkspaceState\(state\);\s+refreshAll\(\{ stale \}\);\s+state\.values = collectSynchronizedValues\(\);/);
assert.match(workspace, /let values = collectSynchronizedValues\(\);\s+state\.values = values;\s+updateLocation\(values\);\s+values = collectSynchronizedValues\(\);/);
assert.match(workspace, /lacurent-geography\.mjs\?v=p12e2/);

assertNotContains(html + css + workspace + contract, [
  "HW_Prototype",
  "workspace-hero",
  "product-hero",
  "Calculator Python",
  "Python MC001",
  "hardware",
  "server",
  "generatorRef",
  "Building DNA",
  "demoOldHouseInput",
  "building-platform-wizard"
], "P12H active product");

assertNotContains(html, [
  "Clasa energetica",
  "A+",
  "Economii 23",
  "24 kW",
  "12.1 MWh",
  "97 kWh",
  "recomandari calculate automat"
], "truthful reference adaptation");

assert.match(css, /romania-map-shadow/);
assert.match(css, /climate-zone-boundary/);
assert.doesNotMatch(css, /\.zone-label/);
assert.doesNotMatch(workspace, /src\/physics-engine|calculateMc001/);

console.log(JSON.stringify({
  status: "PASS",
  referenceTopbar: true,
  referenceSectionGrids: 7,
  p12e2LocationPreserved: true,
  fakeReferenceMetricsPresent: false,
  jsPhysicsProductRuntimePresent: false
}, null, 2));
