import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const audit = JSON.parse(
  readFileSync(new URL("../validation-reference/mc001-subchapter-coverage.json", import.meta.url), "utf8")
);

const allowedStatuses = new Set([
  "IMPLEMENTED_CALCULATION",
  "IMPLEMENTED_LOOKUP",
  "IMPLEMENTED_VALIDATION",
  "IMPLEMENTED_WORKFLOW",
  "REPRESENTED_AS_INPUT",
  "REPRESENTED_AS_OUTPUT",
  "DOCUMENTED_NOT_APPLICABLE",
  "WORKED_EXAMPLE_ONLY",
  "EXTERNAL_NORMATIVE_DEPENDENCY"
]);

const expectedChapter2 = [
  "2.1",
  "2.1.1",
  "2.1.2",
  "2.1.3",
  "2.1.4",
  "2.2",
  "2.2.1",
  "2.2.1.1",
  "2.2.1.2",
  "2.2.2",
  "2.2.2.1",
  "2.2.2.2",
  "2.2.3",
  "2.2.3.1",
  "2.2.3.2",
  "2.2.3.3",
  "2.3",
  "2.4",
  "2.4.1",
  "2.4.2",
  "2.4.3",
  "2.4.4",
  "2.5",
  "2.5.1",
  "2.5.2",
  "2.6",
  "2.6.1",
  "2.6.2",
  "2.6.2.1",
  "2.6.2.2",
  "2.6.2.3",
  "2.7",
  "2.7.1",
  "2.7.1.1",
  "2.7.1.2",
  "2.7.2",
  "2.7.3",
  "2.7.3.1",
  "2.7.3.2",
  "2.7.4",
  "2.7.5",
  "2.7.6",
  "2.8",
  "2.8.1",
  "2.8.2",
  "2.8.3",
  "2.8.4",
  "2.8.5",
  "2.8.6",
  "2.9",
  "2.9.1",
  "2.9.2",
  "2.10",
  "2.11",
  "2.12",
  "2.12.1",
  "2.12.2",
  "2.12.2.1",
  "2.12.2.2",
  "2.12.2.3"
];

const expectedChapter3 = [
  "3",
  "3.1",
  "3.1.1",
  "3.1.2",
  "3.1.3",
  "3.1.4",
  "3.1.5",
  "3.1.5.1",
  "3.1.5.2",
  "3.1.5.3",
  "3.1.5.4",
  "3.1.5.5",
  "3.1.5.6",
  "3.1.5.7",
  "3.1.5.8",
  "3.1.5.9",
  "3.2",
  "3.2.1",
  "3.2.2",
  "3.2.3",
  "3.2.3.1",
  "3.2.3.2",
  "3.2.3.3",
  "3.2.4",
  "3.2.4.1",
  "3.2.4.2",
  "3.2.4.3",
  "3.2.4.4",
  "3.2.4.5",
  "3.2.5",
  "3.2.5.1",
  "3.2.5.2",
  "3.2.5.3",
  "3.2.6",
  "3.2.6.1",
  "3.2.6.2",
  "3.2.6.3",
  "3.2.6.4",
  "3.2.7",
  "3.3",
  "3.3.1",
  "3.3.2",
  "3.3.2.1",
  "3.3.2.2",
  "3.3.2.3",
  "3.3.3",
  "3.3.4",
  "3.3.5",
  "3.3.6",
  "3.3.6.1",
  "3.3.6.2",
  "3.3.7",
  "3.3.7.1",
  "3.3.7.2",
  "3.3.7.3",
  "3.3.7.4",
  "3.3.8",
  "3.3.9",
  "ANEXA 3.3.A",
  "ANEXA 3.3.B",
  "3.4",
  "3.4.1",
  "3.4.2",
  "3.4.2.1",
  "3.4.2.2"
];

function assertSectionList(chapter, expected) {
  const actual = audit.records
    .filter(record => record.chapter === chapter)
    .map(record => record.sectionNumber);
  assert.deepEqual(actual, expected);
}

assert.equal(audit.schema, "mc001_subchapter_coverage_v1");
assertSectionList(2, expectedChapter2);
assertSectionList(3, expectedChapter3);
assert.equal(audit.summary.totalHeadings, expectedChapter2.length + expectedChapter3.length);
assert.equal(new Set(audit.records.map(record => record.sectionNumber)).size, audit.records.length);

for (const record of audit.records) {
  assert.equal(typeof record.titleRo, "string", record.sectionNumber);
  assert.ok(record.titleRo.length > 0, record.sectionNumber);
  assert.ok(record.sourcePages.length > 0, record.sectionNumber);
  assert.ok(record.classification.length > 0, record.sectionNumber);
  assert.ok(allowedStatuses.has(record.currentStatus), record.sectionNumber);
  assert.equal(record.currentStatus.includes("PARTIAL"), false, record.sectionNumber);
  assert.equal(record.currentStatus.includes("MISSING"), false, record.sectionNumber);
  assert.equal(record.currentStatus.includes("BLOCKED"), false, record.sectionNumber);
  assert.ok(record.laCurentTreatment.length > 0, record.sectionNumber);

  if (record.currentStatus.startsWith("IMPLEMENTED_")) {
    assert.ok(record.implementationFiles.length > 0, record.sectionNumber);
    assert.ok(record.testCoverage.length > 0, record.sectionNumber);
  }

  if (record.currentStatus === "EXTERNAL_NORMATIVE_DEPENDENCY") {
    assert.ok(record.externalReferences.length > 0 || record.identifiedGaps.length > 0, record.sectionNumber);
    assert.notEqual(record.laCurentTreatment, "covered somewhere", record.sectionNumber);
  }
}

assert.equal(audit.summary.chapter3RelationCoverage.totalChapter3RelationsIdentified, 217);
assert.deepEqual(audit.summary.chapter3RelationCoverage.uncoveredRelations, []);
assert.deepEqual(
  audit.summary.chapter3RelationCoverage.blockerMatrixIds,
  ["CH3_REL_3_4_SR_EN_15193_1_DELEGATED"]
);

assert.equal(audit.climate.registryVersion, "mc001_2022_climate_zones_p5a_v1");
assert.equal(audit.climate.coverage.totalClimateZones, 5);
assert.equal(audit.climate.coverage.coveredClimateZones, 5);
assert.equal(audit.climate.coverage.totalSourceBackedLocalityMappings, 0);
assert.equal(audit.climate.coverage.exactLocalityProfiles, 0);
assert.equal(
  audit.climate.sourceInventory.some(item =>
    item.inventoryId === "mc001_monthly_temperature_and_solar_climate_annex" &&
    item.status === "external_or_unavailable_dataset_dependency"
  ),
  true
);
for (const item of audit.climate.sourceInventory) {
  assert.equal(typeof item.inventoryId, "string");
  assert.equal(typeof item.sourceLocation, "string");
  assert.equal(typeof item.runtimeUse, "string");
}

console.log("PASS MC001 subchapter coverage ledger is complete and deterministic");
