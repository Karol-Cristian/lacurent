# Phase H2B - Hu Source Mapping Verification

## 1. Purpose

Phase H2B records the source mapping needed before a future unconditioned-zone transmission / `Hu` readiness path can be implemented or fixture-tested.

This milestone is docs-only. It does not implement runtime code, does not create tests, does not create fixtures, and does not change any existing MC001 Physics Engine behavior.

The verification question is:

> Which exact MC001 sources, relations, symbols, tables, and applicability rules are needed before the engine can safely connect accepted `bztu` values to a future `Hu` component?

The answer remains conservative. The repository contains strong candidate material for the non-climatized-zone element cases, but the current source set still has ambiguities around exact relation numbering, runtime symbol normalization, distribution handling, and component completeness.

## 2. Sources Inspected

H2B inspected these local sources:

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
- `docs/MC001_GAP_ANALYSIS.md`
- `docs/MC001_IMPLEMENTATION_MAP.md`
- `docs/MC001_FORMULA_VALIDATION_SPEC.md`

The official MC001 PDF is present in the repository. This environment did not expose a working direct PDF text extraction command through the current shell, so H2B treats direct PDF verification as mediated by existing extraction docs plus the H0A assistant-provided local text/PDF-render source checks.

Status terms used below:

- `verified_source_ready`: local extraction docs contain enough source locator and meaning to support future isolated readiness or fixture design, subject to normal review.
- `candidate_needs_review`: H0A or extraction docs identify a plausible MC001 source, but exact runtime naming, equation numbering, or applicability still needs review.
- `ambiguous`: source evidence exists but does not clearly answer the required implementation question.
- `missing`: no adequate source mapping was found in the inspected repository materials.
- `external_or_out_of_scope`: source depends on external standards or a different methodology area.
- `blocked_until_registry`: source candidate exists but must not be used until registry ids, provenance, and review status are formalized.

## 3. Mapping Area 1 - Hu / Unconditioned-Zone Transmission Contribution

The repository has two levels of `Hu` source evidence.

First, `docs/mc001-extraction/05_transmission_heat_transfer.md` and `docs/mc001-extraction/19_extraction_registry.md` identify `Hu` as the unheated-space transmission component in the total transmission relation:

```text
Htr = Hd + Hg + Hu + Ha
```

Source locator:

- MC001-2022, section 2.4.1
- relation (2.15) in the current extraction registry
- output unit: `W/K`

This supports `Hu` as a component of `Htr`, but it does not define the detailed element-level non-climatized-zone formula by itself.

Second, H0A records verified candidates from local text/PDF-render checks for MC001 Figure 2.9, footer page around 41:

```text
direct exterior:
HH/C;el;k;m = UH/C;k;m * Ael;k

external non-climatized-zone element:
HH;el;k;m = bztu;k;m * UH;k;m * Ael;k

internal non-climatized-zone element:
HH;el;k;m = (1 - bztu;k;m) * UH;tr;k;m * Ael;k
```

These candidates support a future element-level contribution, not a complete `Hu` component. A future `Hu` component still needs inventory completeness for every relevant non-climatized-zone boundary element.

Current classification:

- `Hu` as a component of `Htr`: `verified_source_ready`
- Figure 2.9 external/internal element formulas: `candidate_needs_review`
- complete `Hu` component readiness: `blocked_until_registry`

Downstream support:

- A future readiness fixture may check that a source-backed element inventory can be classified as a `Hu` candidate.
- A runtime calculation should not start until the exact Figure 2.9 notation, heating/cooling branches, and relation between element candidates and a complete `Hu` component are reviewed.

## 4. Mapping Area 2 - BZTU Use Inside The Hu Path

H0A records `bztu` as a correction factor for adjacent non-climatized zones.

Candidate monthly temperature relation:

```text
theta_ztu,k;H/C;m =
  theta_e;a;m + bztu,k;m * (theta_calc;H/C;ztc,j;m - theta_e;a;m)
```

Source locator:

- MC001 section 2.5.2.1
- footer page around 35 in H0A
- candidate equation (2.13)
- status: `candidate_needs_review`

