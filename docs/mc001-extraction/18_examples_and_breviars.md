# 18 Examples and Breviars

## Source document

- Source: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001 sections used:
  - MC001-2022, Anexa A, certificate/example annex material
  - MC001-2022, Anexa B, `Breviar de calcul pentru auditare energetica (exemplu)`
  - MC001-2022, Anexa 6.1, `Fisa de analiza energetica (model orientativ)`
  - MC001-2022, Anexa 6.2, non-exhaustive renovation measures for centrally heated residential buildings
  - MC001-2022, Anexa 6.3, non-exhaustive renovation measures for individual/row houses with own heat source
  - MC001-2022, Anexa B, tables/sections around geometry, envelope, thermal bridges, heating/DHW/lighting/ventilation/renewables, certificate output and audit economic analysis
- Extraction status: `partial_index_only`
- Implementation relevance: indexes MC001 worked examples and breviars that may later support manual validation or carefully curated regression fixtures.
- LaCurent disclaimer: this module is not an official certificate, not an official audit, and not a production dataset. Examples must not be used as default inputs for real homes.

## Purpose

- This module is not a formula registry.
- It indexes examples and breviars that can later become manual validation references.
- Examples must not be treated as default production input.
- No Sălicea/demo-house fixture is allowed.
- Real DB cases should later be anonymized for integration validation.
- Numeric examples from MC001 may become automated tests only if inputs, units, assumptions and outputs are complete and visually verified.

## Example index

