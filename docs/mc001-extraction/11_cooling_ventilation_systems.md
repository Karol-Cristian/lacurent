# 11 Cooling, Ventilation and Air-Conditioning Systems

Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

MC001 sections used:
- MC001-2022, 3.2 - Sisteme de incalzire, racire, ventilare si climatizare, as extracted from Chapter 3 context
- MC001-2022, 3.2.3 - Ventilare mecanica / hibrida si climatizare, CTA and air distribution context
- MC001-2022, 3.2.4 - Sisteme de stocare a energiei pentru racire
- MC001-2022, 3.2.5 - Consumul de energie si eficienta energetica a sistemelor de climatizare de tip aer-apa sau aer-refrigerent
- MC001-2022, 3.2.7 - Sinteza calculului energetic al sistemelor de incalzire, racire, ventilare si racire
- MC001-2022, 5.2 - Caracteristicile cladirii de referinta, rules for cooling, mechanical ventilation, and auxiliary energy
- MC001-2022, 5.4.2.6, relatia (5.3), final-energy aggregation by service and carrier

Extraction status: `partial_needs_verification`

Implementation relevance:
- This module separates cooling/ventilation system energy from the building-physics ventilation heat transfer in module `06_ventilation_and_infiltration`.
- It identifies clear MC001 formulas for cooling generator input energy and total auxiliary cooling energy.
- Several detailed subsystem formulas in Chapter 3 are visually/OCR unclear in the local PDF extraction and must be verified from the figure/formula rendering before implementation.
- Reference-building cooling and mechanical-ventilation rules are extracted textually from MC001 5.2.

LaCurent disclaimer:
- This extraction supports MC001-like implementation planning only.
- It is not an official certificate calculation.
- No EER, SEER, COP, fan power, pump power, system efficiency, humidification/dehumidification factor, or reference airflow value may be invented.

## Concepts to extract

Useful cooling demand vs final cooling energy:
- `QC,nd` is useful cooling demand from the zone/monthly demand calculation.
- Final cooling energy is delivered energy by carrier after system generation, emission, distribution, storage, and auxiliary effects.
- Useful cooling demand must not be used directly as final energy.

Cooling generation:
- The subsystem that extracts heat from cooling distribution/air systems and consumes electricity or another carrier.
- MC001 notes that EER/COP coefficients are needed when determining electric energy for thermal cooling generation.

Cooling distribution:
- Distribution of chilled water, refrigerant, or air between generation, storage, emission terminals, and zones.
- Distribution may have losses and auxiliary pump/fan electricity.

Cooling emission:
- Terminal-side extraction of heat from rooms/zones, such as fan-coils, radiant cooling panels, active beams, direct expansion units, or air systems.
- Emission losses and auxiliary energy must be separated from useful cooling demand.

Mechanical ventilation system:
- A technical system that supplies/extracts air using fans and ductwork.
- It can include heat recovery, recirculation, pre-heating, cooling, dehumidification, humidification, duct leakage, and control energy.

Air handling unit / air treatment:
- CTA / AHU processes supply and extract air, including heating/cooling coils, heat recovery, recirculation, humidification/dehumidification, fan energy, and casing losses.

Auxiliary fan/pump energy:
- Electricity used by pumps, fans, controls, rotary heat-recovery drives, humidification pumps, and other auxiliary devices.
- It is usually electric final energy and must be carried separately to module `13_final_primary_co2_rer`.

EER / SEER / COP if used:
- MC001 explicitly states that EER and COP coefficients are needed for determining electric energy consumption for thermal cooling generation.
- SEER is also used in the reference-building cooling rule.

Reference cooling system assumptions:
- If the real building/unit has cooling, the reference building uses a direct-expansion cooling system with `SEER = 2.5`, no indoor humidity control, sized according to current technical regulations, and without recorded terminal/distribution/storage losses.

Difference between ventilation heat transfer from module 06 and system final energy here:
- Module `06_ventilation_and_infiltration` calculates ventilation heat transfer terms used in useful heating/cooling demand.
- This module concerns final/system energy: fan electricity, AHU coil energy, distribution/generation/storage losses, and auxiliary energy.

