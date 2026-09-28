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

## 2026-09-24 — serialize optimizer launches during cost-catalog preflight

- Continued from remote branch commit
  `671b8d5b1e136006197bf0859aea92f44aaf6be9`; production was not modified.
- Defect: the optimizer buttons were disabled only after the asynchronous cost
  catalog preflight. Two rapid clicks while that shared request was pending
  entered two optimizer runs. The second canceled the first in the browser,
  but the first candidate request had already reached the server, so the same
  engine payload could be evaluated twice.
- Reproduction: a real Chromium flow held `/api/market-cost-basis`, dispatched
  two rapid Best ROI clicks, then released the response. Before the fix,
  `scripts/smoke-home-lab-optimizer-overlap.mjs` failed after observing one
  compact candidate payload twice.
- Remediation: a synchronous launch guard now owns the entire optimizer action,
  including cost-catalog preflight. All optimizer controls are disabled and the
  busy state is set before the first await, then restored for both early returns
  and completed/error runs. The calculation formulas and optimizer objective
  are unchanged. The browser asset cache key moved from `next46` to `next47`.
- Verification after the fix: the same rapid-click Chromium flow completed
  with **14 unique compact candidates and 0 duplicates**; JavaScript syntax
  checks passed; **13 Node tests** and the complete commercial suite of **245
  Python tests** passed (13 existing Pydantic deprecation warnings);
  `git diff --check` passed.
- Limits: this proves browser-side request de-duplication against local Uvicorn.
  It is not a Cloudflare capacity result and no production traffic, logs or
  deployment were used.
- Next: reproduce live-slider changes while a slow calculation is already in
  server execution, and verify recovery after timeout without stale UI state or
  automatic retry amplification.

## 2026-09-27 — remove unused reference passes from wall scenarios

- Fast-forwarded the exclusive stability branch from `0bbee2f` to the verified
  production revision `4d6fb9a3e3f70ca13d6bba131dee594e7a24b624` before
  changing it. The production deployment run `36268850448` had published its
  Worker successfully but failed live verification twice with HTTP 503: first
  at `/api/scenarios/wall-insulation/product`, then at the separate legacy
  embed calculation route. No production traffic was generated in this work.
- Reproduction on that exact production tree: one wall-insulation scenario
  executed **4 complete physics-engine passes**. Both the baseline and renovated
  calculations requested a reference-building comparison, even though the
  versioned scenario response never reads either comparison.
- Remediation: calculate the baseline and renovated scenario snapshots with
  `include_reference=False`. The physical formulas, two required house
  calculations and response contract are unchanged.
- Independent before/after instrumentation counted **4 -> 2** complete engine
  passes. The canonical 9,373-byte response remained bit-identical
  (`sha256:45198f3d91f1e5f2a85c1b4b4bd327c8ccd673e54bca6235222ce6c3df53081b`).
  A regression now requires both top-level scenario calculations to suppress
  unused reference work.
- Verification: renovation/product tests **17 passed**; complete commercial
  suite **412 passed** with 31 existing Pydantic deprecation warnings;
  `git diff --check` passed. The existing bounded local calculation load profile
  (one Uvicorn process, 16 requests/user, 160 ms think time, 12 s timeout,
  2% stop threshold) completed at 10/50/100 users with 0 errors. At 100 users:
  1,600 requests, 438.63 req/s, p50 46.88 ms, p95 149.03 ms, p99 190.89 ms.
  RSS is omitted because this environment exposed the `uv` launcher PID rather
  than the Python server process, producing an invalid 2.02 MiB sample.
- Limits: this halves deterministic work on the scenario endpoint implicated by
  the first live failure, but it does not prove Cloudflare capacity and does not
  explain or fix the second failure at `/embed/demo-store/calculate`. The fix is
  only on the stability branch until explicitly integrated later.
- Next: instrument the legacy HTML calculation route and remove only work its
  rendered result does not consume; do not infer resolution from retries.

## 2026-09-24 — keep calculation timeout active through response body

- Base: `0bbee2fbb9d49e58f8179bf9854d41e0a95de5a3`, isolated worktree.
  Production inspected at `6bfd00c25d0d5d6d0292890701241747fce0874f`:
  the same early timeout cleanup remains present. Other campaign heads checked:
  calculations `1fd34a6`, readiness `85d764d`, integration `9b878a2`;
  no duplicate body-timeout fix. No other branch integrated.
- Defect: fetch resolves when headers arrive. The helper then cleared its timer
  and detached parent cancellation before callers awaited response.json(). A
  stalled body could therefore leave live calculation/optimizer waiting without
  the intended deadline; later aborts no longer reached that body reader.
- Reproduction: Node VM runs the actual helper source with immediate headers
  and an independently controlled body promise honoring AbortSignal. Before:
  3 regressions fail (missing timeout/cancellation and new result contract).
- Fix: consume JSON/non-JSON bodies inside the protected try/finally and return
  response metadata plus parsed payload to both live and optimizer callers.
  No retries added. Browser cache key advanced; regression added to PR checks.
- Verification on the files in this entry's containing commit: 3 new Node
  regressions pass (body deadline, cancellation after headers, next explicit
  request succeeds; timer/listener cleanup); all 16 Node tests pass; 245 Python
  tests pass with 13 existing warnings; JS syntax and git diff --check pass.
- Bounded local load rerun: Python 3.12.14, Linux x86_64, one Uvicorn process,
  16 compact calculation requests/user (optimizer-like), 160 ms think time,
  12 s request deadline, stop above 2% errors, outer 60 s execution timeout.

| Users | Requests | req/s | p50 ms | p95 ms | p99 ms | Errors | Max RSS MiB |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 160 | 58.71 | 5.41 | 27.48 | 39.48 | 0 | 45.23 |
| 50 | 800 | 268.96 | 11.43 | 70.15 | 78.72 | 0 | 47.42 |
| 100 | 1600 | 414.22 | 65.56 | 159.37 | 177.04 | 0 | 51.68 |

- Limits: controlled fetch regression, not browser E2E. Load measures backend
  calculation requests, not a complete interactive ROI journey, and does not
  validate this client timeout itself. No Cloudflare capacity/metrics claim,
  production load, PR or deploy. Client cancellation does not prove server CPU
  work stops. The dedicated branch is older than production; integrated-version
  tests and preservation of the latest asset cache key remain required later.
- Push safety: deploy workflow only triggers on production-branch pushes or
  manual dispatch; PR checks remain pull_request-only. No triggers broadened.
- Next: catalog preflight has a separate bare fetch; investigate its deadline
  and recovery, then browser-level stale-result handling after cancellation.
