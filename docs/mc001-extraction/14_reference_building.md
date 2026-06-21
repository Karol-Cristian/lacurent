# 14 Reference Building

Source document:

- `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

MC001 sections used:

- MC001-2022, 1.1.5 - Performanta energetica: cladire de referinta, valoare de referinta, indicator PEC
- MC001-2022, 5.2 - Cladirea de referinta / unitatea de cladire de referinta
- MC001-2022, 5.3 - Clase energetice aferente diverselor categorii de cladiri/unitati de cladire, only for the note that reference-building classification follows the same procedure as the real building
- MC001-2022, Tabel 5.5 - Raportul dintre aria ferestrelor si aria pardoselii incaperilor in functie de destinatie/functiune
- MC001-2022, Chapter 2.2 / 2.3 referenced by 5.2 for reference envelope and performance values
- MC001-2022, Chapter 5 factor tables cross-referenced by 5.2 and extracted/indexed in `13_final_primary_co2_rer`

Extraction status: `partial_needs_verification`

Implementation relevance:

- This module defines how a MC001 reference building is related to the real building.
- It separates attributes copied from the real building from attributes replaced by reference values.
- Several system reference values are textually extracted from MC001 section 5.2, but complete implementation still depends on envelope tables, climate data, factor tables, and external ventilation standards.
- This module is not enough to build `ReferenceBuildingBuilder` yet.

LaCurent disclaimer:

- This extraction supports a MC001-like Physics Engine.
- It is not sufficient for issuing an official energy performance certificate.
- Reference-building comparison must not be presented as an official certificate result unless all normative inputs, datasets, and procedural checks are complete.

## Concepts to extract

Cladire reala:

- The assessed building or building unit, with actual geometry, envelope, systems, location, use, and technical data.
- In LaCurent this is the user/DB-derived model.

Cladire de referinta:

- A virtual building associated with the real building and used to compare real thermal and energy characteristics against regulated reference values.
- It uses the same geometry-related basis as the real building, but replaces relevant performance characteristics with MC001 reference values.

Same geometry / same use / same climate assumptions:

- MC001 section 5.2 states the reference model uses the same geometric form, volume, envelope area, element areas, orientation, and geographic location as the real building.
- For LaCurent, these are copied inputs, not recalculated from arbitrary defaults.

Reference envelope:

- The envelope of the reference building uses recommended/corrected thermal resistance requirements from MC001-referenced tables, depending on building status/category.
- Actual material layers, actual U-values, and actual thermal bridges from the real building must not be copied as performance values.

Reference systems:

- Heating, DHW, cooling, mechanical ventilation, lighting, auxiliary energy, and renewables use reference assumptions/rules from MC001 5.2 and referenced technical regulations.
- The real building's actual system performance must not be reused as reference performance.

Reference final/primary energy:

- MC001 states final/primary energy for the reference building is determined with the same calculation procedures as for the real building, while respecting the reference-building particulars.
- Factor conversion belongs to module `13_final_primary_co2_rer`.

CPE/reference comparison context:

- The reference building is used for comparison and CPE completion/conformity checks.
- This module does not assign energy classes; energy class rules belong to `15_energy_classes_and_certificate`.

What must not be changed between real and reference building:

- Geometric form, volume, total envelope area, envelope-element areas, orientation, and geographic placement must remain aligned with the real building where MC001 states this.
- Climate and standard calculation conditions must remain traceable and must not be replaced by project-specific shortcuts.

## Formula/rule registry entries

### Rule 1 - Reference building concept

| Field | Value |
| --- | --- |
| ruleId | `MC001_1_1_5_REFERENCE_BUILDING_CONCEPT` |
| labelRo | Conceptul de cladire de referinta |
| ruleText | Cladirea de referinta is a virtual building with the same geometric characteristics as the real building and with regulated/reference thermal and performance requirements. |
| output/impact | Establishes reference building as a separate model, not a mutation of the real building. |
| MC001 reference | MC001-2022, 1.1.5 - Performanta energetica a cladirii de referinta |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Use as model separation rule: `RealBuilding` and `ReferenceBuilding` must have separate performance values. |
| validation notes | Reference result must identify which values were copied and which were substituted. |

### Rule 2 - Reference values for comparison

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_VALUES_FOR_COMPARISON` |
| labelRo | Comparatie cu valori de referinta |
| ruleText | The reference building allows comparison of the real building's thermal and energy characteristics with recommended reference values from MC001 chapters 2.2 and 2.3. |
| output/impact | Reference comparison should use MC001 reference values, not arbitrary product defaults. |
| MC001 reference | MC001-2022, 5.2 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Comparison must cite the reference table or rule used for each substituted value. |
| validation notes | Missing reference table/value must block the affected comparison component. |

