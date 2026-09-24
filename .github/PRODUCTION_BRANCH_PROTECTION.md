# Production branch protection

Target branch:

`codex/commercial-v2-cloudflare-python`

The repository-level GitHub ruleset / branch-protection configuration must enforce:

1. Require a pull request before merging.
2. Require the status check `Commercial PR Checks / checks`.
3. Require the branch to be up to date before merging.
4. Block direct pushes to the production branch.
5. Block force pushes.
6. Block branch deletion.
7. Apply the rules to repository administrators as well.

The repository workflows add defense in depth:

- `commercial-pr-checks.yml` runs for every pull request targeting the production branch, without path filtering.
- `commercial-v2-cloudflare-worker.yml` refuses a production push unless the pushed SHA is the merge commit of a merged PR whose base is the production branch.
- Missing Cloudflare production credentials fail the workflow; deployment/domain-verification steps must never silently succeed as skipped.

The workflow guard does **not** replace GitHub branch protection. A direct push can only be prevented before repository mutation by GitHub's branch protection/ruleset layer.
