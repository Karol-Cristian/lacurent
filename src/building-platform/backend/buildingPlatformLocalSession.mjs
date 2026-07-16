import {
  fingerprintBuildingDna,
  stableNormalize,
  stableStringify
} from "./buildingPlatformFingerprints.mjs";

export const LOCAL_PROJECT_SESSION_SCHEMA =
  "building_platform_local_project_session_v1";

export const LOCAL_PROJECT_DIRTY_STATES = Object.freeze({
  CLEAN: "clean",
  MODIFIED_LOCALLY: "modified_locally",
  CALCULATED_UNSAVED: "calculated_unsaved",
  DRAFT_SAVED: "draft_saved",
  PERMANENT_VERSION_SAVED: "permanent_version_saved",
  VERSION_CONFLICT_DETECTED: "version_conflict_detected"
});

export const LOCAL_PROJECT_VISIBLE_STATUS = Object.freeze({
  [LOCAL_PROJECT_DIRTY_STATES.CLEAN]: "Fara modificari",
  [LOCAL_PROJECT_DIRTY_STATES.MODIFIED_LOCALLY]: "Modificari nesalvate",
  [LOCAL_PROJECT_DIRTY_STATES.CALCULATED_UNSAVED]: "Rezultate recalculate, dar nesalvate",
  [LOCAL_PROJECT_DIRTY_STATES.DRAFT_SAVED]: "Draft salvat",
  [LOCAL_PROJECT_DIRTY_STATES.PERMANENT_VERSION_SAVED]: "Versiune salvata",
  [LOCAL_PROJECT_DIRTY_STATES.VERSION_CONFLICT_DETECTED]: "Conflict de versiune"
});

const PRESENTATION_ONLY_PATH_PREFIXES = Object.freeze([
  "ui.",
  "presentation.",
  "view.",
  "workspace.activeTab",
  "workspace.inspectorOpen"
]);

