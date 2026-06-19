const SOURCE_MODULE = "04_minimum_envelope_requirements";

function entry({
  id,
  buildingCategory,
  table,
  elementCategoryRo,
  elementTypeRo,
  rPrimeMinM2KPerW,
  uPrimeMaxWPerM2K,
  appliesTo,
  notes = ""
}) {
  return Object.freeze({
    id,
    buildingCategory,
    table,
    elementCategoryRo,
    elementTypeRo,
    rPrimeMinM2KPerW,
    uPrimeMaxWPerM2K,
    appliesTo,
    sourceModule: SOURCE_MODULE,
    notes
  });
}

export const residentialNZEBEnvelopeThresholds = Object.freeze([
  entry({
    id: "exterior_walls_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "pereti exteriori",
    elementTypeRo:
      "Pereti exteriori, exclusiv suprafetele vitrate, inclusiv peretii adiacenti rosturilor deschise",
    rPrimeMinM2KPerW: 4.0,
    uPrimeMaxWPerM2K: 0.25,
    appliesTo: "cladiri rezidentiale NZEB"
  }),
  entry({
    id: "exterior_windows_roof_windows_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "tamplarie exterioara",
    elementTypeRo: "Tamplarie exterioara: ferestre si ferestre de mansarda",
    rPrimeMinM2KPerW: 0.9,
    uPrimeMaxWPerM2K: 1.11,
    appliesTo: "cladiri rezidentiale NZEB"
  }),
  entry({
    id: "exterior_manual_doors_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "tamplarie exterioara",
    elementTypeRo: "Tamplarie exterioara: usi cu actionare manuala",
    rPrimeMinM2KPerW: 0.77,
    uPrimeMaxWPerM2K: 1.3,
    appliesTo: "cladiri rezidentiale NZEB",
    notes: "Special automatic, sliding or revolving doors are not covered by this extracted row."
  }),
  entry({
    id: "vertical_skylights_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "tamplarie exterioara",
    elementTypeRo: "Tamplarie exterioara: luminatoare verticale",
    rPrimeMinM2KPerW: 0.83,
    uPrimeMaxWPerM2K: 1.2,
    appliesTo: "cladiri rezidentiale NZEB"
  }),
  entry({
    id: "top_floors_under_terrace_or_attic_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "plansee peste ultimul nivel",
    elementTypeRo: "Plansee peste ultimul nivel, sub terase sau poduri",
    rPrimeMinM2KPerW: 6.67,
    uPrimeMaxWPerM2K: 0.15,
    appliesTo: "cladiri rezidentiale NZEB"
  }),
  entry({
    id: "floor_over_unheated_basement_or_cellar_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "plansee peste spatii neincalzite",
    elementTypeRo: "Plansee peste subsoluri neincalzite si pivnite",
    rPrimeMinM2KPerW: 3.4,
    uPrimeMaxWPerM2K: 0.29,
    appliesTo: "cladiri rezidentiale NZEB"
  }),
  entry({
    id: "walls_adjacent_to_closed_joints_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "pereti adiacenti rosturilor",
    elementTypeRo: "Pereti adiacenti rosturilor inchise",
    rPrimeMinM2KPerW: 1.5,
    uPrimeMaxWPerM2K: 0.67,
    appliesTo: "cladiri rezidentiale NZEB"
  }),
  entry({
    id: "floor_over_exterior_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "plansee catre exterior",
    elementTypeRo:
      "Plansee care delimiteaza cladirea la partea inferioara catre exterior, bowindouri, ganguri etc.",
    rPrimeMinM2KPerW: 5.0,
    uPrimeMaxWPerM2K: 0.2,
    appliesTo: "cladiri rezidentiale NZEB"
  }),
  entry({
    id: "slab_on_ground_above_cts_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "placi pe sol",
    elementTypeRo: "Placi pe sol peste cota terenului sistematizat (CTS)",
    rPrimeMinM2KPerW: 5.0,
    uPrimeMaxWPerM2K: 0.2,
    appliesTo: "cladiri rezidentiale NZEB"
  }),
  entry({
    id: "heated_basement_lower_slab_below_cts_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "demisoluri si subsoluri incalzite",
    elementTypeRo: "Placi la partea inferioara a demisolurilor/subsolurilor incalzite sub CTS",
    rPrimeMinM2KPerW: 5.3,
    uPrimeMaxWPerM2K: 0.19,
    appliesTo: "cladiri rezidentiale NZEB"
  }),
  entry({
    id: "heated_basement_external_walls_below_cts_residential_nzeb",
    buildingCategory: "residential",
    table: "MC001-2022 Tabel 2.4",
    elementCategoryRo: "demisoluri si subsoluri incalzite",
    elementTypeRo: "Pereti exteriori sub CTS la demisoluri/subsoluri incalzite",
    rPrimeMinM2KPerW: 3.4,
    uPrimeMaxWPerM2K: 0.29,
    appliesTo: "cladiri rezidentiale NZEB"
  })
]);

