import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createMinimalMc001OrchestratorSummary,
  evaluateLevel1Readiness,
  summarizeBlockedComponents,
  summarizeFixtureCoverage,
  summarizeValidatedComponents
} from "../minimalMc001OrchestratorSummary.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function getIds(items, key) {
  return items.map((item) => item[key]);
}

test("creates a Level 0 MC001 summary with fixed boundary values", () => {
  const summary = createMinimalMc001OrchestratorSummary();

  assert.equal(summary.summaryType, "MC001_MINIMAL_ORCHESTRATOR_SUMMARY");
  assert.equal(summary.level, "LEVEL_0_SUMMARY_AGGREGATOR");
  assert.equal(summary.isProductionOrchestrator, false);
  assert.equal(summary.isCertificateWorkflow, false);
  assert.equal(
    summary.recommendedNextStep,
    "BUILD_EXPLICIT_LEVEL_1_INPUT_PACK_BEFORE_COMPONENT_ORCHESTRATION"
  );
});

test("includes Fixture 001 through Fixture 014 coverage", () => {
  const summary = createMinimalMc001OrchestratorSummary();
  const fixtureNumbers = summary.sourceFixtures.map((fixture) => fixture.fixtureNumber);

  assert.equal(summary.fixtureCoverage.fixtureCount, 14);
  assert.equal(summary.fixtureCoverage.coversFixtures001Through014, true);
  assert.deepEqual(fixtureNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assert.equal(
    summary.sourceFixtures.some(
      (fixture) => fixture.fixtureId === "FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION"
    ),
    true
  );
});

test("summarizes validated components and traceable result areas", () => {
  const componentIds = getIds(summarizeValidatedComponents(), "componentId");

  assert.ok(componentIds.includes("envelope_transmission"));
  assert.ok(componentIds.includes("ventilation"));
  assert.ok(componentIds.includes("monthly_heating"));
  assert.ok(componentIds.includes("final_primary_co2"));
  assert.ok(componentIds.includes("service_final_primary_rows"));
  assert.ok(componentIds.includes("dhw"));
  assert.ok(componentIds.includes("rer_display"));
  assert.ok(componentIds.includes("energy_classes_utility_inclusion"));

  const summary = createMinimalMc001OrchestratorSummary();
  const classComponent = summary.validatedComponents.find(
    (component) => component.componentId === "energy_classes_utility_inclusion"
  );
  assert.ok(
    classComponent.validatedResults.includes(
      "school_without_cooling_135_minus_13_equals_122_kwh_per_m2_an"
    )
  );
  assert.ok(
    classComponent.validatedResults.includes(
      "school_without_cooling_23_minus_13_times_0_107_equals_21_61_kgco2_per_m2_an"
    )
  );
});

test("classifies Fixture 008 as service-row validation and display-only rows separately", () => {
  const summary = createMinimalMc001OrchestratorSummary();
  const serviceRows = summary.validatedComponents.find(
    (component) => component.componentId === "service_final_primary_rows"
  );

  assert.equal(serviceRows.traceability, "service_row_validation_not_certificate_workflow");
  assert.deepEqual(serviceRows.sourceFixtures, ["FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS"]);

  assert.deepEqual(
    summary.displayOnlyReconciliations.map((entry) => entry.sourceFixture),
    [
      "FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL",
      "FIXTURE_012_RER_DISPLAY_RECONCILIATION"
    ]
  );
});

test("preserves Apr Sep Oct heating ambiguity markers", () => {
  const summary = createMinimalMc001OrchestratorSummary();
  const ambiguityIds = getIds(summary.ambiguousComponents, "ambiguityId");

  assert.ok(ambiguityIds.includes("april_boundary_period_extraction_gap"));
  assert.ok(ambiguityIds.includes("september_boundary_period_extraction_gap"));
  assert.ok(ambiguityIds.includes("october_mc001_worked_example_ambiguity"));
  assert.ok(ambiguityIds.includes("figure_2_18_gamma_h_greater_than_2_branch_preserved"));
});

test("preserves DHW, RER, certificate and CPE blockers", () => {
  const blockerIds = getIds(summarizeBlockedComponents(), "blockerId");

  assert.ok(blockerIds.includes("annual_dhw_distribution_loss_basis"));
  assert.ok(blockerIds.includes("dhw_storage_losses"));
  assert.ok(blockerIds.includes("dhw_generation_losses"));
  assert.ok(blockerIds.includes("dhw_recovered_losses"));
  assert.ok(blockerIds.includes("dhw_auxiliary_energy"));
  assert.ok(blockerIds.includes("full_dhw_final_energy"));
  assert.ok(blockerIds.includes("general_rer_methodology"));
  assert.ok(blockerIds.includes("epren_rer_perimeter_export_treatment"));
  assert.ok(blockerIds.includes("full_certificate_cpe_workflow"));
});

test("marks Level 1 as not ready without an explicit helper-input pack", () => {
  const summary = createMinimalMc001OrchestratorSummary();
  const readiness = evaluateLevel1Readiness();

  assert.equal(summary.level1Readiness.ready, false);
  assert.equal(readiness.ready, false);
  assert.equal(readiness.status, "NOT_READY_EXPLICIT_INPUT_PACK_REQUIRED");
  assert.ok(summary.unsafeForLevel1Candidates.includes("full_mc001_auditor"));
  assert.ok(summary.unsafeForLevel1Candidates.includes("certificate_cpe_workflow"));
});

test("summarizes fixture coverage deterministically", () => {
  const summary = createMinimalMc001OrchestratorSummary();
  const coverage = summarizeFixtureCoverage(summary.sourceFixtures);

  assert.equal(coverage.fixtureCount, 14);
  assert.equal(coverage.missingFixtureNumbers.length, 0);
  assert.deepEqual(coverage.coveredFixtureIds, summary.fixtureCoverage.coveredFixtureIds);
});

test("returns deterministic serializable output", () => {
  const first = createMinimalMc001OrchestratorSummary();
  const second = createMinimalMc001OrchestratorSummary();
  const parsed = JSON.parse(JSON.stringify(first));

  assert.deepEqual(first, second);
  assert.deepEqual(parsed, first);
});

test("does not import or call product integration code", () => {
  const source = readFileSync(new URL("../minimalMc001OrchestratorSummary.mjs", import.meta.url), "utf8");
  const importLines = source.split("\n").filter((line) => line.trim().startsWith("import "));
  const forbiddenImportFragments = ["ui", "api", "db", "worker", "schema", "report", "certificate"];

  assert.equal(importLines.length, 0);
  for (const fragment of forbiddenImportFragments) {
    assert.equal(
      importLines.some((line) => line.toLowerCase().includes(fragment)),
      false,
      `${fragment} must not be imported by summary module`
    );
  }

  assert.equal(source.includes("createCertificate("), false);
  assert.equal(source.includes("generateReport("), false);
  assert.equal(source.includes("fetch("), false);
});

