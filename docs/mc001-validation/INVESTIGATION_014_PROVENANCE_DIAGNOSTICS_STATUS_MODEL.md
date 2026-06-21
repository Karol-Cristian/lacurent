# INVESTIGATION 014 - Provenance, Diagnostics, And Status Model

## Status

- Investigation id: `INVESTIGATION_014_PROVENANCE_DIAGNOSTICS_STATUS_MODEL`
- Milestone: `PHASE_A_FULL_AUDITOR_ENGINE_CONTRACTS`
- Scope: provenance, diagnostics, readiness, and status model design only.
- Target user: energy auditor.
- Code changes justified: no.
- Runtime diagnostics implementation justified: no.
- Certificate/report output justified: no.

This investigation defines the common result envelope, provenance fields, diagnostic records, status vocabulary, readiness gates, and fail-closed behavior for a future full MC001 Auditor Engine. It does not implement diagnostic code, result wrappers, helpers, orchestrators, UI, API, DB, Workers, report generation, or certificate/CPE workflow.

## Purpose

A full MC001 audit engine must be explainable to an energy auditor. Every value must be traceable to inputs, normative sources, formulas, overrides, and blockers. Every missing or ambiguous path must produce a structured diagnostic instead of disappearing into text or a partial result.

This model gives future engine layers a shared language for:

- calculated values;
- source references;
- helper traces;
- blockers;
- readiness claims;
- warnings;
- display-only reconciliations;
- expert overrides;
- downstream report/certificate adapter gates.

## Files Inspected

| File | Reason |
| --- | --- |
| `docs/mc001-validation/INVESTIGATION_011_FULL_MC001_AUDITOR_ENGINE_ARCHITECTURE.md` | Parent provenance/status architecture. |
| `docs/mc001-validation/INVESTIGATION_012_AUDITOR_INPUT_CONTRACT.md` | Input section statuses, source refs, overrides, and blockers. |
| `docs/mc001-validation/INVESTIGATION_013_NORMATIVE_KNOWLEDGE_BASE_SCHEMA.md` | Normative status and source metadata. |
| `docs/mc001-validation/FIXTURE_018_LEVEL_1_FAIL_CLOSED_HARDENING.md` | Current fail-closed readiness claims and blocker requirements. |
| `docs/mc001-validation/GAP_ANALYSIS.md` | Current unresolved ambiguity and blocker inventory. |
| `docs/mc001-extraction/19_extraction_registry.md` | Missing-input status vocabulary. |

## Input Model

The provenance and diagnostics model consumes:

- auditor input contract field envelopes;
- normative KB formula/table/symbol/unit/applicability records;
- helper call inputs and outputs;
- source document references;
- explicit blockers;
- assumptions;
- expert overrides;
- measured/facture comparison records;
- result graph dependencies.

It emits:

- value envelopes;
- diagnostics;
- blocker summaries;
- readiness decisions;
- audit trace graph;
- downstream adapter eligibility.

## Value Envelope

Every orchestrator-level derived value should use this shape:

```js
{
  resultId: "transmission.Htr",
  domain: "transmission",
  symbol: "Htr",
  label: "Total transmission heat-transfer coefficient",
  value: 512.34,
  unit: "W/K",
  status: "calculated",
  confidence: "reviewed",
  sourceRefs: [],
  formulaRefs: ["MC001_2_15_HTR_TOTAL"],
  tableRefs: [],
  inputDependencies: ["transmission.Hd", "transmission.Hg", "transmission.Hu", "transmission.Ha"],
  helperTraceRefs: ["helperTrace.transmission.Htr.001"],
  engineVersion: "phase-a-design",
  moduleId: "thermal-envelope-engine",
  modulePath: "future:src/physics-engine/envelope-or-thermal-envelope",
  diagnostics: [],
  blocker: null,
  override: null,
  precision: {
    internalDecimals: 6,
    displayDecimals: 2,
    toleranceAbs: null
  }
}
```

