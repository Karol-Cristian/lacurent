import test from "node:test";
import assert from "node:assert/strict";

import gateway from "../calc-gateway/worker.mjs";

function request(body = "heated_floor_area_m2=120") {
  return new Request("https://staging.example/api/home-lab-next/calculate", {
    method:"POST",
    headers:{"content-type":"application/x-www-form-urlencoded"},
    body,
  });
}

test("RBPE calculation gateway returns controlled 503 when private router throws", async () => {
  const env = {
    RBPE_ROUTER:{
      async calculate_home_lab_form_api_json() {
        throw new Error("injected-private-router-outage");
      },
    },
  };

  const response = await gateway.fetch(request(), env);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "1");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const payload = await response.json();
  assert.equal(payload.error, "Serviciul de calcul este temporar indisponibil.");
  assert.equal(payload.errorType, "Error");
});

test("RBPE calculation gateway recovers immediately on the next healthy request", async () => {
  let calls = 0;
  const env = {
    RBPE_ROUTER:{
      async calculate_home_lab_form_api_json(encoded) {
        calls += 1;
        if (calls === 1) throw new Error("transient");
        assert.match(encoded, /heated_floor_area_m2=120/);
        return JSON.stringify({energy_class:"A", final_energy_kwh:4321});
      },
    },
  };

  const failed = await gateway.fetch(request(), env);
  assert.equal(failed.status, 503);

  const recovered = await gateway.fetch(request(), env);
  assert.equal(recovered.status, 200);
  assert.equal(recovered.headers.get("x-lacurent-calc"), "private-rbpe-sharded");
  assert.deepEqual(await recovered.json(), {energy_class:"A", final_energy_kwh:4321});
});

test("RBPE public gateway has no sticky failure state across 250 outage/recovery cycles", async () => {
  let available = false;
  const env = {
    RBPE_ROUTER:{
      async calculate_home_lab_form_api_json() {
        if (!available) throw new Error("injected");
        return JSON.stringify({energy_class:"B"});
      },
    },
  };

  for (let cycle=0; cycle<250; cycle+=1) {
    available = false;
    const failed = await gateway.fetch(request("cycle="+cycle), env);
    assert.equal(failed.status, 503, "cycle "+cycle+" injected failure");

    available = true;
    const recovered = await gateway.fetch(request("cycle="+cycle), env);
    assert.equal(recovered.status, 200, "cycle "+cycle+" immediate recovery");
    assert.equal(recovered.headers.get("x-lacurent-calc"), "private-rbpe-sharded");
  }
});
