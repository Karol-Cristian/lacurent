# P9 Product Integration Validation

Status: validated locally.

Base commit: `ece8515809707fc542f1f6652c499988dcf367c2`

## Objective

P9 converts the certified MC001 engineering platform into a clearer production user journey. It does not change validated Chapter 2, Chapter 3 or Chapter 4 physics. The work is limited to product flow, UI/runtime contracts, provenance visibility, diagnostics, report entry points and regression tests.

## Product Journey

The production calculator is organized around user-facing sections:

1. Cladire si clima
2. Anvelopa
3. Utilizare
4. Instalatii
5. Energie regenerabila
6. Verificare
7. Rezultate

The primary navigation no longer uses Chapter relation identifiers. Normative identifiers remain in technical details, execution traces and the report.

## UI To Runtime Contract

The wizard module now exposes a field contract for visible analysis inputs:

- UI field name
- product section
- assisted or expert level
- Building DNA path
- runtime consumer
- provenance class

The regression test `every visible analysis form control has a UI to runtime contract` parses `pages/analiza-casa.html` and verifies every visible control in `#houseForm` has a non-internal contract.

## Assisted And Expert Modes

The page now has an assisted/expert toggle:

- Assisted mode shows the user-level building, envelope, use and system questions.
- Expert mode exposes product, project, schedule and component parameters consumed by the Chapter 3 runtime.
- Expert fields remain present for saved-project compatibility and technical workflows.

No new final-result shortcuts were introduced.

## Building Use And Internal Gains

The new `building_use_category` input maps to:

`UI -> Building DNA building.useCategory/internalGainsCategoryId -> MC001 Chapter 2 Table 2.15 internal gains`

The focused test proves that switching from `residential_single_family` to `administrative` changes source-backed monthly internal gains while preserving Table 2.15 provenance.

## Defaults And Missing Inputs

P9 removes the most visible hidden defaults from the blank workflow:

- blank `building_type` no longer becomes `detached_house`;
- blank `construction_year` no longer becomes `1978_1990`;
- blank/unknown wall material no longer becomes masonry;
- blank roof/floor choices no longer transmit an explicit attic/basement boundary from the UI.

A normal blank project remains blocked until real typology inputs are supplied.

Existing normative/runtime defaults owned by the resolver remain unchanged and are not physics changes.

## Human Diagnostics

Blocked calculations now render Romanian explanations as the primary message. Raw technical diagnostic codes remain available under technical details.

The solar contract remains unchanged:

- available: source-backed A.9.6 Hsol;
- bounded: Qsky, Qsol and solar element inputs;
- active blocker: `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED`.

The obsolete `CHAPTER_2_SOLAR_PREPROCESSING_UNAVAILABLE` remains covered by runtime reachability tests.

## Results And Report

The report entry now begins with a product summary before the full technical workspace:

- annual QHnd;
- annual QCnd;
- delivered heating/cooling/DHW where Chapter 3 is configured;
- explicit unmet cooling load when present.

The technical report and calculation notebook still render runtime traces instead of reconstructed formulas.

## Remaining Normative Boundaries

No normative boundary was hidden or bypassed.

Known boundaries remain:

- Chapter 2 complete solar gains require Qsky/Qsol/solar element inputs.
- Chapter 3 lighting LENI remains tied to SR EN 15193-1 and is not inferred.

## Validation Evidence

Local validation:

- `node --check js/building-platform-wizard.mjs`: PASS
- `node tests\building-platform-wizard-ui.mjs`: PASS
- `git diff --check`: PASS
- changed-file `node --check`: PASS
- `Get-ChildItem src\building-platform\tests\*.mjs | ForEach-Object { node $_.FullName }`: PASS
- `Get-ChildItem src\physics-engine\tests\*.test.mjs | ForEach-Object { node $_.FullName }`: PASS
- `Get-ChildItem worker\tests\*.mjs,workers\tests\*.mjs -ErrorAction SilentlyContinue | ForEach-Object { node $_.FullName }`: PASS
- `Get-ChildItem tests\*.mjs | ForEach-Object { node $_.FullName }`: PASS with local static server
- `npm.cmd run test:physics`: PASS
- `npm.cmd run test:mc001`: PASS
- `npm.cmd run test:p3v`: PASS
- `npm.cmd run test:physics:parity`: PASS
- `node tests\physics-reference-registries.mjs`: PASS
- `node tests\building-model-architecture-registry.mjs`: PASS
- `node tests\chapter3-coverage-matrix.mjs`: PASS
- `npm.cmd run test:physics:v1`: PASS
- `npm.cmd run test:ai`: PASS
- `npm.cmd run build`: PASS
- `node tests\smoke.mjs`: PASS with `python -m http.server 4173 --bind 127.0.0.1 -d dist\pages`
- `npm.cmd run deploy:dev:dry-run`: PASS

Interactive browser automation was not available in the local dependency set during this validation pass; static HTTP smoke and deterministic DOM/runtime tests cover the local UI contract.
