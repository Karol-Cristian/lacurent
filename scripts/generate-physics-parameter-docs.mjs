import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const parametersPath = resolve("src/features/energy/physics/parameters/physics-parameters.json");
const indicesPath = resolve("src/features/energy/physics/parameters/physics-indices.json");
const mc001SymbolsPath = resolve("src/features/energy/physics/parameters/mc001-symbols.official.json");
const mc001IndicesPath = resolve("src/features/energy/physics/parameters/mc001-indices.official.json");
const mc001NotationPath = resolve("src/features/energy/physics/parameters/mc001-notation.official.json");
const linksPath = resolve("src/features/energy/physics/parameters/lacurent-mc001-parameter-links.json");
const outputPath = resolve("docs/PHYSICS_PARAMETER_DATABASE.md");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function cell(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value === undefined) return "";
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function parameterTable(parameters) {
  const rows = parameters.map(parameter => {
    const notation = notationByParameterId.get(parameter.id);
    return `| ${cell(parameter.id)} | ${cell(notation?.mc001 || parameter.mc001Symbol)} | ${cell(notation?.latex)} | ${cell(parameter.nameRo)} | ${cell(parameter.unit)} | ${cell(parameter.engineLayer)} | ${cell(parameter.implementationStatus)} | ${cell(parameter.sourceStatus)} | ${cell(parameter.descriptionRo)} |`;
  });
  return `| ID | MC001 | LaTeX | Denumire | Unitate | Layer | Status | Sursa | Explicatie |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}`;
}

function indexTable(indices) {
  const rows = indices.map(index => `| ${cell(index.id)} | ${cell(index.termRo)} | ${cell(index.engineMeaning)} | ${cell(index.examples)} | ${cell(index.cleanupRule)} |`);
  return `| Indice | Termen | Sens in engine | Exemple | Regula cleanup |
| --- | --- | --- | --- | --- |
${rows.join("\n")}`;
}

function officialSymbolTable(symbols) {
  const rows = symbols.map(symbol => `| ${cell(symbol.id)} | ${cell(symbol.symbol)} | ${cell(symbol.nameRo)} | ${cell(symbol.unit)} | ${cell(symbol.chapters)} |`);
  return `| ID | Simbol | Denumire MC001 | Unitate | Capitole |
| --- | --- | --- | --- | --- |
${rows.join("\n")}`;
}

function officialIndexTable(indices) {
  const rows = indices.map(index => `| ${cell(index.id)} | ${cell(index.index)} | ${cell(index.termRo)} | ${cell(index.chapters)} |`);
  return `| ID | Indice | Termen MC001 | Capitole |
| --- | --- | --- | --- |
${rows.join("\n")}`;
}

function linkTable(links, symbolById, indexById) {
  const rows = links.map(link => {
    const symbol = symbolById.get(link.mc001SymbolId);
    const indices = link.mc001IndexIds.map(indexId => indexById.get(indexId)?.index || indexId).join(", ");
    const notation = notationByParameterId.get(link.parameterId);
    return `| ${cell(link.parameterId)} | ${cell(notation?.mc001 || symbol?.symbol || link.mc001SymbolId)} | ${cell(notation?.latex)} | ${cell(indices)} | ${cell(link.relationship)} |`;
  });
  return `| LaCurent parameter | MC001 notation | LaTeX | MC001 indices | Relationship |
| --- | --- | --- | --- | --- |
${rows.join("\n")}`;
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const value = item[key] || "unknown";
    groups[value] ||= [];
    groups[value].push(item);
    return groups;
  }, {});
}

const parameterDb = readJson(parametersPath);
const indexDb = readJson(indicesPath);
const mc001SymbolDb = readJson(mc001SymbolsPath);
const mc001IndexDb = readJson(mc001IndicesPath);
const mc001NotationDb = readJson(mc001NotationPath);
const linksDb = readJson(linksPath);
const parametersByLayer = groupBy(parameterDb.parameters, "engineLayer");
const symbolById = new Map(mc001SymbolDb.symbols.map(symbol => [symbol.id, symbol]));
const indexById = new Map(mc001IndexDb.indices.map(index => [index.id, index]));
const parameterById = new Map(parameterDb.parameters.map(parameter => [parameter.id, parameter]));
const notationByParameterId = new Map(mc001NotationDb.notation.map(item => [item.parameterId, item]));

