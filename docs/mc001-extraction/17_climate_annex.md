# 17 Climate Annex

Source document:

- `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

MC001 sections/annexes used:

- MC001-2022, 2.7.1.1 - Transferul termic prin transmisie
- MC001-2022, 2.7.1.2 - Transferul termic prin ventilare
- MC001-2022, 2.7.3 - Aporturi solare
- MC001-2022, 2.7.4 - referenced by sky radiation / longwave correction terms from solar gains formulas
- MC001 climate/solar annexes or tables: `blocked_missing_climate_dataset`

Extraction status: `blocked_missing_climate_dataset`

Implementation relevance:

- The monthly MC001 method depends on monthly exterior temperatures, annual exterior temperature, monthly duration, and solar irradiation data.
- Solar gain formulas from module `08_internal_and_solar_gains` require irradiation by orientation/tilt and sky-radiation correction data.
- This module indexes the required climate and solar data sources, but it does not copy large annex tables and does not invent values.

LaCurent disclaimer:

- This extraction supports a MC001-like Physics Engine.
- It is not sufficient for issuing an official energy performance certificate.
- Online weather APIs are not a substitute for MC001 source data unless later approved as a separate non-official mode.

## Blocking issue

- The monthly MC001 method requires climate data.
- The local MC001 PDF references climate-data annex sources, but the exact tables/values were not identified in this extraction pass.
- Therefore climate-based default calculation must not be implemented until the climate dataset source is located and extracted.
- This is not permission to use HDD fallback.
- This is not permission to use online weather APIs in official MC001 mode.

## Data sources needed by monthly method

| dataKey | neededBy | MC001 source | unit | lookup keys | extractionStatus | implementationAllowed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `monthlyExteriorTemperature` | `05_transmission_heat_transfer`, `06_ventilation_and_infiltration`, `07_monthly_heating_cooling_demand` | MC001-2022, 2.7.1.1 Figura 2.11 uses `thetaEAM`; 2.7.1.2 relation (2.29) uses monthly exterior temperature; exact climate annex/table blocked | `degC` | locality or climate zone, month | `blocked_missing_dataset` | `false` | Required for monthly transmission and ventilation. Do not replace with HDD fallback. |
| `annualExteriorTemperature` | `05_transmission_heat_transfer` ground term | MC001-2022, 2.7.1.1 Figura 2.11 uses `thetaEAAn`; exact climate annex/table blocked | `degC` | locality or climate zone, year/annual reference | `blocked_missing_dataset` | `false` | Required by the ground term in monthly transmission transfer. |
| `monthlyDurationHours` | `05_transmission_heat_transfer`, `06_ventilation_and_infiltration`, `07_monthly_heating_cooling_demand` | Derived calendar input used where MC001 formulas require `deltaTm`; no MC001 numbered formula extracted here | `h` | month, leap-year policy | `extracted` | `true` | Calendar hours table included below. Implementation must define leap-year handling. |
| `monthlySolarIrradiation` | `08_internal_and_solar_gains` | MC001-2022, 2.7.3 relations (2.39) and (2.50) use `Hsol`; exact climate/solar annex/table blocked | `kWh/m2` | locality or climate zone, month, orientation, tilt | `blocked_missing_dataset` | `false` | Required for transparent and opaque solar gains. Large solar datasets belong in this module once exact annex/table is located. |
| `orientationTiltLookup` | `08_internal_and_solar_gains` | MC001-2022, 2.7.3 relation (2.39) references element orientation/tilt for `Hsol`; lookup behavior depends on missing solar dataset | `deg` or category | orientation, tilt, surface type | `blocked_missing_dataset` | `false` | Geometry supplies actual orientation/tilt; climate annex must define how irradiation is looked up. |
| `skyRadiationOrLongwaveCorrection` | `08_internal_and_solar_gains` | MC001-2022, 2.7.3 relations (2.39) and (2.50) use `Qsky`; the correction is immediately referenced toward 2.7.4; exact source blocked | `kWh` or formula-dependent | month, element type, orientation/tilt, surface/glazing properties | `blocked_missing_dataset` | `false` | Must be extracted before `Qsky` can be calculated or omitted with trace. |
| `climateZoneOrLocality` | all monthly climate lookups | MC001 climate/locality mapping annex or table blocked | `id` / locality name | locality, county, climate zone | `blocked_missing_dataset` | `false` | Mapping must be explicit and traceable. Do not infer from free-text location without a reviewed mapping. |
| `solarDataForTransparentElements` | `MC001_SOLAR_GAINS_TRANSPARENT` | MC001-2022, 2.7.3 relation (2.39); exact solar annex/table blocked | `kWh/m2`, plus dimensionless factors | locality/climate zone, month, orientation, tilt, transparent element data | `blocked_missing_dataset` | `false` | Requires `Hsol;wi;m`, `Qsky;wi;m`, and glazing/frame/shading inputs from module `08` or future registries. |
| `solarDataForOpaqueElements` | `MC001_SOLAR_GAINS_OPAQUE` | MC001-2022, 2.7.3 relation (2.50); exact solar annex/table blocked | `kWh/m2`, plus formula factors | locality/climate zone, month, orientation, tilt, opaque element data | `blocked_missing_dataset` | `false` | Requires `Hsol;k;m`, `Qsky;k;m`, absorptance, `Rse`, `Uc`, area, and shading inputs. |

## Monthly duration

MC001 monthly formulas use `deltaTm`, the monthly duration in hours. No separate MC001 numbered formula for calendar month duration is extracted here.

| formulaId | `CALENDAR_MONTHLY_DURATION_HOURS` |
| --- | --- |
| labelRo | Durata lunara de calcul |
| formulaStatus | `derived_calendar_input_not_mc001_formula` |
| implementationAllowed | `true` |
| unit | `h` |
| output | `deltaTm` |
| inputs | `month`; `leapYearPolicy` |
| implementation notes | Use calendar hours. Leap-year handling must be defined by implementation policy. |
| validation notes | `deltaTm > 0`; exactly 12 monthly values must be present for annual monthly-method calculation. |

| Month | Hours |
| --- | ---: |
| January | 744 |
| February | 672 or 696 in leap year |
| March | 744 |
| April | 720 |
| May | 744 |
| June | 720 |
| July | 744 |
| August | 744 |
| September | 720 |
| October | 744 |
| November | 720 |
| December | 744 |

## Cross-references back to previous modules

- `05_transmission_heat_transfer` needs `thetaEAM`, `thetaEAAn`, and `deltaTm`.
- `06_ventilation_and_infiltration` needs `thetaEAM` and `deltaTm`.
- `08_internal_and_solar_gains` needs monthly solar irradiation, orientation/tilt lookup behavior, and sky radiation / longwave correction data.
- `07_monthly_heating_cooling_demand` needs monthly climate data and `deltaTm`.

## Implementation implications for LaCurent

- Monthly MC001 calculation cannot run without monthly climate data.
- Solar gains cannot run without irradiation data by orientation/tilt or an equivalent MC001 lookup.
- The engine must not use HDD fallback if climate annex data is missing.
- Missing climate data should produce `status: cannot_calculate_mc001_monthly_missing_climate_data`.
- Climate/locality mapping must be explicit and traceable.
- Online weather APIs are not a substitute for MC001 source data unless later explicitly approved as a separate non-official mode.
- Calendar duration may be implemented as a derived calendar input, but it must be traced as not being a MC001 formula.
- Large climate/solar annex tables should be represented as data registries later, not inline constants in calculators.

Future calculator behavior:

- If MC001 climate dataset values are missing, future calculators must return `status: cannot_calculate_mc001_monthly_missing_climate_data`.
- The result must include missing inputs, warnings, assumptions, and CalculationTrace entries explaining which climate dataset keys are unavailable.
- The calculation must stop before producing default MC001 monthly demand values that depend on missing climate data.

Allowed interim behavior:

- Only explicit user-supplied climate inputs may be used for a non-default calculation path.
- That path must be marked with `calculationMode: explicitClimateInput`.
- It must set `officialMc001DefaultData: false`.
- It must include warnings explaining that the MC001 default climate dataset was not used.
- It must include full CalculationTrace for every explicit climate input used.

Forbidden behavior:

- No HDD fallback.
- No annual HDD approximation.
- No online weather API substitution for official MC001 mode.
- No silent zero solar gains.
- No invented climate values.
- No Salicea default climate fixture.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `09_dhw_systems` or `13_final_primary_co2_rer`, depending on priority.
