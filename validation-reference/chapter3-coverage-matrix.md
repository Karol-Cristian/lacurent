# MC001 Chapter 3 Coverage Matrix

Generated deterministically from the Chapter 3 source-to-code fixture. P8C expands component contracts while preserving separate numerical/procedural/explicit-boundary accounting.

| Field | Value |
| --- | --- |
| Schema | mc001_chapter3_coverage_matrix_p8c_v1 |
| Total tracked relations | 217 |
| Numerically implemented relations | 46 |
| Procedurally implemented relations | 4 |
| Explicit-input boundary relations | 166 |
| External-standard blocked relations | 1 |
| Not applicable relations | 0 |
| Numerical implementation percentage | 21.2% |
| Production complete supported-scope percentage | 23.0% |
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
| production-integrated | 43 |
| unit-tested | 170 |

## P8C Primary Classification Counts

| Field | Value |
| --- | --- |
| EXPLICIT_INPUT_BOUNDARY | 166 |
| EXTERNAL_STANDARD_BLOCKED | 1 |
| NOT_APPLICABLE | 0 |
| NUMERICALLY_IMPLEMENTED | 46 |
| PROCEDURALLY_IMPLEMENTED | 4 |

## Explicit Boundaries Converted Through P8C

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
- 3.200: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.201: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.202: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.203: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.204: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.205: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.206: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.207: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.208: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.209: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.210: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.211: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.212: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.213: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.214: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.215: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.216: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.217: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.218: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.219: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.220: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.221: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.222: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.223: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.224: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.
- 3.225: DHW storage component contract resolves storage standing-loss and heat-tracing calculations.
- 3.226: DHW storage component contract resolves storage standing-loss and heat-tracing calculations.
- 3.227: DHW storage component contract resolves storage standing-loss and heat-tracing calculations.
- 3.228: DHW storage component contract resolves storage standing-loss and heat-tracing calculations.

## Remaining Explicit Boundary Policy

An explicit boundary remains only where MC001 requires project/manufacturer technical data, delegates the detailed method to an unavailable standard, or the current production product does not yet expose the complete detailed component contract.

## P8C Production Topology

- Single active systems use an implicit allocation fraction of 1; an explicit single-system allocation must also be 1.
- Multiple active heating, cooling or DHW systems require explicit allocation fractions summing to 1.
- The runtime aggregates parallel service chains after each allocated chain has executed the Chapter 3 stage balance.
- Energy carriers are aggregated from the resolved system metadata, not from a single service-level default.

## Remaining External Dependency

- 3.4_SR_EN_15193_1_DELEGATED: SR EN 15193-1
  - Missing: The referenced SR EN 15193-1 equations 1-13 and 25-33 are not present in the repository source packs.
  - Required contract: Licensed/reviewed SR EN 15193-1 content, or explicit professional subspace LENI/lighting-energy values.
