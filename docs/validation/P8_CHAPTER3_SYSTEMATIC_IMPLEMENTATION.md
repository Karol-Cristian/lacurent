# P8 Chapter 3 Systematic Production Implementation

## Baseline

- Starting base: `a2b08e945cdadf97f22374b84eb299bb9350059f`
- Branch: `codex/p8-chapter3-systematic-completion`
- Existing Chapter 2/P7A-P7E behaviour is preserved.
- Chapter 3 lighting remains bounded at the explicit MC001 LENI boundary because the full SR EN 15193-1 engine is not present in the repository source packs.

## Normative Scope Traversed

The existing Chapter 3 implementation matrix tracks 217 Chapter 3 relation slots:

- general subsystem input/recoverable-energy balances;
- heating systems relations 3.1-3.39;
- ventilation/AHU relations 3.40-3.93;
- cooling storage and PCM relations 3.94-3.123;
- cooling distribution/generator/heat-rejection relations 3.136-3.182;
- aggregate system-energy relations 3.183-3.186;
- DHW useful/distribution/storage relations 3.188-3.228;
- MC001 Chapter 3.4 LENI aggregation over explicit lighting inputs;
- delegated SR EN 15193-1 lighting engine as an external normative dependency.

The machine-readable matrix is generated at `validation-reference/chapter3-coverage-matrix.json` from the source-to-code fixture and validated by `tests/chapter3-coverage-matrix.mjs`.

## P8 Implementation

P8 closes a production topology gap rather than adding invented coefficients.

Before P8, the Chapter 3 product adapter rejected more than one active heating, cooling or DHW system. That prevented legitimate Chapter 3 topologies such as a main generator plus an explicitly declared backup generator, even when all stage losses and auxiliaries were supplied.

After P8:

- one active system still uses an implicit allocation fraction of 1 for backward compatibility;
- if one active system supplies an allocation fraction explicitly, it must be 1;
- multiple active heating, cooling or DHW systems are accepted only when each system has an explicit `allocationFraction`;
- allocation fractions must be finite values between 0 and 1 and must sum to 1;
- each allocated system executes the same Chapter 3 stage balance chain independently;
- the runtime aggregates stage totals, service totals and energy carriers after the per-system chains are calculated;
- missing or invalid allocation data blocks the Chapter 3 calculation instead of inventing a split.

## Canonical Topology

The supported production chain is:

Chapter 2 useful monthly demand
-> service allocation
-> emission
-> distribution
-> storage
-> generation
-> service annual total
-> carrier aggregation
-> notebook/report/workspace.

Heating, cooling and DHW can now carry multiple explicitly allocated systems. Ventilation/AHU, PCM storage and lighting retain their existing explicit-input contracts.

## Execution Trace

Chapter 3 runtime helpers now emit `executionTrace` objects using the shared `mc001_execution_trace_v1` schema while preserving the existing compact `trace` object for compatibility.

For Chapter 3 relations that currently expose a normative formula text rather than a structured arithmetic expression, the trace status is `direct_result`. The validator accepts direct runtime-emitted results without reconstructing arithmetic that was not emitted by the runtime.

## UI And Report Visibility

The normal production UI remains a single-system assisted workflow, which matches its current input surface. The canonical Building DNA/runtime contract now supports multiple explicitly allocated systems for engineering or persisted inputs.

The technical workspace/report model now exposes a `systemTopology` table with:

- service;
- system id;
- allocation fraction;
- generator type;
- energy carrier;
- annual input energy.

The Chapter 3 notebook shows allocated useful demand and per-system stage lines when a service has more than one active system.

## Coverage

Current Chapter 3 matrix summary:

- total tracked relation slots: 217;
- implemented or explicit-boundary relation slots: 216;
- external blocker relation slots: 1;
- unavailable/unreadable relation slots: 0;
- implemented table/lookup entries: 37;
- runtime-integrated entries: 7;
- notebook-visible entries: 7.

The sole remaining blocker is the complete SR EN 15193-1 lighting engine. MC001 Chapter 3.4 LENI aggregation and explicit lighting-energy boundaries remain implemented and production-integrated.

## Validation Added

P8 adds deterministic validation for:

- explicit parallel heating-system topology;
- allocation-fraction sum rejection;
- adapter propagation from Building DNA to Chapter 3 runtime;
- energy carrier aggregation per system;
- notebook visibility for allocated systems;
- direct-result execution trace validation;
- generated Chapter 3 coverage matrix synchronization.

## Remaining Bounded Dependency

`SR EN 15193-1` is still required for the detailed lighting calculation engine:

- installed lighting energy;
- daylight dependency factors;
- occupancy/control factors;
- parasitic/control power;
- emergency lighting;
- operating-hour schedules and annex tables.

No SR EN 15193-1 formulas or tables are invented by P8.
