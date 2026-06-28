# Fixture 028 - Hu Component Contract Readiness Gate

## Purpose

Fixture 028 validates the Phase H2E executable readiness gate for one narrow
`Hu` component contract. It proves that the component candidate has complete
source-backed inventory for one conditioned zone, one adjacent non-climatized
`ztu`, one envelope element, one month, a valid area, a valid U-value path, an
accepted BZTU path, applicability metadata, and provenance.

This fixture is contract/readiness-only. It is not full MC001 numerical
validation and does not calculate `Hu`.

## Positive Contract

The positive fixture includes:

- one conditioned zone
- one adjacent non-climatized `ztu`
- one element between the conditioned zone and `ztu`
- one month
- positive finite area
- source-backed U-value or corrected U-value path
- accepted H1 BZTU direct input for the same month and `ztu`
- supported boundary relation
- applicability metadata
- source/provenance for direct paths

Expected result:

- `isHuComponentReady = true`
- `isCompleteHuReady = false`
- `isCompleteHtrReady = false`

## Negative Coverage

Fixture 028 keeps readiness fail-closed for:

- wrong BZTU month
- missing U-value source/provenance
- raw `Hu` submitted as auditor input
- missing `Hg` / `Ha` treated as fake zeroes

The direct H2E gate test also covers the broader negative matrix from the H2D
design, including missing or invalid area, missing element inventory, missing
BZTU path, invalid BZTU path, wrong `ztu`, ambiguous zone mapping, missing
distribution metadata, unsupported `ztu`-to-`ztu` paths, missing provenance,
and readiness escalation attempts.

## Non-Goals

Fixture 028 does not implement:

- numerical `Hu` calculation
- complete `Hu` readiness
- complete `Htr` readiness
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

Fixture 028 follows the H2C_A source locator pass and H2D fixture design. The
source locators remain contract support for this gate; final runtime formula
registry identifiers are still out of scope.
