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
  schema: "mc001_chapter3_production_topology_p8_v1",
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
    "complete SR EN 15193-1 lighting engine"
  ]
};

const coverage = {
  schema: "mc001_chapter3_coverage_matrix_p8_v1",
  source: "src/physics-engine/tests/fixtures/mc001Chapter3ImplementationMatrixFixture.mjs",
  generation: {
    tool: "tools/generate-chapter3-coverage-matrix.mjs",
    deterministic: true
  },
  summary: chapter3MatrixSummary(),
  productionTopology,
  dependencyGraph: chapter3DependencyGraph,
  lightingExternalImplementationPlan: chapter3LightingExternalImplementationPlan,
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
const markdown = [
  "# MC001 Chapter 3 Coverage Matrix",
  "",
  "Generated deterministically from the Chapter 3 source-to-code fixture.",
  "",
  mdTable([
    ["Schema", coverage.schema],
    ["Total tracked relations", summary.totalChapter3RelationsIdentified],
    ["Implemented or explicit-boundary relations", implementedRelations],
    ["Complete available-source percentage", percentage(implementedRelations, summary.totalChapter3RelationsIdentified)],
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
  "## P8 Production Topology",
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
