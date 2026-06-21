# INVESTIGATION 013 - Normative Knowledge Base Schema

## Status

- Investigation id: `INVESTIGATION_013_NORMATIVE_KNOWLEDGE_BASE_SCHEMA`
- Milestone: `PHASE_A_FULL_AUDITOR_ENGINE_CONTRACTS`
- Scope: normative knowledge-base schema design only.
- Target user: energy auditor, through the Physics Engine.
- Code changes justified: no.
- Dataset migration justified: no.
- Formula implementation justified: no.

This investigation defines the schema direction for MC001 formulas, tables, symbols, units, applicability rules, statuses, and blocked external standards. It does not move existing datasets, create new registries, implement formulas, change helper behavior, or add product/report/certificate integration.

## Purpose

The normative knowledge base is the source of truth for MC001 methodology metadata. Future calculators and orchestrators must ask this layer for formulas, table rows, symbols, units, applicability, confidence, and blockers instead of hardcoding normative values or silently using defaults.

The schema must make missing normative references visible. Missing data is not an empty registry entry; it is a first-class blocker.

## Input Model

The future normative knowledge base input model is a set of versioned registry records, not auditor-entered building data. Each record declares its registry type, source references, methodology version, status, confidence, blockers, and applicability. The model accepts only reviewed source metadata, reviewed table values, reviewed symbol/unit definitions, or explicit blocked records for unresolved normative dependencies.

The model must be populated from MC001 extraction/review work and future reviewed external-standard extractions. It must not be populated from product estimates, UI labels, inferred categories, or undocumented defaults.

## Files Inspected

| File | Reason |
| --- | --- |
| `docs/mc001-validation/INVESTIGATION_011_FULL_MC001_AUDITOR_ENGINE_ARCHITECTURE.md` | Parent architecture and target normative layer. |
| `docs/mc001-validation/INVESTIGATION_012_AUDITOR_INPUT_CONTRACT.md` | Input contract fields that reference normative ids. |
| `docs/mc001-validation/GAP_ANALYSIS.md` | Current validated helpers, datasets, and unresolved normative gaps. |
| `docs/mc001-validation/VALIDATION_MATRIX.md` | Fixture coverage and blocked example statuses. |
| `docs/mc001-extraction/19_extraction_registry.md` | Current formula registry, table registry notes, and missing-input vocabulary. |

## Normative Data Ownership

| Data class | Owned by normative KB | Referenced by input contract | Calculated by engine |
| --- | --- | --- | --- |
| Methodology versions | MC001 version id, source document identity, effective status. | Selected `targetMethodology`. | no |
| Formula metadata | Formula id, relation/figure, inputs, output, units, applicability, status. | Formula ids in provenance or explicit selected method. | no |
| Table metadata | Table id, row key schema, column schema, units, source pages, confidence. | Table ids and row ids. | no |
| Table values | Reviewed numeric/text values and units. | Selected row ids or explicit copied value with trace. | no |
| Symbols | Canonical symbol, meaning, unit dimension, aliases. | Field-to-symbol mapping. | no |
| Units | Allowed units, dimensions, conversions, precision policy. | Unit strings on fields. | no |
| Applicability | Predicates that say when a formula/table row applies. | Section context and selected category/use. | no |
| External standard blockers | Required standard, missing fields, resolution criteria. | Explicit blockers. | no |
| Derived coefficients | no | Source inputs only. | yes |

## Schema Modules

The future normative KB should be represented as typed registries. The exact implementation format is out of scope for this investigation; the schema contract is the important part.

