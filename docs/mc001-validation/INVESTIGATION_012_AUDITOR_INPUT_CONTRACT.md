# INVESTIGATION 012 - Auditor Input Contract

## Status

- Investigation id: `INVESTIGATION_012_AUDITOR_INPUT_CONTRACT`
- Milestone: `PHASE_A_FULL_AUDITOR_ENGINE_CONTRACTS`
- Scope: full MC001 auditor input-contract design only.
- Target user: energy auditor.
- Code changes justified: no.
- Full auditor implementation justified: no.
- UI/API/DB/Worker/report/certificate integration justified: no.

This investigation defines the future full-auditor input contract that can feed a scalable MC001 Physics Engine. It does not implement schemas, validators, helpers, formulas, UI forms, DB tables, migrations, API routes, Workers, report generation, certificate/CPE workflow, product integration, or a Level 2 orchestrator.

## Purpose

The purpose is to define exactly what an energy auditor must be able to provide before the Physics Engine can safely build a complete MC001 audit graph.

The contract is not a homeowner questionnaire. It is a technical audit pack with source trace, units, confidence, assumptions, overrides, blockers, and domain-level applicability. The contract must support complete MC001 evolution from raw auditor-entered data to normative table selection, derived coefficients, service energy, indicators, diagnostics, and future report/certificate adapters.

## Files Inspected

| File | Reason |
| --- | --- |
| `docs/mc001-validation/INVESTIGATION_011_FULL_MC001_AUDITOR_ENGINE_ARCHITECTURE.md` | Parent architecture and complete workflow coverage. |
| `docs/mc001-validation/INVESTIGATION_009_LEVEL_1_EXPLICIT_INPUT_PACK.md` | Existing Level 1 explicit input-pack rules and fail-closed boundaries. |
| `docs/mc001-validation/FIXTURE_018_LEVEL_1_FAIL_CLOSED_HARDENING.md` | Current executable fail-closed requirements and required blockers. |
| `docs/mc001-validation/GAP_ANALYSIS.md` | Validated helpers and unresolved formula/source gaps. |
| `docs/mc001-validation/VALIDATION_MATRIX.md` | Current validation coverage and blocked full examples. |
| `docs/mc001-extraction/19_extraction_registry.md` | Extraction registry, missing-input vocabulary, and implementation readiness. |

## Contract Principles

- Every top-level section must be present.
- A section can be `not_applicable`, `blocked`, or `out_of_scope_current_phase`, but absence is not a status.
- Every helper-call input must have value, unit, source, confidence, and ownership.
- The engine may normalize explicit units where conversion is reviewed, but it must not invent values.
- Product estimates and fallback fields must not be accepted as MC001 validation inputs.
- Measured/facture data may support comparison and override workflows, but must not silently replace MC001 methodology.
- Missing source trace must block the affected calculation domain.
- Full audit readiness requires every required section to be complete, not merely present.

## Input Model

The future contract should be serializable as one versioned object:

```js
{
  contractMetadata: {},
  projectMetadata: {},
  sourceTrace: {},
  buildingClassification: {},
  geometry: {},
  zones: [],
  envelopeElements: [],
  materialAssemblies: [],
  openings: [],
  thermalBridges: [],
  groundAndContact: {},
  unconditionedSpaces: [],
  ventilation: {},
  climateAndSetpoints: {},
  internalAndSolarGains: {},
  heatingSystems: [],
  dhwSystems: [],
  coolingSystems: [],
  lightingSystems: [],
  renewables: [],
  measuredConsumption: [],
  expertOverrides: [],
  assumptions: [],
  explicitBlockers: []
}
```

Every section also carries:

| Field | Required | Meaning |
| --- | --- | --- |
| `sectionStatus` | yes | `ready`, `not_applicable`, `blocked_missing_input`, `blocked_missing_normative_data`, `blocked_external_standard`, `requires_expert_override`, or `out_of_scope_current_phase`. |
| `sourceRefs[]` | yes unless section is globally not applicable | Links to source documents, pages, tables, field notes, measurements, or normative records. |
| `quality` | yes | `reviewed`, `auditor_entered`, `measured`, `imported`, `low_confidence`, `blocked`, or `unknown`. |
| `blockers[]` | yes, can be empty | Structured blocker ids affecting this section. |

