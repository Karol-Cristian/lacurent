# Phase H0A - Htr Boundary Components Source Verification

## 1. Purpose

Phase H0A is a docs-only addendum to Phase H0. It records assistant-provided source verification candidates from the local MC001 text extraction and visual PDF render checks, then tightens the implementation conclusions for future `Hg`, `Hu`, `Ha`, and `Htr` deblocking.

This addendum does not implement formulas, does not change runtime behavior, and does not authorize H1 implementation by itself. It is a source-verification checkpoint for deciding the next narrow Physics Engine milestone.

## 2. Source Basis

The source basis for this addendum is:

- local MC001 PDF text extraction candidates from `mc001.txt`;
- visual PDF render checks where noted by the extraction pass;
- candidate MC001 footer pages and equation/figure numbers listed below;
- existing repository extraction notes under `docs/mc001-extraction/`.

The source references are still treated conservatively. Exact runtime names, symbol normalization, cooling-side notation, and raw auditor input contracts must be reviewed again before code is written.

In this document, `verified candidate` means the assistant-provided local text/PDF-render extraction pass identified the listed source area, equation, or figure. It does not mean the item is implementation-ready normative registry content. Any runtime implementation still requires an explicit source review, input contract, provenance model, and fixture boundary.

Candidate source areas:

- MC001 2.3.3, footer page around 27, local text lines around 1398-1423;
- MC001 2.5.2.1, footer page around 35;
- MC001 2.5.2.2, footer pages around 36-37, local text around 1840-1888;
- MC001 transmission section, footer pages around 40-41, local text around 2048-2125;
- MC001 Figure 2.9, footer page around 41;
- MC001 ventilation section, footer page around 42, local text around 2150-2199;
- MC001 time-constant section, footer page around 58, local text around 2948-2968.

## 3. Verified Candidate Table

