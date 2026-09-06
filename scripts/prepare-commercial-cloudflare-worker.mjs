import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const commercialRoot = path.join(repoRoot, "commercial");
const configRoot = path.join(commercialRoot, "cloudflare-worker");
const DEFAULT_OUT = path.join(repoRoot, ".wrangler", "commercial-v2-worker");
const DEFAULT_NAME = "lacurent-commercial-v2";
const DEFAULT_COMPATIBILITY_DATE = "2026-08-29";

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

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.name === "__pycache__" || entry.name === ".venv") continue;
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
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
const workerName = option("name", process.env.LACURENT_COMMERCIAL_WORKER_NAME || DEFAULT_NAME);
const compatibilityDate = option("compatibility-date", DEFAULT_COMPATIBILITY_DATE);
const srcDir = path.join(outputDir, "src");

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(srcDir, { recursive: true });

copyDirectory(path.join(commercialRoot, "app"), path.join(srcDir, "app"));
copyDirectory(path.join(commercialRoot, "data"), path.join(srcDir, "data"));
copyDirectory(path.join(commercialRoot, "static"), path.join(srcDir, "static"));
copyDirectory(path.join(commercialRoot, "templates"), path.join(srcDir, "templates"));
fs.copyFileSync(path.join(configRoot, "worker.py"), path.join(srcDir, "worker.py"));
fs.copyFileSync(path.join(configRoot, "pyproject.toml"), path.join(outputDir, "pyproject.toml"));

const wranglerTemplate = fs.readFileSync(path.join(configRoot, "wrangler.toml"), "utf8");
fs.writeFileSync(
  path.join(outputDir, "wrangler.toml"),
  wranglerTemplate
    .replace(/^name = .+$/m, `name = "${workerName}"`)
    .replace(/^compatibility_date = .+$/m, `compatibility_date = "${compatibilityDate}"`),
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
  includesRequirementsTxt: fs.existsSync(path.join(outputDir, "requirements.txt")),
  includesUvicornServer: false,
}, null, 2));
