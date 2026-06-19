# 02 Materials, Lambda, R and U

Extraction status: `extracted`.

Source document:

- MC001-2022 - Metodologie de calcul al performantei energetice a cladirilor
- Local PDF: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- Uploaded source identifier: `63d8dccfe6ae8244797864 (1).pdf`

MC001 sections used:

- MC001-2022, 2.1.4 - Parametri definitorii pentru caracterizarea higrotermica a materialelor
- MC001-2022, Tabel 2.2 - Coeficienti de majorare a conductivitatii termice
- MC001-2022, 2.4.1 - Calculul rezistentei termice si al transmitantei termice ale elementelor opace
- MC001-2022, relatia (2.3)
- MC001-2022, relatia (2.6)
- MC001-2022, relatia (2.7)

Implementation relevance:

This module defines the material and one-dimensional opaque-envelope formulas needed before thermal bridge correction and Htr calculation.

LaCurent uses this extraction only for the estimative Physics Engine. It is not official certificate logic and must not be presented as an official energy performance certificate.

## Concepts To Extract

| Concept | Implementation meaning |
| --- | --- |
| conductivitate termica `lambda` | Material property describing heat conduction through a homogeneous material layer, in `W/(mK)`. |
| conductivitate termica normata | Reference/design conductivity value before age, moisture, or degradation correction. |
| conductivitate termica de calcul | Conductivity value used in calculation after applying known correction factors, when applicable. |
| coeficient de majorare `a` | Multiplier applied to normative conductivity to account for age, moisture, condensation, or degradation. |
| rezistenta termica strat `Rj` | Thermal resistance of one homogeneous layer, computed from thickness and conductivity. |
| rezistenta termica totala `R` | One-dimensional total resistance of an opaque element, including surface resistances, material layers, and unventilated air layers. |
| transmitanta termica `U` | Inverse of total resistance; describes heat transfer through the element before thermal bridge correction. |
| rezistenta termica corectata `R'` | Corrected resistance concept after accounting for non-one-dimensional effects such as thermal bridges. |
| transmitanta termica corectata `U'` | Corrected transmittance concept used when thermal bridges are included. |

`R'` and `U'` must be handled separately from plain `R` and `U`. Plain `R/U` describe one-dimensional element behavior. Corrected `R'/U'` require thermal bridge inputs and belong to module `03_thermal_bridges`.

## Formula Registry Entries

### Formula 1

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_3_LAMBDA_CORRECTED` |
| labelRo | Conductivitate termica corectata |
| formulaText | `lambda = a x lambda_normat` |
| unit | `W/(mK)` |
| output | `lambdaCorrected` |
| inputs | `a`: coeficient de majorare `[-]`; `lambdaNormat`: conductivitate termica normata `[W/(mK)]` |
| MC001 reference | MC001-2022, 2.1.4, relatia (2.3) |
| implementation notes | Use only when material condition/age correction is known. Do not invent coefficient `a`. If coefficient `a` is missing, use declared/design lambda only with explicit warning. |
| validation notes | `lambdaCorrected` must be `> 0`. `a` must be `>= 1` when used as degradation/ageing coefficient. |

### Formula 2

| Field | Value |
| --- | --- |
| formulaId | `PHYSICS_LAYER_R` |
| labelRo | Rezistenta termica a unui strat omogen |
| formulaText | `Rj = dj / lambdaJ` |
| unit | `m2K/W` |
| output | `Rj` |
| inputs | `dj`: grosimea stratului `j` `[m]`; `lambdaJ`: conductivitatea termica a stratului `j` `[W/(mK)]` |
| MC001 reference | Derived from MC001-2022, 2.4.1 thermal resistance method |
| implementation notes | Base physical relation for homogeneous layers. Used inside `sum(Rj)` in `MC001_2_6_R_TOTAL`. |
| validation notes | `dj` must be `> 0`. `lambdaJ` must be `> 0`. |

### Formula 3

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_6_R_TOTAL` |
| labelRo | Rezistenta termica totala unidirectionala |
| formulaText | `R = Rsi + sum(Rj) + sum(Ra) + Rse` |
| unit | `m2K/W` |
| output | `R` |
| inputs | `Rsi`: rezistenta superficiala interioara `[m2K/W]`; `Rj`: rezistenta stratului `j` `[m2K/W]`; `Ra`: rezistenta stratului de aer neventilat `[m2K/W]`; `Rse`: rezistenta superficiala exterioara `[m2K/W]` |
| MC001 reference | MC001-2022, 2.4.1, relatia (2.6) |
| implementation notes | Applies to opaque envelope elements in one-dimensional calculation. `Rsi/Rse` must come from registry, not inline constants. `Ra` may be empty if no unventilated air layer exists. |
| validation notes | `R` must be `> 0`. Each layer resistance must be `>= 0`. Missing `Rsi/Rse` should block high-confidence calculation. |

