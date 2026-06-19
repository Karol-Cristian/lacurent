# 10 Lighting

Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

MC001 sections used:
- MC001-2022, 3.4 - Instalatii pentru iluminat; cuplarea cu lumina naturala
- MC001-2022, 3.4.1 - Informatii generale; alte referinte tehnice aplicabile
- MC001-2022, 3.4.2 - Metode de calcul al indicatorului LENI
- MC001-2022, 3.4.2.1 - Metoda complexa de calcul
- MC001-2022, 3.4.2.2 - Metoda simplificata de calcul
- MC001-2022, 5.2 - Caracteristicile cladirii de referinta, regula pentru iluminat
- MC001-2022, 5.4.2.6, relatia (5.3), unde energia finala include `Qf,l,i`

Extraction status: `blocked_missing_lighting_tables`

Implementation relevance:
- This module identifies the MC001 lighting calculation scope and the inputs needed by future LaCurent lighting-energy calculators.
- MC001 3.4 delegates the detailed lighting formulas and many tables to `SR EN 15193-1`, including equations 1-13, 25-34, and Annex B/E/F/G/H tables.
- The local MC001 PDF does not reproduce enough formula/table values to implement a default lighting calculation from MC001 alone.
- Lighting final energy is electricity and later feeds module `13_final_primary_co2_rer`.

LaCurent disclaimer:
- This extraction supports MC001-like implementation planning only.
- It is not an official certificate calculation.
- No lighting power density, usage hours, daylight factor, control factor, emergency-lighting value, or standby value may be invented.

## Concepts to extract

Energy for lighting:
- Electric energy used by the lighting system to provide illumination in a building or building zone.
- It matters because lighting is one of the final-energy services included in global energy performance.

Installed lighting power:
- The installed electric power of luminaires, including lamp, ballast, and other components operating at maximum power.
- MC001 requires luminaire type, count, manufacturer data, or in-situ testing when technical data is missing.

Lighting demand vs final electricity use:
- Lighting is not a thermal useful demand like heating demand.
- The lighting result is electric energy use for a selected timestep and can also contribute recoverable internal gains.

Operating hours:
- Time with daylight contribution `tD` and time without daylight `tN`.
- MC001 references SR EN 15193-1 Annex B, Table B.2 for these values.

Daylight contribution:
- The lighting calculation accounts for coupling artificial lighting with natural light.
- Daylight influence is represented by factor `FD` and related subfactors from SR EN 15193-1.

Lighting controls:
- Occupancy, constant-illuminance, and daylight control factors affect lighting energy.
- MC001 references factors `Fo`, `FC`, `FD`, `FD,C`, `FD,S`, `Fcc`, and control-type parameters from SR EN 15193-1.

Building/use category:
- The calculation applies to residential and non-residential buildings/zones when enough lighting-system data exists.
- Non-residential buildings reference lighting design standards such as SR EN 12464-1 and SR EN 12193.

Residential/non-residential applicability:
- The complex method applies to residential and non-residential buildings/zones with detailed lighting data.
- The simplified method applies in conceptual stage for residential and non-residential new or renovated buildings when only summary lighting data exists.

Reference lighting assumptions:
- MC001 reference-building rules state that reference lighting uses new modern LED luminaires designed to meet minimum national lighting levels; for non-residential buildings, daylight and presence sensors are included according to the stated density rule.
- Numeric reference lighting power, schedules, and lookup tables are not fully extracted from MC001 in this module.

Why lighting must not be guessed from usefulAreaM2 alone:
- MC001 requires luminaire data, usage/control factors, daylight access, or SR EN 15193-1 default tables.
- Area can normalize LENI, but it is not enough to calculate lighting energy unless MC001/SR EN lookup data and service category are available.

## Formula/rule registry entries