| Registry | Purpose |
| --- | --- |
| `methodologyVersionRegistry` | Identifies MC001 source versions and compatibility. |
| `formulaRegistry` | Describes callable or blocked formulas. |
| `tableRegistry` | Describes table-level metadata and row/column schemas. |
| `tableRowRegistry` | Stores reviewed table rows and value cells. |
| `symbolRegistry` | Defines MC001 symbols and engine aliases. |
| `unitRegistry` | Defines canonical units and reviewed conversions. |
| `applicabilityRegistry` | Defines rules for formula/table use. |
| `factorRegistry` | Specialized carrier and CO2 factor rows. |
| `statusRegistry` | Shared status vocabulary and readiness impact. |
| `externalStandardRegistry` | Tracks missing SR EN and other external dependencies. |
| `sourceReferenceRegistry` | Links formulas/tables to source pages, sections, relations, figures. |

## Common Record Envelope

Every normative record should share this envelope:

```js
{
  id: "MC001_2_15_HTR_TOTAL",
  registryType: "formula",
  methodologyVersion: "MC001-2022",
  sourceRefs: [],
  status: "validated",
  confidence: "reviewed",
  owner: "normative_knowledge_base",
  version: "2026-06-phase-a",
  lifecycleStatus: "active",
  supersedes: [],
  replacedBy: null,
  blockers: [],
  notes: []
}
```

Required common fields:

| Field | Required | Meaning | Fail-closed rule |
| --- | --- | --- | --- |
| `id` | yes | Stable registry id. | Missing id blocks lookup. |
| `registryType` | yes | Formula, table, row, symbol, unit, applicability, factor, status, external standard. | Unknown type blocks lookup. |
| `methodologyVersion` | yes | MC001 source version or external standard version. | Missing version blocks official-like mode. |
| `sourceRefs[]` | yes unless explicitly external missing | Source document, page, table, relation, figure. | Missing source blocks use. |
| `status` | yes | Readiness of the record. | Blocked statuses cannot be used for calculation except diagnostics. |
| `confidence` | yes | Review confidence. | Low or unknown confidence blocks official-like mode. |
| `owner` | yes | Must be `normative_knowledge_base`. | Wrong owner blocks normative lookup. |
| `version` | yes | Registry record version. | Missing version blocks reproducibility. |
| `lifecycleStatus` | yes | `active`, `deprecated`, `superseded`, `replaced_by`, or `blocked`. | Deprecated or superseded records require an explicit compatibility decision before use. |
| `replacedBy` | required when replaced | Replacement record id. | Missing replacement id blocks automatic migration. |
| `blockers[]` | yes, can be empty | Structured blockers. | Missing blocker list blocks readiness audit. |

## Methodology Version Registry

```js
{
  id: "MC001-2022",
  registryType: "methodology_version",
  title: "Metodologie MC001",
  effectiveStatus: "active_for_project",
  sourceDocumentId: "MC001-2022",
  sourceRefs: [{ document: "MC001-2022", pages: [], section: null }],
  supportedCalculationModes: [
    "explicit_validation",
    "official_like_when_complete",
    "measured_comparison",
    "shadow_validation"
  ],
  status: "partial_with_blockers"
}
```

Fail closed if a contract requests an unknown or unsupported methodology version.

## Formula Registry

Formula records describe methodology, not implementation code.

```js
{
  id: "MC001_2_15_HTR_TOTAL",
  registryType: "formula",
  label: "Total transmission heat-transfer coefficient",
  sourceRefs: [
    { document: "MC001-2022", section: "2.4.1", relation: "2.15", pages: [] }
  ],
  inputs: [
    { symbol: "Hd", unit: "W/K", required: true, sourceRequirement: "calculated_or_explicit" },
    { symbol: "Hg", unit: "W/K", required: true, sourceRequirement: "calculated_or_explicit" },
    { symbol: "Hu", unit: "W/K", required: true, sourceRequirement: "calculated_or_explicit" },
    { symbol: "Ha", unit: "W/K", required: true, sourceRequirement: "calculated_or_explicit" }
  ],
  output: { symbol: "Htr", unit: "W/K" },
  applicabilityRuleIds: ["APPLIES_WHEN_TRANSMISSION_COMPONENTS_COMPLETE"],
  implementationStatus: "implemented_validated_narrow_fixture",
  missingInputsBehavior: "blocked_missing_input",
  status: "validated",
  confidence: "reviewed"
}
```

