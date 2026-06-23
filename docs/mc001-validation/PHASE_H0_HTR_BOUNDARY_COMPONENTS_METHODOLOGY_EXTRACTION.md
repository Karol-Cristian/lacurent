# Phase H0 - Htr Boundary Components Methodology Extraction

## 1. Purpose

Phase H0 prepares future deblocking of MC001 transmission boundary components without implementing formulas or changing runtime behavior.

The focus is the methodology boundary for:

- `Hg`: ground transmission;
- `Hu`: transmission through unconditioned, unheated, uncooled, or non-climatized adjacent spaces;
- `Ha`: adjacent heated/conditioned-space concept, if applicable;
- `Htr`: total transmission coefficient integration.

This document is implementation-oriented and conservative. It separates current engine behavior that is verified in the repository from assistant-provided extraction candidates that still need independent MC001 source verification.

Local source note: the repository contains `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf` and extraction notes under `docs/mc001-extraction/`. The current environment did not have direct PDF text extraction tooling available. The following candidate assessment is therefore based on repository extraction notes plus the assistant extraction candidates. Items not found in the local extraction notes remain marked as `assistant-extracted / pending independent MC001 verification`.

Continuation note: `PHASE_H0A_HTR_BOUNDARY_COMPONENTS_SOURCE_VERIFICATION.md` adds a docs-only source-verification addendum using assistant-provided local MC001 text/PDF-render extraction candidates. It tightens `Hg`, `bztu`, `Htr(excl.*)`, Figure 2.9, ventilation `bve`, time-constant, and unresolved `Ha` conclusions without changing runtime behavior.

## 2. Current State After Phase G + G1

Phase C added the auditor input/provenance gate. It rejects derived values as normal raw auditor input, rejects product estimates/fallbacks, rejects raw category keys without explicit mapping evidence, and requires source/provenance for controlled `validationImports` and `expertOverrides`.

Phase D added the narrow envelope input builder. It prepares source-backed exterior direct transmission from raw envelope input, supports source-backed layer/direct/corrected U-value paths, supports source-backed bridge terms, blocks unsupported ground/unconditioned/adjacent boundaries, and prevents corrected U-values from being combined with explicit bridge terms.

Phase E added the transmission/Htr readiness gate. It classifies `Hd`, `thermalBridges`, `Hg`, `Hu`, `Ha`, and `Htr`. `Hd` may be ready from Phase D exterior direct transmission. Thermal bridges may be ready only when source-backed and not double-counted. `Hg`, `Hu`, and `Ha` remain blocked unless supplied through controlled source-backed validation import, expert override, or validated component metadata. `Htr` is computed only when all required components are complete, source-backed, unit-valid, and unblocked.

Phase F added ventilation/Hve input preparation and heat-loss readiness. It keeps missing or blocked `Htr` and `Hve` from being treated as zero and does not compute monthly heating, `QHnd`, final energy, primary energy, CO2, or certificate outputs.

Phase G added the auditor core readiness orchestrator over the Phase C/D/E/F chain. It returns consolidated input-gate, envelope, transmission/Htr, ventilation/Hve, and heat-loss readiness with diagnostics, blocked items, source/provenance trace, conservative readiness flags, and next blockers.

Phase G1 hardened the Phase G result contract and scenario matrix. It prevents blocker loss, fake zeroes, and readiness escalation across missing, blocked, unsupported, and controlled states.

## 3. Current Blocker Model

The current model is intentionally fail-closed:

- `Hd` can be ready only for supported direct exterior envelope components.
- `thermalBridges` can be ready only when explicit `psi` or `chi` values are source-backed and there is no corrected-U double-counting risk.
- `Hg` is blocked by default because the repository does not yet implement a validated source-backed ground-contact method.
- `Hu` is blocked by default because the repository does not yet implement a validated source-backed unconditioned/non-climatized-zone method.
- `Ha` is blocked by default because its exact MC001 mapping remains unresolved.
- `Htr` remains blocked or partial whenever any required component is missing, blocked, unsupported, unit-invalid, or not source-backed.

Missing or blocked components must not be converted to zero. Zero may be accepted only as an explicit, source-backed, applicability-traced value in a controlled path, not as a fallback for unknown methodology.

## 4. Assistant Extraction Candidates

