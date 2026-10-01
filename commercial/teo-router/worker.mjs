const SHARDS = ["TEO_A", "TEO_B", "TEO_C", "TEO_D"];
const SHARD_COOLDOWN_BASE_MS = 1500;
const SHARD_COOLDOWN_MAX_MS = 15000;
const FLOW_COOLDOWN_MS = 1800;
const FLOW_MAX_VERIFICATIONS = 3;
const FLOW_STORAGE = "router-stateless";

let cursor = 0;
const disabledUntil = new Map();
const consecutiveFailures = new Map();

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

function publicFlowState(runId, {
  status="ready",
  plannedVerifications=FLOW_MAX_VERIFICATIONS,
} = {}) {
  const planned = Math.max(
    1,
    Math.min(Number(plannedVerifications || FLOW_MAX_VERIFICATIONS), FLOW_MAX_VERIFICATIONS),
  );
  return {
    runId:String(runId || ""),
    status,
    ready:status === "ready",
    verifiedCount:null,
    plannedVerifications:planned,
    retryAfterMs:status === "ready" ? 0 : FLOW_COOLDOWN_MS,
    storage:FLOW_STORAGE,
  };
}

async function startFlow(_env, runId, plannedRaw) {
  return publicFlowState(runId, {plannedVerifications:plannedRaw});
}

async function finishFlow(_env, runId) {
  return publicFlowState(runId, {status:"complete"});
}

async function handleFlowEndpoint(request, env, url) {
  if (request.method === "POST" && url.pathname === "/api/optimization/home-lab/v4/flow/start") {
    const raw = await request.json();
    const runId = String(raw?.runId || "").trim();
    if (!runId || runId.length > 160) {
      return Response.json({error:"Run ID TEO invalid.",stage:"teo-flow-start"},{status:422});
    }
    return Response.json(
      await startFlow(env, runId, raw?.plannedVerifications),
      {headers:{"cache-control":"no-store","x-lacurent-teo":"router-flow-stateless"}},
    );
  }

  const runId = flowRunIdFromPath(url.pathname);
  if (!runId || runId.length > 160) return null;

  if (request.method === "GET" && !url.pathname.endsWith("/finish")) {
    return Response.json(
      publicFlowState(runId),
      {headers:{"cache-control":"no-store","x-lacurent-teo":"router-flow-stateless"}},
    );
  }
  if (request.method === "POST" && url.pathname.endsWith("/finish")) {
    return Response.json(
      await finishFlow(env, runId),
      {headers:{"cache-control":"no-store","x-lacurent-teo":"router-flow-stateless"}},
    );
  }
  return null;
}

async function routeAcrossShards(request, env, bodyBytes, extraHeaders = {}) {
  const now = Date.now();
  const start = cursor++ % SHARDS.length;
  const attempts = [];
  let lastError = null;

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
  return {response:null, shard:null, attempts, lastError, retryAfterMs};
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
  if (runId.length > 160) {
    return Response.json({error:"Run ID TEO invalid.",stage:"verify-router"},{status:422});
  }

  const routed = await routeAcrossShards(
    request,
    env,
    bodyBytes,
    {"x-lacurent-flow-gated":"1"},
  );

  if (!routed.response) {
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

  if (routed.response.status === 200) {
    return await jsonResponseWithRouteHeaders(
      routed.response,
      routed.shard,
      {workerFlow:publicFlowState(runId)},
    );
  }
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
        flow:FLOW_STORAGE,
      });
    }
    if (!isTeoPath(url.pathname)) {
      return Response.json({error:"Not found"}, {status:404});
    }
    try {
      return await routeTeo(request, env);
    } catch (error) {
      console.error(
        "[LaCurent TEO Router] control exception",
        JSON.stringify({
          method:request.method,
          path:url.pathname,
          name:error?.name || "Error",
          message:String(error?.message || error).slice(0,240),
        }),
      );
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
