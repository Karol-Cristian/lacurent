import {
  assertNormativeRecordUsableForCalculation,
  CALCULATION_MODES,
  getNormativeRecord,
  validateNormativeRegistryContract
} from "./mc001NormativeRegistryContract.mjs";

export const INPUT_BUILDER_GATE_ID = "MC001_AUDITOR_INPUT_BUILDER_GATE_PHASE_C";

export const DERIVED_VALUE_FIELD_NAMES = Object.freeze([
  "Hd",
  "Hg",
  "Hu",
  "Ha",
  "Htr",
  "Hve",
  "QHht",
  "QHgn",
  "QHnd",
  "Qve",
  "finalEnergyKWh",
  "primaryEnergyKWh",
  "totalPrimaryEnergyKWh",
  "renewablePrimaryEnergyKWh",
  "nonRenewablePrimaryEnergyKWh",
  "co2Kg",
  "totalCO2Kg",
  "specificPrimaryEnergy",
  "specificCO2"
]);

const DERIVED_VALUE_NAMES = new Set(DERIVED_VALUE_FIELD_NAMES);
const BZTU_DIRECT_INPUT_ROOTS = new Set(["bztuDirectInputs"]);
const BZTU_RAW_FIELD_NAMES = new Set(["bztu", "bztuValue"]);
const RAW_VALUE_OWNERS = new Set([
  "auditor_entered",
  "normative_table_selected",
  "imported_external_dataset"
]);
const REQUIRED_TOP_LEVEL_SECTIONS = Object.freeze([
  "contractMetadata",
  "sourceTrace",
  "buildingClassification",
  "geometry",
  "normativeReferences",
  "validationImports",
  "expertOverrides",
  "explicitBlockers"
]);
const DERIVED_VALUE_IMPORT_ROOTS = new Set(["validationImports", "expertOverrides"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertObject(value, path) {
  if (!isObject(value)) {
    throw new Error(`${path} must be an object`);
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
    throw new Error(`${path} must contain at least one item`);
  }
}

function assertRequiredString(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path} must be a non-empty string`);
  }
}

function hasRequiredString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function assertFiniteValue(value, path) {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error(`${path} must be finite`);
  }
  if (value === undefined || value === null) {
    throw new Error(`${path} is required`);
  }
}

function assertSourceRefs(sourceRefs, path) {
  assertNonEmptyArray(sourceRefs, path);
  sourceRefs.forEach((sourceRef, index) =>
    assertRequiredString(sourceRef, `${path}[${index}]`)
  );
}

function assertTraceabilityOrTraceId(value, path) {
  if (hasRequiredString(value.traceId)) {
    return;
  }

  if (hasRequiredString(value.traceability)) {
    return;
  }

  if (isObject(value.traceability) && Object.keys(value.traceability).length > 0) {
    return;
  }

  throw new Error(`${path} must include traceId or traceability`);
}

function assertTimestampOrTraceId(value, path) {
  if (hasRequiredString(value.timestamp) || hasRequiredString(value.traceId)) {
    return;
  }

  throw new Error(`${path} must include timestamp or traceId`);
}

function assertCalculationMode(value, path) {
  assertRequiredString(value, path);
  if (!CALCULATION_MODES.includes(value)) {
    throw new Error(`${path} is not supported: ${value}`);
  }
}

function requiredSection(inputPack, sectionName) {
  if (inputPack[sectionName] === undefined || inputPack[sectionName] === null) {
    throw new Error(`Missing required auditor input section: ${sectionName}`);
  }
}

function isValueEnvelope(value) {
  return (
    isObject(value) &&
    "value" in value &&
    "unit" in value &&
    "owner" in value &&
    "sourceRefs" in value
  );
}

function pathKey(path) {
  const last = path.split(".").pop() ?? path;
  return last.replace(/\[\d+\]$/u, "");
}

function isDerivedPath(path) {
  return DERIVED_VALUE_NAMES.has(pathKey(path));
}

function validateRawValueEnvelope(envelope, path) {
  assertFiniteValue(envelope.value, `${path}.value`);
  assertRequiredString(envelope.unit, `${path}.unit`);
  assertRequiredString(envelope.owner, `${path}.owner`);
  if (!RAW_VALUE_OWNERS.has(envelope.owner)) {
    throw new Error(`${path}.owner is not allowed for raw auditor input: ${envelope.owner}`);
  }
  assertSourceRefs(envelope.sourceRefs, `${path}.sourceRefs`);
  assertRequiredString(envelope.confidence, `${path}.confidence`);
  assertRequiredString(envelope.status, `${path}.status`);
}

function rejectDerivedValuesInRawInput(value, path = "") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectDerivedValuesInRawInput(entry, `${path}[${index}]`));
    return;
  }

  if (!isObject(value)) {
    return;
  }

  if (isValueEnvelope(value)) {
    validateRawValueEnvelope(value, path);
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const root = childPath.split(".")[0];
    if (BZTU_DIRECT_INPUT_ROOTS.has(root)) {
      continue;
    }
    if (DERIVED_VALUE_IMPORT_ROOTS.has(root)) {
      continue;
    }

    if (DERIVED_VALUE_NAMES.has(key)) {
      throw new Error(
        `Derived value ${childPath} must be submitted as validationImports or expertOverrides, not normal auditor input`
      );
    }

    rejectDerivedValuesInRawInput(child, childPath);
  }
}

function rejectBztuAsNormalRawInput(value, path = "") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectBztuAsNormalRawInput(entry, `${path}[${index}]`));
    return;
  }

  if (!isObject(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const root = childPath.split(".")[0];
    if (
      BZTU_DIRECT_INPUT_ROOTS.has(root) ||
      DERIVED_VALUE_IMPORT_ROOTS.has(root)
    ) {
      continue;
    }

    if (BZTU_RAW_FIELD_NAMES.has(key)) {
      throw new Error(
        `BZTU value ${childPath} must use bztuDirectInputs as explicit methodological direct input, validation fixture import, or expert override with source`
      );
    }

    rejectBztuAsNormalRawInput(child, childPath);
  }
}

function validateContractMetadata(contractMetadata) {
  assertObject(contractMetadata, "contractMetadata");
  for (const field of [
    "contractId",
    "contractVersion",
    "targetMethodology",
    "calculationMode",
    "createdAt",
    "createdBy"
  ]) {
    assertRequiredString(contractMetadata[field], `contractMetadata.${field}`);
  }
  assertCalculationMode(contractMetadata.calculationMode, "contractMetadata.calculationMode");
}

function validateSourceTrace(sourceTrace) {
  assertObject(sourceTrace, "sourceTrace");
  assertNonEmptyArray(sourceTrace.documents, "sourceTrace.documents");
  sourceTrace.documents.forEach((document, index) => {
    const path = `sourceTrace.documents[${index}]`;
    assertObject(document, path);
    assertRequiredString(document.documentId, `${path}.documentId`);
    assertRequiredString(document.documentType, `${path}.documentType`);
    assertRequiredString(document.reviewStatus, `${path}.reviewStatus`);
  });
}

function validateBuildingClassification(buildingClassification) {
  assertObject(buildingClassification, "buildingClassification");

  if (buildingClassification.primaryCategoryKey === undefined) {
    return;
  }

  const category = buildingClassification.primaryCategoryKey;
  assertObject(category, "buildingClassification.primaryCategoryKey");
  assertRequiredString(
    category.sourceAuditorClassification,
    "buildingClassification.primaryCategoryKey.sourceAuditorClassification"
  );
  assertRequiredString(
    category.mappedMc001Category,
    "buildingClassification.primaryCategoryKey.mappedMc001Category"
  );
  assertRequiredString(
    category.mappingRuleId,
    "buildingClassification.primaryCategoryKey.mappingRuleId"
  );
  assertSourceRefs(
    category.sourceRefs,
    "buildingClassification.primaryCategoryKey.sourceRefs"
  );

  if (
    !hasRequiredString(category.traceId) &&
    !hasRequiredString(category.responsibleModule)
  ) {
    throw new Error(
      "buildingClassification.primaryCategoryKey must include traceId or responsibleModule"
    );
  }
}

function validateNormativeReferences(inputPack, registry) {
  assertArray(inputPack.normativeReferences, "normativeReferences");
  inputPack.normativeReferences.forEach((reference, index) => {
    const path = `normativeReferences[${index}]`;
    assertObject(reference, path);
    assertRequiredString(reference.recordId, `${path}.recordId`);
    assertRequiredString(reference.registryType, `${path}.registryType`);
    const calculationMode =
      reference.calculationMode ?? inputPack.contractMetadata.calculationMode;
    assertCalculationMode(calculationMode, `${path}.calculationMode`);

    if (reference.requiresCalculationUse === false) {
      getNormativeRecord(registry, reference.recordId, {
        registryType: reference.registryType
      });
      return;
    }

    assertNormativeRecordUsableForCalculation(registry, reference.recordId, {
      registryType: reference.registryType,
      calculationMode
    });
  });
}

function assertDerivedTargetPath(targetFieldPath, path) {
  assertRequiredString(targetFieldPath, path);
  if (!isDerivedPath(targetFieldPath)) {
    throw new Error(`${path} must target a derived MC001 field`);
  }
}

function validateValidationImports(validationImports) {
  assertArray(validationImports, "validationImports");
  validationImports.forEach((entry, index) => {
    const path = `validationImports[${index}]`;
    assertObject(entry, path);
    assertRequiredString(entry.importId, `${path}.importId`);
    assertDerivedTargetPath(entry.targetFieldPath, `${path}.targetFieldPath`);
    assertFiniteValue(entry.value, `${path}.value`);
    assertRequiredString(entry.unit, `${path}.unit`);
    assertRequiredString(entry.source, `${path}.source`);
    if (entry.owner !== "validation_import_with_source") {
      throw new Error(`${path}.owner must be validation_import_with_source`);
    }
    assertSourceRefs(entry.sourceRefs, `${path}.sourceRefs`);
    assertTraceabilityOrTraceId(entry, path);
    assertRequiredString(entry.importContext, `${path}.importContext`);
    assertRequiredString(entry.sourceFixtureId, `${path}.sourceFixtureId`);
    assertRequiredString(entry.reviewStatus, `${path}.reviewStatus`);
    if (entry.validatesFormulaPath === true) {
      throw new Error(`${path}.validatesFormulaPath must remain false`);
    }
  });
}

function validateExpertOverrides(expertOverrides) {
  assertArray(expertOverrides, "expertOverrides");
  expertOverrides.forEach((entry, index) => {
    const path = `expertOverrides[${index}]`;
    assertObject(entry, path);
    assertRequiredString(entry.overrideId, `${path}.overrideId`);
    assertDerivedTargetPath(entry.targetFieldPath, `${path}.targetFieldPath`);
    assertFiniteValue(entry.value, `${path}.value`);
    assertRequiredString(entry.unit, `${path}.unit`);
    if (entry.owner !== "measured_override_with_source") {
      throw new Error(`${path}.owner must be measured_override_with_source`);
    }
    assertRequiredString(entry.source, `${path}.source`);
    assertRequiredString(entry.reason, `${path}.reason`);
    if (!hasRequiredString(entry.approvedBy) && !hasRequiredString(entry.responsiblePerson)) {
      throw new Error(`${path} must include approvedBy or responsiblePerson`);
    }
    assertRequiredString(entry.confidence, `${path}.confidence`);
    assertTimestampOrTraceId(entry, path);
    assertSourceRefs(entry.sourceRefs, `${path}.sourceRefs`);
  });
}

function validateExplicitBlockers(explicitBlockers) {
  assertArray(explicitBlockers, "explicitBlockers");
  explicitBlockers.forEach((blocker, index) => {
    const path = `explicitBlockers[${index}]`;
    assertObject(blocker, path);
    assertRequiredString(blocker.blockerId, `${path}.blockerId`);
    assertRequiredString(blocker.status, `${path}.status`);
    assertRequiredString(blocker.reason, `${path}.reason`);
    assertSourceRefs(blocker.sourceRefs, `${path}.sourceRefs`);
  });
}

export function validateMc001AuditorInputBuilderGate(inputPack, { registry } = {}) {
  assertObject(inputPack, "inputPack");
  validateNormativeRegistryContract(registry);

  for (const sectionName of REQUIRED_TOP_LEVEL_SECTIONS) {
    requiredSection(inputPack, sectionName);
  }

  validateContractMetadata(inputPack.contractMetadata);
  validateSourceTrace(inputPack.sourceTrace);
  validateBuildingClassification(inputPack.buildingClassification);
  rejectBztuAsNormalRawInput(inputPack);
  rejectDerivedValuesInRawInput(inputPack);
  validateNormativeReferences(inputPack, registry);
  validateValidationImports(inputPack.validationImports);
  validateExpertOverrides(inputPack.expertOverrides);
  validateExplicitBlockers(inputPack.explicitBlockers);

  return true;
}

export function createMc001AuditorInputBuilderGate(inputPack, { registry } = {}) {
  validateMc001AuditorInputBuilderGate(inputPack, { registry });

  return {
    gateId: INPUT_BUILDER_GATE_ID,
    status: "accepted_input_builder_gate",
    inputContractId: inputPack.contractMetadata.contractId,
    targetMethodology: inputPack.contractMetadata.targetMethodology,
    calculationMode: inputPack.contractMetadata.calculationMode,
    acceptedNormativeReferenceCount: inputPack.normativeReferences.length,
    acceptedValidationImportCount: inputPack.validationImports.length,
    acceptedExpertOverrideCount: inputPack.expertOverrides.length,
    derivedValuesAcceptedAsNormalInput: false,
    validationImportsValidateFormulaPaths: false,
    readinessClaims: {
      isFullMc001AuditReady: false,
      isLevel2Ready: false,
      isCertificateCpeWorkflowReady: false,
      isProductionOrchestrationReady: false
    },
    nextRequiredStep:
      "KEEP_LEVEL_2_BLOCKED_UNTIL_FULL_AUDITOR_INPUTS_AND_REGISTRIES_ARE_COMPLETE"
  };
}
