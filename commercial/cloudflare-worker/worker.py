from workers import Response, WorkerEntrypoint, asgi


def _friendly_worker_error_html() -> str:
    return """<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <title>Laboratorul ia o pauză scurtă | LaCurent</title>
  <style>
    :root{font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f3ee;color:#17201d}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:28px 18px;background:radial-gradient(circle at 50% 18%,#fff,rgba(244,243,238,.94) 48%,rgba(226,233,225,.94) 100%)}
    main{width:min(620px,100%);text-align:center}
    .mark{display:inline-flex;align-items:center;gap:9px;margin-bottom:24px;color:#315f4e;font-size:12px;font-weight:800;letter-spacing:.18em}
    .mark:before{content:"LC";display:grid;place-items:center;width:38px;height:38px;border-radius:13px;background:#18352c;color:#fff;letter-spacing:-.04em;font-size:13px}
    svg{width:min(300px,72vw);margin:0 auto 20px;filter:drop-shadow(0 18px 28px rgba(31,53,45,.10))}
    h1{margin:0;font-size:clamp(32px,8vw,54px);line-height:.98;letter-spacing:-.045em}
    p{max-width:510px;margin:18px auto 0;color:#68716d;font-size:clamp(15px,3.8vw,18px);line-height:1.55}
    .actions{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:28px}
    a{min-height:48px;display:inline-flex;align-items:center;justify-content:center;padding:0 20px;border-radius:999px;text-decoration:none;font-weight:750;border:1px solid rgba(24,53,44,.12)}
    .primary{background:#18352c;color:#fff;box-shadow:0 12px 28px rgba(24,53,44,.14)}
    .secondary{background:rgba(255,255,255,.72);color:#315f4e}
    small{display:block;margin-top:22px;color:#929894;font-size:12px}
  </style>
</head>
<body>
  <main>
    <div class="mark">LACURENT</div>
    <svg viewBox="0 0 320 230" role="img" aria-label="Casă LaCurent cu o siguranță electrică declanșată">
      <defs>
        <linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d66f64"/><stop offset="1" stop-color="#b94f47"/></linearGradient>
        <linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#e8e4da"/></linearGradient>
      </defs>
      <ellipse cx="160" cy="202" rx="112" ry="17" fill="#dce4db"/>
      <path d="M75 110 160 48l86 62v88H75z" fill="url(#w)" stroke="#30463e" stroke-width="5" stroke-linejoin="round"/>
      <path d="m58 118 102-76 103 76" fill="none" stroke="url(#r)" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="136" y="143" width="47" height="55" rx="5" fill="#355f52"/>
      <rect x="91" y="130" width="31" height="28" rx="4" fill="#8fb4bf" stroke="#355f52" stroke-width="4"/>
      <rect x="202" y="130" width="31" height="28" rx="4" fill="#8fb4bf" stroke="#355f52" stroke-width="4"/>
      <circle cx="246" cy="61" r="31" fill="#fff8df" stroke="#315f4e" stroke-width="4"/>
      <path d="m250 36-19 29h15l-7 22 27-33h-15z" fill="#e0a83d" stroke="#315f4e" stroke-width="3" stroke-linejoin="round"/>
    </svg>
    <h1>Laboratorul ia o pauză scurtă.</h1>
    <p>Serviciul nu răspunde momentan. Reîncearcă în câteva secunde și continuăm de unde ai rămas.</p>
    <div class="actions"><a class="primary" href="">Reîncearcă</a><a class="secondary" href="/">LaCurent</a></div>
    <small>Cod 503 · răspuns de siguranță LaCurent</small>
  </main>
</body>
</html>"""


class Default(WorkerEntrypoint):
    async def fetch(self, request):
        try:
            # Import inside the guarded request path so application import/startup
            # failures can also render the branded fallback instead of a raw 1101.
            from app.main import app

            return await asgi.fetch(app, request, self.env)
        except Exception as exc:
            # Hard isolate termination (CPU/memory) can still bypass Python
            # entirely; ordinary import/ASGI/runtime failures are handled here.
            print(f"[LaCurent Worker] unhandled request exception: {type(exc).__name__}")
            return Response(
                _friendly_worker_error_html(),
                status=503,
                headers={
                    "content-type": "text/html; charset=utf-8",
                    "cache-control": "no-store",
                    "retry-after": "2",
                },
            )
