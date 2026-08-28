# P12F Cloudflare Python Runtime Check

## Objective

P12F evaluates whether the existing `python_engine.calculate()` MC001 calculator can run as a native Cloudflare Python Worker. The product must not restore JavaScript physics and must not require the browser to know a private Python host URL.

## Current Cloudflare Python Worker Contract

The prepared Worker uses:

- entry point: `workers/python-mc001/worker.py`
- generated bundle directory: `.wrangler/python-mc001-worker`
- Worker name: `lacurent-python-mc001`
- `main = "src/worker.py"`
- `compatibility_date = "2026-05-25"`
- `compatibility_flags = ["python_workers"]`
- runtime entry class: `WorkerEntrypoint.fetch()`

Routes:

- `GET /health`
- `POST /calculate`

The route module performs HTTP validation and serialization only. The calculation authority remains `from python_engine import calculate`.

## Production Routing Shape

The existing public Worker route remains:

```text
browser
  -> /api/python/calculate
  -> workers/save-house.js
  -> env.PYTHON_ENGINE.fetch(.../calculate) when a Cloudflare Service Binding is configured
  -> lacurent-python-mc001 Python Worker
  -> python_engine.calculate()
```

`PYTHON_ENGINE_URL` remains only as an operational external-host fallback from P12B. It is not a JavaScript physics fallback and is no longer the preferred native Cloudflare path.

## Compatibility Audit

Transitive imports required by `python_engine.calculate()` were prepared into the Worker bundle.

| Area | Status |
| --- | --- |
| Python stdlib | uses `json`, `time`, `typing`, `urllib.parse`; compatible with Python Workers/Pyodide expectation |
| Pure Python engine modules | bundled under `src/python_engine` |
| Validation reference modules | bundled read-only under `src/validation-reference/python-mc001/mc001_reference` for the existing independent P3V kernel path |
| Native extensions | none required |
| sockets/subprocess/multiprocessing | not used by Worker entry path |
| ThreadingHTTPServer standalone service | excluded from Worker bundle |
| filesystem assumptions | dynamic reference-kernel import path preserved inside the bundled source tree |
| mutable global state | engine is stateless for request execution |

## Bundle Proof

`node scripts/prepare-cloudflare-python-worker.mjs` produced:

```json
{
  "status": "prepared",
  "output": ".wrangler/python-mc001-worker",
  "workerName": "lacurent-python-mc001",
  "compatibilityDate": "2026-05-25",
  "files": 58,
  "bytes": 294236,
  "includesStandaloneServer": false
}
```

`wrangler.cmd deploy --dry-run` with local `wrangler 4.93.0` attached 83 modules and reported:

- total attached modules: `377.06 KiB`
- total upload: `383.28 KiB`
- gzip: `78.37 KiB`

This is comfortably below Cloudflare's documented Worker-size limits for Free and Paid plans. It is only a bundle proof, not runtime execution proof.

## Runtime Attempt

Local `pywrangler sync --force` succeeded after moving the generated Worker to a short Windows path without spaces and using CPython/Pyodide 3.13 artifacts.

`wrangler.cmd dev --local` with the locally installed `wrangler 4.93.0` failed while starting the Workers runtime:
