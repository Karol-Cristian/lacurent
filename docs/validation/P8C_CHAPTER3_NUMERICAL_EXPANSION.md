# P8C Chapter 3 Numerical Expansion

## Scope

P8C converts Chapter 3 explicit final-value boundaries into calculated component
contracts where the owned MC001-2022 source defines deterministic relations and
the remaining inputs are legitimate project/product technical data.

No Chapter 2, Chapter 4, climate, or solar diagnostic formulas were changed.

## Starting State

The P8B matrix tracked 217 Chapter 3 slots:

| Classification | Count |
| --- | ---: |
| NUMERICALLY_IMPLEMENTED | 17 |
| PROCEDURALLY_IMPLEMENTED | 4 |
| EXPLICIT_INPUT_BOUNDARY | 195 |
| EXTERNAL_STANDARD_BLOCKED | 1 |
| NOT_APPLICABLE | 0 |

## Final State

P8C keeps one primary implementation classification per slot:

| Classification | Count |
| --- | ---: |
| NUMERICALLY_IMPLEMENTED | 46 |
| PROCEDURALLY_IMPLEMENTED | 4 |
| EXPLICIT_INPUT_BOUNDARY | 166 |
| EXTERNAL_STANDARD_BLOCKED | 1 |
| NOT_APPLICABLE | 0 |

Numerical implementation increased from 7.8% to 21.2%. Production-complete
supported-scope implementation increased from 9.7% to 23.0%.

## Converted Relation Group

P8C converts MC001 Chapter 3 DHW distribution and storage relations 3.200-3.228
from explicit final monthly values into calculated component contracts:

| Relations | Domain | New production contract |
| --- | --- | --- |
| 3.200 | DHW distribution temperature | `meanTemperatureInput` |
| 3.201-3.204 | Pipe linear transmittance | `linearTransmittanceInput` |
| 3.205-3.216 | Distribution losses and recovery | `lossCalculation.mode = dhw_distribution_loss_components` |
| 3.217-3.224 | Pump and heat-tracing auxiliaries | `auxiliaryCalculation.mode = dhw_recirculation_pump_auxiliary` or `dhw_heat_tracing_auxiliary` |
| 3.225-3.227 | Heat tracing/recoverable auxiliary flows | auxiliary component contract |
| 3.228 | Storage standing loss | `lossCalculation.mode = dhw_storage_standing_loss_single_volume` |

The prior explicit monthly fields remain valid only as explicit technical input
or legacy/expert override. They are no longer required when the component
contract is complete.

## Component Contracts

The canonical DHW component inputs are stored under
`technicalSystems.domesticHotWater.systems[].stages[]`.

Distribution loss contract:

- pipe length and equivalent length;
- pipe ambient temperature;
- water distribution temperature or profile input;
- pipe geometry;
- insulation thermal conductivity;
- outside heat-transfer coefficient;
- monthly operation time;
- recoverable pipe segment declaration where recovery is claimed.

Pump auxiliary contract:

- pressure drop or pressure-drop input contract;
- design flow;
- operation load factor;
- operation time;
- correction factor;
- control constants;
- energy efficiency index;
- optional recoverable fraction.

Storage loss contract:

- accessible storage volume factor;
- distribution storage loss factor;
- storage heat-transfer coefficient;
- storage setpoint temperature;
- storage ambient temperature;
- monthly calculation hours.

## Runtime and Traceability

The Building Platform adapter now evaluates DHW component contracts before
falling back to legacy explicit monthly values. Calculated stage sources include:

- `classification = NUMERICALLY_IMPLEMENTED`;
- formula identifiers for every executed MC001 relation;
- calculation-chain entries with execution traces;
- production eligibility;
- provenance (`product_data`, `expert_override`, or normative runtime result).

The report and engineering notebook distinguish `calculat normativ` from
explicit technical inputs.

## UI

The production calculator keeps the simple explicit monthly ACM mode and adds
an expert `Contract componente MC001` mode. In component mode, the user describes
pipe, pump and storage component data; the runtime calculates losses and
auxiliary energy.

The UI does not calculate losses. It maps user/product data into Building DNA,
then the Chapter 3 adapter executes the physics functions.

## Independent Validation

Validation added in P8C:

- Building Platform end-to-end DHW component-contract test;
- wizard UI mapping test for ACM component contracts;
- Chapter 3 matrix synchronization/count tests;
- independent Python reference tests for DHW pipe loss, pump auxiliary energy
  and storage standing loss.

Expected values in tests are independently derived from the normative equations,
not produced by the JavaScript runtime under test.

## Remaining Explicit Boundaries

After P8C, 166 slots remain explicit input boundaries. The matrix assigns each a
precise reason code instead of a generic placeholder.

Main remaining groups:

- heating emission/distribution/storage/generation losses and auxiliaries:
  `PROJECT_GEOMETRY_REQUIRED`, `PRODUCT_DATA_REQUIRED`,
  `OPERATION_SCHEDULE_REQUIRED`;
- cooling emission/distribution/storage/generation/rejection losses:
  `PRODUCT_DATA_REQUIRED`, `UNSUPPORTED_SYSTEM_TYPE`,
  `OPERATION_SCHEDULE_REQUIRED`;
- ventilation/AHU auxiliary terms beyond currently implemented fan equation:
  `PRODUCT_DATA_REQUIRED`, `OPERATION_SCHEDULE_REQUIRED`,
  `EXTERNAL_STANDARD_REQUIRED` where delegated;
- DHW generation/circulation/generator product performance:
  `PRODUCT_DATA_REQUIRED`, `USER_ENGINEERING_INPUT_REQUIRED`;
- lighting remains `EXTERNAL_STANDARD_BLOCKED` by SR EN 15193-1.

The remaining explicit boundaries are not counted as numerical implementation.

## Regression Boundaries

P8C preserves:

- Chapter 2 numerical behavior;
- P7 solar blocker `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED`;
- Chapter 4 PV;
- P8/P8B topology and useful DHW demand;
- multiple-system allocation;
- report execution-trace integrity;
- Worker persistence semantics.
