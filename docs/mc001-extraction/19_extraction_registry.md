# 19 Extraction Registry and Consistency Pass

## Purpose

This file is the final registry and consistency pass for the MC001 extraction package. It does not extract new formulas from the PDF. It indexes the reviewed extraction modules, their formulas, data dependencies, statuses, blockers and future implementation priorities for the LaCurent Physics Engine.

LaCurent disclaimer: this registry supports non-official implementation planning. It is not an official energy performance certificate, not an official audit report and not permission to issue official MC001 documents.

## Source modules inspected

- `00_scope_terminology_symbols.md`
- `01_geometry_envelope_definitions.md`
- `02_materials_lambda_R_U.md`
- `03_thermal_bridges.md`
- `04_minimum_envelope_requirements.md`
- `05_transmission_heat_transfer.md`
- `06_ventilation_and_infiltration.md`
- `07_monthly_heating_cooling_demand.md`
- `08_internal_and_solar_gains.md`
- `09_dhw_systems.md`
- `10_lighting.md`
- `11_cooling_ventilation_systems.md`
- `12_renewables.md`
- `13_final_primary_co2_rer.md`
- `14_reference_building.md`
- `15_energy_classes_and_certificate.md`
- `16_audit_energy_measures.md`
- `17_climate_annex.md`
- `18_examples_and_breviars.md`

## Overall extraction status

Extraction package status: `registry_complete_with_blockers`.

Core formula families for isolated helpers are extracted for geometry, material lambda/R/U, thermal bridges, transmission coefficients, ventilation coefficients, monthly transfer/balance composition, DHW, final/primary/CO2 aggregation and several renewable/export indicators.

Official-like monthly calculation remains blocked until climate/solar datasets and lookup keys are extracted into reviewed registries. Certificate/classification and reference-building logic remain blocked until threshold/reference datasets are reviewed and represented as registries. Lighting remains blocked on SR EN 15193-1 dependencies that are referenced but not locally extracted.

## Implementation readiness summary

- Isolated formula helpers are ready where `implementationAllowed = true` and all inputs are explicit.
- Dataset-backed registries are required before default/normative calculations.
- No calculator should hardcode normative table values inline.
- No module authorizes HDD fallback as the official MC001 monthly method.
- Examples and breviars are manual validation references only until visual table cleanup.

## Blocked dependencies summary

- Climate dataset: monthly exterior temperature, annual exterior temperature, solar irradiation and sky/longwave terms are blocked.
- Lighting dataset/formulas: SR EN 15193-1 dependencies are referenced but not locally extracted.
- Reference building datasets: reference envelope/system/ventilation/lighting/renewable parameters are only partially indexed.
- Class threshold datasets: tables 5.7-5.14 are indexed and must become reviewed registries.
- Economic audit formulas: relations (6.1), (6.3), (6.4) remain visually blocked.

## Module status matrix

| module | file | status | implementationReadiness | main dependencies | main blockers | notes |
| --- | --- | --- | --- | --- | --- | --- |
| 00 | `00_scope_terminology_symbols.md` | extracted with some needs_verification references | documentation_only | none | none for implementation planning | Terminology baseline. |
| 01 | `01_geometry_envelope_definitions.md` | extracted | ready_for_isolated_formula_implementation | explicit geometry inputs | missing geometry blocks envelope heat loss | No square-footprint assumptions. |
| 02 | `02_materials_lambda_R_U.md` | extracted | ready_for_isolated_formula_implementation | material lambda, thickness, Rsi/Rse, Tabel 2.2 dataset | no inline normative coefficients | Tabel 2.2 ready for registry. |
| 03 | `03_thermal_bridges.md` | extracted | ready_for_isolated_formula_implementation | U/A, psi/length, chi or U' | missing bridge data lowers confidence | Do not mix U' with explicit psi/chi. |
| 04 | `04_minimum_envelope_requirements.md` | partial_needs_verification | ready_for_dataset_registry_later | Tabel 2.4, 2.7, 2.9a/b, 2.10a/b | some visual/table verification remains | Validation thresholds, not raw U calculators. |
| 05 | `05_transmission_heat_transfer.md` | extracted | ready_for_isolated_formula_implementation | Hd/Hg/Hu/Ha, monthly climate values | climate data for monthly transfer | Figure 2.11 formula is extracted unnumbered. |
| 06 | `06_ventilation_and_infiltration.md` | extracted | ready_for_isolated_formula_implementation | airflow/bve/fve/rho/ca, monthly climate values | climate source for monthly transfer | 0.34 helper is derived, not official numbered formula. |
| 07 | `07_monthly_heating_cooling_demand.md` | partial_needs_verification | ready_for_isolated_formula_implementation | Qtr/Qve/Qint/Qsol/utilization factors | full monthly inputs and climate/gains datasets | No HDD fallback. |
| 08 | `08_internal_and_solar_gains.md` | partial_needs_external_data | ready_for_dataset_registry_later | internal gains data, solar data, shading/orientation | climate/solar annex missing | Formulas extracted; default mode blocked by data. |
| 09 | `09_dhw_systems.md` | extracted | ready_for_isolated_formula_implementation | DHW volume, temperatures, pipe/system data, Tabel 3.3.1 | non-residential table values indexed, not copied | 3.188-3.224 extracted. |
| 10 | `10_lighting.md` | blocked_missing_lighting_tables | blocked_missing_external_standard | SR EN 15193-1 and lighting tables | formulas/tables not locally extracted | Lighting cannot be default-calculated. |
| 11 | `11_cooling_ventilation_systems.md` | partial_needs_verification | partial_requires_visual_verification | useful cooling, EER/SEER/COP, fan/AHU data | several AHU/fan formulas visually unclear | Module 06 is heat transfer, not system final energy. |
| 12 | `12_renewables.md` | partial_needs_verification | ready_for_dataset_registry_later | renewable system data, climate/solar data, factor tables | Chapter 4 system methods partly indexed/blocked | Export/RER formulas are clearer than production models. |
| 13 | `13_final_primary_co2_rer.md` | partial_factor_tables_indexed | ready_for_dataset_registry_later | final energy by carrier/service, factors 5.17/5.18 | factor values indexed, not copied | Primary/CO2 calculators need factor registries. |
| 14 | `14_reference_building.md` | partial_needs_verification | partial_requires_visual_verification | real geometry, reference parameter tables, climate/factors | reference datasets incomplete | Do not build ReferenceBuildingBuilder yet. |
| 15 | `15_energy_classes_and_certificate.md` | partial_needs_verification | ready_for_dataset_registry_later | class tables 5.7-5.14, certificate indicators | threshold tables indexed, not registries | No official certificate claim. |
| 16 | `16_audit_energy_measures.md` | partial_needs_verification | partial_requires_visual_verification | before/after indicators, costs, energy prices | economic formulas 6.1/6.3/6.4 visually blocked | Recommendations require recalculation, not generic text. |
| 17 | `17_climate_annex.md` | blocked_missing_climate_dataset | blocked_missing_climate_dataset | MC001 climate/solar datasets | exact local tables not found | Explicit climate inputs may be non-default only with warnings. |
| 18 | `18_examples_and_breviars.md` | partial_index_only | manual_validation_only | visual cleanup of example tables | examples are partial/visually noisy | Do not automate as fixtures yet. |

