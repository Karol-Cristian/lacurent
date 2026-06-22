# PHASE E - Transmission Htr Readiness Gate

## Status

- Milestone id: `PHASE_E_TRANSMISSION_HTR_READINESS_GATE`
- Branch: `codex/mc001-transmission-htr-readiness-gate`
- Scope: narrow Physics Engine readiness gate for MC001 transmission components and Htr blocking.
- Commit/push/PR: not until the full Phase E package is reviewed and clean.

Phase E creates a guard between Phase D envelope input preparation and any later Htr orchestration. It does not finish Htr. It prevents false complete-Htr output when required MC001 transmission components are missing, unsupported, blocked, or not source-backed.

Core invariant:

- blocked component is not zero;
- missing component is not zero;
- unsupported method is not fallback;
- partial Htr is not complete Htr.

## Relation To Phase C And Phase D

Phase C validates the raw auditor input contract, rejects derived values as normal input, rejects product estimates, and validates controlled `validationImport` / `expertOverride` provenance.

Phase D prepares only source-backed exterior envelope transmission input. It can produce an exterior direct subtotal and bridge contributions, while keeping ground, unconditioned, adjacent, complete envelope, and complete Htr readiness blocked.

Phase E consumes Phase D output. It verifies the Phase C gate status carried by that output, validates Phase D readiness/provenance, and classifies transmission components before any Htr calculation is allowed.

## Implemented In Phase E

Phase E adds `src/physics-engine/mc001TransmissionHtrReadinessGate.mjs`.

The gate returns:

- component readiness map for `Hd`, `thermalBridges`, `Hg`, `Hu`, `Ha`, and `Htr`;
- supported transmission components;
- blocked components;
- diagnostics;
- source/provenance trace;
- conservative readiness flags;
- optional Htr result only when all required components are ready.

The gate also exposes a path from raw auditor input through Phase D:

- `createMc001TransmissionHtrReadinessGateFromAuditorInput(...)`

That path calls the Phase D envelope builder, which calls the Phase C auditor input gate.

## Supported Readiness Paths

Supported Phase E paths are narrow:

- `Hd` exterior direct may be ready when Phase D produced a source-backed exterior direct subtotal.
- `thermalBridges` may be ready when Phase D produced source-backed linear or point bridge contributions.
- corrected U may be used only without explicit psi/chi bridge terms in the same subtotal.
- `Hg`, `Hu`, and `Ha` may become ready only through controlled source-backed `validationImport`, `expertOverride`, or equivalent component metadata.
- `Htr` may be computed only after `Hd`, `Hg`, `Hu`, and `Ha` are all complete, source-backed, correctly unitized, and no blocked items remain.

When Htr is computed, Phase E uses the existing `calculateTotalTransmissionCoefficient` helper. It does not introduce a new Htr formula.

## Blocked Paths

Blocked Phase E paths include:

- ground transmission without a validated source-backed method or controlled value;
- unconditioned-space transmission without a validated source-backed method or controlled value;
- adjacent/attached-space transmission without a validated source-backed method or controlled value;
- thermal bridge contribution without source provenance;
- corrected U combined with explicit psi/chi bridge terms;
- missing Hd exterior direct subtotal claimed as ready;
- blocked component represented as zero;
- Htr requested while `Hg`, `Hu`, or `Ha` are missing;
- product estimate or fallback promoted as MC001 input;
- derived `Hd` or `Htr` submitted as normal auditor input.

Blocked paths return diagnostics or fail closed. They are not silently converted to zero.

## Htr Readiness Rule

Htr can be calculated only when all of the following are true:

- `Hd` is ready from Phase D exterior direct transmission;
- `Hg` is ready from a controlled source-backed value;
- `Hu` is ready from a controlled source-backed value;
- `Ha` is ready from a controlled source-backed value;
- units are `W/K`;
- component provenance exists;
- no Phase D blocked items remain;
- no component-level blockers remain;
- no corrected-U / explicit-bridge double-count risk exists.

If any condition fails, `Htr` remains `blocked_incomplete_components`.

## Explicit Non-Goals

Phase E does not implement:

- full Htr engine behavior;
- full envelope engine behavior;
- ground-contact calculation methods;
- unconditioned-space reduction methods;
- adjacent/attached-space coefficient methods;
- climate or monthly heating;
- Level 2 Full Auditor behavior;
- CPE/report/certificate workflow;
- UI, API, Workers, DB/schema, migrations, deploy/config, or product integration.

## Remaining Blockers

Later milestones still need:

- validated source-backed ground-contact method coverage;
- validated unconditioned-space method coverage;
- validated adjacent/attached-space method coverage;
- full envelope component completeness rules;
- climate/monthly heating dependencies;
- full auditor orchestration boundaries;
- report/CPE/certificate workflow boundaries.
