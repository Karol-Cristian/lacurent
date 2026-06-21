import { calculatePrimaryCO2Summary, STATUS_CALCULATED } from "./finalPrimaryCo2Indicators.mjs";
import { calculateTotalTransmissionCoefficient } from "./transmissionCoefficients.mjs";
import { calculateMonthlyVentilationTransfer } from "./ventilationCoefficients.mjs";

const ORCHESTRATOR_TYPE = "MC001_LEVEL_1_CORE_COMPONENT_ORCHESTRATOR";
const LEVEL = "LEVEL_1_CORE_COMPONENT_ORCHESTRATION";
const NEXT_REQUIRED_STEP = "KEEP_LEVEL_2_BLOCKED_UNTIL_FULL_EXPLICIT_MC001_AUDIT_INPUTS_EXIST";

const EXPECTED_UNITS = Object.freeze({
  transmission: "W/K",
  ventilation: "W/K",
  finalEnergy: "kWh",
  primaryEnergy: "kWh",
  co2: "kgCO2",
  conditionedArea: "m2",
  monthlyHeating: "kWh"
});

const ALLOWED_BUILDING_USE_CATEGORIES = new Set(["education"]);

const REQUIRED_SECTIONS = Object.freeze([
  "packMetadata",
  "buildingContext",
  "transmission",
  "ventilation",
  "finalPrimaryCo2",
  "explicitBlockers"
]);

const REQUIRED_BLOCKER_IDS = Object.freeze([
  "april_boundary_heating_period_gap",
  "september_boundary_heating_period_gap",
  "october_mc001_worked_example_ambiguity",
  "full_dhw_final_energy_chain_blocked",
  "annual_dhw_distribution_loss_basis_blocked",
  "general_rer_methodology_blocked",
  "certificate_cpe_workflow_blocked",
  "lighting_blocked",
  "cooling_systems_blocked",
  "reference_building_blocked"
]);

const ALLOWED_MONTHLY_HEATING_STATUSES = new Set([
  "validated",
  "blocked",
  "ambiguous",
  "display_reconciliation_only"
]);

const CALENDAR_MONTH_COUNT = 12;
const CALENDAR_MONTHS = Object.freeze([
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Noi",
  "Dec"
]);
const REQUIRED_MONTHLY_HEATING_MONTH_STATUSES = Object.freeze({
  Apr: "blocked",
  Sep: "blocked",
  Oct: "ambiguous"
});
const MONTHLY_HEATING_METHODOLOGY_STATUS = "PARTIAL_WITH_BLOCKED_AND_AMBIGUOUS_MONTHS";
const READINESS_CLAIMS = Object.freeze({
  isFullMc001AuditReady: false,
  isLevel2Ready: false,
  isCertificateCpeWorkflowReady: false,
  isProductionOrchestrationReady: false
});
const FORBIDDEN_READINESS_CLAIM_FIELDS = Object.freeze([
  "isFullMc001AuditReady",
  "isLevel2Ready",
  "isCertificateCpeWorkflowReady",
  "isProductionOrchestrationReady",
  "fullMc001AuditReady",
  "level2Ready",
  "certificateCpeReady",
  "productionOrchestrationReady"
]);

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertObject(value, path) {
  if (!isObject(value)) {
    throw new Error(`${path} must be an object`);
  }
}

function assertRequiredField(value, path) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  ) {
    throw new Error(`Missing required field: ${path}`);
  }
}

function assertFiniteNumber(value, path) {
  assertRequiredField(value, path);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
}

function assertFiniteNonNegativeNumber(value, path) {
  assertFiniteNumber(value, path);
  if (value < 0) {
    throw new Error(`${path} must be a finite non-negative number`);
  }
}

function assertFinitePositiveNumber(value, path) {
  assertFiniteNumber(value, path);
  if (value <= 0) {
    throw new Error(`${path} must be a finite positive number`);
  }
}

function assertArray(value, path) {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
}

