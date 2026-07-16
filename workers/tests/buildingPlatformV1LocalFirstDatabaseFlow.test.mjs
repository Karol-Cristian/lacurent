import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
  createBuildingDnaFromAssistedAnswers
} from "../../src/building-platform/index.mjs";

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

class SqliteD1Statement {
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
    this.db.readCount += 1;
    const row = this.db.sqlite.prepare(this.sql).get(...this.params);
    return row ? { ...row } : null;
  }

  all() {
    this.db.readCount += 1;
    return {
      results: this.db.sqlite.prepare(this.sql).all(...this.params).map((row) => ({ ...row }))
    };
  }

  run() {
    this.db.writeStatementCount += 1;
    const result = this.db.sqlite.prepare(this.sql).run(...this.params);
    return {
      meta: {
        changes: result.changes,
        last_row_id: Number(result.lastInsertRowid)
      }
    };
  }
}

class SqliteD1 {
  constructor() {
    this.sqlite = new DatabaseSync(":memory:");
    this.readCount = 0;
    this.writeStatementCount = 0;
    this.batchTransactionCount = 0;
    this.sqlite.exec("PRAGMA foreign_keys = ON");
    this.sqlite.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        name TEXT,
        password_hash TEXT,
        role TEXT DEFAULT 'residential',
        account_type TEXT DEFAULT 'registered',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        token_hash TEXT,
        expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX user_sessions_token_hash_idx ON user_sessions(token_hash);
    `);
    this.sqlite.exec(readFileSync(
      new URL("../../migrations/010_building_platform_versioned_backend.sql", import.meta.url),
      "utf8"
    ));
    this.sqlite.exec(readFileSync(
      new URL("../../migrations/011_building_platform_local_first_flow.sql", import.meta.url),
      "utf8"
    ));
  }

  prepare(sql) {
    return new SqliteD1Statement(this, sql);
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

  scalar(sql, ...params) {
    return Object.values(this.sqlite.prepare(sql).get(...params) ?? {})[0] ?? null;
  }

  rows(sql, ...params) {
    return this.sqlite.prepare(sql).all(...params).map((row) => ({ ...row }));
  }
}

function bytesToBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sha256TokenHash(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64Url(new Uint8Array(hash));
}

async function seedUser(db, token = "local-first-token") {
  db.sqlite.prepare(`
    INSERT INTO users(id, email, name, role, account_type)
    VALUES(1, 'p3e-b@example.test', 'P3E B Tester', 'residential', 'registered')
  `).run();
  db.sqlite.prepare(`
    INSERT INTO user_sessions(user_id, token_hash, expires_at)
    VALUES(1, ?, '2099-01-01T00:00:00.000Z')
  `).run(await sha256TokenHash(token));
  return token;
}

function demoBuildingDna(overrides = {}) {
  const answers = mapWizardAnswersToAssistedAnswers(ASSISTED_WIZARD_DEMO_FIXTURE.values);
  const result = createBuildingDnaFromAssistedAnswers({
    ...answers,
    ...overrides
  });
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

function localCalculationFingerprints(buildingDna) {
  const calculation = calculateChapter2ForBuildingDna(buildingDna);
  assert.equal(calculation.status, "ready");
  const workspace = buildBuildingTechnicalWorkspace({
    status: "ready",
    buildingDna,
    calculation,
    review: { dependencyTrees: {} }
  });
  assert.equal(workspace.status, "ready");
  return {
    calculation,
    workspace,
    metadata: buildBuildingPlatformVersionMetadata({ buildingDna, calculation })
  };
}

async function post(path, db, body = {}, token = "local-first-token") {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await worker.fetch(
    new Request(`https://example.test${path}`, {
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

await test("P3E-B v1 local-first lifecycle uses drafts explicitly and immutable version rows only on permanent save", async () => {
  const db = new SqliteD1();
  await seedUser(db);
  const created = await post("/api/building-platform/v1/projects/create", db, {
    project_name: "P3E-B Local First",
    idempotency_key: "create-project"
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.success, true);
  const projectId = created.body.project.project_id;
  const initialToken = created.body.concurrency_token;

  const opened = await post("/api/building-platform/v1/projects/open", db, { project_id: projectId });
  assert.equal(opened.status, 200);
  assert.equal(opened.body.source, "versioned_tables");
  assert.equal(opened.body.buildingDnaVersion, null);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_dna_versions"), 0);

  const buildingDna = demoBuildingDna();
  const writeCountAfterOpen = db.writeStatementCount;
  const locallyEdited = mutateEpsThickness(buildingDna, 0.12);
  assert.equal(db.writeStatementCount, writeCountAfterOpen, "local edit must not write to DB");

  const localPreview = localCalculationFingerprints(locallyEdited);
  assert.equal(db.writeStatementCount, writeCountAfterOpen, "unsaved local recalculation must not write to DB");

  const draft = await post("/api/building-platform/v1/drafts/save", db, {
    project_id: projectId,
    expected_project_token: initialToken,
    building_dna: locallyEdited,
    last_calculation_fingerprint: localPreview.metadata.fingerprints.analysisFingerprint
  });
  assert.equal(draft.status, 200);
  assert.equal(draft.body.success, true);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_project_drafts"), 1);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_dna_versions"), 0);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_analysis_versions"), 0);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_report_versions"), 0);

