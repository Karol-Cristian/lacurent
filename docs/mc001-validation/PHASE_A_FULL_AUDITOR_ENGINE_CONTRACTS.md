# PHASE A - Full Auditor Engine Contracts

## Status

- Milestone id: `PHASE_A_FULL_AUDITOR_ENGINE_CONTRACTS`
- Scope: architecture and contract documentation only.
- Target user: energy auditor.
- Branch: `codex/mc001-auditor-engine-contracts`
- Code changes justified: no.
- Commit/push/PR in this milestone pass: no.

Phase A documents the contracts needed before any Level 2 full MC001 Auditor Engine implementation can begin. It does not implement helpers, formulas, schemas, runtime validators, orchestrators, UI, Workers, API, DB/schema, migrations, deploy config, report generation, certificate/CPE workflow, or product integration.

## Phase A Inputs

Phase A depends on:

- `INVESTIGATION_011_FULL_MC001_AUDITOR_ENGINE_ARCHITECTURE`
- existing Fixture 001-018 validation record;
- current extraction registry status;
- current gap analysis and validation matrix;
- existing Level 1 fail-closed boundary.

Investigation #11 is required to exist on latest `origin/main` before this milestone can proceed.

## Phase A Deliverables

| Target | Document | Purpose |
| --- | --- | --- |
| `INVESTIGATION_012_AUDITOR_INPUT_CONTRACT` | `docs/mc001-validation/INVESTIGATION_012_AUDITOR_INPUT_CONTRACT.md` | Defines the full auditor input model, required sections, field ownership, units, source requirements, fail-closed rules, blockers, and downstream usage. |
| `INVESTIGATION_013_NORMATIVE_KNOWLEDGE_BASE_SCHEMA` | `docs/mc001-validation/INVESTIGATION_013_NORMATIVE_KNOWLEDGE_BASE_SCHEMA.md` | Defines the normative KB schema for formulas, tables, rows, symbols, units, applicability, factors, statuses, and external-standard blockers. |
| `INVESTIGATION_014_PROVENANCE_DIAGNOSTICS_STATUS_MODEL` | `docs/mc001-validation/INVESTIGATION_014_PROVENANCE_DIAGNOSTICS_STATUS_MODEL.md` | Defines value envelopes, source refs, helper traces, diagnostics, status vocabulary, blockers, and readiness gates. |
| `PHASE_A_FULL_AUDITOR_ENGINE_CONTRACTS` | `docs/mc001-validation/PHASE_A_FULL_AUDITOR_ENGINE_CONTRACTS.md` | Index document tying the Phase A contract package together and defining review gates. |

## Target Summaries

### Investigation 012 - Auditor Input Contract

Purpose:

- Define the complete auditor-facing technical input pack for a scalable MC001 Full Auditor Engine.
- Require section statuses, source refs, field ownership, units, confidence, assumptions, overrides, and blockers.

Input model:

- Contract metadata, project metadata, source trace, classification, geometry, zones, envelope, assemblies, openings/windows/doors/glazing, bridges, ground/contact, unconditioned spaces, ventilation/infiltration, climate/setpoints/gains, heating demand and heating systems, DHW, cooling, lighting, renewables, measured consumption, overrides, assumptions, blockers.

Normative data ownership:

- The input contract stores selected ids and explicit values with source trace.
- The normative KB owns formula/table/symbol/unit/applicability values.

Calculated outputs:

- The contract enables future R/U/Htr/Hve/monthly/service/indicator/class/diagnostic outputs but calculates none.

Fail-closed rules:

- Missing sections, missing sources, unit mismatch, unknown normative keys, invented values, product estimates, invalid overrides, and hidden blockers must block.

Blockers:

- Preserves all current MC001 blockers, including monthly boundary ambiguity, DHW final-energy gaps, RER, lighting, cooling, reference building, mixed-use, virtual ventilation, overheating, climate/solar, and certificate/CPE.

Downstream engine usage:

- Feeds input validation, normative lookup, domain engines, diagnostics, provenance, and future adapters.

Out-of-scope:

- No schemas, runtime validation, helpers, formulas, DB/API/UI/Worker/report/certificate/product work.

### Investigation 013 - Normative Knowledge Base Schema

Purpose:

- Define the future normative source-of-truth schema for formulas, tables, rows, symbols, units, applicability, factors, statuses, and external standards.

Input model:

- Versioned normative records with id, registry type, methodology version, source refs, status, confidence, owner, version, blockers, and notes.

Normative data ownership:

- Owns MC001 source metadata and reviewed normative values; downstream inputs reference it.

Calculated outputs:

- None. It enables downstream engines to calculate safely.

Fail-closed rules:

- Unknown record ids, missing source refs, incompatible methodology versions, unknown units/symbols, blocked rows, missing columns, display-only misuse, and unreviewed defaults block.

Blockers:

- Represents missing climate/solar, lighting external standards, reference building, full DHW, general RER, mixed-use, overheating, virtual ventilation, certificate/CPE, and source conflicts as queryable records.

Downstream engine usage:

- Supplies formula/table/unit/status/applicability/factor provenance to all future engines.

Out-of-scope:

- No file moves, dataset migration, helper changes, formula implementation, or product integration.

### Investigation 014 - Provenance, Diagnostics, And Status Model

Purpose:

- Define the shared output and diagnostics language for a future full auditor result graph.

Input model:

- Consumes auditor input field envelopes, normative records, helper traces, assumptions, overrides, measured data, blockers, and dependencies.

Normative data ownership:

- References normative KB records; does not own normative values.

Calculated outputs:

- Value envelopes, source refs, helper traces, diagnostics, blocker summaries, readiness decisions, and adapter eligibility.

Fail-closed rules:

- Missing formula refs, table refs, units, dependencies, blocker ids, override sources, status definitions, and false readiness claims block.

Blockers:

- Preserves current blocker ids with status, domain, source, reason, and readiness impact.

Downstream engine usage:

- Lets orchestrators aggregate a full audit graph and lets report/certificate adapters read readiness without calculating methodology.

Out-of-scope:

- No runtime wrappers, tests, helper return changes, diagnostics code, reports, CPE, UI/API/DB/Workers.

## Phase A Scope Gates

Phase A must stop if:

- Investigation #11 is missing from latest `origin/main`;
- a target requires UI/API/DB/Worker work;
- a target requires schema or migration changes;
- a target requires new MC001 formula implementation;
- a normative/source reference would need to be invented;
- tests/checks fail;
- changed files leave the allowlist;
- a helper, formula, orchestrator, deploy, product, report, or certificate/CPE file changes.

## Phase A Allowed Files

- `docs/mc001-validation/**`
- `docs/mc001-extraction/19_extraction_registry.md` only if needed.

This pass uses only `docs/mc001-validation/**`.

## Phase A Forbidden Files

- UI files.
- Worker files.
- API files.
- DB schema.
- Migrations.
- Deploy config.
- Report generation.
- Certificate/CPE workflow.
- Product integration.
- Physics formula files.
- Helper implementation files.
- Orchestrator implementation files.

## Phase A Review Gates

The milestone is ready for review when:

- all four Phase A docs exist;
- each investigation documents purpose, input model, normative data ownership, calculated outputs, fail-closed rules, blockers, downstream engine usage, and out-of-scope boundaries;
- `npm.cmd run test:physics` passes;
- `git diff --check` passes;
- changed/untracked path allowlist passes;
- no forbidden file is changed;
- no commit or push has been made.

## Phase B Candidate

The next milestone should be Phase B normative KB hardening only after Phase A review. Phase B should still avoid product integration and should not implement Level 2 orchestration until a reviewed schema fixture exists.

Candidate Phase B targets:

- formula/table/symbol/unit registry shape fixture;
- blocked external-standard registry fixture;
- reviewed status vocabulary fixture;
- no helper behavior changes until registry contracts are tested.

## Final Boundary

Phase A is a contract package. It is not the full MC001 auditor, not a certificate/CPE workflow, not a report generator, not UI/API/DB integration, and not a formula implementation milestone.
