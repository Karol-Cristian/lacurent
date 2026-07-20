import assert from "node:assert/strict";
import worker from "../save-house.js";
import {
  ASSISTED_WIZARD_DEMO_FIXTURE,
  mapWizardAnswersToAssistedAnswers
} from "../../js/building-platform-wizard.mjs";
import { createBuildingDnaFromAssistedAnswers } from "../../src/building-platform/index.mjs";

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`PASS ${name}`))
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  first() {
    return this.db.first(this.sql, this.params);
  }

  all() {
    return this.db.all(this.sql, this.params);
  }

  run() {
    return this.db.run(this.sql, this.params);
  }
}

class FakeDb {
  constructor() {
    this.user = {
      id: 1,
      email: "safe-user.local",
      name: "Safe User",
      role: "residential",
      account_type: "registered"
    };
    this.houses = [];
    this.sites = [];
    this.buildings = [];
    this.analyses = [];
    this.answers = [];
    this.snapshots = [];
    this.reports = [];
    this.versionedProjects = [];
    this.buildingDnaVersions = [];
    this.analysisVersions = [];
    this.reportVersions = [];
    this.auditEvents = [];
    this.nextHouseId = 7;
    this.nextSiteId = 20;
    this.nextBuildingId = 30;
    this.nextAnalysisId = 100;
    this.nextSnapshotId = 500;
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  batch(statements) {
    statements.forEach(statement => statement.run());
    return Promise.resolve([]);
  }

  first(sql, params) {
    if (sql.includes("FROM user_sessions")) {
      return this.user;
    }
    if (sql.includes("FROM houses")) {
      const [houseId, userId] = params;
      return this.houses.find((house) => (
        house.id === houseId &&
        house.user_id === userId &&
        house.active === 1
      )) || null;
    }
    if (sql.includes("FROM analyses")) {
      const [analysisId, userId, analysisType] = params;
      return this.analyses.find((analysis) => (
        analysis.id === analysisId &&
        analysis.user_id === userId &&
        analysis.analysis_type === analysisType
      )) || null;
    }
    if (sql.includes("FROM report_snapshots")) {
      const [analysisId] = params;
      return [...this.snapshots]
        .reverse()
        .find((snapshot) => snapshot.analysis_id === analysisId) || null;
    }
    if (sql.includes("FROM building_platform_projects")) {
      const [projectId, ownerUserId] = params;
      return this.versionedProjects.find((project) => (
        project.project_id === projectId &&
        project.owner_user_id === ownerUserId
      )) || null;
    }
    return null;
  }

  all(sql, params) {
    if (sql.includes("FROM houses") && sql.includes("version_count")) {
      const [userId, analysisType, countUserId, countAnalysisType, ownerUserId] = params;
      const houses = this.houses.filter((house) => house.user_id === ownerUserId && house.active === 1);
      return {
        results: houses
          .map((house) => {
            const analyses = this.analyses
              .filter((analysis) => (
                analysis.house_id === house.id &&
                analysis.user_id === userId &&
                analysis.analysis_type === analysisType &&
                analysis.status === "completed"
              ))
              .sort((a, b) => b.id - a.id);
            const counted = this.analyses.filter((analysis) => (
              analysis.house_id === house.id &&
              analysis.user_id === countUserId &&
              analysis.analysis_type === countAnalysisType &&
              analysis.status === "completed"
            ));
            const latest = analyses[0];
            if (!latest) return null;
            return {
              house_id: house.id,
              display_name: house.display_name,
              house_type: house.house_type,
              surface: house.surface,
              city: house.city,
              analysis_id: latest.id,
              completed_at: latest.completed_at,
              version_count: counted.length
            };
          })
          .filter(Boolean)
      };
    }
    if (sql.includes("FROM analysis_answers")) {
      const [analysisId, group] = params;
      return {
        results: this.answers
          .filter((answer) => answer.analysis_id === analysisId && answer.answer_group === group)
          .map((answer) => ({
            question_key: answer.question_key,
            answer_value: answer.answer_value
          }))
      };
    }
    return { results: [] };
  }

  run(sql, params) {
    if (sql.includes("INSERT INTO houses")) {
      const id = this.nextHouseId;
      this.nextHouseId += 1;
      this.houses.push({
        id,
        user_id: params[0],
        house_type: params[1],
        surface: params[2],
        year: params[3],
        city: params[4],
        display_name: params[5],
        analysis_purpose: params[6],
        active: 1
      });
      return { meta: { last_row_id: id, changes: 1 } };
    }
    if (sql.includes("INSERT INTO sites")) {
      const id = this.nextSiteId;
      this.nextSiteId += 1;
      this.sites.push({ id, user_id: params[0], name: params[1], city: params[2] });
      return { meta: { last_row_id: id, changes: 1 } };
    }
    if (sql.includes("INSERT INTO buildings")) {
      const id = this.nextBuildingId;
      this.nextBuildingId += 1;
      this.buildings.push({
        id,
        site_id: params[0],
        house_id: params[1],
        building_type: params[2],
        area: params[3],
        climate_region: params[5]
      });
      return { meta: { last_row_id: id, changes: 1 } };
    }
    if (sql.includes("INSERT INTO analyses")) {
      const id = this.nextAnalysisId;
      this.nextAnalysisId += 1;
      this.analyses.push({
        id,
        user_id: params[0],
        house_id: params[1],
        analysis_type: params[2],
        status: "completed",
        completed_at: params[3]
      });
      return { meta: { last_row_id: id, changes: 1 } };
    }
    if (sql.includes("INSERT INTO analysis_answers")) {
      this.answers.push({
        analysis_id: params[0],
        question_key: params[1],
        answer_value: params[2],
        answer_group: params[3]
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO report_snapshots")) {
      const id = this.nextSnapshotId;
      this.nextSnapshotId += 1;
      this.snapshots.push({
        id,
        home_id: params[0],
        analysis_id: params[1],
        generated_at: params[2],
        technical_details_json: params[3],
        confidence_level: params[4]
      });
      return { meta: { last_row_id: id, changes: 1 } };
    }
    if (sql.includes("INSERT INTO reports")) {
      this.reports.push({
        analysis_id: params[0],
        report_type: params[1],
        status: "completed"
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO building_platform_projects")) {
      this.versionedProjects.push({
        project_id: params[0],
        owner_user_id: params[1],
        project_name: params[2],
        project_status: params[3],
        current_building_dna_version_id: params[4],
        current_analysis_version_id: params[5],
        current_report_version_id: params[6],
        created_at: params[7],
        updated_at: params[8],
        legacy_source_id: params[9],
        schema_version: params[10]
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("UPDATE building_platform_projects")) {
      const project = this.versionedProjects.find((item) => (
        item.project_id === params[6] &&
        item.owner_user_id === params[7]
      ));
      if (project) {
        project.project_name = params[0];
        project.project_status = params[1];
        project.current_building_dna_version_id = params[2];
        project.current_analysis_version_id = params[3];
        project.current_report_version_id = params[4];
        project.updated_at = params[5];
      }
      return { meta: { changes: project ? 1 : 0 } };
    }
    if (sql.includes("INSERT INTO building_dna_versions")) {
      this.buildingDnaVersions.push({
        building_dna_version_id: params[0],
        project_id: params[1],
        parent_building_dna_version_id: params[2],
        schema_version: params[3],
        complete_building_dna_json: params[4],
        climate_profile_id: params[12],
        climate_profile_version: params[13],
        creation_reason: params[14],
        created_by: params[15],
        created_at: params[16],
        building_dna_fingerprint: params[17]
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO building_platform_analysis_versions")) {
      this.analysisVersions.push({
        analysis_version_id: params[0],
        project_id: params[1],
        building_dna_version_id: params[2],
        parent_analysis_version_id: params[3],
        adapter_version: params[4],
        physics_engine_version: params[5],
        normative_registry_version: params[6],
        climate_profile_id: params[7],
        climate_profile_version: params[8],
        explicit_engine_input_json: params[9],
        complete_engine_output_json: params[10],
        monthly_qhnd_json: params[11],
        monthly_qcnd_json: params[12],
        annual_qhnd: params[13],
        annual_qcnd: params[14],
        calculation_status: params[17],
        calculation_fingerprint: params[18],
        schema_version: params[22]
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO building_platform_report_versions")) {
      this.reportVersions.push({
        technical_report_version_id: params[0],
        project_id: params[1],
        analysis_version_id: params[2],
        building_dna_version_id: params[3],
        report_schema_version: params[4],
        structured_report_model_json: params[5],
        traceability_model_json: params[6],
        calculation_fingerprint: params[7],
        generated_at: params[8],
        report_status: params[9],
        schema_version: params[10]
      });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("INSERT INTO building_platform_audit_events")) {
      this.auditEvents.push({
        event_id: params[0],
        project_id: params[1],
        building_dna_version_id: params[2],
        analysis_version_id: params[3],
        technical_report_version_id: params[4],
        actor_user_id: params[5],
        action: params[6],
        reason: params[7],
        metadata_json: params[8],
        created_at: params[9]
      });
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }
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

async function post(path, db, body, token = "token") {
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

await test("Building Platform save endpoint requires authentication", async () => {
  const db = new FakeDb();
  const result = await post(
    "/api/building-platform/chapter2/save",
    db,
    { building_dna: demoBuildingDna() },
    null
  );
  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("Building Platform save endpoint rejects client-supplied Chapter 2 outputs", async () => {
  const db = new FakeDb();
  const result = await post(
    "/api/building-platform/chapter2/save",
    db,
    {
      building_dna: demoBuildingDna(),
      chapter2_result: { annualQHnd: 1 }
    }
  );
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("Building Platform save endpoint creates persisted Building DNA, analysis and report records", async () => {
  const db = new FakeDb();
  const result = await post(
    "/api/building-platform/chapter2/save",
    db,
    {
      project_name: "Demo Building Platform",
      building_dna: demoBuildingDna()
    }
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.house_id, 7);
  assert.equal(result.body.analysis_id, 100);
  assert.equal(result.body.building_dna_version.versionId, "building-dna-100");
  assert.equal(result.body.building_dna_version.backendVersion, "building_platform_versioned_backend_p3e_v1");
  assert.equal(result.body.building_dna_version.adapterVersion, "building_chapter_2_adapter_v1");
  assert.equal(
    result.body.building_dna_version.normativeRegistryVersion,
    "MC001_R20_CHAPTER_2_EXHAUSTIVE_COVERAGE_MATRIX"
  );
  assert.equal(result.body.fingerprints.buildingDnaFingerprint.startsWith("dna_"), true);
  assert.equal(result.body.fingerprints.climateProfileFingerprint.startsWith("climate_"), true);
  assert.equal(result.body.fingerprints.analysisFingerprint.startsWith("analysis_"), true);
  assert.equal(result.body.fingerprints.reportFingerprint, result.body.fingerprints.analysisFingerprint);
  assert.equal(result.body.calculation_status, "synthetic_demo");
  assert.equal(result.body.result_summary.annualQHnd > 0, true);
  assert.equal(result.body.result_summary.annualQCnd > 0, true);
  assert.equal(result.body.technical_report.reportId, "engineering_calculation_notebook_p3g_v1");
  assert.equal(db.houses.length, 1);
  assert.equal(db.sites.length, 1);
  assert.equal(db.buildings.length, 1);
  assert.equal(db.analyses.length, 1);
  assert.equal(db.answers.length, 5);
  assert.equal(db.snapshots.length, 1);
  assert.equal(db.reports[0].report_type, "building_platform_chapter2_technical_report");
  assert.equal(db.versionedProjects.length, 1);
  assert.equal(db.versionedProjects[0].project_id, "bp-house-7");
  assert.equal(db.versionedProjects[0].current_building_dna_version_id, "dna-version-100");
  assert.equal(db.buildingDnaVersions[0].building_dna_fingerprint, result.body.fingerprints.buildingDnaFingerprint);
  assert.equal(db.analysisVersions[0].calculation_fingerprint, result.body.fingerprints.analysisFingerprint);
  assert.equal(db.reportVersions[0].calculation_fingerprint, result.body.fingerprints.reportFingerprint);
  assert.equal(db.auditEvents[0].action, "calculation_completed");
});

await test("Building Platform load endpoint returns saved structured model for owner", async () => {
  const db = new FakeDb();
  const saved = await post(
    "/api/building-platform/chapter2/save",
    db,
    { building_dna: demoBuildingDna() }
  );
  const loaded = await post(
    "/api/building-platform/chapter2/load",
    db,
    { analysis_id: saved.body.analysis_id }
  );

  assert.equal(loaded.status, 200);
  assert.equal(loaded.body.success, true);
  assert.equal(loaded.body.building_dna.schema, "building_dna_v1");
  assert.equal(loaded.body.building_dna_version.versionId, "building-dna-100");
  assert.deepEqual(loaded.body.fingerprints, saved.body.fingerprints);
  assert.deepEqual(
    loaded.body.technical_details.fingerprints,
    saved.body.fingerprints
  );
  assert.equal(
    loaded.body.technical_details.versions.physicsEngineVersion,
    "mc001_chapter_2_runtime_complete_for_supported_inputs"
  );
  assert.equal(loaded.body.chapter2_result.status, "ready");
  assert.equal(loaded.body.technical_report.reportId, "engineering_calculation_notebook_p3g_v1");
  assert.equal(
    loaded.body.technical_details.resultSummary.annualQHnd,
    saved.body.result_summary.annualQHnd
  );
});

await test("Building Platform project list returns latest saved version summaries for owner", async () => {
  const db = new FakeDb();
  const buildingDna = demoBuildingDna();
  const first = await post("/api/building-platform/chapter2/save", db, {
    project_name: "Demo Building Platform",
    building_dna: buildingDna
  });
  const changed = {
    ...buildingDna,
    geometry: {
      ...buildingDna.geometry,
      windowAreaM2: {
        ...buildingDna.geometry.windowAreaM2,
        amount: buildingDna.geometry.windowAreaM2.amount + 4
      }
    },
    envelopeElements: buildingDna.envelopeElements.map((element) => (
      element.elementId === "windows"
        ? {
            ...element,
            area: {
              ...element.area,
              amount: element.area.amount + 4
            }
          }
        : element
    ))
  };
  const second = await post("/api/building-platform/chapter2/save", db, {
    house_id: first.body.house_id,
    project_name: "Demo Building Platform",
    building_dna: changed
  });

  const listed = await post("/api/building-platform/chapter2/list", db, {});

  assert.equal(listed.status, 200);
  assert.equal(listed.body.success, true);
  assert.equal(listed.body.projects.length, 1);
  assert.equal(listed.body.projects[0].house_id, first.body.house_id);
  assert.equal(listed.body.projects[0].latest_analysis_id, second.body.analysis_id);
  assert.equal(listed.body.projects[0].version_count, 2);
  assert.equal(listed.body.projects[0].project_name, "Demo Building Platform");
  assert.equal(listed.body.projects[0].building_dna_version_id, "building-dna-101");
  assert.equal(listed.body.projects[0].building_dna_fingerprint.startsWith("dna_"), true);
  assert.equal(listed.body.projects[0].analysis_fingerprint.startsWith("analysis_"), true);
  assert.equal(
    listed.body.projects[0].report_fingerprint,
    listed.body.projects[0].analysis_fingerprint
  );
  assert.equal(listed.body.projects[0].annualQHnd, second.body.result_summary.annualQHnd);
  assert.equal(listed.body.projects[0].annualQCnd, second.body.result_summary.annualQCnd);
  assert.equal(listed.body.projects[0].report_available, true);
  assert.equal(db.versionedProjects[0].current_building_dna_version_id, "dna-version-101");
  assert.equal(db.buildingDnaVersions[1].parent_building_dna_version_id, "dna-version-100");
  assert.equal(db.analysisVersions[1].parent_analysis_version_id, "analysis-version-100");
});

await test("Building Platform project list requires authentication", async () => {
  const db = new FakeDb();
  const listed = await post("/api/building-platform/chapter2/list", db, {}, null);

  assert.equal(listed.status, 401);
  assert.equal(listed.body.success, false);
});

await test("Building Platform recalculation creates a new analysis version without overwriting old result", async () => {
  const db = new FakeDb();
  const buildingDna = demoBuildingDna();
  const first = await post("/api/building-platform/chapter2/save", db, { building_dna: buildingDna });
  const changed = {
    ...buildingDna,
    geometry: {
      ...buildingDna.geometry,
      windowAreaM2: {
        ...buildingDna.geometry.windowAreaM2,
        amount: buildingDna.geometry.windowAreaM2.amount + 4
      }
    },
    envelopeElements: buildingDna.envelopeElements.map((element) => (
      element.elementId === "windows"
        ? {
            ...element,
            area: {
              ...element.area,
              amount: element.area.amount + 4
            }
          }
        : element
    ))
  };
  const second = await post(
    "/api/building-platform/chapter2/save",
    db,
    {
      house_id: first.body.house_id,
      building_dna: changed
    }
  );

  assert.equal(second.status, 200);
  assert.equal(second.body.house_id, first.body.house_id);
  assert.equal(second.body.analysis_id, 101);
  assert.equal(db.houses.length, 1);
  assert.equal(db.analyses.length, 2);
  assert.equal(db.snapshots.length, 2);
  assert.equal(db.versionedProjects.length, 1);
  assert.equal(db.buildingDnaVersions.length, 2);
  assert.equal(db.analysisVersions.length, 2);
  assert.equal(db.reportVersions.length, 2);
  assert.notEqual(
    second.body.result_summary.annualQHnd,
    first.body.result_summary.annualQHnd
  );
  assert.notEqual(
    second.body.fingerprints.buildingDnaFingerprint,
    first.body.fingerprints.buildingDnaFingerprint
  );
  assert.notEqual(
    second.body.fingerprints.analysisFingerprint,
    first.body.fingerprints.analysisFingerprint
  );
});

await test("Building Platform load endpoint enforces analysis ownership", async () => {
  const db = new FakeDb();
  const saved = await post(
    "/api/building-platform/chapter2/save",
    db,
    { building_dna: demoBuildingDna() }
  );
  db.user = { ...db.user, id: 2 };
  const loaded = await post(
    "/api/building-platform/chapter2/load",
    db,
    { analysis_id: saved.body.analysis_id }
  );

  assert.equal(loaded.status, 404);
  assert.equal(loaded.body.success, false);
});

await test("Building Platform legacy Chapter 2 compatibility endpoints remain active", async () => {
  const db = new FakeDb();
  const saved = await post(
    "/api/building-platform/chapter2/save",
    db,
    {
      project_name: "Stable Compatibility Project",
      building_dna: demoBuildingDna()
    }
  );
  const listed = await post("/api/building-platform/chapter2/list", db, {});
  const loaded = await post(
    "/api/building-platform/chapter2/load",
    db,
    { analysis_id: saved.body.analysis_id }
  );

  assert.equal(saved.status, 200);
  assert.equal(saved.body.fingerprints.analysisFingerprint.startsWith("analysis_"), true);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.projects[0].analysis_fingerprint, saved.body.fingerprints.analysisFingerprint);
  assert.equal(loaded.status, 200);
  assert.deepEqual(loaded.body.fingerprints, saved.body.fingerprints);
  assert.equal(db.versionedProjects[0].project_name, "Stable Compatibility Project");
});
