# Home Lab calculations release campaign

## 2026-09-23 — stable monthly utilization factors

- Base: `fdd933594e35fb5289d106d4f32b632977cfd4d9`, fetched from
  `codex/commercial-v2-cloudflare-python`.
- Work branch: `codex/homelab-release-calculations`.
- Production branch confirmed by `.github/workflows/commercial-v2-cloudflare-worker.yml`:
  deployment is triggered by pushes to that production branch or manual dispatch.
  The other workflow is PR-only. This work neither dispatches workflows nor opens PRs.
- No root/commercial AGENTS.md exists. `docs/AGENTS.md` was read; this campaign's
  explicit user authorization covers engine fixes and this evidence register.
- No other `codex/homelab-release-*` remote branches were found at initial inspection.

### Defect and reproduction

Direct positive powers in the heating utilization formula, and negative powers in
the cooling formula, overflow at high utilization parameters. A fully validated
BuildingInput can therefore fail in `calculate()` with `OverflowError`, rather than
returning its monthly balance. This is a numerical boundary defect, not evidence
that it caused any previously reported production 503.

Examples before the fix:

- Heating gamma=1.5, a=2000: OverflowError; independent result is 2/3.
- Cooling gamma=0.75, a=3000: OverflowError; independent result is 0.75.
- A deliberate low-loss boundary fixture with 100 m2 floor area, one 100 m2
  envelope component at U=0.001 W/(m2 K), zero ventilation/bridges, explicit zero
  solar gains and internal gains 0.02 W/m2 reproduces failure through `calculate()`.
  This is an accepted limit input, not a claim about a representative real house.
- Direct subtraction also loses precision near gamma=1.

### Remediation

Use algebraically equivalent non-positive exponential arguments and `expm1` to
avoid overflow and cancellation. Cooling reuses the same expression at reciprocal
gamma. Preserve the existing near-equality limit, negative cooling-transfer branch,
monthly cutoff rules and all physical inputs/coefficient tables.

### Verification and traceability

All results below apply to the engine/test files in the commit containing this
entry, against the base SHA above. The containing commit supplies the immutable
fix SHA (no self-referential SHA embedded in the file).

- Before modification: existing engine tests **77 passed**.
- New regression before modification: **16 failed, 29 passed**, including both
  complete-calculation limit fixtures (cooling enabled/disabled).
- Independent oracle: Decimal evaluation of the original formulas at 80 digits,
  42 combinations across heating/cooling, gamma below/at/above 1, a=2.5/2000/3000.
  Tolerance fixed before implementation: rel=2e-12, abs=2e-14; this is a numerical
  tolerance, not a physical-accuracy claim.
- After fix: engine plus new regression **122 passed**.
- Entire Python commercial suite: **289 passed**, 13 warnings, no failures.
- Demo calculation serialized output, including reference comparison: exactly
  unchanged versus the base revision.
- `git diff --check`: passed.

### Boundaries and next iteration

No production deployment, no PR, no load test, no browser test or Cloudflare
runtime test performed. This validates numerical evaluation of the existing
formula; it does not validate measured annual bills or the complete physical model.
The existing warnings were not remediated in this scoped change.

Next: inspect monthly renewable allocation and annual carrier reconciliation,
including solar thermal meeting all DHW demand and auxiliary-electricity cases.
First re-read this register and the remote branch heads; do not redo this fix or
merge other campaign branches automatically.
