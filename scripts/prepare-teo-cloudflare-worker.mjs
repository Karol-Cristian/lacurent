import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const commercialRoot = path.join(repoRoot, "commercial");
const configRoot = path.join(commercialRoot, "teo-worker");
const outputDir = path.join(repoRoot, ".wrangler", "teo-worker");
const srcDir = path.join(outputDir, "src");

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
fs.mkdirSync(srcDir, { recursive:true });

copyDirectory(path.join(commercialRoot, "app"), path.join(srcDir, "app"));
copyDirectory(path.join(commercialRoot, "data"), path.join(srcDir, "data"));
copyDirectory(path.join(commercialRoot, "static"), path.join(srcDir, "static"));
copyDirectory(path.join(commercialRoot, "templates"), path.join(srcDir, "templates"));
fs.copyFileSync(
  path.join(commercialRoot, "cloudflare-worker", "worker.py"),
  path.join(srcDir, "worker.py"),
);
fs.copyFileSync(
  path.join(commercialRoot, "cloudflare-worker", "pyproject.toml"),
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
  executionMode:"private_sharded_python_worker",
}, null, 2));
