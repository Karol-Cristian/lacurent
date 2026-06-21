# INVESTIGATION 008 - Minimal MC001 Orchestrator Boundary

## Status

- Investigation id: `INVESTIGATION_008_MINIMAL_MC001_ORCHESTRATOR_BOUNDARY`
- Scope: boundary design only.
- Code changes justified: no.
- Orchestrator implementation justified in this task: no.
- Recommended Fixture 15 level: Level 0 Summary Aggregator first.
- Conditional Level 1 path: only after a fully explicit input pack is assembled and every called helper receives traceable inputs.

This investigation does not create an orchestrator, product feature, certificate workflow, CPE generation, report generation, UI, worker, DB/schema/API path, production integration, deploy, push, or full DHW final-energy implementation.

## Files Inspected

| File or group | Reason inspected |
| --- | --- |
| `src/physics-engine/materialsUValues.mjs` | Envelope/material helper boundary and exported functions. |
| `src/physics-engine/transmissionCoefficients.mjs` | Direct transmission, bridge, and Htr helper boundary. |
| `src/physics-engine/monthlyTransmissionTransfer.mjs` | Explicit-input monthly transmission helper boundary. |
| `src/physics-engine/ventilationCoefficients.mjs` | Airflow, bve, Hve, and monthly Qve helper boundary. |
| `src/physics-engine/monthlyBalance.mjs` | Monthly QH;ht, QH;gn, QH;nd, and annual sum helper boundary. |
| `src/physics-engine/finalPrimaryCo2Indicators.mjs` | Final, primary, CO2, and specific indicator helper boundary. |
| `src/physics-engine/dhwUsefulDemand.mjs` | DHW useful-demand helper boundary. |
| `src/physics-engine/dhwDistributionLosses.mjs` | DHW distribution component helper boundary. |
| `src/physics-engine/energyClassAssignment.mjs` | Explicit class interval assignment helper boundary. |
| `src/physics-engine/utilityInclusionThresholds.mjs` | Tabel 5.6 utility inclusion and optional threshold recalculation helper boundary. |
| `src/physics-engine/tests/validation/mc001ValidationCandidates.mjs` | Current fixture coverage and blocked candidate metadata. |
| `docs/mc001-validation/VALIDATION_MATRIX.md` | Current validation matrix and helper coverage by area. |
| `docs/mc001-validation/GAP_ANALYSIS.md` | Remaining blockers and source conflicts. |
| `docs/mc001-validation/CANDIDATE_INVENTORY.md` | Executable fixture inventory and candidate status. |
| `docs/mc001-extraction/19_extraction_registry.md` | Extraction readiness, helper boundaries, missing-input statuses, and implementation priorities. |
| `docs/mc001-validation/FIXTURE_006_HEATING_NEED_TABLE_SUMMARY.md` | Apr/Sep/Oct heating-need ambiguity policy. |
| `docs/mc001-validation/FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY.md` | Final/primary/CO2 path and CO2 defect correction. |
| `docs/mc001-validation/FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION.md` | Utility inclusion and threshold recalculation boundary. |

## Orchestrator Levels

### Level 0 - Summary Aggregator

Level 0 consumes already validated fixture outputs and blocker metadata. It does not recalculate raw physics. Its job is to produce a structured validation summary across the existing fixture families.

Allowed behavior:

- collect Fixture 001-014 validated outputs and source notes;
- preserve fixture tolerances, warnings, and blocked rows;
- summarize validated component values by domain;
- expose blockers and ambiguity as first-class rows;
- return `not_calculated`, `blocked`, or `ambiguous` statuses instead of inventing missing values.

Forbidden behavior:

- call formula helpers on newly composed raw input;
- infer geometry, climate, service rows, category, missing utilities, or certificate context;
- produce certificate, CPE, report, UI, API, worker, DB/schema, deploy, or production outputs.

### Level 1 - Component Orchestrator

Level 1 calls existing validated helpers, but only when all helper inputs are explicit, traceable, and validated at the boundary. It is still a Physics Engine validation/composition layer, not a product feature.

Allowed behavior:

