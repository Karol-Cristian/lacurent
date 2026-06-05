export const FORMULA_REGISTRY = {
  R_LAYER: {
    id: "R_LAYER",
    name: "Layer thermal resistance",
    expression: "R_layer = d / lambda",
    inputs: ["d", "lambda"],
    output: "R_layer",
    unit: "m2K/W",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  R_TOTAL: {
    id: "R_TOTAL",
    name: "Total element thermal resistance",
    expression: "R_total = Rsi + sum(R_layer) + Rse",
    inputs: ["Rsi", "R_layer[]", "Rse"],
    output: "R_total",
    unit: "m2K/W",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  U_VALUE: {
    id: "U_VALUE",
    name: "Thermal transmittance",
    expression: "U = 1 / R_total",
    inputs: ["R_total"],
    output: "U",
    unit: "W/m2K",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  H_THERMAL_BRIDGES: {
    id: "H_THERMAL_BRIDGES",
    name: "Thermal bridge heat transfer coefficient",
    expression: "H_tb = sum(psi x length)",
    inputs: ["psi[]", "length[]"],
    output: "H_tb",
    unit: "W/K",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  U_CORRECTED: {
    id: "U_CORRECTED",
    name: "Corrected thermal transmittance",
    expression: "U_corrected = (U x A + H_thermal_bridges) / A",
    inputs: ["U", "A", "H_thermal_bridges"],
    output: "U_corrected",
    unit: "W/m2K",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  H_ELEMENT: {
    id: "H_ELEMENT",
    name: "Element heat transfer coefficient",
    expression: "H_element = U_corrected x A",
    inputs: ["U_corrected", "A"],
    output: "H_element",
    unit: "W/K",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  H_TR: {
    id: "H_TR",
    name: "Transmission heat transfer coefficient",
    expression: "Htr = sum(H_elements_corrected)",
    inputs: ["H_element[]"],
    output: "Htr",
    unit: "W/K",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  AIRFLOW: {
    id: "AIRFLOW",
    name: "Ventilation airflow from air change rate",
    expression: "airflowM3h = ACH x heatedVolumeM3",
    inputs: ["ACH", "heatedVolumeM3"],
    output: "airflowM3h",
    unit: "m3/h",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  H_VE: {
    id: "H_VE",
    name: "Ventilation heat transfer coefficient",
    expression: "Hve = 0.34 x airflowM3h x (1 - heatRecoveryEfficiency)",
    inputs: ["airflowM3h", "heatRecoveryEfficiency"],
    output: "Hve",
    unit: "W/K",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  QH_ND: {
    id: "QH_ND",
    name: "Simplified annual useful heating demand",
    expression: "QH,nd = (Htr + Hve) x HDD x 24 / 1000",
    inputs: ["Htr", "Hve", "HDD"],
    output: "QH,nd",
    unit: "kWh/year",
    source: "mc001_conceptual",
    status: "implemented_simplified"
  },
  FINAL_HEATING_EFFICIENCY: {
    id: "FINAL_HEATING_EFFICIENCY",
    name: "Final heating energy from seasonal efficiency",
    expression: "heatingFinalEnergy = usefulHeatingDemand / seasonalEfficiency",
    inputs: ["usefulHeatingDemand", "seasonalEfficiency"],
    output: "heatingFinalEnergy",
    unit: "kWh/year",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  FINAL_HEATING_HEAT_PUMP: {
    id: "FINAL_HEATING_HEAT_PUMP",
    name: "Final electricity for heat pump",
    expression: "electricity = usefulHeatingDemand / SCOP",
    inputs: ["usefulHeatingDemand", "SCOP"],
    output: "electricity",
    unit: "kWh/year",
    source: "mc001_conceptual",
    status: "implemented_traceable"
  },
  PRIMARY_ENERGY: {
    id: "PRIMARY_ENERGY",
    name: "Primary energy",
    expression: "primaryEnergy = finalEnergy x primaryEnergyFactor",
    inputs: ["finalEnergy", "primaryEnergyFactor"],
    output: "primaryEnergy",
    unit: "kWh/year",
    source: "mc001_conceptual",
    status: "needs_official_validation"
  },
  CO2: {
    id: "CO2",
    name: "CO2 emissions",
    expression: "co2 = finalEnergy x co2Factor",
    inputs: ["finalEnergy", "co2Factor"],
    output: "co2",
    unit: "kgCO2/year",
    source: "mc001_conceptual",
    status: "needs_official_validation"
  },
  ESTIMATED_CLASS: {
    id: "ESTIMATED_CLASS",
    name: "Estimated energy class",
    expression: "estimatedClass = threshold(primaryEnergyKwhM2Year, buildingEnergyClassType)",
    inputs: ["primaryEnergyKwhM2Year", "buildingEnergyClassType", "estimatedEnergyClassThresholdSet"],
    output: "estimatedClass",
    unit: "class",
    source: "estimated_threshold_registry",
    status: "implemented_traceable"
  },
  ESTIMATED_ENERGY_CLASS_FROM_PRIMARY_ENERGY: {
    id: "ESTIMATED_ENERGY_CLASS_FROM_PRIMARY_ENERGY",
    name: "Estimated energy class from primary energy",
    expression: "estimatedClass = threshold(primaryEnergyKwhM2Year, buildingEnergyClassType)",
    inputs: ["primaryEnergyKwhM2Year", "buildingEnergyClassType", "estimatedEnergyClassThresholdSet"],
    output: "estimatedClass",
    unit: "class",
    source: "estimated_threshold_registry",
    status: "implemented_traceable"
  }
};