Required fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `resultId` | yes | Stable path-like id in the result graph. |
| `domain` | yes | Envelope, ventilation, monthly balance, systems, indicators, classes, diagnostics. |
| `symbol` | yes for methodology values | MC001 or engine symbol. |
| `value` | yes, nullable | Calculated, display-only, measured, or null if blocked. |
| `unit` | yes for numeric values | Canonical unit. |
| `status` | yes | Status model value. |
| `confidence` | yes | Review/source confidence. |
| `sourceRefs[]` | yes | Input and normative source references. |
| `formulaRefs[]` | yes for formula outputs | Formula ids from normative KB. |
| `tableRefs[]` | yes where table-backed | Table/row ids. |
| `inputDependencies[]` | yes | Input/result ids consumed. |
| `helperTraceRefs[]` | yes when helper called | Helper trace ids. |
| `engineVersion` | yes | Physics Engine or contract version that produced the value. |
| `moduleId` | yes | Logical engine module responsible for the value. |
| `modulePath` | yes when implemented | Implementation module path or future module target. |
| `diagnostics[]` | yes, can be empty | Diagnostic ids attached to value. |
| `blocker` | required when status is blocked/ambiguous | Structured blocker reference. |
| `override` | required when overridden | Override id and source. |

## Source Reference Model

```js
{
  sourceRefId: "SRC_MC001_T5_17_ELECTRICITY",
  sourceType: "normative_table_row",
  documentId: "MC001-2022",
  section: "5",
  pageRefs: [],
  table: "Tabel 5.17",
  row: "electricity",
  fieldPath: null,
  reviewStatus: "reviewed",
  confidence: "reviewed"
}
```

Source types:

- `auditor_field_note`
- `drawing`
- `photo`
- `measurement`
- `facture`
- `equipment_datasheet`
- `normative_formula`
- `normative_table`
- `normative_table_row`
- `external_dataset`
- `investigation_doc`
- `validation_fixture`
- `expert_override`

Fail closed if a calculation-relevant source ref is missing, unknown, blocked, or incompatible with the requested calculation mode.

## Helper Trace Model

```js
{
  helperTraceId: "helperTrace.transmission.Htr.001",
  helperName: "calculateTotalTransmissionCoefficient",
  helperVersion: "current",
  engineVersion: "phase-a-design",
  moduleId: "thermal-envelope-engine",
  modulePath: "future:src/physics-engine/envelope-or-thermal-envelope",
  formulaRefs: ["MC001_2_15_HTR_TOTAL"],
  inputSnapshot: {
    hd: { value: 400, unit: "W/K", sourceRefs: [] },
    hg: { value: 112.34, unit: "W/K", sourceRefs: [] }
  },
  outputSnapshot: {
    value: 512.34,
    unit: "W/K"
  },
  status: "calculated",
  diagnostics: []
}
```

The helper trace proves what the engine called. It does not replace normative provenance; both must be present for full audit trace.

## Diagnostic Record

```js
{
  diagnosticId: "diag.monthlyHeating.aprilBoundaryBlocked",
  severity: "blocking",
  status: "ambiguous_mc001_example",
  domain: "monthly_balance",
  resultIds: ["monthlyHeating.Apr.QHnd"],
  inputPaths: ["climateAndSetpoints.monthlyExteriorTemperatures[3]"],
  blockerId: "april_boundary_heating_period_method_blocked",
  message: "April boundary heating-period method remains blocked.",
  sourceRefs: ["INVESTIGATION_002_HEATING_PERIOD_BOUNDARY_FORMULA"],
  readinessImpact: {
    level2Ready: false,
    certificateCpeReady: false,
    reportAdapterReady: false
  }
}
```

Diagnostic severities:

- `info`
- `warning`
- `blocking`
- `source_conflict`
- `out_of_scope`

## Status Model

