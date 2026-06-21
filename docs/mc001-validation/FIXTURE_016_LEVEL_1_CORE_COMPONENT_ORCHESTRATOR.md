# FIXTURE 016 - Level 1 Core Component Orchestrator

## Status

- Fixture id: `FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR`
- Fixture type: Level 1 core component orchestrator validation.
- Executable: yes.
- Validated helper: `mc001Level1CoreOrchestrator.mjs`.
- Helper calls used: `transmissionCoefficients.mjs`, `ventilationCoefficients.mjs`, and `finalPrimaryCo2Indicators.mjs`.
- Source basis: reviewed Fixture 004 transmission totals, Fixture 005 ventilation Hve/monthly Qve rows, Fixture 007 final/primary/CO2 rows, Fixture 015 blockers, and `INVESTIGATION_009_LEVEL_1_EXPLICIT_INPUT_PACK`.
- Scope exclusions: no Level 2 full auditor, no production orchestrator, no certificate workflow, no CPE generation, no report generation, no UI/API/DB/Worker/deploy/product integration, no invented defaults, no full DHW final-energy implementation, no lighting implementation, no cooling-system implementation, and no reference-building implementation.

## Purpose

Fixture 016 is the first Level 1 MC001 Physics Engine component orchestrator fixture. It composes already validated helper paths from a reviewed explicit input pack.

It is intentionally narrow. It validates that the Physics Engine can orchestrate:

- transmission total aggregation from explicit `Hd`, `Hg`, `Hu`, and `Ha` values;
- ventilation summary from explicit `Hve` and optional reviewed monthly ventilation-transfer rows;
- final/primary/CO2 summary from explicit service final-energy rows, reviewed factors, and reference area;
- explicit blocked and ambiguous components without hiding them.

It does not infer building category, geometry, climate, schedules, DHW final-energy system inputs, lighting, cooling, reference-building parameters, class labels, certificate/CPE fields, or product workflow state.

## Input Pack Contract

`createMc001Level1CoreOrchestrator(inputPack)` requires:

| Section | Required fields | Units / constraints | Helper path |
| --- | --- | --- | --- |
| `packMetadata` | `packId`, `source`, `methodology`, `validationScope`, `createdFor` | trace metadata, non-empty strings | none |
| `buildingContext` | `buildingUseCategory`, `conditionedFloorArea`, `areaUnit`, `calculationBasis` | `conditionedFloorArea` in `m2`; category must be explicit | none |
| `transmission` | `Hd`, `Hg`, `Hu`, `Ha`, `expectedHtr`, `unit` | W/K | `calculateTotalTransmissionCoefficient()` |
| `ventilation` | `Hve`, `unit`; optional `monthlyVentilationTransferRows` | W/K and kWh monthly rows when provided | `calculateMonthlyVentilationTransfer()` |
| `finalPrimaryCo2` | service final-energy rows, primary factors, CO2 factors, conditioned area, expected final total, expected primary total, optional renewable/non-renewable split, optional expected CO2 total | kWh, kgCO2, m2 | `calculatePrimaryCO2Summary()` |
| `explicitBlockers` | blocker objects with `blockerId`, `area`, `status`, `source`, `reason` | required blocker IDs must be present | none |

The orchestrator fails closed for missing required sections and fields. It also validates that explicit factor rows align with the reviewed factor path used by `finalPrimaryCo2Indicators.mjs`.

## Expected Values

| Component | Source | Expected | Calculated by Fixture 016 | Status |
| --- | --- | ---: | ---: | --- |
| Transmission `Htr` | Fixture 004 | `1834.85 W/K` | `1834.85 W/K` | validated |
| Ventilation `Hve` | Fixture 005 | `1806.62 W/K` | `1806.62 W/K` | validated |
| Monthly ventilation rows | Fixture 005 | 12 reviewed rows | 12 rows within Fixture 005 tolerance | validated |
| Final energy total | Fixture 007 | `193295.5 kWh` | `193295.5 kWh` | validated |
| Primary energy total | Fixture 007 | `232610.934 kWh` | `232610.934 kWh` | validated |
| CO2 total | Fixture 007 | `41380.04573 kgCO2` | `41380.04573 kgCO2` | validated |

The CO2 path keeps the corrected MC001 relation 5.4b behavior:

```text
CO2 = Qf * fPtot * fCO2
```

## Output Contract

The returned object is deterministic and JSON-serializable. Required fixed fields:

```text
orchestratorType = "MC001_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR"
level = "LEVEL_1_CORE_COMPONENT_ORCHESTRATION"
isProductionOrchestrator = false
isCertificateWorkflow = false
```

The object also returns:

- `inputPackId`
- `transmissionSummary`
- `ventilationSummary`
- `finalPrimaryCo2Summary`
- `blockedComponents`
- `ambiguousComponents`
- `validationStatus`
- `nextRequiredStep`

## Blockers Preserved

Fixture 016 must preserve at least:

| Area | Preserved blocker |
| --- | --- |
| Monthly heating | April boundary-period heating gap. |
| Monthly heating | September boundary-period heating gap. |
| Monthly heating | October MC001 worked-example ambiguity. |
| DHW | Full DHW final-energy chain. |
| DHW | Annual DHW distribution-loss basis. |
| RER | General RER methodology and perimeter/export treatment. |
| Final/primary/CO2 | Anexa B CO2 display inconsistency. |
| Energy classes | Anexa B displayed class labels. |
| Energy classes | Mixed-use weighted thresholds. |
| Comfort | Overheating/discomfort hours above 26 degC. |
| Ventilation/classes | Virtual ventilation full calculation. |
| Lighting | Lighting calculation. |
| Cooling | Cooling systems calculation. |
| Reference building | Reference-building workflow. |
| Certificate/CPE | Certificate/CPE generation and workflow. |

## Verification Notes

- This fixture validates Level 1 core-only composition.
- It is not Level 2.
- It is not a full MC001 auditor.
- It is not a production orchestrator.
- It is not a certificate/CPE workflow.
- It does not add UI, Worker, DB/schema, API, deploy, report generation, or product integration.
- It does not add new MC001 formulas.
- It does not promote display-only RER, DHW subtotal, class labels, or utility threshold behavior into a certificate workflow.
