# 03 Thermal Bridges

Extraction status: `extracted`.

Source document:

- MC001-2022 - Metodologie de calcul al performantei energetice a cladirilor
- Local PDF: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Uploaded source identifier: `63d8dccfe6ae8244797864 (1).pdf`

MC001 sections used:

- MC001-2022, 2.1.3 - geometry conventions for thermal bridge lengths
- MC001-2022, 2.1.4 - corrected thermal resistance/transmittance concepts
- MC001-2022, 2.4.1 - direct heat transfer with thermal bridges
- MC001-2022, relatia (2.11)
- MC001-2022, relatia (2.12)
- MC001-2022, relatia (2.13)
- MC001-2022, relatia (2.14), adjacent to the same direct transmission transfer calculation context

Implementation relevance:

This module defines how thermal bridges affect transmission heat transfer and how plain `U/R` must be separated from corrected `U'/R'`.

LaCurent uses this extraction only for the estimative Physics Engine. It is not official certificate logic and must not be presented as an official energy performance certificate.

## Concepts To Extract

| Concept | Implementation meaning |
| --- | --- |
| punte termica liniara | Local linear discontinuity where heat transfer differs from the one-dimensional element model. Common examples are junctions, edges, balconies, lintels, and reveals. |
| transmitanta termica liniara `psi` | Linear thermal bridge coefficient, in `W/(mK)`, multiplied by bridge length `l`. |
| punte termica punctuala | Local point discontinuity where heat transfer is represented as a point coefficient instead of a length-based coefficient. |
| transmitanta termica punctuala `chi` | Point thermal bridge coefficient, in `W/K`. |
| lungimea puntii termice `l` | Geometric length of a linear bridge, in `m`, determined according to the selected geometry convention. |
| rezistenta termica corectata `R'` | Corrected resistance concept after thermal bridge effects are included. |
| transmitanta termica corectata `U'` | Corrected transmittance that already includes thermal bridge effects for an element or assembly. |
| difference between `U` and `U'` | `U` is one-dimensional element transmittance. `U'` is corrected transmittance and already includes thermal bridge effects. |
| why `U'/R'` must not be mixed with plain `U/R` | If `U'` is used and `psi x l` / `chi` are also added, the same thermal bridge effect can be double-counted. |

## Mandatory Thermal Bridges From MC001

| bridgeType | Romanian description | typical length source | implementation note |
| --- | --- | --- | --- |
| `wall_to_terrace_roof_or_attic_cornice` | Perete exterior la terasa/acoperis sau zona de pod/cornisa. | Lungimea conturului de intersectie dintre peretele exterior si terasa/acoperis/pod. | Needs boundary type and roof/top-floor element association. |
| `wall_to_attic_floor_or_eaves` | Perete exterior la planseu spre pod sau zona stresinii. | Lungimea conturului dintre peretele exterior si planseul spre pod/streasina. | Keep separate from roof field U-value; this is junction loss. |
| `wall_to_floor_over_unheated_basement_plinth` | Perete exterior la planseu peste subsol neincalzit / zona soclului. | Lungimea perimetrului la contactul perete-planseu/soclu. | Requires unheated basement boundary classification. |
| `wall_to_slab_on_ground_plinth` | Perete exterior la placa pe sol / zona soclului. | Lungimea perimetrului la contactul perete-placa pe sol. | Requires ground-contact/slab boundary classification. |
| `exterior_wall_corners_outgoing_incoming` | Colturi iesinde si intrande ale peretilor exteriori. | Inaltimea/lungimea verticala a colturilor sau convention from catalog/detail. | Corner signs and values must come from sourced details/catalog. |
| `wall_to_internal_structural_walls_or_rc_elements` | Perete exterior la pereti structurali interiori sau elemente din beton armat. | Lungimea intersectiei dintre peretele exterior si elementul structural interior. | Do not treat as internal wall area; it is a junction bridge. |
| `wall_to_intermediate_floors_ring_beams_consoles` | Perete exterior la plansee intermediare, centuri sau console din beton. | Lungimea liniei de intersectie pe fiecare nivel. | Relevant for ring beams and slab edges. |
| `continuous_rc_slabs_crossing_exterior_walls_balconies_loggias` | Placi continue din beton armat care traverseaza peretii exteriori la balcoane/logii. | Lungimea consolei/balconului la strapungerea anvelopei. | High-risk bridge; should not be silently ignored. |
| `exterior_joinery_perimeter_lintels_sills_reveals` | Perimetrul tamplariei exterioare: ferestre/usi, buiandrugi, glafuri, spaleti verticali. | Perimetrul fiecarei ferestre/usi sau lungimi separate pentru buiandrug, glaf si spaleti. | Keep separate from window U-value unless U' for installed window assembly is provided. |