### Formula 4

| Field | Value |
| --- | --- |
| formulaId | `MC001_2_7_U_VALUE` |
| labelRo | Transmitanta termica |
| formulaText | `U = 1 / R` |
| unit | `W/(m2K)` |
| output | `U` |
| inputs | `R`: rezistenta termica totala `[m2K/W]` |
| MC001 reference | MC001-2022, 2.4.1, relatia (2.7) |
| implementation notes | Applies to unidirectional U-value before thermal bridge correction. Do not confuse `U` with `U'`. |
| validation notes | `R` must be `> 0`. `U` must be `> 0`. |

## Tabel 2.2 Extraction

Compact implementation table for coefficient `a`.

Implementation note: Tabel 2.2 coefficients must later be represented as data in a registry or extraction-backed dataset, not as inline calculator constants.

| materialGroup | condition | ageCondition | coefficientA | notes |
| --- | --- | --- | --- | --- |
| zidarie din caramida sau blocuri ceramice | in stare uscata | vechime >= 30 ani | 1.03 | Applies to conductivity correction. |
| zidarie din caramida sau blocuri ceramice | afectata de condens | vechime >= 30 ani | 1.15 | Use only when condition is known. |
| zidarie din caramida sau blocuri ceramice | afectata de igrasie | vechime >= 30 ani | 1.30 | Use only when condition is known. |
| zidarie din BCA / betoane usoare / placi termoizolatoare BCA | in stare uscata | vechime >= 20 ani | 1.05 | Includes BCA blocks and light concrete groups. |
| zidarie din BCA / betoane usoare / placi termoizolatoare BCA | afectata de condens | vechime >= 20 ani | 1.15 | Use only when condition is known. |
| zidarie din BCA / betoane usoare / placi termoizolatoare BCA | afectata de igrasie | vechime >= 20 ani | 1.30 | Use only when condition is known. |
| zidarie din piatra | in stare uscata | vechime >= 20 ani | 1.03 | Use only when condition is known. |
| zidarie din piatra | afectata de condens | vechime >= 20 ani | 1.10 | Use only when condition is known. |
| zidarie din piatra | afectata de igrasie | vechime >= 20 ani | 1.20 | Use only when condition is known. |
| beton armat | afectat de condens/igrasie | not specified in extracted table | 1.10 | Single correction row in table. |
| beton cu agregate usoare | in stare uscata | vechime >= 30 ani | 1.03 | Use only when condition is known. |
| beton cu agregate usoare | afectat de condens | vechime >= 30 ani | 1.10 | Use only when condition is known. |
| beton cu agregate usoare | afectat de igrasie | vechime >= 30 ani | 1.20 | Use only when condition is known. |
| tencuiala | in stare uscata | vechime >= 20 ani | 1.03 | Use only when condition is known. |
| tencuiala | afectata de condens | vechime >= 20 ani | 1.10 | Use only when condition is known. |
| tencuiala | afectata de igrasie | vechime >= 20 ani | 1.30 | Use only when condition is known. |
| paianta / chirpici | in stare uscata, fara degradari vizibile | vechime >= 10 ani | 1.10 | Use only when condition is known. |
| paianta / chirpici | in stare uscata, cu degradari vizibile | vechime >= 10 ani | 1.15 | Degradari: fisuri, exfolieri. |
| paianta / chirpici | afectata de igrasie, condens | vechime >= 10 ani | 1.30 | Use only when condition is known. |
| vata minerala in vrac / saltele / pasle | in stare uscata | vechime >= 10 ani | 1.15 | Use only when condition is known. |
| vata minerala in vrac / saltele / pasle | afectata de condens | vechime >= 10 ani | 1.30 | Use only when condition is known. |
| vata minerala in vrac / saltele / pasle | in stare umeda datorita infiltratiilor de apa | vechime >= 10 ani | 1.60 | Especially relevant for roofs. |
| placi rigide din vata minerala | in stare uscata | vechime >= 10 ani | 1.10 | Use only when condition is known. |
| placi rigide din vata minerala | afectata de condens | vechime >= 10 ani | 1.20 | Use only when condition is known. |
| placi rigide din vata minerala | in stare umeda datorita infiltratiilor de apa | vechime >= 10 ani | 1.30 | Especially relevant for roofs. |
| polistiren expandat | in stare uscata | vechime >= 10 ani | 1.05 | Use only when condition is known. |
| polistiren expandat | afectat de condens | vechime >= 10 ani | 1.10 | Use only when condition is known. |
| polistiren expandat | in stare umeda datorita infiltratiilor de apa | vechime >= 10 ani | 1.15 | Especially relevant for roofs. |
| polistiren extrudat | in stare uscata | vechime >= 10 ani | 1.02 | Use only when condition is known. |
| polistiren extrudat | afectat de condens | vechime >= 10 ani | 1.05 | Use only when condition is known. |
| polistiren extrudat | in stare umeda datorita infiltratiilor de apa | vechime >= 10 ani | 1.10 | Especially relevant for roofs. |
| poliuretan rigid | in stare uscata | vechime >= 10 ani | 1.10 | Use only when condition is known. |
| poliuretan rigid | afectat de condens | vechime >= 10 ani | 1.15 | Use only when condition is known. |
| poliuretan rigid | in stare umeda datorita infiltratiilor de apa | vechime >= 10 ani | 1.25 | Especially relevant for roofs. |
| spuma poliuretan aplicata in situ | in stare uscata | vechime >= 10 ani | 1.15 | Use only when condition is known. |
| spuma poliuretan aplicata in situ | cu degradari vizibile datorita expunerii la radiatii UV | vechime >= 10 ani | 1.20 | Use only when UV degradation is known. |
| spuma poliuretan aplicata in situ | in stare umeda datorita infiltratiilor de apa | vechime >= 10 ani | 1.25 | Especially relevant for roofs. |
| elemente din lemn | in stare uscata, fara degradari vizibile | vechime >= 10 ani | 1.10 | Use only when condition is known. |
| elemente din lemn | in stare uscata, cu degradari vizibile | vechime >= 10 ani | 1.20 | Degradari: fisuri, microorganisme. |
| elemente din lemn | in stare umeda | vechime >= 10 ani | 1.30 | Use only when condition is known. |
| placi din aschii de lemn liate cu ciment | in stare uscata | vechime >= 10 ani | 1.10 | Use only when condition is known. |
| placi din aschii de lemn liate cu ciment | afectate de condens | vechime >= 10 ani | 1.20 | Use only when condition is known. |
| placi din aschii de lemn liate cu ciment | in stare umeda datorita infiltratiilor de apa | vechime >= 10 ani | 1.30 | Especially relevant for roofs. |

## Implementation Implications For LaCurent

- Material lambda must come from a material registry or direct user input.
- Age/degradation correction must be explicit, not guessed.
- `R/U` calculator can be implemented before thermal bridge calculator.
- `R'/U'` requires thermal bridges and belongs to module `03_thermal_bridges`.
- `U` without thermal bridges is not enough for final `Htr` if bridges are included.
- Calculators must return warnings when using uncorrected `U`.
- `Rsi/Rse` must come from a registry, not inline constants.
- Missing material condition means no `a` correction should be applied unless the user explicitly selects the condition.

## Do Not Implement Yet

- no calculators created
- no production flow changed
- no UI changed
- no tests added
- next extraction module is `03_thermal_bridges`
