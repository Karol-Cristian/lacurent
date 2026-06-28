import { createMc001BztuDirectInputGate } from "./mc001BztuDirectInputGate.mjs";

export const MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID =
  "MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_PHASE_H2E";

export const HU_COMPONENT_CANDIDATE_ROOT = "huComponentCandidate";

const ALLOWED_BOUNDARY_RELATIONS = new Set([
  "conditioned_to_external_non_climatized_zone",
  "conditioned_to_internal_non_climatized_zone",
  "external_non_climatized_zone",
  "internal_non_climatized_zone"
]);

const ALLOWED_U_VALUE_PATH_TYPES = new Set([
  "engine_calculated",
  "source_backed_direct_input",
  "source_backed_corrected_u_value",
  "validation_fixture_import",
  "expert_override_with_source"
]);

const ALLOWED_BZTU_PATH_TYPES = new Set([
  "accepted_direct_input",
  "accepted_bztu_direct_input",
  "validation_fixture_import",
  "expert_override_with_source"
]);

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

const RAW_HU_CONTAINERS = Object.freeze([
  "rawAuditorInput",
  "normalAuditorInput",
  "auditorInput",
  "rawInput"
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
}

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

function arrayHasRequiredStrings(value) {
  return Array.isArray(value) && value.length > 0 && value.every(hasRequiredString);
}

function sourceRefsFrom(value) {
  return value?.sourceRefs ?? value?.provenance?.sourceRefs ?? value?.sourceTrace?.sourceRefs;
}

function sourceLocatorFrom(value) {
  return (
    value?.sourceLocator ??
    value?.provenance?.sourceLocator ??
    value?.sourceTrace?.sourceLocator
  );
}

function sourceFrom(value) {
  return value?.source ?? value?.provenance?.source ?? value?.sourceTrace?.source;
}

function traceIdFrom(value) {
  return value?.traceId ?? value?.provenance?.traceId ?? value?.sourceTrace?.traceId;
}

function hasSourceProvenance(value) {
  return (
    isObject(value) &&
    hasRequiredString(sourceFrom(value)) &&
    arrayHasRequiredStrings(sourceRefsFrom(value)) &&
    locatorIsPresent(sourceLocatorFrom(value))
  );
}

function issue(status, code, message, extra = {}) {
  return {
    status,
    code,
    message,
    ...extra
  };
}

function diagnosticFromIssue(componentId, componentPath, componentIssue) {
  return {
    level: componentIssue.status,
    code: componentIssue.code,
    message: componentIssue.message,
    componentId,
    path: componentPath
  };
}

function blockerFromIssue(component, componentPath, componentIssue) {
  return {
    itemType: "hu_component_contract",
    componentId: component.componentId,
    elementId: component.elementId,
    ztuZoneId: component.ztuZoneId,
    month: component.month,
    status: componentIssue.code,
    readinessStatus: componentIssue.status,
    value: null,
    diagnosticCode: componentIssue.code,
    reason: componentIssue.message,
    path: componentPath
  };
}

function resultStatusFromIssues(issues) {
  if (issues.length === 0) {
    return "ready";
  }
  if (issues.some((componentIssue) => componentIssue.status === "rejected")) {
    return "rejected";
  }
  if (issues.some((componentIssue) => componentIssue.status === "ambiguous")) {
    return "ambiguous";
  }
  return "blocked";
}

function componentStatusFromIssues(issues) {
  if (issues.length === 0) {
    return "ready_hu_component_contract";
  }
  return issues[0].code;
}

function monthIsValid(month) {
  return Number.isInteger(month) && month >= 1 && month <= 12;
}

function areaCandidateFrom(candidate) {
  return candidate?.area ?? candidate?.element?.area ?? candidate?.elementArea ?? null;
}

function normalizeArea(areaCandidate) {
  if (typeof areaCandidate === "number") {
    return {
      value: areaCandidate,
      unit: null
    };
  }

  if (!isObject(areaCandidate)) {
    return {
      value: null,
      unit: null
    };
  }

  return {
    value: areaCandidate.value ?? areaCandidate.area ?? null,
    unit: areaCandidate.unit ?? areaCandidate.areaUnit ?? null
  };
}

function normalizeComponent(candidate) {
  const element = candidate?.element ?? {};
  const area = normalizeArea(areaCandidateFrom(candidate));

  return {
    componentId:
      candidate?.componentId ??
      candidate?.huComponentId ??
      candidate?.id ??
      "hu_component_candidate",
    conditionedZoneId:
      candidate?.conditionedZoneId ??
      candidate?.ztcZoneId ??
      candidate?.conditionedZone?.zoneId ??
      null,
    ztuZoneId:
      candidate?.ztuZoneId ??
      candidate?.unconditionedZoneId ??
      candidate?.unconditionedZone?.zoneId ??
      candidate?.adjacentNonClimatizedZoneId ??
      null,
    month: candidate?.month,
    elementId: candidate?.elementId ?? element.elementId ?? element.id ?? null,
    elementType: candidate?.elementType ?? element.elementType ?? element.type ?? null,
    area,
    boundaryRelation:
      candidate?.boundaryRelation ??
      candidate?.boundary?.relation ??
      candidate?.adjacentBoundaryRelation ??
      null,
    uValuePath: candidate?.uValuePath ?? candidate?.uPath ?? candidate?.correctedUValuePath,
    bztuPath: candidate?.bztuPath,
    applicability: candidate?.applicability,
    sourceTrace: candidate?.sourceTrace ?? candidate?.provenance,
    distribution: candidate?.distribution ?? candidate?.distributionFactor,
    readinessClaims: candidate?.readinessClaims ?? {}
  };
}

function componentPath() {
  return HU_COMPONENT_CANDIDATE_ROOT;
}

function rawHuWasSubmitted(input) {
  for (const containerName of RAW_HU_CONTAINERS) {
    const container = input?.[containerName];
    if (!isObject(container)) {
      continue;
    }
    if (
      Object.hasOwn(container, "Hu") ||
      Object.hasOwn(container, "hu") ||
      Object.hasOwn(container, "huComponent") ||
      Object.hasOwn(container, "heatTransferThroughUnconditionedZone")
    ) {
      return true;
    }
  }
  return false;
}

function distributionMetadataIsPresent(component) {
  return (
    isObject(component.distribution) &&
    (hasRequiredString(component.distribution.methodology) ||
      hasRequiredString(component.distribution.source) ||
      arrayHasRequiredStrings(component.distribution.sourceRefs) ||
      hasSourceProvenance(component.distribution))
  );
}

function fakeZeroClaimFor(input, componentName) {
  const claim =
    input?.transmissionComponentClaims?.[componentName] ??
    input?.htrComponentClaims?.[componentName] ??
    input?.claimedTransmissionComponents?.[componentName];

  return isObject(claim) && claim.value === 0 && claim.sourceBackedNonApplicability !== true;
}

function readinessClaimsFrom(input, candidate) {
  return {
    ...(candidate?.readinessClaims ?? {}),
    ...(input?.readinessClaims ?? {})
  };
}

function bztuPathIsDirectInput(pathType) {
  return pathType === "accepted_direct_input" || pathType === "accepted_bztu_direct_input";
}

function acceptedBztuByPath(path, bztuGateResult) {
  const acceptedInputs = bztuGateResult?.acceptedInputs ?? [];

  if (hasRequiredString(path.entryId)) {
    const byEntryId = acceptedInputs.find((entry) => entry.entryId === path.entryId);
    if (byEntryId) {
      return byEntryId;
    }
  }

  if (hasRequiredString(path.recordId)) {
    return acceptedInputs.find((entry) => entry.recordId === path.recordId) ?? null;
  }

  return null;
}

function sourceTraceRecord(componentId, record) {
  return {
    componentId,
    source: sourceFrom(record) ?? null,
    sourceRefs: Object.freeze([...(sourceRefsFrom(record) ?? [])]),
    sourceLocator: sourceLocatorFrom(record) ?? null,
    traceId: traceIdFrom(record) ?? null
  };
}

function sourceTraceFrom(component, bztuGateResult, acceptedBztuInput) {
  const records = [];

  if (hasSourceProvenance(component.sourceTrace)) {
    records.push(sourceTraceRecord("hu_component_contract", component.sourceTrace));
  }

  if (hasSourceProvenance(component.uValuePath)) {
    records.push(sourceTraceRecord("u_value_path", component.uValuePath));
  }

  if (acceptedBztuInput) {
    records.push({
      componentId: "bztu",
      source: acceptedBztuInput.source,
      sourceRefs: Object.freeze([...acceptedBztuInput.sourceRefs]),
      sourceLocator: acceptedBztuInput.sourceLocator,
      traceId: acceptedBztuInput.traceId ?? null,
      recordId: acceptedBztuInput.recordId,
      entryId: acceptedBztuInput.entryId,
      month: acceptedBztuInput.month,
      ztuZoneId: acceptedBztuInput.ztuZoneId
    });
  }

  return Object.freeze({
    records: Object.freeze(records),
    bztu: bztuGateResult?.sourceTrace ?? Object.freeze({ records: Object.freeze([]) })
  });
}

function validateBztuPath(input, component, issues) {
  const path = component.bztuPath;

  if (!isObject(path)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_bztu_path",
        "Hu component contract requires an accepted BZTU path"
      )
    );
    return {
      bztuGateResult: null,
      acceptedBztuInput: null
    };
  }

  if (!ALLOWED_BZTU_PATH_TYPES.has(path.pathType)) {
    issues.push(
      issue(
        "blocked",
        "blocked_invalid_bztu_path",
        "Hu component BZTU path must be accepted_direct_input, validation_fixture_import, or expert_override_with_source"
      )
    );
    return {
      bztuGateResult: null,
      acceptedBztuInput: null
    };
  }

  if (bztuPathIsDirectInput(path.pathType)) {
    const bztuGateResult = createMc001BztuDirectInputGate(input);
    const acceptedBztuInput = acceptedBztuByPath(path, bztuGateResult);

    if (bztuGateResult.status !== "accepted" || !acceptedBztuInput) {
      issues.push(
        issue(
          "blocked",
          "blocked_invalid_bztu_path",
          "Hu component BZTU path must reference an accepted H1 BZTU direct input"
        )
      );
      return {
        bztuGateResult,
        acceptedBztuInput: null
      };
    }

    if (acceptedBztuInput.month !== component.month) {
      issues.push(
        issue(
          "blocked",
          "blocked_bztu_scope_mismatch",
          "Accepted BZTU month must match the Hu component month"
        )
      );
    }

    if (acceptedBztuInput.ztuZoneId !== component.ztuZoneId) {
      issues.push(
        issue(
          "blocked",
          "blocked_bztu_scope_mismatch",
          "Accepted BZTU ztu zone must match the Hu component ztu zone"
        )
      );
    }

    return {
      bztuGateResult,
      acceptedBztuInput
    };
  }

  if (!hasSourceProvenance(path)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_source",
        "Validation import or expert override BZTU paths require source/provenance"
      )
    );
  }

  return {
    bztuGateResult: null,
    acceptedBztuInput: null
  };
}

