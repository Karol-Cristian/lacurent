# 15 Energy Classes and Certificate

Source document:

- `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

MC001 sections used:

- MC001-2022, 1.1.5 - Performanta energetica: certificat de performanta energetica, indicator PEC, performanta energetica a cladirii de referinta
- MC001-2022, 5.2 - Cladirea de referinta / unitatea de cladire de referinta, only where it states the reference building uses the same classification procedure
- MC001-2022, 5.3 - Clase energetice aferente diverselor categorii de cladiri/unitati de cladire
- MC001-2022, Tabel 5.6 - utility inclusion/convention table used by 5.3 and 5.4.2.1; verified for mandatory/optional utility flags and Nota 4 threshold recalculation
- MC001-2022, Tabel 5.7 - Clase energetice si de mediu pentru cladiri de locuit individuale
- MC001-2022, Tabel 5.8 - Clase energetice si de mediu pentru cladiri de locuit colective
- MC001-2022, Tabel 5.9 - Clase energetice si de mediu pentru cladiri de birouri
- MC001-2022, Tabel 5.10 - Clase energetice si de mediu pentru cladiri destinate invatamantului
- MC001-2022, Tabel 5.11 - Clase energetice si de mediu pentru cladiri destinate sistemului sanitar
- MC001-2022, Tabel 5.12 - Clase energetice si de mediu pentru cladiri cu servicii de comert
- MC001-2022, Tabel 5.13 - Clase energetice si de mediu pentru cladiri pentru turism
- MC001-2022, Tabel 5.14 - Clase energetice si de mediu pentru cladiri pentru activitati sportive
- MC001-2022, 5.4.1.1 - Date de iesire
- MC001-2022, Tabel 5.15a - Datele de iesire in cazul performantei energetice calculate
- MC001-2022, 5.4.2.1 - Combinatie de utilitati ale cladirii incluse in PEC in fiecare spatiu
- MC001-2022, 5.4.2.2 - Aria de referinta a pardoselii si volumul de aer al cladirii
- MC001-2022, 5.4.2.3 - Normalizare la marimea de referinta a cladirii

Extraction status: `partial_class_interval_and_utility_threshold_helpers_created`

Implementation relevance:

- This module defines the source tables and rules for MC001 energy classes, environmental/CO2 classes, and certificate-like output indicators.
- Class threshold tables 5.7-5.14 are now represented in the reviewed numeric registry `src/physics-engine/datasets/mc001EnergyClassThresholds.mjs`.
- Future calculators must use the reviewed class-threshold registry/dataset, not inline constants.
- This module depends on module `13_final_primary_co2_rer` for final/primary/CO2 indicators and module `14_reference_building` for reference-building comparison.
- `FIXTURE_012_RER_DISPLAY_RECONCILIATION` validates Anexa B displayed RER arithmetic as a narrow fixture.
- `FIXTURE_013_ENERGY_CLASS_ASSIGNMENT` validates explicit Tabel 5.7-5.14 interval assignment from reviewed threshold rows.
- `FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION` validates Tabel 5.6 utility inclusion flags and Nota 4 optional-utility threshold subtraction from explicit inputs.
- Anexa B class labels remain blocked because reference-building classification, virtual mandatory utilities, overheating/mixed-use handling, displayed class-label source context, and certificate workflow are not implemented in this pass.

LaCurent disclaimer:

- This extraction supports a MC001-like Physics Engine.
- It is not sufficient for issuing an official energy performance certificate.
- LaCurent must not claim official certificate issuance based on this extraction alone.

## Concepts to extract

Certificat de performanta energetica:

- A legal/technical document that indicates the calculated energy performance under predefined comfort conditions.
- For LaCurent, this remains documentation context only unless official certification workflow, auditor responsibility, and full normative datasets are explicitly supported.

CPE / PEC:

- The user-facing abbreviation CPE refers to the energy performance certificate context.
- MC001 text also uses PEC for performance-energy calculation/indicator context.
- LaCurent should treat this module as certificate-like indicator extraction, not certificate issuance.

Energy class:

- Classification of calculated specific energy performance using threshold tables by building category and service/utility.
- MC001 tables define classes from `A+` through `G`.

Primary energy indicator:

- Specific annual primary energy, normalized by reference floor area, used in class tables and certificate-like output.
- Inputs come from module `13_final_primary_co2_rer`.

CO2 indicator:

- Specific equivalent CO2 emissions, normalized by reference floor area, used for environmental/pollution class tables.
- Inputs come from module `13_final_primary_co2_rer`.

Reference building role:

- MC001 5.2 states reference-building final/primary energy is calculated with the same procedures as the real building while accounting for reference-building particulars.
- Classification of the reference building follows the same procedure as the real building.

Specific annual energy per area:

- MC001 normalizes performance to reference floor area `Ause` in 5.4.2.2-5.4.2.3.
- Useful area alone must not be used if `Ause` is not traceably defined.

Delivered/final/primary relationship:

- Final energy by service/carrier is converted to primary energy and CO2 in module `13_final_primary_co2_rer`.
- Class thresholds use specific primary energy and specific CO2 values, not useful energy directly.

Certificate output indicators:

- Tabel 5.15a lists annual total and utility/zone output indicators including specific energy performance, RER, exported energy, delivered energy, and utility-specific values.

Difference between calculating indicators and issuing official certificate:

- The Physics Engine may calculate traced indicators.
- Official certificate issuance requires the full MC001 procedure, complete normative datasets, valid professional context, and certificate template/output rules outside this module.

## Formula/rule registry entries

### Rule 1 - Certificate concept

| Field | Value |
| --- | --- |
| ruleId | `MC001_1_1_5_CERTIFICATE_CONCEPT` |
| labelRo | Certificat de performanta energetica |
| ruleText | A certificate is a legal/technical document indicating calculated energy performance under predefined comfort conditions and includes primary/final energy, renewable energy, and equivalent CO2 information. |
| output/impact | LaCurent may compute indicators, but must not present them as an official certificate. |
| MC001 reference | MC001-2022, 1.1.5 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Use as disclaimer/semantic guard only; not a calculator rule. |
| validation notes | UI/report wording must not imply official certificate issuance unless a separate official workflow exists. |

### Rule 2 - Indicator PEC concept

| Field | Value |
| --- | --- |
| ruleId | `MC001_1_1_5_PEC_INDICATOR_CONCEPT` |
| labelRo | Indicator PEC |
| ruleText | A PEC indicator is a calculated or measured value defining an energy characteristic of the assessed object, used for class assignment, performance requirement checks, or certificate completion. |
| output/impact | Defines the indicator layer that receives outputs from physics/system/factor modules. |
| MC001 reference | MC001-2022, 1.1.5 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Indicators must include unit, source, assumptions, warnings, and trace before classification. |
| validation notes | Do not classify when the indicator value or denominator area is missing. |

### Rule 3 - Energy classes by utility and building category

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_3_CLASSES_BY_UTILITY_AND_CATEGORY` |
| labelRo | Clase energetice pe utilitati si categorii de cladiri |
| ruleText | MC001 defines energy classes by utilities and by building categories. Categories include residential individual, residential collective, offices, commerce, education, healthcare, tourism, sports, and other buildings mapped by similarity. |
| output/impact | Class lookup requires both building category and utility/total indicator context. |
| MC001 reference | MC001-2022, 5.3 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Do not use one universal threshold set across all building categories. |
| validation notes | Unknown building category must return a missing/needs-clarification status, not a guessed class. |

