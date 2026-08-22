# P8E Chapter 3 Cooling, Shared Generation And Remaining Numerical Expansion

## Scope

P8E continues the P8B-P8D explicit-boundary conversion pattern for MC001 Chapter 3. The milestone converts source-backed cooling result boundaries into component contracts where MC001 formulas are already owned and product/project inputs can be supplied.

No Chapter 2, Chapter 4, climate or validated physics formulas were changed.

## Starting Classification

| Classification | Count |
| --- | ---: |
| NUMERICALLY_IMPLEMENTED | 80 |
| PROCEDURALLY_IMPLEMENTED | 4 |
| EXPLICIT_INPUT_BOUNDARY | 132 |
| EXTERNAL_STANDARD_BLOCKED | 1 |
| NOT_APPLICABLE | 0 |

## Final Classification

| Classification | Count |
| --- | ---: |
| NUMERICALLY_IMPLEMENTED | 108 |
| PROCEDURALLY_IMPLEMENTED | 4 |
| EXPLICIT_INPUT_BOUNDARY | 104 |
| EXTERNAL_STANDARD_BLOCKED | 1 |
| NOT_APPLICABLE | 0 |

Numerical coverage increased from 36.9% to 49.8%. Production-complete supported-scope coverage is 51.6%.

## Converted Relations

P8E converts 28 relation slots from explicit result boundaries to numerical runtime calculations:

- Cooling storage thermal losses: 3.99, 3.100, 3.101.
- Cooling storage pump auxiliary and recoverable flows: 3.115, 3.116, 3.117, 3.118, 3.119, 3.120, 3.121, 3.122.
- Cooling distribution loss and auxiliary factors: 3.146, 3.147.
- Cooling generator part-load and EER correction chain: 3.149, 3.150, 3.151, 3.152, 3.154, 3.155.
- Compression heat rejection and auxiliaries: 3.164, 3.173, 3.175, 3.176, 3.177, 3.178, 3.179, 3.180, 3.181.

## Component Contracts

The production cooling system model now supports component contracts through:

- `technicalSystems.cooling.systems[].stages[distribution].lossCalculation`
- `technicalSystems.cooling.systems[].stages[distribution].auxiliaryCalculation`
- `technicalSystems.cooling.systems[].stages[storage].lossCalculation`
- `technicalSystems.cooling.systems[].stages[storage].auxiliaryCalculation`
- `technicalSystems.cooling.systems[].stages[generation].auxiliaryCalculation`

Product data remains product data. For example, nominal EER, pump power, heat-rejection specific electric demand and control power are inputs; the resulting distribution losses, storage losses, storage auxiliary energy, heat-rejection auxiliary energy and effective EER are calculated by runtime.

## UI Mapping

The production wizard now keeps legacy explicit monthly cooling values for compatibility and adds a component-contract mode. Visible fields map to Building DNA and runtime consumers for:

- distribution loss/auxiliary factors;
- AHU cooling output requirement;
- no-storage branch or storage thermal/pump properties;
- generator operation hours, nominal capacity and nominal EER;
- heat-rejection table/product inputs;
- control power.

No new visible field is intentionally ignored.

## Runtime Traceability

Every newly numerical cooling result emits `NUMERICALLY_IMPLEMENTED` source metadata with formula IDs and a calculation chain. The Chapter 3 runtime also collects stage source formula IDs into `chapter3Result.formulaReferences`, so report/notebook consumers can trace the cooling component chain without reconstructing formulas.

## Remaining Boundaries

The remaining explicit-boundary groups are conservative:

| Group | Reason code | Exact missing input/source |
| --- | --- | --- |
| Alternative cooling generator branches | `PRODUCT_COEFFICIENT_REQUIRED` | Generator branch/product coefficients for generator types not covered by the supported compression plus heat-rejection contract. |
| Heat-rejection water/wet-bulb operating branches | `OPERATION_CONDITION_CONTRACT_REQUIRED` | Monthly water/wet-bulb operating temperatures and control state contract needed before the owned polynomial/table branches can be selected safely. |
| Cooling storage PCM/state relations outside the supported storage contract | `UNSUPPORTED_STORAGE_STATE_CONTRACT` | Project-specific PCM state variables and operating sequence not represented by the production cooling storage component contract. |
| Shared/central generators | `SERVICE_ALLOCATION_RULE_REQUIRED` | A source-backed rule or explicit engineering allocation for shared generator losses/auxiliaries across heating, cooling and DHW. P8E does not invent a load-priority or loss-allocation method. |
| DHW generation/circulation completion | `SHARED_GENERATOR_OR_PRODUCT_DATA_REQUIRED` | Generator identity/performance and circulation operating contracts beyond the already implemented useful-demand, distribution, pump, heat-tracing and storage-loss chains. |
| Remaining AHU coil/leakage/humidification branches | `AHU_COMPONENT_SCHEDULE_REQUIRED` | Coil, leakage, humidification and detailed operating schedule inputs must be represented before these branch results can be calculated. |
| Lighting | `EXTERNAL_STANDARD_REQUIRED` | SR EN 15193-1 equations/tables for the complete lighting engine are not present in the repository source packs. |

Shared generators remain intentionally per-service at runtime unless the project supplies an explicit allocation boundary. This avoids double counting one physical generator's losses as separate heating and DHW generators while preserving the existing P8 topology.

## Validation Evidence

- Building Platform cooling component-contract regression covers distribution, storage and heat-rejection auxiliaries.
- Wizard UI regression proves UI -> Building DNA -> runtime propagation.
- Python P3V adds independent cooling reference formulas.
- Chapter 3 coverage matrix is regenerated deterministically from the source-to-code fixture.
