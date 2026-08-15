import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
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
  assert.equal(matrix.schema, "mc001_chapter3_coverage_matrix_p8_v1");
  assert.deepEqual(matrix.summary, chapter3MatrixSummary());
  assert.equal(matrix.entries.length, chapter3ImplementationMatrix.length);
  assert.deepEqual(
    matrix.entries.map(entry => entry.matrixId),
    chapter3ImplementationMatrix.map(entry => entry.matrixId)
  );
});

test("Chapter 3 coverage matrix records the P8 production topology contract", () => {
  assert.equal(
    matrix.productionTopology.schema,
    "mc001_chapter3_production_topology_p8_v1"
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

test("Chapter 3 coverage matrix keeps the SR EN 15193-1 lighting engine bounded", () => {
  const blockers = matrix.summary.blockerDetails;
  assert.equal(blockers.length, 1);
  assert.equal(blockers[0].externalStandard, "SR EN 15193-1");
  assert.ok(blockers[0].missingElement.includes("SR EN 15193-1"));
});
