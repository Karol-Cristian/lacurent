export const fixture012RerDisplayReconciliation = Object.freeze({
  fixtureId: "FIXTURE_012_RER_DISPLAY_RECONCILIATION",
  exampleId: "MC001_EX_B_FINAL_PRIMARY_CO2_CPE",
  description:
    "MC001 Anexa B page 527 displayed RER arithmetic reconciliation",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section:
      "MC001-2022 Anexa B page 527 final primary/CO2/RER summary; page 540 final indicator repeat",
    pages: Object.freeze([527, 540]),
    formulaReferences: Object.freeze([
      "Displayed arithmetic only: RER = ((24.5 + 39.0) * 20%) / 170.1 * 100",
      "MC001-2022 relation (5.16) is context only; this fixture does not validate general RER methodology"
    ])
  }),
  notes: Object.freeze({
    fixtureType:
      "Display-only RER reconciliation from explicit Anexa B page 527 values.",
    sourceBoundary:
      "This fixture validates the page 527 displayed arithmetic and page 540 repeated display only.",
    notGeneralRer:
      "General RER remains blocked unless EPren,RER, EPtot, perimeter and export treatment are explicit.",
    classBoundary:
      "Energy class labels remain blocked for this RER display fixture; Tabel 5.7-5.14 thresholds are numeric, but class assignment/certificate workflow is outside Fixture 012."
  }),
  displayedInputs: Object.freeze({
    renewableComponentVentilationPrimaryKWhPerM2: 39.0,
    renewableComponentLightingPrimaryKWhPerM2: 24.5,
    electricityRenewableShare: 0.20,
    denominatorSpecificPrimaryKWhPerM2: 170.1,
    displayedRerPercent: 7.47,
    displayDecimalPlaces: 2
  }),
  expected: Object.freeze({
    calculatedRerPercent: 7.466196355085245,
    roundedDisplayRerPercent: 7.47,
    absoluteDisplayDeltaPercentagePoints: 0.0038036449147549334,
    displayRelativeDeltaPercent: 0.05091894129524677
  }),
  diagnosticOnly: Object.freeze({
    exactPrimarySplit: Object.freeze({
      source:
        "Fixture 007/008 exact Tabel 5.17 primary split; diagnostic only, not a pass criterion for this display fixture.",
      renewablePrimaryEnergyKWh: 17335.15,
      totalPrimaryEnergyKWh: 232610.934,
      calculatedRerPercent: 7.452422679322547,
      absoluteDeltaAgainstDisplayedPercentagePoints: 0.017577320677452768,
      relativeDeltaAgainstDisplayedPercent: 0.23530549769013076,
      diagnosticOnly: true,
      usedAsPassCriterion: false
    })
  }),
  tolerances: Object.freeze({
    arithmeticExactAbsPercent: 1e-12,
    displayedRoundedAbsPercent: 1e-12,
    displayRoundingAbsPercentagePoints: 0.005
  }),
  blockedRows: Object.freeze([
    Object.freeze({
      rowKey: "general_rer_methodology",
      source: "MC001 relation (5.16) and renewable/export perimeter rules.",
      reason:
        "This fixture does not validate general RER. EPren,RER, EPtot, selected perimeter and export treatment must be explicit for a general RER calculation."
    }),
    Object.freeze({
      rowKey: "exact_primary_split_as_pass_criterion",
      source: "Fixture 007/008 exact primary split.",
      reason:
        "Exact primary split is documented only as a diagnostic comparison and is not used to pass or fail this display fixture."
    }),
    Object.freeze({
      rowKey: "energy_class_labels",
      source: "Anexa B pages 527, 528 and 533 class labels.",
      reason:
        "Energy class labels remain blocked for Fixture 012 because it does not validate class assignment, utility-inclusion recalculation, reference-building classification or certificate workflow."
    }),
    Object.freeze({
      rowKey: "co2_display_inconsistency",
      source: "Anexa B page 527/page 540 displayed CO2 rows.",
      reason:
        "INVESTIGATION_003 classifies the electric-service CO2 display coefficient 0.086* as a worked-example inconsistency with the normative Tabel 5.18 path."
    }),
    Object.freeze({
      rowKey: "certificate_workflow",
      source: "Anexa B certificate/CPE displayed pages.",
      reason:
        "This fixture does not validate certificate generation, reference-building class assignment, official CPE workflow or production integration."
    })
  ])
});
