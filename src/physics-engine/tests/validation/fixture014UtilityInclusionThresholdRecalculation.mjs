export const fixture014UtilityInclusionThresholdRecalculation = Object.freeze({
  fixtureId: "FIXTURE_014_UTILITY_INCLUSION_THRESHOLD_RECALCULATION",
  fixtureType: "dataset_rule_validation",
  sourceDocument: "MC001-2022",
  sourcePages: Object.freeze([395, 396]),
  sourceNote:
    "MC001 page 395 Tabel 5.6 defines mandatory/optional utilities; page 396 Nota 4 defines optional-utility threshold recalculation.",
  scope:
    "Tabel 5.6 utility inclusion flags and Nota 4 total/CO2 threshold recalculation from explicit inputs only.",
  exclusions: Object.freeze([
    "no certificate workflow",
    "no CPE generation",
    "no certificate class inference",
    "no virtual ventilation consumption calculation",
    "no overheating/discomfort calculation",
    "no mixed-use weighted averaging",
    "no reference-building class assignment",
    "no UI/API/DB/Worker/orchestrator/production integration"
  ]),
  extractionVerification: Object.freeze([
    Object.freeze({
      item: "Tabel 5.6 residential utilities",
      sourcePage: 395,
      verification:
        "Residential category 1 has heating, DHW and lighting mandatory; cooling and mechanical ventilation optional."
    }),
    Object.freeze({
      item: "Tabel 5.6 non-residential utilities",
      sourcePage: 395,
      verification:
        "Categories 2-8 have heating, DHW, mechanical ventilation and lighting mandatory; cooling optional."
    }),
    Object.freeze({
      item: "Notes 1-5",
      sourcePages: Object.freeze([395, 396]),
      verification:
        "Open-left/closed-right intervals, apartment table selection, overheating indicator, threshold recalculation, and mixed-use weighted averaging match the reviewed extraction."
    })
  ]),
  utilityInclusionCases: Object.freeze([
    Object.freeze({
      caseId: "residential_cooling_optional",
      buildingCategoryKey: "residential_individual",
      utilityKey: "cooling",
      expectedMandatory: false,
      expectedCalculationVariable: "delta_3",
      expectedCalculationVariableValue: "0/1"
    }),
    Object.freeze({
      caseId: "residential_mechanical_ventilation_optional",
      buildingCategoryKey: "residential_collective",
      utilityKey: "mechanical_ventilation",
      expectedMandatory: false,
      expectedCalculationVariable: "delta_4",
      expectedCalculationVariableValue: "0/1"
    }),
    Object.freeze({
      caseId: "education_cooling_optional",
      buildingCategoryKey: "education",
      utilityKey: "cooling",
      expectedMandatory: false,
      expectedCalculationVariable: "delta_3",
      expectedCalculationVariableValue: "0/1"
    }),
    Object.freeze({
      caseId: "education_mechanical_ventilation_mandatory",
      buildingCategoryKey: "education",
      utilityKey: "mechanical_ventilation",
      expectedMandatory: true,
      expectedCalculationVariable: "delta_4",
      expectedCalculationVariableValue: "1"
    })
  ]),
  totalThresholdCases: Object.freeze([
    Object.freeze({
      caseId: "school_without_cooling_b_c_total_primary_threshold",
      sourceTable: "MC001-2022 Tabel 5.10",
      sourcePage: 396,
      buildingCategoryKey: "education",
      boundary: "B/C",
      baseTotalThreshold: 135,
      missingUtilityPrimaryThresholds: Object.freeze([
        Object.freeze({
          utilityKey: "cooling",
          primaryThreshold: 13
        })
      ]),
      expectedAdjustedThreshold: 122,
      unit: "kWh/(m2.an)"
    })
  ]),
  co2ThresholdCases: Object.freeze([
    Object.freeze({
      caseId: "school_without_cooling_b_c_co2_threshold",
      sourceTable: "MC001-2022 Tabel 5.10",
      sourcePage: 396,
      buildingCategoryKey: "education",
      boundary: "B/C",
      baseCO2Threshold: 23.0,
      missingUtilityPrimaryThresholds: Object.freeze([
        Object.freeze({
          utilityKey: "cooling",
          primaryThreshold: 13
        })
      ]),
      co2Factor: 0.107,
      expectedRawAdjustedThreshold: 21.609,
      expectedAdjustedThreshold: 21.61,
      unit: "kgCO2/(m2.an)"
    })
  ]),
  futureBlockers: Object.freeze([
    Object.freeze({
      row: "Buildings without cooling",
      reason:
        "MC001 Nota 3 requires annual hours above 26 degC; chapter 2.8.6 is not implemented here."
    }),
    Object.freeze({
      row: "Mixed-use buildings",
      reason:
        "MC001 Nota 5 requires area-weighted limits by assimilated zones; zone mapping and areas are not implemented here."
    }),
    Object.freeze({
      row: "Non-residential missing mechanical ventilation consumption",
      reason:
        "Tabel 5.6 prose imposes virtual ventilation consumption, but this fixture records the rule only and does not calculate a virtual system."
    }),
    Object.freeze({
      row: "Certificate/CPE workflow",
      reason:
        "This fixture validates utility inclusion and threshold arithmetic only; it does not infer certificate classes or generate certificate output."
    })
  ])
});
