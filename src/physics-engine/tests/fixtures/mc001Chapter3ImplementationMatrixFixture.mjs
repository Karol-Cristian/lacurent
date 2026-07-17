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

const SYSTEM_ENERGY = "src/physics-engine/mc001Chapter3SystemEnergy.mjs";
const HEATING_SYSTEMS = "src/physics-engine/mc001Chapter3HeatingSystems.mjs";
const DHW_USEFUL = "src/physics-engine/dhwUsefulDemand.mjs";
const DHW_DISTRIBUTION = "src/physics-engine/dhwDistributionLosses.mjs";
const SYSTEM_ENERGY_TEST = "src/physics-engine/tests/mc001Chapter3SystemEnergy.test.mjs";
const HEATING_TEST = "src/physics-engine/tests/mc001Chapter3HeatingSystems.test.mjs";
const INTEGRATED_TEST = "src/physics-engine/tests/mc001Chapter3IntegratedRuntime.test.mjs";
const DHW_USEFUL_TEST = "src/physics-engine/tests/dhwUsefulDemand.test.mjs";
const DHW_DISTRIBUTION_TEST = "src/physics-engine/tests/dhwDistributionLosses.test.mjs";
const REFERENCE_FIXTURE = "MC001_CHAPTER_3_REFERENCE_12_MONTH_EXPLICIT_SYSTEMS_V1";

function relationRange(first, last) {
  return Array.from({ length: last - first + 1 }, (_, index) => `3.${first + index}`);
}

