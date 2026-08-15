# P8D Chapter 3 Heating And Ventilation Numerical Expansion

## Scope

P8D continues from the certified P8C Chapter 3 matrix and converts implementable
heating and ventilation/AHU explicit result boundaries into component-contract
calculations. It does not change Chapter 2, Chapter 4, or previously validated
MC001 formulas.

The production flow remains:

User system description -> Building DNA component contract -> Chapter 3 adapter
-> MC001 physics helper -> execution trace/source classification ->
notebook/report.

## Coverage

| Classification | P8C | P8D |
| --- | ---: | ---: |
| NUMERICALLY_IMPLEMENTED | 46 | 80 |
| PROCEDURALLY_IMPLEMENTED | 4 | 4 |
| EXPLICIT_INPUT_BOUNDARY | 166 | 132 |
| EXTERNAL_STANDARD_BLOCKED | 1 | 1 |
| NOT_APPLICABLE | 0 | 0 |

Numerical coverage increased from 21.2% to 36.9%.
Production-complete supported-scope coverage increased from 23.0% to 38.7%.

The canonical machine-readable matrix is
`validation-reference/chapter3-coverage-matrix.json`.

## Heating Relations Converted

The following heating relations are now calculated through
`technicalSystems.heating.systems[].stages[]` component contracts:

- 3.1-3.3: emission temperature-increase loss, emission input energy and emission efficiency source trace.
- 3.4-3.10: hydronic pressure/design/reference pump-power chain and distribution auxiliary energy.
- 3.11-3.12: setback and boost pump auxiliary adders when those operating inputs are supplied.
- 3.13-3.14: recoverable and recovered distribution auxiliary energy.
- 3.17: generator standby loss power from envelope/chimney fractions and delivered power.
- 3.23-3.27: generator load/full-load/intermediate factor, branch loss power and loss energy.
- 3.29-3.32: generator envelope and auxiliary recoverable/recovered loss terms.
- 3.34-3.37: generator auxiliary power low/high load, intermediate factor and auxiliary energy.

Product/manufacturer inputs remain PRODUCT_DATA or expert technical inputs.
The calculated result is no longer supplied directly for these relations.

## Ventilation/AHU Relations Converted

The following ventilation/AHU relations are now calculated through
`technicalSystems.ventilationAhu.systems[].*AuxiliaryCalculation` contracts:

- 3.69: rotary heat-recovery auxiliary energy.
- 3.70: pump heat-recovery auxiliary energy.
- 3.71: zero auxiliary branch for other heat-recovery systems.
- 3.73: preheater energy.
- 3.74: no-preheater zero branch.
- 3.75: ventilation control auxiliary energy.

Fan energy relations 3.55 and 3.68 remain numerically implemented from earlier
milestones.

## Remaining Heating Explicit Boundaries

The remaining heating boundaries are deliberately not promoted:

- 3.15, 3.16, 3.18: coefficient/product branches require exact coefficient
  selection or product data contracts not yet exposed as the preferred generator
  path.
- 3.19, 3.20: generator utilization/fuel input requires the complete
  shared-generator fuel/renewable-energy boundary before it can be claimed as a
  production end-to-end relation.
- 3.21, 3.22, 3.28, 3.33: central generation totals require a canonical
  multi-service shared-generator topology across heating, DHW and other services.
- 3.38, 3.39: central generator operation time/output require cross-service use
  hours, load factors and control-loss contracts not yet represented end-to-end.

These are not counted as numerical simply because the low-level helper exists.

## Component Contracts

Heating component contracts added or extended:

- emission: `heating_emission_temperature_increase`;
- distribution auxiliary: `heating_hydronic_pump_auxiliary` with optional
  setback/boost adders and recoverability;
- storage: `no_heating_storage` explicit topology branch;
- generation loss: `heating_generator_loss_power_curve` with optional standby
  and envelope-recoverable inputs;
- generation auxiliary: `heating_generator_auxiliary_power_curve`.

Ventilation/AHU component contracts added:

- `rotary_heat_recovery_auxiliary`;
- `pump_heat_recovery_auxiliary`;
- `other_heat_recovery_auxiliary_zero`;
- `preheater_energy`;
- `no_preheater`;
- `control_auxiliary_energy`.

Legacy explicit monthly values remain backward-compatible and are reported as
explicit technical input, not calculated normative results.

## Validation

New validation added:

- JavaScript Chapter 3 product tests for heating component contracts.
- JavaScript Chapter 3 product tests for ventilation auxiliary component contracts.
- Wizard UI mapping tests for heating and ventilation component contracts.
- Independent Python reference tests for heating emission, hydronic pump,
  generator loss/auxiliary and recovery formulas.
- Independent Python reference tests for ventilation heat-recovery, preheat and
  control auxiliary formulas.
- Coverage matrix invariants for the P8D classifications.

## Regression Policy

P8D preserves:

- Chapter 2 runtime and solar diagnostic behavior;
- P8/P8B/P8C topology and DHW component calculations;
- explicit LENI lighting boundary and SR EN 15193-1 external dependency;
- multiple-system allocation rules;
- legacy explicit Chapter 3 values.

