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

const allowedStatuses = new Set(Object.values(CHAPTER_3_MATRIX_STATUS));

test("Chapter 3 matrix classifies every discovered relation or relation group", () => {
  const covered = new Set(chapter3ImplementationMatrix.flatMap(entry => entry.relations));
  const missing = discoveredChapter3Relations.filter(relation => !covered.has(relation));

  assert.deepEqual(missing, []);
});

test("Chapter 3 matrix uses precise statuses and explicit coverage flags", () => {
  for (const entry of chapter3ImplementationMatrix) {
    assert.ok(allowedStatuses.has(entry.status), `${entry.matrixId} status`);
    assert.equal(typeof entry.source, "string", `${entry.matrixId} source`);
    assert.notEqual(entry.source.length, 0, `${entry.matrixId} source length`);
    assert.ok("sourceExtracted" in entry, `${entry.matrixId} sourceExtracted`);
    assert.ok("formulaImplemented" in entry, `${entry.matrixId} formulaImplemented`);
    assert.ok("branchesImplemented" in entry, `${entry.matrixId} branchesImplemented`);
    assert.ok("numericalFixtureCovered" in entry, `${entry.matrixId} numericalFixtureCovered`);
    assert.ok("runtimeIntegrated" in entry, `${entry.matrixId} runtimeIntegrated`);
    assert.ok("notebookTraceable" in entry, `${entry.matrixId} notebookTraceable`);
  }
});

test("implemented Chapter 3 rows identify runtime implementation, tests and validation fixtures", () => {
  const implemented = chapter3ImplementationMatrix.filter(
    entry =>
      entry.status !== CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED &&
      entry.status !== CHAPTER_3_MATRIX_STATUS.GENUINELY_UNAVAILABLE_UNREADABLE
  );

  assert.ok(implemented.length >= 8);
  for (const entry of implemented) {
    assert.equal(typeof entry.implementation, "string", `${entry.matrixId} implementation`);
    assert.ok(entry.tests.length > 0, `${entry.matrixId} tests`);
    assert.ok(entry.validationFixture, `${entry.matrixId} validation fixture`);
    assert.notEqual(entry.formulaImplemented, false, `${entry.matrixId} formula implemented`);
    assert.notEqual(entry.numericalFixtureCovered, false, `${entry.matrixId} fixture covered`);
  }
});

test("genuine Chapter 3 blockers identify exact missing artifact and source location", () => {
  const blocked = chapter3ImplementationMatrix.filter(
    entry =>
      entry.status === CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED ||
      entry.status === CHAPTER_3_MATRIX_STATUS.GENUINELY_UNAVAILABLE_UNREADABLE
  );

  assert.deepEqual(
    blocked.map(entry => entry.matrixId),
    [
      "CH3_REL_3_111",
      "CH3_REL_3_112",
      "CH3_REL_3_113",
      "CH3_REL_3_4_SR_EN_15193_1_DELEGATED"
    ]
  );

  for (const entry of blocked) {
    assert.equal(entry.implementation, null, `${entry.matrixId} implementation`);
    assert.equal(entry.tests.length, 0, `${entry.matrixId} tests`);
    assert.equal(typeof entry.blocker.sourceLocation, "string", `${entry.matrixId} sourceLocation`);
    assert.equal(typeof entry.blocker.missingElement, "string", `${entry.matrixId} missingElement`);
    assert.equal(typeof entry.blocker.requiredInputContract, "string", `${entry.matrixId} requiredInputContract`);
    assert.equal(typeof entry.blocker.whyDeterministicImplementationCannotProceed, "string", `${entry.matrixId} why`);
    assert.notEqual(entry.blocker.sourceLocation.length, 0);
    assert.notEqual(entry.blocker.missingElement.length, 0);
    assert.notEqual(entry.blocker.requiredInputContract.length, 0);
    assert.notEqual(entry.blocker.whyDeterministicImplementationCannotProceed.length, 0);
  }
});

test("Chapter 3 matrix summary exposes maximum available coverage counts", () => {
  const summary = chapter3MatrixSummary();

  assert.equal(summary.matrixStatus, "CHAPTER_3_MATRIX_MAXIMUM_AVAILABLE_COVERAGE");
  assert.equal(summary.relationCount, discoveredChapter3Relations.length);
  assert.equal(summary.blockerEntryCount, 4);
  assert.equal(summary.genuinelyExternallyBlockedRelations, 1);
  assert.equal(summary.genuinelyUnavailableUnreadableRelations, 3);
  assert.deepEqual(summary.uncoveredRelations, []);
  assert.ok(summary.totalChapter3RelationsIdentified > 190);
  assert.ok(summary.implementedEquations > 180);
  assert.ok(summary.implementedTablesLookups >= 25);
  assert.ok(summary.runtimeIntegratedRelations >= 7);
  assert.ok(summary.notebookVisibleRelations >= 7);
});

test("Chapter 3 dependency graph separates useful energy, systems and delegated lighting domains", () => {
  assert.deepEqual(Object.keys(chapter3DependencyGraph).sort(), [
    "coolingStorage",
    "coolingSystems",
    "dhwSystems",
    "heatingSystems",
    "lighting",
    "subsystemBalances",
    "usefulEnergyInputs",
    "ventilationAhu"
  ]);

  assert.ok(chapter3DependencyGraph.subsystemBalances.outputs.includes("subsystem input energy"));
  assert.ok(chapter3DependencyGraph.lighting.sources.includes("SR EN 15193-1"));
});
