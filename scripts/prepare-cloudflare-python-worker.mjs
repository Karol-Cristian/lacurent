import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const DEFAULT_OUT = path.join(repoRoot, ".wrangler", "python-mc001-worker");
const DEFAULT_NAME = "lacurent-python-mc001";
const DEFAULT_COMPATIBILITY_DATE = "2026-05-25";

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function assertInsideWrangler(outputDir) {
  const resolved = path.resolve(outputDir);
  const wranglerDir = path.join(repoRoot, ".wrangler");
  if (resolved !== wranglerDir && !resolved.startsWith(`${wranglerDir}${path.sep}`)) {
    throw new Error(`Refusing to clear output outside .wrangler: ${resolved}`);
  }
  return resolved;
}

function copyDirectory(source, target, { exclude = () => false } = {}) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (exclude(entry.name)) continue;
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath, { exclude });
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function countFilesAndBytes(directory) {
  let files = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const child = countFilesAndBytes(item);
      files += child.files;
      bytes += child.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += fs.statSync(item).size;
    }
  }
  return { files, bytes };
}

const outputDir = assertInsideWrangler(option("out", DEFAULT_OUT));
const workerName = option("name", process.env.LACURENT_PYTHON_WORKER_NAME || DEFAULT_NAME);
const compatibilityDate = option("compatibility-date", DEFAULT_COMPATIBILITY_DATE);
const srcDir = path.join(outputDir, "src");

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(srcDir, { recursive: true });

fs.copyFileSync(
  path.join(repoRoot, "workers", "python-mc001", "worker.py"),
  path.join(srcDir, "worker.py")
);

fs.mkdirSync(path.join(srcDir, "python_engine"), { recursive: true });
fs.copyFileSync(path.join(repoRoot, "python_engine", "__init__.py"), path.join(srcDir, "python_engine", "__init__.py"));
copyDirectory(
  path.join(repoRoot, "python_engine", "lacurent_engine"),
  path.join(srcDir, "python_engine", "lacurent_engine"),
  {
    exclude: (name) => name === "__pycache__" || name === "service.py",
  }
);

copyDirectory(
  path.join(repoRoot, "validation-reference", "python-mc001", "mc001_reference"),
  path.join(srcDir, "validation-reference", "python-mc001", "mc001_reference"),
  {
    exclude: (name) => name === "__pycache__",
  }
);

fs.writeFileSync(
  path.join(outputDir, "pyproject.toml"),
  `[project]
name = "lacurent-cloudflare-python-mc001-worker"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = []

[tool.pywrangler]
allow-build = false
`,
  "utf8"
);

fs.writeFileSync(
  path.join(outputDir, "wrangler.toml"),
  `name = "${workerName}"
main = "src/worker.py"
compatibility_date = "${compatibilityDate}"
compatibility_flags = ["python_workers"]
workers_dev = true
`,
  "utf8"
);

const stats = countFilesAndBytes(outputDir);
const relativeOutput = path.relative(repoRoot, outputDir).replaceAll(path.sep, "/");
console.log(JSON.stringify({
  status: "prepared",
  output: relativeOutput,
  workerName,
  compatibilityDate,
  files: stats.files,
  bytes: stats.bytes,
  includesStandaloneServer: fs.existsSync(path.join(srcDir, "python_engine", "lacurent_engine", "api", "service.py")),
}, null, 2));
