const SOURCE_PACK = "MC001_R18_BOUNDARY_CORRECTIONS_EXPLICIT_SOURCE_PACK";

const contracts = Object.freeze([
  Object.freeze({
    code: "MC001_GROUND_CONTACT_EXTERNAL_DETAILED_METHOD_SOURCE_CONTRACT",
    sourcePack: SOURCE_PACK,
    sourceReference:
      "MC001-2022 pages 82 and 84, with detailed ground-contact methods delegated to SR EN ISO 13370, SR EN ISO 12631, SR EN 12831-1, and C107/5-2005",
    scope:
      "source-backed ground-contact heat-transfer coefficient or equivalent correction factor for Hg elements",
    allowedUse:
      "explicit source-backed ground-contact factor input for Hg elements when an approved external ground-contact method supplies the applicable numeric value",
    sourcePages: Object.freeze([82, 84, 99]),
    externalReferences: Object.freeze([
      "SR EN ISO 13370",
      "SR EN ISO 12631",
      "SR EN 12831-1",
      "C107/5-2005"
    ]),
    notes:
      "MC001-2022 Chapter 2 defines Hg and states that ground-contact parameters are calculated using the referenced external methods; no complete ground-contact value table or detailed formula chain is embedded in Chapter 2."
  })
]);

export const groundContactSourceContracts = contracts;

export function listGroundContactSourceContracts() {
  return groundContactSourceContracts;
}

export function findGroundContactSourceContractByCode(code) {
  return groundContactSourceContracts.find((entry) => entry.code === code) ?? null;
}