Candidate use in transmission element cases:

```text
external non-climatized-zone element:
HH;el;k;m = bztu;k;m * UH;k;m * Ael;k

internal non-climatized-zone element:
HH;el;k;m = (1 - bztu;k;m) * UH;tr;k;m * Ael;k
```

Source locator:

- MC001 Figure 2.9
- footer page around 41 in H0A
- status: `candidate_needs_review`

Meaning:

- `bztu,k;m` appears to be monthly.
- `bztu` is dimensionless.
- `bztu` must not be treated as a normal raw auditor value.
- H1 direct `bztu` can be used only as a controlled methodological input path, not as proof of `Hu` completeness.

Open applicability questions:

- whether a source-backed annual `bztu` can ever satisfy a monthly path
- whether heating and cooling branches need separate runtime identifiers
- whether the internal non-climatized-zone case is valid for every internal relation or only specific topology
- whether direct H1 `bztu` is acceptable for fixture design before final source registry ids exist

Current classification:

- H1 direct `bztu` gate as provenance mechanism: `verified_source_ready` for input readiness only
- `bztu` transmission use in Figure 2.9: `candidate_needs_review`
- `bztu` full derivation: `blocked_until_registry`

## 5. Mapping Area 3 - Hztu;e and Hztu;tot

H0A records verified candidates for full `bztu` derivation, but these are not runtime-ready.

Candidate ratio:

```text
bztu;m = Hztu;e;m / Hztu;tot;m
```

Source locator:

- MC001 section 2.5.2.2
- footer pages around 36-37
- local text around 1840-1888 in H0A
- candidate equation (2.14)
- status: `candidate_needs_review`

Candidate total:

```text
Hztu;tot;m = sum_j(Hztc,j;ztu;m) + Hztu;e;m
```

Source locator:

- MC001 section 2.5.2.2
- candidate equation (2.15)
- status: `candidate_needs_review`

Candidate exterior coefficient:

```text
Hztu;e;k;m = (1 + cztu;ve) * Htr;ue;k;m
```

Candidate coefficient:

```text
cztu;ve = 0.5
```

Source locator:

- MC001 section 2.5.2.2
- candidate equation (2.16)
- status: `candidate_needs_review`

Implementation consequence:

- Full `bztu` derivation requires a model of the non-climatized zone, its exterior envelope, its transmission/ventilation terms, and its couplings to conditioned zones.
- `cztu;ve` must not be hardcoded until the value is registered with source/provenance and applicability.
- H2B does not authorize `Hztu;e`, `Hztu;tot`, `Hztc,j;ztu`, or `cztu;ve` implementation.

Classification:

- `Hztu;e`: `candidate_needs_review`
- `Hztu;tot`: `candidate_needs_review`
- `cztu;ve`: `blocked_until_registry`
- full `bztu` derivation: `blocked_until_registry`

## 6. Mapping Area 4 - Multiple Adjacent Conditioned Zones

H1-pre references a future `Fztc,j;ztu,k;m` distribution factor need for multiple adjacent conditioned zones. H2A also blocks multiple-zone distribution until source handling is explicit.

The inspected extraction docs found `Fztc;ztu,k;m` in `docs/mc001-extraction/08_internal_and_solar_gains.md`, but only for adjacent-zone internal and solar gains:

```text
(1 - bztu,k;m) * Fztc;ztu,k;m * fgn;max;H;ztu,k;m * Q...;dir;ztu,k;m
```

Source locator:

- MC001-2022, 2.7.2 relation (2.34)
- MC001-2022, 2.7.3 relation (2.37)
- extraction status: factor referenced, complete value source not extracted

This is not a verified transmission-side distribution rule for `Hu`.

Conclusion:

- Simple averaging is forbidden.
- A missing distribution factor must block any multi-conditioned-zone `Hu` readiness claim.
- H2B does not find a verified transmission-side distribution rule in the inspected repository materials.

Classification:

- distribution factor for gains: `candidate_needs_review`
- distribution factor for transmission / `Hu`: `ambiguous`
- runtime distribution formula: `blocked_until_registry`

