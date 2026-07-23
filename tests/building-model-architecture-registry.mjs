import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync("building-model-registry.json", "utf8"));
const architectureMarkdown = readFileSync("BUILDING_MODEL_ARCHITECTURE.md", "utf8");

const allowedCategories = [
  "primitive_user_input",
  "provider_resolved",
  "derived_engineering_value",
  "physics_runtime_state",
  "output",
  "legacy"
];

const allowedUiRecommendations = ["remain_editable", "auto_resolved", "calculated", "read_only", "hidden", "remove"];

const requiredFieldKeys = [
  "fieldId",
  "path",
  "purpose",
  "category",
  "owner",
  "sourceOfTruth",
  "producer",
  "consumer",
  "dataType",
  "editable",
  "derived",
  "persisted",
  "runtimeOnly",
  "providerGenerated",
  "reportOnly",
  "notebookOnly",
  "deprecated",
  "legacy",
  "productionUsage",
  "uiRecommendation",
  "genericity",
  "removalAssessment",
  "implementationRefs",
  "tests"
];

function assertNonEmptyString(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.ok(value.trim().length > 0, `${label} must not be empty`);
}

function assertBoolean(value, label) {
  assert.equal(typeof value, "boolean", `${label} must be a boolean`);
}

function assertArray(value, label) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
}

