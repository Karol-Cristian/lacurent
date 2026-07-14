import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  findAirLayerResistanceSourceContractByCode,
  listAirLayerResistanceSourceContracts
} from "../datasets/mc001AirLayerResistanceSourceContracts.mjs";
import {
  findMaterialLambdaSourceContractByCode,
  listMaterialLambdaSourceContracts
} from "../datasets/mc001MaterialLambdaSourceContracts.mjs";

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

test("source contract datasets have no runtime PDF filesystem or network access", () => {
  for (const path of [
    "../datasets/mc001MaterialLambdaSourceContracts.mjs",
    "../datasets/mc001AirLayerResistanceSourceContracts.mjs"
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    for (const forbidden of ["readFile", "XMLHttpRequest", "fet" + "ch(", ".pdf", "get_text"]) {
      assert.equal(source.includes(forbidden), false, `${path} includes ${forbidden}`);
    }
  }
});
