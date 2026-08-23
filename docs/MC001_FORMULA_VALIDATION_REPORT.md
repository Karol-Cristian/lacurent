# MC001 Formula Validation Report

Status: executed.

Generated at: 2026-08-23T06:44:14.199Z

This report validates only physical and energetic building calculations. It does not validate recommendations, ROI, marketplace, offers, installers or investment ranking.

---

## Summary

| Metric | Count |
| --- | ---: |
| Total tests | 50 |
| PASS | 46 |
| FAIL | 0 |
| WARNING | 0 |
| TODO_ENGINE_LAYER_MISSING | 2 |
| TODO_REFERENCE_VALUE_MISSING | 2 |

---

## Maximum Deviation

0.383%

---

## Results

| Case | Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | --- | ---: | ---: | --- | ---: |
| MC001_B_R_LAYER_BRICK_30CM | rLayer | PASS | 0.5 | 0.5 | m2K/W | 0 |
| MC001_B_R_LAYER_EPS_5CM | rLayer | PASS | 1.316 | 1.316 | m2K/W | 0 |
| MC001_C_R_TOTAL_BRICK_EPS_WALL | rBrick | PASS | 0.5 | 0.5 | m2K/W | 0 |
| MC001_C_R_TOTAL_BRICK_EPS_WALL | rEps | PASS | 1.316 | 1.316 | m2K/W | 0 |
| MC001_C_R_TOTAL_BRICK_EPS_WALL | rTotal | PASS | 1.986 | 1.986 | m2K/W | 0 |
| MC001_D_U_VALUE_BRICK_EPS_WALL | uValue | PASS | 0.504 | 0.504 | W/m2K | 0 |
| MC001_E_CORRECTED_U_SINGLE_BRIDGE | hThermalBridge | PASS | 6 | 6 | W/K | 0 |
| MC001_E_CORRECTED_U_SINGLE_BRIDGE | uCorrected | PASS | 0.579 | 0.579 | W/m2K | 0 |
| MC001_F_H_TR_TOTAL_FULL_ENVELOPE | htr | PASS | 144.67 | 144.67 | W/K | 0 |
| MC001_G_HVE_NATURAL_NO_RECOVERY | airflow | PASS | 113.4 | 113.4 | m3/h | 0 |
| MC001_G_HVE_NATURAL_NO_RECOVERY | hve | PASS | 38.56 | 38.556 | W/K | 0.01 |
| MC001_H_HEATING_DEMAND_SIMPLIFIED_ANNUAL | hTotal | PASS | 183.23 | 183.23 | W/K | 0 |
| MC001_H_HEATING_DEMAND_SIMPLIFIED_ANNUAL | heatingDemand | PASS | 14,072 | 14,072.064 | kWh/year | 0.001 |
| MC001_H_HEATING_DEMAND_SIMPLIFIED_ANNUAL | heatingDemandM2 | PASS | 217.2 | 217.162 | kWh/m2/year | 0.018 |
| MC001_I_DHW_USEFUL_ENERGY | usefulDhw | PASS | 1,527.9 | 1,527.89 | kWh/year | 0.001 |
| MC001_I_DHW_USEFUL_ENERGY | finalDhw | PASS | 2,037.2 | 2,037.187 | kWh/year | 0.001 |
| MC001_J_FINAL_ENERGY_WOOD_STOVE | finalEnergy | PASS | 25,585.5 | 25,585.455 | kWh/year | 0 |
| MC001_J_FINAL_ELECTRICITY_HEAT_PUMP_SCOP | finalElectricity | PASS | 4,020.6 | 4,020.571 | kWh/year | 0.001 |
| MC001_K_PRIMARY_ENERGY_TOTAL | primaryEnergy | PASS | 6,396.4 | 6,396.375 | kWh/year | 0 |
| MC001_K_PRIMARY_ENERGY_TOTAL | primaryEnergyM2 | PASS | 98.7 | 98.71 | kWh/m2/year | 0.01 |
| MC001_L_CO2_TOTAL | co2 | PASS | 767.6 | 767.565 | kgCO2/year | 0.005 |
| MC001_L_CO2_TOTAL | co2M2 | PASS | 11.8 | 11.845 | kgCO2/m2/year | 0.383 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | wallRTotal | PASS | 1.986 | 1.986 | m2K/W | 0.011 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | wallU | PASS | 0.504 | 0.504 | W/m2K | 0.084 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | wallHWithoutBridges | PASS | 40.32 | 40.286 | W/K | 0.084 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | thermalBridgeH | PASS | 6 | 6 | W/K | 0 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | wallCorrectedH | PASS | 46.32 | 46.286 | W/K | 0.073 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | htr | PASS | 144.67 | 144.636 | W/K | 0.023 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | hve | PASS | 38.56 | 38.556 | W/K | 0.01 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | hTotal | PASS | 183.23 | 183.192 | W/K | 0.021 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | heatingDemand | PASS | 14,072 | 14,069.164 | kWh/year | 0.02 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | heatingDemandM2 | PASS | 217.2 | 217.117 | kWh/m2/year | 0.038 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | finalHeatingEnergy | PASS | 25,586 | 25,580.299 | kWh/year | 0.022 |
| MC001_FB_OLD_HOUSE_SALICEA_1964 | finalHeatingEnergyM2 | PASS | 394.8 | 394.758 | kWh/m2/year | 0.011 |
| MC001_DIR_01_MORE_INSULATION_REDUCES_U | direction | PASS |  | 1 | - |  |
| MC001_DIR_02_LOWER_U_REDUCES_HTR | direction | PASS |  | 1 | - |  |
| MC001_DIR_03_LARGER_AREA_INCREASES_HTR | direction | PASS |  | 1 | - |  |
| MC001_DIR_04_HIGHER_ACH_INCREASES_HVE | direction | PASS |  | 1 | - |  |
| MC001_DIR_05_HEAT_RECOVERY_REDUCES_HVE | direction | PASS |  | 1 | - |  |
| MC001_DIR_06_COLDER_CLIMATE_INCREASES_QH | direction | PASS |  | 1 | - |  |
| MC001_DIR_07_SYSTEM_CHANGE_DOES_NOT_CHANGE_USEFUL_DEMAND | direction | PASS |  | 1 | - |  |
| MC001_DIR_08_BETTER_EFFICIENCY_REDUCES_FINAL_ENERGY | direction | PASS |  | 1 | - |  |
| MC001_DIR_09_HIGHER_SCOP_REDUCES_FINAL_ELECTRICITY | direction | PASS |  | 1 | - |  |
| MC001_DIR_10_PV_DOES_NOT_REDUCE_THERMAL_DEMAND | direction | PASS |  | 1 | - |  |
| MC001_DIR_11_BETTER_WINDOWS_REDUCE_WINDOW_LOSSES | direction | PASS |  | 1 | - |  |
| MC001_DIR_12_ATTIC_INSULATION_REDUCES_ROOF_LOSSES | direction | PASS |  | 1 | - |  |
| MC001_TODO_FULL_MONTHLY_HEATING_BALANCE | missing | TODO_ENGINE_LAYER_MISSING |  |  | - |  |
| MC001_TODO_THERMAL_BRIDGE_CATALOG_LOOKUP | missing | TODO_ENGINE_LAYER_MISSING |  |  | - |  |
| MC001_TODO_OFFICIAL_PRIMARY_FACTORS | missing | TODO_REFERENCE_VALUE_MISSING |  |  | - |  |
| MC001_TODO_OFFICIAL_CO2_FACTORS | missing | TODO_REFERENCE_VALUE_MISSING |  |  | - |  |