function relationIdForMatrix(relation) {
  return relation.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function relationEntry(relation, options) {
  return Object.freeze({
    matrixId: `CH3_REL_${relationIdForMatrix(relation)}`,
    relation,
    relations: [relation],
    status: options.status,
    source: options.source,
    sourceLocation: options.sourceLocation ?? options.source,
    implementation: options.implementation ?? null,
    tests: Object.freeze(options.tests ?? []),
    validationFixture: options.validationFixture ?? null,
    sourceExtracted: options.sourceExtracted ?? true,
    formulaImplemented: options.formulaImplemented ?? false,
    tableImplemented: options.tableImplemented ?? false,
    branchesImplemented: options.branchesImplemented ?? false,
    numericalFixtureCovered: options.numericalFixtureCovered ?? false,
    runtimeIntegrated: options.runtimeIntegrated ?? false,
    notebookTraceable: options.notebookTraceable ?? false,
    explicitInputBoundary: options.explicitInputBoundary ?? false,
    blocker: options.blocker ?? null
  });
}

function implementedRange(relations, options) {
  return relations.map(relation =>
    relationEntry(relation, {
      status: options.status ?? CHAPTER_3_MATRIX_STATUS.UNIT_TESTED,
      source: options.source,
      implementation: options.implementation,
      tests: options.tests,
      validationFixture: options.validationFixture,
      formulaImplemented: true,
      tableImplemented: options.tableImplemented ?? false,
      branchesImplemented: options.branchesImplemented ?? true,
      numericalFixtureCovered: options.numericalFixtureCovered ?? true,
      runtimeIntegrated: options.runtimeIntegrated ?? false,
      notebookTraceable: options.notebookTraceable ?? false,
      explicitInputBoundary: options.explicitInputBoundary ?? false
    })
  );
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

const heatingRelations = implementedRange(relationRange(1, 39), {
  source: "MC001-2022 Chapter 3.1, pages 136-152",
  implementation: HEATING_SYSTEMS,
  tests: [HEATING_TEST],
  validationFixture: "independent fixed constants in mc001Chapter3HeatingSystems.test.mjs",
  runtimeIntegrated: "integrated through explicit subsystem stage balances; detailed coefficient paths remain callable runtime relations",
  notebookTraceable: "stage balances are notebook-visible; detailed generator helpers expose trace objects",
  explicitInputBoundary: true
});

const ahuRelations = implementedRange(relationRange(40, 93), {
  source: "MC001-2022 Chapter 3.2.2-3.2.3, pages 155-163",
  implementation: SYSTEM_ENERGY,
  tests: [SYSTEM_ENERGY_TEST],
  validationFixture: "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs and integrated reference fixture fan-energy path",
  tableImplemented: "explicit-input boundary for leakage class values and fan-function curves",
  runtimeIntegrated: "fan electric energy and ventilation auxiliary total integrated in the 12-month reference fixture",
  notebookTraceable: "ventilation monthly auxiliary is visible in the Chapter 3 notebook section",
  explicitInputBoundary: true
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
    source: "MC001-2022 Chapter 3.2.4, pages 205-210, Tabel 3.9 and Tabel 3.10",
    implementation: SYSTEM_ENERGY,
    tests: [SYSTEM_ENERGY_TEST],
    validationFixture: "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
    tableImplemented: true,
    runtimeIntegrated: "callable runtime relations; integrated project chain may use explicit storage stage balance when detailed storage inputs are absent",
    notebookTraceable: "storage stage balance is notebook-visible; detailed helpers expose compact trace objects",
    explicitInputBoundary: true
  }
);

const coolingStorageUnreadable = ["3.111", "3.112", "3.113"].map(relation =>
  relationEntry(relation, {
    status: CHAPTER_3_MATRIX_STATUS.GENUINELY_UNAVAILABLE_UNREADABLE,
    source: "MC001-2022 Chapter 3.2.4, pages 207-208, degraded Tabel 3.9 rows between relation 3.110 and 3.114",
    sourceExtracted: false,
    blocker: {
      relation,
      sourceLocation: "MC001-2022 pages 207-208, Tabel 3.9 cooling storage PCM liquid/solid transition continuation",
      requiredEquationOrTable:
        "The exact formula row between relation 3.110 and relation 3.114 in the PCM storage branch.",
      missingElement:
        "The local official PDF renders these rows as unreadable grey artifacts; pdftotext does not expose relation numbers 3.111-3.113 or recoverable symbols.",
      sourceAvailability: "unreadable in local source scan",
      externalStandard: "SR EN 16798-15 is referenced by the table context, but the MC001 row itself is unreadable.",
      requiredInputContract:
        "A reviewed row-by-row transcription of relations 3.111-3.113, including symbols, units and branch limits.",
      whyDeterministicImplementationCannotProceed:
        "Implementing these three PCM continuation rows from adjacent formulas would require guessing the missing equation text and would risk corrupting the normative method."
    }
  })
);

const coolingDistributionRelations = implementedRange(relationRange(136, 155), {
  source: "MC001-2022 Chapter 3.2.5, pages 214-219",
  implementation: SYSTEM_ENERGY,
  tests: [SYSTEM_ENERGY_TEST],
  validationFixture: "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
  tableImplemented: "part-load bins implemented; manufacturer PLV/EER data remain explicit inputs",
  runtimeIntegrated: "cooling explicit stage chain integrated in the 12-month reference fixture",
  notebookTraceable: "cooling monthly stage balances are visible in Chapter 3 notebook section",
  explicitInputBoundary: true
});

const coolingRejectionRelations = implementedRange(relationRange(156, 182), {
  source: "MC001-2022 Chapter 3.2.5-3.2.6, pages 219-235, Tabel 3.18-Tabel 3.23",
  implementation: SYSTEM_ENERGY,
  tests: [SYSTEM_ENERGY_TEST],
  validationFixture: "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
  tableImplemented: true,
  runtimeIntegrated: "callable runtime relations; integrated chain keeps cooling-generator auxiliaries separate from thermal stage balances",
  notebookTraceable: "cooling generator/stage totals are notebook-visible; detailed helpers expose compact trace objects",
  explicitInputBoundary: true
});

const aggregateRelations = implementedRange(relationRange(183, 186), {
  status: CHAPTER_3_MATRIX_STATUS.PRODUCTION_INTEGRATED,
  source: "MC001-2022 Chapter 3.2.7",
  implementation: SYSTEM_ENERGY,
  tests: [SYSTEM_ENERGY_TEST, INTEGRATED_TEST],
  validationFixture: REFERENCE_FIXTURE,
  runtimeIntegrated: true,
  notebookTraceable: true,
  explicitInputBoundary: true
});

const dhwUsefulRelations = implementedRange(relationRange(188, 197), {
  status: CHAPTER_3_MATRIX_STATUS.IMPLEMENTED,
  source: "MC001-2022 Chapter 3.3.5-3.3.6 and Tabel 3.3.1",
  implementation: DHW_USEFUL,
  tests: [DHW_USEFUL_TEST, "src/physics-engine/tests/mc001DhwDemandTable3_3_1.test.mjs"],
  validationFixture: "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION",
  tableImplemented: true,
  runtimeIntegrated: "explicit DHW useful input boundary integrated in Chapter 3 runtime fixture",
  notebookTraceable: "DHW useful boundary is visible in Chapter 3 notebook section",
  explicitInputBoundary: true
});

const dhwDistributionRelations = implementedRange(relationRange(200, 224), {
  source: "MC001-2022 Chapter 3.3.7",
  implementation: DHW_DISTRIBUTION,
  tests: [DHW_DISTRIBUTION_TEST],
  validationFixture: "independent fixed constants in dhwDistributionLosses.test.mjs",
  runtimeIntegrated: "DHW explicit stage chain integrated in 12-month reference fixture; detailed pipe/pump helpers callable",
  notebookTraceable: "DHW monthly stage balances are visible in Chapter 3 notebook section",
  explicitInputBoundary: true
});

const dhwStorageRelations = implementedRange(relationRange(225, 228), {
  source: "MC001-2022 Chapter 3.3.7.4-3.3.8, pages 264-266",
  implementation: DHW_DISTRIBUTION,
  tests: [DHW_DISTRIBUTION_TEST],
  validationFixture: "independent fixed constants in dhwDistributionLosses.test.mjs",
  tableImplemented: "storage product data remains an explicit-input boundary",
  runtimeIntegrated: "DHW storage stage integrated by explicit stage balance; relation 3.228 callable for storage-product loss",
  notebookTraceable: "DHW storage/generation stage balances are visible in Chapter 3 notebook section",
  explicitInputBoundary: true
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
    explicitInputBoundary: true
  })
];

const lightingBlocked = [
  relationEntry("3.4_SR_EN_15193_1_DELEGATED", {
    status: CHAPTER_3_MATRIX_STATUS.GENUINELY_EXTERNALLY_BLOCKED,
    source: "MC001-2022 Chapter 3.4, pages 283-287",
    sourceExtracted: true,
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
  ...coolingStorageUnreadable,
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
    explicitInputBoundaries: chapter3ImplementationMatrix.filter(entry => entry.explicitInputBoundary === true).length,
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
  };
}
