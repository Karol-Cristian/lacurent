import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

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
  readFileSync(
    new URL("../validation-reference/mc001-chapter4-implementation-matrix.json", import.meta.url),
    "utf8"
  )
);

function pathExists(path) {
  return existsSync(new URL(`../${path}`, import.meta.url));
}

test("Chapter 4 matrix records every official subchapter exactly once", () => {
  assert.equal(matrix.schema, "mc001_chapter4_implementation_matrix_v1");
  assert.deepEqual(
    matrix.chapter4Subchapters.map(section => section.section),
    ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"]
  );
  assert.equal(new Set(matrix.chapter4Subchapters.map(section => section.section)).size, 6);
  for (const section of matrix.chapter4Subchapters) {
    assert.ok(section.titleRo);
    assert.ok(section.sourcePdfPages);
    assert.ok(Array.isArray(section.classification));
    assert.ok(section.p7Status);
  }
});

test("Chapter 4 PV relation coverage is function, product, notebook and report traceable", () => {
  const pv = matrix.chapter4Subchapters.find(section => section.section === "4.5");
  assert.equal(pv.p7Status, "IMPLEMENTED_PRODUCTION_SUBSET");
  assert.deepEqual(
    pv.relationCoverage.map(item => item.relation),
    ["4.160", "4.161", "4.162", "4.163", "4.164", "4.165"]
  );
  assert.equal(pathExists(pv.implementation.runtimeModule), true);
  assert.equal(pathExists(pv.implementation.buildingAdapter), true);
  assert.equal(pathExists(pv.implementation.notebook), true);
  assert.equal(pathExists(pv.implementation.report), true);
  for (const testPath of pv.tests) {
    assert.equal(pathExists(testPath), true, testPath);
  }
  for (const relation of pv.relationCoverage) {
    assert.equal(
      relation.status,
      "IMPLEMENTED_UNIT_TESTED_PRODUCT_INTEGRATED_NOTEBOOK_VISIBLE"
    );
  }
});

test("Chapter 4 matrix keeps deferred domains honest instead of using placeholders", () => {
  for (const section of matrix.chapter4Subchapters.filter(item => item.section !== "4.5")) {
    assert.equal(section.implementation, null);
    assert.deepEqual(section.tests, []);
    assert.ok(section.reasonNotImplementedInP7);
    assert.ok(
      [
        "DEFERRED_COHERENT_DOMAIN",
        "DEFERRED_COHERENT_DOMAIN_AND_LATER_CHAPTER_INTERACTION",
        "EXTERNAL_STANDARD_DEPENDENCY"
      ].includes(section.p7Status),
      section.p7Status
    );
  }
});
