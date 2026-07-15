# P3V MC001 Independent Python Reference

This directory contains the P3V independent reference calculator and black-box differential validation harness for the currently supported MC001 Chapter 2 useful-demand path.

The Python implementation is standalone. It does not import, call, wrap, translate, transpile, or shell out to the LaCurent JavaScript runtime for calculations. The JavaScript runner is test-only and exists only to execute the production Chapter 2 modules against the same reference-building input.

## Scope

Included:

- material design lambda and layer resistance
- layered and direct-U assemblies
- envelope element, boundary, bridge, and Htr aggregation
- monthly transmission and ventilation transfer
- internal, solar, and adjacent unconditioned-zone gains
- restricted monthly and annual QHnd
- restricted monthly and annual QCnd
- latent outputs as explicit zero/not-included markers for these fixtures
- fixed expected files for RB-001, RB-002, and RB-003
- three-way comparison: fixed expected vs Python vs LaCurent runtime
- metamorphic sensitivity checks
- hidden-input/demo-pattern diagnostics

Not included:

- Chapter 3
- final energy, primary energy, CO2, CPE, or certificate behavior
- production climate data
- UI, persistence, authentication, or report behavior changes

The monthly profiles are synthetic validation profiles. They are physically plausible and source-controlled, but they are not Romanian official climate data.

## Commands

From the repository root:

```bash
npm run test:reference-python
npm run test:differential
npm run test:p3v
```

Direct commands:

```bash
python validation-reference/python-mc001/tests/check_environment.py
python validation-reference/python-mc001/tests/run_all.py
python validation-reference/python-mc001/compare/compare_results.py --all
python validation-reference/python-mc001/compare/generate_report.py --all
node validation-reference/python-mc001/compare/run_lacurent_runtime.mjs validation-reference/python-mc001/fixtures/rb001.json
```

Required environment:

- Python >= 3.11
- Node.js available on PATH
- Python dependencies: standard library only

Expected files are committed under `expected/`. Do not regenerate them during normal tests. Regenerate only with source-based review:

```bash
python validation-reference/python-mc001/compare/generate_expected.py --all
```

## Formula Coverage Map

| Python function | MC001 relation/table/figure | Unit | Supported branch | Fixture coverage |
| --- | --- | --- | --- | --- |
| `materials.design_lambda` | 2.1.4 relation (2.3), Table 2.2 correction source | W/(m*K) | explicit lambda; lambda_normat times explicit correction coefficient | RB-001, RB-002, RB-003 |
| `materials.layer_resistance` | 2.4.1 layer resistance method | m2*K/W | positive thickness/lambda | RB-001, RB-002, RB-003 |
| `assemblies.calculate_assembly` | relation (2.6), relation (2.7) | m2*K/W, W/(m2*K) | layered assemblies with Rsi/Rse/air layers; direct U override | RB-001, RB-002, RB-003 |
| `envelope.element_contribution` | relation (2.11), boundary corrections from Chapter 2 source pack | W/K | outside air factor 1; explicit ground/unheated/adjacent factors | RB-001, RB-002, RB-003 |
| `envelope.bridge_contribution` | relation (2.11) | W/K | linear psi times length; point chi | RB-001, RB-002, RB-003 |
| `envelope.calculate_envelope` | relation (2.15) | W/K | Hd + Hg + Hu + Ha | RB-001, RB-002, RB-003 |
| `transmission.monthly_transmission` | relation (2.14), explicit runtime time integration | kWh | signed transfer; heating/cooling indoor temperatures explicit | RB-001, RB-002, RB-003 |
| `ventilation.ventilation_coefficient` | relation (2.30) | W/K | explicit airflow, bve, fve_dyn, air heat capacity | RB-001, RB-002, RB-003 |
| `ventilation.monthly_ventilation` | relation (2.29) | kWh | signed monthly ventilation transfer | RB-001, RB-002, RB-003 |
| `gains.monthly_gains` | Figure 2.13, relations (2.34), (2.37) | kWh | direct gains; explicit adjacent unconditioned-zone gains | RB-001 |
| `heating.time_constant_hours` | relation (2.57) | h | explicit Cm_eff and Htr+Hve | RB-001, RB-002, RB-003 |
| `heating.heating_parameter_a` | relation (2.55) | - | explicit aH0 and tauH0 | RB-001, RB-002, RB-003 |
| `heating.eta_hgn` | Figure 2.14 | - | gammaH=1; gammaH not equal 1 | RB-001, RB-002, RB-003 |
| `heating.heating_need` | Figure 2.18 | kWh | standard balance; gammaH > 2 zero demand; not-applicable/no-transfer branch | RB-001, RB-002, RB-003 |
| `cooling.cooling_parameter_a` | relation (2.56) | - | explicit aC0 and tauC0 | RB-003 |
| `cooling.eta_cht` | Figure 2.15 | - | gammaC=1; gammaC not equal 1; gammaC <= 0 zero branch | RB-003 |
| `cooling.cooling_need` | Figure 2.19 | kWh | standard utilized-transfer branch; inverse gammaC > 2 zero demand; not-applicable/no-transfer branch | RB-001, RB-002, RB-003 |
| `aggregation.annual_sum` | relations (2.84), (2.85), (2.86) | kWh/year | sum of 12 months | RB-001, RB-002, RB-003 |
| `latent.latent_summary` | relations (2.82), (2.83), (2.86) | kWh/year | explicit not-included marker for selected fixtures | RB-001, RB-002, RB-003 |
| `diagnostics.validate_full_fixture` | P3V hidden-input policy | - | full-building provenance and anti-spike checks | RB-001, RB-002, RB-003 |
| `diagnostics.validate_hidden_output_patterns` | P3V hidden-input policy | - | constant-transfer and missing-intermediate checks | RB-001, RB-002, RB-003 |

## Reference Buildings

- RB-001: insulated masonry detached house with corrected old masonry lambda, EPS intervention, attic/ground boundaries, windows, ventilation, seasonal profile, and adjacent unconditioned-zone gains.
- RB-002: weakly insulated building with materially higher U-values, higher Htr, higher heating demand, unheated attic and basement boundaries.
- RB-003: cooling-dominant high-glazing case with stronger summer solar gains and positive summer cooling demand without an isolated September spike.

## Report Outputs

Generated deterministic outputs:

- `reports/p3v_differential_report.json`
- `reports/p3v_differential_report.md`

The reports include fixture descriptions, formula coverage, monthly input tables, fixed expected values, Python results, JavaScript results, per-comparison pass/fail summaries, sensitivity results, implementation versions, commit hash, hidden-input findings, and runtime defect status.
