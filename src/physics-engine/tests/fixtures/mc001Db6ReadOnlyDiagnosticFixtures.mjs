export const MC001_DB6_DIAGNOSTIC_SCHEMA_VERSION =
  "mc001-db4-read-only-dry-run-diagnostic-contract-v1";

export const MC001_DB6_FORBIDDEN_SERIALIZED_TERMS = Object.freeze([
  "rawSnapshot",
  "sourceContext",
  "sourceTrace",
  "sourceLocator",
  "sourceRefs",
  "sourceRecordId",
  "answers",
  "person@example.com",
  "John Doe",
  "Strada Exemplu 12",
  "+40722111222",
  "free text note about the owner",
  "record-JohnDoe",
  "record-001",
  "owner-snapshot",
  "private-note",
  "person-name"
]);

const BASE_READINESS = Object.freeze({
  isHuInventoryReady: false,
  isCompleteHuReady: false,
  isCompleteHtrReady: false,
  hasHuResult: false,
  hasHtrResult: false,
  downstreamReadiness: false
});

const BASE_CONTRACT_SCOPE = Object.freeze({
  diagnosticsOnly: true,
  noDbRead: true,
  noDbWrite: true,
  noApiOrWorkerCall: true,
  noProductOrReportOutput: true,
  noNumericalHuOrHtr: true
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

function sourceTrace(traceId = "trace:db6-source-001") {
  return {
    source: "DB6 anonymized source-backed mapping",
    sourceRefs: ["record:db6-source-001"],
    sourceLocator: {
      documentId: "DB6-ANONYMIZED-SNAPSHOT",
      page: 12,
      section: "MC001-Hu"
    },
    traceId
  };
}

function huComponent(index, extra = {}) {
  return {
    componentId: `component:db6-hu-${index}`,
    conditionedZoneId: "ztc-db6-001",
    ztuZoneId: "ztu-db6-001",
    month: 1,
    element: {
      elementId: `element-db6-wall-${index}`,
      elementType: "wall",
      area: {
        value: index === 1 ? 12.5 : 8.75,
        unit: "m2"
      }
    },
    boundaryRelation: "external_non_climatized_zone",
    bztuPath: {
      pathType: "accepted_direct_input",
      recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
      entryId: "record:db6-bztu-001"
    },
    uValuePath: {
      pathType: "source_backed_corrected_u_value",
      value: index === 1 ? 0.31 : 0.29,
      unit: "W/(m2*K)",
      ...sourceTrace(`trace:db6-u-value-${index}`)
    },
    applicability: {
      appliesToMonth: 1,
      appliesToZtuZoneId: "ztu-db6-001",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    sourceTrace: sourceTrace(`trace:db6-hu-component-${index}`),
    ...clone(extra)
  };
}

function expectedComponentFrom(component) {
  return {
    componentId: component.componentId,
    conditionedZoneId: component.conditionedZoneId,
    ztuZoneId: component.ztuZoneId,
    month: component.month,
    elementId: component.element.elementId
  };
}

function bztuDirectInput(extra = {}) {
  return {
    entryId: "record:db6-bztu-001",
    recordId: "MC001_2022_2_22_BZTU_CORRECTION_FACTOR",
    value: 0.62,
    unit: "dimensionless",
    month: 1,
    ztuZoneId: "ztu-db6-001",
    ...sourceTrace("trace:db6-bztu-001"),
    methodologyStatus: "accepted",
    inputClassification: "explicit_methodological_direct_input",
    reviewStatus: "reviewed",
    calculationPeriod: "monthly",
    applicability: {
      calculationPeriod: "monthly",
      notAdjacentToAnotherZtu: true,
      multipleAdjacentConditionedZones: false
    },
    adjacentConditionedZoneRelation: "ztc-db6-001_to_ztu-db6-001",
    ...clone(extra)
  };
}

function validHuInventory(extra = {}) {
  const first = huComponent(1);
  const second = huComponent(2);

  return {
    month: 1,
    conditionedZoneIds: ["ztc-db6-001"],
    ztuZoneIds: ["ztu-db6-001"],
    expectedComponents: [
      expectedComponentFrom(first),
      expectedComponentFrom(second)
    ],
    componentCandidates: [first, second],
    sourceTrace: sourceTrace("trace:db6-hu-inventory-001"),
    ...clone(extra)
  };
}

function readinessInputFrom({ inventory, bztuInputs }) {
  return {
    contractMetadata: {
      contractId: "PHASE_DB6_READ_ONLY_DIAGNOSTIC_FIXTURE",
      contractVersion: "PHASE_DB6_READ_ONLY_DIAGNOSTIC_FIXTURES_AND_GOLDEN_OUTPUTS",
      targetMethodology: "MC001-2022",
      calculationMode: "read_only_diagnostic",
      createdAt: "2026-06-30T00:00:00Z",
      createdBy: "PHYSICS_ENGINE_PHASE_DB6_FIXTURE"
    },
    buildingClassification: {
      sectionStatus: "ready",
      primaryCategoryKey: {
        value: "education",
        unit: "-",
        owner: "auditor_entered",
        sourceRefs: ["record:db6-category-001"],
        confidence: "reviewed",
        status: "ready",
        sourceAuditorClassification: "anonymous education building",
        mappedMc001Category: "education",
        mappingRuleId: "MC001_CATEGORY_MAPPING_DB6",
        traceId: "trace:db6-category-001"
      }
    },
    sourceTrace: {
      documents: [
        {
          documentId: "DB6-ANONYMIZED-SNAPSHOT",
          documentType: "anonymized_snapshot",
          reviewStatus: "reviewed"
        }
      ]
    },
    envelope: {
      elements: [],
      thermalBridges: []
    },
    ventilation: {
      airProperties: null,
      components: []
    },
    explicitBlockers: [],
    huMultiComponentInventory: inventory,
    bztuDirectInputs: bztuInputs
  };
}

function explicitSnapshot({
  analysisId,
  buildingId,
  inventory,
  bztuInputs,
  source = sourceTrace("trace:db6-mapping-001"),
  readinessInput,
  extraMc001Readiness = {},
  extraSnapshot = {}
}) {
  const input =
    readinessInput ??
    readinessInputFrom({
      inventory,
      bztuInputs
    });

  return {
    analysis: {
      id: analysisId,
      status: "completed"
    },
    building: {
      id: buildingId,
      archetype: "anonymized_school_like_building"
    },
    profiles: {
      building_features: {
        attic: true,
        garage: false
      }
    },
    sourceContext: {
      snapshotTimestamp: "2026-06-30T00:00:00.000Z",
      sourceIdentifiers: [`analysis:${analysisId}`, `building:${buildingId}`]
    },
    mc001Readiness: {
      selectedAnalysisId: analysisId,
      selectedBuildingId: buildingId,
      snapshotTimestamp: "2026-06-30T00:00:00.000Z",
      zoneMapping: {
        conditionedZones: [{ zoneId: "ztc-db6-001" }],
        ztuZones: [{ ztuZoneId: "ztu-db6-001" }]
      },
      huMultiComponentInventory: inventory,
      bztuDirectInputs: bztuInputs,
      sourceTrace: source,
      readinessInput: input,
      ...clone(extraMc001Readiness)
    },
    ...clone(extraSnapshot)
  };
}

function expected({
  status = "blocked",
  mapperStatus = "blocked",
  isMappable = false,
  orchestratorRan = false,
  orchestratorStatus = "not_run",
  counts,
  expectedDiagnosticCodes = [],
  expectedPrivacyWarnings = [],
  forbiddenSerializedTerms = MC001_DB6_FORBIDDEN_SERIALIZED_TERMS
}) {
  return deepFreeze({
    status,
    schemaVersion: MC001_DB6_DIAGNOSTIC_SCHEMA_VERSION,
    isReadOnlyDiagnosticContract: true,
    readiness: BASE_READINESS,
    pipeline: {
      mapper: {
        status: mapperStatus,
        isMappableForHuInventoryReadiness: isMappable
      },
      orchestrator: {
        ran: orchestratorRan,
        status: orchestratorStatus
      }
    },
    counts,
    expectedDiagnosticCodes,
    expectedPrivacyWarnings,
    forbiddenSerializedTerms,
    contractScope: BASE_CONTRACT_SCOPE
  });
}

function genericSavedAppSnapshot() {
  return {
    analysis: {
      id: "analysis-db6-generic-001",
      status: "completed"
    },
    building: {
      id: "building-db6-generic-001",
      area: 142,
      climateRegion: "anonymous-region"
    },
    answers: {
      attic: "yes",
      basement: "no",
      wall_material: "brick",
      wall_insulation: "partial",
      heating_type: "gas_boiler"
    },
    profiles: {
      building_features: {
        attic: true,
        garage: true,
        floors: 2
      },
      envelope_profiles: {
        wall_material: "brick",
        wall_insulation: "partial"
      }
    },
    sourceContext: {
      snapshotTimestamp: "2026-06-30T00:00:00.000Z",
      sourceIdentifiers: ["analysis:analysis-db6-generic-001"]
    }
  };
}

function incompleteExplicitSnapshot() {
  return {
    analysis: {
      id: "analysis-db6-incomplete-001",
      status: "completed"
    },
    building: {
      id: "building-db6-incomplete-001"
    },
    mc001Readiness: {
      selectedAnalysisId: "analysis-db6-incomplete-001",
      selectedBuildingId: "building-db6-incomplete-001",
      snapshotTimestamp: "2026-06-30T00:00:00.000Z",
      zoneMapping: {
        conditionedZones: [{ zoneId: "ztc-db6-001" }]
      },
      huMultiComponentInventory: {
        month: 1,
        expectedComponents: [],
        componentCandidates: [],
        sourceTrace: sourceTrace("trace:db6-incomplete-inventory-001")
      },
      sourceTrace: sourceTrace("trace:db6-incomplete-mapping-001")
    }
  };
}

function huInventoryReadySnapshot() {
  const inventory = validHuInventory();
  const bztuInputs = [bztuDirectInput()];
  return explicitSnapshot({
    analysisId: "analysis-db6-ready-001",
    buildingId: "building-db6-ready-001",
    inventory,
    bztuInputs,
    source: sourceTrace("trace:db6-ready-mapping-001")
  });
}

function adversarialPrivacySnapshot() {
  const inventory = validHuInventory();
  const bztuInputs = [bztuDirectInput()];
  const snapshot = explicitSnapshot({
    analysisId: "analysis-db6-privacy-001",
    buildingId: "building-db6-privacy-001",
    inventory,
    bztuInputs,
    source: sourceTrace("trace:db6-privacy-mapping-001"),
    extraSnapshot: {
      sourceContext: {
        analysisId: "JohnDoeAnalysis",
        buildingId: "Strada Exemplu 12",
        snapshotId: "owner-snapshot",
        sourceType: "+40722111222",
        sourceField: "private-note",
        sourceRecordId: "person@example.com",
        sourceIdentifiers: [
          "person@example.com",
          "John Doe",
          "record-JohnDoe",
          "record-001",
          "analysis:analysis-db6-privacy-001"
        ]
      },
      rawSnapshot: {
        answers: {
          ownerName: "John Doe",
          ownerEmail: "person@example.com",
          ownerPhone: "+40722111222",
          ownerAddress: "Strada Exemplu 12",
          note: "free text note about the owner"
        }
      }
    }
  });

  snapshot.mc001Readiness.sourceTrace.records = [
    {
      sourceIdentifier: "person@example.com",
      sourceType: "+40722111222",
      sourceTable: "JohnDoe",
      sourceField: "private-note",
      sourceRecordId: "record-JohnDoe",
      traceId: "person-name",
      sourceRefs: ["record-001", "Strada Exemplu 12"],
      sourceLocator: {
        note: "free text note about the owner",
        page: 95,
        section: "MC001-Hu"
      }
    }
  ];

  return snapshot;
}

function sourceProvenanceGapSnapshot() {
  const first = huComponent(1, {
    sourceTrace: null
  });
  const second = huComponent(2);
  const inventory = {
    month: 1,
    conditionedZoneIds: ["ztc-db6-001"],
    ztuZoneIds: ["ztu-db6-001"],
    expectedComponents: [
      expectedComponentFrom(first),
      expectedComponentFrom(second)
    ],
    componentCandidates: [first, second],
    sourceTrace: {
      source: "",
      sourceRefs: [],
      sourceLocator: {}
    }
  };
  const bztuInputs = [bztuDirectInput()];

  return explicitSnapshot({
    analysisId: "analysis-db6-source-gap-001",
    buildingId: "building-db6-source-gap-001",
    inventory,
    bztuInputs,
    source: {
      source: "",
      sourceRefs: [],
      sourceLocator: {}
    }
  });
}

export const mc001Db6ReadOnlyDiagnosticFixtures = deepFreeze([
  {
    fixtureId: "DB6_GENERIC_SAVED_APP_NOT_MAPPABLE",
    description:
      "Realistic anonymized saved-app snapshot without explicit MC001 readiness mapping.",
    snapshot: genericSavedAppSnapshot(),
    expected: expected({
      counts: {
        blockers: 6,
        warnings: 2,
        gaps: 9
      },
      expectedDiagnosticCodes: [
        "unknown_blocker",
        "blocked_missing_explicit_mc001_readiness_mapping",
        "blocked_missing_ztu_zone_mapping",
        "blocked_missing_hu_inventory_mapping",
        "blocked_missing_bztu_path",
        "unknown_gap",
        "source_trace_sanitized"
      ],
      expectedPrivacyWarnings: [
        "source_trace_sanitized",
        "diagnostic_content_sanitized"
      ]
    })
  },
  {
    fixtureId: "DB6_INCOMPLETE_EXPLICIT_MC001_MAPPING",
    description:
      "Explicit MC001 readiness section exists but is incomplete and remains not mappable.",
    snapshot: incompleteExplicitSnapshot(),
    expected: expected({
      counts: {
        blockers: 5,
        warnings: 2,
        gaps: 11
      },
      expectedDiagnosticCodes: [
        "unknown_blocker",
        "blocked_missing_bztu_path",
        "unknown_gap",
        "source_trace_sanitized"
      ],
      expectedPrivacyWarnings: [
        "source_trace_sanitized",
        "diagnostic_content_sanitized"
      ]
    })
  },
  {
    fixtureId: "DB6_HU_INVENTORY_READY_EXPLICIT_MAPPING",
    description:
      "Explicit source-backed Hu inventory mapping reaches current DB5/DB4 golden behavior without complete Hu/Htr readiness.",
    snapshot: huInventoryReadySnapshot(),
    expected: expected({
      mapperStatus: "ready_for_hu_inventory_readiness_input",
      isMappable: true,
      counts: {
        blockers: 1,
        warnings: 2,
        gaps: 7
      },
      expectedDiagnosticCodes: [
        "unknown_blocker",
        "unknown_gap",
        "source_trace_sanitized"
      ],
      expectedPrivacyWarnings: [
        "source_trace_sanitized",
        "diagnostic_content_sanitized"
      ]
    })
  },
  {
    fixtureId: "DB6_ADVERSARIAL_PRIVACY_SENTINELS",
    description:
      "Synthetic adversarial sentinel values prove DB5 output remains privacy-safe.",
    snapshot: adversarialPrivacySnapshot(),
    expected: expected({
      mapperStatus: "ready_for_hu_inventory_readiness_input",
      isMappable: true,
      counts: {
        blockers: 1,
        warnings: 4,
        gaps: 22
      },
      expectedDiagnosticCodes: [
        "unknown_blocker",
        "unknown_gap",
        "source_trace_sanitized",
        "source_context_sanitized",
        "source_identifiers_sanitized"
      ],
      expectedPrivacyWarnings: [
        "source_trace_sanitized",
        "source_context_sanitized",
        "source_identifiers_sanitized",
        "diagnostic_content_sanitized"
      ]
    })
  },
  {
    fixtureId: "DB6_SOURCE_PROVENANCE_GAP",
    description:
      "Shape is close to mappable, but missing source/provenance keeps diagnostics blocked.",
    snapshot: sourceProvenanceGapSnapshot(),
    expected: expected({
      counts: {
        blockers: 3,
        warnings: 2,
        gaps: 6
      },
      expectedDiagnosticCodes: [
        "unknown_blocker",
        "unknown_gap",
        "source_trace_sanitized"
      ],
      expectedPrivacyWarnings: [
        "source_trace_sanitized",
        "diagnostic_content_sanitized"
      ]
    })
  }
]);
