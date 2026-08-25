import {
  ENGINE_OUTPUT_SCHEMA_VERSION,
  normalizePhysicsEngineOutputContract
} from "./engineContract.mjs";

export const PHYSICS_ENGINE_MODES = Object.freeze({
  JAVASCRIPT: "javascript",
  PYTHON: "python",
  DUAL: "dual"
});

const COMPARISON_TOLERANCE = 1e-7;
const AGGREGATED_COMPARISON_TOLERANCE = 1e-6;

export function normalizePhysicsEngineMode(mode = PHYSICS_ENGINE_MODES.JAVASCRIPT) {
  if (Object.values(PHYSICS_ENGINE_MODES).includes(mode)) return mode;
  return PHYSICS_ENGINE_MODES.JAVASCRIPT;
}

function annualChapter2Value(result, key) {
  return result?.chapter2?.annual?.[key] ??
    result?.chapter2?.result?.annual?.[key] ??
    result?.chapter2?.result?.annual?.[key.replace("KWh", "")] ??
    (key === "qHndKWh" ? result?.chapter2?.result?.heatingResult?.summary?.annualQHnd : null) ??
    (key === "qCndKWh" ? result?.chapter2?.result?.coolingResult?.summary?.annualQCnd : null) ??
    null;
}

function chapter2MonthlyValue(result, index, key) {
  return result?.chapter2?.monthly?.[index]?.[key] ??
    result?.chapter2?.result?.monthlyResults?.[index]?.[key] ??
    (key === "qHndKWh" ? result?.chapter2?.result?.heatingResult?.caseResults?.[index]?.qHnd : null) ??
    (key === "qCndKWh" ? result?.chapter2?.result?.coolingResult?.caseResults?.[index]?.qCnd : null) ??
    null;
}

function chapter3AnnualValue(result, key) {
  return result?.chapter3?.annual?.[key] ??
    result?.chapter3?.result?.annual?.[key] ??
    result?.chapter3?.[key] ??
    null;
}

function carrierValue(result, key) {
  return result?.energyCarriers?.[key] ??
    result?.chapter3?.energyByCarrier?.[key] ??
    result?.chapter3?.result?.energyByCarrier?.[key] ??
    null;
}

function chapter4AnnualPv(result) {
  return result?.chapter4?.annualProductionKWh ??
    result?.chapter4?.photovoltaic?.annualProductionKWh ??
    null;
}

function diagnosticCodes(result) {
  const diagnostics = result?.diagnostics;
  if (Array.isArray(diagnostics)) return diagnostics.map(item => item.code).filter(Boolean).sort();
  if (Array.isArray(diagnostics?.blockers)) return diagnostics.blockers.map(item => item.code).filter(Boolean).sort();
  return [];
}

function addNumericComparison(rows, path, leftValue, rightValue, tolerance) {
  if (leftValue === null && rightValue === null) return;
  rows.push([path, leftValue, rightValue, tolerance]);
}

