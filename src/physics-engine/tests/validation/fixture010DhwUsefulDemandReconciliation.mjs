export const fixture010DhwUsefulDemandReconciliation = Object.freeze({
  fixtureId: "FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION",
  exampleId: "MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS",
  description:
    "MC001 Anexa B school useful DHW demand reconciliation from service units to monthly and annual QW,nd",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section:
      "MC001-2022 section 3.3.6, Tabel 3.3.1, relation (3.197), and Anexa B pages 524-525",
    pages: Object.freeze([252, 253, 254, 255, 257, 524, 525]),
    formulaReferences: Object.freeze([
      "MC001 relation (3.188) useful DHW energy",
      "MC001 relation (3.190) non-residential daily DHW volume",
      "MC001 Tabel 3.3.1 row 13 schools without showers or baths",
      "MC001 relation (3.197) loss and waste volume penalty"
    ])
  }),
  tolerances: Object.freeze({
    exactAbs: 1e-12,
    monthlyEnergySourceRoundedAbsKWh: 3,
    annualEnergySourceRoundedAbsKWh: 20
  }),
  inputs: Object.freeze({
    tableEntryId: "scoli_elev_program_fara_dusuri_bai",
    serviceUnits: 300,
    penaltyFactor1: 1.3,
    penaltyFactor2: 1.1,
    thetaWDrawC: 60,
    thetaWColdC: 10,
    waterDensityKgPerM3: 1000,
    waterHeatCapacityProductKWhPerM3K: 1.15,
    sourceImpliedWaterHeatCapacityProductKWhPerM3K: 1.151150271950272,
    monthlyDays: Object.freeze([
      Object.freeze({ month: "Ian", days: 15, expectedQWndKWh: 1852 }),
      Object.freeze({ month: "Feb", days: 15, expectedQWndKWh: 1852 }),
      Object.freeze({ month: "Mar", days: 20, expectedQWndKWh: 2469 }),
      Object.freeze({ month: "Apr", days: 10, expectedQWndKWh: 1235 }),
      Object.freeze({ month: "Mai", days: 15, expectedQWndKWh: 1852 }),
      Object.freeze({ month: "Iun", days: 10, expectedQWndKWh: 1235 }),
      Object.freeze({ month: "Iul", days: 0, expectedQWndKWh: 0 }),
      Object.freeze({ month: "Aug", days: 0, expectedQWndKWh: 0 }),
      Object.freeze({ month: "Sep", days: 10, expectedQWndKWh: 1235 }),
      Object.freeze({ month: "Oct", days: 20, expectedQWndKWh: 2469 }),
      Object.freeze({ month: "Noi", days: 20, expectedQWndKWh: 2469 }),
      Object.freeze({ month: "Dec", days: 15, expectedQWndKWh: 1852 })
    ])
  }),
  expected: Object.freeze({
    tableSpecificDemandLPerUnitDayAt60C: 5,
    baseDailyVolumeLiters: 1500,
    lossWasteDailyVolumeLiters: 645,
    totalDailyVolumeLiters: 2145,
    annualQWndKWh: 18519.13,
    sourceDisplayedMonthlyQWndKWh: Object.freeze([
      1852,
      1852,
      2469,
      1235,
      1852,
      1235,
      0,
      0,
      1235,
      2469,
      2469,
      1852
    ]),
    annualCalculationDays: 150
  }),
  blockedRows: Object.freeze([
    Object.freeze({
      rowKey: "dhw_distribution_losses",
      source: "Anexa B page 525 distribution-loss rows.",
      reason:
        "Distribution-loss annual basis remains blocked by INVESTIGATION_004_DHW_ANNUAL_DISTRIBUTION_LOSS_BASIS."
    }),
    Object.freeze({
      rowKey: "dhw_storage_generation_auxiliary_final_energy",
      source: "Anexa B page 525 final DHW total row.",
      reason:
        "Storage, generation, auxiliary and full final-energy inputs are outside this useful-demand fixture."
    }),
    Object.freeze({
      rowKey: "page_579_average_person_count",
      source:
        "Anexa B page 579 states a later average-person note of 102 people.",
      reason:
        "Page 524-525 explicitly uses f = 300 for this useful-demand calculation; page 579 is not mixed into Fixture 010."
    })
  ])
});
