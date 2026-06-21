# MC001 DHW Useful Demand Formula Extraction

## Status

- Task id: `MC001_DHW_USEFUL_DEMAND_FORMULA_EXTRACTION`
- Result: isolated DHW useful-demand helper implementation is justified for MC001 relations (3.188)-(3.196), with explicit inputs only.
- Helper added: `src/physics-engine/dhwUsefulDemand.mjs`
- Test added: `src/physics-engine/tests/dhwUsefulDemand.test.mjs`
- Scope: useful DHW demand and daily volume formulas only.
- No product flow, UI, worker, DB/schema/API, orchestrator, deploy, push, certificate, class, RER, or DHW final-energy system integration was added.

## Source Pages Inspected

- MC001-2022 PDF page 251: DHW calculation context and calculation periods.
- MC001-2022 PDF page 252: DHW temperatures and useful-demand relation (3.188) context.
- MC001-2022 PDF page 253: relation (3.188) input definitions, relations (3.189) and (3.190), and temperature bases for residential and table values.
- MC001-2022 PDF page 254: relation (3.191) temperature correction and relation (3.192) single-family equivalent-consumer maximum.
- MC001-2022 PDF page 255: relations (3.193)-(3.196), residential coefficients `x = 40.71` and `y = 3.26`, and non-residential unit-count definition.
- MC001-2022 PDF pages 256-257: Tabel 3.3.1 numeric DHW specific-demand values and residential rows that redirect to chapter 3.3.6.1.
- MC001-2022 PDF pages 268-269: Anexa 3.3.A apartment worked example for `Ah = 75 m2`.
- `docs/mc001-extraction/09_dhw_systems.md`
- `src/physics-engine/datasets/mc001DhwDemandTable3_3_1.mjs`

## Extracted Formula Scope

| Formula | Source | Implemented helper | Inputs required |
| --- | --- | --- | --- |
| `QW,nd = Vt * cW * rhoW * (thetaW,draw - thetaW,c) / 1000` | (3.188) | `calculateDhwUsefulEnergyDemand()` | timestep volume in litres, explicit `cW`, explicit density, draw-off temperature, cold-water temperature |
| `VW,day = VW,P,day * nP` | (3.189) | `calculateDhwDailyVolumeResidential()` | residential specific daily demand and equivalent consumers |
| `VW,day = VW,f,day * f` | (3.190) | `calculateDhwDailyVolumeNonResidential()` and `calculateDhwDailyVolumeFromTable3_3_1()` | specific daily demand, explicit service unit count; table wrapper requires reviewed Tabel 3.3.1 row id |
| `VW,f,day = VW,f,day,norme * (thetaW - thetaW,c) / (thetaW,draw - thetaW,c)` | (3.191) | `calculateDhwSpecificDemandTemperatureCorrection()` | normative demand, reference hot/cold temperatures, target draw/cold temperatures |
| single-family `nP,eq,max` piecewise formula | (3.192) | `calculateDhwEquivalentConsumersMaxSingleFamily()` | living area `Ah` |
| single-family `nP,eq` reduction | (3.193) | `calculateDhwEquivalentConsumersSingleFamily()` | `nP,eq,max` |
| apartment `nP,eq,max` piecewise formula | (3.194) | `calculateDhwEquivalentConsumersMaxApartment()` | living area `Ah` |
| apartment `nP,eq` reduction | (3.195) | `calculateDhwEquivalentConsumersApartment()` | `nP,eq,max` |
| `VW,P,day = min(x, y * Ah / nP,eq)` | (3.196) | `calculateDhwResidentialSpecificDailyDemand()` | living area, equivalent consumers, MC001 coefficients `x = 40.71`, `y = 3.26` |

Source-named wrappers also exist for the same isolated formulas: `calculateDhwUsefulEnergyFromVolume()`, `correctDhwSpecificVolumeForTemperature()`, `calculateResidentialEquivalentConsumers()`, `calculateResidentialSpecificDhwVolume()`, `calculateResidentialDailyDhwVolume()`, and `calculateTertiaryDailyDhwVolume()`.

## Required Inputs

