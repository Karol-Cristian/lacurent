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
const sidebar = read("components/sidebar.html");
const index = read("index.html");

assert.match(html, /data-section-target="overview" class="active"/);
assert.match(html, /Prezentare/);
assert.match(html, /Localizare/);
assert.match(html, /Cladire/);
assert.match(html, /Anvelopa/);
assert.match(html, /Instalatii/);
assert.match(html, /Variante/);
assert.match(html, /Rezultate/);
assert.match(html, /Documente/);
assert.match(html, /id="section-overview"/);
assert.match(html, /id="overviewIssues"/);
assert.match(html, /class="workspace-topbar reference-topbar"/);
assert.match(html, /overview-reference-grid/);
assert.match(html, /class="equipment-flow"/);
assert.match(html, /class="assembly-strip"/);
assert.match(html, /Acelasi generator pentru incalzire si ACM/);
assert.match(html, /lacurent-workspace\.mjs\?v=(p12g|p12h2)/);

assertNotContains(html + index + sidebar + css, [
  "HW_Prototype",
  "workspace-hero",
  "product-hero",
  "Calculator Python",
  "Python MC001",
  "hardware",
  "server",
  "Incarca exemplu"
], "active frontend");

assertNotContains(html + css + workspace, [
  "Clasa energetica",
  "A+",
  "Economii 23",
  "24 kW",
  "12.1 MWh",
  "97 kWh"
], "active product UI");

assertNotContains(html, [
  "generatorRef",
  "Building DNA",
  "Chapter 2",
  "Chapter 3",
  "Chapter 4",
  "demo"
], "analysis page");

assert.match(workspace, /SECTION_LABELS/);
assert.match(workspace, /updateOverview/);
assert.match(workspace, /lacurent-geography\.mjs\?v=p12e2/);
assert.doesNotMatch(workspace, /src\/physics-engine|calculateMc001|demoOldHouseInput|building-platform-wizard/);
assert.doesNotMatch(contract, /src\/physics-engine|building-platform-wizard|synthetic_demo|generatorRef/);

assert.equal(fs.existsSync(path.join(repoRoot, "images", "HW_Prototype.png")), false, "obsolete hardware image must be deleted");
assert.match(css, /workspace-shell\.product-studio/);
assert.match(css, /romania-map-shadow/);
assert.match(css, /climate-zone-boundary/);
assert.match(css, /building-silhouette/);
assert.doesNotMatch(css, /\.zone-label/);

console.log(JSON.stringify({
  status: "PASS",
  consolidatedNavigation: true,
  hardwarePresentationRemoved: true,
  p12e2LocationPreserved: true,
  jsPhysicsProductRuntimePresent: false
}, null, 2));
