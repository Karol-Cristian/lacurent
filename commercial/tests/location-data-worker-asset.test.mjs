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
import { encodeLiveCalculationForm } from "../calc-gateway/worker.mjs";

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


test("Home Lab calculation gateway normalizes browser FormData for RBPE shards", async () => {
  const multipart = new FormData();
  multipart.set("locality_id", "@lc2|cluj_napoca|III|-18|siruta-54984|Cluj-Napoca|Cluj");
  multipart.set("heated_floor_area_m2", "120");
  multipart.set("heating_system_type", "condensing_gas_boiler");
  multipart.set("pv_enabled", "on");
  multipart.set("pv_orientation", "south_west");

  const multipartRequest = new Request(
    "https://lacurent.com/api/home-lab-next/calculate",
    { method:"POST", body:multipart },
  );
  const multipartEncoded = await encodeLiveCalculationForm(multipartRequest);
  const multipartParams = new URLSearchParams(multipartEncoded);

  assert.equal(multipartParams.get("heated_floor_area_m2"), "120");
  assert.equal(multipartParams.get("heating_system_type"), "condensing_gas_boiler");
  assert.equal(multipartParams.get("pv_enabled"), "on");
  assert.equal(multipartParams.get("pv_orientation"), "south_west");
  assert.match(multipartParams.get("locality_id"), /^@lc2\|/);

  const urlEncodedRequest = new Request(
    "https://lacurent.com/api/home-lab-next/calculate",
    {
      method:"POST",
      headers:{"content-type":"application/x-www-form-urlencoded"},
      body:"heated_floor_area_m2=120&pv_orientation=south",
    },
  );
  assert.equal(
    await encodeLiveCalculationForm(urlEncodedRequest),
    "heated_floor_area_m2=120&pv_orientation=south",
  );
});