function assertUnique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function assertAcyclicGraph(graph) {
  const outgoing = new Map(graph.nodes.map(node => [node, []]));

  for (const edge of graph.edges) {
    assert.ok(outgoing.has(edge.from), `dependency edge source is unknown: ${edge.from}`);
    assert.ok(outgoing.has(edge.to), `dependency edge target is unknown: ${edge.to}`);
    outgoing.get(edge.from).push(edge.to);
  }

  const visiting = new Set();
  const visited = new Set();

  function visit(node) {
    assert.ok(!visiting.has(node), `dependency graph has a cycle at ${node}`);
    if (visited.has(node)) {
      return;
    }

    visiting.add(node);
    for (const next of outgoing.get(node)) {
      visit(next);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.nodes) {
    visit(node);
  }
}

assert.equal(registry.schema, "building_model_architecture_registry_v1");
assert.equal(registry.milestone, "P6_PRODUCTION_BUILDING_MODEL_ARCHITECTURE_BASELINE");
assert.equal(registry.sourceBaseline.branch, "origin/main");
assertNonEmptyString(registry.sourceBaseline.commit, "source baseline commit");

assert.deepEqual(registry.categories.map(category => category.id), allowedCategories);
assert.deepEqual(registry.uiRecommendations.map(recommendation => recommendation.id), allowedUiRecommendations);

assertArray(registry.domains, "domains");
assert.ok(registry.domains.length >= 10, "domain inventory should cover the production model");
assertUnique(registry.domains.map(domain => domain.domainId), "domain ids");

for (const domain of registry.domains) {
  assertNonEmptyString(domain.domainId, "domain id");
  assertNonEmptyString(domain.concept, `domain ${domain.domainId} concept`);
  assertNonEmptyString(domain.owner, `domain ${domain.domainId} owner`);
  assertNonEmptyString(domain.sourceOfTruth, `domain ${domain.domainId} source of truth`);
  assertNonEmptyString(domain.lifecycle, `domain ${domain.domainId} lifecycle`);
  assertArray(domain.responsibilities, `domain ${domain.domainId} responsibilities`);
  assertArray(domain.implementationRefs, `domain ${domain.domainId} implementation refs`);
  assert.ok(domain.implementationRefs.length > 0, `domain ${domain.domainId} must reference implementation files`);
}

assertArray(registry.fields, "fields");
assert.ok(registry.fields.length >= 60, "field inventory should include the audited production fields");
assertUnique(registry.fields.map(field => field.fieldId), "field ids");

const fieldCategoryCounts = new Map(allowedCategories.map(category => [category, 0]));

for (const field of registry.fields) {
  for (const key of requiredFieldKeys) {
    assert.ok(Object.hasOwn(field, key), `${field.fieldId ?? "unknown field"} missing required key ${key}`);
  }

  assertNonEmptyString(field.fieldId, "field id");
  assertNonEmptyString(field.path, `${field.fieldId} path`);
  assertNonEmptyString(field.purpose, `${field.fieldId} purpose`);
  assert.ok(allowedCategories.includes(field.category), `${field.fieldId} has unsupported category ${field.category}`);
  assert.ok(
    allowedUiRecommendations.includes(field.uiRecommendation),
    `${field.fieldId} has unsupported UI recommendation ${field.uiRecommendation}`
  );
  assertNonEmptyString(field.owner, `${field.fieldId} owner`);
  assertNonEmptyString(field.sourceOfTruth, `${field.fieldId} source of truth`);
  assertNonEmptyString(field.producer, `${field.fieldId} producer`);
  assertNonEmptyString(field.consumer, `${field.fieldId} consumer`);
  assertNonEmptyString(field.dataType, `${field.fieldId} data type`);
  assertNonEmptyString(field.productionUsage, `${field.fieldId} production usage`);
  assertNonEmptyString(field.genericity, `${field.fieldId} genericity`);
  assertNonEmptyString(field.removalAssessment, `${field.fieldId} removal assessment`);

  for (const booleanKey of [
    "editable",
    "derived",
    "persisted",
    "runtimeOnly",
    "providerGenerated",
    "reportOnly",
    "notebookOnly",
    "deprecated",
    "legacy"
  ]) {
    assertBoolean(field[booleanKey], `${field.fieldId}.${booleanKey}`);
  }

  assertArray(field.dependencies, `${field.fieldId} dependencies`);
  assertArray(field.implementationRefs, `${field.fieldId} implementation refs`);
  assertArray(field.tests, `${field.fieldId} tests`);
  assert.ok(field.implementationRefs.length > 0, `${field.fieldId} must reference implementation code`);
  assert.ok(field.tests.length > 0, `${field.fieldId} must reference validation coverage`);

  if (field.category === "legacy") {
    assert.equal(field.legacy, true, `${field.fieldId} is categorized as legacy but legacy flag is false`);
    assert.equal(field.deprecated, true, `${field.fieldId} is categorized as legacy but deprecated flag is false`);
  } else {
    assert.equal(field.legacy, false, `${field.fieldId} is not legacy but legacy flag is true`);
  }

  fieldCategoryCounts.set(field.category, fieldCategoryCounts.get(field.category) + 1);

  for (const referencedFile of [...field.implementationRefs, ...field.tests]) {
    assert.ok(existsSync(referencedFile), `${field.fieldId} references missing file ${referencedFile}`);
  }
}

for (const category of allowedCategories) {
  assert.ok(fieldCategoryCounts.get(category) > 0, `category ${category} must be represented`);
}

assertAcyclicGraph(registry.dependencyGraph);
assert.ok(
  registry.dependencyGraph.obsoletePaths.some(path => path.pathId === "hidden_climate_profile_override"),
  "legacy hidden climate profile path must remain inventoried"
);

assert.ok(
  registry.uiAudit.some(section => section.section === "Amplasare si clima"),
  "UI audit must include the production climate section"
);
assert.ok(
  registry.uiAudit.some(section =>
    section.fieldsToHideOrRemove.some(item => item.includes("climate_profile_id visible selector already removed"))
  ),
  "UI audit must record removal of manual climate-profile ownership"
);

const genericCategories = new Set(registry.genericBuildingAudit.map(item => item.buildingCategory));
for (const requiredCategory of [
  "detached_houses",
  "apartments",
  "apartment_buildings",
  "offices_schools_hospitals_hotels_commercial",
  "industrial_buildings"
]) {
  assert.ok(genericCategories.has(requiredCategory), `generic building audit missing ${requiredCategory}`);
}

assert.ok(
  registry.simplificationReport.removableUiControls.includes("building_length_m"),
  "length UI control must be listed as removable unless wired"
);
assert.ok(
  registry.simplificationReport.removableUiControls.includes("thermal_mass_class"),
  "thermal mass UI control must be listed as removable unless wired"
);
assert.ok(
  registry.simplificationReport.removableUiControls.includes("wall_thickness"),
  "wall thickness UI control must be listed as removable unless wired"
);

assert.ok(
  registry.legacyInventory.some(item => item.legacyId === "legacy_database_tables"),
  "legacy persistence boundary must be inventoried"
);
assert.ok(
  registry.legacyInventory.some(item => item.legacyId === "assisted_typology_abstraction"),
  "assisted typology abstraction must be inventoried"
);

assert.ok(architectureMarkdown.includes("## Core Rule"), "architecture markdown missing core rule");
assert.ok(architectureMarkdown.includes("## Field Inventory"), "architecture markdown missing field inventory");
assert.ok(architectureMarkdown.includes("## Target Architecture"), "architecture markdown missing target architecture");

console.log("building-model architecture registry validation passed", {
  domains: registry.domains.length,
  fields: registry.fields.length,
  edges: registry.dependencyGraph.edges.length
});
