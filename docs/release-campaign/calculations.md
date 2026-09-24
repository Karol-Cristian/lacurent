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

## 2026-09-24 — heating auxiliaries priced on the wrong carrier

- Continued the existing work branch from `dfd123f7bfcaef7b82bfd74cce1a5a2a0f2331a1`.
- Synchronized it by a normal merge with the then-current production SHA
  `afdd9af2d4c9e09e3ae11105dfe264ec817a62b1`; history was not rewritten.
- Deployment workflow inspection confirmed that pushes deploy only from
  `codex/commercial-v2-cloudflare-python` (or explicit manual dispatch), not from
  this campaign branch.

### Defect and reproduction

The engine correctly separates boiler/pump/control auxiliary consumption into
the electricity carrier, but the service-cost view combined it with heating and
priced the whole service at the main heating-carrier tariff. That made service
and monthly totals disagree with the authoritative carrier total and distorted
the cost/ROI breakdown for non-electric heating.

Controlled reproduction: condensing gas boiler in Cluj, explicit 120 kWh/year
auxiliary electricity, no PV. Tolerances were fixed before implementation at
0.01 kWh for energy reconciliation and 0.01 lei for monetary reconciliation.

- Main gas final energy: 21,402.12 kWh; auxiliary electricity: 120.00 kWh.
- References used by the application: gas 0.36627 lei/kWh; electricity
  1.27284 lei/kWh.
- Before: heating service cost 7,882.91 lei; independent two-carrier result
  7,991.69 lei (understated by 108.79 lei).
- Before: carrier total 9,316.58 lei versus service/monthly total 9,207.79 lei.

### Remediation

Price heating main energy on its own carrier and auxiliary consumption on the
county electricity reference. Expose both quantities in the service row, use
their weighted effective price only for monthly allocation, and exclude
auxiliary electricity from biomass delivery quantities. The physical engine,
tariffs and user inputs are unchanged.

### Verification and traceability

Results apply to the files in the commit containing this entry. The containing
commit is the immutable fix identifier.

- Independent post-fix calculation: 7,991.69 lei in code and two-carrier oracle;
  difference below 0.01 lei.
- Post-fix carrier, service and monthly totals: each 9,316.58 lei; differences
  below 0.01 lei.
- Engine and pricing tests: **88 passed**.
- Entire Python commercial suite: **331 passed**, 14 pre-existing deprecation
  warnings, no failures.
- `git diff --check`: passed.

### Boundaries and next iteration

No PR, merge to production, deployment, browser test or Cloudflare execution was
performed. This verifies deterministic cost/carrier reconciliation against the
saved price references; it does not claim agreement with an actual household
bill. Next: verify solar-thermal DHW backup energy and PV self-consumption across
mixed carriers month by month, using independent balances.
