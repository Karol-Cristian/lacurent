# FIXTURE 003 - Envelope Remaining Elements

## Status

- Fixture id: `FIXTURE_003_ENVELOPE_REMAINING_ELEMENTS`
- Source candidates:
  - `MC001_EX_B_GEOMETRY_ENVELOPE_TABLES`
  - `MC001_EX_B_THERMAL_BRIDGE_TABLES`
- Executable: yes, for terrace, slab-on-ground, and floor-over-basement values listed below.
- Validated modules:
  - `materialsUValues.mjs`
  - `transmissionCoefficients.mjs`
- Scope exclusions: no climate data, no DHW, no lighting, no classes, no renewables, no production integration.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 Anexa B, school audit breviar.
- Page 515: Tabel 2.1 geometry summary and Tabel 2.2 material calculation conductivities.
- Page 517: bridge groups for `PLANSEU TERASA`, `PLACA PE SOL`, and `PLANSEU PESTE SUBSOL`.
- Pages 518-519: Tabel 2.4 thermal resistance stacks for `TERASA`, `PLACA PE SOL`, and `PLANSEU PESTE SUBSOL`.
- Page 520: transmission-loss table with terrace `Hd = 594.49 W/K`, slab-on-ground `Hg = 86.12 W/K`, and note that losses to the partial basement are neglected.
- Pages 576-577: Anexa 1 repeated input-sheet values for slab-on-ground and terrace.

## Example Selected

This fixture selects the remaining complete baseline envelope elements from Anexa B:

- terrace;
- slab-on-ground;
- floor-over-basement.

They were selected because their layer stacks, lambda values, correction coefficients, R/R' outputs, and bridge rows are visible and traceable.

## Extracted Inputs And Outputs

### Terrace

| Input/output | MC001 value | Unit | Source |
| --- | ---: | --- | --- |
| `Rsi` | 0.125 | m2K/W | page 518 |
| `Rse` | 0.042 | m2K/W | page 518 |
| reduction coefficient `r` | 0.97 | - | page 518 |
| source total R | 0.873 | m2K/W | page 518 |
| source corrected R' | 0.85 | m2K/W | page 518 |
| transmission table area | 504.0 | m2 | page 520 |
| displayed U' | 1.18 | W/m2K | page 520 |
| displayed Hd | 594.49 | W/K | page 520 |

| Layer | d | lambda | correction coefficient | lambda_c shown | R shown |
| --- | ---: | ---: | ---: | ---: | ---: |
| Interior plaster | 0.020 m | 0.87 W/mK | 1.03 | 0.896 W/mK | 0.022 m2K/W |
| Reinforced concrete slab | 0.150 m | 1.74 W/mK | 1.10 | 1.914 W/mK | 0.078 m2K/W |
| Slope concrete | 0.100 m | 1.62 W/mK | 1.10 | 1.782 W/mK | 0.056 m2K/W |
| BCA GBN-T insulation | 0.120 m | 0.22 W/mK | 1.20 | 0.264 W/mK | 0.455 m2K/W |
| Screed | 0.050 m | 0.64 W/mK | 1.00 | 0.64 W/mK | 0.078 m2K/W |
| Waterproofing | 0.005 m | 0.29 W/mK | 1.00 | 0.29 W/mK | 0.017 m2K/W |

Bridge rows:

| Row | Bridge description | psi | n | l | Expected n * psi * l |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | External wall to terrace floor, attic/parapet | 0.154 | 1 | 49.76 | 7.663 |
| 2 | External wall to terrace floor, attic/parapet, joinery junction | 0.270 | 1 | 39.00 | 10.530 |

Expected bridge total: `18.193 W/K`.

### Slab-On-Ground

| Input/output | MC001 value | Unit | Source |
| --- | ---: | --- | --- |
| `Rsi` | 0.167 | m2K/W | pages 518-519 |
| `Rse` | 0 | m2K/W | no exterior surface row in source stack |
| reduction coefficient `r` | 0.58 | - | pages 518-519 |
| source total R | 3.110 | m2K/W | page 519 |
| source corrected R' | 1.79 | m2K/W | page 519 |
| transmission table area | 504.0 | m2 | page 520 |
| displayed U' | 0.56 | W/m2K | page 520 |
| displayed Hg | 86.12 | W/K | page 520 |

