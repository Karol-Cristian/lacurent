import { fixture004TransmissionLossTotals as fixture004 } from "./fixture004TransmissionLossTotals.mjs";
import { fixture005VentilationHveSummary as fixture005 } from "./fixture005VentilationHveSummary.mjs";
import { fixture007FinalPrimaryCo2Summary as fixture007 } from "./fixture007FinalPrimaryCo2Summary.mjs";

function freezeEntries(entries) {
  return Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
}

const primaryFactors = Object.freeze(
  Object.fromEntries(
    Object.entries(fixture007.factors).map(([carrierKey, factor]) => [
      carrierKey,
      Object.freeze({
        sourcePrimaryTable: factor.sourcePrimaryTable,
        renewablePrimaryEnergyFactor: factor.renewablePrimaryEnergyFactor,
        nonRenewablePrimaryEnergyFactor: factor.nonRenewablePrimaryEnergyFactor,
        totalPrimaryEnergyFactor: factor.totalPrimaryEnergyFactor
      })
    ])
  )
);

const co2Factors = Object.freeze(
  Object.fromEntries(
    Object.entries(fixture007.factors).map(([carrierKey, factor]) => [
      carrierKey,
      Object.freeze({
        sourceCO2Table: factor.sourceCO2Table,
        co2EmissionFactor: factor.co2EmissionFactor
      })
    ])
  )
);

const monthlyVentilationTransferRows = Object.freeze(
  fixture005.monthlyRows.map((row) =>
    Object.freeze({
      month: row.month,
      hve: fixture005.airflow.expectedHveWPerK,
      thetaInt: row.thetaIntC,
      thetaExternalMonthly: row.thetaExternalC,
      deltaHours: row.deltaHours,
      thetaExternalMonthlySource: "FIXTURE_005_VENTILATION_HVE_SUMMARY.monthlyRows",
      expectedQveKWh: row.expectedQveKWh,
      toleranceAbs: fixture005.tolerances.monthlyQveAbsKWh,
      source: `Fixture 005 ${row.month} reviewed monthly Qve row.`
    })
  )
);

