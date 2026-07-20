import { calculateChapter2ForBuildingDna } from "../buildingChapter2Adapter.mjs";
import { buildBuildingTechnicalWorkspace } from "../buildingTechnicalReport.mjs";
import {
  BUILDING_DNA_VERSION_SCHEMA,
  BUILDING_PLATFORM_VERSIONED_BACKEND_VERSION,
  buildBuildingPlatformVersionMetadata,
  buildVersionIdentity,
  stableFingerprint,
  stableNormalize,
  stableStringify
} from "./buildingPlatformFingerprints.mjs";

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function quantityAmount(value) {
  if (isPlainObject(value) && Number.isFinite(value.amount)) return value.amount;
  return Number.isFinite(value) ? value : null;
}

function resultSummary(calculation) {
  return {
    annualQHnd: calculation?.chapter2Result?.result?.annualQHnd ?? null,
    annualQCnd: calculation?.chapter2Result?.result?.annualQCnd ?? null,
    chapter3Annual: calculation?.chapter3Result?.annual ?? null,
    monthCount: calculation?.chapter2Result?.result?.monthCount ?? null,
    htr: calculation?.envelopeTransmissionResult?.result?.amount ?? null
  };
}

function buildPipelineResult(buildingDna, calculation) {
  return {
    status: "ready",
    buildingDna,
    calculation,
    review: {
      dependencyTrees: {}
    }
  };
}

function monthlyUsefulDemand(calculation, side) {
  const monthly = calculation?.chapter2Result?.result?.monthlyResults ?? [];
  return monthly.map((month) => ({
    month: month.month,
    value: month[side]?.[side === "heating" ? "qHnd" : "qCnd"] ?? null,
    unit: "kWh"
  }));
}

function validateBuildingDna(buildingDna) {
  if (!isPlainObject(buildingDna) || buildingDna.schema !== "building_dna_v1") {
    return { ok: false, code: "invalid_building_dna_schema" };
  }
  if (!Array.isArray(buildingDna.monthlyProfiles) || buildingDna.monthlyProfiles.length !== 12) {
    return { ok: false, code: "building_dna_requires_twelve_months" };
  }
  if (!isPlainObject(buildingDna.building)) {
    return { ok: false, code: "building_dna_missing_building_identity" };
  }
  return { ok: true };
}

function sortedEntries(value, prefix = "") {
  if (!isPlainObject(value) && !Array.isArray(value)) {
    return [[prefix || "$", value]];
  }
  const entries = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      entries.push(...sortedEntries(item, `${prefix}[${index}]`));
    });
    return entries;
  }
  for (const key of Object.keys(value).sort()) {
    const path = prefix ? `${prefix}.${key}` : key;
    entries.push(...sortedEntries(value[key], path));
  }
  return entries;
}

function diffObjects(oldValue, newValue) {
  const oldMap = new Map(sortedEntries(stableNormalize(oldValue)));
  const newMap = new Map(sortedEntries(stableNormalize(newValue)));
  const paths = new Set([...oldMap.keys(), ...newMap.keys()]);
  return [...paths]
    .sort()
    .filter((path) => stableStringify(oldMap.get(path)) !== stableStringify(newMap.get(path)))
    .map((path) => ({
      path,
      oldValue: oldMap.has(path) ? oldMap.get(path) : null,
      newValue: newMap.has(path) ? newMap.get(path) : null
    }));
}

export function createBuildingPlatformBackendState() {
  return {
    projects: new Map(),
    buildingDnaVersions: new Map(),
    analysisVersions: new Map(),
    reportVersions: new Map(),
    scenarios: new Map(),
    auditEvents: [],
    idempotency: new Map(),
    counters: {
      project: 0,
      buildingDnaVersion: 0,
      analysisVersion: 0,
      reportVersion: 0,
      scenario: 0,
      auditEvent: 0
    }
  };
}

export class VersionedBuildingBackend {
  constructor(options = {}) {
    this.state = options.state ?? createBuildingPlatformBackendState();
    this.versionIdentity = buildVersionIdentity(options.versionIdentity ?? {});
  }

  nextId(kind, prefix) {
    this.state.counters[kind] += 1;
    return `${prefix}-${this.state.counters[kind]}`;
  }

  audit(projectId, action, metadata = {}) {
    const event = {
      eventId: this.nextId("auditEvent", "audit"),
      schema: "building_platform_audit_event_v1",
      projectId,
      actor: metadata.actor ?? metadata.ownerUserId ?? null,
      action,
      reason: metadata.reason ?? null,
      versionReferences: metadata.versionReferences ?? {},
      metadata: metadata.metadata ?? {},
      timestamp: metadata.timestamp ?? nowIso()
    };
    this.state.auditEvents.push(event);
    return event;
  }

