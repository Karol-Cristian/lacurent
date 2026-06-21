# FIXTURE 008 - Service Final Primary Rows

## Status

- Fixture id: `FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS`
- Source candidate: `MC001_EX_B_FINAL_PRIMARY_CO2_CPE`
- Executable: yes, as a narrowed service-row final-to-primary fixture.
- Validated module: `finalPrimaryCo2Indicators.mjs`
- Scope exclusions: no CO2 display validation, no certificate generation, no class assignment, no RER calculation, no production integration, no UI, no workers, no DB/schema, no API, no deploy, no push.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 page 411, section 5.4.2.6, relation (5.3): final energy by service and carrier.
- MC001-2022 page 411, section 5.4.2.6, relation (5.4a): primary energy from final/exported energy using Tabel 5.17 factors.
- MC001-2022 Tabel 5.17: primary energy factors.
- Anexa B page 523: heating primary-energy row. The adjacent `100.06 MWh/an` final-energy prose is not used.
- Anexa B page 525: DHW / ACC final-energy row `Qw,total = 38118 kWh`.
- Anexa B page 526: lighting annual final-energy row `13444.60 kWh`.
- Anexa B page 527: total primary-energy display `232.935 MWh/an` and `170.1 kWh/m2.an`.
- Anexa B page 533: service final/primary specific rows and reference area `1369.4 m2`.
- `INVESTIGATION_003_ANEXA_B_FINAL_ENERGY_AND_CO2_CONFLICTS.md`: reviewed source-conflict policy for page 523 and page 527/page 540.

## Source Method Extracted

Final energy aggregation uses relation (5.3) as the service/carrier sum:

```text
Qf,i = Qf,h,i + Qf,v,i + Qf,c,i + Qf,w,i + Qf,l,i
```

This fixture has no exported energy. Primary energy therefore uses relation (5.4a) as:

```text
EPtot = sum_i(Qf,i * fPtot,i)
EPnren = sum_i(Qf,i * fPnren,i)
EPren = sum_i(Qf,i * fPren,i)
```

Specific primary indicators use the page 533 reference area:

```text
EPspecific = EP / Aref
Aref = 1369.4 m2
```

## Extracted Inputs

| Service | Carrier key | Source | Final energy |
| --- | --- | --- | ---: |
| Heating | `termoficare_cogenerare_distanta` | Page 533 service row `88/81 kWh/m2.an`; final annual input = `88.0 * 1369.4` | 120507.2 kWh |
| DHW / ACC | `termoficare_cogenerare_distanta` | Page 525 `Qw,total` | 38118.0 kWh |
| Ventilation | `electricitate_sen_consumata` | Page 533 service row `15.5/39.0 kWh/m2.an`; final annual input = `15.5 * 1369.4` | 21225.7 kWh |
| Lighting | `electricitate_sen_consumata` | Page 526 annual lighting final energy | 13444.6 kWh |
| Cooling | `electricitate_sen_consumata` | Page 533 cooling row | 0.0 kWh |

## Tabel 5.17 Factors Used

| Carrier key | fPnren | fPren | fPtot | Source |
| --- | ---: | ---: | ---: | --- |
| `termoficare_cogenerare_distanta` | 0.92 | 0.00 | 0.92 | MC001-2022 Tabel 5.17 |
| `electricitate_sen_consumata` | 2.00 | 0.50 | 2.50 | MC001-2022 Tabel 5.17 |

## Expected Service Outputs

| Service | Final kWh | Renewable primary kWh | Non-renewable primary kWh | Total primary kWh | Total primary kWh/m2.an |
| --- | ---: | ---: | ---: | ---: | ---: |
| Heating | 120507.2 | 0 | 110866.624 | 110866.624 | 80.96 |
| DHW / ACC | 38118.0 | 0 | 35068.56 | 35068.56 | 25.608704542135243 |
| Ventilation | 21225.7 | 10612.85 | 42451.4 | 53064.25 | 38.75 |
| Lighting | 13444.6 | 6722.3 | 26889.2 | 33611.5 | 24.54469110559369 |
| Cooling | 0.0 | 0 | 0 | 0 | 0 |

## Expected Totals

| Metric | Expected |
| --- | ---: |
| Final total | 193295.5 kWh |
| Final by `termoficare_cogenerare_distanta` | 158625.2 kWh |
| Final by `electricitate_sen_consumata` | 34670.3 kWh |
| Renewable primary | 17335.15 kWh |
| Non-renewable primary | 215275.784 kWh |
| Total primary | 232610.934 kWh |
| Specific renewable primary | 12.658938221118738 kWh/m2.an |
| Specific non-renewable primary | 157.2044574266102 kWh/m2.an |
| Specific total primary | 169.86339564772894 kWh/m2.an |

## Source Display Comparisons

These rows are display comparisons only; exact expected values above come from explicit final-energy rows and Tabel 5.17.

| Source row | Displayed value | Calculated from fixture | Validation handling |
| --- | ---: | ---: | --- |
| Page 523 heating primary energy | 110901.0 kWh | 110866.624 kWh | assert with 40 kWh display tolerance |
| Page 533 heating primary specific | 81.0 kWh/m2.an | 80.96 kWh/m2.an | assert with 0.1 kWh/m2 display tolerance |
| Page 533 ventilation primary specific | 39.0 kWh/m2.an | 38.75 kWh/m2.an | assert with 0.3 kWh/m2 display tolerance |
| Page 527 total primary energy | 232934.94 kWh | 232610.934 kWh | assert with 400 kWh display tolerance |
| Page 527 total primary specific | 170.1 kWh/m2.an | 169.86339564772894 kWh/m2.an | assert with 0.3 kWh/m2 display tolerance |

## Blocked Rows And Reasons

| Row | Reason |
| --- | --- |
| Page 523 `100.06 MWh/an` heating final-energy prose | `INVESTIGATION_003` classifies this as `WORKED_EXAMPLE_PROSE_TYPO`. It conflicts with page 523 primary energy, page 527 heating primary energy, page 533 `88/81 kWh/m2.an`, and Tabel 5.17. |
| Page 527/page 540 CO2 display rows | Out of Fixture 008 scope and already blocked by `INVESTIGATION_003` as `WORKED_EXAMPLE_FACTOR_INCONSISTENCY_DOUBLE_COUNTS_ELECTRIC_RENEWABLE_SHARE`. |
| Page 527 RER row | RER depends on renewable contribution perimeter rules and is outside this final-primary service-row fixture. |
| Certificate class thresholds and certificate output rows | Certificate/class validation is outside this fixture and must not be inferred from service rows. |
| Any row mixing Tabel 5.17 primary factors with the inconsistent page 527 electric CO2 coefficient | Fixture 008 validates primary energy only; CO2 display inconsistencies remain blocked. |

## Verification Notes

- All executable expected values are calculated from explicit MC001 reviewed service rows and Tabel 5.17 factors.
- No DHW, lighting, ventilation, climate, certificate, class, RER, or CO2 display inputs are invented.
- The fixture intentionally overlaps Fixture 007 only for the primary-energy path, but it validates service rows individually instead of the combined final-primary-CO2 summary.
- `calculatePrimaryCO2Summary()` is checked only for its final-energy, primary-energy, and specific-primary sub-results; Fixture 008 does not assert any CO2 source display row.
