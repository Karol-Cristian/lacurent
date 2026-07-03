# PHASE_R1_MC001_CHAPTER_2_HTR_TRANSMISSION_SOURCE_PACK_CANDIDATES

## Scope

This document is a docs-only candidate extraction report for MC001 Chapter 2 transmission-loss methodology sources.

R1 answers only:

Can the Chapter 2 Htr / transmission / envelope formulas be organized into candidate normative source packs for later human verification and registry implementation?

R1 does not add runtime code, registry data, calculators, tests, fixtures, database behavior, API behavior, UI behavior, worker behavior, product behavior, report behavior, certificate behavior, or downstream readiness.

## Source Of Truth

- Repository base: `origin/main @ 573d594071441a011579f59dced27ac099fb41cb`
- Previous milestone: `PHASE_R0_MC001_NORMATIVE_REGISTRY_SCAFFOLD_WITH_BZTU_PILOT`
- Local context reviewed for this extraction report:
  - `docs/mc001-extraction/03_thermal_bridges.md`
  - `docs/mc001-extraction/04_minimum_envelope_requirements.md`
  - `docs/mc001-extraction/05_transmission_heat_transfer.md`

This report is not itself a verified registry source pack. It is a planning artifact for later source-pack verification.

## Relationship To R0

R0 introduced the generic MC001 normative registry scaffold and the first bztu pilot source pack covering relations `2.21`, `2.22`, `2.23`, and `2.24`.

R1 does not modify R0 and does not duplicate the bztu source pack. Any later bztu correction or expansion must be handled by a separate verification milestone that explicitly reviews the R0 source pack and the official MC001 source.

R1 uses R0 only as a boundary marker:

- relations `2.21` through `2.24` are already represented by the bztu pilot;
- R1 candidates should focus on the surrounding Chapter 2 transmission spine, monthly transfer formulas, global transmission coefficients, and bridge-related source-pack candidates;
- candidate gaps connected to bztu defaults remain unresolved search targets, not implemented values.

## Verification Status Policy

Every candidate in this report uses:

```yaml
verificationStatus: "extracted_pending_human_review"
```

Policy:

- Candidate extraction is allowed as a structured planning step.
- Candidate formulas, constants, coefficients, tables, applicability rules, and source locators must be independently checked against the official MC001 source before implementation.
- Candidate entries must not be treated as callable registry entries.
- Candidate entries must not be used by runtime code.
- Candidate entries must not be used as hidden fallback values.
- Candidate entries must not be promoted to implementation-ready data by Codex alone.
- Missing values must be reported as missing normative data, not guessed.

## Candidate Source Packs

### Candidate 1: Htr Transmission Spine

```yaml
candidateSourcePackCode: "MC001_R1_CANDIDATE_HTR_TRANSMISSION_SPINE"
candidateSourcePackType: "chapter_2_transmission_formula_candidate_pack"
verificationStatus: "extracted_pending_human_review"
implementationIntent: "future_source_pack_after_human_verification"
sourceScope:
  methodologyVersion: "MC001-2022"
  chapter: "Capitolul 2"
  sectionCandidates:
    - "2.4.1"
  relationCandidates:
    - "2.12"
    - "2.13"
    - "2.14"
    - "2.15"
```

Candidate entries:

| candidateEntryCode | candidate kind | relation | candidate meaning | candidate unit | source locator status |
| --- | --- | --- | --- | --- | --- |
| `MC001_R1_CANDIDATE_FORMULA_2_12_HD_CORRECTED_U` | formula | `2.12` | Direct transmission coefficient `Hd` using corrected thermal transmittance `U'` and area. | `W/K` | page and exact surrounding text to verify |
| `MC001_R1_CANDIDATE_FORMULA_2_13_PSI_LINEAR_BRIDGE` | formula | `2.13` | Linear bridge coefficient `psi` candidate relation. | `W/(mK)` | page and exact input definitions to verify |
| `MC001_R1_CANDIDATE_FORMULA_2_14_TRANSMISSION_HEAT_FLOW` | formula | `2.14` | Transmission heat flow `phi_tr` from transmission coefficient and temperature difference. | `W` | page, symbols, sign convention to verify |
| `MC001_R1_CANDIDATE_FORMULA_2_15_HTR_TOTAL_COMPONENTS` | formula | `2.15` | Total Htr decomposition candidate: `Htr = Hd + Hg + Hu + Ha`. | `W/K` | page, component definitions, applicability to verify |

Notes:

- Relation `2.11` appears in local extraction context as the plain-U direct transmission formula with explicit linear and point bridges. It should be considered a related upstream candidate, but the requested R1 spine focuses on `2.12` through `2.15`.
- The relation `2.15` candidate must not be wired into runtime H12 without a later verified source pack and explicit implementation milestone.
- `Hd`, `Hg`, `Hu`, and `Ha` must remain distinct candidate concepts. Ground and unheated-space paths must not be silently collapsed into direct exterior transmission.

Verification tasks:

- Verify exact official relation text for `2.12`, including whether corrected `U'` includes all relevant thermal bridge effects.
- Verify exact official relation text for `2.13`, including all symbols, numerator terms, denominator terms, and units.
- Verify exact official relation text for `2.14`, including `phi_tr` symbol spelling, temperature symbols, and sign convention.
- Verify exact official relation text for `2.15`, including whether all four components are mandatory terms or applicability-dependent terms.
- Verify source locator page numbers and relation captions.
- Verify whether relation `2.11` must be added to the same later source pack or separated into a bridge/direct-transmission pack.

### Candidate 2: Monthly Transmission Transfer

```yaml
candidateSourcePackCode: "MC001_R1_CANDIDATE_MONTHLY_TRANSMISSION_TRANSFER"
candidateSourcePackType: "chapter_2_monthly_transmission_transfer_candidate_pack"
verificationStatus: "extracted_pending_human_review"
implementationIntent: "future_source_pack_after_human_verification"
sourceScope:
  methodologyVersion: "MC001-2022"
  chapter: "Capitolul 2"
  sectionCandidates:
    - "2.7.1.1"
  figureCandidates:
    - "Figura 2.11"
```

Candidate entries:

| candidateEntryCode | candidate kind | source candidate | candidate meaning | candidate unit | source locator status |
| --- | --- | --- | --- | --- | --- |
| `MC001_R1_CANDIDATE_FIGURE_2_11_MONTHLY_HEATING_TRANSMISSION_TRANSFER` | figure formula | `2.7.1.1 / Figura 2.11` | Monthly heating transmission transfer through non-ground and ground paths. | expected `kWh` | exact formula, page, and sign convention to verify |
| `MC001_R1_CANDIDATE_FIGURE_2_11_MONTHLY_COOLING_TRANSMISSION_TRANSFER` | figure formula | `2.7.1.1 / Figura 2.11` | Monthly cooling transmission transfer through non-ground and ground paths. | expected `kWh` | exact formula, page, and sign convention to verify |
| `MC001_R1_CANDIDATE_RULE_MONTHLY_TRANSMISSION_SIGN_CONVENTION` | applicability rule | `2.7.1.1` | Candidate rule for heating/cooling transfer sign and temperature-difference direction. | not applicable | exact text to verify |
| `MC001_R1_CANDIDATE_RULE_MONTHLY_TRANSMISSION_UNITS` | applicability rule | `2.7.1.1` | Candidate unit conversion rule for W/K, temperature difference, monthly duration, and energy unit. | not applicable | exact factor and unit text to verify |

Notes:

- This is a monthly heat-transfer candidate pack, not a `QHnd` implementation.
- The local extraction context indicates separate handling of the ground term and non-ground transmission coefficient. That split must be verified before implementation.
- No monthly heating, cooling, final energy, primary energy, CO2, report, or certificate behavior is introduced by R1.

Verification tasks:

- Verify the exact figure and formula numbers around monthly transmission transfer in section `2.7.1.1`.
- Verify whether heating and cooling formulas are both present, and whether they are numbered or figure-only formulas.
- Verify temperature symbols, monthly duration symbol, conversion factor, and output unit.
- Verify whether the ground term uses annual exterior temperature, monthly exterior temperature, or another source.
- Verify whether the formulas are valid for all zone types or require zone-specific applicability rules.

### Candidate 3: Global Transmission Excluding Ground

```yaml
candidateSourcePackCode: "MC001_R1_CANDIDATE_GLOBAL_TRANSMISSION_EXCLUDING_GROUND"
candidateSourcePackType: "chapter_2_htr_excluding_ground_candidate_pack"
verificationStatus: "extracted_pending_human_review"
implementationIntent: "future_source_pack_after_human_verification"
sourceScope:
  methodologyVersion: "MC001-2022"
  chapter: "Capitolul 2"
  sectionCandidates:
    - "2.7.1.1"
  relationCandidates:
    - "2.27"
```

Candidate entries:

| candidateEntryCode | candidate kind | relation | candidate meaning | candidate unit | source locator status |
| --- | --- | --- | --- | --- | --- |
| `MC001_R1_CANDIDATE_FORMULA_2_27_TRANSMISSION_EXCLUDING_GROUND` | formula | `2.27` | Global transmission coefficient for elements not in contact with ground plus thermal bridge contribution. | `W/K` | page, formula text, and symbol definitions to verify |
| `MC001_R1_CANDIDATE_CONCEPT_ELEMENTS_NOT_IN_CONTACT_WITH_GROUND` | concept | `2.27` context | Candidate classification for transmission elements excluding ground-contact elements. | not applicable | exact scope to verify |
| `MC001_R1_CANDIDATE_REFERENCE_THERMAL_BRIDGE_CONTRIBUTION_TO_2_27` | cross-reference | `2.27` to `2.28` | Candidate reference from non-ground global coefficient to thermal bridge coefficient. | `W/K` | exact cross-reference to verify |

Notes:

- This pack is a candidate for Htr input composition methodology, not a runtime input-composition milestone.
- Relation `2.27` must be checked for monthly heating/cooling superscripts, zone symbols, and whether it differs by heating versus cooling mode.
- Ground-contact contributions must remain separate from relation `2.27` unless the official source explicitly includes a ground-related term.

Verification tasks:

- Verify exact relation `2.27` formula text.
- Verify symbol definitions for element coefficient terms and the thermal bridge contribution.
- Verify whether each element coefficient is monthly, seasonal, or static in the official text.
- Verify source locator page and nearby figure/table references.
- Verify applicability conditions for excluding ground-contact elements.

### Candidate 4: Thermal Bridge Global Coefficient

```yaml
candidateSourcePackCode: "MC001_R1_CANDIDATE_THERMAL_BRIDGE_GLOBAL_COEFFICIENT"
candidateSourcePackType: "chapter_2_thermal_bridge_global_coefficient_candidate_pack"
verificationStatus: "extracted_pending_human_review"
implementationIntent: "future_source_pack_after_human_verification"
sourceScope:
  methodologyVersion: "MC001-2022"
  chapter: "Capitolul 2"
  sectionCandidates:
    - "2.7.1.1"
  relationCandidates:
    - "2.28"
```

Candidate entries:

| candidateEntryCode | candidate kind | relation | candidate meaning | candidate unit | source locator status |
| --- | --- | --- | --- | --- | --- |
| `MC001_R1_CANDIDATE_FORMULA_2_28_HTR_THERMAL_BRIDGES` | formula | `2.28` | Global thermal bridge coefficient `Htr,tb` from linear bridge terms. | `W/K` | exact formula, page, and symbol definitions to verify |
| `MC001_R1_CANDIDATE_CONCEPT_LINEAR_THERMAL_BRIDGE_PSI` | concept | `2.28` context | Candidate linear bridge coefficient `psi`. | `W/(mK)` | source and sign semantics to verify |
| `MC001_R1_CANDIDATE_CONCEPT_LINEAR_THERMAL_BRIDGE_LENGTH` | concept | `2.28` context | Candidate bridge length `l`. | `m` | geometry convention to verify |
| `MC001_R1_CANDIDATE_OPEN_QUESTION_POINT_BRIDGES_CHI` | unresolved scope question | `2.28` context | Verify whether point bridges `chi` are included in this relation, elsewhere, or only in the direct-transmission spine. | `W/K` if applicable | exact official treatment to verify |

Notes:

- Local extraction context identifies point bridge coefficient `chi` in the broader thermal-bridge extraction. R1 must not assume `chi` belongs in relation `2.28` until verified.
- Candidate `psi` values are not default values. No bridge catalog/default values are introduced here.
- Any later bridge calculator must be a separate milestone after verified source-pack implementation.

Verification tasks:

- Verify exact relation `2.28` formula text.
- Verify whether relation `2.28` includes only `psi * l` terms.
- Verify whether point bridge terms appear in relation `2.11`, relation `2.28`, another relation, a table, or an applicability note.
- Verify bridge units, sign semantics, and whether negative values are possible in detailed calculations.
- Verify whether catalog/default bridge values exist in MC001 or an annex and identify their exact source locators.

### Candidate 5: Existing BZTU R0 Reference

```yaml
candidateSourcePackCode: "MC001_R1_REFERENCE_EXISTING_R0_BZTU_PACK"
candidateSourcePackType: "existing_registry_reference_not_new_candidate_pack"
verificationStatus: "extracted_pending_human_review"
implementationIntent: "do_not_implement_in_r1"
sourceScope:
  methodologyVersion: "MC001-2022"
  chapter: "Capitolul 2"
  sectionCandidates:
    - "2.6.2"
    - "2.6.2.2"
  relationCandidates:
    - "2.21"
    - "2.22"
    - "2.23"
    - "2.24"
```

Notes:

- R0 already represents relations `2.21` through `2.24`.
- R1 must not duplicate those entries.
- R1 may record that bztu source-pack expansion or correction is a later verification task.
- R1 must not add bztu default values.

