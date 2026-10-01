import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const commercialRoot = path.join(repoRoot, "commercial");
const configRoot = path.join(commercialRoot, "teo-worker");
const outputDir = path.join(repoRoot, ".wrangler", "teo-worker");
const srcDir = path.join(outputDir, "src");

const TEO_APP_FILES = [
  "__init__.py",
  "teo_app.py",
  "engine.py",
  "methodology.py",
  "models.py",
  "optimization.py",
  "optimization_v2.py",
  "optimization_v3.py",
  "heating_optimization.py",
  "heating_catalog_store.py",
  "home_lab_payload.py",
  "teo_v4.py",
  "pricing.py",
  "cost_curves.py",
  "extended_costs.py",
  "market_products.py",
  "product_matching.py",
  "renovation.py",
];

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === "__pycache__" || entry.name === ".venv") continue;
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, targetPath);
    else if (entry.isFile()) fs.copyFileSync(sourcePath, targetPath);
  }
}

fs.rmSync(outputDir, { recursive:true, force:true });
fs.mkdirSync(path.join(srcDir, "app"), { recursive:true });

for (const filename of TEO_APP_FILES) {
  fs.copyFileSync(
    path.join(commercialRoot, "app", filename),
    path.join(srcDir, "app", filename),
  );
}
copyDirectory(path.join(commercialRoot, "data"), path.join(srcDir, "data"));
fs.copyFileSync(
  path.join(commercialRoot, "cloudflare-worker", "worker.py"),
  path.join(srcDir, "worker.py"),
);
fs.copyFileSync(
  path.join(configRoot, "pyproject.toml"),
  path.join(outputDir, "pyproject.toml"),
);
fs.copyFileSync(
  path.join(configRoot, "wrangler.toml"),
  path.join(outputDir, "wrangler.toml"),
);

console.log(JSON.stringify({
  status:"prepared",
  output:".wrangler/teo-worker",
  workerName:"lacurent-teo-private",
  executionMode:"private_sharded_python_worker_minimal",
  appFiles:TEO_APP_FILES,
}, null, 2));
