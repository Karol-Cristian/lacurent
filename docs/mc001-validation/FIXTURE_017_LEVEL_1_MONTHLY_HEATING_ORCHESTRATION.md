# FIXTURE 017 - Level 1 Monthly Heating Orchestration

## Status

- Fixture id: `FIXTURE_017_LEVEL_1_MONTHLY_HEATING_ORCHESTRATION`
- Fixture type: Level 1 monthly heating orchestration validation.
- Executable: yes.
- Validated helper: `mc001Level1CoreOrchestrator.mjs`.
- Source basis: reviewed Fixture 006 monthly heating rows and Fixture 016 Level 1 core input pack.
- Scope exclusions: no Level 2 full auditor, no production orchestrator, no certificate workflow, no CPE generation, no report generation, no UI/API/DB/Worker/deploy/product integration, no invented defaults, no full DHW final-energy implementation, no lighting implementation, no cooling-system implementation, and no reference-building implementation.

## Purpose

Fixture 017 extends the Level 1 explicit input pack with an optional `monthlyHeating` section.

It does not add a new monthly heating formula and does not change `monthlyBalance.mjs`. Figure 2.18 behavior, including the `gammaH > 2` branch, remains unchanged. The fixture summarizes only the reviewed monthly heating values and blockers already established by Fixture 006.

## Monthly Heating Input Contract

When present, `monthlyHeating` must include:

| Field | Required | Notes |
| --- | --- | --- |
| `unit` | yes | `kWh` for Fixture 017. |
| `monthlyRows` | yes | Exactly 12 explicit calendar-month rows. |
| `annualDisplayedHeatingNeed` | yes | Displayed annual `QH;nd`, reconciliation only. |
| `blockedMonths` | yes | Explicit blocker list. |
| `ambiguousMonths` | yes | Explicit ambiguity list. |
| `source` | yes | Fixture/source trace. |

Each monthly row must include:

| Field | Required | Notes |
| --- | --- | --- |
| `month` | yes | Source month label from Fixture 006. |
| `QHht` | yes | Reviewed monthly heat-transfer total. |
| `QHgn` | yes | Reviewed monthly gains total. |
| `QHnd` | yes | Numeric for validated months; `null` for blocked/ambiguous months in Fixture 017. |
| `status` | yes | `validated`, `blocked`, `ambiguous`, or `display_reconciliation_only`. |

Blocked or ambiguous rows must include an explicit `reason`.

## Monthly Heating Summary

`createMc001Level1CoreOrchestrator(inputPack)` adds `monthlyHeatingSummary` only when the optional monthly heating input is present.

Required summary values for Fixture 017:

| Summary field | Expected value |
| --- | ---: |
| `validatedMonthCount` | `9` |
| `blockedMonthCount` | `2` |
| `ambiguousMonthCount` | `1` |
| `annualDisplayedHeatingNeed` | `76252.3 kWh/an` |
| `isCompleteAnnualMethodology` | `false` |
| `methodologyStatus` | `PARTIAL_WITH_BLOCKED_AND_AMBIGUOUS_MONTHS` |

Validated months:

```text
Ian, Feb, Mar, Mai, Iun, Iul, Aug, Noi, Dec
```

Blocked months:

```text
Apr, Sep
```

Ambiguous month:

```text
Oct
```

## Blocker Handling

- April remains blocked because the boundary-period extraction gap cannot be forced through the Figure 2.18 `gammaH > 2` branch.
- September remains blocked for the same boundary-period reason.
- October remains ambiguous because Anexa B displays positive `QH;nd` while `gammaH > 2`.
- Annual displayed `QH;nd = 76252.3 kWh/an` is included as an already validated Fixture 006 reconciliation only.
- No hidden fallback values are used.

## Verification Notes

- Fixture 016 behavior remains backward-compatible when `monthlyHeating` is absent.
- Fixture 017 validates Level 1 monthly heating summary composition only.
- It is not a Level 2 full MC001 auditor.
- It is not a certificate/CPE workflow.
- It does not change `monthlyBalance.mjs`.
- It does not add UI, Worker, DB/schema, API, deploy, report generation, or product integration.