### Rule 4 - Energy utilities included in classification

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_3_CLASSIFICATION_UTILITIES` |
| labelRo | Utilitati energetice pentru clasificare |
| ruleText | MC001 5.3 identifies utilities as heating, DHW, cooling, mechanical ventilation, and lighting; utility inclusion follows the conventions in Tabel 5.6. |
| output/impact | Service-level indicators and total indicators must be aligned with MC001 utility inclusion rules. |
| MC001 reference | MC001-2022, 5.3; Tabel 5.6 |
| status | `reviewed_table_rule` |
| implementationAllowed | `true` |
| implementation notes | Implemented only as isolated `utilityInclusionThresholds.mjs` metadata for mandatory/optional flags; no virtual-system consumption or certificate workflow. |
| validation notes | Do not treat missing cooling/mechanical ventilation as zero unless MC001 applicability rules and threshold recalculation are applied. |

### Rule 5 - Interval boundary rule for class thresholds

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_3_CLASS_INTERVAL_BOUNDARIES` |
| labelRo | Regula limitelor de clasa |
| ruleText | Values in Tabelele 5.7-5.14 delimit intervals considered open on the left and closed on the right. |
| output/impact | A value exactly equal to a threshold belongs to the better class interval on the left-to-right class scale. |
| MC001 reference | MC001-2022, 5.3, Nota 1 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Boundary tests must include exact-threshold cases. |
| validation notes | Do not use inclusive lower bounds for the worse class at a shared threshold. |

