export const fixture005VentilationHveSummary = Object.freeze({
  fixtureId: "FIXTURE_005_VENTILATION_HVE_SUMMARY",
  exampleId: "MC001_EX_B_HEATING_MONTHLY_GAINS",
  description: "MC001 Anexa B explicit-airflow ventilation Hve and monthly Qve summary",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section: "MC001-2022 Anexa B, school audit breviar, heating calculation",
    pages: Object.freeze([101, 172, 519, 520, 522]),
    tables: Object.freeze([
      "Relation 2.29 monthly ventilation transfer",
      "Relation 2.30 ventilation heat-transfer coefficient",
      "Relation 2.31 ventilation temperature correction factor",
      "Page 519 natural ventilation statement",
      "Page 520 H loss coefficients and ventilation airflow",
      "Page 522 monthly heating-loss table"
    ])
  }),
  ventilationContext: Object.freeze({
    ventilationType: "natural_exterior_air",
    sourceStatement:
      "School is not mechanically ventilated; classrooms are naturally ventilated by window opening and infiltration from outside.",
    thetaIntHeatingC: 20.0,
    fveDynMonthly: 1,
    fveDynSource:
      "MC001 relation 2.30 text states fve,dyn,k,m = 1 for monthly calculation."
  }),
  airflow: Object.freeze({
    method: "explicit_page_520_airflow",
    usefulAreaM2: 1369.4,
    airflowM3h: 5474.6,
    expectedHveWPerK: 1806.62,
    sourceImpliedVolumetricHeatCapacityWhPerM3K: 0.33,
    sourceImpliedVolumetricHeatCapacityJPerM3K: 1188,
    calculatorFactorization: Object.freeze({
      rhoA: 1,
      ca: 1188,
      note:
        "Neutral factorization of source-implied 1188 J/(m3K) for calculateVentilationHeatTransferCoefficient."
    })
  }),
  page172ConstantsComparison: Object.freeze({
    rhoAKgPerM3: 1.204,
    caKWhPerKgK: 0.00028,
    caJPerKgK: 1008,
    blockedReason:
      "Page 172 AHU constants calculate a different Hve than Anexa B page 520, so they are logged but not used as the page 520 pass criterion."
  }),
  monthlyRows: Object.freeze([
    Object.freeze({
      month: "Jan",
      deltaHours: 744,
      thetaExternalC: -0.47,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: 27508.1
    }),
    Object.freeze({
      month: "Feb",
      deltaHours: 672,
      thetaExternalC: 2.11,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: 21716.3
    }),
    Object.freeze({
      month: "Mar",
      deltaHours: 744,
      thetaExternalC: 7.17,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: 17240.0
    }),
    Object.freeze({
      month: "Apr",
      deltaHours: 720,
      thetaExternalC: 12.85,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: 9298.7
    }),
    Object.freeze({
      month: "Mai",
      deltaHours: 744,
      thetaExternalC: 20.19,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: -253.6
    }),
    Object.freeze({
      month: "Iun",
      deltaHours: 720,
      thetaExternalC: 23.05,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: -3966.7
    }),
    Object.freeze({
      month: "Iul",
      deltaHours: 744,
      thetaExternalC: 25.42,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: -7282.2
    }),
    Object.freeze({
      month: "Aug",
      deltaHours: 744,
      thetaExternalC: 24.68,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: -6293.1
    }),
    Object.freeze({
      month: "Sep",
      deltaHours: 720,
      thetaExternalC: 18.61,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: 1813.5
    }),
    Object.freeze({
      month: "Oct",
      deltaHours: 744,
      thetaExternalC: 12.91,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: 9524.0
    }),
    Object.freeze({
      month: "Noi",
      deltaHours: 720,
      thetaExternalC: 7.62,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: 16106.7
    }),
    Object.freeze({
      month: "Dec",
      deltaHours: 744,
      thetaExternalC: 1.36,
      thetaIntC: 20.0,
      expectedBve: 1,
      expectedQveKWh: 25060.0
    })
  ]),
  blockedCalculators: Object.freeze([
    Object.freeze({
      functionName: "calculateAirflowFromACH",
      reason: "No ACH value and no heated volume are displayed for this MC001 example."
    }),
    Object.freeze({
      functionName: "calculateBveFromUnconditionedZone",
      reason:
        "No bztu value or unconditioned-zone ventilation source is provided for this MC001 example."
    })
  ]),
  blockedRows: Object.freeze([
    Object.freeze({
      source: "Page 520 independent rhoA * ca values",
      reason:
        "Anexa B page 520 displays q and Hve but not the independent rhoA and ca constants used for that Hve."
    }),
    Object.freeze({
      source: "Fan/AHU ventilation electricity",
      reason:
        "Page 519 states the school is not mechanically ventilated; fan/AHU energy is outside this fixture."
    })
  ]),
  tolerances: Object.freeze({
    bveAbs: 1e-12,
    hveAbsWPerK: 0.01,
    page172ConstantsComparisonAbsWPerK: 1e-9,
    monthlyQveAbsKWh: 6.5
  })
});