const linkErrors = linksDb.links.flatMap(link => {
  const errors = [];
  if (!parameterById.has(link.parameterId)) errors.push(`Unknown LaCurent parameter: ${link.parameterId}`);
  if (!notationByParameterId.has(link.parameterId)) errors.push(`Missing MC001 notation for LaCurent parameter: ${link.parameterId}`);
  if (!symbolById.has(link.mc001SymbolId)) errors.push(`Unknown MC001 symbol: ${link.mc001SymbolId}`);
  link.mc001IndexIds.forEach(indexId => {
    if (!indexById.has(indexId)) errors.push(`Unknown MC001 index: ${indexId}`);
  });
  return errors;
});

if (linkErrors.length) {
  throw new Error(`Invalid LaCurent/MC001 parameter links:\n${linkErrors.join("\n")}`);
}

const layerSections = Object.entries(parametersByLayer)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([layer, parameters]) => `### ${layer}

${parameterTable(parameters)}`)
  .join("\n\n");

const markdown = `# Physics Parameter Database

Generated from:

* \`src/features/energy/physics/parameters/physics-parameters.json\`
* \`src/features/energy/physics/parameters/physics-indices.json\`
* \`src/features/energy/physics/parameters/mc001-symbols.official.json\`
* \`src/features/energy/physics/parameters/mc001-indices.official.json\`
* \`src/features/energy/physics/parameters/mc001-notation.official.json\`
* \`src/features/energy/physics/parameters/lacurent-mc001-parameter-links.json\`

Version: ${parameterDb.metadata.version}

Scope: ${parameterDb.metadata.scope}

Principle:

${parameterDb.metadata.principle}

Source note:

${parameterDb.metadata.sourceNote}

---

## Why This Exists

The LaCurent Physics Engine must not grow through scattered variables, ambiguous abbreviations or hidden assumptions.

Every stable physical input/output should map to a canonical parameter with:

* MC001 symbol, where relevant;
* internal aliases currently found in code;
* unit;
* engine layer;
* source status;
* implementation status;
* explanation.

This is the reset point before deeper MC001 methodology synthesis.

Important:

MC001 vocabulary is stored separately as official methodology vocabulary. LaCurent parameters reference MC001 symbols/indices through an explicit mapping table. Internal estimate values remain separate from official MC001 notation.

---

## Official MC001 Symbols

Source: ${mc001SymbolDb.metadata.source}

${officialSymbolTable(mc001SymbolDb.symbols)}

---

## Official MC001 Indices / Subscripts

Source: ${mc001IndexDb.metadata.source}

${officialIndexTable(mc001IndexDb.indices)}

---

## LaCurent To MC001 Mapping

${linkTable(linksDb.links, symbolById, indexById)}

---

## Parameters By Layer

${layerSections}

---

## MC001 Indices / Subscripts

${indexTable(indexDb.indices)}

---

## Cleanup Rules

1. Keep MC001 symbols for formulas and documentation.
2. Use descriptive English identifiers in code.
3. Do not persist ambiguous symbols such as \`H\`, \`Q\`, \`E\`, \`i\`, \`j\` as model field names.
4. Separate useful demand \`nd\` from final energy \`fin\`.
5. Separate transmission \`tr\` from ventilation \`ve\`.
6. Every value exposed by the physics engine should carry value, unit, source, confidence and assumptions.
7. Values marked \`internal_estimate\` must not be described as official MC001 values.
8. Before adding a new formula, add or update the parameters it consumes and produces.

---

## Next Work

* Expand this database chapter by chapter while reviewing MC001.
* Replace duplicate field names in the engine with canonical identifiers.
* Add formula registry entries that reference these parameter IDs.
* Add validation cases from parameter IDs rather than hand-written ad hoc labels.
`;

writeFileSync(outputPath, markdown);
console.log(`Physics parameter documentation written to ${outputPath}`);
