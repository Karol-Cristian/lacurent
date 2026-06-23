export const BLOCKED_MISSING_CLIMATE_DATASET = "blocked_missing_climate_dataset";
export const BLOCKED_MISSING_DHW_DATASET = "blocked_missing_dhw_dataset";
export const BLOCKED_MISSING_TABLE = "blocked_missing_table";
export const BLOCKED_MISSING_INPUTS = "blocked_missing_inputs";
export const EXECUTABLE = "executable";

export const requestedValidationAreas = Object.freeze([
  "u_values",
  "transmission",
  "ventilation",
  "dhw_useful_demand",
  "dhw_displayed_subtotal",
  "dhw_distribution_components",
  "rer_display",
  "energy_class_assignment",
  "utility_inclusion_thresholds",
  "monthly_transfer",
  "monthly_balance",
  "primary_energy",
  "co2"
]);

export const mc001ExecutableValidationFixtures = Object.freeze([
  Object.freeze({
    fixtureId: "FIXTURE_001_ENVELOPE",
    exampleId: "MC001_EX_B_GEOMETRY_ENVELOPE_TABLES",
    source: "MC001-2022 Anexa B external opaque wall before renovation",
    documentationPath: "docs/mc001-validation/FIXTURE_001_ENVELOPE.md",
    fixturePath: "src/physics-engine/tests/validation/fixture001Envelope.mjs",
    validationTestPath: "src/physics-engine/tests/validation/fixture001Envelope.validation.test.mjs",
    validationAreas: Object.freeze(["u_values", "transmission"]),
    helperCoverage: Object.freeze([
      "materialsUValues.mjs",
      "transmissionCoefficients.mjs"
    ]),
    limitations:
      "Executable external-wall subset only; broader Anexa B geometry/envelope and bridge tables remain partial."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_002_ENVELOPE_BRIDGES",
    exampleId: "MC001_EX_B_THERMAL_BRIDGE_TABLES",
    source: "MC001-2022 Anexa B Tabel 2.3 complete external-wall bridge rows",
    documentationPath: "docs/mc001-validation/FIXTURE_002_ENVELOPE_BRIDGES.md",
    fixturePath: "src/physics-engine/tests/validation/fixture002EnvelopeBridges.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture002EnvelopeBridges.validation.test.mjs",
    validationAreas: Object.freeze(["transmission"]),
    helperCoverage: Object.freeze(["transmissionCoefficients.mjs"]),
    limitations:
      "Executable for complete explicit bridge rows only; calculateLinearBridgePsi remains blocked because L2D is not sourced."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS",
    exampleId: "MC001_EX_B_GEOMETRY_ENVELOPE_TABLES",
    source:
      "MC001-2022 Anexa B terrace, slab-on-ground and floor-over-basement remaining envelope elements",
    documentationPath:
      "docs/mc001-validation/FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture003EnvelopeRemainingElements.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture003EnvelopeRemainingElements.validation.test.mjs",
    validationAreas: Object.freeze(["u_values", "transmission"]),
    helperCoverage: Object.freeze([
      "materialsUValues.mjs",
      "transmissionCoefficients.mjs"
    ]),
    limitations:
      "Executable for reviewed remaining element R/U values, complete bridge subtotals, terrace Hd and source component Htr wrapper only; full-building transmission remains blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS",
    exampleId: "MC001_EX_B_HEATING_MONTHLY_GAINS",
    source:
      "MC001-2022 Anexa B page 520-521 transmission-loss summary totals",
    documentationPath:
      "docs/mc001-validation/FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture004TransmissionLossTotals.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture004TransmissionLossTotals.validation.test.mjs",
    validationAreas: Object.freeze(["transmission"]),
    helperCoverage: Object.freeze(["transmissionCoefficients.mjs"]),
    limitations:
      "Executable for displayed Hd/Hg totals and page 521 Htr component sums only; Hve, Hfinal, monthly transfer energy and ground derivation remain blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_005_VENTILATION_HVE_SUMMARY",
    exampleId: "MC001_EX_B_HEATING_MONTHLY_GAINS",
    source:
      "MC001-2022 Anexa B page 519-522 natural ventilation Hve and monthly Qve summary",
    documentationPath:
      "docs/mc001-validation/FIXTURE_005_VENTILATION_HVE_SUMMARY.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture005VentilationHveSummary.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture005VentilationHveSummary.validation.test.mjs",
    validationAreas: Object.freeze(["ventilation"]),
    helperCoverage: Object.freeze(["ventilationCoefficients.mjs"]),
    limitations:
      "Executable for explicit-airflow bve, source-implied Hve and monthly Qve rows only; ACH, unconditioned-zone bve, independent rhoA*ca constants and fan/AHU energy remain blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_006_HEATING_NEED_TABLE_SUMMARY",
    exampleId: "MC001_EX_B_HEATING_MONTHLY_GAINS",
    source:
      "MC001-2022 Anexa B page 522 monthly heating-need table summary",
    documentationPath:
      "docs/mc001-validation/FIXTURE_006_HEATING_NEED_TABLE_SUMMARY.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture006HeatingNeedTableSummary.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture006HeatingNeedTableSummary.validation.test.mjs",
    validationAreas: Object.freeze(["monthly_balance"]),
    helperCoverage: Object.freeze(["monthlyBalance.mjs"]),
    limitations:
      "Executable for displayed adjusted QHht/QHgn rows, helper-compatible QHnd rows, annual QHnd sum and diagnostic Apr/Sep/Oct source-conflict reconstruction only; strict Apr/Sep/Oct QHnd helper assertions, gamma derivation and exact eta values remain blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY",
    exampleId: "MC001_EX_B_FINAL_PRIMARY_CO2_CPE",
    source:
      "MC001-2022 Anexa B page 527/page 533 final-primary-CO2 summary with Tabel 5.17/5.18 factors",
    documentationPath:
      "docs/mc001-validation/FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture007FinalPrimaryCo2Summary.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture007FinalPrimaryCo2Summary.validation.test.mjs",
    validationAreas: Object.freeze(["primary_energy", "co2"]),
    helperCoverage: Object.freeze(["finalPrimaryCo2Indicators.mjs"]),
    limitations:
      "Executable for table-derived final, primary, CO2 and specific indicators only; page 523 heating prose typo, page 527 electric CO2 worked-example factor inconsistency, general RER and class-assignment outputs remain blocked. Displayed RER arithmetic is covered by Fixture 012."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS",
    exampleId: "MC001_EX_B_FINAL_PRIMARY_CO2_CPE",
    source:
      "MC001-2022 Anexa B explicit service final-energy rows with Tabel 5.17 primary-energy factors",
    documentationPath:
      "docs/mc001-validation/FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture008ServiceFinalPrimaryRows.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture008ServiceFinalPrimaryRows.validation.test.mjs",
    validationAreas: Object.freeze(["primary_energy"]),
    helperCoverage: Object.freeze(["finalPrimaryCo2Indicators.mjs"]),
    limitations:
      "Executable for service-level final energy, Tabel 5.17 renewable/non-renewable/total primary energy and specific primary indicators only; CO2 display rows, classes and certificate output remain blocked. Displayed RER arithmetic is covered by Fixture 012."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT",
    exampleId: "MC001_ANEXA_3_3_B_DHW_DISTRIBUTION_COMPONENTS",
    source:
      "MC001-2022 Anexa 3.3.B DHW distribution-loss component formulas",
    documentationPath:
      "docs/mc001-validation/FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture009DhwDistributionLossComponent.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture009DhwDistributionLossComponent.validation.test.mjs",
    validationAreas: Object.freeze(["dhw_distribution_components"]),
    helperCoverage: Object.freeze(["dhwDistributionLosses.mjs"]),
    limitations:
      "Executable for mean DHW distribution temperature and pipe transmittance component rows only; annual distribution-loss energy, recovery, auxiliary, storage, generation and final energy remain blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION",
    exampleId: "MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS",
    source:
      "MC001-2022 Anexa B page 524-525 school useful DHW demand rows",
    documentationPath:
      "docs/mc001-validation/FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture010DhwUsefulDemandReconciliation.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture010DhwUsefulDemandReconciliation.validation.test.mjs",
    validationAreas: Object.freeze(["dhw_useful_demand"]),
    helperCoverage: Object.freeze(["dhwUsefulDemand.mjs"]),
    limitations:
      "Executable for school useful-demand volume and QW,nd reconciliation only; distribution, storage, generation, auxiliary and final-energy rows remain blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL",
    exampleId: "MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS",
    source:
      "MC001-2022 Anexa B page 525 displayed DHW final-energy subtotal",
    documentationPath:
      "docs/mc001-validation/FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture011DhwFinalEnergyDisplayedSubtotal.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture011DhwFinalEnergyDisplayedSubtotal.validation.test.mjs",
    validationAreas: Object.freeze(["dhw_displayed_subtotal"]),
    helperCoverage: Object.freeze([]),
    limitations:
      "Executable for displayed page 525 subtotal arithmetic only; annual distribution losses, storage, generation, recovered losses, auxiliary energy and full DHW final-energy formulas remain blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_012_RER_DISPLAY_RECONCILIATION",
    exampleId: "MC001_EX_B_FINAL_PRIMARY_CO2_CPE",
    source: "MC001-2022 Anexa B page 527 displayed RER arithmetic",
    documentationPath:
      "docs/mc001-validation/FIXTURE_012_RER_DISPLAY_RECONCILIATION.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture012RerDisplayReconciliation.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture012RerDisplayReconciliation.validation.test.mjs",
    validationAreas: Object.freeze(["rer_display"]),
    helperCoverage: Object.freeze([]),
    limitations:
      "Executable for displayed page 527/page 540 RER arithmetic only; general RER methodology, exact primary split as pass criterion, energy classes, CO2 display conflict and certificate workflow remain blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_013_ENERGY_CLASS_ASSIGNMENT",
    exampleId: "MC001_TABLES_5_7_5_14_ENERGY_CLASSES",
    source:
      "MC001-2022 pages 395 and 397-400 Tabel 5.7-5.14 class interval rules",
    documentationPath:
      "docs/mc001-validation/FIXTURE_013_ENERGY_CLASS_ASSIGNMENT.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture013EnergyClassAssignment.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture013EnergyClassAssignment.validation.test.mjs",
    validationAreas: Object.freeze(["energy_class_assignment"]),
    helperCoverage: Object.freeze(["energyClassAssignment.mjs"]),
    limitations:
      "Executable for explicit table/category/indicator interval assignment only; no Anexa B class labels, utility-inclusion recalculation, CPE, certificate workflow or production integration."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION",
    exampleId: "MC001_TABLE_5_6_UTILITY_INCLUSION_THRESHOLDS",
    source:
      "MC001-2022 pages 395-396 Tabel 5.6 utility inclusion and Nota 4 threshold recalculation",
    documentationPath:
      "docs/mc001-validation/FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture014UtilityInclusionThresholdRecalculation.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture014UtilityInclusionThresholdRecalculation.validation.test.mjs",
    validationAreas: Object.freeze(["utility_inclusion_thresholds"]),
    helperCoverage: Object.freeze(["utilityInclusionThresholds.mjs"]),
    limitations:
      "Executable for Tabel 5.6 mandatory/optional utility flags and Nota 4 threshold subtraction only; no certificate class inference, virtual ventilation consumption, overheating calculation, mixed-use averaging, CPE or production integration."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_015_MINIMAL_MC001_ORCHESTRATOR_SUMMARY",
    exampleId: "MC001_VALIDATION_SUMMARY_FIXTURES_001_014",
    source:
      "MC001 Physics Engine validation metadata and reviewed Fixture 001-014 summaries",
    documentationPath:
      "docs/mc001-validation/FIXTURE_015_MINIMAL_MC001_ORCHESTRATOR_SUMMARY.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture015MinimalMc001OrchestratorSummary.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture015MinimalMc001OrchestratorSummary.validation.test.mjs",
    validationAreas: Object.freeze(["minimal_orchestrator_summary"]),
    helperCoverage: Object.freeze(["minimalMc001OrchestratorSummary.mjs"]),
    limitations:
      "Executable for Level 0 summary aggregation over Fixture 001-014 coverage and explicit blockers only; no raw physics recalculation, Level 1 component orchestration, certificate/CPE workflow, product integration or production orchestrator."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR",
    exampleId: "MC001_LEVEL_1_CORE_EXPLICIT_INPUT_PACK",
    source:
      "MC001 Physics Engine reviewed Fixtures 004, 005, 007, 015 and Investigation 009 explicit input pack",
    documentationPath:
      "docs/mc001-validation/FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture016Level1CoreComponentOrchestrator.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture016Level1CoreComponentOrchestrator.validation.test.mjs",
    validationAreas: Object.freeze(["level_1_core_orchestrator"]),
    helperCoverage: Object.freeze([
      "mc001Level1CoreOrchestrator.mjs",
      "transmissionCoefficients.mjs",
      "ventilationCoefficients.mjs",
      "finalPrimaryCo2Indicators.mjs"
    ]),
    limitations:
      "Executable for narrow Level 1 core composition over explicit transmission, ventilation and final/primary/CO2 inputs with blockers preserved only; no Level 2 full auditor, certificate/CPE workflow, product integration, report generation, UI, API, DB/schema, Worker, deploy, full DHW final energy, lighting, cooling systems or reference-building implementation."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_017_LEVEL_1_MONTHLY_HEATING_ORCHESTRATION",
    exampleId: "MC001_LEVEL_1_MONTHLY_HEATING_EXPLICIT_INPUT_PACK",
    source:
      "MC001 Physics Engine reviewed Fixture 006 monthly heating rows and Fixture 016 Level 1 core input pack",
    documentationPath:
      "docs/mc001-validation/FIXTURE_017_LEVEL_1_MONTHLY_HEATING_ORCHESTRATION.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture017Level1MonthlyHeatingOrchestration.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture017Level1MonthlyHeatingOrchestration.validation.test.mjs",
    validationAreas: Object.freeze(["level_1_monthly_heating_orchestration"]),
    helperCoverage: Object.freeze([
      "mc001Level1CoreOrchestrator.mjs",
      "monthlyBalance.mjs"
    ]),
    limitations:
      "Executable for Level 1 monthly-heating summary composition over explicit Fixture 006 rows only; April and September remain blocked, October remains ambiguous, annual displayed QHnd is reconciliation-only, and no Level 2 full auditor, certificate/CPE workflow, production integration, UI, API, DB/schema, Worker, deploy, full DHW final energy, lighting, cooling systems or reference-building implementation is added."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_018_LEVEL_1_FAIL_CLOSED_HARDENING",
    exampleId: "MC001_LEVEL_1_FAIL_CLOSED_INPUT_PACK",
    source:
      "MC001 Physics Engine Fixture 016/017 explicit Level 1 input packs with fail-closed validation mutations",
    documentationPath:
      "docs/mc001-validation/FIXTURE_018_LEVEL_1_FAIL_CLOSED_HARDENING.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture018Level1FailClosedHardening.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture018Level1FailClosedHardening.validation.test.mjs",
    validationAreas: Object.freeze(["level_1_fail_closed_hardening"]),
    helperCoverage: Object.freeze(["mc001Level1CoreOrchestrator.mjs"]),
    limitations:
      "Executable for Level 1 input-pack hardening and negative fail-closed validation only; it adds no new MC001 physics formulas, no Level 2 full auditor, no certificate/CPE workflow, no UI/API/DB/schema/Worker/deploy/product integration, no full DHW final energy, no lighting, no cooling systems and no reference-building implementation."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_020_REGISTRY_CONTRACT_INPUT_BUILDER_GATE",
    exampleId: "MC001_PHASE_C_REGISTRY_CONTRACT_INPUT_BUILDER_GATE",
    source:
      "Phase A/B MC001 auditor input contract and normative registry hardening plan",
    documentationPath:
      "docs/mc001-validation/FIXTURE_020_REGISTRY_CONTRACT_INPUT_BUILDER_GATE.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture020RegistryContractInputBuilderGate.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture020RegistryContractInputBuilderGate.validation.test.mjs",
    validationAreas: Object.freeze([
      "normative_registry_contract",
      "auditor_input_builder_gate"
    ]),
    helperCoverage: Object.freeze([
      "mc001NormativeRegistryContract.mjs",
      "mc001AuditorInputBuilderGate.mjs"
    ]),
    limitations:
      "Executable for a narrow Phase C registry contract and input-builder gate fixture only; it adds no Level 2 full auditor, no MC001 formula expansion, no UI/API/DB/schema/Worker/deploy/product integration, no report generation, no certificate/CPE workflow and no dataset migration."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_021_ENVELOPE_FROM_AUDITOR_INPUT",
    exampleId: "MC001_PHASE_D_ENVELOPE_FROM_AUDITOR_INPUT",
    source:
      "Phase D source-backed envelope input builder over Phase C auditor input gate",
    documentationPath:
      "docs/mc001-validation/FIXTURE_021_ENVELOPE_FROM_AUDITOR_INPUT.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture021EnvelopeFromAuditorInput.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture021EnvelopeFromAuditorInput.validation.test.mjs",
    validationAreas: Object.freeze([
      "envelope_from_auditor_input",
      "transmission"
    ]),
    helperCoverage: Object.freeze([
      "mc001EnvelopeInputBuilder.mjs",
      "mc001AuditorInputBuilderGate.mjs",
      "materialsUValues.mjs",
      "transmissionCoefficients.mjs"
    ]),
    limitations:
      "Executable for narrow Phase D source-backed exterior envelope input preparation only; unsupported ground, unconditioned, adjacent, climate/monthly, Level 2 full auditor, certificate/CPE workflow, UI/API/DB/schema/Worker/deploy/product integration, report generation, dataset migration and new MC001 formula coverage remain blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_022_TRANSMISSION_HTR_READINESS_GATE",
    exampleId: "MC001_PHASE_E_TRANSMISSION_HTR_READINESS_GATE",
    source:
      "Phase E transmission/Htr readiness gate over Phase D envelope output",
    documentationPath:
      "docs/mc001-validation/FIXTURE_022_TRANSMISSION_HTR_READINESS_GATE.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture022TransmissionHtrReadinessGate.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture022TransmissionHtrReadinessGate.validation.test.mjs",
    validationAreas: Object.freeze([
      "transmission_htr_readiness_gate",
      "transmission"
    ]),
    helperCoverage: Object.freeze([
      "mc001TransmissionHtrReadinessGate.mjs",
      "mc001EnvelopeInputBuilder.mjs",
      "mc001AuditorInputBuilderGate.mjs",
      "transmissionCoefficients.mjs"
    ]),
    limitations:
      "Executable for narrow Phase E transmission/Htr readiness classification only; it prevents false complete-Htr readiness and adds no full Htr engine, no full envelope engine, no Level 2 full auditor, no climate/monthly heating implementation, no UI/API/DB/schema/Worker/deploy/product integration, no report generation, no certificate/CPE workflow, no dataset migration and no new MC001 formula coverage."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_023_VENTILATION_FROM_AUDITOR_INPUT",
    exampleId: "MC001_PHASE_F_VENTILATION_FROM_AUDITOR_INPUT",
    source:
      "Phase F source-backed ventilation input builder over Phase C auditor input gate",
    documentationPath:
      "docs/mc001-validation/FIXTURE_023_VENTILATION_FROM_AUDITOR_INPUT.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture023VentilationFromAuditorInput.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture023VentilationFromAuditorInput.validation.test.mjs",
    validationAreas: Object.freeze([
      "ventilation_from_auditor_input",
      "ventilation"
    ]),
    helperCoverage: Object.freeze([
      "mc001VentilationInputBuilder.mjs",
      "mc001AuditorInputBuilderGate.mjs",
      "ventilationCoefficients.mjs"
    ]),
    limitations:
      "Executable for narrow Phase F source-backed ventilation/Hve input preparation only; unsupported ventilation paths, climate/monthly heating, heat-loss readiness, Level 2 full auditor, certificate/CPE workflow, UI/API/DB/schema/Worker/deploy/product integration, report generation and new MC001 formula coverage remain blocked."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_024_HEAT_LOSS_READINESS_GATE",
    exampleId: "MC001_PHASE_F_HEAT_LOSS_READINESS_GATE",
    source:
      "Phase F heat-loss readiness gate over Phase E Htr and Phase F Hve outputs",
    documentationPath:
      "docs/mc001-validation/FIXTURE_024_HEAT_LOSS_READINESS_GATE.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture024HeatLossReadinessGate.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture024HeatLossReadinessGate.validation.test.mjs",
    validationAreas: Object.freeze([
      "heat_loss_readiness_gate",
      "transmission",
      "ventilation"
    ]),
    helperCoverage: Object.freeze([
      "mc001HeatLossReadinessGate.mjs",
      "mc001TransmissionHtrReadinessGate.mjs",
      "mc001VentilationInputBuilder.mjs",
      "mc001EnvelopeInputBuilder.mjs",
      "mc001AuditorInputBuilderGate.mjs",
      "transmissionCoefficients.mjs",
      "ventilationCoefficients.mjs"
    ]),
    limitations:
      "Executable for narrow Phase F heat-loss readiness gating only; it combines complete source-backed Htr and Hve readiness without adding monthly heating, QHnd, climate data, full Htr engine, full ventilation engine, Level 2 full auditor, certificate/CPE workflow, UI/API/DB/schema/Worker/deploy/product integration, report generation or new MC001 formula coverage."
  }),
  Object.freeze({
    fixtureId: "FIXTURE_025_AUDITOR_CORE_READINESS_ORCHESTRATOR",
    exampleId: "MC001_PHASE_G_AUDITOR_CORE_READINESS_ORCHESTRATOR",
    source:
      "Phase G auditor core readiness orchestrator over Phase C/D/E/F outputs",
    documentationPath:
      "docs/mc001-validation/FIXTURE_025_AUDITOR_CORE_READINESS_ORCHESTRATOR.md",
    fixturePath:
      "src/physics-engine/tests/validation/fixture025AuditorCoreReadinessOrchestrator.mjs",
    validationTestPath:
      "src/physics-engine/tests/validation/fixture025AuditorCoreReadinessOrchestrator.validation.test.mjs",
    validationAreas: Object.freeze([
      "auditor_core_readiness_orchestrator",
      "transmission",
      "ventilation"
    ]),
    helperCoverage: Object.freeze([
      "mc001AuditorCoreReadinessOrchestrator.mjs",
      "mc001AuditorInputBuilderGate.mjs",
      "mc001EnvelopeInputBuilder.mjs",
      "mc001TransmissionHtrReadinessGate.mjs",
      "mc001VentilationInputBuilder.mjs",
      "mc001HeatLossReadinessGate.mjs",
      "materialsUValues.mjs",
      "transmissionCoefficients.mjs",
      "ventilationCoefficients.mjs"
    ]),
    limitations:
      "Executable for narrow Phase G auditor core readiness orchestration only; it composes Phase C/D/E/F readiness outputs without adding monthly heating, QHnd, final energy, primary energy, CO2, climate data, full Level 2 auditor behavior, certificate/CPE workflow, UI/API/DB/schema/Worker/deploy/product integration, marketplace, report generation or new MC001 formula coverage."
  })
]);

