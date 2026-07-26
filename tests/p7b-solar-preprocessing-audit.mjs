import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const audit = JSON.parse(
  readFileSync(new URL("../validation-reference/p7b-solar-preprocessing-audit.json", import.meta.url), "utf8")
);

function byId(rows, key) {
  return new Map(rows.map(row => [row[key], row]));
}

test("P7B solar preprocessing audit separates Hsol from bounded Qsol/Qsky completion", () => {
  assert.equal(audit.schema, "p7b_solar_preprocessing_audit_v1");
  const mapping = byId(audit.runtimeMapping, "runtimeQuantity");
  assert.equal(mapping.get("monthlySolarIrradiance").status, "implemented_source_backed");
  assert.equal(
    mapping.get("Hsol").status,
    "implemented_source_backed_for_a9_6_tabulated_vertical_and_horizontal_planes"
  );
  assert.equal(
    mapping.get("Hsol").formulaId,
    "P7B_A9_6_MEAN_DAILY_IRRADIANCE_TO_MONTHLY_HSOL_UNIT_INTEGRATION"
  );
  assert.equal(mapping.get("Qsky").status, "implemented_when_explicit_qsky_or_all_qsky_inputs_are_supplied");
  assert.equal(mapping.get("Qsol").status, "bounded_until_qsky_and_complete_solar_element_inputs_are_available");
  assert.equal(
    audit.notImplementedWithoutInventingData.map(item => item.gapId).includes("source_backed_qsol_qsky_completion"),
    true
  );
});

test("P7B solar preprocessing audit preserves source-pack identity and locality coverage", () => {
  const source = audit.ownedSources.find(item => item.documentId === "mc001_1_2_3_2006_annex_a9_6");
  assert.equal(source.datasetVersion, "mc001_1_2006_annex_a9_6_solar_p5b3_v1");
  assert.equal(source.rowCount, 30);
  assert.equal(source.cellCount, 3960);
  assert.equal(source.sourceDocumentSha256, "e136e0fc961701aa033f5ff5194c6f3708fc5390cdf25a5c30c1b76371f5e4df");
  assert.equal(audit.implementedChain.includes("Building DNA climateProvider compact envelope"), true);
  assert.equal(
    audit.validationTargets.includes("all 30 A.9.6 localities expose twelve monthly Hsol records"),
    true
  );
});
