# MC001 Validation Gap Analysis

## 1. What The Physics Engine Already Validates Successfully

The existing isolated helpers validate formula mechanics when explicit inputs are supplied:

- `materialsUValues.mjs`: lambda correction, layer resistance, total resistance, plain U value.
- `transmissionCoefficients.mjs`: direct transmission with explicit bridge terms, corrected U' transmission, linear bridge psi, Htr component sum.
- `ventilationCoefficients.mjs`: airflow from ACH, bve, Hve, derived Hve from m3/h airflow, monthly ventilation transfer from explicit climate input.
- `monthlyTransmissionTransfer.mjs`: Figure 2.11 style monthly transmission transfer from explicit Htr/Hgr and climate values.
- `monthlyBalance.mjs`: Qtr plus Qve, Qint plus Qsol, monthly heating/cooling need branches, annual sums.
- `finalPrimaryCo2Indicators.mjs`: final-energy aggregation, primary-energy conversion from reviewed Tabel 5.17 registry, CO2 conversion from MC001 relation (5.4b) primary-energy terms using reviewed Tabel 5.18 registry, specific indicators per area.
- `energyClassAssignment.mjs`: explicit source-table/category/indicator class interval lookup using reviewed Tabel 5.7-5.14 rows and MC001 open-left/closed-right interval semantics.
- `utilityInclusionThresholds.mjs`: reviewed Tabel 5.6 mandatory/optional utility flags and MC001 Nota 4 total/CO2 threshold subtraction for explicit missing optional utility thresholds.
- `mc001DhwDemandTable3_3_1.mjs`: reviewed numeric Tabel 3.3.1 DHW specific-demand registry for non-residential/use-category lookup.
- `dhwUsefulDemand.mjs`: useful DHW energy, residential/non-residential daily volume, temperature correction, residential equivalent consumers, Tabel 3.3.1 lookup, and relation (3.197) loss/waste volume from explicit inputs.
- `dhwDistributionLosses.mjs`: DHW distribution component formulas for mean distribution temperature and pipe linear transmittance from explicit inputs.
- `envelopeRequirementChecks.mjs`: reviewed Tabel 2.4 and 2.7 envelope requirement checks.

These are formula validations, not full MC001 example reproductions.

## 2. Formulas Still Lacking MC001 Example Validation

`FIXTURE_001_ENVELOPE` now provides a complete verified numeric fixture for the external-wall subset of `materialsUValues.mjs` and the corrected-U path in `transmissionCoefficients.mjs`.

`FIXTURE_002_ENVELOPE_BRIDGES` now provides a complete verified numeric fixture for complete external-wall Tabel 2.3 bridge rows and the explicit-bridge path in `transmissionCoefficients.mjs`.

`FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS` now provides verified numeric fixtures for terrace, slab-on-ground, and floor-over-basement R/U values, complete non-wall bridge groups, terrace transmission, and a fixture-scoped source component sum in `calculateTotalTransmissionCoefficient()`.

`FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS` now provides verified numeric fixtures for Anexa B page 520 displayed `Hd` and `Hg` totals, the page 520 formula-derived transmission subtotal, and page 521 monthly `Htr` component sums from displayed `Hd`, `Hg`, `Ha`, and `Hu` values.

`FIXTURE_005_VENTILATION_HVE_SUMMARY` now provides verified numeric fixtures for Anexa B natural ventilation rows: exterior-air `bve`, page 520 source-implied `Hve`, and page 522 monthly `Qve` values from displayed monthly temperatures and hours.

`FIXTURE_006_HEATING_NEED_TABLE_SUMMARY` now provides verified numeric fixtures for Anexa B page 522 monthly heating-balance rows: adjusted `QH;ht`, adjusted `QH;gn`, helper-compatible `QH;nd` rows, and the displayed annual `QH;nd` sum.

`FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY` now provides a verified narrowed fixture for Anexa B final-to-primary/CO2 rows: final energy aggregation from reviewed service rows, Tabel 5.17 primary-energy factors, Tabel 5.18 CO2 factors using relation (5.4b), specific primary indicators, specific CO2 indicators, and the combined summary helper.

`FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS` now provides a verified narrowed fixture for Anexa B service final-primary rows: service-level final energy, Tabel 5.17 renewable/non-renewable/total primary energy, service-specific primary indicators, total primary indicators, and primary sub-results through the summary helper without asserting conflicted CO2 display rows.

`FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT` now provides a verified narrowed fixture for Anexa 3.3.B DHW distribution component rows: mean DHW distribution temperature and pipe linear transmittance formulas (3.200)-(3.204). It intentionally does not validate annual DHW distribution-loss energy, recovery, auxiliary energy, storage, generation, or final energy.

`FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION` now provides a verified narrowed fixture for the Anexa B school useful-demand service-unit chain: Tabel 3.3.1 row 13, `f = 300`, `VW,day = 1500 l/day`, `VW,ls,day = 645 l/day`, total `Vday = 2145 l/day`, `60/10 degC` temperatures, page 525 monthly `QW,nd` rows, and annual `QW,nd = 18519.13 kWh/an`.

`INVESTIGATION_006_DHW_FINAL_ENERGY_CHAIN_MAP` maps the remaining Anexa B page 525 DHW chain after useful demand. It finds that the displayed final-energy subtotal is traceable for a narrow arithmetic reconciliation fixture, while annual distribution-loss formulas, storage losses, generation losses, recovered losses, and nonzero auxiliary energy remain blocked.

`FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL` now provides that display-only arithmetic fixture for Anexa B page 525: `18519.13 + 19599.3 + 0 + 0 + 0 = 38118.43 kWh`, compared against displayed `Qw,total = 38118 kWh` with a `0.43 kWh` display delta.

`FIXTURE_012_RER_DISPLAY_RECONCILIATION` now provides a display-only arithmetic fixture for Anexa B page 527/page 540: `((39.0 + 24.5) * 0.20) / 170.1 * 100 = 7.466196355085245%`, rounded to the displayed `RER = 7.47%`. It does not validate general RER methodology, exact Fixture 007/008 primary split as a pass criterion, energy classes, CO2 display rows, or certificate workflow.

`FIXTURE_013_ENERGY_CLASS_ASSIGNMENT` now provides a dataset-rule fixture for explicit class interval assignment from MC001 pages 395 and 397-400. It verifies selected Tabel 5.7, 5.10, and 5.14 rows against the reviewed dataset, validates lower-open/upper-closed boundaries, below-minimum `A+`, above-maximum `G`, primary-energy classes, and CO2/environmental classes. It does not validate Anexa B class labels or certificate workflow.

`FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION` now provides a dataset-rule fixture for MC001 pages 395-396. It verifies Tabel 5.6 residential and non-residential mandatory/optional utility flags, validates the school-without-cooling B/C total primary threshold `135 - 13 = 122`, and validates the CO2 threshold `23.0 - 13 * 0.107 = 21.61`. It does not infer certificate classes, calculate virtual ventilation consumption, calculate overheating hours, or implement mixed-use averaging.

No indexed MC001 example currently provides a complete end-to-end verified numeric fixture for these remaining implemented helpers:

- Any envelope U/R rows not covered by fixtures 001 and 003.
- Remaining explicit bridge-geometry contribution reproduction for rows with blank length cells.
- Linear bridge psi derivation from `L2D`, because no numeric `L2D` example is currently sourced.
- ACH airflow reproduction from Anexa B ventilation rows, because no heated volume and ACH pair is currently sourced.
- Unconditioned-zone `bve` reproduction, because no `bztu` and unconditioned-zone ventilation example row is currently sourced.
- Independent rhoA*ca constants for the Anexa B page 520 `Hve` display; page 172 AHU constants do not reproduce the displayed natural-ventilation Hve row.
- Ground-transfer derivation for page 520/page 521 `Hg` values from source ground-model intermediates.
- Monthly transmission transfer derivation from source ground/climate intermediates.
- Full monthly heating-need reproduction for April, September, and October, because `INVESTIGATION_002_HEATING_PERIOD_BOUNDARY_FORMULA` classifies the page 522 positive `QH;nd` values at `gammaH > 2` as an MC001 source conflict with Figure 2.18. Apr/Sep can be diagnostically reconstructed from continuous/full-month columns, but not through the current Figure 2.18 helper branch.
- Exact monthly heating-need reproduction from displayed `etaH;gn`, because Anexa B page 522 rounds utilization factors to two decimals.
- Full primary energy and CO2 reproduction from Anexa A or Anexa B certificate/CPE summaries beyond the narrowed Fixture 007 and Fixture 008 service rows.
- General RER/certificate reproduction beyond the Anexa B display row, because Fixture 012 validates only page 527/page 540 displayed RER arithmetic. Generic RER still needs an explicit `EPren,RER` perimeter and renewable/export context. Explicit class interval assignment is validated by Fixture 013 and Tabel 5.6 threshold recalculation is validated by Fixture 014, but Anexa B class labels still need full class-label workflow context, including reference-building/CPE boundaries and unresolved source conflicts.
- Full DHW final-energy formula validation remains blocked even though Fixture 010 validates the Anexa B useful-demand row and Fixture 011 validates the display-only subtotal arithmetic; distribution/storage/generation/auxiliary inputs still cannot be independently calculated.
- DHW annual distribution-loss energy validation, because Fixture 009 validates only component rows and `INVESTIGATION_004_DHW_ANNUAL_DISTRIBUTION_LOSS_BASIS` keeps the Anexa 3.3.B energy rows blocked: `QW,dis,ls` is missing a traceable effective length, `QW,dis,stub` has a worked-example Wh/kWh scale inconsistency, and `QW,dis,nom` needs visual review of relation (3.207) versus the page 279 mass-flow formula.
- Anexa B page 527 electric-service CO2 display rows, because `INVESTIGATION_003` classifies `0.086*` as a worked-example inconsistency that double-counts the SEN electricity renewable-share adjustment already embedded in Tabel 5.18.
- Anexa B page 523 heating final-energy text, because `INVESTIGATION_003` classifies `100.06 MWh/an` as a worked-example prose typo conflicting with the internally consistent page 523 primary table and page 533 service row.
- Envelope requirement checks against a worked MC001 example row.