### Rule 6 - Apartment threshold table selection

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_3_APARTMENT_TABLE_SELECTION` |
| labelRo | Selectia pragurilor pentru apartamente |
| ruleText | For apartments, MC001 states that apartments in houses use Tabel 5.7 values, while apartments in blocks use Tabel 5.8 values. |
| output/impact | Apartment classification requires building context: house/apartment in house vs block/multifamily. |
| MC001 reference | MC001-2022, 5.3, Nota 2 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | `buildingEnergyClassType` must distinguish individual/house and collective/block contexts. |
| validation notes | Unknown apartment context must return clarification/warning rather than aggressive classification. |

### Rule 7 - Overheating/discomfort indicator when cooling is absent

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_3_COOLING_ABSENT_OVERHEATING_INDICATOR` |
| labelRo | Indicator de disconfort la lipsa racirii |
| ruleText | For buildings without a cooling system, MC001 requires calculating a discomfort/overheating indicator as annual hours when indoor temperature exceeds 26 degC, referencing chapter 2.8.6. |
| output/impact | Missing cooling does not automatically mean zero cooling-related assessment context. |
| MC001 reference | MC001-2022, 5.3, Nota 3 |
| status | `external_module_needed` |
| implementationAllowed | `false` |
| implementation notes | Chapter 2.8.6 is not extracted here. |
| validation notes | Do not implement overheating hours until the source method is extracted. |

### Rule 8 - Recalculate thresholds when non-mandatory utilities are absent

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_3_RECALCULATE_THRESHOLDS_FOR_MISSING_NON_MANDATORY_UTILITIES` |
| labelRo | Recalcularea limitelor cand lipsesc utilitati neobligatorii |
| ruleText | If one or more non-mandatory utilities are absent, total primary-energy limits and CO2/environmental limits from Tabelele 5.7-5.14 must be recalculated by subtracting the absent utility contribution according to MC001 Nota 4. |
| output/impact | Total class thresholds may change depending on applicable/missing optional utilities. |
| MC001 reference | MC001-2022, 5.3, Nota 4 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Requires service-level threshold values and CO2 conversion factors from reviewed datasets. |
| validation notes | Do not classify with unadjusted total thresholds when MC001 requires adjustment. |

### Rule 9 - Mixed or unusual building destination thresholds

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_3_MIXED_DESTINATION_WEIGHTED_THRESHOLDS` |
| labelRo | Praguri pentru destinatii mixte sau neuzuale |
| ruleText | For buildings with main destinations different from usual categories in Tabelele 5.7-5.14, limits are established as area-weighted averages of threshold values for zones that can be assimilated to listed categories. |
| output/impact | Mixed-use classification needs zone areas and category mapping. |
| MC001 reference | MC001-2022, 5.3, Nota 5 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Requires explicit zone/category mapping; do not guess similar category. |
| validation notes | Missing zone area or destination mapping must block mixed-use class calculation. |

