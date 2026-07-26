import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const graph = JSON.parse(
  readFileSync(new URL("../validation-reference/normative-knowledge-graph.json", import.meta.url), "utf8")
);
const climateDependencies = JSON.parse(
  readFileSync(new URL("../validation-reference/romanian-climate-normative-dependencies.json", import.meta.url), "utf8")
);
const subchapterCoverage = JSON.parse(
  readFileSync(new URL("../validation-reference/mc001-subchapter-coverage.json", import.meta.url), "utf8")
);

const CLIMATE_CONCEPTS = [
  "concept.climate_zone",
  "concept.winter_design_temperature",
  "concept.monthly_exterior_temperature",
  "concept.monthly_solar_irradiation",
  "concept.preprocessed_solar_irradiation_hsol",
  "concept.degree_days",
  "concept.wind_zone",
  "concept.climatic_station",
  "concept.locality_station_mapping",
  "concept.locality_mapping",
  "concept.heating_period_duration",
  "concept.cooling_period_duration",
  "concept.reference_building_climate"
];

const REQUIRED_TBD_IDS = [
  "tbd.romanian_locality_climate_wind_zone_registry",
  "tbd.sky_radiation_inputs_if_selected_method_requires",
  "tbd.mc001_6_2013_cooling_ventilation_design_climate",
  "tbd.mc001_6_2013_degree_days",
  "tbd.sr_en_iso_52010_1_climate_preprocessing"
];

function assertUnique(ids, label) {
  assert.equal(new Set(ids).size, ids.length, label);
}