## Formula/rule registry entries

### Rule 1 - Cooling and ventilation system scope

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_2_COOLING_VENTILATION_SYSTEM_SCOPE` |
| labelRo | Domeniul sistemelor de racire, ventilare si climatizare |
| ruleText | Chapter 3 system calculations cover cooling, air-water and air-refrigerant air-conditioning systems, mechanical/hybrid ventilation, AHU air treatment, distribution, emission, storage, generation, auxiliary energy, and recoverable losses. |
| unit | `not_applicable` |
| output/impact | Future calculators must split useful demand, subsystem losses, auxiliary electricity, and final energy by carrier. |
| inputs | system type; served zones; timestep; system design data; manufacturer or inspection data |
| MC001 reference | MC001-2022, 3.2; 3.2.3; 3.2.4; 3.2.5; 3.2.7 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Routing/scope rule only; it is not a calculation formula. |
| validation notes | Do not collapse cooling, ventilation, and climatization into one untyped energy bucket. |

### Rule 2 - Air-conditioning system types

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_2_5_AIR_CONDITIONING_SYSTEM_TYPES` |
| labelRo | Tipuri de sisteme de climatizare |
| ruleText | MC001 3.2.5 applies to air-water systems such as fan-coils with 2/3/4 pipes, induction systems, radiant cooling panels, embedded cooling, active beams, water-loop heat-pump systems, and air-refrigerant systems such as room units and mono-split/direct-expansion systems including variable refrigerant flow systems. |
| unit | `not_applicable` |
| output/impact | System-type selection determines required inputs, generation path, emission/distribution losses, and carrier mapping. |
| inputs | cooling system type; distribution medium; terminal type; refrigerant/direct expansion applicability |
| MC001 reference | MC001-2022, 3.2.5.1 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Use for classification/validation only. Formulas by subsystem remain separate. |
| validation notes | Unknown system type should produce a warning/status, not default performance. |

### Rule 3 - Detailed cooling method outputs

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_11_COOLING_SIMPLIFIED_OUTPUTS` |
| labelRo | Marimi de iesire pentru metoda de calcul simplificata |
| ruleText | Tabel 3.11 lists method outputs including electric input to cooling generator `EC;gen;el;in`, auxiliary energy for cooling emission `WC;aux;em`, distribution `WC;aux;dis`, generation `WC;aux;gen`, cooling energy extracted from thermal zone `QC;out;zt,j`, required generator outlet temperature, required cooling energy at generator input `QC;gen;in;req`, and cooling-coil output from AHU `QC;ahu;out;k`. |
| unit | `mixed` |
| output/impact | Defines output contract for future system calculators. |
| inputs | useful cooling demand; AHU cooling demand; system design data; losses; auxiliary devices |
| MC001 reference | MC001-2022, 3.2.5.1, Tabel 3.11 |
| ruleStatus | `indexed_table` |
| implementationAllowed | `true` |
| implementation notes | Table values are labels/outputs, not default numeric performance values. |
| validation notes | Each output should carry source and unit trace when calculated. |

### Formula 1 - Heating generator input energy, for symmetry/cross-check

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_183_HEATING_GENERATOR_INPUT_ENERGY` |
| labelRo | Energie primita la generare pentru incalzire |
| formulaText | `QH,gen,in = QH,nd + QH,em,ls + QH,dis,ls + QH,sto,ls + QH,gen,ls` |
| unit | `kWh` |
| output/impact | `QH,gen,in`: thermal energy received/required at heating generation side |
| inputs | `QH,nd`; `QH,em,ls`; `QH,dis,ls`; `QH,sto,ls`; `QH,gen,ls` |
| MC001 reference | MC001-2022, 3.2.7, relatia (3.183) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Included for system-balance symmetry; heating implementation belongs outside this module unless shared system aggregation is introduced later. |
| validation notes | Inputs must be explicit subsystem terms and must not be silently zeroed if applicable. |

