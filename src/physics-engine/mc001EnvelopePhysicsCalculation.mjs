import { findMaterialCorrectionCoefficientById } from "./datasets/mc001Table2_2MaterialCorrectionCoefficients.mjs";

const ASSEMBLY_MODE = "envelope_assembly_u_value_explicit_v1";
const TRANSMISSION_MODE = "envelope_transmission_coefficient_explicit_v1";
const ASSEMBLY_SCOPE = "envelope_assembly_u_value_explicit_input_only_not_certificate";
const TRANSMISSION_SCOPE = "envelope_transmission_coefficient_explicit_input_only_not_certificate";
const ASSEMBLY_FORMULA_REFERENCES = [
  "MC001_R15_MATERIALS_AND_THERMAL_RESISTANCE_SOURCE_PACK",
  "MC001_R15_RELATION_2_3_LAMBDA_CORRECTION",
  "MC001_TABLE_2_2_MATERIAL_CORRECTION_COEFFICIENTS",
  "MC001_R15_RELATION_2_6_TOTAL_THERMAL_RESISTANCE",
  "MC001_R16_RELATION_2_7_THERMAL_TRANSMITTANCE"
];
const TRANSMISSION_FORMULA_REFERENCES = [
  "MC001_R17_RELATION_2_11_DIRECT_TRANSMISSION_WITH_BRIDGES",
  "MC001_R17_RELATION_2_12_DIRECT_TRANSMISSION_WITH_CORRECTED_U",
  "MC001_R17_RELATION_2_15_TOTAL_TRANSMISSION_COEFFICIENT",
  "MC001_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_R18_BOUNDARY_CORRECTIONS_EXPLICIT_SOURCE_PACK"
];
const ASSEMBLY_LIMITS = [
  "explicit_material_lambda_only",
  "explicit_layer_thickness_only",
  "explicit_surface_resistance_or_coefficient_only",
  "no_hidden_defaults",
  "no_default_material_lambda",
  "no_default_surface_resistances",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate"
];
const TRANSMISSION_LIMITS = [
  "explicit_envelope_geometry_only",
  "explicit_u_values_or_assembly_results_only",
  "explicit_boundary_corrections_only",
  "explicit_thermal_bridge_terms_only",
  "no_hidden_defaults",
  "no_default_ground_factor",
  "no_default_unheated_space_factor",
  "no_default_adjacent_space_factor",
  "not_QHnd",
  "not_QCnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate"
];
const ALLOWED_ASSEMBLY_TYPES = new Set([
  "wall",
  "roof",
  "ceiling",
  "floor",
  "slab",
  "door",
  "window"
]);
const BOUNDARY_COMPONENTS = Object.freeze({
  outside_air: "Hd",
  ground: "Hg",
  unheated_space: "Hu",
  unheated_attic: "Hu",
  unheated_basement: "Hu",
  adjacent_space: "Ha",
  adjacent_heated_space: "Ha",
  adjacent_unheated_space: "Ha"
});
const BZTU_CORRECTION_BOUNDARY_TYPES = new Set([
  "unheated_space",
  "unheated_attic",
  "unheated_basement",
  "adjacent_unheated_space"
]);
const COMPONENT_KEYS = ["Hd", "Hg", "Hu", "Ha"];
const ALLOWED_SOURCE_TYPES = new Set([
  "explicit_user_input",
  "explicit_calculated_input",
  "mc001_registry_source_pack",
  "mc001_table_2_2"
]);
const FORBIDDEN_ASSEMBLY_KEYS = new Set([
  "assemblyResults",
  "caseResults",
  "summary",
  "result",
  "uValue",
  "totalResistance",
  "htr",
  "qHnd",
  "qCnd"
]);
const FORBIDDEN_TRANSMISSION_KEYS = new Set([
  "elementResults",
  "assemblyResults",
  "thermalBridgeResults",
  "caseResults",
  "summary",
  "result",
  "htr",
  "qHht",
  "qCht",
  "qHnd",
  "qCnd"
]);

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

