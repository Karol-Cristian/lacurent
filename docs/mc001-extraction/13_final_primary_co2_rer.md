# 13 Final, Primary Energy, CO2 and Renewable Ratio

Source document:

- `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`

MC001 sections used:

- MC001-2022, 5.4.2.2 - Aria de referinta a pardoselii si volumul de aer al cladirii
- MC001-2022, 5.4.2.3 - Normalizare la marimea de referinta a cladirii
- MC001-2022, 5.4.2.5 - Bilant energetic global ponderat
- MC001-2022, 5.4.2.6 - Factori de conversie pentru calculul energiei primare
- MC001-2022, 5.4.2.7 - Factorii de conversie in emisii de gaze cu efect de sera (CO2 echivalent)
- MC001-2022, 5.4.2.8 - Factori de ponderare pentru energia furnizata in exterior (exportata)
- MC001-2022, 5.4.2.9 - Contributia energiei din surse regenerabile
- MC001-2022, Tabel 5.17 - Factori de conversie din energie finala in energie primara
- MC001-2022, Tabel 5.18 - Factori de conversie a energiei primare in emisii echivalente de CO2
- MC001-2022, Tabel 5.19 - Pierderi anuale de agent frigorific
- MC001-2022, Tabel 5.20 - Factori CO2 asociati agentilor frigorifici

Extraction status: `partial_factor_tables_indexed`

Implementation relevance:

- This module defines the handoff from final energy by service/carrier to primary energy, CO2, and RER indicators.
- Core MC001 formulas for global weighted energy, final-energy service aggregation, primary energy, CO2, and RER are extracted.
- Tabel 5.17 and Tabel 5.18 now have reviewed numeric values represented in `src/physics-engine/datasets/mc001PrimaryEnergyAndCO2Factors.mjs`; calculators must still load them from the reviewed registry/dataset, not inline constants.
- Specific per-area indicators are marked as derived indicators because MC001 defines the reference floor area used for normalization in 5.4.2.2-5.4.2.3.

LaCurent disclaimer:

- This extraction supports a MC001-like Physics Engine.
- It is not sufficient for issuing an official energy performance certificate.
- This module does not calculate energy classes.

## Concepts to extract

Useful energy:

- Energy needed by the zone or user service before technical-system conversion, distribution, storage, generation, and auxiliary losses.
- In LaCurent, useful heating/cooling comes from module 07 and useful DHW comes from module 09.

Final/delivered energy:

- Energy consumed by a technical system from an energy carrier after system losses and efficiencies are accounted for.
- It must be separated by service and carrier before conversion to primary energy or CO2.

Primary energy:

- Weighted energy obtained by applying conversion factors to final energy and exported energy.
- MC001 uses total, non-renewable, and renewable primary-energy factor types.

Non-renewable primary energy:

- Primary energy calculated with the non-renewable factor `fPnren`.
- It must remain separate from total and renewable primary energy.

Renewable primary energy:

- Primary energy calculated with the renewable factor `fPren`.
- It is used for renewable contribution/RER and CPE reporting.

CO2 emissions:

- Equivalent CO2 calculated using MC001 CO2 conversion factors and, where applicable, refrigerant leakage factors.
- CO2 is not an energy class by itself in this module.

Energy carrier:

- Fuel, electricity, district heating, solar thermal, biomass, exported electricity, or other vector used to map final energy to conversion/emission factors.

Conversion factor:

- Factor applied to final or exported energy to obtain primary-energy or CO2-equivalent values.
- MC001 identifies `fPtot`, `fPnren`, `fPren`, and CO2 factors by carrier/source.

Renewable contribution / RER:

- Ratio between renewable primary energy considered for RER and total primary energy.
- MC001 notes that RER depends on the selected perimeter; Romanian procedure leads to `RERdist`.

Demand vs delivered vs primary vs CO2:

- Demand is useful energy before systems.
- Delivered/final energy is consumed by carrier after system modelling.
- Primary energy is final/exported energy multiplied by primary factors.
- CO2 is calculated with emission factors and must not be derived from class thresholds.

## Formula registry entries

