import { fixture021EnvelopeFromAuditorInput } from "./fixture021EnvelopeFromAuditorInput.mjs";

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

export const fixture023VentilationFromAuditorInput = Object.freeze({
  fixtureId: "FIXTURE_023_VENTILATION_FROM_AUDITOR_INPUT",
  fixtureType: "phase_f_ventilation_from_auditor_input",
  sourceDocument: "Phase F narrow ventilation input fixture",
  sourceNote:
    "Uses Phase C input-gate contract plus source-backed raw ventilation inputs.",
  scope:
    "Pure Physics Engine Phase F input-builder validation for source-backed ventilation/Hve preparation.",
  exclusions: Object.freeze([
    "no full Htr readiness",
    "no full envelope engine readiness",
    "no full heat-loss engine readiness",
    "no Level 2 Full Auditor readiness",
    "no climate/monthly heating readiness",
    "no solar gains",
    "no internal gains",
    "no cooling",
    "no lighting",
    "no DHW",
    "no renewables/RER",
    "no reference building",
    "no CPE/report/certificate workflow",
    "no UI/API/DB/Worker/deploy/product integration",
    "no new MC001 physics formulas"
  ]),
  registry: fixture021EnvelopeFromAuditorInput.registry,
  inputPack: Object.freeze({
    contractMetadata: Object.freeze({
      contractId: "PHASE_F_VENTILATION_INPUT_FIXTURE_023",
      contractVersion: "PHASE_F_VENTILATION_INPUT_AND_HEAT_LOSS_READINESS",
      targetMethodology: "MC001-2022",
      calculationMode: "explicit_validation",
      createdAt: "2026-06-22T00:00:00Z",
      createdBy: "PHYSICS_ENGINE_VALIDATION"
    }),
    sourceTrace: Object.freeze({
      documents: Object.freeze([
        Object.freeze({
          documentId: "VENT_FIELD_NOTE_023",
          documentType: "field_note",
          reviewStatus: "reviewed"
        }),
        Object.freeze({
          documentId: "VENT_AIRFLOW_BALANCE_023",
          documentType: "ventilation_airflow_balance",
          reviewStatus: "reviewed"
        }),
        Object.freeze({
          documentId: "VENT_CONSTANTS_023",
          documentType: "source_backed_air_properties",
          reviewStatus: "reviewed"
        })
      ])
    }),
    buildingClassification: Object.freeze({
      sectionStatus: "ready",
      primaryCategoryKey: valueEnvelope("education", "-", ["VENT_FIELD_NOTE_023"], {
        sourceAuditorClassification: "school education building",
        mappedMc001Category: "education",
        mappingRuleId: "MC001_CATEGORY_MAPPING_PHASE_F_FIXTURE",
        traceId: "CATEGORY_MAPPING_TRACE_023",
        responsibleModule: "mc001VentilationInputBuilder.mjs"
      })
    }),
    geometry: Object.freeze({
      sectionStatus: "ready",
      conditionedFloorArea: valueEnvelope(1200, "m2", ["VENT_FIELD_NOTE_023"])
    }),
    normativeReferences: Object.freeze([]),
    validationImports: Object.freeze([]),
    expertOverrides: Object.freeze([]),
    explicitBlockers: Object.freeze([
      Object.freeze({
        blockerId: "climate_monthly_heating_blocked_phase_f",
        status: "blocked_missing_climate_dataset",
        reason:
          "Climate and monthly heating remain outside Phase F ventilation input readiness.",
        sourceRefs: Object.freeze(["PHASE_F_SCOPE"])
      })
    ]),
    ventilation: Object.freeze({
      airProperties: Object.freeze({
        airDensity: valueEnvelope(1.2, "kg/m3", ["VENT_CONSTANTS_023"]),
        specificHeatCapacity: valueEnvelope(1000, "J/kgK", ["VENT_CONSTANTS_023"])
      }),
      components: Object.freeze([
        Object.freeze({
          componentId: "NATURAL_EXTERIOR_FLOW_023",
          ventilationType: "natural",
          ventilationPath: "natural_exterior_air",
          airflowM3h: valueEnvelope(180, "m3/h", ["VENT_AIRFLOW_BALANCE_023"]),
          bve: valueEnvelope(1, "-", ["VENT_FIELD_NOTE_023"]),
          fveDyn: valueEnvelope(1, "-", ["VENT_FIELD_NOTE_023"])
        })
      ])
    })
  }),
  expected: Object.freeze({
    acceptedComponentCount: 1,
    blockedComponentCount: 0,
    hveStatus: "ready",
    hveWPerK: 60,
    unsupportedVentilationStatus: "blocked_unsupported_ventilation_path",
    isHveReady: true,
    isCompleteHeatLossReady: false
  })
});
