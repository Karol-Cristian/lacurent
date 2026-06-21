# INVESTIGATION 005 - DHW Useful Demand Service Units

## Status

- Investigation id: `INVESTIGATION_005_DHW_USEFUL_DEMAND_SERVICE_UNITS`
- Scope: Anexa B useful DHW demand for the school example, before full DHW final-energy validation.
- Result classification: `traceable_ready_for_fixture_010`
- Recommended fixture: `FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION`
- Code change justified: no.
- New helper justified: no.

## Sources Inspected

- MC001-2022 page 251: DHW calculation periods and daily/hourly calculation context.
- MC001-2022 page 252: DHW temperature defaults and relation (3.188) start.
- MC001-2022 page 253: relation (3.188), relation (3.189), relation (3.190), and reference-temperature notes.
- MC001-2022 page 254: relation (3.191) temperature correction context.
- MC001-2022 page 255: non-residential unit count `f` definition.
- MC001-2022 pages 256-257: Tabel 3.3.1, including school row 13.
- MC001-2022 page 257: relation (3.197), water loss/waste penalty factors `f1` and `f2`.
- MC001-2022 Anexa B pages 524-525: school DHW useful-demand rows.
- MC001-2022 page 551: supporting renovation-note occupancy line, `20` classrooms with `15` pupils each, total `300`.
- MC001-2022 page 579: later certificate-annex service note with `102` average persons, inspected as a possible conflict but not used by the page 524-525 DHW calculation.
- `src/physics-engine/datasets/mc001DhwDemandTable3_3_1.mjs`
- `src/physics-engine/dhwUsefulDemand.mjs`

## Normative Formula Evidence

### Relation (3.188) - useful DHW energy

```text
QW,nd = Vt * cW * rhoW * (thetaW,draw - thetaW,c) / 1000
```

For daily calculation, page 252 states `Vt = VW,day [l/zi]`. Page 253 states `rhoW` may be considered `1000 kg/m3`; the Anexa B displayed values are closer to a source-implied product around `1.151 kWh/(m3K)`, consistent with nearby MC001 water constants after rounding.

### Relation (3.189) - residential daily volume

```text
VW,day = VW,P,day * nP
```

Not used by the Anexa B school row because the school is non-residential.

### Relation (3.190) - non-residential daily volume

```text
VW,day = VW,f,day * f
```

Page 255 defines `f` as the annual average number of daily consumption units in the building or zone, obtained from the beneficiary/administrator.

### Relation (3.191) - temperature correction

Tabel 3.3.1 values are expressed for `60 degC / 10 degC`. The Anexa B school calculation also uses `thetaW = 60 degC` and `thetaW,c = 10 degC`, so no temperature correction is needed for the school row.

### Relation (3.197) - losses and water waste volume

Page 257 defines an additional DHW volume for losses/waste using penalty factors `f1` and `f2`. The Anexa B school row applies this penalty before calculating monthly `QW,nd`:

```text
VW,day + VW,ls,day = f1 * f2 * VW,day
```

The selected page 524 labels are:

- `f1`: centralized supply without recirculation;
- `f2`: classic faucets.

The values listed in MC001 page 257 are `f1 = 1.30` and `f2 = 1.10`, giving `f1 * f2 = 1.43`.

## Tabel 3.3.1 Row

The required school row is readable and already exists in the reviewed dataset registry:

| Source | Row | Dataset id | Destination/use | Unit basis | Value |
| --- | ---: | --- | --- | --- | ---: |
| Tabel 3.3.1 page 257 | 13 | `scoli_elev_program_fara_dusuri_bai` | Schools without showers or baths | `pentru un elev pe program` | `5 l/unitate,zi la 60 degC` |

No Tabel 3.3.1 value is missing for this example.

## Anexa B Useful-Demand Inputs

| Source page | Input | Value | Trace status |
| --- | --- | ---: | --- |
| 524 | Building/use text | school, without showers/baths | traceable |
| 524 | Users/service units text | `300 elevi, cadre didactice si personal TESA` present simultaneously | traceable |
| 525 | `f` daily consumption units | `300.00` | traceable |
| 525 | `VW,f,day` | `5.00 l/unitate,zi` | traceable to Tabel 3.3.1 row 13 |
| 525 | base `VW,day` | `1500.00 l/zi` | traceable: `5 * 300` |
| 524 | selected `f1` basis | centralized without recirculation | traceable |
| 524 | selected `f2` basis | classic faucets | traceable |
| 525 | `VW,ls,day` | `645.00 l/zi` | traceable: `1500 * (1.30 * 1.10 - 1)` |
| 524 | total displayed `Vday` | `2145.0 l/zi` | traceable: `1500 + 645` |
| 524 | `thetaW` / DHW temperature | `60 degC` | traceable |
| 524 | `thetaW,c` / cold water temperature | `10 degC` | traceable |
| 524-525 | monthly calculation days | `15, 15, 20, 10, 15, 10, 0, 0, 10, 20, 20, 15` | traceable |
| 525 | annual `QW,nd` | `18519.13 kWh/an` | traceable expected output |

