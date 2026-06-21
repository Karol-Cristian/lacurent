import { fixture016Level1CoreComponentOrchestrator as fixture016 } from "./fixture016Level1CoreComponentOrchestrator.mjs";
import { fixture017Level1MonthlyHeatingOrchestration as fixture017 } from "./fixture017Level1MonthlyHeatingOrchestration.mjs";

export const fixture018Level1FailClosedHardening = Object.freeze({
  fixtureId: "FIXTURE_018_LEVEL_1_FAIL_CLOSED_HARDENING",
  fixtureType: "level_1_fail_closed_hardening_validation",
  sourceDocument: "MC001-2022",
  sourceNote:
    "Uses Fixture 016 and Fixture 017 Level 1 input packs as positive controls and validates fail-closed mutations against the Level 1 core input contract.",
  scope:
    "Pure Physics Engine Level 1 validation hardening for explicit-input completeness, units, numeric values, monthly-heating blockers, and readiness boundaries.",
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
    "no full DHW final-energy implementation",
    "no lighting implementation",
    "no cooling-system implementation",
    "no reference-building implementation"
  ]),
  hardeningAreas: Object.freeze([
    "required top-level sections",
    "required section fields",
    "finite numeric inputs",
    "explicit unit validation",
    "known building-use category only",
    "monthly heating row status allowlist",
    "April and September boundary-month blockers",
    "October worked-example ambiguity",
    "required explicit blocker preservation",
    "deterministic serializable output",
    "no readiness claims for Level 2, certificate/CPE, or production orchestration"
  ]),
  positiveRegressionFixtures: Object.freeze([
    fixture016.fixtureId,
    fixture017.fixtureId
  ]),
  requiredNegativeCases: Object.freeze([
    "missing buildingContext",
    "missing transmission.Hd",
    "invalid transmission unit",
    "invalid ventilation unit",
    "missing finalPrimaryCo2 service rows",
    "invalid CO2 factor",
    "monthlyHeating with missing month",
    "monthlyHeating with duplicate month",
    "monthlyHeating with invalid status",
    "April incorrectly marked validated",
    "September incorrectly marked validated",
    "October incorrectly marked validated",
    "missing required explicit blocker",
    "string numeric value where number is required",
    "NaN numeric value",
    "Infinity numeric value"
  ]),
  expected: Object.freeze({
    fixture016ValidationStatus: fixture016.expected.validationStatus,
    fixture017ValidationStatus: fixture017.expected.validationStatus,
    transmissionHtrWPerK: fixture016.expected.transmissionHtrWPerK,
    ventilationHveWPerK: fixture016.expected.ventilationHveWPerK,
    finalEnergyTotalKWh: fixture016.expected.finalEnergyTotalKWh,
    primaryEnergyTotalKWh: fixture016.expected.primaryEnergyTotalKWh,
    co2TotalKg: fixture016.expected.co2TotalKg,
    validatedMonthCount: fixture017.expected.validatedMonthCount,
    blockedMonthCount: fixture017.expected.blockedMonthCount,
    ambiguousMonthCount: fixture017.expected.ambiguousMonthCount,
    methodologyStatus: fixture017.expected.methodologyStatus,
    isCompleteAnnualMethodology: false,
    readinessClaims: Object.freeze({
      isFullMc001AuditReady: false,
      isLevel2Ready: false,
      isCertificateCpeWorkflowReady: false,
      isProductionOrchestrationReady: false
    })
  })
});
