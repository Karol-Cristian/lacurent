# Phase H2C - Hu Source Extraction Status Correction

## 1. Purpose

Phase H2C corrects and tightens the current source-status baseline for future unconditioned-zone transmission / `Hu` readiness.

This milestone is docs-only. It does not implement runtime code, does not create fixtures, does not add tests, and does not change formula helpers or orchestrators.

The status-correction question is:

> Which MC001 source mappings are strong enough for the next Hu readiness design step, and which mappings must remain candidate, ambiguous, missing, or blocked before any fixture or runtime implementation?

The answer remains conservative. H2C confirms that `Hu` is a required transmission component, but the detailed path from accepted `bztu` to a complete `Hu` component is not runtime-ready yet.

## 2. Source Basis And Verification Limits

Sources inspected:

- `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- `docs/mc001-extraction/01_geometry_envelope_definitions.md`
- `docs/mc001-extraction/02_materials_lambda_R_U.md`
- `docs/mc001-extraction/05_transmission_heat_transfer.md`
- `docs/mc001-extraction/06_ventilation_and_infiltration.md`
- `docs/mc001-extraction/08_internal_and_solar_gains.md`
- `docs/mc001-extraction/19_extraction_registry.md`
- `docs/mc001-validation/PHASE_H0_HTR_BOUNDARY_COMPONENTS_METHODOLOGY_EXTRACTION.md`
- `docs/mc001-validation/PHASE_H0A_HTR_BOUNDARY_COMPONENTS_SOURCE_VERIFICATION.md`
- `docs/mc001-validation/PHASE_H1_PRE_BZTU_DIRECT_INPUT_CONTRACT_DESIGN.md`
- `docs/mc001-validation/FIXTURE_027_BZTU_DIRECT_INPUT_READINESS_GATE.md`
- `docs/mc001-validation/PHASE_H2_UNCONDITIONED_ZONE_BZTU_TO_HU_READINESS_GATE_DESIGN.md`
- `docs/mc001-validation/PHASE_H2A_UNCONDITIONED_ZONE_HU_SOURCE_AND_INVENTORY_CONTRACT.md`
- `docs/mc001-validation/PHASE_H2B_HU_SOURCE_MAPPING_VERIFICATION.md`
- `docs/mc001-validation/CANDIDATE_INVENTORY.md`
- `docs/mc001-validation/VALIDATION_MATRIX.md`

The official MC001 PDF is present in `docs/`, but this shell does not provide working direct PDF text extraction:

- `pdftotext` is unavailable.
- `python` / `py` are unavailable.

Therefore H2C does not claim a fresh direct PDF verification pass. It corrects source status using repository extraction files plus the earlier H0A local text/PDF-render verification notes. Any item that still depends on exact PDF notation, equation numbering, or source-locator confirmation remains `candidate_needs_review`, `ambiguous`, `missing`, or `blocked_until_registry`.

This means H2C is not a completed direct source extraction correction. It is a source correction status checkpoint. Unresolved source items remain unresolved and must not be promoted to fixture readiness, runtime readiness, final registry ids, or implementation-ready formulas.

Status terms:

- `verified_source_ready`: directly supported by current repository extraction docs or H0A verified-candidate notes strongly enough for source-aware design, still subject to normal review.
- `candidate_needs_review`: plausible source evidence exists, but exact notation, equation number, applicability, or runtime naming still needs review.
- `ambiguous`: source evidence exists but does not answer the implementation question safely.
- `missing`: no adequate source mapping was found in inspected repository materials.
- `blocked_until_registry`: source candidate exists, but runtime/fixture use must wait for final registry id, review status, and provenance.
- `external_or_out_of_scope`: source is external-standard dependent or outside the current Hu path.

## 3. Source Status Correction Summary

H2C corrects the working source-status picture as follows:

1. `Hu` as a required `Htr` component is verified, but complete `Hu` derivation is not verified.
2. Figure 2.9 non-climatized-zone element formulas remain candidate-level because fresh direct PDF extraction is unavailable and exact notation still needs review.
3. `Htr(excl.*)` notation must not be normalized into final runtime identifiers yet.
4. H1 direct `bztu` readiness is valid only as a provenance/input gate. It is not proof of `Hu` readiness.
5. `bve = bztu` is a ventilation-specific relation only. It must not be used as a global transmission / `Hu` equivalence.
6. Gains-side `Fztc` evidence must not be reused for transmission-side distribution unless a transmission-side source is found.
7. `Hztu;e`, `Hztu;tot`, and `cztu;ve` remain full-derivation candidates, not H2C runtime-ready formulas.
8. `Ha` remains unresolved and must not be mapped to lowercase `ha` or any non-envelope context.
9. Missing `Hg`, `Hu`, or `Ha` must never be treated as zero unless explicit source-backed non-applicability is proven.

## 4. Source Status Correction Table

| mappingId | topic | correctedStatus | evidence | correction / decision | runtime consequence |
| --- | --- | --- | --- | --- | --- |
| `H2C_HU_COMPONENT_IN_HTR` | `Hu` as `Htr` component | `verified_source_ready` | `05_transmission_heat_transfer.md`; `19_extraction_registry.md` list `Htr = Hd + Hg + Hu + Ha` as MC001 2.4.1 relation (2.15). | Keep `Hu` as a required transmission component. | Complete `Htr` requires `Hu` unless source-backed non-applicability is explicit. |
| `H2C_COMPLETE_HU` | complete `Hu` component | `blocked_until_registry` | No inspected source gives complete inventory/completeness rules for all non-climatized-zone elements. | Accepted `bztu` plus one element is insufficient. | No complete `Hu` readiness yet. |
| `H2C_FIG_2_9_DIRECT_EXTERIOR` | direct exterior element | `verified_source_ready` for existing exterior path; `candidate_needs_review` for final notation | H0A Figure 2.9 visual-render candidate; Phase D/E existing source-backed exterior path. | Direct `U * A` remains valid only for direct exterior boundaries. | Do not reuse this path for non-climatized or ground elements. |
| `H2C_FIG_2_9_EXTERNAL_ZTU` | external non-climatized-zone element | `candidate_needs_review` | H0A candidate: `H_el = bztu * U * A`. | Formula is plausible but exact H/C notation and source locator still need direct review. | Not runtime-ready. May inform future contract/fixture design only. |
| `H2C_FIG_2_9_INTERNAL_ZTU` | internal non-climatized-zone element | `candidate_needs_review` | H0A candidate: `H_el = (1 - bztu) * U * A`. | Formula is plausible but exact topology, sign, U notation, and cooling-side notation need review. | Not runtime-ready. |
| `H2C_HTR_EXCLUDING_GROUND` | `Htr(excl.*)` / excluding-ground notation | `ambiguous` | H0A records `HH/C;tr(excl.gf)` and related variants; `05_transmission_heat_transfer.md` / registry use `HH/C;tr(excl.gr)` with relation (2.27). | Treat as transmission excluding ground / ground-floor components. Do not normalize final runtime id yet. | Runtime registry ids blocked until notation reconciliation. |
| `H2C_BZTU_TEMPERATURE_RELATION` | `bztu` meaning and monthly scope | `candidate_needs_review` | H0A candidate temperature relation; H1-pre notes cite later relation numbers around 2.21-2.24. | `bztu,k;m` remains monthly methodological factor for adjacent non-climatized zones. Equation numbering is non-final. | H1 direct input gate remains provenance-only. |
| `H2C_BZTU_USE_IN_HU` | `bztu` in non-climatized transmission | `candidate_needs_review` | H0A Figure 2.9 element candidates. | Direct `bztu` may participate only after source-reviewed element relation, U path, area, month, zone, and boundary relation are complete. | Accepted `bztu` does not make `Hu` ready. |
| `H2C_HZTU_TOTAL` | `Hztu;tot` | `candidate_needs_review` | H0A candidate: `Hztu;tot;m = sum_j(Hztc,j;ztu;m) + Hztu;e;m`. | Keep as full-derivation model input, not direct H1/H2 runtime. | Full `bztu` derivation blocked. |
| `H2C_HZTU_EXTERIOR` | `Hztu;e` | `candidate_needs_review` | H0A candidate: `Hztu;e;k;m = (1 + cztu;ve) * Htr;ue;k;m`. | Needs full exterior/coupling model and exact source review. | Not runtime-ready. |
| `H2C_CZTU_VE` | `cztu;ve` | `blocked_until_registry` | H0A candidate value `0.5`. | Do not hardcode. It needs source locator, applicability, status, and registry record. | No runtime default. |
| `H2C_BVE_BZTU` | ventilation relation `bve = bztu` | `verified_source_ready` for ventilation only | `06_ventilation_and_infiltration.md` lists `bve,k;H/C;m = bztu,k;m` for ventilation from a non-climatized zone. | Confirmed as ventilation-specific; not a transmission shortcut. | Keep Phase F/Hve semantics separate from `Hu`. |
| `H2C_GAINS_SIDE_FZTC` | gains-side distribution factor | `verified_source_ready` for gains reference; `ambiguous` for transmission | `08_internal_and_solar_gains.md` references `Fztc;ztu,k;m` in internal/solar gains formulas only. | Do not promote gains-side `Fztc` to transmission-side distribution. | Multi-zone transmission distribution remains blocked. |
| `H2C_TRANSMISSION_DISTRIBUTION` | multiple conditioned-zone distribution for `Hu` | `missing` | No inspected transmission-side distribution source found. | Simple averaging is forbidden. | Missing distribution blocks multi-zone `Hu`. |
| `H2C_ZTU_TO_ZTU` | ztu adjacent to another ztu | `missing` | H1/H2 blockers mention ambiguity; no source path found. | Keep unsupported. | `blocked_unsupported_methodology`. |
| `H2C_HG` | ground transmission | `external_or_out_of_scope` | H0A: MC001 points to C107/5-2005 / SR EN ISO 13370 / SR EN 12831. | `Hg` is not simple `U * A`; keep controlled import/override or future ground source path. | Ground remains blocked for native method. |
| `H2C_HA` | adjacent-space component | `missing` | H0A found no reliable MC001 envelope/transmission formula using internal `Ha`; lowercase `ha` belongs elsewhere. | Keep unresolved internal compatibility placeholder. | No `Ha` runtime implementation. |
| `H2C_EQUATION_NUMBERING` | equation / relation numbering | `ambiguous` | H0A candidates use one numbering sequence; H1-pre notes cite 2.21-2.24; registry uses 2.27/2.28 for transmission excluding ground and bridges. | Do not create final formula ids from these numbers yet. | Final normative registry blocked. |
| `H2C_REGISTRY_IDS` | final formula/record ids | `blocked_until_registry` | Candidate ids exist in H1-pre and registry, but Hu-specific ids are not final. | Use only candidate labels in docs. | No runtime registry entries yet. |

## 5. Figure 2.9 Status Correction

H2C preserves the Figure 2.9 candidate formulas from H0A as source candidates, not implementation-ready formulas.

Current corrected interpretation:

```text
direct exterior candidate:
H_el = U * A

