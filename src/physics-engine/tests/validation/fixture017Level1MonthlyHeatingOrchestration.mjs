import { fixture006HeatingNeedTableSummary as fixture006 } from "./fixture006HeatingNeedTableSummary.mjs";
import { fixture016Level1CoreComponentOrchestrator as fixture016 } from "./fixture016Level1CoreComponentOrchestrator.mjs";

function monthlyHeatingStatus(row) {
  if (row.month === "Apr" || row.month === "Sep") {
    return "blocked";
  }
  if (row.month === "Oct") {
    return "ambiguous";
  }

  return "validated";
}

function monthlyHeatingReason(row) {
  if (row.month === "Apr" || row.month === "Sep") {
    return "Boundary-period extraction gap remains blocked; do not force Figure 2.18 gammaH > 2 branch to reproduce the Anexa B displayed value.";
  }
  if (row.month === "Oct") {
    return "October is a full heating month with displayed positive QHnd while gammaH > 2; this remains an MC001 worked-example ambiguity.";
  }

  return null;
}

const monthlyRows = Object.freeze(
  fixture006.monthlyRows.map((row) => {
    const status = monthlyHeatingStatus(row);
    const reason = monthlyHeatingReason(row);
    return Object.freeze({
      month: row.month,
      QHht: row.expectedQHhtKWh,
      QHgn: row.expectedQHgnKWh,
      QHnd: status === "validated" ? row.expectedQHndKWh : null,
      status,
      sourceDisplayedQHnd: row.expectedQHndKWh,
      sourceValidationStatus: row.heatingNeedValidationStatus,
      sourceFixtureId: fixture006.fixtureId,
      source: `Fixture 006 page 522 ${row.month} reviewed monthly heating row.`,
      ...(reason ? { reason } : {})
    });
  })
);

const blockedMonths = Object.freeze(
  monthlyRows
    .filter((row) => row.status === "blocked")
    .map((row) =>
      Object.freeze({
        month: row.month,
        sourceFixtureId: row.sourceFixtureId,
        reason: row.reason
      })
    )
);

const ambiguousMonths = Object.freeze(
  monthlyRows
    .filter((row) => row.status === "ambiguous")
    .map((row) =>
      Object.freeze({
        month: row.month,
        sourceFixtureId: row.sourceFixtureId,
        reason: row.reason
      })
    )
);

export const fixture017Level1MonthlyHeatingOrchestration = Object.freeze({
  fixtureId: "FIXTURE_017_LEVEL_1_MONTHLY_HEATING_ORCHESTRATION",
  fixtureType: "level_1_monthly_heating_orchestration_validation",
  sourceDocument: "MC001-2022",
  sourceNote:
    "Uses Fixture 016 Level 1 core input pack and Fixture 006 reviewed Anexa B page 522 monthly heating rows.",
  scope:
    "Pure Physics Engine Level 1 composition extension for explicit monthly heating summary rows.",
  exclusions: Object.freeze([
    "no production orchestrator",
    "no Level 2 full MC001 auditor",
    "no certificate workflow",
    "no CPE generation",
    "no report generation",
    "no UI/API/DB/Worker/deploy/production integration",
    "no new MC001 formulas",
    "no invented inputs",
    "no monthlyBalance.mjs formula change",
    "no Figure 2.18 gammaH branch change",
    "no forced April/September/October recalculation",
    "no full DHW final-energy implementation",
    "no lighting implementation",
    "no cooling-system implementation",
    "no reference-building implementation"
  ]),
  inputPack: Object.freeze({
    ...fixture016.inputPack,
    packMetadata: Object.freeze({
      ...fixture016.inputPack.packMetadata,
      packId: "LEVEL_1_MONTHLY_HEATING_INPUT_PACK_FIXTURE_017",
      source:
        "Reviewed MC001 Physics Engine validation fixtures 006 and 016 with explicit monthly heating blockers",
      validationScope:
        "transmission_ventilation_final_primary_co2_monthly_heating_with_explicit_blockers",
      createdFor: "FIXTURE_017_LEVEL_1_MONTHLY_HEATING_ORCHESTRATION"
    }),
    monthlyHeating: Object.freeze({
      unit: "kWh",
      monthlyRows,
      annualDisplayedHeatingNeed: fixture006.expected.annualQHndKWh,
      blockedMonths,
      ambiguousMonths,
      source:
        "Fixture 006 reviewed Anexa B page 522 monthly heating rows and annual displayed QHnd reconciliation."
    })
  }),
  expected: Object.freeze({
    orchestratorType: "MC001_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR",
    level: "LEVEL_1_CORE_COMPONENT_ORCHESTRATION",
    isProductionOrchestrator: false,
    isCertificateWorkflow: false,
    validatedMonthCount: 9,
    blockedMonthCount: 2,
    ambiguousMonthCount: 1,
    validatedMonths: Object.freeze([
      "Ian",
      "Feb",
      "Mar",
      "Mai",
      "Iun",
      "Iul",
      "Aug",
      "Noi",
      "Dec"
    ]),
    blockedMonths: Object.freeze(["Apr", "Sep"]),
    ambiguousMonths: Object.freeze(["Oct"]),
    annualDisplayedHeatingNeed: fixture006.expected.annualQHndKWh,
    isCompleteAnnualMethodology: false,
    methodologyStatus: "PARTIAL_WITH_BLOCKED_AND_AMBIGUOUS_MONTHS",
    validationStatus: "LEVEL_1_CORE_VALIDATED_WITH_EXPLICIT_BLOCKERS"
  })
});