---

## Execution Steps

### MC001_B_R_LAYER_BRICK_30CM

Category: MaterialLayer

Formula/assertion:

`R_layer = d / lambda`

Steps executed:

1. Input: d = 0.3 m, lambda = 0.6 W/mK
1. Compute: R_layer = d / lambda = 0.3 / 0.6
1. Output: R_layer = 0.5 m2K/W

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| rLayer | PASS | 0.5 | 0.5 | m2K/W | 0 |

### MC001_B_R_LAYER_EPS_5CM

Category: MaterialLayer

Formula/assertion:

`R_layer = d / lambda`

Steps executed:

1. Input: d = 0.05 m, lambda = 0.038 W/mK
1. Compute: R_layer = d / lambda = 0.05 / 0.038
1. Output: R_layer = 1.316 m2K/W

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| rLayer | PASS | 1.316 | 1.316 | m2K/W | 0 |

### MC001_C_R_TOTAL_BRICK_EPS_WALL

Category: EnvelopeRTotal

Formula/assertion:

`R_total = Rsi + sum(R_layer) + Rse`

Steps executed:

1. Input: Rsi = 0.13, Rse = 0.04, layers = 2
1. Compute: R_brick = 0.3 / 0.6 = 0.5 m2K/W
1. Compute: R_eps = 0.05 / 0.038 = 1.316 m2K/W
1. Compute: R_total = Rsi + R_brick + R_eps + Rse
1. Output: R_total = 1.986 m2K/W

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| rBrick | PASS | 0.5 | 0.5 | m2K/W | 0 |
| rEps | PASS | 1.316 | 1.316 | m2K/W | 0 |
| rTotal | PASS | 1.986 | 1.986 | m2K/W | 0 |

