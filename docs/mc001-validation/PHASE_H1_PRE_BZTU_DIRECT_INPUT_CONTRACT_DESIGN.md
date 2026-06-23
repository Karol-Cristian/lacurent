# Phase H1-pre - BZTU Direct Input Contract Design

## 1. Purpose

Phase H1-pre prepares a future source-backed direct `bztu` input gate for non-climatized-zone transmission handling. It is a design checkpoint only. It does not implement the future gate, does not change runtime behavior, and does not add tests.

The purpose is to define the future input contract, validation rules, blocker behavior, and expected interaction with the existing MC001 Physics Engine readiness layers before coding starts.

## 2. Source Basis

This design depends on the Phase H0 and H0A methodology documents:

- `PHASE_H0_HTR_BOUNDARY_COMPONENTS_METHODOLOGY_EXTRACTION.md`;
- `PHASE_H0A_HTR_BOUNDARY_COMPONENTS_SOURCE_VERIFICATION.md`.

Phase H0 established that `Hg`, `Hu`, and unresolved `Ha` must remain blocked unless source-backed methods or controlled values exist. Phase H0A tightened the source candidates for non-climatized-zone transmission and confirmed that direct exterior, external non-climatized-zone, and internal non-climatized-zone element cases must remain methodologically distinct.

Runtime implementation still requires final source review before code changes. The formulas and fields below are implementation candidates, not implementation-ready normative registry content.

## 3. Future H1 Scope

Future H1 should be narrow:

- accept direct `bztu` values only when source-backed and provenance-backed;
- use `bztu` only for non-climatized-zone transmission paths;
- support external non-climatized-zone and internal non-climatized-zone element handling only after source/provenance validation passes;
- keep the existing direct exterior path unchanged;
- preserve blockers into `Htr` and the auditor core orchestrator.

Future H1 must not:

- derive `bztu`;
- implement the full `Hztu` model;
- implement ground `Hg` or `Hgr`;
- implement unresolved `Ha`;
- implement monthly heating;
- implement `QHnd`;
- implement final energy, primary energy, or CO2;
- claim Level 2 auditor, CPE/report, or product readiness.

## 4. Proposed Raw Auditor Input Contract

A future direct `bztu` gate likely needs these minimum fields for each non-climatized-zone transmission element:

| Field | Purpose | Required behavior |
| --- | --- | --- |
| `evaluatedThermalZoneId` | Identifies the conditioned/evaluated thermal zone. | Required for every non-climatized-zone element. |
| `envelopeElementId` | Identifies the envelope element being prepared. | Required and stable for diagnostics/provenance. |
| `boundaryType` | Classifies the element boundary. | Must be one of `direct_exterior`, `external_non_climatized_zone`, or `internal_non_climatized_zone` for this future gate. |
| `adjacentNonClimatizedZoneId` | Identifies the adjacent non-climatized zone. | Required for `external_non_climatized_zone` and `internal_non_climatized_zone`; not required for direct exterior. |
| `area` | Element area. | Required, unit-valid, and positive. |
| `areaUnit` | Area unit. | Must be explicit, expected `m2` unless a future unit conversion policy is added. |
| `uValue` or `correctedUValue` path | Provides source-backed element transmittance. | Must follow the existing Phase D source-backed U/corrected-U rules. |
| `bztu` | Direct correction factor for the adjacent non-climatized zone. | Required for non-climatized-zone boundaries; must be source-backed. |
| `bztuSource` / `bztuProvenance` | Source/provenance for direct `bztu`. | Required; must include source type, document or external calculation source, locator, and trace id where available. |
| `sourceLocator` | Precise location for source review. | Required for normative/manual source, controlled import, or expert override. |
| `reviewStatus` | Review status for the supplied value. | Required; unreviewed values must remain blocked unless explicitly allowed through expert override policy. |
| `calculationPeriod` / `applicability` | Declares whether the `bztu` value is annual or monthly. | Annual may be considered first. Monthly must remain candidate-only unless source-supported later. |
| `bztuValueKind` | Explains how the value was obtained. | Must identify measured, externally calculated, normative, `validationImport`, or `expertOverride`. |

The future contract should preserve the source notation where possible and avoid forcing a runtime symbol name before the `Htr(excl.*)` and cooling-side notation questions are resolved.

## 5. Proposed Validation Rules

Future H1 should fail closed:

- reject a non-climatized-zone boundary with missing `bztu`;
- reject `bztu` without source/provenance;
- reject product estimate or fallback `bztu`;
- reject derived totals submitted as normal auditor input;
- reject unsupported boundary types;
- reject missing, zero, or negative area;
- reject invalid area units;
- reject missing or invalid U-value/corrected-U path;
- reject `bztu` outside a source-supported or expert-reviewed acceptable range;
- never convert missing `bztu` to zero;
- never silently treat a non-climatized-zone element as direct exterior;
- never mark `Htr` complete if the `bztu` path is blocked;
- preserve lower-module blockers in the transmission readiness gate and auditor core orchestrator.