### Formula 2 - Cooling generator input energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_184_COOLING_GENERATOR_INPUT_ENERGY` |
| labelRo | Energie primita la generare pentru racire |
| formulaText | `QC,gen,in = QC,nd + QC,em,ls + QC,dis,ls + QC,sto,ls + QC,gen,ls` |
| unit | `kWh` |
| output/impact | `QC,gen,in`: cooling energy required/received at cooling generation side before carrier conversion |
| inputs | `QC,nd`: useful cooling demand; `QC,em,ls`: cooling emission losses; `QC,dis,ls`: cooling distribution losses; `QC,sto,ls`: cooling storage losses; `QC,gen,ls`: cooling generation losses |
| MC001 reference | MC001-2022, 3.2.7, relatia (3.184) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | This is not final electric energy. MC001 notes EER/COP must be used when establishing electric consumption for cooling generation. |
| validation notes | Do not set subsystem losses to zero unless explicitly not applicable and traced. |

### Formula 3 - Total auxiliary cooling energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_186_TOTAL_COOLING_AUXILIARY_ENERGY` |
| labelRo | Consum total de energie auxiliara pentru racire |
| formulaText | `WC,in,tot = WC,aux,em,in + WC,aux,dis,in + WC,aux,sto,in + WC,aux,gen,in` |
| unit | `kWh` |
| output/impact | `WC,in,tot`: total auxiliary energy for cooling |
| inputs | `WC,aux,em,in`: auxiliary energy for cooling emission; `WC,aux,dis,in`: auxiliary energy for cooling distribution; `WC,aux,sto,in`: auxiliary energy for cooling storage; `WC,aux,gen,in`: auxiliary energy for cooling generation |
| MC001 reference | MC001-2022, 3.2.7, relatia (3.186) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | MC001 states auxiliary energy is generally electric energy. Keep it separate from thermal cooling energy. |
| validation notes | Missing fan/pump/generator auxiliary components must not be hidden. |

### Formula 4 - Final energy service aggregation includes cooling and ventilation

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_3_FINAL_ENERGY_INCLUDES_COOLING_VENTILATION` |
| labelRo | Energia finala include racirea si ventilarea |
| formulaText | `Qf,i = Qfh,i + Qfc,i + Qfv,i + QfW,i + Qf,l,i + Qf,el,i` |
| unit | `kWh/an` |
| output/impact | `Qf,i`: final energy for carrier `i`; includes final cooling energy `Qfc,i` and final ventilation energy `Qfv,i` |
| inputs | `Qfh,i`; `Qfc,i`; `Qfv,i`; `QfW,i`; `Qf,l,i`; `Qf,el,i` |
| MC001 reference | MC001-2022, 5.4.2.6, relatia (5.3) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | This is only service/carrier aggregation. It does not calculate cooling or ventilation final energy. |
| validation notes | `Qfc,i` and `Qfv,i` must come from validated system modules before aggregation. |

### Formula 5 - AHU heating coil energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_40_AHU_HEATING_COIL_ENERGY` |
| labelRo | Energie necesara bateriei de incalzire CTA |
| formulaText | `QH;ahu;in;req = rhoA * ca * qV;SUP;ahu * (thetaSUP;H;req + deltaThetaSUP;HU - thetaE) * tci` |
| unit | `kWh` |
| output/impact | `QHahuInReq`: required heating energy for AHU heating coil over timestep `tci` |
| inputs | `rhoA`; `ca`; `qV;SUP;ahu`; `thetaSUP;H;req`; `deltaThetaSUP;HU`; `thetaE`; `tci` |
| MC001 reference | MC001-2022, 3.2.3, relatia (3.40) |
| formulaStatus | `extracted_with_symbol_normalization` |
| implementationAllowed | `false` |
| implementation notes | Formula is readable in local extraction but symbol/unit normalization must be checked against the rendered PDF before implementation. |
| validation notes | Airflow units and heat-capacity units must be explicit. |

