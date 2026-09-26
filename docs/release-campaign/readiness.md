# Home Lab release-readiness campaign

## 2026-09-26 — deploy trigger covers the D1 catalog builder

- Continued exclusive readiness branch from
  `e83cdc4a1b8f61f9ad8d75b09eb1353e3898cd5c`; no campaign or production
  branch was integrated.
- Observed production head while investigating:
  `85842e25e96e1f4ed0aab84efa0e5d12cea50446`.
- Reproduced gap on that exact production revision: the production workflow
  compiles and executes `scripts/build-heating-catalog-d1-import.py`, but its
  push `paths` filter did not include that file. Therefore a production merge
  changing only this workflow dependency would not start the workflow that
  validates it. This is a release-trigger defect; it is not evidence that an
  incorrect D1 import has occurred.
- Remediation: include the catalog builder explicitly in the production push
  filter and add a regression preventing removal of that trigger dependency.
- Verification: before the workflow edit the new regression fails on the
  missing trigger; after it, the dedicated workflow-safety tests pass (**2
  passed**). The complete suite on this readiness revision passes: **301
  passed**, with 14 pre-existing Pydantic deprecation warnings. `git diff
  --check` also passes.
- Publication safety: the deploy workflow still triggers only on the production
  branch (or manual dispatch). This readiness-branch push cannot deploy. No PR,
  merge or workflow dispatch is part of this iteration.

### Evidence matrix at this revision

| Criterion | Current evidence | Status / limit |
| --- | --- | --- |
| Calculations | Campaign regressions at `1fd34a6`; later engine/optimizer work exists in production | Historical evidence only; exact current integrated calculations need acceptance evidence |
| Complete flows | Production workflow contains API and custom-domain smoke; prior browser CI evidence is recorded below | Partial; HTTP smoke is not a complete real-user report flow |
| Capacity | Stability campaign measured local 10/50/100 users with zero errors | Local only; current optimizer V3 and Cloudflare capacity unverified here |
| Representative configuration | Production SHA `85842e2`: workflow [36261116680](https://github.com/Karol-Cristian/lacurent/actions/runs/36261116680), attempt 2 completed successfully | Attempt 1 reached production but its live verification got HTTP 503 on `/embed/demo-store/calculate`; rerun success does not erase the intermittent failure |
| Recovery | Immutable older Worker receipt and runbook exist | Rehearsal/database compatibility still untested |
| Offer / monetization | No dedicated campaign evidence on inspected release branches | Untested |

**NO-GO for declaring the current integrated SHA fully release-verified.** The
trigger hole is closed only on this readiness branch. The intermittent
production 503, representative optimizer load, final report acceptance and a
rollback rehearsal remain separate evidence requirements.

Next: once production stops changing, bind one release-candidate SHA to a
successful integrated workflow, browser flow, representative load result and
rollback target; do not assemble a GO verdict from different revisions.

## 2026-09-24 evening — retain an immutable rollback receipt

- Continued readiness base `85d764dcebb165fc588924b8e09b5446aafd8b15` in an
  isolated worktree; no other campaign changes were integrated.
- Observed production SHA: `91dcdf05e8873dd6bf9630c68c89af9590ffe2d8`.
- Reproduced gap: this register recorded no immutable rollback target;
  the deployment workflow only printed the version into Actions logs and its
  rollback note concerned recreating an older route. Neither identified a
  version-to-source mapping or a complete recovery procedure in the repository.
- Added [rollback receipt and runbook](rollback.md), using the successful
  deployment's actual Worker UUID, source SHA, job ID and timestamp. It also
  prevents treating the same Worker's `workers.dev` alias as isolated staging.
- Verification: read Actions run/job metadata and decoded deploy log; matched
  the UUID and Worker name to that job and its source SHA. Checked the runbook
  against Cloudflare's rollback documentation. `git diff --check` passed.
  Documentation only: no application tests rerun and no recovery executed.
- Publication safety: both workflows were inspected; this branch matches no
  deploy push trigger. No workflow was dispatched. Changes are documentation
  only, with no PR or deploy.

### Updated evidence matrix (supersedes the morning snapshot below)

| Criterion | Evidence at inspected revisions | Status / remaining limit |
| --- | --- | --- |
| Calculations | Register at `1fd34a6c29cc54cea3ec3c922fda5d36fa1874bd`: numeric oracle and auxiliary-electricity tariff regression; annual carrier total was already correct | Fixes integrated; final report reconciliation still tracked in [#390](https://github.com/Karol-Cristian/lacurent/issues/390) |
| Complete flows | User-flow register now exists in production `91dcdf0`; PR #394 browser CI run `36036491066` passed | Earlier persistence blocker cleared; report acceptance in #390 remains open |
| Capacity | Stability register at `9e9855e6b41611e71c3cfb84f3f9aa425601bede`: bounded local 10/50/100-user test, zero errors | Local evidence only; representative Cloudflare capacity untested |
| Configuration | Exact production SHA `91dcdf0`, successful deploy run [36037020065](https://github.com/Karol-Cristian/lacurent/actions/runs/36037020065), Worker runtime and custom-domain smoke passed | Evidence for this SHA; not for a future integrated release |
| Recovery | Immutable Worker receipt now retained; queue/resource safeguards documented | Rehearsal and database compatibility untested |
| Offer / monetization | No strategy campaign branch or corresponding evidence found among inspected campaign branches | Untested |

**NO-GO for declaring the complete weekend release ready.** This does not
retract the successful deployment above. Remaining acceptance gaps are the
final report, representative capacity, recovery rehearsal/compatibility and
offer evidence. Recheck the exact final integrated SHA after any further change.

Next: obtain an isolated recovery environment and produce the rehearsal receipt
specified in `rollback.md`; do not test rollback on either production hostname.

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
