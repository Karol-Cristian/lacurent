# PHASE C - Registry Contract And Input Builder Gate

## Status

- Milestone id: `PHASE_C_REGISTRY_CONTRACT_INPUT_BUILDER_GATE`
- Branch: `codex/mc001-registry-contract-input-builder-gate`
- Scope: executable registry contract fixture, auditor input-builder gate, validation import validation, expert override validation, docs, and tests.
- Target user: energy auditor, through future Physics Engine validation layers.
- Code changes justified: yes, limited to isolated Physics Engine contract validators and validation fixtures.
- Commit/push/PR in this milestone pass: not until the milestone package is reviewed and clean.

Phase C implements the first small executable contract gates recommended by Phase B. It does not implement a Level 2 full MC001 auditor, formula expansion, UI, API, DB/schema, migrations, Workers, deploy config, report generation, certificate/CPE workflow, product integration, or dataset migration.

## Inputs

Phase C depends on:

- `INVESTIGATION_012_AUDITOR_INPUT_CONTRACT`
- `INVESTIGATION_013_NORMATIVE_KNOWLEDGE_BASE_SCHEMA`
- `INVESTIGATION_014_PROVENANCE_DIAGNOSTICS_STATUS_MODEL`
- `INVESTIGATION_015_NORMATIVE_COVERAGE_INVENTORY`
- `INVESTIGATION_016_NORMATIVE_GAP_REGISTER`
- `INVESTIGATION_017_NORMATIVE_REGISTRY_HARDENING_PLAN`
- current Fixture 001-018 validation boundaries

## Deliverables

| Target | File | Purpose |
| --- | --- | --- |
| Normative registry contract validator | `src/physics-engine/mc001NormativeRegistryContract.mjs` | Validates a small executable normative registry record shape and fail-closed lookup behavior. |
| Auditor input builder gate | `src/physics-engine/mc001AuditorInputBuilderGate.mjs` | Rejects derived values as normal input and validates validation imports, expert overrides, source refs, owners, and normative references. |
| Fixture 020 data | `src/physics-engine/tests/validation/fixture020RegistryContractInputBuilderGate.mjs` | Provides the narrow Phase C registry and input pack fixture. |
| Fixture 020 test | `src/physics-engine/tests/validation/fixture020RegistryContractInputBuilderGate.validation.test.mjs` | Verifies positive and negative Phase C behavior. |
| Fixture 020 doc | `docs/mc001-validation/FIXTURE_020_REGISTRY_CONTRACT_INPUT_BUILDER_GATE.md` | Documents executable scope, fail-closed rules, and exclusions. |

## Normative Registry Contract

The validator checks common normative fields:

- stable `id`;
- registered `registryType`;
- `methodologyVersion`;
- source refs;
- status;
- review status for formula/table/table-row/symbol/unit records;
- confidence;
- owner;
- lifecycle status;
- version;
- blockers.

It also checks type-specific record shape for formulas, tables, table rows, symbols, units, source references, applicability rules, status records, blockers, and external-standard dependencies.

Validated/calculation-usable source refs must include a precise locator: `document`, `page` or `pageRange`, and one of `section`, `table`, `figure`, `equation`, `relation`, `row`, or `annex`. Formula, table, and table-row records must carry `domain`. Blocked external-standard records must carry `standardId` or `standardName`.

Calculation lookup fails closed for:

- unknown ids;
- blocked statuses;
- display-only records;
- deprecated, superseded, replaced, blocked, or display-only lifecycle records;
- non-reviewed confidence;
- unsupported applicability mode.

Lifecycle records fail closed when deprecated records lack replacement/deprecation/no-replacement metadata or superseded/replaced records lack `replacedBy`.

## Auditor Input Builder Gate

The gate validates raw auditor input before any future helper composition.

It requires:

- contract metadata;
- source trace;
- building classification;
- geometry;
- normative references;
- validation imports;
- expert overrides;
- explicit blockers.

Raw value envelopes must be source-traced and owned by an allowed raw owner. Product estimates are rejected.

Derived MC001 values are rejected as normal input and are accepted only as source-backed validation imports or expert overrides.

Raw `primaryCategoryKey` input is accepted only with explicit mapping evidence: source auditor classification, mapped MC001 category, mapping rule id, source refs, and trace id or responsible module. This prevents category inference from becoming validation input.

## Validation Import Validation

Validation imports must be source-backed and must not claim validation of the underlying formula path.

This preserves the distinction between:

- imported fixture/example values used for comparison; and
- engine-calculated outputs used to validate formulas.

Each validation import also carries explicit source, unit, traceability or trace id, and import context.

## Expert Override Validation

Expert overrides must carry:

- source;
- reason;
- owner;
- unit;
- approval.
- confidence;
- timestamp or trace id.

Missing override provenance fails closed.

## Scope Gates

Phase C must stop if a change requires:

- Level 2 full auditor orchestration;
- new MC001 formula implementation;
- dataset migration;
- UI/API/DB/schema/Worker/deploy/product integration;
- report generation;
- certificate/CPE workflow;
- invented normative values.

## Review Gates

The milestone is ready for review when:

- Fixture 020 passes;
- existing Fixture 001-018 metadata remains valid;
- `npm.cmd run test:physics` passes;
- `git diff --check` passes;
- changed files stay in the MC001 Physics Engine/docs/test allowlist;
- no unrelated files are modified;
- no commit, push, or PR is created before review.

## Current Boundary

Phase C is a contract gate milestone. It is not the full MC001 auditor and not a runtime product integration milestone.
