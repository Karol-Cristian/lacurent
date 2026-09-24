# Home Lab release-readiness campaign

## 2026-09-24 — serialize production deployments

- Verified production base: `c5676f7b3c2df8b82ad5216cc4f16aed39d66921`
  from `codex/commercial-v2-cloudflare-python`.
- Work branch: `codex/homelab-release-readiness`.
- The production workflow deploys only on a matching production-branch push or
  manual dispatch. This branch does not match that trigger; no dispatch, PR or
  deployment was made.
- `docs/AGENTS.md`, both deployment workflows and the available campaign
  registers were read. The explicit release-readiness authorization covers
  this workflow safeguard, its regression and this evidence register.

### Gap and reproduction

The production workflow had no workflow- or job-level `concurrency` gate.
GitHub Actions therefore allowed close production pushes and manual dispatches
to deploy in parallel. Because each run performs a full Worker build, deploy
and live verification, an older run could finish after a newer run and replace
the intended release. This is a release-ordering defect; it is not evidence
that such a race has already occurred in production.

Before the change, a structural assertion for a top-level concurrency gate
failed with `FAIL: production workflow has no concurrency gate`.

### Remediation

Add one repository-unique production concurrency group with `queue: max`.
GitHub will run at most one production workflow in that group and retain the
waiting runs in FIFO order. In-progress deploys are not cancelled midway. This
matches GitHub's documented production-deploy queue pattern:
<https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency>.
Add a regression to the normal commercial Python suite so removing or changing
the production queue fails before a later deploy.

### Verification and traceability

- The dedicated workflow-safety regression passes after the change.
- The complete commercial Python suite passes: **300 passed**, with 14 existing
  Pydantic deprecation warnings, on the exact branch revision containing this
  entry.
- Workflow YAML parses successfully and `git diff --check` passes.
- The remote production head above contains merge
  `a84cd1e2cff9401e308e1308626b9fef4a66a2c4`, whose integrated commit
  `9b878a293e7323d74484cbd62df6eb16eb72de65` records the three calculation
  and stability fixes. This ancestry check does not substitute for testing the
  final future integrated release revision.

### Readiness matrix at this revision

| Criterion | Evidence | Status |
| --- | --- | --- |
| Calculations and explained differences | Calculation register: numerical boundary regression, independent 80-digit oracle, 289-test run | Passed on campaign/integration revisions; exact future release untested |
| Complete user flows | Local user-flow register records mobile and desktop baseline → renovation → report → home; its branch is not present on GitHub | Blocked for release integration |
| Measured capacity | Stability register: bounded local 10/50/100-user run, 0 errors; explicitly not Cloudflare capacity | Partial |
| Representative configuration | Worker workflow exercises local Worker runtime and production smoke after deployment | Exact future release untested |
| Recovery / rollback | Deploys are now serialized; no rollback rehearsal or immutable rollback target is recorded | Blocked |
| Coherent offer / monetization | No campaign evidence available on the inspected remote branches | Untested |

### Go / no-go and next case

**NO-GO for declaring the weekend release ready.** The calculation/stability
fixes are ancestors of the inspected production head, but the user-flow fix is
not persisted on GitHub or integrated. The exact final release revision still
needs its full workflow, browser flow and representative load checks. Rollback
also needs an immutable known-good target and a rehearsed recovery procedure.

Next: prepare and validate a rollback receipt/runbook against a non-production
environment, including the exact Worker version and database compatibility;
do not exercise rollback on production from this campaign branch.