- call formula helpers without changing helper signatures;
- fail closed when any required input is missing;
- represent Apr/Sep/Oct heating rows as blocked/ambiguous where required;
- calculate final/primary/CO2 only from explicit service final-energy rows and reviewed factor keys;
- run explicit class assignment only when table, category, basis, key, and value are provided.

Forbidden behavior:

- automatic branch selection for a full building;
- automatic building category inference;
- climate, solar, lighting, cooling-system, DHW-final, reference-building, or certificate defaults;
- broad MC001 audit/certificate workflow.

### Level 2 - Full MC001 Auditor

Level 2 would accept full building input, perform automatic branch selection, calculate all systems, handle missing mandatory utilities, generate certificate/report outputs, and integrate with product flows.

Level 2 is out of scope.

It requires at least: full geometry cleanup, MC001 climate/solar registries, full DHW final-energy chain, lighting data, cooling-system performance, reference-building datasets, mixed-use logic, overheating/discomfort calculation, virtual ventilation consumption, RER perimeter rules, and certificate/CPE workflow.

## Recommendation For Fixture 15

Fixture 15 should be Level 0 first.

Reason: the current repository has many isolated validated helpers, but it does not yet have one fully explicit end-to-end input pack that can safely drive a Level 1 component orchestrator across envelope, ventilation, monthly heating, DHW, final/primary/CO2, and class context without blocked rows.

Level 1 should become justified only when the fixture input pack contains:

- complete explicit helper inputs for every helper call;
- source-backed monthly climate and transfer inputs for any monthly recalculation;
- explicit service final-energy rows for every included service;
- explicit blocked-month markers for Apr/Sep/Oct, or a new source resolution for them;
- explicit policy for class-threshold adjustment versus class assignment;
- no unresolved certificate/CPE, reference-building, report, UI, API, worker, DB/schema, or production dependency.

## Safe-To-Compose Modules

| Area | Existing helper or fixture | Safe first-orchestrator use |
| --- | --- | --- |
| Materials and U-values | `materialsUValues.mjs`; Fixtures 001 and 003 | Level 0 may summarize validated R/U/U' fixture values. Level 1 may call helpers only with explicit lambda, correction coefficient, thickness, Rsi/Rse, and layer data. |
| Transmission | `transmissionCoefficients.mjs`; Fixtures 001-004 | Level 0 may summarize Hd, Hg, Htr, and bridge fixture values. Level 1 may call direct transmission/Htr helpers only with explicit U/U', areas, psi/length, chi, and component inputs. |
| Monthly transmission | `monthlyTransmissionTransfer.mjs`; Fixture 004 context | Level 0 may summarize validated Htr rows. Level 1 may call monthly transfer helpers only with explicit Htr/Hgr, indoor/monthly/annual exterior temperatures, hours, and source notes. |
| Ventilation | `ventilationCoefficients.mjs`; Fixture 005 | Level 0 may summarize bve, Hve, and Qve rows. Level 1 may call bve, Hve, and Qve helpers only with explicit airflow/factors/temperatures/hours. |
| Monthly heating balance | `monthlyBalance.mjs`; Fixture 006 | Level 0 may summarize QH;ht, QH;gn, compatible QH;nd rows, annual displayed QH;nd, and blocked Apr/Sep/Oct markers. Level 1 may call QH;ht/QH;gn helpers and QH;nd only for unambiguous rows. |
| Final, primary, CO2 | `finalPrimaryCo2Indicators.mjs`; Fixtures 007-008 | Level 0 may summarize final, primary, renewable/non-renewable primary, relation 5.4b CO2, and specific indicators. Level 1 may call helpers only with explicit final-energy rows and reviewed carrier keys. |
| DHW useful demand | `dhwUsefulDemand.mjs`; Fixture 010 | Level 0 may summarize useful DHW demand and source row reconciliation. Level 1 may call useful-demand helpers only with explicit service counts, volumes, temperatures, and penalty factors. |
| DHW distribution components | `dhwDistributionLosses.mjs`; Fixture 009 | Level 0 may summarize component-only pipe Psi checks. Level 1 may call component helpers only with explicit pipe/material/temperature inputs. |
| DHW displayed subtotal | Fixture 011 | Level 0 may summarize display arithmetic. Level 1 should not treat it as full DHW final-energy calculation. |
| RER display | Fixture 012 | Level 0 may summarize displayed RER arithmetic. Level 1 should not implement general RER without explicit perimeter policy. |
| Energy class intervals | `energyClassAssignment.mjs`; Fixture 013 | Level 0 may summarize explicit interval assignment validation. Level 1 may call only with explicit table/category/basis/key/value. |
| Utility inclusion and thresholds | `utilityInclusionThresholds.mjs`; Fixture 014 | Level 0 may summarize Tabel 5.6 flags and Nota 4 threshold subtraction. Level 1 may adjust thresholds only with explicit missing optional utility thresholds and CO2 factors. |

