# Phase H2 - Unconditioned Zone BZTU to Hu Readiness Gate Design

## 1. Purpose

Phase H2 defines the design contract for connecting an accepted direct `bztu` value from Phase H1 to a future non-climatized-zone transmission readiness path.

This phase is design-only. It does not implement `Hu`, does not calculate complete `Htr`, and does not change runtime behavior.

The core question for H2 is narrow:

> Once `bztu` is accepted as a source-backed methodological direct input, how may it participate in a future non-climatized-zone transmission contribution without pretending that `Hu` or `Htr` are complete?

Phase H2 exists to prevent the next implementation step from accidentally treating `bztu` as a shortcut, fallback, product estimate, or complete boundary-component result.

## 2. Current Baseline After Phase H1

The current MC001 foundation behaves conservatively:

- Phase C validates raw-vs-derived input separation and source/provenance contracts.
- Phase D prepares only supported source-backed exterior envelope transmission. Ground, unconditioned, and adjacent boundary methods remain blocked.
- Phase E classifies transmission readiness and keeps `Hg`, `Hu`, and `Ha` blocked unless a controlled source-backed validation import, expert override, or validated component result exists.
- Phase F prepares source-backed ventilation readiness and heat-loss readiness without monthly heating or `QHnd`.
- Phase G composes the Phase C/D/E/F outputs and propagates blocked items into one auditor core readiness result.
- Phase G1 hardens scenario behavior so partial or blocked readiness cannot become complete readiness.
- Phase H1 accepts `bztu` only through a fail-closed direct input gate. It does not derive `bztu`, does not calculate `Hu`, and does not make `Htr` ready.

Therefore:

- `bztu` accepted is not the same as `Hu` ready.
- `Hu` ready is not the same as `Htr` ready.
- `Htr` remains incomplete if any required component is missing, blocked, unsupported, ambiguous, or not source-backed.

## 3. Strategic Boundary

Phase H2 preserves the project strategy:

- physics engine first
- methodology correctness first
- fail-closed behavior
- no hidden fallbacks
- no invented normative values
- no product or UI shortcuts
- no routine acceptance of derived totals as raw auditor input

The future bridge from `bztu` to `Hu` must keep these invariants:

- missing `bztu` is not zero
- blocked `bztu` is not zero
- missing non-climatized-zone area is not zero
- missing U-value path is not zero
- unsupported non-climatized-zone methodology is not exterior transmission
- accepted `bztu` alone does not complete `Hu`
- partial `Hu` does not complete `Htr`
- partial `Htr` does not complete heat-loss readiness

## 4. Methodology Candidates Pending Final Source Review

Phase H0 and Phase H0A identify source-backed candidates that can guide future implementation, but they remain implementation candidates until final source review is performed for runtime use.

Candidate direct exterior element:

```text
H_el = U * A
```

This path is already represented by the current source-backed exterior envelope readiness flow.

Candidate external non-climatized-zone element:

```text
H_el = bztu * U * A
```

Candidate internal non-climatized-zone element:

```text
H_el = (1 - bztu) * U * A
```

These candidates come from the Phase H0A Figure 2.9 extraction notes. Exact MC001 heating/cooling notation, equation references, and runtime naming must be verified before implementation.

Full `bztu` derivation remains out of scope. It requires the non-climatized-zone heat transfer model involving terms such as `Hztu;e`, `Hztu;tot`, conditioned-zone couplings, and exterior envelope components.

The `bve` relation to `bztu` remains ventilation-specific. `bve` is not globally equivalent to `bztu`, and the relation must not be used to mix ventilation and transmission logic.

## 5. Proposed Future Raw Auditor Input Contract

A future `bztu` to `Hu` readiness gate should require explicit, source-backed data for each non-climatized-zone boundary element.

Minimum likely fields:

- `evaluatedThermalZoneId`
- `envelopeElementId`
- `boundaryType`
- `adjacentNonClimatizedZoneId`
- `area`
- `areaUnit`
- `uValue` or a supported U-value preparation path
- `uValueUnit`
- `acceptedBztuRecordId` or equivalent reference to a Phase H1 accepted direct `bztu` decision
- `month`
- `calculationPeriod` or applicability statement
- `sourceRefs`
- `sourceLocator`
- `reviewStatus`
- `methodologyStatus`
- `inputClassification`

Allowed future boundary types for this design:

- `external_non_climatized_zone`
- `internal_non_climatized_zone`

