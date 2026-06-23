# FIXTURE 025 - Auditor Core Readiness Orchestrator

## Status

- Fixture id: `FIXTURE_025_AUDITOR_CORE_READINESS_ORCHESTRATOR`
- Fixture type: Phase G auditor core readiness validation.
- Executable: yes.
- Validated helper: `mc001AuditorCoreReadinessOrchestrator.mjs`.
- Supporting helpers: `mc001AuditorInputBuilderGate.mjs`, `mc001EnvelopeInputBuilder.mjs`, `mc001TransmissionHtrReadinessGate.mjs`, `mc001VentilationInputBuilder.mjs`, `mc001HeatLossReadinessGate.mjs`, `materialsUValues.mjs`, `transmissionCoefficients.mjs`, `ventilationCoefficients.mjs`.
- Source basis: Phase C/D/E/F fixtures and source-backed auditor input contracts.
- Scope exclusions: no full Level 2 Full Auditor readiness, no full MC001 methodology coverage, no monthly heating readiness, no `QHnd`, no climate readiness, no CPE/report/certificate workflow, no UI/API/DB/Worker/deploy/product integration, no marketplace, no AI features, and no new MC001 physics formulas.

## Purpose

Fixture 025 validates the narrow Phase G composition path:

- Phase C input gate;
- Phase D envelope input builder;
- Phase E transmission/Htr readiness gate;
- Phase F ventilation/Hve input builder;
- Phase F heat-loss readiness gate;
- consolidated auditor core readiness result.

It proves that the existing foundation can be composed without converting blocked or missing components to zero and without claiming broader auditor, monthly, report, certificate, or product readiness.

## Positive Coverage

Fixture 025 validates:

- accepted source-backed raw auditor input through the Phase C gate;
- source-backed exterior `Hd` readiness through Phase D/E;
- source-backed `Hve` readiness through Phase F;
- blocked `Htr` propagation when `Hg`, `Hu`, or `Ha` remain missing or blocked;
- blocked heat-loss readiness when `Htr` is incomplete;
- controlled source-backed `Hg`, `Hu`, and `Ha` imports can prepare heat-loss component readiness;
- source/provenance trace is preserved.

## Negative And Blocked Coverage

Fixture 025 validates:

- blocked components remain blocked;
- missing components are not represented as zero;
- monthly heating readiness remains false;
- `QHnd` readiness remains false;
- CPE/report/certificate readiness remains false;
- production integration readiness remains false.

The focused unit test for `mc001AuditorCoreReadinessOrchestrator.mjs` also covers missing classification mapping, raw category keys without mapping evidence, product fallbacks, derived normal inputs, missing envelope input, missing ventilation input, blocked Htr fake-zero protection, blocked Hve fake-zero protection, and Phase C provenance requirements for controlled imports.

## Output Boundary

The fixture may return:

- input gate status;
- envelope readiness;
- transmission/Htr readiness;
- ventilation/Hve readiness;
- heat-loss readiness;
- blocked items;
- diagnostics;
- source trace;
- conservative readiness flags.

It must not return:

- fake zeroes for missing or blocked components;
- monthly heating demand;
- `QHnd`;
- final energy;
- primary energy;
- CO2;
- climate-dependent output;
- certificate/CPE/report data;
- product integration payloads.