### Formula 1 - Global weighted energy balance

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_1_GLOBAL_WEIGHTED_ENERGY_BALANCE` |
| labelRo | Bilant energetic global ponderat |
| formulaText | `Ewe = Ewe,del,an - Ewe,exp,an` |
| unit | `kWh/an` |
| output | `Ewe` |
| inputs | `EweDelAn`: annual weighted/primary energy received from outside [kWh/an]; `EweExpAn`: annual weighted/primary energy delivered/exported outside [kWh/an] |
| MC001 reference | MC001-2022, 5.4.2.5, relatia (5.1) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Represents the global weighted balance at the assessment boundary. Do not mix unweighted final energy and weighted primary energy in this formula. |
| validation notes | Inputs must be numeric. Exported term must be traced separately. |

### Formula 2 - Annual delivered weighted energy decomposition

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_2_DELIVERED_WEIGHTED_ENERGY_SUM` |
| labelRo | Energia primara anuala primita din exterior |
| formulaText | `Ewe,del,an = Ewe,del,nexp,an + Ewe,del,el,an` |
| unit | `kWh/an` |
| output | `EweDelAn` |
| inputs | `EweDelNexpAn`: annual weighted/primary delivered energy for non-exported carriers [kWh/an]; `EweDelElAn`: annual weighted/primary delivered electricity [kWh/an] |
| MC001 reference | MC001-2022, 5.4.2.5, relatia (5.2) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Separates delivered weighted energy into non-export carriers and electricity. |
| validation notes | Inputs must be numeric. Missing carrier/export applicability must be explicit. |

### Formula 3 - Final energy by carrier and service

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_3_FINAL_ENERGY_BY_CARRIER_SERVICE_SUM` |
| labelRo | Energie finala consumata pentru un vector energetic |
| formulaText | `Qf,i = Qf,h,i + Qf,v,i + Qf,c,i + Qf,w,i + Qf,l,i` |
| unit | `kWh/an` |
| output | `Qfi` |
| inputs | `Qfhi`: final energy for heating by carrier i [kWh/an]; `Qfvi`: final energy for ventilation by carrier i [kWh/an]; `Qfci`: final energy for cooling by carrier i [kWh/an]; `Qfwi`: final energy for DHW by carrier i [kWh/an]; `Qfli`: final energy for lighting by carrier i [kWh/an] |
| MC001 reference | MC001-2022, 5.4.2.6, relatia (5.3) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Aggregates final energy by service for one energy carrier. Services that are not applicable must be traced as not applicable, not silently invented. |
| validation notes | Service values must be >= 0 where applicable. Carrier identity must be explicit. |

### Formula 4 - Total final energy annual sum

| Field | Value |
| --- | --- |
| formulaId | `MC001_TOTAL_FINAL_ENERGY_ANNUAL_SUM` |
| labelRo | Consum anual total de energie finala |
| formulaText | `Qf,total = sum_i(Qf,i)` |
| unit | `kWh/an` |
| output | `QfTotal` |
| inputs | `Qfi`: final energy by carrier i [kWh/an] |
| MC001 reference | MC001-2022, 5.4.2.6, derived from relation (5.3); exact standalone relation not found in this pass |
| formulaStatus | `derived_aggregation_from_mc001_context` |
| implementationAllowed | `true` |
| implementation notes | Relation (5.3) defines final energy by carrier as a service sum. Total final energy is a derived aggregation across explicit carriers and requires complete service/carrier breakdown. Do not invent missing services or carriers. |
| validation notes | Carrier sums must not double-count the same final energy stream. Every included `Qf,i` must be traced by carrier and service. |

### Formula 5 - Total primary energy from final/exported energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_4A_PRIMARY_ENERGY_TOTAL` |
| labelRo | Energie primara totala din energie finala si energie exportata |
| formulaText | `Ep = sum_i(Qf,x,i x fPtot,i) - sum_i(Qex,i x fPtot,ex,i)` |
| unit | `kWh/an` |
| output | `Ep` |
| inputs | `Qfxi`: final energy of type/carrier i [kWh/an]; `fPtoti`: total primary conversion factor for carrier i [-]; `Qexi`: exported final energy of type/carrier i [kWh/an]; `fPtotExi`: total primary conversion factor for exported carrier i [-] |
| MC001 reference | MC001-2022, 5.4.2.6, relatia (5.4a) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | Uses total primary factor `fPtot`. Factor values must come from Tabel 5.17 or a reviewed registry, not inline constants. |
| validation notes | Energy values must be >= 0. Exported energy and factor selection must be traced. |

