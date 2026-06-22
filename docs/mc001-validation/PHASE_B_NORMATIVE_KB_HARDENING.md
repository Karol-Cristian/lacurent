# PHASE B - Normative Knowledge Base Hardening

## Status

- Milestone id: `PHASE_B_NORMATIVE_KB_HARDENING`
- Scope: normative coverage, gap, and registry hardening documentation only.
- Target user: energy auditor.
- Branch: `codex/mc001-normative-kb-hardening`
- Code changes justified: no.
- Commit/push/PR in this milestone pass: no.

Phase B documents what the future MC001 normative knowledge base must contain before a full auditor engine can safely calculate from raw auditor data. It does not implement runtime registries, helpers, formulas, orchestrators, UI, Workers, API, DB/schema, migrations, deploy config, product integration, report generation, or certificate/CPE workflow.

## Phase B Inputs

Phase B depends on:

- `INVESTIGATION_011_FULL_MC001_AUDITOR_ENGINE_ARCHITECTURE`;
- `INVESTIGATION_012_AUDITOR_INPUT_CONTRACT`;
- `INVESTIGATION_013_NORMATIVE_KNOWLEDGE_BASE_SCHEMA`;
- `INVESTIGATION_014_PROVENANCE_DIAGNOSTICS_STATUS_MODEL`;
- current Fixture 001-018 validation record;
- current extraction registry status;
- current gap analysis, validation matrix, and candidate inventory.

Phase A must exist on latest `origin/main` before this milestone proceeds.

## Phase B Deliverables

| Target | Document | Purpose |
| --- | --- | --- |
| `INVESTIGATION_015_NORMATIVE_COVERAGE_INVENTORY` | `docs/mc001-validation/INVESTIGATION_015_NORMATIVE_COVERAGE_INVENTORY.md` | Inventories current normative coverage across MC001 domains and classifies each area as validated, partial, display-only, ambiguous, blocked, or out of scope. |
| `INVESTIGATION_016_NORMATIVE_GAP_REGISTER` | `docs/mc001-validation/INVESTIGATION_016_NORMATIVE_GAP_REGISTER.md` | Defines explicit gap ids, required source types, blocked downstream calculations, risk levels, and recommended fixtures. |
| `INVESTIGATION_017_NORMATIVE_REGISTRY_HARDENING_PLAN` | `docs/mc001-validation/INVESTIGATION_017_NORMATIVE_REGISTRY_HARDENING_PLAN.md` | Defines how formula, table, row, symbol, unit, source, applicability, status, blocker, external-standard, lifecycle, and helper-trace records should be hardened. |
| `PHASE_B_NORMATIVE_KB_HARDENING` | `docs/mc001-validation/PHASE_B_NORMATIVE_KB_HARDENING.md` | Index document tying the Phase B package together and defining review gates. |

## Target Summaries

### Investigation 015 - Normative Coverage Inventory

Purpose:

- Build a conservative inventory of current normative coverage.
- Distinguish narrow validated helper behavior from full MC001 domain readiness.
- Identify which areas can become early registry records and which must remain blocked.

Input model:

- Existing validation docs, extraction registry, helper modules, datasets, and fixtures.

Normative data ownership:

- The inventory treats MC001 tables, formulas, units, symbols, applicability, statuses, and source references as future normative KB-owned data.
- Helper modules remain implementation consumers, not normative sources of truth.

Calculated outputs:

- None. This is documentation and classification only.

Fail-closed rules:

- Partial helper coverage cannot imply complete domain coverage.
- Display-only values cannot validate general methodology.
- Ambiguous example rows must remain ambiguous.
- Missing climate, solar, DHW final, RER, lighting, reference-building, and certificate data must remain blockers.

Blockers:

- Preserves all current blockers from Phase A and Fixture 018, plus climate/solar and registry-shape blockers.

Downstream engine usage:

- Provides the coverage map for future registry seeding and fixture selection.

Out of scope:

- No code, no dataset migration, no formulas, no helper changes, no integration work.

### Investigation 016 - Normative Gap Register

Purpose:

- Convert the coverage inventory into stable gap ids.
- Define source needs, risk, blocked downstream calculations, and recommended validation fixtures.

Input model:

- Coverage inventory plus Phase A blocker/status model.

Normative data ownership:

- Gaps identify missing or incomplete normative records that the future KB must own or explicitly block.

Calculated outputs:

- None. Gap ids are future diagnostics and planning artifacts.

Fail-closed rules:

- Any required open gap blocks the affected calculation mode.
- Unknown source data, external standards, display-only reconciliations, and source conflicts cannot be silently bypassed.

Blockers:

- Critical blockers include climate/solar, ground, heating boundary months, DHW final chain, heating/cooling/lighting systems, RER, reference building, certificate/CPE, executable registry shape, auditor input validation, and provenance envelopes.

Downstream engine usage:

- Future registries and diagnostics should reference these gap ids when blocking calculations.

Out of scope:

- Does not resolve gaps or implement blockers.

### Investigation 017 - Normative Registry Hardening Plan

Purpose:

- Define the future executable registry structure and staged path.
- Specify records for formulas, tables, rows, symbols, units, source refs, applicability, statuses, blockers, external standards, lifecycle, and helper traces.

Input model:

- Phase A schema, Phase B inventory, Phase B gap register, and existing fixture boundaries.

Normative data ownership:

- The normative KB owns source-traced methodology records.
- Auditor input packs reference normative ids.
- Calculators consume registry records only after fail-closed checks pass.

Calculated outputs:

- None. The plan prepares registry contracts.

Fail-closed rules:

