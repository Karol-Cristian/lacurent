# MC001 C6B Figure 2.18 Heating Branch Readiness

## Scope

C6B is a metadata-only transcription milestone for the heating-side branch logic shown in MC001-2022 figure 2.18. It does not implement a monthly useful heating demand calculator, does not change the Worker/API/UI, and does not add certificate, final energy, primary energy, or CO2 behavior.

The target output remains a readiness map toward `QH;nd;ztc;m`, not a runtime `QH;nd` result.

## Why C6B Exists After C6A

C6A mapped the wider monthly useful-energy spine from explicit heat transfer toward useful heating/cooling demand. C6B narrows that map to the heating branch in figure 2.18 so the next step can decide whether implementation is safe or whether more source transcription is required.

Current implemented chain:

| Milestone | Implemented scope | Limitation |
| --- | --- | --- |
| V2 | Htr vertical coefficient workflow | transmission module only |
| C1 | explicit transmission formula calculators | not useful demand |
| C2 | integrated transmission coefficient | not monthly demand |
| C3 | explicit monthly transmission energy | not `QH;nd` |
| C4 | explicit monthly ventilation energy | not `QH;nd` |
| C5 | explicit transmission plus ventilation transfer total | explicit transfer only, not `QH;nd` |

## Exact Source Map

Source used: MC001-2022 only, from the local official PDF already present in the repository docs folder. The PDF is not copied, parsed, or read at runtime.

| Reference | Page | Role |
| --- | ---: | --- |
| 2.7 | 98 | Monthly calculation method context |
| 2.7.6 | 114 | Utilization factors and heating balance symbols |
| Figure 2.14 | 114 | Heating gain-utilization dependency spine |
| 2.8.4 | 120-122 | Short and long unoccupied-period correction context |
| Figure 2.18 | 121 | Monthly heating useful demand branch for short unoccupied periods |
| Figure 2.19 | 121 | Cooling branch reference, out of C6B runtime scope |
| Relations 2.76-2.77 | 122 | Long unoccupied-period interpolation, blocker for broader implementation |
| Relation 2.84 | 125 | Annual heating aggregation reference |

## Figure 2.18 Heating Branch Transcription

Figure 2.18 is the verified source for the heating-side branch structure. It shows three branch paths:

| Branch id | Condition transcription | Output | Readiness |
| --- | --- | --- | --- |
| `heating_zero_non_positive_balance_condition` | `gammaH;ztc;m <= 0 and QH;gn;ztc;m > 0 != 1` | `QH;nd;ztc;m = 0` | `needs_human_visual_review` |
| `heating_zero_high_balance_ratio` | `gammaH;ztc;m > 2.0` | `QH;nd;ztc;m = 0` | `verified_for_future_runtime` |
| `heating_else_gain_utilization` | `else` | `QH;nd;ztc;m = QH;ht;ztc;m - etaH;gn;ztc;m * QH;gn;ztc;m` | `verified_for_future_runtime` |

The first branch is not safe for runtime use yet because the second clause is visually ambiguous in figure 2.18 and needs a human visual confirmation before it can become executable logic.

## Symbol Table

| Symbol | Meaning | Unit | Dependency origin |
| --- | --- | --- | --- |
| `gammaH;ztc;m` | Heating thermal balance ratio | dimensionless | source-needed utilization factor spine |
| `QH;ht;ztc;m` | Total heat transfer for heating mode in the month | kWh | implemented explicit C5 transfer chain or explicit input |
| `etaH;gn;ztc;m` | Heating gain-utilization factor | dimensionless | missing future utilization-factor source pack |
| `QH;gn;ztc;m` | Total heat gains for heating mode in the month | kWh | missing or explicit-input-only gains |
| `QH;nd;ztc;m` | Monthly useful heating energy demand | kWh | not implemented output |

## Candidate Formulas

| Candidate | Source | Expression | Status |
| --- | --- | --- | --- |
| zero demand, non-positive balance branch | MC001-2022 page 121, figure 2.18 | `QH;nd;ztc;m = 0` | `needs_human_visual_review` |
| zero demand, high balance ratio branch | MC001-2022 page 121, figure 2.18 | `QH;nd;ztc;m = 0 when gammaH;ztc;m > 2.0` | `verified_for_future_runtime` |
| gain-utilization branch | MC001-2022 page 121, figure 2.18 | `QH;nd;ztc;m = QH;ht;ztc;m - etaH;gn;ztc;m * QH;gn;ztc;m` | `verified_for_future_runtime` |
| heating utilization dependency | MC001-2022 page 114, figure 2.14, relations 2.55 and 2.57 | `etaH;gn;ztc;m`, `gammaH;ztc;m`, and `aH;ztc;m` dependency spine | `needs_human_visual_review` |

## Dependency Matrix

| Dependency | Status | Notes |
| --- | --- | --- |
| C5 explicit heat transfer total | implemented | explicit transfer only, not `QH;nd` |
| Internal gains | missing or explicit-input-only | source map exists from 2.7.2 |
| Solar gains | missing or explicit-input-only | source map exists from 2.7.3 |
| Total heat gains | missing or explicit-input-only | figure 2.13 needs implementation planning |
| Heating gain-utilization factor | missing/source-needed | figure 2.14 branch and formulas must be fully transcribed |
| Effective thermal capacity | missing/source-needed | 2.7.5 is mapped but not encoded for runtime |
| Time constant | missing/source-needed | depends on utilization-factor spine |
| Monthly useful heating demand | not implemented | figure 2.18 is metadata only |
| Annual aggregation | not implemented | relation 2.84 is mapped only |

## What Remains Blocked

- Runtime monthly useful heating demand.
- Runtime monthly useful cooling demand.
- Final energy, primary energy, CO2, CPE, and certificate output.
- System losses, fan electricity, and air-treatment energy.
- Utilization-factor runtime logic.
- Gains runtime logic unless explicit input and source rules are separately approved.
- Long unoccupied-period interpolation and intermittency correction.
- Any hidden defaults or invented coefficients.

## Recommendation For Next Phase

Recommendation B: C6C must continue source extraction for the figure 2.18 ambiguous branch and the heating utilization-factor/gains/effective-capacity dependencies before a runtime heating-only `QH;nd` calculator is safe.

The narrowest next slice is a metadata/transcription milestone for figure 2.14 heating gain-utilization factors, including the exact conditions, relation 2.55/2.57 dependencies, and source-linked inputs needed by the verified figure 2.18 else branch.
