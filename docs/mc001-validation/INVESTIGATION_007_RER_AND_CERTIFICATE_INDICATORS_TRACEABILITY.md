# INVESTIGATION 007 - RER And Certificate Indicators Traceability

## Status

- Investigation id: `INVESTIGATION_007_RER_AND_CERTIFICATE_INDICATORS_TRACEABILITY`
- Scope: final certificate-adjacent indicators only.
- Code changes justified: no.
- Formula changes justified: no.
- Recommended next executable target: `FIXTURE_012_RER_DISPLAY_RECONCILIATION`.
- Superseded class-work note: `EXTRACTION_008_ENERGY_CLASS_THRESHOLDS_NUMERIC_TABLES` later created the reviewed numeric Tabel 5.7-5.14 threshold registry, and `FIXTURE_013_ENERGY_CLASS_ASSIGNMENT` later validated explicit interval assignment. This does not change the RER conclusion and does not implement Anexa B class-label validation or certificate workflow.

This investigation does not create a certificate workflow, energy-class calculator, RER helper, UI, worker, DB/schema/API path, orchestrator, production integration, deploy, push, or commit.

## Sources Inspected

| Source | Use in this investigation |
| --- | --- |
| MC001-2022 pages 394-396 | Class category rules, utility inclusion context, interval boundary note, optional-utility recalculation note. |
| MC001-2022 pages 397-400 | Tabel 5.7-5.14 class and environmental threshold tables; education table 5.10 is visually readable in the PDF text extraction. |
| MC001-2022 page 401 | Tabel 5.15a output indicator list, including specific performance and RER. |
| MC001-2022 pages 407-412 | Global weighted balance, Tabel 5.17 primary-energy factors, relation (5.3), relation (5.4a), Tabel 5.18 CO2 factors, relation (5.4b). |
| MC001-2022 pages 527-528 | Anexa B final primary/CO2/RER summary, real-building class text, and reference-building class context. |
| MC001-2022 page 533 | Anexa B service final/primary specific rows, service classes, total class, reference area. |
| MC001-2022 page 540 | Final displayed certificate indicators: EP, RER, CO2. |
| `FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY` | Validated final/primary/CO2 and exact Tabel 5.17/Tabel 5.18 path. |
| `FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS` | Validated service final-primary rows and renewable/non-renewable/total primary split. |
| `INVESTIGATION_003_ANEXA_B_FINAL_ENERGY_AND_CO2_CONFLICTS` | Existing classification for page 523 heating prose and page 527/page 540 CO2 display conflicts. |
| `src/physics-engine/datasets/mc001EnergyClassThresholds.mjs` | At investigation time, confirmed local class-threshold registry was metadata-only. This was later superseded by `EXTRACTION_008_ENERGY_CLASS_THRESHOLDS_NUMERIC_TABLES`. |

## Source Findings

MC001 page 401 lists RER as a calculated annual output indicator. Pages 409-410 state that Tabel 5.17 factors are used both for energy-performance classes and for RER. Module 13 extracts relation (5.16):

```text
RER = EPren,RER / EPtot
```

The Anexa B page 527 worked example gives an explicit RER display formula:

```text
RER = ((24.5 + 39.0) * 20%) / 170.1 * 100 = 7.47%
```

The 20% term is traceable to Tabel 5.17 for consumed SEN electricity:

```text
fPren / fPtot = 0.50 / 2.50 = 0.20
```

District-heating services in the Anexa B case have `fPren = 0`, no on-site renewable production is included, and page 540 repeats the final displayed RER as `7.47%`.

Specific primary energy is already covered by Fixture 007/Fixture 008 through the validated Tabel 5.17 path and page 527/page 533/page 540 display comparisons. Normative specific CO2 is already covered by Fixture 007 through relation (5.4b) and Tabel 5.18. The Anexa B displayed CO2 path remains blocked by `INVESTIGATION_003` because page 527 applies `0.086* = 0.107 * 0.80` to electric primary energy even though page 486/Tabel 5.18 already embed the SEN renewable-share effect.

Class thresholds 5.7-5.14 are visible in MC001 pages 397-400. At investigation time, the local dataset registry was metadata-only. After `EXTRACTION_008_ENERGY_CLASS_THRESHOLDS_NUMERIC_TABLES` and `FIXTURE_013_ENERGY_CLASS_ASSIGNMENT`, numeric threshold lookup and explicit interval assignment are available, but class labels on pages 527, 528, and 533 are still not executable validation outputs until a fixture handles Tabel 5.6 utility inclusion and the page 396 optional-utility threshold recalculation rule.

## RER Trace

