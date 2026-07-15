export const P2V_VALIDATION_STATUS = "P2V_VALIDATION_COMPLETE";

export const P2V_TOLERANCE_POLICY = Object.freeze({
  identifiers: "exact",
  origins: "exact",
  diagnostics: "exact",
  integerCounts: "exact",
  floatingPoint: {
    defaultAbsoluteTolerance: 1e-9,
    defaultRelativeTolerance: 1e-9,
    presentationAbsoluteTolerance: 0.005,
    widerToleranceJustification:
      "Only presentation-rounding assertions may use the wider 0.005 kWh/WK tolerance."
  }
});

export const P2V_REQUIRED_DOMAIN_GROUPS = Object.freeze([
  "A_materials_and_thermal_resistance",
  "B_envelope_heat_transfer",
  "C_thermal_bridges",
  "D_ventilation_and_transfer",
  "E_gains",
  "F_heating_useful_demand",
  "G_cooling_useful_demand",
  "H_latent_demand",
  "I_building_dna_platform_paths"
]);

export const P2V_SYNTHETIC_SEASONAL_PROFILE = Object.freeze({
  profileId: "p2v_synthetic_romanian_seasonal_profile_not_official_climate",
  status: "synthetic_validation_data",
  safetyLabel:
    "Used only for physical-property validation. It is not an official climate file.",
  monthlyOutdoorTemperaturesC: Object.freeze({
    january: -2,
    february: 1,
    march: 6,
    april: 11,
    may: 17,
    june: 22,
    july: 25,
    august: 25,
    september: 19,
    october: 12,
    november: 6,
    december: 0
  }),
  monthlyDurationsH: Object.freeze({
    january: 744,
    february: 672,
    march: 744,
    april: 720,
    may: 744,
    june: 720,
    july: 744,
    august: 744,
    september: 720,
    october: 744,
    november: 720,
    december: 744
  }),
  monthlySolarGainsKwh: Object.freeze({
    january: 120,
    february: 160,
    march: 230,
    april: 310,
    may: 390,
    june: 470,
    july: 520,
    august: 500,
    september: 360,
    october: 240,
    november: 150,
    december: 110
  })
});

export const P2V_DEMO_FIXTURE_SAFETY_METADATA = Object.freeze({
  fixtureId: "demo_detached_masonry_1985_eps_pvc_bucharest",
  origin: "demo_fixture",
  confirmationStatus: "unconfirmed_demo",
  editable: true,
  notAClimateFile: true,
  artificialCoolingTriggerMonths: Object.freeze([]),
  forbiddenDefaultLeakage: Object.freeze([
    "normal_mode_must_not_receive_demo_values",
    "saved_real_building_must_not_inherit_demo_monthly_profiles",
    "verified_mode_requires_confirmed_or_source_backed_monthly_inputs"
  ])
});

function scenario(input) {
  return Object.freeze({
    expectedDiagnostics: Object.freeze([]),
    expectedProvenance: Object.freeze(["explicit_input"]),
    expectedConfidence: "fixed_independent_oracle",
    toleranceRules: "P2V_TOLERANCE_POLICY",
    ...input,
    pathsExercised: Object.freeze(input.pathsExercised ?? []),
    relationsCovered: Object.freeze(input.relationsCovered ?? []),
    tablesCovered: Object.freeze(input.tablesCovered ?? []),
    branchesCovered: Object.freeze(input.branchesCovered ?? []),
    explicitInputs: Object.freeze(input.explicitInputs ?? {}),
    expectedIntermediateValues: Object.freeze(input.expectedIntermediateValues ?? {}),
    expectedFinalValues: Object.freeze(input.expectedFinalValues ?? {}),
    expectedDiagnostics: Object.freeze(input.expectedDiagnostics ?? []),
    expectedProvenance: Object.freeze(input.expectedProvenance ?? ["explicit_input"])
  });
}