function validateComponent(input, candidate) {
  const path = componentPath();
  const component = normalizeComponent(candidate);
  const issues = [];

  if (!isObject(candidate)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_element_inventory",
        "Hu component candidate must be supplied as an object"
      )
    );
    return {
      component,
      issues,
      bztuGateResult: null,
      acceptedBztuInput: null
    };
  }

  if (rawHuWasSubmitted(input)) {
    issues.push(
      issue(
        "rejected",
        "rejected_hu_raw_auditor_input",
        "Hu is a derived readiness/output component and must not be normal raw auditor input"
      )
    );
  }

  if (!hasRequiredString(component.conditionedZoneId) || !hasRequiredString(component.ztuZoneId)) {
    issues.push(
      issue(
        "ambiguous",
        "blocked_ambiguous_zone_mapping",
        "Hu component contract requires conditioned and ztu zone ids"
      )
    );
  }

  if (!monthIsValid(component.month)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_month",
        "Hu component contract requires one month as an integer from 1 to 12"
      )
    );
  }

  if (!hasRequiredString(component.elementId) || !hasRequiredString(component.elementType)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_element_inventory",
        "Hu component contract requires element id and element type"
      )
    );
  }

  if (component.area.value === null || component.area.value === undefined) {
    issues.push(
      issue("blocked", "blocked_missing_area", "Hu component contract requires area")
    );
  } else if (
    typeof component.area.value !== "number" ||
    !Number.isFinite(component.area.value) ||
    component.area.value <= 0
  ) {
    issues.push(
      issue(
        "blocked",
        "blocked_invalid_area",
        "Hu component area must be a positive finite numeric value"
      )
    );
  }

  if (!isObject(component.uValuePath)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_u_value_path",
        "Hu component contract requires a U-value or corrected U-value path"
      )
    );
  } else {
    if (!ALLOWED_U_VALUE_PATH_TYPES.has(component.uValuePath.pathType)) {
      issues.push(
        issue(
          "blocked",
          "blocked_invalid_u_value_path",
          "Hu component U-value path type is unsupported for H2E"
        )
      );
    }

    if (!hasSourceProvenance(component.uValuePath)) {
      issues.push(
        issue(
          "blocked",
          "blocked_invalid_u_value_source",
          "Hu component U-value path requires source/provenance"
        )
      );
    }
  }

  if (!hasRequiredString(component.boundaryRelation)) {
    issues.push(
      issue(
        "ambiguous",
        "blocked_ambiguous_zone_mapping",
        "Hu component contract requires a boundary relation between conditioned zone and ztu"
      )
    );
  } else if (
    component.boundaryRelation === "ztu_to_ztu" ||
    component.boundaryRelation === "unconditioned_to_unconditioned"
  ) {
    issues.push(
      issue(
        "blocked",
        "blocked_unsupported_methodology",
        "ZTUs adjacent to other ZTUs remain unsupported for H2E"
      )
    );
  } else if (!ALLOWED_BOUNDARY_RELATIONS.has(component.boundaryRelation)) {
    issues.push(
      issue(
        "blocked",
        "blocked_unsupported_methodology",
        "Hu component boundary relation is unsupported for H2E"
      )
    );
  }

  if (!isObject(component.applicability)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_source",
        "Hu component applicability metadata is required"
      )
    );
  } else {
    if (component.applicability.notAdjacentToAnotherZtu !== true) {
      issues.push(
        issue(
          "blocked",
          "blocked_unsupported_methodology",
          "Hu component ztu-to-ztu applicability remains unsupported"
        )
      );
    }

    if (
      component.applicability.multipleAdjacentConditionedZones === true &&
      !distributionMetadataIsPresent(component)
    ) {
      issues.push(
        issue(
          "ambiguous",
          "blocked_ambiguous_distribution",
          "Multiple conditioned zones adjacent to one ztu require source-backed distribution metadata"
        )
      );
    }

    if (
      component.applicability.appliesToMonth !== undefined &&
      component.applicability.appliesToMonth !== component.month
    ) {
      issues.push(
        issue(
          "blocked",
          "blocked_bztu_scope_mismatch",
          "Hu component applicability month must match the component month"
        )
      );
    }

    if (
      hasRequiredString(component.applicability.appliesToZtuZoneId) &&
      component.applicability.appliesToZtuZoneId !== component.ztuZoneId
    ) {
      issues.push(
        issue(
          "blocked",
          "blocked_bztu_scope_mismatch",
          "Hu component applicability ztu must match the component ztu"
        )
      );
    }
  }

  if (!hasSourceProvenance(component.sourceTrace)) {
    issues.push(
      issue(
        "blocked",
        "blocked_missing_source",
        "Hu component contract requires source/provenance"
      )
    );
  }

  const readinessClaims = readinessClaimsFrom(input, candidate);
  if (readinessClaims.isCompleteHuReady === true) {
    issues.push(
      issue(
        "blocked",
        "blocked_complete_hu_readiness_escalation",
        "H2E cannot claim complete Hu readiness"
      )
    );
  }

  if (readinessClaims.isCompleteHtrReady === true) {
    issues.push(
      issue(
        "blocked",
        "blocked_complete_htr_readiness_escalation",
        "H2E cannot claim complete Htr readiness"
      )
    );
  }

  if (input?.transmissionComponentClaims?.Hu?.claimsCompleteHtr === true) {
    issues.push(
      issue(
        "blocked",
        "blocked_hu_treated_as_complete_htr_component",
        "A narrow Hu component contract cannot be promoted to complete Htr readiness"
      )
    );
  }

  for (const componentName of ["Hg", "Ha"]) {
    if (fakeZeroClaimFor(input, componentName)) {
      issues.push(
        issue(
          "blocked",
          "blocked_fake_zero_transmission_component",
          `${componentName} must not be treated as zero to complete Htr readiness`
        )
      );
    }
  }

  const { bztuGateResult, acceptedBztuInput } = validateBztuPath(
    input,
    component,
    issues
  );

  return {
    component,
    issues,
    bztuGateResult,
    acceptedBztuInput
  };
}