| Status | Meaning | Value allowed? | Blocks full audit? |
| --- | --- | --- | --- |
| `validated` | Reproduces reviewed fixture or dataset rule. | yes | no |
| `calculated` | Calculated from explicit inputs and registered formula, without fixture expected value. | yes | no if dependencies complete |
| `display_reconciliation_only` | Matches displayed source arithmetic but not general methodology. | yes | yes for methodology/certificate claims |
| `blocked_missing_input` | Required auditor/source input is missing. | null preferred | yes |
| `blocked_missing_normative_data` | Required normative table/formula/dataset is missing or incomplete. | null preferred | yes |
| `blocked_external_standard` | Required external standard dependency is not locally extracted or provided. | null preferred | yes |
| `ambiguous_mc001_example` | Source example conflicts with formula or surrounding display. | optional display value only | yes |
| `requires_expert_override` | A manual source-backed override is required before calculation. | null until override | yes |
| `not_applicable` | Domain does not apply based on explicit source-backed context. | null | no |
| `out_of_scope_current_phase` | Domain intentionally excluded from current implementation phase. | null | yes for full audit/certificate readiness |
| `measured_comparison_only` | Value comes from facture/meter data for comparison, not MC001 calculation. | yes | yes if used as methodology output |
| `overridden_with_source` | Expert override is present and source-backed. | yes | depends on domain policy |

## Readiness Model

Readiness is a set of explicit false-by-default claims:

```js
{
  isInputContractComplete: false,
  isNormativeKbComplete: false,
  isLevel1Ready: false,
  isLevel2Ready: false,
  isFullMc001AuditReady: false,
  isReportAdapterReady: false,
  isCertificateCpeWorkflowReady: false,
  isProductionIntegrationReady: false
}
```

Readiness claims can become true only when:

- all required domains are present;
- all required fields are source-backed;
- all required normative records exist and are reviewed;
- no blocking diagnostic affects the readiness scope;
- all display-only values are excluded from methodology claims;
- measured values are not substituted for MC001 calculations;
- every expert override has source, reason, unit, and required approval;
- the relevant validation fixture or real-case shadow validation exists.

## Readiness Gate Matrix

| Gate | Required conditions | Must remain false when |
| --- | --- | --- |
| `isInputContractComplete` | All required sections present with field envelopes and sources. | Missing section, missing field, missing source, unknown unit. |
| `isNormativeKbComplete` | Required formula/table/symbol/unit/applicability records reviewed. | Missing climate, lighting, reference, RER, DHW final, or other normative blocker. |
| `isLevel1Ready` | Existing explicit Level 1 sections complete. | Required Level 1 blockers missing or core fields incomplete. |
| `isLevel2Ready` | Complete full auditor input graph plus normative KB and provenance model. | Any full-auditor domain blocked/out of scope. |
| `isFullMc001AuditReady` | All MC001 domains calculated or explicitly not applicable with source. | Any required system, climate, DHW, RER, reference, class, or certificate context blocked. |
| `isReportAdapterReady` | Complete non-official result graph and report fields. | Missing report fields or blocked methodology. |
| `isCertificateCpeWorkflowReady` | Complete official workflow requirements, reference building, class labels, and CPE context. | Any certificate/CPE blocker remains. |
| `isProductionIntegrationReady` | Adapters validated without bypassing Physics Engine gates. | UI/API/DB/product integration unvalidated or using estimates. |

## Normative Data Ownership

Provenance references normative records but does not own them.

| Provenance field | Normative KB owner |
| --- | --- |
| `formulaRefs[]` | Formula registry. |
| `tableRefs[]` | Table/table-row registry. |
| `symbol` and `unit` | Symbol and unit registries. |
| `applicabilityRuleIds[]` | Applicability registry. |
| `status` definitions | Status registry. |
| `blocked_external_standard` reasons | External standard registry. |

## Calculated Outputs

The model supports these output groups:

- domain value envelopes;
- helper call traces;
- source reference graph;
- diagnostic list;
- blocker list;
- readiness object;
- display reconciliation notes;
- measured comparison notes;
- override audit trail;
- downstream adapter eligibility.

The model does not calculate physics values itself.

## Fail-Closed Rules

The provenance/diagnostics layer must fail closed when:

- a calculated value has no formula ref;
- a table-backed value has no table ref;
- a numeric value has no unit;
- a helper output lacks input dependencies;
- a blocked value is emitted without a blocker id;
- an override value lacks source or reason;
- a readiness claim is true while blocking diagnostics exist;
- a display-only value is used for methodology validation;
- a measured/facture value is used as MC001 result without explicit override policy;
- a status is unknown;
- a diagnostic severity is unknown;
- an error is hidden in prose instead of structured diagnostics.

## Blockers Preserved

The diagnostics layer must preserve these blockers as structured records:

| Blocker id | Domain | Default status |
| --- | --- | --- |
| `april_boundary_heating_period_method_blocked` | monthly balance | `ambiguous_mc001_example` |
| `september_boundary_heating_period_method_blocked` | monthly balance | `ambiguous_mc001_example` |
| `october_mc001_worked_example_ambiguity` | monthly balance | `ambiguous_mc001_example` |
| `full_dhw_final_energy_chain_blocked` | DHW systems | `blocked_missing_input` |
| `annual_dhw_distribution_loss_basis_blocked` | DHW systems | `blocked_missing_input` |
| `dhw_storage_generation_recovered_auxiliary_paths_blocked` | DHW systems | `blocked_missing_input` |
| `general_rer_methodology_perimeter_export_blocked` | RER | `blocked_missing_normative_data` |
| `anexa_b_co2_display_inconsistency_blocked` | CO2 | `ambiguous_mc001_example` |
| `anexa_b_displayed_class_labels_blocked` | classification/certificate | `blocked_missing_input` |
| `mixed_use_weighted_thresholds_blocked` | classification | `blocked_missing_normative_data` |
| `overheating_discomfort_hours_above_26c_blocked` | classification/certificate | `blocked_missing_input` |
| `virtual_ventilation_full_calculation_blocked` | ventilation/certificate | `blocked_missing_input` |
| `lighting_blocked` | lighting | `blocked_external_standard` |
| `cooling_systems_blocked` | cooling | `blocked_missing_input` |
| `reference_building_blocked` | reference building | `blocked_missing_normative_data` |
| `certificate_cpe_generation_blocked` | certificate/CPE | `out_of_scope_current_phase` |
| `climate_solar_dataset_blocked` | climate/solar | `blocked_missing_normative_data` |

## Downstream Engine Usage

| Downstream layer | Usage |
| --- | --- |
| `input-normalization-and-validation` | Emits section diagnostics and missing-field blockers. |
| `normative-knowledge-base` | Supplies formula/table/source/status references. |
| `derived-coefficients-engine` | Wraps helper outputs in value envelopes. |
| `thermal-envelope-engine` | Emits Htr-domain values, blockers, and source graph. |
| `ventilation-engine` | Emits airflow/Hve/Qve values and ventilation blockers. |
| `monthly-balance-engine` | Emits monthly values plus Apr/Sep/Oct blockers. |
| `service-systems-engine` | Emits final-energy rows or blocked system paths. |
| `final-primary-co2-engine` | Emits factor trace, primary/CO2 values, and conflicts. |
| `classification-and-threshold-engine` | Emits class/threshold results and certificate blockers. |
| `full-mc001-orchestrator` | Aggregates value graph, diagnostics, blockers, and readiness. |
| `report/certificate-adapter` | Reads readiness only; must not create methodology values. |

## Out-Of-Scope Boundaries

This investigation does not:

- implement result wrappers;
- update helper return values;
- add diagnostic code;
- add tests;
- create a report adapter;
- create certificate/CPE workflow;
- create UI/API/DB/Worker integration;
- change formulas;
- resolve source conflicts;
- convert existing fixtures to the new envelope.

## Review Checklist For Future Implementation

A future implementation is ready only when:

- every orchestrator output has a value envelope;
- every helper call has trace;
- every blocker has id, domain, status, source, reason, readiness impact;
- readiness defaults false and is proven true only by complete dependencies;
- display-only and measured-comparison values cannot be promoted to methodology outputs;
- existing Level 1 fail-closed behavior remains unchanged.
