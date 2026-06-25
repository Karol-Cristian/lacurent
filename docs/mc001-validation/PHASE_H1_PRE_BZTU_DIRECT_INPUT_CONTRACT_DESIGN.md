# Phase H1-pre - BZTU Direct Input Contract Design

## 1. Purpose

Phase H1-pre prepared the source-backed direct `bztu` input contract for non-climatized-zone transmission handling. The executable Phase H1 milestone now uses this contract for a narrow direct-input readiness gate and orchestrator visibility layer.

The purpose is to define the input contract, validation rules, blocker behavior, and expected interaction with the existing MC001 Physics Engine readiness layers without implementing the full `bztu` derivation chain or any broader Level 2 auditor behavior.

## 2. Source Basis

This design depends on the Phase H0 and H0A methodology documents:

- `PHASE_H0_HTR_BOUNDARY_COMPONENTS_METHODOLOGY_EXTRACTION.md`;
- `PHASE_H0A_HTR_BOUNDARY_COMPONENTS_SOURCE_VERIFICATION.md`.

Phase H0 established that `Hg`, `Hu`, and unresolved `Ha` must remain blocked unless source-backed methods or controlled values exist. Phase H0A tightened the source candidates for non-climatized-zone transmission and confirmed that direct exterior, external non-climatized-zone, and internal non-climatized-zone element cases must remain methodologically distinct.

Runtime implementation still requires final source review before code changes. The formulas and fields below are implementation candidates, not implementation-ready normative registry content.

Additional BZTU methodology notes reviewed after H1-pre reinforce that `bztu,k;m` is a methodological monthly correction factor for an adjacent unheated/uncooled/unconditioned zone, not ordinary raw auditor input. The notes cite MC001 Chapter 2 "Factori de corectie si de distributie", relations around 2.21-2.24, and Monitorul Oficial pages around 95-96. Existing Phase H0A used earlier local extraction numbering for related candidates. Future implementation must verify exact equation numbering and source locators before registering final source ids or coding runtime behavior.

Repository cross-check for this design found the local MC001 PDF under `docs/` and existing extraction notes that are directionally consistent with the stricter contract: `docs/mc001-extraction/06_ventilation_and_infiltration.md` records the specific ventilation-only `bve,k;H/C;m = bztu,k;m` relation and warns not to invent `bztu`; `docs/mc001-extraction/08_internal_and_solar_gains.md` references adjacent-zone `bztu,k;m` and `Fztc;ztu,k;m` factors for gains handling. These cross-checks support strict provenance and no-fallback behavior, but they do not replace final source review of the transmission-side Chapter 2 relations before implementation.

## 3. Phase H1 Scope

Phase H1 is narrow:

- accept direct `bztu` values only when source-backed and provenance-backed;
- use `bztu` only for non-climatized-zone transmission paths;
- validate external non-climatized-zone and internal non-climatized-zone direct-input readiness only after source/provenance validation passes;
- accept `bztu` only as explicit methodological direct input, validation fixture import, or expert override with source;
- keep the existing direct exterior path unchanged;
- preserve blockers into `Htr` and the auditor core orchestrator.

Phase H1 must not:

- derive `bztu`;
- calculate `Hu` from `bztu`;
- implement the full `Hztu` model;
- implement ground `Hg` or `Hgr`;
- implement unresolved `Ha`;
- implement monthly heating;
- implement `QHnd`;
- implement final energy, primary energy, or CO2;
- claim Level 2 auditor, CPE/report, or product readiness.

