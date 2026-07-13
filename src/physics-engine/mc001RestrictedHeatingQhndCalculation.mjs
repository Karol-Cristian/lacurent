import { calculateMc001HeatingGainUtilizationFactor } from "./mc001HeatingGainUtilizationFactorCalculation.mjs";
import { calculateMc001HeatingIntermittencyExplicit } from "./mc001HeatingIntermittencyCalculation.mjs";
import { calculateMc001MonthlyHeatGainsExplicit } from "./mc001MonthlyHeatGainsCalculation.mjs";

const MODE = "restricted_heating_qhnd_explicit_v1";
const SCOPE = "restricted_heating_qhnd_explicit_input_only_not_full_mc001";
const FORMULA_REFERENCES = [
  "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH",
  "MC001_R8_HEATING_GAIN_UTILIZATION_FACTOR_FORMULA_SOURCE_PACK",
  "MC001_R8_AH_PARAMETER_RELATION_2_55",
  "MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57",
  "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION",
  "MC001_R11_HEATING_INTERMITTENCY_RELATIONS_2_59_TO_2_73_SOURCE_PACK"
];
const FORMULA_CODE = "MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH";
const LONG_UNOCCUPIED_FORMULA_CODE = "MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION";
const AH_FORMULA_CODE = "MC001_R8_AH_PARAMETER_RELATION_2_55";
const TAUH_FORMULA_CODE = "MC001_R8_TAU_H_DEPENDENCY_RELATION_2_57";
const C5_QHHT_ORIGIN = "calculated_from_explicit_C5_transfer";
const C5_TOTAL_TRANSFER_SCOPE = "explicit_transmission_plus_ventilation_heat_transfer_only_not_QHnd";
const C5_TOTAL_TRANSFER_SYMBOL = "Q_total_transfer_explicit";
const HEAT_GAINS_SCOPE = "monthly_heat_gains_explicit_input_only_not_full_QHnd";
const HEAT_GAINS_FORMULA_CODE = "MC001_EXPLICIT_MONTHLY_HEAT_GAINS_SUM";
const HEATING_INTERMITTENCY_SCOPE = "heating_intermittency_explicit_input_only_not_full_QHnd";
const ALLOWED_MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];
const METHODOLOGY_LIMITS = [
  "restricted_heating_only",
  "explicit_input_only",
  "not_full_QHnd",
  "not_QCnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "no_system_losses",
  "long_unoccupied_periods_explicit_interpolation_only",
  "heating_intermittency_explicit_correction_only",
  "no_hidden_defaults",
  "etaHgn_calculated_from_explicit_aH_when_etaHgn_missing",
  "aH_calculated_from_explicit_tauH_dependencies_when_aH_missing",
  "tauH_calculated_from_explicit_capacity_and_heat_transfer_coefficient",
  "no_default_aH0",
  "no_default_tauH0",
  "no_default_tauH",
  "no_default_capacity"
];
const EXCLUDED_BRANCHES = [
  "gammaH_less_or_equal_zero_without_positive_gains",
  "cooling_QCnd"
];
const FORBIDDEN_INPUT_KEYS = new Set([
  "restrictedHeatingQhndResult",
  "qHnd",
  "annualQHnd",
  "annualQHgn",
  "caseResults",
  "summary",
  "result",
  "results",
  "qHhtOrigin",
  "qHgnOrigin",
  "qHndOrigin",
  "heatGainsFormulaCode",
  "heatGainsScope",
  "tauHOrigin",
  "heatTransferCoefficientOrigin",
  "etaHgnOrigin",
  "etaHgnFormulaCode",
  "aHOrigin",
  "aHFormulaCode",
  "tauH",
  "tauHFormulaCode",
  "longUnoccupiedFormulaCode",
  "intermittencyOrigin",
  "intermittencyFormulaCode",
  "heatingIntermittencyResult",
  "heatingIntermittencyFormulaCode",
  "heatingIntermittencySourcePackCode",
  "formulaCode",
  "formulaReferences"
]);
const NORMAL_QHND_INPUT_KEYS = [
  "qHht",
  "explicitTotalHeatTransferResult",
  "qHgn",
  "internalGains",
  "solarGains",
  "monthlyHeatGainsResult",
  "heatingIntermittencyCorrection",
  "gammaH",
  "etaHgn",
  "aH",
  "utilizationDependencies"
];

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

function safeNotes(value) {
  return value === undefined ||
    (
      typeof value === "string" &&
      value.length <= 160 &&
      !/[<>{}]/.test(value)
    );
}