The future contract should also carry enough relation metadata to avoid ambiguous distribution:

- adjacent conditioned-zone relation
- whether the non-climatized zone is adjacent to more than one conditioned zone
- distribution factor, if multiple conditioned zones are involved
- distribution factor source/provenance, if used
- confirmation that the non-climatized zone is not being chained through another non-climatized zone unless a future method explicitly supports that case

Monthly handling should not be mandatory until source review confirms the exact runtime contract. If a future implementation accepts annual applicability, it must be explicitly sourced and must not be silently applied to monthly calculations.

## 6. Value Ownership

Auditor-provided raw technical data may include:

- element identity
- zone identity
- boundary classification
- dimensions and area
- layer data or certified U-value path
- source-backed technical evidence
- applicable month or period metadata

Direct methodological input may include:

- `bztu`, but only after Phase H1 accepts it as explicit methodological direct input, validation fixture import, or expert override with source
- a distribution factor, only if a future source-backed contract permits it

Engine-calculated values may include, in a future implementation:

- non-climatized-zone element transmission candidate
- a `Hu` candidate subtotal for the validated element set
- diagnostics
- blocked items
- source/provenance trace

Forbidden normal auditor inputs remain:

- `Hu`
- `Htr`
- `QHnd`
- final energy totals
- primary energy totals
- CO2 totals
- product fallback or product estimate values

## 7. Proposed Future Readiness States

The future gate should distinguish element readiness from component readiness.

Candidate element states:

- `ready_hu_candidate_element`
- `blocked_missing_bztu`
- `blocked_invalid_bztu`
- `blocked_missing_area`
- `blocked_invalid_area`
- `blocked_missing_u_value_path`
- `blocked_invalid_u_value_path`
- `blocked_ambiguous_zone_relation`
- `blocked_unsupported_boundary_type`
- `blocked_double_count_risk`
- `blocked_pending_formula_verification`

Candidate component states:

- `hu_not_applicable`
- `hu_partial`
- `hu_blocked`
- `hu_ready_candidate`
- `hu_ready_for_htr_component`

`hu_ready_candidate` means that the checked non-climatized-zone elements can be evaluated under the future direct `bztu` contract.

`hu_ready_for_htr_component` should require more:

- all relevant non-climatized-zone elements for the evaluated scope are present
- all accepted `bztu` records are source-backed and applicable
- all U-value and area paths are source-backed
- no element is blocked
- no required distribution metadata is missing
- no double-counting risk remains
- the formula mapping has been source-reviewed for runtime use
- units are valid and normalized to the expected heat-transfer coefficient unit

Until those conditions are satisfied, `Hu` must remain partial or blocked for `Htr` composition.

## 8. Proposed Future Gate Shape

A future gate might be shaped as `mc001BztuToHuReadinessGate`, but Phase H2 does not create that module.

Expected future inputs:

- Phase H1 `bztu` direct input decisions
- non-climatized-zone envelope element records
- source-backed U-value preparation results or direct U-value records
- source/provenance metadata
- relation/distribution metadata
- component completeness metadata

Expected future output:

- `huElementResults`
- `huCandidateSubtotal`
- `huComponentReadiness`
- `blockedItems`
- `diagnostics`
- `sourceTrace`
- `nextBlockers`
- conservative readiness flags

Expected future readiness flags:

- `isBztuDirectInputReady`
- `isHuCandidateReady`
- `isCompleteHuReady`
- `isHtrReady`

`isHtrReady` must remain false unless the Phase E transmission readiness gate can safely compose all required components with no blocked or missing items.

## 9. Htr Integration Rules

Future `Hu` output must not be handed to `Htr` composition as complete unless the future gate proves component completeness.

Safe integration rules:

- Direct exterior `Hd` remains unchanged.
- `bztu` readiness does not modify exterior `Hd`.
- Non-climatized-zone elements must not be treated as direct exterior elements.
- A blocked non-climatized-zone element must remain a blocker.
- A missing non-climatized-zone element must not become zero.
- A partial `Hu` candidate subtotal must not be promoted to complete `Hu`.
- `Htr` remains blocked if `Hg`, `Hu`, or `Ha` is missing or blocked.
- `Htr` remains blocked if thermal bridge accounting has unresolved double-counting risk.
- Heat-loss readiness remains partial or blocked if `Htr` remains partial or blocked.

Even if a future direct `bztu` element contribution can be calculated, complete `Htr` still requires the rest of the transmission boundary model.

