export const NORMATIVE_KB_OWNER = "normative_knowledge_base";

export const REGISTRY_TYPES = Object.freeze([
  "formula",
  "table",
  "table_row",
  "symbol",
  "unit",
  "source_reference",
  "applicability_rule",
  "status",
  "blocker",
  "external_standard_dependency"
]);

export const RECORD_STATUSES = Object.freeze([
  "validated",
  "implemented_explicit_only",
  "display_reconciliation_only",
  "blocked_missing_input",
  "blocked_missing_normative_data",
  "blocked_external_standard",
  "ambiguous_mc001_example",
  "out_of_scope_current_phase",
  "deprecated",
  "superseded",
  "replaced_by"
]);

export const CONFIDENCE_STATUSES = Object.freeze([
  "reviewed",
  "medium",
  "low",
  "ambiguous",
  "blocked"
]);

export const REVIEW_STATUSES = Object.freeze([
  "reviewed",
  "pending_review",
  "ambiguous",
  "blocked"
]);

export const LIFECYCLE_STATUSES = Object.freeze([
  "active",
  "deprecated",
  "superseded",
  "replaced_by",
  "blocked",
  "display_only"
]);

export const CALCULATION_MODES = Object.freeze([
  "explicit_validation",
  "official_like",
  "full_auditor",
  "validation_display_reconciliation"
]);

const USABLE_CALCULATION_STATUSES = new Set([
  "validated",
  "implemented_explicit_only"
]);

const BLOCKED_CALCULATION_STATUSES = new Set([
  "blocked_missing_input",
  "blocked_missing_normative_data",
  "blocked_external_standard",
  "ambiguous_mc001_example",
  "out_of_scope_current_phase"
]);

const REVIEW_STATUS_REQUIRED_TYPES = new Set([
  "formula",
  "table",
  "table_row",
  "symbol",
  "unit"
]);

const PRECISE_SOURCE_REQUIRED_TYPES = new Set([
  "formula",
  "table",
  "table_row",
  "symbol",
  "unit"
]);

const PRECISE_SOURCE_LOCATOR_KEYS = Object.freeze([
  "section",
  "table",
  "figure",
  "equation",
  "relation",
  "row",
  "annex"
]);

const TYPE_VALIDATORS = Object.freeze({
  formula: validateFormulaRecord,
  table: validateTableRecord,
  table_row: validateTableRowRecord,
  symbol: validateSymbolRecord,
  unit: validateUnitRecord,
  source_reference: validateSourceReferenceRecord,
  applicability_rule: validateApplicabilityRuleRecord,
  status: validateStatusRecord,
  blocker: validateBlockerRecord,
  external_standard_dependency: validateExternalStandardRecord
});

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