  createProject({ ownerUserId, projectName = "Model termic Chapter 2", createdAt = nowIso() } = {}) {
    if (!ownerUserId) {
      return { ok: false, status: 401, code: "missing_owner_user_id" };
    }
    const projectId = this.nextId("project", "bp-project");
    const project = {
      project_id: projectId,
      owner_user_id: ownerUserId,
      project_name: String(projectName || "Model termic Chapter 2").slice(0, 160),
      project_status: "draft",
      current_building_dna_version_id: null,
      current_analysis_version_id: null,
      current_report_version_id: null,
      created_at: createdAt,
      updated_at: createdAt,
      archived_at: null,
      legacy_source_id: null,
      schema_version: "building_platform_project_v1"
    };
    this.state.projects.set(projectId, project);
    this.audit(projectId, "project_created", { ownerUserId, actor: ownerUserId });
    return { ok: true, project: deepClone(project) };
  }

  projectForOwner(ownerUserId, projectId) {
    const project = this.state.projects.get(projectId);
    if (!project || project.owner_user_id !== ownerUserId || project.archived_at) {
      return null;
    }
    return project;
  }

  assertProjectOwner(ownerUserId, projectId) {
    const project = this.projectForOwner(ownerUserId, projectId);
    if (!project) {
      return { ok: false, status: 404, code: "project_not_found_for_owner" };
    }
    return { ok: true, project };
  }

  createBuildingDnaVersion({
    project,
    buildingDna,
    parentBuildingDnaVersionId = null,
    creationReason = "user_edit",
    createdBy = project.owner_user_id,
    createdAt = nowIso(),
    metadata
  }) {
    const versionId = this.nextId("buildingDnaVersion", "dna-version");
    const version = {
      building_dna_version_id: versionId,
      project_id: project.project_id,
      parent_building_dna_version_id: parentBuildingDnaVersionId,
      schema_version: BUILDING_DNA_VERSION_SCHEMA,
      complete_building_dna: deepClone(buildingDna),
      source: deepClone(buildingDna.source ?? null),
      assumptions: deepClone(buildingDna.assumptions ?? []),
      confirmations: deepClone(buildingDna.confirmations ?? []),
      unresolved_uncertainties: deepClone(buildingDna.missingConfirmations ?? []),
      interventions: deepClone(buildingDna.renovationInterventions ?? []),
      engineering_overrides: deepClone(buildingDna.overrides ?? []),
      catalogue_versions: {
        materialCatalogueVersion: metadata.materialCatalogueVersion,
        assemblyCatalogueVersion: metadata.assemblyCatalogueVersion
      },
      climate_profile_id: metadata.climateProfileId,
      climate_profile_version: metadata.climateProfileVersion,
      creation_reason: creationReason,
      created_by: createdBy,
      created_at: createdAt,
      building_dna_fingerprint: metadata.fingerprints.buildingDnaFingerprint
    };
    this.state.buildingDnaVersions.set(versionId, version);
    return version;
  }

  createAnalysisVersion({
    project,
    buildingDnaVersion,
    calculation,
    metadata,
    parentAnalysisVersionId = null,
    calculationStatus = "calculated",
    createdAt = nowIso(),
    executionMetadata = {}
  }) {
    const analysisId = this.nextId("analysisVersion", "analysis-version");
    const summary = resultSummary(calculation);
    const version = {
      analysis_version_id: analysisId,
      project_id: project.project_id,
      building_dna_version_id: buildingDnaVersion.building_dna_version_id,
      parent_analysis_version_id: parentAnalysisVersionId,
      adapter_version: metadata.adapterVersion,
      chapter3_adapter_version: metadata.chapter3AdapterVersion ?? null,
      chapter3_runtime_version: metadata.chapter3RuntimeVersion ?? null,
      physics_engine_version: metadata.physicsEngineVersion,
      normative_registry_version: metadata.normativeRegistryVersion,
      climate_profile_id: metadata.climateProfileId,
      climate_profile_version: metadata.climateProfileVersion,
      explicit_engine_input: deepClone(calculation.fullEngineInput ?? calculation.chapter2Input),
      complete_engine_output: deepClone(calculation.fullEngineOutput ?? calculation.chapter2Result),
      monthly_qhnd: monthlyUsefulDemand(calculation, "heating"),
      monthly_qcnd: monthlyUsefulDemand(calculation, "cooling"),
      annual_qhnd: summary.annualQHnd,
      annual_qcnd: summary.annualQCnd,
      supported_latent_outputs: deepClone(calculation.chapter2Result?.result?.latentDemand ?? null),
      diagnostics: deepClone(calculation.diagnostics ?? []),
      calculation_status: calculationStatus,
      calculation_fingerprint: metadata.fingerprints.analysisFingerprint,
      created_at: createdAt,
      execution_metadata: {
        backendVersion: metadata.backendVersion,
        chapter3AdapterVersion: metadata.chapter3AdapterVersion ?? null,
        chapter3RuntimeVersion: metadata.chapter3RuntimeVersion ?? null,
        ...executionMetadata
      },
      failure_metadata: null,
      schema_version: metadata.analysisSchemaVersion
    };
    this.state.analysisVersions.set(analysisId, version);
    return version;
  }

