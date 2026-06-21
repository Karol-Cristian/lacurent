# FIXTURE 015 - Minimal MC001 Orchestrator Summary

## Status

- Fixture id: `FIXTURE_015_MINIMAL_MC001_ORCHESTRATOR_SUMMARY`
- Fixture type: Level 0 summary aggregator validation.
- Executable: yes.
- Validated helper: `minimalMc001OrchestratorSummary.mjs`.
- Source basis: reviewed Fixture 001-014 metadata, fixture summaries, and explicit blocker documentation.
- Scope exclusions: no production orchestrator, no full MC001 auditor, no certificate workflow, no CPE generation, no report generation, no UI/API/DB/Worker/deploy/production integration, no new MC001 formulas, no invented inputs, and no full DHW final-energy implementation.

## Purpose

Fixture 015 implements the boundary selected by `INVESTIGATION_008_MINIMAL_MC001_ORCHESTRATOR_BOUNDARY`.

It is a pure Physics Engine validation summary. It does not recalculate envelope, ventilation, monthly balance, DHW, final/primary/CO2, RER, class, or utility-threshold values. It summarizes what the current MC001 Physics Engine validation layer can prove from Fixture 001-014 and keeps blockers visible.

## Summary Object Contract

`createMinimalMc001OrchestratorSummary()` returns a plain serializable object with:

- `summaryType = "MC001_MINIMAL_ORCHESTRATOR_SUMMARY"`
- `level = "LEVEL_0_SUMMARY_AGGREGATOR"`
- `isProductionOrchestrator = false`
- `isCertificateWorkflow = false`
- `validatedComponents`
- `displayOnlyReconciliations`
- `blockedComponents`
- `ambiguousComponents`
- `safeForLevel1Candidates`
- `unsafeForLevel1Candidates`
- `level1Readiness`
- `recommendedNextStep = "BUILD_EXPLICIT_LEVEL_1_INPUT_PACK_BEFORE_COMPONENT_ORCHESTRATION"`
- `sourceFixtures`
- `fixtureCoverage`

The returned object is deterministic and JSON-serializable.

## Source Fixture Coverage

| Fixture | Included as | Summary role |
| --- | --- | --- |
| `FIXTURE_001_ENVELOPE` | component validation | material correction, layer resistance, total resistance, U values |
| `FIXTURE_002_ENVELOPE_BRIDGES` | component validation | thermal bridges |
| `FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS` | component validation | remaining envelope U values and transmission subsets |
| `FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS` | component validation | Hd, Hg, Htr, transmission table totals |
| `FIXTURE_005_VENTILATION_HVE_SUMMARY` | component validation | bve, Hve, traceable monthly ventilation transfer |
| `FIXTURE_006_HEATING_NEED_TABLE_SUMMARY` | component validation with ambiguity markers | QH;ht rows, QH;gn rows, helper-compatible QH;nd rows, annual displayed QH;nd |
| `FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY` | component validation | final energy, primary energy, renewable/non-renewable primary, relation 5.4b CO2, specific indicators |
| `FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS` | service-row validation | explicit service final-energy and primary-energy rows |
| `FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT` | component validation | DHW pipe Psi component formulas |
| `FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION` | component validation | useful DHW demand `QW,nd` |
| `FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL` | display reconciliation | displayed DHW subtotal arithmetic only |
| `FIXTURE_012_RER_DISPLAY_RECONCILIATION` | display reconciliation | Anexa B displayed RER arithmetic only |
| `FIXTURE_013_ENERGY_CLASS_ASSIGNMENT` | component validation | numeric Tabel 5.7-5.14 thresholds, open-left/closed-right intervals, isolated class assignment |
| `FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION` | component validation | Tabel 5.6 utility inclusion, optional cooling threshold recalculation |

## Validated Components Included

- Envelope/transmission: material correction, layer resistance, total resistance, U/U', thermal bridges, Hd, Hg, Htr, and displayed transmission table totals.
- Ventilation: bve, Hve, and monthly ventilation transfer where source inputs are traceable.
- Monthly heating: QH;ht rows, QH;gn rows, helper-compatible QH;nd rows, and annual displayed QH;nd reconciliation.
- Final/primary/CO2: final energy total, primary energy, renewable primary, non-renewable primary, specific primary indicator, CO2 according to relation 5.4b, and specific CO2.
- Service-row validation: Fixture 008 service final-energy rows and service primary-energy rows.
- DHW: DHW pipe Psi component formulas, useful DHW demand `QW,nd`, and displayed DHW subtotal arithmetic.
- RER: Anexa B displayed RER arithmetic only.
- Energy classes and utility inclusion: numeric Tabel 5.7-5.14 thresholds, open-left/closed-right intervals, isolated class assignment, Tabel 5.6 utility inclusion, optional cooling threshold recalculation, and the school-without-cooling example:

```text
135 - 13 = 122 kWh/(m2.an)
23.0 - 13 * 0.107 = 21.61 kgCO2/(m2.an)
```

## Blocked And Ambiguous Components Preserved

| Area | Preserved status |
| --- | --- |
| Ventilation | ACH airflow remains blocked without explicit volume/ACH inputs. |
| Ventilation | Unconditioned-zone bve remains blocked without explicit source rows. |
| Monthly heating | April boundary-period extraction gap remains `blocked_ambiguous`. |
| Monthly heating | September boundary-period extraction gap remains `blocked_ambiguous`. |
| Monthly heating | October MC001 worked-example ambiguity remains `blocked_ambiguous`. |
| Monthly heating | Figure 2.18 `gammaH > 2` branch is preserved and not changed. |
| Final/primary/CO2 | Anexa B displayed CO2 inconsistency remains blocked. |
| DHW | Annual distribution-loss basis, storage losses, generation losses, recovered losses, auxiliary energy, and full DHW final energy remain blocked. |
| RER | General RER methodology and `EPren,RER` perimeter/export treatment remain blocked. |
| Energy classes | Anexa B displayed class labels, mixed-use weighted thresholds, overheating/discomfort hours above 26 degC, and virtual ventilation full calculation remain blocked. |
| Certificate/CPE | Full certificate/CPE workflow remains blocked and out of scope. |

## Level 1 Readiness

The fixture marks Level 1 component orchestration as not ready:

```text
NOT_READY_EXPLICIT_INPUT_PACK_REQUIRED
```

Level 1 is still blocked until a fully explicit helper-input pack exists. Candidate Level 1 helper calls remain possible only for narrow components with explicit traceable inputs and fail-closed missing-input handling.

## Verification Notes

- This fixture is a validation summary only.
- It does not call existing physics helpers to recompute MC001 values.
- It does not generate certificate, CPE, report, UI, worker, DB/schema, API, deploy, or production output.
- It does not add new MC001 formulas.
- It does not turn display reconciliations into full methodology validation.
- It keeps Level 1 and Level 2 boundaries explicit.

