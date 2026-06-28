# Phase H2C_A - Hu Source Locator Pass

## 1. Purpose

Phase H2C_A performs a direct source locator pass for future unconditioned-zone transmission / `Hu` readiness.

This milestone is docs-only. It does not implement runtime code, does not create fixtures, does not add tests, and does not change formula helpers or orchestrators.

The locator question is:

> Which exact MC001 pages, sections, figures, relations, and symbols must be preserved before a future Hu readiness fixture or runtime gate connects accepted `bztu` input to non-climatized-zone transmission?

H2C_A updates the H2B/H2C status baseline because direct PDF locator access was available in this environment.

## 2. Source Access Method

Source document:

- `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

Access checks:

- The official PDF is present in `docs/`.
- Native utilities `pdftotext`, `pdfinfo`, `mutool`, `qpdf`, `gs`, `magick`, and `tesseract` were not available.
- `python` is present only as the Windows Store alias and was not usable for PDF extraction.
- `py` was not available.
- `node` / `npx.cmd` were available.
- `npx.cmd --yes pdf-parse` successfully extracted PDF text and rendered temporary page screenshots outside the repository.

Locator method:

- `pdf-parse text` was used to inspect text from the official PDF.
- `pdf-parse screenshot` was used only for visual confirmation where formulas were rendered poorly in text extraction.
- Temporary screenshots were generated under `%TEMP%`, not inside the repository.

Page numbering note:

- H2C_A records the page numbers shown by the PDF / official page footer as extracted and rendered by the PDF source.
- Prior H0A/H2B references to "Figure 2.9" for element-level non-climatized-zone formulas are corrected below: the direct source locator for those element cases is `Figura 2.12`, not `Figura 2.9`.

Status terms:

- `locator_verified`: direct PDF text and/or page render confirmed the locator and source content.
- `locator_candidate`: source content is present but needs final notation review before registry/runtime naming.
- `ambiguous`: the source locator exists but does not answer the implementation question safely.
- `missing`: the pass did not locate an adequate source.
- `blocked_until_source_access`: source access was insufficient for the item.
- `blocked_until_registry`: the item has source evidence but must not be used in runtime until a reviewed registry/source record exists.

## 3. Locator Summary

Symbol entries preserve the source notation conceptually, but some symbols are ASCII/Markdown-normalized transcriptions where the PDF typography cannot be represented exactly. The authoritative locator remains the cited page/figure/relation.

| locatorId | target | status | source locator | source symbols / normalized transcription | interpretation | supports | remains blocked |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `H2C_A_FIG_2_9_OVERVIEW` | Figure 2.9 notation | `locator_verified` | Official MC001 PDF, page 98, `Figura 2.9` | `QH,C;ht`, `QH,C;tr`, `QH,C;ve`, `QH,C;sol`, `QH,C;int`, `QH,C;gn`, `Qsky` | Figure 2.9 is an overview of energy components entering/leaving the building for heating/cooling. | Corrects prior candidate references: Figure 2.9 is not the source locator for element-level non-climatized-zone formulas. | Runtime element formula ids from Figure 2.9 are blocked because the element formulas are not there. |
| `H2C_A_ZTUI_ZTUE` | internal/external non-climatized zone classification | `locator_verified` | Official MC001 PDF, page 94, `Figura 2.7`, section `2.6.2.1` context | `ztui`, `ztue`, `ztcalcul` | MC001 distinguishes interior and exterior non-climatized zones. | Future boundary relation contract: external non-climatized zone vs internal non-climatized zone must be explicit. | No Hu readiness if this boundary relation is missing or ambiguous. |
| `H2C_A_BZTU_TEMPERATURE` | `bztu` monthly meaning | `locator_verified` | Official MC001 PDF, page 94, section `2.6.2.1`, relation `(2.21)` | `theta_ztu,k;H/C;m`, `theta_int;calc;H/C;ztc,j;m`, `bztu,k;m`, `theta_e;a;m` | `bztu,k;m` is the monthly correction factor for adjacent non-climatized zone `k`. | Confirms H1/H2 monthly scope discipline for direct `bztu`. | Accepted `bztu` remains input readiness only; it does not make `Hu` ready by itself. |
| `H2C_A_BZTU_RATIO` | `bztu` derivation ratio | `locator_verified` | Official MC001 PDF, page 95, section `2.6.2.2`, relation `(2.22)` | `bztu;m`, `Hztu;e;m`, `Hztu;tot;m` | `bztu;m = Hztu;e;m / Hztu;tot;m`. | Source locator for future full `bztu` derivation. | Full derivation remains blocked until `Hztu;e`, `Hztu;tot`, inventories, units, and registry records are implemented. |
| `H2C_A_HZTU_TOTAL` | `Hztu;tot` | `locator_verified` | Official MC001 PDF, page 95, section `2.6.2.2`, relation `(2.23)` | `Hztu;tot;m`, `Hztc,j;ztu;m`, `Hztu;e;m` | `Hztu;tot;m` is the sum of transfer coefficients between the non-climatized zone, adjacent conditioned zones, and exterior. | Source locator for future full adjacent-zone model. | Not usable as an H1/H2 direct-input shortcut. |
| `H2C_A_DISTRIBUTION_FACTOR` | multiple adjacent conditioned-zone distribution | `locator_verified` | Official MC001 PDF, page 95, section `2.6.2.2`, `Figura 2.8` | `Fztc,i;ztu;m`, `Hztc,i;ztu;m`, `sum_j(Hztc,j;ztu;m)` | For multiple conditioned zones adjacent to one non-climatized zone, distribution is based on transfer coefficients; for one adjacent conditioned zone, the factor is `1`. | Confirms that simple averaging is not source-backed. Future Hu readiness needs explicit distribution metadata when multiple conditioned zones are present. | Runtime implementation remains blocked until `Hztc,j;ztu;m` inputs and calculation path are defined. |
| `H2C_A_ZTU_TO_ZTU_EXCLUSION` | ztu-to-ztu applicability | `locator_verified` | Official MC001 PDF, page 95, section `2.6.2.2` | `b`, `zona neincalzita`, `alta zona neincalzita` | The calculation formula for `b` is valid only if the unconditioned zone is not adjacent to another unconditioned zone. | Future logic must block ztu-to-ztu chains unless another source path is later verified. | `ztu` adjacent to another `ztu` remains `blocked_unsupported_methodology`. |
| `H2C_A_HZTU_EXTERIOR` | `Hztu;e` | `locator_verified` | Official MC001 PDF, page 96, section `2.6.2.2`, relation `(2.24)` | `Hztu;e;k;m`, `cztu;ve`, `Htr;ue;k;m` | `Hztu;e;k;m = (1 + cztu;ve) * Htr;ue;k;m`. | Source locator for future non-climatized-zone exterior transfer model. | Full derivation remains blocked; this needs exterior envelope inventory and registry review. |
| `H2C_A_CZTU_VE` | `cztu;ve` | `locator_verified` / `blocked_until_registry` | Official MC001 PDF, page 96, section `2.6.2.2`, relation `(2.24)` | `cztu;ve`, `cztu;ve = 0,5` | MC001 recommends `cztu;ve = 0.5` in the `Hztu;e` relation. | Future registry candidate. | Must not be hardcoded before reviewed registry/source status exists. |
| `H2C_A_HTR_TOTAL_COMPONENTS` | `Htr` components | `locator_verified` | Official MC001 PDF, pages 81-82, relation `(2.15)` | `Htr`, `Hd`, `Hg`, `Hu`, `Ha` | `Htr = Hd + Hg + Hu + Ha`; `Hu` is transmission through unheated spaces; `Ha` is transmission toward adjacent buildings. | Confirms `Hu` and `Ha` component roles in `Htr`. | Missing `Hg`, `Hu`, or `Ha` must not become zero without source-backed non-applicability. |
| `H2C_A_HTR_EXCL_GROUND` | `Htr(excl.*)` notation | `locator_verified` / `locator_candidate` | Official MC001 PDF, page 99, `Figura 2.11`; page 100, section `2.7.1.1`, relation `(2.27)` | `HH/C;tr(excl.gr);ztc;m`, `HH/C;tr(excl.grnd flr);m`, `HH/C;el,k;m`, `Htr;tb;ztc` | The source uses notation for transmission excluding ground / ground-floor elements and then sums element coefficients plus thermal bridges. | Future source mapping can preserve raw notation with aliases. | Final runtime id normalization remains blocked until registry review. |
| `H2C_A_FIG_2_12_DIRECT_EXTERIOR` | direct exterior element formula | `locator_verified` | Official MC001 PDF, page 100, `Figura 2.12` | `HH/C;el;k;m = UH/C;k;m * Ael;k` | Direct exterior elements use `U * A`. | Existing Phase D/E exterior direct path remains conceptually aligned. | Must not be reused for non-climatized, ground, or adjacent-building paths. |
| `H2C_A_FIG_2_12_EXTERNAL_ZTU` | external non-climatized-zone element formula | `locator_verified` | Official MC001 PDF, page 100, `Figura 2.12` | `HH;el;k;m = bztu;k;m * UH;k;m * Ael;k` | Element connected to an exterior adjacent non-climatized zone uses a `bztu`-weighted path. | Enables future H2D fixture design for a source-located readiness contract. | Does not prove complete `Hu`; inventory, month, zone, U path, distribution, and provenance are still required. |
| `H2C_A_FIG_2_12_INTERNAL_ZTU` | internal non-climatized-zone element formula | `locator_verified` | Official MC001 PDF, page 100, `Figura 2.12` | `HH;el;k;m = (1 - bztu;k;m) * UH;tr;k;m * Ael;k` | Element adjacent to an internal non-climatized zone uses a `(1 - bztu)` weighted path. | Enables future H2D fixture design for a source-located readiness contract. | Does not prove complete `Hu`; topology, U notation, month, distribution, and registry ids remain gated. |
| `H2C_A_HTR_TB` | thermal bridge coefficient | `locator_verified` | Official MC001 PDF, page 100, section `2.7.1.1`, relation `(2.28)` | `Htr;tb;zt`, `ltb;k`, `Psi_tb;k` | Thermal bridges are summed as length times linear transmittance. | Existing source-backed bridge path remains aligned. | Corrected-U / explicit bridge double-count guard remains required. |
| `H2C_A_BVE_BZTU` | ventilation-specific `bve = bztu` relation | `locator_verified` | Official MC001 PDF, page 102, section `2.7.1.2`, relation `(2.32)` | `bve,k;H/C;m`, `bztu;m` | `bve` equals `bztu` only when ventilation/infiltration air is from an external or internal non-climatized zone. | Confirms Phase F/Hve semantics and H1/H2 bve/bztu separation. | Must not be used as a global `bve == bztu` or `bztu == Hu` equivalence. |
| `H2C_A_HA_METHOD` | `Ha` calculation method | `ambiguous` | Official MC001 PDF, pages 81-82 identify `Ha`; no calculation method located in this pass. | `Ha` | `Ha` is a transmission component toward adjacent buildings. | Corrects H0A/H2C uncertainty about the symbol meaning. | Native `Ha` implementation remains blocked until a calculation/source path and non-applicability rules are located. |
| `H2C_A_RUNTIME_REGISTRY_IDS` | equation numbering / registry ids | `blocked_until_registry` | Official MC001 PDF pages 94-102; repo extraction docs | `(2.21)` through `(2.32)`, `Figura 2.7`, `Figura 2.8`, `Figura 2.9`, `Figura 2.11`, `Figura 2.12` | H2C_A locates source anchors but does not create final registry ids. | Future fixture design can cite candidate locators. | Runtime formula ids remain blocked until a reviewed registry pass. |

## 4. Corrected Locator Conclusions

### Figure 2.9

`Figura 2.9` on page 98 is a high-level energy component diagram. It lists monthly heating/cooling energy component notation such as `QH,C;ht`, `QH,C;tr`, `QH,C;ve`, `QH,C;sol`, `QH,C;int`, `QH,C;gn`, and `Qsky`.

H2C_A therefore corrects the prior working reference: the external/internal non-climatized-zone element formulas should not be attributed to Figure 2.9.

### Figure 2.12

`Figura 2.12` on page 100 is the source locator for the element-level transmission cases:

```text
Direct exterior element:
HH/C;el;k;m = UH/C;k;m * Ael;k

