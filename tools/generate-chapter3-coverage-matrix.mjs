import { writeFileSync } from "node:fs";
import {
  chapter3DependencyGraph,
  chapter3ImplementationMatrix,
  chapter3LightingExternalImplementationPlan,
  chapter3MatrixSummary
} from "../src/physics-engine/tests/fixtures/mc001Chapter3ImplementationMatrixFixture.mjs";

const JSON_PATH = "validation-reference/chapter3-coverage-matrix.json";
const MD_PATH = "validation-reference/chapter3-coverage-matrix.md";

const productionTopology = {
  schema: "mc001_chapter3_production_topology_p8i_v1",
  canonicalBoundary: "Chapter 2 monthly useful demand -> Chapter 3 service-system topology -> optional shared physical components -> carrier accounting",
  supportedServiceChains: [
    "heating",
    "cooling",
    "domestic_hot_water",
    "ventilation_ahu_auxiliary",
    "cooling_storage_pcm",
    "lighting_explicit_leni_boundary"
  ],
  supportedTopology: {
    singleSystem: "implicit allocationFraction = 1 for one active service system; explicit single-system allocation must be 1",
    parallelSystems:
      "multiple active heating/cooling/DHW systems are supported only with explicit allocationFraction values that sum to 1",
    sharedGenerators:
      "one physical generator may serve heating and DHW through stable generatorRef values; physical output, losses, auxiliaries and carrier input are calculated once and then service-reported through explicit allocation fractions",
    stageOrder: {
      heating: ["emission", "distribution", "storage", "generation"],
      cooling: ["emission", "distribution", "storage", "generation"],
      domesticHotWater: ["distribution", "storage", "generation"]
    }
  },
  unsupportedWithoutExplicitInputs: [
    "automatic sizing/allocation between multiple systems",
    "implicit typical efficiencies",
    "complete SR EN 15193-1 lighting engine",
    "subsystem losses, auxiliary/recovery factors and product coefficients not deterministically defined by the owned MC001 source or not yet exposed through a component contract"
  ]
};

const coverage = {
  schema: "mc001_chapter3_coverage_matrix_p8i_v1",
  source: "src/physics-engine/tests/fixtures/mc001Chapter3ImplementationMatrixFixture.mjs",
  generation: {
    tool: "tools/generate-chapter3-coverage-matrix.mjs",
    deterministic: true
  },
  summary: chapter3MatrixSummary(),
  productionTopology,
  dependencyGraph: chapter3DependencyGraph,
  lightingExternalImplementationPlan: chapter3LightingExternalImplementationPlan,
  explicitBoundaryRegister: chapter3ImplementationMatrix
    .filter(entry => entry.implementationClassification === "EXPLICIT_INPUT_BOUNDARY")
    .map(entry => ({
      matrixId: entry.matrixId,
      relation: entry.relation,
      source: entry.source,
      runtimeImplementation: entry.implementedFunction,
      reasonCode: entry.explicitBoundaryReasonCode ?? null,
      reason: entry.explicitBoundaryReason ??
        "The current production path requires explicit technical input for this relation."
    })),
  entries: chapter3ImplementationMatrix
};

