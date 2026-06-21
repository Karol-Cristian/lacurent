export const fixture006HeatingNeedTableSummary = Object.freeze({
  fixtureId: "FIXTURE_006_HEATING_NEED_TABLE_SUMMARY",
  exampleId: "MC001_EX_B_HEATING_MONTHLY_GAINS",
  description: "MC001 Anexa B page 522 monthly heating-need table summary",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section: "MC001-2022 Anexa B, school audit breviar, heating need calculation",
    pages: Object.freeze([522]),
    tables: Object.freeze([
      "Page 522 Necesar de incalzire [kWh] summary",
      "Page 522 detailed monthly heating-need table"
    ]),
    formulaReferences: Object.freeze([
      "MC001 section 2.7.1 Figure 2.10 total heat transfer",
      "MC001 section 2.7.2 Figure 2.13 total gains",
      "MC001 section 2.8.1 Figure 2.18 useful heating need",
      "MC001 section 2.11 relation 2.87 heating-period duration",
      "MC001 section 2.10 relation 2.84 annual heating need sum"
    ])
  }),
  notes: Object.freeze({
    duplicateBoundaryRow:
      "The detailed page 522 table starts with a leading Dec row for heating-period continuity; this fixture uses only the 12 calendar rows Ian-Dec.",
    qHndExpectedSource:
      "Monthly QHnd expected values use the decimal page 522 summary table; the detailed row displays rounded integer values.",
    gammaHandling:
      "gammaH is consumed as a displayed source input; no gamma calculator is validated in this fixture.",
    boundaryMethodHandling:
      "April and September are boundary months with fractional heating days. INVESTIGATION_002 reconstructs their Anexa B QHnd values from continuous/full-month columns, but only by bypassing Figure 2.18's gammaH > 2 zero branch.",
    octoberHandling:
      "October is a full heating month; positive displayed QHnd with gammaH > 2 remains an MC001 source conflict with Figure 2.18."
  }),
  monthlyRows: Object.freeze([
    Object.freeze({
      month: "Ian",
      deltaHours: 744,
      qHtrKWh: 26942,
      qHveKWh: 27508,
      expectedQHhtKWh: 54450,
      qHsolKWh: 33163,
      qHintKWh: 6480,
      expectedQHgnKWh: 39643,
      gammaH: 0.73,
      etaHgn: 0.78,
      expectedQHndKWh: 23478.5,
      displayedQHndRoundedKWh: 23479,
      heatingNeedValidationStatus: "executable_rounded_eta"
    }),
    Object.freeze({
      month: "Feb",
      deltaHours: 672,
      qHtrKWh: 21371,
      qHveKWh: 21716,
      expectedQHhtKWh: 43087,
      qHsolKWh: 37764,
      qHintKWh: 6480,
      expectedQHgnKWh: 44244,
      gammaH: 1.03,
      etaHgn: 0.67,
      expectedQHndKWh: 13379.8,
      displayedQHndRoundedKWh: 13380,
      heatingNeedValidationStatus: "executable_rounded_eta"
    }),
    Object.freeze({
      month: "Mar",
      deltaHours: 744,
      qHtrKWh: 17165,
      qHveKWh: 17240,
      expectedQHhtKWh: 34405,
      qHsolKWh: 46059,
      qHintKWh: 8640,
      expectedQHgnKWh: 54699,
      gammaH: 1.59,
      etaHgn: 0.51,
      expectedQHndKWh: 6248.9,
      displayedQHndRoundedKWh: 6249,
      heatingNeedValidationStatus: "executable_rounded_eta"
    }),
    Object.freeze({
      month: "Apr",
      deltaHours: 720,
      qHtrKWh: 366,
      qHveKWh: 357,
      expectedQHhtKWh: 724,
      qHsolKWh: 2082,
      qHintKWh: 166,
      expectedQHgnKWh: 2247,
      gammaH: 3.11,
      etaHgn: 0.3,
      expectedQHndKWh: 1204.1,
      displayedQHndRoundedKWh: 1204,
      heatingNeedValidationStatus: "blocked_mc001_source_conflict_boundary_continuous_qhnd"
    }),
    Object.freeze({
      month: "Mai",
      deltaHours: 744,
      qHtrKWh: 0,
      qHveKWh: 0,
      expectedQHhtKWh: 0,
      qHsolKWh: 0,
      qHintKWh: 0,
      expectedQHgnKWh: 0,
      gammaH: 0,
      etaHgn: 0,
      expectedQHndKWh: 0,
      displayedQHndRoundedKWh: 0,
      heatingNeedValidationStatus: "executable_zero"
    }),
    Object.freeze({
      month: "Iun",
      deltaHours: 720,
      qHtrKWh: 0,
      qHveKWh: 0,
      expectedQHhtKWh: 0,
      qHsolKWh: 0,
      qHintKWh: 0,
      expectedQHgnKWh: 0,
      gammaH: 0,
      etaHgn: 0,
      expectedQHndKWh: 0,
      displayedQHndRoundedKWh: 0,
      heatingNeedValidationStatus: "executable_zero"
    }),
    Object.freeze({
      month: "Iul",
      deltaHours: 744,
      qHtrKWh: 0,
      qHveKWh: 0,
      expectedQHhtKWh: 0,
      qHsolKWh: 0,
      qHintKWh: 0,
      expectedQHgnKWh: 0,
      gammaH: 0,
      etaHgn: 0,
      expectedQHndKWh: 0,
      displayedQHndRoundedKWh: 0,
      heatingNeedValidationStatus: "executable_zero"
    }),
    Object.freeze({
      month: "Aug",
      deltaHours: 744,
      qHtrKWh: 0,
      qHveKWh: 0,
      expectedQHhtKWh: 0,
      qHsolKWh: 0,
      qHintKWh: 0,
      expectedQHgnKWh: 0,
      gammaH: 0,
      etaHgn: 0,
      expectedQHndKWh: 0,
      displayedQHndRoundedKWh: 0,
      heatingNeedValidationStatus: "executable_zero"
    }),
    Object.freeze({
      month: "Sep",
      deltaHours: 720,
      qHtrKWh: 1,
      qHveKWh: 1,
      expectedQHhtKWh: 2,
      qHsolKWh: 20,
      qHintKWh: 2,
      expectedQHgnKWh: 22,
      gammaH: 13.63,
      etaHgn: 0.07,
      expectedQHndKWh: 14.3,
      displayedQHndRoundedKWh: 14,
      heatingNeedValidationStatus: "blocked_mc001_source_conflict_boundary_continuous_qhnd"
    }),
    Object.freeze({
      month: "Oct",
      deltaHours: 744,
      qHtrKWh: 9561,
      qHveKWh: 9524,
      expectedQHhtKWh: 19085,
      qHsolKWh: 39892,
      qHintKWh: 8640,
      expectedQHgnKWh: 48532,
      gammaH: 2.54,
      etaHgn: 0.36,
      expectedQHndKWh: 1667.9,
      displayedQHndRoundedKWh: 1668,
      heatingNeedValidationStatus: "blocked_mc001_source_conflict_gamma_branch"
    }),
    Object.freeze({
      month: "Noi",
      deltaHours: 720,
      qHtrKWh: 15870,
      qHveKWh: 16107,
      expectedQHhtKWh: 31977,
      qHsolKWh: 33923,
      qHintKWh: 8640,
      expectedQHgnKWh: 42563,
      gammaH: 1.33,
      etaHgn: 0.58,
      expectedQHndKWh: 7272.5,
      displayedQHndRoundedKWh: 7273,
      heatingNeedValidationStatus: "executable_rounded_eta"
    }),
    Object.freeze({
      month: "Dec",
      deltaHours: 744,
      qHtrKWh: 24536,
      qHveKWh: 25060,
      expectedQHhtKWh: 49596,
      qHsolKWh: 26516,
      qHintKWh: 6480,
      expectedQHgnKWh: 32996,
      gammaH: 0.67,
      etaHgn: 0.81,
      expectedQHndKWh: 22986.3,
      displayedQHndRoundedKWh: 22986,
      heatingNeedValidationStatus: "executable_rounded_eta"
    })
  ]),
  expected: Object.freeze({
    annualQHndKWh: 76252.3
  }),
  blockedRows: Object.freeze([
    Object.freeze({
      source: "Page 522 leading Dec detailed row",
      reason:
        "Duplicated heating-period continuity row; excluded from the 12 calendar-month annual sum."
    }),
    Object.freeze({
      source: "Page 522 continuous QH;tr;cont/QH;ve;cont/QH;ht;cont rows",
      reason:
        "Some continuous rows are negative; the target helper validates non-negative heating-period-adjusted QHtr and QHve inputs."
    }),
    Object.freeze({
      source: "Page 522 Apr/Sep boundary-month QH;nd rows",
      reason:
        "INVESTIGATION_002 reconstructs the displayed QH;nd values from continuous/full-month columns and Figure 2.14 eta, but only by bypassing Figure 2.18's gammaH > 2 zero branch."
    }),
    Object.freeze({
      source: "Page 522 Oct QH;nd row",
      reason:
        "October is a full heating month with displayed gammaH greater than 2 and positive QHnd; this directly conflicts with Figure 2.18's gammaH > 2 branch."
    }),
    Object.freeze({
      source: "Exact monthly QH;nd from displayed etaH;gn",
      reason:
        "Displayed etaH;gn values are rounded to two decimals, so exact monthly QHnd reproduction is blocked."
    })
  ]),
  sourceConflictDiagnostics: Object.freeze([
    Object.freeze({
      month: "Apr",
      rowType: "boundary_partial_month",
      heatingDaysDisplayed: 1.15,
      heatingDaysGraphLabel: 1.152,
      qHtrContKWh: 9543,
      qHveContKWh: 9298.7,
      qHhtContKWh: 18841,
      tauHHours: 16.7,
      aH: 2.11,
      gammaH: 3.11,
      expectedQHndKWh: 1204.1,
      diagnosticStatus:
        "reconstructs_anexa_b_but_conflicts_with_figure_2_18_gamma_branch",
      toleranceAbsKWh: 3
    }),
    Object.freeze({
      month: "Sep",
      rowType: "boundary_partial_month",
      heatingDaysDisplayed: 0.01,
      heatingDaysGraphLabel: 0.012,
      qHtrContKWh: 2167,
      qHveContKWh: 1813.5,
      qHhtContKWh: 3980,
      tauHHours: 16.9,
      aH: 2.13,
      gammaH: 13.63,
      expectedQHndKWh: 14.3,
      diagnosticStatus:
        "reconstructs_anexa_b_but_conflicts_with_figure_2_18_gamma_branch",
      toleranceAbsKWh: 0.2
    }),
    Object.freeze({
      month: "Oct",
      rowType: "full_heating_month",
      heatingDaysDisplayed: 31,
      heatingDaysGraphLabel: 31,
      qHtrContKWh: 9561,
      qHveContKWh: 9524,
      qHhtContKWh: 19085,
      tauHHours: 17,
      aH: 2.14,
      gammaH: 2.54,
      expectedQHndKWh: 1667.9,
      diagnosticStatus:
        "reconstructs_anexa_b_but_conflicts_with_figure_2_18_gamma_branch",
      toleranceAbsKWh: 5
    })
  ]),
  tolerances: Object.freeze({
    monthlyTotalHeatTransferAbsKWh: 1.1,
    monthlyTotalGainsAbsKWh: 1.1,
    monthlyHeatingNeedRoundedEtaAbsKWh: 300,
    monthlyHeatingNeedZeroAbsKWh: 0.1,
    annualHeatingNeedAbsKWh: 0.01
  })
});
