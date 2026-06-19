# 16 Audit and Energy Measures

## Source document

- Source: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001 sections used:
  - MC001-2022, Capitolul 6, `Auditul energetic`
  - MC001-2022, 6.1, obiective si domeniu de aplicare
  - MC001-2022, 6.2, evaluarea performantei energetice
  - MC001-2022, 6.3, determinarea performantelor energetice si a consumului anual de energie
  - MC001-2022, 6.4, masuri de renovare energetica
  - MC001-2022, 6.5, analiza economica
  - MC001-2022, Tabel 6.1, simboluri si unitati pentru analiza economica
  - MC001-2022, Tabel 6.2, indici pentru marimi de cost/energie
  - MC001-2022, Figurile 6.1-6.4, fluxul costului global actualizat si al perioadei de recuperare
  - MC001-2022, exemplul/breviarul de analiza tehnico-economica pentru lucrari de renovare energetica
- Extraction status: `partial_needs_verification`
- Implementation relevance: defines how future audit/recommendation logic should compare a baseline building with renovation measures/packages, calculate savings, and evaluate economic indicators.
- LaCurent disclaimer: this extraction is only for LaCurent Physics Engine implementation planning. It is not an official energy audit, not an official certificate, and not a substitute for authorized auditor judgement.

## Concepts to extract

| concept | concise definition | implementation relevance |
| --- | --- | --- |
| audit energetic | Technical and energy assessment of a building and its systems, followed by technically/economically justified renovation options. | Audit output must be based on calculated building indicators, not arbitrary recommendations. |
| baseline building | Existing building state before proposed renovation measures. | Provides baseline final energy, primary energy, CO2, class and costs for comparison. |
| proposed measure | Individual intervention on envelope, systems, controls, DHW, lighting, ventilation, cooling or renewables. | Must have traceable technical effect and explicit cost assumptions if payback is calculated. |
| renovation package | Set of proposed measures analyzed together. | Package savings and costs must be calculated from the combined improved state. |
| before/after calculation | Recalculation of energy indicators after applying a measure/package and comparison with the initial state. | Required before savings, class changes or audit recommendations can be reported. |
| energy savings | Difference between baseline and improved energy indicators. | Requires comparable baseline and improved values. |
| primary energy savings | Difference between baseline and improved primary energy indicators. | Uses module 13 outputs for both states. |
| CO2 savings | Difference between baseline and improved emissions indicators. | Uses module 13 CO2 outputs for both states. |
| investment cost | Cost associated with a measure or package. | Must be explicit or sourced; LaCurent must not invent it. |
| payback period | Period in which cost savings recover investment under defined economic assumptions. | Requires investment cost, energy prices, discount assumptions and calculation period. |
| economic efficiency | Techno-economic comparison of renovation options using cost and energy/cost savings indicators. | Requires explicit economic inputs and traceable before/after results. |
| recommendation report | Audit output containing measures/packages, recalculated indicators, savings, economic conclusions and supporting data. | Future UI/reporting must distinguish calculated audit-backed recommendations from generic text. |
| certificate calculation vs audit recommendation | Certificate/classification reports performance indicators; audit compares interventions and economic effects. | Do not use class logic alone to generate audit recommendations. |

## Formula/rule registry entries

### Rule 1

- ruleId: `MC001_6_1_AUDIT_OBJECTIVE`
- labelRo: Obiectivul auditului energetic
- ruleText: Auditul energetic identifica principalele caracteristici termice si energetice ale cladirii si instalatiilor, apoi stabileste solutii tehnice si economice de renovare energetica pentru constructie si/sau instalatii.
- unit: not applicable
- output/impact: Defines audit scope and required before/after analysis context.
- MC001 reference: MC001-2022, 6.1
- ruleStatus: `extracted_text_rule`
- implementationAllowed: true
- implementation notes:
  - Future audit logic must be based on calculated thermal/energy indicators.
  - This rule does not authorize recommendations without calculation data.
- validation notes:
  - Confirm baseline building and system data before producing audit conclusions.

### Rule 2

- ruleId: `MC001_6_AUDIT_WORKFLOW`
- labelRo: Etapele auditului energetic
- ruleText: Auditul evalueaza performanta cladirii existente, identifica masuri si pachete de masuri, recalculeaza consumurile si economiile, reclasifica energetic unde este cazul, analizeaza eficienta economica si intocmeste raportul/dosarul de audit.
- unit: not applicable
- output/impact: Defines the required workflow for future audit modules.
- MC001 reference: MC001-2022, Capitolul 6, enumerarea etapelor auditului energetic
- ruleStatus: `extracted_text_rule`
- implementationAllowed: true
- implementation notes:
  - Before/after recalculation is required before savings or recommendations are credible.
  - The audit report/dossier is separate from certificate/class calculation.
