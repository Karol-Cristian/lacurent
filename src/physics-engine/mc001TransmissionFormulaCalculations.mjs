const BLOCKING = "blocking";
const WARNING = "warning";
const EXPLICIT_SOURCE = "explicit_user_input";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeCode(value, maxLength = 96) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[a-zA-Z0-9_.:-]+$/.test(value);
}

function sourceIsExplicit(source) {
  return isPlainObject(source) &&
    source.sourceType === EXPLICIT_SOURCE &&
    safeCode(source.reference, 96);
}

function blocker(code) {
  return { code, severity: BLOCKING };
}

function warning(code) {
  return { code, severity: WARNING };
}

function blocked(formulaCode, relationCode, code) {
  return {
    status: "blocked",
    formulaCode,
    relationCode,
    blockers: [blocker(code)]
  };
}

function valueAmount(value, unit) {
  return isPlainObject(value) && value.unit === unit ? finiteNumber(value.amount) : null;
}

function resultValue(symbol, amount, unit) {
  return { symbol, amount, unit };
}

export function calculateMc001DirectTransmissionCoefficient(input = {}) {
  const formulaCode = "MC001_2_12_HD_DIRECT_TRANSMISSION";
  const relationCode = "2.12";
  if (!isPlainObject(input) || !Array.isArray(input.elements) || input.elements.length === 0) {
    return blocked(formulaCode, relationCode, "blocked_missing_direct_transmission_elements");
  }

  const terms = [];
  let total = 0;
  for (const [index, element] of input.elements.entries()) {
    if (!isPlainObject(element) || !safeCode(element.elementId || `element_${index + 1}`)) {
      return blocked(formulaCode, relationCode, "blocked_invalid_direct_transmission_element");
    }
    const area = valueAmount(element.area, "m2");
    const correctedU = valueAmount(element.correctedThermalTransmittance, "W/(m2*K)");
    if (area === null || area <= 0 || correctedU === null || correctedU <= 0) {
      return blocked(formulaCode, relationCode, "blocked_invalid_direct_transmission_value");
    }
    if (!sourceIsExplicit(element.source)) {
      return blocked(formulaCode, relationCode, "blocked_missing_explicit_source");
    }
    const amount = area * correctedU;
    total += amount;
    terms.push({
      elementId: element.elementId,
      label: typeof element.label === "string" ? element.label : null,
      area: { amount: area, unit: "m2" },
      correctedThermalTransmittance: { amount: correctedU, unit: "W/(m2*K)" },
      termValue: { amount, unit: "W/K" }
    });
  }

  return {
    status: "ready",
    formulaCode,
    relationCode,
    result: resultValue("H_d", total, "W/K"),
    terms,
    blockers: []
  };
}

export function calculateMc001LinearThermalBridgePsi(input = {}) {
  const formulaCode = "MC001_2_13_LINEAR_THERMAL_BRIDGE_PSI";
  const relationCode = "2.13";
  if (!isPlainObject(input)) {
    return blocked(formulaCode, relationCode, "blocked_invalid_psi_input");
  }
  const length = valueAmount(input.length, "m");
  const l2d = valueAmount(input.l2d, "W/K");
  if (length === null || length <= 0 || l2d === null || l2d < 0) {
    return blocked(formulaCode, relationCode, "blocked_invalid_psi_boundary_values");
  }
  if (!Array.isArray(input.referenceElements) || input.referenceElements.length === 0) {
    return blocked(formulaCode, relationCode, "blocked_missing_psi_reference_elements");
  }
  if (!sourceIsExplicit(input.source)) {
    return blocked(formulaCode, relationCode, "blocked_missing_explicit_source");
  }

  const referenceTerms = [];
  let referenceSum = 0;
  for (const [index, element] of input.referenceElements.entries()) {
    if (!isPlainObject(element) || !safeCode(element.elementId || `reference_${index + 1}`)) {
      return blocked(formulaCode, relationCode, "blocked_invalid_psi_reference_element");
    }
    const area = valueAmount(element.area, "m2");
    const u = valueAmount(element.thermalTransmittance, "W/(m2*K)");
    if (area === null || area <= 0 || u === null || u <= 0) {
      return blocked(formulaCode, relationCode, "blocked_invalid_psi_reference_value");
    }
    const termValue = area * u;
    referenceSum += termValue;
    referenceTerms.push({
      elementId: element.elementId,
      area: { amount: area, unit: "m2" },
      thermalTransmittance: { amount: u, unit: "W/(m2*K)" },
      termValue: { amount: termValue, unit: "W/K" }
    });
  }

  const psi = (l2d - referenceSum) / length;
  const warnings = psi < 0 ? [warning("negative_psi_requires_expert_review")] : [];
  return {
    status: "ready",
    formulaCode,
    relationCode,
    result: resultValue("psi_j", psi, "W/(m*K)"),
    terms: [
      {
        bridgeId: safeCode(input.bridgeId || "") ? input.bridgeId : null,
        length: { amount: length, unit: "m" },
        l2d: { amount: l2d, unit: "W/K" },
        referenceElementSum: { amount: referenceSum, unit: "W/K" },
        referenceTerms
      }
    ],
    warnings,
    blockers: []
  };
}

