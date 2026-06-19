# 04 Minimum Envelope Requirements

Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

MC001 sections used:
- MC001-2022, 2.2 Cerinte minime de performanta termica si energetica
- MC001-2022, 2.2.1 Cerinte minime de performanta energetica pentru cladiri noi (NZEB)
- MC001-2022, 2.2.1.1 Cladiri rezidentiale NZEB
- MC001-2022, 2.2.1.2 Cladiri nerezidentiale NZEB
- MC001-2022, 2.2.2 Cerinte minime de performanta energetica pentru cladiri existente renovate
- MC001-2022, 2.3 Considerente suplimentare privind exigentele de performanta energetica a cladirilor NZEB
- MC001-2022, Tabel 2.4, Tabel 2.7, Tabel 2.10a, Tabel 2.10b

Extraction status: `partial_needs_verification`

Implementation relevance: this module extracts threshold/reference envelope data used later for U/R validation, NZEB checks, reference-building setup, and certificate/CPE context. It does not define how to calculate raw layer U-values; that belongs to module 02. It does not define thermal bridge calculations; that belongs to module 03.

LaCurent disclaimer: this extraction is for LaCurent Physics Engine implementation planning only. It is not an official energy certificate and must not be used as a standalone official certification source.

## Concepts to extract

- `R'min`: minimum corrected thermal resistance required or recommended for an envelope element. Unit: `m2K/W`.
- `U'max`: maximum corrected thermal transmittance required or recommended for an envelope element. Unit: `W/(m2K)`.
- Corrected thermal resistance/transmittance: values that include the effect of thermal bridges or corrected construction behavior. These must be treated separately from plain one-dimensional layer values.
- Difference between `U` and `U'`: `U` from module 02 is the one-dimensional layer transmittance. `U'` is corrected and may include thermal bridge effects. A plain layer `U` must not be treated as `U'` unless a traceable correction method is applied.
- Minimum envelope requirement: an envelope threshold used to validate whether an element meets MC001 thermal-performance requirements.
- NZEB envelope requirement: corrected envelope thresholds used in the NZEB context for new buildings.
- Reference envelope requirement: values used by reference/compliance contexts. Exact table selection depends on building type and MC001 scenario.
- Validation use: these tables are for checking or selecting threshold/reference values, not for calculating raw `U` from material layers.
- Thermal bridge correction: because tables use corrected `R'` and `U'`, future validators must warn when comparing them against uncorrected layer `U`.

## Required tables/data

| dataKey | MC001 source | unit | lookup keys | extractionStatus | implementationAllowed | notes |
|---|---|---:|---|---|---:|---|
| nZEBEnvelopeRequirements | Tabel 2.4, Tabel 2.7 | `m2K/W`, `W/(m2K)` | building category, envelope element | extracted | true | Residential and non-residential NZEB envelope values are extracted below. |
| minimumEnvelopeRequirements | Tabel 2.4, Tabel 2.7, Tabel 2.9a, Tabel 2.9b | `m2K/W`, `W/(m2K)` | new/renovated, building category, envelope element | needs_visual_verification | false | New-building NZEB values are extracted; renovated-building tables still need visual verification. |
| referenceEnvelopeRequirements | Tabel 2.4, Tabel 2.7, Tabel 2.9a, Tabel 2.9b | `m2K/W`, `W/(m2K)` | reference context, building category, envelope element | needs_visual_verification | false | Exact use for renovated/reference cases must be verified before registry implementation. |
| externalWallRequirements | Tabel 2.4, Tabel 2.7 | `m2K/W`, `W/(m2K)` | building category | extracted | true | Values extracted for residential and non-residential NZEB. |
| roofTerraceAtticRequirements | Tabel 2.4, Tabel 2.7 | `m2K/W`, `W/(m2K)` | building category | extracted | true | Values extracted for top floors under terraces/attics. |
| floorOverUnheatedSpaceRequirements | Tabel 2.4, Tabel 2.7 | `m2K/W`, `W/(m2K)` | building category | extracted | true | Values extracted for floors over unheated basements/cellars. |
| slabOnGroundRequirements | Tabel 2.4, Tabel 2.7 | `m2K/W`, `W/(m2K)` | building category, slab position | extracted | true | Values extracted for slabs over CTS and heated basement/demisol slabs below CTS. |
| exteriorWindowDoorRequirements | Tabel 2.4, Tabel 2.7 | `m2K/W`, `W/(m2K)` | building category, joinery type | extracted | true | Values extracted for windows, doors, skylights/curtain-wall related categories where listed. |
| basementContactRequirements | Tabel 2.4, Tabel 2.7 | `m2K/W`, `W/(m2K)` | building category, basement element type | extracted | true | Values extracted for heated basement/demisol elements below CTS. |
| thermalBridgeCorrectedRequirement | 2.2.1.1, 2.2.1.2 | `m2K/W`, `W/(m2K)` | corrected R'/U' values | extracted | true | MC001 threshold checks use corrected `R'`/`U'`, not plain layer `R`/`U`. |
| referenceBuildingEnvelopeTable | Tabel 2.9a, Tabel 2.9b, Tabel 2.10b | mixed | building category, climate zone, envelope element | needs_visual_verification | false | Sources are identified as relevant, but exact values are not extracted in this pass. |

