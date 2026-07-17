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
      status: options.status ?? CHAPTER_3_MATRIX_STATUS.UNIT_TESTED,
      source: options.source,
      sourceLocation,
      mc001SourcePage: optionForRelation(options.mc001SourcePage, relation, sourceLocation),
      implementation: options.implementation,
      implementedFunction: optionForRelation(options.implementedFunction, relation, options.implementation),
      tests: options.tests,
      validationFixture: options.validationFixture,
      productionRuntimePath: optionForRelation(options.productionRuntimePath, relation, options.runtimeIntegrated ?? false),
      notebookPath: optionForRelation(options.notebookPath, relation, options.notebookTraceable ?? false),
      fixtureExpectedValue: optionForRelation(options.fixtureExpectedValue, relation, options.validationFixture),
      formulaImplemented: true,
      tableImplemented: options.tableImplemented ?? false,
      branchesImplemented: options.branchesImplemented ?? true,
      numericalFixtureCovered: options.numericalFixtureCovered ?? true,
      runtimeIntegrated: options.runtimeIntegrated ?? false,
      notebookTraceable: options.notebookTraceable ?? false,
      explicitInputBoundary: options.explicitInputBoundary ?? false,
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
    tests: [SYSTEM_ENERGY_TEST],
    validationFixture: "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
    tableImplemented: false,
    runtimeIntegrated: "callable runtime relations; integrated project chain may use explicit storage stage balance when detailed storage inputs are absent",
    notebookTraceable: "storage stage balance is notebook-visible; detailed helpers expose compact trace objects",
    productionRuntimePath: "src/physics-engine/mc001Chapter3SystemEnergy.mjs storage helper path and 12-month reference fixture explicit storage stage",
    notebookPath: "src/physics-engine/mc001Chapter3Notebook.mjs storage/system-energy stage lines",
    fixtureExpectedValue: {
      "3.111": "1.3 kWh nominal positive, -0.1 kWh negative raw branch in mc001Chapter3SystemEnergy.test.mjs",
      "3.112": "0.2 kWh input-energy limit in mc001Chapter3SystemEnergy.test.mjs",
      "3.113": "-14.310246136233543 kg nominal decrease and -20 kg mass-limited decrease"
    },
    explicitInputBoundary: true
  }
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
