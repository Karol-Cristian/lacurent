# INVESTIGATION 003 - Anexa B Final Energy And CO2 Conflicts

## Status

- Investigation id: `INVESTIGATION_003_ANEXA_B_FINAL_ENERGY_AND_CO2_CONFLICTS`
- Scope: Anexa B final-energy and CO2 source conflicts found by `FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY`.
- Target module reviewed for impact: `src/physics-engine/finalPrimaryCo2Indicators.mjs`
- Result: no Physics Engine formula change justified.
- Validation policy impact: keep both Anexa B display conflicts blocked; use normative Tabel 5.17/Tabel 5.18 factor paths for executable validation.

## Source Pages Inspected

Primary/factor source pages:

| Page | Evidence inspected |
| --- | --- |
| 410 | Tabel 5.17 primary energy factors; electricity from SEN has `fPnren = 2.00`, `fPren = 0.50`, `fPtot = 2.50`. |
| 411 | Tabel 5.18 CO2 factors; electricity from SEN has `fCO2 = 0.107`, district cogeneration has `fCO2 = 0.220`. |
| 412 | Relation (5.4b), which calculates CO2 from primary energy terms. |
| 486 | Note stating the 20% renewable share for SEN electricity is already embedded in the Tabel 5.18 CO2 conversion factor. |

Anexa B source pages:

| Page | Evidence inspected |
| --- | --- |
| 523 | Heating primary-energy table and adjacent prose containing the `100.06 MWh/an` final-heating text. |
| 525 | DHW/ACC final and primary rows used as a factor sanity check. |
| 526 | Lighting final and primary rows used as an electricity factor sanity check. |
| 527 | Primary-energy and CO2 summary, including electric CO2 coefficient `0.086*` and its footnote. |
| 533 | Certificate annex service final/primary rows and reference area `1369.4 m2`. |
| 540 | Final certificate indicators, including `170.1 kWh/(m2.an)` and `28.89 kgCO2/(m2.an)`. |

Nearby rendered pages 522, 524, 528, and 532 were also checked for context around the Anexa B tables.

## Conflict 1 - Page 523 Heating Final-Energy Text

### Source Conflict

Page 523 contains two incompatible heating-energy signals:

| Source value | Meaning shown by source | Value |
| --- | --- | ---: |
| Page 523 prose | Annual final heating energy text | `100.06 MWh/an` |
| Page 523 table | Annual total primary energy for heating | `110901.0 kWh` |
| Page 523 table | Specific primary energy for heating | `81.0 kWh/m2.an` |
| Page 533 row | Heating final/primary specific indicators | `88/81 kWh/m2.an` |

### Trace Checks

Using the page 533 reference area:

```text
Aref = 1369.4 m2
```

The page 523 primary table is internally coherent:

```text
110901.0 / 1369.4 = 80.9851 kWh/m2.an
```

Using Tabel 5.17 district cogeneration `fPtot = 0.92`, the final heating energy implied by the page 523 primary table is:

```text
110901.0 / 0.92 = 120544.565 kWh = 120.545 MWh
```

The page 533 heating final-specific row independently gives:

```text
88.0 * 1369.4 = 120507.2 kWh = 120.507 MWh
120507.2 * 0.92 = 110866.624 kWh primary
```

The page 533-derived primary value differs from the page 523 primary table by only:

```text
110901.0 - 110866.624 = 34.376 kWh = 0.0310%
```

The page 523 prose value cannot be reconciled with the factor table:

```text
110901.0 / 100060.0 = 1.10834
```

No inspected source page provides a heating carrier factor or service-boundary adjustment near `1.10834`.

### Classification

Classification: `WORKED_EXAMPLE_PROSE_TYPO`

Confidence: high.

Reasoning:

- The page 523 primary table, page 527 heating primary value, and page 533 heating final/primary specific row are mutually consistent within normal display rounding.
- The prose value `100.06 MWh/an` is isolated and would require an unsupported conversion factor.
- This is not a rounding/display issue; the discrepancy is about `20.5 MWh`, far beyond rounding.
- This is not supported as a different service boundary by any inspected page.
- This is not a true formula conflict in the Physics Engine.

## Conflict 2 - Page 527 Electric CO2 Coefficient `0.086*`

### Source Conflict