### Formula 6 - AHU cooling coil energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_43_AHU_COOLING_COIL_ENERGY` |
| labelRo | Energie extrasa de bateria de racire CTA |
| formulaText | `Exact visual formula pending; OCR shows relation (3.43) for energy extracted by the cooling coil during timestep tci.` |
| unit | `kWh` |
| output/impact | AHU cooling coil output for a calculation timestep |
| inputs | supply airflow; air density; air specific heat; supply/required air temperatures or enthalpy/moisture terms; `tci` |
| MC001 reference | MC001-2022, 3.2.3, relatia (3.43) |
| formulaStatus | `needs_visual_verification` |
| implementationAllowed | `false` |
| implementation notes | Do not infer from heating coil formula; transcribe exact relation (3.43) before implementation. |
| validation notes | Cooling and dehumidification terms must remain separate where MC001 separates them. |

### Formula 7 - AHU dehumidification energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_44_AHU_DEHUMIDIFICATION_ENERGY` |
| labelRo | Energie extrasa pentru dezumidificare |
| formulaText | `Exact visual formula pending; OCR shows relation (3.44) for dehumidification energy during timestep tci.` |
| unit | `kWh` |
| output/impact | Dehumidification energy term for AHU air treatment |
| inputs | airflow; density; moisture content terms; latent heat terms where applicable; `tci` |
| MC001 reference | MC001-2022, 3.2.3, relatia (3.44) |
| formulaStatus | `needs_visual_verification` |
| implementationAllowed | `false` |
| implementation notes | Do not combine sensible cooling and dehumidification unless MC001 formula explicitly does so. |
| validation notes | Moisture-content units must be traced. |

### Formula 8 - Humidification energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_45_3_46_AHU_HUMIDIFICATION_ENERGY` |
| labelRo | Energie pentru umidificare |
| formulaText | `Steam humidifier: relation (3.45), exact visual formula pending. Otherwise: EHU;gen;in;cr = 0 (3.46).` |
| unit | `kWh` |
| output/impact | Humidification generation input energy |
| inputs | humidifier type; supply airflow; water vapor/moisture terms; humidification source/carrier |
| MC001 reference | MC001-2022, 3.2.3, relatiile (3.45), (3.46) |
| formulaStatus | `partial_extracted_visual_verification_pending` |
| implementationAllowed | `false` |
| implementation notes | Relation (3.46) is readable for non-steam path, but relation (3.45) must be transcribed before implementation. |
| validation notes | Do not invent humidifier type or energy carrier. |

### Formula 9 - AHU casing/leakage losses

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_47_3_48_AHU_GENERATION_LOSSES` |
| labelRo | Pierderi termice la generarea/tratarea aerului in CTA |
| formulaText | `Qv;ls;gen` formulas for conditioned AHU location (3.47) and unconditioned AHU location (3.48), including casing U*A terms and leakage airflow terms. Exact visual transcription pending. |
| unit | `kWh` |
| output/impact | AHU generation/treatment heat losses |
| inputs | AHU surface areas; AHU U-values; supply/extract temperatures; conditioned or unconditioned ambient temperature; leakage airflow; `rhoA`; `ca`; `tci` |
| MC001 reference | MC001-2022, 3.2.3, relatiile (3.47), (3.48) |
| formulaStatus | `needs_visual_verification` |
| implementationAllowed | `false` |
| implementation notes | OCR exposes structure but not enough for implementation. Preserve conditioned vs unconditioned location branches. |
| validation notes | Missing AHU location or leakage data must block high-confidence calculation. |

### Formula 10 - Recoverable AHU losses

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_49_3_50_AHU_RECOVERABLE_GENERATION_LOSSES` |
| labelRo | Pierderi termice recuperabile la CTA |
| formulaText | `If AHU is in conditioned zone: QV;ls;gen;rbl = QV;ls;gen. If AHU location is not conditioned: QV;ls;gen;rbl = 0.` |
| unit | `kWh` |
| output/impact | Recoverable AHU losses |
| inputs | `QV;ls;gen`; AHU location conditioned/unconditioned |
| MC001 reference | MC001-2022, 3.2.3, relatiile (3.49), (3.50) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Only use after `QV;ls;gen` is calculated by a verified formula. |
| validation notes | AHU location must be explicit. |