function assertNonEmptyArray(value, path) {
  assertArray(value, path);
  if (value.length === 0) {
    throw new Error(`${path} must contain at least one row`);
  }
}

function assertExactUnit(value, expectedUnit, path) {
  assertRequiredField(value, path);
  if (value !== expectedUnit) {
    throw new Error(`${path} must be ${expectedUnit}`);
  }
}

function assertOptionalTolerance(value, path) {
  if (value !== undefined) {
    assertFiniteNonNegativeNumber(value, path);
  }
}

function requiredSection(inputPack, sectionName) {
  const section = inputPack?.[sectionName];
  if (section === undefined || section === null) {
    throw new Error(`Missing required section: ${sectionName}`);
  }
  return section;
}

function rejectReadinessClaims(inputPack) {
  for (const field of FORBIDDEN_READINESS_CLAIM_FIELDS) {
    if (inputPack[field] === true) {
      throw new Error(`${field} must not claim readiness`);
    }
  }

  if (inputPack.readinessClaims !== undefined) {
    assertObject(inputPack.readinessClaims, "readinessClaims");
    for (const [field, value] of Object.entries(inputPack.readinessClaims)) {
      if (value === true) {
        throw new Error(`readinessClaims.${field} must not claim readiness`);
      }
    }
  }
}

function validatePackMetadata(packMetadata) {
  assertObject(packMetadata, "packMetadata");
  for (const field of ["packId", "source", "methodology", "validationScope", "createdFor"]) {
    assertRequiredField(packMetadata[field], `packMetadata.${field}`);
  }
}

function validateBuildingContext(buildingContext) {
  assertObject(buildingContext, "buildingContext");
  assertRequiredField(buildingContext.buildingUseCategory, "buildingContext.buildingUseCategory");
  if (!ALLOWED_BUILDING_USE_CATEGORIES.has(buildingContext.buildingUseCategory)) {
    throw new Error(
      `buildingContext.buildingUseCategory is not validated for Level 1: ${buildingContext.buildingUseCategory}`
    );
  }
  assertFinitePositiveNumber(
    buildingContext.conditionedFloorArea,
    "buildingContext.conditionedFloorArea"
  );
  assertExactUnit(
    buildingContext.areaUnit,
    EXPECTED_UNITS.conditionedArea,
    "buildingContext.areaUnit"
  );
  assertRequiredField(buildingContext.calculationBasis, "buildingContext.calculationBasis");
}

function validateTransmission(transmission) {
  assertObject(transmission, "transmission");
  for (const field of ["Hd", "Hg", "Hu", "Ha", "expectedHtr"]) {
    assertFiniteNonNegativeNumber(transmission[field], `transmission.${field}`);
  }
  assertExactUnit(transmission.unit, EXPECTED_UNITS.transmission, "transmission.unit");
  assertRequiredField(transmission.source, "transmission.source");
  assertOptionalTolerance(transmission.toleranceAbs, "transmission.toleranceAbs");
}

function validateVentilation(ventilation) {
  assertObject(ventilation, "ventilation");
  assertFiniteNonNegativeNumber(ventilation.Hve, "ventilation.Hve");
  assertExactUnit(ventilation.unit, EXPECTED_UNITS.ventilation, "ventilation.unit");
  assertRequiredField(ventilation.source, "ventilation.source");
  assertOptionalTolerance(
    ventilation.monthlyQveToleranceAbsKWh,
    "ventilation.monthlyQveToleranceAbsKWh"
  );

  if (ventilation.monthlyVentilationTransferRows !== undefined) {
    assertArray(
      ventilation.monthlyVentilationTransferRows,
      "ventilation.monthlyVentilationTransferRows"
    );
    ventilation.monthlyVentilationTransferRows.forEach((row, index) => {
      const path = `ventilation.monthlyVentilationTransferRows[${index}]`;
      assertObject(row, path);
      assertRequiredField(row.month, `${path}.month`);
      assertFiniteNonNegativeNumber(row.hve, `${path}.hve`);
      assertFiniteNumber(row.thetaInt, `${path}.thetaInt`);
      assertFiniteNumber(row.thetaExternalMonthly, `${path}.thetaExternalMonthly`);
      assertFinitePositiveNumber(row.deltaHours, `${path}.deltaHours`);
      assertRequiredField(row.thetaExternalMonthlySource, `${path}.thetaExternalMonthlySource`);
      assertFiniteNumber(row.expectedQveKWh, `${path}.expectedQveKWh`);
      assertOptionalTolerance(row.toleranceAbs, `${path}.toleranceAbs`);
    });
  }
}

