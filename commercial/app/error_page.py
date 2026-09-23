from __future__ import annotations

from html import escape


_ERROR_COPY = {
    404: {
        "eyebrow": "HOME LAB",
        "title": "Pagina asta s-a rătăcit.",
        "message": "Nu am găsit adresa pe care ai cerut-o. Casa ta e în regulă — doar traseul până aici nu mai există.",
        "primary_label": "Înapoi la Home Lab",
        "primary_href": "/home-lab-next",
    },
    500: {
        "eyebrow": "LACURENT",
        "title": "Ne-a sărit o siguranță.",
        "message": "Am oprit cererea înainte să îți arătăm ceva greșit. Reîncearcă peste câteva secunde.",
        "primary_label": "Reîncearcă",
        "primary_href": "",
    },
    503: {
        "eyebrow": "LACURENT",
        "title": "Laboratorul ia o pauză scurtă.",
        "message": "Serviciul nu răspunde momentan. Datele tale nu sunt problema; reîncearcă în câteva secunde.",
        "primary_label": "Reîncearcă",
        "primary_href": "",
    },
}


def render_error_html(status_code: int = 503) -> str:
    code = int(status_code or 503)
    copy = _ERROR_COPY.get(code, _ERROR_COPY[500])
    title = escape(copy["title"])
    message = escape(copy["message"])
    eyebrow = escape(copy["eyebrow"])
    primary_label = escape(copy["primary_label"])
    primary_href = escape(copy["primary_href"], quote=True)

    return f"""<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <title>{title} | LaCurent</title>
  <style>
    :root {{
      color-scheme: light;
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f4f3ee;
      color: #17201d;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 28px 18px;
      background:
        radial-gradient(circle at 50% 18%, rgba(255,255,255,.96), rgba(244,243,238,.92) 48%, rgba(226,233,225,.92) 100%);
    }}
    main {{
      width: min(620px, 100%);
      text-align: center;
    }}
    .mark {{
      display: inline-flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 24px;
      color: #315f4e;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .18em;
    }}
    .mark::before {{
      content: "LC";
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 13px;
      background: #18352c;
      color: #fff;
      letter-spacing: -.04em;
      font-size: 13px;
    }}
    .art {{
      width: min(300px, 72vw);
      margin: 0 auto 20px;
      filter: drop-shadow(0 18px 28px rgba(31,53,45,.10));
    }}
    h1 {{
      margin: 0;
      font-size: clamp(32px, 8vw, 54px);
      line-height: .98;
      letter-spacing: -.045em;
    }}
    p {{
      max-width: 510px;
      margin: 18px auto 0;
      color: #68716d;
      font-size: clamp(15px, 3.8vw, 18px);
      line-height: 1.55;
    }}
    .actions {{
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 28px;
    }}
    .actions a {{
      min-height: 48px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 750;
      border: 1px solid rgba(24,53,44,.12);
    }}
    .primary {{
      background: #18352c;
      color: #fff;
      box-shadow: 0 12px 28px rgba(24,53,44,.14);
    }}
    .secondary {{
      background: rgba(255,255,255,.72);
      color: #315f4e;
    }}
    small {{
      display: block;
      margin-top: 22px;
      color: #929894;
      font-size: 12px;
      letter-spacing: .04em;
    }}
  </style>
</head>
<body>
  <main>
    <div class="mark">{eyebrow}</div>
    <svg class="art" viewBox="0 0 320 230" role="img" aria-label="Casă LaCurent cu o siguranță electrică declanșată">
      <defs>
        <linearGradient id="roof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d66f64"/>
          <stop offset="1" stop-color="#b94f47"/>
        </linearGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fffdf8"/>
          <stop offset="1" stop-color="#e8e4da"/>
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="202" rx="112" ry="17" fill="#dce4db"/>
      <path d="M75 110 160 48l86 62v88H75z" fill="url(#wall)" stroke="#30463e" stroke-width="5" stroke-linejoin="round"/>
      <path d="m58 118 102-76 103 76" fill="none" stroke="url(#roof)" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="136" y="143" width="47" height="55" rx="5" fill="#355f52"/>
      <rect x="91" y="130" width="31" height="28" rx="4" fill="#8fb4bf" stroke="#355f52" stroke-width="4"/>
      <rect x="202" y="130" width="31" height="28" rx="4" fill="#8fb4bf" stroke="#355f52" stroke-width="4"/>
      <circle cx="246" cy="61" r="31" fill="#fff8df" stroke="#315f4e" stroke-width="4"/>
      <path d="m250 36-19 29h15l-7 22 27-33h-15z" fill="#e0a83d" stroke="#315f4e" stroke-width="3" stroke-linejoin="round"/>
      <path d="M52 183c15-8 28-8 43 0m131 0c15-8 28-8 43 0" fill="none" stroke="#90a59b" stroke-width="5" stroke-linecap="round"/>
    </svg>
    <h1>{title}</h1>
    <p>{message}</p>
    <div class="actions">
      <a class="primary" href="{primary_href}">{primary_label}</a>
      <a class="secondary" href="/">LaCurent</a>
    </div>
    <small>Cod {code} · dacă problema persistă, încearcă din nou puțin mai târziu.</small>
  </main>
</body>
</html>"""
