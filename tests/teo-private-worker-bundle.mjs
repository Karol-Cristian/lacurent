import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const preparedRoot = path.join(repoRoot, ".wrangler", "teo-worker");
const preparedSrc = path.join(preparedRoot, "src");
const preparedApp = path.join(preparedSrc, "app");

execFileSync(
  process.execPath,
  [path.join(repoRoot, "scripts", "prepare-teo-cloudflare-worker.mjs")],
  { cwd: repoRoot, stdio: "inherit" },
);

const worker = fs.readFileSync(path.join(preparedSrc, "worker.py"), "utf8");
const service = fs.readFileSync(path.join(preparedApp, "teo_service.py"), "utf8");
const main = fs.readFileSync(path.join(repoRoot, "commercial", "app", "main.py"), "utf8");
const pyproject = fs.readFileSync(path.join(preparedRoot, "pyproject.toml"), "utf8");

assert.match(worker, /from app\.teo_service import app/);
assert.doesNotMatch(worker, /app\.main/);
assert.equal(fs.existsSync(path.join(preparedSrc, "static")), false);
assert.equal(fs.existsSync(path.join(preparedSrc, "templates")), false);

for (const filename of [
  "main.py",
  "account.py",
  "impact.py",
  "energy_product_teo_adapter.py",
  "home_lab_images.py",
  "simulation_facts.py",
]) {
  assert.equal(
    fs.existsSync(path.join(preparedApp, filename)),
    false,
    `public-only module leaked into TEO bundle: ${filename}`,
  );
}

for (const required of [
  "engine.py",
  "models.py",
  "methodology.py",
  "optimization.py",
  "optimization_v2.py",
  "optimization_v3.py",
  "heating_optimization.py",
  "heating_catalog_store.py",
  "teo_v4.py",
  "home_lab_payload.py",
]) {
  assert.equal(
    fs.existsSync(path.join(preparedApp, required)),
    true,
    `missing TEO dependency: ${required}`,
  );
}

assert.doesNotMatch(service, /Jinja2Templates|StaticFiles|app\.account|app\.impact/);
assert.doesNotMatch(pyproject, /jinja2/i);

function teoRoutes(source) {
  const result = [];
  const pattern = /@app\.(?:get|post|put|patch|delete)\("([^"]+)"/g;
  for (const match of source.matchAll(pattern)) {
    const route = match[1];
    if (
      route.startsWith("/api/optimization/home-lab/v3/")
      || route.startsWith("/api/optimization/home-lab/v4/")
    ) {
      result.push(route);
    }
  }
  return [...new Set(result)].sort();
}

assert.deepEqual(
  teoRoutes(service),
  teoRoutes(main),
  "slim TEO service must expose exactly the same V3/V4 route surface as the public app",
);

console.log(JSON.stringify({
  status: "PASS",
  routeCount: teoRoutes(service).length,
  publicRuntimeExcluded: true,
  dedicatedEntrypoint: true,
}, null, 2));
