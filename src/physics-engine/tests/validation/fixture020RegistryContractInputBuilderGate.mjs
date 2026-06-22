import { NORMATIVE_KB_OWNER } from "../../mc001NormativeRegistryContract.mjs";

const SOURCE_MC001 = Object.freeze({
  document: "MC001-2022",
  pageRange: "Phase C fixture source pack",
  section: "Phase C fixture slice",
  extractionStatus: "reviewed"
});

function record(fields) {
  return Object.freeze({
    methodologyVersion: "MC001-2022",
    sourceRefs: Object.freeze([SOURCE_MC001]),
    status: "validated",
    reviewStatus: "reviewed",
    confidence: "reviewed",
    owner: NORMATIVE_KB_OWNER,
    lifecycleStatus: "active",
    version: "2026-06-phase-c",
    blockers: Object.freeze([]),
    notes: Object.freeze([]),
    ...fields
  });
}

function unit({ id, unit, dimension }) {
  return record({
    id,
    registryType: "unit",
    unit,
    dimension,
    allowedConversions: Object.freeze([]),
    canonical: true,
    precisionPolicy: Object.freeze({
      internalDecimals: 6,
      displayDecimals: 2
    })
  });
}

function symbol({ id, symbol, canonicalName, canonicalUnit, aliases, domain }) {
  return record({
    id,
    registryType: "symbol",
    symbol,
    canonicalName,
    canonicalUnit,
    allowedUnits: Object.freeze([canonicalUnit]),
    dimension: canonicalName,
    aliases: Object.freeze(aliases),
    domain
  });
}

function statusRecord(statusKey, readinessImpact, calculationUse) {
  return record({
    id: `STATUS_${statusKey.toUpperCase()}`,
    registryType: "status",
    statusKey,
    readinessImpact,
    calculationUse
  });
}