- Specific demand:
  - Non-residential/use-category rows use reviewed Tabel 3.3.1 values.
  - Residential rows 1-2 remain blocked as numeric table rows, but are helper-covered through chapter 3.3.6.1 formulas when `Ah` is explicit.
- Service unit count:
  - Non-residential formula requires explicit `f`.
  - The source says this is obtained from the beneficiary/administrator; Anexa B service unit counts are not yet cleaned into a fixture.
- Temperatures:
  - Cold water default data note: `10 degC`.
  - DHW network/reference recommendation: `60 degC`.
  - Draw-off recommended value: `45 degC`; minimum value: `42 degC`.
  - Residential specific demand is stated at `60 degC` and cold water `13.5 degC`.
  - Tabel 3.3.1 values are stated at `60 degC` and cold water `10 degC`.
- Constants:
  - MC001 allows water density `rhoW = 1000 kg/m3`.
  - `cW` is defined by MC001 as water specific heat in `kWh/kgK`, but no numeric default was extracted in these source pages. The helper therefore requires `specificHeatKWhPerKgK` explicitly.
- Days or operating schedule:
  - Relation (3.188) calculates a timestep value from `Vt`, which may be daily or hourly.
  - No annual default days or schedule is implemented. For annual demand, the caller/test must provide a traced period volume or explicit daily/hourly aggregation outside this helper.

## Implementation Decision

Classification: `IMPLEMENT_ISOLATED_USEFUL_DEMAND_HELPER`.

Reason:

- Relations (3.188)-(3.196) are readable, unit-scoped, and do not require climate data, product orchestration, database state, UI state, or system-final-energy assumptions.
- Required service quantities, temperatures, density, and specific heat are accepted as explicit inputs.
- Tabel 3.3.1 is already represented as a reviewed numeric dataset for the non-residential specific-demand lookup.
- The helper does not infer service unit counts, annual days, system efficiencies, distribution losses, storage losses, generation losses, final energy, primary energy, or CO2.

## Validation Added

`src/physics-engine/tests/dhwUsefulDemand.test.mjs` validates:

- relation (3.188) useful DHW energy from explicit timestep volume and explicit constants;
- relation (3.189) residential daily volume;
- relation (3.190) non-residential daily volume;
- reviewed Tabel 3.3.1 lookup through the office row;
- missing table-row status for unknown ids;
- relation (3.191) temperature correction for both table basis `60/10` and residential basis `60/13.5`;
- relation (3.192) single-family branch boundaries;
- relation (3.193) single-family equivalent-consumer reduction;
- relation (3.194) apartment branch boundaries;
- relation (3.195) apartment equivalent-consumer reduction;
- relation (3.196) residential specific daily demand;
- Anexa 3.3.A apartment source example, including `Ah = 75 m2`, `nP,eq,max = 2.625`, `nP,eq = 2.0125`, source displayed corrected volume around `54.08 l/om,zi`, source-rounded daily volume around `109.25 l/zi`, and useful energy around `4.45 kWh/zi`;
- validation errors for invalid temperatures and missing table ids.

The Anexa 3.3.A daily-volume display uses rounded displayed intermediates (`54.08` and `2.02`), so the test keeps the exact helper formula path and the source-rounded display reconstruction separate.

## Remaining DHW Blockers

- Anexa B DHW service unit counts are not yet cleaned into an executable fixture.
- Anexa B DHW final-energy rows remain final-energy display rows, not useful-demand derivations.
- Distribution, recoverable distribution heat, storage, generation, auxiliary energy, and final-energy conversion require separate traced system inputs.
- The helper does not implement relation (3.197) loss/waste water penalization; this was outside the requested useful-demand scope.
- No annual schedule, operating days, or hourly profile is defaulted.
- Lighting external-standard data still blocks the broader `MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS` example.

## Recommended Next Validation Target

Next safest target: clean Anexa B DHW service rows/unit counts into a reviewed fixture only if the source provides explicit quantities that can be combined with Tabel 3.3.1 and the new useful-demand helper. If those counts remain unclear, continue with another explicit-row Physics Engine validation target rather than creating DHW assumptions.