### Formula 6 - Non-renewable primary energy from final/exported energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_4A_PRIMARY_ENERGY_NON_RENEWABLE` |
| labelRo | Energie primara neregenerabila din energie finala si energie exportata |
| formulaText | `EPnren = sum_i(Qf,x,i x fPnren,i) - sum_i(Qex,i x fPnren,ex,i)` |
| unit | `kWh/an` |
| output | `EPnren` |
| inputs | `Qfxi`: final energy of type/carrier i [kWh/an]; `fPnreni`: non-renewable primary conversion factor for carrier i [-]; `Qexi`: exported final energy of type/carrier i [kWh/an]; `fPnrenExi`: non-renewable primary conversion factor for exported carrier i [-] |
| MC001 reference | MC001-2022, 5.4.2.6, relation (5.4a) using the `fPnren` factor family from Tabel 5.17 |
| formulaStatus | `extracted_factor_variant` |
| implementationAllowed | `true` |
| implementation notes | Same structure as relation (5.4a), using non-renewable factors. Factor values must be sourced. |
| validation notes | Energy values must be >= 0. Factor family must be explicit in trace. |

### Formula 7 - Renewable primary energy from final/exported energy

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_4A_PRIMARY_ENERGY_RENEWABLE` |
| labelRo | Energie primara regenerabila din energie finala si energie exportata |
| formulaText | `EPren = sum_i(Qf,x,i x fPren,i) - sum_i(Qex,i x fPren,ex,i)` |
| unit | `kWh/an` |
| output | `EPren` |
| inputs | `Qfxi`: final energy of type/carrier i [kWh/an]; `fPreni`: renewable primary conversion factor for carrier i [-]; `Qexi`: exported final energy of type/carrier i [kWh/an]; `fPrenExi`: renewable primary conversion factor for exported carrier i [-] |
| MC001 reference | MC001-2022, 5.4.2.6, relation (5.4a) using the `fPren` factor family from Tabel 5.17 |
| formulaStatus | `extracted_factor_variant` |
| implementationAllowed | `true` |
| implementation notes | Same structure as relation (5.4a), using renewable factors. Factor values must be sourced. |
| validation notes | Energy values must be >= 0. Factor family must be explicit in trace. |

### Formula 8 - CO2 equivalent emissions

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_4B_CO2_EMISSIONS` |
| labelRo | Emisii echivalente totale de CO2 |
| formulaText | `ECO2 = sum_i(Ep,i x fCO2,i) + sum_j(CRj x RPj x fref,CO2,j) - sum_i(Eex,i x fCO2,ex,i)` |
| unit | `kgCO2/an` |
| output | `ECO2` |
| inputs | `Epi`: primary energy using energy type i [kWh/an]; `fCO2i`: CO2 conversion factor for energy type i [kgCO2/kWh]; `CRj`: refrigerant charge for cooling equipment type j [kg]; `RPj`: annual refrigerant loss rate [%]; `fRefCO2j`: CO2 conversion factor for refrigerant j [kgCO2/kg refrigerant lost]; `Eexi`: exported primary energy related to final energy produced/exported [kWh/an]; `fCO2Exi`: CO2 conversion factor for exported energy type i [kgCO2/kWh] |
| MC001 reference | MC001-2022, 5.4.2.7, relatia (5.4b), Tabel 5.18, Tabel 5.19, Tabel 5.20 |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | CO2 calculation uses primary-energy terms and refrigerant leakage terms as shown in relation (5.4b). Emission factors must come from indexed/extracted tables. |
| validation notes | Energy, charge, and loss-rate inputs must be >= 0. Refrigerant leakage terms apply only where relevant. |

### Formula 9 - Specific primary energy per reference area

| Field | Value |
| --- | --- |
| formulaId | `MC001_SPECIFIC_PRIMARY_ENERGY_PER_AREA` |
| labelRo | Consum anual specific de energie primara |
| formulaText | `EPspecific = EP / Ause` |
| unit | `kWh/m2.an` |
| output | `EPspecific` |
| inputs | `EP`: annual primary energy [kWh/an]; `Ause`: reference floor area [m2] |
| MC001 reference | MC001-2022, 5.4.2.2 and 5.4.2.3; derived normalization indicator from defined reference floor area |
| formulaStatus | `derived_indicator_from_mc001_context` |
| implementationAllowed | `true` |
| implementation notes | MC001 defines reference floor area as the normalization size for energy performance. Use only when `Ause` is available and traced. |
| validation notes | `Ause > 0`; numerator must identify total/non-renewable/renewable primary energy explicitly. |

