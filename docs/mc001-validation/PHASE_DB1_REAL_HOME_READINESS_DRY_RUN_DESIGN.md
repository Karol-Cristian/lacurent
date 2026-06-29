# Phase DB1 - Real Home Readiness Dry Run Design

## 1. Purpose

Phase DB1 is a docs-only design milestone for a future read-only readiness dry run against saved or real LaCurent home data.

The goal is to define how existing persisted data could be mapped into MC001 readiness input concepts and passed through the existing auditor readiness orchestrator for diagnostics only.

DB1 must not be presented as:

- numerical `Hu` validation;
- numerical `Htr` validation;
- complete MC001 calculation;
- certificate or report readiness;
- product feature release;
- database integration implementation.

The dry run is intended to answer:

> Given a selected saved analysis/building snapshot, what MC001 readiness fields are present, missing, ambiguous, unsupported, or insufficiently sourced before any numerical `Hu`, `Htr`, monthly heating, `QHnd`, final energy, primary energy, CO2, report, or certificate work?

DB1 does not implement a runtime adapter. It does not read a database, write a database, create tests, create fixtures, modify API routes, or change the orchestrator.

## 2. Repository Sources Inspected

The DB1 design is based on read-only inspection of the current repository state at `origin/main` after Phase H2I.

Inspected persistence and product files:

- `schema.sql`
- `migrations/001_full_house_profile.sql`
- `migrations/003_platform_architecture.sql`
- `migrations/004_multi_home_actions.sql`
- `migrations/005_home_lifecycle_purpose.sql`
- `migrations/006_house_profile_updates.sql`
- `migrations/007_billing_history_analysis.sql`
- `migrations/009_report_algorithm_separation.sql`
- `workers/save-house.js`
- `js/analiza-casa.js`
- `js/home-context.js`

Inspected MC001/readiness files:

- `src/physics-engine/mc001AuditorCoreReadinessOrchestrator.mjs`
- `src/physics-engine/mc001HuComponentContractReadinessGate.mjs`
- `src/physics-engine/mc001HuMultiComponentInventoryReadinessGate.mjs`
- `src/physics-engine/mc001BztuDirectInputGate.mjs`
- `src/physics-engine/tests/mc001AuditorCoreReadinessOrchestrator.test.mjs`
- `src/features/energy/schema/mc001TechnicalModel.ts`
- `docs/mc001-validation/PHASE_A_FULL_AUDITOR_ENGINE_CONTRACTS.md`
- `docs/mc001-validation/PHASE_H2A_UNCONDITIONED_ZONE_HU_SOURCE_AND_INVENTORY_CONTRACT.md`
- `docs/mc001-validation/PHASE_H2D_HU_CONTRACT_FIXTURE_DESIGN.md`
- `docs/mc001-validation/PHASE_H2G_HU_MULTI_COMPONENT_INVENTORY_READINESS_DESIGN.md`
- `docs/mc001-validation/FIXTURE_028_HU_COMPONENT_CONTRACT_READINESS_GATE.md`
- `docs/mc001-validation/FIXTURE_029_HU_MULTI_COMPONENT_INVENTORY_READINESS_GATE.md`

## 3. Candidate Data Sources

The current repository contains persisted product and analysis data that may be useful for a future read-only readiness dry run, but most of it is not yet MC001 auditor-grade source/provenance data.

Relevant existing tables from `schema.sql` and migrations:

