import { resolveObstacleShadingParameters } from "./datasets/mc001SolarShadingTables.mjs";
import {
  buildArithmeticExecutionTrace,
  inputExpression,
  operatorExpression,
  traceInput,
  valueExpression
} from "./mc001ExecutionTrace.mjs";

const SCOPE = "mc001_chapter2_supplementary_relations_p7d";

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function amountValue(input, directKey = "amount") {
  if (typeof input === "number") return finiteNumber(input);
  if (!input || typeof input !== "object") return null;
  return finiteNumber(input[directKey] ?? input.amount ?? input.value);
}

function codeBlocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code, extra = {}) {
  return Object.freeze({
    status: "blocked",
    scope: SCOPE,
    diagnostics: {
      blockers: [codeBlocker(code)],
      warnings: []
    },
    ...extra
  });
}

function ready(payload) {
  return Object.freeze({
    status: "ready",
    scope: SCOPE,
    diagnostics: {
      blockers: [],
      warnings: []
    },
    ...payload
  });
}

function input(value, unit, extra = {}) {
  return traceInput(value, unit, extra);
}

function arithmeticTrace({ formulaId, branchId, inputs, expression, result, unit, provenance }) {
  return {
    ...buildArithmeticExecutionTrace({
      formulaId,
      branchId,
      inputs,
      expression,
      rawResult: result,
      finalResult: result,
      unit
    }),
    provenance
  };
}

function sumTerms(terms) {
  return terms.length === 1 ? terms[0] : operatorExpression("add", terms);
}

function requireRange(value, min, max, code, { inclusiveMax = true } = {}) {
  const amount = finiteNumber(value);
  if (
    amount === null ||
    amount < min ||
    (inclusiveMax ? amount > max : amount >= max)
  ) {
    return { ok: false, code };
  }
  return { ok: true, value: amount };
}

function requireAtLeast(value, min, code) {
  const amount = finiteNumber(value);
  if (amount === null || amount < min) {
    return { ok: false, code };
  }
  return { ok: true, value: amount };
}

function normalizeSurface(surface, index, { allowZeroU = false } = {}) {
  const area = amountValue(surface?.areaM2 ?? surface?.area, "areaM2");
  const uValue = amountValue(
    surface?.correctedThermalTransmittanceWm2K ??
      surface?.uValueWm2K ??
      surface?.uValue ??
      surface?.thermalTransmittance,
    "uValueWm2K"
  );
  if (area === null || area <= 0) {
    return { ok: false, code: "mc001_2_16_2_17_invalid_surface_area", index };
  }
  if (uValue === null || uValue < 0 || (!allowZeroU && uValue === 0)) {
    return { ok: false, code: "mc001_2_16_2_17_invalid_surface_u_value", index };
  }
  return {
    ok: true,
    value: {
      surfaceId: surface?.surfaceId ?? surface?.elementId ?? `surface-${index + 1}`,
      areaM2: area,
      uValueWm2K: uValue,
      source: surface?.source ?? null
    }
  };
}

function calculateAreaWeightedAverage({ surfaces, formulaId, relationReference, branchId }) {
  if (!Array.isArray(surfaces) || surfaces.length === 0) {
    return blocked(`${formulaId}_missing_surfaces`);
  }

  const normalized = [];
  for (let index = 0; index < surfaces.length; index += 1) {
    const surface = normalizeSurface(surfaces[index], index);
    if (!surface.ok) return blocked(surface.code, { invalidIndex: surface.index });
    normalized.push(surface.value);
  }

  const totalAreaM2 = normalized.reduce((sum, surface) => sum + surface.areaM2, 0);
  const sumUA = normalized.reduce(
    (sum, surface) => sum + surface.areaM2 * surface.uValueWm2K,
    0
  );
  const averageUValueWm2K = sumUA / totalAreaM2;
  const averageCorrectedResistanceM2KPerW = 1 / averageUValueWm2K;
  const traceInputs = normalized.reduce((acc, surface, index) => {
    acc[`A${index + 1}`] = input(surface.areaM2, "m2", { meaning: surface.surfaceId });
    acc[`U${index + 1}`] = input(surface.uValueWm2K, "W/(m2*K)", {
      meaning: surface.surfaceId
    });
    return acc;
  }, {});
  const numeratorTerms = normalized.map((_, index) =>
    operatorExpression("multiply", [
      inputExpression(`A${index + 1}`),
      inputExpression(`U${index + 1}`)
    ])
  );
  const denominatorTerms = normalized.map((_, index) => inputExpression(`A${index + 1}`));
  const averageUTrace = arithmeticTrace({
    formulaId,
    branchId,
    inputs: traceInputs,
    expression: operatorExpression("divide", [
      sumTerms(numeratorTerms),
      sumTerms(denominatorTerms)
    ]),
    result: averageUValueWm2K,
    unit: "W/(m2*K)",
    provenance: {
      relation: relationReference,
      source: "MC001-2022 official PDF",
      sourcePages: [88, 89],
      inputPolicy: "explicit_surface_areas_and_corrected_u_values"
    }
  });
  const averageRTrace = arithmeticTrace({
    formulaId: `${formulaId}_RESISTANCE_RECIPROCAL`,
    branchId: `${branchId}_resistance_reciprocal`,
    inputs: {
      Uavg: input(averageUValueWm2K, "W/(m2*K)")
    },
    expression: operatorExpression("divide", [valueExpression(1), inputExpression("Uavg")]),
    result: averageCorrectedResistanceM2KPerW,
    unit: "m2*K/W",
    provenance: {
      relation: relationReference,
      source: "MC001-2022 official PDF",
      sourcePages: [88, 89],
      inputPolicy: "derived_from_average_corrected_transmittance"
    }
  });

  return ready({
    formulaCode: formulaId,
    sourceRelation: relationReference,
    surfaces: normalized,
    totalAreaM2,
    sumUA,
    averageUValueWm2K,
    averageCorrectedResistanceM2KPerW,
    executionTrace: averageUTrace,
    resistanceExecutionTrace: averageRTrace
  });
}