  createReportVersion({
    project,
    buildingDnaVersion,
    analysisVersion,
    workspace,
    metadata,
    createdAt = nowIso()
  }) {
    const reportId = this.nextId("reportVersion", "report-version");
    const version = {
      technical_report_version_id: reportId,
      project_id: project.project_id,
      analysis_version_id: analysisVersion.analysis_version_id,
      building_dna_version_id: buildingDnaVersion.building_dna_version_id,
      report_schema_version: metadata.reportSchemaVersion,
      structured_report_model: deepClone(workspace.report),
      traceability_model: deepClone(workspace.traceability ?? []),
      calculation_fingerprint: metadata.fingerprints.reportFingerprint,
      generated_at: createdAt,
      report_status: "completed",
      schema_version: metadata.technicalReportSchemaVersion
    };
    this.state.reportVersions.set(reportId, version);
    return version;
  }

  calculateForBuildingDna(buildingDna) {
    const calculation = calculateChapter2ForBuildingDna(buildingDna);
    if (calculation.status !== "ready") {
      return {
        ok: false,
        status: 400,
        code: "chapter_2_calculation_not_ready",
        diagnostics: calculation.diagnostics ?? calculation.chapter2Result?.diagnostics ?? []
      };
    }
    const workspace = buildBuildingTechnicalWorkspace(buildPipelineResult(buildingDna, calculation));
    if (workspace.status !== "ready") {
      return {
        ok: false,
        status: 500,
        code: "technical_report_generation_failed",
        diagnostics: workspace.diagnostics ?? {}
      };
    }
    return { ok: true, calculation, workspace };
  }

  saveAndCalculate({
    ownerUserId,
    projectId = null,
    projectName,
    buildingDna,
    expectedCurrentBuildingDnaVersionId = null,
    idempotencyKey = null,
    creationReason = "user_edit",
    createdBy = ownerUserId
  } = {}) {
    const validation = validateBuildingDna(buildingDna);
    if (!validation.ok) {
      return { ok: false, status: 400, code: validation.code };
    }

    const requestFingerprint = stableFingerprint({
      ownerUserId,
      projectId,
      projectName,
      buildingDna,
      creationReason
    }, "request");
    if (idempotencyKey) {
      const idempotencyId = `${ownerUserId}:${idempotencyKey}`;
      const existing = this.state.idempotency.get(idempotencyId);
      if (existing && existing.requestFingerprint !== requestFingerprint) {
        return { ok: false, status: 409, code: "idempotency_key_reused_for_different_request" };
      }
      if (existing) {
        return deepClone({ ...existing.response, idempotentReplay: true });
      }
    }

    let project;
    if (projectId) {
      const ownership = this.assertProjectOwner(ownerUserId, projectId);
      if (!ownership.ok) return ownership;
      project = ownership.project;
      if (
        expectedCurrentBuildingDnaVersionId &&
        project.current_building_dna_version_id !== expectedCurrentBuildingDnaVersionId
      ) {
        return {
          ok: false,
          status: 409,
          code: "stale_project_version_conflict",
          currentBuildingDnaVersionId: project.current_building_dna_version_id
        };
      }
    } else {
      const created = this.createProject({ ownerUserId, projectName });
      if (!created.ok) return created;
      project = this.state.projects.get(created.project.project_id);
    }

    const calculated = this.calculateForBuildingDna(buildingDna);
    if (!calculated.ok) return calculated;

    const metadata = buildBuildingPlatformVersionMetadata({
      buildingDna,
      calculation: calculated.calculation,
      versionIdentity: this.versionIdentity
    });
    const buildingDnaVersion = this.createBuildingDnaVersion({
      project,
      buildingDna,
      parentBuildingDnaVersionId: project.current_building_dna_version_id,
      creationReason,
      createdBy,
      metadata
    });
    const analysisVersion = this.createAnalysisVersion({
      project,
      buildingDnaVersion,
      calculation: calculated.calculation,
      metadata,
      parentAnalysisVersionId: project.current_analysis_version_id,
      calculationStatus: buildingDna.calculationStatus === "synthetic_demo"
        ? "synthetic_demo"
        : "calculated"
    });
    const reportVersion = this.createReportVersion({
      project,
      buildingDnaVersion,
      analysisVersion,
      workspace: calculated.workspace,
      metadata
    });

    project.current_building_dna_version_id = buildingDnaVersion.building_dna_version_id;
    project.current_analysis_version_id = analysisVersion.analysis_version_id;
    project.current_report_version_id = reportVersion.technical_report_version_id;
    project.project_status = analysisVersion.calculation_status;
    project.updated_at = nowIso();

    this.audit(project.project_id, "building_dna_version_created", {
      actor: createdBy,
      reason: creationReason,
      versionReferences: {
        buildingDnaVersionId: buildingDnaVersion.building_dna_version_id
      }
    });
    this.audit(project.project_id, "calculation_completed", {
      actor: createdBy,
      reason: creationReason,
      versionReferences: {
        buildingDnaVersionId: buildingDnaVersion.building_dna_version_id,
        analysisVersionId: analysisVersion.analysis_version_id,
        reportVersionId: reportVersion.technical_report_version_id
      }
    });

    const response = {
      ok: true,
      status: 200,
      project: deepClone(project),
      buildingDnaVersion: deepClone(buildingDnaVersion),
      analysisVersion: deepClone(analysisVersion),
      reportVersion: deepClone(reportVersion),
      fingerprints: deepClone(metadata.fingerprints),
      resultSummary: resultSummary(calculated.calculation)
    };
    if (idempotencyKey) {
      this.state.idempotency.set(`${ownerUserId}:${idempotencyKey}`, {
        requestFingerprint,
        response: deepClone(response)
      });
    }
    return response;
  }