## Unsafe Or Out Of Scope

| Area | Boundary decision |
| --- | --- |
| Full orchestrator implementation | Out of scope for this investigation. |
| Product integration | Out of scope. No UI, API, DB/schema, worker, report, deploy, or production flow. |
| Certificate/CPE workflow | Out of scope. No official or unofficial certificate object. |
| Automatic building category inference | Out of scope. Category must be explicit. |
| Reference-building workflow | Blocked by incomplete reference datasets and certificate context. |
| Full DHW final energy | Blocked by annual distribution-loss derivation, storage, generation, recovered losses, auxiliary energy, and final-energy chain gaps. |
| Lighting | Blocked by external SR EN 15193-1/local lighting data gap. |
| Cooling systems | Blocked by useful cooling/system performance and AHU/fan gaps. |
| Solar/climate derivation | Blocked by missing MC001 climate/solar registries and end-to-end validation. |
| Mixed-use class thresholds | Blocked by missing zone/category mapping and area-weighted policy implementation. |
| Overheating/discomfort hours | Blocked by missing chapter 2.8.6 implementation. |
| Virtual ventilation consumption | Blocked beyond recorded Tabel 5.6 rule/example; no general virtual-system calculator exists. |
| General RER | Blocked by explicit renewable/export perimeter and module 12 datasets. |
| Anexa B class labels | Blocked by class-label workflow, reference-building/CPE boundaries, source conflicts, and remaining certificate context. |

## Proposed Level 0 Input Contract

```js
{
  investigationId: "INVESTIGATION_008_MINIMAL_MC001_ORCHESTRATOR_BOUNDARY",
  orchestratorLevel: "level_0_summary_aggregator",
  source: {
    document: "MC001-2022",
    fixtureIds: ["FIXTURE_001_ENVELOPE", "...", "FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION"],
    extractionModules: ["05_transmission_heat_transfer", "07_monthly_heating_cooling_demand", "13_final_primary_co2_rer", "15_energy_classes_and_certificate"]
  },
  buildingContext: {
    buildingCategoryKey: "explicit_only",
    areaBasis: {
      referenceAreaM2: "explicit_or_null",
      source: "explicit_source_note"
    }
  },
  validatedComponents: {
    envelopeTransmission: [],
    ventilation: [],
    monthlyHeating: [],
    dhw: [],
    finalPrimaryCo2: [],
    classThresholds: []
  },
  blockers: []
}
```

Level 0 inputs must already be fixture-validated summaries or explicit blocker rows. They are not raw physical inputs.

## Proposed Level 1 Input Contract

