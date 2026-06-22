import assert from "node:assert/strict";
import {
  assertNormativeRecordUsableForCalculation,
  getNormativeRecord,
  lookupNormativeTableRow,
  validateNormativeRegistryContract
} from "../../mc001NormativeRegistryContract.mjs";
import {
  createMc001AuditorInputBuilderGate,
  validateMc001AuditorInputBuilderGate
} from "../../mc001AuditorInputBuilderGate.mjs";
import { fixture020RegistryContractInputBuilderGate as fixture } from "./fixture020RegistryContractInputBuilderGate.mjs";

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectRegistryFailure({ name, mutate, expectedError }) {
  test(name, () => {
    const registry = clone(fixture.registry);
    mutate(registry);
    assert.throws(() => validateNormativeRegistryContract(registry), expectedError);
  });
}

function expectInputGateFailure({ name, mutate, expectedError }) {
  test(name, () => {
    const inputPack = clone(fixture.inputPack);
    mutate(inputPack);
    assert.throws(
      () =>
        validateMc001AuditorInputBuilderGate(inputPack, {
          registry: fixture.registry
        }),
      expectedError
    );
  });
}

test("documents Fixture 020 Phase C scope without adding product behavior", () => {
  assert.equal(fixture.fixtureId, "FIXTURE_020_REGISTRY_CONTRACT_INPUT_BUILDER_GATE");
  assert.ok(fixture.exclusions.includes("no Level 2 full MC001 auditor"));
  assert.ok(fixture.exclusions.includes("no UI/API/DB/Worker/deploy/product integration"));
  assert.ok(fixture.exclusions.includes("no new MC001 physics formulas"));
});

test("validates the normative registry contract fixture", () => {
  assert.equal(validateNormativeRegistryContract(fixture.registry), true);
  assert.equal(fixture.registry.records.length > 0, true);
});

test("looks up calculation-usable formula and table-row records", () => {
  const formula = assertNormativeRecordUsableForCalculation(
    fixture.registry,
    "MC001_2_15_HTR_TOTAL",
    {
      registryType: "formula",
      calculationMode: "explicit_validation"
    }
  );
  const row = lookupNormativeTableRow(fixture.registry, {
    tableId: "MC001_TABEL_5_17_PRIMARY_FACTORS",
    rowKey: { energyCarrierKey: "electricity" },
    calculationMode: "explicit_validation"
  });

  assert.equal(formula.output.symbol, "Htr");
  assert.equal(row.values.totalPrimaryEnergyFactor.value, 2.5);
});

test("returns blocked records for diagnostics but rejects them for calculation use", () => {
  const externalStandard = getNormativeRecord(
    fixture.registry,
    "SR_EN_15193_1_LIGHTING_DATA",
    {
      registryType: "external_standard_dependency"
    }
  );

  assert.equal(externalStandard.status, "blocked_external_standard");
  assert.equal(externalStandard.standardId, "SR_EN_15193_1");
  assert.equal(externalStandard.standardName, "SR EN 15193-1 lighting data");
  assert.throws(
    () =>
      assertNormativeRecordUsableForCalculation(
        fixture.registry,
        "SR_EN_15193_1_LIGHTING_DATA",
        { registryType: "external_standard_dependency" }
      ),
    /lifecycleStatus is blocked/
  );
});

test("rejects display-only and lifecycle-blocked records as calculation dependencies", () => {
  assert.throws(
    () =>
      assertNormativeRecordUsableForCalculation(
        fixture.registry,
        "MC001_DISPLAY_RER_RECONCILIATION",
        { registryType: "formula" }
      ),
    /lifecycleStatus is display_only/
  );
  assert.throws(
    () =>
      assertNormativeRecordUsableForCalculation(
        fixture.registry,
        "MC001_OLD_HTR_TOTAL",
        { registryType: "formula" }
      ),
    /lifecycleStatus is deprecated/
  );
  assert.throws(
    () =>
      assertNormativeRecordUsableForCalculation(
        fixture.registry,
        "MC001_SUPERSEDED_HTR_TOTAL",
        { registryType: "formula" }
      ),
    /lifecycleStatus is superseded/
  );
});

