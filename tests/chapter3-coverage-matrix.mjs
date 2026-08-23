import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION,
  chapter3ImplementationMatrix,
  chapter3MatrixSummary
} from "../src/physics-engine/tests/fixtures/mc001Chapter3ImplementationMatrixFixture.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const matrix = JSON.parse(
  readFileSync("validation-reference/chapter3-coverage-matrix.json", "utf8")
);
const markdown = readFileSync("validation-reference/chapter3-coverage-matrix.md", "utf8");
const p8iClosureDoc = readFileSync(
  "docs/validation/P8I_CHAPTER3_FINAL_NUMERICAL_CLOSURE.md",
  "utf8"
);
const p8j0CertificationDoc = readFileSync(
  "docs/validation/P8J0_CHAPTER3_COVERAGE_CERTIFICATION.md",
  "utf8"
);

const PRIMARY_CLASSIFICATIONS = Object.freeze([
  "NUMERICALLY_IMPLEMENTED",
  "PROCEDURALLY_IMPLEMENTED",
  "EXPLICIT_INPUT_BOUNDARY",
  "EXTERNAL_STANDARD_BLOCKED",
  "NOT_APPLICABLE"
]);

function markdownTableValue(label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`\\| ${escaped} \\| ([^|]+) \\|`));
  return match?.[1]?.trim() ?? null;
}

function docBulletValue(label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = p8iClosureDoc.match(new RegExp(`- ${escaped}: ([^\\n]+)`));
  return match?.[1]?.trim() ?? null;
}

function certificationBulletValue(label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = p8j0CertificationDoc.match(new RegExp(`- ${escaped}: ([^\\n]+)`));
  return match?.[1]?.trim() ?? null;
}

test("Chapter 3 coverage matrix is synchronized with the source-to-code fixture", () => {
  assert.equal(matrix.schema, "mc001_chapter3_coverage_matrix_p8i_v1");
  assert.deepEqual(matrix.summary, chapter3MatrixSummary());
  assert.equal(matrix.entries.length, chapter3ImplementationMatrix.length);
  assert.deepEqual(
    matrix.entries.map(entry => entry.matrixId),
    chapter3ImplementationMatrix.map(entry => entry.matrixId)
  );
});

test("Chapter 3 coverage matrix records the P8I production topology contract", () => {
  assert.equal(
    matrix.productionTopology.schema,
    "mc001_chapter3_production_topology_p8i_v1"
  );
  assert.equal(
    matrix.productionTopology.supportedTopology.parallelSystems,
    "multiple active heating/cooling/DHW systems are supported only with explicit allocationFraction values that sum to 1"
  );
  assert.ok(
    matrix.productionTopology.supportedTopology.sharedGenerators.includes(
      "one physical generator may serve heating and DHW"
    )
  );
  assert.ok(
    matrix.productionTopology.unsupportedWithoutExplicitInputs.includes(
      "automatic sizing/allocation between multiple systems"
    )
  );
});

test("Chapter 3 coverage matrix has one P8I primary classification per slot", () => {
  const allowed = new Set(Object.values(CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION));
  const relationIds = new Set();
  for (const entry of matrix.entries) {
    assert.equal(relationIds.has(entry.relation), false, entry.relation);
    relationIds.add(entry.relation);
    assert.equal(allowed.has(entry.implementationClassification), true, entry.matrixId);
    assert.equal(entry.primaryImplementationClassification, entry.implementationClassification);
    assert.equal(
      entry.runtimeCalculatesResult,
      [
        "NUMERICALLY_IMPLEMENTED",
        "PROCEDURALLY_IMPLEMENTED"
      ].includes(entry.implementationClassification),
      entry.matrixId
    );
    assert.equal(
      entry.userMustProvideResultDirectly,
      entry.implementationClassification === "EXPLICIT_INPUT_BOUNDARY",
      entry.matrixId
    );
  }
  assert.equal(matrix.entries.length, 217);
  assert.equal(relationIds.size, 217);
  const classificationTotal = PRIMARY_CLASSIFICATIONS.reduce(
    (sum, classification) => sum + matrix.summary.p8bClassificationCounts[classification],
    0
  );
  assert.equal(classificationTotal, 217);
  assert.equal(matrix.summary.p8bClassificationCounts.NUMERICALLY_IMPLEMENTED, 211);
  assert.equal(matrix.summary.p8bClassificationCounts.PROCEDURALLY_IMPLEMENTED, 4);
  assert.equal(matrix.summary.p8bClassificationCounts.EXPLICIT_INPUT_BOUNDARY, 1);
  assert.equal(matrix.summary.p8bClassificationCounts.EXTERNAL_STANDARD_BLOCKED, 1);
  assert.equal(matrix.summary.p8bClassificationCounts.NOT_APPLICABLE, 0);
  assert.equal(matrix.summary.numericalImplementationPercentage, 97.2);
});

