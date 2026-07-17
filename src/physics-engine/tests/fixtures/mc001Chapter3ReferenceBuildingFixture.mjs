const MONTHS = Object.freeze([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
]);

const QHND = Object.freeze([500, 420, 300, 160, 40, 0, 0, 0, 60, 180, 360, 520]);
const QCND = Object.freeze([0, 0, 0, 5, 25, 60, 80, 70, 30, 10, 0, 0]);
const LIGHTING = Object.freeze([20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]);

const HEATING_STAGES = Object.freeze([
  Object.freeze({
    stageId: "emission",
    lossKWh: 5,
    auxiliaryKWh: 1,
    auxiliaryRecoveredFraction: 0.2,
    lossRecoveredFraction: 0.1,
    auxiliaryRecoverableFractionToHeating: 0.2,
    lossRecoverableFractionToHeating: 0.6
  }),
  Object.freeze({
    stageId: "distribution",
    lossKWh: 4,
    auxiliaryKWh: 0.8,
    auxiliaryRecoveredFraction: 0.25,
    lossRecoveredFraction: 0.05,
    auxiliaryRecoverableFractionToHeating: 0.1,
    lossRecoverableFractionToHeating: 0.4
  }),
  Object.freeze({
    stageId: "storage",
    lossKWh: 2,
    auxiliaryKWh: 0.2,
    auxiliaryRecoveredFraction: 0.1,
    lossRecoveredFraction: 0.1,
    auxiliaryRecoverableFractionToHeating: 0.1,
    lossRecoverableFractionToHeating: 0.3
  }),
  Object.freeze({
    stageId: "generation",
    lossKWh: 6,
    auxiliaryKWh: 1.5,
    auxiliaryRecoveredFraction: 0.3,
    lossRecoveredFraction: 0.2,
    auxiliaryRecoverableFractionToHeating: 0.2,
    lossRecoverableFractionToHeating: 0.5
  })
]);

const COOLING_STAGES = Object.freeze([
  Object.freeze({
    stageId: "emission",
    lossKWh: 1,
    auxiliaryKWh: 0.2,
    auxiliaryRecoveredFraction: 0.1,
    lossRecoveredFraction: 0.05,
    auxiliaryRecoverableFractionToHeating: 0,
    lossRecoverableFractionToHeating: 0
  }),
  Object.freeze({
    stageId: "distribution",
    lossKWh: 2,
    auxiliaryKWh: 0.4,
    auxiliaryRecoveredFraction: 0.1,
    lossRecoveredFraction: 0.05,
    auxiliaryRecoverableFractionToHeating: 0,
    lossRecoverableFractionToHeating: 0
  }),
  Object.freeze({
    stageId: "storage",
    lossKWh: 0.5,
    auxiliaryKWh: 0.1,
    auxiliaryRecoveredFraction: 0.1,
    lossRecoveredFraction: 0.1,
    auxiliaryRecoverableFractionToHeating: 0,
    lossRecoverableFractionToHeating: 0
  }),
  Object.freeze({
    stageId: "generation",
    lossKWh: 3,
    auxiliaryKWh: 0.7,
    auxiliaryRecoveredFraction: 0.2,
    lossRecoveredFraction: 0.1,
    auxiliaryRecoverableFractionToHeating: 0,
    lossRecoverableFractionToHeating: 0
  })
]);

const DHW_STAGES = Object.freeze([
  Object.freeze({
    stageId: "distribution",
    lossKWh: 3,
    auxiliaryKWh: 0.4,
    auxiliaryRecoveredFraction: 0.1,
    lossRecoveredFraction: 0.2,
    auxiliaryRecoverableFractionToHeating: 0.1,
    lossRecoverableFractionToHeating: 0.2
  }),
  Object.freeze({
    stageId: "storage",
    lossKWh: 2,
    auxiliaryKWh: 0.1,
    auxiliaryRecoveredFraction: 0,
    lossRecoveredFraction: 0.1,
    auxiliaryRecoverableFractionToHeating: 0.1,
    lossRecoverableFractionToHeating: 0.2
  }),
  Object.freeze({
    stageId: "generation",
    lossKWh: 5,
    auxiliaryKWh: 0.6,
    auxiliaryRecoveredFraction: 0.2,
    lossRecoveredFraction: 0.1,
    auxiliaryRecoverableFractionToHeating: 0.1,
    lossRecoverableFractionToHeating: 0.3
  })
]);

function cloneStages(stages) {
  return stages.map(stage => ({ ...stage }));
}