export const P2V_VALIDATION_SCENARIOS = Object.freeze([
  scenario({
    scenarioId: "A1_single_homogeneous_wall",
    group: "A_materials_and_thermal_resistance",
    description: "Explicit lambda and thickness produce independent layer R, total R, and U.",
    buildingType: "detached_house",
    constructionCharacteristics: "single 300 mm homogeneous wall layer",
    pathsExercised: ["explicit_lambda", "layer_resistance", "assembly_u_value"],
    relationsCovered: ["MC001_LAYER_RESISTANCE_THICKNESS_OVER_LAMBDA", "MC001_R15_RELATION_2_6_TOTAL_THERMAL_RESISTANCE", "MC001_R16_RELATION_2_7_THERMAL_TRANSMITTANCE"],
    explicitInputs: { thicknessM: 0.3, lambdaWmK: 0.6, rsi: 0.13, rse: 0.04 },
    expectedIntermediateValues: { rLayer: 0.5, rTotal: 0.67 },
    expectedFinalValues: { uValue: 1.4925373134328357 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "A2_corrected_masonry_lambda",
    group: "A_materials_and_thermal_resistance",
    description: "Table 2.2 correction transforms lambda_normat into design lambda.",
    buildingType: "detached_house",
    constructionCharacteristics: "old masonry layer with correction coefficient",
    pathsExercised: ["lambda_normat", "table_2_2_correction", "layer_resistance"],
    relationsCovered: ["MC001_R15_RELATION_2_3_LAMBDA_CORRECTION"],
    tablesCovered: ["MC001_TABLE_2_2_MATERIAL_CORRECTION_COEFFICIENTS"],
    explicitInputs: { thicknessM: 0.3, lambdaNormatWmK: 0.6, correctionCoefficientA: 1.03 },
    expectedIntermediateValues: { designLambdaWmK: 0.618, rLayer: 0.4854368932038835, rTotal: 0.6554368932038835 },
    expectedFinalValues: { uValue: 1.5256998963116575 },
    expectedProvenance: ["calculated_from_MC001_relation_2_3_explicit_coefficient"],
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "A3_multilayer_wall",
    group: "A_materials_and_thermal_resistance",
    description: "Plaster, masonry, and EPS layer stack produces fixed R and U.",
    buildingType: "detached_house",
    constructionCharacteristics: "three-layer wall",
    pathsExercised: ["multi_layer_resistance", "surface_resistance", "u_value"],
    relationsCovered: ["MC001_R15_RELATION_2_6_TOTAL_THERMAL_RESISTANCE", "MC001_R16_RELATION_2_7_THERMAL_TRANSMITTANCE"],
    explicitInputs: { plaster: "0.02/0.7", masonry: "0.30/0.6", eps: "0.10/0.04", rsi: 0.13, rse: 0.04 },
    expectedIntermediateValues: { rTotal: 3.1985714285714284 },
    expectedFinalValues: { uValue: 0.31263957123715946 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "A4_timber_mineral_wool_roof",
    group: "A_materials_and_thermal_resistance",
    description: "Roof-like timber and mineral wool assembly validates low-U behavior.",
    buildingType: "timber_house",
    constructionCharacteristics: "timber layer plus mineral wool",
    pathsExercised: ["roof_assembly", "low_conductivity_insulation"],
    relationsCovered: ["MC001_LAYER_RESISTANCE_THICKNESS_OVER_LAMBDA", "MC001_R16_RELATION_2_7_THERMAL_TRANSMITTANCE"],
    explicitInputs: { timber: "0.02/0.13", mineralWool: "0.20/0.04", rsi: 0.1, rse: 0.04 },
    expectedIntermediateValues: { rTotal: 5.293846153846154 },
    expectedFinalValues: { uValue: 0.18889857599535018 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "A5_wood_earth_fill_ceiling",
    group: "A_materials_and_thermal_resistance",
    description: "Wood board, earth fill, and mineral wool intervention ceiling.",
    buildingType: "traditional_masonry_house",
    constructionCharacteristics: "wood and earth-fill ceiling with insulation",
    pathsExercised: ["ceiling_assembly", "renovation_layer"],
    relationsCovered: ["MC001_LAYER_RESISTANCE_THICKNESS_OVER_LAMBDA", "MC001_R15_RELATION_2_6_TOTAL_THERMAL_RESISTANCE"],
    explicitInputs: { board: "0.025/0.18", earthFill: "0.15/0.7", mineralWool: "0.12/0.04" },
    expectedIntermediateValues: { rTotal: 3.4931746031746034 },
    expectedFinalValues: { uValue: 0.2862725496432953 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "B1_direct_external_envelope_only",
    group: "B_envelope_heat_transfer",
    description: "Exterior elements only yield Hd and Htr.",
    buildingType: "detached_house",
    constructionCharacteristics: "outside-air envelope with no bridges",
    pathsExercised: ["Hd", "Htr"],
    relationsCovered: ["MC001_R17_RELATION_2_11_DIRECT_TRANSMISSION_WITH_BRIDGES"],
    explicitInputs: { areaM2: 100, uValue: 0.5 },
    expectedFinalValues: { hdWK: 50, htrWK: 50 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "B2_ground_contact_building",
    group: "B_envelope_heat_transfer",
    description: "Ground boundary correction contributes Hg.",
    buildingType: "detached_house",
    constructionCharacteristics: "ground-contact floor with explicit source-backed factor",
    pathsExercised: ["Hg", "ground_boundary_factor"],
    explicitInputs: { areaM2: 40, uValue: 0.5, boundaryFactor: 0.6 },
    expectedFinalValues: { hgWK: 12 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "B3_unheated_attic",
    group: "B_envelope_heat_transfer",
    description: "Unheated attic correction contributes Hu.",
    buildingType: "detached_house",
    constructionCharacteristics: "ceiling to unheated attic",
    pathsExercised: ["Hu", "bztu_factor"],
    relationsCovered: ["MC001_2_22_BZTU_CORRECTION_FACTOR"],
    explicitInputs: { areaM2: 30, uValue: 0.5, bztu: 0.2 },
    expectedFinalValues: { huWK: 3 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "B4_adjacent_unheated_space",
    group: "B_envelope_heat_transfer",
    description: "Adjacent boundary contributes Ha with explicit correction.",
    buildingType: "apartment",
    constructionCharacteristics: "adjacent unconditioned boundary",
    pathsExercised: ["Ha", "adjacent_boundary_factor"],
    explicitInputs: { areaM2: 30, uValue: 0.5, boundaryFactor: 0.2 },
    expectedFinalValues: { haWK: 3 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "B5_mixed_boundaries",
    group: "B_envelope_heat_transfer",
    description: "Hd, Hg, Hu, Ha, linear bridge, point bridge and Htr aggregate.",
    buildingType: "detached_house",
    constructionCharacteristics: "mixed envelope boundaries",
    pathsExercised: ["Hd", "Hg", "Hu", "Ha", "thermal_bridges", "Htr"],
    explicitInputs: { hdWK: 33.8, hgWK: 12, huWK: 3.5, haWK: 0 },
    expectedIntermediateValues: { linearBridgeWK: 0.8, pointBridgeWK: 0.5 },
    expectedFinalValues: { htrWK: 49.3 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "C1_no_bridge_baseline",
    group: "C_thermal_bridges",
    description: "No-bridge Htr baseline remains lower than bridged equivalent.",
    buildingType: "detached_house",
    constructionCharacteristics: "bridge-free baseline",
    pathsExercised: ["thermal_bridge_absent"],
    expectedFinalValues: { bridgeContributionWK: 0 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "C2_linear_bridge",
    group: "C_thermal_bridges",
    description: "Linear psi times length contribution.",
    buildingType: "detached_house",
    constructionCharacteristics: "corner bridge",
    pathsExercised: ["linear_thermal_bridge"],
    relationsCovered: ["MC001_2_11_LINEAR_THERMAL_BRIDGE_TERM"],
    explicitInputs: { psiWmK: 0.04, lengthM: 20 },
    expectedFinalValues: { contributionWK: 0.8 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "C3_point_bridge",
    group: "C_thermal_bridges",
    description: "Point chi contribution is added once.",
    buildingType: "detached_house",
    constructionCharacteristics: "point bridge",
    pathsExercised: ["point_thermal_bridge"],
    relationsCovered: ["MC001_2_11_POINT_THERMAL_BRIDGE_TERM"],
    explicitInputs: { chiWK: 0.5 },
    expectedFinalValues: { contributionWK: 0.5 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "D1_natural_ventilation_baseline",
    group: "D_ventilation_and_transfer",
    description: "Air heat capacity and airflow produce Hve and monthly Qve.",
    buildingType: "detached_house",
    constructionCharacteristics: "natural ventilation explicit airflow",
    pathsExercised: ["Hve", "monthly_ventilation_transfer"],
    relationsCovered: ["MC001_2_30_VENTILATION_HEAT_TRANSFER_COEFFICIENT", "MC001_2_29_VENTILATION_ENERGY_EXPLICIT"],
    explicitInputs: { airHeatCapacity: 1200, airflowM3s: 0.05, deltaT: 20, durationH: 720 },
    expectedIntermediateValues: { hveWK: 60 },
    expectedFinalValues: { qveKwh: 864 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "D2_c5_direct_versus_derived",
    group: "D_ventilation_and_transfer",
    description: "Monthly transmission plus ventilation equals explicit C5 total transfer.",
    buildingType: "detached_house",
    constructionCharacteristics: "heating transfer total",
    pathsExercised: ["monthly_transmission", "monthly_ventilation", "C5_total_transfer"],
    expectedIntermediateValues: { qtrKwh: 1077.12, qveKwh: 864 },
    expectedFinalValues: { qTotalTransferKwh: 1941.12 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "E1_internal_gains_only",
    group: "E_gains",
    description: "Internal gains with zero solar keep qHgn equal to internal gains.",
    buildingType: "apartment",
    constructionCharacteristics: "internal gains only",
    pathsExercised: ["monthly_heat_gains"],
    relationsCovered: ["MC001_2_7_2_TOTAL_HEAT_GAINS_AND_INTERNAL_GAINS"],
    explicitInputs: { internalGainsKwh: 120, solarGainsKwh: 0 },
    expectedFinalValues: { qHgnKwh: 120 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "E2_transparent_solar_gains",
    group: "E_gains",
    description: "Transparent element solar gains with explicit transmittance and shading.",
    buildingType: "detached_house",
    constructionCharacteristics: "glazed south facade fixture",
    pathsExercised: ["transparent_solar_gains"],
    relationsCovered: ["MC001_RELATION_2_39_TRANSPARENT_SOLAR_GAINS"],
    explicitInputs: { ggl: 0.7, area: 10, frameFraction: 0.25, shading: 0.8, irradiation: 100, qSky: 5 },
    expectedFinalValues: { transparentSolarGainsKwh: 415 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "E3_opaque_solar_gains",
    group: "E_gains",
    description: "Opaque solar relation 2.50 with sky correction.",
    buildingType: "detached_house",
    constructionCharacteristics: "solar-exposed opaque wall",
    pathsExercised: ["opaque_solar_gains", "sky_radiation_explicit"],
    relationsCovered: ["MC001_RELATION_2_50_OPAQUE_SOLAR_GAINS", "MC001_RELATION_2_54_SKY_RADIATION_EXPLICIT"],
    explicitInputs: { absorptance: 0.6, rse: 0.04, uValue: 0.5, area: 20, shading: 0.8, irradiation: 100, qSky: 2 },
    expectedFinalValues: { opaqueSolarGainsKwh: 17.2 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "E4_adjacent_unconditioned_zone_gains",
    group: "E_gains",
    description: "Adjacent unconditioned zone gains flow through bztu and distribution factors.",
    buildingType: "apartment",
    constructionCharacteristics: "adjacent unconditioned gain source",
    pathsExercised: ["adjacent_unconditioned_gains", "monthly_heat_gains"],
    relationsCovered: ["MC001_RELATION_2_34_2_37_ADJACENT_UNCONDITIONED_ZONE_GAINS", "MC001_RELATION_2_53_INTERNAL_UNCONDITIONED_ZONE_GAIN_REDUCTION"],
    explicitInputs: { directInternal: 100, directSolar: 50, adjacentInternal: 60, adjacentSolar: 40, bztu: 0.4, distributionFactor: 1, gainReductionFactor: 0.5 },
    expectedIntermediateValues: { adjacentInternalContribution: 18, adjacentSolarContribution: 12 },
    expectedFinalValues: { qHgnKwh: 180 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "F1_normal_heating_month",
    group: "F_heating_useful_demand",
    description: "C6/C7 normal heating month with fixed eta.",
    buildingType: "detached_house",
    constructionCharacteristics: "restricted heating useful demand",
    pathsExercised: ["QHht", "QHgn", "etaHgn", "QHnd"],
    relationsCovered: ["MC001_2_18_HEATING_MONTHLY_USEFUL_DEMAND_RESTRICTED_BRANCH"],
    explicitInputs: { qHht: 1026.72, qHgn: 300, etaHgn: 0.8 },
    expectedFinalValues: { qHndKwh: 786.72 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "F2_heating_gamma_boundary",
    group: "F_heating_useful_demand",
    description: "GammaH greater than two resolves to zero heating demand branch.",
    buildingType: "detached_house",
    constructionCharacteristics: "gain-dominant boundary",
    pathsExercised: ["gammaH_boundary"],
    branchesCovered: ["gammaH_greater_than_two_zero_demand"],
    explicitInputs: { qHht: 100, qHgn: 300 },
    expectedFinalValues: { qHndKwh: 0 },
    oracleSource: "independent_branch_rule"
  }),
  scenario({
    scenarioId: "F3_heating_intermittency",
    group: "F_heating_useful_demand",
    description: "Relations 2.59-2.73 produce corrected QHht.",
    buildingType: "detached_house",
    constructionCharacteristics: "intermittent heating explicit periods",
    pathsExercised: ["heating_intermittency", "QHht_source"],
    relationsCovered: ["MC001_R11_RELATIONS_2_59_TO_2_73"],
    branchesCovered: ["relation_2_72_low_setpoint_not_reached_within_period"],
    explicitInputs: { qHgn: 300, htr: 50, hve: 10, tauH: 100 },
    expectedIntermediateValues: { aHred: 0.9527547486509651, thetaIntCalcH: 19.0550949730193 },
    expectedFinalValues: { qHhtKwh: 823.1801028344338 },
    oracleSource: "independent_prepared_numeric_fixture"
  }),
  scenario({
    scenarioId: "F4_heating_long_unoccupied",
    group: "F_heating_useful_demand",
    description: "Relation 2.76 interpolates occupied and unoccupied QHnd.",
    buildingType: "detached_house",
    constructionCharacteristics: "long unoccupied heating month",
    pathsExercised: ["long_unoccupied_heating"],
    relationsCovered: ["MC001_2_76_LONG_UNOCCUPIED_HEATING_INTERPOLATION"],
    explicitInputs: { qHndOcc: 1000, qHndNocc: 400, fHnocc: 0.25 },
    expectedFinalValues: { qHndKwh: 850 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "F5_twelve_month_heating_aggregation",
    group: "F_heating_useful_demand",
    description: "Annual QHnd equals fixed sum of explicit monthly values.",
    buildingType: "detached_house",
    constructionCharacteristics: "12 explicit monthly cases",
    pathsExercised: ["annualQHnd", "month_count"],
    expectedFinalValues: { annualQHndKwh: 10286.496332703064 },
    oracleSource: "existing_independent_platform_oracle_constant"
  }),
  scenario({
    scenarioId: "G1_normal_cooling_month",
    group: "G_cooling_useful_demand",
    description: "Normal cooling month with aC-derived utilization.",
    buildingType: "cooling_dominant_glazed_building",
    constructionCharacteristics: "cooling useful demand",
    pathsExercised: ["QCht", "QCgn", "etaCht", "QCnd"],
    relationsCovered: ["MC001_FIGURE_2_19_COOLING_MONTHLY_USEFUL_DEMAND", "MC001_FIGURE_2_15_COOLING_HEAT_TRANSFER_UTILIZATION_FACTOR"],
    explicitInputs: { qCht: 300, qCgn: 600, aC: 2, aCred: 1 },
    expectedFinalValues: { qCndKwh: 342.8571428571429 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "G2_cooling_intermittency",
    group: "G_cooling_useful_demand",
    description: "Relations 2.74 and 2.75 produce weekend reduction factor.",
    buildingType: "apartment",
    constructionCharacteristics: "weekend cooling reduction",
    pathsExercised: ["cooling_intermittency"],
    relationsCovered: ["MC001_R14_RELATION_2_74_COOLING_INTERMITTENCY_REDUCTION_FACTOR", "MC001_R14_RELATION_2_75_COOLING_INTERMITTENCY_WEEK_FRACTION"],
    branchesCovered: ["weekend_reduction_relation_2_74"],
    explicitInputs: { weekendReductionDurationHours: 72, repetitionCount: 1, bCredWknd: 0.5 },
    expectedIntermediateValues: { fCredWknd: 0.42857142857142855 },
    expectedFinalValues: { aCred: 0.7857142857142857 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "G3_cooling_long_unoccupied",
    group: "G_cooling_useful_demand",
    description: "Relation 2.77 interpolates occupied and unoccupied QCnd.",
    buildingType: "apartment",
    constructionCharacteristics: "long unoccupied cooling month",
    pathsExercised: ["long_unoccupied_cooling"],
    relationsCovered: ["MC001_2_77_LONG_UNOCCUPIED_COOLING_INTERPOLATION"],
    branchesCovered: ["long_unoccupied_period_explicit_interpolation"],
    explicitInputs: { qCndOcc: 1200, qCndNocc: 600, fCnocc: 0.2 },
    expectedFinalValues: { qCndKwh: 1080 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "G4_cooling_dominant_building",
    group: "G_cooling_useful_demand",
    description: "Synthetic seasonal warm/high-gain profile drives cooling in warm months.",
    buildingType: "cooling_dominant_glazed_building",
    constructionCharacteristics: "validation-only seasonal profile",
    pathsExercised: ["seasonal_QCnd"],
    expectedFinalValues: { warmMonthCoolingDominant: true },
    oracleSource: "synthetic_validation_profile_not_official_climate"
  }),
  scenario({
    scenarioId: "G5_twelve_month_cooling_aggregation",
    group: "G_cooling_useful_demand",
    description: "Annual QCnd equals fixed sum of explicit monthly values.",
    buildingType: "detached_house",
    constructionCharacteristics: "12 explicit monthly cases",
    pathsExercised: ["annualQCnd", "month_count"],
    expectedFinalValues: { annualQCndKwh: 2786.7333161081524 },
    oracleSource: "existing_independent_platform_oracle_constant"
  }),
  scenario({
    scenarioId: "H1_humidification",
    group: "H_latent_demand",
    description: "Relation 2.82 monthly humidification latent demand remains separate.",
    buildingType: "non_residential_validation_case",
    constructionCharacteristics: "explicit latent inputs",
    pathsExercised: ["humidification"],
    relationsCovered: ["MC001_2_82_MONTHLY_HUMIDIFICATION_LATENT_DEMAND"],
    explicitInputs: { fraction: 0.1, latentHeat: 2500000, recovery: 0.2, airDensity: 1.2, airflow: 0.05, moisture: 2 },
    expectedFinalValues: { qHUndKwh: 24 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "H2_dehumidification",
    group: "H_latent_demand",
    description: "Relation 2.83 monthly dehumidification latent demand remains separate.",
    buildingType: "cooling_dominant_validation_case",
    constructionCharacteristics: "explicit dehumidification fraction",
    pathsExercised: ["dehumidification"],
    relationsCovered: ["MC001_2_83_MONTHLY_DEHUMIDIFICATION_LATENT_DEMAND"],
    explicitInputs: { sensibleCoolingDemandKwh: 600, dehumidificationFraction: 0.25 },
    expectedFinalValues: { qDHUndKwh: 150 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "H3_annual_latent_sum",
    group: "H_latent_demand",
    description: "Relation 2.86 annual latent sums preserve humidification and dehumidification separately.",
    buildingType: "non_residential_validation_case",
    constructionCharacteristics: "annual latent aggregation",
    pathsExercised: ["annual_latent_sum"],
    relationsCovered: ["MC001_2_86_ANNUAL_LATENT_DEMAND_SUM"],
    expectedFinalValues: { annualHumidificationDemandKwh: 24, annualDehumidificationDemandKwh: 150 },
    oracleSource: "independent_hand_arithmetic"
  }),
  scenario({
    scenarioId: "I1_assisted_mode",
    group: "I_building_dna_platform_paths",
    description: "Assisted answers resolve into Building DNA and Chapter 2 results.",
    buildingType: "detached_house",
    constructionCharacteristics: "1985 masonry EPS PVC",
    pathsExercised: ["assisted_answers", "building_dna", "physics_adapter"],
    expectedFinalValues: { annualQHndKwh: 10286.496332703064, annualQCndKwh: 2786.7333161081524 },
    expectedProvenance: ["confirmed_by_user", "proposed_by_typology"],
    oracleSource: "existing_independent_platform_oracle_constant"
  }),
  scenario({
    scenarioId: "I2_advanced_mode",
    group: "I_building_dna_platform_paths",
    description: "Advanced mode builds equivalent normalized Building DNA.",
    buildingType: "detached_house",
    constructionCharacteristics: "same engineering model as assisted mode",
    pathsExercised: ["advanced_model", "building_dna", "physics_adapter"],
    expectedFinalValues: { annualQHndKwh: 10286.496332703064, annualQCndKwh: 2786.7333161081524 },
    oracleSource: "existing_independent_platform_oracle_constant"
  }),
  scenario({
    scenarioId: "I3_renovation_intervention",
    group: "I_building_dna_platform_paths",
    description: "EPS intervention preserves original model and reduces U/Htr/QHnd.",
    buildingType: "detached_house",
    constructionCharacteristics: "wall insulation intervention",
    pathsExercised: ["building_dna_override", "renovation_intervention", "downstream_recalculation"],
    expectedFinalValues: { downstreamDemandDoesNotIncrease: true },
    oracleSource: "physical_monotonicity"
  }),
  scenario({
    scenarioId: "I4_report_to_engine_consistency",
    group: "I_building_dna_platform_paths",
    description: "Technical report values match physics output paths exactly.",
    buildingType: "detached_house",
    constructionCharacteristics: "technical workspace report",
    pathsExercised: ["technical_report", "formula_viewer", "traceability"],
    expectedFinalValues: { displayedValuesMatchEngine: true },
    oracleSource: "report_path_consistency"
  })
]);

export const P2V_INDEPENDENT_REFERENCE_BUILDINGS = Object.freeze([
  {
    buildingId: "p2v_ref_insulated_masonry_detached",
    type: "insulated masonry detached house",
    fixedExpectedValues: Object.freeze({
      wallUValue: 0.3169133257438233,
      htrWK: 64.25708961581125,
      annualQHndKwh: 10286.496332703064,
      annualQCndKwh: 2786.7333161081524
    }),
    sourceNotes: "Hard-coded P1/P2 Building DNA end-to-end oracle constants."
  },
  {
    buildingId: "p2v_ref_uninsulated_masonry_wall",
    type: "uninsulated masonry construction fragment",
    fixedExpectedValues: Object.freeze({
      correctedLambdaWmK: 0.618,
      correctedLayerResistance: 0.4854368932038835,
      correctedWallUValue: 1.5256998963116575
    }),
    sourceNotes: "Independent Table 2.2 lambda correction arithmetic."
  },
  {
    buildingId: "p2v_ref_timber_roof",
    type: "timber and mineral wool roof fragment",
    fixedExpectedValues: Object.freeze({
      totalResistance: 5.293846153846154,
      uValue: 0.18889857599535018
    }),
    sourceNotes: "Independent layer resistance arithmetic."
  },
  {
    buildingId: "p2v_ref_adjacent_unheated_apartment",
    type: "apartment adjacent unconditioned zone fragment",
    fixedExpectedValues: Object.freeze({
      adjacentInternalGainContribution: 18,
      adjacentSolarGainContribution: 12,
      qHgnKwh: 180
    }),
    sourceNotes: "Independent gain distribution arithmetic."
  },
  {
    buildingId: "p2v_ref_cooling_dominant_glazed",
    type: "cooling-dominant explicit cooling month",
    fixedExpectedValues: Object.freeze({
      etaCht: 0.8571428571428571,
      qCndKwh: 342.8571428571429
    }),
    sourceNotes: "Independent cooling utilization arithmetic."
  }
]);

export function summarizeP2VValidationMatrix(
  scenarios = P2V_VALIDATION_SCENARIOS
) {
  const byGroup = new Map();
  const relations = new Set();
  const tables = new Set();
  const branches = new Set();
  for (const entry of scenarios) {
    byGroup.set(entry.group, (byGroup.get(entry.group) ?? 0) + 1);
    for (const relation of entry.relationsCovered) relations.add(relation);
    for (const table of entry.tablesCovered) tables.add(table);
    for (const branch of entry.branchesCovered) branches.add(branch);
  }
  return {
    status: P2V_VALIDATION_STATUS,
    scenarioCount: scenarios.length,
    groupCount: byGroup.size,
    groups: Object.fromEntries(byGroup.entries()),
    relationCount: relations.size,
    tableCount: tables.size,
    branchCount: branches.size,
    independentReferenceBuildingCount: P2V_INDEPENDENT_REFERENCE_BUILDINGS.length,
    fixedOracleScenarioCount: scenarios.filter(
      entry => !String(entry.oracleSource).includes("runtime")
    ).length
  };
}