## Tabel 2.4

Table source: MC001-2022, Tabel 2.4.

Title: `Rezistente/transmitante termice corectate recomandate (valori normate/de referinta) pentru cladiri rezidentiale NZEB`.

Table status: `extracted`

implementationAllowed: `true`

| elementKey | labelRo | R'min [m2K/W] | U'max [W/(m2K)] |
|---|---|---:|---:|
| exterior_walls | Pereti exteriori, exclusiv suprafetele vitrate, inclusiv peretii adiacenti rosturilor deschise | 4.00 | 0.25 |
| exterior_windows_roof_windows | Tamplarie exterioara: ferestre si ferestre de mansarda | 0.90 | 1.11 |
| exterior_manual_doors | Tamplarie exterioara: usi cu actionare manuala | 0.77 | 1.30 |
| vertical_skylights | Tamplarie exterioara: luminatoare verticale | 0.83 | 1.20 |
| top_floor_under_terrace_or_attic | Plansee peste ultimul nivel, sub terase sau poduri | 6.67 | 0.15 |
| floor_over_unheated_basement_or_cellar | Plansee peste subsoluri neincalzite si pivnite | 3.40 | 0.29 |
| walls_adjacent_to_closed_joints | Pereti adiacenti rosturilor inchise | 1.50 | 0.67 |
| floor_over_exterior | Plansee care delimiteaza cladirea la partea inferioara catre exterior, bowindouri, ganguri etc. | 5.00 | 0.20 |
| slab_on_ground_above_cts | Placi pe sol peste cota terenului sistematizat (CTS) | 5.00 | 0.20 |
| heated_basement_lower_slab_below_cts | Placi la partea inferioara a demisolurilor/subsolurilor incalzite sub CTS | 5.30 | 0.19 |
| heated_basement_external_walls_below_cts | Pereti exteriori sub CTS la demisoluri/subsoluri incalzite | 3.40 | 0.29 |

Implementation notes:
- Values are corrected `R'`/`U'` requirements, not plain one-dimensional layer values.
- For opaque elements, MC001 allows justified techno-economic exceptions in the NZEB compliance report.
- For exterior joinery, values refer to installed joinery and must be interpreted together with installation thermal-bridge treatment.
- Special automatic, sliding, or revolving doors are not covered by these joinery values.
- The values are average values for the same type of envelope element.

## Other tables

### Tabel 2.7

Table source: MC001-2022, Tabel 2.7.

Title: `Rezistente/transmitante termice corectate recomandate (valori normate/de referinta) pentru cladiri nerezidentiale NZEB`.

Purpose: corrected envelope requirements for non-residential NZEB buildings.

Units: `R'min [m2K/W]`, `U'max [W/(m2K)]`.

Lookup keys: building category = non-residential NZEB; envelope element.

Table status: `extracted`

implementationAllowed: `true`

| elementKey | labelRo | R'min [m2K/W] | U'max [W/(m2K)] |
|---|---|---:|---:|
| exterior_walls | Pereti exteriori, exclusiv suprafetele vitrate, inclusiv peretii adiacenti rosturilor deschise | 3.00 | 0.33 |
| exterior_windows_roof_windows | Tamplarie exterioara: ferestre si ferestre de mansarda | 0.83 | 1.20 |
| exterior_manual_doors | Tamplarie exterioara: usi cu actionare manuala | 0.77 | 1.30 |
| curtain_walls_and_skylights | Fatade vitrate tip perete cortina si luminatoare | 0.77 | 1.30 |
| top_floor_under_terrace_or_attic | Plansee peste ultimul nivel, sub terase sau poduri | 6.00 | 0.17 |
| floor_over_unheated_basement_or_cellar | Plansee peste subsoluri neincalzite si pivnite | 3.40 | 0.29 |
| walls_adjacent_to_closed_joints | Pereti adiacenti rosturilor inchise | 1.50 | 0.67 |
| floor_over_exterior | Plansee care delimiteaza cladirea la partea inferioara catre exterior, bowindouri, ganguri etc. | 5.00 | 0.20 |
| slab_on_ground_above_cts | Placi pe sol peste cota terenului sistematizat (CTS) | 5.00 | 0.20 |
| heated_basement_lower_slab_below_cts | Placi la partea inferioara a demisolurilor/subsolurilor incalzite sub CTS | 5.30 | 0.19 |
| heated_basement_external_walls_below_cts | Pereti exteriori sub CTS la demisoluri/subsoluri incalzite | 3.40 | 0.29 |

