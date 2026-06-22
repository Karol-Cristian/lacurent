# FIXTURE 023 - Ventilation From Auditor Input

## Status

- Fixture id: `FIXTURE_023_VENTILATION_FROM_AUDITOR_INPUT`
- Fixture type: Phase F ventilation input-builder validation.
- Executable: yes.
- Validated helper: `mc001VentilationInputBuilder.mjs`.
- Supporting helpers: `mc001AuditorInputBuilderGate.mjs`, `ventilationCoefficients.mjs`.
- Source basis: Phase C auditor input gate and source-backed raw ventilation values.
- Scope exclusions: no full Htr readiness, no full envelope engine readiness, no full heat-loss engine readiness, no Level 2 Full Auditor readiness, no climate/monthly heating readiness, no CPE/report/certificate workflow, no UI/API/DB/Worker/deploy/product integration, and no new MC001 physics formulas.

## Purpose

Fixture 023 validates the first narrow Phase F ventilation input builder. It proves that raw auditor-entered ventilation inputs can be accepted only when source-backed and can produce `Hve` through existing validated ventilation helpers.

The fixture is intentionally partial. It does not validate a full ventilation system, monthly ventilation energy, heating demand, or certificate workflow.

## Positive Coverage

Fixture 023 validates:

- Phase C gate reuse before ventilation processing;
- source-backed explicit airflow in `m3/h`;
- source-backed air properties;
- source-backed `bve`;
- source-backed `fveDyn`;
- calculated `Hve` through `calculateVentilationHeatTransferCoefficient`;
- conservative readiness flags.

## Negative And Blocked Coverage

Fixture 023 validates:

- derived `Hve` rejected as normal ventilation input;
- unsupported ventilation paths blocked with diagnostics;
- blocked ventilation paths do not produce fake `Hve`;
- heat-loss, Level 2, certificate/CPE, and production readiness remain false.

The focused unit test for `mc001VentilationInputBuilder.mjs` also covers ACH plus volume, temperature-derived `bve`, source-backed unconditioned `bztu`, missing airflow, missing source, missing `bve`, missing `fveDyn`, invalid units, product estimates, unsupported heat recovery, and derived totals as normal input.

## Output Boundary

The builder may return:

- ventilation component results;
- `hveResult` only when every required ventilation component is complete and source-backed;
- blocked ventilation items;
- diagnostics;
- source trace;
- conservative readiness flags.

It must not return:

- fake zeroes for missing ventilation;
- complete heat-loss readiness;
- monthly heating values;
- `QHnd`;
- certificate/CPE/report data;
- product integration payloads.
