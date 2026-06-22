# INVESTIGATION 017 - Normative Registry Hardening Plan

## Status

- Investigation id: `INVESTIGATION_017_NORMATIVE_REGISTRY_HARDENING_PLAN`
- Milestone: `PHASE_B_NORMATIVE_KB_HARDENING`
- Scope: normative registry hardening plan only.
- Target user: energy auditor, through the future full MC001 Auditor Engine.
- Code changes justified: no.
- Dataset migration justified: no.
- Formula implementation justified: no.
- Runtime registry implementation justified: no.

This investigation defines how the future MC001 normative knowledge base should be hardened before it is executable. It does not create runtime registries, migrate existing datasets, change helper behavior, add formulas, or connect to UI, Workers, API, DB/schema, migrations, deploy, product integration, report generation, or certificate/CPE workflow.

## Purpose

The current Physics Engine has validated formula helpers and datasets in narrow scopes, but normative knowledge is still split across docs, helper constants, dataset modules, and fixture prose. A full auditor engine needs a single queryable layer where formulas, tables, rows, symbols, units, applicability, source references, statuses, lifecycle state, and blockers are explicit.

This plan turns the Phase A schema and the Phase B inventory/gap register into a staged hardening path. The next implementation work should begin with registry fixtures and negative tests, not a Level 2 orchestrator.

## Hardening Principles

- Every normative record must be source-traced, unit-tagged, status-tagged, and versioned.
- Blocked records must be queryable; absence is not a safe representation of a blocker.
- Display-only reconciliation must be separate from general methodology.
- Ambiguous source examples must be preserved as ambiguous records.
- External-standard dependencies must be explicit blocker records.
- Existing fixture behavior must remain unchanged while registry contracts are introduced.
- A future registry must fail closed on unknown ids, missing units, missing sources, invalid lifecycle state, or unsupported applicability.
- No registry record may introduce invented MC001 data.

## Required Registry Families

| Registry family | Required purpose | First candidate records | Must fail closed when |
| --- | --- | --- | --- |
| `formulaRegistry` | Define formula identity, source relation/figure, inputs, output, units, applicability, status, and implementation link. | R/U formulas, Htr total, Hve, Qve, final/primary/CO2 formulas, DHW useful formulas. | Formula id unknown; source relation missing; inputs or output missing; unit unknown; status blocked for calculation mode. |
| `tableRegistry` | Define table identity, row key schema, column schema, source refs, applicability, and lifecycle. | Tabel 2.2, Tabel 3.3.1, Tabel 5.6, Tabel 5.7-5.14, Tabel 5.17, Tabel 5.18. | Table id unknown; required column missing; methodology version mismatch; table status blocked. |
| `tableRowRegistry` | Store reviewed row values with row keys, cell units, source row refs, status, and confidence. | Primary/CO2 factor rows, energy class threshold rows, utility inclusion rows, DHW demand rows. | Row key unknown; cell unit missing; cell value non-finite; row status blocked; source row missing. |
| `symbolRegistry` | Map MC001 symbols and engine aliases to canonical names, dimensions, units, and domains. | `R`, `U`, `U'`, `Hd`, `Hg`, `Hu`, `Ha`, `Htr`, `Hve`, `QH;nd`, `EP`, `CO2`. | Symbol unknown; alias ambiguous; canonical unit incompatible. |
| `unitRegistry` | Define canonical units, dimensions, allowed conversions, and precision policies. | `m`, `m2`, `m3`, `W/K`, `kWh/an`, `kWh/m2.an`, `kgCO2/an`, `kgCO2/m2.an`, `-`. | Unit unknown; conversion unreviewed; display rounding requested as internal value. |
| `sourceReferenceRegistry` | Normalize source document, page, table, relation, figure, row, and extraction status. | Existing extraction registry records and fixture source notes. | Source ref missing for normative or override value; source status unreviewed in official-like mode. |
| `applicabilityRegistry` | Define predicates for when formulas/tables/rows may be used. | Residential/non-residential class tables, utility inclusion, optional utility recalculation, explicit-only monthly heating, display-only RER. | Applicability inputs missing; requested context conflicts with predicate; blocked domain required. |
| `statusRegistry` | Define status vocabulary, readiness impact, and allowed transitions. | Phase A status model and Fixture 018 fail-closed statuses. | Unknown status; blocked status used as calculated; false readiness claim. |
| `blockerRegistry` | Store unresolved gaps with domain, reason, source needed, and resolution criteria. | `NB-GAP-001` through `NB-GAP-032`. | Required blocker omitted from result graph; open blocker hidden by adapter. |
| `externalStandardRegistry` | Track dependencies outside locally extracted MC001 text. | SR EN 15193-1 lighting, possible climate/solar sources, manufacturer/expert data policies. | External dependency required but unresolved; imported external value lacks source. |
| `lifecycleRegistry` | Define active, deprecated, superseded, replaced, blocked, and display-only behavior. | Any table/formula that is revised during extraction. | Deprecated/superseded record used without explicit compatibility mode. |
| `helperTraceRegistry` | Map formula ids to helper modules/tests when implementation exists. | Existing helpers and Fixtures 001-018. | Helper claims formula coverage without fixture or source trace. |

