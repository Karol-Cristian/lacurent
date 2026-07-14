const SOURCE_PACK = "MC001_R18_BOUNDARY_CORRECTIONS_EXPLICIT_SOURCE_PACK";

const contracts = Object.freeze([
  Object.freeze({
    code: "MC001_BZTU_DEFAULT_BY_TYPE_SIZE_SOURCE_CONTRACT",
    sourcePack: SOURCE_PACK,
    sourceReference: "MC001-2022 page 109 bztu by adjacent unconditioned-zone type or size",
    scope:
      "source-backed bztu correction factor selected from an approved adjacent unconditioned-zone default source",
    allowedUse:
      "explicit source-backed bztu factor input for Hu or Ha elements when the selected source supplies the applicable numeric value",
    sourcePages: Object.freeze([109]),
    notes:
      "MC001-2022 allows default bztu values by type or size, but the Chapter 2 page inspected here omits numeric rows; runtime requires an explicit source-backed factor."
  })
]);

export const bztuDefaultSourceContracts = contracts;

export function listBztuDefaultSourceContracts() {
  return bztuDefaultSourceContracts;
}

export function findBztuDefaultSourceContractByCode(code) {
  return bztuDefaultSourceContracts.find((entry) => entry.code === code) ?? null;
}
