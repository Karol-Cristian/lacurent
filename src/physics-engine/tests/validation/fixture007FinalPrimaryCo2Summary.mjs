export const fixture007FinalPrimaryCo2Summary = Object.freeze({
  fixtureId: "FIXTURE_007_FINAL_PRIMARY_CO2_SUMMARY",
  exampleId: "MC001_EX_B_FINAL_PRIMARY_CO2_CPE",
  description:
    "MC001 Anexa B final-energy to primary-energy and CO2 table-derived summary",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section: "MC001-2022 sections 5.4.2.6-5.4.2.7 and Anexa B sections 2.8/3.4",
    pages: Object.freeze([410, 411, 412, 486, 523, 525, 526, 527, 533, 540]),
    tables: Object.freeze([
      "MC001-2022 Tabel 5.17 primary energy factors",
      "MC001-2022 Tabel 5.18 CO2 emission factors",
      "Anexa B page 533 service final/primary specific indicators",
      "Anexa B page 527 primary/CO2 summary"
    ]),
    formulaReferences: Object.freeze([
      "MC001 section 5.4.2.6 relation 5.4a primary energy",
      "MC001 section 5.4.2.7 relation 5.4b CO2 emissions",
      "MC001 sections 5.4.2.2-5.4.2.3 specific indicators per reference area"
    ])
  }),
  notes: Object.freeze({
    fixtureType:
      "Table-derived validation case from explicit Anexa B service indicators and reviewed Tabel 5.17/5.18 factors.",
    referenceArea:
      "Reference area is the page 533 value 1369.4 m2.",
    heatingInput:
      "Heating uses page 533 final specific value 88.0 kWh/m2.an; INVESTIGATION_003 classifies page 523 text value 100.06 MWh/an as a worked-example prose typo.",
    dhwInput:
      "DHW uses page 525 annual final value Qw,total = 38118 kWh.",
    ventilationInput:
      "Ventilation uses page 533 final specific value 15.5 kWh/m2.an for the virtual ventilation service.",
    lightingInput:
      "Lighting uses page 526 annual final value 13444.60 kWh.",
    co2DisplayHandling:
      "Executable CO2 expected values use Tabel 5.18 factors exactly; INVESTIGATION_003 classifies Anexa B page 527 electric CO2 display coefficient 0.086* as a worked-example inconsistency that double-counts the SEN renewable-share adjustment."
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
      totalPrimaryEnergyFactor: 0.92,
      sourceCO2Table: "MC001-2022 Tabel 5.18",
      co2EmissionFactor: 0.22
    }),
    electricitate_sen_consumata: Object.freeze({
      sourcePrimaryTable: "MC001-2022 Tabel 5.17",
      renewablePrimaryEnergyFactor: 0.5,
      nonRenewablePrimaryEnergyFactor: 2,
      totalPrimaryEnergyFactor: 2.5,
      sourceCO2Table: "MC001-2022 Tabel 5.18",
      co2EmissionFactor: 0.107
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
      specificPrimaryEnergyKWhPerM2: 169.86339564772894
    }),
    primaryEnergyByServiceKWh: Object.freeze({
      heating: 110866.624,
      dhw: 35068.56,
      ventilation: 53064.25,
      lighting: 33611.5,
      cooling: 0
    }),
    co2: Object.freeze({
      totalCO2Kg: 41380.04573,
      specificCO2KgPerM2: 30.21764694756828
    }),
    co2ByServiceKg: Object.freeze({
      heating: 24390.65728,
      dhw: 7715.0832,
      ventilation: 5677.87475,
      lighting: 3596.4305,
      cooling: 0
    })
  }),
  sourceDisplayedComparisons: Object.freeze({
    anexaBPrimaryEnergy: Object.freeze({
      source: "Page 527 total primary energy display: 232.935 MWh/an and 170.1 kWh/m2.an.",
      totalPrimaryEnergyKWh: 232934.94,
      specificPrimaryEnergyKWhPerM2: 170.1,
      status: "assert_with_rounding_tolerance"
    }),
    anexaBCO2: Object.freeze({
      source:
        "Page 527 displayed CO2 summary: 28.888 kgCO2/m2.an and text value 39.558 tCO2/an; page 540 final certificate indicator displays the same conflicting CO2 path rounded as 28.89 kgCO2/m2.an.",
      totalCO2KgFromSpecific: 39559.2272,
      specificCO2KgPerM2: 28.888,
      status: "blocked_worked_example_double_counts_electric_renewable_share"
    })
  }),
  blockedRows: Object.freeze([
    Object.freeze({
      source: "Page 523 heating annual final-energy text",
      reason:
        "INVESTIGATION_003 classifies this as a worked-example prose typo: the text states 100.06 MWh/an final heating energy, while page 523 primary energy, page 527 heating primary and page 533 88/81 kWh/m2.an are mutually consistent with Tabel 5.17 within rounding."
    }),
    Object.freeze({
      source: "Page 527/page 540 electric-service CO2 display rows",
      reason:
        "INVESTIGATION_003 classifies this as a worked-example factor inconsistency: page 527 uses 0.086* = 0.107 * 0.80, but page 486 states the 20% SEN renewable-share impact is already embedded in Tabel 5.18. Page 540's final certificate CO2 indicator inherits this display conflict."
    }),
    Object.freeze({
      source: "Page 527 RER and class outputs",
      reason:
        "RER and class assignment are outside finalPrimaryCo2Indicators.mjs and remain certificate/class workflow blockers."
    })
  ]),
  tolerances: Object.freeze({
    exactAbs: 1e-9,
    sourcePrimaryTotalAbsKWh: 400,
    sourcePrimarySpecificAbsKWhPerM2: 0.3
  })
});