function hasSourceLocatorValue(value) {
  return (
    (typeof value === "string" && value.trim() !== "") ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function assertOptionalString(value, path) {
  if (value !== null && value !== undefined) {
    assertRequiredString(value, path);
  }
}

function assertFiniteNonNegativeInteger(value, path) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${path} must be a finite non-negative integer`);
  }
}

function assertKnownValue(value, allowedValues, path) {
  assertRequiredString(value, path);
  if (!allowedValues.includes(value)) {
    throw new Error(`${path} is not registered: ${value}`);
  }
}

function assertOptionalKnownValues(values, allowedValues, path) {
  if (values === undefined) {
    return;
  }

  assertArray(values, path);
  values.forEach((value, index) =>
    assertKnownValue(value, allowedValues, `${path}[${index}]`)
  );
}

function assertPreciseSourceRef(sourceRef, path) {
  const hasPage = hasSourceLocatorValue(sourceRef.page) ||
    hasSourceLocatorValue(sourceRef.pageRange);
  const hasLocator = PRECISE_SOURCE_LOCATOR_KEYS.some((key) =>
    hasSourceLocatorValue(sourceRef[key])
  );

  if (!hasPage || !hasLocator) {
    throw new Error(
      `${path} must include page or pageRange plus one of section, table, figure, equation, relation, row, or annex`
    );
  }
}

function assertSourceRefs(sourceRefs, path, { requirePrecise = false } = {}) {
  assertNonEmptyArray(sourceRefs, path);
  sourceRefs.forEach((sourceRef, index) => {
    const sourcePath = `${path}[${index}]`;
    assertObject(sourceRef, sourcePath);
    assertRequiredString(sourceRef.document, `${sourcePath}.document`);
    assertRequiredString(sourceRef.extractionStatus, `${sourcePath}.extractionStatus`);
    if (requirePrecise) {
      assertPreciseSourceRef(sourceRef, sourcePath);
    }
  });
}

function assertBlockers(blockers, path) {
  assertArray(blockers, path);
  blockers.forEach((blocker, index) => {
    const blockerPath = `${path}[${index}]`;
    assertObject(blocker, blockerPath);
    assertRequiredString(blocker.blockerId, `${blockerPath}.blockerId`);
    assertRequiredString(blocker.status, `${blockerPath}.status`);
  });
}

function registryRecords(registry) {
  if (Array.isArray(registry)) {
    return registry;
  }

  assertObject(registry, "registry");
  assertNonEmptyArray(registry.records, "registry.records");
  return registry.records;
}

function recordById(index, id, path) {
  const record = index.byId.get(id);
  if (!record) {
    throw new Error(`${path} references unknown normative record id: ${id}`);
  }
  return record;
}

function requireRecordType(index, id, registryType, path) {
  const record = recordById(index, id, path);
  if (record.registryType !== registryType) {
    throw new Error(`${path} must reference ${registryType}: ${id}`);
  }
  return record;
}

function requireUnit(index, unit, path) {
  const record = index.byUnit.get(unit);
  if (!record) {
    throw new Error(`${path} references unknown unit: ${unit}`);
  }
  return record;
}

function requireSymbol(index, symbol, path) {
  const record = index.bySymbol.get(symbol);
  if (!record) {
    throw new Error(`${path} references unknown symbol: ${symbol}`);
  }
  return record;
}

function assertValueType(value, valueType, path) {
  if (valueType === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${path} must be a finite number`);
    }
    return;
  }

  if (valueType === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(`${path} must be a boolean`);
    }
    return;
  }

  if (valueType === "string") {
    assertRequiredString(value, path);
    return;
  }

  throw new Error(`${path} has unsupported valueType: ${valueType}`);
}

function assertKnownValueType(valueType, path) {
  if (!["number", "boolean", "string"].includes(valueType)) {
    throw new Error(`${path} has unsupported valueType: ${valueType}`);
  }
}

function validateCommonRecord(record, path, index) {
  assertObject(record, path);
  assertRequiredString(record.id, `${path}.id`);
  assertKnownValue(record.registryType, REGISTRY_TYPES, `${path}.registryType`);
  assertRequiredString(record.methodologyVersion, `${path}.methodologyVersion`);
  assertKnownValue(record.status, RECORD_STATUSES, `${path}.status`);
  assertKnownValue(record.confidence, CONFIDENCE_STATUSES, `${path}.confidence`);
  if (record.reviewStatus !== undefined) {
    assertKnownValue(record.reviewStatus, REVIEW_STATUSES, `${path}.reviewStatus`);
  }
  assertSourceRefs(record.sourceRefs, `${path}.sourceRefs`, {
    requirePrecise:
      PRECISE_SOURCE_REQUIRED_TYPES.has(record.registryType) &&
      USABLE_CALCULATION_STATUSES.has(record.status)
  });
  if (record.owner !== NORMATIVE_KB_OWNER) {
    throw new Error(`${path}.owner must be ${NORMATIVE_KB_OWNER}`);
  }
  assertRequiredString(record.version, `${path}.version`);
  assertKnownValue(record.lifecycleStatus, LIFECYCLE_STATUSES, `${path}.lifecycleStatus`);
  assertBlockers(record.blockers, `${path}.blockers`);
  assertOptionalString(record.replacedBy, `${path}.replacedBy`);
  assertOptionalString(record.deprecationReason, `${path}.deprecationReason`);
  assertOptionalString(record.noReplacementReason, `${path}.noReplacementReason`);

  if (REVIEW_STATUS_REQUIRED_TYPES.has(record.registryType)) {
    assertKnownValue(record.reviewStatus, REVIEW_STATUSES, `${path}.reviewStatus`);
  }

  if (
    record.lifecycleStatus === "deprecated" &&
    !record.replacedBy &&
    !record.deprecationReason &&
    !record.noReplacementReason
  ) {
    throw new Error(
      `${path} deprecated records require replacedBy, deprecationReason, or noReplacementReason`
    );
  }

  if (
    (record.lifecycleStatus === "superseded" ||
      record.lifecycleStatus === "replaced_by") &&
    !record.replacedBy
  ) {
    throw new Error(`${path}.replacedBy is required for ${record.lifecycleStatus} records`);
  }

  if (record.replacedBy) {
    recordById(index, record.replacedBy, `${path}.replacedBy`);
  }
}

