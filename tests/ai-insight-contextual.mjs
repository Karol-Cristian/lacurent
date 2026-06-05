import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../js/ai-insights.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

function reportTitles(normalizedHome) {
  return sandbox.window.LaCurentAiInsights
    .generateValidatedInsightCards({
      normalizedHome,
      physicsResult: {
        heatLossTransmission: { value: 120 },
        heatLossVentilation: { value: 35 },
        demandLayerV03: { annual: { heatingDemandKwhM2Year: 150 } }
      },
      reportSnapshot: {},
      mode: "owner"
    })
    .filter(card => card.target === "report")
    .map(card => card.title);
}

const base = {
  mode: "owner",
  geometry: { usefulAreaM2: 70, confidence: "medium" },
  envelope: {
    roofOrAttic: {},
    walls: {},
    windows: { type: "unknown" }
  },
  systems: {
    heating: { source: "unknown", confidence: "low" },
    dhw: { source: "unknown", confidence: "low" }
  },
  access: {},
  assumptions: [],
  missingData: []
};

const oldHouse = reportTitles({
  ...base,
  buildingType: "house",
  systems: {
    heating: { source: "wood", confidence: "medium" },
    dhw: { source: "same_as_heating", confidence: "medium" }
  },
  access: { hasRoofForPv: true }
});

const apartment = reportTitles({
  ...base,
  buildingType: "apartment",
  envelope: {
    ...base.envelope,
    windows: { type: "old_double" }
  },
  access: { hasRoofForPv: false }
});

assert.notDeepEqual(oldHouse, apartment, "AI insight cards should vary by home type.");
assert(oldHouse.some(title => title.includes("pod")), "House should include attic/roof context when roof data is weak.");
assert(oldHouse.some(title => title.includes("lemn")), "Wood-heated house should include wood heating context.");
assert(!apartment.some(title => title.includes("pod")), "Apartment should not receive attic/roof house cards.");
assert(!apartment.some(title => title.startsWith("PV poate reduce")), "Apartment should not receive house-style PV roof card.");
assert(apartment.some(title => title.includes("apartament")), "Apartment should receive apartment-specific context.");

console.log("PASS AI insight cards vary by home context");
