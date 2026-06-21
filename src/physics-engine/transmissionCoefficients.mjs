function assertNumeric(value, name) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name} must be a numeric value`);
  }
}

function assertPositiveNumber(value, name) {
  assertNumeric(value, name);
  if (value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

function assertNonNegativeNumber(value, name) {
  assertNumeric(value, name);
  if (value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
}

function hasValue(value) {
  return value !== undefined && value !== null;
}

function sumElementTerms(elements, uKey) {
  assertArray(elements, "elements");

  return elements.reduce((sum, element, index) => {
    assertPositiveNumber(element?.[uKey], `elements[${index}].${uKey}`);
    assertPositiveNumber(element?.areaM2, `elements[${index}].areaM2`);
    return sum + element[uKey] * element.areaM2;
  }, 0);
}

function makeResult({
  value,
  unit,
  formulaId,
  formulaText,
  inputs,
  method,
  warnings = [],
  assumptions = []
}) {
  const result = {
    value,
    unit,
    formulaId,
    inputs,
    warnings,
    trace: {
      formulaId,
      formulaText,
      inputValues: inputs,
      result: value,
      unit,
      assumptions,
      warnings
    }
  };

  if (method) {
    result.method = method;
  }

  return result;
}

export function calculateDirectTransmissionWithBridges(input) {
  const {
    elements,
    linearBridges = [],
    pointBridges = []
  } = input ?? {};

  const elementContribution = sumElementTerms(elements, "uValue");
  assertArray(linearBridges, "linearBridges");
  assertArray(pointBridges, "pointBridges");

  const warnings = [];
  const assumptions = [];

  const linearBridgeContribution = linearBridges.reduce((sum, bridge, index) => {
    assertNumeric(bridge?.psi, `linearBridges[${index}].psi`);
    assertPositiveNumber(bridge?.lengthM, `linearBridges[${index}].lengthM`);

    if (bridge.psi <= 0 && !bridge.source) {
      throw new Error(`linearBridges[${index}].source is required when psi <= 0`);
    }

    return sum + bridge.psi * bridge.lengthM;
  }, 0);

  const pointBridgeContribution = pointBridges.reduce((sum, bridge, index) => {
    assertNumeric(bridge?.chi, `pointBridges[${index}].chi`);

    if (bridge.chi <= 0 && !bridge.source) {
      throw new Error(`pointBridges[${index}].source is required when chi <= 0`);
    }

    return sum + bridge.chi;
  }, 0);

  const hasBridgeTerms = linearBridges.length > 0 || pointBridges.length > 0;
  const method = hasBridgeTerms
    ? "plainUWithExplicitBridges"
    : "plainUWithoutBridgeData_lowConfidence";

  if (!hasBridgeTerms) {
    warnings.push("thermal_bridges_missing_plain_U_without_bridge_data_low_confidence");
    assumptions.push("no_explicit_thermal_bridge_terms_supplied");
  }

  const value = elementContribution + linearBridgeContribution + pointBridgeContribution;
  const inputs = { elements, linearBridges, pointBridges };

  return makeResult({
    value,
    unit: "W/K",
    formulaId: "MC001_2_11_HD_WITH_BRIDGES",
    formulaText: "Hd = sum(Uj * Aj) + sum(psiK * lk) + sum(chiJ)",
    inputs,
    method,
    warnings,
    assumptions
  });
}

export function calculateDirectTransmissionWithCorrectedU(input) {
  const { elements } = input ?? {};

  assertArray(elements, "elements");

  const warnings = [];
  elements.forEach((element, index) => {
    assertPositiveNumber(element?.uPrimeValue, `elements[${index}].uPrimeValue`);
    assertPositiveNumber(element?.areaM2, `elements[${index}].areaM2`);

    if (!element.source) {
      warnings.push("corrected_U_prime_source_missing");
    }
  });

  const value = elements.reduce(
    (sum, element) => sum + element.uPrimeValue * element.areaM2,
    0
  );
  const inputs = { elements };

  return makeResult({
    value,
    unit: "W/K",
    formulaId: "MC001_2_12_HD_CORRECTED_U",
    formulaText: "Hd = sum(UPrimeJ * Aj)",
    inputs,
    method: "correctedUPrime",
    warnings,
    assumptions: ["u_prime_includes_thermal_bridge_effects_no_psi_or_chi_added"]
  });
}

export function calculateLinearBridgePsi(input) {
  const {
    l2d,
    elements,
    lengthM,
    source
  } = input ?? {};

  assertNumeric(l2d, "l2d");
  assertPositiveNumber(lengthM, "lengthM");

  const warnings = [];
  if (!source) {
    warnings.push("linear_bridge_l2d_source_missing");
  }

  const elementContribution = sumElementTerms(elements, "uValue");
  const value = (l2d - elementContribution) / lengthM;
  const inputs = { l2d, elements, lengthM, source };

  return makeResult({
    value,
    unit: "W/(mK)",
    formulaId: "MC001_2_13_PSI_LINEAR_BRIDGE",
    formulaText: "psiJ = (L2D - sum(Uj * Aj)) / lj",
    inputs,
    warnings,
    assumptions: ["l2d_explicitly_supplied_no_bridge_catalog_default"]
  });
}

export function calculateTotalTransmissionCoefficient(input) {
  const {
    hd,
    hg,
    hu,
    ha,
    applicability = {}
  } = input ?? {};

  assertNonNegativeNumber(hd, "hd");

  const warnings = [];
  const assumptions = [];

  function resolveComponent(value, name, applicable, warning) {
    if (hasValue(value)) {
      assertNonNegativeNumber(value, name);
      return value;
    }

    if (applicable) {
      warnings.push(warning);
      return 0;
    }

    assumptions.push(`${name}_component_not_applicable_treated_as_zero`);
    return 0;
  }

  const hgValue = resolveComponent(
    hg,
    "hg",
    applicability.hgApplicable === true,
    "ground_transmission_applicable_but_missing"
  );
  const huValue = resolveComponent(
    hu,
    "hu",
    applicability.huApplicable === true,
    "unheated_space_transmission_applicable_but_missing"
  );
  const haValue = resolveComponent(
    ha,
    "ha",
    applicability.haApplicable === true,
    "adjacent_space_transmission_applicable_but_missing"
  );

  const value = hd + hgValue + huValue + haValue;
  const inputs = { hd, hg, hu, ha, applicability };

  return makeResult({
    value,
    unit: "W/K",
    formulaId: "MC001_2_15_HTR_TOTAL",
    formulaText: "Htr = Hd + Hg + Hu + Ha",
    inputs,
    warnings,
    assumptions
  });
}