test("fails closed on unknown normative ids and table-row keys", () => {
  assert.throws(
    () => getNormativeRecord(fixture.registry, "UNKNOWN_FORMULA"),
    /unknown normative record id/
  );
  assert.throws(
    () =>
      lookupNormativeTableRow(fixture.registry, {
        tableId: "MC001_TABEL_5_17_PRIMARY_FACTORS",
        rowKey: { energyCarrierKey: "unknown" }
      }),
    /Unknown table row/
  );
});

test("rejects table-row calculation use when the parent table is blocked", () => {
  const registry = clone(fixture.registry);
  const table = registry.records.find(
    (record) => record.id === "MC001_TABEL_5_17_PRIMARY_FACTORS"
  );
  table.lifecycleStatus = "blocked";
  table.blockers = [{ blockerId: "NB-GAP-PARENT-TABLE", status: "blocked_missing_normative_data" }];

  assert.throws(
    () =>
      assertNormativeRecordUsableForCalculation(
        registry,
        "MC001_TABEL_5_17_PRIMARY_FACTORS:electricity",
        {
          registryType: "table_row",
          calculationMode: "explicit_validation"
        }
      ),
    /MC001_TABEL_5_17_PRIMARY_FACTORS cannot be used for calculation because lifecycleStatus is blocked/
  );
});

expectRegistryFailure({
  name: "fails closed when a formula source reference is missing",
  mutate(registry) {
    registry.records.find((record) => record.id === "MC001_2_15_HTR_TOTAL").sourceRefs = [];
  },
  expectedError: /sourceRefs must contain at least one item/
});

expectRegistryFailure({
  name: "fails closed when a validated formula lacks a precise source locator",
  mutate(registry) {
    registry.records.find((record) => record.id === "MC001_2_15_HTR_TOTAL").sourceRefs = [
      {
        document: "MC001-2022",
        extractionStatus: "reviewed"
      }
    ];
  },
  expectedError: /page or pageRange plus one of/
});

expectRegistryFailure({
  name: "fails closed when a formula reviewStatus is missing",
  mutate(registry) {
    delete registry.records.find((record) => record.id === "MC001_2_15_HTR_TOTAL")
      .reviewStatus;
  },
  expectedError: /reviewStatus must be a non-empty string/
});

expectRegistryFailure({
  name: "fails closed when a formula reviewStatus is unknown",
  mutate(registry) {
    registry.records.find((record) => record.id === "MC001_2_15_HTR_TOTAL").reviewStatus =
      "invented_review_status";
  },
  expectedError: /reviewStatus is not registered/
});

expectRegistryFailure({
  name: "fails closed when a normative status is unknown",
  mutate(registry) {
    registry.records.find((record) => record.id === "MC001_2_15_HTR_TOTAL").status =
      "invented_status";
  },
  expectedError: /status is not registered/
});

for (const [recordId, typeName] of [
  ["MC001_2_15_HTR_TOTAL", "formula"],
  ["MC001_TABEL_5_17_PRIMARY_FACTORS", "table"],
  ["MC001_TABEL_5_17_PRIMARY_FACTORS:electricity", "table_row"]
]) {
  expectRegistryFailure({
    name: `fails closed when a ${typeName} domain is missing`,
    mutate(registry) {
      delete registry.records.find((record) => record.id === recordId).domain;
    },
    expectedError: /domain must be a non-empty string/
  });
}

expectRegistryFailure({
  name: "fails closed when a formula references an unknown symbol",
  mutate(registry) {
    registry.records.find((record) => record.id === "MC001_2_15_HTR_TOTAL").inputs[0].symbol =
      "UNKNOWN";
  },
  expectedError: /references unknown symbol: UNKNOWN/
});

expectRegistryFailure({
  name: "fails closed when a table-row numeric cell is string-valued",
  mutate(registry) {
    registry.records.find(
      (record) => record.id === "MC001_TABEL_5_17_PRIMARY_FACTORS:electricity"
    ).values.totalPrimaryEnergyFactor.value = "2.5";
  },
  expectedError: /totalPrimaryEnergyFactor\.value must be a finite number/
});

expectRegistryFailure({
  name: "fails closed when a table-row cell unit mismatches its table schema",
  mutate(registry) {
    registry.records.find(
      (record) => record.id === "MC001_TABEL_5_17_PRIMARY_FACTORS:electricity"
    ).values.totalPrimaryEnergyFactor.unit = "kWh";
  },
  expectedError: /totalPrimaryEnergyFactor\.unit must be -/
});