### Rule 1 - Lighting calculation source

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_4_LIGHTING_METHOD_SOURCE` |
| labelRo | Sursa metodei de calcul pentru iluminat |
| ruleText | MC001 3.4 states that lighting-energy calculation follows SR EN 15193-1, Module M9, and considers the coupling between artificial lighting and natural light. |
| unit | `not_applicable` |
| output/impact | Future calculators must use the SR EN 15193-1 method or explicitly supplied lighting energy; MC001 does not provide all needed equations/tables inline. |
| inputs | building/zone; lighting system; daylight access; control type; calculation timestep |
| MC001 reference | MC001-2022, 3.4.1; 3.4.2 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Do not implement the lighting method until the referenced SR EN 15193-1 formulas and tables are extracted into reviewed datasets. |
| validation notes | Missing SR EN method data must return missing lighting-data status, not guessed values. |

### Rule 2 - Complex lighting method applicability

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_4_2_1_LIGHTING_COMPLEX_METHOD_APPLICABILITY` |
| labelRo | Aplicabilitatea metodei complexe pentru iluminat |
| ruleText | The complex method applies to residential and non-residential buildings/zones, existing, new, or renovated, when detailed lighting-system information is available. The result may be annual, monthly, or hourly depending on the timestep of input data. |
| unit | `not_applicable` |
| output/impact | Selects a detailed lighting calculation path only when detailed system inputs are available. |
| inputs | luminaire type and count; controls; maintenance factor; luminaire technical powers; timestep |
| MC001 reference | MC001-2022, 3.4.2.1 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | This is an applicability rule only. The actual formulas are referenced from SR EN 15193-1 equations 1-13. |
| validation notes | If detailed system data is missing, complex method cannot be selected. |

### Rule 3 - Complex method required inputs

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_4_2_1_LIGHTING_COMPLEX_METHOD_INPUTS` |
| labelRo | Date de intrare pentru metoda complexa |
| ruleText | MC001 lists required inputs: luminaire type with unique code and technical data; number of luminaires by type; lighting-control device type; maintenance factor `MF`; luminaire power `Pi`; standby/control power `Pci`; emergency-lighting battery charging power `Pei`. If technical data is unavailable for existing buildings, in-situ testing from SR EN 15193-1 Annex D is referenced. |
| unit | `mixed` |
| output/impact | Defines minimum input completeness for detailed lighting-energy calculation. |
| inputs | `Pi`; `Pci`; `Pei`; luminaire count; control type; `MF`; source/manufacturer/in-situ test |
| MC001 reference | MC001-2022, 3.4.2.1 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Use as validation requirements only until formulas are extracted from SR EN 15193-1. |
| validation notes | Missing luminaire power, standby power, emergency power, or source must produce warnings/status rather than defaults. |

### Rule 4 - Complex method calculation sequence

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_4_2_1_LIGHTING_COMPLEX_SEQUENCE` |
| labelRo | Secventa metodei complexe de calcul |
| ruleText | MC001 references SR EN 15193-1 equations 1-13 to determine, in order: `tD`; `tN`; installed luminaire power `Pn`; emergency battery charging power `Pem`; automation/control power `Ppc`; occupancy factor `Fo`; daylight factor `FD`; constant illuminance factor `FC`; lighting-function energy `WL,t`; standby/emergency/control energy for non-lighting periods; total lighting energy for timestep `ts`; annual total lighting energy `W`; and `LENI`. |
| unit | `mixed` |
| output/impact | Indexes the formula sequence needed before implementation. |
| inputs | `tD`; `tN`; `Pn`; `Pem`; `Ppc`; `Fo`; `FD`; `FC`; `WL,t`; `WP,t`; `W`; lighting area |
| MC001 reference | MC001-2022, 3.4.2.1 |
| ruleStatus | `indexed_external_formula_sequence` |
| implementationAllowed | `false` |
| implementation notes | The equations are in SR EN 15193-1 and are not reproduced in MC001; extract that standard before calculators are implemented. |
| validation notes | Do not infer equations 1-13 from variable names. |