## 10. Fail-Closed Validation Rules

A future implementation should reject or block:

- non-climatized-zone boundary without accepted `bztu`
- accepted `bztu` with mismatched month or zone id
- `bztu` provided as normal raw auditor input
- product fallback or product estimate `bztu`
- annual scalar `bztu` applied to monthly use without explicit source-backed exception
- missing area
- non-positive area
- missing or invalid area unit
- missing U-value or unsupported U-value path
- corrected U plus explicit thermal bridge contribution when double-counting risk is unresolved
- missing adjacent non-climatized-zone id
- unsupported boundary type
- ambiguous multi-zone relation without source-backed distribution metadata
- non-climatized-zone-to-non-climatized-zone chains unless a future method explicitly supports them
- direct `Hu`, `Htr`, `QHnd`, final energy, primary energy, or CO2 values submitted as normal auditor input

The future implementation must not:

- infer `bztu`
- derive `bztu` from incomplete Hztu data
- default `bztu` to zero or one
- substitute exterior transmission when `bztu` is missing
- convert blocked `Hu` to zero
- mark `Htr` complete while `Hu` is partial

## 11. Proposed Future Test Matrix

Future implementation tests should include positive cases:

- valid external non-climatized-zone element with accepted direct `bztu`
- valid internal non-climatized-zone element with accepted direct `bztu`, after source notation is verified
- valid element contribution while complete `Hu` remains blocked without component completeness proof
- valid complete `Hu` candidate only when all relevant elements and metadata are present
- `Htr` remains blocked when `Hg` or `Ha` is still missing
- diagnostics and provenance from Phase H1 are preserved

Future negative cases should include:

- missing `bztu`
- invalid `bztu`
- `bztu` month mismatch
- `bztu` zone mismatch
- raw `bztu` input
- product fallback `bztu`
- missing area
- invalid area
- missing U-value path
- unsupported boundary type
- ambiguous multi-zone relation
- missing distribution factor when required
- non-climatized-zone-to-non-climatized-zone chain
- corrected U plus explicit bridge double-counting risk
- derived `Hu` as normal input
- derived `Htr` as normal input
- complete readiness claim with blocked element
- complete readiness claim with missing component

Fixture coverage, if later created, should remain readiness-focused and must not claim full MC001 numerical validation.

## 12. Recommended Implementation Sequence After H2

The safest next implementation sequence is:

1. Verify the exact MC001 source mapping for the non-climatized-zone element formulas, including heating/cooling notation and runtime naming.
2. Define a non-climatized-zone boundary inventory contract so the engine can tell whether a `Hu` component is complete or only partial.
3. Implement a narrow `bztu` to `Hu` candidate element gate for direct source-backed `bztu`.
4. Keep complete `Hu` blocked until component completeness and distribution rules are explicit.
5. Integrate with Phase E only after `Hu` component readiness can be proven fail-closed.

The next runtime milestone should not start with full `Hztu;e` / `Hztu;tot` derivation. That remains a later methodology phase.

## 13. Non-goals

Phase H2 does not implement:

- runtime code
- tests
- `Hu`
- complete `Htr`
- full `bztu` derivation
- `Hztu;e`
- `Hztu;tot`
- `Hg`
- `Ha`
- monthly heating
- `QHnd`
- final energy
- primary energy
- CO2
- climate datasets
- solar gains
- internal gains
- cooling
- lighting
- DHW
- renewables/RER
- reference building
- report generation
- certificate/CPE workflow
- UI
- API
- Workers
- DB/schema/migrations
- deploy/config
- product integration
- marketplace
- AI features
- Level 2 Full Auditor readiness

## 14. Open Questions

Open items before runtime work:

- exact MC001 equation and figure references for each non-climatized-zone element case
- exact heating/cooling notation and whether cooling-side handling differs
- exact runtime naming for external and internal non-climatized-zone boundaries
- whether H2 implementation should require monthly `bztu` only or allow source-backed annual applicability
- how component completeness should be proven for `Hu`
- how multiple adjacent conditioned zones should be distributed
- whether a distribution factor can be direct methodological input
- how to prevent double counting between corrected U-values, bridges, and non-climatized-zone element transmission
- how `Hu` should be represented in relation to MC001 excluding-ground transmission notation
- when, if ever, a direct source-backed `Hu` validation import should bypass element-level `bztu` calculation
- how Phase E should distinguish `hu_ready_candidate` from `hu_ready_for_htr_component`

