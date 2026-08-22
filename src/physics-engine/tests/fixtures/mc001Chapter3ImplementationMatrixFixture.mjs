export const CHAPTER_3_MATRIX_STATUS = Object.freeze({
  IMPLEMENTED: "implemented",
  UNIT_TESTED: "unit-tested",
  PRODUCTION_INTEGRATED: "production-integrated",
  NOTEBOOK_VISIBLE: "notebook-visible",
  EXPLICIT_INPUT_BOUNDARY: "explicit-input-boundary",
  GENUINELY_EXTERNALLY_BLOCKED: "genuinely-externally-blocked",
  GENUINELY_UNAVAILABLE_UNREADABLE: "genuinely-unavailable-unreadable",
  NORMATIVELY_NOT_APPLICABLE: "normatively-not-applicable"
});

export const CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION = Object.freeze({
  NUMERICALLY_IMPLEMENTED: "NUMERICALLY_IMPLEMENTED",
  PROCEDURALLY_IMPLEMENTED: "PROCEDURALLY_IMPLEMENTED",
  EXPLICIT_INPUT_BOUNDARY: "EXPLICIT_INPUT_BOUNDARY",
  EXTERNAL_STANDARD_BLOCKED: "EXTERNAL_STANDARD_BLOCKED",
  NOT_APPLICABLE: "NOT_APPLICABLE"
});

const SYSTEM_ENERGY = "src/physics-engine/mc001Chapter3SystemEnergy.mjs";
const HEATING_SYSTEMS = "src/physics-engine/mc001Chapter3HeatingSystems.mjs";
const DHW_USEFUL = "src/physics-engine/dhwUsefulDemand.mjs";
const DHW_DISTRIBUTION = "src/physics-engine/dhwDistributionLosses.mjs";
const SYSTEM_ENERGY_TEST = "src/physics-engine/tests/mc001Chapter3SystemEnergy.test.mjs";
const HEATING_TEST = "src/physics-engine/tests/mc001Chapter3HeatingSystems.test.mjs";
const INTEGRATED_TEST = "src/physics-engine/tests/mc001Chapter3IntegratedRuntime.test.mjs";
const DHW_USEFUL_TEST = "src/physics-engine/tests/dhwUsefulDemand.test.mjs";
const DHW_DISTRIBUTION_TEST = "src/physics-engine/tests/dhwDistributionLosses.test.mjs";
const BUILDING_PLATFORM_TEST = "src/building-platform/tests/buildingChapter3InstallationsProduct.test.mjs";
const WIZARD_UI_TEST = "tests/building-platform-wizard-ui.mjs";
const P3V_HEATING_TEST = "validation-reference/python-mc001/tests/test_chapter3_heating.py";
const P3V_VENTILATION_TEST = "validation-reference/python-mc001/tests/test_chapter3_ventilation.py";
const P3V_COOLING_TEST = "validation-reference/python-mc001/tests/test_chapter3_cooling.py";
const REFERENCE_FIXTURE = "MC001_CHAPTER_3_REFERENCE_12_MONTH_EXPLICIT_SYSTEMS_V1";

function relationRange(first, last) {
  return Array.from({ length: last - first + 1 }, (_, index) => `3.${first + index}`);
}

