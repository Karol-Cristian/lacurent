import test from "node:test";
import assert from "node:assert/strict";

function dynamicEnv(state, calls) {
  const make = key => ({
    async fetch() {
      calls[key] = (calls[key] || 0) + 1;
      const status = Number(state[key] ?? 503);
      return Response.json(
        status === 200 ? {ok:true, shard:key} : {error:"busy", shard:key},
        {status},
      );
    },
  });
  return {
    TEO_A:make("TEO_A"),
    TEO_B:make("TEO_B"),
    TEO_C:make("TEO_C"),
    TEO_D:make("TEO_D"),
  };
}

function planRequest() {
  return new Request("https://lacurent.com/api/optimization/home-lab/v4/plan", {
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body:"x=1",
  });
}

test("half-open router probes again instead of creating a same-isolate blackout", async () => {
  const moduleUrl = new URL("../teo-router/worker.mjs?recovery=half-open", import.meta.url);
  const router = (await import(moduleUrl.href)).default;
  const state = {
    TEO_A:503,
    TEO_B:503,
    TEO_C:503,
    TEO_D:503,
  };
  const calls = {};
  const env = dynamicEnv(state, calls);

  const first = await router.fetch(planRequest(), env);
  assert.equal(first.status, 503);
  assert.equal(Object.values(calls).reduce((sum,value)=>sum+value,0), 4);

  // Recover the earliest shard immediately. The old circuit breaker returned
  // another 503 without probing anything for up to 15s.
  state.TEO_A = 200;
  const beforeSecond = Object.values(calls).reduce((sum,value)=>sum+value,0);
  const second = await router.fetch(planRequest(), env);
  const afterSecond = Object.values(calls).reduce((sum,value)=>sum+value,0);

  assert.equal(second.status, 200);
  assert.equal(second.headers.get("x-lacurent-teo-shard"), "teo_a");
  assert.ok(afterSecond > beforeSecond);
  assert.ok(afterSecond <= beforeSecond + 4);
});

test("progressive cooldown starts short instead of imposing a fixed 15s penalty", async () => {
  const moduleUrl = new URL("../teo-router/worker.mjs?recovery=progressive", import.meta.url);
  const router = (await import(moduleUrl.href)).default;
  const state = {
    TEO_A:503,
    TEO_B:503,
    TEO_C:503,
    TEO_D:503,
  };
  const calls = {};
  const env = dynamicEnv(state, calls);

  const response = await router.fetch(planRequest(), env);
  assert.equal(response.status, 503);
  const retryAfter = Number(response.headers.get("retry-after") || 0);
  assert.ok(retryAfter >= 1);
  assert.ok(retryAfter <= 3, "first failure should not impose the old 15s blackout");
});


test("half-open recovery survives 250 repeated fail-all then recover cycles in one isolate", async () => {
  const moduleUrl = new URL("../teo-router/worker.mjs?recovery=stress-250", import.meta.url);
  const router = (await import(moduleUrl.href)).default;
  const state = {
    TEO_A:503,
    TEO_B:503,
    TEO_C:503,
    TEO_D:503,
  };
  const calls = {};
  const env = dynamicEnv(state, calls);

  for (let cycle=0; cycle<250; cycle+=1) {
    for (const key of Object.keys(state)) state[key] = 503;
    const failed = await router.fetch(planRequest(), env);
    assert.equal(failed.status, 503, "cycle " + cycle + " should observe the injected outage");

    const recoveredKey = ["TEO_A","TEO_B","TEO_C","TEO_D"][cycle % 4];
    state[recoveredKey] = 200;
    const recovered = await router.fetch(planRequest(), env);
    assert.equal(recovered.status, 200, "cycle " + cycle + " should recover without isolate blackout");
    assert.equal(
      recovered.headers.get("x-lacurent-teo-shard"),
      recoveredKey.toLowerCase(),
      "cycle " + cycle + " should reach the recovered shard",
    );
  }
});
