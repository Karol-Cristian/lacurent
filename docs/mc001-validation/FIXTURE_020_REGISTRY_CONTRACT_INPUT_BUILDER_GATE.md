# FIXTURE 020 - Registry Contract And Input Builder Gate

## Status

- Fixture id: `FIXTURE_020_REGISTRY_CONTRACT_INPUT_BUILDER_GATE`
- Fixture type: Phase C registry contract and input-builder gate validation.
- Executable: yes.
- Validated helpers: `mc001NormativeRegistryContract.mjs`, `mc001AuditorInputBuilderGate.mjs`.
- Source basis: Phase A auditor input contract, Phase A normative KB schema, Phase B registry hardening plan, and current Fixture 001-018 boundaries.
- Scope exclusions: no Level 2 full MC001 auditor, no production orchestrator, no certificate workflow, no CPE generation, no report generation, no UI/API/DB/Worker/deploy/product integration, no new MC001 formulas, no dataset migration, and no invented normative values.

## Purpose

Fixture 020 starts Phase C with executable contract gates before any full auditor orchestration.

The purpose is to prove that a narrow normative registry slice can be validated as data and that a raw auditor input-builder gate rejects unsafe input before helper composition. It does not calculate new physics.

## Normative Registry Contract Coverage

The fixture validates a small in-memory registry with these record families:

| Family | Covered behavior |
| --- | --- |
| `formula` | Source refs, symbols, units, applicability, lifecycle, helper trace, and fail-closed calculation usability. |
| `table` | Row-key schema, column schema, source refs, applicability, units, and lifecycle. |
| `table_row` | Row key, source row, finite numeric cells, cell units, and status. |
| `symbol` | Canonical symbol, aliases, canonical unit, domain, and unit registration. |
| `unit` | Canonical unit, dimension, conversion policy, and precision policy. |
| `source_reference` | Source document and extraction status. |
| `applicability_rule` | Allowed/blocked calculation modes and required input paths. |
| `status` | Status vocabulary, readiness impact, and calculation use. |
| `blocker` | Queryable blocked gap records. |
| `external_standard_dependency` | Queryable external-standard blockers. |

Validated formula, table, table-row, symbol, and unit records must include explicit `reviewStatus`. Formula, table, and table-row records must include `domain`. Validated/calculation-usable source references must include `document`, `page` or `pageRange`, and at least one precise locator such as `section`, `table`, `figure`, `equation`, `relation`, `row`, or `annex`.

External-standard blockers must include a standard identity through `standardId` or `standardName`.

## Registry Fail-Closed Coverage

The validator rejects:

- unknown normative ids;
- unknown table row keys;
- missing formula source refs;
- validated formula source refs without page/pageRange and a precise locator;
- missing or unknown review status;
- missing formula/table/table-row domain;
- unknown status;
- formula references to unknown symbols;
- string-valued numeric table cells;
- table-row cell units that mismatch the table schema;
- external-standard blockers without `standardId` or `standardName`;
- blocked external-standard records used for calculation;
- display-only records used as calculation dependencies;
- deprecated and superseded lifecycle records used for calculation;
- deprecated records without replacement or deprecation metadata;
- superseded/replaced records without `replacedBy`.

## Auditor Input Builder Gate Coverage

The input builder gate accepts raw auditor values only as value envelopes with:

- `value`
- `unit`
- `owner`
- `sourceRefs`
- `confidence`
- `status`

Allowed raw owners are:

- `auditor_entered`
- `normative_table_selected`
- `imported_external_dataset`

The gate rejects product-estimate ownership for MC001 auditor inputs.

Raw `primaryCategoryKey` values must include explicit category-mapping evidence:

- source auditor classification fields;
- mapped MC001 category;
- mapping rule id;
- source reference;
- trace id or responsible module.

## Derived Value Policy

Derived MC001 values are not accepted as normal auditor input.

The gate rejects normal-input fields such as:

```text
Hd
Hg
Hu
Ha
Htr
Hve
QHht
QHgn
QHnd
Qve
finalEnergyKWh
primaryEnergyKWh
totalPrimaryEnergyKWh
co2Kg
totalCO2Kg
specificPrimaryEnergy
specificCO2
```

Those values may appear only as:

- `validationImports[]` with `owner = validation_import_with_source`;
- `expertOverrides[]` with `owner = measured_override_with_source`;
- future engine-calculated outputs outside the raw input-builder path.

## Validation Import Rules

Validation imports must include:

- `importId`
- derived `targetFieldPath`
- typed `value`
- `unit`
- `source`
- `owner = validation_import_with_source`
- non-empty `sourceRefs`
- `traceId` or `traceability`
- explicit `importContext`
- `sourceFixtureId`
- `reviewStatus`
- `validatesFormulaPath = false`

This preserves the Phase A rule that source-backed imported values can support fixture comparison but must not claim validation of the underlying formula path.

## Expert Override Rules

Expert overrides must include:

- `overrideId`
- derived `targetFieldPath`
- typed `value`
- `unit`
- `owner = measured_override_with_source`
- `source`
- `reason`
- `approvedBy` or responsible person
- `confidence`
- timestamp or trace id
- non-empty `sourceRefs`

Missing source, reason, approval/responsible person, unit, confidence, timestamp/trace id, or owner fails closed.

## Positive Coverage

Fixture 020 validates:

- a calculation-usable Htr formula record;
- a calculation-usable Tabel 5.17 electricity primary-factor row;
- queryable blocked RER and lighting records;
- raw auditor source-traced input envelopes;
- one source-backed validation import for `transmission.Htr`;
- one expert override for `ventilation.Hve`;
- explicit primary-category mapping evidence;
- a deterministic input-builder gate result with Level 2, certificate/CPE, and production readiness claims false.

## Negative Coverage

Fixture 020 validates fail-closed behavior for:

- unknown normative record id;
- unknown primary-factor row key;
- missing source refs;
- source refs without precise locators;
- missing or unknown review status;
- missing formula/table/table-row domain;
- unknown status;
- unknown formula symbol;
- string-valued numeric table cell;
- table-cell unit mismatch;
- external-standard blocker without standard identity;
- blocked external-standard calculation use;
- display-only calculation use;
- deprecated lifecycle calculation use;
- superseded lifecycle calculation use;
- missing deprecated/superseded lifecycle metadata;
- derived `Htr`, `Hd`, `Hve`, final-energy, primary-energy, and CO2 totals submitted as normal auditor input;
- raw category key without mapping evidence;
- raw value owner `product_estimate`;
- validation import without source refs;
- validation import without source/traceability;
- validation import without explicit import context;
- validation import with wrong owner;
- validation import claiming formula validation;
- expert override without reason;
- expert override without unit;
- expert override without approval;
- expert override without confidence;
- expert override without timestamp/trace id;
- expert override without source refs.

## Verification Notes

- Fixture 020 does not change existing Fixture 001-018 behavior.
- Fixture 020 does not modify MC001 formulas.
- Fixture 020 does not migrate datasets.
- Fixture 020 does not modify the Level 1 core orchestrator.
- Fixture 020 does not add UI, Worker, DB/schema, API, deploy, report generation, certificate/CPE workflow, product integration, or Level 2 auditor behavior.
