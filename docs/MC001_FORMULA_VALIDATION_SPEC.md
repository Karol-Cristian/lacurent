# MC001 Formula Validation Spec

## 1. Scope

Aceasta validare acopera doar calculul energetic fizic al cladirii.

Scopul este sa demonstram ca LaCurent Physics Engine calculeaza coerent si testabil geometria, anvelopa, transferul termic, necesarul energetic, sistemele, energia finala, energia primara si emisiile CO2.

MC001 este folosit ca referinta conceptuala si tehnica pentru structura calculului, denumiri, unitati si pasi. Unde LaCurent foloseste formule simplificate sau unde un layer MC001 nu este inca implementat complet, testul trebuie marcat explicit.

Include:

* building geometry;
* thermal envelope;
* material layers;
* thermal resistance;
* thermal transmittance;
* corrected thermal transmittance;
* thermal bridges;
* transmission heat transfer;
* ventilation heat transfer;
* heating demand;
* cooling demand, if available;
* domestic hot water demand;
* system efficiencies;
* final energy;
* primary energy;
* CO2 emissions.

Exclude:

* recommendations;
* ROI;
* investment ranking;
* user-facing decision algorithms;
* product placement;
* marketplace;
* offers;
* installers.

Validation statuses:

* `PASS`
* `FAIL`
* `WARNING`
* `TODO_ENGINE_LAYER_MISSING`
* `TODO_REFERENCE_VALUE_MISSING`

General rule:

If a MC001 formula is not implemented in LaCurent Physics Engine, mark the test as `TODO_ENGINE_LAYER_MISSING`.

If the expected reference value is missing or not yet validated from a trusted reference source, mark the test as `TODO_REFERENCE_VALUE_MISSING`.

---

## 2. Validation Categories

### A. Geometry Tests

Validates:

* useful area;
* heated area;
* heated volume;
* envelope element areas;
* orientations;
* A/V ratio;
* heated zones;
* unconditioned zones.

Required inputs:

* building type;
* useful area [m2];
* heated area [m2];
* average floor height [m];
* heated volume [m3], if explicitly provided;
* number of floors;
* envelope element areas [m2];
* orientation by element;
* thermal zones;
* unconditioned zones.

Calculation steps:

1. If heated volume is provided, use it.
2. If heated volume is missing, estimate:

```text
V = A_heated x average_floor_height
```

3. Calculate A/V if envelope area is available:

```text
A_over_V = A_envelope / V
```

4. Validate each envelope element area independently.

Expected outputs:

* `A_useful` [m2]
* `A_heated` [m2]
* `V_heated` [m3]
* `A/V` [1/m]
* element areas [m2]
* orientation by element
* zone classification

Tolerance:

* direct input values: exact match
* derived volume: 0.5% if based on provided area and height
* estimated geometry: `WARNING` unless reference geometry exists

Engine status:

* one-zone model: implemented/simplified
* multi-zone model: prepared, validate as `TODO_ENGINE_LAYER_MISSING` until full calculations use it
* detailed measured geometry: `TODO_REFERENCE_VALUE_MISSING` unless supplied

---

### B. Material Layer Tests

Validates:

```text
R_layer = d / lambda
```

Required inputs:

* layer thickness `d` [m]
* thermal conductivity `lambda` [W/mK]

Expected output:

* `R_layer` [m2K/W]

Example:

```text
d = 0.30 m
lambda = 0.60 W/mK
R = 0.30 / 0.60 = 0.50 m2K/W
```

Tolerance:

* 0.1% to 0.5%

Failure conditions:

* missing material preset;
* zero or negative thickness;
* zero or negative lambda;
* source/confidence missing from material preset.

Automated test IDs:

* `MC001_B_R_LAYER_BRICK_30CM`
* `MC001_B_R_LAYER_EPS_5CM`

---

### C. Envelope R_total Tests

Validates:

```text
R_total = Rsi + sum(R_layer) + Rse
```