function validateFinalPrimaryCo2(finalPrimaryCo2, buildingContext) {
  assertObject(finalPrimaryCo2, "finalPrimaryCo2");
  assertNonEmptyArray(
    finalPrimaryCo2.serviceFinalEnergyRows,
    "finalPrimaryCo2.serviceFinalEnergyRows"
  );
  assertObject(finalPrimaryCo2.primaryFactors, "finalPrimaryCo2.primaryFactors");
  assertObject(finalPrimaryCo2.co2Factors, "finalPrimaryCo2.co2Factors");
  assertFinitePositiveNumber(finalPrimaryCo2.conditionedArea, "finalPrimaryCo2.conditionedArea");
  if (finalPrimaryCo2.conditionedArea !== buildingContext.conditionedFloorArea) {
    throw new Error("finalPrimaryCo2.conditionedArea must match buildingContext.conditionedFloorArea");
  }
  assertFiniteNonNegativeNumber(
    finalPrimaryCo2.expectedFinalEnergyTotalKWh,
    "finalPrimaryCo2.expectedFinalEnergyTotalKWh"
  );
  assertFiniteNonNegativeNumber(
    finalPrimaryCo2.expectedPrimaryTotalKWh,
    "finalPrimaryCo2.expectedPrimaryTotalKWh"
  );
  assertOptionalTolerance(finalPrimaryCo2.toleranceAbs, "finalPrimaryCo2.toleranceAbs");
  assertOptionalTolerance(finalPrimaryCo2.co2ToleranceAbs, "finalPrimaryCo2.co2ToleranceAbs");
  assertRequiredField(finalPrimaryCo2.source, "finalPrimaryCo2.source");

  if (finalPrimaryCo2.expectedRenewablePrimaryKWh !== undefined) {
    assertFiniteNonNegativeNumber(
      finalPrimaryCo2.expectedRenewablePrimaryKWh,
      "finalPrimaryCo2.expectedRenewablePrimaryKWh"
    );
  }
  if (finalPrimaryCo2.expectedNonRenewablePrimaryKWh !== undefined) {
    assertFiniteNonNegativeNumber(
      finalPrimaryCo2.expectedNonRenewablePrimaryKWh,
      "finalPrimaryCo2.expectedNonRenewablePrimaryKWh"
    );
  }
  if (finalPrimaryCo2.expectedCO2TotalKg !== undefined) {
    assertFiniteNonNegativeNumber(
      finalPrimaryCo2.expectedCO2TotalKg,
      "finalPrimaryCo2.expectedCO2TotalKg"
    );
  }

  finalPrimaryCo2.serviceFinalEnergyRows.forEach((row, index) => {
    const path = `finalPrimaryCo2.serviceFinalEnergyRows[${index}]`;
    assertObject(row, path);
    assertRequiredField(row.serviceKey, `${path}.serviceKey`);
    assertRequiredField(row.energyCarrierKey, `${path}.energyCarrierKey`);
    assertFiniteNonNegativeNumber(row.finalEnergyKWh, `${path}.finalEnergyKWh`);
    assertRequiredField(row.source, `${path}.source`);

    if (!finalPrimaryCo2.primaryFactors[row.energyCarrierKey]) {
      throw new Error(`Missing required field: finalPrimaryCo2.primaryFactors.${row.energyCarrierKey}`);
    }
    if (!finalPrimaryCo2.co2Factors[row.energyCarrierKey]) {
      throw new Error(`Missing required field: finalPrimaryCo2.co2Factors.${row.energyCarrierKey}`);
    }

    const primaryFactor = finalPrimaryCo2.primaryFactors[row.energyCarrierKey];
    const co2Factor = finalPrimaryCo2.co2Factors[row.energyCarrierKey];
    assertObject(
      primaryFactor,
      `finalPrimaryCo2.primaryFactors.${row.energyCarrierKey}`
    );
    assertObject(co2Factor, `finalPrimaryCo2.co2Factors.${row.energyCarrierKey}`);
    assertRequiredField(
      primaryFactor.sourcePrimaryTable,
      `finalPrimaryCo2.primaryFactors.${row.energyCarrierKey}.sourcePrimaryTable`
    );
    assertFiniteNonNegativeNumber(
      primaryFactor.renewablePrimaryEnergyFactor,
      `finalPrimaryCo2.primaryFactors.${row.energyCarrierKey}.renewablePrimaryEnergyFactor`
    );
    assertFiniteNonNegativeNumber(
      primaryFactor.nonRenewablePrimaryEnergyFactor,
      `finalPrimaryCo2.primaryFactors.${row.energyCarrierKey}.nonRenewablePrimaryEnergyFactor`
    );
    assertFiniteNonNegativeNumber(
      primaryFactor.totalPrimaryEnergyFactor,
      `finalPrimaryCo2.primaryFactors.${row.energyCarrierKey}.totalPrimaryEnergyFactor`
    );
    if (
      Math.abs(
        primaryFactor.totalPrimaryEnergyFactor -
          (primaryFactor.renewablePrimaryEnergyFactor +
            primaryFactor.nonRenewablePrimaryEnergyFactor)
      ) > 1e-9
    ) {
      throw new Error(
        `finalPrimaryCo2.primaryFactors.${row.energyCarrierKey}.totalPrimaryEnergyFactor must equal renewable plus non-renewable factors`
      );
    }
    assertRequiredField(
      co2Factor.sourceCO2Table,
      `finalPrimaryCo2.co2Factors.${row.energyCarrierKey}.sourceCO2Table`
    );
    assertFiniteNonNegativeNumber(
      co2Factor.co2EmissionFactor,
      `finalPrimaryCo2.co2Factors.${row.energyCarrierKey}.co2EmissionFactor`
    );
  });
}

