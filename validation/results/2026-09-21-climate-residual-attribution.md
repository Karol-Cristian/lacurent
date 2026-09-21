# LaCurent validation campaign — climate and residual attribution snapshot

Date: 2026-09-21  
Branch: `analysis/pbe-vertical-validation-20260920`  
Production touched: **no**

## Main result

The large Light-vs-PyBuildingEnergy annual heating-demand differences seen in the raw comparison are predominantly explained by **different climate inputs**, not by a gross error in the LaCurent monthly heat-balance implementation.

### Raw climate comparison

Batch 1, using LaCurent MC001 monthly climate versus native PVGIS/PBE hourly climate:

- 15 independent demand cases
- median absolute delta: 15.4%
- P90: 28.7%
- maximum: 40.5%

### Temperature-normalized comparison

Batch 1b, with each PBE monthly dry-bulb mean shifted to the exact MC001 monthly temperature used by LaCurent:

- median absolute delta: 8.4%
- P90: 17.1%
- maximum: 19.2%
- 13/15 cases within 15%
- 0 cases above 25%

This showed that dry-bulb climate mismatch explained a large fraction of the original disagreement.

### Solar-climate attribution

Batch 1f compared MC001 A.9.6 monthly irradiation with native PVGIS/PBE plane irradiation after temperature normalization.

Examples for south-facing vertical irradiation:

- București: MC001 881.4 vs PVGIS/PBE 1088.4 kWh/m²/year (+23.5%)
- Cluj-Napoca: 837.2 vs 1038.8 (+24.1%)
- Brașov: 815.9 vs 1101.2 (+35.0%)

Monthly differences are larger in several shoulder months. This is especially material in low-load / HRV cases because solar gains can switch hourly heating demand off.

### Temperature + solar normalized comparison

Batch 1h retained the PBE hourly profile, but normalized:
1. monthly dry-bulb mean to the exact MC001 monthly temperature; and
2. monthly plane irradiation NV/EV/SV/WV/HOR to the corresponding MC001 A.9.6 Hsol.

Results across all 15 E/R/H cases:

- median absolute delta: **1.58%**
- mean absolute delta: **1.99%**
- P90: **3.57%**
- maximum: **3.99%**
- PASS / REVIEW / INVESTIGATE: **15 / 0 / 0**

Case results:

| Case | Light kWh | PBE normalized kWh | Delta |
|---|---:|---:|---:|
| București E | 14490.1 | 14312.3 | -1.23% |
| București R | 8629.0 | 8911.5 | +3.27% |
| București H | 4259.7 | 4209.8 | -1.17% |
| Constanța E | 12060.5 | 11895.3 | -1.37% |
| Constanța R | 7027.7 | 7278.6 | +3.57% |
| Constanța H | 3215.9 | 3250.1 | +1.06% |
| Cluj E | 17385.3 | 17164.9 | -1.27% |
| Cluj R | 10444.0 | 10798.6 | +3.40% |
| Cluj H | 5294.6 | 5318.8 | +0.46% |
| Brașov E | 18853.6 | 18659.9 | -1.03% |
| Brașov R | 11329.0 | 11780.6 | +3.99% |
| Brașov H | 5725.9 | 5816.3 | +1.58% |
| Miercurea Ciuc E | 22710.8 | 22324.6 | -1.70% |
| Miercurea Ciuc R | 13758.2 | 14184.5 | +3.10% |
| Miercurea Ciuc H | 7136.4 | 7256.0 | +1.68% |

## HRV residual attribution

Batch 1c established that PBE receives exactly the same Hve as LaCurent. Therefore the HRV residual is not caused by a mismatch in the ventilation heat-transfer coefficient.

At HRV 80%, temperature-normalized only:

- București baseline delta -17.1%
- Cluj -14.5%
- Brașov -19.2%

Removing transmitted-window solar collapsed the residual to:

- București +1.1%
- Cluj +2.9%
- Brașov +3.4%

Removing internal and solar gains together gave:

- București +2.6%
- Cluj +5.5%
- Brașov +4.8%

The largest monthly residuals were concentrated in shoulder months (especially October and November, plus March/April depending on location), consistent with different monthly gain-utilization versus hourly on/off dynamics.

## Opaque solar and floor checks

PBE opaque-surface solar absorption contributed materially to the PBE balance, especially walls and roof, but it did not explain the original residual by itself.

For București HRV80, disabling all PBE opaque-surface solar absorption changed PBE heating from 3532.9 to 3941.4 kWh and reduced the Light delta from -17.1% to -7.5%.

Floor removal changed the residual only partially in the focused diagnostic, so floor/ground treatment is a secondary rather than dominant explanation for the original large disagreement.

## Current interpretation

The evidence supports the following attribution:

1. **Dry-bulb climate mismatch** — major contributor.
2. **Solar irradiation dataset mismatch** — major contributor, especially in efficient/HRV buildings and shoulder months.
3. **Monthly vs hourly utilization/dynamics** — residual contributor once climate inputs are aligned.
4. **Opaque-surface solar and ground/floor treatment** — secondary contributors.
5. **HRV Hve arithmetic** — not a source of disagreement in the current adapter; Hve is identical by construction.
6. **Internal-gain annual quantity** — matched closely; remaining difference is utilization/timing rather than annual gain amount.

## Guardrail

Batch 1h is an **input-isolation experiment**, not proof that either MC001 climate or PVGIS climate is the better representation of a real building year. It shows that when both engines receive equivalent monthly temperature and solar climate, the monthly LaCurent demand method and hourly PBE model agree within roughly 0.5–4.0% for the tested envelope/HRV cases.

The next validation stages must therefore distinguish:
- method correctness,
- climate-data representativeness,
- real-world empirical accuracy.

No production change is justified solely from these normalization experiments.
