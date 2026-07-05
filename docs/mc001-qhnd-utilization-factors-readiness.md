# MC001 C6C Heating Utilization Factors Readiness

## Scope

C6C is a metadata-only transcription milestone for the MC001-2022 heating utilization-factor logic needed before monthly useful heating demand runtime work.

It does not implement `QH;nd`, does not change Worker/API/UI behavior, does not add migrations or configuration, and does not claim final energy, primary energy, CO2, CPE, or certificate readiness.

## Why C6C Exists After C6A/C6B

C6A mapped the broad monthly useful-energy source spine. C6B transcribed figure 2.18 heating branch metadata and found the first heating branch condition ambiguous. C6C narrows the next source-pack step to figure 2.14 and related heating utilization-factor dependencies, then revisits the figure 2.18 ambiguity without inventing the intended meaning.

## Exact Source Map

Source used: MC001-2022 only, inspected from the local official PDF already present in the repository docs folder. The PDF is not copied into this milestone and is not read by runtime code.

| Reference | Page | Role |
| --- | ---: | --- |
| 2.7 | 98 | Monthly calculation method context |
| 2.7.5 | 112 | Effective internal heat capacity source section |
| Tables 2.19 and 2.20 | 112 | Effective capacity class references, not transcribed into defaults |
| 2.7.6 | 113 | Utilization factors section |
| Figure 2.14 | 113 | Heating gain-utilization factor branch logic |
| Relation 2.55 | 113 | Heating utilization parameter `aH;ztc;m` |
| Relation 2.57 | 116 | Heating time constant `tauH;ztc;m` |
| Figure 2.18 | 120 | Heating monthly useful demand branch logic |

## Figure 2.14 Utilization-Factor Transcription

Figure 2.14 provides the heating balance ratio and four heating gain-utilization branches.

| Branch id | Condition | Candidate expression | Readiness |
| --- | --- | --- | --- |
| `heating_utilization_positive_gamma_not_one` | `gammaH;ztc;m > 0 and gammaH;ztc;m != 1` | `etaH;gn;ztc;m = (1 - gammaH;ztc;m ^ aH;ztc;m) / (1 - gammaH;ztc;m ^ (aH;ztc;m + 1))` | `verified_for_future_runtime` |
| `heating_utilization_gamma_equals_one` | `gammaH;ztc;m = 1` | `etaH;gn;ztc;m = aH;ztc;m / (aH;ztc;m + 1)` | `verified_for_future_runtime` |
| `heating_utilization_non_positive_gamma_positive_gains` | `gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0` | `etaH;gn;ztc;m = 1 / gammaH;ztc;m` | `needs_human_visual_review` |
| `heating_utilization_negative_gamma_non_positive_gains` | `gammaH;ztc;m < 0 and QH;gn;ztc;m <= 0` | `etaH;gn;ztc;m = 1` | `verified_for_future_runtime` |

The non-positive gamma branch is source-visible, but the `gammaH = 0` edge case must be reviewed before runtime implementation because the expression divides by `gammaH`.

## Figure 2.18 Ambiguity Review Result

C6C rechecked figure 2.18 against the clearer figure 2.14 notation.

Observed first-branch text remains:

`gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1`

Verdict: unresolved visual/logical notation ambiguity.

Decision: do not infer intended meaning. This remains a runtime blocker for a future heating-only `QH;nd` calculator.

## Symbol Table

| Symbol | Meaning | Unit | Dependency origin |
| --- | --- | --- | --- |
| `QH;ht;ztc;m` | Total heating-mode heat transfer for the month | kWh | implemented or explicit input required |
| `QH;gn;ztc;m` | Total heating-mode heat gains for the month | kWh | explicit input required until gains are source-packed |
| `gammaH;ztc;m` | Heating thermal balance ratio | dimensionless | missing future source pack |
| `etaH;gn;ztc;m` | Heating gain-utilization factor | dimensionless | missing future source pack |
| `tauH;ztc;m` | Heating time constant | h | missing future source pack |
| `Cm;eff;ztc` | Effective internal heat capacity | J/K | missing future source pack |
| `aH;ztc;m` | Heating utilization parameter | dimensionless | missing future source pack |
| `QH;nd;ztc;m` | Monthly useful heating demand | kWh | ambiguous, needs human review |

## Candidate Formulas

| Candidate | Source | Expression | Status |
| --- | --- | --- | --- |
| Heating balance ratio | Figure 2.14 | `gammaH;ztc;m = QH;gn;ztc;m / QH;ht;ztc;m` | `verified_for_future_runtime` |
| Positive gamma utilization | Figure 2.14 | see branch table | `verified_for_future_runtime` |
| Gamma equals one utilization | Figure 2.14 | see branch table | `verified_for_future_runtime` |
| Non-positive gamma utilization | Figure 2.14 | `etaH;gn;ztc;m = 1 / gammaH;ztc;m` | `needs_human_visual_review` |
| Negative gamma and non-positive gains | Figure 2.14 | `etaH;gn;ztc;m = 1` | `verified_for_future_runtime` |
| Heating utilization parameter | Relation 2.55 | `aH;ztc;m = aH;0 + tauH;ztc;m / tauH;0` | `verified_for_future_runtime` |
| Heating time constant | Relation 2.57 | `tauH;ztc;m = (Cm;eff;ztc / 3600) / (HH;tr(excl.grflr);ztc;m + HH;gr;adj;ztc + HH;ve;ztc;m)` | `verified_for_future_runtime` |
| Effective capacity class dependency | Tables 2.19 and 2.20 | class/table dependency only | `referenced_but_not_transcribed` |
| Figure 2.18 first branch | Figure 2.18 | zero-demand branch | `blocked_due_to_ambiguous_figure` |

## Dependency Matrix

| Dependency | Status |
| --- | --- |
| C5 explicit transfer total | implemented, explicit transfer only |
| `QH;ht` monthly input | explicit-input-only or C5 chain |
| Internal gains | missing or explicit-input-only |
| Solar gains | missing or explicit-input-only |
| Total gains `QH;gn` | missing or explicit-input-only |
| `gammaH` | verified for future runtime |
| `etaH;gn` | partially verified; zero-edge review needed |
| Effective capacity and time constant | referenced but not runtime-ready |
| Figure 2.18 branch logic | blocked by ambiguous first branch |
| `QH;nd` runtime | not implemented |
| Annual `QH;nd` aggregation | not implemented |
| Final energy | blocked |
| Primary energy | blocked |
| CO2 | blocked |
| CPE/certificate | blocked |

## Runtime Readiness Verdict

C6D cannot safely implement a heating-only `QH;nd` explicit-input runtime calculator yet.

Even though much of figure 2.14 is now transcribed, runtime remains blocked by:

- unresolved figure 2.18 first-branch ambiguity;
- figure 2.14 non-positive gamma zero-edge review;
- heat gains not source-packed as runtime logic;
- effective heat capacity and time constant dependencies not runtime-ready;
- annual aggregation not implemented.

## What Remains Blocked

- Runtime `QH;nd`.
- Runtime `QC;nd`.
- Final energy, primary energy, CO2, CPE, certificate.
- System losses.
- Normative default gains, capacity, and schedules.
- Intermittency and long unoccupied-period runtime behavior.
- Any hidden defaults or invented coefficients.

## Recommendation For Next Phase

Recommendation B: C6D must continue source extraction for unresolved utilization-factor/time-constant/gain/capacity/branch ambiguity dependencies.

The narrowest next source milestone should resolve figure 2.18's first branch through human visual review and separately decide whether effective capacity tables 2.19/2.20 can be represented as verified metadata without introducing runtime defaults.