## Common Record Envelope

Every registry record should carry the same common envelope before adding type-specific fields:

```js
{
  id: "MC001_2_15_HTR_TOTAL",
  registryType: "formula",
  methodologyVersion: "MC001-2022",
  sourceRefs: [
    {
      document: "MC001-2022",
      section: "2.4.1",
      relation: "2.15",
      table: null,
      figure: null,
      row: null,
      pages: [],
      extractionStatus: "reviewed"
    }
  ],
  status: "validated",
  confidence: "reviewed",
  lifecycleStatus: "active",
  version: "2026-06-phase-b",
  blockers: [],
  notes: []
}
```

Required common fields:

| Field | Required | Rule |
| --- | --- | --- |
| `id` | yes | Stable, unique, and never reused for a different meaning. |
| `registryType` | yes | Must be one of the registered family types. |
| `methodologyVersion` | yes | Must match the auditor input contract target methodology. |
| `sourceRefs[]` | yes unless explicitly blocked external source | Must include document plus section/table/relation/figure/row/page details when known. |
| `status` | yes | Must map to status registry and readiness impact. |
| `confidence` | yes | Must distinguish reviewed, medium, low, blocked, ambiguous. |
| `lifecycleStatus` | yes | Must distinguish active, deprecated, superseded, replaced_by, blocked, display_only. |
| `version` | yes | Must support reproducible audits. |
| `blockers[]` | yes, can be empty | Must reference blocker ids when status is blocked or ambiguous. |

## Formula Registry Structure

Formula records should describe methodology and required inputs, not implementation code.

```js
{
  id: "MC001_2_30_HVE",
  registryType: "formula",
  label: "Ventilation heat-transfer coefficient",
  sourceRefs: [
    { document: "MC001-2022", relation: "2.30", pages: [], extractionStatus: "reviewed" }
  ],
  inputs: [
    { symbol: "rhoA", unit: "kg/m3", required: true, sourceRequirement: "normative_or_explicit" },
    { symbol: "ca", unit: "Wh/kg.K", required: true, sourceRequirement: "normative_or_explicit" },
    { symbol: "qve", unit: "m3/h", required: true, sourceRequirement: "auditor_or_calculated" },
    { symbol: "bve", unit: "-", required: true, sourceRequirement: "normative_or_explicit" }
  ],
  output: { symbol: "Hve", unit: "W/K" },
  applicabilityRuleIds: ["APPLIES_TO_EXPLICIT_VENTILATION_HEAT_TRANSFER"],
  helperTrace: {
    module: "src/physics-engine/ventilationCoefficients.mjs",
    fixtureIds: ["FIXTURE_005", "FIXTURE_016"]
  },
  implementationStatus: "implemented_validated_narrow_fixture",
  missingInputsBehavior: "blocked_missing_input"
}
```

Formula records must include:

- source relation, figure, or method reference;
- input symbols, units, and source requirements;
- output symbol and unit;
- applicability rule ids;
- helper trace where implemented;
- fixture ids where validated;
- blocked gap ids where unresolved;
- lifecycle and confidence fields.

## Table Registry Structure

Table records should define table-level shape before any row values are used.

