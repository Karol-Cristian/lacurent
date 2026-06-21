# MC001 DHW Useful Demand Helper From Source

## Status

- Task id: `MC001_DHW_USEFUL_DEMAND_HELPER_FROM_SOURCE`
- Result: helper implementation is source-confirmed for useful DHW demand delivered to the user, `QW,nd`.
- Scope: MC001 relations (3.188)-(3.196) and Anexa 3.3.A apartment worked example.
- Helper file: `src/physics-engine/dhwUsefulDemand.mjs`
- Test file: `src/physics-engine/tests/dhwUsefulDemand.test.mjs`
- No product integration, orchestrator, UI, worker, DB/schema/API, deploy, push, certificate/class/RER, final energy, primary energy, distribution loss, storage loss, generation loss, or auxiliary-energy logic was added.

## Source Pages Inspected

- PDF page 251: DHW calculation periods and context.
- PDF page 252: DHW temperatures and relation (3.188) context.
- PDF page 253: relation (3.188) symbols, residential relation (3.189), tertiary relation (3.190), and reference-temperature notes.
- PDF page 254: temperature correction relation (3.191) and single-family equivalent-consumer branch start.
- PDF page 255: apartment equivalent-consumer branches, residential specific volume relation (3.196), and non-residential service unit `f`.
- PDF pages 256-257: Tabel 3.3.1 numeric specific-demand rows and residential formula-reference rows.
- PDF page 268: Anexa 3.3.A apartment example input `Ah = 75 m2`, `thetaW,draw = 45 degC`, `thetaW,c = 10 degC`, and equivalent-consumer calculation.
- PDF page 269: Anexa 3.3.A residential specific volume, temperature correction, daily volume, and useful-energy result.

## Exact Formulas Confirmed

| Formula | Source | Helper coverage |
| --- | --- | --- |
| `QW,nd = Vt * cW * rhoW * (thetaW,draw - thetaW,c) / 1000` | (3.188) | `calculateDhwUsefulEnergyDemand()`, `calculateDhwUsefulEnergyFromVolume()` |
| `VW,day = VW,P,day * nP` | (3.189) | `calculateDhwDailyVolumeResidential()`, `calculateResidentialDailyDhwVolume()` |
| `VW,day = VW,f,day * f` | (3.190) | `calculateDhwDailyVolumeNonResidential()`, `calculateTertiaryDailyDhwVolume()`, `calculateDhwDailyVolumeFromTable3_3_1()` |
| `Vcorrected = Vnorm * (thetaRefHot - thetaRefCold) / (thetaDraw - thetaCold)` | (3.191) | `calculateDhwSpecificDemandTemperatureCorrection()`, `correctDhwSpecificVolumeForTemperature()` |
| single-family `nP,eq,max` and `nP,eq` | (3.192), (3.193) | single-family equivalent-consumer helpers and `calculateResidentialEquivalentConsumers()` |
| apartment `nP,eq,max` and `nP,eq` | (3.194), (3.195) | apartment equivalent-consumer helpers and `calculateResidentialEquivalentConsumers()` |
| `VW,P,day = min(x, y * Ah / nP,eq)` with `x = 40.71`, `y = 3.26` | (3.196) | `calculateDhwResidentialSpecificDailyDemand()`, `calculateResidentialSpecificDhwVolume()` |

## Interpretation Check

The extracted interpretation is correct with one source-display correction:

- Residential specific demand uses reference temperatures `60 degC / 13.5 degC`.
- Tabel 3.3.1 tertiary values use reference temperatures `60 degC / 10 degC`.
- The Anexa 3.3.A final daily-volume display uses rounded intermediate values, not the fully unrounded chain.

For the apartment example:

| Item | Source / formula result |
| --- | ---: |
| `Ah` | `75 m2` |
| `nP,eq,max` | `0.035 * 75 = 2.625` |
| `nP,eq` | `1.75 + 0.3 * (2.625 - 1.75) = 2.0125 ~= 2.02` |
| `VW,P,day,norm` | `min(40.71, 3.26 * 75 / 2.0125) = 40.71 l/om,zi` |
| exact corrected `VW,P,day` | `40.71 * (60 - 13.5) / (45 - 10) = 54.086... l/om,zi` |
| source displayed corrected `VW,P,day` | `54.08 l/om,zi` |
| exact daily volume from unrounded helpers | `54.086... * 2.0125 = 108.848... l/zi` |
| source displayed daily volume | `54.08 * 2.02 ~= 109.25 l/zi` |
| source useful energy | `109.25 l/zi`, `cW = 4.186 kJ/kgK`, `rhoW = 1000 kg/m3`, `45 - 10 K` gives about `4.45 kWh/zi` after unit conversion |

Validation policy: assert exact helper formulas for unrounded calculations, and assert the Anexa 3.3.A displayed daily volume with tolerance because the source uses rounded displayed intermediates.

## Tests Added

`src/physics-engine/tests/dhwUsefulDemand.test.mjs` now validates:

- general useful energy from explicit volume and temperature delta;
- source-named helper wrappers;
- tertiary daily volume `VW,day = tableSpecificDemand * serviceUnits`;
- residential temperature correction from `60/13.5` to `45/10`;
- Anexa 3.3.A apartment chain for `Ah = 75 m2`;
- source-rounded daily volume around `109.25 l/zi`;
- source useful energy around `4.45 kWh/zi`;
- residential area branch boundaries already extracted from MC001.

## Remaining DHW Blockers

- Distribution losses are not implemented in this helper.
- Storage losses are not implemented in this helper.
- Generation losses and generator efficiency are not implemented in this helper.
- Auxiliary energy is not implemented in this helper.
- DHW final energy is not implemented in this helper.
- Anexa B service unit counts are not yet cleaned into an executable fixture.
- Relation (3.197) water loss/waste penalization is outside this helper scope.
- Residential exact-boundary interpretation is covered only where MC001 explicitly gives inclusivity; no extra edge-case assumptions are added.

## Recommended Next Validation Target

Next safest validation target: a reviewed Anexa B DHW service-unit fixture only if source rows provide explicit building/use categories, unit counts, temperatures, and period/schedule information that can be combined with `dhwUsefulDemand.mjs`. If those rows remain unclear, keep DHW final/service validation blocked and choose another explicit-row Physics Engine target.
