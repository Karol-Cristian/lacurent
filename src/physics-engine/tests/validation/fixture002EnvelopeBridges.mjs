export const fixture002EnvelopeBridges = Object.freeze({
  fixtureId: "FIXTURE_002_ENVELOPE_BRIDGES",
  exampleId: "MC001_EX_B_THERMAL_BRIDGE_TABLES",
  description: "MC001 Anexa B Tabel 2.3 complete external-wall thermal bridge rows",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section: "MC001-2022 Anexa B, school audit breviar",
    pages: Object.freeze([516, 517, 518, 576]),
    tables: Object.freeze([
      "Tabel 2.3 external wall linear thermal bridge coefficients",
      "Tabel 2.4 external wall thermal resistances",
      "Anexa 1 external wall input sheet"
    ])
  }),
  element: Object.freeze({
    elementId: "external_opaque_wall_before_renovation",
    areaM2: 596.5,
    sourceTotalResistanceM2KPerW: 1.698,
    sourcePlainUValueWPerM2K: 1 / 1.698,
    expectedPlainElementContributionWPerK: 596.5 / 1.698
  }),
  verifiedLinearBridgeRows: Object.freeze([
    Object.freeze({
      row: "1",
      bridgeId: "external_corner",
      description: "Exterior corner",
      psiWPerMK: 0.324,
      multiplicity: 5,
      lengthM: 8.45,
      expectedContributionWPerK: 13.689
    }),
    Object.freeze({
      row: "2",
      bridgeId: "interior_corner",
      description: "Interior corner",
      psiWPerMK: -0.442,
      multiplicity: 1,
      lengthM: 8.45,
      expectedContributionWPerK: -3.735
    }),
    Object.freeze({
      row: "3",
      bridgeId: "external_wall_to_internal_wall_small_column_ground_floor",
      description: "External wall to internal wall with small column, ground floor",
      psiWPerMK: 0.020,
      multiplicity: 12,
      lengthM: 8.45,
      expectedContributionWPerK: 2.028
    }),
    Object.freeze({
      row: "3'",
      bridgeId: "external_wall_to_internal_wall_small_column_upper_floor",
      description: "External wall to internal wall with small column, upper floor",
      psiWPerMK: 0.020,
      multiplicity: 2,
      lengthM: 5.40,
      expectedContributionWPerK: 0.216
    }),
    Object.freeze({
      row: "4",
      bridgeId: "external_wall_to_internal_wall_without_small_column_ground_floor",
      description: "External wall to internal wall without small column, ground floor",
      psiWPerMK: -0.002,
      multiplicity: 2,
      lengthM: 3.05,
      expectedContributionWPerK: -0.012
    }),
    Object.freeze({
      row: "5",
      bridgeId: "field_rib",
      description: "Field rib",
      psiWPerMK: 0.024,
      multiplicity: 4,
      lengthM: 8.45,
      expectedContributionWPerK: 0.811
    }),
    Object.freeze({
      row: "8",
      bridgeId: "external_wall_to_intermediate_floor_e1",
      description: "External wall to intermediate floor E1",
      psiWPerMK: 0.044,
      multiplicity: 1,
      lengthM: 47.71,
      expectedContributionWPerK: 2.099
    }),
    Object.freeze({
      row: "10",
      bridgeId: "external_wall_to_intermediate_floor_e2",
      description: "External wall to intermediate floor E2",
      psiWPerMK: 0.044,
      multiplicity: 1,
      lengthM: 49.76,
      expectedContributionWPerK: 2.189
    }),
    Object.freeze({
      row: "12",
      bridgeId: "external_wall_to_terrace_floor_attic",
      description: "External wall to terrace floor, attic/parapet",
      psiWPerMK: 0.224,
      multiplicity: 1,
      lengthM: 49.76,
      expectedContributionWPerK: 11.146
    }),
    Object.freeze({
      row: "14",
      bridgeId: "external_wall_to_floor_over_unheated_basement_joinery",
      description: "External wall to floor over unheated basement, window junction",
      psiWPerMK: 0.426,
      multiplicity: 2,
      lengthM: 1.50,
      expectedContributionWPerK: 1.278
    }),
    Object.freeze({
      row: "15",
      bridgeId: "external_wall_to_slab_on_ground",
      description: "External wall to slab on ground",
      psiWPerMK: 0.1331,
      multiplicity: 1,
      lengthM: 85.76,
      expectedContributionWPerK: 11.415
    })
  ]),
  blockedRows: Object.freeze([
    Object.freeze({
      row: "6",
      bridgeId: "horizontal_external_joinery_section",
      psiWPerMK: 0.363,
      multiplicity: 90,
      missing: "lengthM",
      displayedContributionWPerK: 80.000
    }),
    Object.freeze({
      row: "7",
      bridgeId: "vertical_external_joinery_section_sill_reveal",
      psiWPerMK: 0.394,
      multiplicity: 88,
      missing: "lengthM",
      displayedContributionWPerK: 45.710
    }),
    Object.freeze({
      row: "9",
      bridgeId: "external_wall_to_intermediate_floor_e1_joinery",
      psiWPerMK: 0.455,
      multiplicity: 32,
      missing: "lengthM",
      displayedContributionWPerK: 18.682
    }),
    Object.freeze({
      row: "11",
      bridgeId: "external_wall_to_intermediate_floor_e2_joinery",
      psiWPerMK: 0.630,
      multiplicity: 29,
      missing: "lengthM",
      displayedContributionWPerK: 24.558
    }),
    Object.freeze({
      row: "13",
      bridgeId: "external_wall_to_terrace_floor_attic_joinery",
      psiWPerMK: 0.601,
      multiplicity: 29,
      missing: "lengthM",
      displayedContributionWPerK: 23.423
    })
  ]),
  expected: Object.freeze({
    verifiedBridgeSubtotalDisplayedWPerK: 41.124,
    verifiedBridgeSubtotalFromPsiLengthWPerK: 41.124676,
    sourceFullTableTotalDisplayedWPerK: 233.509,
    directTransmissionWithVerifiedBridgesWPerK: 392.42031793168434
  }),
  blockedCalculators: Object.freeze([
    Object.freeze({
      functionName: "calculateLinearBridgePsi",
      reason: "MC001 Tabel 2.3 provides sourced psi values but no numeric L2D values."
    })
  ]),
  tolerances: Object.freeze({
    bridgeRowContributionAbsWPerK: 0.001,
    bridgeSubtotalAbsWPerK: 0.001,
    directTransmissionAbsWPerK: 1e-9,
    totalTransmissionAbsWPerK: 1e-9
  })
});