Required inputs:

* internal surface resistance `Rsi` [m2K/W]
* external surface resistance `Rse` [m2K/W]
* material layers with `d` and `lambda`

Expected output:

* `R_total` [m2K/W]

Example wall:

```text
Rsi = 0.13
Rse = 0.04
brick = 0.30 m / lambda 0.60 W/mK
EPS = 0.05 m / lambda 0.038 W/mK

R_brick = 0.30 / 0.60 = 0.50
R_eps = 0.05 / 0.038 = 1.3158
R_total = 0.13 + 0.50 + 1.3158 + 0.04 = 1.9858 m2K/W
```

Tolerance:

* 0.5%

Automated test IDs:

* `MC001_C_R_TOTAL_BRICK_EPS_WALL`
* `MC001_C_R_TOTAL_LAYER_ORDER_INVARIANT_FOR_SUM`

Notes:

* Surface resistance values must come from registry/config, not from UI components.
* If surface resistance conventions differ by element type or heat flow direction and the layer is not implemented, mark affected tests as `TODO_ENGINE_LAYER_MISSING`.

---

### D. U-value Tests

Validates:

```text
U = 1 / R_total
```

Required input:

* `R_total` [m2K/W]

Expected output:

* `U` [W/m2K]

Example:

```text
R_total = 1.9858
U = 1 / 1.9858 = 0.5036 W/m2K
```

Tolerance:

* 0.5%

Automated test IDs:

* `MC001_D_U_VALUE_BRICK_EPS_WALL`
* `MC001_D_U_VALUE_REJECTS_ZERO_R`

---

### E. Corrected U-value / Thermal Bridge Tests

Validates:

```text
H_tb = psi x L
U_corrected = (U x A + sum(psi x L)) / A
```

Required inputs:

* `U` [W/m2K]
* element area `A` [m2]
* thermal bridge coefficient `psi` [W/mK]
* thermal bridge length `L` [m]

Expected outputs:

* `H_tb` [W/K]
* `U_corrected` [W/m2K]

Example:

```text
U = 0.504 W/m2K
A = 80 m2
psi = 0.20 W/mK
L = 30 m

H_tb = 0.20 x 30 = 6 W/K
U_corrected = (0.504 x 80 + 6) / 80 = 0.579 W/m2K
```

Tolerance:

* `H_tb`: 0.5%
* `U_corrected`: 0.5% to 1%

Automated test IDs:

* `MC001_E_THERMAL_BRIDGE_LINEAR_LOSS`
* `MC001_E_CORRECTED_U_SINGLE_BRIDGE`
* `MC001_E_CORRECTED_U_MULTIPLE_BRIDGES`

Missing/limited layers:

* detailed MC001 thermal bridge catalog lookup: `TODO_ENGINE_LAYER_MISSING`
* monthly or zone-specific bridge corrections: `TODO_ENGINE_LAYER_MISSING`

---

### F. Transmission Heat Transfer Tests

Validates:

```text
Htr = sum(U_corrected x A)
```

Equivalent expression:

```text
Htr = sum(H_element) + sum(H_thermal_bridges)
```

Required inputs:

* envelope elements;
* element areas [m2];
* `U` or `U_corrected` [W/m2K];
* thermal bridge `psi` and `L`, if modeled separately.

Expected outputs:

* `Htr` [W/K]
* `Htr_by_element` [W/K]
* `Htr_by_category` [W/K]

Tolerance:

* 1%

Automated test IDs:

* `MC001_F_H_ELEMENT_WALL`
* `MC001_F_H_ELEMENT_ROOF`
* `MC001_F_H_ELEMENT_WINDOW`
* `MC001_F_H_TR_TOTAL_FULL_ENVELOPE`
* `MC001_F_H_TR_BY_CATEGORY_SUMS_TO_TOTAL`

Notes:

* If unconditioned zone correction factors are used, tests must separate raw `H_element` from corrected `H_element`.
* If the MC001 unconditioned zone factor is not fully implemented, affected tests must be marked `TODO_ENGINE_LAYER_MISSING`.

