import test from "node:test";
import assert from "node:assert/strict";

function envWithStatus(status, calls) {
  const make = key => ({
    async fetch() {
      calls[key] = (calls[key] || 0) + 1;
      return Response.json(status === 200 ? {ok:true,key} : {error:"busy"}, {status});
    },
  });
  return {
    TEO_A:make("A"),
    TEO_B:make("B"),
    TEO_C:make("C"),
    TEO_D:make("D"),
  };
}

function planRequest() {
  return new Request("https://lacurent.com/api/optimization/home-lab/v4/plan", {
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body:"x=1",
  });
}

test("current router creates a 15s same-isolate blackout after all four shards return 5xx", async () => {
  const moduleUrl = new URL("../teo-router/worker.mjs?diag=same-isolate", import.meta.url);
  const router = (await import(moduleUrl.href)).default;
  const calls = {};
  const env = envWithStatus(503, calls);

  const first = await router.fetch(planRequest(), env);
  assert.equal(first.status, 503);
  assert.equal(Object.values(calls).reduce((sum,value)=>sum+value,0), 4);
  const firstBody = await first.json();
  assert.equal(firstBody.attempts.length, 4);

  const callsAfterFirst = {...calls};
  const second = await router.fetch(planRequest(), env);
  assert.equal(second.status, 503);
  assert.deepEqual(calls, callsAfterFirst, "same isolate should skip all disabled shards");
  const secondBody = await second.json();
  assert.deepEqual(secondBody.attempts, [], "second request is rejected without probing a shard");
  assert.ok(Number(second.headers.get("retry-after")) >= 2);
});

test("a fresh router isolate has no memory of another isolate's disabledUntil map", async () => {
  const firstUrl = new URL("../teo-router/worker.mjs?diag=isolate-a", import.meta.url);
  const firstRouter = (await import(firstUrl.href)).default;
  const failedCalls = {};
  const failedEnv = envWithStatus(503, failedCalls);
  const failed = await firstRouter.fetch(planRequest(), failedEnv);
  assert.equal(failed.status, 503);

  const freshUrl = new URL("../teo-router/worker.mjs?diag=isolate-b", import.meta.url);
  const freshRouter = (await import(freshUrl.href)).default;
  const freshCalls = {};
  const freshEnv = envWithStatus(200, freshCalls);
  const fresh = await freshRouter.fetch(planRequest(), freshEnv);
  assert.equal(fresh.status, 200);
  assert.equal(Object.values(freshCalls).reduce((sum,value)=>sum+value,0), 1);
});