## Field Value Shape

Individual calculation inputs should use a value envelope when they can affect a helper call:

```js
{
  value: 123.45,
  unit: "m2",
  owner: "auditor_entered",
  sourceRefs: ["FIELD_NOTE_001", "DRAWING_A101:p2"],
  confidence: "reviewed",
  canInfer: false,
  override: null,
  status: "ready"
}
```

Allowed owners:

- `auditor_entered`
- `normative_table_selected`
- `calculated_by_engine`
- `imported_external_dataset`
- `validation_import_with_source`
- `measured_override_with_source`
- `blocked_missing`

## Derived Value Input Policy

The normal auditor input path must be raw technical data: drawings, measured dimensions, element areas, layer stacks, material/source selections, system equipment data, schedules, measured/facture records, assumptions, and source-backed overrides.

Derived MC001 coefficients and totals must not be ordinary auditor-entered fields. Values such as `Hd`, `Hg`, `Hu`, `Ha`, `Htr`, `Hve`, `QH;ht`, `QH;gn`, `QH;nd`, final energy totals, primary energy totals, and CO2 totals may appear only as:

- `calculated_by_engine` outputs;
- `validation_import_with_source` values from reviewed fixtures or source examples;
- `measured_override_with_source` / expert overrides with mandatory source, reason, unit, and approval where required.

If a future implementation accepts one of these derived values as a source-backed import or override, the result must be marked as imported/overridden and must not be used to claim validation of the underlying formula path.

## Required Sections And Fields

### 1. Contract Metadata

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `contractId` | yes | string | none | calculated by engine or auditor system | generated id with audit source | no | Missing id blocks all downstream trace. |
| `contractVersion` | yes | string | none | normative/engine contract | Phase A contract registry | no | Unknown version blocks orchestration. |
| `targetMethodology` | yes | enum | none | auditor-entered | MC001 version selection | no | Unsupported methodology blocks all MC001 calculations. |
| `calculationMode` | yes | enum | none | auditor-entered | audit setup | no | Must distinguish explicit validation, official-like, measured comparison, and shadow validation. |
| `createdAt` | yes | datetime | ISO datetime | calculated by engine | audit package metadata | no | Missing timestamp blocks audit trail. |
| `createdBy` | yes | string | none | auditor-entered | auditor/account source | no | Missing author blocks official/report adapter readiness. |

### 2. Project Metadata

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `projectId` | yes | string | none | auditor-entered | project record | no | Missing project id blocks package readiness. |
| `evaluationPurpose` | yes | enum | none | auditor-entered | audit setup | no | Unknown purpose blocks readiness claims. |
| `evaluationDate` | yes | date | ISO date | auditor-entered | audit setup | no | Missing date blocks normative version selection. |
| `buildingAddressLabel` | optional for calculation | string | none | auditor-entered | project record | no | Missing address blocks report/certificate adapter only. |
| `auditBoundaryDescription` | yes | string | none | auditor-entered | drawings/site notes | no | Missing boundary blocks full audit readiness. |
| `auditorIdentity` | required for official workflow | object | none | auditor-entered | credential/source | no | Missing identity blocks certificate/CPE adapter. |

### 3. Source Trace

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `documents[]` | yes | array | none | auditor-entered/imported | source package | no | Empty source package blocks helper calls. |
| `documents[].documentId` | yes | string | none | auditor-entered/imported | stable id | no | Missing id blocks citations. |
| `documents[].documentType` | yes | enum | none | auditor-entered/imported | source package | no | Unknown type lowers confidence or blocks official mode. |
| `documents[].versionOrDate` | required when available | string/date | none | auditor-entered/imported | source package | no | Missing version blocks version-sensitive sources. |
| `fieldSources[]` | yes | array | none | auditor-entered/calculated by engine | field-to-source mapping | no | Numeric helper inputs without field source fail closed. |
| `fieldSources[].reviewStatus` | yes | enum | none | auditor-entered/reviewer | source review | no | `blocked` cannot feed helper calls. |