| Data source | Relevant fields found | DB1 interpretation |
| --- | --- | --- |
| `houses` | `id`, `user_id`, `house_type`, `surface`, `rooms`, `year`, `city`, `display_name`, `active`, `archived_at`, `analysis_purpose` | Candidate building/home selector and high-level metadata. Not enough for MC001 element inventory. |
| `sites` | `id`, `organization_id`, `user_id`, `name`, `city`, `address` | Candidate site/location context. Not enough for climate or MC001 source-ready geometry. |
| `buildings` | `id`, `site_id`, `house_id`, `building_type`, `area`, `construction_year`, `heating_type`, `climate_region` | Candidate building record linked to a saved analysis. Not enough for zone/element inventory. |
| `analyses` | `id`, `user_id`, `organization_id`, `site_id`, `building_id`, `house_id`, `analysis_type`, `status`, `completed_at`, `created_at` | Primary candidate snapshot selector. Completed analysis records can anchor a read-only dry run. |
| `analysis_answers` | `analysis_id`, `question_key`, `answer_value`, `answer_group` | Main raw key/value answer source. Values are strings and usually lack MC001 source locators, units, review status, and provenance. |
| `household_profiles` | `consumer_type`, `people_count`, occupancy fields | Context only for DB1. Not enough for `Hu` inventory readiness. |
| `building_features` | `built_surface`, `floors`, `bathrooms`, `ceiling_height`, `basement`, `attic`, `mansard`, `garage` | Possible hints for unconditioned spaces, geometry, and topology. Hints must not become `ztu` readiness without explicit mapping/source. |
| `envelope_profiles` | `wall_material`, `wall_thickness`, `wall_insulation`, `windows` | Possible envelope hints. Not enough for per-element area, boundary relation, U-value source path, or `Hu` component inventory. |
| `energy_profiles` | `heating`, `temperature_day`, `temperature_night`, `provider`, `monthly_bill`, `monthly_kwh` | Context for system/temperature diagnostics only. Not enough for `Hu` readiness. |
| `house_monthly_bills` | billing month and cost fields | Real-consumption context only. Must not be used as `Hu`, `Htr`, `QHnd`, or formula input in DB1. |
| `scores` | score and estimated class fields | Derived product output. Must not be mapped back as raw MC001 input. |
| `benchmark_results` | percentile and comparison fields | Derived/comparison output. Not MC001 source input. |
| `reports` | planned report records | Product/report workflow state only. Not readiness input. |
| `report_snapshots` | estimated report summary JSON/metrics | Derived report snapshot. Must not feed MC001 readiness as raw input. |
| `algorithm_insights` | insight and recommendation metadata | Derived product insight output. Not MC001 readiness input. |
| `recommendation_actions` / `savings_events` | implemented recommendation and savings markers | Product behavior/history. Not MC001 readiness input. |
| `organizations`, `auditors`, `auditor_clients` | account/organization/auditor metadata | Access/context only. Not technical MC001 input. |

Relevant Worker/API behavior found in `workers/save-house.js`:

- `/api/save-house` writes `houses`, `sites`, `buildings`, `analyses`, `analysis_answers`, profile tables, `scores`, `benchmark_results`, and `reports`.
- `/api/update-house` updates `houses` and creates a new analysis version through `createAnalysisVersion`.
- `latestAnalysisForHouse()` selects the most recent completed analysis for a house.
- `latestAnswers()` reads `analysis_answers` for an analysis.
- `/api/house-profile` returns a selected `house`, latest `analysis`, latest `answers`, and recent `house_monthly_bills`.
- `/api/homes` returns active homes with latest analysis and score/class summary.
- `/api/energy-report` rebuilds product/report output from `analysis_answers`, billing history, benchmark rows, and recommendation actions.

Relevant frontend behavior found in `js/analiza-casa.js` and `js/home-context.js`:

- `analiza-casa.js` submits form data to `/api/save-house` or `/api/update-house`.
- editing a home loads `/api/house-profile` and rehydrates form fields from `analysis_answers`.
- `home-context.js` uses `/api/homes` and tracks an active house id in local storage.

## 4. Current Gaps In Saved Data

The current saved-analysis data is useful for selecting a home and identifying missing fields, but it is not yet sufficient for source-backed `Hu` inventory readiness.

Known missing or uncertain fields:

| Required readiness concept | Current repository status |
| --- | --- |
| Conditioned zone ids | Not clearly persisted as MC001 thermal-zone records. A future adapter may create diagnostic placeholders only, not infer readiness. |
| Unconditioned / `ztu` zone ids | `basement`, `attic`, `mansard`, and `garage` hints exist, but no explicit `ztuZoneId`, topology, monthly scope, or source-backed zone mapping is persisted. |
| Per-element `Hu` inventory | No dedicated persisted `Hu` component inventory table or JSON contract was found. |
| Expected `Hu` component coverage | No persisted expected component list was found. Missing expected coverage must block readiness. |
| Element area for `Hu` components | High-level area fields exist, but no source-backed per-element area tied to conditioned-zone/`ztu` boundaries was found. |
| Boundary relation | No explicit persisted relation such as `external_non_climatized_zone` or `internal_non_climatized_zone` was found for each element. |
| U-value path | Material/insulation hints exist, but no MC001-ready U-value path with source refs, source locator, review status, and trace id is persisted for `Hu` components. |
| BZTU path | No persisted H1-style `bztuDirectInputs` contract was found in DB tables. Missing `bztu` must block. |
| Source/provenance | `analysis_answers` preserves answer keys and values, but not methodological source refs, source locators, reviewed status, or responsible expert metadata. |
| Applicability metadata | No explicit month/zone/topology applicability contract was found for `Hu` component inventory. |
| Complete `Hu` / `Htr` readiness | Still blocked by design. DB1 must not infer it. |