function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function valueAtPath(target, path) {
  const parts = String(path || "").split(".").filter(Boolean);
  let current = target;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

function setAtPath(target, path, value) {
  const parts = String(path || "").split(".").filter(Boolean);
  if (!parts.length) return;
  let current = target;
  while (parts.length > 1) {
    const part = parts.shift();
    if (current[part] == null || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[0]] = value;
}

export function isPresentationOnlyLocalEdit(path) {
  return PRESENTATION_ONLY_PATH_PREFIXES.some((prefix) => String(path || "").startsWith(prefix));
}

export function buildProjectConcurrencyToken(project = {}) {
  return stableStringify(stableNormalize({
    projectId: project.project_id ?? project.projectId ?? null,
    currentBuildingDnaVersionId:
      project.current_building_dna_version_id ?? project.currentBuildingDnaVersionId ?? null,
    currentAnalysisVersionId:
      project.current_analysis_version_id ?? project.currentAnalysisVersionId ?? null,
    currentReportVersionId:
      project.current_report_version_id ?? project.currentReportVersionId ?? null,
    projectStatus: project.project_status ?? project.projectStatus ?? null,
    updatedAt: project.updated_at ?? project.updatedAt ?? null
  }));
}

export function createLocalProjectSession(openPayload = {}) {
  const currentBuildingDna =
    openPayload.buildingDnaVersion?.complete_building_dna ??
    openPayload.currentBuildingDnaVersion?.completeBuildingDna ??
    openPayload.currentBuildingDnaVersion?.complete_building_dna ??
    openPayload.building_dna ??
    null;
  const project = openPayload.project ?? {};
  const savedFingerprint =
    openPayload.fingerprints?.buildingDnaFingerprint ??
    openPayload.buildingDnaVersion?.building_dna_fingerprint ??
    (currentBuildingDna ? fingerprintBuildingDna(currentBuildingDna) : null);
  return {
    schema: LOCAL_PROJECT_SESSION_SCHEMA,
    project: deepClone(project),
    loadedVersionIds: {
      buildingDnaVersionId:
        project.current_building_dna_version_id ??
        openPayload.buildingDnaVersion?.building_dna_version_id ??
        null,
      analysisVersionId:
        project.current_analysis_version_id ??
        openPayload.analysisVersion?.analysis_version_id ??
        null,
      reportVersionId:
        project.current_report_version_id ??
        openPayload.reportVersion?.technical_report_version_id ??
        null
    },
    savedCurrentState: {
      buildingDna: deepClone(currentBuildingDna),
      buildingDnaFingerprint: savedFingerprint,
      analysis: deepClone(openPayload.analysisVersion ?? null),
      report: deepClone(openPayload.reportVersion ?? null)
    },
    editableDraftState: {
      buildingDna: deepClone(currentBuildingDna),
      buildingDnaFingerprint: savedFingerprint
    },
    unsavedCalculationState: null,
    dirty: {
      state: LOCAL_PROJECT_DIRTY_STATES.CLEAN,
      visibleStatus: LOCAL_PROJECT_VISIBLE_STATUS[LOCAL_PROJECT_DIRTY_STATES.CLEAN],
      changedPaths: [],
      firstDirtyAt: null,
      lastDirtyAt: null,
      hasCurrentCalculation: Boolean(openPayload.analysisVersion),
      draftSavedAt: null,
      permanentSavedAt: null
    },
    draftSaveState: {
      activeDraft: deepClone(openPayload.activeDraft ?? null),
      status: openPayload.activeDraft ? "server_draft_available" : "none"
    },
    permanentSaveState: {
      status: "clean"
    },
    concurrencyToken:
      openPayload.concurrencyToken ??
      openPayload.projectConcurrencyToken ??
      buildProjectConcurrencyToken(project),
    currentFingerprints: {
      buildingDnaFingerprint: savedFingerprint,
      analysisFingerprint: openPayload.analysisVersion?.calculation_fingerprint ?? null,
      reportFingerprint: openPayload.reportVersion?.calculation_fingerprint ?? null
    }
  };
}

function setDirtyState(session, state, timestamp = nowIso()) {
  session.dirty.state = state;
  session.dirty.visibleStatus = LOCAL_PROJECT_VISIBLE_STATUS[state];
  session.dirty.lastDirtyAt = timestamp;
  if (!session.dirty.firstDirtyAt && state !== LOCAL_PROJECT_DIRTY_STATES.CLEAN) {
    session.dirty.firstDirtyAt = timestamp;
  }
}

export function applyLocalBuildingDnaEdit(session, edit = {}) {
  if (isPresentationOnlyLocalEdit(edit.path)) {
    return {
      ...session,
      presentationOnly: true
    };
  }
  const next = deepClone(session);
  const previousValue = valueAtPath(next.editableDraftState.buildingDna, edit.path);
  setAtPath(next.editableDraftState.buildingDna, edit.path, edit.value);
  const currentValue = valueAtPath(next.editableDraftState.buildingDna, edit.path);
  if (stableStringify(previousValue) === stableStringify(currentValue)) {
    return next;
  }
  next.editableDraftState.buildingDnaFingerprint =
    fingerprintBuildingDna(next.editableDraftState.buildingDna);
  next.currentFingerprints.buildingDnaFingerprint =
    next.editableDraftState.buildingDnaFingerprint;
  next.unsavedCalculationState = null;
  next.currentFingerprints.analysisFingerprint = null;
  next.currentFingerprints.reportFingerprint = null;
  next.dirty.changedPaths.push({
    path: edit.path,
    previousValue: deepClone(previousValue),
    currentValue: deepClone(currentValue),
    changedAt: edit.changedAt ?? nowIso()
  });
  next.dirty.hasCurrentCalculation = false;
  setDirtyState(next, LOCAL_PROJECT_DIRTY_STATES.MODIFIED_LOCALLY, edit.changedAt ?? nowIso());
  return next;
}

export function recordUnsavedCalculation(session, calculation = {}) {
  const next = deepClone(session);
  const draftFingerprint = fingerprintBuildingDna(next.editableDraftState.buildingDna);
  next.unsavedCalculationState = {
    calculationFingerprint: calculation.calculationFingerprint,
    reportFingerprint: calculation.reportFingerprint,
    buildingDnaFingerprint: draftFingerprint,
    resultSummary: deepClone(calculation.resultSummary ?? null),
    calculatedAt: calculation.calculatedAt ?? nowIso()
  };
  next.currentFingerprints.buildingDnaFingerprint = draftFingerprint;
  next.currentFingerprints.analysisFingerprint = calculation.calculationFingerprint ?? null;
  next.currentFingerprints.reportFingerprint = calculation.reportFingerprint ?? null;
  next.dirty.hasCurrentCalculation = true;
  setDirtyState(next, LOCAL_PROJECT_DIRTY_STATES.CALCULATED_UNSAVED, calculation.calculatedAt ?? nowIso());
  return next;
}

export function markDraftSaved(session, draft = {}) {
  const next = deepClone(session);
  next.draftSaveState = {
    activeDraft: deepClone(draft),
    status: "saved"
  };
  next.dirty.draftSavedAt = draft.updated_at ?? draft.updatedAt ?? nowIso();
  setDirtyState(next, LOCAL_PROJECT_DIRTY_STATES.DRAFT_SAVED, next.dirty.draftSavedAt);
  return next;
}

export function markPermanentVersionSaved(session, payload = {}) {
  const next = deepClone(session);
  next.project = deepClone(payload.project ?? next.project);
  next.loadedVersionIds = {
    buildingDnaVersionId: payload.buildingDnaVersion?.building_dna_version_id ?? null,
    analysisVersionId: payload.analysisVersion?.analysis_version_id ?? null,
    reportVersionId: payload.reportVersion?.technical_report_version_id ?? null
  };
  next.savedCurrentState = {
    buildingDna: deepClone(payload.buildingDnaVersion?.complete_building_dna ?? next.editableDraftState.buildingDna),
    buildingDnaFingerprint: payload.buildingDnaVersion?.building_dna_fingerprint ?? null,
    analysis: deepClone(payload.analysisVersion ?? null),
    report: deepClone(payload.reportVersion ?? null)
  };
  next.editableDraftState = {
    buildingDna: deepClone(next.savedCurrentState.buildingDna),
    buildingDnaFingerprint: next.savedCurrentState.buildingDnaFingerprint
  };
  next.unsavedCalculationState = null;
  next.currentFingerprints = {
    buildingDnaFingerprint: next.savedCurrentState.buildingDnaFingerprint,
    analysisFingerprint: payload.analysisVersion?.calculation_fingerprint ?? null,
    reportFingerprint: payload.reportVersion?.calculation_fingerprint ?? null
  };
  next.permanentSaveState.status = "saved";
  next.dirty.changedPaths = [];
  next.dirty.firstDirtyAt = null;
  next.dirty.permanentSavedAt = payload.savedAt ?? nowIso();
  next.dirty.hasCurrentCalculation = true;
  next.concurrencyToken =
    payload.concurrencyToken ??
    payload.projectConcurrencyToken ??
    buildProjectConcurrencyToken(next.project);
  setDirtyState(next, LOCAL_PROJECT_DIRTY_STATES.PERMANENT_VERSION_SAVED, next.dirty.permanentSavedAt);
  return next;
}

export function markVersionConflict(session, conflict = {}) {
  const next = deepClone(session);
  next.conflict = deepClone(conflict);
  setDirtyState(next, LOCAL_PROJECT_DIRTY_STATES.VERSION_CONFLICT_DETECTED, conflict.detectedAt ?? nowIso());
  return next;
}

export function shouldWarnBeforeExit(session = {}) {
  return [
    LOCAL_PROJECT_DIRTY_STATES.MODIFIED_LOCALLY,
    LOCAL_PROJECT_DIRTY_STATES.CALCULATED_UNSAVED,
    LOCAL_PROJECT_DIRTY_STATES.DRAFT_SAVED,
    LOCAL_PROJECT_DIRTY_STATES.VERSION_CONFLICT_DETECTED
  ].includes(session.dirty?.state);
}

export function buildUnsavedExitOptions(session = {}) {
  if (!shouldWarnBeforeExit(session)) return [];
  return Object.freeze([
    "Ramai in proiect",
    "Salveaza draft",
    "Renunta la modificari"
  ]);
}