Required fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Formula id used by provenance. |
| `label` | yes | Human-readable name. |
| `sourceRefs[]` | yes | Page/section/relation/figure trace. |
| `inputs[]` | yes | Required inputs, symbols, units, source requirements. |
| `output` | yes | Symbol and canonical unit. |
| `applicabilityRuleIds[]` | yes | Rules that must pass before use. |
| `implementationStatus` | yes | Whether helper exists, is validated, or is blocked. |
| `missingInputsBehavior` | yes | Status emitted if inputs are missing. |

Formula statuses:

- `validated`
- `implemented_explicit_only`
- `extracted_not_implemented`
- `display_reconciliation_only`
- `blocked_missing_input`
- `blocked_missing_normative_data`
- `blocked_external_standard`
- `ambiguous_mc001_example`
- `out_of_scope_current_phase`
- `deprecated`
- `superseded`
- `replaced_by`

Lifecycle/deprecation rules:

- `active` records can be used when status, confidence, source, unit, and applicability checks pass.
- `deprecated` records can be used only for reproducing historical fixtures or explicit legacy comparisons.
- `superseded` records must point to `replacedBy`.
- `replaced_by` records are metadata aliases and must not be used for new calculations.
- Deprecated or superseded records must be visible in diagnostics, not silently upgraded.

## Table Registry

Table records define table-level metadata.

```js
{
  id: "MC001_TABEL_5_17_PRIMARY_FACTORS",
  registryType: "table",
  title: "Primary energy factors",
  sourceRefs: [
    { document: "MC001-2022", table: "Tabel 5.17", pages: [] }
  ],
  rowKeySchema: ["energyCarrierKey"],
  columnSchema: [
    { key: "renewablePrimaryEnergyFactor", unit: "-", required: true },
    { key: "nonRenewablePrimaryEnergyFactor", unit: "-", required: true },
    { key: "totalPrimaryEnergyFactor", unit: "-", required: true }
  ],
  applicabilityRuleIds: ["APPLIES_TO_FINAL_ENERGY_CARRIER_ROWS"],
  status: "validated",
  confidence: "reviewed"
}
```

Fail closed when:

- a table id is unknown;
- a requested row key is absent;
- a row exists but status is blocked;
- a required column is missing;
- the unit does not match the table schema;
- the table version is incompatible with the input contract methodology version.

## Table Row Registry

Table rows should preserve source row identity and values.

```js
{
  id: "MC001_TABEL_5_17_PRIMARY_FACTORS:electricity",
  registryType: "table_row",
  tableId: "MC001_TABEL_5_17_PRIMARY_FACTORS",
  rowKey: { energyCarrierKey: "electricity" },
  values: {
    renewablePrimaryEnergyFactor: { value: 0.8, unit: "-", status: "validated" },
    nonRenewablePrimaryEnergyFactor: { value: 1.7, unit: "-", status: "validated" },
    totalPrimaryEnergyFactor: { value: 2.5, unit: "-", status: "validated" }
  },
  sourceRefs: [
    { document: "MC001-2022", table: "Tabel 5.17", row: "electricity", pages: [] }
  ],
  status: "validated",
  confidence: "reviewed"
}
```

Rows with visual uncertainty must remain present only as blocked or low-confidence records, not silently omitted if downstream code might otherwise default.

## Symbol Registry

```js
{
  id: "SYMBOL_Htr",
  registryType: "symbol",
  symbol: "Htr",
  canonicalName: "total transmission heat-transfer coefficient",
  canonicalUnit: "W/K",
  allowedUnits: ["W/K"],
  aliases: ["H_tr"],
  domain: "transmission",
  sourceRefs: [
    { document: "MC001-2022", relation: "2.15", pages: [] }
  ],
  status: "validated"
}
```

