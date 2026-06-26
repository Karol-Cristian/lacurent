# Phase H2A - Unconditioned Zone Hu Source and Inventory Contract

## 1. Purpose

Phase H2A defines the source and inventory contract required before a future unconditioned-zone transmission component can be considered methodologically ready.

This milestone is docs-only. It does not implement `Hu`, does not derive `bztu`, does not modify runtime code, and does not change existing readiness behavior.

The central question is:

> How do we prove that a future `Hu` component is complete, source-backed, and safe to expose to transmission readiness without treating a valid `bztu` as sufficient for `Hu` or `Htr` readiness?

The answer is an explicit inventory contract. A valid `bztu` record is only one input to a future `Hu` path. It is not proof that all relevant non-climatized-zone elements, boundaries, U-value paths, distribution rules, and sources are complete.

## 2. Source Basis

This document builds on:

- `PHASE_H0_HTR_BOUNDARY_COMPONENTS_METHODOLOGY_EXTRACTION.md`
- `PHASE_H0A_HTR_BOUNDARY_COMPONENTS_SOURCE_VERIFICATION.md`
- `PHASE_H1_PRE_BZTU_DIRECT_INPUT_CONTRACT_DESIGN.md`
- `FIXTURE_027_BZTU_DIRECT_INPUT_READINESS_GATE.md`
- `PHASE_H2_UNCONDITIONED_ZONE_BZTU_TO_HU_READINESS_GATE_DESIGN.md`

Existing extraction notes identify candidate MC001 relationships for direct exterior and non-climatized-zone element transmission. Those candidates are not final runtime registry entries.

H2A does not invent final formula ids or finalize equation numbering. Candidate source ids, relation labels, and equation references remain non-final until source review confirms exact MC001 locators and notation.

## 3. Hu Component Inventory Contract

A future `Hu` component cannot be considered ready unless the evaluated scope is explicit and complete.

Minimum inventory fields for each future non-climatized-zone transmission element:

| Field | Purpose | Readiness rule |
| --- | --- | --- |
| `conditionedZoneId` | Identifies the evaluated conditioned / thermal zone. | Required. Missing value blocks `Hu`. |
| `unconditionedZoneId` / `ztuZoneId` | Identifies the adjacent unconditioned / non-climatized zone. | Required. Missing or ambiguous value blocks `Hu`. |
| `month` / `monthlyScope` | Identifies the month or source-backed applicability period. | Required for monthly `bztu` use. Non-monthly applicability must be explicitly sourced. |
| `elementId` | Identifies the envelope element contributing through the non-climatized zone. | Required for traceability and inventory completeness. |
| `elementType` | Classifies wall, roof, floor, window, door, slab, or other element type. | Required. Unsupported element types block use. |
| `area` | Provides element area. | Required, positive, unit-valid, and source-backed. |
| `areaUnit` | Provides area unit. | Required and valid. |
| `boundaryRelation` | Distinguishes external non-climatized-zone boundary from internal non-climatized-zone boundary. | Required. Ambiguous relation blocks use. |
| `uValuePath` | Provides calculated U-value, corrected U-value, certified/direct U-value, or future supported path. | Required and source-backed. Unsupported or missing path blocks use. |
| `uValueSource` / `uValueProvenance` | Preserves U-value source evidence. | Required for direct/certified/corrected U-values and required through existing engine contracts for calculated U-values. |
| `bztuPath` | Identifies accepted direct `bztu`, future calculated `bztu`, validation import, or expert override. | Required for non-climatized-zone transmission. Missing or invalid path blocks use. |
| `bztuRecordId` | Links the element to the accepted `bztu` record or future calculated result. | Required for traceability. Unknown ids block use. |
| `sourceRefs` | Carries source references for direct or override values. | Required for all direct, imported, or overridden values. |
| `sourceLocator` | Locates the source precisely enough for audit. | Required for all direct, imported, or overridden values. |
| `reviewStatus` | Shows review state for the accepted input or source. | Required. Unknown or missing status blocks use. |
| `applicabilityStatus` | Declares whether the value applies to the element, zone, month, and method. | Required. Ambiguous or unsupported applicability blocks use. |
| `blockerStatus` | Records whether the element is ready, blocked, out of scope, or pending source verification. | Required for consolidated readiness. |

Inventory completeness must be evaluated at two levels:

- element completeness: every checked element has all required fields and sources
- component completeness: the full set of relevant non-climatized-zone elements for the evaluated scope is known and no element is blocked

Element completeness alone is not enough to claim complete `Hu`.

## 4. BZTU Path Contract

A future `Hu` path may reference `bztu` only through an explicit methodological path.

Allowed future `bztuPath` values:

- `accepted_direct_input`
- `calculated_bztu`
- `validation_import`
- `expert_override`

Rules:

- `accepted_direct_input` must reference a Phase H1 accepted direct-input decision.
- `calculated_bztu` remains future-only and blocked until full `Hztu;e` / `Hztu;tot` derivation is implemented and source-reviewed.
- `validation_import` must carry source, traceability, unit, context, and precise source locator.
- `expert_override` must carry source, reason, unit, responsible person / approval, confidence, and timestamp or trace id.
- normal raw auditor `bztu` input remains rejected.
- product fallback or product estimate `bztu` remains rejected.

An accepted direct `bztu` value proves only that the factor itself passed the H1 provenance gate. It does not prove that the matching element inventory, U-value path, or component coverage is complete.

## 5. Source Mapping Contract

Before runtime implementation, future work must identify and preserve source references for each methodological link.

Required source mappings:

| Source mapping | Required evidence | Status in H2A |
| --- | --- | --- |
| MC001 relation for non-climatized-zone transmission contribution | Exact source location for external and internal non-climatized-zone element cases. | Candidate only, non-final. |
| MC001 relation for `bztu` use in the contribution | Exact source location linking `bztu` to the relevant transmission case. | Candidate only, non-final. |
| U-value / corrected U-value path | Existing validated helper source or direct/certified value source. | Must reuse existing Phase D source-backed contract. |
| Element area source | Auditor evidence, drawing, measurement, schedule, or validated import source. | Required before readiness. |
| Boundary relation source | Evidence that the element is external or internal relative to the non-climatized zone. | Required before readiness. |
| Monthly applicability source | Evidence that the `bztu` value applies to the checked month or allowed period. | Required before monthly use. |
| Multiple adjacent conditioned-zone distribution handling | Exact source and rule for distribution if more than one conditioned zone is coupled to the same non-climatized zone. | Blocked until verified. |

Candidate formulas from prior documents remain non-final implementation candidates:

```text
H_el = U * A
H_el = bztu * U * A
H_el = (1 - bztu) * U * A
```

Exact MC001 heating/cooling notation, relation names, and equation numbering must be verified before runtime registry or formula implementation.

## 6. Completeness Rules

Future `Hu` readiness should use explicit statuses.

| Status | Meaning |
| --- | --- |
| `ready` | All element inventory, source mapping, `bztu` path, U-value path, units, applicability, and component completeness rules pass for the evaluated scope. |
| `blocked_missing_element_inventory` | One or more required element records are missing or the component set is not known to be complete. |
| `blocked_missing_u_value_path` | A required U-value or corrected U-value path is missing, unsupported, or not source-backed. |
| `blocked_missing_bztu_path` | No accepted, calculated, imported, or overridden `bztu` path exists for the required element/month/zone. |
| `blocked_missing_source` | A direct, imported, or overridden value lacks source/provenance/source locator. |
| `blocked_ambiguous_zone_mapping` | Conditioned-zone, unconditioned-zone, or boundary relation mapping is unclear. |
| `blocked_ambiguous_distribution` | Multiple adjacent conditioned zones exist and source-backed distribution handling is missing. |
| `blocked_unsupported_methodology` | The requested method is outside current source-verified support. |
| `out_of_scope` | The element or boundary is not part of the future H2A/Hu contract. |

Fail-closed rules:

- missing elements do not become zero
- blocked elements do not become zero
- missing `bztu` does not become zero or one
- a non-climatized-zone element is not reclassified as direct exterior
- incomplete `Hu` does not complete `Htr`
- complete `Hu` does not complete `Htr` if `Hd`, `Hg`, `Ha`, or thermal bridge accounting is missing or blocked

## 7. Raw vs Derived Separation

Raw / auditable inputs:

- element geometry
- element area
- element type
- conditioned-zone id
- unconditioned-zone / `ztu` id
- boundary relation
- source evidence
- direct U-value evidence, where allowed by existing contract

Engine-calculated or controlled values:

- calculated U-value from supported layer path
- corrected U-value through supported source-backed path
- future calculated `bztu`, after full derivation is implemented
- future element-level non-climatized-zone transmission contribution
- future `Hu` candidate subtotal

Controlled direct values:

- direct `bztu`, only through the H1 gate
- direct U-value, only through existing source-backed contract
- validation import, only with source/trace/unit/context
- expert override, only with source/reason/unit/responsible person/confidence/timestamp or trace id

Forbidden normal raw auditor inputs:

- `Hu`
- `Htr`
- `QHnd`
- final energy totals
- primary energy totals
- CO2 totals
- product fallback values
- product estimate values

`Hu` may only be:

- an engine output from a future validated path
- a validation fixture import with source/traceability
- an expert override with full provenance

Complete `Hu` readiness does not imply complete `Htr` readiness.

## 8. Fixture Strategy

Future fixtures should be contract/readiness fixtures only. They must not be described as full MC001 numerical validation.

Future positive fixture:

- one synthetic readiness fixture for a complete `Hu` component contract
- includes conditioned zone id, `ztu` zone id, month, element id, element type, area, source-backed U path, accepted `bztu` path, boundary relation, source/provenance, applicability, and no blockers
- verifies that readiness remains limited to the `Hu` component contract
- verifies that complete `Htr` remains blocked unless all required transmission components are separately ready

Future negative fixtures:

- missing element inventory
- missing area
- missing U-value path
- missing `bztu` path
- missing source/provenance
- ambiguous zone mapping
- ambiguous distribution
- unsupported boundary relation
- product fallback `bztu`
- raw `Hu` as auditor input
- raw `Htr` as auditor input

Fixture labels should include `contract`, `readiness`, and `not_full_mc001_numerical_validation`.

## 9. Blockers That Must Remain Explicit

The following remain blocked after H2A:

- full `bztu` derivation
- `Hztu;e`
- `Hztu;tot`
- multiple-zone distribution formula
- full `Hu` calculation
- complete `Htr`
- ground-contact general method / `Hg`
- unresolved `Ha`
- climate datasets
- solar gains
- internal gains
- monthly heating
- `QHnd`
- final energy
- primary energy
- CO2
- Level 2 Full Auditor readiness
- report generation
- certificate/CPE workflow

## 10. Recommended Next Step

The safest next milestone is:

```text
PHASE_H2B_UNCONDITIONED_ZONE_HU_CONTRACT_FIXTURE_DESIGN
```

That milestone should define the exact fixture shape and expected readiness assertions for a complete synthetic `Hu` component contract, still without implementing runtime `Hu` calculation unless source mapping and inventory completeness rules are fully reviewed.

An alternate next milestone is:

```text
PHASE_H2B_HU_SOURCE_MAPPING_VERIFICATION
```

Use this alternate path if equation notation, monthly applicability, or distribution handling remains too uncertain for fixture design.

## 11. Non-goals

Phase H2A does not implement:

- runtime code
- tests
- formula helpers
- orchestrator changes
- final normative registry ids
- full `bztu` derivation
- `Hztu;e`
- `Hztu;tot`
- multiple-zone distribution formula
- full `Hu`
- complete `Htr`
- `Hg`
- unresolved `Ha`
- climate datasets
- solar gains
- internal gains
- monthly heating
- `QHnd`
- final energy
- primary energy
- CO2
- Level 2 Full Auditor readiness
- report generation
- certificate/CPE workflow
- UI
- API
- Workers
- DB/schema/migrations
- deploy/config
- product flow
- marketplace
- AI features

## 12. Open Questions

Open questions before runtime implementation:

- what exact MC001 source locator should be used for each non-climatized-zone transmission case
- whether heating and cooling notation require separate runtime identifiers
- whether `Hu` should be represented as one component or split by external/internal non-climatized-zone relation
- how the engine proves that all relevant non-climatized-zone elements are present
- how a direct `bztu` value should be matched across month, zone, element, and boundary relation
- whether annual applicability can ever satisfy a monthly `bztu` path
- what source-backed distribution rule applies when a non-climatized zone touches multiple conditioned zones
- whether distribution can be accepted as direct methodological input
- how thermal bridges are assigned when an element is adjacent to a non-climatized zone
- how corrected U-values avoid double-counting with bridge and zone correction effects
- when a direct source-backed `Hu` validation import is acceptable instead of element-level calculation

