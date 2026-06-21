# INVESTIGATION 009 - Level 1 Explicit Input Pack

## Status

- Investigation id: `INVESTIGATION_009_LEVEL_1_EXPLICIT_INPUT_PACK`
- Scope: input-pack design only.
- Code changes justified: no.
- Level 1 orchestrator implementation justified in this task: no.
- Recommended Fixture 16 scope: narrow Level 1 explicit-input pack first; subsequently implemented as `FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR`.
- Production integration justified: no.

This investigation does not create a Level 1 orchestrator, product feature, certificate workflow, CPE generation, report generation, UI, worker, DB/schema/API path, production integration, deploy, push, full DHW final-energy implementation, lighting calculation, cooling-system calculation, reference-building workflow, or full MC001 auditor.

Follow-up: `FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR` implements the narrow core scope recommended here. The investigation remains the reviewed input-pack specification and boundary document.

## Files Inspected

| File or group | Reason inspected |
| --- | --- |
| `docs/mc001-validation/INVESTIGATION_008_MINIMAL_MC001_ORCHESTRATOR_BOUNDARY.md` | Level 0/Level 1 boundary and prior helper-call limits. |
| `docs/mc001-validation/FIXTURE_015_MINIMAL_MC001_ORCHESTRATOR_SUMMARY.md` | Current Level 0 summary contract and Level 1 readiness blocker. |
| `src/physics-engine/minimalMc001OrchestratorSummary.mjs` | Current summary output, safe/unsafe Level 1 candidate lists, and blockers. |
| `src/physics-engine/materialsUValues.mjs` | Envelope material helper input names and units. |
| `src/physics-engine/transmissionCoefficients.mjs` | Transmission helper input names, bridge rules, and Htr component behavior. |
| `src/physics-engine/monthlyTransmissionTransfer.mjs` | Explicit monthly transmission-transfer input names and climate source warning. |
| `src/physics-engine/ventilationCoefficients.mjs` | Ventilation helper input names, units, ACH/bve/Hve boundaries, and monthly Qve inputs. |
| `src/physics-engine/monthlyBalance.mjs` | Monthly QH;ht, QH;gn, QH;nd, and annual-sum helper boundaries. |
| `src/physics-engine/finalPrimaryCo2Indicators.mjs` | Final/primary/CO2 service row input names, factor lookup behavior, and area-specific indicators. |
| `src/physics-engine/dhwUsefulDemand.mjs` | DHW useful-demand helper input names and units. |
| `src/physics-engine/dhwDistributionLosses.mjs` | DHW distribution component-only input names and units. |
| `src/physics-engine/energyClassAssignment.mjs` | Explicit class assignment input names and missing-input behavior. |
| `src/physics-engine/utilityInclusionThresholds.mjs` | Tabel 5.6 inclusion and Nota 4 threshold-adjustment input names. |
| `src/physics-engine/tests/validation/fixture006HeatingNeedTableSummary.mjs` | Apr/Sep/Oct blocked-month representation and monthly heating rows. |
| `src/physics-engine/tests/validation/fixture007FinalPrimaryCo2Summary.mjs` | Final/primary/CO2 explicit service rows and blocked display conflicts. |
| `src/physics-engine/tests/validation/fixture008ServiceFinalPrimaryRows.mjs` | Service-row final-primary inputs without CO2 display assertions. |
| `src/physics-engine/tests/validation/fixture015MinimalMc001OrchestratorSummary.mjs` | Required summary blockers and unsafe Level 1 candidates. |
| `docs/mc001-validation/VALIDATION_MATRIX.md` | Current helper coverage by validation area. |
| `docs/mc001-validation/GAP_ANALYSIS.md` | Current formula gaps and recommended next task. |
| `docs/mc001-validation/CANDIDATE_INVENTORY.md` | Current fixture inventory and executable/blocked status. |
| `docs/mc001-extraction/19_extraction_registry.md` | Extraction registry, implementation readiness, and missing-input vocabulary. |

## Level 1 Definition

Level 1 is a pure Physics Engine component orchestrator. It may call already validated helpers only when every helper input is explicit, unit-tagged, and traceable to a source row or reviewed fixture field.

Level 1 must fail closed. Missing or ambiguous values must produce blocked rows, not defaults.

Level 1 must not:

- infer building category, geometry, climate, service rows, missing utilities, thresholds, or certificate context;
- implement a full MC001 auditor;
- calculate certificate/CPE output;
- connect to UI, API, DB/schema, workers, reports, deploy, or product flows;
- promote display-only reconciliations into general methodology validation.

## Required Top-Level Input Sections

The first Level 1 input pack should be one serializable object with these sections:

```js
{
  packMetadata: {},
  sourceTrace: {},
  buildingContext: {},
  envelopeTransmission: {},
  ventilation: {},
  monthlyHeating: {},
  finalPrimaryCo2: {},
  dhw: {},
  rerDisplay: {},
  energyClassAssignment: {},
  utilityInclusionThresholds: {},
  explicitBlockers: []
}
```

Every section must be present. A section can be disabled or blocked, but it must say so explicitly.

## Universal Traceability Contract

Every numeric value that can affect a helper call must carry trace metadata:

| Field | Unit | Mandatory | Rule |
| --- | --- | --- | --- |
| `sourceDocument` | text | yes | Example: `MC001-2022`. |
| `sourcePages` | page numbers | yes | Empty array is not enough for helper-call inputs. |
| `sourceTable` | text/null | yes | Use null only for values not from a table and explain in `sourceNote`. |
| `sourceRow` | text/null | yes | Row label, formula reference, or fixture field. |
| `sourceFixtureId` | text/null | yes | Required when value comes from a reviewed fixture rather than direct extraction. |
| `extractionStatus` | enum | yes | `reviewed`, `fixture_validated`, `display_only`, `blocked`, or `ambiguous`. |
| `sourceNote` | text | yes | Human-readable provenance. |
| `unit` | text | yes for numeric values | Must match the helper input unit. |

Fail closed if a helper-call numeric value has no source page, no fixture id, no row/formula reference, or no unit.

## Section 1 - Pack Metadata

Required fields:

| Field | Unit | Mandatory | Notes |
| --- | --- | --- | --- |
| `inputPackId` | text | yes | Suggested: `LEVEL_1_EXPLICIT_INPUT_PACK_001`. |
| `inputPackVersion` | text | yes | Semantic or date version. |
| `targetFixtureId` | text | yes | Suggested/implemented: `FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR`. |
| `calculationMode` | text | yes | Must be `explicit_inputs_only`. |
| `orchestratorLevel` | text | yes | Must be `LEVEL_1_COMPONENT_ORCHESTRATOR`. |
| `createdFromFixtures` | fixture ids | yes | Any consumed fixture source must be listed. |
| `blockedPolicy` | text | yes | Must be `fail_closed`. |

Never infer: target fixture id, calculation mode, or blocker policy.

## Section 2 - Building Context

Required fields:

| Field | Unit | Mandatory | Used by |
| --- | --- | --- | --- |
| `buildingCategoryKey` | text | mandatory only if class/utility sections enabled | `energyClassAssignment.mjs`, `utilityInclusionThresholds.mjs` |
| `buildingCategorySourceTable` | text | mandatory with `buildingCategoryKey` | Trace only. |
| `referenceAreaM2` | m2 | mandatory for specific indicators | `calculateSpecificIndicator`, `calculatePrimaryCO2Summary` |
| `areaBasis` | text | yes if any area-specific output is produced | Trace only. |
| `conditionedAreaM2` | m2 | optional | Trace only unless a future helper needs it. |
| `heatedVolumeM3` | m3 | mandatory only for ACH airflow | `calculateAirflowFromACH` |

Fail closed when:

- `referenceAreaM2` is missing and specific primary/CO2 indicators are requested;
- `buildingCategoryKey` is missing and class assignment or utility-inclusion lookup is enabled;
- `heatedVolumeM3` is missing and ACH airflow is requested.

Never infer: category from text labels, reference area from floor area, or heated volume from area times an assumed height.

## Section 3 - Envelope / Transmission

Allowed modes:

- `explicit_layers_and_bridges`
- `explicit_corrected_u_prime`
- `explicit_transmission_coefficients_only`
- `blocked`

