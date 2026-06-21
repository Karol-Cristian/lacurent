# EXTRACT - Heating Period Boundary Method

## Status

- Investigation id: `INVESTIGATION_002_HEATING_PERIOD_BOUNDARY_FORMULA`
- Scope: MC001 section 2.11, related heating-period context, Anexa B page 522.
- Extraction status: boundary duration method extracted; boundary-month `QH;nd` formula is not separately specified by MC001 section 2.11.
- Fix classification: `MC001_SOURCE_CONFLICT`; see `INVESTIGATION_002_HEATING_PERIOD_BOUNDARY_FORMULA.md` for the deeper trace.
- Physics Engine formula change supported: no.

## Source Pages Inspected

- MC001-2022 page 113: section 2.7.6, gain utilization factor for heating, `gammaH`, `aH`, `tauH`.
- MC001-2022 page 116: relations (2.57) and (2.58), zone time constant.
- MC001-2022 page 117: section 2.8.1, constant setpoint heating/cooling.
- MC001-2022 page 120: Figure 2.18 monthly useful heating need.
- MC001-2022 page 121: long non-occupation interpolation context.
- MC001-2022 pages 125-126: section 2.11 simplified heating/cooling period duration.
- MC001-2022 pages 521-522: Anexa B example inputs, heating-period graph, `TIMP [ZILE]`, and monthly `QH;nd`.

## Extracted Boundary Duration Method

MC001 section 2.11 recommends the equilibrium-temperature method when national data based on the average climate year are not available.

The method defines the exterior equilibrium temperature `theta_emz` as the exterior temperature at which internal and solar gains are equal to transfer losses by transmission and ventilation, calculated with the indoor calculation temperature for heating or cooling.

Relation (2.87):

```text
theta_emz = theta_i - eta_l * Q_surse,z / (H_T * t_z)
```

where:

- `theta_i` is the indoor calculation temperature for conditioning.
- `Q_surse,z` is the solar energy, including `Qsky`, plus internal gains for an average day in the relevant start/end season month, in `kWh`.
- `H_T` is the total heat-loss/heat-gain coefficient of the room, in `kW/K`, determined from transmission and ventilation coefficients.
- `eta_l` is the utilization factor. For heating, MC001 page 126 states it is calculated for `lambda = 1`; for cooling it is the heat-transfer utilization factor.
- `t_z` is the duration of one day, `24 h`.

The calculated `theta_emz` values are plotted with the monthly mean exterior temperatures. The intersections between the `theta_emz` curve and the straight lines connecting monthly mean exterior temperatures mark the beginning or end of heating/cooling periods. The graph must be drawn to scale so the abscissa can be read as a number of days.

MC001 page 126 also states that the duration of the heating/cooling season is considered the operating time for seasonal devices, such as heating-system pumps and cooling-system fans.

## Extracted Anexa B Boundary Days

Anexa B page 522 provides a worked heating-period graph and a `TIMP [ZILE]` table:

| Month | theta_e | theta_int | theta_emz | TIMP [ZILE] |
| --- | ---: | ---: | ---: | ---: |
| Iul | 25.42 | 20.00 | 15.15 | 0.00 |
| Aug | 24.68 | 20.00 | 15.78 | 0.00 |
| Sep | 18.61 | 20.00 | 18.50 | 0.01 |
| Oct | 12.91 | 20.00 | 13.63 | 31.00 |
| Noi | 7.62 | 20.00 | 10.66 | 30.00 |
| Dec | 1.36 | 20.00 | 10.27 | 31.00 |
| Ian | -0.47 | 20.00 | 8.67 | 31.00 |
| Feb | 2.11 | 20.00 | 7.97 | 28.00 |
| Mar | 7.17 | 20.00 | 9.70 | 31.00 |
| Apr | 12.85 | 20.00 | 13.33 | 1.15 |
| Mai | 20.19 | 20.00 | 19.96 | 0.00 |
| Iun | 23.05 | 20.00 | 17.30 | 0.00 |

April and September are therefore boundary months with fractional heating duration. October is a full heating month.

## Observed Boundary-Month Table Behavior

The page 522 detailed table contains both continuous monthly heat-transfer values and heating-period-adjusted values.

For April and September, the displayed adjusted `QH;tr`, `QH;ve`, `QH;sol`, `QH;int`, and `QH;gn` rows are consistent with scaling full-month values by the fractional heating days from `TIMP [ZILE]`.

Examples:

| Month | Continuous `QH;ht` | Heating days | Displayed adjusted `QH;ht` | Approximate scaling check |
| --- | ---: | ---: | ---: | ---: |
| Apr | 18841 | 1.15 / 30 | 724 | `18841 * 1.15 / 30 ~= 722` |
| Sep | 3980 | 0.01 / 30 | 2 | very small value, rounded in the displayed table |

However, the displayed `QH;nd` values are not reproduced by applying Figure 2.18 to the adjusted rows:

| Month | Adjusted `QH;ht` | Adjusted `QH;gn` | `gammaH` | `etaH;gn` | Figure 2.18 branch result | Standard balance using adjusted rows | Displayed `QH;nd` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Apr | 724 | 2247 | 3.11 | 0.30 | 0 | 49.9 | 1204.1 |
| Sep | 2 | 22 | 13.63 | 0.07 | 0 | 0.46 | 14.3 |
| Oct | 19085 | 48532 | 2.54 | 0.36 | 0 | 1613.48 | 1667.9 |

For April and September, the displayed `QH;nd` values are closer to a standard monthly balance using continuous/full-month values and the utilization-factor formula, without applying the `gammaH > 2.0 -> 0` branch. October is a full heating month and shows the same conflict more directly: Figure 2.18 gives zero, while the worked example gives a positive value close to the standard balance.

`INVESTIGATION_002_HEATING_PERIOD_BOUNDARY_FORMULA.md` reconstructs the Anexa B Apr/Sep/Oct values more closely from the continuous/full-month columns and Figure 2.14's utilization-factor formula, while bypassing Figure 2.18's `gammaH > 2.0 -> QH;nd = 0` branch. This remains diagnostic only, because section 2.11 defines the season-duration method but does not provide an equation that overrides Figure 2.18.

## Missing Values Or Rules

The following are not fully specified by the inspected source pages:

- An algebraic replacement for the graphical day-reading process in Figure 2.21.
- A boundary-month `QH;nd` equation using fractional heating days.
- A rule saying whether `QH;nd` in boundary months must use continuous full-month values or heating-period-adjusted values.
- A rule overriding Figure 2.18's `gammaH > 2.0 -> QH;nd = 0` branch.

## Fix Decision

Classification: `MC001_SOURCE_CONFLICT`.

Reason:

- Section 2.11 clearly supports calculating heating-period duration and fractional heating days.
- Section 2.11 does not clearly define a separate boundary-month `QH;nd` formula.
- Figure 2.18 explicitly states the `gammaH > 2.0 -> QH;nd = 0` branch.
- Anexa B page 522 displays positive `QH;nd` for April, September, and October while `gammaH > 2.0`.
- October is not a boundary month, so the discrepancy cannot be explained only by the section 2.11 boundary-period method.

Therefore, no Physics Engine formula change is implemented from this extraction. Fixture 006 should keep April, September, and October blocked as MC001 source-conflict rows unless a later reviewed source resolves the Figure 2.18 conflict.