| exampleId | MC001 source | topic | building/system type | inputs available | outputs available | numeric completeness | validationUse | extractionStatus | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MC001_EX_6_1_ANALYSIS_SHEET_MODEL` | Anexa 6.1 | geometry/envelope/systems input collection | generic audit input sheet | building type, geometry fields, envelope element fields, heating, DHW, cooling/ventilation, lighting, renewables fields | no calculated outputs | text_only | suitable_for_manual_validation | indexed_example | Useful as future input-completeness checklist, not a numeric fixture. |
| `MC001_EX_6_2_CENTRALIZED_RESIDENTIAL_MEASURES` | Anexa 6.2, tables 6.3-6.8 | audit measures | centrally supplied residential buildings | measure descriptions and expected influence categories | no numeric savings | text_only | not_suitable_without_more_data | indexed_example | Informative measure catalogue only. |
| `MC001_EX_6_3_INDIVIDUAL_HOUSE_MEASURES` | Anexa 6.3, tables 6.9-6.13 | audit measures | individual/row houses with own heat source | measure descriptions and expected influence categories | no numeric savings | text_only | not_suitable_without_more_data | indexed_example | Informative measure catalogue only. |
| `MC001_EX_A_CPE_SINGLE_FAMILY_CERTIFICATE` | Anexa A certificate example | certificate/class/reference output | single-family residential example | partial envelope R values, envelope area, system/service indicators | primary energy, CO2, classes, reference building comparison fields | partial | suitable_for_manual_validation | partial_example_missing_inputs | Useful for output-shape validation after visual review; not enough for exact full-chain recalculation. |
| `MC001_EX_B_AUDIT_BREVIAR_SCHOOL_OVERVIEW` | Anexa B, breviar audit | full audit calculation flow | education/school building | geometry, envelope, systems, usage, renovation packages, financial inputs | baseline indicators, package indicators, costs, payback/global cost summary | partial | suitable_for_manual_validation | indexed_example | Broad worked example; too large for direct automated fixture without cleaned tables. |
| `MC001_EX_B_GEOMETRY_ENVELOPE_TABLES` | Anexa B, section 2.1 and related tables | geometry/envelope | school building | envelope areas, reference area, heated volume, wall/roof/floor/window data | intermediate geometry and R/R' outputs | partial | suitable_for_manual_validation | partial_example_missing_inputs | Candidate for future manual validation of modules 01-04 after table cleanup. |
| `MC001_EX_B_THERMAL_BRIDGE_TABLES` | Anexa B, thermal bridge tables | thermal bridges | school envelope junctions | psi values, lengths, bridge descriptions | bridge heat-transfer contributions | partial | suitable_for_manual_validation | visual_example_needs_review | OCR spacing is noisy; requires visual table verification before test use. |
| `MC001_EX_B_HEATING_MONTHLY_GAINS` | Anexa B, heating calculation section | transmission/ventilation/monthly gains/heating | school building | Htr/Hg/monthly temperatures/gains appear in tables | heating energy outputs and intermediate monthly values | unclear | not_suitable_without_more_data | visual_example_needs_review | Monthly tables are dense and visually noisy in extraction; do not automate yet. |
| `MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS` | Anexa B, sections 2.4-2.6 | DHW, lighting, ventilation | school systems | occupants/users, DHW fixtures, lighting count/power, ventilation assumptions | DHW annual final/primary, lighting final/primary, virtual ventilation primary where applicable | partial | suitable_for_manual_validation | partial_example_missing_inputs | Useful for checking expected service categories, but not enough for exact isolated test without cleaned inputs. |
| `MC001_EX_B_RENEWABLES_SOLAR_PRODUCTION` | Anexa B, renewable production table | renewables | solar thermal/PV package example | collector/PV areas and monthly irradiation-like values appear | monthly/annual renewable production outputs | unclear | not_suitable_without_more_data | visual_example_needs_review | Requires climate/solar table verification; do not use as default renewable data. |
| `MC001_EX_B_FINAL_PRIMARY_CO2_CPE` | Anexa B, sections 2.8 and 3 | final/primary/CO2/certificate | school building | service final/primary indicators and emission factors are partially visible | total primary energy, specific primary energy, CO2 indicators, class | partial | suitable_for_manual_validation | indexed_example | Good future manual check for modules 13 and 15 after factor-table alignment. |
| `MC001_EX_B_RENOVATION_PACKAGES_ECONOMIC` | Anexa B, section 5 and tables 5.6-5.12 | audit/economic evaluation | school renovation packages | package definitions, costs, financial assumptions, energy after renovation | energy savings, classes, global cost, payback ranking | partial | suitable_for_manual_validation | visual_example_needs_review | Useful for audit logic validation only after formula/table visual verification. |
| `MC001_EX_B_TECHNICAL_ANNEX_DRAWINGS` | Anexa B, technical annex and Anexa 3 drawings | geometry/source documentation | school building | plans, photos, input sheet values | no direct calculation outputs | text_only | suitable_for_manual_validation | indexed_example | Useful for understanding source-data provenance, not a numeric test. |

## Extracted example summaries

### `MC001_EX_6_1_ANALYSIS_SHEET_MODEL`

- Source section/page/table/figure: MC001-2022, Anexa 6.1, `Fisa de analiza energetica (model orientativ)`.
- Purpose: structured field-data collection for audit input.
- Input data present: building category, climate/wind zones, geometry, envelope element areas/layers, heating system, DHW system, cooling/ventilation system, lighting system, renewables.
- Output data present: none; it is a template.
- Formulas/modules involved: 01, 02, 03, 06, 09, 10, 11, 12, 16.
- Missing data: all numeric values are blank/template fields.
- Future fixture status: manual checklist only.
- Visually unclear values: not applicable.

### `MC001_EX_6_2_CENTRALIZED_RESIDENTIAL_MEASURES`

- Source section/page/table/figure: MC001-2022, Anexa 6.2, tables 6.3-6.8.
- Purpose: non-exhaustive measure catalogue for residential buildings supplied from district heating.
- Input data present: measure names and qualitative effect on heat/DHW consumption.
- Output data present: no numeric savings.
- Formulas/modules involved: 04, 09, 13, 16.
- Missing data: costs, baseline indicators, improved indicators and exact savings.
- Future fixture status: not suitable for numeric validation.
- Visually unclear values: no critical numeric values extracted.

### `MC001_EX_6_3_INDIVIDUAL_HOUSE_MEASURES`

- Source section/page/table/figure: MC001-2022, Anexa 6.3, tables 6.9-6.13.
- Purpose: non-exhaustive measure catalogue for individual/row residential buildings with own heat source.
- Input data present: measure names and qualitative effect categories.
- Output data present: no numeric savings.
- Formulas/modules involved: 04, 09, 13, 16.
- Missing data: costs, baseline indicators, improved indicators and exact savings.
- Future fixture status: not suitable for numeric validation.
- Visually unclear values: no critical numeric values extracted.

### `MC001_EX_A_CPE_SINGLE_FAMILY_CERTIFICATE`

- Source section/page/table/figure: MC001-2022, Anexa A, certificate example and technical annex.
- Purpose: example of certificate output fields and service-level indicators.
- Input data present: partial envelope corrected resistances, envelope area, form factor, service categories and reference-building fields.
- Output data present: service primary energy/CO2, total class, reference comparison fields.
- Formulas/modules involved: 04, 13, 14, 15.
- Missing data: full input chain needed to reproduce all outputs.
- Future fixture status: manual validation reference only.
- Visually unclear values: some table OCR requires visual review before any automated assertion.

### `MC001_EX_B_AUDIT_BREVIAR_SCHOOL_OVERVIEW`

- Source section/page/table/figure: MC001-2022, Anexa B, `Breviar de calcul pentru auditare energetica (exemplu)`.
- Purpose: worked audit example from input description through baseline indicators, renovation packages and economic analysis.
- Input data present: school geometry, envelope construction, systems, lighting, DHW, ventilation, renewables, packages, costs and financial assumptions.
- Output data present: baseline and improved energy, classes, CO2, renewable contribution, costs and payback/global cost indicators.
- Formulas/modules involved: 01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17.
- Missing data: clean machine-readable full tables and visual confirmation of dense numeric pages.
- Future fixture status: suitable for manual validation; not ready for automated tests.
- Visually unclear values: thermal bridge tables, monthly heat/gain tables, renewables tables and economic tables need visual review.

### `MC001_EX_B_GEOMETRY_ENVELOPE_TABLES`

- Source section/page/table/figure: MC001-2022, Anexa B, geometry/envelope sections and tables around 2.1, 2.3, 2.4, 5.3 and 5.4.
- Purpose: worked example for envelope geometry, materials, corrected thermal resistance and before/after renovation comparisons.
- Input data present: envelope areas, reference floor area, heated/reference volume, layer data, thermal-bridge correction fields.
- Output data present: R/R' values and before/after envelope resistance comparisons.
- Formulas/modules involved: 01, 02, 03, 04, 05.
- Missing data: clean verified table extraction.
- Future fixture status: manual validation reference only until tables are cleaned.
- Visually unclear values: yes, table alignment requires review.

### `MC001_EX_B_HEATING_MONTHLY_GAINS`

- Source section/page/table/figure: MC001-2022, Anexa B, heating calculation section.
- Purpose: worked example of heat losses, internal/solar gains and heating outputs.
- Input data present: Htr/Hg-like terms, monthly values and gains appear in tables.
- Output data present: annual heating final/primary result is visible in summary text.
- Formulas/modules involved: 05, 06, 07, 08, 13.
- Missing data: clean monthly inputs, climate inputs, exact table alignment.
- Future fixture status: `manual_validation_reference_only`.
- Visually unclear values: yes; do not automate.

### `MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS`

- Source section/page/table/figure: MC001-2022, Anexa B, sections 2.4-2.6.
- Purpose: worked service-level outputs for DHW, lighting and ventilation.
- Input data present: occupants/users, sanitary objects, lighting inventory, ventilation status.
- Output data present: DHW annual energy, lighting annual final/primary energy, virtual ventilation energy context.
- Formulas/modules involved: 06, 09, 10, 11, 13, 15.
- Missing data: full intermediate calculation tables.
- Future fixture status: manual validation reference only.
- Visually unclear values: moderate; output values are readable but intermediate inputs need cleanup.

### `MC001_EX_B_RENEWABLES_SOLAR_PRODUCTION`

- Source section/page/table/figure: MC001-2022, Anexa B, renewable production section/table.
- Purpose: worked renewable production contribution for renovation package.
- Input data present: solar thermal/PV-like system areas and monthly irradiation-like values are present.
- Output data present: monthly/annual production outputs appear.
- Formulas/modules involved: 12, 13, 17.
- Missing data: clean climate/solar input provenance and table alignment.
- Future fixture status: not suitable for automated validation yet.
- Visually unclear values: yes.

### `MC001_EX_B_FINAL_PRIMARY_CO2_CPE`

- Source section/page/table/figure: MC001-2022, Anexa B, sections 2.8 and 3.
- Purpose: service-to-total indicator and certificate output example.
- Input data present: service primary energy and emission factor-like values.
- Output data present: total primary energy, specific primary energy, CO2 indicators and class.
- Formulas/modules involved: 13, 14, 15.
- Missing data: full factor table provenance and clean service breakdown.
- Future fixture status: suitable for manual validation after factor-table alignment.
- Visually unclear values: some table fields need review.

### `MC001_EX_B_RENOVATION_PACKAGES_ECONOMIC`

- Source section/page/table/figure: MC001-2022, Anexa B, section 5, tables 5.6-5.12.
- Purpose: worked before/after renovation package and economic-analysis example.
- Input data present: package definitions, investment costs, energy prices/financial assumptions, energy after renovation.
- Output data present: package savings, classes, CO2, global cost and payback ranking.
- Formulas/modules involved: 13, 15, 16.
- Missing data: visually verified economic formulas and clean table values.
- Future fixture status: manual validation reference only.
- Visually unclear values: yes; do not automate until formulas/tables are verified.

## Cross-references

- Geometry definitions: `01_geometry_envelope_definitions`.
- Materials/R/U: `02_materials_lambda_R_U`.
- Thermal bridges: `03_thermal_bridges`.
- Transmission: `05_transmission_heat_transfer`.
- Ventilation: `06_ventilation_and_infiltration`.
- Monthly demand: `07_monthly_heating_cooling_demand`.
- Internal/solar gains: `08_internal_and_solar_gains`.
- DHW: `09_dhw_systems`.
- Lighting: `10_lighting`.
- Cooling/ventilation systems: `11_cooling_ventilation_systems`.
- Renewables: `12_renewables`.
- Final/primary/CO2: `13_final_primary_co2_rer`.
- Reference building: `14_reference_building`.
- Certificate/classes: `15_energy_classes_and_certificate`.
- Audit: `16_audit_energy_measures`.
- Climate annex: `17_climate_annex`.

## Validation policy for LaCurent

- Future validation must not use the Sălicea demo house unless explicitly requested.
- Prefer real saved DB homes, anonymized, for integration validation.
- MC001 examples/breviars may be used for unit/manual validation if numerically complete.
- If an example is partial or visually unclear, do not turn it into an automated test.
- Do not invent missing example inputs.
- Do not use MC001 example values as production defaults.
- Do not use official example addresses, owner names or identifying details in LaCurent fixtures.

## Missing-input behavior

- If an example is missing required numeric inputs, future tests must not assert exact numeric results from it.
- If an example has only partial data, it may be used only as:
  - `status: manual_validation_reference_only`
- If an example table is visually unclear, future extraction must keep:
  - `status: visual_example_needs_review`
- Missing example inputs must not be invented.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `19_extraction_registry`.