export const fixture016Level1CoreComponentOrchestrator = Object.freeze({
  fixtureId: "FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR",
  fixtureType: "level_1_core_component_orchestrator_validation",
  sourceDocument: "MC001-2022",
  sourceNote:
    "Uses reviewed Fixture 004 transmission totals, Fixture 005 ventilation Hve/Qve rows, Fixture 007 final-primary-CO2 rows, and explicit blockers from Fixture 015/Investigation 009.",
  scope:
    "Pure Physics Engine Level 1 core composition for transmission, ventilation, final/primary/CO2, and explicit blockers.",
  exclusions: Object.freeze([
    "no production orchestrator",
    "no full MC001 auditor",
    "no certificate workflow",
    "no CPE generation",
    "no report generation",
    "no UI/API/DB/Worker/deploy/production integration",
    "no new MC001 formulas",
    "no invented inputs",
    "no full DHW final-energy implementation",
    "no lighting implementation",
    "no cooling-system implementation",
    "no reference-building implementation"
  ]),
  inputPack: Object.freeze({
    packMetadata: Object.freeze({
      packId: "LEVEL_1_CORE_INPUT_PACK_FIXTURE_016",
      source: "Reviewed MC001 Physics Engine validation fixtures 004, 005, 007, 015 and Investigation 009",
      methodology: "MC001-2022 explicit inputs only",
      validationScope: "transmission_ventilation_final_primary_co2_with_explicit_blockers",
      createdFor: "FIXTURE_016_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR"
    }),
    buildingContext: Object.freeze({
      buildingUseCategory: "education",
      conditionedFloorArea: fixture007.referenceAreaM2,
      areaUnit: "m2",
      calculationBasis: "explicit Anexa B reviewed fixture values; no category inference"
    }),
    transmission: Object.freeze({
      Hd: fixture004.page520Totals.displayedHdTotalWPerK,
      Hg: fixture004.page520Totals.displayedHgTotalWPerK,
      Hu: fixture004.page520Totals.displayedHiuTotalWPerK,
      Ha: 0,
      expectedHtr: fixture004.expected.page520TransmissionSubtotalWPerK,
      unit: "W/K",
      sourceFixtureId: fixture004.fixtureId,
      source: "Fixture 004 page 520 displayed Hd/Hg/Hiu zero rows and transmission subtotal.",
      toleranceAbs: fixture004.tolerances.page520TransmissionSubtotalAbsWPerK
    }),
    ventilation: Object.freeze({
      Hve: fixture005.airflow.expectedHveWPerK,
      unit: "W/K",
      sourceFixtureId: fixture005.fixtureId,
      source: "Fixture 005 page 520 source-implied Hve from explicit airflow.",
      monthlyQveToleranceAbsKWh: fixture005.tolerances.monthlyQveAbsKWh,
      monthlyVentilationTransferRows,
      blockedBranches: Object.freeze([
        Object.freeze({
          branch: "ACH airflow",
          status: "blocked_missing_inputs",
          reason: "No ACH value and heated volume pair is reviewed for this example."
        }),
        Object.freeze({
          branch: "unconditioned-zone bve",
          status: "blocked_missing_inputs",
          reason: "No bztu source row is reviewed for this example."
        })
      ])
    }),
    finalPrimaryCo2: Object.freeze({
      serviceFinalEnergyRows: freezeEntries(fixture007.finalEnergyEntries),
      primaryFactors,
      co2Factors,
      conditionedArea: fixture007.referenceAreaM2,
      expectedFinalEnergyTotalKWh: fixture007.expected.finalEnergyTotalKWh,
      expectedPrimaryTotalKWh: fixture007.expected.primaryEnergy.totalPrimaryEnergyKWh,
      expectedRenewablePrimaryKWh: fixture007.expected.primaryEnergy.renewablePrimaryEnergyKWh,
      expectedNonRenewablePrimaryKWh:
        fixture007.expected.primaryEnergy.nonRenewablePrimaryEnergyKWh,
      expectedCO2TotalKg: fixture007.expected.co2.totalCO2Kg,
      toleranceAbs: fixture007.tolerances.exactAbs,
      co2ToleranceAbs: fixture007.tolerances.exactAbs,
      sourceFixtureId: fixture007.fixtureId,
      source: "Fixture 007 explicit final-energy rows, Tabel 5.17 primary factors, and Tabel 5.18 CO2 factors."
    }),
    explicitBlockers: Object.freeze([
      Object.freeze({
        blockerId: "april_boundary_heating_period_gap",
        area: "monthly_heating",
        status: "blocked_ambiguous",
        source: "Fixture 006 and Investigation 009",
        reason: "April boundary-period method conflicts with direct Figure 2.18 helper behavior."
      }),
      Object.freeze({
        blockerId: "september_boundary_heating_period_gap",
        area: "monthly_heating",
        status: "blocked_ambiguous",
        source: "Fixture 006 and Investigation 009",
        reason: "September boundary-period method conflicts with direct Figure 2.18 helper behavior."
      }),
      Object.freeze({
        blockerId: "october_mc001_worked_example_ambiguity",
        area: "monthly_heating",
        status: "blocked_ambiguous",
        source: "Fixture 006 and Investigation 009",
        reason: "October displays positive QHnd while gammaH is greater than 2."
      }),
      Object.freeze({
        blockerId: "full_dhw_final_energy_chain_blocked",
        area: "dhw",
        status: "blocked",
        source: "Fixture 011 and Investigation 009",
        reason: "Only useful/display arithmetic is validated; full final-energy chain remains incomplete."
      }),
      Object.freeze({
        blockerId: "annual_dhw_distribution_loss_basis_blocked",
        area: "dhw",
        status: "blocked",
        source: "Investigation 004 and Investigation 009",
        reason: "Annual distribution-loss energy basis remains unresolved."
      }),
      Object.freeze({
        blockerId: "dhw_storage_generation_recovered_auxiliary_paths_blocked",
        area: "dhw",
        status: "blocked",
        source: "Investigation 009",
        reason: "Storage, generation, recovered loss, and auxiliary paths remain outside this fixture."
      }),
      Object.freeze({
        blockerId: "general_rer_methodology_blocked",
        area: "rer",
        status: "blocked",
        source: "Fixture 012 and Investigation 009",
        reason: "Only displayed RER arithmetic is validated; general RER perimeter/export treatment is blocked."
      }),
      Object.freeze({
        blockerId: "anexa_b_co2_display_inconsistency_blocked",
        area: "final_primary_co2",
        status: "blocked_source_conflict",
        source: "Fixture 007 and Investigation 003",
        reason: "Anexa B electric CO2 display path conflicts with reviewed Tabel 5.18 relation 5.4b path."
      }),
      Object.freeze({
        blockerId: "anexa_b_displayed_class_labels_blocked",
        area: "energy_classes",
        status: "blocked",
        source: "Fixture 013, Fixture 014 and Investigation 009",
        reason: "Displayed class labels need certificate/reference-building context."
      }),
      Object.freeze({
        blockerId: "mixed_use_weighted_thresholds_blocked",
        area: "energy_classes",
        status: "blocked",
        source: "Investigation 009",
        reason: "Mixed-use zone mapping and area weighting are not implemented."
      }),
      Object.freeze({
        blockerId: "overheating_discomfort_hours_above_26c_blocked",
        area: "energy_classes",
        status: "blocked",
        source: "Fixture 014 and Investigation 009",
        reason: "Annual hours above 26 degC method is not implemented."
      }),
      Object.freeze({
        blockerId: "virtual_ventilation_full_calculation_blocked",
        area: "energy_classes",
        status: "blocked",
        source: "Fixture 014 and Investigation 009",
        reason: "Tabel 5.6 rule is recorded, but no virtual ventilation calculator exists."
      }),
      Object.freeze({
        blockerId: "certificate_cpe_workflow_blocked",
        area: "certificate",
        status: "blocked_out_of_scope",
        source: "Fixture 015 and Investigation 009",
        reason: "Certificate/CPE workflow is not part of the Physics Engine validation fixture."
      }),
      Object.freeze({
        blockerId: "lighting_blocked",
        area: "lighting",
        status: "blocked_missing_external_standard",
        source: "Investigation 009",
        reason: "Lighting requires external SR EN 15193-1/local lighting data."
      }),
      Object.freeze({
        blockerId: "cooling_systems_blocked",
        area: "cooling",
        status: "blocked_missing_inputs",
        source: "Investigation 009",
        reason: "Cooling useful demand and system performance are not validated end-to-end."
      }),
      Object.freeze({
        blockerId: "reference_building_blocked",
        area: "reference_building",
        status: "blocked",
        source: "Investigation 009",
        reason: "Reference-building datasets and workflow remain incomplete."
      })
    ])
  }),
  expected: Object.freeze({
    orchestratorType: "MC001_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR",
    level: "LEVEL_1_CORE_COMPONENT_ORCHESTRATION",
    isProductionOrchestrator: false,
    isCertificateWorkflow: false,
    transmissionHtrWPerK: fixture004.expected.page520TransmissionSubtotalWPerK,
    ventilationHveWPerK: fixture005.airflow.expectedHveWPerK,
    finalEnergyTotalKWh: fixture007.expected.finalEnergyTotalKWh,
    primaryEnergyTotalKWh: fixture007.expected.primaryEnergy.totalPrimaryEnergyKWh,
    co2TotalKg: fixture007.expected.co2.totalCO2Kg,
    validationStatus: "LEVEL_1_CORE_VALIDATED_WITH_EXPLICIT_BLOCKERS"
  })
});