## 7. Mapping Area 5 - Element Inventory And U-Value Path

Geometry and U-value source coverage is stronger than the `Hu` topology itself.

Area / envelope inventory:

- `docs/mc001-extraction/01_geometry_envelope_definitions.md`
- MC001-2022, 2.1.3, relation (2.1)
- extraction registry id: `MC001_2_1_ENVELOPE_AREA`
- requirement: explicit perimeter elements, not proxy area
- status: `verified_source_ready`

U-value path:

- `docs/mc001-extraction/02_materials_lambda_R_U.md`
- extraction registry ids include:
  - `MC001_2_3_LAMBDA_CORRECTED`
  - `PHYSICS_LAYER_R`
  - `MC001_2_7_U_VALUE`
- requirement: source-backed layer data, lambda, corrected lambda coefficient when used, and total resistance path
- status: `verified_source_ready` for isolated U-value preparation

Corrected U-value path:

- Phase D accepts corrected U-values only with source/provenance.
- Phase D blocks corrected U plus explicit psi/chi bridges in the same subtotal to avoid double-counting.
- status: `verified_source_ready` as an input contract, not as a complete `Hu` method

Boundary relation:

- `docs/mc001-extraction/01_geometry_envelope_definitions.md` states that elements toward unheated spaces need explicit boundary type.
- H0A Figure 2.9 candidates distinguish direct exterior, external non-climatized-zone, and internal non-climatized-zone cases.
- status: `candidate_needs_review` for the exact external/internal MC001 runtime categories

Classification:

- area and element inventory: `verified_source_ready`
- U-value path: `verified_source_ready`
- corrected U input contract: `verified_source_ready`
- non-climatized boundary relation categories: `candidate_needs_review`

## 8. Mapping Area 6 - Applicability And Exclusions

Applicability rules found or inferred from inspected sources:

- Non-climatized-zone elements must not be treated as direct exterior elements.
- Missing `bztu` must block, not become zero or one.
- Missing area or U-value path must block.
- Direct `Hu` and `Htr` must not be accepted as normal raw auditor input.
- `bve = bztu` appears only in a ventilation-from-non-climatized-zone context, not as a global transmission rule.
- Ground-contact `Hg` remains separate and points toward external standards / ground methodology.
- `Ha` remains unresolved and must not be mapped to lowercase `ha`.

Unsupported or still ambiguous:

- unconditioned zone adjacent to another unconditioned zone
- multiple adjacent conditioned zones without source-backed distribution handling
- annual `bztu` applied to monthly formulas
- cooling-side notation for non-climatized-zone element cases
- exact scope of internal non-climatized-zone element formula
- exact link between element candidates and complete `Hu` component completeness

Classification:

- no exterior fallback: `verified_source_ready`
- bve/bztu separation: `verified_source_ready` for design discipline
- annual vs monthly applicability: `ambiguous`
- ztu-to-ztu chains: `missing`
- complete `Hu` applicability: `blocked_until_registry`

## 9. Final Source Mapping Table

