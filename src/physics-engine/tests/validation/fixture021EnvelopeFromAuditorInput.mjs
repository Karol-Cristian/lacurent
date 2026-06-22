import { fixture020RegistryContractInputBuilderGate } from "./fixture020RegistryContractInputBuilderGate.mjs";

function valueEnvelope(value, unit, sourceRefs, extra = {}) {
  return Object.freeze({
    value,
    unit,
    owner: "auditor_entered",
    sourceRefs: Object.freeze(sourceRefs),
    confidence: "reviewed",
    status: "ready",
    ...extra
  });
}

export const fixture021EnvelopeFromAuditorInput = Object.freeze({
  fixtureId: "FIXTURE_021_ENVELOPE_FROM_AUDITOR_INPUT",
  fixtureType: "phase_d_envelope_from_auditor_input",
  sourceDocument: "Phase D narrow envelope input fixture",
  sourceNote:
    "Uses Phase C registry/input-gate contract plus source-backed raw envelope inputs.",
  scope:
    "Pure Physics Engine Phase D input-builder validation for source-backed exterior envelope transmission preparation.",
  exclusions: Object.freeze([
    "no Level 2 full MC001 auditor",
    "no complete runtime normative registry",
    "no complete envelope readiness",
    "no complete Htr readiness",
    "no climate dataset",
    "no monthly heating orchestration",
    "no cooling systems",
    "no lighting",
    "no DHW",
    "no renewables/RER",
    "no reference building",
    "no CPE/report/certificate workflow",
    "no UI/API/DB/Worker/deploy/product integration",
    "no new MC001 physics formulas",
    "no dataset migration"
  ]),
  registry: fixture020RegistryContractInputBuilderGate.registry,
  inputPack: Object.freeze({
    contractMetadata: Object.freeze({
      contractId: "PHASE_D_ENVELOPE_INPUT_FIXTURE_021",
      contractVersion: "PHASE_D_ENVELOPE_FROM_AUDITOR_INPUT",
      targetMethodology: "MC001-2022",
      calculationMode: "explicit_validation",
      createdAt: "2026-06-22T00:00:00Z",
      createdBy: "PHYSICS_ENGINE_VALIDATION"
    }),
    sourceTrace: Object.freeze({
      documents: Object.freeze([
        Object.freeze({
          documentId: "FIELD_NOTE_ENV_001",
          documentType: "field_note",
          reviewStatus: "reviewed"
        }),
        Object.freeze({
          documentId: "DRAWING_ENV_A101",
          documentType: "drawing",
          reviewStatus: "reviewed"
        }),
        Object.freeze({
          documentId: "LAMBDA_TABLE_ENV_001",
          documentType: "auditor_material_source",
          reviewStatus: "reviewed"
        }),
        Object.freeze({
          documentId: "BRIDGE_SCHEDULE_ENV_001",
          documentType: "thermal_bridge_schedule",
          reviewStatus: "reviewed"
        })
      ])
    }),
    buildingClassification: Object.freeze({
      sectionStatus: "ready",
      primaryCategoryKey: valueEnvelope("education", "-", ["FIELD_NOTE_ENV_001"], {
        sourceAuditorClassification: "school education building",
        mappedMc001Category: "education",
        mappingRuleId: "MC001_CATEGORY_MAPPING_PHASE_D_FIXTURE",
        traceId: "CATEGORY_MAPPING_TRACE_021",
        responsibleModule: "mc001EnvelopeInputBuilder.mjs"
      })
    }),
    geometry: Object.freeze({
      sectionStatus: "ready",
      conditionedFloorArea: valueEnvelope(1200, "m2", ["DRAWING_ENV_A101"])
    }),
    normativeReferences: Object.freeze([
      Object.freeze({
        recordId: "MC001_2_15_HTR_TOTAL",
        registryType: "formula",
        calculationMode: "explicit_validation"
      })
    ]),
    validationImports: Object.freeze([]),
    expertOverrides: Object.freeze([]),
    explicitBlockers: Object.freeze([
      Object.freeze({
        blockerId: "ground_contact_method_blocked_phase_d",
        status: "blocked_missing_normative_data",
        reason:
          "Ground-contact envelope method is intentionally outside Phase D unless supplied as source-backed explicit input.",
        sourceRefs: Object.freeze(["PHASE_D_SCOPE"])
      })
    ]),
    envelope: Object.freeze({
      elements: Object.freeze([
        Object.freeze({
          elementId: "EXT_WALL_001",
          elementType: "wall",
          boundaryType: "exterior",
          area: valueEnvelope(10, "m2", ["DRAWING_ENV_A101"]),
          rsi: valueEnvelope(0.13, "m2K/W", ["LAMBDA_TABLE_ENV_001"]),
          rse: valueEnvelope(0.04, "m2K/W", ["LAMBDA_TABLE_ENV_001"]),
          layers: Object.freeze([
            Object.freeze({
              layerId: "brick",
              materialId: "reviewed_brick_fixture",
              thickness: valueEnvelope(0.2, "m", ["DRAWING_ENV_A101"]),
              lambda: valueEnvelope(0.5, "W/mK", ["LAMBDA_TABLE_ENV_001"])
            }),
            Object.freeze({
              layerId: "insulation",
              materialId: "reviewed_insulation_fixture",
              thickness: valueEnvelope(0.1, "m", ["DRAWING_ENV_A101"]),
              lambda: valueEnvelope(0.04, "W/mK", ["LAMBDA_TABLE_ENV_001"])
            })
          ])
        }),
        Object.freeze({
          elementId: "EXT_ROOF_001",
          elementType: "roof",
          boundaryType: "exterior",
          area: valueEnvelope(5, "m2", ["DRAWING_ENV_A101"]),
          certifiedUValue: valueEnvelope(0.2, "W/m2K", ["FIELD_NOTE_ENV_001"])
        }),
        Object.freeze({
          elementId: "GROUND_SLAB_001",
          elementType: "slab",
          boundaryType: "ground",
          area: valueEnvelope(7, "m2", ["DRAWING_ENV_A101"]),
          certifiedUValue: valueEnvelope(0.3, "W/m2K", ["FIELD_NOTE_ENV_001"])
        })
      ]),
      thermalBridges: Object.freeze({
        linear: Object.freeze([
          Object.freeze({
            bridgeId: "LINEAR_BRIDGE_001",
            boundaryType: "exterior",
            psi: valueEnvelope(0.05, "W/(mK)", ["BRIDGE_SCHEDULE_ENV_001"]),
            length: valueEnvelope(10, "m", ["DRAWING_ENV_A101"])
          })
        ]),
        point: Object.freeze([])
      })
    })
  }),
  expected: Object.freeze({
    acceptedElementCount: 2,
    blockedElementCount: 1,
    acceptedBridgeCount: 1,
    wallUValueWPerM2K: 1 / 3.07,
    wallDirectTransmissionWPerK: 10 / 3.07,
    roofDirectTransmissionWPerK: 1,
    bridgeContributionWPerK: 0.5,
    directTransmissionSubtotalWPerK: 10 / 3.07 + 1 + 0.5
  })
});