### 4. Building Classification

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `primaryCategoryKey` | yes | enum/string | none | auditor-entered plus normative table selected | reviewed category registry/source table | no | Missing key blocks class, utility, schedules, and reference paths. |
| `categorySource` | yes | source ref | none | auditor-entered | source page/table/note | no | Missing source blocks category-dependent calculations. |
| `isResidential` | yes | boolean | none | auditor-entered | category mapping | no | Cannot infer from label. |
| `useCategories[]` | yes | array | none | auditor-entered | occupancy/use source | no | Missing use blocks schedules, DHW, lighting, classes. |
| `mixedUseDeclaration` | required if mixed use | object | m2 or fraction | auditor-entered | zone/area source | no | Missing mixed-use weights blocks weighted thresholds. |
| `utilityContext` | required for class workflow | object | none | normative table selected | Tabel 5.6 or later registry | no | Missing utility context blocks adjusted classes. |

### 5. Geometry

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `referenceArea` | yes for specific indicators | number | m2 | auditor-entered/measured | drawings or audited measurement | no | Missing area blocks specific primary/CO2/class indicators. |
| `conditionedFloorArea` | yes | number | m2 | auditor-entered/measured | drawings/source | no | Missing area blocks zone and system normalization. |
| `heatedVolume` | required for ACH path | number | m3 | auditor-entered/measured | drawings/source | no | Missing volume blocks ACH-derived airflow. |
| `grossVolume` | optional | number | m3 | auditor-entered/measured | drawings/source | no | Cannot substitute for heated volume. |
| `storeyHeights[]` | required if volume derived | array | m | auditor-entered/measured | drawings/source | no | Do not assume height from area. |
| `orientationReference` | required for solar/opening paths | enum/number | degrees or cardinal | auditor-entered | drawings/source | no | Missing orientation blocks solar paths. |

### 6. Zones

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `zoneId` | yes | string | none | auditor-entered | zone model | no | Missing id blocks element/system links. |
| `conditioningStatus` | yes | enum | none | auditor-entered | audit boundary | no | Missing status blocks thermal boundary classification. |
| `area` | yes | number | m2 | auditor-entered/measured | drawings/source | no | Missing area blocks zone weighting. |
| `volume` | required for zone ACH | number | m3 | auditor-entered/measured | drawings/source | no | Missing volume blocks zone ventilation path. |
| `useCategoryKey` | yes | enum/string | none | auditor-entered | classification source | no | Missing use blocks schedules and service demand. |
| `setpointProfileId` | required for monthly balance | string | none | normative table selected or auditor-entered | schedule/setpoint source | no | Missing profile blocks monthly balance. |

### 7. Envelope Elements

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `elementId` | yes | string | none | auditor-entered | element schedule/source | no | Missing id blocks trace. |
| `zoneId` | yes | string | none | auditor-entered | zone contract | no | Missing link blocks heat-transfer grouping. |
| `elementType` | yes | enum | none | auditor-entered | audit source | no | Unknown type blocks normative applicability. |
| `contactType` | yes | enum | none | auditor-entered | drawings/site source | no | Missing contact blocks Hd/Hg/Hu/Ha grouping. |
| `area` | yes | number | m2 | auditor-entered/measured | drawings/source | no | Missing area blocks transmission. |
| `orientation` | required for solar/opening paths | enum/number | degrees/cardinal | auditor-entered | drawings/source | no | Missing orientation blocks solar. |
| `tilt` | path-dependent | number | degrees | auditor-entered | drawings/source | no | Missing tilt blocks relevant solar paths. |
| `calculationPath` | yes | enum | none | auditor-entered | methodology decision | no | Mixed bridge and corrected-U paths fail closed. |