### Formula 11 - Extract-air temperature before recovery/recirculation

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_53_3_54_EXTRACT_AIR_TEMPERATURE_FOR_RECOVERY` |
| labelRo | Temperatura aerului extras la intrarea in recuperator/recirculare |
| formulaText | `If extract fan is upstream of heat recovery/recirculation: thetaETA;hr;in = thetaETA;dis;out + deltaThetaFan;ETA (3.53). If downstream: thetaETA;hr;in = thetaETA;dis;out (3.54).` |
| unit | `degC` |
| output/impact | Extract-air temperature used for heat recovery or recirculation calculations |
| inputs | extract fan position; `thetaETA;dis;out`; `deltaThetaFan;ETA` |
| MC001 reference | MC001-2022, 3.2.3, relatiile (3.53), (3.54) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Fan position must be known. |
| validation notes | Do not assume fan heat gain if fan location is unknown. |

### Formula 12 - Fan energy over timestep

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_55_FAN_ENERGY` |
| labelRo | Consum de energie al ventilatorului |
| formulaText | `Exact visual formula pending; OCR indicates relation (3.55) calculates fan energy over timestep tci using supply/extract airflow, fan powers, and timestep.` |
| unit | `kWh` |
| output/impact | Fan electricity for ventilation/air handling |
| inputs | supply/extract airflow; fan electric powers; timestep `tci`; fan efficiency/pressure terms where applicable |
| MC001 reference | MC001-2022, 3.2.3, relatia (3.55) |
| formulaStatus | `needs_visual_verification` |
| implementationAllowed | `false` |
| implementation notes | Do not implement fan energy until relation (3.55) is visually transcribed. |
| validation notes | Missing fan data must return `cannot_calculate_ventilation_auxiliary_energy_missing_fan_data`. |

### Formula 13 - Fan efficiency and pressure relationships

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_56_TO_3_61_FAN_EFFICIENCY_PRESSURE` |
| labelRo | Randament si presiune ventilatoare |
| formulaText | `etaFan;SUP/ETA = etaFan;SUP/ETA;nom * f(qV) (3.56). Pressure-difference relations (3.57)-(3.61) depend on system type and control mode; exact visual transcription pending for all branches.` |
| unit | `mixed` |
| output/impact | Fan efficiency and pressure inputs for fan energy |
| inputs | nominal fan efficiency; airflow-dependent function; nominal pressure; airflow; system type; control mode |
| MC001 reference | MC001-2022, 3.2.3, relatiile (3.56)-(3.61) |
| formulaStatus | `partial_extracted_visual_verification_pending` |
| implementationAllowed | `false` |
| implementation notes | `etaFan` relation text is readable; pressure branches require visual verification. |
| validation notes | Manufacturer curves/functions must be sourced; do not invent `f(qV)`. |

### Formula 14 - Duct and AHU leakage factors

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_80_TO_3_82_AHU_DUCT_LEAKAGE_AIRFLOW` |
| labelRo | Factori de scurgeri pentru conducte si CTA |
| formulaText | `Relations (3.80)-(3.82) calculate AHU leakage and supply/extract airflow delivered by the AHU/duct system; exact visual transcription pending.` |
| unit | `m3/h` |
| output/impact | Leakage and delivered airflow for mechanical ventilation/air handling |
| inputs | leakage factors; AHU/duct pressure difference; test pressure; required zone airflow |
| MC001 reference | MC001-2022, 3.2.3; Tabel 3.2; Tabel 3.3; relatiile (3.80)-(3.82) |
| formulaStatus | `needs_visual_verification` |
| implementationAllowed | `false` |
| implementation notes | Tabel 3.2 and 3.3 are indexed below; exact formulas still need visual extraction. |
| validation notes | Do not use leakage class defaults unless class/source is known. |

