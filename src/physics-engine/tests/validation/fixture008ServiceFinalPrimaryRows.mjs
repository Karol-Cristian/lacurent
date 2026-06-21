export const fixture008ServiceFinalPrimaryRows = Object.freeze({
  fixtureId: "FIXTURE_008_SERVICE_FINAL_PRIMARY_ROWS",
  exampleId: "MC001_EX_B_FINAL_PRIMARY_CO2_CPE",
  description:
    "MC001 Anexa B explicit service final-energy rows converted to primary energy with Tabel 5.17",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section: "MC001-2022 section 5.4.2.6 and Anexa B sections 2.8/3.4",
    pages: Object.freeze([411, 523, 525, 526, 527, 533]),
    tables: Object.freeze([
      "MC001-2022 Tabel 5.17 primary energy factors",
      "Anexa B page 523 heating primary-energy row",
      "Anexa B page 525 DHW final-energy row",
      "Anexa B page 526 lighting final-energy row",
      "Anexa B page 527 primary-energy summary",
      "Anexa B page 533 service final/primary specific indicators"
    ]),
    formulaReferences: Object.freeze([
      "MC001 section 5.4.2.6 relation 5.3 final energy by carrier/service",
      "MC001 section 5.4.2.6 relation 5.4a primary energy",
      "MC001 sections 5.4.2.2-5.4.2.3 specific indicators per reference area"
    ])
  }),
  notes: Object.freeze({
    fixtureType:
      "Service-row validation case using explicit Anexa B final energy rows and reviewed Tabel 5.17 factors.",
    referenceArea:
      "Reference area is the page 533 value 1369.4 m2.",
    excludedCo2Rows:
      "No page 527/page 540 CO2 display values are asserted in this fixture.",
    heatingProse:
      "Page 523 prose value 100.06 MWh/an is blocked by INVESTIGATION_003 and is not used as an expected output."
  }),
  referenceAreaM2: 1369.4,
  finalEnergyEntries: Object.freeze([
    Object.freeze({
      serviceKey: "heating",
      energyCarrierKey: "termoficare_cogenerare_distanta",
      finalEnergyKWh: 120507.2,
      source:
        "Page 533 heating row: final/primary specific value 88/81 kWh/m2.an; final annual input = 88.0 * 1369.4."
    }),
    Object.freeze({
      serviceKey: "dhw",
      energyCarrierKey: "termoficare_cogenerare_distanta",
      finalEnergyKWh: 38118,
      source: "Page 525 DHW row: Qw,total = 38118 kWh."
    }),
    Object.freeze({
      serviceKey: "ventilation",
      energyCarrierKey: "electricitate_sen_consumata",
      finalEnergyKWh: 21225.7,
      source:
        "Page 533 ventilation row: final/primary specific value 15.5/39.0 kWh/m2.an; final annual input = 15.5 * 1369.4."
    }),
    Object.freeze({
      serviceKey: "lighting",
      energyCarrierKey: "electricitate_sen_consumata",
      finalEnergyKWh: 13444.6,
      source: "Page 526 lighting row: total annual electricity for lighting = 13444.60 kWh."
    }),
    Object.freeze({
      serviceKey: "cooling",
      energyCarrierKey: "electricitate_sen_consumata",
      finalEnergyKWh: 0,
      source: "Page 533 cooling row: 0.0 kWh/m2.an."
    })
  ]),
  factors: Object.freeze({
    termoficare_cogenerare_distanta: Object.freeze({
      sourcePrimaryTable: "MC001-2022 Tabel 5.17",
      renewablePrimaryEnergyFactor: 0,
      nonRenewablePrimaryEnergyFactor: 0.92,
      totalPrimaryEnergyFactor: 0.92
    }),
    electricitate_sen_consumata: Object.freeze({
      sourcePrimaryTable: "MC001-2022 Tabel 5.17",
      renewablePrimaryEnergyFactor: 0.5,
      nonRenewablePrimaryEnergyFactor: 2,
      totalPrimaryEnergyFactor: 2.5
    })
  }),
  expected: Object.freeze({
    finalEnergyTotalKWh: 193295.5,
    finalEnergyByCarrierKWh: Object.freeze({
      termoficare_cogenerare_distanta: 158625.2,
      electricitate_sen_consumata: 34670.3
    }),
    finalEnergyByServiceKWh: Object.freeze({
      heating: 120507.2,
      dhw: 38118,
      ventilation: 21225.7,
      lighting: 13444.6,
      cooling: 0
    }),
    primaryEnergy: Object.freeze({
      renewablePrimaryEnergyKWh: 17335.15,
      nonRenewablePrimaryEnergyKWh: 215275.784,
      totalPrimaryEnergyKWh: 232610.934,
      specificRenewablePrimaryEnergyKWhPerM2: 12.658938221118738,
      specificNonRenewablePrimaryEnergyKWhPerM2: 157.2044574266102,
      specificTotalPrimaryEnergyKWhPerM2: 169.86339564772894
    }),
    primaryEnergyByServiceKWh: Object.freeze({
      heating: Object.freeze({
        renewablePrimaryEnergyKWh: 0,
        nonRenewablePrimaryEnergyKWh: 110866.624,
        totalPrimaryEnergyKWh: 110866.624,
        specificTotalPrimaryEnergyKWhPerM2: 80.96
      }),
      dhw: Object.freeze({
        renewablePrimaryEnergyKWh: 0,
        nonRenewablePrimaryEnergyKWh: 35068.56,
        totalPrimaryEnergyKWh: 35068.56,
        specificTotalPrimaryEnergyKWhPerM2: 25.608704542135243
      }),
      ventilation: Object.freeze({
        renewablePrimaryEnergyKWh: 10612.85,
        nonRenewablePrimaryEnergyKWh: 42451.4,
        totalPrimaryEnergyKWh: 53064.25,
        specificTotalPrimaryEnergyKWhPerM2: 38.75
      }),
      lighting: Object.freeze({
        renewablePrimaryEnergyKWh: 6722.3,
        nonRenewablePrimaryEnergyKWh: 26889.2,
        totalPrimaryEnergyKWh: 33611.5,
        specificTotalPrimaryEnergyKWhPerM2: 24.54469110559369
      }),
      cooling: Object.freeze({
        renewablePrimaryEnergyKWh: 0,
        nonRenewablePrimaryEnergyKWh: 0,
        totalPrimaryEnergyKWh: 0,
        specificTotalPrimaryEnergyKWhPerM2: 0
      })
    })
  }),
  sourceDisplayedComparisons: Object.freeze({
    heatingPrimaryPage523: Object.freeze({
      source: "Page 523 heating primary-energy table row.",
      totalPrimaryEnergyKWh: 110901.0,
      status: "assert_with_display_rounding_tolerance"
    }),
    heatingSpecificPage533: Object.freeze({
      source: "Page 533 heating service final/primary specific row 88/81 kWh/m2.an.",
      specificPrimaryEnergyKWhPerM2: 81.0,
      status: "assert_with_display_rounding_tolerance"
    }),
    ventilationSpecificPage533: Object.freeze({
      source:
        "Page 533 ventilation service final/primary specific row 15.5/39.0 kWh/m2.an.",
      specificPrimaryEnergyKWhPerM2: 39.0,
      status: "assert_with_display_rounding_tolerance"
    }),
    totalPrimaryPage527: Object.freeze({
      source: "Page 527 total primary energy display: 232.935 MWh/an and 170.1 kWh/m2.an.",
      totalPrimaryEnergyKWh: 232934.94,
      specificPrimaryEnergyKWhPerM2: 170.1,
      status: "assert_with_display_rounding_tolerance"
    })
  }),
  blockedRows: Object.freeze([
    Object.freeze({
      source: "Page 523 heating annual final-energy prose value 100.06 MWh/an",
      reason:
        "INVESTIGATION_003 classifies this as a worked-example prose typo. It conflicts with page 523/page 527/page 533 primary-energy rows and Tabel 5.17."
    }),
    Object.freeze({
      source: "Page 527/page 540 CO2 display rows",
      reason:
        "Out of Fixture 008 scope and blocked by INVESTIGATION_003 as a worked-example factor inconsistency using 0.086* instead of the normative Tabel 5.18 path."
    }),
    Object.freeze({
      source: "Page 527 RER row",
      reason:
        "RER perimeter rules are outside finalPrimaryCo2Indicators.mjs service-row final-primary validation."
    }),
    Object.freeze({
      source: "Certificate class and certificate output rows",
      reason:
        "Certificate/class validation is outside Fixture 008 and must not be inferred from service final-primary rows."
    })
  ]),
  tolerances: Object.freeze({
    exactAbs: 1e-9,
    sourceHeatingPrimaryPage523AbsKWh: 40,
    sourceServiceSpecificAbsKWhPerM2: 0.3,
    sourceTotalPrimaryPage527AbsKWh: 400,
    sourceTotalPrimarySpecificPage527AbsKWhPerM2: 0.3
  })
});