### 8. Material Assemblies

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `assemblyId` | yes | string | none | auditor-entered | element schedule/source | no | Missing id blocks layer trace. |
| `elementIds[]` | yes | array | none | auditor-entered | element contract | no | Missing element links block U calculation. |
| `layers[].materialId` | yes | string | none | auditor-entered/normative table selected | material registry/source | no | Unknown material blocks lookup. |
| `layers[].thickness` | yes | number | m | auditor-entered/measured | drawings/site source | no | Missing thickness blocks R. |
| `layers[].lambdaNormat` | required for corrected lambda | number | W/(mK) | normative table selected/measured override | normative/material source | no | Missing lambda blocks corrected conductivity. |
| `layers[].correctionCoefficientA` | path-dependent | number | none | normative table selected | Tabel 2.2 or source | no | Missing coefficient blocks corrected path. |
| `rsi` | yes for total R | number | m2K/W | normative table selected | surface resistance source | no | Missing Rsi blocks total R. |
| `rse` | yes for total R | number | m2K/W | normative table selected | surface resistance source | no | Missing Rse blocks total R. |

### 9. Openings, Windows, Doors, And Glazing

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `openingId` | yes | string | none | auditor-entered | opening schedule/source | no | Missing id blocks trace. |
| `parentElementId` | yes | string | none | auditor-entered | envelope element | no | Missing parent blocks area accounting. |
| `area` | yes | number | m2 | auditor-entered/measured | drawings/source | no | Missing area blocks transmission/solar. |
| `uValue` | yes | number | W/(m2K) | measured override/normative/manufacturer | source required | no | Missing U blocks opening transmission. |
| `gValue` | required for solar gains | number | none | manufacturer/normative source | source required | no | Missing g-value blocks solar gain. |
| `frameFactor` | path-dependent | number | none | manufacturer/normative source | source required | no | Missing factor blocks detailed paths. |
| `shadingFactors` | path-dependent | object | none | normative/source | source required | no | Missing shading blocks solar path. |