function validateExplicitBlockers(explicitBlockers) {
  assertArray(explicitBlockers, "explicitBlockers");
  const blockerIds = explicitBlockers.map((blocker, index) => {
    const path = `explicitBlockers[${index}]`;
    assertObject(blocker, path);
    assertRequiredField(blocker.blockerId, `${path}.blockerId`);
    assertRequiredField(blocker.area, `${path}.area`);
    assertRequiredField(blocker.status, `${path}.status`);
    assertRequiredField(blocker.source, `${path}.source`);
    assertRequiredField(blocker.reason, `${path}.reason`);
    return blocker.blockerId;
  });

  for (const blockerId of REQUIRED_BLOCKER_IDS) {
    if (!blockerIds.includes(blockerId)) {
      throw new Error(`Missing required blocker: ${blockerId}`);
    }
  }
}

function monthName(value) {
  return typeof value === "string" ? value : value?.month;
}

function validateMonthlyHeatingRows(monthlyHeating) {
  assertArray(monthlyHeating.monthlyRows, "monthlyHeating.monthlyRows");
  if (monthlyHeating.monthlyRows.length !== CALENDAR_MONTH_COUNT) {
    throw new Error("monthlyHeating.monthlyRows must contain 12 calendar months");
  }

  const seenMonths = new Set();
  const blockedMonths = new Set(monthlyHeating.blockedMonths.map(monthName));
  const ambiguousMonths = new Set(monthlyHeating.ambiguousMonths.map(monthName));
  const expectedMonths = new Set(CALENDAR_MONTHS);

  monthlyHeating.monthlyRows.forEach((row, index) => {
    const path = `monthlyHeating.monthlyRows[${index}]`;
    assertObject(row, path);
    assertRequiredField(row.month, `${path}.month`);
    if (!expectedMonths.has(row.month)) {
      throw new Error(`${path}.month is not a recognized calendar month: ${row.month}`);
    }
    assertFiniteNonNegativeNumber(row.QHht, `${path}.QHht`);
    assertFiniteNonNegativeNumber(row.QHgn, `${path}.QHgn`);
    assertRequiredField(row.status, `${path}.status`);

    if (seenMonths.has(row.month)) {
      throw new Error(`Duplicate monthly heating row: ${row.month}`);
    }
    seenMonths.add(row.month);

    if (!ALLOWED_MONTHLY_HEATING_STATUSES.has(row.status)) {
      throw new Error(`${path}.status must be one of the allowed monthly heating statuses`);
    }

    if (row.status === "validated" || row.status === "display_reconciliation_only") {
      assertFiniteNonNegativeNumber(row.QHnd, `${path}.QHnd`);
    } else if (row.QHnd !== null) {
      assertFiniteNonNegativeNumber(row.QHnd, `${path}.QHnd`);
    }

    if (row.sourceDisplayedQHnd !== undefined) {
      assertFiniteNonNegativeNumber(row.sourceDisplayedQHnd, `${path}.sourceDisplayedQHnd`);
    }

    if (row.status === "blocked") {
      assertRequiredField(row.reason, `${path}.reason`);
      if (!blockedMonths.has(row.month)) {
        throw new Error(`${path}.month is blocked but not listed in monthlyHeating.blockedMonths`);
      }
    }

    if (row.status === "ambiguous") {
      assertRequiredField(row.reason, `${path}.reason`);
      if (!ambiguousMonths.has(row.month)) {
        throw new Error(
          `${path}.month is ambiguous but not listed in monthlyHeating.ambiguousMonths`
        );
      }
    }
  });

  for (const month of CALENDAR_MONTHS) {
    if (!seenMonths.has(month)) {
      throw new Error(`Missing monthly heating row: ${month}`);
    }
  }

  for (const [month, expectedStatus] of Object.entries(REQUIRED_MONTHLY_HEATING_MONTH_STATUSES)) {
    const row = monthlyHeating.monthlyRows.find((monthlyRow) => monthlyRow.month === month);
    if (!row || row.status !== expectedStatus) {
      throw new Error(`${month} monthly heating row must remain ${expectedStatus}`);
    }
  }

  for (const blockedMonth of blockedMonths) {
    const row = monthlyHeating.monthlyRows.find((monthlyRow) => monthlyRow.month === blockedMonth);
    if (!row || row.status !== "blocked") {
      throw new Error(`Missing blocked monthly heating row: ${blockedMonth}`);
    }
  }

  for (const ambiguousMonth of ambiguousMonths) {
    const row = monthlyHeating.monthlyRows.find(
      (monthlyRow) => monthlyRow.month === ambiguousMonth
    );
    if (!row || row.status !== "ambiguous") {
      throw new Error(`Missing ambiguous monthly heating row: ${ambiguousMonth}`);
    }
  }
}

