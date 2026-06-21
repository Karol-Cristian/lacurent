# FIXTURE 007 - Final Primary CO2 Summary

## Status

- Fixture id: `FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY`
- Source candidate: `MC001_EX_B_FINAL_PRIMARY_CO2_CPE`
- Executable: yes, as a narrowed Anexa B/table-derived final-to-primary/CO2 fixture.
- Validated module: `finalPrimaryCo2Indicators.mjs`
- Scope exclusions: no certificate generation, no class assignment, no RER calculation, no production integration, no UI, no workers, no DB/schema, no API, no deploy, no push.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 page 411, section 5.4.2.6, relation (5.4a): primary energy from final/exported energy using Tabel 5.17 factors.
- MC001-2022 page 412, section 5.4.2.7, relation (5.4b): CO2 emissions from primary energy using Tabel 5.18 factors.
- MC001-2022 Tabel 5.17: primary energy factors.
- MC001-2022 Tabel 5.18: CO2 factors.
- MC001-2022 page 486: note that the SEN electricity renewable-share impact is already embedded in Tabel 5.18 CO2 factors.
- Anexa B page 523: heating summary text and heating system rows.
- Anexa B page 525: DHW final-energy row.
- Anexa B page 526: lighting annual final-energy row.
- Anexa B page 527: final primary/CO2/RER summary.
- Anexa B page 533: certificate annex service final/primary specific indicators and reference area.
- Anexa B page 540: final certificate indicators.

## Source Method Extracted

Primary energy uses relation (5.4a):

```text
EP = sum_i(Qf,i * fPtot,i) - sum_i(Qex,i * fPtot,ex,i)
```

The executable fixture has no exported energy, so the exported term is zero.

CO2 uses relation (5.4b):

```text
ECO2 = sum_i(EP,i * fCO2,i) + refrigerant_terms - exported_terms
```

The executable fixture has no refrigerant leakage term and no exported energy. Therefore:

```text
ECO2 = sum_i((Qf,i * fPtot,i) * fCO2,i)
```

This source check identified a defect in the previous helper behavior: `calculateCO2EmissionsFromFinalEnergy()` multiplied `Qf,i` directly by `fCO2,i`. MC001 relation (5.4b) uses `EP,i`, so the helper was corrected to convert final energy to primary energy first, then apply the Tabel 5.18 factor.

## Extracted Inputs

Reference area from page 533:

```text
Aref = 1369.4 m2
```

Final energy entries:

| Service | Carrier key | Source | Final energy |
| --- | --- | --- | ---: |
| Heating | `termoficare_cogenerare_distanta` | Page 533 final/primary row `88/81 kWh/m2.an`; annual input = `88.0 * 1369.4` | 120507.2 kWh |
| DHW / ACC | `termoficare_cogenerare_distanta` | Page 525 `Qw,total` | 38118.0 kWh |
| Ventilation | `electricitate_sen_consumata` | Page 533 final/primary row `15.5/39.0 kWh/m2.an`; annual input = `15.5 * 1369.4` | 21225.7 kWh |
| Lighting | `electricitate_sen_consumata` | Page 526 annual lighting final energy | 13444.6 kWh |
| Cooling | `electricitate_sen_consumata` | Page 533 cooling row | 0.0 kWh |

## Factors Used

| Carrier key | fPnren | fPren | fPtot | fCO2 | Source |
| --- | ---: | ---: | ---: | ---: | --- |
| `termoficare_cogenerare_distanta` | 0.92 | 0.00 | 0.92 | 0.220 | Tabel 5.17 / Tabel 5.18 |
| `electricitate_sen_consumata` | 2.00 | 0.50 | 2.50 | 0.107 | Tabel 5.17 / Tabel 5.18 |

## Expected Outputs

Final energy:

| Metric | Expected |
| --- | ---: |
| Final total | 193295.5 kWh |
| Final by `termoficare_cogenerare_distanta` | 158625.2 kWh |
| Final by `electricitate_sen_consumata` | 34670.3 kWh |

Primary energy:

| Metric | Expected |
| --- | ---: |
| Renewable primary | 17335.15 kWh |
| Non-renewable primary | 215275.784 kWh |
| Total primary | 232610.934 kWh |
| Specific total primary | 169.86339564772894 kWh/m2.an |

CO2:

| Metric | Expected |
| --- | ---: |
| Total CO2 | 41380.04573 kgCO2 |
| Specific CO2 | 30.21764694756828 kgCO2/m2.an |

The page 527 primary-energy display is `232.935 MWh/an` and `170.1 kWh/m2.an`. The fixture result differs by about `324.006 kWh`, or about `0.139%`, because some service final-energy inputs are only displayed as rounded specific values.

## Blocked Rows And Reasons

| Row | Reason |
| --- | --- |
| Page 523 heating final-energy text | `INVESTIGATION_003` classifies this as `WORKED_EXAMPLE_PROSE_TYPO`: the text states `100.06 MWh/an`, while page 523 primary energy, page 527 heating primary, and page 533 `88/81 kWh/m2.an` are mutually consistent with Tabel 5.17 within rounding. The executable fixture uses the reviewed page 533 service row. |
| Page 527/page 540 electric-service CO2 display | `INVESTIGATION_003` classifies this as `WORKED_EXAMPLE_FACTOR_INCONSISTENCY_DOUBLE_COUNTS_ELECTRIC_RENEWABLE_SHARE`: page 527 uses `0.086* = 0.107 * 0.80`, but page 486 says the 20% SEN renewable-share impact is already embedded in Tabel 5.18. Page 540's final displayed CO2 indicator inherits this display conflict. The executable fixture validates Tabel 5.18, not the conflicting display coefficient. |
| RER and class rows | RER and class assignment are outside `finalPrimaryCo2Indicators.mjs` and remain certificate/class workflow blockers. |

## Verification Notes

- All executable expected values are calculated from explicit source inputs and reviewed Tabel 5.17/Tabel 5.18 factors.
- No hidden system-efficiency assumptions are introduced.
- No missing service rows are invented.
- Anexa B displayed CO2 totals are logged but not asserted, because they use a footnoted electric coefficient that conflicts with the Tabel 5.18/page 486 factor path.
- The fixture validates the summary helper only as a mixed final/primary/CO2 aggregation; it does not validate certificate class or CPE issuance.