Implementation notes:
- Values are corrected `R'`/`U'` recommendations for non-residential NZEB buildings.
- MC001 states that if one or more envelope elements cannot meet the Tabel 2.7 values, Tabel 2.10a and comfort requirements remain mandatory.
- Mechanical ventilation and comfort rules are adjacent requirements but are not envelope U/R thresholds.

### Tabel 2.9a

MC001 source: MC001-2022, 2.2.2.1, Tabel 2.9a.

Purpose: envelope requirements for renovated residential buildings.

Units: expected corrected `R'min [m2K/W]` and `U'max [W/(m2K)]`.

Lookup keys: renovated residential building; envelope element.

extractionStatus: `needs_visual_verification`

implementationAllowed: `false`

Notes:
- The section and table reference were identified, but the exact table title and values were not fully verified in this extraction pass.
- Do not implement a registry from Tabel 2.9a until values are visually verified and copied.

### Tabel 2.9b

MC001 source: MC001-2022, 2.2.2.2, Tabel 2.9b.

Purpose: envelope requirements for renovated non-residential buildings.

Units: expected corrected `R'min [m2K/W]` and `U'max [W/(m2K)]`.

Lookup keys: renovated non-residential building; envelope element.

extractionStatus: `needs_visual_verification`

implementationAllowed: `false`

Notes:
- The table is relevant for renovated non-residential requirements, but exact values were not extracted in this pass.
- Do not implement a registry from Tabel 2.9b until values are visually verified and copied.

### Tabel 2.10a

MC001 source: MC001-2022, 2.3, Tabel 2.10a.

Purpose: minimum energy performance requirements for NZEB buildings, including total primary energy and equivalent CO2 emissions.

Units: energy and emission indicators by building category/climate context.

Lookup keys: building category, climate zone or location-related category, indicator type.

extractionStatus: `indexed_table`

implementationAllowed: `true`

Notes:
- This is not an envelope U/R table, but it is referenced by NZEB compliance requirements in 2.2.1.1 and 2.2.1.2.
- Values are not copied in this module; they belong to certificate/class or performance-indicator modules.

### Tabel 2.10b

MC001 source: MC001-2022, 2.3, Tabel 2.10b.

Purpose: minimum energy performance requirements for existing renovated buildings, including total primary energy and equivalent CO2 emissions.

Units: energy and emission indicators by building category/climate context.

Lookup keys: building category, climate zone or location-related category, indicator type.

extractionStatus: `indexed_table`

implementationAllowed: `true`

Notes:
- This is not an envelope U/R table, but it is referenced by renovation compliance requirements in 2.2.2.
- Values are not copied in this module; they belong to certificate/class or performance-indicator modules.

## Rule registry entries

### Rule 1

ruleId: `MC001_2_2_CORRECTED_ENVELOPE_REQUIREMENT_RULE`

labelRo: Cerinta pe rezistente/transmitante termice corectate

ruleText: Envelope checks use corrected values: `R' >= R'min` and `U' <= U'max`.

output/impact: future validators must compare corrected element performance against corrected table thresholds.

MC001 reference: MC001-2022, 2.2.1.1 and 2.2.1.2.

ruleStatus: `extracted_text_rule`

implementationAllowed: `true`

Implementation notes:
- The rule applies to corrected values. Plain `U` from layers is not enough for high-confidence validation.
- If only plain `U` exists, return a warning instead of a definitive corrected compliance result.

Validation notes:
- Required table lookup must be known.
- Element type and building requirement context must be known.

### Rule 2

ruleId: `MC001_2_2_1_1_RESIDENTIAL_NZEB_ENVELOPE_TABLE`

labelRo: Cerinte anvelopa pentru cladiri rezidentiale NZEB

