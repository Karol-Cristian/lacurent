export const fixture003EnvelopeRemainingElements = Object.freeze({
  fixtureId: "FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS",
  exampleIds: Object.freeze([
    "MC001_EX_B_GEOMETRY_ENVELOPE_TABLES",
    "MC001_EX_B_THERMAL_BRIDGE_TABLES"
  ]),
  description: "MC001 Anexa B remaining baseline envelope elements",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section: "MC001-2022 Anexa B, school audit breviar",
    pages: Object.freeze([515, 517, 518, 519, 520, 576, 577]),
    tables: Object.freeze([
      "Tabel 2.1 geometry summary",
      "Tabel 2.4 thermal resistances",
      "Page 517 thermal bridge groups",
      "Page 520 transmission-loss table",
      "Anexa 1 input sheet"
    ])
  }),
  elements: Object.freeze([
    Object.freeze({
      elementId: "terrace_before_renovation",
      label: "Terrace",
      rsiM2KPerW: 0.125,
      rseM2KPerW: 0.042,
      thermalBridgeReductionFactor: 0.97,
      expectedTotalResistanceRoundedM2KPerW: 0.873,
      expectedCorrectedResistanceRoundedM2KPerW: 0.85,
      sourceTransmission: Object.freeze({
        areaM2: 504.0,
        displayedUPrimeWPerM2K: 1.18,
        displayedHdWPerK: 594.49
      }),
      areaContext: Object.freeze({
        geometrySummaryM2: 508.7,
        annexInputSheetM2: 456.5,
        transmissionTableM2: 504.0
      }),
      layers: Object.freeze([
        Object.freeze({
          layerId: "terrace_interior_plaster",
          label: "Interior plaster",
          thicknessM: 0.020,
          lambdaNormatWPerMK: 0.87,
          correctionCoefficientA: 1.03,
          expectedLambdaCorrectedRoundedWPerMK: 0.896,
          expectedResistanceRoundedM2KPerW: 0.022
        }),
        Object.freeze({
          layerId: "terrace_reinforced_concrete_slab",
          label: "Reinforced concrete slab",
          thicknessM: 0.150,
          lambdaNormatWPerMK: 1.74,
          correctionCoefficientA: 1.10,
          expectedLambdaCorrectedRoundedWPerMK: 1.914,
          expectedResistanceRoundedM2KPerW: 0.078
        }),
        Object.freeze({
          layerId: "terrace_slope_concrete",
          label: "Slope concrete",
          thicknessM: 0.100,
          lambdaNormatWPerMK: 1.62,
          correctionCoefficientA: 1.10,
          expectedLambdaCorrectedRoundedWPerMK: 1.782,
          expectedResistanceRoundedM2KPerW: 0.056
        }),
        Object.freeze({
          layerId: "terrace_bca_gbn_t_insulation",
          label: "BCA GBN-T insulation",
          thicknessM: 0.120,
          lambdaNormatWPerMK: 0.22,
          correctionCoefficientA: 1.20,
          expectedLambdaCorrectedRoundedWPerMK: 0.264,
          expectedResistanceRoundedM2KPerW: 0.455
        }),
        Object.freeze({
          layerId: "terrace_screed",
          label: "Screed",
          thicknessM: 0.050,
          lambdaNormatWPerMK: 0.64,
          correctionCoefficientA: 1.00,
          expectedLambdaCorrectedRoundedWPerMK: 0.64,
          expectedResistanceRoundedM2KPerW: 0.078
        }),
        Object.freeze({
          layerId: "terrace_waterproofing",
          label: "Waterproofing",
          thicknessM: 0.005,
          lambdaNormatWPerMK: 0.29,
          correctionCoefficientA: 1.00,
          expectedLambdaCorrectedRoundedWPerMK: 0.29,
          expectedResistanceRoundedM2KPerW: 0.017
        })
      ]),
      bridges: Object.freeze([
        Object.freeze({
          row: "terrace-1",
          bridgeId: "external_wall_to_terrace_floor_attic",
          psiWPerMK: 0.154,
          multiplicity: 1,
          lengthM: 49.76,
          expectedContributionWPerK: 7.663
        }),
        Object.freeze({
          row: "terrace-2",
          bridgeId: "external_wall_to_terrace_floor_attic_joinery",
          psiWPerMK: 0.270,
          multiplicity: 1,
          lengthM: 39.00,
          expectedContributionWPerK: 10.530
        })
      ]),
      expectedBridgeSubtotalDisplayedWPerK: 18.193
    }),
    Object.freeze({
      elementId: "slab_on_ground_before_renovation",
      label: "Slab on ground",
      rsiM2KPerW: 0.167,
      rseM2KPerW: 0,
      thermalBridgeReductionFactor: 0.58,
      expectedTotalResistanceRoundedM2KPerW: 3.110,
      expectedCorrectedResistanceRoundedM2KPerW: 1.79,
      sourceTransmission: Object.freeze({
        areaM2: 504.0,
        displayedUPrimeWPerM2K: 0.56,
        displayedHgWPerK: 86.12
      }),
      areaContext: Object.freeze({
        geometrySummaryM2: 443.0,
        annexInputSheetM2: 407.9,
        transmissionTableM2: 504.0
      }),
      layers: Object.freeze([
        Object.freeze({
          layerId: "slab_flooring",
          label: "Flooring",
          thicknessM: 0.015,
          lambdaNormatWPerMK: 0.93,
          correctionCoefficientA: 1.00,
          expectedLambdaCorrectedRoundedWPerMK: 0.93,
          expectedResistanceRoundedM2KPerW: 0.016
        }),
        Object.freeze({
          layerId: "slab_concrete_screed",
          label: "Concrete screed",
          thicknessM: 0.050,
          lambdaNormatWPerMK: 1.74,
          correctionCoefficientA: 1.10,
          expectedLambdaCorrectedRoundedWPerMK: 1.91,
          expectedResistanceRoundedM2KPerW: 0.026
        }),
        Object.freeze({
          layerId: "slab_reinforced_concrete",
          label: "Reinforced concrete slab",
          thicknessM: 0.120,
          lambdaNormatWPerMK: 1.74,
          correctionCoefficientA: 1.10,
          expectedLambdaCorrectedRoundedWPerMK: 1.91,
          expectedResistanceRoundedM2KPerW: 0.063
        }),
        Object.freeze({
          layerId: "slab_gravel",
          label: "Gravel",
          thicknessM: 0.100,
          lambdaNormatWPerMK: 0.70,
          correctionCoefficientA: 1.10,
          expectedLambdaCorrectedRoundedWPerMK: 0.77,
          expectedResistanceRoundedM2KPerW: 0.130
        }),
        Object.freeze({
          layerId: "slab_soil_layer_3_415",
          label: "Soil layer",
          thicknessM: 3.415,
          lambdaNormatWPerMK: 2.00,
          correctionCoefficientA: 1.00,
          expectedLambdaCorrectedRoundedWPerMK: 2.00,
          expectedResistanceRoundedM2KPerW: 1.708
        }),
        Object.freeze({
          layerId: "slab_soil_layer_4_00",
          label: "Soil layer",
          thicknessM: 4.00,
          lambdaNormatWPerMK: 4.00,
          correctionCoefficientA: 1.00,
          expectedLambdaCorrectedRoundedWPerMK: 4.00,
          expectedResistanceRoundedM2KPerW: 1.000
        })
      ]),
      bridges: Object.freeze([
        Object.freeze({
          row: "slab-1",
          bridgeId: "external_wall_to_slab_on_ground",
          psiWPerMK: 1.128,
          multiplicity: 1,
          lengthM: 85.76,
          expectedContributionWPerK: 96.737
        })
      ]),
      expectedBridgeSubtotalDisplayedWPerK: 96.737
    }),
    Object.freeze({
      elementId: "floor_over_basement_before_renovation",
      label: "Floor over basement",
      rsiM2KPerW: 0.167,
      rseM2KPerW: 0.083,
      thermalBridgeReductionFactor: 0.87,
      expectedTotalResistanceRoundedM2KPerW: 0.383,
      expectedCorrectedResistanceRoundedM2KPerW: 0.33,
      sourceTransmission: Object.freeze({
        blockedReason:
          "Page 520 says losses to the partial basement are neglected because dimensions are small."
      }),
      areaContext: Object.freeze({
        geometrySummaryM2: 65.7
      }),
      layers: Object.freeze([
        Object.freeze({
          layerId: "basement_flooring",
          label: "Flooring",
          thicknessM: 0.015,
          lambdaNormatWPerMK: 0.93,
          correctionCoefficientA: 1.00,
          expectedLambdaCorrectedRoundedWPerMK: 0.93,
          expectedResistanceRoundedM2KPerW: 0.016
        }),
        Object.freeze({
          layerId: "basement_protective_screed",
          label: "Protective screed",
          thicknessM: 0.050,
          lambdaNormatWPerMK: 0.93,
          correctionCoefficientA: 1.00,
          expectedLambdaCorrectedRoundedWPerMK: 0.93,
          expectedResistanceRoundedM2KPerW: 0.054
        }),
        Object.freeze({
          layerId: "basement_reinforced_concrete",
          label: "Reinforced concrete slab",
          thicknessM: 0.120,
          lambdaNormatWPerMK: 1.74,
          correctionCoefficientA: 1.10,
          expectedLambdaCorrectedRoundedWPerMK: 1.91,
          expectedResistanceRoundedM2KPerW: 0.063
        })
      ]),
      bridges: Object.freeze([
        Object.freeze({
          row: "basement-1",
          bridgeId: "external_wall_to_floor_over_unheated_basement_joinery",
          psiWPerMK: 0.179,
          multiplicity: 1,
          lengthM: 3.54,
          expectedContributionWPerK: 0.634
        }),
        Object.freeze({
          row: "basement-2",
          bridgeId: "internal_wall_to_floor_over_unheated_basement",
          psiWPerMK: 0.338,
          multiplicity: 1,
          lengthM: 54.92,
          expectedContributionWPerK: 18.563
        })
      ]),
      expectedBridgeSubtotalDisplayedWPerK: 19.197
    })
  ]),
  expected: Object.freeze({
    terraceExplicitBridgeHdDisplayedWPerK: 594.49,
    terraceCorrectedUHdDisplayedWPerK: 594.49,
    fixtureScopedSourceTransmissionComponentsWPerK: 680.61
  }),
  blockedCalculators: Object.freeze([
    Object.freeze({
      functionName: "calculateLinearBridgePsi",
      reason: "No numeric L2D values are provided for these examples."
    })
  ]),
  tolerances: Object.freeze({
    lambdaCorrectedAbsWPerMK: 0.005,
    layerResistanceAbsM2KPerW: 0.001,
    totalResistanceAbsM2KPerW: 0.001,
    correctedResistanceAbsM2KPerW: 0.015,
    plainUAbsWPerM2K: 0.003,
    bridgeRowContributionAbsWPerK: 0.001,
    bridgeSubtotalAbsWPerK: 0.001,
    terraceTransmissionAbsWPerK: 0.75,
    totalTransmissionAbsWPerK: 1e-9
  })
});
