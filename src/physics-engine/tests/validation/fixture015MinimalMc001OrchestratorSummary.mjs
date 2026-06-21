export const fixture015MinimalMc001OrchestratorSummary = Object.freeze({
  fixtureId: "FIXTURE_015_MINIMAL_MC001_ORCHESTRATOR_SUMMARY",
  fixtureType: "level_0_summary_aggregator_validation",
  sourceDocument: "MC001-2022",
  sourceNote:
    "Summarizes existing Fixture 001-014 validation coverage and explicit blockers without recalculating MC001 physics.",
  scope:
    "Pure Physics Engine validation summary over reviewed fixture outputs, display reconciliations, and blocker metadata.",
  exclusions: Object.freeze([
    "no production orchestrator",
    "no full MC001 auditor",
    "no certificate workflow",
    "no CPE generation",
    "no report generation",
    "no UI/API/DB/Worker/deploy/production integration",
    "no new MC001 formulas",
    "no invented inputs",
    "no full DHW final-energy implementation"
  ]),
  expectedSummary: Object.freeze({
    summaryType: "MC001_MINIMAL_ORCHESTRATOR_SUMMARY",
    level: "LEVEL_0_SUMMARY_AGGREGATOR",
    isProductionOrchestrator: false,
    isCertificateWorkflow: false,
    recommendedNextStep: "BUILD_EXPLICIT_LEVEL_1_INPUT_PACK_BEFORE_COMPONENT_ORCHESTRATION"
  }),
  expectedSourceFixtureIds: Object.freeze([
    "FIXTURE_001_ENVELOPE",
    "FIXTURE_002_ENVELOPE_BRIDGES",
    "FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS",
    "FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS",
    "FIXTURE_005_VENTILATION_HVE_SUMMARY",
    "FIXTURE_006_HEATING_NEED_TABLE_SUMMARY",
    "FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY",
    "FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS",
    "FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT",
    "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION",
    "FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL",
    "FIXTURE_012_RER_DISPLAY_RECONCILIATION",
    "FIXTURE_013_ENERGY_CLASS_ASSIGNMENT",
    "FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION"
  ]),
  expectedValidatedComponentIds: Object.freeze([
    "envelope_transmission",
    "ventilation",
    "monthly_heating",
    "final_primary_co2",
    "service_final_primary_rows",
    "dhw",
    "rer_display",
    "energy_classes_utility_inclusion"
  ]),
  expectedDisplayOnlyReconciliationIds: Object.freeze([
    "dhw_final_energy_displayed_subtotal",
    "rer_display_arithmetic"
  ]),
  requiredAmbiguities: Object.freeze([
    "april_boundary_period_extraction_gap",
    "september_boundary_period_extraction_gap",
    "october_mc001_worked_example_ambiguity",
    "figure_2_18_gamma_h_greater_than_2_branch_preserved"
  ]),
  requiredBlockers: Object.freeze([
    "ventilation_ach_airflow_without_explicit_volume_ach_inputs",
    "ventilation_unconditioned_zone_bve_without_explicit_source_rows",
    "anexa_b_displayed_co2_inconsistency",
    "annual_dhw_distribution_loss_basis",
    "dhw_storage_losses",
    "dhw_generation_losses",
    "dhw_recovered_losses",
    "dhw_auxiliary_energy",
    "full_dhw_final_energy",
    "general_rer_methodology",
    "epren_rer_perimeter_export_treatment",
    "anexa_b_displayed_class_labels",
    "full_certificate_cpe_workflow",
    "mixed_use_weighted_thresholds",
    "overheating_discomfort_hours_above_26c",
    "virtual_ventilation_full_calculation"
  ]),
  requiredUnsafeLevel1Candidates: Object.freeze([
    "production_orchestrator",
    "certificate_cpe_workflow",
    "full_mc001_auditor",
    "full_dhw_final_energy",
    "general_rer_methodology"
  ])
});

