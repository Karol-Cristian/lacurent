# INVESTIGATION 004 - DHW Annual Distribution Loss Basis

## Status

- Investigation id: `INVESTIGATION_004_DHW_ANNUAL_DISTRIBUTION_LOSS_BASIS`
- Scope: Anexa 3.3.B DHW distribution-loss energy rows after `FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT`.
- Result: annual DHW distribution-loss rows are not fixture-ready.
- Code change justified: no.
- New helper justified: no.

## Sources Inspected

- MC001-2022 page 260: timestep basis and relation (3.200).
- MC001-2022 page 261: relations (3.201)-(3.205).
- MC001-2022 page 262: relations (3.206)-(3.209).
- MC001-2022 page 263: relations (3.210)-(3.214).
- MC001-2022 Anexa 3.3.B pages 269-282.
- `docs/mc001-extraction/09_dhw_systems.md`
- `docs/mc001-validation/FIXTURE_009_DHW_DISTRIBUTION_LOSS_COMPONENT.md`

## Source Evidence

MC001 states that inputs and outputs are mean values for the calculation interval, and the DHW distribution timestep can be between `1` and `8760 h`. In Anexa 3.3.B the displayed calculation data use:

| Source page | Input | Value |
| --- | --- | ---: |
| 270 | conventional insulated-pipe `Psi` | `0.20 W/(mK)` |
| 271 | DHW open-circuit/stub length `lA` | `22.50 m` |
| 271 | DHW vertical length `lS` | `97.88 m` |
| 271 | DHW distribution length `lV` | `31.88 m` |
| 272 | DHW closed-circuit `Lmax` | `57.40 m` |
| 273 | open-circuit volume `VP` | `0.0064 m3` |
| 274 | DHW temperature `thetaW` | `50 degC` |
| 274 | DHW loop temperature difference `deltaThetaW` | `5 K` |
| 275 | calculation timestep `tci` | `1 h` |
| 275 | DHW ambient temperature `thetaAhW` | `13 degC` |
| 275 | interval between uses `tatap` | `2 h` |
| 275 | use frequency `ntap` | `0.5 1/h` |
| 276 | no-use operations `nnom` | `2 1/d` |
| 276 | average no-use DHW temperature `thetaW,avg` | `25 degC` |
| 277 | `cW * rhoW` | `1.15 kWh/(m3K)` |
| 277 | `cW` displayed by text extraction | `1.163 kWh/(kgK)` |
| 277 | `rhoW` | `990 kg/m3` |
| 278 | `thetaW,em,mean` | `47.5 degC` |
| 278 | `QW,dis,ls` | `0.225 kWh` |
| 278 | `mW,dis,stub` | `3.16 kg/h` |
| 279 | `QW,dis,stub` | `135.8 kWh` |
| 279 | `mW,dis,nom` | `0.53 kg/h` |
| 279 | `QW,dis,nom` | `7.3 kWh` |

Page 278 describes the displayed heat-loss rows as losses in timestep `tci`. The visible page 278-279 rows do not provide an annual operation multiplier. Page 281 has a separate auxiliary heat-tracing row `WW,dis,aux,rib = 0.225 kWh` with an annual note, but that row is not the same output as `QW,dis,ls`.

## Relations Checked

### Relation (3.205) - distribution loss with recirculation

```text
QW,dis,ls = (1 / 1000) * sum(Psi_j * (thetaW,mean - thetaW,amb,j) * (L + Lequip)_j * tci)
```

Required inputs: `Psi`, mean DHW temperature, ambient temperature, pipe length, equivalent length, timestep, operation-time summation basis.

### Relation (3.206) - open-circuit stub loss

```text
QW,dis,ls,stub = sum(Vstub,j * rhoW * ntap,j) * cW * (thetaW - thetaW,amb,j) * tci
```

Required inputs: open-circuit volume, density, use frequency, specific heat, DHW temperature, ambient temperature, timestep.

### Relation (3.207) - no-draw recirculation loss

The extracted MC001 relation is a length/transmittance summation with `thetaW,avg`. The Anexa 3.3.B page 279 worked row instead shows a mass-flow path for `mW,dis,nom` and `QW,dis,nom`. This is the main unresolved visual/formula alignment issue for the `QW,dis,nom` row.

## Row Reconstructions

### `QW,dis,ls = 0.225 kWh`

Using relation (3.205) with displayed values except effective length:

```text
Q = 0.20 * (47.5 - 13) * L_eff * 1 / 1000
```

| Reconstruction | Result |
| --- | ---: |
| Using visible DHW distribution length `lV = 31.88 m` | `0.219972 kWh` |
| Displayed expected value | `0.225 kWh` |
| Implied `L_eff` for displayed value | `32.6086956522 m` |
| Missing length versus visible DHW `lV` | `0.7286956522 m` |
| Using heating/cooling `lS = 32.63 m` diagnostically | `0.225147 kWh` |

