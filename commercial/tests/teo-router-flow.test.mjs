import test from "node:test";
import assert from "node:assert/strict";
import router from "../teo-router/worker.mjs";

class MockStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.params = [];
  }
  bind(...params) {
    this.params = params;
    return this;
  }
  async all() {
    if (this.sql.startsWith("SELECT run_id")) {
      const row = this.db.rows.get(String(this.params[0] || ""));
      return {results:row ? [{...row}] : []};
    }
    throw new Error("Unsupported all SQL: " + this.sql);
  }
  async run() {
    const sql = this.sql;
    if (sql.startsWith("CREATE TABLE") || sql.startsWith("CREATE INDEX") || sql.startsWith("DELETE FROM")) {
      return {success:true};
    }
    if (sql.startsWith("INSERT INTO teo_verification_runs")) {
      const [runId, planned] = this.params;
      this.db.rows.set(String(runId), {
        run_id:String(runId),
        status:"ready",
        planned_verifications:Number(planned),
        verified_count:0,
        next_allowed_at_ms:0,
        in_flight:0,
        lease_token:null,
        lease_expires_at_ms:0,
        updated_at:"now",
      });
      return {success:true};
    }
    if (sql.includes("SET status='running'")) {
      const [token, expires, runId, nowA, nowB] = this.params;
      const row = this.db.rows.get(String(runId));
      if (
        row &&
        row.verified_count < row.planned_verifications &&
        row.next_allowed_at_ms <= Number(nowA) &&
        (!row.in_flight || row.lease_expires_at_ms <= Number(nowB))
      ) {
        Object.assign(row, {
          status:"running",
          in_flight:1,
          lease_token:String(token),
          lease_expires_at_ms:Number(expires),
        });
      }
      return {success:true};
    }
    if (sql.includes("verified_count=verified_count+1")) {
      const [nextAllowed, runId, token] = this.params;
      const row = this.db.rows.get(String(runId));
      if (row && row.lease_token === token) {
        row.verified_count += 1;
        row.status = row.verified_count >= row.planned_verifications ? "complete" : "cooldown";
        row.next_allowed_at_ms = Number(nextAllowed);
        row.in_flight = 0;
        row.lease_token = null;
        row.lease_expires_at_ms = 0;
      }
      return {success:true};
    }
    if (sql.includes("SET status='cooldown'")) {
      const [nextAllowed, runId, token] = this.params;
      const row = this.db.rows.get(String(runId));
      if (row && row.lease_token === token) {
        Object.assign(row, {
          status:"cooldown",
          next_allowed_at_ms:Number(nextAllowed),
          in_flight:0,
          lease_token:null,
          lease_expires_at_ms:0,
        });
      }
      return {success:true};
    }
    if (sql.includes("SET status='complete'")) {
      const [runId] = this.params;
      const row = this.db.rows.get(String(runId));
      if (row) {
        Object.assign(row, {
          status:"complete",
          in_flight:0,
          lease_token:null,
          lease_expires_at_ms:0,
        });
      }
      return {success:true};
    }
    throw new Error("Unsupported run SQL: " + sql);
  }
}

class MockD1 {
  constructor() {
    this.rows = new Map();
  }
  prepare(sql) {
    return new MockStatement(this, sql);
  }
}

function shard(status, label, assertions = () => {}) {
  return {
    async fetch(request) {
      assertions(request);
      return Response.json(
        status === 200 ? {candidate:{candidate_id:label}} : {error:"busy"},
        {status},
      );
    },
  };
}

function envWithShards(statuses) {
  const db = new MockD1();
  return {
    DB:db,
    TEO_A:shard(statuses[0], "a", request => {
      if (statuses[0] === 200) {
        assert.equal(request.headers.get("x-lacurent-flow-gated"), "1");
      }
    }),
    TEO_B:shard(statuses[1], "b", request => {
      if (statuses[1] === 200) {
        assert.equal(request.headers.get("x-lacurent-flow-gated"), "1");
      }
    }),
    TEO_C:shard(statuses[2], "c"),
    TEO_D:shard(statuses[3], "d"),
  };
}

async function start(env, runId="run-1") {
  const response = await router.fetch(
    new Request("https://lacurent.com/api/optimization/home-lab/v4/flow/start", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({runId,plannedVerifications:1}),
    }),
    env,
  );
  assert.equal(response.status, 200);
  return await response.json();
}

async function verify(env, runId="run-1") {
  return await router.fetch(
    new Request("https://lacurent.com/api/optimization/home-lab/v3/verify", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        runId,
        branchId:"keep-current-heating",
        candidate:{candidate_id:"candidate-1"},
        form:{_optimizer_run_id:runId},
      }),
    }),
    env,
  );
}

