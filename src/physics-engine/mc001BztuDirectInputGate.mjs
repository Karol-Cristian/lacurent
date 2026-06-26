export const MC001_BZTU_DIRECT_INPUT_GATE_ID =
  "MC001_BZTU_DIRECT_INPUT_READINESS_GATE_PHASE_H1";

export const BZTU_DIRECT_INPUT_ROOT = "bztuDirectInputs";

export const BZTU_ALLOWED_INPUT_CLASSIFICATIONS = Object.freeze([
  "explicit_methodological_direct_input",
  "validation_fixture_import",
  "expert_override_with_source"
]);

export const BZTU_KNOWN_SOURCE_REFERENCE_IDS = Object.freeze([
  "MC001_2022_2_21_ZTU_MONTHLY_TEMPERATURE",
  "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
  "MC001_2022_2_23_HZTU_TOTAL",
  "MC001_2022_2_24_HZTU_EXTERIOR_COEFFICIENT",
  "MC001_2022_BZTU_APPLICABILITY_NOT_ADJACENT_TO_OTHER_ZTU",
  "MC001_2022_BZTU_MULTIPLE_ADJACENT_ZONES_DISTRIBUTION_FACTOR"
]);

const DIMENSIONLESS_UNITS = new Set(["dimensionless", "-"]);
const ALLOWED_METHODOLOGY_STATUSES = new Set([
  "accepted",
  "reviewed",
  "source_backed",
  "source_backed_methodological_direct_input",
  "validation_fixture_reviewed",
  "expert_override_reviewed",
  "sourced_exception"
]);
const ALLOWED_INPUT_CLASSIFICATIONS = new Set(BZTU_ALLOWED_INPUT_CLASSIFICATIONS);
const KNOWN_SOURCE_REFERENCE_IDS = new Set(BZTU_KNOWN_SOURCE_REFERENCE_IDS);
const PRODUCT_FALLBACK_CLASSIFICATIONS = new Set([
  "hidden_fallback",
  "product_estimate",
  "product_fallback"
]);
const DERIVED_CLASSIFICATIONS = new Set([
  "engine_derived_value",
  "derived_engine_output",
  "normal_raw_auditor_input",
  "auditor_entered"
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function sourceRefsCandidateFrom(entry) {
  if (Object.hasOwn(entry, "sourceRefs")) {
    return entry.sourceRefs;
  }
  if (Object.hasOwn(entry.provenance ?? {}, "sourceRefs")) {
    return entry.provenance.sourceRefs;
  }
  if (Object.hasOwn(entry.bztuProvenance ?? {}, "sourceRefs")) {
    return entry.bztuProvenance.sourceRefs;
  }
  return null;
}

function sourceRefsFrom(entry) {
  const sourceRefs = sourceRefsCandidateFrom(entry);
  if (Array.isArray(sourceRefs)) {
    return sourceRefs;
  }
  return [];
}

function sourceRefsIssueFor(entry) {
  const sourceRefs = sourceRefsCandidateFrom(entry);

  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) {
    return issue(
      "rejected",
      "rejected_bztu_missing_source_refs",
      "BZTU source/provenance must include at least one source reference"
    );
  }

  if (!sourceRefs.every(hasRequiredString)) {
    return issue(
      "rejected",
      "rejected_bztu_invalid_source_refs",
      "BZTU source/provenance sourceRefs must be non-empty strings"
    );
  }

  return null;
}

function sourceFrom(entry) {
  return entry.source ?? entry.provenance?.source ?? entry.bztuSource ?? null;
}

function traceIdFrom(entry) {
  return entry.traceId ?? entry.provenance?.traceId ?? entry.bztuProvenance?.traceId ?? null;
}

function sourceLocatorFrom(entry) {
  return entry.sourceLocator ?? entry.provenance?.sourceLocator ?? null;
}

const SOURCE_LOCATOR_FIELDS = Object.freeze([
  "document",
  "documentId",
  "file",
  "path",
  "page",
  "pageRange",
  "section",
  "table",
  "figure",
  "equation",
  "relation",
  "row",
  "annex",
  "locator"
]);

function locatorFieldIsUseful(value) {
  return hasRequiredString(value) || (typeof value === "number" && Number.isFinite(value));
}

function locatorIsPresent(locator) {
  if (hasRequiredString(locator)) {
    return true;
  }

  if (!isObject(locator)) {
    return false;
  }

  return SOURCE_LOCATOR_FIELDS.some((field) => locatorFieldIsUseful(locator[field]));
}

function sourceLocatorKey(locator) {
  if (locator === undefined || locator === null) {
    return "";
  }
  if (typeof locator === "string") {
    return locator;
  }
  return JSON.stringify(locator);
}

function sourceRefsKey(sourceRefs) {
  return [...sourceRefs].sort().join("|");
}

function issue(status, code, message, extra = {}) {
  return {
    status,
    code,
    message,
    ...extra
  };
}

function diagnosticFromIssue(entryId, entryPath, entryIssue) {
  return {
    level: entryIssue.status,
    code: entryIssue.code,
    message: entryIssue.message,
    componentId: "bztu",
    entryId,
    path: entryPath
  };
}

function blockerFromIssue(entry, entryPath, entryIssue) {
  return {
    itemType: "bztu_direct_input",
    componentId: "bztu",
    entryId: entry.entryId,
    recordId: entry.recordId ?? null,
    status: entryIssue.code,
    readinessStatus: entryIssue.status,
    value: null,
    unit: entry.unit ?? null,
    sourceRefs: Object.freeze([...(entry.sourceRefs ?? [])]),
    diagnosticCode: entryIssue.code,
    reason: entryIssue.message,
    path: entryPath
  };
}

function resultStatusFromIssues(issues) {
  if (issues.length === 0) {
    return "accepted";
  }
  if (issues.some((entryIssue) => entryIssue.status === "rejected")) {
    return "rejected";
  }
  if (issues.some((entryIssue) => entryIssue.status === "ambiguous")) {
    return "ambiguous";
  }
  return "blocked";
}

function recordIsKnown(recordId, knownRecordIds) {
  return knownRecordIds.has(recordId);
}

function normalizeEntry(rawEntry, index) {
  const path = `${BZTU_DIRECT_INPUT_ROOT}[${index}]`;
  const entryId = rawEntry?.entryId ?? rawEntry?.bztuInputId ?? `bztu_direct_input_${index}`;
  const sourceRefs = sourceRefsFrom(rawEntry);
  return {
    entryId,
    path,
    rawEntry,
    value: rawEntry?.value ?? rawEntry?.bztu,
    unit: rawEntry?.unit ?? rawEntry?.bztuUnit,
    month: rawEntry?.month,
    ztuZoneId: rawEntry?.ztuZoneId ?? rawEntry?.ztuId ?? rawEntry?.adjacentNonClimatizedZoneId,
    source: sourceFrom(rawEntry),
    sourceRefs,
    sourceLocator: sourceLocatorFrom(rawEntry),
    methodologyStatus: rawEntry?.methodologyStatus,
    inputClassification: rawEntry?.inputClassification,
    recordId: rawEntry?.recordId,
    traceId: traceIdFrom(rawEntry),
    reviewStatus: rawEntry?.reviewStatus,
    applicability: rawEntry?.applicability,
    adjacentConditionedZoneRelation: rawEntry?.adjacentConditionedZoneRelation,
    distributionFactor: rawEntry?.distributionFactor,
    distributionFactorSource: rawEntry?.distributionFactorSource,
    distributionFactorSourceRefs: rawEntry?.distributionFactorSourceRefs,
    calculationPeriod:
      rawEntry?.calculationPeriod ?? rawEntry?.applicability?.calculationPeriod,
    sourcedNonMonthlyException:
      rawEntry?.sourcedNonMonthlyException ??
      rawEntry?.applicability?.sourcedNonMonthlyException,
    sourcedRangeException:
      rawEntry?.sourcedRangeException ?? rawEntry?.applicability?.sourcedRangeException,
    owner: rawEntry?.owner
  };
}

function monthIsValid(month) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function hasDistributionFactor(entry) {
  return (
    isObject(entry.distributionFactor) &&
    (hasRequiredString(entry.distributionFactor.source) ||
      hasRequiredString(entry.distributionFactorSource) ||
      (Array.isArray(entry.distributionFactorSourceRefs) &&
        entry.distributionFactorSourceRefs.length > 0) ||
      (Array.isArray(entry.distributionFactor.sourceRefs) &&
        entry.distributionFactor.sourceRefs.length > 0))
  );
}

function validateEntry(rawEntry, index, knownRecordIds) {
  const entry = normalizeEntry(rawEntry, index);
  const issues = [];

  if (!isObject(rawEntry)) {
    issues.push(
      issue("rejected", "rejected_bztu_entry_not_object", `${entry.path} must be an object`)
    );
    return { entry, status: "rejected", issues };
  }

  if (PRODUCT_FALLBACK_CLASSIFICATIONS.has(entry.inputClassification) ||
    entry.owner === "product_estimate" ||
    entry.owner === "product_fallback") {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_product_fallback",
        "BZTU product estimates, hidden fallbacks, and product fallbacks cannot become MC001 validation input"
      )
    );
  }

  if (DERIVED_CLASSIFICATIONS.has(entry.inputClassification)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_derived_or_raw_input",
        "BZTU cannot be supplied as normal raw auditor input or engine-derived output"
      )
    );
  }

  if (!ALLOWED_INPUT_CLASSIFICATIONS.has(entry.inputClassification)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_input_classification",
        "BZTU inputClassification must be explicit_methodological_direct_input, validation_fixture_import, or expert_override_with_source"
      )
    );
  }

  if (typeof entry.value !== "number") {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_value_not_numeric",
        "BZTU value must be a finite numeric value and numeric strings are not accepted"
      )
    );
  } else if (!Number.isFinite(entry.value)) {
    issues.push(
      issue("rejected", "rejected_bztu_value_not_finite", "BZTU value must be finite")
    );
  } else if (
    (entry.value < 0 || entry.value > 1) &&
    entry.sourcedRangeException !== true
  ) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_outside_expected_range",
        "BZTU value must normally be within 0..1 unless a sourced exception is supplied"
      )
    );
  }

  if (!hasRequiredString(entry.unit)) {
    issues.push(issue("rejected", "rejected_bztu_missing_unit", "BZTU unit is required"));
  } else if (!DIMENSIONLESS_UNITS.has(entry.unit)) {
    issues.push(
      issue("rejected", "rejected_bztu_invalid_unit", "BZTU unit must be dimensionless or -")
    );
  }

  if (!monthIsValid(entry.month)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_missing_month",
        "BZTU must identify month m as an integer from 1 to 12"
      )
    );
  }

  if (!hasRequiredString(entry.ztuZoneId)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_missing_ztu_zone",
        "BZTU must identify the adjacent non-climatized ztu zone"
      )
    );
  }

  if (!hasRequiredString(entry.source)) {
    issues.push(
      issue("rejected", "rejected_bztu_missing_source", "BZTU source is required")
    );
  }

  const sourceRefsIssue = sourceRefsIssueFor(rawEntry);
  if (sourceRefsIssue) {
    issues.push(sourceRefsIssue);
  }

  if (!locatorIsPresent(entry.sourceLocator)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_missing_source_locator",
        "BZTU source locator is required"
      )
    );
  }

  if (!hasRequiredString(entry.methodologyStatus)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_missing_methodology_status",
        "BZTU methodologyStatus is required"
      )
    );
  } else if (!ALLOWED_METHODOLOGY_STATUSES.has(entry.methodologyStatus)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_unsupported_methodology_status",
        `BZTU methodologyStatus is not supported: ${entry.methodologyStatus}`
      )
    );
  }

  if (!hasRequiredString(entry.recordId)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_missing_record_id",
        "BZTU must include a traceable record id"
      )
    );
  } else if (!recordIsKnown(entry.recordId, knownRecordIds)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_unknown_record_id",
        `BZTU record id is not recognized for Phase H1: ${entry.recordId}`
      )
    );
  }

  if (!isObject(entry.applicability)) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_missing_applicability",
        "BZTU applicability metadata is required"
      )
    );
  } else {
    if (entry.applicability.notAdjacentToAnotherZtu !== true) {
      issues.push(
        issue(
          "ambiguous",
          "ambiguous_bztu_ztu_adjacent_to_ztu",
          "BZTU applicability is ambiguous unless the ztu is known not to be adjacent to another ztu"
        )
      );
    }
    if (
      entry.applicability.multipleAdjacentConditionedZones === true &&
      !hasDistributionFactor(entry)
    ) {
      issues.push(
        issue(
          "ambiguous",
          "ambiguous_bztu_missing_distribution_factor",
          "Multiple adjacent conditioned zones require source-backed Fztc distribution metadata"
        )
      );
    }
  }

  if (
    hasRequiredString(entry.calculationPeriod) &&
    entry.calculationPeriod !== "monthly" &&
    entry.sourcedNonMonthlyException !== true
  ) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_unsourced_non_monthly_scalar",
        "Non-monthly BZTU requires an explicitly sourced non-monthly exception"
      )
    );
  }

  if (
    !hasRequiredString(entry.adjacentConditionedZoneRelation) &&
    !hasDistributionFactor(entry) &&
    entry.applicability?.multipleAdjacentConditionedZones !== true
  ) {
    issues.push(
      issue(
        "rejected",
        "rejected_bztu_missing_adjacent_conditioned_zone_relation",
        "BZTU must identify the adjacent conditioned-zone relation or source-backed distribution factor handling"
      )
    );
  }

  return {
    entry,
    status: resultStatusFromIssues(issues),
    issues
  };
}

