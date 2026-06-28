# Phase H2G - Hu Multi-Component Inventory Readiness Design

## 1. Purpose

Phase H2G defines the design for future multi-component unconditioned-zone transmission / `Hu` inventory readiness.

This milestone is docs-only. It does not implement runtime code, does not create tests, does not create fixtures, does not calculate `Hu`, does not aggregate `Hu`, and does not calculate `Htr`.

The design question is:

> What must be true before the engine may say that the source-backed inventory of `Hu` component candidates is complete enough for a future readiness gate, without producing a numerical `Hu` result or unlocking complete `Htr` readiness?

Phase H2G distinguishes four separate concepts:

- H2E single-component `Hu` contract readiness;
- H2F orchestrator exposure of that single-component readiness;
- multi-component `Hu` inventory readiness;
- complete numerical `Hu` and complete `Htr` readiness.

H2E proves that one narrow component contract can be ready. H2F exposes that component state through the auditor readiness orchestrator. H2G defines how multiple `Hu` component candidates must be inventoried before any future `Hu` aggregation or complete `Hu` readiness is considered.

Multi-component inventory readiness is not numerical `Hu` readiness. It only means the candidate set is complete, source-backed, unambiguous, and ready for a later method-specific calculation phase.

## 2. Inventory Model

A future multi-component `Hu` inventory gate should evaluate a list of component candidates. Each candidate should first satisfy the H2E component-contract expectations.

Minimum component candidate fields:

| Field | Purpose |
| --- | --- |
| `componentId` | Stable id for the candidate contract. |
| `conditionedZoneId` | Evaluated conditioned / thermal zone. |
| `unconditionedZoneId` / `ztuZoneId` | Adjacent non-climatized zone. |
| `month` | Monthly scope for the candidate and its `bztu` path. |
| `elementId` | Envelope element between conditioned zone and `ztu`. |
| `boundaryRelation` | Source-located relation: external non-climatized zone or internal non-climatized zone. |
| `area` | Positive source-backed area with unit. |
| `uValuePath` | Source-backed U-value or corrected U-value path. |
| `bztuPath` | Accepted H1 direct `bztu`, future calculated `bztu`, validation import, or expert override path. |
| `sourceTrace` | Source refs, locators, review status, trace ids, and provenance. |
| `applicability` | Month, zone, topology, and distribution applicability. |
| `diagnostics` | Candidate-level diagnostic records. |
| `blockers` | Candidate-level blockers. |
| `componentStatus` | H2E-style component status. |
| `isHuComponentReady` | True only when the narrow component contract is ready. |

A future multi-component inventory should include:

| Inventory concern | Required design behavior |
| --- | --- |
| Component candidate list | One or more candidate contracts in a stable array. |
| Expected zone/month coverage | Defines which conditioned zones, `ztu` zones, months, and boundary elements must be represented. |
| Duplicate detection | Blocks duplicate `componentId` values and duplicate element/month/zone tuples. |
| Missing component detection | Blocks if an expected boundary element is missing. |
| Ambiguous component detection | Blocks candidates with ambiguous zone mapping, boundary relation, month, U-value path, or `bztu` path. |
| Multi-zone distribution requirement | Blocks multiple conditioned zones adjacent to the same `ztu` unless source-backed distribution metadata is present. |
| ztu-to-ztu blocker handling | Blocks unsupported `ztu` adjacent to another `ztu` topology. |
| Unsupported path handling | Blocks ground, adjacent-building, direct exterior fallback, or unknown boundary paths. |
| Source/provenance completeness | Requires source/provenance for all direct, imported, or overridden values. |

The inventory should not infer missing elements from silence. Missing expected elements remain blockers, not zero contributions.

## 3. Positive Design Scenario

Future H2H should include a synthetic positive multi-component inventory readiness scenario.

Scenario name:

```text
h2h_one_ztu_multi_element_inventory_ready
```

Minimum setup:

- one conditioned zone;
- one adjacent non-climatized zone / `ztu`;
- one month;
- multiple envelope elements between the conditioned zone and the `ztu`;
- each element has a unique `elementId`;
- each component has a unique `componentId`;
- each element has a positive area with a valid area unit;
- each element has a valid source-backed U-value or corrected U-value path;
- each element references the same valid `bztu` path for the same month and same `ztu`;
- each element has a clear `boundaryRelation`;
- each element has complete source/provenance;
- expected boundary coverage confirms that no element is missing;
- there are no duplicate element/month/zone tuples;
- there is no distribution ambiguity;
- there is no `ztu`-to-`ztu` path.

Expected design result:

```text
huMultiComponentInventoryReadiness.inventoryStatus = ready_hu_component_inventory
huMultiComponentInventoryReadiness.isHuInventoryReady = true
huMultiComponentInventoryReadiness.isCompleteHuReady = false
huMultiComponentInventoryReadiness.isCompleteHtrReady = false
```

Interpretation:

- all component candidates may be component-ready;
- the multi-component inventory may be ready;
- no numerical `Hu` value is produced;
- no numerical `Htr` value is produced;
- complete `Hu` remains false because inventory readiness is not aggregation or formula execution;
- complete `Htr` remains false because `Hd`, `Hg`, complete `Hu`, `Ha`, bridges, and non-applicability rules are outside H2G.