test("TEO router owns flow state and completes one successful VERIFY", async () => {
  const env = envWithShards([200,200,200,200]);
  const started = await start(env);
  assert.equal(started.storage, "router-d1");
  assert.equal(started.ready, true);

  const response = await verify(env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-lacurent-teo"), "private-teo-sharded");
  const body = await response.json();
  assert.equal(body.workerFlow.verifiedCount, 1);
  assert.equal(body.workerFlow.status, "complete");
});

test("TEO router fails over a heavy VERIFY without changing the flow slot", async () => {
  const env = envWithShards([503,200,200,200]);
  await start(env, "failover");
  const response = await verify(env, "failover");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-lacurent-teo-shard"), "teo_b");
  const body = await response.json();
  assert.equal(body.workerFlow.verifiedCount, 1);
  assert.equal(body.workerFlow.status, "complete");
});

test("TEO router releases the lease when all heavy shards fail", async () => {
  const env = envWithShards([503,503,503,503]);
  await start(env, "all-down");
  const response = await verify(env, "all-down");
  assert.equal(response.status, 503);
  assert.ok(Number(response.headers.get("retry-after")) >= 2);

  const status = await router.fetch(
    new Request("https://lacurent.com/api/optimization/home-lab/v4/flow/all-down"),
    env,
  );
  const state = await status.json();
  assert.equal(state.status, "cooldown");
  assert.equal(state.ready, false);
  assert.equal(state.verifiedCount, 0);
});


class QuotaD1 {
  prepare() {
    return {
      bind() { return this; },
      async all() {
        throw new Error("D1_ERROR: daily row write limit exceeded");
      },
      async run() {
        throw new Error("D1_ERROR: daily row write limit exceeded");
      },
    };
  }
}

class CompleteQuotaStatement extends MockStatement {
  async run() {
    if (this.sql.includes("verified_count=verified_count+1")) {
      throw new Error("D1_ERROR: daily row write limit exceeded");
    }
    return await super.run();
  }
}

class CompleteQuotaD1 extends MockD1 {
  prepare(sql) {
    return new CompleteQuotaStatement(this, sql);
  }
}

function envWithDb(db, statuses=[200,200,200,200]) {
  return {
    DB:db,
    TEO_A:shard(statuses[0], "a"),
    TEO_B:shard(statuses[1], "b"),
    TEO_C:shard(statuses[2], "c"),
    TEO_D:shard(statuses[3], "d"),
  };
}

test("TEO VERIFY stays available when D1 quota is exhausted before flow acquire", async () => {
  const moduleUrl = new URL("../teo-router/worker.mjs?flow-quota-acquire", import.meta.url);
  const isolatedRouter = (await import(moduleUrl.href)).default;
  const env = envWithDb(new QuotaD1());

  const startResponse = await isolatedRouter.fetch(
    new Request("https://lacurent.com/api/optimization/home-lab/v4/flow/start", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({runId:"quota-acquire",plannedVerifications:1}),
    }),
    env,
  );
  assert.equal(startResponse.status, 200);
  assert.equal(
    startResponse.headers.get("x-lacurent-teo"),
    "router-flow-memory-fallback",
  );
  const started = await startResponse.json();
  assert.equal(started.storage, "router-memory-fallback");
  assert.equal(started.ready, true);

  const verifyResponse = await isolatedRouter.fetch(
    new Request("https://lacurent.com/api/optimization/home-lab/v3/verify", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        runId:"quota-acquire",
        branchId:"keep-current-heating",
        candidate:{candidate_id:"candidate-1"},
        form:{_optimizer_run_id:"quota-acquire"},
      }),
    }),
    env,
  );
  assert.equal(verifyResponse.status, 200);
  assert.equal(verifyResponse.headers.get("x-lacurent-teo-shard"), "teo_a");
  const body = await verifyResponse.json();
  assert.equal(body.workerFlow.storage, "router-memory-fallback");
  assert.equal(body.workerFlow.verifiedCount, 1);
  assert.equal(body.workerFlow.status, "complete");
});

test("successful VERIFY is not discarded when D1 quota fails during flow completion", async () => {
  const moduleUrl = new URL("../teo-router/worker.mjs?flow-quota-complete", import.meta.url);
  const isolatedRouter = (await import(moduleUrl.href)).default;
  const env = envWithDb(new CompleteQuotaD1());

  const startResponse = await isolatedRouter.fetch(
    new Request("https://lacurent.com/api/optimization/home-lab/v4/flow/start", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({runId:"quota-complete",plannedVerifications:1}),
    }),
    env,
  );
  assert.equal(startResponse.status, 200);

  const verifyResponse = await isolatedRouter.fetch(
    new Request("https://lacurent.com/api/optimization/home-lab/v3/verify", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        runId:"quota-complete",
        branchId:"keep-current-heating",
        candidate:{candidate_id:"candidate-2"},
        form:{_optimizer_run_id:"quota-complete"},
      }),
    }),
    env,
  );

  assert.equal(
    verifyResponse.status,
    200,
    "a valid shard result must survive control-plane D1 failure",
  );
  assert.equal(verifyResponse.headers.get("x-lacurent-teo-shard"), "teo_a");
  const body = await verifyResponse.json();
  assert.equal(body.candidate.candidate_id, "a");
  assert.equal(body.workerFlow.storage, "router-memory-fallback");
  assert.equal(body.workerFlow.verifiedCount, 1);
  assert.equal(body.workerFlow.status, "complete");
  assert.match(body.workerFlow.degradedReason, /D1_ERROR/);
});