export function calculateAverageCorrectedElementProperties2_16({ surfaces } = {}) {
  return calculateAreaWeightedAverage({
    surfaces,
    formulaId: "MC001_RELATION_2_16_AVERAGE_CORRECTED_ELEMENT_PROPERTIES",
    relationReference: "2.16",
    branchId: "area_weighted_corrected_element_average"
  });
}

export function calculateSurfaceTemperatureFactor2_4({
  surfaceTemperatureC,
  exteriorTemperatureC,
  interiorTemperatureC,
  totalResistanceM2KPerW,
  internalSurfaceResistanceM2KPerW
} = {}) {
  const hasTemperaturePath =
    surfaceTemperatureC !== undefined ||
    exteriorTemperatureC !== undefined ||
    interiorTemperatureC !== undefined;
  const hasResistancePath =
    totalResistanceM2KPerW !== undefined ||
    internalSurfaceResistanceM2KPerW !== undefined;
  if (hasTemperaturePath && hasResistancePath) {
    return blocked("mc001_2_4_ambiguous_temperature_and_resistance_paths");
  }
  if (hasTemperaturePath) {
    const surface = finiteNumber(amountValue(surfaceTemperatureC, "surfaceTemperatureC"));
    if (surface === null) return blocked("mc001_2_4_invalid_surface_temperature");
    const exterior = finiteNumber(amountValue(exteriorTemperatureC, "exteriorTemperatureC"));
    if (exterior === null) return blocked("mc001_2_4_invalid_exterior_temperature");
    const interior = finiteNumber(amountValue(interiorTemperatureC, "interiorTemperatureC"));
    if (interior === null) return blocked("mc001_2_4_invalid_interior_temperature");
    const denominator = interior - exterior;
    if (denominator === 0) return blocked("mc001_2_4_zero_temperature_difference");
    const result = (surface - exterior) / denominator;
    return ready({
      formulaCode: "MC001_RELATION_2_4_SURFACE_TEMPERATURE_FACTOR",
      sourceRelation: "2.4",
      branchId: "temperature_ratio_definition",
      result: { amount: result, unit: "-" },
      executionTrace: arithmeticTrace({
        formulaId: "MC001_RELATION_2_4_SURFACE_TEMPERATURE_FACTOR",
        branchId: "temperature_ratio_definition",
        inputs: {
          thetaSi: input(surface, "degC"),
          thetaE: input(exterior, "degC"),
          thetaI: input(interior, "degC")
        },
        expression: operatorExpression("divide", [
          operatorExpression("subtract", [inputExpression("thetaSi"), inputExpression("thetaE")]),
          operatorExpression("subtract", [inputExpression("thetaI"), inputExpression("thetaE")])
        ]),
        result,
        unit: "-",
        provenance: {
          relation: "2.4",
          source: "MC001-2022 official PDF",
          sourcePages: [53, 54],
          inputPolicy: "explicit_surface_exterior_and_interior_temperatures"
        }
      })
    });
  }
  if (!hasResistancePath) return blocked("mc001_2_4_missing_inputs");
  const total = requireAtLeast(
    amountValue(totalResistanceM2KPerW, "totalResistanceM2KPerW"),
    0,
    "mc001_2_4_invalid_total_resistance"
  );
  if (!total.ok || total.value === 0) return blocked("mc001_2_4_invalid_total_resistance");
  const rsi = requireAtLeast(
    amountValue(internalSurfaceResistanceM2KPerW, "internalSurfaceResistanceM2KPerW"),
    0,
    "mc001_2_4_invalid_internal_surface_resistance"
  );
  if (!rsi.ok) return blocked(rsi.code);
  if (rsi.value > total.value) return blocked("mc001_2_4_internal_surface_resistance_exceeds_total");
  const result = (total.value - rsi.value) / total.value;
  return ready({
    formulaCode: "MC001_RELATION_2_4_SURFACE_TEMPERATURE_FACTOR",
    sourceRelation: "2.4",
    branchId: "resistance_ratio_definition",
    result: { amount: result, unit: "-" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_4_SURFACE_TEMPERATURE_FACTOR",
      branchId: "resistance_ratio_definition",
      inputs: {
        R: input(total.value, "m2*K/W"),
        Rsi: input(rsi.value, "m2*K/W")
      },
      expression: operatorExpression("divide", [
        operatorExpression("subtract", [inputExpression("R"), inputExpression("Rsi")]),
        inputExpression("R")
      ]),
      result,
      unit: "-",
      provenance: {
        relation: "2.4",
        source: "MC001-2022 official PDF",
        sourcePages: [53, 54],
        inputPolicy: "explicit_total_and_internal_surface_resistance"
      }
    })
  });
}

