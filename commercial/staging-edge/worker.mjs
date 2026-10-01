function isCalcPath(pathname) {
  return pathname === "/api/home-lab-next/calculate";
}

function isTeoPath(pathname) {
  return pathname.startsWith("/api/optimization/home-lab/v3/")
    || pathname.startsWith("/api/optimization/home-lab/v4/");
}

async function serviceHealth(binding, label) {
  try {
    const response = await binding.fetch("https://staging.internal/health");
    const body = await response.json().catch(() => ({}));
    return {label, ok:response.status === 200, status:response.status, body};
  } catch (error) {
    return {label, ok:false, status:0, error:String(error?.message || error)};
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/__staging/health") {
      const checks = await Promise.all([
        serviceHealth(env.PUBLIC_APP, "public-app"),
        serviceHealth(env.CALC_GATEWAY, "calc-gateway"),
        serviceHealth(env.TEO_ROUTER, "teo-router"),
      ]);
      return Response.json({
        status: checks.every(item => item.ok) ? "ok" : "degraded",
        environment:"uat",
        checks,
      }, {
        status: checks.every(item => item.ok) ? 200 : 503,
        headers:{"cache-control":"no-store"},
      });
    }

    if (isCalcPath(url.pathname)) {
      return env.CALC_GATEWAY.fetch(request);
    }
    if (isTeoPath(url.pathname)) {
      return env.TEO_ROUTER.fetch(request);
    }
    return env.PUBLIC_APP.fetch(request);
  },
};

export {isCalcPath, isTeoPath};
