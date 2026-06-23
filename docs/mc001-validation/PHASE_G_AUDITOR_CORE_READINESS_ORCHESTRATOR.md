# PHASE G - Auditor Core Readiness Orchestrator

## Status

- Milestone id: `PHASE_G_AUDITOR_CORE_READINESS_ORCHESTRATOR`
- Branch: `codex/mc001-auditor-core-readiness-orchestrator`
- Scope: narrow Physics Engine orchestration over the Phase C, D, E, and F readiness foundation.
- Commit/push/PR: not until the full Phase G package is reviewed and clean.

Phase G creates the first controlled MC001 Auditor Core Readiness Orchestrator. It does not finish the Level 2 auditor engine. It composes existing source-backed readiness modules and preserves blocked or partial status instead of inventing missing values.

Core invariant:

- missing components are not zero;
- blocked components are not zero;
- unsupported methods are not fallbacks;
- partial readiness is not complete readiness;
- product estimates are not MC001 validation inputs;
- derived totals are not accepted as normal auditor input;
- monthly heating, `QHnd`, CPE/report, and product readiness are not claimed.

## Relation To Phases A-F

Phase A defined the Full Auditor Engine contracts.

Phase B inventoried normative knowledge-base coverage, gaps, and hardening needs.

Phase C introduced the normative registry contract and auditor input builder gate. Phase G requires explicit classification mapping and calls the Phase C gate before orchestration.

Phase D introduced source-backed envelope input preparation. Phase G calls the Phase D envelope builder when envelope input is present and preserves Phase D blocked boundaries.

Phase E introduced transmission/Htr readiness classification. Phase G calls the Phase E gate after Phase D and preserves incomplete `Htr` status when `Hg`, `Hu`, or `Ha` are missing or blocked.

Phase F introduced ventilation/Hve input preparation and Htr/Hve heat-loss readiness. Phase G calls both Phase F modules and preserves partial heat-loss readiness when either Htr or Hve is incomplete.

## Implemented Flow

The orchestrated flow is:

1. raw auditor input;
2. Phase C auditor input builder gate;
3. Phase D envelope input builder;
4. Phase E transmission/Htr readiness gate;
5. Phase F ventilation/Hve input builder;
6. Phase F heat-loss readiness gate;
7. consolidated auditor core readiness result.

If envelope input is missing, Phase G creates a blocked envelope placeholder and still passes the blocked state through the Phase E transmission readiness gate.

If ventilation input is missing, Phase G creates a blocked ventilation placeholder and still passes the blocked state through the Phase F heat-loss readiness gate.

## Result Model

The orchestrator returns:

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

Readiness flags are conservative:

- `isEnvelopeReady`;
- `isTransmissionReady`;
- `isVentilationReady`;
- `isHeatLossReady`;
- `isMonthlyHeatingReady = false`;
- `isQhndReady = false`;
- `isLevel2AuditorReady = false`;
- `isCpeReady = false`;
- `isProductionIntegrationReady = false`.

## Supported Paths

Phase G supports only paths already supported by the lower phases:

- source-backed exterior envelope input from Phase D;
- source-backed direct exterior `Hd` readiness from Phase E;
- controlled source-backed `Hg`, `Hu`, and `Ha` values through Phase C-valid `validationImports` or `expertOverrides`;
- source-backed ventilation/Hve input from Phase F;
- readiness-only `Htr + Hve` heat-transfer coefficient composition from Phase F.

## Blocked Paths

Phase G preserves blockers for:

- missing envelope input;
- unsupported ground, unconditioned, or adjacent envelope methods;
- missing `Hg`, `Hu`, or `Ha`;
- missing ventilation input;
- unsupported ventilation types or paths;
- blocked Htr;
- blocked Hve;
- product estimates or fallbacks;
- derived normal input values;
- monthly heating and `QHnd`;
- CPE/report/certificate workflow.

## Explicit Non-Goals

Phase G does not implement:

- full Level 2 Full Auditor behavior;
- full MC001 methodology coverage;
- full envelope engine behavior;
- full Htr engine behavior;
- full ventilation engine behavior;
- monthly heating;
- `QHnd`;
- final energy;
- primary energy;
- CO2;
- climate datasets;
- solar gains;
- internal gains;
- cooling;
- lighting;
- DHW;
- renewables/RER;
- reference building;
- CPE/report/certificate workflow;
- UI, API, Workers, DB/schema, migrations, deploy/config, marketplace, AI, or product integration.

## Remaining Blockers

Later milestones still need:

- complete source-backed envelope method coverage;
- complete source-backed `Hg`, `Hu`, and `Ha` methods;
- complete source-backed ventilation method coverage;
- climate/monthly heating dependencies;
- solar/internal gains;
- system/final-energy boundaries;
- DHW, lighting, cooling, renewables, and reference-building boundaries;
- certificate/CPE/report boundaries;
- product integration boundaries.