export function calculateAverageCorrectedEnvelopeProperties2_17({ surfaces } = {}) {
  return calculateAreaWeightedAverage({
    surfaces,
    formulaId: "MC001_RELATION_2_17_AVERAGE_CORRECTED_ENVELOPE_PROPERTIES",
    relationReference: "2.17",
    branchId: "area_weighted_corrected_envelope_average"
  });
}

export function calculateThermalCouplingCoefficient2_18({ areaM2, uValueWm2K } = {}) {
  const area = requireAtLeast(amountValue(areaM2, "areaM2"), 0, "mc001_2_18_invalid_area");
  if (!area.ok || area.value === 0) return blocked("mc001_2_18_invalid_area");
  const uValue = requireAtLeast(
    amountValue(uValueWm2K, "uValueWm2K"),
    0,
    "mc001_2_18_invalid_u_value"
  );
  if (!uValue.ok) return blocked(uValue.code);
  const result = area.value * uValue.value;
  return ready({
    formulaCode: "MC001_RELATION_2_18_THERMAL_COUPLING_COEFFICIENT",
    sourceRelation: "2.18",
    result: { amount: result, unit: "W/K" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_18_THERMAL_COUPLING_COEFFICIENT",
      branchId: "thermal_coupling_area_times_u",
      inputs: {
        A: input(area.value, "m2"),
        Uprime: input(uValue.value, "W/(m2*K)")
      },
      expression: operatorExpression("multiply", [inputExpression("A"), inputExpression("Uprime")]),
      result,
      unit: "W/K",
      provenance: {
        relation: "2.18",
        source: "MC001-2022 official PDF",
        sourcePages: [89],
        inputPolicy: "explicit_area_and_corrected_u_value"
      }
    })
  });
}

export function calculateHeatFlow2_19({ couplingCoefficientWK, temperatureDifferenceK } = {}) {
  const coupling = requireAtLeast(
    amountValue(couplingCoefficientWK, "couplingCoefficientWK"),
    0,
    "mc001_2_19_invalid_coupling_coefficient"
  );
  if (!coupling.ok) return blocked(coupling.code);
  const delta = finiteNumber(amountValue(temperatureDifferenceK, "temperatureDifferenceK"));
  if (delta === null) return blocked("mc001_2_19_invalid_temperature_difference");
  const result = coupling.value * delta;
  return ready({
    formulaCode: "MC001_RELATION_2_19_HEAT_FLOW_FROM_THERMAL_COUPLING",
    sourceRelation: "2.19",
    result: { amount: result, unit: "W" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_19_HEAT_FLOW_FROM_THERMAL_COUPLING",
      branchId: "heat_flow_coupling_times_temperature_difference",
      inputs: {
        L: input(coupling.value, "W/K"),
        dtheta: input(delta, "K")
      },
      expression: operatorExpression("multiply", [inputExpression("L"), inputExpression("dtheta")]),
      result,
      unit: "W",
      provenance: {
        relation: "2.19",
        source: "MC001-2022 official PDF",
        sourcePages: [89],
        inputPolicy: "explicit_coupling_coefficient_and_temperature_difference"
      }
    })
  });
}

export function calculateDiffuseGlazingSolarTransmittance2_41({
  altitudeSolarTransmittance,
  diffuseSolarTransmittance,
  weightingFactor = 0.75
} = {}) {
  const alt = requireRange(
    amountValue(altitudeSolarTransmittance, "altitudeSolarTransmittance"),
    0,
    1,
    "mc001_2_41_invalid_altitude_transmittance"
  );
  if (!alt.ok) return blocked(alt.code);
  const diffuse = requireRange(
    amountValue(diffuseSolarTransmittance, "diffuseSolarTransmittance"),
    0,
    1,
    "mc001_2_41_invalid_diffuse_transmittance"
  );
  if (!diffuse.ok) return blocked(diffuse.code);
  const agl = requireRange(
    amountValue(weightingFactor, "weightingFactor"),
    0,
    1,
    "mc001_2_41_invalid_weighting_factor"
  );
  if (!agl.ok) return blocked(agl.code);
  const result = agl.value * alt.value + (1 - agl.value) * diffuse.value;
  return ready({
    formulaCode: "MC001_RELATION_2_41_DIFFUSE_GLAZING_SOLAR_TRANSMITTANCE",
    sourceRelation: "2.41",
    result: { amount: result, unit: "-" },
    defaultedInputs: weightingFactor === 0.75 ? ["agl_recommended_0_75"] : [],
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_41_DIFFUSE_GLAZING_SOLAR_TRANSMITTANCE",
      branchId: "diffuse_glazing_weighted_altitude_and_diffuse_transmittance",
      inputs: {
        agl: input(agl.value, "-", { origin: "MC001_2_41_recommended_agl_0_75_or_explicit" }),
        gAlt: input(alt.value, "-"),
        gDif: input(diffuse.value, "-")
      },
      expression: operatorExpression("add", [
        operatorExpression("multiply", [inputExpression("agl"), inputExpression("gAlt")]),
        operatorExpression("multiply", [
          operatorExpression("subtract", [valueExpression(1), inputExpression("agl")]),
          inputExpression("gDif")
        ])
      ]),
      result,
      unit: "-",
      provenance: {
        relation: "2.41",
        source: "MC001-2022 official PDF",
        sourcePages: [105, 106],
        inputPolicy: "explicit_glazing_transmittance_values; agl may use MC001 recommended 0.75"
      }
    })
  });
}

