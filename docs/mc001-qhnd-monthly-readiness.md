# MC001 Monthly Useful Energy Demand Readiness

## Scope

This note maps the MC001-2022 Chapter 2 source spine needed to move from explicit heat-transfer totals toward monthly useful heating and cooling energy demand:

- `QH;nd;ztc;m`
- `QC;nd;ztc;m`
- annual aggregation of monthly useful demand

This is readiness metadata only. It does not implement `QH;nd` or `QC;nd`, does not change the Worker API, does not change the UI, and does not make certificate-readiness claims.

## Current Implemented Chain V2-C5

| Milestone | Implemented state | Limit |
| --- | --- | --- |
| V2 | Htr/transmission vertical MVP | Htr/transmission only |
| C1 | Explicit transmission formula calculators | Explicit inputs only |
| C2 | Integrated transmission coefficient result | Not useful demand |
| C3 | Explicit monthly transmission energy | Not QH;nd |
| C4 | Explicit monthly ventilation energy | Not QH;nd |
| C5 | Explicit transmission plus ventilation heat-transfer total | Not QH;nd or QC;nd |

## Exact MC001 Source Map

Source: MC001-2022, Chapter 2, official methodology published in Monitorul Oficial al Romaniei, Partea I, nr. 46 bis/17.I.2023.

The following references were visually/text-layer checked from the local MC001-2022 PDF. The PDF is not copied into the repo and is not parsed at runtime.

| Topic | Source reference | Verified pages | Readiness use |
| --- | --- | --- | --- |
| Monthly method scope | 2.7 | 98-99 | Confirms monthly method context and heat-transfer/gain components. |
| Total heat transfer | 2.7.1, figure 2.10 | 100 | Splits total transfer into transmission and ventilation. |
| Transmission transfer | 2.7.1.1, figures 2.11-2.12, relations 2.27-2.28 | 100-101 | Already represented by R2/C1/C3 metadata and explicit calculators. |
| Ventilation transfer | 2.7.1.2, relations 2.29-2.30 | 101-102 | Already represented by C4 explicit ventilation transfer. |
| Total gains and internal gains | 2.7.2, figure 2.13, relations 2.33-2.34 | 103-104 | Required before useful demand. |
| Solar gains | 2.7.3, relations around 2.37-2.38 and later solar subrelations | 104-112 | Required before full useful demand. |
| Effective internal heat capacity | 2.7.5 | 113 | Required for time constant and utilization factors. |
| Utilization factors | 2.7.6, figures 2.14-2.17, relations 2.55-2.58 | 114-117 | Required for heating gain utilization and cooling heat-transfer utilization. |
| Intermittent and unoccupied handling | 2.8, relations 2.59, 2.67, 2.72-2.77, figures 2.18-2.19 | 117-122 | Required for long unoccupied periods and intermittent operation. |
| Annual useful-demand aggregation | 2.10, relations 2.84-2.85 | 125 | Aggregates monthly useful heating and cooling demand. |
| Latent demand | 2.9 and relation 2.86 | 124-126 | Out of C6A/C6B scope unless separately implemented. |

## Candidate Formulas And References

These are source-pack candidates, not runtime functions in this phase.

| Candidate | Reference | Output symbols | C6A decision |
| --- | --- | --- | --- |
| Heat transfer total | Figure 2.10 | `QH;ht;ztc;m`, `QC;ht;ztc;m` | Metadata-ready; C5 remains explicit-only and not useful demand. |
| Ventilation monthly transfer | Relations 2.29-2.30 | `QH/C;ve;ztc;m`, `HH/C;ve;ztc;m` | Already implemented only as explicit-input C4. |
| Total gains | Figure 2.13 | `QH;gn;ztc;m`, `QC;gn;ztc;m` | Missing runtime support beyond explicit C6-style gains. |
| Internal gains | Relations 2.33-2.34 | `QH/C;int;ztc;m` | Needs a separate explicit-input or source-backed gains slice. |
| Solar gains | Section 2.7.3 | `QH/C;sol;ztc;m` | Needs separate source-pack/calculator work; no defaults introduced. |
| Heating utilization factor | Figure 2.14, relation 2.55 | `etaH;gn;ztc;m`, `gammaH;ztc;m`, `aH;ztc;m` | Needs visual branch transcription before runtime use. |
| Cooling utilization factor | Figure 2.15, relation 2.56 | `etaC;ht;ztc;m`, `gammaC;ztc;m`, `aC;ztc;m` | Needs visual branch transcription before runtime use. |
| Time constants | Relations 2.57-2.58 | `tauH;ztc;m`, `tauC;ztc;m` | Needs explicit capacity and transfer coefficient inputs. |
| Heating useful demand | Figure 2.18 | `QH;nd;ztc;m` | Not machine-encoded in C6A. |
| Cooling useful demand | Figure 2.19 | `QC;nd;ztc;m` | Not machine-encoded in C6A. |
| Long unoccupied interpolation | Relations 2.76-2.77 | occupied/unoccupied useful-demand interpolation | Not runtime-ready in C6A. |
| Annual useful demand | Relations 2.84-2.85 | `QH;nd;ztc;an`, `QC;nd;ztc;an` | Safe only after monthly demand is implemented. |

