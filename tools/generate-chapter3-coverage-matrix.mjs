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
  schema: "mc001_chapter3_production_topology_p8c_v1",
  canonicalBoundary: "Chapter 2 monthly useful demand -> Chapter 3 explicit service-system topology",
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
    "subsystem losses, auxiliary/recovery factors and product coefficients not deterministically defined by the owned MC001 source"
  ]
};

const coverage = {
  schema: "mc001_chapter3_coverage_matrix_p8c_v1",
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
      ...Array.from({ length: 10 }, (_, index) => `3.${188 + index}`),
      ...Array.from({ length: 29 }, (_, index) => `3.${200 + index}`)
    ].includes(entry.relation)
  )
  .map(entry => {
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
  "Generated deterministically from the Chapter 3 source-to-code fixture. P8C expands component contracts while preserving separate numerical/procedural/explicit-boundary accounting.",
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
  "## P8C Primary Classification Counts",
  "",
  mdTable(classificationRows),
  "",
  "## Explicit Boundaries Converted Through P8C",
  "",
  convertedBoundaryRows.join("\n"),
  "",
  "## Remaining Explicit Boundary Policy",
  "",
  "An explicit boundary remains only where MC001 requires project/manufacturer technical data, delegates the detailed method to an unavailable standard, or the current production product does not yet expose the complete detailed component contract.",
  "",
  "## P8C Production Topology",
  "",
  "- Single active systems use an implicit allocation fraction of 1; an explicit single-system allocation must also be 1.",
  "- Multiple active heating, cooling or DHW systems require explicit allocation fractions summing to 1.",
  "- The runtime aggregates parallel service chains after each allocated chain has executed the Chapter 3 stage balance.",
  "- Energy carriers are aggregated from the resolved system metadata, not from a single service-level default.",
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