export function calculateMonthlyWindowShutterUValue2_42({
  windowUValueWm2K,
  shutterAssemblyUValueWm2K,
  shutterUseFraction
} = {}) {
  const windowU = requireAtLeast(
    amountValue(windowUValueWm2K, "windowUValueWm2K"),
    0,
    "mc001_2_42_invalid_window_u_value"
  );
  if (!windowU.ok) return blocked(windowU.code);
  const shutterU = requireAtLeast(
    amountValue(shutterAssemblyUValueWm2K, "shutterAssemblyUValueWm2K"),
    0,
    "mc001_2_42_invalid_shutter_u_value"
  );
  if (!shutterU.ok) return blocked(shutterU.code);
  const fraction = requireRange(
    amountValue(shutterUseFraction, "shutterUseFraction"),
    0,
    1,
    "mc001_2_42_invalid_shutter_use_fraction"
  );
  if (!fraction.ok) return blocked(fraction.code);
  const result = (1 - fraction.value) * windowU.value + fraction.value * shutterU.value;
  return ready({
    formulaCode: "MC001_RELATION_2_42_MONTHLY_WINDOW_SHUTTER_U_VALUE",
    sourceRelation: "2.42",
    result: { amount: result, unit: "W/(m2*K)" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_42_MONTHLY_WINDOW_SHUTTER_U_VALUE",
      branchId: "window_u_weighted_by_shutter_use_fraction",
      inputs: {
        fshtWith: input(fraction.value, "-"),
        Uw: input(windowU.value, "W/(m2*K)"),
        UwSht: input(shutterU.value, "W/(m2*K)")
      },
      expression: operatorExpression("add", [
        operatorExpression("multiply", [
          operatorExpression("subtract", [valueExpression(1), inputExpression("fshtWith")]),
          inputExpression("Uw")
        ]),
        operatorExpression("multiply", [inputExpression("fshtWith"), inputExpression("UwSht")])
      ]),
      result,
      unit: "W/(m2*K)",
      provenance: {
        relation: "2.42",
        source: "MC001-2022 official PDF",
        sourcePages: [106],
        inputPolicy: "explicit_window_u_shutter_u_and_use_fraction"
      }
    })
  });
}

export function calculateMonthlyMovableShadingTransmittance2_43({
  unshadedTransmittance,
  shadedTransmittance,
  shadingUseFraction
} = {}) {
  const unshaded = requireRange(
    amountValue(unshadedTransmittance, "unshadedTransmittance"),
    0,
    1,
    "mc001_2_43_invalid_unshaded_transmittance"
  );
  if (!unshaded.ok) return blocked(unshaded.code);
  const shaded = requireRange(
    amountValue(shadedTransmittance, "shadedTransmittance"),
    0,
    1,
    "mc001_2_43_invalid_shaded_transmittance"
  );
  if (!shaded.ok) return blocked(shaded.code);
  const fraction = requireRange(
    amountValue(shadingUseFraction, "shadingUseFraction"),
    0,
    1,
    "mc001_2_43_invalid_shading_use_fraction"
  );
  if (!fraction.ok) return blocked(fraction.code);
  const result = (1 - fraction.value) * unshaded.value + fraction.value * shaded.value;
  return ready({
    formulaCode: "MC001_RELATION_2_43_MONTHLY_MOVABLE_SHADING_TRANSMITTANCE",
    sourceRelation: "2.43",
    result: { amount: result, unit: "-" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_43_MONTHLY_MOVABLE_SHADING_TRANSMITTANCE",
      branchId: "glazing_transmittance_weighted_by_shading_use_fraction",
      inputs: {
        fshWith: input(fraction.value, "-"),
        ggl: input(unshaded.value, "-"),
        gglSh: input(shaded.value, "-")
      },
      expression: operatorExpression("add", [
        operatorExpression("multiply", [
          operatorExpression("subtract", [valueExpression(1), inputExpression("fshWith")]),
          inputExpression("ggl")
        ]),
        operatorExpression("multiply", [inputExpression("fshWith"), inputExpression("gglSh")])
      ]),
      result,
      unit: "-",
      provenance: {
        relation: "2.43",
        source: "MC001-2022 official PDF",
        sourcePages: [106],
        inputPolicy: "explicit_unshaded_and_shaded_transmittance_and_use_fraction"
      }
    })
  });
}