external non-climatized-zone candidate:
H_el = bztu * U * A

internal non-climatized-zone candidate:
H_el = (1 - bztu) * U * A
```

Correction:

- The direct exterior case is already represented by Phase D/E only for direct exterior envelope elements.
- The external and internal non-climatized-zone cases are not equivalent to exterior transmission.
- The exact MC001 notation, heating/cooling branches, source locator, and equation/figure reference must be confirmed before runtime implementation.
- These candidates may support a future contract fixture only if the fixture is clearly labelled source-mapping/readiness-only and does not claim full numerical MC001 validation.

## 6. Htr(excl.*) Notation Status Correction

The repository has inconsistent excluding-ground notation:

- H0A records variants such as `HH/C;tr(excl.gf);ztc;m`, `HH/C;tr(excl.grnd flr);m`, `HH/C;tr(excl.grfl)`, and `HH/C;tr(excl.grflr)`.
- `docs/mc001-extraction/05_transmission_heat_transfer.md` records `HH/C;tr(excl.gr);ztc;m = sum HH/C;el,k;m + Htr;tb;ztc`.
- `docs/mc001-extraction/19_extraction_registry.md` records formula id `MC001_2_27_HTR_EXCLUDING_GROUND`.

Correction:

- H2C treats all of these as a notation family for transmission excluding ground / ground-floor components.
- H2C does not choose a final runtime identifier.
- H2C does not decide whether `excl.gr`, `excl.gf`, `excl.grfl`, or `excl.grnd flr` is the normalized source notation.
- Future registry work must preserve the raw source notation and add any engine alias only after direct source review.

Runtime consequence:

- `Htr(excl.*)` may be referenced in future design as contextual source, but no new helper or registry id should be created from H2C alone.

## 7. BZTU Use In Hu Path

H2C separates three concepts:

1. `bztu` input readiness.
2. element-level non-climatized-zone transmission candidate.
3. complete `Hu` readiness.

Correction:

- H1 proves only that a direct `bztu` value can be accepted as source-backed methodological input.
- H1 does not prove that the element inventory, U-value path, boundary relation, distribution handling, or component completeness is present.
- H2C therefore keeps the path from accepted `bztu` to `Hu` as `candidate_needs_review`.

Required future evidence before runtime:

- accepted `bztu` record id and source locator;
- month or source-backed applicability;
- `ztu` zone id;
- conditioned-zone relation;
- external/internal non-climatized-zone boundary relation;
- source-backed area;
- source-backed U-value or corrected U-value path;
- no distribution ambiguity;
- no ztu-to-ztu unsupported chain;
- no corrected-U / bridge double-counting risk.

## 8. Hztu Derivation Status Correction

H2C keeps the full `bztu` derivation chain blocked.

Candidate relationships from H0A:

```text
bztu;m = Hztu;e;m / Hztu;tot;m
Hztu;tot;m = sum_j(Hztc,j;ztu;m) + Hztu;e;m
Hztu;e;k;m = (1 + cztu;ve) * Htr;ue;k;m
cztu;ve = 0.5
```

Correction:

- These formulas are relevant to full `bztu` derivation, not to H2C runtime work.
- `cztu;ve = 0.5` must not be hardcoded without a reviewed registry record.
- `Hztu;e`, `Hztu;tot`, `Hztc,j;ztu`, and `Htr;ue` require their own source extraction, input graph, units, applicability, and blocker model.

Runtime consequence:

- H2C authorizes no full `bztu` derivation.
- A future direct-input `bztu` path remains the only currently executable BZTU path, and even that does not make `Hu` ready.

## 9. Multiple-Zone Distribution Status Correction

The inspected repo sources show `Fztc;ztu,k;m` in internal and solar gains:

- `docs/mc001-extraction/08_internal_and_solar_gains.md`
- MC001 2.7.2 / 2.7.3 extraction entries
- relations (2.34) and (2.37) in that extraction file

Correction:

- This is gains-side evidence.
- H2C found no source-backed transmission-side distribution rule for a `Hu` element or component.
- H2C therefore marks transmission-side multiple conditioned-zone distribution as `missing`.
- Simple averaging, proportional area allocation, or reuse of gains-side `Fztc` is forbidden unless a transmission-side source is later verified.

Runtime consequence:

- If one non-climatized zone is adjacent to multiple conditioned zones and no source-backed transmission distribution metadata exists, future `Hu` readiness must return `blocked_ambiguous_distribution`.

## 10. ZTU-To-ZTU Applicability Status Correction

H1/H2/H2A identify ambiguity when a non-climatized zone is adjacent to another non-climatized zone.

H2C source search did not find a verified MC001 path for ztu-to-ztu chains in the inspected repository materials.

Correction:

- ztu-to-ztu applicability remains `missing`.
- Future logic must keep this as `blocked_unsupported_methodology` unless direct source evidence is added.
- An accepted direct `bztu` does not override this topology blocker.

## 11. Ha Status Correction

H0A states that no reliable MC001 envelope/transmission formula using the internal engine symbol `Ha` was confirmed in the extracted sections.

Correction:

- `Ha` remains unresolved.
- `Ha` must not be mapped to lowercase `ha`.
- `Ha` must not be treated as a variant of `Hu`.
- `Ha` must not become zero unless explicit source-backed non-applicability is proven.

Runtime consequence:

- Complete `Htr` remains blocked whenever `Ha` is required but missing or unresolved.

## 12. Corrected Future Registry Candidates

H2C does not create final registry ids. The following are candidate labels only.

| candidateId | intended domain | status | notes |
| --- | --- | --- | --- |
| `MC001_CANDIDATE_FIG_2_9_DIRECT_EXTERIOR_ELEMENT` | direct exterior transmission element | `candidate_needs_review` | Existing Phase D/E path may continue under its current helper contracts; final source id still needs notation review. |
| `MC001_CANDIDATE_FIG_2_9_EXTERNAL_ZTU_ELEMENT` | external non-climatized-zone element | `candidate_needs_review` | Candidate `bztu * U * A`; not runtime-ready. |
| `MC001_CANDIDATE_FIG_2_9_INTERNAL_ZTU_ELEMENT` | internal non-climatized-zone element | `candidate_needs_review` | Candidate `(1 - bztu) * U * A`; not runtime-ready. |
| `MC001_CANDIDATE_HTR_EXCLUDING_GROUND_FAMILY` | excluding-ground transmission subtotal | `ambiguous` | Preserve raw source notation variants until direct review. |
| `MC001_CANDIDATE_BZTU_TEMPERATURE_RELATION` | `bztu` meaning/monthly scope | `candidate_needs_review` | Numbering conflicts remain. |
| `MC001_CANDIDATE_BZTU_DERIVATION_RATIO` | full `bztu` derivation | `blocked_until_registry` | Needs `Hztu;e` and `Hztu;tot`. |
| `MC001_CANDIDATE_HZTU_TOTAL` | full `bztu` derivation | `blocked_until_registry` | Needs full adjacent-zone model. |
| `MC001_CANDIDATE_HZTU_EXTERIOR` | full `bztu` derivation | `blocked_until_registry` | Needs exterior/coupling model. |
| `MC001_CANDIDATE_CZTU_VE` | derivation coefficient | `blocked_until_registry` | Do not hardcode `0.5`. |
| `MC001_CANDIDATE_HU_COMPONENT_COMPLETENESS` | readiness/component contract | `blocked_until_registry` | Needs source-backed inventory completeness rules. |
| `MC001_CANDIDATE_HA_MAPPING` | adjacent component | `missing` | No verified MC001 mapping yet. |

No candidate id above may be used as a runtime normative registry id until source locator, page/section/equation, review status, domain, units, lifecycle metadata, and provenance are recorded.

## 13. Readiness Decision After H2C

H2C does not recommend runtime implementation yet.

H2C permits the next milestone only as one of these conservative paths:

1. `PHASE_H2C_A_HU_SOURCE_LOCATOR_PASS`
   - source verification only;
   - use a working PDF text/render workflow, or another reviewed local source-locator method, to confirm exact pages, relation/equation numbers, and notation;
   - resolve or explicitly preserve the unresolved Figure 2.9, `Htr(excl.*)`, BZTU-in-`Hu`, multi-zone distribution, equation-numbering, and runtime-id questions.

2. `PHASE_H2C_A_DIRECT_PDF_SOURCE_VERIFICATION`
   - source verification only;
   - narrower variant of the source locator pass if the next work focuses only on direct PDF/page/equation verification tooling.

Later milestone after source locator verification:

3. `PHASE_H2D_HU_CONTRACT_FIXTURE_DESIGN`
   - docs-only or fixture-design-only;
   - validates inventory/status shape, not numeric runtime calculation;
   - must label Figure 2.9 formulas as candidates unless direct source verification has been completed.

H2C does not permit:

- `Hu` runtime calculation;
- complete `Htr` composition with calculated `Hu`;
- full `bztu` derivation;
- Hztu model implementation;
- distribution-factor implementation;
- fixture claims of full MC001 numerical validation.

## 14. Blockers Preserved

The following remain blocked:

- full `bztu` derivation;
- `Hztu;e`;
- `Hztu;tot`;
- `cztu;ve` runtime value;
- transmission-side distribution for multiple adjacent conditioned zones;
- ztu-to-ztu applicability;
- complete `Hu`;
- complete `Htr`;
- native `Hg` ground method;
- unresolved `Ha`;
- climate datasets;
- solar gains;
- internal gains;
- monthly heating;
- `QHnd`;
- final energy;
- primary energy;
- CO2;
- DHW final chain;
- lighting;
- cooling;
- renewables/RER;
- reference building;
- Level 2 Full Auditor readiness;
- report generation;
- certificate/CPE workflow;
- UI;
- API;
- Workers;
- DB/schema/migrations;
- deploy/config;
- product flow;
- marketplace;
- AI features.

## 15. Stop Conditions For Future Work

Stop before fixture/runtime work if any of these remain unresolved for the requested scope:

- Figure 2.9 notation cannot be source-located.
- external/internal non-climatized-zone element cases cannot be distinguished.
- `Htr(excl.*)` notation is normalized without source review.
- `bztu` is treated as `Hu` readiness by itself.
- `bve = bztu` is used outside the ventilation-from-ztu case.
- gains-side `Fztc` is reused for transmission distribution without source.
- ztu-to-ztu chains are accepted without source.
- `Ha` is mapped to lowercase `ha` or another unrelated symbol.
- missing `Hg`, `Hu`, or `Ha` is converted to zero without source-backed non-applicability.
- any product fallback or hidden estimate is promoted into MC001 validation input.

## 16. Recommended Next Milestone

Recommended next milestone:

```text
PHASE_H2C_A_HU_SOURCE_LOCATOR_PASS
```

Scope:

- source verification only;
- confirm exact source locators for Figure 2.9, `Htr(excl.*)`, BZTU use in the `Hu` path, and equation numbering;
- determine whether transmission-side multi-zone distribution has a source-backed method or remains missing;
- keep unresolved items candidate, ambiguous, missing, or blocked;
- do not implement runtime calculation;
- do not claim full MC001 numerical validation.

Alternative source-focused milestone:

```text
PHASE_H2C_A_DIRECT_PDF_SOURCE_VERIFICATION
```

Use this if the next work focuses specifically on direct PDF/page/equation verification tooling.

Later milestone after source locator verification:

```text
PHASE_H2D_HU_CONTRACT_FIXTURE_DESIGN
```

Use this only after the source-locator pass has either verified the necessary source mappings or explicitly scoped the fixture as source-status/readiness-only with unresolved formulas still blocked.
