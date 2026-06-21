# 06 Ventilation and Infiltration

Extraction status: `extracted`.

Source document:

- MC001-2022 - Metodologie de calcul al performantei energetice a cladirilor
- Local PDF: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Uploaded source identifier: `63d8dccfe6ae8244797864 (1).pdf`

MC001 sections used:

- MC001-2022, 1.2 - comfort and indoor air quality, residential minimum airflow table
- MC001-2022, 2.5 - Permeabilitatea la aer a unei cladiri
- MC001-2022, 2.7.1.2 - Transferul termic prin ventilare
- MC001-2022, relatia (2.29)
- MC001-2022, relatia (2.30)
- MC001-2022, relatia (2.31)
- MC001-2022, relatia (2.32)

Implementation relevance:

This module extracts ventilation and infiltration heat transfer terms needed for the monthly MC001-like method. It prepares ventilation loss terms for later heating/cooling demand calculations.

LaCurent uses this extraction only for the estimative Physics Engine. It is not official certificate logic and must not be presented as an official energy performance certificate.

## Concepts To Extract

| Concept | Implementation meaning |
| --- | --- |
| transfer termic prin ventilare | Heat transfer caused by air entering/leaving the conditioned zone through ventilation or infiltration. |
| infiltratie | Uncontrolled air exchange through leakage paths in the envelope. |
| debit volumic de aer `qV` | Volume flow rate of air, usually represented in `m3/s` in SI formulas or `m3/h` in practical input tables. |
| numar de schimburi de aer `n` / ACH | Air changes per hour, in `1/h`; can derive airflow only when volume is known. |
| `Hve` | Ventilation heat transfer coefficient, in `W/K`. |
| `bve` | Temperature correction factor for ventilation components. |
| `fve,dyn` | Dynamic correction factor for ventilation behavior. |
| recuperare de caldura | Heat recovery/preheating of supply air, reducing effective ventilation heat loss when supported by known supply temperature or recovery data. |
| `thetaSup` | Supply air temperature for a ventilation component. |
| zone neclimatizate / neincalzite ca sursa de aer | Adjacent unconditioned spaces such as attic, basement or buffer zones from which air may be supplied or mixed. |
| direct exterior air vs preheated/heat-recovered supply air | Exterior untreated air generally has supply temperature close to outdoor temperature; recovered/preheated air requires a different `thetaSup` and therefore different `bve`. |

## Residential Minimum Airflow Table

Implementation-friendly data from Chapter 1.2 / indoor air quality.

| mainRoomCount | totalMinimumAirflowM3h | kitchenMinimumAirflowM3h |
| --- | ---: | ---: |
| 1 | 35 | 20 |
| 2 | 60 | 30 |
| 3 | 75 | 45 |
| 4 | 90 | 45 |
| 5 | 105 | 45 |
| 6 | 120 | 45 |
| 7 | 135 | 45 |

Notes:

- This table is for minimum ventilation airflow, not automatically ACH.
- Do not silently convert to ACH unless heated volume is known.
- If using ACH, formula must be explicit: `airflowM3h = ACH x heatedVolumeM3`.

## Formula Registry Entries

### Formula 1

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_29_Q_VENTILATION_MONTHLY` |
| labelRo | Transfer termic lunar prin ventilare |
| formulaText | `QH/C;ve;ztc;m = HH/C;ve;ztc;m x (thetaIntCalcH/CZtc - thetaEAM) x deltaTm` |
| unit | `kWh` |
| output | `QVentilationMonthly` |
| inputs | `Hve`: coeficient de transfer termic prin ventilare `[W/K]`; `thetaIntCalc`: temperatura interioara setata `[°C]`; `thetaExternalMonthly`: temperatura exterioara medie lunara `[°C]`; `deltaTm`: durata lunii `[h]` |
| MC001 reference | MC001-2022, 2.7.1.2, relatia (2.29) |
| implementation notes | Implementation must convert `W*h` to `kWh` by dividing by `1000`. Used later in monthly heating/cooling demand. Do not use HDD fallback as main method. |
| validation notes | `Hve >= 0`. `deltaTm > 0`. Temperatures must be numeric. |

### Formula 2

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_30_HVE` |
| labelRo | Coeficient global de transfer termic prin ventilare |
| formulaText | `HH/C;ve;ztc;m = rhoA x ca x Σ(bve,k;H/C;m x qV,k;H/C;m x fve;dyn;k;m)` |
| unit | `W/K` |
| output | `Hve` |
| inputs | `rhoA`: densitatea aerului `[kg/m3]`; `ca`: caldura specifica a aerului `[J/(kgK)]` or equivalent; `bveK`: factor corectie temperatura `[-]`; `qVK`: debit volumic de aer `[m3/s]`; `fveDynK`: factor corectie dinamica `[-]` |
| MC001 reference | MC001-2022, 2.7.1.2, relatia (2.30) |
| implementation notes | `qV` must be in `m3/s` for SI consistency when using `rhoA` and `ca` in `J/kgK`. If `qV` is supplied in `m3/h`, convert before calculation or use equivalent Wh constants explicitly. For simplified internal representation, `Hve = 0.34 x airflowM3h` may be used only if documented as derived unit conversion, not as a separate MC001 formula. |
| validation notes | `rhoA > 0`. `ca > 0`. `qVK >= 0`. `bveK` must be sourced or calculated. `fveDynK` must be sourced or defaulted with explicit assumption. |