  const fetchedDraft = await post("/api/building-platform/v1/drafts/get", db, {
    project_id: projectId
  });
  assert.equal(fetchedDraft.status, 200);
  assert.equal(fetchedDraft.body.draft.draft_id, draft.body.draft.draft_id);
  assert.deepEqual(fetchedDraft.body.draft.editable_building_dna, locallyEdited);

  const overwrittenDna = mutateEpsThickness(buildingDna, 0.16);
  const overwrittenPreview = localCalculationFingerprints(overwrittenDna);
  const draftOverwrite = await post("/api/building-platform/v1/drafts/save", db, {
    project_id: projectId,
    expected_project_token: initialToken,
    building_dna: overwrittenDna,
    last_calculation_fingerprint: overwrittenPreview.metadata.fingerprints.analysisFingerprint
  });
  assert.equal(draftOverwrite.status, 200);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_project_drafts"), 1);
  assert.notEqual(draftOverwrite.body.draft.draft_fingerprint, draft.body.draft.draft_fingerprint);

  const saved = await post("/api/building-platform/v1/permanent-save", db, {
    project_id: projectId,
    expected_project_token: initialToken,
    idempotency_key: "save-permanent-1",
    creation_reason: "initial_project_creation",
    building_dna: overwrittenDna,
    calculation_fingerprint: overwrittenPreview.metadata.fingerprints.analysisFingerprint,
    report_fingerprint: overwrittenPreview.metadata.fingerprints.reportFingerprint
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.success, true);
  assert.equal(saved.body.buildingDnaVersion.parent_building_dna_version_id, null);
  assert.equal(saved.body.analysisVersion.parent_analysis_version_id, null);
  assert.equal(saved.body.reportVersion.calculation_fingerprint, saved.body.analysisVersion.calculation_fingerprint);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_projects"), 1);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_dna_versions"), 1);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_analysis_versions"), 1);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_report_versions"), 1);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_idempotency_keys"), 2);
  assert.equal(
    db.scalar("SELECT draft_status FROM building_platform_project_drafts WHERE project_id = ?", projectId),
    "committed"
  );

  const reopened = await post("/api/building-platform/v1/projects/open", db, { project_id: projectId });
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.buildingDnaVersion.building_dna_fingerprint, saved.body.buildingDnaVersion.building_dna_fingerprint);
  assert.equal(reopened.body.analysisVersion.calculation_fingerprint, saved.body.analysisVersion.calculation_fingerprint);
  assert.deepEqual(reopened.body.buildingDnaVersion.complete_building_dna, saved.body.buildingDnaVersion.complete_building_dna);
  assert.deepEqual(reopened.body.analysisVersion.monthly_qhnd, saved.body.analysisVersion.monthly_qhnd);
  assert.deepEqual(reopened.body.reportVersion.structured_report_model, saved.body.reportVersion.structured_report_model);

  const replay = await post("/api/building-platform/v1/permanent-save", db, {
    project_id: projectId,
    expected_project_token: initialToken,
    idempotency_key: "save-permanent-1",
    creation_reason: "initial_project_creation",
    building_dna: overwrittenDna,
    calculation_fingerprint: overwrittenPreview.metadata.fingerprints.analysisFingerprint,
    report_fingerprint: overwrittenPreview.metadata.fingerprints.reportFingerprint
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.buildingDnaVersion.building_dna_version_id, saved.body.buildingDnaVersion.building_dna_version_id);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_dna_versions"), 1);

  const changedAgain = mutateEpsThickness(buildingDna, 0.2);
  const changedPreview = localCalculationFingerprints(changedAgain);
  const stale = await post("/api/building-platform/v1/permanent-save", db, {
    project_id: projectId,
    expected_project_token: initialToken,
    idempotency_key: "save-stale",
    creation_reason: "renovation_intervention",
    building_dna: changedAgain,
    calculation_fingerprint: changedPreview.metadata.fingerprints.analysisFingerprint,
    report_fingerprint: changedPreview.metadata.fingerprints.reportFingerprint
  });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, "stale_project_version_conflict");

  const currentToken = reopened.body.concurrency_token;
  const second = await post("/api/building-platform/v1/permanent-save", db, {
    project_id: projectId,
    expected_project_token: currentToken,
    idempotency_key: "save-permanent-2",
    creation_reason: "renovation_intervention",
    building_dna: changedAgain,
    calculation_fingerprint: changedPreview.metadata.fingerprints.analysisFingerprint,
    report_fingerprint: changedPreview.metadata.fingerprints.reportFingerprint
  });
  assert.equal(second.status, 200);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_dna_versions"), 2);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_analysis_versions"), 2);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_report_versions"), 2);
  assert.equal(second.body.buildingDnaVersion.parent_building_dna_version_id, saved.body.buildingDnaVersion.building_dna_version_id);
  assert.notEqual(second.body.analysisVersion.calculation_fingerprint, saved.body.analysisVersion.calculation_fingerprint);

  const history = await post("/api/building-platform/v1/versions/list", db, { project_id: projectId });
  assert.equal(history.status, 200);
  assert.equal(history.body.versions.length, 2);

  const comparison = await post("/api/building-platform/v1/versions/compare", db, {
    project_id: projectId,
    old_building_dna_version_id: saved.body.buildingDnaVersion.building_dna_version_id,
    new_building_dna_version_id: second.body.buildingDnaVersion.building_dna_version_id
  });
  assert.equal(comparison.status, 200);
  assert.equal(
    comparison.body.building_dna_changes.some((change) => change.path.includes("thickness.amount")),
    true
  );
  assert.notEqual(comparison.body.annual_changes.annualQHnd.delta, 0);

  const listed = await post("/api/building-platform/v1/projects/list", db, {});
  assert.equal(listed.status, 200);
  assert.equal(listed.body.projects.length, 1);
  assert.equal(listed.body.projects[0].permanent_version_count, 2);
  assert.equal(listed.body.projects[0].annualQHnd, second.body.result_summary.annualQHnd);

  const auditActions = db.rows("SELECT action FROM building_platform_audit_events ORDER BY created_at, action")
    .map((row) => row.action);
  assert.equal(auditActions.includes("project_created"), true);
  assert.equal(auditActions.includes("draft_explicitly_saved"), true);
  assert.equal(auditActions.includes("permanent_version_saved"), true);
  assert.equal(db.batchTransactionCount >= 5, true);
});

await test("P3E-B v1 permanent save rejects stale local calculation fingerprints", async () => {
  const db = new SqliteD1();
  await seedUser(db, "stale-fingerprint-token");
  const created = await post("/api/building-platform/v1/projects/create", db, {
    project_name: "Stale fingerprint project"
  }, "stale-fingerprint-token");
  const buildingDna = demoBuildingDna();
  const alteredDna = mutateEpsThickness(buildingDna, 0.22);
  const stalePreview = localCalculationFingerprints(buildingDna);

  const saved = await post("/api/building-platform/v1/permanent-save", db, {
    project_id: created.body.project.project_id,
    expected_project_token: created.body.concurrency_token,
    idempotency_key: "stale-fingerprint-save",
    creation_reason: "initial_project_creation",
    building_dna: alteredDna,
    calculation_fingerprint: stalePreview.metadata.fingerprints.analysisFingerprint,
    report_fingerprint: stalePreview.metadata.fingerprints.reportFingerprint
  }, "stale-fingerprint-token");

  assert.equal(saved.status, 409);
  assert.equal(saved.body.code, "stale_result_requires_recalculation");
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_dna_versions"), 0);
  assert.equal(db.scalar("SELECT COUNT(*) FROM building_platform_analysis_versions"), 0);
});