External adjacent non-climatized-zone element:
HH;el;k;m = bztu;k;m * UH;k;m * Ael;k

Internal adjacent non-climatized-zone element:
HH;el;k;m = (1 - bztu;k;m) * UH;tr;k;m * Ael;k
```

These formulas support future `Hu` readiness fixture design only at element-contract level. They do not implement complete `Hu`, complete `Htr`, full `bztu` derivation, or monthly heating demand.

### BZTU derivation

Section `2.6.2.2` pages 95-96 gives source locators for the full `bztu` derivation chain:

```text
bztu;m = Hztu;e;m / Hztu;tot;m
Hztu;tot;m = sum_j(Hztc,j;ztu;m) + Hztu;e;m
Hztu;e;k;m = (1 + cztu;ve) * Htr;ue;k;m
```

This confirms the formula family but does not deblock runtime derivation. Full derivation requires a modeled non-climatized zone, exterior envelope inventory, adjacent conditioned-zone couplings, distribution handling, and source-backed registry entries.

### Multiple adjacent conditioned zones

Page 95 and `Figura 2.8` locate a distribution factor for multiple adjacent conditioned zones:

```text
Fztc,i;ztu;m = Hztc,i;ztu;m / sum_j(Hztc,j;ztu;m)
```

This is source evidence that distribution is transfer-coefficient based. Simple averaging, area-only allocation, or reuse of gains-side `Fztc` without source trace remains forbidden.

### ZTU adjacent to ZTU

Page 95 states that the `b` calculation formula is valid only if the unconditioned zone is not adjacent to another unconditioned zone. Therefore a future `ztu`-to-`ztu` path must remain blocked unless another explicit MC001 source path is located.

### Ha

Pages 81-82 locate `Ha` in relation `(2.15)` as transmission toward adjacent buildings. H2C_A therefore no longer treats the symbol itself as wholly unresolved.

However, H2C_A did not locate a native calculation relation for `Ha`. `Ha` remains blocked for runtime implementation and complete `Htr` readiness unless a future source pass maps its method or source-backed non-applicability rules.

## 5. Runtime Readiness Decision

H2C_A enables the next milestone to move from source mapping to fixture design, but not to runtime calculation.

Recommended next milestone:

```text
PHASE_H2D_HU_CONTRACT_FIXTURE_DESIGN
```

Allowed purpose of H2D:

- design a narrow, source-located readiness/contract fixture for a future `Hu` component;
- cite the corrected MC001 locators from H2C_A;
- prove that accepted `bztu` is insufficient by itself;
- require complete element inventory, zone mapping, U-value path, month, `bztu` path, source/provenance, and distribution metadata;
- preserve blocker propagation into `Hu`, `Htr`, and auditor core readiness.

H2D must not:

- implement runtime `Hu`;
- derive `bztu`;
- implement `Hztu;e` or `Hztu;tot`;
- create final normative registry ids;
- compute complete `Htr`;
- compute monthly heating / `QHnd`;
- add product, UI, API, DB, Worker, report, CPE, marketplace, or AI scope.

## 6. Blockers Preserved

The following remain blocked after H2C_A:

- full `bztu` derivation;
- native `Hztu;e` implementation;
- native `Hztu;tot` implementation;
- `cztu;ve` runtime defaulting without registry/source review;
- complete `Hu` calculation;
- complete `Htr` readiness;
- native `Hg` / ground method;
- native `Ha` calculation;
- ztu-to-ztu chains;
- missing or ambiguous distribution metadata;
- final runtime formula ids and equation registry ids;
- climate / solar / internal gains implementation;
- monthly heating / `QHnd`;
- final energy;
- primary energy;
- CO2;
- Level 2 Full Auditor readiness;
- report / CPE readiness;
- UI / API / Worker / DB / deploy / product integration.

## 7. Non-Goals

H2C_A does not:

- modify runtime code;
- modify tests;
- create fixtures;
- change formula helpers;
- change orchestrators;
- create a normative runtime registry;
- implement `Hu`, `Htr`, `Hg`, or `Ha`;
- implement full `bztu` derivation;
- implement `Hztu;e`, `Hztu;tot`, or `cztu;ve`;
- implement climate, solar gains, internal gains, monthly heating, `QHnd`, final energy, primary energy, or CO2;
- add UI, API, Worker, DB/schema, migrations, deploy config, product flow, marketplace, report generation, certificate/CPE workflow, or AI features.

## 8. Stop Conditions For Future Work

Future work must stop and report if:

- Figure 2.12 element formulas are used without preserving source locator and boundary classification;
- a valid `bztu` direct input is treated as complete `Hu`;
- complete `Hu` is treated as complete `Htr`;
- `bve = bztu` is used outside the ventilation-from-non-climatized-zone case;
- `cztu;ve = 0.5` is hardcoded without a reviewed registry/source record;
- ztu-to-ztu topology is accepted without a new source path;
- gains-side distribution is reused as transmission distribution without source-backed proof;
- missing `Hg`, `Hu`, or `Ha` is converted to zero without explicit source-backed non-applicability.
