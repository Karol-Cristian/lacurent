# FIXTURE 005 - Ventilation Hve Summary

## Status

- Fixture id: `FIXTURE_005_VENTILATION_HVE_SUMMARY`
- Source candidate: `MC001_EX_B_HEATING_MONTHLY_GAINS`
- Executable: yes, for the explicit-airflow ventilation path, exterior-air `bve`, page 520 `Hve`, and page 522 monthly `QH;ve;cont` values listed below.
- Partially blocked:
  - ACH-based airflow is blocked because the example does not provide ACH and heated volume.
  - `bve` from an unconditioned zone is blocked because the example does not provide a `bztu` value or an unconditioned-source ventilation row.
- Validated module:
  - `ventilationCoefficients.mjs`
- Scope exclusions: no climate fallback, no AHU/fan energy, no DHW, no lighting, no classes, no renewables, no UI, no workers, no DB/schema, no production integration.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 section 2.7.1.2, relation (2.29): monthly ventilation transfer.
- MC001-2022 section 2.7.1.2, relation (2.30): global ventilation heat-transfer coefficient.
- MC001-2022 section 2.7.1.2, relation (2.31): ventilation temperature correction factor.
- Page 519, Anexa B: school is not mechanically ventilated; classrooms are naturally ventilated by window opening and infiltration from outside.
- Page 520, Anexa B: `q = 5474.6 m3/h` and `Hve = 1806.62 W/K`.
- Page 522, Anexa B: monthly `QH;ve;cont` row plus monthly `theta_e`, `theta_int`, and time values.

Pages 101, 172, 519, 520, 521, and 522 were rendered locally from the source PDF and visually checked before fixture extraction.

## Example Selected

Fixture 005 selects the Anexa B school ventilation summary because it is the first MC001 example with:

- explicit ventilation airflow;
- displayed `Hve`;
- natural exterior-air ventilation context;
- monthly `Qve` outputs and the displayed monthly temperatures/hours needed by relation (2.29).

It does not contain an ACH value or a heated volume value, so `calculateAirflowFromACH()` cannot be validated without invented inputs.

## Extracted Inputs

### Airflow And Hve

| Input/output | MC001 value | Unit | Source |
| --- | ---: | --- | --- |
| Useful/reference area `Ause,zi` | 1369.4 | m2 | page 520 |
| Ventilation airflow `q` | 5474.6 | m3/h | page 520 |
| Indoor heating temperature | 20.0 | degC | pages 520 and 522 |
| Dynamic correction factor `fve,dyn` | 1 | - | relation (2.30), page 101: monthly calculation uses `fve,dyn = 1` |
| Ventilation source | exterior/natural ventilation | - | page 519 |
| Displayed `Hve` | 1806.62 | W/K | page 520 |

The displayed `Hve` and airflow imply an effective volumetric heat-capacity convention:

`1806.62 W/K / 5474.6 m3/h = 0.3300003653 Wh/(m3K)`, displayed as `0.33 Wh/(m3K)`.

The executable Hve check uses this source-implied `0.33 Wh/(m3K)` convention, converted to `1188 J/(m3K)`, because the Anexa B page 520 table does not independently display `rhoA` and `ca`.

### Page 172 Constants Comparison

Page 172 contains AHU equipment constants:

| Constant | MC001 value | Unit |
| --- | ---: | --- |
| `rhoA` | 1.204 | kg/m3 |
| `ca` | 0.00028 | kWh/(kgK) |

Those constants calculate `1845.597152 W/K` for page 520 `q = 5474.6 m3/h`, which does not match the Anexa B displayed `Hve = 1806.62 W/K`. The test logs this mismatch but does not use it as the pass criterion.

## Extracted Monthly Qve Values

| Month | Hours | theta_e | theta_int | Expected bve | Expected QH;ve;cont |
| --- | ---: | ---: | ---: | ---: | ---: |
| Jan | 744 | -0.47 | 20.00 | 1.00 | 27508.1 |
| Feb | 672 | 2.11 | 20.00 | 1.00 | 21716.3 |
| Mar | 744 | 7.17 | 20.00 | 1.00 | 17240.0 |
| Apr | 720 | 12.85 | 20.00 | 1.00 | 9298.7 |
| Mai | 744 | 20.19 | 20.00 | 1.00 | -253.6 |
| Iun | 720 | 23.05 | 20.00 | 1.00 | -3966.7 |
| Iul | 744 | 25.42 | 20.00 | 1.00 | -7282.2 |
| Aug | 744 | 24.68 | 20.00 | 1.00 | -6293.1 |
| Sep | 720 | 18.61 | 20.00 | 1.00 | 1813.5 |
| Oct | 744 | 12.91 | 20.00 | 1.00 | 9524.0 |
| Noi | 720 | 7.62 | 20.00 | 1.00 | 16106.7 |
| Dec | 744 | 1.36 | 20.00 | 1.00 | 25060.0 |

## Assumptions

- Supply air is treated as exterior air because page 519 says ventilation is natural and by infiltration/opening windows from outside.
- Therefore relation (2.31) gives `bve = 1` for every month because `theta_supply = theta_external`.
- The page 520 `Hve` calculation uses the source-implied `0.33 Wh/(m3K)` convention. This validates the calculator's unit conversion and multiplication path, but it is not an independent validation of a separately displayed `rhoA * ca` pair.
- Page 522 monthly temperatures and hours are explicit MC001 example values, not fallback climate data.

## Blocked Rows And Reasons

- `calculateAirflowFromACH()` is blocked because no ACH value and no heated volume are displayed for this example.
- `calculateBveFromUnconditionedZone()` is blocked because no `bztu` value or unconditioned-zone ventilation source is provided.
- Independent `rhoA * ca` validation for page 520 `Hve` is blocked because Anexa B does not display the constants used to produce `1806.62 W/K`.
- Fan/AHU/ventilation electricity is blocked because page 519 says there is no mechanical ventilation and the required fan/AHU fields are not part of this fixture.

## Verification Notes

- `bve` tolerance: exact floating-point tolerance only.
- `Hve` tolerance: absolute `0.01 W/K` for the source-implied `0.33 Wh/(m3K)` path.
- Page 172 constants comparison is logged with no pass assertion against the Anexa B Hve value.
- Monthly `QH;ve;cont` tolerance: absolute `6.5 kWh`, because page 522 displays rounded temperatures and monthly values.
- No climate fallback, HDD fallback, online weather data, or invented ACH was used.
