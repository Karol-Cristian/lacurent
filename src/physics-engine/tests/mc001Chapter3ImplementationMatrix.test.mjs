import assert from "node:assert/strict";
import {
  CHAPTER_3_MATRIX_STATUS,
  chapter3DependencyGraph,
  chapter3ImplementationMatrix,
  chapter3MatrixSummary,
  discoveredChapter3Relations
} from "./fixtures/mc001Chapter3ImplementationMatrixFixture.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

test("Chapter 3 matrix classifies every discovered relation or relation group", () => {
  const covered = new Set(chapter3ImplementationMatrix.flatMap(entry => entry.relations));
  const missing = discoveredChapter3Relations.filter(relation => !covered.has(relation));

  assert.deepEqual(missing, []);
});

test("Chapter 3 matrix keeps blocked normative domains explicit instead of silently implemented", () => {
  const summary = chapter3MatrixSummary();

  assert.equal(summary.matrixStatus, "CHAPTER_3_MATRIX_INCOMPLETE");
  assert.ok(summary.blockedEntryCount > 0);
  assert.deepEqual(summary.uncoveredRelations, []);
  assert.ok(summary.blockedMatrixIds.includes("CH3_HEATING_SYSTEMS_3_1"));
  assert.ok(summary.blockedMatrixIds.includes("CH3_AHU_VISUAL_PENDING"));
  assert.ok(summary.blockedMatrixIds.includes("CH3_LIGHTING_3_4"));
});

test("implemented Chapter 3 matrix rows identify runtime implementation, tests, dependencies and notebook traceability", () => {
  const implemented = chapter3ImplementationMatrix.filter(entry =>
    entry.implementationStatus === CHAPTER_3_MATRIX_STATUS.IMPLEMENTED ||
    entry.implementationStatus === CHAPTER_3_MATRIX_STATUS.IMPLEMENTED_ISOLATED_EXPLICIT_INPUT
  );

  assert.ok(implemented.length >= 4);

  for (const entry of implemented) {
    assert.equal(typeof entry.implementation, "string", `${entry.matrixId} implementation`);
    assert.ok(entry.tests.length > 0, `${entry.matrixId} tests`);
    assert.ok(entry.dependencyList.length > 0, `${entry.matrixId} dependencies`);
    assert.ok(entry.expectedInputs.length > 0, `${entry.matrixId} inputs`);
    assert.ok(entry.expectedOutputs.length > 0, `${entry.matrixId} outputs`);
    assert.match(entry.notebookTraceability, /trace_nodes_available/);
    assert.match(entry.coverage, /implemented/);
  }
});

test("blocked Chapter 3 matrix rows preserve blocker reason and source path", () => {
  const blocked = chapter3ImplementationMatrix.filter(entry =>
    entry.implementationStatus.startsWith("blocked")
  );

  assert.ok(blocked.length > 0);

  for (const entry of blocked) {
    assert.equal(entry.implementation, null, `${entry.matrixId} implementation`);
    assert.equal(entry.tests.length, 0, `${entry.matrixId} tests`);
    assert.equal(typeof entry.blocker, "string", `${entry.matrixId} blocker`);
    assert.notEqual(entry.blocker.length, 0, `${entry.matrixId} blocker length`);
    assert.match(entry.coverage, /blocked/);
  }
});

test("Chapter 3 dependency graph separates useful demand, system energy, DHW and lighting domains", () => {
  assert.deepEqual(Object.keys(chapter3DependencyGraph).sort(), [
    "coolingVentilationSystems",
    "dhwDistributionAuxiliary",
    "dhwStorageGeneration",
    "dhwUsefulDemand",
    "heatingSystems",
    "lighting"
  ]);

  assert.ok(chapter3DependencyGraph.dhwUsefulDemand.blockers.length === 0);
  assert.ok(chapter3DependencyGraph.lighting.blockers.length > 0);
});