export function calculateObstacleShadingFactor2_47({
  directShadingFactor,
  directSolarFraction
} = {}) {
  const direct = requireRange(
    amountValue(directShadingFactor, "directShadingFactor"),
    0,
    1,
    "mc001_2_47_invalid_direct_shading_factor"
  );
  if (!direct.ok) return blocked(direct.code);
  const fraction = requireRange(
    amountValue(directSolarFraction, "directSolarFraction"),
    0,
    1,
    "mc001_2_47_invalid_direct_solar_fraction"
  );
  if (!fraction.ok) return blocked(fraction.code);
  const result = direct.value * fraction.value;
  return ready({
    formulaCode: "MC001_RELATION_2_47_OBSTACLE_SHADING_FACTOR",
    sourceRelation: "2.47",
    result: { amount: result, unit: "-" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_47_OBSTACLE_SHADING_FACTOR",
      branchId: "obstacle_shading_direct_factor_times_direct_solar_fraction",
      inputs: {
        FshDir: input(direct.value, "-"),
        fsolDir: input(fraction.value, "-")
      },
      expression: operatorExpression("multiply", [
        inputExpression("FshDir"),
        inputExpression("fsolDir")
      ]),
      result,
      unit: "-",
      provenance: {
        relation: "2.47",
        source: "MC001-2022 official PDF",
        sourcePages: [107, 108],
        inputPolicy: "explicit_direct_obstacle_factor_and_source_backed_direct_solar_fraction"
      }
    })
  });
}

export function resolveObstacleShadingFactor2_47FromTable({
  month,
  orientation,
  directShadingFactor
} = {}) {
  const table = resolveObstacleShadingParameters({ month, orientation });
  if (table.status !== "ready") {
    return blocked(table.diagnostics?.blockers?.[0]?.code ?? "mc001_2_47_table_lookup_failed");
  }
  const result = calculateObstacleShadingFactor2_47({
    directShadingFactor,
    directSolarFraction: table.fsolDir
  });
  if (result.status !== "ready") return result;
  return ready({
    ...result,
    sourceTable: table.sourceTable,
    sourcePages: table.sourcePages,
    season: table.season,
    orientation: table.orientation,
    month
  });
}

export function calculateUnconditionedZoneSolarReduction2_48({
  glazingSolarTransmittance,
  frameFraction
} = {}) {
  const ggl = requireRange(
    amountValue(glazingSolarTransmittance, "glazingSolarTransmittance"),
    0,
    1,
    "mc001_2_48_invalid_glazing_solar_transmittance"
  );
  if (!ggl.ok) return blocked(ggl.code);
  const frame = requireRange(
    amountValue(frameFraction, "frameFraction"),
    0,
    1,
    "mc001_2_48_invalid_frame_fraction",
    { inclusiveMax: false }
  );
  if (!frame.ok) return blocked(frame.code);
  const result = ggl.value * (1 - frame.value);
  return ready({
    formulaCode: "MC001_RELATION_2_48_UNCONDITIONED_ZONE_SOLAR_REDUCTION",
    sourceRelation: "2.48",
    result: { amount: result, unit: "-" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_48_UNCONDITIONED_ZONE_SOLAR_REDUCTION",
      branchId: "unconditioned_zone_solar_reduction_transmittance_frame_fraction",
      inputs: {
        gglUeZtu: input(ggl.value, "-"),
        FfrUeZtu: input(frame.value, "-")
      },
      expression: operatorExpression("multiply", [
        inputExpression("gglUeZtu"),
        operatorExpression("subtract", [valueExpression(1), inputExpression("FfrUeZtu")])
      ]),
      result,
      unit: "-",
      provenance: {
        relation: "2.48",
        source: "MC001-2022 official PDF",
        sourcePages: [109],
        inputPolicy: "explicit_glazing_transmittance_and_frame_fraction"
      }
    })
  });
}