function hasInputValue(value, key) {
  return isPlainObject(value) && value[key] !== undefined && value[key] !== null;
}

function sourceIsAllowed(source) {
  return isPlainObject(source) &&
    ALLOWED_SOURCE_TYPES.has(source.sourceType) &&
    safeCode(source.reference, 128);
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function warning(code) {
  return { code, severity: "warning" };
}

function blocked(scope, formulaReferences, limits, code) {
  return {
    status: "blocked",
    scope,
    formulaReferences: [...formulaReferences],
    assemblyResults: [],
    elementResults: [],
    thermalBridgeResults: [],
    result: null,
    summary: {
      assemblyCount: 0,
      elementCount: 0
    },
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...limits]
    }
  };
}

function hasForbiddenDerivedInput(value, forbiddenKeys) {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(item => hasForbiddenDerivedInput(item, forbiddenKeys));
  }
  if (!isPlainObject(value)) {
    return true;
  }
  return Object.entries(value).some(([key, child]) => {
    if (forbiddenKeys.has(key)) {
      return true;
    }
    return hasForbiddenDerivedInput(child, forbiddenKeys);
  });
}

function unitAmount(value, unit) {
  if (!isPlainObject(value) || value.unit !== unit) {
    return null;
  }
  return finiteNumber(value.amount);
}

function positiveUnitAmount(value, unit, code) {
  const amount = unitAmount(value, unit);
  if (amount === null || amount <= 0) {
    return { ok: false, code };
  }
  if (!sourceIsAllowed(value.source)) {
    return { ok: false, code: "missing_explicit_envelope_source" };
  }
  return { ok: true, amount };
}

function nonNegativeUnitAmount(value, unit, code) {
  const amount = unitAmount(value, unit);
  if (amount === null || amount < 0) {
    return { ok: false, code };
  }
  if (!sourceIsAllowed(value.source)) {
    return { ok: false, code: "missing_explicit_envelope_source" };
  }
  return { ok: true, amount };
}

function resolveSurfaceResistance(assembly) {
  const hasResistance = isPlainObject(assembly.surfaceResistances);
  const hasCoefficient = isPlainObject(assembly.surfaceCoefficients);
  if (hasResistance && hasCoefficient) {
    return { ok: false, code: "ambiguous_surface_resistance_source" };
  }
  if (!hasResistance && !hasCoefficient) {
    return { ok: false, code: "missing_explicit_surface_resistances" };
  }

  if (hasResistance) {
    const rsi = nonNegativeUnitAmount(
      assembly.surfaceResistances.rsi,
      "m2*K/W",
      "invalid_explicit_surface_resistance"
    );
    if (!rsi.ok) return rsi;
    const rse = nonNegativeUnitAmount(
      assembly.surfaceResistances.rse,
      "m2*K/W",
      "invalid_explicit_surface_resistance"
    );
    if (!rse.ok) return rse;
    return {
      ok: true,
      rsi: rsi.amount,
      rse: rse.amount,
      origin: "explicit_surface_resistances"
    };
  }

  const hi = positiveUnitAmount(
    assembly.surfaceCoefficients.hi,
    "W/(m2*K)",
    "invalid_explicit_surface_coefficient"
  );
  if (!hi.ok) return hi;
  const he = positiveUnitAmount(
    assembly.surfaceCoefficients.he,
    "W/(m2*K)",
    "invalid_explicit_surface_coefficient"
  );
  if (!he.ok) return he;
  return {
    ok: true,
    rsi: 1 / hi.amount,
    rse: 1 / he.amount,
    origin: "calculated_from_explicit_surface_coefficients"
  };
}