function validateMonthlyHeating(monthlyHeating) {
  assertObject(monthlyHeating, "monthlyHeating");
  assertExactUnit(
    monthlyHeating.unit,
    EXPECTED_UNITS.monthlyHeating,
    "monthlyHeating.unit"
  );
  assertFiniteNonNegativeNumber(
    monthlyHeating.annualDisplayedHeatingNeed,
    "monthlyHeating.annualDisplayedHeatingNeed"
  );
  assertArray(monthlyHeating.blockedMonths, "monthlyHeating.blockedMonths");
  assertArray(monthlyHeating.ambiguousMonths, "monthlyHeating.ambiguousMonths");
  assertRequiredField(monthlyHeating.source, "monthlyHeating.source");
  if (monthlyHeating.isCompleteAnnualMethodology === true) {
    throw new Error("monthlyHeating.isCompleteAnnualMethodology must remain false");
  }
  if (
    monthlyHeating.methodologyStatus !== undefined &&
    monthlyHeating.methodologyStatus !== MONTHLY_HEATING_METHODOLOGY_STATUS
  ) {
    throw new Error(
      `monthlyHeating.methodologyStatus must be ${MONTHLY_HEATING_METHODOLOGY_STATUS}`
    );
  }
  validateMonthlyHeatingRows(monthlyHeating);
}