```js
{
  id: "MC001_TABEL_5_6_UTILITY_INCLUSION",
  registryType: "table",
  title: "Utilities included in energy class thresholds",
  sourceRefs: [
    { document: "MC001-2022", table: "Tabel 5.6", pages: [], extractionStatus: "reviewed" }
  ],
  rowKeySchema: ["buildingCategoryKey", "utilityKey"],
  columnSchema: [
    { key: "includedInReferenceThreshold", unit: "-", valueType: "boolean", required: true },
    { key: "optionalUtilityAdjustmentAllowed", unit: "-", valueType: "boolean", required: true }
  ],
  applicabilityRuleIds: ["APPLIES_TO_EXPLICIT_SINGLE_USE_CLASSIFICATION"],
  helperTrace: {
    module: "src/physics-engine/utilityInclusionThresholds.mjs",
    fixtureIds: ["FIXTURE_014"]
  }
}
```

Table records must include:

- row key schema;
- column schema;
- source refs;
- unit policy for each column;
- applicability;
- status and confidence;
- lifecycle status;
- related helper/fixture trace when implemented.

## Row-Level Table Representation

Rows must be individually statused. This avoids promoting a whole table when only some rows have been reviewed.

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

Row hardening rules:

- every numeric cell must be finite and typed as a number;
- every cell must have a unit, including unitless cells using `-`;
- row ids must include table id and stable row key;
- visual uncertainty must be a row status, not a comment only;
- low-confidence rows cannot be used in official-like mode;
- blocked rows must remain queryable for diagnostics.

## Symbol Registry

Symbol records should normalize MC001 notation and engine aliases.

Required fields:

| Field | Rule |
| --- | --- |
| `symbol` | Canonical MC001 symbol or engine-owned symbol. |
| `canonicalName` | Human-readable meaning. |
| `canonicalUnit` | Must exist in unit registry. |
| `allowedUnits[]` | Reviewed alternatives only. |
| `dimension` | Physical dimension or semantic dimension. |
| `aliases[]` | Engine aliases and source notation variants. |
| `domain` | Envelope, ventilation, monthly balance, DHW, indicators, classes, etc. |
| `sourceRefs[]` | Source relation/table/section where symbol is defined or used. |

Fail closed when:

- two symbols share an alias with different meanings;
- a formula references an unknown symbol;
- an input uses a unit not allowed for the symbol.

## Unit Registry

Unit records should define dimensions and conversion policy.

Required fields:

| Field | Rule |
| --- | --- |
| `unit` | Canonical display string. |
| `dimension` | Physical or semantic dimension. |
| `allowedConversions[]` | Empty unless reviewed. |
| `canonical` | Boolean. |
| `precisionPolicy` | Internal and display rounding rules. |
| `sourceRefs[]` | Required for methodology-specific unit semantics where relevant. |

Initial unit candidates:

- `m`, `m2`, `m3`, `mm`;
- `W/K`, `W`, `kWh`, `kWh/an`, `kWh/luna`, `kWh/m2.an`;
- `kgCO2/an`, `kgCO2/m2.an`, `kgCO2/kWh`;
- `degC`, `K`, `h`, `zi/an`;
- `-` for unitless coefficients and flags.

Unit hardening rules:

- string numeric values are invalid;
- display rounding cannot feed internal calculations;
- conversions must be explicit registry records;
- unitless coefficients still need unit `-`.

## Source Reference Registry

Source references should be normalized so every formula/table/value can point to a stable source.

Required source fields:

| Field | Required | Meaning |
| --- | --- | --- |
| `document` | yes | Source document id, such as `MC001-2022`. |
| `section` | when known | Source section or module. |
| `page` or `pages[]` | when known | Page trace for review. |
| `table` | for table records | Table id/title. |
| `row` | for row records | Source row label or key. |
| `relation` | for formulas | Formula number or relation id. |
| `figure` | for figure-derived formulas | Figure id. |
| `extractionStatus` | yes | `reviewed`, `needs_review`, `blocked_visual`, `external_missing`, etc. |
| `reviewNotes` | optional | Short reviewer note. |

Source hardening rules:

- no source ref means no official-like use;
- unknown pages are allowed only with explicit `needs_page_review` status;
- external standards are blocker records until locally reviewed;
- extraction comments are not enough to validate a row.

## Applicability Predicates

