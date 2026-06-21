# FIXTURE 001 - Envelope

## Status

- Fixture id: `FIXTURE_001_ENVELOPE`
- Source candidate: `MC001_EX_B_GEOMETRY_ENVELOPE_TABLES`
- Executable: yes, for the external opaque wall subset only
- Validated modules:
  - `materialsUValues.mjs`
  - `transmissionCoefficients.mjs`
- Scope exclusions: no climate data, no DHW, no lighting, no classes, no renewables, no Physics Engine integration.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 Anexa B, school audit breviar.
- Page 515: Tabel 2.2, material calculation conductivities.
- Page 516: Tabel 2.3, external wall linear thermal bridge contribution total.
- Page 517: corrected thermal transmittance relation `U' = 1/R' = 1/R + sum(psi * l) / A + sum(chi) / A`.
- Page 518: Tabel 2.4, `PERETE EXTERIOR` layer stack, R values, reduction coefficient `r`, corrected R'.
- Page 576: Anexa 1 input sheet, `PERETE EXTERIOR, S=596,5 m2`.

## Example Selected

`MC001_EX_B_GEOMETRY_ENVELOPE_TABLES`, narrowed to the existing external opaque wall before renovation.

This is the simplest executable subset because it includes all values needed for:

- material layers;
- lambda values and correction coefficients;
- layer thicknesses;
- layer R calculation;
- total R calculation;
- U calculation from R;
- corrected U' and direct transmission coefficient from source R' and area.

It does not require climate data, DHW, lighting, energy classes, renewables, or monthly calculations.

## Extracted Inputs

External opaque wall, before renovation:

| Input | MC001 value | Unit | Source |
| --- | ---: | --- | --- |
| Area `A` | 596.5 | m2 | page 576, Anexa 1 |
| `Rsi` | 0.125 | m2K/W | page 518, Tabel 2.4 |
| `Rse` | 0.042 | m2K/W | page 518, Tabel 2.4 |
| Thermal bridge reduction coefficient `r` | 0.60 | - | page 518, Tabel 2.4 |
| Total external-wall bridge contribution | 233.509 | W/K | page 516, Tabel 2.3 |

Layer inputs:

| Layer | d | lambda | correction coefficient | lambda_c shown | R shown |
| --- | ---: | ---: | ---: | ---: | ---: |
| Interior plaster | 0.02 m | 0.87 W/mK | 1.03 | 0.896 W/mK | 0.022 m2K/W |
| Solid brick masonry | 0.365 m | 0.80 W/mK | 1.15 | 0.920 W/mK | 0.397 m2K/W |
| EPS ETICS insulation | 0.05 m | 0.044 W/mK | 1.05 | 0.046 W/mK | 1.082 m2K/W |
| Exterior plaster | 0.03 m | 0.93 W/mK | 1.10 | 1.023 W/mK | 0.029 m2K/W |

## Extracted Expected Outputs

| Output | Expected value | Unit | Status |
| --- | ---: | --- | --- |
| Interior plaster corrected lambda | 0.896 | W/mK | source rounded |
| Solid brick masonry corrected lambda | 0.920 | W/mK | source rounded |
| EPS ETICS corrected lambda | 0.046 | W/mK | source rounded |
| Exterior plaster corrected lambda | 1.023 | W/mK | source rounded |
| Interior plaster R | 0.022 | m2K/W | source rounded |
| Solid brick masonry R | 0.397 | m2K/W | source rounded |
| EPS ETICS R | 1.082 | m2K/W | source rounded |
| Exterior plaster R | 0.029 | m2K/W | source rounded |
| Total one-dimensional R | 1.698 | m2K/W | source rounded |
| Corrected R' | 1.02 | m2K/W | source rounded |
| Plain U from source R | 0.5889281507656066 | W/m2K | formula-derived from `1 / 1.698` |
| Corrected U' from source R' | 0.9803921568627451 | W/m2K | formula-derived from `1 / 1.02` |
| Direct transmission coefficient from corrected U' | 584.8039215686274 | W/K | formula-derived from `596.5 / 1.02` |
| External-wall bridge contribution total | 233.509 | W/K | source rounded |

## Assumptions

- The fixture uses the external opaque wall only; the broader Anexa B geometry/envelope example remains partially blocked.
- `lambda_c` values are recalculated from source lambda and correction coefficient. MC001 displays `lambda_c` and layer R rounded to three decimals.
- `U` is not printed as a table row for the wall; it is derived using the MC001 relation `U = 1 / R`.
- `U'` and direct transmission are derived from the source corrected resistance `R' = 1.02 m2K/W` and source area `A = 596.5 m2`.
- The explicit Tabel 2.3 bridge total is retained as reviewed source context. It is not expanded into bridge geometry where source length cells are blank.

## Missing Values

- Several Tabel 2.3 bridge rows provide `n * psi * l` but omit the individual length cell. The fixture does not invent those lengths.
- No full-building `Htr` is asserted because `Hg`, `Hu`, and `Ha` are outside this fixture scope.
- Other envelope elements from Tabel 2.4 are not part of this fixture.

## Verification Notes

- Pages 516, 517, 518, and 576 were rendered locally from the MC001 PDF and visually checked before extraction.
- Tolerances are used only where MC001 table values are rounded:
  - corrected lambda: absolute tolerance `0.0005 W/mK`;
  - layer R and total R: absolute tolerance `0.0005 m2K/W`;
  - corrected R': absolute tolerance `0.005 m2K/W`.
- Formula-derived transmission outputs use exact source-rounded `R'` and area values with only floating-point tolerance.
