# Phase G1: Auditor Core Readiness Matrix Hardening

- Branch: `codex/mc001-auditor-core-readiness-orchestrator`
- Scope: narrow Physics Engine hardening for the Phase G auditor core readiness orchestrator.
- Status: implementation-ready for review after local checks.

## Purpose

Phase G1 strengthens the Phase G auditor core readiness orchestrator across multiple readiness states. It does not start Phase H and does not expand methodology coverage.

The objective is to prevent a consolidated auditor-core result from accidentally escalating partial, missing, blocked, or unsupported lower-module results into complete readiness.

## Relation To Phase G

Phase G introduced `mc001AuditorCoreReadinessOrchestrator.mjs`, composing:

1. Phase C auditor input builder gate;
2. Phase D envelope input builder;
3. Phase E transmission/Htr readiness gate;
4. Phase F ventilation/Hve input builder;
5. Phase F heat-loss readiness gate.

Phase G1 keeps that composition intact and adds stricter consolidated result-contract checks plus scenario matrix coverage.

## Result Contract Hardening

The orchestrator now validates its own consolidated result before returning it.

The result must include:

- input gate status;
- envelope readiness;
- transmission/Htr readiness;
- ventilation/Hve readiness;
- heat-loss readiness;
- blocked items;
- diagnostics;
- source/provenance trace;
- readiness flags;
- next blockers.

Required readiness flags include:

- `isEnvelopeReady`;
- `isTransmissionReady`;
- `isVentilationReady`;
- `isHeatLossReady`;
- `isMonthlyHeatingReady`;
- `isLevel2AuditorReady`;
- `isCpeReady`.

The following flags must remain false:

- `isMonthlyHeatingReady`;
- `isQhndReady`;
- `isLevel2AuditorReady`;
- `isCpeReady`;
- `isCertificateCpeWorkflowReady`;
- `isProductionIntegrationReady`.

## Scenario Matrix

Phase G1 validates:

- envelope/Hd ready, Htr blocked, Hve ready;
- missing envelope input with ventilation ready;
- envelope/Hd ready with missing ventilation;
- unsupported Phase D boundary preserved as a blocker;
- unsupported Phase F ventilation type or path preserved as a blocker;
- product fallback rejection in raw classification, envelope, and ventilation input;
- derived normal input rejection for Htr, Hve, heat loss, QHnd, final energy, primary energy, and CO2;
- controlled validation imports and expert overrides preserving source/provenance;
- readiness-claim escalation rejected when Htr or heat-loss components remain blocked.

## Fixture 026

`FIXTURE_026_AUDITOR_CORE_READINESS_SCENARIO_MATRIX` validates the scenario matrix at fixture level.

It proves:

- blockers propagate into the consolidated result;
- blocked components are not converted to zero;
- unsupported methods are not silently ignored;
- partial readiness does not become complete readiness;
- controlled source-backed values can make heat-loss component readiness complete without claiming broader readiness.

## Explicit Non-Scope

Phase G1 does not implement:

- Phase H;
- climate datasets;
- solar gains;
- internal gains;
- monthly heating;
- `QHnd`;
- final energy;
- primary energy;
- CO2;
- cooling;
- lighting;
- DHW;
- renewables/RER;
- reference building;
- full Level 2 auditor engine;
- CPE/report/certificate workflow;
- UI, API, Workers, DB/schema, migrations, deploy/config;
- product integration;
- marketplace;
- AI features;
- new MC001 formulas;
- full runtime registry.

## Remaining Blockers Before Level 2 Auditor Engine

Level 2 remains blocked until at least:

- complete envelope/Htr methodology is source-backed;
- ground, unconditioned, and adjacent transmission methods are validated or controlled through approved inputs;
- ventilation methodology boundaries are complete;
- climate, gains, and monthly heating methods are validated;
- final/primary/CO2 chains are integrated from source-backed inputs;
- DHW, lighting, cooling, renewables/RER, and reference-building boundaries are validated;
- certificate/CPE/report boundaries are defined separately from the Physics Engine readiness layer.