### 10. Thermal Bridges

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bridgeId` | yes | string | none | auditor-entered | bridge schedule/source | no | Missing id blocks trace. |
| `linkedElementIds[]` | yes | array | none | auditor-entered | element contract | no | Missing links block grouping. |
| `bridgeType` | yes | enum/string | none | auditor-entered/normative table selected | source table/note | no | Unknown type blocks lookup. |
| `psi` | required for linear path | number | W/(mK) | normative table selected/measured/calculated by engine | source required | no | Missing psi blocks explicit bridge path. |
| `length` | required for linear path | number | m | auditor-entered/measured | drawings/source | no | Missing length blocks contribution. |
| `chi` | required for point path | number | W/K | normative table selected/measured | source required | no | Missing chi blocks point bridge path. |
| `l2d` | required for L2D path | number | W/K | measured/simulation source | source required | no | Missing L2D blocks psi derivation. |
| `method` | yes | enum | none | auditor-entered | methodology/source | no | Mixed method blocks transmission. |

### 11. Ground, Contact, And Unconditioned Spaces

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `groundContacts[]` | required if ground applies | array | none | auditor-entered | drawings/source | no | Missing ground contact blocks Hg. |
| `groundContacts[].hg` | path-dependent | number | W/K | calculated by engine, validation import, or expert override with source | source/formula trace | no | Normal auditor input should provide raw ground/contact data; missing raw inputs or approved explicit Hg while applicable blocks Htr. |
| `unconditionedSpaces[].spaceId` | required if Hu/bztu applies | string | none | auditor-entered | drawings/source | no | Missing id blocks Hu/bve path. |
| `unconditionedSpaces[].bztu` | required for bve path | number | none | normative table selected/calculated | source/formula trace | no | Missing bztu blocks unconditioned bve. |
| `unconditionedSpaces[].hu` | path-dependent | number | W/K | calculated by engine, validation import, or expert override with source | source/formula trace | no | Normal auditor input should provide raw unconditioned-space data; missing raw inputs or approved explicit Hu while applicable blocks Htr. |
| `applicability` | yes | object | none | auditor-entered | boundary source | no | Missing applicability cannot default to not applicable. |

### 12. Ventilation And Infiltration

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `mode` | yes | enum | none | auditor-entered | methodology/source | no | Unknown mode blocks ventilation. |
| `flows[].airflowM3h` | path-dependent | number | m3/h | auditor-entered/measured | design/source | no | Missing flow blocks Hve path. |
| `flows[].airflowM3s` | alternative | number | m3/s | auditor-entered/measured | design/source | no | Both units in one row block. |
| `flows[].ach` | required for ACH path | number | 1/h | auditor-entered/measured/normative | source required | no | Missing ACH blocks ACH path. |
| `flows[].volume` | required for ACH path | number | m3 | auditor-entered/measured | geometry/source | no | Missing volume blocks ACH path. |
| `flows[].bve` | required for Hve | number | none | calculated by engine or source | source/formula trace | no | Missing bve blocks Hve. |
| `rhoA` | required for full Hve | number | kg/m3 | normative table selected | source required | no | Missing rhoA blocks full Hve. |
| `ca` | required for full Hve | number | J/(kgK) | normative table selected | source required | no | Missing ca blocks full Hve. |
| `fanOrAhuEnergy` | path-dependent | object | kWh/an or inputs | auditor-entered/equipment source | source required | no | Fan/AHU energy remains blocked unless source method is complete. |

### 13. Climate, Setpoints, Internal Gains, And Solar Gains

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `climateSourceId` | yes for monthly methods | string | none | imported external dataset or auditor-entered explicit source | source required | no | Missing source blocks official-like monthly mode. |
| `monthlyExteriorTemperatures[]` | yes for monthly transfer | 12 numbers | degC | imported external dataset/auditor-entered explicit source | source required | no | Missing month blocks monthly transfer. |
| `annualExteriorTemperature` | path-dependent | number | degC | imported external dataset/auditor-entered explicit source | source required | no | Missing annual value blocks ground monthly transfer. |
| `monthlySolarIrradiation[]` | required for solar gains/renewables | array | kWh/m2 or source unit | imported external dataset | source required | no | Missing solar data blocks gains/renewables. |
| `indoorSetpoints[]` | yes for monthly balance | array | degC | auditor-entered/normative table selected | source required | no | Missing setpoint blocks heat transfer. |
| `internalGainProfiles[]` | path-dependent | array | W, kWh, or source unit | auditor-entered/normative table selected | source required | no | Missing gains block QH;gn/QC;gn. |

### 14. Heating Demand And Heating Systems

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `systemId` | required if heating applies | string | none | auditor-entered | system schedule/source | no | Missing id blocks final heating. |
| `servedZoneIds[]` | yes | array | none | auditor-entered | zone contract | no | Missing zones blocks allocation. |
| `carrierKey` | yes for final/primary | string | none | normative table selected | factor registry/source | no | Missing carrier blocks primary/CO2. |
| `usefulDemandSource` | yes | object | kWh/an | calculated by engine, validation import, or expert override with source | source/formula trace | no | Normal auditor input should provide raw monthly-balance/system inputs; missing engine-calculated demand or approved sourced import/override blocks final heating. |
| `generationEfficiency` | path-dependent | number | none | equipment source/normative table selected | source required | no | Missing efficiency blocks final energy. |
| `distributionLosses` | path-dependent | object | kWh/an or inputs | source required | source required | no | Missing losses block relevant final-energy path. |
| `auxiliaryEnergy` | path-dependent | object | kWh/an or inputs | source required | source required | no | Missing auxiliary source blocks auxiliary row. |

### 15. DHW Systems

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `systemId` | required if DHW applies | string | none | auditor-entered | system schedule/source | no | Missing id blocks DHW. |
| `serviceUnits` | required for non-residential table path | number | unit-specific | auditor-entered | occupancy/source | no | Missing units blocks table-backed volume. |
| `table3_3_1EntryId` | required for table path | string | none | normative table selected | reviewed registry row | no | Missing row blocks table-backed volume. |
| `dailyVolume` | path-dependent | number | l/day | calculated by engine or source | source/formula trace | no | Missing volume blocks useful demand. |
| `thetaHot` | yes for useful demand | number | degC | auditor-entered/normative | source required | no | Missing hot temperature blocks useful demand. |
| `thetaCold` | yes for useful demand | number | degC | auditor-entered/normative | source required | no | Missing cold temperature blocks useful demand. |
| `pipeGeometry` | required for distribution components | object | m | auditor-entered/measured | drawings/source | no | Missing geometry blocks pipe formulas. |
| `distributionOperatingBasis` | required for annual distribution loss | object | h, m, K | auditor-entered/normative | source required | no | Missing basis keeps annual DHW distribution blocked. |
| `storageInputs` | path-dependent | object | source units | equipment/source | source required | no | Missing storage inputs block full DHW final energy. |
| `generationInputs` | path-dependent | object | source units | equipment/source | source required | no | Missing generation inputs block full DHW final energy. |
| `recoveredLossInputs` | path-dependent | object | kWh/an or inputs | source required | source required | no | Missing recovery source blocks recovery credit. |

### 16. Cooling Systems

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `systemId` | required if cooling applies | string | none | auditor-entered | system source | no | Missing id blocks cooling. |
| `servedZoneIds[]` | yes | array | none | auditor-entered | zone contract | no | Missing zones blocks allocation. |
| `usefulCoolingDemand` | required for final cooling | number | kWh/an | calculated by engine, validation import, or expert override with source | source/formula trace | no | Normal auditor input should provide raw cooling demand/system inputs; missing engine-calculated demand or approved sourced import/override blocks final cooling. |
| `performanceMetric` | required for final cooling | enum | none | equipment/normative source | source required | no | Missing metric blocks final cooling. |
| `performanceValue` | required for final cooling | number | EER/SEER/COP units | equipment/normative source | source required | no | Missing value blocks final cooling. |
| `auxiliaryEnergy` | path-dependent | object | kWh/an or inputs | source required | source required | no | Missing auxiliary source blocks auxiliary row. |

### 17. Lighting Systems

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `systemId` | required if lighting applies | string | none | auditor-entered | lighting schedule/source | no | Missing id blocks lighting. |
| `servedZoneIds[]` | yes | array | none | auditor-entered | zone contract | no | Missing zones blocks allocation. |
| `installedPower` | required for lighting energy | number | W | auditor-entered/measured | source required | no | Missing power blocks lighting. |
| `schedule` | required for lighting energy | object | h, days, fractions | auditor-entered/normative | source required | no | Missing schedule blocks lighting. |
| `controlFactors` | path-dependent | object | none | external standard/normative | source required | no | Missing SR EN dependent data blocks lighting. |
| `daylightFactors` | path-dependent | object | none | external standard/normative | source required | no | Missing daylight data blocks lighting. |

### 18. Renewables

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `systemId` | required if renewables apply | string | none | auditor-entered | renewable source | no | Missing id blocks renewable contribution. |
| `type` | yes | enum | none | auditor-entered | equipment/source | no | Unknown type blocks production path. |
| `servedUseOrCarrier` | yes | enum/string | none | auditor-entered | service mapping | no | Missing mapping blocks RER/final row. |
| `installedCapacity` | path-dependent | number | kW, m2, or source unit | equipment/source | no | Capacity alone cannot calculate production. |
| `orientation` | required for solar/PV/thermal | enum/number | degrees/cardinal | drawings/source | no | Missing orientation blocks solar production. |
| `tilt` | required for solar/PV/thermal | number | degrees | drawings/source | no | Missing tilt blocks solar production. |
| `monthlyProduction` | optional explicit | array | kWh/month | measured/source/calculated by engine | source required | no | Must be marked measured or calculated. |
| `exportTreatment` | required for RER/export | object | none | normative/source | source required | no | Missing export treatment blocks general RER. |

### 19. Measured Consumption And Factures

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `recordId` | required if row exists | string | none | auditor-entered/imported | facture/meter source | no | Missing id blocks measured comparison. |
| `periodStart` | yes | date | ISO date | imported/auditor-entered | facture/meter source | no | Missing period blocks normalization. |
| `periodEnd` | yes | date | ISO date | imported/auditor-entered | facture/meter source | no | Missing period blocks normalization. |
| `carrierKey` | yes | string | none | auditor-entered/normative selected | facture/meter source | no | Missing carrier blocks comparison. |
| `quantity` | yes | number | kWh or billing unit | imported/auditor-entered | facture/meter source | no | Missing quantity blocks comparison. |
| `conversionToKWh` | required if source unit is not kWh | object | factor/source | normative/source | no | Missing conversion blocks comparison. |
| `useInMc001Calculation` | yes | boolean | none | auditor-entered | explicit decision | no | Must not silently replace MC001 calculation. |

### 20. Expert Overrides

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `overrideId` | required if row exists | string | none | auditor-entered | override record | no | Missing id blocks override. |
| `targetFieldPath` | yes | string | none | auditor-entered | input/result path | no | Missing target blocks override. |
| `value` | yes | typed | target unit | measured override with source | source required | no | Missing value blocks override. |
| `unit` | required for numeric | string | target unit | source required | no | Unit mismatch blocks override. |
| `reason` | yes | string | none | auditor-entered | explanation | no | Missing reason blocks override. |
| `approvedBy` | required for official workflow | string | none | auditor-entered | auditor credential | no | Missing approval blocks official adapter. |
| `sourceRefs[]` | yes | array | none | source required | source required | no | Missing source blocks override. |

### 21. Assumptions

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `assumptionId` | required if row exists | string | none | auditor-entered | assumption record | no | Missing id blocks trace. |
| `area` | yes | enum/string | none | auditor-entered | affected domain | no | Missing area blocks diagnostics. |
| `description` | yes | string | none | auditor-entered | explanation | no | Missing description blocks readiness. |
| `sourceRefs[]` | required if affects calculation | array | none | source required | source required | no | Missing source blocks helper path. |
| `calculationImpact` | yes | enum | none | auditor-entered/calculated by engine | review flag | no | Unknown impact blocks readiness. |

### 22. Explicit Blockers

| Field | Required | Type | Unit | Owner | Source requirement | Can infer? | Fail-closed rule |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `blockerId` | yes | string | none | calculated by engine/auditor-entered | blocker registry | no | Missing id blocks diagnostics. |
| `area` | yes | enum/string | none | calculated by engine | affected domain | no | Missing area blocks readiness. |
| `status` | yes | status enum | none | calculated by engine | status model | no | Unknown status blocks readiness. |
| `reason` | yes | string | none | auditor-entered/calculated by engine | source/investigation reference | no | Missing reason blocks readiness. |
| `sourceRefs[]` | yes | array | none | source required | source/investigation reference | no | Missing source blocks readiness. |
| `blocksReadiness` | yes | boolean | none | calculated by engine | diagnostics policy | no | Missing impact blocks certificate readiness. |

## Normative Data Ownership

The input contract references normative data but does not own normative values.

| Normative area | Contract stores | Normative KB owns |
| --- | --- | --- |
| MC001 version | selected version id | version metadata, source document identity, compatibility. |
| Materials and coefficients | material/table row ids and selected values when explicitly used | table definitions, values, units, applicability, confidence. |
| Surface resistances | selected ids/values with trace | registry rows and applicability rules. |
| Category/class tables | category key and selected table ids | Tabel 5.6 and Tabel 5.7-5.14 rows, interval semantics, utility flags. |
| Primary/CO2 factors | carrier keys used by service rows | Tabel 5.17/5.18 factor rows and versioning. |
| Climate/solar | selected dataset id or explicit-source values | official dataset registry, source status, confidence. |
| External standards | blocker/reference ids | external standard status and required unresolved fields. |

## Calculated Outputs Supported By The Contract

The contract is designed to support these future calculated outputs once the relevant sections are complete:

- R, corrected lambda, U, U prime.
- Hd, Hg, Hu, Ha, Htr.
- ACH-derived airflow, bve, Hve, monthly Qve.
- monthly Qtr, Qve, QH;ht, QH;gn, QH;nd, QC;nd.
- useful DHW, future DHW final energy, service final-energy rows.
- heating/cooling/lighting/renewable final energy when inputs and normative references are complete.
- renewable/non-renewable/total primary energy and CO2 emissions.
- class assignment and adjusted thresholds when context is complete.
- diagnostics, blockers, readiness, and audit trace for every domain.

## Fail-Closed Rules

The contract must fail closed when:

- any top-level section is absent;
- a section marked `ready` contains missing required fields;
- a numeric value is non-finite, negative where physically invalid, unitless, or a numeric string;
- a source-dependent value has no `sourceRefs`;
- a normative lookup key has no matching normative KB record;
- a field owner is incompatible with the requested calculation path;
- an override lacks source, reason, unit, or required approval;
- product estimates or fallback values are submitted as MC001 validation inputs;
- measured consumption attempts to replace MC001 calculation without explicit measured-comparison mode;
- known blockers are missing from `explicitBlockers`;
- certificate/CPE readiness is requested while any required domain remains blocked, ambiguous, or out of scope.

## Blockers Preserved

The contract must preserve, at minimum:

- April/September boundary heating-period blockers.
- October worked-example ambiguity.
- Full DHW final-energy chain blockers.
- Annual DHW distribution-loss basis blocker.
- DHW storage/generation/recovered/auxiliary blockers.
- General RER perimeter/export blocker.
- Anexa B CO2 display inconsistency.
- Anexa B displayed class-label blocker.
- Mixed-use weighted threshold blocker.
- Overheating/discomfort hours blocker.
- Virtual ventilation full calculation blocker.
- Lighting external-standard blocker.
- Cooling-system blocker.
- Reference-building blocker.
- Certificate/CPE generation out-of-scope status.
- Climate/solar official dataset blocker.

## Downstream Engine Usage

Future downstream layers use this contract as follows:

| Downstream layer | Uses |
| --- | --- |
| `input-normalization-and-validation` | Validates section presence, field shapes, units, owners, sources, and blockers. |
| `normative-knowledge-base` | Resolves normative ids referenced by fields. |
| `derived-coefficients-engine` | Consumes material, layer, bridge, opening, climate, and ventilation source-backed inputs. |
| `thermal-envelope-engine` | Consumes geometry, zones, envelope elements, assemblies, bridges, ground, and unconditioned spaces. |
| `ventilation-engine` | Consumes zone volumes, airflow/ACH, bve, climate, and ventilation source records. |
| `monthly-balance-engine` | Consumes Htr/Hve, climate, setpoints, gains, and monthly status blockers. |
| `service-systems-engine` | Consumes useful-demand outputs and explicit system performance/loss records. |
| `final-primary-co2-engine` | Consumes service final-energy rows and factor keys. |
| `classification-and-threshold-engine` | Consumes category, utility, threshold, reference, and indicator context. |
| `diagnostics-and-blockers` | Consumes section statuses, blockers, assumptions, overrides, and source confidence. |
| `audit-trace/provenance` | Consumes all field sources and helper dependencies. |

## Out-Of-Scope Boundaries

This investigation does not:

- implement JSON Schema or runtime validators;
- implement a new helper;
- implement Level 2 orchestration;
- introduce MC001 formulas;
- create DB tables or migrations;
- create API routes, Workers, UI forms, or deploy config;
- generate reports, certificates, or CPE payloads;
- infer building data from product records;
- use Salicea/demo fixtures;
- resolve blocked normative/source gaps.

## Review Checklist For A Future Executable Fixture

A future Phase A fixture may be ready only when:

- all top-level sections are represented with status fields;
- every calculation-relevant numeric field uses value/unit/source/owner/confidence;
- known blockers are present and machine-readable;
- missing fields produce blocked statuses, not defaults;
- measured/facture data is separated from MC001 methodology calculations;
- no UI/API/DB/product structures are required to run the contract validation.
