const MODE = "explicit_total_heat_transfer_summary_v1";
const SCOPE = "explicit_transmission_plus_ventilation_heat_transfer_only_not_QHnd";
const ALLOWED_SOURCE_TYPES = [
  "explicit_calculated_input",
  "explicit_user_input"
];
const METHODOLOGY_LIMITS = [
  "not_QHnd",
  "not_final_energy",
  "not_primary_energy",
  "not_CO2",
  "not_certificate",
  "does_not_include_internal_gains",
  "does_not_include_solar_gains",
  "does_not_include_utilization_factors",
  "does_not_include_system_losses",
  "does_not_include_fan_electricity",
  "does_not_include_air_treatment_energy"
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeCode(value, maxLength = 128) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    /^[a-zA-Z0-9_.:-]+$/.test(value);
}

function sourceIsAllowed(source) {
  return isPlainObject(source) &&
    ALLOWED_SOURCE_TYPES.includes(source.sourceType) &&
    safeCode(source.reference, 128);
}

function energyAmount(value, missingCode) {
  if (!isPlainObject(value)) {
    return { ok: false, code: missingCode };
  }
  if (value.unit !== "kWh") {
    return { ok: false, code: "blocked_invalid_energy_unit" };
  }
  const amount = finiteNumber(value.amount);
  if (amount === null) {
    return { ok: false, code: "blocked_invalid_energy_amount" };
  }
  if (!sourceIsAllowed(value.source)) {
    return { ok: false, code: "blocked_missing_explicit_source" };
  }
  return { ok: true, amount };
}

function blocker(code) {
  return { code, severity: "blocking" };
}

function blocked(code) {
  return {
    status: "blocked",
    scope: SCOPE,
    result: null,
    components: {},
    diagnostics: {
      blockers: [blocker(code)],
      warnings: [],
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}

export function calculateMc001ExplicitTotalHeatTransferSummary(input = {}) {
  if (!isPlainObject(input) || input.mode !== MODE) {
    return blocked("blocked_invalid_total_heat_transfer_mode");
  }

  const transmission = energyAmount(
    input.transmissionEnergy,
    "blocked_missing_transmission_energy"
  );
  if (!transmission.ok) return blocked(transmission.code);

  const ventilation = energyAmount(
    input.ventilationEnergy,
    "blocked_missing_ventilation_energy"
  );
  if (!ventilation.ok) return blocked(ventilation.code);

  const warnings = [];
  if (transmission.amount < 0 || ventilation.amount < 0) {
    warnings.push({ code: "signed_energy_component_present", severity: "warning" });
  }

  return {
    status: "ready",
    scope: SCOPE,
    result: {
      symbol: "Q_total_transfer_explicit",
      amount: transmission.amount + ventilation.amount,
      unit: "kWh"
    },
    components: {
      transmissionEnergy: { amount: transmission.amount, unit: "kWh" },
      ventilationEnergy: { amount: ventilation.amount, unit: "kWh" }
    },
    diagnostics: {
      blockers: [],
      warnings,
      methodologyLimits: [...METHODOLOGY_LIMITS]
    }
  };
}
