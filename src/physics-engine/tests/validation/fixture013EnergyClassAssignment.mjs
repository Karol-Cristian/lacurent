export const fixture013EnergyClassAssignment = Object.freeze({
  fixtureId: "FIXTURE_013_ENERGY_CLASS_ASSIGNMENT",
  fixtureType: "dataset_rule_validation",
  sourceDocument: "MC001-2022",
  sourcePages: Object.freeze([395, 397, 398, 400]),
  sourceNote:
    "MC001 page 395 Nota 1 defines Tabel 5.7-5.14 intervals as open-left and closed-right.",
  scope:
    "Energy/environmental class interval assignment from reviewed Tabel 5.7-5.14 dataset rows only.",
  exclusions: Object.freeze([
    "no certificate workflow",
    "no CPE generation",
    "no reference-building class assignment",
    "no Tabel 5.6 utility-inclusion recalculation",
    "no category inference",
    "no production integration"
  ]),
  sourceRowsVerified: Object.freeze([
    Object.freeze({
      rowId: "tabel_5_7_residential_individual_total_primary",
      sourceTable: "MC001-2022 Tabel 5.7",
      sourcePage: 397,
      buildingCategoryKey: "residential_individual",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      unit: "kWh/(m2.an)",
      thresholds: Object.freeze([91, 129, 257, 390, 522, 652, 783])
    }),
    Object.freeze({
      rowId: "tabel_5_10_education_total_primary",
      sourceTable: "MC001-2022 Tabel 5.10",
      sourcePage: 398,
      buildingCategoryKey: "education",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      unit: "kWh/(m2.an)",
      thresholds: Object.freeze([48, 68, 135, 246, 358, 447, 536])
    }),
    Object.freeze({
      rowId: "tabel_5_10_education_total_co2",
      sourceTable: "MC001-2022 Tabel 5.10",
      sourcePage: 398,
      buildingCategoryKey: "education",
      indicatorBasis: "specific_co2_emissions",
      indicatorKey: "total",
      unit: "kgCO2/(m2.an)",
      thresholds: Object.freeze([8.3, 11.6, 23.0, 42.5, 62.2, 77.6, 93.1])
    }),
    Object.freeze({
      rowId: "tabel_5_14_sports_total_primary",
      sourceTable: "MC001-2022 Tabel 5.14",
      sourcePage: 400,
      buildingCategoryKey: "sports",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      unit: "kWh/(m2.an)",
      thresholds: Object.freeze([75, 104, 206, 350, 494, 617, 741])
    })
  ]),
  classificationCases: Object.freeze([
    Object.freeze({
      caseId: "education_total_primary_inside_b",
      description: "Education total primary value inside class B interval.",
      sourceTable: "MC001-2022 Tabel 5.10",
      buildingCategoryKey: "education",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      indicatorValue: 100,
      expectedClassLabel: "B",
      expectedClassKey: "b",
      expectedLowerBound: 68,
      expectedUpperBound: 135,
      expectedIntervalNotation: "(68, 135]"
    }),
    Object.freeze({
      caseId: "education_total_primary_upper_bound_b",
      description: "Exact upper bound belongs to class B because upper bounds are closed.",
      sourceTable: "MC001-2022 Tabel 5.10",
      buildingCategoryKey: "education",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      indicatorValue: 135,
      expectedClassLabel: "B",
      expectedClassKey: "b",
      expectedLowerBound: 68,
      expectedUpperBound: 135,
      expectedIntervalNotation: "(68, 135]"
    }),
    Object.freeze({
      caseId: "education_total_primary_lower_bound_b_goes_to_a",
      description: "Exact lower bound of B belongs to previous class A.",
      sourceTable: "MC001-2022 Tabel 5.10",
      buildingCategoryKey: "education",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      indicatorValue: 68,
      expectedClassLabel: "A",
      expectedClassKey: "a",
      expectedLowerBound: 48,
      expectedUpperBound: 68,
      expectedIntervalNotation: "(48, 68]"
    }),
    Object.freeze({
      caseId: "education_total_primary_below_first_threshold",
      description: "Below the first threshold is class A+.",
      sourceTable: "MC001-2022 Tabel 5.10",
      buildingCategoryKey: "education",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      indicatorValue: 0,
      expectedClassLabel: "A+",
      expectedClassKey: "a_plus",
      expectedLowerBound: null,
      expectedUpperBound: 48,
      expectedIntervalNotation: "<=48"
    }),
    Object.freeze({
      caseId: "education_total_primary_above_last_threshold",
      description: "Above the final threshold is class G.",
      sourceTable: "MC001-2022 Tabel 5.10",
      buildingCategoryKey: "education",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      indicatorValue: 536.01,
      expectedClassLabel: "G",
      expectedClassKey: "g",
      expectedLowerBound: 536,
      expectedUpperBound: null,
      expectedIntervalNotation: ">536"
    }),
    Object.freeze({
      caseId: "education_total_co2_upper_bound_c",
      description: "Education total CO2 value at class C upper bound.",
      sourceTable: "MC001-2022 Tabel 5.10",
      buildingCategoryKey: "education",
      indicatorBasis: "specific_co2_emissions",
      indicatorKey: "total",
      indicatorValue: 42.5,
      expectedClassLabel: "C",
      expectedClassKey: "c",
      expectedLowerBound: 23,
      expectedUpperBound: 42.5,
      expectedIntervalNotation: "(23, 42.5]"
    }),
    Object.freeze({
      caseId: "residential_individual_total_primary_page_395_example",
      description:
        "MC001 page 395 Nota 1 example: residential individual total primary 129 kWh/(m2.an) is class A by Tabel 5.7.",
      sourceTable: "MC001-2022 Tabel 5.7",
      buildingCategoryKey: "residential_individual",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      indicatorValue: 129,
      expectedClassLabel: "A",
      expectedClassKey: "a",
      expectedLowerBound: 91,
      expectedUpperBound: 129,
      expectedIntervalNotation: "(91, 129]"
    }),
    Object.freeze({
      caseId: "sports_total_primary_upper_bound_f",
      description: "Sports total primary exact upper threshold 741 remains class F.",
      sourceTable: "MC001-2022 Tabel 5.14",
      buildingCategoryKey: "sports",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      indicatorValue: 741,
      expectedClassLabel: "F",
      expectedClassKey: "f",
      expectedLowerBound: 617,
      expectedUpperBound: 741,
      expectedIntervalNotation: "(617, 741]"
    }),
    Object.freeze({
      caseId: "sports_total_primary_above_maximum_g",
      description: "Sports total primary above 741 is class G.",
      sourceTable: "MC001-2022 Tabel 5.14",
      buildingCategoryKey: "sports",
      indicatorBasis: "specific_primary_energy",
      indicatorKey: "total",
      indicatorValue: 741.01,
      expectedClassLabel: "G",
      expectedClassKey: "g",
      expectedLowerBound: 741,
      expectedUpperBound: null,
      expectedIntervalNotation: ">741"
    })
  ]),
  blockedRows: Object.freeze([
    Object.freeze({
      row: "Anexa B displayed class labels",
      reason:
        "Class labels remain outside Fixture 013 because Tabel 5.6 utility inclusion, optional-utility threshold recalculation and certificate/reference-building workflow are not implemented here."
    }),
    Object.freeze({
      row: "CPE/certificate output",
      reason:
        "Fixture 013 validates class interval assignment only; it does not create certificate outputs."
    })
  ])
});