expectRegistryFailure({
  name: "fails closed when an external-standard blocker has no standard identity",
  mutate(registry) {
    const record = registry.records.find(
      (entry) => entry.id === "SR_EN_15193_1_LIGHTING_DATA"
    );
    delete record.standardId;
    delete record.standardName;
  },
  expectedError: /require standardId or standardName/
});

expectRegistryFailure({
  name: "fails closed when a deprecated record lacks lifecycle metadata",
  mutate(registry) {
    const record = registry.records.find((entry) => entry.id === "MC001_OLD_HTR_TOTAL");
    delete record.replacedBy;
    delete record.deprecationReason;
    delete record.noReplacementReason;
  },
  expectedError: /deprecated records require replacedBy/
});

expectRegistryFailure({
  name: "fails closed when a superseded record lacks replacement metadata",
  mutate(registry) {
    delete registry.records.find((entry) => entry.id === "MC001_SUPERSEDED_HTR_TOTAL")
      .replacedBy;
  },
  expectedError: /replacedBy is required for superseded records/
});

test("accepts the Phase C auditor input builder gate fixture", () => {
  assert.equal(
    validateMc001AuditorInputBuilderGate(fixture.inputPack, {
      registry: fixture.registry
    }),
    true
  );

  const result = createMc001AuditorInputBuilderGate(fixture.inputPack, {
    registry: fixture.registry
  });

  assert.equal(result.gateId, fixture.expected.gateId);
  assert.equal(result.status, fixture.expected.status);
  assert.equal(
    result.acceptedNormativeReferenceCount,
    fixture.expected.acceptedNormativeReferenceCount
  );
  assert.equal(
    result.acceptedValidationImportCount,
    fixture.expected.acceptedValidationImportCount
  );
  assert.equal(result.acceptedExpertOverrideCount, fixture.expected.acceptedExpertOverrideCount);
  assert.equal(result.derivedValuesAcceptedAsNormalInput, false);
  assert.equal(result.validationImportsValidateFormulaPaths, false);
  assert.equal(result.readinessClaims.isLevel2Ready, false);
});

test("accepts explicit primary category mapping evidence", () => {
  const category = fixture.inputPack.buildingClassification.primaryCategoryKey;

  assert.equal(category.value, "education");
  assert.equal(category.mappedMc001Category, "education");
  assert.equal(category.mappingRuleId, "MC001_CATEGORY_MAPPING_PHASE_C_FIXTURE");
  assert.equal(
    validateMc001AuditorInputBuilderGate(fixture.inputPack, {
      registry: fixture.registry
    }),
    true
  );
});

expectInputGateFailure({
  name: "rejects derived values submitted as normal auditor input",
  mutate(inputPack) {
    inputPack.geometry.Htr = {
      value: 504.3,
      unit: "W/K",
      owner: "auditor_entered",
      sourceRefs: ["FIELD_NOTE_001"],
      confidence: "reviewed",
      status: "ready"
    };
  },
  expectedError: /Derived value geometry\.Htr must be submitted as validationImports or expertOverrides/
});

for (const [fieldName, unit] of [
  ["Hd", "W/K"],
  ["Hve", "W/K"],
  ["finalEnergyKWh", "kWh"],
  ["totalPrimaryEnergyKWh", "kWh"],
  ["totalCO2Kg", "kgCO2"]
]) {
  expectInputGateFailure({
    name: `rejects ${fieldName} submitted as normal auditor input`,
    mutate(inputPack) {
      inputPack.geometry[fieldName] = {
        value: 1,
        unit,
        owner: "auditor_entered",
        sourceRefs: ["FIELD_NOTE_001"],
        confidence: "reviewed",
        status: "ready"
      };
    },
    expectedError: new RegExp(
      `Derived value geometry\\.${fieldName} must be submitted as validationImports or expertOverrides`
    )
  });
}

expectInputGateFailure({
  name: "rejects raw value envelopes sourced from product estimates",
  mutate(inputPack) {
    inputPack.geometry.conditionedFloorArea.owner = "product_estimate";
  },
  expectedError: /geometry\.conditionedFloorArea\.owner is not allowed/
});