export function calculateMc001ThermalBridgeGlobalCoefficient(input = {}) {
  const formulaCode = "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT";
  const relationCode = "2.28";
  if (!isPlainObject(input) || !Array.isArray(input.bridges)) {
    return blocked(formulaCode, relationCode, "blocked_missing_thermal_bridge_inputs");
  }
  if (input.bridges.length === 0 && input.noThermalBridges !== true) {
    return blocked(formulaCode, relationCode, "blocked_missing_thermal_bridge_inputs");
  }

  const terms = [];
  let total = 0;
  for (const [index, bridge] of input.bridges.entries()) {
    if (!isPlainObject(bridge) || !safeCode(bridge.bridgeId || `bridge_${index + 1}`)) {
      return blocked(formulaCode, relationCode, "blocked_invalid_thermal_bridge");
    }
    if (Object.prototype.hasOwnProperty.call(bridge, "chi")) {
      return blocked(formulaCode, relationCode, "blocked_point_bridge_chi_not_in_c1");
    }
    const length = valueAmount(bridge.length, "m");
    const psi = valueAmount(bridge.psi, "W/(m*K)");
    if (length === null || length < 0 || psi === null) {
      return blocked(formulaCode, relationCode, "blocked_invalid_thermal_bridge_value");
    }
    if (!sourceIsExplicit(bridge.source)) {
      return blocked(formulaCode, relationCode, "blocked_missing_explicit_source");
    }
    const amount = length * psi;
    total += amount;
    terms.push({
      bridgeId: bridge.bridgeId,
      label: typeof bridge.label === "string" ? bridge.label : null,
      length: { amount: length, unit: "m" },
      psi: { amount: psi, unit: "W/(m*K)" },
      termValue: { amount, unit: "W/K" }
    });
  }

  return {
    status: "ready",
    formulaCode,
    relationCode,
    result: resultValue("H_tr;tb;zt", total, "W/K"),
    terms,
    blockers: []
  };
}