Value range note: Phase H1-pre does not define a hard normative `bztu` range. If a provisional engineering sanity range is used later, it must be marked non-normative and must require source review or expert override provenance before the value can contribute to MC001 readiness.

## 6. Future Formula Application Candidates

The candidate formulas below come from Phase H0A and remain pending final source review before implementation.

| Case | Candidate formula | Future implementation status |
| --- | --- | --- |
| Direct exterior element | `H_el = U * A` | Already conceptually aligned with the existing direct exterior Phase D/E path. |
| External non-climatized-zone element | `H_el = bztu * U * A` | Candidate H1 path only after direct `bztu`, U, area, boundary classification, and provenance pass validation. |
| Internal non-climatized-zone element | `H_el = (1 - bztu) * U * A` | Candidate H1 path only after direct `bztu`, U, area, boundary classification, and provenance pass validation. |

Exact `H/C` notation must be verified before implementation. Monthly vs annual handling must not be implemented in H1 unless explicitly sourced. A future H1 should probably reuse the direct transmission helper pattern only after the source/provenance gate has accepted the non-climatized-zone path and after double-counting checks pass.

## 7. Interaction With Existing Engine

Future H1 should compose with the existing engine rather than bypassing it.

Phase C input/provenance gate:

- must continue rejecting derived values as normal input;
- must continue rejecting product estimates/fallbacks;
- must validate controlled `validationImports` and `expertOverrides`;
- should be the first line of defense before any future `bztu` value is accepted.

Phase D envelope input builder:

- should keep direct exterior handling unchanged;
- may become the natural home for a narrow non-climatized-zone element preparation path;
- must keep invalid or missing `bztu` as a blocked item;
- must not treat non-climatized-zone elements as direct exterior;
- must keep corrected-U and explicit-bridge double-count protection.

Phase E transmission/Htr readiness gate:

- should classify valid source-backed non-climatized-zone contributions without treating missing components as zero;
- should keep `Htr` blocked when any required transmission component remains blocked;
- should preserve the distinction between direct exterior, non-climatized-zone, ground, adjacent, and bridge components.

Phase G/G1 auditor core orchestrator:

- should receive and expose `bztu` blockers from lower modules;
- should preserve no-fake-zero and no-readiness-escalation behavior;
- should not claim monthly heating, `QHnd`, Level 2 auditor, CPE/report, or product readiness.

Expected future behavior:

- direct exterior path remains unchanged;
- non-climatized-zone path becomes conditionally supported only when direct `bztu` is valid;
- invalid or missing `bztu` remains blocked;
- blockers propagate to `Htr` and the orchestrator;
- no fake zeroes;
- no readiness escalation.

## 8. Proposed Future Test Matrix

Future implementation tests should cover:

- valid external non-climatized-zone direct `bztu`;
- valid internal non-climatized-zone direct `bztu`;
- missing `bztu`;
- `bztu` without provenance;
- product fallback `bztu`;
- unsupported boundary type;
- missing, zero, or negative area;
- invalid U-value path;
- corrected U plus explicit bridge double-count prevention;
- `Htr` blocked if one non-climatized-zone component is blocked;
- orchestrator blocker propagation after future H1;
- derived `Htr`, `QHnd`, final energy, primary energy, or CO2 rejected as normal input.

No tests are added in Phase H1-pre.

## 9. Risks and Open Questions

- What exact `bztu` range is acceptable, and is the range normative, methodological, or only engineering sanity validation?
- Should the first H1 support annual `bztu` only, or can monthly `bztu` be accepted when source-supported?
- What exact source/provenance fields are required for direct `bztu` input?
- What is the exact source notation for heating/cooling `H/C` element cases?
- How should the future contract distinguish `bztu` from `bve`, given that their relation applies only to ventilation from non-climatized-zone cases?
- How should future H1 avoid double counting with thermal bridges and corrected U-values?
- Should H1 update only Phase D, or also Phase E readiness classification?
- How should internal runtime boundary categories be named without prematurely normalizing MC001 notation?
- Should `external_non_climatized_zone` and `internal_non_climatized_zone` map to `Hu`, or does a later source review require a more precise component split?

## 10. Non-Goals

Phase H1-pre does not implement:

- runtime behavior;
- tests;
- validation fixtures;
- `bztu` derivation;
- full `Hztu` modelling;
- `Hg`;
- `Ha`;
- monthly heating;
- `QHnd`;
- final energy;
- primary energy;
- CO2;
- CPE/report/certificate workflow;
- UI, API, DB, Worker, deploy, or product integration;
- product registry;
- marketplace scope;
- full Level 2 auditor readiness.

Phase H1-pre does not change:

- formula helpers;
- orchestrators;
- Phase C/D/E/F/G/G1 behavior;
- Phase H0/H0A methodology conclusions.
