# 07 Monthly Heating and Cooling Demand

Extraction status: `partial_needs_verification`.

Source document:

- MC001-2022 - Metodologie de calcul al performantei energetice a cladirilor
- Local PDF: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Uploaded source identifier: `63d8dccfe6ae8244797864 (1).pdf`

MC001 sections used:

- MC001-2022, 2.7 - Calculul necesarului de energie pentru climatizare folosind metoda de calcul lunar
- MC001-2022, 2.7.1 - Transferul termic total
- MC001-2022, 2.7.1.1 - Transferul termic prin transmisie
- MC001-2022, 2.7.1.2 - Transferul termic prin ventilare
- MC001-2022, 2.7.2 - Aporturi de caldura totale si aporturi interne
- MC001-2022, 2.7.3 - Aporturi solare
- MC001-2022, 2.7.6 - Factori de utilizare
- MC001-2022, 2.8.1 - Incalzire sau racire cu temperatura setata constanta
- MC001-2022, Figure 2.18 context for useful heating/cooling need, pending exact formula verification

Implementation relevance:

This module defines the monthly useful heating/cooling demand structure. It depends on monthly transmission losses, monthly ventilation losses, internal gains, solar gains, and utilization factors.

LaCurent uses this extraction only for the estimative Physics Engine. It is not official certificate logic and must not be presented as an official energy performance certificate.

Critical rule:

- Do not introduce HDD fallback.
- Do not use `QH = (Htr + Hve) x HDD x 24 / 1000`.
- Do not simplify the monthly MC001 method into an annual HDD method.

## Concepts To Extract

| Concept | Implementation meaning |
| --- | --- |
| monthly calculation method | Calculation is performed per month `m`, then annual useful demand is obtained by summing monthly values. |
| useful heating demand `QH,nd` | Useful/net energy needed by the thermal zone for heating before system efficiencies. |
| useful cooling demand `QC,nd` | Useful/net energy needed by the thermal zone for cooling before system efficiencies. |
| total heat transfer `Qht` | Monthly total heat transfer combining transmission and ventilation terms. |
| transmission heat transfer `Qtr` | Monthly heat transfer through envelope transmission paths. |
| ventilation heat transfer `Qve` | Monthly heat transfer through ventilation/infiltration airflow paths. |
| total heat gains `Qgn` | Monthly total gains used in the balance, combining internal and solar gains. |
| internal gains | Heat gains from occupants, appliances, lighting and internal processes. |
| solar gains | Heat gains from solar radiation through transparent or receiving surfaces. |
| gain utilization factor `etaH,gn` | Fraction of gains usable for reducing heating demand in the monthly heating balance. |
| loss/cooling utilization factor | Cooling-side utilization concept must be extracted exactly before implementation; do not infer from heating unless MC001 states it. |
| calculation zone / thermal zone | Demand is calculated per thermal/calculation zone, then aggregated as needed. |
| monthly timestep `m` | Monthly index for climate, duration, gains, losses and utilization factors. |
| why annual HDD fallback is not MC001 monthly method | HDD collapses the monthly balance into an annual approximation and cannot represent monthly gains/utilization behavior. |

## Monthly Method Dependency Graph

Inputs:

- monthly exterior temperatures
- monthly calculation duration `deltaTm`
- indoor setpoint temperatures
- `Htr` or monthly `Htr` components
- `Hve` or monthly `Hve` components
- internal gains
- solar gains
- gain utilization factors

Intermediate:

- `Qtr,m`
- `Qve,m`
- `Qht,m`
- `Qint,m`
- `Qsol,m`
- `Qgn,m`
- `etaH,gn,m`

Outputs:

- `QH,nd,m`
- `QC,nd,m`
- annual sums `QH,nd,an` and `QC,nd,an`

Text graph:

```text
monthly climate + duration + setpoints
  -> Qtr,m + Qve,m
  -> Qht,m

internal gains + solar gains
  -> Qgn,m
  -> utilization factors

Qht,m + Qgn,m + utilization factors
  -> QH,nd,m / QC,nd,m
  -> annual sums by month
```

## Formula Registry Entries

### Formula 1