| Topic | Source area | Formula / statement | MC001 equation or figure | Verification status | Implementation consequence |
| --- | --- | --- | --- | --- | --- |
| `Hg` | MC001 2.3.3, footer page around 27, local text around 1398-1423 | For envelope elements in contact with ground, MC001 recommends C107/5-2005, SR EN ISO 13370:2017, and SR EN 12831:2017. MC001 states `Hg` can be calculated according to ISO 13370. If unconditioned spaces exist, `Hg` is calculated as if those spaces did not exist. | Section statement, no runtime formula extracted here | Verified candidate from local text extraction | Do not implement ground as simple `U * A`. Keep `Hg` blocked or controlled import / expert override until ISO 13370 / C107-backed method support is implemented. |
| `bm` | MC001 2.3.3, footer page around 27, local text around 1398-1423 | `bm = Hg;an,m / Hg`. ISO 13370 provides monthly ground transmission coefficients `Hg;an,m`, considering ground thermal inertia, and monthly coefficients may be defined through correction factors `bm`. | Candidate equation (2.9) | Verified candidate from local text extraction | `bm` is not implemented now. Future ground work must distinguish annual average `Hg`, monthly `Hg;an,m`, and the correction factor `bm`. |
| `bztu` | MC001 2.5.2.1, footer page around 35 | `theta_ztu,k;H/C;m = theta_e;a;m + bztu,k;m * (theta_calc;H/C;ztc,j;m - theta_e;a;m)`. | Candidate equation (2.13) | Verified candidate from assistant-provided local source check | `bztu` controls the thermal relation between a conditioned zone, a non-climatized adjacent zone, and outside. It is not merely a product coefficient. Direct `bztu` input must be source-backed/provenance-backed. |
| `Hztu;tot` | MC001 2.5.2.2, footer pages around 36-37, local text around 1840-1888 | `Hztu;tot;m = sum_j(Hztc,j;ztu;m) + Hztu;e;m`. | Candidate equation (2.15) | Verified candidate from local text extraction / visual render context | Full `bztu` derivation requires modelling the adjacent non-climatized zone, its exterior losses, and conditioned-zone couplings. Do not implement as a single-element shortcut. |
| `Hztu;e` | MC001 2.5.2.2, footer pages around 36-37, visual render confirms equation around footer page 37 | `Hztu;e;k;m = (1 + cztu;ve) * Htr;ue;k;m`; candidate default `cztu;ve = 0.5`. | Candidate equation (2.16) | Verified candidate from local text/render extraction | Full derivation requires source-backed treatment of the non-climatized-zone exterior envelope and ventilation contribution. `cztu;ve` must not be hardcoded without registry/source trace. |
| `bztu` ratio | MC001 2.5.2.2, footer pages around 36-37, local text around 1840-1888 | `bztu;m = Hztu;e;m / Hztu;tot;m`. | Candidate equation (2.14) | Verified candidate from local text extraction | Future full derivation needs both numerator and denominator component models. A safe first H1 may accept only direct source-backed `bztu`, not derive it. |
| `Htr(excl.*)` | MC001 transmission section, footer pages around 40-41, local text around 2048-2125 | `HH/C;tr(excl.gf);ztc;m = sum_k(HH/C;el,k;m) + Htr;tb;ztc`. Related notation appears as `HH/C;tr(excl.grnd flr);m`, `HH/C;tr(excl.gf);ztc;m`, and later `HH/C;tr(excl.grfl)` / `HH/C;tr(excl.grflr)`. | Candidate equation (2.19) | Verified candidate from local text extraction / visual render | Treat as "transmission excluding ground / ground-floor components" until exact runtime naming is decided. Do not aggressively normalize notation before implementation. |
| Figure 2.9 direct exterior element | MC001 Figure 2.9, footer page around 41 | Case 1: `HH/C;el;k;m = UH/C;k;m * Ael;k`. | Figure 2.9 | Verified candidate from visual render | Current Phase D/E direct exterior `U * A` path is conceptually valid only for exterior elements with source-backed U and area. |
| Figure 2.9 external non-climatized-zone element | MC001 Figure 2.9, footer page around 41 | Case 2: `HH;el;k;m = bztu;k;m * UH;k;m * Ael;k`. | Figure 2.9 | Verified candidate from visual render | External non-climatized-zone elements require `bztu`-aware handling. They must not be treated as direct exterior transmission. |
| Figure 2.9 internal non-climatized-zone element | MC001 Figure 2.9, footer page around 41 | Case 3: `HH;el;k;m = (1 - bztu;k;m) * UH;tr;k;m * Ael;k`. | Figure 2.9 | Verified candidate from visual render | Internal non-climatized-zone elements require exact zone classification and source-backed `bztu`. Preserve source notation and verify cooling-side notation before implementation. |
| `Htr;tb` | MC001 formula after Figure 2.9, footer page around 41, local text around 2109-2125 | `Htr;tb;zt = sum_k(ltb;k * Psi_tb;k)`. | Candidate equation (2.20) | Verified candidate from local text extraction | Current source-backed bridge handling remains conceptually aligned. Keep preventing double-counting where corrected U-values already include bridge effects. |
| `Hve` | MC001 ventilation section, footer page around 42, local text around 2150-2199 | `HH/C;ve;ztc;m = rho_a * ca * sum_k(bve,k;H/C;m * qV,k;H/C;m * fve,dyn;k;m)`. | Candidate equation (2.22) | Verified candidate from local text extraction | Existing Phase F Hve path stays separate from transmission. Do not mix ventilation and transmission component semantics. |
| `bve` | MC001 ventilation section, footer page around 42, local text around 2150-2199 | `bve,k;H/C;m = (theta_calc;H/C;m - theta_sup,k;H/C;m) / (theta_calc;H/C;m - theta_e;a;m)`. | Candidate equation (2.23) | Verified candidate from local text extraction | `bve` is a ventilation temperature correction factor. It is not globally equivalent to `bztu`. |
| `bve` non-climatized-zone relation to `bztu` | MC001 ventilation section, footer page around 42, local text around 2150-2199 | `bve,k;H/C;m = bztu;m` for ventilation/infiltration airflow from an external or internal non-climatized zone. | Candidate equation (2.24) | Verified candidate from local text extraction | This is a specific ventilation-from-ztu case only. Do not use it to mix ventilation and transmission logic generally. |
| Time constant denominator | MC001 time-constant section, footer page around 58, local text around 2948-2968 | `tau_H;ztc;m = Cm;eff;ztc * 3600 / (HH;tr(excl.grfl);ztc;m + HH;gr;adj;ztc + HH;ve;ztc;m)` and `tau_C;ztc;m = Cm;eff;ztc * 3600 / (HC;tr(excl.grfl);ztc;m + HC;gr;adj;ztc + HC;ve;ztc;m)`. | Candidate equations (2.49), (2.50) | Verified candidate from local text extraction | MC001 later combines excluding-ground transmission, adjusted ground transmission, and ventilation. Do not implement monthly/time-constant behavior now. Preserve separate components for later monthly methodology. |
| Unresolved `Ha` | Source search across the extracted sections | No reliable MC001 envelope/transmission formula using internal engine symbol `Ha` was confirmed. Lowercase `ha` appears later in other contexts, such as heat transfer by convection/radiation for pipe/system losses. | None confirmed | Unresolved / blocked | Do not implement `Ha`. Do not map internal `Ha` to lowercase `ha`. Treat `Ha` as an internal compatibility placeholder until MC001 terminology is verified. |

## 4. Implementation Readiness Matrix