| Layer | d | lambda | correction coefficient | lambda_c shown | R shown |
| --- | ---: | ---: | ---: | ---: | ---: |
| Flooring | 0.015 m | 0.93 W/mK | 1.00 | 0.93 W/mK | 0.016 m2K/W |
| Concrete screed | 0.050 m | 1.74 W/mK | 1.10 | 1.91 W/mK | 0.026 m2K/W |
| Reinforced concrete slab | 0.120 m | 1.74 W/mK | 1.10 | 1.91 W/mK | 0.063 m2K/W |
| Gravel | 0.100 m | 0.70 W/mK | 1.10 | 0.77 W/mK | 0.130 m2K/W |
| Soil layer | 3.415 m | 2.00 W/mK | 1.00 | 2.00 W/mK | 1.708 m2K/W |
| Soil layer | 4.00 m | 4.00 W/mK | 1.00 | 4.00 W/mK | 1.000 m2K/W |

Bridge rows:

| Row | Bridge description | psi | n | l | Expected n * psi * l |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | External wall to slab-on-ground | 1.128 | 1 | 85.76 | 96.737 |

Expected bridge total: `96.737 W/K`.

### Floor-Over-Basement

| Input/output | MC001 value | Unit | Source |
| --- | ---: | --- | --- |
| `Rsi` | 0.167 | m2K/W | page 519 |
| `Rse` | 0.083 | m2K/W | page 519 |
| reduction coefficient `r` | 0.87 | - | page 519 |
| source total R | 0.383 | m2K/W | page 519 |
| source corrected R' | 0.33 | m2K/W | page 519 |

| Layer | d | lambda | correction coefficient | lambda_c shown | R shown |
| --- | ---: | ---: | ---: | ---: | ---: |
| Flooring | 0.015 m | 0.93 W/mK | 1.00 | 0.93 W/mK | 0.016 m2K/W |
| Protective screed | 0.050 m | 0.93 W/mK | 1.00 | 0.93 W/mK | 0.054 m2K/W |
| Reinforced concrete slab | 0.120 m | 1.74 W/mK | 1.10 | 1.91 W/mK | 0.063 m2K/W |

Bridge rows:

| Row | Bridge description | psi | n | l | Expected n * psi * l |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | External wall to floor over unheated basement, joinery junction | 0.179 | 1 | 3.54 | 0.634 |
| 2 | Internal wall to floor over unheated basement | 0.338 | 1 | 54.92 | 18.563 |

Expected bridge total: `19.197 W/K`.

## Transmission Assertions

The page 520 source table supports only these fixture-scoped transmission assertions:

- terrace `Hd` using the terrace row from the loss table;
- slab-on-ground `Hg` as an explicit source ground component consumed by `calculateTotalTransmissionCoefficient()`.
- bridge-only subtotals through `calculateDirectTransmissionWithBridges()` with no envelope element term, using only the sourced `psi`, `n`, and `l` rows.

Floor-over-basement transmission is not asserted because page 520 states that losses to the partial basement are neglected due to small dimensions.

## Area Notes

Area values are not fully identical across the source:

- Tabel 2.1 lists terrace area as `508.7 m2`, slab-on-ground as `443.0 m2`, and floor-over-basement as `65.7 m2`.
- Anexa 1 lists terrace area as `456.5 m2` and slab-on-ground as `407.9 m2`.
- The page 520 loss table uses `504.0 m2` for terrace and slab-on-ground transmission rows.

The executable transmission checks use only page 520 loss-table areas, because those are the areas tied directly to the source `Hd/Hg` outputs. Other area values are documented as context only.

## Assumptions

- Layer lambda and R values are rounded in MC001; tolerances reflect displayed precision.
- The slab-on-ground stack has no `Rse` row, so `Rse = 0` is used for the calculator input.
- `r` values are rounded in the source; corrected R' comparisons use a wider tolerance than one-dimensional R.
- Bridge rows use `effectiveLength = n * l` when passed to `calculateDirectTransmissionWithBridges()`.

## Blocked Rows And Reasons

- `calculateLinearBridgePsi()` remains blocked because no numeric `L2D` values are provided for these examples.
- Floor-over-basement transmission is blocked because the source loss table says losses to the partial basement are neglected.
- Slab-on-ground explicit direct transmission is blocked because page 520 reports `Hg`, not `Hd`; the fixture only consumes `Hg` as an explicit source component in the total-transmission wrapper.
- No full-building `Htr` is asserted because the fixture does not include wall/window rows, ventilation, or climate-dependent terms.

## Verification Notes

- Pages 515, 517, 518, 519, 520, 576, and 577 were rendered locally from the MC001 PDF and visually checked before extraction.
- Corrected lambda tolerance: absolute `0.005 W/mK`.
- Layer R and total R tolerance: absolute `0.001 m2K/W`.
- Corrected R' tolerance: absolute `0.015 m2K/W`.
- Plain U tolerance: absolute `0.003 W/m2K`.
- Bridge row and bridge subtotal tolerance: absolute `0.001 W/K`.
- Terrace transmission tolerance: absolute `0.75 W/K`, because source `U'`, `R`, `R'`, and area are rounded/displayed with limited precision.
