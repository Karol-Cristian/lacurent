# PHASE F - Ventilation Input And Heat-Loss Readiness

## Status

- Milestone id: `PHASE_F_VENTILATION_INPUT_AND_HEAT_LOSS_READINESS`
- Branch: `codex/mc001-hve-heat-loss-readiness-foundation`
- Scope: narrow Physics Engine readiness foundation for source-backed ventilation/Hve input and Htr/Hve heat-loss gating.
- Commit/push/PR: not until the full Phase F package is reviewed and clean.

Phase F adds the next foundation layer after Phase E. It does not finish the full auditor engine. It prevents false heat-loss readiness when ventilation inputs are missing, unsupported, blocked, not source-backed, or when transmission/Htr remains partial.

Core invariant:

- missing ventilation data is not zero;
- unsupported ventilation method is not fallback;
- partial Hve is not complete Hve;
- partial Htr plus partial Hve is not complete building heat-loss readiness;
- blocked Htr is not zero;
- blocked Hve is not zero;
- product estimates are not MC001 validation inputs;
- derived totals are not accepted as normal auditor input.

## Relation To Phase C, D, And E

Phase C validates the raw auditor input contract, rejects derived values as normal input, rejects product estimates, validates category mapping evidence, and validates controlled `validationImport` / `expertOverride` provenance.

Phase D prepares source-backed exterior envelope input and keeps unsupported envelope methods blocked.

Phase E classifies transmission readiness and computes `Htr` only when `Hd`, `Hg`, `Hu`, and `Ha` are complete, source-backed, unit-valid, and unblocked.

Phase F consumes that foundation. The ventilation builder calls the Phase C input gate before ventilation processing. The heat-loss gate consumes the Phase E transmission readiness output and the Phase F ventilation readiness output. It does not bypass Phase C, D, or E.

## Implemented In Phase F

Phase F adds:

- `src/physics-engine/mc001VentilationInputBuilder.mjs`;
- `src/physics-engine/mc001HeatLossReadinessGate.mjs`.

The ventilation builder returns:

- source-backed ventilation component results;
- optional `Hve` result only when every required ventilation component is complete;
- blocked ventilation items;
- diagnostics;
- source/provenance trace;
- conservative readiness flags.

The heat-loss readiness gate returns:

- `Htr` / `Hve` component readiness;
- blocked components;
- diagnostics;
- source/provenance trace;
- optional readiness-only heat-transfer coefficient component sum in `W/K` only when both `Htr` and `Hve` are ready.

## Supported Ventilation Paths

Supported Phase F ventilation paths are intentionally narrow:

- source-backed explicit airflow in `m3/h`;
- source-backed explicit airflow in `m3/s`;
- source-backed ACH plus air-volume conversion through `calculateAirflowFromACH`;
- source-backed direct `bve`;
- source-backed temperature-derived `bve` through `calculateBve`;
- source-backed unconditioned-zone `bztu` through `calculateBveFromUnconditionedZone`;
- source-backed `fveDyn`;
- `Hve` through `calculateVentilationHeatTransferCoefficient`.

The builder requires source-backed air density and specific heat capacity. It does not let the lower-level helper default `fveDyn`.

## Blocked Ventilation Paths

Blocked Phase F ventilation paths include:

- missing airflow;
- missing or non-positive air volume for ACH paths;
- airflow without source/provenance;
- missing `bve`;
- `bve` without source/provenance;
- missing `fveDyn`;
- heat recovery supplied as a raw unsupported method instead of a source-backed supported factor;
- recirculation or unknown ventilation types and paths;
- product estimates or fallbacks;
- derived `Hve`, `Htr`, total heat loss, `QHnd`, final energy, primary energy, or CO2 totals submitted as normal input.

Blocked paths return diagnostics or fail closed. They are not silently converted to zero.

## Heat-Loss Readiness Rule

Heat-loss readiness can be true only when all of the following are true:

- Phase E reports `Htr` ready;
- Phase F reports `Hve` ready;
- both components use `W/K`;
- both components have source/provenance;
- neither component is blocked;
- neither component is missing;
- no upstream blocked items remain.

If any condition fails, heat-loss readiness remains `blocked_incomplete_heat_loss_components`.

## Explicit Non-Goals

Phase F does not implement:

- full Htr engine behavior;
- full ventilation engine behavior;
- full envelope engine behavior;
- heat-loss energy demand;
- climate or monthly heating;
- `QHnd`;
- solar gains;
- internal gains;
- cooling;
- lighting;
- DHW;
- renewables/RER;
- reference building;
- Level 2 Full Auditor behavior;
- CPE/report/certificate workflow;
- UI, API, Workers, DB/schema, migrations, deploy/config, or product integration.

## Remaining Blockers

Later milestones still need:

- complete validated ventilation method coverage;
- complete Htr component coverage for real auditor inputs;
- climate/monthly heating dependencies;
- solar/internal gains;
- full auditor orchestration boundaries;
- report/CPE/certificate workflow boundaries.
