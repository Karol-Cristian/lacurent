import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const parameters = JSON.parse(readFileSync(resolve("src/features/energy/physics/parameters/physics-parameters.json"), "utf8")).parameters;
const notation = JSON.parse(readFileSync(resolve("src/features/energy/physics/parameters/mc001-notation.official.json"), "utf8")).notation;
const links = JSON.parse(readFileSync(resolve("src/features/energy/physics/parameters/lacurent-mc001-parameter-links.json"), "utf8")).links;
const symbols = JSON.parse(readFileSync(resolve("src/features/energy/physics/parameters/mc001-symbols.official.json"), "utf8")).symbols;
const indices = JSON.parse(readFileSync(resolve("src/features/energy/physics/parameters/mc001-indices.official.json"), "utf8")).indices;

const notationById = new Map(notation.map(item => [item.parameterId, item]));
const linkById = new Map(links.map(item => [item.parameterId, item]));
const symbolById = new Map(symbols.map(item => [item.id, item]));
const indexById = new Map(indices.map(item => [item.id, item]));

const greekSymbols = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  eta: "η",
  theta: "θ",
  kappa: "κ",
  lambda: "λ",
  rho: "ρ",
  tau: "τ",
  phi: "φ",
  psi: "ψ",
  chi: "χ"
};

function displaySymbol(symbol) {
  return greekSymbols[symbol] || symbol;
}

function latexSymbol(symbol) {
  const mapped = {
    alpha: "\\alpha",
    beta: "\\beta",
    gamma: "\\gamma",
    delta: "\\delta",
    epsilon: "\\varepsilon",
    eta: "\\eta",
    theta: "\\theta",
    kappa: "\\kappa",
    lambda: "\\lambda",
    rho: "\\rho",
    tau: "\\tau",
    phi: "\\varphi",
    psi: "\\psi",
    chi: "\\chi"
  };
  return mapped[symbol] || symbol.replaceAll("_", "\\_");
}

function htmlSymbol(symbol) {
  return displaySymbol(symbol).replace(/_(.+)$/u, "<sub>$1</sub>");
}

function notationForOfficialEntry(entry, type) {
  const raw = type === "symbol" ? entry.symbol : entry.index;
  const display = displaySymbol(raw);
  return {
    mc001: display,
    plain: raw,
    html: type === "symbol" ? htmlSymbol(raw) : `<sub>${display}</sub>`,
    latex: type === "symbol" ? latexSymbol(raw) : `_{${raw}}`
  };
}

const parametersById = new Map(parameters.map(parameter => [parameter.id, parameter]));

const mappedParametersByOfficialId = new Map();
for (const link of links) {
  const parameter = parametersById.get(link.parameterId);
  if (!parameter) continue;
  const officialIds = [link.mc001SymbolId, ...(link.mc001IndexIds || [])].filter(Boolean);
  for (const officialId of officialIds) {
    const current = mappedParametersByOfficialId.get(officialId) || [];
    current.push({
      id: parameter.id,
      nameRo: parameter.nameRo,
      layer: parameter.engineLayer,
      quantityType: parameter.quantityType,
      relationship: link.relationship,
      notation: notationById.get(parameter.id) || null,
      formula: parameter.formula || "",
      aliases: parameter.aliases || []
    });
    mappedParametersByOfficialId.set(officialId, current);
  }
}

const canonicalParameters = parameters.map(parameter => {
  const link = linkById.get(parameter.id);
  const symbol = symbolById.get(link?.mc001SymbolId);
  const linkedIndices = (link?.mc001IndexIds || []).map(indexId => indexById.get(indexId)).filter(Boolean);
  return {
    id: parameter.id,
    notation: notationById.get(parameter.id) || null,
    nameRo: parameter.nameRo,
    nameEn: parameter.nameEn,
    unit: parameter.unit,
    layer: parameter.engineLayer,
    quantityType: parameter.quantityType,
    implementationStatus: parameter.implementationStatus,
    sourceStatus: parameter.sourceStatus,
    descriptionRo: parameter.descriptionRo,
    formula: parameter.formula || "",
    aliases: parameter.aliases || [],
    usedFor: parameter.usedFor || [],
    mc001: {
      symbol: symbol || null,
      indices: linkedIndices,
      relationship: link?.relationship || ""
    }
  };
});

const officialEntries = [
  ...symbols.map(symbol => ({
    id: symbol.id,
    type: "symbol",
    notation: notationForOfficialEntry(symbol, "symbol"),
    nameRo: symbol.nameRo,
    unit: symbol.unit || "-",
    chapters: symbol.chapters || [],
    layer: "mc001_symbol",
    mappedParameters: mappedParametersByOfficialId.get(symbol.id) || []
  })),
  ...indices.map(index => ({
    id: index.id,
    type: "index",
    notation: notationForOfficialEntry(index, "index"),
    nameRo: index.termRo,
    unit: "-",
    chapters: index.chapters || [],
    layer: "mc001_index",
    mappedParameters: mappedParametersByOfficialId.get(index.id) || []
  }))
].sort((a, b) => {
  if (a.type !== b.type) return a.type.localeCompare(b.type);
  return a.notation.plain.localeCompare(b.notation.plain);
});

const payload = {
  generatedAt: new Date().toISOString(),
  metadata: {
    source: "MC001, section 1.1.7, Table 1.1 Simboluri + Table 1.2 Indici",
    officialSymbols: symbols.length,
    officialIndices: indices.length,
    canonicalLaCurentParameters: parameters.length
  },
  parameters: officialEntries,
  canonicalParameters
};

writeFileSync(resolve("js/physics-parameters-data.js"), `window.LaCurentPhysicsParameters = ${JSON.stringify(payload, null, 2)};\n`);
console.log("Physics parameter browser data written to js/physics-parameters-data.js");