- Unknown ids, missing source refs, missing units, blocked status, ambiguous source conflict, display-only misuse, deprecated records, and unsupported applicability all block use.

Blockers:

- External standard, climate, DHW, RER, class-label, mixed-use, reference, certificate, and system blockers remain queryable and unresolved.

Downstream engine usage:

- Future Phase C and domain phases can add small executable registry fixtures before any Level 2 full auditor orchestration.

Out of scope:

- No registry implementation, helper edits, formula changes, dataset migration, or product integration.

## Normative Coverage Status

| Area | Phase B status |
| --- | --- |
| Materials, R/U formulas, explicit transmission, explicit ventilation, DHW useful demand, factor tables, class thresholds, utility inclusion | Ready for registry seeding after row-level source refs and lifecycle fields are normalized. |
| Thermal bridges, envelope requirements, DHW distribution components, final energy rows, primary/CO2 factors | Partially ready; use explicit-only or validated-row statuses until broader rows are reviewed. |
| Monthly heating | Partial; April/September boundary and October ambiguity must remain blocked/ambiguous. |
| RER | Display-only reconciliation exists; general methodology remains blocked. |
| Climate/solar, internal gains, solar gains, ground/unconditioned/adjacent derivation, DHW final chain, heating/cooling/lighting systems, renewables, reference building, certificate/CPE | Blocked or external-standard dependent. |

## Major Gaps

Critical gaps before Level 2 full auditor work:

- complete climate and solar dataset;
- solar gains and internal gains source data;
- general ground-contact and unconditioned/adjacent transmission;
- ventilation from raw auditor input;
- April/September heating-period boundary method;
- October worked-example ambiguity;
- full DHW final-energy chain;
- heating systems final-energy chain;
- cooling systems;
- lighting SR EN 15193-1 dependency;
- renewables and general RER methodology;
- reference building;
- certificate/CPE workflow;
- executable normative registry fixture;
- executable auditor input validation fixture;
- provenance/status value envelope fixture.

## Areas Ready For Future Implementation Slices

The safest future implementation slices are small registry-backed fixtures:

1. Formula/table/row/symbol/unit/status registry shape fixture.
2. Tabel 5.17 and Tabel 5.18 factor row registry fixture.
3. Tabel 5.6 utility and Tabel 5.7-5.14 class threshold registry fixture.
4. Tabel 2.2 material correction coefficient registry fixture.
5. Tabel 3.3.1 DHW useful-demand registry fixture.
6. Blocker registry fixture for climate, lighting, DHW final, RER, reference, and certificate/CPE.

Each slice should preserve existing Fixture 001-018 behavior.

## Areas Needing More Extraction

Extraction or review must happen before implementation for:

- climate/solar official data;
- solar gains;
- internal gains;
- ground-contact transmission;
- unconditioned and adjacent space transmission;
- heating-period boundary months;
- monthly cooling examples;
- full DHW annual/final-energy chain;
- heating/cooling system final-energy paths;
- lighting external standard;
- renewables and RER;
- reference building;
- economic audit formulas;
- certificate/CPE/report output rules.

## Recommended Phase C

Recommended next milestone:

`PHASE_C_REGISTRY_CONTRACT_FIXTURES_AND_INPUT_BUILDER_GATE`

Recommended Phase C scope:

- Create a small executable normative registry contract fixture.
- Validate formula/table/row/symbol/unit/status/source/applicability record shape.
- Validate blocked and display-only records fail closed.
- Add an auditor input builder gate that rejects derived values as normal input.
- Keep the implementation narrow and fixture-driven.
- Do not implement a Level 2 full auditor.
- Do not add UI, API, DB/schema, Workers, deploy, report generation, certificate/CPE workflow, or product integration.

Phase C should start with registry and input validation tests, not with domain formula expansion.

## Phase B Scope Gates

Phase B must stop if:

- Phase A is missing from latest `origin/main`;
- a target requires UI/API/DB/Worker work;
- a target requires schema or migration changes;
- a target requires new MC001 formula implementation;
- a source/normative reference would need to be invented;
- tests/checks fail;
- changed files leave the allowlist;
- a helper, formula, orchestrator, deploy, product, report, or certificate/CPE file changes.

## Phase B Allowed Files

- `docs/mc001-validation/**`
- `docs/mc001-extraction/19_extraction_registry.md` only if needed.

This pass uses only `docs/mc001-validation/**`.

## Phase B Forbidden Files

- UI files.
- Worker files.
- API files.
- DB schema.
- Migrations.
- Deploy config.
- Product integration.
- Marketplace files.
- Report generation.
- Certificate/CPE workflow.
- Physics formula files.
- Helper implementation files.
- Orchestrator implementation files.
- Runtime registry implementation files.

## Phase B Review Gates

The milestone is ready for review when:

- all four Phase B docs exist;
- Investigation 015 inventories the required MC001 domains and statuses;
- Investigation 016 defines gap ids, source needs, risks, blocked downstream calculations, and fixture recommendations;
- Investigation 017 defines registry hardening requirements and staged gates;
- this index summarizes coverage, gaps, ready slices, missing extraction, and recommended Phase C;
- `npm.cmd run test:physics` passes;
- `git diff --check` passes;
- changed/untracked path allowlist passes;
- doc ASCII, whitespace, and conflict-marker checks pass;
- no forbidden file is changed;
- no commit or push has been made.

## Final Boundary

Phase B is a normative KB hardening documentation package. It is not a Level 2 MC001 auditor, not a registry implementation, not a formula implementation, not a certificate/CPE workflow, not report generation, and not UI/API/DB/Worker/product integration.
