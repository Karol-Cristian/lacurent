export const CHAPTER_3_MATRIX_STATUS = Object.freeze({
  IMPLEMENTED: "implemented",
  IMPLEMENTED_ISOLATED_EXPLICIT_INPUT: "implemented_isolated_explicit_input",
  INDEXED_RULE_ONLY: "indexed_rule_only",
  BLOCKED_VISUAL_EXTRACTION: "blocked_visual_extraction",
  BLOCKED_EXTERNAL_STANDARD: "blocked_external_standard",
  BLOCKED_SOURCE_INPUTS: "blocked_source_inputs"
});

export const discoveredChapter3Relations = Object.freeze([
  "3.1_TO_3.39",
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
  "3.55",
  "3.56_TO_3.67",
  "3.68_TO_3.77",
  "3.80_TO_3.93",
  "3.94_TO_3.123",
  "3.136_TO_3.147",
  "3.148_TO_3.182",
  "3.183",
  "3.184",
  "3.185",
  "3.186",
  "3.188",
  "3.189",
  "3.190",
  "3.191",
  "3.192",
  "3.193",
  "3.194",
  "3.195",
  "3.196",
  "3.197",
  "3.200",
  "3.201",
  "3.202",
  "3.203",
  "3.204",
  "3.205",
  "3.206",
  "3.207",
  "3.208",
  "3.209",
  "3.210",
  "3.211",
  "3.212",
  "3.213",
  "3.214",
  "3.215",
  "3.216",
  "3.217",
  "3.218",
  "3.219",
  "3.220",
  "3.221",
  "3.222",
  "3.223",
  "3.224",
  "3.225_TO_3.228",
  "3.4_LIGHTING_SR_EN_15193_1"
]);

export const chapter3DependencyGraph = Object.freeze({
  heatingSystems: {
    sources: ["MC001-2022 3.1", "MC001-2022 3.2.7"],
    dependsOn: [
      "Chapter 2 QHnd",
      "emission losses",
      "distribution losses",
      "storage losses",
      "generation losses",
      "auxiliary inputs"
    ],
    outputs: ["QH,gen,in", "WH,in,tot"],
    blockers: [
      "3.1 detailed formulas are not implementation-ready in the current reviewed repository extraction"
    ]
  },
  coolingVentilationSystems: {
    sources: ["MC001-2022 3.2", "MC001-2022 3.2.7"],
    dependsOn: [
      "Chapter 2 QCnd",
      "AHU data",
      "fan data",
      "cooling generator performance",
      "storage/distribution inputs"
    ],
    outputs: ["QC,gen,in", "WC,in,tot", "AHU recoverable losses"],
    blockers: [
      "many 3.2 formulas are marked needs_visual_verification or depend on manufacturer/SR EN data"
    ]
  },
  dhwUsefulDemand: {
    sources: ["MC001-2022 3.3.5", "MC001-2022 3.3.6", "MC001-2022 Tabel 3.3.1"],
    dependsOn: ["DHW volume", "temperature basis", "water properties", "service-unit count"],
    outputs: ["QW,nd", "VW,day"],
    blockers: []
  },
  dhwDistributionAuxiliary: {
    sources: ["MC001-2022 3.3.7"],
    dependsOn: [
      "DHW useful demand",
      "pipe geometry",
      "pipe transmittance",
      "operation periods",
      "pump data"
    ],
    outputs: ["QW,dis,ls,total", "QW,dis,ls,rbl", "WW,dis,an"],
    blockers: ["worked annual distribution examples retain documented source-input/unit blockers"]
  },
  dhwStorageGeneration: {
    sources: ["MC001-2022 3.3.8", "MC001-2022 3.3.9"],
    dependsOn: ["storage product data", "DHW generation method", "SR EN 15316-4-1"],
    outputs: ["QW,sto,ls", "QW,gen,ls"],
    blockers: ["current repository extraction marks storage/generation formulas pending or delegated"]
  },
  lighting: {
    sources: ["MC001-2022 3.4", "SR EN 15193-1"],
    dependsOn: [
      "installed lighting power",
      "operation schedules",
      "daylight factors",
      "control factors",
      "standby/emergency inputs"
    ],
    outputs: ["WL,t", "WP,t", "W", "LENI"],
    blockers: [
      "MC001 delegates formulas/tables to SR EN 15193-1; the local repository does not contain reviewed external standard equations/tables"
    ]
  }
});