function validateFormulaRecord(record, path, index) {
  assertRequiredString(record.label, `${path}.label`);
  assertRequiredString(record.domain, `${path}.domain`);
  assertNonEmptyArray(record.inputs, `${path}.inputs`);
  record.inputs.forEach((input, indexInFormula) => {
    const inputPath = `${path}.inputs[${indexInFormula}]`;
    assertObject(input, inputPath);
    assertRequiredString(input.symbol, `${inputPath}.symbol`);
    requireSymbol(index, input.symbol, `${inputPath}.symbol`);
    assertRequiredString(input.unit, `${inputPath}.unit`);
    requireUnit(index, input.unit, `${inputPath}.unit`);
    if (typeof input.required !== "boolean") {
      throw new Error(`${inputPath}.required must be a boolean`);
    }
    assertRequiredString(input.sourceRequirement, `${inputPath}.sourceRequirement`);
  });

  assertObject(record.output, `${path}.output`);
  assertRequiredString(record.output.symbol, `${path}.output.symbol`);
  requireSymbol(index, record.output.symbol, `${path}.output.symbol`);
  assertRequiredString(record.output.unit, `${path}.output.unit`);
  requireUnit(index, record.output.unit, `${path}.output.unit`);
  validateApplicabilityReferences(record, path, index);
  assertRequiredString(record.implementationStatus, `${path}.implementationStatus`);
  assertKnownValue(
    record.missingInputsBehavior,
    RECORD_STATUSES,
    `${path}.missingInputsBehavior`
  );

  if (record.helperTrace !== undefined) {
    assertObject(record.helperTrace, `${path}.helperTrace`);
    assertRequiredString(record.helperTrace.module, `${path}.helperTrace.module`);
    assertNonEmptyArray(record.helperTrace.fixtureIds, `${path}.helperTrace.fixtureIds`);
  }
}

function validateTableRecord(record, path, index) {
  assertRequiredString(record.title, `${path}.title`);
  assertRequiredString(record.domain, `${path}.domain`);
  assertNonEmptyArray(record.rowKeySchema, `${path}.rowKeySchema`);
  record.rowKeySchema.forEach((key, keyIndex) =>
    assertRequiredString(key, `${path}.rowKeySchema[${keyIndex}]`)
  );
  assertNonEmptyArray(record.columnSchema, `${path}.columnSchema`);
  record.columnSchema.forEach((column, columnIndex) => {
    const columnPath = `${path}.columnSchema[${columnIndex}]`;
    assertObject(column, columnPath);
    assertRequiredString(column.key, `${columnPath}.key`);
    assertRequiredString(column.unit, `${columnPath}.unit`);
    requireUnit(index, column.unit, `${columnPath}.unit`);
    assertKnownValueType(column.valueType, `${columnPath}.valueType`);
    if (typeof column.required !== "boolean") {
      throw new Error(`${columnPath}.required must be a boolean`);
    }
  });
  validateApplicabilityReferences(record, path, index);
}