### Rule 10 - Reference building classification procedure

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_BUILDING_CLASSIFICATION_PROCEDURE` |
| labelRo | Incadrarea cladirii de referinta |
| ruleText | MC001 states that the associated reference building is classified using the same procedure as the real building. |
| output/impact | Reference building and real building use the same class lookup rules, but different input performance values. |
| MC001 reference | MC001-2022, end of 5.2 and 5.3 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Do not mix real and reference indicators in one classification result. |
| validation notes | Missing reference building result must not be silently replaced with real building values. |

### Rule 11 - Assumed system principle for PEC utilities

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_4_2_1_ASSUMED_SYSTEM_FOR_MISSING_MANDATORY_UTILITIES` |
| labelRo | Principiul sistemului asumat |
| ruleText | MC001 5.4.2.1 states that for each mandatory utility not provided, consumption of an implicit technical system is calculated and missing mandatory utilities are identified in the certificate annex. |
| output/impact | Certificate indicators may include virtual/assumed utilities according to MC001 rules. |
| MC001 reference | MC001-2022, 5.4.2.1; Tabel 5.6 |
| status | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Requires full extraction of Tabel 5.6 and relevant service calculation rules. |
| validation notes | Do not invent virtual-system consumption. |

### Rule 12 - Residential ventilation handling when no mechanical ventilation exists

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_3_RESIDENTIAL_NO_MECHANICAL_VENTILATION_RULE` |
| labelRo | Ventilare rezidentiala fara sistem mecanic |
| ruleText | For residential buildings without dedicated centralized or centrally controlled individual mechanical ventilation, MC001 states no electrical ventilation consumption is calculated, but energy for heating/cooling ventilation air is calculated using the larger of minimum fresh-air norm and infiltration air changes. |
| output/impact | Separates ventilation fan electricity from thermal treatment of ventilation air. |
| MC001 reference | MC001-2022, 5.3 / Tabel 5.6 explanatory text |
| status | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Requires ventilation/infiltration inputs and the missing fresh-air normative source. |
| validation notes | Do not set all ventilation effects to zero when mechanical ventilation is absent. |

### Rule 13 - Non-residential virtual ventilation consumption

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_3_NON_RESIDENTIAL_VIRTUAL_VENTILATION_CONSUMPTION` |
| labelRo | Consum virtual de ventilare pentru nerezidential |
| ruleText | For non-residential buildings without dedicated centralized mechanical ventilation, MC001 imposes virtual electric ventilation consumption corresponding to class E maximum consumption depending on building category. |
| output/impact | Non-residential ventilation may need assumed/virtual electric consumption for PEC. |
| MC001 reference | MC001-2022, 5.3 / Tabel 5.6 explanatory text |
| status | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Requires table/category values and service threshold dataset before implementation. |
| validation notes | Do not implement example values as general defaults. |