export function validateMc001Level1CoreInputPack(inputPack) {
  assertObject(inputPack, "inputPack");
  rejectReadinessClaims(inputPack);
  for (const sectionName of REQUIRED_SECTIONS) {
    requiredSection(inputPack, sectionName);
  }

  validatePackMetadata(inputPack.packMetadata);
  validateBuildingContext(inputPack.buildingContext);
  validateTransmission(inputPack.transmission);
  validateVentilation(inputPack.ventilation);
  validateFinalPrimaryCo2(inputPack.finalPrimaryCo2, inputPack.buildingContext);
  validateExplicitBlockers(inputPack.explicitBlockers);
  if (inputPack.monthlyHeating !== undefined) {
    validateMonthlyHeating(inputPack.monthlyHeating);
  }

  return true;
}

function delta(calculated, expected) {
  return Math.abs(calculated - expected);
}

export function summarizeLevel1Transmission(transmission) {
  const result = calculateTotalTransmissionCoefficient({
    hd: transmission.Hd,
    hg: transmission.Hg,
    hu: transmission.Hu,
    ha: transmission.Ha,
    applicability: {
      hgApplicable: true,
      huApplicable: true,
      haApplicable: true
    }
  });
  const absoluteDelta = delta(result.value, transmission.expectedHtr);
  const toleranceAbs = transmission.toleranceAbs ?? 1e-9;

  return {
    status: absoluteDelta <= toleranceAbs ? "validated" : "outside_tolerance",
    helper: "calculateTotalTransmissionCoefficient",
    calculatedHtr: result.value,
    expectedHtr: transmission.expectedHtr,
    absoluteDelta,
    toleranceAbs,
    unit: result.unit,
    inputs: {
      Hd: transmission.Hd,
      Hg: transmission.Hg,
      Hu: transmission.Hu,
      Ha: transmission.Ha
    },
    trace: result.trace
  };
}

export function summarizeLevel1Ventilation(ventilation) {
  const rows = (ventilation.monthlyVentilationTransferRows ?? []).map((row) => {
    const result = calculateMonthlyVentilationTransfer({
      hve: row.hve,
      thetaInt: row.thetaInt,
      thetaExternalMonthly: row.thetaExternalMonthly,
      deltaHours: row.deltaHours,
      thetaExternalMonthlySource: row.thetaExternalMonthlySource
    });
    const absoluteDelta = delta(result.value, row.expectedQveKWh);
    const toleranceAbs = row.toleranceAbs ?? ventilation.monthlyQveToleranceAbsKWh ?? 1e-9;

    return {
      month: row.month,
      status: absoluteDelta <= toleranceAbs ? "validated" : "outside_tolerance",
      calculatedQveKWh: result.value,
      expectedQveKWh: row.expectedQveKWh,
      absoluteDelta,
      toleranceAbs,
      unit: result.unit,
      helper: "calculateMonthlyVentilationTransfer",
      trace: result.trace
    };
  });

  return {
    status: rows.every((row) => row.status === "validated") ? "validated" : "partial",
    Hve: ventilation.Hve,
    unit: ventilation.unit,
    source: ventilation.source,
    monthlyVentilationTransferRows: rows,
    blockedBranches: cloneSerializable(ventilation.blockedBranches ?? [])
  };
}