function validateTableRowRecord(record, path, index) {
  const table = requireRecordType(index, record.tableId, "table", `${path}.tableId`);
  assertRequiredString(record.domain, `${path}.domain`);
  assertObject(record.rowKey, `${path}.rowKey`);
  for (const key of table.rowKeySchema) {
    assertRequiredString(record.rowKey[key], `${path}.rowKey.${key}`);
  }

  const rowKeyNames = Object.keys(record.rowKey);
  for (const key of rowKeyNames) {
    if (!table.rowKeySchema.includes(key)) {
      throw new Error(`${path}.rowKey.${key} is not in table rowKeySchema`);
    }
  }

  assertObject(record.values, `${path}.values`);
  table.columnSchema.forEach((column) => {
    const cellPath = `${path}.values.${column.key}`;
    const cell = record.values[column.key];
    if (column.required && cell === undefined) {
      throw new Error(`Missing required table cell: ${cellPath}`);
    }
    if (cell === undefined) {
      return;
    }
    assertObject(cell, cellPath);
    assertValueType(cell.value, column.valueType, `${cellPath}.value`);
    if (cell.unit !== column.unit) {
      throw new Error(`${cellPath}.unit must be ${column.unit}`);
    }
    assertKnownValue(cell.status, RECORD_STATUSES, `${cellPath}.status`);
  });
}

function validateSymbolRecord(record, path, index) {
  assertRequiredString(record.symbol, `${path}.symbol`);
  assertRequiredString(record.canonicalName, `${path}.canonicalName`);
  assertRequiredString(record.canonicalUnit, `${path}.canonicalUnit`);
  requireUnit(index, record.canonicalUnit, `${path}.canonicalUnit`);
  assertNonEmptyArray(record.allowedUnits, `${path}.allowedUnits`);
  record.allowedUnits.forEach((unit, unitIndex) => {
    assertRequiredString(unit, `${path}.allowedUnits[${unitIndex}]`);
    requireUnit(index, unit, `${path}.allowedUnits[${unitIndex}]`);
  });
  assertRequiredString(record.dimension, `${path}.dimension`);
  assertArray(record.aliases, `${path}.aliases`);
  assertRequiredString(record.domain, `${path}.domain`);
}

function validateUnitRecord(record, path) {
  assertRequiredString(record.unit, `${path}.unit`);
  assertRequiredString(record.dimension, `${path}.dimension`);
  assertArray(record.allowedConversions, `${path}.allowedConversions`);
  if (typeof record.canonical !== "boolean") {
    throw new Error(`${path}.canonical must be a boolean`);
  }
  assertObject(record.precisionPolicy, `${path}.precisionPolicy`);
  assertFiniteNonNegativeInteger(
    record.precisionPolicy.internalDecimals,
    `${path}.precisionPolicy.internalDecimals`
  );
  assertFiniteNonNegativeInteger(
    record.precisionPolicy.displayDecimals,
    `${path}.precisionPolicy.displayDecimals`
  );
}

function validateSourceReferenceRecord(record, path) {
  assertRequiredString(record.document, `${path}.document`);
  assertRequiredString(record.extractionStatus, `${path}.extractionStatus`);
}

function validateApplicabilityRuleRecord(record, path) {
  assertRequiredString(record.domain, `${path}.domain`);
  assertArray(record.requiredInputPaths, `${path}.requiredInputPaths`);
  record.requiredInputPaths.forEach((inputPath, inputIndex) =>
    assertRequiredString(inputPath, `${path}.requiredInputPaths[${inputIndex}]`)
  );
  assertOptionalKnownValues(
    record.allowedCalculationModes,
    CALCULATION_MODES,
    `${path}.allowedCalculationModes`
  );
  assertOptionalKnownValues(
    record.blockedCalculationModes,
    CALCULATION_MODES,
    `${path}.blockedCalculationModes`
  );
  assertKnownValue(record.missingBehavior, RECORD_STATUSES, `${path}.missingBehavior`);
}

function validateStatusRecord(record, path) {
  assertKnownValue(record.statusKey, RECORD_STATUSES, `${path}.statusKey`);
  assertRequiredString(record.readinessImpact, `${path}.readinessImpact`);
  assertRequiredString(record.calculationUse, `${path}.calculationUse`);
}

