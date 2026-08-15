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

test("Chapter 3 coverage matrix is synchronized with the source-to-code fixture", () => {
  assert.equal(matrix.schema, "mc001_chapter3_coverage_matrix_p8c_v1");
  assert.deepEqual(matrix.summary, chapter3MatrixSummary());
  assert.equal(matrix.entries.length, chapter3ImplementationMatrix.length);
  assert.deepEqual(
    matrix.entries.map(entry => entry.matrixId),
    chapter3ImplementationMatrix.map(entry => entry.matrixId)
  );
});

test("Chapter 3 coverage matrix records the P8C production topology contract", () => {
  assert.equal(
    matrix.productionTopology.schema,
    "mc001_chapter3_production_topology_p8c_v1"
  );
  assert.equal(
    matrix.productionTopology.supportedTopology.parallelSystems,
    "multiple active heating/cooling/DHW systems are supported only with explicit allocationFraction values that sum to 1"
  );
  assert.ok(
    matrix.productionTopology.unsupportedWithoutExplicitInputs.includes(
      "automatic sizing/allocation between multiple systems"
    )
  );
});

test("Chapter 3 coverage matrix has one P8C primary classification per slot", () => {
  const allowed = new Set(Object.values(CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION));
  for (const entry of matrix.entries) {
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
  assert.equal(matrix.summary.p8bClassificationCounts.NUMERICALLY_IMPLEMENTED, 46);
  assert.equal(matrix.summary.p8bClassificationCounts.PROCEDURALLY_IMPLEMENTED, 4);
  assert.equal(matrix.summary.p8bClassificationCounts.EXPLICIT_INPUT_BOUNDARY, 166);
  assert.equal(matrix.summary.p8bClassificationCounts.EXTERNAL_STANDARD_BLOCKED, 1);
  assert.equal(matrix.summary.numericalImplementationPercentage, 21.2);
});

test("Chapter 3 P8C registers every remaining explicit boundary with a reason", () => {
  assert.equal(
    matrix.explicitBoundaryRegister.length,
    matrix.summary.explicitInputBoundaryRelations
  );
  for (const boundary of matrix.explicitBoundaryRegister) {
    assert.equal(typeof boundary.reason, "string");
    assert.ok(boundary.reason.length > 20, boundary.matrixId);
  }
  for (const relation of [
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
