const SOURCE_PACK = "MC001_R15_MATERIALS_AND_THERMAL_RESISTANCE_SOURCE_PACK";

const contracts = Object.freeze([
  Object.freeze({
    code: "SR_EN_ISO_6946_UNVENTILATED_AIR_LAYER_RESISTANCE",
    sourcePack: SOURCE_PACK,
    sourceReference: "SR EN ISO 6946",
    scope:
      "thermal resistance of unventilated air layers by heat-flow direction and air-layer thickness",
    allowedUse:
      "explicit source-backed Ra input from SR EN ISO 6946 for non-glazed opaque building elements",
    sourcePages: Object.freeze([77, 78]),
    notes:
      "MC001-2022 relation 2.6 includes sum(Ra) and delegates unventilated air-layer resistance values to SR EN ISO 6946; no MC001 air-layer value table is embedded."
  })
]);

export const airLayerResistanceSourceContracts = contracts;

export function listAirLayerResistanceSourceContracts() {
  return airLayerResistanceSourceContracts;
}

export function findAirLayerResistanceSourceContractByCode(code) {
  return airLayerResistanceSourceContracts.find((entry) => entry.code === code) ?? null;
}
