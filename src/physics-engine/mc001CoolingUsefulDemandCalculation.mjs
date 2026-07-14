import { calculateMc001CoolingHeatTransferUtilizationFactor } from "./mc001CoolingHeatTransferUtilizationFactorCalculation.mjs";
import { calculateMc001CoolingIntermittencyExplicit } from "./mc001CoolingIntermittencyCalculation.mjs";
import { calculateMc001MonthlyHeatGainsExplicit } from "./mc001MonthlyHeatGainsCalculation.mjs";
import { resolveEffectiveInternalHeatCapacityTable2_20Value } from "./datasets/mc001EffectiveInternalHeatCapacityTables.mjs";

const MODE = "restricted_cooling_qcnd_explicit_v1";
const SCOPE = "restricted_cooling_qcnd_explicit_input_only_not_full_mc001";
const FORMULA_REFERENCES = [
  "MC001_R12_COOLING_QCND_FORMULA_SOURCE_PACK",
  "MC001_R13_COOLING_UTILIZATION_FACTOR_SOURCE_PACK",
  "MC001_R14_COOLING_INTERMITTENCY_RELATIONS_2_74_TO_2_75_SOURCE_PACK",
  "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND",
  "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION",
  "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND"
];
const FORMULA_CODE = "MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND";
const LONG_UNOCCUPIED_FORMULA_CODE = "MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION";
const ANNUAL_FORMULA_CODE = "MC001_2_85_ANNUAL_COOLING_USEFUL_DEMAND";
const AC_FORMULA_CODE = "MC001_2_56_COOLING_UTILIZATION_PARAMETER";
const TAUC_FORMULA_CODE = "MC001_2_58_COOLING_TIME_CONSTANT";
const HEAT_GAINS_SCOPE = "monthly_heat_gains_explicit_input_only_not_full_QHnd";
const HEAT_GAINS_FORMULA_CODE = "MC001_EXPLICIT_MONTHLY_HEAT_GAINS_SUM";
const MONTHS = new Set([
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
]);
const METHODOLOGY_LIMITS = [
  "restricted_cooling_only",
  "explicit_input_only",
  "not_full_QCnd",
  "not_QHnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "cooling_long_unoccupied_periods_explicit_interpolation_only",
  "cooling_intermittency_explicit_reduction_only",
  "no_system_losses",
  "no_hidden_defaults",
  "etaCht_calculated_from_explicit_aC_when_etaCht_missing",
  "aC_calculated_from_explicit_tauC_dependencies_when_aC_missing",
  "tauC_calculated_from_explicit_capacity_and_heat_transfer_coefficient",
  "capacity_can_be_calculated_from_explicit_table_2_20_class_and_Ause",
  "no_default_aC0",
  "no_default_tauC0",
  "no_default_tauC",
  "no_default_capacity",
  "no_default_internal_gains",
  "no_default_solar_gains",
  "no_default_schedules"
];
const EXCLUDED_BRANCHES = [
  "heating_QHnd",
  "final_energy",
  "primary_energy",
  "CO2",
  "certificate"
];
const NORMAL_QCND_INPUT_KEYS = [
  "qCht",
  "qCgn",
  "internalGains",
  "solarGains",
  "monthlyHeatGainsResult",
  "gammaC",
  "etaCht",
  "aC",
  "utilizationDependencies",
  "aCred",
  "coolingIntermittency"
];
const FORBIDDEN_INPUT_KEYS = new Set([
  "restrictedCoolingQcndResult",
  "qCnd",
  "annualQCnd",
  "caseResults",
  "summary",
  "result",
  "results",
  "qChtOrigin",
  "qCgnOrigin",
  "qCndOrigin",
  "heatGainsFormulaCode",
  "heatGainsScope",
  "tauCOrigin",
  "heatTransferCoefficientOrigin",
  "effectiveInternalHeatCapacityOrigin",
  "effectiveInternalHeatCapacityFormulaCode",
  "etaChtOrigin",
  "etaChtFormulaCode",
  "aCOrigin",
  "aCFormulaCode",
  "tauC",
  "tauCFormulaCode",
  "aCredOrigin",
  "coolingIntermittencyFormulaCode",
  "coolingIntermittencySourcePackCode",
  "longUnoccupiedFormulaCode",
  "formulaCode",
  "formulaReferences"
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

function safeNotes(value) {
  return value === undefined ||
    (
      typeof value === "string" &&
      value.length <= 160 &&
      !/[<>{}]/.test(value)
    );
}

function hasInputValue(value, key) {
  return value[key] !== undefined && value[key] !== null;
}

function hasAnyInputValue(value, keys) {
  return keys.some(key => hasInputValue(value, key));
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
    const allowedHeatGainsResultKey = path.includes("monthlyHeatGainsResult") &&
      ["caseResults", "summary", "formulaCode", "formulaReferences", "annualQHgn"].includes(key);
    return (
      (!allowedHeatGainsResultKey && FORBIDDEN_INPUT_KEYS.has(key)) ||
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
      annualQCnd: 0,
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
      return { ok: false, code: "invalid_monthly_cooling_case_identifier" };
    }
    if (caseIds.has(inputCase.caseId)) {
      return { ok: false, code: "duplicate_monthly_cooling_case_identifier" };
    }
    caseIds.add(inputCase.caseId);
  }
  return { ok: true };
}

function validateSource(source) {
  if (!isPlainObject(source) || !safeCode(source.reference, 96)) {
    return { ok: false, code: "restricted_qcnd_missing_explicit_source" };
  }
  if (!safeNotes(source.notes)) {
    return { ok: false, code: "restricted_qcnd_invalid_source_notes" };
  }
  return { ok: true };
}

function extractQCgn(inputCase) {
  const hasDirectQCgn = hasInputValue(inputCase, "qCgn");
  const hasGainComponents = hasAnyInputValue(inputCase, ["internalGains", "solarGains"]);
  const hasHeatGainsResult = hasInputValue(inputCase, "monthlyHeatGainsResult");
  const sourceCount = [hasDirectQCgn, hasGainComponents, hasHeatGainsResult].filter(Boolean).length;
  if (sourceCount > 1) {
    return { ok: false, code: "ambiguous_QCgn_source" };
  }

  if (hasDirectQCgn) {
    const qCgn = finiteNumber(inputCase.qCgn);
    if (qCgn === null || qCgn < 0) {
      return { ok: false, code: "restricted_qcnd_invalid_qCgn" };
    }
    return {
      ok: true,
      value: {
        qCgn,
        qCgnOrigin: "explicit_input"
      }
    };
  }

  if (hasGainComponents) {
    if (!hasInputValue(inputCase, "internalGains") || !hasInputValue(inputCase, "solarGains")) {
      return { ok: false, code: "incomplete_explicit_heat_gains_for_QCgn" };
    }
    const heatGains = calculateMc001MonthlyHeatGainsExplicit({
      mode: "monthly_heat_gains_explicit_v1",
      cases: [
        {
          caseId: `${inputCase.caseId}.cooling_heat_gains`,
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
      return { ok: false, code: `restricted_qcnd_heat_gains_calculation_failed_${gainsCode}` };
    }
    const heatGainsCase = heatGains.caseResults[0];
    return {
      ok: true,
      value: {
        qCgn: heatGainsCase.qHgn,
        qCgnOrigin: "calculated_from_explicit_internal_and_solar_gains",
        internalGains: heatGainsCase.internalGains,
        solarGains: heatGainsCase.solarGains,
        heatGainsFormulaCode: heatGainsCase.formulaCode,
        heatGainsScope: heatGainsCase.scope
      }
    };
  }

  if (!hasHeatGainsResult) {
    return { ok: false, code: "missing_explicit_QCgn_source" };
  }

  const heatGainsResult = inputCase.monthlyHeatGainsResult;
  if (
    !isPlainObject(heatGainsResult) ||
    heatGainsResult.status !== "ready" ||
    heatGainsResult.scope !== HEAT_GAINS_SCOPE ||
    !Array.isArray(heatGainsResult.caseResults) ||
    heatGainsResult.caseResults.length !== 1
  ) {
    return { ok: false, code: "missing_explicit_monthly_heat_gains_result_for_QCgn" };
  }

  const heatGainsCase = heatGainsResult.caseResults[0];
  const qCgn = finiteNumber(heatGainsCase?.qHgn);
  if (
    !isPlainObject(heatGainsCase) ||
    heatGainsCase.month !== inputCase.month ||
    heatGainsCase.formulaCode !== HEAT_GAINS_FORMULA_CODE ||
    heatGainsCase.scope !== HEAT_GAINS_SCOPE ||
    qCgn === null ||
    qCgn < 0
  ) {
    return { ok: false, code: "invalid_explicit_monthly_heat_gains_result_for_QCgn" };
  }

  return {
    ok: true,
    value: {
      qCgn,
      qCgnOrigin: "calculated_from_explicit_monthly_heat_gains_result",
      ...(finiteNumber(heatGainsCase.internalGains) === null ? {} : { internalGains: heatGainsCase.internalGains }),
      ...(finiteNumber(heatGainsCase.solarGains) === null ? {} : { solarGains: heatGainsCase.solarGains }),
      heatGainsFormulaCode: heatGainsCase.formulaCode,
      heatGainsScope: heatGainsCase.scope
    }
  };
}

function resolveExplicitHeatTransferCoefficientForTauC(dependencies) {
  const hasLegacyTotal = hasInputValue(dependencies, "heatTransferCoefficientWK");
  const hasNamedTotal = hasInputValue(dependencies, "totalHeatTransferCoefficientWK");
  const hasComponents = hasInputValue(dependencies, "heatTransferCoefficientComponents");
  const sourceCount = [hasLegacyTotal || hasNamedTotal, hasComponents].filter(Boolean).length;
  if (hasLegacyTotal && hasNamedTotal) {
    return { ok: false, code: "ambiguous_explicit_heat_transfer_coefficient_for_tauC" };
  }
  if (sourceCount > 1) {
    return { ok: false, code: "ambiguous_explicit_heat_transfer_coefficient_for_tauC" };
  }

  if (hasLegacyTotal || hasNamedTotal) {
    const heatTransferCoefficientWK = finiteNumber(
      hasLegacyTotal ? dependencies.heatTransferCoefficientWK : dependencies.totalHeatTransferCoefficientWK
    );
    if (heatTransferCoefficientWK === null) {
      return { ok: false, code: "missing_explicit_heat_transfer_coefficient_for_tauC" };
    }
    if (heatTransferCoefficientWK <= 0) {
      return { ok: false, code: "invalid_explicit_heat_transfer_coefficient_for_tauC" };
    }
    return {
      ok: true,
      value: {
        heatTransferCoefficientWK,
        heatTransferCoefficientOrigin: "explicit_total_heat_transfer_coefficient",
        tauCOrigin: "calculated_from_explicit_total_heat_transfer_coefficient"
      }
    };
  }

  if (!hasComponents) {
    return { ok: false, code: "missing_explicit_heat_transfer_coefficient_for_tauC" };
  }

  const components = dependencies.heatTransferCoefficientComponents;
  if (!isPlainObject(components)) {
    return { ok: false, code: "missing_explicit_heat_transfer_coefficient_component_for_tauC" };
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
      return { ok: false, code: "missing_explicit_heat_transfer_coefficient_component_for_tauC" };
    }
    if (value < 0) {
      return { ok: false, code: "invalid_explicit_heat_transfer_coefficient_component_for_tauC" };
    }
    normalizedComponents[key] = value;
  }

  const heatTransferCoefficientWK = normalizedComponents.transmissionCoefficientWK +
    normalizedComponents.groundAdjacentCoefficientWK +
    normalizedComponents.ventilationCoefficientWK;
  if (!Number.isFinite(heatTransferCoefficientWK) || heatTransferCoefficientWK <= 0) {
    return { ok: false, code: "invalid_explicit_heat_transfer_coefficient_for_tauC" };
  }

  return {
    ok: true,
    value: {
      heatTransferCoefficientWK,
      heatTransferCoefficientOrigin: "explicit_heat_transfer_coefficient_components",
      heatTransferCoefficientComponents: normalizedComponents,
      tauCOrigin: "calculated_from_explicit_heat_transfer_coefficient_components"
    }
  };
}

function resolveEffectiveInternalHeatCapacityForTauC(dependencies) {
  if (
    hasInputValue(dependencies, "effectiveInternalHeatCapacityJPerK") ||
    hasInputValue(dependencies, "cmEffJPerK")
  ) {
    const effectiveInternalHeatCapacityJPerK = finiteNumber(
      hasInputValue(dependencies, "effectiveInternalHeatCapacityJPerK")
        ? dependencies.effectiveInternalHeatCapacityJPerK
        : dependencies.cmEffJPerK
    );
    if (effectiveInternalHeatCapacityJPerK === null) {
      return { ok: false, code: "missing_explicit_capacity_for_tauC" };
    }
    if (effectiveInternalHeatCapacityJPerK <= 0) {
      return { ok: false, code: "invalid_explicit_capacity_for_tauC" };
    }
    return {
      ok: true,
      value: {
        effectiveInternalHeatCapacityJPerK,
        effectiveInternalHeatCapacityOrigin: "explicit_input"
      }
    };
  }

  const hasTableClass =
    hasInputValue(dependencies, "effectiveInternalHeatCapacityTable2_20ClassId") ||
    hasInputValue(dependencies, "effectiveInternalHeatCapacityClassId");
  const hasTableArea =
    hasInputValue(dependencies, "usefulFloorAreaM2") ||
    hasInputValue(dependencies, "aUseM2");

  if (!hasTableClass && !hasTableArea) {
    return { ok: false, code: "missing_explicit_capacity_for_tauC" };
  }
  if (!hasTableClass || !hasTableArea) {
    return { ok: false, code: "incomplete_effective_capacity_table_2_20_source_for_tauC" };
  }

  const capacity = resolveEffectiveInternalHeatCapacityTable2_20Value({
    capacityClassId: hasInputValue(dependencies, "effectiveInternalHeatCapacityTable2_20ClassId")
      ? dependencies.effectiveInternalHeatCapacityTable2_20ClassId
      : dependencies.effectiveInternalHeatCapacityClassId,
    usefulFloorAreaM2: hasInputValue(dependencies, "usefulFloorAreaM2")
      ? dependencies.usefulFloorAreaM2
      : dependencies.aUseM2
  });
  if (capacity.status !== "ready") {
    const capacityCode = capacity.diagnostics?.blockers?.[0]?.code || "unknown_capacity_blocker";
    return { ok: false, code: `restricted_qcnd_effective_capacity_calculation_failed_${capacityCode}` };
  }

  return {
    ok: true,
    value: {
      effectiveInternalHeatCapacityJPerK: capacity.effectiveInternalHeatCapacityJPerK,
      effectiveInternalHeatCapacityOrigin: capacity.effectiveInternalHeatCapacityOrigin,
      effectiveInternalHeatCapacityFormulaCode: capacity.effectiveInternalHeatCapacityFormulaCode,
      effectiveInternalHeatCapacityClassId: capacity.capacityClassId,
      usefulFloorAreaM2: capacity.usefulFloorAreaM2,
      cmIntEffCoefficientJPerM2K: capacity.cmIntEffCoefficientJPerM2K
    }
  };
}

function calculateACFromExplicitUtilizationDependencies(inputCase) {
  const dependencies = inputCase.utilizationDependencies;
  if (!isPlainObject(dependencies)) {
    return { ok: false, code: "missing_explicit_utilization_dependencies_for_aC" };
  }

  const capacityInputs = [
    hasInputValue(dependencies, "effectiveInternalHeatCapacityJPerK"),
    hasInputValue(dependencies, "cmEffJPerK"),
    hasAnyInputValue(dependencies, [
      "effectiveInternalHeatCapacityTable2_20ClassId",
      "effectiveInternalHeatCapacityClassId",
      "usefulFloorAreaM2",
      "aUseM2"
    ])
  ].filter(Boolean).length;
  if (capacityInputs > 1) {
    return { ok: false, code: "ambiguous_explicit_capacity_for_tauC" };
  }
  const capacity = resolveEffectiveInternalHeatCapacityForTauC(dependencies);
  if (!capacity.ok) return capacity;

  const heatTransferCoefficient = resolveExplicitHeatTransferCoefficientForTauC(dependencies);
  if (!heatTransferCoefficient.ok) return heatTransferCoefficient;

  const aC0 = finiteNumber(dependencies.aC0);
  if (aC0 === null) {
    return { ok: false, code: "missing_explicit_aC0_for_aC" };
  }
  if (aC0 < 0) {
    return { ok: false, code: "invalid_explicit_aC0_for_aC" };
  }

  const tauC0 = finiteNumber(dependencies.tauC0);
  if (tauC0 === null) {
    return { ok: false, code: "missing_explicit_tauC0_for_aC" };
  }
  if (tauC0 <= 0) {
    return { ok: false, code: "invalid_explicit_tauC0_for_aC" };
  }

  const tauC = (capacity.value.effectiveInternalHeatCapacityJPerK / 3600) /
    heatTransferCoefficient.value.heatTransferCoefficientWK;
  if (!Number.isFinite(tauC) || tauC <= 0) {
    return { ok: false, code: "invalid_explicit_tauC_result" };
  }

  const aC = aC0 + (tauC / tauC0);
  if (!Number.isFinite(aC) || aC <= 0) {
    return { ok: false, code: "invalid_explicit_aC_result" };
  }

  return {
    ok: true,
    value: {
      ...capacity.value,
      heatTransferCoefficientWK: heatTransferCoefficient.value.heatTransferCoefficientWK,
      heatTransferCoefficientOrigin: heatTransferCoefficient.value.heatTransferCoefficientOrigin,
      ...(heatTransferCoefficient.value.heatTransferCoefficientComponents === undefined
        ? {}
        : { heatTransferCoefficientComponents: heatTransferCoefficient.value.heatTransferCoefficientComponents }),
      tauC,
      tauCOrigin: heatTransferCoefficient.value.tauCOrigin,
      tauC0,
      aC0,
      aC,
      aCOrigin: "calculated_from_explicit_tauC_dependencies",
      tauCFormulaCode: TAUC_FORMULA_CODE,
      aCFormulaCode: AC_FORMULA_CODE
    }
  };
}

function calculateEtaChtFromExplicitAC(inputCase) {
  const etaResult = calculateMc001CoolingHeatTransferUtilizationFactor({
    mode: "restricted_cooling_etaCht_explicit_v1",
    cases: [
      {
        caseId: inputCase.caseId,
        gammaC: hasInputValue(inputCase, "gammaC") ? inputCase.gammaC : undefined,
        qCgn: inputCase.qCgn,
        qCht: inputCase.qCht,
        aC: inputCase.aC,
        source: {
          reference: inputCase.source.reference,
          notes: inputCase.source.notes
        }
      }
    ]
  });

  if (etaResult.status !== "ready" || etaResult.caseResults.length !== 1) {
    const etaCode = etaResult.diagnostics?.blockers?.[0]?.code || "unknown_etaCht_blocker";
    return {
      ok: false,
      code: `restricted_qcnd_etaCht_calculation_failed_${etaCode}`
    };
  }

  return {
    ok: true,
    value: etaResult.caseResults[0]
  };
}

function extractACred(inputCase) {
  const hasDirectACred = hasInputValue(inputCase, "aCred");
  const hasCoolingIntermittency = hasInputValue(inputCase, "coolingIntermittency");
  if (hasDirectACred && hasCoolingIntermittency) {
    return { ok: false, code: "aCred_and_cooling_intermittency_are_mutually_exclusive" };
  }
  if (!hasDirectACred && !hasCoolingIntermittency) {
    return { ok: false, code: "aCred_or_cooling_intermittency_required" };
  }

  if (hasDirectACred) {
    const aCred = finiteNumber(inputCase.aCred);
    if (aCred === null || aCred < 0) {
      return { ok: false, code: "restricted_qcnd_invalid_aCred" };
    }
    return {
      ok: true,
      value: {
        aCred,
        aCredOrigin: "explicit_input"
      }
    };
  }

  const correction = inputCase.coolingIntermittency;
  if (!isPlainObject(correction)) {
    return { ok: false, code: "missing_explicit_cooling_intermittency_inputs_for_aCred" };
  }
  const correctionResult = calculateMc001CoolingIntermittencyExplicit({
    mode: "cooling_intermittency_explicit_v1",
    cases: [
      {
        caseId: `${inputCase.caseId}.cooling_intermittency`,
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
      "unknown_cooling_intermittency_blocker";
    return { ok: false, code: `restricted_qcnd_cooling_intermittency_failed_${code}` };
  }
  const correctionCase = correctionResult.caseResults[0];
  return {
    ok: true,
    value: {
      aCred: correctionCase.aCred,
      aCredOrigin: correctionCase.aCredOrigin,
      coolingIntermittencyScope: correctionCase.scope,
      weekendReductionDurationHours: correctionCase.weekendReductionDurationHours,
      weekendReductionRepetitionCount: correctionCase.weekendReductionRepetitionCount,
      ...(correctionCase.bCredWknd === undefined ? {} : { bCredWknd: correctionCase.bCredWknd }),
      fCredWknd: correctionCase.fCredWknd,
      coolingIntermittencyBranch: correctionCase.branch,
      coolingIntermittencyFormulaCode: correctionCase.formulaCode,
      weekFractionFormulaCode: correctionCase.weekFractionFormulaCode,
      coolingIntermittencySourcePackCode: correctionCase.coolingIntermittencySourcePackCode
    }
  };
}

function validateLongUnoccupiedPeriodAdjustmentCase(inputCase) {
  if (hasAnyInputValue(inputCase, NORMAL_QCND_INPUT_KEYS)) {
    return { ok: false, code: "ambiguous_long_unoccupied_qcnd_source" };
  }

  const adjustment = inputCase.longUnoccupiedPeriodAdjustment;
  if (!isPlainObject(adjustment)) {
    return { ok: false, code: "missing_explicit_cooling_long_unoccupied_adjustment_inputs" };
  }

  const qCndOccupied = finiteNumber(adjustment.qCndOccupied);
  const qCndUnoccupied = finiteNumber(adjustment.qCndUnoccupied);
  const unoccupiedFraction = finiteNumber(adjustment.unoccupiedFraction);
  if (
    qCndOccupied === null ||
    qCndUnoccupied === null ||
    unoccupiedFraction === null
  ) {
    return { ok: false, code: "missing_explicit_cooling_long_unoccupied_adjustment_inputs" };
  }
  if (qCndOccupied < 0 || qCndUnoccupied < 0) {
    return { ok: false, code: "invalid_explicit_cooling_long_unoccupied_QCnd" };
  }
  if (unoccupiedFraction < 0 || unoccupiedFraction > 1) {
    return { ok: false, code: "invalid_explicit_cooling_long_unoccupied_fraction" };
  }

  const qCnd = (1 - unoccupiedFraction) * qCndOccupied +
    unoccupiedFraction * qCndUnoccupied;
  if (!Number.isFinite(qCnd) || qCnd < 0) {
    return { ok: false, code: "invalid_explicit_cooling_long_unoccupied_QCnd" };
  }

  return {
    ok: true,
    value: {
      caseId: inputCase.caseId,
      month: inputCase.month,
      qCndOccupied,
      qCndUnoccupied,
      unoccupiedFraction,
      qCnd,
      qCndOrigin: "calculated_from_explicit_cooling_long_unoccupied_interpolation",
      qCndBranch: "long_unoccupied_period_explicit_interpolation",
      longUnoccupiedFormulaCode: LONG_UNOCCUPIED_FORMULA_CODE,
      formulaCode: LONG_UNOCCUPIED_FORMULA_CODE,
      sourceReference: inputCase.source.reference
    }
  };
}

function validateCase(inputCase) {
  if (!isPlainObject(inputCase)) {
    return { ok: false, code: "restricted_qcnd_invalid_case" };
  }
  if (hasForbiddenDerivedInput(inputCase)) {
    return { ok: false, code: "restricted_qcnd_client_supplied_derived_result" };
  }
  if (!safeCode(inputCase.caseId, 96)) {
    return { ok: false, code: "restricted_qcnd_invalid_case_id" };
  }
  if (!MONTHS.has(inputCase.month)) {
    return { ok: false, code: "restricted_qcnd_invalid_month" };
  }
  const source = validateSource(inputCase.source);
  if (!source.ok) return source;

  if (hasInputValue(inputCase, "longUnoccupiedPeriodAdjustment")) {
    return validateLongUnoccupiedPeriodAdjustmentCase(inputCase);
  }

  const qCht = finiteNumber(inputCase.qCht);
  if (qCht === null || qCht <= 0) {
    return { ok: false, code: "restricted_qcnd_invalid_qCht" };
  }
  const qCgnSource = extractQCgn(inputCase);
  if (!qCgnSource.ok) return qCgnSource;
  const { qCgn } = qCgnSource.value;
  const gammaC = inputCase.gammaC === undefined || inputCase.gammaC === null
    ? qCgn / qCht
    : finiteNumber(inputCase.gammaC);
  if (gammaC === null) {
    return { ok: false, code: "restricted_qcnd_invalid_gammaC" };
  }

  const common = {
    caseId: inputCase.caseId,
    month: inputCase.month,
    qCht,
    qChtOrigin: "explicit_input",
    qCgn,
    qCgnOrigin: qCgnSource.value.qCgnOrigin,
    ...(qCgnSource.value.internalGains === undefined ? {} : { internalGains: qCgnSource.value.internalGains }),
    ...(qCgnSource.value.solarGains === undefined ? {} : { solarGains: qCgnSource.value.solarGains }),
    ...(qCgnSource.value.heatGainsFormulaCode === undefined ? {} : { heatGainsFormulaCode: qCgnSource.value.heatGainsFormulaCode }),
    ...(qCgnSource.value.heatGainsScope === undefined ? {} : { heatGainsScope: qCgnSource.value.heatGainsScope }),
    gammaC,
    sourceReference: inputCase.source.reference
  };

  if (gammaC <= 0) {
    return {
      ok: true,
      value: {
        ...common,
        etaChtOrigin: "not_required_for_gammaC_less_or_equal_zero_zero_cooling_demand",
        aCredOrigin: "not_required_for_gammaC_less_or_equal_zero_zero_cooling_demand",
        qCndBranch: "gammaC_less_or_equal_zero_zero_demand",
        qCnd: 0
      }
    };
  }

  if ((1 / gammaC) > 2) {
    return {
      ok: true,
      value: {
        ...common,
        etaChtOrigin: "not_required_for_inverse_gammaC_greater_than_two_zero_cooling_demand",
        aCredOrigin: "not_required_for_inverse_gammaC_greater_than_two_zero_cooling_demand",
        qCndBranch: "inverse_gammaC_greater_than_two_zero_demand",
        qCnd: 0
      }
    };
  }

  const hasEtaCht = hasInputValue(inputCase, "etaCht");
  const hasAC = hasInputValue(inputCase, "aC");
  const hasUtilizationDependencies = hasInputValue(inputCase, "utilizationDependencies");
  const utilizationPathCount = [hasEtaCht, hasAC, hasUtilizationDependencies].filter(Boolean).length;
  if (utilizationPathCount > 1) {
    return { ok: false, code: "etaCht_aC_and_utilization_dependencies_are_mutually_exclusive" };
  }
  if (utilizationPathCount === 0) {
    return { ok: false, code: "etaCht_aC_or_utilization_dependencies_required" };
  }

  let etaCht;
  let etaChtOrigin;
  let aC;
  let etaChtFormulaCode;
  let utilizationDependencyResult;

  if (hasEtaCht) {
    etaCht = finiteNumber(inputCase.etaCht);
    if (etaCht === null || etaCht < 0) {
      return { ok: false, code: "restricted_qcnd_invalid_etaCht" };
    }
    etaChtOrigin = "explicit_input";
  } else if (hasAC) {
    aC = finiteNumber(inputCase.aC);
    if (aC === null || aC <= 0) {
      return { ok: false, code: "restricted_qcnd_invalid_aC" };
    }
    const calculatedEta = calculateEtaChtFromExplicitAC({
      ...inputCase,
      qCht,
      qCgn
    });
    if (!calculatedEta.ok) return calculatedEta;
    etaCht = calculatedEta.value.etaCht;
    aC = calculatedEta.value.aC;
    etaChtFormulaCode = calculatedEta.value.formulaCode;
    etaChtOrigin = "calculated_from_explicit_aC";
  } else {
    const calculatedAC = calculateACFromExplicitUtilizationDependencies(inputCase);
    if (!calculatedAC.ok) return calculatedAC;
    utilizationDependencyResult = calculatedAC.value;
    aC = utilizationDependencyResult.aC;
    const calculatedEta = calculateEtaChtFromExplicitAC({
      ...inputCase,
      qCht,
      qCgn,
      aC
    });
    if (!calculatedEta.ok) return calculatedEta;
    etaCht = calculatedEta.value.etaCht;
    etaChtFormulaCode = calculatedEta.value.formulaCode;
    etaChtOrigin = "calculated_from_explicit_time_constant_dependencies";
  }

  const aCred = extractACred(inputCase);
  if (!aCred.ok) return aCred;

  const qCnd = aCred.value.aCred * (qCgn - etaCht * qCht);
  if (!Number.isFinite(qCnd)) {
    return { ok: false, code: "restricted_qcnd_invalid_result" };
  }
  if (qCnd < 0) {
    return { ok: false, code: "restricted_qcnd_negative_result_outside_cooling_scope" };
  }

  return {
    ok: true,
    value: {
      ...common,
      etaCht,
      etaChtOrigin,
      ...(aC === undefined ? {} : { aC }),
      ...(etaChtFormulaCode === undefined ? {} : { etaChtFormulaCode }),
      ...(utilizationDependencyResult === undefined ? {} : utilizationDependencyResult),
      ...aCred.value,
      qCnd,
      qCndBranch: "figure_2_19_cooling_utilized_transfer_branch"
    }
  };
}

export function calculateMc001CoolingUsefulDemandExplicit(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("restricted_qcnd_invalid_mode");
  }
  if (hasForbiddenDerivedInput(input)) {
    return blocked("restricted_qcnd_client_supplied_derived_result");
  }
  if (!hasInputValue(input, "cases")) {
    return blocked("missing_monthly_restricted_cooling_cases");
  }
  if (!Array.isArray(input.cases)) {
    return blocked("invalid_monthly_restricted_cooling_cases");
  }
  if (input.cases.length === 0) {
    return blocked("missing_monthly_restricted_cooling_cases");
  }

  const monthlyCaseIdentifiers = validateMonthlyCaseIdentifiers(input.cases);
  if (!monthlyCaseIdentifiers.ok) return blocked(monthlyCaseIdentifiers.code);

  const caseResults = [];
  let annualQCnd = 0;

  for (const inputCase of input.cases) {
    const validation = validateCase(inputCase);
    if (!validation.ok) {
      return blocked(input.cases.length > 1 ? "monthly_restricted_cooling_case_failed" : validation.code);
    }
    annualQCnd += validation.value.qCnd;
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
      annualQCnd,
      caseCount: caseResults.length,
      monthCount: uniqueMonthCount(caseResults),
      annualFormulaCode: ANNUAL_FORMULA_CODE
    },
    diagnostics: {
      blockers: [],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS],
      excludedBranches: [...EXCLUDED_BRANCHES]
    }
  };
}