### Formula 15 - Cooling system outputs and generator request

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_136_TO_3_145_COOLING_GENERATOR_REQUEST` |
| labelRo | Cerere de generare pentru sisteme de racire/climatizare |
| formulaText | `Relations (3.136)-(3.145) determine requested generator outlet temperatures and cooling energy required/extracted for direct-expansion and air-water systems. Exact visual formulas pending.` |
| unit | `mixed` |
| output/impact | Cooling generator outlet temperatures and `QC;gen;in;req` |
| inputs | system type; zone cooling demand; AHU cooling demand; emission losses; distribution losses; chilled-water temperatures; control mode |
| MC001 reference | MC001-2022, 3.2.5.3, relatiile (3.136)-(3.145) |
| formulaStatus | `needs_visual_verification` |
| implementationAllowed | `false` |
| implementation notes | Do not infer direct-expansion or air-water equations from descriptions. |
| validation notes | System type and control mode are critical inputs. |

### Formula 16 - Simplified cooling distribution losses and auxiliary factors

| Field | Value |
| --- | --- |
| formulaId | `MC001_3_146_COOLING_DISTRIBUTION_LOSS_FACTOR_METHOD` |
| labelRo | Pierderi si auxiliari de distributie frig prin factori |
| formulaText | `Relation (3.146) begins simplified factor method for cooling distribution losses and auxiliary energy as fractions of cooling energy demand; exact visual formula pending.` |
| unit | `kWh` |
| output/impact | Simplified cooling distribution losses and auxiliary terms |
| inputs | cooling energy demand; `fC;ls;dis`; `fC;aux;dis`; weighting factors |
| MC001 reference | MC001-2022, 3.2.5.3, relatia (3.146); Tabel 3.12 |
| formulaStatus | `needs_visual_verification` |
| implementationAllowed | `false` |
| implementation notes | Do not implement factor method until exact formula and factor table usage are verified. |
| validation notes | Missing factor data must block default calculation. |

### Rule 4 - EER/COP required for cooling electric consumption

| Field | Value |
| --- | --- |
| ruleId | `MC001_3_2_7_COOLING_EER_COP_REQUIRED` |
| labelRo | EER/COP pentru consumul electric de racire |
| ruleText | MC001 3.2.7 states the need to use EER and COP coefficients when establishing electric energy consumption for thermal energy generation for cooling, and to accumulate energy flows separately for each energy carrier. |
| unit | `not_applicable` |
| output/impact | Cooling final electricity cannot be calculated from useful cooling demand alone. |
| inputs | `QC,gen,in`; EER/COP/performance data; carrier |
| MC001 reference | MC001-2022, 3.2.7 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | This rule does not provide numeric EER/COP values. |
| validation notes | Missing performance factor must return `cannot_calculate_cooling_final_energy_missing_system_performance`. |

### Rule 5 - Reference cooling system

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_COOLING_SYSTEM` |
| labelRo | Sistem de racire de referinta |
| ruleText | If occupied spaces of the real building/unit are air-conditioned, the reference building/unit cooling system is direct-expansion with `SEER = 2.5`, without indoor humidity control, sized according to current technical regulations, with modern new equipment, and without recorded energy losses in internal terminal, distribution, or storage systems. |
| unit | `not_applicable` |
| output/impact | Provides reference cooling assumptions where cooling is applicable. |
| inputs | real-building cooling applicability; technical sizing rules |
| MC001 reference | MC001-2022, 5.2, reference building characteristic 13 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Applies to reference building only, not real-building default. |
| validation notes | Do not create cooling when not applicable; do not use SEER 2.5 for real systems unless explicitly selected as reference. |