### Formula 10 - Specific CO2 emissions per reference area

| Field | Value |
| --- | --- |
| formulaId | `MC001_SPECIFIC_CO2_PER_AREA` |
| labelRo | Indicator specific de emisii echivalente CO2 |
| formulaText | `ECO2specific = ECO2 / Ause` |
| unit | `kgCO2/m2.an` |
| output | `ECO2specific` |
| inputs | `ECO2`: annual equivalent CO2 emissions [kgCO2/an]; `Ause`: reference floor area [m2] |
| MC001 reference | MC001-2022, 5.4.2.2 and 5.4.2.3; derived normalization indicator from defined reference floor area |
| formulaStatus | `derived_indicator_from_mc001_context` |
| implementationAllowed | `true` |
| implementation notes | MC001 defines reference floor area as the normalization size for energy performance. Use only when `Ause` is available and traced. |
| validation notes | `Ause > 0`; emissions must not be confused with primary-energy class thresholds. |

### Formula 11 - Renewable energy ratio / contribution

| Field | Value |
| --- | --- |
| formulaId | `MC001_5_16_RENEWABLE_ENERGY_RATIO` |
| labelRo | Contributia energiei din surse regenerabile |
| formulaText | `RER = EPren,RER / EPtot` |
| unit | `-` |
| output | `RER` |
| inputs | `EPrenRER`: renewable primary energy considered for RER [kWh/an]; `EPtot`: total primary energy [kWh/an] |
| MC001 reference | MC001-2022, 5.4.2.9, relatia (5.16) |
| formulaStatus | `extracted` |
| implementationAllowed | `true` |
| implementation notes | RER depends on selected perimeter. MC001 notes the Romanian procedure leads to `RERdist`. Exported renewable energy must not be counted contrary to the RER definition. |
| validation notes | `EPtot > 0`; selected perimeter and `EPrenRER` construction must be traced. |

## Required factor tables