export function summarizeLevel1FinalPrimaryCo2(finalPrimaryCo2) {
  const result = calculatePrimaryCO2Summary(
    finalPrimaryCo2.serviceFinalEnergyRows,
    finalPrimaryCo2.conditionedArea
  );
  const finalDelta = delta(result.finalEnergy.valueKWh, finalPrimaryCo2.expectedFinalEnergyTotalKWh);
  const primaryDelta = delta(
    result.primaryEnergy.totalPrimaryEnergyKWh,
    finalPrimaryCo2.expectedPrimaryTotalKWh
  );
  const co2Delta =
    finalPrimaryCo2.expectedCO2TotalKg === undefined || result.co2Emissions.totalCO2Kg === null
      ? null
      : delta(result.co2Emissions.totalCO2Kg, finalPrimaryCo2.expectedCO2TotalKg);
  const toleranceAbs = finalPrimaryCo2.toleranceAbs ?? 1e-9;
  const co2ToleranceAbs = finalPrimaryCo2.co2ToleranceAbs ?? toleranceAbs;
  const renewableDelta =
    finalPrimaryCo2.expectedRenewablePrimaryKWh === undefined
      ? null
      : delta(
          result.primaryEnergy.renewablePrimaryEnergyKWh,
          finalPrimaryCo2.expectedRenewablePrimaryKWh
        );
  const nonRenewableDelta =
    finalPrimaryCo2.expectedNonRenewablePrimaryKWh === undefined
      ? null
      : delta(
          result.primaryEnergy.nonRenewablePrimaryEnergyKWh,
          finalPrimaryCo2.expectedNonRenewablePrimaryKWh
        );

  const factorMismatches = [];
  for (const entry of result.primaryEnergy.entries) {
    const explicitFactor = finalPrimaryCo2.primaryFactors[entry.energyCarrierKey];
    if (
      !explicitFactor ||
      entry.renewablePrimaryEnergyFactor !== explicitFactor.renewablePrimaryEnergyFactor ||
      entry.nonRenewablePrimaryEnergyFactor !==
        explicitFactor.nonRenewablePrimaryEnergyFactor ||
      entry.totalPrimaryEnergyFactor !== explicitFactor.totalPrimaryEnergyFactor ||
      entry.sourceTable !== explicitFactor.sourcePrimaryTable
    ) {
      factorMismatches.push(`primary:${entry.energyCarrierKey}`);
    }
  }
  for (const entry of result.co2Emissions.entries) {
    const explicitFactor = finalPrimaryCo2.co2Factors[entry.energyCarrierKey];
    if (
      !explicitFactor ||
      entry.co2EmissionFactor !== explicitFactor.co2EmissionFactor ||
      entry.co2SourceTable !== explicitFactor.sourceCO2Table
    ) {
      factorMismatches.push(`co2:${entry.energyCarrierKey}`);
    }
  }

  const splitWithinTolerance =
    (renewableDelta === null || renewableDelta <= toleranceAbs) &&
    (nonRenewableDelta === null || nonRenewableDelta <= toleranceAbs);

  return {
    status:
      result.status === STATUS_CALCULATED &&
      finalDelta <= toleranceAbs &&
      primaryDelta <= toleranceAbs &&
      splitWithinTolerance &&
      (co2Delta === null || co2Delta <= co2ToleranceAbs) &&
      factorMismatches.length === 0
        ? "validated"
        : "partial",
    helper: "calculatePrimaryCO2Summary",
    finalEnergy: {
      calculatedKWh: result.finalEnergy.valueKWh,
      expectedKWh: finalPrimaryCo2.expectedFinalEnergyTotalKWh,
      absoluteDelta: finalDelta,
      unit: "kWh"
    },
    primaryEnergy: {
      calculatedRenewableKWh: result.primaryEnergy.renewablePrimaryEnergyKWh,
      expectedRenewableKWh: finalPrimaryCo2.expectedRenewablePrimaryKWh ?? null,
      renewableAbsoluteDelta: renewableDelta,
      calculatedNonRenewableKWh: result.primaryEnergy.nonRenewablePrimaryEnergyKWh,
      expectedNonRenewableKWh: finalPrimaryCo2.expectedNonRenewablePrimaryKWh ?? null,
      nonRenewableAbsoluteDelta: nonRenewableDelta,
      calculatedTotalKWh: result.primaryEnergy.totalPrimaryEnergyKWh,
      expectedTotalKWh: finalPrimaryCo2.expectedPrimaryTotalKWh,
      absoluteDelta: primaryDelta,
      unit: "kWh"
    },
    co2: {
      calculatedKg: result.co2Emissions.totalCO2Kg,
      expectedKg: finalPrimaryCo2.expectedCO2TotalKg ?? null,
      absoluteDelta: co2Delta,
      unit: "kgCO2",
      relation: "CO2 = Qf * fPtot * fCO2"
    },
    specificIndicators: {
      primary: result.specificPrimaryEnergy,
      co2: result.specificCO2
    },
    factorTrace: {
      status: factorMismatches.length === 0 ? "validated" : "mismatch",
      explicitPrimaryFactors: cloneSerializable(finalPrimaryCo2.primaryFactors),
      explicitCO2Factors: cloneSerializable(finalPrimaryCo2.co2Factors),
      mismatches: factorMismatches
    },
    trace: result.trace
  };
}