export const mc001Chapter3ReferenceBuildingFixture = Object.freeze({
  fixtureId: "MC001_CHAPTER_3_REFERENCE_12_MONTH_EXPLICIT_SYSTEMS_V1",
  description:
    "Complete deterministic 12-month Chapter 3 reference fixture over explicit Chapter 2 useful demand, system losses, recoveries, ventilation auxiliary energy, DHW and lighting explicit boundary.",
  derivation:
    "Expected monthly heating input equals QHnd + 14.03 kWh after four explicit stage balances; cooling input equals QCnd + 5.79 kWh; DHW input equals 100 + 8.54 kWh; ventilation auxiliary is 10.59904214559387 kWh/month from the fan equation plus explicit auxiliary terms; lighting is 20 kWh/month.",
  derivationLedger: Object.freeze({
    ledgerId: "MC001_CHAPTER_3_REFERENCE_12_MONTH_LEDGER_V1",
    expectedValuesPolicy: "hard_coded_constants_not_generated_by_runtime",
    chapter2UsefulInputsKWh: Object.freeze({
      qHnd: QHND,
      qCnd: QCND
    }),
    stageOrder: Object.freeze({
      heating: Object.freeze(["emission", "distribution", "storage", "generation"]),
      cooling: Object.freeze(["emission", "distribution", "storage", "generation"]),
      dhw: Object.freeze(["distribution", "storage", "generation"])
    }),
    monthlyStageDeltasKWh: Object.freeze({
      heating: Object.freeze({
        emission: 4.3,
        distribution: 3.6,
        storage: 1.78,
        generation: 4.35,
        total: 14.03
      }),
      cooling: Object.freeze({
        emission: 0.93,
        distribution: 1.86,
        storage: 0.44,
        generation: 2.56,
        total: 5.79
      }),
      dhw: Object.freeze({
        distribution: 2.36,
        storage: 1.8,
        generation: 4.38,
        total: 8.54
      })
    }),
    auxiliarySeparationKWh: Object.freeze({
      ventilationMonthlyAuxiliary: 10.59904214559387,
      lightingMonthlyExplicitBoundary: 20,
      heatingMonthlyAuxiliary: 3.5,
      coolingMonthlyAuxiliary: 1.4,
      note: "Auxiliary electricity is reported separately from useful thermal demand and from lighting energy."
    }),
    annualIdentitiesKWh: Object.freeze({
      heatingInput: "sum(QHnd_month + 14.03)",
      coolingInput: "sum(QCnd_month + 5.79)",
      dhwInput: "12 * (100 + 8.54)",
      ventilationAuxiliary: "12 * 10.59904214559387",
      lighting: "12 * 20"
    }),
    explicitInputBoundaries: Object.freeze([
      "Chapter 2 useful monthly QHnd/QCnd inputs",
      "stage losses",
      "stage auxiliary energy",
      "stage recovered/recoverable fractions",
      "DHW useful monthly demand",
      "ventilation fan and auxiliary inputs",
      "SR EN 15193-1 lighting monthly explicit boundary"
    ])
  }),
  input: Object.freeze({
    months: Object.freeze(MONTHS.map((month, index) =>
      Object.freeze({
        month,
        chapter2Useful: Object.freeze({
          qHndKWh: QHND[index],
          qCndKWh: QCND[index]
        }),
        heatingStages: Object.freeze(cloneStages(HEATING_STAGES)),
        coolingStages: Object.freeze(cloneStages(COOLING_STAGES)),
        dhw: Object.freeze({
          usefulDemandKWh: 100,
          stages: Object.freeze(cloneStages(DHW_STAGES))
        }),
        ventilation: Object.freeze({
          fanElectricEnergyInput: Object.freeze({
            supplyAirFlowM3PerH: 3000,
            supplyPressureDropPa: 400,
            supplyFanEfficiency: 0.6,
            extractAirFlowM3PerH: 2800,
            extractPressureDropPa: 350,
            extractFanEfficiency: 0.58,
            calculationHours: 10
          }),
          heatRecoveryAuxiliaryKWh: 0.2,
          preheatAuxiliaryKWh: 0.1,
          controlAuxiliaryKWh: 0.05
        })
      })
    )),
    lighting: Object.freeze({
      totalAreaM2: 120,
      leniSubspaces: Object.freeze([
        Object.freeze({ leniKWhPerM2Year: 20, areaM2: 120 })
      ]),
      monthlyEnergyKWh: LIGHTING
    })
  }),
  expected: Object.freeze({
    monthlyHeatingInputKWh: Object.freeze([
      514.03,
      434.03,
      314.03,
      174.03,
      54.03,
      14.03,
      14.03,
      14.03,
      74.03,
      194.03,
      374.03,
      534.03
    ]),
    monthlyCoolingInputKWh: Object.freeze([
      5.79,
      5.79,
      5.79,
      10.79,
      30.79,
      65.79,
      85.79,
      75.79,
      35.79,
      15.79,
      5.79,
      5.79
    ]),
    monthlyDhwInputKWh: Object.freeze([
      108.54,
      108.54,
      108.54,
      108.54,
      108.54,
      108.54,
      108.54,
      108.54,
      108.54,
      108.54,
      108.54,
      108.54
    ]),
    monthlyVentilationAuxiliaryKWh: Object.freeze([
      10.59904214559387,
      10.59904214559387,
      10.59904214559387,
      10.59904214559387,
      10.59904214559387,
      10.59904214559387,
      10.59904214559387,
      10.59904214559387,
      10.59904214559387,
      10.59904214559387,
      10.59904214559387,
      10.59904214559387
    ]),
    annual: Object.freeze({
      heatingInputKWh: 2708.36,
      coolingInputKWh: 349.48,
      dhwInputKWh: 1302.48,
      ventilationAuxiliaryKWh: 127.18850574712644,
      lightingEnergyKWh: 240,
      heatingAuxiliaryKWh: 42,
      coolingAuxiliaryKWh: 16.8
    })
  })
});