- validation notes:
  - Each proposed package should reference baseline and improved calculation results.

### Formula 1

- formulaId: `MC001_AUDIT_FINAL_ENERGY_SAVINGS_DERIVED`
- labelRo: Economie de energie finala
- formulaText: `DeltaQf = Qf_baseline - Qf_improved`
- unit: kWh/year or kWh/m2.year, matching input indicator
- output: `finalEnergySavings`
- inputs:
  - `Qf_baseline`: final energy before renovation
  - `Qf_improved`: final energy after renovation/package
- MC001 reference: MC001-2022, 6.3-6.5 audit comparison context; MC001 renovation example output indicators
- formulaStatus: `derived_indicator_from_mc001_audit_context`
- implementationAllowed: true
- implementation notes:
  - Requires explicit baseline and improved final-energy values.
  - If values are by carrier/service, aggregation must be explicit and traceable.
- validation notes:
  - Baseline and improved values must use the same unit and boundary.
  - A negative value means the package increases final energy and must be reported as such.

### Formula 2

- formulaId: `MC001_AUDIT_PRIMARY_ENERGY_SAVINGS_DERIVED`
- labelRo: Economie de energie primara
- formulaText: `DeltaEP = EP_baseline - EP_improved`
- unit: kWh/year or kWh/m2.year, matching input indicator
- output: `primaryEnergySavings`
- inputs:
  - `EP_baseline`: primary energy before renovation
  - `EP_improved`: primary energy after renovation/package
- MC001 reference: MC001-2022, 6.3-6.5 audit comparison context; MC001 renovation example output indicators
- formulaStatus: `derived_indicator_from_mc001_audit_context`
- implementationAllowed: true
- implementation notes:
  - Primary energy values come from module 13.
  - Do not compare useful demand directly with primary energy.
- validation notes:
  - Both indicators must use the same area normalization if specific indicators are used.

### Formula 3

- formulaId: `MC001_AUDIT_CO2_SAVINGS_DERIVED`
- labelRo: Reducere emisii CO2
- formulaText: `DeltaCO2 = CO2_baseline - CO2_improved`
- unit: kgCO2/year or kgCO2/m2.year, matching input indicator
- output: `co2Savings`
- inputs:
  - `CO2_baseline`: emissions before renovation
  - `CO2_improved`: emissions after renovation/package
- MC001 reference: MC001-2022, 6.3-6.5 audit comparison context; MC001 renovation example output indicators
- formulaStatus: `derived_indicator_from_mc001_audit_context`
- implementationAllowed: true
- implementation notes:
  - CO2 values come from module 13 factor-based calculations.
  - Do not invent emission factors for audit.
- validation notes:
  - Baseline and improved values must use the same factor dataset/version.

### Formula 4

- formulaId: `MC001_AUDIT_PERCENT_SAVINGS_DERIVED`
- labelRo: Economie procentuala
- formulaText: `SavingsPercent = (BaselineValue - ImprovedValue) / BaselineValue * 100`
- unit: "%"
- output: `savingsPercent`
- inputs:
  - `BaselineValue`: baseline indicator
  - `ImprovedValue`: improved indicator
- MC001 reference: MC001-2022, 6.5 audit comparison context; MC001 renovation example output indicators with percentage savings
- formulaStatus: `derived_indicator_from_mc001_audit_context`
- implementationAllowed: true
- implementation notes:
  - May be used for final energy, primary energy, CO2 or cost indicators only when baseline and improved indicators are comparable.
- validation notes:
  - `BaselineValue` must be greater than 0.
  - Units and boundaries must match.

### Formula 5

- formulaId: `MC001_6_1_GLOBAL_UPDATED_COST`
- labelRo: Cost global actualizat
- formulaText: exact relation (6.1) remains visually unclear in the local PDF text extraction and requires visual verification before implementation
- unit: currency, often EUR or RON, optionally normalized
- output: `globalUpdatedCost`
- inputs:
  - `CG`: global updated cost
  - `COINIT`: initial investment cost
  - `COa(i)(j)`: annual cost for component or renovation measure `j` in year `i`
  - `RATxx(j)`: price-change/evolution rate for component or renovation measure `j`
  - `COCO2(i)(j)`: CO2 emission cost for measure `j` in year `i`
  - `COfin(TLS)(j)`: final disposal/removal cost in the final life-cycle year `TLS` for component `j` or the building
  - `VALfin(TC)(j)`: residual/final value of component `j` at the end of calculation period `TC`
  - `Df(i)`: discount/reduction factor for year `i`
  - `TC`: calculation period
