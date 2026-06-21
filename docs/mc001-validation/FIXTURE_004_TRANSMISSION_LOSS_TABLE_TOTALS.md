# FIXTURE 004 - Transmission Loss Table Totals

## Status

- Fixture id: `FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS`
- Source candidates:
  - `MC001_EX_B_GEOMETRY_ENVELOPE_TABLES`
  - `MC001_EX_B_HEATING_MONTHLY_GAINS`
- Executable: yes, for the page 520 direct transmission totals, page 520 ground total as an explicit source component, and page 521 monthly `Htr` sums listed below.
- Validated module:
  - `transmissionCoefficients.mjs`
- Scope exclusions: no climate fallback, no ground-model derivation, no ventilation calculation, no DHW, no lighting, no classes, no renewables, no production integration.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 Anexa B, school audit breviar, heating calculation section.
- Page 520: `Calculul coeficientilor H de pierderi termice (prin transmisie si ventilare)` table.
- Page 521: monthly table with displayed `Hg`, `Ha`, `Hu`, and `Htr` rows.

Pages 520 and 521 were rendered locally from the source PDF and visually checked before fixture extraction.

## Extracted Direct Exterior Rows, Page 520

These rows populate the page 520 `Hd` column. The executable test validates both the displayed row total and the `calculateDirectTransmissionWithCorrectedU()` result from displayed `A` and `U'` values. Small differences are expected because MC001 displays rounded `A` and `U'` values while the `Hd` row values appear to come from less-rounded source values.

| Row | Code | Area A | Orientation | r | R' | U' | Displayed Hd |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| 1 | `TE` | 504.0 m2 | ORIZ | 0.97 | 0.85 | 1.18 | 594.49 W/K |
| 2 | `PE` | 158.8 m2 | N | 0.60 | 1.02 | 0.98 | 155.87 W/K |
| 3 | `FE` | 18.2 m2 | N | - | 0.40 | 2.50 | 45.50 W/K |
| 4 | `PE` | 244.0 m2 | E | 0.60 | 1.02 | 0.98 | 239.50 W/K |
| 5 | `FE` | 47.0 m2 | E | - | 0.40 | 2.50 | 117.50 W/K |
| 6 | `PE` | 161.3 m2 | S | 0.60 | 1.02 | 0.98 | 158.32 W/K |
| 7 | `FE` | 15.7 m2 | S | - | 0.40 | 2.50 | 39.25 W/K |
| 8 | `PE` | 216.8 m2 | V | 0.60 | 1.02 | 0.98 | 212.80 W/K |
| 9 | `FE` | 74.2 m2 | V | - | 0.40 | 2.50 | 185.50 W/K |

Expected displayed `Hd` total: `1748.73 W/K`.

## Extracted Ground Row, Page 520

| Row | Code | Area A | Orientation | r | R' | U' | Type | Displayed Hg |
| --- | --- | ---: | --- | ---: | ---: | ---: | --- | ---: |
| 10 | `Plsol` | 504.0 m2 | - | 0.58 | 1.79 | 0.56 | Sol | 86.12 W/K |

Expected displayed `Hg` total: `86.12 W/K`.

The ground row is not validated as `A * U'`. The source places the value in the `Hg` column and page 521 carries monthly ground coefficients separately, so this fixture consumes `Hg` only as explicit MC001 source data.

## Extracted Page 520 Totals

| Component | MC001 value | Fixture status |
| --- | ---: | --- |
| `Hg` | 86.12 W/K | executable as displayed source component |
| `Hd` | 1748.73 W/K | executable as displayed row sum and corrected-U calculation with rounding tolerance |
| `Hiu` | 0.00 W/K | executable as zero unheated-space component |
| `Hve` | 1806.62 W/K | blocked for this fixture; ventilation coefficient, not transmission |

Formula-derived page 520 transmission subtotal from displayed components:

`Htr = Hd + Hg + Hu + Ha = 1748.73 + 86.12 + 0.00 + 0.00 = 1834.85 W/K`

This subtotal is traceable from page 520 component totals and MC001 relation (2.15), but it is not displayed as a separate page 520 `Htr` cell.

## Extracted Monthly Htr Rows, Page 521

The page 521 `Htr` row is traceable without climate fallback because the table already displays monthly `Hg`, `Ha = 0.00`, `Hu = 0.00`, and `Htr`. The fixture uses page 520 `Hd = 1748.73 W/K` as the direct component and validates `calculateTotalTransmissionCoefficient()` month by month.

| Month | Displayed Hg | Displayed Ha | Displayed Hu | Displayed Htr |
| --- | ---: | ---: | ---: | ---: |
| Jan | 60.11 | 0.00 | 0.00 | 1808.84 |
| Feb | 73.98 | 0.00 | 0.00 | 1822.72 |
| Mar | 91.11 | 0.00 | 0.00 | 1839.85 |
| Apr | 106.90 | 0.00 | 0.00 | 1855.64 |
| Mai | 117.12 | 0.00 | 0.00 | 1865.86 |
| Iun | 119.04 | 0.00 | 0.00 | 1867.77 |
| Iul | 112.13 | 0.00 | 0.00 | 1860.86 |
| Aug | 98.25 | 0.00 | 0.00 | 1846.98 |
| Sep | 81.12 | 0.00 | 0.00 | 1829.85 |
| Oct | 65.33 | 0.00 | 0.00 | 1814.06 |
| Noi | 55.11 | 0.00 | 0.00 | 1803.84 |
| Dec | 53.20 | 0.00 | 0.00 | 1801.93 |

Displayed maximum `Htr`: `1867.8 W/K`.

## Assumptions

- All inputs are copied from displayed MC001 page 520 and 521 cells.
- The direct `Hd` rows use displayed `A` and `U'` values only; tolerances account for MC001 table rounding.
- Page 521 monthly `Hg` values are explicit source inputs. This fixture does not derive them from soil/climate formulas.
- Page 520 `Hiu` is mapped to the unheated-space transmission component used by `calculateTotalTransmissionCoefficient()`.
- `Ha` is zero in the page 521 monthly rows and is treated as zero where page 520 provides no adjacent-space component.

## Blocked Rows And Reasons

- Page 520 `Hve = 1806.62 W/K` is blocked because it is a ventilation coefficient, not a transmission coefficient.
- Page 521 `H final = 3674.39 W/K` is blocked because it combines transmission with `Hve`; validating it belongs in a ventilation or combined-loss fixture.
- Derivation of page 521 monthly `Hg` values is blocked because the current fixture has no sourced ground-model intermediate values and must not use climate fallback.
- Monthly heat-transfer energy rows remain blocked because they require monthly/annual climate inputs and hours.

## Verification Notes

- Page 520 displayed direct rows sum exactly to `Hd = 1748.73 W/K`.
- Page 520 displayed ground rows sum exactly to `Hg = 86.12 W/K`.
- Corrected-U direct-row tolerance: absolute `0.40 W/K`.
- Corrected-U direct total tolerance: absolute `1.00 W/K`.
- Page 521 monthly `Htr` tolerance: absolute `0.02 W/K`.
- Page 521 displayed maximum `Htr` tolerance: absolute `0.04 W/K`.
