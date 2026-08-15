# MC001 Chapter 3 Coverage Matrix

Generated deterministically from the Chapter 3 source-to-code fixture. P8B separates numerically calculated relations from explicit technical-input boundaries.

| Field | Value |
| --- | --- |
| Schema | mc001_chapter3_coverage_matrix_p8b_v1 |
| Total tracked relations | 217 |
| Numerically implemented relations | 17 |
| Procedurally implemented relations | 4 |
| Explicit-input boundary relations | 195 |
| External-standard blocked relations | 1 |
| Not applicable relations | 0 |
| Numerical implementation percentage | 7.8% |
| Production complete supported-scope percentage | 9.7% |
| Externally blocked relations | 1 |
| Unavailable/unreadable relations | 0 |
| Runtime-integrated entries | 7 |
| Notebook-visible entries | 7 |
| Implemented tables/lookups | 37 |

## Status Counts

| Field | Value |
| --- | --- |
| explicit-input-boundary | 1 |
| genuinely-externally-blocked | 1 |
| notebook-visible | 2 |
| production-integrated | 14 |
| unit-tested | 199 |

## P8B Primary Classification Counts

| Field | Value |
| --- | --- |
| EXPLICIT_INPUT_BOUNDARY | 195 |
| EXTERNAL_STANDARD_BLOCKED | 1 |
| NOT_APPLICABLE | 0 |
| NUMERICALLY_IMPLEMENTED | 17 |
| PROCEDURALLY_IMPLEMENTED | 4 |

## Explicit Boundaries Converted in P8B

- 3.188: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.
- 3.189: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.
- 3.190: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.
- 3.191: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.
- 3.192: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.
- 3.193: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.
- 3.194: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.
- 3.195: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.
- 3.196: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.
- 3.197: DHW useful-demand source now resolves through Building DNA `usefulDemandSource` and MC001 helper functions.

## Remaining Explicit Boundary Policy

An explicit boundary remains only where MC001 requires project/manufacturer technical data, delegates the detailed method to an unavailable standard, or the current production product does not yet expose the complete detailed component contract.

## P8B Production Topology

- Single active systems use an implicit allocation fraction of 1; an explicit single-system allocation must also be 1.
- Multiple active heating, cooling or DHW systems require explicit allocation fractions summing to 1.
- The runtime aggregates parallel service chains after each allocated chain has executed the Chapter 3 stage balance.
- Energy carriers are aggregated from the resolved system metadata, not from a single service-level default.

## Remaining External Dependency

- 3.4_SR_EN_15193_1_DELEGATED: SR EN 15193-1
  - Missing: The referenced SR EN 15193-1 equations 1-13 and 25-33 are not present in the repository source packs.
  - Required contract: Licensed/reviewed SR EN 15193-1 content, or explicit professional subspace LENI/lighting-energy values.