export function summarizeLevel1MonthlyHeating(monthlyHeating) {
  const monthlyRows = cloneSerializable(monthlyHeating.monthlyRows);
  const validatedMonths = monthlyRows.filter((row) => row.status === "validated");
  const blockedMonths = monthlyRows.filter((row) => row.status === "blocked");
  const ambiguousMonths = monthlyRows.filter((row) => row.status === "ambiguous");

  return {
    unit: monthlyHeating.unit,
    validatedMonthCount: validatedMonths.length,
    blockedMonthCount: blockedMonths.length,
    ambiguousMonthCount: ambiguousMonths.length,
    validatedMonths,
    blockedMonths,
    ambiguousMonths,
    annualDisplayedHeatingNeed: monthlyHeating.annualDisplayedHeatingNeed,
    isCompleteAnnualMethodology: false,
    methodologyStatus: MONTHLY_HEATING_METHODOLOGY_STATUS,
    source: monthlyHeating.source
  };
}

function splitBlockers(explicitBlockers) {
  const blockers = cloneSerializable(explicitBlockers);
  return {
    blockedComponents: blockers.filter((blocker) => !String(blocker.status).includes("ambiguous")),
    ambiguousComponents: blockers.filter((blocker) => String(blocker.status).includes("ambiguous"))
  };
}

export function createMc001Level1CoreOrchestrator(inputPack) {
  validateMc001Level1CoreInputPack(inputPack);

  const transmissionSummary = summarizeLevel1Transmission(inputPack.transmission);
  const ventilationSummary = summarizeLevel1Ventilation(inputPack.ventilation);
  const finalPrimaryCo2Summary = summarizeLevel1FinalPrimaryCo2(inputPack.finalPrimaryCo2);
  const monthlyHeatingSummary =
    inputPack.monthlyHeating === undefined
      ? null
      : summarizeLevel1MonthlyHeating(inputPack.monthlyHeating);
  const { blockedComponents, ambiguousComponents } = splitBlockers(inputPack.explicitBlockers);
  const validatedCore =
    transmissionSummary.status === "validated" &&
    ventilationSummary.status === "validated" &&
    finalPrimaryCo2Summary.status === "validated";

  return {
    orchestratorType: ORCHESTRATOR_TYPE,
    level: LEVEL,
    isProductionOrchestrator: false,
    isCertificateWorkflow: false,
    readinessClaims: cloneSerializable(READINESS_CLAIMS),
    inputPackId: inputPack.packMetadata.packId,
    transmissionSummary,
    ventilationSummary,
    finalPrimaryCo2Summary,
    ...(monthlyHeatingSummary ? { monthlyHeatingSummary } : {}),
    blockedComponents,
    ambiguousComponents,
    validationStatus: validatedCore
      ? "LEVEL_1_CORE_VALIDATED_WITH_EXPLICIT_BLOCKERS"
      : "LEVEL_1_CORE_PARTIAL_WITH_EXPLICIT_BLOCKERS",
    nextRequiredStep: NEXT_REQUIRED_STEP
  };
}
