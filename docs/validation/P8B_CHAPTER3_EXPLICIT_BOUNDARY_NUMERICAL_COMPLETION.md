# P8B Chapter 3 Explicit-Boundary Numerical Completion

Base: `ceb327390ba7a893bae1a41110e7f4de0418b7f5`

P8B separates Chapter 3 coverage into primary implementation classes. A relation is no longer counted as numerically implemented merely because the production runtime can accept an explicit technical value for its result.

## Coverage Classification

The canonical matrix is `validation-reference/chapter3-coverage-matrix.json`.

| Classification | Meaning |
| --- | --- |
| `NUMERICALLY_IMPLEMENTED` | The runtime calculates the relation result from lower-level inputs and exposes source/test/report traceability. |
| `PROCEDURALLY_IMPLEMENTED` | The runtime implements a normative aggregation, topology or allocation procedure, but not an independent component formula. |
| `EXPLICIT_INPUT_BOUNDARY` | The production chain still requires the relation result or a required upstream technical value to be supplied explicitly. |
| `EXTERNAL_STANDARD_BLOCKED` | MC001 delegates the needed calculation to an external standard that is not present in the repository. |
| `NOT_APPLICABLE` | The relation is not applicable to the currently supported MC001 scope. |

## Boundary Converted in P8B

Domestic hot-water useful demand relations `3.188` through `3.197` are now production-integrated through `technicalSystems.domesticHotWater.usefulDemandSource`.

Supported source-backed modes:

- `residential_normative`: derives equivalent consumers from Building DNA area/type, applies MC001 residential specific-demand equations, temperature correction and monthly useful energy.
- `table_3_3_1`: uses the reviewed MC001 Tabel 3.3.1 row, applies temperature correction and monthly useful energy.
- `explicit_monthly`: preserved for old projects and expert inputs, but reported as `EXPLICIT_INPUT_BOUNDARY`.

The new runtime path is:

`Building DNA -> buildingChapter3InstallationsAdapter -> dhwUsefulDemand.mjs -> mc001Chapter3IntegratedRuntime -> notebook/report`

The calculated DHW source carries `NUMERICALLY_IMPLEMENTED` classification, formula IDs, execution trace and production eligibility. Old saved `monthlyUsefulDemandKWh` values remain valid expert explicit inputs and are not reinterpreted as normative-derived values.

## Remaining Explicit Boundary Groups

Heating:

- Emission, distribution, storage and generation stage losses remain explicit unless the detailed project/product inputs for the relevant helper formulas are supplied.
- Generator coefficients, standby losses, auxiliary powers and recoverable fractions require manufacturer data, project-specific technical data or externally delegated coefficient tables.

Cooling:

- Distribution and generator stage losses remain explicit in the production service chain.
- Heat-rejection helper relations and tables are implemented, but product/project-specific operating conditions, generator performance and heat-rejection configuration still gate full production integration.

Ventilation/AHU:

- Fan electric energy and ventilation auxiliary total are production-integrated.
- Coil loads, humidification, leakage, heat-recovery and control details remain explicit/project-specific until the full AHU input contract is exposed.

Cooling storage:

- PCM relations `3.111` through `3.113` are production-integrated.
- Other storage relations remain helper-level or explicit until complete storage component, pump and thermal-loss inputs are supplied.

DHW distribution/storage:

- Pipe, pump and storage helper formulas are implemented and unit-tested.
- The production system chain still uses explicit distribution/storage/generation stage losses unless detailed pipe networks, pump operation and storage-product data are supplied.

Lighting:

- MC001 LENI aggregation remains an explicit boundary.
- The complete lighting engine remains blocked by the unavailable SR EN 15193-1 equations/tables.

## Numerical Impact

Existing Chapter 2, Chapter 3 explicit fixture and P3V numerical oracle behavior is preserved unless a project selects the new DHW calculated source. In that case, DHW useful demand is calculated from the MC001-owned source chain instead of being supplied as a monthly kWh value.

## Validation Evidence

P8B adds deterministic tests for:

- residential DHW useful-demand derivation from Building DNA area/type;
- non-residential DHW useful-demand derivation from Tabel 3.3.1;
- preservation of explicit monthly DHW provenance for old projects;
- UI mapping to `usefulDemandSource`;
- P8B coverage-matrix primary classifications and explicit-boundary register.

## Remaining External Dependency

`SR EN 15193-1` remains required for the complete lighting calculation engine. MC001 provides only the enclosing aggregation for explicit LENI/subspace values.
