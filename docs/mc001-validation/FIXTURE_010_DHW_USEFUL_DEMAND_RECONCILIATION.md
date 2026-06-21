# FIXTURE 010 - DHW Useful Demand Reconciliation

## Status

- Fixture id: `FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION`
- Source candidate: `MC001_EX_B_DHW_LIGHTING_VENTILATION_OUTPUTS`
- Executable: yes, as a narrowed useful-demand fixture.
- Validated module: `dhwUsefulDemand.mjs`
- Scope exclusions: no DHW distribution-loss validation, no storage losses, no generator efficiency, no auxiliary energy, no DHW final-energy calculation, no production integration, no UI, no workers, no DB/schema/API, no deploy, no push.

## Exact MC001 Source

- Source document: `docs/Mc_001-2022_-_Metodologie_calcul_performanta_energetica_caldiri.pdf`
- MC001-2022 page 252: relation (3.188), useful DHW energy and `60/10 degC` reference context.
- MC001-2022 page 253: relation (3.190), non-residential daily DHW volume.
- MC001-2022 page 254: relation (3.191), temperature correction note.
- MC001-2022 page 255: definition of `f`, the number of daily consumption units.
- MC001-2022 page 257: Tabel 3.3.1 row 13, schools without showers or baths, `5 l/elev/program`; relation (3.197), loss/waste penalty coefficients.
- Anexa B page 524: school DHW calculation text, `300` simultaneous pupils/staff, `60/10 degC`, `Vday = 2145.0 l/day`, monthly day counts, and selected `f1/f2` labels.
- Anexa B page 525: `f = 300`, `VW,f,day = 5`, `VW,day = 1500`, `VW,ls,day = 645`, monthly `QW,nd`, annual `QW,nd = 18519.13 kWh/an`.

## Selected Formula Rows

Only useful DHW demand rows are executable in this fixture.

| Row | Formula | Inputs | Expected MC001 output | Tolerance |
| --- | --- | --- | ---: | ---: |
| Tabel 3.3.1 school demand | reviewed dataset lookup | `scoli_elev_program_fara_dusuri_bai` | `5 l/elev/program` | exact |
| Base daily volume | `(3.190) VW,day = VW,f,day * f` | `5 * 300` | `1500 l/day` | exact |
| Loss/waste daily volume | `(3.197) VW,day + VW,ls,day = f1 * f2 * VW,day` | `1500`, `f1 = 1.30`, `f2 = 1.10` | `645 l/day` | exact |
| Total daily volume | base plus loss/waste | `1500 + 645` | `2145 l/day` | exact |
| Monthly useful energy | `(3.188)` | `2145 l/day`, monthly days, `60/10 degC`, visible rounded `cW*rhoW = 1.15 kWh/(m3K)` | page 525 monthly `QW,nd` | `3 kWh` |
| Annual useful energy | sum monthly `QW,nd` | same as monthly | `18519.13 kWh/an` | `20 kWh` |

## Water Constant And Tolerance

The Anexa B useful-demand rows do not display the exact water heat-capacity product used for the page 525 monthly and annual values.

The fixture uses the visible rounded MC001 DHW water product already extracted from the DHW source review:

```text
cW * rhoW = 1.15 kWh/(m3K)
```

Using the page 525 annual output as a diagnostic only, the source-implied product is:

```text
18519.13 / (2.145 m3/day * 50 K * 150 days)
= 1.151150271950272 kWh/(m3K)
```

Therefore monthly and annual energy rows use source-rounded tolerances. The fixture does not treat the implied product as a product-wide default.

## Calculated Values

### Volume Chain

| Row | Expected | Calculated | Absolute delta | Percentage error |
| --- | ---: | ---: | ---: | ---: |
| Tabel 3.3.1 school demand | `5` | `5` | `0` | `0%` |
| Base daily volume | `1500` | `1500` | `0` | `0%` |
| Loss/waste daily volume | `645` | `645` | `0` | `0%` |
| Total daily volume | `2145` | `2145` | `0` | `0%` |

### Monthly Useful Energy

| Month | Days | Expected `QW,nd` | Calculated `QW,nd` | Absolute delta | Percentage error |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ian | 15 | 1852 | 1850.0625 | 1.9375 | 0.1046% |
| Feb | 15 | 1852 | 1850.0625 | 1.9375 | 0.1046% |
| Mar | 20 | 2469 | 2466.7500 | 2.2500 | 0.0911% |
| Apr | 10 | 1235 | 1233.3750 | 1.6250 | 0.1316% |
| Mai | 15 | 1852 | 1850.0625 | 1.9375 | 0.1046% |
| Iun | 10 | 1235 | 1233.3750 | 1.6250 | 0.1316% |
| Iul | 0 | 0 | 0.0000 | 0.0000 | 0.0000% |
| Aug | 0 | 0 | 0.0000 | 0.0000 | 0.0000% |
| Sep | 10 | 1235 | 1233.3750 | 1.6250 | 0.1316% |
| Oct | 20 | 2469 | 2466.7500 | 2.2500 | 0.0911% |
| Noi | 20 | 2469 | 2466.7500 | 2.2500 | 0.0911% |
| Dec | 15 | 1852 | 1850.0625 | 1.9375 | 0.1046% |

### Annual Useful Energy

| Row | Expected | Calculated | Absolute delta | Percentage error |
| --- | ---: | ---: | ---: | ---: |
| Annual days | `150` | `150` | `0` | `0%` |
| Annual `QW,nd` | `18519.13 kWh/an` | `18500.625 kWh/an` | `18.505 kWh/an` | `0.0999%` |

## Assumptions

- The school Tabel 3.3.1 row is the reviewed dataset row `scoli_elev_program_fara_dusuri_bai`.
- Page 524-525 `f = 300` is the service-unit count for the useful-demand calculation.
- Page 579's later note of `102` average persons is not used because it conflicts with the page 524-525 useful-demand table basis.
- `f1 = 1.30` and `f2 = 1.10` are selected by the page 524 labels and relation (3.197), and confirmed by the displayed `VW,ls,day = 645 l/day`.
- Tabel 3.3.1 values are already at `60/10 degC`, matching Anexa B page 524, so relation (3.191) temperature correction factor is `1`.
- Monthly and annual energy rows tolerate the source-rounded water heat-capacity product.

## Blocked Rows

| Row | Source | Reason |
| --- | --- | --- |
| DHW distribution losses | Anexa B page 525 | Annual distribution-loss basis remains blocked by `INVESTIGATION_004_DHW_ANNUAL_DISTRIBUTION_LOSS_BASIS`. |
| DHW storage, generation, auxiliary, final energy | Anexa B page 525 | Storage, generation, auxiliary and final-energy inputs are outside this useful-demand fixture. |
| Page 579 average-person count | Anexa B page 579 | The page 524-525 calculation explicitly uses `f = 300`; page 579 is not mixed into Fixture 010. |

## Verification Notes

- The fixture validates useful DHW demand only.
- It does not validate distribution, storage, generation, auxiliary energy, final energy, primary energy, CO2, certificate classes, RER, UI, workers, DB/schema/API, or production integration.
- `dhwUsefulDemand.mjs` adds only the narrow relation (3.197) loss/waste volume helper needed for this fixture.
