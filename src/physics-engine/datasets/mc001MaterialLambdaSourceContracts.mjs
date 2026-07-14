const SOURCE_PACK = "MC001_R15_MATERIALS_AND_THERMAL_RESISTANCE_SOURCE_PACK";

function contract({
  code,
  sourceReference,
  scope,
  allowedUse,
  sourcePages,
  notes
}) {
  return Object.freeze({
    code,
    sourcePack: SOURCE_PACK,
    sourceReference,
    scope,
    allowedUse,
    sourcePages: Object.freeze([...sourcePages]),
    notes
  });
}

const contracts = Object.freeze([
  contract({
    code: "SR_EN_ISO_10456_MATERIAL_LAMBDA_PROPERTIES",
    sourceReference: "SR EN ISO 10456",
    scope: "hygrothermal material properties and declared/design thermal conductivity",
    allowedUse:
      "explicit source-backed lambda_normat input for materials covered by SR EN ISO 10456",
    sourcePages: [43, 47, 50],
    notes:
      "MC001-2022 delegates material thermal conductivity values to SR EN ISO 10456 and does not embed the material lambda table."
  }),
  contract({
    code: "SR_EN_1745_MASONRY_MATERIAL_LAMBDA_PROPERTIES",
    sourceReference: "SR EN 1745",
    scope: "masonry product thermal properties",
    allowedUse:
      "explicit source-backed lambda_normat input for masonry products covered by SR EN 1745",
    sourcePages: [47, 50],
    notes:
      "MC001-2022 names SR EN 1745 as a recommended source for thermal conductivity where applicable."
  }),
  contract({
    code: "MP_022_02_MATERIAL_LAMBDA_PROPERTIES",
    sourceReference: "MP 022-02",
    scope: "Romanian methodology for thermotechnical material/product properties",
    allowedUse:
      "explicit source-backed lambda_normat or moisture-adjusted conductivity input when MP 022-02 supplies the applicable value",
    sourcePages: [47, 50],
    notes:
      "MC001-2022 references MP 022-02 for material conductivity and moisture conversion; runtime does not encode hidden MP 022-02 catalogue values."
  }),
  contract({
    code: "APPROVED_UPDATED_DESIGN_TABLES_MATERIAL_LAMBDA",
    sourceReference: "approved updated design-value tables accepted by the regulator",
    scope: "traditional material lambda values from approved updated design tables",
    allowedUse:
      "explicit source-backed lambda_normat input from approved design tables, followed by MC001 Table 2.2 correction when applicable",
    sourcePages: [47, 50],
    notes:
      "MC001-2022 states traditional material values use approved updated design tables with Table 2.2 correction coefficients."
  }),
  contract({
    code: "MANUFACTURER_DECLARATION_OR_LAB_MEASUREMENT_MATERIAL_LAMBDA",
    sourceReference: "manufacturer declaration or authorized laboratory measurement",
    scope: "declared or measured material conductivity accepted by MC001 notes",
    allowedUse:
      "explicit source-backed design lambda input when the declared/measured conditions are applicable to the building calculation",
    sourcePages: [50],
    notes:
      "MC001-2022 permits direct use of declared, measured, or tabular design values when their conditions are adequate for the application."
  })
]);

export const materialLambdaSourceContracts = contracts;

export function listMaterialLambdaSourceContracts() {
  return materialLambdaSourceContracts;
}

export function findMaterialLambdaSourceContractByCode(code) {
  return materialLambdaSourceContracts.find((entry) => entry.code === code) ?? null;
}