function assertAcyclic(nodes, edges, label) {
  const nodeIds = new Set(nodes.map(node => node.id));
  for (const edge of edges) {
    assert.equal(nodeIds.has(edge.from), true, `${label}: missing from node ${edge.from}`);
    assert.equal(nodeIds.has(edge.to), true, `${label}: missing to node ${edge.to}`);
  }

  const visiting = new Set();
  const visited = new Set();
  const adjacency = new Map(nodes.map(node => [node.id, []]));
  for (const edge of edges) {
    adjacency.get(edge.from).push(edge.to);
  }

  function visit(id, path = []) {
    if (visited.has(id)) return;
    assert.equal(visiting.has(id), false, `${label}: cycle ${[...path, id].join(" -> ")}`);
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) {
      visit(next, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const node of nodes) {
    visit(node.id);
  }
}

assert.equal(graph.schema, "romanian_normative_climate_knowledge_graph_v1");
assert.equal(graph.generatedBy, "tools/generate-normative-knowledge-graph.mjs");
assert.equal(graph.registryVersion, climateDependencies.registryVersion);
assert.equal(graph.runtimeBehaviorChanged, false);

const sourceIds = graph.sourceDocuments.map(document => document.id);
assertUnique(sourceIds, "source documents must be unique");
assert.equal(sourceIds.includes("doc.mc001_2022"), true);
assert.equal(sourceIds.includes("doc.mc001_2022_annex_d"), true);
assert.equal(sourceIds.includes("doc.mc001_6_2013"), true);
assert.equal(sourceIds.includes("doc.sr_en_iso_52010_1"), true);

const knowledgeNodeIds = graph.knowledgeGraph.nodes.map(node => node.id);
assertUnique(knowledgeNodeIds, "knowledge graph nodes must be unique");
for (const conceptId of CLIMATE_CONCEPTS) {
  assert.equal(knowledgeNodeIds.includes(conceptId), true, conceptId);
}

const concepts = graph.knowledgeGraph.nodes.filter(node => node.type === "climate_concept");
assert.equal(concepts.length >= CLIMATE_CONCEPTS.length, true);
for (const concept of concepts) {
  assert.equal(concept.canonicalId, concept.id, concept.id);
  assert.equal(typeof concept.description, "string", concept.id);
  assert.ok(concept.description.length > 0, concept.id);
  assert.equal(typeof concept.units, "string", concept.id);
  assert.ok(Array.isArray(concept.runtimeUsage), concept.id);
  assert.ok(Array.isArray(concept.formulas), concept.id);
  assert.equal(typeof concept.notebookUsage, "string", concept.id);
  assert.equal(typeof concept.reportUsage, "string", concept.id);
  assert.equal(typeof concept.canonicalSourceId, "string", concept.id);
  assert.equal(concept.canonicalSourceId, concept.sourceDocument, concept.id);
  assert.equal(sourceIds.includes(concept.canonicalSourceId), true, concept.id);
  assert.equal(typeof concept.sourceEdition, "string", concept.id);
  assert.equal(typeof concept.implementationStatus, "string", concept.id);
  assert.equal(typeof concept.datasetStatus, "string", concept.id);
}

const tbdIds = graph.canonicalTbdRegistry.map(item => item.id);
assertUnique(tbdIds, "TBD registry ids must be unique");
for (const tbdId of REQUIRED_TBD_IDS) {
  assert.equal(tbdIds.includes(tbdId), true, tbdId);
}

const unresolvedConcepts = concepts.filter(concept =>
  concept.datasetStatus === "DATASET_UNAVAILABLE" ||
  concept.implementationStatus === "EXTERNAL_DATA_DEPENDENCY" ||
  concept.implementationStatus === "EXTERNAL_STANDARD_DEPENDENCY"
);
assert.equal(unresolvedConcepts.length > 0, true);
for (const concept of unresolvedConcepts) {
  assert.equal(typeof concept.tbdId, "string", concept.id);
  assert.equal(tbdIds.includes(concept.tbdId), true, concept.id);
}

const availableConcepts = concepts.filter(concept =>
  concept.datasetStatus !== "DATASET_UNAVAILABLE" &&
  !concept.implementationStatus.startsWith("EXTERNAL_")
);
for (const concept of availableConcepts) {
  assert.equal(concept.tbdId, null, concept.id);
}

assertAcyclic(graph.knowledgeGraph.nodes, graph.knowledgeGraph.edges, "knowledge graph");
assertAcyclic(graph.normativeDependencyGraph.nodes, graph.normativeDependencyGraph.edges, "normative dependency graph");
assertAcyclic(graph.runtimeDependencyGraph.nodes, graph.runtimeDependencyGraph.edges, "runtime dependency graph");

const runtimeNodes = graph.runtimeDependencyGraph.nodes.filter(node => node.type === "runtime_calculation");
assertUnique(runtimeNodes.map(node => node.id), "runtime nodes must be unique");
assert.equal(runtimeNodes.length, climateDependencies.requirementMatrix.length);
for (const requirement of climateDependencies.requirementMatrix) {
  const runtimeNode = runtimeNodes.find(node => node.id === `runtime.${requirement.calculationId}`);
  assert.ok(runtimeNode, requirement.calculationId);
  assert.deepEqual(runtimeNode.requirementKeys, requirement.requires, requirement.calculationId);
  assert.deepEqual(runtimeNode.outputs, requirement.outputDomains, requirement.calculationId);
  assert.equal(runtimeNode.missingDiagnostic, requirement.missingDiagnostic, requirement.calculationId);
  assert.equal(runtimeNode.requires.length > 0, true, requirement.calculationId);
  for (const requiredConcept of runtimeNode.requires) {
    assert.equal(knowledgeNodeIds.includes(requiredConcept), true, `${requirement.calculationId}:${requiredConcept}`);
  }
}

const monthlyRuntime = runtimeNodes.find(node => node.id === "runtime.chapter2_monthly_transmission_ventilation");
assert.equal(monthlyRuntime.requires.includes("concept.monthly_exterior_temperature"), true);
assert.equal(monthlyRuntime.requires.includes("concept.month_duration"), true);

const solarSourceRuntime = runtimeNodes.find(node => node.id === "runtime.chapter2_solar_source_dataset_identity");
assert.equal(solarSourceRuntime.requires.includes("concept.monthly_solar_irradiation"), true);

const hsolRuntime = runtimeNodes.find(node => node.id === "runtime.chapter2_hsol_vertical_horizontal");
assert.equal(hsolRuntime.requires.includes("concept.monthly_solar_irradiation"), true);
assert.equal(hsolRuntime.requires.includes("concept.month_duration"), true);

const solarRuntime = runtimeNodes.find(node => node.id === "runtime.chapter2_solar_gains");
assert.equal(solarRuntime.requires.includes("concept.preprocessed_solar_irradiation_hsol"), true);
assert.equal(solarRuntime.requires.includes("concept.sky_radiation_inputs"), true);
assert.equal(solarRuntime.requires.includes("concept.user_supplied_certified_climate_dataset"), true);
assert.equal(solarRuntime.requires.includes("concept.solar_element_inputs"), true);

const monthlySolarConcept = concepts.find(concept => concept.id === "concept.monthly_solar_irradiation");
assert.equal(monthlySolarConcept.datasetStatus, "NORMATIVE_DATASET");
assert.equal(monthlySolarConcept.implementationStatus, "LOOKUP_IMPLEMENTED");
assert.equal(monthlySolarConcept.tbdId, null);
assert.equal(tbdIds.includes("tbd.mc001_1_2006_annex_a9_6_monthly_solar_dataset"), false);

const preprocessedSolarConcept = concepts.find(concept => concept.id === "concept.preprocessed_solar_irradiation_hsol");
assert.equal(preprocessedSolarConcept.datasetStatus, "NORMATIVE_DATASET");
assert.equal(preprocessedSolarConcept.implementationStatus, "LOOKUP_IMPLEMENTED");
assert.equal(preprocessedSolarConcept.tbdId, null);

assert.equal(
  graph.normativeDependencyGraph.edges.some(edge =>
    edge.from === "doc.mc001_2022_annex_d" &&
    edge.to === "doc.mc001_6_2013" &&
    edge.relation === "delegates_climate_parameters_to"
  ),
  true
);
assert.equal(
  graph.normativeDependencyGraph.edges.some(edge =>
    edge.from === "doc.mc001_2022_annex_d" &&
    edge.to === "doc.sr_en_iso_52010_1" &&
    edge.relation === "delegates_climate_preprocessing_to"
  ),
  true
);

assert.deepEqual(
  graph.synchronization.requirementMatrixIds,
  climateDependencies.requirementMatrix.map(item => item.calculationId)
);
assert.deepEqual(
  graph.synchronization.normativeDependencyIds,
  climateDependencies.normativeDependencies.map(item => item.dependencyId)
);
assert.equal(graph.synchronization.climateCoverage.coveredClimateZones, 5);
assert.equal(graph.synchronization.climateCoverage.coveredWindZones, 4);
assert.equal(graph.synchronization.climateCoverage.totalSourceBackedLocalityMappings, 0);
assert.equal(graph.synchronization.climateCoverage.sourceBackedLocalityStationMappings, 42);

const sourceInventoryIds = new Set(climateDependencies.climateSourceInventory.map(item => item.inventoryId));
for (const item of graph.sourceInventories) {
  assert.equal(sourceInventoryIds.has(item.inventoryId), true, item.inventoryId);
}

const mc001Dependency = graph.acquisitionPlanner.find(item => item.documentId === "doc.mc001_6_2013");
assert.equal(mc001Dependency.priority, "MEDIUM");
assert.equal(mc001Dependency.runtimeVariablesUnlocked.includes("monthly temperature"), true);
assert.equal(mc001Dependency.runtimeVariablesUnlocked.includes("solar irradiation"), false);

const solarDependency = graph.acquisitionPlanner.find(item => item.documentId === "doc.mc001_1_2006_annex_a9_6");
assert.equal(solarDependency.priority, "RESOLVED");
assert.equal(solarDependency.runtimeVariablesUnlocked.includes("solar irradiation"), true);

const reviewedStandards = graph.acquisitionPlanner.find(
  item => item.documentId === "doc.sr_1907_sr_4839_sr_6648_reviewed"
);
assert.equal(reviewedStandards.priority, "LOW");
assert.deepEqual(reviewedStandards.runtimeVariablesUnlocked, []);

assert.equal(graph.futureImplementationPackages.length >= 4, true);
for (const pkg of graph.futureImplementationPackages) {
  assert.equal(Array.isArray(pkg.dependsOnTbdIds), true, pkg.packageId);
  assert.equal(pkg.dependsOnTbdIds.length > 0, true, pkg.packageId);
  for (const tbdId of pkg.dependsOnTbdIds) {
    assert.equal(tbdIds.includes(tbdId), true, `${pkg.packageId}:${tbdId}`);
  }
  assert.equal(typeof pkg.runtimeImpact, "string", pkg.packageId);
  assert.equal(typeof pkg.uiImpact, "string", pkg.packageId);
  assert.equal(typeof pkg.notebookImpact, "string", pkg.packageId);
  assert.equal(typeof pkg.reportImpact, "string", pkg.packageId);
  assert.equal(Array.isArray(pkg.expectedTests), true, pkg.packageId);
  assert.equal(typeof pkg.expectedPullRequestScope, "string", pkg.packageId);
}

assert.equal(subchapterCoverage.summary.totalHeadings, 125);
assert.equal(subchapterCoverage.summary.chapter3RelationCoverage.totalChapter3RelationsIdentified, 217);
assert.equal(subchapterCoverage.climate.registryVersion, graph.registryVersion);

assert.equal(graph.validationInvariants.everyRuntimeClimateDependencyRepresented, true);
assert.equal(graph.validationInvariants.everyClimateNodeHasOneCanonicalSource, true);
assert.equal(graph.validationInvariants.everyUnresolvedNodeHasOneTbd, true);
assert.equal(graph.validationInvariants.noDuplicateNodes, true);
assert.equal(graph.validationInvariants.dependencyGraphsAreAcyclic, true);
assert.equal(graph.validationInvariants.auditReferencesSynchronized, true);
assert.equal(graph.validationInvariants.runtimeReferencesSynchronized, true);
assert.equal(graph.validationInvariants.noRuntimeBehaviorChanges, true);

console.log("PASS Romanian climate normative knowledge graph is complete and synchronized");