| dataKey | neededFor | MC001 source | exact table title | unit | lookup keys | factor columns | extractionStatus | implementationAllowed | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `finalEnergyCarrier` | Formula (5.3), primary/CO2 factor lookup | MC001-2022, 5.4.2.6, Tabel 5.17 | Factori de conversie din energie finala in energie primara | carrier/source category | `Combustibil/Sursa de energie`; import/export applicability where relevant | `fPnren`, `fPren`, `fPtot` | `extracted_numeric_values` | `true` | Lookup keys, columns, and numeric values are represented in reviewed dataset registry `src/physics-engine/datasets/mc001PrimaryEnergyAndCO2Factors.mjs`. |
| `primaryEnergyFactorTotal` | Formula (5.4a), total primary energy | MC001-2022, Tabel 5.17 | Factori de conversie din energie finala in energie primara | dimensionless conversion factor, equivalent to `kWh primary/kWh final` | `Combustibil/Sursa de energie`; delivered/exported case | `fPtot` | `extracted_numeric_values` | `true` | Do not hardcode values inline in calculators; load from reviewed registry/dataset. |
| `primaryEnergyFactorNonRenewable` | Non-renewable primary energy variant of (5.4a) | MC001-2022, Tabel 5.17 | Factori de conversie din energie finala in energie primara | dimensionless conversion factor, equivalent to `kWh primary/kWh final` | `Combustibil/Sursa de energie`; delivered/exported case | `fPnren` | `extracted_numeric_values` | `true` | Factor family, lookup columns, and numeric values are available in the reviewed dataset registry. |
| `primaryEnergyFactorRenewable` | Renewable primary energy variant of (5.4a), RER | MC001-2022, Tabel 5.17 | Factori de conversie din energie finala in energie primara | dimensionless conversion factor, equivalent to `kWh primary/kWh final` | `Combustibil/Sursa de energie`; delivered/exported case | `fPren` | `extracted_numeric_values` | `true` | Factor family, lookup columns, and numeric values are available in the reviewed dataset registry. |
| `co2EmissionFactor` | Formula (5.4b), energy-related CO2 | MC001-2022, 5.4.2.7, Tabel 5.18 | Factori de conversie a energiei primare in emisii echivalente de CO2 | `kgCO2/kWh` | `Combustibil/Sursa de energie` | `fCO2 [kg CO2/kWh]` | `extracted_numeric_values` | `true` | Lookup keys, factor column, and numeric values are represented in reviewed dataset registry `src/physics-engine/datasets/mc001PrimaryEnergyAndCO2Factors.mjs`. |
| `refrigerantLeakageRate` | Formula (5.4b), refrigerant leakage CO2 | MC001-2022, 5.4.2.7, Tabel 5.19 | Pierderi anuale de agent frigorific | `%/an` | `Tipul echipamentului`; `Capacitatea de incarcare cu refrigerent [kg]` | `Rata anuala medie de pierderi de refrigerent [%]` | `indexed_table` | `true` | Required only where cooling/refrigerant equipment exists. Values must be loaded into a future registry/dataset. |
| `refrigerantCo2Factor` | Formula (5.4b), refrigerant leakage CO2 | MC001-2022, 5.4.2.7, Tabel 5.20 | Factorul de conversie in emisii echivalente CO2, asociat agentilor frigorifici | `kgCO2/kg refrigerant pierdut` | `Tipul refrigerentului` | `fCO2,r [kg CO2/kg refrigerant pierdut]` | `indexed_table` | `true` | Required only where refrigerant leakage is included. Values must be loaded into a future registry/dataset. |
| `renewableShareFactor` | RER and renewable primary split | MC001-2022, 5.4.2.9, relation (5.16), Tabel 5.17 | Factori de conversie din energie finala in energie primara | `-` | selected perimeter; carrier/source; renewable factor family | `fPren`; `fPtot` | `extracted_numeric_values` | `true` | Formula, factor columns, and numeric values are clear. Construction of `EPren,RER` must preserve perimeter policy. |
| `areaReferenceForSpecificIndicators` | Specific primary/CO2 indicators | MC001-2022, 5.4.2.2 and 5.4.2.3 | not a factor table | `m2` | reference floor area / `Ause` | not applicable | `extracted_definition` | `true` | Denominator area is clearly defined for normalization; value must be explicit/traced in input model. |
| `serviceEnergyBreakdown` | Formula (5.3) | MC001-2022, 5.4.2.6, relation (5.3) | not a factor table | `kWh/an` | service: heating, ventilation, cooling, DHW, lighting; carrier i | not applicable | `extracted` | `true` | Service final energy must come from service/system modules before this module runs. |

## Cross-references

- Heating/cooling useful demand comes from `07_monthly_heating_cooling_demand`.
- DHW useful/final energy path comes from `09_dhw_systems` and later system modules.
- Renewables come from `12_renewables`.
- Reference building and certificate/classes come from `14_reference_building` and `15_energy_classes_and_certificate`.
- This module does not calculate classes.

## Missing-input behavior

If energy carrier or factor table source is missing, future calculators must return:

`status: cannot_calculate_primary_or_co2_missing_energy_factor`

If the factor table exists but the needed factor value is not present in the registry/dataset, future calculators must return:

`status: cannot_calculate_primary_or_co2_missing_energy_factor`

If final energy by service/carrier is missing, future calculators must return:

`status: cannot_calculate_primary_or_co2_missing_final_energy`

If reference area is missing for specific indicators, future calculators must return:

`status: cannot_calculate_specific_indicator_missing_reference_area`

No invented factor values are allowed. Do not hardcode table values inline in calculators.

## Implementation implications for LaCurent

- Final energy and primary energy are different.
- Useful heating/cooling demand cannot be directly treated as final energy without system efficiency/losses.
- CO2 requires explicit emission factors by energy carrier and, where applicable, refrigerant leakage factors.
- Primary energy requires explicit conversion factors by energy carrier.
- No default factors should be hardcoded inline in calculators; MC001 factor table values must be loaded from a reviewed registry/dataset.
- Exported energy must remain separate from delivered energy.
- Renewable primary energy and total primary energy must be traced separately before RER is calculated.
- This module feeds energy class / CPE later, but does not itself assign class.

## Do not implement yet

- No calculators created.
- No production flow changed.
- No UI changed.
- No tests added.
- Next extraction module is `14_reference_building` or `15_energy_classes_and_certificate`.
