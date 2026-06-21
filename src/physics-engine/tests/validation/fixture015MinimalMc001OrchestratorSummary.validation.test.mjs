import assert from "node:assert/strict";
import { createMinimalMc001OrchestratorSummary } from "../../minimalMc001OrchestratorSummary.mjs";
import { fixture015MinimalMc001OrchestratorSummary as fixture } from "./fixture015MinimalMc001OrchestratorSummary.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function ids(items, key) {
  return items.map((item) => item[key]);
}

test("validates Fixture 015 fixed Level 0 summary contract", () => {
  const summary = createMinimalMc001OrchestratorSummary();

  assert.equal(summary.summaryType, fixture.expectedSummary.summaryType);
  assert.equal(summary.level, fixture.expectedSummary.level);
  assert.equal(summary.isProductionOrchestrator, false);
  assert.equal(summary.isCertificateWorkflow, false);
  assert.equal(summary.recommendedNextStep, fixture.expectedSummary.recommendedNextStep);
  assert.equal(summary.level1Readiness.ready, false);
  assert.equal(summary.level1Readiness.status, "NOT_READY_EXPLICIT_INPUT_PACK_REQUIRED");
});

test("validates Fixture 015 coverage includes Fixture 001 through Fixture 014", () => {
  const summary = createMinimalMc001OrchestratorSummary();

  assert.equal(summary.fixtureCoverage.fixtureCount, 14);
  assert.equal(summary.fixtureCoverage.coversFixtures001Through014, true);
  assert.deepEqual(ids(summary.sourceFixtures, "fixtureId"), fixture.expectedSourceFixtureIds);
});

test("validates Fixture 015 component summary includes every reviewed domain", () => {
  const summary = createMinimalMc001OrchestratorSummary();

  assert.deepEqual(ids(summary.validatedComponents, "componentId"), fixture.expectedValidatedComponentIds);

  const envelope = summary.validatedComponents.find(
    (component) => component.componentId === "envelope_transmission"
  );
  assert.ok(envelope.validatedResults.includes("material_correction"));
  assert.ok(envelope.validatedResults.includes("transmission_table_totals"));

  const dhw = summary.validatedComponents.find((component) => component.componentId === "dhw");
  assert.ok(dhw.validatedResults.includes("dhw_pipe_psi_component_formulas"));
  assert.ok(dhw.validatedResults.includes("useful_dhw_demand_qw_nd"));
  assert.ok(dhw.validatedResults.includes("displayed_dhw_subtotal_arithmetic"));
});

test("validates Fixture 015 service-row and display-only classifications", () => {
  const summary = createMinimalMc001OrchestratorSummary();
  const serviceRows = summary.validatedComponents.find(
    (component) => component.componentId === "service_final_primary_rows"
  );

  assert.equal(serviceRows.traceability, "service_row_validation_not_certificate_workflow");
  assert.deepEqual(
    ids(summary.displayOnlyReconciliations, "reconciliationId"),
    fixture.expectedDisplayOnlyReconciliationIds
  );
});

test("validates Fixture 015 preserves heating ambiguities", () => {
  const summary = createMinimalMc001OrchestratorSummary();
  const ambiguityIds = ids(summary.ambiguousComponents, "ambiguityId");

  for (const ambiguityId of fixture.requiredAmbiguities) {
    assert.ok(ambiguityIds.includes(ambiguityId), ambiguityId);
  }
});

test("validates Fixture 015 preserves explicit blockers", () => {
  const summary = createMinimalMc001OrchestratorSummary();
  const blockerIds = ids(summary.blockedComponents, "blockerId");

  for (const blockerId of fixture.requiredBlockers) {
    assert.ok(blockerIds.includes(blockerId), blockerId);
  }
});

test("validates Fixture 015 keeps Level 1 orchestration blocked", () => {
  const summary = createMinimalMc001OrchestratorSummary();

  assert.equal(summary.level1Readiness.ready, false);
  for (const candidate of fixture.requiredUnsafeLevel1Candidates) {
    assert.ok(summary.unsafeForLevel1Candidates.includes(candidate), candidate);
  }
});

test("validates Fixture 015 output is serializable and has no certificate object", () => {
  const summary = createMinimalMc001OrchestratorSummary();
  const serialized = JSON.stringify(summary);
  const parsed = JSON.parse(serialized);

  assert.deepEqual(parsed, summary);
  assert.equal("certificate" in summary, false);
  assert.equal("cpe" in summary, false);
  assert.equal("officialCertificate" in summary, false);
  assert.equal(serialized.includes("officialCertificate"), false);
});

