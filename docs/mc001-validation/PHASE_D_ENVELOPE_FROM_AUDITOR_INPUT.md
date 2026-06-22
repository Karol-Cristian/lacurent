# PHASE D - Envelope From Auditor Input

## Status

- Milestone id: `PHASE_D_ENVELOPE_FROM_AUDITOR_INPUT`
- Branch: `codex/mc001-envelope-from-auditor-input`
- Scope: narrow source-backed envelope input builder, Fixture 021, documentation, and tests.
- Code changes justified: yes, limited to isolated Physics Engine input preparation and validation fixtures.
- Commit/push/PR: not until the full Phase D package is reviewed and clean.

Phase D creates the first narrow bridge from raw auditor-entered envelope data to calculation-ready MC001 envelope preparation outputs. It builds on Phase C and calls the Phase C auditor input builder gate before envelope preparation.

## Relation To Phase A/B/C

Phase A defined the auditor input contract, provenance diagnostics, and status model.

Phase B hardened the normative knowledge-base and gap-register boundary.

Phase C added executable contract validation for normative registry records and the auditor input builder gate. Phase D uses that gate instead of bypassing it. Derived values, product estimates, missing category mapping evidence, invalid owners, and bad validation imports/overrides fail before envelope-specific work runs.

## Implemented In Phase D

Phase D adds `src/physics-engine/mc001EnvelopeInputBuilder.mjs`.

The builder accepts a raw input pack with:

- building classification mapping evidence;
- envelope elements;
- element type and boundary type;
- source-backed area values;
- source-backed layer thickness and lambda values for layer-based U-value preparation;
- source-backed certified or corrected U-values;
- source-backed linear and point thermal bridge entries;
- units and source references per raw value envelope.

Supported output is intentionally narrow:

- calculated element U-values where layers are complete;
- accepted source-backed certified/corrected U-values;
- exterior direct element transmission contributions;
- source-backed linear and point thermal bridge contributions;
- exterior direct transmission subtotal;
- blocked diagnostics for unsupported envelope paths;
- conservative readiness flags.

## Supported Envelope Paths

Phase D supports only existing validated helper paths:

- `materialsUValues.mjs` for layer resistance, total resistance, and plain U-value;
- `materialsUValues.mjs` lambda correction only when the correction coefficient is source-backed;
- `transmissionCoefficients.mjs` for direct exterior transmission aggregation with explicit bridge terms;
- `transmissionCoefficients.mjs` for corrected-U aggregation when all supported exterior elements use source-backed corrected U-values and no explicit bridge terms are supplied;
- Phase C `mc001AuditorInputBuilderGate.mjs` for raw input validation before envelope preparation.

Corrected U-values are accepted only with source/provenance. Phase D does not combine corrected U-values with explicit psi/chi bridge terms in the same direct-transmission subtotal because the corrected U-value may already include correction effects. This is intentionally fail-closed to avoid double counting until a later milestone defines explicit accounting semantics.

## Blocked Envelope Paths

The builder does not guess or implement unsupported normative methods.

Blocked paths include:

- general ground-contact method;
- unconditioned-space reduction factors;
- adjacent-space coefficients;
- thermal bridge psi/chi entries without source;
- window shading or solar gain calculations;
- monthly heating demand;
- climate-dependent calculations;
- complete Htr readiness.

Unsupported paths return blocked diagnostics and do not contribute fake values.
Unconditioned and adjacent boundaries remain blocked until source-backed validated methods are added.

## Fail-Closed Rules

The builder fails closed when:

- area is missing or non-positive;
- unit is missing or invalid;
- U-value is missing and layers are missing;
- certified/corrected U-value lacks source provenance;
- corrected U-value is combined with explicit psi/chi bridge terms;
- layer lambda lacks source provenance;
- thermal bridge psi/chi lacks source provenance;
- raw category key lacks explicit mapping evidence;
- product estimates are promoted as MC001 validation input;
- derived values are submitted as normal auditor input.

## Explicit Non-Goals

Phase D does not implement:

- Level 2 full MC001 auditor behavior;
- full runtime normative registry;
- complete envelope readiness;
- complete Htr readiness;
- climate dataset;
- solar gains;
- internal gains;
- monthly heating orchestration changes;
- cooling systems;
- lighting;
- DHW;
- renewables/RER;
- reference building;
- CPE/report/certificate workflow;
- UI, API, Workers, DB/schema, migrations, deploy/config, or product integration.

## Remaining Blockers

Before full auditor behavior, later milestones still need:

- source-backed ground-contact methods;
- source-backed unconditioned and adjacent boundary methods;
- full envelope geometry and bridge mapping;
- climate and monthly transfer dependencies;
- system and service inputs;
- full normative runtime registry coverage;
- report/CPE/certificate workflow boundaries.