## Required Inputs For A Future C6B Calculator

Minimum heating-only explicit-input calculator dependencies:

- `QH;ht;ztc;m` in kWh, from explicit transfer inputs or a verified upstream calculation.
- `QH;gn;ztc;m` in kWh, from explicit gains inputs or verified gain formulas.
- `etaH;gn;ztc;m`, or enough explicit inputs to calculate it:
  - `gammaH;ztc;m`
  - `aH;ztc;m`
  - `tauH;ztc;m`
  - `Cm;eff;ztc`
  - relevant heat-transfer coefficients.
- month and zone identifiers.
- explicit flag that the month has no long unoccupied period, or the long-unoccupied correction inputs.

No monthly temperature, duration, gain, airflow, capacity, utilization, or occupancy value may be inferred.

## Required Outputs For A Future C6B Calculator

- Monthly heating useful demand: `QH;nd;ztc;m`, kWh.
- Diagnostics:
  - source references used.
  - branch condition used from figure 2.18.
  - blockers when required inputs are missing.
  - methodology limits stating not final energy, not primary energy, not CO2, and not certificate-ready.
- Optional annual aggregation only after all monthly results are available and relation 2.84 is implemented.

## Dependency Matrix

| Dependency | State | Notes |
| --- | --- | --- |
| Transmission heat transfer | implemented | C3 explicit-input result only. |
| Ventilation heat transfer | implemented | C4 explicit-input result only. |
| Total heat transfer | explicit-input-only | C5 sums explicit C3 and C4. Not useful demand. |
| Internal gains | explicit-input-only / incomplete | Explicit gains can be entered, but MC001 source-backed internal-gains method is not complete. |
| Solar gains | missing | Needs separate source pack/calculator work. |
| Heat gains total | explicit-input-only / incomplete | Needs full internal plus solar handling. |
| Effective internal heat capacity | missing | Needed for time constant and utilization factors. |
| Heating gain utilization factor | blocked | Figure 2.14 branch logic must be machine-encoded only after verified transcription. |
| Cooling heat-transfer utilization factor | blocked | Figure 2.15 branch logic must be machine-encoded only after verified transcription. |
| Long unoccupied periods | blocked | Relations 2.76-2.77 need separate implementation. |
| Intermittent heating/cooling | blocked | Section 2.8 correction paths need separate implementation. |
| Latent humidification/dehumidification | blocked | Section 2.9 is out of scope. |
| Monthly useful heating demand | blocked | Needs verified figure 2.18 branch logic and utilization inputs. |
| Monthly useful cooling demand | blocked | Needs verified figure 2.19 branch logic and utilization inputs. |
| Annual useful demand | blocked | Depends on monthly useful demand. |
| Certificate/final/primary/CO2 | blocked | Out of scope and not ready. |

## Recommended Next Implementation Slice

C6B should not implement a runtime useful-demand calculator yet unless the figure 2.18 branch equations are explicitly human-verified in machine-readable form.

Recommended C6B:

1. Create a heating-only source-pack transcription for figure 2.18.
2. Encode the allowed branch conditions as metadata and tests only.
3. Keep cooling, long unoccupied periods, intermittent operation, latent loads, final energy, primary energy, CO2, and certificate behavior out of scope.

Only after that is verified should C6C implement a heating-only monthly useful-demand calculator with explicit inputs.

## Non-Goals

- No runtime QH;nd or QC;nd calculation.
- No Worker/API/UI change.
- No PDF runtime extraction.
- No invented MC001 coefficients or defaults.
- No certificate readiness.
- No final energy, primary energy, CO2, system losses, utilization-factor fallback, fan electricity, or air-treatment calculation.
