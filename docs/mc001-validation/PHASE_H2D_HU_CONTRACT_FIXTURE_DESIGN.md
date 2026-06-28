# Phase H2D - Hu Contract Fixture Design

## 1. Purpose

Phase H2D defines the design for a future `Fixture 028` that will validate a narrow unconditioned-zone transmission / `Hu` readiness contract.

This milestone is docs-only. It does not create Fixture 028, does not add tests, does not implement runtime `Hu`, and does not change formula helpers or orchestrators.

The fixture-design question is:

> How should a future readiness fixture prove that one narrow `Hu` component candidate has complete inventory, source/provenance, zone mapping, U-value path, `bztu` path, and blocker behavior without claiming complete `Hu` or complete `Htr` readiness?

Future Fixture 028 must be labelled as a contract/readiness fixture. It must not be described as full MC001 numerical validation, complete `Hu` validation, complete `Htr` validation, or Level 2 auditor readiness.

## 2. Source Basis

Fixture 028 should use Phase H2C_A as its source-locator basis:

- `PHASE_H2C_A_HU_SOURCE_LOCATOR_PASS.md`
- Official MC001 PDF, page 100, `Figura 2.12`, for direct exterior, external non-climatized-zone, and internal non-climatized-zone element cases.
- Official MC001 PDF, pages 94-96, sections `2.6.2.1` and `2.6.2.2`, for `bztu`, `Hztu;e`, `Hztu;tot`, and `cztu;ve` context.
- Official MC001 PDF, page 95, `Figura 2.8`, for multiple adjacent conditioned-zone distribution.
- Official MC001 PDF, pages 81-82, relation `(2.15)`, for `Htr = Hd + Hg + Hu + Ha`.
- Official MC001 PDF, page 102, relation `(2.32)`, for ventilation-only `bve = bztu` discipline.

Fixture 028 must not invent final runtime registry ids or finalize formula ids. It may cite page/figure/relation locators as source evidence for a readiness contract.

## 3. Fixture Purpose

Future Fixture 028 should prove only these points:

- a narrow `Hu` component candidate can be checked for complete input inventory;
- accepted `bztu` is necessary but not sufficient;
- element area, U-value path, boundary relation, zone mapping, month, and source/provenance are all required;
- blockers remain explicit and traceable;
- one component candidate can be ready while complete `Hu` remains false;
- complete `Htr` remains false.

Fixture 028 must not prove:

- full `bztu` derivation;
- native `Hztu;e` or `Hztu;tot` implementation;
- complete `Hu`;
- complete `Htr`;
- `Hg`;
- `Ha`;
- monthly heating / `QHnd`;
- final energy, primary energy, or CO2;
- CPE/report readiness;
- product integration readiness.

## 4. Positive Fixture Scenario

The positive future Fixture 028 scenario should be synthetic, minimal, and source-located.

Scenario name:

```text
fixture028_one_external_ztu_element_contract_ready
```

Minimum setup:

| Field | Fixture value shape | Readiness purpose |
| --- | --- | --- |
| `conditionedZoneId` | `ztc-living-01` or similar synthetic id | Identifies the evaluated conditioned zone. |
| `ztuZoneId` / `unconditionedZoneId` | `ztu-stairwell-01` or similar synthetic id | Identifies the adjacent non-climatized zone. |
| `month` | One explicit month, for example `January` / `1` | Matches monthly `bztu,k;m` scope. |
| `elementId` | One envelope element id | Provides traceable inventory. |
| `elementType` | Supported element type such as `wall` | Avoids unsupported element ambiguity. |
| `area` | Positive value with valid area unit | Proves element geometry is present and auditable. |
| `uValuePath` | Existing supported U-value path or sourced corrected/direct U-value path | Proves U-value readiness without inventing formula support. |
| `bztuPath` | H1 accepted direct `bztu` record or equivalent source-backed path | Proves `bztu` provenance and applicability. |
| `boundaryRelation` | `external_non_climatized_zone` or `internal_non_climatized_zone` | Selects the relevant Figure 2.12 element case. |
| `sourceTrace` | Source refs, source locator, review status, and record ids for every direct/import/override value | Preserves auditability. |
| `applicability` | Confirms element, month, `ztu`, and boundary applicability | Prevents accidental cross-zone or cross-month use. |

Expected positive readiness:

```text
huComponentReadiness.componentStatus = ready_hu_component_candidate
huComponentReadiness.isHuComponentReady = true
huComponentReadiness.isCompleteHuReady = false
huComponentReadiness.isCompleteHtrReady = false
```

Interpretation:

- `isHuComponentReady = true` means the one checked component candidate has a complete contract.
- `isCompleteHuReady = false` because the fixture does not prove full inventory for every non-climatized-zone transmission path.
- `isCompleteHtrReady = false` because complete `Htr` also requires complete and source-backed `Hd`, `Hg`, `Hu`, `Ha`, and thermal bridge accounting.

