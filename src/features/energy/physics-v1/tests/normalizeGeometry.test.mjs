import assert from "node:assert/strict";
import { normalizeGeometry } from "../calculators/normalizeGeometry.mjs";

function baseInput(overrides = {}) {
  return {
    buildingType: "single_family_house",
    usefulAreaM2: 100,
    ...overrides
  };
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("uses directly provided heatedVolumeM3 without fallback warning", () => {
  const result = normalizeGeometry(baseInput({
    heatedAreaM2: 90,
    heatedVolumeM3: 240,
    averageFloorHeightM: 2.7
  }));

  assert.equal(result.heatedVolumeM3, 240);
  assert.equal(result.averageFloorHeightM, 2.7);
  assert.equal(result.warnings.some((warning) => warning.includes("fallback 2.5m")), false);
  assert.equal(result.trace.formulaId, "V1_GEOMETRY_NORMALIZATION");
});

test("derives average height from provided volume when height is missing", () => {
  const result = normalizeGeometry(baseInput({
    heatedAreaM2: 80,
    heatedVolumeM3: 216
  }));

  assert.equal(result.heatedVolumeM3, 216);
  assert.equal(result.averageFloorHeightM, 2.7);
  assert.equal(result.warnings.some((warning) => warning.includes("fallback 2.5m")), false);
});

test("calculates volume from heated area and average height when volume is missing", () => {
  const result = normalizeGeometry(baseInput({
    heatedAreaM2: 80,
    averageFloorHeightM: 2.8
  }));

  assert.equal(result.heatedAreaM2, 80);
  assert.equal(result.heatedVolumeM3, 224);
  assert.equal(result.averageFloorHeightM, 2.8);
});

test("uses usefulAreaM2 as heatedAreaM2 when heated area is missing", () => {
  const result = normalizeGeometry(baseInput({
    averageFloorHeightM: 2.6
  }));

  assert.equal(result.heatedAreaM2, 100);
  assert.equal(result.heatedVolumeM3, 260);
  assert.ok(result.warnings.includes("heatedAreaM2 missing; usefulAreaM2 used as heatedAreaM2"));
});

test("uses explicit 2.5m fallback with severe warning when height and volume are missing", () => {
  const result = normalizeGeometry(baseInput());

  assert.equal(result.averageFloorHeightM, 2.5);
  assert.equal(result.heatedVolumeM3, 250);
  assert.ok(result.warnings.includes("heatedAreaM2 missing; usefulAreaM2 used as heatedAreaM2"));
  assert.ok(result.warnings.includes("SEVERE: averageFloorHeightM missing; fallback 2.5m used"));
  assert.equal(result.trace.confidence, "low");
});

test("throws when usefulAreaM2 is missing or not positive", () => {
  assert.throws(
    () => normalizeGeometry({ buildingType: "single_family_house" }),
    /usefulAreaM2 must be a positive number/
  );
  assert.throws(
    () => normalizeGeometry(baseInput({ usefulAreaM2: 0 })),
    /usefulAreaM2 must be a positive number/
  );
});

test("throws when required numeric geometry values are negative", () => {
  assert.throws(
    () => normalizeGeometry(baseInput({ heatedAreaM2: -10 })),
    /heatedAreaM2 must be a positive number/
  );
  assert.throws(
    () => normalizeGeometry(baseInput({ heatedVolumeM3: -100 })),
    /heatedVolumeM3 must be a positive number/
  );
  assert.throws(
    () => normalizeGeometry(baseInput({ averageFloorHeightM: -2.5 })),
    /averageFloorHeightM must be a positive number/
  );
});