function resolveLayer(layer, index) {
  if (!isPlainObject(layer) || !safeCode(layer.layerId || `layer_${index + 1}`)) {
    return { ok: false, code: "invalid_envelope_layer" };
  }
  const thickness = positiveUnitAmount(
    layer.thickness,
    "m",
    "invalid_explicit_layer_thickness"
  );
  if (!thickness.ok) return thickness;

  if (!isPlainObject(layer.material) || !safeCode(layer.material.materialId, 96)) {
    return { ok: false, code: "invalid_explicit_material" };
  }

  const hasDirectLambda = isPlainObject(layer.material.lambda);
  const hasNormativeLambda = isPlainObject(layer.material.lambdaNormat);
  if (hasDirectLambda && hasNormativeLambda) {
    return { ok: false, code: "ambiguous_material_lambda_source" };
  }
  if (!hasDirectLambda && !hasNormativeLambda) {
    return { ok: false, code: "missing_explicit_material_lambda" };
  }

  let lambda;
  let lambdaNormat = null;
  let correctionCoefficientA = null;
  let correctionCoefficientCode = null;
  let correctionCoefficientSource = null;
  let correctionCoefficientMetadata = null;
  let lambdaOrigin = "explicit_material_lambda";
  let lambdaFormulaCode = "EXPLICIT_MATERIAL_LAMBDA";
  if (hasDirectLambda) {
    const directLambda = positiveUnitAmount(
      layer.material.lambda,
      "W/(m*K)",
      "invalid_explicit_material_lambda"
    );
    if (!directLambda.ok) return directLambda;
    lambda = directLambda.amount;
  } else {
    const normLambda = positiveUnitAmount(
      layer.material.lambdaNormat,
      "W/(m*K)",
      "invalid_explicit_material_lambda"
    );
    if (!normLambda.ok) return normLambda;
    const hasExplicitCoefficient = isPlainObject(layer.material.correctionCoefficientA);
    const hasTableCoefficientCode = hasInputValue(layer.material, "correctionCoefficientCode");
    if (hasExplicitCoefficient && hasTableCoefficientCode) {
      return { ok: false, code: "ambiguous_material_correction_coefficient_source" };
    }
    if (!hasExplicitCoefficient && !hasTableCoefficientCode) {
      return { ok: false, code: "missing_explicit_material_correction_coefficient" };
    }
    lambdaNormat = normLambda.amount;
    if (hasTableCoefficientCode) {
      if (!safeCode(layer.material.correctionCoefficientCode, 128)) {
        return { ok: false, code: "invalid_table_2_2_material_correction_coefficient_code" };
      }
      const tableEntry = findMaterialCorrectionCoefficientById(
        layer.material.correctionCoefficientCode
      );
      if (tableEntry === null) {
        return { ok: false, code: "unknown_table_2_2_material_correction_coefficient_code" };
      }
      correctionCoefficientA = tableEntry.correctionCoefficientA;
      correctionCoefficientCode = tableEntry.id;
      correctionCoefficientSource = "MC001-2022 Tabel 2.2";
      correctionCoefficientMetadata = {
        materialCategoryRo: tableEntry.materialCategoryRo,
        conditionRo: tableEntry.conditionRo,
        ...(tableEntry.ageConditionRo ? { ageConditionRo: tableEntry.ageConditionRo } : {}),
        ...(tableEntry.applicabilityRo ? { applicabilityRo: tableEntry.applicabilityRo } : {})
      };
    } else {
      const coefficient = positiveUnitAmount(
        layer.material.correctionCoefficientA,
        "dimensionless",
        "missing_explicit_material_correction_coefficient"
      );
      if (!coefficient.ok) return coefficient;
      correctionCoefficientA = coefficient.amount;
      correctionCoefficientSource = layer.material.correctionCoefficientA.source.reference;
    }
    lambda = lambdaNormat * correctionCoefficientA;
    lambdaOrigin = "calculated_from_MC001_relation_2_3_explicit_coefficient";
    lambdaFormulaCode = "MC001_2_3_LAMBDA_CORRECTION";
  }

  const resistance = thickness.amount / lambda;
  return {
    ok: true,
    value: {
      layerId: layer.layerId,
      materialId: layer.material.materialId,
      materialName: typeof layer.material.name === "string" ? layer.material.name : null,
      thicknessM: thickness.amount,
      lambdaWmK: lambda,
      ...(lambdaNormat === null ? {} : { lambdaNormatWmK: lambdaNormat }),
      ...(correctionCoefficientA === null ? {} : { correctionCoefficientA }),
      ...(correctionCoefficientCode === null ||
        correctionCoefficientCode === undefined
        ? {}
        : { correctionCoefficientCode }),
      ...(correctionCoefficientSource === null ||
        correctionCoefficientSource === undefined
        ? {}
        : { correctionCoefficientSource }),
      ...(correctionCoefficientMetadata === null ||
        correctionCoefficientMetadata === undefined
        ? {}
        : { correctionCoefficientMetadata }),
      lambdaOrigin,
      lambdaFormulaCode,
      resistanceM2KPerW: resistance,
      resistanceFormulaCode: "MC001_LAYER_RESISTANCE_THICKNESS_OVER_LAMBDA"
    }
  };
}

