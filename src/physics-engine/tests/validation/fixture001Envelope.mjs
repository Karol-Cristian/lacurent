export const fixture001Envelope = Object.freeze({
  fixtureId: "FIXTURE_001_ENVELOPE",
  exampleId: "MC001_EX_B_GEOMETRY_ENVELOPE_TABLES",
  description: "MC001 Anexa B external opaque wall before renovation",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section: "MC001-2022 Anexa B, school audit breviar",
    pages: Object.freeze([515, 516, 517, 518, 576]),
    tables: Object.freeze([
      "Tabel 2.2 material calculation conductivities",
      "Tabel 2.3 external wall linear thermal bridge coefficients",
      "Tabel 2.4 external wall thermal resistances",
      "Anexa 1 external wall input sheet"
    ])
  }),
  element: Object.freeze({
    elementId: "external_opaque_wall_before_renovation",
    areaM2: 596.5,
    rsiM2KPerW: 0.125,
    rseM2KPerW: 0.042,
    thermalBridgeReductionFactor: 0.60
  }),
  layers: Object.freeze([
    Object.freeze({
      layerId: "interior_plaster",
      label: "Interior plaster",
      thicknessM: 0.02,
      lambdaNormatWPerMK: 0.87,
      correctionCoefficientA: 1.03,
      expectedLambdaCorrectedRoundedWPerMK: 0.896,
      expectedResistanceRoundedM2KPerW: 0.022
    }),
    Object.freeze({
      layerId: "solid_brick_masonry",
      label: "Solid brick masonry",
      thicknessM: 0.365,
      lambdaNormatWPerMK: 0.80,
      correctionCoefficientA: 1.15,
      expectedLambdaCorrectedRoundedWPerMK: 0.920,
      expectedResistanceRoundedM2KPerW: 0.397
    }),
    Object.freeze({
      layerId: "eps_etics_insulation",
      label: "EPS ETICS insulation",
      thicknessM: 0.05,
      lambdaNormatWPerMK: 0.044,
      correctionCoefficientA: 1.05,
      expectedLambdaCorrectedRoundedWPerMK: 0.046,
      expectedResistanceRoundedM2KPerW: 1.082
    }),
    Object.freeze({
      layerId: "exterior_plaster",
      label: "Exterior plaster",
      thicknessM: 0.03,
      lambdaNormatWPerMK: 0.93,
      correctionCoefficientA: 1.10,
      expectedLambdaCorrectedRoundedWPerMK: 1.023,
      expectedResistanceRoundedM2KPerW: 0.029
    })
  ]),
  expected: Object.freeze({
    totalResistanceRoundedM2KPerW: 1.698,
    correctedResistanceRoundedM2KPerW: 1.02,
    plainUValueFromSourceRWPerM2K: 1 / 1.698,
    correctedUPrimeFromSourceRPrimeWPerM2K: 1 / 1.02,
    directTransmissionFromCorrectedUWPerK: 596.5 / 1.02,
    sourceBridgeContributionTotalWPerK: 233.509
  }),
  sourceBridgeContributionRows: Object.freeze([
    Object.freeze({ row: "1", contributionWPerK: 13.689 }),
    Object.freeze({ row: "2", contributionWPerK: -3.735 }),
    Object.freeze({ row: "3", contributionWPerK: 2.028 }),
    Object.freeze({ row: "3'", contributionWPerK: 0.216 }),
    Object.freeze({ row: "4", contributionWPerK: -0.012 }),
    Object.freeze({ row: "5", contributionWPerK: 0.811 }),
    Object.freeze({ row: "6", contributionWPerK: 80.00 }),
    Object.freeze({ row: "7", contributionWPerK: 45.71 }),
    Object.freeze({ row: "8", contributionWPerK: 2.099 }),
    Object.freeze({ row: "9", contributionWPerK: 18.682 }),
    Object.freeze({ row: "10", contributionWPerK: 2.189 }),
    Object.freeze({ row: "11", contributionWPerK: 24.558 }),
    Object.freeze({ row: "12", contributionWPerK: 11.146 }),
    Object.freeze({ row: "13", contributionWPerK: 23.423 }),
    Object.freeze({ row: "14", contributionWPerK: 1.278 }),
    Object.freeze({ row: "15", contributionWPerK: 11.415 })
  ]),
  tolerances: Object.freeze({
    lambdaCorrectedAbsWPerMK: 0.0005,
    layerResistanceAbsM2KPerW: 0.0005,
    totalResistanceAbsM2KPerW: 0.0005,
    correctedResistanceAbsM2KPerW: 0.005,
    uValueAbsWPerM2K: 0.0002,
    directTransmissionAbsWPerK: 1e-9,
    bridgeContributionAbsWPerK: 0.02
  })
});
