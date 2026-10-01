# Solar Power / Romania pilot

Isolated Cloudflare Worker demonstrator for a solar forecasting/data product. It does not share runtime, routes, D1, service bindings, or deploy workflow with the LACURENT production or development Workers.

## Current scope

- Romania coordinate coverage through `GET /api/v1/pv/forecast`
- 20-point spatial field for a fast national visual through `GET /api/v1/romania`
- ECMWF IFS radiation forecast via Open-Meteo, with Best Match fallback
- PV conversion for an asset defined by MWp, tilt and azimuth
- Minimal producer dashboard with live GHI/DNI/GTI, MW now, +1 h, daily MWh, ramp and variability
- Provider registry and explicit benchmark/calibration slot

This is a demonstrator, not dispatch-grade forecasting. The uncertainty band is a transparent heuristic until it is calibrated against real production data.

## Architecture

`provider adapters -> irradiance normalization -> PV conversion -> asset forecast -> spatial aggregation -> benchmark/calibration`

The provider boundary is deliberate: additional ECMWF/AIFS/GFS/ICON/satellite sources can be added without changing the public API. A later benchmark layer can ingest public Romanian generation observations and asset SCADA.

## Local tests

```bash
node --test workers/solar-power-romania/tests/*.test.mjs
```

## Worker

Cloudflare Worker name: `lacurent-solar-romania`

The preview deployment uses only `workers.dev` and therefore cannot replace or route traffic away from the existing LACURENT workers.