### Rule 3 - Geometry copied from real building

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_GEOMETRY_COPY` |
| labelRo | Geometria cladirii de referinta |
| ruleText | The reference building has the same geometric form, volume, total envelope area, envelope-element areas, orientation, and geographic placement as the real building. |
| output/impact | Defines copied attributes from real building into reference building. |
| MC001 reference | MC001-2022, 5.2, numbered characteristics 1-3 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Copy geometry explicitly; do not derive new geometry from useful area or square-footprint assumptions. |
| validation notes | If any copied geometry input is missing from the real building, reference comparison must report `missingRealInputs`. |

### Rule 4 - Window/floor ratio check

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_WINDOW_FLOOR_RATIO_CHECK` |
| labelRo | Verificarea raportului ferestre/pardoseala |
| ruleText | MC001 5.2 references checking the ratio between translucent surface area and useful area according to building destination, with lookup values in Tabel 5.5. |
| output/impact | Reference geometry/envelope validation may require a window-to-floor ratio check. |
| MC001 reference | MC001-2022, 5.2 characteristic 2; Tabel 5.5 |
| status | `indexed_table_rule` |
| implementationAllowed | `false` |
| implementation notes | Tabel 5.5 is indexed here but not copied into a dataset. Do not enforce until lookup values are extracted. |
| validation notes | Requires room/building destination and window/floor areas. |

### Rule 5 - Reference envelope performance

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_ENVELOPE_PERFORMANCE` |
| labelRo | Performanta de referinta a anvelopei |
| ruleText | Reference envelope performance is based on recommended corrected thermal resistance values in the MC001 tables referenced by 5.2, with different references for NZEB and existing renovated buildings. |
| output/impact | Replaces real envelope performance with MC001 reference envelope values. |
| MC001 reference | MC001-2022, 5.2; Chapter 2.2.1, Chapter 2.2.2; Tabele 2.4, 2.7, 2.9a, 2.9b |
| status | `indexed_table_rule` |
| implementationAllowed | `false` |
| implementation notes | Table sources are identified, but complete values/lookup mapping are not fully extracted in this module. |
| validation notes | Do not use real U/R values as reference U/R values. Missing reference element type must return `cannot_calculate_reference_building_missing_reference_parameter`. |

### Rule 6 - Reference energy and CO2 performance context

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_PERFORMANCE_CONTEXT` |
| labelRo | Performanta energetica si de poluare a cladirii de referinta |
| ruleText | MC001 5.2 relates the reference building to primary-energy and CO2 performance values from Chapter 2.3, including class A/A+ context for NZEB and maximum values for renovated buildings. |
| output/impact | Defines which performance targets/tables must be consulted for reference comparison. |
| MC001 reference | MC001-2022, 5.2; Chapter 2.3; Tabel 2.10b |
| status | `indexed_table_rule` |
| implementationAllowed | `false` |
| implementation notes | Requires extraction of Chapter 2.3 performance tables before implementation. |
| validation notes | Do not substitute energy-class thresholds from module 15 for reference-building performance tables unless MC001 explicitly links them. |

### Rule 7 - Conversion and emission factors

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_FACTOR_TABLES` |
| labelRo | Factori de conversie si emisii pentru cladirea de referinta |
| ruleText | Primary-energy and CO2/refrigerant emission conversion factors must come from the MC001 Chapter 5 factor tables. |
| output/impact | Reference primary energy and CO2 must use the same sourced factor datasets as the real building. |
| MC001 reference | MC001-2022, 5.2 characteristic 5; Chapter 5 factor tables |
| status | `external_module_needed` |
| implementationAllowed | `false` |
| implementation notes | Use module `13_final_primary_co2_rer` once factor values are loaded into a reviewed registry/dataset. |
| validation notes | Missing factor value must return `cannot_calculate_primary_or_co2_missing_energy_factor`. |

### Rule 8 - Reference fresh-air requirements

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_FRESH_AIR_REQUIREMENTS` |
| labelRo | Debit de aer proaspat pentru cladirea de referinta |
| ruleText | Fresh-air requirements follow minimum provisions from I5/2010 and the national annex to SR EN 16798-1, as applicable at certificate date. |
| output/impact | Reference ventilation airflow cannot be invented from area alone. |
| MC001 reference | MC001-2022, 5.2 characteristic 6 |
| status | `external_normative_reference` |
| implementationAllowed | `false` |
| implementation notes | Requires an extracted ventilation reference dataset or explicit user-provided source. |
| validation notes | Missing reference ventilation value must return `cannot_calculate_reference_building_missing_reference_parameter`. |