function duplicateKeyFor(entry) {
  return `${entry.recordId ?? ""}|${entry.ztuZoneId ?? ""}|${entry.month ?? ""}`;
}

function hasConflictingDuplicate(first, second) {
  return (
    first.value !== second.value ||
    sourceLocatorKey(first.sourceLocator) !== sourceLocatorKey(second.sourceLocator) ||
    sourceRefsKey(first.sourceRefs) !== sourceRefsKey(second.sourceRefs)
  );
}

function applyDuplicateSourcePathValidation(decisions) {
  const byKey = new Map();
  decisions.forEach((decision) => {
    const key = duplicateKeyFor(decision.entry);
    if (key === "||") {
      return;
    }
    const group = byKey.get(key) ?? [];
    group.push(decision);
    byKey.set(key, group);
  });

  for (const group of byKey.values()) {
    if (group.length < 2) {
      continue;
    }
    const [first, ...rest] = group;
    const hasConflict = rest.some((candidate) =>
      hasConflictingDuplicate(first.entry, candidate.entry)
    );
    if (!hasConflict) {
      continue;
    }
    for (const decision of group) {
      decision.issues.push(
        issue(
          "rejected",
          "rejected_bztu_conflicting_duplicate_source_path",
          "Conflicting duplicate BZTU source paths for the same record, zone, and month are not allowed"
        )
      );
      decision.status = resultStatusFromIssues(decision.issues);
    }
  }
}