### Material And U-Value Inputs

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `elementId` | text | yes | Trace/key only. |
| `layers[].layerId` | text | yes | Trace/key only. |
| `layers[].lambdaNormat` | W/mK | mandatory if calculating corrected lambda | `calculateLambdaCorrected` |
| `layers[].correctionCoefficientA` | - | optional only with warning | `calculateLambdaCorrected` |
| `layers[].thicknessM` | m | mandatory if calculating layer R | `calculateLayerResistance` |
| `layers[].lambdaWmK` | W/mK | mandatory if calculating layer R | `calculateLayerResistance` |
| `rsi` | m2K/W | mandatory if calculating total R | `calculateTotalResistance` |
| `layersR` | m2K/W array | mandatory if calculating total R | `calculateTotalResistance` |
| `airLayersR` | m2K/W array | optional, default empty only if explicitly source-not-applicable | `calculateTotalResistance` |
| `rse` | m2K/W | mandatory if calculating total R | `calculateTotalResistance` |
| `totalResistance` | m2K/W | mandatory if calculating U directly | `calculateUValue` |

### Direct Transmission Inputs

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `elements[].uValue` | W/m2K | mandatory for bridge path | `calculateDirectTransmissionWithBridges` |
| `elements[].uPrimeValue` | W/m2K | mandatory for corrected-U path | `calculateDirectTransmissionWithCorrectedU` |
| `elements[].areaM2` | m2 | yes | both direct transmission helpers |
| `linearBridges[].psi` | W/(mK) | mandatory if bridge row present | `calculateDirectTransmissionWithBridges` |
| `linearBridges[].lengthM` | m | mandatory if bridge row present | `calculateDirectTransmissionWithBridges` |
| `pointBridges[].chi` | W/K | mandatory if point bridge present | `calculateDirectTransmissionWithBridges` |
| `l2d` | W/K | optional, only with explicit source | `calculateLinearBridgePsi` |
| `lengthM` | m | mandatory with `l2d` | `calculateLinearBridgePsi` |
| `hd` | W/K | mandatory for Htr total | `calculateTotalTransmissionCoefficient` |
| `hg`, `hu`, `ha` | W/K | optional only with explicit applicability flags | `calculateTotalTransmissionCoefficient` |
| `applicability.hgApplicable`, `huApplicable`, `haApplicable` | boolean | yes for omitted components | `calculateTotalTransmissionCoefficient` |

Fail closed when:

- plain `uValue` bridge path and corrected `uPrimeValue` path are mixed for the same element group;
- bridge `psi <= 0` or `chi <= 0` has no source;
- `l2d` is requested without explicit source and length;
- `hg`, `hu`, or `ha` is missing while marked applicable;
- geometry, area, length, or surface resistance is absent.

Never infer: geometry, bridge lengths, bridge psi/chi, L2D, U', Rsi/Rse, ground coefficient, or applicability.

## Section 4 - Ventilation

Allowed modes:

- `explicit_hve_and_monthly_qve`
- `explicit_airflow_to_hve`
- `validated_rows_only`
- `blocked`

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `flows[].airflowM3h` | m3/h | either m3/h or m3/s | `calculateVentilationHeatTransferCoefficient` |
| `flows[].airflowM3s` | m3/s | either m3/h or m3/s | `calculateVentilationHeatTransferCoefficient` |
| `flows[].bve` | - | yes | `calculateVentilationHeatTransferCoefficient` |
| `flows[].fveDyn` | - | optional only with explicit default policy | `calculateVentilationHeatTransferCoefficient` |
| `rhoA` | kg/m3 | mandatory for full Hve helper | `calculateVentilationHeatTransferCoefficient` |
| `ca` | J/(kgK) | mandatory for full Hve helper | `calculateVentilationHeatTransferCoefficient` |
| `airflowM3h` | m3/h | mandatory for derived helper | `calculateVentilationHeatTransferCoefficientFromAirflowM3h` |
| `ach` | 1/h | mandatory only for ACH path | `calculateAirflowFromACH` |
| `volumeM3` | m3 | mandatory only for ACH path | `calculateAirflowFromACH` |
| `thetaInt` | degC | mandatory for bve/Qve | `calculateBve`, `calculateMonthlyVentilationTransfer` |
| `thetaSupply` | degC | mandatory for bve | `calculateBve` |
| `thetaExternal` | degC | mandatory for bve | `calculateBve` |
| `bztu` | - | mandatory for unconditioned-zone bve | `calculateBveFromUnconditionedZone` |
| `hve` | W/K | mandatory for monthly Qve | `calculateMonthlyVentilationTransfer` |
| `thetaExternalMonthly` | degC | mandatory for monthly Qve | `calculateMonthlyVentilationTransfer` |
| `deltaHours` | h | mandatory for monthly Qve | `calculateMonthlyVentilationTransfer` |

