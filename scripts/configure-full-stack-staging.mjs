import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function arg(name) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? String(process.argv[i + 1] || "").trim() : "";
}

const dbId = arg("db-id");
if (!/^[0-9a-f-]{36}$/i.test(dbId)) {
  throw new Error("Expected --db-id with the verified lacurent-dev-db UUID.");
}

function write(rel, text) {
  const target = path.join(root, rel);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, text, "utf8");
}

function copy(srcRel, dstRel) {
  const src = path.join(root, srcRel);
  const dst = path.join(root, dstRel);
  fs.mkdirSync(path.dirname(dst), {recursive:true});
  fs.copyFileSync(src, dst);
}

write(".wrangler/rbpe-router/wrangler.toml", `name = "lacurent-staging-rbpe-router"
main = "worker.mjs"
compatibility_date = "2026-10-01"
workers_dev = false

[[services]]
binding = "RBPE_A"
service = "lacurent-staging-rbpe-shard-a"
remote = true

[[services]]
binding = "RBPE_B"
service = "lacurent-staging-rbpe-shard-b"
remote = true

[[services]]
binding = "RBPE_C"
service = "lacurent-staging-rbpe-shard-c"
remote = true

[[services]]
binding = "RBPE_D"
service = "lacurent-staging-rbpe-shard-d"
remote = true
`);
copy("commercial/rbpe-router/worker.mjs", ".wrangler/rbpe-router/worker.mjs");

write(".wrangler/calc-gateway/wrangler.toml", `name = "lacurent-staging-home-lab-calc"
main = "worker.mjs"
compatibility_date = "2026-10-01"
workers_dev = false

[[services]]
binding = "RBPE_ROUTER"
service = "lacurent-staging-rbpe-router"
remote = true
`);
copy("commercial/calc-gateway/worker.mjs", ".wrangler/calc-gateway/worker.mjs");

write(".wrangler/teo-router/wrangler.toml", `name = "lacurent-staging-teo-router"
main = "worker.mjs"
compatibility_date = "2026-10-01"
workers_dev = false

[[d1_databases]]
binding = "DB"
database_name = "lacurent-dev-db"
database_id = "${dbId}"

[[services]]
binding = "TEO_A"
service = "lacurent-staging-teo-shard-a"
remote = true

[[services]]
binding = "TEO_B"
service = "lacurent-staging-teo-shard-b"
remote = true

[[services]]
binding = "TEO_C"
service = "lacurent-staging-teo-shard-c"
remote = true

[[services]]
binding = "TEO_D"
service = "lacurent-staging-teo-shard-d"
remote = true
`);
copy("commercial/teo-router/worker.mjs", ".wrangler/teo-router/worker.mjs");

const teoConfig = `name = "lacurent-staging-teo-private"
main = "src/worker.py"
compatibility_date = "2026-10-01"
compatibility_flags = ["python_workers"]
workers_dev = false

[[d1_databases]]
binding = "DB"
database_name = "lacurent-dev-db"
database_id = "${dbId}"

[[services]]
binding = "REFERENCE_RBPE"
service = "lacurent-staging-rbpe-router"
remote = true

[[rules]]
type = "Text"
globs = ["**/*.html", "**/*.css", "**/*.js", "**/*.json", "**/*.geojson", "**/*.svg"]
fallthrough = true
`;
write(".wrangler/teo-worker/wrangler.toml", teoConfig);

const appConfig = `name = "lacurent-staging-app"
main = "src/worker.py"
compatibility_date = "2026-10-01"
compatibility_flags = ["python_workers"]
workers_dev = false

[assets]
directory = "./public"
binding = "ASSETS"

[ai]
binding = "AI"

[[d1_databases]]
binding = "DB"
database_name = "lacurent-dev-db"
database_id = "${dbId}"

[[services]]
binding = "REFERENCE_RBPE"
service = "lacurent-staging-rbpe-router"
remote = true

[[rules]]
type = "Text"
globs = ["**/*.html", "**/*.css", "**/*.js", "**/*.json", "**/*.geojson", "**/*.svg"]
fallthrough = true
`;
write(".wrangler/commercial-v2-worker/wrangler.toml", appConfig);

copy("commercial/staging-edge/worker.mjs", ".wrangler/staging-edge/worker.mjs");
copy("commercial/staging-edge/wrangler.toml", ".wrangler/staging-edge/wrangler.toml");

const committedConfigs = [
  ".wrangler/rbpe-router/wrangler.toml",
  ".wrangler/calc-gateway/wrangler.toml",
  ".wrangler/teo-router/wrangler.toml",
  ".wrangler/teo-worker/wrangler.toml",
  ".wrangler/commercial-v2-worker/wrangler.toml",
  ".wrangler/staging-edge/wrangler.toml",
];
for (const rel of committedConfigs) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  const hasProductionDatabase = text.includes('database_name = "lacurent-db"');
  const hasPublicRouteConfig = (
    text.includes("[[routes]]")
    || text.includes("custom_domain")
    || text.includes("zone_name")
  );
  if (hasProductionDatabase || hasPublicRouteConfig) {
    throw new Error(`Staging config leaked production routing/database in ${rel}`);
  }
}
console.log(JSON.stringify({
  status:"configured",
  database:"lacurent-dev-db",
  publicUatWorker:"lacurent-uat",
  privateWorkers:[
    "lacurent-staging-app",
    "lacurent-staging-home-lab-calc",
    "lacurent-staging-rbpe-router",
    "lacurent-staging-teo-router",
  ],
}, null, 2));