| mappingId | domain | sourceStatus | sourceDocument | pageOrSection | relationOrTable | symbols | supports | blocksIfMissing | nextAction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `H2B_HU_COMPONENT_IN_HTR` | transmission | `verified_source_ready` | `docs/mc001-extraction/05_transmission_heat_transfer.md`; `docs/mc001-extraction/19_extraction_registry.md` | MC001 2.4.1 | relation (2.15) | `Htr`, `Hd`, `Hg`, `Hu`, `Ha` | `Hu` as required transmission component | complete `Htr` | Keep component separation; do not treat missing `Hu` as zero. |
| `H2B_HTR_EXCLUDING_GROUND` | transmission | `ambiguous` | H0A; `05_transmission_heat_transfer.md` | MC001 transmission section around footer pages 40-41; extraction 2.7.1.1 | H0A candidate (2.19); extraction relation (2.27) | `HH/C;tr(excl.*);ztc;m`, `HH/C;el,k;m`, `Htr;tb;ztc` | future excluding-ground subtotal context | runtime naming and monthly composition | Normalize source notation before runtime ids. |
| `H2B_DIRECT_EXTERIOR_ELEMENT` | transmission | `verified_source_ready` | H0A; Phase D docs | MC001 Figure 2.9, footer page around 41 | Figure 2.9 case 1 | `HH/C;el;k;m`, `UH/C;k;m`, `Ael;k` | existing `Hd` exterior path | exterior transmission readiness | Keep current Phase D/E path scoped to exterior only. |
| `H2B_EXTERNAL_ZTU_ELEMENT` | transmission | `candidate_needs_review` | H0A | MC001 Figure 2.9, footer page around 41 | Figure 2.9 case 2 | `HH;el;k;m`, `bztu;k;m`, `UH;k;m`, `Ael;k` | future external non-climatized-zone element contribution | `Hu` candidate element | Verify exact notation and applicability before fixture/runtime. |
| `H2B_INTERNAL_ZTU_ELEMENT` | transmission | `candidate_needs_review` | H0A | MC001 Figure 2.9, footer page around 41 | Figure 2.9 case 3 | `HH;el;k;m`, `1 - bztu;k;m`, `UH;tr;k;m`, `Ael;k` | future internal non-climatized-zone element contribution | `Hu` candidate element | Verify topology, sign, and cooling-side notation before fixture/runtime. |
| `H2B_BZTU_TEMPERATURE_RELATION` | adjacent-zone factor | `candidate_needs_review` | H0A | MC001 2.5.2.1, footer page around 35 | candidate (2.13) | `theta_ztu,k;H/C;m`, `theta_e;a;m`, `bztu,k;m`, `theta_calc;H/C;ztc,j;m` | `bztu` meaning and monthly scope | direct `bztu` applicability | Verify exact source locator and whether annual applicability is allowed. |
| `H2B_BZTU_RATIO` | adjacent-zone factor | `candidate_needs_review` | H0A | MC001 2.5.2.2, footer pages around 36-37 | candidate (2.14) | `bztu;m`, `Hztu;e;m`, `Hztu;tot;m` | future full `bztu` derivation | calculated `bztu` | Keep derivation blocked until Hztu model is complete. |
| `H2B_HZTU_TOTAL` | adjacent-zone model | `candidate_needs_review` | H0A | MC001 2.5.2.2 | candidate (2.15) | `Hztu;tot;m`, `Hztc,j;ztu;m`, `Hztu;e;m` | future full `bztu` derivation | calculated `bztu` | Extract input graph before implementation. |
| `H2B_HZTU_EXTERIOR` | adjacent-zone model | `candidate_needs_review` | H0A | MC001 2.5.2.2 | candidate (2.16) | `Hztu;e;k;m`, `cztu;ve`, `Htr;ue;k;m` | future non-climatized-zone exterior loss | full derivation | Register `cztu;ve` and exterior-envelope requirements before use. |
| `H2B_CZTU_VE` | adjacent-zone model | `blocked_until_registry` | H0A | MC001 2.5.2.2 | candidate (2.16) | `cztu;ve = 0.5` | future Hztu exterior coefficient | full derivation | Do not hardcode; create registry row only after source review. |
| `H2B_BVE_ZTU_RELATION` | ventilation | `verified_source_ready` | `docs/mc001-extraction/06_ventilation_and_infiltration.md`; H0A | MC001 2.7.1.2 | extraction relation (2.32); H0A candidate (2.24) | `bve,k;H/C;m`, `bztu,k;m` | ventilation-from-ztu only | Hve from ztu source air | Keep separate from transmission `Hu`; do not generalize. |
| `H2B_AREA_SOURCE` | geometry | `verified_source_ready` | `docs/mc001-extraction/01_geometry_envelope_definitions.md`; registry | MC001 2.1.3 | relation (2.1) | `A`, `Aj` | element inventory and area | any element contribution | Require explicit source-backed area. |
| `H2B_U_VALUE_PATH` | envelope U-value | `verified_source_ready` | `docs/mc001-extraction/02_materials_lambda_R_U.md`; registry | MC001 2.1.4 / 2.4.1 | relations (2.3), (2.7), helper layer R | `lambda`, `Rj`, `U` | source-backed U path | element contribution | Reuse Phase D source-backed U/corrected-U contracts. |
| `H2B_BOUNDARY_RELATION` | envelope topology | `candidate_needs_review` | `01_geometry_envelope_definitions.md`; H0A Figure 2.9 | MC001 2.1.3; Figure 2.9 | boundary classification | exterior, external ztu, internal ztu | element classification | Hu inventory | Define exact runtime boundary categories before fixture. |
| `H2B_MULTIPLE_ZTC_DISTRIBUTION` | adjacent-zone distribution | `ambiguous` | `docs/mc001-extraction/08_internal_and_solar_gains.md`; H1-pre | MC001 2.7.2 / 2.7.3 for gains only | relations (2.34), (2.37) | `Fztc;ztu,k;m`, `bztu,k;m`, `fgn;max;H;ztu,k;m` | gains-side distribution evidence only | multi-zone Hu readiness | Do not apply to transmission until exact source is found. |
| `H2B_ZTU_TO_ZTU_CHAIN` | applicability | `missing` | H1-pre and H2A blockers | none verified | none | ztu adjacent to another ztu | none | unsupported topology | Keep `blocked_unsupported_methodology`. |
| `H2B_HG_GROUND` | ground | `external_or_out_of_scope` | H0A | MC001 2.3.3, footer page around 27 | section statement; ISO 13370 / C107 references | `Hg`, `Hgr;an,m`, `bm` | future ground method only | complete `Htr` | Keep ground blocked or controlled import/override. |
| `H2B_HA_MAPPING` | adjacent-space component | `missing` | H0A | no reliable source found | none confirmed | internal engine `Ha` | none | complete `Htr` | Keep unresolved and blocked. |
| `H2B_HU_REGISTRY_IDS` | normative registry | `blocked_until_registry` | H0A/H2/H2A | pending | pending | final formula ids, relation ids, review status | runtime implementation | fixture/runtime source validation | Create final ids only after source correction review. |