| Field | Value |
| --- | --- |
| formulaId | `MC001_MONTHLY_TOTAL_HEAT_TRANSFER` |
| labelRo | Transfer termic total lunar |
| formulaText | Heating: `QH;ht;ztc;m = QH;tr;ztc;m + QH;ve;ztc;m`; Cooling: `QC;ht;ztc;m = QC;tr;ztc;m + QC;ve;ztc;m` |
| formulaStatus | `extracted_unnumbered` |
| implementationAllowed | `true` |
| unit | `kWh` |
| output | `QhtMonthly` |
| inputs | `QtrMonthly`: transfer termic prin transmisie lunar `[kWh]`; `QveMonthly`: transfer termic prin ventilare lunar `[kWh]` |
| MC001 reference | MC001-2022, 2.7.1, Figura 2.10 |
| implementation notes | Figure formula, not numbered relation. Separate heating and cooling paths. Combines monthly transmission and ventilation heat transfer before gains/utilization are applied. |
| validation notes | `QtrMonthly >= 0`; `QveMonthly >= 0`. |

### Formula 2

| Field | Value |
| --- | --- |
| formulaId | `MC001_MONTHLY_TOTAL_GAINS` |
| labelRo | Aporturi totale lunare de caldura |
| formulaText | Heating: `QH;gn;ztc;m = QH;int;ztc;m + QH;sol;ztc;m`; Cooling: `QC;gn;ztc;m = QC;int;ztc;m + QC;sol;ztc;m` |
| formulaStatus | `extracted_unnumbered` |
| implementationAllowed | `true` |
| unit | `kWh` |
| output | `QgnMonthly` |
| inputs | `QintMonthly`: aporturi interne lunare `[kWh]`; `QsolMonthly`: aporturi solare lunare `[kWh]` |
| MC001 reference | MC001-2022, 2.7.2, Figura 2.13 |
| implementation notes | Figure formula, not numbered relation. Combines internal and solar gains. Later used with utilization factors. |
| validation notes | `QintMonthly >= 0`; `QsolMonthly` may be `>= 0` depending on model. |

### Formula 3

| Field | Value |
| --- | --- |
| formulaId | `MC001_MONTHLY_HEATING_NEED` |
| labelRo | Necesar lunar util de energie pentru incalzire |
| formulaText | If `gammaH;ztc;m <= 0` and `QH;gn;ztc;m > 0`: `QH;nd;ztc;m = 0`; if `gammaH;ztc;m > 2,0`: `QH;nd;ztc;m = 0`; otherwise: `QH;nd;ztc;m = QH;ht;ztc;m - etaH;gn;ztc;m x QH;gn;ztc;m` |
| formulaStatus | `extracted_unnumbered_visual` |
| implementationAllowed | `true` |
| unit | `kWh` |
| output | `QHndMonthly` |
| inputs | `gammaH;ztc;m`: thermal balance ratio for heating `[-]`; `QH;ht;ztc;m`: total heat transfer for heating `[kWh]`; `etaH;gn;ztc;m`: gain utilization factor `[-]`; `QH;gn;ztc;m`: total heat gains for heating `[kWh]` |
| MC001 reference | MC001-2022, 2.8.1, Figura 2.18 |
| roles | `gammaH;ztc;m` is the heating thermal balance ratio; `QH;ht;ztc;m` is monthly total heat transfer for heating; `etaH;gn;ztc;m` is the utilization factor for gains in heating mode; `QH;gn;ztc;m` is monthly total heat gains for heating. |
| implementation notes | This is useful/net heating demand, not final energy. Result must not be replaced with HDD formula. Figures are unnumbered formula sources; keep the Figure 2.18 reference. |
| validation notes | `QHhtMonthly >= 0`; `etaHgnMonthly` must be numeric and usually between `0` and `1`; `QHgnMonthly >= 0`. |

### Formula 4

| Field | Value |
| --- | --- |
| formulaId | `MC001_MONTHLY_COOLING_NEED` |
| labelRo | Necesar lunar util de energie pentru racire |
| formulaText | If `(1 / gammaC;ztc;m) > 2,0`: `QC;nd;ztc;m = 0`; otherwise: `QC;nd;ztc;m = aC;red;ztc;m x (QC;gn;ztc;m - etaC;ht;ztc;m x QC;ht;ztc;m)` |
| formulaStatus | `extracted_unnumbered_visual` |
| implementationAllowed | `true` |
| unit | `kWh` |
| output | `QCndMonthly` |
| inputs | `QC;ht;ztc;m`: total heat transfer for cooling `[kWh]`; `etaC;ht;ztc;m`: utilization factor for heat transfer `[-]`; `QC;gn;ztc;m`: total heat gains for cooling `[kWh]`; `aC;red;ztc;m`: intermittent cooling reduction factor `[-]`; `gammaC;ztc;m`: thermal balance ratio for cooling `[-]` |
| MC001 reference | MC001-2022, 2.8.1, Figura 2.19 |
| roles | `QC;ht;ztc;m` is monthly total heat transfer for cooling; `etaC;ht;ztc;m` is the utilization factor for heat transfer in cooling mode; `QC;gn;ztc;m` is monthly total heat gains for cooling; `aC;red;ztc;m` is the intermittent cooling reduction factor; `gammaC;ztc;m` is the cooling thermal balance ratio used by the branch condition. |
| implementation notes | Do not infer cooling formula from heating. Figures are unnumbered formula sources; keep the Figure 2.19 reference. Keep HDD fallback forbidden. |
| validation notes | `aC;red;ztc;m` must be numeric; `etaC;ht;ztc;m` must be numeric; `QC;gn;ztc;m` and `QC;ht;ztc;m` must be available. |

