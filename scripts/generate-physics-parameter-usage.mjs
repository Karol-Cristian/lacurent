import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(".");
const parametersPath = resolve("src/features/energy/physics/parameters/physics-parameters.json");
const outputPath = resolve("js/physics-parameter-usage.js");

const parameters = JSON.parse(readFileSync(parametersPath, "utf8")).parameters;
const searchRoots = [
  resolve("src/features/energy/physics/calculators"),
  resolve("src/features/energy/physics/engine")
];
const searchableExtensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const genericAliases = new Set(["area", "source", "confidence", "efficiency", "surface", "volume", "lambda", "eta"]);

function walk(directory, files = []) {
  let entries = [];
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  entries.forEach(entry => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      return;
    }
    if (searchableExtensions.has(extname(fullPath).toLowerCase())) {
      files.push({
        path: fullPath,
        relativePath: relative(root, fullPath).replaceAll("\\", "/"),
        content: readFileSync(fullPath, "utf8")
      });
    }
  });
  return files;
}

const files = searchRoots.flatMap(directory => walk(directory));

const usage = parameters.map(parameter => {
  const aliases = parameter.aliases || [];
  const hits = [];
  aliases.forEach(alias => {
    files.forEach(file => {
      if (file.content.includes(alias)) {
        hits.push({
          alias,
          file: file.relativePath,
          generic: genericAliases.has(alias)
        });
      }
    });
  });
  const domainHits = hits.filter(hit => !hit.generic);
  return {
    parameterId: parameter.id,
    usedInCode: hits.length > 0,
    usedInCalculatorOrEngine: hits.length > 0,
    domainSpecificUse: domainHits.length > 0,
    status: domainHits.length > 0 ? "used" : hits.length > 0 ? "generic_metadata" : "unused",
    hitCount: hits.length,
    hits: hits.slice(0, 8)
  };
});

const payload = {
  generatedAt: new Date().toISOString(),
  scope: "src/features/energy/physics/calculators + src/features/energy/physics/engine",
  counts: {
    total: usage.length,
    used: usage.filter(item => item.status === "used").length,
    genericMetadata: usage.filter(item => item.status === "generic_metadata").length,
    unused: usage.filter(item => item.status === "unused").length
  },
  usage
};

const output = `window.LaCurentPhysicsParameterUsage = ${JSON.stringify(payload, null, 2)};\n`;
writeFileSync(outputPath, output);
console.log(`Physics parameter usage written to ${outputPath}`);
