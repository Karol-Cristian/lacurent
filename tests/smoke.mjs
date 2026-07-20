import { spawnSync } from "node:child_process";

const LOCAL_BASE = process.env.SMOKE_LOCAL_BASE || "http://127.0.0.1:4173";
const API_BASE = process.env.SMOKE_API_BASE || "https://lacurent-dev.lemnarukarol.workers.dev";
const RUN_API_SMOKE = process.env.RUN_API_SMOKE === "1";

// The home route now exposes the engineering project hub; the former visible
// "Dashboard" label was replaced during the refocused production flow.
const pages = [
  { path: "/index.html", includes: ["LA CURENT", "Proiectele cladirii", "pages/analiza-casa.html"] },
  { path: "/pages/profil.html", includes: ["Autentificare", "registerForm"] },
  { path: "/pages/analiza-casa.html", includes: ["Modelul termic al cladirii", "Geometrie", "Instalatii", "Raport tehnic"] },
  { path: "/pages/raport-energie.html", includes: ["Raport energetic LaCurent", "REZUMAT EXECUTIV"] },
  { path: "/pages/raport-v1.html", includes: ["Dosar de decizie energetica", "VERDICT PRINCIPAL", "SCENARII ANALIZATE"] },
  { path: "/pages/algoritmi.html", includes: ["Algoritmi", "BENCHMARK LIVE"] },
  { path: "/pages/recomandari.html", includes: ["Facturi", "ISTORIC FACTURI"] },
  { path: "/pages/furnizori.html", includes: ["Lucrari potrivite", "Lead-uri calificate"] },
  { path: "/pages/energy-data-hub.html", includes: ["Model tehnic energetic", "R_layer = d / lambda", "Physics Engine v0.8"] },
  { path: "/pages/admin.html", includes: ["Admin", "MODERARE OFERTE"] }
];

const syntaxFiles = [
  "workers/save-house.js",
  "workers/energy-model.js",
  "js/auth.js",
  "js/guest-session.js",
  "js/analiza-casa.js",
  "js/building-platform-wizard.mjs",
  "js/admin.js",
  "js/energy-report.js",
  "js/report-v1-demo-data.js",
  "js/report-v1.js",
  "js/algoritmi.js",
  "js/furnizori.js",
  "js/recomandari.js"
];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  throw new Error(message);
}

async function post(path, body, token = null) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body || {})
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.success) {
    fail(`${path} failed: ${json.error || response.status}`);
  }
  return json;
}

async function checkPages() {
  for (const page of pages) {
    const response = await fetch(`${LOCAL_BASE}${page.path}`);
    if (!response.ok) fail(`${page.path} returned ${response.status}`);
    const html = await response.text();
    for (const expected of page.includes) {
      if (!html.includes(expected)) fail(`${page.path} missing "${expected}"`);
    }
    pass(`page ${page.path}`);
  }
}

function checkSyntax() {
  for (const file of syntaxFiles) {
    const result = spawnSync("node", ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) fail(`${file} syntax failed: ${result.stderr || result.stdout}`);
    pass(`syntax ${file}`);
  }
}

async function checkApiRoleIsolation() {
  const id = Date.now();
  const email = `smoke-${id}@lacurent.test`;
  const password = `Smoke-${id}!`;

  const registered = await post("/api/register", {
    email,
    password,
    name: "Smoke Residential",
    role: "residential"
  });

  const token = registered.token;
  const before = await post("/api/me", {}, token);
  if (before.user.role !== "residential") fail(`expected residential before provider, got ${before.user.role}`);

  await post("/api/provider/register", {
    company_name: "Smoke Provider SRL",
    provider_type: "hvac",
    service_area: "Cluj",
    certifications: "test"
  }, token);

  const after = await post("/api/me", {}, token);
  if (after.user.role !== "residential") {
    fail(`provider registration changed role to ${after.user.role}`);
  }
  if (after.user.account_type !== "provider") {
    fail(`provider registration did not mark account_type provider, got ${after.user.account_type}`);
  }
  pass("provider registration keeps residential role");
}

async function main() {
  console.log(`Smoke base: ${LOCAL_BASE}`);
  checkSyntax();
  await checkPages();
  if (RUN_API_SMOKE) {
    console.log(`API smoke base: ${API_BASE}`);
    await checkApiRoleIsolation();
  } else {
    console.log("SKIP API smoke. Run with RUN_API_SMOKE=1 to test auth/provider flow.");
  }
}

main().catch(error => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