The later page 579 note says `numar mediu de persoane: 102 (94 elevi, 6 cadre didactice, 2 personal nedidactic)`. That conflicts with the page 524-525 DHW calculation basis, but page 524 and page 525 explicitly use `300` for the DHW useful-demand calculation. Fixture #10 should use the calculation-table value, not page 579.

## Reconstruction

### Daily volume

```text
VW,day,base = 5 l/elev/program * 300 = 1500 l/day
VW,ls,day = 1500 * (1.30 * 1.10 - 1) = 645 l/day
VW,day,total = 1500 + 645 = 2145 l/day
```

This exactly matches the page 524-525 displayed volume chain.

### Annualization days

```text
days = 15 + 15 + 20 + 10 + 15 + 10 + 0 + 0 + 10 + 20 + 20 + 15 = 150 days
```

### Useful energy

Using the displayed annual result to infer the exact water heat-capacity product used by the Anexa B table:

```text
cW*rhoW = 18519.13 / (2.145 m3/day * 50 K * 150 days)
        = 1.151150271950272 kWh/(m3K)
```

This is consistent with the nearby MC001 water constants used in Anexa 3.3.B (`cW = 1.163 Wh/(kgK)`, `rhoW = 990 kg/m3`, rounded product about `1.15 kWh/(m3K)`).

| Month | Days | MC001 displayed `QW,nd` | Reconstructed with implied `cW*rhoW` |
| --- | ---: | ---: | ---: |
| Ian | 15 | `1852` | `1851.913` |
| Feb | 15 | `1852` | `1851.913` |
| Mar | 20 | `2469` | `2469.217` |
| Apr | 10 | `1235` | `1234.609` |
| Mai | 15 | `1852` | `1851.913` |
| Iun | 10 | `1235` | `1234.609` |
| Iul | 0 | `0` | `0` |
| Aug | 0 | `0` | `0` |
| Sep | 10 | `1235` | `1234.609` |
| Oct | 20 | `2469` | `2469.217` |
| Noi | 20 | `2469` | `2469.217` |
| Dec | 15 | `1852` | `1851.913` |
| Annual | 150 | `18519.13` | `18519.13` |

Using a rounded `cW*rhoW = 1.15 kWh/(m3K)` gives `18500.625 kWh/an`, a `0.100%` delta from the annual display. The fixture should document whether it asserts against the source-implied product or uses a tolerance against the rounded constant.

## Traceability Decision

Classification: `traceable_ready_for_fixture_010`

Reasons:

- Tabel 3.3.1 school row 13 is readable and already extracted.
- Anexa B pages 524-525 provide the service unit count `f = 300`.
- Anexa B pages 524-525 provide the selected building/use row and displayed base daily volume.
- The `f1/f2` loss/waste basis is traceable from the selected page 524 labels and relation (3.197); the displayed `VW,ls,day = 645 l/day` confirms the `1.30 * 1.10` multiplier.
- Anexa B page 524 provides `60 degC / 10 degC`, so no Tabel 3.3.1 temperature correction is needed.
- Anexa B pages 524-525 provide monthly calculation days and expected monthly/annual `QW,nd`.

## Fixture 10 Recommendation

Create `FIXTURE_010_DHW_USEFUL_DEMAND_RECONCILIATION` as a narrow validation fixture for useful demand only.

Recommended validation rows:

- Tabel 3.3.1 school row lookup: `5 l/elev/program`.
- Non-residential daily volume: `5 * 300 = 1500 l/day`.
- Loss/waste daily volume: `645 l/day`.
- Total daily volume used by the Anexa B calculation: `2145 l/day`.
- Monthly `QW,nd` values from page 525.
- Annual `QW,nd = 18519.13 kWh/an`.

Recommended tolerance:

- Exact for lookup and volume rows.
- Small tolerance for monthly/annual useful energy because the water heat-capacity product is displayed only indirectly/rounded. The fixture should document the source-implied `cW*rhoW` and should not treat it as a product-wide default outside this reviewed fixture.

## Still Blocked

- Full DHW final energy remains blocked by `INVESTIGATION_004_DHW_ANNUAL_DISTRIBUTION_LOSS_BASIS`.
- Distribution losses remain blocked for annual validation.
- Storage losses are not traced for this example.
- Generation losses / generator efficiency are not traced for this example.
- Auxiliary DHW energy remains outside this useful-demand fixture.
- Page 579 average-person count is not used for the page 524-525 DHW calculation; if a later task uses page 579, it must handle the `102` versus `300` conflict explicitly.

## Implementation Decision

No new helper, formula change, production integration, orchestrator, UI, worker, DB/schema/API, deploy, or push is justified by this investigation. Existing `dhwUsefulDemand.mjs` is sufficient for a narrow useful-demand fixture using explicit source inputs.