function validateBlockerRecord(record, path) {
  assertRequiredString(record.blockerId, `${path}.blockerId`);
  assertRequiredString(record.domain, `${path}.domain`);
  assertRequiredString(record.reason, `${path}.reason`);
  assertRequiredString(record.resolutionRequirement, `${path}.resolutionRequirement`);
  assertNonEmptyArray(record.downstreamBlocks, `${path}.downstreamBlocks`);
}

function validateExternalStandardRecord(record, path) {
  assertRequiredString(record.domain, `${path}.domain`);
  assertOptionalString(record.standardId, `${path}.standardId`);
  assertOptionalString(record.standardName, `${path}.standardName`);
  if (
    (record.status === "blocked_external_standard" ||
      record.currentStatus === "blocked_external_standard") &&
    !record.standardId &&
    !record.standardName
  ) {
    throw new Error(
      `${path} blocked_external_standard records require standardId or standardName`
    );
  }
  assertNonEmptyArray(record.requiredFor, `${path}.requiredFor`);
  assertNonEmptyArray(record.missingFields, `${path}.missingFields`);
  assertKnownValue(record.currentStatus, RECORD_STATUSES, `${path}.currentStatus`);
  assertRequiredString(record.resolutionRequirement, `${path}.resolutionRequirement`);
  assertNonEmptyArray(record.downstreamBlocks, `${path}.downstreamBlocks`);
}

function validateApplicabilityReferences(record, path, index) {
  assertNonEmptyArray(record.applicabilityRuleIds, `${path}.applicabilityRuleIds`);
  record.applicabilityRuleIds.forEach((ruleId, ruleIndex) =>
    requireRecordType(
      index,
      ruleId,
      "applicability_rule",
      `${path}.applicabilityRuleIds[${ruleIndex}]`
    )
  );
}

function validateRecordIndexes(index) {
  for (const [symbol, records] of index.symbolCollisions.entries()) {
    if (records.length > 1) {
      throw new Error(`Symbol is registered more than once: ${symbol}`);
    }
  }

  for (const [unit, records] of index.unitCollisions.entries()) {
    if (records.length > 1) {
      throw new Error(`Unit is registered more than once: ${unit}`);
    }
  }
}

function addCollision(indexMap, key, record) {
  if (!key) {
    return;
  }
  const records = indexMap.get(key) ?? [];
  records.push(record);
  indexMap.set(key, records);
}

export function createNormativeRegistryIndex(registry) {
  const records = registryRecords(registry);
  const index = {
    records,
    byId: new Map(),
    bySymbol: new Map(),
    byUnit: new Map(),
    symbolCollisions: new Map(),
    unitCollisions: new Map()
  };

  records.forEach((record, recordIndex) => {
    assertObject(record, `registry.records[${recordIndex}]`);
    assertRequiredString(record.id, `registry.records[${recordIndex}].id`);
    if (index.byId.has(record.id)) {
      throw new Error(`Duplicate normative record id: ${record.id}`);
    }
    index.byId.set(record.id, record);
  });

  records.forEach((record) => {
    if (record.registryType === "symbol") {
      index.bySymbol.set(record.symbol, record);
      addCollision(index.symbolCollisions, record.symbol, record);
      for (const alias of record.aliases ?? []) {
        addCollision(index.symbolCollisions, alias, record);
      }
    }
    if (record.registryType === "unit") {
      index.byUnit.set(record.unit, record);
      addCollision(index.unitCollisions, record.unit, record);
    }
  });

  return index;
}

export function validateNormativeRegistryContract(registry) {
  const index = createNormativeRegistryIndex(registry);
  validateRecordIndexes(index);

  index.records.forEach((record, recordIndex) => {
    const path = `registry.records[${recordIndex}]`;
    validateCommonRecord(record, path, index);
    TYPE_VALIDATORS[record.registryType](record, path, index);
  });

  return true;
}