function resolveAssemblyUValue(assembly) {
  const hasLayers = Array.isArray(assembly.layers);
  const hasDirectU = isPlainObject(assembly.directUValue);
  const hasCorrectedU = isPlainObject(assembly.correctedUPrime);
  const methodCount = [hasLayers, hasDirectU, hasCorrectedU].filter(Boolean).length;
  if (methodCount !== 1) {
    return { ok: false, code: "ambiguous_or_missing_assembly_u_value_source" };
  }

  if (hasDirectU || hasCorrectedU) {
    const uSource = hasDirectU ? assembly.directUValue : assembly.correctedUPrime;
    const uValue = positiveUnitAmount(
      uSource,
      "W/(m2*K)",
      "invalid_explicit_assembly_u_value"
    );
    if (!uValue.ok) return uValue;
    return {
      ok: true,
      value: {
        uValue: uValue.amount,
        uValueOrigin: hasDirectU ? "explicit_direct_u_value" : "explicit_corrected_u_prime",
        totalResistance: 1 / uValue.amount,
        surfaceResistanceOrigin: null,
        layers: [],
        airLayers: [],
        formulaCode: hasDirectU
          ? "EXPLICIT_ASSEMBLY_U_VALUE"
          : "MC001_2_12_CORRECTED_U_PRIME_INPUT"
      }
    };
  }

  if (assembly.layers.length === 0) {
    return { ok: false, code: "missing_envelope_layers" };
  }
  const surface = resolveSurfaceResistance(assembly);
  if (!surface.ok) return surface;

  const layers = [];
  let layersResistance = 0;
  for (const [index, layer] of assembly.layers.entries()) {
    const result = resolveLayer(layer, index);
    if (!result.ok) return result;
    layers.push(result.value);
    layersResistance += result.value.resistanceM2KPerW;
  }

  const airLayers = [];
  let airResistance = 0;
  for (const [index, airLayer] of (assembly.airLayers ?? []).entries()) {
    if (!isPlainObject(airLayer) || !safeCode(airLayer.airLayerId || `air_${index + 1}`)) {
      return { ok: false, code: "invalid_explicit_air_layer" };
    }
    const resistance = nonNegativeUnitAmount(
      airLayer.resistance,
      "m2*K/W",
      "invalid_explicit_air_layer_resistance"
    );
    if (!resistance.ok) return resistance;
    airResistance += resistance.amount;
    airLayers.push({
      airLayerId: airLayer.airLayerId,
      resistanceM2KPerW: resistance.amount,
      origin: "explicit_air_layer_resistance"
    });
  }

  const totalResistance = surface.rsi + layersResistance + airResistance + surface.rse;
  if (!Number.isFinite(totalResistance) || totalResistance <= 0) {
    return { ok: false, code: "invalid_calculated_total_thermal_resistance" };
  }
  return {
    ok: true,
    value: {
      uValue: 1 / totalResistance,
      uValueOrigin: "calculated_from_explicit_layers_and_surfaces",
      totalResistance,
      rsi: surface.rsi,
      rse: surface.rse,
      surfaceResistanceOrigin: surface.origin,
      layers,
      airLayers,
      formulaCode: "MC001_2_7_U_VALUE_FROM_RELATION_2_6_RESISTANCE"
    }
  };
}

