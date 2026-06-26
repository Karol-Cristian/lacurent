# Fixture 027: BZTU Direct Input Readiness Gate

- Fixture id: `FIXTURE_027_BZTU_DIRECT_INPUT_READINESS_GATE`
- Example id: `MC001_PHASE_H1_BZTU_DIRECT_INPUT_READINESS_GATE`
- Fixture type: Phase H1 direct BZTU input readiness gate.
- Modules under validation:
  - `mc001BztuDirectInputGate.mjs`
  - `mc001AuditorInputBuilderGate.mjs`
  - `mc001AuditorCoreReadinessOrchestrator.mjs`
- Source basis: Phase H0/H0A methodology extraction, H1-pre BZTU direct input contract design, and existing Phase C/G/G1 readiness conventions.

## Scope

Fixture 027 validates the smallest executable Phase H1 behavior for direct `bztu` input readiness.

It covers:

- explicit methodological direct input classification;
- dimensionless unit enforcement;
- month and `ztu` zone scope;
- source/provenance and source locator preservation;
- methodology status validation;
- traceable record id handling;
- product fallback rejection;
- derived/raw input rejection;
- conservative auditor core readiness exposure.

## Expected Boundary

Fixture 027 validates that a direct `bztu` value can be accepted only as a source-backed methodological input.

It does not make the non-climatized-zone transmission path calculation-ready by itself. Accepted `bztu` readiness is exposed to the auditor core result, but `Hu`, complete `Htr`, heat-loss readiness, monthly heating, and `QHnd` remain blocked unless every required downstream component is separately source-backed and implemented.

## Non-Scope

Fixture 027 does not imply:

- full `bztu` derivation;
- `Hztu;e` / `Hztu;tot` modelling;
- `Hu` calculation from `bztu`;
- complete `Htr` readiness;
- ground `Hg` implementation;
- unresolved `Ha` implementation;
- full Level 2 Full Auditor readiness;
- full MC001 methodology coverage;
- climate readiness;
- monthly heating readiness;
- `QHnd` readiness;
- final energy readiness;
- primary energy readiness;
- CO2 readiness;
- CPE/report/certificate readiness;
- UI/API/DB readiness;
- product integration readiness;
- new MC001 calculation formula coverage.
