const SHARDS = ["TEO_A", "TEO_B", "TEO_C", "TEO_D"];
const COOLDOWN_MS = 15000;
let cursor = 0;
const disabledUntil = new Map();

function isTeoPath(pathname) {
  return pathname.startsWith("/api/optimization/home-lab/v3/")
    || pathname.startsWith("/api/optimization/home-lab/v4/");
}

async function requestBodyBytes(request) {
  if (request.method === "GET" || request.method === "HEAD") return null;
  return await request.arrayBuffer();
}

function requestForShard(request, bodyBytes) {
  const init = {
    method:request.method,
    headers:new Headers(request.headers),
    redirect:"manual",
  };
  if (bodyBytes !== null) init.body = bodyBytes.slice(0);
  return new Request(request.url, init);
}

function responseWithRouteHeaders(response, shard) {
  const headers = new Headers(response.headers);
  headers.set("x-lacurent-teo", "private-teo-sharded");
  headers.set("x-lacurent-teo-shard", shard.toLowerCase());
  headers.set("cache-control", "no-store");
  return new Response(response.body, {
    status:response.status,
    statusText:response.statusText,
    headers,
  });
}

async function callShard(env, key, request, bodyBytes) {
  const binding = env[key];
  if (!binding) throw new Error("missing_" + key);
  return await binding.fetch(requestForShard(request, bodyBytes));
}

async function routeTeo(request, env) {
  const bodyBytes = await requestBodyBytes(request);
  const now = Date.now();
  const start = cursor++ % SHARDS.length;
  const attempts = [];
  let lastError = null;

  for (let offset=0; offset<SHARDS.length; offset+=1) {
    const key = SHARDS[(start + offset) % SHARDS.length];
    if ((disabledUntil.get(key) || 0) > now) continue;
    try {
      const response = await callShard(env, key, request, bodyBytes);
      attempts.push(key + ":" + response.status);
      if (response.status >= 500) {
        disabledUntil.set(key, Date.now() + COOLDOWN_MS);
        lastError = new Error("upstream_http_" + response.status);
        continue;
      }
      disabledUntil.delete(key);
      return responseWithRouteHeaders(response, key);
    } catch (error) {
      attempts.push(key + ":exception");
      lastError = error;
      disabledUntil.set(key, Date.now() + COOLDOWN_MS);
    }
  }

  // One short second pass is useful when every isolate was in a local circuit
  // breaker window. Never wait through the full cooldown in a user request.
  const earliest = [...SHARDS].sort(
    (a,b) => (disabledUntil.get(a) || 0) - (disabledUntil.get(b) || 0),
  )[0];
  const waitMs = Math.max(0, (disabledUntil.get(earliest) || 0) - Date.now());
  if (waitMs > 0 && waitMs <= 1500) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
    try {
      const response = await callShard(env, earliest, request, bodyBytes);
      attempts.push(earliest + ":" + response.status);
      if (response.status < 500) {
        disabledUntil.delete(earliest);
        return responseWithRouteHeaders(response, earliest);
      }
      lastError = new Error("upstream_http_" + response.status);
    } catch (error) {
      attempts.push(earliest + ":exception");
      lastError = error;
    }
  }

  return Response.json(
    {
      error:"TEO este temporar indisponibil.",
      stage:"private-teo-router",
      attempts,
      errorType:lastError?.name || "Error",
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return Response.json({
        status:"ok",
        service:"lacurent-teo-router",
        shards:SHARDS.length,
      });
    }
    if (!isTeoPath(url.pathname)) {
      return Response.json({error:"Not found"}, {status:404});
    }
    return routeTeo(request, env);
  },
};
