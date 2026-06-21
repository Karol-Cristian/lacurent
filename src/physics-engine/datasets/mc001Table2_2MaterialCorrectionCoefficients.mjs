const SOURCE_TABLE = "MC001-2022 Tabel 2.2";
const SOURCE_MODULE = "02_materials_lambda_R_U";

function entry({
  id,
  materialCategoryRo,
  conditionRo,
  ageConditionRo,
  applicabilityRo,
  correctionCoefficientA,
  notes = ""
}) {
  return Object.freeze({
    id,
    materialCategoryRo,
    conditionRo,
    ageConditionRo,
    applicabilityRo,
    correctionCoefficientA,
    sourceTable: SOURCE_TABLE,
    sourceModule: SOURCE_MODULE,
    notes
  });
}

const entries = [
  entry({
    id: "zidarie_caramida_uscata_vechime_ge_30_ani",
    materialCategoryRo: "zidarie din caramida sau blocuri ceramice",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 30 ani",
    correctionCoefficientA: 1.03
  }),
  entry({
    id: "zidarie_caramida_condens_vechime_ge_30_ani",
    materialCategoryRo: "zidarie din caramida sau blocuri ceramice",
    conditionRo: "afectata de condens",
    ageConditionRo: "vechime >= 30 ani",
    correctionCoefficientA: 1.15
  }),
  entry({
    id: "zidarie_caramida_igrasie_vechime_ge_30_ani",
    materialCategoryRo: "zidarie din caramida sau blocuri ceramice",
    conditionRo: "afectata de igrasie",
    ageConditionRo: "vechime >= 30 ani",
    correctionCoefficientA: 1.3
  }),
  entry({
    id: "zidarie_bca_betoane_usoare_placi_bca_uscata_vechime_ge_20_ani",
    materialCategoryRo: "zidarie din BCA / betoane usoare / placi termoizolatoare BCA",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 20 ani",
    correctionCoefficientA: 1.05
  }),
  entry({
    id: "zidarie_bca_betoane_usoare_placi_bca_condens_vechime_ge_20_ani",
    materialCategoryRo: "zidarie din BCA / betoane usoare / placi termoizolatoare BCA",
    conditionRo: "afectata de condens",
    ageConditionRo: "vechime >= 20 ani",
    correctionCoefficientA: 1.15
  }),
  entry({
    id: "zidarie_bca_betoane_usoare_placi_bca_igrasie_vechime_ge_20_ani",
    materialCategoryRo: "zidarie din BCA / betoane usoare / placi termoizolatoare BCA",
    conditionRo: "afectata de igrasie",
    ageConditionRo: "vechime >= 20 ani",
    correctionCoefficientA: 1.3
  }),
  entry({
    id: "zidarie_piatra_uscata_vechime_ge_20_ani",
    materialCategoryRo: "zidarie din piatra",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 20 ani",
    correctionCoefficientA: 1.03
  }),
  entry({
    id: "zidarie_piatra_condens_vechime_ge_20_ani",
    materialCategoryRo: "zidarie din piatra",
    conditionRo: "afectata de condens",
    ageConditionRo: "vechime >= 20 ani",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "zidarie_piatra_igrasie_vechime_ge_20_ani",
    materialCategoryRo: "zidarie din piatra",
    conditionRo: "afectata de igrasie",
    ageConditionRo: "vechime >= 20 ani",
    correctionCoefficientA: 1.2
  }),
  entry({
    id: "beton_armat_condens_igrasie",
    materialCategoryRo: "beton armat",
    conditionRo: "afectat de condens/igrasie",
    applicabilityRo: "age condition not specified in MC001 Tabel 2.2 extraction",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "beton_agregate_usoare_uscat_vechime_ge_30_ani",
    materialCategoryRo: "beton cu agregate usoare",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 30 ani",
    correctionCoefficientA: 1.03
  }),
  entry({
    id: "beton_agregate_usoare_condens_vechime_ge_30_ani",
    materialCategoryRo: "beton cu agregate usoare",
    conditionRo: "afectat de condens",
    ageConditionRo: "vechime >= 30 ani",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "beton_agregate_usoare_igrasie_vechime_ge_30_ani",
    materialCategoryRo: "beton cu agregate usoare",
    conditionRo: "afectat de igrasie",
    ageConditionRo: "vechime >= 30 ani",
    correctionCoefficientA: 1.2
  }),
  entry({
    id: "tencuiala_uscata_vechime_ge_20_ani",
    materialCategoryRo: "tencuiala",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 20 ani",
    correctionCoefficientA: 1.03
  }),
  entry({
    id: "tencuiala_condens_vechime_ge_20_ani",
    materialCategoryRo: "tencuiala",
    conditionRo: "afectata de condens",
    ageConditionRo: "vechime >= 20 ani",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "tencuiala_igrasie_vechime_ge_20_ani",
    materialCategoryRo: "tencuiala",
    conditionRo: "afectata de igrasie",
    ageConditionRo: "vechime >= 20 ani",
    correctionCoefficientA: 1.3
  }),
  entry({
    id: "paianta_chirpici_uscata_fara_degradari_vechime_ge_10_ani",
    materialCategoryRo: "pereti din paianta sau chirpici",
    conditionRo: "in stare uscata, fara degradari vizibile",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "paianta_chirpici_uscata_cu_degradari_vechime_ge_10_ani",
    materialCategoryRo: "pereti din paianta sau chirpici",
    conditionRo: "in stare uscata, cu degradari vizibile",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.15,
    notes: "Visible degradation includes fisuri/exfolieri in the verified extraction."
  }),
  entry({
    id: "paianta_chirpici_igrasie_condens_vechime_ge_10_ani",
    materialCategoryRo: "pereti din paianta sau chirpici",
    conditionRo: "afectati de igrasie, condens",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.3
  }),
  entry({
    id: "vata_minerala_vrac_uscata_vechime_ge_10_ani",
    materialCategoryRo: "vata minerala in vrac / saltele / pasle",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.15
  }),
  entry({
    id: "vata_minerala_vrac_condens_vechime_ge_10_ani",
    materialCategoryRo: "vata minerala in vrac / saltele / pasle",
    conditionRo: "afectata de condens",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.3
  }),
  entry({
    id: "vata_minerala_vrac_umeda_infiltratii_vechime_ge_10_ani",
    materialCategoryRo: "vata minerala in vrac / saltele / pasle",
    conditionRo: "in stare umeda datorita infiltratiilor de apa",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.6,
    notes: "Especially relevant for roofs in the verified extraction."
  }),
  entry({
    id: "placi_rigide_vata_minerala_uscata_vechime_ge_10_ani",
    materialCategoryRo: "placi rigide din vata minerala",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "placi_rigide_vata_minerala_condens_vechime_ge_10_ani",
    materialCategoryRo: "placi rigide din vata minerala",
    conditionRo: "afectata de condens",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.2
  }),
  entry({
    id: "placi_rigide_vata_minerala_umeda_infiltratii_vechime_ge_10_ani",
    materialCategoryRo: "placi rigide din vata minerala",
    conditionRo: "in stare umeda datorita infiltratiilor de apa",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.3,
    notes: "Especially relevant for roofs in the verified extraction."
  }),
  entry({
    id: "polistiren_expandat_uscat_vechime_ge_10_ani",
    materialCategoryRo: "polistiren expandat",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.05
  }),
  entry({
    id: "polistiren_expandat_condens_vechime_ge_10_ani",
    materialCategoryRo: "polistiren expandat",
    conditionRo: "afectat de condens",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "polistiren_expandat_umed_infiltratii_vechime_ge_10_ani",
    materialCategoryRo: "polistiren expandat",
    conditionRo: "in stare umeda datorita infiltratiilor de apa",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.15,
    notes: "Especially relevant for roofs in the verified extraction."
  }),
  entry({
    id: "polistiren_extrudat_uscat_vechime_ge_10_ani",
    materialCategoryRo: "polistiren extrudat",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.02
  }),
  entry({
    id: "polistiren_extrudat_condens_vechime_ge_10_ani",
    materialCategoryRo: "polistiren extrudat",
    conditionRo: "afectat de condens",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.05
  }),
  entry({
    id: "polistiren_extrudat_umed_infiltratii_vechime_ge_10_ani",
    materialCategoryRo: "polistiren extrudat",
    conditionRo: "in stare umeda datorita infiltratiilor de apa",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.1,
    notes: "Especially relevant for roofs in the verified extraction."
  }),
  entry({
    id: "poliuretan_rigid_uscat_vechime_ge_10_ani",
    materialCategoryRo: "poliuretan rigid",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "poliuretan_rigid_condens_vechime_ge_10_ani",
    materialCategoryRo: "poliuretan rigid",
    conditionRo: "afectat de condens",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.15
  }),
  entry({
    id: "poliuretan_rigid_umed_infiltratii_vechime_ge_10_ani",
    materialCategoryRo: "poliuretan rigid",
    conditionRo: "in stare umeda datorita infiltratiilor de apa",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.25,
    notes: "Especially relevant for roofs in the verified extraction."
  }),
  entry({
    id: "spuma_poliuretan_in_situ_uscata_vechime_ge_10_ani",
    materialCategoryRo: "spuma de poliuretan aplicata in situ",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.15
  }),
  entry({
    id: "spuma_poliuretan_in_situ_degradari_uv_vechime_ge_10_ani",
    materialCategoryRo: "spuma de poliuretan aplicata in situ",
    conditionRo: "cu degradari vizibile datorita expunerii la radiatiile UV",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.2
  }),
  entry({
    id: "spuma_poliuretan_in_situ_umeda_infiltratii_vechime_ge_10_ani",
    materialCategoryRo: "spuma de poliuretan aplicata in situ",
    conditionRo: "in stare umeda datorita infiltratiilor de apa",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.25,
    notes: "Especially relevant for roofs in the verified extraction."
  }),
  entry({
    id: "lemn_uscat_fara_degradari_vechime_ge_10_ani",
    materialCategoryRo: "elemente din lemn",
    conditionRo: "in stare uscata, fara degradari vizibile",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "lemn_uscat_cu_degradari_vechime_ge_10_ani",
    materialCategoryRo: "elemente din lemn",
    conditionRo: "in stare uscata, cu degradari vizibile",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.2,
    notes: "Visible degradation includes fisuri/microorganisme in the verified extraction."
  }),
  entry({
    id: "lemn_umed_vechime_ge_10_ani",
    materialCategoryRo: "elemente din lemn",
    conditionRo: "in stare umeda",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.3
  }),
  entry({
    id: "placi_aschii_lemn_ciment_uscate_vechime_ge_10_ani",
    materialCategoryRo: "placi din aschii de lemn liate cu ciment",
    conditionRo: "in stare uscata",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.1
  }),
  entry({
    id: "placi_aschii_lemn_ciment_condens_vechime_ge_10_ani",
    materialCategoryRo: "placi din aschii de lemn liate cu ciment",
    conditionRo: "afectate de condens",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.2
  }),
  entry({
    id: "placi_aschii_lemn_ciment_umede_infiltratii_vechime_ge_10_ani",
    materialCategoryRo: "placi din aschii de lemn liate cu ciment",
    conditionRo: "in stare umeda datorita infiltratiilor de apa",
    ageConditionRo: "vechime >= 10 ani",
    correctionCoefficientA: 1.3,
    notes: "Especially relevant for roofs in the verified extraction."
  })
];

export const materialCorrectionCoefficients = Object.freeze(entries);

export function listMaterialCorrectionCoefficients() {
  return materialCorrectionCoefficients;
}

export function findMaterialCorrectionCoefficientById(id) {
  return materialCorrectionCoefficients.find((entryValue) => entryValue.id === id);
}

export function findMaterialCorrectionCoefficientsByMaterialCategory(materialCategoryRo) {
  return Object.freeze(
    materialCorrectionCoefficients.filter(
      (entryValue) => entryValue.materialCategoryRo === materialCategoryRo
    )
  );
}