---

### G. Ventilation Heat Transfer Tests

Validates simplified ventilation heat transfer:

```text
Hve = 0.34 x airflowM3PerH x (1 - heatRecoveryEfficiency)
airflowM3PerH = ACH x heatedVolumeM3
```

Required inputs:

* air change rate `ACH` [1/h];
* heated volume `V` [m3];
* heat recovery efficiency [-].

Expected outputs:

* airflow [m3/h]
* `Hve` [W/K]

Example:

```text
ACH = 0.7
V = 162 m3
heat recovery = 0

airflow = 0.7 x 162 = 113.4 m3/h
Hve = 0.34 x 113.4 x (1 - 0) = 38.56 W/K
```

Tolerance:

* 1%

Automated test IDs:

* `MC001_G_AIRFLOW_FROM_ACH`
* `MC001_G_HVE_NATURAL_NO_RECOVERY`
* `MC001_G_HVE_HEAT_RECOVERY_REDUCES_LOSS`

Missing/limited layers:

* detailed MC001 ventilation schedules and use patterns: `TODO_ENGINE_LAYER_MISSING`
* infiltration derived from airtightness tests: `TODO_REFERENCE_VALUE_MISSING` unless reference input exists

---

### H. Heating Demand Tests

Validates heating demand layer.

For the currently implemented simplified annual method:

```text
QH = (Htr + Hve) x HDD x 24 / 1000
```

Required inputs:

* `Htr` [W/K]
* `Hve` [W/K]
* `HDD` [K day]
* heated area [m2]

Expected outputs:

* `H_total` [W/K]
* `QH` [kWh/year]
* `QH_m2` [kWh/m2/year]

Example:

```text
Htr = 144.67 W/K
Hve = 38.56 W/K
HDD = 3200 K day
A_heated = 64.8 m2

Htotal = 144.67 + 38.56 = 183.23 W/K
QH = 183.23 x 3200 x 24 / 1000 = 14,071.0 kWh/year
QH_m2 = 14,071.0 / 64.8 = 217.1 kWh/m2/year
```

Tolerance:

* `H_total`: 1%
* `QH`: 1% to 2%
* `QH_m2`: 1% to 2%

Automated test IDs:

* `MC001_H_HEATING_DEMAND_SIMPLIFIED_ANNUAL`
* `MC001_H_HEATING_DEMAND_PER_M2`
* `MC001_H_ZERO_HDD_ZERO_DEMAND`

If engine uses monthly method with solar/internal gains, create separate tests for:

* monthly transmission losses;
* monthly ventilation losses;
* internal gains;
* solar gains;
* utilization factor;
* net heating demand;
* annual sum of monthly values.

Missing/limited layers:

* full MC001 monthly balance method: `TODO_ENGINE_LAYER_MISSING` until formulas and reference cases are complete
* reference monthly climate datasets: `TODO_REFERENCE_VALUE_MISSING` unless source is documented

---

### I. Domestic Hot Water Tests

Validates useful and final energy for domestic hot water.

Required inputs:

* number of occupants;
* daily hot water consumption [liters/person/day];
* cold water temperature [C];
* hot water temperature [C];
* system efficiency [-].

Expected outputs:

* useful DHW energy [kWh/year]
* final DHW energy [kWh/year]

Recommended validation formula for useful DHW energy:

```text
Q_dhw = V_liters x rho_water x c_water x deltaT / 3600
```

where:

* `rho_water` approximately 1 kg/l;
* `c_water` approximately 4.186 kJ/kgK;
* `deltaT = T_hot - T_cold`.

Tolerance:

* useful DHW: 1%
* final DHW: 1%

Automated test IDs:

* `MC001_I_DHW_USEFUL_ENERGY`
* `MC001_I_DHW_FINAL_ENERGY_WITH_EFFICIENCY`

Engine status:

* simplified DHW layer exists in systems/final energy flow.
* If detailed MC001 DHW distribution/storage losses are not implemented, mark detailed tests `TODO_ENGINE_LAYER_MISSING`.

---

### J. System Efficiency Tests

Validates conversion from useful demand to final energy.

Generic formula:

```text
FinalEnergy = UsefulDemand / SeasonalEfficiency
```

Heat pump formula:

```text
FinalElectricity = UsefulDemand / SCOP
```

Required inputs:

* useful demand [kWh/year];
* seasonal efficiency [-] or SCOP [-];
* system type;
* carrier.

Expected output:

* final energy [kWh/year]

Examples:

Wood stove:

```text
useful = 14,072 kWh/year
efficiency = 0.55
final = 14,072 / 0.55 = 25,585.5 kWh/year
```

Heat pump:

```text
useful = 14,072 kWh/year
SCOP = 3.5
final electricity = 14,072 / 3.5 = 4,020.6 kWh/year
```

Tolerance:

* 1%

Automated test IDs:

* `MC001_J_FINAL_ENERGY_WOOD_STOVE`
* `MC001_J_FINAL_ELECTRICITY_HEAT_PUMP_SCOP`
* `MC001_J_EFFICIENCY_IMPROVEMENT_REDUCES_FINAL_ENERGY`

Notes:

* Subsystem efficiencies for emission, distribution, storage, generation and control must come from registries.
* If full MC001 system loss methodology is not implemented, detailed subsystem validation should be `TODO_ENGINE_LAYER_MISSING`.

---

### K. Primary Energy Tests

Validates:

```text
PrimaryEnergy = FinalEnergy x PrimaryEnergyFactor
```

Required inputs:

* final energy by carrier [kWh/year];
* primary energy factor by carrier [-];
* heated area [m2].

Expected outputs:

* primary energy [kWh/year]
* primary energy [kWh/m2/year]
* primary energy by carrier [kWh/year]

Tolerance:

* 1%

Automated test IDs:

* `MC001_K_PRIMARY_ENERGY_BY_CARRIER`
* `MC001_K_PRIMARY_ENERGY_TOTAL`
* `MC001_K_PRIMARY_ENERGY_PER_M2`

Missing/limited layers:

* official MC001 primary energy factors by version/year: `TODO_REFERENCE_VALUE_MISSING` unless source table is documented.

---

### L. CO2 Tests

Validates:

```text
CO2 = FinalEnergy x CO2Factor
```

Required inputs:

* final energy by carrier [kWh/year];
* CO2 factor by carrier [kgCO2/kWh];
* heated area [m2].

Expected outputs:

* kgCO2/year
* kgCO2/m2/year
* CO2 by carrier [kgCO2/year]

Tolerance:

* 1%

Automated test IDs:

* `MC001_L_CO2_BY_CARRIER`
* `MC001_L_CO2_TOTAL`
* `MC001_L_CO2_PER_M2`

Missing/limited layers:

* official factor tables: `TODO_REFERENCE_VALUE_MISSING` unless source table is documented.

---

## 3. Directional Physics Tests

Directional tests validate physical sense, not exact values.

These tests must not check recommendations, ROI or investment ranking.

Required directional tests:

1. More insulation reduces `U`.
2. Lower `U` reduces `Htr`.
3. Larger area increases `Htr`, if `U` is constant.
4. Higher `ACH` increases `Hve`.
5. Heat recovery reduces `Hve`.
6. Colder climate increases heating demand.
7. Changing heating system does not change useful building heating demand.
8. Better system efficiency reduces final energy.
9. Higher SCOP reduces final electricity.
10. PV does not reduce building thermal demand.
11. Better windows reduce window heat transfer.
12. Attic/roof insulation reduces roof or upper ceiling heat transfer.

Required outputs:

* baseline metric;
* modified metric;
* direction assertion;
* validation status.

Example format:

```ts
{
  id: "MC001_DIR_01_MORE_INSULATION_REDUCES_U",
  category: "DirectionalPhysics",
  baseline: { insulationM: 0.05, uValue: 0.5036 },
  modified: { insulationM: 0.10, uValue: 0.313 },
  assertion: "modified.uValue < baseline.uValue",
  status: "PASS"
}
```

---

## 4. Full Building Reference Case

Case ID:

`MC001_FB_OLD_HOUSE_SALICEA_1964`

Purpose:

Validate a complete simplified physical chain:

```text
Geometry
-> R
-> U
-> U'
-> Htr
-> Hve
-> QH
-> final heating energy
-> indicators per m2
```

Input:

Building:

* single-family house;
* location: Salicea / Cluj;
* construction year: 1964;
* useful area: 64.8 m2;
* heated volume: 162 m3.

Envelope:

Walls:

* area: 80 m2;
* brick 30 cm, lambda = 0.60 W/mK;
* EPS 5 cm, lambda = 0.038 W/mK;
* Rsi = 0.13 m2K/W;
* Rse = 0.04 m2K/W;
* thermal bridge psi = 0.20 W/mK;
* thermal bridge length = 30 m.

Roof / ceiling:

* area: 65 m2;
* U = 0.46 W/m2K.

Floor:

* area: 65 m2;
* U = 0.55 W/m2K.

Windows:

* area: 12 m2;
* U = 2.3 W/m2K.

Doors:

* area: 3 m2;
* U = 1.7 W/m2K.

Ventilation:

* ACH = 0.7;
* heat recovery = 0.

Climate:

* HDD = 3200 K day.

Heating system:

* wood stove;
* seasonal efficiency = 0.55.

Expected intermediate values:

| Metric | Expected | Unit | Tolerance |
| --- | ---: | --- | ---: |
| Wall R_total | 1.986 | m2K/W | 0.5% |
| Wall U | 0.504 | W/m2K | 0.5% |
| Wall H without bridges | 40.32 | W/K | 1% |
| Thermal bridge H | 6.00 | W/K | 0.5% |
| Wall corrected H | 46.32 | W/K | 1% |
| Roof H | 29.90 | W/K | 1% |
| Floor H | 35.75 | W/K | 1% |
| Window H | 27.60 | W/K | 1% |
| Door H | 5.10 | W/K | 1% |
| Htr | 144.67 | W/K | 1% |
| Hve | 38.56 | W/K | 1% |
| Htotal | 183.23 | W/K | 1% |
| Heating demand | 14,072 | kWh/year | 2% to 5% |
| Heating demand per m2 | 217.2 | kWh/m2/year | 2% to 5% |
| Final heating energy | 25,586 | kWh/year | 2% to 5% |
| Final heating energy per m2 | 394.8 | kWh/m2/year | 2% to 5% |

Formula chain:

```text
R_brick = 0.30 / 0.60 = 0.50
R_eps = 0.05 / 0.038 = 1.3158
R_total = 0.13 + 0.50 + 1.3158 + 0.04 = 1.9858
U_wall = 1 / 1.9858 = 0.5036
H_wall = 0.5036 x 80 = 40.29 W/K
H_tb = 0.20 x 30 = 6.00 W/K
H_wall_corrected = 40.29 + 6.00 = 46.29 W/K
Htr = H_wall_corrected + H_roof + H_floor + H_windows + H_doors
Hve = 0.34 x 0.7 x 162 = 38.56 W/K
QH = (Htr + Hve) x 3200 x 24 / 1000
FinalHeating = QH / 0.55
```

Note:

The reference case uses a simplified annual heating demand equation. If the engine uses monthly heat balance with solar/internal gains, this case should validate gross losses separately from net monthly demand.

---

## 5. Test Infrastructure

Create these files later:

```text
src/features/energy/physics/validation/types.ts
src/features/energy/physics/validation/mc001FormulaValidationCases.ts
src/features/energy/physics/validation/runMc001FormulaValidation.ts
src/features/energy/physics/__tests__/mc001FormulaValidation.test.ts
```