The dry run may produce useful diagnostics from these gaps. It must not repair the gaps by guessing.

## 5. Read-Only Mapping Concept

A future DB2/DB3 dry-run adapter should read a selected saved analysis snapshot and build a diagnostic-only MC001 readiness input pack. The adapter should not write anything to the database.

Conceptual mapping:

| Saved data | Readiness input concept | DB1 rule |
| --- | --- | --- |
| `analyses.id` | `analysisId` / snapshot anchor | Required. Must be completed and selected explicitly. |
| `analyses.house_id`, `houses.id` | `buildingId` / `homeId` context | Required for traceability, not enough for readiness. |
| `buildings.id`, `buildings.area`, `buildings.building_type` | candidate building metadata | May map to metadata only. Area must not become per-element area unless explicitly sourced. |
| `sites.id`, `sites.city`, `sites.address` | site/location context | Context only. Climate/monthly readiness remains blocked. |
| `analysis_answers` rows | raw answer snapshot | May populate candidate fields with `sourceIdentifier = analysis_answers:<analysis_id>:<question_key>`. This is data lineage, not MC001 source proof. |
| `building_features.basement`, `attic`, `mansard`, `garage` | possible unconditioned-space hints | May create diagnostics for candidate `ztu` mapping needs. Must not create ready `ztuZoneId` without explicit evidence. |
| `envelope_profiles` and answer keys such as wall/window/roof/floor fields | possible envelope hints | May create missing/incomplete element diagnostics. Must not create ready `Hu` components unless per-element inventory and source/provenance exist. |
| persisted score/report/insight rows | derived product output | Must be excluded from raw MC001 readiness input. May be referenced only as "do not use as source". |
| `house_monthly_bills` | measured billing context | May be listed as context; must not become `QHnd`, final energy, or `Hu`/`Htr` input. |

The future adapter should build explicit diagnostics instead of values when a mapping cannot satisfy the current readiness contract.

Example diagnostic-only mappings:

- missing `ztuZoneId` -> `blocked_missing_zone_mapping`
- attic/basement/garage hint without source-backed topology -> `blocked_ambiguous_zone_mapping`
- wall fields without per-element area -> `blocked_missing_element_inventory`
- material/insulation hints without source locator -> `blocked_missing_u_value_path` or `blocked_missing_source`
- no H1 `bztuDirectInputs` record -> `blocked_missing_bztu_path`
- no expected `Hu` component coverage -> `blocked_missing_expected_component_inventory`

## 6. Minimum Readiness Dry-Run Input Contract

A later DB2/DB3 dry run should require a narrow, read-only input contract before it calls the existing readiness orchestrator.

Minimum dry-run envelope:

| Field | Required meaning |
| --- | --- |
| `dryRunId` | Stable id for the dry-run execution, not persisted unless a later approved milestone adds storage. |
| `dryRunMode` | Must be `read_only`. |
| `selectedAnalysisId` | Explicit `analyses.id` selected for the dry run. |
| `selectedHouseId` / `selectedBuildingId` | `houses.id` and/or `buildings.id` tied to the selected analysis. |
| `snapshotTimestamp` | Timestamp when the read-only snapshot was assembled. |
| `sourceIdentifiers` | Table/column/row/key lineage for every mapped value, for example `analysis_answers.analysis_id/question_key`. |
| `rawAnswerSnapshot` | Read-only copy of relevant `analysis_answers` rows. |
| `buildingSnapshot` | Read-only copy of relevant `houses`, `buildings`, `sites`, and profile table fields. |
| `zoneMapping` | Explicit conditioned and unconditioned zone candidate mappings, with blockers when missing. |
| `elementMapping` | Explicit envelope element candidate mappings, with area, boundary, and U-path diagnostics. |
| `huComponentInventoryMapping` | Expected and actual `Hu` component candidates if present; otherwise explicit missing-inventory blockers. |
| `bztuMapping` | H1-compatible `bztuDirectInputs` records if present; otherwise explicit missing-`bztu` blockers. |
| `sourceProvenanceMapping` | Source refs, source locator, review status, trace id, and direct/override classification for every direct value. |
| `noWriteGuarantee` | Must state that the dry run does not call `INSERT`, `UPDATE`, `DELETE`, or mutation endpoints. |
| `noFallbackToZeroPolicy` | Must state that missing `Hg`, `Hu`, `Ha`, `Htr`, areas, U-values, or `bztu` are blockers, not zero values. |

