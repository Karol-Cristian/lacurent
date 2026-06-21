# FIXTURE 006 - Heating Need Table Summary

## Status

- Fixture id: `FIXTURE_006_HEATING_NEED_TABLE_SUMMARY`
- Source candidate: `MC001_EX_B_HEATING_MONTHLY_GAINS`
- Executable: yes, for displayed monthly `QH;ht`, `QH;gn`, helper-compatible `QH;nd` rows, and the displayed annual `QH;nd` sum.
- Partially blocked: April, September, and October monthly `QH;nd` rows are not asserted against `calculateMonthlyHeatingNeed()` because Anexa B page 522 conflicts with Figure 2.18. `INVESTIGATION_002_HEATING_PERIOD_BOUNDARY_FORMULA.md` shows that Apr/Sep can be diagnostically reconstructed from continuous/full-month columns, but only by bypassing Figure 2.18's `gammaH > 2 -> QH;nd = 0` branch. October has the same branch conflict without the boundary-month complication.
- Validated module: `monthlyBalance.mjs`
- Scope exclusions: no new formula logic, no production integration, no climate fallback, no UI, no workers, no DB/schema, no deploy, no push.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 section 2.7.1, Figure 2.10: monthly total heat transfer.
- MC001-2022 section 2.7.2, Figure 2.13: monthly total gains.
- MC001-2022 section 2.8.1, Figure 2.18: useful heating need.
- MC001-2022 section 2.10, relation (2.84): annual heating need sum.
- MC001-2022 section 2.11, relation (2.87) and Figure 2.21: simplified heating-period duration.
- Anexa B page 522: `Necesar de incalzire [kWh]` summary and detailed monthly heating-need table.
- Boundary/source-conflict investigation: `docs/mc001-validation/INVESTIGATION_002_HEATING_PERIOD_BOUNDARY_FORMULA.md`.

Page 522 was rendered locally from the source PDF and visually checked before fixture extraction.

## Example Selected

Fixture 006 selects the Anexa B monthly heating-need table because Fixtures 004 and 005 already validate the adjacent monthly transmission and ventilation rows, and page 522 is the first reviewed MC001 example that exposes:

- monthly `QH;tr` and `QH;ve`;
- monthly `QH;ht`;
- monthly internal and solar gains;
- monthly `QH;gn`;
- displayed `gammaH`, `etaH;gn`, and `QH;nd`;
- displayed annual `QH;nd` total.

The detailed table includes one leading duplicate `Dec` row for heating-period continuity. The executable fixture uses the 12 calendar rows `Ian` through `Dec` and excludes the leading duplicate.

## Extracted Inputs And Expected Outputs

Values below are the heating-period-adjusted rows from the detailed page 522 table unless noted.

| Month | QH;tr | QH;ve | Expected QH;ht | QH;sol | QH;int | Expected QH;gn | gammaH | etaH;gn | Expected QH;nd |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Ian | 26942 | 27508 | 54450 | 33163 | 6480 | 39643 | 0.73 | 0.78 | 23478.5 |
| Feb | 21371 | 21716 | 43087 | 37764 | 6480 | 44244 | 1.03 | 0.67 | 13379.8 |
| Mar | 17165 | 17240 | 34405 | 46059 | 8640 | 54699 | 1.59 | 0.51 | 6248.9 |
| Apr | 366 | 357 | 724 | 2082 | 166 | 2247 | 3.11 | 0.30 | 1204.1 |
| Mai | 0 | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.00 | 0.0 |
| Iun | 0 | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.00 | 0.0 |
| Iul | 0 | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.00 | 0.0 |
| Aug | 0 | 0 | 0 | 0 | 0 | 0 | 0.00 | 0.00 | 0.0 |
| Sep | 1 | 1 | 2 | 20 | 2 | 22 | 13.63 | 0.07 | 14.3 |
| Oct | 9561 | 9524 | 19085 | 39892 | 8640 | 48532 | 2.54 | 0.36 | 1667.9 |
| Noi | 15870 | 16107 | 31977 | 33923 | 8640 | 42563 | 1.33 | 0.58 | 7272.5 |
| Dec | 24536 | 25060 | 49596 | 26516 | 6480 | 32996 | 0.67 | 0.81 | 22986.3 |

Expected annual `QH;nd`: `76252.3 kWh`.

## Assumptions

- `gammaH` is consumed as a displayed source input. There is no target gamma calculator in this fixture.
- `etaH;gn` is consumed as displayed to two decimals. Heating-need assertions for compatible rows use a wider tolerance because the table displays rounded utilization factors.
- `QH;tr`, `QH;ve`, `QH;ht`, `QH;sol`, `QH;int`, and `QH;gn` are taken from the heating-period-adjusted columns, not the earlier `cont` columns.
- The page 522 top summary provides decimal `QH;nd` values; the detailed row displays integer-rounded `QH;nd` values. The executable fixture uses the top summary decimals as expected monthly outputs.
- Page 522 marks April and September as fractional heating-period boundary months using `TIMP [ZILE]`. The displayed Anexa B `QH;nd` values can be diagnostically reconstructed from continuous/full-month columns and Figure 2.14's eta formula, but this path bypasses Figure 2.18's explicit `gammaH > 2 -> QH;nd = 0` branch.
- October is a full heating month. Its positive displayed `QH;nd` with `gammaH > 2` confirms that the mismatch is not only a boundary-period issue.

## Blocked Rows And Reasons

| Row | Reason |
| --- | --- |
| Leading `Dec` row | Duplicated continuity row in the detailed table; excluded from the 12-month annual sum. |
| Continuous `QH;tr;cont`, `QH;ve;cont`, `QH;ht;cont` rows | Some months contain negative continuous heat-transfer values; the target `calculateMonthlyTotalHeatTransfer()` helper validates non-negative adjusted monthly inputs. |
| `Apr`, `Sep` heating need | Boundary months with fractional heating days. Anexa B appears to use continuous/full-month columns and bypass Figure 2.18's `gammaH > 2` zero branch; this is blocked as an MC001 source conflict. |
| `Oct` heating need | Full heating month. Source displays positive `QH;nd` while displayed `gammaH > 2`; Figure 2.18 and the existing helper return zero for `gammaH > 2`. This is blocked as an MC001 source conflict. |
| Exact heating need with displayed `etaH;gn` | `etaH;gn` is rounded to two decimals in the source table, so helper-compatible rows cannot be exact to decimal `QH;nd` values. |

## Verification Notes

- `QH;ht` tolerance: absolute `1.1 kWh`, to allow the April rounded row (`366 + 357 = 723`, displayed `724`).
- `QH;gn` tolerance: absolute `1.1 kWh`, to allow the April rounded row (`2082 + 166 = 2248`, displayed `2247`).
- `QH;nd` compatible-row tolerance: absolute `300 kWh`, because displayed `etaH;gn` is rounded to two decimals.
- Zero-row `QH;nd` tolerance: absolute `0.1 kWh`.
- Source-conflict diagnostic tolerance: per-row absolute tolerances documented in the executable fixture data. These diagnostics are not assertions against `calculateMonthlyHeatingNeed()`.
- Annual `QH;nd` tolerance: absolute `0.01 kWh`.
- No climate fallback, hidden utilization-factor reconstruction, or invented monthly inputs were used.