## 4. Negative Design Scenarios

Future H2H should include negative scenarios that prove fail-closed inventory behavior.

| Scenario | Expected blocker | Purpose |
| --- | --- | --- |
| Empty component list | `blocked_empty_hu_component_inventory` | No candidates cannot imply complete inventory. |
| Missing expected component | `blocked_missing_hu_component` | Missing elements do not become zero. |
| Duplicate `componentId` | `blocked_duplicate_component_id` | Duplicate ids break traceability. |
| Duplicate element/month/zone tuple | `blocked_duplicate_element_scope` | The same physical scope must not be counted twice. |
| Inconsistent month across components | `blocked_inconsistent_month_scope` | Inventory scope must be explicit and coherent. |
| Inconsistent `ztu` across components | `blocked_inconsistent_ztu_scope` | Single-inventory scenario must not mix adjacent zones without explicit grouping. |
| Wrong BZTU month | `blocked_bztu_scope_mismatch` | Monthly `bztu` cannot silently apply to another month. |
| Wrong BZTU `ztu` | `blocked_bztu_scope_mismatch` | Zone-scoped `bztu` cannot silently apply to another `ztu`. |
| Missing BZTU path in one component | `blocked_missing_bztu_path` | One incomplete component blocks inventory readiness. |
| Invalid U-value path in one component | `blocked_invalid_u_value_path` | One invalid U path blocks inventory readiness. |
| Missing source/provenance in one component | `blocked_missing_source` | Direct/import/override values must remain source-backed. |
| Ambiguous boundary relation | `blocked_ambiguous_boundary_relation` | Non-climatized-zone path must not fall back to direct exterior. |
| Multiple conditioned zones without distribution source | `blocked_ambiguous_distribution` | Figure 2.8 distribution cannot be guessed or averaged. |
| `ztu`-to-`ztu` path | `blocked_unsupported_methodology` | Page 95 applicability keeps this path blocked. |
| Component submitted as raw `Hu` value | `rejected_derived_input` | `Hu` is not normal raw auditor input. |
| Attempt to mark complete `Hu` ready | `blocked_complete_hu_readiness_escalation` | Inventory readiness must not become complete `Hu`. |
| Attempt to mark complete `Htr` ready | `blocked_complete_htr_readiness_escalation` | Inventory readiness must not become complete `Htr`. |
| Missing `Hg` / `Ha` treated as zero | `blocked_fake_zero_component` | Missing transmission components are not zero. |
| Partial inventory treated as complete inventory | `blocked_partial_inventory_escalation` | All required components must be present and unblocked. |

Negative scenarios should assert stable diagnostics, blocker propagation, and source trace preservation where applicable.

## 5. Expected Future Output Contract

A later executable H2H gate should return a structured inventory readiness result.

Minimum output fields:

| Field | Meaning |
| --- | --- |
| `huMultiComponentInventoryReadiness` | Top-level readiness object for the evaluated inventory. |
| `inventoryStatus` | Status such as `ready_hu_component_inventory`, `blocked_missing_hu_component`, or `blocked_ambiguous_distribution`. |
| `month` | Evaluated monthly scope. |
| `conditionedZoneIds` | Conditioned zone ids represented by the inventory. |
| `unconditionedZoneIds` / `ztuZoneIds` | Adjacent non-climatized zone ids represented by the inventory. |
| `componentCount` | Number of submitted component candidates. |
| `readyComponentCount` | Number of H2E-ready component candidates. |
| `blockedComponentCount` | Number of blocked component candidates. |
| `componentReadiness` | Per-component readiness summaries. |
| `missingComponents` | Expected component scopes not represented. |
| `duplicateComponents` | Duplicate ids or duplicate element/month/zone tuples. |
| `ambiguousComponents` | Candidates with unresolved zone, boundary, distribution, U-value, or `bztu` ambiguity. |
| `distributionBlockers` | Missing or invalid multi-zone distribution metadata. |
| `sourceTrace` | Consolidated source refs, source locators, trace ids, and provenance. |
| `diagnostics` | Machine-stable and human-readable diagnostics. |
| `blockers` | Explicit blocker records. |
| `isHuInventoryReady` | May be true only if every required candidate is source-backed, unambiguous, and component-ready. |
| `isCompleteHuReady` | Must remain false in H2H. |
| `isCompleteHtrReady` | Must remain false in H2H. |

Required future flag behavior:

- `isHuInventoryReady` may be `true` only if all required component candidates are source-backed and unambiguous.
- `isCompleteHuReady` must remain `false`.
- `isCompleteHtrReady` must remain `false`.
- `isMonthlyHeatingReady`, `isQhndReady`, `isLevel2AuditorReady`, `isCpeReady`, and product/report readiness must remain `false` if present.
- No numerical `Hu` result may be produced.
- No numerical `Htr` result may be produced.

## 6. Source Locator Basis

Future H2H should cite Phase H2C_A source locator categories without inventing final runtime registry ids or formula ids.