Fail closed when:

- ACH path lacks both `ach` and explicit heated volume;
- unconditioned-zone bve lacks `bztu` and source;
- a flow provides both `airflowM3h` and `airflowM3s`;
- monthly Qve has no monthly exterior temperature source;
- fan/AHU electric energy is requested.

Never infer: ACH, volume, bve, fveDyn, rhoA, ca, fan power, AHU energy, supply temperature, or climate values.

## Section 5 - Monthly Heating Summary

Allowed modes:

- `explicit_monthly_rows_with_blockers`
- `validated_rows_only`
- `blocked`

Level 1 may include monthly heating only if blocked months stay blocked and helper calls are limited to unambiguous rows.

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `rows[].monthKey` | text | yes | Trace/key only. |
| `rows[].status` | enum | yes | `validated`, `helper_callable`, `blocked_ambiguous`, `display_only`, `not_applicable`. |
| `rows[].qtrMonthly` | kWh | mandatory if calculating QH;ht from Qtr/Qve | `calculateMonthlyTotalHeatTransfer` |
| `rows[].qveMonthly` | kWh | mandatory if calculating QH;ht from Qtr/Qve | `calculateMonthlyTotalHeatTransfer` |
| `rows[].qintMonthly` | kWh | mandatory if calculating QH;gn | `calculateMonthlyTotalGains` |
| `rows[].qsolMonthly` | kWh | mandatory if calculating QH;gn | `calculateMonthlyTotalGains` |
| `rows[].gammaH` | - | mandatory if calculating QH;nd | `calculateMonthlyHeatingNeed` |
| `rows[].qHhtMonthly` | kWh | mandatory if calculating QH;nd | `calculateMonthlyHeatingNeed` |
| `rows[].etaHgnMonthly` | - | mandatory if calculating QH;nd | `calculateMonthlyHeatingNeed` |
| `rows[].qHgnMonthly` | kWh | mandatory if calculating QH;nd | `calculateMonthlyHeatingNeed` |
| `annual.monthlyValues` | kWh array length 12 | mandatory only for annual sum helper | `calculateAnnualHeatingNeedSum` |

Fail closed when:

- any row marked `blocked_ambiguous` is sent to `calculateMonthlyHeatingNeed`;
- Apr/Sep boundary rows are missing explicit blocker ids;
- Oct row with `gammaH > 2` is forced into the helper to match the positive Anexa B display;
- annual sum is requested from fewer than 12 values;
- a blocked monthly value is silently replaced with zero;
- qH;nd is inferred from annual totals.

Required blocked rows:

- `april_boundary_heating_period_method_blocked`
- `september_boundary_heating_period_method_blocked`
- `october_mc001_worked_example_ambiguity`
- `figure_2_18_gamma_h_greater_than_2_branch_preserved`

Never infer: climate, solar gains, internal gains, utilization factors, gamma, heating days, blocked-month QH;nd, or annual heating need.

## Section 6 - Final / Primary / CO2 Indicators

Allowed modes:

- `explicit_service_final_energy_rows`
- `blocked`

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `entries[].serviceKey` | text | yes for service breakdown | `calculateFinalEnergyTotal`, `calculatePrimaryCO2Summary` |
| `entries[].energyCarrierKey` | dataset key | yes | factor lookup in `finalPrimaryCo2Indicators.mjs` |
| `entries[].finalEnergyKWh` | kWh/an | yes | final, primary, CO2 helpers |
| `entries[].source` | text | yes | Trace only. |
| `referenceAreaM2` | m2 | yes for specific indicators | `calculateSpecificIndicator`, `calculatePrimaryCO2Summary` |
| `unitNumerator` | text | optional | `calculateSpecificIndicator` |

Fail closed when:

- any final-energy row lacks carrier key, service key, source, or unit;
- carrier key is missing from reviewed Tabel 5.17 or Tabel 5.18 datasets;
- specific indicators are requested without `referenceAreaM2`;
- page 527/page 540 electric CO2 display inconsistency is used as expected output;
- certificate/CPE class output is requested.