## 10. Runtime Readiness Decision

H2B does not recommend runtime implementation yet.

Reason:

- `Hu` as a component is verified, but detailed element-to-`Hu` mapping is still candidate-level.
- Figure 2.9 external/internal non-climatized-zone element cases need exact source locator and notation review.
- `Htr(excl.*)` notation conflicts across prior extraction layers and must be normalized before runtime ids.
- multiple adjacent conditioned-zone distribution is not verified for transmission.
- full `bztu` derivation remains blocked.
- complete `Hu` readiness still depends on inventory completeness, not only accepted `bztu`.

Recommended next milestone:

```text
PHASE_H2C_HU_SOURCE_EXTRACTION_CORRECTION
```

Scope for H2C:

- correct or tighten source locators for Figure 2.9 external/internal non-climatized-zone cases
- reconcile H0A candidate numbering with `05_transmission_heat_transfer.md` / `19_extraction_registry.md`
- decide exact notation for `Htr(excl.*)` without premature runtime ids
- confirm whether the transmission-side method has a distribution factor or whether multi-zone distribution remains unsupported
- explicitly classify whether a narrow readiness fixture can be created without runtime calculation

Do not proceed to a runtime readiness gate until H2C confirms the minimum source mapping needed for a narrow fixture or implementation.

## 11. Blockers Preserved

The following remain blocked:

- full `bztu` derivation
- `Hztu;e`
- `Hztu;tot`
- `cztu;ve` runtime registry value
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

## 12. Non-goals

Phase H2B does not implement:

- runtime code
- tests
- fixtures
- formula helpers
- orchestrator changes
- final normative registry ids
- full `bztu` derivation
- `Hztu;e`
- `Hztu;tot`
- multiple-zone distribution
- `Hu`
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
- UI
- API
- Workers
- DB/schema/migrations
- deploy/config
- product flow
- marketplace
- report generation
- certificate/CPE workflow
- AI features