export function calculateUnconditionedZoneSolarGains2_49({
  solarReductionFactor,
  obstacleShadingFactor,
  opaqueSurfaces
} = {}) {
  const reduction = requireRange(
    amountValue(solarReductionFactor, "solarReductionFactor"),
    0,
    1,
    "mc001_2_49_invalid_solar_reduction_factor"
  );
  if (!reduction.ok) return blocked(reduction.code);
  const shading = requireRange(
    amountValue(obstacleShadingFactor, "obstacleShadingFactor"),
    0,
    1,
    "mc001_2_49_invalid_obstacle_shading_factor"
  );
  if (!shading.ok) return blocked(shading.code);
  if (!Array.isArray(opaqueSurfaces) || opaqueSurfaces.length === 0) {
    return blocked("mc001_2_49_missing_opaque_surfaces");
  }
  const surfaces = [];
  for (let index = 0; index < opaqueSurfaces.length; index += 1) {
    const surface = opaqueSurfaces[index];
    const absorptance = requireRange(
      amountValue(surface?.solarAbsorptance, "solarAbsorptance"),
      0,
      1,
      "mc001_2_49_invalid_absorptance"
    );
    if (!absorptance.ok) return blocked(absorptance.code, { invalidIndex: index });
    const area = requireAtLeast(amountValue(surface?.areaM2 ?? surface?.area, "areaM2"), 0, "mc001_2_49_invalid_area");
    if (!area.ok || area.value === 0) return blocked("mc001_2_49_invalid_area", { invalidIndex: index });
    const hsol = requireAtLeast(
      amountValue(surface?.hsolKwhPerM2 ?? surface?.hsol, "hsolKwhPerM2"),
      0,
      "mc001_2_49_invalid_hsol"
    );
    if (!hsol.ok) return blocked(hsol.code, { invalidIndex: index });
    surfaces.push({
      surfaceId: surface?.surfaceId ?? `opaque-${index + 1}`,
      absorptance: absorptance.value,
      areaM2: area.value,
      hsolKwhPerM2: hsol.value
    });
  }
  const sourceSumKwh = surfaces.reduce(
    (sum, surface) => sum + surface.absorptance * surface.areaM2 * surface.hsolKwhPerM2,
    0
  );
  const result = reduction.value * shading.value * sourceSumKwh;
  const inputs = {
    FsolUeZtu: input(reduction.value, "-"),
    FshObstZtu: input(shading.value, "-")
  };
  const surfaceTerms = surfaces.map((surface, index) => {
    inputs[`alpha${index + 1}`] = input(surface.absorptance, "-", { meaning: surface.surfaceId });
    inputs[`A${index + 1}`] = input(surface.areaM2, "m2", { meaning: surface.surfaceId });
    inputs[`Hsol${index + 1}`] = input(surface.hsolKwhPerM2, "kWh/m2", {
      meaning: surface.surfaceId
    });
    return operatorExpression("multiply", [
      inputExpression(`alpha${index + 1}`),
      inputExpression(`A${index + 1}`),
      inputExpression(`Hsol${index + 1}`)
    ]);
  });
  return ready({
    formulaCode: "MC001_RELATION_2_49_UNCONDITIONED_ZONE_SOLAR_GAINS",
    sourceRelation: "2.49",
    sourceSumKwh,
    result: { amount: result, unit: "kWh" },
    opaqueSurfaces: surfaces,
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_49_UNCONDITIONED_ZONE_SOLAR_GAINS",
      branchId: "unconditioned_zone_solar_gains_opaque_surface_sum",
      inputs,
      expression: operatorExpression("multiply", [
        inputExpression("FsolUeZtu"),
        inputExpression("FshObstZtu"),
        sumTerms(surfaceTerms)
      ]),
      result,
      unit: "kWh",
      provenance: {
        relation: "2.49",
        source: "MC001-2022 official PDF",
        sourcePages: [109, 110],
        inputPolicy: "explicit_reduction_shading_absorptance_area_and_source_backed_Hsol"
      }
    })
  });
}

export function calculateCoolingHeatTransferCoefficient2_79({
  qChtKwh,
  indoorCoolingSetpointC,
  outdoorTemperatureC,
  durationHours
} = {}) {
  const qCht = requireAtLeast(amountValue(qChtKwh, "qChtKwh"), 0, "mc001_2_79_invalid_qcht");
  if (!qCht.ok) return blocked(qCht.code);
  const indoor = finiteNumber(amountValue(indoorCoolingSetpointC, "indoorCoolingSetpointC"));
  if (indoor === null) return blocked("mc001_2_79_invalid_indoor_temperature");
  const outdoor = finiteNumber(amountValue(outdoorTemperatureC, "outdoorTemperatureC"));
  if (outdoor === null) return blocked("mc001_2_79_invalid_outdoor_temperature");
  const duration = requireAtLeast(amountValue(durationHours, "durationHours"), 0, "mc001_2_79_invalid_duration");
  if (!duration.ok || duration.value === 0) return blocked("mc001_2_79_invalid_duration");
  const delta = indoor - outdoor;
  if (delta <= 0) return blocked("mc001_2_79_non_positive_cooling_temperature_difference");
  const denominator = delta * 0.001 * duration.value;
  const result = qCht.value / denominator;
  return ready({
    formulaCode: "MC001_RELATION_2_79_COOLING_HEAT_TRANSFER_COEFFICIENT",
    sourceRelation: "2.79",
    result: { amount: result, unit: "W/K" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_79_COOLING_HEAT_TRANSFER_COEFFICIENT",
      branchId: "cooling_heat_transfer_from_monthly_energy_temperature_and_duration",
      inputs: {
        QCht: input(qCht.value, "kWh"),
        thetaIntCalcC: input(indoor, "degC"),
        thetaE: input(outdoor, "degC"),
        dtm: input(duration.value, "h")
      },
      expression: operatorExpression("divide", [
        inputExpression("QCht"),
        operatorExpression("multiply", [
          operatorExpression("subtract", [
            inputExpression("thetaIntCalcC"),
            inputExpression("thetaE")
          ]),
          valueExpression(0.001),
          inputExpression("dtm")
        ])
      ]),
      result,
      unit: "W/K",
      provenance: {
        relation: "2.79",
        source: "MC001-2022 official PDF",
        sourcePages: [121],
        inputPolicy: "derived_from_cooling_transfer_energy_setpoint_exterior_temperature_and_month_hours"
      }
    })
  });
}