### Rule 5 - Simplified lighting method applicability

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_4_2_2_LIGHTING_SIMPLIFIED_METHOD_APPLICABILITY` |
| labelRo | Aplicabilitatea metodei simplificate pentru iluminat |
| ruleText | The simplified method applies only in conceptual phase for residential and non-residential new or renovated buildings when only summary lighting-system information exists. It calculates annual covered lighting energy and LENI using predefined values from national annex data or SR EN 15193-1 Annex B. |
| unit | `not_applicable` |
| output/impact | Selects a simplified annual method only when the required predefined datasets are available. |
| inputs | installed power estimate; predefined standby/emergency values; occupancy factor; daylight factor; constant illuminance factor; building/zone area |
| MC001 reference | MC001-2022, 3.4.2.2 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Block implementation until Annex A/B and SR EN 15193-1 values are extracted into a registry/dataset. |
| validation notes | Missing national/SR EN predefined values must block default calculation. |

### Rule 6 - Simplified method calculation sequence

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_4_2_2_LIGHTING_SIMPLIFIED_SEQUENCE` |
| labelRo | Secventa metodei simplificate de calcul |
| ruleText | MC001 lists these simplified steps: estimate total installed luminaire power `Pn`; use predefined `Wpe` and `Wpc`; determine occupancy factor `Fo`; calculate daylight factor `FD` using SR EN 15193-1 formulas 25-31 and Annex F/B tables; select constant illuminance factor `FC`; calculate `LENI` using SR EN 15193-1 equations 32 and 34. |
| unit | `mixed` |
| output/impact | Indexes the simplified formula sequence needed before implementation. |
| inputs | `Pn`; `Wpe`; `Wpc`; `Fo`; `FD`; `FC`; area; building/zone category |
| MC001 reference | MC001-2022, 3.4.2.2 |
| ruleStatus | `indexed_external_formula_sequence` |
| implementationAllowed | `false` |
| implementation notes | Equations 25-34 and Annex B/F tables are external to MC001 and must be extracted separately. |
| validation notes | Do not calculate LENI from area-only assumptions. |

### Rule 7 - Reference building lighting

| Field | Value |
| --- | --- |
| ruleId | `MC001_REFERENCE_BUILDING_LIGHTING_RULE` |
| labelRo | Iluminatul cladirii de referinta |
| ruleText | The reference building uses new modern LED luminaires, sized to meet minimum national lighting levels; for non-residential buildings, daylight and presence sensors are considered according to the stated density rule. |
| unit | `not_applicable` |
| output/impact | Reference-building lighting cannot be generated from arbitrary defaults; it needs the MC001/SR EN reference assumptions and relevant lookup values. |
| inputs | building use; lighting level; LED luminaire assumptions; daylight sensors; presence sensors; density rule |
| MC001 reference | MC001-2022, 5.2, characteristic 15 for reference building |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Numeric lighting power, schedules, and sensor-density inputs remain missing. |
| validation notes | Do not hardcode LED power density or sensor assumptions. |

### Formula 1 - Final energy service aggregation includes lighting

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_3_FINAL_ENERGY_INCLUDES_LIGHTING_SERVICE` |
| labelRo | Energia finala include serviciul de iluminat |
| formulaText | `Qf,i = Qfh,i + Qfc,i + Qfv,i + QfW,i + Qf,l,i + Qf,el,i` |
| unit | `kWh/an` |
| output | `Qf,i`: final energy for carrier `i` |
| inputs | `Qfh,i`; `Qfc,i`; `Qfv,i`; `QfW,i`; `Qf,l,i`; `Qf,el,i` |
| MC001 reference | MC001-2022, 5.4.2.6, relatia (5.3) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | This is only an aggregation formula. It does not calculate `Qf,l,i`; lighting energy must come from the lighting method. |
| validation notes | `Qf,l,i` must be explicit or calculated by a validated lighting module before aggregation. |

### Pending formula - Lighting energy calculation

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_4_LIGHTING_ENERGY_CALCULATION_PENDING` |
| labelRo | Calculul energiei pentru iluminat |
| formulaText | `External formulas: SR EN 15193-1 equations 9-13 for timestep/annual lighting energy and LENI` |
| unit | `kWh`, `kWh/an`, `kWh/(m2.an)` |
| output | `WL,t`; `WP,t`; `W`; `LENI` |
| inputs | installed power; emergency/standby power; daylight, occupancy, and control factors; operating times; area |
| MC001 reference | MC001-2022, 3.4.2.1; SR EN 15193-1 equations 9-13 |
| formulaStatus | `external_normative_reference_needed` |
| implementationAllowed | `false` |
| implementation notes | Do not implement until SR EN 15193-1 equations are extracted and reviewed. |
| validation notes | Missing formula source must return `cannot_calculate_lighting_missing_lighting_data`. |

