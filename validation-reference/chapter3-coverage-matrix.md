# MC001 Chapter 3 Coverage Matrix

Generated deterministically from the Chapter 3 source-to-code fixture.

| Field | Value |
| --- | --- |
| Schema | mc001_chapter3_coverage_matrix_p8_v1 |
| Total tracked relations | 217 |
| Implemented or explicit-boundary relations | 216 |
| Complete available-source percentage | 99.5% |
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
| implemented | 10 |
| notebook-visible | 2 |
| production-integrated | 4 |
| unit-tested | 199 |

## P8 Production Topology

- Single active systems use an implicit allocation fraction of 1; an explicit single-system allocation must also be 1.
- Multiple active heating, cooling or DHW systems require explicit allocation fractions summing to 1.
- The runtime aggregates parallel service chains after each allocated chain has executed the Chapter 3 stage balance.
- Energy carriers are aggregated from the resolved system metadata, not from a single service-level default.

## Remaining External Dependency

- 3.4_SR_EN_15193_1_DELEGATED: SR EN 15193-1
  - Missing: The referenced SR EN 15193-1 equations 1-13 and 25-33 are not present in the repository source packs.
  - Required contract: Licensed/reviewed SR EN 15193-1 content, or explicit professional subspace LENI/lighting-energy values.