## Formula registry

| formulaId | module | MC001 reference | label | output | unit | status | implementationAllowed | dependencies | missingInputsBehavior | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `MC001_2_1_ENVELOPE_AREA` | 01 | 2.1.3, rel. (2.1) | envelope area | A | m2 | extracted | true | explicit envelope areas | missing geometry warning | Use explicit perimeter elements only. |
| `MC001_2_1_USEFUL_VOLUME` | 01 | 2.1.3, rel. (2.1) | useful/interior volume | Vu | m3 | extracted | true | zone volumes or area-height data | missing volume warning | Needed for ventilation/compactness. |
| `MC001_2_3_LAMBDA_CORRECTED` | 02 | 2.1.4, rel. (2.3) | corrected conductivity | lambdaCorrected | W/(mK) | extracted | true | lambda_normat, coefficient a | warn if a missing | Do not invent coefficient. |
| `PHYSICS_LAYER_R` | 02 | derived from 2.4.1 | layer resistance | Rj | m2K/W | extracted | true | thickness, lambda | validation error | Homogeneous layer helper. |
| `MC001_2_6_R_TOTAL` | 02 | 2.4.1, rel. (2.6) | total thermal resistance | R | m2K/W | extracted | true | Rsi, Rse, layers, air layers | missing surface resistance warning/block | Rsi/Rse must come from registry/input. |
| `MC001_2_7_U_VALUE` | 02 | 2.4.1, rel. (2.7) | U-value | U | W/(m2K) | extracted | true | total R | validation error | Plain U, not U'. |
| `MC001_2_11_HD_WITH_BRIDGES` | 03 | 2.4.1, rel. (2.11) | Hd with explicit bridges | Hd | W/K | extracted | true | U/A, psi/l, chi | bridge-missing warning | Do not also use U'. |
| `MC001_2_12_HD_CORRECTED_U` | 03 | 2.4.1, rel. (2.12) | Hd with U' | Hd | W/K | extracted | true | U', A | source-missing warning | Do not add psi/chi again. |
| `MC001_2_13_PSI_LINEAR_BRIDGE` | 03 | 2.4.1, rel. (2.13) | linear bridge psi | psi | W/(mK) | extracted | true | L2D, U/A, length | source-missing warning | Only when L2D is explicit. |
| `MC001_2_14_TRANSMISSION_HEAT_FLOW` | 03 | 2.4.1, rel. (2.14) | transmission heat flow | PhiTr | W | extracted | true | Htr, indoor/outdoor temp | missing temp warning | Instantaneous, not monthly demand. |
| `MC001_2_15_HTR_TOTAL` | 05 | 2.4.1, rel. (2.15) | total transmission coefficient | Htr | W/K | extracted | true | Hd, Hg, Hu, Ha | component missing warnings | Keep ground/unheated/adjacent separate. |
| `MC001_2_27_HTR_EXCLUDING_GROUND` | 05 | 2.7.1.1, rel. (2.27) | Htr excluding ground | HtrExcludingGround | W/K | extracted | true | Hel, thermal bridge H | missing envelope/bridge warning | Monthly coefficient. |
| `MC001_2_28_HTR_THERMAL_BRIDGES` | 05 | 2.7.1.1, rel. (2.28) | monthly thermal bridge coefficient | HtrTb | W/K | extracted | true | psi, length | bridge data warning | Do not invent psi. |
| `MC001_2_FIG_2_11_MONTHLY_TRANSMISSION_TRANSFER` | 05 | 2.7.1.1, Fig. 2.11 | monthly transmission transfer | QtrMonthly | kWh | extracted_unnumbered | true | Htr excl. ground, Hgr, monthly/annual temp, hours | climate missing status | Ground term uses annual exterior temp. |
| `MC001_2_29_Q_VENTILATION_MONTHLY` | 06 | 2.7.1.2, rel. (2.29) | monthly ventilation transfer | QveMonthly | kWh | extracted | true | Hve, setpoint, monthly temp, hours | climate source warning/status | Isolated Qve only. |
| `MC001_2_30_HVE` | 06 | 2.7.1.2, rel. (2.30) | ventilation heat transfer coefficient | Hve | W/K | extracted | true | rho, ca, qV, bve, fve_dyn | missing flow/factor warning | qV unit must be explicit. |
| `MC001_2_31_BVE` | 06 | 2.7.1.2, rel. (2.31) | ventilation temperature factor | bve | - | extracted | true | indoor, supply, outdoor temp | denominator zero error | Trace supply temperature. |
| `MC001_2_32_BVE_UNCONDITIONED` | 06 | 2.7.1.2, rel. (2.32) | bve from unconditioned zone | bve | - | extracted | true | bztu | bztu missing warning | Do not invent bztu. |
| `PHYSICS_AIRFLOW_FROM_ACH` | 06 | derived helper | airflow from ACH | airflowM3h | m3/h | derived_helper | true | ACH, volume | missing ACH/volume warning | Not a numbered MC001 formula. |
| `MC001_MONTHLY_TOTAL_HEAT_TRANSFER` | 07 | 2.7.1, Fig. 2.10 | total monthly heat transfer | QhtMonthly | kWh | extracted_unnumbered | true | Qtr, Qve | missing monthly transfer inputs | Combines only calculated values. |
| `MC001_MONTHLY_TOTAL_GAINS` | 07/08 | 2.7.2, Fig. 2.13 | total monthly gains | QgnMonthly | kWh | extracted_unnumbered | true | Qint, Qsol | missing gains inputs | Cross-referenced in 08. |
| `MC001_MONTHLY_HEATING_NEED` | 07 | 2.8.1, Fig. 2.18 | useful monthly heating need | QHndMonthly | kWh | extracted_unnumbered_visual | true | QHht, etaHgn, QHgn, gammaH | missing monthly inputs status | No HDD fallback. |
| `MC001_MONTHLY_COOLING_NEED` | 07 | 2.8.1, Fig. 2.19 | useful monthly cooling need | QCndMonthly | kWh | extracted_unnumbered_visual | true | QCht, etaCht, QCgn, aCred, gammaC | missing monthly inputs status | Do not infer from heating. |
| `MC001_ANNUAL_HEATING_NEED_SUM` | 07 | 2.10, rel. (2.84) | annual heating need sum | QHndAnnual | kWh/year | extracted | true | 12 monthly values | require 12 months | Annualized by sum. |
| `MC001_ANNUAL_COOLING_NEED_SUM` | 07 | 2.10, rel. (2.85) | annual cooling need sum | QCndAnnual | kWh/year | extracted | true | 12 monthly values | require 12 months | Annualized by sum. |
| `MC001_INTERNAL_GAINS_MONTHLY` | 08 | 2.7.2 | monthly internal gains | QintMonthly | kWh | extracted | true | internal gain inputs | missing gain data status | Default data still external. |
| `MC001_SOLAR_GAINS_MONTHLY` | 08 | 2.7.3 | monthly solar gains | QsolMonthly | kWh | extracted | true | transparent/opaque solar gains | climate/solar missing status | Needs climate/solar registry. |
| `MC001_SOLAR_GAINS_TRANSPARENT` | 08 | 2.7.3 | transparent solar gains | QsolTransparent | kWh | extracted | true | window area, orientation, shading, irradiation | climate/solar missing status | Do not use zero solar silently. |
| `MC001_SOLAR_GAINS_OPAQUE` | 08 | 2.7.3 | opaque solar gains | QsolOpaque | kWh | extracted | true | opaque area, absorptance, U, Rse, irradiation | climate/solar missing status | Opaque credit needs full inputs. |
| `MC001_3_188_DHW_USEFUL_ENERGY` | 09 | 3.3.6, rel. (3.188) | DHW useful energy | QWnd | kWh/timestep | extracted | true | Vt, cw, rho, hot/cold temp | missing DHW volume/temp | Unit conversion must be explicit. |
| `MC001_3_189_DHW_DAILY_VOLUME_RESIDENTIAL` | 09 | 3.3.6.1, rel. (3.189) | residential daily DHW volume | VWDay | l/day | extracted | true | VWPDay, nP | missing occupants/use data | Residential path. |
| `MC001_3_190_DHW_DAILY_VOLUME_NON_RESIDENTIAL` | 09 | 3.3.6.1, rel. (3.190) | non-residential daily DHW volume | VWDay | l/day | extracted | true | VWFDay, f | missing Tabel 3.3.1 value | Table indexed, values not copied. |
| `MC001_3_191_DHW_VOLUME_TEMPERATURE_CORRECTION` | 09 | 3.3.6.1, rel. (3.191) | DHW volume temp correction | VWFDayCorrected | l/unit.day | extracted | true | norm volume, temps | denominator zero/missing temps | Uses documented temperature symbols. |
| `MC001_3_192_NP_EQ_MAX_SINGLE_FAMILY` | 09 | 3.3.6.1, rel. (3.192) | max equivalent consumers single-family | nPEqMax | - | extracted | true | Ah | missing area | Piecewise. |
| `MC001_3_193_NP_EQ_SINGLE_FAMILY` | 09 | 3.3.6.1, rel. (3.193) | equivalent consumers single-family | nPEq | - | extracted | true | nPEqMax | missing nPEqMax | Piecewise. |
| `MC001_3_194_NP_EQ_MAX_APARTMENT` | 09 | 3.3.6.1, rel. (3.194) | max equivalent consumers apartment | nPEqMax | - | extracted | true | Ah | missing area | Piecewise. |
| `MC001_3_195_NP_EQ_APARTMENT` | 09 | 3.3.6.1, rel. (3.195) | equivalent consumers apartment | nPEq | - | extracted | true | nPEqMax | missing nPEqMax | Piecewise. |
| `MC001_3_196_DHW_SPECIFIC_VOLUME_RESIDENTIAL` | 09 | 3.3.6.1, rel. (3.196) | residential specific DHW volume | VWPDay | l/(person eq.day) | extracted | true | x, y, Ah, nPEq | missing nPEq | Uses MC001 x/y coefficients. |
| `MC001_3_200_DHW_MEAN_DISTRIBUTION_TEMPERATURE` | 09 | 3.3.7.2, rel. (3.200) | mean distribution temperature | thetaWMean | C | extracted | true | thetaW, deltaThetaW | missing temp difference | First distribution formula. |
| `MC001_3_201_DHW_LINEAR_TRANSMITTANCE_INSULATED_PIPE` | 09 | 3.3.7.2, rel. (3.201) | insulated pipe linear transmittance | psiW | W/(mK) | extracted | true | pipe/insulation geometry/material | missing pipe data | Registry may need material/pipe properties. |
| `MC001_3_202_DHW_LINEAR_TRANSMITTANCE_BURIED_PIPE` | 09 | 3.3.7.2, rel. (3.202) | buried pipe linear transmittance | psiW | W/(mK) | extracted | true | buried pipe data | missing pipe/soil data | Applies where relevant. |
| `MC001_3_203_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_PIPE` | 09 | 3.3.7.2, rel. (3.203) | uninsulated pipe transmittance | psiW | W/(mK) | extracted | true | pipe data | missing pipe data | Do not use when insulated. |
| `MC001_3_204_DHW_LINEAR_TRANSMITTANCE_UNINSULATED_APPROX` | 09 | 3.3.7.2, rel. (3.204) | approximate uninsulated pipe transmittance | psiW | W/(mK) | extracted | true | approximate pipe data | missing pipe data | Approximation must be traced. |
| `MC001_3_205_DHW_DISTRIBUTION_LOSS_WITH_RECIRCULATION` | 09 | 3.3.7.2, rel. (3.205) | distribution loss with recirculation | QWdisLs | kWh | extracted | true | length, psi, temp, time | missing distribution data | Recirculation path. |
| `MC001_3_206_DHW_STUB_LOSS_WITHOUT_RECIRCULATION` | 09 | 3.3.7.2, rel. (3.206) | stub loss without recirculation | QWdisLs | kWh | extracted | true | pipe segment data | missing pipe data | Non-recirculation path. |
| `MC001_3_207_DHW_RECIRCULATION_LOSS_WITHOUT_DRAWOFF` | 09 | 3.3.7.2, rel. (3.207) | recirculation loss without drawoff | QWdisLs | kWh | extracted | true | recirculation data | missing recirculation data | Requires operating time. |
| `MC001_3_208_DHW_SPECIFIC_LINEAR_HEAT_LOSS` | 09 | 3.3.7.2, rel. (3.208) | specific linear heat loss | qW | W/m | extracted | true | pipe/transmittance/temp | missing pipe/temp data | Distribution subformula. |
| `MC001_3_209_DHW_EXPONENTIAL_COEFFICIENT` | 09 | 3.3.7.2, rel. (3.209) | exponential coefficient | beta | - | extracted | true | pipe thermal capacity/loss data | missing pipe data | Temperature profile support. |
| `MC001_3_210_DHW_TEMPERATURE_AFTER_NONUSE_INTERVAL` | 09 | 3.3.7.2, rel. (3.210) | temp after nonuse interval | thetaW | C | extracted | true | initial temp, beta/time | missing interval data | Non-use behavior. |
| `MC001_3_211_DHW_AVERAGE_TEMPERATURE_PROFILE` | 09 | 3.3.7.2, rel. (3.211) | average temperature profile | thetaWAvg | C | extracted | true | profile inputs | missing profile data | Distribution temperature profile. |
| `MC001_3_212_DHW_AVERAGE_TEMPERATURE_SIMPLIFIED` | 09 | 3.3.7.2, rel. (3.212) | simplified average temperature | thetaWAvg | C | extracted | true | simplified inputs | missing temp data | Simplified path must be traced. |
| `MC001_3_213_DHW_TOTAL_DISTRIBUTION_LOSS` | 09 | 3.3.7.2, rel. (3.213) | total distribution loss | QWdisLs | kWh | extracted | true | distribution loss components | missing loss components | Aggregation. |
| `MC001_3_214_DHW_RECOVERABLE_DISTRIBUTION_LOSS` | 09 | 3.3.7.2, rel. (3.214) | recoverable distribution loss | QWdisLsRbl | kWh | extracted | true | total loss, recovery context | missing recovery context | Recoverable, not automatically recovered. |
| `MC001_3_215_DHW_RECOVERY_FACTOR` | 09 | 3.3.7.2, rel. (3.215) | DHW recovery factor | etaWRvd | - | extracted | true | recovery inputs | missing recovery data | Factor must be sourced/calculated. |
| `MC001_3_216_DHW_RECOVERED_DISTRIBUTION_HEAT` | 09 | 3.3.7.2, rel. (3.216) | recovered distribution heat | QWdisLsRvd | kWh | extracted | true | recoverable loss, factor | missing recovery data | Trace recovered heat destination. |
| `MC001_3_217_DHW_PUMP_DESIGN_POWER` | 09 | 3.3.7.4, rel. (3.217) | pump design power | PWdisPmp | W | extracted | true | pump/hydraulic data | missing pump data | Auxiliary energy chain. |
| `MC001_3_218_DHW_PRESSURE_DROP` | 09 | 3.3.7.4, rel. (3.218) | pressure drop | deltaP | Pa | extracted | true | hydraulic data | missing hydraulic data | Pump chain. |
| `MC001_3_219_DHW_RECIRCULATION_PUMP_ENERGY` | 09 | 3.3.7.4, rel. (3.219) | recirculation pump energy | WWdisAux | kWh | extracted | true | pump power/time | missing pump/time data | Auxiliary. |
| `MC001_3_220_DHW_AUXILIARY_DISTRIBUTION_ENERGY` | 09 | 3.3.7.4, rel. (3.220) | distribution auxiliary energy | WWdisAux | kWh | extracted | true | auxiliary components | missing auxiliary data | Aggregation. |
| `MC001_3_221_DHW_PUMP_ENERGY_USE_FACTOR` | 09 | 3.3.7.4, rel. (3.221) | pump use factor | factor | - | extracted | true | operation/use data | missing operation data | Auxiliary subfactor. |
| `MC001_3_222_DHW_PUMP_EFFICIENCY_FACTOR` | 09 | 3.3.7.4, rel. (3.222) | pump efficiency factor | factor | - | extracted | true | pump efficiency data | missing pump efficiency | Do not invent pump efficiency. |
| `MC001_3_223_DHW_REFERENCE_PUMP_POWER` | 09 | 3.3.7.4, rel. (3.223) | reference pump power | PRef | W | extracted | true | reference pump parameters | missing reference parameters | Needs registry/input. |
| `MC001_3_224_DHW_HEAT_TRACING_AUXILIARY_ENERGY` | 09 | 3.3.7.4, rel. (3.224) | heat tracing auxiliary energy | WWdisAux | kWh | extracted | true | heat tracing data | missing heat tracing data | Only if applicable. |
| `MC001_5_3_FINAL_ENERGY_INCLUDES_LIGHTING_SERVICE` | 10 | 5.3 context | lighting included in final energy | service final energy | kWh/year | extracted | true | lighting result | lighting missing status | Does not calculate lighting itself. |
| `MC001_3_4_LIGHTING_ENERGY_CALCULATION_PENDING` | 10 | 3.4 / SR EN 15193-1 | lighting energy formula pending | lighting energy | kWh/year | external_normative_reference_needed | false | SR EN 15193-1 | lighting missing status | Blocked external standard. |
| `MC001_3_183_HEATING_GENERATOR_INPUT_ENERGY` | 11 | 3.11/3.183 | generator input energy | input energy | kWh | extracted | true | useful/system demand, efficiency | missing system performance | In cooling/ventilation systems module for system context. |
| `MC001_3_184_COOLING_GENERATOR_INPUT_ENERGY` | 11 | 3.11/3.184 | cooling generator input | cooling final/input | kWh | extracted | true | useful cooling, generator performance | cooling demand/performance status | Do not treat useful as final energy. |
| `MC001_3_186_TOTAL_COOLING_AUXILIARY_ENERGY` | 11 | 3.11/3.186 | cooling auxiliary aggregation | aux energy | kWh | extracted | true | auxiliary components | missing fan/pump data | System auxiliary only. |
| `MC001_3_40_AHU_HEATING_COIL_ENERGY` | 11 | 3.2.5/3.40 | AHU heating coil energy | energy | kWh | extracted_with_symbol_normalization | false | AHU data | missing AHU data | Needs symbol normalization. |
| `MC001_3_43_AHU_COOLING_COIL_ENERGY` | 11 | 3.2.5/3.43 | AHU cooling coil energy | energy | kWh | needs_visual_verification | false | AHU data | missing AHU data | Blocked. |
| `MC001_3_55_FAN_ENERGY` | 11 | 3.2.5/3.55 | fan energy | fan energy | kWh | needs_visual_verification | false | fan power/SFP/time | fan data missing status | Blocked. |
| `MC001_3_56_TO_3_61_FAN_EFFICIENCY_PRESSURE` | 11 | 3.2.5/3.56-3.61 | fan efficiency/pressure group | factors | mixed | partial_extracted_visual_verification_pending | false | fan/pressure data | fan data missing status | Blocked group. |
| `MC001_3_136_TO_3_145_COOLING_GENERATOR_REQUEST` | 11 | 3.2.7/3.136-3.145 | cooling generator request group | cooling energy | kWh | needs_visual_verification | false | cooling system data | performance missing status | Blocked group. |
| `MC001_4_5_PV_PEAK_POWER_FROM_AREA` | 12 | 4.5 | PV peak power from area | Ppk | Wp/kWp | extracted | true | PV area/module data | missing PV data | Does not estimate production alone. |
| `MC001_5_29_ONSITE_ELECTRICITY_PRODUCTION_SUM` | 12 | 5.29 | onsite electricity annual sum | EPnren/el,prod,an | kWh/year | extracted | true | monthly production | missing renewable data | Annual aggregation. |
| `MC001_5_30_PV_SELF_CONSUMED_PEC_ELECTRICITY` | 12 | 5.30 | self-consumed PV for PEC | electricity | kWh | extracted | true | produced electricity, matching factor | matching factor missing | Matching factor not invented. |
| `MC001_5_31_ELECTRICITY_MATCHING_FACTOR` | 12 | 5.31 | electricity matching factor | fmatch | - | indexed/needs data | false | Tabel 5.21-5.23 | missing matching factor | Dataset needed. |
| `MC001_5_32_EXPORTED_ELECTRICITY` | 12 | 5.32 | exported electricity | Eexport | kWh | extracted | true | production, self-consumption | missing PV data | Export path. |
| `MC001_5_33_EXPORTED_ELECTRICITY_USED_NON_PEC` | 12 | 5.33 | exported electricity non-PEC | EexportNonPEC | kWh | extracted | true | exported electricity | missing export split | Reporting rule. |
| `MC001_5_34_EXPORTED_ELECTRICITY_TO_GRID` | 12 | 5.34 | exported to grid | Egrid | kWh | extracted | true | export split | missing export data | Reporting rule. |
| `MC001_5_35_ANNUAL_EXPORTED_ELECTRICITY_TO_GRID` | 12 | 5.35 | annual grid export | EgridAnnual | kWh/year | extracted | true | monthly exports | missing monthly exports | Annual sum. |
| `MC001_5_16_RENEWABLE_ENERGY_RATIO` | 12/13 | 5.16 | renewable energy ratio | RER | % or - | extracted | true | renewable/nonrenewable primary energy | missing factor data | Also indexed in 13. |
| `MC001_5_1_GLOBAL_WEIGHTED_ENERGY_BALANCE` | 13 | 5.1 | weighted energy balance | weighted energy | kWh/year | extracted | true | energy carriers/services | missing final energy | Chapter 5 energy balance. |
| `MC001_5_2_DELIVERED_WEIGHTED_ENERGY_SUM` | 13 | 5.2 | delivered weighted energy sum | weighted delivered | kWh/year | extracted | true | delivered energies/factors | missing final energy/factors | Carrier-based. |
| `MC001_5_3_FINAL_ENERGY_BY_CARRIER_SERVICE_SUM` | 13 | 5.3 | final energy by carrier/service | Qf | kWh/year | extracted | true | service/carrier final energy | missing final energy | Service/carrier breakdown required. |
| `MC001_TOTAL_FINAL_ENERGY_ANNUAL_SUM` | 13 | derived context | total final energy | QfTotal | kWh/year | derived_aggregation_from_mc001_context | true | service/carrier Qf | missing final energy | Requires explicit breakdown. |
| `MC001_5_4A_PRIMARY_ENERGY_TOTAL` | 13 | 5.4a | total primary energy | EPtot | kWh/year | extracted | true | final energy, factors | missing factor status | Uses factor table. |
| `MC001_5_4A_PRIMARY_ENERGY_NON_RENEWABLE` | 13 | 5.4a variant | non-renewable primary | EPnren | kWh/year | extracted_factor_variant | true | final energy, non-renewable factor | missing factor status | Needs 5.17 registry. |
| `MC001_5_4A_PRIMARY_ENERGY_RENEWABLE` | 13 | 5.4a variant | renewable primary | EPren | kWh/year | extracted_factor_variant | true | final energy, renewable factor | missing factor status | Needs 5.17 registry. |
| `MC001_5_4B_CO2_EMISSIONS` | 13 | 5.4b | CO2 emissions | ECO2 | kgCO2/year | extracted | true | final energy, CO2 factors | missing factor status | Needs 5.18 registry. |
| `MC001_SPECIFIC_PRIMARY_ENERGY_PER_AREA` | 13 | MC001 context | specific primary energy | EP/A | kWh/m2.year | derived_indicator_from_mc001_context | true | primary energy, reference area | specific area missing status | Denominator must be explicit. |
| `MC001_SPECIFIC_CO2_PER_AREA` | 13 | MC001 context | specific CO2 | ECO2/A | kgCO2/m2.year | derived_indicator_from_mc001_context | true | CO2, reference area | specific area missing status | Denominator must be explicit. |
| `MC001_CERTIFICATE_SPECIFIC_PRIMARY_ENERGY` | 15 | certificate context | certificate primary indicator | EPspec | kWh/m2.year | derived/context | true | module 13, area, class table | missing certificate input status | Not official certificate issuance. |
| `MC001_CERTIFICATE_SPECIFIC_CO2` | 15 | certificate context | certificate CO2 indicator | CO2spec | kgCO2/m2.year | derived/context | true | module 13, area | missing certificate input status | Separate from energy class. |
| `MC001_AUDIT_FINAL_ENERGY_SAVINGS_DERIVED` | 16 | 6.3-6.5 context | final energy savings | DeltaQf | kWh/year or kWh/m2.year | derived_indicator_from_mc001_audit_context | true | baseline/improved final energy | audit missing before/after status | Requires same boundary/unit. |
| `MC001_AUDIT_PRIMARY_ENERGY_SAVINGS_DERIVED` | 16 | 6.3-6.5 context | primary energy savings | DeltaEP | kWh/year or kWh/m2.year | derived_indicator_from_mc001_audit_context | true | baseline/improved primary energy | audit missing before/after status | Uses module 13. |
| `MC001_AUDIT_CO2_SAVINGS_DERIVED` | 16 | 6.3-6.5 context | CO2 savings | DeltaCO2 | kgCO2/year or kgCO2/m2.year | derived_indicator_from_mc001_audit_context | true | baseline/improved CO2 | audit missing before/after status | Uses same factor dataset. |
| `MC001_AUDIT_PERCENT_SAVINGS_DERIVED` | 16 | 6.5 context | percent savings | savingsPercent | % | derived_indicator_from_mc001_audit_context | true | baseline/improved values | baseline zero/missing | Generic savings indicator. |
| `MC001_6_1_GLOBAL_UPDATED_COST` | 16 | 6.5.3, rel. (6.1) | global updated cost | CG | currency | needs_visual_verification | false | economic inputs | payback/cost missing statuses | Do not implement until visually transcribed. |
| `MC001_6_3_PAYBACK_CONSTANT_CASHFLOW` | 16 | 6.5, rel. (6.3) | payback constant cash-flow | PB | years | needs_visual_verification | false | COINIT, CF, RAT | payback missing data/status | Blocked. |
| `MC001_6_4_PAYBACK_DISCOUNTED_CASHFLOW` | 16 | 6.5, rel. (6.4) | discounted payback | PB | years | needs_visual_verification | false | annual cash-flow, discount, replacements | payback missing data/status | Blocked. |
| `CALENDAR_MONTHLY_DURATION_HOURS` | 17 | derived calendar input | monthly duration | deltaTm | h | derived_calendar_input_not_mc001_formula | true | calendar month/year policy | missing duration policy | Not MC001 numbered formula. |