```js
{
  orchestratorLevel: "level_1_component_orchestrator",
  metadata: {
    sourceDocument: "MC001-2022",
    sourcePages: [],
    validationFixtureId: "FIXTURE_015_MINIMAL_MC001_ORCHESTRATOR",
    calculationMode: "explicit_inputs_only"
  },
  buildingContext: {
    buildingCategoryKey: "education",
    sourceTable: "MC001-2022 Tabel 5.10",
    areaBasis: {
      referenceAreaM2: 1369.4,
      source: "Anexa B page 533"
    }
  },
  transmission: {
    mode: "explicit_inputs_or_validated_htr_rows",
    inputs: [],
    validatedRows: []
  },
  ventilation: {
    mode: "explicit_inputs_or_validated_hve_rows",
    inputs: [],
    validatedRows: []
  },
  monthlyHeating: {
    rows: [
      {
        month: "Ian",
        qHhtKWh: 54450,
        qHgnKWh: 39643,
        qHndKWh: 23478.5,
        status: "validated"
      },
      {
        month: "Apr",
        status: "blocked_ambiguous",
        blockerId: "apr_boundary_period_extraction_gap"
      }
    ]
  },
  serviceFinalEnergy: {
    entries: [
      {
        serviceKey: "heating",
        energyCarrierKey: "termoficare_cogenerare_distanta",
        finalEnergyKWh: 120507.2,
        source: "explicit source row"
      }
    ]
  },
  classAssignment: {
    enabled: false,
    sourceTable: "explicit_or_null",
    buildingCategoryKey: "explicit_or_null",
    indicatorBasis: "explicit_or_null",
    indicatorKey: "explicit_or_null",
    indicatorValue: "explicit_or_null",
    missingOptionalUtilities: []
  },
  blockers: [
    {
      blockerId: "full_dhw_final_energy_blocked",
      status: "blocked",
      reason: "annual distribution, storage, generation, recovered losses and auxiliary inputs missing"
    }
  ]
}
```

Level 1 inputs are raw or semi-raw only where every helper input is explicit. Missing inputs must stop that component, not trigger default values.

## Required Output Contract

```js
{
  status: "validated_summary" | "partial_with_blockers" | "blocked",
  orchestratorLevel: "level_0_summary_aggregator" | "level_1_component_orchestrator",
  componentSummaries: {
    envelopeTransmission: {},
    ventilation: {},
    monthlyHeating: {},
    dhw: {},
    finalPrimaryCo2: {},
    energyClasses: {}
  },
  monthlyHeatingTableSummary: {
    validatedRows: [],
    blockedRows: [],
    annualDisplayedQHndKWh: "explicit_or_null"
  },
  finalPrimaryCo2Summary: {
    finalEnergy: {},
    primaryEnergy: {},
    co2: {},
    specificIndicators: {}
  },
  classAssignmentResult: null,
  blockers: [],
  trace: {
    sourceFixtures: [],
    helperCalls: [],
    warnings: []
  }
}
```

The output contract must not include:

- `certificate`
- `cpe`
- `officialCertificate`
- `report`
- `recommendations`
- `ui`
- `worker`
- `api`
- `db`
- `deploy`

## Helpers Callable Without Signature Changes

| Helper file | Callable functions, with boundary |
| --- | --- |
| `materialsUValues.mjs` | `calculateLambdaCorrected`, `calculateLayerResistance`, `calculateTotalResistance`, `calculateUValue` with explicit material/layer inputs. |
| `transmissionCoefficients.mjs` | `calculateDirectTransmissionWithBridges`, `calculateDirectTransmissionWithCorrectedU`, `calculateTotalTransmissionCoefficient` with explicit source-backed components. `calculateLinearBridgePsi` only where `L2D` is explicit. |
| `monthlyTransmissionTransfer.mjs` | `calculateMonthlyTransmissionTransfer`, heating/cooling wrappers only with explicit climate and Htr/Hgr inputs. |
| `ventilationCoefficients.mjs` | `calculateBve`, `calculateVentilationHeatTransferCoefficient`, `calculateVentilationHeatTransferCoefficientFromAirflowM3h`, `calculateMonthlyVentilationTransfer` with explicit inputs. `calculateAirflowFromACH` and `calculateBveFromUnconditionedZone` are callable only for explicit non-Anexa-B inputs unless future reviewed rows exist. |
| `monthlyBalance.mjs` | `calculateMonthlyTotalHeatTransfer`, `calculateMonthlyTotalGains`, compatible `calculateMonthlyHeatingNeed`, `calculateAnnualHeatingNeedSum` only when blocked months are excluded or explicitly represented. |
| `finalPrimaryCo2Indicators.mjs` | `calculateFinalEnergyTotal`, `calculatePrimaryEnergyFromFinalEnergy`, `calculateCO2EmissionsFromFinalEnergy`, `calculateSpecificIndicator`, `calculatePrimaryCO2Summary` with explicit service final-energy rows and reviewed carrier keys. |
| `dhwUsefulDemand.mjs` | Useful demand and Tabel 3.3.1 helper calls with explicit quantities and temperatures. |
| `dhwDistributionLosses.mjs` | Distribution component helpers only; not annual distribution-loss energy. |
| `energyClassAssignment.mjs` | `classifyEnergyIndicator` and `findEnergyClassInterval` only with explicit source table/category/basis/key/value. |
| `utilityInclusionThresholds.mjs` | Tabel 5.6 rule lookup and threshold adjustment helpers only with explicit missing optional utility thresholds and CO2 factors. |