### Pending formula - Installed lighting power

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_4_INSTALLED_LIGHTING_POWER_PENDING` |
| labelRo | Putere instalata pentru iluminat |
| formulaText | `External formula: SR EN 15193-1 equation 1` |
| unit | `W` |
| output | `Pn` |
| inputs | luminaire powers; luminaire counts; ballast/driver/components as applicable |
| MC001 reference | MC001-2022, 3.4.2.1; SR EN 15193-1 equation 1 |
| formulaStatus | `external_normative_reference_needed` |
| implementationAllowed | `false` |
| implementation notes | Manufacturer data or in-situ test data may provide direct inputs. Do not infer installed power from floor area unless a reviewed table/method allows it. |
| validation notes | Missing installed power and missing default lookup must return `cannot_calculate_lighting_missing_installed_power`. |

### Pending formula - Daylight correction factor

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_4_DAYLIGHT_FACTOR_PENDING` |
| labelRo | Factor de utilizare a luminii naturale |
| formulaText | `External formulas: SR EN 15193-1 equation 7 for complex method; equations 25-31 for simplified method` |
| unit | `-` |
| output | `FD` |
| inputs | daylight access; daylight-control factor; daylight supply/access factors; geometry/window/daylight data |
| MC001 reference | MC001-2022, 3.4.2.1; 3.4.2.2; SR EN 15193-1 equation 7; equations 25-31; Annex F/B |
| formulaStatus | `external_normative_reference_needed` |
| implementationAllowed | `false` |
| implementation notes | Requires SR EN daylight formulas and tables; climate/daylight cross-reference may be needed. |
| validation notes | Do not assume `FD = 1` or `FD = 0` silently. |

### Pending formula - Occupancy/control correction factor

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_4_OCCUPANCY_CONTROL_FACTOR_PENDING` |
| labelRo | Factor de ocupare/control pentru iluminat |
| formulaText | `External formulas: SR EN 15193-1 equations 4-6 and Annex E` |
| unit | `-` |
| output | `Fo` |
| inputs | occupancy absence fraction `FA`; lighting control parameter `Foc`; control type |
| MC001 reference | MC001-2022, 3.4.2.1; SR EN 15193-1 equations 4-6; Annex E |
| formulaStatus | `external_normative_reference_needed` |
| implementationAllowed | `false` |
| implementation notes | MC001 states `Fo = 1` for centralized lighting command, otherwise subunitary and calculated from SR EN formulas. Do not default this without explicit control mode. |
| validation notes | Missing control/occupancy data must block or warn, depending on explicit input mode. |

### Pending formula - Constant illuminance factor

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_4_CONSTANT_ILLUMINANCE_FACTOR_PENDING` |
| labelRo | Factor pentru nivel constant de iluminare |
| formulaText | `External formula/table: SR EN 15193-1 equation 8 and Annex G; simplified method Table B.8` |
| unit | `-` |
| output | `FC` |
| inputs | constant illuminance control type; control efficiency data |
| MC001 reference | MC001-2022, 3.4.2.1; 3.4.2.2; SR EN 15193-1 equation 8; Annex G; Table B.8 |
| formulaStatus | `external_normative_reference_needed` |
| implementationAllowed | `false` |
| implementation notes | Requires SR EN lookup data. |
| validation notes | Do not invent control factor. |