Formula registry count: 92 rows.

## Table/data registry

| dataKey | module | MC001 source | purpose | unit | lookupKeys | extractionStatus | implementationAllowed | registryNeeded | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| materialCorrectionCoefficients | 02 | Tabel 2.2 | lambda correction coefficient `a` | - | material group, condition, age condition | reviewed_dataset_registry_created | true for lookup | yes | Registry file: `src/physics-engine/datasets/mc001Table2_2MaterialCorrectionCoefficients.mjs`; still no automatic lambda calculation change. |
| surfaceResistancesRsiRse | 02 | 2.4.1 / associated tables | R total | m2K/W | boundary/orientation/surface condition | needs_source_table | false | yes | Rsi/Rse must not be hardcoded in calculators. |
| nZEBEnvelopeRequirementsResidential | 04 | Tabel 2.4 | R'min/U'max thresholds | m2K/W, W/(m2K) | element type | reviewed_dataset_registry_created | true for lookup | yes | Registry file: `src/physics-engine/datasets/mc001EnvelopeThresholds.mjs`; no envelope validation calculator added and no U/R calculation changed. |
| nZEBEnvelopeRequirementsNonResidential | 04 | Tabel 2.7 | R'min/U'max thresholds | m2K/W, W/(m2K) | building/use/element type | reviewed_dataset_registry_created | true for lookup | yes | Registry file: `src/physics-engine/datasets/mc001EnvelopeThresholds.mjs`; includes only values already extracted in module 04. |
| renovatedEnvelopeRequirements2_9a | 04 | Tabel 2.9a | renovation/reference envelope | m2K/W, W/(m2K) | building category, element type | needs_visual_verification | false | yes | Visual review required. |
| renovatedEnvelopeRequirements2_9b | 04 | Tabel 2.9b | renovation/reference envelope | m2K/W, W/(m2K) | building category, element type | needs_visual_verification | false | yes | Visual review required. |
| envelopePerformanceContext2_10a | 04 | Tabel 2.10a | energy/CO2 context | mixed | building category/context | indexed_table | true | yes | Context table. |
| envelopePerformanceContext2_10b | 04 | Tabel 2.10b | energy/CO2 context | mixed | building category/context | indexed_table | true | yes | Context table. |
| residentialMinimumAirflow | 06 | Chapter 1.2 table | minimum residential airflow | m3/h | main room count | extracted | true | yes | Not ACH; convert only with volume. |
| monthlyExteriorTemperature | 17 | climate annex/source referenced by MC001 | monthly method | C | locality/climate zone, month | blocked_missing_dataset | false | yes | Official-like monthly method blocked. |
| annualExteriorTemperature | 17 | climate annex/source referenced by MC001 | ground term/Fig. 2.11 | C | locality/climate zone | blocked_missing_dataset | false | yes | Needed by monthly transmission. |
| monthlyDurationHours | 17 | calendar input | monthly timestep | h | month, leap-year policy | derived_calendar_input_not_mc001_formula | true | optional | Implementation policy needed for leap years. |
| monthlySolarIrradiation | 17 | climate/solar annex/source referenced by MC001 | solar gains | kWh/m2 | locality, month, orientation, tilt | blocked_missing_dataset | false | yes | No online weather substitution. |
| orientationTiltLookup | 17 | climate/solar annex/source referenced by MC001 | solar gains | varies | orientation, tilt | blocked_missing_dataset | false | yes | Required for transparent/opaque gains. |
| skyRadiationOrLongwaveCorrection | 17 | climate/solar annex/source referenced by MC001 | sky/longwave correction | kWh/m2 or factor | locality, month, element data | blocked_missing_dataset | false | yes | Required for solar/sky terms. |
| dhwSpecificConsumptionByUse | 09 | Tabel 3.3.1 | non-residential DHW volume | l/unit.day at 60C | building use/destination | metadata_registry_created_values_missing | false for numeric lookup | yes | Registry file: `src/physics-engine/datasets/mc001DhwDemandTable3_3_1.mjs`; values were not available in extraction, so no DHW calculator added. |
| dhwTemperatureDefaults | 09 | 3.3.5 | DHW temperatures | C | temperature role | extracted | true | yes | Includes 10C cold, 60C distribution/storage, 45C draw recommended. |
| coolingSystemPerformanceTables | 11 | Chapter 3 cooling/system sections | EER/SEER/COP/losses | mixed | system type, component | needs_source_table/needs_visual_verification | false | yes | No invented EER/SEER/COP. |
| ahuFanAuxiliaryData | 11 | Chapter 3 AHU/fan sections | fan/AHU energy | mixed | AHU/fan type, airflow, pressure | needs_visual_verification | false | yes | Several formula groups blocked. |
| lightingExternalStandardData | 10 | SR EN 15193-1 referenced by MC001 | lighting energy/LENI | mixed | building use, schedule, control, daylight | external_module_needed | false | yes | Lighting remains blocked. |
| renewableSystemDataChapter4 | 12 | Chapter 4 renewable systems | renewable production | mixed | system type, size, climate | partial_needs_verification | false for default production | yes | PV area helper alone is not full production. |
| renewableMatchingTables5_21_5_23 | 12 | Tabele 5.21, 5.22, 5.23 | PV self-consumption/export matching | - | production/use/building context | indexed_table | true after registry | yes | Matching factor must not be invented. |
| primaryEnergyFactors | 13 | Tabel 5.17 | primary energy conversion | factor | carrier, factor type | reviewed_dataset_registry_created | true for lookup | yes | Registry file: `src/physics-engine/datasets/mc001PrimaryEnergyAndCO2Factors.mjs`; no primary energy calculator added and no production calculation changed. |
| co2EmissionFactors | 13 | Tabel 5.18 | CO2 conversion | kgCO2/kWh | carrier | reviewed_dataset_registry_created | true for lookup | yes | Registry file: `src/physics-engine/datasets/mc001PrimaryEnergyAndCO2Factors.mjs`; no CO2 calculator added and no production calculation changed. |
| refrigerantGwpTable | 13 | Tabel 5.19 | refrigerant emissions context | mixed | refrigerant | indexed_table | true after registry | yes | Not needed for simple carrier CO2. |
| refrigerantLeakageTable | 13 | Tabel 5.20 | refrigerant emissions context | mixed | system/refrigerant | indexed_table | true after registry | yes | Use only when cooling refrigerant modeled. |
| energyClassTables | 15 | Tabele 5.7-5.14 | class thresholds | kWh/m2.year, kgCO2/m2.year/context | building category, utility/service | metadata_registry_created_values_missing | false for numeric threshold lookup | yes | Registry file: `src/physics-engine/datasets/mc001EnergyClassThresholds.mjs`; values were not available in extraction, so no energy class calculator added. |
| certificateOutputFields | 15 | Tabel 5.15a | certificate output indicators | mixed | field/indicator | indexed_table | true after registry | yes | Output shape only, not official certificate. |
| table5_6Context | 15 | Tabel 5.6 | certificate/class context | mixed | context/category | needs_visual_verification | false | yes | Verify before implementation. |
| referenceBuildingParameters | 14 | Chapter 5.2 and referenced tables | reference building | mixed | building category, system/envelope parameter | partial_needs_verification | false for full builder | yes | Do not implement full builder yet. |
| auditEconomicSymbols | 16 | Tabel 6.1 | economic symbols/units | mixed | symbol | indexed_table | true for symbol lookup only | optional | Formula implementation still blocked. |
| auditEconomicIndices | 16 | Tabel 6.2 | economic indices | not applicable | suffix/index | indexed_table | true for index lookup only | optional | Supports audit formula parsing. |
| examplesBreviars | 18 | Anexa A, B, 6.1, 6.2, 6.3 | manual validation references | mixed | exampleId/topic | partial_index_only | false for automated fixture | no | Manual validation only until visual cleanup. |

