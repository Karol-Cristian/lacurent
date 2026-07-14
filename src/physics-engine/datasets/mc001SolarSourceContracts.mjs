const SOURCE_PACK = "MC001_R21_SOLAR_GAINS_EXPLICIT_FORMULA_SOURCE_PACK";

const irradiationContracts = Object.freeze([
  Object.freeze({
    code: "MC001_SOLAR_IRRADIATION_EXTERNAL_CLIMATE_SOURCE_CONTRACT",
    sourcePack: SOURCE_PACK,
    sourceReference: "monthly solar irradiation source accepted for MC001 relation 2.39 or 2.50",
    scope: "monthly irradiation for explicit element orientation and tilt",
    allowedUse:
      "explicit source-backed Hsol input for transparent or opaque monthly solar gains",
    sourcePages: Object.freeze([105, 111]),
    notes:
      "MC001 relations 2.39 and 2.50 use Hsol; Chapter 2 formulas require the value but do not embed a complete climate irradiation dataset."
  })
]);

const obstacleContracts = Object.freeze([
  Object.freeze({
    code: "MC001_OBSTACLE_SHADING_EXTERNAL_GEOMETRY_SOURCE_CONTRACT",
    sourcePack: SOURCE_PACK,
    sourceReference: "source-backed obstacle geometry method for Fsh;obst in MC001 relation 2.39 or 2.50",
    scope: "monthly obstacle shading factor for explicit solar element geometry",
    allowedUse:
      "explicit source-backed Fsh;obst input derived from approved geometry or table workflow",
    sourcePages: Object.freeze([105, 108, 109, 111]),
    notes:
      "MC001 Tables 2.17 and 2.18 encode seasonal orientation parameters, while the final obstacle factor still needs explicit or source-backed geometry selection."
  })
]);

export const solarIrradiationSourceContracts = irradiationContracts;
export const obstacleShadingSourceContracts = obstacleContracts;

export function listSolarIrradiationSourceContracts() {
  return solarIrradiationSourceContracts;
}

export function listObstacleShadingSourceContracts() {
  return obstacleShadingSourceContracts;
}

export function findSolarIrradiationSourceContractByCode(code) {
  return solarIrradiationSourceContracts.find((entry) => entry.code === code) ?? null;
}

export function findObstacleShadingSourceContractByCode(code) {
  return obstacleShadingSourceContracts.find((entry) => entry.code === code) ?? null;
}