export function calculateCoolingOperativeTemperature2_78({
  outdoorTemperatureC,
  qCndKwh,
  qCgnKwh,
  coolingHeatTransferCoefficientWK,
  durationHours
} = {}) {
  const outdoor = finiteNumber(amountValue(outdoorTemperatureC, "outdoorTemperatureC"));
  if (outdoor === null) return blocked("mc001_2_78_invalid_outdoor_temperature");
  const qCnd = requireAtLeast(amountValue(qCndKwh, "qCndKwh"), 0, "mc001_2_78_invalid_qcnd");
  if (!qCnd.ok) return blocked(qCnd.code);
  const qCgn = requireAtLeast(amountValue(qCgnKwh, "qCgnKwh"), 0, "mc001_2_78_invalid_qcgn");
  if (!qCgn.ok) return blocked(qCgn.code);
  const h = requireAtLeast(
    amountValue(coolingHeatTransferCoefficientWK, "coolingHeatTransferCoefficientWK"),
    0,
    "mc001_2_78_invalid_hcht"
  );
  if (!h.ok || h.value === 0) return blocked("mc001_2_78_invalid_hcht");
  const duration = requireAtLeast(amountValue(durationHours, "durationHours"), 0, "mc001_2_78_invalid_duration");
  if (!duration.ok || duration.value === 0) return blocked("mc001_2_78_invalid_duration");
  const result = outdoor + (qCnd.value + qCgn.value) / (h.value * 0.001 * duration.value);
  return ready({
    formulaCode: "MC001_RELATION_2_78_COOLING_OPERATIVE_TEMPERATURE",
    sourceRelation: "2.78",
    result: { amount: result, unit: "degC" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_78_COOLING_OPERATIVE_TEMPERATURE",
      branchId: "cooling_operative_temperature_from_monthly_balance",
      inputs: {
        thetaE: input(outdoor, "degC"),
        QCnd: input(qCnd.value, "kWh"),
        QCgn: input(qCgn.value, "kWh"),
        HCht: input(h.value, "W/K"),
        dtm: input(duration.value, "h")
      },
      expression: operatorExpression("add", [
        inputExpression("thetaE"),
        operatorExpression("divide", [
          operatorExpression("add", [inputExpression("QCnd"), inputExpression("QCgn")]),
          operatorExpression("multiply", [
            inputExpression("HCht"),
            valueExpression(0.001),
            inputExpression("dtm")
          ])
        ])
      ]),
      result,
      unit: "degC",
      provenance: {
        relation: "2.78",
        source: "MC001-2022 official PDF",
        sourcePages: [121],
        inputPolicy: "downstream_temperature_output_after_QCnd"
      }
    })
  });
}

export function calculateMonthlyOverheatingIndicator2_81({
  qOhGainsKwh,
  qOhHeatTransferKwh,
  hOhTransmissionWK,
  hOhVentilationWK
} = {}) {
  const qGains = requireAtLeast(amountValue(qOhGainsKwh, "qOhGainsKwh"), 0, "mc001_2_81_invalid_qoh_gains");
  if (!qGains.ok) return blocked(qGains.code);
  const qTransfer = requireAtLeast(
    amountValue(qOhHeatTransferKwh, "qOhHeatTransferKwh"),
    0,
    "mc001_2_81_invalid_qoh_heat_transfer"
  );
  if (!qTransfer.ok) return blocked(qTransfer.code);
  const hTr = requireAtLeast(
    amountValue(hOhTransmissionWK, "hOhTransmissionWK"),
    0,
    "mc001_2_81_invalid_hoh_transmission"
  );
  if (!hTr.ok) return blocked(hTr.code);
  const hVe = requireAtLeast(
    amountValue(hOhVentilationWK, "hOhVentilationWK"),
    0,
    "mc001_2_81_invalid_hoh_ventilation"
  );
  if (!hVe.ok) return blocked(hVe.code);
  if (hTr.value + hVe.value <= 0) return blocked("mc001_2_81_zero_overheating_transfer_coefficient");
  const result = (1000 * (qGains.value - qTransfer.value)) / (hTr.value + hVe.value);
  return ready({
    formulaCode: "MC001_RELATION_2_81_MONTHLY_OVERHEATING_INDICATOR",
    sourceRelation: "2.81",
    result: { amount: result, unit: "K*h" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_81_MONTHLY_OVERHEATING_INDICATOR",
      branchId: "monthly_overheating_indicator_excess_gains_over_transfer",
      inputs: {
        QOHgn: input(qGains.value, "kWh"),
        QOHht: input(qTransfer.value, "kWh"),
        HOHtr: input(hTr.value, "W/K"),
        HOHve: input(hVe.value, "W/K")
      },
      expression: operatorExpression("divide", [
        operatorExpression("multiply", [
          valueExpression(1000),
          operatorExpression("subtract", [inputExpression("QOHgn"), inputExpression("QOHht")])
        ]),
        operatorExpression("add", [inputExpression("HOHtr"), inputExpression("HOHve")])
      ]),
      result,
      unit: "K*h",
      provenance: {
        relation: "2.81",
        source: "MC001-2022 official PDF",
        sourcePages: [122],
        inputPolicy: "explicit_overheating_gains_transfer_and_coefficients"
      }
    })
  });
}