function percentage(part, total) {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function statusCounts(entries) {
  return entries.reduce((counts, entry) => {
    counts[entry.status] = (counts[entry.status] ?? 0) + 1;
    return counts;
  }, {});
}

function mdTable(rows) {
  return [
    "| Field | Value |",
    "| --- | --- |",
    ...rows.map(([field, value]) => `| ${field} | ${value} |`)
  ].join("\n");
}

const counts = statusCounts(chapter3ImplementationMatrix);
const summary = chapter3MatrixSummary();
const implementedRelations = summary.totalChapter3RelationsIdentified - summary.blockerEntryCount;
const classificationRows = Object.entries(summary.p8bClassificationCounts)
  .sort(([a], [b]) => a.localeCompare(b));
const convertedBoundaryRows = chapter3ImplementationMatrix
  .filter(entry => entry.implementationClassification === "NUMERICALLY_IMPLEMENTED")
  .filter(entry =>
    [
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
      "3.15",
      "3.16",
      "3.17",
      "3.18",
      "3.19",
      "3.20",
      "3.21",
      "3.22",
      "3.23",
      "3.24",
      "3.25",
      "3.26",
      "3.27",
      "3.28",
      "3.29",
      "3.30",
      "3.31",
      "3.32",
      "3.33",
      "3.34",
      "3.35",
      "3.36",
      "3.37",
      "3.38",
      "3.39",
      ...Array.from({ length: 15 }, (_, index) => `3.${40 + index}`),
      "3.55",
      ...Array.from({ length: 12 }, (_, index) => `3.${56 + index}`),
      "3.68",
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
      ...Array.from({ length: 9 }, (_, index) => `3.${83 + index}`),
      "3.92",
      "3.93",
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
      "3.123",
      "3.136",
      "3.137",
      "3.138",
      "3.139",
      "3.140",
      "3.141",
      "3.142",
      "3.143",
      "3.144",
      "3.145",
      "3.146",
      "3.147",
      "3.148",
      "3.149",
      "3.150",
      "3.151",
      "3.152",
      "3.153",
      "3.154",
      "3.155",
      "3.156",
      "3.157",
      "3.158",
      "3.159",
      "3.160",
      "3.161",
      "3.162",
      "3.163",
      "3.164",
      "3.165",
      "3.166",
      "3.167",
      "3.168",
      "3.169",
      "3.170",
      "3.171",
      "3.172",
      "3.173",
      "3.174",
      "3.175",
      "3.176",
      "3.177",
      "3.178",
      "3.179",
      "3.180",
      "3.181",
      "3.182",
      ...Array.from({ length: 10 }, (_, index) => `3.${188 + index}`),
      ...Array.from({ length: 29 }, (_, index) => `3.${200 + index}`)
    ].includes(entry.relation)
  )
  .map(entry => {
    if (entry.inputSourceClassification?.includes("shared_generator_component_contract")) {
      return `- ${entry.relation}: Shared generator component contract resolves central output, physical losses, auxiliaries, recoverable/recovered quantities, fuel input and service allocation from product/schedule/allocation inputs.`;
    }
    if (entry.inputSourceClassification?.includes("shared_generator_cross_service_operation_schedule")) {
      return `- ${entry.relation}: Shared generator operation-time contract resolves relation 3.38 from service operating hours and load factors.`;
    }
    if (entry.inputSourceClassification?.includes("heating_generator_product_coefficient")) {
      return `- ${entry.relation}: Heating generator coefficient contract resolves C5-C8 standby/auxiliary branches from product coefficients and project operation inputs.`;
    }
    if (entry.inputSourceClassification?.includes("heating_component_contract")) {
      return `- ${entry.relation}: Heating component contract resolves emission, hydronic pump, generator loss/auxiliary or recovery calculations from project/product inputs.`;
    }
    if (entry.inputSourceClassification?.includes("ventilation_ahu_component_contract")) {
      return `- ${entry.relation}: Ventilation/AHU component contract resolves coil, recovery, humidification, generation-loss or auxiliary relations from product/project/schedule inputs.`;
    }
    if (
      entry.inputSourceClassification?.includes("cooling_storage_component_contract") ||
      entry.inputSourceClassification?.includes("cooling_storage_pcm_state_component_contract")
    ) {
      return `- ${entry.relation}: Cooling storage/PCM component contract resolves storage state, thermal-loss, pump auxiliary or recoverable-loss calculations from product, geometry, temperature and schedule inputs.`;
    }
    if (entry.inputSourceClassification?.includes("cooling_component_contract")) {
      return `- ${entry.relation}: Cooling component contract resolves distribution factors, part-load/capacity checks and EER correction from project/product inputs.`;
    }
    if (entry.inputSourceClassification?.includes("cooling_generator_capacity_product_operation_unmet_load")) {
      return `- ${entry.relation}: Cooling generator capacity/part-load contract resolves constant setpoint, supplied cooling, unmet cooling and PLV from product and operating inputs.`;
    }
    if (entry.inputSourceClassification?.includes("cooling_heat_rejection_component_contract")) {
      return `- ${entry.relation}: Cooling heat-rejection component contract resolves compression, rejected heat, auxiliaries and effective EER from product/table/operation inputs.`;
    }
    if (entry.inputSourceClassification?.includes("cooling_absorption_product_heat_ratio")) {
      return `- ${entry.relation}: Absorption cooling contract resolves rejected heat, recoverable heat, driving thermal input and effective performance ratio from product data and operation inputs.`;
    }
    if (entry.inputSourceClassification?.includes("dhw_distribution")) {
      return `- ${entry.relation}: DHW distribution component contract resolves pipe, pump, heat-tracing and recovery calculations.`;
    }
    if (entry.inputSourceClassification?.includes("dhw_storage")) {
      return `- ${entry.relation}: DHW storage component contract resolves storage standing-loss and heat-tracing calculations.`;
    }
    return `- ${entry.relation}: DHW useful-demand source now resolves through Building DNA \`usefulDemandSource\` and MC001 helper functions.`;
  });
const markdown = [
  "# MC001 Chapter 3 Coverage Matrix",
  "",
  "Generated deterministically from the Chapter 3 source-to-code fixture. P8I closes the remaining supported cooling capacity, unmet-load, absorption, multi-carrier and relation 3.38 operation-time boundaries while preserving separate numerical/procedural/explicit-boundary accounting.",
  "",
  mdTable([
    ["Schema", coverage.schema],
    ["Total tracked relations", summary.totalChapter3RelationsIdentified],
    ["Numerically implemented relations", summary.numericallyImplementedRelations],
    ["Procedurally implemented relations", summary.procedurallyImplementedRelations],
    ["Explicit-input boundary relations", summary.explicitInputBoundaryRelations],
    ["External-standard blocked relations", summary.externalStandardBlockedRelations],
    ["Not applicable relations", summary.notApplicableRelations],
    ["Numerical implementation percentage", `${summary.numericalImplementationPercentage.toFixed(1)}%`],
    ["Production complete supported-scope percentage", `${summary.productionCompleteSupportedScopePercentage.toFixed(1)}%`],
    ["Externally blocked relations", summary.genuinelyExternallyBlockedRelations],
    ["Unavailable/unreadable relations", summary.genuinelyUnavailableUnreadableRelations],
    ["Runtime-integrated entries", summary.runtimeIntegratedEntryCount],
    ["Notebook-visible entries", summary.notebookTraceableEntryCount],
    ["Implemented tables/lookups", summary.implementedTablesLookups]
  ]),
  "",
  "## Status Counts",
  "",
  mdTable(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
  "",
  "## P8I Primary Classification Counts",
  "",
  mdTable(classificationRows),
  "",
  "## Explicit Boundaries Converted Through P8I",
  "",
  convertedBoundaryRows.join("\n"),
  "",
  "## Remaining Explicit Boundary Policy",
  "",
  "An explicit boundary remains only where MC001 requires project/manufacturer technical data, delegates the detailed method to an unavailable standard, or the current production product does not yet expose the complete detailed component contract.",
  "",
  "## P8I Production Topology",
  "",
  "- Single active systems use an implicit allocation fraction of 1; an explicit single-system allocation must also be 1.",
  "- Multiple active heating, cooling or DHW systems require explicit allocation fractions summing to 1.",
  "- Heating and DHW may reference one canonical physical generator through stable `generatorRef` values; the runtime calculates physical output, losses, auxiliaries and carrier energy once.",
  "- Shared-generator service reporting uses explicit service allocation fractions unless a source-backed normative allocation rule is implemented.",
  "- The runtime aggregates parallel service chains after each allocated chain has executed the Chapter 3 stage balance.",
  "- Energy carriers are aggregated from the resolved system metadata, not from a single service-level default.",
  "- Heating component contracts now calculate emission temperature-increase losses, hydronic pump auxiliaries, no-storage branches and generator loss/auxiliary curves where required project/product data are supplied.",
  "- Ventilation/AHU component contracts now calculate heat-recovery, preheat, control auxiliary, coil, humidification and generation-loss branches where required product/project/operation inputs are supplied.",
  "- Cooling component contracts now calculate distribution losses/auxiliaries, no-storage branches, storage thermal losses, storage pump auxiliaries and compression heat-rejection auxiliaries where required project/product data are supplied.",
  "- P8I cooling generator contracts explicitly report supplied and unmet cooling under capacity limits and separate absorption driving thermal energy from electric auxiliaries for carrier aggregation.",
  "",
  "## Remaining External Dependency",
  "",
  summary.blockerDetails.map(blocker => [
    `- ${blocker.relation}: ${blocker.externalStandard}`,
    `  - Missing: ${blocker.missingElement}`,
    `  - Required contract: ${blocker.requiredInputContract}`
  ].join("\n")).join("\n"),
  ""
].join("\n");

writeFileSync(JSON_PATH, `${JSON.stringify(coverage, null, 2)}\n`);
writeFileSync(MD_PATH, `${markdown.trimEnd()}\n`);
