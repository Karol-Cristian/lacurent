export const referenceBuildingRules = {
  pipeInsulation: {
    appliesTo: "distribution_pipes_in_unheated_spaces",
    lambdaMaxWPerMK: 0.05,
    minimumThicknessRatioToExternalDiameter: 0.75,
    labelRo: "Conductele de distributie din spatiile neincalzite sunt izolate termic cu material lambda iz <= 0,05 W/mK si grosime minim 0,75 x diametrul exterior al conductei.",
    source: "MC001-2022",
    sourceSection: "Cladirea de referinta",
    sourceStatus: "user_provided_reference_values",
    requiresOfficialVerification: true,
    implementationStatus: "ready_for_registry_but_not_official_certificate"
  },

  lighting: {
    referenceTechnology: "LED",
    labelRo: "Instalatia de iluminat are caracteristicile echipamentelor moderne noi, lampi LED.",
    source: "MC001-2022",
    sourceSection: "Cladirea de referinta",
    sourceStatus: "user_provided_reference_values",
    requiresOfficialVerification: true,
    implementationStatus: "ready_for_registry_but_not_official_certificate"
  },

  mechanicalVentilation: {
    hasHeatRecovery: true,
    numericHeatRecoveryEfficiency: null,
    labelRo: "Daca exista ventilare mecanica, sistemul este prevazut cu recuperator de caldura.",
    source: "MC001-2022",
    sourceSection: "Cladirea de referinta",
    sourceStatus: "user_provided_reference_values",
    requiresOfficialVerification: true,
    implementationStatus: "ready_for_registry_but_not_official_certificate",
    missingValueNote: "Randamentul numeric al recuperatorului nu este furnizat aici. Nu inventa valoarea."
  },

  heatingForDistrictConnectedBuildings: {
    referenceHeatSource: "district_heating_compact_substation",
    labelRo: "Pentru cladirile racordate la sisteme districtuale, sursa de caldura este statie termica compacta racordata la sistem districtual.",
    source: "MC001-2022",
    sourceSection: "Cladirea de referinta",
    sourceStatus: "user_provided_reference_values",
    requiresOfficialVerification: true,
    implementationStatus: "ready_for_registry_but_not_official_certificate"
  },

  heatingForNonDistrictBuildings: {
    referenceHeatSource: "own_gas_boiler_with_storage_dhw",
    labelRo: "Pentru cladiri neracordate la sistem districtual, sursa de caldura este centrala termica proprie cu combustibil gazos si preparare ACM cu boiler cu acumulare.",
    source: "MC001-2022",
    sourceSection: "Cladirea de referinta",
    sourceStatus: "user_provided_reference_values",
    requiresOfficialVerification: true,
    implementationStatus: "ready_for_registry_but_not_official_certificate"
  }
} as const;
