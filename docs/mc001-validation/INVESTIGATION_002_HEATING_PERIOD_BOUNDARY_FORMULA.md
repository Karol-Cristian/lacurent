# INVESTIGATION 002 - Heating Period Boundary Formula

## Status

- Investigation id: `INVESTIGATION_002_HEATING_PERIOD_BOUNDARY_FORMULA`
- Scope: MC001 2.7.6, 2.8.1, Figure 2.18, `tauH`, `aH`, heating-period boundary logic, and Fixture 006 April/September/October mismatch.
- Target module: `src/physics-engine/monthlyBalance.mjs`
- Root cause classification: `MC001_SOURCE_CONFLICT`
- Secondary fixture finding: Fixture 006's previous Apr/Sep explanation mixed adjusted rows with QH;nd values that Anexa B appears to calculate from continuous/full-month rows.
- Confidence: high for the source conflict; medium-high for the Anexa B reconstruction path because some source values are rounded in the displayed table.
- Physics Engine formula change required: no.

## MC001 References Inspected

| Page | Section/source | Evidence |
| --- | --- | --- |
| 113 | 2.7.6, Figure 2.14 | `gammaH = QH;gn / QH;ht`; utilization-factor branches for `etaH;gn`; `aH` relation (2.55). |
| 116 | Relations (2.57), (2.58) | `tauH` and `tauC` time-constant equations. |
| 117 | 2.8.1 | Constant setpoint heating/cooling; intermittent reduction factor equals 1 for constant setpoint. |
| 120 | 2.8.1, Figure 2.18 | Monthly useful heating need branch table, including explicit `gammaH > 2.0 -> QH;nd = 0`. |
| 121 | Relations (2.76), (2.77) | Long non-occupation interpolation branch; not applicable to the Anexa B school table rows. |
| 125 | 2.11, relation (2.87) | Equilibrium-temperature method for heating/cooling period duration. |
| 126 | 2.11, Figure 2.21 | Graphical heating-period start/end day reading; seasonal device operating time note. |
| 521 | Anexa B | Adjacent heat-transfer, internal-gain, and solar-gain context. |
| 522 | Anexa B | Heating need table, continuous columns, adjusted columns, `tauH`, `aH`, `etaH;gn`, `QH;nd`, and `TIMP [ZILE]`. |
| 523 | Anexa B | Downstream heating energy context. |

Rendered page images were used locally for visual inspection. The committed evidence below uses quoted table snippets and transcribed formulas so the repository does not keep temporary render artifacts.

## Extracted Formulas

### Gamma

From Figure 2.14:

```text
gammaH;ztc;m = QH;gn;ztc;m / QH;ht;ztc;m
```

where `QH;ht` is total heat transfer for heating and `QH;gn` is total heat gains for heating.

### tauH

From relation (2.57):

```text
tauH;ztc;m =
  (Cm;eff;ztc / 3600)
  / (HH;tr(excl.grflr);ztc;m + HH;gr;adj;ztc + HH;ve;ztc;m)
```

### aH

From relation (2.55):

```text
aH;ztc;m = aH;0 + tauH;ztc;m / tauH;0
```

with:

```text
aH;0 = 1
tauH;0 = 15 h
```

### etaH;gn

From Figure 2.14:

| Condition | Formula |
| --- | --- |
| `gammaH > 0` and `gammaH != 1` | `etaH;gn = (1 - gammaH^aH) / (1 - gammaH^(aH + 1))` |
| `gammaH = 1` | `etaH;gn = aH / (aH + 1)` |
| `gammaH <= 0` and `QH;gn > 0` | Figure 2.14 routes to `etaH;gn = 1 / gammaH`. |
| `gammaH < 0` and `QH;gn <= 0` | Figure 2.14 routes to `etaH;gn = 1`. |

Only the first branch matters for Apr/Sep/Oct because all three have positive `gammaH > 2`.

### Monthly Heating Need

From Figure 2.18:

| Condition | Formula/result |
| --- | --- |
| `gammaH <= 0` and `QH;gn > 0` | `QH;nd = 0` |
| `gammaH > 2.0` | `QH;nd = 0` |
| otherwise | `QH;nd = QH;ht - etaH;gn * QH;gn` |

Figure 2.18 does not contain a `gammaH = 1` special branch; that branch belongs to the utilization factor in Figure 2.14. Figure 2.18 also does not define a separate partial-month or heating-period boundary equation.

### Heating-Period Boundary Method

Section 2.11 defines a simplified graphical duration method. The equilibrium exterior temperature is:

```text
theta_emz = theta_i - eta_l * Q_surse,z / (H_T * t_z)
```

The calculated equilibrium temperatures are plotted against monthly mean exterior temperatures. The intersections with the monthly exterior-temperature line mark the beginning/end of heating/cooling periods, and the graph is read to scale as a number of days.

