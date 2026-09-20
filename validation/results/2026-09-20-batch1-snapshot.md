# Validation campaign snapshot — 2026-09-20

Analysis branch: `analysis/pbe-vertical-validation-20260920`  
Frozen production source: `e8d5c00e01f68acb72f66e255168710caeb18e47`  
PBE commit: `32ff8648312fc4cd0ac4e963464ee956a7c47d2d`  
Production touched: **no**

## Batch 0 — corrected reference chain

PBE adapter internal gains were aligned to LaCurent's 2.4 W/m² residential value.

| State | PBE vs Light useful heat |
|---|---:|
| Existing gas | -7.0% |
| Renovated envelope gas | -3.8% |
| Renovated + HRV gas | -13.1% |
| Renovated + HRV + HP | -13.1% |

The earlier large discrepancy was an adapter issue, not a LaCurent engine finding.

## Batch 1 — five climate zones, raw PVGIS vs MC001

15 independent building-demand cases plus 5 heat-pump system-switch rows.

Aggregate:
- median absolute useful-demand delta: **15.4%**
- P90 absolute delta: **28.7%**
- maximum absolute delta: **40.5%**
- PASS / REVIEW / INVESTIGATE: **6 / 4 / 5**

Largest raw mismatches:
- București HRV: -40.5%
- București existing: -28.7%
- București renovated: -28.6%
- Constanța HRV: -27.2%
- Brașov HRV: -25.9%

Climate diagnostics showed material dataset mismatch, especially:
- București: Light mean 11.27°C vs PBE/PVGIS 13.26°C
- Constanța: 12.45°C vs 13.28°C
- Miercurea Ciuc: 5.95°C vs 6.97°C

Intervention response remained much more stable than absolute demand:
- envelope renovation across zones: Light about -39.4% to -41.7%; PBE about -36.6% to -40.3%
- gas to heat pump aligned final-energy change: **-69.1% in both engines for every zone**
- HRV benefit showed the largest method-dependent spread.

## Batch 1b — dry-bulb climate isolation

Diagnostic method:
- retain PVGIS hourly profile and non-temperature weather variables;
- shift each month's hourly dry-bulb temperatures so the monthly mean equals the exact MC001 monthly mean used by LaCurent;
- rerun PBE.
- This is a diagnostic isolation experiment, not a normative weather file.

Aggregate after temperature normalization:
- median absolute useful-demand delta: **8.4%**
- P90 absolute delta: **17.1%**
- maximum absolute delta: **19.2%**
- PASS / REVIEW / INVESTIGATE: **13 / 2 / 0**

| Case | Light useful kWh | PBE climate-normalized kWh | Delta |
|---|---:|---:|---:|
| București existing | 14,490.1 | 13,176.5 | -9.1% |
| București renovated | 8,629.0 | 8,079.1 | -6.4% |
| București HRV | 4,259.7 | 3,532.9 | -17.1% |
| Constanța existing | 12,060.5 | 11,093.3 | -8.0% |
| Constanța renovated | 7,027.7 | 6,744.5 | -4.0% |
| Constanța HRV | 3,215.9 | 2,813.9 | -12.5% |
| Cluj existing | 17,385.3 | 15,840.4 | -8.9% |
| Cluj renovated | 10,444.0 | 9,863.2 | -5.6% |
| Cluj HRV | 5,294.6 | 4,524.8 | -14.5% |
| Brașov existing | 18,853.6 | 16,727.8 | -11.3% |
| Brașov renovated | 11,329.0 | 10,374.6 | -8.4% |
| Brașov HRV | 5,725.9 | 4,626.4 | -19.2% |
| Miercurea Ciuc existing | 22,710.8 | 21,210.0 | -6.6% |
| Miercurea Ciuc renovated | 13,758.2 | 13,485.6 | -2.0% |
| Miercurea Ciuc HRV | 7,136.4 | 6,679.1 | -6.4% |

## Current engineering interpretation

1. A substantial share of the large raw cross-engine difference was caused by comparing different climate datasets, not by a LaCurent arithmetic defect.
2. Once monthly outdoor temperature means are aligned, all 15 demand cases remain below 20% absolute difference and 13/15 are within 15%.
3. Envelope-renovation relative effects are highly consistent across methods.
4. The downstream gas-to-heat-pump transformation is internally consistent in the aligned comparison.
5. The remaining priority is the high-performance/HRV regime, especially București and Brașov. Residual causes to isolate include hourly dynamic gains, solar distribution, ground treatment and ventilation/gain interaction.
6. This is not yet sufficient to claim full validation of cost, primary energy, CO2, DHW, PV, solar thermal or Romanian nZEB compliance.

## Next campaign target

Before broadening geometry and systems, isolate the HRV residual using controlled sensitivity:
- identical climate-normalized weather;
- fixed solar off/on comparison;
- fixed internal gains off/on comparison;
- ground-floor treatment sensitivity;
- HRV 0%, 50%, 80%, 90%;
- compare absolute demand and incremental HRV benefit.

After that, proceed to geometry/glazing/orientation/ACH and remaining systems.
