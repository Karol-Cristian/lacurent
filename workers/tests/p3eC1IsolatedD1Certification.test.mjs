import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import worker from "../save-house.js";
import {
  ASSISTED_WIZARD_DEMO_FIXTURE,
  mapWizardAnswersToAssistedAnswers
} from "../../js/building-platform-wizard.mjs";
import {
  buildBuildingPlatformVersionMetadata,
  buildBuildingTechnicalWorkspace,
  calculateChapter2ForBuildingDna,
  createBuildingDnaFromAssistedAnswers,
  stableNormalize
} from "../../src/building-platform/index.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const REPORT_DIR = join(REPO_ROOT, "artifacts");
const REPORT_JSON = join(REPORT_DIR, "p3e-c1-isolated-d1-certification-report.json");
const REPORT_MD = join(REPORT_DIR, "p3e-c1-isolated-d1-certification-report.md");
const DB_NAME = "lacurent-dev-db";
const TEST_TOKEN = "p3e-c1-isolated-d1-token";
const TEST_USER_ID = 9301001;
const TEST_EMAIL = "p3e-c1-isolated-d1@example.test";

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

function wranglerCommand() {
  return process.platform === "win32" ? "wrangler.cmd" : "wrangler";
}

function runWrangler(args, { cwd = REPO_ROOT } = {}) {
  const command = process.platform === "win32" ? "cmd.exe" : wranglerCommand();
  const commandArgs = process.platform === "win32"
    ? ["/d", "/c", wranglerCommand(), ...args]
    : args;
  const result = spawnSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    shell: false,
    windowsHide: true
  });
  if (result.status !== 0) {
    throw new Error([
      `wrangler ${args.join(" ")} failed with status ${result.status}`,
      result.error ? `process error: ${result.error.message}` : null,
      result.stdout,
      result.stderr
    ].filter(Boolean).join("\n"));
  }
  return result.stdout;
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(path));
    } else {
      files.push(path);
    }
  }
  return files;
}

async function findWranglerD1SqliteFile(persistDir) {
  const files = await walkFiles(persistDir);
  const candidates = files
    .filter((file) => file.endsWith(".sqlite"))
    .filter((file) => file.includes(`${join("v3", "d1")}${process.platform === "win32" ? "\\" : "/"}`))
    .filter((file) => basename(file) !== "metadata.sqlite")
    .sort();
  assert.equal(candidates.length, 1, `expected exactly one Wrangler D1 sqlite file, found ${candidates.length}`);
  return candidates[0];
}

function bytesToBase64Url(bytes) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256TokenHash(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64Url(new Uint8Array(hash));
}

class FileD1Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params.map((value) => (value === undefined ? null : value));
    return this;
  }

  first() {
    this.db.workerReadStatements += 1;
    const row = this.db.sqlite.prepare(this.sql).get(...this.params);
    return row ? { ...row } : null;
  }

  all() {
    this.db.workerReadStatements += 1;
    return {
      results: this.db.sqlite.prepare(this.sql).all(...this.params).map((row) => ({ ...row }))
    };
  }

  run() {
    this.db.workerWriteStatements += 1;
    const result = this.db.sqlite.prepare(this.sql).run(...this.params);
    return {
      meta: {
        changes: result.changes,
        last_row_id: Number(result.lastInsertRowid)
      }
    };
  }
}

class FileD1 {
  constructor(sqlitePath) {
    this.sqlitePath = sqlitePath;
    this.sqlite = new DatabaseSync(sqlitePath);
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    this.workerReadStatements = 0;
    this.workerWriteStatements = 0;
    this.batchTransactionCount = 0;
    this.directInspectionCount = 0;
  }

  prepare(sql) {
    return new FileD1Statement(this, sql);
  }