- MC001 reference: MC001-2022, 6.5.3, relation (6.1); Fig. 6.1; Tabel 6.1; Tabel 6.2
- formulaStatus: `needs_visual_verification`
- implementationAllowed: false
- implementation notes:
  - The economic method, symbols and variable meanings are identified from nearby text, Tabel 6.1 and Tabel 6.2.
  - The exact mathematical layout of relation (6.1) is not readable enough in the local extraction pass, so implementation remains blocked.
  - Cost components and discount assumptions must be explicit.
- validation notes:
  - Currency, calculation period, discount rate and price escalation assumptions must be traced.
  - Do not implement from general financial knowledge; transcribe relation (6.1) visually first.

### Formula 6

- formulaId: `MC001_6_3_PAYBACK_CONSTANT_CASHFLOW`
- labelRo: Perioada de recuperare redusa pentru flux de numerar constant
- formulaText: exact relation (6.3) remains visually unclear in the local PDF text extraction and requires visual verification before implementation
- unit: years
- output: `paybackPeriod`
- inputs:
  - `PB`: payback period
  - `COINIT`: initial investment cost
  - `COINIT,ref`: initial investment cost for the reference case; MC001 text notes this is 0 for the no-intervention option
  - `CF`: constant difference in operating costs between option and reference
  - `RAT`: rate/discount/evolution rate used by the exact relation
- MC001 reference: MC001-2022, 6.5 economic analysis, relation (6.3)
- formulaStatus: `needs_visual_verification`
- implementationAllowed: false
- implementation notes:
  - MC001 text states this simplified case is for constant cash flow without significant replacement costs.
  - Nearby text confirms `CF` is the constant difference in operating costs between the option and the reference case for all years.
  - Exact formula text must be transcribed visually before implementation.
- validation notes:
  - Do not calculate payback without explicit investment cost and annual cost difference.
  - Do not infer the logarithmic/discounted form from financial theory unless relation (6.3) is visually confirmed.

### Formula 7

- formulaId: `MC001_6_4_PAYBACK_DISCOUNTED_CASHFLOW`
- labelRo: Perioada de recuperare cu pas anual si actualizarea valorii banilor
- formulaText: exact relation (6.4) remains visually unclear in the local PDF text extraction and requires visual verification before implementation
- unit: years
- output: `paybackPeriod`
- inputs:
  - `PB`: payback period
  - `TC`: calculation period
  - annual cash-flow/cost differences between option and reference
  - replacement costs, where applicable
  - `RAT`: rate/discount/evolution rate used by the exact relation
  - `COINIT`: initial investment cost
  - `COINIT,ref`: initial investment cost for the reference case
- MC001 reference: MC001-2022, 6.5 economic analysis, relation (6.4); Fig. 6.2-Fig. 6.4
- formulaStatus: `needs_visual_verification`
- implementationAllowed: false
- implementation notes:
  - MC001 describes a yearly cash-flow comparison between option and reference case and states that relation (6.4) identifies the year where the expression becomes positive.
  - Exact mathematical expression and sign convention must be verified visually before implementation.
- validation notes:
  - Calculation period must be explicit.
  - Investment, replacement, energy and maintenance costs must be sourced.
  - Do not implement relation (6.4) until the exact summation/minimum condition is transcribed.

### Rule 3

- ruleId: `MC001_6_BEFORE_AFTER_COMPARISON_RULE`
- labelRo: Comparatie inainte/dupa masuri
- ruleText: Pentru fiecare solutie sau pachet de renovare se determina noile performante energetice si se compara cu performantele initiale ale cladirii nerenovate.
- unit: not applicable
- output/impact: Requires a baseline calculation and a recalculated improved case.
- MC001 reference: MC001-2022, 6.3-6.5 and renovation analysis example section
- ruleStatus: `extracted_text_rule`
- implementationAllowed: true
- implementation notes:
  - Savings must be produced from explicit before/after indicators.
- validation notes:
  - Baseline and improved model boundaries must match.

### Rule 4

