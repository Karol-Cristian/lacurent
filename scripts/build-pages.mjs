import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "dist", "pages");

const staticEntries = Object.freeze([
  "_headers",
  "components",
  "css",
  "data",
  "images",
  "index.html",
  "js",
  "pages"
]);

function assertInsideRepo(target) {
  const relative = path.relative(repoRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside repository: ${target}`);
  }
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function copyEntry(entry) {
  const source = path.join(repoRoot, entry);
  const target = path.join(outputDir, entry);
  if (!(await exists(source))) {
    return;
  }
  await cp(source, target, {
    recursive: true,
    dereference: false,
    filter: (sourcePath) => {
      const normalized = sourcePath.replaceAll("\\", "/");
      return !normalized.includes("/__pycache__/") && !normalized.endsWith("/__pycache__");
    }
  });
}

assertInsideRepo(outputDir);
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const entry of staticEntries) {
  await copyEntry(entry);
}

console.log(`Cloudflare Pages static output written to ${path.relative(repoRoot, outputDir)}`);
