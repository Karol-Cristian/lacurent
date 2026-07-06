# MC001 QHnd Ambiguity Resolution Readiness

## Scope

This note records a metadata-only C6E source review for MC001-2022 monthly useful heating energy demand readiness. It resolves the first heating branch ambiguity in figure 2.18 as source metadata only.

C6E does not implement a QHnd calculator. It does not change Worker, API, UI, database, migrations, package, wrangler, deployment, final energy, primary energy, CO2, CPE, or certificate behavior.

## Why C6E Exists After C6A-C6D

C6A mapped the MC001 monthly useful-energy spine. C6B transcribed figure 2.18 heating branch logic and left the first branch ambiguous. C6C mapped utilization-factor dependencies and kept the figure 2.18 first branch blocked. C6D mapped gains, effective capacity, and time-constant dependencies while preserving that ambiguity.

C6E rechecks the visual source around figure 2.18, figure 2.14, section 2.7.6, relation 2.55, relation 2.57, and adjacent symbol definitions so the next phase can decide whether a restricted heating-only explicit-input calculator is safe.

## Exact Source Map

- MC001-2022 page 120, figure 2.18: heating-side branch for monthly useful heating energy demand.
- MC001-2022 page 113, figure 2.14: heating gain-utilization factor edge cases and gamma ratio.
- MC001-2022 page 113, section 2.7.6: utilization-factor context and symbol definitions.
- MC001-2022 page 113, relation 2.55: heating utilization parameter.
- MC001-2022 page 116, relation 2.57: heating time constant dependency.
- Adjacent definitions identify QH;gn;ztc;m as heat gains in kWh, QH;ht;ztc;m as heat transfer in kWh, gammaH;ztc;m as dimensionless, etaH;gn;ztc;m as dimensionless, and QH;nd;ztc;m as monthly useful heating energy in kWh.

## Figure 2.18 First-Branch Review

Visual transcription:

```text
gammaH;ztc;m <= 0 si QH;gn;ztc;m > 0 ≠ 1
```

Classification:

```text
resolved_verified_typographical_artifact
```

Resolved condition:

```text
gammaH <= 0 && QHgn > 0
```

Output:

```text
QHnd = 0
```

Source-backed rationale:

- QH;gn;ztc;m is defined as total heat gains in kWh, so attaching `!= 1` to QHgn is dimensionally invalid.
- `gammaH <= 0` already implies `gammaH != 1`.
- Figure 2.14 contains the matching edge case `gammaH <= 0 si QH;gn;ztc;m > 0` without the trailing artifact.
- Relation 2.55 defines the heating utilization parameter and does not require the trailing artifact.
- The resolved branch is internally consistent with the utilization-factor edge case because the gains term offsets the heat-transfer term in the useful heating demand expression.

Runtime note: do not execute this branch in the first restricted runtime unless separate targeted tests are added.

## Figure 2.14 Edge-Condition Review

| Edge case | Source condition | C6E readiness | First restricted runtime |
| --- | --- | --- | --- |
| Non-positive gamma | `gammaH <= 0` | Resolved as metadata but excluded from first runtime | Excluded |
| Gamma zero | `gammaH = 0` | Excluded because `1 / gammaH` is singular | Excluded |
| Gamma near zero | `gammaH near zero` | Numeric edge requires targeted tests | Excluded |
| Non-positive gains | `QHgn <= 0` | Source edge exists but outside restricted positive-gamma domain | Excluded |
| Non-positive heat transfer | `QHht <= 0` | Gamma ratio requires positive transfer | Excluded |
| Gamma equals one | `gammaH = 1` | Source branch verified | Included only with explicit eta or the verified gamma-equals-one branch |
| High gamma | `gammaH > 2.0` | Figure 2.18 zero-demand branch is visible | Excluded from first restricted runtime |
| Normal branch | `0 < gammaH <= 2.0` | Allowed for restricted runtime | Included |

## Restricted Explicit-Input Runtime Mode Feasibility

Verdict:

```text
allowed_for_future_runtime
```

Allowed future C6F domain:

- heating only
- monthly explicit inputs only
- no long unoccupied periods
- `QHht > 0`
- `QHgn >= 0`
- `0 < gammaH <= 2.0`
- `etaHgn` explicitly provided by the user, or calculated only from verified figure 2.14 formulas with explicit inputs
- no hidden defaults
- no normative gains, solar, capacity, schedule, or occupancy defaults
- no final energy, primary energy, CO2, CPE, or certificate output

Allowed future outputs:

- restricted monthly useful heating energy `QHnd` in kWh
- diagnostics and methodology-limit flags

Excluded from the first restricted runtime:

- cooling useful demand
- high-gamma zero branch
- non-positive-gamma branch
- zero or near-zero gamma edge
- long unoccupied or intermittent operation
- final energy, primary energy, CO2, CPE, certificate, and system losses

## Dependency Matrix

| Dependency | Status |
| --- | --- |
| C5 explicit transfer total | Implemented, explicit transfer only, not full QHnd |
| QHht monthly input | Explicit input or C5 chain |
| QHgn monthly input | Explicit input required |
| gammaH formula | Verified for restricted future runtime |
| etaHgn formula | Verified for restricted future runtime with explicit inputs or user-supplied eta |
| Figure 2.14 edge conditions | Reviewed, restricted domain selected |
| Figure 2.18 first branch | Resolved as typographical artifact |
| Effective capacity and time constant | Explicit input or future source-pack support |
| Internal gains | Explicit input or future source-pack support |
| Solar gains | Explicit input or future source-pack support |
| Annual aggregation | Not implemented |
| Final energy | Blocked |
| Primary energy | Blocked |
| CO2 | Blocked |
| CPE/certificate | Blocked |

## Runtime Readiness Verdict

```text
C6F_CAN_IMPLEMENT_RESTRICTED_HEATING_QHND_EXPLICIT_INPUT
```

This verdict is only for a restricted, heating-only, monthly, explicit-input QHnd calculator. It is not a full MC001 certificate calculation and it is not certificate readiness.

## What Remains Blocked

- Full QHnd runtime outside the restricted explicit-input domain.
- QCnd cooling useful demand.
- Annual aggregation runtime.
- Long unoccupied periods and intermittency.
- Normative internal-gain, solar-gain, climate, capacity, schedule, and occupancy defaults.
- System losses.
- Final energy.
- Primary energy.
- CO2.
- CPE/certificate behavior.

## Recommendation For Next Phase

A. C6F can implement restricted heating-only QHnd explicit-input calculator.
