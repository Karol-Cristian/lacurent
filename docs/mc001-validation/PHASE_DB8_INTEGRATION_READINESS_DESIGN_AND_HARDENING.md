# PHASE_DB8_INTEGRATION_READINESS_DESIGN_AND_HARDENING

## 1. Milestone Identity

DB8 is a design-only integration-readiness and hardening milestone for the MC001 Full Auditor Engine readiness layer.

The purpose is to document how the existing read-only DB diagnostic pipeline can later be connected to real saved analyses, DB loaders, API boundaries, UI/product flows, and auditor-facing workflows without implementing that integration here.

DB8 does not implement a DB adapter, DB query, API route, UI, Worker change, schema change, migration, deploy config, product flow, report/CPE output, AI behavior, numerical Hu/Htr calculation, Hu aggregation, `A * U * bztu`, QHnd/monthly heating, final/primary/CO2, Level 2 auditor behavior, or downstream readiness escalation.

## 2. Current Source Of Truth

Source of truth for DB8:

```text
origin/main @ 7a4f461ea588dcbbd864388e51e38dabb6ce3e35
```

## 3. Existing DB Pipeline Inventory

The completed read-only DB diagnostic chain now includes:

| Milestone | Module or artifact | Role |
| --- | --- | --- |
| DB2 mapper | `src/physics-engine/mc001ReadOnlySavedAnalysisReadinessMapper.mjs` | Maps an already-loaded saved-analysis snapshot object into H2I/H2H-compatible readiness input when explicit MC001 readiness mapping is present. Fails closed for generic or incomplete data. |
| DB3 runner | `src/physics-engine/mc001ReadOnlyReadinessDryRunRunner.mjs` | Runs the DB2 mapper and, only when mappable, the existing H2I readiness path. Returns a privacy-safe diagnostics-only dry-run result. |
| DB4 diagnostic contract | `src/physics-engine/mc001ReadOnlyDryRunDiagnosticContract.mjs` | Normalizes DB3 dry-run output into a stable DB4 diagnostic contract with sanitized diagnostic codes, readiness flags, privacy warnings, and counts. |
| DB5 composed runner | `src/physics-engine/mc001ReadOnlySavedAnalysisDiagnosticDryRunRunner.mjs` | Composes DB3 and DB4 as the internal saved-analysis diagnostic dry-run entrypoint. |
| DB6 fixtures | `src/physics-engine/tests/fixtures/mc001Db6ReadOnlyDiagnosticFixtures.mjs` | Provides synthetic non-personal fixtures and golden summary expectations for DB5/DB4 behavior. |
| DB7 taxonomy | `src/physics-engine/mc001ReadOnlyDiagnosticTaxonomy.mjs` | Maps DB4/DB5 safe diagnostic codes into finite auditor-actionable taxonomy categories, severities, and action codes. |

## 4. Current Internal Flow

The currently available internal read-only flow is:

```text
already-loaded saved/synthetic snapshot
 -> runMc001ReadOnlySavedAnalysisDiagnosticDryRun(snapshot)
 -> DB4-compatible diagnostic contract
 -> buildMc001ReadOnlyDiagnosticTaxonomy(diagnosticContract)
 -> DB7 taxonomy output
```

This flow is not a product feature and is not a numerical MC001 calculation. It is a readiness diagnostic chain that can identify missing, incomplete, unsafe, unsupported, or not-yet-mappable MC001 input conditions.

## 5. Current Available Entrypoints

Current internal functions:

```text
runMc001ReadOnlySavedAnalysisDiagnosticDryRun(snapshot, options = {})
buildMc001ReadOnlyDiagnosticTaxonomy(diagnosticContract, options = {})
```

The first function accepts an already-loaded saved/anonymized snapshot object and returns a DB4-compatible diagnostic contract.

The second function accepts an already-produced DB4-compatible diagnostic contract and returns a DB7 taxonomy output.

Neither function is a DB loader, API handler, UI adapter, report generator, certificate generator, or numerical engine endpoint.

