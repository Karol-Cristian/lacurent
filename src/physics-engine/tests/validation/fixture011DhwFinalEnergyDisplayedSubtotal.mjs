export const fixture011DhwFinalEnergyDisplayedSubtotal = Object.freeze({
  fixtureId: "FIXTURE_011_DHW_FINAL_ENERGY_DISPLAYED_SUBTOTAL",
  exampleId: "MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS",
  description:
    "MC001 Anexa B page 525 displayed DHW final-energy subtotal reconciliation",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section:
      "MC001-2022 Anexa B page 525 DHW / ACC displayed final-energy subtotal",
    pages: Object.freeze([525]),
    formulaReferences: Object.freeze([
      "Displayed arithmetic only: Qw,total = Qw,nd + Qw,dis,tot + Qw,sto + Qw,g + Ww"
    ])
  }),
  notes: Object.freeze({
    fixtureType:
      "Display-only subtotal reconciliation from explicit Anexa B page 525 rows.",
    usefulDemand:
      "Qw,nd = 18519.13 kWh/an is the Fixture 010 validated useful-demand row.",
    distributionSubtotal:
      "Qw,dis,tot = 19599.3 kWh is used only as a displayed subtotal input.",
    scopeBoundary:
      "This fixture does not validate distribution-loss, storage, generation, recovered-loss, auxiliary-energy, or full DHW final-energy formulas."
  }),
  displayedInputs: Object.freeze({
    usefulDemandQWndKWh: 18519.13,
    distributionLossTotalQwDisTotKWh: 19599.3,
    storageLossQwStoKWh: 0,
    generationLossQwGKWh: 0,
    auxiliaryEnergyWwKWh: 0
  }),
  expected: Object.freeze({
    componentSubtotalKWh: 38118.43,
    displayedQwTotalKWh: 38118,
    absoluteDisplayDeltaKWh: 0.43
  }),
  tolerances: Object.freeze({
    arithmeticExactAbs: 1e-9,
    displayRoundingAbsKWh: 0.5
  }),
  blockedRows: Object.freeze([
    Object.freeze({
      rowKey: "annual_distribution_loss_formula",
      source: "Anexa B page 525 Qw,dis,tot and Anexa 3.3.B distribution-loss rows.",
      reason:
        "Qw,dis,tot is accepted only as a displayed subtotal input. Annual distribution-loss formulas remain blocked by missing physical inputs and INVESTIGATION_004 length/unit/formula issues."
    }),
    Object.freeze({
      rowKey: "storage_loss_formula",
      source: "Anexa B page 525 Qw,sto = 0 kWh.",
      reason:
        "The displayed zero row does not validate relation (3.228); storage correction factors, Hsto,ls, setpoint, ambient temperature and hours are not traced."
    }),
    Object.freeze({
      rowKey: "generation_loss_formula",
      source: "Anexa B page 525 Qw,g = 0 kWh.",
      reason:
        "The displayed zero row does not validate generation losses or generator efficiency; section 3.3.9 delegates generator calculation to section 3.1.5 / SR EN 15316-4-1."
    }),
    Object.freeze({
      rowKey: "auxiliary_energy_formula",
      source: "Anexa B page 525 Ww = 0 kWh.",
      reason:
        "The displayed zero row does not validate nonzero auxiliary energy; pump/control inputs are absent."
    }),
    Object.freeze({
      rowKey: "recovered_losses",
      source: "MC001 subsystem balance and Anexa B page 525 displayed rows.",
      reason:
        "Recovered-loss treatment is not independently traceable from the displayed page 525 subtotal."
    }),
    Object.freeze({
      rowKey: "full_dhw_final_energy_formula",
      source: "Anexa B page 525 Qw,total = 38118 kWh.",
      reason:
        "This fixture validates only displayed subtotal arithmetic and must not be used as a full DHW final-energy helper validation."
    })
  ])
});