export function getNormativeRecord(registry, recordId, { registryType } = {}) {
  const index = createNormativeRegistryIndex(registry);
  const record = recordById(index, recordId, "recordId");

  if (registryType !== undefined && record.registryType !== registryType) {
    throw new Error(`Normative record ${recordId} must be ${registryType}`);
  }

  return record;
}

function assertApplicabilityAllows(record, index, calculationMode) {
  for (const ruleId of record.applicabilityRuleIds ?? []) {
    const rule = requireRecordType(index, ruleId, "applicability_rule", "applicabilityRuleIds");
    if (rule.blockedCalculationModes?.includes(calculationMode)) {
      throw new Error(
        `Normative record ${record.id} is blocked for calculation mode ${calculationMode} by ${rule.id}`
      );
    }
    if (
      Array.isArray(rule.allowedCalculationModes) &&
      rule.allowedCalculationModes.length > 0 &&
      !rule.allowedCalculationModes.includes(calculationMode)
    ) {
      throw new Error(
        `Normative record ${record.id} is not applicable for calculation mode ${calculationMode}`
      );
    }
  }
}

export function assertNormativeRecordUsableForCalculation(
  registry,
  recordId,
  {
    registryType,
    calculationMode = "explicit_validation",
    allowDisplayOnly = false
  } = {}
) {
  assertKnownValue(calculationMode, CALCULATION_MODES, "calculationMode");
  const index = createNormativeRegistryIndex(registry);
  const record = recordById(index, recordId, "recordId");

  if (registryType !== undefined && record.registryType !== registryType) {
    throw new Error(`Normative record ${recordId} must be ${registryType}`);
  }

  if (record.registryType === "table_row") {
    assertNormativeRecordUsableForCalculation(registry, record.tableId, {
      registryType: "table",
      calculationMode,
      allowDisplayOnly
    });
  }

  if (record.lifecycleStatus !== "active") {
    throw new Error(
      `Normative record ${record.id} cannot be used for calculation because lifecycleStatus is ${record.lifecycleStatus}`
    );
  }

  if (record.status === "display_reconciliation_only" && !allowDisplayOnly) {
    throw new Error(`Normative record ${record.id} is display-only and cannot satisfy calculation`);
  }

  if (BLOCKED_CALCULATION_STATUSES.has(record.status)) {
    throw new Error(
      `Normative record ${record.id} cannot be used for calculation because status is ${record.status}`
    );
  }

  if (!USABLE_CALCULATION_STATUSES.has(record.status)) {
    throw new Error(
      `Normative record ${record.id} is not calculation-usable with status ${record.status}`
    );
  }

  if (record.confidence !== "reviewed") {
    throw new Error(
      `Normative record ${record.id} cannot be used for calculation because confidence is ${record.confidence}`
    );
  }

  assertSourceRefs(record.sourceRefs, `record ${record.id}.sourceRefs`);
  assertApplicabilityAllows(record, index, calculationMode);
  return record;
}

function rowKeyMatches(row, rowKey) {
  const rowKeys = Object.keys(row.rowKey);
  const requestedKeys = Object.keys(rowKey);
  if (rowKeys.length !== requestedKeys.length) {
    return false;
  }
  return rowKeys.every((key) => row.rowKey[key] === rowKey[key]);
}

export function lookupNormativeTableRow(
  registry,
  {
    tableId,
    rowKey,
    calculationMode = "explicit_validation"
  } = {}
) {
  assertRequiredString(tableId, "tableId");
  assertObject(rowKey, "rowKey");
  assertNormativeRecordUsableForCalculation(registry, tableId, {
    registryType: "table",
    calculationMode
  });

  const index = createNormativeRegistryIndex(registry);
  const row = index.records.find(
    (record) =>
      record.registryType === "table_row" &&
      record.tableId === tableId &&
      rowKeyMatches(record, rowKey)
  );

  if (!row) {
    throw new Error(`Unknown table row for ${tableId}: ${JSON.stringify(rowKey)}`);
  }

  assertNormativeRecordUsableForCalculation(registry, row.id, {
    registryType: "table_row",
    calculationMode
  });
  return row;
}