Page 527 applies `0.086*` to electric-service CO2 rows, while Tabel 5.18 gives `0.107` for electricity from SEN.

| Source value | Meaning shown by source | Value |
| --- | --- | ---: |
| Tabel 5.18 | CO2 factor for electricity from SEN used by the building | `0.107` |
| Page 527 | Footnoted electric CO2 display coefficient | `0.086*` |
| Page 527 footnote | Only 80% of electric primary energy produces CO2 because 20% comes from non-polluting renewables | `0.107 * 0.80 = 0.0856`, displayed as `0.086` |
| Page 486 note | The 20% renewable share is already embedded in the Tabel 5.18 factor | table factor already includes this adjustment |

### Trace Checks

The page 527 footnoted coefficient is mathematically traceable:

```text
0.107 * 0.80 = 0.0856 ~= 0.086
```

However, page 486 says the 20% renewable-share impact for SEN electricity is already included in the Tabel 5.18 CO2 conversion factor. Applying the page 527 `0.80` multiplier therefore double-counts the renewable-share adjustment relative to the normative factor-table path.

Fixture 007's normative Tabel 5.18 calculation gives:

```text
specific CO2 = 30.21764694756828 kgCO2/m2.an
```

The Anexa B page 527/page 540 displayed result gives:

```text
specific CO2 = 28.888 to 28.89 kgCO2/m2.an
```

The blocked display comparison is:

```text
30.21764694756828 - 28.888 = 1.3296469475682784 kgCO2/m2.an
relative delta = 4.6028%
```

### Classification

Classification: `WORKED_EXAMPLE_FACTOR_INCONSISTENCY_DOUBLE_COUNTS_ELECTRIC_RENEWABLE_SHARE`

Confidence: high.

Reasoning:

- The `0.086*` coefficient is not invented; it is traceable to the page 527 footnote.
- The same adjustment conflicts with page 486, which states that the renewable electricity share is already embedded in the Tabel 5.18 CO2 factor.
- No inspected source page identifies `0.086` as a separate electricity category in Tabel 5.18.
- Relation (5.4b) uses primary energy terms and the corresponding Tabel 5.18 factors; it does not define an extra electric-only 80% multiplier.
- This is a worked-example inconsistency, not a proven engine defect.

## Code Impact

No code change is justified.

`finalPrimaryCo2Indicators.mjs` should continue to calculate:

```text
ECO2 = sum_i((Qf,i * fPtot,i) * fCO2,i)
```

for final-energy inputs without exported energy or refrigerant leakage.

The Fixture 007 correction made before this investigation remains source-supported by relation (5.4b): CO2 is calculated from primary energy, not directly from final energy.

## Recommended Validation Policy

- Keep page 523 prose value `100.06 MWh/an` blocked as `WORKED_EXAMPLE_PROSE_TYPO`.
- For heating final-energy validation, use the page 533 `88/81 kWh/m2.an` service row and page 523/page 527 primary-energy values as the traceable table path.
- Keep page 527 electric CO2 display rows blocked as `WORKED_EXAMPLE_FACTOR_INCONSISTENCY_DOUBLE_COUNTS_ELECTRIC_RENEWABLE_SHARE`.
- For executable CO2 validation, use Tabel 5.18 `0.107` for electricity from SEN and relation (5.4b).
- Do not add `0.086` as a Physics Engine factor unless a future MC001 erratum or higher-priority source explicitly replaces Tabel 5.18/page 486.
- Keep certificate class and RER validation out of scope until their source thresholds and calculation boundaries are separately reviewed.

## Remaining Blockers

- Full Anexa B certificate/CPE reproduction remains blocked by RER, class thresholds, and certificate workflow boundaries.
- Page 527/page 540 displayed CO2 totals cannot be asserted against the Tabel 5.18 path without knowingly accepting the worked-example inconsistency.
- The page 523 prose heating final-energy value should not be used as an executable expected output.
- Broader Anexa B service rows still need cleaned visual extraction before more final/primary-energy fixtures are added.

## Tests

This investigation creates documentation and metadata updates only. No Physics Engine formulas were modified.

Executed:

```text
node src/physics-engine/tests/validation/fixture007FinalPrimaryCo2Summary.validation.test.mjs
node src/physics-engine/tests/validation/mc001Examples.validation.test.mjs
```

Both passed.
