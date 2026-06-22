# FIXTURE 024 - Heat-Loss Readiness Gate

## Status

- Fixture id: `FIXTURE_024_HEAT_LOSS_READINESS_GATE`
- Fixture type: Phase F heat-loss readiness validation.
- Executable: yes.
- Validated helper: `mc001HeatLossReadinessGate.mjs`.
- Supporting helpers: `mc001TransmissionHtrReadinessGate.mjs`, `mc001VentilationInputBuilder.mjs`, `mc001EnvelopeInputBuilder.mjs`, `mc001AuditorInputBuilderGate.mjs`, `transmissionCoefficients.mjs`, `ventilationCoefficients.mjs`.
- Source basis: Phase E transmission readiness and Fixture 023 ventilation readiness.
- Scope exclusions: no full Htr engine, no full envelope engine, no full ventilation engine, no Level 2 Full Auditor readiness, no climate/monthly heating readiness, no `QHnd`, no CPE/report/certificate workflow, no UI/API/DB/Worker/deploy/product integration, and no new MC001 physics formulas.

## Purpose

Fixture 024 validates a narrow heat-loss readiness gate over two already guarded components:

- `Htr` from Phase E transmission readiness;
- `Hve` from Phase F ventilation input readiness.

The fixture proves that complete source-backed `Htr` plus complete source-backed `Hve` can be classified as heat-loss component readiness, while partial or blocked upstream components keep heat-loss readiness blocked.

## Positive Coverage

Fixture 024 validates:

- complete controlled `Htr` from the Phase E gate;
- complete source-backed `Hve` from Fixture 023;
- heat-loss component readiness when both are ready;
- a readiness-only heat-transfer coefficient component sum in `W/K` only after both components are source-backed and unblocked.

## Negative And Blocked Coverage

Fixture 024 validates:

- partial `Htr` keeps heat-loss readiness blocked;
- blocked `Hve` keeps heat-loss readiness blocked;
- blocked components are not treated as zero;
- monthly heating readiness remains false;
- `QHnd` readiness remains false;
- Level 2, certificate/CPE, and production readiness remain false.

The focused unit test for `mc001HeatLossReadinessGate.mjs` also covers missing Htr/Hve outputs, invalid units, false readiness claims, fake zero rejection, derived totals as normal input, and preservation of the Phase E corrected-U / bridge double-count guard upstream.

## Output Boundary

The gate may return:

- `Htr` / `Hve` component readiness;
- blocked components;
- diagnostics;
- source trace;
- optional readiness-only heat-transfer coefficient component sum when both components are ready.

It must not return:

- fake zeroes for missing or blocked `Htr` / `Hve`;
- heat-loss energy demand;
- monthly heating demand;
- `QHnd`;
- climate-dependent output;
- certificate/CPE/report data;
- product integration payloads.
