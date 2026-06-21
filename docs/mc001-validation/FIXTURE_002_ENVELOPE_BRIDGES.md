# FIXTURE 002 - Envelope Bridges

## Status

- Fixture id: `FIXTURE_002_ENVELOPE_BRIDGES`
- Source candidate: `MC001_EX_B_THERMAL_BRIDGE_TABLES`
- Executable: yes, for complete external-wall bridge rows only
- Validated modules:
  - `transmissionCoefficients.mjs`
- Validated functions:
  - `calculateDirectTransmissionWithBridges()`
  - `calculateTotalTransmissionCoefficient()`
- Blocked function:
  - `calculateLinearBridgePsi()`, because MC001 Tabel 2.3 provides sourced `psi` values but not numeric `L2D` inputs.
- Scope exclusions: no climate data, no DHW, no lighting, no classes, no renewables, no production integration.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 Anexa B, school audit breviar.
- Page 516: Tabel 2.3, `Coeficienti liniari de transfer termic - PERETE EXTERIOR`.
- Page 517: corrected transmittance relation `U' = 1/R' = 1/R + sum(psi * l) / A + sum(chi) / A`.
- Page 518: Tabel 2.4, `PERETE EXTERIOR` total one-dimensional `R = 1.698`.
- Page 576: Anexa 1 input sheet, `PERETE EXTERIOR, S=596.5 m2`.

## Example Selected

The selected example is the baseline external-wall thermal bridge table from Anexa B, Tabel 2.3.

This was chosen because it has the largest reviewed bridge set with explicit:

- `psi` values;
- multiplicity `n`;
- bridge length `l`;
- expected row contribution `n * psi * l`.

Only rows where all four values are visible are executable. Rows with blank length cells remain blocked.

## Verified Bridge Rows

| Row | Bridge description | psi | n | l | Expected n * psi * l |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Exterior corner | 0.324 | 5 | 8.45 | 13.689 |
| 2 | Interior corner | -0.442 | 1 | 8.45 | -3.735 |
| 3 | External wall to internal wall with small column, ground floor | 0.020 | 12 | 8.45 | 2.028 |
| 3' | External wall to internal wall with small column, upper floor | 0.020 | 2 | 5.40 | 0.216 |
| 4 | External wall to internal wall without small column, ground floor | -0.002 | 2 | 3.05 | -0.012 |
| 5 | Field rib | 0.024 | 4 | 8.45 | 0.811 |
| 8 | External wall to intermediate floor E1 | 0.044 | 1 | 47.71 | 2.099 |
| 10 | External wall to intermediate floor E2 | 0.044 | 1 | 49.76 | 2.189 |
| 12 | External wall to terrace floor, attic/parapet | 0.224 | 1 | 49.76 | 11.146 |
| 14 | External wall to floor over unheated basement, window junction | 0.426 | 2 | 1.50 | 1.278 |
| 15 | External wall to slab on ground | 0.1331 | 1 | 85.76 | 11.415 |

Expected verified bridge subtotal from displayed row outputs:

- `41.124 W/K`

Calculated verified bridge subtotal from source `psi`, `n`, and `l`:

- `41.124676 W/K`

The small delta is caused by source table rounding.

## Blocked Rows

These Tabel 2.3 rows have sourced `psi`, multiplicity, and expected contribution, but the length cell is blank in the reviewed PDF table. They are not executable because deriving the missing length from `expected / (psi * n)` would invent an input.

| Row | Bridge description | psi | n | l | Displayed contribution |
| --- | --- | ---: | ---: | --- | ---: |
| 6 | Horizontal section at external joinery | 0.363 | 90 | missing | 80.000 |
| 7 | Vertical section at external joinery, sill/reveal zone | 0.394 | 88 | missing | 45.710 |
| 9 | External wall to intermediate floor E1, joinery junction | 0.455 | 32 | missing | 18.682 |
| 11 | External wall to intermediate floor E2, joinery junction | 0.630 | 29 | missing | 24.558 |
| 13 | External wall to terrace floor, attic/parapet, joinery junction | 0.601 | 29 | missing | 23.423 |

Source table total for all rows:

- `233.509 W/K`

This full table total is retained as context only. The executable fixture validates the verified subtotal, not the full table total.

## Transmission Inputs

For `calculateDirectTransmissionWithBridges()`, the fixture uses the same source external wall as Fixture 001:

| Input | Value | Source |
| --- | ---: | --- |
| Area `A` | 596.5 m2 | page 576, Anexa 1 |
| Source total one-dimensional `R` | 1.698 m2K/W | page 518, Tabel 2.4 |
| Plain `U = 1 / R` | 0.5889281507656066 W/m2K | formula-derived from source R |
| Plain wall contribution `U * A` | 351.2956419316843 W/K | formula-derived |
| Verified bridge subtotal | 41.124676 W/K | formula-derived from verified rows |
| Direct transmission with verified bridges | 392.42031793168434 W/K | formula-derived |

The fixture does not assert the full external-wall corrected transmission because rows 6, 7, 9, 11, and 13 cannot be expanded into explicit bridge terms without missing lengths.

## Assumptions

- Multiplicity is represented in the test by `effectiveLength = n * l`; both `n` and `l` remain stored separately in the fixture.
- Negative `psi` values are allowed only because they are explicitly sourced from MC001 Tabel 2.3.
- `calculateTotalTransmissionCoefficient()` is validated only for the fixture-scoped direct component: `Htr = Hd` with `Hg`, `Hu`, and `Ha` outside this fixture scope. This is not a full-building `Htr` assertion.

## Missing Values

- Numeric `L2D` values are not present, so `calculateLinearBridgePsi()` cannot be validated without inventing inputs.
- Full explicit external-wall bridge total cannot be validated through `calculateDirectTransmissionWithBridges()` until rows 6, 7, 9, 11, and 13 have source lengths.
- Full-building `Htr` is not available in this bridge-only source row set.

## Verification Notes

- Pages 516, 517, 518, and 576 were rendered locally from the MC001 PDF and visually checked before extraction.
- Individual row contribution tolerance: absolute `0.001 W/K`.
- Verified bridge subtotal tolerance: absolute `0.001 W/K`.
- Direct transmission and fixture-scoped total transmission use floating-point tolerance only because they are derived from source-rounded inputs.
