# P8J0 Chapter 3 Coverage Certification

## Canonical Source

- Starting commit: `46e4109ceb7c06272783e023159bf23cddea98f1`
- Canonical matrix: `validation-reference/chapter3-coverage-matrix.json`
- Total tracked slots: 217
- NUMERICALLY_IMPLEMENTED: 211
- PROCEDURALLY_IMPLEMENTED: 4
- EXPLICIT_INPUT_BOUNDARY: 1
- EXTERNAL_STANDARD_BLOCKED: 1
- NOT_APPLICABLE: 0
- Numerical coverage: 97.2%
- Supported-scope coverage: 99.1%

## Final Non-Closed Slots

| Relation | Classification | Reason |
| --- | --- | --- |
| `3.4_EQ_34_LENI` | `EXPLICIT_INPUT_BOUNDARY` | MC001 provides the LENI aggregation boundary, but the detailed subspace lighting/LENI method is delegated to SR EN 15193-1; current runtime may aggregate explicit professional LENI/monthly lighting inputs only. |
| `3.4_SR_EN_15193_1_DELEGATED` | `EXTERNAL_STANDARD_BLOCKED` | SR EN 15193-1 equations/tables for installed lighting energy, daylight controls, occupancy controls, parasitic energy and emergency lighting are not owned by the repository. |

These are two separate tracked slots. The first is the executable MC001 LENI input/aggregation boundary. The second records the unavailable external standard dependency.

## P8H Starting Non-Closed Slots

P8H had 11 explicit-input boundaries:

`3.38`, `3.140`, `3.142`, `3.143`, `3.148`, `3.153`, `3.165`, `3.170`, `3.174`, `3.182`, `3.4_EQ_34_LENI`.

P8H had one external-standard blocked slot:

`3.4_SR_EN_15193_1_DELEGATED`.

## P8H To P8I Transition Ledger

| Relation | P8H classification | P8I classification |
| --- | --- | --- |
| `3.38` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |
| `3.140` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |
| `3.142` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |
| `3.143` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |
| `3.148` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |
| `3.153` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |
| `3.165` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |
| `3.170` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |
| `3.174` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |
| `3.182` | `EXPLICIT_INPUT_BOUNDARY` | `NUMERICALLY_IMPLEMENTED` |

`3.4_EQ_34_LENI` remained `EXPLICIT_INPUT_BOUNDARY`. `3.4_SR_EN_15193_1_DELEGATED` remained `EXTERNAL_STANDARD_BLOCKED`.

## Root Cause

The P8I final prose collapsed two lighting-related slots into the phrase "one remaining relation." The generated matrix itself was internally consistent: one explicit LENI boundary plus one separate external SR EN 15193-1 blocker. P8J0 corrects the documentation wording and adds accounting invariants so JSON, Markdown and certification documentation must agree.

## Closure Flags

- `CHAPTER_3_NON_LIGHTING_SUPPORTED_SCOPE_NUMERICALLY_COMPLETE`: true.
- `CHAPTER_3_SUPPORTED_SCOPE_NUMERICALLY_COMPLETE`: false unless explicitly defined to exclude the external lighting/LENI engine.
- `MC001_CHAPTER_3_FULL_SCOPE_COMPLETE`: false.

## Remaining Normative Dependency

SR EN 15193-1 remains required for the full lighting/LENI engine. P8J0 does not implement, approximate or infer it.