| Component | Candidate MC001 symbol/formula | Candidate source area/page | Meaning | Implementation implication | Verification status |
| --- | --- | --- | --- | --- | --- |
| `Hg` | Ground heat-transfer coefficient; consumed by `Htr = Hd + Hg + Hu + Ha`; ground term also appears separately as `Hgr;an;ztc;m` in monthly transmission. | Candidate PDF pages around 29-30 / footer 27-28; local extraction notes cite MC001 2.4.1 rel. (2.15) and 2.7.1.1 Fig. 2.11. | Ground-contact transmission is separate from direct exterior transmission. | Do not implement ground-contact elements as generic `U * A` exterior elements. Keep `Hg` blocked by default or controlled import/override until exact method support exists. | Broad separation verified in local extraction notes; C107/ISO page-level ground method details are assistant-extracted / pending independent MC001 verification. |
| `bm` | Candidate: `bm = Hg;an,m / Hg`. | Candidate PDF pages around 29-30 / footer 27-28. | Monthly ground factor comparing monthly ground coefficient to annual average ground coefficient. Candidate notes say it may be below 1 in winter, above 1 in summer, and possibly negative when monthly exterior temperature exceeds internal temperature. | Do not implement until exact MC001 formula, temperature basis, sign behavior, and required inputs are verified. | Assistant-extracted / pending independent MC001 verification. Not found in local extraction notes inspected for Phase H0. |
| `bztu` | Candidate: `bztu;m = Hztu;e;m / Hztu;tot;m`; assistant candidates and local ventilation extraction notes suggest `bve,k;H/C;m` may reference or equal `bztu;k;m` only in specific airflow cases involving non-climatized zones. | Candidate PDF pages around 36-39 / footer 34-37; local extraction notes cite MC001 2.7.1.2 rel. (2.32) for a ventilation-specific non-climatized-zone correction relation. | `bztu` is a correction factor for an adjacent non-climatized zone. `bve` remains the ventilation temperature correction factor and must not be treated as globally equivalent to `bztu`. | A future `Hu` path may accept direct source-backed `bztu`, but neither the ventilation relation nor the candidate `bztu` derivation justifies implementation in Phase H0. | Assistant-extracted / pending independent MC001 verification for the exact `bve`/`bztu` relation and for `bztu = Hztu;e / Hztu;tot`; not implementation-authorizing. |
| `Hztu;e` | Candidate: heat-transfer coefficient from the non-climatized zone to exterior; candidate subformula `Hztu;e;k;m = (1 + cztu;ve) * Htr;ue;k;m`. | Candidate PDF pages around 36-39 / footer 34-37. | Describes losses from a non-climatized zone to exterior. | Needed before deriving `bztu`; must not be guessed from direct conditioned-zone envelope data. | Assistant-extracted / pending independent MC001 verification. Not found in local extraction notes inspected for Phase H0. |
| `Hztu;tot` | Candidate: `Hztu;tot;m = sum(Hztc,j;ztu;m) + Hztu;e;m`. | Candidate PDF pages around 36-39 / footer 34-37. | Total heat-transfer coupling involving the non-climatized zone. | Requires modeling both conditioned-zone-to-non-climatized-zone couplings and non-climatized-zone-to-exterior losses. | Assistant-extracted / pending independent MC001 verification. Not found in local extraction notes inspected for Phase H0. |
| Transmission excluding ground / ground-floor components | Local extraction notes contain a candidate relation equivalent to transmission excluding ground: `HH/C;tr(excl.gr);ztc;m = sum(HH/C;el,k;m) + Htr;tb;ztc`. Assistant candidates mention nearby notation such as `Htr(excl.gf)`. | Candidate PDF pages around 42-45 / footer 40-43; local extraction notes cite MC001 2.7.1.1 rel. (2.27). | MC001 appears to use notation for transmission excluding ground / ground-floor components; exact symbol normalization must be verified before implementation. | Direct exterior and non-ground element paths can feed this later, but ground remains separate. Do not create a runtime identifier or normalize `gf` / `gr` / `grfl` / `grnd flr` until source notation is verified. | Broad relation verified in local extraction notes; exact symbol spelling and normalization are pending independent MC001 source verification. |
| `Htr;tb` | Local extraction: `Htr;tb;zt = sum(Psi_tb,k * l_tb,k)`. | Candidate PDF pages around 42-45 / footer 40-43; local extraction notes cite MC001 2.7.1.1 rel. (2.28). | Thermal bridge transmission contribution. | Continue accepting only source-backed bridge values; do not invent `psi`, `chi`, or bridge lengths. | Verified in local extraction notes. |
| Exterior direct element | Candidate: `H_el;k;m = U_k;m * A_el;k` for element toward exterior. | Candidate PDF pages around 42-45 / footer 40-43; local extraction notes already support direct `Hd` paths and direct envelope transmission. | Direct exterior element contribution. | Current Phase D `Hd` path can stay valid only for direct exterior elements with source-backed U/area. | Broad path verified in local extraction notes and current Phase D behavior; exact Figure 2.9 case wording pending independent MC001 verification. |
| External non-climatized-zone element | Candidate: `H_el;k;m = bztu;k;m * U_k;m * A_el;k`. | Candidate PDF pages around 42-45 / footer 40-43. | Element between conditioned zone and an external non-climatized zone, reduced by `bztu`. | Do not treat as direct exterior `U * A`; future implementation needs source-backed `bztu` or full derivation. | Assistant-extracted / pending independent MC001 verification. Not found in local extraction notes inspected for Phase H0. |
| Internal non-climatized-zone element | Candidate: `H_el;k;m = (1 - bztu;k;m) * U_k;m * A_el;k`. | Candidate PDF pages around 42-45 / footer 40-43. | Element adjacent to an internal non-climatized zone. | Requires exact zone classification and verified sign/use of `1 - bztu`; do not implement from candidate alone. | Assistant-extracted / pending independent MC001 verification. Not found in local extraction notes inspected for Phase H0. |
| `Ha` unresolved mapping | Local extraction notes define `Ha` as transmission toward adjacent buildings/spaces where applicable and as an input to `Htr = Hd + Hg + Hu + Ha`. | Local extraction notes cite MC001 2.4.1 rel. (2.15). Candidate extraction did not confirm a detailed MC001 formula using internal symbol `Ha`. | Adjacent-space concept is present as an engine component, but exact MC001 source semantics remain incomplete. | Do not implement `Ha` yet. Keep blocked or controlled import/override only until mapped to precise MC001 terminology and applicability. | Broad Htr component verified in local extraction notes; detailed Ha methodology is unresolved / pending independent MC001 verification. |