Table/data registry count: 33 rows.

## Reviewed dataset registries

- Tabel 2.2 material correction coefficients:
  - registryFile: `src/physics-engine/datasets/mc001Table2_2MaterialCorrectionCoefficients.mjs`
  - status: `reviewed_dataset_registry_created`
  - implementationAllowed: true for lookup
  - calculation impact: no automatic lambda calculation change; calculators still require explicit coefficient selection/input.
- Tabel 2.4 and Tabel 2.7 NZEB envelope thresholds:
  - registryFile: `src/physics-engine/datasets/mc001EnvelopeThresholds.mjs`
  - status: `reviewed_dataset_registry_created`
  - implementationAllowed: true for lookup
  - calculation impact: no envelope validation calculator added; no U/R calculation changed.
- Tabel 5.17 primary energy factors and Tabel 5.18 CO2 emission factors:
  - registryFile: `src/physics-engine/datasets/mc001PrimaryEnergyAndCO2Factors.mjs`
  - status: `reviewed_dataset_registry_created`
  - implementationAllowed: true for lookup
  - calculation impact: no primary energy calculator added; no CO2 calculator added; no certificate/CPE calculation changed; no production calculation changed.
- Tabel 3.3.1 DHW demand values:
  - registryFile: `src/physics-engine/datasets/mc001DhwDemandTable3_3_1.mjs`
  - status: `metadata_registry_created_values_missing`
  - implementationAllowed: false for numeric lookup
  - calculation impact: no DHW calculator added; no production calculation changed.