## Wrapper Or Adaptor Functions Needed Before Level 1

| Wrapper/adaptor | Purpose |
| --- | --- |
| Fixture summary normalizer | Convert existing fixture objects and metric outputs into one Level 0 summary shape without recalculation. |
| Blocker normalizer | Standardize `blocked`, `ambiguous`, `not_applicable`, and `not_calculated` rows across fixtures. |
| Monthly heating row adaptor | Prevent Apr/Sep/Oct from being forced through `calculateMonthlyHeatingNeed`; preserve source-conflict markers. |
| Service final-energy adaptor | Validate service entries before calling final/primary/CO2 helpers and prevent inferred service rows. |
| Class-threshold adaptor | Keep adjusted threshold arithmetic separate from class assignment unless a future explicit adjusted-threshold class lookup is designed. |
| RER display adaptor | Keep Fixture 012 display arithmetic separate from any future general RER helper. |
| Trace collector | Combine helper traces and fixture source notes without changing helper signatures. |

No existing helper signature needs to change for Level 0. Level 1 should prefer wrapper/adaptor functions over mutating validated helper APIs.

## Blockers That Must Remain Explicit

| Blocker | Required representation |
| --- | --- |
| April heating need | `blocked_ambiguous`: boundary-period extraction gap and Figure 2.18 branch conflict. |
| September heating need | `blocked_ambiguous`: boundary-period extraction gap and Figure 2.18 branch conflict. |
| October heating need | `blocked_ambiguous`: MC001 worked-example ambiguity with `gammaH > 2`. |
| Full DHW final energy | `blocked`: annual distribution, storage, generation, recovered losses, auxiliary, and final chain incomplete. |
| Lighting | `blocked_missing_external_standard`: SR EN 15193-1/local lighting data not extracted. |
| Cooling systems | `blocked_missing_inputs`: useful cooling and system performance not validated end-to-end. |
| Solar/climate derivation | `blocked_missing_climate_dataset`: MC001 climate/solar registries missing. |
| Mixed-use class thresholds | `blocked`: zone areas and assimilated category mapping missing. |
| Overheating/discomfort | `blocked`: annual hours above 26 degC method not implemented. |
| Virtual ventilation consumption | `blocked`: Tabel 5.6 rule recorded, but no general virtual-system calculator. |
| Reference building | `blocked`: reference datasets and workflow incomplete. |
| Certificate/CPE generation | `blocked_out_of_scope`: not a Physics Engine validation fixture. |
| General RER | `blocked`: explicit `EPren,RER` perimeter and export treatment missing. |
| Anexa B displayed class labels | `blocked`: class-label workflow and reference/CPE boundaries unresolved. |

## Fixture 15 Decision

Fixture 15 should be `FIXTURE_015_MINIMAL_MC001_ORCHESTRATOR_SUMMARY` if implemented next.

Recommended level: Level 0 Summary Aggregator.

Acceptance boundary for Fixture 15:

- consumes already reviewed Fixture 001-014 outputs or fixture metadata;
- produces one structured summary of validated domains and blockers;
- does not call raw formula helpers;
- does not hide Apr/Sep/Oct heating ambiguity;
- does not claim full DHW final energy;
- does not infer category or certificate class;
- does not include certificate, CPE, report, UI, worker, DB/schema, API, deploy, or production integration.

Level 1 is not rejected forever. It is deferred until explicit inputs are assembled and a narrow fixture can prove every helper call without invented values.

## Conclusion

The first isolated MC001 orchestrator boundary should be a validation summary boundary, not a calculation engine boundary. The safest next fixture is Level 0. Level 1 should wait for a source-backed explicit input pack. Level 2 remains out of scope.