export const nonResidentialNZEBEnvelopeThresholds = Object.freeze([
  entry({
    id: "exterior_walls_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "pereti exteriori",
    elementTypeRo:
      "Pereti exteriori, exclusiv suprafetele vitrate, inclusiv peretii adiacenti rosturilor deschise",
    rPrimeMinM2KPerW: 3.0,
    uPrimeMaxWPerM2K: 0.33,
    appliesTo: "cladiri nerezidentiale NZEB"
  }),
  entry({
    id: "exterior_windows_roof_windows_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "tamplarie exterioara",
    elementTypeRo: "Tamplarie exterioara: ferestre si ferestre de mansarda",
    rPrimeMinM2KPerW: 0.83,
    uPrimeMaxWPerM2K: 1.2,
    appliesTo: "cladiri nerezidentiale NZEB"
  }),
  entry({
    id: "exterior_manual_doors_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "tamplarie exterioara",
    elementTypeRo: "Tamplarie exterioara: usi cu actionare manuala",
    rPrimeMinM2KPerW: 0.77,
    uPrimeMaxWPerM2K: 1.3,
    appliesTo: "cladiri nerezidentiale NZEB",
    notes: "Special automatic, sliding or revolving doors are not covered by this extracted row."
  }),
  entry({
    id: "curtain_walls_and_skylights_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "fatade vitrate si luminatoare",
    elementTypeRo: "Fatade vitrate tip perete cortina si luminatoare",
    rPrimeMinM2KPerW: 0.77,
    uPrimeMaxWPerM2K: 1.3,
    appliesTo: "cladiri nerezidentiale NZEB"
  }),
  entry({
    id: "top_floors_under_terrace_or_attic_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "plansee peste ultimul nivel",
    elementTypeRo: "Plansee peste ultimul nivel, sub terase sau poduri",
    rPrimeMinM2KPerW: 6.0,
    uPrimeMaxWPerM2K: 0.17,
    appliesTo: "cladiri nerezidentiale NZEB"
  }),
  entry({
    id: "floor_over_unheated_basement_or_cellar_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "plansee peste spatii neincalzite",
    elementTypeRo: "Plansee peste subsoluri neincalzite si pivnite",
    rPrimeMinM2KPerW: 3.4,
    uPrimeMaxWPerM2K: 0.29,
    appliesTo: "cladiri nerezidentiale NZEB"
  }),
  entry({
    id: "walls_adjacent_to_closed_joints_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "pereti adiacenti rosturilor",
    elementTypeRo: "Pereti adiacenti rosturilor inchise",
    rPrimeMinM2KPerW: 1.5,
    uPrimeMaxWPerM2K: 0.67,
    appliesTo: "cladiri nerezidentiale NZEB"
  }),
  entry({
    id: "floor_over_exterior_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "plansee catre exterior",
    elementTypeRo:
      "Plansee care delimiteaza cladirea la partea inferioara catre exterior, bowindouri, ganguri etc.",
    rPrimeMinM2KPerW: 5.0,
    uPrimeMaxWPerM2K: 0.2,
    appliesTo: "cladiri nerezidentiale NZEB"
  }),
  entry({
    id: "slab_on_ground_above_cts_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "placi pe sol",
    elementTypeRo: "Placi pe sol peste cota terenului sistematizat (CTS)",
    rPrimeMinM2KPerW: 5.0,
    uPrimeMaxWPerM2K: 0.2,
    appliesTo: "cladiri nerezidentiale NZEB"
  }),
  entry({
    id: "heated_basement_lower_slab_below_cts_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "demisoluri si subsoluri incalzite",
    elementTypeRo: "Placi la partea inferioara a demisolurilor/subsolurilor incalzite sub CTS",
    rPrimeMinM2KPerW: 5.3,
    uPrimeMaxWPerM2K: 0.19,
    appliesTo: "cladiri nerezidentiale NZEB"
  }),
  entry({
    id: "heated_basement_external_walls_below_cts_non_residential_nzeb",
    buildingCategory: "non_residential",
    table: "MC001-2022 Tabel 2.7",
    elementCategoryRo: "demisoluri si subsoluri incalzite",
    elementTypeRo: "Pereti exteriori sub CTS la demisoluri/subsoluri incalzite",
    rPrimeMinM2KPerW: 3.4,
    uPrimeMaxWPerM2K: 0.29,
    appliesTo: "cladiri nerezidentiale NZEB"
  })
]);

export function listResidentialNZEBEnvelopeThresholds() {
  return residentialNZEBEnvelopeThresholds;
}

export function listNonResidentialNZEBEnvelopeThresholds() {
  return nonResidentialNZEBEnvelopeThresholds;
}

export function listAllEnvelopeThresholds() {
  return Object.freeze([
    ...residentialNZEBEnvelopeThresholds,
    ...nonResidentialNZEBEnvelopeThresholds
  ]);
}

export function findEnvelopeThresholdById(id) {
  return listAllEnvelopeThresholds().find((entryValue) => entryValue.id === id);
}

export function findEnvelopeThresholdsByBuildingCategory(buildingCategory) {
  return Object.freeze(
    listAllEnvelopeThresholds().filter(
      (entryValue) => entryValue.buildingCategory === buildingCategory
    )
  );
}

export function findEnvelopeThresholdsByElementCategory(elementCategoryRo) {
  return Object.freeze(
    listAllEnvelopeThresholds().filter(
      (entryValue) => entryValue.elementCategoryRo === elementCategoryRo
    )
  );
}