Required types:

```ts
export type ValidationStatus =
  | "PASS"
  | "FAIL"
  | "WARNING"
  | "TODO_ENGINE_LAYER_MISSING"
  | "TODO_REFERENCE_VALUE_MISSING";

export type ValidationCategory =
  | "Geometry"
  | "MaterialLayer"
  | "EnvelopeRTotal"
  | "UValue"
  | "CorrectedUValue"
  | "TransmissionHeatTransfer"
  | "VentilationHeatTransfer"
  | "HeatingDemand"
  | "CoolingDemand"
  | "DomesticHotWater"
  | "SystemEfficiency"
  | "FinalEnergy"
  | "PrimaryEnergy"
  | "CO2"
  | "DirectionalPhysics"
  | "FullBuilding";

export type ValidationSource =
  | "mc001"
  | "internal_reference"
  | "engine_output"
  | "estimated_reference";

export interface ExpectedMetric {
  key: string;
  expectedValue?: number;
  unit: string;
  tolerancePercent?: number;
  statusWhenMissing?: "TODO_ENGINE_LAYER_MISSING" | "TODO_REFERENCE_VALUE_MISSING";
}

export interface FormulaValidationCase {
  id: string;
  category: ValidationCategory;
  description: string;
  source: ValidationSource;
  formula: string;
  inputs: Record<string, unknown>;
  expected: ExpectedMetric[];
  excludedScopes: string[];
}

export interface ValidationResult {
  caseId: string;
  metricKey: string;
  status: ValidationStatus;
  expectedValue?: number;
  actualValue?: number;
  unit: string;
  deviationPercent?: number;
  message?: string;
}
```

Required runner behavior:

1. Load validation cases.
2. Run only physics/energy calculators.
3. Compare actual values to expected values.
4. Apply tolerance per metric.
5. Mark missing engine layers as `TODO_ENGINE_LAYER_MISSING`.
6. Mark missing expected values as `TODO_REFERENCE_VALUE_MISSING`.
7. Produce machine-readable JSON result and human-readable Markdown report.

The validation runner must not import recommendation, ROI, marketplace, provider or offer modules.

---

## 6. Reporting

Create validation report:

```text
docs/MC001_FORMULA_VALIDATION_REPORT.md
```

Report must include:

* total number of tests;
* passed tests;
* failed tests;
* tests with missing engine layer;
* tests with missing reference value;
* maximum deviation;
* formulas covered;
* formulas not covered yet;
* date of validation run;
* engine version or commit identifier;
* source assumptions.

Recommended report structure:

```md
# MC001 Formula Validation Report

## Summary

| Metric | Count |
| --- | ---: |
| Total tests |  |
| PASS |  |
| FAIL |  |
| WARNING |  |
| TODO_ENGINE_LAYER_MISSING |  |
| TODO_REFERENCE_VALUE_MISSING |  |

## Coverage

## Failures

## Missing Engine Layers

## Missing Reference Values

## Maximum Deviations

## Full Building Reference Case Result
```

---

## 7. Missing Formula / Layer Register

This register must be updated as the engine evolves.