### Rule 14 - Certificate output indicator list

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_15A_CERTIFICATE_OUTPUT_INDICATORS` |
| labelRo | Date de iesire pentru performanta energetica calculata |
| ruleText | Tabel 5.15a lists annual total and service/zone outputs including specific energy performance, RER, exported energy, delivered energy, and utility/zone performance indicators. |
| output/impact | Defines indicator families available for certificate-like outputs. |
| MC001 reference | MC001-2022, 5.4.1.1, Tabel 5.15a |
| status | `indexed_table_rule` |
| implementationAllowed | `true` |
| implementation notes | Values are calculated by other modules; this table indexes output fields, not formulas. |
| validation notes | Do not display an indicator unless its source calculation status is valid or clearly warning-labeled. |

### Formula 15 - Specific primary energy indicator

| Field | Value |
| --- | --- |
| formulaId | `MC001_CERTIFICATE_SPECIFIC_PRIMARY_ENERGY` |
| labelRo | Indicator specific de energie primara |
| formulaText | `EPspecific = EP / Ause` |
| output/impact | Produces kWh/m2.an indicator used for class threshold lookup. |
| MC001 reference | MC001-2022, 5.4.2.2 and 5.4.2.3; derived normalization indicator from defined reference floor area |
| status | `derived_indicator_from_mc001_context` |
| implementationAllowed | `true` |
| implementation notes | Use only when primary energy and `Ause` are available and traced. |
| validation notes | `Ause > 0`; primary energy source and factor family must be explicit. |

### Formula 16 - Specific CO2 indicator

| Field | Value |
| --- | --- |
| formulaId | `MC001_CERTIFICATE_SPECIFIC_CO2` |
| labelRo | Indicator specific de emisii echivalente CO2 |
| formulaText | `ECO2specific = ECO2 / Ause` |
| output/impact | Produces kgCO2/m2.an indicator used for environmental/pollution class lookup. |
| MC001 reference | MC001-2022, 5.4.2.2 and 5.4.2.3; derived normalization indicator from defined reference floor area |
| status | `derived_indicator_from_mc001_context` |
| implementationAllowed | `true` |
| implementation notes | Use only when CO2 and `Ause` are available and traced. |
| validation notes | `Ause > 0`; do not confuse CO2 class with energy class. |

### Rule 17 - Renewable contribution indicator

| Field | Value |
| --- | --- |
| ruleId | `MC001_CERTIFICATE_RER_INDICATOR` |
| labelRo | Indicator RER in datele de iesire |
| ruleText | Tabel 5.15a includes renewable energy contribution `RER` as an annual output indicator; the formula and factor context are extracted in module 13. |
| output/impact | Certificate-like output may include RER only after module 13/12 inputs are valid. |
| MC001 reference | MC001-2022, 5.4.1.1, Tabel 5.15a; 5.4.2.9 |
| status | `external_module_needed` |
| implementationAllowed | `false` |
| implementation notes | Cross-reference `13_final_primary_co2_rer` and future `12_renewables`. |
| validation notes | Do not compute RER without renewable primary-energy perimeter rules. |

## Required class/certificate tables

| dataKey | neededFor | MC001 source | unit | lookup keys | extractionStatus | implementationAllowed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `energyClassThresholds` | Energy class A+...G | MC001-2022, Tabele 5.7-5.14 | kWh/(m2.an) | building category, utility or total, class boundary | `reviewed_numeric_values_extracted` | `true` | Registry file: `src/physics-engine/datasets/mc001EnergyClassThresholds.mjs`; contains reviewed numeric interval rows for Tabel 5.7-5.14. Explicit class interval lookup is implemented separately in `energyClassAssignment.mjs`; certificate workflow is not implemented here. |
| `cpeThresholds` | Certificate/class threshold lookup | MC001-2022, Tabele 5.7-5.14 | kWh/(m2.an), kgCO2/(m2.an) | building category, indicator type, utility/total, class | `reviewed_numeric_values_extracted` | `true` | Same threshold sources as energy/environmental classes; available as a dataset lookup only, not as certificate workflow. |
| `certificateIndicatorList` | Certificate-like output indicators | MC001-2022, 5.4.1.1, Tabel 5.15a | mixed units | annual total, service/utility, zone, exported/delivered/RER indicators | `indexed_table` | `true` | Output fields are identified; calculations come from other modules. |
| `referenceBuildingComparisonValues` | Reference comparison context | MC001-2022, 5.2 and module `14_reference_building` | mixed units | real/reference model, building category, service/total indicator | `external_module_needed` | `false` | Depends on reference-building datasets and calculation completion. |
| `classByBuildingCategory` | Select correct class table | MC001-2022, 5.3; Tabele 5.7-5.14 | not applicable | category 1a, 1b, 2, 3, 4, 5, 6, 7, and category 8 by similarity | `indexed_table` | `true` | Unknown category 8 mapping needs explicit user/expert decision. |
| `nZEBThresholds` | NZEB/class relation and reference context | MC001-2022, 5.2; Chapter 2.3 referenced by 5.2 | kWh/(m2.an), kgCO2/(m2.an) | building status/category, climate zone, performance target | `external_module_needed` | `false` | Belongs to minimum/reference/performance modules, not fully extracted here. |
| `primaryEnergySpecificIndicator` | Energy class lookup | MC001-2022, 5.4.2.2, 5.4.2.3; module `13_final_primary_co2_rer` | kWh/(m2.an) | `EP`, `Ause`, factor family, service/total | `derived_indicator_from_mc001_context` | `true` | Denominator area must be explicit and traced. |
| `co2SpecificIndicator` | Environmental/pollution class lookup | MC001-2022, 5.4.2.2, 5.4.2.3; Tabele 5.7-5.14 | kgCO2/(m2.an) | `ECO2`, `Ause`, service/total, category | `derived_indicator_from_mc001_context` | `true` | Requires valid CO2 result from module 13. |
| `renewableContributionIndicator` | RER output | MC001-2022, 5.4.1.1, Tabel 5.15a; 5.4.2.9 | `-` | renewable perimeter, `EPren`, `EPtot` | `external_module_needed` | `false` | Formula context in module 13; renewable source extraction still pending. |
| `certificateTemplateFields` | Official certificate layout/output fields | Certificate model/annex beyond this pass | mixed units | certificate section/field | `needs_source_table` | `false` | This module indexes calculated indicators, not the complete official certificate template. |
| `utilityInclusionRules` | Mandatory/optional utilities and threshold recalculation context | MC001-2022, 5.3, Tabel 5.6; 5.4.2.1 | flags / utility ids | building category, utility id, mandatory/optional flag, calculation variable | `reviewed_table_values_extracted` | `true` | Isolated helper validates mandatory/optional flags and Nota 4 threshold subtraction only; virtual systems, overheating indicator, mixed-use averaging, and certificate workflow remain blocked. |

## Cross-references

- Final/primary/CO2 formulas cross-reference `13_final_primary_co2_rer`.
- Reference building rules cross-reference `14_reference_building`.
- Climate data cross-reference `17_climate_annex`.
- Renewables cross-reference `12_renewables`.
- Envelope thresholds cross-reference `04_minimum_envelope_requirements`.
- This module does not calculate useful demand.

## Missing-input behavior

If class threshold table is missing, future calculators must return:

`status: cannot_calculate_energy_class_missing_threshold_table`

If the class threshold table is identified but the specific building category/utility threshold value is not present in a reviewed registry/dataset, future calculators must return:

`status: cannot_calculate_energy_class_missing_threshold_table`

If primary/CO2/final energy indicators are missing, future calculators must return:

`status: cannot_calculate_certificate_indicators_missing_inputs`

If reference building comparison is required but missing, future calculators must return:

`status: cannot_calculate_cpe_missing_reference_building`

If `Ause` or the normalization denominator is missing, future calculators must return:

`status: cannot_calculate_certificate_indicators_missing_reference_area`

The reviewed registry now contains the numeric values for Tabel 5.7-5.14, `energyClassAssignment.mjs` can assign an interval class only when source table, category, indicator basis, indicator key and indicator value are explicit, and `utilityInclusionThresholds.mjs` can adjust explicit total/CO2 thresholds for missing optional utilities. Future certificate calculators must still return missing-input statuses when reference area, primary/CO2 indicator values, reference-building context, certificate class-label context, or required virtual-system inputs are absent.

No invented class thresholds are allowed.

No hardcoded class threshold values should live inside calculators.

## Implementation implications for LaCurent

- LaCurent must not claim official certificate issuance.
- Energy class must come from MC001 thresholds, not arbitrary labels.
- CPE/reference comparison must use MC001 reference building.
- Missing threshold rows, missing category mapping, missing indicator values, unresolved reference-building context, or unresolved certificate class-label context should block class assignment.
- Boundary handling must follow MC001 Nota 1: intervals are open on the left and closed on the right.
- Report UI may display preliminary/non-official indicators only if status/warnings make this clear, but this module does not implement UI.
- Do not use Salicea or demo defaults.

## Implementation boundary

- Isolated helper `src/physics-engine/energyClassAssignment.mjs` created for explicit Tabel 5.7-5.14 interval lookup only.
- Isolated helper `src/physics-engine/utilityInclusionThresholds.mjs` created for Tabel 5.6 utility inclusion flags and Nota 4 threshold recalculation only.
- No production flow changed.
- No UI changed.
- Dataset validation tests were added for the reviewed threshold registry only.
- Class-assignment unit tests and Fixture 013 were added for explicit interval semantics only.
- Utility-inclusion unit tests and Fixture 014 were added for explicit mandatory/optional flags and threshold subtraction only.
- No Anexa B class-label, CPE, or certificate workflow tests added.
- Anexa B displayed RER arithmetic is validated separately by Fixture 012; this module still does not authorize certificate generation.
- Next safe class-related validation step must keep Anexa B displayed class labels blocked until certificate/reference-building boundaries, virtual mandatory utilities, overheating indicator handling, and mixed-use averaging are independently validated.
