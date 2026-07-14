import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findAirLayerResistanceSourceContractByCode,
  listAirLayerResistanceSourceContracts
} from "../datasets/mc001AirLayerResistanceSourceContracts.mjs";
import {
  findBztuDefaultSourceContractByCode,
  listBztuDefaultSourceContracts
} from "../datasets/mc001BztuDefaultSourceContracts.mjs";
import {
  findGroundContactSourceContractByCode,
  listGroundContactSourceContracts
} from "../datasets/mc001GroundContactSourceContracts.mjs";
import {
  findMaterialLambdaSourceContractByCode,
  listMaterialLambdaSourceContracts
} from "../datasets/mc001MaterialLambdaSourceContracts.mjs";
import {
  findObstacleShadingSourceContractByCode,
  findSolarIrradiationSourceContractByCode,
  listObstacleShadingSourceContracts,
  listSolarIrradiationSourceContracts
} from "../datasets/mc001SolarSourceContracts.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("material lambda source contracts encode MC001 external dependencies", () => {
  const contracts = listMaterialLambdaSourceContracts();
  assert.equal(contracts.length, 5);
  const codes = contracts.map((entry) => entry.code);
  assert.ok(codes.includes("SR_EN_ISO_10456_MATERIAL_LAMBDA_PROPERTIES"));
  assert.ok(codes.includes("SR_EN_1745_MASONRY_MATERIAL_LAMBDA_PROPERTIES"));
  assert.ok(codes.includes("MP_022_02_MATERIAL_LAMBDA_PROPERTIES"));
  assert.ok(codes.includes("APPROVED_UPDATED_DESIGN_TABLES_MATERIAL_LAMBDA"));
  assert.ok(codes.includes("MANUFACTURER_DECLARATION_OR_LAB_MEASUREMENT_MATERIAL_LAMBDA"));
  for (const contract of contracts) {
    assert.equal(contract.sourcePack, "MC001_R15_MATERIALS_AND_THERMAL_RESISTANCE_SOURCE_PACK");
    assert.ok(contract.sourcePages.length > 0);
    assert.match(contract.allowedUse, /explicit source-backed/);
  }
});

test("material lambda source contract lookup is deterministic and immutable", () => {
  const contract = findMaterialLambdaSourceContractByCode("SR_EN_ISO_10456_MATERIAL_LAMBDA_PROPERTIES");
  assert.equal(contract.sourceReference, "SR EN ISO 10456");
  assert.equal(findMaterialLambdaSourceContractByCode("UNKNOWN"), null);
  assert.throws(() => {
    contract.code = "mutated";
  }, TypeError);
});

test("air-layer source contract encodes the SR EN ISO 6946 dependency", () => {
  const contracts = listAirLayerResistanceSourceContracts();
  assert.equal(contracts.length, 1);
  const contract = findAirLayerResistanceSourceContractByCode(
    "SR_EN_ISO_6946_UNVENTILATED_AIR_LAYER_RESISTANCE"
  );
  assert.equal(contract.sourceReference, "SR EN ISO 6946");
  assert.equal(contract.sourcePack, "MC001_R15_MATERIALS_AND_THERMAL_RESISTANCE_SOURCE_PACK");
  assert.deepEqual(contract.sourcePages, [77, 78]);
  assert.equal(findAirLayerResistanceSourceContractByCode("UNKNOWN"), null);
});

test("bztu default source contract encodes the page 109 external value dependency", () => {
  const contracts = listBztuDefaultSourceContracts();
  assert.equal(contracts.length, 1);
  const contract = findBztuDefaultSourceContractByCode(
    "MC001_BZTU_DEFAULT_BY_TYPE_SIZE_SOURCE_CONTRACT"
  );
  assert.equal(contract.sourcePack, "MC001_R18_BOUNDARY_CORRECTIONS_EXPLICIT_SOURCE_PACK");
  assert.deepEqual(contract.sourcePages, [109]);
  assert.match(contract.allowedUse, /explicit source-backed bztu factor/);
  assert.equal(findBztuDefaultSourceContractByCode("UNKNOWN"), null);
});

test("ground-contact source contract encodes the external detailed-method dependency", () => {
  const contracts = listGroundContactSourceContracts();
  assert.equal(contracts.length, 1);
  const contract = findGroundContactSourceContractByCode(
    "MC001_GROUND_CONTACT_EXTERNAL_DETAILED_METHOD_SOURCE_CONTRACT"
  );
  assert.equal(contract.sourcePack, "MC001_R18_BOUNDARY_CORRECTIONS_EXPLICIT_SOURCE_PACK");
  assert.deepEqual(contract.sourcePages, [82, 84, 99]);
  assert.ok(contract.externalReferences.includes("SR EN ISO 13370"));
  assert.match(contract.allowedUse, /explicit source-backed ground-contact factor/);
  assert.equal(findGroundContactSourceContractByCode("UNKNOWN"), null);
});

test("solar source contracts encode external irradiation and obstacle-factor dependencies", () => {
  const irradiationContracts = listSolarIrradiationSourceContracts();
  const obstacleContracts = listObstacleShadingSourceContracts();
  assert.equal(irradiationContracts.length, 1);
  assert.equal(obstacleContracts.length, 1);

  const irradiation = findSolarIrradiationSourceContractByCode(
    "MC001_SOLAR_IRRADIATION_EXTERNAL_CLIMATE_SOURCE_CONTRACT"
  );
  assert.equal(irradiation.sourcePack, "MC001_R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK");
  assert.deepEqual(irradiation.sourcePages, [105, 111]);
  assert.match(irradiation.allowedUse, /explicit source-backed Hsol/);

  const obstacle = findObstacleShadingSourceContractByCode(
    "MC001_OBSTACLE_SHADING_EXTERNAL_GEOMETRY_SOURCE_CONTRACT"
  );
  assert.equal(obstacle.sourcePack, "MC001_R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK");
  assert.deepEqual(obstacle.sourcePages, [105, 108, 109, 111]);
  assert.match(obstacle.allowedUse, /explicit source-backed Fsh;obst/);

  assert.equal(findSolarIrradiationSourceContractByCode("UNKNOWN"), null);
  assert.equal(findObstacleShadingSourceContractByCode("UNKNOWN"), null);
});

test("source contract datasets have no runtime PDF filesystem or network access", () => {
  for (const path of [
    "../datasets/mc001MaterialLambdaSourceContracts.mjs",
    "../datasets/mc001AirLayerResistanceSourceContracts.mjs",
    "../datasets/mc001BztuDefaultSourceContracts.mjs",
    "../datasets/mc001GroundContactSourceContracts.mjs",
    "../datasets/mc001SolarSourceContracts.mjs"
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    for (const forbidden of ["readFile", "XMLHttpRequest", "fet" + "ch(", ".pdf", "get_text"]) {
      assert.equal(source.includes(forbidden), false, `${path} includes ${forbidden}`);
    }
  }
});
