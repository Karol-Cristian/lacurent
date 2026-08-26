import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const STATIC_ROOT = path.resolve("dist/pages");
const LOCAL_BASE = process.env.SMOKE_LOCAL_BASE || "http://127.0.0.1:4173";
const PORT = Number(new URL(LOCAL_BASE).port || 4173);

const pages = [
  { path: "/index.html", includes: ["Workspace profesional", "pages/analiza-casa.html"] },
  { path: "/pages/profil.html", includes: ["Autentificare", "registerForm"] },
  { path: "/pages/reset-password.html", includes: ["Seteaza o parola noua", "resetForm"] },
  { path: "/pages/analiza-casa.html", includes: ["Workspace auditor", "Localizare", "Sisteme", "Documente"] }
];

const syntaxFiles = [
  "workers/save-house.js",
  "js/auth.js",
  "js/lacurent-contract.mjs",
  "js/lacurent-geography.mjs",
  "js/lacurent-workspace.mjs"
];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  throw new Error(message);
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

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js") || filePath.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, LOCAL_BASE);
      const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = path.resolve(STATIC_ROOT, `.${requestedPath}`);
      const relative = path.relative(STATIC_ROOT, filePath);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }
      const body = await readFile(filePath);
      response.writeHead(200, { "content-type": contentType(filePath) });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
}

function checkSyntax() {
  for (const file of syntaxFiles) {
    const result = spawnSync("node", ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) fail(`${file} syntax failed: ${result.stderr || result.stdout}`);
    pass(`syntax ${file}`);
  }
}

async function main() {
  if (!existsSync(STATIC_ROOT)) {
    fail("dist/pages is missing; run npm.cmd run build before smoke");
  }
  console.log(`Smoke base: ${LOCAL_BASE}`);
  checkSyntax();
  const server = process.env.SMOKE_LOCAL_BASE ? null : createStaticServer();
  if (server) {
    await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  }
  try {
    await checkPages();
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

main().catch(error => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