- ruleId: `MC001_6_RENOVATION_PACKAGE_AGGREGATION_RULE`
- labelRo: Agregarea costurilor intr-un pachet de renovare
- ruleText: Pentru un pachet de renovare, costul investitiei se determina din costurile solutiilor individuale incluse in acel pachet.
- unit: currency
- output/impact: Defines package investment cost composition.
- MC001 reference: MC001-2022 renovation analysis example, section on investment cost for solution packages
- ruleStatus: `extracted_text_rule`
- implementationAllowed: true
- implementation notes:
  - Package cost must be the traceable sum of measure costs, adjusted only by explicit assumptions.
- validation notes:
  - Do not invent cost values or package composition.

### Rule 5

- ruleId: `MC001_6_REPORT_DOSSIER_RULE`
- labelRo: Fisa de analiza si raportul de audit
- ruleText: Datele culese si analiza energetica trebuie sa sustina raportul/dosarul de audit, inclusiv informatiile necesare estimarii consumului anual normal de energie pentru incalzire, ventilare/climatizare, iluminat si apa calda de consum.
- unit: not applicable
- output/impact: Defines traceability requirement for audit report inputs.
- MC001 reference: MC001-2022, 6.2-6.3
- ruleStatus: `extracted_text_rule`
- implementationAllowed: true
- implementation notes:
  - Future audit reports must show calculation inputs, assumptions and missing data warnings.
- validation notes:
  - Missing input categories must block or lower-confidence the relevant audit output.

### Rule 6

- ruleId: `MC001_6_PAYBACK_PERIOD_LIMIT_CONTEXT`
- labelRo: Contextul perioadei de recuperare
- ruleText: Perioada de recuperare trebuie evaluata in cadrul perioadei de calcul economic, mentionata in MC001 as 20 ani pentru cladiri comerciale, 50 ani pentru cladiri rezidentiale si 30 ani pentru alte categorii, in contextul discutiei despre payback.
- unit: years
- output/impact: Defines calculation-period context for payback comparison.
- MC001 reference: MC001-2022, 6.5 economic analysis discussion after relation (6.4)
- ruleStatus: `extracted_text_rule`
- implementationAllowed: true
- implementation notes:
  - These periods must be treated as MC001 economic-analysis context, not arbitrary UI defaults.
  - If a project uses another calculation period, it must be explicit and traced.
- validation notes:
  - Payback should not be reported without the calculation period and assumptions.

## Required audit data/tables

| dataKey | neededFor | MC001 source | unit | lookup keys | extractionStatus | implementationAllowed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| baselineFinalEnergy | final energy savings | MC001-2022, 6.3-6.5; cross-reference module 13 | kWh/year or kWh/m2.year | building state, service/carrier boundary | external_module_needed | true when module 13 result exists | Must come from calculated baseline indicators. |
| improvedFinalEnergy | final energy savings | MC001-2022, 6.3-6.5; cross-reference module 13 | kWh/year or kWh/m2.year | measure/package, service/carrier boundary | external_module_needed | true when improved result exists | Must be recalculated after applying the measure/package. |
| baselinePrimaryEnergy | primary energy savings | MC001-2022, 6.3-6.5; cross-reference module 13 | kWh/year or kWh/m2.year | building state, factor dataset | external_module_needed | true when module 13 result exists | Factor dataset/version must match improved case. |
| improvedPrimaryEnergy | primary energy savings | MC001-2022, 6.3-6.5; cross-reference module 13 | kWh/year or kWh/m2.year | measure/package, factor dataset | external_module_needed | true when improved result exists | Do not calculate from useful energy directly. |
| baselineCO2 | CO2 savings | MC001-2022, 6.3-6.5; cross-reference module 13 | kgCO2/year or kgCO2/m2.year | building state, carrier/factor dataset | external_module_needed | true when module 13 result exists | Emission factors must be explicit. |
| improvedCO2 | CO2 savings | MC001-2022, 6.3-6.5; cross-reference module 13 | kgCO2/year or kgCO2/m2.year | measure/package, carrier/factor dataset | external_module_needed | true when improved result exists | Same factor dataset as baseline unless explicitly traced otherwise. |
| measureInvestmentCost | payback and global cost | MC001-2022, 6.5; renovation example cost tables | currency | measure/package id | needs_source_table | false | Example costs are not normative defaults. Real costs must be explicit or sourced. |
| energyPrice | annual energy cost/payback | MC001-2022, 6.5; renovation example financial data | currency/kWh or tariff unit | carrier, date, tariff type | needs_source_table | false | Example energy prices are example assumptions, not general defaults. |
| discountRate | global updated cost/payback | MC001-2022, 6.5, Tabel 6.1, economic analysis discussion | %/year | scenario, analysis date | needs_source_table | false | Must be explicit; do not invent. |
| calculationPeriod | global updated cost/payback | MC001-2022, 6.5 payback discussion | years | building category | extracted | true | Context mentions 20 commercial, 50 residential, 30 other categories for economic calculation comparison. |
| measureLifetime | replacement costs/global cost | MC001-2022, 6.5; renovation example financial data | years | measure/system component | needs_source_table | false | Must be explicit or sourced from a reviewed dataset. |
| maintenanceCost | annual costs/global cost | MC001-2022, 6.5, Tabel 6.1 | currency/year | measure/system | needs_source_table | false | Required for robust economic analysis. |
| renovationPackage | package analysis | MC001-2022, 6.4-6.5; renovation example packages | list of measure ids | package id | extracted_text_rule | true | Package composition must be explicit. |
| recommendationPriority | audit report ordering | MC001-2022 audit/recommendation context | not specified | measure/package | needs_source_table | false | No clear numeric priority formula extracted in this pass. |
| NZEBRenovationTarget | deep renovation/NZEB target checks | MC001 cross-references to NZEB/envelope/certificate context | varies | building type, requirement table | external_module_needed | false | Cross-reference modules 04, 14 and 15. |
| auditEconomicSymbols | global cost and payback formulas | MC001-2022, Tabel 6.1 | mixed: currency, %, years, dimensionless | symbol | indexed_table | true for symbol lookup only | Includes symbols such as `CG`, `CO`, `LS`, `PB`, `P`, `t`, `TC`, `Df`, `RAT`, `VAL`; formula implementation still needs exact relation transcription. |
| auditEconomicIndices | cost/energy symbol qualification | MC001-2022, Tabel 6.2 | not applicable | index level, symbol suffix | indexed_table | true for index lookup only | Includes indices for annual/monthly, initial, final/residual, investment, maintenance, operation, energy, lighting, ventilation, heating, cooling, DHW, replacement, disposal and related categories. |

