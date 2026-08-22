# P8H Chapter 3 Remaining Numerical Closure

P8H starts from certified P8G baseline `5d3b2e80b15810b31b7846926e31b817d06ef684`.

The milestone processes the remaining Chapter 3 explicit-boundary queue with focus on AHU 3.92-3.93, heating generator C5-C8, cooling storage/PCM state relations, cooling generator topology and heat rejection/recovery contracts. No Chapter 2, Chapter 4, climate, PV or validated Chapter 3 formula behavior is changed.

## Implemented Contracts

### AHU 3.92-3.93

Relations 3.92 and 3.93 are implemented from the owned MC001 AHU distribution-loss formulas:

- `calculateAhuDistributionThermalLoss`
- `calculateAhuRecoverableDistributionLossToZone`

The production adapter accepts `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.distributionThermalLoss` and `.recoverableDistributionLoss`, then emits runtime formula IDs and execution traces into the AHU thermal-relations source chain.

### Cooling Storage / PCM

The integrated runtime now calculates the source-backed storage/PCM state chain when the required monthly state inputs are present:

- 3.94-3.98 storage input, liquid/latent/solid energy and output energy
- 3.102-3.110 ice/PCM mass, thickness and solid-temperature state
- 3.111-3.114 PCM sensible/limit/liquid-temperature state
- 3.123 generator delta energy

The existing validated storage balance totals remain unchanged unless a project provides the new state inputs. Missing state inputs do not silently become zero.

### Heating Generator C5-C8

The heating generation adapter now supports product-coefficient contracts:

- 3.15 `C5 * Pn^C6 / 100`
- 3.16 standby fraction sum from envelope and chimney loss fractions
- 3.18 `(C7 + C8) / 100 * Pn`

The coefficients are product or external-method inputs; the downstream standby loss and auxiliary energy are calculated by the runtime and traced.

### Cooling Topology And Heat Rejection

The cooling generation contract now accepts optional source-backed component inputs for:

- generator outlet branch temperatures 3.136-3.139;
- outdoor compensated distribution inlet temperature 3.141;
- direct expansion and air/water generator-input requirements 3.144-3.145;
- heat-rejection reference branches 3.156-3.158;
- heat-rejection part-load and air-temperature branches 3.159-3.161;
- zero recoverable heat and undefined temperature branch 3.162-3.163;
- water, wet and dry heat-rejection temperature calculations 3.166-3.168;
- compression recoverable heat and maximum/recovered-after-use chain 3.169, 3.171-3.172.

These calculations are integrated through the same Building DNA cooling generator component contract and are emitted in `auxiliarySource.formulaIds` and calculation chains. Capacity-limited 3.153 remains opt-in and is not promoted because the product behavior still needs an explicit unmet-load reporting contract.

## Absorption Status

Absorption helper formulas remain unit-tested, but P8H does not declare the absorption generator branch production-complete. Absorption introduces a multi-carrier topology: driving heat plus electric auxiliaries. The current supported cooling service final-stage scalar cannot honestly represent that physical topology without a dedicated multi-carrier generator contract.

Remaining absorption boundaries:

- 3.165 heat rejected by absorption generator;
- 3.170 recoverable heat by absorption generator;
- 3.174 absorption generator heat input;
- 3.182 absorption performance ratio.

## Coverage

| Metric | P8G | P8H |
| --- | ---: | ---: |
| Total tracked Chapter 3 slots | 217 | 217 |
| NUMERICALLY_IMPLEMENTED | 159 | 201 |
| PROCEDURALLY_IMPLEMENTED | 4 | 4 |
| EXPLICIT_INPUT_BOUNDARY | 53 | 11 |
| EXTERNAL_STANDARD_BLOCKED | 1 | 1 |
| NOT_APPLICABLE | 0 | 0 |
| Numerical coverage | 73.3% | 92.6% |
| Production-complete supported-scope coverage | 75.1% | 94.5% |

The canonical artifacts are regenerated:

- `validation-reference/chapter3-coverage-matrix.json`
- `validation-reference/chapter3-coverage-matrix.md`

## Remaining Boundary Ledger

| Relation | Reason code | Required next dependency |
| --- | --- | --- |
| 3.38 | CROSS_SERVICE_OPERATION_HOURS_AND_LOAD_FACTORS_REQUIRED | A source-backed cross-service operating-hours/coincidence contract. |
| 3.140 | COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED | Exact branch semantics for the remaining outlet-temperature topology. |
| 3.142 | COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED | Exact affected extracted-energy boundary and service reporting contract. |
| 3.143 | COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED | Exact affected extracted-energy boundary and service reporting contract. |
| 3.148 | COOLING_GENERATOR_INPUT_TOPOLOGY_REQUIRED | Remaining generator-input topology branch not covered by direct expansion or air/water contracts. |
| 3.153 | COOLING_CAPACITY_LIMIT_UNMET_LOAD_CONTRACT_REQUIRED | Explicit unmet-load reporting/blocker contract for capacity-limited operation. |
| 3.165 | HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED | Absorption cooling multi-carrier topology. |
| 3.170 | HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED | Absorption recoverable-heat allocation and destination contract. |
| 3.174 | ABSORPTION_GENERATOR_PRODUCT_BRANCH_REQUIRED | Absorption driving-heat carrier and auxiliary carrier topology. |
| 3.182 | ABSORPTION_GENERATOR_EFFECTIVE_EER_BRANCH_REQUIRED | Absorption performance reporting within multi-carrier topology. |
| 3.4_EQ_34_LENI | SR_EN_15193_1_LIGHTING_ENGINE_REQUIRED | Full SR EN 15193-1 lighting engine; not inferred. |

## Validation Evidence

Focused validation completed during implementation:

- JavaScript physics system-energy tests;
- Building Platform Chapter 3 product integration tests;
- Python independent reference tests for heating, cooling and AHU;
- Chapter 3 coverage matrix synchronization tests.

Full repository validation, deployment and live production verification are recorded in the P8H final delivery response.

## Closure Assessment

`CHAPTER_3_SUPPORTED_SCOPE_NUMERICALLY_COMPLETE` cannot yet be recorded because supported cooling topology still has explicit final-result boundaries for 3.140, 3.142, 3.143, 3.148 and 3.153, and because absorption remains outside the implemented multi-carrier topology.

`MC001_CHAPTER_3_FULL_SCOPE_COMPLETE` is false. Full closure still requires the remaining cooling topology branches, absorption multi-carrier generation and the external SR EN 15193-1 lighting engine.