ruleText: Residential NZEB envelope recommendations use Tabel 2.4 corrected `R'`/`U'` values.

output/impact: select Tabel 2.4 for residential NZEB envelope validation.

MC001 reference: MC001-2022, 2.2.1.1, Tabel 2.4.

ruleStatus: `extracted_text_rule`

implementationAllowed: `true`

Implementation notes:
- NZEB residential compliance also refers to Tabel 2.10a for primary energy and CO2 and to renewable contribution requirements; those are not envelope U/R checks.

Validation notes:
- Building category must be residential NZEB.
- Element type must map to one of the Tabel 2.4 rows.

### Rule 3

ruleId: `MC001_2_2_1_2_NON_RESIDENTIAL_NZEB_ENVELOPE_TABLE`

labelRo: Cerinte anvelopa pentru cladiri nerezidentiale NZEB

ruleText: Non-residential NZEB envelope recommendations use Tabel 2.7 corrected `R'`/`U'` values.

output/impact: select Tabel 2.7 for non-residential NZEB envelope validation.

MC001 reference: MC001-2022, 2.2.1.2, Tabel 2.7.

ruleStatus: `extracted_text_rule`

implementationAllowed: `true`

Implementation notes:
- NZEB non-residential compliance also refers to Tabel 2.10a for primary energy and CO2 and to renewable contribution requirements.

Validation notes:
- Building category must be non-residential NZEB.
- Element type must map to one of the Tabel 2.7 rows.

### Rule 4

ruleId: `MC001_2_2_2_RENOVATED_BUILDING_PERFORMANCE_CONTEXT`

labelRo: Cerinte pentru cladiri existente renovate

ruleText: Renovated-building performance checks refer to Tabel 2.10b for total primary energy and equivalent CO2, and to renovation envelope tables that still need visual extraction.

output/impact: renovated-building envelope validation is blocked until Tabel 2.9a/2.9b are verified.

MC001 reference: MC001-2022, 2.2.2, 2.2.2.1, 2.2.2.2, Tabel 2.10b.

ruleStatus: `extracted_text_rule`

implementationAllowed: `false`

Implementation notes:
- Do not reuse Tabel 2.4 or Tabel 2.7 as renovated-building defaults unless MC001 context explicitly selects them.

Validation notes:
- If renovation table lookup is missing, return `cannot_validate_envelope_requirement_missing_table`.

### Rule 5

ruleId: `MC001_2_3_ALL_UTILITIES_CONTEXT_FOR_2_10_TABLES`

labelRo: Context utilitati pentru Tabel 2.10a si Tabel 2.10b

ruleText: Tabel 2.10a and Tabel 2.10b values are determined for buildings with all utilities considered: heating, cooling, ventilation, domestic hot water, and lighting; where a needed non-mandatory utility is absent, MC001 references a virtual system principle.

output/impact: future energy-indicator validation must not compare incomplete service totals against Tabel 2.10a/2.10b without tracing missing or virtual services.

MC001 reference: MC001-2022, 2.3.

ruleStatus: `extracted_text_rule`

implementationAllowed: `true`

Implementation notes:
- This rule is relevant to modules 13, 14, and 15, not to raw envelope U/R calculation.

Validation notes:
- Missing service scope must produce warnings before total indicator comparison.

## Cross-references

- U/R calculation comes from `02_materials_lambda_R_U`.
- Thermal bridges and `U'`/`R'` correction come from `03_thermal_bridges`.
- Reference building uses this module in `14_reference_building`.
- Energy class and certificate context uses this module in `15_energy_classes_and_certificate`.
- Primary energy and CO2 indicator tables are handled in `13_final_primary_co2_rer` and `15_energy_classes_and_certificate`.

## Missing-input behavior

If envelope table or lookup key is missing, a future validator must return:

`status: cannot_validate_envelope_requirement_missing_table`

If plain `U` is compared against corrected `U'` requirement without bridge correction, a future validator must warn:

`plain_U_compared_to_corrected_U_requirement_low_confidence`

No invented threshold values are allowed.

## Implementation implications for LaCurent

- This module is for validation/reference thresholds, not layer U calculation.
- Layer U from module 02 is plain `U`.
- Corrected requirement checks need corrected `U'` or explicit bridge method.
- Do not silently pass or fail an element if table lookup is missing.
- Do not hardcode values in calculators without a reviewed registry/dataset.
- Future registry entries should preserve MC001 table number, building context, element mapping, units, assumptions, warnings, and verification status.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `12_renewables` or `10_lighting` depending on priority.