- Tabele 5.7-5.14 energy/environmental class thresholds:
  - registryFile: `src/physics-engine/datasets/mc001EnergyClassThresholds.mjs`
  - status: `metadata_registry_created_values_missing`
  - implementationAllowed: false for numeric threshold lookup
  - calculation impact: no energy class calculator added; no certificate/CPE calculation changed; no production calculation changed.

## Isolated formula helpers

- Final/primary energy and CO2 indicators:
  - helperFile: `src/physics-engine/finalPrimaryCo2Indicators.mjs`
  - uses: reviewed dataset registry `src/physics-engine/datasets/mc001PrimaryEnergyAndCO2Factors.mjs` for Tabel 5.17 and Tabel 5.18 lookups
  - scope: final energy aggregation, primary energy conversion, CO2 conversion, specific indicators per reference/useful area, and missing-input statuses
  - integration impact: no production integration; no certificate/class calculation; no CPE calculation; no app flow change
  - remaining blockers: CPE and class calculation remain blocked until class thresholds and reference-building flows are implemented.
- Envelope requirement checks:
  - helperFile: `src/physics-engine/envelopeRequirementChecks.mjs`
  - uses: reviewed dataset registry `src/physics-engine/datasets/mc001EnvelopeThresholds.mjs` for Tabel 2.4 and Tabel 2.7 lookups
  - scope: corrected `R'` against `R'min`, corrected `U'` against `U'max`, combined checks, missing-input status, and low-confidence warning when plain `U` is compared to corrected `U'` thresholds
  - integration impact: no production integration; no U/R calculation changed; no certificate/class calculation added; no app flow change

