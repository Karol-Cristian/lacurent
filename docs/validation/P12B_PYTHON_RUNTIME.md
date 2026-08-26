# P12B Python Runtime

P12B keeps the browser and Cloudflare Worker as the public product boundary and
deploys the existing Python MC001 calculator behind a small HTTP service.

## Local Service

```powershell
python -m python_engine serve --host 127.0.0.1 --port 8765
```

Endpoints:

- `GET /health`
- `POST /calculate`

The route layer performs JSON, request-size and finite-number hardening, then
calls the existing `python_engine.calculate(...)` path. It contains no MC001
formula logic.

## Container

```powershell
docker build -t lacurent-python-engine:latest .
docker run --rm -p 8765:8765 lacurent-python-engine:latest
```

## Cloudflare Worker Configuration

The browser must call only:

```text
/api/python/calculate
```

The Worker must be configured with a private runtime variable:

```powershell
wrangler secret put PYTHON_ENGINE_URL --env production
```

The value should be the HTTPS origin of the deployed Python service, without
the trailing `/calculate`.

## Minimal Container Hosting Command

If Google Cloud Run credentials are available, the smallest recommended
deployment path is:

```powershell
gcloud run deploy lacurent-python-engine `
  --source . `
  --region europe-west1 `
  --allow-unauthenticated `
  --port 8765
```

Then configure the returned service URL as `PYTHON_ENGINE_URL` in Cloudflare
and redeploy the Worker.

If credentials are unavailable, production hosting is not proven. In that case
P12B remains blocked only on deploying this container and setting the Worker
environment variable.