function hasForbiddenDerivedInput(value, path = []) {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((child, index) => hasForbiddenDerivedInput(child, [...path, String(index)]));
  }
  if (!isPlainObject(value)) {
    return true;
  }
  return Object.entries(value).some(([key, child]) => {
    const nextPath = [...path, key];
    const isAllowedC5ResultKey = key === "result" &&
      path[path.length - 1] === "explicitTotalHeatTransferResult";
    const isAllowedMonthlyHeatGainsResultKey = path.includes("monthlyHeatGainsResult") &&
      ["caseResults", "summary", "formulaCode", "formulaReferences", "annualQHgn"].includes(key);
    const isAllowedHeatingIntermittencyInputKey =
      path.includes("heatingIntermittencyCorrection") && key === "tauH";
    return (
      (
        !isAllowedC5ResultKey &&
        !isAllowedMonthlyHeatGainsResultKey &&
        !isAllowedHeatingIntermittencyInputKey &&
        FORBIDDEN_INPUT_KEYS.has(key)
      ) ||
      hasForbiddenDerivedInput(child, nextPath)
    );
  });
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults: [],
    summary: {
      annualQHnd: 0,
      caseCount: 0,
      monthCount: 0
    },
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedBranches: [...EXCLUDED_BRANCHES]
    }
  };
}

function uniqueMonthCount(caseResults) {
  return new Set(caseResults.map(result => result.month)).size;
}

function validateMonthlyCaseIdentifiers(cases) {
  const caseIds = new Set();
  for (const inputCase of cases) {
    if (!isPlainObject(inputCase) || !safeCode(inputCase.caseId, 96)) {
      return { ok: false, code: "invalid_monthly_case_identifier" };
    }
    if (caseIds.has(inputCase.caseId)) {
      return { ok: false, code: "duplicate_monthly_case_identifier" };
    }
    caseIds.add(inputCase.caseId);
  }
  return { ok: true };
}

