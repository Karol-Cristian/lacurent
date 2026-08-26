import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function assertNoProductImport(file, forbiddenPatterns) {
  const source = read(file);
  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern, `${file} must not depend on ${pattern}`);
  }
}

const productFiles = [
  "index.html",
  "pages/analiza-casa.html",
  "pages/profil.html",
  "pages/reset-password.html",
  "components/sidebar.html",
  "css/style.css",
  "js/auth.js",
  "js/lacurent-contract.mjs",
  "js/lacurent-geography.mjs",
  "js/lacurent-workspace.mjs",
  "workers/save-house.js"
];

for (const file of productFiles) {
  assert.ok(fs.existsSync(path.join(repoRoot, file)), `${file} must exist`);
}

for (const deletedPath of [
  "building-model-registry.json",
  "BUILDING_MODEL_ARCHITECTURE.md",
  "js/building-platform-wizard.mjs",
  "js/report-v1.js",
  "js/guest-session.js",
  "workers/energy-model.js",
  "pages/raport-v1.html",
  "pages/casa-mea.html",
  "pages/advanced-calculator.html"
]) {
  assert.equal(
    fs.existsSync(path.join(repoRoot, deletedPath)),
    false,
    `${deletedPath} must not remain as active legacy product code`
  );
}

for (const file of [
  "pages/analiza-casa.html",
  "js/lacurent-contract.mjs",
  "js/lacurent-workspace.mjs",
  "workers/save-house.js"
]) {
  assertNoProductImport(file, [
    /src\/building-platform/,
    /src\/physics-engine/,
    /building-platform-wizard/,
    /report-v1/,
    /guest-session/,
    /workers\/energy-model/
  ]);
}

const contractSource = read("js/lacurent-contract.mjs");
assert.match(contractSource, /lacurent_simple_input_v1/);
assert.match(contractSource, /deriveGeometry/);
assert.match(contractSource, /buildSimpleInputContract/);
assert.doesNotMatch(contractSource, /generatorRef/);

const workerSource = read("workers/save-house.js");
assert.match(workerSource, /\/api\/python\/calculate/);
assert.match(workerSource, /PYTHON_ENGINE_SERVICE_UNCONFIGURED/);
assert.doesNotMatch(workerSource, /calculateMc001/);
assert.doesNotMatch(workerSource, /demoOldHouseInput/);

const buildSource = read("scripts/build-pages.mjs");
assert.doesNotMatch(buildSource, /"src"/);
assert.match(read("wrangler.toml"), /directory = "dist\/pages"/);

console.log("PASS P12A architecture boundary");
