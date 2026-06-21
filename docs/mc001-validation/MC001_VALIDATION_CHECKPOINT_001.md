# MC001 Validation Checkpoint 001

## Status

- Checkpoint id: `MC001_VALIDATION_CHECKPOINT_001`
- Date: 2026-06-20
- Scope: MC001 Physics Engine unit tests, validation fixtures 001-007, and source-conflict investigations 002-003.
- Result: pass.
- Formula changes in this checkpoint: none.
- New fixtures in this checkpoint: none.

## Tests Run

All MC001 Physics Engine unit and validation tests under `src/physics-engine/tests/**/*.test.mjs` were run.

```text
Ran 20 test files.
All test files passed.
```

## Fixture Status

| Fixture | Status | Validated modules | Validated scope | Remaining blocker |
| --- | --- | --- | --- | --- |
| `FIXTURE_001_ENVELOPE` | executable | `materialsUValues.mjs`, `transmissionCoefficients.mjs` | external wall layers, lambdas, R/U, corrected-U transmission | broader envelope table remains partial |
| `FIXTURE_002_ENVELOPE_BRIDGES` | executable narrowed | `transmissionCoefficients.mjs` | complete external-wall bridge rows and explicit bridge transmission | blank length rows and L2D psi derivation remain blocked |
| `FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS` | executable narrowed | `materialsUValues.mjs`, `transmissionCoefficients.mjs` | terrace, slab-on-ground, floor-over-basement R/U, complete bridge groups, terrace/source component sums | slab is Hg not Hd; floor-over-basement transmission source-blocked; L2D psi derivation blocked |
| `FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS` | executable narrowed | `transmissionCoefficients.mjs` | page 520 Hd/Hg totals and page 521 monthly Htr component sums | Hve, H final, ground derivation, monthly transfer energy blocked |
| `FIXTURE_005_VENTILATION_HVE_SUMMARY` | executable narrowed | `ventilationCoefficients.mjs` | exterior-air bve, source-implied Hve, monthly Qve rows | ACH, unconditioned-zone bve, independent rhoA*ca constants, fan/AHU energy blocked |
| `FIXTURE_006_HEATING_NEED_TABLE_SUMMARY` | executable partial | `monthlyBalance.mjs` | QH;ht, QH;gn, helper-compatible QH;nd rows, annual QH;nd sum, diagnostic Apr/Sep/Oct reconstruction | Apr/Sep/Oct strict QH;nd assertions blocked as `MC001_SOURCE_CONFLICT` |
| `FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY` | executable narrowed | `finalPrimaryCo2Indicators.mjs` | final energy totals, Tabel 5.17 primary energy, relation 5.4b CO2 with Tabel 5.18, specific indicators, summary helper | page 523 heating prose, page 527/page 540 CO2 display, RER/classes blocked |

## Validated Formula Coverage

- Material lambda correction, layer resistance, total resistance, plain U value.
- Corrected resistance from source correction factor and corrected-U direct transmission.
- Explicit bridge contribution `psi * L * multiplicity` and verified bridge subtotals.
- Total transmission coefficient from explicit source components.
- Natural-ventilation exterior-air bve, source-implied Hve, and monthly ventilation transfer Qve.
- Monthly total heat transfer `QH;ht = QH;tr + QH;ve`.
- Monthly total gains `QH;gn = QH;int + QH;sol`.
- Figure 2.18-compatible monthly heating need branches for helper-compatible rows.
- Annual heating need sum from displayed monthly values.
- Final energy summation by service/carrier.
- Primary energy from final energy using Tabel 5.17 factors.
- CO2 from primary energy using relation (5.4b) and Tabel 5.18 factors.
- Specific indicators per reference area.
- Combined final/primary/CO2 summary helper.

## Confirmed Source Conflicts

### Investigation 002 - Heating Period Boundary Formula

Classification: `MC001_SOURCE_CONFLICT`.

Fixture 006 keeps these rows blocked for strict `calculateMonthlyHeatingNeed()` assertion:

| Month | Reason |
| --- | --- |
| Apr | Boundary month; Anexa B can be diagnostically reconstructed from continuous/full-month columns only by bypassing Figure 2.18 `gammaH > 2 -> 0`. |
| Sep | Boundary month; same continuous-column diagnostic path as April. |
| Oct | Full heating month; positive Anexa B `QH;nd` directly conflicts with Figure 2.18 because displayed `gammaH > 2`. |

No formula change is safe from current MC001 evidence.

### Investigation 003 - Final Energy And CO2 Conflicts

Page 523 classification: `WORKED_EXAMPLE_PROSE_TYPO`.

- The page 523 text value `100.06 MWh/an` is blocked.
- The traceable path uses page 533 `88/81 kWh/m2.an` and page 523/page 527 primary values.

Page 527/page 540 classification: `WORKED_EXAMPLE_FACTOR_INCONSISTENCY_DOUBLE_COUNTS_ELECTRIC_RENEWABLE_SHARE`.

- Page 527 uses `0.086* = 0.107 * 0.80`.
- Page 486 says the 20% SEN renewable-share impact is already embedded in Tabel 5.18.
- Page 540's final displayed CO2 indicator inherits the page 527 display conflict.
- The executable fixture validates Tabel 5.18 `0.107`, not `0.086*`.

## Unsafe To Implement

- Do not remove or bypass `gammaH > 2.0 -> QH;nd = 0` in `monthlyBalance.mjs` based only on Anexa B page 522.
- Do not implement a boundary-month QH;nd formula from fractional heating days without a traced MC001 equation or erratum.
- Do not use page 523 `100.06 MWh/an` as a final heating expected value.
- Do not add `0.086*` as an electricity CO2 factor.
- Do not assert page 527/page 540 displayed CO2 totals against the Tabel 5.18 path.
- Do not extend to RER, certificate class, certificate generation, or production integration yet.
- Do not add climate fallback, DHW invented values, or hidden service assumptions.

## Remaining Gaps

- Full indexed MC001 examples remain non-executable end to end.
- Climate/solar datasets are still missing for full monthly transfer, solar gains, and renewable production.
- DHW Tabel 3.3.1 numeric values were extracted after this checkpoint; subsequent useful-demand helper coverage now exists for relations (3.188)-(3.196), while cleaned Anexa B service inputs remain blocked.
- Energy class thresholds 5.7-5.14 remain indexed-only, not numeric executable data.
- L2D thermal bridge psi derivation lacks a traceable numeric example.
- Independent Anexa B ventilation constants for page 520 Hve remain unverified.
- RER/classes/certificate workflow remains blocked.

## Next Safest Validation Target

Next safest target: a narrowly scoped service final-primary row fixture, for example `FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS`, using only explicit service rows from Anexa B pages 525-526/533 and reviewed Tabel 5.17 factors.

Constraints for that next target:

- no certificate/class/RER validation;
- no page 527/page 540 displayed CO2 assertion;
- no invented DHW, lighting, ventilation, or climate inputs;
- no formula changes unless a new source-proven defect is found.
