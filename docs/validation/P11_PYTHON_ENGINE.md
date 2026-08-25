# P11 Python Physics Engine

## Architecture

P11 adds a separate Python package under `python_engine/` and leaves the P10
product layer intact. The current JavaScript engine remains the production
authority. Python is available for independent execution, golden validation and
shadow/differential comparison.

The product boundary is versioned as:

- input: `lacurent_engine_input_v1`
- output: `lacurent_engine_output_v1`

The JavaScript product can build the same contract with
`buildPhysicsEngineInputFromBuildingDna()`. The adapter supports
`javascript`, `python` and `dual` modes, but the switch is not exposed to normal
production users.

## Input Contract

The engine input contains only calculation-relevant data:

- `building`
- `climate`
- `envelope`
- `use`
- `systems`
- `renewables`
- `calculationOptions`

UI state such as active tabs, wizard progress and inspectors is rejected by the
contract tests.

## Output Contract

Python returns:

- `status`
- `chapter2`
- `chapter3`
- `chapter4`
- `energyCarriers`
- `diagnostics`
- `executionTrace`
- `provenance`

Expected blockers are structured diagnostics. Python exceptions are not exposed
as product diagnostics except by the CLI development wrapper.

## Module Ownership

- `core/`: strict numeric validation, units, diagnostics, provenance and trace
- `climate/`: climate input consumption boundary; source datasets stay in the
  existing Climate Provider/Building DNA layer for P11
- `chapter2/`: supported Chapter 2 useful-demand path through independent P3V
  formulas, with the existing solar preprocessing blocker preserved
- `chapter3/`: independent P3V formulas for heating, cooling, DHW, AHU and
  shared generation
- `chapter4/`: supported PV production subset using explicit product/yield
  inputs
- `api/`: versioned schema and `calculate()` entry point

## Validation Methodology

P11 keeps the existing P3V three-way oracle and adds a Python-engine harness:

- fixed expected values
- Python engine output
- JavaScript runtime output
- randomized deterministic fixture mutations
- shared-generator and EER invariants
- missing/zero/non-finite validation

The Python engine never calls JavaScript. The JS runner is used only by the
differential harness.

## Parity Status

Current P11 parity covers:

- Chapter 2 supported fixture path: golden fixtures RB-001, RB-002, RB-003
- randomized Chapter 2 supported fixture variants
- Chapter 3 formula groups exposed by the independent P3V kernel
- shared generator accounting fixture
- EER monotonic sensitivity fixture
- Chapter 4 supported PV production fixture

No material JS/Python mismatch is known from the committed P11 differential
suite.

## Known Differences

The new Python API does not yet execute arbitrary live `building_dna_v1` inputs
directly. P11 freezes the contract and validates the engine through P3V fixture
contracts and direct formula groups. Full production Building DNA execution by
Python remains a cutover prerequisite.

The Chapter 2 Qsky/Qsol chain remains blocked when the owned source material is
insufficient. Python returns `SOLAR_GAIN_QSKY_AND_ELEMENT_INPUTS_REQUIRED`
instead of substituting zero.

LENI remains outside Python implementation scope because SR EN 15193-1 is not
implemented.

## Production Deployment Status

Python production deployment is not complete in P11. The product-side adapter is
implemented, but the production calculator keeps JavaScript as primary.

## Cutover Gate

Python production cutover requires all of the following:

- direct `building_dna_v1` execution for the complete supported product scope
- Chapter 2 parity including diagnostics
- Chapter 3 non-lighting supported-scope parity
- Chapter 4 supported PV parity
- golden fixtures green
- randomized differential suite green at production-level volume
- no unexplained material numerical differences
- deployment architecture selected and load-tested
- P10 workspace/report/persistence behavior unchanged

Until this gate is met, Python remains a certification/shadow engine.