function normalizeAssemblyResult(assembly) {
  if (!isPlainObject(assembly)) {
    return { ok: false, code: "invalid_envelope_assembly" };
  }
  if (!safeCode(assembly.assemblyId, 96)) {
    return { ok: false, code: "invalid_envelope_assembly_id" };
  }
  if (!ALLOWED_ASSEMBLY_TYPES.has(assembly.assemblyType)) {
    return { ok: false, code: "invalid_envelope_assembly_type" };
  }
  if (!sourceIsAllowed(assembly.source)) {
    return { ok: false, code: "missing_explicit_envelope_source" };
  }
  const resolved = resolveAssemblyUValue(assembly);
  if (!resolved.ok) return resolved;

  return {
    ok: true,
    value: {
      assemblyId: assembly.assemblyId,
      assemblyType: assembly.assemblyType,
      scope: ASSEMBLY_SCOPE,
      uValue: resolved.value.uValue,
      uValueUnit: "W/(m2*K)",
      uValueOrigin: resolved.value.uValueOrigin,
      totalResistance: resolved.value.totalResistance,
      totalResistanceUnit: "m2*K/W",
      ...(resolved.value.rsi === undefined ? {} : { rsi: resolved.value.rsi }),
      ...(resolved.value.rse === undefined ? {} : { rse: resolved.value.rse }),
      ...(resolved.value.surfaceResistanceOrigin === null
        ? {}
        : { surfaceResistanceOrigin: resolved.value.surfaceResistanceOrigin }),
      layers: resolved.value.layers,
      airLayers: resolved.value.airLayers,
      formulaCode: resolved.value.formulaCode,
      sourceReference: assembly.source.reference,
      diagnostics: {
        warnings: resolved.value.uValueOrigin === "calculated_from_explicit_layers_and_surfaces"
          ? [warning("plain_U_not_corrected_for_thermal_bridges")]
          : []
      }
    }
  };
}

function componentFromBoundary(boundaryType) {
  return BOUNDARY_COMPONENTS[boundaryType] || null;
}

function resolveElementUValue(element) {
  const hasAssemblyResult = isPlainObject(element.assemblyResult);
  const hasExplicitU = isPlainObject(element.uValue);
  if (hasAssemblyResult && hasExplicitU) {
    return { ok: false, code: "ambiguous_envelope_element_u_value_source" };
  }
  if (!hasAssemblyResult && !hasExplicitU) {
    return { ok: false, code: "missing_envelope_element_u_value_source" };
  }

  if (hasExplicitU) {
    const uValue = positiveUnitAmount(
      element.uValue,
      "W/(m2*K)",
      "invalid_explicit_envelope_element_u_value"
    );
    if (!uValue.ok) return uValue;
    return {
      ok: true,
      value: {
        uValue: uValue.amount,
        uValueOrigin: "explicit_element_u_value",
        assemblyId: null,
        assemblyType: null
      }
    };
  }

  const assembly = element.assemblyResult;
  const uValue = finiteNumber(assembly.uValue);
  if (
    assembly.scope !== ASSEMBLY_SCOPE ||
    !safeCode(assembly.assemblyId, 96) ||
    !ALLOWED_ASSEMBLY_TYPES.has(assembly.assemblyType) ||
    uValue === null ||
    uValue <= 0 ||
    assembly.uValueUnit !== "W/(m2*K)"
  ) {
    return { ok: false, code: "invalid_envelope_assembly_result_for_element" };
  }
  return {
    ok: true,
    value: {
      uValue,
      uValueOrigin: assembly.uValueOrigin,
      assemblyId: assembly.assemblyId,
      assemblyType: assembly.assemblyType
    }
  };
}