export function calculateMc001GlobalTransmissionExcludingGround(input = {}) {
  const formulaCode = "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND";
  const relationCode = "2.27";
  if (!isPlainObject(input) || !Array.isArray(input.elementTransmissionCoefficients)) {
    return blocked(formulaCode, relationCode, "blocked_missing_excluding_ground_inputs");
  }
  const bridgeAmount = valueAmount(input.thermalBridgeCoefficient, "W/K");
  if (bridgeAmount === null || bridgeAmount < 0 || !sourceIsExplicit(input.thermalBridgeCoefficient?.source)) {
    return blocked(formulaCode, relationCode, "blocked_invalid_excluding_ground_bridge_value");
  }

  const terms = [];
  let total = 0;
  for (const [index, element] of input.elementTransmissionCoefficients.entries()) {
    if (!isPlainObject(element) || !safeCode(element.elementId || `element_${index + 1}`)) {
      return blocked(formulaCode, relationCode, "blocked_invalid_excluding_ground_element");
    }
    const amount = finiteNumber(element.amount);
    if (amount === null || amount < 0 || element.unit !== "W/K" || !sourceIsExplicit(element.source)) {
      return blocked(formulaCode, relationCode, "blocked_invalid_excluding_ground_value");
    }
    total += amount;
    terms.push({
      elementId: element.elementId,
      contributionType: "element_transmission_coefficient",
      amount,
      unit: "W/K"
    });
  }
  total += bridgeAmount;
  terms.push({
    contributionType: "thermal_bridge_global_coefficient",
    amount: bridgeAmount,
    unit: "W/K"
  });

  return {
    status: "ready",
    formulaCode,
    relationCode,
    result: resultValue("H_H/C;tr(excl.gf);ztc;m", total, "W/K"),
    terms,
    blockers: []
  };
}

export function calculateMc001TransmissionHeatFlow(input = {}) {
  const formulaCode = "MC001_2_14_TRANSMISSION_HEAT_FLOW";
  const relationCode = "2.14";
  const htr = valueAmount(input?.htr, "W/K");
  const indoor = valueAmount(input?.indoorTemperature, "degC");
  const outdoor = valueAmount(input?.outdoorTemperature, "degC");
  if (htr === null || htr < 0 || indoor === null || outdoor === null) {
    return blocked(formulaCode, relationCode, "blocked_invalid_transmission_heat_flow_input");
  }
  const amount = htr * (indoor - outdoor);
  return {
    status: "ready",
    formulaCode,
    relationCode,
    result: resultValue("Phi_tr", amount, "W"),
    signConvention: "positive_from_interior_to_exterior",
    warnings: amount < 0 ? [warning("negative_transmission_heat_flow_adds_heat_to_zone")] : [],
    blockers: []
  };
}

export function calculateMc001TransmissionEnergyFromHeatFlow(input = {}) {
  const formulaCode = "MC001_2_14_TRANSMISSION_HEAT_FLOW_TIME_INTEGRATED_EXPLICIT";
  const relationCode = "2.14";
  const htr = valueAmount(input?.htr, "W/K");
  const indoor = valueAmount(input?.indoorTemperature, "degC");
  const outdoor = valueAmount(input?.outdoorTemperature, "degC");
  const duration = valueAmount(input?.duration, "h");
  if (htr === null || htr < 0 || indoor === null || outdoor === null || duration === null || duration <= 0) {
    return blocked(formulaCode, relationCode, "blocked_invalid_transmission_energy_input");
  }
  const amount = (htr * (indoor - outdoor) * duration) / 1000;
  return {
    status: "ready",
    formulaCode,
    relationCode,
    result: resultValue("Q_tr_explicit", amount, "kWh"),
    scope: "transmission_heat_flow_time_integration_only_not_QHnd",
    signConvention: "positive_from_interior_to_exterior",
    warnings: amount < 0 ? [warning("negative_transmission_energy_adds_heat_to_zone")] : [],
    blockers: []
  };
}

export function calculateMc001TransmissionTotalCoefficient(input = {}) {
  const formulaCode = "MC001_2_15_HTR_TOTAL_TRANSMISSION";
  const relationCode = "2.15";
  const components = [
    ["H_d", input?.hd],
    ["H_g", input?.hg],
    ["H_u", input?.hu],
    ["H_a", input?.ha]
  ];
  const terms = [];
  let total = 0;
  for (const [symbol, value] of components) {
    const amount = valueAmount(value, "W/K");
    if (amount === null || amount < 0) {
      return blocked(formulaCode, relationCode, "blocked_invalid_htr_total_component");
    }
    total += amount;
    terms.push({ symbol, amount, unit: "W/K" });
  }
  return {
    status: "ready",
    formulaCode,
    relationCode,
    result: resultValue("H_tr", total, "W/K"),
    terms,
    blockers: []
  };
}
