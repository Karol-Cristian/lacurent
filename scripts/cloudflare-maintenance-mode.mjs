const API_ROOT = "https://api.cloudflare.com/client/v4";
export const ZONE_NAME = "lacurent.com";
export const MAINTENANCE_SCRIPT = "lacurent-maintenance";

export const ROUTE_PLAN = Object.freeze([
  Object.freeze({
    pattern:"lacurent.com/*",
    normalScript:null,
    normalKind:"custom-domain-origin",
  }),
  Object.freeze({
    pattern:"www.lacurent.com/*",
    normalScript:"lacurent-commercial-v2",
    normalKind:"worker-route",
  }),
  Object.freeze({
    pattern:"lacurent.com/api/home-lab-next/calculate*",
    normalScript:"lacurent-home-lab-calc",
    normalKind:"worker-route",
  }),
  Object.freeze({
    pattern:"lacurent.com/api/optimization/home-lab/v3/*",
    normalScript:"lacurent-teo-router",
    normalKind:"worker-route",
  }),
  Object.freeze({
    pattern:"lacurent.com/api/optimization/home-lab/v4/*",
    normalScript:"lacurent-teo-router",
    normalKind:"worker-route",
  }),
]);

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function authHeaders() {
  return {
    "authorization":`Bearer ${requiredEnv("CLOUDFLARE_API_TOKEN")}`,
    "content-type":"application/json",
  };
}

async function api(path, {method="GET", body=null} = {}) {
  const response = await fetch(API_ROOT + path, {
    method,
    headers:authHeaders(),
    body:body == null ? undefined : JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(
      `Cloudflare API ${method} ${path} failed HTTP ${response.status}: `
      + JSON.stringify(payload?.errors || payload)
    );
  }
  return payload?.result;
}

async function zoneId() {
  const rows = await api("/zones?name=" + encodeURIComponent(ZONE_NAME) + "&status=active");
  if (!Array.isArray(rows) || rows.length !== 1 || !rows[0]?.id) {
    throw new Error(`Expected exactly one active Cloudflare zone for ${ZONE_NAME}`);
  }
  return String(rows[0].id);
}

function routeMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const pattern = String(row?.pattern || "");
    if (!ROUTE_PLAN.some(item => item.pattern === pattern)) continue;
    if (map.has(pattern)) throw new Error(`Duplicate Cloudflare route for ${pattern}`);
    map.set(pattern, row);
  }
  return map;
}

export function validateCurrentRoutes(rows, action) {
  const map = routeMap(rows);
  const problems = [];

  for (const spec of ROUTE_PLAN) {
    const route = map.get(spec.pattern);
    const script = route?.script == null ? null : String(route.script);

    if (action === "enable") {
      const allowed = new Set([spec.normalScript, MAINTENANCE_SCRIPT]);
      if (!route && spec.normalScript !== null) {
        problems.push(`${spec.pattern}: required production route is missing`);
      } else if (route && !allowed.has(script)) {
        problems.push(`${spec.pattern}: unexpected script ${script || "<none>"}`);
      }
    } else if (action === "disable") {
      if (!route) {
        problems.push(`${spec.pattern}: maintenance route is missing before disable`);
      } else if (script !== MAINTENANCE_SCRIPT && script !== spec.normalScript) {
        problems.push(`${spec.pattern}: unexpected script ${script || "<none>"}`);
      }
    }
  }

  if (problems.length) {
    throw new Error(
      "Maintenance route safety gate failed before mutation:\n- " + problems.join("\n- ")
    );
  }
  return map;
}

async function listRoutes(id) {
  const rows = await api(`/zones/${id}/workers/routes`);
  if (!Array.isArray(rows)) throw new Error("Cloudflare route list was not an array");
  return rows;
}

async function replaceRoute(id, routeId, pattern, script) {
  return api(`/zones/${id}/workers/routes/${routeId}`, {
    method:"PUT",
    body:{pattern, script},
  });
}

async function createRoute(id, pattern, script) {
  return api(`/zones/${id}/workers/routes`, {
    method:"POST",
    body:{pattern, script},
  });
}

async function deleteRoute(id, routeId) {
  return api(`/zones/${id}/workers/routes/${routeId}`, {method:"DELETE"});
}

async function enable(id, rows) {
  const map = validateCurrentRoutes(rows, "enable");
  for (const spec of ROUTE_PLAN) {
    const existing = map.get(spec.pattern);
    if (existing?.script === MAINTENANCE_SCRIPT) continue;
    if (existing) {
      await replaceRoute(id, existing.id, spec.pattern, MAINTENANCE_SCRIPT);
    } else {
      await createRoute(id, spec.pattern, MAINTENANCE_SCRIPT);
    }
  }
}

async function disable(id, rows) {
  const map = validateCurrentRoutes(rows, "disable");
  for (const spec of ROUTE_PLAN) {
    const existing = map.get(spec.pattern);
    if (!existing) throw new Error(`Route disappeared during disable: ${spec.pattern}`);
    if (spec.normalScript === null) {
      if (existing.script === MAINTENANCE_SCRIPT) {
        await deleteRoute(id, existing.id);
      }
      continue;
    }
    if (existing.script !== spec.normalScript) {
      await replaceRoute(id, existing.id, spec.pattern, spec.normalScript);
    }
  }
}

function publicState(rows) {
  const map = routeMap(rows);
  return ROUTE_PLAN.map(spec => ({
    pattern:spec.pattern,
    expectedNormalScript:spec.normalScript,
    currentScript:map.get(spec.pattern)?.script ?? null,
    maintenance:map.get(spec.pattern)?.script === MAINTENANCE_SCRIPT,
  }));
}

async function main() {
  const action = String(process.argv[2] || "status").trim().toLowerCase();
  if (!["status","enable","disable"].includes(action)) {
    throw new Error("Usage: node scripts/cloudflare-maintenance-mode.mjs <status|enable|disable>");
  }
  if (action !== "status" && process.env.MAINTENANCE_CONFIRM !== ZONE_NAME) {
    throw new Error(
      `Refusing ${action}: set MAINTENANCE_CONFIRM=${ZONE_NAME} explicitly.`
    );
  }

  const id = await zoneId();
  let rows = await listRoutes(id);

  if (action === "enable") {
    await enable(id, rows);
  } else if (action === "disable") {
    await disable(id, rows);
  }

  rows = await listRoutes(id);
  const state = publicState(rows);
  const allMaintenance = state.every(item => item.maintenance);
  const allNormal = state.every(item => (
    item.expectedNormalScript === null
      ? item.currentScript === null
      : item.currentScript === item.expectedNormalScript
  ));

  if (action === "enable" && !allMaintenance) {
    throw new Error("Maintenance enable verification failed: " + JSON.stringify(state));
  }
  if (action === "disable" && !allNormal) {
    throw new Error("Maintenance disable verification failed: " + JSON.stringify(state));
  }

  console.log(JSON.stringify({
    zone:ZONE_NAME,
    action,
    allMaintenance,
    allNormal,
    routes:state,
  }, null, 2));
}

const invokedDirectly = process.argv[1]
  && new URL(import.meta.url).pathname === new URL("file://" + process.argv[1]).pathname;

if (invokedDirectly) {
  main().catch(error => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