function boundaryFactor(element, component) {
  const hasDirectFactor = isPlainObject(element.boundaryCorrectionFactor);
  const hasDerivedFactor = isPlainObject(element.boundaryCorrection);
  if (component === "Hd") {
    if (hasDirectFactor || hasDerivedFactor) {
      return { ok: false, code: "ambiguous_outside_air_boundary_correction" };
    }
    return { ok: true, value: 1, origin: "direct_exterior_boundary_factor_one" };
  }

  if (hasDirectFactor && hasDerivedFactor) {
    return { ok: false, code: "ambiguous_boundary_correction_source" };
  }
  if (hasDerivedFactor) {
    const correction = element.boundaryCorrection;
    if (!BZTU_CORRECTION_BOUNDARY_TYPES.has(element.boundaryType)) {
      return { ok: false, code: "unsupported_bztu_boundary_correction_context" };
    }
    if (correction.mode !== "bztu_explicit_heat_transfer_ratio_v1") {
      return { ok: false, code: "unsupported_boundary_correction_mode" };
    }
    const exterior = nonNegativeUnitAmount(
      correction.heatTransferToExterior,
      "W/K",
      "invalid_explicit_bztu_exterior_heat_transfer"
    );
    if (!exterior.ok) return exterior;
    const total = positiveUnitAmount(
      correction.totalHeatTransfer,
      "W/K",
      "invalid_explicit_bztu_total_heat_transfer"
    );
    if (!total.ok) return total;
    if (exterior.amount > total.amount) {
      return { ok: false, code: "invalid_explicit_bztu_heat_transfer_ratio" };
    }
    return {
      ok: true,
      value: exterior.amount / total.amount,
      origin: "calculated_from_MC001_2_22_explicit_bztu_heat_transfer_ratio",
      formulaCode: "MC001_2_22_BZTU_CORRECTION_FACTOR",
      sourceScope: "bztu_explicit_heat_transfer_ratio_v1"
    };
  }

  const factor = nonNegativeUnitAmount(
    element.boundaryCorrectionFactor,
    "dimensionless",
    "missing_explicit_boundary_correction_factor"
  );
  if (!factor.ok) return factor;
  return {
    ok: true,
    value: factor.amount,
    origin: `explicit_${component}_boundary_correction_factor`,
    formulaCode: "EXPLICIT_BOUNDARY_CORRECTION_FACTOR"
  };
}

function normalizeElement(element, index) {
  if (!isPlainObject(element) || !safeCode(element.elementId || `element_${index + 1}`)) {
    return { ok: false, code: "invalid_envelope_element" };
  }
  const component = componentFromBoundary(element.boundaryType);
  if (component === null) {
    return { ok: false, code: "unsupported_envelope_boundary_type" };
  }
  if (!sourceIsAllowed(element.source)) {
    return { ok: false, code: "missing_explicit_envelope_source" };
  }
  const area = positiveUnitAmount(element.area, "m2", "invalid_explicit_envelope_area");
  if (!area.ok) return area;
  const uValue = resolveElementUValue(element);
  if (!uValue.ok) return uValue;
  const factor = boundaryFactor(element, component);
  if (!factor.ok) return factor;

  const contribution = area.amount * uValue.value.uValue * factor.value;
  return {
    ok: true,
    value: {
      elementId: element.elementId,
      elementType: typeof element.elementType === "string" ? element.elementType : null,
      boundaryType: element.boundaryType,
      component,
      area: area.amount,
      uValue: uValue.value.uValue,
      uValueOrigin: uValue.value.uValueOrigin,
      ...(uValue.value.assemblyId === null ? {} : { assemblyId: uValue.value.assemblyId }),
      ...(uValue.value.assemblyType === null ? {} : { assemblyType: uValue.value.assemblyType }),
      boundaryCorrectionFactor: factor.value,
      boundaryCorrectionOrigin: factor.origin,
      ...(factor.formulaCode === undefined ? {} : { boundaryCorrectionFormulaCode: factor.formulaCode }),
      ...(factor.sourceScope === undefined ? {} : { boundaryCorrectionSourceScope: factor.sourceScope }),
      contributionWK: contribution,
      contributionFormulaCode: component === "Hd"
        ? "MC001_2_11_DIRECT_ELEMENT_TRANSMISSION"
        : "MC001_R18_BOUNDARY_CORRECTED_ELEMENT_TRANSMISSION"
    }
  };
}