test("Chapter 3 P8I registers every remaining non-closed slot with a precise reason", () => {
  assert.equal(
    matrix.explicitBoundaryRegister.length,
    matrix.summary.explicitInputBoundaryRelations
  );
  for (const boundary of matrix.explicitBoundaryRegister) {
    assert.equal(typeof boundary.reasonCode, "string", boundary.matrixId);
    assert.ok(boundary.reasonCode.length > 8, boundary.matrixId);
    assert.equal(typeof boundary.reason, "string");
    assert.ok(boundary.reason.length > 20, boundary.matrixId);
  }
  const nonClosed = matrix.entries.filter(entry =>
    [
      "EXPLICIT_INPUT_BOUNDARY",
      "EXTERNAL_STANDARD_BLOCKED",
      "NOT_APPLICABLE"
    ].includes(entry.implementationClassification)
  );
  assert.deepEqual(
    nonClosed.map(entry => entry.relation),
    ["3.4_EQ_34_LENI", "3.4_SR_EN_15193_1_DELEGATED"]
  );
  const explicit = nonClosed.find(entry => entry.implementationClassification === "EXPLICIT_INPUT_BOUNDARY");
  assert.equal(explicit.relation, "3.4_EQ_34_LENI");
  assert.equal(explicit.explicitBoundaryReasonCode, "SR_EN_15193_1_LIGHTING_ENGINE_REQUIRED");
  const external = nonClosed.find(entry => entry.implementationClassification === "EXTERNAL_STANDARD_BLOCKED");
  assert.equal(external.relation, "3.4_SR_EN_15193_1_DELEGATED");
  assert.equal(external.blocker.externalStandard, "SR EN 15193-1");
  assert.ok(external.blocker.missingElement.includes("SR EN 15193-1"));
  for (const relation of [
    "3.1",
    "3.2",
    "3.3",
    "3.4",
    "3.5",
    "3.6",
    "3.7",
    "3.8",
    "3.9",
    "3.10",
    "3.11",
    "3.12",
    "3.13",
    "3.14",
    "3.15",
    "3.16",
    "3.17",
    "3.18",
    "3.19",
    "3.20",
    "3.21",
    "3.22",
    "3.23",
    "3.24",
    "3.25",
    "3.26",
    "3.27",
    "3.28",
    "3.29",
    "3.30",
    "3.31",
    "3.32",
    "3.33",
    "3.34",
    "3.35",
    "3.36",
    "3.37",
    "3.38",
    "3.39",
    ...Array.from({ length: 15 }, (_, index) => `3.${40 + index}`),
    "3.55",
    ...Array.from({ length: 12 }, (_, index) => `3.${56 + index}`),
    "3.68",
    "3.69",
    "3.70",
    "3.71",
    "3.72",
    "3.73",
    "3.74",
    "3.75",
    "3.76",
    "3.77",
    "3.78",
    "3.79",
    "3.80",
    "3.81",
    "3.82",
    ...Array.from({ length: 9 }, (_, index) => `3.${83 + index}`),
    "3.92",
    "3.93",
    "3.94",
    "3.95",
    "3.96",
    "3.97",
    "3.98",
    "3.99",
    "3.100",
    "3.101",
    "3.102",
    "3.103",
    "3.104",
    "3.105",
    "3.106",
    "3.107",
    "3.108",
    "3.109",
    "3.110",
    "3.111",
    "3.112",
    "3.113",
    "3.114",
    "3.115",
    "3.116",
    "3.117",
    "3.118",
    "3.119",
    "3.120",
    "3.121",
    "3.122",
    "3.123",
    "3.136",
    "3.137",
    "3.138",
    "3.139",
    "3.140",
    "3.141",
    "3.142",
    "3.143",
    "3.144",
    "3.145",
    "3.146",
    "3.147",
    "3.148",
    "3.149",
    "3.150",
    "3.151",
    "3.152",
    "3.153",
    "3.154",
    "3.155",
    "3.156",
    "3.157",
    "3.158",
    "3.159",
    "3.160",
    "3.161",
    "3.162",
    "3.163",
    "3.164",
    "3.165",
    "3.166",
    "3.167",
    "3.168",
    "3.169",
    "3.170",
    "3.171",
    "3.172",
    "3.173",
    "3.174",
    "3.175",
    "3.176",
    "3.177",
    "3.178",
    "3.179",
    "3.180",
    "3.181",
    "3.182",
    ...Array.from({ length: 10 }, (_, index) => `3.${188 + index}`),
    ...Array.from({ length: 29 }, (_, index) => `3.${200 + index}`)
  ]) {
    const entry = matrix.entries.find(item => item.relation === relation);
    assert.equal(entry.implementationClassification, "NUMERICALLY_IMPLEMENTED", relation);
    assert.equal(entry.explicitInputBoundary, false, relation);
  }
});

