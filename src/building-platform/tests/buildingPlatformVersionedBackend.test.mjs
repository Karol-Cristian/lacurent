import assert from "node:assert/strict";
import {
  createBuildingDnaFromAssistedAnswers,
  createInMemoryVersionedBuildingBackend,
  fingerprintBuildingDna,
  fingerprintClimateProfile
} from "../index.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function buildingDna(options = {}) {
  const result = createBuildingDnaFromAssistedAnswers({
    buildingId: options.buildingId ?? "p3e-versioned-house",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: options.structuralSystem ?? "masonry",
    renovations: {
      wallInsulation: "eps",
      wallInsulationThicknessM: options.wallInsulationThicknessM ?? 0.1,
      windowsReplaced: true
    },
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      windowAreaM2: options.windowAreaM2 ?? 18,
      averageRoomHeightM: 2.7,
      ventilationAch: 0.5,
      mainOrientation: "south",
      windowOrientation: options.windowOrientation ?? "south",
      ventilationType: "natural"
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    climateProfileId: options.climateProfileId ?? "ro_synthetic_bucharest_seasonal_demo_v1",
    allowSyntheticClimate: true,
    source: {
      reference: options.sourceReference ?? "P3E.test.versioned_backend"
    }
  });
  assert.equal(result.status, "ready");
  return result.buildingDna;
}

test("Building DNA fingerprint is deterministic and excludes presentation-only UI mode/source", () => {
  const dna = buildingDna();
  const clone = JSON.parse(JSON.stringify(dna));
  clone.userMode = "advanced";
  clone.source = { reference: "P3E.test.changed_presentation_source" };
  clone.assumptions = [];

  assert.equal(fingerprintBuildingDna(dna), fingerprintBuildingDna(clone));
  assert.equal(fingerprintClimateProfile(dna).startsWith("climate_"), true);
});

test("Building DNA fingerprint changes for engineering orientation, insulation and climate changes", () => {
  const base = buildingDna();
  const north = buildingDna({ windowOrientation: "north" });
  const thicker = buildingDna({ wallInsulationThicknessM: 0.15 });
  const climateChanged = JSON.parse(JSON.stringify(base));
  climateChanged.monthlyProfiles[0].transmission.heating.outdoorTemperature.amount -= 1;

  assert.notEqual(fingerprintBuildingDna(base), fingerprintBuildingDna(north));
  assert.notEqual(fingerprintBuildingDna(base), fingerprintBuildingDna(thicker));
  assert.notEqual(fingerprintBuildingDna(base), fingerprintBuildingDna(climateChanged));
});

test("save and calculate creates immutable project, Building DNA, analysis and report versions", () => {
  const backend = createInMemoryVersionedBuildingBackend();
  const result = backend.saveAndCalculate({
    ownerUserId: 1,
    projectName: "P3E Project",
    buildingDna: buildingDna(),
    idempotencyKey: "initial-save",
    creationReason: "initial_project_creation"
  });

  assert.equal(result.ok, true);
  assert.equal(result.project.project_id, "bp-project-1");
  assert.equal(result.project.current_building_dna_version_id, "dna-version-1");
  assert.equal(result.project.current_analysis_version_id, "analysis-version-1");
  assert.equal(result.project.current_report_version_id, "report-version-1");
  assert.equal(result.buildingDnaVersion.schema_version, "building_dna_version_v1");
  assert.equal(result.analysisVersion.adapter_version, "building_chapter_2_adapter_v1");
  assert.equal(
    result.analysisVersion.normative_registry_version,
    "MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX"
  );
  assert.equal(
    result.reportVersion.calculation_fingerprint,
    result.analysisVersion.calculation_fingerprint
  );
  assert.equal(result.resultSummary.annualQHnd > 0, true);
  assert.equal(result.resultSummary.annualQCnd > 0, true);
  assert.equal(backend.state.auditEvents.some((event) => event.action === "calculation_completed"), true);
});

test("idempotency returns the original successful result without duplicate versions", () => {
  const backend = createInMemoryVersionedBuildingBackend();
  const first = backend.saveAndCalculate({
    ownerUserId: 1,
    buildingDna: buildingDna(),
    idempotencyKey: "same-submit"
  });
  const replay = backend.saveAndCalculate({
    ownerUserId: 1,
    buildingDna: buildingDna(),
    idempotencyKey: "same-submit"
  });

  assert.equal(replay.ok, true);
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.project.project_id, first.project.project_id);
  assert.equal(backend.state.projects.size, 1);
  assert.equal(backend.state.analysisVersions.size, 1);
  assert.equal(backend.state.reportVersions.size, 1);
});