export function createMc001HuComponentContractReadinessGate(input) {
  const candidate =
    input?.[HU_COMPONENT_CANDIDATE_ROOT] ??
    input?.huComponent ??
    input?.huComponentContract ??
    null;
  const { component, issues, bztuGateResult, acceptedBztuInput } = validateComponent(
    input,
    candidate
  );
  const status = resultStatusFromIssues(issues);
  const componentStatus = componentStatusFromIssues(issues);
  const isHuComponentReady = status === "ready";
  const diagnostics = issues.map((componentIssue) =>
    diagnosticFromIssue(component.componentId, componentPath(), componentIssue)
  );
  const blockers = issues.map((componentIssue) =>
    blockerFromIssue(component, componentPath(), componentIssue)
  );

  if (isHuComponentReady) {
    diagnostics.push({
      level: "info",
      code: "hu_component_contract_readiness_only",
      message:
        "H2E validates one Hu component contract only; it does not claim complete Hu or Htr readiness",
      componentId: component.componentId,
      path: componentPath()
    });
  }

  const sourceTrace = sourceTraceFrom(component, bztuGateResult, acceptedBztuInput);
  const readinessFlags = {
    isHuComponentReady,
    isCompleteHuReady: false,
    isCompleteHtrReady: false,
    isMonthlyHeatingReady: false,
    isQhndReady: false,
    isLevel2AuditorReady: false,
    isCpeReady: false
  };

  const huComponentReadiness = {
    status,
    componentStatus,
    conditionedZoneId: component.conditionedZoneId,
    unconditionedZoneId: component.ztuZoneId,
    ztuZoneId: component.ztuZoneId,
    month: component.month,
    elementId: component.elementId,
    area: component.area,
    uValuePath: component.uValuePath ?? null,
    bztuPath: component.bztuPath ?? null,
    sourceTrace,
    diagnostics: Object.freeze(diagnostics),
    blockers: Object.freeze(blockers),
    isHuComponentReady,
    isCompleteHuReady: false,
    isCompleteHtrReady: false
  };

  return {
    gateId: MC001_HU_COMPONENT_CONTRACT_READINESS_GATE_ID,
    status,
    componentStatus,
    huComponentReadiness,
    conditionedZoneId: component.conditionedZoneId,
    unconditionedZoneId: component.ztuZoneId,
    ztuZoneId: component.ztuZoneId,
    month: component.month,
    elementId: component.elementId,
    area: component.area,
    uValuePath: component.uValuePath ?? null,
    bztuPath: component.bztuPath ?? null,
    sourceTrace,
    diagnostics: Object.freeze(diagnostics),
    blockedItems: Object.freeze(blockers),
    blockers: Object.freeze(blockers),
    readinessFlags,
    bztuDirectInputReadiness: bztuGateResult,
    nextRequiredStep: isHuComponentReady
      ? "KEEP_COMPLETE_HU_AND_COMPLETE_HTR_BLOCKED_UNTIL_FULL_INVENTORY_IS_PROVEN"
      : "PROVIDE_COMPLETE_SOURCE_BACKED_HU_COMPONENT_CONTRACT"
  };
}