## 6. Required Future Integration Boundary

The recommended future adapter boundary is:

```text
loadSavedAnalysisSnapshotForMc001DiagnosticDryRun(analysisId, context)
```

This boundary is not implemented in DB8.

Future adapter responsibilities should be:

- load saved analysis data from the database in a read-only operation;
- build a sanitized snapshot object for DB5;
- strip or avoid raw personal fields unless an explicitly scoped future milestone proves they are needed and safe;
- attach only strict technical identifiers;
- attach source/provenance in a sanitized MC001-compatible form;
- avoid free-text as readiness proof;
- avoid inferring missing MC001 fields from generic app data;
- call `runMc001ReadOnlySavedAnalysisDiagnosticDryRun(snapshot, options)`;
- call `buildMc001ReadOnlyDiagnosticTaxonomy(diagnosticContract, options)`;
- return only privacy-safe diagnostic/taxonomy output.

The adapter must be a boundary between persistence and readiness diagnostics. DB5 and DB7 should remain pure readiness-layer modules that operate on already-loaded data.

## 7. Current Data Requirements

A future saved-analysis snapshot must contain explicit MC001-grade mapping before it can produce meaningful Hu inventory readiness diagnostics.

Minimum useful snapshot requirements:

- explicit `mc001Readiness` structure;
- selected analysis/building identifiers;
- read-only snapshot timestamp or equivalent source timestamp;
- conditioned zone candidates;
- unconditioned `ztu` zone candidates;
- Hu component inventory;
- expected Hu component coverage;
- actual Hu component candidates;
- explicit expected-vs-actual component matching;
- source/provenance for each relevant mapped value;
- strict technical identifiers;
- applicability metadata;
- methodology status where required;
- BZTU direct input only when explicit and source-backed;
- U-value or corrected-U paths only when explicit and source-backed;
- no fallback-to-zero behavior;
- no free-text reliance as MC001 readiness proof.

Generic saved app answers may still be useful as raw lineage or context, but they are not sufficient to unlock MC001 readiness unless a future adapter maps them into explicit, reviewed, source-backed MC001 readiness structures.

## 8. Current Likely App/DB Gaps

The current application and DB structures appear useful for selecting saved records and collecting raw app context, but they do not yet guarantee MC001-grade readiness.

Likely usable existing data sources include:

- `houses` for home-level identity and high-level metadata;
- `sites` for site/location context;
- `buildings` for building-level context;
- `analyses` for saved analysis identity and version context;
- `analysis_answers` for raw answer snapshots;
- profile tables such as `building_features`, `envelope_profiles`, and `energy_profiles`;
- derived output tables such as `scores`, `benchmark_results`, `reports`, `report_snapshots`, and `algorithm_insights`, as read-only context only.

Current likely gaps:

- generic saved app answers may not be MC001-grade;
- explicit `ztu` and conditioned-zone identities are missing or not guaranteed;
- Hu component inventory is missing or not guaranteed;
- expected Hu component coverage is missing or not guaranteed;
- source/provenance locators are missing or not guaranteed;
- strict technical identifiers are missing or not guaranteed;
- privacy-safe `sourceTrace` and `sourceContext` are missing or not guaranteed;
- generic building features are ambiguous when mapped to MC001 envelope elements;
- U-value and corrected-U paths are not guaranteed to be source-backed;
- BZTU direct input paths are not guaranteed to be explicit, methodological, and source-backed;
- current data does not prove downstream Hu/Htr readiness;
- current data does not prove QHnd, final/primary/CO2, report, certificate, or CPE readiness.

These gaps should remain blockers or taxonomy categories until a future milestone adds explicit modeling and proof.

## 9. Privacy And Safety Constraints

Future integration must preserve the current privacy posture:

- do not expose raw snapshots;
- do not expose raw answers;
- do not expose raw `sourceContext`;
- do not expose raw `sourceTrace`;
- do not expose raw source locators or refs;
- do not expose personal fields in diagnostic outputs;
- do not expose arbitrary prose or notes;
- do not expose arbitrary source strings;
- do not expose arbitrary machine-looking private IDs;
- reject legacy `record-*` identifiers;
- allow only strict `record:<id>` identifiers or UUID-like identifiers where applicable;
- use finite allowlists for diagnostic codes and taxonomy codes;
- map unknown unsafe diagnostic codes to generic safe categories;
- surface privacy warnings only as safe codes;
- never use hidden fallback values;
- never treat missing numeric values as zero.

The DB7 taxonomy output should remain the preferred external-facing summary shape for future integration because it contains finite category, severity, action, and diagnostic codes instead of raw diagnostic internals.

## 10. Future API/UI Integration Rules

Future API/UI integration should be introduced only by an explicit later milestone.

Initial integration rules:

- first integration should be a read-only shadow endpoint only;
- the endpoint should be admin/internal-only at first;
- the endpoint should not persist output initially;
- the endpoint should not mutate saved analysis records;
- the endpoint should not expose raw DB5 dry-run internals;
- the endpoint should not expose raw DB4 internals unless explicitly allowed by the milestone;
- the default response should expose DB7 taxonomy summary output only;
- DB4 diagnostic contract may be exposed alongside DB7 only if a future milestone explicitly approves it;
- UI must not show long user-facing prose until copy is separately designed;
- UI must not render certificate/report/CPE output;
- API must not return numerical Hu/Htr/QHnd/final/primary/CO2 outputs;
- API must not convert generic app data into MC001 readiness through hidden inference;
- API must not treat missing fields as zero or complete.

Future product surfaces should use taxonomy/action codes as internal stable signals, not final UI copy.

## 11. Recommended Next Milestones After DB8

Recommended sequence options:

```text
DB9 = read-only adapter contract / snapshot loader design or scaffold
DB10 = internal-only shadow endpoint design or scaffold
H3 = return to Hu/Htr methodology readiness expansion
```

After DB8, the project should explicitly choose between:

- continuing integration-readiness toward an internal read-only shadow endpoint; or
- returning to methodology expansion for Hu/Htr readiness.

DB9/DB10 should still avoid numerical Hu/Htr calculation unless a later methodology milestone explicitly proves the required source-backed inputs and formulas.

## 12. Hard Stop Conditions

Future integration work must stop and report if any of these conditions appear:

- DB output includes personal data;
- raw snapshots or raw answers are exposed;
- raw `sourceContext` or raw `sourceTrace` is exposed;
- generic app data is inferred into MC001 fields;
- source/provenance is missing;
- U-value or BZTU provenance is incomplete;
- downstream readiness is escalated;
- Hu/Htr result is created without calculation prerequisites;
- QHnd/monthly/final/primary/CO2 output is created;
- API/UI tries to expose raw diagnostics;
- report/CPE output is introduced;
- a schema gap is solved by hidden fallback instead of explicit field/modeling;
- missing numeric values are treated as zero;
- missing components or zones are ignored.

## 13. Validation Checklist For Future PR Reviews

Future PR reviews should check:

- changed files match milestone scope;
- no DB writes;
- no raw data exposure;
- privacy scan passed;
- finite diagnostic codes;
- finite taxonomy categories, severities, and action codes;
- no arbitrary diagnostic code pass-through;
- no numerical formulas;
- no Hu/Htr calculation;
- no Hu aggregation;
- no `A * U * bztu`;
- no downstream readiness escalation;
- no UI/API changes unless explicitly in milestone scope;
- no Worker/deploy/config changes unless explicitly in milestone scope;
- no report/CPE output;
- no AI inference;
- no hidden fallback values;
- no real personal data or default demonstration fixture.

## 14. DB8 Scope Confirmation

DB8 is a documentation-only milestone.

It creates integration-readiness guidance for future work, but it does not implement integration. Runtime modules, tests, fixtures, schema, migrations, API routes, UI files, Worker files, deploy config, product flows, reports, certificates, and CPE outputs are intentionally untouched.