## Economic formulas still requiring visual verification

| formulaId | MC001 relation | status | reason |
| --- | --- | --- | --- |
| `MC001_6_1_GLOBAL_UPDATED_COST` | relation (6.1) | `needs_visual_verification` | Symbols and variable meanings are readable, but the exact mathematical summation/layout is not clear enough from local PDF text extraction. |
| `MC001_6_3_PAYBACK_CONSTANT_CASHFLOW` | relation (6.3) | `needs_visual_verification` | The constant cash-flow context and `CF` meaning are readable, but the exact formula text is not clear enough. |
| `MC001_6_4_PAYBACK_DISCOUNTED_CASHFLOW` | relation (6.4) | `needs_visual_verification` | The yearly discounted cash-flow context is readable, but the exact expression and sign/minimum condition require visual transcription. |

## Cross-references

- Baseline/final/primary/CO2 indicators cross-reference `13_final_primary_co2_rer`.
- Certificate/classes cross-reference `15_energy_classes_and_certificate`.
- Reference building cross-reference `14_reference_building`.
- Envelope thresholds cross-reference `04_minimum_envelope_requirements`.
- Renewables cross-reference `12_renewables`.
- System measures cross-reference `09_dhw_systems`, `10_lighting`, and `11_cooling_ventilation_systems`.
- Climate data cross-reference `17_climate_annex` if savings require monthly recalculation.

## Missing-input behavior

Future calculators or audit modules must return:

- `cannot_calculate_audit_savings_missing_before_after_indicators` if baseline or improved final/primary/CO2 indicators are missing.
- `cannot_calculate_payback_missing_cost_data` if investment, maintenance, replacement or other relevant cost data is missing.
- `cannot_calculate_payback_missing_energy_price` if energy price/tariff assumptions are missing.

Forbidden behavior:

- No invented investment costs.
- No invented energy prices.
- No invented discount rates.
- No invented measure lifetimes.
- No generic AI recommendation may override missing calculation data.
- No recommendation should be presented as audit-backed unless before/after indicators and assumptions exist.

## Implementation implications for LaCurent

- Audit recommendations must be based on before/after recalculation, not arbitrary text suggestions.
- Savings must be traceable to calculated indicators.
- Economic indicators require explicit cost and price assumptions.
- LaCurent must not invent payback or cost-effectiveness values.
- This module is for audit/recommendation logic, not certificate class assignment.
- No AI-generated recommendation should override missing calculation data.
- Example values from MC001 breviars are useful for understanding the method, but they must not become defaults for real houses.
- If a package changes multiple systems, the improved building must be recalculated as a package, not as isolated savings added without trace.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `18_examples_and_breviars` or `19_extraction_registry`.
