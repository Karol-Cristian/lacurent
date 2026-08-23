# P8I Chapter 3 Final Numerical Closure

## Baseline

- Starting origin/main: `0795c73568281088a44dffec278a67a3ac6b7914`
- Starting classification: 217 tracked slots, 201 NUMERICALLY_IMPLEMENTED, 4 PROCEDURALLY_IMPLEMENTED, 11 EXPLICIT_INPUT_BOUNDARY, 1 EXTERNAL_STANDARD_BLOCKED, 0 NOT_APPLICABLE.
- P8I work queue was extracted from `validation-reference/chapter3-coverage-matrix.json` before code changes.

## Exact Starting Explicit-Boundary Queue

1. `3.38` - cross-service generator operation hours/load factors.
2. `3.140` - constant cooling distribution inlet setpoint.
3. `3.142` - cooling extracted energy limited by generator input.
4. `3.143` - AHU/zone cooling extracted energy limited by generator input.
5. `3.148` - cooling generator part-load value.
6. `3.153` - capacity-limited cooling generator input and unmet load accounting.
7. `3.165` - heat rejected by absorption cooling generator.
8. `3.170` - recoverable heat from absorption cooling generator.
9. `3.174` - absorption generator driving heat input.
10. `3.182` - absorption generator effective performance ratio.
11. `3.4_EQ_34_LENI` - LENI lighting boundary delegated to SR EN 15193-1.

## Implemented Closures

- `3.38` now runs through the shared-generator runtime via `technicalSystems.sharedComponents.generators[].operationTimeCalculation`, using `calculateHeatingGeneratorOperationTime`.
- `3.140` now has a dedicated runtime trace through `calculateCoolingDistributionInletConstantSetpoint`.
- `3.142` / `3.143` capacity-limited supplied cooling is runtime-calculated and propagated to monthly/system totals.
- `3.153` now exposes unmet cooling demand instead of silently treating unsupplied demand as satisfied.
- `3.148` now calculates PLV from bin, heat-rejection, free-cooling and multi-generator factors; absorption keeps the MC001 default/product branch.
- `3.165`, `3.170`, `3.174` and `3.182` are integrated for absorption cooling, including separated thermal and electric carrier energy.

## Energy Accounting

- Capacity-limited cooling distinguishes useful demand, supplied cooling and unmet cooling.
- Absorption cooling separates driving thermal input from electric auxiliaries in `carrierEnergy`.
- Whole-building carrier aggregation now prefers unique physical carrier-energy details when supplied by the runtime trace, preventing scalar stage input from being counted as one generic carrier.
- Existing P8G shared-generator invariants still prove physical fuel, losses, auxiliaries and service allocations reconcile without duplicate carrier accounting.

## Validation Evidence Added

- JavaScript physics unit tests for `3.140`, `3.148`, `3.153` and absorption/recovery relations.
- Integrated runtime tests for:
  - relation `3.38` through shared-generator `operationTimeCalculation`;
  - capacity-limited cooling supplied/unmet load propagation;
  - absorption multi-carrier aggregation.
- Building Platform tests for:
  - cooling capacity-limited component contracts;
  - absorption cooling thermal/electric carrier separation;
  - product trace formula IDs reaching reportable runtime sources.
- Python/P3V independent tests for:
  - constant cooling setpoint;
  - capacity-limited supplied and unmet cooling;
  - PLV;
  - absorption multi-carrier input.

## Final Coverage

- Total tracked slots: 217
- NUMERICALLY_IMPLEMENTED: 211
- PROCEDURALLY_IMPLEMENTED: 4
- EXPLICIT_INPUT_BOUNDARY: 1
- EXTERNAL_STANDARD_BLOCKED: 1
- NOT_APPLICABLE: 0
- Numerical coverage: 97.2%
- Production-complete supported-scope coverage reported by the matrix: 99.1%

## Remaining Boundary

`3.4_EQ_34_LENI` remains an explicit input boundary because MC001 Chapter 3.4 delegates detailed lighting energy to SR EN 15193-1. The repository does not own that standard's equations/tables. The runtime may aggregate explicit professional LENI/monthly lighting inputs, but it must not infer LENI.

## Closure Assessment

- `CHAPTER_3_SUPPORTED_SCOPE_NUMERICALLY_COMPLETE`: true for the currently implemented non-lighting HVAC, DHW, cooling, AHU, storage, shared-generator and carrier-accounting scope.
- `CHAPTER_3_SUPPORTED_SCOPE_NUMERICALLY_COMPLETE`: false if the supported scope is defined to include a numerical lighting/LENI engine, because `3.4_EQ_34_LENI` remains explicit.
- `MC001_CHAPTER_3_FULL_SCOPE_COMPLETE`: false. Full closure requires the externally delegated SR EN 15193-1 lighting method.

## Remaining Dependency

- SR EN 15193-1: detailed lighting/LENI calculation, including installed lighting energy, daylight controls, occupancy controls, parasitic energy and emergency lighting terms referenced by MC001.
