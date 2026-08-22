# P8G Shared Generation Topology

## Scope

P8G starts from `origin/main` commit `ce45133c9277e2d4f23875c25feebdfac6caaf6e`.

This increment closes the largest remaining Chapter 3 structural boundary: one physical generator serving more than one service. It does not infer missing service-allocation rules. Instead, it introduces a canonical shared-component model and treats service allocation fractions as explicit engineering inputs when MC001 does not provide a deterministic allocation rule in the owned sources.

## Canonical Building DNA Contract

Shared physical generators are owned once by:

`buildingDna.technicalSystems.sharedComponents.generators[]`

Service systems reference the physical component by stable ID:

- `technicalSystems.heating.systems[].generatorRef`
- `technicalSystems.domesticHotWater.systems[].generatorRef`

The normal production UI creates this topology through the assisted concept "Incalzirea si ACM folosesc acelasi generator". Users do not enter reference IDs manually. Expert/product data for the physical generator is entered once.

Each shared generator currently carries:

| Field | Source class | Purpose |
| --- | --- | --- |
| `componentId` | USER_REQUIRED / canonical identity | stable physical generator identity |
| `connectedServices` | USER_REQUIRED | service refs resolved by the adapter |
| `serviceAllocationFractions` | USER_REQUIRED | reporting allocation when no owned normative split rule exists |
| `energyCarrier` | USER_REQUIRED | physical carrier consumed by the generator |
| `auxiliaryCarrier` | USER_REQUIRED / PRODUCT_DATA boundary | physical carrier for generator auxiliaries |
| `controlLossFactor` | PRODUCT_DATA / expert input | relation 3.39 central output control factor |
| `operationHours` | OPERATION_SCHEDULE | schedule input used by generator loss and auxiliary energy |
| `lossPowerKW` | PRODUCT_DATA | generator standing/loss power |
| `auxiliaryPowerKW` | PRODUCT_DATA | physical auxiliary power |
| `recoveredAuxiliaryFraction` | EXPERT_OVERRIDE / project input | recovered share for relation 3.31/3.33 |
| `auxiliaryRecoverableFractionToHeating` | EXPERT_OVERRIDE / project input | recoverable share for relation 3.32 |
| `lossRecoverableFractionToHeating` | EXPERT_OVERRIDE / project input | recoverable generation-loss share |
| `boilerRoomRecoveryFactor` | EXPERT_OVERRIDE / project input | recoverable generation-loss recovery factor |
| `renewableGeneratorHeatKWh` | EXPERT_OVERRIDE / project input | explicit renewable generator heat term in relation 3.20 |
| `dhwStorageOrDistributionLossKWh` | EXPERT_OVERRIDE / project input | explicit DHW-side loss term in relation 3.20 |

Missing required fields block the shared-generator path. The runtime does not substitute zero for absent product, schedule or allocation inputs.

## Runtime Chain

For a service system with `generatorRef`, the local service chain is evaluated up to the generator boundary. The local generation stage becomes a traceable shared-reference stage instead of an independent physical generator.

For each month the integrated runtime forms:

1. heating generator demand after service emission/distribution/storage stages;
2. DHW generator demand after DHW useful-demand/distribution/storage stages;
3. physical shared generator output using relation 3.39;
4. physical generation loss using relation 3.27;
5. physical auxiliary energy using relation 3.37;
6. recovered/recoverable auxiliary and generation-loss quantities using relations 3.21, 3.28 and 3.33;
7. physical fuel input using relation 3.20;
8. service reporting allocations from the already calculated physical totals.

Carrier energy is aggregated from unique physical shared generators. Service references do not create carrier copies.

## Converted Relations

P8G promotes the following shared/central generation relations to `NUMERICALLY_IMPLEMENTED`:

| Relation | Runtime result |
| --- | --- |
| 3.19 | generator utilization factor from physical output and fuel input |
| 3.20 | fuel input energy from physical output, recovered auxiliary energy, generation loss, renewable heat and DHW-side losses |
| 3.21 | generator auxiliary total |
| 3.22 | total generation loss |
| 3.28 | recoverable generation loss total |
| 3.33 | total recovered generator auxiliary loss |
| 3.39 | central generator output from connected service loads and control-loss factor |

The shared-generator conversion raises the Chapter 3 matrix from:

| Metric | P8F | P8G |
| --- | ---: | ---: |
| Total tracked Chapter 3 slots | 217 | 217 |
| Numerically implemented | 152 | 159 |
| Procedurally implemented | 4 | 4 |
| Explicit-input boundary | 60 | 53 |
| External-standard blocked | 1 | 1 |
| Numerical coverage | 70.0% | 73.3% |
| Production complete supported-scope coverage | 71.9% | 75.1% |

## No-Double-Counting Invariants

The P8G runtime and tests enforce:

- a physical shared generator is calculated once per `componentId`;
- `sum(service allocated shared fuel) = physical shared fuel`;
- `sum(service allocated shared auxiliary) = physical shared auxiliary`;
- `sum(service allocated shared loss) = physical shared loss`;
- carrier totals are aggregated from physical components, not service references;
- a broken `generatorRef` blocks calculation instead of falling back to a local/default generator.

Reference monthly case:

| Quantity | Value |
| --- | ---: |
| Heating service load before shared generator | 103.0000 kWh |
| DHW service load before shared generator | 53.0000 kWh |
| Physical central output, relation 3.39 | 161.1500 kWh |
| Physical generation loss, relation 3.27 | 20.0000 kWh |
| Physical auxiliary, relation 3.37 | 5.0000 kWh |
| Recovered auxiliary | 1.0000 kWh |
| Fuel input, relation 3.20 | 180.1500 kWh |
| Heating allocated final energy, 65% | 120.3475 kWh |
| DHW allocated final energy, 35% | 64.8025 kWh |

## Remaining Boundaries

The remaining explicit boundaries in `validation-reference/chapter3-coverage-matrix.json` remain conservative. Shared generation leaves only the following shared/central generation edge as explicit:

| Relation | Reason |
| --- | --- |
| 3.38 | `CENTRAL_GENERATOR_OPERATION_TIME_CONTRACT_REQUIRED`: production currently accepts monthly/scalar `operationHours`; a full owned-source cross-service operation-time derivation from service-specific schedules is not yet integrated through UI, runtime and P3V. |

Other remaining groups are outside the P8G shared-generator closure:

- AHU 3.92-3.93: `AHU_BRANCH_CONTRACT_FOR_RELATIONS_3_92_3_93_REQUIRED`.
- Cooling storage/PCM state models and geometry.
- Cooling generator/product branches that still require dedicated component contracts.
- Lighting: `SR_EN_15193_1_LIGHTING_ENGINE_REQUIRED`.

## Validation Evidence

Focused tests added or updated:

- `src/physics-engine/tests/mc001Chapter3IntegratedRuntime.test.mjs`
- `src/building-platform/tests/buildingChapter3InstallationsProduct.test.mjs`
- `tests/building-platform-wizard-ui.mjs`
- `validation-reference/python-mc001/tests/test_chapter3_heating.py`
- `tests/chapter3-coverage-matrix.mjs`

These tests cover runtime physical totals, service allocation reconciliation, carrier aggregation, broken-reference blockers, UI-to-Building-DNA mapping and independent Python reference parity for the shared heating+DHW generator case.