### Pending formula - Operating time / usage schedule

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_4_LIGHTING_OPERATING_TIME_PENDING` |
| labelRo | Timp de utilizare pentru iluminat |
| formulaText | `External table/formula: SR EN 15193-1 Annex B, Table B.2 for tD and tN` |
| unit | `h` |
| output | `tD`; `tN` |
| inputs | building/use category; timestep; daylight/artificial-light period |
| MC001 reference | MC001-2022, 3.4.2.1; SR EN 15193-1 Annex B, Table B.2 |
| formulaStatus | `external_normative_reference_needed` |
| implementationAllowed | `false` |
| implementation notes | Operating hours must come from explicit schedule or reviewed SR EN table. |
| validation notes | Missing schedule must return `cannot_calculate_lighting_missing_schedule`. |

### Pending formula - Emergency/standby lighting contribution

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_4_EMERGENCY_STANDBY_LIGHTING_PENDING` |
| labelRo | Energie pentru urgenta, standby si dispozitive de reglare |
| formulaText | `External formulas/tables: SR EN 15193-1 equations 2, 3, 11 and Annex B/H` |
| unit | `W`, `kWh` |
| output | `Pem`; `Ppc`; `WP,t`; `Wpe`; `Wpc` |
| inputs | emergency battery charging power; control standby power; non-lighting periods; predefined values where allowed |
| MC001 reference | MC001-2022, 3.4.2.1; 3.4.2.2; SR EN 15193-1 equations 2, 3, 11; Annex B/H |
| formulaStatus | `external_normative_reference_needed` |
| implementationAllowed | `false` |
| implementation notes | Emergency and standby contributions cannot be omitted unless explicitly not applicable and traced. |
| validation notes | Do not silently set standby or emergency energy to zero. |