| Dependency | H2C_A locator | Inventory design use |
| --- | --- | --- |
| Direct/external/internal element cases | Official MC001 PDF, page 100, `Figura 2.12` | Supports boundary relation classification for component candidates. |
| `bztu` monthly meaning | Official MC001 PDF, pages 94-96, sections `2.6.2.1` and `2.6.2.2` | Requires month and `ztu` scope for each `bztu` path. |
| Full `bztu` / `Hztu` context | Official MC001 PDF, pages 95-96, relations `(2.22)` to `(2.24)` | Keeps full derivation blocked while preserving source context. |
| Multiple-zone distribution | Official MC001 PDF, page 95, `Figura 2.8` | Blocks multiple conditioned zones without source-backed distribution metadata. |
| `Htr` component definition | Official MC001 PDF, pages 81-82, relation `(2.15)` | Keeps `Hu` inventory and complete `Htr` readiness separate. |
| Ventilation-only `bve = bztu` | Official MC001 PDF, page 102, relation `(2.32)` | Prevents ventilation relation from becoming a transmission shortcut. |

H2G does not finalize equation ids, runtime formula ids, or registry ids. Any future runtime identifier should come from a reviewed registry/source phase.

## 7. Relationship To H2E And H2F

H2G builds on H2E and H2F without changing their runtime behavior.

Relationship summary:

- H2E checks one narrow `Hu` component contract.
- H2F exposes H2E single-component readiness through the MC001 auditor readiness orchestrator.
- H2G designs how a future gate should check that all required `Hu` component candidates are present, source-backed, and unambiguous.
- H2G does not calculate `Hu`.
- H2G does not aggregate component values.
- H2G does not claim complete `Hu`.
- H2G does not claim complete `Htr`.

A future inventory gate may call the H2E single-component gate for each component candidate, but it must not duplicate or weaken H2E validation rules.

## 8. Recommended Next Milestone

Recommended next milestone:

```text
PHASE_H2H_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE
```

H2H should be an executable readiness gate only. It may validate a complete source-backed component inventory, detect missing or duplicate component scopes, preserve per-component H2E blockers, and expose inventory readiness.

H2H must still not:

- calculate numerical `Hu`;
- aggregate `A * U * bztu` values;
- calculate `Htr`;
- implement full `bztu` derivation;
- implement `Hztu;e` or `Hztu;tot`;
- implement distribution formulas;
- unlock monthly heating / `QHnd`;
- unlock Level 2 auditor, report, CPE, product, UI, API, Worker, DB, deploy, marketplace, or AI scope.

## 9. Blockers Preserved

The following remain blocked after H2G:

- runtime H2H implementation;
- numerical `Hu` calculation;
- `Hu` aggregation;
- complete `Hu` readiness;
- complete `Htr` readiness;
- full `bztu` derivation;
- native `Hztu;e`;
- native `Hztu;tot`;
- `cztu;ve` runtime defaulting without registry/source review;
- distribution formula implementation;
- native `Hg`;
- native `Ha`;
- ztu-to-ztu chains;
- missing or ambiguous distribution metadata;
- final runtime formula ids;
- final registry ids;
- climate / solar / internal gains implementation;
- monthly heating / `QHnd`;
- final energy;
- primary energy;
- CO2;
- Level 2 Full Auditor readiness;
- report / CPE readiness;
- UI / API / Worker / DB / deploy / product integration;
- marketplace features;
- AI features;
- Salicea/demo-house default fixture usage.

## 10. Non-Goals

H2G does not:

- modify runtime code;
- modify tests;
- create fixtures;
- change formula helpers;
- change orchestrators;
- create final normative registry ids;
- calculate `Hu`;
- calculate `Htr`;
- compute `A * U * bztu`;
- implement `Hztu;e`, `Hztu;tot`, or `cztu;ve`;
- implement distribution coefficients;
- implement `Hg` or native `Ha`;
- implement climate, solar gains, internal gains, monthly heating, `QHnd`, final energy, primary energy, or CO2;
- add UI, API, Worker, DB/schema, migrations, deploy config, product flow, marketplace, report generation, certificate/CPE workflow, or AI features;
- use a Salicea/demo-house default fixture;
- perform Cloudflare or worktree cleanup.

## 11. Review Checklist For Future H2H

Future H2H should not be accepted unless it proves:

- empty inventory blocks;
- missing expected component blocks;
- duplicate component ids block;
- duplicate element/month/zone tuples block;
- one blocked component blocks inventory readiness;
- wrong month or `ztu` in any `bztu` path blocks;
- multiple conditioned zones without source-backed distribution metadata block;
- ztu-to-ztu topology blocks;
- raw `Hu` input is rejected;
- partial inventory is not complete inventory;
- `isHuInventoryReady` can be true only when every required component is ready;
- `isCompleteHuReady` remains false;
- `isCompleteHtrReady` remains false;
- no numerical `Hu` result is produced;
- no numerical `Htr` result is produced;
- missing `Hg`, `Hu`, or `Ha` is not zero;
- no UI/API/DB/product/report/CPE scope is introduced.
