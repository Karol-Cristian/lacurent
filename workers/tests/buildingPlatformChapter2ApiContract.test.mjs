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
  assert.equal(result.body.calculation_status, "synthetic_demo");
  assert.equal(result.body.result_summary.annualQHnd > 0, true);
  assert.equal(result.body.result_summary.annualQCnd > 0, true);
  assert.equal(result.body.technical_report.reportId, "technical_chapter_2_report_v1");
  assert.equal(db.houses.length, 1);
  assert.equal(db.sites.length, 1);
  assert.equal(db.buildings.length, 1);
  assert.equal(db.analyses.length, 1);
  assert.equal(db.answers.length, 5);
  assert.equal(db.snapshots.length, 1);
  assert.equal(db.reports[0].report_type, "building_platform_chapter2_technical_report");
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
  assert.equal(loaded.body.chapter2_result.status, "ready");
  assert.equal(loaded.body.technical_report.reportId, "technical_chapter_2_report_v1");
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
  assert.equal(listed.body.projects[0].annualQHnd, second.body.result_summary.annualQHnd);
  assert.equal(listed.body.projects[0].annualQCnd, second.body.result_summary.annualQCnd);
  assert.equal(listed.body.projects[0].report_available, true);
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
  assert.notEqual(
    second.body.result_summary.annualQHnd,
    first.body.result_summary.annualQHnd
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