Never infer: service final energy, energy carrier, primary factors, CO2 factors, reference area, service inclusion, or missing service rows.

## Section 7 - DHW Useful / Display-Only Components

Allowed modes:

- `useful_demand_only`
- `distribution_components_only`
- `displayed_subtotal_reconciliation_only`
- `blocked`

Level 1 must not calculate full DHW final energy.

### Useful Demand Fields

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `volumeLiters` | l/timestep | mandatory for useful energy | `calculateDhwUsefulEnergyDemand` |
| `specificHeatKWhPerKgK` | kWh/(kgK) | mandatory | `calculateDhwUsefulEnergyDemand` |
| `waterDensityKgPerM3` | kg/m3 | mandatory | `calculateDhwUsefulEnergyDemand` |
| `thetaWDrawC` | degC | mandatory | `calculateDhwUsefulEnergyDemand` |
| `thetaWColdC` | degC | mandatory | `calculateDhwUsefulEnergyDemand` |
| `tableEntryId` | text | optional but explicit | `calculateDhwDailyVolumeFromTable3_3_1` |
| `unitCount` | service units | mandatory with table entry | `calculateDhwDailyVolumeFromTable3_3_1` |
| `specificDailyDemandLPerUnitDay` | l/(unit day) | mandatory for direct non-residential volume | `calculateDhwDailyVolumeNonResidential` |
| `baseDailyVolumeLiters` | l/day | mandatory for loss/waste volume | `calculateDhwVolumeWithLossWaste` |
| `penaltyFactor1`, `penaltyFactor2` | - | mandatory for loss/waste volume | `calculateDhwVolumeWithLossWaste` |

### Distribution Component Fields

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `thetaWDistributionC` | degC | mandatory | `calculateDhwMeanDistributionTemperature` |
| `deltaThetaWLoopK` | K | mandatory | `calculateDhwMeanDistributionTemperature` |
| `innerDiameterM`, `outerDiameterM` | m | mandatory for pipe psi | distribution component helpers |
| `insulationThermalConductivityWPerMK` | W/(mK) | mandatory for insulated/buried pipe | distribution component helpers |
| `pipeThermalConductivityWPerMK` | W/(mK) | mandatory for uninsulated pipe | `calculateDhwUninsulatedPipeLinearTransmittance` |
| `externalHeatTransferCoefficientWPerM2K` | W/(m2K) | mandatory where helper requires it | pipe psi helpers |
| `burialMaterialThermalConductivityWPerMK` | W/(mK) | mandatory for buried pipe | `calculateDhwBuriedPipeLinearTransmittance` |
| `burialDepthM` | m | mandatory for buried pipe | `calculateDhwBuriedPipeLinearTransmittance` |

### Display-Only Subtotal Fields

| Field | Unit | Mandatory | Rule |
| --- | --- | --- | --- |
| `components[].valueKWh` | kWh/an | yes | Display arithmetic only. |
| `displayedTotalKWh` | kWh/an | yes | Compare only to source display. |
| `displayToleranceKWh` | kWh | yes | Must be explicit. |

Fail closed when:

- full DHW final energy, distribution annual energy, storage, generation, recovered loss, or auxiliary energy is requested;
- annual distribution-loss basis is absent;
- display subtotal is treated as formula validation;
- table entry id is missing for a table-backed demand value.

Never infer: DHW occupancy/use counts, Tabel 3.3.1 row, water temperatures, penalty factors, pipe geometry, annual distribution length, storage/generation losses, recovered losses, auxiliary energy, or final-energy conversion.

## Section 8 - RER Display-Only Reconciliation

Allowed modes:

- `display_only_reconciliation`
- `blocked`

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `numeratorKWhPerM2An` | kWh/(m2.an) | yes | No helper; display arithmetic only. |
| `denominatorKWhPerM2An` | kWh/(m2.an) | yes | No helper; display arithmetic only. |
| `multiplierPercent` | % | yes | No helper; explicit display factor. |
| `displayedRerPercent` | % | yes | No helper; source display. |
| `displayTolerancePercent` | percentage points | yes | No helper; explicit tolerance. |

Fail closed when:

- generic RER methodology is requested;
- renewable/export perimeter is missing;
- exported energy or renewable production is inferred;
- Fixture 012 display arithmetic is used as a general RER calculator.