The dry-run input contract should be compatible with the existing readiness input concepts:

- `bztuDirectInputs`
- `huComponentCandidate` / `huComponentCandidates`
- `huMultiComponentInventory`
- `expectedHuComponents`
- `envelope`
- `ventilation`
- `validationImports`
- `expertOverrides`
- `explicitBlockers`
- `sourceTrace`
- `contractMetadata`

DB1 does not decide whether DB2 should implement this as a Worker-local adapter, CLI/local script, or test-only harness. That choice belongs to the next milestone.

## 7. Expected Dry-Run Output

A future read-only dry run should return diagnostics and readiness state only.

Expected output categories:

| Output field/category | Purpose |
| --- | --- |
| `dryRunStatus` | Overall diagnostic status such as `completed_with_blockers`, `blocked_missing_analysis`, or `blocked_unsupported_mapping`. |
| `selectedAnalysisId`, `selectedHouseId`, `selectedBuildingId` | Trace the evaluated saved data. |
| `snapshotTimestamp` | Shows when the read-only data snapshot was assembled. |
| `readinessStatus` | Consolidated readiness/orchestrator status. |
| `missingFields` | Missing raw fields required by the readiness contract. |
| `missingZones` | Missing conditioned or `ztu` zone mappings. |
| `missingElements` | Missing or incomplete envelope element mappings. |
| `missingExpectedHuComponents` | Expected `Hu` inventory coverage that cannot be proven. |
| `invalidUValuePath` | Missing, unsupported, or unproven U-value path diagnostics. |
| `missingBztuPath` | Missing or invalid H1-compatible `bztu` path diagnostics. |
| `missingSourceProvenance` | Missing source refs, source locators, review status, trace ids, or expert/override context. |
| `duplicateComponents` | Duplicate component ids or duplicate element/month/zone tuples. |
| `ambiguousComponents` | Ambiguous zone, boundary, U-value, `bztu`, or inventory mappings. |
| `ztuToZtuBlockers` | Unsupported adjacent non-climatized-zone chains. |
| `distributionBlockers` | Multiple conditioned-zone distribution missing source-backed metadata. |
| `unsupportedPaths` | Ground, adjacent-building, raw derived values, product estimates, or unsupported methodology paths. |
| `summaryCounts` | Counts of present/missing/blocked/ambiguous mapped records. |
| `diagnostics` | Machine-stable and human-readable diagnostics. |
| `blockers` | Explicit blocker records suitable for orchestrator-style reporting. |
| `sourceTrace` | DB row/answer lineage plus methodological source/provenance where available. |

The output may expose:

- `isBztuDirectInputReady`
- `isHuComponentReady`
- `isHuInventoryReady`
- `isCompleteHuReady = false`
- `isCompleteHtrReady = false`

The output must not expose:

- `huResult`
- `htrResult`
- `qHndResult`
- final energy result
- primary energy result
- CO2 result
- certificate or CPE result
- report generation result

If the existing orchestrator is called by a later dry-run adapter, the adapter should preserve all current conservative flags:

- `isCompleteHuReady = false`
- `isCompleteHtrReady = false`
- `isMonthlyHeatingReady = false`
- `isQhndReady = false`
- `isLevel2AuditorReady = false`
- `isCpeReady = false`
- `isProductionIntegrationReady = false`

## 8. Fail-Closed Rules

DB readiness dry runs must be fail-closed.

Rules:

- missing data becomes diagnostics and blockers;
- missing numeric values are not treated as zero;
- missing elements are not ignored;
- missing expected `Hu` components block inventory readiness;
- missing zones are not inferred from house type, city, area, or profile hints;
- attic, basement, mansard, or garage flags do not become ready `ztu` zones without explicit mapping;
- missing U-values are not defaulted from product estimates;
- missing `bztu` is not defaulted to zero, one, or a product fallback;
- missing `Hg`, `Ha`, `Hu`, or `Htr` is not treated as zero;
- report snapshots, scores, benchmark rows, and algorithm insights are not raw MC001 inputs;
- billing data is not converted into `QHnd`, final energy, or `Hu` / `Htr`;
- incomplete inventory is not complete readiness;
- one ready `Hu` component does not imply ready `Hu` inventory;
- ready `Hu` inventory does not imply complete `Hu`;
- complete `Hu` does not imply complete `Htr`;
- no downstream readiness is promoted by DB presence alone.

