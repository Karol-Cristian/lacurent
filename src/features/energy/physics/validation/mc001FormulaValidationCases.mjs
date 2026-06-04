export const validationStatuses = {
  PASS: "PASS",
  FAIL: "FAIL",
  WARNING: "WARNING",
  TODO_ENGINE_LAYER_MISSING: "TODO_ENGINE_LAYER_MISSING",
  TODO_REFERENCE_VALUE_MISSING: "TODO_REFERENCE_VALUE_MISSING"
};

export const validationCategories = {
  GEOMETRY: "Geometry",
  MATERIAL_LAYER: "MaterialLayer",
  ENVELOPE_R_TOTAL: "EnvelopeRTotal",
  U_VALUE: "UValue",
  CORRECTED_U_VALUE: "CorrectedUValue",
  TRANSMISSION_HEAT_TRANSFER: "TransmissionHeatTransfer",
  VENTILATION_HEAT_TRANSFER: "VentilationHeatTransfer",
  HEATING_DEMAND: "HeatingDemand",
  COOLING_DEMAND: "CoolingDemand",
  DOMESTIC_HOT_WATER: "DomesticHotWater",
  SYSTEM_EFFICIENCY: "SystemEfficiency",
  PRIMARY_ENERGY: "PrimaryEnergy",
  CO2: "CO2",
  DIRECTIONAL_PHYSICS: "DirectionalPhysics",
  FULL_BUILDING: "FullBuilding"
};