Never infer: `EPren,RER` perimeter, exported renewable treatment, renewable production, factor splits, or certificate RER output.

## Section 9 - Energy Class Assignment

Allowed modes:

- `explicit_class_lookup`
- `disabled`
- `blocked`

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `sourceTable` | text | yes if enabled | `classifyEnergyIndicator` |
| `buildingCategoryKey` | text | yes if enabled | `classifyEnergyIndicator` |
| `indicatorBasis` | text | yes if enabled | `classifyEnergyIndicator` |
| `indicatorKey` | text | yes if enabled | `classifyEnergyIndicator` |
| `indicatorValue` | kWh/(m2.an) or kgCO2/(m2.an) | yes if enabled | `classifyEnergyIndicator` |

Fail closed when:

- any required field is missing;
- no reviewed Tabel 5.7-5.14 threshold row matches the requested lookup;
- adjusted thresholds are mixed with class assignment without an explicit adjusted-threshold lookup policy;
- Anexa B displayed class labels are requested.

Never infer: source table, category, indicator basis, indicator key, value, class label, reference-building class, or certificate class.

## Section 10 - Utility Inclusion Threshold Recalculation

Allowed modes:

- `explicit_utility_rule_lookup`
- `explicit_threshold_recalculation`
- `disabled`
- `blocked`

| Field | Unit | Mandatory | Helper |
| --- | --- | --- | --- |
| `buildingCategoryKey` | text | yes for rule lookup | `findUtilityInclusionRule` |
| `utilityKey` | text | yes for rule lookup | `findUtilityInclusionRule` |
| `baseTotalThreshold` | kWh/(m2.an) | yes for total threshold adjustment | `calculateAdjustedEnergyClassThreshold` |
| `baseCO2Threshold` | kgCO2/(m2.an) | yes for CO2 threshold adjustment | `calculateAdjustedCO2ClassThreshold` |
| `missingUtilityPrimaryThresholds[].utilityKey` | text/null | yes for trace | threshold helpers |
| `missingUtilityPrimaryThresholds[].primaryThreshold` | kWh/(m2.an) | yes | threshold helpers |
| `missingUtilityPrimaryThresholds[].co2Factor` | kgCO2/kWh primary | mandatory per entry or global `co2Factor` for CO2 adjustment | `calculateAdjustedCO2ClassThreshold` |
| `co2Factor` | kgCO2/kWh primary | optional global value | `calculateAdjustedCO2ClassThreshold` |
| `precision` | decimal places | optional, default only if explicit policy accepts helper default | `calculateAdjustedCO2ClassThreshold` |

Fail closed when:

- missing utility is mandatory for the explicit category;
- missing optional utility thresholds are absent;
- CO2 threshold adjustment lacks CO2 factor;
- virtual ventilation consumption is requested;
- mixed-use weighted thresholding is requested.

Never infer: missing utilities, utility mandatory status from product category labels, utility thresholds, CO2 factors, mixed-use weights, overheating status, or virtual ventilation energy.

## Required Explicit Blockers Section

The input pack must carry an `explicitBlockers` array. These blockers must remain present unless a later investigation resolves them:

| Blocker id | Required status |
| --- | --- |
| `april_boundary_heating_period_method_blocked` | `blocked_ambiguous` |
| `september_boundary_heating_period_method_blocked` | `blocked_ambiguous` |
| `october_mc001_worked_example_ambiguity` | `blocked_ambiguous` |
| `full_dhw_final_energy_chain_blocked` | `blocked` |
| `annual_dhw_distribution_loss_basis_blocked` | `blocked` |
| `dhw_storage_generation_recovered_auxiliary_paths_blocked` | `blocked` |
| `general_rer_methodology_perimeter_export_blocked` | `blocked` |
| `anexa_b_co2_display_inconsistency_blocked` | `blocked_source_conflict` |
| `anexa_b_displayed_class_labels_blocked` | `blocked` |
| `mixed_use_weighted_thresholds_blocked` | `blocked` |
| `overheating_discomfort_hours_above_26c_blocked` | `blocked` |
| `virtual_ventilation_full_calculation_blocked` | `blocked` |
| `lighting_blocked` | `blocked_missing_external_standard` |
| `cooling_systems_blocked` | `blocked_missing_inputs` |
| `reference_building_blocked` | `blocked` |
| `certificate_cpe_generation_blocked` | `blocked_out_of_scope` |

