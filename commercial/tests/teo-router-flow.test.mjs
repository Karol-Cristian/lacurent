import test from "node:test";
import assert from "node:assert/strict";

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

function quotaExhaustedDb() {
  return {
    prepare() {
      throw new Error(
        "D1_ERROR: Your account has exceeded D1's free tier daily row write limit."
      );
    },
  };
}

function envWithShards(statuses, {db=quotaExhaustedDb()} = {}) {
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

async function freshRouter(label) {
  const moduleUrl = new URL(
    `../teo-router/worker.mjs?${encodeURIComponent(label)}-${Date.now()}-${Math.random()}`,
    import.meta.url,
  );
  return (await import(moduleUrl.href)).default;
}

function startRequest(runId="run-1", plannedVerifications=3) {
  return new Request("https://lacurent.com/api/optimization/home-lab/v4/flow/start", {
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({runId,plannedVerifications}),
  });
}

function statusRequest(runId="run-1") {
  return new Request(
    `https://lacurent.com/api/optimization/home-lab/v4/flow/${encodeURIComponent(runId)}`,
  );
}

function finishRequest(runId="run-1") {
  return new Request(
    `https://lacurent.com/api/optimization/home-lab/v4/flow/${encodeURIComponent(runId)}/finish`,
    {method:"POST",headers:{"content-type":"application/json"},body:"{}"},
  );
}

function verifyRequest(runId="run-1") {
  return new Request("https://lacurent.com/api/optimization/home-lab/v3/verify", {
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
      runId,
      branchId:"keep-current-heating",
      candidate:{candidate_id:"candidate-1"},
      form:{_optimizer_run_id:runId},
    }),
  });
}

test("TEO flow control remains API-compatible without touching D1", async () => {
  const router = await freshRouter("stateless-flow");
  const env = envWithShards([200,200,200,200]);

  const startedResponse = await router.fetch(startRequest("stateless", 3), env);
  assert.equal(startedResponse.status, 200);
  assert.equal(startedResponse.headers.get("x-lacurent-teo"), "router-flow-stateless");
  const started = await startedResponse.json();
  assert.equal(started.storage, "router-stateless");
  assert.equal(started.ready, true);
  assert.equal(started.plannedVerifications, 3);

  const statusResponse = await router.fetch(statusRequest("stateless"), env);
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert.equal(status.storage, "router-stateless");
  assert.equal(status.ready, true);

  const finishResponse = await router.fetch(finishRequest("stateless"), env);
  assert.equal(finishResponse.status, 200);
  const finished = await finishResponse.json();
  assert.equal(finished.storage, "router-stateless");
  assert.equal(finished.status, "complete");
  assert.equal(finished.ready, false);
});

test("D1 write-quota exhaustion cannot block canonical VERIFY", async () => {
  const router = await freshRouter("quota-independent");
  const env = envWithShards([200,200,200,200], {db:quotaExhaustedDb()});

  const response = await router.fetch(verifyRequest("quota-independent"), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-lacurent-teo"), "private-teo-sharded");
  assert.equal(response.headers.get("x-lacurent-teo-shard"), "teo_a");
  const body = await response.json();
  assert.equal(body.candidate.candidate_id, "a");
  assert.equal(body.workerFlow.storage, "router-stateless");
  assert.equal(body.workerFlow.ready, true);
});

test("TEO router fails over a heavy VERIFY without D1 state", async () => {
  const router = await freshRouter("failover");
  const env = envWithShards([503,200,200,200]);

  const response = await router.fetch(verifyRequest("failover"), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-lacurent-teo-shard"), "teo_b");
  const body = await response.json();
  assert.equal(body.candidate.candidate_id, "b");
  assert.equal(body.workerFlow.storage, "router-stateless");
});

test("TEO router reports shard outage, not router-control outage, when all shards fail", async () => {
  const router = await freshRouter("all-down");
  const env = envWithShards([503,503,503,503]);

  const response = await router.fetch(verifyRequest("all-down"), env);
  assert.equal(response.status, 503);
  assert.ok(Number(response.headers.get("retry-after")) >= 2);
  const body = await response.json();
  assert.equal(body.stage, "private-teo-router");
  assert.equal(body.attempts.length, 4);
  assert.notEqual(body.stage, "private-teo-router-control");
});

test("invalid long run IDs are rejected before shard work", async () => {
  const router = await freshRouter("invalid-run");
  const env = envWithShards([200,200,200,200]);

  const response = await router.fetch(verifyRequest("x".repeat(161)), env);
  assert.equal(response.status, 422);
  const body = await response.json();
  assert.equal(body.stage, "verify-router");
});
