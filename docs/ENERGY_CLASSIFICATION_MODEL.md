# Energy Classification Model

## Scope

This document defines how LaCurent Physics Engine separates energy classifications in a MC001-like structure.

It does not define an official energy certificate. All outputs remain estimative and must be labelled as LaCurent estimates.

The model separates:

1. Global energy class
2. CO2 emissions class
3. Service-level energy classes
4. Real building vs reference building comparison

These are different concepts and must not be mixed.

## 1. Global Energy Class

The global energy class is based on total annual specific primary energy:

```text
globalClass = threshold(totalPrimaryEnergyKwhM2Year, buildingEnergyClassType)
```

Input:

- `totalPrimaryEnergyKwhM2Year`
- `buildingEnergyClassType`

Unit:

- `kWh/m2.year`

Supported building types:

- `residential_individual`
- `residential_collective`

Source of thresholds:

- `src/features/energy/physics/registries/energyClassThresholds.registry.ts`
- `src/features/energy/physics/registries/energyClassThresholds.registry.mjs`

Current threshold source:

- `MC001-2022`
- `sourceStatus: user_provided_reference_values`
- `requiresOfficialVerification: true`

Important:

- The calculator must not hardcode thresholds.
- Threshold updates must happen in the registry.
- Boundary rule: the upper boundary belongs to the better class.

Example with the current registry:

```text
residential_individual
C: >257 and <=390 kWh/m2.year
D: >390 and <=522 kWh/m2.year
```

Therefore `383.4 kWh/m2.year` is currently class `C`, not `D`, under the current registry.

## 2. CO2 Emissions Class

The CO2 class is separate from the global energy class.

Conceptual formula:

```text
co2Class = threshold(totalCo2KgM2Year)
```

Input:

- `totalCo2KgM2Year`

Unit:

- `kgCO2/m2.year`

Current status:

- no validated CO2 class threshold registry is available yet;
- the calculator returns `cannot_classify_missing_thresholds`;
- no CO2 thresholds are invented.

Source placeholder:

- `src/features/energy/physics/registries/emissionClassThresholds.registry.ts`
- `src/features/energy/physics/registries/emissionClassThresholds.registry.mjs`

Current metadata:

```text
status: TODO_REFERENCE_VALUE_MISSING
reason: Nu exista inca registry validat pentru pragurile clasei de emisii CO2. Nu inventa praguri CO2.
```

## 3. Service-Level Energy Classes

Service-level classes are separate from the global class.

Supported services:

- `heating`
- `dhw`
- `cooling`
- `mechanicalVentilation`
- `lighting`

Each service result can carry:

- `usefulEnergyKwhM2Year`
- `finalEnergyKwhM2Year`
- `primaryEnergyKwhM2Year`
- `estimatedClass`
- `thresholdSetUsed`
- `unit`
- `assumptions`
- `warnings`
- `confidence`
- `trace`

Conceptual formula:

```text
serviceClass = threshold(servicePrimaryEnergyKwhM2Year, service)
```

Current status:

- no validated service-level class thresholds are available yet;
- if a service has primary energy but no thresholds, status is `cannot_classify_missing_service_thresholds`;
- if cooling is missing, status is `not_applicable`;
- if mechanical ventilation is missing, status is `not_applicable`;
- if lighting is not calculated, status is `not_calculated`;
- no service thresholds are invented.

Source placeholder:

- `src/features/energy/physics/registries/serviceEnergyClassThresholds.registry.ts`
- `src/features/energy/physics/registries/serviceEnergyClassThresholds.registry.mjs`

## 4. Real Building vs Reference Building

Classification thresholds and reference-building comparison are separate.

Global threshold classification answers:

```text
In which A+..G interval does the real building fall?
```

Reference-building comparison answers:

```text
How far is the real building from the corresponding reference building?
```

The reference building flow is expected to use:

```text
realBuilding.geometry + realBuilding.climate + realBuilding.usage
-> buildReferenceBuilding(realBuilding, referenceProfile)
-> runPhysicsSimulation(referenceBuilding)
-> referenceResult
```

Current classification model accepts:

- `referencePrimaryEnergyKwhM2Year`

and returns:

- `globalPrimaryEnergyKwhM2Year`
- `estimatedClass`
- `status`
- `warnings`

ReferenceBuildingBuilder is not implemented here.

## 5. Comparison Result

When both real and reference primary energy are available, the model returns:

- `realVsReferencePrimaryEnergyRatio`
- `realVsReferencePrimaryEnergyDeltaKwhM2Year`
- `realVsReferencePrimaryEnergyDeltaPercent`
- `distanceToNextBetterClassKwhM2Year`

If reference data is missing, comparison values are `null` and reference status is `not_calculated`.

## 6. CalculationTrace

Each classification branch returns a trace:

- global class: `ESTIMATED_ENERGY_CLASS_FROM_PRIMARY_ENERGY`
- CO2 class: `EMISSION_CLASS_FROM_CO2`
- service class: `SERVICE_ENERGY_CLASS_FROM_PRIMARY_ENERGY`

Each trace includes:

- `formulaId`
- `formulaText`
- `inputs`
- `steps`
- `assumptions`
- `warnings`
- `source`
- `sourceType`
- `confidence`

## 7. Missing Thresholds

Existing thresholds:

- global primary-energy thresholds for `residential_individual`
- global primary-energy thresholds for `residential_collective`

Missing thresholds:

- CO2 emissions class thresholds;
- service-level thresholds for heating;
- service-level thresholds for DHW;
- service-level thresholds for cooling;
- service-level thresholds for mechanical ventilation;
- service-level thresholds for lighting.

These missing values must be extracted and verified before classification can be activated.

## 8. Implementation Files

Types:

- `src/features/energy/physics/model/EnergyClassification.ts`

Calculators:

- `src/features/energy/physics/calculators/classifyEnergyPerformance.ts`
- `src/features/energy/physics/calculators/classifyEnergyPerformance.mjs`

Registries:

- `src/features/energy/physics/registries/energyClassThresholds.registry.ts`
- `src/features/energy/physics/registries/emissionClassThresholds.registry.ts`
- `src/features/energy/physics/registries/serviceEnergyClassThresholds.registry.ts`

Tests:

- `tests/physics-energy-classification-model.mjs`

## 9. Non-Goals

This model does not:

- generate an official certificate;
- invent CO2 class thresholds;
- invent service-level thresholds;
- implement ReferenceBuildingBuilder;
- modify public UI;
- change marketplace, buyer mode, lead generation, AI cards or report UX.