### Formula 5

| Field | Value |
| --- | --- |
| formulaId | `MC001_ANNUAL_HEATING_NEED_SUM` |
| labelRo | Necesar anual util de energie pentru incalzire |
| formulaText | `QH;nd;ztc;an = Σ(m=1..12) QH;nd;ztc;m` |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| unit | `kWh/an` |
| output | `QHndAnnual` |
| inputs | `QHndMonthly`: monthly useful heating need `[kWh]` |
| MC001 reference | MC001-2022, 2.10, relatia (2.84) |
| implementation notes | Annual useful heating demand is sum of monthly values. |
| validation notes | Monthly values must be `>= 0`. |

### Formula 6

| Field | Value |
| --- | --- |
| formulaId | `MC001_ANNUAL_COOLING_NEED_SUM` |
| labelRo | Necesar anual util de energie pentru racire |
| formulaText | `QC;nd;ztc;an = Σ(m=1..12) QC;nd;ztc;m` |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| unit | `kWh/an` |
| output | `QCndAnnual` |
| inputs | `QCndMonthly`: monthly useful cooling need `[kWh]` |
| MC001 reference | MC001-2022, 2.10, relatia (2.85) |
| implementation notes | Annual useful cooling demand is sum of monthly values. |
| validation notes | Monthly values must be `>= 0`. |

## Formula Status Summary

| formulaId | formulaStatus | implementationAllowed | reference |
| --- | --- | --- | --- |
| `MC001_MONTHLY_TOTAL_HEAT_TRANSFER` | `extracted_unnumbered` | `true` | MC001-2022, 2.7.1, Figura 2.10 |
| `MC001_MONTHLY_TOTAL_GAINS` | `extracted_unnumbered` | `true` | MC001-2022, 2.7.2, Figura 2.13 |
| `MC001_MONTHLY_HEATING_NEED` | `extracted_unnumbered_visual` | `true` | MC001-2022, 2.8.1, Figura 2.18 |
| `MC001_MONTHLY_COOLING_NEED` | `extracted_unnumbered_visual` | `true` | MC001-2022, 2.8.1, Figura 2.19 |
| `MC001_ANNUAL_HEATING_NEED_SUM` | `extracted` | `true` | MC001-2022, 2.10, relatia (2.84) |
| `MC001_ANNUAL_COOLING_NEED_SUM` | `extracted` | `true` | MC001-2022, 2.10, relatia (2.85) |

## Required Missing-Input Behavior

If any of the following are missing, a future calculator must return:

```text
status: cannot_calculate_mc001_monthly_missing_inputs
```

Missing input categories:

- monthly exterior temperatures
- monthly hours/duration `deltaTm`
- indoor setpoint temperature
- transmission heat transfer terms
- ventilation heat transfer terms
- internal gains
- solar gains
- gain utilization factor
- thermal zone definition

No silent fallback to HDD is allowed.

## Implementation Implications For LaCurent

- This module calculates useful demand only, not final energy.
- Final energy belongs to system modules.
- Primary energy and CO2 belong to module `13_final_primary_co2_rer`.
- Class calculation belongs to module `15_energy_classes_and_certificate`.
- Heating/cooling demand must be monthly, then annualized by sum.
- Missing gains or utilization factors must not be silently treated as zero unless explicitly configured and traced.
- `MC001_MONTHLY_TRANSMISSION_TRANSFER` from module `05_transmission_heat_transfer` remains `needs_verification` and should not be used as a validated formula yet.
- The annual HDD shortcut is not part of this extraction and must not be used as a replacement for the MC001 monthly method.

## Do Not Implement Yet

- no calculators created
- no production flow changed
- no UI changed
- no tests added
- next extraction module is `09_dhw_systems` or `13_final_primary_co2_rer` depending on priority
