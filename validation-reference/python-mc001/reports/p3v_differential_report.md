# P3V Independent Reference Differential Validation

Status: **PASS**
Commit: `0fdd64fd587984ed0708c17f995f108887c42d7e`
Python: `3.14.6`
Node: `v24.15.0`
Dependencies: `standard library only`

## Formula Coverage

| Function | MC001 source | Unit |
| --- | --- | --- |
| `a_c` | MC001-2022 relation (2.56) | `-` |
| `a_h` | MC001-2022 relation (2.55) | `-` |
| `annual_sums` | MC001-2022 2.10, relations (2.84), (2.85) | `kWh/year` |
| `assembly_resistance` | MC001-2022 2.4.1, relation (2.6) | `m2*K/W` |
| `design_lambda` | MC001-2022 2.1.4, relation (2.3) | `W/(m*K)` |
| `direct_transmission` | MC001-2022 2.4.1, relation (2.11) | `W/K` |
| `eta_cht` | MC001-2022 Figure 2.15 | `-` |
| `eta_hgn` | MC001-2022 Figure 2.14 | `-` |
| `htr` | MC001-2022 2.4.1, relation (2.15) | `W/K` |
| `hve` | MC001-2022 2.7.1.2, relation (2.30) | `W/K` |
| `layer_resistance` | MC001-2022 2.4.1 thermal resistance method | `m2*K/W` |
| `monthly_gains` | MC001-2022 2.7.2 Figure 2.13; 2.7.2/2.7.3 relations (2.34), (2.37) | `kWh` |
| `monthly_transmission` | MC001-2022 2.4.1 relation (2.14), time integrated for current explicit runtime path | `kWh` |
| `monthly_ventilation` | MC001-2022 2.7.1.2, relation (2.29) | `kWh` |
| `qcnd` | MC001-2022 2.8.1 Figure 2.19 | `kWh` |
| `qhnd` | MC001-2022 2.8.1 Figure 2.18 | `kWh` |
| `tau_c` | MC001-2022 relation (2.58) | `h` |
| `tau_h` | MC001-2022 relation (2.57) | `h` |
| `u_value` | MC001-2022 2.4.1, relation (2.7) | `W/(m2*K)` |

## Reference Buildings

### RB-001

Insulated masonry detached house with corrected old masonry lambda, EPS intervention, unheated attic gains, ground boundary, windows, and explicit seasonal monthly profile.

Expected file: `expected\rb001_expected.json`
Annual expected QHnd: `8604.275060690636` kWh
Annual expected QCnd: `0.0` kWh
Three-way status: **PASS**

| Comparison | Status | Failures |
| --- | --- | ---: |
| `fixed_expected_vs_python` | PASS | 0 |
| `fixed_expected_vs_lacurent_runtime` | PASS | 0 |
| `python_reference_vs_lacurent_runtime` | PASS | 0 |

### RB-002

Weakly insulated masonry building with higher U-values, high Htr, unheated basement and attic boundaries, and a winter-dominant seasonal profile.

Expected file: `expected\rb002_expected.json`
Annual expected QHnd: `55566.64740645608` kWh
Annual expected QCnd: `0.0` kWh
Three-way status: **PASS**

| Comparison | Status | Failures |
| --- | --- | ---: |
| `fixed_expected_vs_python` | PASS | 0 |
| `fixed_expected_vs_lacurent_runtime` | PASS | 0 |
| `python_reference_vs_lacurent_runtime` | PASS | 0 |

### RB-003

Cooling-dominant high-glazing case with improved envelope, large transparent area, strong but smooth summer solar gains, explicit ventilation, and no isolated September spike.

Expected file: `expected\rb003_expected.json`
Annual expected QHnd: `6896.823865822726` kWh
Annual expected QCnd: `6070.964260584742` kWh
Three-way status: **PASS**

| Comparison | Status | Failures |
| --- | --- | ---: |
| `fixed_expected_vs_python` | PASS | 0 |
| `fixed_expected_vs_lacurent_runtime` | PASS | 0 |
| `python_reference_vs_lacurent_runtime` | PASS | 0 |

## Sensitivity

Sensitivity status: **PASS**

| Mutation | Fixture | Metric | Expected | Python | JavaScript |
| --- | --- | --- | --- | --- | --- |
| `increase_eps_thickness` | RB-001 | `annual.q_hnd_kwh` | decrease | decrease (PASS) | decrease (PASS) |
| `increase_material_lambda` | RB-001 | `annual.q_hnd_kwh` | increase | increase (PASS) | increase (PASS) |
| `increase_wall_area` | RB-001 | `annual.q_hnd_kwh` | increase | increase (PASS) | increase (PASS) |
| `increase_high_u_window_area` | RB-002 | `annual.q_hnd_kwh` | increase | increase (PASS) | increase (PASS) |
| `improve_window_u` | RB-002 | `annual.q_hnd_kwh` | decrease | decrease (PASS) | decrease (PASS) |
| `add_positive_thermal_bridge` | RB-001 | `annual.q_hnd_kwh` | increase | increase (PASS) | increase (PASS) |
| `remove_positive_thermal_bridge` | RB-001 | `annual.q_hnd_kwh` | decrease | decrease (PASS) | decrease (PASS) |
| `increase_ventilation` | RB-001 | `annual.q_hnd_kwh` | increase | increase (PASS) | increase (PASS) |
| `increase_winter_solar_gains` | RB-001 | `annual.q_hnd_kwh` | decrease | decrease (PASS) | decrease (PASS) |
| `increase_summer_solar_gains` | RB-003 | `annual.q_cnd_kwh` | increase | increase (PASS) | increase (PASS) |

## Hidden Input Findings

No hidden demo fallback, constant monthly transfer, isolated gain spike, or missing audited monthly intermediate was detected in the full reference fixtures.

## Runtime Defects

No runtime defect was isolated by this validation run.

