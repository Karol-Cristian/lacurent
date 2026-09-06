# LaCurent

LaCurent is a residential building energy-performance application. The primary
product is the clean Python/FastAPI application in `commercial/`.

The rest of the repository is retained as legacy/reference material for prior
implementation work, validation evidence and methodology data.

## Run

```bash
python -m pip install -r commercial/requirements.txt
uvicorn commercial.app.main:app --reload
```

Open `http://127.0.0.1:8000`.

## Test

```bash
python -m pytest commercial/tests -q
```

## Production

The conventional ASGI start command is:

```bash
uvicorn commercial.app.main:app --host 0.0.0.0 --port ${PORT}
```

The app also includes a root `Dockerfile` for container hosts and a lightweight
health endpoint at `/health`.

The intended primary production architecture is Cloudflare Python Workers:

```bash
node scripts/prepare-commercial-cloudflare-worker.mjs
cd .wrangler/commercial-v2-worker
uv run pywrangler dev
uv run pywrangler deploy
```

The Cloudflare Worker entrypoint is generated at
`.wrangler/commercial-v2-worker/src/worker.py` from the template in
`commercial/cloudflare-worker/`. It exposes the existing FastAPI app through
Cloudflare's ASGI adapter.

The generated Energy Performance Report is a commercial building-performance
report. It is not a legally issued Energy Performance Certificate.