| Path | Inputs | Calculation | Result | Classification |
| --- | --- | ---: | ---: | --- |
| Page 527 display formula | Ventilation primary `39.0`, lighting primary `24.5`, electric renewable share `20%`, total primary `170.1` | `((39.0 + 24.5) * 0.20) / 170.1 * 100` | `7.466196355%`, displayed `7.47%` | `traceable_ready_for_fixture_012` |
| Exact validated primary split | Fixture 007/008 renewable primary `17335.15 kWh`, total primary `232610.934 kWh` | `17335.15 / 232610.934 * 100` | `7.452422679%` | `traceable_ready_for_fixture_012` as a diagnostic cross-check |
| General RER implementation | `EPren,RER`, `EPtot`, export/perimeter policy | Needs selected perimeter and export treatment | not calculated | `blocked_formula_ambiguity` for generic certificate use |

The page-display route differs from the displayed `7.47%` by `0.003803645` percentage points, or `0.050919%` relative. The exact validated-value route differs from `7.47%` by `0.017577321` percentage points, or `0.235305%` relative. This is consistent with display rounding and the rounded service values used by the worked example.

## Candidate Classification

| Candidate | Classification | Reason |
| --- | --- | --- |
| Anexa B page 527/page 540 RER display | `traceable_ready_for_fixture_012` | Source provides all required display inputs and the explicit arithmetic. No new RER helper is required for a display fixture. |
| RER from Fixture 007/008 validated renewable and total primary energy | `traceable_ready_for_fixture_012` | The primary split is already validated from Tabel 5.17. Use as a secondary diagnostic, not as a replacement for page 527 display arithmetic. |
| General RER helper for arbitrary on-site/nearby/export cases | `blocked_formula_ambiguity` | MC001 requires the selected RER perimeter and export treatment to be explicit; module 12 renewable production/export datasets remain incomplete. |
| Specific total primary indicator | `already_validated_by_fixture_007` | Fixture 007 validates `EPtot / Aref`; Fixture 008 validates service primary rows. |
| Page 527/page 533/page 540 specific primary display | `already_validated_by_fixture_007` | Existing fixtures compare the page 527/page 533 display path within rounding tolerance. |
| Normative specific CO2 indicator from Tabel 5.18 | `already_validated_by_fixture_007` | Fixture 007 validates relation (5.4b) using Tabel 5.18, including the specific indicator per area. |
| Page 527/page 540 displayed CO2 indicator | `MC001_worked_example_inconsistency` | Page 527 uses the `0.086*` electric coefficient path already classified by Investigation 003 as inconsistent with Tabel 5.18/page 486. |
| Tabel 5.7-5.14 threshold dataset | superseded: `reviewed_numeric_values_extracted` after `EXTRACTION_008` | Values are now present in the local registry as reviewed numeric lookup rows. |
| Anexa B real-building class labels | `blocked_formula_ambiguity` | Labels on pages 527/533 need utility-inclusion/recalculation policy before automated assertion. |
| Anexa B reference-building class labels | `blocked_formula_ambiguity` | Page 528 displays reference class context, but validation still needs reference-building boundaries and class-assignment workflow. |
| Full certificate/CPE generation | `blocked_formula_ambiguity` | MC001 certificate issuance and template workflow are outside the isolated Physics Engine validation scope. |

## Validation Policy

- Fixture 012 should validate only the Anexa B displayed RER arithmetic and optionally include the exact Fixture 007/008 primary-split RER as a diagnostic comparison.
- Fixture 012 should not validate energy classes, page 527/page 540 CO2 display rows, certificate generation, reference-building class assignment, or any RER case involving on-site/nearby/exported renewable production.
- A future Anexa B class-label fixture can use the reviewed Tabel 5.7-5.14 numeric registry and Fixture 013 interval helper, but must still keep certificate workflow blocked and make utility-inclusion/recalculation context explicit.
- A future general RER helper is source-justified only for explicit `EPren,RER` and `EPtot` inputs with a documented perimeter; it should not infer renewable production, export treatment, or certificate workflow.

## Remaining Blockers

- Anexa B class-label validation using reviewed Tabel 5.7-5.14 thresholds plus Tabel 5.6 utility-inclusion/recalculation context.
- Reviewed implementation policy for page 396 optional-utility threshold recalculation.
- General RER perimeter handling for on-site/nearby/exported renewable production.
- Module 12 renewable production/export datasets and matching-factor tables.
- Page 527/page 540 CO2 display conflict from Investigation 003.
- Full official certificate/CPE generation and reference-building workflow.

## Conclusion

RER is traceable enough for a narrow display reconciliation fixture:

```text
FIXTURE_012_RER_DISPLAY_RECONCILIATION
```

Specific primary and normative specific CO2 indicators are already validated by Fixture 007. Energy class and certificate-class labels remain blocked until a narrow class-label fixture uses the reviewed numeric dataset with explicit utility-inclusion/recalculation context. No Physics Engine formula change is justified.
