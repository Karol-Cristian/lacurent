export const CHAPTER_3_MATRIX_STATUS = Object.freeze({
  IMPLEMENTED: "implemented",
  UNIT_TESTED: "unit-tested",
  PRODUCTION_INTEGRATED: "production-integrated",
  NOTEBOOK_VISIBLE: "notebook-visible",
  EXPLICIT_INPUT_BOUNDARY: "explicit-input-boundary",
  GENUINELY_EXTERNALLY_BLOCKED: "genuinely-externally-blocked",
  NORMATIVELY_NOT_APPLICABLE: "normatively-not-applicable"
});

export const discoveredChapter3Relations = Object.freeze([
  "3.a",
  "3.b",
  "3.1_TO_3.39",
  "3.40_TO_3.48",
  "3.49_TO_3.55",
  "3.56_TO_3.77",
  "3.78_TO_3.93",
  "3.94_TO_3.123",
  "3.136_TO_3.147",
  "3.148_TO_3.155",
  "3.156_TO_3.182",
  "3.183_TO_3.186",
  "3.188_TO_3.197",
  "3.200_TO_3.224",
  "3.225_TO_3.228",
  "3.4_EQ_34_LENI",
  "3.4_SR_EN_15193_1_DELEGATED"
]);

export const chapter3DependencyGraph = Object.freeze({
  usefulEnergyInputs: {
    sources: ["Chapter 2 monthly QHnd/QCnd", "explicit DHW useful demand"],
    dependsOn: ["validated Chapter 2 runtime", "explicit DHW service inputs"],
    outputs: ["monthly useful heating", "monthly useful cooling", "monthly useful DHW"]
  },
  subsystemBalances: {
    sources: ["MC001-2022 Chapter 3, general equations 3.a and 3.b"],
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
  coolingSystems: {
    sources: ["MC001-2022 Chapter 3.2.5, pages 214-219"],
    dependsOn: ["QCnd", "distribution losses", "generator capacity", "part-load inputs", "EER correction inputs"],
    outputs: ["cooling generator input requirement", "covered load factor", "temperature correction factor"]
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
  {
    matrixId: "CH3_GENERAL_SUBSYSTEM_BALANCES_3A_3B",
    relations: ["3.a", "3.b"],
    status: CHAPTER_3_MATRIX_STATUS.NOTEBOOK_VISIBLE,
    source: "MC001-2022 Chapter 3, page 136",
    implementation: "src/physics-engine/mc001Chapter3HeatingSystems.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter3HeatingSystems.test.mjs"],
    validationFixture: "MC001_CHAPTER_3_REFERENCE_12_MONTH_EXPLICIT_SYSTEMS_V1",
    sourceExtracted: true,
    formulaImplemented: true,
    tableImplemented: null,
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: true,
    notebookTraceable: true,
    blocker: null
  },
  {
    matrixId: "CH3_HEATING_SYSTEMS_3_1_TO_3_39",
    relations: ["3.1_TO_3.39"],
    status: CHAPTER_3_MATRIX_STATUS.UNIT_TESTED,
    source: "MC001-2022 Chapter 3.1, pages 136-152",
    implementation: "src/physics-engine/mc001Chapter3HeatingSystems.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter3HeatingSystems.test.mjs"],
    validationFixture: "independent fixed constants in mc001Chapter3HeatingSystems.test.mjs",
    sourceExtracted: true,
    formulaImplemented: true,
    tableImplemented: "explicit-input boundary for SR EN 15316-4-1 coefficient tables",
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: "integrated through explicit subsystem stage balances; detailed boiler coefficient paths are callable runtime relations",
    notebookTraceable: "stage balances notebook-visible; detailed generator helpers expose trace objects",
    blocker: null
  },
  {
    matrixId: "CH3_AHU_VENTILATION_3_40_TO_3_93",
    relations: ["3.40_TO_3.48", "3.49_TO_3.55", "3.56_TO_3.77", "3.78_TO_3.93"],
    status: CHAPTER_3_MATRIX_STATUS.UNIT_TESTED,
    source: "MC001-2022 Chapter 3.2.2-3.2.3, pages 155-163",
    implementation: "src/physics-engine/mc001Chapter3SystemEnergy.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter3SystemEnergy.test.mjs"],
    validationFixture: "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs and integrated reference fixture fan-energy path",
    sourceExtracted: true,
    formulaImplemented: true,
    tableImplemented: "explicit-input boundary for leakage class values and fan-function curves",
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: "fan electric energy and ventilation auxiliary total integrated in the 12-month reference fixture",
    notebookTraceable: "ventilation monthly auxiliary visible in Chapter 3 notebook section",
    blocker: null
  },
  {
    matrixId: "CH3_COOLING_STORAGE_3_94_TO_3_123",
    relations: ["3.94_TO_3.123"],
    status: CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED,
    source: "MC001-2022 Chapter 3.2.4, pages 205-210",
    implementation: null,
    tests: [],
    validationFixture: null,
    sourceExtracted: "partial OCR/table extraction only",
    formulaImplemented: false,
    tableImplemented: false,
    branchesImplemented: false,
    numericalFixtureCovered: false,
    runtimeIntegrated: false,
    notebookTraceable: false,
    blocker: {
      relation: "3.94-3.123",
      sourceLocation: "MC001-2022 pages 205-210, Tabel 3.9 and Tabel 3.10 cooling storage method",
      unavailableArtifact:
        "machine-readable equations/table cells for the storage-state and storage-loss sequence; local PDF text extraction interleaves columns and symbols, and deterministic implementation would risk formula corruption without manual table transcription or higher-quality source",
      externalStandard: "SR EN 16798-15 / SR EN 16798-9 references in the table context",
      neededToUnblock:
        "reviewed row-by-row transcription of Tabel 3.9/Tabel 3.10 with symbols, units, branches and coefficients"
    }
  },
  {
    matrixId: "CH3_COOLING_DISTRIBUTION_GENERATION_3_136_TO_3_155",
    relations: ["3.136_TO_3.147", "3.148_TO_3.155"],
    status: CHAPTER_3_MATRIX_STATUS.UNIT_TESTED,
    source: "MC001-2022 Chapter 3.2.5, pages 214-219",
    implementation: "src/physics-engine/mc001Chapter3SystemEnergy.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter3SystemEnergy.test.mjs"],
    validationFixture: "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
    sourceExtracted: true,
    formulaImplemented: true,
    tableImplemented: "part-load bins implemented from MC001 text; PLV/EER tables are explicit-input boundaries",
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: "cooling explicit stage chain integrated in the 12-month reference fixture",
    notebookTraceable: "cooling monthly stage balances visible in Chapter 3 notebook section",
    blocker: null
  },
  {
    matrixId: "CH3_COOLING_REJECTION_REMAINING_3_156_TO_3_182",
    relations: ["3.156_TO_3.182"],
    status: CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED,
    source: "MC001-2022 Chapter 3.2.5-3.2.6, pages 219-235",
    implementation: null,
    tests: [],
    validationFixture: null,
    sourceExtracted: "indexed but not fully transcribed in the existing repository extraction",
    formulaImplemented: false,
    tableImplemented: false,
    branchesImplemented: false,
    numericalFixtureCovered: false,
    runtimeIntegrated: false,
    notebookTraceable: false,
    blocker: {
      relation: "3.156-3.182",
      sourceLocation: "MC001-2022 pages 219-235",
      unavailableArtifact:
        "reviewed heat-rejection/generator-performance coefficient tables and branch definitions needed after the already implemented 3.148-3.155 part-load and temperature correction equations",
      externalStandard:
        "manufacturer performance data and delegated cooling-generator/heat-rejection standards referenced by MC001",
      neededToUnblock:
        "complete manual transcription of the remaining cooling-generator and heat-rejection relations plus any delegated coefficient contracts"
    }
  },
  {
    matrixId: "CH3_SYSTEM_AGGREGATES_3_183_TO_3_186",
    relations: ["3.183_TO_3.186"],
    status: CHAPTER_3_MATRIX_STATUS.PRODUCTION_INTEGRATED,
    source: "MC001-2022 Chapter 3.2.7",
    implementation: "src/physics-engine/mc001Chapter3SystemEnergy.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter3SystemEnergy.test.mjs", "src/physics-engine/tests/mc001Chapter3IntegratedRuntime.test.mjs"],
    validationFixture: "MC001_CHAPTER_3_REFERENCE_12_MONTH_EXPLICIT_SYSTEMS_V1",
    sourceExtracted: true,
    formulaImplemented: true,
    tableImplemented: null,
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: true,
    notebookTraceable: true,
    blocker: null
  },
  {
    matrixId: "CH3_DHW_USEFUL_DEMAND_3_188_TO_3_197",
    relations: ["3.188_TO_3.197"],
    status: CHAPTER_3_MATRIX_STATUS.IMPLEMENTED,
    source: "MC001-2022 Chapter 3.3.5-3.3.6 and Tabel 3.3.1",
    implementation: "src/physics-engine/dhwUsefulDemand.mjs",
    tests: [
      "src/physics-engine/tests/dhwUsefulDemand.test.mjs",
      "src/physics-engine/tests/mc001DhwDemandTable3_3_1.test.mjs"
    ],
    validationFixture: "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION",
    sourceExtracted: true,
    formulaImplemented: true,
    tableImplemented: true,
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: "explicit DHW useful input boundary integrated in Chapter 3 runtime fixture",
    notebookTraceable: "DHW useful boundary visible in Chapter 3 notebook section",
    blocker: null
  },
  {
    matrixId: "CH3_DHW_DISTRIBUTION_AUX_3_200_TO_3_224",
    relations: ["3.200_TO_3.224"],
    status: CHAPTER_3_MATRIX_STATUS.UNIT_TESTED,
    source: "MC001-2022 Chapter 3.3.7",
    implementation: "src/physics-engine/dhwDistributionLosses.mjs",
    tests: ["src/physics-engine/tests/dhwDistributionLosses.test.mjs"],
    validationFixture: "independent fixed constants in dhwDistributionLosses.test.mjs",
    sourceExtracted: true,
    formulaImplemented: true,
    tableImplemented: null,
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: "DHW explicit stage chain integrated in 12-month reference fixture; detailed pipe/pump helpers callable",
    notebookTraceable: "DHW monthly stage balances visible in Chapter 3 notebook section",
    blocker: null
  },
  {
    matrixId: "CH3_DHW_HEAT_TRACING_STORAGE_3_225_TO_3_228",
    relations: ["3.225_TO_3.228"],
    status: CHAPTER_3_MATRIX_STATUS.UNIT_TESTED,
    source: "MC001-2022 Chapter 3.3.7.4-3.3.8, pages 264-266",
    implementation: "src/physics-engine/dhwDistributionLosses.mjs",
    tests: ["src/physics-engine/tests/dhwDistributionLosses.test.mjs"],
    validationFixture: "independent fixed constants in dhwDistributionLosses.test.mjs",
    sourceExtracted: true,
    formulaImplemented: true,
    tableImplemented: "storage product data remains explicit-input boundary",
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: "DHW storage stage integrated by explicit stage balance; relation 3.228 callable for storage-product loss",
    notebookTraceable: "DHW storage/generation stage balances visible in Chapter 3 notebook section",
    blocker: null
  },
  {
    matrixId: "CH3_LIGHTING_LENI_3_4_EQ_34",
    relations: ["3.4_EQ_34_LENI"],
    status: CHAPTER_3_MATRIX_STATUS.EXPLICIT_INPUT_BOUNDARY,
    source: "MC001-2022 Chapter 3.4, pages 283-287",
    implementation: "src/physics-engine/mc001Chapter3SystemEnergy.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter3SystemEnergy.test.mjs", "src/physics-engine/tests/mc001Chapter3IntegratedRuntime.test.mjs"],
    validationFixture: "MC001_CHAPTER_3_REFERENCE_12_MONTH_EXPLICIT_SYSTEMS_V1",
    sourceExtracted: true,
    formulaImplemented: true,
    tableImplemented: "external SR EN 15193-1 subspace LENI remains explicit input",
    branchesImplemented: true,
    numericalFixtureCovered: true,
    runtimeIntegrated: true,
    notebookTraceable: true,
    blocker: null
  },
  {
    matrixId: "CH3_LIGHTING_SR_EN_15193_1_DELEGATED",
    relations: ["3.4_SR_EN_15193_1_DELEGATED"],
    status: CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED,
    source: "MC001-2022 Chapter 3.4, pages 283-287",
    implementation: null,
    tests: [],
    validationFixture: null,
    sourceExtracted: true,
    formulaImplemented: false,
    tableImplemented: false,
    branchesImplemented: false,
    numericalFixtureCovered: false,
    runtimeIntegrated: false,
    notebookTraceable: false,
    blocker: {
      relation: "SR EN 15193-1 equations 1-13 and 25-33 referenced by MC001 Chapter 3.4",
      sourceLocation: "MC001-2022 pages 283-287 explicitly delegates calculation to SR EN 15193-1",
      unavailableArtifact:
        "SR EN 15193-1 equations/tables for installed lighting energy, daylight controls, occupancy controls and parasitic/emergency energy are not present in the repository",
      externalStandard: "SR EN 15193-1",
      neededToUnblock:
        "licensed/reviewed SR EN 15193-1 content or explicit professional subspace LENI/lighting-energy inputs"
    }
  }
]);

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
  const blockers = chapter3ImplementationMatrix.filter(
    entry => entry.status === CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED
  );
  const coveredRelations = new Set(
    chapter3ImplementationMatrix.flatMap(entry => entry.relations)
  );
  const uncoveredRelations = discoveredChapter3Relations.filter(
    relation => !coveredRelations.has(relation)
  );

  return {
    matrixStatus:
      blockers.length === 0 && uncoveredRelations.length === 0
        ? "CHAPTER_3_MATRIX_COMPLETE"
        : "CHAPTER_3_MATRIX_MAXIMUM_AVAILABLE_COVERAGE",
    relationCount: discoveredChapter3Relations.length,
    implementedEntryCount: implemented.length,
    blockerEntryCount: blockers.length,
    runtimeIntegratedEntryCount: chapter3ImplementationMatrix.filter(entry => entry.runtimeIntegrated === true || String(entry.runtimeIntegrated).includes("integrated")).length,
    notebookTraceableEntryCount: chapter3ImplementationMatrix.filter(entry => entry.notebookTraceable === true || String(entry.notebookTraceable).includes("visible")).length,
    uncoveredRelations,
    blockerMatrixIds: blockers.map(entry => entry.matrixId),
    blockerDetails: blockers.map(entry => entry.blocker)
  };
}