export const mc001FormulaValidationCases = [
  {
    id: "MC001_B_R_LAYER_BRICK_30CM",
    category: validationCategories.MATERIAL_LAYER,
    formula: "R_layer = d / lambda",
    inputs: { thicknessM: 0.3, lambdaWmK: 0.6 },
    expected: [{ key: "rLayer", expectedValue: 0.5, unit: "m2K/W", tolerancePercent: 0.5 }]
  },
  {
    id: "MC001_B_R_LAYER_EPS_5CM",
    category: validationCategories.MATERIAL_LAYER,
    formula: "R_layer = d / lambda",
    inputs: { thicknessM: 0.05, lambdaWmK: 0.038 },
    expected: [{ key: "rLayer", expectedValue: 1.3157894737, unit: "m2K/W", tolerancePercent: 0.5 }]
  },
  {
    id: "MC001_C_R_TOTAL_BRICK_EPS_WALL",
    category: validationCategories.ENVELOPE_R_TOTAL,
    formula: "R_total = Rsi + sum(R_layer) + Rse",
    inputs: {
      rsi: 0.13,
      rse: 0.04,
      layers: [
        { thicknessM: 0.3, lambdaWmK: 0.6 },
        { thicknessM: 0.05, lambdaWmK: 0.038 }
      ]
    },
    expected: [
      { key: "rBrick", expectedValue: 0.5, unit: "m2K/W", tolerancePercent: 0.5 },
      { key: "rEps", expectedValue: 1.3157894737, unit: "m2K/W", tolerancePercent: 0.5 },
      { key: "rTotal", expectedValue: 1.9857894737, unit: "m2K/W", tolerancePercent: 0.5 }
    ]
  },
  {
    id: "MC001_D_U_VALUE_BRICK_EPS_WALL",
    category: validationCategories.U_VALUE,
    formula: "U = 1 / R_total",
    inputs: { rTotal: 1.9857894737 },
    expected: [{ key: "uValue", expectedValue: 0.503577, unit: "W/m2K", tolerancePercent: 0.5 }]
  },
  {
    id: "MC001_E_CORRECTED_U_SINGLE_BRIDGE",
    category: validationCategories.CORRECTED_U_VALUE,
    formula: "H_tb = psi x L; U_corrected = (U x A + sum(psi x L)) / A",
    inputs: { uValue: 0.504, areaM2: 80, bridges: [{ psiWmK: 0.2, lengthM: 30 }] },
    expected: [
      { key: "hThermalBridge", expectedValue: 6, unit: "W/K", tolerancePercent: 0.5 },
      { key: "uCorrected", expectedValue: 0.579, unit: "W/m2K", tolerancePercent: 1 }
    ]
  },
  {
    id: "MC001_F_H_TR_TOTAL_FULL_ENVELOPE",
    category: validationCategories.TRANSMISSION_HEAT_TRANSFER,
    formula: "Htr = sum(U_corrected x A)",
    inputs: {
      elements: [
        { key: "wallCorrected", hWk: 46.32 },
        { key: "roof", hWk: 29.9 },
        { key: "floor", hWk: 35.75 },
        { key: "windows", hWk: 27.6 },
        { key: "doors", hWk: 5.1 }
      ]
    },
    expected: [{ key: "htr", expectedValue: 144.67, unit: "W/K", tolerancePercent: 1 }]
  },
  {
    id: "MC001_G_HVE_NATURAL_NO_RECOVERY",
    category: validationCategories.VENTILATION_HEAT_TRANSFER,
    formula: "airflow = ACH x V; Hve = 0.34 x airflow x (1 - eta)",
    inputs: { ach: 0.7, heatedVolumeM3: 162, heatRecoveryEfficiency: 0 },
    expected: [
      { key: "airflow", expectedValue: 113.4, unit: "m3/h", tolerancePercent: 1 },
      { key: "hve", expectedValue: 38.56, unit: "W/K", tolerancePercent: 1 }
    ]
  },
  {
    id: "MC001_H_HEATING_DEMAND_SIMPLIFIED_ANNUAL",
    category: validationCategories.HEATING_DEMAND,
    formula: "QH = (Htr + Hve) x HDD x 24 / 1000",
    inputs: { htr: 144.67, hve: 38.56, hdd: 3200, heatedAreaM2: 64.8 },
    expected: [
      { key: "hTotal", expectedValue: 183.23, unit: "W/K", tolerancePercent: 1 },
      { key: "heatingDemand", expectedValue: 14072, unit: "kWh/year", tolerancePercent: 2 },
      { key: "heatingDemandM2", expectedValue: 217.2, unit: "kWh/m2/year", tolerancePercent: 2 }
    ]
  },
  {
    id: "MC001_I_DHW_USEFUL_ENERGY",
    category: validationCategories.DOMESTIC_HOT_WATER,
    formula: "Q_dhw = V_liters x rho_water x c_water x deltaT / 3600",
    inputs: { occupants: 2, litersPerPersonDay: 40, coldWaterC: 10, hotWaterC: 55, systemEfficiency: 0.75 },
    expected: [
      { key: "usefulDhw", expectedValue: 1527.9, unit: "kWh/year", tolerancePercent: 1 },
      { key: "finalDhw", expectedValue: 2037.2, unit: "kWh/year", tolerancePercent: 1 }
    ]
  },
  {
    id: "MC001_J_FINAL_ENERGY_WOOD_STOVE",
    category: validationCategories.SYSTEM_EFFICIENCY,
    formula: "FinalEnergy = UsefulDemand / SeasonalEfficiency",
    inputs: { usefulDemandKwhYear: 14072, seasonalEfficiency: 0.55 },
    expected: [{ key: "finalEnergy", expectedValue: 25585.5, unit: "kWh/year", tolerancePercent: 1 }]
  },
  {
    id: "MC001_J_FINAL_ELECTRICITY_HEAT_PUMP_SCOP",
    category: validationCategories.SYSTEM_EFFICIENCY,
    formula: "FinalElectricity = UsefulDemand / SCOP",
    inputs: { usefulDemandKwhYear: 14072, scop: 3.5 },
    expected: [{ key: "finalElectricity", expectedValue: 4020.6, unit: "kWh/year", tolerancePercent: 1 }]
  },
  {
    id: "MC001_K_PRIMARY_ENERGY_TOTAL",
    category: validationCategories.PRIMARY_ENERGY,
    formula: "PrimaryEnergy = FinalEnergy x PrimaryEnergyFactor",
    inputs: { finalEnergyKwhYear: 25585.5, primaryEnergyFactor: 0.25, heatedAreaM2: 64.8 },
    expected: [
      { key: "primaryEnergy", expectedValue: 6396.4, unit: "kWh/year", tolerancePercent: 1 },
      { key: "primaryEnergyM2", expectedValue: 98.7, unit: "kWh/m2/year", tolerancePercent: 1 }
    ]
  },
  {
    id: "MC001_L_CO2_TOTAL",
    category: validationCategories.CO2,
    formula: "CO2 = FinalEnergy x CO2Factor",
    inputs: { finalEnergyKwhYear: 25585.5, co2FactorKgKwh: 0.03, heatedAreaM2: 64.8 },
    expected: [
      { key: "co2", expectedValue: 767.6, unit: "kgCO2/year", tolerancePercent: 1 },
      { key: "co2M2", expectedValue: 11.8, unit: "kgCO2/m2/year", tolerancePercent: 1 }
    ]
  },
  {
    id: "MC001_FB_OLD_HOUSE_SALICEA_1964",
    category: validationCategories.FULL_BUILDING,
    formula: "R -> U -> U' -> Htr -> Hve -> QH -> final heating energy",
    inputs: {
      building: { usefulAreaM2: 64.8, heatedVolumeM3: 162 },
      wall: {
        areaM2: 80,
        rsi: 0.13,
        rse: 0.04,
        layers: [
          { thicknessM: 0.3, lambdaWmK: 0.6 },
          { thicknessM: 0.05, lambdaWmK: 0.038 }
        ],
        bridges: [{ psiWmK: 0.2, lengthM: 30 }]
      },
      envelopeH: { roof: 29.9, floor: 35.75, windows: 27.6, doors: 5.1 },
      ventilation: { ach: 0.7, heatRecoveryEfficiency: 0 },
      climate: { hdd: 3200 },
      heatingSystem: { seasonalEfficiency: 0.55 }
    },
    expected: [
      { key: "wallRTotal", expectedValue: 1.986, unit: "m2K/W", tolerancePercent: 0.5 },
      { key: "wallU", expectedValue: 0.504, unit: "W/m2K", tolerancePercent: 0.5 },
      { key: "wallHWithoutBridges", expectedValue: 40.32, unit: "W/K", tolerancePercent: 1 },
      { key: "thermalBridgeH", expectedValue: 6, unit: "W/K", tolerancePercent: 0.5 },
      { key: "wallCorrectedH", expectedValue: 46.32, unit: "W/K", tolerancePercent: 1 },
      { key: "htr", expectedValue: 144.67, unit: "W/K", tolerancePercent: 1 },
      { key: "hve", expectedValue: 38.56, unit: "W/K", tolerancePercent: 1 },
      { key: "hTotal", expectedValue: 183.23, unit: "W/K", tolerancePercent: 1 },
      { key: "heatingDemand", expectedValue: 14072, unit: "kWh/year", tolerancePercent: 5 },
      { key: "heatingDemandM2", expectedValue: 217.2, unit: "kWh/m2/year", tolerancePercent: 5 },
      { key: "finalHeatingEnergy", expectedValue: 25586, unit: "kWh/year", tolerancePercent: 5 },
      { key: "finalHeatingEnergyM2", expectedValue: 394.8, unit: "kWh/m2/year", tolerancePercent: 5 }
    ]
  }
];