test("Chapter 3 coverage matrix keeps the SR EN 15193-1 lighting engine bounded", () => {
  const blockers = matrix.summary.blockerDetails;
  assert.equal(blockers.length, 1);
  assert.equal(blockers[0].externalStandard, "SR EN 15193-1");
  assert.ok(blockers[0].missingElement.includes("SR EN 15193-1"));
});

test("Chapter 3 generated JSON, Markdown and certification doc agree on final accounting", () => {
  assert.equal(markdownTableValue("Total tracked relations"), "217");
  assert.equal(markdownTableValue("Numerically implemented relations"), "211");
  assert.equal(markdownTableValue("Procedurally implemented relations"), "4");
  assert.equal(markdownTableValue("Explicit-input boundary relations"), "1");
  assert.equal(markdownTableValue("External-standard blocked relations"), "1");
  assert.equal(markdownTableValue("Not applicable relations"), "0");
  assert.equal(markdownTableValue("Numerical implementation percentage"), "97.2%");
  assert.ok(markdown.includes("3.4_EQ_34_LENI: EXPLICIT_INPUT_BOUNDARY"));
  assert.ok(markdown.includes("3.4_SR_EN_15193_1_DELEGATED: EXTERNAL_STANDARD_BLOCKED"));
  assert.ok(markdown.includes("The remaining explicit LENI input boundary and the external SR EN 15193-1 dependency are separate tracked slots"));

  assert.equal(docBulletValue("Total tracked slots"), "217");
  assert.equal(docBulletValue("NUMERICALLY_IMPLEMENTED"), "211");
  assert.equal(docBulletValue("PROCEDURALLY_IMPLEMENTED"), "4");
  assert.equal(docBulletValue("EXPLICIT_INPUT_BOUNDARY"), "1");
  assert.equal(docBulletValue("EXTERNAL_STANDARD_BLOCKED"), "1");
  assert.equal(docBulletValue("NOT_APPLICABLE"), "0");
  assert.ok(p8iClosureDoc.includes("3.4_SR_EN_15193_1_DELEGATED"));

  assert.equal(certificationBulletValue("Total tracked slots"), "217");
  assert.equal(certificationBulletValue("NUMERICALLY_IMPLEMENTED"), "211");
  assert.equal(certificationBulletValue("PROCEDURALLY_IMPLEMENTED"), "4");
  assert.equal(certificationBulletValue("EXPLICIT_INPUT_BOUNDARY"), "1");
  assert.equal(certificationBulletValue("EXTERNAL_STANDARD_BLOCKED"), "1");
  assert.equal(certificationBulletValue("NOT_APPLICABLE"), "0");
  assert.equal(certificationBulletValue("Numerical coverage"), "97.2%");
  assert.equal(certificationBulletValue("Supported-scope coverage"), "99.1%");
  assert.ok(p8j0CertificationDoc.includes("3.4_EQ_34_LENI"));
  assert.ok(p8j0CertificationDoc.includes("3.4_SR_EN_15193_1_DELEGATED"));
  assert.ok(p8j0CertificationDoc.includes("These are two separate tracked slots."));
});