Section 2.11 does not give an explicit monthly `QH;nd` equation for partial heating months and does not state that Figure 2.18's `gammaH > 2.0 -> 0` branch is suspended in boundary months.

## Anexa B Page 522 Source Snippets

Heating-period duration table:

| Month | theta_e | theta_int | theta_emz | TIMP [ZILE] |
| --- | ---: | ---: | ---: | ---: |
| Sep | 18.61 | 20.00 | 18.50 | 0.01 |
| Oct | 12.91 | 20.00 | 13.63 | 31.00 |
| Apr | 12.85 | 20.00 | 13.33 | 1.15 |

Detailed heating table columns relevant to the mismatch:

```text
Luna, Ore,
QH;tr;cont, QH;ve;cont, QH;ht;cont,
tauH,
QH;sol, Qr, QH;sol, QH;int, QH;gn,
QH;tr, QH;ve, QH;ht,
gammaH;gn;cont, gammaH, aH, etaH;gn, QH;nd
```

The table therefore has both continuous/full-month transfer columns and heating-period-adjusted columns.

## Figure 2.18 Branch Table

| Case | Explicit in Figure 2.18? | Engine behavior | Notes |
| --- | --- | --- | --- |
| `gammaH <= 0` and `QH;gn > 0` | yes | returns `0` | matches source branch. |
| `gammaH = 1` | no | standard branch if not caught by other conditions | special handling belongs to Figure 2.14 `etaH;gn`, not Figure 2.18. |
| `0 < gammaH <= 2` | implicit `otherwise` | `QH;ht - etaH;gn * QH;gn` | matches source branch. |
| `gammaH > 2` | yes | returns `0` | matches Figure 2.18; conflicts with Anexa B Apr/Sep/Oct displayed `QH;nd`. |
| heating-period start/end months | no | no special branch | section 2.11 only gives duration method. |
| partial-month correction for `QH;nd` | no | no special branch | no extracted normative equation. |

## Apr/Sep/Oct Trace Table

Values are transcribed from Anexa B page 522. `QH;tr`, `QH;ve`, `QH;ht`, `QH;sol`, `QH;int`, and `QH;gn` are the adjusted displayed columns. `QH;ht;cont`, `tauH`, and `aH` are the continuous/full-month diagnostic columns from the same page.

| Month | Row type | QH;tr | QH;ve | QH;ht | QH;int | QH;sol | QH;gn | gammaH | tauH | aH | eta displayed | MC001 QH;nd | Current helper | Current branch |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Apr | boundary partial month, `TIMP = 1.15` days | 366 | 357 | 724 | 166 | 2082 | 2247 | 3.11 | 16.7 | 2.11 | 0.30 | 1204.1 | 0 | `gammaH > 2` |
| Sep | boundary partial month, `TIMP = 0.01` days | 1 | 1 | 2 | 2 | 20 | 22 | 13.63 | 16.9 | 2.13 | 0.07 | 14.3 | 0 | `gammaH > 2` |
| Oct | full heating month, `TIMP = 31` days | 9561 | 9524 | 19085 | 8640 | 39892 | 48532 | 2.54 | 17.0 | 2.14 | 0.36 | 1667.9 | 0 | `gammaH > 2` |

Diagnostic values:

| Month | QH;ht;cont | QH;gn;cont derived from `gammaH * QH;ht;cont` | eta from Figure 2.14 using displayed `gammaH`/`aH` | Adjusted-row basic formula | Continuous-row diagnostic formula | Delta vs MC001 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Apr | 18841 | 58595.51 | 0.301033 | 49.90 | 1201.81 | -2.29 |
| Sep | 3980 | 54247.40 | 0.073107 | 0.46 | 14.14 | -0.16 |
| Oct | 19085 | 48475.90 | 0.359391 | 1613.48 | 1663.19 | -4.71 |

The continuous-row diagnostic formula is:

```text
QH;nd;diagnostic = QH;ht;cont - etaH;gn(figure 2.14) * (gammaH * QH;ht;cont)
```

This is diagnostic only. It reproduces Anexa B closely, but it is not the Figure 2.18 heating-need branch because Figure 2.18 explicitly sets `QH;nd = 0` when `gammaH > 2.0`.

## Reconstruction Attempts