### Rule 9 - Reference heating source selection

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_HEATING_SOURCE_SELECTION` |
| labelRo | Sursa de caldura de referinta |
| ruleText | If the real building is connected to district heating, the reference source is a compact substation connected to the district system; otherwise the reference source is an own gas-fired boiler with storage DHW. |
| output/impact | Selects reference heating/DHW source based on district-heating availability. |
| MC001 reference | MC001-2022, 5.2 characteristic 7 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Requires explicit input for district-heating connection. If ambiguous, ask/return missing input. |
| validation notes | Do not copy the real fuel or real boiler efficiency into the reference system. |

### Rule 10 - District heating reference performance

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_DISTRICT_HEATING_PERFORMANCE` |
| labelRo | Performanta de referinta pentru sistem districtual |
| ruleText | For district-connected real buildings, MC001 5.2 states 15% internal heating losses relative to reference heating demand and 85% heat-transfer efficiency for compact substation heat exchangers. |
| output/impact | Provides reference losses/efficiency for district heating path. |
| MC001 reference | MC001-2022, 5.2 characteristic 8 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Values are extracted here for documentation only; future calculators must load them from a reviewed registry, not inline constants. |
| validation notes | Applies only when district heating is the selected reference path. |

### Rule 11 - Own gas boiler reference performance

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_OWN_HEATING_PERFORMANCE` |
| labelRo | Performanta de referinta pentru centrala proprie |
| ruleText | For own heating systems, MC001 5.2 refers to modern new equipment, gives a condensing gas boiler example, states total production/use heat efficiency of 95% based on higher heating value, and states 15% internal losses relative to reference heating demand. |
| output/impact | Provides reference efficiency/losses for non-district heating path. |
| MC001 reference | MC001-2022, 5.2 characteristic 9 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Requires explicit non-district path and registry-backed values before implementation. |
| validation notes | Do not apply to district heating path. Do not infer actual real-building gas availability unless input says so. |

### Rule 12 - Heating metering and control assumptions

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_HEATING_CONTROL` |
| labelRo | Contorizare si reglaj pentru incalzire |
| ruleText | MC001 5.2 includes heat-metering for district-connected buildings and thermal/hydraulic regulation for the internal heating system. |
| output/impact | Defines reference system control assumptions. |
| MC001 reference | MC001-2022, 5.2 characteristics 10-11 |
| status | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Needs later mapping to system-efficiency or auxiliary-energy effects before implementation. |
| validation notes | Do not convert this textual rule into numeric savings without extracted formulas. |

### Rule 13 - Reference DHW system

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_DHW_SYSTEM` |
| labelRo | Sistem ACC de referinta |
| ruleText | The reference DHW system is recirculating, uses modern new equipment, and MC001 5.2 states 15% internal losses on use/distribution/storage relative to useful DHW energy for the reference building. |
| output/impact | Provides reference DHW system assumptions. |
| MC001 reference | MC001-2022, 5.2 characteristic 12 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Useful DHW demand comes from module `09_dhw_systems`; final DHW system energy remains dependent on extracted loss/system formulas. |
| validation notes | Do not copy the real DHW source/fuel into reference building. |

### Rule 14 - Reference cooling system

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_COOLING_SYSTEM` |
| labelRo | Sistem de racire de referinta |
| ruleText | If the real building/unit has cooling, MC001 5.2 defines a direct-expansion reference cooling system with SEER 2.5, without indoor humidity control, sized according to technical regulations; no internal distribution/terminal/storage losses are recorded for this reference rule. |
| output/impact | Provides reference cooling system assumptions where cooling is applicable. |
| MC001 reference | MC001-2022, 5.2 characteristic 13 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Applies only if cooling exists/is required in the real building context. |
| validation notes | Do not create cooling energy when MC001/category applicability says it is not applicable. |