function acceptedEntryResult(decision) {
  const { entry } = decision;
  return {
    entryId: entry.entryId,
    recordId: entry.recordId,
    value: entry.value,
    unit: entry.unit,
    month: entry.month,
    ztuZoneId: entry.ztuZoneId,
    source: entry.source,
    sourceRefs: Object.freeze([...entry.sourceRefs]),
    sourceLocator: entry.sourceLocator,
    methodologyStatus: entry.methodologyStatus,
    inputClassification: entry.inputClassification,
    traceId: entry.traceId ?? null,
    reviewStatus: entry.reviewStatus ?? null,
    applicability: entry.applicability,
    adjacentConditionedZoneRelation: entry.adjacentConditionedZoneRelation ?? null,
    distributionFactor: entry.distributionFactor ?? null
  };
}

function sourceTraceFromAccepted(acceptedInputs) {
  return Object.freeze({
    records: Object.freeze(
      acceptedInputs.map((entry) =>
        Object.freeze({
          entryId: entry.entryId,
          recordId: entry.recordId,
          ztuZoneId: entry.ztuZoneId,
          month: entry.month,
          sourceRefs: Object.freeze([...entry.sourceRefs]),
          sourceLocator: entry.sourceLocator,
          traceId: entry.traceId
        })
      )
    )
  });
}