  reopenProject({ ownerUserId, projectId } = {}) {
    const ownership = this.assertProjectOwner(ownerUserId, projectId);
    if (!ownership.ok) return ownership;
    const project = ownership.project;
    return {
      ok: true,
      project: deepClone(project),
      buildingDnaVersion: deepClone(this.state.buildingDnaVersions.get(project.current_building_dna_version_id)),
      analysisVersion: deepClone(this.state.analysisVersions.get(project.current_analysis_version_id)),
      reportVersion: deepClone(this.state.reportVersions.get(project.current_report_version_id)),
      auditEvents: deepClone(this.state.auditEvents.filter((event) => event.projectId === projectId))
    };
  }

  listProjects({ ownerUserId } = {}) {
    return [...this.state.projects.values()]
      .filter((project) => project.owner_user_id === ownerUserId && !project.archived_at)
      .map((project) => deepClone(project));
  }

  listBuildingDnaVersions({ ownerUserId, projectId } = {}) {
    const ownership = this.assertProjectOwner(ownerUserId, projectId);
    if (!ownership.ok) return ownership;
    return {
      ok: true,
      versions: [...this.state.buildingDnaVersions.values()]
        .filter((version) => version.project_id === projectId)
        .map((version) => deepClone(version))
    };
  }

  listAnalysisVersions({ ownerUserId, projectId } = {}) {
    const ownership = this.assertProjectOwner(ownerUserId, projectId);
    if (!ownership.ok) return ownership;
    return {
      ok: true,
      versions: [...this.state.analysisVersions.values()]
        .filter((version) => version.project_id === projectId)
        .map((version) => deepClone(version))
    };
  }

  compareBuildingDnaVersions({ ownerUserId, projectId, oldVersionId, newVersionId } = {}) {
    const ownership = this.assertProjectOwner(ownerUserId, projectId);
    if (!ownership.ok) return ownership;
    const oldVersion = this.state.buildingDnaVersions.get(oldVersionId);
    const newVersion = this.state.buildingDnaVersions.get(newVersionId);
    if (!oldVersion || !newVersion || oldVersion.project_id !== projectId || newVersion.project_id !== projectId) {
      return { ok: false, status: 404, code: "building_dna_version_not_found" };
    }
    return {
      ok: true,
      changedPaths: diffObjects(oldVersion.complete_building_dna, newVersion.complete_building_dna)
    };
  }