  batch(statements) {
    this.batchTransactionCount += 1;
    this.sqlite.exec("BEGIN");
    try {
      const results = statements.map((statement) => statement.run());
      this.sqlite.exec("COMMIT");
      return results;
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  direct(sql, ...params) {
    this.directInspectionCount += 1;
    return this.sqlite.prepare(sql).all(...params).map((row) => ({ ...row }));
  }

  scalar(sql, ...params) {
    return Object.values(this.direct(sql, ...params)[0] ?? {})[0] ?? null;
  }

  one(sql, ...params) {
    return this.direct(sql, ...params)[0] ?? null;
  }

  exec(sql) {
    this.directInspectionCount += 1;
    this.sqlite.exec(sql);
  }

  close() {
    this.sqlite.close();
  }
}

async function seedUser(db) {
  db.sqlite.prepare(`
    INSERT INTO users(id, email, name, password_hash, role, account_type)
    VALUES(?, ?, 'P3E C1 Isolated D1 Tester', NULL, 'residential', 'registered')
  `).run(TEST_USER_ID, TEST_EMAIL);
  db.sqlite.prepare(`
    INSERT INTO user_sessions(user_id, token_hash, expires_at)
    VALUES(?, ?, '2099-01-01T00:00:00.000Z')
  `).run(TEST_USER_ID, await sha256TokenHash(TEST_TOKEN));
}

function demoBuildingDna(overrides = {}) {
  const answers = mapWizardAnswersToAssistedAnswers(ASSISTED_WIZARD_DEMO_FIXTURE.values);
  const result = createBuildingDnaFromAssistedAnswers({ ...answers, ...overrides });
  assert.equal(result.status, "ready");
  return result.buildingDna;
}

function mutateEpsThickness(buildingDna, amount) {
  return {
    ...buildingDna,
    renovationInterventions: buildingDna.renovationInterventions.map((intervention) => (
      intervention.interventionId === "external_wall_eps_insulation"
        ? {
            ...intervention,
            thickness: {
              ...intervention.thickness,
              amount
            }
          }
        : intervention
    )),
    assemblies: buildingDna.assemblies.map((assembly) => (
      assembly.assemblyId === "wall_masonry_300_eps_100"
        ? {
            ...assembly,
            layers: assembly.layers.map((layer) => (
              layer.layerId === "eps-insulation"
                ? {
                    ...layer,
                    thickness: {
                      ...layer.thickness,
                      amount
                    }
                  }
                : layer
            ))
          }
        : assembly
    ))
  };
}

function localCalculation(buildingDna) {
  const calculation = calculateChapter2ForBuildingDna(buildingDna);
  assert.equal(calculation.status, "ready");
  const workspace = buildBuildingTechnicalWorkspace({
    status: "ready",
    buildingDna,
    calculation,
    review: { dependencyTrees: {} }
  });
  assert.equal(workspace.status, "ready");
  const metadata = buildBuildingPlatformVersionMetadata({ buildingDna, calculation });
  return { calculation, workspace, metadata };
}

function metricsFromCalculation(calculation) {
  const wall = calculation.assemblyResult.assemblyResults.find((item) => item.assemblyId === "wall_masonry_300_eps_100");
  assert.ok(wall, "wall_masonry_300_eps_100 assembly result is required");
  const envelope = calculation.chapter2Result.result.envelopeSummary;
  return {
    wallTotalResistance: wall.totalResistance,
    wallUValue: wall.uValue,
    Hd: envelope.components.Hd.amount,
    Hg: envelope.components.Hg.amount,
    Hu: envelope.components.Hu.amount,
    Ha: envelope.components.Ha.amount,
    Htr: envelope.htr.amount,
    annualQHnd: calculation.chapter2Result.result.annualQHnd,
    annualQCnd: calculation.chapter2Result.result.annualQCnd,
    monthlyQHnd: calculation.chapter2Result.result.monthlyResults.map((month) => ({
      month: month.month,
      value: month.heatingUsefulDemand?.qHnd ?? null
    })),
    monthlyQCnd: calculation.chapter2Result.result.monthlyResults.map((month) => ({
      month: month.month,
      value: month.coolingUsefulDemand?.qCnd ?? null
    }))
  };
}

function parseJson(value, fallback = null) {
  if (value == null) return fallback;
  return JSON.parse(value);
}

function rowCounts(db, projectId = null) {
  const projectFilter = projectId ? " WHERE project_id = ?" : "";
  const projectParams = projectId ? [projectId] : [];
  return {
    projects: db.scalar("SELECT COUNT(*) FROM building_platform_projects"),
    activeDrafts: db.scalar(
      `SELECT COUNT(*) FROM building_platform_project_drafts${projectFilter ? `${projectFilter} AND draft_status = 'active'` : " WHERE draft_status = 'active'"}`,
      ...projectParams
    ),
    committedDrafts: db.scalar(
      `SELECT COUNT(*) FROM building_platform_project_drafts${projectFilter ? `${projectFilter} AND draft_status = 'committed'` : " WHERE draft_status = 'committed'"}`,
      ...projectParams
    ),
    buildingDnaVersions: db.scalar(`SELECT COUNT(*) FROM building_dna_versions${projectFilter}`, ...projectParams),
    analysisVersions: db.scalar(`SELECT COUNT(*) FROM building_platform_analysis_versions${projectFilter}`, ...projectParams),
    reportVersions: db.scalar(`SELECT COUNT(*) FROM building_platform_report_versions${projectFilter}`, ...projectParams),
    idempotencyRows: db.scalar("SELECT COUNT(*) FROM building_platform_idempotency_keys"),
    auditEvents: db.scalar(`SELECT COUNT(*) FROM building_platform_audit_events${projectFilter}`, ...projectParams)
  };
}

async function post(path, db, body = {}, token = TEST_TOKEN, counters = null) {
  if (counters) {
    counters.endpointCalls[path] = (counters.endpointCalls[path] ?? 0) + 1;
  }
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await worker.fetch(
    new Request(`https://p3e-c1.local${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    }),
    { DB: db }
  );
  return {
    status: response.status,
    body: await response.json()
  };
}

function assertNoVersionRows(db, projectId) {
  const counts = rowCounts(db, projectId);
  assert.equal(counts.buildingDnaVersions, 0);
  assert.equal(counts.analysisVersions, 0);
  assert.equal(counts.reportVersions, 0);
  const project = db.one("SELECT current_building_dna_version_id, current_analysis_version_id, current_report_version_id FROM building_platform_projects WHERE project_id = ?", projectId);
  assert.equal(project.current_building_dna_version_id, null);
  assert.equal(project.current_analysis_version_id, null);
  assert.equal(project.current_report_version_id, null);
}

function createRollbackTriggerSql(stage) {
  const triggerName = `p3e_c1_fail_${stage}`;
  const triggerSqlByStage = {
    after_dna_insert: `
      CREATE TRIGGER ${triggerName}
      AFTER INSERT ON building_dna_versions
      BEGIN
        SELECT RAISE(ABORT, 'p3e_c1_fail_after_dna_insert');
      END;
    `,
    after_analysis_insert: `
      CREATE TRIGGER ${triggerName}
      AFTER INSERT ON building_platform_analysis_versions
      BEGIN
        SELECT RAISE(ABORT, 'p3e_c1_fail_after_analysis_insert');
      END;
    `,
    after_report_insert: `
      CREATE TRIGGER ${triggerName}
      AFTER INSERT ON building_platform_report_versions
      BEGIN
        SELECT RAISE(ABORT, 'p3e_c1_fail_after_report_insert');
      END;
    `,
    after_project_pointer_update: `
      CREATE TRIGGER ${triggerName}
      AFTER UPDATE OF current_building_dna_version_id, current_analysis_version_id, current_report_version_id
      ON building_platform_projects
      WHEN NEW.current_analysis_version_id IS NOT NULL
      BEGIN
        SELECT RAISE(ABORT, 'p3e_c1_fail_after_project_pointer_update');
      END;
    `
  };
  return {
    triggerName,
    createSql: triggerSqlByStage[stage],
    dropSql: `DROP TRIGGER IF EXISTS ${triggerName};`
  };
}

async function createProject(db, counters, name, idempotencyKey) {
  const created = await post("/api/building-platform/v1/projects/create", db, {
    project_name: name,
    idempotency_key: idempotencyKey
  }, TEST_TOKEN, counters);
  assert.equal(created.status, 200);
  assert.equal(created.body.success, true);
  return created.body;
}

async function savePermanent(db, counters, {
  projectId,
  token,
  idempotencyKey,
  reason,
  buildingDna,
  preview
}) {
  return post("/api/building-platform/v1/permanent-save", db, {
    project_id: projectId,
    expected_project_token: token,
    idempotency_key: idempotencyKey,
    creation_reason: reason,
    building_dna: buildingDna,
    calculation_fingerprint: preview.metadata.fingerprints.analysisFingerprint,
    report_fingerprint: preview.metadata.fingerprints.reportFingerprint
  }, TEST_TOKEN, counters);
}

async function certifyRollbackStage(db, counters, stage) {
  const project = await createProject(db, counters, `P3E-C1 rollback ${stage}`, `create-${stage}`);
  const buildingDna = mutateEpsThickness(demoBuildingDna(), 0.11);
  const preview = localCalculation(buildingDna);
  const request = {
    projectId: project.project.project_id,
    token: project.concurrency_token,
    idempotencyKey: `rollback-${stage}`,
    reason: `rollback_${stage}`,
    buildingDna,
    preview
  };
  const trigger = createRollbackTriggerSql(stage);
  db.exec(trigger.dropSql);
  db.exec(trigger.createSql);
  const beforeCounts = rowCounts(db, project.project.project_id);
  const failed = await savePermanent(db, counters, request);
  assert.equal(failed.status, 500);
  db.exec(trigger.dropSql);
  assertNoVersionRows(db, project.project.project_id);
  assert.deepEqual(rowCounts(db, project.project.project_id), beforeCounts);
  assert.equal(
    db.scalar("SELECT COUNT(*) FROM building_platform_idempotency_keys WHERE idempotency_key = ? AND owner_user_id = ?", request.idempotencyKey, TEST_USER_ID),
    0
  );
  const retried = await savePermanent(db, counters, request);
  assert.equal(retried.status, 200);
  assert.equal(rowCounts(db, project.project.project_id).buildingDnaVersions, 1);
  return {
    stage,
    failureStatus: failed.status,
    retryStatus: retried.status,
    versionCountsAfterFailure: beforeCounts,
    versionCountsAfterRetry: rowCounts(db, project.project.project_id)
  };
}

function persistedAnalysisRow(db, analysisVersionId) {
  const row = db.one("SELECT * FROM building_platform_analysis_versions WHERE analysis_version_id = ?", analysisVersionId);
  assert.ok(row, `missing analysis row ${analysisVersionId}`);
  return {
    ...row,
    explicit_engine_input: parseJson(row.explicit_engine_input_json, null),
    complete_engine_output: parseJson(row.complete_engine_output_json, null),
    monthly_qhnd: parseJson(row.monthly_qhnd_json, []),
    monthly_qcnd: parseJson(row.monthly_qcnd_json, []),
    diagnostics: parseJson(row.diagnostics_json, [])
  };
}

function persistedReportRow(db, reportVersionId) {
  const row = db.one("SELECT * FROM building_platform_report_versions WHERE technical_report_version_id = ?", reportVersionId);
  assert.ok(row, `missing report row ${reportVersionId}`);
  return {
    ...row,
    structured_report_model: parseJson(row.structured_report_model_json, null),
    traceability_model: parseJson(row.traceability_model_json, [])
  };
}

function compareExactReopen(saved, reopened, db) {
  assert.deepEqual(stableNormalize(reopened.body.buildingDnaVersion.complete_building_dna), stableNormalize(saved.body.buildingDnaVersion.complete_building_dna));
  assert.equal(reopened.body.buildingDnaVersion.building_dna_version_id, saved.body.buildingDnaVersion.building_dna_version_id);
  assert.equal(reopened.body.analysisVersion.analysis_version_id, saved.body.analysisVersion.analysis_version_id);
  assert.equal(reopened.body.reportVersion.technical_report_version_id, saved.body.reportVersion.technical_report_version_id);
  assert.equal(reopened.body.analysisVersion.climate_profile_id, saved.body.analysisVersion.climate_profile_id);
  assert.equal(reopened.body.analysisVersion.climate_profile_version, saved.body.analysisVersion.climate_profile_version);
  assert.equal(reopened.body.analysisVersion.calculation_fingerprint, saved.body.analysisVersion.calculation_fingerprint);
  assert.equal(reopened.body.reportVersion.calculation_fingerprint, saved.body.analysisVersion.calculation_fingerprint);
  assert.deepEqual(stableNormalize(reopened.body.analysisVersion.explicit_engine_input), stableNormalize(saved.body.analysisVersion.explicit_engine_input));
  assert.deepEqual(stableNormalize(reopened.body.analysisVersion.complete_engine_output), stableNormalize(saved.body.analysisVersion.complete_engine_output));
  assert.deepEqual(stableNormalize(reopened.body.analysisVersion.monthly_qhnd), stableNormalize(saved.body.analysisVersion.monthly_qhnd));
  assert.deepEqual(stableNormalize(reopened.body.analysisVersion.monthly_qcnd), stableNormalize(saved.body.analysisVersion.monthly_qcnd));
  assert.equal(reopened.body.analysisVersion.annual_qhnd, saved.body.analysisVersion.annual_qhnd);
  assert.equal(reopened.body.analysisVersion.annual_qcnd, saved.body.analysisVersion.annual_qcnd);
  assert.deepEqual(stableNormalize(reopened.body.reportVersion.structured_report_model), stableNormalize(saved.body.reportVersion.structured_report_model));

  const analysis = persistedAnalysisRow(db, saved.body.analysisVersion.analysis_version_id);
  const report = persistedReportRow(db, saved.body.reportVersion.technical_report_version_id);
  assert.equal(analysis.calculation_fingerprint, report.calculation_fingerprint);
  assert.deepEqual(stableNormalize(analysis.explicit_engine_input), stableNormalize(saved.body.analysisVersion.explicit_engine_input));
  assert.deepEqual(stableNormalize(report.structured_report_model), stableNormalize(saved.body.reportVersion.structured_report_model));
}

function writeReport(report) {
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    "# P3E-C1 Isolated D1 Certification",
    "",
    `Status: **${report.status}**`,
    `Environment: ${report.environment.kind}`,
    `D1 persist dir: ${report.environment.persistDir}`,
    `D1 sqlite file: ${report.environment.sqliteFile}`,
    "",
    "## Schema",
    `Applied baseline: ${report.schema.appliedBaseline}`,
    `Migration notes: ${report.schema.notes}`,
    "",
    "## Commands",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Operation Counts",
    `Worker read statements: ${report.operationCounts.workerReadStatements}`,
    `Worker write statements: ${report.operationCounts.workerWriteStatements}`,
    `Batch transactions: ${report.operationCounts.batchTransactions}`,
    `Direct inspection queries: ${report.operationCounts.directInspectionQueries}`,
    `Canonical open endpoint calls: ${report.operationCounts.endpointCalls["/api/building-platform/v1/projects/open"] ?? 0}`,
    "",
    "## Row Evidence",
    "```json",
    JSON.stringify(report.rowEvidence, null, 2),
    "```",
    "",
    "## Reopen Parity",
    `Exact reopen parity: ${report.reopenParity.exact ? "PASS" : "FAIL"}`,
    "",
    "## Idempotency",
    "```json",
    JSON.stringify(report.idempotency, null, 2),
    "```",
    "",
    "## Concurrency",
    "```json",
    JSON.stringify(report.concurrency, null, 2),
    "```",
    "",
    "## Rollback",
    "```json",
    JSON.stringify(report.rollback, null, 2),
    "```",
    "",
    "## Defects",
    report.defects.length ? report.defects.map((item) => `- ${item}`).join("\n") : "No defects found.",
    ""
  ];
  writeFileSync(REPORT_MD, `${lines.join("\n")}\n`);
}

async function runCertification() {
  const persistDir = join(tmpdir(), "lacurent-p3e-c1-isolated-d1");
  rmSync(persistDir, { recursive: true, force: true });
  mkdirSync(persistDir, { recursive: true });
  const commands = [];
  const schemaPath = join(REPO_ROOT, "schema.sql");
  const applySchemaArgs = ["d1", "execute", DB_NAME, "--local", "--persist-to", persistDir, "--file", schemaPath, "--json"];
  runWrangler(applySchemaArgs);
  commands.push(`wrangler ${applySchemaArgs.join(" ")}`);
  for (const migration of [
    "migrations/010_building_platform_versioned_backend.sql",
    "migrations/011_building_platform_local_first_flow.sql",
    "migrations/012_building_platform_reprocessing_exports.sql"
  ]) {
    const migrationPath = join(REPO_ROOT, migration);
    const migrationArgs = ["d1", "execute", DB_NAME, "--local", "--persist-to", persistDir, "--file", migrationPath, "--json"];
    runWrangler(migrationArgs);
    commands.push(`wrangler ${migrationArgs.join(" ")}`);
  }
  const sqliteFile = await findWranglerD1SqliteFile(persistDir);
  const db = new FileD1(sqliteFile);
  const counters = { endpointCalls: {} };
  const rowEvidence = {};
  const defects = [];

  try {
    await seedUser(db);
    const created = await createProject(db, counters, "P3E-C1 isolated D1", "p3e-c1-create-project");
    const projectId = created.project.project_id;
    const initialToken = created.concurrency_token;
    const opened = await post("/api/building-platform/v1/projects/open", db, { project_id: projectId }, TEST_TOKEN, counters);
    assert.equal(opened.status, 200);
    assert.equal(opened.body.source, "versioned_tables");
    assert.equal(opened.body.buildingDnaVersion, null);

    const baseDna = demoBuildingDna();
    const locallyEdited = mutateEpsThickness(baseDna, 0.12);
    const writesAfterOpen = db.workerWriteStatements;
    const localPreview = localCalculation(locallyEdited);
    assert.equal(db.workerWriteStatements, writesAfterOpen, "local edit and recalculation must not write to DB");
    assertNoVersionRows(db, projectId);

    const draft = await post("/api/building-platform/v1/drafts/save", db, {
      project_id: projectId,
      expected_project_token: initialToken,
      building_dna: locallyEdited,
      last_calculation_fingerprint: localPreview.metadata.fingerprints.analysisFingerprint
    }, TEST_TOKEN, counters);
    assert.equal(draft.status, 200);
    rowEvidence.afterDraft = rowCounts(db, projectId);
    assert.equal(rowEvidence.afterDraft.projects, 1);
    assert.equal(rowEvidence.afterDraft.activeDrafts, 1);
    assert.equal(rowEvidence.afterDraft.buildingDnaVersions, 0);
    assert.equal(rowEvidence.afterDraft.analysisVersions, 0);
    assert.equal(rowEvidence.afterDraft.reportVersions, 0);

    const overwrittenDna = mutateEpsThickness(baseDna, 0.16);
    const overwrittenPreview = localCalculation(overwrittenDna);
    const draftOverwrite = await post("/api/building-platform/v1/drafts/save", db, {
      project_id: projectId,
      expected_project_token: initialToken,
      building_dna: overwrittenDna,
      last_calculation_fingerprint: overwrittenPreview.metadata.fingerprints.analysisFingerprint
    }, TEST_TOKEN, counters);
    assert.equal(draftOverwrite.status, 200);
    assert.equal(draftOverwrite.body.draft.draft_id, draft.body.draft.draft_id);
    assert.equal(rowCounts(db, projectId).activeDrafts, 1);

    const savedV1 = await savePermanent(db, counters, {
      projectId,
      token: initialToken,
      idempotencyKey: "p3e-c1-save-v1",
      reason: "initial_project_creation",
      buildingDna: overwrittenDna,
      preview: overwrittenPreview
    });
    assert.equal(savedV1.status, 200);
    rowEvidence.afterPermanentV1 = rowCounts(db, projectId);
    assert.equal(rowEvidence.afterPermanentV1.projects, 1);
    assert.equal(rowEvidence.afterPermanentV1.buildingDnaVersions, 1);
    assert.equal(rowEvidence.afterPermanentV1.analysisVersions, 1);
    assert.equal(rowEvidence.afterPermanentV1.reportVersions, 1);
    assert.equal(rowEvidence.afterPermanentV1.committedDrafts, 1);
    const projectAfterV1 = db.one("SELECT * FROM building_platform_projects WHERE project_id = ?", projectId);
    assert.equal(projectAfterV1.owner_user_id, TEST_USER_ID);
    assert.equal(projectAfterV1.current_building_dna_version_id, savedV1.body.buildingDnaVersion.building_dna_version_id);
    assert.equal(projectAfterV1.current_analysis_version_id, savedV1.body.analysisVersion.analysis_version_id);
    assert.equal(projectAfterV1.current_report_version_id, savedV1.body.reportVersion.technical_report_version_id);
    assert.equal(savedV1.body.reportVersion.calculation_fingerprint, savedV1.body.analysisVersion.calculation_fingerprint);
    assert.equal(
      db.scalar("SELECT COUNT(*) FROM building_platform_idempotency_keys WHERE idempotency_key = 'p3e-c1-save-v1' AND owner_user_id = ?", TEST_USER_ID),
      1
    );

    const reopenedV1 = await post("/api/building-platform/v1/projects/open", db, { project_id: projectId }, TEST_TOKEN, counters);
    assert.equal(reopenedV1.status, 200);
    compareExactReopen(savedV1, reopenedV1, db);
    const metricsV1 = metricsFromCalculation(overwrittenPreview.calculation);

    const changedDna = mutateEpsThickness(baseDna, 0.2);
    const changedPreview = localCalculation(changedDna);
    const writesBeforeUnsavedV2 = db.workerWriteStatements;
    assert.equal(rowCounts(db, projectId).buildingDnaVersions, 1);
    assert.equal(db.workerWriteStatements, writesBeforeUnsavedV2);
    const metricsV2 = metricsFromCalculation(changedPreview.calculation);
    assert.ok(metricsV2.wallTotalResistance > metricsV1.wallTotalResistance);
    assert.ok(metricsV2.wallUValue < metricsV1.wallUValue);
    assert.ok(metricsV2.Htr < metricsV1.Htr);
    assert.ok(metricsV2.annualQHnd <= metricsV1.annualQHnd);

    const savedV2 = await savePermanent(db, counters, {
      projectId,
      token: reopenedV1.body.concurrency_token,
      idempotencyKey: "p3e-c1-save-v2",
      reason: "renovation_intervention",
      buildingDna: changedDna,
      preview: changedPreview
    });
    assert.equal(savedV2.status, 200);
    rowEvidence.afterPermanentV2 = rowCounts(db, projectId);
    assert.equal(rowEvidence.afterPermanentV2.buildingDnaVersions, 2);
    assert.equal(rowEvidence.afterPermanentV2.analysisVersions, 2);
    assert.equal(rowEvidence.afterPermanentV2.reportVersions, 2);
    assert.equal(savedV2.body.buildingDnaVersion.parent_building_dna_version_id, savedV1.body.buildingDnaVersion.building_dna_version_id);
    assert.equal(savedV2.body.analysisVersion.parent_analysis_version_id, savedV1.body.analysisVersion.analysis_version_id);
    assert.notEqual(savedV2.body.buildingDnaVersion.building_dna_fingerprint, savedV1.body.buildingDnaVersion.building_dna_fingerprint);
    assert.notEqual(savedV2.body.analysisVersion.calculation_fingerprint, savedV1.body.analysisVersion.calculation_fingerprint);
    const v1RowAfterV2 = persistedAnalysisRow(db, savedV1.body.analysisVersion.analysis_version_id);
    assert.equal(v1RowAfterV2.calculation_fingerprint, savedV1.body.analysisVersion.calculation_fingerprint);
    const projectAfterV2 = db.one("SELECT current_building_dna_version_id, current_analysis_version_id, current_report_version_id FROM building_platform_projects WHERE project_id = ?", projectId);
    assert.equal(projectAfterV2.current_building_dna_version_id, savedV2.body.buildingDnaVersion.building_dna_version_id);
    assert.equal(projectAfterV2.current_analysis_version_id, savedV2.body.analysisVersion.analysis_version_id);
    assert.equal(projectAfterV2.current_report_version_id, savedV2.body.reportVersion.technical_report_version_id);

    const replayV2 = await savePermanent(db, counters, {
      projectId,
      token: reopenedV1.body.concurrency_token,
      idempotencyKey: "p3e-c1-save-v2",
      reason: "renovation_intervention",
      buildingDna: changedDna,
      preview: changedPreview
    });
    assert.equal(replayV2.status, 200);
    assert.equal(replayV2.body.analysisVersion.analysis_version_id, savedV2.body.analysisVersion.analysis_version_id);
    assert.deepEqual(rowCounts(db, projectId), rowEvidence.afterPermanentV2);

    const idempotencyConflict = await savePermanent(db, counters, {
      projectId,
      token: savedV2.body.concurrency_token,
      idempotencyKey: "p3e-c1-save-v2",
      reason: "different_request_same_key",
      buildingDna: mutateEpsThickness(baseDna, 0.22),
      preview: localCalculation(mutateEpsThickness(baseDna, 0.22))
    });
    assert.equal(idempotencyConflict.status, 409);
    assert.equal(idempotencyConflict.body.code, "idempotency_key_reused_for_different_request");
    assert.deepEqual(rowCounts(db, projectId), rowEvidence.afterPermanentV2);

    const sessionA = await post("/api/building-platform/v1/projects/open", db, { project_id: projectId }, TEST_TOKEN, counters);
    const sessionB = await post("/api/building-platform/v1/projects/open", db, { project_id: projectId }, TEST_TOKEN, counters);
    const sessionADna = mutateEpsThickness(baseDna, 0.22);
    const sessionAPreview = localCalculation(sessionADna);
    const sessionASave = await savePermanent(db, counters, {
      projectId,
      token: sessionA.body.concurrency_token,
      idempotencyKey: "p3e-c1-session-a",
      reason: "concurrency_session_a",
      buildingDna: sessionADna,
      preview: sessionAPreview
    });
    assert.equal(sessionASave.status, 200);
    const countsAfterSessionA = rowCounts(db, projectId);
    const sessionBDna = mutateEpsThickness(baseDna, 0.24);
    const sessionBPreview = localCalculation(sessionBDna);
    const sessionBSave = await savePermanent(db, counters, {
      projectId,
      token: sessionB.body.concurrency_token,
      idempotencyKey: "p3e-c1-session-b",
      reason: "concurrency_session_b",
      buildingDna: sessionBDna,
      preview: sessionBPreview
    });
    assert.equal(sessionBSave.status, 409);
    assert.equal(sessionBSave.body.code, "stale_project_version_conflict");
    assert.deepEqual(rowCounts(db, projectId), countsAfterSessionA);

    const rollback = [];
    for (const stage of [
      "after_dna_insert",
      "after_analysis_insert",
      "after_report_insert",
      "after_project_pointer_update"
    ]) {
      rollback.push(await certifyRollbackStage(db, counters, stage));
    }

    const finalReport = {
      status: "PASS",
      environment: {
        kind: "Wrangler local D1 persistence directory with isolated file-backed D1-compatible SQL adapter",
        persistDir,
        sqliteFile
      },
      schema: {
        appliedBaseline: "schema.sql plus migrations 010-012 via wrangler d1 execute --local --persist-to",
        notes: "schema.sql is the repository's consolidated empty-database baseline; legacy incremental migrations 001-009 are not empty-database safe because they alter tables created by the baseline. Canonical P3E versioned migrations 010-012 are applied idempotently after the baseline and verified by direct table inspection."
      },
      commands,
      operationCounts: {
        workerReadStatements: db.workerReadStatements,
        workerWriteStatements: db.workerWriteStatements,
        batchTransactions: db.batchTransactionCount,
        directInspectionQueries: db.directInspectionCount,
        endpointCalls: counters.endpointCalls
      },
      rowEvidence,
      reopenParity: {
        exact: true,
        compared: [
          "Building DNA",
          "climate profile id/version",
          "engine input",
          "engine output including Hd/Hg/Hu/Ha/Htr/monthly QHnd/QCnd/annual QHnd/QCnd",
          "structured report",
          "fingerprints",
          "version ids"
        ]
      },
      physicalDirection: {
        epsThicknessV1M: 0.16,
        epsThicknessV2M: 0.2,
        v1: metricsV1,
        v2: metricsV2
      },
      idempotency: {
        replayReturnedOriginalAnalysisVersion: replayV2.body.analysisVersion.analysis_version_id === savedV2.body.analysisVersion.analysis_version_id,
        duplicateVersionRowsCreated: false,
        modifiedRequestConflictStatus: idempotencyConflict.status,
        modifiedRequestConflictCode: idempotencyConflict.body.code
      },
      concurrency: {
        firstSessionStatus: sessionASave.status,
        secondSessionStatus: sessionBSave.status,
        secondSessionCode: sessionBSave.body.code,
        rowCountsAfterRejectedStaleSave: rowCounts(db, projectId)
      },
      rollback,
      inspectedTables: [
        "users",
        "user_sessions",
        "building_platform_projects",
        "building_platform_project_drafts",
        "building_dna_versions",
        "building_platform_analysis_versions",
        "building_platform_report_versions",
        "building_platform_idempotency_keys",
        "building_platform_audit_events"
      ],
      defects,
      artifacts: {
        reportJson: REPORT_JSON,
        reportMarkdown: REPORT_MD
      }
    };
    writeReport(finalReport);
    return finalReport;
  } finally {
    db.close();
  }
}

await test("P3E-C1 isolated real-D1 local-first persistence certification", async () => {
  const report = await runCertification();
  assert.equal(report.status, "PASS");
  console.log(`P3E-C1 report: ${REPORT_JSON}`);
});
