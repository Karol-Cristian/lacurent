import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const LOCATION_DATA_DELIVERY = "cloudflare-static-asset-v1";
export const EXPECTED_LOCALITY_COUNT = 13622;

const JSON_WHITESPACE = new Set([0x20, 0x09, 0x0a, 0x0d]);

function finalObjectBraceOffset(buffer, label) {
  let cursor = buffer.length - 1;
  while (cursor >= 0 && JSON_WHITESPACE.has(buffer[cursor])) cursor -= 1;
  if (cursor < 0 || buffer[cursor] !== 0x7d) {
    throw new Error(`${label} must end with a JSON object closing brace.`);
  }
  return cursor;
}

function parseJson(buffer, label) {
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} is invalid JSON: ${error.message}`, { cause: error });
  }
}

function assertFeatureCollection(value, label) {
  if (!value || value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
    throw new Error(`${label} must be a GeoJSON FeatureCollection.`);
  }
}

export function buildLocationPayload({
  registryPath,
  climateZonesPath,
  romaniaBoundaryPath,
  outputPath,
  headersPath,
}) {
  const registry = fs.readFileSync(registryPath);
  const climateZones = fs.readFileSync(climateZonesPath);
  const romaniaBoundary = fs.readFileSync(romaniaBoundaryPath);

  const registryPayload = parseJson(registry, path.basename(registryPath));
  const climatePayload = parseJson(climateZones, path.basename(climateZonesPath));
  const boundaryPayload = parseJson(romaniaBoundary, path.basename(romaniaBoundaryPath));

  if (!Array.isArray(registryPayload.localities)) {
    throw new Error("localities.json must contain a localities array.");
  }
  if (registryPayload.localities.length !== EXPECTED_LOCALITY_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_LOCALITY_COUNT} localities, got ${registryPayload.localities.length}.`,
    );
  }
  assertFeatureCollection(climatePayload, "climateZones");
  assertFeatureCollection(boundaryPayload, "romaniaBoundary");

  const finalBrace = finalObjectBraceOffset(registry, "localities.json");
  const payload = Buffer.concat([
    registry.subarray(0, finalBrace),
    Buffer.from(',"climateZones":', "utf8"),
    climateZones,
    Buffer.from(',"romaniaBoundary":', "utf8"),
    romaniaBoundary,
    Buffer.from("}", "utf8"),
  ]);

  const completePayload = parseJson(payload, "composed location payload");
  if (completePayload.localities.length !== EXPECTED_LOCALITY_COUNT) {
    throw new Error("Composed location payload lost localities.");
  }
  assertFeatureCollection(completePayload.climateZones, "composed climateZones");
  assertFeatureCollection(completePayload.romaniaBoundary, "composed romaniaBoundary");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, payload);

  if (headersPath) {
    fs.mkdirSync(path.dirname(headersPath), { recursive: true });
    fs.writeFileSync(
      headersPath,
      [
        "/api/location-data",
        "  Content-Type: application/json; charset=utf-8",
        "  Cache-Control: public, max-age=3600",
        `  X-LaCurent-Location-Delivery: ${LOCATION_DATA_DELIVERY}`,
        "",
      ].join("\n"),
      "utf8",
    );
  }

  return {
    bytes: payload.length,
    sha256: crypto.createHash("sha256").update(payload).digest("hex"),
    localities: completePayload.localities.length,
    climateFeatures: completePayload.climateZones.features.length,
    boundaryFeatures: completePayload.romaniaBoundary.features.length,
    registryPrefixBytes: finalBrace,
  };
}
