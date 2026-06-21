# FIXTURE 018 - Level 1 Fail-Closed Hardening

## Status

- Fixture id: `FIXTURE_018_LEVEL_1_FAIL_CLOSED_HARDENING`
- Fixture type: Level 1 fail-closed validation hardening.
- Executable: yes.
- Validated helper: `mc001Level1CoreOrchestrator.mjs`.
- Source basis: Fixture 016 Level 1 core input pack and Fixture 017 monthly heating extension.
- Scope exclusions: no Level 2 full MC001 auditor, no production orchestrator, no certificate workflow, no CPE generation, no report generation, no UI/API/DB/Worker/deploy/product integration, no invented defaults, no new MC001 formulas, no full DHW final-energy implementation, no lighting implementation, no cooling-system implementation, and no reference-building implementation.

## Purpose

Fixture 018 hardens the Level 1 core orchestrator boundary.

The goal is not to add new physics. The goal is to reject incomplete, ambiguous, inconsistent, or invented Level 1 input packs before any helper composition runs.

## Required Top-Level Sections

The input pack must include:

| Section | Required | Fail-closed behavior |
| --- | --- | --- |
| `packMetadata` | yes | Missing section throws. |
| `buildingContext` | yes | Missing section throws; building category is never inferred. |
| `transmission` | yes | Missing section or required field throws. |
| `ventilation` | yes | Missing section or required field throws. |
| `finalPrimaryCo2` | yes | Missing section, empty service rows, missing factors, or invalid factors throw. |
| `explicitBlockers` | yes | Missing section or missing required blocker throws. |
| `monthlyHeating` | optional | If present, it must contain exactly 12 calendar months and preserve Apr/Sep/Oct status. |

## Units

The Level 1 boundary validates explicit units where the input contract exposes unit fields:

| Input area | Expected unit |
| --- | --- |
| Transmission | `W/K` |
| Ventilation | `W/K` |
| Conditioned floor area | `m2` |
| Monthly heating | `kWh` |

Final, primary, and CO2 quantities retain explicit unit-bearing field names and output units:

| Quantity | Unit-bearing contract |
| --- | --- |
| Final energy | `finalEnergyKWh`, `expectedFinalEnergyTotalKWh`, output `kWh` |
| Primary energy | `expectedPrimaryTotalKWh`, output `kWh` |
| CO2 | `expectedCO2TotalKg`, output `kgCO2` |

String numbers are not accepted.

## Numeric Validation

The validator rejects:

- `null` or `undefined` where numeric values are required.
- `NaN`.
- `Infinity`.
- string numeric values.
- negative values for physically non-negative inputs such as heat-transfer coefficients, final energy, primary factors, CO2 factors, conditioned area, monthly heating rows, and tolerances.

Signed monthly ventilation transfer outputs remain allowed because warm-month transfer rows can be negative under the existing helper convention.

## Monthly Heating Hardening

If `monthlyHeating` is present:

- `monthlyRows` must contain exactly 12 calendar months.
- Missing months fail closed.
- Duplicate months fail closed.
- Unknown month labels fail closed.
- Allowed row statuses are only `validated`, `blocked`, `ambiguous`, and `display_reconciliation_only`.
- April must remain `blocked`.
- September must remain `blocked`.
- October must remain `ambiguous`.
- Blocked or ambiguous rows must retain an explicit reason.
- Annual methodology must not be reported complete.

The current Level 1 monthly heating status remains:

```text
PARTIAL_WITH_BLOCKED_AND_AMBIGUOUS_MONTHS
```

## Required Blockers

The input pack must preserve at least these blocker ids:

```text
april_boundary_heating_period_gap
september_boundary_heating_period_gap
october_mc001_worked_example_ambiguity
full_dhw_final_energy_chain_blocked
annual_dhw_distribution_loss_basis_blocked
general_rer_methodology_blocked
certificate_cpe_workflow_blocked
lighting_blocked
cooling_systems_blocked
reference_building_blocked
```

Each blocker must include `blockerId`, `area`, `status`, `source`, and `reason`.

## Readiness Claims

The Level 1 output remains deterministic and serializable, and it explicitly keeps these readiness claims false:

```text
isFullMc001AuditReady = false
isLevel2Ready = false
isCertificateCpeWorkflowReady = false
isProductionOrchestrationReady = false
```

Inputs that attempt to claim those readiness states fail closed.

## Positive Regression Coverage

Fixture 018 preserves:

- Existing Fixture 016 Level 1 core composition.
- Existing Fixture 017 monthly heating composition.
- Transmission `Htr`.
- Ventilation `Hve`.
- Final energy.
- Primary energy.
- CO2 emissions.
- Monthly heating summary counts and methodology status.

## Negative Coverage

Fixture 018 validates fail-closed behavior for:

- missing `buildingContext`
- missing `transmission.Hd`
- invalid transmission unit
- invalid ventilation unit
- missing finalPrimaryCo2 service rows
- invalid CO2 factor
- monthlyHeating with missing month
- monthlyHeating with duplicate month
- monthlyHeating with invalid status
- April incorrectly marked validated
- September incorrectly marked validated
- October incorrectly marked validated
- missing required explicit blocker
- string numeric value where a number is required
- `NaN` numeric value
- `Infinity` numeric value

## Verification Notes

- Fixture 018 does not modify MC001 formulas.
- Fixture 018 does not modify `monthlyBalance.mjs`.
- Figure 2.18 `gammaH > 2` behavior remains unchanged.
- Fixture 018 does not add UI, Worker, DB/schema, API, deploy, report generation, certificate/CPE workflow, product integration, or Level 2 auditor behavior.
- Level 2 full MC001 auditor behavior remains blocked.
