import test from "node:test";
import assert from "node:assert/strict";

import {
  MAINTENANCE_SCRIPT,
  ROUTE_PLAN,
  validateCurrentRoutes,
} from "../../scripts/cloudflare-maintenance-mode.mjs";

const normalRows = [
  {id:"www", pattern:"www.lacurent.com/*", script:"lacurent-commercial-v2"},
  {id:"calc", pattern:"lacurent.com/api/home-lab-next/calculate*", script:"lacurent-home-lab-calc"},
  {id:"teo3", pattern:"lacurent.com/api/optimization/home-lab/v3/*", script:"lacurent-teo-router"},
  {id:"teo4", pattern:"lacurent.com/api/optimization/home-lab/v4/*", script:"lacurent-teo-router"},
];

test("maintenance route plan covers public site and all more-specific Home Lab routes", () => {
  assert.deepEqual(
    ROUTE_PLAN.map(item => item.pattern),
    [
      "lacurent.com/*",
      "www.lacurent.com/*",
      "lacurent.com/api/home-lab-next/calculate*",
      "lacurent.com/api/optimization/home-lab/v3/*",
      "lacurent.com/api/optimization/home-lab/v4/*",
    ],
  );
  assert.equal(ROUTE_PLAN[0].normalScript, null);
});

test("normal production route topology is safe to switch into maintenance", () => {
  const map = validateCurrentRoutes(normalRows, "enable");
  assert.equal(map.get("www.lacurent.com/*").script, "lacurent-commercial-v2");
  assert.equal(map.has("lacurent.com/*"), false);
});

test("maintenance enable fails closed if an expected production route is missing", () => {
  assert.throws(
    () => validateCurrentRoutes(normalRows.filter(row => row.id !== "calc"), "enable"),
    /required production route is missing/,
  );
});

test("maintenance enable fails closed on an unexpected route owner", () => {
  const rows = normalRows.map(row => (
    row.id === "teo4" ? {...row, script:"unexpected-worker"} : row
  ));
  assert.throws(
    () => validateCurrentRoutes(rows, "enable"),
    /unexpected script unexpected-worker/,
  );
});

test("maintenance topology is safe to restore", () => {
  const rows = ROUTE_PLAN.map((item, index) => ({
    id:String(index),
    pattern:item.pattern,
    script:MAINTENANCE_SCRIPT,
  }));
  const map = validateCurrentRoutes(rows, "disable");
  assert.equal(map.size, ROUTE_PLAN.length);
});

test("maintenance disable fails closed if a switched route disappeared", () => {
  const rows = ROUTE_PLAN.slice(1).map((item, index) => ({
    id:String(index),
    pattern:item.pattern,
    script:MAINTENANCE_SCRIPT,
  }));
  assert.throws(
    () => validateCurrentRoutes(rows, "disable"),
    /maintenance route is missing before disable/,
  );
});