export const chapter3ImplementationMatrix = Object.freeze([
  {
    matrixId: "CH3_HEATING_SYSTEMS_3_1",
    relations: ["3.1_TO_3.39"],
    source: "MC001-2022 3.1",
    implementationStatus: CHAPTER_3_MATRIX_STATUS.BLOCKED_VISUAL_EXTRACTION,
    implementation: null,
    tests: [],
    notebookTraceability: "blocked_until_reviewed_formula_extraction",
    validationFixture: null,
    dependencyList: ["QHnd", "heating subsystem data"],
    expectedInputs: ["system type", "subsystem losses", "generator data", "auxiliary inputs"],
    expectedOutputs: ["heating system losses", "generator input energy", "auxiliary energy"],
    coverage: "covered_as_blocked_source_domain",
    blocker: "The current reviewed repository extraction does not expose implementable formulas for this detailed group."
  },
  {
    matrixId: "CH3_AHU_VISUAL_PENDING",
    relations: [
      "3.40",
      "3.41",
      "3.42",
      "3.43",
      "3.44",
      "3.45",
      "3.46",
      "3.47",
      "3.48",
      "3.51",
      "3.52",
      "3.55",
      "3.56_TO_3.67",
      "3.68_TO_3.77",
      "3.80_TO_3.93"
    ],
    source: "MC001-2022 3.2.2-3.2.3",
    implementationStatus: CHAPTER_3_MATRIX_STATUS.BLOCKED_VISUAL_EXTRACTION,
    implementation: null,
    tests: [],
    notebookTraceability: "blocked_until_reviewed_formula_extraction",
    validationFixture: null,
    dependencyList: ["AHU data", "airflow", "fan curves", "humidity data"],
    expectedInputs: ["AHU configuration", "airflow", "temperatures", "moisture data", "operation period"],
    expectedOutputs: ["AHU coil energy", "fan energy", "air leakage", "heat recovery terms"],
    coverage: "covered_as_blocked_source_domain",
    blocker: "The extraction marks these formulas as needs_visual_verification or partial pending."
  },
  {
    matrixId: "CH3_AHU_RECOVERY_EXTRACT_AIR",
    relations: ["3.49", "3.50", "3.53", "3.54"],
    source: "MC001-2022 3.2.3",
    implementationStatus: CHAPTER_3_MATRIX_STATUS.IMPLEMENTED_ISOLATED_EXPLICIT_INPUT,
    implementation: "src/physics-engine/mc001Chapter3SystemEnergy.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter3SystemEnergy.test.mjs"],
    notebookTraceability: "trace_nodes_available_for_explicit_inputs",
    validationFixture: "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
    dependencyList: ["AHU location", "AHU generation loss", "extract fan position"],
    expectedInputs: ["QV,ls,gen", "AHU location", "thetaETA,dis,out", "deltaThetaFan,ETA"],
    expectedOutputs: ["QV,ls,gen,rbl", "thetaETA,hr,in"],
    coverage: "implemented"
  },
  {
    matrixId: "CH3_COOLING_STORAGE_GENERATION_PENDING",
    relations: ["3.94_TO_3.123", "3.136_TO_3.147", "3.148_TO_3.182"],
    source: "MC001-2022 3.2.4-3.2.6",
    implementationStatus: CHAPTER_3_MATRIX_STATUS.BLOCKED_VISUAL_EXTRACTION,
    implementation: null,
    tests: [],
    notebookTraceability: "blocked_until_reviewed_formula_extraction",
    validationFixture: null,
    dependencyList: ["cooling storage state", "generator performance maps", "heat rejection data"],
    expectedInputs: ["storage medium data", "EER/COP/PLV data", "cooling system type"],
    expectedOutputs: ["cooling storage losses", "cooling generator input", "heat rejection auxiliary energy"],
    coverage: "covered_as_blocked_source_domain",
    blocker: "Formula groups are indexed but not reviewed into exact implementable relations."
  },
  {
    matrixId: "CH3_SYSTEM_AGGREGATES_3_183_TO_3_186",
    relations: ["3.183", "3.184", "3.185", "3.186"],
    source: "MC001-2022 3.2.7",
    implementationStatus: CHAPTER_3_MATRIX_STATUS.IMPLEMENTED_ISOLATED_EXPLICIT_INPUT,
    implementation: "src/physics-engine/mc001Chapter3SystemEnergy.mjs",
    tests: ["src/physics-engine/tests/mc001Chapter3SystemEnergy.test.mjs"],
    notebookTraceability: "trace_nodes_available_for_explicit_inputs",
    validationFixture: "independent fixed constants in mc001Chapter3SystemEnergy.test.mjs",
    dependencyList: ["useful demand", "subsystem loss terms", "auxiliary terms"],
    expectedInputs: ["QHnd/QCnd", "emission/distribution/storage/generation losses", "auxiliary components"],
    expectedOutputs: ["QH,gen,in", "QC,gen,in", "WH,in,tot", "WC,in,tot"],
    coverage: "implemented"
  },
  {
    matrixId: "CH3_DHW_USEFUL_DEMAND_3_188_TO_3_197",
    relations: ["3.188", "3.189", "3.190", "3.191", "3.192", "3.193", "3.194", "3.195", "3.196", "3.197"],
    source: "MC001-2022 3.3.5-3.3.6 and Tabel 3.3.1",
    implementationStatus: CHAPTER_3_MATRIX_STATUS.IMPLEMENTED,
    implementation: "src/physics-engine/dhwUsefulDemand.mjs",
    tests: [
      "src/physics-engine/tests/dhwUsefulDemand.test.mjs",
      "src/physics-engine/tests/mc001DhwDemandTable3_3_1.test.mjs"
    ],
    notebookTraceability: "trace_nodes_available_for_explicit_inputs",
    validationFixture: "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION",
    dependencyList: ["DHW volume", "temperature correction", "water density", "specific heat"],
    expectedInputs: ["Vt", "cW", "rhoW", "thetaW,draw", "thetaW,c", "Ah or Tabel 3.3.1 unit count"],
    expectedOutputs: ["QW,nd", "VW,day"],
    coverage: "implemented"
  },
  {
    matrixId: "CH3_DHW_DISTRIBUTION_AUX_3_200_TO_3_224",
    relations: [
      "3.200",
      "3.201",
      "3.202",
      "3.203",
      "3.204",
      "3.205",
      "3.206",
      "3.207",
      "3.208",
      "3.209",
      "3.210",
      "3.211",
      "3.212",
      "3.213",
      "3.214",
      "3.215",
      "3.216",
      "3.217",
      "3.218",
      "3.219",
      "3.220",
      "3.221",
      "3.222",
      "3.223",
      "3.224"
    ],
    source: "MC001-2022 3.3.7",
    implementationStatus: CHAPTER_3_MATRIX_STATUS.IMPLEMENTED_ISOLATED_EXPLICIT_INPUT,
    implementation: "src/physics-engine/dhwDistributionLosses.mjs",
    tests: ["src/physics-engine/tests/dhwDistributionLosses.test.mjs"],
    notebookTraceability: "trace_nodes_available_for_explicit_inputs",
    validationFixture: "independent fixed constants in dhwDistributionLosses.test.mjs",
    dependencyList: ["DHW pipe transmittance", "pipe lengths", "operation time", "pump data"],
    expectedInputs: ["Psi", "thetaW", "thetaW,amb", "L", "Lequip", "t", "pump explicit parameters"],
    expectedOutputs: ["distribution losses", "recoverable losses", "auxiliary distribution energy"],
    coverage: "implemented_with_source_example_gaps_preserved"
  },
  {
    matrixId: "CH3_DHW_STORAGE_GENERATION_PENDING",
    relations: ["3.225_TO_3.228"],
    source: "MC001-2022 3.3.7.4-3.3.9",
    implementationStatus: CHAPTER_3_MATRIX_STATUS.BLOCKED_SOURCE_INPUTS,
    implementation: null,
    tests: [],
    notebookTraceability: "blocked_until_formula_and_inputs_are_reviewed",
    validationFixture: null,
    dependencyList: ["DHW generation subsystem", "DHW storage/product data", "SR EN 15316-4-1"],
    expectedInputs: ["generator type", "storage/generation losses", "auxiliary recovery factors"],
    expectedOutputs: ["DHW storage/generation losses", "recovered auxiliary heat"],
    coverage: "covered_as_blocked_source_domain",
    blocker: "The current repository extraction marks storage/generation values as pending or delegated; Fixture 011 explicitly does not validate relation 3.228."
  },
  {
    matrixId: "CH3_LIGHTING_3_4",
    relations: ["3.4_LIGHTING_SR_EN_15193_1"],
    source: "MC001-2022 3.4 and SR EN 15193-1",
    implementationStatus: CHAPTER_3_MATRIX_STATUS.BLOCKED_EXTERNAL_STANDARD,
    implementation: null,
    tests: [],
    notebookTraceability: "blocked_external_standard_contract",
    validationFixture: null,
    dependencyList: ["SR EN 15193-1 equations and annex tables"],
    expectedInputs: ["installed lighting power", "tD", "tN", "Fo", "FD", "FC", "Wpe/Wpc", "area"],
    expectedOutputs: ["WL,t", "WP,t", "W", "LENI"],
    coverage: "covered_as_blocked_external_standard",
    blocker: "MC001 delegates formulas/tables to SR EN 15193-1; local repository does not contain reviewed external standard dataset."
  }
]);

export function chapter3MatrixSummary() {
  const implemented = chapter3ImplementationMatrix.filter(entry =>
    entry.implementationStatus === CHAPTER_3_MATRIX_STATUS.IMPLEMENTED ||
    entry.implementationStatus === CHAPTER_3_MATRIX_STATUS.IMPLEMENTED_ISOLATED_EXPLICIT_INPUT
  );
  const blocked = chapter3ImplementationMatrix.filter(entry =>
    entry.implementationStatus.startsWith("blocked")
  );
  const coveredRelations = new Set(
    chapter3ImplementationMatrix.flatMap(entry => entry.relations)
  );
  const uncoveredRelations = discoveredChapter3Relations.filter(
    relation => !coveredRelations.has(relation)
  );

  return {
    matrixStatus:
      blocked.length === 0 && uncoveredRelations.length === 0
        ? "CHAPTER_3_MATRIX_COMPLETE"
        : "CHAPTER_3_MATRIX_INCOMPLETE",
    relationCount: discoveredChapter3Relations.length,
    implementedEntryCount: implemented.length,
    blockedEntryCount: blocked.length,
    uncoveredRelations,
    blockedMatrixIds: blocked.map(entry => entry.matrixId)
  };
}
