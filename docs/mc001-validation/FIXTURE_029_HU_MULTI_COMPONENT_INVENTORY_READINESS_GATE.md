# Fixture 029 - Hu Multi-Component Inventory Readiness Gate

## Purpose

Fixture 029 validates the Phase H2H executable readiness gate for a narrow
multi-component `Hu` inventory contract. It proves that multiple `Hu`
component candidates can form a complete source-backed inventory for one
conditioned zone, one adjacent non-climatized `ztu`, one month, and multiple
envelope elements.

This fixture is inventory/readiness-only. It is not full MC001 numerical
validation, does not calculate `Hu`, does not aggregate `Hu`, and does not
calculate `Htr`.

## Positive Contract

The positive fixture includes:

- one conditioned zone
- one adjacent non-climatized `ztu`
- one month
- two envelope elements between the conditioned zone and `ztu`
- positive finite area for each element
- source-backed U-value or corrected U-value path for each element
- accepted H1 BZTU direct input for the same month and `ztu`
- supported boundary relation for each element
- expected component coverage metadata
- no duplicate component ids
- no duplicate element/month/zone tuples
- no distribution ambiguity
- source/provenance for every component and the inventory coverage

Expected result:

- `isHuInventoryReady = true`
- every component is individually component-ready
- `isCompleteHuReady = false`
- `isCompleteHtrReady = false`
- no `Hu` result
- no `Htr` result

## Negative Coverage

Fixture 029 keeps readiness fail-closed for:

- missing expected component
- unexpected actual component not listed in expected coverage
- duplicate component id
- wrong BZTU month
- partial inventory readiness escalation

The direct H2H gate test also covers the broader negative matrix from the H2G
design, including empty inventories, duplicate element/month/zone tuples,
inconsistent month or `ztu`, wrong BZTU `ztu`, missing BZTU paths, invalid
U-value paths, missing provenance, ambiguous boundary relations, missing
distribution metadata, unsupported `ztu`-to-`ztu` paths, raw `Hu` input,
fake-zero `Hg` / `Ha`, and readiness escalation attempts.

## Non-Goals

Fixture 029 does not implement:

- numerical `Hu` calculation
- `Hu` aggregation
- complete `Hu` readiness
- complete `Htr` readiness
- `A * U * bztu`
- full BZTU derivation
- `Hztu;e`
- `Hztu;tot`
- `cztu;ve`
- distribution formulas
- `Hg`
- native `Ha`
- climate, solar, or internal gains
- monthly heating or `QHnd`
- final energy, primary energy, or CO2
- Level 2 auditor behavior
- report/CPE/certificate workflow
- UI, API, Worker, DB/schema, deploy, or product integration

## Source Basis

Fixture 029 follows the H2C_A source locator pass and H2G multi-component
inventory readiness design. The source locators remain contract support for
this gate; final runtime formula registry identifiers are still out of scope.