### Rule 6 - Reference mechanical ventilation

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_MECHANICAL_VENTILATION` |
| labelRo | Ventilare mecanica de referinta |
| ruleText | The reference mechanical ventilation system uses modern new equipment and a central heat recovery unit with average annual efficiency of 75%. Fresh-air flow requirements follow I5/2010 and SR EN 16798-1(NA). |
| unit | `not_applicable` |
| output/impact | Provides reference mechanical-ventilation heat-recovery assumption, but airflow remains an external normative input. |
| inputs | ventilation applicability; fresh-air flow; heat-recovery system |
| MC001 reference | MC001-2022, 5.2, reference building characteristics 6 and 14 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `false` |
| implementation notes | Heat recovery efficiency is extracted, but fresh-air flow tables are external and must be sourced before reference ventilation calculation. |
| validation notes | Do not credit heat recovery without airflow and applicability. |

### Rule 7 - Reference auxiliary energy share

| Field | Value |
| --- | --- |
| ruleId | `MC001_5_2_REFERENCE_AUXILIARY_ENERGY_SHARE` |
| labelRo | Consumuri auxiliare ale cladirii de referinta |
| ruleText | Auxiliary electrical energy for heating, DHW, cooling, and ventilation systems is stated at 5% of the associated final thermal/electrical energy consumption for those systems. |
| unit | `%` |
| output/impact | Reference-building auxiliary-energy rule for relevant systems. |
| inputs | associated final thermal/electrical energy consumption by system |
| MC001 reference | MC001-2022, 5.2, reference building characteristic 16 |
| ruleStatus | `extracted_text_rule` |
| implementationAllowed | `true` |
| implementation notes | Reference-building rule only. Do not apply as a real-system default. |
| validation notes | Associated final energy must already be calculated and traced. |

## Required cooling/ventilation system data/tables

| dataKey | neededFor | MC001 source | unit | lookup keys | extractionStatus | implementationAllowed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `coolingSystemType` | method selection | MC001-2022, 3.2.5.1 | category | direct expansion, air-water, air-refrigerant, terminal/distribution type | `extracted_text_rule` | `true` | System types listed textually. |
| `coolingGeneratorEfficiency` | final cooling energy | MC001-2022, 3.2.7; external manufacturer/regulatory data | `-` | generator type, load, condition | `needs_source_table` | `false` | MC001 requires EER/COP but no default registry values were extracted here. |
| `EER_SEER_COP` | cooling final electricity, reference cooling | MC001-2022, 3.2.7; MC001-2022, 5.2 characteristic 13 | `-` | real/reference; system type | `partial_extracted` | `false` | Reference `SEER = 2.5` extracted; real-system EER/COP values must be explicit or sourced. |
| `coolingDistributionLosses` | `QC,dis,ls`, relation (3.184) | MC001-2022, 3.2.5.3; Tabel 3.12; relation (3.146) | kWh or factor | distribution type, factor method | `needs_visual_verification` | `false` | Exact factor formula/table usage not ready. |
| `coolingEmissionLosses` | `QC,em,ls`, relation (3.184) | MC001-2022, 3.1.1 / shared heating-cooling emission method; 3.2.5 | kWh | emission terminal type, controls | `external_module_needed` | `false` | Emission loss method references SR EN 15316-2 and visual formulas. |
| `coolingStorageLosses` | `QC,sto,ls`, relation (3.184) | MC001-2022, 3.2.4; Tabel 3.7; relations (3.94)-(3.135) | kWh | storage type, medium, control mode | `indexed_table` | `false` | Storage section is extensive; formulas require separate extraction before implementation. |
| `fanSpecificPower` | fan energy | MC001-2022, 3.2.3; relations (3.55)-(3.61); manufacturer curves/SR EN ISO 5801 | W, Pa, or curve | fan type, airflow, pressure, efficiency | `needs_visual_verification` | `false` | Fan energy formula not fully transcribed. |
| `ventilationOperationHours` | fan/AHU energy | MC001-2022, 3.2.3 | h | timestep, schedule, operation signal | `needs_source_table` | `false` | Requires explicit operation schedule or sourced system data. |
| `airHandlingUnitType` | AHU treatment and losses | MC001-2022, 3.2.3; Figure 3.13; Tabel 3.4 example | category | AHU configuration, heat recovery, recirculation, humidifier | `indexed_table` | `false` | Example tables exist; not default values. |
| `humidificationSystem` | humidification energy | MC001-2022, 3.2.3, relations (3.45), (3.46) | category, kWh | humidifier type, source/carrier | `needs_visual_verification` | `false` | Steam/non-steam branch must be verified. |
| `dehumidificationSystem` | dehumidification energy | MC001-2022, 3.2.3, relation (3.44) | kWh | AHU moisture conditions, airflow | `needs_visual_verification` | `false` | Exact relation not implementation-ready. |
| `auxiliaryFanPower` | fan electricity | MC001-2022, 3.2.3, relation (3.55); manufacturer data | W or kW | fan, airflow, pressure, efficiency | `needs_visual_verification` | `false` | Do not invent fan power. |
| `pumpPower` | cooling distribution/storage auxiliaries | MC001-2022, 3.2.4; 3.2.5; relations (3.115)-(3.132) | kW, kWh | pump type, flow, operation time | `needs_visual_verification` | `false` | Storage pump relations require separate extraction. |
| `ductLeakageFactors` | ventilation/AHU airflow | MC001-2022, 3.2.3, Tabel 3.2 | `-` | duct airtightness class | `extracted_table_metadata` | `true` | Table values are visible; future registry should copy them after review. |
| `ahuLeakageFactors` | ventilation/AHU airflow | MC001-2022, 3.2.3, Tabel 3.3 | `-` | AHU airtightness class L1/L2/L3 | `extracted_table_metadata` | `true` | Table values are visible; future registry should copy them after review. |
| `referenceCoolingSystem` | reference building | MC001-2022, 5.2 characteristic 13 | SEER | cooling applicability | `extracted_text_rule` | `true` | Direct expansion, `SEER = 2.5`, no humidity control. |
| `referenceVentilationSystem` | reference building | MC001-2022, 5.2 characteristics 6 and 14 | m3/h, %, or method-dependent | building/use category, airflow requirement | `external_module_needed` | `false` | Heat-recovery efficiency 75% extracted; airflow rules external. |

## Cross-references

- Useful cooling demand comes from `07_monthly_heating_cooling_demand`.
- Ventilation heat transfer coefficient `Hve` comes from `06_ventilation_and_infiltration`.
- Monthly climate data comes from `17_climate_annex`.
- Final/primary/CO2 aggregation comes from `13_final_primary_co2_rer`.
- Reference building comes from `14_reference_building`.
- Certificate/classes come from `15_energy_classes_and_certificate`.
- Renewables/heat pumps cross-reference `12_renewables` if applicable.
- Internal gains from recoverable HVAC losses cross-reference `08_internal_and_solar_gains`.

## Missing-input behavior

If useful cooling demand is missing, a future calculator must return:

`status: cannot_calculate_cooling_final_energy_missing_cooling_demand`

If system performance/efficiency is missing, a future calculator must return:

`status: cannot_calculate_cooling_final_energy_missing_system_performance`

If fan/auxiliary data is missing, a future calculator must return:

`status: cannot_calculate_ventilation_auxiliary_energy_missing_fan_data`

If AHU/humidification/dehumidification data is missing where applicable, a future calculator must return:

`status: cannot_calculate_air_handling_energy_missing_ahu_data`

No invented EER/SEER/COP, fan power, pump power, operation schedule, humidification/dehumidification factor, duct leakage class, AHU leakage class, or reference airflow value is allowed.

## Implementation implications for LaCurent

- Module `06_ventilation_and_infiltration` calculates ventilation heat transfer, not full system final energy.
- Useful cooling demand must not be treated directly as final energy.
- Cooling final energy requires system performance and losses.
- Mechanical ventilation auxiliary energy requires fan/system data.
- Cooling and ventilation final energy must be reported by carrier before primary energy and CO2 conversion.
- Reference cooling `SEER = 2.5` and reference ventilation heat recovery `75%` are reference-building rules, not real-building defaults.
- Do not hardcode system efficiencies until MC001/external tables are extracted into reviewed registries/datasets.
- This module does not assign energy class.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `16_audit_energy_measures` or `18_examples_and_breviars` depending on priority.