The diagnostic heating/cooling `lS = 32.63 m` reproduces the numeric row, but it belongs to the heating/cooling block, not the DHW distribution block. The DHW visible length does not reproduce the displayed value unless an unshown equivalent length of about `0.73 m` is added.

Classification: `blocked_missing_effective_length`

### `QW,dis,stub = 135.8 kWh`

Mass-flow mapping is traceable:

```text
mW,dis,stub = VP * rhoW * ntap
              = 0.0064 * 990 * 0.5
              = 3.168 kg/h
```

This matches the displayed `3.16 kg/h`.

Energy calculation:

```text
Q = mW,dis,stub * cW * (thetaW - thetaAhW) * tci
```

| Reconstruction | Result |
| --- | ---: |
| Using physical `cW = 0.001163 kWh/(kgK)` | `0.136322208 kWh` |
| Using numeric `cW = 1.163` as Wh-scale arithmetic | `136.322208 Wh` |
| Displayed expected value | `135.8 kWh` |
| Factor needed to treat displayed row as kWh | about `996` |

The numeric value is explainable as approximately `136 Wh` for a one-hour timestep, or as `136 kWh` only if `cW = 1.163` is treated as `kWh/(kgK)`. No source row shows an annual timestep or operation multiplier near the required factor. Because page 275 displays `tci = 1 h`, this is not a clean annual kWh row.

Classification: `MC001_worked_example_inconsistency`

### `QW,dis,nom = 7.3 kWh`

The page 279 mass-flow row is traceable:

```text
mW,dis,nom = (1 / 24) * VP * rhoW * nnom
             = (1 / 24) * 0.0064 * 990 * 2
             = 0.528 kg/h
```

This matches the displayed `0.53 kg/h`.

Energy calculation with the formula shown on page 279:

```text
Q = mW,dis,nom * cW * (thetaW,avg - thetaAhW) * tci
```

| Reconstruction | Result |
| --- | ---: |
| Using physical `cW = 0.001163 kWh/(kgK)` | `0.007368768 kWh` |
| Using numeric `cW = 1.163` as Wh-scale arithmetic | `7.368768 Wh` |
| Displayed expected value | `7.3 kWh` |
| Factor needed to treat displayed row as kWh | about `991` |

The numeric value again matches Wh-scale arithmetic for a one-hour timestep, not a clean kWh annual row. In addition, the page 279 displayed formula path is not the same as the extracted relation (3.207) length/transmittance summation, so this row needs a visual formula review before any fixture or helper is created.

Classification: `blocked_visual_formula_review_needed`

## Classification Summary

| Row | Classification | Reason |
| --- | --- | --- |
| `QW,dis,ls = 0.225 kWh` | `blocked_missing_effective_length` | Visible DHW length gives `0.219972 kWh`; expected value implies `L_eff = 32.6087 m`, but the additional `0.7287 m` equivalent length is not shown. |
| `QW,dis,stub = 135.8 kWh` | `MC001_worked_example_inconsistency` | Mass flow is traceable, but the energy value is Wh-scale for `tci = 1 h` while the row is labeled `kWh`; no annual multiplier is displayed. |
| `QW,dis,nom = 7.3 kWh` | `blocked_visual_formula_review_needed` | Page 279 uses a mass-flow formula while relation (3.207) is extracted as a length/transmittance summation; the displayed energy has the same Wh/kWh scale issue. |

## Extraction Gaps

- Trace the equivalent/effective length basis for relation (3.205), especially `Lequip` or any SR EN 15316-3 B2.3 local-loss length used by Anexa 3.3.B.
- Visually review page 277 `cW` units and confirm whether the source intends `Wh/(kgK)`, `kWh/(kgK)`, or a table unit typo.
- Visually review relation (3.207) and the page 279 worked formula for `QW,dis,nom`; they are not currently aligned in the extraction.
- Identify any source-defined annual operation period for DHW distribution losses. The inspected pages show `tci = 1 h` for the worked rows and no annual multiplier for the three investigated `QW` rows.

## Fixture 10 Recommendation

Fixture #10 should not be annual DHW distribution losses yet. The safer next target is useful-demand reconciliation or cleaned DHW service-unit extraction, because the annual distribution-loss basis is still blocked by missing effective length, visual formula review, and a worked-example unit/period inconsistency.

If DHW distribution losses are revisited, do it as a source-review task first:

- resolve `Lequip` / effective length for `QW,dis,ls`;
- resolve the Wh/kWh basis for `QW,dis,stub`;
- resolve relation (3.207) versus page 279 formula for `QW,dis,nom`.

## Implementation Decision

No helper or formula change is justified. `dhwDistributionLosses.mjs` should remain limited to the component formulas validated by Fixture #9 until these source gaps are closed.