Applicability records should make MC001 conditions executable before formula calls.

Required predicate families:

- building category and residential/non-residential applicability;
- single-use versus mixed-use applicability;
- explicit-input mode versus official-like mode;
- display-only reconciliation versus general methodology;
- optional utility inclusion and threshold recalculation;
- corrected-U path versus explicit thermal bridge path;
- ground/unconditioned/adjacent transmission path;
- climate/solar dataset availability;
- heating-period month status;
- certificate/CPE/report adapter readiness.

Applicability record example:

```js
{
  id: "APPLIES_TO_DISPLAY_ONLY_RER_RECONCILIATION",
  registryType: "applicability_rule",
  domain: "rer",
  allowedCalculationModes: ["validation_display_reconciliation"],
  blockedCalculationModes: ["official_like", "full_auditor"],
  requiredInputPaths: ["displayedValues.rer"],
  blockerIds: ["NB-GAP-016"],
  missingBehavior: "blocked_missing_normative_data",
  status: "display_only"
}
```

## Building Category Applicability

The registry must not infer building category from UI labels, product templates, address, or project type.

Required category records:

- residential category keys used by Tabel 5.6 and Tabel 5.7-5.14;
- non-residential category keys used by Tabel 5.6 and Tabel 5.7-5.14;
- service/utility applicability by category;
- explicit blockers for mixed-use weighted thresholds;
- explicit blockers for Anexa B displayed class labels.

Fail closed when:

- category key is missing;
- category key is not in reviewed registry;
- a single-use threshold is requested for a mixed-use pack;
- a non-residential table is used for residential input or the reverse.

## Lifecycle And Deprecation Fields

Every record needs lifecycle metadata:

| Field | Rule |
| --- | --- |
| `lifecycleStatus` | `active`, `deprecated`, `superseded`, `replaced_by`, `blocked`, or `display_only`. |
| `effectiveFrom` | Methodology or registry version where record becomes valid. |
| `effectiveTo` | Optional version where record stops being valid. |
| `supersedes[]` | Previous record ids. |
| `replacedBy` | Required when `superseded` or `replaced_by`. |
| `migrationNotes` | Required when future code may map old ids to new ids. |

Lifecycle fail-closed rules:

- deprecated records need explicit compatibility mode;
- superseded records must not be used for new calculations;
- display-only records cannot satisfy calculation dependencies;
- blocked records can be returned only as diagnostics.

## Review And Confidence Status

Review status must be separate from calculation status.

| Review status | Meaning |
| --- | --- |
| `reviewed` | Source and value were checked and can support fixtures for the stated scope. |
| `needs_page_review` | Formula/table value is extracted but page/source trace is incomplete. |
| `needs_visual_review` | OCR or visual ambiguity remains. |
| `needs_methodology_review` | Formula is extracted but applicability or interpretation is unresolved. |
| `external_missing` | Required source belongs to an external standard not locally reviewed. |
| `blocked_conflict` | Source values conflict and require explicit resolution. |

Confidence status:

- `reviewed`;
- `medium`;
- `low`;
- `ambiguous`;
- `blocked`.

Official-like calculations should accept only `reviewed` records unless a future explicit policy allows lower-confidence values with a blocking diagnostic.

## External-Standard Markers

External-standard records must include:

- standard id and version if known;
- domain;
- required fields;
- whether the standard is locally available;
- extraction/review status;
- resolution requirement;
- downstream calculations blocked;
- whether explicit auditor imports are allowed as non-official validation inputs.

Known external or missing-source dependencies:

- SR EN 15193-1 lighting data;
- climate/solar official datasets if not directly embedded in MC001 source review;
- manufacturer or expert source policies for material/opening/system overrides.

## Blocked And Ambiguous Markers

Blocked and ambiguous records must be first-class. They should include:

- blocker id;
- domain;
- source refs;
- reason;
- downstream values blocked;
- readiness impact;
- resolution requirement;
- related fixture or investigation id;
- whether implementation must wait.

Current marker candidates:

- April/September boundary heating-period method.
- October MC001 worked-example ambiguity.
- Full DHW final-energy chain.
- Annual DHW distribution-loss basis.
- General RER methodology.
- Anexa B CO2 display inconsistency.
- Anexa B displayed class labels.
- Mixed-use weighted thresholds.
- Overheating/discomfort.
- Virtual ventilation.
- Lighting external standard.
- Cooling systems.
- Reference building.
- Certificate/CPE generation.