### Formula 3

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_31_BVE` |
| labelRo | Factor de corectie temperatura pentru ventilare |
| formulaText | `bve,k;H/C;m = (thetaIntCalcH/Cm - thetaSup,k;H/C;m) / (thetaIntCalcH/Cm - thetaEAM)` |
| unit | `-` |
| output | `bve` |
| inputs | `thetaIntCalc`: temperatura interioara setata `[°C]`; `thetaSupK`: temperatura de introducere a aerului pentru componenta `k` `[°C]`; `thetaExternalMonthly`: temperatura exterioara medie lunara `[°C]` |
| MC001 reference | MC001-2022, 2.7.1.2, relatia (2.31) |
| implementation notes | If supply air is untreated exterior air, `thetaSupK` may equal `thetaExternalMonthly` and `bve` tends to `1`. If heat recovery/preheating exists, `thetaSupK` must reflect that. |
| validation notes | Denominator must not be zero. Temperatures must be numeric. `bve` should be traced. |

### Formula 4

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_32_BVE_UNCONDITIONED` |
| labelRo | Corectie ventilare pentru zona neclimatizata |
| formulaText | `bve,k;H/C;m = bztu,k;m` |
| unit | `-` |
| output | `bve` |
| inputs | `bztuKM`: factor corectie pentru zona neclimatizata adiacenta `[-]` |
| MC001 reference | MC001-2022, 2.7.1.2, relatia (2.32) |
| implementation notes | Applies when air comes from an unconditioned/unheated adjacent zone. `bztu` must be calculated or sourced, not invented. |
| validation notes | `bztuKM` must be numeric. Missing `bztu` should produce missing input warning. |

### Formula 5

| Field | Value |
| --- | --- |
| formulaId | `PHYSICS_AIRFLOW_FROM_ACH` |
| labelRo | Debit de aer din numar de schimburi de aer |
| formulaText | `qV,m3h = ACH x V` |
| unit | `m3/h` |
| output | `airflowM3h` |
| inputs | `ACH`: numar de schimburi de aer pe ora `[1/h]`; `V`: volum interior incalzit/climatizat `[m3]` |
| MC001 reference | Derived helper, compatible with MC001 ventilation inputs |
| implementation notes | Helper only, not an MC001 numbered formula. Use only when ACH is explicitly provided or selected from a documented assumption. Do not invent ACH silently. |
| validation notes | `ACH >= 0`. `V > 0`. |

## Applicability Model For LaCurent

| input/method | when usable | required data | missing behavior |
| --- | --- | --- | --- |
| explicit airflow `m3/h` | best when measured/designed airflow exists | `qV`, source, zone | use with trace |
| residential room-count airflow table | when number of main rooms is known | `mainRoomCount` | trace as normative minimum ventilation |
| ACH-based airflow | when ACH and heated volume are known | `ACH`, `heatedVolumeM3` | helper only, lower confidence if ACH is assumed |
| heat recovery | when mechanical ventilation with recovery exists | recovery efficiency or supply temperature | missing recovery data blocks heat-recovery credit |
| unconditioned source air | when air comes from attic/basement/buffer zone | `bztu` or adjacent-zone model | missing `bztu` warning |

## Implementation Implications For LaCurent

- Ventilation cannot be calculated from `usefulAreaM2` alone.
- Heated volume is required for ACH-based calculations.
- `qV` units must be explicit: `m3/h` vs `m3/s`.
- `Hve` must carry unit trace.
- Heat recovery must not be credited unless recovery efficiency or supply temperature is known.
- If the engine uses `Hve = 0.34 x airflowM3h`, it must document the unit conversion and assumptions.
- Missing ventilation inputs should produce missing input warnings rather than silent defaults.
- This module does not calculate `QH,nd`; it only provides ventilation loss terms for the monthly method.

## Do Not Implement Yet

- no calculators created
- no production flow changed
- no UI changed
- no tests added
- next extraction module is `07_monthly_heating_cooling_demand`

