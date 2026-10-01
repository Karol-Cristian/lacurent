import test from "node:test";
import assert from "node:assert/strict";

import edge, {isCalcPath, isTeoPath} from "../staging-edge/worker.mjs";

function makeBinding(name, calls) {
  return {
    async fetch(request) {
      const req = request instanceof Request ? request : new Request(request);
      calls.push({name, url:req.url, method:req.method});
      if (new URL(req.url).pathname === "/health") {
        return Response.json({status:"ok", service:name});
      }
      return new Response(name, {status:200, headers:{"x-staging-target":name}});
    },
  };
}

test("route classifier matches the production path split", () => {
  assert.equal(isCalcPath("/api/home-lab-next/calculate"), true);
  assert.equal(isCalcPath("/api/home-lab-next/calculate/extra"), false);
  assert.equal(isTeoPath("/api/optimization/home-lab/v3/plan"), true);
  assert.equal(isTeoPath("/api/optimization/home-lab/v4/flow/start"), true);
  assert.equal(isTeoPath("/home-lab-editorial"), false);
});

test("UAT edge sends each request to the intended staging service", async () => {
  const calls = [];
  const env = {
    PUBLIC_APP:makeBinding("public-app", calls),
    CALC_GATEWAY:makeBinding("calc-gateway", calls),
    TEO_ROUTER:makeBinding("teo-router", calls),
  };

  let response = await edge.fetch(new Request("https://uat.test/home-lab-editorial"), env);
  assert.equal(response.headers.get("x-staging-target"), "public-app");

  response = await edge.fetch(new Request("https://uat.test/api/home-lab-next/calculate", {method:"POST"}), env);
  assert.equal(response.headers.get("x-staging-target"), "calc-gateway");

  response = await edge.fetch(new Request("https://uat.test/api/optimization/home-lab/v4/plan", {method:"POST"}), env);
  assert.equal(response.headers.get("x-staging-target"), "teo-router");
});

test("UAT health is green when all three staging services are healthy", async () => {
  const calls = [];
  const env = {
    PUBLIC_APP:makeBinding("public-app", calls),
    CALC_GATEWAY:makeBinding("calc-gateway", calls),
    TEO_ROUTER:makeBinding("teo-router", calls),
  };
  const response = await edge.fetch(new Request("https://uat.test/__staging/health"), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  assert.equal(body.checks.length, 3);
});