export function createMc001BztuDirectInputGate(input, {
  knownRecordIds = BZTU_KNOWN_SOURCE_REFERENCE_IDS
} = {}) {
  const entries = Array.isArray(input)
    ? input
    : input?.[BZTU_DIRECT_INPUT_ROOT] ?? [];

  if (!Array.isArray(entries)) {
    throw new Error(`${BZTU_DIRECT_INPUT_ROOT} must be an array when supplied`);
  }

  if (entries.length === 0) {
    return {
      gateId: MC001_BZTU_DIRECT_INPUT_GATE_ID,
      status: "not_supplied",
      acceptedInputs: Object.freeze([]),
      rejectedInputs: Object.freeze([]),
      blockedItems: Object.freeze([]),
      diagnostics: Object.freeze([]),
      sourceTrace: sourceTraceFromAccepted([]),
      readinessFlags: {
        isBztuDirectInputReady: false,
        isFullBztuDerivationReady: false,
        isMonthlyHeatingReady: false,
        isQhndReady: false,
        isLevel2AuditorReady: false,
        isCpeReady: false
      },
      nextRequiredStep:
        "PROVIDE_EXPLICIT_SOURCE_BACKED_BZTU_DIRECT_INPUT_ONLY_WHEN_NON_CLIMATIZED_ZONE_TRANSMISSION_REQUIRES_IT"
    };
  }

  const knownRecordSet = new Set(knownRecordIds);
  const decisions = entries.map((entry, index) =>
    validateEntry(entry, index, knownRecordSet)
  );
  applyDuplicateSourcePathValidation(decisions);

  const acceptedInputs = decisions
    .filter((decision) => decision.status === "accepted")
    .map(acceptedEntryResult);
  const rejectedInputs = decisions
    .filter((decision) => decision.status !== "accepted")
    .map((decision) => ({
      entryId: decision.entry.entryId,
      recordId: decision.entry.recordId ?? null,
      status: decision.status,
      issues: Object.freeze([...decision.issues])
    }));
  const blockedItems = decisions.flatMap((decision) =>
    decision.issues.map((entryIssue) =>
      blockerFromIssue(decision.entry, decision.entry.path, entryIssue)
    )
  );
  const diagnostics = decisions.flatMap((decision) =>
    decision.issues.map((entryIssue) =>
      diagnosticFromIssue(decision.entry.entryId, decision.entry.path, entryIssue)
    )
  );

  const gateStatus = decisions.every((decision) => decision.status === "accepted")
    ? "accepted"
    : decisions.some((decision) => decision.status === "rejected")
      ? "rejected"
      : decisions.some((decision) => decision.status === "ambiguous")
        ? "ambiguous"
        : "blocked";

  return {
    gateId: MC001_BZTU_DIRECT_INPUT_GATE_ID,
    status: gateStatus,
    acceptedInputs: Object.freeze(acceptedInputs),
    rejectedInputs: Object.freeze(rejectedInputs),
    blockedItems: Object.freeze(blockedItems),
    diagnostics: Object.freeze(diagnostics),
    sourceTrace: sourceTraceFromAccepted(acceptedInputs),
    readinessFlags: {
      isBztuDirectInputReady: gateStatus === "accepted",
      isFullBztuDerivationReady: false,
      isMonthlyHeatingReady: false,
      isQhndReady: false,
      isLevel2AuditorReady: false,
      isCpeReady: false
    },
    nextRequiredStep:
      gateStatus === "accepted"
        ? "KEEP_FULL_BZTU_DERIVATION_AND_HU_HTR_INTEGRATION_BLOCKED_UNTIL_SOURCE_REVIEW_AND_FORMULA_SUPPORT_EXIST"
        : "FIX_BZTU_DIRECT_INPUT_PROVENANCE_SCOPE_AND_METHODOLOGY_METADATA_BEFORE_USE"
  };
}
