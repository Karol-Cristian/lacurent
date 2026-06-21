# FIXTURE 013 - Energy Class Assignment

## Status

- Fixture id: `FIXTURE_013_ENERGY_CLASS_ASSIGNMENT`
- Fixture type: dataset-rule validation.
- Executable: yes.
- Validated helper: `energyClassAssignment.mjs`.
- Source dataset: `src/physics-engine/datasets/mc001EnergyClassThresholds.mjs`.
- Scope exclusions: no certificate workflow, no CPE generation, no reference-building class assignment, no Tabel 5.6 utility-inclusion recalculation, no category inference, no UI/API/DB/Worker/orchestrator/production integration, no deploy, no push.

## MC001 Source Verified Before Implementation

The fixture uses only rows that were independently rechecked against the local MC001 PDF before implementation.

| Source | Verification |
| --- | --- |
| MC001 page 395, Nota 1 | Class intervals in Tabel 5.7-5.14 are open on the left and closed on the right. The page gives the example that residential individual total primary `129 kWh/(m2.an)` is class `A` by Tabel 5.7. |
| MC001 page 397, Tabel 5.7 | Residential individual total primary thresholds: `91, 129, 257, 390, 522, 652, 783`. |
| MC001 page 398, Tabel 5.10 | Education total primary thresholds: `48, 68, 135, 246, 358, 447, 536`. |
| MC001 page 398, Tabel 5.10 | Education total CO2 thresholds: `8.3, 11.6, 23.0, 42.5, 62.2, 77.6, 93.1`. |
| MC001 page 400, Tabel 5.14 | Sports total primary thresholds: `75, 104, 206, 350, 494, 617, 741`. |

No mismatch was found between the selected MC001 rows and the existing dataset.

## Formula / Rule Used

Class assignment is an interval lookup over the reviewed threshold rows:

```text
A+ : value <= first threshold
A..F : previous threshold < value <= current threshold
G : value > last threshold
```

The helper requires explicit:

- `sourceTable`
- `buildingCategoryKey`
- `indicatorBasis`
- `indicatorKey`
- `indicatorValue`

`indicatorKey` is required because one source table and indicator basis can still contain multiple rows, such as heating, cooling, DHW, lighting, ventilation, and total.

## Fixture Cases

| Case | Source row | Value | Expected class | Expected interval | Purpose |
| --- | --- | ---: | --- | --- | --- |
| `education_total_primary_inside_b` | Tabel 5.10 education total primary | `100` | `B` | `(68, 135]` | Ordinary interval lookup. |
| `education_total_primary_upper_bound_b` | Tabel 5.10 education total primary | `135` | `B` | `(68, 135]` | Upper bound is closed. |
| `education_total_primary_lower_bound_b_goes_to_a` | Tabel 5.10 education total primary | `68` | `A` | `(48, 68]` | Lower bound of B is open and belongs to previous interval. |
| `education_total_primary_below_first_threshold` | Tabel 5.10 education total primary | `0` | `A+` | `<=48` | Below first threshold handling. |
| `education_total_primary_above_last_threshold` | Tabel 5.10 education total primary | `536.01` | `G` | `>536` | Above final threshold handling. |
| `education_total_co2_upper_bound_c` | Tabel 5.10 education total CO2 | `42.5` | `C` | `(23, 42.5]` | Environmental/CO2 basis lookup. |
| `residential_individual_total_primary_page_395_example` | Tabel 5.7 residential individual total primary | `129` | `A` | `(91, 129]` | MC001 page 395 boundary example. |
| `sports_total_primary_upper_bound_f` | Tabel 5.14 sports total primary | `741` | `F` | `(617, 741]` | Upper bound before G remains class F. |
| `sports_total_primary_above_maximum_g` | Tabel 5.14 sports total primary | `741.01` | `G` | `>741` | Above maximum class G. |

## Blocked Rows

| Row | Reason |
| --- | --- |
| Anexa B displayed class labels | Not asserted here. They require Tabel 5.6 utility inclusion, optional-utility threshold recalculation policy, reference-building boundaries, and certificate context. |
| CPE/certificate output | This fixture only validates class interval assignment from explicit inputs. It does not create official or unofficial certificate output. |
| Automatic category selection | Not implemented. The caller must provide `sourceTable` and `buildingCategoryKey`; no category is inferred from building metadata. |

## Verification Notes

- This fixture validates dataset-rule class assignment only.
- It does not validate general certificate workflow.
- It does not validate Anexa B class labels.
- It does not modify any final/primary/CO2 formulas.
- It does not perform UI/Worker/DB/schema/API/orchestrator/deploy/push work.