export const mc001ValidationCandidates = Object.freeze([
  {
    exampleId: "MC001_EX_6_1_ANALYSIS_SHEET_MODEL",
    source: "MC001-2022 Anexa 6.1 analysis sheet model",
    numericCompleteness: "text_only",
    validationStatus: BLOCKED_MISSING_INPUTS,
    additionalBlockers: Object.freeze([]),
    validationAreas: Object.freeze([]),
    requiredInputs: "filled geometry, envelope and system fields",
    expectedOutputs: "none; source is an input template",
    helperCoverage: Object.freeze([]),
    missingPieces: "all numeric inputs and calculated outputs"
  },
  {
    exampleId: "MC001_EX_6_2_CENTRALIZED_RESIDENTIAL_MEASURES",
    source: "MC001-2022 Anexa 6.2 tables 6.3-6.8",
    numericCompleteness: "text_only",
    validationStatus: BLOCKED_MISSING_INPUTS,
    additionalBlockers: Object.freeze([]),
    validationAreas: Object.freeze([]),
    requiredInputs: "baseline and improved indicators for each measure",
    expectedOutputs: "numeric savings are not provided",
    helperCoverage: Object.freeze([]),
    missingPieces: "before/after numeric values"
  },
  {
    exampleId: "MC001_EX_6_3_INDIVIDUAL_HOUSE_MEASURES",
    source: "MC001-2022 Anexa 6.3 tables 6.9-6.13",
    numericCompleteness: "text_only",
    validationStatus: BLOCKED_MISSING_INPUTS,
    additionalBlockers: Object.freeze([]),
    validationAreas: Object.freeze([]),
    requiredInputs: "baseline and improved indicators for each measure",
    expectedOutputs: "numeric savings are not provided",
    helperCoverage: Object.freeze([]),
    missingPieces: "before/after numeric values"
  },
  {
    exampleId: "MC001_EX_A_CPE_SINGLE_FAMILY_CERTIFICATE",
    source: "MC001-2022 Anexa A certificate example",
    numericCompleteness: "partial",
    validationStatus: BLOCKED_MISSING_INPUTS,
    additionalBlockers: Object.freeze([BLOCKED_MISSING_TABLE]),
    validationAreas: Object.freeze(["u_values", "primary_energy", "co2"]),
    requiredInputs: "full envelope, system, final-energy, factor and reference-area chain",
    expectedOutputs: "service primary energy, CO2, classes and reference comparison fields",
    helperCoverage: Object.freeze([
      "materialsUValues.mjs",
      "finalPrimaryCo2Indicators.mjs",
      "envelopeRequirementChecks.mjs"
    ]),
    missingPieces: "full input chain and visually verified service breakdown"
  },
  {
    exampleId: "MC001_EX_B_AUDIT_BREVIAR_SCHOOL_OVERVIEW",
    source: "MC001-2022 Anexa B audit breviar overview",
    numericCompleteness: "partial",
    validationStatus: BLOCKED_MISSING_INPUTS,
    additionalBlockers: Object.freeze([
      BLOCKED_MISSING_CLIMATE_DATASET,
      BLOCKED_MISSING_TABLE
    ]),
    validationAreas: Object.freeze([
      "u_values",
      "transmission",
      "ventilation",
      "dhw_useful_demand",
      "dhw_distribution_components",
      "monthly_transfer",
      "monthly_balance",
      "primary_energy",
      "co2"
    ]),
    requiredInputs: "complete cleaned geometry, envelope, systems, usage and package tables",
    expectedOutputs: "baseline and improved indicators, classes, CO2, cost and payback summary",
    helperCoverage: Object.freeze([
      "materialsUValues.mjs",
      "transmissionCoefficients.mjs",
      "ventilationCoefficients.mjs",
      "monthlyTransmissionTransfer.mjs",
      "monthlyBalance.mjs",
      "dhwUsefulDemand.mjs",
      "finalPrimaryCo2Indicators.mjs",
      "envelopeRequirementChecks.mjs"
    ]),
    missingPieces:
      "machine-readable full tables, climate, DHW service quantities/period schedules/system inputs, class-assignment context and economic formulas"
  },
  {
    exampleId: "MC001_EX_B_GEOMETRY_ENVELOPE_TABLES",
    source: "MC001-2022 Anexa B section 2.1 and related geometry/envelope tables",
    numericCompleteness: "partial",
    validationStatus: BLOCKED_MISSING_TABLE,
    additionalBlockers: Object.freeze([BLOCKED_MISSING_INPUTS]),
    validationAreas: Object.freeze(["u_values", "transmission"]),
    requiredInputs: "areas, layer properties, Rsi/Rse, bridge corrections and aligned source rows",
    expectedOutputs: "R/R' values and before/after envelope resistance comparisons",
    helperCoverage: Object.freeze([
      "materialsUValues.mjs",
      "transmissionCoefficients.mjs",
      "envelopeRequirementChecks.mjs"
    ]),
    missingPieces: "visual table verification and surface resistance source"
  },
  {
    exampleId: "MC001_EX_B_THERMAL_BRIDGE_TABLES",
    source: "MC001-2022 Anexa B thermal bridge tables",
    numericCompleteness: "partial",
    validationStatus: BLOCKED_MISSING_TABLE,
    additionalBlockers: Object.freeze([]),
    validationAreas: Object.freeze(["transmission"]),
    requiredInputs: "psi values, lengths, bridge descriptions and element mapping",
    expectedOutputs: "bridge heat-transfer contributions",
    helperCoverage: Object.freeze(["transmissionCoefficients.mjs"]),
    missingPieces: "cleaned psi, length and contribution rows"
  },
  {
    exampleId: "MC001_EX_B_HEATING_MONTHLY_GAINS",
    source: "MC001-2022 Anexa B heating calculation section",
    numericCompleteness: "unclear",
    validationStatus: BLOCKED_MISSING_CLIMATE_DATASET,
    additionalBlockers: Object.freeze([BLOCKED_MISSING_TABLE, BLOCKED_MISSING_INPUTS]),
    validationAreas: Object.freeze([
      "transmission",
      "ventilation",
      "monthly_transfer",
      "monthly_balance"
    ]),
    requiredInputs: "Htr, Hgr, Hve, monthly/annual climate values, hours, gains and utilization factors",
    expectedOutputs: "monthly transfer, gains and heating output values",
    helperCoverage: Object.freeze([
      "transmissionCoefficients.mjs",
      "ventilationCoefficients.mjs",
      "monthlyTransmissionTransfer.mjs",
      "monthlyBalance.mjs"
    ]),
    missingPieces: "MC001 climate/solar datasets and dense monthly table cleanup"
  },
  {
    exampleId: "MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS",
    source: "MC001-2022 Anexa B sections 2.4-2.6",
    numericCompleteness: "partial",
    validationStatus: BLOCKED_MISSING_INPUTS,
    additionalBlockers: Object.freeze([BLOCKED_MISSING_TABLE]),
    validationAreas: Object.freeze([
      "dhw_useful_demand",
      "dhw_displayed_subtotal",
      "ventilation",
      "primary_energy",
      "co2"
    ]),
    requiredInputs:
      "DHW use quantities, Tabel 3.3.1 values, lighting data, ventilation assumptions",
    expectedOutputs: "DHW annual final/primary, lighting final/primary and ventilation context",
    helperCoverage: Object.freeze([
      "dhwUsefulDemand.mjs",
      "dhwDistributionLosses.mjs",
      "ventilationCoefficients.mjs",
      "finalPrimaryCo2Indicators.mjs"
    ]),
    missingPieces:
      "FIXTURE_010 validates the useful-demand service row and FIXTURE_011 validates displayed DHW subtotal arithmetic; annual DHW distribution-loss energy inputs, DHW final-energy system inputs and lighting external-standard data remain missing"
  },
  {
    exampleId: "MC001_EX_B_RENEWABLES_SOLAR_PRODUCTION",
    source: "MC001-2022 Anexa B renewable production table",
    numericCompleteness: "unclear",
    validationStatus: BLOCKED_MISSING_CLIMATE_DATASET,
    additionalBlockers: Object.freeze([BLOCKED_MISSING_TABLE]),
    validationAreas: Object.freeze(["monthly_transfer", "monthly_balance", "primary_energy"]),
    requiredInputs: "collector/PV data, monthly irradiation, orientation/tilt and matching factors",
    expectedOutputs: "monthly and annual renewable production outputs",
    helperCoverage: Object.freeze(["finalPrimaryCo2Indicators.mjs"]),
    missingPieces: "climate/solar table verification and renewable production table cleanup"
  },
  {
    exampleId: "MC001_EX_B_FINAL_PRIMARY_CO2_CPE",
    source: "MC001-2022 Anexa B sections 2.8 and 3",
    numericCompleteness: "partial",
    validationStatus: BLOCKED_MISSING_INPUTS,
    additionalBlockers: Object.freeze([BLOCKED_MISSING_TABLE]),
    validationAreas: Object.freeze([
      "primary_energy",
      "co2",
      "rer_display",
      "energy_class_assignment",
      "utility_inclusion_thresholds"
    ]),
    requiredInputs: "service final-energy breakdown by carrier/service, factors and reference area",
    expectedOutputs:
      "total primary energy, specific primary energy, CO2 indicators, displayed RER and class",
    helperCoverage: Object.freeze([
      "finalPrimaryCo2Indicators.mjs",
      "energyClassAssignment.mjs",
      "utilityInclusionThresholds.mjs"
    ]),
    missingPieces:
      "broader clean service rows beyond fixtures 007/008/012, page 523 heating prose typo, page 527 electric CO2 worked-example factor inconsistency, general RER perimeter, Anexa B class-label trace, reference-building/certificate context and certificate workflow; displayed RER arithmetic is covered by Fixture 012, explicit interval assignment is covered by Fixture 013, and Tabel 5.6 utility-inclusion threshold recalculation is covered by Fixture 014"
  },
  {
    exampleId: "MC001_EX_B_RENOVATION_PACKAGES_ECONOMIC",
    source: "MC001-2022 Anexa B section 5 and tables 5.6-5.12",
    numericCompleteness: "partial",
    validationStatus: BLOCKED_MISSING_TABLE,
    additionalBlockers: Object.freeze([BLOCKED_MISSING_INPUTS]),
    validationAreas: Object.freeze(["primary_energy", "co2"]),
    requiredInputs: "package definitions, before/after indicators, costs, energy prices and assumptions",
    expectedOutputs: "package savings, classes, CO2, global cost and payback ranking",
    helperCoverage: Object.freeze(["finalPrimaryCo2Indicators.mjs"]),
    missingPieces: "economic table/formula visual verification and cleaned before/after package values"
  },
  {
    exampleId: "MC001_EX_B_TECHNICAL_ANNEX_DRAWINGS",
    source: "MC001-2022 Anexa B technical annex and Anexa 3 drawings",
    numericCompleteness: "text_only",
    validationStatus: BLOCKED_MISSING_INPUTS,
    additionalBlockers: Object.freeze([]),
    validationAreas: Object.freeze([]),
    requiredInputs: "drawings, plans, photos and field provenance",
    expectedOutputs: "no direct calculation outputs",
    helperCoverage: Object.freeze([]),
    missingPieces: "numeric calculation outputs"
  }
]);

export const mc001FullyExecutableExampleCandidates = Object.freeze(
  mc001ValidationCandidates.filter((candidate) => candidate.validationStatus === EXECUTABLE)
);

export const mc001ExecutableValidationCases = mc001ExecutableValidationFixtures;

export function summarizeCandidates(candidates = mc001ValidationCandidates) {
  return candidates.reduce(
    (summary, candidate) => {
      summary.total += 1;
      if (candidate.validationStatus === EXECUTABLE) {
        summary.executable += 1;
      } else {
        summary.blocked += 1;
        summary.byBlocker[candidate.validationStatus] =
          (summary.byBlocker[candidate.validationStatus] ?? 0) + 1;
      }

      for (const area of candidate.validationAreas) {
        summary.byArea[area] = (summary.byArea[area] ?? 0) + 1;
      }

      return summary;
    },
    {
      total: 0,
      executable: 0,
      blocked: 0,
      byBlocker: {},
      byArea: {}
    }
  );
}
