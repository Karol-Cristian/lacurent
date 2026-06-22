# FIXTURE 021 - Envelope From Auditor Input

## Status

- Fixture id: `FIXTURE_021_ENVELOPE_FROM_AUDITOR_INPUT`
- Fixture type: Phase D envelope-from-auditor-input validation.
- Executable: yes.
- Validated helper: `mc001EnvelopeInputBuilder.mjs`.
- Supporting helpers: `mc001AuditorInputBuilderGate.mjs`, `materialsUValues.mjs`, `transmissionCoefficients.mjs`.
- Source basis: Phase A auditor input contract, Phase C input-builder gate, and current envelope helper boundaries from Fixtures 001-004.
- Scope exclusions: no Level 2 full MC001 auditor, no complete runtime normative registry, no complete envelope readiness, no complete Htr readiness, no climate/monthly heating readiness, no CPE/report/certificate workflow, no product integration, no dataset migration, and no new MC001 formulas.

## Purpose

Fixture 021 validates the first narrow Phase D envelope input builder. It proves that raw auditor-entered envelope data can pass through the Phase C gate and then be prepared for exterior direct-transmission calculation only when source/provenance is present.

The fixture does not calculate a full building envelope and does not promote unsupported boundary methods.

## Positive Coverage

Fixture 021 validates:

- raw envelope values accepted only as source-backed value envelopes;
- explicit category mapping evidence accepted by the Phase C gate;
- layer-based exterior wall U-value preparation;
- source-backed certified roof U-value acceptance;
- source-backed corrected U-value acceptance in focused unit coverage;
- source-backed linear psi bridge contribution;
- direct exterior transmission subtotal from supported exterior elements and bridge terms;
- conservative readiness flags.

## Negative And Blocked Coverage

Fixture 021 validates:

- derived values rejected as normal envelope input;
- ground-contact element blocked with diagnostics rather than guessed;
- unconditioned and adjacent boundaries blocked until source-backed validated methods are added;
- corrected U-value rejected when explicit psi/chi bridge terms would be combined in the same direct-transmission subtotal;
- complete Htr readiness remains false;
- complete envelope readiness remains false;
- Level 2, certificate/CPE, and production integration readiness remain false.

Corrected U-values require source/provenance. Phase D intentionally fails closed instead of combining corrected U-values with explicit bridge terms because that can double count correction effects.

The focused unit test for `mc001EnvelopeInputBuilder.mjs` also covers missing/non-positive area, missing units, missing U/layer input, missing source for certified/corrected U/lambda/psi/chi, raw category key without mapping evidence, product-estimate ownership, and unsupported boundary types.

## Output Boundary

The builder may return:

- `elementResults`;
- `bridgeResults`;
- `directTransmissionSubtotal`;
- `blockedItems`;
- `diagnostics`;
- `readinessClaims`.

It must not return:

- complete Htr;
- monthly heating demand;
- climate-dependent values;
- certificate/CPE/report data;
- product integration payloads.

## Verification Notes

- Fixture 021 does not modify existing formula helpers.
- Fixture 021 does not modify existing orchestrators.
- Fixture 021 does not add UI, API, Worker, DB/schema, migration, deploy, report, certificate/CPE, or product integration behavior.
- Fixture 021 does not change Fixture 001-020 behavior.