test("reopen restores exact saved versions without recalculation", () => {
  const backend = createInMemoryVersionedBuildingBackend();
  const saved = backend.saveAndCalculate({
    ownerUserId: 1,
    buildingDna: buildingDna()
  });
  const analysisCount = backend.state.analysisVersions.size;
  const reopened = backend.reopenProject({
    ownerUserId: 1,
    projectId: saved.project.project_id
  });

  assert.equal(reopened.ok, true);
  assert.equal(backend.state.analysisVersions.size, analysisCount);
  assert.deepEqual(reopened.buildingDnaVersion, saved.buildingDnaVersion);
  assert.equal(
    reopened.reportVersion.calculation_fingerprint,
    saved.analysisVersion.calculation_fingerprint
  );
});

test("recalculation creates new versions and preserves old versions", () => {
  const backend = createInMemoryVersionedBuildingBackend();
  const first = backend.saveAndCalculate({
    ownerUserId: 1,
    buildingDna: buildingDna({ wallInsulationThicknessM: 0.05 })
  });
  const second = backend.saveAndCalculate({
    ownerUserId: 1,
    projectId: first.project.project_id,
    expectedCurrentBuildingDnaVersionId: first.project.current_building_dna_version_id,
    buildingDna: buildingDna({ wallInsulationThicknessM: 0.2 }),
    creationReason: "renovation_intervention"
  });

  assert.equal(second.ok, true);
  assert.equal(second.project.current_building_dna_version_id, "dna-version-2");
  assert.equal(backend.state.buildingDnaVersions.size, 2);
  assert.equal(backend.state.analysisVersions.size, 2);
  assert.notEqual(
    second.analysisVersion.calculation_fingerprint,
    first.analysisVersion.calculation_fingerprint
  );

  const dnaDiff = backend.compareBuildingDnaVersions({
    ownerUserId: 1,
    projectId: first.project.project_id,
    oldVersionId: first.buildingDnaVersion.building_dna_version_id,
    newVersionId: second.buildingDnaVersion.building_dna_version_id
  });
  assert.equal(dnaDiff.ok, true);
  assert.equal(
    dnaDiff.changedPaths.some((item) => item.path.includes("thickness.amount")),
    true
  );

  const analysisDiff = backend.compareAnalysisVersions({
    ownerUserId: 1,
    projectId: first.project.project_id,
    oldAnalysisVersionId: first.analysisVersion.analysis_version_id,
    newAnalysisVersionId: second.analysisVersion.analysis_version_id
  });
  assert.equal(analysisDiff.ok, true);
  assert.notEqual(analysisDiff.changedValues.annualQHnd.delta, 0);
});

test("stale current version token blocks concurrent overwrite", () => {
  const backend = createInMemoryVersionedBuildingBackend();
  const first = backend.saveAndCalculate({
    ownerUserId: 1,
    buildingDna: buildingDna()
  });
  const second = backend.saveAndCalculate({
    ownerUserId: 1,
    projectId: first.project.project_id,
    expectedCurrentBuildingDnaVersionId: first.project.current_building_dna_version_id,
    buildingDna: buildingDna({ windowAreaM2: 20 })
  });
  assert.equal(second.ok, true);

  const stale = backend.saveAndCalculate({
    ownerUserId: 1,
    projectId: first.project.project_id,
    expectedCurrentBuildingDnaVersionId: first.project.current_building_dna_version_id,
    buildingDna: buildingDna({ windowAreaM2: 22 })
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.status, 409);
  assert.equal(stale.code, "stale_project_version_conflict");
});

test("ownership, diagnostics and bounded reprocessing are enforced", () => {
  const backend = createInMemoryVersionedBuildingBackend();
  const saved = backend.saveAndCalculate({
    ownerUserId: 1,
    buildingDna: buildingDna()
  });

  assert.equal(
    backend.reopenProject({ ownerUserId: 2, projectId: saved.project.project_id }).code,
    "project_not_found_for_owner"
  );
  assert.equal(backend.listProjects({ ownerUserId: 2 }).length, 0);

  const dryRun = backend.dryRunReprocessing({
    ownerUserId: 1,
    projectId: saved.project.project_id
  });
  assert.equal(dryRun.status, "eligible");
  const reprocessed = backend.reprocessCurrentProject({
    ownerUserId: 1,
    projectId: saved.project.project_id
  });
  assert.equal(reprocessed.ok, true);
  assert.equal(backend.state.buildingDnaVersions.size, 1);
  assert.equal(backend.state.analysisVersions.size, 2);

  const diagnostics = backend.diagnostics({
    ownerUserId: 1,
    projectId: saved.project.project_id
  });
  assert.equal(diagnostics.ok, true);
  assert.equal(diagnostics.reportFingerprint, diagnostics.analysisFingerprint);
});