Fail closed when a formula references an unknown symbol or a value uses a unit not allowed for that symbol.

## Unit Registry

```js
{
  id: "UNIT_W_PER_K",
  registryType: "unit",
  unit: "W/K",
  dimension: "heat_transfer_coefficient",
  allowedConversions: [],
  canonical: true,
  precisionPolicy: {
    internalDecimals: 6,
    displayDecimals: 2
  },
  status: "validated"
}
```

Unit conversion policy:

- only reviewed conversions are allowed;
- string numbers are never unit conversion;
- display rounding must not change internal calculation values;
- source display units must be preserved in provenance;
- unit mismatch blocks calculation.

## Applicability Registry

Applicability rules describe when a formula/table row can be used.

```js
{
  id: "APPLIES_WHEN_EXPLICIT_CLASS_LOOKUP_CONTEXT_COMPLETE",
  registryType: "applicability_rule",
  domain: "classification",
  requiredInputPaths: [
    "buildingClassification.primaryCategoryKey",
    "classification.indicatorKey",
    "classification.indicatorValue",
    "classification.sourceTableId"
  ],
  blockedWhenStatuses: [
    "blocked_missing_input",
    "blocked_missing_normative_data",
    "ambiguous_mc001_example"
  ],
  missingBehavior: "blocked_missing_input",
  status: "validated"
}
```

Applicability rules must be explicit for:

- residential versus non-residential category paths;
- mixed-use weighted thresholds;
- optional utility threshold recalculation;
- ground/unconditioned/adjacent transmission applicability;
- climate/solar official-like mode versus explicit-source mode;
- display-only reconciliation versus general methodology;
- certificate/CPE readiness.

## Factor Registry

Factor rows are specialized table rows for final-primary-CO2 calculations.

Required factor record fields:

| Field | Required | Rule |
| --- | --- | --- |
| `carrierKey` | yes | Must match service final-energy row. |
| `primaryTableId` | yes | Tabel 5.17 or later reviewed equivalent. |
| `co2TableId` | yes for CO2 | Tabel 5.18 or later reviewed equivalent. |
| `renewablePrimaryEnergyFactor` | yes for primary | Non-negative finite number. |
| `nonRenewablePrimaryEnergyFactor` | yes for primary | Non-negative finite number. |
| `totalPrimaryEnergyFactor` | yes for primary | Must equal renewable plus non-renewable within tolerance. |
| `co2EmissionFactor` | yes for CO2 | Non-negative finite number. |
| `sourceRefs[]` | yes | Table/page/row trace. |

Fail closed if factors are missing, non-finite, string-valued, negative, inconsistent, or sourced from an unreviewed row.

## External Standard Registry

External dependencies must be represented as blockers.

```js
{
  id: "SR_EN_15193_1_LIGHTING_DATA",
  registryType: "external_standard_dependency",
  domain: "lighting",
  requiredFor: ["lightingSystems"],
  missingFields: [
    "controlFactors",
    "daylightFactors",
    "schedule/default method"
  ],
  currentStatus: "blocked_external_standard",
  resolutionRequirement: "Local reviewed extraction or explicitly sourced auditor inputs.",
  status: "blocked_external_standard"
}
```

Current external or missing normative blockers include:

- lighting SR EN 15193-1 dependencies;
- climate and solar official datasets;
- reference-building parameter sets;
- full DHW annual distribution/storage/generation/recovered/auxiliary paths;
- general RER perimeter/export treatment;
- mixed-use weighted thresholds;
- overheating/discomfort hours;
- virtual ventilation calculation;
- economic audit formulas.

## Calculated Outputs

The normative KB does not calculate outputs. It enables downstream calculated outputs by declaring:

- required inputs;
- allowed units;
- source formulas/tables;
- applicability;
- missing-input behavior;
- confidence;
- blocked status.