## Status vocabulary

| status | meaning |
| --- | --- |
| extracted | Formula/rule/table is transcribed or summarized clearly enough for future implementation, subject to its dependencies. |
| extracted_unnumbered | Formula is present in a figure or unnumbered MC001 source and reference is explicit. |
| extracted_unnumbered_visual | Figure formula has been visually transcribed and may be implemented if inputs are available. |
| indexed_table | Table/source and lookup keys are identified, but values may still need a reviewed registry/dataset. |
| partial_needs_verification | Module has useful extraction, but some rules/tables/formulas remain unclear. |
| partial_needs_external_data | Formula logic is extracted but default inputs live in another dataset/module. |
| needs_visual_verification | Formula/table cannot be implemented until visually rechecked. |
| blocked_missing_climate_dataset | Monthly official-like calculation blocked by missing local MC001 climate/solar dataset. |
| blocked_missing_lighting_tables | Lighting blocked by SR EN 15193-1 dependencies not extracted locally. |
| partial_index_only | Useful index exists, but not enough clean numeric data for implementation/tests. |
| implementationAllowed true | Formula/rule can be implemented only with explicit inputs and documented dependencies. |
| implementationAllowed false | Do not implement yet; the extraction is blocked or only contextual. |

## Missing-input status registry

| statusCode | usedByModule | trigger | calculatorBehavior | notes |
| --- | --- | --- | --- | --- |
| `cannot_calculate_mc001_monthly_missing_climate_data` | 07, 08, 12, 14, 17 | missing monthly/annual climate or solar data | return blocked status, no HDD fallback | Official-like monthly method blocked. |
| `cannot_calculate_reference_building_missing_reference_parameter` | 14 | missing reference envelope/system/ventilation/lighting/renewable parameter | block reference building calculation | No arbitrary defaults. |
| `cannot_calculate_primary_or_co2_missing_final_energy` | 13 | missing final energy by service/carrier | block primary/CO2 | Useful demand is not final energy. |
| `cannot_calculate_primary_or_co2_missing_energy_factor` | 13, 14 | missing primary/CO2 factor value | block factor conversion | No invented carrier factors. |
| `cannot_calculate_specific_indicator_missing_reference_area` | 13 | missing denominator area | block specific indicator | Area must be explicit. |
| `cannot_calculate_energy_class_missing_threshold_table` | 15 | missing class table/threshold | block class assignment | No invented classes. |
| `cannot_calculate_certificate_indicators_missing_inputs` | 15 | missing primary/CO2/final indicators | block certificate indicator calculation | Non-official indicators only. |
| `cannot_calculate_cpe_missing_reference_building` | 15 | reference comparison required but missing | block CPE comparison | Needs module 14. |
| `cannot_validate_envelope_requirement_missing_table` | 04 | missing threshold table/lookup | block envelope validation | Do not pass/fail silently. |
| `cannot_calculate_renewable_contribution_missing_system_data` | 12 | missing renewable system parameters | block renewable contribution | Installed power alone may be insufficient. |
| `cannot_calculate_renewable_contribution_missing_factor_table` | 12 | missing renewable/factor table | block renewable contribution | Cross-reference module 13. |
| `cannot_calculate_lighting_missing_lighting_data` | 10 | missing lighting lookup tables | block lighting calculation | External standard dependency. |
| `cannot_calculate_lighting_missing_installed_power` | 10 | installed power absent and no valid default | block lighting calculation | No area-only default. |
| `cannot_calculate_lighting_missing_schedule` | 10 | schedule/operating hours missing | block lighting calculation | No invented hours. |
| `cannot_calculate_cooling_final_energy_missing_cooling_demand` | 11 | missing useful cooling demand | block final cooling energy | Needs module 07. |
| `cannot_calculate_cooling_final_energy_missing_system_performance` | 11 | missing EER/SEER/COP/losses | block final cooling energy | No invented performance. |
| `cannot_calculate_ventilation_auxiliary_energy_missing_fan_data` | 11 | missing fan/AHU data | block auxiliary energy | Fan formulas partly blocked. |
| `cannot_calculate_audit_savings_missing_before_after_indicators` | 16 | missing baseline or improved indicators | block savings | Before/after recalculation required. |
| `cannot_calculate_payback_missing_cost_data` | 16 | missing investment/maintenance/replacement costs | block payback | No invented costs. |
| `cannot_calculate_payback_missing_energy_price` | 16 | missing energy price/tariff assumptions | block payback | No invented prices. |
| `plain_U_compared_to_corrected_U_requirement_low_confidence` | 04 | plain U used against corrected U'/R' requirement | warn/lower confidence | Requires U' or explicit bridges. |
| `climate_source_missing_explicit_values_used` | 17 | explicit climate values supplied without official dataset | calculate only in explicit-input mode with warning | Not official MC001 default mode. |
| `manual_validation_reference_only` | 18 | partial/unclean example data | do not assert exact automated results | Manual validation only. |