export function compareEngineOutputs(left, right, tolerance = COMPARISON_TOLERANCE) {
  const rows = [];
  addNumericComparison(rows, "chapter2.annual.qHndKWh", annualChapter2Value(left, "qHndKWh"), annualChapter2Value(right, "qHndKWh"), tolerance);
  addNumericComparison(rows, "chapter2.annual.qCndKWh", annualChapter2Value(left, "qCndKWh"), annualChapter2Value(right, "qCndKWh"), tolerance);
  for (let index = 0; index < 12; index += 1) {
    addNumericComparison(rows, `chapter2.monthly[${index}].qHndKWh`, chapter2MonthlyValue(left, index, "qHndKWh"), chapter2MonthlyValue(right, index, "qHndKWh"), tolerance);
    addNumericComparison(rows, `chapter2.monthly[${index}].qCndKWh`, chapter2MonthlyValue(left, index, "qCndKWh"), chapter2MonthlyValue(right, index, "qCndKWh"), tolerance);
  }
  for (const key of [
    "heatingInputKWh",
    "coolingInputKWh",
    "coolingSuppliedUsefulKWh",
    "coolingUnmetLoadKWh",
    "dhwInputKWh",
    "ventilationAuxiliaryKWh",
    "sharedGeneratorFuelInputKWh",
    "sharedGeneratorLossKWh",
    "sharedGeneratorAuxiliaryKWh"
  ]) {
    addNumericComparison(rows, `chapter3.annual.${key}`, chapter3AnnualValue(left, key), chapter3AnnualValue(right, key), AGGREGATED_COMPARISON_TOLERANCE);
  }
  for (const carrier of ["electricity", "natural_gas", "district_heat"]) {
    addNumericComparison(rows, `energyCarriers.${carrier}`, carrierValue(left, carrier), carrierValue(right, carrier), AGGREGATED_COMPARISON_TOLERANCE);
  }
  addNumericComparison(rows, "chapter4.annualProductionKWh", chapter4AnnualPv(left), chapter4AnnualPv(right), AGGREGATED_COMPARISON_TOLERANCE);

  const comparisons = rows.map(([path, leftValue, rightValue, rowTolerance]) => {
    const numeric = Number.isFinite(leftValue) && Number.isFinite(rightValue);
    const absoluteDifference = numeric ? Math.abs(leftValue - rightValue) : null;
    return {
      path,
      leftValue,
      rightValue,
      absoluteDifference,
      tolerance: rowTolerance,
      status: numeric && absoluteDifference <= rowTolerance ? "PASS" : "SKIPPED_OR_MISMATCH"
    };
  });
  const leftCodes = diagnosticCodes(left);
  const rightCodes = diagnosticCodes(right);
  comparisons.unshift({
    path: "status",
    leftValue: left?.status ?? null,
    rightValue: right?.status ?? null,
    absoluteDifference: null,
    tolerance: "exact",
    status: (left?.status ?? null) === (right?.status ?? null) ? "PASS" : "SKIPPED_OR_MISMATCH"
  });
  comparisons.push({
    path: "diagnosticCodes",
    leftValue: leftCodes,
    rightValue: rightCodes,
    absoluteDifference: null,
    tolerance: "exact",
    status: JSON.stringify(leftCodes) === JSON.stringify(rightCodes) ? "PASS" : "SKIPPED_OR_MISMATCH"
  });
  return {
    schema: "lacurent_engine_parity_summary_v1",
    status: comparisons.every(item => item.status === "PASS") ? "PASS" : "NEEDS_REVIEW",
    tolerance,
    tolerancePolicy: {
      exact: ["diagnosticCodes"],
      tightNumericalAbsolute: COMPARISON_TOLERANCE,
      aggregatedNumericalAbsolute: AGGREGATED_COMPARISON_TOLERANCE
    },
    comparisons
  };
}

export async function calculateWithPhysicsEngineMode({
  engineInput,
  engineMode = PHYSICS_ENGINE_MODES.JAVASCRIPT,
  jsCalculate,
  pythonCalculate
}) {
  const mode = normalizePhysicsEngineMode(engineMode);
  if (typeof jsCalculate !== "function") {
    throw new Error("jsCalculate callback is required");
  }
  if (mode !== PHYSICS_ENGINE_MODES.JAVASCRIPT && typeof pythonCalculate !== "function") {
    throw new Error("pythonCalculate callback is required for python or dual engine mode");
  }

  if (mode === PHYSICS_ENGINE_MODES.JAVASCRIPT) {
    const jsResult = await jsCalculate(engineInput);
    return {
      schemaVersion: ENGINE_OUTPUT_SCHEMA_VERSION,
      engineMode: mode,
      primaryEngine: PHYSICS_ENGINE_MODES.JAVASCRIPT,
      primaryResult: normalizePhysicsEngineOutputContract(jsResult, PHYSICS_ENGINE_MODES.JAVASCRIPT)
    };
  }

  if (mode === PHYSICS_ENGINE_MODES.PYTHON) {
    const pythonResult = await pythonCalculate(engineInput);
    return {
      schemaVersion: ENGINE_OUTPUT_SCHEMA_VERSION,
      engineMode: mode,
      primaryEngine: PHYSICS_ENGINE_MODES.PYTHON,
      primaryResult: normalizePhysicsEngineOutputContract(pythonResult, PHYSICS_ENGINE_MODES.PYTHON)
    };
  }

  const jsResult = normalizePhysicsEngineOutputContract(
    await jsCalculate(engineInput),
    PHYSICS_ENGINE_MODES.JAVASCRIPT
  );
  const pythonResult = normalizePhysicsEngineOutputContract(
    await pythonCalculate(engineInput),
    PHYSICS_ENGINE_MODES.PYTHON
  );
  return {
    schemaVersion: ENGINE_OUTPUT_SCHEMA_VERSION,
    engineMode: mode,
    primaryEngine: PHYSICS_ENGINE_MODES.JAVASCRIPT,
    primaryResult: jsResult,
    shadowEngine: PHYSICS_ENGINE_MODES.PYTHON,
    shadowResult: pythonResult,
    parity: compareEngineOutputs(jsResult, pythonResult)
  };
}