The fixture should also prove that the accepted `bztu` record is not enough by itself. The element inventory, U-value path, boundary relation, month, and source trace must all be present.

## 5. Negative Fixture Scenarios

Future Fixture 028 should include negative scenarios that exercise fail-closed behavior.

| Scenario | Expected blocker | Purpose |
| --- | --- | --- |
| Missing element inventory | `blocked_missing_element_inventory` | Missing elements do not become zero. |
| Missing area | `blocked_missing_area` | Area is required for element contribution readiness. |
| Invalid or non-positive area | `blocked_invalid_area` | Invalid geometry cannot produce readiness. |
| Missing U-value path | `blocked_missing_u_value_path` | U-value is required even when `bztu` is accepted. |
| Invalid U-value source | `blocked_invalid_u_value_source` | Direct/corrected/certified U-values require source/provenance. |
| Missing `bztu` path | `blocked_missing_bztu_path` | Non-climatized-zone path must not fall back to direct exterior. |
| Invalid `bztu` path | `blocked_invalid_bztu_path` | Raw, product, fallback, wrong classification, or failed H1 `bztu` is rejected. |
| Accepted `bztu` with wrong month | `blocked_bztu_scope_mismatch` | Monthly factor cannot silently apply to another month. |
| Accepted `bztu` with wrong `ztu` | `blocked_bztu_scope_mismatch` | Zone-scoped factor cannot silently apply to another non-climatized zone. |
| Ambiguous zone mapping | `blocked_ambiguous_zone_mapping` | Conditioned and unconditioned zone relation must be explicit. |
| Multiple conditioned zones without distribution data | `blocked_ambiguous_distribution` | Figure 2.8 distribution cannot be guessed or averaged. |
| `ztu` adjacent to another `ztu` | `blocked_unsupported_methodology` | Page 95 applicability statement keeps this unsupported. |
| Missing source/provenance | `blocked_missing_source` | Direct/import/override values must remain source-backed. |
| `Hu` submitted as raw auditor input | `rejected_derived_input` | `Hu` is not normal raw auditor input. |
| `Hu` treated as complete `Htr` component | `blocked_readiness_escalation` | Component readiness must not escalate. |
| Missing `Hg` / `Ha` treated as zero | `blocked_fake_zero_component` | Missing transmission components are not zero. |

Negative scenarios should assert deterministic diagnostics and source-trace preservation where applicable.

## 6. Expected Fixture Output Contract

Future Fixture 028 should define the expected output shape before implementation.

Minimum output fields:

| Field | Meaning |
| --- | --- |
| `huComponentReadiness` | Top-level readiness object for the checked `Hu` component candidate. |
| `componentStatus` | Status such as `ready_hu_component_candidate`, `blocked_missing_bztu_path`, or `blocked_ambiguous_distribution`. |
| `conditionedZoneId` | Evaluated conditioned / thermal zone id. |
| `unconditionedZoneId` / `ztuZoneId` | Adjacent non-climatized zone id. |
| `month` | Month or source-backed applicability period used by the check. |
| `elementId` | Checked envelope element id. |
| `area` | Area value and unit used by the contract. |
| `uValuePath` | Source-backed U-value or corrected U-value path used by the contract. |
| `bztuPath` | H1 accepted direct input, future calculated path, validation import, or expert override path. |
| `sourceTrace` | Source refs, source locators, review status, record ids, provenance, and import/override context. |
| `diagnostics` | Human-readable and machine-stable diagnostics. |
| `blockers` | Explicit blocker records. |
| `isHuComponentReady` | May be true only for the checked narrow component. |
| `isCompleteHuReady` | Must remain false unless full `Hu` inventory is proven. |
| `isCompleteHtrReady` | Must remain false in Fixture 028. |

Output flag rules:

- `isHuComponentReady` may be `true` only when the narrow component contract is complete.
- `isCompleteHuReady` must remain `false` in Fixture 028 unless a later phase explicitly proves complete non-climatized-zone inventory.
- `isCompleteHtrReady` must remain `false`.
- `isMonthlyHeatingReady`, `isQhndReady`, `isCpeReady`, and `isLevel2AuditorReady` must remain `false` if those flags exist in a future integrated output.

## 7. Readiness Boundaries

Fixture 028 must distinguish four readiness levels.

### Hu Component Readiness

This means one checked non-climatized-zone transmission component candidate has:

- explicit conditioned zone;
- explicit `ztu` zone;
- explicit month;
- explicit element;
- positive source-backed area;
- valid U-value path;
- valid `bztu` path;
- explicit boundary relation;
- source/provenance for all direct/import/override values;
- no blockers.

### Complete Hu Readiness

This requires full inventory and readiness for all relevant non-climatized-zone elements in the evaluated scope. Fixture 028 must not claim this unless a later milestone defines and proves full component inventory coverage.

