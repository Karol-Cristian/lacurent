const RETRY_AFTER_SECONDS = 60;

function commonHeaders(extra = {}) {
  return {
    "cache-control":"no-store, no-cache, must-revalidate, max-age=0",
    "pragma":"no-cache",
    "expires":"0",
    "retry-after":String(RETRY_AFTER_SECONDS),
    "x-robots-tag":"noindex, nofollow, noarchive",
    "x-lacurent-maintenance":"1",
    ...extra,
  };
}

function apiResponse(url) {
  return new Response(JSON.stringify({
    error:"Serviciul LaCurent este temporar în mentenanță.",
    maintenance:true,
    retryAfterSeconds:RETRY_AFTER_SECONDS,
    path:url.pathname,
  }), {
    status:503,
    headers:commonHeaders({
      "content-type":"application/json; charset=utf-8",
    }),
  });
}

function htmlResponse(method) {
  const body = method === "HEAD" ? null : `<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <meta http-equiv="refresh" content="30">
  <title>LaCurent — revenim imediat</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17202a;background:#f6f8fb}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
    main{width:min(620px,100%);background:#fff;border:1px solid #e4e9f0;border-radius:20px;padding:32px;box-shadow:0 18px 55px rgba(21,35,52,.08)}
    .mark{display:inline-grid;place-items:center;width:44px;height:44px;border:1px solid #dce5ef;border-radius:12px;font-weight:800;letter-spacing:-.04em;background:#fff;margin-bottom:24px}
    h1{font-size:clamp(1.7rem,5vw,2.4rem);line-height:1.08;margin:0 0 12px;letter-spacing:-.035em}
    p{font-size:1rem;line-height:1.6;color:#52606d;margin:0}
    .status{display:flex;gap:9px;align-items:center;margin-top:24px;padding-top:20px;border-top:1px solid #edf0f4;font-size:.9rem;color:#657382}
    .dot{width:9px;height:9px;border-radius:50%;background:#d7942f;box-shadow:0 0 0 5px rgba(215,148,47,.12)}
    small{display:block;margin-top:18px;color:#8a96a3;line-height:1.45}
  </style>
</head>
<body>
  <main>
    <div class="mark">LC</div>
    <h1>Actualizăm LaCurent.</h1>
    <p>Serviciul este temporar indisponibil cât finalizăm o actualizare. Datele deja salvate nu sunt afectate.</p>
    <div class="status"><span class="dot" aria-hidden="true"></span><span>Revenim în câteva momente. Pagina se reîncarcă automat.</span></div>
    <small>Dacă pagina nu revine automat, încearcă din nou peste aproximativ un minut.</small>
  </main>
</body>
</html>`;

  return new Response(body, {
    status:503,
    headers:commonHeaders({
      "content-type":"text/html; charset=utf-8",
      "content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "referrer-policy":"no-referrer",
    }),
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/__maintenance/health") {
      return new Response(JSON.stringify({
        status:"ready",
        mode:"maintenance",
        retryAfterSeconds:RETRY_AFTER_SECONDS,
      }), {
        status:200,
        headers:{
          "content-type":"application/json; charset=utf-8",
          "cache-control":"no-store",
          "x-lacurent-maintenance":"1",
        },
      });
    }

    if (url.pathname.startsWith("/api/")) return apiResponse(url);
    return htmlResponse(request.method);
  },
};