Missing-input/status registry count: 23 rows.

## Implementation priority

1. Isolated formula helpers already extracted and `implementationAllowed = true`.
2. Dataset registries needed before official-like monthly calculations.
3. Climate dataset blocker.
4. Factor tables blocker.
5. Certificate class threshold blocker.
6. Lighting external standard blocker.
7. Audit economic formula blocker.

## Consistency checks

Isolated Physics Engine helper consistency pass completed:

- No production integration was added.
- No `src/physics-engine/index.mjs` export change was made.
- No certificate, CPE, or energy-class calculation was added.
- Remaining blockers are unchanged: climate dataset, DHW Tabel 3.3.1 numeric values, class thresholds 5.7-5.14 numeric values, and lighting external standard data.

| check | result | action |
| --- | --- | --- |
| Every module 00-18 is listed in this registry. | pass | Created this module matrix. |
| Every module is listed in `NEXT_EXTRACTION_STEPS.md`. | fixed | Added 00, 01 and 19; aligned stale statuses for 08, 09, 13 and 17. |
| Formulas marked `implementationAllowed = true` do not depend on hidden values without notes. | pass with caveat | Registry marks dataset dependencies and missing-input behavior. |
| Blocked formulas are not marked implementationAllowed true. | pass | Lighting, AHU/fan, reference blocked rules, audit 6.1/6.3/6.4 remain false. |
| No Sălicea/demo-house default is referenced as validation fixture. | pass | Examples module explicitly forbids Sălicea/demo fixtures. |
| No online weather/HDD fallback is presented as official MC001 method. | pass | Climate module blocks missing data and forbids HDD/weather substitution. |
| Lighting remains blocked on SR EN 15193-1 if data is not locally extracted. | pass | Module 10 remains `blocked_missing_lighting_tables`. |
| Audit economic formulas (6.1), (6.3), (6.4) remain blocked if unreadable. | pass | Module 16 and this registry keep `needs_visual_verification`. |