## 5. Raw Auditor Inputs Likely Needed

### `Hg` Ground Transmission

The following inputs are likely needed, but remain pending exact MC001 / ISO 13370 method extraction:

- ground-contact element type;
- ground-contact area and exposed perimeter;
- floor, wall, basement, slab, or foundation geometry;
- insulation position, thickness, continuity, and edge details;
- soil or ground method parameters required by the selected standard method;
- internal, external, annual, and monthly temperature relationship used by the ground method;
- ISO 13370-dependent parameters if MC001 delegates to ISO 13370;
- explicit source/provenance when using imported `Hg`;
- controlled `validationImport` or `expertOverride` metadata if `Hg` is not calculated natively.

Phase H0 recommendation: do not accept ground-contact envelope elements through the direct exterior `U * A` path.

### `Hu` / Non-Climatized Zones

The following inputs are likely needed for a future `Hu` path:

- adjacent zone classification;
- internal vs external non-climatized zone type;
- element areas and source-backed U-values or corrected U-values;
- relation between the evaluated thermal zone and the non-climatized zone;
- non-climatized-zone exterior envelope elements;
- coupling elements between conditioned zones and the non-climatized zone;
- direct `bztu` value if supplied as a controlled source-backed import;
- source-backed `cztu;ve` value if the full derivation is implemented;
- monthly vs annual handling policy;
- source/provenance for every direct factor or derived intermediate.

`bve` must remain distinct from `bztu` in design discussions. `bve` is the ventilation temperature correction factor. `bztu` is the correction factor for adjacent non-climatized zones. Assistant candidates suggest `bve,k;H/C;m` may reference or equal `bztu;m` only in specific airflow cases involving non-climatized zones; this remains pending independent MC001 verification and must not be used to justify Phase H0 implementation.

Phase H0 recommendation: do not implement unconditioned-zone transmission as direct exterior `U * A`. The safest first implementation is a direct `bztu` input gate only after source verification confirms the formula and direct-input rules.

### `Ha` Adjacent-Space Concept

`Ha` remains unresolved. Before implementation, source review must identify:

- whether `Ha` corresponds to adjacent heated/conditioned spaces;
- whether MC001 uses a different symbol or name for this concept;
- whether the case is already covered by direct, ground, or non-climatized-zone transmission categories;
- whether `Ha` can be non-zero, zero by explicit applicability, or blocked by missing method.

Phase H0 recommendation: do not implement `Ha` beyond controlled import/override or explicit applicability metadata until the MC001 mapping is verified.

## 6. Proposed Future Implementation Options

### Option A - Keep `Hg`, `Hu`, and `Ha` blocked by default

- Advantages: safest behavior; preserves Phase E/G1 invariant that missing or unsupported components are not zero; avoids invented methodology.
- Risks: `Htr` stays blocked for most full-building auditor inputs unless controlled values are supplied.
- Required source extraction: exact applicability rules for when a component may be explicitly not applicable vs missing.
- Validation fixture needed: controlled import/override fixture proving blocked defaults and source-backed explicit component acceptance.