| Topic | Classification | Reason | Allowed next action |
| --- | --- | --- | --- |
| Direct exterior elements | Already supported by Phase D/E path | Figure 2.9 direct exterior `U * A` aligns with the existing source-backed exterior element path. | Keep current path; do not broaden it to ground or non-climatized-zone elements. |
| Thermal bridges | Already supported if source-backed and no double counting | `Htr;tb` source candidate aligns with explicit `length * psi` handling. | Keep explicit source-backed bridge handling and corrected-U double-count guard. |
| Direct `bztu` input | Candidate for H1 only if provenance-backed | `bztu` has verified candidate formulas, but a direct input contract still needs source/provenance rules. | Consider a narrow `PHASE_H1_UNCONDITIONED_ZONE_BZTU_DIRECT_INPUT_GATE` with no full derivation. |
| Full `bztu` derivation | Needs further extraction and model design | Requires `Hztu;e`, `Hztu;tot`, conditioned-zone couplings, exterior envelope modelling, and monthly context. | Block until source extraction and input graph design are complete. |
| `Hg` / `Hgr` | Ready only as direct controlled import / expert override | MC001 points ground work to ISO 13370 / C107-backed methods; no native method is implemented. | Keep blocked by default; allow only Phase C-valid controlled values until method support exists. |
| `Ha` | Blocked | No reliable MC001 envelope/transmission mapping is confirmed. | Do not implement; keep as internal compatibility placeholder only. |
| Monthly/time-constant behavior | Blocked, future phase | Time constant formulas depend on excluding-ground transmission, adjusted ground transmission, ventilation, effective heat capacity, and monthly context. | Document only; no monthly heating, no `QHnd`, no time-constant implementation. |
| `bve = bztu` relation | Specific ventilation-from-ztu case only | `bve` is ventilation correction; `bztu` is non-climatized-zone correction. The relation applies only to specific airflow from non-climatized zones. | Keep Phase F semantics separate from transmission semantics. Do not treat `bve` and `bztu` as global equivalents. |
| `Htr(excl.*)` notation | Needs symbol normalization before implementation | Source candidates show multiple excluding-ground / ground-floor notation variants. | Use descriptive documentation wording until exact runtime identifier is reviewed. |

## 5. Recommended H1 Options

### Option 1 - `PHASE_H1_UNCONDITIONED_ZONE_BZTU_DIRECT_INPUT_GATE`

This option would implement the smallest useful `Hu` deblocking path:

- accept only direct source-backed/provenance-backed `bztu`;
- apply only verified Figure 2.9 non-climatized-zone element cases;
- preserve exact source trace and zone classification;
- reject missing `bztu`, missing U/area, unsupported cooling-side notation, and unverified full derivation;
- keep full `bztu` derivation blocked.

Advantages:

- deblocks a practical part of `Hu` without modelling the full adjacent-zone graph;
- builds directly on Phase C/D/E fail-closed behavior;
- creates a fixture boundary for non-climatized-zone transmission without monthly heating.

Risks:

- direct `bztu` input may be misused unless provenance, scope, and monthly/annual context are strict;
- external vs internal non-climatized-zone cases must be mapped exactly;
- cooling-side notation remains to be verified before broad support.

### Option 2 - `PHASE_H1_GROUND_TRANSMISSION_CONTROLLED_IMPORT_GATE`

This option would keep native ground calculation blocked while formalizing a controlled `Hg` / `Hgr` import path:

- require Phase C-valid source/provenance;
- require explicit distinction among `Hg`, `Hgr;an`, and `Hgr;adj`;
- reject raw ground element `U * A` fallback;
- add diagnostics showing ground remains ISO 13370 / C107 method-blocked.

Advantages:

- lowest methodological risk;
- no native ground formula is introduced;
- strengthens the existing controlled-value model.

Risks:

- does not deblock native ground calculations;
- may duplicate behavior already available through Phase E controlled imports unless it adds clearer component-specific validation.

### Recommendation

Recommended next implementation step:

`PHASE_H1_UNCONDITIONED_ZONE_BZTU_DIRECT_INPUT_GATE`

This is recommended only as a direct-input gate, not as full `bztu` derivation. It should require source-backed/provenance-backed `bztu`, explicit external/internal non-climatized-zone classification, source-backed U and area, and strict blocker propagation into `Htr`.

If the team wants the absolute lowest-risk next step with no new element formula handling, use `PHASE_H1_GROUND_TRANSMISSION_CONTROLLED_IMPORT_GATE` instead.

## 6. Non-Goals

Phase H0A does not implement:

- runtime behavior;
- formulas;
- H1 behavior;
- full `bztu` derivation;
- native `Hg` / ISO 13370 / C107 ground calculation;
- `Ha`;
- monthly heating;
- `QHnd`;
- final energy;
- primary energy;
- CO2;
- CPE/report/certificate workflow;
- UI, API, DB, Worker, deploy, or product integration;
- product registry;
- Level 2 auditor readiness.

Phase H0A also does not change:

- tests;
- formula helpers;
- orchestrators;
- Phase C/D/E/F/G/G1 behavior.

## 7. Open Questions

- What exact runtime name should represent the `Htr(excl.*)` family without losing source notation?
- What is the exact distinction among `Hg`, `Hgr;an`, `Hgr;adj`, `HH;gr;adj;ztc`, and related monthly/adjusted ground terms?
- What is the exact cooling-side notation in Figure 2.9 for external and internal non-climatized-zone element cases?
- What source/provenance fields are required for a direct `bztu` input?
- Should H1 support only direct `bztu` input, or also group elements by external/internal non-climatized-zone case?
- Does MC001 have a verified envelope/transmission concept corresponding to the internal engine placeholder `Ha`?
- How should future logic prevent double counting between direct exterior, non-climatized-zone, ground, adjacent-space, and bridge contributions?
