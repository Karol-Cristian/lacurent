import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_LOCALITY_COUNT,
  LOCATION_DATA_DELIVERY,
  buildLocationPayload,
} from "../../scripts/build-location-payload.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dataRoot = path.join(repoRoot, "commercial", "data");

test("Cloudflare location asset preserves every registry byte and full payload", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lacurent-location-"));
  const outputPath = path.join(tempRoot, "public", "api", "location-data");
  const headersPath = path.join(tempRoot, "public", "_headers");

  const manifest = buildLocationPayload({
    registryPath: path.join(dataRoot, "localities.json"),
    climateZonesPath: path.join(dataRoot, "winter-climate-zones.geojson"),
    romaniaBoundaryPath: path.join(dataRoot, "romania-boundary.geojson"),
    outputPath,
    headersPath,
  });

  const registry = fs.readFileSync(path.join(dataRoot, "localities.json"));
  const body = fs.readFileSync(outputPath);
  const payload = JSON.parse(body.toString("utf8"));

  assert.equal(manifest.localities, EXPECTED_LOCALITY_COUNT);
  assert.equal(payload.localities.length, EXPECTED_LOCALITY_COUNT);
  assert.equal(payload.climateZones.type, "FeatureCollection");
  assert.equal(payload.romaniaBoundary.type, "FeatureCollection");

  // Regression for the production failure at the 26th 64 KiB boundary:
  // the generated asset must keep the registry byte-for-byte intact at every
  // former ASGI StreamingResponse chunk boundary.
  for (let offset = 64 * 1024; offset < manifest.registryPrefixBytes; offset += 64 * 1024) {
    assert.equal(body[offset], registry[offset], `registry byte changed at offset ${offset}`);
  }

  const headers = fs.readFileSync(headersPath, "utf8");
  assert.match(headers, /Content-Type: application\/json/);
  assert.match(headers, /Cache-Control: public, max-age=3600/);
  assert.match(headers, new RegExp(`X-LaCurent-Location-Delivery: ${LOCATION_DATA_DELIVERY}`));

  fs.rmSync(tempRoot, { recursive: true, force: true });
});
