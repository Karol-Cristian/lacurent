# Fixture 026: Auditor Core Readiness Scenario Matrix

- Fixture id: `FIXTURE_026_AUDITOR_CORE_READINESS_SCENARIO_MATRIX`
- Example id: `MC001_PHASE_G1_AUDITOR_CORE_READINESS_MATRIX_HARDENING`
- Fixture type: Phase G1 auditor core readiness scenario matrix.
- Module under validation: `mc001AuditorCoreReadinessOrchestrator.mjs`
- Source basis: Phase G orchestrator plus Phase C/D/E/F fixture inputs.

## Scope

Fixture 026 validates a narrow scenario matrix for the Phase G auditor core readiness orchestrator.

It covers:

- consolidated result-contract shape;
- blocked item propagation;
- fake-zero rejection;
- readiness escalation prevention;
- conservative readiness flags;
- source/provenance trace preservation.

## Scenario Coverage

Fixture 026 includes:

- envelope/Hd ready, Htr blocked, Hve ready;
- missing envelope input with ventilation ready;
- envelope/Hd ready with missing ventilation;
- unsupported adjacent boundary from Phase D;
- unsupported ventilation type from Phase F;
- controlled source-backed missing transmission component imports.

The focused Phase G1 unit test also covers product fallback rejection, derived normal input rejection, unsupported ventilation path rejection, expert override provenance, and readiness-claim escalation rejection.

## Expected Boundary

Fixture 026 validates that:

- missing components do not become zero;
- blocked components do not become zero;
- unsupported methods do not become fallbacks;
- partial readiness does not become complete readiness;
- Htr partial plus Hve ready does not become heat-loss ready;
- Htr ready plus Hve blocked does not become heat-loss ready;
- no monthly heating readiness is claimed;
- no `QHnd` readiness is claimed;
- no CPE/report/certificate readiness is claimed;
- no product integration readiness is claimed.

## Non-Scope

Fixture 026 does not imply:

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
- new MC001 formula coverage.
