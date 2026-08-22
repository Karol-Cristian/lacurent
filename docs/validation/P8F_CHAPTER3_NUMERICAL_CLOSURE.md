# P8F Chapter 3 Numerical Closure

## Scope

P8F starts from `origin/main` commit `3d786d5878f4b4d9c7c5701c267efe5e9fdd0c09`.

This increment does not declare full MC001 Chapter 3 completion. It closes two source-backed production gaps:

- Cooling compression delivered-electric input now drives the cooling generation stage energy instead of remaining a trace-only value.
- AHU thermal, fan, pressure, leakage, distribution-airflow and zone/part-load airflow relations 3.40-3.91 are connected through canonical ventilation/AHU component contracts where owned MC001 formulas plus project/product inputs are sufficient. Trace-only AHU thermal/load quantities are carried to runtime/report traceability without being added to annual auxiliary electricity totals.

## EER Investigation

P8E production verification observed a weak and counterintuitive sensitivity:

| Case | Reported cooling |
| --- | ---: |
| EER = 3 | 866.62 kWh/year |
| EER = 4 | 866.74 kWh/year |

Root cause:

- `calculateCoolingGeneratorAuxiliaryContract()` calculated `EC,gen,el,in` and effective EER.
- The integrated Chapter 3 runtime used the generic subsystem heat balance for the cooling generation stage.
- The generic balance consumed only heat-rejection/control auxiliary energy as `auxiliaryKWh`.
- The compression electric input was present in provenance but not propagated as delivered stage input.

Fix:

- Added `MC001_3_181_COOLING_COMPRESSION_DELIVERED_ELECTRIC_INPUT`.
- The cooling generation adapter now emits a stage input override equal to `EC,gen,el,in + Waux,el,in`.
- The integrated runtime uses that override only for stages that explicitly provide it.
- Stage loss/auxiliary values remain visible; formulas 3.173, 3.180 and 3.181 are unchanged.

Controlled monthly sensitivity:

| Nominal EER | Useful generator load | Compressor electric | Heat rejected | Aux electric | Delivered electric |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 166.2500 | 83.1250 | 249.3750 | 9.1391 | 92.2641 |
| 3 | 166.2500 | 55.4167 | 221.6667 | 8.6570 | 64.0737 |
| 4 | 166.2500 | 41.5625 | 207.8125 | 8.4159 | 49.9784 |
| 5 | 166.2500 | 33.2500 | 199.5000 | 8.2713 | 41.5213 |

The expected monotonic decrease is now enforced by JS integration tests and independent Python reference tests.

## AHU Numerical Expansion

The following relations now have production component contracts:

| Relation | Runtime quantity | Contract path |
| --- | --- | --- |
| 3.40 | AHU heating coil required energy | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.heatingCoil` |
| 3.41 | AHU heat recovery energy | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.heatRecovery` |
| 3.42 | Recirculation air heating energy | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.recirculationHeating` |
| 3.43 | AHU cooling coil required energy | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.coolingCoil` |
| 3.44 | Dehumidification cooling energy | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.dehumidification` |
| 3.45 | Humidification generator input energy | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.humidification` |
| 3.46 | Non-steam humidification auxiliary zero branch | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.humidificationAuxiliary` |
| 3.47 | AHU generation loss, conditioned location | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.generationLoss` |
| 3.48 | AHU generation loss, unconditioned location | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.generationLoss` |
| 3.49-3.50 | Recoverable AHU generation loss | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.recoverableGenerationLoss` |
| 3.51 | Balanced residential fan temperature-rise zero branch | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.fanTemperatureRise` |
| 3.52 | Fan temperature rise from pressure drop and efficiency | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.fanTemperatureRise` |
| 3.53-3.54 | Extract-air temperature into heat recovery | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.extractAirTemperatureForRecovery` |
| 3.56 | Fan efficiency from nominal efficiency and airflow factor | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.fanEfficiency` |
| 3.57-3.62 | Quadratic pressure-drop branches | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.quadraticPressureDrop` |
| 3.63-3.64 | Multizone constant pressure-drop branches | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.multiZoneConstantPressureDrop` |
| 3.65-3.66 | Multizone minimum pressure-drop branches | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.multiZoneMinimumPressureDrop` |
| 3.67 | Ground preheat/precool energy | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.groundPreheatPrecool` |
| 3.72 | Fan energy assigned to heat-recovery pressure drop | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.fanEnergyAssignedToHeatRecovery` |
| 3.76 | Steam humidification pump auxiliary zero branch | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.steamHumidificationPumpAuxiliary` |
| 3.77 | Humidification pump auxiliary energy | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.humidificationPumpAuxiliary` |
| 3.78-3.80 | Duct/AHU leakage factors and airflow | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.*Leakage*` |
| 3.81-3.82 | Required supply/extract distribution airflow | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.required*DistributionAirFlow` |
| 3.83-3.84 | Supply/extract airflow allocation to zone | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.*AirFlowZoneAllocation` |
| 3.85-3.87 | Duct leakage flow from leakage factor | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.ductLeakageFlowFromFactor` |
| 3.88 | Maximum zone flow factor | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.maximumZoneFlowFactor` |
| 3.89-3.90 | Part-load AHU airflow | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.partLoadAhuAirFlow` |
| 3.91 | Maximum flow factor from part load | `technicalSystems.ventilationAhu.systems[].thermalRelationCalculations.maximumFlowFactorFromPartLoad` |

Accounting rule:

- AHU thermal relation outputs are reported as calculated Chapter 3 quantities.
- They are not added to `annual.ventilationAuxiliaryKWh`.
- Electrical auxiliary totals remain limited to fan, heat-recovery auxiliary, preheat auxiliary and control auxiliary branches.

## Coverage

| Metric | P8E | P8F |
| --- | ---: | ---: |
| Total tracked Chapter 3 slots | 217 | 217 |
| Numerically implemented | 108 | 152 |
| Procedurally implemented | 4 | 4 |
| Explicit-input boundary | 104 | 60 |
| External-standard blocked | 1 | 1 |
| Numerical coverage | 49.8% | 70.0% |
| Production complete supported-scope coverage | 51.6% | 71.9% |

## Remaining Boundaries

The remaining explicit boundaries are not closed by this increment. They are grouped in `validation-reference/chapter3-coverage-matrix.json` and remain conservative:

- Heating/shared generation: `PRODUCT_OR_SR_EN_15316_4_1_COEFFICIENTS_C5_C6_REQUIRED`, `PROJECT_ENVELOPE_AND_CHIMNEY_OFF_LOSS_FRACTIONS_REQUIRED`, `OTHER_SERVICE_GENERATOR_AUXILIARY_ALLOCATIONS_REQUIRED`, `CENTRAL_GENERATOR_SERVICE_INPUTS_AND_CONTROL_LOSS_FACTOR_REQUIRED` and related cross-service operation/fuel/recovery contracts.
- AHU: `AHU_BRANCH_CONTRACT_FOR_RELATIONS_3_92_3_93_REQUIRED`.
- Cooling storage/PCM: state-model and geometry contracts such as `COOLING_STORAGE_INPUT_BOUNDARY_STATE_MODEL_REQUIRED`, `ICE_STORAGE_INITIAL_GEOMETRY_REQUIRED`, `PCM_STORAGE_SOLID_MASS_STATE_REQUIRED` and `COOLING_STORAGE_GENERATOR_DELTA_ENERGY_STATE_REQUIRED`.
- Cooling generator/distribution/heat rejection: topology and product-branch contracts such as `COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED`, `COOLING_CAPACITY_LIMIT_UNMET_LOAD_CONTRACT_REQUIRED`, `HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED`, `HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED` and `ABSORPTION_GENERATOR_PRODUCT_BRANCH_REQUIRED`.
- Lighting remains explicitly bounded by `SR_EN_15193_1_LIGHTING_ENGINE_REQUIRED` and externally blocked by SR EN 15193-1.

## Validation Evidence

Focused validation added or updated:

- `src/building-platform/tests/buildingChapter3InstallationsProduct.test.mjs`
- `validation-reference/python-mc001/tests/test_chapter3_cooling.py`
- `validation-reference/python-mc001/tests/test_chapter3_ventilation.py`
- `tests/chapter3-coverage-matrix.mjs`

The P8F implementation must still pass the full regression suite before merge/deploy.