## Final extraction summary

### Modules ready for isolated implementation

- `01_geometry_envelope_definitions`
- `02_materials_lambda_R_U`
- `03_thermal_bridges`
- `05_transmission_heat_transfer`, for coefficient and explicit-input monthly helpers only
- `06_ventilation_and_infiltration`, for explicit-input helpers only
- `07_monthly_heating_cooling_demand`, for explicit already-computed monthly inputs only
- `09_dhw_systems`, for extracted formulas with explicit inputs
- portions of `11_cooling_ventilation_systems`, `12_renewables`, `13_final_primary_co2_rer`, `15_energy_classes_and_certificate` and `16_audit_energy_measures`, only where dependencies are explicit

### Modules ready only after dataset registry

- `04_minimum_envelope_requirements`
- `08_internal_and_solar_gains`
- `12_renewables`
- `13_final_primary_co2_rer`
- `15_energy_classes_and_certificate`
- parts of `09_dhw_systems`
- parts of `14_reference_building`

### Modules blocked by external data or visual verification

- `10_lighting`: blocked by SR EN 15193-1/local lighting dataset gap.
- `11_cooling_ventilation_systems`: several AHU/fan/cooling groups require visual verification.
- `14_reference_building`: reference parameter datasets incomplete.
- `16_audit_energy_measures`: economic formulas (6.1), (6.3), (6.4) require visual verification.
- `17_climate_annex`: blocked by missing climate/solar dataset.
- `18_examples_and_breviars`: manual validation only.

## Recommended next technical step

Create reviewed dataset registries for extracted tables before adding more calculators, starting with:

1. Material correction coefficients Tabel 2.2.
2. Envelope thresholds Tabel 2.4 and 2.7.
3. Primary/CO2 factor tables 5.17 and 5.18.
4. Certificate class tables 5.7-5.14.
5. DHW demand table 3.3.1.

Do not add UX/product features as part of this step.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