### MC001_D_U_VALUE_BRICK_EPS_WALL

Category: UValue

Formula/assertion:

`U = 1 / R_total`

Steps executed:

1. Input: R_total = 1.9857894737 m2K/W
1. Compute: U = 1 / R_total
1. Output: U = 0.504 W/m2K

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| uValue | PASS | 0.504 | 0.504 | W/m2K | 0 |

### MC001_E_CORRECTED_U_SINGLE_BRIDGE

Category: CorrectedUValue

Formula/assertion:

`H_tb = psi x L; U_corrected = (U x A + sum(psi x L)) / A`

Steps executed:

1. Input: U = 0.504 W/m2K, A = 80 m2
1. Compute: H_tb = psi x L = 0.2 x 30
1. Output: H_tb = 6 W/K
1. Compute: U_corrected = (U x A + H_tb) / A
1. Output: U_corrected = 0.579 W/m2K

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| hThermalBridge | PASS | 6 | 6 | W/K | 0 |
| uCorrected | PASS | 0.579 | 0.579 | W/m2K | 0 |

### MC001_F_H_TR_TOTAL_FULL_ENVELOPE

Category: TransmissionHeatTransfer

Formula/assertion:

`Htr = sum(U_corrected x A)`

Steps executed:

1. Input elements: wallCorrected=46.32 W/K, roof=29.9 W/K, floor=35.75 W/K, windows=27.6 W/K, doors=5.1 W/K
1. Compute: Htr = sum(H_element)
1. Output: Htr = 144.67 W/K

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| htr | PASS | 144.67 | 144.67 | W/K | 0 |

### MC001_G_HVE_NATURAL_NO_RECOVERY

Category: VentilationHeatTransfer

Formula/assertion:

`airflow = ACH x V; Hve = 0.34 x airflow x (1 - eta)`

Steps executed:

1. Input: ACH = 0.7, V = 162 m3, heat recovery = 0
1. Compute: airflow = ACH x V
1. Output: airflow = 113.4 m3/h
1. Compute: Hve = 0.34 x airflow x (1 - heatRecoveryEfficiency)
1. Output: Hve = 38.556 W/K

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| airflow | PASS | 113.4 | 113.4 | m3/h | 0 |
| hve | PASS | 38.56 | 38.556 | W/K | 0.01 |

### MC001_H_HEATING_DEMAND_SIMPLIFIED_ANNUAL

Category: HeatingDemand

Formula/assertion:

`QH = (Htr + Hve) x HDD x 24 / 1000`

Steps executed:

1. Input: Htr = 144.67 W/K, Hve = 38.56 W/K, HDD = 3200 K.day
1. Compute: Htotal = Htr + Hve
1. Output: Htotal = 183.23 W/K
1. Compute: QH = Htotal x HDD x 24 / 1000
1. Output: QH = 14,072.064 kWh/year
1. Compute: QH_m2 = QH / heatedArea
1. Output: QH_m2 = 217.162 kWh/m2/year

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| hTotal | PASS | 183.23 | 183.23 | W/K | 0 |
| heatingDemand | PASS | 14,072 | 14,072.064 | kWh/year | 0.001 |
| heatingDemandM2 | PASS | 217.2 | 217.162 | kWh/m2/year | 0.018 |

### MC001_I_DHW_USEFUL_ENERGY

Category: DomesticHotWater

Formula/assertion:

`Q_dhw = V_liters x rho_water x c_water x deltaT / 3600`

Steps executed:

1. Input: occupants = 2, liters/person/day = 40, cold = 10 C, hot = 55 C
1. Compute: liters/year = occupants x liters/person/day x 365
1. Compute: usefulDhw = liters/year x rho_water x c_water x deltaT / 3600
1. Output: usefulDhw = 1,527.89 kWh/year
1. Compute: finalDhw = usefulDhw / systemEfficiency
1. Output: finalDhw = 2,037.187 kWh/year

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| usefulDhw | PASS | 1,527.9 | 1,527.89 | kWh/year | 0.001 |
| finalDhw | PASS | 2,037.2 | 2,037.187 | kWh/year | 0.001 |

### MC001_J_FINAL_ENERGY_WOOD_STOVE

Category: SystemEfficiency

Formula/assertion:

`FinalEnergy = UsefulDemand / SeasonalEfficiency`

Steps executed:

1. Input: usefulDemand = 14072 kWh/year, efficiency = 0.55
1. Compute: FinalEnergy = UsefulDemand / SeasonalEfficiency
1. Output: finalEnergy = 25,585.455 kWh/year

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| finalEnergy | PASS | 25,585.5 | 25,585.455 | kWh/year | 0 |

### MC001_J_FINAL_ELECTRICITY_HEAT_PUMP_SCOP

Category: SystemEfficiency

Formula/assertion:

`FinalElectricity = UsefulDemand / SCOP`

Steps executed:

1. Input: usefulDemand = 14072 kWh/year, SCOP = 3.5
1. Compute: FinalElectricity = UsefulDemand / SCOP
1. Output: finalElectricity = 4,020.571 kWh/year

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| finalElectricity | PASS | 4,020.6 | 4,020.571 | kWh/year | 0.001 |

### MC001_K_PRIMARY_ENERGY_TOTAL

Category: PrimaryEnergy

Formula/assertion:

`PrimaryEnergy = FinalEnergy x PrimaryEnergyFactor`

Steps executed:

1. Input: finalEnergy = 25585.5 kWh/year, primary factor = 0.25
1. Compute: PrimaryEnergy = FinalEnergy x PrimaryEnergyFactor
1. Output: primaryEnergy = 6,396.375 kWh/year
1. Compute: primaryEnergyM2 = primaryEnergy / heatedArea
1. Output: primaryEnergyM2 = 98.71 kWh/m2/year

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| primaryEnergy | PASS | 6,396.4 | 6,396.375 | kWh/year | 0 |
| primaryEnergyM2 | PASS | 98.7 | 98.71 | kWh/m2/year | 0.01 |

### MC001_L_CO2_TOTAL

Category: CO2

Formula/assertion:

`CO2 = FinalEnergy x CO2Factor`

Steps executed:

1. Input: finalEnergy = 25585.5 kWh/year, CO2 factor = 0.03 kgCO2/kWh
1. Compute: CO2 = FinalEnergy x CO2Factor
1. Output: CO2 = 767.565 kgCO2/year
1. Compute: CO2_m2 = CO2 / heatedArea
1. Output: CO2_m2 = 11.845 kgCO2/m2/year

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| co2 | PASS | 767.6 | 767.565 | kgCO2/year | 0.005 |
| co2M2 | PASS | 11.8 | 11.845 | kgCO2/m2/year | 0.383 |

### MC001_FB_OLD_HOUSE_SALICEA_1964

Category: FullBuilding

Formula/assertion:

`R -> U -> U' -> Htr -> Hve -> QH -> final heating energy`

Steps executed:

1. Input: old Salicea house reference case, useful area 64.8 m2, heated volume 162 m3
1. Step 1: calculate wall R_total from Rsi, brick layer, EPS layer and Rse
1. Output: wallRTotal = 1.986 m2K/W
1. Step 2: calculate wall U = 1 / R_total
1. Output: wallU = 0.504 W/m2K
1. Step 3: calculate wall H without bridges = U x wall area
1. Output: wallHWithoutBridges = 40.286 W/K
1. Step 4: calculate bridge loss H_tb = psi x L
1. Output: thermalBridgeH = 6 W/K
1. Step 5: calculate corrected wall H = wall H + thermal bridge H
1. Output: wallCorrectedH = 46.286 W/K
1. Step 6: sum all envelope H values into Htr
1. Output: Htr = 144.636 W/K
1. Step 7: calculate Hve from ACH, heated volume and heat recovery
1. Output: Hve = 38.556 W/K
1. Step 8: calculate Htotal = Htr + Hve
1. Output: Htotal = 183.192 W/K
1. Step 9: calculate heating demand QH = Htotal x HDD x 24 / 1000
1. Output: heatingDemand = 14,069.164 kWh/year
1. Step 10: convert useful heating demand to final heating energy using wood stove efficiency
1. Output: finalHeatingEnergy = 25,580.299 kWh/year

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| wallRTotal | PASS | 1.986 | 1.986 | m2K/W | 0.011 |
| wallU | PASS | 0.504 | 0.504 | W/m2K | 0.084 |
| wallHWithoutBridges | PASS | 40.32 | 40.286 | W/K | 0.084 |
| thermalBridgeH | PASS | 6 | 6 | W/K | 0 |
| wallCorrectedH | PASS | 46.32 | 46.286 | W/K | 0.073 |
| htr | PASS | 144.67 | 144.636 | W/K | 0.023 |
| hve | PASS | 38.56 | 38.556 | W/K | 0.01 |
| hTotal | PASS | 183.23 | 183.192 | W/K | 0.021 |
| heatingDemand | PASS | 14,072 | 14,069.164 | kWh/year | 0.02 |
| heatingDemandM2 | PASS | 217.2 | 217.117 | kWh/m2/year | 0.038 |
| finalHeatingEnergy | PASS | 25,586 | 25,580.299 | kWh/year | 0.022 |
| finalHeatingEnergyM2 | PASS | 394.8 | 394.758 | kWh/m2/year | 0.011 |

### MC001_DIR_01_MORE_INSULATION_REDUCES_U

Category: DirectionalPhysics

Formula/assertion:

`modified.uValue < baseline.uValue`

Steps executed:

1. Directional assertion: modified.uValue < baseline.uValue
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_02_LOWER_U_REDUCES_HTR

Category: DirectionalPhysics

Formula/assertion:

`modified.htr < baseline.htr`

Steps executed:

1. Directional assertion: modified.htr < baseline.htr
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_03_LARGER_AREA_INCREASES_HTR

Category: DirectionalPhysics

Formula/assertion:

`modified.htr > baseline.htr`

Steps executed:

1. Directional assertion: modified.htr > baseline.htr
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_04_HIGHER_ACH_INCREASES_HVE

Category: DirectionalPhysics

Formula/assertion:

`modified.hve > baseline.hve`

Steps executed:

1. Directional assertion: modified.hve > baseline.hve
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_05_HEAT_RECOVERY_REDUCES_HVE

Category: DirectionalPhysics

Formula/assertion:

`modified.hve < baseline.hve`

Steps executed:

1. Directional assertion: modified.hve < baseline.hve
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_06_COLDER_CLIMATE_INCREASES_QH

Category: DirectionalPhysics

Formula/assertion:

`modified.heatingDemand > baseline.heatingDemand`

Steps executed:

1. Directional assertion: modified.heatingDemand > baseline.heatingDemand
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_07_SYSTEM_CHANGE_DOES_NOT_CHANGE_USEFUL_DEMAND

Category: DirectionalPhysics

Formula/assertion:

`modified.usefulDemand === baseline.usefulDemand`

Steps executed:

1. Directional assertion: modified.usefulDemand === baseline.usefulDemand
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_08_BETTER_EFFICIENCY_REDUCES_FINAL_ENERGY

Category: DirectionalPhysics

Formula/assertion:

`modified.finalEnergy < baseline.finalEnergy`

Steps executed:

1. Directional assertion: modified.finalEnergy < baseline.finalEnergy
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_09_HIGHER_SCOP_REDUCES_FINAL_ELECTRICITY

Category: DirectionalPhysics

Formula/assertion:

`modified.finalElectricity < baseline.finalElectricity`

Steps executed:

1. Directional assertion: modified.finalElectricity < baseline.finalElectricity
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_10_PV_DOES_NOT_REDUCE_THERMAL_DEMAND

Category: DirectionalPhysics

Formula/assertion:

`modified.heatingDemand === baseline.heatingDemand`

Steps executed:

1. Directional assertion: modified.heatingDemand === baseline.heatingDemand
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_11_BETTER_WINDOWS_REDUCE_WINDOW_LOSSES

Category: DirectionalPhysics

Formula/assertion:

`modified.windowH < baseline.windowH`

Steps executed:

1. Directional assertion: modified.windowH < baseline.windowH
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_DIR_12_ATTIC_INSULATION_REDUCES_ROOF_LOSSES

Category: DirectionalPhysics

Formula/assertion:

`modified.roofH < baseline.roofH`

Steps executed:

1. Directional assertion: modified.roofH < baseline.roofH
1. Output: condition passed

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| direction | PASS |  | 1 | - |  |

### MC001_TODO_FULL_MONTHLY_HEATING_BALANCE

Category: HeatingDemand

Formula/assertion:

`Full MC001 monthly heating balance with official utilization factors is not implemented.`

Steps executed:

1. Skipped strict numeric validation.
1. Full MC001 monthly heating balance with official utilization factors is not implemented.

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| missing | TODO_ENGINE_LAYER_MISSING |  |  | - |  |

### MC001_TODO_THERMAL_BRIDGE_CATALOG_LOOKUP

Category: CorrectedUValue

Formula/assertion:

`Detailed MC001/C107 thermal bridge catalog lookup is not implemented.`

Steps executed:

1. Skipped strict numeric validation.
1. Detailed MC001/C107 thermal bridge catalog lookup is not implemented.

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| missing | TODO_ENGINE_LAYER_MISSING |  |  | - |  |

### MC001_TODO_OFFICIAL_PRIMARY_FACTORS

Category: PrimaryEnergy

Formula/assertion:

`Official MC001 primary energy factor table must be sourced before strict validation.`

Steps executed:

1. Skipped strict numeric validation.
1. Official MC001 primary energy factor table must be sourced before strict validation.

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| missing | TODO_REFERENCE_VALUE_MISSING |  |  | - |  |

### MC001_TODO_OFFICIAL_CO2_FACTORS

Category: CO2

Formula/assertion:

`Official CO2 factor table must be sourced before strict validation.`

Steps executed:

1. Skipped strict numeric validation.
1. Official CO2 factor table must be sourced before strict validation.

Metrics:

| Metric | Status | Expected | Actual | Unit | Deviation % |
| --- | --- | ---: | ---: | --- | ---: |
| missing | TODO_REFERENCE_VALUE_MISSING |  |  | - |  |

---

## Failures

None.

---

## Missing Engine Layers

* MC001_TODO_FULL_MONTHLY_HEATING_BALANCE: Full MC001 monthly heating balance with official utilization factors is not implemented.
* MC001_TODO_THERMAL_BRIDGE_CATALOG_LOOKUP: Detailed MC001/C107 thermal bridge catalog lookup is not implemented.

---

## Missing Reference Values

* MC001_TODO_OFFICIAL_PRIMARY_FACTORS: Official MC001 primary energy factor table must be sourced before strict validation.
* MC001_TODO_OFFICIAL_CO2_FACTORS: Official CO2 factor table must be sourced before strict validation.

---

## Formula Coverage

Covered:

* R_layer = d / lambda
* R_total = Rsi + sum(R_layer) + Rse
* U = 1 / R_total
* H_tb = psi x L
* U_corrected = (U x A + sum(psi x L)) / A
* Htr = sum(U_corrected x A)
* Hve = 0.34 x airflow x (1 - heatRecoveryEfficiency)
* QH = (Htr + Hve) x HDD x 24 / 1000
* DHW useful energy simplified formula
* FinalEnergy = UsefulDemand / SeasonalEfficiency
* FinalElectricity = UsefulDemand / SCOP
* PrimaryEnergy = FinalEnergy x PrimaryEnergyFactor
* CO2 = FinalEnergy x CO2Factor

Not fully covered:

* full MC001 monthly heat balance
* official thermal bridge catalog lookup
* official primary energy factor table
* official CO2 factor table
* detailed MC001 system loss methodology

---

## Full Building Reference Case Result

Case:

`MC001_FB_OLD_HOUSE_SALICEA_1964`

See rows with that case ID in the Results table.
