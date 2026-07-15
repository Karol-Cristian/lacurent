export const P3C_CLIMATE_MONTHLY_INVENTORY_STATUS = "P3C_CLIMATE_MONTHLY_INVENTORY_V1";

export const P3C_CLIMATE_MONTHLY_PROFILE_INVENTORY = Object.freeze([
  Object.freeze({
    inventoryId: "production.synthetic_demo_climate_profile",
    file: "src/climate-platform/romanianClimateProfiles.mjs",
    exportName: "ROMANIAN_CLIMATE_PROFILES.ro_synthetic_bucharest_seasonal_demo_v1",
    profileIdentifier: "ro_synthetic_bucharest_seasonal_demo_v1",
    classification: "explicit_synthetic_demo_input_profile",
    source: "P2D.synthetic_seasonal_profile.ui_demonstration_only",
    provenance: "synthetic_demo_profile",
    consumers: Object.freeze([
      "src/building-platform/buildingDnaResolver.mjs",
      "js/building-platform-wizard.mjs"
    ]),
    canReachProduction: true,
    productionReachCondition: "only_when_profile_id_is_explicit_and_allowSyntheticClimate_is_true",
    containsFixedMonthlyInputs: true,
    containsFixedMonthlyOutputs: false,
    bypassesClimateCalculations: false
  }),
  Object.freeze({
    inventoryId: "test.p1_seed_monthly_branch_fixture",
    file: "src/building-platform/tests/fixtures/p1SeedMonthlyProfiles.mjs",
    exportName: "createP1SeedMonthlyProfiles",
    profileIdentifier: "p1_regression_monthly_profiles",
    classification: "test_only_branch_forcing_monthly_input_fixture",
    source: "P1/P2 regression fixture",
    provenance: "test_fixture",
    consumers: Object.freeze([
      "src/building-platform/tests/buildingDnaResolver.test.mjs",
      "src/building-platform/tests/buildingKnowledgePipeline.test.mjs",
      "src/building-platform/tests/buildingTechnicalReport.test.mjs"
    ]),
    canReachProduction: false,
    productionReachCondition: "must_not_be_imported_by_active_production_modules",
    containsFixedMonthlyInputs: true,
    containsFixedMonthlyOutputs: false,
    bypassesClimateCalculations: false,
    containsBranchForcingPattern: true
  }),
  Object.freeze({
    inventoryId: "validation.p2v_independent_expected_outputs",
    file: "src/physics-engine/tests/fixtures/mc001Chapter2ValidationMatrixFixture.mjs",
    exportName: "MC001_CHAPTER_2_VALIDATION_SCENARIOS",
    profileIdentifier: "p2v_validation_matrix",
    classification: "test_only_independent_expected_output_fixture",
    source: "P2V independent validation pack",
    provenance: "test_fixture",
    consumers: Object.freeze([
      "src/physics-engine/tests/mc001Chapter2IndependentValidationPack.test.mjs"
    ]),
    canReachProduction: false,
    productionReachCondition: "must_not_be_imported_by_active_production_modules",
    containsFixedMonthlyInputs: true,
    containsFixedMonthlyOutputs: true,
    bypassesClimateCalculations: true
  }),
  Object.freeze({
    inventoryId: "validation.python_reference_expected_outputs",
    file: "validation-reference/python-mc001/expected",
    exportName: "json_expected_outputs",
    profileIdentifier: "p3v_python_reference_expected",
    classification: "validation_only_expected_output_dataset",
    source: "P3V independent Python reference",
    provenance: "validation_reference",
    consumers: Object.freeze([
      "validation-reference/python-mc001/tests/run_all.py",
      "validation-reference/python-mc001/compare/compare_results.py"
    ]),
    canReachProduction: false,
    productionReachCondition: "outside_js_active_production_import_graph",
    containsFixedMonthlyInputs: true,
    containsFixedMonthlyOutputs: true,
    bypassesClimateCalculations: true
  }),
  Object.freeze({
    inventoryId: "ui.demo_prefill_answers",
    file: "js/building-platform-wizard.mjs",
    exportName: "ASSISTED_WIZARD_DEMO_FIXTURE",
    profileIdentifier: "demo_detached_masonry_1985_eps_pvc_bucharest",
    classification: "explicit_ui_demo_prefill_answers",
    source: "P2B demo flow",
    provenance: "demo_fixture",
    consumers: Object.freeze([
      "pages/analiza-casa.html?demo=1",
      "js/building-platform-wizard.mjs"
    ]),
    canReachProduction: true,
    productionReachCondition: "only_when_demo_query_or_visible_demo_button_is_used",
    containsFixedMonthlyInputs: false,
    containsFixedMonthlyOutputs: false,
    bypassesClimateCalculations: false
  })
]);

export const P3C_ACTIVE_PRODUCTION_CLIMATE_MODULES = Object.freeze([
  "js/building-platform-wizard.mjs",
  "src/building-platform/buildingDnaResolver.mjs",
  "src/building-platform/buildingKnowledgePipeline.mjs",
  "src/building-platform/buildingChapter2Adapter.mjs",
  "src/building-platform/buildingTechnicalReport.mjs",
  "src/climate-platform/romanianClimateProfiles.mjs"
]);