export const fixture020RegistryContractInputBuilderGate = Object.freeze({
  fixtureId: "FIXTURE_020_REGISTRY_CONTRACT_INPUT_BUILDER_GATE",
  fixtureType: "phase_c_registry_contract_input_builder_gate",
  sourceDocument: "MC001-2022",
  sourceNote:
    "Uses a narrow executable normative registry slice and raw auditor input builder gate fixture derived from Phase A/B contract docs.",
  scope:
    "Pure Physics Engine Phase C contract validation for registry shape, fail-closed lookup, derived-value rejection, validation imports, and expert overrides.",
  exclusions: Object.freeze([
    "no Level 2 full MC001 auditor",
    "no production orchestrator",
    "no certificate workflow",
    "no CPE generation",
    "no report generation",
    "no UI/API/DB/Worker/deploy/product integration",
    "no new MC001 physics formulas",
    "no dataset migration",
    "no invented normative values"
  ]),
  registry: Object.freeze({
    registryId: "MC001_PHASE_C_NORMATIVE_REGISTRY_CONTRACT_FIXTURE",
    records: Object.freeze([
      record({
        id: "SRC_MC001_2022",
        registryType: "source_reference",
        document: "MC001-2022",
        extractionStatus: "reviewed"
      }),
      statusRecord("validated", "can_support_explicit_validation", "calculation_allowed"),
      statusRecord(
        "blocked_external_standard",
        "blocks_affected_domain",
        "diagnostics_only"
      ),
      statusRecord(
        "display_reconciliation_only",
        "blocks_general_methodology",
        "display_diagnostics_only"
      ),
      unit({ id: "UNIT_W_PER_K", unit: "W/K", dimension: "heat_transfer_coefficient" }),
      unit({ id: "UNIT_KWH", unit: "kWh", dimension: "energy" }),
      unit({ id: "UNIT_KGCO2", unit: "kgCO2", dimension: "co2_mass" }),
      unit({ id: "UNIT_KGCO2_PER_KWH", unit: "kgCO2/kWh", dimension: "co2_factor" }),
      unit({ id: "UNIT_UNITLESS", unit: "-", dimension: "unitless" }),
      symbol({
        id: "SYMBOL_Hd",
        symbol: "Hd",
        canonicalName: "direct transmission heat-transfer coefficient",
        canonicalUnit: "W/K",
        aliases: Object.freeze(["H_d"]),
        domain: "transmission"
      }),
      symbol({
        id: "SYMBOL_Hg",
        symbol: "Hg",
        canonicalName: "ground transmission heat-transfer coefficient",
        canonicalUnit: "W/K",
        aliases: Object.freeze(["H_g"]),
        domain: "transmission"
      }),
      symbol({
        id: "SYMBOL_Hu",
        symbol: "Hu",
        canonicalName: "unconditioned-space transmission heat-transfer coefficient",
        canonicalUnit: "W/K",
        aliases: Object.freeze(["H_u"]),
        domain: "transmission"
      }),
      symbol({
        id: "SYMBOL_Ha",
        symbol: "Ha",
        canonicalName: "adjacent-space transmission heat-transfer coefficient",
        canonicalUnit: "W/K",
        aliases: Object.freeze(["H_a"]),
        domain: "transmission"
      }),
      symbol({
        id: "SYMBOL_Htr",
        symbol: "Htr",
        canonicalName: "total transmission heat-transfer coefficient",
        canonicalUnit: "W/K",
        aliases: Object.freeze(["H_tr"]),
        domain: "transmission"
      }),
      record({
        id: "APPLIES_TO_EXPLICIT_TRANSMISSION_COMPONENTS",
        registryType: "applicability_rule",
        domain: "transmission",
        allowedCalculationModes: Object.freeze(["explicit_validation"]),
        blockedCalculationModes: Object.freeze(["official_like", "full_auditor"]),
        requiredInputPaths: Object.freeze(["transmission.Hd", "transmission.Hg", "transmission.Hu", "transmission.Ha"]),
        missingBehavior: "blocked_missing_input"
      }),
      record({
        id: "APPLIES_TO_EXPLICIT_FACTOR_ROW_LOOKUP",
        registryType: "applicability_rule",
        domain: "final_primary_co2",
        allowedCalculationModes: Object.freeze(["explicit_validation"]),
        blockedCalculationModes: Object.freeze(["full_auditor"]),
        requiredInputPaths: Object.freeze(["serviceFinalEnergyRows[].energyCarrierKey"]),
        missingBehavior: "blocked_missing_input"
      }),
      record({
        id: "MC001_2_15_HTR_TOTAL",
        registryType: "formula",
        domain: "transmission",
        label: "Total transmission heat-transfer coefficient",
        sourceRefs: Object.freeze([
          Object.freeze({
            document: "MC001-2022",
            page: 520,
            section: "2.4.1 and Anexa B transmission summary",
            relation: "2.15",
            extractionStatus: "reviewed"
          })
        ]),
        inputs: Object.freeze([
          Object.freeze({ symbol: "Hd", unit: "W/K", required: true, sourceRequirement: "calculated_or_explicit" }),
          Object.freeze({ symbol: "Hg", unit: "W/K", required: true, sourceRequirement: "calculated_or_explicit" }),
          Object.freeze({ symbol: "Hu", unit: "W/K", required: true, sourceRequirement: "calculated_or_explicit" }),
          Object.freeze({ symbol: "Ha", unit: "W/K", required: true, sourceRequirement: "calculated_or_explicit" })
        ]),
        output: Object.freeze({ symbol: "Htr", unit: "W/K" }),
        applicabilityRuleIds: Object.freeze(["APPLIES_TO_EXPLICIT_TRANSMISSION_COMPONENTS"]),
        helperTrace: Object.freeze({
          module: "src/physics-engine/transmissionCoefficients.mjs",
          fixtureIds: Object.freeze(["FIXTURE_004", "FIXTURE_016"])
        }),
        implementationStatus: "implemented_validated_narrow_fixture",
        missingInputsBehavior: "blocked_missing_input"
      }),
      record({
        id: "MC001_TABEL_5_17_PRIMARY_FACTORS",
        registryType: "table",
        domain: "final_primary_co2",
        title: "Primary energy factors",
        sourceRefs: Object.freeze([
          Object.freeze({
            document: "MC001-2022",
            pageRange: "407-412",
            table: "Tabel 5.17",
            extractionStatus: "reviewed"
          })
        ]),
        rowKeySchema: Object.freeze(["energyCarrierKey"]),
        columnSchema: Object.freeze([
          Object.freeze({ key: "renewablePrimaryEnergyFactor", unit: "-", valueType: "number", required: true }),
          Object.freeze({ key: "nonRenewablePrimaryEnergyFactor", unit: "-", valueType: "number", required: true }),
          Object.freeze({ key: "totalPrimaryEnergyFactor", unit: "-", valueType: "number", required: true })
        ]),
        applicabilityRuleIds: Object.freeze(["APPLIES_TO_EXPLICIT_FACTOR_ROW_LOOKUP"])
      }),
      record({
        id: "MC001_TABEL_5_17_PRIMARY_FACTORS:electricity",
        registryType: "table_row",
        domain: "final_primary_co2",
        tableId: "MC001_TABEL_5_17_PRIMARY_FACTORS",
        rowKey: Object.freeze({ energyCarrierKey: "electricity" }),
        values: Object.freeze({
          renewablePrimaryEnergyFactor: Object.freeze({ value: 0.8, unit: "-", status: "validated" }),
          nonRenewablePrimaryEnergyFactor: Object.freeze({ value: 1.7, unit: "-", status: "validated" }),
          totalPrimaryEnergyFactor: Object.freeze({ value: 2.5, unit: "-", status: "validated" })
        }),
        sourceRefs: Object.freeze([
          Object.freeze({
            document: "MC001-2022",
            pageRange: "407-412",
            table: "Tabel 5.17",
            row: "electricity",
            extractionStatus: "reviewed"
          })
        ])
      }),
      record({
        id: "NB-GAP-016",
        registryType: "blocker",
        status: "blocked_missing_normative_data",
        lifecycleStatus: "blocked",
        confidence: "blocked",
        blockerId: "NB-GAP-016",
        domain: "rer",
        reason: "General RER methodology and perimeter/export treatment are not executable.",
        resolutionRequirement: "Reviewed general RER formula and applicability extraction.",
        downstreamBlocks: Object.freeze(["full_auditor", "certificate_cpe_workflow"]),
        blockers: Object.freeze([
          Object.freeze({ blockerId: "NB-GAP-016", status: "blocked_missing_normative_data" })
        ])
      }),
      record({
        id: "MC001_DISPLAY_RER_RECONCILIATION",
        registryType: "formula",
        status: "display_reconciliation_only",
        lifecycleStatus: "display_only",
        confidence: "reviewed",
        blockers: Object.freeze([
          Object.freeze({ blockerId: "NB-GAP-016", status: "blocked_missing_normative_data" })
        ]),
        label: "Displayed RER reconciliation",
        domain: "rer",
        inputs: Object.freeze([
          Object.freeze({ symbol: "Htr", unit: "W/K", required: true, sourceRequirement: "displayed_value_only" })
        ]),
        output: Object.freeze({ symbol: "Htr", unit: "W/K" }),
        applicabilityRuleIds: Object.freeze(["APPLIES_TO_EXPLICIT_TRANSMISSION_COMPONENTS"]),
        implementationStatus: "display_only_not_general_methodology",
        missingInputsBehavior: "blocked_missing_normative_data"
      }),
      record({
        id: "NB-GAP-012",
        registryType: "blocker",
        status: "blocked_external_standard",
        lifecycleStatus: "blocked",
        confidence: "blocked",
        blockerId: "NB-GAP-012",
        domain: "lighting",
        reason: "Lighting needs external SR EN 15193-1 data not locally reviewed.",
        resolutionRequirement: "Reviewed local extraction or explicit auditor source for lighting inputs.",
        downstreamBlocks: Object.freeze(["lighting", "full_auditor"]),
        blockers: Object.freeze([
          Object.freeze({ blockerId: "NB-GAP-012", status: "blocked_external_standard" })
        ])
      }),
      record({
        id: "SR_EN_15193_1_LIGHTING_DATA",
        registryType: "external_standard_dependency",
        status: "blocked_external_standard",
        lifecycleStatus: "blocked",
        confidence: "blocked",
        blockers: Object.freeze([
          Object.freeze({ blockerId: "NB-GAP-012", status: "blocked_external_standard" })
        ]),
        domain: "lighting",
        standardId: "SR_EN_15193_1",
        standardName: "SR EN 15193-1 lighting data",
        requiredFor: Object.freeze(["lightingSystems"]),
        missingFields: Object.freeze(["controlFactors", "daylightFactors", "schedule/default method"]),
        currentStatus: "blocked_external_standard",
        resolutionRequirement: "Review SR EN 15193-1 locally or provide explicit sourced auditor values.",
        downstreamBlocks: Object.freeze(["lighting", "full_auditor"])
      }),
      record({
        id: "MC001_OLD_HTR_TOTAL",
        registryType: "formula",
        status: "deprecated",
        lifecycleStatus: "deprecated",
        label: "Deprecated total transmission heat-transfer placeholder",
        domain: "transmission",
        replacedBy: "MC001_2_15_HTR_TOTAL",
        inputs: Object.freeze([
          Object.freeze({ symbol: "Hd", unit: "W/K", required: true, sourceRequirement: "legacy_fixture_only" })
        ]),
        output: Object.freeze({ symbol: "Htr", unit: "W/K" }),
        applicabilityRuleIds: Object.freeze(["APPLIES_TO_EXPLICIT_TRANSMISSION_COMPONENTS"]),
        implementationStatus: "deprecated_fixture_record",
        missingInputsBehavior: "blocked_missing_input"
      }),
      record({
        id: "MC001_SUPERSEDED_HTR_TOTAL",
        registryType: "formula",
        status: "superseded",
        lifecycleStatus: "superseded",
        label: "Superseded total transmission heat-transfer placeholder",
        domain: "transmission",
        replacedBy: "MC001_2_15_HTR_TOTAL",
        inputs: Object.freeze([
          Object.freeze({ symbol: "Hd", unit: "W/K", required: true, sourceRequirement: "legacy_fixture_only" })
        ]),
        output: Object.freeze({ symbol: "Htr", unit: "W/K" }),
        applicabilityRuleIds: Object.freeze(["APPLIES_TO_EXPLICIT_TRANSMISSION_COMPONENTS"]),
        implementationStatus: "superseded_fixture_record",
        missingInputsBehavior: "blocked_missing_input"
      })
    ])
  }),
  inputPack: Object.freeze({
    contractMetadata: Object.freeze({
      contractId: "PHASE_C_INPUT_GATE_FIXTURE_020",
      contractVersion: "PHASE_C_REGISTRY_CONTRACT_INPUT_BUILDER_GATE",
      targetMethodology: "MC001-2022",
      calculationMode: "explicit_validation",
      createdAt: "2026-06-22T00:00:00Z",
      createdBy: "PHYSICS_ENGINE_VALIDATION"
    }),
    sourceTrace: Object.freeze({
      documents: Object.freeze([
        Object.freeze({
          documentId: "FIELD_NOTE_001",
          documentType: "field_note",
          reviewStatus: "reviewed"
        }),
        Object.freeze({
          documentId: "DRAWING_A101",
          documentType: "drawing",
          reviewStatus: "reviewed"
        })
      ])
    }),
    buildingClassification: Object.freeze({
      sectionStatus: "ready",
      primaryCategoryKey: Object.freeze({
        value: "education",
        unit: "-",
        owner: "auditor_entered",
        sourceRefs: Object.freeze(["FIELD_NOTE_001"]),
        confidence: "reviewed",
        status: "ready",
        sourceAuditorClassification: "school education building",
        mappedMc001Category: "education",
        mappingRuleId: "MC001_CATEGORY_MAPPING_PHASE_C_FIXTURE",
        traceId: "CATEGORY_MAPPING_TRACE_001",
        responsibleModule: "mc001AuditorInputBuilderGate.mjs"
      })
    }),
    geometry: Object.freeze({
      sectionStatus: "ready",
      conditionedFloorArea: Object.freeze({
        value: 1200,
        unit: "m2",
        owner: "auditor_entered",
        sourceRefs: Object.freeze(["DRAWING_A101"]),
        confidence: "reviewed",
        status: "ready"
      })
    }),
    normativeReferences: Object.freeze([
      Object.freeze({
        recordId: "MC001_2_15_HTR_TOTAL",
        registryType: "formula",
        calculationMode: "explicit_validation"
      }),
      Object.freeze({
        recordId: "MC001_TABEL_5_17_PRIMARY_FACTORS:electricity",
        registryType: "table_row",
        calculationMode: "explicit_validation"
      }),
      Object.freeze({
        recordId: "SR_EN_15193_1_LIGHTING_DATA",
        registryType: "external_standard_dependency",
        requiresCalculationUse: false
      })
    ]),
    validationImports: Object.freeze([
      Object.freeze({
        importId: "VALIDATION_IMPORT_FIXTURE_004_HTR",
        targetFieldPath: "transmission.Htr",
        value: 504.3,
        unit: "W/K",
        source: "FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS",
        owner: "validation_import_with_source",
        sourceRefs: Object.freeze(["FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS"]),
        traceId: "VALIDATION_IMPORT_TRACE_FIXTURE_004_HTR",
        importContext: "Fixture 004 reviewed Htr comparison import for Phase C gate validation",
        sourceFixtureId: "FIXTURE_004_TRANSMISSION_LOSS_TABLE_TOTALS",
        reviewStatus: "reviewed",
        validatesFormulaPath: false
      })
    ]),
    expertOverrides: Object.freeze([
      Object.freeze({
        overrideId: "EXPERT_OVERRIDE_HVE_SOURCE_CHECK",
        targetFieldPath: "ventilation.Hve",
        value: 214.2,
        unit: "W/K",
        owner: "measured_override_with_source",
        source: "FIELD_NOTE_001",
        reason: "Auditor reviewed measured ventilation source for validation comparison only.",
        approvedBy: "AUDITOR_FIXTURE_REVIEW",
        confidence: "reviewed",
        traceId: "EXPERT_OVERRIDE_TRACE_HVE_SOURCE_CHECK",
        timestamp: "2026-06-22T00:00:00Z",
        sourceRefs: Object.freeze(["FIELD_NOTE_001"])
      })
    ]),
    explicitBlockers: Object.freeze([
      Object.freeze({
        blockerId: "lighting_external_standard_blocked",
        status: "blocked_external_standard",
        reason: "Lighting remains blocked by SR EN 15193-1 dependency.",
        sourceRefs: Object.freeze(["NB-GAP-012", "SR_EN_15193_1_LIGHTING_DATA"])
      }),
      Object.freeze({
        blockerId: "general_rer_methodology_blocked",
        status: "blocked_missing_normative_data",
        reason: "General RER remains blocked; display-only reconciliation is not a calculation path.",
        sourceRefs: Object.freeze(["NB-GAP-016", "MC001_DISPLAY_RER_RECONCILIATION"])
      })
    ])
  }),
  expected: Object.freeze({
    gateId: "MC001_AUDITOR_INPUT_BUILDER_GATE_PHASE_C",
    status: "accepted_input_builder_gate",
    acceptedNormativeReferenceCount: 3,
    acceptedValidationImportCount: 1,
    acceptedExpertOverrideCount: 1,
    derivedValuesAcceptedAsNormalInput: false,
    validationImportsValidateFormulaPaths: false
  })
});
