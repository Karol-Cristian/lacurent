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
  readFileSync(new URL("../validation-reference/romanian-climate-infrastructure-audit.json", import.meta.url), "utf8")
);

function byId(rows, idKey) {
  return new Map(rows.map(row => [row[idKey], row]));
}

test("P5C climate infrastructure audit tracks present, extracted, implemented and validated documents", () => {
  assert.equal(audit.schema, "romanian_climate_infrastructure_audit_p5c_v1");
  const docs = byId(audit.documents, "documentId");
  for (const id of [
    "mc001_2022",
    "mc001_6_2013",
    "mc001_1_2_3_2006_annex_a9_6",
    "sr_en_iso_52010_1",
    "official_locality_to_climate_wind_zone_registry",
    "degree_day_dataset"
  ]) {
    assert.equal(docs.has(id), true, id);
    for (const key of ["present", "extracted", "implemented", "validated"]) {
      assert.equal(typeof docs.get(id)[key], "boolean", `${id}.${key}`);
    }
  }
  assert.equal(docs.get("mc001_6_2013").file.hashMatchesExpected, true);
  assert.equal(docs.get("mc001_1_2_3_2006_annex_a9_6").present, true);
  assert.equal(docs.get("mc001_1_2_3_2006_annex_a9_6").file.sha256.length, 64);
  assert.equal(
    audit.sourcePacks.mc001_1_2006_annex_a9_6.sourceDocumentSha256,
    "e136e0fc961701aa033f5ff5194c6f3708fc5390cdf25a5c30c1b76371f5e4df"
  );
});

test("P5C climate infrastructure audit has exact dataset coverage and no generic blocker", () => {
  const coverage = byId(audit.datasetCoverage, "datasetId");
  for (const id of [
    "mc001_6_2013_monthly_exterior_temperature",
    "mc001_6_2013_monthly_relative_humidity",
    "mc001_6_2013_winter_design_day_temperature",
    "mc001_6_2013_summer_design_day_temperature",
    "mc001_1_2006_annex_a9_6_monthly_solar_irradiance"
  ]) {
    assert.equal(coverage.get(id).present, true);
    assert.equal(coverage.get(id).implemented, true);
    assert.equal(coverage.get(id).validated, true);
  }
  assert.equal(coverage.get("mc001_6_2013_monthly_exterior_temperature").recordCount, 42);
  assert.equal(coverage.get("mc001_1_2006_annex_a9_6_monthly_solar_irradiance").recordCount, 30);
  assert.equal(coverage.get("source_backed_qsol_preprocessing").implemented, false);
  assert.equal(
    JSON.stringify(audit).includes("generic external source missing"),
    false
  );
});

test("P5C production registry examples separate available fields from bounded gaps", () => {
  const examples = byId(audit.productionRegistry.representativeProfiles, "localityId");
  assert.equal(examples.get("ro_bucuresti").coverage.hasMonthlyExteriorTemperature, true);
  assert.equal(examples.get("ro_bucuresti").coverage.hasMonthlySolarIrradianceSourceRows, true);
  assert.equal(examples.get("ro_brasov").coverage.hasMonthlyExteriorTemperature, true);
  assert.equal(examples.get("ro_brasov").coverage.hasMonthlySolarIrradianceSourceRows, false);
  assert.equal(audit.productionRegistry.supportedLocalityStationMappings, 42);
  assert.equal(audit.productionRegistry.solarIrradiationLocalityCount, 30);
});

test("P5C bounded gaps identify exact missing documents and affected runtime calculations", () => {
  const gaps = byId(audit.boundedGaps, "gapId");
  assert.equal(gaps.get("source_backed_solar_gains_preprocessing").exactMissingDocument, "SR EN ISO 52010-1");
  assert.match(
    gaps.get("source_backed_solar_gains_preprocessing").blockedRuntimeCalculation,
    /QHnd\/QCnd/
  );
  assert.match(
    gaps.get("automatic_locality_to_climate_zone_assignment").exactMissingChapterOrTable,
    /Figura 2\.1/
  );
  assert.match(
    gaps.get("degree_day_dataset").reasonImplementationCannotContinue,
    /No degree-day values/
  );
});
