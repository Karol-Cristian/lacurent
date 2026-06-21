export const fixture004TransmissionLossTotals = Object.freeze({
  fixtureId: "FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS",
  exampleIds: Object.freeze([
    "MC001_EX_B_GEOMETRY_ENVELOPE_TABLES",
    "MC001_EX_B_HEATING_MONTHLY_GAINS"
  ]),
  description: "MC001 Anexa B page 520-521 transmission-loss summary totals",
  source: Object.freeze({
    document: "docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf",
    mc001Section: "MC001-2022 Anexa B, school audit breviar, heating calculation",
    pages: Object.freeze([520, 521]),
    tables: Object.freeze([
      "Page 520 H loss coefficients by transmission and ventilation",
      "Page 521 monthly Hg, Ha, Hu and Htr table"
    ])
  }),
  directExteriorRows: Object.freeze([
    Object.freeze({
      row: "1",
      code: "TE",
      elementId: "terrace_roof_horizontal",
      areaM2: 504.0,
      orientation: "ORIZ",
      reductionFactor: 0.97,
      correctedResistanceM2KPerW: 0.85,
      uPrimeValueWPerM2K: 1.18,
      expectedHdWPerK: 594.49
    }),
    Object.freeze({
      row: "2",
      code: "PE",
      elementId: "opaque_external_wall_north",
      areaM2: 158.8,
      orientation: "N",
      reductionFactor: 0.60,
      correctedResistanceM2KPerW: 1.02,
      uPrimeValueWPerM2K: 0.98,
      expectedHdWPerK: 155.87
    }),
    Object.freeze({
      row: "3",
      code: "FE",
      elementId: "external_joinery_north",
      areaM2: 18.2,
      orientation: "N",
      reductionFactor: null,
      correctedResistanceM2KPerW: 0.40,
      uPrimeValueWPerM2K: 2.50,
      expectedHdWPerK: 45.50
    }),
    Object.freeze({
      row: "4",
      code: "PE",
      elementId: "opaque_external_wall_east",
      areaM2: 244.0,
      orientation: "E",
      reductionFactor: 0.60,
      correctedResistanceM2KPerW: 1.02,
      uPrimeValueWPerM2K: 0.98,
      expectedHdWPerK: 239.50
    }),
    Object.freeze({
      row: "5",
      code: "FE",
      elementId: "external_joinery_east",
      areaM2: 47.0,
      orientation: "E",
      reductionFactor: null,
      correctedResistanceM2KPerW: 0.40,
      uPrimeValueWPerM2K: 2.50,
      expectedHdWPerK: 117.50
    }),
    Object.freeze({
      row: "6",
      code: "PE",
      elementId: "opaque_external_wall_south",
      areaM2: 161.3,
      orientation: "S",
      reductionFactor: 0.60,
      correctedResistanceM2KPerW: 1.02,
      uPrimeValueWPerM2K: 0.98,
      expectedHdWPerK: 158.32
    }),
    Object.freeze({
      row: "7",
      code: "FE",
      elementId: "external_joinery_south",
      areaM2: 15.7,
      orientation: "S",
      reductionFactor: null,
      correctedResistanceM2KPerW: 0.40,
      uPrimeValueWPerM2K: 2.50,
      expectedHdWPerK: 39.25
    }),
    Object.freeze({
      row: "8",
      code: "PE",
      elementId: "opaque_external_wall_west",
      areaM2: 216.8,
      orientation: "V",
      reductionFactor: 0.60,
      correctedResistanceM2KPerW: 1.02,
      uPrimeValueWPerM2K: 0.98,
      expectedHdWPerK: 212.80
    }),
    Object.freeze({
      row: "9",
      code: "FE",
      elementId: "external_joinery_west",
      areaM2: 74.2,
      orientation: "V",
      reductionFactor: null,
      correctedResistanceM2KPerW: 0.40,
      uPrimeValueWPerM2K: 2.50,
      expectedHdWPerK: 185.50
    })
  ]),
  groundRows: Object.freeze([
    Object.freeze({
      row: "10",
      code: "Plsol",
      elementId: "slab_on_ground",
      areaM2: 504.0,
      orientation: "-",
      reductionFactor: 0.58,
      correctedResistanceM2KPerW: 1.79,
      uPrimeValueWPerM2K: 0.56,
      adjacentSpaceType: "Sol",
      expectedHgWPerK: 86.12
    })
  ]),
  page520Totals: Object.freeze({
    displayedHgTotalWPerK: 86.12,
    displayedHdTotalWPerK: 1748.73,
    displayedHiuTotalWPerK: 0.00,
    displayedHveTotalWPerK: 1806.62
  }),
  monthlyTransmissionRows: Object.freeze([
    Object.freeze({ month: "Jan", hgWPerK: 60.11, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1808.84 }),
    Object.freeze({ month: "Feb", hgWPerK: 73.98, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1822.72 }),
    Object.freeze({ month: "Mar", hgWPerK: 91.11, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1839.85 }),
    Object.freeze({ month: "Apr", hgWPerK: 106.90, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1855.64 }),
    Object.freeze({ month: "Mai", hgWPerK: 117.12, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1865.86 }),
    Object.freeze({ month: "Iun", hgWPerK: 119.04, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1867.77 }),
    Object.freeze({ month: "Iul", hgWPerK: 112.13, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1860.86 }),
    Object.freeze({ month: "Aug", hgWPerK: 98.25, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1846.98 }),
    Object.freeze({ month: "Sep", hgWPerK: 81.12, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1829.85 }),
    Object.freeze({ month: "Oct", hgWPerK: 65.33, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1814.06 }),
    Object.freeze({ month: "Noi", hgWPerK: 55.11, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1803.84 }),
    Object.freeze({ month: "Dec", hgWPerK: 53.20, haWPerK: 0.00, huWPerK: 0.00, expectedHtrWPerK: 1801.93 })
  ]),
  expected: Object.freeze({
    page520TransmissionSubtotalWPerK: 1834.85,
    displayedMaxMonthlyHtrWPerK: 1867.8
  }),
  blockedRows: Object.freeze([
    Object.freeze({
      source: "Page 520 Hve total",
      valueWPerK: 1806.62,
      reason: "Hve is a ventilation coefficient, not a transmission coefficient."
    }),
    Object.freeze({
      source: "Page 521 H final",
      valueWPerK: 3674.39,
      reason:
        "H final combines transmission Htr with ventilation Hve; validation belongs in a combined-loss or ventilation fixture."
    }),
    Object.freeze({
      source: "Page 521 monthly Hg derivation",
      reason:
        "Monthly Hg values are consumed as displayed source data; deriving them requires ground/climate intermediates not available in this fixture."
    })
  ]),
  tolerances: Object.freeze({
    displayedComponentSumAbsWPerK: 1e-9,
    correctedUDirectRowAbsWPerK: 0.40,
    correctedUDirectTotalAbsWPerK: 1.00,
    page520TransmissionSubtotalAbsWPerK: 1e-9,
    monthlyHtrAbsWPerK: 0.02,
    maxMonthlyHtrAbsWPerK: 0.04
  })
});