Verification tasks:

- If later work discovers a mismatch in R0, open a dedicated correction milestone.
- Verify whether page `109` contains bztu default-value candidates and whether there is a numeric table or only a textual reference.
- Keep bztu defaults blocked until explicit source verification provides exact numeric rows, columns, units, notes, and applicability.

## Unresolved Later Search Targets

These are search targets only. They are not implemented in R1.

| target code | search target | reason | current R1 status |
| --- | --- | --- | --- |
| `MC001_R1_SEARCH_BZTU_DEFAULTS_PAGE_109` | bztu default values mentioned around page `109` | R0 records a default-value candidate without numeric defaults. | missing verified numeric source |
| `MC001_R1_SEARCH_GROUND_CONTACT_HG` | ground-contact / `Hg` formulas and coefficients | Htr total needs ground path separation. | source pack not identified |
| `MC001_R1_SEARCH_THERMAL_BRIDGE_DEFAULTS` | thermal bridge default/catalog values | bridge coefficients must be sourced, not invented. | source pack not identified |
| `MC001_R1_SEARCH_SOLAR_GLAZING_SHADING_TABLES` | solar, glazing, and shading tables for later gains | later gains/QHnd work will need verified source packs. | out of R1 scope |
| `MC001_R1_SEARCH_U_VALUE_REQUIREMENTS` | U-value requirement/reference tables | requirements may support validation, but are not calculation coefficients unless proven. | classify as requirements only |

Important handling rule:

- U-value requirement/reference tables must be clearly marked as requirements or validation thresholds, not calculation coefficients, unless a later verified source explicitly says otherwise.

## Proposed Next Milestones

| proposed milestone | purpose | key guardrail |
| --- | --- | --- |
| `R1V` | human verification pass for R1 candidate source packs | produce verified structured source packs only after official-source review |
| `R2` | registry implementation for verified Chapter 2 Htr source packs | no calculator; registry data only |
| `C1` | contract/readiness design for using verified source packs | no formula execution unless explicitly scoped |
| `C2` | guarded implementation of one verified transmission formula path | only after R2/C1 and explicit implementation scope |
| later `Hg` milestones | ground-contact formula extraction, verification, registry, then calculation | do not approximate ground losses as direct exterior transfer |
| later bridge milestones | thermal bridge catalog/default extraction and guarded bridge calculation | no invented `psi` or `chi` values |
| later solar/glazing/shading milestones | gains-related source-pack extraction | no gains/QHnd behavior in R1 |
| later ventilation milestones | ventilation/infiltration source-pack extraction and calculation gates | separate from transmission |
| later QHnd milestones | monthly heating/cooling demand source-pack and calculation gates | requires verified transmission, ventilation, gains, and setpoint/time inputs |

## Non-Goals

R1 does not:

- add runtime code;
- add registry implementation;
- add registry source packs to `src`;
- modify R0;
- modify H3-H12 or H12A;
- calculate bztu;
- calculate Htr;
- calculate Htr monthly transfer;
- calculate `Hd`, `Hg`, `Hu`, `Ha`;
- calculate thermal bridge terms;
- add numeric defaults;
- add fallback values;
- add PDF files;
- parse PDFs at runtime;
- add tests or fixtures;
- modify DB/API/UI/Worker/schema/deploy/product/report/CPE behavior;
- add QHnd, monthly heating, ventilation, gains, systems, final energy, primary energy, CO2, certificate, report, or downstream readiness behavior.

## Validation Checklist

Before R1 is considered ready:

- [ ] Changed files are exactly `docs/mc001-validation/PHASE_R1_MC001_CHAPTER_2_HTR_TRANSMISSION_SOURCE_PACK_CANDIDATES.md`.
- [ ] No `src/**` file changed.
- [ ] No `package.json` file changed.
- [ ] No tests or fixtures changed.
- [ ] No orchestrator file changed.
- [ ] No DB/API/UI/Worker/schema/deploy/product/report/CPE file changed.
- [ ] No config file changed.
- [ ] No registry implementation added.
- [ ] No calculator added.
- [ ] No runtime behavior added.
- [ ] Every R1 candidate uses `verificationStatus: "extracted_pending_human_review"`.
- [ ] No R1 candidate uses implementation-ready status language.
- [ ] No bztu numeric default values introduced.
- [ ] No thermal bridge numeric defaults introduced.
- [ ] No hidden fallback values introduced.
- [ ] No PDF copied into the repository.
- [ ] R0 bztu relations `2.21` through `2.24` are referenced only as existing R0 scope.
- [ ] Unresolved targets remain unresolved and are not implemented.
- [ ] `git diff --check` passes.
- [ ] `git status --short --branch` shows only this docs file.
