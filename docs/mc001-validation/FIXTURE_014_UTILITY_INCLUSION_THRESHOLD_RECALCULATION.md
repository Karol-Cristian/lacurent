# FIXTURE 014 - Utility Inclusion Threshold Recalculation

## Status

- Fixture id: `FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION`
- Fixture type: dataset-rule validation.
- Executable: yes.
- Validated helper: `utilityInclusionThresholds.mjs`.
- Source pages: MC001 pages 395-396.
- Scope exclusions: no certificate workflow, no CPE generation, no certificate class inference, no virtual ventilation consumption calculation, no overheating/discomfort calculation, no mixed-use weighted averaging, no UI/API/DB/Worker/orchestrator/production integration, no deploy, no push.

## MC001 Source Verified Before Implementation

The reviewed extraction was independently checked against the local MC001 PDF before implementation.

| Source | Verification |
| --- | --- |
| MC001 page 395, Tabel 5.6 | Residential category 1 has heating, DHW and lighting mandatory; cooling and mechanical ventilation optional. |
| MC001 page 395, Tabel 5.6 | Categories 2-8 have heating, DHW, mechanical ventilation and lighting mandatory; cooling optional. |
| MC001 page 395, Tabel 5.6 prose | Residential buildings without dedicated mechanical ventilation do not calculate electric ventilation consumption, but heating/cooling need for ventilation air remains calculated from the larger of minimum fresh air and infiltration air-change rate. |
| MC001 page 395, Tabel 5.6 prose | Non-residential buildings without dedicated mechanical ventilation impose virtual electric ventilation consumption corresponding to class E maximum consumption by category. This fixture records the rule only. |
| MC001 page 395, example | Existing school without mechanical ventilation: final ventilation `15.6 kWh/(m2.an)`, primary ventilation `39.0 kWh/(m2.an)`, reference final `2.4 kWh/(m2.an)`, reference primary `6.0 kWh/(m2.an)`. |
| MC001 page 395, Nota 1 | Class intervals are open on the left and closed on the right. |
| MC001 page 396, Nota 2 | Apartments in houses use Tabel 5.7; apartments in blocks use Tabel 5.8. |
| MC001 page 396, Nota 3 | Buildings without cooling require an overheating/discomfort indicator as annual hours above `26 degC`; not implemented here. |
| MC001 page 396, Nota 4 | Missing non-mandatory utilities require recalculating total primary and CO2 thresholds by subtraction. |
| MC001 page 396, Nota 5 | Mixed-use limits are area-weighted averages by assimilated zones; not implemented here. |

No mismatch was found between the supplied reviewed extraction and MC001 pages 395-396.

## Utility Inclusion Rules

| Category | Heating | DHW/ACC | Cooling | Mechanical ventilation | Lighting |
| --- | --- | --- | --- | --- | --- |
| Residential category 1 | mandatory, `delta_1 = 1` | mandatory, `delta_2 = 1` | optional, `delta_3 = 0/1` | optional, `delta_4 = 0/1` | mandatory, `delta_5 = 1` |
| Non-residential categories 2-8 | mandatory, `delta_1 = 1` | mandatory, `delta_2 = 1` | optional, `delta_3 = 0/1` | mandatory, `delta_4 = 1` | mandatory, `delta_5 = 1` |

The helper exposes these as reviewed rule metadata only. It does not calculate virtual ventilation consumption.

## Recalculation Formulas

Total primary-energy class threshold:

```text
new_total_threshold = table_total_threshold - sum(missing_utility_primary_thresholds)
```

Environmental/CO2 class threshold:

```text
new_CO2_threshold = table_CO2_threshold - sum(missing_utility_primary_threshold * CO2_factor)
```

## Fixture Cases

| Case | Base value | Missing utility threshold | Factor | Expected |
| --- | ---: | ---: | ---: | ---: |
| School without cooling, B/C total primary threshold | `135 kWh/(m2.an)` | cooling `13 kWh/(m2.an)` | n/a | `122 kWh/(m2.an)` |
| School without cooling, B/C CO2 threshold | `23.0 kgCO2/(m2.an)` | cooling `13 kWh/(m2.an)` | `0.107` | `21.61 kgCO2/(m2.an)` |

The expected values match MC001 Nota 4:

```text
135 - 13 = 122
23.0 - 13 * 0.107 = 21.61
```

## Blocked Rows

| Row | Reason |
| --- | --- |
| Buildings without cooling overheating indicator | MC001 Nota 3 requires annual hours above `26 degC`; chapter 2.8.6 is not implemented here. |
| Mixed-use weighted averaging | MC001 Nota 5 requires zone areas and assimilated category mapping; not implemented here. |
| Non-residential missing mechanical ventilation virtual consumption | Tabel 5.6 prose imposes a virtual electric ventilation consumption, but this fixture does not calculate virtual systems. |
| Certificate/CPE workflow and class labels | This fixture validates inclusion flags and threshold arithmetic only; it does not infer certificate classes or generate certificate output. |

## Verification Notes

- This fixture validates Tabel 5.6 inclusion flags and Nota 4 arithmetic only.
- It does not validate general certificate workflow.
- It does not validate Anexa B displayed class labels.
- It does not modify final/primary/CO2 formulas.
- It does not perform UI/Worker/DB/schema/API/orchestrator/deploy/push work.
