const SHARDS = ["TEO_A", "TEO_B", "TEO_C", "TEO_D"];
const SHARD_COOLDOWN_BASE_MS = 1500;
const SHARD_COOLDOWN_MAX_MS = 15000;
const FLOW_COOLDOWN_MS = 1800;
const FLOW_LEASE_MS = 30000;
const FLOW_MAX_VERIFICATIONS = 3;
const FLOW_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS teo_verification_runs (
  run_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ready',
  planned_verifications INTEGER NOT NULL DEFAULT 1,
  verified_count INTEGER NOT NULL DEFAULT 0,
  next_allowed_at_ms INTEGER NOT NULL DEFAULT 0,
  in_flight INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  lease_expires_at_ms INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

let cursor = 0;
const disabledUntil = new Map();
const consecutiveFailures = new Map();
let flowSchemaPromise = null;

function shardCooldownMs(key) {
  const failures = Math.max(1, Number(consecutiveFailures.get(key) || 1));
  return Math.min(
    SHARD_COOLDOWN_MAX_MS,
    SHARD_COOLDOWN_BASE_MS * (2 ** Math.min(failures - 1, 4)),
  );
}

function markShardFailure(key) {
  consecutiveFailures.set(key, Number(consecutiveFailures.get(key) || 0) + 1);
  const cooldownMs = shardCooldownMs(key);
  disabledUntil.set(key, Date.now() + cooldownMs);
  return cooldownMs;
}

function markShardSuccess(key) {
  consecutiveFailures.delete(key);
  disabledUntil.delete(key);
}

function isTeoPath(pathname) {
  return pathname.startsWith("/api/optimization/home-lab/v3/")
    || pathname.startsWith("/api/optimization/home-lab/v4/");
}

function isVerifyPath(request, pathname) {
  return request.method === "POST"
    && pathname === "/api/optimization/home-lab/v3/verify";
}

function flowRunIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/optimization\/home-lab\/v4\/flow\/([^/]+)(?:\/finish)?$/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function requestBodyBytes(request) {
  if (request.method === "GET" || request.method === "HEAD") return null;
  return await request.arrayBuffer();
}

function requestForShard(request, bodyBytes, extraHeaders = {}) {
  const headers = new Headers(request.headers);
  for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
  const init = {
    method:request.method,
    headers,
    redirect:"manual",
  };
  if (bodyBytes !== null) init.body = bodyBytes.slice(0);
  return new Request(request.url, init);
}

function routedHeaders(sourceHeaders, shard) {
  const headers = new Headers(sourceHeaders);
  headers.set("x-lacurent-teo", "private-teo-sharded");
  headers.set("x-lacurent-teo-shard", shard.toLowerCase());
  headers.set("cache-control", "no-store");
  return headers;
}

function responseWithRouteHeaders(response, shard) {
  return new Response(response.body, {
    status:response.status,
    statusText:response.statusText,
    headers:routedHeaders(response.headers, shard),
  });
}

async function jsonResponseWithRouteHeaders(response, shard, extra = {}) {
  const body = await response.json().catch(() => ({}));
  return Response.json(
    {...body, ...extra},
    {
      status:response.status,
      headers:routedHeaders(response.headers, shard),
    },
  );
}

async function callShard(env, key, request, bodyBytes, extraHeaders = {}) {
  const binding = env[key];
  if (!binding) throw new Error("missing_" + key);
  return await binding.fetch(requestForShard(request, bodyBytes, extraHeaders));
}

async function ensureFlowSchema(env) {
  if (!env.DB) throw new Error("missing_DB");
  if (!flowSchemaPromise) {
    flowSchemaPromise = (async () => {
      await env.DB.prepare(FLOW_CREATE_SQL).run();
      await env.DB.prepare(
        "CREATE INDEX IF NOT EXISTS teo_verification_runs_status_idx " +
        "ON teo_verification_runs(status, next_allowed_at_ms)"
      ).run();
    })().catch(error => {
      flowSchemaPromise = null;
      throw error;
    });
  }
  await flowSchemaPromise;
}

async function flowRow(env, runId) {
  await ensureFlowSchema(env);
  const result = await env.DB.prepare(
    "SELECT run_id, status, planned_verifications, verified_count, " +
    "next_allowed_at_ms, in_flight, lease_token, lease_expires_at_ms, updated_at " +
    "FROM teo_verification_runs WHERE run_id = ? LIMIT 1"
  ).bind(runId).all();
  return result.results?.[0] || null;
}

function publicFlowState(row, storage = "router-d1") {
  const now = Date.now();
  if (!row) {
    return {
      status:"ready",
      ready:true,
      verifiedCount:0,
      plannedVerifications:FLOW_MAX_VERIFICATIONS,
      retryAfterMs:0,
      storage,
    };
  }
  const verifiedCount = Number(row.verified_count || 0);
  const planned = Math.max(1, Number(row.planned_verifications || 1));
  const nextAllowed = Number(row.next_allowed_at_ms || 0);
  const inFlight = Boolean(Number(row.in_flight || 0));
  const leaseExpires = Number(row.lease_expires_at_ms || 0);
  let status = "ready";
  let ready = true;
  let retryAfterMs = 0;
  if (verifiedCount >= planned || String(row.status || "") === "complete") {
    status = "complete";
    ready = false;
  } else if (inFlight && leaseExpires > now) {
    status = "running";
    ready = false;
    retryAfterMs = Math.max(100, leaseExpires - now);
  } else if (nextAllowed > now) {
    status = "cooldown";
    ready = false;
    retryAfterMs = nextAllowed - now;
  }
  return {
    runId:String(row.run_id || ""),
    status,
    ready,
    verifiedCount,
    plannedVerifications:planned,
    retryAfterMs:Math.round(retryAfterMs),
    storage,
  };
}

async function startFlow(env, runId, plannedRaw) {
  await ensureFlowSchema(env);
  const planned = Math.max(1, Math.min(Number(plannedRaw || FLOW_MAX_VERIFICATIONS), FLOW_MAX_VERIFICATIONS));
  await env.DB.prepare(
    "DELETE FROM teo_verification_runs WHERE updated_at < datetime('now', '-1 day')"
  ).run();
  await env.DB.prepare(`
    INSERT INTO teo_verification_runs(
      run_id, status, planned_verifications, verified_count,
      next_allowed_at_ms, in_flight, lease_token,
      lease_expires_at_ms, updated_at
    )
    VALUES (?, 'ready', ?, 0, 0, 0, NULL, 0, CURRENT_TIMESTAMP)
    ON CONFLICT(run_id) DO UPDATE SET
      status = 'ready',
      planned_verifications = excluded.planned_verifications,
      verified_count = 0,
      next_allowed_at_ms = 0,
      in_flight = 0,
      lease_token = NULL,
      lease_expires_at_ms = 0,
      updated_at = CURRENT_TIMESTAMP
  `).bind(runId, planned).run();
  return publicFlowState(await flowRow(env, runId));
}

async function acquireFlow(env, runId) {
  let row = await flowRow(env, runId);
  if (!row) {
    await startFlow(env, runId, FLOW_MAX_VERIFICATIONS);
    row = await flowRow(env, runId);
  }
  const state = publicFlowState(row);
  if (!state.ready) return {acquired:false, leaseToken:null, state};

  const now = Date.now();
  const leaseToken = `${runId}:${crypto.randomUUID()}`;
  await env.DB.prepare(`
    UPDATE teo_verification_runs
    SET status='running', in_flight=1, lease_token=?,
        lease_expires_at_ms=?, updated_at=CURRENT_TIMESTAMP
    WHERE run_id=?
      AND verified_count < planned_verifications
      AND next_allowed_at_ms <= ?
      AND (in_flight=0 OR lease_expires_at_ms <= ?)
  `).bind(leaseToken, now + FLOW_LEASE_MS, runId, now, now).run();
  const acquiredRow = await flowRow(env, runId);
  const acquired = String(acquiredRow?.lease_token || "") === leaseToken;
  return {
    acquired,
    leaseToken:acquired ? leaseToken : null,
    state:publicFlowState(acquiredRow),
  };
}

async function completeFlow(env, runId, leaseToken) {
  const now = Date.now();
  await env.DB.prepare(`
    UPDATE teo_verification_runs
    SET verified_count=verified_count+1,
        status=CASE WHEN verified_count+1 >= planned_verifications
                    THEN 'complete' ELSE 'cooldown' END,
        next_allowed_at_ms=?,
        in_flight=0,
        lease_token=NULL,
        lease_expires_at_ms=0,
        updated_at=CURRENT_TIMESTAMP
    WHERE run_id=? AND lease_token=?
  `).bind(now + FLOW_COOLDOWN_MS, runId, leaseToken).run();
  return publicFlowState(await flowRow(env, runId));
}

async function releaseFlow(env, runId, leaseToken) {
  if (!leaseToken) return;
  await env.DB.prepare(`
    UPDATE teo_verification_runs
    SET status='cooldown',
        next_allowed_at_ms=?,
        in_flight=0,
        lease_token=NULL,
        lease_expires_at_ms=0,
        updated_at=CURRENT_TIMESTAMP
    WHERE run_id=? AND lease_token=?
  `).bind(Date.now() + FLOW_COOLDOWN_MS, runId, leaseToken).run();
}

async function finishFlow(env, runId) {
  await ensureFlowSchema(env);
  await env.DB.prepare(`
    UPDATE teo_verification_runs
    SET status='complete',
        in_flight=0,
        lease_token=NULL,
        lease_expires_at_ms=0,
        updated_at=CURRENT_TIMESTAMP
    WHERE run_id=?
  `).bind(runId).run();
  return publicFlowState(await flowRow(env, runId));
}

async function handleFlowEndpoint(request, env, url) {
  if (request.method === "POST" && url.pathname === "/api/optimization/home-lab/v4/flow/start") {
    const raw = await request.json();
    const runId = String(raw?.runId || "").trim();
    if (!runId || runId.length > 160) return Response.json({error:"Run ID TEO invalid.",stage:"teo-flow-start"},{status:422});
    return Response.json(
      await startFlow(env, runId, raw?.plannedVerifications),
      {headers:{"cache-control":"no-store","x-lacurent-teo":"router-flow-d1"}},
    );
  }

  const runId = flowRunIdFromPath(url.pathname);
  if (!runId || runId.length > 160) return null;

  if (request.method === "GET" && !url.pathname.endsWith("/finish")) {
    return Response.json(
      publicFlowState(await flowRow(env, runId)),
      {headers:{"cache-control":"no-store","x-lacurent-teo":"router-flow-d1"}},
    );
  }
  if (request.method === "POST" && url.pathname.endsWith("/finish")) {
    return Response.json(
      await finishFlow(env, runId),
      {headers:{"cache-control":"no-store","x-lacurent-teo":"router-flow-d1"}},
    );
  }
  return null;
}

async function routeAcrossShards(request, env, bodyBytes, extraHeaders = {}) {
  const now = Date.now();
  const start = cursor++ % SHARDS.length;
  const attempts = [];
  let lastError = null;
  let lastUpstream = null;

  const ordered = Array.from(
    {length:SHARDS.length},
    (_, offset) => SHARDS[(start + offset) % SHARDS.length],
  );
  const ready = ordered.filter(key => (disabledUntil.get(key) || 0) <= now);

  // Half-open recovery: if this router isolate has put every shard in
  // cooldown, do not create a client-specific blackout. Probe the disabled
  // shards in expiry order until one answers successfully. This path runs
  // only when there is no normally-ready shard.
  const candidates = ready.length
    ? ready
    : [...ordered].sort(
        (a,b) => (disabledUntil.get(a) || 0) - (disabledUntil.get(b) || 0)
      );

  for (const key of candidates) {
    try {
      const response = await callShard(env, key, request, bodyBytes, extraHeaders);
      attempts.push(key + ":" + response.status);
      if (response.status >= 500) {
        let upstreamBody = {};
        try {
          upstreamBody = await response.clone().json();
        } catch (_) {}
        lastUpstream = {
          shard:key,
          status:response.status,
          stage:String(upstreamBody?.stage || ""),
          errorType:String(upstreamBody?.errorType || ""),
          error:String(upstreamBody?.error || "").slice(0, 240),
        };
        markShardFailure(key);
        lastError = new Error("upstream_http_" + response.status);
        continue;
      }
      markShardSuccess(key);
      return {response, shard:key, attempts};
    } catch (error) {
      attempts.push(key + ":exception");
      lastError = error;
      markShardFailure(key);
    }
  }

  const earliest = [...SHARDS].sort(
    (a,b) => (disabledUntil.get(a) || 0) - (disabledUntil.get(b) || 0)
  )[0];
  const retryAfterMs = Math.max(500, (disabledUntil.get(earliest) || 0) - Date.now());
  return {response:null, shard:null, attempts, lastError, lastUpstream, retryAfterMs};
}

async function routeVerify(request, env) {
  const bodyBytes = await requestBodyBytes(request);
  let payload = {};
  try {
    payload = JSON.parse(new TextDecoder().decode(bodyBytes || new ArrayBuffer(0)));
  } catch (_) {
    return Response.json({error:"Payload VERIFY invalid.",stage:"verify-router"},{status:422});
  }
  const runId = String(payload?.runId || payload?.form?._optimizer_run_id || "").trim();
  let leaseToken = null;

  if (runId) {
    let gate;
    try {
      gate = await acquireFlow(env, runId);
    } catch (error) {
      return Response.json(
        {
          error:"TEO router flow acquire indisponibil.",
          stage:"verify-router-acquire-flow",
          errorType:error?.name || "Error",
          diagnosticMessage:String(error?.message || error || "").slice(0, 240),
        },
        {
          status:503,
          headers:{
            "cache-control":"no-store",
            "retry-after":"2",
            "x-lacurent-teo":"private-teo-sharded",
          },
        },
      );
    }
    if (!gate.acquired) {
      const retryAfterMs = Number(gate.state?.retryAfterMs || FLOW_COOLDOWN_MS);
      return Response.json(
        {
          error:"TEO Worker Flow nu este încă pregătit pentru următorul VERIFY.",
          optimizerVersion:"v4-adaptive",
          stage:"verify-gate",
          workerFlow:gate.state,
        },
        {
          status:409,
          headers:{
            "cache-control":"no-store",
            "retry-after":String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
            "x-lacurent-teo":"router-flow-d1",
          },
        },
      );
    }
    leaseToken = gate.leaseToken;
  }

  const routed = await routeAcrossShards(
    request,
    env,
    bodyBytes,
    {"x-lacurent-flow-gated":"1"},
  );

  if (!routed.response) {
    if (runId && leaseToken) await releaseFlow(env, runId, leaseToken);
    return Response.json(
      {
        error:"TEO este temporar indisponibil.",
        stage:"private-teo-router",
        attempts:routed.attempts,
        errorType:routed.lastError?.name || "Error",
        upstream:routed.lastUpstream || null,
      },
      {
        status:503,
        headers:{
          "cache-control":"no-store",
          "retry-after":String(Math.max(2, Math.ceil(routed.retryAfterMs / 1000))),
          "x-lacurent-teo":"private-teo-sharded",
        },
      },
    );
  }

  if (routed.response.status === 200 && runId && leaseToken) {
    let state;
    try {
      state = await completeFlow(env, runId, leaseToken);
    } catch (error) {
      return Response.json(
        {
          error:"TEO router flow complete indisponibil.",
          stage:"verify-router-complete-flow",
          errorType:error?.name || "Error",
          shard:routed.shard?.toLowerCase() || "",
        },
        {
          status:503,
          headers:{
            "cache-control":"no-store",
            "retry-after":"2",
            "x-lacurent-teo":"private-teo-sharded",
            "x-lacurent-teo-shard":routed.shard?.toLowerCase() || "",
          },
        },
      );
    }
    return await jsonResponseWithRouteHeaders(
      routed.response,
      routed.shard,
      {workerFlow:state},
    );
  }

  if (runId && leaseToken) await releaseFlow(env, runId, leaseToken);
  return responseWithRouteHeaders(routed.response, routed.shard);
}

async function routeTeo(request, env) {
  const url = new URL(request.url);
  const flowResponse = await handleFlowEndpoint(request, env, url);
  if (flowResponse) return flowResponse;
  if (isVerifyPath(request, url.pathname)) return routeVerify(request, env);

  const bodyBytes = await requestBodyBytes(request);
  const routed = await routeAcrossShards(request, env, bodyBytes);
  if (routed.response) return responseWithRouteHeaders(routed.response, routed.shard);

  return Response.json(
    {
      error:"TEO este temporar indisponibil.",
      stage:"private-teo-router",
      attempts:routed.attempts,
      errorType:routed.lastError?.name || "Error",
    },
    {
      status:503,
      headers:{
        "cache-control":"no-store",
        "retry-after":String(Math.max(2, Math.ceil(routed.retryAfterMs / 1000))),
        "x-lacurent-teo":"private-teo-sharded",
      },
    },
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        status:"ok",
        service:"lacurent-teo-router",
        shards:SHARDS.length,
        flow:"router-d1",
      });
    }
    if (!isTeoPath(url.pathname)) {
      return Response.json({error:"Not found"}, {status:404});
    }
    try {
      return await routeTeo(request, env);
    } catch (error) {
      return Response.json(
        {
          error:"TEO router indisponibil.",
          stage:"private-teo-router-control",
          errorType:error?.name || "Error",
        },
        {
          status:503,
          headers:{
            "cache-control":"no-store",
            "retry-after":"2",
            "x-lacurent-teo":"private-teo-sharded",
          },
        },
      );
    }
  },
};