export const directionalValidationCases = [
  { id: "MC001_DIR_01_MORE_INSULATION_REDUCES_U", assertion: "modified.uValue < baseline.uValue" },
  { id: "MC001_DIR_02_LOWER_U_REDUCES_HTR", assertion: "modified.htr < baseline.htr" },
  { id: "MC001_DIR_03_LARGER_AREA_INCREASES_HTR", assertion: "modified.htr > baseline.htr" },
  { id: "MC001_DIR_04_HIGHER_ACH_INCREASES_HVE", assertion: "modified.hve > baseline.hve" },
  { id: "MC001_DIR_05_HEAT_RECOVERY_REDUCES_HVE", assertion: "modified.hve < baseline.hve" },
  { id: "MC001_DIR_06_COLDER_CLIMATE_INCREASES_QH", assertion: "modified.heatingDemand > baseline.heatingDemand" },
  { id: "MC001_DIR_07_SYSTEM_CHANGE_DOES_NOT_CHANGE_USEFUL_DEMAND", assertion: "modified.usefulDemand === baseline.usefulDemand" },
  { id: "MC001_DIR_08_BETTER_EFFICIENCY_REDUCES_FINAL_ENERGY", assertion: "modified.finalEnergy < baseline.finalEnergy" },
  { id: "MC001_DIR_09_HIGHER_SCOP_REDUCES_FINAL_ELECTRICITY", assertion: "modified.finalElectricity < baseline.finalElectricity" },
  { id: "MC001_DIR_10_PV_DOES_NOT_REDUCE_THERMAL_DEMAND", assertion: "modified.heatingDemand === baseline.heatingDemand" },
  { id: "MC001_DIR_11_BETTER_WINDOWS_REDUCE_WINDOW_LOSSES", assertion: "modified.windowH < baseline.windowH" },
  { id: "MC001_DIR_12_ATTIC_INSULATION_REDUCES_ROOF_LOSSES", assertion: "modified.roofH < baseline.roofH" }
];

export const missingLayerCases = [
  {
    id: "MC001_TODO_FULL_MONTHLY_HEATING_BALANCE",
    category: validationCategories.HEATING_DEMAND,
    status: validationStatuses.TODO_ENGINE_LAYER_MISSING,
    reason: "Full MC001 monthly heating balance with official utilization factors is not implemented."
  },
  {
    id: "MC001_TODO_THERMAL_BRIDGE_CATALOG_LOOKUP",
    category: validationCategories.CORRECTED_U_VALUE,
    status: validationStatuses.TODO_ENGINE_LAYER_MISSING,
    reason: "Detailed MC001/C107 thermal bridge catalog lookup is not implemented."
  },
  {
    id: "MC001_TODO_OFFICIAL_PRIMARY_FACTORS",
    category: validationCategories.PRIMARY_ENERGY,
    status: validationStatuses.TODO_REFERENCE_VALUE_MISSING,
    reason: "Official MC001 primary energy factor table must be sourced before strict validation."
  },
  {
    id: "MC001_TODO_OFFICIAL_CO2_FACTORS",
    category: validationCategories.CO2,
    status: validationStatuses.TODO_REFERENCE_VALUE_MISSING,
    reason: "Official CO2 factor table must be sourced before strict validation."
  }
];