Any adapter must preserve the distinction between:

- DB row lineage;
- auditor-entered raw data;
- source-backed methodological direct input;
- validation import;
- expert override;
- engine output.

## 9. Privacy And Safety

Future DB2/DB3 work must treat saved/real home data as sensitive.

Dry-run constraints:

- prefer local/dev D1 data or anonymized snapshots;
- do not print user email, owner name, address, invoice names, notes, or personal identifiers in logs;
- use `analysisId`, `houseId`, or redacted ids for traceability;
- do not write to DB;
- do not mutate `houses`, `analyses`, `analysis_answers`, reports, snapshots, scores, insights, bills, or recommendations;
- do not generate reports, certificates, PDFs, CPE artifacts, or product-visible results;
- do not call external services;
- do not call AI features to infer missing geometry, zones, `bztu`, U-values, or provenance;
- do not use Sălicea/demo-house data as the default real-case dry-run fixture;
- do not expose raw real-case payloads in committed fixtures.

If real data is needed for a later test, the next milestone must define an anonymized snapshot contract first.

## 10. Later Milestone Plan

Recommended next milestone:

```text
PHASE_DB2_READ_ONLY_READINESS_MAPPING_ADAPTER_DESIGN_OR_IMPLEMENTATION
```

DB2 should decide whether to remain docs-only or implement a narrow local/read-only adapter. Either way, DB2 must still avoid DB writes, schema changes, UI/API/product work, and numerical `Hu` / `Htr` formulas.

Candidate DB2 scope:

- define or implement a read-only mapper from a selected saved analysis snapshot into readiness input concepts;
- query or accept `houses`, `buildings`, `sites`, `analyses`, `analysis_answers`, and profile table rows;
- emit only an input-pack candidate plus diagnostics;
- preserve no-write and no-fallback guarantees;
- keep source/provenance blockers explicit.

Recommended milestone after DB2:

```text
PHASE_DB3_REAL_HOME_READINESS_DRY_RUN_EXECUTION
```

DB3 should run the read-only mapping against one approved local/dev or anonymized saved analysis and report diagnostics only.

DB2 and DB3 still must not:

- calculate `Hu`;
- aggregate `Hu`;
- calculate `Htr`;
- implement `A * U * bztu`;
- calculate monthly heating / `QHnd`;
- calculate final energy, primary energy, or CO2;
- unlock Level 2 auditor readiness;
- generate reports or certificates;
- modify DB/API/UI/product/deploy scope.

Numerical `Hu` calculation belongs to a later methodology milestone only after DB readiness diagnostics prove that real saved data can provide complete source-backed inventory, zone mapping, U-value path, `bztu` path, and provenance.

## 11. Blockers Preserved

DB1 preserves the following blockers:

- full `bztu` derivation;
- `Hztu;e`;
- `Hztu;tot`;
- `cztu;ve`;
- multiple-zone distribution formula;
- complete `Hu` calculation;
- `Hu` aggregation;
- complete `Htr`;
- `A * U * bztu`;
- `Hg`;
- native `Ha`;
- climate/solar/internal gains readiness;
- monthly heating / `QHnd`;
- final energy;
- primary energy;
- CO2;
- Level 2 Full Auditor readiness;
- report generation;
- certificate/CPE workflow;
- UI/API/Worker/product integration;
- DB schema/migrations;
- DB writes;
- deploy/Cloudflare work;
- AI-inferred missing data.

## 12. Review Checklist

DB1 is ready for review when:

- this document is the only changed file;
- the document uses actual repository data sources and does not invent tables;
- the milestone remains docs-only;
- no runtime code, tests, fixtures, schema, migrations, Worker/API/UI/product/deploy files change;
- the dry-run remains read-only;
- missing data is represented as diagnostics/blockers, not inferred values;
- `Hu`, `Htr`, monthly heating, `QHnd`, final/primary/CO2, Level 2, report, and CPE readiness remain blocked.
