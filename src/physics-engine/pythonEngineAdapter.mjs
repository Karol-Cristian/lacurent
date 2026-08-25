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

export function normalizePhysicsEngineMode(mode = PHYSICS_ENGINE_MODES.JAVASCRIPT) {
  if (Object.values(PHYSICS_ENGINE_MODES).includes(mode)) return mode;
  return PHYSICS_ENGINE_MODES.JAVASCRIPT;
}

function annualChapter2Value(result, key) {
  return result?.chapter2?.annual?.[key] ??
    result?.chapter2?.result?.annual?.[key] ??
    result?.chapter2?.result?.annual?.[key.replace("KWh", "")] ??
    null;
}

export function compareEngineOutputs(left, right, tolerance = COMPARISON_TOLERANCE) {
  const comparisons = [
    ["chapter2.annual.qHndKWh", annualChapter2Value(left, "qHndKWh"), annualChapter2Value(right, "qHndKWh")],
    ["chapter2.annual.qCndKWh", annualChapter2Value(left, "qCndKWh"), annualChapter2Value(right, "qCndKWh")]
  ].map(([path, leftValue, rightValue]) => {
    const numeric = Number.isFinite(leftValue) && Number.isFinite(rightValue);
    const absoluteDifference = numeric ? Math.abs(leftValue - rightValue) : null;
    return {
      path,
      leftValue,
      rightValue,
      absoluteDifference,
      status: numeric && absoluteDifference <= tolerance ? "PASS" : "SKIPPED_OR_MISMATCH"
    };
  });
  return {
    schema: "lacurent_engine_parity_summary_v1",
    status: comparisons.every(item => item.status === "PASS") ? "PASS" : "NEEDS_REVIEW",
    tolerance,
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