expectInputGateFailure({
  name: "rejects raw primary category key without mapping evidence",
  mutate(inputPack) {
    delete inputPack.buildingClassification.primaryCategoryKey.sourceAuditorClassification;
    delete inputPack.buildingClassification.primaryCategoryKey.mappedMc001Category;
    delete inputPack.buildingClassification.primaryCategoryKey.mappingRuleId;
    delete inputPack.buildingClassification.primaryCategoryKey.traceId;
    delete inputPack.buildingClassification.primaryCategoryKey.responsibleModule;
  },
  expectedError: /sourceAuditorClassification must be a non-empty string/
});

expectInputGateFailure({
  name: "rejects validation imports without source refs",
  mutate(inputPack) {
    inputPack.validationImports[0].sourceRefs = [];
  },
  expectedError: /validationImports\[0\]\.sourceRefs must contain at least one item/
});

expectInputGateFailure({
  name: "rejects validation imports without source and trace",
  mutate(inputPack) {
    delete inputPack.validationImports[0].source;
    delete inputPack.validationImports[0].traceId;
    delete inputPack.validationImports[0].traceability;
  },
  expectedError: /validationImports\[0\]\.source must be a non-empty string/
});

expectInputGateFailure({
  name: "rejects validation imports without traceability",
  mutate(inputPack) {
    delete inputPack.validationImports[0].traceId;
    delete inputPack.validationImports[0].traceability;
  },
  expectedError: /validationImports\[0\] must include traceId or traceability/
});

expectInputGateFailure({
  name: "rejects validation imports without explicit import context",
  mutate(inputPack) {
    delete inputPack.validationImports[0].importContext;
  },
  expectedError: /validationImports\[0\]\.importContext must be a non-empty string/
});

expectInputGateFailure({
  name: "rejects validation imports that claim to validate the underlying formula path",
  mutate(inputPack) {
    inputPack.validationImports[0].validatesFormulaPath = true;
  },
  expectedError: /validationImports\[0\]\.validatesFormulaPath must remain false/
});

expectInputGateFailure({
  name: "rejects validation imports with the wrong owner",
  mutate(inputPack) {
    inputPack.validationImports[0].owner = "auditor_entered";
  },
  expectedError: /validationImports\[0\]\.owner must be validation_import_with_source/
});

expectInputGateFailure({
  name: "rejects expert overrides without reason",
  mutate(inputPack) {
    inputPack.expertOverrides[0].reason = "";
  },
  expectedError: /expertOverrides\[0\]\.reason must be a non-empty string/
});

expectInputGateFailure({
  name: "rejects expert overrides without unit",
  mutate(inputPack) {
    delete inputPack.expertOverrides[0].unit;
  },
  expectedError: /expertOverrides\[0\]\.unit must be a non-empty string/
});

expectInputGateFailure({
  name: "rejects expert overrides without approval",
  mutate(inputPack) {
    delete inputPack.expertOverrides[0].approvedBy;
  },
  expectedError: /expertOverrides\[0\] must include approvedBy or responsiblePerson/
});

expectInputGateFailure({
  name: "rejects expert overrides without confidence",
  mutate(inputPack) {
    delete inputPack.expertOverrides[0].confidence;
  },
  expectedError: /expertOverrides\[0\]\.confidence must be a non-empty string/
});

expectInputGateFailure({
  name: "rejects expert overrides without timestamp or trace id",
  mutate(inputPack) {
    delete inputPack.expertOverrides[0].timestamp;
    delete inputPack.expertOverrides[0].traceId;
  },
  expectedError: /expertOverrides\[0\] must include timestamp or traceId/
});

expectInputGateFailure({
  name: "rejects expert overrides without source refs",
  mutate(inputPack) {
    inputPack.expertOverrides[0].sourceRefs = [];
  },
  expectedError: /expertOverrides\[0\]\.sourceRefs must contain at least one item/
});

expectInputGateFailure({
  name: "rejects unknown normative ids in auditor input references",
  mutate(inputPack) {
    inputPack.normativeReferences[0].recordId = "UNKNOWN_FORMULA";
  },
  expectedError: /unknown normative record id: UNKNOWN_FORMULA/
});