function relationIdForMatrix(relation) {
  return relation.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function relationEntry(relation, options) {
  const implementationClassification =
    options.implementationClassification ??
    (options.status === CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED
      ? CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXTERNAL_STANDARD_BLOCKED
      : options.status === CHAPTER_3_MATRIX_STATUS.NORMATIVELY_NOT_APPLICABLE
        ? CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NOT_APPLICABLE
        : options.explicitInputBoundary === true
          ? CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY
          : CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED);
  return Object.freeze({
    matrixId: `CH3_REL_${relationIdForMatrix(relation)}`,
    relation,
    relations: [relation],
    status: options.status,
    source: options.source,
    sourceLocation: options.sourceLocation ?? options.source,
    mc001SourcePage: options.mc001SourcePage ?? options.sourceLocation ?? options.source,
    implementation: options.implementation ?? null,
    implementedFunction: options.implementedFunction ?? options.implementation ?? null,
    tests: Object.freeze(options.tests ?? []),
    validationFixture: options.validationFixture ?? null,
    productionRuntimePath: options.productionRuntimePath ?? options.runtimeIntegrated ?? null,
    notebookPath: options.notebookPath ?? options.notebookTraceable ?? null,
    fixtureExpectedValue: options.fixtureExpectedValue ?? options.validationFixture ?? null,
    sourceToCodeAuditStatus: options.sourceToCodeAuditStatus ?? options.status,
    sourceExtracted: options.sourceExtracted ?? true,
    formulaImplemented: options.formulaImplemented ?? false,
    tableImplemented: options.tableImplemented ?? false,
    branchesImplemented: options.branchesImplemented ?? false,
    numericalFixtureCovered: options.numericalFixtureCovered ?? false,
    runtimeIntegrated: options.runtimeIntegrated ?? false,
    notebookTraceable: options.notebookTraceable ?? false,
    explicitInputBoundary: options.explicitInputBoundary ?? false,
    implementationClassification,
    primaryImplementationClassification: implementationClassification,
    runtimeCalculatesResult:
      implementationClassification === CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED ||
      implementationClassification === CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.PROCEDURALLY_IMPLEMENTED,
    userMustProvideResultDirectly:
      implementationClassification === CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY,
    inputSourceClassification: options.inputSourceClassification ??
      (options.explicitInputBoundary
        ? "expert_or_project_specific_technical_input"
        : "runtime_or_normative_calculation_input"),
    explicitBoundaryReasonCode: options.explicitBoundaryReasonCode ?? null,
    explicitBoundaryReason: options.explicitBoundaryReason ?? null,
    blocker: options.blocker ?? null
  });
}

function optionForRelation(option, relation, fallback = null) {
  if (typeof option === "function") {
    return option(relation);
  }
  if (option && typeof option === "object" && !Array.isArray(option)) {
    return option[relation] ?? fallback;
  }
  return option ?? fallback;
}

function implementedRange(relations, options) {
  return relations.map(relation => {
    const sourceLocation = optionForRelation(options.sourceLocation, relation, options.source);
    return relationEntry(relation, {
      status: optionForRelation(options.status, relation, CHAPTER_3_MATRIX_STATUS.UNIT_TESTED),
      source: options.source,
      sourceLocation,
      mc001SourcePage: optionForRelation(options.mc001SourcePage, relation, sourceLocation),
      implementation: options.implementation,
      implementedFunction: optionForRelation(options.implementedFunction, relation, options.implementation),
      tests: optionForRelation(options.tests, relation, []),
      validationFixture: optionForRelation(options.validationFixture, relation, null),
      productionRuntimePath: optionForRelation(options.productionRuntimePath, relation, options.runtimeIntegrated ?? false),
      notebookPath: optionForRelation(options.notebookPath, relation, options.notebookTraceable ?? false),
      fixtureExpectedValue: optionForRelation(options.fixtureExpectedValue, relation, options.validationFixture),
      formulaImplemented: true,
      tableImplemented: options.tableImplemented ?? false,
      branchesImplemented: options.branchesImplemented ?? true,
      numericalFixtureCovered: options.numericalFixtureCovered ?? true,
      runtimeIntegrated: optionForRelation(options.runtimeIntegrated, relation, false),
      notebookTraceable: optionForRelation(options.notebookTraceable, relation, false),
      explicitInputBoundary: optionForRelation(
        options.explicitInputBoundary,
        relation,
        false
      ),
      implementationClassification: optionForRelation(
        options.implementationClassification,
        relation,
        undefined
      ),
      inputSourceClassification: optionForRelation(
        options.inputSourceClassification,
        relation,
        undefined
      ),
      explicitBoundaryReason: optionForRelation(
        options.explicitBoundaryReason,
        relation,
        null
      ),
      explicitBoundaryReasonCode: optionForRelation(
        options.explicitBoundaryReasonCode,
        relation,
        null
      ),
      sourceToCodeAuditStatus: options.sourceToCodeAuditStatus ?? "source_to_code_audited"
    });
  });
}

const generalSubsystemRelations = [
  relationEntry("3.a", {
    status: CHAPTER_3_MATRIX_STATUS.NOTEBOOK_VISIBLE,
    source: "MC001-2022 Chapter 3, page 136",
    implementation: HEATING_SYSTEMS,
    tests: [HEATING_TEST, INTEGRATED_TEST],
    validationFixture: REFERENCE_FIXTURE,
    formulaImplemented: true,
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: true,
    notebookTraceable: true
  }),
  relationEntry("3.b", {
    status: CHAPTER_3_MATRIX_STATUS.NOTEBOOK_VISIBLE,
    source: "MC001-2022 Chapter 3, page 136",
    implementation: HEATING_SYSTEMS,
    tests: [HEATING_TEST, INTEGRATED_TEST],
    validationFixture: REFERENCE_FIXTURE,
    formulaImplemented: true,
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: true,
    notebookTraceable: true
  })
];

const p8dHeatingNumericalRelations = new Set([
  "3.1",
  "3.2",
  "3.3",
  "3.4",
  "3.5",
  "3.6",
  "3.7",
  "3.8",
  "3.9",
  "3.10",
  "3.11",
  "3.12",
  "3.13",
  "3.14",
  "3.17",
  "3.23",
  "3.24",
  "3.25",
  "3.26",
  "3.27",
  "3.29",
  "3.30",
  "3.31",
  "3.32",
  "3.34",
  "3.35",
  "3.36",
  "3.37"
]);

const p8dHeatingImplementedFunctions = {
  "3.1": "calculateHeatingEmissionLoss",
  "3.2": "calculateHeatingEmissionEfficiency",
  "3.3": "calculateHeatingEmissionInputEnergy",
  "3.4": "calculateHydronicDesignPower",
  "3.5": "calculateHydronicPressureDrop",
  "3.6": "calculateHydronicPumpEnergy",
  "3.7": "calculateHeatingDistributionAuxiliaryEnergy",
  "3.8": "calculateHydronicPumpEnergyUseFactor",
  "3.9": "calculateHydronicPumpEfficiencyFactor",
  "3.10": "calculateHydronicReferencePumpPower",
  "3.11": "calculateHeatingDistributionSetbackPumpEnergy",
  "3.12": "calculateHeatingDistributionBoostPumpEnergy",
  "3.13": "calculateHeatingDistributionAuxiliaryRecoverableEnergy",
  "3.14": "calculateHeatingDistributionAuxiliaryRecoveredEnergy",
  "3.17": "calculateHeatingGeneratorStandbyLossPower",
  "3.23": "calculateHeatingGeneratorLoadFactor",
  "3.24": "calculateHeatingGeneratorFullLoadHours",
  "3.25": "calculateHeatingGeneratorLossPowerLowLoad",
  "3.26": "calculateHeatingGeneratorLossPowerHighLoad",
  "3.27": "calculateHeatingGeneratorLossEnergy",
  "3.29": "calculateHeatingGeneratorEnvelopeRecoverableLoss",
  "3.30": "calculateHeatingGeneratorAuxiliaryRecoverableFraction",
  "3.31": "calculateHeatingGeneratorAuxiliaryRecoveredLoss",
  "3.32": "calculateHeatingGeneratorAuxiliaryRecoverableLoss",
  "3.34": "calculateHeatingGeneratorAuxiliaryPowerLowLoad",
  "3.35": "calculateHeatingGeneratorAuxiliaryPowerHighLoad",
  "3.36": "calculateIntermediateLoadFactor",
  "3.37": "calculateHeatingGeneratorAuxiliaryEnergy"
};

const p8gSharedGeneratorNumericalRelations = new Set([
  "3.19",
  "3.20",
  "3.21",
  "3.22",
  "3.28",
  "3.33",
  "3.39"
]);

const p8gHeatingNumericalRelations = new Set([
  ...p8dHeatingNumericalRelations,
  ...p8gSharedGeneratorNumericalRelations
]);

const p8gHeatingImplementedFunctions = {
  ...p8dHeatingImplementedFunctions,
  "3.19": "calculateHeatingGeneratorUtilizationFactor",
  "3.20": "calculateHeatingGeneratorFuelInputEnergy",
  "3.21": "calculateHeatingGenerationAuxiliaryTotal",
  "3.22": "calculateGenerationLossTotal",
  "3.28": "calculateRecoverableGenerationLossTotal",
  "3.33": "calculateTotalGenerationAuxiliaryRecoveredLoss",
  "3.39": "calculateCentralGeneratorOutputEnergy"
};

const heatingRelations = implementedRange(relationRange(1, 39), {
  status: relation =>
    p8gHeatingNumericalRelations.has(relation)
      ? CHAPTER_3_MATRIX_STATUS.PRODUCTION_INTEGRATED
      : CHAPTER_3_MATRIX_STATUS.UNIT_TESTED,
  source: "MC001-2022 Chapter 3.1, pages 136-152",
  implementation: HEATING_SYSTEMS,
  implementedFunction: relation => p8gHeatingImplementedFunctions[relation] ?? HEATING_SYSTEMS,
  tests: relation =>
    p8gHeatingNumericalRelations.has(relation)
      ? [HEATING_TEST, BUILDING_PLATFORM_TEST, WIZARD_UI_TEST, P3V_HEATING_TEST]
      : [HEATING_TEST],
  validationFixture: relation =>
    p8gSharedGeneratorNumericalRelations.has(relation)
      ? "P8G shared-generator component-contract fixture plus independent Python reference constants"
      : p8dHeatingNumericalRelations.has(relation)
        ? "P8D heating component-contract fixture plus independent Python reference constants"
      : "independent fixed constants in mc001Chapter3HeatingSystems.test.mjs",
  runtimeIntegrated: relation =>
    p8gHeatingNumericalRelations.has(relation)
      ? true
      : "callable helper or explicit boundary; production requires a more detailed component/product contract before the result can be calculated",
  productionRuntimePath: relation =>
    p8gSharedGeneratorNumericalRelations.has(relation)
      ? "Building DNA technicalSystems.sharedComponents.generators[] plus service generatorRef -> buildingChapter3InstallationsAdapter -> integrated shared-generator runtime -> physical carrier/accounting allocation"
      : p8dHeatingNumericalRelations.has(relation)
      ? "Building DNA technicalSystems.heating.systems[].stages[].lossCalculation/auxiliaryCalculation -> buildingChapter3InstallationsAdapter -> MC001 heating helper -> integrated service-chain stage balance"
      : "callable helper or explicit boundary; production requires a more detailed component/product contract before the result can be calculated",
  notebookTraceable: relation =>
    p8gHeatingNumericalRelations.has(relation)
      ? true
      : "stage balance visible only when final explicit technical value is supplied",
  notebookPath: relation =>
    p8gSharedGeneratorNumericalRelations.has(relation)
      ? "src/physics-engine/mc001Chapter3Notebook.mjs shared generator physical and allocation lines"
      : p8dHeatingNumericalRelations.has(relation)
      ? "src/physics-engine/mc001Chapter3Notebook.mjs heating stage lines with source formula IDs"
      : "stage balance visible only when final explicit technical value is supplied",
  explicitInputBoundary: relation => !p8gHeatingNumericalRelations.has(relation),
  implementationClassification: relation =>
    p8gHeatingNumericalRelations.has(relation)
      ? CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
      : CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY,
  inputSourceClassification: relation =>
    p8gSharedGeneratorNumericalRelations.has(relation)
      ? "shared_generator_component_contract_product_schedule_and_service_allocation_inputs"
      : p8dHeatingNumericalRelations.has(relation)
      ? "heating_component_contract_project_and_product_data"
      : "heating_legacy_explicit_or_unexposed_component_contract_input",
  explicitBoundaryReason: relation =>
    p8gHeatingNumericalRelations.has(relation)
      ? null
      : ({
        "3.15": "PRODUCT_OR_SR_EN_15316_4_1_COEFFICIENTS_C5_C6_REQUIRED for standby loss fraction calculation.",
        "3.16": "PROJECT_ENVELOPE_AND_CHIMNEY_OFF_LOSS_FRACTIONS_REQUIRED before the standby fraction sum can replace explicit technical input.",
        "3.18": "PRODUCT_OR_SR_EN_15316_4_1_COEFFICIENTS_C7_C8_REQUIRED for generator auxiliary power.",
        "3.19": "GENERATOR_FUEL_INPUT_OR_SHARED_GENERATOR_ACCOUNTING_REQUIRED before utilization factor can be claimed in production.",
        "3.20": "RENEWABLE_GENERATOR_HEAT_AND_RECOVERED_AUXILIARY_INPUTS_REQUIRED before fuel input can be calculated without inventing renewable/recovery terms.",
        "3.21": "OTHER_SERVICE_GENERATOR_AUXILIARY_ALLOCATIONS_REQUIRED for a physical shared generator serving heating plus other services.",
        "3.22": "OTHER_SERVICE_GENERATION_LOSSES_AND_DHW_LOSS_BOUNDARY_REQUIRED for central generator loss total.",
        "3.28": "OTHER_SERVICE_RECOVERABLE_GENERATION_LOSSES_REQUIRED for central recoverable loss aggregation.",
        "3.33": "OTHER_SERVICE_RECOVERED_AUXILIARY_LOSSES_REQUIRED for total generation auxiliary recovered loss.",
        "3.38": "CROSS_SERVICE_OPERATION_HOURS_AND_LOAD_FACTORS_REQUIRED for central generator operation time.",
        "3.39": "CENTRAL_GENERATOR_SERVICE_INPUTS_AND_CONTROL_LOSS_FACTOR_REQUIRED before central generator output can be calculated."
      })[relation],
  explicitBoundaryReasonCode: relation =>
    p8gHeatingNumericalRelations.has(relation)
      ? null
      : ({
        "3.15": "PRODUCT_OR_SR_EN_15316_4_1_COEFFICIENTS_C5_C6_REQUIRED",
        "3.16": "PROJECT_ENVELOPE_AND_CHIMNEY_OFF_LOSS_FRACTIONS_REQUIRED",
        "3.18": "PRODUCT_OR_SR_EN_15316_4_1_COEFFICIENTS_C7_C8_REQUIRED",
        "3.19": "GENERATOR_FUEL_INPUT_OR_SHARED_GENERATOR_ACCOUNTING_REQUIRED",
        "3.20": "RENEWABLE_GENERATOR_HEAT_AND_RECOVERED_AUXILIARY_INPUTS_REQUIRED",
        "3.21": "OTHER_SERVICE_GENERATOR_AUXILIARY_ALLOCATIONS_REQUIRED",
        "3.22": "OTHER_SERVICE_GENERATION_LOSSES_AND_DHW_LOSS_BOUNDARY_REQUIRED",
        "3.28": "OTHER_SERVICE_RECOVERABLE_GENERATION_LOSSES_REQUIRED",
        "3.33": "OTHER_SERVICE_RECOVERED_AUXILIARY_LOSSES_REQUIRED",
        "3.38": "CROSS_SERVICE_OPERATION_HOURS_AND_LOAD_FACTORS_REQUIRED",
        "3.39": "CENTRAL_GENERATOR_SERVICE_INPUTS_AND_CONTROL_LOSS_FACTOR_REQUIRED"
      })[relation]
});

const p8fVentilationNumericalRelations = new Set([
  "3.40",
  "3.41",
  "3.42",
  "3.43",
  "3.44",
  "3.45",
  "3.46",
  "3.47",
  "3.48",
  "3.49",
  "3.50",
  "3.51",
  "3.52",
  "3.53",
  "3.54",
  "3.56",
  "3.57",
  "3.58",
  "3.59",
  "3.60",
  "3.61",
  "3.62",
  "3.63",
  "3.64",
  "3.65",
  "3.66",
  "3.67",
  "3.69",
  "3.70",
  "3.71",
  "3.72",
  "3.73",
  "3.74",
  "3.75",
  "3.76",
  "3.77",
  "3.78",
  "3.79",
  "3.80",
  "3.81",
  "3.82",
  "3.83",
  "3.84",
  "3.85",
  "3.86",
  "3.87",
  "3.88",
  "3.89",
  "3.90",
  "3.91"
]);

const p8fVentilationImplementedFunctions = {
  "3.40": "calculateAhuHeatingCoilRequiredEnergy",
  "3.41": "calculateAhuHeatRecoveryEnergy",
  "3.42": "calculateAhuRecirculationAirHeatingEnergy",
  "3.43": "calculateAhuCoolingCoilRequiredEnergy",
  "3.44": "calculateAhuDehumidificationCoolingEnergy",
  "3.45": "calculateAhuHumidificationGeneratorInputEnergy",
  "3.46": "calculateAhuNonSteamHumidificationAuxiliaryEnergy",
  "3.47": "calculateAhuGenerationLossConditioned",
  "3.48": "calculateAhuGenerationLossUnconditioned",
  "3.49": "calculateAhuRecoverableGenerationLoss",
  "3.50": "calculateAhuRecoverableGenerationLoss",
  "3.51": "calculateBalancedResidentialFanTemperatureRise",
  "3.52": "calculateFanTemperatureRise",
  "3.53": "calculateExtractAirTemperatureForRecovery",
  "3.54": "calculateExtractAirTemperatureForRecovery",
  "3.56": "calculateFanEfficiencyFromNominalAndAirflowFactor",
  "3.57": "calculateQuadraticPressureDrop",
  "3.58": "calculateQuadraticPressureDrop",
  "3.59": "calculateQuadraticPressureDrop",
  "3.60": "calculateQuadraticPressureDrop",
  "3.61": "calculateQuadraticPressureDrop",
  "3.62": "calculateQuadraticPressureDrop",
  "3.63": "calculateMultiZoneConstantPressureDrop",
  "3.64": "calculateMultiZoneConstantPressureDrop",
  "3.65": "calculateMultiZoneMinimumPressureDrop",
  "3.66": "calculateMultiZoneMinimumPressureDrop",
  "3.67": "calculateGroundPreheatPrecoolEnergy",
  "3.69": "calculateRotaryHeatRecoveryAuxiliaryEnergy",
  "3.70": "calculatePumpHeatRecoveryAuxiliaryEnergy",
  "3.71": "calculateOtherHeatRecoveryAuxiliaryEnergy",
  "3.72": "calculateFanEnergyAssignedToHeatRecoveryPressure",
  "3.73": "calculatePreheaterEnergy",
  "3.74": "calculateNoPreheaterEnergy",
  "3.75": "calculateVentilationControlAuxiliaryEnergy",
  "3.76": "calculateSteamHumidificationPumpAuxiliaryEnergy",
  "3.77": "calculateHumidificationPumpAuxiliaryEnergy",
  "3.78": "calculateDuctLeakageFactor",
  "3.79": "calculateDuctLeakageAirFlow",
  "3.80": "calculateAhuLeakageFactor",
  "3.81": "calculateRequiredSupplyDistributionAirFlow",
  "3.82": "calculateRequiredExtractDistributionAirFlow",
  "3.83": "allocateSupplyAirFlowToZone",
  "3.84": "allocateExtractAirFlowToZone",
  "3.85": "calculateDuctLeakageFlowFromFactor",
  "3.86": "calculateDuctLeakageFlowFromFactor",
  "3.87": "calculateDuctLeakageFlowFromFactor",
  "3.88": "calculateMaximumZoneFlowFactor",
  "3.89": "calculatePartLoadAhuAirFlow",
  "3.90": "calculatePartLoadAhuAirFlow",
  "3.91": "calculateMaximumFlowFactorFromPartLoad"
};

const p8eCoolingStorageNumericalRelations = new Set([
  "3.99",
  "3.100",
  "3.101",
  "3.115",
  "3.116",
  "3.117",
  "3.118",
  "3.119",
  "3.120",
  "3.121",
  "3.122"
]);

const p8eCoolingDistributionNumericalRelations = new Set([
  "3.146",
  "3.147",
  "3.149",
  "3.150",
  "3.151",
  "3.152",
  "3.154",
  "3.155"
]);

const p8eCoolingRejectionNumericalRelations = new Set([
  "3.164",
  "3.173",
  "3.175",
  "3.176",
  "3.177",
  "3.178",
  "3.179",
  "3.180",
  "3.181"
]);

const ahuRelations = implementedRange(relationRange(40, 93), {
  source: "MC001-2022 Chapter 3.2.2-3.2.3, pages 155-163",
  implementation: SYSTEM_ENERGY,
  implementedFunction: relation => p8fVentilationImplementedFunctions[relation] ?? SYSTEM_ENERGY,
  tests: relation =>
    p8fVentilationNumericalRelations.has(relation)
      ? [SYSTEM_ENERGY_TEST, BUILDING_PLATFORM_TEST, WIZARD_UI_TEST, P3V_VENTILATION_TEST]
      : [SYSTEM_ENERGY_TEST],
  validationFixture: relation =>
    p8fVentilationNumericalRelations.has(relation)
      ? "P8F ventilation/AHU component-contract fixture plus independent Python reference constants"
      : "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs and integrated reference fixture fan-energy path",
  tableImplemented: "explicit-input boundary for leakage class values and fan-function curves",
  runtimeIntegrated: relation =>
    p8fVentilationNumericalRelations.has(relation)
      ? true
      : "fan electric energy and ventilation auxiliary total integrated in the 12-month reference fixture",
  productionRuntimePath: relation =>
    p8fVentilationNumericalRelations.has(relation)
      ? "Building DNA technicalSystems.ventilationAhu.systems[].thermalRelationCalculations/*AuxiliaryCalculation -> buildingChapter3InstallationsAdapter.ventilationForMonth -> MC001 AHU helper"
      : "fan electric energy and ventilation auxiliary total integrated in the 12-month reference fixture",
  notebookTraceable: relation =>
    p8fVentilationNumericalRelations.has(relation)
      ? true
      : "ventilation monthly auxiliary is visible in the Chapter 3 notebook section",
  notebookPath: relation =>
    p8fVentilationNumericalRelations.has(relation)
      ? "Chapter 3 runtime ventilation.sources carries source formula IDs for report/notebook consumers"
      : "ventilation monthly auxiliary is visible in the Chapter 3 notebook section",
  explicitInputBoundary: relation =>
    !["3.55", "3.68"].includes(relation) && !p8fVentilationNumericalRelations.has(relation),
  implementationClassification: relation =>
    p8fVentilationNumericalRelations.has(relation)
      ? CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
      : ({
    "3.55": CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED,
    "3.68": CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
  })[relation],
  inputSourceClassification: relation =>
    p8fVentilationNumericalRelations.has(relation)
      ? "ventilation_ahu_component_contract_product_schedule_and_operation_inputs"
      : ({
    "3.55": "fan_airflow_pressure_efficiency_hours_from_building_dna",
    "3.68": "fan_energy_calculated_plus_heat_recovery_preheat_control_auxiliary_inputs"
  })[relation],
  explicitBoundaryReason: relation =>
    ["3.55", "3.68"].includes(relation) || p8fVentilationNumericalRelations.has(relation)
      ? null
      : "AHU_BRANCH_CONTRACT_FOR_RELATIONS_3_92_3_93_REQUIRED; owned helpers cover 3.40-3.91, while these remaining AHU slots still need the exact source-backed branch and schedule/component contract before the result can replace explicit input.",
  explicitBoundaryReasonCode: relation =>
    ["3.55", "3.68"].includes(relation) || p8fVentilationNumericalRelations.has(relation)
      ? null
      : "AHU_BRANCH_CONTRACT_FOR_RELATIONS_3_92_3_93_REQUIRED"
});

const coolingStorageImplemented = implementedRange(
  [
    "3.94",
    "3.95",
    "3.96",
    "3.97",
    "3.98",
    "3.99",
    "3.100",
    "3.101",
    "3.102",
    "3.103",
    "3.104",
    "3.105",
    "3.106",
    "3.107",
    "3.108",
    "3.109",
    "3.110",
    "3.111",
    "3.112",
    "3.113",
    "3.114",
    "3.115",
    "3.116",
    "3.117",
    "3.118",
    "3.119",
    "3.120",
    "3.121",
    "3.122",
    "3.123"
  ],
  {
    source: "MC001-2022 Chapter 3.2.4, pages 193-200; relations 3.111-3.113 are normative equations on page 199 before Tabel 3.9",
    sourceLocation: {
      "3.111": "MC001-2022 Chapter 3.2.4, page 199, PCM storage sensible solid energy equation",
      "3.112": "MC001-2022 Chapter 3.2.4, page 199, PCM input-energy limiting equation after negative 3.111 result",
      "3.113": "MC001-2022 Chapter 3.2.4, page 199, PCM solid-mass decrease branch"
    },
    implementation: SYSTEM_ENERGY,
    implementedFunction: {
      "3.94": "calculateCoolingStorageInputBoundary",
      "3.95": "calculateCoolingStorageSensibleLiquidEnergy",
      "3.96": "calculateCoolingStorageLatentEnergy",
      "3.97": "calculateCoolingStorageSensibleSolidEnergy",
      "3.98": "calculateCoolingStorageOutputEnergy",
      "3.99": "calculateCoolingStorageThermalLoss",
      "3.100": "calculateCoolingStorageThermalLoss",
      "3.101": "calculateCoolingStorageThermalLoss",
      "3.102": "calculateCoolingStorageTransformableEnergyWater",
      "3.103": "calculateCoolingStorageInitialIceThickness",
      "3.104": "calculateCoolingStorageIceMassVariation",
      "3.105": "calculateCoolingStorageIceThickness",
      "3.106": "calculateCoolingStorageSolidMassAfterUse",
      "3.107": "calculateCoolingStoragePcmSolidMassVariation",
      "3.108": "limitCoolingStoragePcmSolidMassToLiquid",
      "3.109": "limitCoolingStoragePcmSolidMassToExistingSolid",
      "3.110": "calculateCoolingStoragePcmSolidTemperature",
      "3.111": "calculateCoolingStoragePcmSensibleSolidStorageEnergy",
      "3.112": "calculateCoolingStoragePcmInputEnergyLimitForSolidSensibleStorage",
      "3.113": "calculateCoolingStoragePcmSolidMassDecreaseVariation",
      "3.114": "calculateCoolingStoragePcmLiquidTemperature",
      "3.115": "calculateCoolingStoragePumpOperationTime",
      "3.116": "calculateCoolingStorageAuxiliaryEnergy",
      "3.117": "calculateCoolingStoragePumpOperationTime",
      "3.118": "calculateCoolingStorageAuxiliaryEnergy",
      "3.119": "calculateCoolingStorageAuxiliaryTotal",
      "3.120": "calculateCoolingStorageRecoverableAuxiliaryLoss",
      "3.121": "calculateCoolingStorageRecoverableThermalLoss",
      "3.122": "calculateCoolingStorageRecoverableLossTotal",
      "3.123": "calculateCoolingStorageGeneratorDeltaEnergy"
    },
    tests: relation =>
      p8eCoolingStorageNumericalRelations.has(relation) ||
      ["3.111", "3.112", "3.113"].includes(relation)
        ? [SYSTEM_ENERGY_TEST, BUILDING_PLATFORM_TEST, WIZARD_UI_TEST, P3V_COOLING_TEST]
        : [SYSTEM_ENERGY_TEST],
    validationFixture: relation =>
      p8eCoolingStorageNumericalRelations.has(relation)
        ? "P8E cooling storage component-contract fixture plus independent Python reference constants"
        : "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
    tableImplemented: false,
    runtimeIntegrated: relation =>
      p8eCoolingStorageNumericalRelations.has(relation) ||
      ["3.111", "3.112", "3.113"].includes(relation)
        ? true
        : "callable runtime relation; production requires a more detailed cooling-storage component contract before this result can be calculated",
    notebookTraceable: relation =>
      p8eCoolingStorageNumericalRelations.has(relation) ||
      ["3.111", "3.112", "3.113"].includes(relation)
        ? true
        : "storage stage balance is notebook-visible only when final explicit technical value is supplied",
    productionRuntimePath: relation =>
      p8eCoolingStorageNumericalRelations.has(relation)
        ? "Building DNA technicalSystems.cooling.systems[].stages[storage].lossCalculation/auxiliaryCalculation -> buildingChapter3InstallationsAdapter -> MC001 cooling-storage helper -> integrated cooling stage balance"
        : "src/physics-engine/mc001Chapter3SystemEnergy.mjs storage helper path and 12-month reference fixture explicit storage stage",
    notebookPath: relation =>
      p8eCoolingStorageNumericalRelations.has(relation)
        ? "src/physics-engine/mc001Chapter3Notebook.mjs cooling storage stage lines with source formula IDs"
        : "src/physics-engine/mc001Chapter3Notebook.mjs storage/system-energy stage lines",
    fixtureExpectedValue: {
      "3.111": "1.3 kWh nominal positive, -0.1 kWh negative raw branch in mc001Chapter3SystemEnergy.test.mjs",
      "3.112": "0.2 kWh input-energy limit in mc001Chapter3SystemEnergy.test.mjs",
      "3.113": "-14.310246136233543 kg nominal decrease and -20 kg mass-limited decrease"
    },
    explicitInputBoundary: relation =>
      !p8eCoolingStorageNumericalRelations.has(relation) &&
      !["3.111", "3.112", "3.113"].includes(relation),
    implementationClassification: relation =>
      p8eCoolingStorageNumericalRelations.has(relation) ||
      ["3.111", "3.112", "3.113"].includes(relation)
        ? CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
        : CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY,
    inputSourceClassification: relation =>
      p8eCoolingStorageNumericalRelations.has(relation)
        ? "cooling_storage_component_contract_product_geometry_temperature_schedule_inputs"
        : ({
      "3.111": "pcm_storage_monthly_component_inputs_from_building_dna",
      "3.112": "pcm_storage_monthly_component_inputs_from_building_dna",
      "3.113": "pcm_storage_monthly_component_inputs_from_building_dna"
    })[relation],
    explicitBoundaryReason: relation =>
      p8eCoolingStorageNumericalRelations.has(relation) ||
      ["3.111", "3.112", "3.113"].includes(relation)
        ? null
        : ({
          "3.94": "COOLING_STORAGE_INPUT_BOUNDARY_STATE_MODEL_REQUIRED for monthly storage input boundary.",
          "3.95": "COOLING_STORAGE_LIQUID_STATE_INPUTS_REQUIRED for sensible-liquid energy.",
          "3.96": "COOLING_STORAGE_PHASE_CHANGE_STATE_INPUTS_REQUIRED for latent storage energy.",
          "3.97": "COOLING_STORAGE_SOLID_STATE_INPUTS_REQUIRED for sensible-solid energy.",
          "3.98": "COOLING_STORAGE_OUTPUT_STATE_MODEL_REQUIRED for storage output energy.",
          "3.102": "ICE_STORAGE_TRANSFORMABLE_STATE_INPUTS_REQUIRED for transformable water/ice energy.",
          "3.103": "ICE_STORAGE_INITIAL_GEOMETRY_REQUIRED for initial ice thickness.",
          "3.104": "ICE_STORAGE_MASS_VARIATION_STATE_REQUIRED for ice mass variation.",
          "3.105": "ICE_STORAGE_THICKNESS_STATE_REQUIRED for ice thickness update.",
          "3.106": "PCM_STORAGE_SOLID_MASS_STATE_REQUIRED for solid mass after use.",
          "3.107": "PCM_STORAGE_SOLID_MASS_VARIATION_STATE_REQUIRED for PCM solid mass variation.",
          "3.108": "PCM_STORAGE_LIQUID_MASS_LIMIT_REQUIRED for solid mass liquid-limit branch.",
          "3.109": "PCM_STORAGE_EXISTING_SOLID_MASS_LIMIT_REQUIRED for solid mass existing-solid branch.",
          "3.110": "PCM_STORAGE_SOLID_TEMPERATURE_STATE_REQUIRED for solid temperature update.",
          "3.114": "PCM_STORAGE_LIQUID_TEMPERATURE_STATE_REQUIRED for liquid temperature update.",
          "3.123": "COOLING_STORAGE_GENERATOR_DELTA_ENERGY_STATE_REQUIRED for generator delta energy."
        })[relation],
    explicitBoundaryReasonCode: relation =>
      p8eCoolingStorageNumericalRelations.has(relation) ||
      ["3.111", "3.112", "3.113"].includes(relation)
        ? null
        : ({
          "3.94": "COOLING_STORAGE_INPUT_BOUNDARY_STATE_MODEL_REQUIRED",
          "3.95": "COOLING_STORAGE_LIQUID_STATE_INPUTS_REQUIRED",
          "3.96": "COOLING_STORAGE_PHASE_CHANGE_STATE_INPUTS_REQUIRED",
          "3.97": "COOLING_STORAGE_SOLID_STATE_INPUTS_REQUIRED",
          "3.98": "COOLING_STORAGE_OUTPUT_STATE_MODEL_REQUIRED",
          "3.102": "ICE_STORAGE_TRANSFORMABLE_STATE_INPUTS_REQUIRED",
          "3.103": "ICE_STORAGE_INITIAL_GEOMETRY_REQUIRED",
          "3.104": "ICE_STORAGE_MASS_VARIATION_STATE_REQUIRED",
          "3.105": "ICE_STORAGE_THICKNESS_STATE_REQUIRED",
          "3.106": "PCM_STORAGE_SOLID_MASS_STATE_REQUIRED",
          "3.107": "PCM_STORAGE_SOLID_MASS_VARIATION_STATE_REQUIRED",
          "3.108": "PCM_STORAGE_LIQUID_MASS_LIMIT_REQUIRED",
          "3.109": "PCM_STORAGE_EXISTING_SOLID_MASS_LIMIT_REQUIRED",
          "3.110": "PCM_STORAGE_SOLID_TEMPERATURE_STATE_REQUIRED",
          "3.114": "PCM_STORAGE_LIQUID_TEMPERATURE_STATE_REQUIRED",
          "3.123": "COOLING_STORAGE_GENERATOR_DELTA_ENERGY_STATE_REQUIRED"
        })[relation]
  }
);

const coolingDistributionRelations = implementedRange(relationRange(136, 155), {
  source: "MC001-2022 Chapter 3.2.5, pages 214-219",
  implementation: SYSTEM_ENERGY,
  tests: relation =>
    p8eCoolingDistributionNumericalRelations.has(relation)
      ? [SYSTEM_ENERGY_TEST, BUILDING_PLATFORM_TEST, WIZARD_UI_TEST, P3V_COOLING_TEST]
      : [SYSTEM_ENERGY_TEST],
  validationFixture: relation =>
    p8eCoolingDistributionNumericalRelations.has(relation)
      ? "P8E cooling distribution/generator component-contract fixture plus independent Python reference constants"
      : "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
  tableImplemented: "part-load bins implemented; manufacturer PLV/EER data remain explicit inputs",
  runtimeIntegrated: relation =>
    p8eCoolingDistributionNumericalRelations.has(relation)
      ? true
      : "callable helper or explicit boundary; production requires a complete cooling generator/distribution component contract before this result can be calculated",
  notebookTraceable: relation =>
    p8eCoolingDistributionNumericalRelations.has(relation)
      ? true
      : "cooling monthly stage balances are visible only when final explicit technical value is supplied",
  productionRuntimePath: relation =>
    p8eCoolingDistributionNumericalRelations.has(relation)
      ? "Building DNA technicalSystems.cooling.systems[].stages[].lossCalculation/auxiliaryCalculation -> buildingChapter3InstallationsAdapter -> MC001 cooling helper -> integrated cooling stage balance"
      : "callable helper or explicit boundary; production requires a more detailed component contract",
  explicitInputBoundary: relation => !p8eCoolingDistributionNumericalRelations.has(relation),
  implementationClassification: relation =>
    p8eCoolingDistributionNumericalRelations.has(relation)
      ? CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
      : CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY,
  inputSourceClassification: relation =>
    p8eCoolingDistributionNumericalRelations.has(relation)
      ? "cooling_component_contract_project_product_and_operation_inputs"
      : "cooling_legacy_explicit_or_unexposed_component_contract_input",
  explicitBoundaryReason: relation =>
    p8eCoolingDistributionNumericalRelations.has(relation)
      ? null
      : ({
        "3.136": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.137": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.138": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.139": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.140": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.141": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.142": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.143": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.144": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.145": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED for branch selection.",
        "3.148": "COOLING_GENERATOR_INPUT_TOPOLOGY_REQUIRED for complete generator input chain.",
        "3.153": "COOLING_CAPACITY_LIMIT_UNMET_LOAD_CONTRACT_REQUIRED for capacity-limited branch handling."
      })[relation],
  explicitBoundaryReasonCode: relation =>
    p8eCoolingDistributionNumericalRelations.has(relation)
      ? null
      : ({
        "3.136": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.137": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.138": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.139": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.140": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.141": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.142": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.143": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.144": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.145": "COOLING_GENERATOR_OUTLET_TEMPERATURE_TOPOLOGY_REQUIRED",
        "3.148": "COOLING_GENERATOR_INPUT_TOPOLOGY_REQUIRED",
        "3.153": "COOLING_CAPACITY_LIMIT_UNMET_LOAD_CONTRACT_REQUIRED"
      })[relation]
});

const coolingRejectionRelations = implementedRange(relationRange(156, 182), {
  source: "MC001-2022 Chapter 3.2.5-3.2.6, pages 219-235, Tabel 3.18-Tabel 3.23",
  implementation: SYSTEM_ENERGY,
  tests: relation =>
    p8eCoolingRejectionNumericalRelations.has(relation)
      ? [SYSTEM_ENERGY_TEST, BUILDING_PLATFORM_TEST, WIZARD_UI_TEST, P3V_COOLING_TEST]
      : [SYSTEM_ENERGY_TEST],
  validationFixture: relation =>
    p8eCoolingRejectionNumericalRelations.has(relation)
      ? "P8E cooling heat-rejection component-contract fixture plus independent Python reference constants"
      : "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
  tableImplemented: true,
  runtimeIntegrated: relation =>
    p8eCoolingRejectionNumericalRelations.has(relation)
      ? true
      : "callable helper or explicit boundary; production requires a more detailed heat-rejection component contract",
  notebookTraceable: relation =>
    p8eCoolingRejectionNumericalRelations.has(relation)
      ? true
      : "cooling generator/stage totals are notebook-visible only when final explicit technical value is supplied",
  productionRuntimePath: relation =>
    p8eCoolingRejectionNumericalRelations.has(relation)
      ? "Building DNA technicalSystems.cooling.systems[].stages[generation].auxiliaryCalculation -> buildingChapter3InstallationsAdapter -> MC001 cooling heat-rejection helper -> integrated cooling generator auxiliary"
      : "callable helper or explicit boundary; production requires a more detailed heat-rejection component contract",
  explicitInputBoundary: relation => !p8eCoolingRejectionNumericalRelations.has(relation),
  implementationClassification: relation =>
    p8eCoolingRejectionNumericalRelations.has(relation)
      ? CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
      : CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY,
  inputSourceClassification: relation =>
    p8eCoolingRejectionNumericalRelations.has(relation)
      ? "cooling_heat_rejection_component_contract_product_table_and_operation_inputs"
      : "cooling_heat_rejection_legacy_explicit_or_unexposed_component_contract_input",
  explicitBoundaryReason: relation =>
    p8eCoolingRejectionNumericalRelations.has(relation)
      ? null
      : ({
        "3.156": "HEAT_REJECTION_REFERENCE_BRANCH_TOPOLOGY_REQUIRED",
        "3.157": "HEAT_REJECTION_REFERENCE_BRANCH_TOPOLOGY_REQUIRED",
        "3.158": "HEAT_REJECTION_REFERENCE_BRANCH_TOPOLOGY_REQUIRED",
        "3.159": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.160": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.161": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.162": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.163": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.165": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.166": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.167": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.168": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.169": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.170": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.171": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.172": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.174": "ABSORPTION_GENERATOR_PRODUCT_BRANCH_REQUIRED",
        "3.182": "ABSORPTION_GENERATOR_EFFECTIVE_EER_BRANCH_REQUIRED"
      })[relation],
  explicitBoundaryReasonCode: relation =>
    p8eCoolingRejectionNumericalRelations.has(relation)
      ? null
      : ({
        "3.156": "HEAT_REJECTION_REFERENCE_BRANCH_TOPOLOGY_REQUIRED",
        "3.157": "HEAT_REJECTION_REFERENCE_BRANCH_TOPOLOGY_REQUIRED",
        "3.158": "HEAT_REJECTION_REFERENCE_BRANCH_TOPOLOGY_REQUIRED",
        "3.159": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.160": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.161": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.162": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.163": "HEAT_REJECTION_WATER_OR_WET_BULB_OPERATING_CONDITION_REQUIRED",
        "3.165": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.166": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.167": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.168": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.169": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.170": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.171": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.172": "HEAT_REJECTION_RECOVERY_DEMAND_CONTRACT_REQUIRED",
        "3.174": "ABSORPTION_GENERATOR_PRODUCT_BRANCH_REQUIRED",
        "3.182": "ABSORPTION_GENERATOR_EFFECTIVE_EER_BRANCH_REQUIRED"
      })[relation]
});

const aggregateRelations = implementedRange(relationRange(183, 186), {
  status: CHAPTER_3_MATRIX_STATUS.PRODUCTION_INTEGRATED,
  source: "MC001-2022 Chapter 3.2.7",
  implementation: SYSTEM_ENERGY,
  tests: [SYSTEM_ENERGY_TEST, INTEGRATED_TEST],
  validationFixture: REFERENCE_FIXTURE,
  runtimeIntegrated: true,
  notebookTraceable: true,
  explicitInputBoundary: false,
  implementationClassification: CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.PROCEDURALLY_IMPLEMENTED,
  inputSourceClassification: "runtime_stage_aggregation_over_allocated_system_chains"
});

const dhwUsefulRelations = implementedRange(relationRange(188, 197), {
  status: CHAPTER_3_MATRIX_STATUS.PRODUCTION_INTEGRATED,
  source: "MC001-2022 Chapter 3.3.5-3.3.6 and Tabel 3.3.1",
  implementation: DHW_USEFUL,
  tests: [DHW_USEFUL_TEST, "src/physics-engine/tests/mc001DhwDemandTable3_3_1.test.mjs"],
  validationFixture: "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION",
  tableImplemented: true,
  runtimeIntegrated:
    "DHW useful demand can be calculated from Building DNA/usefulDemandSource through MC001 3.188-3.197; legacy monthlyUsefulDemandKWh remains an expert explicit fallback.",
  notebookTraceable: "DHW useful-demand source classification is visible in Chapter 3 notebook section",
  explicitInputBoundary: false,
  implementationClassification: CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED,
  inputSourceClassification: "building_dna_residential_or_table_3_3_1_useful_demand_source"
});

const dhwDistributionRelations = implementedRange(relationRange(200, 224), {
  status: CHAPTER_3_MATRIX_STATUS.PRODUCTION_INTEGRATED,
  source: "MC001-2022 Chapter 3.3.7",
  implementation: DHW_DISTRIBUTION,
  tests: [DHW_DISTRIBUTION_TEST, BUILDING_PLATFORM_TEST],
  validationFixture:
    "independent fixed constants in dhwDistributionLosses.test.mjs and DHW component-contract product fixture",
  runtimeIntegrated:
    "DHW distribution loss, heat tracing, pump auxiliary and recoverable/recovered component contracts resolve through Building DNA stage lossCalculation/auxiliaryCalculation before the integrated service chain.",
  notebookTraceable:
    "DHW monthly stage balances expose calculated-vs-explicit source classification in Chapter 3 notebook lines",
  explicitInputBoundary: false,
  implementationClassification: CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED,
  inputSourceClassification: "dhw_distribution_component_contract_pipe_pump_schedule_inputs"
});

const dhwStorageRelations = implementedRange(relationRange(225, 228), {
  status: CHAPTER_3_MATRIX_STATUS.PRODUCTION_INTEGRATED,
  source: "MC001-2022 Chapter 3.3.7.4-3.3.8, pages 264-266",
  implementation: DHW_DISTRIBUTION,
  tests: [DHW_DISTRIBUTION_TEST, BUILDING_PLATFORM_TEST],
  validationFixture:
    "independent fixed constants in dhwDistributionLosses.test.mjs and DHW component-contract product fixture",
  tableImplemented: "storage product data is accepted as product/component contract input and does not require explicit final loss",
  runtimeIntegrated:
    "DHW heat-tracing protected pipe loss, auxiliary recovery and single-volume storage standing loss resolve through Building DNA stage component contracts.",
  notebookTraceable:
    "DHW storage stage balances expose calculated-vs-explicit source classification in Chapter 3 notebook lines",
  explicitInputBoundary: false,
  implementationClassification: CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED,
  inputSourceClassification: "dhw_storage_component_contract_product_geometry_temperature_schedule_inputs"
});

const lightingImplemented = [
  relationEntry("3.4_EQ_34_LENI", {
    status: CHAPTER_3_MATRIX_STATUS.EXPLICIT_INPUT_BOUNDARY,
    source: "MC001-2022 Chapter 3.4, pages 283-287",
    implementation: SYSTEM_ENERGY,
    tests: [SYSTEM_ENERGY_TEST, INTEGRATED_TEST],
    validationFixture: REFERENCE_FIXTURE,
    formulaImplemented: true,
    tableImplemented: "external SR EN 15193-1 subspace LENI remains explicit input",
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: true,
    notebookTraceable: true,
    explicitInputBoundary: true,
    implementationClassification: CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY,
    explicitBoundaryReasonCode: "SR_EN_15193_1_LIGHTING_ENGINE_REQUIRED",
    explicitBoundaryReason:
      "MC001 delegates detailed lighting calculation to SR EN 15193-1; current runtime only aggregates explicit LENI/monthly lighting inputs."
  })
];

const lightingBlocked = [
  relationEntry("3.4_SR_EN_15193_1_DELEGATED", {
    status: CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED,
    source: "MC001-2022 Chapter 3.4, pages 283-287",
    sourceExtracted: true,
    mc001SourcePage: "MC001-2022 Chapter 3.4, pages 283-287",
    sourceToCodeAuditStatus: "external_standard_required_for_full_lighting_engine",
    blocker: {
      relation: "3.4_SR_EN_15193_1_DELEGATED",
      sourceLocation: "MC001-2022 pages 283-287",
      requiredEquationOrTable:
        "SR EN 15193-1 equations/tables for installed lighting energy, daylight controls, occupancy controls, parasitic energy and emergency lighting.",
      missingElement:
        "The referenced SR EN 15193-1 equations 1-13 and 25-33 are not present in the repository source packs.",
      sourceAvailability: "externally delegated",
      externalStandard: "SR EN 15193-1",
      requiredInputContract:
        "Licensed/reviewed SR EN 15193-1 content, or explicit professional subspace LENI/lighting-energy values.",
      whyDeterministicImplementationCannotProceed:
        "MC001 provides the enclosing LENI aggregation, but delegates the subspace calculation to SR EN 15193-1; reproducing unavailable standard tables would be unsupported."
    }
  })
];

export const chapter3LightingExternalImplementationPlan = Object.freeze({
  status: "lighting_engine_external_source_required",
  mc001EquationsAlreadyImplemented: Object.freeze([
    "MC001 LENI building aggregation over explicit subspace LENI inputs",
    "explicit monthly lighting-energy boundary used by the integrated Chapter 3 reference fixture"
  ]),
  srEn15193EquationsRequiredByMc001: Object.freeze([
    "SR EN 15193-1 equations 1-13 for detailed lighting energy",
    "SR EN 15193-1 equations 25-33 for simplified/auxiliary lighting terms referenced by MC001"
  ]),
  srEn15193TablesAndAnnexesRequired: Object.freeze([
    "Annex B lighting power/default data including Table B.2",
    "daylight dependency factors FD, FD,C, FD,S and related daylight/access parameters",
    "occupancy/control factors Fo, FC, Fcc and control-type parameters",
    "parasitic/control power Pci and emergency-lighting charging power Pei",
    "operating-hour and building-use schedules"
  ]),
  absentRepositorySources: Object.freeze([
    "licensed/reviewed SR EN 15193-1 equation text",
    "licensed/reviewed SR EN 15193-1 lookup tables and annex datasets"
  ]),
  executableBoundaryUntilSourceSupplied:
    "MC001 LENI aggregation may consume explicit professional subspace LENI/monthly lighting-energy inputs; it is not a complete lighting calculation engine."
});

export const chapter3DependencyGraph = Object.freeze({
  usefulEnergyInputs: {
    sources: ["Chapter 2 monthly QHnd/QCnd", "explicit DHW useful demand"],
    dependsOn: ["validated Chapter 2 runtime", "explicit DHW service inputs"],
    outputs: ["monthly useful heating", "monthly useful cooling", "monthly useful DHW"]
  },
  subsystemBalances: {
    sources: ["MC001-2022 Chapter 3, page 136"],
    dependsOn: ["subsystem output", "subsystem losses", "auxiliary energy", "recovery fractions"],
    outputs: ["subsystem input energy", "recoverable energy"]
  },
  heatingSystems: {
    sources: ["MC001-2022 Chapter 3.1, pages 136-152"],
    dependsOn: ["QHnd", "emission", "distribution", "storage", "generation", "auxiliary inputs"],
    outputs: ["heating stage input energies", "heating generation and auxiliary terms"]
  },
  ventilationAhu: {
    sources: ["MC001-2022 Chapter 3.2.2-3.2.3, pages 155-163"],
    dependsOn: ["AHU airflows", "temperatures", "humidity", "fan data", "leakage inputs"],
    outputs: ["AHU heating/cooling coil terms", "fan energy", "duct leakage", "ventilation auxiliary energy"]
  },
  coolingStorage: {
    sources: ["MC001-2022 Chapter 3.2.4, pages 205-210"],
    dependsOn: ["cooling storage masses", "storage temperatures", "loss coefficients", "pump inputs"],
    outputs: ["storage losses", "stored energy", "recoverable storage losses", "storage auxiliary energy"]
  },
  coolingSystems: {
    sources: ["MC001-2022 Chapter 3.2.5-3.2.6, pages 214-235"],
    dependsOn: ["QCnd", "distribution losses", "generator capacity", "part-load inputs", "heat-rejection inputs"],
    outputs: ["cooling generator input", "heat-rejection energy", "auxiliary energy", "cooling EER/B"]
  },
  dhwSystems: {
    sources: ["MC001-2022 Chapter 3.3.5-3.3.9, pages 246-266"],
    dependsOn: ["DHW useful demand", "pipe geometry", "pump inputs", "storage product data"],
    outputs: ["DHW useful energy", "distribution losses", "storage losses", "auxiliary recovery terms"]
  },
  lighting: {
    sources: ["MC001-2022 Chapter 3.4, pages 283-287", "SR EN 15193-1"],
    dependsOn: ["external SR EN 15193-1 subspace LENI or explicit lighting energy"],
    outputs: ["building LENI", "explicit lighting energy boundary"]
  }
});

export const chapter3ImplementationMatrix = Object.freeze([
  ...generalSubsystemRelations,
  ...heatingRelations,
  ...ahuRelations,
  ...coolingStorageImplemented,
  ...coolingDistributionRelations,
  ...coolingRejectionRelations,
  ...aggregateRelations,
  ...dhwUsefulRelations,
  ...dhwDistributionRelations,
  ...dhwStorageRelations,
  ...lightingImplemented,
  ...lightingBlocked
]);

export const discoveredChapter3Relations = Object.freeze(
  chapter3ImplementationMatrix.flatMap(entry => entry.relations)
);

const IMPLEMENTED_STATUSES = new Set([
  CHAPTER_3_MATRIX_STATUS.IMPLEMENTED,
  CHAPTER_3_MATRIX_STATUS.UNIT_TESTED,
  CHAPTER_3_MATRIX_STATUS.PRODUCTION_INTEGRATED,
  CHAPTER_3_MATRIX_STATUS.NOTEBOOK_VISIBLE,
  CHAPTER_3_MATRIX_STATUS.EXPLICIT_INPUT_BOUNDARY
]);

export function chapter3MatrixSummary() {
  const implemented = chapter3ImplementationMatrix.filter(entry =>
    IMPLEMENTED_STATUSES.has(entry.status)
  );
  const externalBlockers = chapter3ImplementationMatrix.filter(
    entry => entry.status === CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED
  );
  const unavailable = chapter3ImplementationMatrix.filter(
    entry => entry.status === CHAPTER_3_MATRIX_STATUS.GENUINELY_UNAVAILABLE_UNREADABLE
  );

  return {
    matrixStatus:
      externalBlockers.length === 0 && unavailable.length === 0
        ? "CHAPTER_3_MATRIX_COMPLETE"
        : "CHAPTER_3_MATRIX_MAXIMUM_AVAILABLE_COVERAGE",
    relationCount: discoveredChapter3Relations.length,
    totalChapter3RelationsIdentified: discoveredChapter3Relations.length,
    implementedEntryCount: implemented.length,
    implementedEquations: chapter3ImplementationMatrix.filter(entry => entry.formulaImplemented === true).length,
    implementedTablesLookups: chapter3ImplementationMatrix.filter(entry => entry.tableImplemented === true).length,
    implementedBranches: chapter3ImplementationMatrix.filter(entry => entry.branchesImplemented === true).length,
    explicitInputBoundaries: chapter3ImplementationMatrix.filter(
      entry =>
        entry.implementationClassification ===
        CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY
    ).length,
    runtimeIntegratedEntryCount: chapter3ImplementationMatrix.filter(entry => entry.runtimeIntegrated === true).length,
    runtimeIntegratedRelations: chapter3ImplementationMatrix.filter(entry => entry.runtimeIntegrated === true).length,
    fixtureCoveredRelations: chapter3ImplementationMatrix.filter(entry => entry.numericalFixtureCovered === true).length,
    notebookTraceableEntryCount: chapter3ImplementationMatrix.filter(entry => entry.notebookTraceable === true).length,
    notebookVisibleRelations: chapter3ImplementationMatrix.filter(entry => entry.notebookTraceable === true).length,
    blockerEntryCount: externalBlockers.length + unavailable.length,
    genuinelyExternallyBlockedRelations: externalBlockers.length,
    genuinelyUnavailableUnreadableRelations: unavailable.length,
    uncoveredRelations: [],
    blockerMatrixIds: [...externalBlockers, ...unavailable].map(entry => entry.matrixId),
    blockerDetails: [...externalBlockers, ...unavailable].map(entry => entry.blocker)
    ,
    p8bClassificationCounts: Object.values(
      CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION
    ).reduce((counts, classification) => {
      counts[classification] = chapter3ImplementationMatrix.filter(
        entry => entry.implementationClassification === classification
      ).length;
      return counts;
    }, {}),
    numericallyImplementedRelations: chapter3ImplementationMatrix.filter(
      entry =>
        entry.implementationClassification ===
        CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
    ).length,
    procedurallyImplementedRelations: chapter3ImplementationMatrix.filter(
      entry =>
        entry.implementationClassification ===
        CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.PROCEDURALLY_IMPLEMENTED
    ).length,
    explicitInputBoundaryRelations: chapter3ImplementationMatrix.filter(
      entry =>
        entry.implementationClassification ===
        CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXPLICIT_INPUT_BOUNDARY
    ).length,
    externalStandardBlockedRelations: chapter3ImplementationMatrix.filter(
      entry =>
        entry.implementationClassification ===
        CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.EXTERNAL_STANDARD_BLOCKED
    ).length,
    notApplicableRelations: chapter3ImplementationMatrix.filter(
      entry =>
        entry.implementationClassification ===
        CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NOT_APPLICABLE
    ).length,
    numericalImplementationPercentage:
      chapter3ImplementationMatrix.length === 0
        ? 0
        : Number(
            (
              (chapter3ImplementationMatrix.filter(
                entry =>
                  entry.implementationClassification ===
                  CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED
              ).length /
                chapter3ImplementationMatrix.length) *
              100
            ).toFixed(1)
          ),
    productionCompleteSupportedScopePercentage:
      chapter3ImplementationMatrix.length === 0
        ? 0
        : Number(
            (
              (chapter3ImplementationMatrix.filter(entry =>
                [
                  CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.NUMERICALLY_IMPLEMENTED,
                  CHAPTER_3_P8B_IMPLEMENTATION_CLASSIFICATION.PROCEDURALLY_IMPLEMENTED
                ].includes(entry.implementationClassification)
              ).length /
                chapter3ImplementationMatrix.length) *
              100
            ).toFixed(1)
          )
  };
}
