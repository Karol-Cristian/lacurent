import { mkdir, readFile, writeFile } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "assets", "geography", "romania-localities");
const defaultSourceUrl = "https://geo-spatial.org/vechi/file_download/29543";

const typeLabels = Object.freeze({
  6: "municipiu",
  9: "municipiu",
  10: "localitate componenta municipiu",
  11: "sat apartinator municipiu",
  17: "oras",
  18: "localitate componenta oras",
  19: "sat apartinator oras",
  22: "comuna",
  23: "sat"
});

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function roundCoordinate(value) {
  return Number(Number(value).toFixed(6));
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`Download failed for ${url}: HTTP ${response.statusCode}`));
        response.resume();
        return;
      }
      response.setEncoding("utf8");
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => resolve(body));
    }).on("error", reject);
  });
}

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      args.set(arg.slice(2), argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : true);
    }
  }
  return args;
}

function localityRank(item) {
  const population = Number(item.population2002) || 0;
  const rankWeight = { 0: 7, I: 6, II: 5, III: 4, IV: 2, V: 1 }[item.rank] || 1;
  return (rankWeight * 1_000_000) + population;
}

function transformFeature(feature) {
  const properties = feature.properties || {};
  const [lon, lat] = feature.geometry?.coordinates || [];
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (!properties.name || !properties.county || !properties.natCode) return null;
  if (Number(properties.ghost) === 1) return null;
  const item = {
    id: `siruta-${properties.natCode}`,
    siruta: Number(properties.natCode),
    name: properties.name,
    county: properties.county,
    countyCode: Number(properties.countyCode),
    countyMnemonic: properties.countyMn,
    region: properties.region,
    uatSiruta: Number(properties.supCode),
    uatName: properties.nameSup,
    localityType: typeLabels[properties.type] || "localitate",
    typeCode: Number(properties.type),
    rank: properties.rank == null ? null : String(properties.rank),
    population2002: Number(properties.pop2002) || 0,
    lon: roundCoordinate(lon),
    lat: roundCoordinate(lat)
  };
  item.search = normalizeSearchText(`${item.name} ${item.county} ${item.uatName} ${item.localityType} ${item.countyMnemonic}`);
  item.importance = localityRank(item);
  return item;
}

function buildDataset(sourceGeojson) {
  if (sourceGeojson?.type !== "FeatureCollection" || !Array.isArray(sourceGeojson.features)) {
    throw new Error("Expected a GeoJSON FeatureCollection.");
  }
  const localities = sourceGeojson.features
    .map(transformFeature)
    .filter(Boolean)
    .sort((a, b) => b.importance - a.importance || a.name.localeCompare(b.name, "ro") || a.county.localeCompare(b.county, "ro"));
  const seen = new Set();
  for (const locality of localities) {
    if (seen.has(locality.id)) throw new Error(`Duplicate locality id ${locality.id}`);
    seen.add(locality.id);
  }
  const counties = [...new Map(localities.map((locality) => [
    locality.county,
    {
      code: locality.countyCode,
      mnemonic: locality.countyMnemonic,
      name: locality.county
    }
  ])).values()].sort((a, b) => a.name.localeCompare(b.name, "ro"));
  const ghostCount = sourceGeojson.features.filter((feature) => Number(feature.properties?.ghost) === 1).length;
  const exportLocalities = localities.map(({ search, importance, ...locality }) => locality);
  return {
    schema: "lacurent_romanian_localities_v1",
    source: {
      name: "Localitati Romania punct",
      publisher: "geo-spatial.org",
      sourceUrl: defaultSourceUrl,
      sourcePage: "https://geo-spatial.org/vechi/download/romania-seturi-vectoriale",
      sourceLayerDate: "31.12.2020",
      geometryAuthor: "geo-spatial.org (Cristian Balint & Vasile Craciunescu)",
      attributeSources: ["INS SIRUTA", "MDLPA/MDRAP", "data.gov.ro"],
      license: "Licenta pentru o Guvernare Deschisa / OGL-ROU-1.0 for referenced government data; geo-spatial.org page footer is CC BY-SA 3.0",
      transformation: "Filtered de facto ghost localities, retained minimal UI fields, rounded WGS84 coordinates to 6 decimals, added normalized search key."
    },
    stats: {
      sourceFeatureCount: sourceGeojson.features.length,
      excludedGhostLocalities: ghostCount,
      localityCount: localities.length,
      countyCount: counties.length,
      uatCount: new Set(localities.map((locality) => locality.uatSiruta)).size,
      coordinateCount: localities.filter((locality) => Number.isFinite(locality.lon) && Number.isFinite(locality.lat)).length
    },
    counties,
    localities: exportLocalities
  };
}

const args = parseArgs(process.argv.slice(2));
const sourceText = args.get("source")
  ? await readFile(path.resolve(repoRoot, String(args.get("source"))), "utf8")
  : await fetchText(defaultSourceUrl);
const dataset = buildDataset(JSON.parse(sourceText));

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "localities.json"), `${JSON.stringify(dataset)}\n`, "utf8");
await writeFile(path.join(outputDir, "provenance.json"), `${JSON.stringify(dataset.source, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  status: "PASS",
  output: path.relative(repoRoot, path.join(outputDir, "localities.json")),
  stats: dataset.stats
}, null, 2));
