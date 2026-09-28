import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const commercialRoot = path.join(repoRoot, "commercial");
const configRoot = path.join(commercialRoot, "reference-worker");
const outputDir = path.join(repoRoot, ".wrangler", "reference-rbpe-worker");
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

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(srcDir, { recursive: true });

copyDirectory(path.join(commercialRoot, "app"), path.join(srcDir, "app"));
copyDirectory(path.join(commercialRoot, "data"), path.join(srcDir, "data"));
fs.copyFileSync(path.join(configRoot, "worker.py"), path.join(srcDir, "worker.py"));
fs.copyFileSync(path.join(configRoot, "wrangler.toml"), path.join(outputDir, "wrangler.toml"));
fs.copyFileSync(path.join(configRoot, "pyproject.toml"), path.join(outputDir, "pyproject.toml"));

console.log(JSON.stringify({
  status: "prepared",
  output: ".wrangler/reference-rbpe-worker",
  workerName: "lacurent-reference-rbpe",
  compatibilityFlags: ["python_workers", "enable_weak_ref"],
}, null, 2));
