import test from "node:test";
import assert from "node:assert/strict";

import worker from "../maintenance-worker/worker.mjs";

test("maintenance browser response is a controlled 503 with no caching", async () => {
  const response = await worker.fetch(new Request("https://lacurent.com/home-lab-next"));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal(response.headers.get("cache-control"), "no-store, no-cache, must-revalidate, max-age=0");
  assert.equal(response.headers.get("x-lacurent-maintenance"), "1");
  assert.match(response.headers.get("content-type") || "", /text\/html/);
  const html = await response.text();
  assert.match(html, /Actualizăm LaCurent/);
  assert.match(html, /reîncarcă automat/);
  assert.match(html, /http-equiv="refresh" content="30"/);
});

test("maintenance API response stays machine-readable", async () => {
  const response = await worker.fetch(new Request("https://lacurent.com/api/home-lab-next/calculate", {
    method:"POST",
  }));
  assert.equal(response.status, 503);
  assert.match(response.headers.get("content-type") || "", /application\/json/);
  const body = await response.json();
  assert.equal(body.maintenance, true);
  assert.equal(body.retryAfterSeconds, 60);
  assert.equal(body.path, "/api/home-lab-next/calculate");
});

test("maintenance readiness endpoint is independent from public 503 status", async () => {
  const response = await worker.fetch(new Request("https://preview.example/__maintenance/health"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    status:"ready",
    mode:"maintenance",
    retryAfterSeconds:60,
  });
});

test("HEAD requests do not return a body", async () => {
  const response = await worker.fetch(new Request("https://lacurent.com/", {method:"HEAD"}));
  assert.equal(response.status, 503);
  assert.equal(await response.text(), "");
});