### Complete Htr Readiness

This requires all required transmission components to be complete, source-backed, and unblocked. A ready `Hu` component candidate is not enough. Missing or blocked `Hg`, `Ha`, other `Hu` elements, or thermal bridge accounting must keep `Htr` incomplete.

### Formula Implementation Readiness

Fixture 028 may cite source locators and expected contract fields. It must not create final formula helpers, final registry ids, or runtime calculation code.

## 8. Source Locator Dependencies

Future Fixture 028 should cite these dependencies in its fixture docs and assertions:

| Dependency | H2C_A locator | Fixture use |
| --- | --- | --- |
| Direct/external/internal element cases | Page 100, `Figura 2.12` | Selects the boundary relation and element formula candidate. |
| `bztu` monthly meaning | Page 94, section `2.6.2.1`, relation `(2.21)` | Requires month and `ztu` applicability. |
| Full `bztu` derivation context | Pages 95-96, section `2.6.2.2`, relations `(2.22)` to `(2.24)` | Keeps full derivation blocked; direct H1 path may be used only as input readiness. |
| Multiple-zone distribution | Page 95, `Figura 2.8` | Blocks multiple conditioned zones without source-backed distribution metadata. |
| ztu-to-ztu exclusion | Page 95, section `2.6.2.2` | Blocks unsupported adjacent non-climatized-zone chains. |
| `Htr` component definition | Pages 81-82, relation `(2.15)` | Keeps `Hu` and `Htr` boundaries separate. |
| Ventilation-only `bve = bztu` | Page 102, relation `(2.32)` | Prevents ventilation relation from becoming a transmission shortcut. |

Fixture 028 should not finalize equation ids beyond these locators. Runtime registry ids remain blocked until a reviewed registry phase.

## 9. Future Implementation Gate

A later executable milestone may introduce:

```text
PHASE_H2E_HU_COMPONENT_CONTRACT_READINESS_GATE
```

Suggested purpose:

- implement a narrow readiness gate for one or more source-located `Hu` component candidates;
- consume H1 accepted `bztu` decisions;
- consume source-backed element inventory and U-value paths;
- emit `huComponentReadiness`, diagnostics, blockers, and source trace;
- preserve `isCompleteHuReady = false` for the initial H2E milestone;
- leave complete `Hu` readiness to a later milestone after full `Hu` inventory is explicitly proven;
- preserve `isCompleteHtrReady = false` unless all transmission components are complete and unblocked.

H2E should not:

- derive full `bztu`;
- implement `Hztu;e` or `Hztu;tot`;
- implement complete `Hu`;
- implement complete `Htr`;
- implement `Hg` or native `Ha`;
- implement monthly heating / `QHnd`;
- introduce UI, API, DB, Worker, deploy, product, report, CPE, marketplace, or AI scope.

## 10. Blockers Preserved

The following remain blocked after H2D:

- actual Fixture 028 implementation;
- runtime `Hu` calculation;
- complete `Hu`;
- complete `Htr`;
- full `bztu` derivation;
- native `Hztu;e`;
- native `Hztu;tot`;
- `cztu;ve` runtime defaulting without registry/source review;
- final runtime formula ids;
- native `Hg`;
- native `Ha` calculation;
- ztu-to-ztu chains;
- ambiguous distribution;
- climate / solar / internal gains implementation;
- monthly heating / `QHnd`;
- final energy;
- primary energy;
- CO2;
- Level 2 Full Auditor readiness;
- report / CPE readiness;
- UI / API / Worker / DB / deploy / product integration.

## 11. Non-Goals

H2D does not:

- modify runtime code;
- create tests;
- create Fixture 028;
- change formula helpers;
- change orchestrators;
- create a final normative registry;
- implement `Hu`, `Htr`, `Hg`, or `Ha`;
- implement full `bztu` derivation;
- implement `Hztu;e`, `Hztu;tot`, or `cztu;ve`;
- implement climate, solar gains, internal gains, monthly heating, `QHnd`, final energy, primary energy, or CO2;
- add UI, API, Worker, DB/schema, migrations, deploy config, product flow, marketplace, report generation, certificate/CPE workflow, or AI features;
- use a Salicea/demo-house default fixture.

## 12. Review Checklist For Future Fixture 028

Future Fixture 028 should not be accepted unless it proves:

- accepted `bztu` alone does not create `Hu` readiness;
- one checked component can become component-ready only with complete element inventory and source trace;
- missing source/provenance blocks;
- month and `ztu` mismatches block;
- multiple-zone distribution ambiguity blocks;
- ztu-to-ztu topology blocks;
- raw `Hu` input is rejected;
- missing `Hg` or `Ha` is not zero;
- `isCompleteHuReady` remains false;
- `isCompleteHtrReady` remains false;
- no UI/API/DB/product/report/CPE scope is introduced.
