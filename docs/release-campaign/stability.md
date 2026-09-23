# Home Lab stability release campaign

## 2026-09-23 — coalesce Best ROI catalog reads

- Base: `fdd933594e35fb5289d106d4f32b632977cfd4d9`, fetched from
  `codex/commercial-v2-cloudflare-python`.
- Work branch: `codex/homelab-release-stability`.
- Deploy workflow inspected: only a push to the production branch above, or a
  manual dispatch, deploys. A push to this work branch does not match it. PR
  checks are PR-only. No PR, dispatch or production request was made.
- No root/commercial AGENTS.md exists. `docs/AGENTS.md` was read; the explicit
  stability-task authorization covers this backend fix and evidence register.
- Calculation campaign branch was inspected only for overlap. Its numerical
  boundary fix is independent and was not merged here.

### Defect and reproduction

`GET /api/market-cost-basis`, used by Best ROI, ran D1 table creation, index
creation, version status and catalog select for every browser session. A
controlled fake-D1 concurrency reproduction with 100 simultaneous requests
recorded **400 prepare calls and 400 D1 runs** for the same static catalog.
This is a concrete request-amplification/cold-start stampede. It can waste D1
work and increase contention, but this isolated proof does not establish it as
the cause of every production 503/freeze previously observed.

### Remediation

- Coalesce simultaneous D1 bootstrap/reads with one async lock per Worker
  isolate.
- Cache a successful versioned catalog in the isolate for 900 seconds, aligned
  with the response cache-control lifetime.
- Apply a 30-second negative-cache backoff after D1 failure so concurrent page
  loads use the existing seed fallback instead of forming a serialized retry
  storm.
- Keep the existing D1 bootstrap, seed fallback and public response contract.

### Verification and load evidence

- New 100-request concurrency regression: **4 D1 runs total** (table, index,
  status and catalog select), down from 400; all responses use the D1 payload.
- Route tests: **94 passed**.
- Entire Python commercial suite: **245 passed**, 13 existing warnings.
- `git diff --check`: passed.
- Bounded local load harness added at `scripts/load-test-home-lab.py`. It refuses
  non-local targets and stops if errors exceed 2%.
- Local configuration: Python 3.12.14, Linux x86_64, one Uvicorn process,
  optimizer-like profile of 16 calculations/user, 160 ms think time, 12 s
  request timeout. No production traffic or Cloudflare metrics were used.

| Concurrent users | Requests | Throughput | p50 | p95 | p99 | Errors | Max server RSS |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 160 | 58.98 req/s | 5.72 ms | 20.89 ms | 23.45 ms | 0 | 43.82 MiB |
| 50 | 800 | 270.76 req/s | 10.57 ms | 54.01 ms | 64.48 ms | 0 | 46.20 MiB |
| 100 | 1600 | 411.14 req/s | 66.17 ms | 146.29 ms | 182.77 ms | 0 | 50.48 MiB |

These numbers characterize only this local CPython/Uvicorn process. They do
not prove Cloudflare Worker capacity or a production concurrency guarantee.

### Boundaries and next iteration

No Cloudflare runtime, production logs, D1 metrics, browser E2E, deployment or
rollback was exercised. Next inspect rapid UI state changes and optimizer/live
calculation overlap, with particular attention to server work that survives a
client-side abort. Re-read this register and remote branch heads first.
