import assert from "node:assert/strict";
import worker from "../save-house.js";

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
    this.houses = [{ id: 7, user_id: 1, active: 1 }];
    this.analyses = [];
    this.answers = [];
    this.snapshots = [];
    this.reports = [];
    this.nextAnalysisId = 100;
    this.nextSnapshotId = 500;
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
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
    if (sql.includes("FROM analysis_answers")) {
      const [analysisId, key, group] = params;
      return this.answers.find((answer) => (
        answer.analysis_id === analysisId &&
        answer.question_key === key &&
        answer.answer_group === group
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

  all() {
    return { results: [] };
  }

  run(sql, params) {
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
        report_type: "mc001_htr_transmission_module",
        status: "completed"
      });
      return { meta: { changes: 1 } };
    }
    return { meta: { changes: 0 } };
  }
}

function validPayload(overrides = {}) {
  return {
    house_id: null,
    label: "manual-htr-mvp",
    htr_input: {
      envelope_components: [
        {
          component_id: "wall-1",
          component_type: "external_wall",
          label: "Wall 1",
          area_m2: 10,
          thermal_transmittance_w_m2k: 0.3,
          bztu: 1,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        }
      ],
      non_hu_contributions: {
        thermal_bridge_w_k: {
          value: 2,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        },
        ground_w_k: {
          value: 4,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        },
        adjacent_space_w_k: {
          value: 1,
          source: {
            source_type: "explicit_user_input",
            reference: "manual_mvp_input"
          }
        }
      }
    },
    ...overrides
  };
}

async function post(path, db, body, token = "test-token") {
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

function assertNoMc001HtrPersistence(db, body) {
  assert.equal(db.analyses.length, 0);
  assert.equal(db.answers.length, 0);
  assert.equal(db.snapshots.length, 0);
  assert.equal(db.reports.length, 0);
  assert.equal(Object.prototype.hasOwnProperty.call(body, "mc001_htr"), false);
}

await test("run endpoint requires authentication", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, validPayload(), null);
  assert.equal(result.status, 401);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("run endpoint rejects missing htr_input without persistence", async () => {
  const db = new FakeDb();
  const payload = validPayload();
  delete payload.htr_input;
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(typeof result.body.error, "string");
  assertNoMc001HtrPersistence(db, result.body);
});

await test("run endpoint rejects empty envelope components without persistence", async () => {
  const db = new FakeDb();
  const payload = validPayload({
    htr_input: {
      ...validPayload().htr_input,
      envelope_components: []
    }
  });
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(typeof result.body.error, "string");
  assertNoMc001HtrPersistence(db, result.body);
});

await test("run endpoint calculates and persists a sanitized Htr result", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, validPayload());
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.analysis_id, 100);
  assert.equal(result.body.house_id, null);
  assert.equal(result.body.mc001_htr.status, "ready");
  assert.deepEqual(result.body.mc001_htr.htrTotalResult, {
    amount: 10,
    unit: "W/K"
  });
  assert.equal(db.analyses.length, 1);
  assert.equal(db.answers.length, 1);
  assert.equal(db.snapshots.length, 1);
  assert.equal(db.reports.length, 1);
});

await test("load endpoint returns saved sanitized input and result for owner", async () => {
  const db = new FakeDb();
  await post("/api/mc001/htr/run", db, validPayload({ house_id: 7 }));
  const result = await post("/api/mc001/htr/load", db, { analysis_id: 100 });
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.house_id, 7);
  assert.equal(result.body.htr_input.envelope_components.length, 1);
  assert.equal(result.body.mc001_htr.htrTotalResult.amount, 10);
});

await test("run endpoint rejects client-provided Htr totals", async () => {
  const db = new FakeDb();
  const payload = validPayload({
    htr_input: {
      ...validPayload().htr_input,
      htrTotal: 10
    }
  });
  const result = await post("/api/mc001/htr/run", db, payload);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(db.analyses.length, 0);
});

await test("run endpoint rejects private sentinel content and does not echo it", async () => {
  const db = new FakeDb();
  const payload = validPayload({ label: "person@example.com" });
  const result = await post("/api/mc001/htr/run", db, payload);
  const serialized = JSON.stringify(result.body);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(serialized.includes("person@example.com"), false);
  assert.equal(db.analyses.length, 0);
});

await test("responses do not expose raw auth or source provenance internals", async () => {
  const db = new FakeDb();
  const result = await post("/api/mc001/htr/run", db, validPayload());
  const serialized = JSON.stringify(result.body);
  for (const forbidden of [
    "sourceRecordId",
    "sourceContext",
    "sourceTrace",
    "sourceRefs",
    "test-token",
    "safe-user.local"
  ]) {
    assert.equal(serialized.includes(forbidden), false, `leaked ${forbidden}`);
  }
});