## Traceability To Helpers

Registry records should link to helper modules without making helpers the source of truth.

Required helper trace fields:

| Field | Rule |
| --- | --- |
| `module` | Existing helper module path when implemented. |
| `exportName` | Exported helper name where stable. |
| `fixtureIds[]` | Validation fixtures that prove the stated scope. |
| `testFiles[]` | Unit/validation test paths. |
| `implementationStatus` | `not_implemented`, `implemented_explicit_only`, `implemented_validated_narrow_fixture`, or `blocked`. |
| `formulaScope` | Exact subset implemented by helper. |

Helper trace fail-closed rules:

- helper existence is not enough to mark a formula validated;
- a fixture for one row/month/category cannot validate every row/month/category;
- display-only fixture ids must not be used as general-methodology proof.

## Validation Fixture Requirements

The first registry implementation milestone should include fixtures before broad code migration.

Minimum fixture set:

- positive lookup for a validated formula record;
- positive lookup for a validated table row;
- negative lookup for unknown formula id;
- negative lookup for unknown table row key;
- negative lookup for missing source refs;
- negative lookup for blocked external standard;
- negative lookup for display-only record used as calculation;
- lifecycle test for deprecated/superseded record;
- applicability test for class table category mismatch;
- helper trace test that fixture scope is narrow and explicit.

These fixtures can use a small registry slice. They do not require a full Level 2 auditor.

## Staged Hardening Plan

| Stage | Name | Allowed work | Exit criteria |
| --- | --- | --- | --- |
| B1 | Registry slice design | Keep this documentation package reviewed. | Coverage inventory, gap register, and hardening plan accepted. |
| B2 | Executable registry fixture | Add a small in-memory registry fixture and tests for formula/table/row/symbol/unit/status behavior. | Positive and negative fail-closed tests pass; no formula behavior changes. |
| B3 | Factor and class table rows | Normalize Tabel 5.6, 5.7-5.14, 5.17, 5.18 into registry-shaped fixtures. | Existing Fixtures 007, 013, 014 still pass; row lookup is source-traced. |
| B4 | Materials and DHW useful rows | Normalize Tabel 2.2 and Tabel 3.3.1 into registry-shaped fixtures. | Existing Fixtures 001 and 010 still pass. |
| B5 | Blocker registry | Encode NB-GAP blockers and display-only/ambiguous records. | Missing climate, lighting, DHW final, RER, reference, and certificate blockers are queryable. |
| B6 | Helper trace envelope | Link formula/table records to helper modules and fixture ids. | Existing helpers remain unchanged; trace metadata is testable. |
| B7 | Input-builder prerequisites | Use registry contracts to drive Phase C auditor input builder schema tests. | Raw input validation can reject unknown normative ids and derived-value misuse. |

## Acceptance Gates Before Runtime Use

A future registry may be used by calculators only when:

- every consumed formula has reviewed source refs, symbols, units, applicability, status, and lifecycle fields;
- every consumed table row has source row refs, units, value types, confidence, and lifecycle fields;
- every requested blocked domain returns a structured blocker;
- unknown ids fail closed;
- display-only and ambiguous records cannot satisfy calculation dependencies;
- existing Fixture 001-018 results remain unchanged;
- no UI/API/DB/Worker/report/certificate/product integration is needed to run registry tests.

## Downstream Engine Usage

The hardened registry will later support:

- auditor input validation against known normative ids and units;
- formula selection and applicability checks before helper calls;
- factor lookup for final/primary/CO2 indicators;
- class threshold and utility inclusion lookup;
- diagnostics and blocker aggregation;
- provenance records with formula/table/source ids;
- future Level 2 orchestration only after raw input and blocked domains are represented.

## Out-Of-Scope Boundaries

This plan does not:

- implement the registry;
- change existing helper modules;
- change formula behavior;
- create a Level 2 auditor;
- migrate datasets;
- add UI/API/DB/Worker/deploy/report/certificate/product integration;
- resolve any missing MC001 source;
- invent climate, solar, lighting, reference-building, DHW, RER, or system data.