### Rule 15 - Reference mechanical ventilation

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_MECHANICAL_VENTILATION` |
| labelRo | Ventilare mecanica de referinta |
| ruleText | MC001 5.2 states that the reference mechanical ventilation system uses modern new equipment and a central heat recovery unit with 75% annual average efficiency. |
| output/impact | Provides reference heat-recovery assumption for mechanical ventilation. |
| MC001 reference | MC001-2022, 5.2 characteristic 14 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Fresh-air flow still depends on external ventilation requirements. |
| validation notes | Do not credit heat recovery unless the reference mechanical ventilation path is applicable and airflow is known. |

### Rule 16 - Reference lighting

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_LIGHTING` |
| labelRo | Iluminat de referinta |
| ruleText | MC001 5.2 states that reference lighting uses modern new LED luminaires sized to meet minimum national lighting levels; for non-residential buildings it includes daylight sensors and presence sensors according to the stated density rule. |
| output/impact | Provides qualitative lighting reference assumptions. |
| MC001 reference | MC001-2022, 5.2 characteristic 15 |
| status | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Numeric lighting power, schedules, and illuminance requirements must be extracted before calculation. |
| validation notes | Do not create lighting kWh from LED label alone. |

### Rule 17 - Auxiliary energy share

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_AUXILIARY_ENERGY_SHARE` |
| labelRo | Consum auxiliar de referinta |
| ruleText | MC001 5.2 states auxiliary electrical energy for heating, DHW, cooling, and ventilation systems at 5% of the associated final thermal/electrical energy consumption for those systems. |
| output/impact | Provides reference auxiliary-energy assumption. |
| MC001 reference | MC001-2022, 5.2 characteristic 16 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Future calculators must load the 5% value from registry/dataset and avoid double-counting auxiliary energy. |
| validation notes | Requires final energy by associated system before auxiliary calculation. |

### Rule 18 - New-building and existing-building reference renewable assumptions

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_RENEWABLE_ASSUMPTIONS` |
| labelRo | Ipoteze regenerabile pentru cladirea de referinta |
| ruleText | For new buildings/units, the reference characteristics coincide with an NZEB building defined by national regulations. For existing buildings/units, MC001 5.2 states that 10% of total primary energy is provided from renewable sources. |
| output/impact | Provides high-level reference renewable assumptions. |
| MC001 reference | MC001-2022, 5.2 characteristics 17-18 |
| status | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Requires explicit classification of new vs existing and a rule for mapping renewable contribution into carrier/service calculations. |
| validation notes | Do not invent a renewable system or carrier to satisfy the 10% assumption without a traced implementation rule. |

