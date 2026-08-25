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
      "src/building-platform/buildingDnaResolver.mjs"
    ]),
    canReachProduction: false,
    productionReachCondition: "validation_only_after_P12A_product_demo_removal",
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
]);

export const P3C_ACTIVE_PRODUCTION_CLIMATE_MODULES = Object.freeze([
  "js/lacurent-contract.mjs",
  "js/lacurent-workspace.mjs",
  "workers/save-house.js",
  "python_engine/lacurent_engine/api/simple_contract.py"
]);