### Option B - Implement `Hu` first with source-backed direct `bztu` input

- Advantages: narrow; can deblock a common non-climatized-zone case without deriving the full adjacent-zone heat balance.
- Risks: direct `bztu` may be misused unless provenance, monthly/annual scope, and applicability are strict.
- Required source extraction: exact MC001 formula/case using `bztu * U * A`, allowed direct-input semantics, zone classification, and monthly handling.
- Validation fixture needed: positive direct `bztu` case, missing provenance rejection, raw category rejection, and Htr partial/complete gating.

### Option C - Implement full `bztu` derivation later

- Advantages: closer to methodology completeness for non-climatized zones.
- Risks: requires a more complex zone-coupling graph; high risk of double-counting or wrong boundary classification if implemented too early.
- Required source extraction: `Hztu;e`, `Hztu;tot`, `Hztc,j;ztu`, `cztu;ve`, external/internal non-climatized-zone cases, monthly handling, and examples.
- Validation fixture needed: multi-zone fixture with conditioned-to-non-climatized and non-climatized-to-exterior elements plus blocker coverage for incomplete graphs.

### Option D - Keep `Hg` as controlled import until ISO 13370 support is implemented

- Advantages: avoids representing ground physics as plain `U * A`; aligns with current blocker model.
- Risks: native ground calculation remains unavailable; auditors must provide reviewed/calculated `Hg` with trace.
- Required source extraction: MC001 ground references, C107/5-2005, SR EN ISO 13370:2017, SR EN 12831:2017 applicability, and the exact MC001 bridge between those standards and `Hg`/`Hgr`.
- Validation fixture needed: ground-contact blocked fixture plus controlled `Hg` import fixture with source/reference/trace/unit requirements.

### Option E - Do not implement `Ha` until mapping is verified

- Advantages: avoids inventing an adjacent-space category that may not match MC001 terminology.
- Risks: `Htr` may remain blocked when adjacent-space data exists but cannot be mapped.
- Required source extraction: exact MC001 source section, symbol/name mapping, applicability, and relationship to direct, ground, and non-climatized-zone paths.
- Validation fixture needed: unresolved-`Ha` blocker fixture, then explicit fixture once mapping is verified.

## 7. Recommended Next Phase

Recommended next implementation phase:

`PHASE_H1_UNCONDITIONED_ZONE_BZTU_DIRECT_INPUT_GATE`

This is the safest next step only if independent source verification confirms:

- the `bztu` formulas and source sections;
- whether a direct `bztu` value may be accepted as source-backed auditor input;
- whether the direct input is monthly, annual, heating/cooling-specific, or context-specific;
- how external and internal non-climatized-zone cases map into `Hu`;
- how to prevent double-counting with `Hd`, `Hg`, and thermal bridges.

If that verification is not available, the safer alternative is:

`PHASE_H1_GROUND_TRANSMISSION_CONTROLLED_IMPORT_GATE`

That alternative would keep ground methodology unimplemented while adding a narrow controlled-value path for `Hg` with strict Phase C provenance and no direct `U * A` fallback.

## 8. Non-Goals

Phase H0 does not implement:

- `Hg`;
- `Hu`;
- `Ha`;
- invented MC001 formulas;
- climate or monthly heating;
- `QHnd`;
- final energy;
- primary energy;
- CO2;
- CPE/report/certificate workflow;
- UI, API, DB, Worker, deploy, or product integration;
- product registry implementation;
- marketplace scope;
- full Level 2 auditor readiness;
- runtime behavior changes;
- existing helper/formula changes;
- Phase C/D/E/F/G/G1 behavior changes.

## 9. Open Questions

- What is the exact MC001 source section for `Ha`, and does MC001 use `Ha` directly or another symbol/name?
- Should `Hu` first be represented as direct `bztu * U * A`, or should implementation wait for full `bztu` derivation?
- Is monthly handling required immediately for `bztu`, `Hg`, and transmission excluding ground / ground-floor components, or can a first readiness gate accept explicitly scoped annual values?
- How should direct `bztu` provenance be stored: `validationImport`, `expertOverride`, validated metadata, or a future normative registry row?
- How should the engine prevent double-counting between `Hd`, `Hu`, `Hg`, `Ha`, and thermal bridges when an element touches more than one boundary model?
- How should transmission excluding ground / ground-floor components and ground `Hgr`/`Hg` be combined in later monthly energy calculations without collapsing the separate ground term into generic `Htr * deltaTheta`?
- Which MC001 examples can validate ground-contact and non-climatized-zone components without relying on visually ambiguous table rows?
- Which zero values are true source-backed non-applicability values, and which are unresolved missing components that must remain blocked?