### Rule 19 - Reference energy calculation path

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_CALCULATION_PATH` |
| labelRo | Procedura de calcul pentru cladirea de referinta |
| ruleText | Final/primary energy for the associated reference building is determined by applying the same calculation procedures as for the real building while accounting for the reference-building particulars. Classification follows the same procedure as the real building according to chapter 5.3. |
| output/impact | Reference calculation should reuse the same engine stages, but with a separate reference input model. |
| MC001 reference | MC001-2022, end of 5.2 and start of 5.3 |
| status | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | This supports `runPhysicsSimulation(referenceBuilding)`, not mixing real and reference values in one result object. |
| validation notes | Do not silently fallback to real-building systems when a reference parameter is missing. |

## Required reference data/tables

| dataKey | neededFor | MC001 source | unit | lookup keys | extractionStatus | implementationAllowed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `referenceEnvelopeUValues` | Reference envelope substitution | MC001-2022, 5.2; Tabele 2.4, 2.7, 2.9a, 2.9b | W/(m2K), m2K/W depending table | building status, category, envelope element type | `indexed_table` | `false` | Table sources are identified but complete values and lookup mapping are not extracted here. |
| `referenceThermalResistance` | Reference corrected resistance requirements | MC001-2022, 5.2; Chapter 2.2.1 / 2.2.2 | m2K/W | building status, residential/non-residential, element type | `indexed_table` | `false` | Must be extracted in `04_minimum_envelope_requirements` or a dedicated registry dataset. |
| `referenceWindows` | Window/translucent area validation and U/R substitution | MC001-2022, 5.2; Tabel 5.5 and envelope tables | ratio or W/(m2K) | room/building destination, useful floor area, window area, window type | `indexed_table` | `false` | Tabel 5.5 is indexed, not copied. |
| `referenceVentilation` | Reference fresh air and mechanical ventilation | MC001-2022, 5.2 characteristic 6 and 14; I5/2010; SR EN 16798-1(NA) | m3/h, 1/h, or W/K depending method | building category, occupancy/use, airflow basis, ventilation system applicability | `external_module_needed` | `false` | Heat recovery efficiency 75% is extracted, but airflow requirements are external. |
| `referenceHeatingSystem` | Reference heating source and efficiency/losses | MC001-2022, 5.2 characteristics 7-11 | %, system type | district-connected yes/no; heating source path | `extracted_text_rule` | `true` | Source selection, 85%, 95%, and 15% loss rules are extracted textually; future implementation must use registry-backed values. |
| `referenceCoolingSystem` | Reference cooling system | MC001-2022, 5.2 characteristic 13 | SEER [-] | cooling applicable yes/no | `extracted_text_rule` | `true` | SEER 2.5 and direct-expansion rule extracted. |
| `referenceDHWSystem` | Reference DHW source/system/losses | MC001-2022, 5.2 characteristics 7 and 12; module `09_dhw_systems` | %, kWh | district-connected yes/no, DHW volume/use, recirculation | `extracted_text_rule` | `true` | 15% DHW internal losses extracted; useful DHW demand comes from module 09. |
| `referenceLighting` | Reference lighting energy | MC001-2022, 5.2 characteristic 15 | W, kWh or W/m2 depending later method | building category, lighting level, control type, area | `needs_source_table` | `false` | LED/control rule is extracted, but numeric lighting power and schedule data are not. |
| `referenceRenewables` | Reference renewable contribution | MC001-2022, 5.2 characteristics 17-18; module `12_renewables` | % or kWh/an | new/existing building, renewable perimeter | `extracted_text_rule` | `false` | Existing-building 10% primary-energy renewable assumption extracted; mapping to carriers/services remains unresolved. |
| `referencePrimaryEnergyFactors` | Reference primary energy | MC001-2022, Chapter 5 factor tables; module `13_final_primary_co2_rer` | kWh primary/kWh final | carrier/source, delivered/exported case | `external_module_needed` | `false` | Factor table sources are indexed in module 13, values still need registry/dataset. |
| `referenceCO2Factors` | Reference CO2 | MC001-2022, Chapter 5 factor tables; module `13_final_primary_co2_rer` | kgCO2/kWh or kgCO2/kg refrigerant | carrier/source, refrigerant type | `external_module_needed` | `false` | Uses module 13 factor strategy. |
| `referenceArea` | Normalization and copied geometry | MC001-2022, 5.2; module `01_geometry_envelope_definitions`; module `13_final_primary_co2_rer` | m2 | reference floor area / `Ause` | `extracted` | `true` | Must be copied/traced from real building geometry where available. |
| `referenceClimateData` | Reference monthly calculation | MC001-2022, 5.2; module `17_climate_annex` | degC, h, irradiation units | location/climate dataset, month, orientation/tilt | `external_module_needed` | `false` | Climate dataset is currently blocked in module 17. |

## Cross-references

- Envelope requirements may cross-reference `04_minimum_envelope_requirements` once extracted.
- Primary/CO2 factors cross-reference `13_final_primary_co2_rer`.
- Climate data cross-reference `17_climate_annex`.
- Energy class/CPE details cross-reference `15_energy_classes_and_certificate`.
- Renewables cross-reference `12_renewables`.
- Useful and final DHW cross-reference `09_dhw_systems`.

## Missing-input behavior

If reference building parameter table is missing, future calculators must return:

`status: cannot_calculate_reference_building_missing_reference_parameter`

If a reference rule exists but a required lookup value is not available in a reviewed registry/dataset, future calculators must return:

`status: cannot_calculate_reference_building_missing_reference_parameter`

If climate data is missing, reuse:

`status: cannot_calculate_mc001_monthly_missing_climate_data`

If primary/CO2 factor datasets are missing, reuse:

`status: cannot_calculate_primary_or_co2_missing_energy_factor`

If real-building geometry required for the reference copy is missing, future calculators must return:

`status: cannot_calculate_reference_building_missing_real_geometry`

No invented reference parameters are allowed.

No Salicea/demo defaults may be used as reference-building defaults.

## Implementation implications for LaCurent

- CPE/class comparison must not compare the real building to arbitrary hardcoded defaults.
- Reference building must be generated according to MC001 rules only.
- Reference and real building must share all MC001-required unchanged attributes.
- Any substituted reference parameter must be traceable with source, assumptions, warnings, and confidence.
- `RealBuilding` and `ReferenceBuilding` should be separate input models run through the same calculation stages.
- Missing reference parameters must stop or partially block reference comparison; they must not fallback to real-building values.
- This module does not assign final energy class; that belongs to `15_energy_classes_and_certificate`.
- Do not use Salicea or demo defaults as reference building.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `15_energy_classes_and_certificate`.
