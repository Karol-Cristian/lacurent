const SUMMARY_TYPE = "MC001_MINIMAL_ORCHESTRATOR_SUMMARY";
const LEVEL_0_SUMMARY_AGGREGATOR = "LEVEL_0_SUMMARY_AGGREGATOR";
const NEXT_STEP = "BUILD_EXPLICIT_LEVEL_1_INPUT_PACK_BEFORE_COMPONENT_ORCHESTRATION";

const SOURCE_FIXTURES = Object.freeze([
  Object.freeze({
    fixtureId: "FIXTURE_001_ENVELOPE",
    fixtureNumber: 1,
    role: "component_validation",
    validatedAreas: Object.freeze(["material_correction", "layer_resistance", "total_resistance", "u_values"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_002_ENVELOPE_BRIDGES",
    fixtureNumber: 2,
    role: "component_validation",
    validatedAreas: Object.freeze(["thermal_bridges"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS",
    fixtureNumber: 3,
    role: "component_validation",
    validatedAreas: Object.freeze(["remaining_element_u_values", "remaining_element_transmission"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS",
    fixtureNumber: 4,
    role: "component_validation",
    validatedAreas: Object.freeze(["hd", "hg", "htr", "transmission_table_totals"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_005_VENTILATION_HVE_SUMMARY",
    fixtureNumber: 5,
    role: "component_validation",
    validatedAreas: Object.freeze(["bve", "hve", "monthly_ventilation_transfer"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_006_HEATING_NEED_TABLE_SUMMARY",
    fixtureNumber: 6,
    role: "component_validation_with_ambiguity_markers",
    validatedAreas: Object.freeze(["qh_ht_rows", "qh_gn_rows", "helper_compatible_qh_nd_rows", "annual_displayed_qh_nd"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY",
    fixtureNumber: 7,
    role: "component_validation",
    validatedAreas: Object.freeze(["final_energy_total", "primary_energy", "renewable_primary", "non_renewable_primary", "co2_relation_5_4b"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS",
    fixtureNumber: 8,
    role: "service_row_validation",
    validatedAreas: Object.freeze(["service_final_energy_rows", "service_primary_energy_rows"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT",
    fixtureNumber: 9,
    role: "component_validation",
    validatedAreas: Object.freeze(["dhw_pipe_psi_component_formulas"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION",
    fixtureNumber: 10,
    role: "component_validation",
    validatedAreas: Object.freeze(["dhw_useful_demand_qw_nd"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL",
    fixtureNumber: 11,
    role: "display_reconciliation",
    validatedAreas: Object.freeze(["dhw_displayed_subtotal_arithmetic"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_012_RER_DISPLAY_RECONCILIATION",
    fixtureNumber: 12,
    role: "display_reconciliation",
    validatedAreas: Object.freeze(["anexa_b_displayed_rer_arithmetic"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_013_ENERGY_CLASS_ASSIGNMENT",
    fixtureNumber: 13,
    role: "component_validation",
    validatedAreas: Object.freeze(["numeric_thresholds", "open_left_closed_right_intervals", "isolated_class_assignment"])
  }),
  Object.freeze({
    fixtureId: "FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION",
    fixtureNumber: 14,
    role: "component_validation",
    validatedAreas: Object.freeze(["tabel_5_6_utility_inclusion", "optional_cooling_threshold_recalculation"])
  })
]);

const VALIDATED_COMPONENTS = Object.freeze([
  Object.freeze({
    componentId: "envelope_transmission",
    sourceFixtures: Object.freeze([
      "FIXTURE_001_ENVELOPE",
      "FIXTURE_002_ENVELOPE_BRIDGES",
      "FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS",
      "FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS"
    ]),
    validatedResults: Object.freeze([
      "material_correction",
      "layer_resistance",
      "total_resistance",
      "u_values",
      "u_prime_values",
      "thermal_bridges",
      "hd",
      "hg",
      "htr",
      "transmission_table_totals"
    ]),
    traceability: "fixture_validated_explicit_rows_only"
  }),
  Object.freeze({
    componentId: "ventilation",
    sourceFixtures: Object.freeze(["FIXTURE_005_VENTILATION_HVE_SUMMARY"]),
    validatedResults: Object.freeze([
      "bve",
      "hve",
      "monthly_ventilation_transfer_where_source_inputs_are_traceable"
    ]),
    traceability: "fixture_validated_explicit_rows_only"
  }),
  Object.freeze({
    componentId: "monthly_heating",
    sourceFixtures: Object.freeze(["FIXTURE_006_HEATING_NEED_TABLE_SUMMARY"]),
    validatedResults: Object.freeze([
      "qh_ht_rows",
      "qh_gn_rows",
      "helper_compatible_qh_nd_rows",
      "annual_displayed_qh_nd_reconciliation"
    ]),
    traceability: "fixture_validated_with_blocked_month_markers"
  }),
  Object.freeze({
    componentId: "final_primary_co2",
    sourceFixtures: Object.freeze(["FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY"]),
    validatedResults: Object.freeze([
      "final_energy_total",
      "primary_energy",
      "renewable_primary",
      "non_renewable_primary",
      "specific_primary_indicator",
      "co2_relation_5_4b",
      "specific_co2"
    ]),
    traceability: "fixture_validated_table_derived_rows"
  }),
  Object.freeze({
    componentId: "service_final_primary_rows",
    sourceFixtures: Object.freeze(["FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS"]),
    validatedResults: Object.freeze([
      "service_final_energy_rows",
      "service_primary_energy_rows",
      "specific_service_primary_indicators"
    ]),
    traceability: "service_row_validation_not_certificate_workflow"
  }),
  Object.freeze({
    componentId: "dhw",
    sourceFixtures: Object.freeze([
      "FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT",
      "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION",
      "FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL"
    ]),
    validatedResults: Object.freeze([
      "dhw_pipe_psi_component_formulas",
      "useful_dhw_demand_qw_nd",
      "displayed_dhw_subtotal_arithmetic"
    ]),
    traceability: "component_and_display_validation_only"
  }),
  Object.freeze({
    componentId: "rer_display",
    sourceFixtures: Object.freeze(["FIXTURE_012_RER_DISPLAY_RECONCILIATION"]),
    validatedResults: Object.freeze(["anexa_b_displayed_rer_arithmetic_only"]),
    traceability: "display_reconciliation_only"
  }),
  Object.freeze({
    componentId: "energy_classes_utility_inclusion",
    sourceFixtures: Object.freeze([
      "FIXTURE_013_ENERGY_CLASS_ASSIGNMENT",
      "FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION"
    ]),
    validatedResults: Object.freeze([
      "numeric_tabel_5_7_to_5_14_thresholds",
      "open_left_closed_right_intervals",
      "isolated_energy_class_assignment",
      "tabel_5_6_utility_inclusion",
      "optional_cooling_threshold_recalculation",
      "school_without_cooling_135_minus_13_equals_122_kwh_per_m2_an",
      "school_without_cooling_23_minus_13_times_0_107_equals_21_61_kgco2_per_m2_an"
    ]),
    traceability: "explicit_threshold_and_rule_validation_only"
  })
]);

const DISPLAY_ONLY_RECONCILIATIONS = Object.freeze([
  Object.freeze({
    reconciliationId: "dhw_final_energy_displayed_subtotal",
    sourceFixture: "FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL",
    classification: "display_reconciliation_not_full_formula_validation"
  }),
  Object.freeze({
    reconciliationId: "rer_display_arithmetic",
    sourceFixture: "FIXTURE_012_RER_DISPLAY_RECONCILIATION",
    classification: "display_reconciliation_only"
  })
]);

const BLOCKED_COMPONENTS = Object.freeze([
  Object.freeze({
    blockerId: "ventilation_ach_airflow_without_explicit_volume_ach_inputs",
    area: "ventilation",
    status: "blocked_missing_inputs"
  }),
  Object.freeze({
    blockerId: "ventilation_unconditioned_zone_bve_without_explicit_source_rows",
    area: "ventilation",
    status: "blocked_missing_inputs"
  }),
  Object.freeze({
    blockerId: "anexa_b_displayed_co2_inconsistency",
    area: "final_primary_co2",
    status: "blocked_source_conflict"
  }),
  Object.freeze({
    blockerId: "annual_dhw_distribution_loss_basis",
    area: "dhw",
    status: "blocked_missing_basis"
  }),
  Object.freeze({
    blockerId: "dhw_storage_losses",
    area: "dhw",
    status: "blocked_missing_inputs"
  }),
  Object.freeze({
    blockerId: "dhw_generation_losses",
    area: "dhw",
    status: "blocked_missing_inputs"
  }),
  Object.freeze({
    blockerId: "dhw_recovered_losses",
    area: "dhw",
    status: "blocked_missing_inputs"
  }),
  Object.freeze({
    blockerId: "dhw_auxiliary_energy",
    area: "dhw",
    status: "blocked_missing_inputs"
  }),
  Object.freeze({
    blockerId: "full_dhw_final_energy",
    area: "dhw",
    status: "blocked_missing_full_chain"
  }),
  Object.freeze({
    blockerId: "general_rer_methodology",
    area: "rer",
    status: "blocked_missing_methodology"
  }),
  Object.freeze({
    blockerId: "epren_rer_perimeter_export_treatment",
    area: "rer",
    status: "blocked_missing_policy"
  }),
  Object.freeze({
    blockerId: "anexa_b_displayed_class_labels",
    area: "energy_classes",
    status: "blocked_certificate_context"
  }),
  Object.freeze({
    blockerId: "full_certificate_cpe_workflow",
    area: "certificate",
    status: "blocked_out_of_scope"
  }),
  Object.freeze({
    blockerId: "mixed_use_weighted_thresholds",
    area: "energy_classes",
    status: "blocked_missing_zone_policy"
  }),
  Object.freeze({
    blockerId: "overheating_discomfort_hours_above_26c",
    area: "energy_classes",
    status: "blocked_missing_method"
  }),
  Object.freeze({
    blockerId: "virtual_ventilation_full_calculation",
    area: "energy_classes",
    status: "blocked_missing_virtual_system_calculator"
  })
]);

const AMBIGUOUS_COMPONENTS = Object.freeze([
  Object.freeze({
    ambiguityId: "april_boundary_period_extraction_gap",
    area: "monthly_heating",
    status: "blocked_ambiguous"
  }),
  Object.freeze({
    ambiguityId: "september_boundary_period_extraction_gap",
    area: "monthly_heating",
    status: "blocked_ambiguous"
  }),
  Object.freeze({
    ambiguityId: "october_mc001_worked_example_ambiguity",
    area: "monthly_heating",
    status: "blocked_ambiguous"
  }),
  Object.freeze({
    ambiguityId: "figure_2_18_gamma_h_greater_than_2_branch_preserved",
    area: "monthly_heating",
    status: "do_not_change"
  })
]);

const SAFE_FOR_LEVEL_1_CANDIDATES = Object.freeze([
  "envelope_transmission_with_explicit_geometry_material_bridge_inputs",
  "ventilation_with_explicit_airflow_temperature_and_hours_inputs",
  "monthly_heating_for_unambiguous_rows_only",
  "final_primary_co2_with_explicit_service_final_energy_rows",
  "dhw_useful_demand_with_explicit_service_quantities",
  "energy_class_assignment_with_explicit_table_category_basis_and_value",
  "utility_threshold_recalculation_with_explicit_missing_optional_utilities"
]);

const UNSAFE_FOR_LEVEL_1_CANDIDATES = Object.freeze([
  "production_orchestrator",
  "certificate_cpe_workflow",
  "full_mc001_auditor",
  "full_dhw_final_energy",
  "general_rer_methodology",
  "automatic_building_category_inference",
  "mixed_use_weighted_thresholds",
  "overheating_discomfort_hours",
  "virtual_ventilation_full_calculation",
  "ui_api_db_worker_report_deploy_integration"
]);

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectedSourceFixtureIds() {
  return Array.from({ length: 14 }, (_, index) => `FIXTURE_${String(index + 1).padStart(3, "0")}`);
}

export function summarizeFixtureCoverage(sourceFixtures = SOURCE_FIXTURES) {
  const coveredFixtureIds = sourceFixtures.map((fixture) => fixture.fixtureId);
  const missingFixtureNumbers = expectedSourceFixtureIds()
    .map((prefix, index) => index + 1)
    .filter((fixtureNumber) => {
      const normalizedPrefix = `FIXTURE_${String(fixtureNumber).padStart(3, "0")}`;
      return !coveredFixtureIds.some((fixtureId) => fixtureId.startsWith(normalizedPrefix));
    });

  return {
    fixtureCount: coveredFixtureIds.length,
    coveredFixtureIds,
    missingFixtureNumbers,
    coversFixtures001Through014: missingFixtureNumbers.length === 0
  };
}

export function summarizeValidatedComponents() {
  return cloneSerializable(VALIDATED_COMPONENTS);
}

export function summarizeBlockedComponents() {
  return cloneSerializable(BLOCKED_COMPONENTS);
}

export function evaluateLevel1Readiness({ explicitInputPackAvailable = false } = {}) {
  if (!explicitInputPackAvailable) {
    return {
      ready: false,
      status: "NOT_READY_EXPLICIT_INPUT_PACK_REQUIRED",
      reason:
        "Current validation coverage is isolated by fixture and still has explicit blockers; Level 1 needs a fully explicit helper-input pack first.",
      requiredNextStep: NEXT_STEP
    };
  }

  return {
    ready: true,
    status: "CONDITIONALLY_READY_FOR_NARROW_LEVEL_1_FIXTURE",
    reason:
      "An explicit input pack can be used to design a narrow Level 1 fixture, provided missing components still fail closed.",
    requiredNextStep: "DESIGN_NARROW_LEVEL_1_FIXTURE_WITH_FAIL_CLOSED_INPUT_VALIDATION"
  };
}

export function createMinimalMc001OrchestratorSummary() {
  const sourceFixtures = cloneSerializable(SOURCE_FIXTURES);
  const fixtureCoverage = summarizeFixtureCoverage(sourceFixtures);

  return {
    summaryType: SUMMARY_TYPE,
    level: LEVEL_0_SUMMARY_AGGREGATOR,
    isProductionOrchestrator: false,
    isCertificateWorkflow: false,
    validatedComponents: summarizeValidatedComponents(),
    displayOnlyReconciliations: cloneSerializable(DISPLAY_ONLY_RECONCILIATIONS),
    blockedComponents: summarizeBlockedComponents(),
    ambiguousComponents: cloneSerializable(AMBIGUOUS_COMPONENTS),
    safeForLevel1Candidates: cloneSerializable(SAFE_FOR_LEVEL_1_CANDIDATES),
    unsafeForLevel1Candidates: cloneSerializable(UNSAFE_FOR_LEVEL_1_CANDIDATES),
    level1Readiness: evaluateLevel1Readiness(),
    recommendedNextStep: NEXT_STEP,
    sourceFixtures,
    fixtureCoverage
  };
}