  compareAnalysisVersions({ ownerUserId, projectId, oldAnalysisVersionId, newAnalysisVersionId } = {}) {
    const ownership = this.assertProjectOwner(ownerUserId, projectId);
    if (!ownership.ok) return ownership;
    const oldVersion = this.state.analysisVersions.get(oldAnalysisVersionId);
    const newVersion = this.state.analysisVersions.get(newAnalysisVersionId);
    if (!oldVersion || !newVersion || oldVersion.project_id !== projectId || newVersion.project_id !== projectId) {
      return { ok: false, status: 404, code: "analysis_version_not_found" };
    }
    return {
      ok: true,
      changedValues: {
        annualQHnd: {
          oldValue: oldVersion.annual_qhnd,
          newValue: newVersion.annual_qhnd,
          delta: quantityAmount(newVersion.annual_qhnd) - quantityAmount(oldVersion.annual_qhnd)
        },
        annualQCnd: {
          oldValue: oldVersion.annual_qcnd,
          newValue: newVersion.annual_qcnd,
          delta: quantityAmount(newVersion.annual_qcnd) - quantityAmount(oldVersion.annual_qcnd)
        }
      },
      engineInputChanges: diffObjects(oldVersion.explicit_engine_input, newVersion.explicit_engine_input),
      outputChanges: diffObjects(oldVersion.complete_engine_output, newVersion.complete_engine_output)
    };
  }

  reprocessCurrentProject({ ownerUserId, projectId, reason = "engine_reprocessing" } = {}) {
    const reopened = this.reopenProject({ ownerUserId, projectId });
    if (!reopened.ok) return reopened;
    const project = this.state.projects.get(projectId);
    const buildingDnaVersion = this.state.buildingDnaVersions.get(project.current_building_dna_version_id);
    const buildingDna = buildingDnaVersion.complete_building_dna;
    const calculated = this.calculateForBuildingDna(buildingDna);
    if (!calculated.ok) return calculated;
    const metadata = buildBuildingPlatformVersionMetadata({
      buildingDna,
      calculation: calculated.calculation,
      versionIdentity: this.versionIdentity
    });
    const analysisVersion = this.createAnalysisVersion({
      project,
      buildingDnaVersion,
      calculation: calculated.calculation,
      metadata,
      parentAnalysisVersionId: project.current_analysis_version_id,
      calculationStatus: "calculated",
      executionMetadata: { reprocessingReason: reason }
    });
    const reportVersion = this.createReportVersion({
      project,
      buildingDnaVersion,
      analysisVersion,
      workspace: calculated.workspace,
      metadata
    });
    project.current_analysis_version_id = analysisVersion.analysis_version_id;
    project.current_report_version_id = reportVersion.technical_report_version_id;
    project.updated_at = nowIso();
    this.audit(projectId, "reprocessing_completed", {
      actor: ownerUserId,
      reason,
      versionReferences: {
        buildingDnaVersionId: buildingDnaVersion.building_dna_version_id,
        analysisVersionId: analysisVersion.analysis_version_id,
        reportVersionId: reportVersion.technical_report_version_id
      }
    });
    return {
      ok: true,
      project: deepClone(project),
      buildingDnaVersion: deepClone(buildingDnaVersion),
      analysisVersion: deepClone(analysisVersion),
      reportVersion: deepClone(reportVersion),
      resultSummary: resultSummary(calculated.calculation)
    };
  }

  dryRunReprocessing({ ownerUserId, projectId } = {}) {
    const reopened = this.reopenProject({ ownerUserId, projectId });
    if (!reopened.ok) return reopened;
    return {
      ok: true,
      status: "eligible",
      sourceAnalysisVersionId: reopened.project.current_analysis_version_id,
      targetEngineVersion: this.versionIdentity.physicsEngineVersion,
      targetClimateVersion: reopened.buildingDnaVersion.climate_profile_version,
      diagnostic: "bounded_one_project_reprocessing_available"
    };
  }

  diagnostics({ ownerUserId, projectId } = {}) {
    const reopened = this.reopenProject({ ownerUserId, projectId });
    if (!reopened.ok) return reopened;
    return {
      ok: true,
      backendVersion: BUILDING_PLATFORM_VERSIONED_BACKEND_VERSION,
      projectId,
      currentBuildingDnaVersionId: reopened.project.current_building_dna_version_id,
      currentAnalysisVersionId: reopened.project.current_analysis_version_id,
      currentReportVersionId: reopened.project.current_report_version_id,
      buildingDnaFingerprint: reopened.buildingDnaVersion.building_dna_fingerprint,
      analysisFingerprint: reopened.analysisVersion.calculation_fingerprint,
      reportFingerprint: reopened.reportVersion.calculation_fingerprint,
      climateProfileId: reopened.analysisVersion.climate_profile_id,
      climateProfileVersion: reopened.analysisVersion.climate_profile_version
    };
  }
}

export function createInMemoryVersionedBuildingBackend(options = {}) {
  return new VersionedBuildingBackend(options);
}