The executable H1 implementation surface is intentionally limited to `mc001BztuDirectInputGate.mjs`, Phase C raw-input rejection for ordinary `bztu`, and Phase G/G1 orchestrator exposure of the BZTU gate result. It does not deblock `Hu` or complete `Htr`.

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
| `bztuUnit` | Unit for `bztu`. | Required and dimensionless, following project convention such as `dimensionless` or `-`. |
| `bztuSource` / `bztuProvenance` | Source/provenance for direct `bztu`. | Required; must include source type, document or external calculation source, locator, and trace id where available. |
| `sourceLocator` | Precise location for source review. | Required for normative/manual source, controlled import, or expert override. |
| `reviewStatus` | Review status for the supplied value. | Required; unreviewed values must remain blocked unless explicitly allowed through expert override policy. |
| `methodologyStatus` | Declares whether the value is accepted, blocked, ambiguous, externally calculated, or overridden. | Required. Unknown or missing methodology status must block use. |
| `month` | Identifies month `m` for the `bztu,k;m` value. | Required for accepted direct `bztu` readiness unless final source review explicitly authorizes a scoped non-monthly value. |
| `calculationPeriod` / `applicability` | Declares the period and applicability of the `bztu` value. | Must not be an unsourced annual scalar. Monthly values are the conservative first contract. |
| `bztuValueKind` | Explains how the value was obtained. | Must identify measured, externally calculated, normative, `validationImport`, or `expertOverride`. |
| `inputClassification` | Distinguishes direct methodological input from raw auditor input. | Must be `explicit_methodological_direct_input`, `validation_fixture_import`, or `expert_override_with_source`. |
| `adjacentConditionedZoneRelation` | Identifies the conditioned-zone relation for the `ztu,k` zone. | Required, or must explicitly state that the relation is handled through a distribution factor. |
| `notAdjacentToAnotherZtu` | Captures the source applicability condition. | Required. If unknown or false, the gate should return blocked or ambiguous, not accepted. |
| `distributionFactor` / `distributionFactorSource` | Handles multiple adjacent conditioned zones. | Required when multiple conditioned zones are adjacent to the same non-climatized zone; no invented averaging. |

The future contract should preserve the source notation where possible and avoid forcing a runtime symbol name before the `Htr(excl.*)` and cooling-side notation questions are resolved.

## 5. Proposed Validation Rules

Future H1 should fail closed:

- reject a non-climatized-zone boundary with missing `bztu`;
- reject `bztu` without source/provenance;
- reject `bztu` supplied as normal raw auditor input;
- reject `bztu` without a dimensionless unit;
- reject `bztu` without methodology status;
- reject `bztu` without month and zone applicability;
- reject unknown `bztu` record ids;
- reject product estimate or fallback `bztu`;
- reject derived totals submitted as normal auditor input;
- reject unsupported boundary types;
- reject missing, zero, or negative area;
- reject invalid area units;
- reject missing or invalid U-value/corrected-U path;
- reject `NaN`, `Infinity`, and numeric strings unless the project has an explicit normalization convention for that input class;
- reject `bztu` outside a source-supported or expert-reviewed acceptable range;
- reject direct `bztu` when the unconditioned zone is adjacent to another unconditioned zone, unless a verified future source path supports that case;
- reject multiple adjacent conditioned-zone cases without source-backed `Fztc,j;ztu,k;m` distribution factor handling;
- never convert missing `bztu` to zero;
- never silently treat a non-climatized-zone element as direct exterior;
- never mark `Htr` complete if the `bztu` path is blocked;
- preserve lower-module blockers in the transmission readiness gate and auditor core orchestrator.

Value range note: Phase H1-pre does not define a final normative `bztu` range. Methodology notes indicate the expected range is normally `0 <= bztu <= 1`. Future H1 should reject values outside that range unless a sourced exception or expert override with provenance is supplied. If a provisional engineering sanity range is used before final source registration, it must be marked non-normative and must require source review or expert override provenance before the value can contribute to MC001 readiness.

## 6. Future Formula Application Candidates

The candidate formulas below come from Phase H0A and remain pending final source review before implementation.

| Case | Candidate formula | Future implementation status |
| --- | --- | --- |
| Direct exterior element | `H_el = U * A` | Already conceptually aligned with the existing direct exterior Phase D/E path. |
| External non-climatized-zone element | `H_el = bztu * U * A` | Candidate H1 path only after direct `bztu`, U, area, boundary classification, and provenance pass validation. |
| Internal non-climatized-zone element | `H_el = (1 - bztu) * U * A` | Candidate H1 path only after direct `bztu`, U, area, boundary classification, and provenance pass validation. |