Downstream engines calculate:

- derived coefficients;
- heat-transfer coefficients;
- monthly balance values;
- service final-energy rows;
- primary/CO2 indicators;
- class labels only when full class context is complete;
- diagnostics and readiness.

## Fail-Closed Rules

The normative KB must fail closed when:

- a record id is unknown;
- a record exists without source references;
- methodology versions mismatch;
- a formula references unknown symbols, units, or applicability rules;
- a table row is missing or low confidence in official-like mode;
- a required column has no unit or incompatible unit;
- a blocked external standard is required by a requested section;
- display-only records are requested as general methodology;
- a registry tries to encode a default that lacks MC001 source support.

## Blockers

The normative KB must preserve these blocker categories:

| Blocker | Registry representation |
| --- | --- |
| April/September boundary heating-period method | Formula/applicability records with `ambiguous_mc001_example` or `blocked_missing_normative_data`. |
| October worked-example ambiguity | Formula/example record with `ambiguous_mc001_example`. |
| Full DHW final energy | Formula group records with `blocked_missing_input`. |
| Annual DHW distribution-loss basis | Formula records with blocker references to Investigation 004. |
| General RER methodology | Applicability/formula records with `blocked_missing_normative_data`. |
| Anexa B CO2 display inconsistency | Example-output record with `ambiguous_mc001_example`. |
| Anexa B displayed class labels | Certificate/class workflow records with `blocked_missing_input`. |
| Mixed-use thresholds | Applicability record with `blocked_missing_normative_data`. |
| Overheating/discomfort | Formula/status record with `blocked_missing_input`. |
| Virtual ventilation | Formula/status record with `blocked_missing_input`. |
| Lighting | External standard record with `blocked_external_standard`. |
| Cooling systems | Formula/system records with `blocked_missing_input`. |
| Reference building | Table/applicability records with `blocked_missing_normative_data`. |
| Certificate/CPE generation | Adapter readiness record with `out_of_scope_current_phase`. |

## Downstream Engine Usage

| Engine layer | Uses normative KB for |
| --- | --- |
| `auditor-input-contract` | Validating table/formula ids, units, source versions, category keys. |
| `input-normalization-and-validation` | Validating units, conversions, row keys, and applicability. |
| `derived-coefficients-engine` | Formula metadata for R/U/U prime, psi, bve, Hve, and other derived values. |
| `thermal-envelope-engine` | Surface resistances, material coefficients, envelope requirements, contact applicability. |
| `ventilation-engine` | Air constants, bve methods, airflow method metadata, fan/AHU blockers. |
| `monthly-balance-engine` | Monthly formula metadata, climate/solar registries, ambiguity blockers. |
| `service-systems-engine` | System formula availability and blocked DHW/heating/cooling/lighting paths. |
| `final-primary-co2-engine` | Tabel 5.17/5.18 factor registries. |
| `classification-and-threshold-engine` | Tabel 5.6 and Tabel 5.7-5.14 registries, interval semantics, utility rules. |
| `diagnostics-and-blockers` | Missing normative data and external standard blockers. |
| `audit-trace/provenance` | Formula/table ids, versions, source refs, confidence. |

## Out-Of-Scope Boundaries

This investigation does not:

- create or move registry files;
- update existing dataset modules;
- implement schema validation;
- add new formulas;
- change helper behavior;
- add a full orchestrator;
- integrate with UI, API, DB, Workers, deploy, report generation, or certificate/CPE workflow;
- resolve any missing normative source;
- invent table values or external-standard data.

## Review Checklist For Future Implementation

A future normative KB implementation should be accepted only if:

- every record has source refs, status, confidence, and version;
- blocked records remain queryable as blockers;
- display-only records cannot be used as general methodology;
- table row lookups fail closed on unknown keys;
- formula records fail closed on missing units or symbols;
- existing Fixture 001-018 behavior remains unchanged.
