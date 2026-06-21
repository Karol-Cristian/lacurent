# FIXTURE 012 - RER Display Reconciliation

## Status

- Fixture id: `FIXTURE_012_RER_DISPLAY_RECONCILIATION`
- Source candidate: `MC001_EX_B_FINAL_PRIMARY_CO2_CPE`
- Executable: yes, as a displayed arithmetic reconciliation fixture only.
- Validated module: none.
- Scope exclusions: no general RER methodology, no RER helper, no class-assignment use in this fixture, no CPE/certificate implementation, no production integration, no UI, no workers, no DB/schema/API, no deploy, no push.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Anexa B page 527: final primary/CO2/RER summary.
- Anexa B page 540: final displayed certificate indicator section repeating `RER = 7.47%`.
- `INVESTIGATION_007_RER_AND_CERTIFICATE_INDICATORS_TRACEABILITY`: reviewed policy that only the displayed page 527 RER arithmetic is ready for a narrow fixture.

## Displayed Inputs

| Input | Source value | Fixture role |
| --- | ---: | --- |
| Ventilation primary-energy component | `39.0 kWh/m2.an` | Displayed electric-service primary component. |
| Lighting primary-energy component | `24.5 kWh/m2.an` | Displayed electric-service primary component. |
| Electric renewable weighting factor | `20%` | Displayed page 527 RER factor, traceable to Tabel 5.17 `0.50 / 2.50`. |
| Displayed total specific primary energy | `170.1 kWh/m2.an` | Denominator used by page 527. |
| Displayed RER | `7.47%` | Displayed expected value. |

## Validated Arithmetic

The fixture validates only the page 527 displayed arithmetic:

```text
RER = ((39.0 + 24.5) * 0.20) / 170.1 * 100
```

Calculated value:

```text
7.466196355085245%
```

Displayed value:

```text
7.47%
```

| Metric | Expected/displayed | Calculated | Absolute delta | Percentage/display delta |
| --- | ---: | ---: | ---: | ---: |
| Raw page 527 arithmetic | `7.466196355085245%` | `7.466196355085245%` | `0 percentage points` | `0%` |
| Rounded display value | `7.47%` | `7.47%` | `0 percentage points` | `0%` |
| Raw value against display | `7.47%` | `7.466196355085245%` | `0.0038036449147549334 percentage points` | `0.05091894129524677%` |

The raw-to-display difference is a two-decimal display rounding delta.

## Diagnostic Only

Fixture 007/008 exact Tabel 5.17 primary split gives:

```text
17335.15 / 232610.934 * 100 = 7.452422679322547%
```

This differs from the displayed `7.47%` by `0.017577320677452768` percentage points, or `0.23530549769013076%` relative. This value is diagnostic only. It is not used as the pass criterion for Fixture 012 because this fixture validates the displayed page 527 arithmetic, not the exact primary split from rounded/unrounded service rows.

## Assumptions

- The fixture uses only the displayed Anexa B page 527 values named above.
- The `20%` factor is accepted only as the page 527 displayed RER weighting factor and is consistent with the Tabel 5.17 consumed SEN electricity renewable share `fPren / fPtot = 0.50 / 2.50`.
- Page 540 is used only as the repeated final displayed `RER = 7.47%` indicator.
- No on-site, nearby, exported, or renewable production term is inferred.

## Blocked Rows

| Row | Reason |
| --- | --- |
| General RER methodology | `EPren,RER`, `EPtot`, selected perimeter and export treatment must be explicit before validating or implementing a general RER calculation. |
| Exact Fixture 007/008 primary split as pass criterion | The exact primary split is diagnostic only and must not replace the displayed page 527 expected values. |
| Energy class labels | Class labels on pages 527, 528 and 533 remain blocked because this fixture does not implement class assignment, Tabel 5.6 utility inclusion, optional-utility recalculation, reference-building classification, or certificate workflow. The Tabel 5.7-5.14 threshold registry is now numeric after `EXTRACTION_008_ENERGY_CLASS_THRESHOLDS_NUMERIC_TABLES`. |
| Page 527/page 540 displayed CO2 | `INVESTIGATION_003` classifies the electric-service CO2 display coefficient `0.086*` as a worked-example inconsistency with the normative Tabel 5.18 path. |
| Certificate/CPE workflow | This fixture does not validate certificate generation, reference-building class assignment, official CPE workflow, or production integration. |

## Verification Notes

- No `calculateRer()` helper is added.
- No existing Physics Engine formulas are modified.
- No class-assignment helper is used by this RER display fixture.
- No CPE/certificate workflow is implemented.
