# Commercial v2 rollback evidence and procedure

## Immutable candidate receipt — 2026-09-24

This is a candidate baseline for a **subsequent** release, not a rehearsed
recovery target and not permission to roll back production.

| Field | Recorded evidence |
| --- | --- |
| Repository | `Karol-Cristian/lacurent` |
| Production branch | `codex/commercial-v2-cloudflare-python` |
| Source commit | `91dcdf05e8873dd6bf9630c68c89af9590ffe2d8` |
| Worker | `lacurent-commercial-v2` |
| Worker version | `bd56b54f-61d8-4743-a722-9b66aa72437e` |
| Deploy receipt timestamp | `2026-09-24T17:50:55.0723476Z` |
| Workflow | [36037020065](https://github.com/Karol-Cristian/lacurent/actions/runs/36037020065) — completed/success |
| Job | [107759535138](https://github.com/Karol-Cristian/lacurent/actions/runs/36037020065/job/107759535138) — success |
| Runtime and live smoke | `Prove real Worker runtime`, `Smoke-test Worker HTTP routes`, `Verify production custom domain`: success in this job |
| Recovery rehearsal | **NOT RUN** |
| Compatibility with future database/binding changes | **NOT VERIFIED** |

The decoded job log records `Uploaded lacurent-commercial-v2`, followed by
`Current Version ID: bd56b54f-61d8-4743-a722-9b66aa72437e`.
The Actions API links this job to the exact source commit above. This preserves
the critical mapping outside expiring Actions logs. A successful deployment
does not prove complete report correctness or recovery readiness.

The `lacurent-commercial-v2.lemnarukarol.workers.dev` address in the workflow
serves this same Worker. Despite the workflow's `staging` variable name, it is
**not an isolated rehearsal environment**. Do not exercise rollback there.

## Operator procedure (not executed)

1. Obtain explicit authorization for the target environment and operation.
   Recheck the currently active Worker version in Cloudflare. Select a recorded
   target different from the active version; verify it still exists and is
   eligible for rollback. The receipt above is not a moving “last good” alias.
2. Before a production recovery, coordinate a pause in new deploy submissions
   and inspect running/queued `commercial-v2-production` workflow runs. Resolve
   them with the release owner first: a dashboard rollback does not join the
   GitHub queue, and a pending deployment can overwrite it. Do not disable
   protections or cancel a deployment blindly during its resource changes.
3. Compare the target's D1 schema/data assumptions, bindings, secrets and routes
   with the current configuration. Worker rollback does not restore connected
   resources or database contents. Stop if compatibility is unknown. Database
   recovery requires its own approved plan and backup evidence.
4. Rehearse first using a separate non-production Worker and isolated data.
   Deploy known baseline and candidate versions there, record their IDs, then
   use that Worker's **Deployments → baseline version → Rollback**. Confirm the
   selected version receives 100% of traffic. Record start/end time, version
   before/after, and observed recovery time. A rehearsal's UUIDs belong to that
   Worker; do not substitute them into the production receipt.
5. Verify health, saved house → renovation → calculation → ROI → report → home,
   including cost reconciliation, reload and error recovery. Record actual
   inputs, outputs and failures against the exact version. HTTP 200 alone is
   not a passing user flow. Mark every unexecuted check untested.
6. Only after the prerequisite evidence and production authorization exist,
   repeat the approved operation on `lacurent-commercial-v2` using its verified
   immutable target. Confirm active version, custom-domain behavior and data
   integrity. Preserve an incident receipt even if recovery fails.
7. Before normal deployments resume, reconcile the production Git branch with
   the intended code via the normal reviewed PR path. A dashboard rollback
   does not change Git; redeploying the unchanged branch could restore the bug.

Cloudflare documents that rollback replaces the deployment with one version,
only the latest 100 published versions are eligible, and connected resources
are not rolled back. Resource changes can prevent rollback:
<https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/>.

## Required rehearsal receipt

Record environment/Worker, source SHAs, active and target version IDs, isolated
database identity, compatibility review, operator/time, authorization,
deployment-queue state, checks with results, elapsed recovery time, failures
and the resulting active version. Until that receipt exists, recovery remains
**untested**. No Cloudflare rollback was executed while creating this document.