Exact `H/C` notation must be verified before implementation. Monthly vs annual handling must not be implemented in H1 unless explicitly sourced. A future H1 should probably reuse the direct transmission helper pattern only after the source/provenance gate has accepted the non-climatized-zone path and after double-counting checks pass.

Source-reference candidates for future registry work may include:

- `MC001_2022_2_21_ZTU_MONTHLY_TEMPERATURE`;
- `MC001_2022_2_22_BZTU_CORRECTION_FACTOR`;
- `MC001_2022_2_23_HZTU_TOTAL`;
- `MC001_2022_2_24_HZTU_EXTERIOR_COEFFICIENT`;
- `MC001_2022_BZTU_APPLICABILITY_NOT_ADJACENT_TO_OTHER_ZTU`;
- `MC001_2022_BZTU_MULTIPLE_ADJACENT_ZONES_DISTRIBUTION_FACTOR`.

These are proposed ids only. Future work must reuse existing project naming conventions if they exist and must not create final registry ids before source review.

## 7. Interaction With Existing Engine

Future H1 should compose with the existing engine rather than bypassing it.

Phase C input/provenance gate:

- must continue rejecting derived values as normal input;
- must continue rejecting product estimates/fallbacks;
- must validate controlled `validationImports` and `expertOverrides`;
- should reject normal raw auditor `bztu` unless the value is wrapped in the future explicit methodological direct-input contract;
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
- derived `Htr`, `QHnd`, final energy, primary energy, or CO2 rejected as normal input;
- unsourced annual `bztu` scalar rejected;
- `bztu` without dimensionless unit rejected;
- `bztu` without methodology status rejected;
- `bztu` without month/zone applicability rejected;
- `NaN`, `Infinity`, string numeric, and outside-range `bztu` rejected unless an explicit future normalization/override policy applies;
- unknown `bztu` record id rejected;
- `ztu` adjacent to another `ztu` returns blocked or ambiguous;
- multiple adjacent conditioned zones without source-backed distribution factor handling rejected.

Phase H1-pre itself added no tests. The executable H1 continuation adds targeted BZTU gate and auditor-core readiness tests for this direct-input contract.

## 9. Risks and Open Questions

- What exact `bztu` range is acceptable, and is the range normative, methodological, or only engineering sanity validation?
- Should the first H1 support only monthly `bztu,k;m`, or can any non-monthly value be accepted with explicit source support?
- What exact source/provenance fields are required for direct `bztu` input?
- What is the exact source notation for heating/cooling `H/C` element cases?
- What are the exact equation numbers: the new methodology notes cite 2.21-2.24, while Phase H0A used earlier local extraction numbering for related formulas?
- How should the future contract distinguish `bztu` from `bve`, given that their relation applies only to ventilation from non-climatized-zone cases?
- How should future H1 avoid double counting with thermal bridges and corrected U-values?
- Should H1 update only Phase D, or also Phase E readiness classification?
- How should internal runtime boundary categories be named without prematurely normalizing MC001 notation?
- Should `external_non_climatized_zone` and `internal_non_climatized_zone` map to `Hu`, or does a later source review require a more precise component split?
- How should internal and solar gains in or near non-climatized zones be represented as blockers, given the notes say the unconditioned-zone temperature calculation does not include those gains?
- How should future H1 explicitly quarantine any legacy/product fallback `b_ztu` values so they cannot be promoted into MC001 validation readiness?

## 10. Non-Goals

The combined H1 milestone implements only direct `bztu` input/readiness validation. It still does not implement:

- normal raw auditor `bztu` input acceptance;
- `bztu` derivation;
- `Hu` calculation from `bztu`;
- full `Hztu` modelling;
- `Fztc,j;ztu,k;m` distribution-factor derivation;
- internal or solar gains handling for non-climatized zones;
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