Fail closed if the pack omits a known blocker that still affects a requested section.

## Values That Must Never Be Inferred

The Level 1 orchestrator must never infer:

- building category or source table;
- reference area, conditioned area, heated volume, or storey height;
- envelope area, material layers, Rsi/Rse, lambda correction coefficient, U, U', bridge psi, bridge length, chi, or L2D;
- ground, unheated, or adjacent transmission applicability;
- ACH, airflow, bve, bztu, fveDyn, rhoA, ca, supply temperature, or fan/AHU energy;
- monthly climate, annual exterior temperature, solar gains, internal gains, hours, gamma, eta, or heating-period days;
- service final energy, service inclusion, energy carrier, primary factor, CO2 factor, or reference area for specific indicators;
- DHW service units, Tabel 3.3.1 row, water temperatures, penalty factors, pipe geometry, annual distribution length, storage/generation/recovered/auxiliary values, or DHW final energy;
- RER perimeter, renewable/export treatment, renewable production, or certificate RER;
- class table, indicator basis/key, threshold, missing optional utility, mixed-use area weights, overheating hours, or virtual ventilation consumption;
- certificate/CPE fields or report recommendations.

## Minimum Viable Level 1 Fixture Candidate

Recommended Fixture 16:

`FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR`

Minimum viable scope:

1. Envelope/transmission using explicit already-reviewed Hd/Hg/Htr-style inputs or explicit element/bridge inputs from reviewed rows.
2. Ventilation using explicit Hve/Qve-style inputs from reviewed rows.
3. Final/primary/CO2 using explicit service final-energy rows, reviewed carrier keys, and explicit reference area.
4. Explicit blockers section proving that monthly heating boundary rows, full DHW final energy, general RER, class labels, lighting, cooling systems, reference building, and certificate/CPE workflow remain blocked.

Recommendation against expanding Fixture 16:

- Do not include full DHW final energy.
- Do not include certificate/CPE.
- Do not include lighting or cooling systems.
- Do not include production integration.
- Do not include automatic building-type inference.
- Do not require class assignment in the core fixture.

## Fixture 16 Scope Decision

| Option | Decision | Reason |
| --- | --- | --- |
| A. Transmission + ventilation + final/primary/CO2 only | Prefer for the core Fixture 16. | These domains have the clearest explicit helper inputs and reviewed fixture rows. |
| B. Monthly heating included with blocked months preserved | Allow only as blocker/summary rows or as unambiguous helper-call rows. | Apr/Sep/Oct must stay blocked; do not force positive Anexa B QH;nd through Figure 2.18. |
| C. Class assignment included only as explicit optional section | Optional, disabled by default for Fixture 16. | Explicit interval lookup is safe, but class labels/certificate context remain blocked. |
| D. DHW excluded except useful-demand/display-only summary | Prefer exclusion from the core calculation. | Useful-demand and display-only summaries are safe only when clearly separated from full DHW final energy. |

The safest next step is a narrow Level 1 input pack first, followed by Fixture 16 proving fail-closed orchestration over that pack. Level 1 should not become a general auditor.

## Proposed Output Shape For A Future Level 1 Orchestrator

This investigation does not implement the output, but the future Level 1 result should be limited to:

```js
{
  status: "calculated_with_blockers" | "blocked",
  level: "LEVEL_1_COMPONENT_ORCHESTRATOR",
  componentResults: {
    envelopeTransmission: {},
    ventilation: {},
    monthlyHeating: {},
    finalPrimaryCo2: {},
    dhw: {},
    rerDisplay: {},
    energyClassAssignment: {},
    utilityInclusionThresholds: {}
  },
  blockedComponents: [],
  ambiguousComponents: [],
  helperCallTrace: []
}
```

The output must not include `certificate`, `cpe`, `officialCertificate`, `report`, `ui`, `worker`, `api`, `db`, `deploy`, `recommendations`, or production workflow data.

## Conclusion

This investigation concludes that Level 1 is safe only after the explicit input pack is turned into a reviewed fixture. The implemented follow-up fixture is the narrow core pack for transmission, ventilation, and final/primary/CO2 with blockers preserved. Monthly heating, class assignment, DHW useful/display-only rows, utility threshold recalculation, and RER display reconciliation can be represented only as explicit optional sections with fail-closed behavior.
