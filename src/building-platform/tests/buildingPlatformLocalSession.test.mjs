import assert from "node:assert/strict";
import {
  LOCAL_PROJECT_DIRTY_STATES,
  applyLocalBuildingDnaEdit,
  buildUnsavedExitOptions,
  createBuildingDnaFromAssistedAnswers,
  createLocalProjectSession,
  fingerprintBuildingDna,
  getBuildingPlatformOperationInventory,
  markDraftSaved,
  markPermanentVersionSaved,
  recordUnsavedCalculation,
  shouldWarnBeforeExit
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
    buildingId: "p3e-b-local-session-house",
    buildingType: "detached_house",
    constructionPeriod: "1978_1990",
    structuralSystem: "masonry",
    renovations: {
      wallInsulation: "eps",
      wallInsulationThicknessM: options.wallInsulationThicknessM ?? 0.1,
      windowsReplaced: true
    },
    buildingSpecificParameters: {
      usefulFloorAreaM2: 120,
      windowAreaM2: 18,
      averageRoomHeightM: 2.7,
      ventilationAch: 0.5,
      mainOrientation: "south",
      windowOrientation: "south",
      ventilationType: "natural"
    },
    context: {
      attic: "unheated",
      basement: "none"
    },
    climateProfileId: "ro_synthetic_bucharest_seasonal_demo_v1",
    allowSyntheticClimate: true,
    source: {
      reference: "P3E-B.test.local_session"
    }
  });
  assert.equal(result.status, "ready");
  return result.buildingDna;
}

function openPayload() {
  const dna = buildingDna();
  return {
    project: {
      project_id: "bp-project-local",
      project_status: "calculated",
      current_building_dna_version_id: "dna-version-1",
      current_analysis_version_id: "analysis-version-1",
      current_report_version_id: "report-version-1",
      updated_at: "2026-01-01T00:00:00.000Z"
    },
    buildingDnaVersion: {
      building_dna_version_id: "dna-version-1",
      complete_building_dna: dna,
      building_dna_fingerprint: fingerprintBuildingDna(dna)
    },
    analysisVersion: {
      analysis_version_id: "analysis-version-1",
      calculation_fingerprint: "analysis_saved"
    },
    reportVersion: {
      technical_report_version_id: "report-version-1",
      calculation_fingerprint: "analysis_saved"
    }
  };
}

test("local project session starts clean and does not overwrite saved state on edits", () => {
  const session = createLocalProjectSession(openPayload());
  const changed = applyLocalBuildingDnaEdit(session, {
    path: "renovationInterventions[0].thickness.amount",
    value: 0.18,
    changedAt: "2026-01-01T01:00:00.000Z"
  });

  assert.equal(session.dirty.state, LOCAL_PROJECT_DIRTY_STATES.CLEAN);
  assert.equal(changed.dirty.state, LOCAL_PROJECT_DIRTY_STATES.MODIFIED_LOCALLY);
  assert.equal(shouldWarnBeforeExit(changed), true);
  assert.deepEqual(buildUnsavedExitOptions(changed), [
    "Ramai in proiect",
    "Salveaza draft",
    "Renunta la modificari"
  ]);
  assert.notEqual(
    changed.editableDraftState.buildingDnaFingerprint,
    session.savedCurrentState.buildingDnaFingerprint
  );
  assert.equal(
    session.savedCurrentState.buildingDnaFingerprint,
    session.currentFingerprints.buildingDnaFingerprint
  );
});

test("presentation-only edits do not dirty the engineering model", () => {
  const session = createLocalProjectSession(openPayload());
  const changed = applyLocalBuildingDnaEdit(session, {
    path: "ui.viewMode",
    value: "audit"
  });

  assert.equal(changed.presentationOnly, true);
  assert.equal(session.dirty.state, LOCAL_PROJECT_DIRTY_STATES.CLEAN);
});

test("unsaved recalculation and explicit draft save remain local-first states", () => {
  const session = createLocalProjectSession(openPayload());
  const edited = applyLocalBuildingDnaEdit(session, {
    path: "geometry.windowAreaM2.amount",
    value: 24
  });
  const calculated = recordUnsavedCalculation(edited, {
    calculationFingerprint: "analysis_unsaved",
    reportFingerprint: "analysis_unsaved",
    resultSummary: { annualQHnd: 1000, annualQCnd: 100 }
  });
  const draftSaved = markDraftSaved(calculated, {
    draft_id: "draft-1",
    draft_fingerprint: calculated.currentFingerprints.buildingDnaFingerprint,
    updated_at: "2026-01-01T02:00:00.000Z"
  });

  assert.equal(calculated.dirty.state, LOCAL_PROJECT_DIRTY_STATES.CALCULATED_UNSAVED);
  assert.equal(calculated.unsavedCalculationState.calculationFingerprint, "analysis_unsaved");
  assert.equal(draftSaved.dirty.state, LOCAL_PROJECT_DIRTY_STATES.DRAFT_SAVED);
  assert.equal(draftSaved.draftSaveState.activeDraft.draft_id, "draft-1");
  assert.notDeepEqual(draftSaved.savedCurrentState.buildingDna, draftSaved.editableDraftState.buildingDna);
});

test("permanent save resets local dirty paths to the saved immutable version", () => {
  const session = createLocalProjectSession(openPayload());
  const edited = applyLocalBuildingDnaEdit(session, {
    path: "geometry.windowAreaM2.amount",
    value: 24
  });
  const saved = markPermanentVersionSaved(edited, {
    project: {
      project_id: "bp-project-local",
      current_building_dna_version_id: "dna-version-2",
      current_analysis_version_id: "analysis-version-2",
      current_report_version_id: "report-version-2",
      updated_at: "2026-01-01T03:00:00.000Z"
    },
    buildingDnaVersion: {
      building_dna_version_id: "dna-version-2",
      complete_building_dna: edited.editableDraftState.buildingDna,
      building_dna_fingerprint: edited.editableDraftState.buildingDnaFingerprint
    },
    analysisVersion: {
      analysis_version_id: "analysis-version-2",
      calculation_fingerprint: "analysis_saved_2"
    },
    reportVersion: {
      technical_report_version_id: "report-version-2",
      calculation_fingerprint: "analysis_saved_2"
    }
  });

  assert.equal(saved.dirty.state, LOCAL_PROJECT_DIRTY_STATES.PERMANENT_VERSION_SAVED);
  assert.equal(saved.dirty.changedPaths.length, 0);
  assert.equal(shouldWarnBeforeExit(saved), false);
  assert.equal(saved.loadedVersionIds.analysisVersionId, "analysis-version-2");
  assert.equal(saved.currentFingerprints.reportFingerprint, "analysis_saved_2");
});

test("operation inventory forbids database writes for local edit and unsaved recalculation", () => {
  const inventory = getBuildingPlatformOperationInventory();
  const byOperation = new Map(inventory.operations.map((item) => [item.operation, item]));

  assert.equal(byOperation.get("local_field_edit").expectedWrites, 0);
  assert.equal(byOperation.get("local_building_dna_preview").expectedWrites, 0);
  assert.equal(byOperation.get("unsaved_recalculate").expectedWrites, 0);
  assert.equal(byOperation.get("draft_get").expectedWrites, 0);
  assert.equal(byOperation.get("draft_save").classification, "explicit_user_write");
  assert.equal(byOperation.get("permanent_version_save").classification, "explicit_user_write");
});