function normalizeBridge(bridge, index, kind) {
  if (!isPlainObject(bridge) || !safeCode(bridge.bridgeId || `${kind}_${index + 1}`)) {
    return { ok: false, code: "invalid_explicit_thermal_bridge" };
  }
  const component = COMPONENT_KEYS.includes(bridge.component) ? bridge.component : null;
  if (component === null) {
    return { ok: false, code: "missing_explicit_thermal_bridge_component" };
  }
  if (!sourceIsAllowed(bridge.source)) {
    return { ok: false, code: "missing_explicit_envelope_source" };
  }

  if (kind === "linear") {
    const length = positiveUnitAmount(bridge.length, "m", "invalid_explicit_thermal_bridge_length");
    if (!length.ok) return length;
    const psi = unitAmount(bridge.psi, "W/(m*K)");
    if (psi === null || !sourceIsAllowed(bridge.psi?.source)) {
      return { ok: false, code: "invalid_explicit_linear_thermal_bridge_psi" };
    }
    return {
      ok: true,
      value: {
        bridgeId: bridge.bridgeId,
        bridgeType: "linear",
        component,
        lengthM: length.amount,
        psiWmK: psi,
        contributionWK: length.amount * psi,
        contributionFormulaCode: "MC001_2_11_LINEAR_THERMAL_BRIDGE_TERM"
      }
    };
  }

  const chi = unitAmount(bridge.chi, "W/K");
  if (chi === null || !sourceIsAllowed(bridge.chi?.source)) {
    return { ok: false, code: "invalid_explicit_point_thermal_bridge_chi" };
  }
  return {
    ok: true,
    value: {
      bridgeId: bridge.bridgeId,
      bridgeType: "point",
      component,
      chiWK: chi,
      contributionWK: chi,
      contributionFormulaCode: "MC001_2_11_POINT_THERMAL_BRIDGE_TERM"
    }
  };
}

export function calculateMc001EnvelopeAssemblyUValueExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== ASSEMBLY_MODE) {
    return blocked(
      ASSEMBLY_SCOPE,
      ASSEMBLY_FORMULA_REFERENCES,
      ASSEMBLY_LIMITS,
      "invalid_envelope_assembly_mode"
    );
  }
  if (hasForbiddenDerivedInput(input, FORBIDDEN_ASSEMBLY_KEYS)) {
    return blocked(
      ASSEMBLY_SCOPE,
      ASSEMBLY_FORMULA_REFERENCES,
      ASSEMBLY_LIMITS,
      "client_supplied_derived_envelope_assembly_field"
    );
  }
  if (!Array.isArray(input.assemblies) || input.assemblies.length === 0) {
    return blocked(
      ASSEMBLY_SCOPE,
      ASSEMBLY_FORMULA_REFERENCES,
      ASSEMBLY_LIMITS,
      "missing_envelope_assemblies"
    );
  }

  const assemblyResults = [];
  for (const assembly of input.assemblies) {
    const result = normalizeAssemblyResult(assembly);
    if (!result.ok) {
      return blocked(ASSEMBLY_SCOPE, ASSEMBLY_FORMULA_REFERENCES, ASSEMBLY_LIMITS, result.code);
    }
    assemblyResults.push(result.value);
  }

  return {
    status: "ready",
    scope: ASSEMBLY_SCOPE,
    formulaReferences: [...ASSEMBLY_FORMULA_REFERENCES],
    assemblyResults,
    summary: {
      assemblyCount: assemblyResults.length
    },
    diagnostics: {
      blockers: [],
      warnings: assemblyResults.flatMap(result => result.diagnostics.warnings),
      methodologyLimits: [...ASSEMBLY_LIMITS]
    }
  };
}

export function calculateMc001EnvelopeTransmissionCoefficientExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== TRANSMISSION_MODE) {
    return blocked(
      TRANSMISSION_SCOPE,
      TRANSMISSION_FORMULA_REFERENCES,
      TRANSMISSION_LIMITS,
      "invalid_envelope_transmission_mode"
    );
  }
  if (hasForbiddenDerivedInput(input, FORBIDDEN_TRANSMISSION_KEYS)) {
    return blocked(
      TRANSMISSION_SCOPE,
      TRANSMISSION_FORMULA_REFERENCES,
      TRANSMISSION_LIMITS,
      "client_supplied_derived_envelope_transmission_field"
    );
  }
  if (!Array.isArray(input.elements) || input.elements.length === 0) {
    return blocked(
      TRANSMISSION_SCOPE,
      TRANSMISSION_FORMULA_REFERENCES,
      TRANSMISSION_LIMITS,
      "missing_envelope_transmission_elements"
    );
  }

  const elementResults = [];
  const bridgeResults = [];
  const componentTotals = { Hd: 0, Hg: 0, Hu: 0, Ha: 0 };
  const bridgeTotals = { Hd: 0, Hg: 0, Hu: 0, Ha: 0 };

  for (const [index, element] of input.elements.entries()) {
    const result = normalizeElement(element, index);
    if (!result.ok) {
      return blocked(TRANSMISSION_SCOPE, TRANSMISSION_FORMULA_REFERENCES, TRANSMISSION_LIMITS, result.code);
    }
    elementResults.push(result.value);
    componentTotals[result.value.component] += result.value.contributionWK;
  }

  const linearBridges = input.linearThermalBridges ?? [];
  const pointBridges = input.pointThermalBridges ?? [];
  if (!Array.isArray(linearBridges) || !Array.isArray(pointBridges)) {
    return blocked(
      TRANSMISSION_SCOPE,
      TRANSMISSION_FORMULA_REFERENCES,
      TRANSMISSION_LIMITS,
      "invalid_explicit_thermal_bridge_inputs"
    );
  }
  for (const [index, bridge] of linearBridges.entries()) {
    const result = normalizeBridge(bridge, index, "linear");
    if (!result.ok) {
      return blocked(TRANSMISSION_SCOPE, TRANSMISSION_FORMULA_REFERENCES, TRANSMISSION_LIMITS, result.code);
    }
    bridgeResults.push(result.value);
    bridgeTotals[result.value.component] += result.value.contributionWK;
  }
  for (const [index, bridge] of pointBridges.entries()) {
    const result = normalizeBridge(bridge, index, "point");
    if (!result.ok) {
      return blocked(TRANSMISSION_SCOPE, TRANSMISSION_FORMULA_REFERENCES, TRANSMISSION_LIMITS, result.code);
    }
    bridgeResults.push(result.value);
    bridgeTotals[result.value.component] += result.value.contributionWK;
  }

  const warnings = [];
  if (bridgeResults.length === 0 && input.noThermalBridges !== true) {
    warnings.push(warning("thermal_bridge_inputs_not_provided"));
  }
  const components = {};
  for (const key of COMPONENT_KEYS) {
    components[key] = {
      amount: componentTotals[key] + bridgeTotals[key],
      unit: "W/K",
      elementAmount: componentTotals[key],
      thermalBridgeAmount: bridgeTotals[key]
    };
  }
  const htr = COMPONENT_KEYS.reduce((sum, key) => sum + components[key].amount, 0);

  return {
    status: "ready",
    scope: TRANSMISSION_SCOPE,
    formulaReferences: [...TRANSMISSION_FORMULA_REFERENCES],
    result: {
      symbol: "H_tr",
      amount: htr,
      unit: "W/K",
      origin: "calculated_from_explicit_envelope_assemblies_and_boundaries"
    },
    components,
    elementResults,
    thermalBridgeResults: bridgeResults,
    monthlyTransmissionInput: {
      htr: { amount: htr, unit: "W/K" },
      source: {
        sourceType: "explicit_calculated_input",
        reference: "mc001_envelope_transmission_result.H_tr"
      }
    },
    summary: {
      elementCount: elementResults.length,
      thermalBridgeCount: bridgeResults.length
    },
    diagnostics: {
      blockers: [],
      warnings,
      methodologyLimits: [...TRANSMISSION_LIMITS]
    }
  };
}