The helpers can run, but the example data cannot yet support strict expected-value assertions.

## 3. Datasets That Block Validation

| Dataset | Blocks |
| --- | --- |
| monthly exterior temperature | monthly transmission transfer and monthly heating/cooling balance outside the reviewed page 522 ventilation rows |
| annual exterior temperature | Figure 2.11 ground term in monthly transmission transfer |
| monthly solar irradiation | solar gains, renewable production, monthly balance |
| orientation/tilt and sky/longwave data | solar gains and renewable examples |
| lighting SR EN 15193-1 data | lighting service output checks in Anexa B |
| cleaned economic formulas/tables | renovation package and payback/global-cost validation |

## 4. Extraction Gaps Remaining

- Clean visual extraction of Anexa B geometry/envelope R/R' rows not already covered by reviewed fixtures.
- Clean visual extraction of Anexa B thermal bridge rows with blank lengths or L2D-dependent psi values.
- Clean visual extraction of Anexa B combined H final rows and independent ventilation constants.
- Clean visual extraction of Anexa B monthly heating/gains rows beyond the reviewed Fixture 006 subset, especially utilization-factor derivation and source conflicts between continuous/full-month columns, adjusted columns, and Figure 2.18 branch conditions.
- Clean visual extraction of broader Anexa B DHW, lighting, and ventilation service rows. The Anexa B school useful-demand unit count and useful-demand energy row are covered by Fixture 010, and the page 525 final-energy displayed subtotal is covered by Fixture 011; broader DHW final-energy boundaries and system inputs remain blocked.
- Clean visual extraction of Anexa 3.3.B DHW distribution-loss energy rows after Fixture 009's component-only validation, including the effective-length basis, relation (3.207) formula path, and the Wh/kWh timestep labeling conflict identified by `INVESTIGATION_004_DHW_ANNUAL_DISTRIBUTION_LOSS_BASIS`.
- Clean visual extraction of remaining Anexa B final primary/CO2/CPE rows; page 523 heating text and page 527 electric CO2 coefficient are now classified source conflicts, not executable expected outputs.
- General RER and certificate workflow extraction beyond Fixture 012's page 527/page 540 display arithmetic; Anexa B class-label validation remains blocked even though Fixture 014 handles Tabel 5.6 utility inclusion and optional-utility recalculation, because certificate/reference-building boundaries and displayed class-label source context are still not implemented.
- Numeric registry for MC001 climate and solar tables.
- Visual verification of audit economic relations (6.1), (6.3), and (6.4).

## 5. Recommended Next Physics Engine Task

Next task: keep Anexa B displayed class labels and certificate workflow blocked until reference-building/CPE boundaries, virtual mandatory utilities, overheating indicator handling, and mixed-use averaging are independently extracted and validated. Do not promote Fixture 012 into a general RER helper, certificate generator, or broad certificate calculator.

Rationale:

- Fixtures 007 and 008 prove the Tabel 5.17 service final-primary factor path, Fixture 007 proves the Tabel 5.18 normative CO2 path, and `INVESTIGATION_003` classified the two source-display conflicts.
- Fixture 012 proves only the RER display row arithmetic: ventilation primary `39.0`, lighting primary `24.5`, electric renewable share `20%`, and total primary `170.1`.
- Page 527 displayed CO2 totals should stay blocked for Tabel 5.18 validation because the worked example applies an extra 80% electricity multiplier.
- Page 523 heating prose should stay blocked because its final-energy value is isolated and inconsistent with the surrounding primary/service rows.
- Continue with explicit rows or missing-input behavior only; do not add certificate generation, general RER perimeter logic, or production integration. Class work should remain limited to explicit interval lookup and explicit threshold adjustment until certificate/reference-building context is validated.

Do not add an orchestrator, production integration, UI, workers, API behavior, schema changes, marketplace work, recommendation work, or AI experiments as part of that task.