function validateSource(source) {
  if (!isPlainObject(source) || !safeCode(source.reference, 96)) {
    return { ok: false, code: "restricted_qhnd_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "restricted_qhnd_invalid_source_notes" };
  }
  return { ok: true };
}

function hasInputValue(inputCase, key) {
  return inputCase[key] !== undefined && inputCase[key] !== null;
}

function hasAnyInputValue(inputCase, keys) {
  return keys.some(key => hasInputValue(inputCase, key));
}

function calculateEtaHgnFromExplicitAH(inputCase) {
  const etaResult = calculateMc001HeatingGainUtilizationFactor({
    mode: "restricted_heating_etaHgn_explicit_v1",
    cases: [
      {
        caseId: inputCase.caseId,
        gammaH: hasInputValue(inputCase, "gammaH") ? inputCase.gammaH : undefined,
        qHgn: inputCase.qHgn,
        qHht: inputCase.qHht,
        aH: inputCase.aH,
        source: {
          reference: inputCase.source.reference,
          notes: inputCase.source.notes
        }
      }
    ]
  });

  if (etaResult.status !== "ready" || etaResult.caseResults.length !== 1) {
    const etaCode = etaResult.diagnostics?.blockers?.[0]?.code || "unknown_etaHgn_blocker";
    return {
      ok: false,
      code: `restricted_qhnd_etaHgn_calculation_failed_${etaCode}`
    };
  }

  return {
    ok: true,
    value: etaResult.caseResults[0]
  };
}

function calculateAHFromExplicitUtilizationDependencies(inputCase) {
  const dependencies = inputCase.utilizationDependencies;
  if (!isPlainObject(dependencies)) {
    return { ok: false, code: "missing_explicit_utilization_dependencies_for_aH" };
  }

  const capacityInputs = [
    hasInputValue(dependencies, "effectiveInternalHeatCapacityJPerK"),
    hasInputValue(dependencies, "cmEffJPerK")
  ].filter(Boolean).length;
  if (capacityInputs > 1) {
    return { ok: false, code: "ambiguous_explicit_capacity_for_tauH" };
  }
  const effectiveInternalHeatCapacityJPerK = finiteNumber(
    hasInputValue(dependencies, "effectiveInternalHeatCapacityJPerK")
      ? dependencies.effectiveInternalHeatCapacityJPerK
      : dependencies.cmEffJPerK
  );
  if (effectiveInternalHeatCapacityJPerK === null) {
    return { ok: false, code: "missing_explicit_capacity_for_tauH" };
  }
  if (effectiveInternalHeatCapacityJPerK <= 0) {
    return { ok: false, code: "invalid_explicit_capacity_for_tauH" };
  }

  const heatTransferCoefficient = resolveExplicitHeatTransferCoefficientForTauH(dependencies);
  if (!heatTransferCoefficient.ok) return heatTransferCoefficient;

  const aH0 = finiteNumber(dependencies.aH0);
  if (aH0 === null) {
    return { ok: false, code: "missing_explicit_aH0_for_aH" };
  }
  if (aH0 < 0) {
    return { ok: false, code: "invalid_explicit_aH0_for_aH" };
  }

  const tauH0 = finiteNumber(dependencies.tauH0);
  if (tauH0 === null) {
    return { ok: false, code: "missing_explicit_tauH0_for_aH" };
  }
  if (tauH0 <= 0) {
    return { ok: false, code: "invalid_explicit_tauH0_for_aH" };
  }

  const tauH = (effectiveInternalHeatCapacityJPerK / 3600) / heatTransferCoefficient.value.heatTransferCoefficientWK;
  if (!Number.isFinite(tauH) || tauH <= 0) {
    return { ok: false, code: "invalid_explicit_tauH_result" };
  }

  const aH = aH0 + (tauH / tauH0);
  if (!Number.isFinite(aH) || aH <= 0) {
    return { ok: false, code: "invalid_explicit_aH_result" };
  }

  return {
    ok: true,
    value: {
      effectiveInternalHeatCapacityJPerK,
      heatTransferCoefficientWK: heatTransferCoefficient.value.heatTransferCoefficientWK,
      heatTransferCoefficientOrigin: heatTransferCoefficient.value.heatTransferCoefficientOrigin,
      ...(heatTransferCoefficient.value.heatTransferCoefficientComponents === undefined
        ? {}
        : { heatTransferCoefficientComponents: heatTransferCoefficient.value.heatTransferCoefficientComponents }),
      tauH,
      tauHOrigin: heatTransferCoefficient.value.tauHOrigin,
      tauH0,
      aH0,
      aH,
      aHOrigin: "calculated_from_explicit_tauH_dependencies",
      tauHFormulaCode: TAUH_FORMULA_CODE,
      aHFormulaCode: AH_FORMULA_CODE
    }
  };
}

function resolveExplicitHeatTransferCoefficientForTauH(dependencies) {
  const hasLegacyTotal = hasInputValue(dependencies, "heatTransferCoefficientWK");
  const hasNamedTotal = hasInputValue(dependencies, "totalHeatTransferCoefficientWK");
  const hasComponents = hasInputValue(dependencies, "heatTransferCoefficientComponents");
  const sourceCount = [hasLegacyTotal || hasNamedTotal, hasComponents].filter(Boolean).length;
  if (hasLegacyTotal && hasNamedTotal) {
    return { ok: false, code: "ambiguous_explicit_heat_transfer_coefficient_for_tauH" };
  }
  if (sourceCount > 1) {
    return { ok: false, code: "ambiguous_explicit_heat_transfer_coefficient_for_tauH" };
  }

  if (hasLegacyTotal || hasNamedTotal) {
    const heatTransferCoefficientWK = finiteNumber(
      hasLegacyTotal ? dependencies.heatTransferCoefficientWK : dependencies.totalHeatTransferCoefficientWK
    );
    if (heatTransferCoefficientWK === null) {
      return { ok: false, code: "missing_explicit_heat_transfer_coefficient_for_tauH" };
    }
    if (heatTransferCoefficientWK <= 0) {
      return { ok: false, code: "invalid_explicit_heat_transfer_coefficient_for_tauH" };
    }
    return {
      ok: true,
      value: {
        heatTransferCoefficientWK,
        heatTransferCoefficientOrigin: "explicit_total_heat_transfer_coefficient",
        tauHOrigin: "calculated_from_explicit_total_heat_transfer_coefficient"
      }
    };
  }

  if (!hasComponents) {
    return { ok: false, code: "missing_explicit_heat_transfer_coefficient_for_tauH" };
  }

  const components = dependencies.heatTransferCoefficientComponents;
  if (!isPlainObject(components)) {
    return { ok: false, code: "missing_explicit_heat_transfer_coefficient_component_for_tauH" };
  }

  const componentEntries = [
    ["transmissionCoefficientWK", components.transmissionCoefficientWK],
    ["groundAdjacentCoefficientWK", components.groundAdjacentCoefficientWK],
    ["ventilationCoefficientWK", components.ventilationCoefficientWK]
  ];
  const normalizedComponents = {};
  for (const [key, rawValue] of componentEntries) {
    const value = finiteNumber(rawValue);
    if (value === null) {
      return { ok: false, code: "missing_explicit_heat_transfer_coefficient_component_for_tauH" };
    }
    if (value < 0) {
      return { ok: false, code: "invalid_explicit_heat_transfer_coefficient_component_for_tauH" };
    }
    normalizedComponents[key] = value;
  }

  const heatTransferCoefficientWK = normalizedComponents.transmissionCoefficientWK +
    normalizedComponents.groundAdjacentCoefficientWK +
    normalizedComponents.ventilationCoefficientWK;
  if (!Number.isFinite(heatTransferCoefficientWK) || heatTransferCoefficientWK <= 0) {
    return { ok: false, code: "invalid_explicit_heat_transfer_coefficient_for_tauH" };
  }

  return {
    ok: true,
    value: {
      heatTransferCoefficientWK,
      heatTransferCoefficientOrigin: "explicit_heat_transfer_coefficient_components",
      heatTransferCoefficientComponents: normalizedComponents,
      tauHOrigin: "calculated_from_explicit_heat_transfer_coefficient_components"
    }
  };
}

function extractQHhtSource(inputCase, qHgn) {
  const hasDirectQHht = hasInputValue(inputCase, "qHht");
  const hasC5Transfer = hasInputValue(inputCase, "explicitTotalHeatTransferResult");
  const hasIntermittencyCorrection = hasInputValue(inputCase, "heatingIntermittencyCorrection");
  const sourceCount = [hasDirectQHht, hasC5Transfer, hasIntermittencyCorrection].filter(Boolean).length;
  if (sourceCount > 1) {
    return { ok: false, code: "ambiguous_QHht_source" };
  }

  if (hasDirectQHht) {
    const qHht = finiteNumber(inputCase.qHht);
    if (qHht === null || qHht <= 0) {
      return { ok: false, code: "restricted_qhnd_invalid_qHht" };
    }
    return {
      ok: true,
      value: {
        qHht,
        qHhtOrigin: "explicit_input"
      }
    };
  }

  if (hasC5Transfer) {
    const c5Result = inputCase.explicitTotalHeatTransferResult;
    if (
      !isPlainObject(c5Result) ||
      c5Result.status !== "ready" ||
      c5Result.scope !== C5_TOTAL_TRANSFER_SCOPE ||
      !isPlainObject(c5Result.result)
    ) {
      return { ok: false, code: "missing_explicit_C5_transfer_for_QHht" };
    }

    const amount = finiteNumber(c5Result.result.amount);
    if (
      c5Result.result.symbol !== C5_TOTAL_TRANSFER_SYMBOL ||
      c5Result.result.unit !== "kWh" ||
      amount === null ||
      amount <= 0
    ) {
      return { ok: false, code: "invalid_explicit_C5_transfer_for_QHht" };
    }

    return {
      ok: true,
      value: {
        qHht: amount,
        qHhtOrigin: C5_QHHT_ORIGIN,
        qHhtSourceScope: c5Result.scope,
        qHhtSourceSymbol: c5Result.result.symbol
      }
    };
  }

  if (hasIntermittencyCorrection) {
    const correction = inputCase.heatingIntermittencyCorrection;
    if (!isPlainObject(correction)) {
      return { ok: false, code: "missing_explicit_heating_intermittency_inputs_for_QHht" };
    }
    if (hasInputValue(correction, "qHgn")) {
      return { ok: false, code: "ambiguous_heating_intermittency_QHgn_source" };
    }
    const correctionResult = calculateMc001HeatingIntermittencyExplicit({
      mode: "heating_intermittency_explicit_v1",
      cases: [
        {
          caseId: `${inputCase.caseId}.heating_intermittency`,
          qHgn,
          ...correction,
          source: {
            reference: inputCase.source.reference,
            notes: inputCase.source.notes
          }
        }
      ]
    });
    if (correctionResult.status !== "ready" || correctionResult.caseResults.length !== 1) {
      const code = correctionResult.diagnostics?.blockers?.[0]?.code ||
        "unknown_heating_intermittency_blocker";
      return { ok: false, code: `restricted_qhnd_heating_intermittency_failed_${code}` };
    }
    const correctionCase = correctionResult.caseResults[0];
    return {
      ok: true,
      value: {
        qHht: correctionCase.qHht,
        qHhtOrigin: correctionCase.qHhtOrigin,
        qHhtSourceScope: correctionCase.scope,
        qHhtSourceSymbol: correctionCase.qHhtSourceSymbol,
        thetaIntSetH: correctionCase.thetaIntSetH,
        thetaExternal: correctionCase.thetaExternal,
        thetaIntCalcH: correctionCase.thetaIntCalcH,
        aHred: correctionCase.aHred,
        dThetaFloat: correctionCase.dThetaFloat,
        dThetaFloatBranch: correctionCase.dThetaFloatBranch,
        transmissionHeatTransferCoefficientWK:
          correctionCase.transmissionHeatTransferCoefficientWK,
        ventilationHeatTransferCoefficientWK:
          correctionCase.ventilationHeatTransferCoefficientWK,
        totalHeatTransferCoefficientWK: correctionCase.totalHeatTransferCoefficientWK,
        calculationDurationHours: correctionCase.calculationDurationHours,
        heatingIntermittencyPeriodResults: correctionCase.periodResults,
        heatingIntermittencyFormulaCode: correctionCase.heatingIntermittencyFormulaCode,
        heatingIntermittencySourcePackCode: correctionCase.heatingIntermittencySourcePackCode
      }
    };
  }

  return { ok: false, code: "restricted_qhnd_invalid_qHht" };
}

function qHhtSourceOutputFields(source) {
  return {
    qHhtOrigin: source.qHhtOrigin,
    ...(source.qHhtSourceScope === undefined ? {} : { qHhtSourceScope: source.qHhtSourceScope }),
    ...(source.qHhtSourceSymbol === undefined ? {} : { qHhtSourceSymbol: source.qHhtSourceSymbol }),
    ...(source.thetaIntSetH === undefined ? {} : { thetaIntSetH: source.thetaIntSetH }),
    ...(source.thetaExternal === undefined ? {} : { thetaExternal: source.thetaExternal }),
    ...(source.thetaIntCalcH === undefined ? {} : { thetaIntCalcH: source.thetaIntCalcH }),
    ...(source.aHred === undefined ? {} : { aHred: source.aHred }),
    ...(source.dThetaFloat === undefined ? {} : { dThetaFloat: source.dThetaFloat }),
    ...(source.dThetaFloatBranch === undefined ? {} : { dThetaFloatBranch: source.dThetaFloatBranch }),
    ...(source.transmissionHeatTransferCoefficientWK === undefined
      ? {}
      : { transmissionHeatTransferCoefficientWK: source.transmissionHeatTransferCoefficientWK }),
    ...(source.ventilationHeatTransferCoefficientWK === undefined
      ? {}
      : { ventilationHeatTransferCoefficientWK: source.ventilationHeatTransferCoefficientWK }),
    ...(source.totalHeatTransferCoefficientWK === undefined
      ? {}
      : { totalHeatTransferCoefficientWK: source.totalHeatTransferCoefficientWK }),
    ...(source.calculationDurationHours === undefined
      ? {}
      : { calculationDurationHours: source.calculationDurationHours }),
    ...(source.heatingIntermittencyPeriodResults === undefined
      ? {}
      : { heatingIntermittencyPeriodResults: source.heatingIntermittencyPeriodResults }),
    ...(source.heatingIntermittencyFormulaCode === undefined
      ? {}
      : { heatingIntermittencyFormulaCode: source.heatingIntermittencyFormulaCode }),
    ...(source.heatingIntermittencySourcePackCode === undefined
      ? {}
      : { heatingIntermittencySourcePackCode: source.heatingIntermittencySourcePackCode })
  };
}

function extractQHgn(inputCase) {
  const hasDirectQHgn = hasInputValue(inputCase, "qHgn");
  const hasGainComponents = hasAnyInputValue(inputCase, ["internalGains", "solarGains"]);
  const hasHeatGainsResult = hasInputValue(inputCase, "monthlyHeatGainsResult");
  const sourceCount = [hasDirectQHgn, hasGainComponents, hasHeatGainsResult].filter(Boolean).length;
  if (sourceCount > 1) {
    return { ok: false, code: "ambiguous_QHgn_source" };
  }

  if (hasDirectQHgn) {
    const qHgn = finiteNumber(inputCase.qHgn);
    if (qHgn === null || qHgn < 0) {
      return { ok: false, code: "restricted_qhnd_invalid_qHgn" };
    }
    return {
      ok: true,
      value: {
        qHgn,
        qHgnOrigin: "explicit_input"
      }
    };
  }

  if (hasGainComponents) {
    if (!hasInputValue(inputCase, "internalGains") || !hasInputValue(inputCase, "solarGains")) {
      return { ok: false, code: "incomplete_explicit_heat_gains_for_QHgn" };
    }
    const heatGains = calculateMc001MonthlyHeatGainsExplicit({
      mode: "monthly_heat_gains_explicit_v1",
      cases: [
        {
          caseId: `${inputCase.caseId}.heat_gains`,
          month: inputCase.month,
          internalGains: inputCase.internalGains,
          solarGains: inputCase.solarGains,
          source: {
            reference: inputCase.source.reference,
            notes: inputCase.source.notes
          }
        }
      ]
    });
    if (heatGains.status !== "ready" || heatGains.caseResults.length !== 1) {
      const gainsCode = heatGains.diagnostics?.blockers?.[0]?.code || "unknown_heat_gains_blocker";
      return { ok: false, code: `restricted_qhnd_heat_gains_calculation_failed_${gainsCode}` };
    }
    const heatGainsCase = heatGains.caseResults[0];
    return {
      ok: true,
      value: {
        qHgn: heatGainsCase.qHgn,
        qHgnOrigin: "calculated_from_explicit_internal_and_solar_gains",
        internalGains: heatGainsCase.internalGains,
        solarGains: heatGainsCase.solarGains,
        heatGainsFormulaCode: heatGainsCase.formulaCode,
        heatGainsScope: heatGainsCase.scope
      }
    };
  }

  if (!hasHeatGainsResult) {
    return { ok: false, code: "missing_explicit_QHgn_source" };
  }

  const heatGainsResult = inputCase.monthlyHeatGainsResult;
  if (
    !isPlainObject(heatGainsResult) ||
    heatGainsResult.status !== "ready" ||
    heatGainsResult.scope !== HEAT_GAINS_SCOPE ||
    !Array.isArray(heatGainsResult.caseResults) ||
    heatGainsResult.caseResults.length !== 1
  ) {
    return { ok: false, code: "missing_explicit_monthly_heat_gains_result_for_QHgn" };
  }

  const heatGainsCase = heatGainsResult.caseResults[0];
  const qHgn = finiteNumber(heatGainsCase?.qHgn);
  if (
    !isPlainObject(heatGainsCase) ||
    heatGainsCase.month !== inputCase.month ||
    heatGainsCase.formulaCode !== HEAT_GAINS_FORMULA_CODE ||
    heatGainsCase.scope !== HEAT_GAINS_SCOPE ||
    qHgn === null ||
    qHgn < 0
  ) {
    return { ok: false, code: "invalid_explicit_monthly_heat_gains_result_for_QHgn" };
  }

  return {
    ok: true,
    value: {
      qHgn,
      qHgnOrigin: "calculated_from_explicit_monthly_heat_gains_result",
      ...(finiteNumber(heatGainsCase.internalGains) === null ? {} : { internalGains: heatGainsCase.internalGains }),
      ...(finiteNumber(heatGainsCase.solarGains) === null ? {} : { solarGains: heatGainsCase.solarGains }),
      heatGainsFormulaCode: heatGainsCase.formulaCode,
      heatGainsScope: heatGainsCase.scope
    }
  };
}

function validateLongUnoccupiedPeriodAdjustmentCase(inputCase) {
  if (hasAnyInputValue(inputCase, NORMAL_QHND_INPUT_KEYS)) {
    return { ok: false, code: "ambiguous_long_unoccupied_qhnd_source" };
  }

  const adjustment = inputCase.longUnoccupiedPeriodAdjustment;
  if (!isPlainObject(adjustment)) {
    return { ok: false, code: "missing_explicit_long_unoccupied_adjustment_inputs" };
  }

  const qHndOccupied = finiteNumber(adjustment.qHndOccupied);
  const qHndUnoccupied = finiteNumber(adjustment.qHndUnoccupied);
  const unoccupiedFraction = finiteNumber(adjustment.unoccupiedFraction);
  if (
    qHndOccupied === null ||
    qHndUnoccupied === null ||
    unoccupiedFraction === null
  ) {
    return { ok: false, code: "missing_explicit_long_unoccupied_adjustment_inputs" };
  }
  if (qHndOccupied < 0 || qHndUnoccupied < 0) {
    return { ok: false, code: "invalid_explicit_long_unoccupied_QHnd" };
  }
  if (unoccupiedFraction < 0 || unoccupiedFraction > 1) {
    return { ok: false, code: "invalid_explicit_long_unoccupied_fraction" };
  }

  const qHnd = (1 - unoccupiedFraction) * qHndOccupied +
    unoccupiedFraction * qHndUnoccupied;
  if (!Number.isFinite(qHnd) || qHnd < 0) {
    return { ok: false, code: "invalid_explicit_long_unoccupied_QHnd" };
  }

  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      month: inputCase.month,
      qHndOccupied,
      qHndUnoccupied,
      unoccupiedFraction,
      qHnd,
      qHndOrigin: "calculated_from_explicit_long_unoccupied_interpolation",
      qHndBranch: "long_unoccupied_period_explicit_interpolation",
      longUnoccupiedFormulaCode: LONG_UNOCCUPIED_FORMULA_CODE,
      formulaCode: LONG_UNOCCUPIED_FORMULA_CODE,
      sourceReference: inputCase.source.reference
    }
  };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "restricted_qhnd_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase)) {
    return { ok: false, code: "restricted_qhnd_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "restricted_qhnd_invalid_case_id" };
  }
  if (!ALLOWED_MONTHS.includes(inputCase.month)) {
    return { ok: false, code: "restricted_qhnd_invalid_month" };
  }
  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  if (hasInputValue(inputCase, "longUnoccupiedPeriodAdjustment")) {
    return validateLongUnoccupiedPeriodAdjustmentCase(inputCase);
  }

  const qHgnSource = extractQHgn(inputCase);
  if (!qHgnSource.ok) return qHgnSource;
  const { qHgn } = qHgnSource.value;
  const qHhtSource = extractQHhtSource(inputCase, qHgn);
  if (!qHhtSource.ok) return qHhtSource;
  const { qHht } = qHhtSource.value;
  const gammaH = inputCase.gammaH === undefined || inputCase.gammaH === null
    ? qHgn / qHht
    : finiteNumber(inputCase.gammaH);
  if (gammaH === null) {
    return { ok: false, code: "restricted_qhnd_invalid_gammaH" };
  }

  if (gammaH <= 0 && qHgn > 0) {
    return {
      ok: true,
      value: {
        caseId: inputCase.caseId,
        month: inputCase.month,
        qHht,
        ...qHhtSourceOutputFields(qHhtSource.value),
        qHgn,
        qHgnOrigin: qHgnSource.value.qHgnOrigin,
        ...(qHgnSource.value.internalGains === undefined ? {} : { internalGains: qHgnSource.value.internalGains }),
        ...(qHgnSource.value.solarGains === undefined ? {} : { solarGains: qHgnSource.value.solarGains }),
        ...(qHgnSource.value.heatGainsFormulaCode === undefined ? {} : { heatGainsFormulaCode: qHgnSource.value.heatGainsFormulaCode }),
        ...(qHgnSource.value.heatGainsScope === undefined ? {} : { heatGainsScope: qHgnSource.value.heatGainsScope }),
        gammaH,
        etaHgnOrigin: "not_required_for_resolved_zero_qhnd_branch",
        qHndBranch: "gammaH_less_or_equal_zero_positive_gains_zero_demand",
        qHnd: 0,
        sourceReference: inputCase.source.reference
      }
    };
  }

  if (gammaH <= 0) {
    return { ok: false, code: "restricted_qhnd_gammaH_less_or_equal_zero" };
  }
  if (gammaH > 2) {
    return {
      ok: true,
      value: {
        caseId: inputCase.caseId,
        month: inputCase.month,
        qHht,
        ...qHhtSourceOutputFields(qHhtSource.value),
        qHgn,
        qHgnOrigin: qHgnSource.value.qHgnOrigin,
        ...(qHgnSource.value.internalGains === undefined ? {} : { internalGains: qHgnSource.value.internalGains }),
        ...(qHgnSource.value.solarGains === undefined ? {} : { solarGains: qHgnSource.value.solarGains }),
        ...(qHgnSource.value.heatGainsFormulaCode === undefined ? {} : { heatGainsFormulaCode: qHgnSource.value.heatGainsFormulaCode }),
        ...(qHgnSource.value.heatGainsScope === undefined ? {} : { heatGainsScope: qHgnSource.value.heatGainsScope }),
        gammaH,
        etaHgnOrigin: "not_required_for_gammaH_greater_than_two_zero_qhnd_branch",
        qHndBranch: "gammaH_greater_than_two_zero_demand",
        qHnd: 0,
        sourceReference: inputCase.source.reference
      }
    };
  }

  const hasEtaHgn = hasInputValue(inputCase, "etaHgn");
  const hasAH = hasInputValue(inputCase, "aH");
  const hasUtilizationDependencies = hasInputValue(inputCase, "utilizationDependencies");
  const utilizationPathCount = [hasEtaHgn, hasAH, hasUtilizationDependencies].filter(Boolean).length;
  if (hasEtaHgn && hasAH && !hasUtilizationDependencies) {
    return { ok: false, code: "etaHgn_and_aH_are_mutually_exclusive_in_c7c" };
  }
  if (utilizationPathCount > 1) {
    return { ok: false, code: "etaHgn_aH_and_utilization_dependencies_are_mutually_exclusive_in_c6g" };
  }
  if (utilizationPathCount === 0) {
    return { ok: false, code: "etaHgn_aH_or_utilization_dependencies_required" };
  }

  let etaHgn;
  let etaHgnOrigin;
  let aH;
  let etaHgnFormulaCode;
  let utilizationDependencyResult;

  if (hasEtaHgn) {
    etaHgn = finiteNumber(inputCase.etaHgn);
    if (etaHgn === null) {
      return { ok: false, code: "restricted_qhnd_missing_etaHgn" };
    }
    if (etaHgn < 0) {
      return { ok: false, code: "restricted_qhnd_invalid_etaHgn" };
    }
    etaHgnOrigin = "explicit_input";
  } else if (hasAH) {
    aH = finiteNumber(inputCase.aH);
    if (aH === null) {
      return { ok: false, code: "restricted_qhnd_missing_aH" };
    }
    if (aH <= 0) {
      return { ok: false, code: "restricted_qhnd_invalid_aH" };
    }
    const calculatedEta = calculateEtaHgnFromExplicitAH({
      ...inputCase,
      qHht,
      qHgn
    });
    if (!calculatedEta.ok) return calculatedEta;
    etaHgn = calculatedEta.value.etaHgn;
    aH = calculatedEta.value.aH;
    etaHgnFormulaCode = calculatedEta.value.formulaCode;
    etaHgnOrigin = "calculated_from_explicit_aH";
  } else {
    const calculatedAH = calculateAHFromExplicitUtilizationDependencies(inputCase);
    if (!calculatedAH.ok) return calculatedAH;
    utilizationDependencyResult = calculatedAH.value;
    aH = utilizationDependencyResult.aH;
    const calculatedEta = calculateEtaHgnFromExplicitAH({
      ...inputCase,
      qHht,
      qHgn,
      aH
    });
    if (!calculatedEta.ok) return calculatedEta;
    etaHgn = calculatedEta.value.etaHgn;
    etaHgnFormulaCode = calculatedEta.value.formulaCode;
    etaHgnOrigin = "calculated_from_explicit_time_constant_dependencies";
  }

  const qHnd = qHht - etaHgn * qHgn;
  if (!Number.isFinite(qHnd)) {
    return { ok: false, code: "restricted_qhnd_invalid_result" };
  }
  if (qHnd < 0) {
    return { ok: false, code: "restricted_qhnd_negative_result_outside_c6f_scope" };
  }
  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      month: inputCase.month,
      qHht,
      ...qHhtSourceOutputFields(qHhtSource.value),
      qHgn,
      qHgnOrigin: qHgnSource.value.qHgnOrigin,
      ...(qHgnSource.value.internalGains === undefined ? {} : { internalGains: qHgnSource.value.internalGains }),
      ...(qHgnSource.value.solarGains === undefined ? {} : { solarGains: qHgnSource.value.solarGains }),
      ...(qHgnSource.value.heatGainsFormulaCode === undefined ? {} : { heatGainsFormulaCode: qHgnSource.value.heatGainsFormulaCode }),
      ...(qHgnSource.value.heatGainsScope === undefined ? {} : { heatGainsScope: qHgnSource.value.heatGainsScope }),
      gammaH,
      etaHgn,
      etaHgnOrigin,
      ...(aH === undefined ? {} : { aH }),
      ...(etaHgnFormulaCode === undefined ? {} : { etaHgnFormulaCode }),
      ...(utilizationDependencyResult === undefined ? {} : utilizationDependencyResult),
      qHnd,
      sourceReference: inputCase.source.reference
    }
  };
}

export function calculateMc001RestrictedHeatingQhndExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("restricted_qhnd_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("restricted_qhnd_client_supplied_derived_result");
  }
  if (!hasInputValue(input, "cases")) {
    return blocked("missing_monthly_restricted_heating_cases");
  }
  if (!Array.isArray(input.cases)) {
    return blocked("invalid_monthly_restricted_heating_cases");
  }
  if (input.cases.length === 0) {
    return blocked("missing_monthly_restricted_heating_cases");
  }

  const isMonthlyAggregation = input.cases.length > 1;
  if (isMonthlyAggregation) {
    const monthlyCaseIdentifiers = validateMonthlyCaseIdentifiers(input.cases);
    if (!monthlyCaseIdentifiers.ok) return blocked(monthlyCaseIdentifiers.code);
  }

  const caseResults = [];
  let annualQHnd = 0;

  for (const inputCase of input.cases) {
    const validation = validateCase(inputCase);
    if (!validation.ok) {
      return blocked(isMonthlyAggregation ? "monthly_restricted_heating_case_failed" : validation.code);
    }
    annualQHnd += validation.value.qHnd;
    caseResults.push({
      ...validation.value,
      formulaCode: validation.value.formulaCode || FORMULA_CODE,
      scope: SCOPE
    });
  }

  return {
    status: "ready",
    scope: SCOPE,
    formulaReferences: [...FORMULA_REFERENCES],
    caseResults,
    summary: {
      annualQHnd,
      caseCount: caseResults.length,
      monthCount: uniqueMonthCount(caseResults)
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedBranches: [...EXCLUDED_BRANCHES]
    }
  };
}
