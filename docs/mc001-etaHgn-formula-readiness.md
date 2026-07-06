# MC001 etaHgn Formula Readiness

## Scope

C7A is a metadata-only source-pack milestone for the MC001-2022 heating gain utilization factor `etaH;gn;ztc;m`.

It does not implement runtime `etaHgn` calculation. It does not modify C6F, Worker/API, UI, migrations, package files, deployment config, or certificate behavior.

## Why C7A Exists After C6F/C6F1

C6F implemented a restricted heating-only monthly QHnd calculator that requires explicit `etaHgn`. C6F1 clarified that full MC001 monthly QHnd is still not implemented.

C7A narrows the next step: verify the exact source-backed formula candidates needed so a future C7B can optionally calculate `etaHgn` in the same restricted explicit-input domain.

## Exact Source Map

| Source | Page | Use |
| --- | ---: | --- |
| MC001-2022 section 2.7.5 | 112 | Effective internal heat capacity dependency for time constant path |
| MC001-2022 section 2.7.6 | 113 | Heating gain utilization factor text and symbol definitions |
| MC001-2022 figure 2.14 | 113 | `gammaH`, `etaH;gn`, and branch formulas |
| MC001-2022 relation 2.55 | 113 | `aH;ztc;m` dependency on reference parameters and `tauH;ztc;m` |
| MC001-2022 relation 2.57 | 116 | `tauH;ztc;m` dependency on capacity and heat-transfer coefficients |

Local source review used the repository MC001-2022 PDF and extracted nearby text for pages 112, 113, and 116. The page 113 figure formula glyphs are recorded through the already reviewed C6C/C6E metadata and rechecked against the surrounding text references.

## Figure 2.14 Formula Transcription

| Candidate | Condition | Expression | Status |
| --- | --- | --- | --- |
| Balance ratio | source figure definition | `gammaH;ztc;m = QH;gn;ztc;m / QH;ht;ztc;m` | `verified_for_future_runtime` |
| Heating eta, gamma not one | `gammaH;ztc;m > 0 and gammaH;ztc;m != 1` | `etaH;gn;ztc;m = (1 - gammaH;ztc;m ^ aH;ztc;m) / (1 - gammaH;ztc;m ^ (aH;ztc;m + 1))` | `verified_for_future_runtime` |
| Heating eta, gamma equals one | `gammaH;ztc;m = 1` | `etaH;gn;ztc;m = aH;ztc;m / (aH;ztc;m + 1)` | `verified_for_future_runtime` |

## Relation 2.55 Transcription

Relation 2.55 defines:

`aH;ztc;m = aH;0 + tauH;ztc;m / tauH;0`

C7A records this as metadata only. It does not encode source reference parameter values as runtime defaults. A future runtime should either require explicit `aH` or require explicit `aH0`, `tauH`, and `tauH0` values with source labels.

## Relation 2.57 Dependency

Relation 2.57 defines the heating time constant dependency:

`tauH;ztc;m = (Cm;eff;ztc / 3600) / (HH;tr(excl.grflr);ztc;m + HH;gr;adj;ztc + HH;ve;ztc;m)`

This path depends on effective capacity and heat-transfer coefficients. C7A records it as a source-backed dependency only. C7B can avoid this path by requiring explicit `aH`.

## Symbol Table

| Symbol | Meaning | Unit | C7A status |
| --- | --- | --- | --- |
| `etaH;gn;ztc;m` | heating gain utilization factor | dimensionless | formula source-packed, not runtime |
| `gammaH;ztc;m` | heating balance ratio | dimensionless | verified as explicit or calculated from `QHgn/QHht` |
| `aH;ztc;m` | heating utilization parameter | dimensionless | explicit input recommended for C7B |
| `aH;0` | reference parameter | dimensionless | source dependency only, no runtime value encoded |
| `tauH;ztc;m` | heating time constant | h | explicit input or future explicit relation 2.57 path |
| `tauH;0` | reference time constant | h | source dependency only, no runtime value encoded |
| `QH;gn;ztc;m` | total heating gains | kWh | explicit input until gains are implemented |
| `QH;ht;ztc;m` | total heating heat transfer | kWh | explicit input unless future phase wires C5 |

## Branch/Condition Table

| Branch | Runtime treatment |
| --- | --- |
| `gammaH;ztc;m = 1` | allowed in C7B only with explicit `aH` |
| `gammaH;ztc;m > 0 and gammaH;ztc;m != 1` | allowed in C7B only with explicit `aH` |
| `0 < gammaH <= 2` | restricted normal domain inherited from C6F/C6E |
| `gammaH <= 0` | excluded from first eta runtime |
| `gammaH near zero` | excluded pending targeted numeric tests |
| `gammaH > 2` | excluded from C6F/C7B restricted QHnd domain |
| `QHht <= 0` | excluded because gamma denominator must be positive |
| `QHgn < 0` | excluded from first eta runtime |
| missing `aH` and no fully explicit tau path | blocked because hidden defaults are not allowed |

## Formula Candidates

The registry object `MC001_R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK` records five source-backed formula candidates:

- `MC001_R8_GAMMA_H_BALANCE_RATIO`
- `MC001_R8_ETA_H_GN_GAMMA_NOT_ONE`
- `MC001_R8_ETA_H_GN_GAMMA_EQUALS_ONE`
- `MC001_R8_AH_PARAMETER_RELATION_2_55`
- `MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57`

All are metadata candidates. None are runtime calculators.

## Dependency Matrix

| Dependency | Status |
| --- | --- |
| `gammaH` | explicit or calculated from explicit `QHgn/QHht` |
| `QHht` | explicit input unless a future phase wires C5 |
| `QHgn` | explicit input until gains are implemented |
| `aH` | explicit input recommended for C7B |
| `aH0` | source referenced, not encoded as runtime value |
| `tauH` | explicit input or calculated only from explicit relation 2.57 inputs |
| `tauH0` | source referenced, not encoded as runtime value |
| `Cm` / effective capacity | source dependency only unless explicit input |
| `etaHgn` runtime | not implemented in C7A |
| C6F QHnd runtime | implemented with explicit `etaHgn` |
| full QHnd | blocked |
| QCnd | blocked |
| final energy | blocked |
| primary energy | blocked |
| CO2 | blocked |
| CPE/certificate | blocked |

## Runtime Readiness Verdict

`C7B_CAN_IMPLEMENT_RESTRICTED_ETA_HGN_RUNTIME_WITH_EXPLICIT_A_AND_GAMMA`

This verdict is limited to a restricted heating-only helper that accepts explicit `aH` and explicit or calculated `gammaH`. C7B must keep explicit `etaHgn` as an override/input path and must not introduce hidden defaults.

## What Remains Blocked

- Full QHnd.
- QCnd.
- Final energy.
- Primary energy.
- CO2.
- CPE/certificate.
- System losses.
- Normative default gains.
- Normative default solar data.
- Normative default capacity.
- Occupancy/schedule defaults.
- Long unoccupied or intermittent runtime behavior.
- Automatic `aH0`, `tauH0`, `tauH`, or `Cm` defaults.

## Recommendation for C7B

A. C7B can implement restricted etaHgn runtime with explicit aH/gammaH inputs.