| Layer | Current validation status | Notes |
| --- | --- | --- |
| Basic geometry | `WARNING` | Implemented with estimates; exact measured geometry requires reference input. |
| Material layer R | `PASS_READY` | Ready for exact formula tests. |
| R_total | `PASS_READY` | Requires Rsi/Rse registry values. |
| U-value | `PASS_READY` | Exact formula. |
| Corrected U-value | `PASS_READY` | Simplified linear thermal bridge correction. |
| Thermal bridge catalog lookup | `TODO_ENGINE_LAYER_MISSING` | Needs MC001/C107 reference tables. |
| Unconditioned zone correction | `WARNING` | Simplified layer exists; detailed monthly validation pending. |
| Transmission heat transfer | `PASS_READY` | Exact sum validation possible. |
| Ventilation heat transfer | `PASS_READY` | Simplified ACH/airflow formula. |
| Monthly MC001 heating demand | `TODO_ENGINE_LAYER_MISSING` | Engine has simplified/monthly approximations, not full MC001 method. |
| Cooling demand | `WARNING` | Simplified layer; reference values needed. |
| DHW useful energy | `WARNING` | Simplified layer exists; detailed MC001 losses pending. |
| Heating system final energy | `PASS_READY` | Efficiency/SCOP formula ready. |
| Detailed MC001 system losses | `TODO_ENGINE_LAYER_MISSING` | Needs official subsystem method validation. |
| Primary energy | `WARNING` | Formula ready; official factors need reference source. |
| CO2 | `WARNING` | Formula ready; official factors need reference source. |
| Energy classes | `TODO_REFERENCE_VALUE_MISSING` | Thresholds must be sourced before strict MC001 validation. |

---

## 8. Automated Test Plan

Create exact formula tests:

* `MC001_B_R_LAYER_BRICK_30CM`
* `MC001_B_R_LAYER_EPS_5CM`
* `MC001_C_R_TOTAL_BRICK_EPS_WALL`
* `MC001_D_U_VALUE_BRICK_EPS_WALL`
* `MC001_E_THERMAL_BRIDGE_LINEAR_LOSS`
* `MC001_E_CORRECTED_U_SINGLE_BRIDGE`
* `MC001_F_H_TR_TOTAL_FULL_ENVELOPE`
* `MC001_G_HVE_NATURAL_NO_RECOVERY`
* `MC001_H_HEATING_DEMAND_SIMPLIFIED_ANNUAL`
* `MC001_I_DHW_USEFUL_ENERGY`
* `MC001_J_FINAL_ENERGY_WOOD_STOVE`
* `MC001_J_FINAL_ELECTRICITY_HEAT_PUMP_SCOP`
* `MC001_K_PRIMARY_ENERGY_TOTAL`
* `MC001_L_CO2_TOTAL`
* `MC001_FB_OLD_HOUSE_SALICEA_1964`

Create directional tests:

* `MC001_DIR_01_MORE_INSULATION_REDUCES_U`
* `MC001_DIR_02_LOWER_U_REDUCES_HTR`
* `MC001_DIR_03_LARGER_AREA_INCREASES_HTR`
* `MC001_DIR_04_HIGHER_ACH_INCREASES_HVE`
* `MC001_DIR_05_HEAT_RECOVERY_REDUCES_HVE`
* `MC001_DIR_06_COLDER_CLIMATE_INCREASES_QH`
* `MC001_DIR_07_SYSTEM_CHANGE_DOES_NOT_CHANGE_USEFUL_DEMAND`
* `MC001_DIR_08_BETTER_EFFICIENCY_REDUCES_FINAL_ENERGY`
* `MC001_DIR_09_HIGHER_SCOP_REDUCES_FINAL_ELECTRICITY`
* `MC001_DIR_10_PV_DOES_NOT_REDUCE_THERMAL_DEMAND`
* `MC001_DIR_11_BETTER_WINDOWS_REDUCE_WINDOW_LOSSES`
* `MC001_DIR_12_ATTIC_INSULATION_REDUCES_ROOF_LOSSES`

---

## 9. Acceptance Criteria

The validation specification is accepted if:

1. It tests only physical and energetic building modeling.
2. It does not include recommendations or investment algorithms.
3. It uses MC001 terminology for technical layers.
4. It includes inputs, calculation steps and expected outputs.
5. It includes units for each result.
6. It includes tolerances.
7. It includes exact tests.
8. It includes directional tests.
9. It includes at least one full building reference case.
10. It clearly marks missing engine layers.

Explicit non-goals:

* no recommendation validation;
* no ROI validation;
* no product or partner validation;
* no marketplace validation;
* no installer validation;
* no "what should I buy" validation.
