import {
  calculateMc001DirectTransmissionCoefficient,
  calculateMc001GlobalTransmissionExcludingGround,
  calculateMc001ThermalBridgeGlobalCoefficient,
  calculateMc001TransmissionTotalCoefficient
} from "./mc001TransmissionFormulaCalculations.mjs";

const SCOPE = "integrated_transmission_explicit_input_only_not_full_mc001_certificate";
const MODE = "explicit_input_integrated_transmission_v1";
const WARNING_THERMAL_BRIDGE_SEPARATE = "thermal_bridge_not_auto_added_to_2_15_total_in_c2";
const EXPLICIT_NO_BRIDGES_NOTE = "explicit_no_thermal_bridges";
const FORMULA_CODES = [
  "MC001_2_12_HD_DIRECT_TRANSMISSION",
  "MC001_2_27_GLOBAL_TRANSMISSION_EXCLUDING_GROUND",
  "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
  "MC001_2_15_HTR_TOTAL_TRANSMISSION"
];
const METHODOLOGY_LIMITS = [
  "ground_coefficient_explicit_input_only",
  "hu_coefficient_explicit_input_only",
  "ha_coefficient_explicit_input_only",
  "not_QHnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate"
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

function sourceIsExplicit(source) {
  return isPlainObject(source) &&
    source.sourceType === "explicit_user_input" &&
    safeCode(source.reference, 96);
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: SCOPE,
    formulaCodes: [...FORMULA_CODES],
    results: {},
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

function valueAmount(value, unit) {
  return isPlainObject(value) && value.unit === unit ? finiteNumber(value.amount) : null;
}

function sourceFromDirectInput(input) {
  return input.directTransmission.elements[0].source;
}

function explicitCoefficient(input, key, code) {
  const value = input[key];
  const amount = valueAmount(value, "W/K");
  if (amount === null || amount < 0 || !sourceIsExplicit(value?.source)) {
    return { ok: false, code };
  }
  return { ok: true, amount, source: value.source };
}

function explicitNoThermalBridgeResult() {
  return {
    status: "ready",
    formulaCode: "MC001_2_28_THERMAL_BRIDGE_GLOBAL_COEFFICIENT",
    relationCode: "2.28",
    result: { symbol: "H_tr;tb;zt", amount: 0, unit: "W/K" },
    terms: [],
    notes: [EXPLICIT_NO_BRIDGES_NOTE],
    blockers: []
  };
}

function ensureReady(result, code) {
  return result?.status === "ready" ? { ok: true, result } : { ok: false, code };
}

export function calculateMc001IntegratedTransmissionResult(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("blocked_invalid_integrated_transmission_mode");
  }
  if (!isPlainObject(input.directTransmission) ||
      !Array.isArray(input.directTransmission.elements) ||
      input.directTransmission.elements.length === 0) {
    return blocked("blocked_missing_direct_transmission_elements");
  }
  if (!isPlainObject(input.thermalBridges) || !Array.isArray(input.thermalBridges.bridges)) {
    return blocked("blocked_missing_thermal_bridge_inputs");
  }

  const ground = explicitCoefficient(input, "ground", "blocked_invalid_ground_coefficient");
  if (!ground.ok) return blocked(ground.code);
  const hu = explicitCoefficient(
    input,
    "throughUnconditionedSpaces",
    "blocked_invalid_hu_coefficient"
  );
  if (!hu.ok) return blocked(hu.code);
  const ha = explicitCoefficient(input, "adjacentBuildings", "blocked_invalid_ha_coefficient");
  if (!ha.ok) return blocked(ha.code);

  const hd = ensureReady(
    calculateMc001DirectTransmissionCoefficient(input.directTransmission),
    "blocked_invalid_direct_transmission_calculation"
  );
  if (!hd.ok) return blocked(hd.code);

  let thermalBridgeGlobal;
  if (input.thermalBridges.bridges.length > 0) {
    const bridgeResult = ensureReady(
      calculateMc001ThermalBridgeGlobalCoefficient({
        bridges: input.thermalBridges.bridges
      }),
      "blocked_invalid_thermal_bridge_calculation"
    );
    if (!bridgeResult.ok) return blocked(bridgeResult.code);
    thermalBridgeGlobal = bridgeResult.result;
  } else if (input.thermalBridges.explicitNoThermalBridges === true) {
    thermalBridgeGlobal = explicitNoThermalBridgeResult();
  } else {
    return blocked("blocked_missing_thermal_bridge_inputs");
  }

  const source = sourceFromDirectInput(input);
  const transmissionExcludingGround = ensureReady(
    calculateMc001GlobalTransmissionExcludingGround({
      elementTransmissionCoefficients: [{
        elementId: "direct_transmission_hd",
        amount: hd.result.result.amount,
        unit: "W/K",
        source
      }],
      thermalBridgeCoefficient: {
        amount: thermalBridgeGlobal.result.amount,
        unit: "W/K",
        source
      }
    }),
    "blocked_invalid_excluding_ground_calculation"
  );
  if (!transmissionExcludingGround.ok) return blocked(transmissionExcludingGround.code);

  const htrTotal215 = ensureReady(
    calculateMc001TransmissionTotalCoefficient({
      hd: { amount: hd.result.result.amount, unit: "W/K" },
      hg: { amount: ground.amount, unit: "W/K" },
      hu: { amount: hu.amount, unit: "W/K" },
      ha: { amount: ha.amount, unit: "W/K" }
    }),
    "blocked_invalid_htr_2_15_calculation"
  );
  if (!htrTotal215.ok) return blocked(htrTotal215.code);

  return {
    status: "ready",
    scope: SCOPE,
    formulaCodes: [...FORMULA_CODES],
    results: {
      hd: hd.result,
      thermalBridgeGlobal,
      transmissionExcludingGround: transmissionExcludingGround.result,
      htrTotal215: htrTotal215.result
    },
    diagnostics: {
      blockers: [],
      warnings: [WARNING_THERMAL_BRIDGE_SEPARATE],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}