## Formula Registry Entries

### Formula 1

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_11_HD_WITH_BRIDGES` |
| labelRo | Coeficient direct de transfer termic cu punti termice |
| formulaText | `Hd = Σ(Uj × Aj) + Σ(ψk × lk) + Σχj` |
| unit | `W/K` |
| output | `Hd` |
| inputs | `Uj`: transmitanta termica unidimensionala a partii `j` `[W/(m2K)]`; `Aj`: aria partii `j` `[m2]`; `psiK`: transmitanta termica liniara a puntii termice `k` `[W/(mK)]`; `lk`: lungimea puntii termice `k` `[m]`; `chiJ`: transmitanta termica punctuala `j` `[W/K]` |
| MC001 reference | MC001-2022, 2.4.1, relatia (2.11) |
| implementation notes | Use this when plain `U` values and explicit thermal bridge terms are available. Do not also apply `U'` to the same element, otherwise bridges are double-counted. If no thermal bridges are provided, return warning, not silent zero unless explicitly configured. |
| validation notes | `Uj > 0`; `Aj > 0`; `psiK` may be positive or, in detailed cases, can be negative, but must be sourced; `lk > 0`; `chiJ` must be sourced if used. |

### Formula 2

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_12_HD_CORRECTED_U` |
| labelRo | Coeficient direct de transfer termic cu U corectat |
| formulaText | `Hd = Σ(U'j × Aj)` |
| unit | `W/K` |
| output | `Hd` |
| inputs | `UPrimeJ`: transmitanta termica corectata cu efectul puntilor termice `[W/(m2K)]`; `Aj`: aria elementului `j` `[m2]` |
| MC001 reference | MC001-2022, 2.4.1, relatia (2.12) |
| implementation notes | Use this when `U'` already includes thermal bridge effects. Do not add `ψ x l` or `χ` again if `U'` is used. |
| validation notes | `UPrimeJ > 0`; `Aj > 0`. |

### Formula 3

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_13_PSI_LINEAR_BRIDGE` |
| labelRo | Transmitanta termica liniara a puntii termice |
| formulaText | `ψj = (L2D - Σ(Uj × Aj)) / lj` |
| unit | `W/(mK)` |
| output | `psiJ` |
| inputs | `L2D`: coeficient liniar de cuplaj termic din calcul 2D `[W/K]`; `Uj`: transmitanta termica unidimensionala `[W/(m2K)]`; `Aj`: aria aferenta `[m2]`; `lj`: lungimea din modelul geometric 2D `[m]` |
| MC001 reference | MC001-2022, 2.4.1, relatia (2.13) |
| implementation notes | This is for values calculated numerically or from catalog methods. LaCurent should normally use sourced/catalog/default `ψ` values, not derive `ψ` unless `L2D` is available. |
| validation notes | `lj > 0`; `L2D` must be sourced; do not invent `ψ` values. |

### Formula 4

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_14_TRANSMISSION_HEAT_FLOW` |
| labelRo | Flux termic prin transmisie |
| formulaText | `Φtr = Htr × (θi - θe)` |
| unit | `W` |
| output | `PhiTr` |
| inputs | `Htr`: coeficient de transfer termic prin transmisie `[W/K]`; `thetaI`: temperatura interioara `[°C]`; `thetaE`: temperatura exterioara `[°C]` |
| MC001 reference | MC001-2022, 2.4.1, relatia (2.14) |
| implementation notes | Useful for instantaneous transmission heat flow. Monthly energy calculation belongs to later module `05_transmission_heat_transfer` / `07_monthly_heating_cooling_demand`. |
| validation notes | `Htr >= 0`; temperatures must be numeric. |

## Implementation Implications For LaCurent

- A wall/roof/floor U-value from layers is plain `U`, not `U'`.
- If thermal bridges are modeled explicitly, use `Hd = Σ(U x A) + Σ(ψ x l) + Σχ`.
- If a certified/expert `U'` is provided, use `Hd = Σ(U' x A)` and do not add bridges again.
- Do not silently assume bridges are zero.
- Missing thermal bridge data should produce warnings and lower confidence.
- The engine must track whether each element uses:
  - `plainUWithExplicitBridges`
  - `correctedUPrime`
  - `plainUWithoutBridgeData_lowConfidence`
- Thermal bridge coefficients must later come from:
  - explicit input
  - catalog/registry
  - expert-provided value
  - never invented inline

## Do Not Implement Yet

- no calculators created
- no production flow changed
- no UI changed
- no tests added
- next extraction module is `05_transmission_heat_transfer`