| Attempt | Inputs | Formula | Apr result/delta | Sep result/delta | Oct result/delta | Normative? |
| --- | --- | --- | ---: | ---: | ---: | --- |
| 1. Displayed adjusted rows and displayed eta | adjusted `QH;ht`, adjusted `QH;gn`, displayed `etaH;gn` | `QH;ht - eta * QH;gn` | `49.90`, delta `-1154.20` | `0.46`, delta `-13.84` | `1613.48`, delta `-54.42` | diagnostic; not Figure 2.18 because branch is bypassed |
| 2. Displayed adjusted rows and eta reconstructed from Figure 2.14 | adjusted `QH;ht`, adjusted `QH;gn`, displayed `gammaH/aH` | `QH;ht - eta(gamma,a) * QH;gn` | `47.58`, delta `-1156.52` | `0.39`, delta `-13.91` | `1643.02`, delta `-24.88` | diagnostic; not Figure 2.18 because branch is bypassed |
| 3. Current helper | adjusted rows, displayed `gammaH/etaH;gn` | Figure 2.18 branch | `0`, delta `-1204.10` | `0`, delta `-14.30` | `0`, delta `-1667.90` | yes for Figure 2.18 |
| 4. Continuous/full-month diagnostic rows and eta reconstructed from Figure 2.14 | `QH;ht;cont`, `gammaH * QH;ht;cont`, displayed `gammaH/aH` | `QH;ht;cont - eta(gamma,a) * QH;gn;cont` | `1201.81`, delta `-2.29` | `14.14`, delta `-0.16` | `1663.19`, delta `-4.71` | diagnostic Anexa B reconstruction; conflicts with Figure 2.18 |

## Implied Eta Check

If the displayed Anexa B `QH;nd` is forced through the adjusted-row balance, Apr/Sep imply impossible negative utilization factors:

| Month | Implied eta from adjusted rows |
| --- | ---: |
| Apr | `-0.213663` |
| Sep | `-0.559091` |
| Oct | `0.358879` |

If the displayed Anexa B `QH;nd` is forced through the continuous/full-month diagnostic balance, the implied eta values match Figure 2.14/displayed eta:

| Month | Implied eta from continuous diagnostic rows |
| --- | ---: |
| Apr | `0.300994` |
| Sep | `0.073104` |
| Oct | `0.359294` |

This proves that the previous Fixture 006 Apr/Sep explanation was incomplete: the boundary-month rows were paired with adjusted columns, while the displayed Anexa B `QH;nd` appears to be produced from continuous/full-month balance columns.

## Root Cause Decision

Classification: `MC001_SOURCE_CONFLICT`.

Reason:

- `monthlyBalance.mjs` matches the extracted Figure 2.18 branch table, including `gammaH > 2.0 -> QH;nd = 0`.
- Anexa B page 522 displays positive `QH;nd` for Apr/Sep/Oct while the same table displays `gammaH > 2.0`.
- Apr/Sep can be diagnostically reconstructed only by using continuous/full-month columns and bypassing the Figure 2.18 zero branch.
- Oct is a full heating month, so its positive `QH;nd` cannot be explained by boundary-month duration logic.
- MC001 section 2.11 defines how to read heating-season duration, but it does not define a replacement `QH;nd` formula and does not override Figure 2.18.

Secondary classification for Fixture 006 documentation: `FIXTURE_ASSUMPTION_ERROR`.

Reason:

- The prior Fixture 006 blocked Apr/Sep as if only a missing boundary-month equation were involved.
- The deeper trace shows the Anexa B spreadsheet/table likely uses continuous/full-month balance columns for `QH;nd`, while the fixture explanatory text emphasized adjusted columns.
- The fixture remains valid as a partial fixture because Apr/Sep/Oct were not strictly asserted against `calculateMonthlyHeatingNeed()`.

## Patch Decision

No production formula patch is supported.

`monthlyBalance.mjs` is not proven wrong because it follows Figure 2.18 exactly. Removing `gammaH > 2.0 -> 0` would make Anexa B Apr/Sep/Oct closer, but it would contradict the normative formula figure currently extracted from MC001.

Fixture 006 should be updated only to:

- classify Apr/Sep/Oct as MC001 source-conflict rows;
- retain the current helper comparison as blocked;
- add diagnostic reconstruction coverage documenting the Anexa B continuous-column path;
- avoid asserting Apr/Sep/Oct as executable monthlyBalance expectations.

## Validation Policy

| Month | Recommended handling |
| --- | --- |
| Apr | blocked; may be logged in diagnostic source-conflict reconstruction; do not assert against `calculateMonthlyHeatingNeed()`. |
| Sep | blocked; may be logged in diagnostic source-conflict reconstruction; do not assert against `calculateMonthlyHeatingNeed()`. |
| Oct | blocked as direct Figure 2.18 vs Anexa B source conflict; do not assert against `calculateMonthlyHeatingNeed()`. |

Do not move these rows into a separate executable boundary fixture until MC001 errata or a higher-priority source resolves the Figure 2.18 conflict.

## Recommendation Before Fixture 007

Ready to continue to Fixture 007 only with Apr/Sep/Oct kept blocked in Fixture 006. Fixture 007 must not depend on resolving these monthlyBalance source conflicts.

## Tests Run

```text
node src/physics-engine/tests/validation/fixture006HeatingNeedTableSummary.validation.test.mjs
node src/physics-engine/tests/monthlyBalance.test.mjs
node src/physics-engine/tests/validation/mc001Examples.validation.test.mjs
```

All passed.

Final statement: no formula change made.