export function calculateAnnualOverheatingIndicator2_80({ monthlyOverheatingIndicatorsKh } = {}) {
  if (!Array.isArray(monthlyOverheatingIndicatorsKh) || monthlyOverheatingIndicatorsKh.length === 0) {
    return blocked("mc001_2_80_missing_monthly_overheating_indicators");
  }
  const values = [];
  for (let index = 0; index < monthlyOverheatingIndicatorsKh.length; index += 1) {
    const value = finiteNumber(amountValue(monthlyOverheatingIndicatorsKh[index], "monthlyOverheatingIndicatorKh"));
    if (value === null) return blocked("mc001_2_80_invalid_monthly_overheating_indicator", { invalidIndex: index });
    values.push(value);
  }
  const result = values.reduce((sum, value) => sum + value, 0);
  const inputs = values.reduce((acc, value, index) => {
    acc[`TOH${index + 1}`] = input(value, "K*h");
    return acc;
  }, {});
  return ready({
    formulaCode: "MC001_RELATION_2_80_ANNUAL_OVERHEATING_INDICATOR",
    sourceRelation: "2.80",
    result: { amount: result, unit: "K*h" },
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_80_ANNUAL_OVERHEATING_INDICATOR",
      branchId: "annual_overheating_indicator_monthly_sum",
      inputs,
      expression: sumTerms(values.map((_, index) => inputExpression(`TOH${index + 1}`))),
      result,
      unit: "K*h",
      provenance: {
        relation: "2.80",
        source: "MC001-2022 official PDF",
        sourcePages: [122],
        inputPolicy: "monthly_overheating_indicators_from_relation_2_81"
      }
    })
  });
}

export function calculateSeasonBoundaryOutdoorTemperature2_87({
  indoorTemperatureC,
  dailySourceEnergyKwh,
  totalHeatTransferKWPerK,
  utilizationFactorAtGammaOne = 1,
  dayDurationHours = 24
} = {}) {
  const indoor = finiteNumber(amountValue(indoorTemperatureC, "indoorTemperatureC"));
  if (indoor === null) return blocked("mc001_2_87_invalid_indoor_temperature");
  const gains = requireAtLeast(
    amountValue(dailySourceEnergyKwh, "dailySourceEnergyKwh"),
    0,
    "mc001_2_87_invalid_daily_source_energy"
  );
  if (!gains.ok) return blocked(gains.code);
  const ht = requireAtLeast(
    amountValue(totalHeatTransferKWPerK, "totalHeatTransferKWPerK"),
    0,
    "mc001_2_87_invalid_total_heat_transfer"
  );
  if (!ht.ok || ht.value === 0) return blocked("mc001_2_87_invalid_total_heat_transfer");
  const eta = requireRange(
    amountValue(utilizationFactorAtGammaOne, "utilizationFactorAtGammaOne"),
    0,
    1,
    "mc001_2_87_invalid_utilization_factor"
  );
  if (!eta.ok) return blocked(eta.code);
  const duration = requireAtLeast(
    amountValue(dayDurationHours, "dayDurationHours"),
    0,
    "mc001_2_87_invalid_day_duration"
  );
  if (!duration.ok || duration.value === 0) return blocked("mc001_2_87_invalid_day_duration");
  const result = indoor - (eta.value * gains.value) / (ht.value * duration.value);
  return ready({
    formulaCode: "MC001_RELATION_2_87_SEASON_BOUNDARY_OUTDOOR_TEMPERATURE",
    sourceRelation: "2.87",
    result: { amount: result, unit: "degC" },
    boundedScope:
      "graphic annual heating/cooling period intersection is not implemented; this helper implements only the explicit threshold equation",
    executionTrace: arithmeticTrace({
      formulaId: "MC001_RELATION_2_87_SEASON_BOUNDARY_OUTDOOR_TEMPERATURE",
      branchId: "season_boundary_temperature_threshold",
      inputs: {
        thetaI: input(indoor, "degC"),
        eta1: input(eta.value, "-"),
        QsurseZ: input(gains.value, "kWh/day"),
        HT: input(ht.value, "kW/K"),
        tz: input(duration.value, "h")
      },
      expression: operatorExpression("subtract", [
        inputExpression("thetaI"),
        operatorExpression("divide", [
          operatorExpression("multiply", [inputExpression("eta1"), inputExpression("QsurseZ")]),
          operatorExpression("multiply", [inputExpression("HT"), inputExpression("tz")])
        ])
      ]),
      result,
      unit: "degC",
      provenance: {
        relation: "2.87",
        source: "MC001-2022 official PDF",
        sourcePages: [125, 126],
        inputPolicy: "explicit_daily_sources_total_heat_transfer_and_utilization_factor"
      }
    })
  });
}