### Pending formula - Specific lighting energy per area / LENI

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_4_LENI_PENDING` |
| labelRo | Indicator LENI pentru iluminat |
| formulaText | `External formulas: SR EN 15193-1 equation 13 for complex method; equations 32 and 34 for simplified method` |
| unit | `kWh/(m2.an)` |
| output | `LENI` |
| inputs | total lighting energy; useful area; method-specific correction factors |
| MC001 reference | MC001-2022, 3.4.2.1; 3.4.2.2; SR EN 15193-1 equations 13, 32, 34 |
| formulaStatus | `external_normative_reference_needed` |
| implementationAllowed | `false` |
| implementation notes | Area is a denominator for LENI; it is not by itself a lighting-energy model. |
| validation notes | Denominator area must be explicit and cross-referenced to module `01_geometry_envelope_definitions`. |

## Required lighting data/tables

| dataKey | neededFor | MC001 source | unit | lookup keys | extractionStatus | implementationAllowed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `installedLightingPower` | `Pn`, `WL,t`, `W`, `LENI` | MC001-2022, 3.4.2.1; SR EN 15193-1 equation 1; Annex C; Annex B Table B.10 for residential | W | luminaire type; luminaire count; building type | `external_module_needed` | `false` | MC001 indexes the source but does not reproduce the formula/table values. |
| `lightingPowerDensity` | simplified installed-power estimate | MC001-2022, 3.4.2.2; SR EN 15193-1 Annex C / Annex B | W/m2 or source-specific | building/use category; zone type | `external_module_needed` | `false` | Do not infer from area until table/method is extracted. |
| `operatingHours` | `tD`, `tN`, lighting energy | MC001-2022, 3.4.2.1; SR EN 15193-1 Annex B Table B.2 | h | building/use category; timestep; daylight/artificial period | `external_module_needed` | `false` | Missing schedule blocks default calculation. |
| `buildingUseCategory` | schedule, controls, default values | MC001-2022, 3.4; SR EN 15193-1 Annex B | category | building/zone use | `external_module_needed` | `false` | Needed for SR EN lookups. |
| `daylightCorrectionFactor` | `FD` | MC001-2022, 3.4.2.1; 3.4.2.2; SR EN 15193-1 equation 7, equations 25-31, Annex F/B | - | daylight access; glazing/daylight geometry; control type | `external_module_needed` | `false` | Not available as MC001 inline value. |
| `occupancyControlFactor` | `Fo` | MC001-2022, 3.4.2.1; 3.4.2.2; SR EN 15193-1 equations 4-6, Annex E, Annex B Table B.7 | - | occupancy pattern; control type | `external_module_needed` | `false` | MC001 notes `Fo = 1` only for centralized command; otherwise use SR EN formulas. |
| `constantIlluminanceControlFactor` | `FC` | MC001-2022, 3.4.2.1; 3.4.2.2; SR EN 15193-1 equation 8, Annex G, Annex B Table B.8 | - | control type; system data | `external_module_needed` | `false` | Requires SR EN extraction. |
| `referenceLightingPower` | reference building lighting | MC001-2022, 5.2, characteristic 15 | W or W/m2 | building type; use category; national lighting level | `needs_source_table` | `false` | MC001 textual rule extracted; numeric lookup not found in local pass. |
| `emergencyLightingPower` | `Pem`, `Pei`, `Wpe` | MC001-2022, 3.4.2.1; 3.4.2.2; SR EN 15193-1 equations 2, 11; Annex B/H | W, kWh | emergency lighting system; building/use category | `external_module_needed` | `false` | Must not default to zero unless explicitly not applicable. |
| `lightingArea` | `LENI`, specific indicators | MC001-2022, 3.4.2; module `01_geometry_envelope_definitions` | m2 | building/zone area boundary | `external_module_needed` | `false` | Area definition must be consistent with useful/reference area. |
| `maintainedIlluminanceLevel` | design/reference lighting | MC001-2022, 3.4.1; 5.2; SR EN 12464-1; SR EN 12193; SR EN 1838 | lux | space/activity/sport/emergency category | `external_module_needed` | `false` | MC001 references standards but does not provide a compact lookup table here. |

## Cross-references

- Final/primary/CO2 factors cross-reference `13_final_primary_co2_rer`.
- Reference building rules cross-reference `14_reference_building`.
- Certificate/classes cross-reference `15_energy_classes_and_certificate`.
- Climate/daylight data cross-reference `17_climate_annex` if daylight/solar inputs are required by the extracted SR EN method.
- Useful/floor area definitions cross-reference `01_geometry_envelope_definitions`.
- Internal-gain recovery from lighting cross-references `08_internal_and_solar_gains`.

## Missing-input behavior

If lighting input tables or building-use lookup are missing, a future calculator must return:

`status: cannot_calculate_lighting_missing_lighting_data`

If installed lighting power is missing and no reviewed MC001/SR EN default is available, a future calculator must return:

`status: cannot_calculate_lighting_missing_installed_power`

If operating hours/schedule are missing, a future calculator must return:

`status: cannot_calculate_lighting_missing_schedule`

No invented lighting power density, usage hours, daylight factors, occupancy factors, control factors, emergency-lighting powers, standby powers, or LENI defaults are allowed.

## Implementation implications for LaCurent

- Lighting is generally more important for non-residential buildings, but MC001 3.4 covers both residential and non-residential buildings/zones.
- Lighting final energy is electricity and later feeds primary energy/CO2 through module `13_final_primary_co2_rer`.
- Lighting can also contribute to internal heat gains, but that must be handled by a traced gains/recovered-loss path, not by hidden coupling.
- Do not hardcode lighting defaults until MC001/SR EN tables are extracted into a reviewed registry/dataset.
- Do not infer lighting energy only from area unless the referenced method and all lookup keys are known.
- The local MC001 section is not enough to implement a full default lighting calculator because it delegates key formulas and tables to SR EN 15193-1.
- This module does not assign energy class.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `11_cooling_ventilation_systems` or `16_audit_energy_measures` depending on priority.
