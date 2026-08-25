# P11B Python Cutover Readiness

Starting main: `4790c2e41294280846c6e3182437bc756db400f1`

## Architecture

P11B extends the P11 Python engine from fixture execution to direct `building_dna_v1` execution through the existing versioned engine contract. The product layer still builds the canonical engine input; Python receives only physics-domain data and returns the stable engine output shape with diagnostics, carriers, provenance, and execution traces.

The JavaScript engine remains production authority. Python is a certification/shadow target and can be called either by the CLI batch contract or by the minimal `POST /calculate` service wrapper.

## Execution Domain Manifest

The machine-readable manifest is in `validation-reference/python-engine-execution-domain.json`.

Covered direct Building DNA domains:

- Chapter 2: climate profiles, envelope assemblies/elements, transmission, ventilation, internal gains, explicit solar gains, truthful source-backed solar blocker, useful heating/cooling demand, monthly/annual aggregation.
- Chapter 3: heating, cooling, DHW, ventilation/AHU auxiliary energy, explicit stage losses/auxiliaries, no-storage/storage branches, multiple systems, allocation fractions, shared heating+DHW generator, carrier aggregation, cooling unmet load contract surface.
- Chapter 4: supported PV annual product contract and installed-power profile contract.

Known preserved blockers:

- `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED`
- `3.4_EQ_34_LENI` / `SR EN 15193-1`

## Semantic Comparison

Compared fields include status, important diagnostic codes, monthly and annual `QHnd`/`QCnd`, heating/cooling/DHW inputs, ventilation auxiliaries, system losses/auxiliaries/recoverable quantities where surfaced, shared generator physical totals, service allocation invariants, energy carriers, unmet cooling, and PV production.

Tolerance classes:

- Exact: schema/status/diagnostic codes/discrete branch identity.
- Tight numerical: deterministic algebraic values, `1e-7`.
- Aggregated numerical: annual totals and carriers, `1e-6`.

## Golden And Randomized Results

Independent Python test suite:

- 19 Python tests passed.
- 3 original P3V golden fixtures retained.
- P11B direct Building DNA fixtures cover Chapter 2, solar blocker, shared generator, missing-input blocking, PV annual contract, and metamorphic checks.

Randomized direct Building DNA parity:

- Seed: `111211`
- Valid cases: `1000`
- Compared values: `35760`
- Result: `PASS`
- Maximum absolute difference: `2.4101609596982598e-11`

Branch hits:

| Branch | Hits |
| --- | ---: |
| `chapter2_only` | 91 |
| `heating_single` | 91 |
| `heating_parallel` | 91 |
| `storage_branch` | 91 |
| `dhw` | 91 |
| `shared_generator` | 91 |
| `cooling_single` | 91 |
| `cooling_parallel` | 91 |
| `ventilation_ahu` | 91 |
| `pv` | 91 |
| `solar_blocked` | 90 |

Mismatch ledger:

- Material mismatches: none in the P11B manifest domain.
- JS defects discovered: none.
- Python defects discovered during development and fixed: direct-U missing handling, DHW useful-demand aliasing, ventilation fan-energy participation, and duplicate direct-service evaluation.
- Contract mapping defects discovered and fixed: `renewableSystems.photovoltaic` now maps to the engine contract renewables surface.

## Invariants

Passing invariants include:

- Missing stage inputs block instead of becoming zero.
- Multi-service shared generator requires explicit service allocation.
- Shared generator physical fuel/auxiliary consumption is calculated once and service allocations sum back to physical totals.
- Larger envelope heat transfer increases heating need in the controlled fixture.
- Larger PV production contract increases PV output.
- Annual aggregation equals monthly aggregation within the comparison tolerance.

## Performance

Python pure direct calculation benchmark on the direct Building DNA fixture:

| Run | Median | P95 | Total |
| --- | ---: | ---: | ---: |
| 1 calculation | 1.0214 ms | 1.0214 ms | 1.0214 ms |
| 100 calculations | 1.4627 ms | 1.7915 ms | 135.8975 ms |
| 1000 calculations | 1.4827 ms | 1.8809 ms | 1415.2952 ms |

Full black-box JS/Python harness wall-clock:

- 100 cases: about 2.3 s
- 1000 cases: about 15.0 s

## Shadow Mode

The JavaScript adapter now compares a broader semantic output surface. Shadow mode can run realistic Building DNA cases and report compact parity differences without making Python authoritative.

Failure behavior during shadow:

- Python unavailable: JavaScript remains primary.
- Parity status: unavailable/error diagnostic only.
- User-facing result authority remains JavaScript.

## Service Boundary

Implemented minimal service:

`POST /calculate`

Input:

- single canonical engine input or an array of inputs.

Output:

- canonical engine output, or compact batch output when `x-lacurent-compact-output: true`.

The physics package is independent from HTTP concerns.

## Hosting Recommendation

Recommended next hosting path: small containerized Python service behind a Cloudflare Worker or Cloudflare-accessible service endpoint.

Rationale:

- Lowest coupling to the existing Cloudflare Pages product.
- Clean `POST /calculate` boundary already exists.
- JS authority can continue while Python runs in shadow.
- Service outage during shadow does not affect user calculations.

Production hosting was not proven in P11B. Until hosting, observability, and service reliability are proven, Python must not become production authority.

## Cutover Assessment

`PYTHON_PRODUCTION_CUTOVER_READY = false`

Reasons:

- The P11B manifest domain passes 1000-case parity, but full certified JavaScript Chapter 3 relation-contract breadth is not yet exhaustively proven branch-by-branch in Python direct execution.
- Production Python hosting is not proven.
- Shadow telemetry has not run against real production traffic.

Cutover blockers:

1. Exhaustive branch manifest expansion for every production-reachable Chapter 3 component contract.
2. Production hosting proof with latency, availability, logging, and failure behavior.
3. Shadow-mode soak period with zero unresolved material differences.
